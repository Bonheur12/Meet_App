import { Server } from "socket.io";
import { corsOptions } from "../config/cors.js";
import { registerMeetingSocketHandlers } from "./meeting.socket.js";

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: corsOptions,
  });

  io.on("connection", (socket) => {
    registerMeetingSocketHandlers(io, socket);
  });

  return io;
};
