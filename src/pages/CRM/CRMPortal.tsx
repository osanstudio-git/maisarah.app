import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, Target, Clock, PlusCircle, AlertCircle, FileText, CheckCircle2, 
  ChevronRight, XCircle, ArrowUpRight, BarChart2, ShieldCheck, Download, 
  Trash2, Edit, Award, Sparkles, Building2, UserPlus, FileCheck, Check, ArrowRight,
  TrendingUp, RefreshCw, AlertTriangle, Calendar, Layers, Activity, Loader2,
  PhoneCall, MessageSquare, Send, DollarSign, X, ExternalLink, Filter, Printer, Plus, CheckCheck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';

// --- Types & Interfaces ---
interface Lead {
  id: string;
  name: string;
  representativeName?: string;
  email: string;
  phone: string;
  companyName?: string;
  source?: 'b2b' | 'referral' | 'social_media' | 'direct' | 'website' | 'other';
  status: 'interested' | 'called' | 'whatsapp_connected' | 'quoted' | 'not_interested' | 'converted' | 'cold' | 'warm' | 'hot';
  qualificationColor: 'red' | 'yellow' | 'green';
  pipelineStep: 'follow_up' | 'add_data' | 'connect' | 'update' | 'sort';
  followUpDate?: string;
  notes: string;
  created_at: string;
  isClubMember?: boolean;
  clubTier?: 'silver' | 'gold' | 'platinum';
  activityHistory?: string[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyPhone?: string;
  type: 'B2B' | 'B2C';
  companyName?: string;
  registrationNumber?: string;
  servicesPackage: string[];
  overallManager: string; // The Account Owner
  delegatedServices: Record<string, string>; // e.g. {"Tax & VAT": "Khalfan Al-Abri", "Audit": "Ali Al-Harthy"}
  created_at: string;
  monthlyBilling: number;
  yearlyBilling: number;
  activityHistory: string[];
  contractExpiryDate?: string;
  isClubMember?: boolean;
  clubTier?: 'silver' | 'gold' | 'platinum';
}

interface Quotation {
  id: string;
  quoteNumber?: string;
  leadId?: string | null;
  clientName: string;
  representativeName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  type: 'B2B' | 'B2C';
  serviceType: string;
  servicesPackage?: string[];
  subtotal?: number;
  vatAmount?: number;
  budget: number;
  status: 'draft' | 'sent' | 'approved' | 'declined' | 'pending' | 'invoiced';
  created_at?: string;
}

interface Reminder {
  id: string;
  title: string;
  date: string;
  type: 'follow_up' | 'deadline' | 'review';
  completed: boolean;
}

// --- Initial Mock Data ---
const INITIAL_LEADS: Lead[] = [
  { id: 'LD-001', name: 'Salim Al-Busaidi', email: 'salim.b@gmail.com', phone: '+968 9111 2222', companyName: 'Busaidi Logistics', status: 'hot', qualificationColor: 'green', pipelineStep: 'sort', notes: 'Very interested in VAT Filing retainer.', created_at: '2026-07-10', activityHistory: ['2026-07-10 - Lead captured through web form.', '2026-07-12 - Intro call logged. Client requested VAT Retainer proposals.'] },
  { id: 'LD-002', name: 'Nasser Al-Rawahi', email: 'nasser@rawahipower.com', phone: '+968 9888 7777', companyName: 'Rawahi Solar', status: 'warm', qualificationColor: 'yellow', pipelineStep: 'connect', notes: 'Wants to schedule intro meeting next week.', created_at: '2026-07-12', activityHistory: ['2026-07-12 - Lead created via sales agent.', '2026-07-14 - Follow-up email sent. Awaiting schedule reply.'] },
  { id: 'LD-003', name: 'Fatma Al-Balushi', email: 'fatma@balushifashion.om', phone: '+968 9333 4444', companyName: 'Balushi Couture', status: 'cold', qualificationColor: 'red', pipelineStep: 'follow_up', notes: 'Emailed brochure. No reply yet.', created_at: '2026-07-15', activityHistory: ['2026-07-15 - Lead entered system.', '2026-07-16 - Brochure sent. No response.'] },
  { id: 'LD-004', name: 'Hamed Al-Siyabi', email: 'hamed@siyabifood.com', phone: '+968 9444 5555', companyName: 'Siyabi Catering', status: 'warm', qualificationColor: 'yellow', pipelineStep: 'add_data', notes: 'Gathering corporate data sheet.', created_at: '2026-07-16', activityHistory: ['2026-07-16 - Lead created.', '2026-07-17 - Contacted Salim regarding CR info.'] },
  { id: 'LD-005', name: 'Mona Al-Masrouri', email: 'mona@masrouritrade.om', phone: '+968 9555 6666', companyName: 'Masrouri & Partners', status: 'hot', qualificationColor: 'green', pipelineStep: 'update', notes: 'Sent proposal draft OMR 3,500.', created_at: '2026-07-18', activityHistory: ['2026-07-18 - Lead identified.', '2026-07-20 - Proposal draft of OMR 3,500 delivered via email.'] }
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'CL-101',
    name: 'Khalfan Al-Abri',
    email: 'khalfan@soharsteel.om',
    phone: '+968 9234 5678',
    companyPhone: '+968 2456 0002',
    type: 'B2B',
    companyName: 'Sohar Steel Co',
    registrationNumber: 'CR-1098765',
    servicesPackage: ['Tax & VAT', 'Audit'],
    overallManager: 'Ali Al-Harthy',
    delegatedServices: { 'Tax & VAT': 'Khalfan Al-Abri', 'Audit': 'Ali Al-Harthy' },
    created_at: '2024-01-15',
    monthlyBilling: 450,
    yearlyBilling: 5400,
    activityHistory: ['Client onboarded.', 'Introductory call logged.', 'VAT registration certificate verified.'],
    contractExpiryDate: '2026-08-15',
    isClubMember: true,
    clubTier: 'platinum'
  },
  {
    id: 'CL-102',
    name: 'Ahmed Al-Kharusi',
    email: 'ahmed@omantel.om',
    phone: '+968 9123 4567',
    companyPhone: '+968 2456 0001',
    type: 'B2B',
    companyName: 'Oman Telco LLC',
    registrationNumber: 'CR-2039485',
    servicesPackage: ['Audit'],
    overallManager: 'Fatma Al-Harthy',
    delegatedServices: { 'Audit': 'Ali Al-Harthy' },
    created_at: '2025-06-01',
    monthlyBilling: 1200,
    yearlyBilling: 14400,
    activityHistory: ['Account created.', 'Statutory audit schedule confirmed.', 'Engagement letter signed.'],
    contractExpiryDate: '2027-06-01',
    isClubMember: true,
    clubTier: 'gold'
  },
  {
    id: 'CL-103',
    name: 'Mariam Al-Kindi',
    email: 'mariam.kindi@gmail.com',
    phone: '+968 9777 8888',
    type: 'B2C',
    servicesPackage: ['Business Advisory'],
    overallManager: 'Dr. Salim Al-Maskari',
    delegatedServices: { 'Business Advisory': 'Dr. Salim Al-Maskari' },
    created_at: '2026-03-20',
    monthlyBilling: 250,
    yearlyBilling: 3000,
    activityHistory: ['Account created.', 'Initial strategic business advice provided.'],
    contractExpiryDate: '2026-08-10',
    isClubMember: false
  }
];

const INITIAL_QUOTATIONS: Quotation[] = [
  { id: 'QT-901', clientName: 'Mazoon Electricity', type: 'B2B', serviceType: 'VAT Return Filing', budget: 1800, status: 'pending' },
  { id: 'QT-902', clientName: 'Salalah Port Services', type: 'B2B', serviceType: 'Complete Client Bookkeeping', budget: 3200, status: 'pending' },
  { id: 'QT-903', clientName: 'Amal Al-Harthy', type: 'B2C', serviceType: 'Strategic Consultancy', budget: 850, status: 'approved' }
];

const INITIAL_REMINDERS: Reminder[] = [
  { id: 'RM-301', title: 'Follow up with Nasser Al-Rawahi regarding solar contract', date: '2026-07-24', type: 'follow_up', completed: false },
  { id: 'RM-302', title: 'Submit Engagement letter for Mazoon Electricity', date: '2026-07-25', type: 'deadline', completed: false },
  { id: 'RM-303', title: 'Audit billing reconciliation check', date: '2026-07-28', type: 'review', completed: false }
];

const MOCK_EMPLOYEES = [
  { id: 'emp_01', name: 'Ali Al-Harthy', dept: 'Audit' },
  { id: 'emp_02', name: 'Khalfan Al-Abri', dept: 'Tax & VAT' },
  { id: 'emp_03', name: 'Fatma Al-Busaidi', dept: 'Tax & VAT' },
  { id: 'emp_04', name: 'Zahra Al-Lawati', dept: 'Bookkeeping' },
  { id: 'emp_05', name: 'Dr. Salim Al-Maskari', dept: 'Business Advisory' }
];

const DEPARTMENTS = ['Tax & VAT', 'Audit', 'Bookkeeping', 'Business Advisory'];

const RECHARTS_DATA = [
  { month: 'Jan', Leads: 12, Converted: 5 },
  { month: 'Feb', Leads: 18, Converted: 8 },
  { month: 'Mar', Leads: 15, Converted: 10 },
  { month: 'Apr', Leads: 22, Converted: 14 },
  { month: 'May', Leads: 28, Converted: 19 },
  { month: 'Jun', Leads: 32, Converted: 24 }
];

