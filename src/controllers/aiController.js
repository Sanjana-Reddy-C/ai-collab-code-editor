const { analyzeCode } = require("../../services/aiService");
const AIReview = require("../models/AIReview");
const User = require("../models/User");

// =========================
// AI CODE ANALYSIS
// =========================

const analyzeCodeController = async (req, res) => {
  try {
    const { code, roomId } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        message: "Code is required"
      });
    }

    if (!roomId) {
      return res.status(400).json({
        message: "Room ID is required"
      });
    }

    const user = await User.findById(req.user)
      .select("username");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const result = await analyzeCode(code);

    if (result && result.aiResponse) {
      await AIReview.create({
        username: user.username,
        roomId: String(roomId),
        aiResponse: result.aiResponse,
        reviewType: "code-review",
        status: "completed"
      });
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error("AI Controller Error:", err);

    return res.status(500).json({
      message: "AI analysis failed"
    });
  }
};

module.exports = {
  analyzeCodeController
};