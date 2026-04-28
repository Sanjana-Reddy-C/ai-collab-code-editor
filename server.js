const app = require("./src/app");
require("dotenv").config();
const connectDB = require("./src/config/db");

const http = require("http");
const { Server } = require("socket.io");

// 🔗 Connect DB
connectDB();

// 🌐 Create HTTP server
const server = http.createServer(app);

// 🔌 Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔥 In-memory room storage
const roomUsers = {};

// 🔌 SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // 🏠 JOIN ROOM
  socket.on("join-room", ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.log("⚠️ Invalid join request");
      return;
    }

    socket.join(roomId);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    // prevent duplicate
    const exists = roomUsers[roomId].some(
      (u) => u.socketId === socket.id
    );

    if (!exists) {
      roomUsers[roomId].push({
        socketId: socket.id,
        userId,
      });
    }

    console.log(`✅ ${socket.id} joined room: ${roomId}`);

    // 🔥 confirm join
    socket.emit("joined-success", roomId);

    // 👥 update participants
    io.to(roomId).emit("participants", roomUsers[roomId]);
  });

  // ✍️ CODE CHANGE
  socket.on("code-change", ({ roomId, code }) => {
    if (!roomId) return;

    socket.to(roomId).emit("code-update", code);
  });

  // 💬 CHAT MESSAGE
  socket.on("send-message", ({ roomId, message }) => {
    if (!roomId || !message) return;

    console.log(`💬 [${roomId}] ${socket.id}: ${message}`);

    io.to(roomId).emit("receive-message", message);
  });

  // 🚪 DISCONNECT
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    for (const roomId in roomUsers) {
      const before = roomUsers[roomId].length;

      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      const after = roomUsers[roomId].length;

      // only emit if something changed
      if (before !== after) {
        io.to(roomId).emit("participants", roomUsers[roomId]);
      }

      // cleanup empty rooms (important)
      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
    }
  });
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});