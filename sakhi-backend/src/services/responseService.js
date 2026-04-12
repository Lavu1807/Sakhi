const { getSmartNutrition } = require("./smartNutritionService");

const SUPPORTED_INTENTS = ["pain", "mood", "cycle", "nutrition", "greeting", "general"];
const SAFETY_NOTE = "I cannot provide a medical diagnosis, but I can offer supportive guidance.";
const EMPATHY_OPENERS = ["I understand how you feel", "That sounds tough"];

const PHASE_EXPECTATIONS = {
	menstrual: "During the menstrual phase, cramps and lower energy can be common.",
	follicular: "In the follicular phase, energy often starts increasing.",
	ovulation: "Around ovulation, some people notice higher energy and mild pelvic sensations.",
	luteal: "In the luteal phase, mood swings, cravings, and bloating can become more noticeable.",
	general: "Cycle symptoms can vary, so tracking patterns helps you understand your body better.",
};

const SYMPTOM_LANGUAGE_MAP = {
	fatigue: "fatigued",
	low_mood: "low in mood",
};

const CHAT_SYMPTOM_SUGGESTION_MAP = {
	cramps: "rest, hydration, and gentle heat therapy",
	fatigue: "iron-rich foods, hydration, and steady meals",
	headache: "hydration, screen breaks, and gentle rest",
	nausea: "small frequent meals and hydration",
	bloating: "hydration and lighter low-salt meals",
	"mood swings": "slow breathing and short relaxation techniques",
};

const SYMPTOM_KEYWORD_PATTERNS = [
	{ key: "cramps", pattern: /\bcramp(s)?\b/i },
	{ key: "fatigue", pattern: /\bfatigue\b|\bfatigued\b|\btired\b/i },
	{ key: "headache", pattern: /\bheadache(s)?\b/i },
	{ key: "nausea", pattern: /\bnausea\b|\bnauseous\b/i },
	{ key: "bloating", pattern: /\bbloating\b|\bbloated\b/i },
	{ key: "mood swings", pattern: /\bmood\s*swing(s)?\b|\bmood_swing(s)?\b/i },
];

function normalizeIntent(value) {
	const normalizedIntent = String(value || "")
		.trim()
		.toLowerCase();

	return SUPPORTED_INTENTS.includes(normalizedIntent) ? normalizedIntent : "general";
}

function normalizePhase(phase) {
	const normalized = String(phase || "")
		.trim()
		.toLowerCase();

	if (!normalized) {
		return "";
	}

	if (normalized.includes("menstrual") || normalized.includes("period")) {
		return "menstrual";
	}

	if (normalized.includes("follicular")) {
		return "follicular";
	}

	if (normalized.includes("ovulation") || normalized.includes("ovulatory")) {
		return "ovulation";
	}

	if (normalized.includes("luteal")) {
		return "luteal";
	}

	return "";
}

function normalizeSymptoms(symptoms) {
	if (!Array.isArray(symptoms)) {
		return [];
	}

	return symptoms
		.filter((item) => typeof item === "string" && item.trim().length > 0)
		.map((item) => item.trim().toLowerCase());
}

