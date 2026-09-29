import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
  FileText, Download, CheckCircle2, Search, Plus, X,
  Clock, AlertTriangle, RefreshCw, User, Receipt, DollarSign,
  Calendar, Layers, Tag, Eye, ChevronRight, ShieldCheck, CheckSquare,
  Building2, Send, CreditCard, Sparkles, Filter, Check, ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { addDSREntry } from '../../utils/dsrSync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ClientRecord {
  id: string;
  company_name: string;
  cr_number?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id?: string | null;
  service_id?: string | null;
  amount: number;
  vat_amount?: number;
  total_amount?: number;
  status: 'draft' | 'unpaid' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  billing_type?: string;
  due_date: string;
  created_at: string;
  notes?: string | null;
  clients?: { id?: string; company_name: string; cr_number?: string } | null;
  services?: { id?: string; title: string; budget?: number } | null;
  profiles?: { full_name: string } | null;
}

export interface ReceiptRecord {
  id: string;
  receipt_number: string;
  invoice_id?: string | null;
  service_id?: string | null;
  client_id?: string | null;
  collected_by?: string | null;
  verified_by?: string | null;
  amount_paid: number;
  gov_fee?: number;
  payment_method: string;
  payment_reference?: string | null;
  payment_date?: string;
  status: 'draft' | 'verified' | 'rejected' | 'cancelled';
  notes?: string | null;
  created_at: string;
  verified_at?: string | null;
  clients?: { company_name: string; cr_number?: string } | null;
  services?: { title: string } | null;
  collector?: { full_name: string; email?: string } | null;
  invoices?: { invoice_number: string; amount: number; total_amount?: number } | null;
}

