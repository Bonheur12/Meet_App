import { createContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      if (socket) socket.disconnect();
      setSocket(null);
      return;
    }

    const s = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      auth: { token: accessToken },
    });

    setSocket(s);

    return () => s.disconnect();
  }, [accessToken]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
