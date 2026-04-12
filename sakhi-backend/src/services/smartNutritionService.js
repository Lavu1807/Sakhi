let nutritionData = {};

try {
	nutritionData = require("../../../src/data/nutritionData.json");
} catch (error) {
	nutritionData = {};
}

const PHASE_ALIAS_MAP = {
	menstrual: "Menstrual",
	"menstrual phase": "Menstrual",
	follicular: "Follicular",
	"follicular phase": "Follicular",
	ovulation: "Ovulation",
	"ovulation phase": "Ovulation",
	luteal: "Luteal",
	"luteal phase": "Luteal",
};

const LOW_ENERGY_PROTEIN_FOODS = ["eggs", "greek yogurt", "paneer", "lentils", "tofu"];

const LOW_SLEEP_MAGNESIUM_FOODS = [
	"pumpkin seeds",
	"almonds",
	"spinach",
	"dark chocolate 70 percent",
	"banana",
];

const ACTIVE_LIFESTYLE_PROTEIN_FOODS = ["chicken breast", "chickpeas", "salmon", "cottage cheese", "soy chunks"];

const DEFAULT_FOOD_REASON = "Supports overall hormonal balance and steady energy.";

const allergyMap = {
	milk: ["milk", "paneer", "cheese", "curd", "yogurt", "kefir", "butter", "ghee", "cottage cheese"],
	nuts: ["almond", "almonds", "walnut", "walnuts", "cashew", "cashews", "pistachio", "pistachios"],
};

