const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { processMessage } = require("../services/agentService");

// Resolve user from session or JWT token
async function resolveUser(req) {
  if (req.session?.user?._id) return req.session.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(
        authHeader.split(" ")[1],
        process.env.JWT_SECRET || "havento_mobile_secret_key_2024"
      );
      const user = await User.findById(decoded.userId).select("-password");
      if (user) return user;
    } catch (e) {
      return null;
    }
  }
  return null;
}

exports.postChat = async (req, res) => {
  try {
    const { message, chatHistory } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Resolve user (optional — guest users can still chat & search)
    const user = await resolveUser(req);
    const userId = user ? user._id : null;

    console.log(
      `🤖 Agent request from ${user ? user.firstName : "guest"}: "${message}"`
    );

    // Process message through the AI agent
    const result = await processMessage(message, userId, chatHistory || []);

    res.json({
      success: true,
      reply: result.reply,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Agent error:", error);
    res.status(500).json({
      success: false,
      message: "AI agent encountered an error. Please try again.",
      error: error.message,
    });
  }
};
