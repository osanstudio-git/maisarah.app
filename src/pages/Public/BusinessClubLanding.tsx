import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  ShieldCheck,
  Calendar,
  MessageCircle,
  Share2,
  Users,
  Building2,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  Layers,
  Send,
  Lock,
  PhoneCall,
  LogIn
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { ServicesCatalogGrid } from '../../components/services/ServicesCatalogGrid';
import { ClubInboundRegisterModal } from '../../components/club/ClubInboundRegisterModal';
import { useWhatsAppRouter } from '../../hooks/useWhatsAppRouter';

interface ClubAnnouncement {
  id: string;
  title: string;
  title_ar?: string;
  content: string;
  content_ar?: string;
  category: string;
  priority: string;
  published_at: string;
}

interface ClubEvent {
  id: string;
  title: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  event_type: string;
  speaker_name?: string;
  event_date: string;
  location?: string;
  is_free: boolean;
  max_attendees?: number;
}

export const BusinessClubLanding = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || undefined;

  const { routeWhatsApp } = useWhatsAppRouter();

  const [activeTab, setActiveTab] = useState<'bulletins' | 'events' | 'services'>('bulletins');
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registeredMemberPass, setRegisteredMemberPass] = useState<any>(null);

  useEffect(() => {
    fetchClubData();
  }, []);

  const fetchClubData = async () => {
    setLoading(true);
    try {
      const [annRes, evRes] = await Promise.all([
        supabase
          .from('club_announcements')
          .select('*')
          .eq('is_active', true)
          .order('published_at', { ascending: false })
          .limit(10),
        supabase
          .from('club_events')
          .select('*')
          .eq('status', 'upcoming')
          .order('event_date', { ascending: true })
          .limit(6)
      ]);

      if (annRes.data) setAnnouncements(annRes.data);
      if (evRes.data) setEvents(evRes.data);
    } catch (err) {
      console.warn('Error fetching club public data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralInquiry = () => {
    routeWhatsApp({
      serviceName: 'Business Club Advisory & Events',
      mode: 'presales',
      customMessage: isAr
        ? `مرحباً فريق ميسرة، أود الاستفسار حول فعاليات نادي الأعمال وخدمات الامتثال الضريبي للشركات.\nالكود المرجعي: ${refCode || 'Direct'}`
        : `Hello Maisarah Team, I would like to enquire about Business Club membership, tax updates, and executive masterclasses.\nRef: ${refCode || 'Direct'}`
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-inter" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Public Top Bar ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-3 sm:px-8 py-2.5 sm:py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-brand-dark to-red-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-brand-dark/20 shrink-0">
              <Sparkles size={18} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-brand-dark hidden sm:block">
                {isAr ? 'منصة ميسرة للحلول المالية' : 'MAISARAH AUDIT & TAX'}
              </span>
              <h1 className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate">
                {isAr ? 'نادي أعمال ميسرة' : 'Maisarah Business Club'}
              </h1>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <LanguageSwitcher />

            <Link
              to="/login"
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-gray-700 hover:text-brand-dark hover:bg-gray-100 rounded-xl transition-all flex items-center gap-1.5 min-h-[36px]"
              title={isAr ? 'تسجيل دخول العملاء' : 'Client Login'}
            >
              <LogIn size={15} className="sm:hidden text-gray-700" />
              <span className="hidden sm:inline">{isAr ? 'تسجيل دخول العملاء' : 'Client Login'}</span>
            </Link>

            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-brand-dark hover:bg-red-800 text-white rounded-xl text-xs font-black shadow-md shadow-brand-dark/20 transition-all cursor-pointer active:scale-95 shrink-0 min-h-[36px] flex items-center justify-center"
            >
              {isAr ? 'انضم مجاناً' : 'Join Free'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Personalized Referral Banner if ?ref= ────────────────────────────── */}
      {refCode && (
        <div className="bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 border-b border-amber-200/80 px-4 py-2 text-center text-xs font-bold text-brand-dark flex items-center justify-center gap-2">
          <Award size={15} className="text-amber-600 shrink-0" />
          <span className="leading-snug">
            {isAr
              ? `مرحباً بك! لقد تلقيت دعوة خاصة لزيارة نادي أعمال ميسرة (كود الدعوة: ${refCode})`
              : `Welcome! You have been granted an exclusive VIP preview invite (Ref: ${refCode})`}
          </span>
        </div>
      )}

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-dark text-white py-10 sm:py-20 px-4 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-black text-amber-300">
            <Sparkles size={14} className="shrink-0" />
            <span>{isAr ? 'مجتمع القيادات المالية والتنفيذية في سلطنة عمان' : 'Executive FinTech & Compliance Network in Oman'}</span>
          </div>

          <h2 className="text-2xl sm:text-5xl font-black tracking-tight leading-snug sm:leading-tight">
            {isAr ? (
              <>
                واكب مستجدات الضرائب والتدقيق مع <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-200">نادي أعمال ميسرة</span>
              </>
            ) : (
              <>
                Stay Ahead of Tax & Audit Mandates with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-200">Maisarah Business Club</span>
              </>
            )}
          </h2>

          <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? 'بوابتك الحصرية لمتابعة تعاميم جهاز الضرائب العماني، مواعيد إقرارات ضريبة القيمة المضافة، ورش العمل التنفيذية، واستشارات تأسيس وتدقيق الشركات.'
              : 'Direct access to official Oman Tax Authority circulars, VAT compliance deadlines, corporate masterclasses, and certified audit advisory.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 to-brand-dark hover:from-red-500 hover:to-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-red-900/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Award size={16} />
              <span>{isAr ? 'احصل على تصريح العضوية المجاني' : 'Get Free Community Pass'}</span>
            </button>

            <button
              onClick={handleGeneralInquiry}
              className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 min-h-[44px]"
            >
              <MessageCircle size={16} className="text-emerald-400" />
              <span>{isAr ? 'تحدث مع مستشار الضرائب (واتساب)' : 'Consult Tax Advisor on WhatsApp'}</span>
            </button>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-6 sm:pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] text-slate-400 font-bold">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
              <span>{isAr ? 'مرخص بموجب اشتراطات وزارة التجارة وجهاز الضرائب' : 'Licensed under MoCIIP & OTA Guidelines'}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Building2 size={15} className="text-amber-400 shrink-0" />
              <span>{isAr ? 'يدعم أكثر من 250 شركة ومؤسسة عمانية' : 'Trusted by 250+ Omani Enterprises'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ───────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-3 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Navigation Tabs Bar - Fluid Horizontal Swipe on Mobile */}
        <div className="w-full">
          <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-xs max-w-xl mx-auto overflow-x-auto scrollbar-none snap-x touch-pan-x">
            <button
              onClick={() => setActiveTab('bulletins')}
              className={`shrink-0 flex-1 min-w-[125px] sm:min-w-0 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap snap-start ${
                activeTab === 'bulletins'
                  ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BookOpen size={14} className="shrink-0" />
              <span>{isAr ? 'النشرات وتعاميم الضرائب' : 'Tax Bulletins'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'bulletins' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {announcements.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`shrink-0 flex-1 min-w-[125px] sm:min-w-0 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap snap-start ${
                activeTab === 'events'
                  ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Calendar size={14} className="shrink-0" />
              <span>{isAr ? 'ورش العمل والندوات' : 'Masterclasses'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'events' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`shrink-0 flex-1 min-w-[125px] sm:min-w-0 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap snap-start ${
                activeTab === 'services'
                  ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Layers size={14} className="shrink-0" />
              <span>{isAr ? 'دليل الخدمات المعتمدة' : 'Services Directory'}</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: BULLETINS & TAX UPDATES ─────────────────────────────────── */}
        {activeTab === 'bulletins' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900">
                  {isAr ? 'آخر التعاميم والتحديثات الضريبية' : 'Latest Regulatory Tax Bulletins'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {isAr ? 'متابعة دورية للقوانين والمواعيد النظامية الصادرة عن جهاز الضرائب' : 'Curated regulatory briefings and compliance alerts under Oman Tax Law'}
                </p>
              </div>

              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="self-start sm:self-auto px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-brand-dark font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
              >
                <Sparkles size={13} className="shrink-0" />
                <span>{isAr ? 'اشترك في التنبيهات' : 'Subscribe to Alerts'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {announcements.map(ann => {
                const title = isAr && ann.title_ar ? ann.title_ar : ann.title;
                const content = isAr && ann.content_ar ? ann.content_ar : ann.content;

                return (
                  <div key={ann.id} className="bg-white border border-gray-200/80 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {ann.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400">
                          {new Date(ann.published_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-black text-sm text-gray-900 leading-snug line-clamp-2">
                        {title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                        {content}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          routeWhatsApp({
                            serviceName: title,
                            mode: 'presales',
                            customMessage: `Hello Maisarah Team, I read your bulletin regarding "${title}" and would like to ask a technical compliance question.`
                          });
                        }}
                        className="text-xs font-bold text-brand-dark hover:underline flex items-center gap-1 py-1"
                      >
                        <MessageCircle size={14} className="text-emerald-600 shrink-0" />
                        <span>{isAr ? 'استشارة حول هذا التعميم' : 'Enquire on this'}</span>
                      </button>

                      <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="text-[11px] font-bold text-gray-400 hover:text-gray-700 py-1"
                      >
                        {isAr ? 'قراءة كاملة' : 'Full Text →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: EVENTS & WORKSHOPS ───────────────────────────────────────── */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900">
                  {isAr ? 'ورش العمل والمؤتمرات التنفيذية' : 'Executive Masterclasses & Seminars'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {isAr ? 'جلسات تفاعلية مع خبراء المحاسبة والضرائب القانونيين' : 'Live interactive sessions with certified audit partners and tax counsels'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {events.map(ev => {
                const title = isAr && ev.title_ar ? ev.title_ar : ev.title;
                const desc = isAr && ev.description_ar ? ev.description_ar : ev.description;
                const eventDate = new Date(ev.event_date);

                return (
                  <div key={ev.id} className="bg-white border border-gray-200/80 rounded-3xl p-6 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {ev.is_free ? (isAr ? 'حضور مجاني' : 'Complimentary') : 'VIP Only'}
                        </span>
                        <span className="text-xs font-black text-brand-dark flex items-center gap-1">
                          <Calendar size={13} />
                          <span>{eventDate.toLocaleDateString(isAr ? 'ar-OM' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                      </div>

                      <h4 className="font-black text-base text-gray-900 leading-tight">
                        {title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        {desc}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-brand-dark" />
                          <span>{ev.speaker_name || 'Maisarah Faculty'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-emerald-600" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="flex-1 sm:flex-initial py-2.5 px-4 bg-brand-dark hover:bg-red-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-brand-dark/20 transition-all cursor-pointer min-h-[40px] active:scale-95"
                      >
                        <CheckCircle2 size={14} className="text-emerald-300 shrink-0" />
                        <span>{isAr ? 'حجز مقعد مجاني' : 'Reserve Free Seat'}</span>
                      </button>

                      <button
                        onClick={() => {
                          routeWhatsApp({
                            serviceName: title,
                            mode: 'presales',
                            customMessage: `Hello, I want to confirm registration for the masterclass: "${title}".`
                          });
                        }}
                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
                        title={isAr ? 'حجز عبر الواتساب' : 'WhatsApp RSVP'}
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: SERVICES DIRECTORY ───────────────────────────────────────── */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto space-y-1 mb-6">
              <h3 className="text-xl font-black text-gray-900">
                {isAr ? 'دليل الخدمات والاستشارات المعتمدة' : 'Certified Corporate Services Catalog'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {isAr
                  ? 'خدمات شاملة في الضرائب، التدقيق، المحاسبة، وتأسيس الشركات مع المواعيد القانونية والأسعار'
                  : 'End-to-end corporate solutions with statutory deadlines, scope of work, and pricing transparency.'}
              </p>
            </div>

            <ServicesCatalogGrid />
          </div>
        )}

      </main>

      {/* ── Registration / Inbound Lead Modal ─────────────────────────────────── */}
      <ClubInboundRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        referralCode={refCode}
        onRegistered={(pass) => setRegisteredMemberPass(pass)}
      />

    </div>
  );
};

export default BusinessClubLanding;
