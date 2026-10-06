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
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-3">
                      {isAr ? 'تفصيل إيرادات الخدمات والمستهدف' : 'Service Revenue Breakdown vs Strategic Targets'}
                    </h4>
                    <div className="space-y-3">
                      {reportData.financialPerformance.revenueByService.map((srv, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 items-center"
                        >
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {isAr ? srv.serviceNameAr || srv.serviceName : srv.serviceName}
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
                          <div className="text-end">
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
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: HR & DEPARTMENT DELIVERABLES */}
              {activeTab === 'p3' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'إجمالي الموظفين' : 'Total Employees'}
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'الموظفون الجدد' : 'New Hires'}
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'المغادرون' : 'Departures'}
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Department Deliverables Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-3">
                      {isAr ? 'متابعة إنجاز الأقسام والملفات' : 'Department Deliverables & File Tracking'}
                    </h4>
                    <div className="space-y-4">
                      {reportData.servicePerformance.departments.map((dep, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60"
                        >
                          <div className="font-bold text-xs text-slate-900 dark:text-white mb-2">
                            {isAr ? dep.departmentAr || dep.department : dep.department}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block">
                                {isAr ? 'النشطة' : 'Active Files'}
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
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">
                                {isAr ? 'المكتملة' : 'Completed'}
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
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">
                                {isAr ? 'المتأخرة' : 'Delayed'}
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
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-red-500 font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">
                                {isAr ? 'نسبة الإنجاز' : 'Completion Rate'}
                              </span>
                              <div className="pt-2 text-xs font-black text-slate-800 dark:text-slate-200">
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
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-700 dark:text-slate-300"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CLIENTS & SALES */}
              {activeTab === 'p4' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'تقييم رضا العملاء (من 5)' : 'Client Satisfaction Rating (out of 5)'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'عقود مجددة' : 'Contracts Renewed'}
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {isAr ? 'عملاء محولون (B2B)' : 'Referrals (B2B)'}
                      </label>
                      <input
                        type="number"
                        value={reportData.marketingAndSales.sourcesDistribution.referralsB2B}
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Quotations summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'عروض مرسلة' : 'Sent'}</span>
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'عروض مقبولة' : 'Accepted'}</span>
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'عملاء جدد متعاقد معهم' : 'Contracted'}</span>
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'معدل القبول' : 'Win Rate'}</span>
                      <div className="pt-2 text-xs font-black text-emerald-600">
                        {reportData.marketingAndSales.quotationsSent > 0
                          ? ((reportData.marketingAndSales.quotationsAccepted / reportData.marketingAndSales.quotationsSent) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BRAND & IDENTITY */}
              {activeTab === 'p5' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      {isAr ? 'بنود الهوية المؤسسية والظهور الإعلامي' : 'Brand Identity & Corporate Presence Items'}
                    </h4>
                    <button
                      onClick={() =>
                        setReportData({
                          ...reportData,
                          brandIdentity: {
                            ...reportData.brandIdentity,
                            achievements: [
                              ...reportData.brandIdentity.achievements,
                              { id: `b-${Date.now()}`, item: 'New Channel', achieved: 'Active', notes: '' }
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
                  {reportData.brandIdentity.achievements.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'البند' : 'Item'}</span>
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
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'المتحقق' : 'Achieved Status'}</span>
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
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-[#A11212]"
                        />
                      </div>
                      <div className="sm:col-span-2 flex gap-2 items-center">
                        <div className="flex-1">
                          <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'ملاحظات' : 'Notes'}</span>
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
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs"
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
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg mt-3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 6: NEXT MONTH PLAN & CEO DECISIONS */}
              {activeTab === 'p6' && (
                <div className="space-y-6">
                  {/* Action items table */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {isAr ? 'خطة عمل وأولويات الشهر القادم' : 'Next Month Priority Action Items'}
                      </h4>
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
                                  deadline: 'Day 15',
                                  supportRequired: 'CEO'
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
                          className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center"
                        >
                          <div className="sm:col-span-2">
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              {isAr ? 'الإجراء ذو الأولوية' : 'Priority Action'}
                            </span>
                            <input
                              type="text"
                              value={act.priorityAction}
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
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              {isAr ? 'النتيجة المستهدفة' : 'Target Outcome'}
                            </span>
                            <input
                              type="text"
                              value={act.targetOutcome}
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
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              {isAr ? 'المسؤول والموعد' : 'Responsible & Deadline'}
                            </span>
                            <input
                              type="text"
                              value={`${act.responsible} (${act.deadline})`}
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
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                            />
                          </div>
                          <div className="text-end">
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
                              className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CEO Decisions Required */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {isAr ? 'قرارات مطلوبة من الرئيس التنفيذي (CEO)' : 'Decisions Required from CEO'}
                      </h4>
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
                    {reportData.nextMonthPlan.ceoComments.map((dec, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={dec}
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
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
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
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
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
