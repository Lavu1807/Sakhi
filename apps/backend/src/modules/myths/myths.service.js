const mythsData = Object.freeze([
	{
		id: 1,
		myth: "Every period cycle is exactly 28 days.",
		fact: "Healthy menstrual cycles can range from about 21 to 35 days in adults.",
		category: "Menstruation",
		source: "ACOG",
		difficulty: "easy",
	},
	{
		id: 2,
		myth: "You cannot get pregnant during your period.",
		fact: "Pregnancy is still possible because sperm can survive for several days in the reproductive tract.",
		category: "Menstruation",
		source: "NHS",
		difficulty: "easy",
	},
	{
		id: 3,
		myth: "Period blood is dirty blood.",
		fact: "Period blood is mostly blood and uterine tissue from normal shedding of the uterine lining.",
		category: "Menstruation",
		source: "Cleveland Clinic",
		difficulty: "easy",
	},
	{
		id: 4,
		myth: "Severe period pain is always normal.",
		fact: "Mild cramps are common, but severe pain that disrupts daily life should be checked by a clinician.",
		category: "Menstruation",
		source: "ACOG",
		difficulty: "medium",
	},
	{
		id: 5,
		myth: "Periods stop in water, so there is no need for protection while swimming.",
		fact: "Flow may slow in water pressure, but menstruation does not fully stop and protection is still useful.",
		category: "Menstruation",
		source: "Mayo Clinic",
		difficulty: "medium",
	},
	{
		id: 6,
		myth: "Cravings mean your body needs junk food.",
		fact: "Cravings are common, but balanced meals with protein, fiber, and healthy fats support steadier energy.",
		category: "Nutrition",
		source: "Harvard T.H. Chan School of Public Health",
		difficulty: "easy",
	},
	{
		id: 7,
		myth: "You should eat much less during your period.",
		fact: "Your body still needs regular nourishment, and skipping meals can worsen fatigue and mood changes.",
		category: "Nutrition",
		source: "NHS",
		difficulty: "easy",
	},
	{
		id: 8,
		myth: "Only red meat can prevent iron deficiency.",
		fact: "Iron also comes from lentils, beans, tofu, leafy greens, and fortified foods.",
		category: "Nutrition",
		source: "WHO",
		difficulty: "easy",
	},
	{
		id: 9,
		myth: "Vitamin supplements can replace regular meals.",
		fact: "Supplements support specific gaps, but they do not replace complete meals with carbs, protein, and fats.",
		category: "Nutrition",
		source: "CDC",
		difficulty: "medium",
	},
	{
		id: 10,
		myth: "Salt has no effect on period bloating.",
		fact: "High sodium intake can increase water retention and make bloating feel worse.",
		category: "Nutrition",
		source: "Mayo Clinic",
		difficulty: "easy",
	},
	{
		id: 11,
		myth: "You should not bathe during your period.",
		fact: "Bathing is safe and can help relax muscles and reduce cramps.",
		category: "Hygiene",
		source: "NHS",
		difficulty: "easy",
	},
	{
		id: 12,
		myth: "Pads are safe to wear all day without changing.",
		fact: "Pads should be changed every few hours to reduce odor, irritation, and infection risk.",
		category: "Hygiene",
		source: "CDC",
		difficulty: "easy",
	},
	{
		id: 13,
		myth: "Douching keeps the vagina cleaner during periods.",
		fact: "Douching can disturb normal vaginal bacteria and increase infection risk.",
		category: "Hygiene",
		source: "ACOG",
		difficulty: "medium",
	},
	{
		id: 14,
		myth: "Menstrual cups are unhygienic.",
		fact: "Menstrual cups are safe when cleaned and used according to instructions.",
		category: "Hygiene",
		source: "WHO",
		difficulty: "easy",
	},
	{
		id: 15,
		myth: "Any period odor means poor hygiene.",
		fact: "A mild odor can be normal, but a strong fishy smell may need medical evaluation.",
		category: "Hygiene",
		source: "Cleveland Clinic",
		difficulty: "medium",
	},
	{
		id: 16,
		myth: "You should avoid all exercise during periods.",
		fact: "Light to moderate exercise can improve mood and may reduce cramps for many people.",
		category: "Exercise",
		source: "ACSM",
		difficulty: "easy",
	},
	{
		id: 17,
		myth: "Strength training is unsafe during menstruation.",
		fact: "Strength training is generally safe; many people just prefer adjusting intensity based on comfort.",
		category: "Exercise",
		source: "ACSM",
		difficulty: "easy",
	},
	{
		id: 18,
		myth: "Swimming during your period is dangerous.",
		fact: "Swimming is safe during menstruation when using suitable period products.",
		category: "Exercise",
		source: "NHS",
		difficulty: "easy",
	},
	{
		id: 19,
		myth: "Yoga inversions cause harmful backward menstrual flow.",
		fact: "There is no good evidence that typical yoga poses cause harmful backward menstrual flow.",
		category: "Exercise",
		source: "ACOG",
		difficulty: "medium",
	},
	{
		id: 20,
		myth: "Exercise always makes PMS symptoms worse.",
		fact: "Regular physical activity is linked with improved mood and can reduce some PMS symptoms.",
		category: "Exercise",
		source: "Mayo Clinic",
		difficulty: "easy",
	},
	{
		id: 21,
		myth: "PMS mood changes are just attention-seeking.",
		fact: "Hormonal changes can affect brain chemistry and cause real emotional symptoms.",
		category: "Mental Health",
		source: "NIMH",
		difficulty: "easy",
	},
	{
		id: 22,
		myth: "Everyone experiences PMS the same way.",
		fact: "PMS symptoms vary widely in type and intensity from person to person.",
		category: "Mental Health",
		source: "ACOG",
		difficulty: "easy",
	},
	{
		id: 23,
		myth: "Severe premenstrual mood symptoms are not a medical issue.",
		fact: "Severe mood symptoms may indicate PMDD, a recognized condition that can be treated.",
		category: "Mental Health",
		source: "NIMH",
		difficulty: "medium",
	},
	{
		id: 24,
		myth: "Stress does not affect your menstrual cycle.",
		fact: "High stress can influence hormones and may change cycle timing.",
		category: "Mental Health",
		source: "NHS",
		difficulty: "easy",
	},
	{
		id: 25,
		myth: "Sleep has no link to period-related mood changes.",
		fact: "Poor sleep can worsen irritability, stress, and pain sensitivity around periods.",
		category: "Mental Health",
		source: "CDC",
		difficulty: "medium",
	},
]);

