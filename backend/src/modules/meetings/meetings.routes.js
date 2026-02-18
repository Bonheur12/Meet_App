import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createMeetingHandler,
  getMeetingHandler,
  joinMeetingHandler,
  leaveMeetingHandler,
  messagesHandler,
} from "./meetings.controller.js";

const router = Router();

router.use(requireAuth);
router.post("/", createMeetingHandler);
router.get("/:meetingCode", getMeetingHandler);
router.post("/:meetingCode/join", joinMeetingHandler);
router.post("/:meetingCode/leave", leaveMeetingHandler);
router.get("/:meetingCode/messages", messagesHandler);

export default router;
