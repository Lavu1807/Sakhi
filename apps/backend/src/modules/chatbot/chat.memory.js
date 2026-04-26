const pool = require('../../config/db');
const logger = require('../../shared/utils/logger');

const MAX_MEMORY_MESSAGES = 5;
const MODULE_LOG = logger.child({ module: "conversationMemoryService" });

function normalizeConversationKey(value) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();

	return normalized || "anonymous";
}

function normalizeIntent(value) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();

	return normalized || "general";
}

function normalizeMessage(value) {
	return String(value || "").trim();
}

function normalizeGeminiCallCount(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0;
	}

	return Math.floor(parsed);
}

function createEmptyMemory() {
	return {
		messages: [],
		lastIntent: "general",
		geminiCallCount: 0,
	};
}

function cloneMemory(memory) {
	return {
		messages: Array.isArray(memory.messages)
			? memory.messages.map((entry) => ({
				message: entry.message,
				intent: entry.intent,
			}))
			: [],
		lastIntent: memory.lastIntent || "general",
		geminiCallCount: normalizeGeminiCallCount(memory.geminiCallCount),
	};
}

async function getConversationMemory(conversationKey) {
	const storeKey = normalizeConversationKey(conversationKey);

	try {
		const query = `
			SELECT messages, last_intent, gemini_call_count
			FROM conversation_memory
			WHERE conversation_key = $1
			LIMIT 1
		`;

		const { rows } = await pool.query(query, [storeKey]);

		if (!rows[0]) {
			return createEmptyMemory();
		}

		const row = rows[0];
		return cloneMemory({
			messages: Array.isArray(row.messages) ? row.messages : [],
			lastIntent: row.last_intent,
			geminiCallCount: row.gemini_call_count,
		});
	} catch (error) {
		MODULE_LOG.error({ msg: "Failed to read conversation memory", error: error.message, conversationKey: storeKey });
		return createEmptyMemory();
	}
}

async function updateConversationMemory(conversationKey, { message, intent } = {}) {
	const storeKey = normalizeConversationKey(conversationKey);
	const normalizedMessage = normalizeMessage(message);
	const normalizedIntent = normalizeIntent(intent);

	try {
		const existing = await getConversationMemory(storeKey);

		const nextMessages = normalizedMessage
			? [...existing.messages, { message: normalizedMessage, intent: normalizedIntent }].slice(-MAX_MEMORY_MESSAGES)
			: existing.messages.slice(-MAX_MEMORY_MESSAGES);

		const query = `
			INSERT INTO conversation_memory (conversation_key, messages, last_intent, gemini_call_count, updated_at)
			VALUES ($1, $2::jsonb, $3, $4, NOW())
			ON CONFLICT (conversation_key)
			DO UPDATE SET
				messages = $2::jsonb,
				last_intent = $3,
				updated_at = NOW()
			RETURNING messages, last_intent, gemini_call_count
		`;

		const { rows } = await pool.query(query, [
			storeKey,
			JSON.stringify(nextMessages),
			normalizedIntent,
			existing.geminiCallCount,
		]);

		const row = rows[0];
		return cloneMemory({
			messages: Array.isArray(row.messages) ? row.messages : [],
			lastIntent: row.last_intent,
			geminiCallCount: row.gemini_call_count,
		});
	} catch (error) {
		MODULE_LOG.error({ msg: "Failed to update conversation memory", error: error.message, conversationKey: storeKey });
		return createEmptyMemory();
	}
}

async function getGeminiCallCount(conversationKey) {
	const storeKey = normalizeConversationKey(conversationKey);

	try {
		const query = `
			SELECT gemini_call_count
			FROM conversation_memory
			WHERE conversation_key = $1
			LIMIT 1
		`;

		const { rows } = await pool.query(query, [storeKey]);
		return normalizeGeminiCallCount(rows[0]?.gemini_call_count);
	} catch (error) {
		MODULE_LOG.error({ msg: "Failed to read Gemini call count", error: error.message, conversationKey: storeKey });
		return 0;
	}
}

async function incrementGeminiCallCount(conversationKey) {
	const storeKey = normalizeConversationKey(conversationKey);

	try {
		const query = `
			INSERT INTO conversation_memory (conversation_key, messages, last_intent, gemini_call_count, updated_at)
			VALUES ($1, '[]'::jsonb, 'general', 1, NOW())
			ON CONFLICT (conversation_key)
			DO UPDATE SET
				gemini_call_count = conversation_memory.gemini_call_count + 1,
				updated_at = NOW()
			RETURNING gemini_call_count
		`;

		const { rows } = await pool.query(query, [storeKey]);
		return normalizeGeminiCallCount(rows[0]?.gemini_call_count);
	} catch (error) {
		MODULE_LOG.error({ msg: "Failed to increment Gemini call count", error: error.message, conversationKey: storeKey });
		return 0;
	}
}

module.exports = {
	getConversationMemory,
	updateConversationMemory,
	getGeminiCallCount,
	incrementGeminiCallCount,
};
