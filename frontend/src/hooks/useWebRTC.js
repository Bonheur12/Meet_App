import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./useSocket";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const useWebRTC = ({ meetingCode, userName }) => {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const peersRef = useRef({});

  const updateRemoteStream = useCallback((socketId, stream) => {
    setRemoteStreams((prev) => {
      const existing = prev.find((s) => s.socketId === socketId);
      if (existing) {
        return prev.map((s) => (s.socketId === socketId ? { socketId, stream } : s));
      }
      return [...prev, { socketId, stream }];
    });
  }, []);

  const createPeer = useCallback(
    (targetSocketId, stream) => {
      const pc = new RTCPeerConnection(rtcConfig);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote) updateRemoteStream(targetSocketId, remote);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc:ice-candidate", {
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      peersRef.current[targetSocketId] = pc;
      return pc;
    },
    [socket, updateRemoteStream]
  );

  useEffect(() => {
    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
    };

    init();

    return () => {
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!socket || !localStream || !meetingCode) return;

    socket.emit("meeting:join", { meetingCode, name: userName });

    const onPeers = async ({ peers }) => {
      for (const peer of peers) {
        const pc = createPeer(peer.socketId, localStream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("webrtc:offer", {
          meetingCode,
          targetSocketId: peer.socketId,
          offer,
        });
      }
    };

    const onParticipantJoined = async ({ socketId }) => {
      const pc = createPeer(socketId, localStream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc:offer", {
        meetingCode,
        targetSocketId: socketId,
        offer,
      });
    };

    const onOffer = async ({ fromSocketId, offer }) => {
      const pc = createPeer(fromSocketId, localStream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { targetSocketId: fromSocketId, answer });
    };

    const onAnswer = async ({ fromSocketId, answer }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIce = async ({ fromSocketId, candidate }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const onLeft = ({ socketId }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }

      setRemoteStreams((prev) => prev.filter((s) => s.socketId !== socketId));
    };

    socket.on("meeting:peers", onPeers);
    socket.on("participant:joined", onParticipantJoined);
    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice-candidate", onIce);
    socket.on("participant:left", onLeft);

    return () => {
      socket.off("meeting:peers", onPeers);
      socket.off("participant:joined", onParticipantJoined);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice-candidate", onIce);
      socket.off("participant:left", onLeft);
    };
  }, [socket, localStream, meetingCode, userName, createPeer]);

  const toggleAudio = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
    });
  };

  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
    });
  };

  const shareScreen = async () => {
    if (!localStream) return;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = displayStream.getVideoTracks()[0];

    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });

    screenTrack.onended = () => {
      const cameraTrack = localStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
      });
    };
  };

  return {
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    shareScreen,
  };
};