const CATEGORY_MAP = {
	menstruation: "Menstruation",
	nutrition: "Nutrition",
	hygiene: "Hygiene",
	exercise: "Exercise",
	"mental health": "Mental Health",
};
const PHASE_CATEGORY_PRIORITY = {
	menstrual: new Set(["Menstruation", "Hygiene", "Exercise"]),
	follicular: new Set(["Exercise", "Nutrition"]),
	ovulation: new Set(["Exercise", "Nutrition", "Mental Health"]),
	luteal: new Set(["Mental Health", "Nutrition", "Menstruation"]),
};
const SYMPTOM_KEYWORD_MAP = {
	cramps: ["cramp", "pain", "exercise", "swimming", "bath"],
	pain: ["pain", "cramp", "hurt", "exercise"],
	fatigue: ["fatigue", "energy", "sleep", "meal", "nutrition"],
	tired: ["fatigue", "energy", "sleep", "meal", "nutrition"],
	headache: ["headache", "stress", "sleep", "hydration"],
	nausea: ["nausea", "meal", "food", "hydration"],
	bloating: ["bloat", "salt", "nutrition", "exercise"],
	mood: ["mood", "pms", "stress", "sleep", "pmdd", "mental"],
	"mood swings": ["mood", "pms", "stress", "sleep", "pmdd", "mental"],
};
const MYTH_QUESTION_PATTERNS = [/^\s*is it true that\b/i, /^\s*is it true\b/i, /^\s*can i\b/i];
const MYTH_QUESTION_PREFIX_PATTERNS = [/^\s*is it true that\s*/i, /^\s*is it true\s*/i, /^\s*can i\s*/i];
const QUERY_STOP_WORDS = new Set([
	"is",
	"it",
	"true",
	"that",
	"can",
	"i",
	"a",
	"an",
	"the",
	"to",
	"for",
	"my",
	"during",
	"about",
	"on",
	"in",
	"of",
	"do",
	"does",
	"if",
	"with",
	"and",
	"or",
	"period",
	"periods",
]);
const FEEDBACK_TYPES = new Set(["believed", "helpful"]);
const mythFeedbackStore = new Map();

