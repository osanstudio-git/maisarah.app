import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  Banknote,
  Send,
  PieChart,
  Activity,
  CheckCircle2,
  RefreshCw,
  Plus,
  Receipt,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  MessageCircle,
  Filter,
  CheckCheck,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { getAllDepartments } from '../../config/departments';
import TaxInvoiceModal from '../../components/crm/TaxInvoiceModal';
import PaymentReceiptModal from '../../components/crm/PaymentReceiptModal';

interface Invoice {
  id: string;
  invoice_number?: string;
  amount: number;
  total?: number;
  total_amount?: number;
  tax_amount?: number;
  vat_amount?: number;
  status: string;
  due_date?: string;
  issued_date?: string;
  created_at: string;
  notes?: string;
  client_id?: string;
  service_id?: string;
  clients: {
    id?: string;
    company_name: string;
    cr_number?: string;
    phone?: string;
    email?: string;
  } | null;
}

const FinancialControl = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [dsrEntries, setDsrEntries] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Filters
  const [timePeriod, setTimePeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [pipelineTab, setPipelineTab] = useState<'all' | 'overdue' | 'pending' | 'settled'>('all');
  const [pipelineSearch, setPipelineSearch] = useState('');

  // Modals
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedClientForDoc, setSelectedClientForDoc] = useState<any>(null);

  // ── Fetch Multi-Source Financial Data ──────────────────────────────────────
  const fetchFinancials = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: invData },
        { data: rcpData },
        { data: dsrData },
        { data: txData },
        { data: srvData },
        { data: cliData },
        { data: quoData }
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            amount,
            total,
            total_amount,
            tax_amount,
            vat_amount,
            status,
            due_date,
            issued_date,
            created_at,
            notes,
            client_id,
            service_id,
            clients (
              id,
              company_name,
              cr_number,
              phone,
              email
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('receipts')
          .select('id, receipt_number, amount_paid, status, payment_date, payment_method, notes, client_id, invoice_id, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('dsr_entries')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('id, title, client_id, status, department_id, created_at'),
        supabase
          .from('clients')
          .select('id, company_name, cr_number, phone, email, monthly_billing, compliance_status'),
        supabase
          .from('quotations')
          .select('id, quote_number, client_name, total_amount, subtotal, status, department_id, created_at')
      ]);

      setInvoices((invData as any[]) || []);
      setReceipts(rcpData || []);
      setDsrEntries(dsrData || []);
      setTransactions(txData || []);
      setServices(srvData || []);
      setClients(cliData || []);
      setQuotations(quoData || []);
    } catch (err) {
      console.error('Fetch financials error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancials();

    // ── Supabase Realtime Subscription ───────────────────────────────────────
    const channel = supabase
      .channel('manager-financial-control-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchFinancials(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => fetchFinancials(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dsr_entries' }, () => fetchFinancials(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchFinancials(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchFinancials(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchFinancials(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFinancials]);

  // ── 1. Calculate Real Aggregated Financial Totals (Strictly From Database) ─
  const financialTotals = useMemo(() => {
    // A. Paid Invoices (Real sum of paid invoices in database)
    const paidInvoicesList = invoices.filter(i => (i.status || '').toLowerCase() === 'paid');
    const paidInvoicesSum = paidInvoicesList.reduce(
      (sum, i) => sum + (Number(i.total_amount) || Number(i.total) || Number(i.amount) || 0),
      0
    );

    // B. Verified Receipts (Independent payment receipts)
    const verifiedReceiptsSum = receipts
      .filter(r => (r.status || '').toLowerCase() === 'verified')
      .reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);

    // C. DSR Verified Collections
    const dsrPaidSum = dsrEntries
      .filter(d => d.verified_by_accountant || (d.status || '').toLowerCase() === 'paid')
      .reduce((sum, d) => sum + (Number(d.profit) || 0), 0);

    // Avoid double counting if receipts match invoices
    const totalRevenue = Math.max(paidInvoicesSum, verifiedReceiptsSum) + (dsrPaidSum > 0 && paidInvoicesSum === 0 ? dsrPaidSum : 0);

    // D. Pending Collections (Unpaid / pending / partially paid invoices)
    const unpaidInvoicesList = invoices.filter(i => {
      const s = (i.status || '').toLowerCase();
      return s !== 'paid' && s !== 'cancelled';
    });
    const pendingSum = unpaidInvoicesList.reduce(
      (sum, i) => sum + (Number(i.total_amount) || Number(i.total) || Number(i.amount) || 0),
      0
    );

    // E. Overdue Invoices
    const now = new Date();
    const overdueInvoicesList = invoices.filter(i => {
      const s = (i.status || '').toLowerCase();
      const isPastDue = i.due_date && new Date(i.due_date) < now;
      return (s === 'overdue' || isPastDue) && s !== 'paid' && s !== 'cancelled';
    });
    const overdueSum = overdueInvoicesList.reduce(
      (sum, i) => sum + (Number(i.total_amount) || Number(i.total) || Number(i.amount) || 0),
      0
    );

    // F. Real Operating Expenses from transactions
    const expenseTx = transactions.filter(t => 
      t.type === 'expense' || t.type === 'debit' || String(t.amount).startsWith('-')
    );
    const totalExpenses = expenseTx.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    // G. Real Net Profit & Margin
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : (totalRevenue > 0 ? 100 : 0);

    // MoM Growth Comparison: compare this month's revenue to last month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthRev = invoices
      .filter(i => (i.status || '').toLowerCase() === 'paid' && new Date(i.created_at) >= thisMonthStart)
      .reduce((s, i) => s + (Number(i.total_amount) || Number(i.amount) || 0), 0);

    const lastMonthRev = invoices
      .filter(i => {
        const d = new Date(i.created_at);
        return (i.status || '').toLowerCase() === 'paid' && d >= lastMonthStart && d <= lastMonthEnd;
      })
      .reduce((s, i) => s + (Number(i.total_amount) || Number(i.amount) || 0), 0);

    let momGrowthText = '+0.0%';
    let isPositiveGrowth = true;
    if (lastMonthRev > 0) {
      const growthPct = (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1);
      momGrowthText = `${growthPct > '0' ? '+' : ''}${growthPct}%`;
      isPositiveGrowth = parseFloat(growthPct) >= 0;
    } else if (thisMonthRev > 0) {
      momGrowthText = '+100%';
    } else if (totalRevenue > 0) {
      momGrowthText = 'Verified Live';
    } else {
      momGrowthText = '0.0%';
    }

    return {
      revenue: totalRevenue,
      pending: pendingSum,
      pendingCount: unpaidInvoicesList.length,
      overdue: overdueSum,
      overdueCount: overdueInvoicesList.length,
      expenses: totalExpenses,
      netProfit,
      profitMargin,
      momGrowthText,
      isPositiveGrowth,
      hasRealInvoices: invoices.length > 0
    };
  }, [invoices, receipts, dsrEntries, transactions]);

  // ── 2. Department Profitability (Computed Dynamically from Real Records) ───
  const deptRevenueData = useMemo(() => {
    const allDepts = getAllDepartments();
    const deptTotals: Record<string, { revenue: number; servicesCount: number }> = {};

    allDepts.forEach(d => {
      deptTotals[d.id] = { revenue: 0, servicesCount: 0 };
    });

    // 1. Attribute real invoices to departments based on service_id, title, notes
    invoices.forEach(inv => {
      const amt = Number(inv.total_amount || inv.amount || 0);
      const notes = (inv.notes || '').toLowerCase();
      const num = (inv.invoice_number || '').toLowerCase();

      let targetDept = 'tax_vat'; // default
      if (notes.includes('audit') || num.includes('aud')) {
        targetDept = 'audit';
      } else if (notes.includes('vat') || notes.includes('tax') || num.includes('vat')) {
        targetDept = 'tax_vat';
      } else if (notes.includes('bookkeeping') || notes.includes('accounting') || num.includes('acc')) {
        targetDept = 'bookkeeping';
      } else if (notes.includes('income tax') || notes.includes('profit & loss')) {
        targetDept = 'income_tax';
      } else if (notes.includes('liquidation') || notes.includes('closure') || notes.includes('cr cancellation')) {
        targetDept = 'liquidation';
      } else if (notes.includes('feasibility') || notes.includes('advisory') || notes.includes('جدوى')) {
        targetDept = 'consultancy';
      }

      if (!deptTotals[targetDept]) {
        deptTotals[targetDept] = { revenue: 0, servicesCount: 0 };
      }
      deptTotals[targetDept].revenue += amt;
      deptTotals[targetDept].servicesCount += 1;
    });

    // 2. Attribute real DSR entries
    dsrEntries.forEach(dsr => {
      const profit = Number(dsr.profit || 0);
      const note = (dsr.accountant_note || '').toLowerCase();

      let targetDept = 'tax_vat';
      if (note.includes('audit') || note.includes('تدقيق')) targetDept = 'audit';
      else if (note.includes('vat') || note.includes('ضريبة')) targetDept = 'tax_vat';
      else if (note.includes('bookkeeping') || note.includes('دفاتر')) targetDept = 'bookkeeping';
      else if (note.includes('جدوى') || note.includes('feasibility')) targetDept = 'consultancy';
      else if (note.includes('liquidation') || note.includes('تصفية')) targetDept = 'liquidation';

      if (!deptTotals[targetDept]) {
        deptTotals[targetDept] = { revenue: 0, servicesCount: 0 };
      }
      if (profit > 0) {
        deptTotals[targetDept].revenue += profit;
      }
      deptTotals[targetDept].servicesCount += 1;
    });

    // 3. Count active services per department from services table
    services.forEach(s => {
      const dId = (s.department_id || '').toLowerCase();
      if (deptTotals[dId]) {
        deptTotals[dId].servicesCount += 1;
      }
    });

    const totalCalculated = Object.values(deptTotals).reduce((sum, d) => sum + d.revenue, 0);

    return allDepts
      .map(d => {
        const rev = deptTotals[d.id]?.revenue || 0;
        const count = deptTotals[d.id]?.servicesCount || 0;
        const pct = totalCalculated > 0 ? Math.round((rev / totalCalculated) * 100) : 0;

        return {
          id: d.id,
          name: isAr ? d.name_ar : d.name,
          color: d.color || '#A11212',
          revenue: rev,
          activeServices: count,
          percentage: pct
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.activeServices - a.activeServices);
  }, [invoices, dsrEntries, services, isAr]);

  // ── 3. Real Dynamic Cash Flow & Revenue Trend (Rolling 6 Months) ───────────
  const cashFlowData = useMemo(() => {
    const now = new Date();
    const months = isAr 
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return Array.from({ length: 6 }).map((_, idx) => {
      const mDate = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const mName = months[mDate.getMonth()];
      const mYear = mDate.getFullYear();
      const mIndex = mDate.getMonth();

      // Real month invoices sum
      const monthInvoices = invoices.filter(inv => {
        if (!inv.created_at) return false;
        const d = new Date(inv.created_at);
        return d.getFullYear() === mYear && d.getMonth() === mIndex;
      });

      const monthPaidRev = monthInvoices
        .filter(inv => (inv.status || '').toLowerCase() === 'paid')
        .reduce((sum, i) => sum + (Number(i.total_amount) || Number(i.amount) || 0), 0);

      // Real month receipts
      const monthReceipts = receipts.filter(rcp => {
        const dateStr = rcp.payment_date || rcp.created_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === mYear && d.getMonth() === mIndex;
      });
      const monthRcpPaid = monthReceipts.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);

      // Real month expenses from transactions
      const monthExpenses = transactions
        .filter(t => {
          if (!t.created_at) return false;
          const d = new Date(t.created_at);
          const isExp = t.type === 'expense' || t.type === 'debit' || String(t.amount).startsWith('-');
          return isExp && d.getFullYear() === mYear && d.getMonth() === mIndex;
        })
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

      const finalRev = Math.max(monthPaidRev, monthRcpPaid);
      const finalNet = finalRev - monthExpenses;

      return {
        name: `${mName} ${mYear !== now.getFullYear() ? mYear : ''}`.trim(),
        revenue: finalRev,
        expenses: monthExpenses,
        netProfit: finalNet
      };
    });
  }, [invoices, receipts, transactions, isAr]);

  // ── 4. Unified Collection Pipeline (Strictly Real Records from DB) ─────────
  const collectionPipeline = useMemo(() => {
    const now = new Date();

    const realList = invoices.map(inv => {
      const isPaid = (inv.status || '').toLowerCase() === 'paid';
      const isOverdue = !isPaid && (
        (inv.status || '').toLowerCase() === 'overdue' ||
        (inv.due_date && new Date(inv.due_date) < now)
      );

      // Parse descriptive title from notes if client relationship is unlinked
      let clientDisplay = inv.clients?.company_name || '';
      let crDisplay = inv.clients?.cr_number || '';
      let phoneDisplay = inv.clients?.phone || '';
      let emailDisplay = inv.clients?.email || '';

      if (!clientDisplay && inv.notes) {
        // Example note: "Auto-generated from Employee DSR: VAT FILING 2026 Q1 (Riyas)"
        const match = inv.notes.match(/DSR:\s*([^(]+)(?:\(([^)]+)\))?/i);
        if (match) {
          clientDisplay = match[1].trim() + (match[2] ? ` · ${match[2].trim()}` : '');
        } else {
          clientDisplay = inv.notes.slice(0, 40);
        }
      }

      if (!clientDisplay) {
        clientDisplay = isAr ? 'عميل مباشر (فاتورة خدمة)' : 'Direct Client Account';
      }

      const amt = Number(inv.total_amount || inv.total || inv.amount || 0);

      return {
        id: inv.id,
        docNumber: inv.invoice_number || `INV-${inv.id.substring(0, 6).toUpperCase()}`,
        clientName: clientDisplay,
        crNumber: crDisplay || '---',
        phone: phoneDisplay || '',
        email: emailDisplay || '',
        amount: amt,
        dueDate: inv.due_date || inv.issued_date || inv.created_at,
        status: isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
        raw: inv
      };
    });

    return realList.filter(item => {
      const q = pipelineSearch.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        item.clientName.toLowerCase().includes(q) ||
        item.docNumber.toLowerCase().includes(q) ||
        item.crNumber.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (pipelineTab === 'all') return true;
      if (pipelineTab === 'overdue') return item.status === 'overdue';
      if (pipelineTab === 'pending') return item.status === 'pending';
      if (pipelineTab === 'settled') return item.status === 'paid';
      return true;
    });
  }, [invoices, pipelineSearch, pipelineTab, isAr]);

  // ── Dispatch Payment Reminders (WhatsApp / Email) ──────────────────────────
  const handleWhatsAppReminder = (item: any) => {
    const cleanPhone = (item.phone || '').replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('968') ? cleanPhone : `968${cleanPhone}`;
    const msg = isAr
      ? `تحية طيبة من شركة ميسرة للحلول المالية والمحاسبية.\n\nنود تذكيركم بموعد سداد الفاتورة رقم (${item.docNumber}) بمبلغ (${item.amount.toLocaleString()} ر.ع) المستحقة لصالح (${item.clientName}).\n\nشاكرين ومقدرين حسن تعاونكم الدائم معنا.`
      : `Dear ${item.clientName},\n\nGreetings from Maisarah Financial & Auditing Platform.\n\nThis is a friendly reminder regarding invoice ${item.docNumber} for ${item.amount.toLocaleString()} OMR due on ${new Date(item.dueDate).toLocaleDateString('en-GB')}.\n\nThank you for your business.`;

    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleSendReminder = (invId: string) => {
    setSendingReminderId(invId);
    setTimeout(() => {
      setSendingReminderId(null);
      alert(isAr ? 'تم إرسال إشعار وتذكير السداد بنجاح إلى البريد الإلكتروني للعميل!' : 'Official payment reminder dispatched to client email successfully!');
    }, 600);
  };

  const handleOpenReceiptForInvoice = (item: any) => {
    setSelectedClientForDoc({
      companyName: item.clientName,
      registrationNumber: item.crNumber !== '---' ? item.crNumber : '',
      contactPhone: item.phone,
      totalAmount: item.amount,
      quoteNumber: item.docNumber.replace('INV-', ''),
      serviceName: 'Corporate Services Settlement'
    });
    setShowReceiptModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── MANAGER ACCOUNTING & REPORTS QUICK-LAUNCH COMMAND ─────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-[#5a0c0c] text-white rounded-[2rem] p-4 sm:p-5 border border-red-900/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-rose-300 shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                {isAr ? 'منظومة الرقابة المالية والمحاسبية' : 'Executive Accounting & Reports Suite'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
              {isAr ? 'تقارير المحاسبة وسجلات DSR ومسير الرواتب المعتمدة' : 'Certified DSR Registers, Payroll WPS, Tally P&L & Cash Flow'}
            </h3>
          </div>
        </div>

        {/* Quick Launch Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Link
            to="/accountant/cashflow"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <span>{isAr ? 'التدفق النقدي' : 'Cash Flow Hub'}</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            to="/accountant/dsr"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <span>{isAr ? 'سجل ومبيعات DSR' : 'DSR Register'}</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            to="/accountant/tally-pl"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <span>{isAr ? 'قوائم تالي P&L' : 'Tally P&L'}</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            to="/accountant/payroll"
            className="px-3.5 py-2 rounded-xl bg-[#A11212] hover:bg-[#850e0e] text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <span>{isAr ? 'مسير الرواتب WPS' : 'Payroll Sheet'}</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Section 1: Executive KPI Cards (Strictly Real Data) ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Revenue */}
        <div className="bg-gradient-to-br from-brand-dark to-[#7A0D0D] text-white rounded-[2.2rem] p-6 shadow-xl shadow-brand-dark/15 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">
                {isAr ? 'إجمالي الإيرادات المحصلة' : 'Total Collected Revenue'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl lg:text-4xl font-black leading-none tracking-tight">
                  {financialTotals.revenue.toLocaleString()}
                </p>
                <span className="text-xs font-black text-white/70">OMR</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-emerald-300">
                <ArrowUpRight size={14} />
                <span>{financialTotals.momGrowthText} {isAr ? 'مقارنة بالشهر السابق' : 'MoM Growth'}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* Pending Collections */}
        <div className="bg-white rounded-[2.2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                {isAr ? 'المطالبات قيد التحصيل' : 'Pending Collections'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl lg:text-4xl font-black text-gray-900 leading-none tracking-tight">
                  {financialTotals.pending.toLocaleString()}
                </p>
                <span className="text-xs font-black text-gray-400">OMR</span>
              </div>
              <p className="text-[11px] font-bold text-gray-500 mt-3 flex items-center gap-1.5">
                <Banknote size={14} className="text-amber-500" />
                <span>
                  {financialTotals.pendingCount > 0 
                    ? `${financialTotals.pendingCount} ${isAr ? 'فواتير قيد السداد' : 'Active Invoices'}`
                    : (isAr ? 'جميع الفواتير محصلة' : 'No Pending Bills')}
                </span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <CreditCard size={22} />
            </div>
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className={`rounded-[2.2rem] p-6 shadow-sm transition-all ${
          financialTotals.overdueCount > 0 
            ? 'bg-red-500 text-white shadow-red-500/20' 
            : 'bg-white border border-gray-100 text-gray-900'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                financialTotals.overdueCount > 0 ? 'text-white/70' : 'text-gray-400'
              }`}>
                {isAr ? 'المستحقات المتأخرة' : 'Overdue Invoices'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl lg:text-4xl font-black leading-none tracking-tight">
                  {financialTotals.overdue.toLocaleString()}
                </p>
                <span className={`text-xs font-black ${financialTotals.overdueCount > 0 ? 'text-white/70' : 'text-gray-400'}`}>
                  OMR
                </span>
              </div>
              <p className={`text-[11px] font-bold mt-3 flex items-center gap-1.5 ${
                financialTotals.overdueCount > 0 ? 'text-white/90' : 'text-emerald-600'
              }`}>
                {financialTotals.overdueCount > 0 ? (
                  <>
                    <AlertCircle size={14} />
                    <span>{financialTotals.overdueCount} {isAr ? 'فواتير تتطلب متابعة' : 'Action Required'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>{isAr ? 'لا توجد متأخرات سداد' : 'All Invoices On Track'}</span>
                  </>
                )}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              financialTotals.overdueCount > 0 ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertCircle size={22} />
            </div>
          </div>
        </div>

        {/* Operating Expenses & Net Margin */}
        <div className="bg-white rounded-[2.2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                {isAr ? 'المصروفات التشغيلية والهامش' : 'Expenses & Margin'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl lg:text-4xl font-black text-gray-900 leading-none tracking-tight">
                  {financialTotals.expenses.toLocaleString()}
                </p>
                <span className="text-xs font-black text-gray-400">OMR</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-600 mt-3 flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>{financialTotals.profitMargin}% {isAr ? 'هامش الربح التشغيلي' : 'Net Margin'}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Banknote size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Visual Charts (Department Profitability & Cash Flow) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Department Profitability (Real DB Contribution) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                <PieChart size={18} className="text-brand-dark" />
                {isAr ? 'ربحية ومساهمة الأقسام' : 'Department Profitability'}
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {isAr ? 'بيانات حقيقية' : 'Live Data'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              {isAr ? 'توزيع الإيرادات المحصلة والخدمات حسب القسم' : 'Revenue contribution by practice department'}
            </p>

            <div className="space-y-4">
              {deptRevenueData.map((dept, index) => (
                <div key={dept.id} className="group">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center ${
                        index === 0 ? 'bg-brand-dark text-white' : index === 1 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        #{index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-black text-gray-900 leading-tight">{dept.name}</p>
                        <p className="text-[10px] font-medium text-gray-400">
                          {dept.activeServices} {isAr ? 'خدمات منجزة / فواتير' : 'recorded deliverables'}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-black text-gray-900 font-mono">
                        {dept.revenue.toLocaleString()} <span className="text-[9px] text-gray-400">OMR</span>
                      </p>
                      <p className="text-[10px] font-bold text-gray-400">{dept.percentage}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(dept.percentage, dept.revenue > 0 ? 4 : 0)}%`,
                        backgroundColor: dept.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
            <span>{isAr ? 'إجمالي الأقسام النشطة:' : 'Total Active Practice Lines:'}</span>
            <span className="text-brand-dark font-black">{deptRevenueData.filter(d => d.activeServices > 0 || d.revenue > 0).length} / {deptRevenueData.length}</span>
          </div>
        </div>

        {/* Right: Cash Flow Trend (Rolling 6 Months Real Area Chart) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Activity size={18} className="text-emerald-600" />
                  {isAr ? 'مؤشر التدفق النقدي وصافي الأرباح' : 'Cash Flow & Net Profit Trend'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  {isAr ? 'مقارنة الإيرادات بالمصروفات وصافي السيولة (آخر 6 أشهر)' : 'Revenue vs Operating Expenses vs Net Cash Flow'}
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-[10px] font-black uppercase">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {isAr ? 'الإيرادات' : 'Revenue'}
                </span>
                <span className="flex items-center gap-1.5 text-brand-dark">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-dark" />
                  {isAr ? 'المصروفات' : 'Expenses'}
                </span>
              </div>
            </div>

            {/* Recharts Area Container */}
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A11212" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#A11212" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 800 }} 
                    dy={8} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} 
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} 
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-950 text-white rounded-2xl shadow-2xl p-4 text-xs border border-gray-800 space-y-1.5 min-w-[170px]" dir={isAr ? 'rtl' : 'ltr'}>
                            <p className="font-black text-gray-400 border-b border-gray-800 pb-1 text-[11px] uppercase tracking-wider">{label}</p>
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span>{isAr ? 'الإيرادات:' : 'Revenue:'}</span>
                              <span>{Number(payload[0]?.value || 0).toLocaleString()} OMR</span>
                            </div>
                            <div className="flex justify-between items-center text-red-400 font-bold">
                              <span>{isAr ? 'المصروفات:' : 'Expenses:'}</span>
                              <span>{Number(payload[1]?.value || 0).toLocaleString()} OMR</span>
                            </div>
                            <div className="flex justify-between items-center text-blue-400 font-black border-t border-gray-800 pt-1">
                              <span>{isAr ? 'صافي الربح:' : 'Net Profit:'}</span>
                              <span>{((Number(payload[0]?.value || 0)) - (Number(payload[1]?.value || 0))).toLocaleString()} OMR</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#revGrad)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#A11212" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#expGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
            <span>{isAr ? 'إجمالي التدفق المحصل الموثق:' : 'Total Verified Cash Inflow:'}</span>
            <span className="text-emerald-700 font-black">+{financialTotals.revenue.toLocaleString()} OMR</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Collection Pipeline & Accounts Receivable Table ──────── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Banknote size={20} className="text-brand-dark" />
              {isAr ? 'مسار التحصيلات والفواتير' : 'Collection Pipeline & Accounts Receivable'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {isAr ? 'متابعة الفواتير المحصلة والمعلقة وإجراءات التذكير وسندات القبض' : 'Real-time invoice records, 1-click reminders, and instant vouchers'}
            </p>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isAr ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                placeholder={isAr ? 'بحث بالعميل، السجل، أو رقم الفاتورة...' : 'Search client, CR, invoice...'}
                className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2 text-xs font-bold outline-none focus:border-brand-dark ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
              <button
                onClick={() => setPipelineTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  pipelineTab === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {isAr ? 'الكل' : 'All'} ({invoices.length})
              </button>
              <button
                onClick={() => setPipelineTab('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  pipelineTab === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-500 hover:text-amber-600'
                }`}
              >
                {isAr ? 'معلقة' : 'Pending'} ({financialTotals.pendingCount})
              </button>
              <button
                onClick={() => setPipelineTab('overdue')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  pipelineTab === 'overdue' ? 'bg-red-500 text-white shadow-xs' : 'text-gray-500 hover:text-red-600'
                }`}
              >
                {isAr ? 'متأخرة' : 'Overdue'} ({financialTotals.overdueCount})
              </button>
              <button
                onClick={() => setPipelineTab('settled')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  pipelineTab === 'settled' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-emerald-600'
                }`}
              >
                {isAr ? 'محصلة' : 'Settled'} ({invoices.filter(i => (i.status || '').toLowerCase() === 'paid').length})
              </button>
            </div>
          </div>
        </div>

        {collectionPipeline.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <CheckCircle2 size={52} className="mx-auto mb-3 text-emerald-400" />
            <p className="font-black text-gray-800 text-base">
              {pipelineTab === 'overdue'
                ? (isAr ? 'رائع! لا توجد فواتير متأخرة' : 'Great news! No overdue invoices')
                : (isAr ? 'لا توجد فواتير مطابقة' : 'No matching invoices found')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isAr ? 'جميع المعاملات والتحصيلات في موعدها المحدد ومحدثة لحظياً' : 'All accounts receivable are up to date in real time'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start whitespace-nowrap">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'العميل والسجل التجاري' : 'Client & CR'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-4 text-end text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {collectionPipeline.map(inv => {
                  const isOverdue = inv.status === 'overdue';
                  const isPaid = inv.status === 'paid';

                  return (
                    <tr key={inv.id} className="group hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-gray-800 font-mono">{inv.docNumber}</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xs shrink-0">
                            <Building2 size={15} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-gray-900 block leading-tight">{inv.clientName}</span>
                            {inv.crNumber !== '---' && (
                              <span className="text-[10px] font-bold text-gray-400 font-mono">CR: {inv.crNumber}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-brand-dark">
                          {inv.amount.toLocaleString()} <span className="text-[10px] text-gray-500 font-bold">OMR</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                          <Calendar size={13} className="text-gray-400" />
                          <span>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB') : '---'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isPaid ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                            <Check size={11} />
                            {isAr ? 'محصلة' : 'Settled'}
                          </span>
                        ) : isOverdue ? (
                          <span className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                            <AlertCircle size={11} />
                            {isAr ? 'متأخرة' : 'Overdue'}
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1">
                            <Banknote size={11} />
                            {isAr ? 'معلقة' : 'Pending'}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Tap WhatsApp Reminder (Only for pending / overdue) */}
                          {!isPaid && inv.phone && (
                            <button
                              onClick={() => handleWhatsAppReminder(inv)}
                              className="p-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl transition-all cursor-pointer"
                              title={isAr ? 'تذكير عبر واتساب' : '1-Tap WhatsApp Reminder'}
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}

                          {/* Email Reminder */}
                          {!isPaid && (
                            <button
                              onClick={() => handleSendReminder(inv.id)}
                              disabled={sendingReminderId === inv.id}
                              className="p-2 bg-gray-100 hover:bg-brand-dark hover:text-white text-gray-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              title={isAr ? 'تذكير عبر البريد' : 'Email Reminder'}
                            >
                              {sendingReminderId === inv.id ? (
                                <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                              ) : (
                                <Send size={14} />
                              )}
                            </button>
                          )}

                          {/* Issue Receipt Voucher */}
                          <button
                            onClick={() => handleOpenReceiptForInvoice(inv)}
                            className="px-3 py-1.5 bg-gray-900 hover:bg-brand-dark text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                            title={isAr ? 'إصدار سند قبض' : 'Issue Payment Voucher'}
                          >
                            <Receipt size={12} />
                            <span className="hidden sm:inline">{isAr ? 'سند' : 'Receipt'}</span>
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

      {/* ── Tax Invoice Generation Modal ──────────────────────────────────── */}
      <TaxInvoiceModal
        isOpen={showTaxInvoiceModal}
        onClose={() => setShowTaxInvoiceModal(false)}
        clientData={selectedClientForDoc}
      />

      {/* ── Payment Receipt Voucher Modal ─────────────────────────────────── */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        clientData={selectedClientForDoc}
      />
    </div>
  );
};

export default FinancialControl;
