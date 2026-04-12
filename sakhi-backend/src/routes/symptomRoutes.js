const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { addSymptomEntry, getSymptomEntries } = require("../controllers/symptomController");

const router = express.Router();

router.use(authMiddleware);
router.post("/", addSymptomEntry);
router.get("/", getSymptomEntries);

module.exports = router;