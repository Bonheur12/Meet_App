import { z } from "zod";
import {
  createMeeting,
  getMeetingByCode,
  joinMeeting,
  leaveMeeting,
  listMessages,
} from "./meetings.service.js";

const createMeetingSchema = z.object({
  title: z.string().min(2).max(100).optional(),
});

export const createMeetingHandler = async (req, res, next) => {
  try {
    const body = createMeetingSchema.parse(req.body || {});
    const meeting = await createMeeting({ hostId: req.user.id, title: body.title });
    return res.status(201).json({ meeting });
  } catch (error) {
    return next(error);
  }
};

export const getMeetingHandler = async (req, res, next) => {
  try {
    const meeting = await getMeetingByCode(req.params.meetingCode);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.json({ meeting });
  } catch (error) {
    return next(error);
  }
};

export const joinMeetingHandler = async (req, res, next) => {
  try {
    const result = await joinMeeting({
      meetingCode: req.params.meetingCode,
      userId: req.user.id,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const leaveMeetingHandler = async (req, res, next) => {
  try {
    const result = await leaveMeeting({
      meetingCode: req.params.meetingCode,
      userId: req.user.id,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const messagesHandler = async (req, res, next) => {
  try {
    const messages = await listMessages(req.params.meetingCode);
    return res.json({ messages });
  } catch (error) {
    return next(error);
  }
};
