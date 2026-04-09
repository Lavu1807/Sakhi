const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { addCycleEntry, getCycleHistory } = require("../controllers/cycleController");

const router = express.Router();

router.use(authMiddleware);
router.post("/", addCycleEntry);
router.get("/", getCycleHistory);

module.exports = router;
