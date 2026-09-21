import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet, Plus, Search, Filter, Download, CheckCircle2,
  AlertCircle, Clock, Edit2, Trash2, Check, X, ShieldCheck, Printer,
  Building2, DollarSign, Wallet, ArrowUpRight, TrendingUp, RefreshCw,
  FileText, Receipt, CheckSquare, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getDSREntries, saveDSREntries, addDSREntry, updateDSREntry, deleteDSREntry, type DSREntry
} from '../../utils/dsrSync';
import TaxInvoiceModal from '../../components/crm/TaxInvoiceModal';
import PaymentReceiptModal from '../../components/crm/PaymentReceiptModal';

export default function DSRRegister() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [entries, setEntries] = useState<DSREntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  // Inline edit state for note & gov fee
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editGovFee, setEditGovFee] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [editPayMethod, setEditPayMethod] = useState<string>('');
  const [editPayDate, setEditPayDate] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInvoiceGeneratorOpen, setIsInvoiceGeneratorOpen] = useState(false);
  const [selectedEntryForInvoice, setSelectedEntryForInvoice] = useState<DSREntry | null>(null);

  // Official Document Modals
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [modalClientData, setModalClientData] = useState<any>(null);

  // New Entry Form State
  const [newForm, setNewForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_name: 'Shafnas',
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

  // Load DSR entries
  const loadData = useCallback(() => {
    const data = getDSREntries();
    setEntries(data);
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

  // Unique lists for filters
  const uniqueEmployees = useMemo(() => {
    const set = new Set(entries.map(e => e.employee_name).filter(Boolean));
    return Array.from(set);
  }, [entries]);

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
        e.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.accountant_note.toLowerCase().includes(searchTerm.toLowerCase());

      const matchEmp = employeeFilter === 'all' || e.employee_name === employeeFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchInvoice =
        invoiceFilter === 'all' ||
        (invoiceFilter === 'true' && e.invoice_issued) ||
        (invoiceFilter === 'false' && !e.invoice_issued);
      const matchSvc = serviceFilter === 'all' || e.service === serviceFilter;

      return matchSearch && matchEmp && matchStatus && matchInvoice && matchSvc;
    });
  }, [entries, searchTerm, employeeFilter, statusFilter, invoiceFilter, serviceFilter]);

  // Financial KPIs
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

  // Start inline editing
  const startInlineEdit = (e: DSREntry) => {
    setEditingRowId(e.id);
    setEditGovFee(e.gov_fee);
    setEditNote(e.accountant_note);
    setEditStatus(e.status);
    setEditPayMethod(e.payment_method);
    setEditPayDate(e.payment_date || new Date().toISOString().split('T')[0]);
  };

  // Save inline editing
  const saveInlineEdit = (id: string) => {
    updateDSREntry(id, {
      gov_fee: editGovFee,
      accountant_note: editNote,
      status: editStatus,
      payment_method: editPayMethod as any,
      payment_date: editPayDate,
    });
    setEditingRowId(null);
    loadData();
  };

  // Quick 1-Click Invoice Generation
  const handleOpenInvoiceGen = (entry: DSREntry) => {
    setSelectedEntryForInvoice(entry);
    setIsInvoiceGeneratorOpen(true);
  };

  // Confirm Invoice Issuance & Receipt
  const handleIssueOfficialDocuments = () => {
    if (!selectedEntryForInvoice) return;

    const invNum = selectedEntryForInvoice.invoice_number || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const recNum = selectedEntryForInvoice.receipt_number || `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    updateDSREntry(selectedEntryForInvoice.id, {
      invoice_issued: true,
      invoice_number: invNum,
      receipt_number: recNum,
      status: 'Paid',
      payment_date: selectedEntryForInvoice.payment_date || new Date().toISOString().split('T')[0],
      payment_method: selectedEntryForInvoice.payment_method || 'Mobile Payment',
      verified_by_accountant: true,
    });

    setIsInvoiceGeneratorOpen(false);
    loadData();

    // Setup client data for modals
    setModalClientData({
      clientName: selectedEntryForInvoice.company_name,
      companyName: selectedEntryForInvoice.company_name,
      registrationNumber: selectedEntryForInvoice.cr_number,
      totalAmount: selectedEntryForInvoice.amount,
      subtotal: selectedEntryForInvoice.amount,
      quoteNumber: invNum,
      serviceName: selectedEntryForInvoice.service,
    });

    // Prompt to view
    setShowTaxInvoiceModal(true);
  };

  // View existing Tax Invoice / Receipt
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

  // Submit New Entry Form
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.company_name.trim()) {
      alert(isAr ? 'يرجى إدخال اسم الشركة / العميل' : 'Please enter company name');
      return;
    }

    addDSREntry({
      date: newForm.date,
      employee_name: newForm.employee_name,
      service: newForm.service,
      company_name: newForm.company_name,
      cr_number: newForm.cr_number,
      amount: Number(newForm.amount),
      gov_fee: Number(newForm.gov_fee),
      status: newForm.status,
      payment_date: newForm.payment_date,
      payment_method: newForm.payment_method,
      accountant_note: newForm.accountant_note,
      invoice_issued: false,
    });

    setIsAddModalOpen(false);
    setNewForm({
      date: new Date().toISOString().split('T')[0],
      employee_name: 'Shafnas',
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

  // Export to Excel / CSV
  const exportToExcel = () => {
    const dataToExport = filteredEntries.map(e => ({
      'Date': e.date,
      'Employee': e.employee_name,
      'Service': e.service,
      'Company (customer)': e.company_name,
      'CR': e.cr_number,
      'Amount (OMR)': e.amount.toFixed(3),
      'Gov (OMR)': e.gov_fee.toFixed(3),
      'Profit (OMR)': e.profit.toFixed(3),
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DSR_Register');
    XLSX.writeFile(workbook, `Maisarah_DSR_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-rose-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-rose-200">
            <FileSpreadsheet size={14} />
            {isAr ? 'سجل العمليات اليومي' : 'Daily Service Register (DSR)'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isAr ? 'سجل الخدمات اليومي والمبيعات (DSR)' : 'Daily Service & Billing Register'}
          </h1>
          <p className="text-rose-100 text-sm max-w-2xl font-light">
            {isAr
              ? 'متابعة جميع الخدمات المنفذة، الموظفين المعينين، المدفوعات المستلمة، وإصدار الفواتير الضريبية وسندات القبض بنقرة واحدة.'
              : 'Track all department deliverables, staff execution, client payments, and generate official Tax Invoices & Payment Receipts instantly.'}
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
            {isAr ? 'إضافة قيد جديد' : '+ New DSR Record'}
          </button>
        </div>
      </div>

      {/* Financial KPIs Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'إجمالي الخدمات' : 'Total Deliverables'}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{kpis.count}</p>
          <span className="text-[10px] text-gray-400">{isAr ? 'عملية مسجلة' : 'Recorded entries'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'إجمالي المبيعات' : 'Gross Amount'}</p>
          <p className="text-xl font-bold text-blue-600 mt-1">OMR {kpis.totalGross.toFixed(3)}</p>
          <span className="text-[10px] text-blue-400">{isAr ? 'شامل الرسوم' : 'Total value'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'المحصل (المدفوع)' : 'Collected / Paid'}</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">OMR {kpis.totalPaidAmt.toFixed(3)}</p>
          <span className="text-[10px] text-emerald-500">{isAr ? 'تم التحصيل' : 'Received'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'الرسوم الحكومية' : 'Gov Fees'}</p>
          <p className="text-xl font-bold text-amber-600 mt-1">OMR {kpis.totalGov.toFixed(3)}</p>
          <span className="text-[10px] text-amber-500">{isAr ? 'تكاليف الجهات' : 'Official fees'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'صافي الأرباح' : 'Net Profit'}</p>
          <p className="text-xl font-bold text-purple-600 mt-1">OMR {kpis.totalProfit.toFixed(3)}</p>
          <span className="text-[10px] text-purple-500">{isAr ? 'هامش ميسرة' : 'Net Margin'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'فواتير تم إصدارها' : 'Invoices Issued'}</p>
          <p className="text-xl font-bold text-red-700 mt-1">{kpis.totalInvoicesIssued} / {kpis.count}</p>
          <span className="text-[10px] text-red-500">
            {kpis.unpaidCount > 0 ? `${kpis.unpaidCount} ${isAr ? 'معلقة' : 'pending'}` : isAr ? 'الكل جاهز' : 'All cleared'}
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
            placeholder={isAr ? 'بحث بالشركة، السجل التجاري، الخدمة، الموظف، الملاحظة...' : 'Search by company, CR, service, employee, note...'}
            className="w-full ps-9 pe-4 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-red-700 transition-all"
          />
        </div>

        {/* Employee Filter */}
        <select
          value={employeeFilter}
          onChange={e => setEmployeeFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-red-700 cursor-pointer"
        >
          <option value="all">{isAr ? 'جميع الموظفين' : 'All Employees'}</option>
          {uniqueEmployees.map(emp => (
            <option key={emp} value={emp}>{emp}</option>
          ))}
        </select>

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
          <option value="false">{isAr ? 'لم تصدر الفاتورة (FALSE)' : 'No Invoice (FALSE)'}</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm('');
            setEmployeeFilter('all');
            setStatusFilter('all');
            setInvoiceFilter('all');
            setServiceFilter('all');
          }}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          title={isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* DSR Data Table (Matching User Excel Screenshot) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px] tracking-wider">
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'الموظف' : 'Employee'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'الخدمة' : 'Service'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'الشركة (العميل)' : 'Company (customer)'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'السجل التجاري' : 'CR'}</th>
                <th className="px-3 py-3.5 text-end border-e border-gray-200">{isAr ? 'المبلغ' : 'Amount'}</th>
                <th className="px-3 py-3.5 text-end border-e border-gray-200">{isAr ? 'الحكومي' : 'Gov'}</th>
                <th className="px-3 py-3.5 text-end border-e border-gray-200">{isAr ? 'الربح' : 'Profit'}</th>
                <th className="px-3 py-3.5 text-center border-e border-gray-200">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'تاريخ الدفع' : 'Payment Date'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'طريقة الدفع' : 'Payment Method'}</th>
                <th className="px-3 py-3.5 text-start border-e border-gray-200">{isAr ? 'ملاحظة المحاسب' : 'Accountant Note'}</th>
                <th className="px-3 py-3.5 text-center border-e border-gray-200">{isAr ? 'الفاتورة' : 'Invoice Issued'}</th>
                <th className="px-3 py-3.5 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.map(e => {
                const isEditing = editingRowId === e.id;

                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-amber-50/40 transition-colors ${e.status === 'Unpaid' ? 'bg-red-50/20' : e.status === 'Partial' ? 'bg-amber-50/20' : ''
                      }`}
                  >
                    {/* Date */}
                    <td className="px-3 py-2.5 font-medium text-gray-600 border-e border-gray-200 whitespace-nowrap">
                      {e.date}
                    </td>

                    {/* Employee */}
                    <td className="px-3 py-2.5 font-semibold text-gray-900 border-e border-gray-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-800 text-[10px] font-bold flex items-center justify-center">
                          {e.employee_name.charAt(0)}
                        </span>
                        {e.employee_name}
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-3 py-2.5 font-medium text-gray-800 border-e border-gray-200">
                      {e.service}
                    </td>

                    {/* Company Name */}
                    <td className="px-3 py-2.5 font-bold text-gray-900 border-e border-gray-200">
                      {e.company_name}
                    </td>

                    {/* CR */}
                    <td className="px-3 py-2.5 font-mono text-gray-600 border-e border-gray-200">
                      {e.cr_number || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2.5 text-end font-bold text-gray-900 border-e border-gray-200 whitespace-nowrap">
                      OMR {e.amount.toFixed(3)}
                    </td>

                    {/* Gov Fee */}
                    <td className="px-3 py-2.5 text-end text-gray-600 border-e border-gray-200 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={editGovFee}
                          onChange={ev => setEditGovFee(parseFloat(ev.target.value) || 0)}
                          className="w-16 px-1.5 py-0.5 border border-red-700 rounded text-end text-xs outline-none"
                        />
                      ) : (
                        `OMR ${e.gov_fee.toFixed(3)}`
                      )}
                    </td>

                    {/* Profit */}
                    <td className="px-3 py-2.5 text-end font-bold text-emerald-600 border-e border-gray-200 whitespace-nowrap">
                      OMR {(isEditing ? e.amount - editGovFee : e.profit).toFixed(3)}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center border-e border-gray-200">
                      {isEditing ? (
                        <select
                          value={editStatus}
                          onChange={ev => setEditStatus(ev.target.value as any)}
                          className="text-xs border border-red-700 rounded px-1 py-0.5 outline-none"
                        >
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                          <option value="Partial">Partial</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${e.status === 'Paid'
                              ? 'bg-emerald-500 text-white'
                              : e.status === 'Unpaid'
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-400 text-gray-900'
                            }`}
                        >
                          {e.status}
                        </span>
                      )}
                    </td>

                    {/* Payment Date */}
                    <td className="px-3 py-2.5 text-gray-600 border-e border-gray-200 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editPayDate}
                          onChange={ev => setEditPayDate(ev.target.value)}
                          className="text-xs border border-red-700 rounded px-1 py-0.5 outline-none"
                        />
                      ) : (
                        e.payment_date || <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="px-3 py-2.5 text-gray-700 border-e border-gray-200 whitespace-nowrap font-medium">
                      {isEditing ? (
                        <select
                          value={editPayMethod}
                          onChange={ev => setEditPayMethod(ev.target.value)}
                          className="text-xs border border-red-700 rounded px-1 py-0.5 outline-none"
                        >
                          <option value="">-- None --</option>
                          <option value="Mobile Payment">Mobile Payment</option>
                          <option value="POS">POS</option>
                          <option value="Bank transfer">Bank transfer</option>
                          <option value="Cash">Cash</option>
                        </select>
                      ) : (
                        e.payment_method || <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Accountant Note */}
                    <td className="px-3 py-2.5 text-gray-600 border-e border-gray-200 max-w-[220px]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editNote}
                          onChange={ev => setEditNote(ev.target.value)}
                          placeholder="Note..."
                          className="w-full px-1.5 py-0.5 border border-red-700 rounded text-xs outline-none"
                        />
                      ) : (
                        <span className="truncate block font-serif text-[11px] text-gray-500 italic">
                          {e.accountant_note || <span className="text-gray-300 italic">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Invoice Issued (TRUE/FALSE) */}
                    <td className="px-3 py-2.5 text-center border-e border-gray-200 whitespace-nowrap">
                      {e.invoice_issued ? (
                        <span className="font-mono font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                          TRUE
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                          FALSE
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveInlineEdit(e.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingRowId(null)}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {!e.invoice_issued ? (
                            <button
                              onClick={() => handleOpenInvoiceGen(e)}
                              className="px-2 py-1 bg-red-700 hover:bg-red-800 text-white font-bold text-[10px] rounded-lg shadow-sm transition flex items-center gap-1"
                              title="1-Click Create Tax Invoice & Receipt"
                            >
                              <FileText size={12} />
                              {isAr ? 'إصدار الفاتورة' : 'Create Invoice'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleViewInvoice(e)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="View Tax Invoice"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                onClick={() => handleViewReceipt(e)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="View Receipt"
                              >
                                <Receipt size={14} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => startInlineEdit(e)}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Edit Note / Gov Fee"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(isAr ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Delete this DSR entry?')) {
                                deleteDSREntry(e.id);
                                loadData();
                              }
                            }}
                            className="p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1-Click Invoice & Receipt Generation Modal */}
      {isInvoiceGeneratorOpen && selectedEntryForInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="p-6 bg-gradient-to-r from-red-900 to-rose-900 text-white flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-200">
                  {isAr ? 'الفوترة التلقائية' : '1-Click Autofill Invoicing'}
                </span>
                <h3 className="text-lg font-bold mt-0.5">
                  {isAr ? 'إصدار الفاتورة الضريبية وسند القبض' : 'Issue Tax Invoice & Payment Receipt'}
                </h3>
              </div>
              <button
                onClick={() => setIsInvoiceGeneratorOpen(false)}
                className="p-2 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                <ShieldCheck size={20} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">
                    {isAr ? 'تم سحب جميع البيانات تلقائياً من سجل DSR' : 'Autofilled directly from DSR Register'}
                  </p>
                  <p>
                    {isAr
                      ? 'يرجى التحقق من عملية الدفع المصرفية / جهاز نقاط البيع لتوليد الفاتورة الضريبية والسند الرسمي.'
                      : 'Please verify the bank settlement / POS transaction to issue the official VAT Invoice and Receipt.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block">{isAr ? 'العميل / الشركة' : 'Customer'}</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedEntryForInvoice.company_name}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block">{isAr ? 'السجل التجاري' : 'CR Number'}</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    {selectedEntryForInvoice.cr_number || '1454255'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block">{isAr ? 'الخدمة' : 'Service Deliverable'}</span>
                  <span className="font-semibold text-gray-800">{selectedEntryForInvoice.service}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block">{isAr ? 'الموظف المسؤول' : 'Assigned Staff'}</span>
                  <span className="font-semibold text-gray-800">{selectedEntryForInvoice.employee_name}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block">{isAr ? 'المبلغ الأساسي' : 'Base Amount'}</span>
                  <span className="font-bold text-gray-900">OMR {selectedEntryForInvoice.amount.toFixed(3)}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block">{isAr ? 'ضريبة القيمة المضافة (5%)' : 'VAT 5%'}</span>
                  <span className="font-bold text-emerald-600">
                    OMR {(selectedEntryForInvoice.amount * 0.05).toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                  <span>{isAr ? 'المبلغ الإجمالي للدفع' : 'Total Payable'}</span>
                  <span className="text-base text-red-800">
                    OMR {(selectedEntryForInvoice.amount * 1.05).toFixed(3)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      {isAr ? 'طريقة الدفع المؤكدة' : 'Payment Method'}
                    </label>
                    <select
                      value={selectedEntryForInvoice.payment_method || 'Mobile Payment'}
                      onChange={e =>
                        setSelectedEntryForInvoice({
                          ...selectedEntryForInvoice,
                          payment_method: e.target.value as any,
                        })
                      }
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-red-700"
                    >
                      <option value="Mobile Payment">Mobile Payment</option>
                      <option value="POS">POS Terminal</option>
                      <option value="Bank transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      {isAr ? 'تاريخ الدفع' : 'Payment Date'}
                    </label>
                    <input
                      type="date"
                      value={selectedEntryForInvoice.payment_date || new Date().toISOString().split('T')[0]}
                      onChange={e =>
                        setSelectedEntryForInvoice({
                          ...selectedEntryForInvoice,
                          payment_date: e.target.value,
                        })
                      }
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-red-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  onClick={() => setIsInvoiceGeneratorOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleIssueOfficialDocuments}
                  className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {isAr ? 'اعتماد وإصدار الفاتورة والسند' : 'Verify & Generate Official Invoice + Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New DSR Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 bg-gradient-to-r from-red-900 to-rose-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {isAr ? 'إضافة قيد جديد في سجل DSR' : 'Add New DSR Entry'}
                </h3>
                <p className="text-xs text-rose-200 font-light">
                  {isAr ? 'تسجيل خدمة ومطالبة مالية جديدة' : 'Record ad-hoc or direct client service'}
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
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
                  <input
                    type="date"
                    value={newForm.date}
                    onChange={e => setNewForm({ ...newForm, date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'الموظف' : 'Employee'}</label>
                  <select
                    value={newForm.employee_name}
                    onChange={e => setNewForm({ ...newForm, employee_name: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                  >
                    <option value="Shafnas">Shafnas</option>
                    <option value="Hamid">Hamid</option>
                    <option value="Yousuf">Yousuf</option>
                    <option value="Shahad">Shahad</option>
                    <option value="Azhaar">Azhaar</option>
                    <option value="Fatma Al-Harthy">Fatma Al-Harthy</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'الشركة / العميل' : 'Company (Customer)'} *
                  </label>
                  <input
                    type="text"
                    value={newForm.company_name}
                    onChange={e => setNewForm({ ...newForm, company_name: e.target.value })}
                    placeholder="e.g. ALDAWAHI / OSBIC"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'الخدمة' : 'Service'}</label>
                  <input
                    type="text"
                    value={newForm.service}
                    onChange={e => setNewForm({ ...newForm, service: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'السجل التجاري' : 'CR Number'}</label>
                  <input
                    type="text"
                    value={newForm.cr_number}
                    onChange={e => setNewForm({ ...newForm, cr_number: e.target.value })}
                    placeholder="e.g. 1454255"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'المبلغ (OMR)' : 'Amount (OMR)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newForm.amount}
                    onChange={e => setNewForm({ ...newForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'الرسوم الحكومية' : 'Gov Fee (OMR)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newForm.gov_fee}
                    onChange={e => setNewForm({ ...newForm, gov_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'حالة الدفع' : 'Payment Status'}</label>
                  <select
                    value={newForm.status}
                    onChange={e => setNewForm({ ...newForm, status: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={newForm.payment_method}
                    onChange={e => setNewForm({ ...newForm, payment_method: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                  >
                    <option value="Mobile Payment">Mobile Payment</option>
                    <option value="POS">POS Terminal</option>
                    <option value="Bank transfer">Bank transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'ملاحظة المحاسب' : 'Accountant Note'}
                  </label>
                  <input
                    type="text"
                    value={newForm.accountant_note}
                    onChange={e => setNewForm({ ...newForm, accountant_note: e.target.value })}
                    placeholder="Any special remarks..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Plus size={16} />
                  {isAr ? 'حفظ وإضافة' : 'Save Record'}
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
