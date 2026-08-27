import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { tailorsAPI } from '../lib/api';
import heroModelImg from '../assets/hero_model_transparent.png';
import LanguageSwitcher from '../components/LanguageSwitcher';
import InteractiveDotsBackground from '../components/InteractiveDotsBackground';
import AICameraScannerModal from '../components/AICameraScannerModal';
import MeasurementInstructionsModal from '../components/MeasurementInstructionsModal';
import { 
  Scissors, Search, MessageSquare, ArrowRight, LogIn, 
  UserPlus, Camera, CheckCircle, Star, Sparkles, MapPin, 
  Ruler, Clock, Award, ChevronRight, Lock, Eye, Image as ImageIcon,
  Menu, X, Sun, Moon, ChevronDown, Layers, Video, ShieldCheck,
  CheckCircle2, ExternalLink, Smartphone, HelpCircle, Check
} from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDark = useDarkMode();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredTailors, setFeaturedTailors] = useState<any[]>([]);
  const [loadingTailors, setLoadingTailors] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState<'steps' | 'features' | 'specialties' | null>(null);
  const [selectedStepModal, setSelectedStepModal] = useState<number | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFeaturedTailors();
  }, []);

  const loadFeaturedTailors = async () => {
    setLoadingTailors(true);
    try {
      const res = await tailorsAPI.search();
      if (res.data?.tailors && res.data.tailors.length > 0) {
        setFeaturedTailors(res.data.tailors.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load featured tailors', err);
    } finally {
      setLoadingTailors(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(searchQuery.trim() ? `/tailors?search=${encodeURIComponent(searchQuery.trim())}` : '/tailors'));
      return;
    }
    if (searchQuery.trim()) {
      navigate(`/tailors?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/tailors');
    }
  };

  const toggleDarkMode = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const newMode = !isCurrentlyDark;
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(newMode));
  };

  const handleMouseEnter = (menu: 'steps' | 'features' | 'specialties') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveNavDropdown(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveNavDropdown(null);
    }, 220);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveNavDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // High quality Unsplash imagery showing tailor works
  const portfolioShowcase = [
    {
      title: 'Bespoke 3-Piece Navy Tuxedo',
      category: 'Bespoke Suit',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80',
      description: 'Super 150s Italian Virgin Wool with hand-stitched silk lapels & silk lining.',
    },
    {
      title: 'Emerald Silk Satin Evening Gown',
      category: 'Haute Couture',
      image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80',
      description: 'Hand-tailored bias cut evening gown crafted from 100% pure Mulberry silk.',
    },
    {
      title: 'Charcoal Executive Double-Breasted Blazer',
      category: 'Tailored Blazer',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
      description: 'Classic peak lapels with natural horn buttons and precision hand canvas.',
    },
    {
      title: 'Red Carpet Embroidered Gown',
      category: 'Bridal & Gowns',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
      description: 'Hand-beaded corset bodice with flowing cathedral train.',
    },
  ];

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-slate-900'}`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${
        isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/95 border-slate-200/80 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="bg-gradient-to-tr from-primary-600 via-purple-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-md group-hover:scale-105 transition-transform">
              <Scissors className="h-5 w-5" />
            </div>
            <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              የደስደስ <span className="text-primary-600">Fashion</span>
            </span>
          </Link>

          {/* Nav Links - Desktop with Directional Arrow Overlays */}
          <nav ref={navContainerRef} className="hidden md:flex items-center space-x-6 text-sm font-medium">
            
            {/* 1. Simple 3-Step Process Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnter('steps')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveNavDropdown(activeNavDropdown === 'steps' ? null : 'steps')}
                className={`flex items-center space-x-1.5 py-1.5 transition-colors font-semibold ${
                  activeNavDropdown === 'steps'
                    ? 'text-primary-600 dark:text-primary-400'
                    : isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'
                }`}
              >
                <span>{t('home.howItWorks.badge')}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeNavDropdown === 'steps' ? 'rotate-180 text-primary-500' : 'text-gray-400'}`} />
              </button>

              {/* Overlay Card with Directional Arrow */}
              {activeNavDropdown === 'steps' && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  onMouseEnter={() => handleMouseEnter('steps')}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Directional arrow pointing up */}
                  <div className="flex justify-center -mb-[1px]">
                    <div className={`w-3.5 h-3.5 rotate-45 border-t border-l ${
                      isDark ? 'bg-gray-850 border-gray-700' : 'bg-white border-slate-200 shadow-xs'
                    }`} />
                  </div>

                  <div className={`w-[480px] rounded-2xl shadow-2xl border p-5 ${
                    isDark ? 'bg-gray-850 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-750">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                          <Layers className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {t('home.howItWorks.badge')}
                        </span>
                      </div>
                      <a
                        href="#how-it-works"
                        onClick={() => setActiveNavDropdown(null)}
                        className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <span>{t('home.howItWorks.learnMore')}</span>
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-2.5">
                      {/* Step 1 */}
                      <div 
                        onClick={() => { setSelectedStepModal(1); setActiveNavDropdown(null); }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start space-x-3 ${
                          isDark ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/80' : 'bg-slate-50 hover:bg-white hover:shadow-md border-slate-200/80'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
                          1
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {t('home.howItWorks.step1Title')}
                            </h4>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <p className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            {t('home.howItWorks.step1Desc')}
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div 
                        onClick={() => { setSelectedStepModal(2); setActiveNavDropdown(null); }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start space-x-3 ${
                          isDark ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/80' : 'bg-slate-50 hover:bg-white hover:shadow-md border-slate-200/80'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {t('home.howItWorks.step2Title')}
                            </h4>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <p className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            {t('home.howItWorks.step2Desc')}
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div 
                        onClick={() => { setSelectedStepModal(3); setActiveNavDropdown(null); }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start space-x-3 ${
                          isDark ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/80' : 'bg-slate-50 hover:bg-white hover:shadow-md border-slate-200/80'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
                          3
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {t('home.howItWorks.step3Title')}
                            </h4>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <p className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            {t('home.howItWorks.step3Desc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Features Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnter('features')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveNavDropdown(activeNavDropdown === 'features' ? null : 'features')}
                className={`flex items-center space-x-1.5 py-1.5 transition-colors font-semibold ${
                  activeNavDropdown === 'features'
                    ? 'text-primary-600 dark:text-primary-400'
                    : isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'
                }`}
              >
                <span>{t('home.features.badge')}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeNavDropdown === 'features' ? 'rotate-180 text-primary-500' : 'text-gray-400'}`} />
              </button>

              {/* Overlay with Arrow */}
              {activeNavDropdown === 'features' && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  onMouseEnter={() => handleMouseEnter('features')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex justify-center -mb-[1px]">
                    <div className={`w-3.5 h-3.5 rotate-45 border-t border-l ${
                      isDark ? 'bg-gray-850 border-gray-700' : 'bg-white border-slate-200 shadow-xs'
                    }`} />
                  </div>

                  <div className={`w-[520px] rounded-2xl shadow-2xl border p-5 ${
                    isDark ? 'bg-gray-850 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-750">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {t('home.features.badge')}
                        </span>
                      </div>
                      <a
                        href="#features"
                        onClick={() => setActiveNavDropdown(null)}
                        className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <span>{t('home.howItWorks.learnMore')}</span>
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <a
                        href="#features"
                        onClick={() => setActiveNavDropdown(null)}
                        className={`p-3 rounded-xl border transition-all block group ${
                          isDark ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/80' : 'bg-slate-50 hover:bg-white hover:shadow-md border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2 text-emerald-500 mb-1">
                          <Camera className="h-4 w-4" />
                          <span className="text-xs font-bold">{t('home.features.aiScanTitle')}</span>
                        </div>
                        <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {t('home.features.aiScanDesc')}
                        </p>
                      </a>

                      <a
                        href="#features"
                        onClick={() => setActiveNavDropdown(null)}
                        className={`p-3 rounded-xl border transition-all block group ${
                          isDark ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/80' : 'bg-slate-50 hover:bg-white hover:shadow-md border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2 text-indigo-500 mb-1">
                          <Video className="h-4 w-4" />
                          <span className="text-xs font-bold">{t('home.features.videoCallTitle')}</span>
                        </div>
                        <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {t('home.features.videoCallDesc')}
                        </p>
                      </a>

                      <a
                        href="#features"
                        onClick={() => setActiveNavDropdown(null)}
                        className={`p-3 rounded-xl border transition-all block group ${
                          isDark ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/80' : 'bg-slate-50 hover:bg-white hover:shadow-md border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2 text-amber-500 mb-1">
                          <Lock className="h-4 w-4" />
                          <span className="text-xs font-bold">{t('home.features.escrowTitle')}</span>
                        </div>
                        <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {t('home.features.escrowDesc')}
                        </p>
                      </a>

                      <a
                        href="#features"
                        onClick={() => setActiveNavDropdown(null)}
                        className={`p-3 rounded-xl border transition-all block group ${
                          isDark ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700/80' : 'bg-slate-50 hover:bg-white hover:shadow-md border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2 text-purple-500 mb-1">
                          <Scissors className="h-4 w-4" />
                          <span className="text-xs font-bold">{t('home.features.verifiedTitle')}</span>
                        </div>
                        <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {t('home.features.verifiedDesc')}
                        </p>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Specialties Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnter('specialties')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveNavDropdown(activeNavDropdown === 'specialties' ? null : 'specialties')}
                className={`flex items-center space-x-1.5 py-1.5 transition-colors font-semibold ${
                  activeNavDropdown === 'specialties'
                    ? 'text-primary-600 dark:text-primary-400'
                    : isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'
                }`}
              >
                <span>{t('home.categories.title')}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeNavDropdown === 'specialties' ? 'rotate-180 text-primary-500' : 'text-gray-400'}`} />
              </button>

              {/* Overlay with Arrow */}
              {activeNavDropdown === 'specialties' && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  onMouseEnter={() => handleMouseEnter('specialties')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex justify-center -mb-[1px]">
                    <div className={`w-3.5 h-3.5 rotate-45 border-t border-l ${
                      isDark ? 'bg-gray-850 border-gray-700' : 'bg-white border-slate-200 shadow-xs'
                    }`} />
                  </div>

                  <div className={`w-[450px] rounded-2xl shadow-2xl border p-5 ${
                    isDark ? 'bg-gray-850 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-750">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {t('home.categories.title')}
                        </span>
                      </div>
                      <Link
                        to={user ? "/tailors" : "/login?redirect=/tailors"}
                        onClick={() => setActiveNavDropdown(null)}
                        className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <span>{t('home.footer.exploreTailors')}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: t('specialties.suits') || 'Suits & Tuxedos', query: 'Suits & Tuxedos' },
                        { label: t('specialties.traditional') || 'Traditional / Habesha Kemis', query: 'Traditional / Habesha Kemis' },
                        { label: t('specialties.wedding') || 'Wedding & Bridal', query: 'Wedding & Bridal' },
                        { label: t('specialties.alterations') || 'Alterations & Repairs', query: 'Alterations & Repairs' },
                        { label: t('specialties.gowns') || 'Dresses & Gowns', query: 'Dresses & Gowns' },
                        { label: t('specialties.blazers') || 'Blazers & Jackets', query: 'Blazers & Jackets' },
                        { label: t('specialties.casual') || 'Casual & Everyday Wear', query: 'Casual & Everyday Wear' },
                        { label: t('specialties.leather') || 'Leather & Outerwear', query: 'Leather & Outerwear' },
                      ].map((spec, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveNavDropdown(null);
                            if (!user) {
                              navigate(`/login?redirect=${encodeURIComponent(`/tailors?specialty=${encodeURIComponent(spec.query)}`)}`);
                            } else {
                              navigate(`/tailors?specialty=${encodeURIComponent(spec.query)}`);
                            }
                          }}
                          className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between group ${
                            isDark
                              ? 'bg-gray-800/60 hover:bg-gray-800 border-gray-700/70 text-gray-200'
                              : 'bg-slate-50 hover:bg-white hover:shadow-xs border-slate-200/80 text-slate-700'
                          }`}
                        >
                          <span className="truncate mr-1">{spec.label}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Explore Tailors Link */}
            <Link 
              to={user ? "/tailors" : "/login?redirect=/tailors"} 
              className={`transition-colors font-semibold ${isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'}`}
            >
              {t('home.footer.exploreTailors')}
            </Link>
          </nav>

          {/* User Auth CTAs & Theme Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Language Switcher */}
            <LanguageSwitcher variant="dropdown" />

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-amber-400 hover:bg-gray-700 hover:text-amber-300 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
              }`}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user ? (
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-primary text-xs sm:text-sm px-3.5 sm:px-5 py-2 flex items-center space-x-1.5 sm:space-x-2 shadow-md">
                <span>{user.role === 'admin' ? t('nav.adminPanel') : t('nav.requests')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center space-x-1 sm:space-x-1.5">
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{t('nav.signIn')}</span>
                </Link>
                <Link to="/join" className="btn-primary text-xs sm:text-sm px-3.5 sm:px-5 py-2 flex items-center space-x-1 sm:space-x-1.5 shadow-md">
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{t('nav.joinNow')}</span>
                </Link>
              </>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className={`p-2 rounded-xl md:hidden transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-slate-600'
              }`}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav Menu */}
        {mobileNavOpen && (
          <div className={`md:hidden px-4 pt-2 pb-4 border-t space-y-2 ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-100'
          }`}>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileNavOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              {t('home.howItWorks.badge')}
            </a>
            <a 
              href="#features" 
              onClick={() => setMobileNavOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              {t('home.features.badge')}
            </a>
            <a 
              href="#portfolio" 
              onClick={() => setMobileNavOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              {t('home.categories.title')}
            </a>
            <a 
              href="#tailors" 
              onClick={() => setMobileNavOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              {t('home.footer.exploreTailors')}
            </a>

            {/* Mobile Language Switcher */}
            <div className="pt-2">
              <span className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 px-3 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {t('nav.language')}
              </span>
              <LanguageSwitcher variant="inline" className="w-full justify-center" />
            </div>

            {/* Mobile Theme Toggle */}
            <div className={`pt-2 border-t flex items-center justify-between px-3 ${isDark ? 'border-gray-800' : 'border-slate-100'}`}>
              <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Appearance
              </span>
              <button
                onClick={toggleDarkMode}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-amber-400'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className={`relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-32 lg:pb-32 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Interactive Physics Dot Matrix Background */}
        <InteractiveDotsBackground 
          className="absolute inset-0 z-0 pointer-events-none"
          dotSpacing={34}
          dotRadius={2}
          repelRadius={140}
          repelStrength={7}
          returnSpeed={0.07}
          damping={0.88}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left Side Text Content */}
          <div className="flex-1 text-center lg:text-left pt-6 lg:pt-0">
            <h2 className="text-[#2563eb] font-medium text-lg sm:text-2xl mb-3 sm:mb-4 tracking-tight">{t('home.badge')}</h2>
            <h1 className={`text-3xl sm:text-5xl lg:text-[64px] font-medium tracking-tight leading-[1.15] mb-4 sm:mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
              {t('home.heroTitle')}<br className="hidden sm:block lg:block"/>
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{t('home.heroTitleGradient')}</span>
            </h1>
            <p className={`text-base sm:text-xl max-w-2xl mx-auto lg:mx-0 mb-8 sm:mb-10 leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {t('home.heroSubtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6">
              <Link
                to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/join'}
                className="bg-[#2563eb] hover:bg-blue-700 text-white font-medium py-3 sm:py-3.5 px-8 sm:px-10 rounded shadow hover:shadow-lg transition-all w-full sm:w-auto text-base sm:text-lg"
              >
                {t('home.getStartedBtn')}
              </Link>
              <a href="#how-it-works" className={`flex items-center justify-center gap-3 py-3 sm:py-3.5 px-6 rounded font-medium transition-all w-full sm:w-auto text-base sm:text-lg ${isDark ? 'text-white hover:bg-gray-800' : 'text-slate-900 hover:bg-slate-50'}`}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                  <div className="w-0 h-0 border-t-[5px] sm:border-t-[6px] border-t-transparent border-l-[7px] sm:border-l-[8px] border-l-current border-b-[5px] sm:border-b-[6px] border-b-transparent ml-1"></div>
                </div>
                {t('home.howItWorks.title')}
              </a>
            </div>
          </div>

          {/* Right Side Transparent Cutout Model & AI Overlay */}
          <div className="flex-1 relative w-full max-w-sm sm:max-w-lg mx-auto lg:max-w-none mt-8 lg:mt-0 flex items-center justify-center">
            
            {/* Ambient Soft Glow Behind the Model */}
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-blue-500/20 dark:bg-blue-600/25 blur-3xl -z-10 pointer-events-none animate-pulse"></div>
            <div className="absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full bg-indigo-500/15 dark:bg-purple-600/20 blur-2xl top-1/4 -z-10 pointer-events-none"></div>

            {/* Model Container */}
            <div className="relative z-10 w-[85%] sm:w-[75%] lg:w-[85%] xl:w-[78%] flex flex-col items-center group">
              
              {/* Transparent Cutout Model Photo */}
              <img 
                src={heroModelImg} 
                alt="Bespoke AI Body Measurement" 
                className="w-full h-auto max-h-[580px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_20px_45px_rgba(37,99,235,0.3)] transition-transform duration-700 group-hover:scale-[1.02]"
              />

              {/* Laser Scan Horizontal Beam over Model */}
              <div className="absolute top-[46%] inset-x-2 sm:inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_14px_rgba(6,182,212,0.9)] animate-pulse pointer-events-none"></div>

              {/* Top AI Scanner Status Badge */}
              <div className="absolute top-1 sm:top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-slate-950/80 dark:bg-gray-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-blue-400/40 text-[11px] font-semibold text-blue-200 flex items-center gap-2 shadow-lg whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{t('home.aiHud.modelStatus')} • {t('home.aiHud.accuracy')}</span>
                </div>
              </div>

              {/* Anatomical Landmark Points floating on Model */}
              <div className="absolute top-[28%] left-[20%] z-20 flex items-center gap-1.5 pointer-events-none">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white"></span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900/85 text-blue-300 border border-blue-400/40 backdrop-blur-md shadow-md">
                  {t('home.aiHud.shoulder')}: 41.2 cm
                </span>
              </div>

              <div className="absolute top-[44%] left-[44%] -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-white shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
                </span>
              </div>

              <div className="absolute top-[62%] left-[24%] z-20 flex items-center gap-1.5 pointer-events-none">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-white"></span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900/85 text-cyan-300 border border-cyan-400/40 backdrop-blur-md shadow-md">
                  {t('home.aiHud.waist')}: 74.8 cm
                </span>
              </div>

              {/* Floating Glassmorphism UI - Card 1 */}
              <div className={`absolute top-[8%] sm:top-[12%] -left-3 sm:-left-[8%] lg:-left-[14%] z-30 px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 sm:gap-4 transition-transform duration-300 hover:scale-105 ${isDark ? 'bg-gray-900/85 border-gray-700/60 text-white' : 'bg-white/90 border-slate-200/80 text-slate-900'}`}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                  <Ruler className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className={`text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>{t('home.aiHud.chest')}</p>
                  <p className="text-base sm:text-xl font-bold">42.5 in</p>
                </div>
              </div>

              {/* Floating Glassmorphism UI - Card 2 */}
              <div className={`absolute top-[34%] sm:top-[38%] -right-3 sm:-right-[8%] lg:-right-[14%] z-30 px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3 sm:gap-4 transition-transform duration-300 hover:scale-105 ${isDark ? 'bg-gray-900/85 border-gray-700/60 text-white' : 'bg-white/90 border-slate-200/80 text-slate-900'}`}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className={`text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>{t('home.aiHud.accuracy')}</p>
                  <p className="text-base sm:text-xl font-bold">99.4%</p>
                </div>
              </div>

              {/* Floating Glassmorphism UI - Card 3 */}
              <div className={`absolute bottom-[4%] sm:bottom-[6%] -left-3 sm:-left-[6%] lg:-left-[10%] z-30 px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl backdrop-blur-md shadow-2xl border w-44 sm:w-52 transition-transform duration-300 hover:scale-105 ${isDark ? 'bg-gray-900/85 border-gray-700/60 text-white' : 'bg-white/90 border-slate-200/80 text-slate-900'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>{t('home.aiHud.liveScanner')}</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1.5 mb-1.5">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-500 h-1.5 rounded-full w-full"></div>
                </div>
                <p className="text-xs font-bold text-right text-blue-600 dark:text-blue-400">100% Calibrated</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* SEARCH BAR */}
      <section className={`py-8 border-b ${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className={`p-2 rounded-xl shadow-sm border flex flex-col sm:flex-row items-center gap-2 ${
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex-1 flex items-center px-4 w-full">
                <Search className={`h-5 w-5 mr-3 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder={t('home.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-3 bg-transparent outline-none text-base ${isDark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'}`}
                />
              </div>
              <button type="submit" className="bg-[#2563eb] hover:bg-blue-700 text-white w-full sm:w-auto text-sm font-medium px-8 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer">
                <Search className="h-4 w-4" />
                <span>{t('home.searchBtn')}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className={`py-20 ${isDark ? 'bg-gray-800' : 'bg-slate-50/60'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`text-3xl sm:text-4xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('home.howItWorks.title')}
            </h2>
            <p className={`text-base sm:text-lg ${isDark ? 'text-gray-300' : 'text-slate-700 font-medium'}`}>
              {t('home.howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Step 1 Card */}
            <div 
              onClick={() => setSelectedStepModal(1)}
              className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer group flex flex-col justify-between ${
                isDark 
                  ? 'bg-gradient-to-br from-purple-950/30 via-gray-800 to-gray-800/90 border-purple-800/50 hover:border-purple-500' 
                  : 'bg-gradient-to-br from-purple-50/70 via-white to-white border-purple-200/80 hover:border-purple-400 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-lg font-extrabold shadow-md group-hover:scale-110 transition-transform">
                    1
                  </div>
                  <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5" />
                  </span>
                </div>
                <h3 className={`text-xl font-extrabold mb-2.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('home.howItWorks.step1Title')}
                </h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600 font-medium'}`}>
                  {t('home.howItWorks.step1Desc')}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                <span>{t('home.howItWorks.viewStepDetails')}</span>
                <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/60 group-hover:translate-x-1.5 transition-transform">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Step 2 Card */}
            <div 
              onClick={() => setSelectedStepModal(2)}
              className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer group flex flex-col justify-between ${
                isDark 
                  ? 'bg-gradient-to-br from-indigo-950/30 via-gray-800 to-gray-800/90 border-indigo-800/50 hover:border-indigo-500' 
                  : 'bg-gradient-to-br from-indigo-50/70 via-white to-white border-indigo-200/80 hover:border-indigo-400 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-extrabold shadow-md group-hover:scale-110 transition-transform">
                    2
                  </div>
                  <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Video className="h-5 w-5" />
                  </span>
                </div>
                <h3 className={`text-xl font-extrabold mb-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('home.howItWorks.step2Title')}
                </h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600 font-medium'}`}>
                  {t('home.howItWorks.step2Desc')}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span>{t('home.howItWorks.viewStepDetails')}</span>
                <div className="p-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 group-hover:translate-x-1.5 transition-transform">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Step 3 Card */}
            <div 
              onClick={() => setSelectedStepModal(3)}
              className={`p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer group flex flex-col justify-between ${
                isDark 
                  ? 'bg-gradient-to-br from-blue-950/30 via-gray-800 to-gray-800/90 border-blue-800/50 hover:border-blue-500' 
                  : 'bg-gradient-to-br from-blue-50/70 via-white to-white border-blue-200/80 hover:border-blue-400 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-extrabold shadow-md group-hover:scale-110 transition-transform">
                    3
                  </div>
                  <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 opacity-80 group-hover:opacity-100 transition-opacity">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </div>
                <h3 className={`text-xl font-extrabold mb-2.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('home.howItWorks.step3Title')}
                </h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600 font-medium'}`}>
                  {t('home.howItWorks.step3Desc')}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>{t('home.howItWorks.viewStepDetails')}</span>
                <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/60 group-hover:translate-x-1.5 transition-transform">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ENTIRE SYSTEM CAPABILITIES SECTION */}
      <section id="features" className={`py-20 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('home.features.badge')}</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('home.features.title')}
            </h2>
            <p className={`text-base sm:text-lg ${isDark ? 'text-gray-200 font-medium' : 'text-slate-700 font-bold'}`}>
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-purple-950/40 via-gray-800 to-gray-800 border-purple-800/60' 
                : 'bg-gradient-to-br from-purple-50/90 via-purple-50/30 to-white border-purple-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md mb-4">
                <Scissors className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.verifiedTitle')}
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                {t('home.features.verifiedDesc')}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-emerald-950/40 via-gray-800 to-gray-800 border-emerald-800/60' 
                : 'bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white border-emerald-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md mb-4">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.aiScanTitle')}
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                {t('home.features.aiScanDesc')}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-blue-950/40 via-gray-800 to-gray-800 border-blue-800/60' 
                : 'bg-gradient-to-br from-blue-50/90 via-cyan-50/30 to-white border-blue-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.chatTitle')}
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                {t('home.features.chatDesc')}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-amber-950/40 via-gray-800 to-gray-800 border-amber-800/60' 
                : 'bg-gradient-to-br from-amber-50/90 via-rose-50/30 to-white border-amber-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white flex items-center justify-center shadow-md mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.escrowTitle')}
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                {t('home.features.escrowDesc')}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-indigo-950/40 via-gray-800 to-gray-800 border-indigo-800/60' 
                : 'bg-gradient-to-br from-indigo-50/90 via-pink-50/30 to-white border-indigo-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md mb-4">
                <Award className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.videoCallTitle')}
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                {t('home.features.videoCallDesc')}
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-rose-950/40 via-gray-800 to-gray-800 border-rose-800/60' 
                : 'bg-gradient-to-br from-rose-50/90 via-amber-50/30 to-white border-rose-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-md mb-4">
                <Star className="h-6 w-6 fill-current" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.avatarTitle')}
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                {t('home.features.avatarDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO & TAILOR WORK SHOWCASE SECTION */}
      <section id="portfolio" className={`py-20 ${isDark ? 'bg-gray-800' : 'bg-slate-50/70'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 mb-2">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{t('home.categories.title')}</span>
              </div>
              <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.badge')}
              </h2>
              <p className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-slate-600 font-semibold'} mt-1`}>
                {t('home.features.subtitle')}
              </p>
            </div>
            <Link
              to={user ? "/tailors" : "/login?redirect=/tailors"}
              className="mt-4 md:mt-0 text-primary-600 font-bold text-sm flex items-center space-x-1 hover:underline"
            >
              <span>{t('home.footer.exploreTailors')}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {portfolioShowcase.map((item, index) => (
              <div 
                key={index}
                className={`group rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl ${
                  isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'
                }`}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">
                    {item.category}
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className={`font-bold text-base line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-600 font-medium'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED DYNAMIC TAILORS SHOWCASE */}
      <section id="tailors" className={`py-20 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('home.features.verifiedTitle')}
              </h2>
              <p className={isDark ? 'text-gray-300' : 'text-slate-600 font-medium'}>
                {t('tailors.subtitle')}
              </p>
            </div>
            <Link
              to={user ? "/tailors" : "/login?redirect=/tailors"}
              className="mt-4 md:mt-0 text-primary-600 font-bold text-sm flex items-center space-x-1 hover:underline"
            >
              <span>{t('home.footer.exploreTailors')}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingTailors ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : featuredTailors.length === 0 ? (
            <div className="card text-center py-12">
              <p className={isDark ? 'text-gray-400' : 'text-slate-500'}>{t('tailors.empty')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {featuredTailors.map((tailor) => {
                  const specArray = Array.isArray(tailor.specialties) ? tailor.specialties : [];
                  return (
                    <div key={tailor.id} className="card !p-5 flex flex-col justify-between hover:shadow-xl transition-all border border-slate-200 dark:border-gray-700 !bg-white dark:!bg-gray-800 rounded-2xl">
                      <div className="space-y-3.5">
                        <div className="flex items-center space-x-3">
                          {tailor.user?.avatarUrl ? (
                            <img
                              src={tailor.user.avatarUrl}
                              alt={tailor.user?.name}
                              className="w-13 h-13 rounded-xl object-cover border border-slate-200 dark:border-gray-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-amber-100 font-extrabold flex items-center justify-center text-sm shadow-md flex-shrink-0 border border-amber-500/40">
                              {tailor.user?.name?.slice(0, 2).toUpperCase() || 'TM'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{tailor.user?.name}</h3>
                            <p className={`text-[11px] flex items-center truncate ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                              <MapPin className="h-3 w-3 mr-1 text-primary-600 flex-shrink-0" />
                              <span className="truncate">{tailor.user?.location || 'Location available'}</span>
                            </p>
                          </div>
                        </div>

                        <p className={`text-xs italic ${isDark ? 'text-gray-300' : 'text-slate-600'} line-clamp-2`}>
                          "{tailor.bio || 'Experienced tailor specializing in custom garment design.'}"
                        </p>

                        {tailor.basePricingMin && (
                          <p className="text-[11px] font-semibold text-primary-600">
                            {t('tailors.startingFrom')}: ${Number(tailor.basePricingMin).toLocaleString()}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {specArray.slice(0, 2).map((spec: string) => (
                            <span key={spec} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 truncate max-w-full">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3.5 border-t border-slate-100 dark:border-gray-700 mt-3 flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-xs font-bold text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>{tailor.averageRating ? Number(tailor.averageRating).toFixed(1) : '5.0'}</span>
                        </div>
                        
                        <Link
                          to={user ? `/tailors/${tailor.id}` : `/login?redirect=${encodeURIComponent(`/tailors/${tailor.id}`)}`}
                          className="btn-primary text-[11px] px-3 py-1.5 inline-flex items-center space-x-1 shadow-sm"
                        >
                          <span>{t('tailors.viewProfile')}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Explore More CTA Link */}
              <div className="mt-10 text-center">
                <Link
                  to={user ? "/tailors" : "/login?redirect=/tailors"}
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-gray-700 font-bold text-sm text-primary-600 dark:text-primary-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors shadow-xs"
                >
                  <span>{t('home.footer.exploreTailors')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* DUAL CTA BOX */}
      <section className="py-20 bg-gradient-to-r from-primary-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold">{t('home.cta.title')}</h2>
          <p className="text-lg text-primary-100 max-w-2xl mx-auto font-medium">
            {t('home.cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              to={user ? (user.role === 'tailor' ? '/dashboard' : '/tailors') : '/join'}
              className="bg-white text-primary-700 font-bold px-8 py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-lg flex items-center justify-center space-x-2"
            >
              <Search className="h-5 w-5" />
              <span>{t('home.cta.customerBtn')}</span>
            </Link>
            {!user && (
              <Link
                to="/join"
                className="bg-primary-900/40 text-white font-semibold border border-white/30 px-8 py-3.5 rounded-xl hover:bg-primary-900/60 transition-colors flex items-center justify-center space-x-2"
              >
                <Scissors className="h-5 w-5" />
                <span>{t('home.cta.tailorBtn')}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`${isDark ? 'bg-gray-950 border-t border-gray-800' : 'bg-slate-900'} text-slate-400 py-12`}>
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Scissors className="h-6 w-6 text-primary-400" />
            <span className="text-xl font-bold text-white tracking-tight">{t('nav.brand')}</span>
          </div>
          <p className="text-sm max-w-md mx-auto text-slate-400">
            {t('home.footer.tagline')}
          </p>
          <p className="text-xs text-slate-500 pt-4">{t('home.footer.copyright')}</p>
        </div>
      </footer>

      {/* STEP DETAIL MODAL OVERLAY */}
      {selectedStepModal !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedStepModal(null)}
        >
          <div 
            className={`w-full max-w-xl rounded-3xl shadow-2xl border p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 ${
              isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Step Badge & Close */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold shadow-md ${
                  selectedStepModal === 1 
                    ? 'bg-purple-600 text-white' 
                    : selectedStepModal === 2 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {selectedStepModal}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    {t('home.howItWorks.badge')} • Step {selectedStepModal} of 3
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                    {selectedStepModal === 1 
                      ? t('home.howItWorks.step1Title') 
                      : selectedStepModal === 2 
                      ? t('home.howItWorks.step2Title') 
                      : t('home.howItWorks.step3Title')}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStepModal(null)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Description & Walkthrough Details */}
            <div className={`p-4 sm:p-5 rounded-2xl border text-sm leading-relaxed ${
              isDark ? 'bg-gray-800/60 border-gray-700/80 text-gray-200' : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}>
              <p>
                {selectedStepModal === 1 && t('home.howItWorks.modal.step1Details')}
                {selectedStepModal === 2 && t('home.howItWorks.modal.step2Details')}
                {selectedStepModal === 3 && t('home.howItWorks.modal.step3Details')}
              </p>

              {/* Tip Box */}
              <div className={`mt-3 pt-3 border-t flex items-start space-x-2 text-xs font-medium ${
                isDark ? 'border-gray-700 text-amber-300' : 'border-slate-200 text-amber-700'
              }`}>
                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  {selectedStepModal === 1 && t('home.howItWorks.modal.step1Tip')}
                  {selectedStepModal === 2 && t('home.howItWorks.modal.step2Tip')}
                  {selectedStepModal === 3 && t('home.howItWorks.modal.step3Tip')}
                </span>
              </div>
            </div>

            {/* Key Action Points List */}
            <div className="space-y-2 text-xs sm:text-sm">
              {selectedStepModal === 1 && (
                <>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Real-time MediaPipe AI body landmark estimation in 60s</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Encrypted biometric privacy vault stored strictly in your browser</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Step-by-step interactive tape measuring tutorial included</span>
                  </div>
                </>
              )}

              {selectedStepModal === 2 && (
                <>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Browse verified bespoke artisans with real customer reviews</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Live WebRTC HD video fitting calls for fabric & cut inspection</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Digital custom contract agreement signed before work starts</span>
                  </div>
                </>
              )}

              {selectedStepModal === 3 && (
                <>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>100% Escrow Protection—funds held securely until fit approval</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Bespoke tailoring crafted to your exact anatomical silhouette</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Free alteration guarantee on every custom bespoke order</span>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {selectedStepModal === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStepModal(null);
                      if (!user) {
                        navigate('/join');
                      } else {
                        setShowScannerModal(true);
                      }
                    }}
                    className="w-full sm:flex-1 py-3 px-5 rounded-xl font-bold text-sm bg-primary-600 hover:bg-primary-700 text-white shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{t('home.howItWorks.modal.step1Cta')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStepModal(null);
                      setShowGuideModal(true);
                    }}
                    className={`w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-sm border transition-all flex items-center justify-center space-x-2 ${
                      isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>{t('home.howItWorks.modal.step1CtaGuide')}</span>
                  </button>
                </>
              )}

              {selectedStepModal === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStepModal(null);
                    navigate(user ? '/tailors' : '/login?redirect=/tailors');
                  }}
                  className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Scissors className="h-4 w-4" />
                  <span>{t('home.howItWorks.modal.step2Cta')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {selectedStepModal === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStepModal(null);
                    navigate(user ? '/dashboard' : '/join');
                  }}
                  className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t('home.howItWorks.modal.step3Cta')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Scanner and Measurement Modals for Live Testing */}
      <AICameraScannerModal 
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onComplete={() => {
          setShowScannerModal(false);
          navigate(user ? '/dashboard' : '/join');
        }}
      />

      <MeasurementInstructionsModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onComplete={() => {
          setShowGuideModal(false);
          setShowScannerModal(true);
        }}
      />
    </div>
  );
}
