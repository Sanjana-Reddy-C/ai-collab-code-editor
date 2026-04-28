const rooms = new Map();
//cursor colors
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#82E0AA', '#F0B27A'
];
let colorIndex = 0;
function getNextColor() {
  const color = USER_COLORS[colorIndex % USER_COLORS.length];
  colorIndex++;
  return color;
}

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      code: '// Start coding here...\n',
      language:'javascript',
      users: new Map(),
      craetedAt: new Date(),
      lastActivity:new Date(),
      analytics:{
        totalEdits:0,
        editsByUser:{}
      }
    });
    console.log(`[Room] Created new room: ${roomId}`);
  }
  return rooms.get(roomId);
}

function joinRoom(roomId, socketId,username) {
  const room = getOrCreateRoom(roomId);
  const userColor=getNextColor();
  room.users.set(socketId ,{
    username,
    color:userColor,
    joinedAt:new Date(),
    lastActive:new Date(),
    editsCount:0
  });
  room.lastActivity= new Date();
  console.log(`[Room] ${username} (${socketId}) joined room: ${roomId}`);
  return room;
}

function leaveRoom(roomId, socketId) {
  if (!rooms.has(roomId)) return null;
  const room = rooms.get(roomId);
  const user=room.users.get(socketId);
  if(user){
    room.users.delete(socketId);
    console.log(`[Room] ${user.username} left room: ${roomId} `);
  }
  
  // Clean up empty rooms to save memory
  if (room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`[Room] Room ${roomId} deleted (empty)`);
  }
  return user;
}

function updateCode(roomId, code,socketId) {
  if (!rooms.has(roomId)) return;
  const room=rooms.get(roomId);
  room.code=code;
  room.lastActivity= new Date();
  // to track the edit counts
  room.analytics.totalEdits++;
  if (socketId) {
    if (!room.analytics.editsByUser[socketId]) {
      room.analytics.editsByUser[socketId] = 0;
    }
    room.analytics.editsByUser[socketId]++;

    // Also update on user object
    if (room.users.has(socketId)) {
      room.users.get(socketId).editsCount++;
      room.users.get(socketId).lastActive = new Date();
    }
  }

}

function updateLanguage(roomId,language){
  if(!rooms.has(roomId)) return;
  rooms.get(roomId).language = language;
}
function getRoomState(roomId) {
  if (!rooms.has(roomId)) return null;
  const room = rooms.get(roomId);
  return {
    code: room.code,
    language: room.language,
    users: getRoomUsers(roomId),
    userCount: room.users.size
  };
}

function getRoomUsers(roomId) {
  if (!rooms.has(roomId)) return [];
  const room = rooms.get(roomId);
  return Array.from(room.users.entries()).map(([socketId, user]) => ({
    socketId,
    username: user.username,
    color: user.color,
    joinedAt: user.joinedAt,
    editsCount: user.editsCount
  }));
}

function getRoomAnalytics(roomId) {
  if (!rooms.has(roomId)) return null;
  const room = rooms.get(roomId);
  const users = getRoomUsers(roomId);

  const totalEdits = room.analytics.totalEdits || 1; // avoid div by 0

  return {
    roomId,
    totalEdits,
    userCount: room.users.size,
    sessionDuration: Math.floor((new Date() - room.createdAt) / 1000), // seconds
    users: users.map(u => ({
      ...u,
      contributionPercent: Math.round((u.editsCount / totalEdits) * 100)
    }))
  };
}

function getAllRooms() {
  return Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    userCount: room.users.size,
    lastActivity: room.lastActivity,
    language: room.language
  }));
}

module.exports = {
  joinRoom,
  leaveRoom,
  updateCode,
  updateLanguage,
  getRoomState,
  getRoomUsers,
  getRoomAnalytics,
  getAllRooms
};


