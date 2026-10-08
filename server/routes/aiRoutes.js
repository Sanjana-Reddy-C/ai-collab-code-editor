const express = require("express");

const router = express.Router();

const {
  analyzeCodeController
} = require("../../src/controllers/aiController");

const protect = require("../../src/middleware/authMiddleware");

// =========================
// AI ROUTES
// =========================

router.post(
  "/analyze",
  protect,
  analyzeCodeController
);

module.exports = router;