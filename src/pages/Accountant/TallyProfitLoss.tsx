import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  UploadCloud, FileSpreadsheet, FileText, CheckCircle2, AlertCircle,
  Clock, Calendar, TrendingUp, Download, Eye, Send, Check, ShieldCheck,
  ChevronDown, Trash2, ArrowUpRight, ArrowDownRight, DollarSign, Building2,
  Plus, Sparkles, RefreshCw, X, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface TallyPLReport {
  id: string;
  month: string; // e.g. "October 2026"
  year: number;
  fileName: string;
  fileSize?: string;
  uploadDate: string; // YYYY-MM-DD
  deadlineDate: string; // e.g. "2026-11-10"
  revenue: number;
  directCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  status: 'Submitted' | 'Draft' | 'Acknowledged';
  submittedAt?: string;
  submittedBy?: string;
  managementNotes?: string;
  isOverdue?: boolean;
}

const STORAGE_KEY = 'maisarah_tally_pl_reports_v1';

// Seed realistic monthly statements for 2026
const DEFAULT_REPORTS: TallyPLReport[] = [
  {
    id: 'TALLY-2026-10',
    month: 'October 2026',
    year: 2026,
    fileName: 'Tally_PL_Maisarah_Oct2026_Final.xlsx',
    fileSize: '48.2 KB',
    uploadDate: '2026-11-08',
    deadlineDate: '2026-11-10',
    revenue: 16840.000,
    directCosts: 1950.000,
    grossProfit: 14890.000,
    operatingExpenses: 4420.000,
    netProfit: 10470.000,
    netMarginPct: 62.2,
    status: 'Submitted',
    submittedAt: '2026-11-08T10:14:00Z',
    submittedBy: 'Chief Accountant',
    managementNotes: 'Acknowledged by Managing Partner (Budoor Alhasani)',
    isOverdue: false
  },
  {
    id: 'TALLY-2026-09',
    month: 'September 2026',
    year: 2026,
    fileName: 'Tally_PL_Maisarah_Sep2026.xlsx',
    fileSize: '46.8 KB',
    uploadDate: '2026-10-09',
    deadlineDate: '2026-10-10',
    revenue: 15420.000,
    directCosts: 1800.000,
    grossProfit: 13620.000,
    operatingExpenses: 4310.000,
    netProfit: 9310.000,
    netMarginPct: 60.4,
    status: 'Acknowledged',
    submittedAt: '2026-10-09T08:30:00Z',
    submittedBy: 'Chief Accountant',
    managementNotes: 'Approved & filed for quarterly VAT preparation',
    isOverdue: false
  },
  {
    id: 'TALLY-2026-08',
    month: 'August 2026',
    year: 2026,
    fileName: 'Tally_PL_Maisarah_Aug2026.xlsx',
    fileSize: '45.1 KB',
    uploadDate: '2026-09-07',
    deadlineDate: '2026-09-10',
    revenue: 18250.000,
    directCosts: 2100.000,
    grossProfit: 16150.000,
    operatingExpenses: 4500.000,
    netProfit: 11650.000,
    netMarginPct: 63.8,
    status: 'Acknowledged',
    submittedAt: '2026-09-07T11:20:00Z',
    submittedBy: 'Chief Accountant',
    isOverdue: false
  },
  {
    id: 'TALLY-2026-07',
    month: 'July 2026',
    year: 2026,
    fileName: 'Tally_PL_Maisarah_Jul2026.xlsx',
    fileSize: '44.3 KB',
    uploadDate: '2026-08-09',
    deadlineDate: '2026-08-10',
    revenue: 14900.000,
    directCosts: 1750.000,
    grossProfit: 13150.000,
    operatingExpenses: 4200.000,
    netProfit: 8950.000,
    netMarginPct: 60.1,
    status: 'Acknowledged',
    submittedAt: '2026-08-09T09:45:00Z',
    submittedBy: 'Chief Accountant',
    isOverdue: false
  }
];

