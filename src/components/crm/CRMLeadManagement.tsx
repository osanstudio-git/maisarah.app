import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
  Users, Plus, Search, Filter, Phone, Mail, Building2, Tag,
  Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, RefreshCw,
  Layers, ChevronDown, Edit2, Trash2, DollarSign, Calendar, ArrowRight,
  ShieldCheck, AlertTriangle, Sparkles, UserPlus, FileText, Send, Check, X,
  Briefcase, CheckSquare, UserCheck, Key, Copy, Award, User, ExternalLink,
  CreditCard, Receipt, Download
} from 'lucide-react';
import { provisionClientOrMemberAuth, type ProvisionResult } from '../../utils/clientAuthProvisioner';
import { isDirectEmployeeMode } from '../../utils/workflowConfig';
import PortalAccessCredentialModal, { type PortalAccessTarget } from './PortalAccessCredentialModal';
import ModernCRMDashboard from './ModernCRMDashboard';
import {
  type SalesStage,
  PIPELINE_COLUMNS,
  STAGE_CONFIG,
  SPEC_SERVICES,
  SPEC_SOURCES,
  DEFAULT_B2B_PARTNERS,
  normalizeStage,
  parseLeadNotes,
  encodeLeadNotes,
  isFollowUpOverdue,
  calculatePayments,
  advanceRecurringPeriod,
  calculateMRR,
  type PaymentEntry,
  type RecurringJob,
  type LeadMetadata
} from '../../utils/salesCrmSync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type LeadStatus = SalesStage | 'quoted' | 'accepted' | 'rejected';
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
  status: SalesStage | string;
  priority: LeadPriority;
  assigned_to?: string | null;
  converted_client_id?: string | null;
  converted_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  assigned_profile?: { full_name: string; email: string } | null;
  portal_access_sent?: boolean;
  // Extended Sales CRM Properties
  probability: number;
  services: string[];
  owner: string;
  b2b_partner: string;
  expected_close?: string;
  next_followup?: string;
  closed_at?: string | null;
  delivery_status?: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string | null;
  expected_completion?: string;
  user_notes?: string;
  activity_log?: Array<{ id: string; timestamp: string; action: string; details?: string; author?: string }>;
  payments?: PaymentEntry[];
  total_paid?: number;
  pending_payment?: number;
  payment_status?: 'unpaid' | 'partially_paid' | 'fully_paid';
  payment_due_date?: string;
  recurring_jobs?: RecurringJob[];
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
  { id: 'audit', en: 'Financial Audit', ar: 'تدقيق الحسابات والبيانات المالية', dept: 'audit' },
  { id: 'corporate_tax', en: 'Corporate Income Tax Assessment', ar: 'ضريبة الدخل على الشركات', dept: 'tax' },
  { id: 'bookkeeping', en: 'Bookkeeping & Monthly Accounts', ar: 'مسك الدفاتر والمحاسبة الشهرية', dept: 'accounting' },
  { id: 'company_formation', en: 'Commercial Registration & CR Formation', ar: 'تأسيس الشركات والسجل التجاري', dept: 'legal' },
  { id: 'business_advisory', en: 'Feasibility Study & Financial Advisory', ar: 'دراسات الجدوى والاستشارات المالية', dept: 'advisory' },
  { id: 'tax_appeal', en: 'Tax Appeals & Dispute Resolution', ar: 'الاعتراضات والنزاعات الضريبية', dept: 'tax' }
];

const DEPARTMENTS = [
  { id: 'audit', en: 'Maisarah Audit Department', ar: 'قسم تدقيق الحسابات — ميسرة' },
  { id: 'tax', en: 'Maisarah Tax & VAT Department', ar: 'قسم الضرائب وضريبة القيمة المضافة — ميسرة' },
  { id: 'accounting', en: 'Maisarah Bookkeeping Department', ar: 'قسم مسك الدفاتر — ميسرة' },
  { id: 'legal', en: 'Maisarah Corporate Legal Department', ar: 'قسم الشؤون القانونية والشركات — ميسرة' },
  { id: 'advisory', en: 'Maisarah Business Advisory Department', ar: 'قسم الاستشارات المالية — ميسرة' }
];

const SOURCES = [
  { id: 'direct', en: 'Direct Contact / Walk-in', ar: 'تواصل مباشر / زيارة' },
  { id: 'referral', en: 'Client Referral', ar: 'توصية من عميل' },
  { id: 'website', en: 'Online Website Portal', ar: 'الموقع الإلكتروني' },
  { id: 'phone', en: 'Phone Inquiry', ar: 'استفسار هاتفي' },
  { id: 'social', en: 'Social Media & LinkedIn', ar: 'وسائل التواصل و لينكد إن' },
  { id: 'campaign', en: 'Marketing Campaign', ar: 'حملة تسويقية' }
];

