const ParticipantsPanel = ({ participants = [] }) => {
  return (
    <div className="h-full rounded-xl border border-slate-800 bg-slate-900 p-3">
      <h3 className="mb-2 text-sm font-semibold">Participants ({participants.length})</h3>
      <ul className="space-y-2 text-sm text-slate-300">
        {participants.map((p) => (
          <li key={p.id || p.socketId} className="rounded bg-slate-800 px-2 py-1">
            {p.name || p.email || "Guest"}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ParticipantsPanel;
