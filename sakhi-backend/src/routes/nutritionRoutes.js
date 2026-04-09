const express = require("express");
const { getNutritionByFood } = require("../controllers/nutritionController");

const router = express.Router();

router.get("/:food", getNutritionByFood);

module.exports = router;
