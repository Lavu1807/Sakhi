const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { addDailyLog, getDailyLogs } = require("../controllers/dailyLogController");

const router = express.Router();

router.use(authMiddleware);
router.post("/", addDailyLog);
router.get("/", getDailyLogs);

module.exports = router;
