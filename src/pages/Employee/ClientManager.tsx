import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { logActivity } from '../../lib/activityLogger';
import {
  Search,
  Plus,
  Building2,
  X,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Hash,
  Percent,
  Briefcase,
  Receipt,
  PlayCircle,
  AlertTriangle,
  Trash2,
  UserCircle2,
  EyeOff,
  Eye,
  Edit,
  Download,
  Mail,
  KeyRound,
  RefreshCw,
  ClipboardCheck,
  Users,
  TrendingUp,
  Filter,
  Check
} from 'lucide-react';
import {
  normalizeDepartmentId,
  isClientRelevantToDepartment,
  getDepartmentClientIdsFromDSR,
  isServiceMatchingDepartment
} from '../../utils/departmentScoping';
import { DEPARTMENT_CONFIGS } from '../../config/departments';
import { autoCreateDSREntryFromTask, deleteDSRsByClientId } from '../../utils/dsrSync';
import PortalAccessCredentialModal, { type PortalAccessTarget } from '../../components/crm/PortalAccessCredentialModal';
import ClientDepartmentChecklist from '../../components/employee/ClientDepartmentChecklist';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface B2BPartner {
  id: string;
  name: string;
  partner_type: string;
  contact_person: string;
  phone: string;
  email?: string | null;
  location?: string | null;
  cr_number?: string | null;
  agreement_tier?: string | null;
  notes?: string | null;
  created_at?: string;
}

