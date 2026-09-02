import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';

export const NetworkStatus: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setIsDismissed(false);
      setShowRestored(true);
      
      // Auto-dismiss the "back online" confirmation banner after 3.5 seconds
      timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsDismissed(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // If online and not currently flashing restored banner, render nothing
  if ((isOnline && !showRestored) || isDismissed) {
    return null;
  }

  return (
    <aside 
      aria-label="Network Connectivity Status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-2rem)] sm:w-auto animate-in slide-in-from-top-4 duration-300 select-none pointer-events-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {!isOnline ? (
        /* 🔴 Offline Alert Banner */
        <div className="bg-red-950/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-[0_12px_35px_rgba(161,18,18,0.4)] border border-red-800/80 flex items-center gap-3">
          {/* Animated Pulsing Signal Indicator */}
          <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-red-600/30 text-red-300">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-xl bg-red-500 opacity-30"></span>
            <WifiOff size={18} className="text-red-400 relative z-10" />
          </div>

          <div className="flex-1 min-w-0 text-start">
            <h4 className="text-xs font-black tracking-tight text-red-100 flex items-center gap-1.5">
              <span>{isAr ? 'أنت غير متصل بالإنترنت' : 'You are currently offline'}</span>
            </h4>
            <p className="text-[11px] text-red-300/80 font-medium leading-tight mt-0.5">
              {isAr 
                ? 'يرجى التحقق من اتصالك بالشبكة للمتابعة' 
                : 'Please check your internet connection'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 hover:bg-red-800/50 text-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title={isAr ? 'إعادة المحاولة' : 'Retry connection'}
            >
              <RefreshCw size={13} className="animate-spin-slow" />
              <span className="hidden sm:inline text-[11px]">{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 hover:bg-red-800/50 text-red-300 rounded-lg transition-colors cursor-pointer"
              title={isAr ? 'إغلاق' : 'Dismiss'}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* 🟢 Online Restored Toast */
        <div className="bg-emerald-950/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-[0_12px_35px_rgba(16,185,129,0.35)] border border-emerald-700/80 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Wifi size={16} />
          </div>
          <div className="text-start flex-1 min-w-0">
            <h4 className="text-xs font-black text-emerald-100 leading-snug">
              {isAr ? 'تمت استعادة الاتصال بالإنترنت' : 'Connection Restored'}
            </h4>
            <p className="text-[10px] text-emerald-300/80 font-medium leading-tight mt-0.5">
              {isAr ? 'أنت متصل بالإنترنت الآن' : 'You are back online'}
            </p>
          </div>
          <button
            onClick={() => setShowRestored(false)}
            className="p-1 hover:bg-emerald-800/40 text-emerald-300 rounded-lg transition-colors cursor-pointer"
            title={isAr ? 'إغلاق' : 'Dismiss'}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </aside>
  );
};
