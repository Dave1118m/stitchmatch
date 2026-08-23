import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  Zap,
  Ruler,
  User
} from 'lucide-react';

interface AICameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { frontPhotoUrl: string; sidePhotoUrl: string; heightCm: number }) => void;
}

type PoseType = 'height' | 'front' | 'side' | 'review';

export default function AICameraScannerModal({ isOpen, onClose, onComplete }: AICameraScannerModalProps) {
  const { t } = useTranslation();
  const isDark = useDarkMode();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Height Calibration State
  const [heightCm, setHeightCm] = useState<number>(175);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [feetVal, setFeetVal] = useState<number>(5);
  const [inchesVal, setInchesVal] = useState<number>(9);

  // Flow State (Height -> Front -> Side -> Review)
  const [currentPose, setCurrentPose] = useState<PoseType>('height');
  const [capturedPhotos, setCapturedPhotos] = useState<{
    front: string | null;
    side: string | null;
  }>({
    front: null,
    side: null,
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

  // Sync feet/inches to cm
  const updateFeetInches = (ft: number, inc: number) => {
    setFeetVal(ft);
    setInchesVal(inc);
    const totalInches = ft * 12 + inc;
    const cm = Math.round(totalInches * 2.54);
    setHeightCm(cm);
  };

  // Initialize Camera & Sensors when opened
  useEffect(() => {
    if (isOpen) {
      if (currentPose === 'front' || currentPose === 'side') {
        startCamera();
      }
      initOrientationSensor();
    } else {
      stopCamera();
      clearInterval(countdownIntervalRef.current);
    }

    return () => {
      stopCamera();
      clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, currentPose, facingMode]);

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
        const pitch = Math.round(e.beta); // 90 deg is vertical standing phone
        setTiltAngle(pitch);
        setIsLevel(pitch >= 80 && pitch <= 100);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  };

  // Start 5-second hands-free countdown timer
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
      setCurrentPose('review');
      stopCamera();
    }
  };

  // Submit Front + Side + Height to AI measurement engine
  const handleSubmitAll = () => {
    if (capturedPhotos.front && capturedPhotos.side) {
      onComplete({
        frontPhotoUrl: capturedPhotos.front,
        sidePhotoUrl: capturedPhotos.side,
        heightCm: heightCm || 175,
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
                <span>AI Body Measurement Scanner</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                  Dual-Pose AR
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentPose === 'height' && 'Step 1: Calibrate your exact standing height'}
                {currentPose === 'front' && 'Step 2: Capture facing-front upright pose'}
                {currentPose === 'side' && 'Step 3: Capture 90° side profile pose'}
                {currentPose === 'review' && 'Step 4: Review scan & compute centimeter measurements'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(currentPose === 'front' || currentPose === 'side') && (
              <button
                onClick={toggleFacingMode}
                className={`p-2 rounded-xl border transition-colors ${
                  isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
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
          {[
            { id: 'height', label: '1. Height Calibration', done: heightCm > 50 },
            { id: 'front', label: '2. Front Pose', done: capturedPhotos.front !== null },
            { id: 'side', label: '3. 90° Side Profile', done: capturedPhotos.side !== null },
            { id: 'review', label: '4. AI Review', done: false }
          ].map((step, idx) => {
            const isActive = currentPose === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentPose(step.id as PoseType)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md'
                    : step.done && step.id !== 'review'
                    ? isDark ? 'text-primary-400 bg-gray-800' : 'text-primary-700 bg-primary-50'
                    : isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {step.done && step.id !== 'review' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[440px]">
          
          {/* STEP 1: HEIGHT CALIBRATION */}
          {currentPose === 'height' && (
            <div className="w-full max-w-md space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-primary-500/10 text-primary-500 mx-auto flex items-center justify-center border border-primary-500/20">
                <Ruler className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold">Calibrate Your Standing Height</h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  The AI uses your exact height as the ground-truth physical scale to convert image pixels into centimeter tailoring measurements.
                </p>
              </div>

              {/* Unit Switcher */}
              <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setHeightUnit('cm')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    heightUnit === 'cm' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Centimeters (cm)
                </button>
                <button
                  type="button"
                  onClick={() => setHeightUnit('ft')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    heightUnit === 'ft' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Feet & Inches (ft / in)
                </button>
              </div>

              {heightUnit === 'cm' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <input
                      type="number"
                      min="100"
                      max="240"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="input-field text-3xl font-mono font-extrabold text-center w-36 py-2"
                    />
                    <span className="text-xl font-bold text-primary-500">cm</span>
                  </div>

                  {/* Preset Quick Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {[160, 165, 170, 175, 180, 185, 190].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setHeightCm(preset)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          heightCm === preset 
                            ? 'bg-primary-600 border-primary-600 text-white shadow-xs' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-500'
                        }`}
                      >
                        {preset} cm
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="3"
                      max="7"
                      value={feetVal}
                      onChange={(e) => updateFeetInches(Number(e.target.value), inchesVal)}
                      className="input-field text-2xl font-mono font-bold text-center w-20 py-2"
                    />
                    <span className="font-bold text-sm">ft</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={inchesVal}
                      onChange={(e) => updateFeetInches(feetVal, Number(e.target.value))}
                      className="input-field text-2xl font-mono font-bold text-center w-20 py-2"
                    />
                    <span className="font-bold text-sm">in</span>
                  </div>
                  <span className="text-xs text-primary-500 font-bold">({heightCm} cm)</span>
                </div>
              )}

              {/* Human-Only Photo Notice */}
              <div className={`p-3.5 rounded-2xl border text-xs flex items-center space-x-2.5 ${
                isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <User className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-left leading-relaxed">
                  <strong>Human Subject Only:</strong> The AI requires full-body photos of a person standing upright in form-fitting clothing.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2 & 3: CAMERA CAPTURE (FRONT OR SIDE) */}
          {(currentPose === 'front' || currentPose === 'side') && (
            <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] shadow-2xl flex items-center justify-center">
              {/* Camera Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* AR SILHOUETTE GUIDE OVERLAY */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <svg className="w-full h-full opacity-60" viewBox="0 0 200 300">
                  {currentPose === 'front' ? (
                    // Front Facing Human Silhouette Outline
                    <g fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3">
                      <circle cx="100" cy="50" r="16" />
                      <path d="M 80,68 C 65,72 50,85 45,140 C 42,160 48,162 55,148 L 70,105 L 70,190 L 62,270 C 62,275 78,275 78,270 L 92,185 L 108,185 L 122,270 C 122,275 138,275 138,270 L 130,190 L 130,105 L 145,148 C 152,162 158,160 155,140 C 150,85 135,72 120,68 Z" />
                    </g>
                  ) : (
                    // 90° Side Profile Human Silhouette Outline
                    <g fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3">
                      <circle cx="100" cy="50" r="16" />
                      <path d="M 94,68 C 88,85 86,120 88,155 C 90,190 86,220 84,270 C 84,275 104,275 104,270 L 106,190 C 114,165 118,125 112,85 C 108,72 102,68 94,68 Z" />
                    </g>
                  )}
                  {/* Ground floor guide */}
                  <line x1="30" y1="275" x2="170" y2="275" stroke="#10b981" strokeWidth="2" />
                </svg>
              </div>

              {/* Guidance Banner */}
              <div className="absolute top-3 inset-x-3 text-center">
                <span className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-bold shadow-lg border border-white/20">
                  {currentPose === 'front' 
                    ? '🧍 Front View: Stand upright facing camera with arms slightly relaxed at sides' 
                    : '🚶 90° Side Profile: Turn 90° to the side so the AI can measure your body depth'}
                </span>
              </div>

              {/* COUNTDOWN OVERLAY */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-pulse">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary-600 text-white flex items-center justify-center font-black text-5xl sm:text-6xl shadow-2xl border-4 border-white">
                    {countdown}
                  </div>
                  <p className="text-white text-base sm:text-lg font-bold mt-4 tracking-wide shadow-black drop-shadow">
                    Hold steady for capture...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REVIEW DUAL POSES & HEIGHT */}
          {currentPose === 'review' && (
            <div className="w-full max-w-2xl space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Both Dual Poses & Calibrated Height Ready
                </div>
                <h3 className="text-lg sm:text-xl font-bold">Review Your 3D Fitting Scan</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Calibrated Height: <strong className="text-primary-500 font-mono">{heightCm} cm</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Front Thumbnail */}
                <div className={`p-3 rounded-2xl border flex flex-col items-center ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xs font-bold mb-1.5">1. Front View</span>
                  <div className="w-full h-44 rounded-xl overflow-hidden bg-black relative">
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
                    <span>Retake Front</span>
                  </button>
                </div>

                {/* Side Thumbnail */}
                <div className={`p-3 rounded-2xl border flex flex-col items-center ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xs font-bold mb-1.5">2. 90° Side Profile</span>
                  <div className="w-full h-44 rounded-xl overflow-hidden bg-black relative">
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
                    <span>Retake Side</span>
                  </button>
                </div>
              </div>

              {/* Privacy Note */}
              <div className={`p-3 rounded-xl flex items-center justify-center text-xs ${
                isDark ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500 shrink-0" />
                <span>Photos are encrypted and strictly analyzed for Made-to-Measure digital tailoring.</span>
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
                onClick={onClose}
                className="btn-secondary text-xs sm:text-sm px-5 py-2.5 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentPose('front')}
                className="btn-primary text-xs sm:text-sm px-7 py-2.5 rounded-full font-bold shadow-lg flex items-center space-x-1.5"
              >
                <span>Proceed to Camera Pose</span>
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
                <span>Capture Now</span>
              </button>

              <button
                onClick={startCountdown}
                disabled={countdown !== null}
                className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-2.5 rounded-full font-bold shadow-lg flex items-center space-x-2 animate-pulse"
              >
                <Timer className="w-5 h-5" />
                <span>{countdown !== null ? `Capturing in ${countdown}s...` : '5s Hands-Free Timer'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentPose('side')}
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
                <span>Convert Pixels to Centimeters</span>
                <ChevronRight className="w-4 h-4 ml-1 -mr-1" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
