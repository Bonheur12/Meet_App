import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { randomUUID } from "crypto";
import { saveMessage } from "../modules/meetings/meetings.service.js";

const socketUsers = new Map();

const parseToken = (socket) => {
  const authHeader = socket.handshake.auth?.token || socket.handshake.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  try {
    return jwt.verify(token, env.jwtAccessSecret);
  } catch {
    return null;
  }
};

export const registerMeetingSocketHandlers = (io, socket) => {
  const decoded = parseToken(socket);

  if (!decoded?.sub) {
    socket.emit("socket:error", { message: "Unauthorized socket" });
    socket.disconnect(true);
    return;
  }

  socketUsers.set(socket.id, { userId: decoded.sub, email: decoded.email });

  socket.on("meeting:join", async ({ meetingCode, name }) => {
    socket.join(meetingCode);

    socket.to(meetingCode).emit("participant:joined", {
      socketId: socket.id,
      userId: decoded.sub,
      name,
    });

    const sockets = await io.in(meetingCode).fetchSockets();
    const peers = sockets
      .filter((s) => s.id !== socket.id)
      .map((s) => ({ socketId: s.id }));

    socket.emit("meeting:peers", { peers });
  });

  socket.on("webrtc:offer", ({ meetingCode, targetSocketId, offer }) => {
    io.to(targetSocketId).emit("webrtc:offer", {
      fromSocketId: socket.id,
      offer,
      meetingCode,
    });
  });

  socket.on("webrtc:answer", ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit("webrtc:answer", {
      fromSocketId: socket.id,
      answer,
    });
  });

  socket.on("webrtc:ice-candidate", ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit("webrtc:ice-candidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });

  socket.on("chat:message", async ({ meetingCode, content }) => {
    if (!content?.trim()) return;

    const saved = await saveMessage({
      meetingCode,
      senderId: decoded.sub,
      content: content.trim(),
    });

    io.to(meetingCode).emit("chat:message", {
      id: saved?.id || randomUUID(),
      content,
      sender: saved?.sender || { id: decoded.sub, name: decoded.email },
      createdAt: saved?.createdAt || new Date(),
    });
  });

  socket.on("participant:state", ({ meetingCode, type, value }) => {
    socket.to(meetingCode).emit("participant:state", {
      socketId: socket.id,
      userId: decoded.sub,
      type,
      value,
    });
  });

  socket.on("disconnect", () => {
    const user = socketUsers.get(socket.id);
    if (user) {
      io.emit("participant:left", { socketId: socket.id, userId: user.userId });
      socketUsers.delete(socket.id);
    }
  });
};
