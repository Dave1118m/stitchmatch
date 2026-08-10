import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { requestsAPI, measurementsAPI, ordersAPI, reviewsAPI, negotiationsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, MessageSquare, CheckCircle, XCircle, Star, Camera, Scissors, DollarSign, Calendar, FileText, Printer } from 'lucide-react';
import ImageModal from '../components/ImageModal';
import { RequestDetailSkeleton } from '../components/SkeletonLoaders';

const statusFlow = ['Pending', 'Under_Discussion', 'Agreed', 'In_Progress', 'Completed'];

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState({ frontPhotoUrl: '', sidePhotoUrl: '', backPhotoUrl: '' });
  const [orderStatus, setOrderStatus] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewReply, setReviewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

  // Negotiation state
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [negotiationForm, setNegotiationForm] = useState({
    proposedPrice: '',
    proposedDeadline: '',
    garmentSpecs: '{}',
    notes: '',
  });

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      console.log('Loading request with ID:', id);
      const res = await requestsAPI.getById(id!);
      console.log('Request response:', res.data);
      setRequest(res.data.request);
      // Load negotiations
      loadNegotiations();
    } catch (err) {
      console.error('Failed to load request', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNegotiations = async () => {
    try {
      const res = await negotiationsAPI.getByRequest(id!);
      setNegotiations(res.data.negotiations);
    } catch (err) {
      console.error('Failed to load negotiations', err);
    }
  };

  const handleAccept = async () => {
    try {
      console.log('Accepting request:', id);
      const res = await requestsAPI.accept(id!);
      console.log('Accept response:', res.data);
      loadRequest();
    } catch (err: any) {
      console.error('Failed to accept:', err);
      alert(err.response?.data?.error || 'Failed to accept');
    }
  };

  const handleReject = async () => {
    try {
      await requestsAPI.reject(id!);
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject');
    }
  };

  const handleConfirmCustomer = async () => {
    setSubmitting(true);
    try {
      await requestsAPI.confirmCustomer(id!);
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTailor = async () => {
    setSubmitting(true);
    try {
      await requestsAPI.confirmTailor(id!);
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await measurementsAPI.uploadPhotos(id!, photos);
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload photos');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ordersAPI.createEvent(id!, { status: orderStatus, notes: orderNotes });
      loadRequest();
      setOrderNotes('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reviewsAPI.create(id!, { rating: reviewRating, feedback: reviewFeedback.trim() });
      setReviewFeedback('');
      setReviewRating(5);
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!request.review?.id) return;
      await reviewsAPI.reply(request.review.id, { tailorReply: reviewReply.trim() });
      setReviewReply('');
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  // Negotiation handlers
  const handleProposeNegotiation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let garmentSpecsParsed: any = {};
      try {
        garmentSpecsParsed = JSON.parse(negotiationForm.garmentSpecs);
      } catch {
        garmentSpecsParsed = { specs: negotiationForm.garmentSpecs };
      }
      await negotiationsAPI.propose(id!, {
        proposedPrice: negotiationForm.proposedPrice || undefined,
        proposedDeadline: negotiationForm.proposedDeadline || undefined,
        garmentSpecs: garmentSpecsParsed,
        notes: negotiationForm.notes || undefined,
      });
      setShowNegotiationForm(false);
      setNegotiationForm({ proposedPrice: '', proposedDeadline: '', garmentSpecs: '{}', notes: '' });
      loadNegotiations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to propose counter-offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptNegotiation = async (negotiationId: string) => {
    try {
      await negotiationsAPI.accept(negotiationId);
      loadNegotiations();
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept');
    }
  };

  const handleDeclineNegotiation = async (negotiationId: string) => {
    try {
      await negotiationsAPI.decline(negotiationId);
      loadNegotiations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to decline');
    }
  };

  if (loading) return <RequestDetailSkeleton />;
  if (!request) return <p className="text-center py-20">Request not found</p>;

  const isCustomer = user?.id === request.customerId;
  const isTailor = user?.id === request.tailorId;
  const currentStep = statusFlow.indexOf(request.status);

  const pendingNegotiations = negotiations.filter((n) => n.status === 'pending');
  const negotiationHistory = negotiations.filter((n) => n.status !== 'pending');

  return (
    <div>
      <Link to="/dashboard" className={`flex items-center space-x-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-6 print:hidden`}>
        <ArrowLeft className="h-4 w-4" /><span>Back to Dashboard</span>
      </Link>

      {/* Image Modal Lightbox */}
      <ImageModal
        isOpen={!!modalImage}
        src={modalImage?.src || null}
        title={modalImage?.title}
        onClose={() => setModalImage(null)}
      />

      {/* Status Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.garmentType}</h1>
          <div className="flex items-center space-x-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium flex items-center space-x-2 transition-colors"
              title="Print or Save Order Spec Sheet PDF"
            >
              <Printer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Print Spec Sheet</span>
            </button>
            <Link to={`/messages/${id}`} className="btn-secondary flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" /><span>Chat</span>
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {statusFlow.map((status, index) => (
            <div key={status} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentStep ? 'bg-primary-600 text-white' : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
              }`}>
                {index < currentStep ? <CheckCircle className="h-5 w-5" /> : index + 1}
              </div>
              {index < statusFlow.length - 1 && (
                <div className={`w-12 md:w-20 h-1 mx-1 ${index < currentStep ? 'bg-primary-600' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`} />
              )}
            </div>
          ))}
        </div>
        <div className={`flex justify-between mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span>Pending</span><span>Discuss</span><span>Agreed</span><span>Progress</span><span>Done</span>
        </div>
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Request Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Customer:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.customer.name}</span></div>
            <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Tailor:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.tailor.name}</span></div>
            <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Garment:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.garmentType}</span></div>
            {request.fabricPreference && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Fabric:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.fabricPreference}</span></div>}
            {request.deadline && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Deadline:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{new Date(request.deadline).toLocaleDateString()}</span></div>}
            {request.budget && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Budget:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>${Number(request.budget).toLocaleString()}</span></div>}
            {request.finalPrice && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Final Price:</span><span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>${Number(request.finalPrice).toLocaleString()}</span></div>}
            {request.notes && <div className={`mt-2 p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded`}><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Notes:</span><p className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{request.notes}</p></div>}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Tailor: Accept/Reject */}
          {isTailor && request.status === 'Pending' && (
            <div className="card">
              <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Actions</h2>
              <div className="flex space-x-3">
                <button onClick={handleAccept} className="btn-primary flex-1 flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4" /><span>Accept</span>
                </button>
                <button onClick={handleReject} className="btn-secondary flex-1 flex items-center justify-center space-x-2">
                  <XCircle className="h-4 w-4" /><span>Reject</span>
                </button>
              </div>
            </div>
          )}

          {/* Confirm Agreement */}
          {request.status === 'Under_Discussion' && (
            <div className="card">
              <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Confirm Agreement</h2>
              {isCustomer && !request.customerConfirmed && (
                <button onClick={handleConfirmCustomer} disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Confirming...' : 'Confirm Agreement'}
                </button>
              )}
              {isTailor && !request.tailorConfirmed && (
                <button onClick={handleConfirmTailor} disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Confirming...' : 'Confirm Agreement'}
                </button>
              )}
              {request.customerConfirmed && request.tailorConfirmed && (
                <p className="text-green-600 flex items-center"><CheckCircle className="h-4 w-4 mr-2" />Both parties confirmed</p>
              )}
              {!request.customerConfirmed && !request.tailorConfirmed && (
                <div className="mt-3">
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    Use the Negotiation section below to discuss and agree on price, deadline, and specs before confirming.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Body Measurement Section */}
          {(isCustomer || isTailor) && (request.status === 'Agreed' || request.status === 'In_Progress' || request.measurement) && (
            <div className="card">
              <h2 className={`font-semibold mb-3 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Camera className="h-5 w-5 mr-2 text-primary-600" />
                AI Body Measurements & Specs
              </h2>

              {request.measurement ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                      request.measurement.aiStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                      request.measurement.aiStatus === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                    }`}>
                      AI Status: {request.measurement.aiStatus}
                    </span>
                    {request.measurement.aiConfidence && (
                      <span className="text-xs font-semibold text-primary-600">
                        Confidence: {Math.round(Number(request.measurement.aiConfidence))}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Chest</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.measurement.chest ? `${Number(request.measurement.chest).toFixed(1)} cm` : 'Pending'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Waist</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.measurement.waist ? `${Number(request.measurement.waist).toFixed(1)} cm` : 'Pending'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hip</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.measurement.hip ? `${Number(request.measurement.hip).toFixed(1)} cm` : 'Pending'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Inseam</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.measurement.inseam ? `${Number(request.measurement.inseam).toFixed(1)} cm` : 'Pending'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Shoulders</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.measurement.shoulderWidth ? `${Number(request.measurement.shoulderWidth).toFixed(1)} cm` : 'Pending'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Arm Length</span>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.measurement.armLength ? `${Number(request.measurement.armLength).toFixed(1)} cm` : 'Pending'}</span>
                    </div>
                  </div>

                  {(request.measurement.frontPhotoUrl || request.measurement.sidePhotoUrl || request.measurement.backPhotoUrl) && (
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1 font-medium`}>Measurement Photos (Click to Zoom):</p>
                      <div className="flex gap-2.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                        {request.measurement.frontPhotoUrl && (
                          <img
                            src={request.measurement.frontPhotoUrl}
                            alt="Front View"
                            onClick={() => setModalImage({ src: request.measurement.frontPhotoUrl, title: 'Front Measurement View' })}
                            className="w-16 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200"
                          />
                        )}
                        {request.measurement.sidePhotoUrl && (
                          <img
                            src={request.measurement.sidePhotoUrl}
                            alt="Side View"
                            onClick={() => setModalImage({ src: request.measurement.sidePhotoUrl, title: 'Side Measurement View' })}
                            className="w-16 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200"
                          />
                        )}
                        {request.measurement.backPhotoUrl && (
                          <img
                            src={request.measurement.backPhotoUrl}
                            alt="Back View"
                            onClick={() => setModalImage({ src: request.measurement.backPhotoUrl, title: 'Back Measurement View' })}
                            className="w-16 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : isCustomer ? (
                <form onSubmit={handleUploadPhotos} className="space-y-3">
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Provide Front, Side, and Back photos to calculate precise 3D body measurements.
                  </p>
                  <input
                    type="url"
                    placeholder="Front Photo URL (e.g., https://...)"
                    value={photos.frontPhotoUrl}
                    onChange={(e) => setPhotos({ ...photos, frontPhotoUrl: e.target.value })}
                    className="input-field text-xs"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Side Photo URL"
                    value={photos.sidePhotoUrl}
                    onChange={(e) => setPhotos({ ...photos, sidePhotoUrl: e.target.value })}
                    className="input-field text-xs"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Back Photo URL"
                    value={photos.backPhotoUrl}
                    onChange={(e) => setPhotos({ ...photos, backPhotoUrl: e.target.value })}
                    className="input-field text-xs"
                    required
                  />
                  <button type="submit" disabled={submitting} className="btn-primary w-full text-xs flex items-center justify-center space-x-2">
                    <Camera className="h-4 w-4" />
                    <span>{submitting ? 'Analyzing Photos...' : 'Submit Body Photos for AI Scan'}</span>
                  </button>
                </form>
              ) : (
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Awaiting customer photo upload for AI measurement extraction.</p>
              )}
            </div>
          )}

          {/* Tailor: Update Order Status */}
          {isTailor && (request.status === 'Agreed' || request.status === 'In_Progress') && (
            <div className="card">
              <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Update Order Status</h2>
              <form onSubmit={handleUpdateOrder} className="space-y-3">
                <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="input-field" required>
                  <option value="">Select status...</option>
                  <option value="cutting">Cutting</option>
                  <option value="sewing">Sewing</option>
                  <option value="ready_for_fitting">Ready for Fitting</option>
                  <option value="completed">Completed</option>
                </select>
                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="input-field" placeholder="Notes (optional)" rows={2} />
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Updating...' : 'Update Status'}
                </button>
              </form>
            </div>
          )}

          {/* Customer: Leave Review */}
          {isCustomer && request.status === 'Completed' && !request.review && (
            <div className="card">
              <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Leave a Review</h2>
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setReviewRating(star)}>
                      <Star className={`h-6 w-6 ${star <= reviewRating ? 'text-yellow-400 fill-current' : (isDark ? 'text-gray-600' : 'text-gray-300')}`} />
                    </button>
                  ))}
                </div>
                <textarea value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} className="input-field" placeholder="Share your experience..." rows={3} />
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}

          {/* Tailor: Reply to Review */}
          {isTailor && request.review && !request.review.tailorReply && (
            <div className="card">
              <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Reply to Review</h2>
              <form onSubmit={handleSubmitReply} className="space-y-3">
                <textarea value={reviewReply} onChange={(e) => setReviewReply(e.target.value)} className="input-field" placeholder="Write your reply..." rows={3} />
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Submitting...' : 'Submit Reply'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Negotiation Section */}
      {(request.status === 'Pending' || request.status === 'Under_Discussion') && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <DollarSign className="h-5 w-5 inline mr-1" /> Negotiation
            </h2>
            <button
              onClick={() => setShowNegotiationForm(!showNegotiationForm)}
              className="btn-primary text-sm"
            >
              {showNegotiationForm ? 'Cancel' : 'Propose Counter-Offer'}
            </button>
          </div>

          {/* Pending Negotiations Alert */}
          {pendingNegotiations.length > 0 && (
            <div className={`mb-4 p-3 ${isDark ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'} rounded-lg`}>
              <p className={`text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                {pendingNegotiations.length} pending counter-offer(s) awaiting your response
              </p>
            </div>
          )}

          {/* Negotiation Form */}
          {showNegotiationForm && (
            <form onSubmit={handleProposeNegotiation} className={`mb-6 p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg space-y-3`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    <DollarSign className="h-4 w-4 inline" /> Proposed Price ($)
                  </label>
                  <input
                    type="number"
                    value={negotiationForm.proposedPrice}
                    onChange={(e) => setNegotiationForm({ ...negotiationForm, proposedPrice: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 450"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    <Calendar className="h-4 w-4 inline" /> Proposed Deadline
                  </label>
                  <input
                    type="date"
                    value={negotiationForm.proposedDeadline}
                    onChange={(e) => setNegotiationForm({ ...negotiationForm, proposedDeadline: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  <FileText className="h-4 w-4 inline" /> Garment Specs (JSON or text)
                </label>
                <textarea
                  value={negotiationForm.garmentSpecs}
                  onChange={(e) => setNegotiationForm({ ...negotiationForm, garmentSpecs: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder='e.g. {"material": "Wool", "color": "Navy", "lining": "Silk"} or just type specs'
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Notes</label>
                <textarea
                  value={negotiationForm.notes}
                  onChange={(e) => setNegotiationForm({ ...negotiationForm, notes: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Explain your counter-offer..."
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Submitting...' : 'Submit Counter-Offer'}
              </button>
            </form>
          )}

          {/* Pending Negotiations List */}
          {pendingNegotiations.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Pending Counter-Offers</h3>
              {pendingNegotiations.map((neg: any) => {
                const isMyProposal = neg.proposedById === user?.id;
                return (
                  <div key={neg.id} className={`p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border ${isDark ? 'border-yellow-800' : 'border-yellow-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Proposed by {neg.proposedBy.name} ({neg.proposedBy.role})
                        </p>
                        <div className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} space-y-1`}>
                          {neg.proposedPrice && <p><span className="font-medium">Price:</span> ${Number(neg.proposedPrice).toLocaleString()}</p>}
                          {neg.proposedDeadline && <p><span className="font-medium">Deadline:</span> {new Date(neg.proposedDeadline).toLocaleDateString()}</p>}
                          {neg.garmentSpecs && Object.keys(neg.garmentSpecs).length > 0 && (
                            <p><span className="font-medium">Specs:</span> {JSON.stringify(neg.garmentSpecs)}</p>
                          )}
                          {neg.notes && <p><span className="font-medium">Notes:</span> {neg.notes}</p>}
                        </div>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                          {new Date(neg.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!isMyProposal && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleAcceptNegotiation(neg.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineNegotiation(neg.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {isMyProposal && (
                        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-yellow-800 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}>
                          Awaiting response
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Negotiation History */}
          {negotiationHistory.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>History</h3>
              <div className="space-y-2">
                {negotiationHistory.map((neg: any) => (
                  <div key={neg.id} className={`p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg text-sm`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {neg.proposedBy.name} ({neg.proposedBy.role})
                        </p>
                        <div className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'} space-y-1`}>
                          {neg.proposedPrice && <p><span className="font-medium">Price:</span> ${Number(neg.proposedPrice).toLocaleString()}</p>}
                          {neg.proposedDeadline && <p><span className="font-medium">Deadline:</span> {new Date(neg.proposedDeadline).toLocaleDateString()}</p>}
                          {neg.notes && <p>{neg.notes}</p>}
                        </div>
                      </div>
                      <span className={`ml-4 px-2 py-1 rounded text-xs font-medium capitalize ${
                        neg.status === 'accepted'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {neg.status}
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                      {new Date(neg.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {negotiations.length === 0 && !showNegotiationForm && (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No counter-offers yet. Propose a price, deadline, or garment specs to negotiate.
            </p>
          )}
        </div>
      )}

      {/* Order Events Timeline */}
      {request.orderEvents?.length > 0 && (
        <div className="card mt-6">
          <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Order Timeline</h2>
          <div className="space-y-4">
            {request.orderEvents.map((event: any) => (
              <div key={event.id} className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-primary-600 rounded-full mt-1.5" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{event.status.replace(/_/g, ' ')}</span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  {event.notes && <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{event.notes}</p>}
                  {event.photos?.length > 0 && (
                    <div className="flex space-x-2 mt-2">
                      {event.photos.map((p: string, i: number) => (
                        <img key={i} src={p} alt="" className="w-20 h-20 object-cover rounded" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}