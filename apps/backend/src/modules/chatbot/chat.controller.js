const { buildContext } = require('./chat.context');
const { getHybridChatResponse } = require('./chat.service');
const {
	getConversationMemory,
	updateConversationMemory,
} = require('./chat.memory');

const MAX_SESSION_ID_LENGTH = 120;

function normalizeSessionId(value) {
	if (typeof value !== "string") {
		return "";
	}

	return value.trim().slice(0, MAX_SESSION_ID_LENGTH);
}

function resolveConversationKey(req) {
	const userId = req.user?.userId;
	if (userId !== undefined && userId !== null) {
		return `user:${String(userId).trim()}`;
	}

	const bodySessionId = normalizeSessionId(req.body?.sessionId);
	if (bodySessionId) {
		return `session:${bodySessionId}`;
	}

	const headerSessionId = normalizeSessionId(req.headers["x-session-id"]);
	if (headerSessionId) {
		return `session:${headerSessionId}`;
	}

	return "";
}

async function postChatMessage(req, res) {
	try {
		const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

		if (!message) {
			return res.status(400).json({
				message: "message is required.",
			});
		}

		const conversationKey = resolveConversationKey(req);
		if (!conversationKey) {
			return res.status(400).json({
				message: "sessionId is required for anonymous chat requests.",
			});
		}

		const previousMemory = await getConversationMemory(conversationKey);
		const context = buildContext(req.body?.userContext, previousMemory);
		const { intent: detectedIntent, reply } = await getHybridChatResponse(message, context, conversationKey);

		const updatedMemory = await updateConversationMemory(conversationKey, {
			message,
			intent: detectedIntent,
		});

		return res.status(200).json({
			intent: detectedIntent,
			reply,
			context,
			memory: {
				messages: updatedMemory.messages.map((entry) => entry.message),
				lastIntent: updatedMemory.lastIntent,
				geminiCallCount: updatedMemory.geminiCallCount,
			},
		});
	} catch (error) {
		console.error(`[${req.requestId || "unknown"}] Failed to process chat request`, error);
		return res.status(500).json({
			message: "Failed to process chat request.",
			requestId: req.requestId,
		});
	}
}

module.exports = {
	postChatMessage,
};
