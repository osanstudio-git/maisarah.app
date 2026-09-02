import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download } from 'lucide-react';

export const InstallPrompt = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Check if already installed
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone) {
        setTimeout(() => setShowPrompt(true), 2500);
      }
    };

    const handleCustomTrigger = () => {
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('show-install-prompt', handleCustomTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('show-install-prompt', handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className={`fixed bottom-6 ${isAr ? 'left-6' : 'right-6'} z-[100] max-w-sm w-[calc(100%-2rem)] sm:w-[360px]`}>
      <div 
        className="bg-white rounded-lg p-4 shadow-xl border border-gray-300 relative text-start"
        dir={isAr ? 'rtl' : 'ltr'}
        lang={isAr ? 'ar' : 'en'}
      >
        {/* Top Brand Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#A11212] rounded-t-lg"></div>
        
        {/* Close Button */}
        <button 
          onClick={() => setShowPrompt(false)}
          className={`absolute top-2.5 ${isAr ? 'left-2.5' : 'right-2.5'} p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer`}
          title={isAr ? 'إغلاق' : 'Close'}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Content Row */}
        <div className={`flex items-center gap-3 ${isAr ? 'ps-1 pe-6' : 'pr-6'} mb-3`}>
          <div className="w-11 h-11 bg-white border border-gray-200 rounded-md flex items-center justify-center p-1 shadow-sm flex-shrink-0">
            <img src="/pwa-192x192.png" alt="Maisarah Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-start flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight leading-snug">
              {isAr ? 'تثبيت تطبيق ميسرة' : 'Install Maisarah App'}
            </h4>
            <p className="text-xs text-gray-500 font-medium leading-tight mt-0.5 truncate">
              {isAr ? 'تطبيق سطح المكتب والجوال السريع' : 'Fast, desktop & mobile native experience'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-2 px-3 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Download size={14} />
            <span>{isAr ? 'تثبيت التطبيق' : 'Install App'}</span>
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-bold transition-colors cursor-pointer border border-gray-200"
          >
            {isAr ? 'لاحقاً' : 'Later'}
          </button>
        </div>
      </div>
    </div>
  );
};
