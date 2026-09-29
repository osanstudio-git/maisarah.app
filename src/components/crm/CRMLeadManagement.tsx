import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
  Users, Plus, Search, Filter, Phone, Mail, Building2, Tag,
  Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, RefreshCw,
  Layers, ChevronDown, Edit2, Trash2, DollarSign, Calendar, ArrowRight,
  ShieldCheck, AlertTriangle, Sparkles, UserPlus, FileText, Send, Check, X,
  Briefcase, CheckSquare, UserCheck, Key, Copy, Award
} from 'lucide-react';
import { provisionClientOrMemberAuth, type ProvisionResult } from '../../utils/clientAuthProvisioner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'accepted' | 'rejected' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface CRMLead {
  id: string;
  contact_name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  source: string;
  interested_service: string;
  department_id: string;
  estimated_value: number;
  status: LeadStatus;
  priority: LeadPriority;
  assigned_to?: string | null;
  converted_client_id?: string | null;
  converted_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  assigned_profile?: { full_name: string; email: string } | null;
}

export interface QuotationRecord {
  id: string;
  quotation_number: string;
  lead_id: string;
  client_id?: string | null;
  title: string;
  service_details?: string | null;
  department_id: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  status: QuotationStatus;
  valid_until?: string | null;
  terms_conditions?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

const formatOMR = (val: number) =>
  new Intl.NumberFormat('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val || 0);

const SERVICE_OPTIONS = [
  { id: 'vat_filing', en: 'VAT Return Filing & Compliance', ar: 'إقرارات وضريبة القيمة المضافة', dept: 'tax' },
  { id: 'statutory_audit', en: 'Statutory Financial Audit', ar: 'تدقيق ومراجعة الحسابات القانونية', dept: 'audit' },
  { id: 'corporate_tax', en: 'Corporate Income Tax Assessment', ar: 'ضريبة الدخل على الشركات', dept: 'tax' },
  { id: 'bookkeeping', en: 'Monthly Accounting & Bookkeeping', ar: 'مسك الدفاتر والمحاسبة الشهرية', dept: 'accounting' },
  { id: 'company_formation', en: 'Commercial Registration & CR Formation', ar: 'تأسيس الشركات والسجل التجاري', dept: 'legal' },
  { id: 'business_advisory', en: 'Feasibility Study & Financial Advisory', ar: 'دراسات الجدوى والاستشارات المالية', dept: 'advisory' },
  { id: 'tax_appeal', en: 'Tax Appeals & Dispute Resolution', ar: 'الاعتراضات والنزاعات الضريبية', dept: 'tax' }
];

const DEPARTMENTS = [
  { id: 'audit', en: 'Audit & Assurance', ar: 'التدقيق والمراجعة' },
  { id: 'tax', en: 'Tax & Zakat', ar: 'الضرائب والزكاة' },
  { id: 'accounting', en: 'Accounting & Payroll', ar: 'المحاسبة والرواتب' },
  { id: 'legal', en: 'Corporate Legal', ar: 'الشؤون القانونية' },
  { id: 'advisory', en: 'Business Advisory', ar: 'الاستشارات المالية' }
];

const SOURCES = [
  { id: 'direct', en: 'Direct Contact / Walk-in', ar: 'تواصل مباشر / زيارة' },
  { id: 'referral', en: 'Client Referral', ar: 'توصية من عميل' },
  { id: 'website', en: 'Online Website Portal', ar: 'الموقع الإلكتروني' },
  { id: 'phone', en: 'Phone Inquiry', ar: 'استفسار هاتفي' },
  { id: 'social', en: 'Social Media & LinkedIn', ar: 'وسائل التواصل و لينكد إن' },
  { id: 'campaign', en: 'Marketing Campaign', ar: 'حملة تسويقية' }
];

const COLUMNS: { id: LeadStatus; labelEn: string; labelAr: string; color: string; border: string; bg: string }[] = [
  { id: 'new', labelEn: 'New Leads', labelAr: 'فرص جديدة', color: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50/60' },
  { id: 'contacted', labelEn: 'Contacted', labelAr: 'تم التواصل', color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50/60' },
  { id: 'quoted', labelEn: 'Quoted', labelAr: 'تم تقديم عرض', color: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50/60' },
  { id: 'accepted', labelEn: 'Accepted', labelAr: 'تم القبول', color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50/60' },
  { id: 'rejected', labelEn: 'Rejected / Lost', labelAr: 'مرفوضة / ملغاة', color: 'text-red-700', border: 'border-red-200', bg: 'bg-red-50/60' }
];

export default function CRMLeadManagement() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [quotationsMap, setQuotationsMap] = useState<Record<string, QuotationRecord>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Add Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [leadForm, setLeadForm] = useState({
    contact_name: '',
    company_name: '',
    phone: '',
    email: '',
    source: 'direct',
    interested_service: 'Statutory Financial Audit',
    department_id: 'audit',
    estimated_value: '',
    priority: 'medium' as LeadPriority,
    notes: ''
  });

  // Quotation Modal State
  const [selectedLeadForQuote, setSelectedLeadForQuote] = useState<CRMLead | null>(null);
  const [activeQuotation, setActiveQuotation] = useState<QuotationRecord | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    title: '',
    service_details: '',
    subtotal: 0,
    vat_rate: 5,
    vat_amount: 0,
    total_amount: 0,
    valid_until: '',
    terms_conditions: '',
    status: 'draft' as QuotationStatus
  });

  // Step 2 Provisioning State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [selectedLeadForProvision, setSelectedLeadForProvision] = useState<CRMLead | null>(null);
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionTier, setProvisionTier] = useState<'community' | 'silver' | 'gold' | 'platinum'>('community');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // ── Fetch Leads & Linked Quotations ───────────────────────────────────────
  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [leadsRes, quotesRes] = await Promise.all([
        supabase
          .from('crm_leads')
          .select(`
            id, contact_name, company_name, phone, email, source,
            interested_service, department_id, estimated_value, status,
            priority, assigned_to, converted_client_id, converted_at,
            notes, created_at, updated_at,
            assigned_profile:profiles!assigned_to ( full_name, email )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('quotations')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (leadsRes.data) {
        setLeads(leadsRes.data as any);
      }

      if (quotesRes.data) {
        const qMap: Record<string, QuotationRecord> = {};
        quotesRes.data.forEach((q: any) => {
          if (q.lead_id) qMap[q.lead_id] = q;
        });
        setQuotationsMap(qMap);
      }
    } catch (err: any) {
      console.warn('Error fetching CRM data:', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();

    // Supabase Realtime Subscriptions for crm_leads, quotations, business_club_members
    const channel = supabase
      .channel('crm-leads-and-quotes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => fetchLeads(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotations' }, () => fetchLeads(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_club_members' }, () => fetchLeads(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  // ── Idempotent Quotation Auto-Draft Generation ─────────────────────────────
  const ensureDraftQuotationForLead = async (lead: CRMLead) => {
    try {
      const { data: existingQuote, error: checkErr } = await supabase
        .from('quotations')
        .select('*')
        .eq('lead_id', lead.id)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existingQuote) {
        setQuotationsMap(prev => ({ ...prev, [lead.id]: existingQuote as QuotationRecord }));
        return existingQuote as QuotationRecord;
      }

      const subtotal = Number(lead.estimated_value) || 0;
      const vatRate = 5;
      const vatAmount = Number(((subtotal * vatRate) / 100).toFixed(3));
      const totalAmount = Number((subtotal + vatAmount).toFixed(3));
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const quotationNumber = `QT-${new Date().getFullYear()}-${randomSuffix}`;
      const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const defaultDetails = `Engagement for ${lead.interested_service} as requested by ${lead.company_name || lead.contact_name}.`;
      const defaultTerms = isAr
        ? '1. الأسعار المذكورة بالريال العماني وخاضعة لضريبة القيمة المضافة 5%.\n2. الدفع: 50% دفعة مقدمة عند بدء العمل و 50% عند الإنجاز والتسليم.\n3. هذا العرض صالح لمدة 30 يوماً من تاريخ إصداره.'
        : '1. All prices are in OMR and subject to 5% VAT.\n2. Payment terms: 50% upon engagement, 50% upon deliverable completion.\n3. Quotation valid for 30 calendar days from issue date.';

      const { data: newQuote, error: insertErr } = await supabase
        .from('quotations')
        .insert([{
          quotation_number: quotationNumber,
          lead_id: lead.id,
          client_id: lead.converted_client_id || null,
          title: lead.interested_service || 'Professional Advisory & Services',
          service_details: defaultDetails,
          department_id: lead.department_id || 'audit',
          subtotal: subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          currency: 'OMR',
          status: 'draft',
          valid_until: validUntil,
          terms_conditions: defaultTerms,
          created_by: user?.id || null
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      const createdRecord = newQuote as QuotationRecord;
      setQuotationsMap(prev => ({ ...prev, [lead.id]: createdRecord }));
      return createdRecord;
    } catch (err: any) {
      console.error('Error generating quotation:', err.message);
      throw err;
    }
  };

  // ── STEP 4: CONVERSION TO CLIENT, TASK GENERATION & HOD ROUTING ────────────
  const executeConversionToClientAndTask = async (
    lead: CRMLead,
    quote: QuotationRecord,
    overrides?: {
      title?: string;
      service_details?: string;
      total_amount?: number;
      department_id?: string;
      valid_until?: string;
    }
  ) => {
    const finalTitle = overrides?.title || quote.title || lead.interested_service;
    const finalDetails = overrides?.service_details || quote.service_details || `Engagement for ${finalTitle}`;
    const finalBudget = overrides?.total_amount || quote.total_amount || lead.estimated_value;
    const finalDept = overrides?.department_id || lead.department_id || quote.department_id || 'audit';
    const finalDueDate = overrides?.valid_until || quote.valid_until || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const companyOrContactName = lead.company_name || lead.contact_name;

    try {
      let clientId = lead.converted_client_id;

      // 1. Idempotency Check & Client Creation
      if (!clientId) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .or(`company_name.eq."${companyOrContactName}",email.eq."${lead.email || ''}"`)
          .maybeSingle();

        if (existingClient?.id) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert([{
              company_name: companyOrContactName,
              contact_person: lead.contact_name,
              email: lead.email || null,
              phone: lead.phone || null,
              compliance_status: 'active'
            }])
            .select('id')
            .single();

          if (clientErr) throw clientErr;
          clientId = newClient.id;
        }

        await supabase
          .from('crm_leads')
          .update({
            converted_client_id: clientId,
            converted_at: new Date().toISOString(),
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);
      }

      // 2. Update Quotation status & link client_id
      await supabase
        .from('quotations')
        .update({
          client_id: clientId,
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      // 3. Generate Service Deliverable Task
      const { data: existingTask } = await supabase
        .from('services')
        .select('id')
        .eq('client_id', clientId)
        .eq('title', finalTitle)
        .maybeSingle();

      let createdServiceId: string | null = existingTask?.id || null;

      if (!existingTask) {
        const { data: newService, error: serviceErr } = await supabase
          .from('services')
          .insert([{
            client_id: clientId,
            title: finalTitle,
            description: finalDetails,
            budget: Number(finalBudget) || 0,
            department_id: finalDept,
            status: 'pending',
            priority: lead.priority || 'medium',
            due_date: finalDueDate,
            employee_id: null
          }])
          .select('id')
          .single();

        if (serviceErr) throw serviceErr;
        createdServiceId = newService.id;
      }

      // 4. HOD Realtime Routing & Notification
      const deptConfig = DEPARTMENTS.find(d => d.id === finalDept);
      const deptLabel = isAr ? (deptConfig?.ar || finalDept) : (deptConfig?.en || finalDept);

      await supabase.from('notifications').insert([{
        sender_id: user?.id || null,
        recipient_role: 'department_head',
        service_id: createdServiceId,
        title: isAr ? `مهمة عميل جديدة بانتظار الإسناد (${deptLabel})` : `New Client Task Pending Delegation (${deptLabel})`,
        message: isAr
          ? `تم اعتماد العقد وعرض السعر للعميل "${companyOrContactName}" بقيمة OMR ${formatOMR(finalBudget)}. تم توجيه المهمة إلى رئيس قسم (${deptLabel}) لإسنادها للموظف المختص.`
          : `Quotation accepted for "${companyOrContactName}" (OMR ${formatOMR(finalBudget)}). Deliverable is ready for HOD (${deptLabel}) staff assignment.`,
        type: 'task_started'
      }]);

      setToast({
        show: true,
        title: isAr ? 'تم التحويل إلى عميل وتوجيه المهمة لرئيس القسم' : 'Lead Converted & Routed to HOD',
        message: isAr
          ? `تم إنشاء حساب العميل (${companyOrContactName}) وإدراج المهمة في طابور رئيس قسم (${deptLabel}) بنجاح.`
          : `Created client (${companyOrContactName}) and routed deliverable to the ${deptLabel} HOD delegation queue.`,
        type: 'success'
      });

      fetchLeads(true);
    } catch (err: any) {
      console.error('Conversion error:', err);
      setToast({
        show: true,
        title: isAr ? 'خطأ في عملية التحويل' : 'Conversion Error',
        message: err.message || 'Failed to complete client conversion and routing',
        type: 'error'
      });
    }
  };

  // ── Phase 4 Step 2: Open Provision Portal Access Modal ────────────────────
  const handleOpenProvisionModal = (lead: CRMLead) => {
    setSelectedLeadForProvision(lead);
    setProvisionEmail(lead.email || '');
    setProvisionTier(lead.status === 'accepted' ? 'silver' : 'community');
    setProvisionResult(null);
    setIsProvisionModalOpen(true);
  };

  const handleExecuteProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForProvision) return;

    if (!provisionEmail.trim()) {
      setProvisionResult({ success: false, emailSent: false, error: isAr ? 'يرجى إدخال البريد الإلكتروني' : 'Email is required' });
      return;
    }

    setIsProvisioning(true);
    try {
      const res = await provisionClientOrMemberAuth({
        email: provisionEmail.trim(),
        fullName: selectedLeadForProvision.contact_name,
        companyName: selectedLeadForProvision.company_name,
        phone: selectedLeadForProvision.phone,
        clientType: selectedLeadForProvision.status === 'accepted' ? 'client' : 'club_member',
        memberTier: provisionTier,
        clientId: selectedLeadForProvision.converted_client_id,
        leadId: selectedLeadForProvision.id
      });

      setProvisionResult(res);

      if (res.success) {
        setToast({
          show: true,
          title: isAr ? 'تم تفعيل العضوية وبوابة العميل' : 'Portal Access & Club Membership Active',
          message: isAr
            ? `تم تفعيل حساب (${res.membershipNumber}) وإرسال بيانات الدخول إلى البريد الإلكتروني.`
            : `Activated ${res.membershipNumber} and dispatched credentials via email.`,
          type: 'success'
        });
        fetchLeads(true);
      }
    } catch (err: any) {
      setProvisionResult({ success: false, emailSent: false, error: err.message || 'Provisioning error' });
    } finally {
      setIsProvisioning(false);
    }
  };

  // ── Update Lead Status ────────────────────────────────────────────────────
  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l));

    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      if (newStatus === 'quoted') {
        const quote = await ensureDraftQuotationForLead(targetLead);
        setToast({
          show: true,
          title: isAr ? 'تم إنشاء مسودة عرض السعر تلقائياً' : 'Draft Quotation Auto-Generated',
          message: isAr
            ? `تم إنشاء مسودة عرض السعر (${quote.quotation_number}) بقيمة OMR ${formatOMR(quote.total_amount)}.`
            : `Draft proposal (${quote.quotation_number}) generated with total OMR ${formatOMR(quote.total_amount)}.`,
          type: 'success'
        });
        return;
      }

      if (newStatus === 'accepted') {
        let quote = quotationsMap[targetLead.id];
        if (!quote) {
          quote = await ensureDraftQuotationForLead(targetLead);
        }
        await executeConversionToClientAndTask(targetLead, quote);
        return;
      }

      setToast({
        show: true,
        title: isAr ? 'تم تحديث الحالة' : 'Status Updated',
        message: isAr ? `تم نقل الفرصة إلى مرحلة ${newStatus}` : `Lead shifted to ${newStatus}`,
        type: 'success'
      });
    } catch (err: any) {
      fetchLeads(true);
      setToast({
        show: true,
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || 'Could not update lead status',
        type: 'error'
      });
    }
  };

  // ── Open View/Edit Quotation Modal ─────────────────────────────────────────
  const handleOpenQuotationModal = async (lead: CRMLead) => {
    setSelectedLeadForQuote(lead);
    let quote = quotationsMap[lead.id];

    if (!quote) {
      try {
        quote = await ensureDraftQuotationForLead(lead);
      } catch { }
    }

    if (quote) {
      setActiveQuotation(quote);
      setQuoteForm({
        title: quote.title,
        service_details: quote.service_details || '',
        subtotal: quote.subtotal,
        vat_rate: quote.vat_rate || 5,
        vat_amount: quote.vat_amount || 0,
        total_amount: quote.total_amount || 0,
        valid_until: quote.valid_until || '',
        terms_conditions: quote.terms_conditions || '',
        status: quote.status
      });
    }

    setIsQuoteModalOpen(true);
  };

  // ── Save Quotation Modifications ──────────────────────────────────────────
  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuotation || !selectedLeadForQuote) return;

    setIsSavingQuote(true);
    try {
      const subtotalNum = Number(quoteForm.subtotal) || 0;
      const vatRateNum = Number(quoteForm.vat_rate) || 5;
      const vatAmountNum = Number(((subtotalNum * vatRateNum) / 100).toFixed(3));
      const totalAmountNum = Number((subtotalNum + vatAmountNum).toFixed(3));

      const { error: quoteErr } = await supabase
        .from('quotations')
        .update({
          title: quoteForm.title,
          service_details: quoteForm.service_details,
          subtotal: subtotalNum,
          vat_rate: vatRateNum,
          vat_amount: vatAmountNum,
          total_amount: totalAmountNum,
          valid_until: quoteForm.valid_until || null,
          terms_conditions: quoteForm.terms_conditions,
          status: quoteForm.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeQuotation.id);

      if (quoteErr) throw quoteErr;

      if (subtotalNum !== selectedLeadForQuote.estimated_value) {
        await supabase
          .from('crm_leads')
          .update({ estimated_value: subtotalNum, updated_at: new Date().toISOString() })
          .eq('id', selectedLeadForQuote.id);
      }

      if (quoteForm.status === 'accepted') {
        await executeConversionToClientAndTask(selectedLeadForQuote, activeQuotation, {
          title: quoteForm.title,
          service_details: quoteForm.service_details,
          total_amount: totalAmountNum,
          department_id: selectedLeadForQuote.department_id,
          valid_until: quoteForm.valid_until
        });
      } else {
        setToast({
          show: true,
          title: isAr ? 'تم حفظ عرض السعر' : 'Quotation Updated',
          message: isAr
            ? `تم تحديث عرض السعر (${activeQuotation.quotation_number}) بنجاح.`
            : `Quotation (${activeQuotation.quotation_number}) details saved successfully.`,
          type: 'success'
        });
      }

      setIsQuoteModalOpen(false);
      fetchLeads(true);
    } catch (err: any) {
      setToast({
        show: true,
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || 'Failed to update quotation',
        type: 'error'
      });
    } finally {
      setIsSavingQuote(false);
    }
  };

  // ── Create New Lead ────────────────────────────────────────────────────────
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!leadForm.contact_name.trim()) {
      setFormError(isAr ? 'يرجى إدخال اسم جهة الاتصال' : 'Contact name is required');
      return;
    }
    if (!leadForm.phone.trim() && !leadForm.email.trim()) {
      setFormError(isAr ? 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني' : 'Provide at least phone or email');
      return;
    }

    setIsSubmitting(true);
    try {
      const numericBudget = parseFloat(leadForm.estimated_value) || 0;

      const { data, error } = await supabase
        .from('crm_leads')
        .insert([{
          contact_name: leadForm.contact_name.trim(),
          company_name: leadForm.company_name.trim() || null,
          phone: leadForm.phone.trim() || null,
          email: leadForm.email.trim() || null,
          source: leadForm.source,
          interested_service: leadForm.interested_service,
          department_id: leadForm.department_id,
          estimated_value: numericBudget,
          priority: leadForm.priority,
          status: 'new',
          assigned_to: user?.id || null,
          notes: leadForm.notes.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      setIsAddModalOpen(false);
      setLeadForm({
        contact_name: '',
        company_name: '',
        phone: '',
        email: '',
        source: 'direct',
        interested_service: 'Statutory Financial Audit',
        department_id: 'audit',
        estimated_value: '',
        priority: 'medium',
        notes: ''
      });

      setToast({
        show: true,
        title: isAr ? 'تمت إضافة الفرصة بنجاح' : 'Lead Created Successfully',
        message: isAr ? 'تم تسجيل الفرصة في خط الأنابيب (CRM Leads).' : 'Lead has been logged into the CRM pipeline.',
        type: 'success'
      });

      fetchLeads(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Filtered Leads ─────────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const q = searchQuery.toLowerCase();
      const matchesQuery = !searchQuery ||
        l.contact_name.toLowerCase().includes(q) ||
        (l.company_name && l.company_name.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        l.interested_service.toLowerCase().includes(q);

      const matchesDept = departmentFilter === 'all' || l.department_id === departmentFilter;
      const matchesPriority = priorityFilter === 'all' || l.priority === priorityFilter;

      return matchesQuery && matchesDept && matchesPriority;
    });
  }, [leads, searchQuery, departmentFilter, priorityFilter]);

  // ── Stats Summary ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter(l => l.status === 'new').length;
    const activePipeline = leads.filter(l => l.status === 'contacted' || l.status === 'quoted').length;
    const acceptedCount = leads.filter(l => l.status === 'accepted').length;
    const totalPipelineValue = leads
      .filter(l => l.status !== 'rejected' && l.status !== 'lost')
      .reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);

    return { total, newCount, activePipeline, acceptedCount, totalPipelineValue };
  }, [leads]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Toast Alert ─────────────────────────────────────────────────── */}
      {toast.show && (
        <div className={`fixed top-6 end-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success'
            ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/30'
            : 'bg-red-900/95 text-red-100 border-red-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0" /> : <AlertCircle size={20} className="text-red-400 shrink-0" />}
          <div>
            <p className="text-xs font-black uppercase tracking-wider">{toast.title}</p>
            <p className="text-xs font-semibold mt-0.5 text-white/90">{toast.message}</p>
          </div>
        </div>
      )}

      {/* ── Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white to-gray-50/80 p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#A11212]/10 text-[#A11212] text-[10px] font-black uppercase tracking-widest rounded-full">
                {isAr ? 'إدارة العملاء المحتملين والتحويل' : 'CRM Leads & Conversion Hub'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <ShieldCheck size={14} />
                {isAr ? 'التحويل المباشر وتفعيل نادي الأعمال' : 'Business Club & Portal Active'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {isAr ? 'خط أنابيب الفرص وبوابة الأعضاء' : 'Lead Pipeline & Member Provisioning'}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
              {isAr
                ? 'تابع استفسارات العملاء، أنشئ عروض الأسعار التلقائية، وادعُ العملاء المحتملين إلى نادي ميسرة للأعمال مع إرسال بطاقة العضوية الرقمية وبيانات الدخول عبر البريد الإلكتروني.'
                : 'Track prospect inquiries, auto-generate quotations, and provision client portal credentials & Business Club digital membership cards with welcome emails.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLeads()}
              className="p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl border border-gray-200 shadow-xs transition-colors"
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-[#A11212] hover:bg-[#850e0e] text-white px-5 py-3 rounded-2xl font-black text-xs shadow-md shadow-[#A11212]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              <span>{isAr ? 'إضافة فرصة جديدة' : 'Add New Lead'}</span>
            </button>
          </div>
        </div>

        {/* Pipeline KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {isAr ? 'الفرص الجديدة' : 'New Inquiries'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-blue-800">{stats.newCount}</p>
              <span className="text-[11px] font-bold text-gray-400">{isAr ? 'قيد المعاينة' : 'Uncontacted'}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">
              {isAr ? 'عروض الأسعار والتفاوض' : 'Quoted & Negotiation'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-purple-800">{stats.activePipeline}</p>
              <span className="text-[11px] font-bold text-purple-600">{isAr ? 'عروض جاهزة' : 'Proposals Active'}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              {isAr ? 'العملاء المحولون (مقبول)' : 'Converted Clients'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-emerald-700">{stats.acceptedCount}</p>
              <span className="text-[11px] font-bold text-emerald-600">
                {stats.total > 0 ? `${Math.round((stats.acceptedCount / stats.total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              {isAr ? 'قيمة خط الأنابيب' : 'Total Pipeline Value'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-amber-700">OMR {formatOMR(stats.totalPipelineValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم أو الشركة أو الخدمة...' : 'Search lead, company, service...'}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-10 pe-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#A11212]"
          >
            <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{isAr ? d.ar : d.en}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#A11212]"
          >
            <option value="all">{isAr ? 'جميع الأولويات' : 'All Priorities'}</option>
            <option value="urgent">{isAr ? 'عاجل جداً' : 'Urgent'}</option>
            <option value="high">{isAr ? 'عالية' : 'High'}</option>
            <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
            <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {isAr ? 'لوحة كانبان' : 'Kanban'}
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {isAr ? 'جدول البيانات' : 'Table'}
            </button>
          </div>
        </div>
      </div>

      {/* ── KANBAN BOARD VIEW ────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colLeads = filteredLeads.filter(l => l.status === col.id);
            const colTotalValue = colLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);

            return (
              <div
                key={col.id}
                className={`rounded-3xl border ${col.border} ${col.bg} p-4 min-h-[500px] flex flex-col`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      col.id === 'new' ? 'bg-blue-500' :
                      col.id === 'contacted' ? 'bg-amber-500' :
                      col.id === 'quoted' ? 'bg-purple-500' :
                      col.id === 'accepted' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></span>
                    <h3 className={`font-black text-xs uppercase tracking-wider ${col.color}`}>
                      {isAr ? col.labelAr : col.labelEn}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white text-gray-800 text-[10px] font-black border border-gray-200">
                    {colLeads.length}
                  </span>
                </div>

                {colTotalValue > 0 && (
                  <p className="text-[10px] font-mono font-bold text-gray-500 mb-3">
                    OMR {formatOMR(colTotalValue)}
                  </p>
                )}

                {/* Column Lead Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                  {colLeads.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl">
                      <p className="text-[11px] font-bold text-gray-400">{isAr ? 'لا توجد فرص هنا' : 'No leads in stage'}</p>
                    </div>
                  ) : (
                    colLeads.map(lead => {
                      const linkedQuote = quotationsMap[lead.id];
                      const isQuotedOrAccepted = lead.status === 'quoted' || lead.status === 'accepted' || !!linkedQuote;
                      const isConverted = !!lead.converted_client_id || lead.status === 'accepted';

                      return (
                        <div
                          key={lead.id}
                          className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-gray-300 transition-all space-y-3 group"
                        >
                          {/* Header: Title & Priority */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-xs text-gray-900 group-hover:text-[#A11212] transition-colors">
                                {lead.contact_name}
                              </h4>
                              {lead.company_name && (
                                <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Building2 size={12} className="text-gray-400" />
                                  <span>{lead.company_name}</span>
                                </p>
                              )}
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              lead.priority === 'urgent' ? 'bg-red-100 text-red-700 animate-pulse' :
                              lead.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                              lead.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {lead.priority}
                            </span>
                          </div>

                          {/* Service & Budget Chip */}
                          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs space-y-1">
                            <div className="flex items-center gap-1 font-bold text-gray-800 text-[11px]">
                              <Tag size={12} className="text-[#A11212] shrink-0" />
                              <span className="truncate">{lead.interested_service}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <span className="uppercase font-bold">{lead.department_id}</span>
                              <span className="font-mono font-black text-emerald-700 text-xs">
                                OMR {formatOMR(lead.estimated_value)}
                              </span>
                            </div>
                          </div>

                          {/* Contact Quick Info */}
                          <div className="space-y-1 text-[11px] text-gray-600 font-semibold">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-[#A11212] truncate">
                                <Phone size={11} className="text-gray-400 shrink-0" />
                                <span>{lead.phone}</span>
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-[#A11212] truncate">
                                <Mail size={11} className="text-gray-400 shrink-0" />
                                <span>{lead.email}</span>
                              </a>
                            )}
                          </div>

                          {/* Converted Badge */}
                          {isConverted && (
                            <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-200 text-[10px] font-bold flex items-center gap-1.5">
                              <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                              <span>{isAr ? 'تم التحويل لعميل وتوجيه المهمة لـ HOD' : 'Converted & Routed to HOD'}</span>
                            </div>
                          )}

                          {/* Notes Preview */}
                          {lead.notes && (
                            <p className="text-[10px] text-gray-500 bg-amber-50/50 p-2 rounded-lg border border-amber-100/50 line-clamp-2">
                              {lead.notes}
                            </p>
                          )}

                          {/* STEP 3 QUOTATION UI ACTION */}
                          {isQuotedOrAccepted && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuotationModal(lead)}
                              className="w-full flex items-center justify-between gap-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 px-3 py-2 rounded-xl text-xs font-black transition-all shadow-2xs hover:scale-[1.01]"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <FileText size={13} className="text-purple-700 shrink-0" />
                                <span className="truncate">{isAr ? 'عرض وتعديل عرض السعر' : 'View / Edit Quotation'}</span>
                              </div>
                              {linkedQuote && (
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                  linkedQuote.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                                  linkedQuote.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-purple-200 text-purple-900'
                                }`}>
                                  {linkedQuote.status}
                                </span>
                              )}
                            </button>
                          )}

                          {/* STEP 2: PROVISION PORTAL ACCESS / CLUB INVITE ACTION */}
                          <button
                            type="button"
                            onClick={() => handleOpenProvisionModal(lead)}
                            className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-50 to-amber-50 hover:from-red-100 hover:to-amber-100 text-brand-dark border border-red-200/80 px-3 py-2 rounded-xl text-xs font-black transition-all shadow-xs"
                          >
                            <UserCheck size={14} className="text-[#A11212]" />
                            <span>
                              {lead.status === 'accepted' 
                                ? (isAr ? 'تفعيل بوابة العميل' : 'Provision Client Portal')
                                : (isAr ? 'دعوة نادي الأعمال (Free Card)' : 'Send Business Club Invite')}
                            </span>
                          </button>

                          {/* Status Shift Selector */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-gray-400">
                              {isAr ? 'نقل الحالة:' : 'Move to:'}
                            </span>
                            <select
                              value={lead.status}
                              onChange={e => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black text-gray-700 focus:outline-none focus:border-[#A11212]"
                            >
                              <option value="new">{isAr ? 'جديدة' : 'New'}</option>
                              <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                              <option value="quoted">{isAr ? 'عرض سعر (توليد تلقائي)' : 'Quoted (Auto-Draft)'}</option>
                              <option value="accepted">{isAr ? 'مقبول (تحويل لعميل ومهمة)' : 'Accepted (Convert to Client & Task)'}</option>
                              <option value="rejected">{isAr ? 'مرفوض' : 'Rejected'}</option>
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'جهة الاتصال والشركة' : 'Contact & Entity'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الخدمة المستهدفة' : 'Target Service'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'القسم' : 'Department'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الميزانية المتوقعة' : 'Estimated Value'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الأولوية' : 'Priority'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3.5 px-4 text-end">{isAr ? 'الإجراءات وبطاقة النادي' : 'Actions & Provisioning'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-bold">{isAr ? 'لا توجد فرص تطابق خيارات البحث' : 'No leads found'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const linkedQuote = quotationsMap[lead.id];
                    const isQuotedOrAccepted = lead.status === 'quoted' || lead.status === 'accepted' || !!linkedQuote;
                    const isConverted = !!lead.converted_client_id || lead.status === 'accepted';

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-black text-gray-900">{lead.contact_name}</div>
                          {lead.company_name && <div className="text-[11px] text-gray-500 font-medium">{lead.company_name}</div>}
                          <div className="text-[10px] text-gray-400 mt-0.5">{lead.phone || lead.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-gray-800">{lead.interested_service}</span>
                          <div className="text-[10px] text-gray-400 capitalize">{lead.source}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] font-black uppercase">
                            {lead.department_id}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono font-black text-emerald-700">
                          OMR {formatOMR(lead.estimated_value)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            lead.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            lead.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                            lead.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              lead.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                              lead.status === 'quoted' ? 'bg-purple-100 text-purple-800' :
                              lead.status === 'contacted' ? 'bg-amber-100 text-amber-800' :
                              lead.status === 'new' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {lead.status}
                            </span>
                            {isConverted && <ShieldCheck size={14} className="text-emerald-600 shrink-0" title="Converted to Client" />}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-end space-x-2 space-x-reverse">
                          <button
                            type="button"
                            onClick={() => handleOpenProvisionModal(lead)}
                            className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-[#A11212] border border-red-200 px-3 py-1.5 rounded-xl text-xs font-black transition-colors"
                          >
                            <UserCheck size={12} />
                            <span>{isAr ? 'دعوة النادي' : 'Club Invite'}</span>
                          </button>

                          {isQuotedOrAccepted && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuotationModal(lead)}
                              className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-black transition-colors"
                            >
                              <FileText size={12} />
                              <span>{isAr ? 'عرض السعر' : 'Quotation'}</span>
                            </button>
                          )}
                          <select
                            value={lead.status}
                            onChange={e => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-black text-gray-700 focus:outline-none focus:border-[#A11212]"
                          >
                            <option value="new">{isAr ? 'جديدة' : 'New'}</option>
                            <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                            <option value="quoted">{isAr ? 'عرض سعر' : 'Quoted'}</option>
                            <option value="accepted">{isAr ? 'مقبول (تحويل)' : 'Accepted (Convert)'}</option>
                            <option value="rejected">{isAr ? 'مرفوض' : 'Rejected'}</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: PROVISION PORTAL ACCESS & CLUB INVITE (PHASE 4 STEP 2) ─── */}
      {isProvisionModalOpen && selectedLeadForProvision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden my-8" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#A11212] text-white flex items-center justify-center font-black shadow-md shadow-[#A11212]/20">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {isAr ? 'تفعيل بوابة العميل وبطاقة نادي ميسرة' : 'Provision Portal & Business Club Card'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedLeadForProvision.contact_name} {selectedLeadForProvision.company_name ? `• ${selectedLeadForProvision.company_name}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteProvision} className="p-6 space-y-4">
              {/* Success Result Box */}
              {provisionResult?.success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-emerald-900">
                  <div className="flex items-center gap-2 font-black text-xs">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>{isAr ? 'تم تفعيل العضوية وإرسال البريد بنجاح!' : 'Member Account & Card Activated!'}</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl text-xs space-y-1 font-semibold border border-emerald-200/50">
                    <p><strong>{isAr ? 'رقم العضوية:' : 'Membership ID:'}</strong> <span className="font-mono text-[#A11212] font-black">{provisionResult.membershipNumber}</span></p>
                    <p><strong>{isAr ? 'كلمة المرور المؤقتة:' : 'Temp Password:'}</strong> <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded font-bold">{provisionResult.temporaryPassword}</span></p>
                    <p><strong>{isAr ? 'حالة الإرسال:' : 'Email Status:'}</strong> {provisionResult.emailSent ? (isAr ? 'تم إرسال بريد الترحيب بنجاح ✅' : 'Welcome Email Dispatched via Resend ✅') : (isAr ? 'جاهز (محاكاة محلية)' : 'Ready (Mock fallback)')}</p>
                  </div>
                </div>
              )}

              {provisionResult?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{provisionResult.error}</span>
                </div>
              )}

              {/* Recipient Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'البريد الإلكتروني المستلم *' : 'Recipient Email Address *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={provisionEmail}
                    onChange={e => setProvisionEmail(e.target.value)}
                    placeholder="client@company.om"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'فئة العضوية (Membership Tier)' : 'Membership Tier'}
                  </label>
                  <select
                    value={provisionTier}
                    onChange={e => setProvisionTier(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  >
                    <option value="community">{isAr ? 'مجانية - عضو المجتمع (Community Free Member)' : 'Community Free Member (Leads)'}</option>
                    <option value="silver">{isAr ? 'فضية (Silver Client Member)' : 'Silver Client Member'}</option>
                    <option value="gold">{isAr ? 'ذهبية تنفيذية (Gold Executive Member)' : 'Gold Executive Member'}</option>
                    <option value="platinum">{isAr ? 'بلاتينية مميزة (Platinum Elite Member)' : 'Platinum Elite Member'}</option>
                  </select>
                </div>
              </div>

              {/* Privilege Highlights */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/70 text-[11px] space-y-1.5 text-gray-700 font-medium">
                <p className="font-bold text-gray-900">{isAr ? 'ماذا سيتلقى العضو عند الإرسال؟' : 'What happens upon provisioning?'}</p>
                <p>• {isAr ? 'إنشاء حساب مستخدم في Supabase Auth مع صلاحية عميل (Client).' : 'Creates Supabase Auth credentials for the client.'}</p>
                <p>• {isAr ? 'إصدار بطاقة عضوية رقمية فريدة في نادي ميسرة للأعمال مع 100 نقطة ترحيبية.' : 'Generates a unique digital membership ID (MBC-2026-XXXX) with 100 bonus loyalty points.'}</p>
                <p>• {isAr ? 'إرسال بريد إلكتروني ترحيبي متجاوب مع الهواتف يحتوي على رابط البوابة وكلمة المرور المؤقتة.' : 'Dispatches a mobile-responsive welcome email with portal login credentials and temporary password.'}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-[#A11212]/20 disabled:opacity-50"
                >
                  {isProvisioning ? (isAr ? 'جاري التفعيل والإرسال...' : 'Provisioning...') : (isAr ? 'تفعيل وإرسال الدعوة ✉️' : 'Activate & Send Invite ✉️')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW / EDIT QUOTATION (STEPS 3 & 4) ───────────────────── */}
      {isQuoteModalOpen && activeQuotation && selectedLeadForQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden my-8" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900">
                      {isAr ? 'عرض وتعديل عرض السعر والتحويل' : 'Quotation Proposal & Client Conversion'}
                    </h3>
                    <span className="font-mono text-xs font-black bg-purple-200/80 text-purple-900 px-2.5 py-0.5 rounded-full">
                      {activeQuotation.quotation_number}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {selectedLeadForQuote.contact_name} {selectedLeadForQuote.company_name ? `• ${selectedLeadForQuote.company_name}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'عنوان عرض السعر والخدمة *' : 'Quotation Title / Service *'}
                </label>
                <input
                  type="text"
                  required
                  value={quoteForm.title}
                  onChange={e => setQuoteForm({ ...quoteForm, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100 space-y-3">
                <h4 className="text-[11px] font-black uppercase text-purple-900 flex items-center gap-1.5">
                  <DollarSign size={14} />
                  <span>{isAr ? 'البيانات المالية وضريبة القيمة المضافة (5%)' : 'Financial Breakdown & 5% Oman VAT'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                      {isAr ? 'المبلغ الأساسي (OMR)' : 'Subtotal (OMR)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={quoteForm.subtotal}
                      onChange={e => {
                        const sub = parseFloat(e.target.value) || 0;
                        const vat = Number(((sub * quoteForm.vat_rate) / 100).toFixed(3));
                        const tot = Number((sub + vat).toFixed(3));
                        setQuoteForm({
                          ...quoteForm,
                          subtotal: sub,
                          vat_amount: vat,
                          total_amount: tot
                        });
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                      {isAr ? 'ضريبة القيمة المضافة (5%)' : 'VAT 5% (OMR)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      readOnly
                      value={quoteForm.vat_amount}
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                      {isAr ? 'المبلغ الإجمالي الشامل (OMR)' : 'Total Amount (OMR)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      readOnly
                      value={quoteForm.total_amount}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-800 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'نطاق العمل والتفاصيل الفنية (Scope of Work)' : 'Detailed Scope of Work & Deliverables'}
                </label>
                <textarea
                  rows={3}
                  value={quoteForm.service_details}
                  onChange={e => setQuoteForm({ ...quoteForm, service_details: e.target.value })}
                  placeholder={isAr ? 'أدخل تفاصيل ومخرجات الخدمة المتفق عليها...' : 'Describe service deliverables and milestones...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'حالة عرض السعر (Quotation Status)' : 'Proposal Status'}
                  </label>
                  <select
                    value={quoteForm.status}
                    onChange={e => setQuoteForm({ ...quoteForm, status: e.target.value as QuotationStatus })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  >
                    <option value="draft">{isAr ? 'مسودة (Draft)' : 'Draft'}</option>
                    <option value="sent">{isAr ? 'تم الإرسال للعميل (Sent)' : 'Sent to Client'}</option>
                    <option value="accepted">{isAr ? 'مقبول (قبول وتحويل لعميل ومهمة HOD)' : 'Accepted (Convert & Route to HOD)'}</option>
                    <option value="rejected">{isAr ? 'مرفوض (Rejected)' : 'Rejected'}</option>
                    <option value="expired">{isAr ? 'منتهي الصلاحية (Expired)' : 'Expired'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'تاريخ استحقاق / انتهاء الصلاحية' : 'Valid Until / Target Due Date'}
                  </label>
                  <input
                    type="date"
                    value={quoteForm.valid_until}
                    onChange={e => setQuoteForm({ ...quoteForm, valid_until: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              {quoteForm.status === 'accepted' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1 text-emerald-900">
                  <div className="flex items-center gap-1.5 font-black">
                    <Sparkles size={14} className="text-emerald-600 shrink-0" />
                    <span>{isAr ? 'إجراء التحويل التلقائي عند الحفظ:' : 'Automated Conversion on Save:'}</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed">
                    {isAr
                      ? `سيتم تحويل الفرصة "${selectedLeadForQuote.contact_name}" إلى عميل نشط في النظام، وإنشاء مهمة جديدة بقيمة OMR ${formatOMR(quoteForm.total_amount)} وتوجيه إشعار فوري لرئيس قسم (${selectedLeadForQuote.department_id}) لتكليف الموظف المختص.`
                      : `Will register "${selectedLeadForQuote.contact_name}" as an Active Client, generate a pending task for OMR ${formatOMR(quoteForm.total_amount)}, and dispatch a Realtime alert to the ${selectedLeadForQuote.department_id.toUpperCase()} HOD for staff delegation.`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'الشروط والأحكام (Terms & Conditions)' : 'Terms & Conditions'}
                </label>
                <textarea
                  rows={2}
                  value={quoteForm.terms_conditions}
                  onChange={e => setQuoteForm({ ...quoteForm, terms_conditions: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuote}
                  className={`flex-1 text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md disabled:opacity-50 ${
                    quoteForm.status === 'accepted'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-purple-700 hover:bg-purple-800 shadow-purple-700/20'
                  }`}
                >
                  {isSavingQuote 
                    ? (isAr ? 'جاري التنفيذ والتحويل...' : 'Processing...') 
                    : quoteForm.status === 'accepted'
                      ? (isAr ? 'قبول العرض والتحويل لعميل ومهمة' : 'Accept & Convert to Client')
                      : (isAr ? 'حفظ التغييرات' : 'Save Quotation')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD NEW LEAD ─────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden my-8" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#A11212]/10 text-[#A11212] flex items-center justify-center font-black">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {isAr ? 'تسجيل عميل محتمل جديد' : 'Register New CRM Lead'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {isAr ? 'أدخل تفاصيل جهة الاتصال والخدمة المهنية المستهدفة' : 'Capture prospective client & interest details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'اسم جهة الاتصال *' : 'Contact Person Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.contact_name}
                    onChange={e => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                    placeholder={isAr ? 'مثال: سالم البوسعيدي' : 'e.g. Salim Al-Busaidi'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'اسم الشركة أو المؤسسة' : 'Company / Business Entity'}
                  </label>
                  <input
                    type="text"
                    value={leadForm.company_name}
                    onChange={e => setLeadForm({ ...leadForm, company_name: e.target.value })}
                    placeholder={isAr ? 'مثال: شركة مسقط اللوجستية ش.م.م' : 'e.g. Muscat Logistics LLC'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'رقم الهاتف / واتساب *' : 'Phone / WhatsApp *'}
                  </label>
                  <input
                    type="text"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="+968 9123 4567"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="client@company.om"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'الخدمة المطلوبة *' : 'Interested Service *'}
                  </label>
                  <select
                    value={leadForm.interested_service}
                    onChange={e => {
                      const selectedVal = e.target.value;
                      const matched = SERVICE_OPTIONS.find(s => s.en === selectedVal || s.ar === selectedVal);
                      setLeadForm({
                        ...leadForm,
                        interested_service: selectedVal,
                        department_id: matched?.dept || leadForm.department_id
                      });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  >
                    {SERVICE_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.en}>{isAr ? opt.ar : opt.en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'القسم المختص *' : 'Target Department *'}
                  </label>
                  <select
                    value={leadForm.department_id}
                    onChange={e => setLeadForm({ ...leadForm, department_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{isAr ? d.ar : d.en}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'الميزانية التقديرية (OMR)' : 'Estimated Value (OMR)'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={leadForm.estimated_value}
                    onChange={e => setLeadForm({ ...leadForm, estimated_value: e.target.value })}
                    placeholder="0.000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'مصدر الفرصة' : 'Lead Source'}
                  </label>
                  <select
                    value={leadForm.source}
                    onChange={e => setLeadForm({ ...leadForm, source: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  >
                    {SOURCES.map(s => (
                      <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'الأولوية' : 'Priority'}
                  </label>
                  <select
                    value={leadForm.priority}
                    onChange={e => setLeadForm({ ...leadForm, priority: e.target.value as LeadPriority })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  >
                    <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
                    <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                    <option value="high">{isAr ? 'عالية' : 'High'}</option>
                    <option value="urgent">{isAr ? 'عاجلة' : 'Urgent'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'ملاحظات وتفاصيل الاحتياج' : 'Initial Inquiry Notes'}
                </label>
                <textarea
                  rows={3}
                  value={leadForm.notes}
                  onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder={isAr ? 'أدخل أي متطلبات خاصة أو تفاصيل تم الاتفاق عليها مبدئياً...' : 'Add any scope notes or client requirements...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-[#A11212]/20 disabled:opacity-50"
                >
                  {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الفرصة' : 'Register Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
