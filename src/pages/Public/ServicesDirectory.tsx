import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, ArrowRight, MessageCircle, PhoneCall, LogIn } from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { ServicesCatalogGrid } from '../../components/services/ServicesCatalogGrid';
import { useWhatsAppRouter } from '../../hooks/useWhatsAppRouter';

export const ServicesDirectory = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { routeWhatsApp } = useWhatsAppRouter();

  const handleGeneralConsultation = () => {
    routeWhatsApp({
      serviceName: 'General Corporate Consultation',
      mode: 'presales',
      customMessage: isAr
        ? 'مرحباً فريق ميسرة، أود حجز استشارة مبدئية لمناقشة الخدمات الضريبية والمحاسبية لشركتنا في سلطنة عمان.'
        : 'Hello Maisarah Team, I would like to schedule an initial consultation to discuss audit, tax, and bookkeeping services for our company.'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-inter" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-3 sm:px-8 py-2.5 sm:py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link to="/business-club" className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-brand-dark to-red-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-brand-dark/20 shrink-0">
              <Sparkles size={18} className="text-amber-300" />
            </Link>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-brand-dark hidden sm:block">
                {isAr ? 'منصة ميسرة للحلول المالية والتدقيق' : 'MAISARAH FINANCIAL PLATFORM'}
              </span>
              <h1 className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate">
                {isAr ? 'دليل الخدمات والاستشارات المعتمدة' : 'Corporate Services Directory'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <LanguageSwitcher />

            <Link
              to="/business-club"
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-gray-700 hover:text-brand-dark hover:bg-gray-100 rounded-xl transition-all"
            >
              {isAr ? 'نادي الأعمال' : 'Business Club'}
            </Link>

            <Link
              to="/login"
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-brand-dark hover:bg-red-800 text-white rounded-xl text-xs font-black shadow-md shadow-brand-dark/20 transition-all flex items-center gap-1.5 min-h-[36px]"
              title={isAr ? 'دخول النظام' : 'Sign In'}
            >
              <LogIn size={14} className="sm:hidden" />
              <span className="hidden sm:inline">{isAr ? 'دخول النظام' : 'Sign In'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4 sm:px-8 border-b border-slate-700">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-white/10 text-amber-300 text-[11px] font-black border border-white/15">
            {isAr ? 'معايير مهنية معتمدة من وزارة التجارة وجهاز الضرائب' : 'Licensed Audit & Tax Compliance Standards'}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            {isAr ? 'حلول مالية وقانونية متكاملة لرواد الأعمال والشركات' : 'Integrated Corporate Tax, Audit & Advisory Solutions'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? 'استكشف نطاق العمل والمواعيد النظامية والمستندات المطلوبة لكل خدمة، مع إمكانية بدء التعاقد الفوري عبر الواتساب.'
              : 'Browse detailed scopes of work, statutory deadlines, required documents, and pricing with instant WhatsApp engagement.'}
          </p>

          <div className="pt-2">
            <button
              onClick={handleGeneralConsultation}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <MessageCircle size={15} />
              <span>{isAr ? 'حجز استشارة سريعة عبر الواتساب' : 'Book WhatsApp Advisory Session'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <ServicesCatalogGrid />
      </main>

    </div>
  );
};

export default ServicesDirectory;
