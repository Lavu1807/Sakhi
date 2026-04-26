const express = require("express");
const authMiddleware = require('../../shared/middleware/auth.middleware');
const { addCycleEntry, markPeriodEnd, getCycleStatus, getCycleHistory } = require('./cycle.controller');

const router = express.Router();

router.use(authMiddleware);
router.post("/", addCycleEntry);
router.patch("/end", markPeriodEnd);
router.get("/status", getCycleStatus);
router.get("/", getCycleHistory);

module.exports = router;
