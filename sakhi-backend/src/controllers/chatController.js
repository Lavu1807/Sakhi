const { buildContext } = require("../services/contextService");
const { getHybridChatResponse } = require("../services/hybridChatService");
const {
	getConversationMemory,
	updateConversationMemory,
} = require("../services/conversationMemoryService");

function resolveConversationKey(req) {
	const userId = req.user?.userId;
	if (userId !== undefined && userId !== null) {
		return `user:${String(userId).trim()}`;
	}

	const bodySessionId =
		typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
	if (bodySessionId) {
		return `session:${bodySessionId}`;
	}

	const headerSessionId =
		typeof req.headers["x-session-id"] === "string"
			? req.headers["x-session-id"].trim()
			: "";
	if (headerSessionId) {
		return `session:${headerSessionId}`;
	}

	const ipAddress = String(req.ip || req.headers["x-forwarded-for"] || "anonymous").trim();
	return `ip:${ipAddress}`;
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
		const previousMemory = getConversationMemory(conversationKey);
		const context = buildContext(req.body?.userContext, previousMemory);
		const { intent: detectedIntent, reply } = await getHybridChatResponse(message, context, conversationKey);

		const updatedMemory = updateConversationMemory(conversationKey, {
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
		console.error("Failed to process chat request", error);
		return res.status(500).json({
			message: "Failed to process chat request.",
		});
	}
}

module.exports = {
	postChatMessage,
};
