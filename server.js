
const {
 saveCodeChange,
 logEvent,
 startSession,
 endSession
} = require("./services/logService");

const app = require("./src/app");
require("dotenv").config();
const connectDB = require("./src/config/db");

const http = require("http");
const { Server } = require("socket.io");

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const roomUsers = {};

io.on("connection", (socket) => {

  console.log("🔌 User connected:", socket.id);


  // =========================
  // JOIN ROOM
  // =========================
  socket.on("join-room", ({ roomId, userId }) => {

    if (!roomId || !userId) {
      console.log("⚠️ Invalid join request");
      return;
    }

    // log join event
    logEvent({
      event: "join-room",
      roomId,
      userId,
      username: userId,
      payload: {
        socketId: socket.id
      }
    });
    socket.join(roomId);
    startSession(roomId,userId);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

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

    socket.emit("joined-success", roomId);

    io.to(roomId).emit("participants", roomUsers[roomId]);
  });



  // =========================
  // CODE CHANGE
  // =========================
  socket.on("code-change", async ({ roomId, code, userId }) => {

 if(!roomId || !code) return;

 await saveCodeChange({
   roomId,
   userId:userId || socket.id,
   username:userId,
   lineNumber:1,
   previousCode:"",
   code
 });

 socket.to(roomId).emit("code-update",code);

});

  // =========================
  // CHAT MESSAGE
  // =========================
  socket.on("send-message", ({ roomId, message, userId }) => {

  if (!roomId || !message) return;

  console.log(`💬 [${roomId}] ${socket.id}: ${message}`);

  logEvent({
    event: "chat-message",
    roomId,
    userId: userId || socket.id,
    username: userId || socket.id,
    payload: { message }
  });

  io.to(roomId).emit("receive-message", message);

});


  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", () => {

    console.log("❌ User disconnected:", socket.id);

    // log disconnect event
    logEvent({
      event:"disconnect",
      roomId:"unknown",
      userId:socket.id
    });

    for (const roomId in roomUsers) {

      const before = roomUsers[roomId].length;

      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      const after = roomUsers[roomId].length;

      if (before !== after) {
        io.to(roomId).emit("participants", roomUsers[roomId]);
      }

      if (roomUsers[roomId].length === 0) {
        endSession(roomId);

        delete roomUsers[roomId];
      }
    }
  });

});

// CLEAR ALL CODE LOGS
app.get("/clear-codelogs", async(req,res)=>{
 const CodeLog = require("./models/CodeLog");
 await CodeLog.deleteMany({});
 res.send("Code logs cleared");
});


// CLEAR EVENT LOGS
app.get("/clear-events", async(req,res)=>{
 const EventLog = require("./models/EventLog");
 await EventLog.deleteMany({});
 res.send("Event logs cleared");
});


// CLEAR SESSIONS
app.get("/clear-sessions", async(req,res)=>{
 const Session = require("./models/Session");
 await Session.deleteMany({});
 res.send("Sessions cleared");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});