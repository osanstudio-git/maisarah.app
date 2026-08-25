import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, FileText, Download, TrendingUp, Calendar, Users, DollarSign, Clock, ShieldAlert, Award
} from 'lucide-react';

interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  metric: string;
  trend: string;
}

export default function HRReports() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [selectedReportId, setSelectedReportId] = useState<string>('rep-1');

  const REPORTS: ReportCategory[] = [
    {
      id: 'rep-1',
      name: isAr ? 'تقرير الحضور والانصراف والغياب' : 'Attendance & Absenteeism Audit',
      description: isAr ? 'سجل تفصيلي لنسب الغياب، التأخير، وساعات العمل الكلية' : 'Overview of corporate attendance rates, total hours worked, and late logs.',
      icon: <Clock className="text-[#A11212]" size={20} />,
      metric: '94.2% Attendance Rate',
      trend: '+1.2% vs Last Month'
    },
    {
      id: 'rep-2',
      name: isAr ? 'بيان الرواتب والموازنة الشهرية' : 'Payroll Budget & Disbursal Report',
      description: isAr ? 'تفاصيل الرواتب المصروفة، البدلات، الخصومات وموازنات الأقسام' : 'Summary of basic salary packages, housing/transport allowances, and deductions.',
      icon: <DollarSign className="text-green-700" size={20} />,
      metric: '4,400 OMR Total Disbursed',
      trend: 'Within Allocated Budget'
    },
    {
      id: 'rep-3',
      name: isAr ? 'رصد أرصدة الإجازات' : 'Leave Balance & Utilization Tracker',
      description: isAr ? 'مستويات استهلاك الإجازات السنوية والمرضية للموظفين' : 'Analysis of annual leave utilization and sick leave wage schedules.',
      icon: <Calendar className="text-blue-700" size={20} />,
      metric: '18 Days Avg. Balance',
      trend: 'Healthy utilization curve'
    },
    {
      id: 'rep-4',
      name: isAr ? 'الدوران الوظيفي والتعيينات' : 'Employee Turnover & Headcount Metrics',
      description: isAr ? 'بيانات التعيينات الجديدة ونسب الاستقالات وإنهاء الخدمة' : 'Metrics outlining hiring velocity, open roles, and department transfers.',
      icon: <Users className="text-amber-700" size={20} />,
      metric: '5 Active Staff Members',
      trend: '+2 New Hires in pipeline'
    }
  ];

  const handleExport = (reportName: string, format: 'PDF' | 'CSV') => {
    alert(isAr 
      ? `جاري تصدير تقرير (${reportName}) بصيغة ${format}...` 
      : `Exporting ${reportName} in ${format} format...`);
  };

  const selectedReport = REPORTS.find(r => r.id === selectedReportId) || REPORTS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-[#A11212]" size={24} />
          {isAr ? 'مركز التقارير والتحليلات' : 'HR Reports & Intelligence'}
        </h2>
        <p className="text-xs text-gray-500 font-bold">
          {isAr ? 'استخراج وتصدير تقارير الحضور والرواتب وتقييم الموظفين' : 'Compile and export detailed logs concerning attendance, budgets, and audits'}
        </p>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Left Side: Report Categories list */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1 mb-3">Available Reports</h3>
          <div className="space-y-2">
            {REPORTS.map(rep => (
              <button
                key={rep.id}
                onClick={() => setSelectedReportId(rep.id)}
                className={`w-full p-4 rounded-xl flex items-start gap-3 border transition-all text-start ${
                  selectedReportId === rep.id
                    ? 'bg-[#A11212]/5 border-[#A11212]'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100">
                  {rep.icon}
                </div>
                <div>
                  <h4 className="font-black text-xs text-gray-900">{rep.name}</h4>
                  <p className="text-[9px] text-gray-500 font-medium mt-0.5">{rep.metric}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Preview & Export Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-start pb-6 border-b border-gray-100 flex-wrap gap-4">
              <div>
                <h3 className="font-black text-sm text-gray-900">{selectedReport.name}</h3>
                <p className="text-[10px] text-gray-500 font-bold mt-1">{selectedReport.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(selectedReport.name, 'CSV')}
                  className="bg-gray-50 border border-gray-200 text-gray-700 hover:text-[#A11212] hover:border-[#A11212] text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={() => handleExport(selectedReport.name, 'PDF')}
                  className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl flex items-center gap-1 hover:bg-gray-800 transition-colors"
                >
                  <FileText size={14} /> Export PDF
                </button>
              </div>
            </div>

            {/* Simulated Data Visualization Summary */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Report Highlights Summary</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl space-y-1">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Current Period Benchmark</p>
                  <p className="text-lg font-black text-gray-900">{selectedReport.metric}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl space-y-1">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Monthly Variance Trend</p>
                  <p className="text-lg font-black text-green-700">{selectedReport.trend}</p>
                </div>
              </div>

              {/* Department breakdown graph simulation */}
              <div className="border border-gray-100 rounded-xl p-5 space-y-3">
                <h5 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Corporate Ratios</h5>
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                      <span>Audit Department</span>
                      <span>40%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#A11212] rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                      <span>Tax & VAT Advisory</span>
                      <span>35%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-800 rounded-full" style={{ width: '35%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                      <span>Accounting Support</span>
                      <span>25%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-400 rounded-full" style={{ width: '25%' }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
