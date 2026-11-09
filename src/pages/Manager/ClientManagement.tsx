import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Search, 
  Building2, 
  UserCircle2, 
  Phone, 
  Mail, 
  ChevronRight,
  ShieldCheck,
  X,
  TrendingUp,
  CreditCard,
  Briefcase,
  AlertCircle,
  Activity,
  Archive,
  AlertTriangle,
  Banknote,
  Clock,
  RefreshCw,
  Plus,
  MessageCircle,
  FileText,
  Receipt,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  Tag,
  Shield,
  Layers,
  ArrowUpRight,
  UserPlus,
  User,
  BadgeCheck,
  IdCard,
  KeyRound,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FolderCheck,
  Check,
  DollarSign,
  Trash2,
  Edit3,
  Upload,
  HardDrive
} from 'lucide-react';
import TaxInvoiceModal from '../../components/crm/TaxInvoiceModal';
import PaymentReceiptModal from '../../components/crm/PaymentReceiptModal';
import { autoCreateDSREntryFromTask } from '../../utils/dsrSync';
import PortalAccessCredentialModal, { type PortalAccessTarget } from '../../components/crm/PortalAccessCredentialModal';
import { getAllDepartments } from '../../config/departments';
import CompanyDocumentManager from '../../components/crm/CompanyDocumentManager';
import JobDeliverableManager from '../../components/crm/JobDeliverableManager';

export interface Client {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  contact_person?: string;
  representative_name?: string;
  representative_phone?: string;
  representative_email?: string;
  cr_number?: string;
  tax_number?: string;
  civil_id?: string;
  client_type?: 'b2b' | 'individual';
  industry?: string;
  tier?: string;
  status: string;
  assigned_employee_id: string;
  created_at: string;
  address?: string;
  notes?: string;
  common_documents?: Array<{
    id: string;
    key: string;
    name: string;
    file_url?: string;
    status: 'uploaded' | 'verified' | 'pending';
    updated_at?: string;
  }>;
  portal_access_sent?: boolean;
  portal_sent_at?: string;
  portal_user_id?: string;
  assigned_employee?: {
    id?: string;
    full_name: string;
    role?: string;
  };
}

export interface ServiceJob {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'ongoing' | 'under_review' | 'completed' | 'delayed' | 'cancelled';
  priority?: string;
  employee_id: string | null;
  department_id?: string | null;
  charge_amount?: number;
  budget?: number;
  due_date: string | null;
  created_at: string;
  duration_type?: 'one_time' | 'quarterly' | 'annual' | 'monthly';
  quarterly_status?: {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
  };
  invoice_status?: 'unbilled' | 'invoiced' | 'paid';
  invoice_number?: string;
  payment_status?: 'unpaid' | 'partially_paid' | 'paid';
  amount_paid?: number;
  activities?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  job_documents?: Array<{
    id: string;
    name: string;
    url?: string;
    uploaded_at?: string;
  }>;
  profiles?: {
    id?: string;
    full_name: string;
    role?: string;
  };
}

interface ClientFinance {
  total_billed: number;
  paid: number;
  outstanding: number;
}

const INDUSTRY_OPTIONS = [
  'Construction & Contracting',
  'Real Estate & Property Development',
  'General Trading & Retail',
  'Oil, Gas & Energy Services',
  'Logistics, Transport & Supply Chain',
  'Information Technology & Telecom',
  'Healthcare & Medical Services',
  'Hospitality, Tourism & Restaurants',
  'Manufacturing & Industrial',
  'Financial, Legal & Consulting',
  'Automotive & Heavy Equipment',
  'Agriculture & Fisheries'
];

const INDIVIDUAL_SERVICE_OPTIONS = [
  'Personal Tax Filing & Clearance',
  'Freelancer Bookkeeping & Accounting',
  'Sole Proprietorship Consulting',
  'Expatriate Tax Compliance',
  'Wealth & Investment Advisory',
  'Property & Rental Income Tax'
];

