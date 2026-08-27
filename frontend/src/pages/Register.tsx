import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../lib/api';
import { Scissors, Mail, Lock, Eye, EyeOff, MapPin, Phone, User, ArrowRight, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import tailorHeroImg from '../assets/atelier_tailor_hero.jpg';
import customerHeroImg from '../assets/atelier_customer_hero.jpg';
import Select, { StylesConfig } from 'react-select';
import { COUNTRIES, CountryOption, getFlag } from '../lib/countryCodes';

// ─── Known invalid / typo TLDs to reject ────────────────────────────────────
const INVALID_TLDS = new Set([
  'con','cmo','ocm','cm','gmai','gmial','gmal','gmil','yaho','yaoo',
  'dom','cim','nett','orgg','inffo','vom','comt','nets','mailcom',
  'gmaill','hotmial','outook','outlok','yhaoo',
]);

// ─── Validate email strictly ─────────────────────────────────────────────────
function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  // Basic RFC-style check
  const basicPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!basicPattern.test(trimmed)) return 'Enter a valid email address.';

  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'Enter a valid email address.';

  const domain = parts[1];
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  // TLD must be at least 2 chars and not in known-bad list
  if (tld.length < 2) return 'Email domain extension is too short.';
  if (INVALID_TLDS.has(tld)) return `"${tld}" is not a valid domain extension. Did you make a typo?`;

  // Catch very common typos in domain name itself
  const domainName = domainParts.slice(0, -1).join('.');
  const DOMAIN_TYPOS: Record<string, string> = {
    'gmial': 'gmail', 'gmai': 'gmail', 'gmal': 'gmail', 'gmali': 'gmail',
    'yaho': 'yahoo', 'yaoo': 'yahoo', 'yhaoo': 'yahoo',
    'hotmial': 'hotmail', 'outook': 'outlook', 'outlok': 'outlook',
  };
  if (DOMAIN_TYPOS[domainName]) {
    return `Did you mean "${DOMAIN_TYPOS[domainName]}.com"?`;
  }

  // Consecutive dots
  if (/\.{2,}/.test(domain)) return 'Email domain contains consecutive dots.';

  return null; // valid
}

// ─── Validate local phone number for selected country ────────────────────────
function validatePhone(localNumber: string, country: CountryOption): string | null {
  const digits = localNumber.replace(/\D/g, '');
  if (digits.length === 0) return null; // optional field

  if (digits.length < country.minDigits || digits.length > country.maxDigits) {
    return `${country.label} phone numbers must have ${country.minDigits === country.maxDigits ? country.minDigits : `${country.minDigits}–${country.maxDigits}`} digits.`;
  }

  if (country.prefixes && country.prefixes.length > 0) {
    const matchesPrefix = country.prefixes.some((p) => digits.startsWith(p));
    if (!matchesPrefix) {
      return `${country.label} numbers must start with: ${country.prefixes.join(', ')}.`;
    }
  }

  return null;
}

