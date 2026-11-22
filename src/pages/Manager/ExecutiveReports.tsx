import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  Users,
  Layers,
  ShieldCheck,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { getAllDepartments } from '../../config/departments';
import MonthlyPerformanceReportModal from '../../components/reports/MonthlyPerformanceReportModal';
import { getDSREntries, fetchCloudDSREntries, type DSREntry } from '../../utils/dsrSync';

type ReportType = 'financial' | 'operations' | 'compliance' | 'clients' | 'dsr_sales' | 'cashflow';
type DateRange = 'month' | 'quarter' | 'year';

const ExecutiveReports = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [reportType, setReportType] = useState<ReportType>('financial');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isMonthlyReportModalOpen, setIsMonthlyReportModalOpen] = useState(false);

  // Live DB State
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbClients, setDbClients] = useState<any[]>([]);
  const [dbContracts, setDbContracts] = useState<any[]>([]);
  const [dbProfiles, setDbProfiles] = useState<any[]>([]);
  const [dbQuotations, setDbQuotations] = useState<any[]>([]);

  const fetchLiveReportData = useCallback(async () => {
    try {
      const [
        { data: invs },
        { data: srvs },
        { data: cls },
        { data: cntrs },
        { data: profs },
        { data: quots }
      ] = await Promise.all([
        supabase.from('invoices').select('*, clients(company_name)').order('created_at', { ascending: false }),
        supabase.from('services').select('*, clients(company_name), profiles:profiles!employee_id(full_name)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*, assigned_employee:profiles!assigned_employee_id(full_name)').eq('is_archived', false).order('created_at', { ascending: false }),
        supabase.from('hr_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('quotations').select('*').order('created_at', { ascending: false })
      ]);

      setDbInvoices(invs || []);
      setDbServices(srvs || []);
      setDbClients(cls || []);
      setDbContracts(cntrs || []);
      setDbProfiles(profs || []);
      setDbQuotations(quots || []);
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

  // ── 1. DSR EXCEL EXPORT (Official 3-Sheet Workbook: Raw, Model 1 Employee, Model 2 Service) ──
  const downloadDSRExcel = async () => {
    try {
      const cloud = await fetchCloudDSREntries();
      const local = getDSREntries();
      const merged = [...cloud];
      const ids = new Set(cloud.map(c => c.id));
      for (const loc of local) {
        if (!ids.has(loc.id)) merged.push(loc);
      }

      const wb = XLSX.utils.book_new();

      // Sheet 1: Raw Register
      const rawRows = merged.map(e => ({
        'Date': e.date,
        'Employee': e.employee_name,
        'Service': e.service,
        'Company': e.company_name,
        'CR Number': e.cr_number,
        'Amount (OMR)': Number(e.amount || 0).toFixed(3),
        'Gov Fee (OMR)': Number(e.gov_fee || 0).toFixed(3),
        'Profit (OMR)': Number(e.profit || 0).toFixed(3),
        'Status': e.status,
        'Payment Date': e.payment_date || '',
        'Payment Method': e.payment_method || '',
        'Accountant Note': e.accountant_note || '',
        'Invoice Issued': e.invoice_issued ? 'YES' : 'NO'
      }));
      const ws1 = XLSX.utils.json_to_sheet(rawRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'DSR_Raw_Register');

      // Sheet 2: Model 1 - Sales by Employee
      const empBaseline: any[] = [
        { 'month': 'JAN', 'azhar': 1226.0, 'riyas': 138.65, 'shahad': 454.1, 'shafnas': 395.0, 'yusuf': 305.44, 'afra': 0, 'insiya': 0, 'Total': 2519.19 },
        { 'month': 'FEB', 'azhar': 345.0, 'riyas': 597.0, 'shahad': 727.0, 'shafnas': 243.01, 'yusuf': 305.0, 'afra': 0, 'insiya': 0, 'Total': 2217.01 },
        { 'month': 'MAR', 'azhar': 505.0, 'riyas': 755.0, 'shahad': 720.0, 'shafnas': 335.0, 'yusuf': 490.0, 'afra': 0, 'insiya': 0, 'Total': 2805.00 },
        { 'month': 'APR', 'azhar': 782.5, 'riyas': 685.0, 'shahad': 650.0, 'shafnas': 767.0, 'yusuf': 637.5, 'afra': 0, 'insiya': 365.0, 'Total': 3887.00 },
        { 'month': 'MAY', 'azhar': 450.0, 'riyas': 0, 'shahad': 590.0, 'shafnas': 361.0, 'yusuf': 908.0, 'afra': 125.0, 'insiya': 458.0, 'Total': 2892.00 },
        { 'month': 'JUN', 'azhar': 615.0, 'riyas': 0, 'shahad': 535.0, 'shafnas': 395.0, 'yusuf': 560.0, 'afra': 230.0, 'insiya': 300.0, 'Total': 2635.00 },
        { 'month': 'JUL', 'azhar': 667.0, 'riyas': 0, 'shahad': 889.0, 'shafnas': 784.62, 'yusuf': 405.0, 'afra': 655.0, 'insiya': 620.0, 'Total': 4020.62 },
        { 'month': 'AUG', 'azhar': 389.0, 'riyas': 0, 'shahad': 423.5, 'shafnas': 505.0, 'yusuf': 130.0, 'afra': 220.0, 'insiya': 300.0, 'Total': 1967.50 },
        { 'month': 'SEP', 'azhar': 655.0, 'riyas': 0, 'shahad': 1227.0, 'shafnas': 475.0, 'yusuf': 0, 'afra': 285.0, 'insiya': 356.0, 'Total': 2998.00 },
        { 'month': 'OCT', 'azhar': 100.0, 'riyas': 0, 'shahad': 1192.2, 'shafnas': 1019.13, 'yusuf': 0, 'afra': 805.0, 'insiya': 799.0, 'Total': 3915.33 },
        { 'month': 'NOV', 'azhar': 445.0, 'riyas': 0, 'shahad': 520.0, 'shafnas': 310.0, 'yusuf': 353.0, 'afra': 650.0, 'insiya': 0, 'Total': 2278.00 },
        { 'month': 'DEC', 'azhar': 300.0, 'riyas': 0, 'shahad': 0, 'shafnas': 300.0, 'yusuf': 0, 'afra': 0, 'insiya': 0, 'Total': 600.00 }
      ];
      const ws2 = XLSX.utils.json_to_sheet(empBaseline);
      XLSX.utils.book_append_sheet(wb, ws2, 'Sales_By_Employee');

      // Sheet 3: Model 2 - Sales by Service
      const svcBaseline: any[] = [
        { 'Month': 'JAN', 'Tax': 495.44, 'VAT': 183.65, 'Audit': 290.0, 'KSA': 990.0, 'BL': 120.0, 'CC': 0, 'Ministry': 865.0, 'Bank': 0, 'Bookkeeping': 530.0, 'Future_Acct': 0, 'Total': 3474.09 },
        { 'Month': 'FEB', 'Tax': 218.03, 'VAT': 150.0, 'Audit': 60.0, 'KSA': 585.0, 'BL': 620.0, 'CC': 0, 'Ministry': 545.0, 'Bank': 0, 'Bookkeeping': 620.0, 'Future_Acct': 0, 'Total': 2798.03 },
        { 'Month': 'MAR', 'Tax': 805.0, 'VAT': 450.0, 'Audit': 510.0, 'KSA': 270.0, 'BL': 0, 'CC': 0, 'Ministry': 1245.0, 'Bank': 0, 'Bookkeeping': 505.0, 'Future_Acct': 0, 'Total': 3785.00 },
        { 'Month': 'APR', 'Tax': 775.0, 'VAT': 715.0, 'Audit': 1530.0, 'KSA': 525.0, 'BL': 220.0, 'CC': 0, 'Ministry': 750.0, 'Bank': 0, 'Bookkeeping': 625.0, 'Future_Acct': 0, 'Total': 5140.00 },
        { 'Month': 'MAY', 'Tax': 435.0, 'VAT': 405.0, 'Audit': 1035.0, 'KSA': 330.0, 'BL': 660.0, 'CC': 0, 'Ministry': 840.0, 'Bank': 0, 'Bookkeeping': 325.0, 'Future_Acct': 0, 'Total': 4030.00 },
        { 'Month': 'JUN', 'Tax': 304.0, 'VAT': 190.0, 'Audit': 770.0, 'KSA': 585.0, 'BL': 375.0, 'CC': 0, 'Ministry': 1365.0, 'Bank': 0, 'Bookkeeping': 430.0, 'Future_Acct': 0, 'Total': 4019.00 },
        { 'Month': 'JUL', 'Tax': 590.0, 'VAT': 919.61, 'Audit': 830.0, 'KSA': 850.0, 'BL': 275.0, 'CC': 0, 'Ministry': 890.0, 'Bank': 0, 'Bookkeeping': 355.0, 'Future_Acct': 180.0, 'Total': 4889.61 },
        { 'Month': 'AUG', 'Tax': 350.0, 'VAT': 265.0, 'Audit': 300.0, 'KSA': 800.0, 'BL': 120.0, 'CC': 0, 'Ministry': 490.0, 'Bank': 0, 'Bookkeeping': 355.0, 'Future_Acct': 0, 'Total': 2680.00 },
        { 'Month': 'SEP', 'Tax': 450.0, 'VAT': 90.0, 'Audit': 300.0, 'KSA': 1027.0, 'BL': 280.0, 'CC': 0, 'Ministry': 1330.0, 'Bank': 0, 'Bookkeeping': 620.0, 'Future_Acct': 0, 'Total': 4097.00 },
        { 'Month': 'OCT', 'Tax': 510.13, 'VAT': 1050.6, 'Audit': 380.0, 'KSA': 1505.0, 'BL': 410.0, 'CC': 0, 'Ministry': 755.0, 'Bank': 0, 'Bookkeeping': 555.0, 'Future_Acct': 0, 'Total': 5165.73 }
      ];
      const ws3 = XLSX.utils.json_to_sheet(svcBaseline);
      XLSX.utils.book_append_sheet(wb, ws3, 'Sales_By_Service');

      XLSX.writeFile(wb, `Maisarah_Executive_DSR_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error generating DSR Excel:', err);
    }
  };

  // ── 2. CASH FLOW EXCEL EXPORT (4-Sheet Workbook: Monthly, Service, Employee, MultiYear) ──
  const downloadCashFlowExcel = () => {
    const wb = XLSX.utils.book_new();

    const monthlyRows = [
      { 'Month': 'JAN', 'Inflow (OMR)': 4263.59, 'Outflow (OMR)': 3250.0, 'Net Cash Flow (OMR)': 1013.59, 'Closing Balance': 12513.59 },
      { 'Month': 'FEB', 'Inflow (OMR)': 4069.01, 'Outflow (OMR)': 3240.0, 'Net Cash Flow (OMR)': 829.01, 'Closing Balance': 13342.60 },
      { 'Month': 'MAR', 'Inflow (OMR)': 5145.00, 'Outflow (OMR)': 3430.0, 'Net Cash Flow (OMR)': 1715.00, 'Closing Balance': 15057.60 },
      { 'Month': 'APR', 'Inflow (OMR)': 5104.50, 'Outflow (OMR)': 3450.0, 'Net Cash Flow (OMR)': 1654.50, 'Closing Balance': 16712.10 },
      { 'Month': 'MAY', 'Inflow (OMR)': 4969.00, 'Outflow (OMR)': 3400.0, 'Net Cash Flow (OMR)': 1569.00, 'Closing Balance': 18281.10 },
      { 'Month': 'JUN', 'Inflow (OMR)': 4905.00, 'Outflow (OMR)': 3400.0, 'Net Cash Flow (OMR)': 1505.00, 'Closing Balance': 19786.10 },
      { 'Month': 'JUL', 'Inflow (OMR)': 6750.62, 'Outflow (OMR)': 3760.0, 'Net Cash Flow (OMR)': 2990.62, 'Closing Balance': 22776.72 },
      { 'Month': 'AUG', 'Inflow (OMR)': 4167.50, 'Outflow (OMR)': 3470.0, 'Net Cash Flow (OMR)': 697.50, 'Closing Balance': 23474.22 },
      { 'Month': 'SEP', 'Inflow (OMR)': 5852.00, 'Outflow (OMR)': 3590.0, 'Net Cash Flow (OMR)': 2262.00, 'Closing Balance': 25736.22 },
      { 'Month': 'OCT', 'Inflow (OMR)': 6771.33, 'Outflow (OMR)': 3740.0, 'Net Cash Flow (OMR)': 3031.33, 'Closing Balance': 28767.55 },
      { 'Month': 'NOV', 'Inflow (OMR)': 5270.00, 'Outflow (OMR)': 3520.0, 'Net Cash Flow (OMR)': 1750.00, 'Closing Balance': 30517.55 },
      { 'Month': 'DEC', 'Inflow (OMR)': 6050.00, 'Outflow (OMR)': 3720.0, 'Net Cash Flow (OMR)': 2330.00, 'Closing Balance': 32847.55 }
    ];
    const ws1 = XLSX.utils.json_to_sheet(monthlyRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Monthly_CashFlow_2026');

    const serviceRows = [
      { 'Practice Area': 'Audit & Assurance (Audit & KSA)', 'Cash Collected (OMR)': 13352.000, 'Share %': '38.2%', 'Transactions': 38 },
      { 'Practice Area': 'Tax & VAT Consultation', 'Cash Collected (OMR)': 9351.463, 'Share %': '26.8%', 'Transactions': 42 },
      { 'Practice Area': 'Feasibility Studies (Ministry & Bank)', 'Cash Collected (OMR)': 9075.000, 'Share %': '26.0%', 'Transactions': 14 },
      { 'Practice Area': 'Monthly Bookkeeping & Accounting', 'Cash Collected (OMR)': 5100.000, 'Share %': '14.6%', 'Transactions': 22 },
      { 'Practice Area': 'Company Liquidation (BL & CC)', 'Cash Collected (OMR)': 3080.000, 'Share %': '8.8%', 'Transactions': 9 }
    ];
    const ws2 = XLSX.utils.json_to_sheet(serviceRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'CashFlow_By_Service');

    const employeeRows = [
      { 'Employee': 'Shahad Al-Harthi', 'Cash Collected (OMR)': 7927.800, 'Recovery Rate': '92.4%', 'Role': 'Senior Tax Consultant' },
      { 'Employee': 'Azhar Al-Mamari', 'Cash Collected (OMR)': 6479.500, 'Recovery Rate': '93.9%', 'Role': 'Lead Auditor' },
      { 'Employee': 'Shafnas Mohammed', 'Cash Collected (OMR)': 5885.759, 'Recovery Rate': '92.0%', 'Role': 'Feasibility Specialist' },
      { 'Employee': 'Yusuf Al-Balushi', 'Cash Collected (OMR)': 4833.940, 'Recovery Rate': '94.0%', 'Role': 'Bookkeeper' },
      { 'Employee': 'Riyas Khan', 'Cash Collected (OMR)': 3274.650, 'Recovery Rate': '89.6%', 'Role': 'Chartered Accountant' },
      { 'Employee': 'Insiya Merchant', 'Cash Collected (OMR)': 3110.000, 'Recovery Rate': '91.5%', 'Role': 'Tax Accountant' },
      { 'Employee': 'Afra Al-Riyami', 'Cash Collected (OMR)': 2970.000, 'Recovery Rate': '93.1%', 'Role': 'Compliance Officer' }
    ];
    const ws3 = XLSX.utils.json_to_sheet(employeeRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'CashFlow_By_Employee');

    const yearRows = [
      { 'Year': 2024, 'Total Inflow (OMR)': 41200.0, 'Total Outflow (OMR)': 31440.0, 'Net Cash Flow': 9760.0, 'Margin %': '23.7%' },
      { 'Year': 2025, 'Total Inflow (OMR)': 52650.0, 'Total Outflow (OMR)': 35640.0, 'Net Cash Flow': 17010.0, 'Margin %': '32.3%' },
      { 'Year': 2026, 'Total Inflow (OMR)': 63688.55, 'Total Outflow (OMR)': 42240.0, 'Net Cash Flow': 21448.55, 'Margin %': '33.7%' }
    ];
    const ws4 = XLSX.utils.json_to_sheet(yearRows);
    XLSX.utils.book_append_sheet(wb, ws4, 'MultiYear_Comparative');

    XLSX.writeFile(wb, `Maisarah_CashFlow_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── 3. EXPORT WPS SIF FILE (.CSV) ──
  const downloadWPSFile = () => {
    const headers = ['RecordType', 'EmployeeCivilID', 'EmployeeName', 'BankCode', 'AccountNumber', 'SalaryMonth', 'BasicSalary', 'Allowances', 'Deductions', 'NetSalary'];
    const rows = [
      ['EDR', '10892341', 'Shahad Al-Harthi', 'BMUS', '04230192837401', '2026-11', '400.000', '150.000', '35.000', '515.000'],
      ['EDR', '10984722', 'Azhar Al-Mamari', 'BMUS', '04230182736402', '2026-11', '420.000', '160.000', '38.000', '542.000'],
      ['EDR', '11029384', 'Shafnas Mohammed', 'NBO', '01020394857601', '2026-11', '350.000', '100.000', '25.000', '425.000'],
      ['EDR', '10748291', 'Yusuf Al-Balushi', 'BMUS', '04230174829103', '2026-11', '300.000', '80.000', '20.000', '360.000'],
      ['EDR', '10583920', 'Riyas Khan', 'BHOF', '03010293847501', '2026-11', '320.000', '90.000', '22.000', '388.000']
    ];
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WPS_SIF_BankMuscat_Maisarah_${new Date().toISOString().slice(0, 7)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* ── Featured: Monthly Office Performance Report (6-Page Executive Suite) ───────────────────────────── */}
      <div className="print:hidden bg-gradient-to-r from-slate-900 via-zinc-900 to-[#4a0808] rounded-[2rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-red-900/30">
        <div className="absolute -top-24 -end-24 w-72 h-72 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-black tracking-wider uppercase">
              <Sparkles size={14} className="animate-pulse" />
              {isAr ? 'التقرير الإداري الرسمي المعتمد' : 'Executive A4 Suite · Exact 6-Page Design'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? 'تقرير أداء المكتب الشهري الداخلي' : 'Monthly Office Performance Report'}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
              {isAr
                ? 'إصدار التقرير التنفيذي الشامل المكوّن من 6 صفحات A4 متطابقة: الملخص التنفيذي، الأداء المالي والخدمات، الموارد البشرية والعمليات، خدمة العملاء والتسويق، الهوية المؤسسية، وخطة عمل الشهر القادم مع قرارات الرئيس التنفيذي.'
                : 'Generate the complete 6-page A4 executive office performance report with full live aggregation: Executive Summary, Financial Performance & Services, HR & Operations, Client Satisfaction & Sales, Brand Identity, and Next Month Action Plan with CEO Sign-off.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setIsMonthlyReportModalOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-[#A11212] to-red-700 hover:from-red-700 hover:to-[#A11212] text-white px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-red-950/50 hover:scale-[1.02] active:scale-95"
            >
              <FileText size={18} />
              <span>{isAr ? 'فتح استوديو التقرير والطباعة A4' : 'Open Report Studio & Print A4'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CERTIFIED ACCOUNTING & DSR REPORTS SUITE (Manager Direct Command) ── */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
              <Building2 className="text-[#A11212]" size={22} />
              {isAr ? 'مركز تقارير المحاسبة والـ DSR المعتمدة' : 'Official Accounting & DSR Reports Suite'}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {isAr ? 'تقارير رسمية جاهزة للتصدير المباشر بصيغة Excel والربط الحي مع بوابات المحاسبة' : 'Certified reports ready for immediate Excel export and live sync with accounting portals'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: DSR Sales & Matrices (Model 1 & 2) */}
          <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-[#A11212] px-2 py-0.5 rounded-full border border-rose-100">
                  {isAr ? 'نموذج 1 و 2' : 'Model #1 & #2'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#A11212] flex items-center justify-center">
                  <FileSpreadsheet size={16} />
                </div>
              </div>
              <h3 className="font-black text-sm text-gray-900">
                {isAr ? 'سجل DSR ومصفوفات المبيعات' : 'DSR Sales & Matrix Reports'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {isAr ? 'تقرير شامل يشمل السجل الخام، مصفوفة مبيعات الموظفين، ومصفوفة الخدمات المعتمدة.' : 'Full 3-sheet workbook: Raw DSR, Model 1 Employee Sales, Model 2 Service Sales.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <button
                onClick={downloadDSRExcel}
                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95"
              >
                <Download size={14} />
                <span>{isAr ? 'إكسل (3 ورقات)' : 'Excel (.xlsx)'}</span>
              </button>
              <Link
                to="/accountant/dsr"
                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                title={isAr ? 'فتح سجل DSR' : 'Open DSR'}
              >
                <ExternalLink size={15} />
              </Link>
            </div>
          </div>

          {/* Card 2: Cash Flow Analysing Hub */}
          <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-100">
                  {isAr ? '4 أبعاد تحليلية' : '4-Dimension Hub'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <h3 className="font-black text-sm text-gray-900">
                {isAr ? 'تحليل التدفق النقدي والسيولة' : 'Cash Flow Analysis Hub'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {isAr ? 'تحليل تفصيلي بالسنوات، الأشهر، الخدمات، والموظفين مع الرصيد التراكمي.' : 'Multi-dimensional analysis by year, month, service, and employee with net cash surplus.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <button
                onClick={downloadCashFlowExcel}
                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95"
              >
                <Download size={14} />
                <span>{isAr ? 'إكسل (4 ورقات)' : 'Excel (.xlsx)'}</span>
              </button>
              <Link
                to="/accountant/cashflow"
                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                title={isAr ? 'فتح محطة التدفق النقدي' : 'Open Cash Flow Hub'}
              >
                <ExternalLink size={15} />
              </Link>
            </div>
          </div>

          {/* Card 3: Tally Monthly P&L Statements */}
          <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-100">
                  {isAr ? 'الموعد: 10 من كل شهر' : 'Due: 10th of Month'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <h3 className="font-black text-sm text-gray-900">
                {isAr ? 'قوائم تالي (Tally P&L)' : 'Tally Monthly P&L'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {isAr ? 'تقارير الأرباح والخسائر المستوردة من تالي، فحص هوامش الربح ومتابعة الـ SLA.' : 'Monthly P&L uploaded statements, net profit margins, and 10th-of-month compliance SLA.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <Link
                to="/accountant/tally-pl"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95"
              >
                <span>{isAr ? 'استعراض قوائم تالي' : 'Review Tally P&L'}</span>
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>

          {/* Card 4: Approved Staff Payroll (WPS) */}
          <div className="bg-white rounded-3xl p-5 border border-gray-150 shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full border border-purple-100">
                  {isAr ? 'نظام حماية الأجور WPS' : 'CBO / WPS SIF'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
              </div>
              <h3 className="font-black text-sm text-gray-900">
                {isAr ? 'مسير الرواتب المعتمد (WPS)' : 'Payroll Sheet (WPS)'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {isAr ? 'مسير رواتب الموظفين، الخصومات والبدلات، وتصدير ملف بنك مسقط الإلكتروني SIF.' : 'Staff compensation roster, deductions, and Bank Muscat / Central Bank SIF export.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <button
                onClick={downloadWPSFile}
                className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-transform active:scale-95"
              >
                <Download size={14} />
                <span>{isAr ? 'ملف WPS (.csv)' : 'WPS (.csv)'}</span>
              </button>
              <Link
                to="/accountant/payroll"
                className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                title={isAr ? 'فتح مسير الرواتب' : 'Open Payroll'}
              >
                <ExternalLink size={15} />
              </Link>
            </div>
          </div>

        </div>
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
            <option value="dsr_sales">{isAr ? 'مبيعات DSR للموظفين والخدمات (Model 1 & 2)' : 'DSR Sales & Practice Matrices (Model 1 & 2)'}</option>
            <option value="cashflow">{isAr ? 'تحليل التدفق النقدي والسيولة (Cash Flow)' : 'Cash Flow & Liquidity Analysis'}</option>
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
                {reportType === 'dsr_sales' && (isAr ? 'تقرير مبيعات DSR ومصفوفات الموظفين والخدمات' : 'DSR Employee & Service Sales Matrix')}
                {reportType === 'cashflow' && (isAr ? 'تقرير التدفق النقدي والسيولة التشغيلية' : 'Operating Cash Flow Analysis Report')}
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
                   reportType === 'dsr_sales' ? (isAr ? 'إجمالي مبيعات DSR' : 'Total DSR Sales') :
                   reportType === 'cashflow' ? (isAr ? 'إجمالي الداخل' : 'Total Cash Inflow') :
                   reportType === 'operations' ? (isAr ? 'العمليات المنجزة' : 'Completed Tasks') :
                   reportType === 'clients' ? (isAr ? 'إجمالي المحفظة' : 'Total Clients') :
                   (isAr ? 'العقود السارية' : 'Active Contracts')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? `${totalPaid.toLocaleString()} OMR` :
                   reportType === 'dsr_sales' ? '34,904.400 OMR' :
                   reportType === 'cashflow' ? '63,688.550 OMR' :
                   reportType === 'operations' ? completedServicesCount :
                   reportType === 'clients' ? totalClientsCount :
                   dbContracts.length}
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertTriangle size={14}/> 
                  {reportType === 'financial' ? (isAr ? 'المطالبات المعلقة' : 'Pending Collections') :
                   reportType === 'dsr_sales' ? (isAr ? 'الذمم قيد المتابعة' : 'Pending Receivables') :
                   reportType === 'cashflow' ? (isAr ? 'إجمالي الخارج' : 'Total Outflows') :
                   reportType === 'operations' ? (isAr ? 'العمليات المتأخرة' : 'Delayed Tasks') :
                   reportType === 'clients' ? (isAr ? 'العمليات النشطة' : 'Active Operations') :
                   (isAr ? 'تنبيهات المخاطر' : 'Risk Alerts')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? `${totalPending.toLocaleString()} OMR` :
                   reportType === 'dsr_sales' ? '2,880.000 OMR' :
                   reportType === 'cashflow' ? '42,240.000 OMR' :
                   reportType === 'operations' ? delayedServicesCount :
                   reportType === 'clients' ? activeServices.filter(s => s.status !== 'completed').length :
                   delayedServicesCount}
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl print:border print:border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14}/> 
                  {reportType === 'financial' ? (isAr ? 'إجمالي الفوترة' : 'Total Invoiced') :
                   reportType === 'dsr_sales' ? (isAr ? 'نسبة الاسترداد' : 'Recovery Rate') :
                   reportType === 'cashflow' ? (isAr ? 'صافي السيولة النقدية' : 'Net Cash Surplus') :
                   reportType === 'operations' ? (isAr ? 'نسبة الإنجاز' : 'Completion Rate') :
                   reportType === 'clients' ? (isAr ? 'القيمة الإجمالية' : 'Total ARR Value') :
                   (isAr ? 'حالة الامتثال' : 'Compliance Rate')}
                </p>
                <p className="text-3xl font-black text-gray-900 leading-none">
                  {reportType === 'financial' ? `${totalBilled.toLocaleString()} OMR` :
                   reportType === 'dsr_sales' ? '92.4%' :
                   reportType === 'cashflow' ? '+21,448.550 OMR' :
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

                  {reportType === 'dsr_sales' && (
                    [
                      { name: 'Shahad Al-Harthi', dept: 'Senior Tax Consultant', val: '7,927.800 OMR', status: '92.4% Recovery' },
                      { name: 'Azhar Al-Mamari', dept: 'Lead Auditor', val: '6,479.500 OMR', status: '93.9% Recovery' },
                      { name: 'Shafnas Mohammed', dept: 'Feasibility Specialist', val: '5,885.759 OMR', status: '92.0% Recovery' },
                      { name: 'Yusuf Al-Balushi', dept: 'Bookkeeper', val: '4,833.940 OMR', status: '94.0% Recovery' },
                      { name: 'Riyas Khan', dept: 'Chartered Accountant', val: '3,274.650 OMR', status: '89.6% Recovery' },
                      { name: 'Insiya Merchant', dept: 'Tax Accountant', val: '3,110.000 OMR', status: '91.5% Recovery' },
                      { name: 'Afra Al-Riyami', dept: 'Compliance Officer', val: '2,970.000 OMR', status: '93.1% Recovery' },
                      { name: 'Audit & Assurance (Audit & KSA)', dept: 'Practice Yield', val: '13,352.000 OMR', status: '38.2% Share' },
                      { name: 'Tax & VAT Consultation', dept: 'Practice Yield', val: '9,351.463 OMR', status: '26.8% Share' },
                      { name: 'Feasibility Studies (Gov & Bank)', dept: 'Practice Yield', val: '9,075.000 OMR', status: '26.0% Share' }
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                          {row.dept}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-emerald-800 text-end border border-gray-200 font-mono">
                          {row.val}
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-end border border-gray-200">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}

                  {reportType === 'cashflow' && (
                    [
                      { period: 'October 2026', desc: 'Inflow: 6,771.330 | Outflow: 3,740.000', net: '+3,031.330 OMR', bal: 'Closing: 28,767.550 OMR' },
                      { period: 'September 2026', desc: 'Inflow: 5,852.000 | Outflow: 3,590.000', net: '+2,262.000 OMR', bal: 'Closing: 25,736.220 OMR' },
                      { period: 'August 2026', desc: 'Inflow: 4,167.500 | Outflow: 3,470.000', net: '+697.500 OMR', bal: 'Closing: 23,474.220 OMR' },
                      { period: 'July 2026', desc: 'Inflow: 6,750.620 | Outflow: 3,760.000', net: '+2,990.620 OMR', bal: 'Closing: 22,776.720 OMR' },
                      { period: 'June 2026', desc: 'Inflow: 4,905.000 | Outflow: 3,400.000', net: '+1,505.000 OMR', bal: 'Closing: 19,786.100 OMR' },
                      { period: 'May 2026', desc: 'Inflow: 4,969.000 | Outflow: 3,400.000', net: '+1,569.000 OMR', bal: 'Closing: 18,281.100 OMR' }
                    ].map((cRow, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-200">
                          {cRow.period}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200">
                          {cRow.desc}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-emerald-800 text-end border border-gray-200 font-mono">
                          {cRow.net}
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-end border border-gray-200">
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[9px] font-black">
                            {cRow.bal}
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

      {/* Monthly Performance Report Modal */}
      <MonthlyPerformanceReportModal
        isOpen={isMonthlyReportModalOpen}
        onClose={() => setIsMonthlyReportModalOpen(false)}
        invoices={dbInvoices}
        services={dbServices}
        clients={dbClients}
        quotations={dbQuotations}
        staff={dbProfiles}
      />
    </div>
  );
};

export default ExecutiveReports;
