import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { requestsAPI, measurementsAPI, ordersAPI, reviewsAPI, negotiationsAPI, uploadsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { showBrowserNotification } from '../lib/pushNotifications';
import { 
  ArrowLeft, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Star, 
  Camera, 
  Scissors, 
  DollarSign, 
  Calendar, 
  FileText, 
  Printer, 
  Sparkles, 
  Sliders, 
  UploadCloud, 
  Info,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Move3d,
  AlertCircle,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import ImageModal from '../components/ImageModal';
import { RequestDetailSkeleton } from '../components/SkeletonLoaders';
import MeasurementInstructionsModal from '../components/MeasurementInstructionsModal';
import AICameraScannerModal from '../components/AICameraScannerModal';
import ThreeBodyAvatar from '../components/ThreeBodyAvatar';
import CuttersSpecSheetModal from '../components/CuttersSpecSheetModal';
import { validateImageFile } from '../utils/fileValidation';
import { validateTriplePoseImages } from '../utils/imagePoseValidator';

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
  const [uploadingPhotoField, setUploadingPhotoField] = useState<'front' | 'side' | 'back' | null>(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [measurementViewTab, setMeasurementViewTab] = useState<'3d' | 'photos'>('3d');
  const [orderNotes, setOrderNotes] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewReply, setReviewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

  // Measurement Guides & Camera Scanner State
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showManualPhotoUpload, setShowManualPhotoUpload] = useState(false);
  const [hasAgreedToInstructions, setHasAgreedToInstructions] = useState(false);

  // Tailor Adjustments State
  const [showAdjustmentsPanel, setShowAdjustmentsPanel] = useState(false);
  const [adjustmentsForm, setAdjustmentsForm] = useState({
    chest: '',
    waist: '',
    hip: '',
    inseam: '',
    shoulderWidth: '',
    armLength: '',
    note: '',
  });

  // Measurement Vault & Spec Sheet Modal State
  const [vaultMeasurement, setVaultMeasurement] = useState<any | null>(null);
  const [showSpecSheetModal, setShowSpecSheetModal] = useState(false);
  const [selectedFileFingerprints, setSelectedFileFingerprints] = useState<{
    front?: string;
    side?: string;
    back?: string;
  }>({});

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
    loadVaultMeasurement();
  }, [id]);

  // Real-time Auto-Polling when AI Measurement is in Processing or Pending state
  useEffect(() => {
    let intervalId: any = null;
    const aiStatus = request?.measurement?.aiStatus;
    if (aiStatus === 'processing' || aiStatus === 'pending') {
      intervalId = setInterval(() => {
        loadRequest();
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [request?.measurement?.aiStatus]);

  const loadVaultMeasurement = async () => {
    try {
      const res = await measurementsAPI.getVaultLatest();
      if (res.data?.measurement) {
        setVaultMeasurement(res.data.measurement);
      }
    } catch (err) {
      console.error('Failed to load vault measurements', err);
    }
  };

  const handleApplyVaultMeasurements = async () => {
    setSubmitting(true);
    try {
      await measurementsAPI.applyVault(id!);
      toast.success('3D body measurements applied from your personal vault!');
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to apply saved measurements');
    } finally {
      setSubmitting(false);
    }
  };

  const loadRequest = async () => {
    try {
      const res = await requestsAPI.getById(id!);
      setRequest(res.data.request);
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
      await requestsAPI.accept(id!);
      loadRequest();
    } catch (err: any) {
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

  // Handle direct file upload from user device (phone gallery / computer) with strict duplicate prevention
  const handleFileUpload = async (field: 'front' | 'side' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side pre-validation
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid photo file');
      e.target.value = '';
      return;
    }

    // Strict duplicate detection across poses
    const fingerprint = `${file.name}-${file.size}-${file.lastModified}`;
    const otherSlots = Object.entries(selectedFileFingerprints).filter(([slot]) => slot !== field);
    for (const [slotKey, existingFp] of otherSlots) {
      if (existingFp === fingerprint) {
        toast.error(`⚠️ Duplicate Photo Rejected: You selected the same image for both ${field.toUpperCase()} and ${slotKey.toUpperCase()}. The AI measurement engine requires 1 distinct Front pose, 1 separate 90° Side profile, and 1 Back pose.`);
        e.target.value = '';
        return;
      }
    }

    setUploadingPhotoField(field);
    try {
      const res = await uploadsAPI.uploadImage(file);
      setSelectedFileFingerprints((prev) => ({ ...prev, [field]: fingerprint }));
      if (field === 'front') setPhotos((prev) => ({ ...prev, frontPhotoUrl: res.data.url }));
      if (field === 'side') setPhotos((prev) => ({ ...prev, sidePhotoUrl: res.data.url }));
      if (field === 'back') setPhotos((prev) => ({ ...prev, backPhotoUrl: res.data.url }));
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} angle photo selected!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload photo file');
    } finally {
      setUploadingPhotoField(null);
    }
  };

  // Upload Photos (Manual URL form / Selected Files)
  const handleUploadPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Duplicate pose check
    const isDuplicate = 
      (photos.frontPhotoUrl && photos.sidePhotoUrl && photos.frontPhotoUrl === photos.sidePhotoUrl) ||
      (photos.frontPhotoUrl && photos.backPhotoUrl && photos.frontPhotoUrl === photos.backPhotoUrl) ||
      (photos.sidePhotoUrl && photos.backPhotoUrl && photos.sidePhotoUrl === photos.backPhotoUrl) ||
      (selectedFileFingerprints.front && selectedFileFingerprints.side && selectedFileFingerprints.front === selectedFileFingerprints.side) ||
      (selectedFileFingerprints.front && selectedFileFingerprints.back && selectedFileFingerprints.front === selectedFileFingerprints.back) ||
      (selectedFileFingerprints.side && selectedFileFingerprints.back && selectedFileFingerprints.side === selectedFileFingerprints.back);

    if (isDuplicate) {
      toast.error('⚠️ Duplicate Photo Error: Front, Side, and Back photos must be separate poses. The AI requires 1 distinct Front pose and 1 separate 90° Side profile to measure chest and waist depth accurately.');
      return;
    }

    setSubmitting(true);
    try {
      // Run Client-Side Pixel Computer Vision Verification (Person Identity & Distance/Framing)
      if (photos.frontPhotoUrl && photos.sidePhotoUrl && photos.backPhotoUrl) {
        const visionResult = await validateTriplePoseImages(
          photos.frontPhotoUrl,
          photos.sidePhotoUrl,
          photos.backPhotoUrl
        );
        if (!visionResult.isValid && visionResult.error) {
          toast.error(visionResult.error);
          setSubmitting(false);
          return;
        }
      }

      await measurementsAPI.uploadPhotos(id!, photos);
      setShowManualPhotoUpload(false);
      showBrowserNotification('AI Measurement Processing', {
        body: 'Your body scan photos are being analyzed by our tailoring AI engine.',
      });
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload photos');
    } finally {
      setSubmitting(false);
    }
  };

  // Live Camera Scan Completion Handler
  const handleCameraScanComplete = async (captured: { frontPhotoUrl: string; sidePhotoUrl: string; backPhotoUrl: string }) => {
    setSubmitting(true);
    try {
      // Run Client-Side Pixel Computer Vision Verification (Person Identity & Distance/Framing)
      if (captured.frontPhotoUrl && captured.sidePhotoUrl && captured.backPhotoUrl) {
        const visionResult = await validateTriplePoseImages(
          captured.frontPhotoUrl,
          captured.sidePhotoUrl,
          captured.backPhotoUrl
        );
        if (!visionResult.isValid && visionResult.error) {
          toast.error(visionResult.error);
          setSubmitting(false);
          return;
        }
      }

      await measurementsAPI.uploadPhotos(id!, captured);
      showBrowserNotification('AI Measurement Extraction Started', {
        body: 'All 3 live camera angles received! Estimating tailoring dimensions.',
      });
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to process camera scan');
    } finally {
      setSubmitting(false);
    }
  };

  // Tailor Saves Measurement Adjustments
  const handleSaveTailorAdjustments = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const adjustmentItem: any = {
        note: adjustmentsForm.note || 'Tailor ease adjustment',
        timestamp: new Date().toISOString(),
      };
      if (adjustmentsForm.chest) adjustmentItem.chest = Number(adjustmentsForm.chest);
      if (adjustmentsForm.waist) adjustmentItem.waist = Number(adjustmentsForm.waist);
      if (adjustmentsForm.hip) adjustmentItem.hip = Number(adjustmentsForm.hip);
      if (adjustmentsForm.inseam) adjustmentItem.inseam = Number(adjustmentsForm.inseam);
      if (adjustmentsForm.shoulderWidth) adjustmentItem.shoulderWidth = Number(adjustmentsForm.shoulderWidth);
      if (adjustmentsForm.armLength) adjustmentItem.armLength = Number(adjustmentsForm.armLength);

      await measurementsAPI.addAdjustments(id!, {
        adjustments: [adjustmentItem],
      });

      setShowAdjustmentsPanel(false);
      setAdjustmentsForm({ chest: '', waist: '', hip: '', inseam: '', shoulderWidth: '', armLength: '', note: '' });
      loadRequest();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save adjustments');
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
        onClose={() => setModalImage(null)} 
        src={modalImage?.src || null} 
        title={modalImage?.title || ''} 
      />

      {/* Measurement Instructions Guide Modal */}
      <MeasurementInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        onComplete={() => {
          setShowInstructions(false);
          setHasAgreedToInstructions(true);
          setShowCameraScanner(true);
        }}
      />

      {/* Live AI Camera Scanner Modal with Gyroscope Sensor */}
      <AICameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onComplete={handleCameraScanComplete}
      />

      {/* Status Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{request.garmentType}</h1>
          <div className="flex items-center space-x-2 print:hidden">
            <button
              onClick={() => setShowSpecSheetModal(true)}
              className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium flex items-center space-x-2 transition-colors cursor-pointer"
              title="Print or Save Atelier Technical Spec Sheet PDF"
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
            <div key={status} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0 ${
                index <= currentStep ? 'bg-primary-600 text-white shadow-sm' : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
              }`}>
                {index < currentStep ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : index + 1}
              </div>
              {index < statusFlow.length - 1 && (
                <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded-full transition-all ${index < currentStep ? 'bg-primary-600' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`} />
              )}
            </div>
          ))}
        </div>
        <div className={`flex justify-between mt-2 text-[10px] sm:text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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

          {/* Agreement Status & Confirmation */}
          {request.status === 'Under_Discussion' && (
            <div className="card">
              <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Agreement Status</h2>
              
              {/* Dual Party Status Pills */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className={`p-2.5 rounded-xl border text-center ${
                  request.customerConfirmed
                    ? (isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                    : (isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500')
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider">Customer</p>
                  <p className="text-xs font-semibold mt-0.5 flex items-center justify-center">
                    {request.customerConfirmed ? (
                      <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Agreed</>
                    ) : 'Pending Approval'}
                  </p>
                </div>

                <div className={`p-2.5 rounded-xl border text-center ${
                  request.tailorConfirmed
                    ? (isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                    : (isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500')
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider">Tailor</p>
                  <p className="text-xs font-semibold mt-0.5 flex items-center justify-center">
                    {request.tailorConfirmed ? (
                      <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Agreed</>
                    ) : 'Pending Approval'}
                  </p>
                </div>
              </div>

              {/* Single Action Button for Party Awaiting Confirmation */}
              {isCustomer && !request.customerConfirmed && (
                <button onClick={handleConfirmCustomer} disabled={submitting} className="btn-primary w-full text-xs sm:text-sm font-bold py-2.5 shadow-md">
                  {submitting ? 'Confirming...' : 'Approve & Confirm Final Terms'}
                </button>
              )}
              {isTailor && !request.tailorConfirmed && (
                <button onClick={handleConfirmTailor} disabled={submitting} className="btn-primary w-full text-xs sm:text-sm font-bold py-2.5 shadow-md">
                  {submitting ? 'Confirming...' : 'Approve & Confirm Final Terms'}
                </button>
              )}

              {request.customerConfirmed && request.tailorConfirmed && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center pt-1">
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Both parties have approved the agreement
                </p>
              )}
            </div>
          )}

          {/* AI Body Measurement Section */}
          {(isCustomer || isTailor) && (request.status === 'Agreed' || request.status === 'In_Progress' || request.measurement) && (
            <div className="card">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className={`font-semibold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Camera className="h-5 w-5 mr-2 text-primary-600" />
                  AI Body Measurements & Specs
                </h2>
                <div className="flex items-center space-x-2">
                  {isCustomer && request.measurement && (
                    <button
                      onClick={() => setShowManualPhotoUpload(!showManualPhotoUpload)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-primary-500/40 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 flex items-center space-x-1.5 transition-all font-semibold cursor-pointer"
                      title="Retake camera scan or upload new photos"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{showManualPhotoUpload ? 'Close Retake Panel' : 'Retake / New Scan'}</span>
                    </button>
                  )}
                  {request.measurement && (
                    <button 
                      onClick={() => setShowInstructions(true)}
                      className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center"
                    >
                      <Info className="w-3.5 h-3.5 mr-1" />
                      <span>View Guide</span>
                    </button>
                  )}
                </div>
              </div>

              {request.measurement ? (
                <div className="space-y-4">
                  {/* AI Status & Confidence Banner */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                      request.measurement.aiStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                      request.measurement.aiStatus === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse' :
                      request.measurement.aiStatus === 'needs_retake' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                    }`}>
                      {request.measurement.aiStatus === 'processing' ? 'AI Analyzing Contours...' : 
                       request.measurement.aiStatus === 'needs_retake' ? '⚠️ Retake Needed' :
                       `AI Status: ${request.measurement.aiStatus}`}
                    </span>
                    {request.measurement.aiConfidence && request.measurement.aiStatus === 'completed' && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Confidence: {Math.round(Number(request.measurement.aiConfidence))}%
                      </span>
                    )}
                  </div>

                  {/* Retake / Re-upload Panel if toggled by customer */}
                  {showManualPhotoUpload && isCustomer && (
                    <div className={`p-4 rounded-2xl border space-y-4 animate-fadeIn ${
                      isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                          <RotateCcw className="w-4 h-4" />
                          <span>Retake Body Scan / Upload New Photos</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotos({ frontPhotoUrl: '', sidePhotoUrl: '', backPhotoUrl: '' });
                            setSelectedFileFingerprints({});
                            toast.success('Photo inputs cleared. You can select new files now.');
                          }}
                          className="text-[11px] text-gray-500 hover:text-red-500 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Clear Selection</span>
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCameraScanner(true)}
                          className="btn-primary flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Launch Live AI Camera</span>
                        </button>
                      </div>

                      {/* Photo Upload Form: Direct File Browser */}
                      <form onSubmit={handleUploadPhotos} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Front Photo Card */}
                          <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                          }`}>
                            <span className="text-xs font-bold mb-1.5">1. Front Pose</span>
                            <div className="w-full h-28 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
                              {photos.frontPhotoUrl ? (
                                <img src={photos.frontPhotoUrl} alt="Front Preview" className="w-full h-full object-cover" />
                              ) : uploadingPhotoField === 'front' ? (
                                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                  <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                  <span className="text-[10px]">No file selected</span>
                                </div>
                              )}
                            </div>
                            <label className="btn-secondary w-full text-[11px] py-1.5 cursor-pointer flex items-center justify-center space-x-1">
                              <Upload className="w-3 h-3" />
                              <span>Browse File</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload('front', e)}
                              />
                            </label>
                          </div>

                          {/* Side Photo Card */}
                          <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                          }`}>
                            <span className="text-xs font-bold mb-1.5">2. 90° Side Profile</span>
                            <div className="w-full h-28 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
                              {photos.sidePhotoUrl ? (
                                <img src={photos.sidePhotoUrl} alt="Side Preview" className="w-full h-full object-cover" />
                              ) : uploadingPhotoField === 'side' ? (
                                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                  <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                  <span className="text-[10px]">No file selected</span>
                                </div>
                              )}
                            </div>
                            <label className="btn-secondary w-full text-[11px] py-1.5 cursor-pointer flex items-center justify-center space-x-1">
                              <Upload className="w-3 h-3" />
                              <span>Browse File</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload('side', e)}
                              />
                            </label>
                          </div>

                          {/* Back Photo Card */}
                          <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                          }`}>
                            <span className="text-xs font-bold mb-1.5">3. Back Pose</span>
                            <div className="w-full h-28 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
                              {photos.backPhotoUrl ? (
                                <img src={photos.backPhotoUrl} alt="Back Preview" className="w-full h-full object-cover" />
                              ) : uploadingPhotoField === 'back' ? (
                                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                  <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                  <span className="text-[10px]">No file selected</span>
                                </div>
                              )}
                            </div>
                            <label className="btn-secondary w-full text-[11px] py-1.5 cursor-pointer flex items-center justify-center space-x-1">
                              <Upload className="w-3 h-3" />
                              <span>Browse File</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload('back', e)}
                              />
                            </label>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !photos.frontPhotoUrl || !photos.sidePhotoUrl || !photos.backPhotoUrl}
                          className="btn-primary w-full text-xs py-2.5 flex items-center justify-center space-x-2 font-bold disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>{submitting ? 'Analyzing Photos...' : 'Submit New Scan to AI Engine'}</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* AI Needs Retake / Rejection Notice */}
                  {(request.measurement.aiStatus === 'needs_retake' || request.measurement.aiStatus === 'failed') && (
                    <div className={`p-4 rounded-2xl border space-y-2.5 animate-fadeIn ${
                      isDark ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                      <div className="flex items-center space-x-2 font-bold text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span>AI Scan Alert: Pose Angle Mismatch Detected</span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-95 font-medium">
                        {(() => {
                          try {
                            const parsed = typeof request.measurement.adjustments === 'string'
                              ? JSON.parse(request.measurement.adjustments)
                              : request.measurement.adjustments;
                            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.orientationError) {
                              return parsed[0].orientationError;
                            }
                          } catch (e) {}
                          return 'The AI engine detected that the uploaded photo angles do not match the required poses (e.g. uploading a Back or Front pose in the Side Profile slot). The AI requires 1 facing-front pose, 1 separate 90° Side profile, and 1 Back pose.';
                        })()}
                      </p>
                      {isCustomer && (
                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => setShowCameraScanner(true)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Retake with Live Camera</span>
                          </button>
                          <button
                            onClick={() => setShowManualPhotoUpload(true)}
                            className="px-3.5 py-2 rounded-xl border border-amber-400/50 hover:bg-amber-900/20 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Re-upload Distinct Photos
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6 Core AI Measurement Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Chest</span>
                      <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {request.measurement.chest ? `${Number(request.measurement.chest).toFixed(1)} cm` : 'Pending'}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Waist</span>
                      <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {request.measurement.waist ? `${Number(request.measurement.waist).toFixed(1)} cm` : 'Pending'}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hip</span>
                      <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {request.measurement.hip ? `${Number(request.measurement.hip).toFixed(1)} cm` : 'Pending'}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Inseam</span>
                      <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {request.measurement.inseam ? `${Number(request.measurement.inseam).toFixed(1)} cm` : 'Pending'}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Shoulders</span>
                      <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {request.measurement.shoulderWidth ? `${Number(request.measurement.shoulderWidth).toFixed(1)} cm` : 'Pending'}
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`block text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Arm Length</span>
                      <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {request.measurement.armLength ? `${Number(request.measurement.armLength).toFixed(1)} cm` : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* View Tabs: 3D Body Avatar Visualizer VS Scanned Photos */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold">
                        <button
                          onClick={() => setMeasurementViewTab('3d')}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                            measurementViewTab === '3d'
                              ? 'bg-primary-600 text-white shadow-sm'
                              : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Move3d className="w-3.5 h-3.5" />
                          <span>3D Interactive Avatar</span>
                        </button>

                        <button
                          onClick={() => setMeasurementViewTab('photos')}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                            measurementViewTab === 'photos'
                              ? 'bg-primary-600 text-white shadow-sm'
                              : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Scanned Photos</span>
                        </button>
                      </div>

                      <span className={`text-[11px] font-medium hidden sm:inline ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {measurementViewTab === '3d' ? '360° Touch / Drag to rotate avatar' : 'Click photos to zoom'}
                      </span>
                    </div>

                    {/* Tab 1: 3D Body Avatar Visualizer */}
                    {measurementViewTab === '3d' && (
                      <div className="animate-fadeIn">
                        <ThreeBodyAvatar
                          measurements={{
                            chest: request.measurement.chest,
                            waist: request.measurement.waist,
                            hip: request.measurement.hip,
                            inseam: request.measurement.inseam,
                            shoulderWidth: request.measurement.shoulderWidth,
                            armLength: request.measurement.armLength,
                          }}
                          isDark={isDark}
                        />
                      </div>
                    )}

                    {/* Tab 2: Customer Measurement Photos Gallery */}
                    {measurementViewTab === 'photos' && (
                      <div className="animate-fadeIn">
                        {(request.measurement.frontPhotoUrl || request.measurement.sidePhotoUrl || request.measurement.backPhotoUrl) ? (
                          <div className="grid grid-cols-3 gap-2.5">
                            {request.measurement.frontPhotoUrl && (
                              <div 
                                onClick={() => setModalImage({ src: request.measurement.frontPhotoUrl, title: 'Front Measurement View' })}
                                className="group relative h-28 sm:h-36 rounded-xl overflow-hidden bg-black cursor-pointer border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                              >
                                <img
                                  src={request.measurement.frontPhotoUrl}
                                  alt="Front View"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                                  1. Front
                                </span>
                              </div>
                            )}
                            {request.measurement.sidePhotoUrl && (
                              <div 
                                onClick={() => setModalImage({ src: request.measurement.sidePhotoUrl, title: 'Side Measurement View' })}
                                className="group relative h-28 sm:h-36 rounded-xl overflow-hidden bg-black cursor-pointer border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                              >
                                <img
                                  src={request.measurement.sidePhotoUrl}
                                  alt="Side View"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                                  2. Side
                                </span>
                              </div>
                            )}
                            {request.measurement.backPhotoUrl && (
                              <div 
                                onClick={() => setModalImage({ src: request.measurement.backPhotoUrl, title: 'Back Measurement View' })}
                                className="group relative h-28 sm:h-36 rounded-xl overflow-hidden bg-black cursor-pointer border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                              >
                                <img
                                  src={request.measurement.backPhotoUrl}
                                  alt="Back View"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                                  3. Back
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className={`text-xs text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No photos attached to this measurement record.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tailor Manual Fit Adjustments Workspace */}
                  {isTailor && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Tailor Manual Ease Adjustments
                        </span>
                        <button
                          onClick={() => setShowAdjustmentsPanel(!showAdjustmentsPanel)}
                          className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold flex items-center space-x-1"
                        >
                          <Sliders className="w-3.5 h-3.5 mr-1" />
                          <span>{showAdjustmentsPanel ? 'Hide Adjustments' : '+ Adjust Specs'}</span>
                        </button>
                      </div>

                      {showAdjustmentsPanel && (
                        <form onSubmit={handleSaveTailorAdjustments} className={`mt-3 p-3.5 rounded-xl border space-y-3 ${
                          isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Enter custom ease/allowances (+/- cm) or custom fit adjustments:
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Chest (+/- cm)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="+1.5"
                                value={adjustmentsForm.chest}
                                onChange={(e) => setAdjustmentsForm({ ...adjustmentsForm, chest: e.target.value })}
                                className="input-field text-xs py-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Waist (+/- cm)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="+2.0"
                                value={adjustmentsForm.waist}
                                onChange={(e) => setAdjustmentsForm({ ...adjustmentsForm, waist: e.target.value })}
                                className="input-field text-xs py-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Hip (+/- cm)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="+1.0"
                                value={adjustmentsForm.hip}
                                onChange={(e) => setAdjustmentsForm({ ...adjustmentsForm, hip: e.target.value })}
                                className="input-field text-xs py-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Inseam (+/- cm)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="-0.5"
                                value={adjustmentsForm.inseam}
                                onChange={(e) => setAdjustmentsForm({ ...adjustmentsForm, inseam: e.target.value })}
                                className="input-field text-xs py-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Shoulders (+/- cm)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="+1.0"
                                value={adjustmentsForm.shoulderWidth}
                                onChange={(e) => setAdjustmentsForm({ ...adjustmentsForm, shoulderWidth: e.target.value })}
                                className="input-field text-xs py-1.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-gray-500">Arm Length (+/- cm)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="+1.5"
                                value={adjustmentsForm.armLength}
                                onChange={(e) => setAdjustmentsForm({ ...adjustmentsForm, armLength: e.target.value })}
                                className="input-field text-xs py-1.5"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500">Tailoring Notes</label>
                            <input
                              type="text"
                              placeholder="e.g., Added extra ease for structured tuxedo drape"
                              value={adjustmentsForm.note}
                              onChange={(e) => setAdjustmentsForm({ ...adjustmentsForm, note: e.target.value })}
                              className="input-field text-xs py-1.5"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary w-full text-xs py-2 font-semibold flex items-center justify-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save Tailor Adjustments</span>
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ) : isCustomer ? (
                /* Customer has not submitted measurements yet */
                <div className="space-y-4 py-2">
                  
                  {/* 1-CLICK APPLY SAVED MEASUREMENTS VAULT CARD */}
                  {vaultMeasurement && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDark 
                        ? 'bg-gradient-to-r from-purple-950/40 via-gray-800 to-gray-800 border-purple-800/60' 
                        : 'bg-gradient-to-r from-purple-50 via-slate-50 to-white border-purple-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Saved 3D Measurements Found in Your Vault
                            </h4>
                            <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                              Apply your verified body profile with 1 click without rescanning.
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          1-Click Ready
                        </span>
                      </div>

                      {/* Quick Metric Pills */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                        <div className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                          <span className="text-[9px] text-gray-400 uppercase block font-sans">Chest</span>
                          <strong>{Number(vaultMeasurement.chest || 0).toFixed(1)}</strong> <span className="text-[9px]">cm</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                          <span className="text-[9px] text-gray-400 uppercase block font-sans">Waist</span>
                          <strong>{Number(vaultMeasurement.waist || 0).toFixed(1)}</strong> <span className="text-[9px]">cm</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                          <span className="text-[9px] text-gray-400 uppercase block font-sans">Hip</span>
                          <strong>{Number(vaultMeasurement.hip || 0).toFixed(1)}</strong> <span className="text-[9px]">cm</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                          <span className="text-[9px] text-gray-400 uppercase block font-sans">Inseam</span>
                          <strong>{Number(vaultMeasurement.inseam || 0).toFixed(1)}</strong> <span className="text-[9px]">cm</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                          <span className="text-[9px] text-gray-400 uppercase block font-sans">Shoulder</span>
                          <strong>{Number(vaultMeasurement.shoulderWidth || 0).toFixed(1)}</strong> <span className="text-[9px]">cm</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                          <span className="text-[9px] text-gray-400 uppercase block font-sans">Arm</span>
                          <strong>{Number(vaultMeasurement.armLength || 0).toFixed(1)}</strong> <span className="text-[9px]">cm</span>
                        </div>
                      </div>

                      <button
                        onClick={handleApplyVaultMeasurements}
                        disabled={submitting}
                        className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{submitting ? 'Applying Profile...' : 'Apply Saved 3D Measurements to This Order'}</span>
                      </button>
                    </div>
                  )}

                  <div className="text-center">
                    <div className={`p-3 rounded-full inline-flex mb-3 ${isDark ? 'bg-primary-950 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                      <Camera className="w-8 h-8" />
                    </div>
                    <h3 className={`text-base sm:text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {vaultMeasurement ? 'Or Scan / Upload New Body Measurements' : 'Ready for AI Body Measurement?'}
                    </h3>
                    <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Scan your body using your camera or upload 3 reference photos to extract millimeter-accurate dimensions for your tailor.
                    </p>
                  </div>

                  {/* Action Buttons: Live AI Camera Scan OR Upload */}
                  <div className="space-y-2.5">
                    <button
                      onClick={() => setShowCameraScanner(true)}
                      className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Launch Live AI Camera Scan</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                        Gyroscope 90° Level
                      </span>
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setShowInstructions(true)}
                        className="btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>View Photo Guide</span>
                      </button>

                      <button
                        onClick={() => setShowManualPhotoUpload(!showManualPhotoUpload)}
                        className="btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{showManualPhotoUpload ? 'Hide Uploader' : 'Upload Photos (Files / URLs)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Upload Form: Direct File Browser + URL Inputs */}
                  {showManualPhotoUpload && (
                    <form onSubmit={handleUploadPhotos} className={`p-4 rounded-xl border space-y-4 ${
                      isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div>
                        <p className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                          Select or Upload 3 Required Poses:
                        </p>
                        <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          You can browse photos directly from your phone/computer or paste image URLs.
                        </p>
                      </div>

                      {/* 3 Photo Upload Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Front Photo Card */}
                        <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <span className="text-xs font-bold mb-1.5">1. Front Pose</span>
                          <div className="w-full h-28 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
                            {photos.frontPhotoUrl ? (
                              <img src={photos.frontPhotoUrl} alt="Front Preview" className="w-full h-full object-cover" />
                            ) : uploadingPhotoField === 'front' ? (
                              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                <span className="text-[10px]">No file selected</span>
                              </div>
                            )}
                          </div>
                          <label className="btn-secondary w-full text-[11px] py-1.5 cursor-pointer flex items-center justify-center space-x-1">
                            <Upload className="w-3 h-3" />
                            <span>Browse File</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload('front', e)}
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="or paste URL"
                            value={photos.frontPhotoUrl}
                            onChange={(e) => setPhotos({ ...photos, frontPhotoUrl: e.target.value })}
                            className="input-field text-[10px] py-1 mt-1.5 w-full"
                          />
                        </div>

                        {/* Side Photo Card */}
                        <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <span className="text-xs font-bold mb-1.5">2. Side Pose</span>
                          <div className="w-full h-28 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
                            {photos.sidePhotoUrl ? (
                              <img src={photos.sidePhotoUrl} alt="Side Preview" className="w-full h-full object-cover" />
                            ) : uploadingPhotoField === 'side' ? (
                              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                <span className="text-[10px]">No file selected</span>
                              </div>
                            )}
                          </div>
                          <label className="btn-secondary w-full text-[11px] py-1.5 cursor-pointer flex items-center justify-center space-x-1">
                            <Upload className="w-3 h-3" />
                            <span>Browse File</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload('side', e)}
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="or paste URL"
                            value={photos.sidePhotoUrl}
                            onChange={(e) => setPhotos({ ...photos, sidePhotoUrl: e.target.value })}
                            className="input-field text-[10px] py-1 mt-1.5 w-full"
                          />
                        </div>

                        {/* Back Photo Card */}
                        <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <span className="text-xs font-bold mb-1.5">3. Back Pose</span>
                          <div className="w-full h-28 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
                            {photos.backPhotoUrl ? (
                              <img src={photos.backPhotoUrl} alt="Back Preview" className="w-full h-full object-cover" />
                            ) : uploadingPhotoField === 'back' ? (
                              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                <span className="text-[10px]">No file selected</span>
                              </div>
                            )}
                          </div>
                          <label className="btn-secondary w-full text-[11px] py-1.5 cursor-pointer flex items-center justify-center space-x-1">
                            <Upload className="w-3 h-3" />
                            <span>Browse File</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload('back', e)}
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="or paste URL"
                            value={photos.backPhotoUrl}
                            onChange={(e) => setPhotos({ ...photos, backPhotoUrl: e.target.value })}
                            className="input-field text-[10px] py-1 mt-1.5 w-full"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !photos.frontPhotoUrl || !photos.sidePhotoUrl || !photos.backPhotoUrl}
                        className="btn-primary w-full text-xs py-2.5 flex items-center justify-center space-x-2 font-bold disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{submitting ? 'Analyzing Photos...' : 'Submit 3 Poses to AI Measurement Engine'}</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Awaiting customer body scan or photo upload for AI measurement extraction.
                </p>
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
      {/* Cutters Technical Specification Sheet Modal */}
      <CuttersSpecSheetModal
        isOpen={showSpecSheetModal}
        onClose={() => setShowSpecSheetModal(false)}
        request={request}
      />
    </div>
  );
}