const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { joinRoom, leaveRoom, updateCode, getRoomCode, getRoomUserCount } = require('./roomManager');

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

    const room = joinRoom(roomId, socket.id);

    // Send existing code to the NEW user only (not everyone)
    socket.emit('load-code', { code: room.code });

    // Tell EVERYONE in the room a new user arrived
    io.to(roomId).emit('user-joined', {
      username,
      userCount: getRoomUserCount(roomId)
    });

    console.log(`👤 ${username} joined room: ${roomId}`);
  });

  // 2. User types something — THIS IS THE CORE SYNC EVENT
  socket.on('code-change', ({ roomId, code }) => {
    // Save latest code in server memory
    updateCode(roomId, code);

  
    socket.to(roomId).emit('code-update', { code });
  });

  // 3. Cursor position (bonus: shows where others are editing)
  socket.on('cursor-move', ({ roomId, position, username }) => {
    socket.to(roomId).emit('cursor-update', { socketId: socket.id, position, username });
  });

  // 4. User disconnects
  socket.on('disconnect', () => {
    if (socket.roomId) {
      leaveRoom(socket.roomId, socket.id);
      io.to(socket.roomId).emit('user-left', {
        username: socket.username,
        userCount: getRoomUserCount(socket.roomId)
      });
      console.log(`❌ ${socket.username} left room: ${socket.roomId}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));