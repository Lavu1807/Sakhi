const { getFoodNutrition } = require("../services/usdaService");

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
		console.error(`[Nutrition API] USDA fetch failed for "${foodName}"`, error);

		return res.status(503).json({
			message: NUTRITION_UNAVAILABLE_MESSAGE,
		});
	}
}

module.exports = {
	getNutritionByFood,
};
