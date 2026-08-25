import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
  Active:    'bg-green-100 text-green-700',
  Pending:   'bg-amber-100 text-amber-700',
  Suspended: 'bg-red-100 text-red-700',
};

const SERVICE_STYLES: Record<string, { cls: string; icon: React.ReactNode }> = {
  ongoing:      { cls: 'bg-blue-100 text-blue-700',   icon: <PlayCircle size={12} /> },
  completed:    { cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
  delayed:      { cls: 'bg-red-100 text-red-700',     icon: <AlertTriangle size={12} /> },
  under_review: { cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
};

const INVOICE_STYLES: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  unpaid:  'bg-amber-100 text-amber-700',
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
}: {
  client: Client;
  onBack: () => void;
  isAr: boolean;
  t: any;
}) => {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [services, setServices]   = useState<Service[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'invoices' | 'profile'>('services');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [invRes, svcRes] = await Promise.all([
          supabase.from('invoices').select('id, invoice_number, amount, status, due_date, created_at').eq('client_id', client.id).order('created_at', { ascending: false }),
          supabase.from('services').select('id, title, status, description, created_at, due_date').eq('client_id', client.id).order('created_at', { ascending: false }),
        ]);
        setInvoices((invRes.data as Invoice[]) || []);
        setServices((svcRes.data as Service[]) || []);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [client.id]);

  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalUnpaid  = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
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
          { label: isAr ? 'مدفوع' : 'Total Paid',     value: `${totalPaid.toLocaleString()} ر.ع`, icon: <CheckCircle2 size={18} />, cls: 'bg-green-50 text-green-600' },
          { label: isAr ? 'مستحق' : 'Outstanding',    value: `${totalUnpaid.toLocaleString()} ر.ع`, icon: <Clock size={18} />,       cls: 'bg-amber-50 text-amber-600' },
          { label: isAr ? 'فواتير' : 'Invoices',      value: invoices.length,                        icon: <Receipt size={18} />,      cls: 'bg-blue-50 text-blue-600' },
          { label: isAr ? 'خدمات نشطة' : 'Active Svcs', value: activeServices,                      icon: <Briefcase size={18} />,    cls: 'bg-red-50 text-brand-dark' },
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
          {(['services', 'invoices', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? 'text-brand-dark border-b-2 border-brand-dark bg-red-50/40'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'services' ? <Briefcase size={15} /> : tab === 'invoices' ? <Receipt size={15} /> : <UserCircle2 size={15} />}
              {tab === 'services' ? (isAr ? 'الخدمات' : 'Services') : tab === 'invoices' ? (isAr ? 'الفواتير' : 'Invoices') : (isAr ? 'الملف الشخصي' : 'Profile')}
              {tab !== 'profile' && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {tab === 'services' ? services.length : invoices.length}
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
// Sub-component: Form Field Helper
// ---------------------------------------------------------------------------
const FormField = ({
  label, name, required = false, type = 'text', placeholder = '', value, onChange
}: {
  label: string; name: string; required?: boolean; type?: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/10 transition-colors bg-white"
    />
  </div>
);

// ---------------------------------------------------------------------------
// Main Component: Client Manager
// ---------------------------------------------------------------------------
const ClientManager = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';
  const ticketRef = useRef<HTMLDivElement>(null);

  const [clients, setClients]           = useState<Client[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [formMsg, setFormMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  
  // Success Ticket State
  const [successTicket, setSuccessTicket] = useState<{
    email: string;
    pass: string;
    company: string;
    phone: string;
  } | null>(null);

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
    compliance_status: 'compliant',
    email: '',
    password: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── Fetch clients ─────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, company_name, cr_number, vat_number, activity, compliance_status, email, created_at, assigned_employee_id')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    if (!error && data) setClients(data as Client[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── Modals / Form State ───────────────────────────────────────────────────
  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name,
      cr_number: client.cr_number || '',
      vat_number: client.vat_number || '',
      activity: client.activity || '',
      compliance_status: client.compliance_status,
      email: client.email || '',
      password: '',
      phone: '',
    });
    setIsModalOpen(true);
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormMsg(null);
    setFormData({ 
      company_name: '', 
      cr_number: '', 
      vat_number: '', 
      activity: '', 
      compliance_status: 'compliant', 
      email: '', 
      password: '',
      phone: ''
    });
  };

  // ── Submit (Add / Edit) ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);

    let createdTicket = null;

    try {
      if (editingClient) {
        const payload: any = {
          company_name:       formData.company_name,
          cr_number:          formData.cr_number || null,
          vat_number:         formData.vat_number || null,
          activity:           formData.activity || null,
          compliance_status:  formData.compliance_status,
        };
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        setFormMsg({ type: 'ok', text: isAr ? 'تم تحديث العميل بنجاح' : 'Client updated successfully' });
      } else {
        if (!formData.email || !formData.password) {
          throw new Error(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Email and password are required');
        }

        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        );

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { role: 'client', company_name: formData.company_name } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create login account');

        const userId = authData.user.id;

        try {
          await tempClient.from('profiles').insert({
            id: userId,
            role: 'client',
            email: formData.email
          });
        } catch (e) {
          // Profile exists or trigger handled it - silent ignore for production
        }

        const payload: any = {
          id: userId, 
          company_name: formData.company_name,
          cr_number: formData.cr_number || null,
          vat_number: formData.vat_number || null,
          activity: formData.activity || null,
          compliance_status: formData.compliance_status,
          email: formData.email,
          phone: formData.phone || null,
          assigned_employee_id: user?.id, // Capture the employee who registered the client
        };

        const { error: clientError } = await supabase.from('clients').insert([payload]);
        if (clientError) throw clientError;

        // Log the activity
        await logActivity(
          user?.id || '',
          user?.user_metadata?.full_name || user?.email || 'Employee',
          'client_created',
          `Registered a new client: ${formData.company_name}`,
          `تم تسجيل عميل جديد: ${formData.company_name}`
        );

        createdTicket = {
          email: formData.email,
          pass: formData.password,
          company: formData.company_name,
          phone: formData.phone,
        };
      }

      await fetchClients();

      if (createdTicket) {
        setSuccessTicket(createdTicket);
        setIsModalOpen(false);
      } else {
        setTimeout(() => closeFormModal(), 1600);
      }
    } catch (err: any) {
      setFormMsg({ type: 'err', text: err.message || 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!clientToDelete) return;
    setIsSubmitting(true);
    try {
      // Use update instead of delete for Archiving logic
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
  const filtered = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cr_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.activity || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Drill-down view ───────────────────────────────────────────────────────
  if (selectedClient) {
    return (
      <ClientDetail 
        client={selectedClient} 
        onBack={() => setSelectedClient(null)} 
        isAr={isAr} 
        t={t} 
      />
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 size={24} className="text-brand-dark" />
            {t('employee.clientManager')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAr ? `${clients.length} عميل مسجّل` : `${clients.length} registered clients`}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-xl
            hover:bg-red-800 transition-colors text-sm font-bold shadow-sm shadow-brand-dark/20"
        >
          <Plus size={18} />
          {t('employee.registerNewClient')}
        </button>
      </div>

      {/* Directory Card */}
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
                    <th className="px-5 py-3 text-start"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
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
                          <span className="font-semibold text-gray-800">{client.company_name}</span>
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
                      <span className={`mt-1 inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${COMPLIANCE_STYLES[client.compliance_status] || 'bg-gray-100 text-gray-600'}`}>
                        {client.compliance_status}
                      </span>
                    </div>
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
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {formMsg && (
                <div className={`p-3 text-sm rounded-xl flex items-center gap-2 border ${formMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {formMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {formMsg.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField 
                  label={t('employee.companyName')} 
                  name="company_name" 
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required 
                  placeholder={isAr ? 'شركة الموالح للإنشاء' : 'Al Mawaleh Construction LLC'} 
                />

                {!editingClient && (
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                    <div className="col-span-2">
                      <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mb-1">
                        {isAr ? 'بيانات الدخول (للحساب الجديد)' : 'Login Credentials (New Account)'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <FormField 
                        label={isAr ? 'البريد الإلكتروني' : 'Email Address'} 
                        name="email" 
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required 
                        placeholder="client@example.com" 
                      />
                    </div>
                    <div className="md:col-span-2 relative">
                        <FormField
                          label={isAr ? 'كلمة المرور' : 'Password'}
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute ${isAr ? 'left-3' : 'right-3'} top-9 text-gray-400 hover:text-brand-dark transition-colors`}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    <div className="col-span-2">
                      <FormField 
                        label={isAr ? 'رقم الواتساب (اختياري)' : 'WhatsApp Number (Optional)'} 
                        name="phone" 
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+968 0000 0000" 
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField 
                    label={t('employee.crNumber')} 
                    name="cr_number" 
                    value={formData.cr_number}
                    onChange={handleInputChange}
                    placeholder="1234567" 
                  />
                  <FormField 
                    label={t('employee.vatNumber')} 
                    name="vat_number" 
                    value={formData.vat_number}
                    onChange={handleInputChange}
                    placeholder="OM123456789" 
                  />
                </div>

                <FormField 
                  label={t('employee.activity')} 
                  name="activity" 
                  value={formData.activity}
                  onChange={handleInputChange}
                  placeholder={isAr ? 'الإنشاء والمقاولات' : 'Construction & Contracting'} 
                />

                {/* Compliance Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {isAr ? 'حالة الامتثال' : 'Compliance Status'}
                  </label>
                  <select
                    value={formData.compliance_status}
                    onChange={e => setFormData({ ...formData, compliance_status: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none
                      focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-white transition"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-dark hover:bg-red-800 disabled:opacity-60 text-white
                    font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {editingClient ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                      {editingClient ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : t('employee.registerButton')}
                    </>
                  )}
                </button>
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
    </div>
  );
};

export default ClientManager;
