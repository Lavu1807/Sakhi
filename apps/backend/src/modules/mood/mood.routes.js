const express = require("express");
const authMiddleware = require('../../shared/middleware/auth.middleware');
const { addMoodEntry, getMoodEntries } = require('./mood.controller');

const router = express.Router();

router.use(authMiddleware);
router.post("/", addMoodEntry);
router.get("/", getMoodEntries);

module.exports = router;
