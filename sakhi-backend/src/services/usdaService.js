const axios = require("axios");

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_TIMEOUT_MS = 10000;
const CACHE_TTL_MINUTES = 20;
const CACHE_TTL_MS = CACHE_TTL_MINUTES * 60 * 1000;

// Cache USDA nutrition results per food to reduce repeated API calls.
const nutritionCache = new Map();

// Track active requests so the same food does not trigger duplicate concurrent calls.
const inFlightRequests = new Map();

const NUTRIENT_MATCHERS = {
	calories: ["energy"],
	protein: ["protein"],
	carbs: ["carbohydrate, by difference", "carbohydrate"],
	fat: ["total lipid (fat)", "total lipid", "fat"],
};

function parseNumber(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return 0;
	}

	return Math.round(parsed * 10) / 10;
}

function normalizeText(value) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function buildCacheKey(foodName) {
	return normalizeText(foodName);
}

function cloneNutritionData(data) {
	if (!data) {
		return null;
	}

	return {
		...data,
	};
}

// Read a valid cache entry if it exists, and clear stale entries on access.
function getCachedNutrition(cacheKey) {
	const entry = nutritionCache.get(cacheKey);

	if (!entry) {
		return {
			isCached: false,
			data: null,
		};
	}

	if (entry.expiresAt <= Date.now()) {
		nutritionCache.delete(cacheKey);
		return {
			isCached: false,
			data: null,
		};
	}

	return {
		isCached: true,
		data: cloneNutritionData(entry.data),
	};
}

// Store nutrition response in cache with expiry.
function setCachedNutrition(cacheKey, nutritionData) {
	nutritionCache.set(cacheKey, {
		data: cloneNutritionData(nutritionData),
		expiresAt: Date.now() + CACHE_TTL_MS,
	});
}

// Read and validate USDA API key from environment variables.
function getUsdaApiKey() {
	const apiKey = String(process.env.USDA_API_KEY || "").trim();

	if (!apiKey) {
		throw new Error("USDA_API_KEY is not configured.");
	}

	return apiKey;
}

// Build request payload for USDA food search endpoint.
function buildSearchPayload(foodName) {
	return {
		query: foodName,
		pageSize: 1,
	};
}

// Build axios request config including query params and timeout.
function buildRequestConfig(apiKey) {
	return {
		params: {
			api_key: apiKey,
		},
		timeout: USDA_TIMEOUT_MS,
	};
}

// Execute USDA API call and return response payload.
async function fetchUsdaSearchResults(foodName, apiKey) {
	try {
		const response = await axios.post(
			USDA_SEARCH_URL,
			buildSearchPayload(foodName),
			buildRequestConfig(apiKey),
		);

		return response?.data || {};
	} catch (error) {
		const apiMessage = error?.response?.data?.error?.message;
		throw new Error(apiMessage || "USDA API request failed.");
	}
}

// Safely return the first matched USDA food record, if any.
function getFirstFood(searchData) {
	const foods = Array.isArray(searchData?.foods) ? searchData.foods : [];
	return foods[0] || null;
}

// Return nutrient array in a consistent shape.
function getFoodNutrients(food) {
	return Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
}

// Extract a nutrient value by checking multiple USDA nutrient label patterns.
function extractNutrientValue(foodNutrients, candidateLabels) {
	const normalizedLabels = candidateLabels.map((label) => normalizeText(label));

	const matchedNutrient = foodNutrients.find((item) => {
		const nutrientName = normalizeText(item?.nutrientName);
		return normalizedLabels.some((label) => nutrientName.includes(label));
	});

	return parseNumber(matchedNutrient?.value);
}

// Normalize USDA nutrient response to the app contract.
function mapFoodNutrition(food) {
	const foodNutrients = getFoodNutrients(food);

	return {
		name: String(food?.description || "").trim(),
		calories: extractNutrientValue(foodNutrients, NUTRIENT_MATCHERS.calories),
		protein: extractNutrientValue(foodNutrients, NUTRIENT_MATCHERS.protein),
		carbs: extractNutrientValue(foodNutrients, NUTRIENT_MATCHERS.carbs),
		fat: extractNutrientValue(foodNutrients, NUTRIENT_MATCHERS.fat),
	};
}

async function getFoodNutrition(foodName) {
	try {
		// Validate and normalize food input.
		const normalizedFoodName = String(foodName || "").trim();
		if (!normalizedFoodName) {
			return null;
		}

		const cacheKey = buildCacheKey(normalizedFoodName);

		// Return cached data when available.
		const cached = getCachedNutrition(cacheKey);
		if (cached.isCached) {
			return cached.data;
		}

		// Reuse an ongoing request for the same food to prevent duplicate calls.
		if (inFlightRequests.has(cacheKey)) {
			return await inFlightRequests.get(cacheKey);
		}

		const requestPromise = (async () => {
			// Read USDA API key from environment variables.
			const apiKey = getUsdaApiKey();

			// Fetch raw USDA search results.
			const searchData = await fetchUsdaSearchResults(normalizedFoodName, apiKey);

			// Handle no-match case explicitly.
			const food = getFirstFood(searchData);
			const nutritionResult = food ? mapFoodNutrition(food) : null;

			// Cache both matched and no-match outcomes for a short TTL.
			setCachedNutrition(cacheKey, nutritionResult);

			return cloneNutritionData(nutritionResult);
		})();

		inFlightRequests.set(cacheKey, requestPromise);
		requestPromise
			.finally(() => {
				inFlightRequests.delete(cacheKey);
			})
			.catch(() => {
				// Request errors are handled by callers; suppress unhandled rejection from cleanup chain.
			});

		return await requestPromise;
	} catch (error) {
		throw new Error(error.message || "USDA API request failed.");
	}
}

module.exports = {
	getFoodNutrition,
};
