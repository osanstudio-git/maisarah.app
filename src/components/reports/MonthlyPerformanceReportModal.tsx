import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Printer,
  FileText,
  Sparkles,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  Layers,
  Award,
  Calendar,
  Languages,
  Plus,
  Trash2,
  HelpCircle,
  ShieldCheck,
  Building2,
  ChevronRight
} from 'lucide-react';
import type { MonthlyPerformanceReportData } from '../../types/monthlyPerformanceReport';
import { generateDefaultMonthlyReport } from '../../utils/monthlyReportAggregator';
import { supabase } from '../../lib/supabaseClient';
import ExecutiveA4ReportPrintView from './ExecutiveA4ReportPrintView';

interface MonthlyPerformanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices?: any[];
  services?: any[];
  clients?: any[];
  quotations?: any[];
  staff?: any[];
}

export default function MonthlyPerformanceReportModal({
  isOpen,
  onClose,
  invoices = [],
  services = [],
  clients = [],
  quotations = [],
  staff = []
}: MonthlyPerformanceReportModalProps) {
  const { t, i18n } = useTranslation();
  const [isAr, setIsAr] = useState<boolean>(i18n.language === 'ar');
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('preview');
  const [activeTab, setActiveTab] = useState<'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6'>('p1');
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Report Data State
  const [reportData, setReportData] = useState<MonthlyPerformanceReportData>(() =>
    generateDefaultMonthlyReport(currentDate.getMonth(), currentDate.getFullYear(), {
      invoices,
      services,
      clients,
      quotations,
      staff
    })
  );

  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Sync / Recalculate from live data
  const handleRecalculate = () => {
    const freshData = generateDefaultMonthlyReport(selectedMonth, selectedYear, {
      invoices,
      services,
      clients,
      quotations,
      staff
    });
    setReportData(freshData);
    setSavedNotification(isAr ? 'تم تحديث البيانات المباشرة بنجاح!' : 'Live data recomputed successfully!');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadReportFromCloudOrLocal() {
      const storageKey = `maisarah_report_draft_${selectedYear}_${selectedMonth}`;
      
      try {
        // Try fetching from Supabase first
        const { data: cloudRow, error } = await supabase
          .from('monthly_performance_reports')
          .select('report_data')
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .maybeSingle();

        if (!error && cloudRow?.report_data && isMounted) {
          setReportData(cloudRow.report_data);
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch notice (table may not exist yet or offline):', err);
      }

      // Local storage fallback
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft && isMounted) {
        try {
          setReportData(JSON.parse(savedDraft));
          return;
        } catch (e) {
          // parse error fallback
        }
      }

      if (isMounted) {
        handleRecalculate();
      }
    }

    loadReportFromCloudOrLocal();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedMonth, selectedYear]);

  const handleSaveDraft = async () => {
    setIsSavingCloud(true);
    const storageKey = `maisarah_report_draft_${selectedYear}_${selectedMonth}`;
    localStorage.setItem(storageKey, JSON.stringify(reportData));

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;

      const { error } = await supabase.from('monthly_performance_reports').upsert(
        {
          id: reportData.id || `report-${selectedYear}-${selectedMonth + 1}`,
          month: selectedMonth,
          year: selectedYear,
          reference_number: reportData.referenceNumber,
          report_date: reportData.reportDate || new Date().toISOString().slice(0, 10),
          manager_name: reportData.managerName || 'Operations Manager',
          department_scope: reportData.departmentScope || 'Consolidated Office Performance',
          status: 'draft',
          report_data: reportData,
          created_by: userId,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'month,year' }
      );

      if (error) {
        console.warn('Could not save to Supabase cloud table:', error.message);
        setSavedNotification(isAr ? 'تم الحفظ محلياً في المتصفح!' : 'Saved locally in browser!');
      } else {
        setSavedNotification(isAr ? 'تم الحفظ والمزامنة السحابية بنجاح!' : 'Saved & synced to Supabase Cloud!');
      }
    } catch (err) {
      setSavedNotification(isAr ? 'تم الحفظ محلياً في المتصفح!' : 'Saved locally in browser!');
    } finally {
      setIsSavingCloud(false);
      setTimeout(() => setSavedNotification(null), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <header className="print:hidden h-18 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shadow-lg z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A11212] to-red-900 flex items-center justify-center text-white font-black text-lg shadow-md shadow-red-900/20">
            م
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? 'استوديو تقرير أداء المكتب الشهري (6 صفحات)' : 'Monthly Office Performance Report Studio (6 Pages)'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#A11212] dark:bg-red-950/60 dark:text-red-400">
                Executive A4 Print Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {reportData.referenceNumber} · {isAr ? monthNamesAr[selectedMonth] : monthNamesEn[selectedMonth]} {selectedYear}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Month/Year Selection */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-500 ms-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none cursor-pointer"
            >
              {monthNamesEn.map((m, i) => (
                <option key={i} value={i} className="dark:bg-slate-900">
                  {isAr ? monthNamesAr[i] : m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr} className="dark:bg-slate-900">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switch (Editor vs Live Print Preview) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {isAr ? 'معاينة الطباعة A4' : 'A4 Print Preview'}
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {isAr ? 'تعديل وتخصيص' : 'Customize & Edit'}
            </button>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setIsAr(!isAr)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors"
            title="Toggle Arabic / English"
          >
            <Languages className="w-4 h-4 text-[#A11212]" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Re-calculate live */}
          <button
            onClick={handleRecalculate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors"
            title="Recompute from live DB"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{isAr ? 'تحديث حي' : 'Sync Live Data'}</span>
          </button>

          {/* Save Draft */}
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Save className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">{isAr ? 'حفظ' : 'Save'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#A11212] hover:bg-red-800 text-white shadow-md shadow-red-900/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة / تصدير PDF' : 'Print / Export PDF'}</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {savedNotification && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedNotification}</span>
        </div>
      )}

      {/* Modal Main Body */}
      <div className="flex-1 overflow-y-auto bg-slate-900/50 print:bg-white print:p-0 print:m-0">
        {viewMode === 'preview' ? (
          /* ========================================================================= */
          /* PREVIEW MODE: Live Full 6-Page A4 Executive Layout                        */
          /* ========================================================================= */
          <div className="py-8 px-4 flex justify-center print:p-0">
            <ExecutiveA4ReportPrintView data={reportData} isAr={isAr} />
          </div>
        ) : (
          /* ========================================================================= */
          /* EDITOR MODE: Interactive 6-Tab Executive Customizer                       */
          /* ========================================================================= */
          <div className="max-w-6xl mx-auto py-8 px-6 text-slate-800 dark:text-slate-100">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 mb-8">
              {/* Tabs header */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
                {[
                  { key: 'p1', label: isAr ? '1. الملخص التنفيذي' : '1. Executive Summary', icon: TrendingUp },
                  { key: 'p2', label: isAr ? '2. الأداء المالي' : '2. Financial Performance', icon: DollarSign },
                  { key: 'p3', label: isAr ? '3. الموارد البشرية والعمليات' : '3. HR & Operations', icon: Users },
                  { key: 'p4', label: isAr ? '4. خدمة العملاء والتسويق' : '4. Clients & Sales', icon: Briefcase },
                  { key: 'p5', label: isAr ? '5. الهوية والظهور' : '5. Brand & Marketing', icon: Award },
                  { key: 'p6', label: isAr ? '6. خطة العمل واعتماد CEO' : '6. Action Plan & CEO', icon: ShieldCheck }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === tab.key
                          ? 'bg-[#A11212] text-white shadow-md shadow-red-900/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: EXECUTIVE SUMMARY */}
              {activeTab === 'p1' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'إجمالي الإيرادات (ر.ع)' : 'Total Revenue (OMR)'}
                      </label>
                      <input
                        type="number"
                        value={reportData.executiveSummary.totalRevenue}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            executiveSummary: {
                              ...reportData.executiveSummary,
                              totalRevenue: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'عدد الخدمات المنجزة/النشطة' : 'Number of Services'}
                      </label>
                      <input
                        type="number"
                        value={reportData.executiveSummary.numberOfServices}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            executiveSummary: {
                              ...reportData.executiveSummary,
                              numberOfServices: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'العملاء الجدد' : 'New Clients'}
                      </label>
                      <input
                        type="number"
                        value={reportData.executiveSummary.newClientsCount}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            executiveSummary: {
                              ...reportData.executiveSummary,
                              newClientsCount: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Achievements List */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {isAr ? 'أبرز الإنجازات الشهرية' : 'Key Monthly Achievements'}
                      </label>
                      <button
                        onClick={() =>
                          setReportData({
                            ...reportData,
                            executiveSummary: {
                              ...reportData.executiveSummary,
                              keyAchievements: [...reportData.executiveSummary.keyAchievements, '']
                            }
                          })
                        }
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة إنجاز' : 'Add Achievement'}
                      </button>
                    </div>
                    {reportData.executiveSummary.keyAchievements.map((ach, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={ach}
                          onChange={(e) => {
                            const newAch = [...reportData.executiveSummary.keyAchievements];
                            newAch[idx] = e.target.value;
                            setReportData({
                              ...reportData,
                              executiveSummary: { ...reportData.executiveSummary, keyAchievements: newAch }
                            });
                          }}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            const newAch = reportData.executiveSummary.keyAchievements.filter((_, i) => i !== idx);
                            setReportData({
                              ...reportData,
                              executiveSummary: { ...reportData.executiveSummary, keyAchievements: newAch }
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Challenges List */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {isAr ? 'أبرز التحديات ونقاط المتابعة' : 'Key Challenges & Follow-ups'}
                      </label>
                      <button
                        onClick={() =>
                          setReportData({
                            ...reportData,
                            executiveSummary: {
                              ...reportData.executiveSummary,
                              keyChallenges: [...reportData.executiveSummary.keyChallenges, '']
                            }
                          })
                        }
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة تحدي' : 'Add Challenge'}
                      </button>
                    </div>
                    {reportData.executiveSummary.keyChallenges.map((ch, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={ch}
                          onChange={(e) => {
                            const newCh = [...reportData.executiveSummary.keyChallenges];
                            newCh[idx] = e.target.value;
                            setReportData({
                              ...reportData,
                              executiveSummary: { ...reportData.executiveSummary, keyChallenges: newCh }
                            });
                          }}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            const newCh = reportData.executiveSummary.keyChallenges.filter((_, i) => i !== idx);
                            setReportData({
                              ...reportData,
                              executiveSummary: { ...reportData.executiveSummary, keyChallenges: newCh }
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCIAL PERFORMANCE */}
              {activeTab === 'p2' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'الإيرادات المحققة' : 'Current Revenue'}
                      </label>
                      <input
                        type="number"
                        value={reportData.financialPerformance.currentRevenue}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            financialPerformance: {
                              ...reportData.financialPerformance,
                              currentRevenue: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'المصروفات الحالية' : 'Current Expenses'}
                      </label>
                      <input
                        type="number"
                        value={reportData.financialPerformance.currentExpenses}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            financialPerformance: {
                              ...reportData.financialPerformance,
                              currentExpenses: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'المبالغ المحصلة' : 'Collected Amount'}
                      </label>
                      <input
                        type="number"
                        value={reportData.financialPerformance.collectedFromClients}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            financialPerformance: {
                              ...reportData.financialPerformance,
                              collectedFromClients: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'المبالغ غير المحصلة' : 'Uncollected Amount'}
                      </label>
                      <input
                        type="number"
                        value={reportData.financialPerformance.uncollectedReceivables}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            financialPerformance: {
                              ...reportData.financialPerformance,
                              uncollectedReceivables: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Service breakdown table */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {isAr ? 'تفصيل إيرادات الخدمات والمستهدف' : 'Service Revenue Breakdown vs Strategic Targets'}
                      </h4>
                      <button
                        onClick={() => {
                          const newBreakdown = [
                            ...reportData.financialPerformance.revenueByService,
                            { serviceName: 'New Advisory Service', serviceNameAr: 'خدمة استشارية جديدة', revenue: 0, target: 1000, achievementRate: 0 }
                          ];
                          setReportData({
                            ...reportData,
                            financialPerformance: {
                              ...reportData.financialPerformance,
                              revenueByService: newBreakdown
                            }
                          });
                        }}
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة خدمة' : 'Add Service'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {reportData.financialPerformance.revenueByService.map((srv, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 items-center"
                        >
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'اسم الخدمة' : 'Service Name'}</span>
                            <input
                              type="text"
                              value={isAr ? (srv.serviceNameAr || srv.serviceName) : srv.serviceName}
                              onChange={(e) => {
                                const newBreakdown = [...reportData.financialPerformance.revenueByService];
                                if (isAr) {
                                  newBreakdown[idx].serviceNameAr = e.target.value;
                                } else {
                                  newBreakdown[idx].serviceName = e.target.value;
                                }
                                setReportData({
                                  ...reportData,
                                  financialPerformance: {
                                    ...reportData.financialPerformance,
                                    revenueByService: newBreakdown
                                  }
                                });
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              {isAr ? 'المحقق (ر.ع)' : 'Achieved (OMR)'}
                            </span>
                            <input
                              type="number"
                              value={srv.revenue}
                              onChange={(e) => {
                                const rev = Number(e.target.value);
                                const newBreakdown = [...reportData.financialPerformance.revenueByService];
                                const target = newBreakdown[idx].target;
                                newBreakdown[idx] = {
                                  ...newBreakdown[idx],
                                  revenue: rev,
                                  achievementRate: target > 0 ? +((rev / target) * 100).toFixed(1) : 0
                                };
                                setReportData({
                                  ...reportData,
                                  financialPerformance: {
                                    ...reportData.financialPerformance,
                                    revenueByService: newBreakdown
                                  }
                                });
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              {isAr ? 'المستهدف (ر.ع)' : 'Target (OMR)'}
                            </span>
                            <input
                              type="number"
                              value={srv.target}
                              onChange={(e) => {
                                const trg = Number(e.target.value);
                                const newBreakdown = [...reportData.financialPerformance.revenueByService];
                                const rev = newBreakdown[idx].revenue;
                                newBreakdown[idx] = {
                                  ...newBreakdown[idx],
                                  target: trg,
                                  achievementRate: trg > 0 ? +((rev / trg) * 100).toFixed(1) : 0
                                };
                                setReportData({
                                  ...reportData,
                                  financialPerformance: {
                                    ...reportData.financialPerformance,
                                    revenueByService: newBreakdown
                                  }
                                });
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">
                                {isAr ? 'نسبة الإنجاز' : 'Achievement'}
                              </span>
                              <span
                                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                  srv.achievementRate >= 80
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : srv.achievementRate >= 50
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                }`}
                              >
                                {srv.achievementRate}%
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const newBreakdown = reportData.financialPerformance.revenueByService.filter((_, i) => i !== idx);
                                setReportData({
                                  ...reportData,
                                  financialPerformance: {
                                    ...reportData.financialPerformance,
                                    revenueByService: newBreakdown
                                  }
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                              title="Delete service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reasons for Changes & Profitability Plan Notes */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {isAr ? 'أسباب التغيرات وخطة تحسين التحصيل والربحية' : 'Reasons for Changes & Profitability / Collection Improvement Plan'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAr ? 'بنود خطة العمل التنفيذية لمعالجة الفجوات المالية والتحصيل' : 'Actionable points explaining financial trends & recovery plans'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const currentNotes = reportData.financialPerformance.profitabilityPlanNotes || [];
                          setReportData({
                            ...reportData,
                            financialPerformance: {
                              ...reportData.financialPerformance,
                              profitabilityPlanNotes: [...currentNotes, '']
                            }
                          });
                        }}
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة بند للخطة' : 'Add Action Point'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(reportData.financialPerformance.profitabilityPlanNotes || []).map((note, nIdx) => (
                        <div key={nIdx} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#A11212]/10 text-[#A11212] flex items-center justify-center font-black text-xs shrink-0">
                            {nIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => {
                              const newNotes = [...(reportData.financialPerformance.profitabilityPlanNotes || [])];
                              newNotes[nIdx] = e.target.value;
                              setReportData({
                                ...reportData,
                                financialPerformance: {
                                  ...reportData.financialPerformance,
                                  profitabilityPlanNotes: newNotes
                                }
                              });
                            }}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-900 dark:text-white"
                          />
                          <button
                            onClick={() => {
                              const newNotes = (reportData.financialPerformance.profitabilityPlanNotes || []).filter((_, i) => i !== nIdx);
                              setReportData({
                                ...reportData,
                                financialPerformance: {
                                  ...reportData.financialPerformance,
                                  profitabilityPlanNotes: newNotes
                                }
                              });
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: HR & OPERATIONS */}
              {activeTab === 'p3' && (
                <div className="space-y-6">
                  {/* 1. Core HR Numbers */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                      {isAr ? '1. مؤشرات الموارد البشرية والكوادر (الصفحة 3)' : '1. Human Resources Core Indicators (Page 3)'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {isAr ? 'عدد الموظفين نهاية الشهر' : 'Total Staff at Month-End'}
                        </label>
                        <input
                          type="number"
                          value={reportData.humanResources.totalStaffMonthEnd}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                totalStaffMonthEnd: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-emerald-600 mb-1">
                          {isAr ? 'التعيينات الجديدة (+)' : 'New Hires (+)'}
                        </label>
                        <input
                          type="number"
                          value={reportData.humanResources.hiresCount}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                hiresCount: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/60 rounded-xl p-2.5 text-xs font-bold text-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-rose-600 mb-1">
                          {isAr ? 'المغادرون والاستقالات (-)' : 'Departures (-)'}
                        </label>
                        <input
                          type="number"
                          value={reportData.humanResources.departuresCount}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                departuresCount: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/60 rounded-xl p-2.5 text-xs font-bold text-rose-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {isAr ? 'تأثير الإجازات' : 'Leave Impact Count'}
                        </label>
                        <input
                          type="number"
                          value={reportData.humanResources.leaveImpactCount}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                leaveImpactCount: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Detailed Notes for Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                          {isAr ? 'ملاحظات وإجراءات التعيين الجديد' : 'New Hires & Onboarding Status Notes'}
                        </label>
                        <input
                          type="text"
                          value={reportData.humanResources.hiresNotes || ''}
                          placeholder={isAr ? 'مثال: تم تعيين موظف جديد وبدء برنامج التأهيل' : 'e.g. 1 new hire onboarded; training in progress'}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                hiresNotes: e.target.value
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                          {isAr ? 'ملاحظات وإجراءات الاستقالات والتسليم' : 'Departures & Handover Status Notes'}
                        </label>
                        <input
                          type="text"
                          value={reportData.humanResources.departuresNotes || ''}
                          placeholder={isAr ? 'مثال: تم تسليم المهام بنجاح وسد الفجوة التشغيلية' : 'e.g. Handover completed smoothly'}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                departuresNotes: e.target.value
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'ملاحظات الإجازات وتوزيع المهام' : 'Leave Impact & Task Reallocation Notes'}
                        </label>
                        <input
                          type="text"
                          value={reportData.humanResources.leaveImpactNotes || ''}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                leaveImpactNotes: e.target.value
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'ملاحظات التدريب وتطوير المهارات' : 'Training & Skills Development Notes'}
                        </label>
                        <input
                          type="text"
                          value={reportData.humanResources.trainingNotes || ''}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              humanResources: {
                                ...reportData.humanResources,
                                trainingNotes: e.target.value
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Staffing Needs & Shortages */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {isAr ? '2. احتياجات التوظيف وسد النقص' : '2. Staffing Needs & Coverage of Shortages'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAr ? 'الوظائف الشاغرة المطلوب استقطابها لسد العجز التشغيلي' : 'Open positions required to support firm workload'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const currentNeeds = reportData.humanResources.staffingNeeds || [];
                          setReportData({
                            ...reportData,
                            humanResources: {
                              ...reportData.humanResources,
                              staffingNeeds: [...currentNeeds, { role: 'Audit Assistant', count: 1 }]
                            }
                          });
                        }}
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة احتياج وظيفي' : 'Add Shortage Role'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(reportData.humanResources.staffingNeeds || []).map((need, reqIdx) => (
                        <div key={reqIdx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center">
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'المسمى الوظيفي المطلوب' : 'Role Required'}</span>
                            <input
                              type="text"
                              value={need.role}
                              onChange={(e) => {
                                const newNeeds = [...(reportData.humanResources.staffingNeeds || [])];
                                newNeeds[reqIdx].role = e.target.value;
                                setReportData({
                                  ...reportData,
                                  humanResources: {
                                    ...reportData.humanResources,
                                    staffingNeeds: newNeeds
                                  }
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'العدد' : 'Count'}</span>
                            <input
                              type="number"
                              min={1}
                              value={need.count}
                              onChange={(e) => {
                                const newNeeds = [...(reportData.humanResources.staffingNeeds || [])];
                                newNeeds[reqIdx].count = Number(e.target.value) || 1;
                                setReportData({
                                  ...reportData,
                                  humanResources: {
                                    ...reportData.humanResources,
                                    staffingNeeds: newNeeds
                                  }
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                            />
                          </div>
                          <div className="text-end">
                            <button
                              onClick={() => {
                                const newNeeds = (reportData.humanResources.staffingNeeds || []).filter((_, i) => i !== reqIdx);
                                setReportData({
                                  ...reportData,
                                  humanResources: {
                                    ...reportData.humanResources,
                                    staffingNeeds: newNeeds
                                  }
                                });
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Department Deliverables Table */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {isAr ? '3. أداء الخدمات وإنجاز ملفات الأقسام' : '3. Department Deliverables & Service File Tracking'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAr ? 'متابعة الملفات النشطة والمنجزة والمتأخرة وأسباب التأخير لكل قسم' : 'Active, completed, delayed files and action plans per department'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const newDep = [
                            ...reportData.servicePerformance.departments,
                            {
                              department: 'New Advisory Department',
                              departmentAr: 'قسم استشاري جديد',
                              activeFiles: 5,
                              completedFiles: 5,
                              delayedFiles: 0,
                              completionRate: 100,
                              reasonAndAction: 'All deliverables completed on schedule.'
                            }
                          ];
                          setReportData({
                            ...reportData,
                            servicePerformance: { ...reportData.servicePerformance, departments: newDep }
                          });
                        }}
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة قسم / خدمة' : 'Add Department File Row'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {reportData.servicePerformance.departments.map((dep, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex-1 max-w-sm">
                              <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'اسم القسم / الخدمة' : 'Department / Service Name'}</span>
                              <input
                                type="text"
                                value={isAr ? (dep.departmentAr || dep.department) : dep.department}
                                onChange={(e) => {
                                  const newDep = [...reportData.servicePerformance.departments];
                                  if (isAr) {
                                    newDep[idx].departmentAr = e.target.value;
                                  } else {
                                    newDep[idx].department = e.target.value;
                                  }
                                  setReportData({
                                    ...reportData,
                                    servicePerformance: { ...reportData.servicePerformance, departments: newDep }
                                  });
                                }}
                                className="font-bold text-xs w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newDep = reportData.servicePerformance.departments.filter((_, i) => i !== idx);
                                setReportData({
                                  ...reportData,
                                  servicePerformance: { ...reportData.servicePerformance, departments: newDep }
                                });
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                              title="Delete department"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">
                                {isAr ? 'الملفات النشطة' : 'Active Files'}
                              </span>
                              <input
                                type="number"
                                value={dep.activeFiles}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const newDep = [...reportData.servicePerformance.departments];
                                  newDep[idx].activeFiles = val;
                                  const total = val + newDep[idx].completedFiles;
                                  newDep[idx].completionRate = total > 0 ? +((newDep[idx].completedFiles / total) * 100).toFixed(1) : 0;
                                  setReportData({
                                    ...reportData,
                                    servicePerformance: { ...reportData.servicePerformance, departments: newDep }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">
                                {isAr ? 'الملفات المنجزة' : 'Completed'}
                              </span>
                              <input
                                type="number"
                                value={dep.completedFiles}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const newDep = [...reportData.servicePerformance.departments];
                                  newDep[idx].completedFiles = val;
                                  const total = val + newDep[idx].activeFiles;
                                  newDep[idx].completionRate = total > 0 ? +((val / total) * 100).toFixed(1) : 0;
                                  setReportData({
                                    ...reportData,
                                    servicePerformance: { ...reportData.servicePerformance, departments: newDep }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-emerald-600"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">
                                {isAr ? 'الملفات المتأخرة' : 'Delayed'}
                              </span>
                              <input
                                type="number"
                                value={dep.delayedFiles}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const newDep = [...reportData.servicePerformance.departments];
                                  newDep[idx].delayedFiles = val;
                                  setReportData({
                                    ...reportData,
                                    servicePerformance: { ...reportData.servicePerformance, departments: newDep }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-rose-600"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">
                                {isAr ? 'نسبة الإنجاز %' : 'Completion Rate %'}
                              </span>
                              <div className="pt-2 text-sm font-black text-slate-900 dark:text-white">
                                {dep.completionRate}%
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">
                              {isAr ? 'سبب التأخير والإجراء المتخذ' : 'Reason & Corrective Action Taken'}
                            </span>
                            <input
                              type="text"
                              value={dep.reasonAndAction}
                              onChange={(e) => {
                                const newDep = [...reportData.servicePerformance.departments];
                                newDep[idx].reasonAndAction = e.target.value;
                                setReportData({
                                  ...reportData,
                                  servicePerformance: { ...reportData.servicePerformance, departments: newDep }
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300 font-medium"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Quality, Review Findings, Corrections and Preventive Actions */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <label className="block text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                      {isAr ? '4. الجودة وملاحظات المراجعة والإجراءات التصحيحية' : '4. Quality, Review Findings, Corrections and Preventive Actions'}
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">
                      {isAr ? 'ملخص تدقيق الجودة والامتثال لمعايير IFRS وقوانين الضرائب والعمل العمانية' : 'Summary of quality sampling & regulatory IFRS / Omani compliance audits'}
                    </p>
                    <textarea
                      rows={3}
                      value={reportData.servicePerformance.qualityReviewNotes || ''}
                      onChange={(e) =>
                        setReportData({
                          ...reportData,
                          servicePerformance: {
                            ...reportData.servicePerformance,
                            qualityReviewNotes: e.target.value
                          }
                        })
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: CLIENTS & SALES */}
              {activeTab === 'p4' && (
                <div className="space-y-6">
                  {/* 1. Client Satisfaction & Complaints */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                      {isAr ? '1. رضا العملاء والشكاوى (الصفحة 4)' : '1. Client Satisfaction & Retention (Page 4)'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {isAr ? 'عدد العملاء المطلوب تقييمهم' : 'Clients Surveyed'}
                        </label>
                        <input
                          type="number"
                          value={reportData.clientSatisfaction.clientsSurveyed}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              clientSatisfaction: {
                                ...reportData.clientSatisfaction,
                                clientsSurveyed: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {isAr ? 'عدد الردود المستلمة' : 'Responses Received'}
                        </label>
                        <input
                          type="number"
                          value={reportData.clientSatisfaction.responsesReceived}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              clientSatisfaction: {
                                ...reportData.clientSatisfaction,
                                responsesReceived: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#A11212] mb-1">
                          {isAr ? 'متوسط تقييم الرضا (من 5 ⭐)' : 'Average Rating (out of 5 ⭐)'}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          max={5}
                          min={1}
                          value={reportData.clientSatisfaction.averageRating}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              clientSatisfaction: {
                                ...reportData.clientSatisfaction,
                                averageRating: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900/60 rounded-xl p-2.5 text-xs font-black text-[#A11212]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {isAr ? 'الشكاوى المستلمة والمعالجة' : 'Complaints (Received / Resolved)'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Received"
                            value={reportData.clientSatisfaction.complaintsReceived}
                            onChange={(e) =>
                              setReportData({
                                ...reportData,
                                clientSatisfaction: {
                                  ...reportData.clientSatisfaction,
                                  complaintsReceived: Number(e.target.value)
                                }
                              })
                            }
                            className="w-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                          />
                          <input
                            type="number"
                            placeholder="Resolved"
                            value={reportData.clientSatisfaction.closedComplaints}
                            onChange={(e) =>
                              setReportData({
                                ...reportData,
                                clientSatisfaction: {
                                  ...reportData.clientSatisfaction,
                                  closedComplaints: Number(e.target.value)
                                }
                              })
                            }
                            className="w-1/2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl p-2 text-xs font-bold text-emerald-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-emerald-600 mb-1">
                          {isAr ? 'العملاء المجددون للخدمة (+)' : 'Renewed Clients (+)'}
                        </label>
                        <input
                          type="number"
                          value={reportData.clientSatisfaction.renewedClientsCount}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              clientSatisfaction: {
                                ...reportData.clientSatisfaction,
                                renewedClientsCount: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/60 rounded-xl p-2.5 text-xs font-bold text-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-rose-600 mb-1">
                          {isAr ? 'العملاء المنسحبون (-)' : 'Withdrawn Clients (-)'}
                        </label>
                        <input
                          type="number"
                          value={reportData.clientSatisfaction.withdrawnClientsCount}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              clientSatisfaction: {
                                ...reportData.clientSatisfaction,
                                withdrawnClientsCount: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/60 rounded-xl p-2.5 text-xs font-bold text-rose-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? 'ملاحظات وأسباب انسحاب العملاء (إن وجدت)' : 'Withdrawal Reasons & Corrective Actions'}
                      </label>
                      <input
                        type="text"
                        value={reportData.clientSatisfaction.withdrawalReasons || ''}
                        placeholder={isAr ? 'مثال: لا يوجد انسحاب؛ انتقال عميل واحد خارج السلطنة' : 'e.g. No significant drop-offs recorded'}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            clientSatisfaction: {
                              ...reportData.clientSatisfaction,
                              withdrawalReasons: e.target.value
                            }
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* 2. Marketing & Sales Funnel */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                      {isAr ? '2. مسار التسويق والمبيعات وعروض الأسعار' : '2. Marketing & Sales Pipeline Funnel'}
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'المكالمات التسويقية' : 'Marketing Calls'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.marketingCalls}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                marketingCalls: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الاجتماعات مع عملاء محتملين' : 'Prospective Meetings'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.prospectiveMeetings}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                prospectiveMeetings: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الفرص الجديدة المسجلة' : 'New Leads Captured'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.newLeadsCount}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                newLeadsCount: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'عروض الأسعار المرسلة' : 'Quotations Sent'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.quotationsSent}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                quotationsSent: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'عروض الأسعار المعتمدة' : 'Accepted Quotations'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.quotationsAccepted}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                quotationsAccepted: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl p-2 text-xs font-bold text-emerald-600"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'العملاء الجدد المتعاقد معهم' : 'Newly Contracted Clients'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.newlyContractedClients}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                newlyContractedClients: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'قيمة العقود الجديدة (ر.ع)' : 'New Contracts Value (OMR)'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.newContractsValue}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                newContractsValue: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900 rounded-xl p-2 text-xs font-black text-[#A11212]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'تكلفة التسويق (ر.ع)' : 'Marketing Cost (OMR)'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.marketingCost}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                marketingCost: Number(e.target.value)
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. New Client Acquisition Channels */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                      {isAr ? '3. توزيع مصادر واستقطاب العملاء الجدد' : '3. Client Acquisition Channels Breakdown'}
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-3">
                      {isAr ? 'عدد العملاء الواردين من مختلف القنوات الاستراتيجية' : 'Distribution of incoming client inquiries by source'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'مراكز سند والاتصال' : 'Sanad / Direct Calls'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.sourcesDistribution?.calls || 0}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                sourcesDistribution: {
                                  ...reportData.marketingAndSales.sourcesDistribution,
                                  calls: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الاستثمار الأجنبي (FDI)' : 'FDI / In-Person Visits'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.sourcesDistribution?.visits || 0}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                sourcesDistribution: {
                                  ...reportData.marketingAndSales.sourcesDistribution,
                                  visits: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'التسويق الرقمي والموقع' : 'Digital & Social Media'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.sourcesDistribution?.socialMedia || 0}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                sourcesDistribution: {
                                  ...reportData.marketingAndSales.sourcesDistribution,
                                  socialMedia: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">{isAr ? 'شركاء الأعمال (B2B)' : 'B2B Partner Referrals'}</span>
                        <input
                          type="number"
                          value={reportData.marketingAndSales.sourcesDistribution?.referralsB2B || 0}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              marketingAndSales: {
                                ...reportData.marketingAndSales,
                                sourcesDistribution: {
                                  ...reportData.marketingAndSales.sourcesDistribution,
                                  referralsB2B: Number(e.target.value)
                                }
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BRAND & IDENTITY */}
              {activeTab === 'p5' && (
                <div className="space-y-6">
                  {/* 1. Brand Achievements Table */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {isAr ? '1. بنود الهوية المؤسسية والظهور الإعلامي (الصفحة 5)' : '1. Brand Identity & Corporate Presence Items (Page 5)'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAr ? 'الأنشطة المنجزة في النشر الرقمي، الامتثال للهوية، وتحديث الكتالوجات والمؤتمرات' : 'Achievements in digital publishing, brand compliance, catalog updates, and conferences'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setReportData({
                            ...reportData,
                            brandIdentity: {
                              ...reportData.brandIdentity,
                              achievements: [
                                ...reportData.brandIdentity.achievements,
                                { id: `b-${Date.now()}`, item: 'New Channel / Initiative', achieved: 'Completed', notes: '' }
                              ]
                            }
                          })
                        }
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة بند' : 'Add Brand Item'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      {reportData.brandIdentity.achievements.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 items-center shadow-xs"
                        >
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'البند / المبادرة' : 'Item / Initiative'}</span>
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => {
                                const newB = [...reportData.brandIdentity.achievements];
                                newB[idx].item = e.target.value;
                                setReportData({
                                  ...reportData,
                                  brandIdentity: {
                                    ...reportData.brandIdentity,
                                    achievements: newB
                                  }
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'ما تم إنجازه' : 'What Was Achieved'}</span>
                            <input
                              type="text"
                              value={item.achieved}
                              onChange={(e) => {
                                const newB = [...reportData.brandIdentity.achievements];
                                newB[idx].achieved = e.target.value;
                                setReportData({
                                  ...reportData,
                                  brandIdentity: {
                                    ...reportData.brandIdentity,
                                    achievements: newB
                                  }
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-red-300 dark:border-red-900/50 rounded-lg p-2 text-xs font-black text-[#A11212]"
                            />
                          </div>
                          <div className="sm:col-span-2 flex gap-2 items-center">
                            <div className="flex-1">
                              <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'الملاحظات' : 'Notes'}</span>
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => {
                                  const newB = [...reportData.brandIdentity.achievements];
                                  newB[idx].notes = e.target.value;
                                  setReportData({
                                    ...reportData,
                                    brandIdentity: {
                                      ...reportData.brandIdentity,
                                      achievements: newB
                                    }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newB = reportData.brandIdentity.achievements.filter((_, i) => i !== idx);
                                setReportData({
                                  ...reportData,
                                  brandIdentity: {
                                    ...reportData.brandIdentity,
                                    achievements: newB
                                  }
                                });
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 rounded-lg mt-3.5"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Key Improvements Required in Brand Identity and Corporate Presence (Sentence List) */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {isAr ? '2. أهم التحسينات المطلوبة في الهوية والتواجد المؤسسي (جمل وفقرات)' : '2. Key Improvements Required in Brand Identity and Corporate Presence'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAr ? 'النقاط والجمل التنفيذية للارتقاء بالهوية البصرية والظهور المؤسسي في الصفحة 5' : 'Key actionable statements for brand standardization and presence on Page 5'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const currentImps = reportData.brandIdentity.keyImprovements || [];
                          setReportData({
                            ...reportData,
                            brandIdentity: {
                              ...reportData.brandIdentity,
                              keyImprovements: [...currentImps, '']
                            }
                          });
                        }}
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة جملة تحسين' : 'Add Improvement Sentence'}
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(reportData.brandIdentity.keyImprovements || []).map((sentence, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                          <span className="w-7 h-7 rounded-lg bg-[#A11212]/10 text-[#A11212] flex items-center justify-center font-black text-xs shrink-0">
                            {sIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={sentence}
                            placeholder={isAr ? `مثال: جملة التحسين رقم ${sIdx + 1}...` : `e.g. Actionable improvement sentence #${sIdx + 1}...`}
                            onChange={(e) => {
                              const newImps = [...(reportData.brandIdentity.keyImprovements || [])];
                              newImps[sIdx] = e.target.value;
                              setReportData({
                                ...reportData,
                                brandIdentity: {
                                  ...reportData.brandIdentity,
                                  keyImprovements: newImps
                                }
                              });
                            }}
                            className="flex-1 bg-transparent border-0 p-1 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                          />
                          <button
                            onClick={() => {
                              const newImps = (reportData.brandIdentity.keyImprovements || []).filter((_, i) => i !== sIdx);
                              setReportData({
                                ...reportData,
                                brandIdentity: {
                                  ...reportData.brandIdentity,
                                  keyImprovements: newImps
                                }
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg shrink-0"
                            title="Delete sentence"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: NEXT MONTH PLAN & CEO DECISIONS */}
              {activeTab === 'p6' && (
                <div className="space-y-6">
                  {/* 1. Action items matrix */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {isAr ? '1. خطة عمل وأولويات الشهر القادم (الصفحة 6)' : '1. Next Month Priority Action Items Matrix (Page 6)'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAr ? 'الأولويات والنتائج المستهدفة والمسؤولين والمواعيد النهائية والدعم المطلوب' : 'Priorities, target outcomes, owners, deadlines, and executive support required'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setReportData({
                            ...reportData,
                            nextMonthPlan: {
                              ...reportData.nextMonthPlan,
                              actionItems: [
                                ...reportData.nextMonthPlan.actionItems,
                                {
                                  id: `act-${Date.now()}`,
                                  priorityAction: '',
                                  targetOutcome: '',
                                  responsible: 'Operations Manager',
                                  deadline: 'Week 2',
                                  supportRequired: 'Department Support'
                                }
                              ]
                            }
                          })
                        }
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة إجراء' : 'Add Action Item'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      {reportData.nextMonthPlan.actionItems.map((act, idx) => (
                        <div
                          key={act.id || idx}
                          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <span className="w-6 h-6 rounded-lg bg-[#A11212]/10 text-[#A11212] flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </span>
                            <button
                              onClick={() => {
                                const newP = reportData.nextMonthPlan.actionItems.filter((_, i) => i !== idx);
                                setReportData({
                                  ...reportData,
                                  nextMonthPlan: {
                                    ...reportData.nextMonthPlan,
                                    actionItems: newP
                                  }
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                              title="Delete action item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">
                                {isAr ? 'الأولوية والإجراء' : 'Priority and Action'}
                              </span>
                              <input
                                type="text"
                                value={act.priorityAction}
                                placeholder={isAr ? 'مثال: استكمال بيانات ملفات التدقيق والضرائب' : 'e.g. Complete pending data for Audit and Tax files'}
                                onChange={(e) => {
                                  const newP = [...reportData.nextMonthPlan.actionItems];
                                  newP[idx].priorityAction = e.target.value;
                                  setReportData({
                                    ...reportData,
                                    nextMonthPlan: {
                                      ...reportData.nextMonthPlan,
                                      actionItems: newP
                                    }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">
                                {isAr ? 'النتيجة المستهدفة' : 'Target Outcome'}
                              </span>
                              <input
                                type="text"
                                value={act.targetOutcome}
                                placeholder={isAr ? 'مثال: معالجة المستندات الناقصة لـ 13 ملف تدقيق' : 'e.g. Resolve missing client documentation across 13 audit files'}
                                onChange={(e) => {
                                  const newP = [...reportData.nextMonthPlan.actionItems];
                                  newP[idx].targetOutcome = e.target.value;
                                  setReportData({
                                    ...reportData,
                                    nextMonthPlan: {
                                      ...reportData.nextMonthPlan,
                                      actionItems: newP
                                    }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">
                                {isAr ? 'المسؤول' : 'Responsible'}
                              </span>
                              <input
                                type="text"
                                value={act.responsible}
                                onChange={(e) => {
                                  const newP = [...reportData.nextMonthPlan.actionItems];
                                  newP[idx].responsible = e.target.value;
                                  setReportData({
                                    ...reportData,
                                    nextMonthPlan: {
                                      ...reportData.nextMonthPlan,
                                      actionItems: newP
                                    }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">
                                {isAr ? 'الموعد النهائي' : 'Deadline'}
                              </span>
                              <input
                                type="text"
                                value={act.deadline}
                                onChange={(e) => {
                                  const newP = [...reportData.nextMonthPlan.actionItems];
                                  newP[idx].deadline = e.target.value;
                                  setReportData({
                                    ...reportData,
                                    nextMonthPlan: {
                                      ...reportData.nextMonthPlan,
                                      actionItems: newP
                                    }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-red-300 dark:border-red-900/50 rounded-lg p-2 text-xs font-black text-[#A11212]"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">
                                {isAr ? 'الدعم أو القرار المطلوب' : 'Support / Decision Required'}
                              </span>
                              <input
                                type="text"
                                value={act.supportRequired}
                                onChange={(e) => {
                                  const newP = [...reportData.nextMonthPlan.actionItems];
                                  newP[idx].supportRequired = e.target.value;
                                  setReportData({
                                    ...reportData,
                                    nextMonthPlan: {
                                      ...reportData.nextMonthPlan,
                                      actionItems: newP
                                    }
                                  });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Decisions Required from CEO & Directives */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {isAr ? '2. قرارات وتوجيهات مطلوبة من الرئيس التنفيذي (CEO)' : '2. Decisions Required from CEO & Executive Directives'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isAr ? 'القرارات الاستراتيجية والتوجيهات التنفيذية التي تظهر في الصندوق المخصص بالصفحة 6' : 'Strategic decisions and CEO comments displayed on Page 6'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setReportData({
                            ...reportData,
                            nextMonthPlan: {
                              ...reportData.nextMonthPlan,
                              ceoComments: [...reportData.nextMonthPlan.ceoComments, '']
                            }
                          })
                        }
                        className="text-xs text-[#A11212] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة قرار مطلوب' : 'Add Decision Request'}
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {reportData.nextMonthPlan.ceoComments.map((dec, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                          <span className="w-7 h-7 rounded-lg bg-[#A11212]/10 text-[#A11212] flex items-center justify-center font-black text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={dec}
                            placeholder={isAr ? `توجيه / قرار رقم ${idx + 1}...` : `Decision / directive #${idx + 1}...`}
                            onChange={(e) => {
                              const newD = [...reportData.nextMonthPlan.ceoComments];
                              newD[idx] = e.target.value;
                              setReportData({
                                ...reportData,
                                nextMonthPlan: {
                                  ...reportData.nextMonthPlan,
                                  ceoComments: newD
                                }
                              });
                            }}
                            className="flex-1 bg-transparent border-0 p-1 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                          />
                          <button
                            onClick={() => {
                              const newD = reportData.nextMonthPlan.ceoComments.filter((_, i) => i !== idx);
                              setReportData({
                                ...reportData,
                                nextMonthPlan: {
                                  ...reportData.nextMonthPlan,
                                  ceoComments: newD
                                }
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg shrink-0"
                            title="Delete Decision"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Formal Approvals & Signatures Block */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                      {isAr ? '3. الاعتمادات والتوقيعات الرسمية (أسفل الصفحة 6)' : '3. Formal Approvals & Executive Sign-off (Page 6 Footer)'}
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-4">
                      {isAr ? 'تخصيص بيانات اعتماد مدير العمليات وموافقة مكتب الرئيس التنفيذي وتاريخ الرفع' : 'Customize manager submission identity, report date, and executive sign-off text'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'اعتماد مدير العمليات / معد التقرير' : "Manager's Approval Signature / Name"}
                        </label>
                        <input
                          type="text"
                          value={reportData.nextMonthPlan.managerApprovalSignature || ''}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              nextMonthPlan: {
                                ...reportData.nextMonthPlan,
                                managerApprovalSignature: e.target.value
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'تاريخ الاعتماد والرفع' : 'Submission / Approval Date'}
                        </label>
                        <input
                          type="text"
                          value={reportData.nextMonthPlan.managerApprovalDate || ''}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              nextMonthPlan: {
                                ...reportData.nextMonthPlan,
                                managerApprovalDate: e.target.value
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'اعتماد وموافقة الرئيس التنفيذي' : 'CEO Sign-off Status'}
                        </label>
                        <input
                          type="text"
                          value={reportData.nextMonthPlan.ceoApprovalSignature || ''}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              nextMonthPlan: {
                                ...reportData.nextMonthPlan,
                                ceoApprovalSignature: e.target.value
                              }
                            })
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Bar */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setViewMode('preview')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#A11212] to-red-900 text-white font-black text-xs shadow-xl shadow-red-900/30 flex items-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <Eye className="w-4 h-4" />
                <span>{isAr ? 'معاينة التقرير الكامل في نمط A4' : 'Preview Full 6-Page Report in A4'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
