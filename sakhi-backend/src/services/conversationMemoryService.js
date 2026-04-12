const MAX_MEMORY_MESSAGES = 5;

// In-memory conversation state keyed by user/session identifier.
const conversationStore = new Map();

function createEmptyMemory() {
	return {
		messages: [],
		lastIntent: "general",
		geminiCallCount: 0,
	};
}

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
	const normalized = String(value || "").trim();
	return normalized;
}

function normalizeGeminiCallCount(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0;
	}

	return Math.floor(parsed);
}

function cloneMemory(memory) {
	return {
		messages: memory.messages.map((entry) => ({
			message: entry.message,
			intent: entry.intent,
		})),
		lastIntent: memory.lastIntent,
		geminiCallCount: normalizeGeminiCallCount(memory.geminiCallCount),
	};
}

function getConversationMemory(conversationKey) {
	const storeKey = normalizeConversationKey(conversationKey);
	const memory = conversationStore.get(storeKey) || createEmptyMemory();
	return cloneMemory(memory);
}

function updateConversationMemory(conversationKey, { message, intent } = {}) {
	const storeKey = normalizeConversationKey(conversationKey);
	const existing = conversationStore.get(storeKey) || createEmptyMemory();
	const normalizedMessage = normalizeMessage(message);
	const normalizedIntent = normalizeIntent(intent || existing.lastIntent);
	const existingGeminiCallCount = normalizeGeminiCallCount(existing.geminiCallCount);

	const nextMessages = normalizedMessage
		? [...existing.messages, { message: normalizedMessage, intent: normalizedIntent }].slice(-MAX_MEMORY_MESSAGES)
		: existing.messages.slice(-MAX_MEMORY_MESSAGES);

	const updated = {
		messages: nextMessages,
		lastIntent: normalizedIntent,
		geminiCallCount: existingGeminiCallCount,
	};

	conversationStore.set(storeKey, updated);
	return cloneMemory(updated);
}

function getGeminiCallCount(conversationKey) {
	const storeKey = normalizeConversationKey(conversationKey);
	const existing = conversationStore.get(storeKey) || createEmptyMemory();
	return normalizeGeminiCallCount(existing.geminiCallCount);
}

function incrementGeminiCallCount(conversationKey) {
	const storeKey = normalizeConversationKey(conversationKey);
	const existing = conversationStore.get(storeKey) || createEmptyMemory();
	const nextGeminiCallCount = normalizeGeminiCallCount(existing.geminiCallCount) + 1;

	const updated = {
		...existing,
		geminiCallCount: nextGeminiCallCount,
	};

	conversationStore.set(storeKey, updated);
	return nextGeminiCallCount;
}

module.exports = {
	getConversationMemory,
	updateConversationMemory,
	getGeminiCallCount,
	incrementGeminiCallCount,
};
