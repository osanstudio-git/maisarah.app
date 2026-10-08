import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
  Users, Plus, Search, Phone, MessageCircle, Building2, MapPin,
  TrendingUp, Award, Calendar, CheckCircle2, Clock, DollarSign,
  ChevronRight, ArrowLeft, RefreshCw, Send, Sparkles, Filter,
  FileSpreadsheet, Target, ShieldCheck, Compass, Navigation,
  HelpCircle, ExternalLink, Bookmark, Check, X, AlertCircle
} from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';

interface SalesLead {
  id: string;
  contact_name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  source: string;
  interested_service: string;
  department_id: string;
  estimated_value: number;
  status: 'new' | 'contacted' | 'quoted' | 'accepted' | 'rejected' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string | null;
  created_at: string;
}

interface VisitRecord {
  id: string;
  client_name: string;
  location: string;
  purpose: string;
  outcome: string;
  follow_up_date: string;
  created_at: string;
}

const SERVICE_RATE_CARD = [
  {
    id: 'vat_return',
    nameEn: 'VAT Quarterly Filing & Audit Review',
    nameAr: 'إقرار وضريبة القيمة المضافة الربعي',
    dept: 'tax',
    priceOMR: '50 - 150',
    turnaround: '2-3 Days',
    docs: 'Tax invoices, sales/purchase ledger, bank statements'
  },
  {
    id: 'statutory_audit',
    nameEn: 'Annual Statutory Financial Audit',
    nameAr: 'التدقيق المالي السنوي القانوني المعتمد',
    dept: 'audit',
    priceOMR: '300 - 900',
    turnaround: '7-14 Days',
    docs: 'Trial balance, general ledger, previous audit report'
  },
  {
    id: 'cr_formation',
    nameEn: 'New Commercial Registration (CR)',
    nameAr: 'تأسيس سجل تجاري جديد وشركة',
    dept: 'legal',
    priceOMR: '100 - 250',
    turnaround: '3-5 Days',
    docs: 'Passport copies, partner names, proposed business activities'
  },
  {
    id: 'bookkeeping_monthly',
    nameEn: 'Monthly Retainer Bookkeeping',
    nameAr: 'مسك الدفاتر والمحاسبة الشهرية',
    dept: 'accounting',
    priceOMR: '80 - 200 /mo',
    turnaround: 'Ongoing',
    docs: 'Monthly receipts, bank statements, petty cash sheets'
  },
  {
    id: 'corporate_tax',
    nameEn: 'Corporate Income Tax Assessment',
    nameAr: 'الإقرار الضريبي السنوي لضريبة الدخل',
    dept: 'tax',
    priceOMR: '150 - 400',
    turnaround: '4-7 Days',
    docs: 'Audited financials, tax portal login credentials'
  },
  {
    id: 'pro_visa',
    nameEn: 'PRO & Investor Visa Processing',
    nameAr: 'معاملات سند وتأشيرات المستثمرين',
    dept: 'pro',
    priceOMR: '40 - 100',
    turnaround: '1-3 Days',
    docs: 'CR copy, Chamber certificate, applicant passport'
  }
];

