const express = require("express");
const { postChatMessage } = require("../controllers/chatController");

const router = express.Router();

router.post("/", postChatMessage);

module.exports = router;
