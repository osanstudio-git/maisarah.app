import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileBarChart,
  Printer,
  Download,
  Share2,
  Calendar,
  Filter,
  CheckCircle2,
  Building2,
  TrendingUp,
  AlertTriangle,
  FileText,
  PieChart
} from 'lucide-react';
import { getAllDepartments } from '../../config/departments';

type ReportType = 'financial' | 'operations' | 'compliance' | 'clients';
type DateRange = 'month' | 'quarter' | 'year';

const ExecutiveReports = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [reportType, setReportType] = useState<ReportType>('financial');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  // Load CRM data from LocalStorage
  const savedClients = localStorage.getItem('crm_clients');
  const savedLeads = localStorage.getItem('crm_leads');
  const crmClients = savedClients ? JSON.parse(savedClients) : [];
  const crmLeads = savedLeads ? JSON.parse(savedLeads) : [];

  const totalClientsCount = crmClients.length || 3;
  const totalLeadsCount = crmLeads.length || 5;
  const totalArr = crmClients.reduce((sum: number, c: any) => sum + (c.yearlyBilling || 0), 0) || 22800;

  const handleGenerate = () => {
    setIsGenerating(true);
    setReportGenerated(false);
    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  const getDateLabel = () => {
    const today = new Date();
    if (dateRange === 'month') return today.toLocaleDateString(isAr ? 'ar-OM' : 'en-US', { month: 'long', year: 'numeric' });
    if (dateRange === 'quarter') return `Q${Math.floor(today.getMonth() / 3) + 1} ${today.getFullYear()}`;
    return today.getFullYear().toString();
  };

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Screen Header (Hidden on Print) ───────────────────────────── */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <FileBarChart className="text-brand-dark" size={32} />
            {isAr ? 'التقارير التنفيذية' : 'Executive Reports'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'توليد تقارير احترافية مخصصة للطباعة والمشاركة' : 'Generate professional reports for printing and sharing'}
          </p>
        </div>

        {reportGenerated && (
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="bg-white border border-gray-200 text-gray-700 hover:text-brand-dark hover:border-brand-dark px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
            >
              <Printer size={18} /> {isAr ? 'طباعة / PDF' : 'Print / PDF'}
            </button>
            <button className="bg-brand-dark text-white hover:bg-gray-800 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-gray-200">
              <Share2 size={18} /> {isAr ? 'مشاركة' : 'Share'}
            </button>
          </div>
        )}
      </div>

      {/* ── Configuration Engine (Hidden on Print) ───────────────────── */}
      <div className="print:hidden bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Filter size={14} /> {isAr ? 'نوع التقرير' : 'Report Type'}
          </label>
          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-dark outline-none"
          >
            <option value="financial">{isAr ? 'الملخص المالي الشامل' : 'Comprehensive Financial Summary'}</option>
            <option value="operations">{isAr ? 'أداء العمليات والأقسام' : 'Operations & Department Performance'}</option>
            <option value="clients">{isAr ? 'تحليل محفظة العملاء' : 'Client Portfolio Analysis'}</option>
            <option value="compliance">{isAr ? 'تقرير المخاطر والامتثال' : 'Risk & Compliance Report'}</option>
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Calendar size={14} /> {isAr ? 'الفترة الزمنية' : 'Date Range'}
          </label>
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
            {[
              { id: 'month', label: isAr ? 'الشهر' : 'Month' },
              { id: 'quarter', label: isAr ? 'الربع' : 'Quarter' },
              { id: 'year', label: isAr ? 'السنة' : 'Year' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as DateRange)}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${dateRange === range.id ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full lg:w-auto bg-brand-dark text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 disabled:opacity-70 min-w-[160px]"
        >
          {isGenerating ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>{isAr ? 'توليد التقرير' : 'Generate'}</>
          )}
        </button>
      </div>

      {/* ── Document Preview (Visible on Print) ──────────────────────── */}
      {reportGenerated ? (
        <div className="bg-white rounded-none sm:rounded-[2rem] shadow-2xl sm:shadow-sm border-0 sm:border border-gray-200 p-8 sm:p-12 min-h-[800px] print:p-0 print:shadow-none print:min-h-0 print:block">
          
          {/* Document Header */}
          <div className="border-b-4 border-brand-dark pb-6 mb-8 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-brand-dark text-white rounded-xl flex items-center justify-center font-black text-2xl">
                  M
                </div>
                <h2 className="text-2xl font-black text-brand-dark tracking-tight">Maisarah<span className="text-gray-400 font-medium">OS</span></h2>
              </div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                {reportType === 'financial' && (isAr ? 'الملخص المالي الشامل' : 'Financial Summary Report')}
                {reportType === 'operations' && (isAr ? 'أداء العمليات والأقسام' : 'Operations Performance Report')}
                {reportType === 'clients' && (isAr ? 'تحليل محفظة العملاء' : 'Client Portfolio Analysis')}
                {reportType === 'compliance' && (isAr ? 'تقرير المخاطر والامتثال' : 'Risk & Compliance Report')}
              </h1>
            </div>
            <div className="text-end">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'تاريخ التقرير' : 'Report Period'}</p>
              <p className="text-lg font-black text-gray-900">{getDateLabel()}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-2">Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Document Body - Mock Data based on Report Type */}
          <div className="space-y-8">
            
            {/* Top Level Highlights */}
            <div className="grid grid-cols-3 gap-6 print:gap-4">
              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={14}/> 
                  {reportType === 'clients' ? (isAr ? 'إجمالي الفرص' : 'Total Leads') : (isAr ? 'المقياس 1' : 'Metric 1')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? '124,500 OMR' : reportType === 'clients' ? totalLeadsCount : '98%'}
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertTriangle size={14}/> 
                  {reportType === 'clients' ? (isAr ? 'العملاء النشطون' : 'Active Clients') : (isAr ? 'المقياس 2' : 'Metric 2')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? '12,400 OMR' : reportType === 'clients' ? totalClientsCount : '2'}
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14}/> 
                  {reportType === 'clients' ? (isAr ? 'القيمة السنوية ARR' : 'ARR Value') : (isAr ? 'المقياس 3' : 'Metric 3')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? '+15%' : reportType === 'clients' ? `${totalArr.toLocaleString()} OMR` : 'Optimal'}
                </p>
              </div>
            </div>

            {/* Main Data Table */}
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-brand-dark" /> 
                {isAr ? 'البيانات التفصيلية' : 'Detailed Breakdown'}
              </h3>
              <table className="w-full text-start border-collapse">
                <thead className="bg-gray-100 print:bg-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-start text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'البند' : 'Item'}</th>
                    <th className="px-4 py-3 text-start text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'القسم' : 'Category'}</th>
                    <th className="px-4 py-3 text-end text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'القيمة' : 'Value'}</th>
                    <th className="px-4 py-3 text-end text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportType === 'clients' ? (
                    crmClients.map((client: any, idx: number) => (
                      <tr key={client.id || idx} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                          {client.companyName || client.name}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                          {client.type === 'B2B' ? 'B2B Corporate' : 'B2C Standard'}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-gray-900 text-end border border-gray-200">
                          {client.yearlyBilling ? `${client.yearlyBilling.toLocaleString()} OMR` : '0 OMR'}
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-end border border-gray-200 text-green-700">
                          <span className="bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">ONBOARDED</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                          {reportType === 'financial' ? `Invoice #${1000 + i}` : `Operational Task ${i}`}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                          {getAllDepartments()[i % 8]?.name || 'Audit'}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-gray-900 text-end border border-gray-200">
                          {reportType === 'financial' ? `${(Math.random() * 5000).toFixed(0)} OMR` : Math.floor(Math.random() * 100)}
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-end border border-gray-200">
                          <span className="text-green-600 uppercase tracking-widest">OK</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Footer */}
            <div className="pt-8 mt-8 border-t-2 border-gray-100 flex justify-between items-end text-xs text-gray-400 font-bold">
              <p>CONFIDENTIAL & PROPRIETARY</p>
              <div className="text-end">
                <p>Maisarah Financial Consulting</p>
                <p>Muscat, Sultanate of Oman</p>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="print:hidden h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50/50">
          <PieChart size={48} className="mb-4 opacity-20" />
          <p className="font-bold">{isAr ? 'حدد الإعدادات واضغط على توليد لإنشاء التقرير' : 'Configure settings and hit Generate to build a report'}</p>
        </div>
      )}
    </div>
  );
};

export default ExecutiveReports;