function normalizeText(value) {
	if (typeof value !== "string") {
		return "";
	}

	return value
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

function resolvePhaseKey(phase) {
	const normalized = normalizeText(phase);
	if (!normalized) {
		return "";
	}

	return PHASE_ALIAS_MAP[normalized] || String(phase || "").trim();
}

function parseOptionalNumber(value) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFoods(foods) {
	if (!Array.isArray(foods)) {
		return [];
	}

	return foods.filter((food) => typeof food === "string" && food.trim().length > 0);
}

function normalizeSymptoms(symptoms) {
	if (!Array.isArray(symptoms)) {
		return [];
	}

	return symptoms.filter((symptom) => typeof symptom === "string" && symptom.trim().length > 0);
}

function formatLabel(value) {
	return String(value)
		.replace(/_/g, " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function matchesFoodTerm(food, term) {
	const normalizedFood = normalizeText(food);
	const normalizedTerm = normalizeText(term);

	if (!normalizedFood || !normalizedTerm) {
		return false;
	}

	return normalizedFood === normalizedTerm || normalizedFood.includes(normalizedTerm);
}

function addAllToSet(values, targetSet) {
	for (const value of values || []) {
		if (value) {
			targetSet.add(value);
		}
	}
}

function buildSymptomLookup(phaseData) {
	const lookup = new Map();

	for (const [symptomName, symptomData] of Object.entries(phaseData?.symptoms || {})) {
		lookup.set(normalizeText(symptomName), symptomData);
	}

	return lookup;
}

function buildMatchedSymptoms(symptoms, symptomLookup) {
	const matchedSymptoms = [];

	for (const symptom of normalizeSymptoms(symptoms)) {
		const normalizedSymptom = normalizeText(symptom);
		const symptomData = symptomLookup.get(normalizedSymptom);

		if (symptomData) {
			matchedSymptoms.push({ name: symptom, data: symptomData });
		}
	}

	return matchedSymptoms;
}

function normalizeAllergies(allergies) {
	if (Array.isArray(allergies)) {
		return allergies.filter((item) => typeof item === "string" && item.trim().length > 0);
	}

	if (typeof allergies === "string" && allergies.trim().length > 0) {
		return allergies
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}

	return [];
}

function buildFoodReasoning(foods, { phaseKey, phaseData, matchedSymptoms, user }) {
	const normalizedGeneralFoods = new Set((phaseData?.general?.foods || []).map((food) => normalizeText(food)));
	const phaseNutrient = phaseData?.general?.nutrients?.[0] || "";
	const energyLevel = parseOptionalNumber(user?.energy_level ?? user?.energyLevel);
	const sleepHours = parseOptionalNumber(user?.sleep_hours ?? user?.sleepHours);
	const lifestyle = normalizeText(user?.lifestyle);

	return foods.map((food) => {
		const normalizedFood = normalizeText(food);
		const reasonParts = [];
		const personalizationCategories = [];
		const isPhaseFood = normalizedGeneralFoods.has(normalizedFood);
		let symptomCategory = "";

		if (isPhaseFood) {
			if (phaseNutrient) {
				reasonParts.push(`Rich in ${phaseNutrient}, supports your ${phaseKey.toLowerCase()} phase needs`);
			} else {
				reasonParts.push(`Supports your ${phaseKey.toLowerCase()} phase nutrition needs`);
			}
		}

		for (const matchedSymptom of matchedSymptoms) {
			const symptomFoods = matchedSymptom?.data?.foods || [];
			const symptomNutrient = matchedSymptom?.data?.nutrients?.[0] || "";

			if (!symptomFoods.some((item) => normalizeText(item) === normalizedFood)) {
				continue;
			}

			const symptomLabel = formatLabel(matchedSymptom.name).toLowerCase();

			if (symptomNutrient) {
				reasonParts.push(`${symptomNutrient} helps with ${symptomLabel}`);
			} else {
				reasonParts.push(`Supports ${symptomLabel} management`);
			}

			symptomCategory = `${formatLabel(matchedSymptom.name)} Support`;
			break;
		}

		if (energyLevel !== null && energyLevel <= 2 && LOW_ENERGY_PROTEIN_FOODS.some((item) => matchesFoodTerm(food, item))) {
			reasonParts.push("High-protein support for low energy days");
			personalizationCategories.push("Energy Support");
		}

		if (sleepHours !== null && sleepHours < 6 && LOW_SLEEP_MAGNESIUM_FOODS.some((item) => matchesFoodTerm(food, item))) {
			reasonParts.push("Magnesium-rich support when sleep is low");
			personalizationCategories.push("Sleep Recovery");
		}

		if (lifestyle === "active" && ACTIVE_LIFESTYLE_PROTEIN_FOODS.some((item) => matchesFoodTerm(food, item))) {
			reasonParts.push("Extra protein support for an active lifestyle");
			personalizationCategories.push("Active Lifestyle Support");
		}

		const uniqueParts = Array.from(new Set(reasonParts));
		const category = symptomCategory || personalizationCategories[0] || (isPhaseFood ? "Phase Support" : "General Wellness");

		return {
			food,
			category,
			reason: uniqueParts.length > 0 ? `${uniqueParts.slice(0, 2).join(". ")}.` : DEFAULT_FOOD_REASON,
		};
	});
}

function buildFoodGroups(foodReasoning) {
	const grouped = new Map();

	for (const entry of foodReasoning) {
		const category = entry?.category || "General Wellness";

		if (!grouped.has(category)) {
			grouped.set(category, []);
		}

		grouped.get(category).push(entry);
	}

	return Array.from(grouped.entries()).map(([category, items]) => ({
		category,
		items,
	}));
}

function buildPipelineExplanation({ hasSymptoms, hasPersonalization, hasAllergyFiltering }) {
	const explanationParts = [];

	if (hasSymptoms) {
		explanationParts.push("These foods are recommended based on your current phase and symptoms.");
	} else {
		explanationParts.push("These foods are recommended based on your current phase.");
	}

	if (hasPersonalization) {
		explanationParts.push("Personalization rules were applied using your energy, sleep, and lifestyle inputs.");
	}

	if (hasAllergyFiltering) {
		explanationParts.push("Allergy filtering was applied for safety.");
	}

	return explanationParts.join(" ");
}

function filterAllergies(foods = [], allergies = []) {
	const normalizedFoods = normalizeFoods(foods);

	if (!Array.isArray(allergies) || allergies.length === 0) {
		return normalizedFoods;
	}

	const blockedTerms = new Set();

	for (const allergy of allergies) {
		const normalizedAllergy = normalizeText(allergy);
		const mappedTerms = allergyMap[normalizedAllergy] || [];
		addAllToSet(mappedTerms.map((term) => normalizeText(term)), blockedTerms);
	}

	if (blockedTerms.size === 0) {
		return normalizedFoods;
	}

	return normalizedFoods.filter((food) => {
		const normalizedFood = normalizeText(food);

		for (const blockedTerm of blockedTerms) {
			if (normalizedFood === blockedTerm || normalizedFood.includes(blockedTerm)) {
				return false;
			}
		}

		return true;
	});
}

function personalizeFoods(foods, user = {}) {
	const personalizedFoods = new Set(normalizeFoods(foods));

	const energyLevel = parseOptionalNumber(user?.energy_level ?? user?.energyLevel);
	const sleepHours = parseOptionalNumber(user?.sleep_hours ?? user?.sleepHours);
	const lifestyle = normalizeText(user?.lifestyle);

	if (energyLevel !== null && energyLevel <= 2) {
		addAllToSet(LOW_ENERGY_PROTEIN_FOODS, personalizedFoods);
	}

	if (sleepHours !== null && sleepHours < 6) {
		addAllToSet(LOW_SLEEP_MAGNESIUM_FOODS, personalizedFoods);
	}

	if (lifestyle === "active") {
		addAllToSet(ACTIVE_LIFESTYLE_PROTEIN_FOODS, personalizedFoods);
	}

	return Array.from(personalizedFoods);
}

function getNutrition(phase, symptoms = []) {
	const phaseKey = resolvePhaseKey(phase);
	const phaseData = nutritionData?.phases?.[phaseKey];

	if (!phaseData) {
		return {
			foods: [],
			nutrients: [],
		};
	}

	const foods = new Set();
	const nutrients = new Set();

	addAllToSet(phaseData.general?.foods, foods);
	addAllToSet(phaseData.general?.nutrients, nutrients);

	const symptomLookup = buildSymptomLookup(phaseData);

	for (const symptom of Array.isArray(symptoms) ? symptoms : []) {
		const symptomData = symptomLookup.get(normalizeText(symptom));

		if (!symptomData) {
			continue;
		}

		addAllToSet(symptomData.foods, foods);
		addAllToSet(symptomData.nutrients, nutrients);
	}

	return {
		foods: Array.from(foods),
		nutrients: Array.from(nutrients),
	};
}

function getSmartNutrition(phase, symptoms = [], user = {}) {
	const normalizedSymptoms = normalizeSymptoms(symptoms);
	const phaseKey = resolvePhaseKey(phase);
	const phaseData = nutritionData?.phases?.[phaseKey] || null;
	const symptomLookup = buildSymptomLookup(phaseData);
	const matchedSymptoms = buildMatchedSymptoms(normalizedSymptoms, symptomLookup);
	const { foods, nutrients } = getNutrition(phaseKey, normalizedSymptoms);
	const personalizedFoods = personalizeFoods(foods, user);
	const allergyList = normalizeAllergies(user?.allergies);
	const finalFoods = filterAllergies(personalizedFoods, allergyList);
	const foodReasoning = buildFoodReasoning(finalFoods, {
		phaseKey: phaseData ? phaseKey : "Current",
		phaseData,
		matchedSymptoms,
		user,
	});
	const foodGroups = buildFoodGroups(foodReasoning);
	const hasPersonalization = personalizedFoods.length > foods.length;
	const hasAllergyFiltering = allergyList.length > 0 && finalFoods.length < personalizedFoods.length;
	const explanation = buildPipelineExplanation({
		hasSymptoms: matchedSymptoms.length > 0,
		hasPersonalization,
		hasAllergyFiltering,
	});

	return {
		finalFoods,
		nutrients,
		foodReasoning,
		foodGroups,
		explanation,
	};
}

module.exports = {
	getSmartNutrition,
};
