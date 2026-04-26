const axios = require("axios");
const pool = require('../config/db');
const logger = require('../shared/utils/logger');
const { usdaApiCallsTotal, nutritionCacheSize } = require('../shared/utils/metrics');
const { recordUsdaFailure } = require('../shared/utils/alertRules');

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_TIMEOUT_MS = 10000;
const CACHE_TTL_MINUTES = 20;
const CACHE_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

const MODULE_LOG = logger.child({ module: "usdaService" });

// Track active requests so the same food does not trigger duplicate concurrent calls.
// This stays in-memory intentionally — it's a process-level concurrency dedup mechanism.
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

// Read a valid cache entry from PostgreSQL if it exists.
async function getCachedNutrition(cacheKey) {
	try {
		const query = `
			SELECT nutrition_data
			FROM nutrition_cache
			WHERE cache_key = $1 AND expires_at > NOW()
			LIMIT 1
		`;

		const { rows } = await pool.query(query, [cacheKey]);

		if (!rows[0]) {
			return {
				isCached: false,
				data: null,
			};
		}

		usdaApiCallsTotal.inc({ status: "hit" });

		return {
			isCached: true,
			data: cloneNutritionData(rows[0].nutrition_data),
		};
	} catch (error) {
		MODULE_LOG.warn({ msg: "Cache read failed, proceeding without cache", error: error.message });
		return {
			isCached: false,
			data: null,
		};
	}
}

// Store nutrition response in PostgreSQL cache with expiry.
async function setCachedNutrition(cacheKey, nutritionData) {
	try {
		const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);

		const query = `
			INSERT INTO nutrition_cache (cache_key, nutrition_data, expires_at)
			VALUES ($1, $2::jsonb, $3)
			ON CONFLICT (cache_key)
			DO UPDATE SET
				nutrition_data = $2::jsonb,
				expires_at = $3
		`;

		await pool.query(query, [cacheKey, JSON.stringify(nutritionData), expiresAt]);
	} catch (error) {
		MODULE_LOG.warn({ msg: "Cache write failed", error: error.message, cacheKey });
	}
}

// Periodic cleanup of expired cache entries.
async function cleanupExpiredCache() {
	try {
		const result = await pool.query("DELETE FROM nutrition_cache WHERE expires_at <= NOW()");
		const deletedCount = result.rowCount || 0;

		if (deletedCount > 0) {
			MODULE_LOG.info({ msg: "Expired cache entries cleaned", deletedCount });
		}

		// Update cache size gauge.
		const countResult = await pool.query("SELECT COUNT(*) AS count FROM nutrition_cache");
		nutritionCacheSize.set(Number(countResult.rows[0]?.count) || 0);
	} catch (error) {
		MODULE_LOG.warn({ msg: "Cache cleanup failed", error: error.message });
	}
}

// Start periodic cache cleanup (only in non-test environments).
if (process.env.NODE_ENV !== "test") {
	setInterval(cleanupExpiredCache, CACHE_CLEANUP_INTERVAL_MS);
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
		const cached = await getCachedNutrition(cacheKey);
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
			await setCachedNutrition(cacheKey, nutritionResult);

			usdaApiCallsTotal.inc({ status: "miss" });

			return cloneNutritionData(nutritionResult);
		})();

		inFlightRequests.set(cacheKey, requestPromise);
		requestPromise.finally(() => {
			inFlightRequests.delete(cacheKey);
		});

		return await requestPromise;
	} catch (error) {
		usdaApiCallsTotal.inc({ status: "error" });
		recordUsdaFailure();
		MODULE_LOG.error({ msg: "USDA nutrition fetch failed", error: error.message, foodName });
		throw new Error(error.message || "USDA API request failed.");
	}
}

module.exports = {
	getFoodNutrition,
};
