import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { tailorsAPI } from '../lib/api';
import { 
  Scissors, Search, MessageSquare, ArrowRight, LogIn, 
  UserPlus, Camera, CheckCircle, Star, Sparkles, MapPin, 
  Ruler, Clock, Award, ChevronRight, Lock, Eye, Image as ImageIcon,
  Menu, X
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const isDark = useDarkMode();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredTailors, setFeaturedTailors] = useState<any[]>([]);
  const [loadingTailors, setLoadingTailors] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    loadFeaturedTailors();
  }, []);

  const loadFeaturedTailors = async () => {
    setLoadingTailors(true);
    try {
      const res = await tailorsAPI.search();
      if (res.data?.tailors && res.data.tailors.length > 0) {
        setFeaturedTailors(res.data.tailors.slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to load featured tailors', err);
    } finally {
      setLoadingTailors(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tailors?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/tailors');
    }
  };

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
              Stitch<span className="text-primary-600">Match</span>
            </span>
          </Link>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a href="#how-it-works" className={`transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'}`}>How It Works</a>
            <a href="#features" className={`transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'}`}>Capabilities</a>
            <a href="#portfolio" className={`transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'}`}>Work Showcase</a>
            <a href="#tailors" className={`transition-colors ${isDark ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-primary-600'}`}>Master Tailors</a>
          </nav>

          {/* User Auth CTAs */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-xs sm:text-sm px-3.5 sm:px-5 py-2 flex items-center space-x-1.5 sm:space-x-2 shadow-md">
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center space-x-1 sm:space-x-1.5">
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Sign In</span>
                </Link>
                <Link to="/join" className="btn-primary text-xs sm:text-sm px-3.5 sm:px-5 py-2 flex items-center space-x-1 sm:space-x-1.5 shadow-md">
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Get Started</span>
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
              How It Works
            </a>
            <a 
              href="#features" 
              onClick={() => setMobileNavOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              Capabilities
            </a>
            <a 
              href="#portfolio" 
              onClick={() => setMobileNavOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              Work Showcase
            </a>
            <a 
              href="#tailors" 
              onClick={() => setMobileNavOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              Master Tailors
            </a>
          </div>
        )}
      </header>

      {/* NEW TWO-COLUMN HERO SECTION (3DLOOK Style) */}
      <section className={`relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-32 lg:pb-32 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Dotted Background Pattern */}
        <div className={`absolute inset-0 z-0 ${isDark ? 'opacity-10' : 'opacity-40'}`} style={{
          backgroundImage: `radial-gradient(${isDark ? '#475569' : '#cbd5e1'} 2px, transparent 2px)`,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left Side Text Content */}
          <div className="flex-1 text-center lg:text-left pt-6 lg:pt-0">
            <h2 className="text-[#2563eb] font-medium text-lg sm:text-2xl mb-3 sm:mb-4 tracking-tight">StitchMatch</h2>
            <h1 className={`text-3xl sm:text-5xl lg:text-[64px] font-medium tracking-tight leading-[1.15] mb-4 sm:mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
              Real-Time Tailoring<br className="hidden sm:block lg:block"/>
              Measurements,<br className="hidden sm:block lg:block"/>
              Powered by AI
            </h1>
            <p className={`text-base sm:text-xl max-w-2xl mx-auto lg:mx-0 mb-8 sm:mb-10 leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Integrate AI-driven body scanning into your bespoke tailoring process to improve fit accuracy, boost client engagement, and reduce return rates while ensuring accurate insights for better garment construction.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6">
              <Link to="/join" className="bg-[#2563eb] hover:bg-blue-700 text-white font-medium py-3 sm:py-3.5 px-8 sm:px-10 rounded shadow hover:shadow-lg transition-all w-full sm:w-auto text-base sm:text-lg">
                Let's talk
              </Link>
              <a href="#how-it-works" className={`flex items-center justify-center gap-3 py-3 sm:py-3.5 px-6 rounded font-medium transition-all w-full sm:w-auto text-base sm:text-lg ${isDark ? 'text-white hover:bg-gray-800' : 'text-slate-900 hover:bg-slate-50'}`}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                  {/* Play Icon */}
                  <div className="w-0 h-0 border-t-[5px] sm:border-t-[6px] border-t-transparent border-l-[7px] sm:border-l-[8px] border-l-current border-b-[5px] sm:border-b-[6px] border-b-transparent ml-1"></div>
                </div>
                How it works
              </a>
            </div>
          </div>

          {/* Right Side Image & Glassmorphism Cards */}
          <div className="flex-1 relative w-full max-w-sm sm:max-w-lg mx-auto lg:max-w-none mt-8 lg:mt-0">
            {/* The main subject image container */}
            <div className="relative z-10 mx-auto w-[90%] sm:w-[85%] lg:w-[90%] xl:w-[85%] group">
              
              {/* Image Container with Framing & Overlays */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/40 dark:border-gray-700/60 bg-slate-900">
                {/* Subject Image */}
                <img 
                  src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=80" 
                  alt="AI Body Scanning" 
                  className="w-full h-auto object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />

                {/* Layer 1: Ambient High-Tech Color Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-indigo-500/15 mix-blend-overlay pointer-events-none"></div>

                {/* Layer 2: Grid Scanner Overlay Pattern */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(59, 130, 246, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.35) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                  }}
                ></div>

                {/* Layer 3: Viewfinder Corner Brackets */}
                <div className="absolute top-4 left-4 w-5 h-5 sm:w-7 sm:h-7 border-t-2 border-l-2 border-blue-400/90 rounded-tl-lg shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                <div className="absolute top-4 right-4 w-5 h-5 sm:w-7 sm:h-7 border-t-2 border-r-2 border-blue-400/90 rounded-tr-lg shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                <div className="absolute bottom-4 left-4 w-5 h-5 sm:w-7 sm:h-7 border-b-2 border-l-2 border-blue-400/90 rounded-bl-lg shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                <div className="absolute bottom-4 right-4 w-5 h-5 sm:w-7 sm:h-7 border-b-2 border-r-2 border-blue-400/90 rounded-br-lg shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>

                {/* Layer 4: Laser Scan Horizontal Beam */}
                <div className="absolute top-[48%] inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.9)] animate-pulse pointer-events-none"></div>

                {/* Layer 5: Anatomical Measurement Landmark Points */}
                {/* Shoulder Point */}
                <div className="absolute top-[28%] left-[22%] z-10 flex items-center gap-1.5 pointer-events-none">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white"></span>
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950/80 text-blue-300 border border-blue-400/40 backdrop-blur-xs">
                    P1: 41.2cm
                  </span>
                </div>

                {/* Chest Center Point */}
                <div className="absolute top-[46%] left-[48%] z-10 pointer-events-none">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-white shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                  </span>
                </div>

                {/* Waist Point */}
                <div className="absolute top-[62%] right-[24%] z-10 flex items-center gap-1.5 pointer-events-none">
                  <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950/80 text-cyan-300 border border-cyan-400/40 backdrop-blur-xs">
                    P2: 74.8cm
                  </span>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-white"></span>
                  </span>
                </div>

                {/* Layer 6: Top Scanner Status Badge Overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <div className="bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-blue-400/40 text-[11px] font-semibold text-blue-200 flex items-center gap-2 shadow-lg whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>AI Landmark Scan • 32 Points Active</span>
                  </div>
                </div>

                {/* Layer 7: Bottom Metrics HUD Strip */}
                <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 bg-slate-950/75 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 flex items-center justify-between text-white pointer-events-none">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">3D Vision Neural Mesh</p>
                      <p className="text-xs sm:text-sm font-bold text-white">Sub-millimeter Precision</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    CONFIDENCE 99.4%
                  </span>
                </div>
              </div>
            
              {/* Floating Glassmorphism UI - Card 1 (Chest Size) */}
              <div className={`absolute top-[10%] sm:top-[15%] left-0 sm:-left-[10%] lg:-left-[15%] z-20 px-3.5 sm:px-5 py-2.5 sm:py-4 rounded-xl backdrop-blur-md shadow-2xl border flex items-center gap-3 sm:gap-4 ${isDark ? 'bg-gray-900/85 border-gray-700/60' : 'bg-white/90 border-white/50'}`}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-transparent border border-slate-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                  <Ruler className={`h-4 w-4 sm:h-5 sm:w-5 ${isDark ? 'text-white' : 'text-slate-800'}`} />
                </div>
                <div>
                  <p className={`text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Chest Size</p>
                  <p className={`text-base sm:text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>42.5 in</p>
                </div>
              </div>

              {/* Floating Glassmorphism UI - Card 2 (Accuracy) */}
              <div className={`absolute top-[40%] sm:top-[45%] right-0 sm:-right-[10%] lg:-right-[15%] z-20 px-3.5 sm:px-5 py-2.5 sm:py-4 rounded-xl backdrop-blur-md shadow-2xl border flex items-center gap-3 sm:gap-4 ${isDark ? 'bg-gray-900/85 border-gray-700/60' : 'bg-white/90 border-white/50'}`}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-transparent border border-slate-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${isDark ? 'text-white' : 'text-slate-800'}`} />
                </div>
                <div>
                  <p className={`text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Fit Accuracy</p>
                  <p className={`text-base sm:text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>99.4%</p>
                </div>
              </div>

              {/* Floating Glassmorphism UI - Card 3 (Status) */}
              <div className={`absolute bottom-[8%] sm:bottom-[10%] left-0 sm:-left-[8%] lg:-left-[10%] z-20 px-3.5 sm:px-5 py-2.5 sm:py-4 rounded-xl backdrop-blur-md shadow-2xl border w-40 sm:w-48 ${isDark ? 'bg-gray-900/85 border-gray-700/60' : 'bg-white/90 border-white/50'}`}>
                <p className={`text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase mb-2 sm:mb-3 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Scan Progress</p>
                <div className="w-full bg-slate-300/50 dark:bg-gray-700/50 rounded-full h-1.5 mb-1.5 sm:mb-2">
                  <div className="bg-blue-600 h-1.5 rounded-full w-full"></div>
                </div>
                <p className={`text-xs font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>100%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH BAR (Moved Below Hero) */}
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
                  placeholder="Search by garment type (Suit, Tuxedo, Evening Gown, Overcoat)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-3 bg-transparent outline-none text-base ${isDark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'}`}
                />
              </div>
              <button type="submit" className="bg-[#2563eb] hover:bg-blue-700 text-white w-full sm:w-auto text-sm font-medium px-8 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                <Search className="h-4 w-4" />
                <span>Search Tailors</span>
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
              How StitchMatch Works
            </h2>
            <p className={`text-base sm:text-lg ${isDark ? 'text-gray-300' : 'text-slate-700 font-medium'}`}>
              Four effortless steps from finding your tailor to wearing your custom garment.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
              isDark ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 flex items-center justify-center text-lg font-bold mb-5 shadow-xs">
                1
              </div>
              <h3 className={`text-lg font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Find Tailor</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700 font-medium'}`}>
                Browse tailors by specialty, price range, ratings, and portfolio galleries.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
              isDark ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center text-lg font-bold mb-5 shadow-xs">
                2
              </div>
              <h3 className={`text-lg font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Negotiate & Dual-Lock</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700 font-medium'}`}>
                Propose counter-offers, agree on deadline & price, and lock terms with dual agreement confirmation.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
              isDark ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center text-lg font-bold mb-5 shadow-xs">
                3
              </div>
              <h3 className={`text-lg font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>AI 3D Measurement</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700 font-medium'}`}>
                Upload Front, Side, and Back body photos. AI extracts chest, waist, inseam, and shoulder metrics.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
              isDark ? 'bg-gray-900/60 border-gray-700' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center text-lg font-bold mb-5 shadow-xs">
                4
              </div>
              <h3 className={`text-lg font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Track Stage Progress</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700 font-medium'}`}>
                Track stage updates (Cutting, Sewing, Fitting, Delivery) with photos and real-time Socket.IO alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ENTIRE SYSTEM CAPABILITIES SECTION - HIGH VISIBILITY BOLD TEXT & RGB CARDS */}
      <section id="features" className={`py-20 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Full System Architecture</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Entire System Capabilities
            </h2>
            <p className={`text-base sm:text-lg ${isDark ? 'text-gray-200 font-medium' : 'text-slate-700 font-bold'}`}>
              Complete end-to-end bespoke tailoring suite built to guarantee precision, real-time communication, and luxury fit.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Royal Purple & Violet */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-purple-950/40 via-gray-800 to-gray-800 border-purple-800/60' 
                : 'bg-gradient-to-br from-purple-50/90 via-purple-50/30 to-white border-purple-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md mb-4">
                <Scissors className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="text-purple-600 dark:text-purple-400">Tailor Atelier</span> Directory
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                Explore detailed tailor profiles complete with verified bio, geographic location, specialty tags, pricing ranges, and high-resolution portfolio galleries.
              </p>
            </div>

            {/* Card 2: Vivid Emerald & Teal */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-emerald-950/40 via-gray-800 to-gray-800 border-emerald-800/60' 
                : 'bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white border-emerald-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md mb-4">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="text-emerald-600 dark:text-emerald-400">AI Body 3D</span> Scanning
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                Automated 3D body metric calculation returning confidence scores and exact body metrics for chest, waist, inseam, shoulders, and arm length.
              </p>
            </div>

            {/* Card 3: Royal Sapphire & Cyan */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-blue-950/40 via-gray-800 to-gray-800 border-blue-800/60' 
                : 'bg-gradient-to-br from-blue-50/90 via-cyan-50/30 to-white border-blue-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="text-blue-600 dark:text-blue-400">Real-Time Socket.IO</span> Chat
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                Direct customer & tailor messaging with fabric swatch photo attachments, PDF specs, typing indicators, and instant unread notification alerts.
              </p>
            </div>

            {/* Card 4: Rose Gold & Amber */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-amber-950/40 via-gray-800 to-gray-800 border-amber-800/60' 
                : 'bg-gradient-to-br from-amber-50/90 via-rose-50/30 to-white border-amber-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white flex items-center justify-center shadow-md mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="text-amber-600 dark:text-amber-400">Dual Contract</span> Lock
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                Both customer and tailor explicitly confirm project terms before work starts, generating an immutable agreement snapshot record.
              </p>
            </div>

            {/* Card 5: Electric Indigo & Magenta */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-indigo-950/40 via-gray-800 to-gray-800 border-indigo-800/60' 
                : 'bg-gradient-to-br from-indigo-50/90 via-pink-50/30 to-white border-indigo-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="text-indigo-600 dark:text-indigo-400">Order Stage</span> Photo Tracking
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                Tailors log stage updates across cutting, sewing, initial fitting, and delivery with visual progress photos for full transparency.
              </p>
            </div>

            {/* Card 6: Ruby Red & Gold */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-rose-950/40 via-gray-800 to-gray-800 border-rose-800/60' 
                : 'bg-gradient-to-br from-rose-50/90 via-amber-50/30 to-white border-rose-200/90 shadow-sm'
            }`}>
              <div className="p-3 w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-md mb-4">
                <Star className="h-6 w-6 fill-current" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="text-rose-600 dark:text-rose-400">Verified Reviews</span> & Replies
              </h3>
              <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                Customers rate completed orders from 1 to 5 stars with feedback. Tailors publish public responses to build atelier reputation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO & TAILOR WORK SHOWCASE SECTION (BEAUTIFUL FITTED CLOTHES GALLERY) */}
      <section id="portfolio" className={`py-20 ${isDark ? 'bg-gray-800' : 'bg-slate-50/70'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 mb-2">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Atelier Portfolio Showcase</span>
              </div>
              <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Handcrafted Tailoring Results
              </h2>
              <p className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-slate-600 font-semibold'} mt-1`}>
                Real bespoke garments tailored through the StitchMatch platform
              </p>
            </div>
            <Link to="/tailors" className="mt-4 md:mt-0 text-primary-600 font-bold text-sm flex items-center space-x-1 hover:underline">
              <span>View All Tailor Portfolios</span>
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

      {/* FEATURED DYNAMIC TAILORS SHOWCASE (REAL DATABASE UUIDs) */}
      <section id="tailors" className={`py-20 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Featured Master Tailors
              </h2>
              <p className={isDark ? 'text-gray-300' : 'text-slate-600 font-medium'}>
                Top rated bespoke craftsmen available for custom orders
              </p>
            </div>
            <Link to="/tailors" className="mt-4 md:mt-0 text-primary-600 font-bold text-sm flex items-center space-x-1 hover:underline">
              <span>Browse All Tailors</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingTailors ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : featuredTailors.length === 0 ? (
            <div className="card text-center py-12">
              <p className={isDark ? 'text-gray-400' : 'text-slate-500'}>No tailors available yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTailors.map((tailor) => {
                const specArray = Array.isArray(tailor.specialties) ? tailor.specialties : [];
                return (
                  <div key={tailor.id} className="card !p-6 flex flex-col justify-between hover:shadow-xl transition-all border border-slate-200 dark:border-gray-700 !bg-white dark:!bg-gray-800">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <img
                          src={tailor.user?.avatarUrl || 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=300&auto=format&fit=crop&q=80'}
                          alt={tailor.user?.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-gray-700 flex-shrink-0"
                        />
                        <div>
                          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tailor.user?.name}</h3>
                          <p className={`text-xs flex items-center ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            <MapPin className="h-3.5 w-3.5 mr-1 text-primary-600" />
                            {tailor.user?.location || 'Location available'}
                          </p>
                        </div>
                      </div>

                      <p className={`text-xs italic ${isDark ? 'text-gray-300' : 'text-slate-600'} line-clamp-2`}>
                        "{tailor.bio || 'Experienced tailor specializing in custom garment design.'}"
                      </p>

                      {tailor.basePricingMin && (
                        <p className="text-xs font-semibold text-primary-600">
                          Base Pricing: ${Number(tailor.basePricingMin).toLocaleString()} - ${Number(tailor.basePricingMax || tailor.basePricingMin * 3).toLocaleString()}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {specArray.slice(0, 3).map((spec: string) => (
                          <span key={spec} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 dark:border-gray-700 mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs font-bold text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{tailor.averageRating ? Number(tailor.averageRating).toFixed(1) : '5.0'}</span>
                      </div>
                      
                      <Link to={`/tailors/${tailor.id}`} className="btn-primary text-xs px-4 py-2 inline-flex items-center space-x-1">
                        <span>View Profile & Order</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* DUAL CTA BOX */}
      <section className="py-20 bg-gradient-to-r from-primary-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold">Ready to Wear Clothes Fitted Perfectly to You?</h2>
          <p className="text-lg text-primary-100 max-w-2xl mx-auto font-medium">
            Join thousands of satisfied clients or register your tailoring studio today.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link to="/tailors" className="bg-white text-primary-700 font-bold px-8 py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-lg flex items-center justify-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Find a Tailor Now</span>
            </Link>
            {!user && (
              <Link to="/register?role=tailor" className="bg-primary-900/40 text-white font-semibold border border-white/30 px-8 py-3.5 rounded-xl hover:bg-primary-900/60 transition-colors flex items-center justify-center space-x-2">
                <Scissors className="h-5 w-5" />
                <span>Register as a Tailor</span>
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
            <span className="text-xl font-bold text-white tracking-tight">StitchMatch</span>
          </div>
          <p className="text-sm max-w-md mx-auto text-slate-400">
            The Bespoke Custom Tailoring Platform with AI Body Scanning, Real-Time Messaging & Stage Tracking.
          </p>
          <p className="text-xs text-slate-500 pt-4">&copy; 2026 StitchMatch Atelier Network. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
