import React, { useState } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { 
  Sparkles, 
  Tag, 
  Sliders, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { 
  FitType, 
  FIT_PRESETS, 
  calculateFitRecommendations 
} from '../utils/fitRecommendations';

interface FitEaseRecommendationsCardProps {
  rawMeasurements: {
    chest?: number | null;
    waist?: number | null;
    hip?: number | null;
    inseam?: number | null;
    shoulderWidth?: number | null;
    armLength?: number | null;
  };
}

export default function FitEaseRecommendationsCard({ rawMeasurements }: FitEaseRecommendationsCardProps) {
  const isDark = useDarkMode();
  const [selectedFit, setSelectedFit] = useState<FitType>('regular');

  const recommendation = calculateFitRecommendations(rawMeasurements, selectedFit);

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${
      isDark ? 'bg-gray-800/80 border-gray-700/80 text-white' : 'bg-white border-gray-200 text-gray-900'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-sm">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              Bespoke Fit Ease & RTW Sizing
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                Live Engine
              </span>
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Select your desired drape to calculate cut allowances & international ready-to-wear equivalents.
            </p>
          </div>
        </div>

        {/* RTW Matched Size Tag */}
        <div className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-xs font-bold self-start sm:self-auto ${
          isDark ? 'bg-primary-950/60 border-primary-800 text-primary-300' : 'bg-primary-50 border-primary-200 text-primary-800'
        }`}>
          <Tag className="w-3.5 h-3.5 mr-1.5 text-primary-500" />
          <span>{recommendation.matchedRTWSize.eu} / {recommendation.matchedRTWSize.us}</span>
          <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-green-500 text-white font-mono">
            {recommendation.matchedRTWSize.matchScore}% Match
          </span>
        </div>
      </div>

      {/* Fit Ease Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.keys(FIT_PRESETS) as FitType[]).map((fitKey) => {
          const preset = FIT_PRESETS[fitKey];
          const isSelected = selectedFit === fitKey;
          return (
            <button
              key={fitKey}
              type="button"
              onClick={() => setSelectedFit(fitKey)}
              className={`p-2.5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/40 ring-1 ring-primary-500 shadow-xs'
                  : isDark
                  ? 'border-gray-700 bg-gray-900/60 hover:border-gray-600'
                  : 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold block">{preset.label}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 shrink-0" />}
              </div>
              <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {preset.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Calculated Tailored Dimensions Grid */}
      <div className={`p-3 rounded-xl border mb-3 ${
        isDark ? 'bg-gray-900/60 border-gray-700/60' : 'bg-gray-50 border-gray-200/80'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Finished Garment Dimensions ({FIT_PRESETS[selectedFit].label})
          </span>
          <span className="text-[10px] text-primary-500 font-bold">
            +{FIT_PRESETS[selectedFit].ease.chest}cm Chest Ease
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          <div className={`p-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <span className="text-[10px] text-gray-400 block">Chest</span>
            <span className="text-xs sm:text-sm font-extrabold text-primary-500 font-mono">
              {recommendation.tailoredDimensions.chest} cm
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <span className="text-[10px] text-gray-400 block">Waist</span>
            <span className="text-xs sm:text-sm font-extrabold text-primary-500 font-mono">
              {recommendation.tailoredDimensions.waist} cm
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <span className="text-[10px] text-gray-400 block">Seat/Hip</span>
            <span className="text-xs sm:text-sm font-extrabold text-primary-500 font-mono">
              {recommendation.tailoredDimensions.hip} cm
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <span className="text-[10px] text-gray-400 block">Shoulder</span>
            <span className="text-xs sm:text-sm font-bold font-mono">
              {recommendation.tailoredDimensions.shoulderWidth} cm
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <span className="text-[10px] text-gray-400 block">Sleeve</span>
            <span className="text-xs sm:text-sm font-bold font-mono">
              {recommendation.tailoredDimensions.armLength} cm
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <span className="text-[10px] text-gray-400 block">Inseam</span>
            <span className="text-xs sm:text-sm font-bold font-mono">
              {recommendation.tailoredDimensions.inseam} cm
            </span>
          </div>
        </div>
      </div>

      {/* Fit Advice Footer */}
      <div className={`text-[11px] flex items-center justify-between ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-primary-500 shrink-0" />
          <span>{FIT_PRESETS[selectedFit].description}</span>
        </div>
        <span className="font-semibold text-primary-500 shrink-0 ml-2">
          {recommendation.matchedRTWSize.label}
        </span>
      </div>
    </div>
  );
}
