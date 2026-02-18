import { useEffect, useState } from "react";
import { useSocket } from "./useSocket";

export const useMeetingChat = ({ meetingCode, initialMessages = [] }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on("chat:message", onMessage);
    return () => socket.off("chat:message", onMessage);
  }, [socket]);

  const sendMessage = (content) => {
    if (!socket || !content.trim()) return;
    socket.emit("chat:message", { meetingCode, content });
  };

  return { messages, sendMessage };
};
