const Room = require("../models/Room");
const { v4: uuidv4 } = require("uuid");

// 🏠 CREATE ROOM
const createRoom = async (req, res) => {
  try {
    const roomId = uuidv4();

    const room = await Room.create({
      roomId,
      users: [req.user],
      createdBy: req.user,
    });

    res.status(201).json({
      message: "Room created",
      room,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ➕ JOIN ROOM
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        message: "Room ID is required",
      });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    // ✅ use schema method (prevents duplicates)
    room.addUser(req.user);

    await room.save();

    res.status(200).json({
      message: "Joined room",
      room,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 🚪 LEAVE ROOM
const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        message: "Room ID is required",
      });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    room.users = room.users.filter(
      (u) => u.toString() !== req.user
    );

    await room.save();

    res.status(200).json({
      message: "Left room",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 👥 GET USERS IN ROOM (VERY IMPORTANT)
const getUsersInRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId }).populate("users", "-password");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.status(200).json({
      users: room.users,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getUsersInRoom,
};