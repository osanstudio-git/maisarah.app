import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
  FileText, Download, CheckCircle2, Search, Plus, X,
  Clock, AlertTriangle, RefreshCw, User, Receipt, DollarSign,
  Calendar, Layers, Tag, Eye, ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ClientRecord {
  id: string;
  company_name: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id?: string | null;
  amount: number;
  vat_amount?: number;
  status: string; // draft | unpaid | partially_paid | paid | overdue
  billing_type?: string; // one_time | recurring | advance | partial
  due_date: string;
  created_at: string;
  notes?: string | null;
  clients?: { company_name: string } | null;
  profiles?: { full_name: string } | null;
}

interface ReceiptRecord {
  id: string;
  receipt_number: string;
  invoice_id: string;
  amount_paid: number;
  payment_mode: string;
  payment_label?: string | null;
  notes?: string | null;
  paid_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatOMR = (val: number) =>
  new Intl.NumberFormat('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val || 0);

const isOverdue = (inv: Invoice) =>
  inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date();

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
const StatusBadge = ({ status, isAr }: { status: string; isAr: boolean }) => {
  const map: Record<string, { cls: string; label_ar: string; label_en: string; icon: React.ReactNode }> = {
    paid:           { cls: 'bg-green-100 text-green-700', label_ar: 'مدفوعة',         label_en: 'Paid',           icon: <CheckCircle2 size={11} /> },
    partially_paid: { cls: 'bg-blue-100 text-blue-700',   label_ar: 'مدفوعة جزئياً',  label_en: 'Partially Paid', icon: <Receipt size={11} /> },
    unpaid:         { cls: 'bg-amber-100 text-amber-700', label_ar: 'غير مدفوعة',     label_en: 'Unpaid',         icon: <Clock size={11} /> },
    draft:          { cls: 'bg-gray-100 text-gray-700',   label_ar: 'مسودة',           label_en: 'Draft',          icon: <FileText size={11} /> },
    overdue:        { cls: 'bg-red-100 text-red-700',     label_ar: 'متأخرة',         label_en: 'Overdue',        icon: <AlertTriangle size={11} /> },
  };
  const cfg = map[status] || { cls: 'bg-gray-100 text-gray-600', label_ar: status, label_en: status, icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full ${cfg.cls}`}>
      {cfg.icon}
      {isAr ? cfg.label_ar : cfg.label_en}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Filter Button
// ---------------------------------------------------------------------------
const FilterBtn = ({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
      active
        ? 'bg-brand-dark text-white shadow-sm shadow-brand-dark/20'
        : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-dark/40 hover:text-brand-dark'
    }`}
  >
    {label}
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
      {count}
    </span>
  </button>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const InvoiceManagement = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [clients, setClients]           = useState<ClientRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [searchTerm, setSearchTerm]     = useState('');
  const [updatingId, setUpdatingId]     = useState<string | null>(null);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen]         = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptsModalOpen, setIsReceiptsModalOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceReceipts, setInvoiceReceipts] = useState<ReceiptRecord[]>([]);
  const [isSubmitting, setIsSubmitting]       = useState(false);

  // New Invoice Form
  const [newInvForm, setNewInvForm] = useState({
    clientId: '',
    serviceName: '',
    amount: '',
    vatIncluded: true,
    billingType: 'one_time',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    paymentModeType: 'full', // full | partial | advance
    amountPaid: '',
    paymentMethod: 'bank_transfer', // cash | bank_transfer | cheque | card
    paymentLabel: 'Payment Installment',
    notes: '',
  });

  // ── Fetch Invoices & Clients ──────────────────────────────────────────────
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [invRes, clientRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            id, invoice_number, client_id, amount, vat_amount, status, billing_type, due_date, created_at, notes,
            clients(company_name),
            profiles(full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, company_name').order('company_name'),
      ]);

