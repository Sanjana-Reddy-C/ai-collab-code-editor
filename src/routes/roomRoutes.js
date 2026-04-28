const express = require("express");
const router = express.Router();

const {
  createRoom,
  joinRoom,
  leaveRoom,
  getUsersInRoom,
} = require("../controllers/roomController");

const protect = require("../middleware/authMiddleware");

// 🔒 apply auth to all routes
router.use(protect);

// 🏠 Room APIs
router.post("/create", createRoom);
router.post("/join", joinRoom);
router.post("/leave", leaveRoom);

// 👥 Get users in room
router.get("/:roomId/users", getUsersInRoom);

module.exports = router;