import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tailorsAPI, reviewsAPI } from '../lib/api';
import { useDarkMode } from '../hooks/useDarkMode';
import ReviewCard from '../components/ReviewCard';
import ReviewStats from '../components/ReviewStats';
import { ArrowLeft, Scissors, Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Reviews() {
  const { id } = useParams();
  const isDark = useDarkMode();
  const [tailor, setTailor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0, distribution: {} as Record<number, number> });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('newest');
  const [ratingFilter, setRatingFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadTailor();
  }, [id]);

  useEffect(() => {
    if (id) loadReviews();
  }, [id, sort, ratingFilter, page]);

  const loadTailor = async () => {
    try {
      const res = await tailorsAPI.getById(id!);
      if (res.data?.tailor) {
        setTailor(res.data.tailor);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to load tailor.');
    }
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (sort !== 'newest') params.sort = sort;
      if (ratingFilter) params.rating = ratingFilter;
      const res = await reviewsAPI.getByTailor(id!, params);
      setReviews(res.data.reviews);
      setStats({
        averageRating: res.data.averageRating,
        totalReviews: res.data.totalReviews,
        distribution: res.data.distribution,
      });
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
    setPage(1);
  };

  const handleRatingFilter = (rating: string) => {
    setRatingFilter(rating === ratingFilter ? '' : rating);
    setPage(1);
  };

  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="text-red-500 p-4 text-center">{error}</div></div>;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={`/tailors/${id}`} className={`flex items-center space-x-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <ArrowLeft className="h-4 w-4" /><span>Back to Profile</span>
            </Link>
            {tailor && (
              <div className="flex items-center space-x-2">
                <Scissors className={`h-5 w-5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.user.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center space-x-3 mb-6">
          <Star className={`h-6 w-6 text-yellow-400 fill-current`} />
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Reviews</h1>
          {stats.totalReviews > 0 && (
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})</span>
          )}
        </div>

        {/* Stats Summary */}
        {stats.totalReviews > 0 && (
          <div className="mb-8">
            <ReviewStats
              averageRating={stats.averageRating}
              totalReviews={stats.totalReviews}
              distribution={stats.distribution}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Rating filter chips */}
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
            {['5', '4', '3', '2', '1'].map((r) => (
              <button
                key={r}
                onClick={() => handleRatingFilter(r)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  ratingFilter === r
                    ? 'bg-primary-600 text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {r}★
              </button>
            ))}
            {ratingFilter && (
              <button
                onClick={() => setRatingFilter('')}
                className={`text-xs ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Sort:</label>
            <select
              value={sort}
              onChange={handleSortChange}
              className={`text-sm rounded-lg border px-3 py-1.5 ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="card text-center py-16">
            <Star className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {ratingFilter ? 'No reviews match this filter' : 'No reviews yet'}
            </h3>
            <p className={`mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {ratingFilter ? 'Try a different rating filter.' : 'Be the first to leave a review!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-4 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'} disabled:opacity-50`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'} disabled:opacity-50`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}