interface Client {
  id: string;
  company_name: string;
  cr_number: string | null;
  vat_number: string | null;
  activity: string | null;
  compliance_status: string;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  assigned_employee_id?: string | null;
  portal_access_sent?: boolean;
  portal_sent_at?: string | null;
  portal_user_id?: string | null;
  b2b_partner_id?: string | null;
  b2b_partner_name?: string | null;
  source?: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface Service {
  id: string;
  title: string;
  status: string;
  description: string | null;
  created_at: string;
  due_date: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const COMPLIANCE_STYLES: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Pending: 'bg-amber-100 text-amber-700',
  Suspended: 'bg-red-100 text-red-700',
};

const SERVICE_STYLES: Record<string, { cls: string; icon: React.ReactNode }> = {
  ongoing: { cls: 'bg-blue-100 text-blue-700', icon: <PlayCircle size={12} /> },
  completed: { cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
  delayed: { cls: 'bg-red-100 text-red-700', icon: <AlertTriangle size={12} /> },
  under_review: { cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
};

const INVOICE_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Sub-component: Client Detail Panel
// ---------------------------------------------------------------------------
const ClientDetail = ({
  client,
  onBack,
  isAr,
  t,
  effectiveDeptId,
  isManager,
}: {
  client: Client;
  onBack: () => void;
  isAr: boolean;
  t: any;
  effectiveDeptId: string;
  isManager: boolean;
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checklist' | 'services' | 'invoices' | 'profile'>('checklist');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [invRes, svcRes] = await Promise.all([
          supabase.from('invoices').select('id, invoice_number, amount, status, due_date, created_at').eq('client_id', client.id).order('created_at', { ascending: false }),
          supabase.from('services').select('id, title, status, description, created_at, due_date, employee_id, department_id').eq('client_id', client.id).order('created_at', { ascending: false }),
        ]);
        setInvoices((invRes.data as Invoice[]) || []);
        let allServices = (svcRes.data as any[]) || [];
        if (!isManager && effectiveDeptId) {
          allServices = allServices.filter(s =>
            (s.department_id && normalizeDepartmentId(s.department_id) === effectiveDeptId) ||
            isServiceMatchingDepartment(s.title, effectiveDeptId)
          );
        }
        setServices(allServices);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [client.id, effectiveDeptId, isManager]);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalUnpaid = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const activeServices = services.filter(s => s.status === 'ongoing').length;

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-brand-dark hover:border-brand-dark/30 transition-colors"
        >
          <ArrowLeft size={20} className={isAr ? 'rotate-180' : ''} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{client.company_name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {client.cr_number ? `CR: ${client.cr_number}` : (isAr ? 'بدون رقم سجل' : 'No CR Number')}
          </p>
        </div>
        <span className={`ms-auto px-3 py-1.5 text-xs font-bold rounded-full ${COMPLIANCE_STYLES[client.compliance_status] || 'bg-gray-100 text-gray-600'}`}>
          {client.compliance_status}
        </span>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'مدفوع' : 'Total Paid', value: `${totalPaid.toLocaleString()} ر.ع`, icon: <CheckCircle2 size={18} />, cls: 'bg-green-50 text-green-600' },
          { label: isAr ? 'مستحق' : 'Outstanding', value: `${totalUnpaid.toLocaleString()} ر.ع`, icon: <Clock size={18} />, cls: 'bg-amber-50 text-amber-600' },
          { label: isAr ? 'فواتير' : 'Invoices', value: invoices.length, icon: <Receipt size={18} />, cls: 'bg-blue-50 text-blue-600' },
          { label: isAr ? 'خدمات نشطة' : 'Active Svcs', value: activeServices, icon: <Briefcase size={18} />, cls: 'bg-red-50 text-brand-dark' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.cls}`}>{kpi.icon}</div>
            <div className="font-bold text-lg text-gray-800">{kpi.value}</div>
            <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs & Content Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto whitespace-nowrap">
          {(['checklist', 'services', 'invoices', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[120px] py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === tab
                ? 'text-brand-dark border-b-2 border-brand-dark bg-red-50/40'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab === 'checklist' ? <ClipboardCheck size={16} /> : tab === 'services' ? <Briefcase size={15} /> : tab === 'invoices' ? <Receipt size={15} /> : <UserCircle2 size={15} />}
              {tab === 'checklist' ? (isAr ? 'قائمة الفحص والمستندات' : 'Checklists & Docs') : tab === 'services' ? (isAr ? 'الخدمات' : 'Services') : tab === 'invoices' ? (isAr ? 'الفواتير' : 'Invoices') : (isAr ? 'الملف الشخصي' : 'Profile')}
              {tab === 'services' && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {services.length}
                </span>
              )}
              {tab === 'invoices' && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {invoices.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-dark" />
          </div>
        ) : (
          <>
            {/* Checklist Tab */}
            {activeTab === 'checklist' && (
              <div className="p-6">
                <ClientDepartmentChecklist
                  clientId={client.id}
                  clientName={client.company_name}
                  crNumber={client.cr_number}
                  defaultDeptId={effectiveDeptId}
                  isAr={isAr}
                  isManager={isManager}
                />
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="divide-y divide-gray-50">
                {services.length === 0 ? (
                  <div className="text-center p-10 text-gray-400">
                    <Briefcase size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{isAr ? 'لا توجد خدمات لهذا العميل' : 'No services for this client'}</p>
                  </div>
                ) : services.map(svc => {
                  const s = SERVICE_STYLES[svc.status] || SERVICE_STYLES.ongoing;
                  return (
                    <div key={svc.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${s.cls} flex-shrink-0`}>{s.icon}</div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{svc.title}</p>
                          {svc.description && <p className="text-xs text-gray-400 truncate">{svc.description}</p>}
                        </div>
                      </div>
                      <span className={`ms-3 px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1 flex-shrink-0 ${s.cls}`}>
                        {s.icon}
                        {svc.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="divide-y divide-gray-50">
                {invoices.length === 0 ? (
                  <div className="text-center p-10 text-gray-400">
                    <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{isAr ? 'لا توجد فواتير' : 'No invoices found'}</p>
                  </div>
                ) : invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isAr ? 'تاريخ الاستحقاق:' : 'Due:'} {new Date(inv.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-sm text-gray-800">{inv.amount.toLocaleString()} ر.ع</span>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${INVOICE_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</p>
                    <p className="font-bold text-gray-800">{client.email || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'اسم الشركة' : 'Company Name'}</p>
                    <p className="font-bold text-gray-800">{client.company_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'رقم السجل التجاري' : 'CR Number'}</p>
                    <p className="font-bold text-gray-800">{client.cr_number || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'رقم الضريبة' : 'VAT Number'}</p>
                    <p className="font-bold text-gray-800">{client.vat_number || '—'}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'النشاط' : 'Activity'}</p>
                    <p className="font-bold text-gray-800">{client.activity || '—'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {isAr
                      ? 'لأسباب أمنية، لا يمكن عرض كلمة المرور. إذا نسي العميل كلمة المرور، يرجى استخدام خاصية "استعادة كلمة المرور" من صفحة الدخول.'
                      : 'For security reasons, passwords cannot be displayed. If the client forgets their password, please use the "Forgot Password" feature on the login page.'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: Form Field Helper with Live Validation Feedback
// ---------------------------------------------------------------------------
const FormField = ({
  label, name, required = false, type = 'text', placeholder = '', value, onChange, autoComplete = 'off',
  maxLength, inputMode, hint, isMono = false, status = 'idle', statusMessage, rightElement
}: {
  label: string; name: string; required?: boolean; type?: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: 'numeric' | 'text' | 'tel' | 'email' | 'url' | 'search' | 'decimal';
  hint?: string;
  isMono?: boolean;
  status?: 'idle' | 'checking' | 'valid' | 'duplicate';
  statusMessage?: string;
  rightElement?: React.ReactNode;
}) => {
  let borderColor = 'border-gray-200 focus:border-red-700 focus:ring-red-700/10';
  if (status === 'valid') {
    borderColor = 'border-emerald-400 focus:border-emerald-600 focus:ring-emerald-500/20 bg-emerald-50/20';
  } else if (status === 'duplicate') {
    borderColor = 'border-rose-400 focus:border-rose-600 focus:ring-rose-500/20 bg-rose-50/20';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-gray-400 font-mono font-medium">{hint}</span>}
      </div>
      <div className="relative">
        <input
          type={type}
          name={name}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          inputMode={inputMode}
          className={`w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-colors bg-white ${borderColor} ${isMono ? 'font-mono' : ''} ${status !== 'idle' || rightElement ? 'pe-9' : ''}`}
        />
        <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none">
          {status === 'checking' && <RefreshCw size={15} className="animate-spin text-gray-400" />}
          {status === 'valid' && <CheckCircle2 size={16} className="text-emerald-600" />}
          {status === 'duplicate' && <AlertTriangle size={16} className="text-rose-600" />}
          {rightElement}
        </div>
      </div>
      {statusMessage && (
        <p className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${status === 'duplicate' ? 'text-rose-600' : status === 'valid' ? 'text-emerald-600' : 'text-gray-500'
          }`}>
          {status === 'duplicate' && <AlertCircle size={12} />}
          {status === 'valid' && <CheckCircle2 size={12} />}
          {statusMessage}
        </p>
      )}
    </div>
  );
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// ---------------------------------------------------------------------------
// Main Component: Client Manager
// ---------------------------------------------------------------------------
const ClientManager = () => {
  const { t, i18n } = useTranslation();
  const { user, role, departmentId } = useAuth();
  const isAr = i18n.language === 'ar';
  const ticketRef = useRef<HTMLDivElement>(null);

  const isManager = role === 'manager' || role === 'admin';
  const canManageB2B = useMemo(() => {
    if (role === 'manager' || role === 'admin' || role === 'crm') return true;
    const secRoles = (user?.user_metadata?.secondary_roles || (user as any)?.secondary_roles || []) as string[];
    return secRoles.includes('b2b_coordinator') || secRoles.includes('crm') || secRoles.includes('manager');
  }, [role, user]);

  const effectiveDeptId = useMemo(() => {
    return normalizeDepartmentId(departmentId || user?.user_metadata?.department_id);
  }, [departmentId, user?.user_metadata?.department_id]);

  const currentDeptConfig = DEPARTMENT_CONFIGS[effectiveDeptId];

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<1 | 2>(1);

  // B2B Partner Coordination States
  const [b2bPartners, setB2bPartners] = useState<B2BPartner[]>([]);
  const [loadingB2B, setLoadingB2B] = useState(false);
  const [b2bTab, setB2bTab] = useState<'directory' | 'b2b_network'>('directory');
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string | null>(null);
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [newPartnerForm, setNewPartnerForm] = useState({
    name: '',
    partner_type: 'sanad',
    contact_person: '',
    phone: '',
    email: '',
    location: 'Muscat',
    cr_number: '',
    notes: ''
  });
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [b2bJobs, setB2bJobs] = useState<any[]>([]);

  const [crValidation, setCrValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'duplicate';
    message?: string;
    existingClientName?: string;
  }>({ status: 'idle' });
  const [nameValidation, setNameValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'duplicate';
    message?: string;
  }>({ status: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createPortalAccount, setCreatePortalAccount] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteClientDSRAlso, setDeleteClientDSRAlso] = useState(true);
  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Success Ticket State
  const [successTicket, setSuccessTicket] = useState<{
    email: string;
    pass: string;
    company: string;
    phone: string;
  } | null>(null);

  // Portal Access Modal State
  const [portalTarget, setPortalTarget] = useState<PortalAccessTarget | null>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;
    try {
      const dataUrl = await toPng(ticketRef.current, { cacheBust: true, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `maisarah-ticket-${successTicket?.company || 'client'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download ticket', err);
    }
  };

  const handleEmailTicket = () => {
    if (!successTicket) return;
    const subject = isAr ? `بيانات دخول منصة ميسرة - ${successTicket.company}` : `Maisarah Platform Login - ${successTicket.company}`;
    const body = isAr
      ? `مرحباً ${successTicket.company}،\n\nإليك بيانات دخول حسابك:\nالبريد: ${successTicket.email}\nكلمة المرور: ${successTicket.pass}\nالرابط: ${window.location.origin}/login`
      : `Hi ${successTicket.company},\n\nHere are your account credentials:\nEmail: ${successTicket.email}\nPassword: ${successTicket.pass}\nLogin here: ${window.location.origin}/login`;

    window.location.href = `mailto:${successTicket.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Form
  const [formData, setFormData] = useState({
    company_name: '',
    cr_number: '',
    vat_number: '',
    activity: '',
    compliance_status: 'Active',
    email: '',
    password: '',
    phone: '',
    b2b_partner_id: '',
    b2b_partner_name: '',
  });

  const [createInitialTask, setCreateInitialTask] = useState(true);
  const [initialTaskTitle, setInitialTaskTitle] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cr_number') {
      // Oman Commercial Registration (CR) is strictly 7 digits
      const sanitized = value.replace(/\D/g, '').slice(0, 7);
      setFormData(prev => ({ ...prev, [name]: sanitized }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Instant Duplicate CR Check (Debounced 250ms) ───────────────────────────
  useEffect(() => {
    const cr = formData.cr_number?.trim();
    if (!isModalOpen || !cr) {
      setCrValidation({ status: 'idle' });
      return;
    }

    if (cr.length < 7) {
      setCrValidation({
        status: 'idle',
        message: isAr ? `${cr.length}/7 أرقام مطلوبة` : `${cr.length}/7 digits required`
      });
      return;
    }

    if (cr.length === 7) {
      setCrValidation({ status: 'checking' });
      const timer = setTimeout(async () => {
        // Fast local client check
        const localMatch = clients.find(c => c.cr_number === cr && c.id !== editingClient?.id);
        if (localMatch) {
          setCrValidation({
            status: 'duplicate',
            message: isAr ? `مسجل لشركة: ${localMatch.company_name}` : `Registered to: ${localMatch.company_name}`,
            existingClientName: localMatch.company_name
          });
          return;
        }

        // Live Supabase DB check
        try {
          let q = supabase.from('clients').select('id, company_name').eq('cr_number', cr);
          if (editingClient?.id) q = q.neq('id', editingClient.id);
          const { data } = await q.maybeSingle();

          if (data) {
            setCrValidation({
              status: 'duplicate',
              message: isAr ? `مسجل مسبقاً لدى: ${data.company_name}` : `Already registered to: ${data.company_name}`,
              existingClientName: data.company_name
            });
          } else {
            setCrValidation({
              status: 'valid',
              message: isAr ? 'رقم سجل تجاري صحيح ومتاح ✓' : 'Valid & unique 7-digit CR ✓'
            });
          }
        } catch {
          setCrValidation({ status: 'valid' });
        }
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [formData.cr_number, isModalOpen, editingClient?.id, clients, isAr]);

  // ── Instant Duplicate Company Name Check (Debounced 300ms) ──────────────────
  useEffect(() => {
    const name = formData.company_name?.trim();
    if (!isModalOpen || !name || name.length < 3) {
      setNameValidation({ status: 'idle' });
      return;
    }

    const timer = setTimeout(async () => {
      // Fast local match
      const localMatch = clients.find(
        c => c.company_name.trim().toLowerCase() === name.toLowerCase() && c.id !== editingClient?.id
      );
      if (localMatch) {
        setNameValidation({
          status: 'duplicate',
          message: isAr ? 'اسم الشركة مسجل مسبقاً' : 'Company name already registered'
        });
        return;
      }

      // Live Supabase check
      try {
        let q = supabase.from('clients').select('id, company_name').ilike('company_name', name);
        if (editingClient?.id) q = q.neq('id', editingClient.id);
        const { data } = await q.maybeSingle();

        if (data) {
          setNameValidation({
            status: 'duplicate',
            message: isAr ? 'يوجد عميل مسجل بهذا الاسم' : 'Client with this name already exists'
          });
        } else {
          setNameValidation({
            status: 'valid',
            message: isAr ? 'اسم شركة متاح ✓' : 'Unique company name ✓'
          });
        }
      } catch {
        setNameValidation({ status: 'idle' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.company_name, isModalOpen, editingClient?.id, clients, isAr]);


  // ── Fetch B2B Partners & Live Deliverable Jobs ───────────────────────────
  const fetchB2BData = useCallback(async () => {
    try {
      setLoadingB2B(true);
      const [partnersRes, jobsRes] = await Promise.all([
        supabase.from('b2b_partners').select('*').order('name'),
        supabase.from('client_jobs').select('id, client_id, service_type, status, amount, deadline')
      ]);

      if (!partnersRes.error && Array.isArray(partnersRes.data)) {
        setB2bPartners(partnersRes.data);
      }
      if (!jobsRes.error && Array.isArray(jobsRes.data)) {
        setB2bJobs(jobsRes.data);
      }
    } catch (err) {
      console.warn('Error fetching B2B data:', err);
    } finally {
      setLoadingB2B(false);
    }
  }, []);

  useEffect(() => {
    if (canManageB2B) {
      fetchB2BData();
      const pChannel = supabase
        .channel('b2b-partners-realtime-sub')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'b2b_partners' }, () => {
          fetchB2BData();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(pChannel);
      };
    }
  }, [canManageB2B, fetchB2BData]);

  // Aggregate Partner Performance & Deliverables Progress
  const partnerPerformance = useMemo(() => {
    return b2bPartners.map(partner => {
      const referredClients = clients.filter(c =>
        c.b2b_partner_id === partner.id ||
        (c.b2b_partner_name && c.b2b_partner_name.trim().toLowerCase() === partner.name.trim().toLowerCase())
      );
      const clientIds = new Set(referredClients.map(c => c.id));

      const jobs = b2bJobs.filter(j => clientIds.has(j.client_id));
      const completed = jobs.filter(j => j.status === 'completed').length;
      const inProgress = jobs.filter(j => j.status === 'in_progress' || j.status === 'ongoing').length;
      const pending = jobs.filter(j => j.status === 'pending' || j.status === 'under_review').length;
      const totalRevenue = jobs.reduce((sum, j) => sum + (Number(j.amount) || 0), 0);

      return {
        ...partner,
        referredClientsCount: referredClients.length,
        referredClients,
        totalJobs: jobs.length,
        completedJobs: completed,
        inProgressJobs: inProgress,
        pendingJobs: pending,
        totalRevenue
      };
    });
  }, [b2bPartners, clients, b2bJobs]);

  // Save New B2B Partner Handler
  const handleSaveNewPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerForm.name.trim() || isSavingPartner) return;
    setIsSavingPartner(true);
    try {
      const payload = {
        name: newPartnerForm.name.trim(),
        partner_type: newPartnerForm.partner_type || 'sanad',
        contact_person: newPartnerForm.contact_person.trim() || 'General Manager',
        phone: newPartnerForm.phone.trim() || '+968 9000 0000',
        email: newPartnerForm.email.trim() || null,
        location: newPartnerForm.location.trim() || 'Muscat',
        cr_number: newPartnerForm.cr_number.trim() || null,
        notes: newPartnerForm.notes.trim() || null,
      };
      const { data, error } = await supabase.from('b2b_partners').insert([payload]).select().single();
      if (error) throw error;
      if (data) {
        setB2bPartners(prev => [...prev, data]);
        // Also auto-select in client form if registration modal is open
        setFormData(prev => ({ ...prev, b2b_partner_id: data.id, b2b_partner_name: data.name }));
      }
      setIsAddPartnerModalOpen(false);
      setNewPartnerForm({
        name: '',
        partner_type: 'sanad',
        contact_person: '',
        phone: '',
        email: '',
        location: 'Muscat',
        cr_number: '',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'Failed to save B2B Partner');
    } finally {
      setIsSavingPartner(false);
    }
  };

  // ── Fetch clients (Strictly scoped to employee department) ────────────────
  const fetchClients = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [clientsRes, servicesRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, company_name, cr_number, vat_number, activity, compliance_status, email, phone, created_at, assigned_employee_id, portal_access_sent, portal_sent_at, portal_user_id, b2b_partner_id, b2b_partner_name, source')
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('client_id, title, employee_id, department_id')
      ]);

      const allClients = (clientsRes.data as Client[]) || [];

      if (!isManager && user?.id) {
        const clientDsrSet = getDepartmentClientIdsFromDSR(user.id, effectiveDeptId);
        const svcList = (servicesRes.data as any[]) || [];
        const clientServicesMap = new Map<string, Array<{ title: string; employee_id?: string | null; department_id?: string | null }>>();

        for (const s of svcList) {
          if (!s.client_id) continue;
          if (!clientServicesMap.has(s.client_id)) {
            clientServicesMap.set(s.client_id, []);
          }
          clientServicesMap.get(s.client_id)!.push(s);
        }

        const scopedClients = allClients.filter(c =>
          isClientRelevantToDepartment(c, user.id, effectiveDeptId, clientServicesMap, clientDsrSet)
        );

        if (scopedClients.length > 0) {
          setClients(scopedClients);
        } else {
          // If no clients are specifically tagged yet, show unassigned clients
          const unassigned = allClients.filter(c => !c.assigned_employee_id && !clientServicesMap.has(c.id));
          setClients(unassigned.length > 0 ? unassigned : allClients.slice(0, 15));
        }
      } else {
        setClients(allClients);
      }
    } catch (err) {
      console.warn('Error fetching scoped clients:', err);
    } finally {
      setLoading(false);
    }
  }, [isManager, user?.id, effectiveDeptId]);

  useEffect(() => {
    fetchClients();

    // Supabase Realtime Channel for instant team synchronization
    const channel = supabase
      .channel('clients-realtime-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          fetchClients(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  // ── Modals / Form State ───────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingClient(null);
    setRegistrationStep(1);
    setCrValidation({ status: 'idle' });
    setNameValidation({ status: 'idle' });
    setCreatePortalAccount(false);
    setShowPassword(false);
    setFormMsg(null);
    setCreateInitialTask(true);
    setInitialTaskTitle('');
    setFormData({
      company_name: '',
      cr_number: '',
      vat_number: '',
      activity: '',
      compliance_status: 'Active',
      email: '',
      password: '',
      phone: '',
      b2b_partner_id: '',
      b2b_partner_name: ''
    });
    setIsModalOpen(true);
  };

  const openCreateModalWithPartner = (partner: B2BPartner) => {
    openCreateModal();
    setFormData(prev => ({
      ...prev,
      b2b_partner_id: partner.id,
      b2b_partner_name: partner.name
    }));
    setB2bTab('directory');
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setRegistrationStep(1);
    setCrValidation({ status: 'idle' });
    setNameValidation({ status: 'idle' });
    setCreatePortalAccount(false);
    setShowPassword(false);
    setFormMsg(null);
    setFormData({
      company_name: client.company_name,
      cr_number: client.cr_number || '',
      vat_number: client.vat_number || '',
      activity: client.activity || '',
      compliance_status: client.compliance_status,
      email: client.email || '',
      password: '',
      phone: client.phone || '',
      b2b_partner_id: client.b2b_partner_id || '',
      b2b_partner_name: client.b2b_partner_name || '',
    });
    setIsModalOpen(true);
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setRegistrationStep(1);
    setCrValidation({ status: 'idle' });
    setNameValidation({ status: 'idle' });
    setCreatePortalAccount(false);
    setShowPassword(false);
    setFormMsg(null);
    setCreateInitialTask(true);
    setInitialTaskTitle('');
    setFormData({
      company_name: '',
      cr_number: '',
      vat_number: '',
      activity: '',
      compliance_status: 'Active',
      email: '',
      password: '',
      phone: '',
      b2b_partner_id: '',
      b2b_partner_name: ''
    });
  };

  // Step 1 Validation -> Proceed to Step 2
  const handleProceedToStep2 = () => {
    setFormMsg(null);
    const trimmedName = formData.company_name?.trim();
    if (!trimmedName) {
      setFormMsg({ type: 'err', text: isAr ? 'يرجى إدخال اسم العميل أو اسم الشركة' : 'Company or client name is required' });
      return;
    }
    const trimmedCR = formData.cr_number?.trim();
    if (!trimmedCR || trimmedCR.length !== 7) {
      setFormMsg({
        type: 'err',
        text: isAr ? 'رقم السجل التجاري (CR) إلزامي ويجب أن يتكون من 7 أرقام' : 'CR Number is required and must be strictly 7 digits'
      });
      return;
    }
    if (crValidation.status === 'duplicate') {
      setFormMsg({
        type: 'err',
        text: isAr ? `رقم السجل التجاري مسجل مسبقاً (${crValidation.existingClientName || ''})` : `CR Number is already registered (${crValidation.existingClientName || ''})`
      });
      return;
    }
    if (!formData.phone?.trim()) {
      setFormMsg({
        type: 'err',
        text: isAr ? 'يرجى إدخال رقم هاتف أو واتساب العميل' : 'Contact phone or WhatsApp is required'
      });
      return;
    }
    if (!formData.activity?.trim()) {
      setFormMsg({
        type: 'err',
        text: isAr ? 'يرجى تحديد النشاط التجاري للعميل' : 'Primary business activity is required'
      });
      return;
    }

    setRegistrationStep(2);
  };

  // ── Submit (Add / Edit) ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormMsg(null);

    const trimmedName = formData.company_name?.trim();
    if (!trimmedName) {
      setFormMsg({ type: 'err', text: isAr ? 'يرجى إدخال اسم العميل أو اسم الشركة' : 'Company or client name is required' });
      setRegistrationStep(1);
      return;
    }

    const trimmedCR = formData.cr_number?.trim();
    if (!trimmedCR || trimmedCR.length !== 7) {
      setFormMsg({
        type: 'err',
        text: isAr ? 'رقم السجل التجاري (CR) إلزامي ويجب أن يتكون من 7 أرقام' : 'CR Number is required and must be strictly 7 digits'
      });
      setRegistrationStep(1);
      return;
    }

    if (crValidation.status === 'duplicate') {
      setFormMsg({
        type: 'err',
        text: isAr ? `رقم السجل التجاري مسجل مسبقاً (${crValidation.existingClientName || ''})` : `CR Number is already registered (${crValidation.existingClientName || ''})`
      });
      setRegistrationStep(1);
      return;
    }

    if (!formData.phone?.trim()) {
      setFormMsg({
        type: 'err',
        text: isAr ? 'يرجى إدخال رقم هاتف أو واتساب العميل' : 'Contact phone or WhatsApp is required'
      });
      setRegistrationStep(1);
      return;
    }

    if (!formData.activity?.trim()) {
      setFormMsg({
        type: 'err',
        text: isAr ? 'يرجى تحديد النشاط التجاري للعميل' : 'Primary business activity is required'
      });
      setRegistrationStep(1);
      return;
    }

    setIsSubmitting(true);
    let createdTicket = null;

    try {
      if (editingClient) {
        const payload: any = {
          company_name: formData.company_name.trim(),
          cr_number: formData.cr_number?.trim() || null,
          vat_number: formData.vat_number?.trim() || null,
          activity: formData.activity?.trim() || null,
          compliance_status: formData.compliance_status || 'Active',
          email: formData.email?.trim() || null,
          phone: formData.phone?.trim() || null,
          b2b_partner_id: formData.b2b_partner_id || null,
          b2b_partner_name: formData.b2b_partner_name || null,
          source: formData.b2b_partner_id ? 'b2b' : 'direct',
        };
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        setFormMsg({ type: 'ok', text: isAr ? 'تم تحديث بيانات العميل بنجاح' : 'Client updated successfully' });
        setTimeout(() => closeFormModal(), 800);
      } else {
        let finalClientId: string;
        let portalCreated = false;

        // Only create portal login account if employee explicitly checked the portal option AND provided valid credentials
        if (createPortalAccount && formData.email?.trim() && formData.password?.trim() && formData.password.trim().length >= 6) {
          const clientEmail = formData.email.trim();
          if (user?.email && clientEmail.toLowerCase() === user.email.toLowerCase()) {
            throw new Error(isAr ? 'لا يمكن استخدام البريد الإلكتروني للموظف كحساب دخول للعميل' : 'Cannot use employee staff email as client portal login email');
          }

          const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { persistSession: false } }
          );

          const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: clientEmail,
            password: formData.password.trim(),
            options: { data: { role: 'client', company_name: formData.company_name.trim() } }
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('Failed to create login account');

          finalClientId = authData.user.id;
          portalCreated = true;

          try {
            await tempClient.from('profiles').insert({
              id: finalClientId,
              role: 'client',
              email: clientEmail
            });
          } catch (e) {
            // Profile exists or trigger handled it
          }

          createdTicket = {
            email: clientEmail,
            pass: formData.password.trim(),
            company: formData.company_name.trim(),
            phone: formData.phone?.trim() || '',
          };
        } else {
          // Direct client registration without instant portal auth account
          finalClientId = generateUUID();
        }

        const payload: any = {
          id: finalClientId,
          company_name: formData.company_name.trim(),
          cr_number: formData.cr_number?.trim() || null,
          vat_number: formData.vat_number?.trim() || null,
          activity: formData.activity?.trim() || null,
          compliance_status: formData.compliance_status || 'Active',
          email: formData.email?.trim() || null,
          phone: formData.phone?.trim() || null,
          assigned_employee_id: user?.id || null, // Capture the employee who registered the client
          portal_access_sent: portalCreated,
          portal_sent_at: portalCreated ? new Date().toISOString() : null,
          portal_user_id: portalCreated ? finalClientId : null,
          b2b_partner_id: formData.b2b_partner_id || null,
          b2b_partner_name: formData.b2b_partner_name || null,
          source: formData.b2b_partner_id ? 'b2b' : 'direct',
        };

        let { data: insertedClient, error: clientError } = await supabase
          .from('clients')
          .insert([payload])
          .select()
          .maybeSingle();

        // If assigned_employee_id failed FK constraint, retry safely without it
        if (clientError && (clientError.message?.includes('foreign key') || (clientError as any).code === '23503')) {
          console.warn('Retrying client insert without assigned_employee_id FK');
          delete payload.assigned_employee_id;
          const retry = await supabase.from('clients').insert([payload]).select().maybeSingle();
          clientError = retry.error;
          insertedClient = retry.data;
        }

        if (clientError) throw clientError;

        const finalId = insertedClient?.id || finalClientId;

        // Optionally create initial deliverable task in services table
        if (createInitialTask) {
          const taskName = initialTaskTitle.trim() || `${currentDeptConfig?.name || 'Operational'} Engagement`;
          try {
            const svcPayload: any = {
              client_id: finalId,
              department_id: effectiveDeptId || 'audit',
              title: taskName,
              description: `Deliverable initiated upon client registration by ${user?.user_metadata?.full_name || 'Staff Member'}`,
              status: 'ongoing',
              priority: 'Medium',
              due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
              is_approved: true
            };
            if (user?.id) svcPayload.employee_id = user.id;

            const { error: svcErr } = await supabase.from('services').insert([svcPayload]);
            if (svcErr && (svcErr.message?.includes('foreign key') || (svcErr as any).code === '23503')) {
              delete svcPayload.employee_id;
              await supabase.from('services').insert([svcPayload]);
            }
          } catch (svcErr) {
            console.warn('Initial deliverable service notice:', svcErr);
          }

          // Also register initial task in DSR so it appears in the employee's DSR workspace
          try {
            const cleanEmpName = user?.user_metadata?.full_name ||
              (user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '') ||
              'Ajan';

            autoCreateDSREntryFromTask({
              serviceTitle: taskName,
              companyName: formData.company_name.trim(),
              crNumber: formData.cr_number?.trim() || '',
              clientId: finalId,
              employeeName: cleanEmpName,
              employeeId: user?.id,
              departmentId: effectiveDeptId || 'audit',
              amount: 0,
              date: new Date().toISOString().split('T')[0]
            });
          } catch (dsrErr) {
            console.warn('Auto DSR entry notice:', dsrErr);
          }
        }

        // Log the activity
        try {
          await logActivity(
            user?.id || '',
            user?.user_metadata?.full_name || user?.email || 'Employee',
            'client_created',
            `Registered a new client: ${formData.company_name.trim()}`,
            `تم تسجيل عميل جديد: ${formData.company_name.trim()}`
          );
        } catch (logErr) {
          console.warn('Activity log notice:', logErr);
        }

        // Optimistically add client to local list immediately
        const newRecord: Client = {
          id: finalId,
          company_name: formData.company_name.trim(),
          cr_number: formData.cr_number?.trim() || null,
          vat_number: formData.vat_number?.trim() || null,
          activity: formData.activity?.trim() || null,
          compliance_status: formData.compliance_status || 'Active',
          email: formData.email?.trim() || null,
          phone: formData.phone?.trim() || null,
          assigned_employee_id: user?.id,
          created_at: new Date().toISOString(),
          portal_access_sent: portalCreated,
          portal_sent_at: portalCreated ? new Date().toISOString() : null,
          portal_user_id: portalCreated ? finalId : null,
        };
        setClients(prev => [newRecord, ...prev.filter(c => c.id !== finalId)]);

        // Refresh cloud list in background
        fetchClients().catch(console.warn);

        setFormMsg({
          type: 'ok',
          text: isAr ? 'تم تسجيل العميل وتعيينه لقسمك بنجاح' : 'Client registered and assigned to your department successfully'
        });

        if (createdTicket) {
          setSuccessTicket(createdTicket);
          setIsModalOpen(false);
        } else {
          setTimeout(() => closeFormModal(), 400);
        }
      }
    } catch (err: any) {
      console.error('Client registration failed:', err);
      setFormMsg({ type: 'err', text: err.message || (isAr ? 'تعذر إتمام تسجيل العميل' : 'Failed to register client') });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!clientToDelete) return;
    setIsSubmitting(true);
    try {
      // 1. If confirmed by user, remove all associated DSR entries from local storage, memory, and database
      if (deleteClientDSRAlso) {
        await deleteDSRsByClientId(clientToDelete.id, clientToDelete.company_name);
      }

      // 2. Archive client in database
      const { error } = await supabase
        .from('clients')
        .update({ is_archived: true })
        .eq('id', clientToDelete.id);

      if (error) throw error;

      setClients(clients.filter(c => c.id !== clientToDelete.id));
      setClientToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Archive failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = clients.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cr_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.activity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.b2b_partner_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPartner = !selectedPartnerFilter ||
      c.b2b_partner_id === selectedPartnerFilter ||
      (c.b2b_partner_name && c.b2b_partner_name.toLowerCase() === selectedPartnerFilter.toLowerCase());

    return matchesSearch && matchesPartner;
  });

  // ── Drill-down view ───────────────────────────────────────────────────────
  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        isAr={isAr}
        t={t}
        effectiveDeptId={effectiveDeptId}
        isManager={isManager}
      />
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Building2 size={24} className="text-brand-dark" />
              {t('employee.clientManager')}
            </h2>
            {!isManager && currentDeptConfig && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-dark/10 text-brand-dark font-bold text-xs rounded-full border border-brand-dark/20">
                <span className="w-2 h-2 rounded-full bg-brand-dark animate-pulse"></span>
                {isAr ? currentDeptConfig.name_ar : currentDeptConfig.name}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isAr
              ? !isManager
                ? `${clients.length} عميل متاح لقسم ${currentDeptConfig?.name_ar || ''}`
                : `${clients.length} عميل مسجّل`
              : !isManager
                ? `${clients.length} clients in ${currentDeptConfig?.name || 'Department'}`
                : `${clients.length} registered clients`}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-xl
            hover:bg-red-800 transition-colors text-sm font-bold shadow-sm shadow-brand-dark/20 cursor-pointer"
        >
          <Plus size={18} />
          {t('employee.registerNewClient')}
        </button>
      </div>

      {/* Primary Mode Tabs (Clients Directory vs B2B Partner Network) */}
      {canManageB2B && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => {
              setB2bTab('directory');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${b2bTab === 'directory'
                ? 'bg-brand-dark text-white shadow-sm shadow-brand-dark/20'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            <Building2 size={15} />
            <span>{isAr ? 'دليل العملاء' : 'Clients Directory'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${b2bTab === 'directory' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {clients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setB2bTab('b2b_network')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${b2bTab === 'b2b_network'
                ? 'bg-indigo-700 text-white shadow-sm shadow-indigo-700/20'
                : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
              }`}
          >
            <Users size={15} />
            <span>{isAr ? 'شبكة شركاء B2B ومتابعة الأعمال' : 'B2B Partner Network & Works'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${b2bTab === 'b2b_network' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
              {b2bPartners.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddPartnerModalOpen(true)}
            className="ms-auto px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>{isAr ? '+ إضافة شركة B2B جديدة' : '+ Add B2B Company'}</span>
          </button>
        </div>
      )}

      {/* Selected Partner Active Filter Banner */}
      {selectedPartnerFilter && b2bTab === 'directory' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
            <span>🏢</span>
            <span>{isAr ? `تصفية العملاء المحالين من الشريك: ${b2bPartners.find(p => p.id === selectedPartnerFilter)?.name || selectedPartnerFilter}` : `Filtering clients referred by: ${b2bPartners.find(p => p.id === selectedPartnerFilter)?.name || selectedPartnerFilter}`}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPartnerFilter(null)}
            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
          >
            {isAr ? 'عرض جميع العملاء (إلغاء التصفية)' : 'Show All Clients (Clear Filter)'}
          </button>
        </div>
      )}

      {/* Conditional View: B2B Network vs Directory Card */}
      {canManageB2B && b2bTab === 'b2b_network' ? (
        <div className="space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                🏢
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                  {isAr ? 'شركاء الأعمال المسجلين' : 'Registered B2B Partners'}
                </p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{b2bPartners.length}</p>
                <p className="text-[11px] text-indigo-600 font-semibold">{isAr ? 'مكاتب سند وشركات محاماة' : 'Sanad & Corporate Hubs'}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                👥
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                  {isAr ? 'العملاء المحالين' : 'Total Referred Clients'}
                </p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">
                  {clients.filter(c => c.b2b_partner_id || c.b2b_partner_name).length}
                </p>
                <p className="text-[11px] text-blue-600 font-semibold">{isAr ? 'من شبكة الشركاء' : 'Via Partner Network'}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                ⚡
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                  {isAr ? 'إجمالي الأعمال والمهام' : 'Total Assigned Works'}
                </p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{b2bJobs.length}</p>
                <p className="text-[11px] text-amber-600 font-semibold">
                  {b2bJobs.filter(j => j.status === 'in_progress' || j.status === 'ongoing').length} {isAr ? 'قيد الإنجاز حالياً' : 'In Progress'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                  {isAr ? 'نسبة الإنجاز والتسليم' : 'Completion Rate'}
                </p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">
                  {b2bJobs.length > 0
                    ? Math.round((b2bJobs.filter(j => j.status === 'completed').length / b2bJobs.length) * 100)
                    : 100}%
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  {b2bJobs.filter(j => j.status === 'completed').length} {isAr ? 'مهمة منجزة' : 'Jobs Completed'}
                </p>
              </div>
            </div>
          </div>

          {/* Partners Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" />
                  <span>{isAr ? 'سجل شركاء الأعمال ومتابعة الأعمال والعملاء' : 'B2B Partners Directory & Works Progress'}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isAr
                    ? 'تابع حجم الأعمال المستلمة من كل شريك وحالة إنجازها وجودة تقديم الخدمة لعملائهم'
                    : 'Track the volume of works received from each partner, delivery progress, and referred client health.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartnerModalOpen(true)}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-indigo-700/20"
              >
                <Plus size={15} />
                <span>{isAr ? 'إضافة شركة / مكتب جديد' : 'Add Partner Company'}</span>
              </button>
            </div>

            {loadingB2B ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : b2bPartners.length === 0 ? (
              <div className="text-center py-16 text-gray-400 space-y-3">
                <Building2 size={40} className="mx-auto opacity-30 text-indigo-400" />
                <p className="text-sm font-semibold text-gray-600">
                  {isAr ? 'لم يتم تسجيل شركات أو مكاتب B2B بعد' : 'No B2B Partners registered yet'}
                </p>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {isAr
                    ? 'أضف أول مكتب سند أو شركة محاماة لبدء تسجيل العملاء المحالين وتتبع تقدم أعمالهم.'
                    : 'Register your first Sanad center or corporate partner to start tracking referred clients and works.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddPartnerModalOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-indigo-700 text-white rounded-xl text-xs font-bold hover:bg-indigo-800 transition cursor-pointer"
                >
                  {isAr ? 'إضافة أول شريك الآن' : 'Add First Partner'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {partnerPerformance.map(partner => (
                  <div
                    key={partner.id}
                    className="p-5 rounded-2xl border border-gray-200/90 hover:border-indigo-300 hover:shadow-md transition-all bg-gradient-to-b from-white to-gray-50/40 flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm flex-shrink-0">
                            {partner.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-gray-900 line-clamp-1">{partner.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {partner.partner_type === 'sanad' ? (isAr ? 'مكتب سند' : 'Sanad Center') :
                                  partner.partner_type === 'law_firm' ? (isAr ? 'مكتب محاماة' : 'Law Firm') :
                                    partner.partner_type === 'pro' ? (isAr ? 'تخليص معاملات' : 'PRO Office') :
                                      (partner.partner_type || 'B2B Partner')}
                              </span>
                              {partner.location && (
                                <span className="text-[10px] text-gray-400 font-medium">{partner.location}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-150 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-medium">{isAr ? 'المسؤول:' : 'Contact:'}</span>
                          <span className="font-bold text-gray-800">{partner.contact_person || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-medium">{isAr ? 'الهاتف:' : 'Phone:'}</span>
                          <span className="font-bold text-gray-800 font-mono" dir="ltr">{partner.phone || '—'}</span>
                        </div>
                      </div>

                      {/* Work & Task Health Indicator */}
                      <div className="space-y-2 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/70">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-gray-700 flex items-center gap-1">
                            <Briefcase size={13} className="text-indigo-600" />
                            {isAr ? 'تقدم الأعمال والمهام:' : 'Works Progress:'}
                          </span>
                          <span className="text-indigo-900 font-mono">{partner.totalJobs} {isAr ? 'مهمة' : 'Jobs'}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${partner.totalJobs > 0 ? (partner.completedJobs / partner.totalJobs) * 100 : 0}%` }}
                            title={`${partner.completedJobs} Completed`}
                          />
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{ width: `${partner.totalJobs > 0 ? (partner.inProgressJobs / partner.totalJobs) * 100 : 0}%` }}
                            title={`${partner.inProgressJobs} In Progress`}
                          />
                          <div
                            className="bg-amber-400 h-full transition-all"
                            style={{ width: `${partner.totalJobs > 0 ? (partner.pendingJobs / partner.totalJobs) * 100 : 0}%` }}
                            title={`${partner.pendingJobs} Pending`}
                          />
                        </div>

                        {/* Pill Breakdown */}
                        <div className="flex items-center justify-between text-[10px] font-bold pt-1">
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            ✓ {partner.completedJobs} {isAr ? 'مكتمل' : 'Done'}
                          </span>
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            ⏳ {partner.inProgressJobs} {isAr ? 'قيد التنفيذ' : 'Active'}
                          </span>
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            ⚠️ {partner.pendingJobs} {isAr ? 'معلق' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-gray-150 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPartnerFilter(partner.id);
                          setB2bTab('directory');
                        }}
                        className="flex-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Users size={13} />
                        <span>{partner.referredClientsCount} {isAr ? 'عملاء' : 'Clients'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openCreateModalWithPartner(partner)}
                        className="py-2 px-3 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                        title={isAr ? 'تسجيل عميل جديد من هذا الشريك' : 'Register client from this partner'}
                      >
                        <Plus size={14} />
                        <span>{isAr ? 'تسجيل عميل' : 'New Client'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Directory Card */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder={t('employee.searchClients')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full ps-9 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none
                focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-gray-50 transition"
              />
            </div>
            {searchTerm && (
              <span className="text-xs text-gray-500 font-medium">
                {filtered.length} {isAr ? 'نتيجة' : 'result(s)'}
              </span>
            )}
          </div>

          {/* Table — Desktop */}
          {loading ? (
            <div className="flex justify-center p-14">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-start">{t('employee.companyName')}</th>
                      <th className="px-5 py-3 text-start">{t('employee.crNumber')}</th>
                      <th className="px-5 py-3 text-start">{t('employee.vatNumber')}</th>
                      <th className="px-5 py-3 text-start">{t('employee.activity')}</th>
                      <th className="px-5 py-3 text-start">{t('employee.status')}</th>
                      <th className="px-5 py-3 text-start">{isAr ? 'بوابة العميل' : 'Portal Access'}</th>
                      <th className="px-5 py-3 text-start"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400">
                          <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">{t('employee.noClientsFound')}</p>
                        </td>
                      </tr>
                    ) : filtered.map(client => (
                      <tr key={client.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {client.company_name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800">{client.company_name}</span>
                              {client.b2b_partner_name && (
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded-md w-fit">
                                  <span>🏢</span>
                                  <span>{client.b2b_partner_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-500">
                          <span className="flex items-center gap-1"><Hash size={12} />{client.cr_number || '—'}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-500">
                          <span className="flex items-center gap-1"><Percent size={12} />{client.vat_number || '—'}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 max-w-[140px] truncate">{client.activity || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${COMPLIANCE_STYLES[client.compliance_status] || 'bg-gray-100 text-gray-600'}`}>
                            {client.compliance_status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {client.portal_access_sent || client.email ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                {isAr ? 'مفعل' : 'Active'}
                              </span>
                              <button
                                onClick={() => {
                                  setPortalTarget({
                                    id: client.id,
                                    type: 'client',
                                    name: client.company_name,
                                    companyName: client.company_name,
                                    email: client.email || '',
                                    phone: client.phone,
                                    portalAccessSent: true
                                  });
                                  setIsPortalModalOpen(true);
                                }}
                                title={isAr ? 'عرض أو إعادة إرسال بيانات الدخول' : 'View or Resend Portal Credentials'}
                                className="p-1 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <RefreshCw size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setPortalTarget({
                                  id: client.id,
                                  type: 'client',
                                  name: client.company_name,
                                  companyName: client.company_name,
                                  email: client.email || '',
                                  phone: client.phone,
                                  portalAccessSent: false
                                });
                                setIsPortalModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                            >
                              <KeyRound size={11} className="text-amber-600" />
                              <span>{isAr ? 'إرسال الدخول' : 'Send Access'}</span>
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedClient(client); }}
                              title={isAr ? 'عرض الخدمات والفواتير' : 'View Services & Invoices'}
                              className="p-2 text-gray-400 hover:text-brand-dark hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => { setSelectedClient(client); }}
                              title={isAr ? 'الملف الشخصي' : 'Client Profile'}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                            >
                              <UserCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => openEditModal(client)}
                              title={isAr ? 'تعديل' : 'Edit'}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setClientToDelete(client)}
                              title={isAr ? 'حذف' : 'Delete'}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-gray-50">
                {filtered.map(client => (
                  <div
                    key={client.id}
                    className="w-full p-4 hover:bg-gray-50/50 transition-colors text-start flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center font-bold flex-shrink-0">
                        {client.company_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-800 truncate">{client.company_name}</p>
                        <p className="text-xs text-gray-400">{client.cr_number || '—'}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${COMPLIANCE_STYLES[client.compliance_status] || 'bg-gray-100 text-gray-600'}`}>
                            {client.compliance_status}
                          </span>
                          {client.b2b_partner_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-150">
                              🏢 {client.b2b_partner_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Portal Access Status */}
                    <div className="flex items-center justify-between text-xs px-1 bg-gray-50/70 p-2 rounded-xl">
                      <span className="text-gray-500 font-semibold text-[11px]">{isAr ? 'بوابة العميل:' : 'Client Portal:'}</span>
                      {client.portal_access_sent || client.email ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            {isAr ? 'مفعل' : 'Active'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPortalTarget({
                                id: client.id,
                                type: 'client',
                                name: client.company_name,
                                companyName: client.company_name,
                                email: client.email || '',
                                phone: client.phone,
                                portalAccessSent: true
                              });
                              setIsPortalModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPortalTarget({
                              id: client.id,
                              type: 'client',
                              name: client.company_name,
                              companyName: client.company_name,
                              email: client.email || '',
                              phone: client.phone,
                              portalAccessSent: false
                            });
                            setIsPortalModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <KeyRound size={11} className="text-amber-600" />
                          <span>{isAr ? 'إرسال الدخول' : 'Send Access'}</span>
                        </button>
                      )}
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-3 mt-1">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-brand-dark rounded-xl transition-colors shadow-sm"
                      >
                        <Eye size={14} /> {isAr ? 'عرض' : 'View'}
                      </button>
                      <button
                        onClick={() => openEditModal(client)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors shadow-sm"
                      >
                        <Edit size={14} /> {isAr ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => setClientToDelete(client)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors shadow-sm"
                      >
                        <Trash2 size={14} /> {isAr ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Form Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white z-20">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                {editingClient ? <Edit size={20} className="text-brand-dark" /> : <Plus size={20} className="text-brand-dark" />}
                {editingClient ? (isAr ? 'تعديل بيانات العميل' : 'Edit Client') : t('employee.registerNewClient')}
              </h3>
              <button
                onClick={closeFormModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Wizard Progress Bar */}
            <div className="flex items-center justify-between border-b border-gray-150 px-6 py-3 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRegistrationStep(1)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${registrationStep === 1
                      ? 'bg-brand-dark text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${registrationStep === 1 ? 'bg-white/20' : 'bg-gray-100 text-gray-700'}`}>1</span>
                  <span>{isAr ? 'البيانات الأساسية (إلزامي)' : 'Step 1: Mandatory Info'}</span>
                </button>
                <ChevronRight size={14} className="text-gray-300 rtl:rotate-180" />
                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${registrationStep === 2
                      ? 'bg-brand-dark text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${registrationStep === 2 ? 'bg-white/20' : 'bg-gray-100 text-gray-700'}`}>2</span>
                  <span>{isAr ? 'الإعدادات والمهام (اختياري)' : 'Step 2: Optional Setup'}</span>
                </button>
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                {registrationStep === 1
                  ? (isAr ? 'الخطوة ١ من ٢' : 'Step 1 of 2')
                  : (isAr ? 'الخطوة ٢ من ٢' : 'Step 2 of 2')}
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {formMsg && (
                <div className={`p-3 text-sm rounded-xl flex items-center gap-2 border ${formMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {formMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span className="font-semibold text-xs">{formMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                {/* STEP 1: Mandatory Information */}
                {registrationStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <FormField
                      label={t('employee.companyName')}
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      required
                      autoComplete="off"
                      placeholder={isAr ? 'شركة الموالح للإنشاء' : 'Al Mawaleh Construction LLC'}
                      status={nameValidation.status}
                      statusMessage={nameValidation.message}
                    />

                    <FormField
                      label={isAr ? 'رقم السجل التجاري (7 أرقام بالضبط)' : 'CR Number (Strictly 7 digits)'}
                      name="cr_number"
                      value={formData.cr_number}
                      onChange={handleInputChange}
                      required
                      placeholder="1234567"
                      maxLength={7}
                      inputMode="numeric"
                      isMono={true}
                      hint={formData.cr_number ? `${formData.cr_number.length}/7` : '7 digits required'}
                      status={crValidation.status}
                      statusMessage={crValidation.message}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label={isAr ? 'رقم الهاتف / الواتساب' : 'Contact Phone / WhatsApp'}
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+968 9000 0000"
                        hint={isAr ? 'للتواصل السريع' : 'Primary contact'}
                      />

                      <FormField
                        label={t('employee.activity')}
                        name="activity"
                        required
                        value={formData.activity}
                        onChange={handleInputChange}
                        placeholder={isAr ? 'الإنشاء والمقاولات' : 'Construction & Contracting'}
                        hint={isAr ? 'نشاط السجل' : 'Business sector'}
                      />
                    </div>

                    {/* B2B Partner Referral Selector (Authorized Staff & Managers) */}
                    {canManageB2B && (
                      <div className="bg-gradient-to-r from-indigo-50/60 to-blue-50/60 p-3.5 rounded-2xl border border-indigo-150 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                            <Building2 size={14} className="text-indigo-600" />
                            <span>{isAr ? 'جهة الإحالة / شريك الأعمال (B2B Partner)' : 'Referral Source / B2B Partner'}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAddPartnerModalOpen(true)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          >
                            <Plus size={12} />
                            <span>{isAr ? '+ إضافة شريك جديد' : '+ New Partner'}</span>
                          </button>
                        </div>
                        <select
                          value={formData.b2b_partner_id}
                          onChange={e => {
                            const selectedId = e.target.value;
                            const found = b2bPartners.find(p => p.id === selectedId);
                            setFormData(prev => ({
                              ...prev,
                              b2b_partner_id: selectedId,
                              b2b_partner_name: found ? found.name : ''
                            }));
                          }}
                          className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="">{isAr ? 'عميل مباشر (بدون وسيط أو شريك إحالة)' : 'Direct Client (No B2B Partner)'}</option>
                          {b2bPartners.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — ({p.partner_type === 'sanad' ? (isAr ? 'مكتب سند' : 'Sanad Center') : (p.partner_type || 'B2B Partner')})
                            </option>
                          ))}
                        </select>
                        {formData.b2b_partner_name && (
                          <p className="text-[11px] text-indigo-700 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            {isAr ? `سيتم ربط العميل وسجل أعماله مع الشريك: ${formData.b2b_partner_name}` : `Client & jobs will be attributed to: ${formData.b2b_partner_name}`}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-150 flex items-center justify-between gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || crValidation.status === 'duplicate'}
                        className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        <span>{editingClient ? (isAr ? 'حفظ التعديلات مباشرة' : 'Save Changes Directly') : (isAr ? 'تسجيل مباشر (البيانات الإلزامية فقط)' : 'Register Directly (Step 1 Only)')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleProceedToStep2}
                        className="py-3 px-6 bg-brand-dark hover:bg-red-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer ms-auto"
                      >
                        <span>{isAr ? 'متابعة إلى الخطوة ٢ (اختياري)' : 'Continue to Step 2 (Optional)'}</span>
                        <ArrowRight size={15} className="rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Optional Setup & Deliverables */}
                {registrationStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label={t('employee.vatNumber')}
                        name="vat_number"
                        value={formData.vat_number}
                        onChange={handleInputChange}
                        placeholder="OM123456789"
                        hint={isAr ? 'الرقم الضريبي (اختياري)' : 'Tax ID (Optional)'}
                      />

                      <FormField
                        label={isAr ? 'البريد الإلكتروني للعميل' : 'Client Email'}
                        name="email"
                        type="email"
                        autoComplete="off"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required={false}
                        placeholder="info@company.com"
                        hint={isAr ? 'للفواتير والمراسلات' : 'For billing & reports'}
                      />
                    </div>

                    {/* Compliance Status */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          {isAr ? 'حالة الامتثال القانوني والضريبي' : 'Compliance Status'}
                        </label>
                        <span className="text-[11px] text-gray-400">
                          {isAr ? 'الوضع النظامي للعميل' : 'Regulatory Standing'}
                        </span>
                      </div>
                      <select
                        value={formData.compliance_status}
                        onChange={e => setFormData({ ...formData, compliance_status: e.target.value })}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-white transition font-medium"
                      >
                        <option value="Active">{isAr ? 'نشط (Active) - مستوفٍ للشروط والوثائق' : 'Active (Fully Compliant)'}</option>
                        <option value="Pending">{isAr ? 'قيد المراجعة (Pending) - متطلبات أو تجديد معلق' : 'Pending (Under Review / Renewal Required)'}</option>
                        <option value="Suspended">{isAr ? 'موقوف (Suspended) - غير ممتثل أو مجمد' : 'Suspended (Non-compliant / Frozen)'}</option>
                      </select>
                    </div>

                    {/* Client Portal Account Access */}
                    {!editingClient && (
                      <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={createPortalAccount}
                            onChange={e => {
                              setCreatePortalAccount(e.target.checked);
                              if (!e.target.checked) {
                                setFormData(prev => ({ ...prev, password: '' }));
                              }
                            }}
                            className="mt-0.5 w-4 h-4 rounded text-brand-dark focus:ring-brand-dark/20 border-gray-300 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-black text-gray-800">
                              {isAr ? 'تفعيل حساب دخول لبوابة العملاء' : 'Enable Client Portal Login Account'}
                            </p>
                            <p className="text-[11px] text-gray-500 font-medium">
                              {isAr ? 'اتركه معطلاً لتسجيل عميل مباشر/أوفلاين بدون حساب دخول الآن. يمكن إرسال بيانات الدخول لاحقاً بضغطة زر.' : 'Leave unchecked for offline/direct clients. You can issue access credentials anytime later.'}
                            </p>
                          </div>
                        </label>

                        {createPortalAccount && (
                          <div className="pt-2 border-t border-gray-200/70 space-y-3">
                            <div className="relative">
                              <FormField
                                label={isAr ? 'كلمة المرور لحساب البوابة (6 خانات على الأقل)' : 'Portal Password (Min 6 chars)'}
                                name="portal_secret_password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required={createPortalAccount}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder={isAr ? 'أدخل كلمة مرور قوية للعميل...' : 'Enter client portal password...'}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute ${isAr ? 'left-3' : 'right-3'} top-9 text-gray-400 hover:text-brand-dark transition-colors cursor-pointer`}
                              >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Direct Deliverable Assignment */}
                    {!editingClient && (
                      <div className="p-4 bg-red-50/60 rounded-xl border border-red-100 space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createInitialTask}
                            onChange={e => setCreateInitialTask(e.target.checked)}
                            className="rounded text-brand-dark focus:ring-brand-dark h-4 w-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-gray-800">
                            {isAr ? 'تعيين مهمة عمل أولى للعميل في قسمك فوراً' : 'Assign initial service deliverable immediately in your department'}
                          </span>
                        </label>
                        {createInitialTask && (
                          <div className="pt-1.5 space-y-1">
                            <input
                              type="text"
                              value={initialTaskTitle}
                              onChange={e => setInitialTaskTitle(e.target.value)}
                              placeholder={isAr ? `مثال: ${currentDeptConfig?.name_ar || 'التدقيق والامتثال'} 2026` : `e.g. ${currentDeptConfig?.name || 'Audit & Compliance'} Deliverable`}
                              className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:border-brand-dark outline-none font-medium"
                            />
                            <p className="text-[10px] text-gray-500">
                              {isAr
                                ? 'سيتم إدراج المهمة تلقائياً في جدول خدماتك وسجل DSR لربط التحصيل والفوترة.'
                                : 'This deliverable will be linked automatically to your services and DSR register for payment & billing.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-150 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setRegistrationStep(1)}
                        className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft size={15} className="rtl:rotate-180" />
                        <span>{isAr ? 'الرجوع إلى الخطوة ١' : 'Back to Step 1'}</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting || crValidation.status === 'duplicate'}
                        className="py-3 px-6 bg-brand-dark hover:bg-red-800 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer ms-auto"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            {editingClient ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                            <span>{editingClient ? (isAr ? 'حفظ كافة التعديلات' : 'Save All Changes') : (isAr ? 'إتمام تسجيل العميل' : 'Complete Registration')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-red-100">
              <Trash2 size={32} />
            </div>
            <h3 className="font-black text-xl text-gray-800 uppercase tracking-wide">
              {isAr ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </h3>
            <p className="text-gray-500 text-sm font-medium">
              {isAr ? `هل أنت متأكد من حذف العميل "${clientToDelete.company_name}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete "${clientToDelete.company_name}"? This action cannot be undone.`}
            </p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm flex items-center justify-center shadow-sm shadow-red-600/30"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isAr ? 'تأكيد الحذف' : 'Delete Client')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Ticket Modal */}
      {successTicket && (
        <div className="fixed inset-0 bg-brand-dark/20 backdrop-blur-md z-[100] flex justify-center items-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-brand-dark/10 animate-in fade-in zoom-in duration-300">
            {/* The Part to Download */}
            <div ref={ticketRef} className="bg-white">
              <div className="bg-brand-dark p-8 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/20 rounded-full -ml-16 -mb-16 blur-2xl" />

                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
                  <CheckCircle2 size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-black tracking-tight mb-1">{isAr ? 'تم التسجيل بنجاح!' : 'Registration Success!'}</h3>
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest">{successTicket.company}</p>
              </div>

              <div className="p-8 space-y-5">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</p>
                  <p className="font-bold text-gray-800 text-sm">{successTicket.email}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'كلمة المرور' : 'Password'}</p>
                  <p className="font-bold text-gray-800 tracking-wider text-sm">{successTicket.pass}</p>
                  <p className="text-[9px] text-brand-dark/60 font-bold mt-1 uppercase tracking-tighter">
                    {isAr ? 'بيانات دخول منصة ميسرة' : 'Maisarah Platform Credentials'}
                  </p>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                    {window.location.origin.replace('http://', '').replace('https://', '')}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons (Not Downloaded) */}
            <div className="px-8 pb-8 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadTicket}
                  className="py-3 bg-gray-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 text-[10px]"
                >
                  <Download size={14} />
                  {isAr ? 'تحميل الصورة' : 'Download Image'}
                </button>
                <button
                  onClick={handleEmailTicket}
                  className="py-3 bg-brand-dark text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-800 transition-all flex items-center justify-center gap-2 text-[10px]"
                >
                  <Mail size={14} />
                  {isAr ? 'إرسال إيميل' : 'Send Email'}
                </button>
              </div>

              <button
                onClick={() => {
                  const msg = isAr
                    ? `مرحباً ${successTicket.company}،\n\nيسعدنا انضمامكم إلى منصة ميسرة. إليكم بيانات الدخول الخاصة بكم:\n\n📧 البريد: ${successTicket.email}\n🔑 كلمة المرور: ${successTicket.pass}\n\nيمكنكم تسجيل الدخول من هنا: ${window.location.origin}/login`
                    : `Hi ${successTicket.company},\n\nWelcome to Maisarah Platform! Your account is ready. Here are your credentials:\n\n📧 Email: ${successTicket.email}\n🔑 Password: ${successTicket.pass}\n\nLogin here: ${window.location.origin}/login`;

                  const cleanPhone = (successTicket.phone || '').replace(/\s+/g, '').replace('+', '');
                  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="w-full py-4 bg-[#25D366] text-white font-black uppercase tracking-widest rounded-2xl hover:bg-[#128C7E] transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
              >
                <PlayCircle size={20} />
                {isAr ? 'مشاركة عبر واتساب' : 'Share on WhatsApp'}
              </button>

              <button
                onClick={() => setSuccessTicket(null)}
                className="w-full py-2 text-gray-400 font-bold uppercase tracking-widest hover:text-gray-600 transition-all text-[10px]"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Client Deletion & Cascading DSR Confirmation Modal ── */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-5 animate-in fade-in duration-200" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto border border-red-100">
              <Trash2 size={32} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-gray-900">
                {isAr ? 'تأكيد إزالة العميل' : 'Delete Client'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {isAr ? 'هل أنت متأكد من حذف العميل' : 'Are you sure you want to delete'}{' '}
                <span className="font-bold text-gray-900">{clientToDelete.company_name}</span>?
              </p>
            </div>

            {/* DSR Cascading Option Checkbox */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteClientDSRAlso}
                  onChange={e => setDeleteClientDSRAlso(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-red-600 focus:ring-red-500 border-gray-300"
                />
                <div className="text-xs">
                  <p className="font-bold text-gray-900">
                    {isAr ? 'حذف كافة سجلات (DSR) والعمليات المالية المرتبطة بهذا العميل أيضاً؟' : 'Also remove all associated DSR entries for this client?'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                    {isAr
                      ? 'عند التفعيل، سيتم إزالة كافة قيود تقرير الإيراد اليومي (DSR) التابعة للعميل فوراً من بوابة الموظف وبوابة المحاسبة وقاعدة البيانات.'
                      : 'If enabled, all daily sales reports (DSR) and linked records for this client will be immediately removed from both the Employee and Accounts portals.'}
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{isAr ? 'جاري الحذف...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>{isAr ? 'تأكيد الحذف' : 'Confirm Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add New B2B Partner Modal (For Authorized Staff & Managers) ── */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Building2 size={18} className="text-indigo-600" />
                <span>{isAr ? 'تسجيل شركة أو شريك أعمال B2B جديد' : 'Register New B2B Partner Company'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPartnerModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewPartner} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'اسم المكتب أو الشركة' : 'Partner Company Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: مركز سند للخدمات - الخوير' : 'e.g. Sanad Services Center - Al Khuwair'}
                  value={newPartnerForm.name}
                  onChange={e => setNewPartnerForm({ ...newPartnerForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'نوع الشريك' : 'Partner Type'}
                  </label>
                  <select
                    value={newPartnerForm.partner_type}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, partner_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="sanad">{isAr ? 'مكتب سند للخدمات' : 'Sanad Service Center'}</option>
                    <option value="law_firm">{isAr ? 'مكتب محاماة واستشارات قانونية' : 'Law Firm / Legal Advocacy'}</option>
                    <option value="pro">{isAr ? 'مكتب تخليص معاملات (PRO)' : 'PRO / Typing Center'}</option>
                    <option value="agent">{isAr ? 'وكيل أعمال ومستشار مستقل' : 'Corporate Agent / Consultant'}</option>
                    <option value="company">{isAr ? 'شركة أو مؤسسة شريكة' : 'Corporate Partner'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'المدينة / الفرع' : 'Location / Branch'}
                  </label>
                  <input
                    type="text"
                    placeholder="Muscat / Seeb"
                    value={newPartnerForm.location}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'اسم الشخص المسؤول' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مدير المكتب' : 'Managing Director'}
                    value={newPartnerForm.contact_person}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, contact_person: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+968 9000 0000"
                    value={newPartnerForm.phone}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'ملاحظات الشراكة ونسبة الإحالة (اختياري)' : 'Partnership Notes & Terms (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'تفاصيل الاتفاقية أو نوع العملاء المحالين...' : 'Referral notes or preferred services...'}
                  value={newPartnerForm.notes}
                  onChange={e => setNewPartnerForm({ ...newPartnerForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingPartner || !newPartnerForm.name.trim()}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-indigo-700/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPartner ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{isAr ? 'تسجيل وحفظ الشريك' : 'Save Partner'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Portal Access & Credential Handover Modal ── */}
      <PortalAccessCredentialModal
        isOpen={isPortalModalOpen}
        onClose={() => {
          setIsPortalModalOpen(false);
          setPortalTarget(null);
        }}
        target={portalTarget}
        onSuccess={({ targetId }) => {
          setClients(prev => prev.map(c => c.id === targetId ? { ...c, portal_access_sent: true } : c));
          fetchClients();
        }}
      />
    </div>
  );
};

export default ClientManager;
