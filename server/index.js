const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const aiRoutes = require("./routes/aiRoutes");

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});

const connectDB = require("../src/config/db");

connectDB();

// ROOM MANAGER
const {
  joinRoom,
  leaveRoom,
  updateCode,
  getRoomState
} = require('./roomManager');

// LOG SERVICES
const {
  saveCodeChange,
  logEvent,
  startSession,
  endSession
} = require('../services/logService');

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ============================
// HEALTH CHECK
// ============================

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============================
// SOCKET CONNECTION
// ============================

io.on('connection', (socket) => {

  console.log(` User connected: ${socket.id}`);

  // ============================
  // JOIN ROOM
  // ============================

  socket.on('join-room', async ({ roomId, username }) => {

    socket.join(roomId);

    socket.roomId = roomId;
    socket.username = username;

    // Join memory room
    joinRoom(roomId, socket.id, username);

    // Get room state
    const roomState = getRoomState(roomId);

    // Send existing code
    socket.emit('load-code', {
      code: roomState.code,
      language: roomState.language
    });

    // Broadcast joined
    io.to(roomId).emit('user-joined', {
      username,
      userCount: roomState.userCount
    });

    console.log(` ${username} joined room: ${roomId}`);

    // ============================
    // START SESSION
    // ============================

    await startSession(roomId, username);

    // ============================
    // LOG EVENT
    // ============================

    await logEvent({
      event: 'USER_JOINED',
      roomId,
      userId: socket.id,
      username
    });

  });

  // ============================
  // CODE CHANGE
  // ============================

  socket.on('code-change', async ({ roomId, code, username }) => {

    // Update room state
    updateCode(roomId, code, socket.id);

    // Send to others
    socket.to(roomId).emit('code-update', { code });

    // ============================
    // SAVE CODE LOG
    // ============================

    await saveCodeChange({
      roomId,
      userId: username,
      code,
      changeType: 'edit'
    });

    // ============================
    // SAVE EVENT
    // ============================

    await logEvent({
      event: 'CODE_CHANGED',
      roomId,
      userId: username,
      username
    });

    console.log(`Code saved for room ${roomId}`);

  });

  // ============================
  // CURSOR MOVE
  // ============================

  socket.on('cursor-move', ({ roomId, position }) => {

    socket.to(roomId).emit('cursor-update', {
      socketId: socket.id,
      position,
      username: socket.username
    });

  });

  // ============================
  // DISCONNECT
  // ============================

  socket.on('disconnect', async () => {

    if (socket.roomId) {

      const user = leaveRoom(socket.roomId, socket.id);

      const roomState = getRoomState(socket.roomId);

      io.to(socket.roomId).emit('user-left', {
        username: user ? user.username : socket.username,
        userCount: roomState ? roomState.userCount : 0
      });

      console.log(` ${socket.username} left room: ${socket.roomId}`);

      // ============================
      // LOG EVENT
      // ============================

      await logEvent({
        event: 'USER_LEFT',
        roomId: socket.roomId,
        userId: socket.id,
        username: socket.username
      });

      // ============================
      // END SESSION
      // ============================

      await endSession(socket.roomId, socket.username);

    }

  });

});

// ============================
// PISTON RUN CODE API
// ============================

app.post('/run-code', async (req, res) => {

  const { code, language } = req.body;

  console.log('RUN REQUEST:', { language });

  // ============================
  // LANGUAGE CONFIGURATION
  // ============================

  const runtimes = {

    python: {
      language: 'python',
      version: '3.12.0',
      filename: 'main.py'
    },

    javascript: {
      language: 'javascript',
      version: '20.11.1',
      filename: 'main.js'
    },

    cpp: {
      language: 'c++',
      version: '10.2.0',
      filename: 'main.cpp'
    },

    java: {
      language: 'java',
      version: '15.0.2',
      filename: 'Main.java'
    }

  };

  const runtime = runtimes[language];

  // ============================
  // CHECK LANGUAGE
  // ============================

  if (!runtime) {

    return res.status(400).json({
      run: {
        stdout: '',
        stderr: `Unsupported language: ${language}`
      }
    });

  }

  try {

    // ============================
    // PISTON REQUEST
    // ============================

    const requestBody = {
      language: runtime.language,
      version: runtime.version,
      files: [
        {
          name: runtime.filename,
          content: code
        }
      ]
    };

    // ============================
    // JAVA NEEDS MORE TIME
    // ============================

    if (language === 'java') {

      requestBody.compile_timeout = 10000;
      requestBody.run_timeout = 10000;
      requestBody.compile_cpu_time = 10000;
      requestBody.run_cpu_time = 10000;

    }

    console.log('PISTON REQUEST:', requestBody);

    // ============================
    // SEND TO PISTON
    // ============================

    const pistonResponse = await fetch(
      'http://127.0.0.1:2000/api/v2/execute',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(requestBody)
      }
    );

    const result = await pistonResponse.json();

    console.log('PISTON RESULT:', result);

    // ============================
    // RETURN RESULT TO EDITOR
    // ============================

    res.json({

      run: {
        stdout: result.run?.stdout || '',
        stderr:
          result.run?.stderr ||
          result.run?.message ||
          ''
      },

      language: result.language,
      version: result.version

    });

  } catch (error) {

    // ============================
    // PISTON ERROR
    // ============================

    console.error('PISTON ERROR:', error);

    res.status(500).json({

      run: {
        stdout: '',
        stderr: 'Execution error: ' + error.message
      }

    });

  }

});

