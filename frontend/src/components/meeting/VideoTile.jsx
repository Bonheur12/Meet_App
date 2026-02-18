import { useEffect, useRef } from "react";

const VideoTile = ({ stream, label, muted = false }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black">
      <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">{label}</span>
    </div>
  );
};

export default VideoTile;