function normalizeContext(context) {
	const safeContext = context && typeof context === "object" ? context : {};
	const history = safeContext.history && typeof safeContext.history === "object" ? safeContext.history : {};
	const symptomAnalysis = safeContext.symptomAnalysis && typeof safeContext.symptomAnalysis === "object" ? safeContext.symptomAnalysis : {};

	return {
		phase: normalizePhase(safeContext.phase),
		symptoms: normalizeSymptoms(safeContext.symptoms),
		lifestyle: typeof safeContext.lifestyle === "string" ? safeContext.lifestyle.trim() : "",
		symptomAnalysis: {
			severity: typeof symptomAnalysis.severity === "string" ? symptomAnalysis.severity.trim().toLowerCase() : "",
			risk: typeof symptomAnalysis.risk === "string" ? symptomAnalysis.risk.trim().toLowerCase() : "",
			insights: Array.isArray(symptomAnalysis.insights)
				? symptomAnalysis.insights.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 5)
				: [],
			suggestions: Array.isArray(symptomAnalysis.suggestions)
				? symptomAnalysis.suggestions.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 5)
				: [],
			personalizedInsights: Array.isArray(symptomAnalysis.personalizedInsights)
				? symptomAnalysis.personalizedInsights.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 3)
				: [],
		},
		history: {
			messages: Array.isArray(history.messages)
				? history.messages
						.filter((item) => typeof item === "string" && item.trim().length > 0)
						.slice(-5)
				: [],
			lastDetectedIntent: normalizeIntent(history.lastDetectedIntent),
		},
	};
}

function findMentionedSymptom(message) {
	const normalizedMessage = String(message || "").trim();
	if (!normalizedMessage) {
		return "";
	}

	for (const matcher of SYMPTOM_KEYWORD_PATTERNS) {
		if (matcher.pattern.test(normalizedMessage)) {
			return matcher.key;
		}
	}

	return "";
}

function hasSymptomAnalysisContext(context) {
	return (
		context.symptomAnalysis.suggestions.length > 0 ||
		context.symptomAnalysis.insights.length > 0 ||
		context.symptomAnalysis.personalizedInsights.length > 0
	);
}

function getSuggestionForSymptom(symptomKey, context) {
	const suggestions = context.symptomAnalysis.suggestions;
	if (suggestions.length > 0) {
		const specificSuggestion = suggestions.find((item) => item.toLowerCase().includes(symptomKey));
		if (specificSuggestion) {
			return specificSuggestion;
		}

		return suggestions[0];
	}

	return CHAT_SYMPTOM_SUGGESTION_MAP[symptomKey] || "rest and hydration";
}

function normalizeSuggestionText(value) {
	const normalized = String(value || "")
		.trim()
		.replace(/[.\s]+$/, "");

	if (!normalized) {
		return "try rest and hydration";
	}

	if (/^try\b/i.test(normalized)) {
		return normalized;
	}

	return `try ${normalized}`;
}

function buildSymptomAwareReply(message, context) {
	const directMention = findMentionedSymptom(message);
	const genericSymptomMention = /\bsymptom(s)?\b/i.test(String(message || ""));
	const mentionedSymptom = directMention || (genericSymptomMention ? context.symptoms[0] || "" : "");
	if (!mentionedSymptom) {
		return "";
	}

	if (context.symptoms.length === 0 && !hasSymptomAnalysisContext(context)) {
		return "";
	}

	const symptomLabel = formatFoodList([mentionedSymptom]).replace(/, and /g, " and ");
	const suggestion = normalizeSuggestionText(getSuggestionForSymptom(mentionedSymptom, context));
	const personalizedNote = context.symptomAnalysis.personalizedInsights[0]
		? ` ${context.symptomAnalysis.personalizedInsights[0]}`
		: "";
	const riskNote = context.symptomAnalysis.risk === "high"
		? " Please monitor closely and seek professional care if symptoms worsen."
		: "";

	return `You mentioned ${symptomLabel} earlier, ${suggestion}.${personalizedNote}${riskNote}`.trim();
}

function pickRandom(items) {
	if (!Array.isArray(items) || items.length === 0) {
		return null;
	}

	const index = Math.floor(Math.random() * items.length);
	return items[index];
}

function startsWithEmpathyPrefix(text) {
	const normalizedText = String(text || "")
		.trim()
		.toLowerCase();

	return EMPATHY_OPENERS.some((opener) => normalizedText.startsWith(opener.toLowerCase()));
}