      if (invRes.error) throw invRes.error;
      setInvoices((invRes.data as Invoice[]) || []);
      setClients((clientRes.data as ClientRecord[]) || []);
    } catch (err) {
      console.error('InvoiceManagement fetch error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('accountant-invoices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // ── Fetch Receipts for Selected Invoice ────────────────────────────────────
  const fetchReceipts = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      setInvoiceReceipts((data as ReceiptRecord[]) || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    }
  };

  // ── Create New Invoice ────────────────────────────────────────────────────
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvForm.clientId || !newInvForm.amount) {
      alert(isAr ? 'يرجى اختيار العميل وإدخال المبلغ' : 'Please select client and enter amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const baseAmt = parseFloat(newInvForm.amount) || 0;
      const vatAmt  = newInvForm.vatIncluded ? +(baseAmt * 0.05).toFixed(3) : 0;
      const invNum  = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase.from('invoices').insert([{
        invoice_number: invNum,
        client_id: newInvForm.clientId,
        amount: baseAmt + vatAmt,
        vat_amount: vatAmt,
        billing_type: newInvForm.billingType,
        status: 'unpaid',
        due_date: newInvForm.dueDate,
        notes: newInvForm.notes || newInvForm.serviceName || null,
        created_by: user?.id || null,
      }]);

      if (error) throw error;

      alert(isAr ? 'تم إنشاء الفاتورة بنجاح!' : 'Invoice created successfully!');
      setIsNewModalOpen(false);
      setNewInvForm({ clientId: '', serviceName: '', amount: '', vatIncluded: true, billingType: 'one_time', dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], notes: '' });
      fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Error creating invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Payment Modal ────────────────────────────────────────────────────
  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    fetchReceipts(inv.id);
    setPaymentForm({
      paymentModeType: 'full',
      amountPaid: inv.amount.toString(),
      paymentMethod: 'bank_transfer',
      paymentLabel: isAr ? 'دفعة فاتورة' : 'Invoice Payment',
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  // ── Process Payment & Create Receipt ──────────────────────────────────────
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const paidAmt = parseFloat(paymentForm.amountPaid) || 0;
    if (paidAmt <= 0) {
      alert(isAr ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert Receipt
      const rcpNum = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: rcpErr } = await supabase.from('receipts').insert([{
        receipt_number: rcpNum,
        invoice_id: selectedInvoice.id,
        amount_paid: paidAmt,
        payment_mode: paymentForm.paymentMethod,
        payment_label: paymentForm.paymentLabel || (paymentForm.paymentModeType === 'advance' ? 'Advance Payment' : 'Partial Payment'),
        notes: paymentForm.notes || null,
        created_by: user?.id || null,
      }]);

      if (rcpErr) throw rcpErr;

      // 2. Compute total paid so far
      const { data: allRcps } = await supabase.from('receipts').select('amount_paid').eq('invoice_id', selectedInvoice.id);
      const totalPaidSoFar = (allRcps || []).reduce((sum, r) => sum + (parseFloat(r.amount_paid) || 0), 0);

      // 3. Determine new invoice status
      const newStatus = totalPaidSoFar >= selectedInvoice.amount ? 'paid' : 'partially_paid';

      await supabase.from('invoices').update({ status: newStatus }).eq('id', selectedInvoice.id);

      // 4. Notify CRM / Management
      await supabase.from('notifications').insert([{
        role: 'manager',
        type: 'payment_received',
        title: isAr ? 'تم استلام دفعة من العميل' : 'Payment Received from Client',
        message: `Received OMR ${paidAmt.toFixed(3)} for Invoice #${selectedInvoice.invoice_number}. Invoice status: ${newStatus.toUpperCase()}`,
        ref_id: selectedInvoice.id,
        ref_table: 'invoices',
      }]);

      alert(isAr
        ? `تم تسجيل الدفعة وإنشاء السند برقم ${rcpNum} بنجاح! 🧾`
        : `Payment recorded & Receipt #${rcpNum} created successfully! 🧾`
      );

      setIsPaymentModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Error processing payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open View Receipts ────────────────────────────────────────────────────
  const openReceiptsModal = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    await fetchReceipts(inv.id);
    setIsReceiptsModalOpen(true);
  };

  // ── PDF Receipt Generator ─────────────────────────────────────────────────
  const generatePDFReceipt = (rcp: ReceiptRecord, inv: Invoice) => {
    const doc = new jsPDF();
    const clientName = inv.clients?.company_name || 'Valued Client';

    // Header
    doc.setFillColor(161, 18, 18); // Maisarah Red
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MAISARAH ACCOUNTING SERVICES', 14, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Payment Receipt / سند قبض رسمـي', 14, 30);

    // Receipt Meta Box
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECEIPT NO: ${rcp.receipt_number}`, 14, 52);
    doc.text(`INVOICE NO: ${inv.invoice_number}`, 120, 52);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(rcp.paid_at).toLocaleDateString()}`, 14, 60);
    doc.text(`Payment Mode: ${rcp.payment_mode.toUpperCase()}`, 120, 60);

    // Client Details Box
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(14, 68, 182, 28, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.text('RECEIVED FROM:', 20, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName, 20, 86);

    // Payment Summary Table
    autoTable(doc, {
      startY: 104,
      head: [['Description / Label', 'Payment Method', 'Amount Paid (OMR)']],
      body: [
        [
          rcp.payment_label || 'Service Payment',
          rcp.payment_mode.toUpperCase(),
          `${formatOMR(rcp.amount_paid)} OMR`
        ]
      ],
      headStyles: { fillColor: [161, 18, 18] },
      styles: { fontSize: 10 },
    });

    // Total Banner
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, finalY, 182, 25, 3, 3, 'FD');

    doc.setTextColor(22, 101, 52);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL PAID: OMR ${formatOMR(rcp.amount_paid)}`, 20, finalY + 16);

    // Stamp / Footer
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('This is an electronically generated receipt by Maisarah ERP platform.', 14, 270);
    doc.text('Thank you for your business!', 14, 276);

    doc.save(`${rcp.receipt_number}_${clientName.replace(/\s+/g, '_')}.pdf`);
  };

  // ── Filter + Search ───────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const status  = isOverdue(inv) && inv.status !== 'paid' ? 'overdue' : inv.status;
    const matchF  = filter === 'all' || status === filter || inv.status === filter;
    const matchS  = !searchTerm ||
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchF && matchS;
  });

  const counts = {
    all:            invoices.length,
    paid:           invoices.filter(i => i.status === 'paid').length,
    partially_paid: invoices.filter(i => i.status === 'partially_paid').length,
    unpaid:         invoices.filter(i => i.status === 'unpaid').length,
    overdue:        invoices.filter(i => i.status === 'overdue' || isOverdue(i)).length,
  };

  const totalAmount  = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmount   = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const unpaidAmount = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} className="text-brand-dark" />
            {t('accountant.invoiceManagement')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAr ? `${invoices.length} فاتورة إجمالاً` : `${invoices.length} total invoices`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded-xl hover:bg-brand-dark/90 transition text-xs font-bold shadow-md shadow-brand-dark/20"
          >
            <Plus size={16} /> {isAr ? 'فاتورة جديدة' : '+ New Invoice'}
          </button>
          <button
            onClick={() => fetchData()}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-brand-dark hover:border-brand-dark/30 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Totals Strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? 'إجمالي المعروض' : 'Showing Total', value: formatOMR(totalAmount),  cls: 'text-gray-800' },
          { label: isAr ? 'مدفوع'           : 'Paid',          value: formatOMR(paidAmount),   cls: 'text-green-600' },
          { label: isAr ? 'غير مدفوع'       : 'Unpaid',        value: formatOMR(unpaidAmount), cls: 'text-brand-dark' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">OMR · {s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Table Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-50 space-y-3">
          <div className="flex flex-wrap gap-2">
            <FilterBtn active={filter === 'all'}            onClick={() => setFilter('all')}            label={t('accountant.filterAll')}           count={counts.all} />
            <FilterBtn active={filter === 'paid'}           onClick={() => setFilter('paid')}           label={t('accountant.filterPaid')}          count={counts.paid} />
            <FilterBtn active={filter === 'partially_paid'} onClick={() => setFilter('partially_paid')} label={isAr ? 'جزئي' : 'Partial'}            count={counts.partially_paid} />
            <FilterBtn active={filter === 'unpaid'}         onClick={() => setFilter('unpaid')}         label={t('accountant.filterUnpaid')}        count={counts.unpaid} />
            <FilterBtn active={filter === 'overdue'}        onClick={() => setFilter('overdue')}        label={t('accountant.filterOverdue')}       count={counts.overdue} />
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder={t('accountant.searchInvoices')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full ps-9 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-gray-50 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-14">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-14 text-gray-400">
            <FileText size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('accountant.noInvoices')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-start">{t('accountant.invoiceNo')}</th>
                  <th className="px-5 py-3 text-start">{t('accountant.client')}</th>
                  <th className="px-5 py-3 text-start">{t('accountant.amount')}</th>
                  <th className="px-5 py-3 text-start">{isAr ? 'النوع' : 'Billing'}</th>
                  <th className="px-5 py-3 text-start">{t('accountant.dueDate')}</th>
                  <th className="px-5 py-3 text-start">{t('accountant.status')}</th>
                  <th className="px-5 py-3 text-center">{t('accountant.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => {
                  const overdue = isOverdue(inv);
                  const displayStatus = overdue && inv.status !== 'paid' ? 'overdue' : inv.status;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-800 text-sm">{inv.invoice_number}</span>
                        {inv.notes && <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{inv.notes}</p>}
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-700">
                        {inv.clients?.company_name || '—'}
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-800">
                        {formatOMR(inv.amount)} <span className="text-xs text-gray-400 font-normal">OMR</span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-gray-600 capitalize">
                        {inv.billing_type || 'one_time'}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={displayStatus} isAr={isAr} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <DollarSign size={12} /> {isAr ? 'تحصيل دفعة' : 'Collect Payment'}
                            </button>
                          )}
                          <button
                            onClick={() => openReceiptsModal(inv)}
                            className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Receipt size={12} /> {isAr ? 'السندات' : 'Receipts'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Create New Invoice ───────────────────────────────── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <FileText className="text-brand-dark" size={20} />
                {isAr ? 'إنشاء فاتورة جديدة' : 'Create New Invoice'}
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'العميل *' : 'Client *'}</label>
                <select
                  required
                  value={newInvForm.clientId}
                  onChange={e => setNewInvForm(p => ({ ...p, clientId: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-dark"
                >
                  <option value="">{isAr ? '-- اختر العميل --' : '-- Select Client --'}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'المبلغ الأساسي (OMR) *' : 'Amount (OMR) *'}</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="150.000"
                    value={newInvForm.amount}
                    onChange={e => setNewInvForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-dark"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'نوع الفاتورة' : 'Billing Type'}</label>
                  <select
                    value={newInvForm.billingType}
                    onChange={e => setNewInvForm(p => ({ ...p, billingType: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-dark"
                  >
                    <option value="one_time">{isAr ? 'مرة واحدة' : 'One-Time'}</option>
                    <option value="partial">{isAr ? 'دفعة جزئية / أقساط' : 'Partial / Installments'}</option>
                    <option value="advance">{isAr ? 'دفعة مقدمة' : 'Advance Payment'}</option>
                    <option value="recurring">{isAr ? 'شهري متكرر' : 'Monthly Recurring'}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <input
                  type="checkbox"
                  id="vatCheck"
                  checked={newInvForm.vatIncluded}
                  onChange={e => setNewInvForm(p => ({ ...p, vatIncluded: e.target.checked }))}
                  className="rounded accent-brand-dark w-4 h-4"
                />
                <label htmlFor="vatCheck" className="cursor-pointer font-semibold">
                  {isAr ? 'إضافة ضريبة القيمة المضافة (5% VAT)' : 'Add 5% Oman VAT Tax'}
                  {newInvForm.amount && newInvForm.vatIncluded && (
                    <span className="block text-[10px] text-amber-600">
                      Total with VAT: OMR {(parseFloat(newInvForm.amount) * 1.05).toFixed(3)}
                    </span>
                  )}
                </label>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                <input
                  type="date"
                  value={newInvForm.dueDate}
                  onChange={e => setNewInvForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'ملاحظات / بيان الخدمة' : 'Notes / Service Description'}</label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'مثال: خدمات إعداد الإقرار الضريبي' : 'e.g. VAT Audit & Return Filing Services'}
                  value={newInvForm.notes}
                  onChange={e => setNewInvForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand-dark"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-brand-dark text-white rounded-xl hover:bg-brand-dark/90"
                >
                  {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'إنشاء الفاتورة' : 'Create Invoice')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Collect Payment & Create Receipt ──────────────────── */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <DollarSign className="text-green-600" size={20} />
                  {isAr ? 'تحصيل دفعة وإنشاء سند' : 'Collect Payment & Issue Receipt'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Invoice #{selectedInvoice.invoice_number} · Total: OMR {formatOMR(selectedInvoice.amount)}
                </p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'طريقة التحصيل' : 'Payment Type'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'full', label: isAr ? 'كامل المبلغ' : 'Full Payment' },
                    { id: 'partial', label: isAr ? 'دفعة جزئية' : 'Partial Payment' },
                    { id: 'advance', label: isAr ? 'دفعة مقدمة' : 'Advance Payment' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentForm(p => ({
                          ...p,
                          paymentModeType: m.id,
                          amountPaid: m.id === 'full' ? selectedInvoice.amount.toString() : ''
                        }));
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition ${
                        paymentForm.paymentModeType === m.id
                          ? 'bg-green-700 text-white border-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'المبلغ المحصل (OMR) *' : 'Amount Paid (OMR) *'}</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="0.000"
                  value={paymentForm.amountPaid}
                  onChange={e => setPaymentForm(p => ({ ...p, amountPaid: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-green-600 font-bold text-green-700 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'وسيلة الدفع' : 'Payment Method'}</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                  >
                    <option value="bank_transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="cash">{isAr ? 'نقداً' : 'Cash'}</option>
                    <option value="cheque">{isAr ? 'شيك' : 'Cheque'}</option>
                    <option value="card">{isAr ? 'بطاقة ائتمان' : 'Card'}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'تسمية الدفعة' : 'Payment Label'}</label>
                  <input
                    type="text"
                    placeholder="e.g. VAT Installment 1"
                    value={paymentForm.paymentLabel}
                    onChange={e => setPaymentForm(p => ({ ...p, paymentLabel: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">{isAr ? 'ملاحظات' : 'Notes / Reference'}</label>
                <input
                  type="text"
                  placeholder={isAr ? 'رقم التحويل البنكي أو ملاحظة' : 'e.g. Bank Ref #987123'}
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-green-700 text-white rounded-xl hover:bg-green-800"
                >
                  {isSubmitting ? (isAr ? 'جاري التحصيل...' : 'Processing...') : (isAr ? 'إصدار السند' : 'Issue Receipt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: View Receipts for Invoice ────────────────────────── */}
      {isReceiptsModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <Receipt className="text-blue-600" size={20} />
                  {isAr ? 'سندات الفاتورة' : 'Invoice Receipts History'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Invoice #{selectedInvoice.invoice_number} · Client: {selectedInvoice.clients?.company_name || 'Client'}
                </p>
              </div>
              <button onClick={() => setIsReceiptsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {invoiceReceipts.length === 0 ? (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <Receipt size={36} className="mx-auto opacity-30" />
                <p className="text-sm">{isAr ? 'لا توجد سندات قبض مسجلة لهذه الفاتورة بعد' : 'No payment receipts issued for this invoice yet.'}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pe-1">
                {invoiceReceipts.map(rcp => (
                  <div key={rcp.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-800">{rcp.receipt_number}</span>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700 rounded-full uppercase">
                          {rcp.payment_mode}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {rcp.payment_label || 'Payment'} · {new Date(rcp.paid_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <span className="font-bold text-green-700 text-base">{formatOMR(rcp.amount_paid)}</span>
                        <span className="text-xs text-gray-400 block">OMR</span>
                      </div>
                      <button
                        onClick={() => generatePDFReceipt(rcp, selectedInvoice)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-dark text-white rounded-xl text-xs font-bold hover:bg-brand-dark/90 transition shadow-sm"
                      >
                        <Download size={12} /> PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsReceiptsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl"
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

export default InvoiceManagement;
