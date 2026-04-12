const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { addCycleEntry, markPeriodEnd, getCycleStatus, getCycleHistory } = require("../controllers/cycleController");

const router = express.Router();

router.use(authMiddleware);
router.post("/", addCycleEntry);
router.patch("/end", markPeriodEnd);
router.get("/status", getCycleStatus);
router.get("/", getCycleHistory);

module.exports = router;
