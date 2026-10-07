const Room = require("../models/Room");
const crypto = require("crypto");
// =========================================
// CREATE ROOM
// =========================================

const createRoom = async (req, res) => {
  try {
    const roomId = crypto.randomBytes(4).toString("hex").toUpperCase();
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
    console.error("Create room error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// =========================================
// REQUEST TO JOIN ROOM
// =========================================

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

    // Already a member
    if (
      room.users.some(
        (userId) => userId.toString() === req.user
      )
    ) {
      return res.status(400).json({
        message: "You are already a member of this room",
      });
    }

    // Already requested
    if (
      room.pendingRequests.some(
        (userId) => userId.toString() === req.user
      )
    ) {
      return res.status(400).json({
        message: "Join request already sent",
      });
    }

    // Add user to pending requests
    room.pendingRequests.push(req.user);

    await room.save();

    res.status(200).json({
      message: "Join request sent",
    });

  } catch (err) {
    console.error("Join room error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// =========================================
// APPROVE JOIN REQUEST
// =========================================

const approveJoinRequest = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({
        message: "Room ID and User ID are required",
      });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }
    
    // Only host can approve
if (String(room.createdBy) !== String(req.user)) {
        return res.status(403).json({
        message: "Only the host can approve requests",
      });
    }

    // Check request exists
    const requestIndex = room.pendingRequests.findIndex(
      (id) => id.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        message: "Join request not found",
      });
    }

    // Remove from pending requests
    room.pendingRequests.splice(requestIndex, 1);

    // Add to room members
    if (
      !room.users.some(
        (id) => id.toString() === userId
      )
    ) {
      room.users.push(userId);
    }

    await room.save();

    res.status(200).json({
      message: "Join request approved",
    });

  } catch (err) {
    console.error("Approve request error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// =========================================
// REJECT JOIN REQUEST
// =========================================

const rejectJoinRequest = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({
        message: "Room ID and User ID are required",
      });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    // Only host can reject
    if (String(room.createdBy) !== String(req.user)) {
        return res.status(403).json({
        message: "Only the host can reject requests",
      });
    }

    const requestIndex = room.pendingRequests.findIndex(
      (id) => id.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        message: "Join request not found",
      });
    }

    // Remove request
    room.pendingRequests.splice(requestIndex, 1);

    await room.save();

    res.status(200).json({
      message: "Join request rejected",
    });

  } catch (err) {
    console.error("Reject request error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// =========================================
// LEAVE ROOM
// =========================================

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
      (userId) => userId.toString() !== req.user
    );

    await room.save();

    res.status(200).json({
      message: "Left room",
    });

  } catch (err) {
    console.error("Leave room error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// =========================================
// GET USERS IN ROOM
// =========================================

const getUsersInRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate("users", "-password");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.status(200).json({
      users: room.users,
    });

  } catch (err) {
    console.error("Get users error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};
const getPendingRequests = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate("pendingRequests", "username email");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    // Only the room host can see pending requests
    if (String(room.createdBy) !== String(req.user)) {    
        return res.status(403).json({
        message: "Only the room host can view join requests",
      });
    }

    res.status(200).json({
      requests: room.pendingRequests,
    });
  } catch (err) {
    console.error("Get pending requests error:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
};
// CHECK JOIN REQUEST STATUS
const getJoinRequestStatus = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }

    const userId = String(req.user);

    // User has been approved
    const isApproved = room.users.some(
      (id) => id.toString() === userId
    );

    if (isApproved) {
      return res.status(200).json({
        status: "approved"
      });
    }

    // Request is still waiting
    const isPending = room.pendingRequests.some(
      (id) => id.toString() === userId
    );

    if (isPending) {
      return res.status(200).json({
        status: "pending"
      });
    }

    // If the request was previously pending but is now gone,
    // the requester can treat this as rejected.
    return res.status(200).json({
      status: "rejected"
    });

  } catch (err) {
    console.error("Join request status error:", err);

    res.status(500).json({
      message: "Server error"
    });
  }
};

// =========================================
// EXPORT
// =========================================

module.exports = {
  createRoom,
  joinRoom,
  getPendingRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getJoinRequestStatus,
  leaveRoom,
  getUsersInRoom,
};