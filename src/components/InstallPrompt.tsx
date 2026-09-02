import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Share } from 'lucide-react';

export const InstallPrompt = () => {
  const { t, i18n } = useTranslation();
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
        // Delay showing the prompt for better UX
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 end-6 z-[100] animate-in slide-in-from-bottom-5 duration-500 max-w-sm w-[calc(100%-2rem)] sm:w-[350px]">
      <div 
        className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100/90 relative overflow-hidden text-start"
        dir={isAr ? 'rtl' : 'ltr'}
        lang={isAr ? 'ar' : 'en'}
      >
        {/* Subtle Brand Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#A11212]"></div>
        
        {/* Close Button */}
        <button 
          onClick={() => setShowPrompt(false)}
          className={`absolute top-3 ${isAr ? 'left-3' : 'right-3'} p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded-lg hover:bg-gray-100`}
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X size={16} />
        </button>

        {/* Content Row */}
        <div className="flex items-center gap-3 pe-6 mb-3">
          <div className="w-10 h-10 bg-[#A11212] rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-[#A11212]/20 flex-shrink-0">
            {isAr ? 'م' : 'M'}
          </div>
          <div className="text-start flex-1 min-w-0">
            <h4 className="text-xs font-black text-gray-900 tracking-tight leading-snug">
              {isAr ? 'تثبيت تطبيق ميسرة' : 'Install Maisarah App'}
            </h4>
            <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5 truncate">
              {isAr ? 'وصول أسرع ومباشر من جهازك' : 'Fast, standalone app access'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-[#A11212] text-white py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#800e0e] transition-all shadow-md shadow-[#A11212]/20 active:scale-95 cursor-pointer"
          >
            <Download size={14} />
            <span>{isAr ? 'تثبيت الآن' : 'Install'}</span>
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            {isAr ? 'لاحقاً' : 'Later'}
          </button>
        </div>
      </div>
    </div>
  );
};
