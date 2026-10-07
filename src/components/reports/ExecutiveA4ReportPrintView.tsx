import React from 'react';
import type { MonthlyPerformanceReportData } from '../../types/monthlyPerformanceReport';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Award,
  DollarSign,
  Briefcase,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface ExecutiveA4ReportPrintViewProps {
  data: MonthlyPerformanceReportData;
  isAr?: boolean;
}

export default function ExecutiveA4ReportPrintView({ data, isAr = false }: ExecutiveA4ReportPrintViewProps) {
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const monthLabel = isAr ? monthNamesAr[data.month] : monthNamesEn[data.month];

  // Helper Header for each page
  const renderPageHeader = (pageNumber: number, title?: string) => (
    <div className="flex justify-between items-center pb-3 border-b-2 border-gray-900/10 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#A11212] text-white flex items-center justify-center font-black text-sm shadow-xs">
          م
        </div>
        <div>
          <h1 className="text-xs font-black uppercase tracking-wider text-gray-900">
            {isAr ? 'ميسرة للاستشارات المالية والتدقيق' : 'Maisarah Financial Consulting & Auditing'}
          </h1>
          <p className="text-[9px] text-gray-500 font-bold">
            {isAr ? 'تقرير أداء المكتب الشهري الداخلي' : 'Monthly Office Performance Report'} · {monthLabel} {data.year}
          </p>
        </div>
      </div>

      <div className="text-end">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#A11212] bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
          {isAr ? `تقرير الإدارة الداخلي | ${pageNumber}` : `Internal Management Report | ${pageNumber}`}
        </span>
        <p className="text-[8px] text-gray-400 font-bold mt-0.5">Ref: {data.referenceNumber}</p>
      </div>
    </div>
  );

  // Helper Footer for each page
  const renderPageFooter = (pageNumber: number) => (
    <div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center text-[8px] text-gray-400 font-bold">
      <span>{isAr ? 'سري وخاص بالإدارة التنفيذية' : 'Confidential — For Internal Executive Management Only'}</span>
      <span>{isAr ? `الصفحة ${pageNumber} من 6` : `Page ${pageNumber} of 6`}</span>
    </div>
  );

  return (
    <div className="executive-report-print-container bg-gray-100 text-gray-900 print:bg-white print:text-black" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ============================================================ */}
      {/* PAGE 1: EXECUTIVE SUMMARY */}
      {/* ============================================================ */}
      <div className="a4-page bg-white shadow-xl print:shadow-none p-10 max-w-[210mm] min-h-[297mm] mx-auto my-6 print:m-0 flex flex-col justify-between rounded-2xl print:rounded-none">
        <div>
          {renderPageHeader(1)}

          <div className="text-center my-4 pb-4 border-b border-gray-100">
            <span className="text-[10px] font-black text-[#A11212] uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">
              {isAr ? 'التقرير التنفيذي الشامل' : 'Executive Monthly Briefing'}
            </span>
            <h2 className="text-2xl font-black text-gray-900 mt-2">
              {isAr ? 'تقرير أداء المكتب الشهري' : 'Monthly Office Performance Report'}
            </h2>
            <p className="text-xs text-gray-500 font-bold mt-1">
              {isAr ? `فترة التقرير: شهر ${monthLabel} ${data.year}` : `Reporting Period: ${monthLabel} ${data.year}`} · {data.departmentScope}
            </p>
          </div>

          {/* 1 - Executive Summary */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  {isAr ? '1 - الملخص التنفيذي' : '1 - Executive Summary'}
                </h3>
              </div>

              {/* Top KPIs Summary Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start">
                  <tbody>
                    <tr className="border-b border-gray-200 bg-gray-50/60">
                      <td className="py-2.5 px-4 font-bold text-gray-600 w-1/2">{isAr ? 'إجمالي الإيرادات' : 'Revenue'}</td>
                      <td className="py-2.5 px-4 font-black text-gray-900 text-end">
                        {data.executiveSummary.totalRevenue.toLocaleString()} <span className="text-[10px] font-bold text-gray-400">OMR</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2.5 px-4 font-bold text-gray-600">{isAr ? 'عدد الخدمات والملفات المنجزة' : 'Number of services / files'}</td>
                      <td className="py-2.5 px-4 font-black text-gray-900 text-end">{data.executiveSummary.numberOfServices}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-gray-600">{isAr ? 'العملاء الجدد المسجلين' : 'New client acquisitions'}</td>
                      <td className="py-2.5 px-4 font-black text-[#A11212] text-end">+{data.executiveSummary.newClientsCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Achievements */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Award size={14} className="text-emerald-600" />
                <span>{isAr ? 'أهم الإنجازات المحققة' : 'Key Achievements'}</span>
              </h4>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs text-emerald-950 font-medium">
                {data.executiveSummary.keyAchievements.map((ach, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">•</span>
                    <span>{ach}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Challenges and Their Impact */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-rose-600" />
                <span>{isAr ? 'أهم التحديات والأثر المترتب' : 'Key Challenges and Their Impact'}</span>
              </h4>
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-2 text-xs text-rose-950 font-medium">
                {data.executiveSummary.keyChallenges.map((ch, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0">•</span>
                    <span>{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter(1)}
      </div>

      {/* ============================================================ */}
      {/* PAGE 2: FINANCIAL PERFORMANCE */}
      {/* ============================================================ */}
      <div className="a4-page bg-white shadow-xl print:shadow-none p-10 max-w-[210mm] min-h-[297mm] mx-auto my-6 print:m-0 flex flex-col justify-between rounded-2xl print:rounded-none page-break">
        <div>
          {renderPageHeader(2)}

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                {isAr ? '2 - الأداء المالي' : '2 - Financial Performance'}
              </h3>
            </div>

            {/* Core Financial Indicators Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                    <th className="py-2.5 px-3 text-start">{isAr ? 'المؤشر المالي' : 'Indicator'}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'الشهر الحالي' : 'Current month'}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'الشهر السابق' : 'Previous month'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'الملاحظات والتحليل' : 'Notes & Analysis'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  <tr>
                    <td className="py-2 px-3 font-bold text-gray-900">{isAr ? 'إجمالي الإيرادات' : 'Total revenue'}</td>
                    <td className="py-2 px-3 font-black text-end">{data.financialPerformance.currentRevenue.toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold text-gray-500 text-end">{data.financialPerformance.previousRevenue.toLocaleString()}</td>
                    <td className="py-2 px-3 text-emerald-700 font-black text-[11px]">+{data.financialPerformance.revenueChangePercent}%</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="py-2 px-3 font-bold text-gray-900">{isAr ? 'إجمالي المصروفات' : 'Total expenses'}</td>
                    <td className="py-2 px-3 font-black text-end">{data.financialPerformance.currentExpenses.toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold text-gray-500 text-end">{data.financialPerformance.previousExpenses.toLocaleString()}</td>
                    <td className="py-2 px-3 text-emerald-700 font-black text-[11px]">{data.financialPerformance.expensesChangePercent}%</td>
                  </tr>
                  <tr className="bg-red-50/30">
                    <td className="py-2 px-3 font-black text-gray-900">{isAr ? 'صافي الربح / الخسارة' : 'Net profit or loss'}</td>
                    <td className="py-2 px-3 font-black text-[#A11212] text-end">{data.financialPerformance.currentProfit.toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold text-gray-500 text-end">{data.financialPerformance.previousProfit.toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-700 font-bold text-[11px]">
                      {isAr ? `هامش الربح: ${data.financialPerformance.profitMarginPercent}%` : `Current profit margin: ${data.financialPerformance.profitMarginPercent}%.`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-gray-900">{isAr ? 'المبالغ المحصلة من العملاء' : 'Amounts collected from clients'}</td>
                    <td className="py-2 px-3 font-black text-end">{data.financialPerformance.collectedFromClients.toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold text-gray-500 text-end">{data.financialPerformance.previousCollected.toLocaleString()}</td>
                    <td className="py-2 px-3 text-emerald-700 font-black text-[11px]">+{data.financialPerformance.collectionGrowthPercent}%</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="py-2 px-3 font-bold text-gray-900">{isAr ? 'مستحقات عملاء غير محصلة' : 'Uncollected client receivables'}</td>
                    <td className="py-2 px-3 font-black text-end">{data.financialPerformance.uncollectedReceivables.toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold text-gray-500 text-end">{data.financialPerformance.previousUncollected.toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-600 font-medium text-[10px]">
                      {isAr ? 'متابعة التحصيل وفق تواريخ الاستحقاق' : 'Receivables followed up according to due dates.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-gray-900">{isAr ? 'مستحقات متأخرة' : 'Overdue receivables'}</td>
                    <td className="py-2 px-3 font-black text-end">{data.financialPerformance.overdueReceivables}</td>
                    <td className="py-2 px-3 font-bold text-gray-500 text-end">0</td>
                    <td className="py-2 px-3 text-green-700 font-bold text-[11px]">0 (Controlled)</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="py-2 px-3 font-bold text-gray-900">{isAr ? 'رصيد النقد والبنوك نهاية الشهر' : 'Cash and bank balance at month-end'}</td>
                    <td className="py-2 px-3 font-black text-end">{data.financialPerformance.cashBankBalance.toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold text-gray-500 text-end">{data.financialPerformance.previousCashBankBalance.toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-500 font-bold text-[10px]">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Revenue Breakdown by Service */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                {isAr ? 'تفصيل الإيرادات حسب الخدمة' : 'Revenue Breakdown by Service'}
              </h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                      <th className="py-2 px-3 text-start">{isAr ? 'الخدمة' : 'Service'}</th>
                      <th className="py-2 px-3 text-end">{isAr ? 'الإيراد المحقق' : 'Revenue'}</th>
                      <th className="py-2 px-3 text-end">{isAr ? 'المستهدف' : 'Target'}</th>
                      <th className="py-2 px-3 text-end">{isAr ? 'نسبة الإنجاز' : 'Achievement %'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {data.financialPerformance.revenueByService.map((srv, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/40' : ''}>
                        <td className="py-1.5 px-3 font-bold text-gray-900">{isAr ? (srv.serviceNameAr || srv.serviceName) : srv.serviceName}</td>
                        <td className="py-1.5 px-3 font-black text-end">{srv.revenue.toLocaleString()}</td>
                        <td className="py-1.5 px-3 font-bold text-gray-500 text-end">{srv.target.toLocaleString()}</td>
                        <td className="py-1.5 px-3 text-end">
                          <span className={`font-black ${srv.achievementRate >= 70 ? 'text-green-700' : srv.achievementRate >= 40 ? 'text-amber-700' : 'text-rose-700'}`}>
                            {srv.achievementRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-black border-t-2 border-gray-300">
                      <td className="py-2 px-3">{isAr ? 'الإجمالي العام' : 'Total'}</td>
                      <td className="py-2 px-3 text-end text-[#A11212]">
                        {data.financialPerformance.revenueByService.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-end">
                        {data.financialPerformance.revenueByService.reduce((sum, s) => sum + s.target, 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-end text-[#A11212]">
                        {(
                          (data.financialPerformance.revenueByService.reduce((sum, s) => sum + s.revenue, 0) /
                            data.financialPerformance.revenueByService.reduce((sum, s) => sum + s.target, 0)) *
                          100
                        ).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reasons for Changes and Collection or Profitability Improvement Plan */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                {isAr ? 'أسباب التغيرات وخطة تحسين التحصيل والربحية' : 'Reasons for Changes and Collection or Profitability Improvement Plan'}
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1.5 text-xs text-gray-700 font-medium">
                {data.financialPerformance.profitabilityPlanNotes.map((note, idx) => (
                  <p key={idx}>
                    <span className="font-black text-gray-900">{idx + 1} - </span>
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter(2)}
      </div>

      {/* ============================================================ */}
      {/* PAGE 3: HUMAN RESOURCES & SERVICE PERFORMANCE */}
      {/* ============================================================ */}
      <div className="a4-page bg-white shadow-xl print:shadow-none p-10 max-w-[210mm] min-h-[297mm] mx-auto my-6 print:m-0 flex flex-col justify-between rounded-2xl print:rounded-none page-break">
        <div>
          {renderPageHeader(3)}

          <div className="space-y-6">
            {/* 3 - Human Resources */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  {isAr ? '3 - الموارد البشرية والكادر الوظيفي' : '3 - Human Resources'}
                </h3>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                      <th className="py-2.5 px-3 text-start w-1/3">{isAr ? 'المؤشر' : 'Indicator'}</th>
                      <th className="py-2.5 px-3 text-center w-24">{isAr ? 'النتيجة الشهرية' : 'Monthly result'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الملاحظات والإجراء' : 'Notes and action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    <tr>
                      <td className="py-2 px-3 font-bold">{isAr ? 'عدد الموظفين نهاية الشهر' : 'Number of employees at month-end'}</td>
                      <td className="py-2 px-3 font-black text-center">{data.humanResources.totalStaffMonthEnd}</td>
                      <td className="py-2 px-3 text-gray-500 text-[11px] font-bold">{isAr ? 'طاقة تشغيلية مستقرة' : 'Stable active staff capacity'}</td>
                    </tr>
                    <tr className="bg-emerald-50/40">
                      <td className="py-2 px-3 font-bold text-emerald-950 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {isAr ? 'التعيينات والكوادر الجديدة' : 'New hires & onboardings'}
                      </td>
                      <td className="py-2 px-3 font-black text-center text-emerald-700">
                        {data.humanResources.hiresCount > 0 ? `+${data.humanResources.hiresCount}` : data.humanResources.hiresCount}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">
                        {data.humanResources.hiresNotes || (data.humanResources.hiresCount > 0 
                          ? (isAr ? `تم تعيين ${data.humanResources.hiresCount} موظف جديد وبدء برنامج التأهيل` : `${data.humanResources.hiresCount} new hire(s) onboarded successfully`)
                          : (isAr ? 'لا توجد تعيينات جديدة هذا الشهر؛ المقابلات قيد التنفيذ' : 'No new hires this month; recruitment pipelines active'))}
                      </td>
                    </tr>
                    <tr className="bg-rose-50/40">
                      <td className="py-2 px-3 font-bold text-rose-950 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                        {isAr ? 'المغادرون والاستقالات' : 'Departures & turnover'}
                      </td>
                      <td className="py-2 px-3 font-black text-center text-rose-700">
                        {data.humanResources.departuresCount > 0 ? `-${data.humanResources.departuresCount}` : data.humanResources.departuresCount}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">{data.humanResources.departuresNotes}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">{isAr ? 'الإجازات وأثرها على توزيع العمل' : 'Leave and its impact on work allocation'}</td>
                      <td className="py-2 px-3 font-black text-center">{data.humanResources.leaveImpactCount}</td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">{data.humanResources.leaveImpactNotes}</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-2 px-3 font-bold">{isAr ? 'أداء وتحقيق مستهدفات الموظفين' : 'Performance and achievement of targets'}</td>
                      <td className="py-2 px-3 font-bold text-center text-green-700">86%</td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">{data.humanResources.performanceNotes}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">{isAr ? 'التدريب وتطوير المهارات' : 'Training and skills development'}</td>
                      <td className="py-2 px-3 font-bold text-center">Active</td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">{data.humanResources.trainingNotes}</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-2 px-3 font-bold">{isAr ? 'احتياجات التوظيف وسد النقص' : 'Staffing needs and coverage of shortages'}</td>
                      <td className="py-2 px-3 font-black text-center text-[#A11212]">
                        {data.humanResources.staffingNeeds.reduce((sum, s) => sum + s.count, 0)}
                      </td>
                      <td className="py-2 px-3 text-gray-900 font-bold text-[11px]">
                        {data.humanResources.staffingNeeds.map(s => `${s.count} ${s.role}`).join(', ')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4 - Service Performance */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  {isAr ? '4 - أداء الخدمات وإنجاز الملفات' : '4 - Service Performance'}
                </h3>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                      <th className="py-2 px-2.5 text-start">{isAr ? 'القسم / الخدمة' : 'Department or service'}</th>
                      <th className="py-2 px-2 text-center">{isAr ? 'نشط' : 'Active'}</th>
                      <th className="py-2 px-2 text-center">{isAr ? 'منجز' : 'Completed'}</th>
                      <th className="py-2 px-2 text-center">{isAr ? 'متأخر' : 'Delayed'}</th>
                      <th className="py-2 px-2 text-center">{isAr ? 'نسبة الإنجاز' : 'File %'}</th>
                      <th className="py-2 px-3 text-start w-2/5">{isAr ? 'السبب والإجراء المتخذ' : 'Reason and action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {data.servicePerformance.departments.map((dept, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/40' : ''}>
                        <td className="py-1.5 px-2.5 font-bold text-gray-900">{isAr ? (dept.departmentAr || dept.department) : dept.department}</td>
                        <td className="py-1.5 px-2 text-center font-bold">{dept.activeFiles}</td>
                        <td className="py-1.5 px-2 text-center font-bold text-green-700">{dept.completedFiles}</td>
                        <td className="py-1.5 px-2 text-center font-black text-rose-700">{dept.delayedFiles}</td>
                        <td className="py-1.5 px-2 text-center font-black">{dept.completionRate}%</td>
                        <td className="py-1.5 px-3 text-[10px] text-gray-600 font-medium">{dept.reasonAndAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quality, Review Findings */}
              <div className="mt-3">
                <h5 className="text-[11px] font-black uppercase text-gray-700 mb-1">
                  {isAr ? 'الجودة وملاحظات المراجعة والإجراءات التصحيحية' : 'Quality, Review Findings, Corrections and Preventive Actions'}
                </h5>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium min-h-[50px]">
                  {data.servicePerformance.qualityReviewNotes}
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter(3)}
      </div>

      {/* ============================================================ */}
      {/* PAGE 4: CLIENT SATISFACTION & MARKETING/SALES */}
      {/* ============================================================ */}
      <div className="a4-page bg-white shadow-xl print:shadow-none p-10 max-w-[210mm] min-h-[297mm] mx-auto my-6 print:m-0 flex flex-col justify-between rounded-2xl print:rounded-none page-break">
        <div>
          {renderPageHeader(4)}

          <div className="space-y-6">
            {/* 5 - Client Satisfaction */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  {isAr ? '5 - رضا العملاء والشكاوى' : '5 - Client Satisfaction'}
                </h3>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                      <th className="py-2.5 px-3 text-start">{isAr ? 'المؤشر' : 'Indicator'}</th>
                      <th className="py-2.5 px-3 text-center w-28">{isAr ? 'النتيجة الشهرية' : 'Monthly result'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الملاحظات والإجراء' : 'Notes and action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    <tr>
                      <td className="py-2 px-3 font-bold">{isAr ? 'عدد العملاء الذين طُلب تقييمهم' : 'Clients asked to provide a rating'}</td>
                      <td className="py-2 px-3 font-black text-center">{data.clientSatisfaction.clientsSurveyed}</td>
                      <td className="py-2 px-3 text-gray-500 text-[11px] font-bold">Comprehensive quarterly satisfaction survey</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-2 px-3 font-bold">{isAr ? 'عدد الردود المستلمة' : 'Number of responses received'}</td>
                      <td className="py-2 px-3 font-black text-center text-emerald-700">{data.clientSatisfaction.responsesReceived}</td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">84.4% Response rate achieved</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">{isAr ? 'متوسط تقييم الرضا من 5' : 'Average satisfaction rating out of 5'}</td>
                      <td className="py-2 px-3 font-black text-center text-[#A11212] text-sm">⭐ {data.clientSatisfaction.averageRating}/5</td>
                      <td className="py-2 px-3 text-emerald-800 font-bold text-[11px]">Excellent customer sentiment</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-2 px-3 font-bold">{isAr ? 'الشكاوى المستلمة والمعالجة' : 'Complaints received vs closed'}</td>
                      <td className="py-2 px-3 font-black text-center">{data.clientSatisfaction.complaintsReceived} / {data.clientSatisfaction.closedComplaints}</td>
                      <td className="py-2 px-3 text-green-700 font-bold text-[11px]">100% Resolved within SLA</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">{isAr ? 'العملاء الذين جددوا الخدمة' : 'Clients who renewed the service'}</td>
                      <td className="py-2 px-3 font-black text-center text-green-700">+{data.clientSatisfaction.renewedClientsCount}</td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">Retainer contracts extended for 2026/2027</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-2 px-3 font-bold">{isAr ? 'العملاء المنسحبون وأسباب الانسحاب' : 'Clients who withdrew and reasons'}</td>
                      <td className="py-2 px-3 font-black text-center">{data.clientSatisfaction.withdrawnClientsCount}</td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">{data.clientSatisfaction.withdrawalReasons}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6 - Marketing and Sales */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  {isAr ? '6 - التسويق والمبيعات' : '6 - Marketing and Sales'}
                </h3>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                      <th className="py-2 px-3 text-start">{isAr ? 'المؤشر' : 'Indicator'}</th>
                      <th className="py-2 px-3 text-end">{isAr ? 'الفعلي' : 'Actual'}</th>
                      <th className="py-2 px-3 text-end">{isAr ? 'المستهدف' : 'Target'}</th>
                      <th className="py-2 px-3 text-start">{isAr ? 'ملاحظات' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    <tr>
                      <td className="py-1.5 px-3 font-bold">{isAr ? 'المكالمات التسويقية' : 'Marketing calls'}</td>
                      <td className="py-1.5 px-3 font-black text-end">{data.marketingAndSales.marketingCalls}</td>
                      <td className="py-1.5 px-3 font-bold text-gray-500 text-end">150</td>
                      <td className="py-1.5 px-3 text-gray-500 text-[10px]">Outbound sales pipeline</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-1.5 px-3 font-bold">{isAr ? 'الزيارات والاجتماعات مع عملاء محتملين' : 'Visits and meetings with prospective clients'}</td>
                      <td className="py-1.5 px-3 font-black text-end">{data.marketingAndSales.prospectiveMeetings}</td>
                      <td className="py-1.5 px-3 font-bold text-gray-500 text-end">30</td>
                      <td className="py-1.5 px-3 text-gray-500 text-[10px]">On-site and boardroom presentations</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold">{isAr ? 'الفرص الجديدة المسجلة' : 'New leads captured'}</td>
                      <td className="py-1.5 px-3 font-black text-end">{data.marketingAndSales.newLeadsCount}</td>
                      <td className="py-1.5 px-3 font-bold text-gray-500 text-end">40</td>
                      <td className="py-1.5 px-3 text-gray-500 text-[10px]">Inbound + Sanad channel</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-1.5 px-3 font-bold">{isAr ? 'عروض الأسعار المرسلة' : 'Quotations sent'}</td>
                      <td className="py-1.5 px-3 font-black text-end">{data.marketingAndSales.quotationsSent}</td>
                      <td className="py-1.5 px-3 font-bold text-gray-500 text-end">25</td>
                      <td className="py-1.5 px-3 text-gray-500 text-[10px]">Quotations studio generation</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold">{isAr ? 'عروض الأسعار المعتمدة' : 'Accepted quotations'}</td>
                      <td className="py-1.5 px-3 font-black text-green-700 text-end">{data.marketingAndSales.quotationsAccepted}</td>
                      <td className="py-1.5 px-3 font-bold text-gray-500 text-end">15</td>
                      <td className="py-1.5 px-3 text-green-700 font-bold text-[10px]">63.6% Win rate</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="py-1.5 px-3 font-bold">{isAr ? 'العملاء الجدد المتعاقد معهم' : 'Newly contracted clients'}</td>
                      <td className="py-1.5 px-3 font-black text-end">{data.marketingAndSales.newlyContractedClients}</td>
                      <td className="py-1.5 px-3 font-bold text-gray-500 text-end">12</td>
                      <td className="py-1.5 px-3 text-gray-500 text-[10px]">Signed engagement contracts</td>
                    </tr>
                    <tr className="bg-red-50/30">
                      <td className="py-2 px-3 font-black text-gray-900">{isAr ? 'قيمة العقود الجديدة' : 'Value of new contracts'}</td>
                      <td className="py-2 px-3 font-black text-[#A11212] text-end">{data.marketingAndSales.newContractsValue.toLocaleString()} OMR</td>
                      <td className="py-2 px-3 font-bold text-gray-500 text-end">20,000 OMR</td>
                      <td className="py-2 px-3 text-[#A11212] font-black text-[10px]">Total Contract Value (TCV)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold">{isAr ? 'تكلفة التسويق' : 'Marketing cost'}</td>
                      <td className="py-1.5 px-3 font-black text-end">{data.marketingAndSales.marketingCost} OMR</td>
                      <td className="py-1.5 px-3 font-bold text-gray-500 text-end">500 OMR</td>
                      <td className="py-1.5 px-3 text-gray-500 text-[10px]">Ad campaigns & printed material</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Acquisition Sources Strip */}
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex justify-between items-center">
                <span className="font-bold text-gray-900">{isAr ? 'مصادر العملاء الجدد:' : 'Sources of new clients:'}</span>
                <span className="text-gray-600">
                  Calls ({data.marketingAndSales.sourcesDistribution.calls}) · Visits ({data.marketingAndSales.sourcesDistribution.visits}) · Social Media ({data.marketingAndSales.sourcesDistribution.socialMedia}) · B2B Partnerships ({data.marketingAndSales.sourcesDistribution.referralsB2B})
                </span>
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter(4)}
      </div>

      {/* ============================================================ */}
      {/* PAGE 5: BRAND IDENTITY & CORPORATE PRESENCE */}
      {/* ============================================================ */}
      <div className="a4-page bg-white shadow-xl print:shadow-none p-10 max-w-[210mm] min-h-[297mm] mx-auto my-6 print:m-0 flex flex-col justify-between rounded-2xl print:rounded-none page-break">
        <div>
          {renderPageHeader(5)}

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                {isAr ? '7 - الهوية المؤسسية والتواجد المهني' : '7 - Brand Identity and Corporate Presence'}
              </h3>
            </div>

            {/* Brand Achievements Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                    <th className="py-2.5 px-3 text-start w-1/3">{isAr ? 'البند' : 'Item'}</th>
                    <th className="py-2.5 px-3 text-center w-28">{isAr ? 'ما تم إنجازه' : 'What was achieved'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'الملاحظات' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {data.brandIdentity.achievements.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/40' : ''}>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{item.item}</td>
                      <td className="py-2.5 px-3 font-black text-center text-[#A11212]">{item.achieved}</td>
                      <td className="py-2.5 px-3 text-gray-600 text-[11px] font-medium">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key Improvements Required */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                {isAr ? 'أهم التحسينات المطلوبة في الهوية والتواجد المؤسسي' : 'Key Improvements Required in Brand Identity and Corporate Presence'}
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-xs text-gray-800 font-medium">
                {data.brandIdentity.keyImprovements.map((imp, idx) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="font-black text-gray-900">{idx + 1} - </span>
                    <span>{imp}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter(5)}
      </div>

      {/* ============================================================ */}
      {/* PAGE 6: NEXT MONTH PLAN & CEO DECISIONS */}
      {/* ============================================================ */}
      <div className="a4-page bg-white shadow-xl print:shadow-none p-10 max-w-[210mm] min-h-[297mm] mx-auto my-6 print:m-0 flex flex-col justify-between rounded-2xl print:rounded-none page-break">
        <div>
          {renderPageHeader(6)}

          <div className="space-y-6">
            <div>
              <p className="text-xs text-gray-600 font-medium mb-3">
                {isAr
                  ? 'الخطة التالية مقترحة للمناقشة مع الرئيس التنفيذي في الاجتماع الشهري. سيتم اعتماد المسؤوليات والمواعيد النهائية بعد المناقشة.'
                  : 'The following plan is proposed for discussion with the CEO at the monthly meeting. Responsibilities and deadlines will be approved after the discussion.'}
              </p>

              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#A11212]"></span>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  {isAr ? 'خطة الشهر القادم والقرارات المطلوبة' : "Next Month's Plan and Required Decisions"}
                </h3>
              </div>

              {/* Action Plan Matrix Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-red-900/10 border-b border-red-900/20 text-[#A11212] font-black text-[10px] uppercase">
                      <th className="py-2 px-2.5 text-start w-1/5">{isAr ? 'الأولوية والإجراء' : 'Priority and action'}</th>
                      <th className="py-2 px-2.5 text-start w-1/4">{isAr ? 'النتيجة المستهدفة' : 'Target outcome'}</th>
                      <th className="py-2 px-2 text-start">{isAr ? 'المسؤول' : 'Responsible'}</th>
                      <th className="py-2 px-2 text-center w-20">{isAr ? 'الموعد' : 'Deadline'}</th>
                      <th className="py-2 px-2.5 text-start">{isAr ? 'الدعم أو القرار المطلوب' : 'Support or decision required'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {data.nextMonthPlan.actionItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/40' : ''}>
                        <td className="py-2 px-2.5 font-bold text-gray-900">{item.priorityAction}</td>
                        <td className="py-2 px-2.5 text-[11px] text-gray-700">{item.targetOutcome}</td>
                        <td className="py-2 px-2 text-[10px] font-bold text-gray-800">{item.responsible}</td>
                        <td className="py-2 px-2 text-center text-[10px] font-black text-[#A11212]">{item.deadline}</td>
                        <td className="py-2 px-2.5 text-[10px] text-gray-600 font-medium">{item.supportRequired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CEO Comments & Review Box */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                {isAr ? 'ملاحظات وتوجيهات الرئيس التنفيذي' : "CEO's Comments"}
              </h4>
              <div className="border border-gray-300 rounded-xl p-4 bg-gray-50/50 space-y-2 min-h-[90px] text-xs font-medium text-gray-800">
                {data.nextMonthPlan.ceoComments.map((com, idx) => (
                  <p key={idx}>{com}</p>
                ))}
              </div>
            </div>

            {/* Formal Approvals & Signatures Block */}
            <div className="pt-4 border-t-2 border-gray-200 grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-gray-400 text-[10px] uppercase">{isAr ? 'اعتماد مدير العمليات / معد التقرير' : "Manager's Approval & Submission"}</p>
                <p className="font-black text-gray-900 text-sm">{data.nextMonthPlan.managerApprovalSignature}</p>
                <p className="text-[10px] text-gray-500 font-bold">{isAr ? 'التاريخ:' : 'Date:'} {data.nextMonthPlan.managerApprovalDate}</p>
              </div>

              <div className="space-y-1 text-end">
                <p className="font-bold text-gray-400 text-[10px] uppercase">{isAr ? 'اعتماد وموافقة الرئيس التنفيذي' : "CEO Office Executive Sign-off"}</p>
                <div className="inline-block border-b-2 border-gray-400 pb-1 min-w-[160px] text-end font-black text-gray-900">
                  {data.nextMonthPlan.ceoApprovalSignature || 'Approved & Signed'}
                </div>
                <p className="text-[10px] text-gray-500 font-bold">{isAr ? 'التاريخ:' : 'Date:'} {data.nextMonthPlan.managerApprovalDate}</p>
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter(6)}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .executive-report-print-container {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .a4-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 24mm 20mm !important;
            max-width: 100% !important;
            width: 100% !important;
            min-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}} />
    </div>
  );
}
