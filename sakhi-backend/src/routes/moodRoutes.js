const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { addMoodEntry, getMoodEntries } = require("../controllers/moodController");

const router = express.Router();

router.use(authMiddleware);
router.post("/", addMoodEntry);
router.get("/", getMoodEntries);

module.exports = router;
