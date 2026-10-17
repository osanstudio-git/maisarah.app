import React, { useState } from 'react';
import {
  X,
  Clock,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Send,
  Building2,
  Calendar,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useWhatsAppRouter } from '../../hooks/useWhatsAppRouter';

export interface CatalogServiceItem {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category: string;
  description_en: string;
  description_ar: string;
  deliverables_en?: string[];
  deliverables_ar?: string[];
  required_docs_en?: string[];
  required_docs_ar?: string[];
  statutory_deadline_en?: string | null;
  statutory_deadline_ar?: string | null;
  governing_authority?: string;
  typical_turnaround?: string;
  starting_price_omr?: number | null;
  icon_name?: string;
  badge_tag?: string | null;
}

interface ServiceDetailModalProps {
  service: CatalogServiceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEngagementInitiated?: (service: CatalogServiceItem) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  isOpen,
  onClose,
  onEngagementInitiated
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user, role } = useAuth();
  const { routeWhatsApp } = useWhatsAppRouter();

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [showEngagementForm, setShowEngagementForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  if (!isOpen || !service) return null;

  const title = isAr ? service.name_ar : service.name_en;
  const description = isAr ? service.description_ar : service.description_en;
  const deliverables = isAr ? (service.deliverables_ar || []) : (service.deliverables_en || []);
  const requiredDocs = isAr ? (service.required_docs_ar || []) : (service.required_docs_en || []);
  const statutoryDeadline = isAr ? service.statutory_deadline_ar : service.statutory_deadline_en;

  // Handle CTA 1: Pre-Sales Enquiry via WhatsApp
  const handlePreSalesEnquiry = () => {
    routeWhatsApp({
      serviceId: service.id,
      serviceName: title,
      mode: 'presales',
      companyName: companyName || user?.user_metadata?.company_name,
      contactName: contactName || user?.user_metadata?.full_name,
      onSuccess: () => {
        // Optional tracking callback
      }
    });
  };

  // Handle CTA 2: Operational Service Request
  const handleOperationalRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);

    try {
      if (role === 'client' && user) {
        // Direct operational dispatch for authenticated paying clients
        await routeWhatsApp({
          serviceId: service.id,
          serviceName: title,
          mode: 'operational',
          companyName: user.user_metadata?.company_name || 'Registered Client',
          contactName: user.user_metadata?.full_name
        });
        if (onEngagementInitiated) {
          onEngagementInitiated(service);
        }
        setRequestSubmitted(true);
      } else {
        // Prospect requesting formal engagement proposal
        await routeWhatsApp({
          serviceId: service.id,
          serviceName: title,
          mode: 'operational',
          companyName: companyName || 'Corporate Client',
          contactName: contactName || 'Authorized Signatory',
          customMessage: `Hello, I would like to initiate formal onboarding and request an official engagement letter for *${title}*.\n\nCompany: ${companyName}\nContact: ${contactName}\nPhone: ${phone}`
        });
        setRequestSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto sm:overflow-hidden bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-white/10 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-slide-up sm:animate-scale-up">

        {/* Header Bar */}
        <div className="bg-gradient-to-br from-slate-950 via-brand-dark to-slate-900 p-4 sm:p-6 text-white relative shrink-0 border-b border-white/10">
          {/* Mobile Pull Handle Indicator inside dark header */}
          <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

          {/* Badges & Close Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 border border-white/20 backdrop-blur-md">
                {service.category.toUpperCase()}
              </span>
              {service.badge_tag && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {service.badge_tag}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shrink-0"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Service Title & Subtitle */}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">{title}</h2>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">{description}</p>

          {/* Micro-Stat Chips Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-white/15 text-[11px]">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{isAr ? 'الجهة الرسمية' : 'Authority'}</p>
              <p className="font-bold text-white flex items-center gap-1.5 mt-0.5 truncate text-xs">
                <Building2 size={13} className="text-amber-400 shrink-0" />
                <span className="truncate">{service.governing_authority || 'Oman Tax Authority'}</span>
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{isAr ? 'المدة التقديرية' : 'Turnaround'}</p>
              <p className="font-bold text-white flex items-center gap-1.5 mt-0.5 text-xs">
                <Clock size={13} className="text-emerald-400 shrink-0" />
                <span>{service.typical_turnaround || '3-5 Business Days'}</span>
              </p>
            </div>

            {service.starting_price_omr ? (
              <div className="bg-gradient-to-br from-amber-500/15 via-red-500/10 to-amber-500/10 border border-amber-400/30 rounded-xl p-2.5 backdrop-blur-sm col-span-2 sm:col-span-1">
                <p className="text-amber-300/80 text-[10px] font-bold uppercase tracking-wider">{isAr ? 'رسوم الاستشارة تبدأ من' : 'Starting From'}</p>
                <p className="font-black text-amber-300 mt-0.5 text-sm">
                  OMR {Number(service.starting_price_omr).toFixed(2)}
                </p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm col-span-2 sm:col-span-1">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{isAr ? 'نوع الخدمة' : 'Service Tier'}</p>
                <p className="font-bold text-emerald-300 text-xs mt-0.5">{isAr ? 'تسعير مخصص' : 'Custom Scope'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="bg-white p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-gray-800 text-xs flex-1">

          {/* Statutory Compliance Deadline Banner */}
          {statutoryDeadline && (
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-amber-50/40 border border-amber-200/90 rounded-2xl flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={16} />
              </div>
              <div>
                <h4 className="font-black text-amber-950 text-xs">
                  {isAr ? 'الموعد النظامي والقانوني للإنجاز' : 'Statutory Compliance Timeline'}
                </h4>
                <p className="text-amber-900/90 text-xs mt-0.5 leading-relaxed font-semibold">
                  {statutoryDeadline}
                </p>
              </div>
            </div>
          )}

          {/* Scope & Deliverables */}
          {deliverables.length > 0 && (
            <div>
              <h3 className="font-black text-xs sm:text-sm text-gray-900 mb-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-brand-dark/10 text-brand-dark flex items-center justify-center">
                  <Sparkles size={12} />
                </span>
                <span>{isAr ? 'نطاق العمل والمخرجات المعتمدة' : 'Service Scope & Key Deliverables'}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {deliverables.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 transition-all">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={13} />
                    </div>
                    <span className="font-bold text-gray-800 leading-snug text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Documents Checklist */}
          {requiredDocs.length > 0 && (
            <div>
              <h3 className="font-black text-xs sm:text-sm text-gray-900 mb-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center">
                  <FileText size={12} />
                </span>
                <span>{isAr ? 'المستندات المطلوبة للبدء' : 'Required Documents & Prerequisite Files'}</span>
              </h3>
              <div className="space-y-2">
                {requiredDocs.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={13} />
                      </div>
                      <span className="font-bold text-gray-800 text-xs truncate">{doc}</span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shrink-0">
                      {isAr ? 'مستند إلزامي' : 'Mandatory'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Form for Unauthenticated / Prospects requesting formal letter */}
          {showEngagementForm && !requestSubmitted && (
            <form onSubmit={handleOperationalRequest} className="p-4 bg-red-50/60 border border-red-200/80 rounded-2xl space-y-3 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-brand-dark text-xs flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brand-dark" />
                  <span>{isAr ? 'طلب بدء إجراءات التعاقد وإصدار خطاب التكليف' : 'Initiate Engagement & Proposal Request'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowEngagementForm(false)}
                  className="text-[11px] font-bold text-gray-400 hover:text-gray-700 underline cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">{isAr ? 'اسم الشركة *' : 'Company Name *'}</label>
                  <input
                    required
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={isAr ? 'شركة مسقط للحلول...' : 'Company LLC'}
                    className="w-full p-2.5 min-h-[42px] bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">{isAr ? 'المسؤول / المفوض *' : 'Contact Person *'}</label>
                  <input
                    required
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={isAr ? 'سالم العامري' : 'Salim Al-Amri'}
                    className="w-full p-2.5 min-h-[42px] bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">{isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+968 9123 4567"
                  className="w-full p-2.5 min-h-[42px] bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 min-h-[46px] bg-brand-dark hover:bg-red-800 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
              >
                <Send size={14} />
                <span>{submitting ? (isAr ? 'جاري التحويل...' : 'Connecting...') : (isAr ? 'إرسال الطلب وحجز الخدمة عبر الواتساب' : 'Submit & Connect on WhatsApp')}</span>
              </button>
            </form>
          )}

          {requestSubmitted && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{isAr ? 'تم فتح المحادثة وتسجيل الطلب بنجاح لدى فريق العمليات!' : 'Request initiated and connected to our Operations Desk on WhatsApp!'}</span>
            </div>
          )}
        </div>

        {/* Footer Actions — DUAL CTA TRIGGERS (Sticky Side-by-Side at Bottom on Mobile) */}
        <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 sticky bottom-0 z-20 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] flex items-center gap-2 shrink-0">
          
          {/* CTA 1: Pre-Sales Enquiry via WhatsApp */}
          <button
            type="button"
            onClick={handlePreSalesEnquiry}
            className="flex-1 py-3 px-3 sm:px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 min-h-[46px]"
            title={isAr ? 'استفسار عبر الواتساب' : 'Enquire via WhatsApp'}
          >
            <MessageCircle size={16} className="text-emerald-600 shrink-0" />
            <span className="truncate">{isAr ? 'استفسار واتساب' : 'Enquire (WhatsApp)'}</span>
          </button>

          {/* CTA 2: Formal Service Request / Engagement */}
          <button
            type="button"
            onClick={() => {
              if (role === 'client' && user) {
                handleOperationalRequest();
              } else {
                setShowEngagementForm(!showEngagementForm);
              }
            }}
            className="flex-1.2 py-3 px-4 bg-gradient-to-r from-red-600 to-brand-dark hover:from-red-500 hover:to-red-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-dark/20 transition-all cursor-pointer active:scale-95 min-h-[46px]"
          >
            <ShieldCheck size={16} className="text-amber-300 shrink-0" />
            <span className="truncate">{isAr ? 'طلب بدء الخدمة' : 'Request Engagement'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
