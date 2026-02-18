import { axiosClient } from "./axiosClient";

export const registerRequest = (payload) => axiosClient.post("/auth/register", payload);
export const loginRequest = (payload) => axiosClient.post("/auth/login", payload);
export const refreshRequest = () => axiosClient.post("/auth/refresh");
export const meRequest = (token) =>
  axiosClient.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
