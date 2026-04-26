const express = require("express");
const authMiddleware = require('../../shared/middleware/auth.middleware');
const { addDailyLog, getDailyLogs } = require('./dailyLog.controller');

const router = express.Router();

router.use(authMiddleware);
router.post("/", addDailyLog);
router.get("/", getDailyLogs);

module.exports = router;
