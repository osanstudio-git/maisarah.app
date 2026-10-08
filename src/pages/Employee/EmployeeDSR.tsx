import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet, Plus, Search, Filter, Download, CheckCircle2,
  AlertCircle, Clock, Edit2, Trash2, Check, X, ShieldCheck, Printer,
  Building2, DollarSign, Wallet, ArrowUpRight, TrendingUp, RefreshCw,
  FileText, Receipt, CheckSquare, Eye, CreditCard, Sparkles, Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import {
  getDSREntries, saveDSREntries, addDSREntry, updateDSREntry, deleteDSREntry, type DSREntry
} from '../../utils/dsrSync';
import TaxInvoiceModal from '../../components/crm/TaxInvoiceModal';
import PaymentReceiptModal from '../../components/crm/PaymentReceiptModal';

// Standard Service Catalog with standard prices & default official fees
const SERVICE_CATALOG = [
  { title: 'VAT FILING 2026 Q2', titleAr: 'إقرار ضريبة القيمة المضافة Q2', defaultAmount: 30, defaultGov: 0 },
  { title: 'VAT FILING 2026 Q1', titleAr: 'إقرار ضريبة القيمة المضافة Q1', defaultAmount: 25, defaultGov: 0 },
  { title: 'Feasibility Study', titleAr: 'دراسة جدوى اقتصادية', defaultAmount: 30, defaultGov: 0 },
  { title: 'Company Liquidation', titleAr: 'تصفية وحل شركات', defaultAmount: 175, defaultGov: 0 },
  { title: 'Corporate Tax Return', titleAr: 'إقرار ضريبة الدخل السنوي', defaultAmount: 75, defaultGov: 0 },
  { title: 'Ministry of Labor Attestation', titleAr: 'توثيق وزارة العمل', defaultAmount: 15, defaultGov: 5 },
  { title: 'Chamber of Commerce Certification', titleAr: 'تصديق غرفة تجارة وصناعة عمان', defaultAmount: 20, defaultGov: 4 },
  { title: 'Commercial Registration (CR) Amendment', titleAr: 'تعديل السجل التجاري والأنشطة', defaultAmount: 45, defaultGov: 10 },
  { title: 'Vat Cancellation', titleAr: 'إلغاء التسجيل الضريبي', defaultAmount: 35, defaultGov: 0 },
  { title: 'Audited Financial Statement', titleAr: 'القوائم المالية المدققة', defaultAmount: 250, defaultGov: 0 },
  { title: 'Custom Operational Service', titleAr: 'خدمة محاسبية / إدارية مخصصة', defaultAmount: 50, defaultGov: 0 },
];

