import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ArrowRight,
  Award
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

interface ClubInboundRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
  onRegistered?: (memberData: any) => void;
}

export const ClubInboundRegisterModal: React.FC<ClubInboundRegisterModalProps> = ({
  isOpen,
  onClose,
  referralCode,
  onRegistered
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [primaryInterest, setPrimaryInterest] = useState('Taxation & VAT');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredMember, setRegisteredMember] = useState<{
    membershipNumber: string;
    inviteCode: string;
    shareUrl: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const inviteCode = `MBC-REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const membershipNumber = `MBC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const cleanPhone = phone.replace(/[^0-9]/g, '');

      // 1. Insert into CRM Leads
      const { data: leadData, error: leadErr } = await supabase
        .from('crm_leads')
        .insert({
          contact_name: fullName,
          company_name: companyName,
          phone: cleanPhone,
          email: email.trim().toLowerCase(),
          source: 'business_club_public',
          interested_service: primaryInterest,
          status: 'new',
          priority: 'medium',
          notes: `Public Business Club Inbound Registration. CR: ${crNumber || 'N/A'}. Referred by: ${referralCode || 'Direct Public'}`
        })
        .select()
        .single();

      if (leadErr) console.warn('Lead insert error:', leadErr.message);

      // 2. Insert provisional Business Club Member record
      const { data: memberData, error: memberErr } = await supabase
        .from('business_club_members')
        .insert({
          lead_id: leadData?.id || null,
          membership_number: membershipNumber,
          full_name: fullName,
          company_name: companyName,
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          member_tier: 'community',
          loyalty_points: 100,
          referral_code: inviteCode,
          compliance_health_score: 90,
          status: 'active'
        })
        .select()
        .single();

      if (memberErr) console.warn('Member insert warning:', memberErr.message);

      // 3. Register invite record
      if (leadData?.id) {
        await supabase.from('business_club_invites').insert({
          invite_code: inviteCode,
          target_lead_id: leadData.id,
          channel: 'whatsapp'
        });
      }

      // 4. Log telemetry event
      await supabase.from('lead_activity_logs').insert({
        lead_id: leadData?.id || null,
        event_type: 'club_form_submit',
        source_url: typeof window !== 'undefined' ? window.location.href : '',
        routed_to_role: 'crm_sales',
        metadata: {
          fullName,
          companyName,
          crNumber,
          inviteCode,
          membershipNumber,
          primaryInterest,
          referralCode
        }
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.maisarah.net';
      const shareUrl = `${origin}/business-club?ref=${inviteCode}`;

      const result = {
        membershipNumber,
        inviteCode,
        shareUrl
      };

      setRegisteredMember(result);
      if (onRegistered) onRegistered(result);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while creating your preview pass.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!registeredMember) return;
    navigator.clipboard.writeText(registeredMember.shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!registeredMember) return;
    const shareText = isAr
      ? `أدعوك للانضمام إلى نادي أعمال ميسرة — وصول مباشر إلى تعاميم الضرائب وتحديثات ضريبة القيمة المضافة في سلطنة عمان والاستشارات التنفيذية:\n${registeredMember.shareUrl}`
      : `Join me on the Maisarah Business Club — direct access to Oman tax compliance bulletins, VAT updates, and corporate advisory:\n${registeredMember.shareUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto sm:overflow-hidden bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden max-h-[94vh] sm:max-h-[90vh] flex flex-col animate-scale-up">

        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1.5 bg-gray-300/80 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-brand-dark via-slate-900 to-brand-dark p-4 sm:p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className={`absolute top-3.5 sm:top-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${isAr ? 'left-3.5 sm:left-5' : 'right-3.5 sm:right-5'}`}
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-amber-400 text-brand-dark rounded-lg">
              <Sparkles size={14} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
              {isAr ? 'عضوية تجريبية فورية' : 'VIP Community Pass'}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black tracking-tight pe-10">
            {isAr ? 'التسجيل في نادي أعمال ميسرة' : 'Register for Business Club Access'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isAr
              ? 'احصل على تصريح مجاني للاطلاع على تعاميم الضرائب والندوات التفاعلية واستشارات الامتثال المالي.'
              : 'Unlock complimentary access to regulatory tax bulletins, workshop schedules, and expert advisory.'}
          </p>

          {referralCode && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] text-amber-200 border border-white/15">
              <Award size={12} className="shrink-0" />
              <span>{isAr ? `كود الدعوة الترحيبي: ${referralCode}` : `VIP Invite Code: ${referralCode}`}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {registeredMember ? (
            /* Success State with Digital Community Pass */
            <div className="space-y-4 animate-fade-in text-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h4 className="text-base font-black text-gray-900">
                  {isAr ? 'مرحباً بك في نادي أعمال ميسرة!' : 'Welcome to Maisarah Business Club!'}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {isAr
                    ? 'تم تفعيل تصريح العضوية الخاص بشركتك بنجاح. يمكنك الآن الاطلاع على كافة النشرات وحجز مقاعد الورش.'
                    : 'Your complimentary membership pass is now active. Explore bulletins and reserve workshop seats.'}
                </p>
              </div>

              {/* Digital Pass Card */}
              <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-dark rounded-2xl text-white text-left space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                  <span>MAISARAH BUSINESS CLUB</span>
                  <span className="uppercase px-2 py-0.5 rounded-full bg-white/15 text-white">COMMUNITY TIER</span>
                </div>
                <div>
                  <p className="text-sm font-black text-white">{companyName || fullName}</p>
                  <p className="text-[10px] font-mono text-slate-400 tracking-wider mt-0.5">{registeredMember.membershipNumber}</p>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                  <span>Access: Active (Complimentary)</span>
                  <span className="text-emerald-400 font-bold">100 Loyalty Pts</span>
                </div>
              </div>

              {/* 1-Click WhatsApp Share Bar */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <p className="text-xs font-black text-emerald-900">
                  {isAr ? 'شارك رابط الدعوة الخاص بك عبر الواتساب' : '1-Click WhatsApp Invite Share'}
                </p>
                <p className="text-[11px] text-emerald-700">
                  {isAr ? 'ادعُ شركاء أعمالك للحصول على تحديثات الضرائب والقيمة المضافة' : 'Invite colleagues & partners to access Oman tax bulletins and networking events.'}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <MessageCircle size={15} />
                    <span>{isAr ? 'مشاركة عبر الواتساب' : 'Share on WhatsApp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2.5 px-3 bg-white hover:bg-gray-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedLink ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الرابط' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-brand-dark hover:bg-red-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                {isAr ? 'بدء استعراض النادي والخدمات' : 'Start Exploring Bulletins & Services'}
              </button>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <User size={15} className={`absolute top-3 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
                  <input
                    required
                    type="text"
                    placeholder={isAr ? 'مثال: محمد البلوشي' : 'e.g., Mohammed Al-Balushi'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full py-2.5 min-h-[42px] bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark focus:bg-white transition-all ${
                      isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              {/* Company & CR Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                    {isAr ? 'اسم الشركة / المؤسسة *' : 'Company Name *'}
                  </label>
                  <div className="relative">
                    <Building2 size={15} className={`absolute top-3.5 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
                    <input
                      required
                      type="text"
                      placeholder={isAr ? 'شركة مسقط للحلول' : 'Company LLC'}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={`w-full py-2.5 min-h-[42px] bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark focus:bg-white transition-all ${
                        isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                    {isAr ? 'السجل التجاري (7 أرقام)' : 'CR Number (7-Digits)'}
                  </label>
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="1234567"
                    value={crNumber}
                    onChange={(e) => setCrNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full py-2.5 min-h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-brand-dark focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                    {isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}
                  </label>
                  <div className="relative">
                    <Phone size={15} className={`absolute top-3.5 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
                    <input
                      required
                      type="tel"
                      placeholder="+968 9123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full py-2.5 min-h-[42px] bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-brand-dark focus:bg-white transition-all ${
                        isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                    {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                  </label>
                  <div className="relative">
                    <Mail size={15} className={`absolute top-3.5 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
                    <input
                      required
                      type="email"
                      placeholder="info@company.om"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full py-2.5 min-h-[42px] bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark focus:bg-white transition-all ${
                        isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Primary Interest */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  {isAr ? 'مجال الاهتمام الأساسي' : 'Primary Practice of Interest'}
                </label>
                <select
                  value={primaryInterest}
                  onChange={(e) => setPrimaryInterest(e.target.value)}
                  className="w-full py-2.5 min-h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-dark focus:bg-white transition-all"
                >
                  <option value="Taxation & VAT">{isAr ? 'الضرائب وضريبة القيمة المضافة (OTA)' : 'Taxation & VAT Advisory'}</option>
                  <option value="Statutory Financial Audit">{isAr ? 'التدقيق المالي القانوني السنوي' : 'Statutory Financial Audit'}</option>
                  <option value="Monthly Bookkeeping">{isAr ? 'المحاسبة الشهرية ومسك الدفاتر' : 'Monthly Retainer Bookkeeping'}</option>
                  <option value="Company Formation & CR">{isAr ? 'تأسيس الشركات والسجلات التجارية (استثمر بسهولة)' : 'Company Formation & CR'}</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 min-h-[46px] bg-brand-dark hover:bg-red-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/20 transition-all cursor-pointer active:scale-98"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>{isAr ? 'تفعيل العضوية وتأكيد الدخول' : 'Activate Free Membership Pass'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
