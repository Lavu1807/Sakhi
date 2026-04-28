const express = require("express");
const authMiddleware = require('../../shared/middleware/auth.middleware');
const { addCycleEntry, markPeriodEnd, getCycleStatus, getCycleHistory, updateCycleEntry, deleteCycleEntry } = require('./cycle.controller');

const router = express.Router();

router.use(authMiddleware);
router.post("/", addCycleEntry);
router.patch("/end", markPeriodEnd);
router.patch("/:id", updateCycleEntry);
router.delete("/:id", deleteCycleEntry);
router.get("/status", getCycleStatus);
router.get("/", getCycleHistory);

module.exports = router;
