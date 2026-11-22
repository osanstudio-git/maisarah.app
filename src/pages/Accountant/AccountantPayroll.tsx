import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  CreditCard, DollarSign, Download, FileText, CheckCircle2, User,
  ArrowUpRight, ShieldCheck, AlertCircle, Loader2, Check, RefreshCw,
  Search, Filter, ChevronDown, Building2, Calendar, FileSpreadsheet,
  Printer, ArrowDownLeft, X, Edit3, Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface PayrollItem {
  id: string;
  employeeId: string;
  employeeName: string;
  civilId: string;
  role: string;
  dept: string;
  nationality: string;
  bankName: string;
  accountNumber: string;
  basicSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  otherAllowance: number;
  grossSalary: number;
  deductions: number;
  overtime: number;
  incentives: number;
  bonuses: number;
  netSalary: number;
  status: 'Paid' | 'Pending';
  paymentDate?: string;
  paymentReference?: string;
}

export default function AccountantPayroll() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Pending'>('all');

  // Month & Year Selector (default current month)
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);

  const availableMonths = useMemo(() => [
    'November 2026',
    'October 2026',
    'September 2026',
    'August 2026',
    'July 2026',
    'June 2026'
  ], []);

  const [payrollList, setPayrollList] = useState<PayrollItem[]>([]);
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [disbursingItem, setDisbursingItem] = useState<PayrollItem | null>(null);
  const [disburseRef, setDisburseRef] = useState('');
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Fetch Employees & Synced Payroll Runs from Supabase ─────────────────────
  const fetchPayroll = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: hrEmployees },
        { data: profiles },
        { data: payrollRuns }
      ] = await Promise.all([
        supabase.from('hr_employees').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('hr_payroll_runs').select('*').eq('month', selectedMonth)
      ]);

      const profMap = new Map<string, any>();
      (profiles || []).forEach(p => {
        profMap.set(p.id, p);
      });

      // Local storage fallback for paid status tracking
      const paidCacheKey = `accountant_paid_payroll_${selectedMonth.replace(/\s+/g, '_')}`;
      const localPaidIds = JSON.parse(localStorage.getItem(paidCacheKey) || '[]');

      // Standard active employee roster
      const employees = (hrEmployees || []).filter(e => e.status !== 'inactive');

      const items: PayrollItem[] = employees.map((emp, index) => {
        const liveRun = (payrollRuns || []).find(r => r.employee_id === emp.id);
        const allowances = emp.allowances || {};
        const transport = Number(allowances.transport || (liveRun ? liveRun.transport_allowance : 150));
        const housing = Number(allowances.housing || (liveRun ? liveRun.housing_allowance : 250));
        const other = Number(allowances.other || (liveRun ? liveRun.other_allowance : 50));
        const basic = Number(emp.basic_salary || (liveRun ? liveRun.basic_salary : 1200));

        const gross = basic + transport + housing + other;
        const deductions = liveRun ? Number(liveRun.deductions || 0) : (emp.nationality?.toLowerCase() === 'omani' ? 119 : 50);
        const overtime = liveRun ? Number(liveRun.overtime || 0) : 0;
        const incentives = liveRun ? Number(liveRun.incentives || 0) : 0;
        const bonuses = liveRun ? Number(liveRun.bonuses || 0) : 0;
        const net = liveRun ? Number(liveRun.net_salary || (gross - deductions + overtime + incentives + bonuses)) : (gross - deductions + overtime + incentives + bonuses);

        const isPaid = liveRun?.status === 'Paid' || localPaidIds.includes(emp.id);

        return {
          id: liveRun?.id || `PAY-${emp.id.slice(0, 8)}`,
          employeeId: emp.id,
          employeeName: emp.full_name || 'Staff Member',
          civilId: emp.civil_id || emp.passport_no || `CIV-924${index + 1}0`,
          role: emp.role || 'Professional Staff',
          dept: emp.dept || 'Consultancy & Auditing',
          nationality: emp.nationality || 'Omani',
          bankName: 'Bank Muscat',
          accountNumber: `03410${(index + 1) * 81249}01`,
          basicSalary: basic,
          transportAllowance: transport,
          housingAllowance: housing,
          otherAllowance: other,
          grossSalary: gross,
          deductions,
          overtime,
          incentives,
          bonuses,
          netSalary: net,
          status: isPaid ? 'Paid' : 'Pending',
          paymentDate: liveRun?.updated_at?.split('T')[0] || (isPaid ? '2026-11-20' : undefined),
          paymentReference: liveRun?.id ? `BM-WPS-${liveRun.id.slice(0, 6).toUpperCase()}` : undefined
        };
      });

      setPayrollList(items);
    } catch (err) {
      console.error('Error fetching payroll sheet data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  // ── Financial Metrics Overview ─────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalNet = 0;
    let totalBasic = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;
    let paidCount = 0;

    payrollList.forEach(item => {
      totalNet += item.netSalary;
      totalBasic += item.basicSalary;
      totalAllowances += (item.transportAllowance + item.housingAllowance + item.otherAllowance);
      totalDeductions += item.deductions;
      if (item.status === 'Paid') paidCount += 1;
    });

    const pendingCount = payrollList.length - paidCount;
    const paymentProgressPct = payrollList.length > 0 ? Math.round((paidCount / payrollList.length) * 100) : 0;

    return {
      totalNet,
      totalBasic,
      totalAllowances,
      totalDeductions,
      paidCount,
      pendingCount,
      paymentProgressPct,
      headcount: payrollList.length
    };
  }, [payrollList]);

  // ── Filtered Rows ─────────────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    return payrollList.filter(item => {
      const matchSearch =
        item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.civilId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dept.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = deptFilter === 'all' || item.dept.toLowerCase().includes(deptFilter.toLowerCase());
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchSearch && matchDept && matchStatus;
    });
  }, [payrollList, searchTerm, deptFilter, statusFilter]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set(payrollList.map(p => p.dept).filter(Boolean));
    return Array.from(set);
  }, [payrollList]);

  // ── 1-Click Disburse Individual Salary ─────────────────────────────────────
  const handleConfirmDisburse = async () => {
    if (!disbursingItem) return;
    setUpdating(true);
    try {
      const targetEmpId = disbursingItem.employeeId;
      const ref = disburseRef.trim() || `BM-WPS-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Upsert into Supabase hr_payroll_runs
      await supabase.from('hr_payroll_runs').upsert({
        employee_id: targetEmpId,
        month: selectedMonth,
        basic_salary: disbursingItem.basicSalary,
        transport_allowance: disbursingItem.transportAllowance,
        housing_allowance: disbursingItem.housingAllowance,
        other_allowance: disbursingItem.otherAllowance,
        deductions: disbursingItem.deductions,
        overtime: disbursingItem.overtime,
        incentives: disbursingItem.incentives,
        bonuses: disbursingItem.bonuses,
        net_salary: disbursingItem.netSalary,
        status: 'Paid',
        updated_at: new Date().toISOString()
      }, { onConflict: 'employee_id,month' });

      // 2. Cache in localStorage
      const paidCacheKey = `accountant_paid_payroll_${selectedMonth.replace(/\s+/g, '_')}`;
      const localPaidIds = JSON.parse(localStorage.getItem(paidCacheKey) || '[]');
      if (!localPaidIds.includes(targetEmpId)) {
        localPaidIds.push(targetEmpId);
        localStorage.setItem(paidCacheKey, JSON.stringify(localPaidIds));
      }

      // 3. Notify Management
      await supabase.from('notifications').insert([{
        recipient_role: 'manager',
        title: isAr ? 'صرف راتب موظف' : 'Salary Disbursed',
        message: isAr
          ? `قام المحاسب بصرف راتب (${disbursingItem.employeeName}) لشهر ${selectedMonth} بمبلغ OMR ${disbursingItem.netSalary.toFixed(3)} (مرجع: ${ref}).`
          : `Accountant disbursed salary for ${disbursingItem.employeeName} (${selectedMonth}): OMR ${disbursingItem.netSalary.toFixed(3)} [Ref: ${ref}].`,
        type: 'payroll_disbursed'
      }]);

      setDisbursingItem(null);
      setDisburseRef('');
      fetchPayroll(true);
    } catch (err: any) {
      console.warn('Disburse payroll notice:', err?.message);
    } finally {
      setUpdating(false);
    }
  };

  // ── Disburse All Pending ──────────────────────────────────────────────────
  const handleBulkDisburseAll = async () => {
    const pendingItems = payrollList.filter(p => p.status === 'Pending');
    if (pendingItems.length === 0) {
      alert(isAr ? 'تم صرف جميع رواتب هذا الشهر مسبقاً!' : 'All staff salaries for this month are already paid.');
      return;
    }

    if (!confirm(isAr
      ? `هل أنت متأكد من صرف واعتماد تحويل رواتب ${pendingItems.length} موظف دفعة واحدة لشهر ${selectedMonth}؟`
      : `Disburse and authorize salary transfer for all ${pendingItems.length} staff members for ${selectedMonth}?`
    )) {
      return;
    }

    setUpdating(true);
    try {
      const paidCacheKey = `accountant_paid_payroll_${selectedMonth.replace(/\s+/g, '_')}`;
      const localPaidIds = JSON.parse(localStorage.getItem(paidCacheKey) || '[]');

      for (const item of pendingItems) {
        if (!localPaidIds.includes(item.employeeId)) localPaidIds.push(item.employeeId);
        try {
          await supabase.from('hr_payroll_runs').upsert({
            employee_id: item.employeeId,
            month: selectedMonth,
            basic_salary: item.basicSalary,
            transport_allowance: item.transportAllowance,
            housing_allowance: item.housingAllowance,
            other_allowance: item.otherAllowance,
            deductions: item.deductions,
            net_salary: item.netSalary,
            status: 'Paid',
            updated_at: new Date().toISOString()
          }, { onConflict: 'employee_id,month' });
        } catch { }
      }
      localStorage.setItem(paidCacheKey, JSON.stringify(localPaidIds));

      await supabase.from('notifications').insert([{
        recipient_role: 'manager',
        title: isAr ? 'اعتماد مسير الرواتب الشهري بالكامل' : 'Full Monthly Payroll Batch Disbursed',
        message: isAr
          ? `تم صرف مسير رواتب شهر ${selectedMonth} بالكامل لعدد (${pendingItems.length}) موظف بمبلغ إجمالي OMR ${metrics.totalNet.toFixed(3)}.`
          : `Accountant disbursed the entire payroll batch for ${selectedMonth} (${pendingItems.length} staff, Total: OMR ${metrics.totalNet.toFixed(3)}).`,
        type: 'payroll_disbursed'
      }]);

      fetchPayroll(true);
    } catch (err) {
      console.warn('Bulk disburse error:', err);
    } finally {
      setUpdating(false);
    }
  };

  // ── Save Adjustment (Bonus / Deduction) ───────────────────────────────────
  const handleSaveAdjustment = async () => {
    if (!editingItem) return;
    setUpdating(true);
    try {
      const gross = editingItem.basicSalary + editingItem.transportAllowance + editingItem.housingAllowance + editingItem.otherAllowance;
      const net = gross - editingItem.deductions + editingItem.overtime + editingItem.incentives + editingItem.bonuses;

      await supabase.from('hr_payroll_runs').upsert({
        employee_id: editingItem.employeeId,
        month: selectedMonth,
        basic_salary: editingItem.basicSalary,
        transport_allowance: editingItem.transportAllowance,
        housing_allowance: editingItem.housingAllowance,
        other_allowance: editingItem.otherAllowance,
        deductions: editingItem.deductions,
        overtime: editingItem.overtime,
        incentives: editingItem.incentives,
        bonuses: editingItem.bonuses,
        net_salary: net,
        status: editingItem.status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'employee_id,month' });

      setEditingItem(null);
      fetchPayroll(true);
    } catch (err) {
      console.warn('Error saving adjustment:', err);
    } finally {
      setUpdating(false);
    }
  };

  // ── Download Individual Payslip (PDF) ─────────────────────────────────────
  const downloadPayslip = (item: PayrollItem) => {
    const doc = new jsPDF();
    const isRtl = isAr;

    doc.setFillColor(136, 19, 55);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('MAISARAH FINANCIAL & AUDITING', 14, 18);
    doc.setFontSize(10);
    doc.text(`Official Salary Payslip - ${selectedMonth}`, 14, 26);

    doc.setTextColor(51, 51, 51);
    doc.setFontSize(11);
    doc.text(`Employee Name: ${item.employeeName}`, 14, 48);
    doc.text(`Civil ID / Ref: ${item.civilId}`, 14, 55);
    doc.text(`Position: ${item.role}`, 14, 62);
    doc.text(`Department: ${item.dept}`, 14, 69);
    doc.text(`Bank / Account: ${item.bankName} - ${item.accountNumber}`, 14, 76);

    // Earnings Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 85, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS & ALLOWANCES', 18, 91);
    doc.text('AMOUNT (OMR)', 160, 91);

    doc.setFont('helvetica', 'normal');
    doc.text('Basic Salary', 18, 103);
    doc.text(item.basicSalary.toFixed(3), 170, 103);
    doc.text('Housing Allowance', 18, 111);
    doc.text(item.housingAllowance.toFixed(3), 170, 111);
    doc.text('Transport Allowance', 18, 119);
    doc.text(item.transportAllowance.toFixed(3), 170, 119);
    doc.text('Other Allowances', 18, 127);
    doc.text(item.otherAllowance.toFixed(3), 170, 127);

    // Deductions Table
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 137, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DEDUCTIONS & PASI CONTRIBUTION', 18, 143);
    doc.text('AMOUNT (OMR)', 160, 143);

    doc.setFont('helvetica', 'normal');
    doc.text('Absence / Unpaid Leave / PASI', 18, 155);
    doc.text(item.deductions.toFixed(3), 170, 155);

    // Net Payable Banner
    doc.setFillColor(136, 19, 55);
    doc.rect(14, 170, 182, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('NET SALARY PAYABLE:', 20, 179);
    doc.text(`OMR ${item.netSalary.toFixed(3)}`, 150, 179);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('This is an authorized electronic payslip issued by Maisarah Accounting & Payroll Command.', 14, 210);
    doc.text(`Status: ${item.status === 'Paid' ? 'PAID & TRANSFERRED' : 'PENDING DISBURSEMENT'}`, 14, 216);

    doc.save(`Payslip_${item.employeeName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
  };

  // ── Export Full Payroll Sheet to Excel (.xlsx) ─────────────────────────────
  const exportPayrollExcel = () => {
    const dataToExport = filteredList.map((item, idx) => ({
      '#': idx + 1,
      'Employee Name': item.employeeName,
      'Civil ID / Passport': item.civilId,
      'Position': item.role,
      'Department': item.dept,
      'Nationality': item.nationality,
      'Bank Account': item.accountNumber,
      'Basic Salary (OMR)': Number(item.basicSalary.toFixed(3)),
      'Housing Allowance (OMR)': Number(item.housingAllowance.toFixed(3)),
      'Transport Allowance (OMR)': Number(item.transportAllowance.toFixed(3)),
      'Other Allowance (OMR)': Number(item.otherAllowance.toFixed(3)),
      'Gross Salary (OMR)': Number(item.grossSalary.toFixed(3)),
      'Deductions (OMR)': Number(item.deductions.toFixed(3)),
      'Overtime / Bonus (OMR)': Number((item.overtime + item.bonuses).toFixed(3)),
      'Net Salary (OMR)': Number(item.netSalary.toFixed(3)),
      'Payment Status': item.status,
      'Disbursed Date': item.paymentDate || '',
      'Bank Reference': item.paymentReference || '',
    }));

    // Summary row
    const totalRow = {
      '#': 'TOTAL',
      'Employee Name': `${filteredList.length} Staff`,
      'Civil ID / Passport': '',
      'Position': '',
      'Department': '',
      'Nationality': '',
      'Bank Account': '',
      'Basic Salary (OMR)': Number(metrics.totalBasic.toFixed(3)),
      'Housing Allowance (OMR)': '',
      'Transport Allowance (OMR)': '',
      'Other Allowance (OMR)': Number(metrics.totalAllowances.toFixed(3)),
      'Gross Salary (OMR)': Number((metrics.totalBasic + metrics.totalAllowances).toFixed(3)),
      'Deductions (OMR)': Number(metrics.totalDeductions.toFixed(3)),
      'Overtime / Bonus (OMR)': '',
      'Net Salary (OMR)': Number(metrics.totalNet.toFixed(3)),
      'Payment Status': `${metrics.paidCount} Paid / ${metrics.pendingCount} Pending`,
      'Disbursed Date': '',
      'Bank Reference': '',
    };
    dataToExport.push(totalRow as any);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${selectedMonth.replace(/\s+/g, '_')}`);
    XLSX.writeFile(workbook, `Maisarah_Payroll_Sheet_${selectedMonth.replace(/\s+/g, '_')}.xlsx`);
  };

  // ── Export Central Bank of Oman / Bank Muscat WPS SIF File (.csv) ──────────
  const exportWPSFile = () => {
    const employerCR = '1454255';
    const employerBank = 'BKMTOMRX';
    const employerAccount = '0341012345678001';
    const valueDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Header record
    const header = `HDR,${employerCR},${employerBank},${employerAccount},${valueDate},${filteredList.length},${metrics.totalNet.toFixed(3)},WPS SALARY ${selectedMonth.toUpperCase()}`;

    // Detail records
    const details = filteredList.map((item, idx) => {
      const cleanCivilId = item.civilId.replace(/[^0-9]/g, '').padEnd(10, '0').slice(0, 10);
      const cleanAcct = item.accountNumber.replace(/[^0-9]/g, '');
      const cleanName = item.employeeName.replace(/,/g, '');
      return `DTL,${idx + 1},${cleanCivilId},${cleanAcct},${item.netSalary.toFixed(3)},${cleanName},SALARY`;
    });

    const fileContent = [header, ...details].join('\r\n');
    const blob = new Blob([fileContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WPS_SIF_Maisarah_${selectedMonth.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-800" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ── TOP HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-red-800/50">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-rose-200">
            <CreditCard size={14} className="text-amber-300" />
            <span>{isAr ? 'مسير الرواتب المعتمد وحماية الأجور WPS' : 'Staff Payroll Register & WPS Outflow'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isAr ? `مسير رواتب موظفي ميسرة (${selectedMonth})` : `Staff Payroll Roster (${selectedMonth})`}
          </h1>
          <p className="text-rose-100 text-sm max-w-2xl font-light">
            {isAr
              ? 'متابعة الرواتب الأساسية، البدلات والخصومات المعتمدة، اعتماد الصرف والتحويل البنكي، وتوليد ملف حماية الأجور (WPS) المتوافق مع بنك مسقط والبنك المركزي العماني.'
              : 'Supervise basic compensations, allowances, leave deductions, authorize monthly salary disbursals, and export Bank Muscat / CBO Wage Protection System files.'}
          </p>
        </div>

        {/* Action Controls & Month Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="appearance-none bg-white/15 hover:bg-white/20 text-white font-bold text-xs rounded-xl px-3.5 py-2.5 pr-8 rtl:pr-3.5 rtl:pl-8 border border-white/20 outline-none cursor-pointer backdrop-blur-md transition shadow-xs"
            >
              {availableMonths.map(m => (
                <option key={m} value={m} className="text-slate-900 font-bold">{m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-rose-200 pointer-events-none" />
          </div>

          {/* Export Excel */}
          <button
            onClick={exportPayrollExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 backdrop-blur-md transition shadow-xs cursor-pointer"
            title={isAr ? 'تصدير مسير الرواتب إكسل' : 'Export Payroll Excel'}
          >
            <Download size={14} />
            <span>{isAr ? 'تصدير إكسل' : 'Excel Sheet'}</span>
          </button>

          {/* Export WPS SIF */}
          <button
            onClick={exportWPSFile}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-md transition cursor-pointer"
            title={isAr ? 'توليد ملف نظام حماية الأجور للبنوك العمانية' : 'Generate CBO / Bank Muscat WPS SIF File'}
          >
            <FileSpreadsheet size={14} />
            <span>{isAr ? 'ملف حماية الأجور WPS' : 'WPS Bank File'}</span>
          </button>

          {/* Disburse All Pending */}
          <button
            onClick={handleBulkDisburseAll}
            disabled={updating || metrics.pendingCount === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-rose-50 text-red-950 rounded-xl text-xs font-black shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Check size={15} strokeWidth={3} className="text-red-900" />
            <span>{updating ? (isAr ? 'جاري التحويل...' : 'Disbursing...') : (isAr ? 'صرف الجميع دفعة واحدة' : 'Disburse All Pending')}</span>
          </button>
        </div>
      </div>

      {/* ── FINANCIAL KPIS SUMMARY RIBBON ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* KPI 1: Net Payroll Cost */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">{isAr ? 'إجمالي صافي الرواتب' : 'Total Net Payroll'}</span>
            <div className="w-7 h-7 rounded-full bg-red-50 text-red-900 border border-rose-200 flex items-center justify-center shadow-xs">
              <DollarSign size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 my-1">
            OMR {metrics.totalNet.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {isAr ? `${metrics.headcount} موظف مسجل` : `${metrics.headcount} Registered Staff`}
          </p>
        </div>

        {/* KPI 2: Basic Salaries Sum */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">{isAr ? 'الرواتب الأساسية' : 'Basic Salaries'}</span>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs">
              <Building2 size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 my-1">
            OMR {metrics.totalBasic.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {isAr ? 'الأجر المعتمد بالعقود' : 'Contracted Base Pay'}
          </p>
        </div>

        {/* KPI 3: Total Allowances */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">{isAr ? 'إجمالي البدلات' : 'Total Allowances'}</span>
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs">
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 my-1">
            + OMR {metrics.totalAllowances.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {isAr ? 'سكن + نقل + أخرى' : 'Housing, Transport & Other'}
          </p>
        </div>

        {/* KPI 4: Total Deductions */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">{isAr ? 'الاستقطاعات والتأمينات' : 'Deductions & PASI'}</span>
            <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shadow-xs">
              <ArrowDownLeft size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-rose-700 my-1">
            - OMR {metrics.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {isAr ? 'إجازات غير مدفوعة وتأمينات' : 'Unpaid Leaves & Social Ins.'}
          </p>
        </div>

        {/* KPI 5: Disbursement Status Progress */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500">{isAr ? 'حالة التحويل البنكي' : 'Disbursement Status'}</span>
            <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shadow-xs">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-1 my-1">
            <span className="text-xl font-black text-slate-900">
              {metrics.paidCount} <span className="text-xs text-slate-400 font-normal">/ {metrics.headcount}</span>
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
              metrics.pendingCount === 0
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-amber-100 text-amber-900 border-amber-200'
            }`}>
              {metrics.paymentProgressPct}% {isAr ? 'محول' : 'Paid'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.paymentProgressPct}%` }}
            />
          </div>
        </div>

      </div>

      {/* ── FILTER & SEARCH TOOLBAR ───────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، الرقم المدني، المسمى الوظيفي، أو القسم...' : 'Search by staff name, Civil ID, position, dept...'}
            className="w-full ps-9 pe-4 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-red-900 transition"
          />
        </div>

        {/* Department Filter */}
        <div className="relative">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 pr-8 rtl:pr-3.5 rtl:pl-8 text-xs font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-100 transition"
          >
            <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Payment Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 pr-8 rtl:pr-3.5 rtl:pl-8 text-xs font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-100 transition"
          >
            <option value="all">{isAr ? 'كافة الحالات' : 'All Payment Status'}</option>
            <option value="Paid">{isAr ? '✓ محول بنكياً (Paid)' : '✓ Paid'}</option>
            <option value="Pending">{isAr ? '⏳ بانتظار التحويل (Pending)' : '⏳ Pending'}</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchPayroll()}
          className="p-2 text-gray-400 hover:text-red-900 hover:bg-rose-50 rounded-xl transition cursor-pointer"
          title={isAr ? 'تحديث البيانات' : 'Refresh'}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── OFFICIAL PAYROLL SHEET TABLE ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-black text-[11px] tracking-wider">
                <th className="px-3 py-3.5 text-center border-e border-slate-200 w-12">#</th>
                <th className="px-4 py-3.5 text-start border-e border-slate-200">{isAr ? 'الموظف والرقم المدني' : 'Staff & Civil ID'}</th>
                <th className="px-3 py-3.5 text-start border-e border-slate-200">{isAr ? 'المسمى الوظيفي والقسم' : 'Role & Department'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200">{isAr ? 'الأساسي (ر.ع)' : 'Basic (OMR)'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200">{isAr ? 'البدلات (ر.ع)' : 'Allowances'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200">{isAr ? 'الإجمالي (Gross)' : 'Gross Salary'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200 text-rose-700">{isAr ? 'الخصومات / التأمين' : 'Deductions'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200 text-emerald-800 font-black">{isAr ? 'الصافي المستحق (Net)' : 'Net Payable (OMR)'}</th>
                <th className="px-3 py-3.5 text-center border-e border-slate-200">{isAr ? 'حالة التحويل' : 'Payment Status'}</th>
                <th className="px-3 py-3.5 text-center">{isAr ? 'الإجراءات المحاسبية' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                    {isAr ? 'لا يوجد موظفون مطابقون لخيارات البحث' : 'No staff payroll records match your filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isPaid = item.status === 'Paid';
                  const allowancesTotal = item.transportAllowance + item.housingAllowance + item.otherAllowance;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        isPaid ? 'bg-white' : 'bg-amber-50/10'
                      }`}
                    >
                      {/* Index */}
                      <td className="px-3 py-3 text-center text-slate-400 font-mono font-bold border-e border-slate-150">
                        {idx + 1}
                      </td>

                      {/* Staff Name & Civil ID */}
                      <td className="px-4 py-3 border-e border-slate-150">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-900 to-rose-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {item.employeeName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">{item.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.civilId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="px-3 py-3 border-e border-slate-150">
                        <p className="font-bold text-slate-800">{item.role}</p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                          {item.dept}
                        </span>
                      </td>

                      {/* Basic Salary */}
                      <td className="px-3 py-3 text-end font-mono font-bold text-slate-800 border-e border-slate-150">
                        {item.basicSalary.toFixed(3)}
                      </td>

                      {/* Allowances */}
                      <td className="px-3 py-3 text-end font-mono text-slate-700 border-e border-slate-150" title={`Housing: ${item.housingAllowance} | Transport: ${item.transportAllowance} | Other: ${item.otherAllowance}`}>
                        + {allowancesTotal.toFixed(3)}
                      </td>

                      {/* Gross Salary */}
                      <td className="px-3 py-3 text-end font-mono font-bold text-slate-900 bg-slate-50/50 border-e border-slate-150">
                        {item.grossSalary.toFixed(3)}
                      </td>

                      {/* Deductions */}
                      <td className="px-3 py-3 text-end font-mono font-bold text-rose-700 border-e border-slate-150">
                        - {item.deductions.toFixed(3)}
                      </td>

                      {/* Net Payable */}
                      <td className="px-3 py-3 text-end font-mono font-black text-emerald-800 text-sm bg-emerald-50/30 border-e border-slate-150">
                        OMR {item.netSalary.toFixed(3)}
                      </td>

                      {/* Payment Status */}
                      <td className="px-3 py-3 text-center border-e border-slate-150">
                        {isPaid ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>{isAr ? 'تم التحويل' : 'Paid'}</span>
                            </span>
                            {item.paymentDate && (
                              <span className="text-[9px] text-slate-400 font-mono mt-0.5">{item.paymentDate}</span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-200 inline-flex items-center gap-1">
                            <AlertCircle size={12} />
                            <span>{isAr ? 'بانتظار الصرف' : 'Pending'}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isPaid ? (
                            <button
                              onClick={() => {
                                setDisbursingItem(item);
                                setDisburseRef(`BM-WPS-${Math.floor(100000 + Math.random() * 900000)}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-900 hover:bg-red-800 text-amber-300 hover:text-white font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1"
                              title={isAr ? 'اعتماد وصرف الراتب' : 'Disburse Salary'}
                            >
                              <Check size={12} strokeWidth={3} />
                              <span>{isAr ? 'صرف' : 'Pay'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => downloadPayslip(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-900 hover:bg-rose-50 transition cursor-pointer"
                              title={isAr ? 'تحميل قسيمة الراتب PDF' : 'Download Payslip PDF'}
                            >
                              <FileText size={15} />
                            </button>
                          )}

                          {/* Quick Adjust Button */}
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title={isAr ? 'تعديل البدلات أو الخصومات' : 'Adjust allowances / deductions'}
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-xs">
                <td colSpan={3} className="px-4 py-3 text-start uppercase">
                  {isAr ? `إجمالي مسير الرواتب المعتمد (${filteredList.length} موظف)` : `Total Payroll Summary (${filteredList.length} Staff)`}
                </td>
                <td className="px-3 py-3 text-end font-mono">{metrics.totalBasic.toFixed(3)}</td>
                <td className="px-3 py-3 text-end font-mono">+ {metrics.totalAllowances.toFixed(3)}</td>
                <td className="px-3 py-3 text-end font-mono font-black">{(metrics.totalBasic + metrics.totalAllowances).toFixed(3)}</td>
                <td className="px-3 py-3 text-end font-mono font-black text-rose-700">- {metrics.totalDeductions.toFixed(3)}</td>
                <td className="px-3 py-3 text-end font-mono font-black text-emerald-800 text-base bg-emerald-100/60">
                  OMR {metrics.totalNet.toFixed(3)}
                </td>
                <td colSpan={2} className="px-3 py-3 text-center text-slate-500 font-bold">
                  {metrics.paidCount} {isAr ? 'تم صرفها' : 'Disbursed'} • {metrics.pendingCount} {isAr ? 'معلقة' : 'Pending'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: CONFIRM DISBURSEMENT & BANK REF ───────────────────────────── */}
      {disbursingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-5 bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  {isAr ? 'التحويل المصرفي المعتمد' : 'Bank Salary Disbursement'}
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {isAr ? 'تأكيد صرف الراتب للموظف' : 'Authorize Salary Disbursement'}
                </h3>
              </div>
              <button
                onClick={() => setDisbursingItem(null)}
                className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-600">{disbursingItem.employeeName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{disbursingItem.role} • {disbursingItem.dept}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">{isAr ? 'الصافي المستحق' : 'Net Salary'}</span>
                  <span className="text-xl font-black text-emerald-800 font-mono">OMR {disbursingItem.netSalary.toFixed(3)}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'المرجع البنكي / رقم قيد WPS' : 'Bank Reference / WPS Batch Ref'}
                  </label>
                  <input
                    type="text"
                    value={disburseRef}
                    onChange={e => setDisburseRef(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-red-900"
                    placeholder="e.g. BM-WPS-2026-1184"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'تاريخ التحويل المصرفي' : 'Transfer Date'}
                  </label>
                  <input
                    type="date"
                    value={disburseDate}
                    onChange={e => setDisburseDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-red-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisbursingItem(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisburse}
                  disabled={updating}
                  className="flex-1 py-2.5 bg-red-900 hover:bg-red-800 text-amber-300 hover:text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                  <span>{updating ? (isAr ? 'جاري الاعتماد...' : 'Authorizing...') : (isAr ? 'تأكيد وصرف الراتب' : 'Confirm & Disburse')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADJUST ALLOWANCES & DEDUCTIONS ────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-5 bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  {isAr ? 'تعديل مسير الراتب الفردي' : 'Payroll Adjustments'}
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {editingItem.employeeName}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'الراتب الأساسي (OMR)' : 'Basic Salary'}</label>
                  <input
                    type="number"
                    value={editingItem.basicSalary}
                    onChange={e => setEditingItem({ ...editingItem, basicSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-red-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'بدل السكن (OMR)' : 'Housing Allowance'}</label>
                  <input
                    type="number"
                    value={editingItem.housingAllowance}
                    onChange={e => setEditingItem({ ...editingItem, housingAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-red-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'بدل النقل (OMR)' : 'Transport Allowance'}</label>
                  <input
                    type="number"
                    value={editingItem.transportAllowance}
                    onChange={e => setEditingItem({ ...editingItem, transportAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-red-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'الخصومات / التأمينات (OMR)' : 'Deductions'}</label>
                  <input
                    type="number"
                    value={editingItem.deductions}
                    onChange={e => setEditingItem({ ...editingItem, deductions: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs text-rose-700 outline-none focus:border-red-900 font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                <span className="font-bold text-slate-700">{isAr ? 'الصافي المحتسب الجديد:' : 'New Computed Net:'}</span>
                <span className="font-black text-emerald-800 text-sm font-mono">
                  OMR {(editingItem.basicSalary + editingItem.housingAllowance + editingItem.transportAllowance + editingItem.otherAllowance - editingItem.deductions + editingItem.overtime + editingItem.incentives + editingItem.bonuses).toFixed(3)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdjustment}
                  disabled={updating}
                  className="flex-1 py-2.5 bg-red-900 hover:bg-red-800 text-amber-300 hover:text-white rounded-xl font-black text-xs transition cursor-pointer shadow-md"
                >
                  {updating ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Adjustments')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

