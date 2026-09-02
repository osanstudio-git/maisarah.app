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
        setTimeout(() => setShowPrompt(true), 2000);
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
    <div className={`fixed bottom-6 ${isAr ? 'left-6' : 'right-6'} z-[100] animate-in slide-in-from-bottom-5 duration-300 max-w-md w-[calc(100%-2rem)] sm:w-auto`}>
      <div 
        className="bg-white rounded-2xl py-2.5 px-3.5 shadow-[0_12px_35px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 text-start"
        dir={isAr ? 'rtl' : 'ltr'}
        lang={isAr ? 'ar' : 'en'}
      >
        {/* App Logo */}
        <div className="w-10 h-10 bg-white border border-gray-150 rounded-xl flex items-center justify-center p-1 shadow-xs flex-shrink-0">
          <img src="/pwa-192x192.png" alt="Maisarah Logo" className="w-full h-full object-contain" />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-[140px] sm:min-w-[180px]">
          <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight leading-tight truncate">
            {isAr ? 'تثبيت تطبيق ميسرة' : 'Install Maisarah App'}
          </h4>
          <p className="text-[11px] text-gray-400 font-medium leading-tight mt-0.5 truncate">
            app.maisarah.net
          </p>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstallClick}
          className="bg-[#A11212] hover:bg-[#850e0e] text-white py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer flex-shrink-0"
        >
          <Download size={13} className="stroke-[2.5]" />
          <span>{isAr ? 'تثبيت' : 'Install'}</span>
        </button>

        {/* Close Button */}
        <button 
          onClick={() => setShowPrompt(false)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded-lg hover:bg-gray-100 flex-shrink-0"
          title={isAr ? 'إغلاق' : 'Close'}
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
