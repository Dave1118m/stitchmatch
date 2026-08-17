import React, { useEffect, useRef, useState } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  SwitchCamera, 
  Maximize2, 
  Minimize2, 
  Sparkles,
  ShieldCheck,
  User
} from 'lucide-react';

interface VideoCallModalProps {
  socket: any;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
  conversationId?: string;
  isIncoming?: boolean;
  incomingSignal?: any;
  onClose: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export default function VideoCallModal({
  socket,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  targetUserId,
  targetUserName,
  targetUserAvatar,
  conversationId,
  isIncoming = false,
  incomingSignal,
  onClose,
}: VideoCallModalProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [isSwappedView, setIsSwappedView] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Synthesized Ringtone Audio
  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playTone = () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 tone
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      };

      playTone();
      ringIntervalRef.current = setInterval(playTone, 2800);
    } catch (e) {
      console.warn('Audio ringtone init failed:', e);
    }
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // 1. Initialize Local Media Stream
  const initLocalStream = async (mode: 'user' | 'environment' = 'user') => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      return null;
    }
  };

  // 2. Setup WebRTC Peer Connection
  const createPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Send ICE candidates via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          to: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        stopRingtone();
        setCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  };

  // 3. Initiate Outgoing Call
  const startOutgoingCall = async () => {
    playRingtone();
    const stream = await initLocalStream(facingMode);
    if (!stream) return;

    const pc = createPeerConnection(stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call_user', {
      userToCall: targetUserId,
      signalData: offer,
      fromName: currentUserName,
      fromAvatar: currentUserAvatar,
      conversationId,
    });
  };

  // 4. Accept Incoming Call
  const acceptIncomingCall = async () => {
    stopRingtone();
    setCallStatus('connecting' as any);
    const stream = await initLocalStream(facingMode);
    if (!stream) return;

    const pc = createPeerConnection(stream);

    if (incomingSignal) {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', {
        to: targetUserId,
        signal: answer,
      });
      setCallStatus('connected');
    }
  };

  // 5. Reject Incoming Call
  const rejectIncomingCall = () => {
    stopRingtone();
    if (socket) {
      socket.emit('reject_call', { to: targetUserId });
    }
    endCall();
  };

  // 6. End & Cleanup Call
  const endCall = () => {
    stopRingtone();
    if (socket) {
      socket.emit('end_call', { to: targetUserId });
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallStatus('ended');
    setTimeout(onClose, 800);
  };

  // 7. Socket Event Listeners for Call Signaling
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = async (data: { signal: any }) => {
      console.log('Call accepted by remote user');
      stopRingtone();
      setCallStatus('connected');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
      }
    };

    const handleReceiveIce = async (data: { candidate: any }) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Error adding ICE candidate:', e);
        }
      }
    };

    const handleCallRejected = () => {
      stopRingtone();
      alert(`${targetUserName} is currently unavailable.`);
      endCall();
    };

    const handleCallEnded = () => {
      stopRingtone();
      endCall();
    };

    socket.on('call_accepted', handleCallAccepted);
    socket.on('receive_ice_candidate', handleReceiveIce);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);

    // If caller, start automatically
    if (!isIncoming) {
      startOutgoingCall();
    } else {
      playRingtone();
    }

    return () => {
      stopRingtone();
      socket.off('call_accepted', handleCallAccepted);
      socket.off('receive_ice_candidate', handleReceiveIce);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [socket]);

  // Call duration counter
  useEffect(() => {
    let interval: any = null;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Switch Facing Camera (Front/Back)
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    const newStream = await initLocalStream(nextMode);
    if (newStream && peerConnectionRef.current) {
      const videoTrack = newStream.getVideoTracks()[0];
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(videoTrack);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[720px] bg-gray-950 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col">
        
        {/* Top Header Bar */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-3 pointer-events-auto">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md bg-gray-800 flex items-center justify-center">
              {targetUserAvatar ? (
                <img src={targetUserAvatar} alt={targetUserName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base leading-tight drop-shadow-md">
                {targetUserName}
              </h3>
              <div className="flex items-center space-x-1.5 text-xs text-gray-300">
                <span className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                <span className="capitalize font-medium">
                  {callStatus === 'connected' ? `Live Fitting (${formatTime(callDuration)})` : callStatus === 'ringing' ? 'Incoming Call...' : 'Calling...'}
                </span>
              </div>
            </div>
          </div>

          {/* Secure WebRTC Peer Badge */}
          <div className="hidden sm:flex items-center space-x-1 px-3 py-1 rounded-full backdrop-blur-md bg-black/50 border border-white/10 text-gray-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
            <span>P2P Encrypted Video</span>
          </div>
        </div>

        {/* Video Stage Container */}
        <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden">
          
          {/* Main Viewport (Remote video or Avatar placeholder) */}
          <video
            ref={isSwappedView ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Remote Placeholder when not yet connected */}
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black p-6 text-center z-10">
              <div className="relative mb-6">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-primary-500/80 shadow-2xl bg-gray-800 flex items-center justify-center">
                  {targetUserAvatar ? (
                    <img src={targetUserAvatar} alt={targetUserName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div className="absolute -inset-2 rounded-full border-2 border-primary-400/40 animate-ping pointer-events-none" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{targetUserName}</h2>
              <p className="text-sm text-gray-400 max-w-xs">
                {isIncoming && callStatus === 'ringing' 
                  ? 'is inviting you to a 1-on-1 virtual fitting consultation'
                  : 'Connecting virtual fitting camera session...'}
              </p>

              {/* Incoming Call Response Action Buttons */}
              {isIncoming && callStatus === 'ringing' && (
                <div className="mt-8 flex items-center space-x-6">
                  <button
                    onClick={rejectIncomingCall}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl hover:scale-105 transition-all flex flex-col items-center"
                    title="Decline"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <button
                    onClick={acceptIncomingCall}
                    className="p-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl hover:scale-110 transition-all flex flex-col items-center animate-bounce"
                    title="Accept Video Call"
                  >
                    <Video className="w-8 h-8" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Picture-in-Picture (Local Camera Stream) */}
          {callStatus === 'connected' && (
            <div
              onClick={() => setIsSwappedView(!isSwappedView)}
              className="absolute top-20 right-4 w-28 sm:w-44 aspect-[3/4] bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl cursor-pointer group hover:scale-105 transition-all z-20"
              title="Click to swap main view"
            >
              <video
                ref={isSwappedView ? remoteVideoRef : localVideoRef}
                autoPlay
                playsInline
                muted={!isSwappedView}
                className={`w-full h-full object-cover ${facingMode === 'user' && !isSwappedView ? 'scale-x-[-1]' : ''}`}
              />
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                You
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Control Toolbar */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center space-x-3 sm:space-x-5 z-30">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-md border transition-all ${
              isMuted
                ? 'bg-red-600/90 border-red-500 text-white shadow-lg shadow-red-900/40'
                : 'bg-gray-800/80 border-gray-700 text-white hover:bg-gray-700'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-md border transition-all ${
              isVideoOff
                ? 'bg-red-600/90 border-red-500 text-white shadow-lg shadow-red-900/40'
                : 'bg-gray-800/80 border-gray-700 text-white hover:bg-gray-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Switch Camera (Front/Back) */}
          <button
            onClick={toggleCameraFacing}
            className="p-3.5 sm:p-4 rounded-2xl backdrop-blur-md bg-gray-800/80 border border-gray-700 text-white hover:bg-gray-700 transition-all"
            title="Switch Camera (Front/Back)"
          >
            <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="px-6 py-3.5 sm:py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-xl shadow-red-900/50 flex items-center space-x-2 hover:scale-105 transition-all"
            title="End Video Call"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">End Fitting Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
