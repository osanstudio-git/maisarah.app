import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet,
  FileDown,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ClientPayment {
  clientId: string;
  companyName: string;
  totalInvoiced: number;
  totalPaid: number;
  totalUnpaid: number;
  invoiceCount: number;
  paidCount: number;
  unpaidCount: number;
  paidRatio: number;
  lastPaymentDate: string | null;
  invoices: InvoiceRow[];
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatOMR = (val: number) =>
  new Intl.NumberFormat('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val);

// ---------------------------------------------------------------------------
// Status mini-badge
// ---------------------------------------------------------------------------
const MiniStatus = ({ status, isAr }: { status: string; isAr: boolean }) => {
  const map: Record<string, string> = {
    paid:    'bg-green-100 text-green-700',
    unpaid:  'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, [string, string]> = {
    paid:    ['مدفوعة', 'Paid'],
    unpaid:  ['غير مدفوعة', 'Unpaid'],
    overdue: ['متأخرة', 'Overdue'],
  };
  return (
    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {isAr ? (labels[status]?.[0] || status) : (labels[status]?.[1] || status)}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const ClientPayments = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [clients, setClients]       = useState<ClientPayment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField]   = useState<'totalInvoiced' | 'paidRatio' | 'companyName'>('totalInvoiced');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch & aggregate ─────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, status, due_date, created_at, client_id, clients(company_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by client
      const map = new Map<string, ClientPayment>();

      (data || []).forEach((inv: any) => {
        const cid  = inv.client_id;
        const name = inv.clients?.company_name || (isAr ? 'غير محدد' : 'Unknown Client');
        if (!cid) return;

        if (!map.has(cid)) {
          map.set(cid, {
            clientId: cid, companyName: name,
            totalInvoiced: 0, totalPaid: 0, totalUnpaid: 0,
            invoiceCount: 0, paidCount: 0, unpaidCount: 0,
            paidRatio: 0, lastPaymentDate: null, invoices: [],
          });
        }

        const c = map.get(cid)!;
        const amount = parseFloat(inv.amount) || 0;
        c.totalInvoiced += amount;
        c.invoiceCount++;
        c.invoices.push({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount,
          status: inv.status,
          due_date: inv.due_date,
          created_at: inv.created_at,
        });

        if (inv.status === 'paid') {
          c.totalPaid += amount;
          c.paidCount++;
          if (!c.lastPaymentDate || inv.created_at > c.lastPaymentDate) {
            c.lastPaymentDate = inv.created_at;
          }
        } else {
          c.totalUnpaid += amount;
          c.unpaidCount++;
        }
      });

      // Compute ratio
      const result = Array.from(map.values()).map(c => ({
        ...c,
        paidRatio: c.invoiceCount > 0 ? Math.round((c.paidCount / c.invoiceCount) * 100) : 0,
      }));

      setClients(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Sort + filter ─────────────────────────────────────────────────────────
  const sorted = [...clients]
    .filter(c => c.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'companyName') return mul * a.companyName.localeCompare(b.companyName);
      return mul * (a[sortField] - b[sortField]);
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown size={13} /> : <ChevronUp size={13} />)
      : <ChevronDown size={13} className="opacity-30" />;

  // ── Totals ────────────────────────────────────────────────────────────────
  const grandTotal  = clients.reduce((s, c) => s + c.totalInvoiced, 0);
  const grandPaid   = clients.reduce((s, c) => s + c.totalPaid, 0);
  const grandUnpaid = clients.reduce((s, c) => s + c.totalUnpaid, 0);

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Maisarah — Client Payments Report', 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total Invoiced: ${formatOMR(grandTotal)} OMR`, 14, 21);

    autoTable(doc, {
      head: [[
        isAr ? 'العميل' : 'Client',
        isAr ? 'إجمالي الفواتير' : 'Total Invoiced',
        isAr ? 'مدفوع' : 'Paid',
        isAr ? 'غير مدفوع' : 'Unpaid',
        isAr ? 'الفواتير' : '# Invoices',
        isAr ? 'نسبة السداد' : 'Collection %',
      ]],
      body: sorted.map(c => [
        c.companyName,
        `${formatOMR(c.totalInvoiced)} OMR`,
        `${formatOMR(c.totalPaid)} OMR`,
        `${formatOMR(c.totalUnpaid)} OMR`,
        c.invoiceCount,
        `${c.paidRatio}%`,
      ]),
      startY: 25,
      headStyles: { fillColor: [161, 18, 18] },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      foot: [[isAr ? 'الإجمالي' : 'TOTAL', `${formatOMR(grandTotal)} OMR`, `${formatOMR(grandPaid)} OMR`, `${formatOMR(grandUnpaid)} OMR`, clients.reduce((s, c) => s + c.invoiceCount, 0), '']],
      footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
    });

    doc.save('maisarah_client_payments.pdf');
  };

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    const summary = sorted.map(c => ({
      [isAr ? 'العميل' : 'Client']:              c.companyName,
      [isAr ? 'إجمالي الفواتير (OMR)' : 'Total Invoiced (OMR)']: c.totalInvoiced,
      [isAr ? 'مدفوع (OMR)' : 'Paid (OMR)']:    c.totalPaid,
      [isAr ? 'غير مدفوع (OMR)' : 'Unpaid (OMR)']: c.totalUnpaid,
      [isAr ? 'عدد الفواتير' : '# Invoices']:    c.invoiceCount,
      [isAr ? 'نسبة السداد %' : 'Collection %']: `${c.paidRatio}%`,
      [isAr ? 'آخر دفعة' : 'Last Payment']:       c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString() : '—',
    }));

    // Detailed sheet (all invoices)
    const detail: any[] = [];
    sorted.forEach(c =>
      c.invoices.forEach(inv => detail.push({
        [isAr ? 'العميل' : 'Client']:       c.companyName,
        [isAr ? 'رقم الفاتورة' : 'Invoice']: inv.invoice_number,
        [isAr ? 'المبلغ' : 'Amount (OMR)']: inv.amount,
        [isAr ? 'الحالة' : 'Status']:        inv.status,
        [isAr ? 'تاريخ الاستحقاق' : 'Due']: inv.due_date || '—',
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), isAr ? 'ملخص العملاء' : 'Client Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail),  isAr ? 'تفاصيل الفواتير' : 'Invoice Detail');
    XLSX.writeFile(wb, 'maisarah_client_payments.xlsx');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-brand-dark" />
            {isAr ? 'مدفوعات العملاء' : 'Client Payments'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAr ? `${clients.length} عميل · إجمالي ${formatOMR(grandTotal)} OMR` : `${clients.length} clients · ${formatOMR(grandTotal)} OMR total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-brand-dark transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded-xl hover:bg-red-800 transition text-xs font-bold shadow-sm shadow-brand-dark/20"
          >
            <FileDown size={15} />
            {isAr ? 'تصدير PDF' : 'Export PDF'}
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white rounded-xl hover:bg-green-800 transition text-xs font-bold"
          >
            <FileSpreadsheet size={15} />
            {isAr ? 'تصدير Excel' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Grand Totals Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAr ? 'إجمالي الفواتير' : 'Total Invoiced', value: grandTotal,  icon: <TrendingUp size={18} />, cls: 'bg-blue-50 text-blue-600' },
          { label: isAr ? 'محصَّل' : 'Total Collected',          value: grandPaid,   icon: <CheckCircle2 size={18} />, cls: 'bg-green-50 text-green-600' },
          { label: isAr ? 'مستحق' : 'Outstanding',               value: grandUnpaid, icon: <Clock size={18} />, cls: 'bg-red-50 text-brand-dark' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.cls} flex-shrink-0`}>{s.icon}</div>
            <div>
              <div className="font-bold text-gray-800 text-sm">{formatOMR(s.value)}</div>
              <div className="text-[10px] text-gray-400 font-medium mt-0.5">OMR · {s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder={isAr ? 'بحث عن عميل...' : 'Search client...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full ps-9 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none
                focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-gray-50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-14">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center p-12 text-gray-400">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{isAr ? 'لا توجد بيانات' : 'No payment data found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-start">
                    <button onClick={() => toggleSort('companyName')} className="flex items-center gap-1 hover:text-brand-dark font-bold">
                      {isAr ? 'العميل' : 'Client'} <SortIcon field="companyName" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-start">
                    <button onClick={() => toggleSort('totalInvoiced')} className="flex items-center gap-1 hover:text-brand-dark font-bold">
                      {isAr ? 'إجمالي الفواتير' : 'Invoiced'} <SortIcon field="totalInvoiced" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-start">{isAr ? 'مدفوع' : 'Paid'}</th>
                  <th className="px-5 py-3 text-start">{isAr ? 'مستحق' : 'Unpaid'}</th>
                  <th className="px-5 py-3 text-start">
                    <button onClick={() => toggleSort('paidRatio')} className="flex items-center gap-1 hover:text-brand-dark font-bold">
                      {isAr ? 'نسبة السداد' : 'Collection'} <SortIcon field="paidRatio" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-start">{isAr ? 'عدد الفواتير' : '# Invoices'}</th>
                  <th className="px-5 py-3 text-start"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(c => (
                  <React.Fragment key={c.clientId}>
                    <tr className="hover:bg-gray-50/70 transition-colors">
                      {/* Client */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {c.companyName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{c.companyName}</p>
                            {c.lastPaymentDate && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {isAr ? 'آخر دفعة:' : 'Last:'} {new Date(c.lastPaymentDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Totals */}
                      <td className="px-5 py-4 font-bold text-gray-800">{formatOMR(c.totalInvoiced)} <span className="text-xs text-gray-400 font-normal">OMR</span></td>
                      <td className="px-5 py-4 font-semibold text-green-600">{formatOMR(c.totalPaid)}</td>
                      <td className="px-5 py-4 font-semibold text-brand-dark">{formatOMR(c.totalUnpaid)}</td>
                      {/* Progress */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${c.paidRatio === 100 ? 'bg-green-500' : c.paidRatio >= 70 ? 'bg-amber-400' : 'bg-brand-dark'}`}
                              style={{ width: `${c.paidRatio}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{c.paidRatio}%</span>
                        </div>
                      </td>
                      {/* Count */}
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-600 font-medium">
                          {c.paidCount}✓ / {c.invoiceCount}
                        </span>
                      </td>
                      {/* Expand */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setExpandedId(expandedId === c.clientId ? null : c.clientId)}
                          className="text-xs font-bold text-brand-dark hover:underline flex items-center gap-1"
                        >
                          {expandedId === c.clientId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isAr ? 'الفواتير' : 'Invoices'}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable invoice rows */}
                    {expandedId === c.clientId && (
                      <tr>
                        <td colSpan={7} className="px-5 pb-4 pt-0 bg-gray-50/50">
                          <div className="rounded-xl border border-gray-100 overflow-hidden">
                            {c.invoices.map(inv => (
                              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 bg-white hover:bg-gray-50/60 text-xs">
                                <span className="font-semibold text-gray-700 w-32 truncate">{inv.invoice_number}</span>
                                <span className="text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</span>
                                <span className="font-bold text-gray-800">{formatOMR(inv.amount)} OMR</span>
                                <MiniStatus status={inv.status} isAr={isAr} />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/40 flex justify-between items-center text-xs text-gray-500 font-medium">
            <span>{isAr ? `${sorted.length} عميل` : `${sorted.length} clients`}</span>
            <span className="font-bold text-gray-700">{isAr ? 'الإجمالي:' : 'Total:'} {formatOMR(grandTotal)} OMR</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPayments;
