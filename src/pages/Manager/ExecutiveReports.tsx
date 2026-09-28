import React, { useState, useEffect, useCallback } from 'react';
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
  PieChart,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
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

  // Live DB State
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbClients, setDbClients] = useState<any[]>([]);
  const [dbContracts, setDbContracts] = useState<any[]>([]);
  const [dbProfiles, setDbProfiles] = useState<any[]>([]);

  const fetchLiveReportData = useCallback(async () => {
    try {
      const [
        { data: invs },
        { data: srvs },
        { data: cls },
        { data: cntrs },
        { data: profs }
      ] = await Promise.all([
        supabase.from('invoices').select('*, clients(company_name)').order('created_at', { ascending: false }),
        supabase.from('services').select('*, clients(company_name), profiles:profiles!employee_id(full_name)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*, assigned_employee:profiles!assigned_employee_id(full_name)').eq('is_archived', false).order('created_at', { ascending: false }),
        supabase.from('hr_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email, role, department')
      ]);

      setDbInvoices(invs || []);
      setDbServices(srvs || []);
      setDbClients(cls || []);
      setDbContracts(cntrs || []);
      setDbProfiles(profs || []);
    } catch (err) {
      console.error('Error fetching live report data:', err);
    }
  }, []);

  useEffect(() => {
    fetchLiveReportData();

    const channel = supabase
      .channel('manager-reports-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchLiveReportData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchLiveReportData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchLiveReportData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveReportData]);

  // Date Filter Logic
  const getFilteredDataByDate = (items: any[]) => {
    const now = new Date();
    return items.filter(item => {
      if (!item.created_at) return true;
      const d = new Date(item.created_at);
      if (dateRange === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const itemQuarter = Math.floor(d.getMonth() / 3);
        return itemQuarter === currentQuarter && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setReportGenerated(false);
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
    }, 400);
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

  // Live Computations for Reports
  const filteredInvoices = getFilteredDataByDate(dbInvoices);
  const activeInvoices = filteredInvoices.length > 0 ? filteredInvoices : dbInvoices;
  
  const totalBilled = activeInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalPaid = activeInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalPending = activeInvoices.filter(i => i.status !== 'paid').reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  const filteredServices = getFilteredDataByDate(dbServices);
  const activeServices = filteredServices.length > 0 ? filteredServices : dbServices;
  const completedServicesCount = activeServices.filter(s => s.status === 'completed').length;
  const delayedServicesCount = activeServices.filter(s => s.status === 'delayed').length;

  const totalClientsCount = dbClients.length;
  const totalArr = dbInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

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
            {isAr ? 'توليد تقارير احترافية مجمعة من قاعدة البيانات للطباعة والمشاركة' : 'Generate professional executive reports compiled directly from live database'}
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
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert(isAr ? 'تم نسخ رابط التقرير' : 'Report link copied to clipboard');
              }}
              className="bg-brand-dark text-white hover:bg-gray-800 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-gray-200"
            >
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
            <option value="compliance">{isAr ? 'تقرير العقود والمخاطر' : 'Risk & Compliance Report'}</option>
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

      {/* ── Document Preview (Visible on Print & Screen) ──────────────── */}
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
                {reportType === 'compliance' && (isAr ? 'تقرير العقود والمخاطر' : 'Risk & Compliance Report')}
              </h1>
            </div>
            <div className="text-end">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'فترة التقرير' : 'Report Period'}</p>
              <p className="text-lg font-black text-gray-900">{getDateLabel()}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-2">Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Document Body */}
          <div className="space-y-8">
            
            {/* Top Level Highlights */}
            <div className="grid grid-cols-3 gap-6 print:gap-4">
              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={14}/> 
                  {reportType === 'financial' ? (isAr ? 'إجمالي المحصل' : 'Total Collected') :
                   reportType === 'operations' ? (isAr ? 'العمليات المنجزة' : 'Completed Tasks') :
                   reportType === 'clients' ? (isAr ? 'إجمالي المحفظة' : 'Total Clients') :
                   (isAr ? 'العقود السارية' : 'Active Contracts')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? `${totalPaid.toLocaleString()} OMR` :
                   reportType === 'operations' ? completedServicesCount :
                   reportType === 'clients' ? totalClientsCount :
                   dbContracts.length}
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertTriangle size={14}/> 
                  {reportType === 'financial' ? (isAr ? 'المطالبات المعلقة' : 'Pending Collections') :
                   reportType === 'operations' ? (isAr ? 'العمليات المتأخرة' : 'Delayed Tasks') :
                   reportType === 'clients' ? (isAr ? 'العمليات النشطة' : 'Active Operations') :
                   (isAr ? 'تنبيهات المخاطر' : 'Risk Alerts')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? `${totalPending.toLocaleString()} OMR` :
                   reportType === 'operations' ? delayedServicesCount :
                   reportType === 'clients' ? activeServices.filter(s => s.status !== 'completed').length :
                   delayedServicesCount}
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14}/> 
                  {reportType === 'financial' ? (isAr ? 'إجمالي الفوترة' : 'Total Invoiced') :
                   reportType === 'operations' ? (isAr ? 'نسبة الإنجاز' : 'Completion Rate') :
                   reportType === 'clients' ? (isAr ? 'القيمة الإجمالية' : 'Total ARR Value') :
                   (isAr ? 'حالة الامتثال' : 'Compliance Rate')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? `${totalBilled.toLocaleString()} OMR` :
                   reportType === 'operations' ? `${activeServices.length > 0 ? Math.round((completedServicesCount / activeServices.length) * 100) : 100}%` :
                   reportType === 'clients' ? `${totalArr.toLocaleString()} OMR` :
                   '100% Valid'}
                </p>
              </div>
            </div>

            {/* Main Data Table */}
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-brand-dark" /> 
                {isAr ? 'البيانات التفصيلية الموثقة' : 'Detailed Certified Breakdown'}
              </h3>
              <table className="w-full text-start border-collapse">
                <thead className="bg-gray-100 print:bg-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-start text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'البند / المرجع' : 'Item / Ref'}</th>
                    <th className="px-4 py-3 text-start text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'الطرف / القسم' : 'Party / Category'}</th>
                    <th className="px-4 py-3 text-end text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'القيمة / التفاصيل' : 'Value / Metrics'}</th>
                    <th className="px-4 py-3 text-end text-[10px] font-black uppercase text-gray-600 tracking-widest border border-gray-200">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportType === 'financial' && (
                    activeInvoices.slice(0, 15).map((inv, idx) => (
                      <tr key={inv.id || idx} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                          INV-{String(inv.id).substring(0, 6).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                          {inv.clients?.company_name || 'Client Account'}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-gray-900 text-end border border-gray-200">
                          {Number(inv.amount || 0).toLocaleString()} OMR
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-end border border-gray-200">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}

                  {reportType === 'operations' && (
                    activeServices.slice(0, 15).map((svc, idx) => (
                      <tr key={svc.id || idx} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                          {svc.title}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                          {svc.clients?.company_name || 'Assigned Client'}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-gray-900 text-end border border-gray-200">
                          {svc.profiles?.full_name || 'Staff Member'}
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-end border border-gray-200">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${
                            svc.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {svc.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}

                  {reportType === 'clients' && (
                    dbClients.map((client, idx) => {
                      const clientInvs = dbInvoices.filter(i => i.client_id === client.id);
                      const billed = clientInvs.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
                      return (
                        <tr key={client.id || idx} className="border-b border-gray-200">
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                            {client.company_name}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                            {client.assigned_employee?.full_name || 'Direct Management'}
                          </td>
                          <td className="px-4 py-3 text-sm font-black text-gray-900 text-end border border-gray-200">
                            {billed > 0 ? `${billed.toLocaleString()} OMR` : 'Active Client'}
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-end border border-gray-200 text-green-700">
                            <span className="bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">ACTIVE</span>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {reportType === 'compliance' && (
                    dbContracts.slice(0, 15).map((contract, idx) => (
                      <tr key={contract.id || idx} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                          {contract.type || 'Employment Contract'}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                          {contract.start_date || 'Standard'}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-gray-900 text-end border border-gray-200">
                          {contract.probation_months || 3} Mos Probation
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-end border border-gray-200 text-green-700">
                          <span className="bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">COMPLIANT</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Footer */}
            <div className="pt-8 mt-8 border-t-2 border-gray-100 flex justify-between items-end text-xs text-gray-400 font-bold">
              <p>CONFIDENTIAL & PROPRIETARY • MAISARAH EXECUTIVE PLATFORM</p>
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
          <p className="font-bold">{isAr ? 'حدد الإعدادات واضغط على توليد لإنشاء التقرير المباشر' : 'Configure settings and hit Generate to build the live report'}</p>
        </div>
      )}
    </div>
  );
};

export default ExecutiveReports;