function applyEmpatheticOpening(text) {
	const normalizedText = String(text || "").trim();
	const opener = pickRandom(EMPATHY_OPENERS) || EMPATHY_OPENERS[0];

	if (!normalizedText) {
		return `${opener}.`;
	}

	if (startsWithEmpathyPrefix(normalizedText)) {
		return normalizedText;
	}

	return `${opener}. ${normalizedText}`;
}

function formatSymptomsText(symptoms) {
	if (symptoms.length === 0) {
		return "";
	}

	const selected = symptoms.slice(0, 2).join(" and ");
	return ` I hear these symptoms have been affecting you: ${selected}.`;
}

function getPhaseExpectationText(phase) {
	const phaseKey = normalizePhase(phase);
	return PHASE_EXPECTATIONS[phaseKey] || PHASE_EXPECTATIONS.general;
}

function getPhaseLabel(phase) {
	const phaseKey = normalizePhase(phase);
	return phaseKey ? phaseKey : "current";
}

function getHistoryBridge(context) {
	const previousIntent = context.history.lastDetectedIntent;
	if (!previousIntent || previousIntent === "general") {
		return "";
	}

	return ` I am also keeping your recent ${previousIntent} concern in mind.`;
}

function formatFoodList(foods) {
	if (!Array.isArray(foods) || foods.length === 0) {
		return "supportive whole foods";
	}

	if (foods.length === 1) {
		return foods[0];
	}

	if (foods.length === 2) {
		return `${foods[0]} and ${foods[1]}`;
	}

	const start = foods.slice(0, -1).join(", ");
	const last = foods[foods.length - 1];
	return `${start}, and ${last}`;
}

function describeSymptom(symptom) {
	const normalized = String(symptom || "")
		.trim()
		.toLowerCase();

	if (!normalized) {
		return "";
	}

	return SYMPTOM_LANGUAGE_MAP[normalized] || normalized;
}

async function buildNutritionGuidance(context) {
	const smartNutrition = getSmartNutrition(context.phase, context.symptoms, {
		lifestyle: context.lifestyle,
	});

	const reasoning = Array.isArray(smartNutrition?.foodReasoning) ? smartNutrition.foodReasoning : [];
	const suggestionItems = reasoning.slice(0, 3);
	const suggestedFoods = suggestionItems.map((entry) => entry.food).filter(Boolean);
	const primaryReason = suggestionItems[0]?.reason || smartNutrition?.explanation || "These choices support your current cycle needs.";
	const symptom = describeSymptom(context?.symptoms?.[0]);

	if (suggestedFoods.length > 0) {
		const prefix = symptom ? `Since you're feeling ${symptom}, ` : "";
		return `${prefix}try ${formatFoodList(suggestedFoods)}. ${primaryReason}`;
	}

	if (Array.isArray(smartNutrition?.finalFoods) && smartNutrition.finalFoods.length > 0) {
		const quickFoods = smartNutrition.finalFoods.slice(0, 3);
		const prefix = symptom ? `Since you're feeling ${symptom}, ` : "";
		return `${prefix}try ${formatFoodList(quickFoods)}. ${smartNutrition.explanation || "These foods can support your energy and cycle comfort."}`;
	}

	return "Try a balanced plate with leafy greens, whole grains, and protein to support cycle health.";
}