export default function FieldSalesPortal() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  // Navigation State
  const [activeTab, setActiveTab] = useState<'leads' | 'capture' | 'visits' | 'rates' | 'targets'>('leads');

  // Data State
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fast Lead Form State
  const [leadForm, setLeadForm] = useState({
    contact_name: '',
    company_name: '',
    cr_number: '',
    phone: '',
    interested_service: SERVICE_RATE_CARD[0].nameEn,
    department_id: SERVICE_RATE_CARD[0].dept,
    estimated_value: '150',
    priority: 'high' as 'low' | 'medium' | 'high' | 'urgent',
    meeting_location: '',
    notes: ''
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  // Visit Form State
  const [visitForm, setVisitForm] = useState({
    client_name: '',
    location: '',
    purpose: 'New Service Pitch',
    outcome: 'Interested - Requesting Quotation',
    follow_up_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  });
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);

  // Rate Card Search
  const [rateSearch, setRateSearch] = useState('');

  // Rep Display Info
  const repName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isAr ? 'مندوب المبيعات' : 'Sales Representative');

  // Fetch Leads for this rep
  const fetchSalesData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLeads(data as SalesLead[]);
      }

      // Load visits from local store cache
      const savedVisits = localStorage.getItem('maisarah_field_visits');
      if (savedVisits) {
        try {
          setVisits(JSON.parse(savedVisits));
        } catch { }
      }
    } catch (err: any) {
      console.warn('Field Sales fetch notice:', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Handle GPS Auto Location
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locString = `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Muscat)`;
          setLeadForm(prev => ({ ...prev, meeting_location: locString }));
          setVisitForm(prev => ({ ...prev, location: locString }));
        },
        () => {
          setLeadForm(prev => ({ ...prev, meeting_location: 'Muscat, Oman' }));
        }
      );
    } else {
      setLeadForm(prev => ({ ...prev, meeting_location: 'Muscat, Oman' }));
    }
  };

  // Submit Fast Lead Capture (10-second capture)
  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.contact_name.trim()) return;

    setIsCapturing(true);
    try {
      const fullNotes = [
        leadForm.cr_number ? `CR Number: ${leadForm.cr_number}` : '',
        leadForm.meeting_location ? `Location: ${leadForm.meeting_location}` : '',
        leadForm.notes ? `Field Note: ${leadForm.notes}` : ''
      ].filter(Boolean).join(' | ');

      const { data, error } = await supabase
        .from('crm_leads')
        .insert([{
          contact_name: leadForm.contact_name.trim(),
          company_name: leadForm.company_name.trim() || null,
          phone: leadForm.phone.trim() || null,
          source: 'Field Sales',
          interested_service: leadForm.interested_service,
          department_id: leadForm.department_id,
          estimated_value: Number(leadForm.estimated_value) || 0,
          status: 'new',
          priority: leadForm.priority,
          assigned_to: user?.id || null,
          notes: fullNotes || 'Captured via Mobile Field Sales Portal'
        }])
        .select()
        .single();

      if (error) throw error;

      // Broadcast notification to CRM & Manager
      await supabase.from('notifications').insert([{
        sender_id: user?.id || null,
        recipient_role: 'manager',
        title: isAr ? 'فرصة بيع ميدانية جديدة' : 'New Field Sales Lead Captured',
        message: isAr
          ? `سجّل ${repName} فرصة جديدة: "${leadForm.contact_name}" (${leadForm.company_name || 'شركة'}). القيمة المتوقعة: OMR ${leadForm.estimated_value}.`
          : `${repName} captured a new field lead: "${leadForm.contact_name}" (${leadForm.company_name || 'Client'}). Est: OMR ${leadForm.estimated_value}.`,
        type: 'general'
      }]);

      setCaptureSuccess(true);
      setLeadForm({
        contact_name: '',
        company_name: '',
        cr_number: '',
        phone: '',
        interested_service: SERVICE_RATE_CARD[0].nameEn,
        department_id: SERVICE_RATE_CARD[0].dept,
        estimated_value: '150',
        priority: 'high',
        meeting_location: '',
        notes: ''
      });

      fetchSalesData(true);
      setTimeout(() => {
        setCaptureSuccess(false);
        setActiveTab('leads');
      }, 1500);

    } catch (err: any) {
      alert(err.message || 'Error saving lead');
    } finally {
      setIsCapturing(false);
    }
  };

  // Log Visit
  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitForm.client_name.trim()) return;

    const newVisit: VisitRecord = {
      id: `v-${Date.now()}`,
      client_name: visitForm.client_name,
      location: visitForm.location || 'Client Office',
      purpose: visitForm.purpose,
      outcome: visitForm.outcome,
      follow_up_date: visitForm.follow_up_date,
      created_at: new Date().toISOString()
    };

    const updated = [newVisit, ...visits];
    setVisits(updated);
    localStorage.setItem('maisarah_field_visits', JSON.stringify(updated));

    setVisitForm({
      client_name: '',
      location: '',
      purpose: 'New Service Pitch',
      outcome: 'Interested - Requesting Quotation',
      follow_up_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
    });
    setShowVisitModal(false);
  };

  // Open WhatsApp directly
  const handleOpenWhatsApp = (phoneStr?: string | null, clientName?: string) => {
    if (!phoneStr) return;
    const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      isAr
        ? `مرحباً ${clientName || 'عزيزي العميل'}، تحياتنا من شركة ميسرة لخدمات تدقيق الحسابات والضرائب. يسعدنا متابعة طلبكم.`
        : `Hello ${clientName || 'Client'}, greetings from Maisarah Audit & Tax. We are following up regarding your requested services.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch =
        l.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone?.includes(searchQuery);
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Target Metrics Calculations
  const metrics = useMemo(() => {
    const totalLeadsCount = leads.length;
    const wonLeads = leads.filter(l => l.status === 'accepted');
    const pipelineValue = leads.reduce((acc, curr) => acc + (Number(curr.estimated_value) || 0), 0);
    const wonValue = wonLeads.reduce((acc, curr) => acc + (Number(curr.estimated_value) || 0), 0);
    const monthlyTargetOMR = 3000;
    const targetProgress = Math.min(100, Math.round((wonValue / monthlyTargetOMR) * 100));
    const estimatedCommission = Number((wonValue * 0.08).toFixed(3)); // 8% commission model

    return {
      totalLeadsCount,
      wonCount: wonLeads.length,
      pipelineValue,
      wonValue,
      monthlyTargetOMR,
      targetProgress,
      estimatedCommission
    };
  }, [leads]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Sticky Mobile Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-xs">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-dark to-red-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-brand-dark/20">
              {repName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-gray-900 leading-tight">{repName}</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isAr ? 'المبيعات الميدانية • ميسرة' : 'Field Sales Specialist'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => fetchSalesData()}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-all active:scale-95"
              title={isAr ? 'تحديث البيانات' : 'Refresh'}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Mobile Container ───────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── Quick Stat Card ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-dark rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                {isAr ? 'الهدف الشهري المحقق' : 'Monthly Closed Won'}
              </span>
              <div className="text-2xl font-black mt-0.5 tracking-tight flex items-baseline gap-1">
                <span>OMR {metrics.wonValue.toFixed(3)}</span>
                <span className="text-[11px] text-slate-400 font-medium">/ {metrics.monthlyTargetOMR}</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-1">
                {isAr ? `العمولة المتوقعة: OMR ${metrics.estimatedCommission}` : `Est. Commission: OMR ${metrics.estimatedCommission}`}
              </p>
            </div>

            {/* Circular Progress Indicator */}
            <div className="relative w-14 h-14 flex items-center justify-center bg-white/10 rounded-full border-2 border-emerald-400 shrink-0">
              <span className="text-xs font-black text-emerald-300">{metrics.targetProgress}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.targetProgress}%` }}
            />
          </div>
        </div>

        {/* ── TAB 1: LEADS LIST ────────────────────────────────────────────── */}
        {activeTab === 'leads' && (
          <div className="space-y-3">

            {/* Search & Filter Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className={`absolute top-3 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالاسم، الشركة، الهاتف...' : 'Search leads, company, phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark transition-all shadow-xs ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-brand-dark shadow-xs"
              >
                <option value="all">{isAr ? 'الكل' : 'All'}</option>
                <option value="new">{isAr ? 'جديدة' : 'New'}</option>
                <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                <option value="quoted">{isAr ? 'تم العرض' : 'Quoted'}</option>
                <option value="accepted">{isAr ? 'مقبولة (Won)' : 'Accepted'}</option>
              </select>
            </div>

            {/* Quick Hero Add Button */}
            <button
              onClick={() => setActiveTab('capture')}
              className="w-full py-3.5 bg-brand-dark hover:bg-red-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/25 active:scale-98 transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>{isAr ? '+ إضافة فرصة جديدة (10 ثوانٍ)' : '+ Quick Add Lead (10s)'}</span>
            </button>

            {/* Leads Cards */}
            <div className="space-y-2.5">
              {loading ? (
                <div className="py-12 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand-dark border-t-transparent animate-spin" /></div>
              ) : filteredLeads.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">{isAr ? 'لا توجد فرص مطابقة' : 'No matching leads found'}</p>
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const isWon = lead.status === 'accepted';
                  return (
                    <div
                      key={lead.id}
                      className="bg-white border border-gray-200/90 hover:border-brand-dark/40 rounded-3xl p-4 shadow-xs hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-black text-xs text-gray-900 truncate">{lead.contact_name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isWon ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                              {lead.status}
                            </span>
                          </div>
                          {lead.company_name && (
                            <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                              <Building2 size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate">{lead.company_name}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-end shrink-0">
                          <span className="text-xs font-black text-brand-dark">OMR {Number(lead.estimated_value || 0).toFixed(0)}</span>
                          <p className="text-[9px] text-gray-400 font-bold">{new Date(lead.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>

                      {/* Service Tag */}
                      <div className="flex items-center gap-1.5 text-[10px] font-bold bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl">
                        <Sparkles size={11} className="text-amber-500 shrink-0" />
                        <span className="truncate">{lead.interested_service}</span>
                      </div>

                      {/* Action Bar (1-Click Call & WhatsApp) */}
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                        {lead.phone ? (
                          <>
                            <a
                              href={`tel:${lead.phone}`}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Phone size={13} className="text-slate-600" />
                              <span>{isAr ? 'اتصال' : 'Call'}</span>
                            </a>

                            <button
                              onClick={() => handleOpenWhatsApp(lead.phone, lead.contact_name)}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all shadow-xs"
                            >
                              <MessageCircle size={13} />
                              <span>WhatsApp</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium py-1">
                            {isAr ? 'لا يوجد رقم هاتف مسجل' : 'No phone number'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: FAST LEAD CAPTURE (10-SECOND FORM) ────────────────────── */}
        {activeTab === 'capture' && (
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-brand-dark rounded-xl font-black">
                  <Plus size={18} />
                </div>
                <div>
                  <h2 className="font-black text-sm text-gray-900">{isAr ? 'تسجيل فرصة عميل جديدة' : 'Quick Lead Capture'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'مزامنة فورية مع CRM والمدير' : 'Instant CRM & Manager Sync'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDetectLocation}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all"
                title={isAr ? 'تحديد الموقع الحالي' : 'Auto GPS Location'}
              >
                <Navigation size={12} className="text-brand-dark" />
                <span>GPS</span>
              </button>
            </div>

            {captureSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-2 animate-fade-in">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{isAr ? 'تم حفظ الفرصة بنجاح وإرسال التنبيه للمدير!' : 'Lead captured & synced to CRM successfully!'}</span>
              </div>
            )}

            <form onSubmit={handleCaptureSubmit} className="space-y-3.5">

              {/* Contact Name */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                  {isAr ? 'اسم العميل / المسؤول *' : 'Contact Person Name *'}
                </label>
                <input
                  required
                  type="text"
                  placeholder={isAr ? 'مثال: سالم العامري' : 'e.g., Salim Al-Amri'}
                  value={leadForm.contact_name}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark focus:bg-white transition-all"
                />
              </div>

              {/* Company & 7-Digit CR */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    {isAr ? 'اسم الشركة / المؤسسة' : 'Company Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مؤسسة مسقط للحلول' : 'Company LLC'}
                    value={leadForm.company_name}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, company_name: e.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    {isAr ? 'السجل التجاري (7 أرقام)' : 'CR Number (7-Digits)'}
                  </label>
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="1234567"
                    value={leadForm.cr_number}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, cr_number: e.target.value.replace(/[^0-9]/g, '') }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold outline-none focus:border-brand-dark focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Phone & WhatsApp */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                  {isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}
                </label>
                <div className="relative">
                  <Phone size={14} className={`absolute top-3.5 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
                  <input
                    required
                    type="tel"
                    placeholder="+968 9123 4567"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold outline-none focus:border-brand-dark focus:bg-white transition-all ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                  />
                </div>
              </div>

              {/* Service & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    {isAr ? 'الخدمة المطلوبة' : 'Interested Service'}
                  </label>
                  <select
                    value={leadForm.interested_service}
                    onChange={(e) => {
                      const selected = SERVICE_RATE_CARD.find(s => s.nameEn === e.target.value);
                      setLeadForm(prev => ({
                        ...prev,
                        interested_service: e.target.value,
                        department_id: selected?.dept || 'audit'
                      }));
                    }}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark focus:bg-white transition-all"
                  >
                    {SERVICE_RATE_CARD.map(s => (
                      <option key={s.id} value={s.nameEn}>
                        {isAr ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    {isAr ? 'القيمة المتوقعة (OMR)' : 'Estimated Value (OMR)'}
                  </label>
                  <input
                    type="number"
                    value={leadForm.estimated_value}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, estimated_value: e.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Location & Quick Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                  {isAr ? 'ملاحظة المقابلة / الموقع' : 'Meeting Location & Quick Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'العميل مهتم بالتوقيع الأسبوع القادم، تم اللقاء في مجمع السيب...' : 'Client needs quick audit report before month end...'}
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium outline-none focus:border-brand-dark focus:bg-white resize-none transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isCapturing}
                className="w-full py-4 bg-brand-dark hover:bg-red-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-dark/20 transition-all cursor-pointer"
              >
                {isCapturing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={15} />
                    <span>{isAr ? 'حفظ وإرسال إلى CRM فوراً' : 'Save & Sync to CRM Now'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 3: VISITS & SITE CHECK-INS ──────────────────────────────── */}
        {activeTab === 'visits' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-sm text-gray-900">{isAr ? 'سجل الزيارات الميدانية' : 'Client Visits Log'}</h2>
                <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'توثيق نتائج المقابلات' : 'Field check-ins & outcomes'}</p>
              </div>

              <button
                onClick={() => setShowVisitModal(true)}
                className="px-3 py-2 bg-brand-dark text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>{isAr ? 'تسجيل زيارة' : 'Log Visit'}</span>
              </button>
            </div>

            {/* Visit Modal */}
            {showVisitModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl animate-scale-up">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="font-black text-xs text-gray-900">{isAr ? 'تسجيل زيارة عميل جديدة' : 'Record Client Visit'}</h3>
                    <button onClick={() => setShowVisitModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>

                  <form onSubmit={handleSaveVisit} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">{isAr ? 'اسم العميل / الشركة' : 'Client / Company'}</label>
                      <input
                        required
                        type="text"
                        value={visitForm.client_name}
                        onChange={(e) => setVisitForm(prev => ({ ...prev, client_name: e.target.value }))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">{isAr ? 'الموقع' : 'Location'}</label>
                      <input
                        type="text"
                        placeholder="Muscat, Al Khuwair..."
                        value={visitForm.location}
                        onChange={(e) => setVisitForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">{isAr ? 'نتيجة المقابلة' : 'Meeting Outcome'}</label>
                      <select
                        value={visitForm.outcome}
                        onChange={(e) => setVisitForm(prev => ({ ...prev, outcome: e.target.value }))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="Interested - Requesting Quotation">{isAr ? 'مهتم - بانتظار عرض سعر' : 'Interested - Needs Quote'}</option>
                        <option value="Follow-up Meeting Scheduled">{isAr ? 'تحديد موعد متابعة قادم' : 'Follow-up Scheduled'}</option>
                        <option value="Deal Closed Won">{isAr ? 'تم إغلاق الصفقة بنجاح' : 'Deal Closed Won'}</option>
                        <option value="Not Interested Currently">{isAr ? 'غير مهتم حالياً' : 'Not Interested'}</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-brand-dark text-white rounded-xl font-black text-xs uppercase"
                    >
                      {isAr ? 'حفظ الزيارة' : 'Save Visit'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Visits List */}
            <div className="space-y-2">
              {visits.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 text-gray-400 text-xs font-bold">
                  {isAr ? 'لا توجد زيارات مسجلة اليوم' : 'No visits recorded yet today'}
                </div>
              ) : (
                visits.map(v => (
                  <div key={v.id} className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs text-gray-900">{v.client_name}</h4>
                      <span className="text-[10px] font-bold text-gray-400">{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                      <MapPin size={11} className="text-brand-dark shrink-0" />
                      <span>{v.location}</span>
                    </p>
                    <div className="text-[10px] font-black bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg">
                      {v.outcome}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: RATE CARD / SERVICE CATALOG ──────────────────────────── */}
        {activeTab === 'rates' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className={`absolute top-3 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث في دليل الخدمات والأسعار...' : 'Search services rate card...'}
                value={rateSearch}
                onChange={(e) => setRateSearch(e.target.value)}
                className={`w-full py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark shadow-xs ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                  }`}
              />
            </div>

            <div className="space-y-2.5">
              {SERVICE_RATE_CARD
                .filter(s => s.nameEn.toLowerCase().includes(rateSearch.toLowerCase()) || s.nameAr.includes(rateSearch))
                .map(srv => (
                  <div key={srv.id} className="bg-white border border-gray-200 rounded-3xl p-4 shadow-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-xs text-gray-900">{isAr ? srv.nameAr : srv.nameEn}</h3>
                        <span className="text-[9px] font-black uppercase text-brand-dark tracking-wider">{srv.dept} Department</span>
                      </div>
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs font-black">
                        OMR {srv.priceOMR}
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-500 font-medium space-y-0.5 pt-1 border-t border-gray-100">
                      <p>⏱️ <span className="font-bold">{isAr ? 'المدة التقديرية:' : 'Turnaround:'}</span> {srv.turnaround}</p>
                      <p>📋 <span className="font-bold">{isAr ? 'المستندات المطلوبة:' : 'Req. Docs:'}</span> {srv.docs}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: MY TARGETS & COMMISSIONS ──────────────────────────────── */}
        {activeTab === 'targets' && (
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
              <h2 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <Target className="text-brand-dark" size={18} />
                <span>{isAr ? 'أداء المبيعات والعمولات' : 'Sales Target & Commission'}</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{isAr ? 'إجمالي الفرص' : 'Total Leads'}</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{metrics.totalLeadsCount}</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">{isAr ? 'الصفقات المغلقة' : 'Won Deals'}</p>
                  <p className="text-xl font-black text-emerald-700 mt-1">{metrics.wonCount}</p>
                </div>

                <div className="p-3 bg-blue-50 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-blue-600 uppercase">{isAr ? 'قيمة الأنبوب' : 'Pipeline OMR'}</p>
                  <p className="text-base font-black text-blue-800 mt-1">{metrics.pipelineValue.toFixed(0)}</p>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-amber-600 uppercase">{isAr ? 'العمولة المتوقعة' : 'Commission OMR'}</p>
                  <p className="text-base font-black text-amber-800 mt-1">{metrics.estimatedCommission.toFixed(3)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Mobile Bottom Navigation Bar (App Experience) ─────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-3 py-2 shadow-lg">
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1">

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${activeTab === 'leads' ? 'text-brand-dark font-black scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Users size={18} />
            <span className="text-[9px] mt-1">{isAr ? 'الفرص' : 'Leads'}</span>
          </button>

          <button
            onClick={() => setActiveTab('capture')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${activeTab === 'capture' ? 'text-brand-dark font-black scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <div className="p-1 bg-brand-dark text-white rounded-lg shadow-sm">
              <Plus size={16} />
            </div>
            <span className="text-[9px] mt-0.5">{isAr ? 'إضافة' : 'Capture'}</span>
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${activeTab === 'visits' ? 'text-brand-dark font-black scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <MapPin size={18} />
            <span className="text-[9px] mt-1">{isAr ? 'الزيارات' : 'Visits'}</span>
          </button>

          <button
            onClick={() => setActiveTab('rates')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${activeTab === 'rates' ? 'text-brand-dark font-black scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Bookmark size={18} />
            <span className="text-[9px] mt-1">{isAr ? 'الأسعار' : 'Rates'}</span>
          </button>

          <button
            onClick={() => setActiveTab('targets')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${activeTab === 'targets' ? 'text-brand-dark font-black scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Target size={18} />
            <span className="text-[9px] mt-1">{isAr ? 'الهدف' : 'Target'}</span>
          </button>

        </div>
      </nav>

    </div>
  );
}