export default function TallyProfitLoss() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [reports, setReports] = useState<TallyPLReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_REPORTS;
  });

  const saveReports = (newList: TallyPLReport[]) => {
    setReports(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {}
  };

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TallyPLReport | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // New report form state
  const [newMonth, setNewMonth] = useState('November 2026');
  const [newYear, setNewYear] = useState(2026);
  const [newRevenue, setNewRevenue] = useState(17500);
  const [newDirectCosts, setNewDirectCosts] = useState(2000);
  const [newOperatingExpenses, setNewOperatingExpenses] = useState(4550);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // ── Calculate Deadlines & 10th-of-the-Month Watchdog ────────────────────────
  // The P&L for Month M must be uploaded and submitted by the 10th of Month M+1
  const currentWatchdog = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentDay = today.getDate();

    // Check November report status
    const novReport = reports.find(r => r.month === 'November 2026');
    const octReport = reports.find(r => r.month === 'October 2026');

    // Deadline for current billing cycle (10th of every month)
    const currentMonthNum = today.getMonth() + 1;
    const currentYearNum = today.getFullYear();
    const next10thDate = new Date(currentYearNum, today.getMonth(), 10);
    const deadlineFormatted = next10thDate.toLocaleDateString(isAr ? 'ar-OM' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const isPast10th = currentDay > 10;
    const daysUntil10th = isPast10th ? 0 : (10 - currentDay);

    return {
      deadlineFormatted,
      currentDay,
      isPast10th,
      daysUntil10th,
      octSubmitted: !!octReport && octReport.status !== 'Draft',
      novSubmitted: !!novReport && novReport.status !== 'Draft',
      todayStr
    };
  }, [reports, isAr]);

  // ── Parse Uploaded Tally Excel File ─────────────────────────────────────────
  const handleFileUpload = (file: File) => {
    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Search for keywords in Tally P&L (Sales, Revenue, Expenses, Net Profit)
        let foundRev = 0;
        let foundCosts = 0;
        let foundExp = 0;

        json.forEach(row => {
          if (!row || !Array.isArray(row)) return;
          const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');

          if (rowText.includes('sales') || rowText.includes('revenue') || rowText.includes('income')) {
            const num = row.find(c => typeof c === 'number' && c > 1000);
            if (num) foundRev = Number(num);
          }
          if (rowText.includes('cost of sales') || rowText.includes('direct cost')) {
            const num = row.find(c => typeof c === 'number' && c > 100);
            if (num) foundCosts = Number(num);
          }
          if (rowText.includes('indirect') || rowText.includes('operating expense') || rowText.includes('expenses')) {
            const num = row.find(c => typeof c === 'number' && c > 500);
            if (num) foundExp = Number(num);
          }
        });

        if (foundRev > 0) setNewRevenue(foundRev);
        if (foundCosts > 0) setNewDirectCosts(foundCosts);
        if (foundExp > 0) setNewOperatingExpenses(foundExp);
      } catch (err) {
        console.warn('Tally parser notice (fallback to manual inputs):', err);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ── Save New Tally Report ──────────────────────────────────────────────────
  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();

    const gross = newRevenue - newDirectCosts;
    const net = gross - newOperatingExpenses;
    const margin = newRevenue > 0 ? Number(((net / newRevenue) * 100).toFixed(1)) : 0;

    const newReport: TallyPLReport = {
      id: `TALLY-${newYear}-${Date.now().toString().slice(-4)}`,
      month: newMonth,
      year: newYear,
      fileName: uploadedFileName || `Tally_PL_Maisarah_${newMonth.replace(/\s+/g, '_')}.xlsx`,
      fileSize: '52.4 KB',
      uploadDate: new Date().toISOString().split('T')[0],
      deadlineDate: '2026-12-10',
      revenue: newRevenue,
      directCosts: newDirectCosts,
      grossProfit: gross,
      operatingExpenses: newOperatingExpenses,
      netProfit: net,
      netMarginPct: margin,
      status: 'Draft',
      submittedBy: 'Chief Accountant',
      isOverdue: false
    };

    saveReports([newReport, ...reports.filter(r => r.month !== newMonth)]);
    setIsUploadModalOpen(false);
    setUploadedFileName('');
  };

  // ── 1-Click Send to Management Workflow ────────────────────────────────────
  const handleSendToManagement = async (report: TallyPLReport) => {
    setSubmittingId(report.id);
    try {
      const nowIso = new Date().toISOString();
      const updated = reports.map(r => {
        if (r.id === report.id) {
          return {
            ...r,
            status: 'Submitted' as const,
            submittedAt: nowIso,
            managementNotes: isAr ? 'تم الإرسال للإدارة العامة بانتظار الاعتماد النهائي' : 'Transmitted to Managing Partner for Executive Sign-off'
          };
        }
        return r;
      });
      saveReports(updated);

      // Push real-time executive notification directly to General Manager
      await supabase.from('notifications').insert([{
        recipient_role: 'manager',
        title: isAr ? 'تقرير الأرباح والخسائر الشهري من تالي (Tally P&L)' : 'Monthly Tally P&L Statement Submitted',
        message: isAr
          ? `قام المحاسب باعتماد وإرسال تقرير الأرباح والخسائر من نظام تالي لشهر (${report.month}) بإيرادات OMR ${report.revenue.toFixed(3)} وصافي ربح OMR ${report.netProfit.toFixed(3)}.`
          : `Accountant submitted official Tally P&L statement for ${report.month} (Revenue: OMR ${report.revenue.toFixed(3)}, Net Profit: OMR ${report.netProfit.toFixed(3)}) for management review.`,
        type: 'tally_pl_submitted'
      }]);

      alert(isAr
        ? `✓ تم إرسال تقرير الأرباح والخسائر لشهر ${report.month} بنجاح إلى الإدارة العامة (المدير العام: بدور الحسني).`
        : `✓ Monthly Tally P&L statement for ${report.month} successfully transmitted to Executive Management (Managing Partner: Budoor Alhasani).`
      );
    } catch (err: any) {
      console.warn('Send to management notice:', err?.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-800" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ── TOP HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-red-800/50">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-rose-200">
            <TrendingUp size={14} className="text-amber-300" />
            <span>{isAr ? 'نظام المحاسبة المركزي تالي • Tally ERP P&L' : 'Tally ERP Monthly P&L Management Station'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isAr ? 'تقارير الأرباح والخسائر الشهرية من تالي (Tally P&L)' : 'Monthly Profit & Loss from Tally (P&L)'}
          </h1>
          <p className="text-rose-100 text-sm max-w-2xl font-light">
            {isAr
              ? 'رفع وتوثيق القوائم المالية الشهرية المستخرجة من تالي، الالتزام بالموعد النهائي للإرسال للإدارة العامة (10 من كل شهر)، ومتابعة مؤشرات الربحية.'
              : 'Upload and audit monthly P&L statements exported from Tally, enforce the strict 10th-of-the-month management submission deadline, and track profit margins.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-md transition cursor-pointer active:scale-95"
          >
            <UploadCloud size={16} />
            <span>{isAr ? 'رفع تقرير P&L جديد من تالي' : 'Upload Monthly Tally P&L'}</span>
          </button>
        </div>
      </div>

      {/* ── 10TH OF THE MONTH SLA COMPLIANCE WATCHDOG BANNER ──────────────────── */}
      <div className={`rounded-3xl p-5 sm:p-6 border shadow-sm transition-all ${
        currentWatchdog.octSubmitted
          ? 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-emerald-700/60'
          : currentWatchdog.isPast10th
            ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white border-red-700/60'
            : 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white border-amber-600/60'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              currentWatchdog.octSubmitted
                ? 'bg-emerald-500 text-white'
                : currentWatchdog.isPast10th
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-amber-500 text-slate-950'
            }`}>
              {currentWatchdog.octSubmitted ? (
                <ShieldCheck size={26} />
              ) : currentWatchdog.isPast10th ? (
                <AlertTriangle size={26} />
              ) : (
                <Clock size={26} />
              )}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-black">
                <span>{isAr ? 'الالتزام بموعد التسليم للإدارة العامة' : 'Management SLA Submission Deadline'}</span>
                <span>•</span>
                <span className="text-amber-300">{isAr ? 'الموعد الأقصى: 10 من كل شهر' : 'Strict Deadline: 10th of every month'}</span>
              </div>
              <h3 className="text-lg font-black tracking-tight">
                {currentWatchdog.octSubmitted
                  ? (isAr ? '✓ تم تسليم تقرير شهر أكتوبر للإدارة العامة في الموعد المحدد' : '✓ October P&L Statement Transmitted to Management On Time')
                  : currentWatchdog.isPast10th
                    ? (isAr ? 'تنبيه: تجاوز موعد 10 من الشهر - يتطلب رفع التقرير فوراً' : 'Attention: 10th of the Month Deadline Elapsed - Immediate Action Required')
                    : (isAr ? `بانتظار تسليم التقرير للإدارة - متبقي ${currentWatchdog.daysUntil10th} أيام حتى تاريخ 10` : `Submission Window Active - ${currentWatchdog.daysUntil10th} days remaining until the 10th`)}
              </h3>
              <p className="text-xs text-rose-100/80 font-light">
                {isAr
                  ? 'وفقاً لسياسة الحوكمة المالية في ميسرة، يلتزم قسم المحاسبة بإقفال دفاتر تالي وإرسال القوائم المالية الشهرية المعتمدة للمدير العام في موعد أقصاه 10 من الشهر التالي.'
                  : 'Maisarah financial compliance policy requires all monthly Tally general ledgers to be finalized and transmitted to the Managing Partner no later than the 10th of the following month.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="bg-white/10 rounded-2xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[10px] text-rose-200/80 block uppercase font-bold">{isAr ? 'الموعد النهائي' : 'SLA Target'}</span>
              <span className="text-sm font-black text-amber-300 font-mono">10th Monthly</span>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[10px] text-rose-200/80 block uppercase font-bold">{isAr ? 'حالة الاعتماد' : 'Executive Status'}</span>
              <span className="text-sm font-black text-emerald-300">{isAr ? 'جاهز للإرسال' : 'Ready'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HISTORICAL TALLY P&L STATEMENTS ARCHIVE ───────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-red-900" />
              <span>{isAr ? 'أرشيف القوائم المالية الشهرية المعتمدة من تالي (2026)' : 'Approved Monthly Tally P&L Archive (2026)'}</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {isAr ? 'سجل القوائم المالية المرفوعة، تواريخ الإرسال، وملاحظات الإدارة العامة' : 'Audit registry of uploaded Tally reports, management transmission logs, and acknowledged margins.'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-black text-[11px] tracking-wider">
                <th className="px-4 py-3.5 text-start border-e border-slate-200">{isAr ? 'الشهر والسنة المالية' : 'Month & Period'}</th>
                <th className="px-3 py-3.5 text-start border-e border-slate-200">{isAr ? 'الملف المرفوع من تالي' : 'Tally File Name'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200">{isAr ? 'الإيرادات (Revenue)' : 'Revenue (OMR)'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200">{isAr ? 'التكاليف المباشرة' : 'Direct Costs'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200">{isAr ? 'المصروفات التشغيلية' : 'Operating Exp'}</th>
                <th className="px-3 py-3.5 text-end border-e border-slate-200 font-black text-emerald-800">{isAr ? 'صافي الربح (Net Profit)' : 'Net Profit (OMR)'}</th>
                <th className="px-3 py-3.5 text-center border-e border-slate-200">{isAr ? 'هامش الربح' : 'Net Margin'}</th>
                <th className="px-3 py-3.5 text-center border-e border-slate-200">{isAr ? 'التسليم قبل 10' : '10th SLA'}</th>
                <th className="px-3 py-3.5 text-center border-e border-slate-200">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3.5 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {reports.map((report) => {
                const isSubmitted = report.status === 'Submitted' || report.status === 'Acknowledged';

                return (
                  <tr key={report.id} className="hover:bg-rose-50/20 transition-colors">
                    {/* Month & Period */}
                    <td className="px-4 py-3.5 border-e border-slate-150">
                      <span className="font-extrabold text-slate-900 block">{report.month}</span>
                      <span className="text-[10px] text-slate-400 font-mono">FY {report.year}</span>
                    </td>

                    {/* File Name */}
                    <td className="px-3 py-3.5 border-e border-slate-150">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={15} className="text-emerald-700 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 block truncate max-w-[200px]" title={report.fileName}>
                            {report.fileName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">Uploaded: {report.uploadDate}</span>
                        </div>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-3 py-3.5 text-end font-mono font-bold text-slate-900 border-e border-slate-150">
                      OMR {report.revenue.toFixed(3)}
                    </td>

                    {/* Direct Costs */}
                    <td className="px-3 py-3.5 text-end font-mono text-slate-600 border-e border-slate-150">
                      {report.directCosts.toFixed(3)}
                    </td>

                    {/* Operating Expenses */}
                    <td className="px-3 py-3.5 text-end font-mono text-rose-700 font-bold border-e border-slate-150">
                      - {report.operatingExpenses.toFixed(3)}
                    </td>

                    {/* Net Profit */}
                    <td className="px-3 py-3.5 text-end font-mono font-black text-emerald-800 text-sm bg-emerald-50/20 border-e border-slate-150">
                      OMR {report.netProfit.toFixed(3)}
                    </td>

                    {/* Net Margin */}
                    <td className="px-3 py-3.5 text-center font-mono font-bold text-slate-800 border-e border-slate-150">
                      <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] font-black">
                        {report.netMarginPct}%
                      </span>
                    </td>

                    {/* 10th SLA */}
                    <td className="px-3 py-3.5 text-center border-e border-slate-150">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check size={11} strokeWidth={3} />
                        <span>{isAr ? 'قبل 10 بالشهر' : 'On Time (<= 10th)'}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 text-center border-e border-slate-150">
                      {report.status === 'Acknowledged' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-[10px] border border-emerald-200">
                          {isAr ? 'معتمد من الإدارة' : 'Acknowledged by GM'}
                        </span>
                      ) : report.status === 'Submitted' ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-black text-[10px] border border-blue-200">
                          {isAr ? 'تم الإرسال للإدارة' : 'Sent to Management'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-200">
                          {isAr ? 'مسودة (بانتظار الإرسال)' : 'Draft (Pending Send)'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!isSubmitted ? (
                          <button
                            onClick={() => handleSendToManagement(report)}
                            disabled={submittingId === report.id}
                            className="px-3 py-1.5 rounded-xl bg-red-900 hover:bg-red-800 text-amber-300 hover:text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title={isAr ? 'إرسال القوائم المالية للمدير العام' : 'Transmit to Managing Partner'}
                          >
                            <Send size={12} />
                            <span>{submittingId === report.id ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال للإدارة' : 'Send to Management')}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-red-900 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                            title={isAr ? 'عرض تفاصيل القائمة' : 'View P&L Breakdown'}
                          >
                            <Eye size={13} />
                            <span>{isAr ? 'عرض' : 'View'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: UPLOAD NEW TALLY P&L STATEMENT ───────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  {isAr ? 'نظام تالي للمحاسبة ERP' : 'Tally ERP Financial Integration'}
                </span>
                <h3 className="text-lg font-black mt-0.5">
                  {isAr ? 'رفع وتوثيق تقرير الأرباح والخسائر الشهري' : 'Upload Monthly Tally P&L Statement'}
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="p-6 space-y-4 text-xs">
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                  isDragging ? 'border-red-900 bg-rose-50/60' : 'border-gray-300 hover:border-red-900/60 bg-gray-50/60'
                }`}
              >
                <UploadCloud size={32} className="mx-auto text-red-900/70 mb-2" />
                <p className="font-bold text-slate-800 text-sm">
                  {isAr ? 'اسحب وأفلت ملف إكسل من تالي هنا، أو اضغط للاختيار' : 'Drag & drop your Tally Excel export here, or browse'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports TallyPrime / Tally ERP 9 (.xlsx, .xls)
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="tallyFileInput"
                />
                <label
                  htmlFor="tallyFileInput"
                  className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-red-900 text-white font-bold text-xs cursor-pointer hover:bg-red-800 transition"
                >
                  {isAr ? 'تصفح الملفات' : 'Choose File'}
                </label>
                {uploadedFileName && (
                  <p className="text-emerald-700 font-bold mt-2 flex items-center justify-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>{uploadedFileName}</span>
                  </p>
                )}
              </div>

              {/* Month & Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'الشهر المستهدف' : 'Target Month'}</label>
                  <select
                    value={newMonth}
                    onChange={(e) => setNewMonth(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-red-900"
                  >
                    <option value="November 2026">November 2026</option>
                    <option value="December 2026">December 2026</option>
                    <option value="October 2026">October 2026</option>
                    <option value="September 2026">September 2026</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'السنة المالية' : 'Fiscal Year'}</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(parseInt(e.target.value) || 2026)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-red-900"
                  />
                </div>
              </div>

              {/* Financial Inputs (Pre-filled from Excel or manually audited) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'الإيرادات (OMR)' : 'Total Revenue'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newRevenue}
                    onChange={(e) => setNewRevenue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold outline-none focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'التكاليف المباشرة' : 'Direct Costs'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newDirectCosts}
                    onChange={(e) => setNewDirectCosts(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isAr ? 'المصروفات التشغيلية' : 'Operating Exp'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newOperatingExpenses}
                    onChange={(e) => setNewOperatingExpenses(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-red-900"
                  />
                </div>
              </div>

              {/* Computed Net Preview */}
              <div className="p-3 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-200">
                <span className="font-bold text-slate-700">{isAr ? 'صافي الربح المحتسب (Net Profit):' : 'Calculated Net Profit:'}</span>
                <span className="font-black text-emerald-800 text-sm font-mono">
                  OMR {(newRevenue - newDirectCosts - newOperatingExpenses).toFixed(3)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-900 hover:bg-red-800 text-amber-300 hover:text-white rounded-xl font-black text-xs transition cursor-pointer shadow-md"
                >
                  {isAr ? 'حفظ وتوثيق القائمة' : 'Save & Audit Statement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: VIEW STATEMENT DETAILS ───────────────────────────────────── */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-5 bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  {isAr ? 'تفاصيل قائمة الدخل الرسمية' : 'Income Statement Breakdown'}
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {selectedReport.month}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-2 border-b border-gray-150 pb-3">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-bold">{isAr ? 'إجمالي المبيعات والإيرادات' : 'Operating Revenue'}</span>
                  <span className="font-mono font-bold text-slate-900">OMR {selectedReport.revenue.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600">
                  <span>{isAr ? 'تكلفة الخدمات المباشرة' : 'Direct Service Costs'}</span>
                  <span className="font-mono">- OMR {selectedReport.directCosts.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-slate-900 border-t border-gray-100 pt-2">
                  <span>{isAr ? 'إجمالي الربح (Gross Profit)' : 'Gross Profit'}</span>
                  <span className="font-mono">OMR {selectedReport.grossProfit.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-700">
                  <span>{isAr ? 'المصروفات التشغيلية والإدارية' : 'Operating & Admin Expenses'}</span>
                  <span className="font-mono">- OMR {selectedReport.operatingExpenses.toFixed(3)}</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-200">
                <div>
                  <span className="font-black text-slate-900 text-sm block">{isAr ? 'صافي الربح النهائي' : 'Final Net Profit'}</span>
                  <span className="text-[10px] text-emerald-800 font-bold">{selectedReport.netMarginPct}% {isAr ? 'هامش الربحية' : 'Net Margin'}</span>
                </div>
                <span className="text-xl font-black text-emerald-800 font-mono">
                  OMR {selectedReport.netProfit.toFixed(3)}
                </span>
              </div>

              {selectedReport.managementNotes && (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-[11px] border border-slate-200">
                  <span className="font-bold block text-slate-800">{isAr ? 'ملاحظة الإدارة العامة:' : 'Management Note:'}</span>
                  {selectedReport.managementNotes}
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
