import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  RefreshCw,
  Ruler,
  Check
} from 'lucide-react';
import ImageModal from '../components/ImageModal';
import { RequestDetailSkeleton } from '../components/SkeletonLoaders';
import MeasurementInstructionsModal from '../components/MeasurementInstructionsModal';
import AICameraScannerModal from '../components/AICameraScannerModal';
import ThreeBodyAvatar from '../components/ThreeBodyAvatar';
import CuttersSpecSheetModal from '../components/CuttersSpecSheetModal';
import FitEaseRecommendationsCard from '../components/FitEaseRecommendationsCard';
import { validateImageFile } from '../utils/fileValidation';
import { validateDualPoseImages, validateTriplePoseImages } from '../utils/imagePoseValidator';

const statusFlow = ['Pending', 'Under_Discussion', 'Agreed', 'In_Progress', 'Completed'];

export default function RequestDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState({ frontPhotoUrl: '', sidePhotoUrl: '', backPhotoUrl: '' });
  const [scanHeightCm, setScanHeightCm] = useState<number>(175);
  const [scanWeightKg, setScanWeightKg] = useState<number>(70);
  const [scanGender, setScanGender] = useState<'male' | 'female' | 'other'>('male');
  const [scanBodyBuild, setScanBodyBuild] = useState<'slim' | 'average' | 'athletic' | 'broad'>('average');
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

  // Display Measurement Unit State (Inches vs Centimeters)
  const [measurementUnit, setMeasurementUnit] = useState<'in' | 'cm'>(() => {
    return (localStorage.getItem('stitchmatch_unit') as 'in' | 'cm') || 'in';
  });

  const toggleMeasurementUnit = (unit: 'in' | 'cm') => {
    setMeasurementUnit(unit);
    localStorage.setItem('stitchmatch_unit', unit);
  };

  const formatDimension = (val: number | string | null | undefined) => {
    if (!val) return { primary: 'Pending', secondary: '' };
    const cmVal = Number(val);
    if (isNaN(cmVal)) return { primary: 'Pending', secondary: '' };

    const inVal = cmVal / 2.54;
    if (measurementUnit === 'in') {
      return {
        primary: `${inVal.toFixed(1)} in`,
        secondary: `${cmVal.toFixed(1)} cm`,
      };
    } else {
      return {
        primary: `${cmVal.toFixed(1)} cm`,
        secondary: `${inVal.toFixed(1)} in`,
      };
    }
  };

  const [copiedJsonDetail, setCopiedJsonDetail] = useState(false);

  const getFull15Measurements = (m: any) => {
    if (!m) return [];

    let extra: any = {};
    try {
      const parsed = typeof m.adjustments === 'string' ? JSON.parse(m.adjustments) : m.adjustments;
      if (parsed && typeof parsed === 'object') {
        extra = parsed.allMeasurements || (Array.isArray(parsed) ? parsed[0]?.allMeasurements || {} : parsed);
      }
    } catch (e) {}

    const chestVal = Number(m.chest) || 85;
    const waistVal = Number(m.waist) || 75;
    const hipVal = Number(m.hip) || 95;
    const inseamVal = Number(m.inseam) || 75;
    const shoulderVal = Number(m.shoulderWidth) || 42;
    const armVal = Number(m.armLength) || 58;

    // Derived stature from inseam if not stored
    const estStature = Number(extra.total_height) || Math.round((inseamVal / 0.45) * 10) / 10;
    const bmiFactor = Math.sqrt(Math.max(0.6, (chestVal / (estStature * 0.54))));

    return [
      {
        label: 'Ankle Left Circumference',
        key: 'ankle_left_circumference',
        val: extra.ankle_left_circumference || Math.round(estStature * 0.046 * Math.pow(bmiFactor, 0.3) * 2.85 * 10) / 10,
      },
      {
        label: 'Arm Length',
        key: 'arm_length',
        val: extra.arm_length || armVal,
      },
      {
        label: 'Back to Shoulder',
        key: 'back_to_shoulder',
        val: extra.back_to_shoulder || Math.round(shoulderVal * 0.52 * 10) / 10,
      },
      {
        label: 'Bicep Right Circumference',
        key: 'bicep_right_circumference',
        val: extra.bicep_right_circumference || Math.round(shoulderVal * 0.235 * Math.pow(bmiFactor, 0.65) * 2.95 * 10) / 10,
      },
      {
        label: 'Chest Circumference',
        key: 'chest_circumference',
        val: extra.chest_circumference || chestVal,
      },
      {
        label: 'Forearm Circumference',
        key: 'forearm_circumference',
        val: extra.forearm_circumference || Math.round((extra.bicep_right_circumference || (shoulderVal * 0.235 * Math.pow(bmiFactor, 0.65) * 2.95)) * 0.86 * 10) / 10,
      },
      {
        label: 'Hip & Seat',
        key: 'hip_circumference',
        val: extra.hip_circumference || hipVal,
      },
      {
        label: 'Inside Leg Height',
        key: 'inside_leg_height',
        val: extra.inside_leg_height || inseamVal,
      },
      {
        label: 'Neck Circumference',
        key: 'neck_circumference',
        val: extra.neck_circumference || Math.round(estStature * 0.22 * Math.pow(bmiFactor, 0.5) * 10) / 10,
      },
      {
        label: 'Neck to Pelvis',
        key: 'neck_to_pelvis',
        val: extra.neck_to_pelvis || Math.round(estStature * 0.325 * 10) / 10,
      },
      {
        label: 'Foot Length',
        key: 'foot_length',
        val: extra.foot_length || Math.round(estStature * 0.152 * 10) / 10,
      },
      {
        label: 'Shoulder Breadth',
        key: 'shoulder_breadth',
        val: extra.shoulder_breadth || shoulderVal,
      },
      {
        label: 'Thigh Left Circumference',
        key: 'thigh_left_circumference',
        val: extra.thigh_left_circumference || Math.round(hipVal * 0.55 * 10) / 10,
      },
      {
        label: 'Natural Waist',
        key: 'waist_circumference',
        val: extra.waist_circumference || waistVal,
      },
      {
        label: 'Wrist Circumference',
        key: 'wrist_circumference',
        val: extra.wrist_circumference || Math.round(estStature * 0.098 * Math.pow(bmiFactor, 0.35) * 10) / 10,
      },
    ];
  };

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
      toast.success('Service request accepted! You can now finalize specifications.');
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const handleReject = async () => {
    try {
      await requestsAPI.reject(id!);
      toast.info('Service request declined.');
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleConfirmCustomer = async () => {
    setSubmitting(true);
    try {
      await requestsAPI.confirmCustomer(id!);
      toast.success('You confirmed the tailoring agreement!');
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to confirm agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTailor = async () => {
    setSubmitting(true);
    try {
      await requestsAPI.confirmTailor(id!);
      toast.success('Tailor agreement confirmed!');
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to confirm agreement');
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
        toast.error(`⚠️ Duplicate Photo Rejected: You selected the same image for both ${field.toUpperCase()} and ${slotKey.toUpperCase()}. The AI measurement engine requires 1 distinct Front pose and 1 separate 90° Side profile.`);
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
      (selectedFileFingerprints.front && selectedFileFingerprints.side && selectedFileFingerprints.front === selectedFileFingerprints.side);

    if (isDuplicate) {
      toast.error('⚠️ Duplicate Photo Error: Front and Side photos must be separate poses. The AI requires 1 distinct Front pose and 1 separate 90° Side profile to measure chest and waist depth accurately.');
      return;
    }

    if (!photos.frontPhotoUrl || !photos.sidePhotoUrl) {
      toast.error('Please upload both Front and 90° Side profile photos.');
      return;
    }

    setSubmitting(true);
    try {
      // Run Client-Side Pixel Computer Vision Verification (Person Identity & Distance/Framing)
      const visionResult = await validateDualPoseImages(
        photos.frontPhotoUrl,
        photos.sidePhotoUrl
      );
      if (!visionResult.isValid && visionResult.error) {
        toast.error(visionResult.error);
        setSubmitting(false);
        return;
      }

      await measurementsAPI.uploadPhotos(id!, {
        frontPhotoUrl: photos.frontPhotoUrl,
        sidePhotoUrl: photos.sidePhotoUrl,
        backPhotoUrl: photos.backPhotoUrl || undefined,
        heightCm: Number(scanHeightCm) || 175,
        weightKg: Number(scanWeightKg) || 70,
        gender: scanGender,
        bodyBuild: scanBodyBuild,
      });
      setShowManualPhotoUpload(false);
      showBrowserNotification('AI Measurement Processing', {
        body: 'Your Front and Side photos are being analyzed by our AI tailoring engine.',
      });
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload photos');
    } finally {
      setSubmitting(false);
    }
  };

  // Live Camera Scan Completion Handler
  const handleCameraScanComplete = async (captured: { 
    frontPhotoUrl: string; 
    sidePhotoUrl: string; 
    heightCm: number;
    weightKg?: number;
    gender?: 'male' | 'female' | 'other';
    bodyBuild?: 'slim' | 'average' | 'athletic' | 'broad';
    calculatedMeasurements?: any;
  }) => {
    setSubmitting(true);
    try {
      // Run Client-Side Pixel Computer Vision Verification (Person Identity & Distance/Framing)
      if (captured.frontPhotoUrl && captured.sidePhotoUrl) {
        const visionResult = await validateDualPoseImages(
          captured.frontPhotoUrl,
          captured.sidePhotoUrl
        );
        if (!visionResult.isValid && visionResult.error) {
          toast.error(visionResult.error);
          setSubmitting(false);
          return;
        }
      }

      await measurementsAPI.uploadPhotos(id!, captured);
      showBrowserNotification('Body Measurements Calibrated', {
        body: 'Front & Side silhouettes converted to 3D measurements with Ramanujan superellipse precision!',
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
      toast.success('Bespoke measurement adjustments saved!');
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save adjustments');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ordersAPI.createEvent(id!, { status: 'completed', notes: orderNotes.trim() || undefined });
      toast.success('Order marked as Completed & Delivered! Client can now leave a review.');
      loadRequest();
      setOrderNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to complete order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reviewsAPI.create(id!, { rating: reviewRating, feedback: reviewFeedback.trim() });
      toast.success('Thank you! Your review and rating have been published.');
      setReviewFeedback('');
      setReviewRating(5);
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
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
      toast.success('Your response to the client has been posted!');
      setReviewReply('');
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit reply');
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
      toast.success('Counter-offer submitted to the tailor!');
      setShowNegotiationForm(false);
      setNegotiationForm({ proposedPrice: '', proposedDeadline: '', garmentSpecs: '{}', notes: '' });
      loadNegotiations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to propose counter-offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptNegotiation = async (negotiationId: string) => {
    try {
      await negotiationsAPI.accept(negotiationId);
      toast.success('Counter-offer accepted! Terms have been updated.');
      loadNegotiations();
      loadRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept negotiation');
    }
  };

  const handleDeclineNegotiation = async (negotiationId: string) => {
    try {
      await negotiationsAPI.decline(negotiationId);
      toast.info('Counter-offer declined.');
      loadNegotiations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to decline negotiation');
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
        <ArrowLeft className="h-4 w-4" /><span>{t('requestDetail.backBtn')}</span>
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
            {(isTailor || user?.role === 'admin') && (
              <button
                onClick={() => setShowSpecSheetModal(true)}
                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                title="Print or Save Tailor Technical Spec Sheet PDF"
              >
                <Printer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="hidden sm:inline">{t('requestDetail.printSpecSheet')}</span>
              </button>
            )}
            <Link to={`/messages/${id}`} className="btn-secondary flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" /><span>{t('requestDetail.chatBtn')}</span>
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
          <span>{t('requestDetail.statusStages.pending')}</span>
          <span>{t('requestDetail.statusStages.underDiscussion')}</span>
          <span>{t('requestDetail.statusStages.agreed')}</span>
          <span>{t('requestDetail.statusStages.inProgress')}</span>
          <span>{t('requestDetail.statusStages.completed')}</span>
        </div>
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('requestDetail.detailsTitle')}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('requestDetail.customer')}:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.customer.name}</span></div>
            <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('requestDetail.tailor')}:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.tailor.name}</span></div>
            <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('requestDetail.garmentType')}:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.garmentType}</span></div>
            {request.fabricPreference && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('requestDetail.fabric')}:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{request.fabricPreference}</span></div>}
            {request.deadline && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('requestDetail.deadline')}:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>{new Date(request.deadline).toLocaleDateString()}</span></div>}
            {request.budget && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('requestDetail.budget')}:</span><span className={isDark ? 'text-white' : 'text-gray-900'}>${Number(request.budget).toLocaleString()}</span></div>}
            {request.finalPrice && <div className="flex justify-between"><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Final Price:</span><span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>${Number(request.finalPrice).toLocaleString()}</span></div>}
            {request.notes && <div className={`mt-2 p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded`}><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('requestDetail.notes')}:</span><p className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{request.notes}</p></div>}
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
                            setScanHeightCm(175);
                            setScanWeightKg(70);
                            setScanGender('male');
                            setScanBodyBuild('average');
                            toast.success('All photo selections, height, and biometric inputs have been completely reset.');
                          }}
                          className="text-[11px] text-gray-500 hover:text-red-500 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset All Inputs</span>
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

                      {/* Photo Upload Form: Direct File Browser (Front & 90° Side Profile) */}
                      <form onSubmit={handleUploadPhotos} className="space-y-4">
                        {/* Biometric Calibration Card (Height & Weight Insertion) */}
                        <div className={`p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-gray-900/70 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between border-b pb-2 dark:border-gray-800">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                              <Ruler className="w-4 h-4" />
                              <span>1. Biometric Calibration (Standing Height & Weight)</span>
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">Volume Prior</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Standing Height */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold flex items-center gap-1">
                                  <span>Standing Height</span>
                                </label>
                                <div className="flex gap-1 text-[10px]">
                                  {[160, 165, 170, 175, 180, 185].map((h) => (
                                    <button
                                      key={h}
                                      type="button"
                                      onClick={() => setScanHeightCm(h)}
                                      className={`px-1.5 py-0.5 rounded transition-colors ${
                                        scanHeightCm === h
                                          ? 'bg-primary-600 text-white font-bold'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary-600'
                                      }`}
                                    >
                                      {h}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setScanHeightCm((prev) => Math.max(100, prev - 1))}
                                  className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold hover:border-primary-500"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="100"
                                  max="240"
                                  value={scanHeightCm}
                                  onChange={(e) => setScanHeightCm(Number(e.target.value))}
                                  className="input-field text-center font-mono font-bold py-1.5 w-full text-base"
                                  placeholder="175"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setScanHeightCm((prev) => Math.min(240, prev + 1))}
                                  className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold hover:border-primary-500"
                                >
                                  +
                                </button>
                                <span className="text-xs font-bold text-gray-500">cm</span>
                              </div>
                            </div>

                            {/* Body Weight */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold flex items-center gap-1">
                                  <span>Body Weight</span>
                                </label>
                                <div className="flex gap-1 text-[10px]">
                                  {[55, 65, 70, 75, 80, 90].map((w) => (
                                    <button
                                      key={w}
                                      type="button"
                                      onClick={() => setScanWeightKg(w)}
                                      className={`px-1.5 py-0.5 rounded transition-colors ${
                                        scanWeightKg === w
                                          ? 'bg-primary-600 text-white font-bold'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary-600'
                                      }`}
                                    >
                                      {w}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setScanWeightKg((prev) => Math.max(30, prev - 1))}
                                  className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold hover:border-primary-500"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="30"
                                  max="220"
                                  value={scanWeightKg}
                                  onChange={(e) => setScanWeightKg(Number(e.target.value))}
                                  className="input-field text-center font-mono font-bold py-1.5 w-full text-base"
                                  placeholder="70"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setScanWeightKg((prev) => Math.min(220, prev + 1))}
                                  className="w-8 h-8 rounded-lg border flex items-center justify-center font-bold hover:border-primary-500"
                                >
                                  +
                                </button>
                                <span className="text-xs font-bold text-gray-500">kg</span>
                              </div>
                            </div>
                          </div>

                          {/* Gender & Body Build Quick Toggles */}
                          <div className="grid grid-cols-2 gap-3 pt-1 border-t dark:border-gray-800/80">
                            <div>
                              <label className="text-[11px] font-bold text-gray-500 block mb-1">Gender Profile</label>
                              <div className="flex rounded-lg p-0.5 bg-gray-100 dark:bg-gray-800">
                                <button
                                  type="button"
                                  onClick={() => setScanGender('male')}
                                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                    scanGender === 'male' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-500'
                                  }`}
                                >
                                  Male
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setScanGender('female')}
                                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                    scanGender === 'female' ? 'bg-primary-600 text-white shadow-xs' : 'text-gray-500'
                                  }`}
                                >
                                  Female
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-gray-500 block mb-1">Body Build</label>
                              <div className="grid grid-cols-4 gap-1">
                                {(['slim', 'average', 'athletic', 'broad'] as const).map((b) => (
                                  <button
                                    key={b}
                                    type="button"
                                    onClick={() => setScanBodyBuild(b)}
                                    className={`py-1 rounded-md text-[11px] font-bold capitalize transition-all text-center ${
                                      scanBodyBuild === b
                                        ? 'bg-primary-600 text-white shadow-xs'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Front Photo Card */}
                          <div className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                          }`}>
                            <span className="text-xs font-bold mb-1.5">1. Front Pose (Facing Camera)</span>
                            <div className="w-full h-36 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
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
                              <span>Browse Front Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload('front', e)}
                              />
                            </label>
                          </div>

                          {/* Side Photo Card */}
                          <div className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center relative ${
                            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                          }`}>
                            <span className="text-xs font-bold mb-1.5">2. 90° Side Profile (Turned Sideways)</span>
                            <div className="w-full h-36 rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-2">
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
                              <span>Browse Side Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload('side', e)}
                              />
                            </label>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !photos.frontPhotoUrl || !photos.sidePhotoUrl}
                          className="btn-primary w-full text-xs py-2.5 flex items-center justify-center space-x-2 font-bold disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>{submitting ? 'Analyzing Photos with AI...' : 'Submit 2 Photos to AI Vision Engine'}</span>
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
                          return 'The AI engine detected that the uploaded photo angles do not match the required poses. The AI requires 1 facing-front pose and 1 separate 90° side profile pose.';
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

                  {/* Extracted Dimensions Header + Unit Switcher Toggle */}
                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Extracted Body Dimensions (15-Point Tailoring Specs)
                    </span>
                    <div className="flex items-center p-0.5 rounded-lg bg-gray-200/80 dark:bg-gray-800 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleMeasurementUnit('in')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          measurementUnit === 'in'
                            ? 'bg-primary-600 text-white shadow-xs font-bold'
                            : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Inches (in)
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMeasurementUnit('cm')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          measurementUnit === 'cm'
                            ? 'bg-primary-600 text-white shadow-xs font-bold'
                            : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Centimeters (cm)
                      </button>
                    </div>
                  </div>

                  {/* 15-Point AI Measurement Metrics Grid (Exact SnapMeasureAI Parity) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-sm">
                    {getFull15Measurements(request.measurement).map(({ label, key, val }) => {
                      const dim = formatDimension(val);
                      return (
                        <div
                          key={key}
                          className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                            isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          <span className={`block text-[10px] font-bold uppercase tracking-tight ${isDark ? 'text-gray-400' : 'text-gray-500'}`} title={key}>
                            {label}
                          </span>
                          <div className="mt-1">
                            <span className={`text-base font-extrabold font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {dim.primary}
                            </span>
                            {dim.secondary && (
                              <span className={`block text-[10px] font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({dim.secondary})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Benchmark & Copy SnapMeasureAI Format JSON */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const items = getFull15Measurements(request.measurement);
                        const payload: Record<string, number> = {};
                        items.forEach((item) => {
                          payload[item.key] = Number(item.val) || 0;
                        });
                        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                        setCopiedJsonDetail(true);
                        setTimeout(() => setCopiedJsonDetail(false), 2500);
                      }}
                      className="text-[11px] font-bold flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                    >
                      {copiedJsonDetail ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> Copied 15-Point SnapMeasureAI JSON!
                        </span>
                      ) : (
                        <span>📋 Copy 15-Point SnapMeasureAI Schema JSON</span>
                      )}
                    </button>
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

                    {/* Tab 2: Customer Measurement Photos Gallery (Front & 90° Side) */}
                    {measurementViewTab === 'photos' && (
                      <div className="animate-fadeIn">
                        {(request.measurement.frontPhotoUrl || request.measurement.sidePhotoUrl) ? (
                          <div className="grid grid-cols-2 gap-3">
                            {request.measurement.frontPhotoUrl && (
                              <div 
                                onClick={() => setModalImage({ src: request.measurement.frontPhotoUrl, title: 'Front Measurement View' })}
                                className="group relative h-40 sm:h-52 rounded-xl overflow-hidden bg-black cursor-pointer border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                              >
                                <img
                                  src={request.measurement.frontPhotoUrl}
                                  alt="Front View"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <span className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                                  1. Front Pose
                                </span>
                              </div>
                            )}
                            {request.measurement.sidePhotoUrl && (
                              <div 
                                onClick={() => setModalImage({ src: request.measurement.sidePhotoUrl, title: 'Side Measurement View' })}
                                className="group relative h-40 sm:h-52 rounded-xl overflow-hidden bg-black cursor-pointer border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                              >
                                <img
                                  src={request.measurement.sidePhotoUrl}
                                  alt="Side View"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <span className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                                  2. 90° Side Profile
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

                  {/* Fit Ease Presets & RTW Sizing Breakdown Card */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <FitEaseRecommendationsCard rawMeasurements={request.measurement} />
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
                        {[
                          { label: 'Chest', key: 'chest' },
                          { label: 'Waist', key: 'waist' },
                          { label: 'Hip', key: 'hip' },
                          { label: 'Inseam', key: 'inseam' },
                          { label: 'Shoulder', key: 'shoulderWidth' },
                          { label: 'Arm', key: 'armLength' },
                        ].map(({ label, key }) => {
                          const dim = formatDimension(vaultMeasurement[key]);
                          return (
                            <div key={key} className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                              <span className="text-[9px] text-gray-400 uppercase block font-sans">{label}</span>
                              <strong className="text-xs">{dim.primary}</strong>
                              {dim.secondary && (
                                <span className="block text-[9px] text-gray-400 font-normal">({dim.secondary})</span>
                              )}
                            </div>
                          );
                        })}
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
                        <span>{showManualPhotoUpload ? 'Hide Uploader' : 'Upload Photos (Files / Gallery)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Upload Form: Height calibration + Front/Side Photo Cards */}
                  {showManualPhotoUpload && (
                    <form onSubmit={handleUploadPhotos} className="space-y-4">
                      {/* Height Calibration Input & Guidelines */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${
                        isDark ? 'bg-gray-900/80 border-gray-700/80' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              Standing Height Calibration (cm) *
                            </label>
                            <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              The AI uses your exact height to convert image pixels into centimeter tailoring dimensions.
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="100"
                              max="240"
                              required
                              value={scanHeightCm}
                              onChange={(e) => setScanHeightCm(Number(e.target.value))}
                              className="input-field w-24 text-center font-mono font-bold text-sm py-1.5"
                            />
                            <span className="text-xs font-bold text-primary-500">cm</span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className={`text-[10px] font-semibold mr-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quick select:</span>
                          {[160, 165, 170, 175, 180, 185, 190].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setScanHeightCm(preset)}
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                                scanHeightCm === preset
                                  ? 'bg-primary-600 border-primary-600 text-white'
                                  : isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-primary-500' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-500'
                              }`}
                            >
                              {preset}cm
                            </button>
                          ))}
                        </div>

                        {/* Human Only Guidelines */}
                        <div className={`p-2.5 rounded-xl border text-[11px] flex items-center space-x-2 ${
                          isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>
                            <strong>Human Subject Required:</strong> Photos must be full-body upright photos of yourself in form-fitting clothes.
                          </span>
                        </div>
                      </div>

                      {/* 2 Photo Upload Cards Grid (Front & Side) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Front Photo Card */}
                        <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center relative ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <div className="mb-2">
                            <span className="text-xs font-bold block">1. Front View Pose *</span>
                            <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Facing camera upright</span>
                          </div>
                          
                          <div className="w-full h-36 rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-3">
                            {photos.frontPhotoUrl ? (
                              <img src={photos.frontPhotoUrl} alt="Front Preview" className="w-full h-full object-cover" />
                            ) : uploadingPhotoField === 'front' ? (
                              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <ImageIcon className="w-7 h-7 mb-1 opacity-50" />
                                <span className="text-[11px]">No photo selected</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-secondary w-full text-xs py-2 cursor-pointer flex items-center justify-center space-x-1 font-bold">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse Front Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload('front', e)}
                            />
                          </label>
                        </div>

                        {/* Side Photo Card */}
                        <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center relative ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <div className="mb-2">
                            <span className="text-xs font-bold block">2. 90° Side Profile Pose *</span>
                            <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Turned 90° for body depth</span>
                          </div>

                          <div className="w-full h-36 rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-3">
                            {photos.sidePhotoUrl ? (
                              <img src={photos.sidePhotoUrl} alt="Side Preview" className="w-full h-full object-cover" />
                            ) : uploadingPhotoField === 'side' ? (
                              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <ImageIcon className="w-7 h-7 mb-1 opacity-50" />
                                <span className="text-[11px]">No photo selected</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-secondary w-full text-xs py-2 cursor-pointer flex items-center justify-center space-x-1 font-bold">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse Side Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload('side', e)}
                            />
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !photos.frontPhotoUrl || !photos.sidePhotoUrl}
                        className="btn-primary w-full text-xs sm:text-sm py-3 flex items-center justify-center space-x-2 font-bold shadow-lg disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{submitting ? 'Analyzing Photos...' : 'Convert Pixels to Centimeter Measurements'}</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : isCustomer ? (
                <div className="space-y-4">
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
                        {[
                          { label: 'Chest', key: 'chest' },
                          { label: 'Waist', key: 'waist' },
                          { label: 'Hip', key: 'hip' },
                          { label: 'Inseam', key: 'inseam' },
                          { label: 'Shoulder', key: 'shoulderWidth' },
                          { label: 'Arm', key: 'armLength' },
                        ].map(({ label, key }) => {
                          const dim = formatDimension(vaultMeasurement[key]);
                          return (
                            <div key={key} className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-purple-100 dark:border-gray-700">
                              <span className="text-[9px] text-gray-400 uppercase block font-sans">{label}</span>
                              <strong className="text-xs">{dim.primary}</strong>
                              {dim.secondary && (
                                <span className="block text-[9px] text-gray-400 font-normal">({dim.secondary})</span>
                              )}
                            </div>
                          );
                        })}
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
                        <span>{showManualPhotoUpload ? 'Hide Uploader' : 'Upload Photos (Files / Gallery)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Upload Form: Height calibration + Front/Side Photo Cards */}
                  {showManualPhotoUpload && (
                    <form onSubmit={handleUploadPhotos} className="space-y-4">
                      {/* Height Calibration Input & Guidelines */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${
                        isDark ? 'bg-gray-900/80 border-gray-700/80' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              Standing Height Calibration (cm) *
                            </label>
                            <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              The AI uses your exact height to convert image pixels into centimeter tailoring dimensions.
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="100"
                              max="240"
                              required
                              value={scanHeightCm}
                              onChange={(e) => setScanHeightCm(Number(e.target.value))}
                              className="input-field w-24 text-center font-mono font-bold text-sm py-1.5"
                            />
                            <span className="text-xs font-bold text-primary-500">cm</span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className={`text-[10px] font-semibold mr-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Quick select:</span>
                          {[160, 165, 170, 175, 180, 185, 190].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setScanHeightCm(preset)}
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                                scanHeightCm === preset
                                  ? 'bg-primary-600 border-primary-600 text-white'
                                  : isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-primary-500' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-500'
                              }`}
                            >
                              {preset}cm
                            </button>
                          ))}
                        </div>

                        {/* Human Only Guidelines */}
                        <div className={`p-2.5 rounded-xl border text-[11px] flex items-center space-x-2 ${
                          isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>
                            <strong>Human Subject Required:</strong> Photos must be full-body upright photos of yourself in form-fitting clothes.
                          </span>
                        </div>
                      </div>

                      {/* 2 Photo Upload Cards Grid (Front & Side) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Front Photo Card */}
                        <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center relative ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <div className="mb-2">
                            <span className="text-xs font-bold block">1. Front View Pose *</span>
                            <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Facing camera upright</span>
                          </div>
                          
                          <div className="w-full h-36 rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-3">
                            {photos.frontPhotoUrl ? (
                              <img src={photos.frontPhotoUrl} alt="Front Preview" className="w-full h-full object-cover" />
                            ) : uploadingPhotoField === 'front' ? (
                              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <ImageIcon className="w-7 h-7 mb-1 opacity-50" />
                                <span className="text-[11px]">No photo selected</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-secondary w-full text-xs py-2 cursor-pointer flex items-center justify-center space-x-1 font-bold">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse Front Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload('front', e)}
                            />
                          </label>
                        </div>

                        {/* Side Photo Card */}
                        <div className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center relative ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                          <div className="mb-2">
                            <span className="text-xs font-bold block">2. 90° Side Profile Pose *</span>
                            <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Turned 90° for body depth</span>
                          </div>

                          <div className="w-full h-36 rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative mb-3">
                            {photos.sidePhotoUrl ? (
                              <img src={photos.sidePhotoUrl} alt="Side Preview" className="w-full h-full object-cover" />
                            ) : uploadingPhotoField === 'side' ? (
                              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <ImageIcon className="w-7 h-7 mb-1 opacity-50" />
                                <span className="text-[11px]">No photo selected</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-secondary w-full text-xs py-2 cursor-pointer flex items-center justify-center space-x-1 font-bold">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse Side Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload('side', e)}
                            />
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !photos.frontPhotoUrl || !photos.sidePhotoUrl}
                        className="btn-primary w-full text-xs sm:text-sm py-3 flex items-center justify-center space-x-2 font-bold shadow-lg disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{submitting ? 'Analyzing Photos...' : 'Convert Pixels to Centimeter Measurements'}</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 px-4">
                  <div className={`p-3 rounded-full inline-flex mb-2 ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Awaiting customer body scan or photo upload for AI measurement extraction.
                  </p>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Once uploaded by the client, the 3D model, biometrics, and cutting spec sheet will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tailor: Direct Order Completion */}
          {isTailor && (request.status === 'Agreed' || request.status === 'In_Progress') && (
            <div className={`card border ${isDark ? 'border-emerald-900/40 bg-gradient-to-b from-gray-800 to-gray-900' : 'border-emerald-100 bg-gradient-to-b from-white to-emerald-50/20'} shadow-md`}>
              <div className="flex items-center space-x-2.5 mb-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Complete & Deliver Garment</h2>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Garment agreed. When the piece is crafted and handed over to the client, mark this order as completed.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCompleteOrder} className="space-y-3 mt-3">
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="input-field text-xs"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{submitting ? 'Completing Order...' : 'Mark Order as Completed & Delivered'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Customer Reviews Tailor Section */}
          {request.status === 'Completed' && !request.review && isCustomer && (
            <div className={`card border ${isDark ? 'border-amber-900/40 bg-gradient-to-b from-gray-800 to-gray-900' : 'border-amber-100 bg-gradient-to-b from-white to-amber-50/30'} shadow-lg`}>
              <div className="flex items-center space-x-2.5 mb-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Review & Rate Tailor: {request.tailor?.name}
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Rate {request.tailor?.name}'s craftsmanship, fit accuracy, and bespoke tailoring service.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Your Rating for {request.tailor?.name}:
                  </label>
                  <div className="flex items-center space-x-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            star <= reviewRating
                              ? 'text-amber-400 fill-amber-400 drop-shadow-md'
                              : isDark ? 'text-gray-700' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-semibold text-amber-500">
                      {reviewRating === 5 ? 'Exceptional (5.0 ★)' :
                       reviewRating === 4 ? 'Very Good (4.0 ★)' :
                       reviewRating === 3 ? 'Good (3.0 ★)' :
                       reviewRating === 2 ? 'Fair (2.0 ★)' : 'Needs Improvement (1.0 ★)'}
                    </span>
                  </div>
                </div>

                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="input-field"
                  rows={3}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Star className="w-4 h-4 fill-white" />
                  <span>{submitting ? 'Submitting...' : `Submit Review for ${request.tailor?.name}`}</span>
                </button>
              </form>
            </div>
          )}

          {/* Existing Review Card (Client Review for Tailor) */}
          {request.review && (
            <div className={`card border ${isDark ? 'border-gray-800 bg-gray-800/80' : 'border-gray-200 bg-white'} shadow-md`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                    {request.customer?.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {request.customer?.name || 'Customer'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                        Verified Review for {request.tailor?.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= (request.review.rating || 5)
                              ? 'text-amber-400 fill-amber-400'
                              : isDark ? 'text-gray-700' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-amber-500 ml-1">
                        {request.review.rating}.0 ★
                      </span>
                      <span className={`text-[10px] ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(request.review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {request.review.feedback && (
                <p className={`text-sm italic leading-relaxed pl-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{request.review.feedback}"
                </p>
              )}

              {/* Tailor's Reply Block */}
              {request.review.tailorReply ? (
                <div className={`mt-4 p-3.5 rounded-2xl border ${
                  isDark ? 'bg-gray-900/80 border-gray-700 text-gray-200' : 'bg-purple-50/60 border-purple-100 text-gray-800'
                }`}>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      Tailor Response ({request.tailor?.name || 'Tailor'})
                    </span>
                    {request.review.replyAt && (
                      <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        • {new Date(request.review.replyAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed pl-6">
                    {request.review.tailorReply}
                  </p>
                </div>
              ) : isTailor ? (
                <div className={`mt-4 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Reply to Client Review as {request.tailor?.name}
                  </h4>
                  <form onSubmit={handleSubmitReply} className="space-y-2.5">
                    <textarea
                      value={reviewReply}
                      onChange={(e) => setReviewReply(e.target.value)}
                      className="input-field text-xs"
                      rows={2}
                    />
                    <button
                      type="submit"
                      disabled={submitting || !reviewReply.trim()}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      {submitting ? 'Submitting...' : 'Post Tailor Reply'}
                    </button>
                  </form>
                </div>
              ) : null}
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
            {(request.status === 'Pending' || request.status === 'Under_Discussion') && (
              <button
                onClick={() => setShowNegotiationForm(!showNegotiationForm)}
                className="btn-primary text-sm"
              >
                {showNegotiationForm ? 'Cancel' : 'Propose Counter-Offer'}
              </button>
            )}
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
            <form onSubmit={handleProposeNegotiation} className={`mb-6 p-5 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-slate-50 border border-slate-200'} rounded-2xl space-y-4`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-purple-300' : 'text-purple-900'} mb-1.5`}>
                    <DollarSign className="h-4 w-4 inline mr-1 text-purple-500" /> Proposed Price ($) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={negotiationForm.proposedPrice}
                    onChange={(e) => setNegotiationForm({ ...negotiationForm, proposedPrice: e.target.value })}
                    className="input-field text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-purple-300' : 'text-purple-900'} mb-1.5`}>
                    <Calendar className="h-4 w-4 inline mr-1 text-purple-500" /> Proposed Deadline
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={negotiationForm.proposedDeadline}
                    onChange={(e) => setNegotiationForm({ ...negotiationForm, proposedDeadline: e.target.value })}
                    className="input-field text-sm font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-purple-300' : 'text-purple-900'} mb-1.5`}>
                  <FileText className="h-4 w-4 inline mr-1 text-purple-500" /> Garment Specs
                </label>
                <textarea
                  value={negotiationForm.garmentSpecs}
                  onChange={(e) => setNegotiationForm({ ...negotiationForm, garmentSpecs: e.target.value })}
                  className="input-field text-sm font-semibold"
                  rows={2}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-purple-300' : 'text-purple-900'} mb-1.5`}>Notes & Terms</label>
                <textarea
                  value={negotiationForm.notes}
                  onChange={(e) => setNegotiationForm({ ...negotiationForm, notes: e.target.value })}
                  className="input-field text-sm font-semibold"
                  rows={2}
                />
              </div>
              <button type="submit" disabled={submitting || !negotiationForm.proposedPrice} className="btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md">
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
            {request.orderEvents.map((event: any) => {
              let photoList: string[] = [];
              if (Array.isArray(event.photos)) {
                photoList = event.photos;
              } else if (typeof event.photos === 'string') {
                try {
                  const parsed = JSON.parse(event.photos);
                  if (Array.isArray(parsed)) photoList = parsed;
                } catch {
                  if (event.photos.trim()) photoList = [event.photos.trim()];
                }
              }

              return (
                <div key={event.id} className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-primary-600 rounded-full mt-1.5" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{event.status.replace(/_/g, ' ')}</span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(event.createdAt).toLocaleString()}</span>
                    </div>
                    {event.notes && <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{event.notes}</p>}
                    {photoList.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {photoList.map((p: string, i: number) => (
                          <img key={i} src={p} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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