const { detectIntent } = require("./intentService");
const { generateResponse } = require("./responseService");
const { getGeminiResponse } = require("./geminiFallback");
const { findRelevantMythForQuestion } = require("../myths/myths.service");
const {
	getGeminiCallCount,
	incrementGeminiCallCount,
} = require("./chat.memory");
const {
	MEDICAL_SAFETY_RESPONSE,
	shouldUseMedicalSafetyResponse,
} = require("./safetyService");

const RULE_BASED_INTENTS = new Set(["pain", "mood", "cycle", "nutrition", "greeting"]);
const GEMINI_LIMIT_EXCEEDED_RESPONSE = "Let’s continue with basic guidance for now.";
const GEMINI_CALL_LIMIT = parseGeminiCallLimit(process.env.GEMINI_SESSION_CALL_LIMIT);
const SYMPTOM_CHAT_PATTERN = /\b(symptom(s)?|cramp|fatigue|tired|headache|nausea|bloating|mood\s*swing)\b/i;
const SAD_MOOD_EMPATHY_PREFIX = "I see you're feeling low today, I'm here for you.";

function formatMythSource(source) {
	const normalizedSource = String(source || "").trim();
	return normalizedSource ? `Source: ${normalizedSource}.` : "Source: Research article.";
}

function buildMythEducationReply(myth) {
	if (!myth || typeof myth !== "object") {
		return "Good question. Here is the fact: menstrual health information can vary, so check trusted health sources.";
	}

	return `Great question. "${myth.myth}" is a common myth. Fact: ${myth.fact} ${formatMythSource(myth.source)}`;
}

function addMoodAwareEmpathy(reply, context) {
	const latestMood = String(context?.latestMood || "")
		.trim()
		.toLowerCase();

	if (latestMood !== "sad") {
		return reply;
	}

	const normalizedReply = String(reply || "").trim();
	if (!normalizedReply) {
		return SAD_MOOD_EMPATHY_PREFIX;
	}

	if (normalizedReply.toLowerCase().startsWith(SAD_MOOD_EMPATHY_PREFIX.toLowerCase())) {
		return normalizedReply;
	}

	return `${SAD_MOOD_EMPATHY_PREFIX} ${normalizedReply}`;
}

function parseGeminiCallLimit(rawLimit) {
	const parsed = Number.parseInt(String(rawLimit || ""), 10);
	if (!Number.isFinite(parsed)) {
		return 8;
	}

	if (parsed < 5) {
		return 5;
	}

	if (parsed > 10) {
		return 10;
	}

	return parsed;
}

function isRuleBasedIntent(intent) {
	const normalizedIntent = String(intent || "")
		.trim()
		.toLowerCase();

	return RULE_BASED_INTENTS.has(normalizedIntent);
}

function hasSymptomAnalysisInContext(context) {
	const analysis = context && typeof context === "object" ? context.symptomAnalysis : null;
	if (!analysis || typeof analysis !== "object") {
		return false;
	}

	const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions : [];
	const insights = Array.isArray(analysis.insights) ? analysis.insights : [];
	const personalizedInsights = Array.isArray(analysis.personalizedInsights) ? analysis.personalizedInsights : [];

	return suggestions.length > 0 || insights.length > 0 || personalizedInsights.length > 0;
}

function isSymptomMessage(message) {
	return SYMPTOM_CHAT_PATTERN.test(String(message || ""));
}

async function getHybridChatResponse(message, context, conversationKey) {
	const detectedIntent = detectIntent(message).intent;

	if (shouldUseMedicalSafetyResponse(message)) {
		return {
			intent: detectedIntent,
			reply: MEDICAL_SAFETY_RESPONSE,
		};
	}

	const relevantMyth = findRelevantMythForQuestion(message);
	if (relevantMyth) {
		return {
			intent: "education",
			reply: addMoodAwareEmpathy(buildMythEducationReply(relevantMyth), context),
		};
	}

	if (isRuleBasedIntent(detectedIntent)) {
		const reply = await generateResponse(detectedIntent, context, message);
		return {
			intent: detectedIntent,
			reply: addMoodAwareEmpathy(reply, context),
		};
	}

	if (detectedIntent === "general" && isSymptomMessage(message) && hasSymptomAnalysisInContext(context)) {
		const reply = await generateResponse("general", context, message);
		return {
			intent: "general",
			reply: addMoodAwareEmpathy(reply, context),
		};
	}

	if (detectedIntent !== "general") {
		const reply = await generateResponse(detectedIntent, context, message);
		return {
			intent: detectedIntent,
			reply: addMoodAwareEmpathy(reply, context),
		};
	}

	const sessionKey = conversationKey || "anonymous";
	const currentGeminiCallCount = await getGeminiCallCount(sessionKey);
	if (currentGeminiCallCount >= GEMINI_CALL_LIMIT) {
		return {
			intent: "general",
			reply: addMoodAwareEmpathy(GEMINI_LIMIT_EXCEEDED_RESPONSE, context),
		};
	}

	const reply = await getGeminiResponse(message, context);
	await incrementGeminiCallCount(sessionKey);
	return {
		intent: "general",
		reply: addMoodAwareEmpathy(reply, context),
	};
}

module.exports = {
	getHybridChatResponse,
};