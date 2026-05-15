const express = require("express");

const router = express.Router();

const {
  contributionAnalytics,
  sessionAnalytics,
  roomAnalytics,
  userActivityAnalytics,
  roomContributionAnalytics
} = require("../controllers/analyticsController");


// =========================
// CONTRIBUTION ANALYTICS
// =========================
router.get("/contributions", contributionAnalytics);


// =========================
// SESSION ANALYTICS
// =========================
router.get("/sessions", sessionAnalytics);


// =========================
// ROOM ANALYTICS
// =========================
router.get("/rooms", roomAnalytics);


// =========================
// USER ACTIVITY ANALYTICS
// =========================
router.get("/users", userActivityAnalytics);


// =========================
// ROOM CONTRIBUTION ANALYTICS
// =========================
router.get(
  "/room/:roomId/contributions",
  roomContributionAnalytics
);


module.exports = router;