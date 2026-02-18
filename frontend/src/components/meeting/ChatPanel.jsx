import { useState } from "react";
import Button from "../common/Button";

const ChatPanel = ({ messages = [], onSend }) => {
  const [text, setText] = useState("");

  const submit = (event) => {
    event.preventDefault();
    onSend(text);
    setText("");
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900 p-3">
      <h3 className="mb-2 text-sm font-semibold">Chat</h3>
      <div className="mb-2 flex-1 space-y-2 overflow-y-auto text-sm text-slate-200">
        {messages.map((m) => (
          <div key={m.id} className="rounded bg-slate-800 p-2">
            <p className="text-xs text-slate-400">{m.sender?.name || "User"}</p>
            <p>{m.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};

export default ChatPanel;
