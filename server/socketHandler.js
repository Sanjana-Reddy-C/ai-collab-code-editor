const {
  joinRoom,
  leaveRoom,
  updateCode,
  updateLanguage,
  getRoomState,
  getRoomUsers,
  getRoomAnalytics
} = require('./roomManager');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`\n [Socket] New connection: ${socket.id}`);

    socket.on('join-room', ({ roomId, username }) => {
      if (!roomId || !username) {
        socket.emit('error', { message: 'roomId and username are required' });
        return;
      }

      // Store on socket for cleanup on disconnect
      socket.roomId = roomId;
      socket.username = username;

      // Register in Socket.io's internal room (enables broadcasting)
      socket.join(roomId);

      // Register in our room manager (tracks state)
      const room = joinRoom(roomId, socket.id, username);

      // Send FULL current state to the new joiner ONLY
      
      socket.emit('load-state', {
        code: room.code,
        language: room.language,
        users: getRoomUsers(roomId)
      });

      //Tell EVERYONE ELSE a new user arrived
     
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        username,
        color: room.users.get(socket.id)?.color,
        users: getRoomUsers(roomId)
      });

      console.log(`[Socket] ${username} joined room ${roomId} | Users: ${room.users.size}`);
    });

    
    socket.on('code-change', ({ roomId, code }) => {
      if (!roomId || code === undefined) return;

      // Persist latest code in memory 
      updateCode(roomId, code, socket.id);

      // Broadcast to everyone EXCEPT sender 
      socket.to(roomId).emit('code-update', { code, socketId: socket.id });
    });

    
    socket.on('cursor-move', ({ roomId, position, selection }) => {
      // position = { lineNumber, column }
      // selection = { start: {line, col}, end: {line, col} } | null
      socket.to(roomId).emit('cursor-update', {
        socketId: socket.id,
        username: socket.username,
        position,
        selection
      });
    });

    
    socket.on('language-change', ({ roomId, language }) => {
      updateLanguage(roomId, language);
      // Tell EVERYONE (including sender) to switch their editor mode
      io.to(roomId).emit('language-changed', { language, changedBy: socket.username });
    });

    //chat message
    socket.on('chat-message', ({ roomId, message }) => {
      if (!message?.trim()) return;

      const chatData = {
        socketId: socket.id,
        username: socket.username,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };

      // Send to ALL users in room 
      io.to(roomId).emit('chat-message', chatData);
    });

    //request analytics
    socket.on('get-analytics', ({ roomId }) => {
      const analytics = getRoomAnalytics(roomId);
      socket.emit('analytics-update', analytics);
    });

   //disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] ${socket.username || socket.id} disconnected: ${reason}`);

      if (socket.roomId) {
        const user = leaveRoom(socket.roomId, socket.id);

        if (user) {
          // Tell remaining users someone left
          socket.to(socket.roomId).emit('user-left', {
            socketId: socket.id,
            username: user.username,
            users: getRoomUsers(socket.roomId)
          });

          // Remove their cursor from other screens
          socket.to(socket.roomId).emit('cursor-remove', {
            socketId: socket.id
          });
        }
      }
    });

    
    //log all the events
    socket.onAny((eventName, ...args) => {
      if (eventName !== 'code-change') { 
        console.log(`📡 [Event] ${eventName} from ${socket.username || socket.id}`);
      }
    });
  });
}

module.exports = { setupSocketHandlers };