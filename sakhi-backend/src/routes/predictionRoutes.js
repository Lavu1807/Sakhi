const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getPrediction } = require("../controllers/predictionController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getPrediction);

module.exports = router;
