# TalkFluent

A modern responsive language-exchange platform for live spoken English practice, inspired by Free4Talk.

## Features

- Public room discovery landing page
- Room cards with topic, language, level, host, participant count, flags, and join CTA
- Authenticated room creation with visibility, level, and participant limits
- Real-time room participant updates via Socket.IO
- Browser voice chat via WebRTC (mesh topology + STUN)
- Mute/unmute, leave room, host controls (kick/ban)
- Basic moderation flow (report, kick, ban)
- Google sign-in via NextAuth

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- PostgreSQL + Prisma ORM
- NextAuth (Google provider)
- Socket.IO (signaling + presence)
- WebRTC (audio streaming)

## Production Folder Structure

```text
TalkFluent/
+- app/
¦  +- api/
¦  ¦  +- auth/[...nextauth]/route.ts
¦  ¦  +- rooms/
¦  ¦     +- route.ts
¦  ¦     +- [roomId]/
¦  ¦        +- route.ts
¦  ¦        +- join/route.ts
¦  ¦        +- leave/route.ts
¦  ¦        +- report/route.ts
¦  ¦        +- kick/route.ts
¦  ¦        +- ban/route.ts
¦  +- room/[roomId]/page.tsx
¦  +- signin/page.tsx
¦  +- globals.css
¦  +- layout.tsx
¦  +- page.tsx
+- components/
¦  +- room/
¦  ¦  +- create-room-form.tsx
¦  ¦  +- room-card.tsx
¦  ¦  +- room-client.tsx
¦  +- ui/
¦  ¦  +- badge.tsx
¦  ¦  +- button.tsx
¦  ¦  +- input.tsx
¦  ¦  +- select.tsx
¦  +- auth-actions.tsx
+- hooks/
¦  +- use-voice-room.ts
+- lib/
¦  +- actions/rooms.ts
¦  +- auth.ts
¦  +- current-user.ts
¦  +- prisma.ts
¦  +- utils.ts
¦  +- validators.ts
+- prisma/
¦  +- schema.prisma
+- server/
¦  +- index.ts
+- types/
¦  +- next-auth.d.ts
¦  +- room.ts
+- package.json
+- README.md
```

## Database Schema

Core entities in [`prisma/schema.prisma`](./prisma/schema.prisma):

- `User`, `Account`, `Session`, `VerificationToken` (NextAuth)
- `Room` (topic/language/level/max/visibility/flags)
- `Participant` (join/leave + mute state)
- `Report` (room moderation reports)
- `Ban` (room-level ban list)

## Environment Variables

Create `.env` from `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/talkfluent"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-long-random-secret"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
PORT="3000"
```

Google OAuth redirect URI for local dev:

- `http://localhost:3000/api/auth/callback/google`

## Step-by-Step Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   copy .env.example .env
   ```
3. Update `.env` with PostgreSQL + Google OAuth credentials.
4. Create database schema:
   ```bash
   npm run db:push
   ```
5. Start development server (Next.js + Socket.IO custom server):
   ```bash
   npm run dev
   ```
6. Open:
   - `http://localhost:3000`

## Room Join/Create Logic

- Create room: `POST /api/rooms`
- Public room list: `GET /api/rooms`
- Join room: `POST /api/rooms/:roomId/join`
  - checks auth
  - checks active ban
  - checks max participant limit
  - inserts active participant record
- Leave room: `POST /api/rooms/:roomId/leave`
  - sets `leftAt` timestamp for active participant entries

## Realtime Participant Updates

Socket events handled in [`server/index.ts`](./server/index.ts):

- `join-room`
- `participants:update`
- `toggle-mute`
- `moderation:kick`
- `moderation:ban`

Presence is kept in-memory per room and broadcast to all clients.

## WebRTC Voice Setup

Client signaling and peer orchestration in [`hooks/use-voice-room.ts`](./hooks/use-voice-room.ts):

- Captures local audio with `getUserMedia`
- Uses `RTCPeerConnection` per peer (mesh)
- Forwards SDP + ICE via Socket.IO events
- Renders remote streams via hidden `<audio autoPlay>` elements

## Moderation

- Report: `POST /api/rooms/:roomId/report`
- Kick (host only): `POST /api/rooms/:roomId/kick`
- Ban (host only): `POST /api/rooms/:roomId/ban`
- Kick/Ban state is reflected in realtime via socket moderation events

## Deployment Instructions

Because this app uses a custom Node server for Socket.IO + Next.js, deploy on platforms supporting long-lived WebSocket connections:

- Railway
- Render
- Fly.io
- VPS (Docker + Nginx)

### Generic deployment steps

1. Provision a PostgreSQL database.
2. Set environment variables from `.env.example`.
3. Build app:
   ```bash
   npm ci
   npm run db:deploy
   npm run build
   ```
4. Start app:
   ```bash
   npm run start
   ```
5. Expose `PORT` and ensure WebSockets are enabled at reverse proxy/load balancer.

## Notes for Production Hardening

- Add TURN servers (coturn) for restrictive NAT/firewall networks.
- Add rate limiting on room and moderation endpoints.
- Move socket presence to Redis adapter for horizontal scaling.
- Add invite codes/links flow for private rooms.
- Add persistent audit logs and moderator dashboard.
