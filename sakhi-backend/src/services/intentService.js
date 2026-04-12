const INTENT_KEYWORDS = {
	pain: ["cramps", "pain", "hurt"],
	mood: ["sad", "angry", "irritated"],
	cycle: ["period", "ovulation"],
	nutrition: ["food", "eat", "diet"],
	greeting: ["hi", "hello"],
};

function normalizeMessage(message) {
	return String(message || "")
		.toLowerCase()
		.trim();
}

function containsKeyword(message, keyword) {
	const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const keywordRegex = new RegExp(`\\b${escapedKeyword}\\b`, "i");
	return keywordRegex.test(message);
}

function detectIntent(message) {
	const normalizedMessage = normalizeMessage(message);

	if (!normalizedMessage) {
		return { intent: "general" };
	}

	for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
		if (keywords.some((keyword) => containsKeyword(normalizedMessage, keyword))) {
			return { intent };
		}
	}

	return { intent: "general" };
}

module.exports = {
	detectIntent,
};
