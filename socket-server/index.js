require('dotenv/config');
const http = require('node:http');
const { Server } = require('socket.io');

const port = Number(process.env.PORT || process.env.SOCKET_PORT || 10000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const liveRooms = new Map();
const userSockets = new Map();

function emitParticipants(io, roomId) {
  const roomMap = liveRooms.get(roomId);
  io.to(roomId).emit('participants:update', {
    participants: roomMap ? Array.from(roomMap.values()) : []
  });
}

function upsertUserSocket(roomId, userId, socketId) {
  let roomUsers = userSockets.get(roomId);
  if (!roomUsers) {
    roomUsers = new Map();
    userSockets.set(roomId, roomUsers);
  }

  let sockets = roomUsers.get(userId);
  if (!sockets) {
    sockets = new Set();
    roomUsers.set(userId, sockets);
  }

  sockets.add(socketId);
}

function removeUserSocket(roomId, userId, socketId) {
  const roomUsers = userSockets.get(roomId);
  if (!roomUsers) return;

  const sockets = roomUsers.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    roomUsers.delete(userId);
  }
  if (roomUsers.size === 0) {
    userSockets.delete(roomId);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('TalkFluent socket server');
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, participant }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = participant.userId;

    let roomMap = liveRooms.get(roomId);
    if (!roomMap) {
      roomMap = new Map();
      liveRooms.set(roomId, roomMap);
    }

    roomMap.set(socket.id, { ...participant, socketId: socket.id });
    upsertUserSocket(roomId, participant.userId, socket.id);
    emitParticipants(io, roomId);
  });

  socket.on('toggle-mute', ({ roomId, userId, isMuted }) => {
    const roomMap = liveRooms.get(roomId);
    if (!roomMap) return;

    for (const [sid, participant] of roomMap.entries()) {
      if (participant.userId === userId) {
        roomMap.set(sid, { ...participant, isMuted });
      }
    }

    emitParticipants(io, roomId);
  });

  socket.on('webrtc:offer', ({ roomId, to, from, sdp }) => {
    io.to(to).emit('webrtc:offer', { roomId, from, sdp });
  });

  socket.on('webrtc:answer', ({ roomId, to, from, sdp }) => {
    io.to(to).emit('webrtc:answer', { roomId, from, sdp });
  });

  socket.on('webrtc:ice-candidate', ({ roomId, to, from, candidate }) => {
    io.to(to).emit('webrtc:ice-candidate', { roomId, from, candidate });
  });

  socket.on('moderation:kick', ({ roomId, targetUserId, reason }) => {
    const targets = userSockets.get(roomId)?.get(targetUserId);
    if (!targets) return;

    for (const targetSocketId of targets.values()) {
      io.to(targetSocketId).emit('moderation:action', { type: 'KICK', reason: reason || 'Removed by host.' });
      io.sockets.sockets.get(targetSocketId)?.leave(roomId);

      const roomMap = liveRooms.get(roomId);
      if (roomMap) {
        roomMap.delete(targetSocketId);
      }
    }

    userSockets.get(roomId)?.delete(targetUserId);
    emitParticipants(io, roomId);
  });

  socket.on('moderation:ban', ({ roomId, targetUserId, reason }) => {
    const targets = userSockets.get(roomId)?.get(targetUserId);
    if (!targets) return;

    for (const targetSocketId of targets.values()) {
      io.to(targetSocketId).emit('moderation:action', { type: 'BAN', reason: reason || 'You were banned by host.' });
      io.sockets.sockets.get(targetSocketId)?.disconnect(true);

      const roomMap = liveRooms.get(roomId);
      if (roomMap) {
        roomMap.delete(targetSocketId);
      }
    }

    userSockets.get(roomId)?.delete(targetUserId);
    emitParticipants(io, roomId);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;

    if (!roomId || !userId) return;

    const roomMap = liveRooms.get(roomId);
    if (roomMap) {
      roomMap.delete(socket.id);
      if (roomMap.size === 0) {
        liveRooms.delete(roomId);
      }
    }

    removeUserSocket(roomId, userId, socket.id);
    emitParticipants(io, roomId);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Socket server listening on :${port}`);
});