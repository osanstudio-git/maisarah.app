import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Briefcase, 
  CreditCard, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  LogOut, 
  Globe, 
  MessageCircle, 
  Share2, 
  Check, 
  Copy, 
  Phone, 
  ArrowUpRight,
  RefreshCw,
  Zap,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { DigitalClubCard, type ClubMemberData } from '../../components/client/DigitalClubCard';
import { ClubFeed } from '../../components/client/ClubFeed';
import { ClientServicesList } from '../../components/client/ClientServicesList';
import { ClientBillingList } from '../../components/client/ClientBillingList';

export type ClientNavTab = 'home' | 'services' | 'billing' | 'club_card';

export const ClientDashboard = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<ClientNavTab>('home');
  const [memberProfile, setMemberProfile] = useState<ClubMemberData | null>(null);
  const [clientType, setClientType] = useState<'client' | 'club_member'>('club_member');
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMemberData();
    }
  }, [user]);

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      const currentUserId = user?.id;

      // 1. Check Profiles table for client_type and metadata
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      // 2. Fetch Business Club Member Record
      const { data: clubData, error: clubErr } = await supabase
        .from('business_club_members')
        .select('*')
        .or(`user_id.eq.${currentUserId},client_id.eq.${currentUserId}`)
        .maybeSingle();

      const userClientType = (profileData?.client_type === 'client' || clubData?.client_id) 
        ? 'client' 
        : 'club_member';
      
      setClientType(userClientType);
      setClientId(clubData?.client_id || (userClientType === 'client' ? currentUserId : null));

      if (clubData) {
        setMemberProfile({
          id: clubData.id,
          full_name: clubData.full_name || profileData?.full_name || user?.email?.split('@')[0] || 'Member',
          membership_number: clubData.membership_number || `MBC-2026-${currentUserId?.substring(0, 4).toUpperCase()}`,
          member_tier: clubData.member_tier || (userClientType === 'client' ? 'silver' : 'community'),
          loyalty_points: clubData.loyalty_points ?? 100,
          qr_code_token: clubData.qr_code_token || clubData.membership_number,
          referral_code: clubData.referral_code || `MBC-${currentUserId?.substring(0, 6).toUpperCase()}`,
          company_name: clubData.company_name || profileData?.company_name,
          joined_date: clubData.joined_date || clubData.created_at,
          compliance_health_score: clubData.compliance_health_score ?? 90
        });
      } else {
        // Fallback profile if record is freshly created
        setMemberProfile({
          full_name: profileData?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member',
          membership_number: `MBC-2026-${(currentUserId || '1080').substring(0, 4).toUpperCase()}`,
          member_tier: userClientType === 'client' ? 'silver' : 'community',
          loyalty_points: 100,
          qr_code_token: `MBC-TOKEN-${currentUserId?.substring(0, 6)}`,
          referral_code: `MBC-${currentUserId?.substring(0, 6).toUpperCase()}`,
          company_name: profileData?.company_name || user?.user_metadata?.company_name || '',
          joined_date: new Date().toISOString(),
          compliance_health_score: 88
        });
      }
    } catch (err: any) {
      console.error('Error loading client portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFullClient = clientType === 'client';

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang = isAr ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  const copyReferral = () => {
    if (memberProfile?.referral_code) {
      navigator.clipboard.writeText(memberProfile.referral_code);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  // Nav items configuration
  const navItems = [
    { id: 'home', labelEn: 'Home Feed', labelAr: 'الرئيسية', icon: Home },
    ...(isFullClient ? [
      { id: 'services', labelEn: 'Services', labelAr: 'خدماتي', icon: Briefcase },
      { id: 'billing', labelEn: 'Billing', labelAr: 'الفواتير والمالية', icon: CreditCard },
    ] : []),
    { id: 'club_card', labelEn: 'Club Card', labelAr: 'بطاقة النادي', icon: Sparkles },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter text-gray-900 pb-24 lg:pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ================= TOP HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-dark to-red-800 flex items-center justify-center text-white shadow-md shadow-brand-dark/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-gray-900 uppercase">MAISARAH</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  {isAr ? 'نادي الأعمال' : 'BUSINESS CLUB'}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[180px]">
                {memberProfile?.company_name || memberProfile?.full_name || 'VIP Member'}
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            {/* Loyalty Pill */}
            {memberProfile && (
              <div 
                onClick={() => setActiveTab('club_card')}
                className="hidden sm:flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-black text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>{memberProfile.loyalty_points} PTS</span>
              </div>
            )}

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Switch Language"
            >
              <Globe className="w-4 h-4 text-gray-600" />
              <span>{isAr ? 'EN' : 'عربي'}</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-600 transition-colors"
              title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= DESKTOP SUBNAV ================= */}
      <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-[57px] z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-2 px-4 py-2">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ClientNavTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-gray-400">
            <div className="w-8 h-8 border-3 border-brand-dark border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold">{isAr ? 'جاري تحميل بوابة النادي...' : 'Loading Maisarah Club...'}</p>
          </div>
        ) : (
          <>
            {/* ================= 🏠 HOME TAB ================= */}
            {activeTab === 'home' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Community Welcome Banner (For Leads / Free Club Members) */}
                {!isFullClient && (
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-xl border border-indigo-500/20">
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {isAr ? 'عضوية مجانية نشطة' : 'Complimentary Membership'}
                        </span>
                        <span className="text-xs text-white/70 font-mono">
                          {memberProfile?.membership_number}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                          {isAr ? `أهلاً بك، ${memberProfile?.full_name}` : `Welcome, ${memberProfile?.full_name}`}
                        </h2>
                        <p className="text-xs sm:text-sm text-indigo-200 mt-1 leading-relaxed">
                          {isAr
                            ? 'أنت الآن عضو في نادي ميسرة للأعمال. استمتع بتحديثات الضرائب الحصرية، ورش العمل المعتمدة، وتنبيهات مواعيد الامتثال مجاناً.'
                            : 'You have full access to tax bulletins, masterclasses, and VAT deadline alerts. Upgrade anytime to full advisory service.'}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => setActiveTab('club_card')}
                          className="px-4 py-2 rounded-xl bg-white text-gray-900 text-xs font-black uppercase tracking-wider hover:bg-gray-100 flex items-center gap-1.5 transition-transform active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>{isAr ? 'عرض بطاقتي الرقمية' : 'View Digital Card'}</span>
                        </button>

                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="px-4 py-2 rounded-xl bg-brand-dark text-white text-xs font-black uppercase tracking-wider hover:bg-red-800 flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isAr ? 'طلب استشارة أو خدمة ضريبية' : 'Book Tax Consultation'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Subtle decorative glow in background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  </div>
                )}

                {/* Active Client Summary Banner */}
                {isFullClient && (
                  <div className="bg-gradient-to-r from-brand-dark to-red-800 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-300" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-green-300">
                          {isAr ? 'حساب عميل مفعل' : 'Active Client Portal'}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white">
                        {memberProfile?.company_name || memberProfile?.full_name}
                      </h2>
                      <p className="text-xs text-white/80">
                        {isAr ? 'متابعة شاملة للخدمات المالية، الفواتير، ونادي الأعمال' : 'Direct access to your ongoing services, billing, and VIP club perks'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setActiveTab('services')}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-white text-gray-900 font-bold text-xs hover:bg-gray-100 transition-colors text-center"
                      >
                        {isAr ? 'متابعة الخدمات' : 'Track Tasks'}
                      </button>
                      <button
                        onClick={() => setActiveTab('billing')}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-white/20 text-white border border-white/30 font-bold text-xs hover:bg-white/30 transition-colors text-center"
                      >
                        {isAr ? 'الفواتير' : 'Invoices'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Club Feed: Announcements, VAT Bulletins & Events */}
                <ClubFeed
                  memberId={memberProfile?.id}
                  userId={user?.id}
                  memberTier={memberProfile?.member_tier}
                />
              </div>
            )}

            {/* ================= 📋 SERVICES TAB (Clients Only) ================= */}
            {activeTab === 'services' && isFullClient && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      {isAr ? 'الخدمات والعمليات الجارية' : 'Active Services & Tasks'}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {isAr ? 'متابعة لحظية لحالة إقراراتك ومعاملاتك المحاسبية' : 'Real-time progress on your VAT, audit, and tax deliverables'}
                    </p>
                  </div>
                </div>

                <ClientServicesList clientId={clientId || undefined} userId={user?.id} />
              </div>
            )}

            {/* ================= 💳 BILLING TAB (Clients Only) ================= */}
            {activeTab === 'billing' && isFullClient && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      {isAr ? 'الفواتير وسندات القبض' : 'Invoices & Receipts'}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {isAr ? 'السجل المالي المعتمد لضريبة القيمة المضافة 5%' : 'VAT compliant tax invoices and confirmed payment receipts'}
                    </p>
                  </div>
                </div>

                <ClientBillingList clientId={clientId || undefined} userId={user?.id} />
              </div>
            )}

            {/* ================= ⭐ CLUB CARD TAB ================= */}
            {activeTab === 'club_card' && memberProfile && (
              <div className="space-y-6 animate-in fade-in duration-300 max-w-lg mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {isAr ? 'بطاقة عضوية نادي ميسرة للأعمال' : 'Maisarah Business Club Pass'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {isAr ? 'بطاقتك الرقمية المعتمدة لحضور الفعاليات والاستفادة من المزايا' : 'Your exclusive digital pass for club access, networking, and perks'}
                  </p>
                </div>

                {/* Digital Card Component */}
                <DigitalClubCard 
                  member={memberProfile}
                  onUpgradeRequest={() => setShowUpgradeModal(true)}
                />

                {/* Referral & Rewards Box */}
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">
                          {isAr ? 'برنامج المكافآت والإحالة' : 'Referral & Loyalty Program'}
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {isAr ? 'ادعُ رواد أعمال واكسب 100 نقطة لكل اشتراك' : 'Earn 100 points for every business friend who joins'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl flex items-center justify-between border border-gray-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">
                        {isAr ? 'رمز الإحالة الخاص بك' : 'YOUR REFERRAL CODE'}
                      </span>
                      <span className="font-mono text-sm font-black text-brand-dark">
                        {memberProfile.referral_code}
                      </span>
                    </div>

                    <button
                      onClick={copyReferral}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 text-gray-800 shadow-xs transition-all"
                    >
                      {copiedReferral ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReferral ? (isAr ? 'تم النسخ' : 'Copied!') : (isAr ? 'نسخ الرمز' : 'Copy Code')}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Support Hotline */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">{isAr ? 'خدمة أعضاء النادي' : 'Club Concierge Hotline'}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{isAr ? 'فريق الاستشارات الضريبية والمحاسبية' : 'Direct advisory assistance for members'}</p>
                    </div>
                    <Phone className="w-5 h-5 text-amber-300" />
                  </div>

                  <a
                    href="https://wa.me/96890000000"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isAr ? 'محادثة فورية عبر واتساب' : 'Chat with Club Concierge'}</span>
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ================= FIXED MOBILE BOTTOM NAVIGATION BAR ================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1 shadow-lg pb-safe">
        <div className="flex justify-around items-center h-14 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ClientNavTab)}
                className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
                  isActive ? 'text-brand-dark font-black' : 'text-gray-400 hover:text-gray-600 font-medium'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-red-50' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-dark' : 'text-gray-400'}`} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">
                  {isAr ? item.labelAr : item.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ================= UPGRADE / CONSULTATION MODAL ================= */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-dark/10 flex items-center justify-center mx-auto text-brand-dark">
              <Sparkles className="w-6 h-6 text-brand-dark" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-gray-900">
                {isAr ? 'ترقية العضوية أو طلب خدمة' : 'Upgrade Membership / Request Service'}
              </h4>
              <p className="text-xs text-gray-500">
                {isAr 
                  ? 'اختر الخدمة الضريبية أو المحاسبية التي ترغب في الاستفادة منها، وسيقوم مستشارنا بالتواصل معك فوراً.' 
                  : 'Connect with a senior tax advisor to upgrade to Silver/Gold VIP and unlock full filing services.'}
              </p>
            </div>

            <div className="space-y-2 text-left rtl:text-right text-xs">
              <a
                href="https://wa.me/96890000000?text=Hello%20Maisarah%2C%20I%20would%20like%20to%20upgrade%20my%20Business%20Club%20tier"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isAr ? 'تواصل عبر واتساب' : 'WhatsApp Club Advisor'}</span>
              </a>

              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-bold transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
