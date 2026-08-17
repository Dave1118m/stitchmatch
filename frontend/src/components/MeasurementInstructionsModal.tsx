import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../hooks/useDarkMode';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle,
  Sun, 
  Smartphone, 
  ShieldCheck, 
  Focus,
  Shirt,
  Sparkles,
  Maximize2
} from 'lucide-react';
import step1Img from '../assets/instructions/step1_wear.jpg';
import step2Img from '../assets/instructions/step2_lighting.jpg';
import step3Img from '../assets/instructions/step3_camera.jpg';
import step4Img from '../assets/instructions/step4_poses.jpg';

interface MeasurementInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MeasurementInstructionsModal({ isOpen, onClose, onComplete }: MeasurementInstructionsModalProps) {
  const { t } = useTranslation();
  const isDark = useDarkMode();
  const [step, setStep] = useState(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const totalSteps = 4;

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const stepMeta = [
    { title: t('measurements.photoGuide.step1Tab'), icon: Shirt },
    { title: t('measurements.photoGuide.step2Tab'), icon: Sun },
    { title: t('measurements.photoGuide.step3Tab'), icon: Smartphone },
    { title: t('measurements.photoGuide.step4Tab'), icon: Focus }
  ];

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Image Guide */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div 
                onClick={() => setPreviewImage(step1Img)}
                className={`group relative w-full overflow-hidden rounded-2xl border-2 transition-all cursor-pointer shadow-lg hover:shadow-xl ${
                  isDark ? 'border-primary-500/40 bg-gray-800' : 'border-primary-400/60 bg-gray-50'
                }`}
              >
                <img 
                  src={step1Img} 
                  alt="What to Wear Guide" 
                  className="w-full h-64 sm:h-72 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end justify-between p-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {t('measurements.photoGuide.step1Title')}
                  </span>
                  <span className="inline-flex items-center text-xs text-white/80 group-hover:text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Zoom
                  </span>
                </div>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('measurements.photoGuide.zoomHint')}
              </p>
            </div>

