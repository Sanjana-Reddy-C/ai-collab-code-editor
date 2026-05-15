const CodeLog = require("../models/CodeLog");


// =========================
// CONTRIBUTION STATS
// =========================
const getContributionStats = async () => {

  const stats = await CodeLog.aggregate([

    {
      $group: {
        _id: "$userId",
        totalEdits: { $sum: 1 }
      }
    },

    {
      $sort: {
        totalEdits: -1
      }
    }

  ]);

  return stats;
};
const Session = require("../models/Session");

const EventLog = require("../models/EventLog");


// =========================
// ROOM ANALYTICS
// =========================
const getRoomStats = async () => {

  // edits grouped by room
  const roomEdits = await CodeLog.aggregate([

    {
      $group: {
        _id: "$roomId",
        totalEdits: { $sum: 1 }
      }
    },

    {
      $sort: {
        totalEdits: -1
      }
    }

  ]);


  // messages grouped by room
  const roomMessages = await EventLog.aggregate([

    {
      $match: {
        event: "chat-message"
      }
    },

    {
      $group: {
        _id: "$roomId",
        totalMessages: { $sum: 1 }
      }
    }

  ]);


  return {
    roomEdits,
    roomMessages
  };

};

// =========================
// USER ACTIVITY ANALYTICS
// =========================
const getUserActivityStats = async () => {

  // total edits per user
  const edits = await CodeLog.aggregate([

    {
      $group: {
        _id: "$userId",
        totalEdits: { $sum: 1 }
      }
    }

  ]);


  // total messages per user
  const messages = await EventLog.aggregate([

    {
      $match: {
        event: "chat-message"
      }
    },

    {
      $group: {
        _id: "$userId",
        totalMessages: { $sum: 1 }
      }
    }

  ]);


  // total events per user
  const events = await EventLog.aggregate([

    {
      $group: {
        _id: "$userId",
        totalEvents: { $sum: 1 }
      }
    }

  ]);


  return {
    edits,
    messages,
    events
  };

};

// =========================
// ROOM USER CONTRIBUTIONS
// =========================
const getRoomContributionStats = async (roomId) => {

  const stats = await CodeLog.aggregate([

    {
      $match: {
        roomId: roomId
      }
    },

    {
      $group: {
        _id: "$userId",
        totalEdits: { $sum: 1 }
      }
    },

    {
      $sort: {
        totalEdits: -1
      }
    }

  ]);

  return stats;

};

// =========================
// SESSION ANALYTICS
// =========================
const getSessionStats = async () => {

  // total sessions
  const totalSessions = await Session.countDocuments();

  // active sessions
  const activeSessions = await Session.countDocuments({
    endTime: null
  });

  // completed sessions
  const completedSessions = await Session.countDocuments({
    endTime: { $ne: null }
  });

  // fetch completed sessions
  const sessions = await Session.find({
    endTime: { $ne: null }
  });

  let totalDuration = 0;

  sessions.forEach((session) => {

    const start = new Date(session.startTime).getTime();

    const end = new Date(session.endTime).getTime();

    totalDuration += (end - start);

  });

  // average duration in seconds
  const averageSessionDuration =
    sessions.length > 0
      ? Math.floor(totalDuration / sessions.length / 1000)
      : 0;

  return {
    totalSessions,
    activeSessions,
    completedSessions,
    averageSessionDuration
  };

};

module.exports = {
  getContributionStats,
  getSessionStats,
  getRoomStats,
  getUserActivityStats,
  getRoomContributionStats
};