import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import {
  FileText, Download, CheckCircle2, Search,
  Clock, AlertTriangle, RefreshCw, User,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  notes?: string | null;
  clients?: { company_name: string } | null;
  profiles?: { full_name: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatOMR = (val: number) =>
  new Intl.NumberFormat('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val);

const isOverdue = (inv: Invoice) =>
  inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date();

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
const StatusBadge = ({ status, isAr }: { status: string; isAr: boolean }) => {
  const map: Record<string, { cls: string; label_ar: string; label_en: string; icon: React.ReactNode }> = {
    paid:    { cls: 'bg-green-100 text-green-700', label_ar: 'مدفوعة',     label_en: 'Paid',    icon: <CheckCircle2 size={11} /> },
    unpaid:  { cls: 'bg-amber-100 text-amber-700', label_ar: 'غير مدفوعة', label_en: 'Unpaid',  icon: <Clock size={11} /> },
    overdue: { cls: 'bg-red-100 text-red-700',     label_ar: 'متأخرة',     label_en: 'Overdue', icon: <AlertTriangle size={11} /> },
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
  const isAr = i18n.language === 'ar';

  const [invoices, setInvoices]       = useState<Invoice[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [searchTerm, setSearchTerm]   = useState('');
  const [updatingId, setUpdatingId]   = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      /**
       * Join invoices → clients (company name) + profiles (employee name via created_by).
       * Accountant RLS must allow SELECT on all invoices (not scoped to a single employee).
       */
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, amount, status, due_date, created_at, notes,
          clients(company_name),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as Invoice[]) || []);
    } catch (err) {
      console.error('InvoiceManagement fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── Mark as Paid (optimistic + Supabase update) ───────────────────────────
  const markAsPaid = async (id: string) => {
    setUpdatingId(id);
    // Optimistic update
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv));

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', id);

    if (error) {
      // Rollback on failure
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'unpaid' } : inv));
      console.error('Failed to update invoice:', error.message);
    }
    setUpdatingId(null);
  };

  // ── Mark as Overdue ───────────────────────────────────────────────────────
  const markAsOverdue = async (id: string) => {
    setUpdatingId(id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'overdue' } : inv));
    await supabase.from('invoices').update({ status: 'overdue' }).eq('id', id);
    setUpdatingId(null);
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

  // ── Counts for filter badges ──────────────────────────────────────────────
  const counts = {
    all:     invoices.length,
    paid:    invoices.filter(i => i.status === 'paid').length,
    unpaid:  invoices.filter(i => i.status === 'unpaid').length,
    overdue: invoices.filter(i => i.status === 'overdue' || isOverdue(i)).length,
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalAmount  = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmount   = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const unpaidAmount = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Maisarah - ' + t('accountant.invoicesReport'), 14, 15);
    autoTable(doc, {
      head: [[t('accountant.invoiceNo'), t('accountant.client'), isAr ? 'الموظف' : 'Employee', t('accountant.amount'), t('accountant.dueDate'), t('accountant.status')]],
      body: filtered.map(inv => [
        inv.invoice_number,
        inv.clients?.company_name || '—',
        inv.profiles?.full_name || '—',
        `${formatOMR(inv.amount)} OMR`,
        inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—',
        inv.status,
      ]),
      startY: 22,
      headStyles: { fillColor: [161, 18, 18] },
      styles: { fontSize: 9 },
    });
    doc.save('maisarah_invoices.pdf');
  };

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(inv => ({
      'Invoice No':     inv.invoice_number,
      'Client':         inv.clients?.company_name || '—',
      'Employee':       inv.profiles?.full_name || '—',
      'Amount (OMR)':   inv.amount,
      'Due Date':       inv.due_date || '—',
      'Status':         inv.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, 'maisarah_invoices.xlsx');
  };

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
            onClick={fetchInvoices}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-brand-dark hover:border-brand-dark/30 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition text-xs font-bold"
          >
            <Download size={14} /> PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white rounded-xl hover:bg-green-800 transition text-xs font-bold"
          >
            <Download size={14} /> Excel
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
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <FilterBtn active={filter === 'all'}     onClick={() => setFilter('all')}     label={t('accountant.filterAll')}     count={counts.all} />
            <FilterBtn active={filter === 'paid'}    onClick={() => setFilter('paid')}    label={t('accountant.filterPaid')}    count={counts.paid} />
            <FilterBtn active={filter === 'unpaid'}  onClick={() => setFilter('unpaid')}  label={t('accountant.filterUnpaid')}  count={counts.unpaid} />
            <FilterBtn active={filter === 'overdue'} onClick={() => setFilter('overdue')} label={t('accountant.filterOverdue')} count={counts.overdue} />
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder={t('accountant.searchInvoices')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full ps-9 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none
                focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-gray-50 transition"
            />
          </div>
        </div>

        {/* Loading */}
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
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-start">{t('accountant.invoiceNo')}</th>
                    <th className="px-5 py-3 text-start">{t('accountant.client')}</th>
                    <th className="px-5 py-3 text-start">
                      <span className="flex items-center gap-1"><User size={11} />{isAr ? 'الموظف' : 'Employee'}</span>
                    </th>
                    <th className="px-5 py-3 text-start">{t('accountant.amount')}</th>
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
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50/70 transition-colors ${overdue && inv.status !== 'paid' ? 'bg-red-50/30' : ''}`}
                      >
                        {/* Invoice No */}
                        <td className="px-5 py-4">
                          <span className="font-bold text-gray-800 text-sm">{inv.invoice_number}</span>
                          {inv.notes && (
                            <p className="text-[10px] text-gray-400 truncate max-w-[120px] mt-0.5">{inv.notes}</p>
                          )}
                        </td>

                        {/* Client */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {(inv.clients?.company_name || '?').charAt(0)}
                            </div>
                            <span className="text-gray-700 font-medium">{inv.clients?.company_name || '—'}</span>
                          </div>
                        </td>

                        {/* Employee */}
                        <td className="px-5 py-4 text-gray-500 text-xs">
                          {inv.profiles?.full_name || <span className="text-gray-300">—</span>}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4">
                          <span className="font-bold text-gray-800">{formatOMR(inv.amount)}</span>
                          <span className="text-xs text-gray-400 ms-1">OMR</span>
                        </td>

                        {/* Due Date */}
                        <td className="px-5 py-4">
                          {inv.due_date ? (
                            <span className={`text-sm font-medium ${overdue && inv.status !== 'paid' ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                              {new Date(inv.due_date).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge status={displayStatus} isAr={isAr} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-center">
                          {inv.status !== 'paid' && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => markAsPaid(inv.id)}
                                disabled={updatingId === inv.id}
                                className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700
                                  hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors
                                  disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {updatingId === inv.id
                                  ? <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                                  : <CheckCircle2 size={12} />}
                                {t('accountant.markAsPaid')}
                              </button>
                              {inv.status === 'unpaid' && (
                                <button
                                  onClick={() => markAsOverdue(inv.id)}
                                  disabled={updatingId === inv.id}
                                  className="flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600
                                    hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors
                                    disabled:opacity-50"
                                >
                                  <AlertTriangle size={11} />
                                  {isAr ? 'متأخر' : 'Overdue'}
                                </button>
                              )}
                            </div>
                          )}
                          {inv.status === 'paid' && (
                            <span className="text-[10px] text-green-500 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 size={12} /> {isAr ? 'تم الدفع' : 'Settled'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map(inv => {
                const overdue = isOverdue(inv);
                const displayStatus = overdue && inv.status !== 'paid' ? 'overdue' : inv.status;
                return (
                  <div key={inv.id} className={`p-4 space-y-3 ${overdue && inv.status !== 'paid' ? 'bg-red-50/20' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{inv.clients?.company_name || '—'}</p>
                      </div>
                      <StatusBadge status={displayStatus} isAr={isAr} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{inv.profiles?.full_name || '—'}</span>
                      <span className={overdue && inv.status !== 'paid' ? 'text-red-500 font-bold' : ''}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">{formatOMR(inv.amount)} <span className="text-xs text-gray-400">OMR</span></span>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => markAsPaid(inv.id)}
                          disabled={updatingId === inv.id}
                          className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700
                            hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <CheckCircle2 size={12} />
                          {t('accountant.markAsPaid')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer Summary */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              {isAr ? `يُعرض ${filtered.length} من ${invoices.length}` : `Showing ${filtered.length} of ${invoices.length}`}
            </span>
            <span className="text-xs font-bold text-gray-700">
              {isAr ? 'المجموع:' : 'Total:'} {formatOMR(totalAmount)} OMR
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceManagement;