            {/* Checklist */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 mb-2">
                  <Shirt className="w-3.5 h-3.5" /> {t('measurements.photoGuide.step1Badge')}
                </div>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('measurements.photoGuide.step1Title')}</h3>
                <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('measurements.photoGuide.step1Desc')}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step1Check1')}
                  </span>
                </div>

                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step1Check2')}
                  </span>
                </div>

                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step1Check3')}
                  </span>
                </div>

                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-red-50/60 border-red-200/60 text-gray-800'}`}>
                  <XCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step1Avoid')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Image Guide */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div 
                onClick={() => setPreviewImage(step2Img)}
                className={`group relative w-full overflow-hidden rounded-2xl border-2 transition-all cursor-pointer shadow-lg hover:shadow-xl ${
                  isDark ? 'border-yellow-500/40 bg-gray-800' : 'border-yellow-400/60 bg-gray-50'
                }`}
              >
                <img 
                  src={step2Img} 
                  alt="Lighting and Environment Guide" 
                  className="w-full h-64 sm:h-72 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end justify-between p-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-white shadow">
                    <Sun className="w-3.5 h-3.5 mr-1" /> {t('measurements.photoGuide.step2Title')}
                  </span>
                  <span className="inline-flex items-center text-xs text-white/80 group-hover:text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Zoom
                  </span>
                </div>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('measurements.photoGuide.zoomHint')}
              </p>
            </div>

            {/* Checklist */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 mb-2">
                  <Sun className="w-3.5 h-3.5" /> {t('measurements.photoGuide.step2Badge')}
                </div>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('measurements.photoGuide.step2Title')}</h3>
                <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('measurements.photoGuide.step2Desc')}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step2Check1')}
                  </span>
                </div>

                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step2Check2')}
                  </span>
                </div>

                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-red-50/60 border-red-200/60 text-gray-800'}`}>
                  <XCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step2Avoid')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Image Guide */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div 
                onClick={() => setPreviewImage(step3Img)}
                className={`group relative w-full overflow-hidden rounded-2xl border-2 transition-all cursor-pointer shadow-lg hover:shadow-xl ${
                  isDark ? 'border-blue-500/40 bg-gray-800' : 'border-blue-400/60 bg-gray-50'
                }`}
              >
                <img 
                  src={step3Img} 
                  alt="Camera Placement Guide" 
                  className="w-full h-64 sm:h-72 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end justify-between p-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white shadow">
                    <Smartphone className="w-3.5 h-3.5 mr-1" /> 90°
                  </span>
                  <span className="inline-flex items-center text-xs text-white/80 group-hover:text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Zoom
                  </span>
                </div>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('measurements.photoGuide.zoomHint')}
              </p>
            </div>

            {/* Checklist */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 mb-2">
                  <Smartphone className="w-3.5 h-3.5" /> {t('measurements.photoGuide.step3Badge')}
                </div>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('measurements.photoGuide.step3Title')}</h3>
                <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('measurements.photoGuide.step3Desc')}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step3Check1')}
                  </span>
                </div>

                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step3Check2')}
                  </span>
                </div>

                <div className={`flex items-start p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-green-50/60 border-green-200/60 text-gray-800'}`}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {t('measurements.photoGuide.step3Check3')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center space-y-6">
            {/* Big 3-Pose Infographic Image */}
            <div className="w-full flex flex-col items-center">
              <div 
                onClick={() => setPreviewImage(step4Img)}
                className={`group relative w-full max-w-2xl overflow-hidden rounded-2xl border-2 transition-all cursor-pointer shadow-lg hover:shadow-xl ${
                  isDark ? 'border-purple-500/40 bg-gray-800' : 'border-purple-400/60 bg-gray-50'
                }`}
              >
                <img 
                  src={step4Img} 
                  alt="The 3 Poses Guide" 
                  className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end justify-between p-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-600 text-white shadow">
                    <Focus className="w-3.5 h-3.5 mr-1" /> {t('measurements.photoGuide.step4Badge')}
                  </span>
                  <span className="inline-flex items-center text-xs text-white/80 group-hover:text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <Maximize2 className="w-3.5 h-3.5 mr-1" /> Zoom
                  </span>
                </div>
              </div>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('measurements.photoGuide.zoomHint')}
              </p>
            </div>

            {/* Pose Cards Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div className={`p-4 rounded-xl border transition-all ${
                isDark ? 'border-gray-700 bg-gray-800/80 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50 shadow-sm'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('measurements.photoGuide.step4FrontTitle')}</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('measurements.photoGuide.step4FrontDesc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border transition-all ${
                isDark ? 'border-gray-700 bg-gray-800/80 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50 shadow-sm'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('measurements.photoGuide.step4SideTitle')}</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('measurements.photoGuide.step4SideDesc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border transition-all ${
                isDark ? 'border-gray-700 bg-gray-800/80 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50 shadow-sm'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('measurements.photoGuide.step4BackTitle')}</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('measurements.photoGuide.step4BackDesc')}
                </p>
              </div>
            </div>

            {/* Privacy Guarantee Banner */}
            <div className={`p-3.5 rounded-xl flex items-center justify-center w-full ${
              isDark ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}>
              <ShieldCheck className="w-5 h-5 mr-2 flex-shrink-0 text-emerald-500" />
              <span className="text-xs font-medium">
                {t('measurements.photoGuide.privacyGuaranteed')}
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
        <div 
          className={`relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-gray-900 border border-gray-800 text-white' : 'bg-white text-gray-900'
          }`}
          style={{ maxHeight: '92vh' }}
        >
          {/* Top Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold leading-tight">{t('measurements.photoGuide.modalTitle')}</h2>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('measurements.photoGuide.modalSubtitle')}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Pills & Progress Bar */}
          <div className={`px-6 py-3 border-b flex items-center justify-between gap-2 overflow-x-auto ${isDark ? 'border-gray-800/80 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
            {stepMeta.map((item, idx) => {
              const stepNumber = idx + 1;
              const isActive = step === stepNumber;
              const isCompleted = step > stepNumber;
              const Icon = item.icon;

              return (
                <button
                  key={idx}
                  onClick={() => setStep(stepNumber)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-primary-600 text-white shadow-md' 
                      : isCompleted
                      ? isDark ? 'bg-gray-800 text-primary-400 hover:bg-gray-700' : 'bg-gray-200 text-primary-700 hover:bg-gray-300'
                      : isDark ? 'bg-gray-800/40 text-gray-500 hover:bg-gray-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span>{stepNumber}. {item.title}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-800 h-1">
            <div 
              className="bg-primary-600 h-1 transition-all duration-300 ease-in-out" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7">
            {renderStepContent()}
          </div>

          {/* Footer Navigation */}
          <div className={`p-4 sm:p-5 border-t flex items-center justify-between ${isDark ? 'border-gray-800 bg-gray-900/90' : 'border-gray-100 bg-gray-50'}`}>
            <button
              onClick={handlePrev}
              className={`btn-secondary flex items-center px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                step === 1 ? 'invisible pointer-events-none' : ''
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('measurements.photoGuide.prevBtn')}
            </button>
            
            <button
              onClick={handleNext}
              className="btn-primary flex items-center px-6 sm:px-8 py-2.5 rounded-full text-sm sm:text-base font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {step === totalSteps ? t('measurements.photoGuide.startBtn') : t('measurements.photoGuide.nextBtn')}
              {step < totalSteps && <ChevronRight className="w-4 h-4 ml-1.5 -mr-1" />}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox if user clicks any image */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img 
              src={previewImage} 
              alt="Expanded Guide Image" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

