const express = require("express");
const authMiddleware = require('../../shared/middleware/auth.middleware');
const { getPrediction } = require('./prediction.controller');

const router = express.Router();

router.use(authMiddleware);
router.get("/", getPrediction);

module.exports = router;
