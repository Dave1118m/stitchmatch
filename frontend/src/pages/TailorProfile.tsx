import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tailorsAPI, requestsAPI, messagesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import PortfolioGallery from '../components/PortfolioGallery';
import ReviewCard from '../components/ReviewCard';
import ReviewStats from '../components/ReviewStats';
import { Star, MapPin, Scissors, ArrowLeft, Send, MessageSquare, Image, ExternalLink, Package } from 'lucide-react';

export default function TailorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const [tailor, setTailor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ garmentType: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTailor();
  }, [id]);

  const loadTailor = async () => {
    try {
      const res = await tailorsAPI.getById(id!);
      
      if (res.data && res.data.tailor) {
        setTailor(res.data.tailor);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to load tailor profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'customer') {
      setError('You must be signed in as a customer to send a request.');
      setSubmitting(false);
      return;
    }

    try {
      console.log('Sending request:', { tailorId: id, ...requestForm });
      const res = await requestsAPI.create({ tailorId: id, ...requestForm });
      console.log('Request sent successfully:', res.data);
      navigate(`/dashboard`);
    } catch (err: any) {
      console.error('Failed to send request:', err);
      setError(err.response?.data?.error || 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartConversation = async () => {
    if (!user) {
      setError('You must be signed in to send a message.');
      navigate('/login');
      return;
    }

    if (user.role !== 'customer') {
      setError('Only customers can start conversations with tailors.');
      return;
    }

    try {
      const res = await messagesAPI.createConversation(id!);
      navigate(`/messages/${res.data.conversation.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start conversation.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="text-red-500 p-4 text-center">{error}</div></div>;
  if (!tailor) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"><p>Tailor not found</p></div>;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/tailors" className={`flex items-center space-x-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
            <ArrowLeft className="h-4 w-4" /><span>Back to Tailors</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
            <div className={`w-24 h-24 ${isDark ? 'bg-gray-700' : 'bg-primary-100'} rounded-full flex items-center justify-center mx-auto md:mx-0 mb-4 md:mb-0`}>
              {tailor.user.avatarUrl ? (
                <img src={tailor.user.avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <Scissors className={`h-12 w-12 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.user.name}</h1>
              <div className={`flex items-center justify-center md:justify-start ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                <MapPin className="h-4 w-4 mr-1" /><span>{tailor.user.location || 'Location not set'}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start mt-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className={`text-lg font-semibold ml-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {tailor.averageRating ? Number(tailor.averageRating).toFixed(1) : 'New'}
                </span>
                <span className={isDark ? 'text-gray-500 ml-1' : 'text-gray-500 ml-1'}>({tailor.reviewCount || 0} reviews)</span>
              </div>
            </div>
            {user?.role === 'customer' && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                <button onClick={handleStartConversation} className="btn-secondary flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Chat
                </button>
                <button onClick={() => setShowRequest(!showRequest)} className="btn-primary flex items-center justify-center">
                  {showRequest ? 'Cancel' : 'Send Request'}
                </button>
              </div>
            )}
          </div>

          {/* Specialties */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
            {tailor.specialties?.map((s: string) => (
              <span key={s} className={`px-3 py-1 ${isDark ? 'bg-gray-700 text-primary-400' : 'bg-primary-50 text-primary-700'} rounded-full text-sm`}>{s}</span>
            ))}
          </div>

          {/* Bio */}
          {tailor.bio && <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{tailor.bio}</p>}

          {/* Rating Distribution */}
          <div className="mt-4">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center text-sm mt-1">
                <span className={`w-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{star} star</span>
                <div className={`flex-1 h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full mx-2`}>
                  <div className="h-2 bg-yellow-400 rounded-full" style={{
                    width: `${tailor.reviewCount > 0 ? (tailor.ratingDistribution?.[star] || 0) / tailor.reviewCount * 100 : 0}%`
                  }}></div>
                </div>
                <span className={`w-8 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tailor.ratingDistribution?.[star] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Request Form */}
        {showRequest && (
          <div className="card mb-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Send Custom Request</h2>
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Pricing & deadlines will be discussed directly via chat or call
              </span>
            </div>
            {error && <div className={`mb-4 rounded-xl ${isDark ? 'bg-red-900/30 border border-red-800 p-3 text-sm text-red-300' : 'bg-red-50 border border-red-200 p-3 text-sm text-red-700'}`}>{error}</div>}
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Garment / Request Title *
                </label>
                <input 
                  required 
                  value={requestForm.garmentType} 
                  onChange={(e) => setRequestForm({ ...requestForm, garmentType: e.target.value })} 
                  className="input-field" 
                  placeholder="e.g., Custom 3-Piece Tuxedo, Evening Silk Dress, Tailored Blazer..." 
                />
              </div>
              <div>
                <label className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Request Details & Instructions *
                </label>
                <textarea 
                  required
                  value={requestForm.notes} 
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} 
                  className="input-field" 
                  rows={4} 
                  placeholder="Describe what you want made, your preferred style, fit requirements, fabric ideas, or any questions you'd like to discuss with the tailor..." 
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting || !requestForm.garmentType.trim() || !requestForm.notes.trim()} 
                className="btn-primary w-full py-3 font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
              >
                {submitting ? 'Sending Request...' : 'Send Request to Tailor'}
              </button>
            </form>
          </div>
        )}

        {/* Portfolio */}
        <div className={`card mb-6 flex flex-col items-center justify-center py-10 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Package className="h-12 w-12 text-primary-600 mb-4" />
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Products Catalog</h2>
            <p className={`mb-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Browse custom designs, garments, and products offered by this tailor.</p>
            <Link to={`/tailors/${id}/portfolio`} className="btn-primary flex items-center">
               View Catalog <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
        </div>

        {/* Reviews */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Star className="h-5 w-5 inline mr-1 text-yellow-400" /> Reviews
            </h2>
            {tailor.reviewCount > 0 && (
              <Link
                to={`/tailors/${id}/reviews`}
                className={`text-sm flex items-center space-x-1 ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
              >
                <span>View All</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          {tailor.reviews?.length === 0 ? (
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {tailor.reviews?.slice(0, 3).map((review: any) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
          {tailor.reviews?.length > 3 && (
            <div className="mt-4 text-center">
              <Link
                to={`/tailors/${id}/reviews`}
                className={`text-sm font-medium ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
              >
                View all {tailor.reviewCount} reviews
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}