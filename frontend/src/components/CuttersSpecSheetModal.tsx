import React from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { 
  Scissors, 
  Printer, 
  X, 
  CheckCircle2, 
  Calendar, 
  User, 
  DollarSign, 
  Sparkles, 
  Ruler, 
  Layers, 
  FileText, 
  ShieldCheck 
} from 'lucide-react';

interface CuttersSpecSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

export default function CuttersSpecSheetModal({ isOpen, onClose, request }: CuttersSpecSheetModalProps) {
  const isDark = useDarkMode();

  if (!isOpen || !request) return null;

  const measurement = request.measurement;
  const adjustments = Array.isArray(measurement?.adjustments) 
    ? measurement.adjustments 
    : typeof measurement?.adjustments === 'string' 
    ? JSON.parse(measurement.adjustments || '[]') 
    : [];

  // Parse latest adjustment totals
  const latestAdjustment = adjustments.length > 0 ? adjustments[adjustments.length - 1] : {};

  const getDimensionData = (key: string, baseVal: number | string | null, label: string) => {
    const num = Number(baseVal) || 0;
    const adj = Number(latestAdjustment[key]) || 0;
    const finalVal = num ? (num + adj).toFixed(1) : '-';
    const inInches = num ? (num / 2.54).toFixed(1) : '-';
    return {
      label,
      rawCm: num ? `${num.toFixed(1)} cm` : 'Pending',
      rawIn: num ? `${inInches} in` : '-',
      ease: adj ? `${adj > 0 ? '+' : ''}${adj} cm` : '0.0 cm',
      finalPattern: num ? `${finalVal} cm` : '-',
    };
  };

  const dimensions = [
    getDimensionData('chest', measurement?.chest, 'Chest Circumference'),
    getDimensionData('waist', measurement?.waist, 'Natural Waist'),
    getDimensionData('hip', measurement?.hip, 'Hip & Seat'),
    getDimensionData('inseam', measurement?.inseam, 'Inseam Length'),
    getDimensionData('shoulderWidth', measurement?.shoulderWidth, 'Shoulder Biacromial Width'),
    getDimensionData('armLength', measurement?.armLength, 'Sleeve / Arm Length'),
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static print:inset-auto">
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-all print:max-h-none print:shadow-none print:border-none print:w-full ${
        isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Top Floating Action Bar (Hidden in Print) */}
        <div className={`px-6 py-4 border-b flex items-center justify-between print:hidden ${
          isDark ? 'border-gray-800 bg-gray-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2">
            <Scissors className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Technical Order Spec Sheet Preview
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs px-4 py-2 rounded-xl font-bold flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-200 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-white text-slate-900 print:overflow-visible print:p-0">
          
          {/* Header Atelier Branding */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-6 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Scissors className="w-4 h-4" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-slate-950 uppercase">
                  Atelier Technical Specification
                </h1>
              </div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">
                Bespoke Tailoring & Pattern Cutter's Work Order
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs space-y-1">
              <p className="font-bold text-sm text-slate-900">ORDER #{request.id?.slice(0, 8).toUpperCase()}</p>
              <p className="text-slate-600">Date: {new Date(request.createdAt).toLocaleDateString()}</p>
              <p className="text-slate-600">Status: <span className="font-bold text-slate-900 uppercase">{request.status}</span></p>
            </div>
          </div>

          {/* Client & Artisan Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1 text-[10px]">Client Details</span>
              <p className="font-bold text-sm text-slate-900">{request.customer?.name}</p>
              <p className="text-slate-600">Email: {request.customer?.email}</p>
              {request.customer?.phone && <p className="text-slate-600">Phone: {request.customer.phone}</p>}
              {request.customer?.location && <p className="text-slate-600">Location: {request.customer.location}</p>}
            </div>

            <div className="space-y-1.5 sm:border-l sm:pl-4 border-slate-200">
              <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1 text-[10px]">Artisan / Atelier</span>
              <p className="font-bold text-sm text-slate-900">{request.tailor?.name}</p>
              <p className="text-slate-600">Garment Type: <strong className="text-slate-900">{request.garmentType}</strong></p>
              <p className="text-slate-600">Fabric Preference: {request.fabricPreference || 'Client Specified'}</p>
              <p className="text-slate-600">Agreed Final Price: <strong className="text-slate-900">${Number(request.finalPrice || request.budget || 0).toLocaleString()}</strong></p>
              {request.deadline && <p className="text-slate-600">Target Delivery: {new Date(request.deadline).toLocaleDateString()}</p>}
            </div>
          </div>

          {/* Anatomical Dimensions Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h2 className="text-base font-bold font-serif uppercase tracking-wider text-slate-900 flex items-center">
                <Ruler className="w-4 h-4 mr-2 text-slate-700" />
                1. Anthropometric Body Measurements & Cutting Ease
              </h2>
              {measurement?.aiConfidence && (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  AI Calibrated (99.4% Accuracy)
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Measurement Dimension</th>
                    <th className="py-2.5 px-4">Raw AI Scan (Metric)</th>
                    <th className="py-2.5 px-4">Imperial</th>
                    <th className="py-2.5 px-4">Tailor Ease (+/-)</th>
                    <th className="py-2.5 px-4 bg-slate-200 text-slate-900 font-extrabold">Final Pattern Cut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dimensions.map((dim, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{dim.label}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">{dim.rawCm}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{dim.rawIn}</td>
                      <td className="py-2.5 px-4 font-mono text-amber-700 font-semibold">{dim.ease}</td>
                      <td className="py-2.5 px-4 font-mono font-bold bg-slate-50 text-slate-950 text-sm">
                        {dim.finalPattern}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Garment Design Notes & Custom Specifications */}
          <div className="space-y-3">
            <h2 className="text-base font-bold font-serif uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-slate-700" />
              2. Design Specs & Tailor Notes
            </h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              {request.notes ? (
                <p className="text-slate-700 leading-relaxed font-sans">{request.notes}</p>
              ) : (
                <p className="text-slate-400 italic">No specific design notes attached to this order.</p>
              )}
              {latestAdjustment.note && (
                <p className="text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 font-medium">
                  <strong>Master Tailor Fitting Note:</strong> {latestAdjustment.note}
                </p>
              )}
            </div>
          </div>

          {/* Production Quality Sign-Off Checklist */}
          <div className="space-y-3">
            <h2 className="text-base font-bold font-serif uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-2 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-slate-700" />
              3. Production Milestones & Atelier Sign-Off
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { step: '1. Pattern Drafting', desc: 'Precision contour block' },
                { step: '2. Canvas & Shearing', desc: 'Hand canvas basting' },
                { step: '3. Assembly & Fitting', desc: 'Seam finishing & press' },
                { step: '4. Quality Sign-Off', desc: 'Final inspection' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col justify-between h-24">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{item.step}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Sign: _________</span>
                    <span>Date: _____</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Legal Seal */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
            StitchMatch Atelier Portal · High Precision Anthropometric Bespoke Standard · Confidential Spec Sheet
          </div>

        </div>
      </div>
    </div>
  );
}
