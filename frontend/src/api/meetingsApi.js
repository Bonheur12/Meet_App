import { axiosClient } from "./axiosClient";

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const createMeetingRequest = (token, payload) =>
  axiosClient.post("/meetings", payload, authHeader(token));

export const joinMeetingRequest = (token, meetingCode) =>
  axiosClient.post(`/meetings/${meetingCode}/join`, {}, authHeader(token));

export const getMeetingRequest = (token, meetingCode) =>
  axiosClient.get(`/meetings/${meetingCode}`, authHeader(token));

export const getMessagesRequest = (token, meetingCode) =>
  axiosClient.get(`/meetings/${meetingCode}/messages`, authHeader(token));
