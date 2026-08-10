import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tailorsAPI } from '../lib/api';
import { useDarkMode } from '../hooks/useDarkMode';
import PortfolioGallery from '../components/PortfolioGallery';
import { ArrowLeft, Scissors, Image as ImageIcon } from 'lucide-react';
export default function Portfolio() {
  const { id } = useParams();
  const isDark = useDarkMode();
  const [tailor, setTailor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTailor();
  }, [id]);

  const loadTailor = async () => {
    try {
      const res = await tailorsAPI.getById(id!);
      if (res.data?.tailor) {
        setTailor(res.data.tailor);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to load portfolio.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="text-red-500 p-4 text-center">{error}</div></div>;
  if (!tailor) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"><p>Tailor not found</p></div>;

  const portfolioItems = tailor.portfolioImages || [];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={`/tailors/${id}`} className={`flex items-center space-x-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <ArrowLeft className="h-4 w-4" /><span>Back to Profile</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Scissors className={`h-5 w-5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.user.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center space-x-3 mb-6">
          <ImageIcon className={`h-6 w-6 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Portfolio</h1>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({portfolioItems.length} {portfolioItems.length === 1 ? 'image' : 'images'})</span>
        </div>

        {portfolioItems.length === 0 ? (
          <div className="card text-center py-16">
            <ImageIcon className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No portfolio images yet</h3>
            <p className={`mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This tailor hasn't added any portfolio images.</p>
            <Link to={`/tailors/${id}`} className="btn-primary mt-6 inline-block">Back to Profile</Link>
          </div>
        ) : (
          <PortfolioGallery items={portfolioItems} />
        )}
      </div>
    </div>
  );
}