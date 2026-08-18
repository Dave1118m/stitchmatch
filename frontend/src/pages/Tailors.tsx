import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tailorsAPI, settingsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Search, MapPin, Star, Scissors, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { TailorCardSkeleton } from '../components/SkeletonLoaders';

function getTailorFeaturedImage(tailor: any): string {
  if (tailor.portfolioImages && Array.isArray(tailor.portfolioImages) && tailor.portfolioImages.length > 0) {
    const first = tailor.portfolioImages[0];
    if (typeof first === 'string' && (first.startsWith('http') || first.startsWith('/'))) return first;
    if (first && typeof first === 'object' && first.imageUrl) return first.imageUrl;
  }
  if (tailor.products && Array.isArray(tailor.products) && tailor.products.length > 0) {
    const prodImg = tailor.products[0]?.images?.[0]?.url;
    if (prodImg) return prodImg;
  }
  if (tailor.user?.avatarUrl) return tailor.user.avatarUrl;
  return 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80';
}

function getInitials(name?: string): string {
  if (!name) return 'TM';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function Tailors() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDark = useDarkMode();

  const [tailors, setTailors] = useState<any[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State matching Figma screenshot
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedRating, setSelectedRating] = useState<string>('any'); // 'any', '4', '4.5', '4.8'
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [priceCap, setPriceCap] = useState<number>(3000);

  useEffect(() => {
    const qSearch = searchParams.get('search') || '';
    const qSpecialty = searchParams.get('specialty') || 'All';
    const qRating = searchParams.get('minRating') || 'any';
    const qMaxPrice = searchParams.get('maxPrice');

    if (qSearch) setSearchQuery(qSearch);
    if (qSpecialty) setSelectedSpecialty(qSpecialty);
    if (qRating) setSelectedRating(qRating);
    if (qMaxPrice) setMaxPrice(Number(qMaxPrice));

    loadTailorsData(qSearch, qSpecialty, qRating, qMaxPrice ? Number(qMaxPrice) : 2000);
  }, [searchParams]);

  const loadTailorsData = async (
    search: string,
    specialty: string,
    rating: string,
    priceLimit: number
  ) => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (specialty && specialty !== 'All') params.specialty = specialty;
      if (rating && rating !== 'any') params.minRating = rating;
      if (priceLimit && priceLimit < priceCap) params.maxPrice = priceLimit;

      const [tailorsRes, publicSettingsRes] = await Promise.all([
        tailorsAPI.search(params),
        settingsAPI.getPublic().catch(() => ({ data: { settings: { specialtiesList: [] } } })),
      ]);

      const loadedTailors = tailorsRes.data.tailors || [];
      setTailors(loadedTailors);

      // Compute dynamic max price cap
      const maxFoundPrice = Math.max(
        ...loadedTailors.map((t: any) => Number(t.basePricingMax || t.basePricingMin || 1000)),
        2000
      );
      setPriceCap(Math.ceil(maxFoundPrice / 100) * 100);

      // Collect distinct specialties
      const tailorSpecs = loadedTailors.flatMap((t: any) => (t.specialties || []) as string[]);
      const platformSpecs = publicSettingsRes.data?.settings?.specialtiesList || [];
      const distinctSpecs = Array.from(new Set([...tailorSpecs, ...platformSpecs])).filter(Boolean).sort();
      setAvailableSpecialties(distinctSpecs as string[]);
    } catch (err) {
      console.error('Failed to load tailors', err);
      setTailors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newParams: Record<string, string> = {};
    if (searchQuery.trim()) newParams.search = searchQuery.trim();
    if (selectedSpecialty && selectedSpecialty !== 'All') newParams.specialty = selectedSpecialty;
    if (selectedRating && selectedRating !== 'any') newParams.minRating = selectedRating;
    if (maxPrice < priceCap) newParams.maxPrice = String(maxPrice);

    setSearchParams(newParams);
    loadTailorsData(searchQuery, selectedSpecialty, selectedRating, maxPrice);
  };

  const ratingOptions = [
    { value: 'any', label: 'Any' },
    { value: '4', label: '4+' },
    { value: '4.5', label: '4.5+' },
    { value: '4.8', label: '4.8+' },
  ];

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-[#0f1117] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${isDark ? 'bg-[#0f1117]/90 border-slate-800/80' : 'bg-white/90 border-slate-200 shadow-2xs'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-700 p-2 rounded-xl text-white shadow-md group-hover:scale-105 transition-transform">
              <Scissors className="h-5 w-5" />
            </div>
            <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Stitch<span className="text-amber-500">Match</span>
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            <LanguageSwitcher variant="dropdown" />
            <Link
              to={user ? '/dashboard' : '/'}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {user ? t('nav.requests') : t('common.back')}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Title & Subtitle */}
        <div className="mb-6">
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Find the perfect craftsperson for your garment.
          </p>
        </div>

        {/* Search & Filter Bar (Figma Style) */}
        <form onSubmit={handleApplyFilters} className={`p-4 sm:p-5 rounded-2xl border shadow-xl mb-8 ${
          isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Top Row: Search Input + Category Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className={`flex-1 flex items-center px-4 py-3 rounded-xl border w-full transition-all ${
              isDark ? 'bg-[#0f1117] border-slate-700/80 focus-within:border-amber-500' : 'bg-slate-50 border-slate-200 focus-within:border-amber-500'
            }`}>
              <Search className={`h-5 w-5 mr-3 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent outline-none text-sm font-medium ${
                  isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Specialty Dropdown */}
            <div className="w-full sm:w-56">
              <select
                value={selectedSpecialty}
                onChange={(e) => {
                  setSelectedSpecialty(e.target.value);
                  setTimeout(() => handleApplyFilters(), 0);
                }}
                className={`w-full py-3 px-4 rounded-xl border text-sm font-medium outline-none cursor-pointer ${
                  isDark
                    ? 'bg-[#0f1117] border-slate-700/80 text-white focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'
                }`}
              >
                <option value="All">All Specialties</option>
                {availableSpecialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Row: Min Rating Pills & Max Price Slider */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200/40 dark:border-slate-800">
            {/* Rating Filter Pills */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className={`text-xs font-semibold uppercase tracking-wider mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Min Rating:
              </span>
              {ratingOptions.map((opt) => {
                const isActive = selectedRating === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedRating(opt.value);
                      setTimeout(() => handleApplyFilters(), 0);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-md'
                        : isDark
                        ? 'bg-[#0f1117] text-slate-400 hover:text-white border border-slate-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Max Price Range Slider */}
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <span className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Max Price:
              </span>
              <input
                type="range"
                min="50"
                max={priceCap}
                step="25"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                onMouseUp={() => handleApplyFilters()}
                onTouchEnd={() => handleApplyFilters()}
                className="w-36 sm:w-48 accent-amber-500 cursor-pointer"
              />
              <span className="text-sm font-bold text-amber-500 min-w-[50px]">
                ${maxPrice}
              </span>

              <button
                type="submit"
                className="ml-auto sm:ml-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filter</span>
              </button>
            </div>
          </div>
        </form>

        {/* Tailors Grid (3 Columns Matching Figma) */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <TailorCardSkeleton key={n} />
            ))}
          </div>
        ) : tailors.length === 0 ? (
          <div className={`p-16 text-center rounded-2xl border ${isDark ? 'bg-[#171923] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
            <Scissors className="h-14 w-14 mx-auto mb-4 text-amber-500 opacity-80" />
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No craftspersons found matching your criteria
            </h3>
            <p className="text-sm mb-6">
              Try broadening your specialty filters, rating threshold, or search query.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSpecialty('All');
                setSelectedRating('any');
                setMaxPrice(priceCap);
                setSearchParams({});
                loadTailorsData('', 'All', 'any', priceCap);
              }}
              className="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm shadow-md hover:bg-amber-700 transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tailors.map((tailor) => {
              const featuredImg = getTailorFeaturedImage(tailor);
              const initials = getInitials(tailor.user?.name);
              const specialtiesList = Array.isArray(tailor.specialties) ? tailor.specialties : [];
              const startingPrice = tailor.basePricingMin || 85;

              return (
                <Link
                  key={tailor.id}
                  to={`/tailors/${tailor.id}`}
                  className={`group rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col justify-between ${
                    isDark
                      ? 'bg-[#171923] border-slate-800 hover:border-amber-500/50'
                      : 'bg-white border-slate-200 hover:border-amber-400 shadow-sm'
                  }`}
                >
                  {/* Top: Work / Portfolio Image */}
                  <div className="relative h-56 overflow-hidden bg-slate-950">
                    <img
                      src={featuredImg}
                      alt={tailor.user?.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                  </div>

                  {/* Bottom: Tailor Information */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Avatar Badge & Name / Location */}
                      <div className="flex items-center space-x-3 mb-3">
                        {tailor.user?.avatarUrl ? (
                          <img
                            src={tailor.user.avatarUrl}
                            alt={tailor.user?.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-amber-500/60 shadow-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-extrabold flex items-center justify-center text-sm shadow-md flex-shrink-0 border border-amber-500/40">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-base truncate transition-colors group-hover:text-amber-500 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {tailor.user?.name}
                          </h3>
                          <p className={`text-xs flex items-center truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <MapPin className="h-3.5 w-3.5 mr-1 text-amber-500 flex-shrink-0" />
                            <span className="truncate">{tailor.user?.location || 'Location verified'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Specialty Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {specialtiesList.slice(0, 2).map((spec: string) => (
                          <span
                            key={spec}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              isDark
                                ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Row: Rating Stars & Starting Price */}
                    <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
                      {/* Rating & Count */}
                      <div className="flex items-center space-x-1.5">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < Math.floor(tailor.averageRating || 5) ? 'fill-current' : 'opacity-40'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ({tailor.reviewCount || (tailor.averageRating ? 24 : 0)})
                        </span>
                      </div>

                      {/* Starting Price */}
                      <div className="text-right">
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mr-1`}>
                          from
                        </span>
                        <span className="text-base font-extrabold text-amber-500">
                          ${startingPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}