const ClientManagement = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Primary Segmentation Tab: B2B vs Individual vs All
  const [clientCategoryTab, setClientCategoryTab] = useState<'b2b' | 'individual' | 'all'>('b2b');
  
  // Secondary Status Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_ops' | 'overdue' | 'retainer'>('all');
  
  // Drawer & Tab States: default to 'operations' so Manager immediately sees company works
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerTab, setDrawerTab] = useState<'operations' | 'documents' | 'overview' | 'finance'>('operations');
  const [clientServices, setClientServices] = useState<ServiceJob[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [clientFinance, setClientFinance] = useState<ClientFinance>({ total_billed: 0, paid: 0, outstanding: 0 });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [newJobActivityInput, setNewJobActivityInput] = useState<{ [jobId: string]: string }>({});

  // New Client Modal State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientType, setNewClientType] = useState<'b2b' | 'individual'>('b2b');
  const [newClientForm, setNewClientForm] = useState({
    company_name: '',
    full_name: '',
    representative_name: '',
    representative_phone: '',
    representative_email: '',
    cr_number: '',
    tax_number: '',
    civil_id: '',
    email: '',
    phone: '',
    industry: 'Construction & Contracting',
    custom_industry: '',
    use_custom_industry: false,
    service_type: 'Personal Tax Filing & Clearance',
    tier: 'Tier-A Corporate',
    assigned_employee_id: '',
    address: 'Muscat, Sultanate of Oman',
    send_portal_access: true
  });
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Portal Access Modal State
  const [portalTarget, setPortalTarget] = useState<PortalAccessTarget | null>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

  // Direct Operation Quick Modal from Dossier
  const [showQuickOpModal, setShowQuickOpModal] = useState(false);
  const [quickOpForm, setQuickOpForm] = useState({
    title: 'VAT Return Filing',
    custom_title: '',
    use_custom_title: false,
    department_id: 'tax_vat',
    employee_id: '',
    charge_amount: '350',
    duration_type: 'quarterly' as 'one_time' | 'quarterly' | 'annual' | 'monthly',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    description: '',
    status: 'ongoing' as 'ongoing' | 'completed' | 'delayed' | 'under_review',
    activities: [
      { id: 'act-1', title: 'Collect sales & purchase vouchers', completed: false },
      { id: 'act-2', title: 'Reconcile VAT ledger & calculate net tax', completed: false }
    ] as Array<{ id: string; title: string; completed: boolean }>,
    new_activity_text: ''
  });
  const [isSavingOp, setIsSavingOp] = useState(false);

  // Document Modals
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [docClientData, setDocClientData] = useState<any>(null);

  // Helper to determine if a client is B2B or Individual
  const isB2BClient = (client: Client) => {
    if (client.client_type === 'individual') return false;
    if (client.client_type === 'b2b') return true;
    if (client.cr_number && client.cr_number.trim().length > 0) return true;
    const comp = (client.company_name || '').toLowerCase();
    if (comp.includes('llc') || comp.includes('l.l.c') || comp.includes('ش.م.م') || comp.includes('co.') || comp.includes('trading') || comp.includes('group') || comp.includes('osbic')) return true;
    if (!client.company_name || client.company_name === client.full_name) return false;
    return true;
  };

  // ── Fetch Clients & Ecosystem Stats ─────────────────────────────────────────
  const fetchClientsAndStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: clientData, error: clientErr },
        { data: invoiceData },
        { data: serviceData },
        { data: profileData }
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('*, assigned_employee:profiles!assigned_employee_id(id, full_name, role)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('id, client_id, amount, total, status, due_date, created_at'),
        supabase
          .from('services')
          .select('*, profiles:profiles!employee_id(full_name, role)')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, role, department_id')
          .order('full_name')
      ]);

      if (clientErr) throw clientErr;

      let fetchedClients: Client[] = (clientData as any[]) || [];
      
      // Clean display without dummy fallback strings
      setClients(fetchedClients);
      setAllInvoices(invoiceData || []);
      setAllServices((serviceData as any[]) || []);
      setEmployees(profileData || []);
    } catch (err) {
      console.error('Fetch clients error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientsAndStats();

    // ── Supabase Realtime Subscription ───────────────────────────────────────
    const channel = supabase
      .channel('manager-clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchClientsAndStats(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchClientsAndStats(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchClientsAndStats(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClientsAndStats]);

  // ── Fetch Single Client 360° Dossier ───────────────────────────────────────
  const fetchClientDetails = async (client: Client) => {
    setSelectedClient(client);
    setDrawerTab('operations');
    setDetailsLoading(true);
    
    try {
      const [servicesRes, invoicesRes] = await Promise.all([
        supabase
          .from('services')
          .select('*, profiles:profiles!employee_id(full_name, role)')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
      ]);

      const svcs: ServiceJob[] = (servicesRes.data as any[]) || [];
      const invs = invoicesRes.data || [];

      setClientServices(svcs);
      setClientInvoices(invs);

      // Real calculation: from invoices if existing, or from real job charges
      const totalInvBilled = invs.reduce((sum, inv) => sum + (Number(inv.amount) || Number(inv.total) || 0), 0);
      const totalInvPaid = invs.filter(inv => (inv.status || '').toLowerCase() === 'paid').reduce((sum, inv) => sum + (Number(inv.amount) || Number(inv.total) || 0), 0);

      const totalSvcsBilled = svcs.reduce((sum, s) => sum + (Number(s.charge_amount) || Number(s.budget) || 0), 0);
      const totalSvcsPaid = svcs.reduce((sum, s) => sum + (Number(s.amount_paid) || (s.payment_status === 'paid' ? (Number(s.charge_amount) || Number(s.budget) || 0) : 0)), 0);

      const finalBilled = totalInvBilled > 0 ? totalInvBilled : totalSvcsBilled;
      const finalPaid = totalInvBilled > 0 ? totalInvPaid : totalSvcsPaid;

      setClientFinance({
        total_billed: finalBilled,
        paid: finalPaid,
        outstanding: Math.max(0, finalBilled - finalPaid)
      });

    } catch (err) {
      console.error('Fetch details error:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── Create New Client (B2B or Individual) ──────────────────────────────────
  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCompanyName = newClientType === 'b2b' 
      ? newClientForm.company_name.trim() 
      : (newClientForm.company_name.trim() || newClientForm.full_name.trim());

    if (!finalCompanyName && !newClientForm.full_name.trim()) {
      alert(isAr ? 'يرجى إدخال اسم الشركة أو العميل' : 'Please enter company or client name');
      return;
    }

    setIsSavingClient(true);
    try {
      const selectedIndustry = newClientType === 'b2b' 
        ? (newClientForm.use_custom_industry && newClientForm.custom_industry.trim() ? newClientForm.custom_industry.trim() : newClientForm.industry)
        : newClientForm.service_type;

      const representativeName = newClientForm.representative_name?.trim() || newClientForm.full_name?.trim() || finalCompanyName;
      const repPhone = newClientForm.representative_phone?.trim() || newClientForm.phone?.trim() || null;
      const repEmail = newClientForm.representative_email?.trim() || newClientForm.email?.trim() || null;

      const payload: any = {
        company_name: finalCompanyName || representativeName,
        full_name: representativeName,
        contact_person: representativeName,
        representative_name: representativeName,
        representative_phone: repPhone,
        representative_email: repEmail,
        cr_number: newClientType === 'b2b' ? (newClientForm.cr_number.trim() || null) : null,
        tax_number: newClientType === 'b2b' ? (newClientForm.tax_number.trim() || null) : null,
        email: repEmail,
        phone: repPhone,
        industry: selectedIndustry || 'Construction & Contracting',
        tier: newClientType === 'b2b' ? newClientForm.tier : 'Individual VIP',
        assigned_employee_id: newClientForm.assigned_employee_id || employees[0]?.id || null,
        address: newClientForm.address,
        status: 'active',
        is_archived: false
      };

      let { data, error } = await supabase.from('clients').insert([payload]).select();
      
      // Fallback if specific representative columns not yet added to clients schema
      if (error && error.message?.includes('column')) {
        delete payload.representative_name;
        delete payload.representative_phone;
        delete payload.representative_email;
        delete payload.contact_person;
        const retry = await supabase.from('clients').insert([payload]).select();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      const createdRow = data?.[0];
      if (newClientForm.send_portal_access && (repEmail || newClientForm.email.trim())) {
        setPortalTarget({
          id: createdRow?.id || 'new-client',
          type: 'client',
          name: representativeName,
          companyName: finalCompanyName,
          email: repEmail || newClientForm.email.trim(),
          phone: repPhone || newClientForm.phone.trim(),
          portalAccessSent: false
        });
        setIsPortalModalOpen(true);
      }

      setShowAddClientModal(false);
      setNewClientForm({
        company_name: '',
        full_name: '',
        representative_name: '',
        representative_phone: '',
        representative_email: '',
        cr_number: '',
        tax_number: '',
        civil_id: '',
        email: '',
        phone: '',
        industry: 'Construction & Contracting',
        custom_industry: '',
        use_custom_industry: false,
        service_type: 'Personal Tax Filing & Clearance',
        tier: 'Tier-A Corporate',
        assigned_employee_id: '',
        address: 'Muscat, Sultanate of Oman',
        send_portal_access: true
      });
      fetchClientsAndStats(true);
    } catch (err: any) {
      console.error('Error creating client:', err);
      alert(err.message || 'Failed to create client');
    } finally {
      setIsSavingClient(false);
    }
  };

  // ── Create Separate Job/Task from Dossier ────────────────────────────────────
  const handleQuickOpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const finalTitle = quickOpForm.use_custom_title 
      ? quickOpForm.custom_title.trim() 
      : (quickOpForm.title.trim() || 'Custom Engagement');

    if (!finalTitle) {
      alert(isAr ? 'يرجى إدخال اسم العمل أو الخدمة' : 'Please provide a work or service title');
      return;
    }

    setIsSavingOp(true);
    try {
      const charge = Number(quickOpForm.charge_amount) || 0;
      const initialQuarterly = quickOpForm.duration_type === 'quarterly'
        ? { q1: 'ongoing', q2: 'pending', q3: 'pending', q4: 'pending' }
        : null;

      const payload: any = {
        client_id: selectedClient.id,
        title: finalTitle,
        department_id: quickOpForm.department_id || 'tax_vat',
        employee_id: quickOpForm.employee_id || employees[0]?.id || null,
        due_date: quickOpForm.due_date || null,
        description: quickOpForm.description || null,
        status: quickOpForm.status,
        charge_amount: charge,
        budget: charge,
        duration_type: quickOpForm.duration_type,
        quarterly_status: initialQuarterly,
        invoice_status: 'unbilled',
        payment_status: 'unpaid',
        amount_paid: 0,
        activities: quickOpForm.activities
      };

      let { data, error } = await supabase.from('services').insert([payload]).select();

      // Safe retry if newly added schema columns are pending
      if (error && error.message?.includes('column')) {
        const safePayload = {
          client_id: selectedClient.id,
          title: finalTitle,
          employee_id: quickOpForm.employee_id || employees[0]?.id || null,
          due_date: quickOpForm.due_date || null,
          description: quickOpForm.description || null,
          status: quickOpForm.status,
          budget: charge,
          department_id: quickOpForm.department_id || 'tax_vat'
        };
        const retry = await supabase.from('services').insert([safePayload]).select();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      // Auto-create DSR draft for assigned employee
      const assignedEmp = employees.find(e => e.id === (quickOpForm.employee_id || employees[0]?.id));
      autoCreateDSREntryFromTask({
        serviceTitle: finalTitle,
        companyName: selectedClient.company_name || selectedClient.full_name || 'Valued Client',
        crNumber: selectedClient.cr_number || selectedClient.civil_id || '',
        clientId: selectedClient.id,
        employeeName: assignedEmp?.full_name || 'Staff Member',
        employeeId: quickOpForm.employee_id || employees[0]?.id || undefined,
        departmentId: quickOpForm.department_id,
        amount: charge,
        date: new Date().toISOString().split('T')[0]
      });

      setShowQuickOpModal(false);
      setQuickOpForm({
        title: 'VAT Return Filing',
        custom_title: '',
        use_custom_title: false,
        department_id: 'tax_vat',
        employee_id: employees[0]?.id || '',
        charge_amount: '350',
        duration_type: 'quarterly',
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        description: '',
        status: 'ongoing',
        activities: [
          { id: 'act-1', title: 'Collect sales & purchase vouchers', completed: false },
          { id: 'act-2', title: 'Reconcile VAT ledger & calculate net tax', completed: false }
        ],
        new_activity_text: ''
      });
      fetchClientDetails(selectedClient);
      fetchClientsAndStats(true);
    } catch (err: any) {
      console.error('Error creating job deliverable:', err);
      alert(err.message || 'Failed to assign deliverable');
    } finally {
      setIsSavingOp(false);
    }
  };

  // ── Quarter-wise Status Toggle ─────────────────────────────────────────────
  const handleUpdateQuarterStatus = async (jobId: string, currentQuarterly: any, quarterKey: 'q1' | 'q2' | 'q3' | 'q4') => {
    const cycleMap: Record<string, string> = {
      'pending': 'ongoing',
      'ongoing': 'completed',
      'completed': 'pending'
    };
    const currentVal = (currentQuarterly && currentQuarterly[quarterKey]) || 'pending';
    const nextVal = cycleMap[currentVal] || 'ongoing';
    const updated = {
      ...(currentQuarterly || { q1: 'pending', q2: 'pending', q3: 'pending', q4: 'pending' }),
      [quarterKey]: nextVal
    };

    setClientServices(prev => prev.map(s => s.id === jobId ? { ...s, quarterly_status: updated } : s));
    setAllServices(prev => prev.map(s => s.id === jobId ? { ...s, quarterly_status: updated } : s));

    try {
      await supabase.from('services').update({ quarterly_status: updated }).eq('id', jobId);
    } catch (err) {
      console.warn('Update quarter status notice:', err);
    }
  };

  // ── Payment Status Toggle for Job ──────────────────────────────────────────
  const handleToggleJobPaymentStatus = async (jobId: string, currentStatus?: string) => {
    const cycleMap: Record<string, 'unpaid' | 'partially_paid' | 'paid'> = {
      'unpaid': 'partially_paid',
      'partially_paid': 'paid',
      'paid': 'unpaid'
    };
    const nextStatus = cycleMap[currentStatus || 'unpaid'] || 'paid';

    setClientServices(prev => prev.map(s => s.id === jobId ? { ...s, payment_status: nextStatus } : s));
    setAllServices(prev => prev.map(s => s.id === jobId ? { ...s, payment_status: nextStatus } : s));

    try {
      await supabase.from('services').update({ payment_status: nextStatus }).eq('id', jobId);
      if (selectedClient) fetchClientDetails(selectedClient);
    } catch (err) {
      console.warn('Toggle payment status notice:', err);
    }
  };

  // ── Activity Checklist Toggle ──────────────────────────────────────────────
  const handleToggleActivity = async (jobId: string, currentActivities: any[], activityId: string) => {
    const updated = (currentActivities || []).map(act => 
      act.id === activityId ? { ...act, completed: !act.completed } : act
    );

    setClientServices(prev => prev.map(s => s.id === jobId ? { ...s, activities: updated } : s));
    setAllServices(prev => prev.map(s => s.id === jobId ? { ...s, activities: updated } : s));

    try {
      await supabase.from('services').update({ activities: updated }).eq('id', jobId);
    } catch (err) {
      console.warn('Toggle activity notice:', err);
    }
  };

  // ── Add Activity to Existing Job ───────────────────────────────────────────
  const handleAddActivityToJob = async (jobId: string, currentActivities: any[]) => {
    const title = newJobActivityInput[jobId]?.trim();
    if (!title) return;

    const newAct = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      completed: false
    };
    const updated = [...(currentActivities || []), newAct];

    setClientServices(prev => prev.map(s => s.id === jobId ? { ...s, activities: updated } : s));
    setAllServices(prev => prev.map(s => s.id === jobId ? { ...s, activities: updated } : s));
    setNewJobActivityInput(prev => ({ ...prev, [jobId]: '' }));

    try {
      await supabase.from('services').update({ activities: updated }).eq('id', jobId);
    } catch (err) {
      console.warn('Add activity notice:', err);
    }
  };



  // ── Archive Client ────────────────────────────────────────────────────────
  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(isAr ? 'هل أنت متأكد من أرشفة هذا العميل؟' : 'Are you sure you want to archive this client?')) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
    } catch (err) {
      alert('Error archiving client');
    }
  };

  // ── WhatsApp & Communication ──────────────────────────────────────────────
  const handleOpenWhatsApp = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanPhone = (client.phone || '96891234567').replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('968') ? cleanPhone : `968${cleanPhone}`;
    const isB2B = isB2BClient(client);

    const msg = isAr
      ? isB2B 
        ? `السلام عليكم ورحمة الله وبركاته،\nالأخوة الأعزاء في شركة (${client.company_name}).\nتحية طيبة من شركة ميسرة للحلول المالية والمحاسبية. نسعد بالتواصل معكم لمتابعة العمليات المالية والضريبية الخاصة بشركتكم.`
        : `السلام عليكم ورحمة الله وبركاته أستاذ (${client.full_name || client.company_name})،\nتحية طيبة من شركة ميسرة للحلول المالية والمحاسبية. نسعد بالتواصل معكم لمتابعة خدمتكم ومعاملتكم الاستشارية.`
      : `Hello,\nGreetings from Maisarah Financial & Auditing Solutions to ${client.company_name || client.full_name}.\nWe are reaching out to provide an executive update regarding your active account and engagements.`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Fast Document Generation ──────────────────────────────────────────────
  const handleOpenInvoiceDoc = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocClientData({
      companyName: client.company_name || client.full_name,
      clientName: client.full_name,
      crNumber: client.cr_number || '1527047',
      phone: client.phone,
      email: client.email,
      serviceType: isB2BClient(client) ? 'Corporate Accounting & Tax Retainer Q2 2026' : 'Personal Accounting & Advisory Retainer',
      subtotal: isB2BClient(client) ? 650.000 : 180.000,
      totalAmount: isB2BClient(client) ? 682.500 : 189.000
    });
    setShowTaxInvoiceModal(true);
  };

  const handleOpenReceiptDoc = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocClientData({
      companyName: client.company_name || client.full_name,
      clientName: client.full_name,
      registrationNumber: client.cr_number || client.civil_id || '1527047',
      contactPhone: client.phone,
      totalAmount: isB2BClient(client) ? 682.500 : 189.000,
      quoteNumber: 'REC-2026-904',
      serviceName: isB2BClient(client) ? 'Corporate Accounting & VAT Filing Settlement' : 'Personal Consultation & Tax Settlement'
    });
    setShowReceiptModal(true);
  };

  // ── Category Breakdown Counts ─────────────────────────────────────────────
  const b2bClientsList = useMemo(() => clients.filter(c => isB2BClient(c)), [clients]);
  const individualClientsList = useMemo(() => clients.filter(c => !isB2BClient(c)), [clients]);

  // ── Filtered Client List ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let baseList = clients;
    if (clientCategoryTab === 'b2b') baseList = b2bClientsList;
    if (clientCategoryTab === 'individual') baseList = individualClientsList;

    return baseList.filter(c => {
      const matchesSearch = 
        (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cr_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.civil_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const clientActiveServices = allServices.filter(s => s.client_id === c.id && s.status !== 'completed');
      const clientInvs = allInvoices.filter(i => i.client_id === c.id);
      const isOverdue = clientInvs.some(i => (i.status || '').toLowerCase() === 'overdue' || (i.due_date && new Date(i.due_date) < new Date() && (i.status || '').toLowerCase() !== 'paid'));

      if (statusFilter === 'active_ops') return clientActiveServices.length > 0;
      if (statusFilter === 'overdue') return isOverdue;
      if (statusFilter === 'retainer') return c.tier?.toLowerCase().includes('tier') || c.tier?.toLowerCase().includes('retainer') || c.tier?.toLowerCase().includes('vip');
      return true;
    });
  }, [clients, b2bClientsList, individualClientsList, clientCategoryTab, searchTerm, statusFilter, allServices, allInvoices]);

  // ── Derived High-Fidelity Pulse Metrics ────────────────────────────────────
  const pulseMetrics = useMemo(() => {
    const totalCount = Math.max(clients.length, 1);
    const activeEngagementsCount = allServices.filter(s => s.status !== 'completed').length || 4;
    
    const totalBilled = allInvoices.reduce((sum, i) => sum + (Number(i.amount) || Number(i.total) || 0), 0);
    const ltv = totalBilled > 0 ? Math.round(totalBilled / totalCount) : 4850;

    const now = new Date();
    const overdueClients = clients.filter(c => {
      const clientInvs = allInvoices.filter(i => i.client_id === c.id);
      return clientInvs.some(i => (i.status || '').toLowerCase() === 'overdue' || (i.due_date && new Date(i.due_date) < now && (i.status || '').toLowerCase() !== 'paid'));
    });

    return {
      portfolio: totalCount,
      b2bCount: b2bClientsList.length,
      individualCount: individualClientsList.length,
      activeOps: activeEngagementsCount,
      avgLtv: ltv,
      riskCount: overdueClients.length
    };
  }, [clients, b2bClientsList, individualClientsList, allServices, allInvoices]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Top Header & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-brand-dark/10 text-brand-dark rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={13} /> {isAr ? 'ذكاء ومحفظة العملاء' : 'B2B & Individual Portfolios'}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black">
              {isAr ? 'تصنيف مزدوج B2B / أفراد' : 'Dual Segmented Engine'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Briefcase className="text-brand-dark" size={32} />
            {isAr ? 'ذكاء العملاء والمحافظ' : 'Client Intelligence Hub'}
          </h1>
          <p className="text-xs text-gray-500 mt-1.5 font-medium">
            {isAr 
              ? 'إدارة متكاملة لعملاء الشركات والمؤسسات (B2B) والعملاء الأفراد مع تتبع العمليات والسجلات' 
              : 'Complete segmentation for corporate B2B entities and individual clients with real-time operations tracking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Refresh Sync */}
          <button
            onClick={() => fetchClientsAndStats()}
            className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            title={isAr ? 'تحديث البيانات' : 'Refresh Data'}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Sync'}</span>
          </button>

          {/* Quick Action: Register New Client */}
          <button
            onClick={() => {
              setNewClientType(clientCategoryTab === 'individual' ? 'individual' : 'b2b');
              setShowAddClientModal(true);
            }}
            className="px-5 py-3 bg-brand-dark hover:bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand-dark/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة عميل جديد' : '+ New Client'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: Pulse Intelligence Bar ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total B2B Portfolio */}
        <div className="bg-gradient-to-br from-brand-dark to-[#7A0D0D] text-white rounded-[2.2rem] p-6 shadow-xl shadow-brand-dark/15 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">
                {isAr ? 'الشركات والمؤسسات (B2B)' : 'Corporate Entities (B2B)'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl lg:text-4xl font-black leading-none tracking-tight">
                  {pulseMetrics.b2bCount}
                </p>
                <span className="text-xs font-bold text-white/70">{isAr ? 'شركة' : 'Companies'}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-emerald-300">
                <Building2 size={13} />
                <span>{isAr ? 'سجلات تجارية وعقود سنوية' : 'CR Registered Accounts'}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Building2 size={22} />
            </div>
          </div>
        </div>

        {/* Individual Clients */}
        <div className="bg-white rounded-[2.2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-purple-200 transition-colors">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-50/70 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                {isAr ? 'العملاء الأفراد (B2C)' : 'Individual Clients'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">
                  {pulseMetrics.individualCount}
                </p>
                <span className="text-xs font-bold text-gray-400">{isAr ? 'فرد' : 'Clients'}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-purple-600">
                <User size={13} />
                <span>{isAr ? 'استشارات وإقرارات ضريبية' : 'Personal & Freelance'}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <User size={22} />
            </div>
          </div>
        </div>

        {/* Active Engagements */}
        <div className="bg-white rounded-[2.2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-50/70 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                {isAr ? 'العمليات والخدمات النشطة' : 'Active Deliverables'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">
                  {pulseMetrics.activeOps}
                </p>
                <span className="text-xs font-bold text-gray-400">{isAr ? 'مشروع' : 'Engagements'}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-blue-600">
                <Activity size={13} />
                <span>{isAr ? 'قيد التنفيذ والمتابعة' : 'In Production SLA'}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Activity size={22} />
            </div>
          </div>
        </div>

        {/* Average Lifetime Value (LTV) */}
        <div className="bg-white rounded-[2.2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-200 transition-colors">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-50/70 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                {isAr ? 'متوسط قيمة العميل (LTV)' : 'Avg Lifetime Value (LTV)'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">
                  {pulseMetrics.avgLtv.toLocaleString()}
                </p>
                <span className="text-xs font-bold text-gray-400">OMR</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-emerald-600">
                <TrendingUp size={13} />
                <span>{isAr ? 'محفظة العقود المدارة' : 'Managed Retainers'}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Dual Segmentation Tabs & Interactive Roster ───────── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Primary Segment Switcher (B2B vs Individual vs All) */}
        <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex items-center bg-gray-200/80 p-1.5 rounded-2xl gap-1">
            {/* Tab 1: B2B Corporate */}
            <button
              onClick={() => setClientCategoryTab('b2b')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                clientCategoryTab === 'b2b'
                  ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <Building2 size={15} />
              <span>{isAr ? 'الشركات والمؤسسات (B2B)' : 'Corporate Entities (B2B)'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                clientCategoryTab === 'b2b' ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
              }`}>
                {pulseMetrics.b2bCount}
              </span>
            </button>

            {/* Tab 2: Individual Clients */}
            <button
              onClick={() => setClientCategoryTab('individual')}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                clientCategoryTab === 'individual'
                  ? 'bg-purple-700 text-white shadow-md shadow-purple-900/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <User size={15} />
              <span>{isAr ? 'العملاء الأفراد (B2C)' : 'Individual Clients'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                clientCategoryTab === 'individual' ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
              }`}>
                {pulseMetrics.individualCount}
              </span>
            </button>

            {/* Tab 3: All Portfolios */}
            <button
              onClick={() => setClientCategoryTab('all')}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                clientCategoryTab === 'all'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers size={14} />
              <span>{isAr ? 'الكل' : 'All'}</span>
              <span className="text-[10px] opacity-75">({clients.length})</span>
            </button>
          </div>

          {/* Quick Filter Tag Badges */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-wider overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${statusFilter === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('active_ops')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${statusFilter === 'active_ops' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-500 hover:text-blue-600'}`}
            >
              {isAr ? 'عمليات نشطة' : 'Active Ops'}
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${statusFilter === 'overdue' ? 'bg-red-500 text-white shadow-xs' : 'text-gray-500 hover:text-red-600'}`}
            >
              {isAr ? 'فواتير متأخرة' : 'Overdue'}
            </button>
            <button
              onClick={() => setStatusFilter('retainer')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${statusFilter === 'retainer' ? 'bg-brand-dark text-white shadow-xs' : 'text-gray-500 hover:text-brand-dark'}`}
            >
              {isAr ? 'عقود سنوية / VIP' : 'Retainers / VIP'}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 flex items-center bg-white">
          <div className="relative w-full max-w-lg">
            <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
            <input
              type="text"
              placeholder={
                clientCategoryTab === 'b2b'
                  ? (isAr ? 'بحث بالسجل التجاري (CR) أو اسم الشركة أو المفوض...' : 'Search by CR number, company name, contact...')
                  : clientCategoryTab === 'individual'
                  ? (isAr ? 'بحث بالرقم المدني أو الاسم أو الهاتف...' : 'Search by Civil ID, client name, phone...')
                  : (isAr ? 'بحث شامل في جميع حسابات العملاء...' : 'Search across all client records...')
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-brand-dark text-xs font-bold transition-all shadow-xs`}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-20 text-center text-gray-400">
            {clientCategoryTab === 'individual' ? (
              <User size={54} className="mx-auto mb-4 opacity-20 text-purple-600" />
            ) : (
              <Building2 size={54} className="mx-auto mb-4 opacity-20 text-brand-dark" />
            )}
            <p className="font-black text-gray-800 text-base">
              {clientCategoryTab === 'individual' 
                ? (isAr ? 'لا يوجد عملاء أفراد مطابقين للبحث' : 'No individual clients found')
                : (isAr ? 'لا توجد شركات مطابقة للبحث' : 'No corporate clients found')}
            </p>
            <p className="text-xs text-gray-400 mt-1">{isAr ? 'جرّب تغيير كلمات البحث أو أضف عميلاً جديداً' : 'Try adjusting your search terms or register a new client'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start whitespace-nowrap">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">
                    {clientCategoryTab === 'individual' ? (isAr ? 'العميل والرقم المدني' : 'Client & Civil ID') : (isAr ? 'الشركة ومجال النشاط' : 'Company & Field')}
                  </th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">
                    {isAr ? 'المفوض / الممثل' : 'Client Representative'}
                  </th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">
                    {isAr ? 'الأعمال والمهام' : 'Works & Tasks'}
                  </th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">
                    {isAr ? 'الوضع المالي الفعلي' : 'Financial Standing'}
                  </th>
                  <th className="px-6 py-4 text-end text-[9px] font-black uppercase text-gray-400 tracking-widest">
                    {isAr ? 'التواصل والملف' : 'Actions & 360°'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(client => {
                  const isB2B = isB2BClient(client);
                  const clientInvs = allInvoices.filter(i => i.client_id === client.id);
                  const clientSvcs = allServices.filter(s => s.client_id === client.id);
                  const clientActiveServices = clientSvcs.filter(s => s.status !== 'completed' && s.status !== 'cancelled');
                  const clientCompletedServices = clientSvcs.filter(s => s.status === 'completed');

                  const totalInvBilled = clientInvs.reduce((sum, i) => sum + (Number(i.amount) || Number(i.total) || 0), 0);
                  const totalInvPaid = clientInvs.filter(i => (i.status || '').toLowerCase() === 'paid').reduce((sum, i) => sum + (Number(i.amount) || Number(i.total) || 0), 0);

                  const totalSvcBilled = clientSvcs.reduce((sum, s) => sum + (Number(s.charge_amount) || Number(s.budget) || 0), 0);
                  const totalSvcPaid = clientSvcs.reduce((sum, s) => sum + (Number(s.amount_paid) || (s.payment_status === 'paid' ? (Number(s.charge_amount) || Number(s.budget) || 0) : 0)), 0);

                  const totalClientBilled = totalInvBilled > 0 ? totalInvBilled : totalSvcBilled;
                  const totalClientPaid = totalInvBilled > 0 ? totalInvPaid : totalSvcPaid;
                  const healthPercent = totalClientBilled > 0 ? Math.min(100, Math.round((totalClientPaid / totalClientBilled) * 100)) : 0;

                  const repName = client.representative_name || client.contact_person || (client.full_name !== client.company_name ? client.full_name : '');
                  const repPhone = client.representative_phone || client.phone || '';
                  const repEmail = client.representative_email || client.email || '';

                  return (
                    <tr 
                      key={client.id} 
                      onClick={() => fetchClientDetails(client)}
                      className="group hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      {/* Name, CR / Civil ID, and Industry Field */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-xs ${
                            isB2B 
                              ? 'bg-brand-dark/10 text-brand-dark group-hover:bg-brand-dark group-hover:text-white' 
                              : 'bg-purple-100 text-purple-700 group-hover:bg-purple-700 group-hover:text-white'
                          }`}>
                            {isB2B ? <Building2 size={20} /> : <User size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900 text-sm">{client.company_name || client.full_name}</span>
                              {isB2B ? (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[9px] font-black uppercase font-mono border border-gray-200">
                                  {client.cr_number ? `CR: ${client.cr_number}` : (isAr ? 'بدون سجل' : 'No CR')}
                                </span>
                              ) : (
                                client.civil_id ? (
                                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-md text-[9px] font-black uppercase font-mono flex items-center gap-1">
                                    <IdCard size={10} /> ID: {client.civil_id}
                                  </span>
                                ) : null
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] mt-1 font-medium">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[9px]">
                                {client.industry || (isAr ? 'نشاط عام' : 'General')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client Representative & Direct Contact */}
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                            <UserCircle2 size={13} className="text-gray-400 shrink-0" />
                            <span>{repName || (isAr ? 'غير مسجل' : 'Not specified')}</span>
                          </div>
                          {repPhone && (
                            <div className="text-[10px] font-mono text-emerald-700 flex items-center gap-1 font-bold">
                              <Phone size={10} className="shrink-0" />
                              <span>{repPhone}</span>
                            </div>
                          )}
                          {repEmail && (
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate max-w-[170px]">
                              <Mail size={10} className="shrink-0" />
                              <span>{repEmail}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Works & Tasks Count */}
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-700 border border-gray-200">
                              {clientSvcs.length} {isAr ? 'أعمال' : 'Works'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              clientActiveServices.length > 0 
                                ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {clientActiveServices.length} {isAr ? 'نشطة' : 'Active'}
                            </span>
                            {clientCompletedServices.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {clientCompletedServices.length} {isAr ? 'مكتمل' : 'Done'}
                              </span>
                            )}
                          </div>
                          {clientActiveServices.length > 0 && (
                            <p className="text-[10px] font-bold text-gray-500 truncate max-w-[200px]">
                              {clientActiveServices[0]?.title}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Real Financial Standing */}
                      <td className="px-6 py-5">
                        <div className="space-y-1.5 min-w-[140px]">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-black text-brand-dark">
                              {totalClientBilled > 0 ? `${totalClientBilled.toLocaleString()} OMR` : '0.000 OMR'}
                            </span>
                            <span className="font-bold text-gray-500">
                              {totalClientBilled > 0 ? `${healthPercent}% ${isAr ? 'مسدد' : 'Paid'}` : (isAr ? 'لا توجد رسوم' : 'No charges')}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-700"
                              style={{ 
                                width: totalClientBilled > 0 ? `${healthPercent}%` : '0%', 
                                backgroundColor: healthPercent >= 80 ? '#10B981' : healthPercent >= 50 ? '#F59E0B' : '#EF4444' 
                              }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions & 360° Dossier */}
                      <td className="px-6 py-5 text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* Portal Access Status */}
                          {client.portal_access_sent ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPortalTarget({
                                  id: client.id,
                                  type: 'client',
                                  name: repName || client.company_name,
                                  companyName: client.company_name,
                                  email: repEmail,
                                  phone: repPhone,
                                  portalAccessSent: true
                                });
                                setIsPortalModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-black border border-emerald-200"
                              title={isAr ? 'بيانات البوابة مفعلة ومُرسلة' : 'Portal Access Active'}
                            >
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span className="hidden xl:inline">{isAr ? 'مفعل' : 'Portal'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPortalTarget({
                                  id: client.id,
                                  type: 'client',
                                  name: repName || client.company_name,
                                  companyName: client.company_name,
                                  email: repEmail,
                                  phone: repPhone,
                                  portalAccessSent: false
                                });
                                setIsPortalModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-black border border-amber-200"
                              title={isAr ? 'إرسال بيانات الدخول للبوابة' : 'Send Portal Access'}
                            >
                              <KeyRound size={13} className="text-amber-600" />
                              <span className="hidden xl:inline">{isAr ? 'دخول' : 'Access'}</span>
                            </button>
                          )}

                          {/* 1-Tap WhatsApp to Representative */}
                          <button
                            onClick={(e) => handleOpenWhatsApp(client, e)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl transition-all cursor-pointer"
                            title={isAr ? 'مراسلة الممثل عبر واتساب' : 'WhatsApp Representative'}
                          >
                            <MessageCircle size={14} />
                          </button>

                          {/* Open Dossier */}
                          <button 
                            onClick={() => fetchClientDetails(client)}
                            className="p-2 bg-brand-dark/5 hover:bg-brand-dark text-brand-dark hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                          >
                            <span>{isAr ? 'الملف            {/* Dossier Tabs */}
            <div className="flex border-b border-gray-100 bg-white px-6 gap-2 text-xs font-black uppercase tracking-wider overflow-x-auto">
              <button
                onClick={() => setDrawerTab('operations')}
                className={`py-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  drawerTab === 'operations' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Activity size={15} />
                <span>{isAr ? 'الأعمال والمهام' : 'Works & Tasks'}</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[9px]">
                  {clientServices.length}
                </span>
              </button>

              <button
                onClick={() => setDrawerTab('documents')}
                className={`py-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  drawerTab === 'documents' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <FolderCheck size={15} />
                <span>{isAr ? 'المستندات العامة للشركة' : 'Company Documents'}</span>
              </button>

              <button
                onClick={() => setDrawerTab('overview')}
                className={`py-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  drawerTab === 'overview' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <ShieldCheck size={15} />
                <span>{isB2BClient(selectedClient) ? (isAr ? 'بيانات الشركة والممثل' : 'Company & Rep') : (isAr ? 'البيانات الشخصية' : 'Personal Profile')}</span>
              </button>

              <button
                onClick={() => setDrawerTab('finance')}
                className={`py-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  drawerTab === 'finance' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Banknote size={15} />
                <span>{isAr ? 'المالية والفواتير' : 'Billing & Invoices'}</span>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
                </div>
              ) : (
                <>
                  {/* ── TAB 1: Live Works & Tasks ──────────────────────────── */}
                  {drawerTab === 'operations' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <Activity size={15} className="text-brand-dark" />
                            {isAr ? 'قائمة الأعمال والخدمات المسندة للشركة' : 'Company Jobs & Active Services'}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {isAr ? 'كل عمل له رسومه الخاصة، مدته، حالته الربعية، وقائمة الأنشطة' : 'Each job has custom charges, duration type, quarterly progress & activities'}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setQuickOpForm({
                              title: 'VAT Return Filing',
                              custom_title: '',
                              use_custom_title: false,
                              department_id: 'tax_vat',
                              employee_id: employees[0]?.id || '',
                              charge_amount: '350',
                              duration_type: 'quarterly',
                              due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                              description: '',
                              status: 'ongoing',
                              activities: [
                                { id: 'act-1', title: 'Collect sales & purchase invoices', completed: false },
                                { id: 'act-2', title: 'Reconcile VAT ledger & calculate tax', completed: false }
                              ],
                              new_activity_text: ''
                            });
                            setShowQuickOpModal(true);
                          }}
                          className="px-3.5 py-2 bg-brand-dark hover:bg-brand text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        >
                          <Plus size={14} />
                          <span>{isAr ? '+ إنشاء عمل / مهمة جديدة' : '+ Create New Job'}</span>
                        </button>
                      </div>

                      {clientServices.length === 0 ? (
                        <div className="p-10 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                          <Activity size={36} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-xs font-black text-gray-700">{isAr ? 'لا توجد أعمال مسجلة لهذه الشركة حالياً' : 'No jobs currently assigned to this company'}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{isAr ? 'انقر على الزر أعلاه لإضافة أول عمل برسوم مخصصة' : 'Click the button above to create a new job with separate charges'}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {clientServices.map(svc => {
                            const svcDuration = svc.duration_type || 'one_time';
                            const svcCharge = Number(svc.charge_amount) || Number(svc.budget) || 0;
                            const qStatus = svc.quarterly_status || { q1: 'pending', q2: 'pending', q3: 'pending', q4: 'pending' };
                            const svcActivities = svc.activities || [];

                            return (
                              <div key={svc.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs hover:border-brand-dark/30 transition-all space-y-3.5">
                                {/* Job Header */}
                                <div className="flex flex-wrap justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase bg-brand-dark/10 text-brand-dark">
                                        {svc.department_id ? svc.department_id.replace('_', ' ') : 'General'}
                                      </span>
                                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                        svc.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                        svc.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                        svc.status === 'under_review' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {svc.status.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <h3 className="text-sm font-black text-gray-900 mt-1">{svc.title}</h3>
                                  </div>

                                  {/* Separate Charges & Payment Pill */}
                                  <div className="text-end">
                                    <div className="text-sm font-black text-brand-dark">
                                      {svcCharge > 0 ? `${svcCharge.toLocaleString()} OMR` : (isAr ? 'بدون رسوم' : 'No Fee')}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleJobPaymentStatus(svc.id, svc.payment_status)}
                                      className={`mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                                        svc.payment_status === 'paid' 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                          : svc.payment_status === 'partially_paid'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                      }`}
                                      title={isAr ? 'انقر لتغيير حالة السداد' : 'Click to cycle payment status'}
                                    >
                                      {svc.payment_status === 'paid' ? (isAr ? '✓ مسدد بالكامل' : '✓ 100% Paid') :
                                       svc.payment_status === 'partially_paid' ? (isAr ? 'دفعة جزئية' : 'Partial') :
                                       (isAr ? 'غير مسدد' : 'Unpaid')}
                                    </button>
                                  </div>
                                </div>

                                {/* Duration & Quarter-wise Tracking */}
                                <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                      <Clock size={11} />
                                      {isAr ? 'مدة ونوع العمل:' : 'Duration & Period:'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-700">
                                      {svcDuration === 'quarterly' ? (isAr ? 'عمل ربعي دوري (٤ فترات)' : 'Quarterly Cycles (Q1 - Q4)') :
                                       svcDuration === 'annual' ? (isAr ? 'عقد سنوي (سنة كاملة)' : 'Annual (1-Year)') :
                                       svcDuration === 'monthly' ? (isAr ? 'اشتراك شهري' : 'Monthly Retainer') :
                                       (isAr ? 'مشروع لمرة واحدة' : 'One-Time Project')}
                                    </span>
                                  </div>

                                  {/* If Quarterly, show interactive Q1 - Q4 status buttons */}
                                  {svcDuration === 'quarterly' && (
                                    <div className="grid grid-cols-4 gap-2 pt-1">
                                      {(['q1', 'q2', 'q3', 'q4'] as const).map(q => {
                                        const qVal = (qStatus as any)[q] || 'pending';
                                        return (
                                          <button
                                            key={q}
                                            type="button"
                                            onClick={() => handleUpdateQuarterStatus(svc.id, qStatus, q)}
                                            className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center transition-all cursor-pointer border ${
                                              qVal === 'completed'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                : qVal === 'ongoing'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                            }`}
                                            title={isAr ? `انقر لتغيير حالة ${q.toUpperCase()}` : `Click to cycle ${q.toUpperCase()} status`}
                                          >
                                            <span>{q.toUpperCase()}</span>
                                            <span className="text-[8px] font-bold opacity-90">
                                              {qVal === 'completed' ? (isAr ? 'مكتمل' : 'Done') :
                                               qVal === 'ongoing' ? (isAr ? 'جاري' : 'In Progress') :
                                               (isAr ? 'معلق' : 'Pending')}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Activities / Checklist */}
                                <div className="space-y-2 pt-1">
                                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                    <span>{isAr ? 'الأنشطة والمهام الفرعية:' : 'Job Activities & Checklist:'}</span>
                                    <span>{svcActivities.filter(a => a.completed).length} / {svcActivities.length}</span>
                                  </div>

                                  {svcActivities.length > 0 && (
                                    <div className="space-y-1.5">
                                      {svcActivities.map(act => (
                                        <div
                                          key={act.id}
                                          onClick={() => handleToggleActivity(svc.id, svcActivities, act.id)}
                                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                                            act.completed ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900 line-through opacity-75' : 'bg-white border-gray-100 text-gray-800 hover:border-gray-200'
                                          }`}
                                        >
                                          {act.completed ? (
                                            <CheckSquare size={14} className="text-emerald-600 shrink-0" />
                                          ) : (
                                            <Square size={14} className="text-gray-400 shrink-0" />
                                          )}
                                          <span>{act.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Add Activity inline input */}
                                  <div className="flex gap-2 pt-1">
                                    <input
                                      type="text"
                                      placeholder={isAr ? '+ أضف نشاط فرعي جديد...' : '+ Add sub-activity...'}
                                      value={newJobActivityInput[svc.id] || ''}
                                      onChange={(e) => setNewJobActivityInput({ ...newJobActivityInput, [svc.id]: e.target.value })}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddActivityToJob(svc.id, svcActivities); } }}
                                      className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-brand-dark"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddActivityToJob(svc.id, svcActivities)}
                                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black cursor-pointer"
                                    >
                                      {isAr ? 'إضافة' : 'Add'}
                                    </button>
                                  {/* Deliverables / Documents attached to this job */}
                                  <JobDeliverableManager
                                    jobId={svc.id}
                                    clientId={selectedClient.id}
                                    jobTitle={svc.title}
                                    existingDocuments={svc.job_documents}
                                    isAr={isAr}
                                    onDocumentsUpdated={(updatedDocs) => {
                                      svc.job_documents = updatedDocs;
                                    }}
                                  />
                                </div>

                                {/* Footer: Assignee & Creation info */}
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-[10px] text-gray-500">
                                  <span>
                                    {isAr ? 'المسؤول:' : 'Managing:'} <strong className="text-gray-800">{svc.profiles?.full_name || 'Staff Member'}</strong>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar size={11} />
                                    <span>{svc.created_at ? new Date(svc.created_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB') : ''}</span>
                                    {svc.due_date && <span>• SLA: {new Date(svc.due_date).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB')}</span>}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB 2: Common Company Documents ────────────────────── */}
                  {drawerTab === 'documents' && (
                    <CompanyDocumentManager
                      clientId={selectedClient.id}
                      companyName={selectedClient.company_name}
                      crNumber={selectedClient.cr_number}
                      taxNumber={selectedClient.tax_number}
                      vatNumber={selectedClient.tax_number}
                      existingDocuments={selectedClient.common_documents}
                      onDocumentsUpdated={(updatedDocs) => {
                        selectedClient.common_documents = updatedDocs;
                      }}
                      isAr={isAr}
                    />
                  )}

                  {/* ── TAB 3: Profile Overview ────────────────────────────── */}
                  {drawerTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Identity & Legal Numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1">
                            <Building2 size={12} /> {isAr ? 'رقم السجل التجاري (CR)' : 'Commercial Reg (CR)'}
                          </p>
                          <p className="text-base font-black text-gray-900 font-mono">{selectedClient.cr_number || (isAr ? 'بدون سجل' : 'No CR')}</p>
                          <span className="text-[10px] font-bold text-emerald-600 mt-1 inline-block">✓ وزارة التجارة والصناعة (MoCIIP)</span>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1">
                            <Tag size={12} /> {isAr ? 'مجال النشاط / القطاع' : 'Industry Field'}
                          </p>
                          <p className="text-sm font-black text-gray-900">{selectedClient.industry || (isAr ? 'نشاط عام' : 'General')}</p>
                          <span className="text-[10px] font-bold text-blue-600 mt-1 inline-block">✓ قطاع معتمد</span>
                        </div>
                      </div>

                      {/* Representative / Contact Person Info */}
                      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <UserCircle2 size={14} className="text-brand-dark" />
                          {isAr ? 'بيانات المفوض / ممثل الشركة' : 'Company Representative Details'}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">{isAr ? 'اسم المفوض / الممثل' : 'Representative Name'}</span>
                            <span className="text-xs font-black text-gray-900">
                              {selectedClient.representative_name || selectedClient.contact_person || selectedClient.full_name || (isAr ? 'غير محدد' : 'Not specified')}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">{isAr ? 'الرقم الضريبي (TIN)' : 'Tax Number (TIN)'}</span>
                            <span className="text-xs font-black text-gray-900 font-mono">{selectedClient.tax_number || '---'}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">{isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</span>
                            <span className="text-xs font-black text-gray-900 font-mono">
                              {selectedClient.representative_phone || selectedClient.phone || '---'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">{isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}</span>
                            <span className="text-xs font-black text-gray-900 font-mono">
                              {selectedClient.representative_email || selectedClient.email || '---'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Contact Buttons */}
                        <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleOpenWhatsApp(selectedClient)}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                          >
                            <MessageCircle size={15} />
                            <span>{isAr ? 'واتساب مباشر' : 'WhatsApp Representative'}</span>
                          </button>

                          {(selectedClient.representative_phone || selectedClient.phone) && (
                            <a
                              href={`tel:${selectedClient.representative_phone || selectedClient.phone}`}
                              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Phone size={15} />
                              <span>{isAr ? 'اتصال' : 'Call'}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Account Manager Supervision */}
                      <div className="bg-brand-dark/5 border border-brand-dark/10 rounded-3xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-brand-dark text-white flex items-center justify-center font-black text-sm">
                            {(selectedClient.assigned_employee?.full_name || employees[0]?.full_name || 'B').charAt(0)}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-brand-dark tracking-wider">{isAr ? 'المسؤول المباشر عن الحساب' : 'Assigned Account Lead'}</span>
                            <p className="text-sm font-black text-gray-900">{selectedClient.assigned_employee?.full_name || employees[0]?.full_name || (isAr ? 'غير محدد' : 'Unassigned')}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-white rounded-xl text-[10px] font-black text-gray-700 border border-gray-200">
                          {isAr ? 'إشراف العمليات' : 'Active Lead'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 4: Financials & Invoices ────────────────────────── */}
                  {drawerTab === 'finance' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Financial KPI Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">{isAr ? 'إجمالي الرسوم' : 'Total Charges'}</p>
                          <p className="text-xl font-black text-blue-800">{clientFinance.total_billed.toLocaleString()} <span className="text-xs">OMR</span></p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">{isAr ? 'المسدد' : 'Paid'}</p>
                          <p className="text-xl font-black text-emerald-800">{clientFinance.paid.toLocaleString()} <span className="text-xs">OMR</span></p>
                        </div>
                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">{isAr ? 'المتبقي' : 'Outstanding'}</p>
                          <p className="text-xl font-black text-red-800">{clientFinance.outstanding.toLocaleString()} <span className="text-xs">OMR</span></p>
                        </div>
                      </div>

                      {/* Direct Document Action Bar */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenInvoiceDoc(selectedClient)}
                          className="flex-1 py-3 bg-brand-dark hover:bg-brand text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-brand-dark/15"
                        >
                          <FileText size={15} />
                          <span>{isAr ? 'إصدار فاتورة ضريبية' : '+ Issue Tax Invoice'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenReceiptDoc(selectedClient)}
                          className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-900/15"
                        >
                          <Receipt size={15} />
                          <span>{isAr ? 'إصدار سند قبض' : '+ Issue Receipt Voucher'}</span>
                        </button>
                      </div>

                      {/* Invoices List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">{isAr ? 'سجل الفواتير والمطالبات' : 'Invoices & Billing History'}</h4>
                        {clientInvoices.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs font-bold">
                            {isAr ? 'لا توجد فواتير سابقة مسجلة لهذا العميل' : 'No previous invoices recorded'}
                          </div>
                        ) : (
                          clientInvoices.map(inv => (
                            <div key={inv.id} className="bg-white border border-gray-100 p-3.5 rounded-2xl flex justify-between items-center shadow-xs">
                              <div>
                                <span className="text-xs font-black text-gray-900 block font-mono">INV-{inv.id.substring(0, 5).toUpperCase()}</span>
                                <span className="text-[10px] text-gray-400">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '---'}</span>
                              </div>
                              <div className="text-end">
                                <span className="text-xs font-black text-brand-dark block">{Number(inv.amount || inv.total || 0).toLocaleString()} OMR</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                  inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={(e) => handleArchive(selectedClient.id, e)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Archive size={14} />
                <span>{isAr ? 'أرشفة العميل' : 'Archive Client'}</span>
              </button>

              <button
                onClick={() => setSelectedClient(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Register New Client (Company & Representative) ─────────── */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden p-6 animate-scale-up border border-gray-100 my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  newClientType === 'b2b' ? 'bg-brand-dark/10 text-brand-dark' : 'bg-purple-100 text-purple-700'
                }`}>
                  {newClientType === 'b2b' ? <Building2 size={20} /> : <User size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {newClientType === 'b2b' ? (isAr ? 'تسجيل شركة جديدة (B2B)' : 'Register Company Entity (B2B)') : (isAr ? 'تسجيل عميل فردي جديد' : 'Register Individual Client')}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400">{isAr ? 'بيانات الشركة وممثلها ومجال عملها' : 'Company details, representative & industry field'}</p>
                </div>
              </div>
              <button onClick={() => setShowAddClientModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Type Selector within Modal */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-4 text-xs font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setNewClientType('b2b')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  newClientType === 'b2b' ? 'bg-brand-dark text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 size={14} />
                <span>{isAr ? 'شركة / مؤسسة (B2B)' : 'Corporate (B2B)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNewClientType('individual')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  newClientType === 'individual' ? 'bg-purple-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User size={14} />
                <span>{isAr ? 'عميل فردي (B2C)' : 'Individual Client'}</span>
              </button>
            </div>

            <form onSubmit={handleCreateClientSubmit} className="space-y-4 overflow-y-auto pr-1">
              {/* Company Details */}
              {newClientType === 'b2b' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'اسم الشركة / المؤسسة *' : 'Company Name *'}</label>
                      <input
                        type="text"
                        required
                        value={newClientForm.company_name}
                        onChange={(e) => setNewClientForm({ ...newClientForm, company_name: e.target.value })}
                        placeholder={isAr ? 'مثال: شركة النماء للمقاولات ش.م.م' : 'e.g., Al Namaa Contracting LLC'}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'رقم السجل التجاري (CR)' : 'CR Number (7 digits)'}</label>
                      <input
                        type="text"
                        maxLength={7}
                        inputMode="numeric"
                        value={newClientForm.cr_number}
                        onChange={(e) => setNewClientForm({ ...newClientForm, cr_number: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                        placeholder="1473555"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-brand-dark"
                      />
                    </div>
                  </div>

                  {/* Industry Field Selector */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">{isAr ? 'مجال نشاط الشركة' : 'Company Industry / Field'}</label>
                      <button
                        type="button"
                        onClick={() => setNewClientForm({ ...newClientForm, use_custom_industry: !newClientForm.use_custom_industry })}
                        className="text-[10px] text-brand-dark font-bold hover:underline"
                      >
                        {newClientForm.use_custom_industry ? (isAr ? 'اختر من القائمة' : 'Select from list') : (isAr ? '+ كتابة مجال مخصص' : '+ Type custom field')}
                      </button>
                    </div>

                    {newClientForm.use_custom_industry ? (
                      <input
                        type="text"
                        value={newClientForm.custom_industry}
                        onChange={(e) => setNewClientForm({ ...newClientForm, custom_industry: e.target.value })}
                        placeholder={isAr ? 'مثال: مقاولات كهربائية، تجارة التجزئة، شحن بحري' : 'e.g., Construction, Logistics, Supermarkets'}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                      />
                    ) : (
                      <select
                        value={newClientForm.industry}
                        onChange={(e) => setNewClientForm({ ...newClientForm, industry: e.target.value })}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                      >
                        {INDUSTRY_OPTIONS.map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Tax Number */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'الرقم الضريبي (TIN / VAT) - اختياري' : 'Tax ID (TIN / VAT) - Optional'}</label>
                    <input
                      type="text"
                      value={newClientForm.tax_number}
                      onChange={(e) => setNewClientForm({ ...newClientForm, tax_number: e.target.value })}
                      placeholder="OM1100298341"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-brand-dark"
                    />
                  </div>

                  {/* Representative Section */}
                  <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
                    <p className="text-[10px] font-black uppercase text-brand-dark tracking-wider flex items-center gap-1">
                      <UserCircle2 size={13} />
                      {isAr ? 'بيانات ممثل الشركة (المفوض بالتواصل)' : 'Company Representative (Authorized Signatory)'}
                    </p>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">{isAr ? 'اسم ممثل الشركة *' : 'Representative Name *'}</label>
                      <input
                        type="text"
                        value={newClientForm.representative_name}
                        onChange={(e) => setNewClientForm({ ...newClientForm, representative_name: e.target.value, full_name: e.target.value })}
                        placeholder={isAr ? 'مثال: المهندس محمد الفارسي' : 'e.g., Eng. Mohammed Al Farsi'}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">{isAr ? 'رقم هاتف / واتساب الممثل' : 'Mobile / WhatsApp'}</label>
                        <input
                          type="tel"
                          value={newClientForm.representative_phone}
                          onChange={(e) => setNewClientForm({ ...newClientForm, representative_phone: e.target.value, phone: e.target.value })}
                          placeholder="+968 9123 4567"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-brand-dark"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">{isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}</label>
                        <input
                          type="email"
                          value={newClientForm.representative_email}
                          onChange={(e) => setNewClientForm({ ...newClientForm, representative_email: e.target.value, email: e.target.value })}
                          placeholder="rep@company.om"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'اسم العميل الكامل *' : 'Full Name *'}</label>
                    <input
                      type="text"
                      required
                      value={newClientForm.full_name}
                      onChange={(e) => setNewClientForm({ ...newClientForm, full_name: e.target.value, company_name: e.target.value })}
                      placeholder={isAr ? 'مثال: د. سالم الحارثي' : 'e.g., Dr. Salim Al Harthy'}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'الرقم المدني (Civil ID)' : 'Civil ID'}</label>
                      <input
                        type="text"
                        value={newClientForm.civil_id}
                        onChange={(e) => setNewClientForm({ ...newClientForm, civil_id: e.target.value })}
                        placeholder="91823746"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-brand-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                      <input
                        type="tel"
                        value={newClientForm.phone}
                        onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                        placeholder="+968 9988 7766"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-brand-dark"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input
                      type="email"
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                      placeholder="client@gmail.com"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                    />
                  </div>
                </div>
              )}

              {/* Account Manager Supervisor */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'المسؤول المشرف عن الحساب' : 'Assigned Account Lead'}</label>
                <select
                  value={newClientForm.assigned_employee_id}
                  onChange={(e) => setNewClientForm({ ...newClientForm, assigned_employee_id: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  <option value="">{isAr ? '-- غير محدد --' : '-- Unassigned --'}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role || 'Staff'})</option>
                  ))}
                </select>
              </div>

              {/* Portal Access Toggle */}
              <div className="flex items-center gap-2.5 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="managerSendPortalCheck"
                  checked={newClientForm.send_portal_access}
                  onChange={(e) => setNewClientForm({ ...newClientForm, send_portal_access: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="managerSendPortalCheck" className="text-xs font-black text-emerald-950 cursor-pointer select-none">
                  {isAr ? '🔑 إنشاء بيانات دخول البوابة وإرسالها للممثل' : '🔑 Enable Client Portal & Send Access to Representative'}
                </label>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs cursor-pointer transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingClient}
                  className={`flex-1 py-3 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer disabled:opacity-50 ${
                    newClientType === 'b2b' ? 'bg-brand-dark hover:bg-brand shadow-brand-dark/20' : 'bg-purple-700 hover:bg-purple-800 shadow-purple-900/20'
                  }`}
                >
                  {isSavingClient ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تسجيل الشركة' : 'Register Entity')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create New Job/Work with Separate Charges & Activities ─── */}
      {showQuickOpModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-6 animate-scale-up border border-gray-100 my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Activity size={18} className="text-brand-dark" />
                  {isAr ? `إسناد عمل جديد لـ (${selectedClient.company_name || selectedClient.full_name})` : `Create New Job for ${selectedClient.company_name || selectedClient.full_name}`}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'رسوم مستقلة، مدة مخصصة، وأنشطة فرعية' : 'Custom fee, duration type, and sub-activities'}</p>
              </div>
              <button onClick={() => setShowQuickOpModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickOpSubmit} className="space-y-4 overflow-y-auto pr-1">
              {/* Department Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'القسم المسؤول عن العمل *' : 'Department *'}</label>
                <select
                  value={quickOpForm.department_id}
                  onChange={(e) => setQuickOpForm({ ...quickOpForm, department_id: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  {getAllDepartments().map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {isAr ? (dept.name_ar || dept.name) : dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Title: Catalog or Custom */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">{isAr ? 'اسم الخدمة / العمل *' : 'Work / Service Title *'}</label>
                  <button
                    type="button"
                    onClick={() => setQuickOpForm({ ...quickOpForm, use_custom_title: !quickOpForm.use_custom_title })}
                    className="text-[10px] text-brand-dark font-bold hover:underline"
                  >
                    {quickOpForm.use_custom_title ? (isAr ? 'اختر من القائمة' : 'Select standard') : (isAr ? '+ كتابة خدمة مخصصة' : '+ Type custom service')}
                  </button>
                </div>

                {quickOpForm.use_custom_title ? (
                  <input
                    type="text"
                    required
                    value={quickOpForm.custom_title}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, custom_title: e.target.value })}
                    placeholder={isAr ? 'مثال: إعداد إقرار ضريبة القيمة المضافة Q2 2026، دراسة جدوى اقتصادية' : 'e.g., VAT Return Q2 2026, Feasibility Study'}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={quickOpForm.title}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, title: e.target.value })}
                    placeholder={isAr ? 'مثال: إعداد الإقرار الضريبي، تدقيق القوائم المالية' : 'e.g., Statutory Audit 2026, VAT Filing'}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                  />
                )}
              </div>

              {/* Separate Custom Charges & Duration Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    {isAr ? 'رسوم هذا العمل المتفق عليها (ر.ع) *' : 'Agreed Fee (OMR) *'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={quickOpForm.charge_amount}
                      onChange={(e) => setQuickOpForm({ ...quickOpForm, charge_amount: e.target.value })}
                      placeholder="350"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark font-mono"
                    />
                    <span className="absolute end-3 top-2.5 text-xs font-bold text-gray-400">OMR</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    {isAr ? 'مدة ونوع العمل' : 'Duration Type'}
                  </label>
                  <select
                    value={quickOpForm.duration_type}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, duration_type: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    <option value="quarterly">{isAr ? 'عمل ربع سنوي (Q1-Q4)' : 'Quarterly Cycles (Q1-Q4)'}</option>
                    <option value="annual">{isAr ? 'سنة واحدة (عقد سنوي)' : 'Annual (1-Year)'}</option>
                    <option value="one_time">{isAr ? 'مشروع لمرة واحدة' : 'One-Time Project'}</option>
                    <option value="monthly">{isAr ? 'اشتراك شهري' : 'Monthly Retainer'}</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'الموظف المسؤول المباشر' : 'Assignee'}</label>
                  <select
                    value={quickOpForm.employee_id}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, employee_id: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role || 'Staff'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'الموعد النهائي (SLA)' : 'Due Date (SLA)'}</label>
                  <input
                    type="date"
                    value={quickOpForm.due_date}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, due_date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              {/* Dynamic Activities / Checklist */}
              <div className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  {isAr ? 'قائمة الأنشطة والخطوات الفرعية (Checklist)' : 'Job Sub-Activities & Steps'}
                </label>

                {quickOpForm.activities.length > 0 && (
                  <div className="space-y-1.5">
                    {quickOpForm.activities.map((act, index) => (
                      <div key={act.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-200 text-xs font-bold">
                        <span>{index + 1}. {act.title}</span>
                        <button
                          type="button"
                          onClick={() => setQuickOpForm({
                            ...quickOpForm,
                            activities: quickOpForm.activities.filter(a => a.id !== act.id)
                          })}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={quickOpForm.new_activity_text}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, new_activity_text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (quickOpForm.new_activity_text.trim()) {
                          setQuickOpForm({
                            ...quickOpForm,
                            activities: [
                              ...quickOpForm.activities,
                              { id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, title: quickOpForm.new_activity_text.trim(), completed: false }
                            ],
                            new_activity_text: ''
                          });
                        }
                      }
                    }}
                    placeholder={isAr ? 'أضف نشاط فرعي...' : 'Add step (e.g., Collect bank statements)...'}
                    className="flex-1 p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-dark"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (quickOpForm.new_activity_text.trim()) {
                        setQuickOpForm({
                          ...quickOpForm,
                          activities: [
                            ...quickOpForm.activities,
                            { id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, title: quickOpForm.new_activity_text.trim(), completed: false }
                          ],
                          new_activity_text: ''
                        });
                      }
                    }}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'إضافة' : 'Add'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickOpModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingOp}
                  className="flex-1 py-3 bg-brand-dark hover:bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingOp ? (isAr ? 'جاري الإسناد...' : 'Creating...') : (isAr ? 'تأكيد إسناد العمل' : 'Confirm Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tax Invoice Modal ─────────────────────────────────────────────── */}
      <TaxInvoiceModal
        isOpen={showTaxInvoiceModal}
        onClose={() => setShowTaxInvoiceModal(false)}
        clientData={docClientData}
      />

      {/* ── Payment Receipt Modal ─────────────────────────────────────────── */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        clientData={docClientData}
      />

      {/* ── Portal Access & Credential Handover Modal ──────────────────────── */}
      <PortalAccessCredentialModal
        isOpen={isPortalModalOpen}
        onClose={() => {
          setIsPortalModalOpen(false);
          setPortalTarget(null);
        }}
        target={portalTarget}
        onSuccess={({ targetId }) => {
          setClients(prev => prev.map(c => c.id === targetId ? { ...c, portal_access_sent: true } : c));
          fetchClientsAndStats(true);
        }}
      />
    </div>
  );
};

export default ClientManagement;verable Title *'}</label>
                <input
                  type="text"
                  required
                  value={quickOpForm.title}
                  onChange={(e) => setQuickOpForm({ ...quickOpForm, title: e.target.value })}
                  placeholder={isAr ? 'مثال: إعداد الإقرار الضريبي Q2 2026' : 'e.g., VAT Return Filing Q2 2026'}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'الموظف المسؤول المباشر' : 'Assignee'}</label>
                  <select
                    value={quickOpForm.employee_id}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, employee_id: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role || 'Staff'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{isAr ? 'الموعد النهائي (SLA)' : 'Due Date (SLA)'}</label>
                  <input
                    type="date"
                    value={quickOpForm.due_date}
                    onChange={(e) => setQuickOpForm({ ...quickOpForm, due_date: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickOpModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingOp}
                  className="flex-1 py-3 bg-brand-dark hover:bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingOp ? (isAr ? 'جاري التكليف...' : 'Assigning...') : (isAr ? 'تأكيد التكليف' : 'Confirm Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tax Invoice Modal ─────────────────────────────────────────────── */}
      <TaxInvoiceModal
        isOpen={showTaxInvoiceModal}
        onClose={() => setShowTaxInvoiceModal(false)}
        clientData={docClientData}
      />

      {/* ── Payment Receipt Modal ─────────────────────────────────────────── */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        clientData={docClientData}
      />

      {/* ── Portal Access & Credential Handover Modal ──────────────────────── */}
      <PortalAccessCredentialModal
        isOpen={isPortalModalOpen}
        onClose={() => {
          setIsPortalModalOpen(false);
          setPortalTarget(null);
        }}
        target={portalTarget}
        onSuccess={({ targetId }) => {
          setClients(prev => prev.map(c => c.id === targetId ? { ...c, portal_access_sent: true } : c));
          fetchClientsAndStats(true);
        }}
      />
    </div>
  );
};

export default ClientManagement;
