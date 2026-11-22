import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet, Plus, Search, Filter, Download, CheckCircle2,
  AlertCircle, Clock, Edit2, Trash2, Check, X, ShieldCheck, Printer,
  Building2, DollarSign, Wallet, ArrowUpRight, TrendingUp, RefreshCw,
  FileText, Receipt, CheckSquare, Eye, Sparkles, Calendar, Landmark, Loader2,
  Users, Layers, BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getDSREntries, saveDSREntries, addDSREntry, updateDSREntry, deleteDSREntry, fetchCloudDSREntries, type DSREntry
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
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  // Date Filter State
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateFieldTarget, setDateFieldTarget] = useState<'date' | 'payment_date'>('date');

  // View mode switcher: standard table vs employee matrix heatmap vs service matrix
  const [activeDSRView, setActiveDSRView] = useState<'table' | 'employee_matrix' | 'service_matrix'>('table');
  const [matrixYear, setMatrixYear] = useState<number>(2026);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    employee_name: '',
    service: '',
    company_name: '',
    cr_number: '',
    amount: 0,
    gov_fee: 0,
    status: 'Paid' as 'Paid' | 'Unpaid' | 'Partial',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank transfer' as DSREntry['payment_method'],
    payment_reference: '',
    accountant_note: '',
  });

  // Load live DSR entries directly from cloud and synchronize with local cache
  const loadData = useCallback(async () => {
    try {
      const cloud = await fetchCloudDSREntries();
      setEntries(cloud);
    } catch (err) {
      console.warn('Could not fetch cloud DSR entries:', err);
      const local = getDSREntries();
      setEntries(local);
    }
  }, []);

  // Dedicated Delete Handler with instant optimistic UI removal and awaited Supabase sync
  const handleDeleteEntry = async (entry: DSREntry) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا السجل نهائياً؟' : 'Are you sure you want to delete this DSR record?')) {
      return;
    }
    setDeletingId(entry.id);
    try {
      // 1. Instant optimistic update so the UI immediately feels responsive
      setEntries(prev => prev.filter(item => item.id !== entry.id));

      // 2. Await both local and Supabase deletion completely
      await deleteDSREntry(entry.id);

      // 3. Clean background re-sync
      const cloud = await fetchCloudDSREntries();
      setEntries(cloud);
    } catch (err) {
      console.error('Delete DSR error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      const fresh = getDSREntries();
      setEntries(fresh);
    };
    window.addEventListener('maisarah_dsr_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Live Postgres Realtime channel for DSR entries
    const channel = supabase
      .channel('dsr_accountant_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dsr_entries' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('maisarah_dsr_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Quick 1-Click Verification Handler
  const handleQuickVerify = async (entry: DSREntry) => {
    setVerifyingId(entry.id);
    try {
      updateDSREntry(entry.id, {
        verified_by_accountant: true,
      });

      // Notify Manager of Verified DSR Record
      await supabase.from('notifications').insert([{
        recipient_role: 'manager',
        title: isAr ? 'اعتماد ومطابقة قيد DSR' : 'DSR Record Verified & Audited',
        message: isAr
          ? `اعتمد المحاسب قيد DSR للعميل "${entry.company_name}" بقيمة OMR ${entry.amount.toFixed(3)} المنفذ بواسطة (${entry.employee_name}).`
          : `Accountant verified & locked DSR record for "${entry.company_name}" (OMR ${entry.amount.toFixed(3)}) by ${entry.employee_name}.`,
        type: 'dsr_verified'
      }]);
    } catch (err: any) {
      console.warn('Verification sync notice:', err?.message);
    } finally {
      setVerifyingId(null);
      loadData();
    }
  };

  // Quick Unverify / Re-open Handler
  const handleQuickUnverify = (entry: DSREntry) => {
    updateDSREntry(entry.id, {
      verified_by_accountant: false,
    });
    loadData();
  };

  // Bulk Verify All Pending
  const handleBulkVerifyPending = async (pendingItems: DSREntry[]) => {
    if (pendingItems.length === 0) return;
    if (!confirm(isAr ? `هل تريد اعتماد وتدقيق ${pendingItems.length} سجل مالي دفعة واحدة؟` : `Verify and lock all ${pendingItems.length} pending DSR records?`)) {
      return;
    }

    pendingItems.forEach(item => {
      updateDSREntry(item.id, { verified_by_accountant: true });
    });

    try {
      await supabase.from('notifications').insert([{
        recipient_role: 'manager',
        title: isAr ? 'اعتماد جماعي لقيود DSR' : 'Bulk DSR Records Verified',
        message: isAr
          ? `قام المحاسب باعتماد وتدقيق ${pendingItems.length} سجل DSR بنجاح.`
          : `Accountant bulk-verified ${pendingItems.length} DSR records in audit queue.`,
        type: 'dsr_verified'
      }]);
    } catch (err) {
      // ignore
    }
    loadData();
  };

  // Unique lists for filters
  const uniqueEmployees = useMemo(() => {
    const set = new Set(entries.map(e => e.employee_name).filter(Boolean));
    return Array.from(set);
  }, [entries]);

  const uniqueServices = useMemo(() => {
    const set = new Set(entries.map(e => e.service).filter(Boolean));
    return Array.from(set);
  }, [entries]);

  // Date calculation helper for presets
  const getDateRangeForPreset = useCallback((preset: string) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toYMD(now);
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toYMD(y);
      return { start: yStr, end: yStr };
    }
    if (preset === 'this_week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { start: toYMD(start), end: toYMD(now) };
    }
    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: toYMD(start), end: toYMD(end) };
    }
    if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toYMD(start), end: toYMD(end) };
    }
    if (preset === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      return { start: toYMD(start), end: toYMD(end) };
    }
    if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { start: toYMD(start), end: toYMD(end) };
    }
    return { start: '', end: '' };
  }, []);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let start = '';
    let end = '';

    if (datePreset === 'custom') {
      start = customStartDate;
      end = customEndDate;
    } else if (datePreset !== 'all') {
      const range = getDateRangeForPreset(datePreset);
      start = range.start;
      end = range.end;
    }

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
      const matchVerification =
        verificationFilter === 'all' ||
        (verificationFilter === 'verified' && e.verified_by_accountant) ||
        (verificationFilter === 'unverified' && !e.verified_by_accountant);
      const matchSvc = serviceFilter === 'all' || e.service === serviceFilter;

      // Date check
      let matchDate = true;
      if (datePreset !== 'all') {
        const targetDate = dateFieldTarget === 'payment_date' ? (e.payment_date || '') : (e.date || '');
        if (!targetDate) {
          matchDate = false;
        } else {
          if (start && targetDate < start) matchDate = false;
          if (end && targetDate > end) matchDate = false;
        }
      }

      return matchSearch && matchEmp && matchStatus && matchInvoice && matchVerification && matchSvc && matchDate;
    });
  }, [
    entries,
    searchTerm,
    employeeFilter,
    statusFilter,
    invoiceFilter,
    verificationFilter,
    serviceFilter,
    datePreset,
    customStartDate,
    customEndDate,
    dateFieldTarget,
    getDateRangeForPreset
  ]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let totalGross = 0;
    let totalGov = 0;
    let totalProfit = 0;
    let totalPaidAmt = 0;
    let unpaidCount = 0;
    let totalInvoicesIssued = 0;
    let unverifiedCount = 0;
    let verifiedCount = 0;

    filteredEntries.forEach(e => {
      totalGross += e.amount || 0;
      totalGov += e.gov_fee || 0;
      totalProfit += e.profit || 0;
      if (e.status === 'Paid') totalPaidAmt += e.amount || 0;
      if (e.status === 'Unpaid') unpaidCount += 1;
      if (e.invoice_issued) totalInvoicesIssued += 1;
      if (e.verified_by_accountant) {
        verifiedCount += 1;
      } else {
        unverifiedCount += 1;
      }
    });

    return {
      count: filteredEntries.length,
      totalGross,
      totalGov,
      totalProfit,
      totalPaidAmt,
      unpaidCount,
      totalInvoicesIssued,
      unverifiedCount,
      verifiedCount
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
  const handleIssueOfficialDocuments = async () => {
    if (!selectedEntryForInvoice) return;

    const invNum = selectedEntryForInvoice.invoice_number || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const recNum = selectedEntryForInvoice.receipt_number || `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const invAmount = Number(selectedEntryForInvoice.amount) || 0;
    const vatAmt = Number((invAmount * 0.05).toFixed(3));
    const totalAmt = Number((invAmount + vatAmt).toFixed(3));

    updateDSREntry(selectedEntryForInvoice.id, {
      invoice_issued: true,
      invoice_number: invNum,
      receipt_number: recNum,
      status: 'Paid',
      payment_date: selectedEntryForInvoice.payment_date || new Date().toISOString().split('T')[0],
      payment_method: selectedEntryForInvoice.payment_method || 'Mobile Payment',
      verified_by_accountant: true,
    });

    try {
      await supabase.from('invoices').insert([{
        invoice_number: invNum,
        amount: invAmount,
        vat_amount: vatAmt,
        total_amount: totalAmt,
        status: 'paid',
        due_date: new Date().toISOString().split('T')[0],
        notes: `Auto-generated from Employee DSR: ${selectedEntryForInvoice.service} (${selectedEntryForInvoice.employee_name})`
      }]);

      await supabase.from('notifications').insert([{
        recipient_role: 'manager',
        title: isAr ? 'تم إصدار فاتورة وسند قبض لقيد DSR' : 'Tax Invoice & Receipt Generated from DSR',
        message: isAr
          ? `أصدر المحاسب الفاتورة (${invNum}) للعميل "${selectedEntryForInvoice.company_name}" بقيمة OMR ${totalAmt} بناءً على سجل DSR للموظف (${selectedEntryForInvoice.employee_name}).`
          : `Accountant issued Tax Invoice (${invNum}) for "${selectedEntryForInvoice.company_name}" (OMR ${totalAmt}) synced from ${selectedEntryForInvoice.employee_name}'s DSR.`,
        type: 'invoice_created'
      }]);
    } catch (err: any) {
      console.warn('Supabase invoice sync notice:', err?.message);
    }

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
      payment_date: newForm.payment_date || newForm.date,
      payment_method: newForm.payment_method,
      payment_reference: newForm.payment_reference,
      accountant_note: newForm.accountant_note,
      invoice_issued: false,
    });

    setIsAddModalOpen(false);
    setNewForm({
      date: new Date().toISOString().split('T')[0],
      employee_name: '',
      service: '',
      company_name: '',
      cr_number: '',
      amount: 0,
      gov_fee: 0,
      status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank transfer',
      payment_reference: '',
      accountant_note: '',
    });
    loadData();
  };

  // ── BASELINE 2026 MATRICES (Directly from User Attached Reference Models) ──
  const BASELINE_EMP_2026: Record<string, Record<string, number>> = {
    'JAN': { 'Azhar': 1226.000, 'Riyas': 138.650, 'Shahad': 454.100, 'Shafnas': 395.000, 'Yusuf': 305.440, 'Afra': 0, 'Insiya': 0 },
    'FEB': { 'Azhar': 345.000,  'Riyas': 597.000, 'Shahad': 727.000, 'Shafnas': 243.010, 'Yusuf': 305.000, 'Afra': 0, 'Insiya': 0 },
    'MAR': { 'Azhar': 505.000,  'Riyas': 755.000, 'Shahad': 720.000, 'Shafnas': 335.000, 'Yusuf': 490.000, 'Afra': 0, 'Insiya': 0 },
    'APR': { 'Azhar': 782.500,  'Riyas': 685.000, 'Shahad': 650.000, 'Shafnas': 767.000, 'Yusuf': 637.500, 'Afra': 0, 'Insiya': 365.000 },
    'MAY': { 'Azhar': 450.000,  'Riyas': 0,       'Shahad': 590.000, 'Shafnas': 361.000, 'Yusuf': 908.000, 'Afra': 125.000, 'Insiya': 458.000 },
    'JUN': { 'Azhar': 615.000,  'Riyas': 0,       'Shahad': 535.000, 'Shafnas': 395.000, 'Yusuf': 560.000, 'Afra': 230.000, 'Insiya': 300.000 },
    'JUL': { 'Azhar': 667.000,  'Riyas': 0,       'Shahad': 889.000, 'Shafnas': 784.619, 'Yusuf': 405.000, 'Afra': 655.000, 'Insiya': 620.000 },
    'AUG': { 'Azhar': 389.000,  'Riyas': 0,       'Shahad': 423.500, 'Shafnas': 505.000, 'Yusuf': 130.000, 'Afra': 220.000, 'Insiya': 300.000 },
    'SEP': { 'Azhar': 655.000,  'Riyas': 0,       'Shahad': 1227.000, 'Shafnas': 475.000, 'Yusuf': 0,       'Afra': 285.000, 'Insiya': 356.000 },
    'OCT': { 'Azhar': 100.000,  'Riyas': 0,       'Shahad': 1192.200, 'Shafnas': 1019.130, 'Yusuf': 0,      'Afra': 805.000, 'Insiya': 799.000 },
    'NOV': { 'Azhar': 0,        'Riyas': 0,       'Shahad': 0,        'Shafnas': 0,        'Yusuf': 0,      'Afra': 0,       'Insiya': 0 },
    'DEC': { 'Azhar': 0,        'Riyas': 0,       'Shahad': 0,        'Shafnas': 0,        'Yusuf': 0,      'Afra': 0,       'Insiya': 0 },
  };

  const BASELINE_SVC_2026: Record<string, Record<string, number>> = {
    'JAN': { tax_gen: 495.440, tax_vat: 183.650, audit_stat: 290.000, audit_ksa: 990.000, liq_bl: 120.000, liq_cc: 0, feas_min: 865.000, feas_bank: 0, book_std: 530.000, book_adv: 0 },
    'FEB': { tax_gen: 218.030, tax_vat: 150.000, audit_stat: 60.000,  audit_ksa: 585.000, liq_bl: 620.000, liq_cc: 0, feas_min: 545.000, feas_bank: 0, book_std: 620.000, book_adv: 0 },
    'MAR': { tax_gen: 805.000, tax_vat: 450.000, audit_stat: 510.000, audit_ksa: 270.000, liq_bl: 0,       liq_cc: 0, feas_min: 1245.000, feas_bank: 0, book_std: 505.000, book_adv: 0 },
    'APR': { tax_gen: 775.000, tax_vat: 715.000, audit_stat: 1530.000, audit_ksa: 525.000, liq_bl: 220.000, liq_cc: 0, feas_min: 750.000, feas_bank: 0, book_std: 625.000, book_adv: 0 },
    'MAY': { tax_gen: 435.000, tax_vat: 405.000, audit_stat: 1035.000, audit_ksa: 330.000, liq_bl: 660.000, liq_cc: 0, feas_min: 840.000, feas_bank: 0, book_std: 325.000, book_adv: 0 },
    'JUN': { tax_gen: 304.000, tax_vat: 190.000, audit_stat: 770.000, audit_ksa: 585.000, liq_bl: 375.000, liq_cc: 0, feas_min: 1365.000, feas_bank: 0, book_std: 430.000, book_adv: 0 },
    'JUL': { tax_gen: 590.000, tax_vat: 919.613, audit_stat: 830.000, audit_ksa: 850.000, liq_bl: 275.000, liq_cc: 0, feas_min: 890.000, feas_bank: 0, book_std: 355.000, book_adv: 180.000 },
    'AUG': { tax_gen: 350.000, tax_vat: 265.000, audit_stat: 300.000, audit_ksa: 800.000, liq_bl: 120.000, liq_cc: 0, feas_min: 490.000, feas_bank: 0, book_std: 355.000, book_adv: 0 },
    'SEP': { tax_gen: 450.000, tax_vat: 90.000,  audit_stat: 300.000, audit_ksa: 1027.000, liq_bl: 280.000, liq_cc: 0, feas_min: 1330.000, feas_bank: 0, book_std: 620.000, book_adv: 0 },
    'OCT': { tax_gen: 510.130, tax_vat: 1050.600, audit_stat: 380.000, audit_ksa: 1505.000, liq_bl: 410.000, liq_cc: 0, feas_min: 755.000, feas_bank: 0, book_std: 555.000, book_adv: 0 },
    'NOV': { tax_gen: 0,       tax_vat: 0,        audit_stat: 0,       audit_ksa: 0,        liq_bl: 0,       liq_cc: 0, feas_min: 0,       feas_bank: 0, book_std: 0,       book_adv: 0 },
    'DEC': { tax_gen: 0,       tax_vat: 0,        audit_stat: 0,       audit_ksa: 0,        liq_bl: 0,       liq_cc: 0, feas_min: 0,       feas_bank: 0, book_std: 0,       book_adv: 0 },
  };

  const MONTHS_KEYS = useMemo(() => ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], []);
  const matrixEmployees = useMemo(() => ['azhar', 'riyas', 'shahad', 'shafnas', 'yusuf', 'afra', 'insiya'], []);

  // Compute Model 1: Sales by Employee Matrix
  const employeeMatrixData = useMemo(() => {
    const rows = MONTHS_KEYS.map((monthKey, monthIdx) => {
      const monthPrefix = `${matrixYear}-${String(monthIdx + 1).padStart(2, '0')}`;
      const empAmounts: Record<string, number> = {};

      // Seed baseline for 2026
      matrixEmployees.forEach(empKey => {
        const titleCase = empKey.charAt(0).toUpperCase() + empKey.slice(1);
        empAmounts[empKey] = (matrixYear === 2026 && BASELINE_EMP_2026[monthKey]) ? (BASELINE_EMP_2026[monthKey][titleCase] || 0) : 0;
      });

      // Add dynamic DSR entries matching this month and year
      entries.forEach(e => {
        if (!e.date || !e.date.startsWith(monthPrefix)) return;
        const eName = (e.employee_name || '').toLowerCase();
        const matched = matrixEmployees.find(k => eName.includes(k));
        if (matched) {
          empAmounts[matched] = (empAmounts[matched] || 0) + (Number(e.amount) || 0);
        }
      });

      const monthTotal = Object.values(empAmounts).reduce((sum, v) => sum + v, 0);

      return {
        monthKey,
        monthIdx,
        empAmounts,
        monthTotal
      };
    });

    const columnTotals: Record<string, number> = {};
    let grandTotal = 0;
    matrixEmployees.forEach(empKey => {
      const colSum = rows.reduce((sum, r) => sum + (r.empAmounts[empKey] || 0), 0);
      columnTotals[empKey] = colSum;
      grandTotal += colSum;
    });

    return { rows, columnTotals, grandTotal };
  }, [entries, matrixYear, matrixEmployees, MONTHS_KEYS]);

  // Compute Model 2: Sales by Service Matrix
  const serviceMatrixData = useMemo(() => {
    const rows = MONTHS_KEYS.map((monthKey, monthIdx) => {
      const monthPrefix = `${matrixYear}-${String(monthIdx + 1).padStart(2, '0')}`;
      const subAmounts: Record<string, number> = {
        tax_gen: 0, tax_vat: 0,
        audit_stat: 0, audit_ksa: 0,
        liq_bl: 0, liq_cc: 0,
        feas_min: 0, feas_bank: 0,
        book_std: 0, book_adv: 0
      };

      // Seed baseline for 2026
      if (matrixYear === 2026 && BASELINE_SVC_2026[monthKey]) {
        Object.assign(subAmounts, BASELINE_SVC_2026[monthKey]);
      }

      // Add dynamic entries
      entries.forEach(e => {
        if (!e.date || !e.date.startsWith(monthPrefix)) return;
        const s = (e.service || '').toLowerCase();
        const amt = Number(e.amount) || 0;

        if (s.includes('vat')) subAmounts.tax_vat += amt;
        else if (s.includes('tax')) subAmounts.tax_gen += amt;
        else if (s.includes('ksa') || s.includes('saudi')) subAmounts.audit_ksa += amt;
        else if (s.includes('audit')) subAmounts.audit_stat += amt;
        else if (s.includes('court') || s.includes('cc')) subAmounts.liq_cc += amt;
        else if (s.includes('liquidation') || s.includes('bl')) subAmounts.liq_bl += amt;
        else if (s.includes('bank')) subAmounts.feas_bank += amt;
        else if (s.includes('feasibility') || s.includes('ministry')) subAmounts.feas_min += amt;
        else if (s.includes('cfo') || s.includes('future') || s.includes('placement')) subAmounts.book_adv += amt;
        else subAmounts.book_std += amt;
      });

      const catTotals = {
        tax: subAmounts.tax_gen + subAmounts.tax_vat,
        audit: subAmounts.audit_stat + subAmounts.audit_ksa,
        liquidation: subAmounts.liq_bl + subAmounts.liq_cc,
        feasibility: subAmounts.feas_min + subAmounts.feas_bank,
        bookkeeping: subAmounts.book_std + subAmounts.book_adv
      };

      const monthGrand = catTotals.tax + catTotals.audit + catTotals.liquidation + catTotals.feasibility + catTotals.bookkeeping;

      return {
        monthKey,
        monthIdx,
        subAmounts,
        catTotals,
        monthGrand
      };
    });

    const subTotals: Record<string, number> = {
      tax_gen: 0, tax_vat: 0,
      audit_stat: 0, audit_ksa: 0,
      liq_bl: 0, liq_cc: 0,
      feas_min: 0, feas_bank: 0,
      book_std: 0, book_adv: 0
    };
    const catGrandTotals = {
      tax: 0, audit: 0, liquidation: 0, feasibility: 0, bookkeeping: 0
    };
    let yearGrandTotal = 0;

    rows.forEach(r => {
      Object.keys(subTotals).forEach(k => {
        subTotals[k] += r.subAmounts[k] || 0;
      });
      catGrandTotals.tax += r.catTotals.tax;
      catGrandTotals.audit += r.catTotals.audit;
      catGrandTotals.liquidation += r.catTotals.liquidation;
      catGrandTotals.feasibility += r.catTotals.feasibility;
      catGrandTotals.bookkeeping += r.catTotals.bookkeeping;
      yearGrandTotal += r.monthGrand;
    });

    return { rows, subTotals, catGrandTotals, yearGrandTotal };
  }, [entries, matrixYear, MONTHS_KEYS]);

  // Heatmap helper for cell colors
  const getHeatmapColor = (val: number) => {
    if (!val || val === 0) return 'text-slate-300 bg-white';
    if (val >= 1000) return 'bg-emerald-600 text-white font-black shadow-2xs';
    if (val >= 700) return 'bg-emerald-200 text-emerald-950 font-extrabold';
    if (val >= 450) return 'bg-emerald-100 text-emerald-900 font-bold';
    if (val >= 300) return 'bg-emerald-50 text-emerald-800 font-semibold';
    return 'bg-rose-200 text-rose-950 font-bold'; // under 300 = warning (soft red in user image)
  };

  // Export to Multi-Tab Excel Workbook
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Raw DSR Register Sheet
    const dataToExport = filteredEntries.map(e => ({
      'Date': e.date,
      'Employee': e.employee_name,
      'Service': e.service,
      'Company (customer)': e.company_name,
      'CR': e.cr_number,
      'Amount (OMR)': Number(e.amount || 0).toFixed(3),
      'Gov (OMR)': Number(e.gov_fee || 0).toFixed(3),
      'Profit (OMR)': Number(e.profit || 0).toFixed(3),
      'Status': e.status,
      'Payment Date': e.payment_date || '',
      'Payment Method': e.payment_method || '',
      'Accountant Note': e.accountant_note || '',
      'Invoice Issued': e.invoice_issued ? 'TRUE' : 'FALSE',
      'Invoice Number': e.invoice_number || '',
      'Receipt Number': e.receipt_number || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DSR_Raw_Register');

    // 2. Sales by Employee Matrix Sheet (Matches User Model #1)
    const empMatrixRows = employeeMatrixData.rows.map(r => {
      const rowObj: Record<string, any> = { 'Month': r.monthKey };
      matrixEmployees.forEach(emp => {
        rowObj[emp] = r.empAmounts[emp] ? Number(r.empAmounts[emp].toFixed(3)) : '';
      });
      rowObj['Total (OMR)'] = Number(r.monthTotal.toFixed(3));
      return rowObj;
    });
    const empTotalRow: Record<string, any> = { 'Month': 'TOTAL' };
    matrixEmployees.forEach(emp => {
      empTotalRow[emp] = Number((employeeMatrixData.columnTotals[emp] || 0).toFixed(3));
    });
    empTotalRow['Total (OMR)'] = Number(employeeMatrixData.grandTotal.toFixed(3));
    empMatrixRows.push(empTotalRow);
    const wsEmp = XLSX.utils.json_to_sheet(empMatrixRows);
    XLSX.utils.book_append_sheet(workbook, wsEmp, 'Sales_By_Employee');

    // 3. Sales by Service Matrix Sheet (Matches User Model #2)
    const svcMatrixRows = serviceMatrixData.rows.map(r => {
      const rowObj: Record<string, any> = {
        'Month': r.monthKey,
        'Tax (General)': r.subAmounts['tax_gen'] ? Number(r.subAmounts['tax_gen'].toFixed(3)) : '',
        'Tax (VAT)': r.subAmounts['tax_vat'] ? Number(r.subAmounts['tax_vat'].toFixed(3)) : '',
        'Tax Subtotal': Number(r.catTotals.tax.toFixed(3)),
        'Audit (Statutory)': r.subAmounts['audit_stat'] ? Number(r.subAmounts['audit_stat'].toFixed(3)) : '',
        'Audit (KSA)': r.subAmounts['audit_ksa'] ? Number(r.subAmounts['audit_ksa'].toFixed(3)) : '',
        'Audit Subtotal': Number(r.catTotals.audit.toFixed(3)),
        'Liquidation (BL)': r.subAmounts['liq_bl'] ? Number(r.subAmounts['liq_bl'].toFixed(3)) : '',
        'Liquidation (CC)': r.subAmounts['liq_cc'] ? Number(r.subAmounts['liq_cc'].toFixed(3)) : '',
        'Liquidation Subtotal': Number(r.catTotals.liquidation.toFixed(3)),
        'Feasibility (Ministry)': r.subAmounts['feas_min'] ? Number(r.subAmounts['feas_min'].toFixed(3)) : '',
        'Feasibility (Bank)': r.subAmounts['feas_bank'] ? Number(r.subAmounts['feas_bank'].toFixed(3)) : '',
        'Feasibility Subtotal': Number(r.catTotals.feasibility.toFixed(3)),
        'Bookkeeping (Monthly)': r.subAmounts['book_std'] ? Number(r.subAmounts['book_std'].toFixed(3)) : '',
        'Bookkeeping (Future Acct)': r.subAmounts['book_adv'] ? Number(r.subAmounts['book_adv'].toFixed(3)) : '',
        'Bookkeeping Subtotal': Number(r.catTotals.bookkeeping.toFixed(3)),
        'Month Total (OMR)': Number(r.monthGrand.toFixed(3))
      };
      return rowObj;
    });
    const svcTotalRow: Record<string, any> = {
      'Month': 'TOTAL',
      'Tax (General)': Number((serviceMatrixData.subTotals['tax_gen'] || 0).toFixed(3)),
      'Tax (VAT)': Number((serviceMatrixData.subTotals['tax_vat'] || 0).toFixed(3)),
      'Tax Subtotal': Number(serviceMatrixData.catGrandTotals.tax.toFixed(3)),
      'Audit (Statutory)': Number((serviceMatrixData.subTotals['audit_stat'] || 0).toFixed(3)),
      'Audit (KSA)': Number((serviceMatrixData.subTotals['audit_ksa'] || 0).toFixed(3)),
      'Audit Subtotal': Number(serviceMatrixData.catGrandTotals.audit.toFixed(3)),
      'Liquidation (BL)': Number((serviceMatrixData.subTotals['liq_bl'] || 0).toFixed(3)),
      'Liquidation (CC)': Number((serviceMatrixData.subTotals['liq_cc'] || 0).toFixed(3)),
      'Liquidation Subtotal': Number(serviceMatrixData.catGrandTotals.liquidation.toFixed(3)),
      'Feasibility (Ministry)': Number((serviceMatrixData.subTotals['feas_min'] || 0).toFixed(3)),
      'Feasibility (Bank)': Number((serviceMatrixData.subTotals['feas_bank'] || 0).toFixed(3)),
      'Feasibility Subtotal': Number(serviceMatrixData.catGrandTotals.feasibility.toFixed(3)),
      'Bookkeeping (Monthly)': Number((serviceMatrixData.subTotals['book_std'] || 0).toFixed(3)),
      'Bookkeeping (Future Acct)': Number((serviceMatrixData.subTotals['book_adv'] || 0).toFixed(3)),
      'Bookkeeping Subtotal': Number(serviceMatrixData.catGrandTotals.bookkeeping.toFixed(3)),
      'Month Total (OMR)': Number(serviceMatrixData.yearGrandTotal.toFixed(3))
    };
    svcMatrixRows.push(svcTotalRow);
    const wsSvc = XLSX.utils.json_to_sheet(svcMatrixRows);
    XLSX.utils.book_append_sheet(workbook, wsSvc, 'Sales_By_Service');

    XLSX.writeFile(workbook, `Maisarah_DSR_Financial_Report_${matrixYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
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
          <Link
            to="/accountant/reconciliation"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-950 to-slate-900 hover:from-black hover:to-red-950 text-white rounded-xl text-sm font-bold border border-white/20 shadow-md transition-all active:scale-95"
          >
            <Landmark size={16} className="text-amber-400" />
            {isAr ? 'المطابقة البنكية الآلية' : 'Bank Reconciliation'}
          </Link>
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
          <p className="text-xs text-gray-500 font-medium">{isAr ? 'حالة التدقيق والاعتماد' : 'Audit & Verification'}</p>
          <p className="text-xl font-bold text-red-700 mt-1">
            {kpis.verifiedCount} <span className="text-xs font-normal text-gray-400">/ {kpis.count}</span>
          </p>
          <span className="text-[10px] text-amber-600 font-medium">
            {kpis.unverifiedCount > 0 ? `${kpis.unverifiedCount} ${isAr ? 'بانتظار الاعتماد' : 'awaiting audit'}` : isAr ? '✓ تم اعتماد الكل' : '✓ All Audited'}
          </span>
        </div>
      </div>

      {/* Unverified Entries Audit Notification Banner */}
      {kpis.unverifiedCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-300/60 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0 animate-pulse">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                {isAr ? 'قيود يومية جديدة بانتظار المطابقة والاعتماد المحاسبي' : 'Pending DSR Records Awaiting Accountant Verification'}
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                  {kpis.unverifiedCount} {isAr ? 'قيد معلق' : 'Pending'}
                </span>
              </h4>
              <p className="text-xs text-gray-600 font-light mt-0.5">
                {isAr
                  ? 'تم تسجيل هذه القيود من قبل الموظفين ومسؤولي العمليات. قم بمطابقة التحويلات البنكية واعتمادها لقفل الحساب وإصدار الفواتير.'
                  : 'Submitted by field/department staff. Review payment amounts, reconcile bank/POS, and verify & lock records.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setVerificationFilter(verificationFilter === 'unverified' ? 'all' : 'unverified')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                verificationFilter === 'unverified'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-amber-50 border border-gray-200'
              }`}
            >
              {verificationFilter === 'unverified' ? (isAr ? 'عرض الكل' : 'Show All') : (isAr ? 'تصفية المعلقة فقط' : 'Filter Pending')}
            </button>
            <button
              onClick={() => handleBulkVerifyPending(filteredEntries.filter(e => !e.verified_by_accountant))}
              className="px-4 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
            >
              <CheckSquare size={14} />
              {isAr ? 'اعتماد المعروض دفعة واحدة' : 'Bulk Verify Visible'}
            </button>
          </div>
        </div>
      )}

      {/* ── View Switcher: Table vs Sales by Employee Heatmap vs Sales by Service Matrix ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveDSRView('table')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeDSRView === 'table'
                ? 'bg-white text-red-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>{isAr ? 'سجل العمليات (DSR تفصيلي)' : 'Detailed DSR Register'}</span>
          </button>

          <button
            onClick={() => setActiveDSRView('employee_matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeDSRView === 'employee_matrix'
                ? 'bg-white text-red-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={14} />
            <span>{isAr ? 'مبيعات الموظفين (نموذج 1)' : 'Sales by Employee Matrix'}</span>
          </button>

          <button
            onClick={() => setActiveDSRView('service_matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeDSRView === 'service_matrix'
                ? 'bg-white text-red-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={14} />
            <span>{isAr ? 'مبيعات الخدمات (نموذج 2)' : 'Sales by Service Matrix'}</span>
          </button>
        </div>

        {/* Matrix Year & Full Excel Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-rose-50/70 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-red-900">
            <span>{isAr ? 'السنة المالية:' : 'Fiscal Year:'}</span>
            <select
              value={matrixYear}
              onChange={e => setMatrixYear(Number(e.target.value))}
              className="bg-transparent font-black text-red-950 outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title={isAr ? 'تصدير كامل مصنف الإكسل متعدد الصفحات' : 'Download Complete Multi-Sheet Excel'}
          >
            <Download size={14} />
            <span>{isAr ? 'تحميل إكسل شامل (.xlsx)' : 'Download Full Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* ── VIEW 1: DETAILED DSR REGISTRAR TABLE ── */}
      {activeDSRView === 'table' && (
        <>
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

        {/* Date Filter Preset */}
        <div className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-xl px-3 py-2 text-sm transition-all">
          <Calendar size={15} className="text-red-800 shrink-0" />
          <select
            value={datePreset}
            onChange={e => setDatePreset(e.target.value as any)}
            className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">{isAr ? 'كافة التواريخ' : 'All Dates'}</option>
            <option value="today">{isAr ? 'اليوم (Today)' : 'Today'}</option>
            <option value="yesterday">{isAr ? 'أمس (Yesterday)' : 'Yesterday'}</option>
            <option value="this_week">{isAr ? 'هذا الأسبوع (This Week)' : 'This Week'}</option>
            <option value="this_month">{isAr ? 'هذا الشهر (This Month)' : 'This Month'}</option>
            <option value="last_month">{isAr ? 'الشهر السابق (Last Month)' : 'Last Month'}</option>
            <option value="this_quarter">{isAr ? 'الربع الحالي (VAT Q)' : 'This Quarter (VAT)'}</option>
            <option value="this_year">{isAr ? 'العام الحالي (This Year)' : 'This Year'}</option>
            <option value="custom">{isAr ? 'نطاق مخصص... (Custom)' : 'Custom Range...'}</option>
          </select>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-1.5 bg-rose-50/60 border border-rose-200 rounded-xl px-2.5 py-1 text-xs animate-fade-in">
            <span className="text-[11px] font-bold text-gray-500">{isAr ? 'من:' : 'From:'}</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-red-700"
            />
            <span className="text-gray-400 text-xs font-bold">→</span>
            <span className="text-[11px] font-bold text-gray-500">{isAr ? 'إلى:' : 'To:'}</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-red-700"
            />
          </div>
        )}

        {/* Date Field Target Toggle (Service Date vs Payment Date) */}
        {datePreset !== 'all' && (
          <div className="flex items-center bg-gray-100 rounded-xl p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setDateFieldTarget('date')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFieldTarget === 'date' ? 'bg-white text-red-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {isAr ? 'تاريخ الخدمة' : 'Service Date'}
            </button>
            <button
              type="button"
              onClick={() => setDateFieldTarget('payment_date')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFieldTarget === 'payment_date' ? 'bg-white text-red-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {isAr ? 'تاريخ التحصيل' : 'Payment Date'}
            </button>
          </div>
        )}

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
          <option value="all">{isAr ? 'جميع حالات الدفع' : 'All Payment Status'}</option>
          <option value="Paid">{isAr ? 'مدفوع (Paid)' : 'Paid'}</option>
          <option value="Unpaid">{isAr ? 'غير مدفوع (Unpaid)' : 'Unpaid'}</option>
          <option value="Partial">{isAr ? 'جزئي (Partial)' : 'Partial'}</option>
        </select>

        {/* Verification Audit Filter */}
        <select
          value={verificationFilter}
          onChange={e => setVerificationFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-red-700 cursor-pointer"
        >
          <option value="all">{isAr ? 'حالة الاعتماد: الكل' : 'Verification: All'}</option>
          <option value="verified">{isAr ? '✓ معتمد ومقفل' : '✓ Verified & Locked'}</option>
          <option value="unverified">{isAr ? '⏳ بانتظار الاعتماد' : '⏳ Pending Audit'}</option>
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
            setVerificationFilter('all');
            setServiceFilter('all');
            setDatePreset('all');
            setCustomStartDate('');
            setCustomEndDate('');
            setDateFieldTarget('date');
          }}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          title={isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* DSR Data Table (Matching User Excel Screenshot) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse min-w-[1300px]">
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
                <th className="px-3 py-3.5 text-center border-e border-gray-200">{isAr ? 'الاعتماد المحاسبي' : 'Audit Status'}</th>
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
                const isVerifying = verifyingId === e.id;

                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-amber-50/40 transition-colors ${
                      !e.verified_by_accountant ? 'bg-amber-50/15' : ''
                    } ${e.status === 'Unpaid' ? 'bg-red-50/20' : e.status === 'Partial' ? 'bg-amber-50/20' : ''}`}
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
                          <option value="Paid">{isAr ? 'مدفوع' : 'Paid'}</option>
                          <option value="Unpaid">{isAr ? 'غير مدفوع' : 'Unpaid'}</option>
                          <option value="Partial">{isAr ? 'جزئي' : 'Partial'}</option>
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
                          {e.status === 'Paid' ? (isAr ? 'مدفوع' : 'Paid') : e.status === 'Unpaid' ? (isAr ? 'غير مدفوع' : 'Unpaid') : (isAr ? 'جزئي' : 'Partial')}
                        </span>
                      )}
                    </td>

                    {/* Accountant Verification Status */}
                    <td className="px-3 py-2.5 text-center border-e border-gray-200 whitespace-nowrap">
                      {e.verified_by_accountant ? (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleQuickUnverify(e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 font-bold text-[10px] transition"
                            title={isAr ? 'معتمد ومقفل (انقر لإلغاء القفل)' : 'Verified & Locked (Click to unlock)'}
                          >
                            <ShieldCheck size={12} className="text-emerald-600" />
                            {isAr ? 'معتمد ومقفل' : 'Verified'}
                          </button>
                          {e.reconciled && (
                            <Link
                              to="/accountant/reconciliation"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-bold transition"
                              title={e.bank_reference ? `Bank: ${e.bank_name || 'Bank'} | Ref: ${e.bank_reference}` : 'Reconciled with Bank Statement'}
                            >
                              <Landmark size={9} />
                              {isAr ? 'مطابق بنكياً' : 'Bank Matched'}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleQuickVerify(e)}
                            disabled={isVerifying}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] transition shadow-xs hover:shadow"
                            title={isAr ? 'اعتماد ومطابقة القيد الآن' : 'Verify and lock this DSR record now'}
                          >
                            {isVerifying ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <Clock size={11} className="text-amber-700" />
                            )}
                            {isAr ? 'اعتماد وقفل' : 'Verify & Lock'}
                          </button>
                          {e.reconciled && (
                            <Link
                              to="/accountant/reconciliation"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold"
                            >
                              <Landmark size={9} />
                              {isAr ? 'مطابق بنكياً' : 'Bank Matched'}
                            </Link>
                          )}
                        </div>
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
                          <option value="">{isAr ? '-- غير محدد --' : '-- None --'}</option>
                          <option value="Mobile Payment">{isAr ? 'دفع بالهاتف' : 'Mobile Payment'}</option>
                          <option value="POS">{isAr ? 'جهاز نقاط البيع (POS)' : 'POS'}</option>
                          <option value="Bank transfer">{isAr ? 'تحويل بنكي' : 'Bank transfer'}</option>
                          <option value="Cash">{isAr ? 'نقداً' : 'Cash'}</option>
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
                          placeholder={isAr ? 'ملاحظة...' : 'Note...'}
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
                          {isAr ? 'نعم (تم)' : 'TRUE'}
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                          {isAr ? 'لا (معلق)' : 'FALSE'}
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
                            onClick={() => handleDeleteEntry(e)}
                            disabled={deletingId === e.id}
                            className="p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                            title={isAr ? 'حذف السجل' : 'Delete'}
                          >
                            {deletingId === e.id ? (
                              <Loader2 size={13} className="animate-spin text-red-600" />
                            ) : (
                              <Trash2 size={13} />
                            )}
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
    </>
  )}

  {/* ── VIEW 2: SALES BY EMPLOYEE MATRIX (MODEL #1) ── */}
  {activeDSRView === 'employee_matrix' && (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 mb-1">
            <Users size={12} />
            <span>{isAr ? 'مبيعات الموظفين الشهرية - مستخرج من DSR' : 'Monthly Sales by Staff - Generated from DSR'}</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {isAr ? `مصفوفة مبيعات الموظفين لسنة (${matrixYear})` : `Employee Sales Performance Matrix (${matrixYear})`}
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            {isAr ? 'تتبع إجمالي إيرادات كل موظف شهرياً مع مؤشرات الأداء الحرارية (Heatmap)' : 'Track individual employee billings per month with conditional performance heatmap.'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block shadow-2xs" /> {'>'} 1,000 OMR
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-3 h-3 rounded-xs bg-emerald-200 inline-block" /> 700 - 999
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-3 h-3 rounded-xs bg-emerald-50 border border-emerald-200 inline-block" /> 300 - 699
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-3 h-3 rounded-xs bg-rose-200 inline-block" /> {'<'} 300 OMR
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs border border-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 uppercase font-black text-[11px]">
              <th className="px-3 py-2.5 border-r border-slate-300 text-slate-900 font-black w-24">{isAr ? 'الشهر' : 'Month'}</th>
              {matrixEmployees.map(emp => (
                <th key={emp} className="px-3 py-2.5 border-r border-slate-300 font-black capitalize text-slate-900 min-w-[100px]">
                  {emp}
                </th>
              ))}
              <th className="px-3 py-2.5 bg-slate-200 text-slate-950 font-black min-w-[110px]">
                {isAr ? 'إجمالي الشهر' : 'Month Total'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {employeeMatrixData.rows.map(row => (
              <tr key={row.monthKey} className="hover:bg-slate-50 transition">
                <td className="px-3 py-2 border-r border-slate-300 font-black text-slate-900 bg-slate-50 uppercase text-center">
                  {row.monthKey}
                </td>
                {matrixEmployees.map(emp => {
                  const val = row.empAmounts[emp] || 0;
                  const colorCls = getHeatmapColor(val);
                  return (
                    <td key={emp} className={`px-2 py-2 border-r border-slate-200 text-right font-mono transition-colors ${colorCls}`}>
                      {val > 0 ? val.toLocaleString('en-US', { minimumFractionDigits: val % 1 === 0 ? 0 : 3, maximumFractionDigits: 3 }) : ''}
                    </td>
                  );
                })}
                <td className="px-3 py-2 font-mono font-black text-right text-slate-950 bg-slate-100/80">
                  {row.monthTotal > 0 ? `OMR ${row.monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200/90 border-t-2 border-slate-400 font-black text-slate-950 text-xs">
              <td className="px-3 py-2.5 border-r border-slate-300 text-center font-black uppercase">
                {isAr ? 'الإجمالي الكلي' : 'TOTAL'}
              </td>
              {matrixEmployees.map(emp => {
                const colTotal = employeeMatrixData.columnTotals[emp] || 0;
                return (
                  <td key={emp} className="px-2 py-2.5 border-r border-slate-300 text-right font-mono font-black">
                    {colTotal > 0 ? colTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '0.000'}
                  </td>
                );
              })}
              <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-800 bg-slate-300 text-sm">
                OMR {employeeMatrixData.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )}

  {/* ── VIEW 3: SALES BY SERVICE MATRIX (MODEL #2) ── */}
  {activeDSRView === 'service_matrix' && (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-red-900 text-[10px] font-black border border-rose-200 mb-1">
            <Layers size={12} />
            <span>{isAr ? 'تقرير مبيعات الخدمات والأقسام - مستخرج من DSR' : 'Sales by Service Matrix - Generated from DSR'}</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {isAr ? `مصفوفة مبيعات الخدمات لسنة ${matrixYear}` : `Service Category Sales Matrix (${matrixYear})`}
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            {isAr ? 'تحليل الإيرادات حسب التخصص: الضرائب، التدقيق، التصفية، دراسات الجدوى ومسك الدفاتر' : 'Categorized revenue distribution across Tax, Audit, Liquidation, Feasibility, and Bookkeeping.'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs border border-slate-400 border-collapse">
          <thead>
            {/* Level 0: Year Header */}
            <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 font-black text-sm">
              <th colSpan={12} className="py-2 text-center tracking-widest">{matrixYear}</th>
            </tr>
            {/* Level 1: Category Names */}
            <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-black text-[11px]">
              <th rowSpan={2} className="px-3 py-2 border-r border-slate-400 text-center w-20">{isAr ? 'الشهر' : 'Month'}</th>
              <th colSpan={2} className="px-2 py-2 border-r border-slate-400 text-center bg-rose-50/70 text-red-950 font-black">{isAr ? 'الضرائب Tax' : 'Tax'}</th>
              <th colSpan={2} className="px-2 py-2 border-r border-slate-400 text-center bg-blue-50/70 text-blue-950 font-black">{isAr ? 'التدقيق Audit' : 'Audit'}</th>
              <th colSpan={2} className="px-2 py-2 border-r border-slate-400 text-center bg-amber-50/70 text-amber-950 font-black">{isAr ? 'التصفية Liquidation' : 'Liquidation'}</th>
              <th colSpan={2} className="px-2 py-2 border-r border-slate-400 text-center bg-emerald-50/70 text-emerald-950 font-black">{isAr ? 'دراسات الجدوى Feasibility' : 'Feasibility Study'}</th>
              <th colSpan={2} className="px-2 py-2 border-r border-slate-400 text-center bg-purple-50/70 text-purple-950 font-black">{isAr ? 'مسك الدفاتر Bookkeeping' : 'Bookkeeping'}</th>
              <th rowSpan={2} className="px-3 py-2 text-center bg-slate-300 text-slate-950 font-black min-w-[100px]">{isAr ? 'المجموع الشهري' : 'Month Total'}</th>
            </tr>
            {/* Level 2: Sub-columns */}
            <tr className="bg-slate-50 border-b-2 border-slate-400 text-[10px] font-bold text-slate-700">
              <th className="px-2 py-1.5 border-r border-slate-300">Tax</th>
              <th className="px-2 py-1.5 border-r border-slate-400 font-black text-red-900">VAT</th>
              <th className="px-2 py-1.5 border-r border-slate-300">Audit</th>
              <th className="px-2 py-1.5 border-r border-slate-400 font-black text-blue-900">KSA</th>
              <th className="px-2 py-1.5 border-r border-slate-300">BL</th>
              <th className="px-2 py-1.5 border-r border-slate-400">CC</th>
              <th className="px-2 py-1.5 border-r border-slate-300">Ministry</th>
              <th className="px-2 py-1.5 border-r border-slate-400">Bank</th>
              <th className="px-2 py-1.5 border-r border-slate-300">Bookkeeping</th>
              <th className="px-2 py-1.5 border-r border-slate-400">Future Acct</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {serviceMatrixData.rows.map(row => (
              <tr key={row.monthKey} className="hover:bg-slate-50/80 transition">
                <td className="px-2 py-2 border-r border-slate-400 font-black text-slate-900 bg-slate-50 text-center uppercase">
                  {row.monthKey}
                </td>
                {/* Tax */}
                <td className="px-2 py-1.5 border-r border-slate-300 text-right font-mono text-slate-700">{row.subAmounts.tax_gen ? row.subAmounts.tax_gen.toFixed(3) : '-'}</td>
                <td className="px-2 py-1.5 border-r border-slate-400 text-right font-mono text-slate-900 font-bold bg-rose-50/30">{row.subAmounts.tax_vat ? row.subAmounts.tax_vat.toFixed(3) : '-'}</td>
                {/* Audit */}
                <td className="px-2 py-1.5 border-r border-slate-300 text-right font-mono text-slate-700">{row.subAmounts.audit_stat ? row.subAmounts.audit_stat.toFixed(3) : '-'}</td>
                <td className="px-2 py-1.5 border-r border-slate-400 text-right font-mono text-slate-900 font-bold bg-blue-50/30">{row.subAmounts.audit_ksa ? row.subAmounts.audit_ksa.toFixed(3) : '-'}</td>
                {/* Liquidation */}
                <td className="px-2 py-1.5 border-r border-slate-300 text-right font-mono text-slate-700">{row.subAmounts.liq_bl ? row.subAmounts.liq_bl.toFixed(3) : '-'}</td>
                <td className="px-2 py-1.5 border-r border-slate-400 text-right font-mono text-slate-500">{row.subAmounts.liq_cc ? row.subAmounts.liq_cc.toFixed(3) : '-'}</td>
                {/* Feasibility */}
                <td className="px-2 py-1.5 border-r border-slate-300 text-right font-mono text-slate-700">{row.subAmounts.feas_min ? row.subAmounts.feas_min.toFixed(3) : '-'}</td>
                <td className="px-2 py-1.5 border-r border-slate-400 text-right font-mono text-slate-500">{row.subAmounts.feas_bank ? row.subAmounts.feas_bank.toFixed(3) : '-'}</td>
                {/* Bookkeeping */}
                <td className="px-2 py-1.5 border-r border-slate-300 text-right font-mono text-slate-700">{row.subAmounts.book_std ? row.subAmounts.book_std.toFixed(3) : '-'}</td>
                <td className="px-2 py-1.5 border-r border-slate-400 text-right font-mono text-slate-500">{row.subAmounts.book_adv ? row.subAmounts.book_adv.toFixed(3) : '-'}</td>
                {/* Month Total */}
                <td className="px-2 py-1.5 text-right font-mono font-black text-slate-900 bg-slate-100">
                  {row.monthGrand > 0 ? row.monthGrand.toFixed(3) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Column Totals Row */}
            <tr className="bg-slate-200/90 border-t-2 border-slate-400 font-black text-slate-900 text-xs">
              <td className="px-2 py-2 border-r border-slate-400 text-center uppercase font-black">{isAr ? 'الإجمالي' : 'Total'}</td>
              <td className="px-2 py-2 border-r border-slate-300 text-right font-mono">{serviceMatrixData.subTotals.tax_gen.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-400 text-right font-mono bg-rose-100 text-red-950">{serviceMatrixData.subTotals.tax_vat.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-300 text-right font-mono">{serviceMatrixData.subTotals.audit_stat.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-400 text-right font-mono bg-blue-100 text-blue-950">{serviceMatrixData.subTotals.audit_ksa.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-300 text-right font-mono">{serviceMatrixData.subTotals.liq_bl.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-400 text-right font-mono">{serviceMatrixData.subTotals.liq_cc.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-300 text-right font-mono">{serviceMatrixData.subTotals.feas_min.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-400 text-right font-mono">{serviceMatrixData.subTotals.feas_bank.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-300 text-right font-mono">{serviceMatrixData.subTotals.book_std.toFixed(3)}</td>
              <td className="px-2 py-2 border-r border-slate-400 text-right font-mono">{serviceMatrixData.subTotals.book_adv.toFixed(3)}</td>
              <td className="px-2 py-2 text-right font-mono font-black text-slate-950 bg-slate-300 text-sm">
                {serviceMatrixData.yearGrandTotal.toFixed(3)}
              </td>
            </tr>

            {/* Category Grand Total Badges Row */}
            <tr className="bg-slate-100 border-t border-slate-300 text-xs font-black">
              <td className="px-2 py-3 border-r border-slate-300 text-center text-slate-500">{isAr ? 'صافي المجال' : 'Area Net'}</td>
              <td colSpan={2} className="px-2 py-3 border-r border-slate-300 text-center font-mono text-emerald-800 bg-emerald-50">
                ▲ {serviceMatrixData.catGrandTotals.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td colSpan={2} className="px-2 py-3 border-r border-slate-300 text-center font-mono text-emerald-800 bg-emerald-50">
                ▲ {serviceMatrixData.catGrandTotals.audit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td colSpan={2} className="px-2 py-3 border-r border-slate-300 text-center font-mono text-amber-800 bg-amber-50">
                ▼ {serviceMatrixData.catGrandTotals.liquidation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td colSpan={2} className="px-2 py-3 border-r border-slate-300 text-center font-mono text-slate-800 bg-slate-50">
                ■ {serviceMatrixData.catGrandTotals.feasibility.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td colSpan={2} className="px-2 py-3 border-r border-slate-300 text-center font-mono text-slate-800 bg-slate-50">
                ■ {serviceMatrixData.catGrandTotals.bookkeeping.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-2 py-3 text-right font-mono font-black text-red-900 bg-rose-100">
                OMR {serviceMatrixData.yearGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )}

      {/* 1-Click Invoice & Receipt Generation Modal */}
      {isInvoiceGeneratorOpen && selectedEntryForInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150" dir={isAr ? 'rtl' : 'ltr'}>
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
                      <option value="Mobile Payment">{isAr ? 'دفع بالهاتف' : 'Mobile Payment'}</option>
                      <option value="POS">{isAr ? 'جهاز نقاط البيع (POS)' : 'POS Terminal'}</option>
                      <option value="Bank transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                      <option value="Cash">{isAr ? 'نقداً' : 'Cash'}</option>
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
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100" dir={isAr ? 'rtl' : 'ltr'}>
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
                    onChange={e => {
                      const d = e.target.value;
                      setNewForm(prev => ({
                        ...prev,
                        date: d,
                        payment_date: prev.payment_date === prev.date ? d : prev.payment_date
                      }));
                    }}
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
                    onChange={e => {
                      const nextStatus = e.target.value as any;
                      setNewForm(prev => ({
                        ...prev,
                        status: nextStatus,
                        payment_date: (nextStatus === 'Paid' || nextStatus === 'Partial') && !prev.payment_date
                          ? (prev.date || new Date().toISOString().split('T')[0])
                          : prev.payment_date
                      }));
                    }}
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
                    value={newForm.payment_method}
                    onChange={e => setNewForm({ ...newForm, payment_method: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700"
                  >
                    <option value="Mobile Payment">{isAr ? 'دفع بالهاتف' : 'Mobile Payment'}</option>
                    <option value="POS">{isAr ? 'جهاز نقاط البيع (POS)' : 'POS Terminal'}</option>
                    <option value="Bank transfer">{isAr ? 'تحويل بنكي' : 'Bank transfer'}</option>
                    <option value="Cash">{isAr ? 'نقداً' : 'Cash'}</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'تاريخ الدفع' : 'Payment Date'}
                  </label>
                  <input
                    type="date"
                    value={newForm.payment_date}
                    onChange={e => setNewForm({ ...newForm, payment_date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'مرجع التحويل / الإيصال' : 'Payment Reference / Ref'}
                  </label>
                  <input
                    type="text"
                    value={newForm.payment_reference || ''}
                    onChange={e => setNewForm({ ...newForm, payment_reference: e.target.value })}
                    placeholder={isAr ? 'مثال: TXN-9841 أو رقم الإيصال' : 'e.g. TXN-9841 or Receipt #'}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-700 font-mono text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">
                    {isAr ? 'ملاحظة المحاسب' : 'Accountant Note'}
                  </label>
                  <input
                    type="text"
                    value={newForm.accountant_note}
                    onChange={e => setNewForm({ ...newForm, accountant_note: e.target.value })}
                    placeholder={isAr ? 'أي ملاحظات خاصة...' : 'Any special remarks...'}
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
