import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  FilePlus,
  Calendar,
  Building2,
  Hash,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Hash as HashIcon,
  ChevronDown,
  RefreshCw,
  FileText,
  Clock,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { PrintButton } from '../../components/PrintButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Client {
  id: string;
  company_name: string;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  clients?: { company_name: string } | null;
}

// ---------------------------------------------------------------------------
// Auto-generate a sequential-looking invoice number
// ---------------------------------------------------------------------------
const generateInvoiceNumber = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yy}${mm}-${rand}`;
};

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; cls: string }> = {
  unpaid:  { label_ar: 'غير مدفوعة', label_en: 'Unpaid',  cls: 'bg-amber-100 text-amber-700' },
  paid:    { label_ar: 'مدفوعة',     label_en: 'Paid',    cls: 'bg-green-100 text-green-700' },
  overdue: { label_ar: 'متأخرة',     label_en: 'Overdue', cls: 'bg-red-100 text-red-700' },
};

const StatusBadge = ({ status, isAr }: { status: string; isAr: boolean }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.unpaid;
  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${c.cls}`}>
      {isAr ? c.label_ar : c.label_en}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Field wrapper for consistent styling
// ---------------------------------------------------------------------------
const FormField = ({
  label, icon, children,
}: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
      {icon && <span className="text-gray-400">{icon}</span>}
      {label}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full p-3 border border-gray-200 rounded-xl text-sm outline-none ' +
  'focus:border-red-700 focus:ring-2 focus:ring-red-700/10 transition-colors bg-white';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const InvoiceCreator = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [clients, setClients]               = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loadingRecent, setLoadingRecent]   = useState(true);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [formMsg, setFormMsg]               = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showPreview, setShowPreview]       = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: generateInvoiceNumber(),
    amount: '',
    status: 'unpaid',
    due_date: '',
  });

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    const { data } = await supabase.from('clients').select('id, company_name').order('company_name');
    setClients((data as Client[]) || []);
    setLoadingClients(false);
  }, []);

  const fetchRecentInvoices = useCallback(async () => {
    setLoadingRecent(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, status, due_date, created_at, clients(company_name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching invoices:", error);
      setLoadingRecent(false);
      return;
    }

    // Supabase joins sometimes return an array for single relationships in TypeScript
    const formattedData = (data as any[]).map(inv => ({
      ...inv,
      clients: Array.isArray(inv.clients) ? inv.clients[0] : inv.clients
    }));

    setRecentInvoices(formattedData as RecentInvoice[]);
    setLoadingRecent(false);
  }, []);

  useEffect(() => {
    fetchClients();
    fetchRecentInvoices();
  }, [fetchClients, fetchRecentInvoices]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      setFormMsg({ type: 'err', text: isAr ? 'يرجى اختيار العميل' : 'Please select a client' });
      return;
    }
    setIsSubmitting(true);
    setFormMsg(null);

    try {
      /**
       * Supabase insert into `invoices` table.
       * Fields required for auto-sync with Accountant Dashboard:
       *   - client_id      → links to clients table (accountant queries by client)
       *   - invoice_number → unique identifier
       *   - amount         → displayed in accountant's revenue metrics
       *   - status         → accountant filters by 'unpaid' / 'paid' / 'overdue'
       *   - due_date       → used for overdue detection
       *   - created_by     → employee user id (audit trail)
       *   - created_at     → auto-set by Supabase (used in monthly revenue charts)
       *
       * The Accountant Dashboard queries this same table → no extra step needed.
       */
      const { error } = await supabase.from('invoices').insert([{
        invoice_number: formData.invoice_number,
        client_id:      formData.client_id,
        amount:         parseFloat(formData.amount),
        status:         formData.status,
        due_date:       formData.due_date,
      }]);

      if (error) throw error;

      setFormMsg({ type: 'ok', text: t('employee.invoiceCreatedSuccess') });
      setFormData({
        client_id: '',
        invoice_number: generateInvoiceNumber(),
        amount: '',
        status: 'unpaid',
        due_date: '',
      });
      setShowPreview(false);
      fetchRecentInvoices();
      setTimeout(() => setFormMsg(null), 4000);
    } catch (err: any) {
      setFormMsg({ type: 'err', text: err.message || 'Error creating invoice' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Page Header */}
      <div className={isAr ? 'text-right' : 'text-left'}>
        <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
          <FilePlus size={28} className="text-brand-dark" />
          {t('employee.invoiceCreator')}
        </h2>
        <p className="text-sm text-gray-500 mt-2 font-medium">
          {isAr
            ? 'أنشئ فاتورة جديدة وستتزامن تلقائياً مع لوحة تحكم المحاسب'
            : 'Create a new invoice — it auto-syncs with the Accountant Dashboard'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Create Invoice Form (col 7) ─────────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-brand-dark to-red-800 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FilePlus size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{t('employee.createNewInvoice')}</h3>
                    <p className="text-red-200 text-xs mt-0.5">{formData.invoice_number}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, invoice_number: generateInvoiceNumber() }))}
                  title={isAr ? 'توليد رقم جديد' : 'Regenerate number'}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className={`p-6 space-y-5 ${isAr ? 'text-right' : 'text-left'}`}>
              {formMsg && (
                <div className={`p-4 text-sm rounded-2xl flex items-center gap-3 border shadow-sm ${
                  formMsg.type === 'ok'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {formMsg.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span className="font-bold">{formMsg.text}</span>
                </div>
              )}

              {/* Client */}
              <FormField label={`${t('employee.selectClient')} *`} icon={<Building2 size={16} />}>
                <div className="relative">
                  <select
                    required
                    value={formData.client_id}
                    onChange={e => setFormData(p => ({ ...p, client_id: e.target.value }))}
                    className={`${inputCls} appearance-none ${isAr ? 'pe-9' : 'ps-3 pe-9'}`}
                  >
                    <option value="" disabled>
                      {loadingClients ? t('employee.loading') : t('employee.chooseClient')}
                    </option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`} />
                </div>
              </FormField>

              {/* Invoice Number */}
              <FormField label={t('employee.invoiceNumber')} icon={<Hash size={16} />}>
                <input
                  required
                  type="text"
                  value={formData.invoice_number}
                  onChange={e => setFormData(p => ({ ...p, invoice_number: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              {/* Amount + Status row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={`${t('employee.amount')} (ر.ع)`} icon={<DollarSign size={16} />}>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>

                <FormField label={isAr ? 'الحالة' : 'Status'}>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                      className={`${inputCls} appearance-none ${isAr ? 'pe-9' : 'ps-3 pe-9'}`}
                    >
                      <option value="unpaid">{isAr ? 'غير مدفوعة' : 'Unpaid'}</option>
                      <option value="paid">{isAr ? 'مدفوعة' : 'Paid'}</option>
                      <option value="overdue">{isAr ? 'متأخرة' : 'Overdue'}</option>
                    </select>
                    <ChevronDown size={15} className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`} />
                  </div>
                </FormField>
              </div>

              {/* Due Date */}
              <FormField label={t('employee.dueDate')} icon={<Calendar size={16} />}>
                <input
                  required
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                  className={inputCls}
                />
              </FormField>

              {/* Preview Toggle */}
              {formData.client_id && formData.amount && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 font-black uppercase tracking-widest hover:border-brand-dark hover:text-brand-dark transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <FileText size={16} />
                  {showPreview
                    ? (isAr ? 'إخفاء المعاينة' : 'Hide Preview')
                    : (isAr ? 'معاينة الفاتورة' : 'Preview Invoice')}
                </button>
              )}

              {/* Invoice Preview */}
              {showPreview && (
                <div className={`bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4 text-sm shadow-inner ${isAr ? 'text-right' : 'text-left'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{isAr ? 'إلى:' : 'To:'}</p>
                      <p className="font-black text-gray-900 text-lg">{selectedClient?.company_name}</p>
                    </div>
                    <StatusBadge status={formData.status} isAr={isAr} />
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">{t('employee.invoiceNumber')}</span>
                    <span className="font-black text-gray-800">{formData.invoice_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">{t('employee.amount')}</span>
                    <span className="font-black text-brand-dark text-xl">{parseFloat(formData.amount || '0').toLocaleString()} ر.ع</span>
                  </div>
                  {formData.due_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">{t('employee.dueDate')}</span>
                      <span className="font-black text-gray-800">{new Date(formData.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-dark hover:bg-red-800 disabled:opacity-60 text-white
                  font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-xl shadow-red-900/20 active:scale-95"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><FilePlus size={18} />{t('employee.submitInvoice')}</>
                )}
              </button>

              {/* Auto-sync notice */}
              <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                <Zap size={14} className="text-brand-dark animate-pulse" />
                {t('employee.autoSyncNotice')}
              </div>
            </form>
          </div>
        </div>

        {/* ── Recent Invoices (col 5) ────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: isAr ? 'إجمالي الفواتير' : 'Total Invoices', value: recentInvoices.length, icon: <FileText size={20} />, cls: 'bg-blue-50 text-blue-600' },
              { label: isAr ? 'غير مدفوعة' : 'Unpaid',        value: recentInvoices.filter(i => i.status === 'unpaid').length, icon: <Clock size={20} />, cls: 'bg-amber-50 text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${s.cls}`}>{s.icon}</div>
                <div>
                  <div className="text-2xl font-black text-gray-900 tracking-tight">{s.value}</div>
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Invoices List */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-50">
              <h3 className="font-black text-base text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                <FileText size={18} className="text-brand-dark" />
                {isAr ? 'آخر الفواتير' : 'Recent Invoices'}
              </h3>
              <button
                onClick={fetchRecentInvoices}
                className="p-2 text-gray-400 hover:text-brand-dark hover:bg-red-50 rounded-xl transition-all active:rotate-180"
              >
                <RefreshCw size={16} className={loadingRecent ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingRecent ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center p-14 text-gray-400">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">{isAr ? 'لا توجد فواتير بعد' : 'No invoices yet'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentInvoices.map(inv => (
                  <div key={inv.id} className="group p-6 hover:bg-gray-50/70 transition-colors">
                    <div className={`flex items-center justify-between mb-4 ${isAr ? 'flex-row' : 'flex-row'}`}>
                      <div className={`min-w-0 ${isAr ? 'text-right' : 'text-left'}`}>
                        <p className="font-black text-sm text-gray-900 truncate">{inv.invoice_number}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider truncate">
                          {inv.clients?.company_name || '—'}
                        </p>
                      </div>
                      <div className={`flex flex-col gap-2 flex-shrink-0 ${isAr ? 'items-start' : 'items-end'}`}>
                        <span className="font-black text-base text-brand-dark">{inv.amount.toLocaleString()} ر.ع</span>
                        <StatusBadge status={inv.status} isAr={isAr} />
                      </div>
                    </div>
                    
                    {/* Action Area (Print/PDF) */}
                    <div className="flex gap-2">
                      <PrintButton 
                        variant="secondary"
                        label={isAr ? 'طباعة' : 'Print'}
                        data={{
                          type: 'invoice',
                          number: inv.invoice_number,
                          date: new Date(inv.created_at).toLocaleDateString(),
                          dueDate: new Date(inv.due_date).toLocaleDateString(),
                          client: {
                            name: inv.clients?.company_name || 'N/A',
                            cr: '1234567', // Mock for demo
                            vat: 'OM123456789', // Mock for demo
                            address: 'Muscat, Oman'
                          },
                          items: [
                            { description: isAr ? 'خدمات تدقيق مالي' : 'Financial Audit Services', qty: 1, price: inv.amount, total: inv.amount }
                          ],
                          totalAmount: inv.amount / 1.05,
                          vatAmount: (inv.amount / 1.05) * 0.05,
                          grandTotal: inv.amount,
                          preparedBy: user?.email || 'Maisarah Staff'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-gray-50 bg-gray-50/50">
              <a
                href="/accountant/invoices"
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-brand-dark hover:underline"
              >
                {isAr ? 'عرض كل الفواتير في لوحة المحاسب' : 'View all invoices in Accountant Panel'}
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InvoiceCreator;
