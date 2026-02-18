# Zoom-Like Web App (React + Node + MySQL) — Architecture & Build Plan

This guide is designed for a beginner-friendly but production-minded implementation of a Zoom-like web app.

---

## 1) System Architecture (High-Level)

### Components

1. **React Frontend**
   - Handles UI (login, dashboard, meeting room, chat panel, controls).
   - Uses **Axios** for REST API calls.
   - Uses **Socket.IO client** for real-time signaling and in-meeting events.
   - Uses **WebRTC** APIs (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`) for media.

2. **Node.js + Express Backend**
   - Exposes REST APIs for auth and meetings.
   - Verifies JWT for protected endpoints.
   - Hosts Socket.IO signaling server for WebRTC offer/answer/ICE exchange and chat/events.

3. **MySQL + Prisma**
   - Stores users, meetings, participants, and messages.
   - Stores session metadata and meeting history for persistence.

4. **STUN/TURN Servers**
   - STUN helps peers discover public network addresses.
   - TURN relays media when direct peer-to-peer fails (common on strict NAT/firewalls).

### Textual Architecture Diagram

```text
[React Client]
  |  REST (Axios + JWT)
  v
[Express API]  <---->  [MySQL via Prisma]
  |
  | Socket.IO signaling (auth + room events)
  v
[Socket.IO Server in Node]
  |
  | SDP Offer/Answer + ICE candidates
  v
[WebRTC Peer Connections between clients]
  |
  | STUN/TURN fallback
  v
[Media flows directly peer-to-peer or via TURN relay]
```

### Why this architecture?
- REST APIs are ideal for create/read/update operations (users, meetings).
- Socket.IO is ideal for low-latency room events and signaling.
- WebRTC is the right browser-native technology for real-time media.
- Prisma + MySQL gives strict schema, migrations, and type-safe DB access.

---

## 2) Database Design (Prisma Schema)

Create `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum MeetingRole {
  HOST
  PARTICIPANT
}

enum ParticipantStatus {
  INVITED
  WAITING
  JOINED
  LEFT
}

model User {
  id           String        @id @default(cuid())
  name         String
  email        String        @unique
  passwordHash String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  hostedMeetings Meeting[]   @relation("HostMeetings")
  participants   Participant[]
  messages       Message[]

  @@index([createdAt])
}

model Meeting {
  id          String         @id @default(cuid())
  meetingCode String         @unique
  title       String?
  hostId      String
  isActive    Boolean        @default(true)
  startedAt   DateTime       @default(now())
  endedAt     DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  host         User          @relation("HostMeetings", fields: [hostId], references: [id])
  participants Participant[]
  messages     Message[]

  @@index([hostId])
  @@index([meetingCode])
  @@index([createdAt])
}

model Participant {
  id         String            @id @default(cuid())
  meetingId  String
  userId     String
  role       MeetingRole       @default(PARTICIPANT)
  status     ParticipantStatus @default(JOINED)
  joinedAt   DateTime          @default(now())
  leftAt     DateTime?

  meeting    Meeting           @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([meetingId, userId])
  @@index([userId])
  @@index([meetingId, status])
}

model Message {
  id         String   @id @default(cuid())
  meetingId  String
  senderId   String
  content    String
  createdAt  DateTime @default(now())

  meeting    Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  sender     User     @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([meetingId, createdAt])
  @@index([senderId])
}
```

### Relationship summary
- **User → Meeting** (one-to-many): host creates many meetings.
- **User ↔ Meeting** via **Participant** (many-to-many with role/status metadata).
- **Meeting → Message** and **User → Message** for in-meeting chat history.

### Migration strategy
1. `npx prisma migrate dev --name init`
2. Every schema update: create a **new** migration with clear name.
3. Use `prisma migrate deploy` in production.
4. Keep seed scripts versioned for test/demo data.

---

## 3) Backend Implementation

### Suggested folder structure

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
      cors.js
    db/
      prisma.js
    middleware/
      auth.js
      errorHandler.js
      rateLimit.js
    modules/
      auth/
        auth.controller.js
        auth.service.js
        auth.routes.js
        auth.validation.js
      meetings/
        meetings.controller.js
        meetings.service.js
        meetings.routes.js
      users/
        users.controller.js
        users.routes.js
    sockets/
      index.js
      meeting.socket.js
    utils/
      jwt.js
      generateMeetingCode.js
```

### Core REST APIs

#### Auth
- `POST /api/auth/register` → create user with hashed password.
- `POST /api/auth/login` → validate credentials; return access token (+ refresh token if used).
- `POST /api/auth/refresh` → issue new access token.
- `POST /api/auth/logout` → invalidate refresh token.
- `GET /api/auth/me` → current user profile.

#### Meetings
- `POST /api/meetings` (protected) → create meeting and meeting code.
- `GET /api/meetings/:meetingCode` (protected) → meeting details.
- `POST /api/meetings/:meetingCode/join` (protected) → add/update participant status.
- `POST /api/meetings/:meetingCode/leave` (protected) → mark participant left.
- `GET /api/meetings/:meetingCode/messages` (protected) → message history.

### JWT auth middleware (example)

```js
// middleware/auth.js
import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
```

### Socket.IO signaling logic

Socket events (recommended):
- `meeting:join` → join socket room for meeting code.
- `participant:joined` / `participant:left` → room-wide notifications.
- `webrtc:offer` → send SDP offer to target peer.
- `webrtc:answer` → send SDP answer back.
- `webrtc:ice-candidate` → relay ICE candidates.
- `chat:message` → broadcast/save chat.
- `participant:toggle-audio`, `participant:toggle-video`, `participant:raise-hand`.

### WebRTC signaling flow

1. User joins meeting room via Socket.IO.
2. Existing peers notified of new participant.
3. Initiator creates offer and sends through Socket.IO.
4. Receiver sets remote description, creates answer, sends back.
5. Both peers exchange ICE candidates.
6. Media streams become active.

Why Socket.IO for signaling?
- WebRTC does **not** define signaling transport.
- Socket.IO gives reliable event routing and easy room model.

---

## 4) Frontend Implementation

### Suggested folder structure

```text
frontend/
  src/
    main.jsx
    App.jsx
    api/
      axiosClient.js
      authApi.js
      meetingsApi.js
    components/
      common/
        Button.jsx
        Input.jsx
        Loader.jsx
      meeting/
        VideoTile.jsx
        ControlsBar.jsx
        ParticipantsPanel.jsx
        ChatPanel.jsx
    context/
      AuthContext.jsx
      SocketContext.jsx
    hooks/
      useAuth.js
      useSocket.js
      useWebRTC.js
      useMeetingChat.js
    pages/
      LoginPage.jsx
      RegisterPage.jsx
      DashboardPage.jsx
      MeetingRoomPage.jsx
    routes/
      ProtectedRoute.jsx
    styles/
      tailwind.css
```

### Auth flow (React)
- On login/register success, store access token (prefer memory + refresh token cookie pattern).
- Keep user in `AuthContext`.
- `ProtectedRoute` checks auth state; redirects unauthenticated users.

### Meeting UI layout (Zoom-like)
- Main video grid center.
- Right panel toggles chat / participants.
- Bottom controls bar:
  - Mute/Unmute
  - Camera On/Off
  - Share Screen
  - Raise Hand
  - Leave Meeting

### WebRTC hook responsibilities (`useWebRTC`)
- Get local media (`getUserMedia`).
- Create/manage peer connections per participant.
- Handle offer/answer/ICE events from socket.
- Track media state (audio/video enabled).
- Screen share by replacing video track (`RTCRtpSender.replaceTrack`).

### Tailwind patterns
- Use small reusable utility classes through component wrappers.
- Example: centralized button variants to avoid repeated long class strings.
- Use responsive grid classes for video tiles.

---

## 5) Step-by-Step Development Guide

### Phase 1: Project setup
1. Create `frontend` and `backend` folders.
2. Install dependencies exactly for required stack.
3. Configure `.env` files for API, DB, JWT, Socket.

### Phase 2: Authentication first
1. Implement user model + migration.
2. Add register/login routes.
3. Hash password with `bcrypt`.
4. Issue JWT access token (+ refresh token flow).
5. Build login/register pages.
6. Add protected routes.

### Phase 3: Meeting management
1. Create meeting model and APIs.
2. Generate unique meeting code.
3. Add dashboard page: create/join meeting.
4. Persist participants join/leave.

### Phase 4: Real-time signaling + WebRTC
1. Setup Socket.IO server and client.
2. Add room join and participant events.
3. Implement offer/answer/ICE exchange.
4. Render local + remote streams.
5. Add mute/camera toggles.

### Phase 5: Screen sharing and chat
1. Add `getDisplayMedia` flow.
2. Broadcast screen-share state changes.
3. Add chat messages through Socket.IO + DB persistence.
4. Add participant list and raise hand.

### Phase 6: Hardening and polish
1. Add loading and error states.
2. Add reconnection handling.
3. Add rate limiting and security headers.
4. Test on multiple tabs/devices/networks.

---

## 6) Security & Best Practices

1. **Password hashing**: use `bcrypt` with suitable salt rounds.
2. **JWT expiration**: short-lived access token (e.g., 15m), refresh token longer.
3. **Refresh token storage**: httpOnly secure cookie preferred.
4. **Environment variables**: never hardcode secrets.
5. **CORS**: allow only trusted frontend origin.
6. **Rate limiting**: protect login/register and socket handshake.
7. **Input validation**: validate payloads server-side (e.g., zod/joi/express-validator).
8. **Authorization checks**: verify user can join or view specific meeting resources.
9. **Audit logs (optional)**: record auth failures and critical meeting actions.

---

## 7) Deployment Advice

### Backend deployment
- Deploy Node server on Render/Railway/Fly.io/EC2.
- Ensure WebSocket support is enabled.
- Run Prisma migrations during deployment.

### Frontend deployment
- Deploy React app on Vercel/Netlify.
- Set API base URL and socket URL via environment variables.

### MySQL deployment
- Use managed MySQL (PlanetScale/AWS RDS/Aiven/etc.).
- Restrict DB access by IP/VPC and rotate credentials.

### TURN/STUN in production
- STUN alone is often not enough.
- Use TURN (e.g., `coturn`) for reliable connectivity in corporate/strict networks.
- Configure ICE servers in frontend peer connection:

```js
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:turn.yourdomain.com:3478",
      username: process.env.REACT_APP_TURN_USERNAME,
      credential: process.env.REACT_APP_TURN_CREDENTIAL,
    },
  ],
});
```

---

## Minimal Implementation Order (Quick Recap)
1. Auth (DB + JWT + protected routes)
2. Meeting create/join (REST + persistence)
3. Socket.IO rooms + signaling
4. WebRTC media flows
5. Chat + participants + reactions
6. Security hardening + deployment

This order keeps complexity low and lets you test incrementally.
