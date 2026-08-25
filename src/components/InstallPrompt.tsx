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
      <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 max-w-md mx-auto relative overflow-hidden">
        {/* Branded Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-dark"></div>
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-4 end-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 bg-brand-dark rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-brand-dark/20 flex-shrink-0">
            م
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">
              {isAr ? 'تثبيت تطبيق ميسرة' : 'Install Maisarah App'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {isAr ? 'أضف التطبيق لشاشتك الرئيسية' : 'Add to your Home Screen'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            {isAr 
              ? 'احصل على تجربة أسرع وأفضل من خلال تثبيت ميسرة كتحميل مباشر على جهازك.' 
              : 'Get a faster and better experience by installing Maisarah as a standalone app on your device.'}
          </p>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-brand-dark text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-800 transition-all shadow-lg shadow-brand-dark/20 active:scale-95"
            >
              <Download size={18} />
              {isAr ? 'تثبيت الآن' : 'Install Now'}
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
            >
              {isAr ? 'لاحقاً' : 'Later'}
            </button>
          </div>
        </div>

        {/* Browser specific hint for iOS */}
        <p className="mt-6 text-center text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
          {isAr 
            ? 'اضغط على أيقونة المشاركة ثم "إضافة إلى الشاشة الرئيسية"' 
            : 'Tap the share icon and select "Add to Home Screen"'}
        </p>
      </div>
    </div>
  );
};