// ============================
// USERS ANALYTICS API
// ============================

const CodeLog = require("../models/CodeLog");
const Session = require("../models/Session");

app.get("/api/analytics/users", async (req, res) => {

  try {

    // TOTAL EDITS

    const edits = await CodeLog.aggregate([

      {
        $group: {
          _id: "$userId",
          totalEdits: { $sum: 1 },
          rooms: { $addToSet: "$roomId" }
        }
      },

      {
        $sort: {
          totalEdits: -1
        }
      }

    ]);

    // ACTIVE USERS

    const activeSessions =
      await Session.find({ endTime: null });

    const activeUserIds = [];

    activeSessions.forEach(session => {

      session.users.forEach(user => {

        if (!activeUserIds.includes(user)) {
          activeUserIds.push(user);
        }

      });

    });

    // FINAL RESPONSE

    const formattedUsers = edits.map(user => {

      const totalAllEdits =
        edits.reduce((sum, u) => sum + u.totalEdits, 0);

      const percentage =
        totalAllEdits === 0
          ? "0.0"
          : ((user.totalEdits / totalAllEdits) * 100).toFixed(1);

      return {

        username: user._id,

        totalEdits: user.totalEdits,

        contributionPercentage: percentage,

        roomsJoined: user.rooms.length,

        rooms: user.rooms,

        status:
          activeUserIds.includes(user._id)
            ? "Active"
            : "Offline"

      };

    });

    res.json({
      users: formattedUsers
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Analytics Error"
    });

  }

});

// ============================
// ROOMS ANALYTICS API
// ============================

app.get("/api/analytics/rooms", async (req, res) => {

  try {

    // GET ROOM EDIT COUNTS

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

    // FOR EACH ROOM FIND TOP USERS

    const formattedRooms = [];

    for (const room of roomEdits) {

      const topUsers = await CodeLog.aggregate([

        {
          $match: {
            roomId: room._id
          }
        },

        {
          $group: {
            _id: "$userId",
            edits: { $sum: 1 }
          }
        },

        {
          $sort: {
            edits: -1
          }
        },

        {
          $limit: 3
        }

      ]);

      formattedRooms.push({

        roomId: room._id,

        totalEdits: room.totalEdits,

        topContributors: topUsers.map((u, index) => ({

          username: u._id,

          edits: u.edits,

          rank: index + 1

        }))

      });

    }

    res.json({
      rooms: formattedRooms
    });

  } catch (err) {

    console.log("ROOM ANALYTICS ERROR:", err);

    res.status(500).json({
      error: "Rooms analytics failed"
    });

  }

});

// =========================
// SESSIONS ANALYTICS
// =========================

app.get("/api/analytics/sessions", async (req, res) => {

  try {

    const sessions =
      await Session.find();

    const formattedSessions =
      sessions.map(session => {

        const startTime =
          session.startTime || session.createdAt;

        const endTime =
          session.endTime || new Date();

        const durationMs =
          new Date(endTime) -
          new Date(startTime);

        const minutes =
          Math.floor(durationMs / 60000);

        return {

          roomId:
            session.roomId || "Unknown",

          users:
            session.users || [],

          startTime,

          duration:
            `${minutes} min`,

          status:
            session.endTime
              ? "Ended"
              : "Active"

        };

      });

    res.json({

      totalSessions:
        sessions.length,

      activeSessions:
        sessions.filter(
          s => !s.endTime
        ).length,

      sessions:
        formattedSessions

    });

  } catch (err) {

    console.log("SESSION ERROR:", err);

    res.status(500).json({
      error: "Sessions analytics failed"
    });

  }

});

// ============================
// AI ROUTES
// ============================

app.use("/api/ai", aiRoutes);

// ============================
// START SERVER
// ============================

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});