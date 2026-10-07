const express = require("express");
const router = express.Router();

const {
  createRoom,
  joinRoom,
  getPendingRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getJoinRequestStatus,
  leaveRoom,
  getUsersInRoom,
} = require("../controllers/roomController");

const protect = require("../middleware/authMiddleware");

// 🔒 apply auth to all routes
router.use(protect);

// 🏠 Room APIs
router.post("/create", createRoom);
router.post("/join", joinRoom);
router.get("/:roomId/request-status", getJoinRequestStatus);
router.get("/:roomId/requests", getPendingRequests);
router.post("/approve", approveJoinRequest);
router.post("/reject", rejectJoinRequest);
router.post("/leave", leaveRoom);
router.get("/:roomId/users", getUsersInRoom);

module.exports = router;