export default function EmployeeDSR() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const employeeName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff Member';

  const [entries, setEntries] = useState<DSREntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  // Client database from CRM for 1-click autocomplete
  const [clientsList, setClientsList] = useState<Array<{ id: string; company_name: string; cr_number?: string }>>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DSREntry | null>(null);

  // Official Document Viewer Modals
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [modalClientData, setModalClientData] = useState<any>(null);

  // New Entry Form State
  const [newForm, setNewForm] = useState({
    date: new Date().toISOString().split('T')[0],
    service: 'VAT FILING 2026 Q2',
    company_name: '',
    cr_number: '',
    amount: 30,
    gov_fee: 0,
    status: 'Paid' as 'Paid' | 'Unpaid' | 'Partial',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Mobile Payment' as DSREntry['payment_method'],
    accountant_note: '',
  });

  // Fetch client list from Supabase for instant CR autofill
  useEffect(() => {
    async function fetchClients() {
      try {
        const { data } = await supabase.from('clients').select('id, company_name, cr_number').order('company_name');
        if (data && data.length > 0) {
          setClientsList(data);
        }
      } catch (err) {
        console.warn('Clients fetch note:', err);
      }
    }
    fetchClients();
  }, []);

  // Load DSR entries
  const loadData = useCallback(() => {
    const all = getDSREntries();
    setEntries(all);
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('maisarah_dsr_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('maisarah_dsr_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadData]);

  // Unique service titles for filter
  const uniqueServices = useMemo(() => {
    const set = new Set(entries.map(e => e.service).filter(Boolean));
    return Array.from(set);
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchSearch =
        e.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.cr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.accountant_note && e.accountant_note.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchInvoice =
        invoiceFilter === 'all' ||
        (invoiceFilter === 'true' && e.invoice_issued) ||
        (invoiceFilter === 'false' && !e.invoice_issued);
      const matchSvc = serviceFilter === 'all' || e.service === serviceFilter;

      return matchSearch && matchStatus && matchInvoice && matchSvc;
    });
  }, [entries, searchTerm, statusFilter, invoiceFilter, serviceFilter]);

  // Tasks auto-assigned awaiting employee payment logging
  const pendingPaymentTasks = useMemo(() => {
    return entries.filter(e => e.status === 'Unpaid' || Number(e.amount || 0) === 0);
  }, [entries]);

  // Financial KPIs Overview
  const kpis = useMemo(() => {
    let totalGross = 0;
    let totalGov = 0;
    let totalProfit = 0;
    let totalPaidAmt = 0;
    let unpaidCount = 0;
    let totalInvoicesIssued = 0;

    filteredEntries.forEach(e => {
      totalGross += e.amount || 0;
      totalGov += e.gov_fee || 0;
      totalProfit += e.profit || 0;
      if (e.status === 'Paid') totalPaidAmt += e.amount || 0;
      if (e.status === 'Unpaid') unpaidCount += 1;
      if (e.invoice_issued) totalInvoicesIssued += 1;
    });

    return {
      count: filteredEntries.length,
      totalGross,
      totalGov,
      totalProfit,
      totalPaidAmt,
      unpaidCount,
      totalInvoicesIssued,
    };
  }, [filteredEntries]);

  // When client is selected in the form, auto-fill standard CR
  const handleClientSelect = (clientName: string) => {
    const matched = clientsList.find(c => c.company_name.toLowerCase() === clientName.toLowerCase());
    setNewForm(prev => ({
      ...prev,
      company_name: clientName,
      cr_number: matched?.cr_number ? matched.cr_number.slice(0, 7) : prev.cr_number
    }));
  };

  // When service is selected in form, auto-fill standard pricing and default gov fee
  const handleServiceSelect = (serviceTitle: string) => {
    const matched = SERVICE_CATALOG.find(s => s.title === serviceTitle);
    setNewForm(prev => ({
      ...prev,
      service: serviceTitle,
      amount: matched ? matched.defaultAmount : prev.amount,
      gov_fee: matched ? matched.defaultGov : 0,
    }));
  };

  // Submit New DSR Entry
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.company_name.trim()) {
      alert(isAr ? 'يرجى إدخال اسم العميل / الشركة' : 'Please enter client or company name');
      return;
    }

    // Format CR number to 7 digits if provided
    let cleanCR = newForm.cr_number.trim().replace(/\D/g, '');
    if (cleanCR.length > 7) cleanCR = cleanCR.slice(0, 7);

    addDSREntry({
      date: newForm.date,
      employee_name: employeeName,
      employee_id: user?.id,
      service: newForm.service,
      company_name: newForm.company_name,
      cr_number: cleanCR,
      amount: Number(newForm.amount),
      gov_fee: Number(newForm.gov_fee),
      status: newForm.status,
      payment_date: newForm.status === 'Paid' ? newForm.payment_date : '',
      payment_method: newForm.status === 'Paid' ? newForm.payment_method : '',
      accountant_note: newForm.accountant_note,
      invoice_issued: false,
    });

    // Notify Accounts Portal via Supabase Realtime
    try {
      await supabase.from('notifications').insert([{
        sender_id: user?.id || null,
        recipient_role: 'accountant',
        title: isAr ? 'قيد خدمة جديد في سجل DSR' : 'New DSR Entry Logged',
        message: isAr
          ? `قام ${employeeName} بتسجيل خدمة "${newForm.service}" لشركة ${newForm.company_name} بمبلغ ${newForm.amount} ر.ع (${newForm.status === 'Paid' ? 'مدفوع' : 'معلق'}).`
          : `${employeeName} logged "${newForm.service}" for ${newForm.company_name} (OMR ${newForm.amount}) - [${newForm.status}].`,
        type: 'payment_logged'
      }]);
    } catch (notifErr) {
      console.warn('Accounts notification notice:', notifErr);
    }

    setIsAddModalOpen(false);
    setNewForm({
      date: new Date().toISOString().split('T')[0],
      service: 'VAT FILING 2026 Q2',
      company_name: '',
      cr_number: '',
      amount: 30,
      gov_fee: 0,
      status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Mobile Payment',
      accountant_note: '',
    });
    loadData();
  };

  // Save Edit Modal
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    let cleanCR = (editingEntry.cr_number || '').trim().replace(/\D/g, '');
    if (cleanCR.length > 7) cleanCR = cleanCR.slice(0, 7);

    updateDSREntry(editingEntry.id, {
      ...editingEntry,
      cr_number: cleanCR,
      amount: Number(editingEntry.amount),
      gov_fee: Number(editingEntry.gov_fee),
    });

    setEditingEntry(null);
    loadData();
  };

  // View Tax Invoice Modal
  const handleViewInvoice = (entry: DSREntry) => {
    setModalClientData({
      clientName: entry.company_name,
      companyName: entry.company_name,
      registrationNumber: entry.cr_number,
      totalAmount: entry.amount,
      subtotal: entry.amount,
      quoteNumber: entry.invoice_number || `INV-2026-8801`,
      serviceName: entry.service,
    });
    setShowTaxInvoiceModal(true);
  };

  const handleViewReceipt = (entry: DSREntry) => {
    setModalClientData({
      clientName: entry.company_name,
      companyName: entry.company_name,
      registrationNumber: entry.cr_number,
      totalAmount: entry.amount,
      subtotal: entry.amount,
      quoteNumber: entry.receipt_number || `REC-2026-8801`,
      serviceName: entry.service,
    });
    setShowReceiptModal(true);
  };

  // Export to Excel
  const exportToExcel = () => {
    const dataToExport = filteredEntries.map(e => ({
      'Date': e.date,
      'Employee': e.employee_name,
      'Service': e.service,
      'Company (Customer)': e.company_name,
      'CR (7-Digits)': e.cr_number,
      'Amount (OMR)': e.amount.toFixed(3),
      'Gov (OMR)': e.gov_fee.toFixed(3),
      'Net Profit (OMR)': e.profit.toFixed(3),
      'Status': e.status,
      'Payment Date': e.payment_date,
      'Payment Method': e.payment_method,
      'Accountant Note': e.accountant_note,
      'Invoice Issued': e.invoice_issued ? 'TRUE' : 'FALSE',
      'Invoice Number': e.invoice_number || '',
      'Receipt Number': e.receipt_number || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'My_DSR_Register');
    XLSX.writeFile(workbook, `My_DSR_Register_${employeeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-rose-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-rose-200">
            <Sparkles size={14} />
            {isAr ? `مساحة إنجاز الموظف · ${employeeName}` : `Staff Deliverable Register · ${employeeName}`}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isAr ? 'سجل العمليات والخدمات اليومي (My DSR)' : 'My Daily Service & Execution Register'}
          </h1>
          <p className="text-rose-100 text-sm max-w-2xl font-light">
            {isAr
              ? 'وثق الخدمات المنجزة، والمدفوعات المحصلة برقم السجل التجاري المكون من 7 أرقام لمطابقتها مع قسم المحاسبة وإصدار الفواتير الرسمية تلقائياً.'
              : 'Log your daily service deliverables and customer payments with 7-digit CR numbers to sync automatically with Accounts and generate VAT invoices.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold backdrop-blur-md border border-white/15 transition-all shadow-sm"
          >
            <Download size={16} />
            {isAr ? 'تصدير إكسل' : 'Export Excel'}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-rose-50 text-red-900 rounded-xl text-sm font-bold shadow-lg transition-all"
          >
            <Plus size={16} />
            {isAr ? 'تسجيل خدمة جديدة (DSR)' : '+ Log New Service'}
          </button>
        </div>
      </div>

      {/* Financial KPIs Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'خدماتي المنفذة' : 'My Deliverables'}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{kpis.count}</p>
          <span className="text-[10px] text-gray-400">{isAr ? 'عملية مسجلة' : 'Recorded entries'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'إجمالي المبيعات' : 'Gross Amount'}</p>
          <p className="text-xl font-bold text-blue-600 mt-1">OMR {kpis.totalGross.toFixed(3)}</p>
          <span className="text-[10px] text-blue-400">{isAr ? 'القيمة الشاملة' : 'Total value'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'المحصل (المدفوع)' : 'Collected / Paid'}</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">OMR {kpis.totalPaidAmt.toFixed(3)}</p>
          <span className="text-[10px] text-emerald-500">{isAr ? 'تم التحصيل' : 'Received'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'الرسوم الحكومية' : 'Gov Fees'}</p>
          <p className="text-xl font-bold text-amber-600 mt-1">OMR {kpis.totalGov.toFixed(3)}</p>
          <span className="text-[10px] text-amber-500">{isAr ? 'رسوم الجهات' : 'Official fees'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'صافي أرباح ميسرة' : 'Net Margin'}</p>
          <p className="text-xl font-bold text-purple-600 mt-1">OMR {kpis.totalProfit.toFixed(3)}</p>
          <span className="text-[10px] text-purple-500">{isAr ? 'هامش ميسرة' : 'Net Margin'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'الفواتير الصادرة' : 'Invoices Issued'}</p>
          <p className="text-xl font-bold text-red-700 mt-1">{kpis.totalInvoicesIssued} / {kpis.count}</p>
          <span className="text-[10px] text-red-500">
            {kpis.unpaidCount > 0 ? `${kpis.unpaidCount} ${isAr ? 'غير مدفوعة' : 'unpaid'}` : isAr ? 'الكل معتمد' : 'All cleared'}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالشركة، السجل التجاري (7 أرقام)، الخدمة، الملاحظات...' : 'Search by company, 7-digit CR, service, note...'}
            className="w-full ps-9 pe-4 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-red-700 transition-all"
          />
        </div>

        {/* Service Filter */}
        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-red-700 cursor-pointer"
        >
          <option value="all">{isAr ? 'جميع الخدمات' : 'All Services'}</option>
          {uniqueServices.map(svc => (
            <option key={svc} value={svc}>{svc}</option>
          ))}
        </select>

        {/* Payment Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-red-700 cursor-pointer"
        >
          <option value="all">{isAr ? 'جميع الحالات' : 'All Status'}</option>
          <option value="Paid">{isAr ? 'مدفوع (Paid)' : 'Paid'}</option>
          <option value="Unpaid">{isAr ? 'غير مدفوع (Unpaid)' : 'Unpaid'}</option>
          <option value="Partial">{isAr ? 'جزئي (Partial)' : 'Partial'}</option>
        </select>

        {/* Invoice Issued Filter */}
        <select
          value={invoiceFilter}
          onChange={e => setInvoiceFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-red-700 cursor-pointer"
        >
          <option value="all">{isAr ? 'حالة الفاتورة: الكل' : 'Invoice: All'}</option>
          <option value="true">{isAr ? 'تم إصدار الفاتورة (TRUE)' : 'Invoice Issued (TRUE)'}</option>
          <option value="false">{isAr ? 'بانتظار الفاتورة (FALSE)' : 'Pending Invoice (FALSE)'}</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
            setInvoiceFilter('all');
            setServiceFilter('all');
          }}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          title={isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Auto-Assigned Tasks Awaiting Payment Settlement ──────────────── */}
      {pendingPaymentTasks.length > 0 && (
        <div className="bg-gradient-to-r from-brand-dark/10 via-brand-dark/5 to-transparent border-2 border-brand-dark/20 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand-dark" />
              <h3 className="text-sm font-black text-gray-900">
                {isAr ? 'مهام ومشاريع بانتظار تسجيل التحصيل المالي' : 'Auto-Assigned Tasks Awaiting Payment Entry'}
              </h3>
              <span className="px-2.5 py-0.5 bg-brand-dark text-white rounded-full text-[10px] font-black">
                {pendingPaymentTasks.length} {isAr ? 'مهام' : 'Tasks'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold hidden sm:block">
              {isAr ? 'تم سحب المهام تلقائياً من إدارة العمليات - فقط أدخل المبلغ وطريقة الدفع' : 'Auto-populated from Manager Operations - just confirm amount & payment'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingPaymentTasks.slice(0, 6).map(task => (
              <div key={task.id} className="bg-white border border-brand-dark/20 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-black uppercase text-brand-dark bg-brand-dark/10 px-2 py-0.5 rounded font-mono">
                      CR: {task.cr_number || '1527047'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">{task.date}</span>
                  </div>
                  <p className="font-black text-xs text-gray-900 line-clamp-1">{task.service}</p>
                  <p className="text-[11px] font-bold text-gray-600 truncate">{task.company_name}</p>
                </div>

                <button
                  onClick={() => {
                    setEditingEntry({
                      ...task,
                      amount: task.amount || 30,
                      status: 'Paid',
                      payment_date: new Date().toISOString().split('T')[0],
                      payment_method: 'Mobile Payment'
                    });
                  }}
                  className="w-full py-2 bg-brand-dark hover:bg-brand text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <DollarSign size={14} />
                  <span>{isAr ? 'تسجيل السداد والتحصيل' : 'Enter Payment (OMR)'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DSR Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px] tracking-wider">
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'الخدمة المنفذة' : 'Service'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'الشركة (العميل)' : 'Company (Customer)'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'السجل التجاري (7 أرقام)' : 'CR (7-Digits)'}</th>
                <th className="px-3 py-3.5 text-end border-e border-gray-200">{isAr ? 'المبلغ الإجمالي' : 'Amount'}</th>
                <th className="px-3 py-3.5 text-end border-e border-gray-200">{isAr ? 'الحكومي' : 'Gov Fee'}</th>
                <th className="px-3 py-3.5 text-end border-e border-gray-200">{isAr ? 'هامش الربح' : 'Net Margin'}</th>
                <th className="px-3 py-3.5 text-center border-e border-gray-200">{isAr ? 'حالة السداد' : 'Status'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'تاريخ السداد' : 'Payment Date'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'طريقة الدفع' : 'Payment Method'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'ملاحظة' : 'Note'}</th>
                <th className="px-3 py-3.5 text-center border-e border-gray-200">{isAr ? 'الفاتورة الرسمية' : 'Tax Invoice'}</th>
                <th className="px-3 py-3.5 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.map(e => (
                <tr
                  key={e.id}
                  className={`hover:bg-amber-50/40 transition-colors ${
                    e.status === 'Unpaid' ? 'bg-red-50/20' : e.status === 'Partial' ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Date */}
                  <td className="px-3 py-2.5 font-medium text-gray-600 border-e border-gray-200 whitespace-nowrap">
                    {e.date}
                  </td>

                  {/* Service */}
                  <td className="px-3 py-2.5 font-bold text-gray-900 border-e border-gray-200">
                    {e.service}
                  </td>

                  {/* Company Name */}
                  <td className="px-3 py-2.5 font-bold text-gray-900 border-e border-gray-200">
                    {e.company_name}
                  </td>

                  {/* CR Number (7 Digits) */}
                  <td className="px-3 py-2.5 font-mono text-gray-700 border-e border-gray-200 whitespace-nowrap">
                    {e.cr_number ? (
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-900 border border-gray-200">
                        {e.cr_number}
                      </span>
                    ) : (
                      <span className="text-gray-300 italic">—</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-2.5 text-end font-bold text-gray-900 border-e border-gray-200 whitespace-nowrap">
                    OMR {e.amount.toFixed(3)}
                  </td>

                  {/* Gov Fee */}
                  <td className="px-3 py-2.5 text-end text-amber-700 font-semibold border-e border-gray-200 whitespace-nowrap">
                    OMR {e.gov_fee.toFixed(3)}
                  </td>

                  {/* Profit */}
                  <td className="px-3 py-2.5 text-end font-bold text-emerald-600 border-e border-gray-200 whitespace-nowrap">
                    OMR {e.profit.toFixed(3)}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5 text-center border-e border-gray-200">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        e.status === 'Paid'
                          ? 'bg-emerald-500 text-white'
                          : e.status === 'Unpaid'
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-400 text-gray-900'
                      }`}
                    >
                      {e.status === 'Paid' ? (isAr ? 'مدفوع' : 'Paid') : e.status === 'Unpaid' ? (isAr ? 'غير مدفوع' : 'Unpaid') : (isAr ? 'جزئي' : 'Partial')}
                    </span>
                  </td>

                  {/* Payment Date */}
                  <td className="px-3 py-2.5 text-gray-600 border-e border-gray-200 whitespace-nowrap">
                    {e.payment_date || <span className="text-gray-300">—</span>}
                  </td>

                  {/* Payment Method */}
                  <td className="px-3 py-2.5 text-gray-700 border-e border-gray-200 whitespace-nowrap font-medium">
                    {e.payment_method || <span className="text-gray-300">—</span>}
                  </td>

                  {/* Accountant Note */}
                  <td className="px-3 py-2.5 text-gray-600 border-e border-gray-200 max-w-[200px]">
                    <span className="truncate block font-serif text-[11px] text-gray-500 italic">
                      {e.accountant_note || <span className="text-gray-300 italic">—</span>}
                    </span>
                  </td>

                  {/* Invoice Issued (TRUE/FALSE) */}
                  <td className="px-3 py-2.5 text-center border-e border-gray-200 whitespace-nowrap">
                    {e.invoice_issued ? (
                      <span className="font-mono font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> {isAr ? 'تمت الفوترة (TRUE)' : 'INVOICED'}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                        <Clock size={11} /> {isAr ? 'بانتظار المحاسب' : 'PENDING'}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setEditingEntry({ ...e })}
                        className="p-1.5 text-gray-500 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                        title={isAr ? 'تعديل وتخصيص البيانات' : 'Edit DSR Details'}
                      >
                        <Edit2 size={13} />
                      </button>

                      {e.invoice_issued && (
                        <>
                          <button
                            onClick={() => handleViewInvoice(e)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title={isAr ? 'عرض الفاتورة الضريبية' : 'View Tax Invoice'}
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            onClick={() => handleViewReceipt(e)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title={isAr ? 'عرض سند القبض' : 'View Receipt'}
                          >
                            <Receipt size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ADD NEW DSR ENTRY ──────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 bg-gradient-to-r from-red-900 to-rose-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {isAr ? 'تسجيل خدمة جديدة في سجل DSR' : 'Log New DSR Service'}
                </h3>
                <p className="text-xs text-rose-200 font-light">
                  {isAr ? 'التعبئة التلقائية للأسعار والسجل التجاري وحساب الأرباح مباشرة' : 'Auto-fill pricing, 7-digit CR, and calculate net profit margins'}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'تاريخ الخدمة' : 'Service Date'}</label>
                  <input
                    type="date"
                    value={newForm.date}
                    onChange={e => setNewForm({ ...newForm, date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'الموظف المنفذ' : 'Assigned Staff'}</label>
                  <input
                    type="text"
                    disabled
                    value={employeeName}
                    className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-700 cursor-not-allowed"
                  />
                </div>

                {/* Company / Client Auto-fill */}
                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'اسم الشركة / العميل (اختر للتعرف التلقائي على السجل التجاري) *' : 'Company / Client Name (Select to Auto-fill CR) *'}
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      list="clients-datalist"
                      value={newForm.company_name}
                      onChange={e => handleClientSelect(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة جبل الحديد / ALDAWAHI...' : 'e.g. Jabal Al Hadeed / ALDAWAHI...'}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-bold"
                      required
                    />
                    <datalist id="clients-datalist">
                      {clientsList.map(c => (
                        <option key={c.id} value={c.company_name}>
                          {c.cr_number ? `CR: ${c.cr_number}` : ''}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Service Catalog Auto-fill */}
                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'نوع الخدمة (اختر للتعبئة التلقائية للأسعار والرسوم)' : 'Service Deliverable (Auto-fills standard price)'}
                  </label>
                  <select
                    value={newForm.service}
                    onChange={e => handleServiceSelect(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium cursor-pointer"
                  >
                    {SERVICE_CATALOG.map(s => (
                      <option key={s.title} value={s.title}>
                        {isAr ? `${s.titleAr} (${s.defaultAmount} ر.ع)` : `${s.title} (OMR ${s.defaultAmount})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fixed 7-digit CR Box */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'السجل التجاري (7 أرقام ثابتة)' : 'CR Number (Fixed 7-Digits)'}
                  </label>
                  <input
                    type="text"
                    pattern="[0-9]{7}"
                    maxLength={7}
                    value={newForm.cr_number}
                    onChange={e => setNewForm({ ...newForm, cr_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="1454255"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-mono font-bold tracking-widest"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {isAr ? 'أدخل 7 أرقام (مثال: 1475532)' : '7 numeric digits (e.g. 1475532)'}
                  </span>
                </div>

                {/* Amount */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'المبلغ الإجمالي (ر.ع) *' : 'Total Amount (OMR) *'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newForm.amount}
                    onChange={e => setNewForm({ ...newForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-bold text-blue-700"
                    required
                  />
                </div>

                {/* Gov Fee */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'الرسوم الحكومية (ر.ع)' : 'Government Fee (OMR)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newForm.gov_fee}
                    onChange={e => setNewForm({ ...newForm, gov_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-bold text-amber-700"
                  />
                </div>

                {/* Real-time Calculated Net Profit */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'صافي أرباح ميسرة (تلقائي)' : 'Net Profit Margin'}</label>
                  <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-black text-emerald-700 text-sm">
                    OMR {(newForm.amount - newForm.gov_fee).toFixed(3)}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'حالة السداد' : 'Payment Status'}</label>
                  <select
                    value={newForm.status}
                    onChange={e => setNewForm({ ...newForm, status: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium"
                  >
                    <option value="Paid">{isAr ? 'مدفوع (Paid)' : 'Paid'}</option>
                    <option value="Unpaid">{isAr ? 'غير مدفوع (Unpaid)' : 'Unpaid'}</option>
                    <option value="Partial">{isAr ? 'جزئي (Partial)' : 'Partial'}</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={newForm.payment_method}
                    onChange={e => setNewForm({ ...newForm, payment_method: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium"
                  >
                    <option value="Mobile Payment">{isAr ? 'دفع بالهاتف (Mobile Payment)' : 'Mobile Payment'}</option>
                    <option value="POS">{isAr ? 'جهاز نقاط البيع (POS Terminal)' : 'POS Terminal'}</option>
                    <option value="Bank transfer">{isAr ? 'تحويل بنكي (Bank Transfer)' : 'Bank transfer'}</option>
                    <option value="Cash">{isAr ? 'نقداً (Cash)' : 'Cash'}</option>
                  </select>
                </div>

                {/* Note */}
                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'ملاحظة للمحاسب' : 'Note for Accountant'}
                  </label>
                  <input
                    type="text"
                    value={newForm.accountant_note}
                    onChange={e => setNewForm({ ...newForm, accountant_note: e.target.value })}
                    placeholder={isAr ? 'أي ملاحظات خاصة أو رقم مرجع الإيصال...' : 'Any special notes or transaction ref...'}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Send size={15} />
                  {isAr ? 'تسجيل وإرسال للمحاسبة' : 'Submit & Sync with Accounts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: 1-CLICK CUSTOM EDIT DSR ENTRY ───────────────────────── */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 bg-gradient-to-r from-red-900 to-rose-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {isAr ? 'تعديل وتخصيص قيد DSR' : 'Edit & Customize DSR Entry'}
                </h3>
                <p className="text-xs text-rose-200 font-light">
                  {editingEntry.service} • {editingEntry.company_name}
                </p>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-2 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'السجل التجاري (7 أرقام)' : 'CR Number (7 Digits)'}
                  </label>
                  <input
                    type="text"
                    maxLength={7}
                    value={editingEntry.cr_number}
                    onChange={e => setEditingEntry({ ...editingEntry, cr_number: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'المبلغ (ر.ع)' : 'Amount (OMR)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingEntry.amount}
                    onChange={e => setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-bold text-blue-700"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'الرسوم الحكومية (ر.ع)' : 'Gov Fee (OMR)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingEntry.gov_fee}
                    onChange={e => setEditingEntry({ ...editingEntry, gov_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'صافي الربح' : 'Net Margin'}</label>
                  <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-700">
                    OMR {(editingEntry.amount - editingEntry.gov_fee).toFixed(3)}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'حالة السداد' : 'Payment Status'}</label>
                  <select
                    value={editingEntry.status}
                    onChange={e => setEditingEntry({ ...editingEntry, status: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium"
                  >
                    <option value="Paid">{isAr ? 'مدفوع (Paid)' : 'Paid'}</option>
                    <option value="Unpaid">{isAr ? 'غير مدفوع (Unpaid)' : 'Unpaid'}</option>
                    <option value="Partial">{isAr ? 'جزئي (Partial)' : 'Partial'}</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={editingEntry.payment_method}
                    onChange={e => setEditingEntry({ ...editingEntry, payment_method: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium"
                  >
                    <option value="Mobile Payment">{isAr ? 'دفع بالهاتف' : 'Mobile Payment'}</option>
                    <option value="POS">{isAr ? 'جهاز نقاط البيع (POS)' : 'POS Terminal'}</option>
                    <option value="Bank transfer">{isAr ? 'تحويل بنكي' : 'Bank transfer'}</option>
                    <option value="Cash">{isAr ? 'نقداً' : 'Cash'}</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'الملاحظة' : 'Note'}</label>
                  <input
                    type="text"
                    value={editingEntry.accountant_note || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, accountant_note: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-lg transition"
                >
                  {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {showTaxInvoiceModal && modalClientData && (
        <TaxInvoiceModal
          isOpen={showTaxInvoiceModal}
          onClose={() => setShowTaxInvoiceModal(false)}
          clientData={modalClientData}
        />
      )}

      {/* Payment Receipt Modal */}
      {showReceiptModal && modalClientData && (
        <PaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          clientData={modalClientData}
        />
      )}
    </div>
  );
}
