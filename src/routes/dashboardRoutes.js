const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const User = require("../models/User");
const Room = require("../models/Room");
const AIReview = require("../models/AIReview");
const CodeLog = require("../../models/CodeLog");
const Session = require("../../models/Session");
const EventLog = require("../../models/EventLog");

// =====================================================
// PERSONAL USER DASHBOARD
// =====================================================

router.get("/me", protect, async (req, res) => {
  try {
    // -----------------------------------------
    // 1. GET LOGGED-IN USER
    // -----------------------------------------

    const user = await User.findById(req.user).select(
      "username email createdAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const username = user.username;

    // -----------------------------------------
    // 2. GET CURRENTLY ACTIVE ROOMS
    // -----------------------------------------

    // A room is Active only when it has
    // at least one session that has not ended.
    const activeRoomSessions = await Session.find({
      endTime: null,
    })
      .select("roomId")
      .lean();

    const activeRoomIds = new Set(
      activeRoomSessions.map((session) =>
        String(session.roomId)
      )
    );

    // -----------------------------------------
    // 3. GET USER'S ROOMS
    // -----------------------------------------

    const rooms = await Room.find({
      $or: [
        { createdBy: user._id },
        { users: user._id },
      ],
    })
      .populate("users", "username")
      .lean();

    // -----------------------------------------
    // 4. ROOM DETAILS
    // -----------------------------------------

    const roomDetails = [];

    for (const room of rooms) {
      const isHost =
        room.createdBy &&
        room.createdBy.toString() ===
          user._id.toString();

      // -----------------------------------------
      // Edits made by this user in this room
      // -----------------------------------------

      const editData = await CodeLog.aggregate([
        {
          $match: {
            roomId: room.roomId,
            userId: username,
          },
        },
        {
          $group: {
            _id: null,
            totalEdits: {
              $sum: "$changeSize",
            },
          },
        },
      ]);

      const totalEdits =
        editData.length > 0
          ? editData[0].totalEdits
          : 0;

      // -----------------------------------------
      // All edits in this room
      // -----------------------------------------

      const roomTotalData = await CodeLog.aggregate([
        {
          $match: {
            roomId: room.roomId,
          },
        },
        {
          $group: {
            _id: null,
            totalEdits: {
              $sum: "$changeSize",
            },
          },
        },
      ]);

      const roomTotalEdits =
        roomTotalData.length > 0
          ? roomTotalData[0].totalEdits
          : 0;

      // -----------------------------------------
      // Contribution percentage
      // -----------------------------------------

      const contributionPercentage =
        roomTotalEdits === 0
          ? "0.0"
          : (
              (totalEdits / roomTotalEdits) *
              100
            ).toFixed(1);

      // -----------------------------------------
      // Sessions involving this user
      // -----------------------------------------

      const sessions = await Session.find({
        roomId: String(room.roomId),
        users: username,
      }).lean();

      let totalSessionMinutes = 0;

      sessions.forEach((session) => {
        const start =
          session.startTime ||
          session.createdAt;

        const end =
          session.endTime ||
          new Date();

        const durationMs =
          new Date(end) -
          new Date(start);

        totalSessionMinutes += Math.max(
          0,
          Math.floor(durationMs / 60000)
        );
      });

      // -----------------------------------------
      // Store room details
      // -----------------------------------------

      roomDetails.push({
        roomId: room.roomId,

        role: isHost
          ? "Host"
          : "Participant",

        createdAt: room.createdAt,

        // Active = at least one active session
        isActive: activeRoomIds.has(
          String(room.roomId)
        ),

        members: room.users.map(
          (member) => member.username
        ),

        memberCount: room.users.length,

        edits: totalEdits,

        roomTotalEdits,

        contributionPercentage,

        sessions: sessions.length,

        sessionMinutes:
          totalSessionMinutes,
      });
    }

    // -----------------------------------------
    // 5. PERSONAL CODE ANALYTICS
    // -----------------------------------------

    const personalEditData =
      await CodeLog.aggregate([
        {
          $match: {
            userId: username,
          },
        },
        {
          $group: {
            _id: null,

            totalEdits: {
              $sum: "$changeSize",
            },

            editCount: {
              $sum: 1,
            },
          },
        },
      ]);

    const totalEdits =
      personalEditData.length > 0
        ? personalEditData[0].totalEdits
        : 0;

    const editCount =
      personalEditData.length > 0
        ? personalEditData[0].editCount
        : 0;

    // -----------------------------------------
    // 6. PERSONAL SESSIONS
    // -----------------------------------------

    const personalSessions =
      await Session.find({
        users: username,
      })
        .sort({ startTime: -1 })
        .lean();

    let totalSessionMinutes = 0;

    let activeSessions = 0;

    const sessionDetails =
      personalSessions.map((session) => {
        const start =
          session.startTime ||
          session.createdAt;

        const end =
          session.endTime ||
          new Date();

        const durationMs =
          new Date(end) -
          new Date(start);

        const minutes = Math.max(
          0,
          Math.floor(durationMs / 60000)
        );

        totalSessionMinutes += minutes;

        if (!session.endTime) {
          activeSessions++;
        }

        return {
          roomId: session.roomId,

          startTime: start,

          endTime: session.endTime,

          durationMinutes: minutes,

          status: session.endTime
            ? "Ended"
            : "Active",
        };
      });

    // -----------------------------------------
    // 7. PERSONAL ACTIVITY
    // -----------------------------------------

    const activity =
      await EventLog.find({
        username: username,
      })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

    const activityDetails =
      activity.map((event) => ({
        event: event.event,

        roomId: event.roomId,

        timestamp: event.timestamp,

        payload: event.payload || {},
      }));

    // -----------------------------------------
    // 8. ROLE COUNTS
    // -----------------------------------------

    const roomsCreated =
      roomDetails.filter(
        (room) => room.role === "Host"
      ).length;

    const roomsParticipated =
      roomDetails.filter(
        (room) =>
          room.role === "Participant"
      ).length;

    // -----------------------------------------
    // 9. FINAL RESPONSE
    // -----------------------------------------

    res.status(200).json({
      user: {
        id: user._id,

        username: user.username,

        email: user.email,

        joinedAt: user.createdAt,
      },

      overview: {
        totalRooms:
          roomDetails.length,

        roomsCreated,

        roomsParticipated,

        totalEdits,

        editCount,

        totalSessionMinutes,

        totalSessions:
          personalSessions.length,

        activeSessions,
      },

      rooms: roomDetails,

      sessions: sessionDetails,

      activity: activityDetails,
    });
  } catch (error) {
    console.error(
      "PERSONAL DASHBOARD ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load dashboard",
    });
  }
});
// =====================================================
// PERSONAL AI INSIGHTS
// =====================================================

