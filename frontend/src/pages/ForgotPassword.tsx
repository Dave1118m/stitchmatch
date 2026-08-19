import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../lib/api';
import { Scissors, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import tailorHeroImg from '../assets/atelier_tailor_hero.jpg';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const { toast } = useToast();

  const urlEmail = searchParams.get('email') || '';
  const urlCode = searchParams.get('code') || '';

  const [step, setStep] = useState<1 | 2 | 3>(urlCode && urlEmail ? 2 : 1);
  const [email, setEmail] = useState(urlEmail);
  const [otp, setOtp] = useState(urlCode ? urlCode.split('').slice(0, 6) : ['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 15-minute expiration countdown & 60s resend cooldown
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins in seconds
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    let cooldownTimer: any;
    if (resendCooldown > 0) {
      cooldownTimer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle OTP digit change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key in OTP input
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full OTP code
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Step 1: Request Reset Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      toast.success('Verification code sent to your email!');
      setStep(2);
      setTimeLeft(900);
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      toast.success('A new verification code has been dispatched to your email.');
      setResendCooldown(60);
      setTimeLeft(900);
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        email: email.trim(),
        code: fullCode,
        newPassword,
      });
      setStep(3);
      toast.success('Your password has been successfully reset!');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.error || 'Failed to reset password. The verification code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row font-sans ${isDark ? 'bg-[#0f1117] text-white' : 'bg-white text-slate-900'}`}>
      
      {/* ========================================================= */}
      {/* LEFT HALF: HERO BRANDING PANEL */}
      {/* ========================================================= */}
      <div className="relative hidden lg:flex lg:w-1/2 min-h-screen flex-col justify-between p-12 overflow-hidden bg-slate-950 text-white select-none">
        <div className="absolute inset-0 z-0">
          <img
            src={tailorHeroImg}
            alt="Atelier Background"
            className="w-full h-full object-cover opacity-50 transform scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center space-x-2">
            <span className="text-xs font-bold tracking-[0.28em] text-slate-300 uppercase">
              Atelier Security
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="w-12 h-1 bg-amber-500 rounded-full mb-2" />
          <h1 className="text-4xl xl:text-5xl font-serif font-normal tracking-tight leading-[1.15] text-white">
            Secure Account<br />
            Recovery.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-light">
            We use encrypted OTP verification codes and industry-standard security protocols to protect your StitchMatch portfolio and bespoke commission data.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          StitchMatch Atelier Cryptographic Protection
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT HALF: FORGOT PASSWORD INTERFACE */}
      {/* ========================================================= */}
      <div className={`w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 min-h-screen ${
        isDark ? 'bg-[#0f1117]' : 'bg-[#fafafa]'
      }`}>
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/login" className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-amber-500 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </Link>

          <Link to="/" className="lg:hidden flex items-center space-x-2">
            <div className="bg-amber-600 p-1.5 rounded-lg text-white">
              <Scissors className="h-4 w-4" />
            </div>
            <span className="font-bold text-base tracking-tight">
              Stitch<span className="text-amber-500">Match</span>
            </span>
          </Link>
        </div>

        {/* Center Container */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">

          {/* STEP 1: REQUEST CODE */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h2 className={`text-3xl font-serif tracking-tight font-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Forgot password?
                </h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your registered email address and we will dispatch a 6-digit verification code to reset your password.
                </p>
              </div>

              {error && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                  isDark ? 'bg-red-950/50 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email address
                  </label>
                  <div className={`flex items-center px-3.5 py-3 rounded-xl border transition-all ${
                    isDark ? 'bg-[#171923] border-slate-700/80 focus-within:border-slate-400' : 'bg-white border-slate-200 focus-within:border-slate-900 shadow-2xs'
                  }`}>
                    <Mail className={`h-4 w-4 mr-3 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className={`w-full bg-transparent outline-none text-sm ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1c1917] hover:bg-black text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Sending code...' : 'Send Verification Code'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: ENTER OTP & NEW PASSWORD */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                    timeLeft > 60
                      ? isDark ? 'bg-amber-950/40 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-red-950/40 border-red-800/50 text-red-400 animate-pulse'
                  }`}>
                    ⏱️ Code expires: {formatTime(timeLeft)}
                  </div>
                </div>

                <h2 className={`text-3xl font-serif tracking-tight font-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Verify & Reset
                </h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  We sent a 6-digit code to <strong className="text-amber-500">{email}</strong>.{' '}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="underline hover:text-amber-400 transition-colors"
                  >
                    Change email
                  </button>
                </p>
              </div>

              {error && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                  isDark ? 'bg-red-950/50 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* 6-Digit OTP Box */}
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    6-Digit Verification Code
                  </label>
                  <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className={`w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border transition-all ${
                          digit ? 'border-amber-500 bg-amber-500/10 text-amber-500' : ''
                        } ${
                          isDark
                            ? 'bg-[#171923] border-slate-700 focus:border-amber-500 text-white'
                            : 'bg-white border-slate-200 focus:border-amber-500 text-slate-900 shadow-2xs'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Code Action */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || loading}
                    className={`inline-flex items-center space-x-1.5 text-xs font-medium transition-colors ${
                      resendCooldown > 0
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-amber-600 hover:text-amber-500 cursor-pointer'
                    }`}
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}</span>
                  </button>
                </div>

                {/* New Password */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    New Password
                  </label>
                  <div className={`flex items-center px-3.5 py-2.5 rounded-xl border transition-all ${
                    isDark ? 'bg-[#171923] border-slate-700/80 focus-within:border-slate-400' : 'bg-white border-slate-200 focus-within:border-slate-900 shadow-2xs'
                  }`}>
                    <Lock className={`h-4 w-4 mr-3 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-transparent outline-none text-sm ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Must be 8+ chars with 1 uppercase & 1 number.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Confirm New Password
                  </label>
                  <div className={`flex items-center px-3.5 py-2.5 rounded-xl border transition-all ${
                    isDark ? 'bg-[#171923] border-slate-700/80 focus-within:border-slate-400' : 'bg-white border-slate-200 focus-within:border-slate-900 shadow-2xs'
                  }`}>
                    <Lock className={`h-4 w-4 mr-3 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-transparent outline-none text-sm ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1c1917] hover:bg-black text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Updating password...' : 'Reset Password'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 3 && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className={`text-3xl font-serif tracking-tight font-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Password Reset Complete
                </h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your StitchMatch account credentials have been securely updated. You can now sign in with your new password.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1c1917] hover:bg-black text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="text-center pt-8">
          <p className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            © 2026 StitchMatch Atelier · Security & Integrity
          </p>
        </div>

      </div>
    </div>
  );
}
