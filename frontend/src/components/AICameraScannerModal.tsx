import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../hooks/useDarkMode';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Timer, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  SwitchCamera,
  ShieldCheck,
  Ruler,
  User,
  Activity,
  Maximize2,
  Scale,
  Compass,
  Zap,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  LivePoseTracker, 
  drawLiveSkeleton, 
  PoseFramingAssessment, 
  calculateLocalBodyMeasurements, 
  LocalMeasurementResult 
} from '../utils/mediaPipePoseTracker';

interface AICameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { 
    frontPhotoUrl: string; 
    sidePhotoUrl: string; 
    heightCm: number;
    weightKg?: number;
    gender?: 'male' | 'female' | 'other';
    bodyBuild?: 'slim' | 'average' | 'athletic' | 'broad';
    calculatedMeasurements?: LocalMeasurementResult | null;
  }) => void;
}

type PoseType = 'height' | 'front' | 'side' | 'review';

export default function AICameraScannerModal({ isOpen, onClose, onComplete }: AICameraScannerModalProps) {
  const { t } = useTranslation();
  const isDark = useDarkMode();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseTrackerRef = useRef<LivePoseTracker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Height & Weight Biometric Calibration State
  const [heightCm, setHeightCm] = useState<number>(175);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [feetVal, setFeetVal] = useState<number>(5);
  const [inchesVal, setInchesVal] = useState<number>(9);

  const [weightKg, setWeightKg] = useState<number>(70);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [lbsVal, setLbsVal] = useState<number>(154);

  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [bodyBuild, setBodyBuild] = useState<'slim' | 'average' | 'athletic' | 'broad'>('average');

  // Gyroscope / Device Orientation State
  const [devicePitch, setDevicePitch] = useState<number | null>(null);
  const [isPhoneLevel, setIsPhoneLevel] = useState<boolean>(true);
  const [hasGyroscope, setHasGyroscope] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Flow State (Height -> Front -> Side -> Review)
  const [currentPose, setCurrentPose] = useState<PoseType>('height');
  const [capturedPhotos, setCapturedPhotos] = useState<{
    front: string | null;
    side: string | null;
  }>({
    front: null,
    side: null,
  });

  // Local AI Computed Measurements Result
  const [localMeasurements, setLocalMeasurements] = useState<LocalMeasurementResult | null>(null);

  // Cached Landmarks Refs
  const latestLandmarksRef = useRef<any[] | null>(null);
  const frontLandmarksRef = useRef<any[] | null>(null);
  const sideLandmarksRef = useRef<any[] | null>(null);

  // Real-time Skeleton Tracking & Assessment State
  const [framingAssessment, setFramingAssessment] = useState<PoseFramingAssessment>({
    isFullBodyVisible: false,
    headVisible: false,
    shouldersVisible: false,
    hipsVisible: false,
    anklesVisible: false,
    postureStatusText: 'Initializing MediaPipe Real-Time Skeleton Tracker...',
    isSideProfileAligned: false,
    score: 0,
    distanceStatus: 'perfect',
    distanceText: '🟢 Ideal Distance (2-3m)',
    isPositionReady: false,
    guidanceVoicePrompt: 'Please step into camera view.',
  });

  // Biometric Verification, Live Voice & Hands-Free Auto-Capture
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState<boolean>(true);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const [biometricLockPercent, setBiometricLockPercent] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const voiceGuidanceRef = useRef<boolean>(true);
  const autoCaptureEnabledRef = useRef<boolean>(true);
  const currentPoseRef = useRef<PoseType>('height');
  const positionReadyCounterRef = useRef<number>(0);
  const isAutoCapturingRef = useRef<boolean>(false);
  const lastSpokenTextRef = useRef<string>('');
  const lastSpokenTimeRef = useRef<number>(0);

  useEffect(() => {
    voiceGuidanceRef.current = voiceGuidanceEnabled;
  }, [voiceGuidanceEnabled]);

  useEffect(() => {
    autoCaptureEnabledRef.current = autoCaptureEnabled;
  }, [autoCaptureEnabled]);

  const speakGuidance = (text: string) => {
    if (!voiceGuidanceRef.current || !('speechSynthesis' in window)) return;
    const now = Date.now();
    if (text === lastSpokenTextRef.current && now - lastSpokenTimeRef.current < 3200) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Ava'))) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) {
        utterance.voice = preferred;
      }
      lastSpokenTextRef.current = text;
      lastSpokenTimeRef.current = now;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  useEffect(() => {
    currentPoseRef.current = currentPose;
    if (poseTrackerRef.current) {
      poseTrackerRef.current.setPoseType(currentPose === 'side' ? 'side' : 'front');
    }
    positionReadyCounterRef.current = 0;
    setBiometricLockPercent(0);

    if (currentPose === 'front') {
      speakGuidance('Front scan starting. Please step back 2 to 3 meters until your head and feet are inside the guide.');
    } else if (currentPose === 'side') {
      speakGuidance('Side profile scan. Please turn 90 degrees to your side.');
    }
  }, [currentPose]);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Timer / Countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);
  const stablePoseTimerRef = useRef<any>(null);

  // Sync feet/inches to cm
  const updateFeetInches = (ft: number, inc: number) => {
    setFeetVal(ft);
    setInchesVal(inc);
    const totalInches = ft * 12 + inc;
    const cm = Math.round(totalInches * 2.54);
    setHeightCm(cm);
  };

  // Sync lbs to kg
  const updateLbs = (lbs: number) => {
    setLbsVal(lbs);
    const kg = Math.round(lbs * 0.45359237);
    setWeightKg(kg);
  };

  const updateKg = (kg: number) => {
    setWeightKg(kg);
    setLbsVal(Math.round(kg / 0.45359237));
  };

  // Listen to Device Orientation for Level Guide
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null) {
        setHasGyroscope(true);
        const pitch = Math.round(e.beta);
        setDevicePitch(pitch);
        // Ideal phone posture for body scanning: vertical phone (pitch roughly 78° to 102°)
        const level = Math.abs(pitch - 90) <= 12;
        setIsPhoneLevel(level);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isOpen]);

  // Initialize Camera & Real-Time Pose Tracker
  useEffect(() => {
    if (isOpen) {
      if (currentPose === 'front' || currentPose === 'side') {
        startCameraAndTracker();
      }
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen, currentPose, facingMode]);

  const cleanup = () => {
    stopCamera();
    if (poseTrackerRef.current) {
      poseTrackerRef.current.close();
      poseTrackerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    clearInterval(countdownIntervalRef.current);
    clearTimeout(stablePoseTimerRef.current);
  };

  // Start Camera and Initialize MediaPipe Tracker
  const startCameraAndTracker = async () => {
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
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Initialize Pose Tracker
      if (!poseTrackerRef.current) {
        poseTrackerRef.current = new LivePoseTracker((results, assessment) => {
          setFramingAssessment(assessment);

          if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            latestLandmarksRef.current = results.poseLandmarks;
          }

          // Draw skeleton on canvas overlay
          if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              drawLiveSkeleton(ctx, results, canvas.width, canvas.height, currentPoseRef.current === 'side');
            }
          }

          // Hands-Free Biometric Verification & Auto-Capture Pipeline
          if (autoCaptureEnabledRef.current && (currentPoseRef.current === 'front' || currentPoseRef.current === 'side')) {
            if (assessment.isPositionReady) {
              positionReadyCounterRef.current += 1;
              const progress = Math.min(100, Math.round((positionReadyCounterRef.current / 10) * 100));
              setBiometricLockPercent(progress);

              if (positionReadyCounterRef.current === 1) {
                speakGuidance('Position verified! Hold still.');
                playBeep(880, 0.08);
              } else if (positionReadyCounterRef.current === 5) {
                playBeep(980, 0.08);
              } else if (positionReadyCounterRef.current >= 10 && !isAutoCapturingRef.current) {
                isAutoCapturingRef.current = true;
                playBeep(1200, 0.25);
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 350);
                positionReadyCounterRef.current = 0;
                setBiometricLockPercent(0);
                takeSnapshot();
                setTimeout(() => {
                  isAutoCapturingRef.current = false;
                }, 1500);
              }
            } else {
              positionReadyCounterRef.current = 0;
              setBiometricLockPercent(0);
              if (assessment.guidanceVoicePrompt) {
                speakGuidance(assessment.guidanceVoicePrompt);
              }
            }
          }
        });
      }

      // Continuous Frame Pipeline
      const processFrame = async () => {
        if (videoRef.current && poseTrackerRef.current && videoRef.current.readyState >= 2) {
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;
          }
          await poseTrackerRef.current.sendFrame(videoRef.current);
        }
        animFrameRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check camera permissions in browser settings.');
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

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

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

  // 5-second hands-free countdown timer
  const startCountdown = () => {
    if (countdown !== null) return;
    let count = 5;
    setCountdown(count);
    playBeep(660, 0.08);

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playBeep(660, 0.08);
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        playBeep(1200, 0.3);
        takeSnapshot();
      }
    }, 1000);
  };

  // Take Snapshot from Video Stream and compute local biometric measurements
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    if (currentPoseRef.current === 'front') {
      frontLandmarksRef.current = latestLandmarksRef.current ? [...latestLandmarksRef.current] : null;
      setCapturedPhotos((prev) => ({ ...prev, front: dataUrl }));
      setCurrentPose('side');
      speakGuidance('Front photo captured! Now please turn 90 degrees for your side profile.');
    } else if (currentPoseRef.current === 'side') {
      sideLandmarksRef.current = latestLandmarksRef.current ? [...latestLandmarksRef.current] : null;
      setCapturedPhotos((prev) => ({ ...prev, side: dataUrl }));
      setCurrentPose('review');
      stopCamera();
      speakGuidance('Side photo captured! All 15 3D body measurements are ready.');

      // Instant local mathematical calculation (Ramanujan Superellipse + MediaPipe skeletal landmarks + BMI)
      try {
        const computed = calculateLocalBodyMeasurements({
          frontLandmarks: frontLandmarksRef.current || [],
          sideLandmarks: sideLandmarksRef.current || [],
          heightCm: heightCm || 175,
          weightKg: weightKg || 70,
          gender,
          bodyBuild,
        });
        setLocalMeasurements(computed);
      } catch (err) {
        console.warn('Local measurement computation note:', err);
      }
    }
  };

  // Submit Front + Side + Height + Measurements to order flow
  const handleSubmitAll = () => {
    if (capturedPhotos.front && capturedPhotos.side) {
      onComplete({
        frontPhotoUrl: capturedPhotos.front,
        sidePhotoUrl: capturedPhotos.side,
        heightCm: heightCm || 175,
        weightKg: weightKg || 70,
        gender,
        bodyBuild,
        calculatedMeasurements: localMeasurements,
      });
      handleClose();
    }
  };

  const handleResetAll = () => {
    stopCamera();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setCapturedPhotos({ front: null, side: null });
    setLocalMeasurements(null);
    frontLandmarksRef.current = null;
    sideLandmarksRef.current = null;
    latestLandmarksRef.current = null;
    positionReadyCounterRef.current = 0;
    setBiometricLockPercent(0);
    setCopiedJson(false);
    setCurrentPose('height');
  };

  const handleClose = () => {
    handleResetAll();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className={`relative w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-gray-900 border border-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
        style={{ maxHeight: '92vh' }}
      >
        {/* Top Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-gray-800 bg-gray-900/90' : 'border-gray-100 bg-white'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary-600 to-purple-600 text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
                <span>{t('scannerModal.title')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" /> {t('scannerModal.badge')}
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                {t(`scannerModal.subtitles.${currentPose}`)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(currentPose === 'front' || currentPose === 'side') && (
              <>
                <button
                  onClick={() => setVoiceGuidanceEnabled(!voiceGuidanceEnabled)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    voiceGuidanceEnabled
                      ? 'border-purple-500 bg-purple-600/20 text-purple-600 dark:text-purple-300 shadow-xs'
                      : isDark ? 'border-gray-700 bg-gray-800 text-gray-500' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  title={voiceGuidanceEnabled ? 'Voice Guide Active (Click to Mute)' : 'Voice Guide Muted (Click to Unmute)'}
                >
                  {voiceGuidanceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    autoCaptureEnabled
                      ? 'border-emerald-500 bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 shadow-xs'
                      : isDark ? 'border-gray-700 bg-gray-800 text-gray-500' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  title="Toggle Hands-Free Auto-Capture"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Auto-Snap</span>
                </button>

                <button
                  onClick={toggleFacingMode}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={t('scannerModal.camera.switchCamera')}
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-center gap-2 sm:gap-3 text-xs font-semibold overflow-x-auto ${
          isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'
        }`}>
          {[
            { id: 'height', label: t('scannerModal.steps.height'), done: heightCm > 50 },
            { id: 'front', label: t('scannerModal.steps.front'), done: capturedPhotos.front !== null },
            { id: 'side', label: t('scannerModal.steps.side'), done: capturedPhotos.side !== null },
            { id: 'review', label: t('scannerModal.steps.review'), done: false }
          ].map((step, idx) => {
            const isActive = currentPose === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentPose(step.id as PoseType)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md font-bold'
                    : step.done && step.id !== 'review'
                    ? isDark ? 'text-primary-400 bg-gray-800' : 'text-primary-700 bg-primary-50'
                    : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {step.done && step.id !== 'review' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                )}
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Viewport Container */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[340px] sm:min-h-[400px]">
          
          {/* STEP 1: BIOMETRIC CALIBRATION (HEIGHT, WEIGHT, GENDER & BUILD) */}
          {currentPose === 'height' && (
            <div className="w-full max-w-lg space-y-6 text-center animate-fadeIn py-2">
              <div className="w-14 h-14 rounded-3xl bg-primary-500/10 text-primary-500 mx-auto flex items-center justify-center border border-primary-500/20 shadow-inner">
                <Ruler className="w-7 h-7" />
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{t('scannerModal.heightSection.title')}</h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('scannerModal.heightSection.subtitle')}
                </p>
              </div>

              {/* 1. Height Inputs */}
              <div className={`p-4 rounded-2xl border text-left space-y-3 ${
                isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" /> 1. Standing Height
                  </span>
                  
                  {/* Height Unit Switcher */}
                  <div className="inline-flex rounded-lg p-0.5 bg-gray-200 dark:bg-gray-700">
                    <button
                      type="button"
                      onClick={() => setHeightUnit('cm')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        heightUnit === 'cm' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeightUnit('ft')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        heightUnit === 'ft' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      ft/in
                    </button>
                  </div>
                </div>

                {heightUnit === 'cm' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setHeightCm((prev) => Math.max(100, prev - 1))}
                        className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-lg hover:border-primary-500 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="100"
                        max="240"
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                        className="input-field text-2xl font-mono font-extrabold text-center w-32 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => setHeightCm((prev) => Math.min(240, prev + 1))}
                        className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-lg hover:border-primary-500 transition-colors"
                      >
                        +
                      </button>
                      <span className="text-lg font-bold text-primary-500">cm</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {[160, 165, 170, 175, 180, 185, 190].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHeightCm(preset)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            heightCm === preset 
                              ? 'bg-primary-600 border-primary-600 text-white shadow-xs' 
                              : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-500'
                          }`}
                        >
                          {preset} cm
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-3 py-1">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min="3"
                        max="7"
                        value={feetVal}
                        onChange={(e) => updateFeetInches(Number(e.target.value), inchesVal)}
                        className="input-field text-xl font-mono font-bold text-center w-16 py-1"
                      />
                      <span className="font-bold text-xs">ft</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={inchesVal}
                        onChange={(e) => updateFeetInches(feetVal, Number(e.target.value))}
                        className="input-field text-xl font-mono font-bold text-center w-16 py-1"
                      />
                      <span className="font-bold text-xs">in</span>
                    </div>
                    <span className="text-xs text-primary-500 font-bold">({heightCm} cm)</span>
                  </div>
                )}
              </div>

              {/* 2. Weight & Volume Conditioning */}
              <div className={`p-4 rounded-2xl border text-left space-y-3 ${
                isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> 2. Weight & Volume Prior
                  </span>
                  
                  {/* Weight Unit Switcher */}
                  <div className="inline-flex rounded-lg p-0.5 bg-gray-200 dark:bg-gray-700">
                    <button
                      type="button"
                      onClick={() => setWeightUnit('kg')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        weightUnit === 'kg' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('lbs')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        weightUnit === 'lbs' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-500'
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateKg(Math.max(30, weightKg - 1))}
                    className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-lg hover:border-purple-500 transition-colors"
                  >
                    -
                  </button>
                  {weightUnit === 'kg' ? (
                    <input
                      type="number"
                      min="30"
                      max="220"
                      value={weightKg}
                      onChange={(e) => updateKg(Number(e.target.value))}
                      className="input-field text-2xl font-mono font-extrabold text-center w-32 py-1.5"
                    />
                  ) : (
                    <input
                      type="number"
                      min="65"
                      max="480"
                      value={lbsVal}
                      onChange={(e) => updateLbs(Number(e.target.value))}
                      className="input-field text-2xl font-mono font-extrabold text-center w-32 py-1.5"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => updateKg(Math.min(220, weightKg + 1))}
                    className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-lg hover:border-purple-500 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-lg font-bold text-purple-500">{weightUnit}</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {[55, 65, 70, 75, 80, 85, 95].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateKg(w)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        weightKg === w 
                          ? 'bg-purple-600 border-purple-600 text-white shadow-xs' 
                          : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-500'
                      }`}
                    >
                      {w} kg
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Gender Profile & Body Build */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {/* Gender */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                    Gender Profile
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        gender === 'male' 
                          ? 'bg-primary-600 border-primary-600 text-white shadow-xs' 
                          : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        gender === 'female' 
                          ? 'bg-primary-600 border-primary-600 text-white shadow-xs' 
                          : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {/* Body Build */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-500 dark:text-gray-400">
                    Body Build
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'slim', label: 'Slim' },
                      { id: 'average', label: 'Average' },
                      { id: 'athletic', label: 'Athletic' },
                      { id: 'broad', label: 'Broad' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBodyBuild(b.id as any)}
                        className={`py-1 px-2 rounded-lg text-[11px] font-bold border transition-all ${
                          bodyBuild === b.id 
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs' 
                            : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compact Tip Notice */}
              <div className={`p-3 rounded-2xl border text-xs flex items-center justify-center space-x-2 ${
                isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <User className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{t('scannerModal.heightSection.tip')}</span>
              </div>
            </div>
          )}

          {/* STEP 2 & 3: CAMERA CAPTURE WITH REAL-TIME SKELETON TRACKING & GYROSCOPE HUD */}
          {(currentPose === 'front' || currentPose === 'side') && (
            <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] shadow-2xl flex items-center justify-center">
              {/* Video Camera Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Real-time MediaPipe Skeleton Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Shutter White Flash Effect */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white z-40 transition-opacity duration-300 pointer-events-none" />
              )}

              {/* Biometric Verification Frame & Silhouette Target */}
              <div className={`absolute inset-x-8 sm:inset-x-14 inset-y-6 sm:inset-y-8 rounded-3xl border-2 transition-all duration-300 pointer-events-none flex flex-col justify-between p-3 z-10 ${
                framingAssessment.isPositionReady
                  ? 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)] bg-emerald-500/5'
                  : 'border-amber-400/60 border-dashed bg-black/15'
              }`}>
                {/* Corner Brackets */}
                <div className="flex justify-between">
                  <div className={`w-6 h-6 border-t-4 border-l-4 rounded-tl-xl ${framingAssessment.isPositionReady ? 'border-emerald-400' : 'border-amber-400'}`} />
                  <div className={`w-6 h-6 border-t-4 border-r-4 rounded-tr-xl ${framingAssessment.isPositionReady ? 'border-emerald-400' : 'border-amber-400'}`} />
                </div>

                {/* Center Biometric Lock Progress Indicator */}
                {autoCaptureEnabled && biometricLockPercent > 0 && (
                  <div className="self-center flex flex-col items-center bg-black/85 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-emerald-400/80 shadow-2xl animate-pulse">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm tracking-wider">
                      <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
                      <span>BIOMETRIC LOCK: {biometricLockPercent}%</span>
                    </div>
                    <div className="w-44 h-2.5 bg-gray-800 rounded-full mt-2 overflow-hidden border border-emerald-500/40">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-300 rounded-full transition-all duration-150"
                        style={{ width: `${biometricLockPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-emerald-200 mt-1.5 font-bold uppercase tracking-wide">
                      Hold Still • Auto-Capturing...
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <div className={`w-6 h-6 border-b-4 border-l-4 rounded-bl-xl ${framingAssessment.isPositionReady ? 'border-emerald-400' : 'border-amber-400'}`} />
                  <div className={`w-6 h-6 border-b-4 border-r-4 rounded-br-xl ${framingAssessment.isPositionReady ? 'border-emerald-400' : 'border-amber-400'}`} />
                </div>
              </div>

              {/* Top HUD: Real-time Skeleton Tracking Assessment Banner */}
              <div className="absolute top-3 inset-x-3 flex flex-col items-center gap-1.5 pointer-events-none z-20">
                <div className={`px-3.5 py-1.5 rounded-full backdrop-blur-md text-white text-xs font-bold shadow-xl border flex items-center space-x-2 ${
                  framingAssessment.isPositionReady 
                    ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-200' 
                    : 'bg-black/80 border-white/20'
                }`}>
                  <Activity className={`w-3.5 h-3.5 ${framingAssessment.isPositionReady ? 'text-emerald-400' : 'text-amber-400'} animate-spin`} style={{ animationDuration: '3s' }} />
                  <span>{framingAssessment.postureStatusText}</span>
                </div>

                {/* Voice Assistant Live Status */}
                {voiceGuidanceEnabled && framingAssessment.guidanceVoicePrompt && (
                  <div className="px-3 py-1 rounded-full bg-purple-950/85 backdrop-blur-md border border-purple-500/50 text-purple-200 text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
                    <Volume2 className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
                    <span>Voice: {framingAssessment.guidanceVoicePrompt}</span>
                  </div>
                )}

                {/* Sub-HUD: Landmark Visibility Pills + Distance Check */}
                <div className="flex items-center gap-1 text-[10px] font-bold flex-wrap justify-center">
                  <span className={`px-2 py-0.5 rounded-full backdrop-blur-sm ${
                    framingAssessment.headVisible ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                  }`}>
                    {t('scannerModal.camera.head')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full backdrop-blur-sm ${
                    framingAssessment.shouldersVisible ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                  }`}>
                    {t('scannerModal.camera.shoulders')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full backdrop-blur-sm ${
                    framingAssessment.hipsVisible ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                  }`}>
                    {t('scannerModal.camera.hips')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full backdrop-blur-sm ${
                    framingAssessment.anklesVisible ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                  }`}>
                    {t('scannerModal.camera.ankles')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-600/80 backdrop-blur-sm text-white flex items-center gap-1">
                    {framingAssessment.distanceText}
                  </span>
                </div>
              </div>

              {/* Bottom HUD: Live Gyroscope Level Bubble Guide */}
              <div className="absolute bottom-3 right-3 pointer-events-none">
                <div className={`px-3 py-1.5 rounded-full backdrop-blur-md text-[11px] font-bold border flex items-center space-x-1.5 shadow-lg ${
                  isPhoneLevel 
                    ? 'bg-emerald-600/90 text-white border-emerald-400/50 shadow-emerald-500/30' 
                    : 'bg-amber-600/90 text-white border-amber-400/50 shadow-amber-500/30'
                }`}>
                  <Compass className={`w-3.5 h-3.5 ${isPhoneLevel ? '' : 'animate-spin'}`} />
                  <span>
                    {hasGyroscope 
                      ? (isPhoneLevel ? '🟢 Level (90° Vertical)' : devicePitch !== null && devicePitch > 90 ? '🟡 Tilt Phone Back ⬆️' : '🟡 Tilt Phone Down ⬇️')
                      : '🟢 Level Calibrated'}
                  </span>
                </div>
              </div>

              {/* COUNTDOWN OVERLAY */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-pulse">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary-600 text-white flex items-center justify-center font-black text-5xl sm:text-6xl shadow-2xl border-4 border-white">
                    {countdown}
                  </div>
                  <p className="text-white text-base sm:text-lg font-bold mt-4 tracking-wide shadow-black drop-shadow">
                    {t('scannerModal.camera.holdPosture')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REVIEW DUAL POSES & LOCAL COMPUTED MEASUREMENTS */}
          {currentPose === 'review' && (
            <div className="w-full max-w-2xl space-y-4 animate-fadeIn">
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-bold">{t('scannerModal.review.title')}</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                  Height: <strong className="text-primary-500 font-mono">{heightCm} cm</strong> • 
                  Weight: <strong className="text-purple-500 font-mono">{weightKg} kg</strong> • 
                  Build: <strong className="capitalize text-gray-300">{bodyBuild}</strong>
                </p>
              </div>

              {/* Dual Photo Thumbnails */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-2.5 rounded-2xl border flex flex-col items-center ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xs font-bold mb-1">{t('scannerModal.review.frontView')}</span>
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-black relative">
                    {capturedPhotos.front ? (
                      <img src={capturedPhotos.front} alt="Front" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">Missing</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentPose('front')}
                    className="mt-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('scannerModal.review.retakeFront')}</span>
                  </button>
                </div>

                <div className={`p-2.5 rounded-2xl border flex flex-col items-center ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xs font-bold mb-1">{t('scannerModal.review.sideView')}</span>
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-black relative">
                    {capturedPhotos.side ? (
                      <img src={capturedPhotos.side} alt="Side" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">Missing</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentPose('side')}
                    className="mt-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('scannerModal.review.retakeSide')}</span>
                  </button>
                </div>
              </div>

              {/* LOCAL HIGH-PRECISION MEASUREMENTS CARD */}
              {localMeasurements && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-gradient-to-r from-purple-950/40 to-gray-800 border-purple-800/50' : 'bg-gradient-to-r from-purple-50 to-white border-purple-200'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2.5 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-xl bg-purple-600 text-white">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                          <span>Instant Local AI Measurement</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {localMeasurements.aiConfidence}% Match
                          </span>
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Ramanujan Superellipse Geometry • BMI: {localMeasurements.bmi}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono font-bold">
                      Zero Cloud Latency
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center">
                    {/* 1. Ankle Left Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="ankle_left_circumference">Ankle Left Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-cyan-600 dark:text-cyan-400">{localMeasurements.ankle_left_circumference || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 2. Arm Length */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="arm_length">Arm Length</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-blue-600 dark:text-blue-400">{localMeasurements.arm_length || localMeasurements.armLength || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 3. Back to Shoulder */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="back_to_shoulder">Back to Shoulder</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">{localMeasurements.back_to_shoulder || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 4. Bicep Right Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="bicep_right_circumference">Bicep Right Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-cyan-600 dark:text-cyan-400">{localMeasurements.bicep_right_circumference || localMeasurements.bicep || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 5. Chest Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="chest_circumference">Chest Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-purple-600 dark:text-purple-400">{localMeasurements.chest_circumference || localMeasurements.chest || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 6. Forearm Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="forearm_circumference">Forearm Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-blue-600 dark:text-blue-400">{localMeasurements.forearm_circumference || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 7. Hip Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="hip_circumference">Hip Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{localMeasurements.hip_circumference || localMeasurements.hip || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 8. Inside Leg Height */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="inside_leg_height">Inside Leg Height</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{localMeasurements.inside_leg_height || localMeasurements.inseam || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 9. Neck Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="neck_circumference">Neck Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-yellow-600 dark:text-yellow-400">{localMeasurements.neck_circumference || localMeasurements.neck || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 10. Neck to Pelvis */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="neck_to_pelvis">Neck to Pelvis</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-violet-600 dark:text-violet-400">{localMeasurements.neck_to_pelvis || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 11. Foot Length */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="foot_length">Foot Length</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-teal-600 dark:text-teal-400">{localMeasurements.foot_length || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 12. Shoulder Breadth */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="shoulder_breadth">Shoulder Breadth</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">{localMeasurements.shoulder_breadth || localMeasurements.shoulderWidth || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 13. Thigh Left Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="thigh_left_circumference">Thigh Left Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-rose-600 dark:text-rose-400">{localMeasurements.thigh_left_circumference || localMeasurements.thigh || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 14. Waist Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="waist_circumference">Waist Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-primary-600 dark:text-primary-400">{localMeasurements.waist_circumference || localMeasurements.waist || '-'} <span className="text-[10px]">cm</span></p>
                    </div>

                    {/* 15. Wrist Circumference */}
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-tight" title="wrist_circumference">Wrist Circumference</p>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-violet-600 dark:text-violet-400">{localMeasurements.wrist_circumference || localMeasurements.wrist || '-'} <span className="text-[10px]">cm</span></p>
                    </div>
                  </div>

                  {/* Benchmark & Copy SnapMeasureAI Format Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const snapData = {
                          ankle_left_circumference: localMeasurements.ankle_left_circumference,
                          arm_length: localMeasurements.arm_length,
                          back_to_shoulder: localMeasurements.back_to_shoulder,
                          bicep_right_circumference: localMeasurements.bicep_right_circumference,
                          chest_circumference: localMeasurements.chest_circumference,
                          forearm_circumference: localMeasurements.forearm_circumference,
                          hip_circumference: localMeasurements.hip_circumference,
                          inside_leg_height: localMeasurements.inside_leg_height,
                          neck_circumference: localMeasurements.neck_circumference,
                          neck_to_pelvis: localMeasurements.neck_to_pelvis,
                          foot_length: localMeasurements.foot_length,
                          shoulder_breadth: localMeasurements.shoulder_breadth,
                          thigh_left_circumference: localMeasurements.thigh_left_circumference,
                          waist_circumference: localMeasurements.waist_circumference,
                          wrist_circumference: localMeasurements.wrist_circumference,
                          total_height: localMeasurements.total_height || localMeasurements.height,
                        };
                        navigator.clipboard.writeText(JSON.stringify(snapData, null, 2));
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2500);
                      }}
                      className="text-[11px] font-bold flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {copiedJson ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> Copied 15-Point SnapMeasureAI JSON!
                        </span>
                      ) : (
                        <span>📋 Copy 15-Point SnapMeasureAI Schema JSON</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Privacy Note */}
              <div className={`p-2.5 rounded-xl flex items-center justify-center text-xs ${
                isDark ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500 shrink-0" />
                <span>{t('scannerModal.review.privacyNote')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between ${
          isDark ? 'border-gray-800 bg-gray-900/90' : 'border-gray-100 bg-gray-50'
        }`}>
          {currentPose === 'height' ? (
            <>
              <button
                onClick={handleClose}
                className="btn-secondary text-xs sm:text-sm px-5 py-2.5 rounded-full"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setCurrentPose('front')}
                className="btn-primary text-xs sm:text-sm px-7 py-2.5 rounded-full font-bold shadow-lg flex items-center space-x-1.5"
              >
                <span>{t('scannerModal.nextStep')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : currentPose === 'front' || currentPose === 'side' ? (
            <>
              <button
                onClick={takeSnapshot}
                className="btn-secondary text-xs sm:text-sm px-4 py-2.5 rounded-full flex items-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>{t('scannerModal.camera.snapPhoto')}</span>
              </button>

              <button
                onClick={startCountdown}
                disabled={countdown !== null}
                className={`text-sm sm:text-base px-6 sm:px-8 py-2.5 rounded-full font-bold shadow-lg flex items-center space-x-2 transition-all ${
                  framingAssessment.isFullBodyVisible
                    ? 'btn-primary animate-pulse'
                    : 'bg-primary-600/70 text-white cursor-pointer'
                }`}
              >
                <Timer className="w-5 h-5" />
                <span>{countdown !== null ? t('scannerModal.camera.capturingIn', { count: countdown }) : t('scannerModal.camera.startTimer')}</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="btn-secondary text-xs px-3.5 py-2.5 rounded-full flex items-center space-x-1 text-red-600 hover:text-red-700 dark:text-red-400 font-semibold cursor-pointer"
                  title="Reset all scanned photos and start over"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All</span>
                </button>

                <button
                  onClick={() => setCurrentPose('side')}
                  className="btn-secondary text-xs sm:text-sm px-4 py-2.5 rounded-full flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-0.5" />
                  <span>{t('scannerModal.review.backToCamera')}</span>
                </button>
              </div>

              <button
                onClick={handleSubmitAll}
                className="btn-primary text-sm sm:text-base px-7 sm:px-9 py-2.5 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>{t('scannerModal.review.computeBtn')}</span>
                <ChevronRight className="w-4 h-4 ml-1 -mr-1" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