router.get("/ai-insights", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user)
      .select("username")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const username = user.username;

    // -----------------------------------------
    // 1. ALL COMPLETED REVIEWS
    // -----------------------------------------

    const totalReviews = await AIReview.countDocuments({
      username,
      status: "completed"
    });

    // -----------------------------------------
    // 2. REVIEWS THIS WEEK
    // -----------------------------------------

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const reviewsThisWeek = await AIReview.countDocuments({
      username,
      status: "completed",
      createdAt: {
        $gte: weekStart
      }
    });

    // -----------------------------------------
    // 3. ROOMS REVIEWED
    // -----------------------------------------

    const reviewedRooms = await AIReview.distinct(
      "roomId",
      {
        username,
        status: "completed"
      }
    );

    // -----------------------------------------
    // 4. LATEST REVIEW
    // -----------------------------------------

    const latestReview = await AIReview.findOne({
      username,
      status: "completed"
    })
      .sort({ createdAt: -1 })
      .lean();

    // -----------------------------------------
    // 5. RECENT AI ACTIVITY
    // -----------------------------------------

    const recentReviews = await AIReview.find({
      username,
      status: "completed"
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "roomId aiResponse reviewType status createdAt"
      )
      .lean();

    // -----------------------------------------
    // 6. REVIEWS BY ROOM
    // -----------------------------------------

    const reviewsByRoom = await AIReview.aggregate([
      {
        $match: {
          username,
          status: "completed"
        }
      },
      {
        $group: {
          _id: "$roomId",
          reviews: {
            $sum: 1
          },
          latestReview: {
            $max: "$createdAt"
          }
        }
      },
      {
        $sort: {
          reviews: -1
        }
      }
    ]);

    // -----------------------------------------
    // 7. FINAL RESPONSE
    // -----------------------------------------

    return res.status(200).json({
      overview: {
        totalReviews,
        roomsReviewed: reviewedRooms.length,
        reviewsThisWeek
      },

      latestReview: latestReview
        ? {
            roomId: latestReview.roomId,
            reviewType: latestReview.reviewType,
            aiResponse: latestReview.aiResponse,
            createdAt: latestReview.createdAt
          }
        : null,

      recentReviews,

      reviewsByRoom: reviewsByRoom.map((room) => ({
        roomId: room._id,
        reviews: room.reviews,
        latestReview: room.latestReview
      }))
    });

  } catch (error) {
    console.error(
      "AI INSIGHTS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Unable to load AI insights"
    });
  }
});

module.exports = router;