export default function Register() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const { user, register, registerVerify, googleLogin } = useAuth();
  const { toast } = useToast();

  // Role determined from Join flow: 'tailor' or 'customer' (default)
  const roleParam = searchParams.get('role');
  const activeRole: 'customer' | 'tailor' = roleParam === 'tailor' ? 'tailor' : 'customer';

  // 2-Step Registration Flow (1 = Form, 2 = 6-digit OTP Verification)
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
  });

  // Country code state
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  // Portal target set after mount to avoid React DOM reconciliation errors
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalTarget(document.body); }, []);

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // 15-minute expiration countdown & 60s resend cooldown
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins in seconds
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'email') {
      setEmailError(validateEmail(value));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-().+]/g, '');
    setLocalPhone(raw);
    setPhoneError(validatePhone(raw, selectedCountry));
    // Compose full international number for form submission
    const digits = raw.replace(/\D/g, '');
    setForm((prev) => ({ ...prev, phone: digits ? `${selectedCountry.dialCode}${digits}` : '' }));
  };

  const handleCountryChange = (option: CountryOption | null) => {
    if (!option) return;
    setSelectedCountry(option);
    setLocalPhone('');
    setPhoneError(null);
    setForm((prev) => ({ ...prev, phone: '' }));
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

  // Step 1: Submit Registration Form (triggers 6-digit email OTP)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Email validation
    const emailErr = validateEmail(form.email);
    if (emailErr) {
      setEmailError(emailErr);
      setError(emailErr);
      return;
    }

    // Phone validation (if provided)
    if (localPhone.trim()) {
      const phoneErr = validatePhone(localPhone, selectedCountry);
      if (phoneErr) {
        setPhoneError(phoneErr);
        setError(phoneErr);
        return;
      }
    }

    // Client-side password validation
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError('Password must contain at least one number');
      return;
    }

    setLoading(true);
    try {
      await register({
        ...form,
        role: activeRole,
      });
      toast.success('Verification code dispatched to your email!');
      setStep(2);
      setTimeLeft(900);
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await authAPI.register({
        ...form,
        role: activeRole,
      });
      toast.success('A fresh verification code has been dispatched to your email.');
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

  // Step 2: Verify 6-digit OTP & Complete Registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await registerVerify({
        ...form,
        code: fullCode,
        role: activeRole,
      });
      toast.success(
        activeRole === 'tailor'
          ? 'Tailor account created & verified successfully!'
          : 'Welcome to የደስደስ Fashion!'
      );
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration OTP verification error:', err);
      setError(err.response?.data?.error || 'Invalid or expired verification code. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  // One-Click Google Registration / Login
  const handleGoogleAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        await googleLogin({ token: tokenResponse.access_token, role: activeRole });
        toast.success(
          activeRole === 'tailor'
            ? 'Tailor account created successfully with Google!'
            : 'Welcome to የደስደስ Fashion!'
        );
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Google register error:', err);
        setError(err.response?.data?.error || 'Google sign-up failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('Google OAuth error:', errorResponse);
      setError('Google registration was cancelled or failed. Please try again.');
    },
  });

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row font-sans ${isDark ? 'bg-[#0f1117] text-white' : 'bg-white text-slate-900'}`}>
      
      {/* ========================================================= */}
      {/* LEFT HALF: HERO BRANDING & VISUAL PANEL */}
      {/* ========================================================= */}
      <div className="relative hidden lg:flex lg:w-1/2 min-h-screen flex-col justify-between p-12 overflow-hidden bg-slate-950 text-white select-none">
        {/* Background Image with Cinematic Lighting */}
        <div className="absolute inset-0 z-0">
          <img
            src={activeRole === 'tailor' ? tailorHeroImg : customerHeroImg}
            alt="Tailor Background"
            className="w-full h-full object-cover opacity-55 transform scale-105 transition-all duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-transparent to-black/30" />
        </div>

        {/* Top Tailoring Branding */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center space-x-2">
            <span className="text-xs font-bold tracking-[0.28em] text-slate-300 uppercase">
              የደስደስ Fashion
            </span>
          </Link>
        </div>

        {/* Center Headline & Subtitle */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="w-12 h-1 bg-amber-500 rounded-full mb-2" />
          
          {activeRole === 'tailor' ? (
            <>
              <h1 className="text-5xl xl:text-6xl font-serif font-normal tracking-tight leading-[1.15] text-white">
                Craft.<br />
                Curate.<br />
                Create.
              </h1>
              <p className="text-base text-slate-300 leading-relaxed font-light">
                Join our network of master craftspersons. Manage clients, digital measurements, and bespoke orders in one seamless workspace.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-5xl xl:text-6xl font-serif font-normal tracking-tight leading-[1.15] text-white">
                Bespoke<br />
                style,<br />
                tailored for you.
              </h1>
              <p className="text-base text-slate-300 leading-relaxed font-light">
                Discover master tailors, place custom orders, and experience precision 3D AI body scanning.
              </p>
            </>
          )}
        </div>

        {/* Bottom indicator */}
        <div className="relative z-10 text-xs text-slate-400">
          የደስደስ Fashion · Bespoke Tailoring & Custom Orders
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT HALF: REGISTER / VERIFY CONTAINER */}
      {/* ========================================================= */}
      <div className={`w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 min-h-screen ${
        isDark ? 'bg-[#0f1117]' : 'bg-[#fafafa]'
      }`}>
        
        {/* Top Brand for Mobile / Back Action */}
        <div className="flex items-center justify-between mb-6">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Registration</span>
            </button>
          ) : (
            <Link to="/" className="lg:hidden flex items-center space-x-2">
              <div className="bg-amber-600 p-1.5 rounded-lg text-white">
                <Scissors className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                የደስደስ <span className="text-amber-500">Fashion</span>
              </span>
            </Link>
          )}
        </div>

        {/* Main Center Box */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">

          {/* ========================================================= */}
          {/* STEP 1: REGISTRATION FORM */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Welcome Titles */}
              <div className="space-y-2">
                <h2 className={`text-3xl sm:text-4xl font-serif tracking-tight font-normal ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeRole === 'tailor' ? 'Join as a tailor' : 'Create your account'}
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {activeRole === 'tailor'
                    ? 'Create your tailor profile and begin accepting custom orders.'
                    : 'Sign up to discover master tailors and commission custom garments.'}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                  isDark ? 'bg-red-950/50 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitForm} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className={`block text-xs font-medium mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {activeRole === 'tailor' ? 'Tailor / Shop Name *' : 'Full Name *'}
                  </label>
                  <div className={`flex items-center px-4 py-3 rounded-2xl border-2 transition-all ${
                    isDark
                      ? 'bg-[#171923] border-slate-700 focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/20'
                      : 'bg-white border-slate-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-500/20 shadow-sm'
                  }`}>
                    <User className={`h-4 w-4 mr-3 flex-shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <input
                      type="text"
                      required
                      minLength={2}
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={`w-full bg-transparent outline-none text-sm font-semibold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-purple-300' : 'text-purple-900'
                  }`}>
                    Email address *
                  </label>
                  <div className={`flex items-center px-4 py-3 rounded-2xl border-2 transition-all ${
                    emailError
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : isDark
                        ? 'bg-[#171923] border-slate-700 focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/20'
                        : 'bg-white border-slate-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-500/20 shadow-sm'
                  }`}>
                    <Mail className={`h-4 w-4 mr-3 flex-shrink-0 ${emailError ? 'text-red-500' : isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className={`w-full bg-transparent outline-none text-sm font-semibold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                  </div>
                  {emailError && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium">{emailError}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-purple-300' : 'text-purple-900'
                  }`}>
                    Password *
                  </label>
                  <div className={`flex items-center px-4 py-3 rounded-2xl border-2 transition-all ${
                    isDark
                      ? 'bg-[#171923] border-slate-700 focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/20'
                      : 'bg-white border-slate-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-500/20 shadow-sm'
                  }`}>
                    <Lock className={`h-4 w-4 mr-3 flex-shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className={`w-full bg-transparent outline-none text-sm font-semibold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className={`text-[11px] font-medium mt-1 ${isDark ? 'text-purple-400/80' : 'text-purple-800'}`}>
                    Must be at least 8 characters with 1 uppercase letter & 1 number.
                  </p>
                </div>

                {/* Location & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-purple-300' : 'text-purple-900'
                    }`}>
                      City / Location
                    </label>
                    <div className={`flex items-center px-4 py-2.5 rounded-2xl border-2 transition-all ${
                      isDark
                        ? 'bg-[#171923] border-slate-700 focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/20'
                        : 'bg-white border-slate-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-500/20 shadow-sm'
                    }`}>
                      <MapPin className={`h-3.5 w-3.5 mr-2 flex-shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      <input
                        type="text"
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        className={`w-full bg-transparent outline-none text-xs font-semibold ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-purple-300' : 'text-purple-900'
                    }`}>
                      Phone number
                    </label>

                    {/* Single unified phone input */}
                    <div className={`flex items-center rounded-2xl border-2 transition-all ${
                      phoneError
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : isDark
                          ? 'bg-[#171923] border-slate-700 focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/20'
                          : 'bg-white border-slate-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-500/20 shadow-sm'
                    }`}>
                      {/* Country selector — borderless, blends into container */}
                      <Select<CountryOption>
                        options={COUNTRIES}
                        value={selectedCountry}
                        onChange={handleCountryChange}
                        isSearchable
                        menuPlacement="auto"
                        menuPosition="fixed"
                        menuPortalTarget={portalTarget}
                        placeholder="🌍"
                        formatOptionLabel={(opt, { context }) =>
                          context === 'menu' ? (
                            // Dropdown: flag emoji + full country name + dial code
                            <span className="flex items-center gap-2 text-xs">
                              <span className="text-base leading-none">{getFlag(opt.value)}</span>
                              <span className="font-medium flex-1 truncate">{opt.label}</span>
                              <span className={`font-mono text-[11px] font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{opt.dialCode}</span>
                            </span>
                          ) : (
                            // Control (selected) — compact: flag + dial code only
                            <span className="flex items-center gap-1 text-xs font-bold">
                              <span className="text-base leading-none">{getFlag(opt.value)}</span>
                              <span className={`font-mono ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{opt.dialCode}</span>
                            </span>
                          )
                        }
                        getOptionLabel={(opt) => `${opt.label} ${opt.dialCode}`}
                        getOptionValue={(opt) => opt.value}
                        styles={{
                          container: (base) => ({ ...base, flexShrink: 0 }),
                          control: (base) => ({
                            ...base,
                            background: 'transparent',
                            border: 'none',
                            boxShadow: 'none',
                            minHeight: 40,
                            paddingLeft: 10,
                            paddingRight: 0,
                            cursor: 'pointer',
                            width: 110,
                          }),
                          valueContainer: (base) => ({ ...base, padding: '0 4px 0 0' }),
                          singleValue: (base) => ({ ...base, color: isDark ? '#fff' : '#0f172a', margin: 0 }),
                          menu: (base) => ({
                            ...base,
                            background: isDark ? '#1e2130' : '#fff',
                            zIndex: 9999,
                            borderRadius: 14,
                            overflow: 'hidden',
                            width: 260,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.22)',
                          }),
                          menuList: (base) => ({ ...base, padding: 4 }),
                          option: (base, state) => ({
                            ...base,
                            background: state.isSelected ? '#7c3aed' : state.isFocused ? (isDark ? '#2d3148' : '#f5f3ff') : 'transparent',
                            color: state.isSelected ? '#fff' : isDark ? '#e2e8f0' : '#1e293b',
                            fontSize: 12,
                            borderRadius: 10,
                            cursor: 'pointer',
                            padding: '7px 10px',
                          }),
                          input: (base) => ({ ...base, color: isDark ? '#fff' : '#0f172a', fontSize: 12, margin: 0 }),
                          placeholder: (base) => ({ ...base, fontSize: 14, color: isDark ? '#64748b' : '#94a3b8' }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          indicatorSeparator: () => ({ display: 'none' }),
                          dropdownIndicator: (base) => ({
                            ...base,
                            padding: '0 6px 0 0',
                            color: isDark ? '#64748b' : '#94a3b8',
                          }),
                        } as StylesConfig<CountryOption>}
                      />

                      {/* Thin divider */}
                      <div className={`w-px self-stretch my-2 ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />

                      {/* Number input */}
                      <input
                        type="tel"
                        name="phone"
                        value={localPhone}
                        onChange={handlePhoneChange}
                        inputMode="numeric"
                        className={`flex-1 bg-transparent outline-none text-xs font-semibold px-3 py-2.5 ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Hint / error below */}
                    {phoneError ? (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">{phoneError}</p>
                    ) : (
                      <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {selectedCountry.flag} {selectedCountry.label} {selectedCountry.dialCode} &middot; {selectedCountry.minDigits === selectedCountry.maxDigits ? `${selectedCountry.minDigits} digits` : `${selectedCountry.minDigits}–${selectedCountry.maxDigits} digits`}
                        {selectedCountry.prefixes ? ` · starts with ${selectedCountry.prefixes.slice(0, 3).join(', ')}` : ''}
                      </p>
                    )}
                  </div>

                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#1c1917] hover:bg-black text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Sending verification code...' : 'Continue with Email'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {/* Social Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className={`border-t w-full ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                <span className={`absolute px-3 text-[11px] font-medium uppercase tracking-wider ${
                  isDark ? 'bg-[#0f1117] text-slate-500' : 'bg-[#fafafa] text-slate-400'
                }`}>
                  or
                </span>
              </div>

              {/* Clean Google Sign-Up Button */}
              <div>
                <button
                  type="button"
                  onClick={() => handleGoogleAuth()}
                  disabled={googleLoading || loading}
                  className={`w-full flex items-center justify-center py-3 px-4 rounded-xl border text-xs font-bold transition-all disabled:opacity-60 cursor-pointer ${
                    isDark
                      ? 'bg-[#171923] border-slate-800 hover:bg-slate-800 text-white'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs'
                  }`}
                >
                  {googleLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent mr-2.5" />
                  ) : (
                    <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>{googleLoading ? 'Connecting with Google...' : activeRole === 'tailor' ? 'Register with Google as Tailor' : 'Continue with Google'}</span>
                </button>
              </div>

              {/* Already have an account link */}
              <div className="text-center pt-2">
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Already have an account?{' '}
                  <Link
                    to={`/login?role=${activeRole}`}
                    className="font-bold text-amber-600 hover:text-amber-500 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION */}
          {/* ========================================================= */}
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
                  Verify Your Email
                </h2>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  We sent a 6-digit code to <strong className="text-amber-500">{form.email}</strong>.{' '}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="underline hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    Edit details
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

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6-Digit OTP Box */}
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Enter 6-Digit Code
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

                {/* Submit Verification */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#1c1917] hover:bg-black text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Verifying...' : 'Verify & Complete Account'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer Note */}
        <div className="text-center pt-6">
          <p className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            © 2026 የደስደስ Fashion · Custom Tailoring Platform
          </p>
        </div>

      </div>
    </div>
  );
}