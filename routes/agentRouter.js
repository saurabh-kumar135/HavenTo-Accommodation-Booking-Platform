const express = require("express");
const agentController = require("../controllers/agentController");

const router = express.Router();

// POST /api/agent/chat — Send a message to the HavenTo AI agent
router.post("/chat", agentController.postChat);

module.exports = router;
