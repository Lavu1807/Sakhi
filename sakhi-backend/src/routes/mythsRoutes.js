const express = require("express");
const { getMyths, getRandomMythEntry, addMythFeedback } = require("../controllers/mythsController");

const router = express.Router();

router.post("/feedback", addMythFeedback);
router.get("/random", getRandomMythEntry);
router.get("/", getMyths);

module.exports = router;