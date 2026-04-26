const express = require("express");
const { postChatMessage } = require('./chat.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

const router = express.Router();
const { optionalAuthMiddleware } = authMiddleware;

router.post("/", optionalAuthMiddleware, postChatMessage);

module.exports = router;
