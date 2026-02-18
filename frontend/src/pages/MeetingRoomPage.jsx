import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoTile from "../components/meeting/VideoTile";
import ControlsBar from "../components/meeting/ControlsBar";
import ChatPanel from "../components/meeting/ChatPanel";
import ParticipantsPanel from "../components/meeting/ParticipantsPanel";
import { getMeetingRequest, getMessagesRequest, joinMeetingRequest } from "../api/meetingsApi";
import { useAuth } from "../hooks/useAuth";
import { useWebRTC } from "../hooks/useWebRTC";
import { useMeetingChat } from "../hooks/useMeetingChat";

const MeetingRoomPage = () => {
  const { meetingCode } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [initialMessages, setInitialMessages] = useState([]);
  const [tab, setTab] = useState("chat");

  const { localStream, remoteStreams, audioEnabled, videoEnabled, toggleAudio, toggleVideo, shareScreen } =
    useWebRTC({
      meetingCode,
      userName: user?.name || "Guest",
    });

  const { messages, sendMessage } = useMeetingChat({ meetingCode, initialMessages });

  useEffect(() => {
    const init = async () => {
      await joinMeetingRequest(accessToken, meetingCode);
      const [meetingRes, messagesRes] = await Promise.all([
        getMeetingRequest(accessToken, meetingCode),
        getMessagesRequest(accessToken, meetingCode),
      ]);
      setMeeting(meetingRes.data.meeting);
      setInitialMessages(messagesRes.data.messages);
    };

    init();
  }, [accessToken, meetingCode]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 p-4">
        <div>
          <h1 className="font-semibold">{meeting?.title || "Meeting Room"}</h1>
          <p className="text-xs text-slate-400">Meeting ID: {meetingCode}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("chat")}
            className={`rounded px-3 py-1 text-sm ${tab === "chat" ? "bg-blue-600" : "bg-slate-700"}`}
          >
            Chat
          </button>
          <button
            onClick={() => setTab("participants")}
            className={`rounded px-3 py-1 text-sm ${tab === "participants" ? "bg-blue-600" : "bg-slate-700"}`}
          >
            Participants
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-[1fr_320px]">
        <section className="grid auto-rows-[220px] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {localStream ? <VideoTile stream={localStream} label={`${user?.name || "Me"} (You)`} muted /> : null}
          {remoteStreams.map((entry) => (
            <VideoTile key={entry.socketId} stream={entry.stream} label={entry.socketId.slice(0, 6)} />
          ))}
        </section>

        <aside className="overflow-hidden">
          {tab === "chat" ? (
            <ChatPanel messages={messages} onSend={sendMessage} />
          ) : (
            <ParticipantsPanel participants={meeting?.participants?.map((p) => p.user) || []} />
          )}
        </aside>
      </main>

      <ControlsBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onShareScreen={shareScreen}
        onLeave={() => navigate("/")}
      />
    </div>
  );
};

export default MeetingRoomPage;
