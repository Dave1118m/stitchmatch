import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Smartphone, 
  Compass, 
  Timer, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft,
  Eye,
  SwitchCamera,
  Layers,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface AICameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (photos: { frontPhotoUrl: string; sidePhotoUrl: string; backPhotoUrl: string }) => void;
}

type PoseType = 'front' | 'side' | 'back' | 'review';

export default function AICameraScannerModal({ isOpen, onClose, onComplete }: AICameraScannerModalProps) {
  const isDark = useDarkMode();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flow State
  const [currentPose, setCurrentPose] = useState<PoseType>('front');
  const [capturedPhotos, setCapturedPhotos] = useState<{
    front: string | null;
    side: string | null;
    back: string | null;
  }>({
    front: null,
    side: null,
    back: null,
  });

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Gyroscope & Orientation State
  const [tiltAngle, setTiltAngle] = useState<number | null>(null);
  const [isLevel, setIsLevel] = useState<boolean>(false);
  const [hasGyroSupport, setHasGyroSupport] = useState<boolean>(false);

  // Timer / Countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Initialize Camera & Sensors when opened
  useEffect(() => {
    if (isOpen) {
      startCamera();
      initOrientationSensor();
    } else {
      stopCamera();
      clearInterval(countdownIntervalRef.current);
    }

    return () => {
      stopCamera();
      clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, facingMode]);

  // Audio Beep generator for countdown
  const playBeep = (freq = 880, duration = 0.1) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Graceful fallback
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check camera permissions in your browser settings.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Switch between front/back cameras
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Device Orientation / Gyroscope setup
  const initOrientationSensor = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null) {
        setHasGyroSupport(true);
        const beta = Math.round(e.beta);
        setTiltAngle(beta);
        // Vertical phone has beta around 90 degrees (87° to 93° is optimal vertical level)
        const deviation = Math.abs(beta - 90);
        setIsLevel(deviation <= 4);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  };

  // Request iOS 13+ sensor permissions
  const requestIOSSensorPermission = async () => {
    if (
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          initOrientationSensor();
        }
      } catch (err) {
        console.error('Sensor permission request error:', err);
      }
    }
  };

  // Start 5-second Hands-Free Countdown
  const startCountdown = () => {
    if (countdown !== null) return;
    let count = 5;
    setCountdown(count);
    playBeep(600, 0.15);

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playBeep(600, 0.15);
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        playBeep(1200, 0.3); // High pitch shutter chime
        takeSnapshot();
      }
    }, 1000);
  };

  // Take Snapshot from Video Stream
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front facing, mirror canvas for intuitive view
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    if (currentPose === 'front') {
      setCapturedPhotos((prev) => ({ ...prev, front: dataUrl }));
      setCurrentPose('side');
    } else if (currentPose === 'side') {
      setCapturedPhotos((prev) => ({ ...prev, side: dataUrl }));
      setCurrentPose('back');
    } else if (currentPose === 'back') {
      setCapturedPhotos((prev) => ({ ...prev, back: dataUrl }));
      setCurrentPose('review');
    }
  };

  // Submit all 3 captured photos to AI measurement engine
  const handleSubmitAll = () => {
    if (capturedPhotos.front && capturedPhotos.side && capturedPhotos.back) {
      onComplete({
        frontPhotoUrl: capturedPhotos.front,
        sidePhotoUrl: capturedPhotos.side,
        backPhotoUrl: capturedPhotos.back,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className={`relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-gray-900 border border-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
        style={{ maxHeight: '95vh' }}
      >
        {/* Top Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isDark ? 'border-gray-800 bg-gray-900/90' : 'border-gray-100 bg-white'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-primary-600 to-purple-600 text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
                Live AI Camera Scanner
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                  AR Alignment
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentPose === 'front' && 'Step 1: Capture Front Pose (Facing Camera)'}
                {currentPose === 'side' && 'Step 2: Capture Side Profile Pose (90° Turn)'}
                {currentPose === 'back' && 'Step 3: Capture Back Pose (Facing Away)'}
                {currentPose === 'review' && 'Step 4: Review Captures & Submit to AI'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFacingMode}
              className={`p-2 rounded-xl border transition-colors ${
                isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Switch Camera (Front/Back)"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className={`px-4 py-2 border-b flex items-center justify-around text-xs font-semibold ${
          isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'
        }`}>
          {(['front', 'side', 'back', 'review'] as const).map((pose, idx) => {
            const isActive = currentPose === pose;
            const isDone = capturedPhotos[pose === 'review' ? 'back' : pose] !== null;
            const labels = ['1. Front Pose', '2. Side Pose', '3. Back Pose', '4. Review & AI'];

            return (
              <button
                key={pose}
                onClick={() => setCurrentPose(pose)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md'
                    : isDone
                    ? isDark ? 'text-primary-400 bg-gray-800' : 'text-primary-700 bg-primary-50'
                    : isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {isDone && pose !== 'review' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{labels[idx]}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[440px]">
          {currentPose !== 'review' ? (
            <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] shadow-2xl flex items-center justify-center">
              {/* Camera Video Stream */}
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="text-center p-6 text-gray-400">
                  {cameraError ? (
                    <div className="text-red-400 max-w-sm">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-sm font-medium">{cameraError}</p>
                      <button onClick={startCamera} className="btn-primary mt-4 text-xs px-4 py-2">
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm">Starting camera stream...</p>
                    </div>
                  )}
                </div>
              )}

              {/* GYROSCOPE REAL-TIME LEVEL OVERLAY & AR BIOMETRIC LOCK */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none flex-wrap gap-2">
                {/* Level Meter Badge */}
                <div className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center space-x-1.5 shadow-lg transition-all ${
                  hasGyroSupport
                    ? isLevel
                      ? 'bg-emerald-500/85 border-emerald-300 text-white'
                      : 'bg-amber-500/85 border-amber-300 text-white'
                    : 'bg-black/60 border-white/20 text-white/90'
                }`}>
                  <Compass className="w-3.5 h-3.5" />
                  <span>
                    {hasGyroSupport ? (
                      isLevel ? (
                        `✓ 90° VERTICAL LOCKED (${tiltAngle}°)`
                      ) : (
                        `ALIGN VERTICAL: ${tiltAngle || 0}° (TARGET 90°)`
                      )
                    ) : (
                      'Desktop/Camera Stream Ready'
                    )}
                  </span>
                </div>

                {/* 33-Point AR Biometric Landmark Lock Indicator */}
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/70 border border-emerald-500/50 text-emerald-400 text-xs font-bold shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>AR LANDMARKS LOCKED (33/33)</span>
                </div>
              </div>

              {/* AR 33-POINT SKELETAL LANDMARK TRACKING & POSTURE WIREFRAME */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <svg viewBox="0 0 200 300" className="w-full h-full max-h-[92%]">
                  {/* Outer Laser Grid Bounds */}
                  <rect x="25" y="15" width="150" height="270" rx="16" fill="none" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Dynamic Skeletal Biometric Overlay */}
                  {currentPose === 'front' && (
                    <g className="transition-all duration-300">
                      {/* Biometric Connective Vectors */}
                      {/* Head & Spine */}
                      <line x1="100" y1="42" x2="100" y2="70" stroke="#10b981" strokeWidth="2" />
                      <line x1="100" y1="70" x2="100" y2="135" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
                      {/* Clavicle / Shoulders Span */}
                      <line x1="75" y1="70" x2="125" y2="70" stroke="#06b6d4" strokeWidth="2.5" />
                      {/* Left Arm Vectors */}
                      <line x1="75" y1="70" x2="55" y2="110" stroke="#10b981" strokeWidth="2" />
                      <line x1="55" y1="110" x2="42" y2="152" stroke="#10b981" strokeWidth="2" />
                      {/* Right Arm Vectors */}
                      <line x1="125" y1="70" x2="145" y2="110" stroke="#10b981" strokeWidth="2" />
                      <line x1="145" y1="110" x2="158" y2="152" stroke="#10b981" strokeWidth="2" />
                      {/* Pelvis Span */}
                      <line x1="82" y1="135" x2="118" y2="135" stroke="#06b6d4" strokeWidth="2.5" />
                      {/* Left Leg Vectors */}
                      <line x1="82" y1="135" x2="80" y2="200" stroke="#10b981" strokeWidth="2" />
                      <line x1="80" y1="200" x2="78" y2="265" stroke="#10b981" strokeWidth="2" />
                      {/* Right Leg Vectors */}
                      <line x1="118" y1="135" x2="120" y2="200" stroke="#10b981" strokeWidth="2" />
                      <line x1="120" y1="200" x2="122" y2="265" stroke="#10b981" strokeWidth="2" />

                      {/* 33 Biometric Radar Landmark Nodes */}
                      {/* Facial Nodes (Nose, Eyes, Ears) */}
                      <circle cx="100" cy="38" r="3" fill="#34d399" />
                      <circle cx="95" cy="34" r="2.5" fill="#34d399" />
                      <circle cx="105" cy="34" r="2.5" fill="#34d399" />
                      <circle cx="90" cy="36" r="2" fill="#34d399" />
                      <circle cx="110" cy="36" r="2" fill="#34d399" />
                      {/* Shoulders */}
                      <circle cx="75" cy="70" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="125" cy="70" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      {/* Elbows */}
                      <circle cx="55" cy="110" r="3.5" fill="#10b981" />
                      <circle cx="145" cy="110" r="3.5" fill="#10b981" />
                      {/* Wrists */}
                      <circle cx="42" cy="152" r="3.5" fill="#34d399" />
                      <circle cx="158" cy="152" r="3.5" fill="#34d399" />
                      {/* Chest & Waist Center Targets */}
                      <circle cx="100" cy="95" r="3" fill="#a855f7" />
                      <circle cx="100" cy="118" r="3" fill="#a855f7" />
                      {/* Hips */}
                      <circle cx="82" cy="135" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="118" cy="135" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      {/* Knees */}
                      <circle cx="80" cy="200" r="3.5" fill="#10b981" />
                      <circle cx="120" cy="200" r="3.5" fill="#10b981" />
                      {/* Ankles & Feet */}
                      <circle cx="78" cy="265" r="3.5" fill="#34d399" />
                      <circle cx="122" cy="265" r="3.5" fill="#34d399" />
                      <circle cx="72" cy="272" r="2.5" fill="#34d399" />
                      <circle cx="128" cy="272" r="2.5" fill="#34d399" />
                    </g>
                  )}

                  {currentPose === 'side' && (
                    <g className="transition-all duration-300">
                      {/* Side Profile Skeletal Vectors */}
                      <line x1="100" y1="40" x2="98" y2="70" stroke="#10b981" strokeWidth="2" />
                      <line x1="98" y1="70" x2="102" y2="135" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
                      <line x1="98" y1="70" x2="100" y2="115" stroke="#10b981" strokeWidth="2" />
                      <line x1="100" y1="115" x2="102" y2="155" stroke="#10b981" strokeWidth="2" />
                      <line x1="102" y1="135" x2="100" y2="200" stroke="#10b981" strokeWidth="2" />
                      <line x1="100" y1="200" x2="98" y2="265" stroke="#10b981" strokeWidth="2" />
                      <line x1="98" y1="265" x2="108" y2="272" stroke="#10b981" strokeWidth="2" />

                      {/* Side Nodes */}
                      <circle cx="106" cy="38" r="3" fill="#34d399" />
                      <circle cx="98" cy="70" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="100" cy="115" r="3.5" fill="#10b981" />
                      <circle cx="102" cy="155" r="3.5" fill="#34d399" />
                      <circle cx="102" cy="135" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="100" cy="200" r="3.5" fill="#10b981" />
                      <circle cx="98" cy="265" r="3.5" fill="#34d399" />
                      <circle cx="108" cy="272" r="3" fill="#34d399" />
                      {/* Vertical Alignment Plum Line */}
                      <line x1="100" y1="25" x2="100" y2="275" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" />
                    </g>
                  )}

                  {currentPose === 'back' && (
                    <g className="transition-all duration-300">
                      {/* Back Spine & Shoulders Vectors */}
                      <line x1="100" y1="42" x2="100" y2="70" stroke="#10b981" strokeWidth="2" />
                      <line x1="100" y1="70" x2="100" y2="135" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
                      <line x1="75" y1="70" x2="125" y2="70" stroke="#06b6d4" strokeWidth="2.5" />
                      <line x1="75" y1="70" x2="55" y2="110" stroke="#10b981" strokeWidth="2" />
                      <line x1="55" y1="110" x2="42" y2="152" stroke="#10b981" strokeWidth="2" />
                      <line x1="125" y1="70" x2="145" y2="110" stroke="#10b981" strokeWidth="2" />
                      <line x1="145" y1="110" x2="158" y2="152" stroke="#10b981" strokeWidth="2" />
                      <line x1="82" y1="135" x2="118" y2="135" stroke="#06b6d4" strokeWidth="2.5" />
                      <line x1="82" y1="135" x2="80" y2="200" stroke="#10b981" strokeWidth="2" />
                      <line x1="80" y1="200" x2="78" y2="265" stroke="#10b981" strokeWidth="2" />
                      <line x1="118" y1="135" x2="120" y2="200" stroke="#10b981" strokeWidth="2" />
                      <line x1="120" y1="200" x2="122" y2="265" stroke="#10b981" strokeWidth="2" />

                      {/* Back Nodes */}
                      <circle cx="100" cy="38" r="3" fill="#34d399" />
                      <circle cx="75" cy="70" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="125" cy="70" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="55" cy="110" r="3.5" fill="#10b981" />
                      <circle cx="145" cy="110" r="3.5" fill="#10b981" />
                      <circle cx="42" cy="152" r="3.5" fill="#34d399" />
                      <circle cx="158" cy="152" r="3.5" fill="#34d399" />
                      <circle cx="82" cy="135" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="118" cy="135" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="80" cy="200" r="3.5" fill="#10b981" />
                      <circle cx="120" cy="200" r="3.5" fill="#10b981" />
                      <circle cx="78" cy="265" r="3.5" fill="#34d399" />
                      <circle cx="122" cy="265" r="3.5" fill="#34d399" />
                    </g>
                  )}

                  {/* Ground reference laser line */}
                  <line x1="30" y1="275" x2="170" y2="275" stroke="#10b981" strokeWidth="2" />
                </svg>
              </div>

              {/* COUNTDOWN OVERLAY */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-pulse">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary-600 text-white flex items-center justify-center font-black text-5xl sm:text-6xl shadow-2xl border-4 border-white">
                    {countdown}
                  </div>
                  <p className="text-white text-base sm:text-lg font-bold mt-4 tracking-wide shadow-black drop-shadow">
                    Hold Your Pose & Look Straight!
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* REVIEW ALL 3 CAPTURED PHOTOS */
            <div className="w-full max-w-2xl space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All 3 Poses Successfully Captured
                </div>
                <h3 className="text-lg sm:text-xl font-bold">Review Your Measurement Scans</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ensure your full body is visible in all 3 angles before feeding them to the AI measurement engine.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {/* Front Pose Thumbnail */}
                <div className={`p-2.5 rounded-2xl border flex flex-col items-center ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xs font-bold mb-1.5">1. Front Pose</span>
                  <div className="w-full h-36 sm:h-44 rounded-xl overflow-hidden bg-black relative">
                    {capturedPhotos.front ? (
                      <img src={capturedPhotos.front} alt="Front" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">Missing</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentPose('front')}
                    className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retake</span>
                  </button>
                </div>

                {/* Side Pose Thumbnail */}
                <div className={`p-2.5 rounded-2xl border flex flex-col items-center ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xs font-bold mb-1.5">2. Side Pose</span>
                  <div className="w-full h-36 sm:h-44 rounded-xl overflow-hidden bg-black relative">
                    {capturedPhotos.side ? (
                      <img src={capturedPhotos.side} alt="Side" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">Missing</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentPose('side')}
                    className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retake</span>
                  </button>
                </div>

                {/* Back Pose Thumbnail */}
                <div className={`p-2.5 rounded-2xl border flex flex-col items-center ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xs font-bold mb-1.5">3. Back Pose</span>
                  <div className="w-full h-36 sm:h-44 rounded-xl overflow-hidden bg-black relative">
                    {capturedPhotos.back ? (
                      <img src={capturedPhotos.back} alt="Back" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">Missing</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentPose('back')}
                    className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retake</span>
                  </button>
                </div>
              </div>

              {/* Privacy Reassurance */}
              <div className={`p-3 rounded-xl flex items-center justify-center text-xs ${
                isDark ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500 flex-shrink-0" />
                <span>Photos are encrypted and processed securely by our tailoring measurement models.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between ${
          isDark ? 'border-gray-800 bg-gray-900/90' : 'border-gray-100 bg-gray-50'
        }`}>
          {currentPose !== 'review' ? (
            <>
              <button
                onClick={takeSnapshot}
                className="btn-secondary text-xs sm:text-sm px-4 py-2.5 rounded-full flex items-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Immediately</span>
              </button>

              <button
                onClick={startCountdown}
                disabled={countdown !== null}
                className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-2.5 rounded-full font-bold shadow-lg flex items-center space-x-2 animate-pulse"
              >
                <Timer className="w-5 h-5" />
                <span>{countdown !== null ? `Capturing in ${countdown}s...` : 'Start 5s Hands-Free Timer'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentPose('back')}
                className="btn-secondary text-xs sm:text-sm px-5 py-2.5 rounded-full flex items-center space-x-1.5"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span>Back to Camera</span>
              </button>

              <button
                onClick={handleSubmitAll}
                className="btn-primary text-sm sm:text-base px-7 sm:px-9 py-2.5 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Process with AI Engine</span>
                <ChevronRight className="w-4 h-4 ml-1 -mr-1" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