export default function CRMLeadManagement() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [quotationsMap, setQuotationsMap] = useState<Record<string, QuotationRecord>>({});
  const [loading, setLoading] = useState(true);
  // CRM Navigation Tabs: Dashboard, Pipeline (board), All leads (table), Delivery & payments, Recurring work, B2B partners
  const [activeTab, setActiveTab] = useState<'pipeline' | 'table' | 'delivery' | 'recurring' | 'dashboard' | 'partners'>('pipeline');
  const viewMode = activeTab === 'table' ? 'table' : 'kanban';
  const setViewMode = (mode: 'kanban' | 'table') => setActiveTab(mode === 'table' ? 'table' : 'pipeline');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Delivery Tab Filters (Step 3)
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
  const [deliveryPaymentFilter, setDeliveryPaymentFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'fully_paid'>('all');

  // Recurring Work Tab States (Step 4)
  const [recurringFrequencyFilter, setRecurringFrequencyFilter] = useState<'all' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'>('all');
  const [recurringStatusFilter, setRecurringStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [isAddRecurringModalOpen, setIsAddRecurringModalOpen] = useState(false);
  const [editingRecurringJob, setEditingRecurringJob] = useState<{ leadId: string; job: RecurringJob } | null>(null);
  const [recurringForm, setRecurringForm] = useState({
    lead_id: '',
    service: 'Bookkeeping & Monthly Accounts',
    frequency: 'monthly' as 'monthly' | 'quarterly' | 'half_yearly' | 'yearly',
    fee: '',
    next_due: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    notes: ''
  });
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);

  // Dashboard Interactive Filters (Step 5)
  const [dashPeriodFilter, setDashPeriodFilter] = useState<'all' | 'this_month' | 'this_quarter' | 'this_year'>('all');
  const [dashOwnerFilter, setDashOwnerFilter] = useState('all');
  const [dashDeptFilter, setDashDeptFilter] = useState('all');

  // B2B Partners & Filters (Step 6)
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [customPartners, setCustomPartners] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('maisarah_crm_custom_partners');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerCommission, setNewPartnerCommission] = useState(10);
  const [partnerCommissionMap, setPartnerCommissionMap] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('maisarah_crm_partner_commissions');
      return stored ? JSON.parse(stored) : {
        'ODB - Oman Development Bank (بنك التنمية العماني)': 10,
        'Sanad Services Centers Group (مراكز سند للخدمات)': 15,
        'Riyada - SME Development Authority (هيئة تنمية المؤسسات الصغيرة والمتوسطة)': 10,
        'Partner Law & Corporate Chambers (مكاتب المحاماة والاستشارات القانونية)': 12,
        'None, direct client': 0
      };
    } catch {
      return {};
    }
  });

  // Add / Edit Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [leadForm, setLeadForm] = useState({
    contact_name: '',
    company_name: '',
    phone: '',
    email: '',
    source: 'Direct',
    services: ['VAT filing'] as string[],
    owner: '',
    b2b_partner: 'None, direct client',
    stage: 'new' as SalesStage,
    estimated_value: '',
    probability: 10,
    expected_close: '',
    next_followup: '',
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
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);

  // Payment Ledger Modal State (Step 2)
  const [selectedLeadForPayment, setSelectedLeadForPayment] = useState<CRMLead | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    note: ''
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
        const parsed: CRMLead[] = (leadsRes.data as any[]).map(raw => {
          const { userNotes, meta } = parseLeadNotes(raw.notes);
          const normalized = normalizeStage(raw.status);
          const prob = typeof meta.probability === 'number'
            ? meta.probability
            : (STAGE_CONFIG[normalized]?.probability ?? 10);
          const servs = Array.isArray(meta.services) && meta.services.length > 0
            ? meta.services
            : (raw.interested_service ? [raw.interested_service] : []);

          const rawValue = Number(raw.estimated_value) || 0;
          const paymentsList = meta.payments || [];
          const paymentCalcs = calculatePayments(rawValue, paymentsList);

          return {
            ...raw,
            status: normalized,
            user_notes: userNotes,
            probability: prob,
            services: servs,
            owner: meta.owner || raw.assigned_profile?.full_name || 'Direct Sales',
            b2b_partner: meta.b2b_partner || 'None, direct client',
            expected_close: meta.expected_close || '',
            next_followup: meta.next_followup || '',
            closed_at: meta.closed_at || null,
            delivery_status: meta.delivery_status || 'not_started',
            completed_at: meta.completed_at || null,
            expected_completion: meta.expected_completion || '',
            activity_log: meta.activity_log || [],
            payments: paymentsList,
            total_paid: paymentCalcs.totalPaid,
            pending_payment: paymentCalcs.pendingPayment,
            payment_status: paymentCalcs.paymentStatus,
            payment_due_date: meta.payment_due_date || '',
            recurring_jobs: meta.recurring_jobs || []
          };
        });
        setLeads(parsed);
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

      // 3. Generate Service Deliverable Task with Hierarchy-aware routing
      const directMode = isDirectEmployeeMode();
      let targetEmployeeId: string | null = lead.assigned_to || null;

      // In Direct Mode, if not already assigned, pick staff member for that department
      if (directMode && !targetEmployeeId) {
        const { data: deptStaff } = await supabase
          .from('profiles')
          .select('id')
          .eq('department_id', finalDept)
          .limit(1)
          .maybeSingle();
        if (deptStaff?.id) {
          targetEmployeeId = deptStaff.id;
        }
      }

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
            description: `${finalDetails} | Contract Fee: OMR ${Number(finalBudget) || 0}`,
            department_id: finalDept,
            status: 'pending',
            priority: lead.priority || 'medium',
            due_date: finalDueDate,
            employee_id: targetEmployeeId
          }])
          .select('id')
          .single();

        if (serviceErr) throw serviceErr;
        createdServiceId = newService.id;
      }

      // 4. Realtime Routing & Notification (Hierarchy Aware)
      const deptConfig = DEPARTMENTS.find(d => d.id === finalDept);
      const deptLabel = isAr ? (deptConfig?.ar || finalDept) : (deptConfig?.en || finalDept);

      if (directMode) {
        // Direct Employee Dispatch (Flat Mode)
        await supabase.from('notifications').insert([{
          sender_id: user?.id || null,
          recipient_role: 'employee',
          recipient_id: targetEmployeeId || undefined,
          service_id: createdServiceId,
          title: isAr ? `مهمة جديدة مسندة إليك (${deptLabel})` : `New Task Assigned (${deptLabel})`,
          message: isAr
            ? `تم تحويل العميل "${companyOrContactName}" بقيمة OMR ${formatOMR(finalBudget)}. تم إسناد المهمة إليك مباشرة لبدء العمل وسجل DSR.`
            : `Client "${companyOrContactName}" converted (OMR ${formatOMR(finalBudget)}). Assigned directly to you to begin execution and DSR register.`,
          type: 'task_started'
        }]);

        setToast({
          show: true,
          title: isAr ? 'تم التحويل والإسناد المباشر للموظف' : 'Lead Converted & Assigned to Employee',
          message: isAr
            ? `تم إنشاء حساب العميل (${companyOrContactName}) وإسناد المهمة مباشرة لموظف قسم (${deptLabel}) بنجاح.`
            : `Client (${companyOrContactName}) created and task assigned directly to ${deptLabel} staff.`,
          type: 'success'
        });
      } else {
        // HOD Queue Routing (Enterprise Mode)
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
      }

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

  // ── Update Lead Status with Strict Sales Rules ───────────────────────────
  const handleUpdateStatus = async (leadId: string, newStageRaw: SalesStage | string) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    const newStatus = normalizeStage(newStageRaw);

    // RULE 1: A lead can't be saved as Won without a price and at least one service
    const dealValue = Number(targetLead.estimated_value) || 0;
    const hasServices = (targetLead.services && targetLead.services.length > 0) || Boolean(targetLead.interested_service);

    if (newStatus === 'won') {
      if (dealValue <= 0 || !hasServices) {
        setToast({
          show: true,
          title: isAr ? 'لا يمكن حفظ الصفقة كناجحة (Won)' : 'Cannot Mark as Won',
          message: isAr
            ? 'قواعد العمل: لا يمكن نقل الفرصة إلى (Won) دون تحديد سعر للصفقة واختيار خدمة واحدة على الأقل.'
            : 'Business Rule: A lead cannot be saved as Won without an agreed price and at least one service selected.',
          type: 'error'
        });
        return;
      }
    }

    // RULE 2: Moving to Won or Lost fills closed date; moving out clears it
    const isClosing = newStatus === 'won' || newStatus === 'lost';
    const updatedClosedAt = isClosing ? (targetLead.closed_at || new Date().toISOString()) : null;

    // Default probability by stage
    const newProbability = STAGE_CONFIG[newStatus]?.probability ?? targetLead.probability;

    // RULE 3: Stage changes written to activity log automatically
    const logEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: `Stage moved from "${STAGE_CONFIG[targetLead.status]?.labelEn || targetLead.status}" to "${STAGE_CONFIG[newStatus]?.labelEn || newStatus}" (${newProbability}% probability)`,
      author: user?.user_metadata?.full_name || 'Staff'
    };
    const updatedLog = [logEntry, ...(targetLead.activity_log || [])];

    const updatedMeta: LeadMetadata = {
      probability: newProbability,
      services: targetLead.services,
      owner: targetLead.owner,
      b2b_partner: targetLead.b2b_partner,
      expected_close: targetLead.expected_close,
      next_followup: targetLead.next_followup,
      closed_at: updatedClosedAt,
      delivery_status: targetLead.delivery_status,
      completed_at: targetLead.completed_at,
      activity_log: updatedLog
    };

    const encodedNotes = encodeLeadNotes(targetLead.user_notes || '', updatedMeta);

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      status: newStatus,
      probability: newProbability,
      closed_at: updatedClosedAt,
      notes: encodedNotes,
      activity_log: updatedLog,
      updated_at: new Date().toISOString()
    } : l));

    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          status: newStatus === 'won' ? 'accepted' : newStatus === 'lost' ? 'rejected' : newStatus,
          notes: encodedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      if (newStatus === 'proposal_sent') {
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

      if (newStatus === 'won') {
        let quote = quotationsMap[targetLead.id];
        if (!quote) {
          quote = await ensureDraftQuotationForLead(targetLead);
        }
        await executeConversionToClientAndTask(targetLead, quote);
        return;
      }

      setToast({
        show: true,
        title: isAr ? 'تم تحديث المرحلة' : 'Stage Updated',
        message: isAr
          ? `تم نقل الفرصة إلى مرحلة ${STAGE_CONFIG[newStatus]?.labelAr || newStatus} (${newProbability}%)`
          : `Lead moved to ${STAGE_CONFIG[newStatus]?.labelEn || newStatus} (${newProbability}%)`,
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

  // ── Open Add / Edit Modal Helpers ─────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormError(null);
    setLeadForm({
      contact_name: '',
      company_name: '',
      phone: '',
      email: '',
      source: 'Direct',
      services: ['VAT filing'],
      owner: user?.user_metadata?.full_name || 'Staff Member',
      b2b_partner: 'None, direct client',
      stage: 'new',
      estimated_value: '',
      probability: 10,
      expected_close: '',
      next_followup: '',
      priority: 'medium',
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (lead: CRMLead) => {
    setEditingLead(lead);
    setFormError(null);
    const servs = lead.services && lead.services.length > 0 
      ? lead.services 
      : (lead.interested_service ? [lead.interested_service] : ['VAT filing']);

    setLeadForm({
      contact_name: lead.contact_name || '',
      company_name: lead.company_name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source || 'Direct',
      services: servs,
      owner: lead.owner || user?.user_metadata?.full_name || 'Staff Member',
      b2b_partner: lead.b2b_partner || 'None, direct client',
      stage: normalizeStage(lead.status),
      estimated_value: lead.estimated_value > 0 ? String(lead.estimated_value) : '',
      probability: typeof lead.probability === 'number' ? lead.probability : (STAGE_CONFIG[lead.status]?.probability ?? 10),
      expected_close: lead.expected_close || '',
      next_followup: lead.next_followup || '',
      priority: lead.priority || 'medium',
      notes: lead.user_notes || ''
    });
    setIsAddModalOpen(true);
  };

  // ── Create or Edit Lead with Strict Rules ─────────────────────────────────
  const handleSaveLead = async (e: React.FormEvent) => {
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

    const numericValue = parseFloat(leadForm.estimated_value) || 0;
    const selectedServices = leadForm.services || [];

    // STRICT RULE: A lead cannot be saved as Won without a price and at least one service
    if (leadForm.stage === 'won') {
      if (numericValue <= 0 || selectedServices.length === 0) {
        setFormError(
          isAr
            ? 'قواعد العمل: لا يمكن حفظ الفرصة كناجحة (Won) دون تحديد سعر للصفقة واختيار خدمة واحدة على الأقل.'
            : 'Business Rule: A lead cannot be saved as Won without an agreed price and at least one service selected.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const isClosing = leadForm.stage === 'won' || leadForm.stage === 'lost';
      const closedAt = isClosing ? (editingLead?.closed_at || new Date().toISOString()) : null;

      // Activity log entry
      let currentLog = editingLead?.activity_log || [];
      if (!editingLead) {
        currentLog = [{
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: `Lead created in stage "${STAGE_CONFIG[leadForm.stage]?.labelEn || leadForm.stage}" (${leadForm.probability}% prob)`,
          author: user?.user_metadata?.full_name || 'Staff'
        }];
      } else if (editingLead.status !== leadForm.stage) {
        currentLog = [{
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: `Stage changed from "${STAGE_CONFIG[editingLead.status]?.labelEn || editingLead.status}" to "${STAGE_CONFIG[leadForm.stage]?.labelEn || leadForm.stage}" (${leadForm.probability}% prob)`,
          author: user?.user_metadata?.full_name || 'Staff'
        }, ...currentLog];
      }

      const meta: LeadMetadata = {
        probability: Number(leadForm.probability) || (STAGE_CONFIG[leadForm.stage]?.probability ?? 10),
        services: selectedServices,
        owner: leadForm.owner || user?.user_metadata?.full_name || 'Direct Sales',
        b2b_partner: leadForm.b2b_partner || 'None, direct client',
        expected_close: leadForm.expected_close || '',
        next_followup: leadForm.next_followup || '',
        closed_at: closedAt,
        delivery_status: editingLead?.delivery_status || 'not_started',
        completed_at: editingLead?.completed_at || null,
        activity_log: currentLog
      };

      const primaryService = selectedServices[0] || 'Auditing';
      const matchedDept = SERVICE_OPTIONS.find(s => s.en.toLowerCase().includes(primaryService.toLowerCase()) || primaryService.toLowerCase().includes(s.dept))?.dept || 'audit';

      const encodedNotes = encodeLeadNotes(leadForm.notes.trim(), meta);
      const dbStatus = leadForm.stage === 'won' ? 'accepted' : leadForm.stage === 'lost' ? 'rejected' : leadForm.stage;

      if (editingLead) {
        const { error } = await supabase
          .from('crm_leads')
          .update({
            contact_name: leadForm.contact_name.trim(),
            company_name: leadForm.company_name.trim() || null,
            phone: leadForm.phone.trim() || null,
            email: leadForm.email.trim() || null,
            source: leadForm.source,
            interested_service: primaryService,
            department_id: matchedDept,
            estimated_value: numericValue,
            priority: leadForm.priority,
            status: dbStatus,
            notes: encodedNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLead.id);

        if (error) throw error;

        if (leadForm.stage === 'won' && editingLead.status !== 'won') {
          let quote = quotationsMap[editingLead.id];
          if (!quote) quote = await ensureDraftQuotationForLead(editingLead);
          await executeConversionToClientAndTask(editingLead, quote);
        }

        setToast({
          show: true,
          title: isAr ? 'تم تحديث بيانات الفرصة' : 'Lead Updated Successfully',
          message: isAr ? `تم تحديث ملف (${leadForm.contact_name}) بنجاح.` : `Lead details for ${leadForm.contact_name} saved.`,
          type: 'success'
        });
      } else {
        const { error } = await supabase
          .from('crm_leads')
          .insert([{
            contact_name: leadForm.contact_name.trim(),
            company_name: leadForm.company_name.trim() || null,
            phone: leadForm.phone.trim() || null,
            email: leadForm.email.trim() || null,
            source: leadForm.source,
            interested_service: primaryService,
            department_id: matchedDept,
            estimated_value: numericValue,
            priority: leadForm.priority,
            status: dbStatus,
            assigned_to: user?.id || null,
            notes: encodedNotes
          }]);

        if (error) throw error;

        setToast({
          show: true,
          title: isAr ? 'تمت إضافة الفرصة بنجاح' : 'Lead Created Successfully',
          message: isAr ? 'تم تسجيل الفرصة بنجاح في خط الأنابيب.' : 'Lead has been added to the sales pipeline.',
          type: 'success'
        });
      }

      setIsAddModalOpen(false);
      setEditingLead(null);
      fetchLeads(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete Lead ────────────────────────────────────────────────────────────
  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من رغبتك في حذف سجل هذه الفرصة نهائياً؟' : 'Are you sure you want to permanently delete this lead?')) {
      return;
    }
    try {
      const { error } = await supabase.from('crm_leads').delete().eq('id', leadId);
      if (error) throw error;
      setToast({
        show: true,
        title: isAr ? 'تم حذف الفرصة' : 'Lead Deleted',
        message: isAr ? 'تم حذف سجل الفرصة نهائياً من خط الأنابيب.' : 'Lead record removed permanently.',
        type: 'success'
      });
      setIsAddModalOpen(false);
      setEditingLead(null);
      fetchLeads(true);
    } catch (err: any) {
      setToast({
        show: true,
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || 'Could not delete lead',
        type: 'error'
      });
    }
  };

  // ── Step 2: Payment Ledger Helpers ─────────────────────────────────────────
  const handleOpenPaymentModal = (lead: CRMLead) => {
    setSelectedLeadForPayment(lead);
    setPaymentError(null);
    setPaymentForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      note: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleFillRemainingBalance = () => {
    if (!selectedLeadForPayment) return;
    const remaining = selectedLeadForPayment.pending_payment ?? selectedLeadForPayment.estimated_value ?? 0;
    setPaymentForm(prev => ({
      ...prev,
      amount: remaining > 0 ? remaining.toFixed(3) : '0.000'
    }));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForPayment) return;
    setPaymentError(null);

    const amountNum = parseFloat(paymentForm.amount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError(isAr ? 'يرجى إدخال مبلغ صالح للدفعة' : 'Enter a valid payment amount greater than 0');
      return;
    }

    setIsSavingPayment(true);
    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', selectedLeadForPayment.id)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const existingPayments: PaymentEntry[] = meta.payments || [];

      const newPayment: PaymentEntry = {
        id: `pay-${Date.now()}`,
        date: paymentForm.date || new Date().toISOString().split('T')[0],
        amount: Number(amountNum.toFixed(3))
      };

      const updatedPayments = [newPayment, ...existingPayments];
      const calcs = calculatePayments(latestLead.estimated_value || 0, updatedPayments);

      const logEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Recorded installment payment of OMR ${newPayment.amount.toFixed(3)} (${paymentForm.note.trim() || 'Direct Payment'})`,
        author: user?.user_metadata?.full_name || 'Accounts Staff'
      };

      const updatedMeta: LeadMetadata = {
        ...meta,
        payments: updatedPayments,
        total_paid: calcs.totalPaid,
        pending_payment: calcs.pendingPayment,
        payment_status: calcs.paymentStatus,
        activity_log: [logEntry, ...(meta.activity_log || [])]
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLeadForPayment.id);

      if (updateErr) throw updateErr;

      setToast({
        show: true,
        title: isAr ? 'تم تسجيل الدفعة بنجاح' : 'Payment Recorded Successfully',
        message: isAr
          ? `تم قيد دفعة بقيمة OMR ${newPayment.amount.toFixed(3)}. المتبقي: OMR ${calcs.pendingPayment.toFixed(3)}.`
          : `Recorded OMR ${newPayment.amount.toFixed(3)}. Remaining balance: OMR ${calcs.pendingPayment.toFixed(3)}.`,
        type: 'success'
      });

      setPaymentForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        note: ''
      });

      setSelectedLeadForPayment(prev => prev ? {
        ...prev,
        payments: updatedPayments,
        total_paid: calcs.totalPaid,
        pending_payment: calcs.pendingPayment,
        payment_status: calcs.paymentStatus
      } : null);

      fetchLeads(true);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedLeadForPayment) return;
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الدفعة من السجل؟' : 'Are you sure you want to delete this payment installment?')) {
      return;
    }

    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', selectedLeadForPayment.id)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const existingPayments: PaymentEntry[] = meta.payments || [];
      const paymentToDelete = existingPayments.find(p => p.id === paymentId);
      const updatedPayments = existingPayments.filter(p => p.id !== paymentId);
      const calcs = calculatePayments(latestLead.estimated_value || 0, updatedPayments);

      const logEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Removed payment installment of OMR ${paymentToDelete?.amount?.toFixed(3) || 0}`,
        author: user?.user_metadata?.full_name || 'Accounts Staff'
      };

      const updatedMeta: LeadMetadata = {
        ...meta,
        payments: updatedPayments,
        total_paid: calcs.totalPaid,
        pending_payment: calcs.pendingPayment,
        payment_status: calcs.paymentStatus,
        activity_log: [logEntry, ...(meta.activity_log || [])]
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLeadForPayment.id);

      if (updateErr) throw updateErr;

      setToast({
        show: true,
        title: isAr ? 'تم حذف الدفعة' : 'Payment Removed',
        message: isAr ? 'تم تحديث الرصيد والمدفوعات بنجاح.' : 'Balance and ledger updated.',
        type: 'success'
      });

      setSelectedLeadForPayment(prev => prev ? {
        ...prev,
        payments: updatedPayments,
        total_paid: calcs.totalPaid,
        pending_payment: calcs.pendingPayment,
        payment_status: calcs.paymentStatus
      } : null);

      fetchLeads(true);
    } catch (err: any) {
      alert(err.message || 'Could not delete payment');
    }
  };

  // ── Step 3: Delivery Fulfillment Handlers ──────────────────────────────────
  const handleUpdateDeliveryStatus = async (
    leadId: string,
    newStatus: 'not_started' | 'in_progress' | 'completed'
  ) => {
    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      
      // Strict User Rule: Completed date set automatically when delivery status is marked Completed; cleared if changed back.
      const isCompleted = newStatus === 'completed';
      const completedAt = isCompleted ? (meta.completed_at || new Date().toISOString()) : null;

      const logEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Delivery fulfillment changed to "${newStatus}"${isCompleted ? ' (Completed)' : ''}`,
        author: user?.user_metadata?.full_name || 'Operations Staff'
      };

      const updatedMeta: LeadMetadata = {
        ...meta,
        delivery_status: newStatus,
        completed_at: completedAt,
        activity_log: [logEntry, ...(meta.activity_log || [])]
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateErr) throw updateErr;

      setToast({
        show: true,
        title: isAr ? 'تم تحديث حالة التنفيذ' : 'Delivery Status Updated',
        message: isAr
          ? `تم تحديث حالة التسليم إلى: ${newStatus === 'completed' ? 'مكتمل' : newStatus === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ'}`
          : `Fulfillment status changed to ${newStatus.replace('_', ' ')}`,
        type: 'success'
      });

      fetchLeads(true);
    } catch (err: any) {
      setToast({
        show: true,
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || 'Could not update delivery status',
        type: 'error'
      });
    }
  };

  const handleUpdateFulfillmentDate = async (
    leadId: string,
    field: 'expected_completion' | 'payment_due_date',
    value: string
  ) => {
    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const updatedMeta: LeadMetadata = {
        ...meta,
        [field]: value
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateErr) throw updateErr;

      fetchLeads(true);
    } catch (err: any) {
      console.error('Error updating fulfillment date:', err);
    }
  };

  // ── Step 4: Recurring Retainers Handlers ──────────────────────────────────
  const handleOpenAddRecurringModal = (lead?: CRMLead) => {
    setEditingRecurringJob(null);
    setRecurringError(null);
    const targetLeadId = lead?.id || (wonLeads[0]?.id || leads[0]?.id || '');
    const today = new Date();
    const periodStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const nextDueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    setRecurringForm({
      lead_id: targetLeadId,
      service: lead?.interested_service || 'Bookkeeping & Monthly Accounts',
      frequency: 'monthly',
      fee: lead?.estimated_value ? String(lead.estimated_value) : '150',
      next_due: nextDueDate,
      period: periodStr,
      notes: ''
    });
    setIsAddRecurringModalOpen(true);
  };

  const handleOpenEditRecurringModal = (leadId: string, job: RecurringJob) => {
    setEditingRecurringJob({ leadId, job });
    setRecurringError(null);
    setRecurringForm({
      lead_id: leadId,
      service: job.service,
      frequency: job.frequency,
      fee: String(job.fee),
      next_due: job.next_due,
      period: job.period || '',
      notes: job.notes || ''
    });
    setIsAddRecurringModalOpen(true);
  };

  const handleSaveRecurringJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.lead_id) {
      setRecurringError(isAr ? 'يرجى اختيار العميل أو الصفقة' : 'Please select a client or deal');
      return;
    }
    const feeNum = Number(recurringForm.fee);
    if (!feeNum || feeNum <= 0) {
      setRecurringError(isAr ? 'يرجى إدخال رسوم شهرية/دورية صحيحة' : 'Please enter a valid recurring fee');
      return;
    }

    setIsSavingRecurring(true);
    setRecurringError(null);

    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', recurringForm.lead_id)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const existingJobs: RecurringJob[] = meta.recurring_jobs || [];

      let updatedJobs: RecurringJob[];
      let logMsg = '';

      if (editingRecurringJob) {
        updatedJobs = existingJobs.map(j => {
          if (j.id === editingRecurringJob.job.id) {
            return {
              ...j,
              service: recurringForm.service.trim(),
              frequency: recurringForm.frequency,
              fee: feeNum,
              next_due: recurringForm.next_due,
              period: recurringForm.period.trim(),
              notes: recurringForm.notes.trim()
            };
          }
          return j;
        });
        logMsg = `Updated retainer contract for ${recurringForm.service} (OMR ${feeNum.toFixed(3)} / ${recurringForm.frequency})`;
      } else {
        const newJob: RecurringJob = {
          id: `rec-${Date.now()}`,
          service: recurringForm.service.trim(),
          frequency: recurringForm.frequency,
          next_due: recurringForm.next_due,
          fee: feeNum,
          fee_received: false,
          period: recurringForm.period.trim() || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          status: 'pending',
          cycle_count: 1,
          notes: recurringForm.notes.trim()
        };
        updatedJobs = [newJob, ...existingJobs];
        logMsg = `Created recurring retainer for ${recurringForm.service} (OMR ${feeNum.toFixed(3)} / ${recurringForm.frequency})`;
      }

      const logEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: logMsg,
        author: user?.user_metadata?.full_name || 'Staff'
      };

      const updatedMeta: LeadMetadata = {
        ...meta,
        recurring_jobs: updatedJobs,
        activity_log: [logEntry, ...(meta.activity_log || [])]
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', recurringForm.lead_id);

      if (updateErr) throw updateErr;

      setToast({
        show: true,
        title: isAr ? 'تم حفظ العقد الدوري' : 'Retainer Saved Successfully',
        message: isAr
          ? `تم قيد اشتراك ${recurringForm.service} بقيمة OMR ${feeNum.toFixed(3)} دورياً.`
          : `Retainer ${recurringForm.service} saved at OMR ${feeNum.toFixed(3)} / ${recurringForm.frequency}.`,
        type: 'success'
      });

      setIsAddRecurringModalOpen(false);
      setEditingRecurringJob(null);
      fetchLeads(true);
    } catch (err: any) {
      setRecurringError(err.message || 'Failed to save recurring retainer');
    } finally {
      setIsSavingRecurring(false);
    }
  };

  // 1-Click Auto-Rollover
  const handleRolloverRecurringJob = async (leadId: string, jobId: string) => {
    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const existingJobs: RecurringJob[] = meta.recurring_jobs || [];
      const targetJob = existingJobs.find(j => j.id === jobId);

      if (!targetJob) return;

      const { nextDue, nextPeriod } = advanceRecurringPeriod(targetJob.next_due, targetJob.frequency);
      const prevPeriod = targetJob.period || 'current';
      const newCycleCount = (targetJob.cycle_count || 1) + 1;

      const updatedJobs = existingJobs.map(j => {
        if (j.id === jobId) {
          return {
            ...j,
            period: nextPeriod,
            next_due: nextDue,
            status: 'pending' as const,
            fee_received: false,
            completed_at: null,
            last_rollover_at: new Date().toISOString(),
            cycle_count: newCycleCount
          };
        }
        return j;
      });

      const logEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `1-Click Auto-Rollover: Completed period "${prevPeriod}" for ${targetJob.service}. Rolled over to "${nextPeriod}" (Due: ${nextDue}). Cycle #${newCycleCount}.`,
        author: user?.user_metadata?.full_name || 'System'
      };

      const updatedMeta: LeadMetadata = {
        ...meta,
        recurring_jobs: updatedJobs,
        activity_log: [logEntry, ...(meta.activity_log || [])]
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateErr) throw updateErr;

      setToast({
        show: true,
        title: isAr ? 'تم إنجاز الدورة وترحيلها بنجاح' : '1-Click Auto Rollover Completed',
        message: isAr
          ? `تم إنجاز دورة (${prevPeriod}) وترحيل العقد تلقائياً إلى دورة (${nextPeriod}) مع استحقاق (${nextDue}).`
          : `Completed "${prevPeriod}". Rolled over to "${nextPeriod}" (Due: ${nextDue}).`,
        type: 'success'
      });

      fetchLeads(true);
    } catch (err: any) {
      alert(err.message || 'Could not rollover recurring job');
    }
  };

  const handleToggleFeeReceived = async (leadId: string, jobId: string, newReceivedState: boolean) => {
    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const existingJobs: RecurringJob[] = meta.recurring_jobs || [];

      const updatedJobs = existingJobs.map(j => {
        if (j.id === jobId) {
          return { ...j, fee_received: newReceivedState };
        }
        return j;
      });

      const updatedMeta: LeadMetadata = {
        ...meta,
        recurring_jobs: updatedJobs
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateErr) throw updateErr;
      fetchLeads(true);
    } catch (err: any) {
      console.error('Error toggling fee received:', err);
    }
  };

  const handleUpdateRecurringStatus = async (
    leadId: string,
    jobId: string,
    newStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const existingJobs: RecurringJob[] = meta.recurring_jobs || [];

      const updatedJobs = existingJobs.map(j => {
        if (j.id === jobId) {
          return {
            ...j,
            status: newStatus,
            completed_at: newStatus === 'completed' ? (j.completed_at || new Date().toISOString()) : null
          };
        }
        return j;
      });

      const updatedMeta: LeadMetadata = {
        ...meta,
        recurring_jobs: updatedJobs
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateErr) throw updateErr;
      fetchLeads(true);
    } catch (err: any) {
      console.error('Error updating recurring status:', err);
    }
  };

  const handleDeleteRecurringJob = async (leadId: string, jobId: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا العقد الدوري؟' : 'Are you sure you want to delete this recurring contract?')) {
      return;
    }

    try {
      const { data: latestLead, error: fetchErr } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchErr) throw fetchErr;

      const { userNotes, meta } = parseLeadNotes(latestLead.notes);
      const existingJobs: RecurringJob[] = meta.recurring_jobs || [];
      const targetJob = existingJobs.find(j => j.id === jobId);
      const updatedJobs = existingJobs.filter(j => j.id !== jobId);

      const logEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Deleted recurring contract for ${targetJob?.service || 'service'}`,
        author: user?.user_metadata?.full_name || 'Staff'
      };

      const updatedMeta: LeadMetadata = {
        ...meta,
        recurring_jobs: updatedJobs,
        activity_log: [logEntry, ...(meta.activity_log || [])]
      };

      const encoded = encodeLeadNotes(userNotes, updatedMeta);

      const { error: updateErr } = await supabase
        .from('crm_leads')
        .update({
          notes: encoded,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateErr) throw updateErr;

      setToast({
        show: true,
        title: isAr ? 'تم حذف العقد الدوري' : 'Retainer Contract Deleted',
        message: isAr ? 'تمت إزالة العقد الدوري من السجل.' : 'Contract removed.',
        type: 'success'
      });

      fetchLeads(true);
    } catch (err: any) {
      alert(err.message || 'Could not delete recurring job');
    }
  };

  // ── Unique Owners for Autocomplete Suggestions ─────────────────────────────
  const existingOwners = useMemo(() => {
    const set = new Set<string>();
    if (user?.user_metadata?.full_name) set.add(user.user_metadata.full_name);
    leads.forEach(l => {
      if (l.owner) set.add(l.owner);
    });
    return Array.from(set);
  }, [leads, user]);

  // ── Filtered Leads ─────────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const q = searchQuery.toLowerCase();
      const matchesQuery = !searchQuery ||
        l.contact_name.toLowerCase().includes(q) ||
        (l.company_name && l.company_name.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        l.interested_service.toLowerCase().includes(q) ||
        (l.owner && l.owner.toLowerCase().includes(q)) ||
        (l.b2b_partner && l.b2b_partner.toLowerCase().includes(q)) ||
        (l.services && l.services.some(s => s.toLowerCase().includes(q))) ||
        (l.user_notes && l.user_notes.toLowerCase().includes(q));

      const matchesDept = departmentFilter === 'all' || l.department_id === departmentFilter;
      const matchesPriority = priorityFilter === 'all' || l.priority === priorityFilter;
      const matchesPartner = partnerFilter === 'all' || (l.b2b_partner || 'None, direct client') === partnerFilter;

      return matchesQuery && matchesDept && matchesPriority && matchesPartner;
    });
  }, [leads, searchQuery, departmentFilter, priorityFilter, partnerFilter]);

  // ── Stats Summary with Weighted Forecast & Win Rate ───────────────────────
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter(l => l.status === 'new').length;
    const wonCount = leads.filter(l => l.status === 'won').length;
    const lostCount = leads.filter(l => l.status === 'lost').length;
    const openLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');

    const totalOpenPipeline = openLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const weightedForecast = openLeads.reduce((acc, l) => {
      const val = Number(l.estimated_value) || 0;
      const prob = typeof l.probability === 'number' ? l.probability : (STAGE_CONFIG[l.status]?.probability ?? 10);
      return acc + (val * prob) / 100;
    }, 0);
    const wonTotalValue = leads.filter(l => l.status === 'won').reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);

    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : (total > 0 ? Math.round((wonCount / total) * 100) : 0);

    const overdueFollowups = openLeads.filter(l => isFollowUpOverdue(l.next_followup)).length;
    const tbdCount = openLeads.filter(l => !l.estimated_value || Number(l.estimated_value) <= 0).length;

    return {
      total,
      newCount,
      wonCount,
      lostCount,
      totalOpenPipeline,
      weightedForecast,
      wonTotalValue,
      winRate,
      overdueFollowups,
      tbdCount
    };
  }, [leads]);

  // ── Step 3: Delivery & Payments Tab Filtered Leads (Won Deals Only) ────────
  const wonLeads = useMemo(() => {
    return leads.filter(l => {
      if (l.status !== 'won') return false;
      const q = searchQuery.toLowerCase();
      const matchesQuery = !searchQuery ||
        l.contact_name.toLowerCase().includes(q) ||
        (l.company_name && l.company_name.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        l.interested_service.toLowerCase().includes(q) ||
        (l.services && l.services.some(s => s.toLowerCase().includes(q)));

      const matchesDelivery = deliveryFilter === 'all' || (l.delivery_status || 'not_started') === deliveryFilter;
      const matchesPayment = deliveryPaymentFilter === 'all' || (l.payment_status || 'unpaid') === deliveryPaymentFilter;

      return matchesQuery && matchesDelivery && matchesPayment;
    });
  }, [leads, searchQuery, deliveryFilter, deliveryPaymentFilter]);

  // ── Delivery Fulfillment & Financial KPI Stats ─────────────────────────────
  const deliveryStats = useMemo(() => {
    const allWon = leads.filter(l => l.status === 'won');
    const totalWonCount = allWon.length;
    const notStarted = allWon.filter(l => !l.delivery_status || l.delivery_status === 'not_started').length;
    const inProgress = allWon.filter(l => l.delivery_status === 'in_progress').length;
    const completed = allWon.filter(l => l.delivery_status === 'completed').length;
    const totalWonValue = allWon.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const totalPaid = allWon.reduce((acc, l) => acc + (Number(l.total_paid) || 0), 0);
    const totalPending = Math.max(0, totalWonValue - totalPaid);
    const fullyPaidCount = allWon.filter(l => l.payment_status === 'fully_paid').length;

    return {
      totalWonCount,
      notStarted,
      inProgress,
      completed,
      totalWonValue,
      totalPaid,
      totalPending,
      fullyPaidCount
    };
  }, [leads]);

  // ── Step 4: Recurring Work Retainers Memos ─────────────────────────────────
  const allRecurringJobs = useMemo(() => {
    const list: Array<{ lead: CRMLead; job: RecurringJob }> = [];
    leads.forEach(lead => {
      if (Array.isArray(lead.recurring_jobs)) {
        lead.recurring_jobs.forEach(job => {
          list.push({ lead, job });
        });
      }
    });
    return list;
  }, [leads]);

  const filteredRecurringJobs = useMemo(() => {
    return allRecurringJobs.filter(({ lead, job }) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery = !searchQuery ||
        lead.contact_name.toLowerCase().includes(q) ||
        (lead.company_name && lead.company_name.toLowerCase().includes(q)) ||
        job.service.toLowerCase().includes(q) ||
        (job.period && job.period.toLowerCase().includes(q));

      const matchesFreq = recurringFrequencyFilter === 'all' || job.frequency === recurringFrequencyFilter;
      const matchesStatus = recurringStatusFilter === 'all' || (job.status || 'pending') === recurringStatusFilter;

      return matchesQuery && matchesFreq && matchesStatus;
    });
  }, [allRecurringJobs, searchQuery, recurringFrequencyFilter, recurringStatusFilter]);

  const recurringStats = useMemo(() => {
    let mrr = 0;
    let completedThisCycle = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    const today = new Date().toISOString().split('T')[0];

    allRecurringJobs.forEach(({ job }) => {
      mrr += calculateMRR(job.fee, job.frequency);
      if (job.status === 'completed') {
        completedThisCycle++;
      } else {
        pendingCount++;
        if (job.next_due && job.next_due < today) {
          overdueCount++;
        }
      }
    });

    const arr = mrr * 12;

    return {
      mrr,
      arr,
      activeCount: allRecurringJobs.length,
      completedThisCycle,
      pendingCount,
      overdueCount
    };
  }, [allRecurringJobs]);

  // ── Step 5: Executive Sales Dashboard Analytics (17 KPIs & 6 Chart Datasets) ──
  const dashboardData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const filtered = leads.filter(l => {
      if (dashOwnerFilter !== 'all' && l.owner !== dashOwnerFilter) return false;
      if (dashDeptFilter !== 'all' && l.department_id !== dashDeptFilter) return false;

      if (dashPeriodFilter !== 'all') {
        const leadDate = new Date(l.created_at);
        if (dashPeriodFilter === 'this_month' && leadDate < startOfMonth) return false;
        if (dashPeriodFilter === 'this_quarter' && leadDate < startOfQuarter) return false;
        if (dashPeriodFilter === 'this_year' && leadDate < startOfYear) return false;
      }
      return true;
    });

    // 17 Executive KPIs
    const totalLeads = filtered.length;
    const wonLeadsList = filtered.filter(l => l.status === 'won');
    const lostLeadsList = filtered.filter(l => l.status === 'lost');
    const openLeadsList = filtered.filter(l => l.status !== 'won' && l.status !== 'lost');

    const totalOpenPipeline = openLeadsList.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const weightedForecast = openLeadsList.reduce((acc, l) => {
      const val = Number(l.estimated_value) || 0;
      const prob = typeof l.probability === 'number' ? l.probability : (STAGE_CONFIG[l.status]?.probability ?? 10);
      return acc + (val * prob) / 100;
    }, 0);
    const wonRevenue = wonLeadsList.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const avgDealSize = wonLeadsList.length > 0
      ? wonRevenue / wonLeadsList.length
      : (totalLeads > 0 ? (totalOpenPipeline + wonRevenue) / totalLeads : 0);

    const closedCount = wonLeadsList.length + lostLeadsList.length;
    const winRate = closedCount > 0
      ? Math.round((wonLeadsList.length / closedCount) * 100)
      : (totalLeads > 0 ? Math.round((wonLeadsList.length / totalLeads) * 100) : 0);

    const collectedCash = wonLeadsList.reduce((acc, l) => acc + (Number(l.total_paid) || 0), 0);
    const pendingReceivables = Math.max(0, wonRevenue - collectedCash);
    const collectionEfficiency = wonRevenue > 0 ? Math.round((collectedCash / wonRevenue) * 100) : 0;
    const fullyPaidCount = wonLeadsList.filter(l => l.payment_status === 'fully_paid').length;
    const withBalanceCount = wonLeadsList.length - fullyPaidCount;

    const overdueFollowups = openLeadsList.filter(l => isFollowUpOverdue(l.next_followup)).length;

    let mrr = 0;
    let overdueRetainers = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    filtered.forEach(l => {
      if (Array.isArray(l.recurring_jobs)) {
        l.recurring_jobs.forEach(job => {
          mrr += calculateMRR(job.fee, job.frequency);
          if (job.status !== 'completed' && job.next_due && job.next_due < todayStr) {
            overdueRetainers++;
          }
        });
      }
    });
    const arr = mrr * 12;

    // ── CHART 1: Funnel by 7 Stages ──────────────────────────────
    const funnelStages = PIPELINE_COLUMNS.map(col => {
      const stageLeads = filtered.filter(l => l.status === col.id);
      const stageValue = stageLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
      return {
        id: col.id,
        labelEn: col.labelEn,
        labelAr: col.labelAr,
        count: stageLeads.length,
        value: stageValue,
        probability: col.probability,
        color: col.color,
        bg: col.bg,
        border: col.border
      };
    });

    // ── CHART 2: Weighted vs Nominal Value by Stage ──────────────
    const weightedComparison = PIPELINE_COLUMNS.map(col => {
      const stageLeads = filtered.filter(l => l.status === col.id);
      const nominal = stageLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
      const weighted = (nominal * col.probability) / 100;
      return {
        stage: col.id,
        labelEn: col.labelEn,
        labelAr: col.labelAr,
        nominal,
        weighted,
        probability: col.probability
      };
    });

    // ── CHART 3: Service Demand & Revenue Distribution ───────────
    const serviceMap: Record<string, { count: number; value: number }> = {};
    filtered.forEach(l => {
      const srvList = l.services && l.services.length > 0 ? l.services : [l.interested_service || 'Other'];
      const leadVal = (Number(l.estimated_value) || 0) / srvList.length;
      srvList.forEach(s => {
        if (!serviceMap[s]) serviceMap[s] = { count: 0, value: 0 };
        serviceMap[s].count++;
        serviceMap[s].value += leadVal;
      });
    });
    const serviceDistribution = Object.entries(serviceMap)
      .map(([service, data]) => ({ service, count: data.count, value: data.value }))
      .sort((a, b) => b.value - a.value);

    // ── CHART 4: B2B Partner Referral Performance ────────────────
    const partnerMap: Record<string, { totalLeads: number; wonLeads: number; revenue: number }> = {};
    DEFAULT_B2B_PARTNERS.forEach(p => {
      partnerMap[p] = { totalLeads: 0, wonLeads: 0, revenue: 0 };
    });
    filtered.forEach(l => {
      const partner = l.b2b_partner || 'None, direct client';
      if (!partnerMap[partner]) {
        partnerMap[partner] = { totalLeads: 0, wonLeads: 0, revenue: 0 };
      }
      partnerMap[partner].totalLeads++;
      if (l.status === 'won') {
        partnerMap[partner].wonLeads++;
        partnerMap[partner].revenue += Number(l.estimated_value) || 0;
      }
    });
    const partnerPerformance = Object.entries(partnerMap)
      .map(([partner, data]) => ({
        partner,
        totalLeads: data.totalLeads,
        wonLeads: data.wonLeads,
        conversionRate: data.totalLeads > 0 ? Math.round((data.wonLeads / data.totalLeads) * 100) : 0,
        revenue: data.revenue
      }))
      .filter(p => p.totalLeads > 0 || p.partner !== 'None, direct client')
      .sort((a, b) => b.revenue - a.revenue);

    // ── CHART 5: Delivery Fulfillment Status ──────────────────────
    const deliveryNotStarted = wonLeadsList.filter(l => !l.delivery_status || l.delivery_status === 'not_started').length;
    const deliveryInProgress = wonLeadsList.filter(l => l.delivery_status === 'in_progress').length;
    const deliveryCompleted = wonLeadsList.filter(l => l.delivery_status === 'completed').length;

    // ── CHART 6: Cash Collection vs Receivables Breakdown ─────────
    const cashRatio = {
      wonRevenue,
      collectedCash,
      pendingReceivables,
      collectionEfficiency
    };

    return {
      kpis: {
        totalLeads,
        openLeads: openLeadsList.length,
        wonCount: wonLeadsList.length,
        lostCount: lostLeadsList.length,
        totalOpenPipeline,
        weightedForecast,
        wonRevenue,
        avgDealSize,
        winRate,
        collectedCash,
        pendingReceivables,
        collectionEfficiency,
        fullyPaidCount,
        withBalanceCount,
        mrr,
        arr,
        overdueFollowups,
        overdueRetainers
      },
      charts: {
        funnelStages,
        weightedComparison,
        serviceDistribution,
        partnerPerformance,
        deliveryBreakdown: {
          notStarted: deliveryNotStarted,
          inProgress: deliveryInProgress,
          completed: deliveryCompleted,
          total: wonLeadsList.length
        },
        cashRatio
      }
    };
  }, [leads, dashOwnerFilter, dashDeptFilter, dashPeriodFilter]);

  // ── Step 6: B2B Partners Directory & Export Handlers ───────────────────────
  const allAvailablePartners = useMemo(() => {
    const set = new Set<string>(DEFAULT_B2B_PARTNERS);
    customPartners.forEach(p => set.add(p));
    leads.forEach(l => {
      if (l.b2b_partner) set.add(l.b2b_partner);
    });
    return Array.from(set);
  }, [customPartners, leads]);

  const b2bPartnersData = useMemo(() => {
    const list = allAvailablePartners.map(partnerName => {
      const partnerLeads = leads.filter(l => (l.b2b_partner || 'None, direct client') === partnerName);
      const wonDeals = partnerLeads.filter(l => l.status === 'won');
      const totalVolume = partnerLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
      const wonRevenue = wonDeals.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
      const conversionRate = partnerLeads.length > 0 ? Math.round((wonDeals.length / partnerLeads.length) * 100) : 0;
      const commissionRate = partnerCommissionMap[partnerName] ?? (partnerName.includes('None') ? 0 : 10);
      const estimatedCommission = (wonRevenue * commissionRate) / 100;

      return {
        name: partnerName,
        totalLeads: partnerLeads.length,
        wonCount: wonDeals.length,
        totalVolume,
        wonRevenue,
        conversionRate,
        commissionRate,
        estimatedCommission,
        recentLeads: partnerLeads.slice(0, 5)
      };
    });

    const filtered = list.filter(p => !partnerSearchQuery || p.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()));
    const institutionalPartners = list.filter(p => p.name !== 'None, direct client');
    const totalPartnersCount = institutionalPartners.length;
    const totalReferredLeads = institutionalPartners.reduce((acc, p) => acc + p.totalLeads, 0);
    const totalReferredWonRevenue = institutionalPartners.reduce((acc, p) => acc + p.wonRevenue, 0);
    const totalCommissionPayable = list.reduce((acc, p) => acc + p.estimatedCommission, 0);

    return {
      partners: filtered.sort((a, b) => b.wonRevenue - a.wonRevenue),
      totalPartnersCount,
      totalReferredLeads,
      totalReferredWonRevenue,
      totalCommissionPayable
    };
  }, [allAvailablePartners, leads, partnerCommissionMap, partnerSearchQuery]);

  const handleExportCSV = (targetLeads = leads, filenamePrefix = 'maisarah-crm-deals') => {
    const headers = [
      'ID',
      'Contact Name',
      'Company Name',
      'Phone',
      'Email',
      'Source',
      'Services',
      'Department',
      'Deal Value (OMR)',
      'Stage',
      'Win Probability %',
      'Weighted Value (OMR)',
      'Deal Owner',
      'B2B Partner',
      'Expected Close Date',
      'Next Follow-up Date',
      'Delivery Status',
      'Expected Completion',
      'Completed At',
      'Total Paid (OMR)',
      'Pending Balance (OMR)',
      'Payment Status',
      'Next Payment Due',
      'Payments Count',
      'Created At',
      'Notes'
    ];

    const rows = targetLeads.map(l => {
      const dealVal = Number(l.estimated_value) || 0;
      const prob = typeof l.probability === 'number' ? l.probability : (STAGE_CONFIG[l.status]?.probability ?? 10);
      const weightedVal = (dealVal * prob) / 100;
      const servicesStr = (l.services && l.services.length > 0 ? l.services : [l.interested_service || '']).join('; ');
      const totalPaid = Number(l.total_paid) || 0;
      const pendingBal = Math.max(0, dealVal - totalPaid);

      return [
        l.id,
        l.contact_name,
        l.company_name || '',
        l.phone || '',
        l.email || '',
        l.source || '',
        servicesStr,
        l.department_id || '',
        dealVal.toFixed(3),
        STAGE_CONFIG[l.status]?.labelEn || l.status,
        `${prob}%`,
        weightedVal.toFixed(3),
        l.owner || '',
        l.b2b_partner || '',
        l.expected_close || '',
        l.next_followup || '',
        l.delivery_status || 'not_started',
        l.expected_completion || '',
        l.completed_at ? new Date(l.completed_at).toISOString().split('T')[0] : '',
        totalPaid.toFixed(3),
        pendingBal.toFixed(3),
        l.payment_status || 'unpaid',
        l.payment_due_date || '',
        l.payments?.length || 0,
        l.created_at ? new Date(l.created_at).toISOString().split('T')[0] : '',
        (l.user_notes || '').replace(/[\r\n]+/g, ' ')
      ];
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      show: true,
      title: isAr ? 'تم تصدير ملف CSV بنجاح' : 'CSV Export Completed',
      message: isAr
        ? `تم تنزيل بيانات ${targetLeads.length} صفقة متضمنةً كافة التفاصيل المالية والخدمات.`
        : `Exported ${targetLeads.length} deals with complete financial and service data.`,
      type: 'success'
    });
  };

  const handleSaveNewPartner = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newPartnerName.trim();
    if (!cleanName) return;

    if (!customPartners.includes(cleanName) && !DEFAULT_B2B_PARTNERS.includes(cleanName)) {
      const updated = [...customPartners, cleanName];
      setCustomPartners(updated);
      try {
        localStorage.setItem('maisarah_crm_custom_partners', JSON.stringify(updated));
      } catch {}
    }

    const updatedCommissions = {
      ...partnerCommissionMap,
      [cleanName]: Number(newPartnerCommission) || 10
    };
    setPartnerCommissionMap(updatedCommissions);
    try {
      localStorage.setItem('maisarah_crm_partner_commissions', JSON.stringify(updatedCommissions));
    } catch {}

    setToast({
      show: true,
      title: isAr ? 'تمت إضافة الشريك بنجاح' : 'Partner Added Successfully',
      message: isAr ? `تم تسجيل "${cleanName}" بعمولة إحالة ${newPartnerCommission}%.` : `Registered "${cleanName}" with ${newPartnerCommission}% commission.`,
      type: 'success'
    });

    setNewPartnerName('');
    setIsAddPartnerModalOpen(false);
  };

  const handleUpdatePartnerCommission = (partnerName: string, rate: number) => {
    const updated = {
      ...partnerCommissionMap,
      [partnerName]: rate
    };
    setPartnerCommissionMap(updated);
    try {
      localStorage.setItem('maisarah_crm_partner_commissions', JSON.stringify(updated));
    } catch {}
  };

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
                {isAr ? 'إدارة المبيعات والفرص (Sales CRM)' : 'Sales CRM Pipeline & Forecast'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <ShieldCheck size={14} />
                {isAr ? 'قواعد الإغلاق الذكية والتقدير الموزون' : 'Weighted Forecast & Strict Rules'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {isAr ? 'خط أنابيب المبيعات والصفقات' : 'Sales Pipeline & Deal Flow'}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
              {isAr
                ? 'تابع مسار الفرص عبر المراحل الـ 7 مع احتساب احتمالية الفوز التلقائية والتقدير المالي الموزون، وقواعد العمل الصارمة قبل اعتماد الصفقات الناجحة (Won).'
                : 'Manage prospective deals across 7 structured stages with automated probability weighting, weighted forecasts, and strict closing validation rules.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLeads()}
              className="p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl border border-gray-200 shadow-xs transition-colors cursor-pointer"
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV()}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-2xl font-black text-xs border border-gray-200 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              title={isAr ? 'تصدير كامل بيانات الصفقات بصيغة CSV' : 'Export deals to CSV'}
            >
              <Download size={16} className="text-gray-600" />
              <span className="hidden sm:inline">{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-[#A11212] hover:bg-[#850e0e] text-white px-5 py-3 rounded-2xl font-black text-xs shadow-md shadow-[#A11212]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>{isAr ? 'إضافة صفقة جديدة' : 'Add Lead'}</span>
            </button>
          </div>
        </div>

        {/* Pipeline KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-8 pt-6 border-t border-gray-100">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {isAr ? 'قيمة خط الأنابيب المفتوح' : 'Open Pipeline'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-xl font-black text-gray-900">OMR {formatOMR(stats.totalOpenPipeline)}</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {stats.tbdCount > 0 ? (isAr ? `${stats.tbdCount} صفقات قيد التسعير` : `${stats.tbdCount} Price TBD`) : (isAr ? 'جميع الصفقات مسعرة' : 'All deals priced')}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs bg-purple-50/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
              {isAr ? 'التوقع الموزون (Weighted)' : 'Weighted Forecast'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-xl font-black text-purple-900">OMR {formatOMR(stats.weightedForecast)}</p>
            </div>
            <p className="text-[10px] text-purple-600 font-semibold mt-1">
              {isAr ? 'القيمة × نسبة الاحتمالية' : 'Value × Probability %'}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs bg-emerald-50/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              {isAr ? 'الصفقات الناجحة (Won)' : 'Won Revenue'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-xl font-black text-emerald-800">OMR {formatOMR(stats.wonTotalValue)}</p>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {stats.wonCount} {isAr ? 'صفقة' : 'deals'}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
              {isAr ? 'معدل النجاح (Win Rate)' : 'Win Rate'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-xl font-black text-blue-900">{stats.winRate}%</p>
              <span className="text-[10px] font-bold text-gray-400">
                {stats.wonCount}/{stats.wonCount + stats.lostCount} {isAr ? 'مغلقة' : 'closed'}
              </span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border shadow-xs ${
            stats.overdueFollowups > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-gray-100'
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${
              stats.overdueFollowups > 0 ? 'text-rose-700' : 'text-gray-400'
            }`}>
              {isAr ? 'المتابعات المتأخرة' : 'Overdue Follow-ups'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className={`text-xl font-black ${
                stats.overdueFollowups > 0 ? 'text-rose-700' : 'text-gray-900'
              }`}>
                {stats.overdueFollowups}
              </p>
              {stats.overdueFollowups > 0 && (
                <span className="text-[10px] font-black text-rose-700 animate-pulse">
                  {isAr ? 'تحتاج إجراء ⚠️' : 'Action Due ⚠️'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Master CRM Tabs Navigation (User Blueprint) ────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl overflow-x-auto border border-gray-200/60 shadow-2xs">
        {/* Tab 1: Dashboard (Step 5) */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <TrendingUp size={15} className={activeTab === 'dashboard' ? 'text-[#A11212]' : 'text-gray-400'} />
          <span>{isAr ? 'لوحة المؤشرات' : 'Dashboard'}</span>
        </button>

        {/* Tab 2: Pipeline (board) */}
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'pipeline'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Layers size={15} className={activeTab === 'pipeline' ? 'text-[#A11212]' : 'text-gray-400'} />
          <span>{isAr ? 'لوحة خط الأنابيب' : 'Pipeline (board)'}</span>
          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
            {leads.length}
          </span>
        </button>

        {/* Tab 3: All leads (table) */}
        <button
          type="button"
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'table'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Users size={15} className={activeTab === 'table' ? 'text-[#A11212]' : 'text-gray-400'} />
          <span>{isAr ? 'جميع الصفقات (جدول)' : 'All leads (table)'}</span>
        </button>

        {/* Tab 4: Delivery & payments (Step 3) */}
        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'delivery'
              ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-emerald-500/30'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <CheckSquare size={15} className={activeTab === 'delivery' ? 'text-emerald-600' : 'text-gray-400'} />
          <span>{isAr ? 'التنفيذ والمدفوعات' : 'Delivery & payments'}</span>
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            {stats.wonCount} {isAr ? 'صفقة' : 'won'}
          </span>
        </button>

        {/* Tab 5: Recurring work (Step 4) */}
        <button
          type="button"
          onClick={() => setActiveTab('recurring')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'recurring'
              ? 'bg-white text-gray-900 shadow-xs ring-1 ring-[#A11212]/30'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <RefreshCw size={15} className={activeTab === 'recurring' ? 'text-[#A11212]' : 'text-gray-400'} />
          <span>{isAr ? 'الأعمال الدورية' : 'Recurring work'}</span>
          <span className="bg-red-50 text-[#A11212] px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            {recurringStats.activeCount}
          </span>
        </button>

        {/* Tab 6: B2B partners (Step 6) */}
        <button
          type="button"
          onClick={() => setActiveTab('partners')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'partners'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Briefcase size={15} className={activeTab === 'partners' ? 'text-purple-600' : 'text-gray-400'} />
          <span>{isAr ? 'شركاء الأعمال' : 'B2B partners'}</span>
        </button>
      </div>

      {/* ── Search & Filter Controls (Pipeline & Table views) ──────────── */}
      {(activeTab === 'pipeline' || activeTab === 'table') && (
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

            {/* Partner Filter (Step 6) */}
            <select
              value={partnerFilter}
              onChange={e => setPartnerFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#A11212]"
            >
              <option value="all">{isAr ? 'جميع الشركاء' : 'All Partners'}</option>
              {allAvailablePartners.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'pipeline' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {isAr ? 'لوحة كانبان' : 'Kanban'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {isAr ? 'جدول البيانات' : 'Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KANBAN BOARD VIEW (7 STAGES) ─────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[600px] scrollbar-thin">
          {PIPELINE_COLUMNS.map(col => {
            const colLeads = filteredLeads.filter(l => l.status === col.id);
            const colTotalValue = colLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
            const colWeightedValue = colLeads.reduce((acc, l) => {
              const val = Number(l.estimated_value) || 0;
              const prob = typeof l.probability === 'number' ? l.probability : col.probability;
              return acc + (val * prob) / 100;
            }, 0);

            return (
              <div
                key={col.id}
                className={`w-80 shrink-0 rounded-3xl border ${col.border} ${col.bg} p-3.5 flex flex-col`}
              >
                {/* Column Header */}
                <div className="pb-3 border-b border-gray-200/60 mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        col.id === 'won' ? 'bg-emerald-500' :
                        col.id === 'lost' ? 'bg-rose-500' :
                        col.id === 'proposal_sent' ? 'bg-amber-500' :
                        col.id === 'negotiation' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}></span>
                      <h3 className={`font-black text-xs uppercase tracking-wider ${col.color}`}>
                        {isAr ? col.labelAr : col.labelEn}
                      </h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/80 border border-gray-200 text-gray-600">
                        {col.probability}%
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white text-gray-800 text-[10px] font-black border border-gray-200 shadow-2xs">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Column Values (Total & Weighted) */}
                  <div className="flex items-baseline justify-between text-[10px] pt-1 text-gray-500">
                    <span className="font-mono font-bold">
                      OMR {formatOMR(colTotalValue)}
                    </span>
                    <span className="text-purple-700 font-bold" title={isAr ? 'التقدير المالي الموزون' : 'Weighted Forecast'}>
                      ~OMR {formatOMR(colWeightedValue)}
                    </span>
                  </div>
                </div>

                {/* Column Lead Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px] pr-0.5">
                  {colLeads.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200/80 rounded-2xl bg-white/40">
                      <p className="text-[11px] font-bold text-gray-400">{isAr ? 'لا توجد صفقات هنا' : 'No deals in stage'}</p>
                    </div>
                  ) : (
                    colLeads.map(lead => {
                      const linkedQuote = quotationsMap[lead.id];
                      const isQuotedOrAccepted = lead.status === 'proposal_sent' || lead.status === 'won' || !!linkedQuote;
                      const isConverted = !!lead.converted_client_id || lead.status === 'won';
                      const isOverdue = isFollowUpOverdue(lead.next_followup);
                      const weightedVal = ((Number(lead.estimated_value) || 0) * (lead.probability || 0)) / 100;
                      const servs = lead.services && lead.services.length > 0 ? lead.services : (lead.interested_service ? [lead.interested_service] : []);

                      return (
                        <div
                          key={lead.id}
                          className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-gray-300 transition-all space-y-2.5 group"
                        >
                          {/* Header: Title, Edit, Priority */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-black text-xs text-gray-900 group-hover:text-[#A11212] transition-colors truncate">
                                {lead.contact_name}
                              </h4>
                              {lead.company_name && (
                                <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                                  <Building2 size={11} className="text-gray-400 shrink-0" />
                                  <span className="truncate">{lead.company_name}</span>
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(lead)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                                title={isAr ? 'تعديل بيانات الصفقة' : 'Edit Deal'}
                              >
                                <Edit2 size={12} />
                              </button>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                lead.priority === 'urgent' ? 'bg-red-100 text-red-700 animate-pulse' :
                                lead.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                                lead.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {lead.priority}
                              </span>
                            </div>
                          </div>

                          {/* Services Tags */}
                          {servs.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {servs.slice(0, 3).map((s, idx) => (
                                <span key={idx} className="bg-gray-50 border border-gray-200 text-gray-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                  {s}
                                </span>
                              ))}
                              {servs.length > 3 && (
                                <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1 py-0.5 rounded-md">
                                  +{servs.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Deal Value & Win Probability */}
                          <div className="bg-gray-50/90 p-2 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div>
                              {Number(lead.estimated_value) > 0 ? (
                                <div className="font-mono font-black text-emerald-800 text-xs">
                                  OMR {formatOMR(lead.estimated_value)}
                                </div>
                              ) : (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                                  {isAr ? 'السعر قيد التحديد' : 'Price TBD'}
                                </span>
                              )}
                            </div>
                            <div className="text-end">
                              <span className="text-[10px] font-black text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded-md">
                                {lead.probability}% win
                              </span>
                              {Number(lead.estimated_value) > 0 && (
                                <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                                  ~OMR {formatOMR(weightedVal)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payments Tracker Pill */}
                          {Number(lead.estimated_value) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(lead)}
                              className={`w-full flex items-center justify-between p-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                                lead.payment_status === 'fully_paid'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : lead.payment_status === 'partially_paid'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <CreditCard size={11} className="shrink-0" />
                                <span>{isAr ? 'المدفوعات:' : 'Payments:'}</span>
                                <span className="font-black">
                                  {lead.payment_status === 'fully_paid'
                                    ? (isAr ? 'مسدد بالكامل' : 'Paid')
                                    : lead.payment_status === 'partially_paid'
                                      ? (isAr ? 'جزئي' : 'Partial')
                                      : (isAr ? 'غير مسدد' : 'Unpaid')}
                                </span>
                              </div>
                              <span className="font-mono font-black">
                                {formatOMR(lead.total_paid || 0)} / {formatOMR(lead.estimated_value)}
                              </span>
                            </button>
                          )}

                          {/* Owner & B2B Partner Row */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                            {lead.owner && (
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <User size={10} className="text-gray-400" />
                                <span className="truncate max-w-[100px]">{lead.owner}</span>
                              </span>
                            )}
                            {lead.b2b_partner && lead.b2b_partner !== 'None, direct client' && (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                🏢 {lead.b2b_partner}
                              </span>
                            )}
                          </div>

                          {/* Follow-up Date Alert */}
                          {lead.next_followup && (
                            <div className={`text-[10px] font-bold p-1.5 rounded-lg flex items-center gap-1.5 ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-300/80 font-black'
                                : 'bg-gray-50 text-gray-600'
                            }`}>
                              {isOverdue ? <AlertTriangle size={12} className="text-rose-600 shrink-0" /> : <Clock size={11} className="text-gray-400 shrink-0" />}
                              <span>{isOverdue ? (isAr ? `متأخر: ${lead.next_followup}` : `Overdue: ${lead.next_followup}`) : (isAr ? `متابعة: ${lead.next_followup}` : `Follow-up: ${lead.next_followup}`)}</span>
                            </div>
                          )}

                          {/* Contact Info */}
                          <div className="space-y-0.5 text-[10px] text-gray-500 font-medium">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-[#A11212] truncate">
                                <Phone size={10} className="text-gray-400 shrink-0" />
                                <span>{lead.phone}</span>
                              </a>
                            )}
                          </div>

                          {/* Converted Badge */}
                          {isConverted && (
                            <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded-xl border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                              <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                              <span className="truncate">{isAr ? 'تم التحويل لعميل وتوجيه المهمة' : 'Converted & Routed to HOD'}</span>
                            </div>
                          )}

                          {/* Quotation Button */}
                          {isQuotedOrAccepted && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuotationModal(lead)}
                              className="w-full flex items-center justify-between gap-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-2xs cursor-pointer"
                            >
                              <div className="flex items-center gap-1 truncate">
                                <FileText size={12} className="text-purple-700 shrink-0" />
                                <span className="truncate">{isAr ? 'عرض السعر' : 'Quotation'}</span>
                              </div>
                              {linkedQuote && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                  linkedQuote.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-200 text-purple-900'
                                }`}>
                                  {linkedQuote.status}
                                </span>
                              )}
                            </button>
                          )}

                          {/* Portal Access Button */}
                          {lead.portal_access_sent ? (
                            <div className="w-full flex items-center justify-between gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-xl text-[10px] font-black">
                              <span className="flex items-center gap-1 truncate">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>{isAr ? 'بيانات البوابة مرسلة' : 'Portal Sent'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenProvisionModal(lead)}
                                className="text-[9px] underline text-emerald-800 hover:text-emerald-950 cursor-pointer"
                              >
                                {isAr ? 'إعادة' : 'Resend'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenProvisionModal(lead)}
                              className="w-full flex items-center justify-center gap-1 bg-gray-50 hover:bg-red-50 text-[#A11212] border border-red-200/60 px-2 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                            >
                              <UserCheck size={12} />
                              <span>{lead.status === 'won' ? (isAr ? 'تفعيل البوابة' : 'Provision Portal') : (isAr ? 'دعوة النادي' : 'Club Invite')}</span>
                            </button>
                          )}

                          {/* Stage Shift Selector */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                            <span className="text-[9px] font-black uppercase text-gray-400">
                              {isAr ? 'المرحلة:' : 'Stage:'}
                            </span>
                            <select
                              value={lead.status}
                              onChange={e => handleUpdateStatus(lead.id, e.target.value)}
                              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black text-gray-700 focus:outline-none focus:border-[#A11212] cursor-pointer"
                            >
                              <option value="new">{isAr ? 'جديدة (10%)' : 'New (10%)'}</option>
                              <option value="contacted">{isAr ? 'تم التواصل (25%)' : 'Contacted (25%)'}</option>
                              <option value="consultation">{isAr ? 'استشارة (35%)' : 'Consultation (35%)'}</option>
                              <option value="proposal_sent">{isAr ? 'عرض سعر (50%)' : 'Proposal Sent (50%)'}</option>
                              <option value="negotiation">{isAr ? 'تفاوض (75%)' : 'Negotiation (75%)'}</option>
                              <option value="won">{isAr ? 'صفقة ناجحة (100%)' : 'Won (100%)'}</option>
                              <option value="lost">{isAr ? 'ملغاة (0%)' : 'Lost (0%)'}</option>
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
      {activeTab === 'table' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الشركة وجهة الاتصال' : 'Client & Contact'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الخدمات المطلوبة' : 'Services'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'المسؤول والشريك' : 'Owner & Partner'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'المرحلة' : 'Stage'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'قيمة الصفقة' : 'Deal Value'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'الاحتمال والتوقع' : 'Win % / Forecast'}</th>
                  <th className="py-3.5 px-4 text-start">{isAr ? 'المتابعة القادمة' : 'Next Follow-up'}</th>
                  <th className="py-3.5 px-4 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-bold">{isAr ? 'لا توجد صفقات تطابق خيارات البحث' : 'No leads or deals found'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const linkedQuote = quotationsMap[lead.id];
                    const isQuotedOrAccepted = lead.status === 'proposal_sent' || lead.status === 'won' || !!linkedQuote;
                    const isConverted = !!lead.converted_client_id || lead.status === 'won';
                    const stageConf = STAGE_CONFIG[lead.status] || STAGE_CONFIG.new;
                    const displayServices = lead.services && lead.services.length > 0
                      ? lead.services
                      : (lead.interested_service ? [lead.interested_service] : []);
                    const isPriceTbd = !lead.estimated_value || lead.estimated_value <= 0;
                    const prob = typeof lead.probability === 'number' ? lead.probability : stageConf.probability;
                    const weightedVal = lead.estimated_value ? (lead.estimated_value * prob) / 100 : 0;
                    const overdue = isFollowUpOverdue(lead.next_followup);

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Company & Contact */}
                        <td className="py-4 px-4">
                          <div className="font-black text-gray-900 text-sm">
                            {lead.company_name || lead.contact_name}
                          </div>
                          {lead.company_name && (
                            <div className="text-[11px] text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                              <User size={11} className="text-gray-400" />
                              <span>{lead.contact_name}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {lead.phone || lead.email}
                          </div>
                        </td>

                        {/* Services */}
                        <td className="py-4 px-4 max-w-[200px]">
                          {displayServices.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {displayServices.slice(0, 2).map((srv, idx) => (
                                <span key={idx} className="bg-red-50 text-[#A11212] px-2 py-0.5 rounded-lg text-[10px] font-bold border border-red-100">
                                  {srv}
                                </span>
                              ))}
                              {displayServices.length > 2 && (
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-lg text-[9px] font-bold">
                                  +{displayServices.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                              {isAr ? 'لم يحدد بعد' : 'To be decided'}
                            </span>
                          )}
                          <div className="text-[10px] text-gray-400 capitalize mt-1">
                            {isAr ? 'المصدر:' : 'Src:'} {lead.source || 'Direct'}
                          </div>
                        </td>

                        {/* Owner & B2B Partner */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-gray-800 text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>{lead.owner || (isAr ? 'غير محدد' : 'Unassigned')}</span>
                          </div>
                          {lead.b2b_partner && lead.b2b_partner !== 'None, direct client' && (
                            <div className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md mt-1 inline-block truncate max-w-[150px]">
                              {lead.b2b_partner}
                            </div>
                          )}
                        </td>

                        {/* Stage Selector */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <select
                              value={lead.status}
                              onChange={e => handleUpdateStatus(lead.id, e.target.value)}
                              className={`border rounded-xl px-2.5 py-1 text-[11px] font-black cursor-pointer focus:outline-none ${stageConf.bg} ${stageConf.border} ${stageConf.color}`}
                            >
                              <option value="new">{isAr ? 'جديدة (10%)' : 'New (10%)'}</option>
                              <option value="contacted">{isAr ? 'تم التواصل (25%)' : 'Contacted (25%)'}</option>
                              <option value="consultation">{isAr ? 'استشارة (35%)' : 'Consultation (35%)'}</option>
                              <option value="proposal_sent">{isAr ? 'عرض سعر (50%)' : 'Proposal Sent (50%)'}</option>
                              <option value="negotiation">{isAr ? 'تفاوض (75%)' : 'Negotiation (75%)'}</option>
                              <option value="won">{isAr ? 'صفقة ناجحة (100%)' : 'Won (100%)'}</option>
                              <option value="lost">{isAr ? 'ملغاة (0%)' : 'Lost (0%)'}</option>
                            </select>
                            {isConverted && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                                <ShieldCheck size={12} />
                                <span>{isAr ? 'محوّل لعميل' : 'Client Converted'}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Deal Value */}
                        <td className="py-4 px-4 font-mono font-black">
                          {isPriceTbd ? (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase">
                              {isAr ? 'السعر لم يحدد' : 'Price TBD'}
                            </span>
                          ) : (
                            <div>
                              <div className="text-emerald-700 text-xs">
                                OMR {formatOMR(lead.estimated_value)}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(lead)}
                                className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
                                  lead.payment_status === 'fully_paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : lead.payment_status === 'partially_paid'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                }`}
                                title={isAr ? 'فتح دفتر المدفوعات' : 'Open Payment Ledger'}
                              >
                                <CreditCard size={9} />
                                <span>
                                  {lead.payment_status === 'fully_paid'
                                    ? (isAr ? 'مسدد' : 'Paid')
                                    : lead.payment_status === 'partially_paid'
                                      ? (isAr ? `${formatOMR(lead.total_paid || 0)} مسدد` : `${formatOMR(lead.total_paid || 0)} Paid`)
                                      : (isAr ? 'غير مسدد' : 'Unpaid')}
                                </span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Probability & Weighted Forecast */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-gray-800 text-[11px]">
                              {prob}%
                            </span>
                            {!isPriceTbd && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({formatOMR(weightedVal)})
                              </span>
                            )}
                          </div>
                          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full ${prob >= 75 ? 'bg-emerald-500' : prob >= 35 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                        </td>

                        {/* Next Follow-up */}
                        <td className="py-4 px-4">
                          {lead.next_followup ? (
                            <div className="space-y-0.5">
                              <div className={`font-mono text-[11px] font-bold ${overdue ? 'text-red-600 font-black' : 'text-gray-700'}`}>
                                {lead.next_followup}
                              </div>
                              {overdue && (
                                <span className="bg-red-100 text-red-700 px-1.5 py-0.2 rounded text-[9px] font-black uppercase inline-flex items-center gap-0.5">
                                  <AlertCircle size={9} />
                                  <span>{isAr ? 'متأخر' : 'Overdue'}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Payments Ledger Button */}
                            {Number(lead.estimated_value) > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(lead)}
                                className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2 py-1.5 rounded-xl text-[10px] font-black transition-colors cursor-pointer"
                                title={isAr ? 'دفتر الدفعات والأقساط' : 'Payments Ledger'}
                              >
                                <CreditCard size={12} />
                                <span className="hidden sm:inline">{isAr ? 'الدفعات' : 'Ledger'}</span>
                              </button>
                            )}

                            {/* Edit Deal Modal Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(lead)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer"
                              title={isAr ? 'تعديل تفاصيل الصفقة' : 'Edit Deal'}
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Quotation Button */}
                            {isQuotedOrAccepted && (
                              <button
                                type="button"
                                onClick={() => handleOpenQuotationModal(lead)}
                                className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2 py-1.5 rounded-xl text-[10px] font-black transition-colors cursor-pointer"
                                title={isAr ? 'عرض السعر' : 'Quotation'}
                              >
                                <FileText size={12} />
                                <span className="hidden sm:inline">{isAr ? 'العرض' : 'Quote'}</span>
                              </button>
                            )}

                            {/* Portal Access Button */}
                            {lead.portal_access_sent ? (
                              <button
                                type="button"
                                onClick={() => handleOpenProvisionModal(lead)}
                                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1.5 rounded-xl text-[10px] font-black transition-colors cursor-pointer"
                                title={isAr ? 'تم إرسال البوابة' : 'Portal Access Sent'}
                              >
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span className="hidden sm:inline">{isAr ? 'البوابة' : 'Portal'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenProvisionModal(lead)}
                                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-[#A11212] border border-red-200 px-2 py-1.5 rounded-xl text-[10px] font-black transition-colors cursor-pointer"
                                title={isAr ? 'تفعيل بوابة العميل' : 'Provision Portal'}
                              >
                                <UserCheck size={12} />
                                <span className="hidden sm:inline">{lead.status === 'won' ? (isAr ? 'بوابة' : 'Portal') : (isAr ? 'دعوة' : 'Invite')}</span>
                              </button>
                            )}
                          </div>
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

      {/* ── STEP 3: DELIVERY & PAYMENTS FULFILLMENT TAB (WON DEALS ONLY) ── */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {/* Summary Strip (4 KPI Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  {isAr ? 'الإنجاز والتسليم' : 'Delivery Fulfillment'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckSquare size={16} />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-black text-gray-900">
                    {deliveryStats.completed} <span className="text-sm font-bold text-gray-400">/ {deliveryStats.totalWonCount}</span>
                  </p>
                  <span className="text-xs font-black text-emerald-600">
                    {deliveryStats.totalWonCount > 0 ? Math.round((deliveryStats.completed / deliveryStats.totalWonCount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${deliveryStats.totalWonCount > 0 ? (deliveryStats.completed / deliveryStats.totalWonCount) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 mt-2">
                  <span>{deliveryStats.inProgress} {isAr ? 'قيد التنفيذ' : 'in progress'}</span>
                  <span>{deliveryStats.notStarted} {isAr ? 'لم يبدأ' : 'not started'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {isAr ? 'إجمالي قيمة الصفقات (Won)' : 'Total Won Revenue'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
                  <Award size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-gray-900">OMR {formatOMR(deliveryStats.totalWonValue)}</p>
                <p className="text-[10px] font-semibold text-gray-400 mt-1">
                  {deliveryStats.totalWonCount} {isAr ? 'صفقة معتمدة وناجحة' : 'confirmed won contracts'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                  {isAr ? 'إجمالي المقبوضات' : 'Collected Revenue'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard size={16} />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-black text-blue-900">OMR {formatOMR(deliveryStats.totalPaid)}</p>
                  <span className="text-xs font-black text-blue-700">
                    {deliveryStats.totalWonValue > 0 ? Math.round((deliveryStats.totalPaid / deliveryStats.totalWonValue) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-blue-100/60 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${deliveryStats.totalWonValue > 0 ? Math.min(100, (deliveryStats.totalPaid / deliveryStats.totalWonValue) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[10px] font-semibold text-blue-600 mt-2">
                  {isAr ? 'تم تحصيلها وإيداعها في السجل' : 'Collected and ledger recorded'}
                </p>
              </div>
            </div>

            <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
              deliveryStats.totalPending > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  deliveryStats.totalPending > 0 ? 'text-amber-800' : 'text-gray-500'
                }`}>
                  {isAr ? 'الذمم والمتبقي' : 'Outstanding Receivables'}
                </span>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  deliveryStats.totalPending > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-600'
                }`}>
                  <Receipt size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className={`text-2xl font-black ${
                  deliveryStats.totalPending > 0 ? 'text-amber-900' : 'text-gray-900'
                }`}>
                  OMR {formatOMR(deliveryStats.totalPending)}
                </p>
                <div className="flex items-center justify-between text-[10px] font-semibold mt-1">
                  <span className="text-emerald-700">{deliveryStats.fullyPaidCount} {isAr ? 'مسددة بالكامل' : 'fully paid'}</span>
                  <span className="text-amber-700">{deliveryStats.totalWonCount - deliveryStats.fullyPaidCount} {isAr ? 'بذمتهم مبالغ' : 'with balance'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery & Payments Filter Controls */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 ms-1 me-2">{isAr ? 'حالة التنفيذ:' : 'Delivery:'}</span>
              {(['all', 'not_started', 'in_progress', 'completed'] as const).map(statusKey => {
                const isActive = deliveryFilter === statusKey;
                const labels = {
                  all: isAr ? 'الكل' : 'All',
                  not_started: isAr ? 'لم يبدأ' : 'Not Started',
                  in_progress: isAr ? 'قيد التنفيذ' : 'In Progress',
                  completed: isAr ? 'مكتمل' : 'Completed'
                };
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setDeliveryFilter(statusKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#A11212] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {labels[statusKey]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 ms-1 me-2">{isAr ? 'حالة السداد:' : 'Payment:'}</span>
              {(['all', 'unpaid', 'partially_paid', 'fully_paid'] as const).map(pKey => {
                const isActive = deliveryPaymentFilter === pKey;
                const pLabels = {
                  all: isAr ? 'الكل' : 'All',
                  unpaid: isAr ? 'غير مدفوع' : 'Unpaid',
                  partially_paid: isAr ? 'مدفوع جزئياً' : 'Partially Paid',
                  fully_paid: isAr ? 'مسدد بالكامل' : 'Fully Paid'
                };
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setDeliveryPaymentFilter(pKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {pLabels[pKey]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery & Payments Won Deals Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-4 text-start">{isAr ? 'العميل والصفقة' : 'Client & Deal'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'الخدمات المسندة' : 'Services'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'المالية وسجل الدفعات' : 'Finances & Ledger'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'حالة التسليم' : 'Delivery Status'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'المواعيد والإنجاز' : 'Timeline'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'استحقاق الدفعة القادمة' : 'Next Payment Due'}</th>
                    <th className="py-4 px-4 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                  {wonLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400">
                        <CheckSquare size={36} className="mx-auto mb-2 opacity-30 text-emerald-600" />
                        <p className="font-bold text-gray-700 text-sm">
                          {isAr ? 'لا توجد صفقات ناجحة (Won) تطابق الفلتر الحالي' : 'No won deals match your current filters'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {isAr ? 'عند إغلاق صفقات كـ Won في خط الأنابيب، ستظهر هنا تلقائياً لمتابعة التسليم والتحصيل.' : 'Deals marked as Won in the pipeline appear here for fulfillment and collection.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    wonLeads.map(lead => {
                      const totalPaid = Number(lead.total_paid) || 0;
                      const dealValue = Number(lead.estimated_value) || 0;
                      const balance = Math.max(0, dealValue - totalPaid);
                      const isFullyPaid = lead.payment_status === 'fully_paid' || (dealValue > 0 && totalPaid >= dealValue);
                      const isPartiallyPaid = !isFullyPaid && totalPaid > 0;
                      const currentDelivery = lead.delivery_status || 'not_started';

                      const isDueDateOverdue = !isFullyPaid && lead.payment_due_date && new Date(lead.payment_due_date) < new Date(new Date().setHours(0, 0, 0, 0));

                      return (
                        <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* 1. Client & Deal */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-black text-gray-900 text-sm">{lead.contact_name}</p>
                              {lead.company_name && (
                                <p className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mt-0.5">
                                  <Building2 size={12} className="text-gray-400" />
                                  {lead.company_name}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                                {lead.phone && (
                                  <a href={`tel:${lead.phone}`} className="hover:text-emerald-600 flex items-center gap-1">
                                    <Phone size={10} />
                                    <span>{lead.phone}</span>
                                  </a>
                                )}
                                {lead.owner && (
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                    {lead.owner}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Services */}
                          <td className="py-3.5 px-4 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {lead.services && lead.services.length > 0 ? (
                                lead.services.map((srv, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-bold">
                                    {srv}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-bold">
                                  {lead.interested_service}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Deal Value & Ledger Button */}
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-black text-gray-900">OMR {formatOMR(dealValue)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isFullyPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isPartiallyPaid
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isFullyPaid
                                    ? (isAr ? 'مسدد بالكامل' : 'Fully Paid')
                                    : isPartiallyPaid
                                    ? (isAr ? `مدفوع: OMR ${formatOMR(totalPaid)}` : `Paid: OMR ${formatOMR(totalPaid)}`)
                                    : (isAr ? 'غير مدفوع' : 'Unpaid')}
                                </span>
                              </div>
                              {!isFullyPaid && balance > 0 && (
                                <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                                  {isAr ? 'المتبقي:' : 'Bal:'} OMR {formatOMR(balance)}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(lead)}
                                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                <Receipt size={11} />
                                <span>{isAr ? 'سجل الدفعات' : 'Payments Ledger'} ({lead.payments?.length || 0})</span>
                              </button>
                            </div>
                          </td>

                          {/* 4. Delivery Status Selector */}
                          <td className="py-3.5 px-4">
                            <select
                              value={currentDelivery}
                              onChange={e => handleUpdateDeliveryStatus(lead.id, e.target.value as any)}
                              className={`text-xs font-black rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none ${
                                currentDelivery === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : currentDelivery === 'in_progress'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              <option value="not_started">{isAr ? 'لم يبدأ' : 'Not Started'}</option>
                              <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</option>
                              <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
                            </select>
                          </td>

                          {/* 5. Timeline & Completion Dates */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400">
                                  {isAr ? 'الموعد المتوقع للتسليم:' : 'Expected completion:'}
                                </label>
                                <input
                                  type="date"
                                  value={lead.expected_completion || ''}
                                  onChange={e => handleUpdateFulfillmentDate(lead.id, 'expected_completion', e.target.value)}
                                  className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#A11212]"
                                />
                              </div>

                              {lead.completed_at && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit">
                                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                  <span>{isAr ? 'أُنجز في:' : 'Done:'} {new Date(lead.completed_at).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 6. Next Payment Due Date */}
                          <td className="py-3.5 px-4">
                            {isFullyPaid ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>{isAr ? 'تم سداد كامل المبلغ' : 'Paid in full'}</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <input
                                  type="date"
                                  value={lead.payment_due_date || ''}
                                  onChange={e => handleUpdateFulfillmentDate(lead.id, 'payment_due_date', e.target.value)}
                                  className={`text-[11px] font-semibold rounded-lg px-2 py-1 border focus:outline-none ${
                                    isDueDateOverdue
                                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                                      : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-[#A11212]'
                                  }`}
                                />
                                {isDueDateOverdue && (
                                  <p className="text-[10px] font-black text-rose-600 flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    <span>{isAr ? 'مستحق السداد الآن!' : 'Past Due!'}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 7. Actions */}
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(lead)}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors cursor-pointer"
                                title={isAr ? 'قيد دفعة جديدة' : 'Record Payment'}
                              >
                                <DollarSign size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenProvisionModal(lead)}
                                className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-colors cursor-pointer"
                                title={isAr ? 'تفعيل بوابة العميل' : 'Client Portal'}
                              >
                                <UserCheck size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(lead)}
                                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-xl transition-colors cursor-pointer"
                                title={isAr ? 'تعديل الصفقة' : 'Edit Deal'}
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: RECURRING WORK RETAINERS TAB ───────────────────────── */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          {/* Summary Strip (4 KPI Cards: MRR, ARR, Active, Health) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#A11212]">
                  {isAr ? 'الإيراد الشهري المتكرر (MRR)' : 'Monthly Recurring (MRR)'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-red-50 text-[#A11212] flex items-center justify-center font-bold">
                  <DollarSign size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-gray-900">OMR {formatOMR(recurringStats.mrr)}</p>
                <p className="text-[10px] font-semibold text-gray-400 mt-1">
                  {isAr ? 'متوسط الاشتراكات والعقود شهرياً' : 'Normalized monthly retainers'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                  {isAr ? 'الإيراد السنوي المتوقع (ARR)' : 'Annualized Run-Rate (ARR)'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <TrendingUp size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-purple-900">OMR {formatOMR(recurringStats.arr)}</p>
                <p className="text-[10px] font-semibold text-purple-600 mt-1">
                  {isAr ? 'MRR × 12 شهراً' : '12 × Monthly Recurring Revenue'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                  {isAr ? 'عقود الاشتراكات النشطة' : 'Active Retainers'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Briefcase size={16} />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-black text-blue-900">{recurringStats.activeCount}</p>
                  <span className="text-xs font-bold text-gray-400">
                    {isAr ? 'عقود دورية' : 'contracts'}
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-gray-500 mt-1">
                  {isAr ? 'محاسبة شهرية، إقرارات ضريبية وتدقيق' : 'Bookkeeping, VAT, payroll retainers'}
                </p>
              </div>
            </div>

            <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
              recurringStats.overdueCount > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-emerald-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  recurringStats.overdueCount > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {isAr ? 'إنجاز الدورة الحالية' : 'Current Cycle Health'}
                </span>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  recurringStats.overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <CheckSquare size={16} />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-black text-gray-900">
                    {recurringStats.completedThisCycle} <span className="text-sm font-bold text-gray-400">/ {recurringStats.activeCount}</span>
                  </p>
                  <span className={`text-xs font-black ${recurringStats.overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {recurringStats.activeCount > 0 ? Math.round((recurringStats.completedThisCycle / recurringStats.activeCount) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold mt-1">
                  <span className="text-gray-500">{recurringStats.pendingCount} {isAr ? 'قيد التنفيذ' : 'in progress'}</span>
                  {recurringStats.overdueCount > 0 && (
                    <span className="text-rose-600 font-black animate-pulse">
                      {recurringStats.overdueCount} {isAr ? 'متأخرة ⚠️' : 'overdue ⚠️'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Controls & Action Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 ms-1 me-2">{isAr ? 'دورية العقد:' : 'Frequency:'}</span>
              {(['all', 'monthly', 'quarterly', 'half_yearly', 'yearly'] as const).map(freq => {
                const isActive = recurringFrequencyFilter === freq;
                const freqLabels = {
                  all: isAr ? 'الكل' : 'All',
                  monthly: isAr ? 'شهري' : 'Monthly',
                  quarterly: isAr ? 'ربع سنوي' : 'Quarterly',
                  half_yearly: isAr ? 'نصف سنوي' : 'Half-Yearly',
                  yearly: isAr ? 'سنوي' : 'Yearly'
                };
                return (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setRecurringFrequencyFilter(freq)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#A11212] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {freqLabels[freq]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-400 me-1">{isAr ? 'الحالة:' : 'Status:'}</span>
                {(['all', 'pending', 'in_progress', 'completed'] as const).map(st => {
                  const isActive = recurringStatusFilter === st;
                  const stLabels = {
                    all: isAr ? 'الكل' : 'All',
                    pending: isAr ? 'معلق' : 'Pending',
                    in_progress: isAr ? 'جاري' : 'Active',
                    completed: isAr ? 'منجز' : 'Done'
                  };
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRecurringStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {stLabels[st]}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddRecurringModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A11212] hover:bg-[#850e0e] text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer ms-auto lg:ms-0"
              >
                <Plus size={14} />
                <span>{isAr ? 'إضافة عقد دوري جديد' : 'New Recurring Retainer'}</span>
              </button>
            </div>
          </div>

          {/* Retainers Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-4 text-start">{isAr ? 'العميل والشركة' : 'Client & Company'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'الخدمة والدورية' : 'Service & Cycle'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'الرسوم الشهرية / الدورية' : 'Fee & MRR Equiv.'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'الدورة الحالية' : 'Current Period'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'تاريخ الاستحقاق' : 'Next Due Date'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'حالة الإنجاز والفوترة' : 'Status & Billing'}</th>
                    <th className="py-4 px-4 text-end">{isAr ? 'إجراءات التجديد (1-Click)' : '1-Click Rollover / Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                  {filteredRecurringJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400">
                        <RefreshCw size={36} className="mx-auto mb-2 opacity-30 text-[#A11212]" />
                        <p className="font-bold text-gray-700 text-sm">
                          {isAr ? 'لا توجد عقود دورية مسجلة حالياً' : 'No recurring retainers found'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                          {isAr
                            ? 'يمكنك إضافة عقود مسك الدفاتر الشهرية، الإقرارات الضريبية الدورية، أو الاستشارات عبر زر "إضافة عقد دوري جديد" أعلاه.'
                            : 'Add monthly accounting, recurring VAT returns, or advisory retainers with 1-Click Auto Rollover.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenAddRecurringModal()}
                          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>{isAr ? 'إنشاء أول عقد دوري' : 'Add First Retainer'}</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredRecurringJobs.map(({ lead, job }) => {
                      const mrrContribution = calculateMRR(job.fee, job.frequency);
                      const isPastDue = job.next_due && new Date(job.next_due) < new Date(new Date().setHours(0, 0, 0, 0)) && job.status !== 'completed';

                      const freqBadgeConfig = {
                        monthly: { labelAr: 'شهري', labelEn: 'Monthly', bg: 'bg-blue-100 text-blue-800' },
                        quarterly: { labelAr: 'ربع سنوي', labelEn: 'Quarterly', bg: 'bg-purple-100 text-purple-800' },
                        half_yearly: { labelAr: 'نصف سنوي', labelEn: 'Half-Yearly', bg: 'bg-amber-100 text-amber-800' },
                        yearly: { labelAr: 'سنوي', labelEn: 'Yearly', bg: 'bg-emerald-100 text-emerald-800' }
                      }[job.frequency] || { labelAr: job.frequency, labelEn: job.frequency, bg: 'bg-gray-100 text-gray-800' };

                      return (
                        <tr key={job.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* 1. Client & Company */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-black text-gray-900 text-sm">{lead.contact_name}</p>
                              {lead.company_name && (
                                <p className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mt-0.5">
                                  <Building2 size={12} className="text-gray-400" />
                                  {lead.company_name}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                                {lead.phone && (
                                  <a href={`tel:${lead.phone}`} className="hover:text-emerald-600 flex items-center gap-1">
                                    <Phone size={10} />
                                    <span>{lead.phone}</span>
                                  </a>
                                )}
                                {lead.owner && (
                                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-semibold">
                                    {lead.owner}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Service & Cycle */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-gray-900">{job.service}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${freqBadgeConfig.bg}`}>
                                  {isAr ? freqBadgeConfig.labelAr : freqBadgeConfig.labelEn}
                                </span>
                                {(job.cycle_count || 1) > 1 && (
                                  <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                    {isAr ? `دورة #${job.cycle_count}` : `Cycle #${job.cycle_count}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Fee & MRR Equiv. */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-black text-gray-900 text-sm">OMR {formatOMR(job.fee)}</p>
                              {job.frequency !== 'monthly' && (
                                <p className="text-[10px] font-semibold text-purple-700 mt-0.5">
                                  MRR: OMR {formatOMR(mrrContribution)}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 4. Current Period */}
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg">
                                {job.period || (isAr ? 'الدورة الحالية' : 'Current')}
                              </span>
                              {job.last_rollover_at && (
                                <p className="text-[9px] font-semibold text-gray-400 mt-1">
                                  {isAr ? 'آخر ترحيل:' : 'Last rollover:'} {new Date(job.last_rollover_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 5. Next Due Date */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className={`font-semibold text-xs ${isPastDue ? 'text-rose-700 font-black' : 'text-gray-700'}`}>
                                {job.next_due || '—'}
                              </p>
                              {isPastDue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5 border border-rose-200">
                                  <AlertTriangle size={10} />
                                  <span>{isAr ? 'مستحق الآن!' : 'Past Due!'}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. Status & Billing Check */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              <select
                                value={job.status || 'pending'}
                                onChange={e => handleUpdateRecurringStatus(lead.id, job.id, e.target.value as any)}
                                className={`text-[11px] font-black rounded-lg px-2 py-1 border transition-all cursor-pointer focus:outline-none ${
                                  job.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : job.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <option value="pending">{isAr ? 'معلق' : 'Pending'}</option>
                                <option value="in_progress">{isAr ? 'قيد الإنجاز' : 'In Progress'}</option>
                                <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
                              </select>

                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeeReceived(lead.id, job.id, !job.fee_received)}
                                  className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                    job.fee_received
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                  }`}
                                  title={isAr ? 'تبديل حالة استلام الأتعاب' : 'Toggle Fee Received'}
                                >
                                  {job.fee_received ? (
                                    <>
                                      <CheckCircle2 size={11} className="text-emerald-600" />
                                      <span>{isAr ? 'تم استلام الأتعاب' : 'Fee Received'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={11} className="text-gray-400" />
                                      <span>{isAr ? 'بانتظار التحصيل' : 'Pending Fee'}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 7. 1-Click Action & Rollover */}
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click Auto Rollover Button */}
                              <button
                                type="button"
                                onClick={() => handleRolloverRecurringJob(lead.id, job.id)}
                                className="inline-flex items-center gap-1.5 bg-[#A11212] hover:bg-[#850e0e] text-white px-2.5 py-1.5 rounded-xl text-[11px] font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                                title={isAr ? 'إنجاز الدورة الحالية وترحيل العقد تلقائياً للدورة القادمة' : 'Mark done & advance to next period automatically'}
                              >
                                <RefreshCw size={12} className="shrink-0" />
                                <span>{isAr ? 'إنجاز وترحيل 1-Click' : '1-Click Rollover'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditRecurringModal(lead.id, job)}
                                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-xl transition-colors cursor-pointer"
                                title={isAr ? 'تعديل العقد' : 'Edit Retainer'}
                              >
                                <Edit2 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteRecurringJob(lead.id, job.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors cursor-pointer"
                                title={isAr ? 'حذف العقد' : 'Delete Retainer'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT RECURRING RETAINER (STEP 4) ────────────────── */}
      {isAddRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden my-8" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#A11212] text-white flex items-center justify-center font-black shadow-md shadow-[#A11212]/20">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingRecurringJob
                      ? (isAr ? 'تعديل العقد الدوري' : 'Edit Recurring Retainer')
                      : (isAr ? 'إضافة عقد واشتراك دوري' : 'Add Recurring Retainer')}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {isAr ? 'محاسبة دورية وإقرارات ضريبية مع التجديد التلقائي' : 'Retainer agreement with automated rollover'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRecurringModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecurringJob} className="p-6 space-y-4">
              {recurringError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{recurringError}</span>
                </div>
              )}

              {/* Target Client / Lead Selector */}
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  {isAr ? 'العميل أو الصفقة *' : 'Target Client / Deal *'}
                </label>
                <select
                  value={recurringForm.lead_id}
                  disabled={!!editingRecurringJob}
                  onChange={e => setRecurringForm(prev => ({ ...prev, lead_id: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#A11212] disabled:opacity-60"
                  required
                >
                  <option value="">{isAr ? '-- اختر العميل --' : '-- Select Client --'}</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.contact_name} {l.company_name ? `(${l.company_name})` : ''} - {STAGE_CONFIG[l.status]?.labelEn || l.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  {isAr ? 'الخدمة المتعاقد عليها *' : 'Contracted Service *'}
                </label>
                <select
                  value={recurringForm.service}
                  onChange={e => setRecurringForm(prev => ({ ...prev, service: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#A11212]"
                  required
                >
                  {recurringForm.service && !SPEC_SERVICES.some(s => s.en === recurringForm.service || s.id === recurringForm.service) && (
                    <option value={recurringForm.service}>{recurringForm.service}</option>
                  )}
                  {SPEC_SERVICES.map(srv => (
                    <option key={srv.id} value={srv.en}>
                      {isAr ? srv.ar : srv.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency & Fee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    {isAr ? 'الدورية *' : 'Frequency *'}
                  </label>
                  <select
                    value={recurringForm.frequency}
                    onChange={e => setRecurringForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#A11212]"
                  >
                    <option value="monthly">{isAr ? 'شهري' : 'Monthly'}</option>
                    <option value="quarterly">{isAr ? 'ربع سنوي' : 'Quarterly'}</option>
                    <option value="half_yearly">{isAr ? 'نصف سنوي' : 'Half-Yearly'}</option>
                    <option value="yearly">{isAr ? 'سنوي' : 'Yearly'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    {isAr ? 'الرسوم الدورية (OMR) *' : 'Recurring Fee (OMR) *'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="1"
                    value={recurringForm.fee}
                    onChange={e => setRecurringForm(prev => ({ ...prev, fee: e.target.value }))}
                    placeholder="150.000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    required
                  />
                </div>
              </div>

              {/* Period & Next Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    {isAr ? 'اسم الدورة الحالية' : 'Current Period Name'}
                  </label>
                  <input
                    type="text"
                    value={recurringForm.period}
                    onChange={e => setRecurringForm(prev => ({ ...prev, period: e.target.value }))}
                    placeholder="2026-10 or Q4 2026"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    {isAr ? 'تاريخ الاستحقاق *' : 'Next Due Date *'}
                  </label>
                  <input
                    type="date"
                    value={recurringForm.next_due}
                    onChange={e => setRecurringForm(prev => ({ ...prev, next_due: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  {isAr ? 'ملاحظات وشروط العقد' : 'Retainer Notes & Terms'}
                </label>
                <textarea
                  rows={2}
                  value={recurringForm.notes}
                  onChange={e => setRecurringForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={isAr ? 'تفاصيل نطاق العمل، شروط الفوترة...' : 'Scope details, invoicing terms...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRecurringModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingRecurring}
                  className="px-5 py-2 bg-[#A11212] hover:bg-[#850e0e] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingRecurring && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isAr ? 'حفظ العقد الدوري' : 'Save Retainer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STEP 5: SALES EXECUTIVE DASHBOARD ──────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive Visual Dashboard (Matching Reference Layout in Maisarah Colors) */}
          <ModernCRMDashboard
            isAr={isAr}
            leads={leads}
            clients={[]}
            onOpenAddDeal={() => setIsAddModalOpen(true)}
            onViewAllDeals={() => setActiveTab('pipeline')}
          />
          {/* Dashboard Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 ms-1 me-2">{isAr ? 'الفترة الزمنية:' : 'Period:'}</span>
              {(['all', 'this_month', 'this_quarter', 'this_year'] as const).map(p => {
                const isActive = dashPeriodFilter === p;
                const labels = {
                  all: isAr ? 'كل الفترات' : 'All Time',
                  this_month: isAr ? 'هذا الشهر' : 'This Month',
                  this_quarter: isAr ? 'هذا الربع' : 'This Quarter',
                  this_year: isAr ? 'هذا العام' : 'This Year'
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDashPeriodFilter(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#A11212] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Owner / Rep Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-400">{isAr ? 'المسؤول:' : 'Owner:'}</span>
                <select
                  value={dashOwnerFilter}
                  onChange={e => setDashOwnerFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#A11212]"
                >
                  <option value="all">{isAr ? 'جميع المسؤولين' : 'All Owners'}</option>
                  {existingOwners.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-400">{isAr ? 'القسم:' : 'Dept:'}</span>
                <select
                  value={dashDeptFilter}
                  onChange={e => setDashDeptFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#A11212]"
                >
                  <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{isAr ? d.ar : d.en}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 17 Executive KPIs Grid */}
          <div className="space-y-4">
            {/* Category A: Pipeline & Revenue (5 KPIs) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  {isAr ? 'المسار المالي وإيرادات الصفقات' : 'Pipeline & Deal Flow Financials'}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {isAr ? 'إجمالي خط الأنابيب' : 'Total Open Pipeline'}
                  </p>
                  <p className="text-lg font-black text-gray-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.totalOpenPipeline)}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                    {dashboardData.kpis.openLeads} {isAr ? 'صفقة مفتوحة' : 'open deals'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs bg-purple-50/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                    {isAr ? 'التوقع المالي الموزون' : 'Weighted Forecast'}
                  </p>
                  <p className="text-lg font-black text-purple-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.weightedForecast)}
                  </p>
                  <p className="text-[10px] font-semibold text-purple-600 mt-0.5">
                    {isAr ? 'القيمة × نسبة الاحتمالية' : 'Adjusted for Win %'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-emerald-50/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    {isAr ? 'إيرادات الصفقات المنجزة' : 'Won Revenue'}
                  </p>
                  <p className="text-lg font-black text-emerald-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.wonRevenue)}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                    {dashboardData.kpis.wonCount} {isAr ? 'صفقة ناجحة' : 'won deals'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                    {isAr ? 'متوسط قيمة الصفقة' : 'Average Deal Size'}
                  </p>
                  <p className="text-lg font-black text-blue-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.avgDealSize)}
                  </p>
                  <p className="text-[10px] font-semibold text-blue-600 mt-0.5">
                    {isAr ? 'للصفقات الناجحة' : 'Across won deals'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    {isAr ? 'معدل النجاح (Win Rate)' : 'Win Rate'}
                  </p>
                  <p className="text-lg font-black text-indigo-900 mt-1">
                    {dashboardData.kpis.winRate}%
                  </p>
                  <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                    {dashboardData.kpis.wonCount}/{dashboardData.kpis.wonCount + dashboardData.kpis.lostCount} {isAr ? 'مغلقة' : 'closed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Category B: Volume & Conversion (4 KPIs) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  {isAr ? 'أحجام الصفقات وحركة المراحل' : 'Deal Volume & Pipeline Status'}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {isAr ? 'إجمالي الصفقات والفرص' : 'Total Leads'}
                  </p>
                  <p className="text-xl font-black text-gray-900 mt-1">{dashboardData.kpis.totalLeads}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                    {isAr ? 'الصفقات قيد التفاوض' : 'Open Active Deals'}
                  </p>
                  <p className="text-xl font-black text-blue-900 mt-1">{dashboardData.kpis.openLeads}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    {isAr ? 'الصفقات الرابحة (Won)' : 'Won Deals'}
                  </p>
                  <p className="text-xl font-black text-emerald-900 mt-1">{dashboardData.kpis.wonCount}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                    {isAr ? 'الصفقات الخاسرة (Lost)' : 'Lost Deals'}
                  </p>
                  <p className="text-xl font-black text-rose-900 mt-1">{dashboardData.kpis.lostCount}</p>
                </div>
              </div>
            </div>

            {/* Category C: Cash Flow & Receivables (4 KPIs) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  {isAr ? 'المقبوضات والتدفق النقدي والذمم' : 'Cash Collection & Receivables'}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    {isAr ? 'إجمالي المحصّل نقداً' : 'Collected Cash'}
                  </p>
                  <p className="text-xl font-black text-emerald-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.collectedCash)}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border shadow-xs ${
                  dashboardData.kpis.pendingReceivables > 0 ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-100'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                    {isAr ? 'الذمم والمبالغ المتبقية' : 'Outstanding Receivables'}
                  </p>
                  <p className="text-xl font-black text-amber-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.pendingReceivables)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                    {isAr ? 'كفاءة التحصيل' : 'Collection Efficiency'}
                  </p>
                  <p className="text-xl font-black text-blue-900 mt-1">
                    {dashboardData.kpis.collectionEfficiency}%
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {isAr ? 'سداد كامل / بذمتهم' : 'Fully Paid / With Balance'}
                  </p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {dashboardData.kpis.fullyPaidCount} <span className="text-xs font-bold text-gray-400">/ {dashboardData.kpis.withBalanceCount}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Category D: Retainers & Operational Risk (4 KPIs) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#A11212]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  {isAr ? 'الاشتراكات المتكررة ومؤشرات المخاطر' : 'Recurring Work & Operational Urgency'}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#A11212]">
                    {isAr ? 'الإيراد الشهري (MRR)' : 'Monthly Recurring (MRR)'}
                  </p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.mrr)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                    {isAr ? 'الإيراد السنوي (ARR)' : 'Annualized Run-Rate (ARR)'}
                  </p>
                  <p className="text-xl font-black text-purple-900 mt-1">
                    OMR {formatOMR(dashboardData.kpis.arr)}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border shadow-xs ${
                  dashboardData.kpis.overdueFollowups > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-100'
                }`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${
                    dashboardData.kpis.overdueFollowups > 0 ? 'text-rose-700' : 'text-gray-400'
                  }`}>
                    {isAr ? 'متابعات متأخرة' : 'Overdue Follow-ups'}
                  </p>
                  <p className={`text-xl font-black ${
                    dashboardData.kpis.overdueFollowups > 0 ? 'text-rose-700' : 'text-gray-900'
                  } mt-1`}>
                    {dashboardData.kpis.overdueFollowups}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border shadow-xs ${
                  dashboardData.kpis.overdueRetainers > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
                }`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${
                    dashboardData.kpis.overdueRetainers > 0 ? 'text-amber-800' : 'text-gray-400'
                  }`}>
                    {isAr ? 'اشتراكات مستحقة' : 'Due Retainer Cycles'}
                  </p>
                  <p className={`text-xl font-black ${
                    dashboardData.kpis.overdueRetainers > 0 ? 'text-amber-900' : 'text-gray-900'
                  } mt-1`}>
                    {dashboardData.kpis.overdueRetainers}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Specialized Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── CHART 1: Sales Conversion Funnel & Stage Drop-off ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">
                      {isAr ? '1. مسار التحويل عبر المراحل الـ 7' : '1. Sales Conversion Funnel (7 Stages)'}
                    </h4>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      {isAr ? 'تدرج الفرص من البداية حتى الإغلاق مع القيمة المالية' : 'Deal volume & stage drop-off through the pipeline'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-black">
                    {dashboardData.kpis.totalLeads} {isAr ? 'صفقة' : 'deals'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dashboardData.charts.funnelStages.map((st, idx) => {
                    const maxVal = Math.max(1, ...dashboardData.charts.funnelStages.map(s => s.value));
                    const widthPct = Math.max(12, Math.round((st.value / maxVal) * 100));

                    return (
                      <div key={st.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            {isAr ? st.labelAr : st.labelEn}
                            <span className="text-[10px] font-mono text-gray-400 font-normal">
                              ({st.probability}%)
                            </span>
                          </span>
                          <span className="font-mono font-bold text-gray-900">
                            {st.count} {isAr ? 'صفقة' : 'deals'} • OMR {formatOMR(st.value)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              st.id === 'won'
                                ? 'bg-emerald-500'
                                : st.id === 'lost'
                                ? 'bg-rose-400'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-600'
                            }`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── CHART 2: Weighted vs Nominal Pipeline Forecast ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">
                      {isAr ? '2. التوقع الموزون مقابل القيمة الاسمية' : '2. Nominal vs. Weighted Forecast'}
                    </h4>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      {isAr ? 'مقارنة القيمة العقدية الكاملة بالقيمة المرجحة باحتمالية الفوز' : 'Face contract value vs. win-probability adjusted value'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {dashboardData.charts.weightedComparison.map(item => {
                    const maxVal = Math.max(1, ...dashboardData.charts.weightedComparison.map(s => s.nominal));
                    const nomPct = Math.max(4, Math.round((item.nominal / maxVal) * 100));
                    const wgtPct = Math.max(2, Math.round((item.weighted / maxVal) * 100));

                    return (
                      <div key={item.stage} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700">
                            {isAr ? item.labelAr : item.labelEn} ({item.probability}%)
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {isAr ? 'موزون:' : 'Weighted:'} <strong className="text-purple-700">OMR {formatOMR(item.weighted)}</strong> / {isAr ? 'اسمي:' : 'Nom:'} OMR {formatOMR(item.nominal)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-gray-400 h-full rounded-full" style={{ width: `${nomPct}%` }} />
                          </div>
                          <div className="w-full bg-purple-50 h-2 rounded-full overflow-hidden">
                            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${wgtPct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 text-[10px] font-bold text-gray-400 mt-4 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> {isAr ? 'القيمة الاسمية' : 'Nominal Face Value'}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> {isAr ? 'القيمة المرجحة' : 'Weighted Forecast'}</span>
              </div>
            </div>

            {/* ── CHART 3: Service Demand & Revenue Distribution ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">
                      {isAr ? '3. توزيع الإيرادات والطلب حسب الخدمات' : '3. Revenue & Demand by Service (11 Scopes)'}
                    </h4>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      {isAr ? 'الخدمات الأكثر طلباً ومساهمتها في إجمالي الصفقات' : 'Top requested services and their revenue contribution'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pe-1">
                  {dashboardData.charts.serviceDistribution.slice(0, 7).map(item => {
                    const totalServiceVal = dashboardData.charts.serviceDistribution.reduce((acc, s) => acc + s.value, 0) || 1;
                    const sharePct = Math.round((item.value / totalServiceVal) * 100);

                    return (
                      <div key={item.service} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800 truncate max-w-[240px]">
                            {item.service}
                          </span>
                          <span className="font-mono text-gray-600 font-bold">
                            {item.count} {isAr ? 'عقود' : 'deals'} • OMR {formatOMR(item.value)} ({sharePct}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#A11212] h-full rounded-full" style={{ width: `${Math.max(5, sharePct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── CHART 4: B2B Referral Partner Leaderboard ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">
                      {isAr ? '4. أداء شركاء الأعمال والإحالات (B2B Partners)' : '4. B2B Partner Referral Performance'}
                    </h4>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      {isAr ? 'بنك التنمية العماني، مراكز سند، ريادة، والمكاتب الشريكة' : 'Referral volume, conversion rate, and revenue by partner'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {dashboardData.charts.partnerPerformance.map(p => (
                    <div key={p.partner} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-900 text-xs">{p.partner}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                          {p.totalLeads} {isAr ? 'إحالة' : 'leads'} • {p.wonLeads} {isAr ? 'صفقة ناجحة' : 'won'}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="font-black text-emerald-700 text-xs">OMR {formatOMR(p.revenue)}</p>
                        <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-black mt-0.5">
                          {p.conversionRate}% {isAr ? 'تحويل' : 'conv.'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── CHART 5: Delivery Fulfillment Status ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">
                      {isAr ? '5. حالة تسليم وإنجاز العقود المعتمدة' : '5. Won Contracts Delivery Fulfillment'}
                    </h4>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      {isAr ? 'توزيع الصفقات المنجزة، قيد التنفيذ، والتي لم تبدأ بعد' : 'Breakdown of delivery progress for all won contracts'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Segmented Progress Bar */}
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${dashboardData.charts.deliveryBreakdown.total > 0
                          ? (dashboardData.charts.deliveryBreakdown.completed / dashboardData.charts.deliveryBreakdown.total) * 100
                          : 0}%`
                      }}
                      title="Completed"
                    />
                    <div
                      className="bg-blue-500 h-full transition-all"
                      style={{
                        width: `${dashboardData.charts.deliveryBreakdown.total > 0
                          ? (dashboardData.charts.deliveryBreakdown.inProgress / dashboardData.charts.deliveryBreakdown.total) * 100
                          : 0}%`
                      }}
                      title="In Progress"
                    />
                    <div
                      className="bg-gray-300 h-full transition-all"
                      style={{
                        width: `${dashboardData.charts.deliveryBreakdown.total > 0
                          ? (dashboardData.charts.deliveryBreakdown.notStarted / dashboardData.charts.deliveryBreakdown.total) * 100
                          : 0}%`
                      }}
                      title="Not Started"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-black text-emerald-800">{dashboardData.charts.deliveryBreakdown.completed}</p>
                      <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{isAr ? 'مكتمل' : 'Completed'}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-xs font-black text-blue-800">{dashboardData.charts.deliveryBreakdown.inProgress}</p>
                      <p className="text-[10px] font-bold text-blue-600 mt-0.5">{isAr ? 'قيد التنفيذ' : 'In Progress'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                      <p className="text-xs font-black text-gray-700">{dashboardData.charts.deliveryBreakdown.notStarted}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">{isAr ? 'لم يبدأ' : 'Not Started'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CHART 6: Cash Collection vs Receivables Breakdown ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">
                      {isAr ? '6. نسبة التحصيل الفعلي مقابل الذمم المستحقة' : '6. Cash Collection vs. Outstanding Ratio'}
                    </h4>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      {isAr ? 'مقارنة المبالغ المحصلة في البنك بالذمم المدينة لصفقات Won' : 'Collected cash vs. pending balance across won deals'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
                    {dashboardData.kpis.collectionEfficiency}% {isAr ? 'كفاءة التحصيل' : 'collected'}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Gauge Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-700">{isAr ? 'المحصّل:' : 'Collected:'} OMR {formatOMR(dashboardData.kpis.collectedCash)}</span>
                      <span className="text-amber-800">{isAr ? 'المتبقي:' : 'Pending:'} OMR {formatOMR(dashboardData.kpis.pendingReceivables)}</span>
                    </div>
                    <div className="w-full h-4 bg-amber-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, dashboardData.kpis.collectionEfficiency)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {isAr ? 'إجمالي قيمة العقود الرابحة' : 'Total Won Contracts Value'}
                      </p>
                      <p className="text-base font-black text-gray-900 mt-0.5">
                        OMR {formatOMR(dashboardData.kpis.wonRevenue)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {isAr ? 'الصفقات المسددة بالكامل' : 'Fully Settled Contracts'}
                      </p>
                      <p className="text-base font-black text-emerald-700 mt-0.5">
                        {dashboardData.kpis.fullyPaidCount} <span className="text-xs text-gray-400 font-bold">/ {dashboardData.kpis.wonCount}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 6: B2B PARTNERS DIRECTORY TAB ───────────────────────── */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          {/* Summary Strip (4 KPI Cards: Partners, Volume, Revenue, Commissions) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                  {isAr ? 'الجهات والمكاتب الشريكة' : 'Active Partner Entities'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Briefcase size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-purple-900">{b2bPartnersData.totalPartnersCount}</p>
                <p className="text-[10px] font-semibold text-purple-600 mt-1">
                  {isAr ? 'بنوك تنمية، مراكز سند، ومكاتب محاماة' : 'ODB, Sanad, Riyada, Law firms'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                  {isAr ? 'إجمالي الصفقات المحالة' : 'Total Referred Deals'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Users size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-blue-900">{b2bPartnersData.totalReferredLeads}</p>
                <p className="text-[10px] font-semibold text-gray-500 mt-1">
                  {isAr ? 'فرص وردت عبر الشركاء' : 'Leads sourced via B2B channels'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  {isAr ? 'إيرادات الإحالات الناجحة' : 'Referred Won Revenue'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Award size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-emerald-900">OMR {formatOMR(b2bPartnersData.totalReferredWonRevenue)}</p>
                <p className="text-[10px] font-semibold text-emerald-600 mt-1">
                  {isAr ? 'عقود معتمدة وناجحة من الشركاء' : 'Confirmed contracts closed'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-xs flex flex-col justify-between bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                  {isAr ? 'عمولات الإحالة التقديرية' : 'Estimated Commissions'}
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <DollarSign size={16} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-amber-900">OMR {formatOMR(b2bPartnersData.totalCommissionPayable)}</p>
                <p className="text-[10px] font-semibold text-amber-700 mt-1">
                  {isAr ? 'بناءً على النسب المتفق عليها' : 'Based on agreed referral rates'}
                </p>
              </div>
            </div>
          </div>

          {/* Partner Controls & Actions Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={partnerSearchQuery}
                onChange={e => setPartnerSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث عن شريك أو جهة...' : 'Search partner name...'}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-10 pe-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleExportCSV()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 shadow-xs transition-all cursor-pointer"
                title={isAr ? 'تصدير كافة الصفقات إلى CSV' : 'Export all deals to CSV'}
              >
                <Download size={14} className="text-gray-500" />
                <span>{isAr ? 'تصدير الصفقات (CSV)' : 'Export CSV'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewPartnerName('');
                  setNewPartnerCommission(10);
                  setIsAddPartnerModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A11212] hover:bg-[#850e0e] text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>{isAr ? 'إضافة جهة شريكة' : 'Add Partner'}</span>
              </button>
            </div>
          </div>

          {/* Partners Directory Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-4 text-start">{isAr ? 'الجهة الشريكة' : 'Partner Entity'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'الصفقات والإحالات' : 'Referrals & Won'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'معدل التحويل' : 'Win Rate'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'الإيرادات المحققة' : 'Won Revenue'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'نسبة العمولة' : 'Commission %'}</th>
                    <th className="py-4 px-4 text-start">{isAr ? 'العمولة المستحقة' : 'Est. Commission'}</th>
                    <th className="py-4 px-4 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                  {b2bPartnersData.partners.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400">
                        <Briefcase size={36} className="mx-auto mb-2 opacity-30 text-[#A11212]" />
                        <p className="font-bold text-gray-700 text-sm">
                          {isAr ? 'لا توجد جهات شريكة تطابق البحث' : 'No partner organizations found'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    b2bPartnersData.partners.map(p => {
                      const isDirect = p.name === 'None, direct client';

                      return (
                        <tr key={p.name} className="hover:bg-gray-50/60 transition-colors">
                          {/* 1. Partner Entity */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-black text-gray-900 text-sm flex items-center gap-1.5">
                                <Briefcase size={14} className={isDirect ? 'text-gray-400' : 'text-purple-600'} />
                                <span>{p.name}</span>
                              </p>
                              {p.recentLeads.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.recentLeads.map(l => (
                                    <span key={l.id} className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                      {l.contact_name}
                                    </span>
                                  ))}
                                  {p.totalLeads > p.recentLeads.length && (
                                    <span className="text-[10px] font-bold text-gray-400">
                                      +{p.totalLeads - p.recentLeads.length}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 2. Referrals & Won */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-gray-900">
                                {p.wonCount} <span className="text-gray-400 font-normal">/ {p.totalLeads} {isAr ? 'صفقة' : 'deals'}</span>
                              </p>
                              <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                                {isAr ? 'إجمالي الحجم:' : 'Vol:'} OMR {formatOMR(p.totalVolume)}
                              </p>
                            </div>
                          </td>

                          {/* 3. Win Rate */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                p.conversionRate >= 50
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.conversionRate > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {p.conversionRate}%
                              </span>
                            </div>
                          </td>

                          {/* 4. Won Revenue */}
                          <td className="py-3.5 px-4">
                            <p className="font-black text-emerald-700 text-sm">
                              OMR {formatOMR(p.wonRevenue)}
                            </p>
                          </td>

                          {/* 5. Commission % */}
                          <td className="py-3.5 px-4">
                            {isDirect ? (
                              <span className="text-[11px] font-bold text-gray-400">—</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={p.commissionRate}
                                  onChange={e => handleUpdatePartnerCommission(p.name, Number(e.target.value) || 0)}
                                  className="w-14 text-center text-xs font-black bg-gray-50 border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-[#A11212]"
                                />
                                <span className="font-bold text-gray-500">%</span>
                              </div>
                            )}
                          </td>

                          {/* 6. Est. Commission */}
                          <td className="py-3.5 px-4">
                            <p className="font-black text-amber-900 text-sm">
                              OMR {formatOMR(p.estimatedCommission)}
                            </p>
                          </td>

                          {/* 7. Actions */}
                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click Filter to Table View */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPartnerFilter(p.name);
                                  setActiveTab('table');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-black transition-colors cursor-pointer"
                                title={isAr ? 'عرض صفقات هذا الشريك في الجدول' : 'View deals in table'}
                              >
                                <span>{isAr ? 'عرض الصفقات' : 'View Deals'}</span>
                                <ArrowRight size={12} className={isAr ? 'rotate-180' : ''} />
                              </button>

                              {/* Partner-specific CSV Export */}
                              <button
                                type="button"
                                onClick={() => {
                                  const partnerLeads = leads.filter(l => (l.b2b_partner || 'None, direct client') === p.name);
                                  handleExportCSV(partnerLeads, `partner-${p.name.replace(/\s+/g, '-').toLowerCase()}`);
                                }}
                                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-xl transition-colors cursor-pointer"
                                title={isAr ? 'تصدير صفقات هذا الشريك كـ CSV' : 'Export partner deals to CSV'}
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD CUSTOM B2B PARTNER (STEP 6) ──────────────────────── */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden my-8" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-600/20">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {isAr ? 'إضافة جهة أو شريك أعمال جديد' : 'Add New B2B Partner'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {isAr ? 'بنك تنمية، مركز سند، جهة حكومية أو مكتب محاماة' : 'Institutional or referral partner'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartnerModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewPartner} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  {isAr ? 'اسم الجهة أو الشريك *' : 'Partner Organization Name *'}
                </label>
                <input
                  type="text"
                  value={newPartnerName}
                  onChange={e => setNewPartnerName(e.target.value)}
                  placeholder={isAr ? 'مثال: صندوق الرفد / مركز سند مسقط' : 'e.g. Muscat Sanad Center'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  {isAr ? 'نسبة عمولة الإحالة المتفق عليها (%)' : 'Agreed Referral Commission Rate (%)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newPartnerCommission}
                  onChange={e => setNewPartnerCommission(Number(e.target.value) || 0)}
                  placeholder="10"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  {isAr ? 'حفظ الشريك' : 'Save Partner'}
                </button>
              </div>
            </form>
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
              </div>

              {/* Privilege Highlights */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/70 text-[11px] space-y-1.5 text-gray-700 font-medium">
                <p className="font-bold text-gray-900">{isAr ? 'ماذا سيتلقى العضو عند الإرسال؟' : 'What happens upon provisioning?'}</p>
                <p>• {isAr ? 'إنشاء حساب مستخدم في Supabase Auth مع صلاحية عميل (Client).' : 'Creates Supabase Auth credentials for the client.'}</p>
                <p>• {isAr ? 'إصدار بطاقة عضوية رقمية فريدة في نادي ميسرة للأعمال مع 200 نقطة ترحيبية.' : 'Generates a unique digital membership ID (MBC-2026-XXXX) with 200 bonus loyalty points.'}</p>
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

              <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100 space-y-3">
                <h4 className="text-[11px] font-black uppercase text-[#A11212] flex items-center gap-1.5">
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
                  className={`flex-1 text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md disabled:opacity-50 cursor-pointer ${
                    quoteForm.status === 'accepted'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-[#A11212] hover:bg-[#800e0e] shadow-[#A11212]/20'
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

      {/* ── MODAL: ADD / EDIT LEAD RECORD ──────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden my-8 max-h-[92vh] flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50/50 to-gray-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#A11212]/10 text-[#A11212] flex items-center justify-center font-black shrink-0">
                  {editingLead ? <Edit2 size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingLead
                      ? (isAr ? 'تعديل تفاصيل الصفقة والعميل' : 'Edit Deal & Lead Record')
                      : (isAr ? 'تسجيل صفقة / فرصة جديدة' : 'Add New Lead / Deal')}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {editingLead
                      ? (editingLead.company_name || editingLead.contact_name)
                      : (isAr ? 'أدخل تفاصيل الفرصة والخدمات المطلوبة بدقة' : 'Capture prospective client, services, and deal value')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingLead(null);
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-bold flex items-start gap-2.5 shrink-0">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Body - Scrollable */}
            <form onSubmit={handleSaveLead} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Section 1: Client Details */}
              <div className="space-y-3">
                <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} className="text-gray-500" />
                  <span>{isAr ? 'بيانات العميل والجهة' : 'Client & Entity Details'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'اسم الشركة / المؤسسة' : 'Company / Business Entity'}
                    </label>
                    <input
                      type="text"
                      value={leadForm.company_name}
                      onChange={e => setLeadForm({ ...leadForm, company_name: e.target.value })}
                      placeholder={isAr ? 'مثال: شركة مسقط للخدمات ش.م.م' : 'e.g. Muscat Services LLC'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'اسم جهة الاتصال *' : 'Contact Person *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={leadForm.contact_name}
                      onChange={e => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                      placeholder={isAr ? 'مثال: سالم البوسعيدي' : 'e.g. Salim Al-Busaidi'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'رقم الهاتف / واتساب *' : 'Phone / WhatsApp *'}
                    </label>
                    <input
                      type="text"
                      value={leadForm.phone}
                      onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                      placeholder="+968 9123 4567"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      value={leadForm.email}
                      onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                      placeholder="client@company.om"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Services (Tick as many as apply or leave empty for "To be decided") */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Tag size={13} className="text-gray-500" />
                    <span>{isAr ? 'الخدمات المطلوبة' : 'Services'}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {leadForm.services.length === 0
                      ? (isAr ? 'متروكة فارغة = السعر لم يحدد بعد' : 'Empty = To be decided')
                      : `${leadForm.services.length} ${isAr ? 'محددة' : 'selected'}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                  {SPEC_SERVICES.map(srv => {
                    const isChecked = leadForm.services.includes(srv.en);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                          isChecked
                            ? 'bg-red-50 text-[#A11212] border-red-200 shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-200/80 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setLeadForm({ ...leadForm, services: [...leadForm.services, srv.en] });
                            } else {
                              setLeadForm({ ...leadForm, services: leadForm.services.filter(s => s !== srv.en) });
                            }
                          }}
                          className="rounded text-[#A11212] focus:ring-[#A11212] border-gray-300 w-3.5 h-3.5"
                        />
                        <span className="truncate">{isAr ? srv.ar : srv.en}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Lead Source, Owner & B2B Partner */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Briefcase size={13} className="text-gray-500" />
                  <span>{isAr ? 'المسؤول والشريك والمصدر' : 'Source, Owner & B2B Partner'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'مصدر الفرصة' : 'Lead Source'}
                    </label>
                    <select
                      value={leadForm.source}
                      onChange={e => setLeadForm({ ...leadForm, source: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    >
                      {SPEC_SOURCES.map(s => (
                        <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'مسؤول المبيعات (Owner)' : 'Owner (Salesperson)'}
                    </label>
                    <input
                      type="text"
                      list="sales-crm-owners-list"
                      value={leadForm.owner}
                      onChange={e => setLeadForm({ ...leadForm, owner: e.target.value })}
                      placeholder={user?.user_metadata?.full_name || 'Staff Member'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                    <datalist id="sales-crm-owners-list">
                      {existingOwners.map((own, idx) => (
                        <option key={idx} value={own} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'الشريك التجاري (B2B)' : 'B2B Partner'}
                    </label>
                    <select
                      value={leadForm.b2b_partner}
                      onChange={e => setLeadForm({ ...leadForm, b2b_partner: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    >
                      {DEFAULT_B2B_PARTNERS.map((partner, idx) => (
                        <option key={idx} value={partner}>
                          {partner === 'None, direct client' ? (isAr ? 'لا يوجد (عميل مباشر)' : 'None, direct client') : partner}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Stage, Deal Value & Win Probability */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-gray-500" />
                  <span>{isAr ? 'المرحلة، القيمة، ونسبة الفوز' : 'Stage, Value & Win Probability'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'مرحلة خط الأنابيب *' : 'Pipeline Stage *'}
                    </label>
                    <select
                      value={leadForm.stage}
                      onChange={e => {
                        const newStage = e.target.value as SalesStage;
                        const defaultProb = STAGE_CONFIG[newStage]?.probability ?? 10;
                        setLeadForm({
                          ...leadForm,
                          stage: newStage,
                          probability: defaultProb
                        });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-black text-gray-900 focus:outline-none focus:border-[#A11212]"
                    >
                      <option value="new">{isAr ? 'جديدة (New - 10%)' : 'New (10%)'}</option>
                      <option value="contacted">{isAr ? 'تم التواصل (Contacted - 25%)' : 'Contacted (25%)'}</option>
                      <option value="consultation">{isAr ? 'استشارة (Consultation - 35%)' : 'Consultation (35%)'}</option>
                      <option value="proposal_sent">{isAr ? 'عرض سعر (Proposal Sent - 50%)' : 'Proposal Sent (50%)'}</option>
                      <option value="negotiation">{isAr ? 'تفاوض (Negotiation - 75%)' : 'Negotiation (75%)'}</option>
                      <option value="won">{isAr ? 'صفقة ناجحة (Won - 100%)' : 'Won (100%)'}</option>
                      <option value="lost">{isAr ? 'ملغاة / مفقودة (Lost - 0%)' : 'Lost (0%)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'قيمة الصفقة (OMR)' : 'Deal Value (OMR)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={leadForm.estimated_value}
                      onChange={e => setLeadForm({ ...leadForm, estimated_value: e.target.value })}
                      placeholder={isAr ? 'فارغ = السعر لم يحدد (TBD)' : 'Empty = Price TBD'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                    <div className="text-[10px] text-gray-400 mt-1">
                      {isAr ? 'اتركه فارغاً ليكون "Price TBD"' : 'Leave empty for "Price TBD"'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'احتمال الفوز (%)' : 'Win Probability (%)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={leadForm.probability}
                      onChange={e => setLeadForm({ ...leadForm, probability: Number(e.target.value) || 0 })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                    <div className="text-[10px] text-gray-400 mt-1">
                      {isAr ? 'يتم تعيينه تلقائياً حسب المرحلة' : 'Auto-filled based on stage'}
                    </div>
                  </div>
                </div>

                {/* Validation Reminder Note */}
                <div className="p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <span>
                    {isAr
                      ? 'قاعدة أعمال: لا يمكن نقل الصفقة إلى مرحلة ناجحة (Won) دون تحديد قيمة الصفقة واختيار خدمة واحدة على الأقل.'
                      : 'Business Rule: A lead cannot be marked as Won without a deal price and at least one selected service.'}
                  </span>
                </div>
              </div>

              {/* Section 5: Dates & Priority */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-500" />
                  <span>{isAr ? 'المواعيد والأولوية' : 'Dates & Priority'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'تاريخ الإغلاق المتوقع' : 'Expected Close Date'}
                    </label>
                    <input
                      type="date"
                      value={leadForm.expected_close}
                      onChange={e => setLeadForm({ ...leadForm, expected_close: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'تاريخ المتابعة القادمة' : 'Next Follow-up Date'}
                    </label>
                    <input
                      type="date"
                      value={leadForm.next_followup}
                      onChange={e => setLeadForm({ ...leadForm, next_followup: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-700 uppercase mb-1">
                      {isAr ? 'الأولوية' : 'Priority'}
                    </label>
                    <select
                      value={leadForm.priority}
                      onChange={e => setLeadForm({ ...leadForm, priority: e.target.value as LeadPriority })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    >
                      <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
                      <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                      <option value="high">{isAr ? 'عالية' : 'High'}</option>
                      <option value="urgent">{isAr ? 'عاجلة' : 'Urgent'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 6: Notes */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <label className="block text-[11px] font-black text-gray-700 uppercase">
                  {isAr ? 'ملاحظات وتفاصيل الاحتياج' : 'Notes & Client Requirements'}
                </label>
                <textarea
                  rows={3}
                  value={leadForm.notes}
                  onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder={isAr ? 'أدخل أي متطلبات خاصة، شروط دفع، أو تفاصيل تم التفاهم عليها...' : 'Add notes, client context, or deal specifics...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              {/* Section 7: Activity Log (If editing existing lead) */}
              {editingLead && editingLead.activity_log && editingLead.activity_log.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-500" />
                    <span>{isAr ? 'سجل النشاط والتنقلات السابقة' : 'Activity & Stage History'}</span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-2 border border-gray-200/60">
                    {editingLead.activity_log.map((log, idx) => (
                      <div key={log.id || idx} className="text-[11px] flex items-start gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A11212] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <span className="font-bold text-gray-800">{log.action}</span>
                          {log.details && <p className="text-[10px] text-gray-500">{log.details}</p>}
                          <div className="text-[9px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            {log.author && <span>• {log.author}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100 shrink-0">
                {editingLead && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLead(editingLead.id)}
                    className="p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-black text-xs uppercase flex items-center gap-1 transition-colors cursor-pointer"
                    title={isAr ? 'حذف سجل الصفقة' : 'Delete Lead'}
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">{isAr ? 'حذف' : 'Delete'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLead(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-[#A11212]/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                    : editingLead
                      ? (isAr ? 'حفظ تعديلات الصفقة' : 'Save Changes')
                      : (isAr ? 'تسجيل الصفقة' : 'Register Deal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DEAL INSTALLMENT PAYMENTS LEDGER (STEP 2) ─────────────── */}
      {isPaymentModalOpen && selectedLeadForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden my-8 max-h-[92vh] flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-gray-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {isAr ? 'دفتر أقساط ودفعات الصفقة' : 'Deal Installment Payments Ledger'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium truncate max-w-sm">
                    {selectedLeadForPayment.company_name || selectedLeadForPayment.contact_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedLeadForPayment(null);
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                    {isAr ? 'إجمالي الصفقة' : 'Deal Value'}
                  </span>
                  <div className="font-mono font-black text-gray-900 text-sm sm:text-base">
                    OMR {formatOMR(selectedLeadForPayment.estimated_value)}
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-emerald-700 block mb-1">
                    {isAr ? 'المسدد فعلياً' : 'Total Paid'}
                  </span>
                  <div className="font-mono font-black text-emerald-800 text-sm sm:text-base">
                    OMR {formatOMR(selectedLeadForPayment.total_paid || 0)}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border ${
                  (selectedLeadForPayment.pending_payment ?? selectedLeadForPayment.estimated_value) <= 0
                    ? 'bg-gray-50 border-gray-100 text-gray-400'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-[10px] font-black uppercase block mb-1">
                    {isAr ? 'المتبقي المستحق' : 'Balance Due'}
                  </span>
                  <div className="font-mono font-black text-sm sm:text-base">
                    OMR {formatOMR(selectedLeadForPayment.pending_payment ?? selectedLeadForPayment.estimated_value ?? 0)}
                  </div>
                </div>
              </div>

              {/* Status Badge Strip */}
              <div className="flex items-center justify-between p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs font-bold">
                <span className="text-gray-500">{isAr ? 'حالة السداد العامة:' : 'Payment Status:'}</span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                  selectedLeadForPayment.payment_status === 'fully_paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : selectedLeadForPayment.payment_status === 'partially_paid'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-gray-200 text-gray-700 border border-gray-300'
                }`}>
                  {selectedLeadForPayment.payment_status === 'fully_paid'
                    ? (isAr ? 'مسدد بالكامل (Fully Paid)' : 'Fully Paid')
                    : selectedLeadForPayment.payment_status === 'partially_paid'
                      ? (isAr ? 'مسدد جزئياً (Partially Paid)' : 'Partially Paid')
                      : (isAr ? 'غير مسدد (Unpaid)' : 'Unpaid')}
                </span>
              </div>

              {/* Add Payment Form */}
              <form onSubmit={handleRecordPayment} className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black uppercase text-gray-700 flex items-center gap-1.5">
                    <Plus size={13} className="text-[#A11212]" />
                    <span>{isAr ? 'تسجيل دفعة جديدة' : 'Add Installment Payment'}</span>
                  </div>

                  {/* 1-Click "Add remaining balance" shortcut button */}
                  {(selectedLeadForPayment.pending_payment ?? selectedLeadForPayment.estimated_value) > 0 && (
                    <button
                      type="button"
                      onClick={handleFillRemainingBalance}
                      className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-2xs"
                    >
                      <Sparkles size={11} className="text-amber-700" />
                      <span>{isAr ? 'سداد كامل المبلغ المتبقي' : 'Add remaining balance'}</span>
                    </button>
                  )}
                </div>

                {paymentError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                      {isAr ? 'تاريخ استلام الدفعة *' : 'Payment Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentForm.date}
                      onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                      {isAr ? 'المبلغ المستلم (OMR) *' : 'Amount in OMR *'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="0.000"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'البيان / رقم التحويل أو الشيك (اختياري)' : 'Reference / Receipt Note (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    placeholder={isAr ? 'مثال: تحويل بنك مسقط / شيك رقم 4022' : 'e.g. Bank Transfer Ref #9482 / Cheque #102'}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPayment}
                    className="w-full sm:w-auto bg-[#A11212] hover:bg-[#850e0e] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-[#A11212]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingPayment ? (isAr ? 'جاري القيد...' : 'Recording...') : (isAr ? 'قيد الدفعة في الدفتر' : 'Record Payment')}
                  </button>
                </div>
              </form>

              {/* Installments Ledger History */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Receipt size={13} className="text-gray-500" />
                  <span>{isAr ? 'سجل الأقساط المسددة' : 'Installments Payment Ledger'}</span>
                </div>

                {(!selectedLeadForPayment.payments || selectedLeadForPayment.payments.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                    <Receipt size={28} className="mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="text-xs font-bold">
                      {isAr ? 'لا توجد دفعات مقيدة بعد. كامل المبلغ مستحق.' : 'No installment payments recorded yet. Full balance is outstanding.'}
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'المبلغ' : 'Amount'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'البيان / الإيصال' : 'Reference'}</th>
                          <th className="py-2.5 px-3 text-end">{isAr ? 'إجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                        {selectedLeadForPayment.payments.map((p: any, idx: number) => (
                          <tr key={p.id || idx} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700">
                              {p.date}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-emerald-800 text-[11px]">
                              OMR {formatOMR(p.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-gray-600 truncate max-w-[140px]">
                              {p.notes || p.note || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-end">
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p.id)}
                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                title={isAr ? 'حذف هذه الدفعة' : 'Delete payment'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedLeadForPayment(null);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTAL ACCESS CREDENTIAL MODAL ── */}
      <PortalAccessCredentialModal
        isOpen={isProvisionModalOpen}
        onClose={() => {
          setIsProvisionModalOpen(false);
          setSelectedLeadForProvision(null);
        }}
        target={selectedLeadForProvision ? {
          id: selectedLeadForProvision.id,
          type: selectedLeadForProvision.status === 'accepted' ? 'client' : 'lead',
          name: selectedLeadForProvision.contact_name,
          companyName: selectedLeadForProvision.company_name,
          email: selectedLeadForProvision.email || '',
          phone: selectedLeadForProvision.phone,
          portalAccessSent: selectedLeadForProvision.portal_access_sent
        } : null}
        onSuccess={() => {
          fetchLeads(true);
        }}
      />

    </div>
  );
}