function normalizeSearchText(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
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

function normalizeSymptomsInput(symptoms) {
	const list = Array.isArray(symptoms)
		? symptoms
		: typeof symptoms === "string"
			? symptoms.split(",")
			: [];

	return Array.from(
		new Set(
			list
				.map((item) => normalizeSearchText(item))
				.filter(Boolean),
		),
	);
}

function stripMythQuestionPrefix(message) {
	let cleaned = String(message || "").trim();

	for (const pattern of MYTH_QUESTION_PREFIX_PATTERNS) {
		if (pattern.test(cleaned)) {
			cleaned = cleaned.replace(pattern, "");
			break;
		}
	}

	return cleaned.trim();
}

function extractKeywords(text) {
	const normalized = normalizeSearchText(text);
	if (!normalized) {
		return [];
	}

	const words = normalized.split(" ").filter(Boolean);
	return Array.from(
		new Set(
			words.filter((word) => word.length >= 3 && !QUERY_STOP_WORDS.has(word)),
		),
	);
}

function scoreMythForQuery(myth, normalizedQuery, keywords) {
	const mythText = normalizeSearchText(myth.myth);
	const factText = normalizeSearchText(myth.fact);
	const categoryText = normalizeSearchText(myth.category);

	let score = 0;

	if (normalizedQuery && normalizedQuery.length >= 4) {
		if (mythText.includes(normalizedQuery)) {
			score += 12;
		}

		if (factText.includes(normalizedQuery)) {
			score += 8;
		}
	}

	for (const keyword of keywords) {
		if (mythText.includes(keyword)) {
			score += 4;
		}

		if (factText.includes(keyword)) {
			score += 3;
		}

		if (categoryText.includes(keyword)) {
			score += 2;
		}
	}

	return score;
}

function normalizeCategory(category) {
	if (typeof category !== "string") {
		return null;
	}

	return CATEGORY_MAP[category.trim().toLowerCase()] || null;
}

function getMythCategories() {
	return Object.values(CATEGORY_MAP);
}

function getAllMyths(category) {
	if (!category) {
		return mythsData;
	}

	return mythsData.filter((item) => item.category === category);
}

function scoreMythForPersonalization(myth, normalizedPhase, normalizedSymptoms) {
	const searchableText = normalizeSearchText(`${myth.myth} ${myth.fact} ${myth.category}`);
	let score = 0;

	if (normalizedPhase) {
		const preferredCategories = PHASE_CATEGORY_PRIORITY[normalizedPhase];
		if (preferredCategories && preferredCategories.has(myth.category)) {
			score += 3;
		}

		if (searchableText.includes(normalizedPhase)) {
			score += 2;
		}
	}

	for (const symptom of normalizedSymptoms) {
		const symptomKeywords = SYMPTOM_KEYWORD_MAP[symptom] || [symptom];

		for (const keyword of symptomKeywords) {
			if (searchableText.includes(normalizeSearchText(keyword))) {
				score += 3;
			}
		}
	}

	return score;
}

function getPersonalizedMyths({ category, phase, symptoms } = {}) {
	const myths = getAllMyths(category);
	const normalizedPhase = normalizePhase(phase);
	const normalizedSymptoms = normalizeSymptomsInput(symptoms);
	const hasPersonalizationContext = Boolean(normalizedPhase) || normalizedSymptoms.length > 0;

	if (!hasPersonalizationContext) {
		return myths;
	}

	const scored = myths
		.map((myth) => ({
			myth,
			score: scoreMythForPersonalization(myth, normalizedPhase, normalizedSymptoms),
		}))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}

			return a.myth.id - b.myth.id;
		})
		.map((entry) => entry.myth);

	if (scored.length > 0) {
		return scored;
	}

	return myths;
}

function isMythEducationQuestion(message) {
	const normalizedMessage = String(message || "").trim();
	if (!normalizedMessage) {
		return false;
	}

	return MYTH_QUESTION_PATTERNS.some((pattern) => pattern.test(normalizedMessage));
}

function findRelevantMythForQuestion(message) {
	if (!isMythEducationQuestion(message)) {
		return null;
	}

	const focusedQuery = stripMythQuestionPrefix(message);
	const normalizedQuery = normalizeSearchText(focusedQuery);
	const keywords = extractKeywords(focusedQuery);

	let bestMyth = null;
	let bestScore = 0;

	for (const myth of mythsData) {
		const score = scoreMythForQuery(myth, normalizedQuery, keywords);
		if (score > bestScore) {
			bestScore = score;
			bestMyth = myth;
		}
	}

	if (bestMyth) {
		return bestMyth;
	}

	if (!focusedQuery || focusedQuery.length < 3) {
		return null;
	}

	return getRandomMyth();
}

function getMythById(id) {
	const mythId = Number.parseInt(String(id), 10);

	if (!Number.isInteger(mythId) || mythId <= 0) {
		return null;
	}

	return mythsData.find((item) => item.id === mythId) || null;
}

function getRandomMyth(category) {
	const filteredMyths = getAllMyths(category);

	if (!filteredMyths.length) {
		return null;
	}

	const randomIndex = Math.floor(Math.random() * filteredMyths.length);
	return filteredMyths[randomIndex];
}

function submitMythFeedback({ mythId, feedbackType }) {
	const myth = getMythById(mythId);

	if (!myth) {
		const error = new Error("Myth not found.");
		error.code = "MYTH_NOT_FOUND";
		throw error;
	}

	const normalizedType = String(feedbackType || "")
		.trim()
		.toLowerCase();

	if (!FEEDBACK_TYPES.has(normalizedType)) {
		const error = new Error("feedbackType must be either 'believed' or 'helpful'.");
		error.code = "INVALID_FEEDBACK_TYPE";
		throw error;
	}

	const current = mythFeedbackStore.get(myth.id) || {
		believedCount: 0,
		helpfulCount: 0,
	};

	if (normalizedType === "believed") {
		current.believedCount += 1;
	} else {
		current.helpfulCount += 1;
	}

	current.updatedAt = new Date().toISOString();
	mythFeedbackStore.set(myth.id, current);

	return {
		mythId: myth.id,
		feedbackType: normalizedType,
		totals: {
			believed: current.believedCount,
			helpful: current.helpfulCount,
		},
		updatedAt: current.updatedAt,
	};
}

module.exports = {
	normalizeCategory,
	getMythCategories,
	getAllMyths,
	normalizePhase,
	getPersonalizedMyths,
	isMythEducationQuestion,
	findRelevantMythForQuestion,
	getMythById,
	getRandomMyth,
	submitMythFeedback,
};