import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { createMeetingRequest } from "../api/meetingsApi";
import { useAuth } from "../hooks/useAuth";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [title, setTitle] = useState("Team Standup");
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState("");

  const createMeeting = async () => {
    try {
      setError("");
      const { data } = await createMeetingRequest(accessToken, { title });
      navigate(`/meeting/${data.meeting.meetingCode}`);
    } catch (e) {
      setError(e.response?.data?.message || "Could not create meeting");
    }
  };

  const joinMeeting = () => {
    if (!meetingCode.trim()) return;
    navigate(`/meeting/${meetingCode.trim()}`);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
      <p className="mt-1 text-slate-400">Create a meeting or join with a meeting ID.</p>

      <section className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-medium">Create meeting</h2>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={createMeeting}>Create</Button>
        </div>

        <div className="space-y-3">
          <h2 className="font-medium">Join meeting</h2>
          <Input label="Meeting code" value={meetingCode} onChange={(e) => setMeetingCode(e.target.value)} />
          <Button variant="secondary" onClick={joinMeeting}>
            Join
          </Button>
        </div>
      </section>
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </main>
  );
};

export default DashboardPage;
