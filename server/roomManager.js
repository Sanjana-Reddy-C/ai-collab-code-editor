const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      code: '// Start coding here...\n',
      users: new Set()
    });
  }
  return rooms.get(roomId);
}

function joinRoom(roomId, socketId) {
  const room = getOrCreateRoom(roomId);
  room.users.add(socketId);
  return room;
}

function leaveRoom(roomId, socketId) {
  if (!rooms.has(roomId)) return;
  const room = rooms.get(roomId);
  room.users.delete(socketId);
  // Clean up empty rooms to save memory
  if (room.users.size === 0) {
    rooms.delete(roomId);
  }
}

function updateCode(roomId, newCode) {
  if (!rooms.has(roomId)) return;
  rooms.get(roomId).code = newCode;
}

function getRoomCode(roomId) {
  return rooms.has(roomId) ? rooms.get(roomId).code : '';
}

function getRoomUserCount(roomId) {
  return rooms.has(roomId) ? rooms.get(roomId).users.size : 0;
}

module.exports = { joinRoom, leaveRoom, updateCode, getRoomCode, getRoomUserCount };