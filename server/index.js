const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');


const {
  joinRoom,
  leaveRoom,
  updateCode,
  getRoomState
} = require('./roomManager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// SOCKET EVENTS
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // 1. User joins a room
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    // UPDATED: pass username
    const room = joinRoom(roomId, socket.id, username);

    // Send existing state to new user
    const roomState = getRoomState(roomId);
    socket.emit('load-code', {
      code: roomState.code,
      language: roomState.language
    });

    // Broadcast user joined
    io.to(roomId).emit('user-joined', {
      username,
      userCount: roomState.userCount
    });

    console.log(`👤 ${username} joined room: ${roomId}`);
  });

  // 2. Code change (core sync)
  socket.on('code-change', ({ roomId, code }) => {
    // UPDATED: pass socket.id for analytics
    updateCode(roomId, code, socket.id);

    socket.to(roomId).emit('code-update', { code });
  });

  // 3. Cursor move
  socket.on('cursor-move', ({ roomId, position }) => {
    socket.to(roomId).emit('cursor-update', {
      socketId: socket.id,
      position,
      username: socket.username
    });
  });

  // 4. User disconnects
  socket.on('disconnect', () => {
    if (socket.roomId) {
      const user = leaveRoom(socket.roomId, socket.id);

      const roomState = getRoomState(socket.roomId);

      io.to(socket.roomId).emit('user-left', {
        username: user ? user.username : socket.username,
        userCount: roomState ? roomState.userCount : 0
      });

      console.log(`❌ ${socket.username} left room: ${socket.roomId}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.post('/run-code', async (req, res) => {
  const { code, language } = req.body;
  console.log("REQUEST BODY:", req.body);

  if (language === 'javascript') {
    // ✅ Find ALL console.log calls, not just the first
    const matches = [...code.matchAll(/console\.log\((["'`])(.*?)\1\)/g)];

    if (matches.length > 0) {
      const output = matches.map(m => m[2]).join('\n') + '\n';
      return res.json({ run: { stdout: output, stderr: "" } });
    }
  }

  res.json({ run: { stdout: "Code executed (mock output)\n", stderr: "" } });
});
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
