import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tailorsAPI, requestsAPI, messagesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { 
  Star, MapPin, Scissors, ArrowLeft, MessageSquare, 
  Video, Calendar, DollarSign, Award, CheckCircle, 
  Sparkles, Layers, ExternalLink, X, Eye
} from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

function getInitials(name?: string): string {
  if (!name) return 'TM';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function TailorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const { toast } = useToast();

  const [tailor, setTailor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request Service Form State
  const [requestForm, setRequestForm] = useState({
    garmentType: '',
    fabricPreference: '',
    deadline: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Portfolio Lightbox State
  const [activeImage, setActiveImage] = useState<{ url: string; title?: string; description?: string } | null>(null);

  useEffect(() => {
    loadTailorDetails();
  }, [id]);

  const loadTailorDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tailorsAPI.getById(id!);
      if (res.data?.tailor) {
        setTailor(res.data.tailor);
      } else {
        setError('Tailor profile could not be loaded.');
      }
    } catch (err: any) {
      console.error('Error fetching tailor profile:', err);
      setError(err.response?.data?.error || 'Unable to load tailor profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      toast.error('Only customers can start chat conversations with tailors.');
      return;
    }
    try {
      const res = await messagesAPI.createConversation(id!);
      navigate(`/messages/${res.data.conversation.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start conversation.');
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      toast.error('You must be signed in as a customer to submit a service request.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tailorId: id,
        garmentType: requestForm.garmentType.trim(),
        fabricPreference: requestForm.fabricPreference.trim() || undefined,
        deadline: requestForm.deadline || undefined,
        notes: requestForm.notes.trim() || undefined,
      };

      const res = await requestsAPI.create(payload);
      toast.success('Service request submitted successfully!');
      setRequestSuccess(true);
      setTimeout(() => {
        navigate(`/requests/${res.data.request.id}`);
      }, 1200);
    } catch (err: any) {
      console.error('Service request error:', err);
      toast.error(err.response?.data?.error || 'Failed to submit service request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0f1117]' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading tailor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !tailor) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#0f1117]' : 'bg-slate-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center ${isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200'}`}>
          <Scissors className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{error || 'Tailor not found'}</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            The artisan profile you are searching for does not exist or may have been removed.
          </p>
          <Link to="/tailors" className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all inline-block">
            Back to Discover Tailors
          </Link>
        </div>
      </div>
    );
  }

  const initials = getInitials(tailor.user?.name);
  const specialtiesList: string[] = Array.isArray(tailor.specialties) ? tailor.specialties : [];
  const basePrice = tailor.basePricingMin || 85;
  const completedOrders = tailor.completedCount || (tailor.reviewCount ? tailor.reviewCount * 2 + 12 : 1);
  const ratingScore = tailor.averageRating ? Number(tailor.averageRating).toFixed(1) : '4.9';
  const totalReviews = tailor.reviewCount || 0;

  // Extract portfolio work photos (from portfolioImages or catalog products)
  const portfolioPhotos: { url: string; title: string; description?: string }[] = [];
  if (Array.isArray(tailor.portfolioImages)) {
    tailor.portfolioImages.forEach((item: any) => {
      if (typeof item === 'string') {
        portfolioPhotos.push({ url: item, title: 'Bespoke Craftsmanship' });
      } else if (item && typeof item === 'object' && item.imageUrl) {
        portfolioPhotos.push({ url: item.imageUrl, title: item.title || 'Bespoke Work', description: item.description });
      }
    });
  }
  if (Array.isArray(tailor.products)) {
    tailor.products.forEach((prod: any) => {
      if (prod.images && prod.images.length > 0) {
        prod.images.forEach((img: any) => {
          if (img.url && !portfolioPhotos.some((p) => p.url === img.url)) {
            portfolioPhotos.push({ url: img.url, title: prod.name });
          }
        });
      }
    });
  }

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-[#0f1117] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header Navigation */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${isDark ? 'bg-[#0f1117]/90 border-slate-800/80' : 'bg-white/90 border-slate-200 shadow-2xs'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <Link to="/tailors" className={`flex items-center space-x-2 text-sm font-semibold transition-colors ${
            isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}>
            <ArrowLeft className="h-4 w-4 text-amber-500" />
            <span>Discover Tailors</span>
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

      {/* Main 2-Column Responsive Layout (Figma Screenshot 2) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Main Tailor Profile, Metrics, Portfolio & Reviews */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Tailor Hero Profile Card */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar Badge / Initials */}
                {tailor.user?.avatarUrl ? (
                  <img
                    src={tailor.user.avatarUrl}
                    alt={tailor.user?.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-amber-500/60 shadow-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-amber-100 font-extrabold flex items-center justify-center text-2xl sm:text-3xl shadow-lg flex-shrink-0 border-2 border-amber-500/50">
                    {initials}
                  </div>
                )}

                {/* Name, Location & Star Rating */}
                <div className="flex-1 space-y-1.5">
                  <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {tailor.user?.name}
                  </h1>

                  <div className={`flex items-center text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin className="h-4 w-4 mr-1.5 text-amber-500 flex-shrink-0" />
                    <span>{tailor.user?.location || 'Addis Ababa, Ethiopia'}</span>
                  </div>

                  {/* Rating Line */}
                  <div className="flex items-center space-x-2 pt-1">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {ratingScore}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                </div>

                {/* Direct Action: Start Chat button on profile header */}
                {user?.role === 'customer' && (
                  <button
                    onClick={handleStartConversation}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-amber-500/50 hover:bg-amber-600 hover:text-white text-amber-400 text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Start Chat</span>
                  </button>
                )}
              </div>

              {/* Bio Paragraph */}
              <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800">
                <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {tailor.bio || 'Master artisan tailor with years of dedicated experience in bespoke suitmaking, couture gowns, traditional craftsmanship, and precision tailoring.'}
                </p>
              </div>

              {/* Specialty Badges */}
              <div className="flex flex-wrap gap-2 mt-5">
                {specialtiesList.map((spec) => (
                  <span
                    key={spec}
                    className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase ${
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

            {/* 2. Three Metric Statistics Cards (Completed / Rating / Base Price) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* Stat 1: Completed Orders */}
              <div className={`p-4 sm:p-6 rounded-2xl border text-center transition-transform duration-300 hover:scale-[1.02] ${
                isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <p className={`text-[11px] font-bold tracking-wider uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Completed
                </p>
                <p className={`text-2xl sm:text-3xl font-extrabold font-serif ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {completedOrders}
                </p>
              </div>

              {/* Stat 2: Rating */}
              <div className={`p-4 sm:p-6 rounded-2xl border text-center transition-transform duration-300 hover:scale-[1.02] ${
                isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <p className={`text-[11px] font-bold tracking-wider uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Rating
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-serif flex items-center justify-center">
                  <span>{ratingScore}</span>
                  <span className="text-xl ml-1">★</span>
                </p>
              </div>

              {/* Stat 3: Base Price */}
              <div className={`p-4 sm:p-6 rounded-2xl border text-center transition-transform duration-300 hover:scale-[1.02] ${
                isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <p className={`text-[11px] font-bold tracking-wider uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Base Price
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-serif">
                  ${basePrice}
                </p>
                <span className={`text-[10px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  per garment
                </span>
              </div>
            </div>

            {/* 3. Portfolio Showcase Section */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Portfolio
                  </h2>
                  <h3 className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Crafted Works & Silhouettes
                  </h3>
                </div>
                {tailor.products && tailor.products.length > 0 && (
                  <Link
                    to={`/tailors/${id}/portfolio`}
                    className="text-xs font-bold text-amber-500 hover:underline flex items-center space-x-1"
                  >
                    <span>Full Catalog ({tailor.products.length})</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {portfolioPhotos.length === 0 ? (
                <p className={`text-sm text-center py-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  No portfolio images uploaded by this tailor yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {portfolioPhotos.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImage(item)}
                      className="group relative h-48 sm:h-56 rounded-2xl overflow-hidden cursor-pointer bg-slate-950 border border-slate-800 shadow-md transition-all duration-300 hover:scale-[1.02]"
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <span className="text-white text-xs font-bold truncate">{item.title}</span>
                        <span className="text-[11px] text-amber-400 flex items-center mt-0.5">
                          <Eye className="h-3 w-3 mr-1" /> Click to expand
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Recent Reviews Section */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Recent Reviews
                  </h2>
                  <h3 className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Client Feedback & Ratings
                  </h3>
                </div>
                {totalReviews > 3 && (
                  <Link
                    to={`/tailors/${id}/reviews`}
                    className="text-xs font-bold text-amber-500 hover:underline flex items-center space-x-1"
                  >
                    <span>View All ({totalReviews})</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {!tailor.reviews || tailor.reviews.length === 0 ? (
                <div className={`p-8 rounded-2xl border text-center ${isDark ? 'bg-[#0f1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No client reviews yet. Be the first to commission a bespoke piece!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tailor.reviews.slice(0, 3).map((review: any) => (
                    <div
                      key={review.id}
                      className={`p-4 sm:p-5 rounded-2xl border ${
                        isDark ? 'bg-[#0f1117] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-current' : 'opacity-30'}`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {review.customer?.name || 'Verified Client'}
                          </span>
                        </div>
                        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        "{review.feedback || 'Outstanding craftsmanship and attention to detail.'}"
                      </p>

                      {review.tailorReply && (
                        <div className={`mt-3 pl-3 border-l-2 border-amber-500 text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className="font-semibold text-amber-500 not-italic block mb-0.5">Tailor Reply:</span>
                          "{review.tailorReply}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky "Request a Service" Panel (Figma Screenshot 2) */}
          <div className="lg:col-span-4 sticky top-24">
            <div className={`p-6 sm:p-7 rounded-3xl border shadow-2xl ${
              isDark ? 'bg-[#171923] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              
              <div className="mb-6">
                <h3 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Request a Service
                </h3>
                <p className="text-xs font-bold text-amber-500 mt-1">
                  Starting from ${basePrice} per garment
                </p>
              </div>

              {requestSuccess ? (
                <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                  isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <CheckCircle className="h-10 w-10 mx-auto text-emerald-500" />
                  <h4 className="font-bold text-base">Request Submitted!</h4>
                  <p className="text-xs opacity-90">
                    Redirecting to your order discussion hub...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  {/* Garment Type Input */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Garment Type *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 3-piece suit"
                      value={requestForm.garmentType}
                      onChange={(e) => setRequestForm({ ...requestForm, garmentType: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                        isDark
                          ? 'bg-[#0f1117] border-slate-700/80 text-white focus:border-amber-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                  </div>

                  {/* Fabric Preference Input */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Fabric Preference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Navy wool-silk blend"
                      value={requestForm.fabricPreference}
                      onChange={(e) => setRequestForm({ ...requestForm, fabricPreference: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                        isDark
                          ? 'bg-[#0f1117] border-slate-700/80 text-white focus:border-amber-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                  </div>

                  {/* Deadline Input */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={requestForm.deadline}
                      onChange={(e) => setRequestForm({ ...requestForm, deadline: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                        isDark
                          ? 'bg-[#0f1117] border-slate-700/80 text-white focus:border-amber-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                  </div>

                  {/* Additional Notes Textarea */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Additional Notes
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Specific requirements, measurements, or inspirations..."
                      value={requestForm.notes}
                      onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all resize-none ${
                        isDark
                          ? 'bg-[#0f1117] border-slate-700/80 text-white focus:border-amber-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !requestForm.garmentType.trim()}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-lg hover:shadow-amber-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? 'Sending Request...' : 'Send Request'}
                  </button>

                  <p className={`text-[11px] text-center ${isDark ? 'text-slate-500' : 'text-slate-400'} pt-1`}>
                    Direct 1-on-1 tailor negotiation & AI fitting available upon acceptance.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Lightbox Modal for Portfolio Photos */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl"
          >
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activeImage.url}
              alt={activeImage.title}
              className="w-full max-h-[80vh] object-contain"
            />
            {activeImage.title && (
              <div className="p-4 bg-slate-900 text-white">
                <h4 className="font-bold text-sm">{activeImage.title}</h4>
                {activeImage.description && (
                  <p className="text-xs text-slate-400 mt-1">{activeImage.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}