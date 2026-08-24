import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Sparkles, Check } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

export default function InstallAppBanner() {
  const isDark = useDarkMode();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed as PWA)
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isInStandalone);

    // Check if user is on iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for Chrome / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Do not show banner if already installed or dismissed this session
  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if Android prompt is ready or user is on iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android / Chrome direct 1-tap install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // Show iOS step-by-step instructions
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Sleek Floating Mobile Install Banner */}
      <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 animate-slideUp">
        <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center justify-between gap-3 ${
          isDark 
            ? 'bg-gray-900/95 border-purple-800/60 text-white shadow-purple-950/50' 
            : 'bg-white/95 border-purple-200 text-slate-900 shadow-purple-500/10'
        }`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-700 to-amber-500 p-0.5 shadow-md flex-shrink-0">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h4 className="text-xs font-bold truncate">Install StitchMatch App</h4>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Fast
                </span>
              </div>
              <p className={`text-[11px] truncate ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Add to your home screen for full mobile experience
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="btn-primary text-xs px-3.5 py-2 rounded-xl font-bold flex items-center space-x-1.5 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer`}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Add to Home Screen Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border relative ${
            isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-3">
              <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Install on iPhone / iPad</h3>
                <p className="text-xs text-gray-400">Install in 2 simple steps:</p>
              </div>
            </div>

            <div className="space-y-2.5 my-4 text-xs">
              <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-slate-800 dark:text-slate-200">1. Tap the Share Button</strong>
                  <span className="text-gray-400 text-[11px]">Located at the bottom of your Safari browser bar.</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-slate-800 dark:text-slate-200">2. Select "Add to Home Screen"</strong>
                  <span className="text-gray-400 text-[11px]">Scroll down and tap "Add to Home Screen (⊞)".</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Got it!</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
