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
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-700">
      <div 
        className="bg-white rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 max-w-md mx-auto relative overflow-hidden text-start"
        dir={isAr ? 'rtl' : 'ltr'}
        lang={isAr ? 'ar' : 'en'}
      >
        {/* Branded Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-dark"></div>
        
        {/* Close button with explicit position */}
        <button 
          onClick={() => setShowPrompt(false)}
          className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded-full hover:bg-gray-50`}
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X size={20} />
        </button>

        {/* Header with App Icon and Titles */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-dark rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-brand-dark/20 flex-shrink-0">
            {isAr ? 'م' : 'M'}
          </div>
          <div className="text-start flex-1 min-w-0">
            <h3 className="text-lg font-black text-gray-900 tracking-tight text-start">
              {isAr ? 'تثبيت تطبيق ميسرة' : 'Install Maisarah App'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1 text-start">
              {isAr ? 'إضافة إلى الشاشة الرئيسية' : 'Add to your Home Screen'}
            </p>
          </div>
        </div>

        {/* Description & Action Buttons */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed font-medium text-start">
            {isAr 
              ? 'احصل على تجربة أسرع وأفضل من خلال تثبيت ميسرة كتطبيق مستقل على جهازك.' 
              : 'Get a faster and better experience by installing Maisarah as a standalone app on your device.'}
          </p>
          
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-brand-dark text-white py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-800 transition-all shadow-lg shadow-brand-dark/20 active:scale-95 cursor-pointer"
            >
              <Download size={18} />
              <span>{isAr ? 'تثبيت الآن' : 'Install Now'}</span>
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-gray-200 transition-all cursor-pointer"
            >
              {isAr ? 'لاحقاً' : 'Later'}
            </button>
          </div>
        </div>

        {/* Browser specific hint for iOS */}
        <p className="mt-6 text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          {isAr 
            ? '* اضغط على أيقونة المشاركة ثم "إضافة إلى الشاشة الرئيسية"' 
            : '* Tap the share icon and select "Add to Home Screen"'}
        </p>
      </div>
    </div>
  );
};
