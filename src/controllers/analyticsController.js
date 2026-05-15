const {
  getContributionStats,
  getSessionStats,
  getRoomStats,
  getUserActivityStats,
  getRoomContributionStats
} = require("../../services/analyticsService");


// =========================
// CONTRIBUTION ANALYTICS
// =========================
const contributionAnalytics = async (req, res) => {

  try {

    const stats = await getContributionStats();

    res.json(stats);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


// =========================
// SESSION ANALYTICS
// =========================
const sessionAnalytics = async (req, res) => {

  try {

    const stats = await getSessionStats();

    res.json(stats);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


// =========================
// ROOM ANALYTICS
// =========================
const roomAnalytics = async (req, res) => {

  try {

    const stats = await getRoomStats();

    res.json(stats);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


// =========================
// USER ACTIVITY ANALYTICS
// =========================
const userActivityAnalytics = async (req, res) => {

  try {

    const stats = await getUserActivityStats();

    res.json(stats);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


// =========================
// ROOM CONTRIBUTION ANALYTICS
// =========================
const roomContributionAnalytics = async (req, res) => {

  try {

    const { roomId } = req.params;

    const stats = await getRoomContributionStats(roomId);

    res.json(stats);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};


module.exports = {
  contributionAnalytics,
  sessionAnalytics,
  roomAnalytics,
  userActivityAnalytics,
  roomContributionAnalytics
};