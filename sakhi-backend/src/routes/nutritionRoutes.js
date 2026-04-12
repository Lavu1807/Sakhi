const express = require("express");
const { getNutritionByFood } = require("../controllers/nutritionController");

const router = express.Router();

// USDA nutrition endpoint: fetch normalized nutrition values for a single food.
router.get("/:food", getNutritionByFood);

module.exports = router;