const formatOMR = (val: number) =>
  new Intl.NumberFormat('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val || 0);

export default function InvoiceManagement() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts_queue'>('receipts_queue');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'draft' | 'verified'>('draft');
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Toast
  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // New Invoice Form State
  const [newInvForm, setNewInvForm] = useState({
    clientId: '',
    serviceName: '',
    amount: '',
    vatIncluded: true,
    billingType: 'one_time',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: ''
  });

  // ── Fetch Invoices, Receipts & Clients ─────────────────────────────────────
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [invRes, rcpRes, clientRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            id, invoice_number, client_id, service_id, amount, tax_amount, total_amount, status, billing_type, due_date, created_at, notes,
            clients ( id, company_name, cr_number ),
            services ( id, title, budget ),
            profiles:created_by ( full_name )
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('receipts')
          .select(`
            id, receipt_number, invoice_id, service_id, client_id, collected_by, verified_by,
            amount_paid, gov_fee, payment_method, payment_reference, payment_date, status,
            notes, created_at, verified_at,
            clients ( company_name, cr_number ),
            services ( title ),
            collector:profiles!collected_by ( full_name, email ),
            invoices ( invoice_number, amount, total_amount )
          `)
          .order('created_at', { ascending: false }),

        supabase.from('clients').select('id, company_name, cr_number').order('company_name')
      ]);

      if (invRes.data) {
        setInvoices(invRes.data as any);
      }
      if (rcpRes.data) {
        setReceipts(rcpRes.data as any);
      }
      if (clientRes.data) {
        setClients(clientRes.data as any);
      }
    } catch (err: any) {
      console.warn('Error fetching accountant data:', err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Supabase Realtime Channels
    const channel = supabase
      .channel('accountant-financials-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dsr_entries' }, () => fetchData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // ── Verification & Automated DSR Sync Transaction ──────────────────────────
  const handleVerifyPayment = async (receipt: ReceiptRecord) => {
    // 1. Idempotency Check: Don't verify if already verified
    if (receipt.status === 'verified') {
      setNotification({
        show: true,
        title: isAr ? 'معتمد مسبقاً' : 'Already Verified',
        message: isAr ? 'تم اعتماد هذا الإيصال مسبقاً.' : 'This receipt has already been verified.',
        type: 'success'
      });
      return;
    }

    setIsProcessingAction(receipt.id);
    const nowIso = new Date().toISOString();

    // Optimistic UI update
    setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: 'verified', verified_at: nowIso } : r));

    try {
      // Step A: Defensively check if DSR entry already exists for this receipt
      const { data: existingDsr } = await supabase
        .from('dsr_entries')
        .select('id')
        .eq('receipt_id', receipt.id);

      // Step B: Update Receipt Status to 'verified'
      const { error: rcpErr } = await supabase
        .from('receipts')
        .update({
          status: 'verified',
          verified_by: user?.id || null,
          verified_at: nowIso
        })
        .eq('id', receipt.id);

      if (rcpErr) throw rcpErr;

      // Step C: Insert Ledger Row into dsr_entries (if not already present)
      const companyName = receipt.clients?.company_name || 'Valued Client';
      const serviceName = receipt.services?.title || 'Corporate Professional Service';
      const crNumber = receipt.clients?.cr_number || '';
      const amountPaid = Number(receipt.amount_paid || 0);
      const govFee = Number(receipt.gov_fee || 0);
      const profit = Number((amountPaid - govFee).toFixed(3));
      const collectorName = receipt.collector?.full_name || 'Staff Member';

      if (!existingDsr || existingDsr.length === 0) {
        const { error: dsrErr } = await supabase
          .from('dsr_entries')
          .insert([{
            receipt_id: receipt.id,
            invoice_id: receipt.invoice_id || null,
            service_id: receipt.service_id || null,
            client_id: receipt.client_id || null,
            employee_id: receipt.collected_by || null,
            employee_name: collectorName,
            company_name: companyName,
            service_name: serviceName,
            cr_number: crNumber,
            amount: amountPaid,
            gov_fee: govFee,
            profit: profit,
            payment_method: receipt.payment_method || 'Bank transfer',
            status: 'Paid',
            payment_date: receipt.payment_date || new Date().toISOString().split('T')[0],
            receipt_number: receipt.receipt_number,
            invoice_number: receipt.invoices?.invoice_number || '',
            payment_reference: receipt.payment_reference || '',
            accountant_note: `Verified by Accountant (${user?.email || 'Accountant'}) on ${new Date().toLocaleDateString('en-GB')}`,
            verified_by_accountant: true
          }]);

        if (dsrErr) console.warn('Supabase DSR insert notice:', dsrErr.message);

        // Also sync to local DSR memory state for instant cross-tab sync
        addDSREntry({
          id: `dsr-${receipt.id}`,
          date: receipt.payment_date || new Date().toISOString().split('T')[0],
          employee_name: collectorName,
          employee_id: receipt.collected_by || undefined,
          service: serviceName,
          company_name: companyName,
          client_id: receipt.client_id || undefined,
          cr_number: crNumber,
          amount: amountPaid,
          gov_fee: govFee,
          status: 'Paid',
          payment_date: receipt.payment_date || new Date().toISOString().split('T')[0],
          payment_method: (receipt.payment_method as any) || 'Bank transfer',
          accountant_note: `Verified from receipt ${receipt.receipt_number}`,
          invoice_issued: true,
          invoice_number: receipt.invoices?.invoice_number,
          receipt_number: receipt.receipt_number,
          payment_reference: receipt.payment_reference || undefined,
          verified_by_accountant: true
        });
      }

      // Step D: Re-evaluate and Update Linked Invoice Status
      if (receipt.invoice_id) {
        const { data: allVerifiedReceipts } = await supabase
          .from('receipts')
          .select('amount_paid')
          .eq('invoice_id', receipt.invoice_id)
          .eq('status', 'verified');

        const totalVerifiedPaid = (allVerifiedReceipts || []).reduce(
          (sum, r) => sum + (Number(r.amount_paid) || 0),
          0
        );

        const targetInvoice = invoices.find(inv => inv.id === receipt.invoice_id);
        const invoiceTotal = targetInvoice ? Number(targetInvoice.total_amount || targetInvoice.amount || 0) : amountPaid;
        const newInvoiceStatus = totalVerifiedPaid >= invoiceTotal ? 'paid' : 'partially_paid';

        await supabase
          .from('invoices')
          .update({ status: newInvoiceStatus })
          .eq('id', receipt.invoice_id);

        setInvoices(prev => prev.map(inv => inv.id === receipt.invoice_id ? { ...inv, status: newInvoiceStatus } : inv));
      }

      // Step E: Push Realtime Notification to the Collecting Employee
      if (receipt.collected_by) {
        const { error: notifErr } = await supabase
          .from('notifications')
          .insert([{
            sender_id: user?.id || null,
            recipient_id: receipt.collected_by,
            service_id: receipt.service_id || null,
            invoice_id: receipt.invoice_id || null,
            receipt_id: receipt.id,
            title: isAr ? 'تم اعتماد الدفعة والمزامنة في DSR' : 'Payment Verified & Synced to DSR',
            message: isAr
              ? `تم اعتماد الإيصال (${receipt.receipt_number}) بقيمة ${amountPaid.toFixed(3)} ر.ع وترحيل المعاملة إلى سجل المبيعات اليومي (DSR).`
              : `Your payment receipt ${receipt.receipt_number} (OMR ${amountPaid.toFixed(3)}) for "${serviceName}" has been verified and synced to the DSR Register.`,
            type: 'receipt_verified'
          }]);
        if (notifErr) console.warn('Employee notification notice:', notifErr);
      }

      setNotification({
        show: true,
        title: isAr ? 'تم اعتماد الدفعة وترحيلها' : 'Payment Verified & DSR Synced',
        message: isAr
          ? `تم توثيق الإيصال ${receipt.receipt_number} بنجاح وإدراجه في سجل الخدمات اليومي (DSR).`
          : `Receipt ${receipt.receipt_number} verified and synced to the Daily Sales Report (DSR).`,
        type: 'success'
      });

      fetchData(true);
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في الاعتماد' : 'Verification Error',
        message: err.message || 'Could not verify payment',
        type: 'error'
      });
      fetchData(true);
    } finally {
      setIsProcessingAction(null);
    }
  };

  // ── Create Invoice Form Submit ─────────────────────────────────────────────
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvForm.clientId || !newInvForm.amount) {
      setNotification({
        show: true,
        title: isAr ? 'بيانات ناقصة' : 'Missing Info',
        message: isAr ? 'يرجى اختيار العميل وإدخال المبلغ.' : 'Client and amount are required.',
        type: 'error'
      });
      return;
    }

    try {
      const baseAmt = parseFloat(newInvForm.amount) || 0;
      const vatAmt = newInvForm.vatIncluded ? +(baseAmt * 0.05).toFixed(3) : 0;
      const totalAmt = +(baseAmt + vatAmt).toFixed(3);
      const invNum = `INV-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from('invoices').insert([{
        invoice_number: invNum,
        client_id: newInvForm.clientId,
        amount: baseAmt,
        tax_amount: vatAmt,
        total_amount: totalAmt,
        billing_type: newInvForm.billingType,
        status: 'draft',
        due_date: newInvForm.dueDate,
        notes: newInvForm.notes || newInvForm.serviceName || 'Custom Invoice',
        created_by: user?.id || null
      }]);

      if (error) throw error;

      setIsNewModalOpen(false);
      setNewInvForm({
        clientId: '',
        serviceName: '',
        amount: '',
        vatIncluded: true,
        billingType: 'one_time',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        notes: ''
      });

      setNotification({
        show: true,
        title: isAr ? 'تم إنشاء الفاتورة' : 'Invoice Created',
        message: isAr ? `تم حفظ الفاتورة ${invNum} بنجاح.` : `Invoice ${invNum} created as draft.`,
        type: 'success'
      });
      fetchData(true);
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || 'Could not create invoice',
        type: 'error'
      });
    }
  };

  // Computed Lists
  const draftReceipts = useMemo(() => receipts.filter(r => r.status === 'draft'), [receipts]);
  const verifiedReceipts = useMemo(() => receipts.filter(r => r.status === 'verified'), [receipts]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = !searchTerm.trim() ||
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.services?.title || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = invoiceFilter === 'all' || inv.status === invoiceFilter;
      return matchesSearch && matchesFilter;
    });
  }, [invoices, searchTerm, invoiceFilter]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(rcp => {
      const matchesSearch = !searchTerm.trim() ||
        rcp.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rcp.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rcp.services?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rcp.collector?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = receiptFilter === 'all' || rcp.status === receiptFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receipts, searchTerm, receiptFilter]);

  // Financial Stats
  const stats = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.total_amount || i.amount) || 0), 0);
    const totalCollected = verifiedReceipts.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
    const pendingDraftsAmt = draftReceipts.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);

    return { totalInvoiced, totalCollected, pendingDraftsAmt };
  }, [invoices, verifiedReceipts, draftReceipts]);

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed top-6 end-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${notification.type === 'success'
            ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/30'
            : 'bg-red-900/95 text-red-100 border-red-500/30'
          }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={20} className="text-red-400 shrink-0" />}
          <div>
            <p className="text-xs font-black uppercase tracking-wider">{notification.title}</p>
            <p className="text-xs font-semibold mt-0.5 text-white/90">{notification.message}</p>
          </div>
        </div>
      )}

      {/* ── Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white to-gray-50/80 p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#A11212]/10 text-[#A11212] text-[10px] font-black uppercase tracking-widest rounded-full">
                {isAr ? 'الإدارة المالية والمطابقة' : 'Financial Control & Verification'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <ShieldCheck size={14} />
                {isAr ? 'المزامنة التلقائية مع DSR' : 'DSR Auto-Sync Active'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {isAr ? 'إدارة الفواتير والتحصيلات' : 'Invoices & Payment Receipts'}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
              {isAr
                ? 'تحقق من مدفوعات الموظفين لمزامنتها مباشرة مع سجل المبيعات اليومي (DSR) وتابع مسودات الفواتير المترتبة على بدء المهام.'
                : 'Verify draft employee payments, sync transactions directly into the DSR ledger, and monitor task invoices.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              className="p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl border border-gray-200 shadow-xs transition-colors"
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 bg-[#A11212] hover:bg-[#850e0e] text-white px-5 py-3 rounded-2xl font-black text-xs shadow-md shadow-[#A11212]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              <span>{isAr ? 'إنشاء فاتورة يدوية' : 'Create Custom Invoice'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              {isAr ? 'دفعات قيد التحقق (مسودات)' : 'Draft Payments for Verification'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-amber-700">{draftReceipts.length}</p>
              <span className="text-xs font-bold text-gray-500">OMR {formatOMR(stats.pendingDraftsAmt)}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              {isAr ? 'التحصيلات المعتمدة (DSR)' : 'Total Verified Receipts'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-emerald-700">{verifiedReceipts.length}</p>
              <span className="text-xs font-bold text-gray-500">OMR {formatOMR(stats.totalCollected)}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {isAr ? 'إجمالي الفواتير الصادرة' : 'Total Invoiced Amount'}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-2xl font-black text-blue-700">{invoices.length}</p>
              <span className="text-xs font-bold text-gray-500">OMR {formatOMR(stats.totalInvoiced)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── View Switcher & Search Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('receipts_queue')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black transition-all ${activeTab === 'receipts_queue'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            <Receipt size={15} />
            <span>{isAr ? 'طابور التحقق من الدفعات' : 'Payment Verification Queue'}</span>
            {draftReceipts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black animate-pulse">
                {draftReceipts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black transition-all ${activeTab === 'invoices'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            <FileText size={15} />
            <span>{isAr ? 'سجل الفواتير (Invoices)' : 'Invoice Register'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isAr ? 'بحث بالرقم أو العميل أو الخدمة...' : 'Search invoices / receipts...'}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-10 pe-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
            />
          </div>
        </div>
      </div>

      {/* ── TAB 1: PAYMENT RECEIPTS & DSR VERIFICATION QUEUE ────────────── */}
      {activeTab === 'receipts_queue' && (
        <div className="space-y-4">
          {/* Sub-Filter Chips */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReceiptFilter('draft')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${receiptFilter === 'draft'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              {isAr ? 'مسودات قيد التحقق' : 'Drafts Pending Verification'} ({draftReceipts.length})
            </button>

            <button
              onClick={() => setReceiptFilter('verified')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${receiptFilter === 'verified'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              {isAr ? 'المعتمدة والمرحلة لـ DSR' : 'Verified & Synced to DSR'} ({verifiedReceipts.length})
            </button>

            <button
              onClick={() => setReceiptFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${receiptFilter === 'all'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              {isAr ? 'جميع الإيصالات' : 'All Receipts'} ({receipts.length})
            </button>
          </div>

          {/* Receipts Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-[#A11212] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-black text-gray-700">
                  {isAr ? 'لا توجد إيصالات في هذا التصنيف' : 'No receipts found in this view'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isAr ? 'عند قيام الموظفين بتسجيل دفعات، ستظهر مباشرة هنا للاعتماد.' : 'When employees log payments against tasks, they appear here.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'رقم الإيصال' : 'Receipt No.'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'العميل والخدمة' : 'Client & Service'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'الموظف المحصل' : 'Collected By'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'المبلغ المحصل' : 'Amount Paid'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'طريقة الدفع والمرجع' : 'Method & Ref'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-end">{isAr ? 'إجراءات الاعتماد' : 'Verification Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                    {filteredReceipts.map(rcp => {
                      const isDraft = rcp.status === 'draft';
                      const isProcessing = isProcessingAction === rcp.id;

                      return (
                        <tr key={rcp.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono font-black text-gray-900">
                            {rcp.receipt_number}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-black text-gray-900">{rcp.clients?.company_name || 'Valued Client'}</div>
                            <div className="text-[11px] text-gray-500 font-medium">{rcp.services?.title || 'General Service'}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-gray-700">{rcp.collector?.full_name || 'Staff Member'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-mono font-black text-emerald-700 text-sm">
                              OMR {formatOMR(rcp.amount_paid)}
                            </span>
                            {rcp.gov_fee && rcp.gov_fee > 0 ? (
                              <div className="text-[10px] text-gray-400">Gov: OMR {formatOMR(rcp.gov_fee)}</div>
                            ) : null}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-800">{rcp.payment_method || 'Bank transfer'}</div>
                            {rcp.payment_reference && (
                              <div className="text-[10px] font-mono text-gray-400">{rcp.payment_reference}</div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${isDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                              {isDraft ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                              {isDraft ? (isAr ? 'مسودة معلقة' : 'Draft Pending') : (isAr ? 'معتمد في DSR' : 'Verified in DSR')}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-end">
                            {isDraft ? (
                              <button
                                onClick={() => handleVerifyPayment(rcp)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                              >
                                <Check size={14} />
                                <span>{isProcessing ? (isAr ? 'جاري الاعتماد...' : 'Verifying...') : (isAr ? 'اعتماد ومزامنة لـ DSR' : 'Verify & Sync to DSR')}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-gray-400 inline-flex items-center gap-1">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                {isAr ? 'تم الترحيل' : 'Synced'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: INVOICES STUDIO REGISTER ─────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Sub-Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'draft', 'unpaid', 'partially_paid', 'paid'].map(f => (
              <button
                key={f}
                onClick={() => setInvoiceFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${invoiceFilter === f
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {f === 'all' && (isAr ? 'جميع الفواتير' : 'All Invoices')}
                {f === 'draft' && (isAr ? 'مسودات (بدء المهام)' : 'Drafts (Task Started)')}
                {f === 'unpaid' && (isAr ? 'غير مدفوعة' : 'Unpaid')}
                {f === 'partially_paid' && (isAr ? 'مدفوعة جزئياً' : 'Partially Paid')}
                {f === 'paid' && (isAr ? 'مدفوعة بالكامل' : 'Paid in Full')}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-black text-gray-700">{isAr ? 'لا توجد فواتير' : 'No invoices found'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'رقم الفاتورة' : 'Invoice No.'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'العميل والخدمة' : 'Client & Service'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'المبلغ الإجمالي' : 'Total Amount'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                      <th className="py-3.5 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-end">{isAr ? 'إجراءات وتنبيهات' : 'Actions & Alerts'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4 font-mono font-black text-gray-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-black text-gray-900">{inv.clients?.company_name || 'Valued Client'}</div>
                          <div className="text-[11px] text-gray-500 font-medium">{inv.services?.title || 'General Service'}</div>
                        </td>
                        <td className="py-4 px-4 font-mono font-black text-gray-900">
                          OMR {formatOMR(inv.total_amount || inv.amount)}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {inv.due_date || 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              inv.status === 'partially_paid' ? 'bg-blue-100 text-blue-800' :
                                inv.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-end">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setAlertModalOpen(true);
                              setAlertMessage(
                                isAr
                                  ? `تنبيه من قسم المحاسبة: يرجى تسريع تسليم المهمة "${inv.services?.title || inv.invoice_number}" ومتابعة سداد الفاتورة المستحقة بتاريخ ${inv.due_date || 'قريباً'}.`
                                  : `Accounts Alert: Deliverable & invoice for "${inv.services?.title || inv.invoice_number}" is due on ${inv.due_date || 'soon'}. Please expedite completion.`
                              );
                            }}
                            className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-black transition-colors"
                          >
                            <Send size={12} />
                            <span>{isAr ? 'تنبيه استحقاق' : 'Send Alert'}</span>
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
      )}

      {/* ── MODAL: SEND DUE DATE ALERT ─────────────────────────────────── */}
      {alertModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {isAr ? 'إرسال تنبيه استحقاق للموظف' : 'Dispatch Due Date Alert'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedInvoice.invoice_number} • {selectedInvoice.clients?.company_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAlertModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/70 text-xs space-y-1 text-gray-700 font-semibold">
                <p><strong>{isAr ? 'المهمة المرتبطة:' : 'Linked Task:'}</strong> {selectedInvoice.services?.title || 'General Service'}</p>
                <p><strong>{isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'}</strong> {selectedInvoice.due_date || 'N/A'}</p>
                <p><strong>{isAr ? 'المبلغ المطلوب:' : 'Amount:'}</strong> OMR {formatOMR(selectedInvoice.total_amount || selectedInvoice.amount)}</p>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                  {isAr ? 'نص التنبيه الفوري (Realtime Message)' : 'Realtime Alert Message'}
                </label>
                <textarea
                  rows={3}
                  value={alertMessage}
                  onChange={e => setAlertMessage(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAlertModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      let assignedEmpId: string | null = null;
                      if (selectedInvoice.service_id) {
                        const { data: svc } = await supabase
                          .from('services')
                          .select('employee_id')
                          .eq('id', selectedInvoice.service_id)
                          .maybeSingle();
                        if (svc?.employee_id) assignedEmpId = svc.employee_id;
                      }

                      await supabase.from('notifications').insert([{
                        sender_id: user?.id || null,
                        recipient_id: assignedEmpId,
                        recipient_role: 'employee',
                        service_id: selectedInvoice.service_id || null,
                        invoice_id: selectedInvoice.id,
                        title: isAr ? 'تنبيه استحقاق من قسم المحاسبة' : 'Accounts Due Date Alert',
                        message: alertMessage,
                        type: 'due_date_alert'
                      }]);

                      setAlertModalOpen(false);
                      setNotification({
                        show: true,
                        title: isAr ? 'تم إرسال التنبيه' : 'Alert Dispatched',
                        message: isAr ? 'تم إرسال الإشعار المباشر لموظف المهمة.' : 'Realtime alert delivered to the assigned staff member.',
                        type: 'success'
                      });
                    } catch (err: any) {
                      setNotification({
                        show: true,
                        title: isAr ? 'خطأ' : 'Error',
                        message: err.message || 'Could not send alert',
                        type: 'error'
                      });
                    }
                  }}
                  className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-[#A11212]/20"
                >
                  {isAr ? 'إرسال التنبيه الآن' : 'Push Live Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE CUSTOM INVOICE ───────────────────────────────── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-base font-black text-gray-900">
                {isAr ? 'إنشاء فاتورة يدوية' : 'Create Custom Invoice'}
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'العميل المستفيد *' : 'Client *'}
                </label>
                <select
                  required
                  value={newInvForm.clientId}
                  onChange={e => setNewInvForm({ ...newInvForm, clientId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                >
                  <option value="">{isAr ? 'اختر العميل...' : 'Select client...'}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'المبلغ الأساسي (ر.ع) *' : 'Amount (OMR) *'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newInvForm.amount}
                    onChange={e => setNewInvForm({ ...newInvForm, amount: e.target.value })}
                    placeholder="0.000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </label>
                  <input
                    type="date"
                    value={newInvForm.dueDate}
                    onChange={e => setNewInvForm({ ...newInvForm, dueDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'وصف الخدمة / الملاحظات' : 'Service Description / Notes'}
                </label>
                <textarea
                  rows={2}
                  value={newInvForm.notes}
                  onChange={e => setNewInvForm({ ...newInvForm, notes: e.target.value })}
                  placeholder={isAr ? 'وصف الفاتورة...' : 'Invoice details...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-[#A11212]/20"
                >
                  {isAr ? 'حفظ الفاتورة' : 'Save Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
