import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  Send,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  Mail,
  User,
  Building2,
  Sparkles
} from 'lucide-react';
import { provisionClientOrMemberAuth, type ProvisionResult } from '../../utils/clientAuthProvisioner';

export interface PortalAccessTarget {
  id: string; // client id or lead id
  type: 'client' | 'lead';
  name: string;
  companyName?: string | null;
  email: string;
  phone?: string | null;
  portalAccessSent?: boolean;
  membershipNumber?: string;
  memberTier?: 'community' | 'silver' | 'gold' | 'platinum';
}

interface PortalAccessCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PortalAccessTarget | null;
  onSuccess?: (result: {
    targetId: string;
    temporaryPassword: string;
    membershipNumber: string;
    emailSent: boolean;
  }) => void;
}

export const PortalAccessCredentialModal: React.FC<PortalAccessCredentialModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [emailInput, setEmailInput] = useState('');
  const [tier, setTier] = useState<'community' | 'silver' | 'gold' | 'platinum'>('community');
  const [sendEmailImmediately, setSendEmailImmediately] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setEmailInput(target.email || '');
      setTier(target.memberTier || (target.type === 'client' ? 'silver' : 'community'));
      setProvisionResult(null);
      setErrorMsg(null);
      setCopied(false);
    }
  }, [target, isOpen]);

  if (!isOpen || !target) return null;

  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://maisarah.om/login';

  const handleExecuteProvision = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني للعميل' : 'Client email is required');
      return;
    }

    setIsProvisioning(true);
    setErrorMsg(null);

    try {
      const res = await provisionClientOrMemberAuth({
        email: cleanEmail,
        fullName: target.name,
        companyName: target.companyName || target.name,
        phone: target.phone || '',
        clientType: target.type === 'client' ? 'client' : 'club_member',
        memberTier: tier,
        clientId: target.type === 'client' ? target.id : undefined,
        leadId: target.type === 'lead' ? target.id : undefined
      });

      if (!res.success) {
        throw new Error(res.error || 'Provisioning failed');
      }

      setProvisionResult(res);

      if (onSuccess && res.temporaryPassword && res.membershipNumber) {
        onSuccess({
          targetId: target.id,
          temporaryPassword: res.temporaryPassword,
          membershipNumber: res.membershipNumber,
          emailSent: res.emailSent
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر إنشاء حساب الدخول' : 'Failed to provision portal account'));
    } finally {
      setIsProvisioning(false);
    }
  };

  const getCredentialsCopyText = () => {
    if (!provisionResult) return '';
    const tempPass = provisionResult.temporaryPassword || '—';
    const memberNum = provisionResult.membershipNumber || '—';

    return isAr
      ? `🏛️ *بيانات دخول بوابة ميسرة الذكية ونادي الأعمال*
العميل: ${target.name} ${target.companyName ? `(${target.companyName})` : ''}
رقم العضوية: ${memberNum}
رابط الدخول: ${portalUrl}
البريد الإلكتروني: ${emailInput.trim()}
كلمة المرور المؤقتة: ${tempPass}

⚠️ يرجى تسجيل الدخول وتغيير كلمة المرور لضمان أمان حسابك.`
      : `🏛️ *Maisarah Client Portal & Business Club Access*
Client: ${target.name} ${target.companyName ? `(${target.companyName})` : ''}
Membership ID: ${memberNum}
Portal Login: ${portalUrl}
Username / Email: ${emailInput.trim()}
Temporary Password: ${tempPass}

⚠️ Please login and change your temporary password upon first access.`;
  };

  const handleCopyCredentials = () => {
    const text = getCredentialsCopyText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const rawPhone = target.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('968') ? cleanPhone : cleanPhone ? `968${cleanPhone}` : '';
    const msg = getCredentialsCopyText();
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden my-8"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50/80 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#A11212]/10 text-[#A11212] flex items-center justify-center font-black shadow-xs">
              <KeyRound size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 leading-tight">
                {isAr ? 'بيانات دخول بوابة العميل' : 'Client Portal Access'}
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {target.companyName || target.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200/80 rounded-full transition-colors text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content */}
        {!provisionResult ? (
          /* Step 1: Confirm & Send Form */
          <form onSubmit={handleExecuteProvision} className="p-6 space-y-5">
            {/* Target Client Card */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                  {isAr ? 'العميل المستفيد' : 'Target Recipient'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-[#A11212]">
                  {target.type === 'client' ? (isAr ? 'عميل نشط' : 'Client') : (isAr ? 'فرصة محتملة' : 'Lead')}
                </span>
              </div>
              <p className="text-sm font-black text-gray-900">{target.name}</p>
              {target.companyName && (
                <p className="text-xs text-gray-600 flex items-center gap-1.5 font-bold">
                  <Building2 size={13} className="text-gray-400" />
                  {target.companyName}
                </p>
              )}
              {target.phone && (
                <p className="text-xs text-gray-500 font-mono">
                  📞 {target.phone}
                </p>
              )}
            </div>

            {/* Email Address (Editable to fix typos before send) */}
            <div>
              <label className="block text-[11px] font-black text-gray-700 uppercase mb-1.5 flex items-center gap-1">
                <Mail size={13} className="text-gray-500" />
                {isAr ? 'البريد الإلكتروني للدخول (Login Email) *' : 'Login Email Address *'}
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="client@company.om"
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212] focus:ring-2 focus:ring-[#A11212]/10 transition-all font-mono"
              />
              <span className="block text-[10px] text-gray-400 font-medium mt-1">
                {isAr ? 'سيتم إرسال بيانات الدخول وكلمة المرور المؤقتة إلى هذا البريد.' : 'Credentials & digital card will be dispatched to this address.'}
              </span>
            </div>

            {/* Membership Tier */}
            <div>
              <label className="block text-[11px] font-black text-gray-700 uppercase mb-1.5">
                {isAr ? 'فئة العضوية بنادي ميسرة للأعمال' : 'Business Club Tier'}
              </label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value as any)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#A11212]"
              >
                <option value="community">{isAr ? 'عضوية المجتمع المجانية (Community)' : 'Community Free Card'}</option>
                <option value="silver">{isAr ? 'العضوية الفضية (Silver Retainer)' : 'Silver Member'}</option>
                <option value="gold">{isAr ? 'العضوية الذهبية (Gold Corporate)' : 'Gold Executive'}</option>
                <option value="platinum">{isAr ? 'العضوية البلاتينية (Platinum VIP)' : 'Platinum Elite'}</option>
              </select>
            </div>

            {/* Auto send toggle */}
            <div className="flex items-center gap-2.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70">
              <input
                type="checkbox"
                id="sendEmailCheck"
                checked={sendEmailImmediately}
                onChange={e => setSendEmailImmediately(e.target.checked)}
                className="w-4 h-4 text-[#A11212] accent-[#A11212] rounded cursor-pointer"
              />
              <label htmlFor="sendEmailCheck" className="text-xs font-bold text-amber-900 cursor-pointer select-none">
                {isAr ? 'إرسال بريد الترحيب وبيانات الدخول فوراً عبر Resend' : 'Send Welcome Email with credentials immediately via Resend'}
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isProvisioning}
                className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-[#A11212]/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProvisioning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{isAr ? 'جاري تفعيل الحساب...' : 'Provisioning...'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>{isAr ? 'تفعيل وإرسال بيانات الدخول' : 'Send Portal Access Now'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Provisioned Success Card with WhatsApp & Copy Handover */
          <div className="p-6 space-y-5 animate-in fade-in duration-300">
            {/* Green Badge Status Banner */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-200/80 text-emerald-900">
                    {isAr ? '✓ مفعل وتم الإرسال' : '✓ Portal Access Active & Sent'}
                  </span>
                  {provisionResult.emailSent && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Mail size={11} /> {isAr ? 'تم الإرسال للبريد' : 'Email Sent'}
                    </span>
                  )}
                </div>
                <p className="text-xs font-black text-emerald-950 mt-1">
                  {isAr ? 'تم إنشاء الحساب وبطاقة الدخول بنجاح!' : 'Login account & digital access ready!'}
                </p>
              </div>
            </div>

            {/* Credential Card Display */}
            <div className="bg-gray-900 text-white p-5 rounded-2xl border border-gray-800 space-y-3 font-mono shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <span className="text-[10px] uppercase font-sans font-bold text-gray-400">
                  {isAr ? 'بيانات دخول البوابة (Portal Credentials)' : 'Portal Credentials'}
                </span>
                <span className="text-[10px] font-black text-amber-400 font-sans">
                  {provisionResult.membershipNumber}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-800/80">
                  <span className="text-gray-400 font-sans">{isAr ? 'رابط الدخول:' : 'Portal URL:'}</span>
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-300 hover:text-white flex items-center gap-1 font-bold"
                  >
                    {portalUrl} <ExternalLink size={11} />
                  </a>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-800/80">
                  <span className="text-gray-400 font-sans">{isAr ? 'البريد الإلكتروني:' : 'Login Email:'}</span>
                  <span className="text-white font-bold">{emailInput.trim()}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400 font-sans">{isAr ? 'كلمة المرور المؤقتة:' : 'Temp Password:'}</span>
                  <span className="bg-gray-800 px-2 py-0.5 rounded text-amber-300 font-black tracking-wider text-sm">
                    {provisionResult.temporaryPassword || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fallback & Communication Buttons */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1-Tap Copy */}
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className={`py-3 px-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                    copied
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-xs'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ البيانات' : 'Copy Details')}</span>
                </button>

                {/* WhatsApp Handover */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>{isAr ? 'إرسال بالواتساب' : 'WhatsApp Share'}</span>
                </button>
              </div>

              {/* Resend button */}
              <button
                type="button"
                onClick={() => handleExecuteProvision()}
                disabled={isProvisioning}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={isProvisioning ? 'animate-spin' : ''} />
                <span>{isAr ? 'إعادة إرسال البريد الإلكتروني' : 'Resend Email to Client'}</span>
              </button>
            </div>

            {/* Footer close */}
            <div className="pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-black text-xs uppercase transition-colors"
              >
                {isAr ? 'تم والإغلاق' : 'Done & Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalAccessCredentialModal;
