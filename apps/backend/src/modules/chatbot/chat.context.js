const { detectIntent } = require("./intentService");

const MAX_HISTORY_MESSAGES = 5;

function normalizeStringArray(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((item) => typeof item === "string" && item.trim().length > 0)
		.map((item) => item.trim());
}

function normalizeSymptomAnalysis(value) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const severity = typeof value.severity === "string" ? value.severity.trim().toLowerCase() : "";
	const risk = typeof value.risk === "string" ? value.risk.trim().toLowerCase() : "";
	const insights = normalizeStringArray(value.insights);
	const suggestions = normalizeStringArray(value.suggestions);
	const personalizedInsights = normalizeStringArray(value.personalizedInsights);

	if (!severity && !risk && insights.length === 0 && suggestions.length === 0 && personalizedInsights.length === 0) {
		return null;
	}

	return {
		severity,
		risk,
		insights,
		suggestions,
		personalizedInsights,
	};
}

function normalizeUserContext(value) {
	if (!value || typeof value !== "object") {
		return {
			phase: "",
			symptoms: [],
			lifestyle: "",
			latestMood: "",
			latestMoodIntensity: null,
			latestMoodDate: "",
			symptomAnalysis: null,
		};
	}

	const latestMoodIntensityRaw = Number(value.latestMoodIntensity);

	return {
		phase: typeof value.phase === "string" ? value.phase.trim() : "",
		symptoms: normalizeStringArray(value.symptoms),
		lifestyle: typeof value.lifestyle === "string" ? value.lifestyle.trim() : "",
		latestMood: typeof value.latestMood === "string" ? value.latestMood.trim().toLowerCase() : "",
		latestMoodIntensity:
			Number.isFinite(latestMoodIntensityRaw) && latestMoodIntensityRaw >= 1 && latestMoodIntensityRaw <= 5
				? latestMoodIntensityRaw
				: null,
		latestMoodDate: typeof value.latestMoodDate === "string" ? value.latestMoodDate.trim() : "",
		symptomAnalysis: normalizeSymptomAnalysis(value.symptomAnalysis),
	};
}

function normalizeHistoryEntry(entry) {
	if (typeof entry === "string") {
		const message = entry.trim();
		if (!message) {
			return null;
		}

		return {
			message,
			intent: detectIntent(message).intent,
		};
	}

	if (!entry || typeof entry !== "object") {
		return null;
	}

	const rawMessage =
		typeof entry.message === "string"
			? entry.message
			: typeof entry.text === "string"
				? entry.text
				: typeof entry.content === "string"
					? entry.content
					: "";

	const message = rawMessage.trim();
	if (!message) {
		return null;
	}

	const existingIntent =
		typeof entry.intent === "string" && entry.intent.trim().length > 0
			? entry.intent.trim().toLowerCase()
			: typeof entry.detectedIntent === "string" && entry.detectedIntent.trim().length > 0
				? entry.detectedIntent.trim().toLowerCase()
				: "";

	return {
		message,
		intent: existingIntent || detectIntent(message).intent,
	};
}

function getRecentHistoryEntries(history) {
	if (!Array.isArray(history)) {
		return [];
	}

	return history
		.map((entry) => normalizeHistoryEntry(entry))
		.filter(Boolean)
		.slice(-MAX_HISTORY_MESSAGES);
}

function normalizeRememberedIntent(value) {
	if (typeof value !== "string") {
		return "";
	}

	const normalized = value.trim().toLowerCase();
	return normalized;
}

function normalizeHistorySource(history) {
	if (Array.isArray(history)) {
		return {
			messages: history,
			rememberedIntent: "",
		};
	}

	if (!history || typeof history !== "object") {
		return {
			messages: [],
			rememberedIntent: "",
		};
	}

	return {
		messages: Array.isArray(history.messages) ? history.messages : [],
		rememberedIntent: normalizeRememberedIntent(history.lastIntent),
	};
}

function getLastDetectedIntent(historyEntries, rememberedIntent) {
	if (rememberedIntent) {
		return rememberedIntent;
	}

	if (historyEntries.length === 0) {
		return "general";
	}

	return historyEntries[historyEntries.length - 1].intent || "general";
}

function buildContext(userContext, history) {
	const normalizedContext = normalizeUserContext(userContext);
	const historySource = normalizeHistorySource(history);
	const historyEntries = getRecentHistoryEntries(historySource.messages);

	return {
		phase: normalizedContext.phase,
		symptoms: normalizedContext.symptoms,
		lifestyle: normalizedContext.lifestyle,
		latestMood: normalizedContext.latestMood,
		latestMoodIntensity: normalizedContext.latestMoodIntensity,
		latestMoodDate: normalizedContext.latestMoodDate,
		symptomAnalysis: normalizedContext.symptomAnalysis,
		history: {
			messages: historyEntries.map((entry) => entry.message),
			lastDetectedIntent: getLastDetectedIntent(historyEntries, historySource.rememberedIntent),
		},
	};
}

module.exports = {
	buildContext,
};
