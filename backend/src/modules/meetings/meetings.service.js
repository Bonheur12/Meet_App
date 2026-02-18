import { MeetingRole, ParticipantStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { generateMeetingCode } from "../../utils/generateMeetingCode.js";

export const createMeeting = async ({ hostId, title }) => {
  let code = generateMeetingCode();

  // Ensure uniqueness before writing.
  for (let i = 0; i < 5; i += 1) {
    const existing = await prisma.meeting.findUnique({ where: { meetingCode: code } });
    if (!existing) break;
    code = generateMeetingCode();
  }

  const meeting = await prisma.meeting.create({
    data: {
      meetingCode: code,
      title,
      hostId,
      participants: {
        create: {
          userId: hostId,
          role: MeetingRole.HOST,
          status: ParticipantStatus.JOINED,
        },
      },
    },
    include: {
      host: { select: { id: true, name: true, email: true } },
    },
  });

  return meeting;
};

export const getMeetingByCode = async (meetingCode) => {
  return prisma.meeting.findUnique({
    where: { meetingCode },
    include: {
      host: { select: { id: true, name: true, email: true } },
      participants: {
        where: { status: ParticipantStatus.JOINED },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
};

export const joinMeeting = async ({ meetingCode, userId }) => {
  const meeting = await prisma.meeting.findUnique({ where: { meetingCode } });

  if (!meeting) {
    const error = new Error("Meeting not found");
    error.statusCode = 404;
    throw error;
  }

  const participant = await prisma.participant.upsert({
    where: {
      meetingId_userId: {
        meetingId: meeting.id,
        userId,
      },
    },
    create: {
      meetingId: meeting.id,
      userId,
      status: ParticipantStatus.JOINED,
      role: meeting.hostId === userId ? MeetingRole.HOST : MeetingRole.PARTICIPANT,
    },
    update: {
      status: ParticipantStatus.JOINED,
      leftAt: null,
    },
  });

  return { meeting, participant };
};

export const leaveMeeting = async ({ meetingCode, userId }) => {
  const meeting = await prisma.meeting.findUnique({ where: { meetingCode } });

  if (!meeting) {
    const error = new Error("Meeting not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.participant.update({
    where: {
      meetingId_userId: {
        meetingId: meeting.id,
        userId,
      },
    },
    data: {
      status: ParticipantStatus.LEFT,
      leftAt: new Date(),
    },
  });

  return { ok: true };
};

export const listMessages = async (meetingCode) => {
  const meeting = await prisma.meeting.findUnique({ where: { meetingCode } });

  if (!meeting) {
    const error = new Error("Meeting not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.message.findMany({
    where: { meetingId: meeting.id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true } } },
  });
};

export const saveMessage = async ({ meetingCode, senderId, content }) => {
  const meeting = await prisma.meeting.findUnique({ where: { meetingCode } });
  if (!meeting) return null;

  return prisma.message.create({
    data: { meetingId: meeting.id, senderId, content },
    include: { sender: { select: { id: true, name: true } } },
  });
};