export default function CRMPortal() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // --- Core React Router hooks ---
  const location = useLocation();
  const navigate = useNavigate();

  // Derived active tab from current URL pathname
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/crm/leads')) return 'pipeline';
    if (path.includes('/crm/quotations')) return 'quotations';
    if (path.includes('/crm/clients')) return 'clients';
    if (path.includes('/crm/combo')) return 'combo_work';
    if (path.includes('/crm/financials')) return 'financials';
    if (path.includes('/crm/reminders')) return 'reminders';
    if (path.includes('/crm/club')) return 'club';
    return 'dashboard';
  };
  
  const activeTab = getActiveTabFromPath();

  const handleTabChange = (tabId: string) => {
    if (tabId === 'dashboard') navigate('/crm/dashboard');
    else if (tabId === 'quotations') navigate('/crm/quotations');
    else if (tabId === 'pipeline') navigate('/crm/leads');
    else if (tabId === 'clients') navigate('/crm/clients');
    else if (tabId === 'combo_work') navigate('/crm/combo');
    else if (tabId === 'financials') navigate('/crm/financials');
    else if (tabId === 'reminders') navigate('/crm/reminders');
    else if (tabId === 'club') navigate('/crm/club');
  };

  // ── Supabase-backed state ─────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [dbLoading, setDbLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Map Supabase row → Lead interface ────────────────────────────────────
  const mapLead = (row: any): Lead => ({
    id: row.id,
    name: row.name ?? '',
    representativeName: row.representative_name ?? row.name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    companyName: row.company_name ?? undefined,
    source: row.source ?? 'b2b',
    status: row.status ?? 'interested',
    qualificationColor: (row.status === 'converted' || row.status === 'quoted') ? 'green' : (row.status === 'called' || row.status === 'whatsapp_connected') ? 'yellow' : 'red',
    pipelineStep: row.pipeline_step ?? 'follow_up',
    followUpDate: row.follow_up_date ?? undefined,
    notes: row.notes ?? '',
    created_at: row.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    isClubMember: row.is_club_member ?? false,
    clubTier: row.club_tier ?? undefined,
    activityHistory: row.activity_history ?? [],
  });

  // ── Map Supabase row → Client interface ──────────────────────────────────
  const mapClient = (row: any): Client => ({
    id: row.id,
    name: row.full_name ?? row.name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    companyPhone: row.company_phone ?? undefined,
    type: row.client_type ?? row.type ?? 'B2B',
    companyName: row.company_name ?? undefined,
    registrationNumber: row.registration_number ?? undefined,
    servicesPackage: row.services_package ?? [],
    overallManager: row.overall_manager ?? '',
    delegatedServices: row.delegated_services ?? {},
    created_at: row.created_at?.slice(0, 10) ?? '',
    monthlyBilling: row.monthly_billing ?? 0,
    yearlyBilling: (row.monthly_billing ?? 0) * 12,
    activityHistory: row.activity_history ?? [],
    contractExpiryDate: row.contract_expiry_date ?? undefined,
    isClubMember: row.is_club_member ?? false,
    clubTier: row.club_tier ?? undefined,
  });

  // ── Map Supabase row → Quotation interface ───────────────────────────────
  const mapQuotation = (row: any): Quotation => ({
    id: row.id,
    quoteNumber: row.quote_number ?? `QT-2026-${row.id.slice(0, 4)}`,
    leadId: row.lead_id ?? null,
    clientName: row.client_name ?? '',
    representativeName: row.representative_name ?? row.client_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    companyName: row.company_name ?? undefined,
    type: row.client_type ?? 'B2B',
    serviceType: Array.isArray(row.services) ? row.services.join(', ') : (row.service_type ?? 'Bookkeeping & Tax'),
    servicesPackage: Array.isArray(row.services) ? row.services : ['Tax & VAT'],
    subtotal: row.subtotal ?? row.total_amount ?? 0,
    vatAmount: row.vat_amount ?? 0,
    budget: row.total_amount ?? 0,
    status: row.status ?? 'pending',
    created_at: row.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  });

  const [staffList, setStaffList] = useState(MOCK_EMPLOYEES);

  // ── Fetch all data from Supabase ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setDbLoading(true);
    try {
      const [leadsRes, clientsRes, quotesRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('quotations').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email, role'),
      ]);
      if (leadsRes.data)    setLeads(leadsRes.data.map(mapLead));
      if (clientsRes.data)  setClients(clientsRes.data.map(mapClient));
      if (quotesRes.data)   setQuotations(quotesRes.data.map(mapQuotation));
      if (profilesRes.data && profilesRes.data.length > 0) {
        const fetchedStaff = profilesRes.data.map(p => ({
          id: p.id,
          name: p.full_name || p.email,
          dept: p.role === 'department_head' ? 'Department Head' : p.role.toUpperCase()
        }));
        setStaffList([...fetchedStaff, ...MOCK_EMPLOYEES]);
      }
    } catch (err) {
      console.error('CRM fetchAll error:', err);
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Real-time subscriptions
    const ch = supabase
      .channel('crm_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },      () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' },    () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotations' }, () => fetchAll())
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const [tips, setTips] = useState([
    { id: 'tip_1', title: 'GCC VAT Filing Guide', content: 'Ensure all input tax credits match custom clearance bills of entry for smooth filing.', date: '2026-08-01', category: 'Tax' },
    { id: 'tip_2', title: 'Statutory Audit Readiness', content: 'Keep general ledgers reconciled and payroll PASI tax registries up to date before Q4 audit.', date: '2026-08-05', category: 'Audit' },
    { id: 'tip_3', title: 'SME Feasibility Checklists', content: 'For bank loan approvals, include a detailed 3-year cash flow projections model and sensitivity matrices.', date: '2026-08-10', category: 'Advisory' }
  ]);
  const [selectedClubTierFilter, setSelectedClubTierFilter] = useState<'all' | 'silver' | 'gold' | 'platinum'>('all');
  const [clubSearch, setClubSearch] = useState('');
  
  // WhatsApp States
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetUser, setWhatsAppTargetUser] = useState<{ name: string; phone: string } | null>(null);
  const [whatsAppBroadcastMode, setWhatsAppBroadcastMode] = useState(false);
  const [selectedBroadcastTip, setSelectedBroadcastTip] = useState<{ title: string; content: string } | null>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState('welcome');
  const [whatsAppCustomText, setWhatsAppCustomText] = useState('');
  const [apiDispatching, setApiDispatching] = useState(false);
  const [apiProgress, setApiProgress] = useState(0);
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  // Dossier & Logs States
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<Lead | null>(null);
  const [newClientLogText, setNewClientLogText] = useState('');
  const [newLeadLogText, setNewLeadLogText] = useState('');

  // Pipeline View Mode & Filters
  const [pipelineViewMode, setPipelineViewMode] = useState<'kanban' | 'list'>('kanban');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadStepFilter, setLeadStepFilter] = useState('all');

  // (localStorage sync removed — data is now persisted in Supabase)

  // Generate dynamic alerts (stale leads and expiring contracts)
  const dynamicAlerts = React.useMemo(() => {
    const alertsList: { type: 'stale_lead' | 'expiry'; title: string; desc: string }[] = [];
    
    // 1. Check for stale leads (> 7 days in follow_up or connect)
    leads.forEach(lead => {
      if (lead.pipelineStep === 'follow_up' || lead.pipelineStep === 'connect') {
        const created = new Date(lead.created_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          alertsList.push({
            type: 'stale_lead',
            title: isAr ? 'تحذير: فرصة معلقة قديمة' : 'Warning: Stale Lead',
            desc: isAr 
              ? `العميل المحتمل ${lead.name} معلق في خطوة "${lead.pipelineStep === 'follow_up' ? 'المتابعة' : 'الاتصال'}" منذ ${diffDays} أيام.` 
              : `Lead ${lead.name} has been stuck in "${lead.pipelineStep === 'follow_up' ? 'Follow-up' : 'Connect'}" step for ${diffDays} days.`,
          });
        }
      }
    });

    // 2. Check for contract expiries (within 30 days)
    clients.forEach(client => {
      if (client.contractExpiryDate) {
        const expiry = new Date(client.contractExpiryDate);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          alertsList.push({
            type: 'expiry',
            title: isAr ? 'تنبيه: انتهاء عقد قريب' : 'Alert: Contract Expiring Soon',
            desc: isAr 
              ? `عقد ${client.companyName || client.name} ينتهي خلال ${diffDays} يوم (${client.contractExpiryDate}).` 
              : `Contract for ${client.companyName || client.name} expires in ${diffDays} days (${client.contractExpiryDate}).`,
          });
        }
      }
    });

    return alertsList;
  }, [leads, clients, isAr]);

  // --- Lead Qualification / Conversion States ---
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState(MOCK_EMPLOYEES[0].name);
  const [isSubmittingConvert, setIsSubmittingConvert] = useState(false);
  const [convertForm, setConvertForm] = useState({
    manager: '',
    services: ['Audit'] as string[],
    subType: 'Statutory Financial Audit',
    billingAmount: '750',
    workScopeNotes: '',
  });

  const openConvertModal = (lead: Lead) => {
    setQualifyingLead(lead);
    setConvertForm({
      manager: staffList[0]?.name || MOCK_EMPLOYEES[0].name,
      services: ['Audit'],
      subType: 'Statutory Financial Audit',
      billingAmount: '750',
      workScopeNotes: lead.notes || '',
    });
  };

  // --- Onboarding Client Modal/Form States ---
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [clientType, setClientType] = useState<'B2B' | 'B2C'>('B2B');
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyPhone: '',
    companyName: '',
    registrationNumber: '',
    servicePackage: [] as string[],
    overallManager: MOCK_EMPLOYEES[0].name,
    initialActivity: '',
    monthlyBilling: 0,
    contractExpiryDate: '',
    isClubMember: false,
    clubTier: 'silver' as 'silver' | 'gold' | 'platinum',
    autoQuotation: true
  });

  const SERVICE_RATES: Record<string, number> = {
    'Tax & VAT': 150,
    'Audit': 300,
    'Bookkeeping': 250,
    'Business Advisory': 400
  };

  // --- Combo Work Configuration States ---
  const [selectedClientForCombo, setSelectedClientForCombo] = useState<string>(INITIAL_CLIENTS[0].id);
  const [comboSetup, setComboSetup] = useState({
    overallManager: INITIAL_CLIENTS[0].overallManager,
    services: INITIAL_CLIENTS[0].servicesPackage,
    delegation: INITIAL_CLIENTS[0].delegatedServices
  });

  // --- Export & Approval States ---
  const [isVpSignedOff, setIsVpSignedOff] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // --- Reminder Add State ---
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderType, setNewReminderType] = useState<'follow_up' | 'deadline' | 'review'>('follow_up');

  // --- Client History Detail View Modal ---
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  // ── Mini-CRM Log & Interaction Modal ──────────────────────────────────────
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLeadForLog, setSelectedLeadForLog] = useState<Lead | null>(null);
  const [logForm, setLogForm] = useState({
    type: 'call' as 'call' | 'whatsapp' | 'meeting' | 'note',
    status: 'interested' as Lead['status'],
    notes: '',
    followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
  });

  // ── Quotation Builder & Studio States ────────────────────────────────────
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [isSubmittingQuotation, setIsSubmittingQuotation] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    leadId: '' as string | null,
    clientName: '',
    representativeName: '',
    companyName: '',
    email: '',
    phone: '',
    clientType: 'B2B' as 'B2B' | 'B2C',
    services: ['Tax & VAT'] as string[],
    baseAmount: '350',
    includeVat: true,
    notes: '',
  });

  // Dynamic Interactive Builder options (Line items, docs, timeline, etc.)
  const [quoteLineItems, setQuoteLineItems] = useState<{ id: string; description: string; qty: number; rate: number }[]>([
    { id: '1', description: 'Tax & VAT Advisory & Compliance Services', qty: 1, rate: 350 }
  ]);
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteDocsRequired, setQuoteDocsRequired] = useState<string[]>([
    'COLOR PASSPORT COPIES OF SHAREHOLDERS',
    'COLOR PHOTO OF THE SHARE HOLDER',
    'EMAIL ID',
    'CONTACT NUMBER',
    'DOCUMENTS PROVIDING PREVIOUS EXPERIENCE IN THE SAME LINE OF BUSINESS OR EDUCATION CERTIFICATE'
  ]);
  const [customDocInput, setCustomDocInput] = useState('');

  const [quoteTimelineSteps, setQuoteTimelineSteps] = useState<{ id: string; step: string; duration: string; selected: boolean }[]>([
    { id: 't1', step: 'Share Transfer', duration: '4-6 Working Days', selected: true },
    { id: 't2', step: 'CR Renewal', duration: '1 Working Day', selected: true },
    { id: 't3', step: 'Activity License Renewal', duration: '1 Working Day', selected: true },
    { id: 't4', step: 'KYC Verification', duration: '1-2 Working Days', selected: true },
    { id: 't5', step: 'CR Certificate Issue', duration: '1-2 Working Days', selected: true },
    { id: 't6', step: 'Tax Card Issue', duration: '1-2 Working Days', selected: true },
    { id: 't7', step: 'Feasibility Study', duration: '1 Working Day', selected: true },
    { id: 't8', step: 'Attestation Services', duration: '2-3 Working Days', selected: true },
  ]);
  const [customTimelineStepName, setCustomTimelineStepName] = useState('');
  const [customTimelineStepDuration, setCustomTimelineStepDuration] = useState('1-2 Working Days');

  const [quotePaymentSchedule, setQuotePaymentSchedule] = useState({
    advanceTerms: 'Upon signing the quotation: 50%',
    balanceTerms: 'Upon completion of Visa / Service: 50%'
  });

  const [quoteImportantNotes, setQuoteImportantNotes] = useState<string[]>([
    'All government fees are subject to change without prior notice.',
    'All external approval fees shall be paid by the client as per voucher issued.',
    'Industrial activity fees will be charged based on the specific activity selected.',
    'This quotation is issued based on general business activity. Any variation in cost will be communicated before proceeding.'
  ]);

  const [quoteShowQty, setQuoteShowQty] = useState(true);
  const [quoteKycPhotoProof, setQuoteKycPhotoProof] = useState(false);
  const [quotePresentationMode, setQuotePresentationMode] = useState<'detailed' | 'simple'>('detailed');
  const [quotationSearchQuery, setQuotationSearchQuery] = useState('');
  const [quotationStatusFilter, setQuotationStatusFilter] = useState<'all' | 'pending' | 'approved' | 'invoiced'>('all');

  const convertNumberToWords = (num: number): string => {
    if (!num || num <= 0) return 'Zero Omani Rials Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
      if (n < 1000000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
      return n.toString();
    };

    const whole = Math.floor(num);
    const baisa = Math.round((num - whole) * 1000);
    let result = inWords(whole) + ' Omani Rial';
    if (whole !== 1) result += 's';
    if (baisa > 0) {
      result += ' and ' + inWords(baisa) + ' Baisa';
    }
    result += ' Only';
    return result;
  };

  // ── Direct Client Onboarding Modal ───────────────────────────────────────
  const [showDirectClientModal, setShowDirectClientModal] = useState(false);
  const [directClientForm, setDirectClientForm] = useState({
    name: '',
    companyName: '',
    registrationNumber: '',
    email: '',
    phone: '',
    clientType: 'B2B' as 'B2B' | 'B2C',
    services: ['Tax & VAT'] as string[],
    billingAmount: '450',
    manager: MOCK_EMPLOYEES[0].name,
  });

  // ── Quick Add Lead Modal (Minimal Lead Capture) ─────────────────────────
  const [showQuickAddLeadModal, setShowQuickAddLeadModal] = useState(false);
  const [isSubmittingQuickLead, setIsSubmittingQuickLead] = useState(false);
  const [quickLeadForm, setQuickLeadForm] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    source: 'b2b' as Lead['source'],
    status: 'interested' as Lead['status'],
    notes: '',
  });

  const handleQuickAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingQuickLead) return;
    setIsSubmittingQuickLead(true);
    try {
      const newLead = {
        name: quickLeadForm.name,
        company_name: quickLeadForm.companyName || null,
        phone: quickLeadForm.phone,
        email: quickLeadForm.email || `${quickLeadForm.name.toLowerCase().replace(/\s+/g, '.')}@client.om`,
        source: quickLeadForm.source,
        status: quickLeadForm.status,
        pipeline_step: 'follow_up',
        notes: quickLeadForm.notes,
        activity_history: [`${new Date().toISOString().slice(0, 10)} - Lead captured via Quick Add Lead`],
      };

      const { error } = await supabase.from('leads').insert([newLead]);
      if (error) throw error;

      setShowQuickAddLeadModal(false);
      setQuickLeadForm({ name: '', companyName: '', phone: '', email: '', source: 'b2b', status: 'interested', notes: '' });
      await fetchAll();
    } catch (err) {
      console.error('Error adding lead:', err);
      alert('Error creating lead. Please check inputs.');
    } finally {
      setIsSubmittingQuickLead(false);
    }
  };

  // ── Handlers for New Mini-CRM Features ───────────────────────────────────
  const openLogModal = (lead: Lead) => {
    setSelectedLeadForLog(lead);
    setLogForm({
      type: 'call',
      status: lead.status || 'interested',
      notes: '',
      followUpDate: lead.followUpDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    });
    setIsLogModalOpen(true);
  };

  const handleSaveLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForLog) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const logEntry = `${today} ${timeStr} [${logForm.type.toUpperCase()}]: ${logForm.notes}`;
      const updatedHistory = [...(selectedLeadForLog.activityHistory || []), logEntry];

      const { error } = await supabase.from('leads').update({
        status: logForm.status,
        follow_up_date: logForm.followUpDate,
        activity_history: updatedHistory,
      }).eq('id', selectedLeadForLog.id);

      if (error) throw error;

      alert(isAr ? 'تم تسجيل التفاعل وتحديث حالة العميل المحتمل بنجاح!' : 'Interaction logged & lead status updated successfully!');
      setIsLogModalOpen(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error saving interaction log');
    }
  };

  const openQuotationModalForLead = (lead?: Lead) => {
    setEditingQuoteId(null);
    if (lead) {
      setQuoteForm({
        leadId: lead.id,
        clientName: lead.companyName ? `${lead.name} (${lead.companyName})` : lead.name,
        representativeName: lead.name,
        companyName: lead.companyName || '',
        email: lead.email,
        phone: lead.phone,
        clientType: lead.companyName ? 'B2B' : 'B2C',
        services: ['Tax & VAT'],
        baseAmount: '350',
        includeVat: true,
        notes: lead.notes || '',
      });
      setQuoteLineItems([
        { id: '1', description: lead.notes ? `Scope: ${lead.notes}` : 'Tax & VAT Advisory & Compliance Services', qty: 1, rate: 350 }
      ]);
    } else {
      setQuoteForm({
        leadId: null,
        clientName: '',
        representativeName: '',
        companyName: '',
        email: '',
        phone: '',
        clientType: 'B2B',
        services: ['Tax & VAT'],
        baseAmount: '350',
        includeVat: true,
        notes: '',
      });
      setQuoteLineItems([
        { id: '1', description: 'Tax & VAT Advisory & Compliance Services', qty: 1, rate: 350 }
      ]);
    }
    setShowQuotationModal(true);
  };

  const openEditQuotationModal = (quote: Quotation) => {
    setEditingQuoteId(quote.id);
    const subtotal = quote.subtotal || quote.budget || 350;
    const hasVat = (quote.vatAmount || 0) > 0;
    setQuoteForm({
      leadId: quote.leadId || null,
      clientName: quote.clientName,
      representativeName: quote.representativeName || quote.clientName,
      companyName: quote.companyName || '',
      email: quote.email || '',
      phone: quote.phone || '',
      clientType: quote.type || 'B2B',
      services: quote.servicesPackage || ['Tax & VAT'],
      baseAmount: subtotal.toString(),
      includeVat: hasVat,
      notes: '',
    });
    setQuoteLineItems([
      { id: '1', description: quote.serviceType || 'Financial & Tax Advisory Services', qty: 1, rate: subtotal }
    ]);
    setShowQuotationModal(true);
  };

  const handleSaveQuotationSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingQuotation) return;
    setIsSubmittingQuotation(true);

    try {
      const lineSubtotal = quoteLineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0);
      const baseAmt = Math.max(0, lineSubtotal - quoteDiscount);
      const vatAmt = quoteForm.includeVat ? +(baseAmt * 0.05).toFixed(3) : 0;
      const totalAmt = +(baseAmt + vatAmt).toFixed(3);
      const serviceNamesList = quoteLineItems.map(i => i.description);

      if (editingQuoteId) {
        const { error } = await supabase.from('quotations').update({
          client_name: quoteForm.clientName || 'Valued Client',
          client_type: quoteForm.clientType,
          services: serviceNamesList.length > 0 ? serviceNamesList : quoteForm.services,
          subtotal: baseAmt,
          vat_amount: vatAmt,
          total_amount: totalAmt,
        }).eq('id', editingQuoteId);

        if (error) throw error;

        alert(isAr ? 'تم تحديث عرض السعر بنجاح!' : 'Quotation updated successfully!');
      } else {
        const quoteNum = `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        const { error } = await supabase.from('quotations').insert([{
          quote_number: quoteNum,
          lead_id: quoteForm.leadId || null,
          client_name: quoteForm.clientName || 'Valued Client',
          client_type: quoteForm.clientType,
          services: serviceNamesList.length > 0 ? serviceNamesList : quoteForm.services,
          subtotal: baseAmt,
          vat_amount: vatAmt,
          total_amount: totalAmt,
          status: 'sent',
          valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        }]);

        if (error) throw error;

        if (quoteForm.leadId) {
          await supabase.from('leads').update({
            status: 'quoted',
            pipeline_step: 'update',
            activity_history: [
              ...(leads.find(l => l.id === quoteForm.leadId)?.activityHistory || []),
              `${new Date().toISOString().split('T')[0]} - Quotation #${quoteNum} generated for OMR ${totalAmt}.`,
            ],
          }).eq('id', quoteForm.leadId);
        }

        alert(isAr ? `تم إنشاء عرض السعر برقم ${quoteNum} بنجاح!` : `Quotation #${quoteNum} created successfully!`);
      }

      setShowQuotationModal(false);
      setEditingQuoteId(null);
      await fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error saving quotation');
    } finally {
      setIsSubmittingQuotation(false);
    }
  };

  const handleClientAcceptsQuote = async (quotation: Quotation) => {
    try {
      await supabase.from('quotations').update({ status: 'approved' }).eq('id', quotation.id);

      if (quotation.leadId) {
        await supabase.from('leads').update({ status: 'converted', pipeline_step: 'sort' }).eq('id', quotation.leadId);
      }

      const { data: newClient, error: clientErr } = await supabase.from('clients').insert([{
        full_name: quotation.clientName,
        email: quotation.email || 'client@maisarah.om',
        phone: quotation.phone || '+968 9000 0000',
        client_type: quotation.type,
        company_name: quotation.companyName || null,
        services_package: quotation.servicesPackage || ['Tax & VAT'],
        monthly_billing: quotation.budget,
        activity_history: [`Client accepted quotation #${quotation.quoteNumber || quotation.id}`],
        source: quotation.type === 'B2B' ? 'b2b' : 'direct',
      }]).select().single();

      if (clientErr) throw clientErr;

      const serviceName = quotation.serviceType || 'Bookkeeping & Tax';
      await supabase.from('client_jobs').insert([{
        client_id: newClient.id,
        quotation_id: quotation.id,
        service_type: serviceName,
        billing_type: 'one_time',
        status: 'pending',
        amount: quotation.subtotal || quotation.budget,
        vat_amount: quotation.vatAmount || 0,
        description: `New Job Task from Accepted Quote #${quotation.quoteNumber || quotation.id}. Client: ${quotation.clientName}`,
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      }]);

      await supabase.from('notifications').insert([{
        role: 'hod',
        type: 'new_client',
        title: 'New Client Job Task — Quote Accepted!',
        message: `Client "${quotation.clientName}" accepted quote (${serviceName}). Please assign to employee.`,
        ref_id: newClient.id,
        ref_table: 'clients',
      }]);

      await supabase.from('notifications').insert([{
        role: 'accountant',
        type: 'invoice_ready',
        title: 'Quotation Approved — Ready to Invoice',
        message: `Quotation for "${quotation.clientName}" approved. Amount: OMR ${quotation.budget.toFixed(3)}.`,
        ref_id: quotation.id,
        ref_table: 'quotations',
      }]);

      alert(isAr
        ? `تم قبول عرض السعر رقم ${quotation.quoteNumber || quotation.id}! تم إضافة العميل وإرسال المهمة لرئيس القسم بنجاح! 🎉`
        : `🎉 Client Accepted Quote #${quotation.quoteNumber || quotation.id}! Client onboarded & Job Task sent to HOD!`
      );
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error processing quote acceptance');
    }
  };

  const handleDirectClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const billing = parseFloat(directClientForm.billingAmount) || 300;
      const expiryDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

      const { data: newClient, error: clientErr } = await supabase.from('clients').insert([{
        full_name: directClientForm.name,
        company_name: directClientForm.clientType === 'B2B' ? directClientForm.companyName : null,
        registration_number: directClientForm.clientType === 'B2B' ? directClientForm.registrationNumber : null,
        email: directClientForm.email,
        phone: directClientForm.phone,
        client_type: directClientForm.clientType,
        services_package: directClientForm.services,
        overall_manager: directClientForm.manager,
        monthly_billing: billing,
        contract_expiry_date: expiryDate,
        activity_history: ['Direct client onboarding added via CRM.'],
        source: 'direct',
      }]).select().single();

      if (clientErr) throw clientErr;

      await supabase.from('client_jobs').insert([{
        client_id: newClient.id,
        service_type: directClientForm.services.join(', '),
        billing_type: 'one_time',
        status: 'pending',
        amount: billing,
        vat_amount: +(billing * 0.05).toFixed(3),
        description: `Direct Client Job Task for ${directClientForm.companyName || directClientForm.name}`,
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      }]);

      await supabase.from('notifications').insert([{
        role: 'hod',
        type: 'new_client',
        title: 'New Direct Client Onboarded',
        message: `Direct Client "${directClientForm.companyName || directClientForm.name}" added. Services: ${directClientForm.services.join(', ')}.`,
        ref_id: newClient.id,
        ref_table: 'clients',
      }]);

      alert(isAr ? 'تم إضافة العميل المباشر وإشعار رئيس القسم بنجاح!' : 'Direct client onboarded & HOD notified!');
      setShowDirectClientModal(false);
      setDirectClientForm({ name: '', companyName: '', registrationNumber: '', email: '', phone: '', clientType: 'B2B', services: ['Tax & VAT'], billingAmount: '450', manager: MOCK_EMPLOYEES[0].name });
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error adding direct client');
    }
  };

  // --- Lead Onboarding & Submission logic (Supabase) ---
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let calculatedBilling = onboardForm.monthlyBilling;
    if (calculatedBilling === 0) {
      calculatedBilling = onboardForm.servicePackage.reduce((sum, pkg) => sum + (SERVICE_RATES[pkg] || 0), 0);
      if (onboardForm.isClubMember) {
        const discount = onboardForm.clubTier === 'platinum' ? 0.20 : onboardForm.clubTier === 'gold' ? 0.15 : 0.10;
        calculatedBilling = Math.round(calculatedBilling * (1 - discount));
      }
    }

    const expiryDate = onboardForm.contractExpiryDate ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const clientPayload = {
      full_name: onboardForm.name,
      email: onboardForm.email,
      phone: onboardForm.phone,
      company_phone: onboardForm.companyPhone || null,
      client_type: clientType,
      company_name: clientType === 'B2B' ? onboardForm.companyName : null,
      registration_number: clientType === 'B2B' ? onboardForm.registrationNumber : null,
      services_package: onboardForm.servicePackage,
      overall_manager: onboardForm.overallManager,
      delegated_services: onboardForm.servicePackage.reduce((acc: Record<string,string>, service: string) => {
        const emp = MOCK_EMPLOYEES.find(e => e.dept === service) || MOCK_EMPLOYEES[0];
        acc[service] = emp.name;
        return acc;
      }, {}),
      monthly_billing: calculatedBilling,
      is_club_member: onboardForm.isClubMember,
      club_tier: onboardForm.isClubMember ? onboardForm.clubTier : null,
      activity_history: [
        'Client onboarded through CRM registry form.',
        onboardForm.initialActivity || 'Initial client record registered.',
      ],
      contract_expiry_date: expiryDate,
      source: clientType === 'B2B' ? 'b2b' : 'direct',
    };

    const { data: newClientRow, error } = await supabase
      .from('clients')
      .insert([clientPayload])
      .select()
      .single();

    if (error) {
      alert('Error saving client: ' + error.message);
      return;
    }

    // Auto-create quotations in Supabase
    if (onboardForm.autoQuotation && onboardForm.servicePackage.length > 0) {
      const quoteRows = onboardForm.servicePackage.map(pkg => {
        let budget = SERVICE_RATES[pkg] || 0;
        if (onboardForm.isClubMember) {
          const discount = onboardForm.clubTier === 'platinum' ? 0.20 : onboardForm.clubTier === 'gold' ? 0.15 : 0.10;
          budget = Math.round(budget * (1 - discount));
        }
        const vatAmt = +(budget * 0.05).toFixed(3);
        return {
          client_id: newClientRow.id,
          client_name: clientType === 'B2B' ? onboardForm.companyName : onboardForm.name,
          client_type: clientType,
          services: [pkg],
          subtotal: budget,
          vat_amount: vatAmt,
          total_amount: +(budget + vatAmt).toFixed(3),
          status: 'pending',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      });
      await supabase.from('quotations').insert(quoteRows);
    }

    // Notify HOD role about new client
    await supabase.from('notifications').insert([{
      role: 'hod',
      type: 'new_client',
      title: 'New Client Onboarded',
      message: `A new client "${onboardForm.name}" has been onboarded via CRM. Services: ${onboardForm.servicePackage.join(', ')}.`,
      ref_id: newClientRow.id,
      ref_table: 'clients',
    }]);

    setShowOnboardingModal(false);
    setOnboardForm({
      name: '', email: '', phone: '', companyPhone: '', companyName: '',
      registrationNumber: '', servicePackage: [], overallManager: MOCK_EMPLOYEES[0].name,
      initialActivity: '', monthlyBilling: 0, contractExpiryDate: '',
      isClubMember: false, clubTier: 'silver', autoQuotation: true,
    });
    // fetchAll() triggered via real-time subscription
  };

  // --- Shift lead pipeline step (Supabase) ---
  const shiftLeadStep = async (leadId: string, nextStep: Lead['pipelineStep']) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (nextStep === 'sort') openConvertModal(lead);

    const today = new Date().toISOString().slice(0, 10);
    const logEntry = `${today} - Stage shifted to: ${nextStep.replace('_', ' ')}`;
    const updatedHistory = [...(lead.activityHistory || []), logEntry];

    // Optimistic UI update
    setLeads(prev => prev.map(l =>
      l.id === leadId ? { ...l, pipelineStep: nextStep, activityHistory: updatedHistory } : l
    ));

    // Persist to Supabase
    await supabase.from('leads').update({
      pipeline_step: nextStep,
      activity_history: updatedHistory,
    }).eq('id', leadId);
  };

  // --- Lead Qualification / Conversion to Client (Supabase) ---
  const handleConfirmQualification = async () => {
    if (!qualifyingLead || isSubmittingConvert) return;
    setIsSubmittingConvert(true);

    try {
      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const billing = parseFloat(convertForm.billingAmount) || 750;
      const managerName = convertForm.manager || staffList[0]?.name || MOCK_EMPLOYEES[0].name;
      const selectedServices = convertForm.services.length > 0 ? convertForm.services : ['Audit'];
      const detailedService = `${selectedServices.join(', ')} (${convertForm.subType})`;

      // 1. Insert client into Supabase
      const { data: newClientRow, error: clientErr } = await supabase
        .from('clients')
        .insert([{
          full_name: qualifyingLead.name,
          email: qualifyingLead.email,
          phone: qualifyingLead.phone,
          client_type: qualifyingLead.companyName ? 'B2B' : 'B2C',
          company_name: qualifyingLead.companyName || null,
          services_package: selectedServices,
          overall_manager: managerName,
          delegated_services: selectedServices.reduce((acc, srv) => ({ ...acc, [srv]: managerName }), {}),
          monthly_billing: billing,
          activity_history: [
            'Converted from CRM pipeline lead.',
            `Service Scope: ${detailedService}`,
            convertForm.workScopeNotes || qualifyingLead.notes || 'Lead qualified and onboarded.',
          ],
          contract_expiry_date: expiryDate,
          lead_id: qualifyingLead.id,
          source: qualifyingLead.companyName ? 'b2b' : 'direct',
        }])
        .select()
        .single();

      if (clientErr) throw clientErr;

      // 2. Insert Job Task for HOD Workspace
      const { error: jobErr } = await supabase.from('client_jobs').insert([{
        client_id: newClientRow.id,
        service_type: detailedService,
        billing_type: 'one_time',
        status: 'pending',
        amount: billing,
        vat_amount: +(billing * 0.05).toFixed(3),
        description: convertForm.workScopeNotes || `Converted Lead Job Task: ${detailedService}`,
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      }]);
      if (jobErr) console.error('Error creating client job:', jobErr);

      // 3. Mark lead as converted
      await supabase.from('leads').update({
        status: 'converted',
        pipeline_step: 'sort',
        activity_history: [
          ...(qualifyingLead.activityHistory || []),
          `${new Date().toISOString().slice(0, 10)} - Converted to client with service (${detailedService}).`,
        ],
      }).eq('id', qualifyingLead.id);

      // 4. Notify HOD
      await supabase.from('notifications').insert([{
        role: 'hod',
        type: 'new_client',
        title: 'Lead Converted & Job Task Created',
        message: `Client "${qualifyingLead.name}" onboarded for ${detailedService}. Manager: ${managerName}. Job Task dispatched to HOD workspace!`,
        ref_id: newClientRow.id,
        ref_table: 'clients',
      }]);

      alert(isAr 
        ? `تم تحويل الفرصة إلى عميل بنجاح وإرسال مهمة العمل لرئيس القسم!` 
        : `🎉 Lead Converted to Client! Job Task dispatched to HOD workspace!`
      );

      setLeads(prev => prev.filter(l => l.id !== qualifyingLead.id));
      setQualifyingLead(null);
      await fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error converting lead');
    } finally {
      setIsSubmittingConvert(false);
    }
  };

  // --- Update Combo Work Settings ---
  const handleUpdateCombo = (e: React.FormEvent) => {
    e.preventDefault();
    setClients(prevClients => prevClients.map(c => {
      if (c.id === selectedClientForCombo) {
        return {
          ...c,
          overallManager: comboSetup.overallManager,
          servicesPackage: comboSetup.services,
          delegatedServices: comboSetup.delegation
        };
      }
      return c;
    }));
    alert('Combo account assignments updated successfully!');
  };

  // --- Approve Quotation (Supabase) ---
  const handleApproveQuotation = async (quotation: Quotation) => {
    const { error } = await supabase
      .from('quotations')
      .update({ status: 'approved' })
      .eq('id', quotation.id);

    if (error) {
      alert('Error approving quotation: ' + error.message);
      return;
    }

    // Notify accountant role that a quotation is ready for invoicing
    await supabase.from('notifications').insert([{
      role: 'accountant',
      type: 'invoice_ready',
      title: 'Quotation Approved — Ready to Invoice',
      message: `Quotation for "${quotation.clientName}" (${quotation.serviceType}) approved. Amount: OMR ${quotation.budget.toFixed(3)}. Please create the invoice.`,
      ref_id: quotation.id,
      ref_table: 'quotations',
    }]);

    // Optimistic update
    setQuotations(prev => prev.map(q => q.id === quotation.id ? { ...q, status: 'invoiced' } : q));
    alert(`✅ Quotation Approved! Accountant notified to create invoice for OMR ${quotation.budget.toFixed(3)}.`);
  };

  // --- Trigger Lead Export ---
  const handleExportData = () => {
    if (!isVpSignedOff) {
      setShowExportModal(true);
      return;
    }
    // Simulate File Download
    alert('Export Verification Completed. Downloading CRM_Data_Export.csv...');
  };

  // --- Add Reminder ---
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle || !newReminderDate) return;
    const item: Reminder = {
      id: `RM-${Math.floor(400 + Math.random() * 600)}`,
      title: newReminderTitle,
      date: newReminderDate,
      type: newReminderType,
      completed: false
    };
    setReminders([...reminders, item]);
    setNewReminderTitle('');
    setNewReminderDate('');
  };

  // Toggle Reminder completion
  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  // WhatsApp helper functions
  const getInterpolatedWhatsAppText = () => {
    if (whatsAppBroadcastMode) {
      if (selectedBroadcastTip) {
        return `Maisarah Business Club Tip of the Week: *${selectedBroadcastTip.title}* - ${selectedBroadcastTip.content}. Access more guides inside your Maisarah portal.`;
      }
      return `Welcome to Maisarah Business Club! Read weekly tax tips inside the portal.`;
    }
    if (!whatsAppTargetUser) return '';
    const name = whatsAppTargetUser.name;
    if (whatsAppTemplate === 'welcome') {
      return `Dear *${name}*, Welcome to the Maisarah Business Club! We are thrilled to support your corporate growth. Feel free to access our exclusive tips and reach out to your Account Manager anytime.`;
    }
    if (whatsAppTemplate === 'vat') {
      return `Dear *${name}*, This is a tax compliance reminder from Maisarah. The Q3 VAT filing portal is closing shortly. Please upload your transaction spreadsheets to your Client Vault.`;
    }
    return whatsAppCustomText;
  };

  const handleOpenWhatsAppWeb = () => {
    const text = getInterpolatedWhatsAppText();
    const phone = whatsAppBroadcastMode ? '' : (whatsAppTargetUser?.phone || '').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const startWhatsAppSimulation = () => {
    setApiProgress(0);
    setApiDispatching(true);
    setApiLogs(['Initializing Secure WhatsApp Gateway (Meta Cloud API)...']);
    
    setTimeout(() => {
      setApiLogs(prev => [...prev, 'Authenticating credentials... Token verified.']);
      setApiProgress(20);
    }, 850);

    setTimeout(() => {
      const recipientCount = whatsAppBroadcastMode 
        ? clients.filter(c => c.isClubMember).length 
        : 1;
      setApiLogs(prev => [...prev, `Compiling payload. Total messages queued: ${recipientCount}`]);
      setApiProgress(40);
    }, 1600);

    setTimeout(() => {
      if (whatsAppBroadcastMode) {
        const clubRecipients = clients.filter(c => c.isClubMember);
        clubRecipients.forEach((rec, idx) => {
          setTimeout(() => {
            setApiLogs(prev => [...prev, `Dispatched to ${rec.companyName || rec.name} (${rec.phone}) - [DELIVERED]`]);
            setApiProgress(prev => Math.min(prev + (50 / Math.max(clubRecipients.length, 1)), 95));
          }, idx * 400);
        });
      } else if (whatsAppTargetUser) {
        setApiLogs(prev => [...prev, `Dispatched to ${whatsAppTargetUser.name} (${whatsAppTargetUser.phone}) - [DELIVERED]`]);
        setApiProgress(80);
      }
    }, 2400);

    const completeTime = whatsAppBroadcastMode 
      ? 2400 + (clients.filter(c => c.isClubMember).length * 400) + 500
      : 3400;

    setTimeout(() => {
      setApiLogs(prev => [...prev, 'WhatsApp campaign dispatch finished successfully. Connection closed.']);
      setApiProgress(100);
      setApiDispatching(false);
    }, completeTime);
  };

  // Advanced Logs & Reminders helper functions
  const handleAddClientLog = (clientId: string) => {
    if (!newClientLogText.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const logEntry = `${today} - ${newClientLogText.trim()}`;
    
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const updatedHistory = [...c.activityHistory, logEntry];
        // Instantly sync modal state
        setSelectedClientForHistory({ ...c, activityHistory: updatedHistory });
        return { ...c, activityHistory: updatedHistory };
      }
      return c;
    }));
    setNewClientLogText('');
  };

  const handleAddLeadLog = (leadId: string) => {
    if (!newLeadLogText.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const logEntry = `${today} - ${newLeadLogText.trim()}`;
    
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const updatedHistory = [...(l.activityHistory || []), logEntry];
        // Instantly sync modal state
        setSelectedLeadForHistory({ ...l, activityHistory: updatedHistory });
        return { ...l, activityHistory: updatedHistory };
      }
      return l;
    }));
    setNewLeadLogText('');
  };

  const handleScheduleLeadReminder = (leadName: string) => {
    const today = new Date();
    // Schedule follow-up for 3 days from now
    today.setDate(today.getDate() + 3);
    const dateStr = today.toISOString().split('T')[0];
    
    const newRem: Reminder = {
      id: `RM-${Math.floor(400 + Math.random() * 600)}`,
      title: `Follow up callback with lead: ${leadName}`,
      date: dateStr,
      type: 'follow_up',
      completed: false
    };

    setReminders(prev => [...prev, newRem]);
    alert(`Success: Scheduled a follow-up reminder callback for ${leadName} on ${dateStr}!`);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      (lead.companyName && lead.companyName.toLowerCase().includes(leadSearchQuery.toLowerCase())) ||
      lead.email.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.id.toLowerCase().includes(leadSearchQuery.toLowerCase());
      
    const matchesStep = leadStepFilter === 'all' || lead.pipelineStep === leadStepFilter;
    const matchesStatus = leadStatusFilter === 'all' || lead.status === leadStatusFilter;
    
    return matchesSearch && matchesStep && matchesStatus;
  });

  if (dbLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-[#A11212] mx-auto" />
          <p className="text-sm font-bold text-gray-500">Loading CRM data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* --- Tab Content Areas --- */}
      
      {/* 1. DASHBOARD INSIGHTS TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Leads</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{leads.length + 3}</h3>
              <p className="text-[10px] text-orange-600 font-bold mt-1">Pending Qualification</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-[#A11212] font-black uppercase tracking-widest">Converted Clients</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">24</h3>
              <p className="text-[10px] text-green-700 font-bold mt-1">➔ 75% Conversion Rate</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">B2B Retainers</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">
                {clients.filter(c => c.type === 'B2B').length}
              </h3>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Active Accounts</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total ARR value</p>
              <h3 className="text-3xl font-black text-[#A11212] mt-2">
                {clients.reduce((acc, c) => acc + c.yearlyBilling, 0).toLocaleString()} OMR
              </h3>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Annual Recurring Revenue</p>
            </div>
          </div>

          {/* Chart & Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversion Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Conversion Metrics & Growth</h4>
                <p className="text-[10px] text-gray-400 font-bold">Historical data indicating client conversion performance</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={RECHARTS_DATA}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A11212" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#A11212" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Leads" stroke="#A11212" fillOpacity={1} fill="url(#colorLeads)" />
                    <Area type="monotone" dataKey="Converted" stroke="#16a34a" fillOpacity={1} fill="url(#colorConv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Summary / Notifications */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Recent Activities & Alerts</h4>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {dynamicAlerts.length === 0 ? (
                    <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-2xl border border-gray-200">
                      <CheckCircle2 size={18} className="text-green-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-gray-700">{isAr ? 'لا توجد تنبيهات عاجلة' : 'No Urgent Alerts'}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{isAr ? 'جميع العمليات والفرص تسير بشكل جيد.' : 'All pipelines and active retentions are in healthy status.'}</p>
                      </div>
                    </div>
                  ) : (
                    dynamicAlerts.map((alert, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 items-start p-3 rounded-2xl border ${
                          alert.type === 'stale_lead' 
                            ? 'bg-red-50/40 border-red-100/50 text-[#A11212]' 
                            : 'bg-yellow-50/40 border-yellow-100/50 text-yellow-700'
                        }`}
                      >
                        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-gray-800">{alert.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{alert.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#A11212]/5 p-4 rounded-2xl border border-[#A11212]/10 text-center">
                <p className="text-xs font-black text-gray-900">VP Verification Required</p>
                <p className="text-[10px] text-gray-500 mt-1">There are pending exports awaiting managerial sign-off.</p>
                <button
                  onClick={() => handleTabChange('financials')}
                  className="mt-3 w-full bg-[#A11212] hover:bg-[#800e0e] text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Manage Approvals
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LEAD PIPELINE TAB */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Qualification & Lead Pipeline</h3>
              <p className="text-xs text-gray-500 font-bold">Follow leads through the step-by-step qualification flow to Client status</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setShowQuickAddLeadModal(true)}
                className="bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <PlusCircle size={15} /> {isAr ? 'إضافة فرصة جديدة' : '+ Quick Add Lead'}
              </button>

              {/* Temperature Codes */}
              <div className="hidden lg:flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase mr-3">Cold</span>
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase mr-3">Warm</span>
                <span className="w-2.5 h-2.5 bg-green-600 rounded-full"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase">Hot / Qualified</span>
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-205">
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    pipelineViewMode === 'kanban' 
                      ? 'bg-[#A11212] text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Kanban Board
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    pipelineViewMode === 'list' 
                      ? 'bg-[#A11212] text-white shadow-sm' 
                      : 'text-gray-650 hover:text-gray-900'
                  }`}
                >
                  Data List
                </button>
              </div>
            </div>
          </div>

          {/* List View Search/Filters */}
          {pipelineViewMode === 'list' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs animate-in fade-in duration-200">
              {/* Search Bar */}
              <div>
                <label className="block text-[9px] font-black text-gray-450 uppercase tracking-widest mb-1.5 font-bold">Search Leads</label>
                <input
                  type="text"
                  placeholder="Search by name, company..."
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] focus:bg-white transition-all"
                />
              </div>
              {/* Funnel Stage Filter */}
              <div>
                <label className="block text-[9px] font-black text-gray-455 uppercase tracking-widest mb-1.5 font-bold">Funnel Phase</label>
                <select
                  value={leadStepFilter}
                  onChange={(e) => setLeadStepFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider outline-none text-gray-700 focus:border-[#A11212] focus:bg-white transition-all"
                >
                  <option value="all">All Steps</option>
                  <option value="follow_up">1. Follow Up</option>
                  <option value="add_data">2. Add Data</option>
                  <option value="connect">3. Connect</option>
                  <option value="update">4. Update</option>
                  <option value="sort">5. Sort & Qualify</option>
                </select>
              </div>
              {/* Interest Status Filter */}
              <div>
                <label className="block text-[9px] font-black text-gray-455 uppercase tracking-widest mb-1.5 font-bold">Interest Status</label>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider outline-none text-gray-700 focus:border-[#A11212] focus:bg-white transition-all"
                >
                  <option value="all">All Temperatures</option>
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              </div>
            </div>
          )}

          {/* Conditional Rendering: Kanban vs List */}
          {pipelineViewMode === 'kanban' ? (
            /* Kanban Columns View */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
              
              {/* Column 1: Follow Up */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>1. Follow-Up</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'follow_up').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'follow_up').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onLogCall={() => openLogModal(lead)}
                      onCreateQuote={() => openQuotationModalForLead(lead)}
                      onWhatsApp={() => { setWhatsAppTargetUser({ name: lead.name, phone: lead.phone }); setWhatsAppModalOpen(true); }}
                      onConvert={() => setQualifyingLead(lead)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 2: Add Data */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>2. Add Data</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'add_data').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'add_data').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onLogCall={() => openLogModal(lead)}
                      onCreateQuote={() => openQuotationModalForLead(lead)}
                      onWhatsApp={() => { setWhatsAppTargetUser({ name: lead.name, phone: lead.phone }); setWhatsAppModalOpen(true); }}
                      onConvert={() => setQualifyingLead(lead)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 3: Connect */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>3. Connect</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'connect').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'connect').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onLogCall={() => openLogModal(lead)}
                      onCreateQuote={() => openQuotationModalForLead(lead)}
                      onWhatsApp={() => { setWhatsAppTargetUser({ name: lead.name, phone: lead.phone }); setWhatsAppModalOpen(true); }}
                      onConvert={() => setQualifyingLead(lead)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 4: Update */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>4. Update</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'update').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'update').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onLogCall={() => openLogModal(lead)}
                      onCreateQuote={() => openQuotationModalForLead(lead)}
                      onWhatsApp={() => { setWhatsAppTargetUser({ name: lead.name, phone: lead.phone }); setWhatsAppModalOpen(true); }}
                      onConvert={() => setQualifyingLead(lead)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 5: Sort (Qualified) */}
              <div className="bg-[#A11212]/5 p-4 rounded-3xl border border-[#A11212]/20 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>5. Sort & Qualify</span>
                  <span className="bg-[#A11212] text-white px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'sort').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'sort').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onLogCall={() => openLogModal(lead)}
                      onCreateQuote={() => openQuotationModalForLead(lead)}
                      onWhatsApp={() => { setWhatsAppTargetUser({ name: lead.name, phone: lead.phone }); setWhatsAppModalOpen(true); }}
                      onConvert={() => setQualifyingLead(lead)}
                    />
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Structured Leads Spreadsheet View */
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm animate-in fade-in duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-4 pl-6">ID / Contact Name</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Phone & Email</th>
                      <th className="p-4">Interest Rating</th>
                      <th className="p-4">Funnel Phase</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 italic font-medium">
                          No leads match the active search parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map(lead => {
                        const statusColors = {
                          cold: 'bg-red-50 text-red-700 border-red-100',
                          warm: 'bg-yellow-50 text-yellow-800 border-yellow-100',
                          hot: 'bg-green-50 text-green-700 border-green-100',
                          converted: 'bg-blue-50 text-blue-700 border-blue-100'
                        }[lead.status] || 'bg-gray-50 text-gray-600';

                        return (
                          <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="p-4 pl-6">
                              <span className="block text-[8px] bg-gray-100 border text-gray-500 font-black px-1.5 py-0.5 rounded w-max mb-1">
                                {lead.id}
                              </span>
                              <span className="font-black text-gray-900 text-sm">{lead.name}</span>
                            </td>
                            <td className="p-4 font-bold text-gray-700">
                              {lead.companyName || <span className="text-gray-400 italic text-[10px]">B2C Client</span>}
                            </td>
                            <td className="p-4 space-y-0.5 text-gray-500 font-bold text-[11px]">
                              <p className="flex items-center gap-1.5">📞 {lead.phone}</p>
                              <p className="flex items-center gap-1.5 text-[10px]">✉️ {lead.email}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColors}`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <select
                                value={lead.pipelineStep}
                                onChange={(e) => shiftLeadStep(lead.id, e.target.value as Lead['pipelineStep'])}
                                className="bg-gray-50 border border-gray-250 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider outline-none text-gray-750 focus:border-[#A11212]"
                              >
                                <option value="follow_up">1. Follow Up</option>
                                <option value="add_data">2. Add Data</option>
                                <option value="connect">3. Connect</option>
                                <option value="update">4. Update</option>
                                <option value="sort">5. Sort & Qualify</option>
                              </select>
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLeadForHistory(lead)}
                                  className="bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                  Dossier
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleScheduleLeadReminder(lead.name)}
                                  className="bg-red-900/5 hover:bg-red-900/10 border border-red-900/10 text-[#A11212] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all font-bold"
                                >
                                  + Follow-up
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
          )}
        </div>
      )}

      {/* 3. CLIENTS & LEADS DIRECTORY TAB */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Header Controls & Export Verification */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Onboarded Clients & Active Accounts</h3>
              <p className="text-xs text-gray-500 font-bold">Select client rows to review historical data, timeline actions, or trigger export</p>
            </div>
            <div className="flex items-center gap-3">
              {/* VP Signoff Toggle */}
              <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-250">
                <ShieldCheck size={16} className={isVpSignedOff ? 'text-green-700' : 'text-gray-400'} />
                <span className="text-[10px] font-black uppercase text-gray-600">VP Export Sign-off</span>
                <input
                  type="checkbox"
                  checked={isVpSignedOff}
                  onChange={(e) => setIsVpSignedOff(e.target.checked)}
                  className="w-4 h-4 text-[#A11212] accent-[#A11212] rounded cursor-pointer"
                />
              </div>

              <button
                onClick={() => setShowDirectClientModal(true)}
                className="bg-brand-dark hover:bg-brand-dark/90 text-white text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-dark/20 active:scale-95 transition-all"
              >
                <UserPlus size={14} /> {isAr ? 'إضافة عميل مباشر' : '+ Direct Client Add'}
              </button>

              <button
                onClick={() => setShowOnboardingModal(true)}
                className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <PlusCircle size={14} /> {isAr ? 'تسجيل عميل جديد' : 'Onboard Form'}
              </button>

              <button
                onClick={handleExportData}
                className="bg-white border border-gray-200 hover:border-brand-dark/40 text-gray-700 text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Download size={14} /> Export Directory
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-start">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">ID</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Client</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Segment Type</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Services Package</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Account Owner</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-end">ARR Value</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.map(client => (
                    <tr key={client.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="p-4 text-xs font-black text-gray-900">{client.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#A11212]/5 text-[#A11212] font-black text-xs flex items-center justify-center">
                            {client.companyName ? <Building2 size={14} /> : client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900">{client.companyName || client.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{client.email} · {client.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          client.type === 'B2B' 
                            ? 'bg-red-50 text-red-700 border-red-100' 
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {client.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {client.servicesPackage.map(s => (
                            <span key={s} className="bg-gray-50 border border-gray-200 text-gray-650 text-[9px] px-2 py-0.5 rounded font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-black text-gray-700">{client.overallManager}</td>
                      <td className="p-4 text-xs font-black text-gray-950 text-end">
                        {client.yearlyBilling.toLocaleString()} OMR
                        <span className="block text-[8px] text-gray-400 font-bold">Monthly: {client.monthlyBilling} OMR</span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedClientForHistory(client)}
                          className="bg-gray-50 border border-gray-200 hover:border-[#A11212] hover:text-[#A11212] text-gray-600 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all"
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMBO WORK TAB */}
      {activeTab === 'combo_work' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Account Configuration Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Multi-Department Combo Account Settings</h3>
              <p className="text-xs text-gray-500 font-bold">Configure client account owners and assign specialized personnel for multi-departmental services</p>
            </div>

            <form onSubmit={handleUpdateCombo} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Active Client</label>
                <select
                  value={selectedClientForCombo}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setSelectedClientForCombo(cId);
                    const targetClient = clients.find(c => c.id === cId);
                    if (targetClient) {
                      setComboSetup({
                        overallManager: targetClient.overallManager,
                        services: targetClient.servicesPackage,
                        delegation: targetClient.delegatedServices || {}
                      });
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName || c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Lead Owner */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Overall Account Owner</label>
                  <select
                    value={comboSetup.overallManager}
                    onChange={(e) => setComboSetup({ ...comboSetup, overallManager: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    {MOCK_EMPLOYEES.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.dept})</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1 font-bold">Account Owner oversees client correspondence across all services.</p>
                </div>

                {/* Sub services checkboxes */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Active Service Departments</label>
                  <div className="space-y-2 mt-1.5">
                    {DEPARTMENTS.map(dept => {
                      const active = comboSetup.services.includes(dept);
                      return (
                        <label key={dept} className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              let nextServices = [...comboSetup.services];
                              let nextDelegation = { ...comboSetup.delegation };

                              if (checked) {
                                nextServices.push(dept);
                                const defaultEmp = MOCK_EMPLOYEES.find(emp => emp.dept === dept) || MOCK_EMPLOYEES[0];
                                nextDelegation[dept] = defaultEmp.name;
                              } else {
                                nextServices = nextServices.filter(s => s !== dept);
                                delete nextDelegation[dept];
                              }

                              setComboSetup({
                                ...comboSetup,
                                services: nextServices,
                                delegation: nextDelegation
                              });
                            }}
                            className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                          />
                          <span>{dept}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Department Personnel Delegation grid */}
              {comboSetup.services.length > 0 && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Departmental Resource Assignment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {comboSetup.services.map(dept => (
                      <div key={dept} className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-2">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">{dept} Assignee</label>
                        <select
                          value={comboSetup.delegation[dept] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setComboSetup(prev => ({
                              ...prev,
                              delegation: {
                                ...prev.delegation,
                                [dept]: val
                              }
                            }));
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                        >
                          {MOCK_EMPLOYEES.filter(emp => emp.dept === dept || dept === 'Tax & VAT').map(emp => (
                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl transition-all"
              >
                Save Account Structure
              </button>

            </form>
          </div>

          {/* Right panel: Current Delegation Overview */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Account Matrix View</h4>
            {(() => {
              const selectedC = clients.find(c => c.id === selectedClientForCombo);
              if (!selectedC) return <p className="text-xs text-gray-400">Select a client to preview account matrix.</p>;
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Corporate Client</p>
                    <h5 className="font-black text-sm text-gray-900 mt-1">{selectedC.companyName || selectedC.name}</h5>
                    <p className="text-[10px] text-gray-400 font-bold">ID: {selectedC.id}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Manager (Supervisor)</p>
                    <div className="flex items-center gap-2 p-3 bg-red-50/30 border border-red-100 rounded-xl">
                      <Award className="text-[#A11212]" size={16} />
                      <span className="text-xs font-black text-gray-800">{selectedC.overallManager}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-Service Assignments</p>
                    <div className="space-y-2">
                      {selectedC.servicesPackage.map(service => {
                        const assignee = selectedC.delegatedServices?.[service] || 'Not Assigned';
                        return (
                          <div key={service} className="flex justify-between items-center bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-150">
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">{service}</p>
                              <p className="text-xs font-black text-gray-900">{assignee}</p>
                            </div>
                            <span className="text-[9px] bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded">Active</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4.5. QUOTATIONS STUDIO TAB */}
      {activeTab === 'quotations' && (
        <div className="space-y-6">
          {/* Header Banner & Quick Action */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">
                  {isAr ? 'استوديو عروض الأسعار التفاعلي' : 'Quotations Studio & Pipeline'}
                </h3>
                <p className="text-xs text-gray-500 font-bold">
                  {isAr 
                    ? 'إنشاء، تعديل، ومعاينة عروض الأسعار الرسمية لشركة ميسرة ومتابعة الاعتمادات والموافقات' 
                    : 'Create, edit, preview & convert official proposals for Maisarah clients'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openQuotationModalForLead()}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-700/20 active:scale-95 transition-all"
            >
              <DollarSign size={16} />
              <span>{isAr ? '+ إنشاء عرض سعر تفاعلي' : '+ Build Interactive Quotation'}</span>
            </button>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'إجمالي عروض الأسعار' : 'Total Quotations'}</p>
                <p className="text-xl font-black text-gray-900 mt-1">{quotations.length}</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><FileText size={20} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'بانتظار الموافقة' : 'Pending / Sent'}</p>
                <p className="text-xl font-black text-amber-600 mt-1">
                  {quotations.filter(q => q.status === 'pending' || q.status === 'sent' || q.status === 'draft').length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'مقبولة ومصنوعة' : 'Approved & Invoiced'}</p>
                <p className="text-xl font-black text-green-600 mt-1">
                  {quotations.filter(q => q.status === 'approved' || q.status === 'invoiced').length}
                </p>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle2 size={20} /></div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'إجمالي قيمة العروض' : 'Total Pipeline Value'}</p>
                <p className="text-xl font-black text-purple-700 mt-1">
                  OMR {quotations.reduce((sum, q) => sum + (q.budget || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-700 rounded-xl"><DollarSign size={20} /></div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
              {(['all', 'pending', 'approved', 'invoiced'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setQuotationStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    quotationStatusFilter === st
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {st === 'all' ? (isAr ? 'كل العروض' : 'All Quotes') : st}
                </button>
              ))}
            </div>

            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder={isAr ? 'بحث برقم العرض، اسم العميل...' : 'Search by quote # or client name...'}
                value={quotationSearchQuery}
                onChange={e => setQuotationSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Quotations Studio Cards List */}
          <div className="space-y-4">
            {quotations
              .filter(q => quotationStatusFilter === 'all' || q.status === quotationStatusFilter || (quotationStatusFilter === 'pending' && (q.status === 'sent' || q.status === 'draft')))
              .filter(q => 
                (q.clientName || '').toLowerCase().includes(quotationSearchQuery.toLowerCase()) ||
                (q.quoteNumber || q.id).toLowerCase().includes(quotationSearchQuery.toLowerCase()) ||
                (q.serviceType || '').toLowerCase().includes(quotationSearchQuery.toLowerCase())
              )
              .map(q => (
                <div key={q.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-gray-900">{q.clientName}</h4>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg font-black">{q.quoteNumber || q.id}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-black uppercase">{q.type}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border ${
                        q.status === 'approved' || q.status === 'invoiced'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-bold">{q.serviceType}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      <span>Date: {q.created_at || '2026-07-20'}</span>
                      <span>&bull;</span>
                      <span>Subtotal: OMR {(q.subtotal || q.budget).toLocaleString()}</span>
                      {q.vatAmount ? <span>+ 5% VAT (OMR {q.vatAmount})</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-end mr-2">
                      <p className="text-[9px] font-black uppercase text-gray-400">Total Budget</p>
                      <p className="text-lg font-black text-purple-700">OMR {q.budget.toLocaleString()}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditQuotationModal(q)}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Edit size={14} /> {isAr ? 'فتح الاستوديو والتعديل' : 'Open Studio & Edit'}
                    </button>

                    {q.status === 'pending' || q.status === 'sent' || q.status === 'draft' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleClientAcceptsQuote(q)}
                          className="bg-green-700 hover:bg-green-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 size={14} /> Client Accepted (Onboard & HOD Task)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveQuotation(q)}
                          className="bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
                        >
                          Approve & Bill
                        </button>
                      </>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-800 border border-green-200 px-3.5 py-2 rounded-xl font-black uppercase inline-flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Accepted & Invoiced
                      </span>
                    )}
                  </div>
                </div>
              ))}
            {quotations.length === 0 && (
              <div className="bg-white p-12 rounded-3xl text-center border border-gray-100">
                <FileText size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">No quotations found.</p>
                <p className="text-xs text-gray-400 mt-1">Click "+ Build Interactive Quotation" above to generate your first proposal.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. FINANCIAL CONTROLS TAB */}
      {activeTab === 'financials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HOD Workspace: Quotation to Invoice pipeline */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Quotations & Client Acceptance Pipeline</h3>
                <p className="text-xs text-gray-500 font-bold">Build proposals, track acceptance, and auto-trigger HOD job assignment</p>
              </div>
              <button
                onClick={() => openQuotationModalForLead()}
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-700/20 active:scale-95 transition-all"
              >
                <DollarSign size={14} /> {isAr ? 'عرض سعر جديد' : '+ Build Quotation'}
              </button>
            </div>

            <div className="space-y-3">
              {quotations.map(q => (
                <div key={q.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">{q.clientName}</span>
                      <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black uppercase">{q.quoteNumber || q.id}</span>
                      <span className="text-[9px] bg-gray-100 border text-gray-600 px-1.5 py-0.5 rounded font-black uppercase">{q.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-bold">{q.serviceType} · <span className="text-purple-700 font-black">{q.budget.toLocaleString()} OMR</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    {q.status === 'pending' || q.status === 'sent' || q.status === 'draft' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditQuotationModal(q)}
                          className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                        >
                          <Edit size={12} /> {isAr ? 'تعديل' : 'Edit Quote'}
                        </button>
                        <button
                          onClick={() => handleClientAcceptsQuote(q)}
                          className="bg-green-700 hover:bg-green-800 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 size={12} /> Client Accepted (Onboard & HOD Task)
                        </button>
                        <button
                          onClick={() => handleApproveQuotation(q)}
                          className="bg-gray-800 hover:bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all"
                        >
                          Approve & Bill
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-150 px-2.5 py-1.5 rounded-xl font-black uppercase inline-flex items-center gap-1">
                        <CheckCheckIcon size={12} /> Accepted & Invoiced (HOD Notified)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export verification instructions */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Export Regulatory Control</h4>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-3 text-xs text-gray-600 leading-relaxed">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="text-[#A11212]" size={16} /> Manager Signature Audit
              </p>
              <p>Under regulatory policy guidelines, corporate data spreadsheets cannot be downloaded without secondary authorization.</p>
              <p>Please toggle the **VP Export Sign-off** inside the clients tab to enable full directory downloads.</p>
            </div>
            
            <div className="border-t border-gray-100 pt-4 text-center">
              <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${
                isVpSignedOff ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isVpSignedOff ? 'Export Authorized' : 'Export Restricted'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. REMINDER DASHBOARD TAB */}
      {activeTab === 'reminders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reminders List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Tasks & Deadline Alerts</h3>
              <p className="text-xs text-gray-500 font-bold">Review and check off follow-up callbacks or contract deadlines</p>
            </div>

            <div className="space-y-3">
              {reminders.map(rem => (
                <div 
                  key={rem.id} 
                  onClick={() => toggleReminder(rem.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                    rem.completed 
                      ? 'bg-gray-50 border-gray-200 opacity-60' 
                      : 'bg-white border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      rem.completed ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}>
                      {rem.completed && <Check size={12} className="text-white" />}
                    </div>
                    <span className={`text-xs font-bold ${rem.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {rem.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      rem.type === 'follow_up' ? 'bg-orange-50 text-orange-700' :
                      rem.type === 'deadline' ? 'bg-red-50 text-red-750' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {rem.type}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">{rem.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Reminder Form */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Add Task Alert</h4>
            <form onSubmit={handleAddReminder} className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call Client regarding audit draft"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Deadline Date</label>
                <input
                  type="date"
                  required
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Classification</label>
                <select
                  value={newReminderType}
                  onChange={(e) => setNewReminderType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="follow_up">Follow Up</option>
                  <option value="deadline">Deadline</option>
                  <option value="review">Audit / Review</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
              >
                Log Reminder Alert
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. BUSINESS CLUB SPACE */}
      {activeTab === 'club' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-950 to-red-800 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            <div className="relative z-10 space-y-2">
              <span className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {isAr ? 'برنامج عضوية نادي الأعمال' : 'Business Club Member Program'}
              </span>
              <h2 className="text-3xl font-black tracking-tight">{isAr ? 'نادي أعمال ميسرة' : 'Maisarah Business Club'}</h2>
              <p className="text-red-100/70 text-xs max-w-xl font-medium">
                {isAr 
                  ? 'برنامج حصري يربط بين رواد الأعمال وأصحاب الشركات لتلقي استشارات مجانية، وتحديثات ضريبية دورية، وخصومات مميزة على باقات خدماتنا.' 
                  : 'An exclusive network connecting corporate clients to receive complimentary tax advisories, regulatory digests, and tier-based discounts.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Member Roster */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{isAr ? 'أعضاء النادي النشطون' : 'Active Club Members'}</h3>
                  <p className="text-xs text-gray-500 font-bold">{isAr ? 'إدارة وتصفية العملاء المشتركين بالنادي' : 'Manage and filter active club members and benefits'}</p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث بالاسم...' : 'Search members...'}
                    value={clubSearch}
                    onChange={(e) => setClubSearch(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212] w-full sm:w-40"
                  />
                  <select
                    value={selectedClubTierFilter}
                    onChange={(e) => setSelectedClubTierFilter(e.target.value as any)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="all">{isAr ? 'كل الفئات' : 'All Tiers'}</option>
                    <option value="silver">{isAr ? 'الفئة الفضية' : 'Silver Tier'}</option>
                    <option value="gold">{isAr ? 'الفئة الذهبية' : 'Gold Tier'}</option>
                    <option value="platinum">{isAr ? 'الفئة البلاتينية' : 'Platinum Tier'}</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="border-b border-gray-50 text-[9px] font-black uppercase text-gray-400 tracking-widest">
                      <th className="pb-3 text-start">{isAr ? 'العضو' : 'Member'}</th>
                      <th className="pb-3 text-start">{isAr ? 'فئة العضوية' : 'Membership Tier'}</th>
                      <th className="pb-3 text-start">{isAr ? 'الاشتراكات الشهرية' : 'Monthly Retainer'}</th>
                      <th className="pb-3 text-end">{isAr ? 'تواصل' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clients
                      .filter(c => c.isClubMember)
                      .filter(c => selectedClubTierFilter === 'all' || c.clubTier === selectedClubTierFilter)
                      .filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase()) || (c.companyName || '').toLowerCase().includes(clubSearch.toLowerCase()))
                      .map(member => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4">
                            <h4 className="font-black text-sm text-gray-900">{member.companyName || member.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold">{member.name} &bull; {member.phone}</p>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              member.clubTier === 'platinum' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                              member.clubTier === 'gold' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              'bg-slate-50 border-slate-200 text-slate-600'
                            }`}>
                              {member.clubTier}
                            </span>
                          </td>
                          <td className="py-4 font-black text-xs text-gray-800">
                            {member.monthlyBilling} OMR <span className="text-[9px] text-gray-400 font-bold">/mo</span>
                          </td>
                          <td className="py-4 text-end">
                            <button
                              onClick={() => {
                                setWhatsAppTargetUser({ name: member.name, phone: member.phone });
                                setWhatsAppBroadcastMode(false);
                                setWhatsAppTemplate('welcome');
                                setWhatsAppModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors"
                            >
                              WhatsApp
                            </button>
                          </td>
                        </tr>
                      ))}
                    {clients.filter(c => c.isClubMember).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                          No active club members found. Register new clients and check the 'Business Club' option!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Tips & Resources */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{isAr ? 'مستندات وتوجيهات مجانية' : 'Complimentary Resources'}</h3>
                  <p className="text-xs text-gray-500 font-bold">{isAr ? 'تعميم نصائح الأعمال للأعضاء عبر واتساب' : 'Broadcast business advisories to members'}</p>
                </div>

                <div className="space-y-4">
                  {tips.map(tip => (
                    <div key={tip.id} className="border border-gray-100 rounded-2xl p-4 space-y-3 hover:border-gray-250 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="bg-[#A11212]/5 text-[#A11212] px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{tip.category}</span>
                        <span className="text-[9px] text-gray-400 font-bold">{tip.date}</span>
                      </div>
                      <h4 className="font-black text-sm text-gray-900">{tip.title}</h4>
                      <p className="text-xs text-gray-550 leading-relaxed font-medium">{tip.content}</p>
                      
                      <div className="border-t border-gray-50 pt-3 flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-bold">Free Club Perk</span>
                        <button
                          onClick={() => {
                            setWhatsAppBroadcastMode(true);
                            setSelectedBroadcastTip(tip);
                            setWhatsAppModalOpen(true);
                          }}
                          className="bg-[#A11212] hover:bg-[#800e0e] text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          Broadcast Tip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS & POPUPS --- */}

      {/* A. Onboarding Client Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <form onSubmit={handleOnboardSubmit} className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Client Onboarding Portal</h3>
              <button type="button" onClick={() => setShowOnboardingModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* Type Switcher */}
              <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setClientType('B2B')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                    clientType === 'B2B' ? 'bg-[#A11212] text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  B2B Corporate Account
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('B2C')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                    clientType === 'B2C' ? 'bg-[#A11212] text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  B2C Standard Customer
                </button>
              </div>

              {/* General Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contact Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Salim Al-Busaidi"
                    value={onboardForm.name}
                    onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.om"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Personal Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+968..."
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                {clientType === 'B2B' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Corporate Phone</label>
                    <input
                      type="text"
                      placeholder="+968 2456..."
                      value={onboardForm.companyPhone}
                      onChange={(e) => setOnboardForm({ ...onboardForm, companyPhone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                )}
              </div>

              {/* B2B Specific details */}
              {clientType === 'B2B' && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">B2B Corporate Identifiers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Company Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Mazoon Electricity SAOC"
                        value={onboardForm.companyName}
                        onChange={(e) => setOnboardForm({ ...onboardForm, companyName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Commercial Registration (CR)</label>
                      <input
                        type="text"
                        required
                        placeholder="CR-1234567"
                        value={onboardForm.registrationNumber}
                        onChange={(e) => setOnboardForm({ ...onboardForm, registrationNumber: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Scope & Assignee */}
              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Overall Account Manager</label>
                  <select
                    value={onboardForm.overallManager}
                    onChange={(e) => setOnboardForm({ ...onboardForm, overallManager: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    {MOCK_EMPLOYEES.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.dept})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>Monthly Billing (OMR)</span>
                    <span className="text-[#A11212] font-black">
                      Est: {onboardForm.servicePackage.reduce((sum, pkg) => sum + (SERVICE_RATES[pkg] || 0), 0) > 0 ? (
                        (() => {
                          let sum = onboardForm.servicePackage.reduce((acc, pkg) => acc + (SERVICE_RATES[pkg] || 0), 0);
                          if (onboardForm.isClubMember) {
                            const disc = onboardForm.clubTier === 'platinum' ? 0.20 : onboardForm.clubTier === 'gold' ? 0.15 : 0.10;
                            sum = Math.round(sum * (1 - disc));
                          }
                          return `${sum} OMR`;
                        })()
                      ) : 'Select services'}
                    </span>
                  </label>
                  <input
                    type="number"
                    required
                    value={onboardForm.monthlyBilling}
                    onChange={(e) => setOnboardForm({ ...onboardForm, monthlyBilling: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    placeholder="Enter 0 to use Auto-Estimate"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contract Expiry Date</label>
                  <input
                    type="date"
                    value={onboardForm.contractExpiryDate}
                    onChange={(e) => setOnboardForm({ ...onboardForm, contractExpiryDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              {/* Service Select Checklist */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Scope of Services</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-2xl">
                  {DEPARTMENTS.map(dept => (
                    <label key={dept} className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onboardForm.servicePackage.includes(dept)}
                        onChange={(e) => {
                          const active = e.target.checked;
                          setOnboardForm(prev => ({
                            ...prev,
                            servicePackage: active 
                              ? [...prev.servicePackage, dept] 
                              : prev.servicePackage.filter(s => s !== dept)
                          }));
                        }}
                        className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                      />
                      <span>{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Business Club Membership & Quotations */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Business Club & Estimations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-red-900/5 p-4 rounded-2xl border border-red-900/10">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onboardForm.isClubMember}
                      onChange={(e) => setOnboardForm({ ...onboardForm, isClubMember: e.target.checked })}
                      className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                    />
                    <span>Business Club Member</span>
                  </label>

                  {onboardForm.isClubMember && (
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Club Tier</label>
                      <select
                        value={onboardForm.clubTier}
                        onChange={(e) => setOnboardForm({ ...onboardForm, clubTier: e.target.value as any })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-[#A11212]"
                      >
                        <option value="silver">Silver Tier (10% Off)</option>
                        <option value="gold">Gold Tier (15% Off)</option>
                        <option value="platinum">Platinum Tier (20% Off)</option>
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onboardForm.autoQuotation}
                      onChange={(e) => setOnboardForm({ ...onboardForm, autoQuotation: e.target.checked })}
                      className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                    />
                    <span>Auto-create Quotations</span>
                  </label>
                </div>
              </div>

              {/* Log Initial Activity */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Log Initial Activity</label>
                <textarea
                  placeholder="e.g. Introductory presentation completed, NDA signed..."
                  value={onboardForm.initialActivity}
                  onChange={(e) => setOnboardForm({ ...onboardForm, initialActivity: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowOnboardingModal(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
              >
                Register & Onboard
              </button>
            </div>
          </form>
        </div>
      )}

      {/* B. Lead Qualification & Convert to Client Modal */}
      {qualifyingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-green-700">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                    {isAr ? 'تحويل الفرصة إلى عميل' : 'Qualify & Convert Lead to Client'}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-bold">
                    {qualifyingLead.name} ({qualifyingLead.companyName || 'B2C Client'})
                  </p>
                </div>
              </div>
              <button onClick={() => setQualifyingLead(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleConfirmQualification(); }} className="space-y-4 text-xs">
              {/* Account Manager / HOD Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isAr ? 'تعيين المدير المسؤول / رئيس القسم *' : 'Assign Account Manager / HOD *'}
                </label>
                <select
                  value={convertForm.manager}
                  onChange={(e) => setConvertForm(p => ({ ...p, manager: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {staffList.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.dept})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Categories */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isAr ? 'الخدمات المطلوبة *' : 'Select Required Services *'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Tax & VAT', 'Audit', 'Bookkeeping', 'Business Advisory'].map(srv => (
                    <label key={srv} className="flex items-center gap-2 bg-gray-50 border p-2 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={convertForm.services.includes(srv)}
                        onChange={e => {
                          if (e.target.checked) setConvertForm(p => ({ ...p, services: [...p.services, srv] }));
                          else setConvertForm(p => ({ ...p, services: p.services.filter(s => s !== srv) }));
                        }}
                        className="rounded accent-green-600 w-4 h-4"
                      />
                      <span className="font-bold text-gray-700">{srv}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Service Sub-Type / Audit Specification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isAr ? 'نوع التدقيق / التفاصيل الفنية' : 'Service Sub-type / Audit Type'}
                  </label>
                  <select
                    value={convertForm.subType}
                    onChange={(e) => setConvertForm(p => ({ ...p, subType: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Statutory Financial Audit">Statutory Financial Audit</option>
                    <option value="Internal Audit & Controls Review">Internal Audit & Controls</option>
                    <option value="Tax Audit & Compliance Verification">Tax Audit & Compliance</option>
                    <option value="VAT Return Filing & Submission">VAT Return Filing</option>
                    <option value="Corporate Tax Advisory">Corporate Tax Advisory</option>
                    <option value="Full-Scope Client Bookkeeping">Client Bookkeeping</option>
                    <option value="Business Advisory & Feasibility Matrix">Business Advisory & Feasibility</option>
                    <option value="Specialized Custom Engagement">Specialized Custom Engagement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {isAr ? 'قيمة العقد المتفق عليها (OMR) *' : 'Agreed Contract Amount (OMR) *'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={convertForm.billingAmount}
                    onChange={(e) => setConvertForm(p => ({ ...p, billingAmount: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-green-700 focus:border-[#A11212]"
                  />
                </div>
              </div>

              {/* Work Scope / HOD Instructions */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  {isAr ? 'تفاصيل العمل ومواصفات الخدمة لرئيس القسم *' : 'Work Details & Specific HOD Scope *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={isAr ? 'أدخل تفاصيل ومواصفات العمل المطلوبة من رئيس القسم وموظفي التدقيق...' : 'e.g. Conduct statutory financial audit for FY2025 records. Client requires preliminary draft within 3 weeks.'}
                  value={convertForm.workScopeNotes}
                  onChange={(e) => setConvertForm(p => ({ ...p, workScopeNotes: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setQualifyingLead(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConvert}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingConvert ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isAr ? 'جاري التحويل...' : 'Converting...'}</span>
                    </>
                  ) : (
                    <span>{isAr ? 'تحويل لعميل وإرسال المهمة' : 'Convert & Dispatch HOD Task'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Export Verification warning popup */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-[#A11212] mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Export Restricted</h3>
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              You cannot export the client registry spreadsheet without VP Verification. Please toggle the **VP Export Sign-off** checklist at the top of the directory to authenticate your download.
            </p>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase transition-all"
            >
              Understand
            </button>
          </div>
        </div>
      )}

      {/* D. Client History & Activity Logs Modal */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#A11212]">Account History Logs</h3>
              <button onClick={() => setSelectedClientForHistory(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
              <h4 className="font-black text-sm text-gray-900">{selectedClientForHistory.companyName || selectedClientForHistory.name}</h4>
              <p className="text-[10px] text-gray-500 mt-1 font-bold">Onboarded: {selectedClientForHistory.created_at}</p>
              {selectedClientForHistory.contractExpiryDate && (
                <p className={`text-[10px] mt-1.5 font-black ${
                  (new Date(selectedClientForHistory.contractExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30
                    ? 'text-red-700'
                    : 'text-green-700'
                }`}>
                  {isAr ? 'تاريخ انتهاء العقد: ' : 'Contract Expiry Date: '} {selectedClientForHistory.contractExpiryDate}
                </p>
              )}
            </div>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {selectedClientForHistory.activityHistory.map((log, index) => (
                <div key={index} className="flex gap-3 items-start p-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <Activity size={14} className="text-gray-400 mt-0.5" />
                  <span className="text-xs font-medium text-gray-700">{log}</span>
                </div>
              ))}
            </div>

            {/* Add Log Form */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <label className="block text-[9px] font-black text-gray-455 uppercase tracking-wider">Log New Interaction</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Sent tax update document, Callback requested..."
                  value={newClientLogText}
                  onChange={(e) => setNewClientLogText(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                />
                <button
                  type="button"
                  onClick={() => handleAddClientLog(selectedClientForHistory.id)}
                  className="bg-[#A11212] hover:bg-[#800e0e] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Log
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedClientForHistory(null)}
              className="w-full bg-[#A11212] hover:bg-[#800e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}

      {/* E. Lead Details & Activity Logs Modal */}
      {selectedLeadForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#A11212]">Lead Details & History</h3>
              <button onClick={() => setSelectedLeadForHistory(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            
            {/* Lead Meta Information Card */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-155 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Lead Name</p>
                <p className="font-black text-gray-950 text-sm mt-0.5">{selectedLeadForHistory.name}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Company Name</p>
                <p className="font-black text-gray-950 text-sm mt-0.5">{selectedLeadForHistory.companyName || 'B2C'}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Contact Email</p>
                <p className="font-bold text-gray-600 mt-0.5">{selectedLeadForHistory.email}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Contact Phone</p>
                <p className="font-bold text-gray-600 mt-0.5">{selectedLeadForHistory.phone}</p>
              </div>
            </div>

            {/* Lead Status Details */}
            <div className="flex justify-between items-center bg-red-900/5 p-4 rounded-xl border border-red-900/10">
              <div>
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Funnel Phase</span>
                <p className="text-xs font-black text-gray-900 capitalize mt-0.5">{selectedLeadForHistory.pipelineStep.replace('_', ' ')}</p>
              </div>
              <div className="text-end">
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Interest Level</span>
                <p className="text-xs font-black text-[#A11212] uppercase tracking-wide mt-0.5">{selectedLeadForHistory.status}</p>
              </div>
            </div>

            {/* Lead Log Timeline */}
            <div>
              <label className="block text-[10px] font-black text-gray-450 uppercase tracking-widest mb-1.5 font-bold">Interaction History Logs</label>
              <div className="space-y-2 max-h-[22vh] overflow-y-auto pr-1">
                {(selectedLeadForHistory.activityHistory || []).map((log, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                    <Activity size={14} className="text-gray-400 mt-0.5" />
                    <span className="text-xs font-medium text-gray-700">{log}</span>
                  </div>
                ))}
                {(!selectedLeadForHistory.activityHistory || selectedLeadForHistory.activityHistory.length === 0) && (
                  <p className="text-xs text-gray-400 italic text-center p-3 bg-gray-50 rounded-xl border">No activities logged yet.</p>
                )}
              </div>
            </div>

            {/* Add Log Form */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <label className="block text-[9px] font-black text-gray-455 uppercase tracking-wider">Log New Interaction</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Completed intro meeting, Requested pricing info..."
                  value={newLeadLogText}
                  onChange={(e) => setNewLeadLogText(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                />
                <button
                  type="button"
                  onClick={() => handleAddLeadLog(selectedLeadForHistory.id)}
                  className="bg-[#A11212] hover:bg-[#800e0e] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Log
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleScheduleLeadReminder(selectedLeadForHistory.name);
                  setSelectedLeadForHistory(null);
                }}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Schedule Follow-up
              </button>
              <button
                type="button"
                onClick={() => setSelectedLeadForHistory(null)}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-all"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. WhatsApp Dispatcher & Gateway Simulator Modal */}
      {whatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  {whatsAppBroadcastMode ? 'WhatsApp Broadcast Campaign' : 'WhatsApp Contact Manager'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setWhatsAppModalOpen(false);
                  setApiLogs([]);
                  setApiProgress(0);
                }} 
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Recipient Details */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold text-gray-700">
                <p className="text-[10px] uppercase text-gray-400 mb-1">Target Audience</p>
                {whatsAppBroadcastMode ? (
                  <p className="text-gray-900 text-sm">All Active Business Club Members ({clients.filter(c => c.isClubMember).length} Recipients)</p>
                ) : (
                  <p className="text-gray-900 text-sm">{whatsAppTargetUser?.name} ({whatsAppTargetUser?.phone})</p>
                )}
              </div>

              {/* Template Options (Only for Single User Contact) */}
              {!whatsAppBroadcastMode && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Message Template</label>
                  <select
                    value={whatsAppTemplate}
                    onChange={(e) => setWhatsAppTemplate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="welcome">Welcome to Business Club</option>
                    <option value="vat">Q3 VAT Compliance Reminder</option>
                    <option value="custom">Custom Message (Free text)</option>
                  </select>
                </div>
              )}

              {/* Message Preview */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Message Preview</label>
                {whatsAppTemplate === 'custom' && !whatsAppBroadcastMode ? (
                  <textarea
                    rows={4}
                    value={whatsAppCustomText}
                    onChange={(e) => setWhatsAppCustomText(e.target.value)}
                    placeholder="Type your WhatsApp message..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                  />
                ) : (
                  <div className="bg-green-50/50 border border-green-150 p-4 rounded-2xl text-xs text-green-950 font-bold whitespace-pre-line leading-relaxed">
                    {getInterpolatedWhatsAppText()}
                  </div>
                )}
              </div>

              {/* API Dispatch Progress & Console Simulator */}
              {(apiDispatching || apiLogs.length > 0) && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs font-black text-gray-900 uppercase">
                    <span>Sending Progress</span>
                    <span>{Math.round(apiProgress)}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${apiProgress}%` }}
                    />
                  </div>

                  {/* Mock Terminal Console */}
                  <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-[10px] h-32 overflow-y-auto space-y-1 scrollbar-hide shadow-inner border border-gray-850">
                    {apiLogs.map((log, idx) => (
                      <p key={idx} className="animate-fade-in">&gt; {log}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
              {!whatsAppBroadcastMode && (
                <button
                  type="button"
                  onClick={handleOpenWhatsAppWeb}
                  disabled={apiDispatching}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Open WhatsApp Web
                </button>
              )}
              <button
                type="button"
                onClick={startWhatsAppSimulation}
                disabled={apiDispatching}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {apiDispatching ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Run API Broadcaster</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: Mini-CRM Log Call & Interaction Modal ───────────── */}
      {isLogModalOpen && selectedLeadForLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <PhoneCall size={18} className="text-amber-600" />
                  {isAr ? 'تسجيل تفاعل / مكالمة' : 'Log Lead Interaction & Call'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedLeadForLog.name} ({selectedLeadForLog.phone})</p>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSaveLogSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'نوع التفاعل' : 'Interaction Type'}</label>
                  <select
                    value={logForm.type}
                    onChange={e => setLogForm(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                  >
                    <option value="call">📞 Phone Call</option>
                    <option value="whatsapp">💬 WhatsApp Message</option>
                    <option value="meeting">👥 In-person Meeting</option>
                    <option value="note">📝 General Note</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'حالة اهتمام العميل' : 'Update Lead Status'}</label>
                  <select
                    value={logForm.status}
                    onChange={e => setLogForm(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                  >
                    <option value="interested">🔵 Interested</option>
                    <option value="called">🟡 Called / Discussed</option>
                    <option value="whatsapp_connected">🟢 Connected on WhatsApp</option>
                    <option value="quoted">🟣 Quoted Sent</option>
                    <option value="not_interested">🔴 Not Interested</option>
                    <option value="converted">✅ Converted to Client</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{isAr ? 'تاريخ المتابعة القادمة' : 'Next Follow-up Date'}</label>
                <input
                  type="date"
                  value={logForm.followUpDate}
                  onChange={e => setLogForm(p => ({ ...p, followUpDate: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{isAr ? 'تفاصيل الحديث / ملاحظات المكالمة' : 'Discussion Notes / What Was Said *'}</label>
                <textarea
                  rows={3}
                  required
                  placeholder={isAr ? 'مثال: تمت المكالمة وطلب العميل إرسال عرض سعر لخدمات ضريبة القيمة المضافة' : 'e.g. Discussed VAT filing requirements for 2 branches. Client requested quote.'}
                  value={logForm.notes}
                  onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-700 text-white rounded-xl hover:bg-amber-800"
                >
                  {isAr ? 'حفظ الملاحظة' : 'Save Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Interactive Split-Screen Quotation Builder & Document Studio ── */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          {/* Printable CSS style override */}
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-quotation-studio, #printable-quotation-studio * { visibility: visible !important; }
              #printable-quotation-studio {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 20px !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
                color: black !important;
                z-index: 999999 !important;
              }
            }
          `}</style>

          <div className="bg-slate-950 rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200 text-white">
            
            {/* Studio Header Bar */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-xl">
                  <DollarSign size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-base tracking-wide">
                      {isAr ? 'استوديو عروض الأسعار التفاعلي' : 'Interactive Quotation Builder'}
                    </h3>
                    {quoteForm.leadId && !editingQuoteId && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                        Pre-filled from Lead #{quoteForm.leadId}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'تعديل المعلمات وتوليد مستند طباعة A4 المباشر لشركة ميسرة' : 'Edit parameters to generate a live Maisarah A4 proposal document'}
                  </p>
                </div>
              </div>

              {/* Center Mode Switcher */}
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setQuotePresentationMode('detailed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    quotePresentationMode === 'detailed' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Detailed View
                </button>
                <button
                  type="button"
                  onClick={() => setQuotePresentationMode('simple')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    quotePresentationMode === 'simple' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Simple Summary
                </button>
              </div>

              {/* Action Buttons Right */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Printer size={15} /> Print / PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuotationSubmit()}
                  disabled={isSubmittingQuotation}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                >
                  {isSubmittingQuotation ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>{editingQuoteId ? 'Update Quote' : 'Create Quote'}</span>
                </button>

                <button 
                  onClick={() => setShowQuotationModal(false)} 
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Split Screen Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* LEFT PANEL: Interactive Control Panel (50% Width) */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto space-y-6 bg-slate-900 border-r border-slate-800 text-xs scrollbar-thin scrollbar-thumb-slate-700">
                
                {/* 1. Recipient Selection */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                    <Users size={15} /> Select Recipient & Client Info
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Choose Existing Lead or Client</label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const foundLead = leads.find(l => l.id === val);
                          if (foundLead) {
                            setQuoteForm(p => ({
                              ...p,
                              leadId: foundLead.id,
                              clientName: foundLead.companyName ? `${foundLead.name} (${foundLead.companyName})` : foundLead.name,
                              companyName: foundLead.companyName || '',
                              email: foundLead.email,
                              phone: foundLead.phone,
                              clientType: foundLead.companyName ? 'B2B' : 'B2C'
                            }));
                            return;
                          }
                          const foundClient = clients.find(c => c.id === val);
                          if (foundClient) {
                            setQuoteForm(p => ({
                              ...p,
                              leadId: null,
                              clientName: foundClient.companyName || foundClient.name,
                              companyName: foundClient.companyName || '',
                              email: foundClient.email,
                              phone: foundClient.phone,
                              clientType: foundClient.type
                            }));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                      >
                        <option value="">-- Choose Client or Lead --</option>
                        <optgroup label="Leads Pipeline">
                          {leads.map(l => (
                            <option key={l.id} value={l.id}>{l.name} {l.companyName ? `(${l.companyName})` : ''}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Onboarded Clients">
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.companyName || c.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Client Name *</label>
                      <input
                        type="text"
                        required
                        value={quoteForm.clientName}
                        onChange={e => setQuoteForm(p => ({ ...p, clientName: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Client Type</label>
                      <select
                        value={quoteForm.clientType}
                        onChange={e => setQuoteForm(p => ({ ...p, clientType: e.target.value as any }))}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                      >
                        <option value="B2B">B2B (Corporate)</option>
                        <option value="B2C">B2C (Individual)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={quoteForm.email}
                        onChange={e => setQuoteForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={quoteForm.phone}
                        onChange={e => setQuoteForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Document Settings & Toggles */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                    <FileCheck size={15} /> Document Settings & Toggles
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 p-3 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quoteShowQty}
                        onChange={e => setQuoteShowQty(e.target.checked)}
                        className="accent-purple-500 rounded w-4 h-4"
                      />
                      <div>
                        <p className="font-bold text-slate-200">Show Quantity</p>
                        <p className="text-[10px] text-slate-400">Display Qty column on quote</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 p-3 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quoteKycPhotoProof}
                        onChange={e => setQuoteKycPhotoProof(e.target.checked)}
                        className="accent-purple-500 rounded w-4 h-4"
                      />
                      <div>
                        <p className="font-bold text-slate-200">KYC Photo Proof</p>
                        <p className="text-[10px] text-slate-400">Include selfie guide on Page 2</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Service Fee Line Items */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                      <DollarSign size={15} /> Service Fee Items
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setQuoteLineItems(prev => [
                          ...prev,
                          { id: `item_${Date.now()}`, description: 'Additional Consultancy Line Item', qty: 1, rate: 100 }
                        ]);
                      }}
                      className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Line Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {quoteLineItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuoteLineItems(prev => prev.map(i => i.id === item.id ? { ...i, description: val } : i));
                          }}
                          placeholder="Line item title..."
                          className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
                        />

                        {quoteShowQty && (
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setQuoteLineItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: val } : i));
                            }}
                            className="w-14 bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs text-center outline-none"
                          />
                        )}

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.rate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setQuoteLineItems(prev => prev.map(i => i.id === item.id ? { ...i, rate: val } : i));
                            }}
                            className="w-24 bg-slate-950 border border-slate-700 text-purple-300 font-bold rounded-lg px-2 py-1.5 text-xs text-end outline-none focus:border-purple-500"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">OMR</span>
                        </div>

                        {quoteLineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setQuoteLineItems(prev => prev.filter(i => i.id !== item.id))}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Financial Adjustments: Discount & VAT */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Discount (OMR)</label>
                      <input
                        type="number"
                        min="0"
                        value={quoteDiscount}
                        onChange={e => setQuoteDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                        <input
                          type="checkbox"
                          checked={quoteForm.includeVat}
                          onChange={e => setQuoteForm(p => ({ ...p, includeVat: e.target.checked }))}
                          className="rounded accent-purple-500 w-4 h-4"
                        />
                        <span>Add 5% Oman VAT</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Documents Required Checklist */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                    <FileText size={15} /> Documents Required Checklist
                  </h4>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {quoteDocsRequired.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-850">
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-200 font-medium">
                          <input
                            type="checkbox"
                            defaultChecked
                            onChange={(e) => {
                              if (!e.target.checked) {
                                setQuoteDocsRequired(prev => prev.filter(d => d !== doc));
                              }
                            }}
                            className="accent-purple-500 rounded"
                          />
                          <span>{doc}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setQuoteDocsRequired(prev => prev.filter(d => d !== doc))}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add custom required document..."
                      value={customDocInput}
                      onChange={e => setCustomDocInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customDocInput.trim()) return;
                        setQuoteDocsRequired(prev => [...prev, customDocInput.trim().toUpperCase()]);
                        setCustomDocInput('');
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase px-3 py-1.5 rounded-xl"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* 5. Processing Timeline Checklist */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                    <Clock size={15} /> Processing Timeline Checklist
                  </h4>

                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {quoteTimelineSteps.map((ts) => (
                      <div key={ts.id} className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-850">
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-200 font-medium">
                          <input
                            type="checkbox"
                            checked={ts.selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setQuoteTimelineSteps(prev => prev.map(t => t.id === ts.id ? { ...t, selected: checked } : t));
                            }}
                            className="accent-purple-500 rounded"
                          />
                          <span>{ts.step}</span>
                        </label>
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                          {ts.duration}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Step Name..."
                      value={customTimelineStepName}
                      onChange={e => setCustomTimelineStepName(e.target.value)}
                      className="col-span-2 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customTimelineStepName.trim()) return;
                        setQuoteTimelineSteps(prev => [
                          ...prev,
                          { id: `t_${Date.now()}`, step: customTimelineStepName.trim(), duration: customTimelineStepDuration, selected: true }
                        ]);
                        setCustomTimelineStepName('');
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase px-2 py-1.5 rounded-xl"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* 6. Payment Schedule Terms */}
                <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                    <ShieldCheck size={15} /> Payment Schedule Terms
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Advance Payment Terms</label>
                      <input
                        type="text"
                        value={quotePaymentSchedule.advanceTerms}
                        onChange={e => setQuotePaymentSchedule(p => ({ ...p, advanceTerms: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Balance Payment Terms</label>
                      <input
                        type="text"
                        value={quotePaymentSchedule.balanceTerms}
                        onChange={e => setQuotePaymentSchedule(p => ({ ...p, balanceTerms: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT PANEL: Live Document Preview Studio (A4 Styled Printable Sheet) */}
              <div className="w-full md:w-1/2 bg-slate-800 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-600">
                
                {/* A4 Paper Document Container */}
                <div 
                  id="printable-quotation-studio" 
                  className="bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-8 w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between text-[11px] font-sans border border-slate-200 relative select-text"
                >
                  
                  {/* DOCUMENT HEADER */}
                  <div className="space-y-4">
                    
                    {/* Top Branding Bar */}
                    <div className="flex justify-between items-start border-b-2 border-brand-dark pb-4">
                      <div className="space-y-1">
                        <img src="/logo.png" alt="Maisarah Logo" className="h-10 object-contain" />
                        <h2 className="text-lg font-black text-brand-dark tracking-tight leading-tight">
                          Maisarah Auditing and Financial Consultant
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold">
                          C.R No: 1475532 &bull; P.O Box No: 2723, P.C: 130, Ghala Heights, Bousher, Muscat
                        </p>
                      </div>
                      <div className="text-end text-[10px] text-slate-600 font-medium space-y-0.5">
                        <p className="font-bold text-brand-dark">Maisarah Auditing & Financial Consultant</p>
                        <p>Contact: +968 72596534</p>
                        <p>Email: info@maisarah.net</p>
                        <p className="text-brand-dark font-bold">https://maisarah.net/</p>
                      </div>
                    </div>

                    {/* Quotation Title Banner */}
                    <div className="bg-brand-dark text-white p-2.5 text-center rounded-sm">
                      <h1 className="text-base font-black uppercase tracking-wider">QUOTATION</h1>
                    </div>

                    {/* Metadata Header Box */}
                    <div className="grid grid-cols-2 border border-slate-200 text-[10px]">
                      <div className="p-2 border-r border-b border-slate-200">
                        <span className="font-black text-brand-dark uppercase block">CLIENT NAME</span>
                        <span className="font-bold text-slate-800 text-xs">{quoteForm.clientName || 'VALUED CLIENT'}</span>
                      </div>
                      <div className="p-2 border-b border-slate-200">
                        <span className="font-black text-brand-dark uppercase block">CONTACT</span>
                        <span className="font-bold text-slate-800 text-xs">{quoteForm.phone || '+968 9000 0000'}</span>
                      </div>
                      <div className="p-2 border-r border-slate-200">
                        <span className="font-black text-brand-dark uppercase block">PREPARED BY</span>
                        <span className="font-bold text-slate-800">Maisarah Corporate Team</span>
                      </div>
                      <div className="p-2">
                        <span className="font-black text-brand-dark uppercase block">ACTIVITY</span>
                        <span className="font-bold text-slate-800">{quoteForm.clientType === 'B2B' ? 'Corporate Business Advisory' : 'Individual Financial Services'}</span>
                      </div>
                    </div>

                    {/* Itemized Fee Table */}
                    <div className="space-y-2">
                      <div className="bg-brand-dark text-white font-black text-[10px] uppercase px-3 py-1.5 tracking-wider">
                        PACKAGE INCLUDES & FEE BREAKDOWN
                      </div>
                      
                      <table className="w-full border-collapse border border-slate-200 text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-black text-slate-700 uppercase border-b border-slate-200">
                            <th className="p-2 text-center w-10">Sl No.</th>
                            <th className="p-2 text-start">Particulars / Service Description</th>
                            {quoteShowQty && <th className="p-2 text-center w-16">Qty</th>}
                            <th className="p-2 text-end w-24">Rate (OMR)</th>
                            <th className="p-2 text-end w-24">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {quoteLineItems.map((line, idx) => (
                            <tr key={line.id} className="hover:bg-slate-50">
                              <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-800">{line.description}</td>
                              {quoteShowQty && <td className="p-2 text-center font-medium">{line.qty}</td>}
                              <td className="p-2 text-end font-medium">{line.rate.toFixed(3)}</td>
                              <td className="p-2 text-end font-black text-slate-900">{(line.qty * line.rate).toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals Summary Box */}
                      {(() => {
                        const lineSub = quoteLineItems.reduce((acc, i) => acc + (i.qty * i.rate), 0);
                        const baseAmt = Math.max(0, lineSub - quoteDiscount);
                        const vatAmt = quoteForm.includeVat ? +(baseAmt * 0.05).toFixed(3) : 0;
                        const totalBudget = +(baseAmt + vatAmt).toFixed(3);
                        return (
                          <div className="bg-slate-50 border border-slate-200 p-3 space-y-1 text-end">
                            {quoteDiscount > 0 && (
                              <p className="text-[10px] text-slate-500 font-medium">
                                Subtotal: OMR {lineSub.toFixed(3)} &bull; Discount: -OMR {quoteDiscount.toFixed(3)}
                              </p>
                            )}
                            {quoteForm.includeVat && (
                              <p className="text-[10px] text-slate-500 font-medium">5% Oman VAT: OMR {vatAmt.toFixed(3)}</p>
                            )}
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                              <div className="text-start">
                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Amount Chargeable (in words)</span>
                                <span className="text-[11px] font-black text-brand-dark italic">
                                  {convertNumberToWords(totalBudget)}
                                </span>
                              </div>
                              <div className="text-end">
                                <span className="text-[9px] font-black text-slate-500 uppercase block">TOTAL PACKAGE VALUE</span>
                                <span className="text-base font-black text-brand-dark">OMR {totalBudget.toFixed(3)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Documents Required Grid */}
                    {quoteDocsRequired.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="bg-brand-dark text-white font-black text-[10px] uppercase px-3 py-1 tracking-wider">
                          DOCUMENTS REQUIRED
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9.5px] text-slate-700 font-medium pl-1">
                          {quoteDocsRequired.map((doc, idx) => (
                            <p key={idx} className="flex items-start gap-1">
                              <span className="font-bold text-brand-dark">{idx + 1}.</span> {doc}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Processing Timeline Table */}
                    {quoteTimelineSteps.filter(t => t.selected).length > 0 && (
                      <div className="space-y-1.5">
                        <div className="bg-brand-dark text-white font-black text-[10px] uppercase px-3 py-1 tracking-wider">
                          PROCESSING TIMELINE
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9.5px] border border-slate-200 p-2 bg-slate-50/50">
                          {quoteTimelineSteps.filter(t => t.selected).map((ts) => (
                            <div key={ts.id} className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                              <span className="font-bold text-slate-800">{ts.step}</span>
                              <span className="font-black text-brand-dark">{ts.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Schedule Terms */}
                    <div className="space-y-1.5">
                      <div className="bg-brand-dark text-white font-black text-[10px] uppercase px-3 py-1 tracking-wider">
                        PAYMENT SCHEDULE
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[10px] border border-slate-200 p-2.5">
                        <div>
                          <span className="font-black text-slate-700 block uppercase">ADVANCE PAYMENT</span>
                          <span className="text-slate-600 font-medium">{quotePaymentSchedule.advanceTerms}</span>
                        </div>
                        <div>
                          <span className="font-black text-slate-700 block uppercase">BALANCE PAYMENT</span>
                          <span className="text-slate-600 font-medium">{quotePaymentSchedule.balanceTerms}</span>
                        </div>
                      </div>
                    </div>

                    {/* Important Notes */}
                    <div className="space-y-1">
                      <span className="font-black text-[10px] text-slate-700 uppercase block">IMPORTANT NOTES</span>
                      <ul className="list-disc pl-4 text-[9px] text-slate-500 font-medium space-y-0.5">
                        {quoteImportantNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* DOCUMENT FOOTER & BANK DETAILS */}
                  <div className="pt-4 border-t-2 border-slate-200 space-y-3 mt-6">
                    
                    {/* Bank Details Box */}
                    <div className="border border-slate-300 p-2.5 rounded-sm bg-slate-50/80 grid grid-cols-2 gap-2 text-[9.5px]">
                      <div className="col-span-2 border-b border-slate-200 pb-1">
                        <span className="font-black text-brand-dark uppercase">MAISARAH BANK DETAILS &bull; BANK MUSCAT</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">A/c Holder's Name:</span>
                        <span className="font-black text-slate-800">Maisarah Auditing and Financial Consultant</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">Bank Name:</span>
                        <span className="font-black text-slate-800">Bank Muscat</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">A/c No:</span>
                        <span className="font-black text-slate-900 font-mono">0328074833720016</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">IBAN:</span>
                        <span className="font-black text-slate-900 font-mono">OM640270328074833720016</span>
                      </div>
                      <div className="col-span-2 border-t border-slate-200 pt-1 flex justify-between items-center">
                        <span className="text-slate-500 font-bold">Branch & SWIFT Code:</span>
                        <span className="font-black text-slate-800 font-mono">Ghala Industrial & BMUSOMRXTBG</span>
                      </div>
                    </div>

                    {/* Signatory & Computer Generated Notice */}
                    <div className="flex justify-between items-end pt-2 text-[10px]">
                      <div>
                        <p className="text-[9px] text-slate-400 italic">This is a Computer Generated Quotation</p>
                      </div>
                      <div className="text-end space-y-8">
                        <p className="font-black text-slate-800">for Maisarah Auditing and Financial Consultant</p>
                        <p className="border-t border-slate-400 pt-1 font-bold text-slate-600 inline-block px-4">Authorised Signatory</p>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 3: Direct Client Onboarding Modal ────────────────────── */}
      {showDirectClientModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <UserPlus className="text-brand-dark" size={20} />
                  {isAr ? 'إضافة عميل مباشر (تجاوز الفرصة)' : 'Direct Client Onboarding'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">For walk-in, recurring, or direct contract clients</p>
              </div>
              <button onClick={() => setShowDirectClientModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleDirectClientSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'اسم العميل / المفوض *' : 'Contact Person Name *'}</label>
                  <input
                    type="text"
                    required
                    value={directClientForm.name}
                    onChange={e => setDirectClientForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'اسم الشركة (B2B)' : 'Company Name (B2B)'}</label>
                  <input
                    type="text"
                    value={directClientForm.companyName}
                    onChange={e => setDirectClientForm(p => ({ ...p, companyName: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                  <input
                    type="email"
                    required
                    value={directClientForm.email}
                    onChange={e => setDirectClientForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'رقم الهاتف *' : 'Phone Number *'}</label>
                  <input
                    type="text"
                    required
                    value={directClientForm.phone}
                    onChange={e => setDirectClientForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{isAr ? 'باقة الخدمات المطلوبة' : 'Services Package'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Tax & VAT', 'Audit', 'Bookkeeping', 'Business Advisory'].map(srv => (
                    <label key={srv} className="flex items-center gap-2 bg-gray-50 border p-2 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={directClientForm.services.includes(srv)}
                        onChange={e => {
                          if (e.target.checked) setDirectClientForm(p => ({ ...p, services: [...p.services, srv] }));
                          else setDirectClientForm(p => ({ ...p, services: p.services.filter(s => s !== srv) }));
                        }}
                        className="rounded accent-brand-dark"
                      />
                      <span className="font-bold text-gray-700">{srv}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{isAr ? 'قيمة الاتفاق الشهري (OMR)' : 'Monthly Billing Amount (OMR)'}</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={directClientForm.billingAmount}
                  onChange={e => setDirectClientForm(p => ({ ...p, billingAmount: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold text-brand-dark"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDirectClientModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-dark text-white rounded-xl hover:bg-brand-dark/90"
                >
                  {isAr ? 'إضافة العميل وإرسال المهمة لرئيس القسم' : 'Add Client & Send HOD Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Quick Add Lead Modal ────────────────────────────────── */}
      {showQuickAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <UserPlus className="text-[#A11212]" size={18} />
                  {isAr ? 'إضافة فرصة جديدة بسرعة' : 'Quick Add Lead'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Fast capture for new prospects and inquiries</p>
              </div>
              <button onClick={() => setShowQuickAddLeadModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleQuickAddLeadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{isAr ? 'الاسم الكامل للعميل *' : 'Contact Full Name *'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salim Al-Busaidi"
                  value={quickLeadForm.name}
                  onChange={e => setQuickLeadForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'اسم الشركة' : 'Company Name'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Busaidi Logistics"
                    value={quickLeadForm.companyName}
                    onChange={e => setQuickLeadForm(p => ({ ...p, companyName: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'مصدر الفرصة' : 'Lead Source'}</label>
                  <select
                    value={quickLeadForm.source}
                    onChange={e => setQuickLeadForm(p => ({ ...p, source: e.target.value as any }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                  >
                    <option value="b2b">Corporate Sales / B2B</option>
                    <option value="social_media">Social Media</option>
                    <option value="website">Website Form</option>
                    <option value="referral">Referral</option>
                    <option value="direct">Direct Walk-in / Phone</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'رقم الهاتف / واتساب *' : 'Phone / WhatsApp *'}</label>
                  <input
                    type="text"
                    required
                    placeholder="+968 9XXXXXXX"
                    value={quickLeadForm.phone}
                    onChange={e => setQuickLeadForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={quickLeadForm.email}
                    onChange={e => setQuickLeadForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{isAr ? 'حالة الاهتمام الأولية' : 'Initial Interest Status'}</label>
                <select
                  value={quickLeadForm.status}
                  onChange={e => setQuickLeadForm(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-bold"
                >
                  <option value="interested">🔵 Interested</option>
                  <option value="called">🟡 Called / Discussed</option>
                  <option value="whatsapp_connected">🟢 Connected on WhatsApp</option>
                  <option value="quoted">🟣 Quoted Sent</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{isAr ? 'ملاحظات / متطلبات الخدمة' : 'Requirements / Notes'}</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Interested in annual VAT return filing and bookkeeping."
                  value={quickLeadForm.notes}
                  onChange={e => setQuickLeadForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddLeadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickLead}
                  className="px-5 py-2 text-xs font-bold bg-[#A11212] text-white rounded-xl hover:bg-[#800e0e] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingQuickLead ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{isAr ? 'جاري الإضافة...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <span>{isAr ? 'إضافة الفرصة' : 'Add Lead to Pipeline'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Inner Sub Component: Lead Card ---
function LeadCard({ 
  lead, 
  onMove, 
  onViewDossier, 
  onLogCall,
  onCreateQuote,
  onWhatsApp,
  onConvert,
}: { 
  lead: Lead; 
  onMove: (step: Lead['pipelineStep']) => void; 
  onViewDossier: () => void;
  onLogCall: () => void;
  onCreateQuote: () => void;
  onWhatsApp: () => void;
  onConvert: () => void;
}) {
  const stepMap: Record<Lead['pipelineStep'], Lead['pipelineStep'][]> = {
    follow_up: ['add_data'],
    add_data: ['follow_up', 'connect'],
    connect: ['add_data', 'update'],
    update: ['connect', 'sort'],
    sort: ['update']
  };

  const nextSteps = stepMap[lead.pipelineStep];

  const statusBadgeMap: Record<string, { label: string; cls: string }> = {
    interested:         { label: 'Interested', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    called:             { label: 'Called',     cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    whatsapp_connected: { label: 'WhatsApp',   cls: 'bg-green-100 text-green-700 border-green-200' },
    quoted:             { label: 'Quoted',     cls: 'bg-purple-100 text-purple-700 border-purple-200' },
    not_interested:     { label: 'Declined',   cls: 'bg-red-100 text-red-700 border-red-200' },
    converted:          { label: 'Converted',  cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };
  const badge = statusBadgeMap[lead.status] || { label: lead.status, cls: 'bg-gray-100 text-gray-700 border-gray-200' };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3 hover:border-gray-400 transition-all">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] bg-gray-100 border text-gray-500 font-black px-1.5 py-0.5 rounded">
            {lead.id}
          </span>
          <span className={`text-[9px] font-black border px-1.5 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
        <span className={`w-2.5 h-2.5 rounded-full border ${
          lead.qualificationColor === 'green' ? 'bg-green-500 border-green-200' :
          lead.qualificationColor === 'yellow' ? 'bg-yellow-500 border-yellow-200' : 'bg-red-500 border-red-200'
        }`}></span>
      </div>

      <div>
        <h5 className="font-black text-xs text-gray-900">{lead.name}</h5>
        {lead.companyName && (
          <p className="text-[10px] text-gray-500 font-bold">{lead.companyName}</p>
        )}
        <p className="text-[10px] text-gray-400">{lead.phone} · {lead.email}</p>
      </div>

      {lead.notes && (
        <p className="text-[10px] text-gray-500 leading-normal bg-gray-50 p-2 rounded-lg font-medium border border-gray-150 truncate">
          {lead.notes}
        </p>
      )}

      {/* Mini-CRM Quick Actions */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          onClick={onLogCall}
          className="flex items-center justify-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 py-1 rounded-xl text-[9px] font-bold"
        >
          <PhoneCall size={10} /> Log Call
        </button>
        <button
          onClick={onCreateQuote}
          className="flex items-center justify-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 py-1 rounded-xl text-[9px] font-bold"
        >
          <DollarSign size={10} /> Create Quote
        </button>
        <button
          onClick={onWhatsApp}
          className="flex items-center justify-center gap-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 py-1 rounded-xl text-[9px] font-bold"
        >
          <MessageSquare size={10} /> WhatsApp
        </button>
        <button
          onClick={onConvert}
          className="flex items-center justify-center gap-1 bg-brand-dark text-white hover:bg-brand-dark/90 py-1 rounded-xl text-[9px] font-bold"
        >
          <UserPlus size={10} /> Convert
        </button>
      </div>

      {/* Move Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[9px] font-black uppercase text-gray-400">
        <span>Stage</span>
        <div className="flex gap-1">
          {nextSteps.map(step => (
            <button
              key={step}
              onClick={() => onMove(step)}
              className="bg-gray-150 hover:bg-[#A11212] hover:text-white px-2 py-1 rounded transition-colors text-gray-700"
            >
              {step.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Dossier Link */}
      <div className="pt-1">
        <button
          onClick={onViewDossier}
          className="w-full bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-center"
        >
          View Lead History
        </button>
      </div>
    </div>
  );
}

// Helper icons
function CheckCheckIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      style={{ width: props.size, height: props.size }}
    >
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}
