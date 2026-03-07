import 'dotenv/config';
import http from 'node:http';
import next from 'next';
import { Server } from 'socket.io';

type LiveParticipant = {
  id: string;
  socketId: string;
  userId: string;
  name: string;
  image: string | null;
  isMuted: boolean;
  isHost: boolean;
};

type JoinPayload = {
  roomId: string;
  participant: LiveParticipant;
};

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const liveRooms = new Map<string, Map<string, LiveParticipant>>();
const userSockets = new Map<string, Map<string, Set<string>>>();

function emitParticipants(io: Server, roomId: string) {
  const roomMap = liveRooms.get(roomId);
  io.to(roomId).emit('participants:update', {
    participants: roomMap ? Array.from(roomMap.values()) : []
  });
}

function upsertUserSocket(roomId: string, userId: string, socketId: string) {
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

function removeUserSocket(roomId: string, userId: string, socketId: string) {
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

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

    const io = new Server(server, {
      cors: {
        origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      socket.on('join-room', ({ roomId, participant }: JoinPayload) => {
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

      socket.on('toggle-mute', ({ roomId, userId, isMuted }: { roomId: string; userId: string; isMuted: boolean }) => {
        const roomMap = liveRooms.get(roomId);
        if (!roomMap) return;

        for (const [sid, participant] of roomMap.entries()) {
          if (participant.userId === userId) {
            roomMap.set(sid, { ...participant, isMuted });
          }
        }

        emitParticipants(io, roomId);
      });

      socket.on(
        'webrtc:offer',
        ({ roomId, to, from, sdp }: { roomId: string; to: string; from: string; sdp: RTCSessionDescriptionInit }) => {
          io.to(to).emit('webrtc:offer', { roomId, from, sdp });
        }
      );

      socket.on(
        'webrtc:answer',
        ({ roomId, to, from, sdp }: { roomId: string; to: string; from: string; sdp: RTCSessionDescriptionInit }) => {
          io.to(to).emit('webrtc:answer', { roomId, from, sdp });
        }
      );

      socket.on(
        'webrtc:ice-candidate',
        ({ roomId, to, from, candidate }: { roomId: string; to: string; from: string; candidate: RTCIceCandidateInit }) => {
          io.to(to).emit('webrtc:ice-candidate', { roomId, from, candidate });
        }
      );

      socket.on('moderation:kick', ({ roomId, targetUserId, reason }: { roomId: string; targetUserId: string; reason?: string }) => {
        const targets = userSockets.get(roomId)?.get(targetUserId);
        if (!targets) return;

        for (const targetSocketId of targets.values()) {
          io.to(targetSocketId).emit('moderation:action', { type: 'KICK', reason: reason ?? 'Removed by host.' });
          io.sockets.sockets.get(targetSocketId)?.leave(roomId);

          const roomMap = liveRooms.get(roomId);
          if (roomMap) {
            roomMap.delete(targetSocketId);
          }
        }

        userSockets.get(roomId)?.delete(targetUserId);
        emitParticipants(io, roomId);
      });

      socket.on('moderation:ban', ({ roomId, targetUserId, reason }: { roomId: string; targetUserId: string; reason?: string }) => {
        const targets = userSockets.get(roomId)?.get(targetUserId);
        if (!targets) return;

        for (const targetSocketId of targets.values()) {
          io.to(targetSocketId).emit('moderation:action', { type: 'BAN', reason: reason ?? 'You were banned by host.' });
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
        const roomId = socket.data.roomId as string | undefined;
        const userId = socket.data.userId as string | undefined;

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

    server
      .once('error', (err) => {
        console.error(err);
        process.exit(1);
      })
      .listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
      });
  })
  .catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
