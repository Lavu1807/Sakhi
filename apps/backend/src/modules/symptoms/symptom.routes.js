const express = require("express");
const authMiddleware = require('../../shared/middleware/auth.middleware');
const { addSymptomEntry, getSymptomEntries } = require('./symptom.controller');

const router = express.Router();

router.use(authMiddleware);
router.post("/", addSymptomEntry);
router.get("/", getSymptomEntries);

module.exports = router;