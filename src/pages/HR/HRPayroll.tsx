import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard, DollarSign, Download, FileText, CheckCircle2, User,
  ArrowUpRight, ArrowDownLeft, ShieldCheck, AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PayrollRecord {
  id: string;
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

const MOCK_PAYROLL: PayrollRecord[] = [
  {
    id: 'PAY-601',
    employeeName: 'Ahmed Al-Kharusi',
    role: 'Senior Auditor',
    dept: 'Audit',
    basicSalary: 1800,
    allowances: { transport: 150, housing: 300, other: 100 },
    deductions: 50, // e.g. social security / PASI contribution or late deduction
    overtime: 120,
    incentives: 75,
    bonuses: 500,
    month: 'June 2026',
    status: 'Paid'
  },
  {
    id: 'PAY-602',
    employeeName: 'Sara Al-Balushi',
    role: 'Tax Consultant',
    dept: 'Tax & VAT',
    basicSalary: 1500,
    allowances: { transport: 150, housing: 250, other: 50 },
    deductions: 80, // e.g. late check-in deductions
    overtime: 0,
    incentives: 100,
    bonuses: 300,
    month: 'June 2026',
    status: 'Paid'
  },
  {
    id: 'PAY-603',
    employeeName: 'Mohammed Maamari',
    role: 'Junior Associate',
    dept: 'Accounting',
    basicSalary: 1100,
    allowances: { transport: 100, housing: 200, other: 30 },
    deductions: 0,
    overtime: 45,
    incentives: 0,
    bonuses: 0,
    month: 'June 2026',
    status: 'Pending'
  }
];

export default function HRPayroll() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [records, setRecords] = useState<PayrollRecord[]>(MOCK_PAYROLL);
  const [selectedRecordId, setSelectedRecordId] = useState<string>(MOCK_PAYROLL[0].id);

  React.useEffect(() => {
    const paidList = localStorage.getItem('accountant_paid_payroll_ids') 
      ? JSON.parse(localStorage.getItem('accountant_paid_payroll_ids')!) as string[]
      : [];
    if (paidList.length > 0) {
      setRecords(prev => prev.map(r => paidList.includes(r.id) ? { ...r, status: 'Paid' } : r));
    }
  }, []);

  const selectedRec = records.find(r => r.id === selectedRecordId) || records[0];

  const calculateTotalAllowances = (rec: PayrollRecord) => 
    rec.allowances.transport + rec.allowances.housing + rec.allowances.other;

  const calculateNetSalary = (rec: PayrollRecord) => 
    rec.basicSalary + calculateTotalAllowances(rec) + rec.overtime + rec.incentives + rec.bonuses - rec.deductions;

  // Global KPIs
  const totalPayrollCost = records.reduce((acc, r) => acc + calculateNetSalary(r), 0);
  const pendingPayrollCount = records.filter(r => r.status === 'Pending').length;

  const downloadPayslipMock = (rec: PayrollRecord) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color Palette
    const brandRed = [161, 18, 18];      // #A11212
    const charcoal = [26, 26, 26];        // #1A1A1A
    const grayText = [110, 110, 110];     // #6E6E6E
    const bgLight = [249, 249, 249];      // #F9F9F9

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

    // 2. Employee Details Card (Grey block with border)
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(14, 38, 182, 30, 'F');
    doc.setDrawColor(235, 235, 235);
    doc.rect(14, 38, 182, 30, 'D');

    doc.setFontSize(9);
    // Left column details
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Employee Name:', 18, 44);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.employeeName, 48, 44);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Designated Role:', 18, 51);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.role, 48, 51);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Department:', 18, 58);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.dept, 48, 58);

    // Right column details
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Employee ID:', 120, 44);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.id, 148, 44);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Payment Status:', 120, 51);
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.status, 148, 51);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Currency:', 120, 58);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text('Omani Rial (OMR)', 148, 58);

    // 3. Earnings & Deductions Tables
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EARNINGS BREAKDOWN', 14, 78);
    doc.text('DEDUCTIONS BREAKDOWN', 110, 78);

    // Table Header Lines
    doc.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setLineWidth(0.8);
    doc.line(14, 81, 98, 81);
    doc.line(110, 81, 196, 81);

    // Earnings list
    const earnings = [
      { label: 'Basic Salary', val: rec.basicSalary },
      { label: 'Housing Allowance', val: rec.allowances.housing },
      { label: 'Transport Allowance', val: rec.allowances.transport },
      { label: 'Other Allowances', val: rec.allowances.other },
      { label: 'Overtime Pay', val: rec.overtime },
      { label: 'Incentives', val: rec.incentives },
      { label: 'Bonuses', val: rec.bonuses }
    ];

    doc.setFontSize(9);
    let y = 87;
    doc.setLineWidth(0.2);
    doc.setDrawColor(240, 240, 240);

    earnings.forEach((item) => {
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.setFont('Helvetica', 'normal');
      doc.text(item.label, 16, y);
      doc.setFont('Helvetica', 'bold');
      doc.text(`+${item.val.toLocaleString()} OMR`, 72, y);
      doc.line(14, y + 2, 98, y + 2);
      y += 7;
    });

    // Deductions list
    const deductions = [
      { label: 'PASI / Social Security (7%)', val: rec.deductions }
    ];

    let yD = 87;
    deductions.forEach((item) => {
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.setFont('Helvetica', 'normal');
      doc.text(item.label, 112, yD);
      doc.setFont('Helvetica', 'bold');
      doc.text(`-${item.val.toLocaleString()} OMR`, 170, yD);
      doc.line(110, yD + 2, 196, yD + 2);
      yD += 7;
    });

    // Draw remainder lines in deductions to balance height
    while (yD < y) {
      doc.line(110, yD + 2, 196, yD + 2);
      yD += 7;
    }

    // Totals calculations
    const totalEarnings = earnings.reduce((acc, cur) => acc + cur.val, 0);
    const totalDeductions = deductions.reduce((acc, cur) => acc + cur.val, 0);
    const netSalaryVal = totalEarnings - totalDeductions;

    let totalsY = Math.max(y, yD) + 5;

    // Totals row info
    doc.setFontSize(9);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Total Gross Earnings:', 14, totalsY);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${totalEarnings.toLocaleString()} OMR`, 72, totalsY);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Total Deductions:', 110, totalsY);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${totalDeductions.toLocaleString()} OMR`, 170, totalsY);

    totalsY += 8;

    // Highlights Box: Net salary
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(14, totalsY, 182, 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NET DISTRIBUTED AMOUNT:', 20, totalsY + 10);
    doc.setFontSize(14);
    doc.text(`${netSalaryVal.toLocaleString()} OMR`, 145, totalsY + 10);

    // 5. Signature area
    totalsY += 32;
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text('Prepared By: Human Resources Department', 14, totalsY);
    doc.text('Approved By: Finance & Operations Director', 120, totalsY);

    totalsY += 12;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(14, totalsY, 70, totalsY);
    doc.line(120, totalsY, 190, totalsY);

    totalsY += 4;
    doc.text('Official Stamp & Signature', 14, totalsY);
    doc.text('Authorized Signature', 120, totalsY);

    // Save PDF file
    doc.save(`Payslip_${rec.employeeName.replace(/\s+/g, '_')}_${rec.month.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── KPI Header Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#A11212] text-white p-5 rounded-2xl shadow-sm border border-transparent flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/70 font-black uppercase tracking-wider">{isAr ? 'إجمالي تكلفة الرواتب' : 'Total Monthly Payroll'}</p>
            <h3 className="text-2xl font-black mt-1">{totalPayrollCost.toLocaleString()} OMR</h3>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'حالة الدفع لشهر يونيو' : 'June Disbursed Status'}</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{records.length - pendingPayrollCount} / {records.length} {isAr ? 'مدفوع' : 'Paid'}</h3>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'بانتظار الصرف' : 'Pending Disbursal'}</p>
            <h3 className="text-2xl font-black text-red-600 mt-1">{pendingPayrollCount}</h3>
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#A11212]">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* ── Main Layout Split ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Left Side: Payroll Logs List */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1 mb-3">Employee Payroll Directory</h3>
          <div className="space-y-2">
            {records.map(rec => (
              <button
                key={rec.id}
                onClick={() => setSelectedRecordId(rec.id)}
                className={`w-full p-4 rounded-xl flex items-center justify-between border transition-all text-start ${
                  selectedRecordId === rec.id
                    ? 'bg-[#A11212]/5 border-[#A11212]'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div>
                  <h4 className="font-black text-xs text-gray-900">{rec.employeeName}</h4>
                  <p className="text-[9px] text-gray-500 font-bold">{rec.role} · {rec.dept}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs font-black text-gray-900">{calculateNetSalary(rec)} OMR</p>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                    rec.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Detailed Payslip Breakdown View */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start pb-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#A11212] text-white rounded-xl flex items-center justify-center font-black text-xl shadow-sm">
                  {selectedRec.employeeName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-sm text-gray-900">{selectedRec.employeeName}</h3>
                  <p className="text-[10px] text-gray-500 font-bold">{selectedRec.role} · {selectedRec.dept}</p>
                </div>
              </div>
              <button
                onClick={() => downloadPayslipMock(selectedRec)}
                className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl flex items-center gap-1 hover:bg-gray-800 transition-colors"
              >
                <Download size={14} /> PDF Payslip
              </button>
            </div>

            {/* Salary Breakdown Details */}
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold">Month</p>
                  <p className="text-xs font-black text-gray-900">{selectedRec.month}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold">Basic Salary</p>
                  <p className="text-xs font-black text-gray-900">{selectedRec.basicSalary} OMR</p>
                </div>
              </div>

              {/* Allowances */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Allowances</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50/50 p-2 rounded-lg">
                    <p className="text-[9px] text-gray-400 font-bold">Housing</p>
                    <p className="text-xs font-black text-gray-800">+{selectedRec.allowances.housing} OMR</p>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-lg">
                    <p className="text-[9px] text-gray-400 font-bold">Transport</p>
                    <p className="text-xs font-black text-gray-800">+{selectedRec.allowances.transport} OMR</p>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-lg">
                    <p className="text-[9px] text-gray-400 font-bold">Other</p>
                    <p className="text-xs font-black text-gray-800">+{selectedRec.allowances.other} OMR</p>
                  </div>
                </div>
              </div>

              {/* Adjustments: Overtime / Incentives / Bonuses vs Deductions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-green-100 bg-green-50/10 rounded-xl p-4 space-y-2">
                  <h4 className="text-[10px] font-black text-green-700 uppercase tracking-wider">Additional Earnings</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Overtime</p>
                      <p className="text-xs font-black text-green-700">+{selectedRec.overtime} OMR</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Incentives</p>
                      <p className="text-xs font-black text-green-700">+{selectedRec.incentives} OMR</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Bonuses</p>
                      <p className="text-xs font-black text-green-700">+{selectedRec.bonuses} OMR</p>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-red-100 bg-red-50/10 rounded-xl p-4 space-y-2">
                  <h4 className="text-[10px] font-black text-red-700 uppercase tracking-wider">Deductions</h4>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold">Social Security / Deductions</p>
                    <p className="text-xs font-black text-red-600">-{selectedRec.deductions} OMR</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final Monthly Disbursal Box */}
          <div className="mt-6 border-t border-gray-100 pt-5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Net Monthly Salary Package</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{calculateNetSalary(selectedRec)} OMR</h3>
            </div>
            {selectedRec.status === 'Pending' && (
              <button
                onClick={() => {
                  const currentApprovals = localStorage.getItem('manager_approval_requests')
                    ? JSON.parse(localStorage.getItem('manager_approval_requests')!) as any[]
                    : [];
                  
                  if (currentApprovals.some(a => a.id === 'PAY-REQ-2026')) {
                    alert('Payroll has already been submitted to Executive Manager for approval!');
                    return;
                  }

                  const newApproval = {
                    id: 'PAY-REQ-2026',
                    type: 'hr',
                    title: 'June 2026 Staff Payroll Sheet',
                    department: 'Human Resources',
                    submitter: 'Fatma Al-Harthy',
                    amount: totalPayrollCost,
                    status: 'pending',
                    date: new Date().toISOString(),
                    description: `Total monthly payroll breakdown for June 2026 covering ${records.length} active employees. Net payable: ${totalPayrollCost} OMR.`,
                    urgency: 'high'
                  };

                  localStorage.setItem('manager_approval_requests', JSON.stringify([newApproval, ...currentApprovals]));
                  localStorage.setItem('manager_pending_payroll_data', JSON.stringify(records));
                  alert('June 2026 Payroll Sheet has been submitted to the Executive Manager for authorization!');
                }}
                className="bg-brand-dark text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl hover:bg-gray-800 shadow-sm transition-all"
              >
                Submit to Manager for Approval
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
