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
    <div className={`fixed bottom-6 ${isAr ? 'left-6' : 'right-6'} z-[100] animate-in slide-in-from-bottom-5 duration-500 max-w-sm w-[calc(100%-2rem)] sm:w-[360px]`}>
      <div 
        className="bg-white/95 backdrop-blur-md rounded-3xl p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100/90 relative overflow-hidden text-start"
        dir={isAr ? 'rtl' : 'ltr'}
        lang={isAr ? 'ar' : 'en'}
      >
        {/* Subtle Brand Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#A11212] via-[#CD3333] to-[#A11212]"></div>
        
        {/* Close Button */}
        <button 
          onClick={() => setShowPrompt(false)}
          className={`absolute top-3.5 ${isAr ? 'left-3.5' : 'right-3.5'} p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded-xl hover:bg-gray-100`}
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X size={15} />
        </button>

        {/* Content Row */}
        <div className={`flex items-center gap-3.5 ${isAr ? 'ps-1 pe-6' : 'pr-6'} mb-3.5`}>
          <div className="w-12 h-12 bg-white border border-gray-150/80 rounded-2xl flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
            <img src="/logo.png" alt="Maisarah Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-start flex-1 min-w-0">
            <h4 className="text-sm font-black text-gray-900 tracking-tight leading-snug">
              {isAr ? 'تثبيت تطبيق ميسرة' : 'Install Maisarah App'}
            </h4>
            <p className="text-xs text-gray-500 font-medium leading-tight mt-0.5 truncate">
              {isAr ? 'تطبيق سطح المكتب والجوال السريع' : 'Fast, desktop & mobile native experience'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-gradient-to-r from-[#A11212] to-[#8c0f0f] text-white py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md shadow-[#A11212]/25 active:scale-95 cursor-pointer"
          >
            <Download size={14} />
            <span>{isAr ? 'تثبيت التطبيق' : 'Install App'}</span>
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {isAr ? 'لاحقاً' : 'Later'}
          </button>
        </div>
      </div>
    </div>
  );
};