const RESPONSE_BUILDERS = {
	pain: [
		async (context) =>
			`I am sorry you are in pain.${formatSymptomsText(context.symptoms)} Start with gentle rest, warm comfort, and hydration.` +
			getHistoryBridge(context),
		async (context) =>
			`That sounds uncomfortable, and your feelings are valid.${formatSymptomsText(context.symptoms)} Please slow down, drink water, and let your body rest.` +
			getHistoryBridge(context),
		async (context) =>
			`I hear you, and you do not have to push through this alone.${formatSymptomsText(context.symptoms)} A short rest break, warm fluids, and hydration may help.` +
			getHistoryBridge(context),
		async (context) =>
			`Thanks for sharing how you feel.${formatSymptomsText(context.symptoms)} Try resting, staying hydrated, and using gentle heat if available.` +
			getHistoryBridge(context),
	],
	mood: [
		async (context) =>
			`I am here with you. Take a slow breath in, then out, and give yourself a softer moment.` +
			getHistoryBridge(context),
		async (context) =>
			`Your emotions make sense, and you deserve kindness right now. A calm walk, journaling, or breathing can ease the edge.` +
			getHistoryBridge(context),
		async (context) =>
			`Thank you for opening up. Let us keep things gentle: sip water, breathe slowly, and take one small step at a time.` +
			getHistoryBridge(context),
		async (context) =>
			`I hear that this feels heavy. A calming routine and a bit of rest can help regulate your mood.` +
			getHistoryBridge(context),
	],
	cycle: [
		async (context) =>
			`You are in the ${getPhaseLabel(context.phase)} phase. ${getPhaseExpectationText(context.phase)} It can help to track symptoms daily.` +
			getHistoryBridge(context),
		async (context) =>
			`Based on your cycle phase, here is what to expect: ${getPhaseExpectationText(context.phase)} Keep hydration and sleep consistent.` +
			getHistoryBridge(context),
		async (context) =>
			`${getPhaseExpectationText(context.phase)} If you are in the luteal phase, mood swings are a common experience for many people.` +
			getHistoryBridge(context),
		async (context) =>
			`Thanks for checking in about your cycle. ${getPhaseExpectationText(context.phase)} Gentle self-care can make this phase easier.` +
			getHistoryBridge(context),
	],
	nutrition: [
		async (context) =>
			`${await buildNutritionGuidance(context)} For balanced support, pair foods with water and regular meals.` +
			getHistoryBridge(context),
		async (context) =>
			`${await buildNutritionGuidance(context)} Small, steady meals can help with energy and cravings.` +
			getHistoryBridge(context),
		async (context) =>
			`${await buildNutritionGuidance(context)} You can combine protein, fiber, and healthy fats for better stability.` +
			getHistoryBridge(context),
		async (context) =>
			`${await buildNutritionGuidance(context)} Choose what feels realistic today, even one supportive meal is progress.` +
			getHistoryBridge(context),
	],
	greeting: [
		async () => "Hi, I am here for you. Tell me how you are feeling today.",
		async () => "Hello, welcome back. I can support your cycle, mood, pain, or nutrition questions.",
		async () => "Hey there, it is good to hear from you. What would you like help with today?",
		async () => "Hi, I am ready when you are. Share what is going on and we can take it step by step.",
	],
	general: [
		async (context) =>
			`I am here to support you with practical guidance for cycle, mood, pain, and nutrition.` +
			getHistoryBridge(context),
		async (context) =>
			`Thanks for sharing. I can help with gentle next steps based on your symptoms and cycle context.` +
			getHistoryBridge(context),
		async (context) =>
			`I can offer supportive suggestions and daily care ideas that fit your current phase.` +
			getHistoryBridge(context),
		async (context) =>
			`I am listening. If you share your symptoms or phase, I can provide more personalized support.` +
			getHistoryBridge(context),
	],
};

async function generateResponse(intent, context, message = "") {
	const normalizedIntent = normalizeIntent(intent);
	const normalizedContext = normalizeContext(context);
	const builders = RESPONSE_BUILDERS[normalizedIntent] || RESPONSE_BUILDERS.general;
	const selectedBuilder = pickRandom(builders) || RESPONSE_BUILDERS.general[0];
	const symptomAwareReply = buildSymptomAwareReply(message, normalizedContext);

	const baseResponse = symptomAwareReply || (await selectedBuilder(normalizedContext));
	const empatheticResponse = applyEmpatheticOpening(baseResponse);

	if (normalizedIntent === "greeting") {
		return empatheticResponse;
	}

	return `${empatheticResponse} ${SAFETY_NOTE}`.trim();
}

module.exports = {
	generateResponse,
};
