const SUGGESTION_BY_SYMPTOM = {
	cramps: "Take extra rest and try gentle heat therapy for comfort.",
	fatigue: "Include iron-rich foods like spinach, lentils, or beans in your meals.",
	"mood swings": "Try short relaxation techniques like deep breathing or journaling.",
	bloating: "Stay hydrated throughout the day to ease bloating.",
};

const MOOD_SWING_VARIANTS = new Set(["mood swings", "mood swing", "mood_swing", "mood_swings"]);

function normalizeSymptoms(symptoms) {
	if (!Array.isArray(symptoms)) {
		return [];
	}

	return symptoms
		.map((item) => String(item || "").trim().toLowerCase())
		.filter(Boolean);
}

function getSuggestionKey(symptom) {
	if (MOOD_SWING_VARIANTS.has(symptom)) {
		return "mood swings";
	}

	return symptom;
}

function buildSymptomSuggestions(data = {}) {
	const normalizedSymptoms = normalizeSymptoms(data.symptoms);
	const suggestionSet = new Set();

	for (const symptom of normalizedSymptoms) {
		const suggestionKey = getSuggestionKey(symptom);
		const suggestion = SUGGESTION_BY_SYMPTOM[suggestionKey];
		if (suggestion) {
			suggestionSet.add(suggestion);
		}
	}

	if (suggestionSet.size === 0) {
		suggestionSet.add("Keep tracking your symptoms and continue gentle self-care habits.");
	}

	return {
		suggestions: Array.from(suggestionSet),
	};
}

module.exports = {
	buildSymptomSuggestions,
};