import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Select from 'react-select';
import { tailorsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { Search, MapPin, Star, Scissors } from 'lucide-react';
import { TailorCardSkeleton } from '../components/SkeletonLoaders';

export default function Tailors() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tailors, setTailors] = useState<any[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', location: '', specialty: '', minRating: '' });
  const [selectedSpecialty, setSelectedSpecialty] = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState<any>(null);

  const isDark = useDarkMode();

  const specialtyOptions = availableSpecialties.map(s => ({ value: s, label: s }));
  const ratingOptions = [
    { value: '', label: 'Any Rating' },
    { value: '4', label: '4+ Stars' },
    { value: '3', label: '3+ Stars' },
    { value: '2', label: '2+ Stars' },
  ];

  useEffect(() => {
    const qSearch = searchParams.get('search') || '';
    const qSpecialty = searchParams.get('specialty') || '';
    const qLocation = searchParams.get('location') || '';

    const newFilters = {
      search: qSearch,
      location: qLocation,
      specialty: qSpecialty,
      minRating: '',
    };

    if (qSpecialty) {
      setSelectedSpecialty({ value: qSpecialty, label: qSpecialty });
    }

    setFilters(newFilters);
    loadTailorsWithParams(newFilters, qSpecialty);
  }, [searchParams]);

  const loadTailorsWithParams = async (currentFilters: any, querySpecialty?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (currentFilters.search) params.search = currentFilters.search;
      if (currentFilters.location) params.location = currentFilters.location;
      
      const activeSpec = querySpecialty || (selectedSpecialty ? selectedSpecialty.value : currentFilters.specialty);
      if (activeSpec) params.specialty = activeSpec;

      if (selectedRating) params.minRating = selectedRating.value;

      const res = await tailorsAPI.search(params);
      setTailors(res.data.tailors || []);
      const specialties = Array.from(new Set((res.data.tailors || []).flatMap((t: any) => (t.specialties || []) as string[]))).sort();
      setAvailableSpecialties(specialties as string[]);
    } catch (err) {
      console.error('Failed to load tailors', err);
      setAvailableSpecialties([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTailors = async () => {
    await loadTailorsWithParams(filters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTailors();
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Scissors className="h-8 w-8 text-primary-600" />
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>StitchMatch</span>
          </Link>
          <Link to={user ? '/dashboard' : '/'} className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            {user ? 'Dashboard' : 'Home'}
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filters */}
        <form onSubmit={handleSearch} className="card mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className={`absolute left-3 top-3 h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search tailors..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input-field pl-10"
              />
            </div>
            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="input-field"
            />
            <Select
              value={selectedSpecialty}
              onChange={setSelectedSpecialty}
              options={specialtyOptions}
              placeholder="All Specialties"
              isClearable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: isDark ? '#374151' : '#fff',
                  borderColor: isDark ? '#4B5563' : '#D1D5DB',
                  color: isDark ? '#fff' : '#000',
                }),
                singleValue: (base) => ({
                  ...base,
                  color: isDark ? '#fff' : '#000',
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: isDark ? '#374151' : '#fff',
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#7C3AED' : (state.isFocused ? (isDark ? '#4B5563' : '#F3F4F6') : (isDark ? '#374151' : '#fff')),
                  color: isDark ? '#fff' : '#000',
                }),
                input: (base) => ({
                  ...base,
                  color: isDark ? '#fff' : '#000',
                }),
              }}
            />
            <button type="submit" className="btn-primary">Search</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Min Rating</label>
              <Select
                value={selectedRating}
                onChange={setSelectedRating}
                options={ratingOptions}
                placeholder="Any Rating"
                isClearable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: isDark ? '#374151' : '#fff',
                    borderColor: isDark ? '#4B5563' : '#D1D5DB',
                    color: isDark ? '#fff' : '#000',
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: isDark ? '#fff' : '#000',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: isDark ? '#374151' : '#fff',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected ? '#7C3AED' : (state.isFocused ? (isDark ? '#4B5563' : '#F3F4F6') : (isDark ? '#374151' : '#fff')),
                    color: isDark ? '#fff' : '#000',
                  }),
                  input: (base) => ({
                    ...base,
                    color: isDark ? '#fff' : '#000',
                  }),
                }}
              />
            </div>
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <TailorCardSkeleton key={n} />
            ))}
          </div>
        ) : tailors.length === 0 ? (
          <div className="text-center py-20">
            <Scissors className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No tailors found</h3>
            <p className={isDark ? 'text-gray-500 mt-2' : 'text-gray-400 mt-2'}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tailors.map((tailor: any) => {
              console.log('Tailor data:', tailor);
              return (
                <Link key={tailor.id} to={`/tailors/${tailor.id}`} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className={`w-16 h-16 ${isDark ? 'bg-gray-700' : 'bg-primary-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                    {tailor.user.avatarUrl ? (
                      <img src={tailor.user.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <Scissors className={`h-8 w-8 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-lg truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.user.name}</h3>
                    <div className={`flex items-center text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="truncate">{tailor.user.location || 'Location not set'}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className={`text-sm font-medium ml-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.averageRating?.toFixed(1) || 'New'}</span>
                      <span className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({tailor.reviewCount || 0})</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tailor.specialties?.slice(0, 3).map((s: string) => (
                    <span key={s} className={`px-2 py-1 ${isDark ? 'bg-gray-700 text-primary-400' : 'bg-primary-50 text-primary-700'} text-xs rounded-full`}>{s}</span>
                  ))}
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