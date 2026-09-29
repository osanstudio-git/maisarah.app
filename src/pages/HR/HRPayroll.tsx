import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  CreditCard, DollarSign, Download, FileText, CheckCircle2, User,
  ArrowUpRight, ArrowDownLeft, ShieldCheck, AlertCircle, Loader2, Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  dept: string;
  basicSalary: number;
  allowances: { transport: number; housing: number; other: number };
  deductions: number;
  overtime: number;
  incentives: number;
  bonuses: number;
  month: string;
  status: 'Paid' | 'Pending';
}

export default function HRPayroll() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const currentMonthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // ── 1. Fetch live payroll records and employee packages ─────────────────────
  const fetchPayrollData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: profData }, { data: hrData }, { data: runData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('*'),
        supabase.from('hr_payroll_runs').select('*')
      ]);

      const empMap = new Map<string, any>();
      (profData || []).filter(p => p.role !== 'client').forEach(p => {
        empMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
          role: p.role || 'Employee',
          dept: p.department_id || p.department || 'General',
          basicSalary: 1200,
          allowances: { transport: 150, housing: 250, other: 50 },
          deductions: 0,
          overtime: 0,
          incentives: 0,
          bonuses: 0
        });
      });

      (hrData || []).forEach(h => {
        const existing = empMap.get(h.id);
        const allowances = h.allowances || { transport: 150, housing: 250, other: 50 };
        empMap.set(h.id, {
          id: h.id,
          name: h.full_name || existing?.name || 'Staff Member',
          role: h.role || existing?.role || 'Employee',
          dept: h.dept || existing?.dept || 'General',
          basicSalary: Number(h.basic_salary || 1200),
          allowances: {
            transport: Number(allowances.transport || 150),
            housing: Number(allowances.housing || 250),
            other: Number(allowances.other || 50)
          },
          deductions: 0,
          overtime: 0,
          incentives: 0,
          bonuses: 0
        });
      });

      const employees = Array.from(empMap.values());
      const paidCache = JSON.parse(localStorage.getItem('accountant_paid_payroll_ids') || '[]');

      const payrollList: PayrollRecord[] = employees.map(emp => {
        const liveRun = (runData || []).find((r: any) => r.employee_id === emp.id && r.month === currentMonthStr);
        const isPaid = liveRun?.status === 'Paid' || paidCache.includes(`PAY-${emp.id.slice(0, 6)}`);

        return {
          id: liveRun?.id || `PAY-${emp.id.slice(0, 6)}`,
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.role,
          dept: emp.dept,
          basicSalary: liveRun ? Number(liveRun.basic_salary) : emp.basicSalary,
          allowances: liveRun ? {
            transport: Number(liveRun.transport_allowance || 150),
            housing: Number(liveRun.housing_allowance || 250),
            other: Number(liveRun.other_allowance || 50)
          } : emp.allowances,
          deductions: liveRun ? Number(liveRun.deductions || 0) : 50,
          overtime: liveRun ? Number(liveRun.overtime || 0) : 60,
          incentives: liveRun ? Number(liveRun.incentives || 0) : 50,
          bonuses: liveRun ? Number(liveRun.bonuses || 0) : 0,
          month: currentMonthStr,
          status: isPaid ? 'Paid' : 'Pending'
        };
      });

      setRecords(payrollList);
      if (payrollList.length > 0 && !selectedRecordId) {
        setSelectedRecordId(payrollList[0].id);
      }
    } catch (err) {
      console.error('Error fetching HR payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonthStr, selectedRecordId]);

  useEffect(() => {
    fetchPayrollData();

    const channel = supabase
      .channel('hr_payroll_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_payroll_runs' }, () => fetchPayrollData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_employees' }, () => fetchPayrollData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayrollData]);

  const selectedRec = records.find(r => r.id === selectedRecordId) || records[0];

  const calculateTotalAllowances = (rec: PayrollRecord) => 
    rec.allowances.transport + rec.allowances.housing + rec.allowances.other;

  const calculateNetSalary = (rec: PayrollRecord) => 
    rec.basicSalary + calculateTotalAllowances(rec) + rec.overtime + rec.incentives + rec.bonuses - rec.deductions;

  // Global KPIs
  const totalPayrollCost = records.reduce((acc, r) => acc + calculateNetSalary(r), 0);
  const pendingPayrollCount = records.filter(r => r.status === 'Pending').length;

  const handleTogglePaidStatus = async (rec: PayrollRecord) => {
    const nextStatus = rec.status === 'Paid' ? 'Pending' : 'Paid';
    setUpdating(true);

    // Optimistic UI update
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, status: nextStatus } : r));

    // Update local cache
    const paidList = JSON.parse(localStorage.getItem('accountant_paid_payroll_ids') || '[]');
    if (nextStatus === 'Paid') {
      if (!paidList.includes(rec.id)) paidList.push(rec.id);
    } else {
      const idx = paidList.indexOf(rec.id);
      if (idx >= 0) paidList.splice(idx, 1);
    }
    localStorage.setItem('accountant_paid_payroll_ids', JSON.stringify(paidList));

    try {
      await supabase
        .from('hr_payroll_runs')
        .upsert({
          employee_id: rec.employeeId,
          month: rec.month,
          basic_salary: rec.basicSalary,
          transport_allowance: rec.allowances.transport,
          housing_allowance: rec.allowances.housing,
          other_allowance: rec.allowances.other,
          deductions: rec.deductions,
          overtime: rec.overtime,
          incentives: rec.incentives,
          bonuses: rec.bonuses,
          net_salary: calculateNetSalary(rec),
          status: nextStatus
        }, { onConflict: 'employee_id,month' });
    } catch (err) {
      console.warn('DB upsert notice for hr_payroll_runs:', err);
    } finally {
      setUpdating(false);
    }
  };

  const downloadPayslipMock = (rec: PayrollRecord) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const brandRed = [161, 18, 18];
    const charcoal = [26, 26, 26];
    const grayText = [110, 110, 110];
    const bgLight = [249, 249, 249];

    // 1. Corporate Top Accent Bar
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(0, 0, 210, 8, 'F');

    // Title / Corporate Brand
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MAISARAH GROUP', 14, 24);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Corporate HR Services Portal | Muscat, Sultanate of Oman', 14, 29);

    // Document Type
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('OFFICIAL PAYSLIP', 145, 24);

    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFontSize(10);
    doc.text(`Month: ${rec.month}`, 145, 29);

    // Separator Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 34, 196, 34);

    // 2. Employee Details Card
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, 38, 182, 28, 3, 3, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('EMPLOYEE NAME:', 20, 46);
    doc.text('JOB ROLE:', 20, 53);
    doc.text('DEPARTMENT:', 20, 60);

    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(rec.employeeName, 60, 46);
    doc.text(rec.role, 60, 53);
    doc.text(rec.dept, 60, 60);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('PAYSLIP ID:', 120, 46);
    doc.text('PAY PERIOD:', 120, 53);
    doc.text('STATUS:', 120, 60);

    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(rec.id, 150, 46);
    doc.text(rec.month, 150, 53);
    doc.setTextColor(rec.status === 'Paid' ? 34 : 200, rec.status === 'Paid' ? 139 : 50, 34);
    doc.text(rec.status.toUpperCase(), 150, 60);

    // 3. Earnings & Deductions Tables
    let y = 74;

    // Table Header
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(14, y, 88, 7, 'F');
    doc.rect(108, y, 88, 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('EARNINGS & ALLOWANCES', 18, y + 5);
    doc.text('DEDUCTIONS & WITHHOLDINGS', 112, y + 5);

    y += 13;
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);

    const leftRows = [
      ['Basic Salary', `${rec.basicSalary.toFixed(2)} OMR`],
      ['Housing Allowance', `${rec.allowances.housing.toFixed(2)} OMR`],
      ['Transport Allowance', `${rec.allowances.transport.toFixed(2)} OMR`],
      ['Other Allowance', `${rec.allowances.other.toFixed(2)} OMR`],
      ['Overtime Pay', `${rec.overtime.toFixed(2)} OMR`],
      ['Incentives / Commission', `${rec.incentives.toFixed(2)} OMR`],
      ['Bonuses / Rewards', `${rec.bonuses.toFixed(2)} OMR`]
    ];

    const rightRows = [
      ['Social Security / PASI', `${(rec.deductions * 0.6).toFixed(2)} OMR`],
      ['Late / Absence Penalty', `${(rec.deductions * 0.4).toFixed(2)} OMR`],
      ['Other Deductions', '0.00 OMR']
    ];

    leftRows.forEach((row, i) => {
      doc.text(row[0], 18, y + (i * 7));
      doc.setFont('Helvetica', 'bold');
      doc.text(row[1], 95, y + (i * 7), { align: 'right' });
      doc.setFont('Helvetica', 'normal');
    });

    rightRows.forEach((row, i) => {
      doc.text(row[0], 112, y + (i * 7));
      doc.setFont('Helvetica', 'bold');
      doc.text(row[1], 190, y + (i * 7), { align: 'right' });
      doc.setFont('Helvetica', 'normal');
    });

    // 4. Totals Block
    const totalEarnings = rec.basicSalary + calculateTotalAllowances(rec) + rec.overtime + rec.incentives + rec.bonuses;
    const netSalary = calculateNetSalary(rec);

    y += 56;
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(14, y, 182, 24, 3, 3, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('TOTAL GROSS EARNINGS:', 20, y + 8);
    doc.text('TOTAL DEDUCTIONS:', 20, y + 16);

    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(`${totalEarnings.toFixed(2)} OMR`, 95, y + 8, { align: 'right' });
    doc.text(`${rec.deductions.toFixed(2)} OMR`, 95, y + 16, { align: 'right' });

    doc.setFontSize(11);
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.text('NET SALARY PAYABLE:', 112, y + 12);
    doc.setFontSize(13);
    doc.text(`${netSalary.toFixed(2)} OMR`, 190, y + 12, { align: 'right' });

    // Footer
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text('This is a computer-generated payslip authorized under Maisarah HR WPS Payroll Management.', 105, 275, { align: 'center' });

    doc.save(`Payslip_${rec.employeeName.replace(/\s+/g, '_')}_${rec.month}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'إجمالي مسير الرواتب' : 'Total Payroll Outflow'}</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{totalPayrollCost.toLocaleString()} OMR</h3>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'رواتب معلقة للصرف' : 'Pending Disbursals'}</p>
            <h3 className="text-2xl font-black text-[#A11212] mt-1">{pendingPayrollCount} {isAr ? 'موظف' : 'Staff'}</h3>
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#A11212]">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'فترة المسير الحالية' : 'Current Pay Cycle'}</p>
            <h3 className="text-xl font-black text-gray-900 mt-1">{currentMonthStr}</h3>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* ── Main Split View ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-4">
            {isAr ? 'قائمة مسير رواتب الكادر' : 'Employee Payroll Roster'}
          </h3>

          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 size={24} className="animate-spin text-[#A11212] mx-auto mb-2" />
              <p className="text-xs font-bold">{isAr ? 'جاري تحميل الرواتب...' : 'Loading payroll...'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto">
              {records.map(rec => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecordId(rec.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedRecordId === rec.id
                      ? 'bg-red-50/60 border-[#A11212]/30 shadow-xs'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <h4 className="font-black text-xs text-gray-900">{rec.employeeName}</h4>
                    <p className="text-[10px] text-gray-500 font-bold">{rec.role} · {rec.dept}</p>
                    <p className="text-xs font-black text-[#A11212] mt-0.5">{calculateNetSalary(rec).toFixed(2)} OMR</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    rec.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-150' : 'bg-orange-50 text-orange-700 border-orange-150'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Selected Employee Detailed Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          {selectedRec ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
                <div>
                  <span className="text-[9px] font-black uppercase bg-[#A11212]/10 text-[#A11212] px-2.5 py-1 rounded-md">
                    {selectedRec.id}
                  </span>
                  <h2 className="text-lg font-black text-gray-900 mt-2">{selectedRec.employeeName}</h2>
                  <p className="text-xs text-gray-500 font-bold">{selectedRec.role} · {selectedRec.dept}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePaidStatus(selectedRec)}
                    disabled={updating}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                      selectedRec.status === 'Paid'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {updating && <Loader2 size={14} className="animate-spin" />}
                    <Check size={14} />
                    {selectedRec.status === 'Paid' ? (isAr ? 'تم الصرف (تحويل لمعلق)' : 'Mark Pending') : (isAr ? 'اعتماد الصرف (Mark Paid)' : 'Mark Paid')}
                  </button>

                  <button
                    onClick={() => downloadPayslipMock(selectedRec)}
                    className="bg-[#A11212] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Download size={14} /> {isAr ? 'تحميل قسيمة الراتب PDF' : 'Download Payslip'}
                  </button>
                </div>
              </div>

              {/* Earnings & Deductions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {isAr ? 'الراتب والبدلات' : 'Earnings & Allowances'}
                  </h4>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{isAr ? 'الراتب الأساسي' : 'Basic Salary'}</span>
                    <span className="text-gray-900">{selectedRec.basicSalary.toFixed(2)} OMR</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{isAr ? 'بدل سكن' : 'Housing Allowance'}</span>
                    <span className="text-gray-900">{selectedRec.allowances.housing.toFixed(2)} OMR</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{isAr ? 'بدل نقل' : 'Transport Allowance'}</span>
                    <span className="text-gray-900">{selectedRec.allowances.transport.toFixed(2)} OMR</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{isAr ? 'بدلات أخرى' : 'Other Allowance'}</span>
                    <span className="text-gray-900">{selectedRec.allowances.other.toFixed(2)} OMR</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{isAr ? 'ساعات إضافية' : 'Overtime'}</span>
                    <span className="text-green-700">+{selectedRec.overtime.toFixed(2)} OMR</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{isAr ? 'حوافز ومكافآت' : 'Incentives & Bonuses'}</span>
                    <span className="text-green-700">+{(selectedRec.incentives + selectedRec.bonuses).toFixed(2)} OMR</span>
                  </div>
                </div>

                {/* Deductions & Summary */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-2.5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      {isAr ? 'الخصومات والاستقطاعات' : 'Deductions'}
                    </h4>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-600">{isAr ? 'التأمينات الاجتماعية / غيابات' : 'Social Security / Penalties'}</span>
                      <span className="text-red-600">-{selectedRec.deductions.toFixed(2)} OMR</span>
                    </div>
                  </div>

                  <div className="bg-red-50/50 p-5 rounded-xl border border-[#A11212]/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                        {isAr ? 'صافي الراتب المستحق' : 'Net Salary Payable'}
                      </p>
                      <h3 className="text-2xl font-black text-[#A11212] mt-0.5">
                        {calculateNetSalary(selectedRec).toFixed(2)} OMR
                      </h3>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                      selectedRec.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200'
                    }`}>
                      {selectedRec.status}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 py-12">{isAr ? 'اختر موظفاً لعرض التفاصيل' : 'Select an employee to view breakdown'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
