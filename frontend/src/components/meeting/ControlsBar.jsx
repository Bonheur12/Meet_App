import Button from "../common/Button";

const ControlsBar = ({ audioEnabled, videoEnabled, onToggleAudio, onToggleVideo, onShareScreen, onLeave }) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 bg-slate-950 p-4">
      <Button variant="secondary" onClick={onToggleAudio}>
        {audioEnabled ? "Mute" : "Unmute"}
      </Button>
      <Button variant="secondary" onClick={onToggleVideo}>
        {videoEnabled ? "Camera Off" : "Camera On"}
      </Button>
      <Button onClick={onShareScreen}>Share Screen</Button>
      <Button variant="danger" onClick={onLeave}>
        Leave
      </Button>
    </div>
  );
};

export default ControlsBar;
