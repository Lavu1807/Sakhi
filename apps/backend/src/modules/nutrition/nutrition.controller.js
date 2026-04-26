const { getFoodNutrition } = require('../../integrations/usda.integration');
const logger = require('../../shared/utils/logger');

const NUTRITION_UNAVAILABLE_MESSAGE = "Nutrition data unavailable";

// Controller keeps HTTP-level concerns separate from USDA service logic.
async function getNutritionByFood(req, res) {
	const foodName = decodeURIComponent(String(req.params.food || "")).trim();

	if (!foodName) {
		return res.status(400).json({
			message: "Food name is required.",
		});
	}

	try {
		const nutrition = await getFoodNutrition(foodName);

		if (!nutrition) {
			return res.status(404).json({
				message: NUTRITION_UNAVAILABLE_MESSAGE,
			});
		}

		return res.status(200).json(nutrition);
	} catch (error) {
		logger.error({ msg: "USDA fetch failed", foodName, error: error.message });

		return res.status(503).json({
			message: NUTRITION_UNAVAILABLE_MESSAGE,
		});
	}
}

module.exports = {
	getNutritionByFood,
};
