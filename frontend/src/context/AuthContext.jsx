import { createContext, useEffect, useMemo, useState } from "react";
import { loginRequest, meRequest, refreshRequest, registerRequest } from "../api/authApi";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateSession = async () => {
    try {
      const refresh = await refreshRequest();
      const token = refresh.data.accessToken;
      setAccessToken(token);

      const me = await meRequest(token);
      setUser(me.data.user);
    } catch {
      setAccessToken("");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrateSession();
  }, []);

  const login = async (payload) => {
    const { data } = await loginRequest(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (payload) => {
    await registerRequest(payload);
  };

  const logout = async () => {
    setAccessToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      accessToken,
      user,
      loading,
      isAuthenticated: Boolean(accessToken && user),
      login,
      register,
      logout,
    }),
    [accessToken, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
