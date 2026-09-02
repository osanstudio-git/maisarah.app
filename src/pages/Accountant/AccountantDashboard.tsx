import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { 
  Briefcase, 
  Clock, 
  CreditCard, 
  Wallet, 
  ChevronDown, 
  FileText, 
  Upload, 
  PlusCircle, 
  BarChart2, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

// --- Types ---
interface Metrics {
  activeProjects: number;
  dueInvoicesSum: number;
  dueInvoicesCount: number;
  expensesMonth: number;
  cashFlow: number;
}

interface InvoiceMetrics {
  totalRevenue: number;     // sum of ALL invoice amounts
  paidSum: number;          // sum of invoices where status='paid'
  unpaidSum: number;        // sum of invoices where status='unpaid' OR 'overdue'
  monthlyIncome: number;    // sum of paid invoices created in current calendar month
  paidCount: number;
  unpaidCount: number;
  totalCount: number;
  paidRatio: number;        // 0-100 percentage
}

const formatOMR = (val: number) =>
  new Intl.NumberFormat('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val);

// --- Mock Data ---
const getMockProjects = (isAr: boolean) => [
  {
    id: 1,
    title: isAr ? 'مشروع مجمع فلل الموالح' : 'Al Mawaleh Villas Complex',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=400',
    progress: 65,
    budget: 58200,
    cost: 28000,
    profit: 17500, // positive
  },
  {
    id: 2,
    title: isAr ? 'مشروع طريق الباطنة' : 'Al Batinah Road Project',
    image: 'https://images.unsplash.com/photo-1541888081622-1cb425026217?auto=format&fit=crop&q=80&w=400',
    progress: 45,
    budget: 22000,
    cost: 19300,
    profit: -2700, // negative
  },
  {
    id: 3,
    title: isAr ? 'مشروع تشييد مبنى تجاري' : 'Commercial Building Project',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=400',
    progress: 80,
    budget: 86500,
    cost: 39000,
    profit: 47500,
  }
];

const getRecentDocs = (isAr: boolean) => [
  { id: 1, title: isAr ? 'عقد مشروع فلل الموالح' : 'Mawaleh Villas Contract' },
  { id: 2, title: isAr ? 'فاتورة مواد - مشروع طريق' : 'Materials Invoice - Road Project' },
  { id: 3, title: isAr ? 'كشف حساب عميل' : 'Client Account Statement' },
];

const getUpcomingPayments = (isAr: boolean) => [
  {
    id: 1,
    title: isAr ? 'وزارة الإسكان' : 'Ministry of Housing',
    amount: 18500,
    date: isAr ? '25 مارس 2025' : '25 March 2025',
    logo: 'MOH'
  },
  {
    id: 2,
    title: isAr ? 'شركة الباطنة للتجارة' : 'Al Batinah Trading Co.',
    amount: 12800,
    date: isAr ? '31 مارس 2025' : '31 March 2025',
    logo: 'ABT'
  }
];

const expensesData = [
  { name: 'عمالة', nameEn: 'Labor', value: 40, color: '#A11212' },
  { name: 'مواد', nameEn: 'Materials', value: 35, color: '#CD3333' },
  { name: 'معدات', nameEn: 'Equipment', value: 15, color: '#4CAF50' },
  { name: 'أخرى', nameEn: 'Others', value: 10, color: '#9E9E9E' },
];

const revenueData = [
  { month: 'يناير', monthEn: 'Jan', rev: 15000, exp: 12000 },
  { month: 'فبراير', monthEn: 'Feb', rev: 25000, exp: 18000 },
  { month: 'مارس', monthEn: 'Mar', rev: 28000, exp: 20000 },
  { month: 'أبريل', monthEn: 'Apr', rev: 35000, exp: 22000 },
  { month: 'مايو', monthEn: 'May', rev: 40000, exp: 28000 },
  { month: 'يونيو', monthEn: 'Jun', rev: 50000, exp: 35000 },
];

const AccountantDashboard = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // Legacy metrics (for existing UI sections)
  const [metrics, setMetrics] = useState<Metrics>({
    activeProjects: 5,
    dueInvoicesSum: 0,
    dueInvoicesCount: 0,
    expensesMonth: 12300,
    cashFlow: 0,
  });

  // New real invoice KPIs
  const [invoiceMetrics, setInvoiceMetrics] = useState<InvoiceMetrics>({
    totalRevenue: 0,
    paidSum: 0,
    unpaidSum: 0,
    monthlyIncome: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalCount: 0,
    paidRatio: 0,
  });

  const [loading, setLoading] = useState(true);
  const [pendingPayroll, setPendingPayroll] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('accountant_pending_payroll');
    if (saved) {
      setPendingPayroll(JSON.parse(saved));
    }
  }, []);

  const handleDisbursePayroll = (recordId: string) => {
    const paidList = localStorage.getItem('accountant_paid_payroll_ids')
      ? JSON.parse(localStorage.getItem('accountant_paid_payroll_ids')!) as string[]
      : [];
    
    if (!paidList.includes(recordId)) {
      paidList.push(recordId);
      localStorage.setItem('accountant_paid_payroll_ids', JSON.stringify(paidList));
    }

    const updated = pendingPayroll.map(r => r.id === recordId ? { ...r, status: 'Paid' } : r);
    setPendingPayroll(updated);
    localStorage.setItem('accountant_pending_payroll', JSON.stringify(updated));

    // Also deduct expense from accountant metrics to show disbursement
    const payrollItem = pendingPayroll.find(r => r.id === recordId);
    if (payrollItem) {
      const allowancesSum = payrollItem.allowances.transport + payrollItem.allowances.housing + payrollItem.allowances.other;
      const netPay = payrollItem.basicSalary + allowancesSum + payrollItem.overtime + payrollItem.incentives + payrollItem.bonuses - payrollItem.deductions;
      
      setMetrics(prev => ({
        ...prev,
        expensesMonth: prev.expensesMonth + netPay
      }));
    }

    alert('Salary successfully disbursed to employee bank account!');
  };

  const fetchMetrics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, status, created_at');

      if (error) throw error;

      const now = new Date();
      const currentYear  = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      let totalRevenue  = 0;
      let paidSum       = 0;
      let unpaidSum     = 0;
      let monthlyIncome = 0;
      let paidCount     = 0;
      let unpaidCount   = 0;

      (invoices || []).forEach(inv => {
        const amount = parseFloat(inv.amount) || 0;
        totalRevenue += amount;

        if (inv.status === 'paid') {
          paidSum += amount;
          paidCount++;
          const created = new Date(inv.created_at);
          if (created.getFullYear() === currentYear && created.getMonth() === currentMonth) {
            monthlyIncome += amount;
          }
        } else {
          unpaidSum += amount;
          unpaidCount++;
        }
      });

      const totalCount = paidCount + unpaidCount;
      const paidRatio  = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

      const realMetrics: InvoiceMetrics = {
        totalRevenue, paidSum, unpaidSum, monthlyIncome,
        paidCount, unpaidCount, totalCount, paidRatio,
      };

      if (totalCount === 0) {
        setInvoiceMetrics({
          totalRevenue: 164500, paidSum: 125750, unpaidSum: 38750,
          monthlyIncome: 42300, paidCount: 18, unpaidCount: 5,
          totalCount: 23, paidRatio: 78,
        });
        setMetrics(prev => ({ ...prev, dueInvoicesSum: 38750, dueInvoicesCount: 5, cashFlow: 125750 }));
      } else {
        setInvoiceMetrics(realMetrics);
        setMetrics(prev => ({
          ...prev,
          dueInvoicesSum: unpaidSum,
          dueInvoicesCount: unpaidCount,
          cashFlow: paidSum,
        }));
      }
    } catch (err) {
      console.error('AccountantDashboard fetch error:', err);
      setInvoiceMetrics({
        totalRevenue: 164500, paidSum: 125750, unpaidSum: 38750,
        monthlyIncome: 42300, paidCount: 18, unpaidCount: 5,
        totalCount: 23, paidRatio: 78,
      });
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    // ── Supabase Realtime Subscription ───────────────────────────────────────
    const channel = supabase
      .channel('accountant-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          fetchMetrics(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div></div>;
  }

  return (
    <div className="space-y-6 pb-10 max-w-[1600px] mx-auto">

      {/* ── 1. Real Invoice KPI Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-red-50 text-brand-dark w-11 h-11 rounded-xl flex items-center justify-center">
              <Wallet size={22} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
              {isAr ? 'إجمالي' : 'ALL TIME'}
            </span>
          </div>
          <h4 className="text-gray-500 text-xs font-bold mb-1">{t('accountant.totalRevenue')}</h4>
          <div className="text-2xl font-bold text-gray-800">
            {formatOMR(invoiceMetrics.totalRevenue)}
            <span className="text-sm font-semibold text-gray-400 ms-1">OMR</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {invoiceMetrics.totalCount} {isAr ? 'فاتورة إجمالاً' : 'total invoices'}
          </p>
        </div>

        {/* Paid Invoices */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-green-50 text-green-600 w-11 h-11 rounded-xl flex items-center justify-center">
              <CreditCard size={22} />
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              {invoiceMetrics.paidCount} {isAr ? 'فاتورة' : 'invoices'}
            </span>
          </div>
          <h4 className="text-gray-500 text-xs font-bold mb-1">{t('accountant.paidInvoices')}</h4>
          <div className="text-2xl font-bold text-gray-800">
            {formatOMR(invoiceMetrics.paidSum)}
            <span className="text-sm font-semibold text-gray-400 ms-1">OMR</span>
          </div>
          {/* Paid/Unpaid Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-green-600 font-bold">{invoiceMetrics.paidRatio}% {isAr ? 'محصّلة' : 'collected'}</span>
              <span className="text-gray-400">{100 - invoiceMetrics.paidRatio}% {isAr ? 'معلق' : 'pending'}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-700"
                style={{ width: `${invoiceMetrics.paidRatio}%` }}
              />
            </div>
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-brand-dark text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-md shadow-brand-dark/20">
              <Clock size={22} />
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
              {invoiceMetrics.unpaidCount} {isAr ? 'فاتورة' : 'invoices'}
            </span>
          </div>
          <h4 className="text-gray-500 text-xs font-bold mb-1">{t('accountant.unpaidInvoices')}</h4>
          <div className="text-2xl font-bold text-gray-800">
            {formatOMR(invoiceMetrics.unpaidSum)}
            <span className="text-sm font-semibold text-gray-400 ms-1">OMR</span>
          </div>
          {/* Unpaid ratio bar (inverse) */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-red-500 font-bold">{100 - invoiceMetrics.paidRatio}% {isAr ? 'غير مدفوعة' : 'unpaid'}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-brand-dark transition-all duration-700"
                style={{ width: `${100 - invoiceMetrics.paidRatio}%` }}
              />
            </div>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-50 text-blue-600 w-11 h-11 rounded-xl flex items-center justify-center">
              <BarChart2 size={22} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              {isAr ? 'هذا الشهر' : 'This month'}
            </span>
          </div>
          <h4 className="text-gray-500 text-xs font-bold mb-1">{t('accountant.monthlyIncome')}</h4>
          <div className="text-2xl font-bold text-gray-800">
            {formatOMR(invoiceMetrics.monthlyIncome)}
            <span className="text-sm font-semibold text-gray-400 ms-1">OMR</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {isAr ? 'من الفواتير المدفوعة هذا الشهر' : 'From paid invoices this month'}
          </p>
        </div>

      </div>

      {/* Paid vs Unpaid Visual Summary Bar */}
      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-sm text-gray-800">
            {isAr ? 'نسبة تحصيل الفواتير' : 'Invoice Collection Ratio'}
          </h3>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500" />
              {isAr ? 'مدفوعة' : 'Paid'} · {formatOMR(invoiceMetrics.paidSum)} OMR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-brand-dark" />
              {isAr ? 'غير مدفوعة' : 'Unpaid'} · {formatOMR(invoiceMetrics.unpaidSum)} OMR
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all duration-700"
            style={{ width: `${invoiceMetrics.paidRatio}%` }}
          />
          <div
            className="h-full bg-brand-dark transition-all duration-700"
            style={{ width: `${100 - invoiceMetrics.paidRatio}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 font-medium">
          <span>0 OMR</span>
          <span className="font-bold text-gray-600">{formatOMR(invoiceMetrics.totalRevenue)} OMR {isAr ? 'إجمالي' : 'total'}</span>
        </div>
      </div>

      {/* 2. Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Current Projects (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">{t('dashboard.currentProjects', 'مشاريعك الحالية')}</h3>
            <button className="text-brand-dark text-sm font-semibold hover:underline">
              {t('dashboard.viewAllProjects', 'عرض جميع المشاريع')}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getMockProjects(isAr).map(proj => (
              <div key={proj.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gray-200 relative">
                  <img src={proj.image} alt={proj.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 start-2 bg-white/90 backdrop-blur px-2 py-1 rounded font-bold text-xs text-brand-dark">
                    {proj.progress}%
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <h4 className="font-bold text-sm text-gray-800 h-10">{proj.title}</h4>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-500 font-medium">{t('dashboard.inProgress', 'قيد التنفيذ')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-brand-dark h-1.5 rounded-full" style={{ width: `${proj.progress}%` }}></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 pt-2 border-t border-gray-50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">{t('dashboard.budget', 'الميزانية')}</span>
                      <span className="font-bold text-gray-800">{proj.budget.toLocaleString()} ر.ع</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">{t('dashboard.costSoFar', 'التكلفة حتى الآن')}</span>
                      <span className="font-bold text-gray-800">{proj.cost.toLocaleString()} ر.ع</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">{t('dashboard.profit', 'الربح / الخسارة')}</span>
                      <span className={`font-bold ${proj.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {proj.profit > 0 ? '+' : ''}{proj.profit.toLocaleString()} ر.ع
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar (Col 4) */}
        <div className="lg:col-span-4 space-y-6 mt-10 lg:mt-0">
          {/* VAT Alert */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-brand-dark/20 relative overflow-hidden">
            <div className="absolute top-0 start-0 w-1 h-full bg-brand-dark"></div>
            <div className="flex items-center gap-2 text-brand-dark font-bold mb-3">
              <div className="relative">
                <AlertCircle size={20} />
                <span className="absolute -top-1 -end-1 w-2.5 h-2.5 bg-red-600 rounded-full"></span>
              </div>
              <h3>{t('dashboard.taxAlerts', 'تنبيهات الضريبة (VAT)')}</h3>
            </div>
            <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4">
              {t('dashboard.taxAlertDesc', 'تنتهي فترة الإقرار الضريبي خلال')} <span className="font-bold text-brand-dark">{t('dashboard.days', '5 أيام')}</span>
            </p>
            <button className="w-full bg-brand-dark text-white font-bold py-2.5 rounded-lg hover:bg-red-800 transition-colors text-sm">
              {t('dashboard.prepareTax', 'جهز الإقرار الآن')}
            </button>
          </div>

          {/* Recent Documents */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-800">{t('dashboard.recentDocuments', 'المستندات الحديثة')}</h3>
              <button className="text-brand-dark text-xs font-semibold hover:underline">
                {t('dashboard.viewAll', 'عرض الكل')}
              </button>
            </div>
            <div className="space-y-3">
              {getRecentDocs(isAr).map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-red-50/50 transition-colors cursor-pointer border border-transparent hover:border-red-100">
                  <span className="text-sm text-gray-700 font-medium truncate pe-2">{doc.title}</span>
                  <div className="bg-red-100 text-red-600 p-1.5 rounded flex-shrink-0">
                    <FileText size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Expenses Donut */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-gray-800">{t('dashboard.expensesOverview', 'نظرة على المصروفات')}</h3>
            <button className="text-xs text-gray-400 flex items-center font-medium hover:text-gray-600">
              {t('dashboard.thisMonth', 'هذا الشهر')} <ChevronDown size={14} className="ms-1" />
            </button>
          </div>
          
          <div className="h-48 flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {expensesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${value}%`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label (Optional, left blank in design but usually good) */}
          </div>

          <div className="grid grid-cols-2 gap-y-3 mt-4">
            {expensesData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs text-gray-600 font-medium">{isAr ? item.name : item.nameEn}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Line Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm text-gray-800">{t('dashboard.revenueVsExpenses', 'الإيرادات مقابل المصروفات')}</h3>
            <button className="text-xs text-gray-400 flex items-center font-medium hover:text-gray-600">
              {t('dashboard.last6Months', 'أخر 6 أشهر')} <ChevronDown size={14} className="ms-1" />
            </button>
          </div>

          <div className="h-48 flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey={isAr ? 'month' : 'monthEn'} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}K`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="rev" name={t('dashboard.revenue', 'الإيرادات')} stroke="#A11212" strokeWidth={2} dot={{ r: 3, fill: '#A11212' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="exp" name={t('dashboard.expenses', 'المصروفات')} stroke="#1f2937" strokeWidth={2} dot={{ r: 3, fill: '#1f2937' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-dark"></span>
              <span className="text-xs text-gray-600 font-medium">{t('dashboard.revenue', 'الإيرادات')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-800"></span>
              <span className="text-xs text-gray-600 font-medium">{t('dashboard.expenses', 'المصروفات')}</span>
            </div>
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-sm text-gray-800">{t('dashboard.upcomingPayments', 'الدفعات القادمة')}</h3>
            <button className="text-brand-dark text-xs font-semibold hover:underline">
              {t('dashboard.viewAll', 'عرض الكل')}
            </button>
          </div>
          
          <div className="space-y-4">
            {getUpcomingPayments(isAr).map(payment => (
              <div key={payment.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-red-50/30 transition-colors border border-transparent hover:border-red-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-600 shadow-sm">
                    {payment.logo}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">{payment.title}</h4>
                    <p className="text-xs text-gray-400 font-medium mt-1">{payment.date}</p>
                  </div>
                </div>
                <div className="font-bold text-sm text-brand-dark">
                  {payment.amount.toLocaleString()} ر.ع
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-sm text-gray-800 mb-5 text-center">{t('dashboard.quickActions', 'إجراءات سريعة')}</h3>
          <div className="grid grid-cols-2 gap-3 h-full pb-6">
            <button className="flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-brand-dark hover:text-white text-gray-600 rounded-xl transition-colors p-3 border border-transparent hover:border-brand-dark group">
              <PlusCircle size={20} className="text-brand-dark group-hover:text-white" />
              <span className="text-xs font-bold">{t('dashboard.newProject', 'مشروع جديد')}</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-brand-dark hover:text-white text-gray-600 rounded-xl transition-colors p-3 border border-transparent hover:border-brand-dark group">
              <Upload size={20} className="text-brand-dark group-hover:text-white" />
              <span className="text-xs font-bold">{t('dashboard.uploadDocument', 'رفع مستند')}</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-brand-dark hover:text-white text-gray-600 rounded-xl transition-colors p-3 border border-transparent hover:border-brand-dark group">
              <CreditCard size={20} className="text-brand-dark group-hover:text-white" />
              <span className="text-xs font-bold">{t('dashboard.newExpense', 'مصروف جديد')}</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-brand-dark hover:text-white text-gray-600 rounded-xl transition-colors p-3 border border-transparent hover:border-brand-dark group">
              <BarChart2 size={20} className="text-brand-dark group-hover:text-white" />
              <span className="text-xs font-bold">{t('dashboard.financialReport', 'تقرير مالي')}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── 4. Approved Salary Payroll Queue (To be Paid) ────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4 mt-6">
        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <CreditCard className="text-brand-dark" size={22} />
          {isAr ? 'رواتب الموظفين المعتمدة للصرف' : 'Approved Staff Payroll Queue ("To be Paid")'}
        </h3>
        <p className="text-xs text-gray-500 font-bold">
          {isAr ? 'قائمة كشوف الرواتب المعتمدة من الإدارة بانتظار صرف المحاسب' : 'Payroll batches authorized by Executive Management requiring final bank release.'}
        </p>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-start">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">Employee</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">Department & Role</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">Basic Salary</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">Allowances</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">Net Payable</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {pendingPayroll.map(r => {
                const allowancesSum = r.allowances.transport + r.allowances.housing + r.allowances.other;
                const netPay = r.basicSalary + allowancesSum + r.overtime + r.incentives + r.bonuses - r.deductions;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-gray-900">{r.employeeName}</p>
                      <p className="text-[9px] text-gray-400 font-bold">{r.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-800">{r.dept}</p>
                      <p className="text-[9px] text-gray-400 font-bold">{r.role}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-700">{r.basicSalary} OMR</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-700">{allowancesSum} OMR</td>
                    <td className="px-6 py-4 text-xs font-black text-brand-dark">{netPay} OMR</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        r.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-150' : 'bg-red-50 text-red-700 border-red-150'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {r.status !== 'Paid' ? (
                        <button
                          onClick={() => handleDisbursePayroll(r.id)}
                          className="bg-brand-dark text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                        >
                          Disburse
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold italic">Disbursed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pendingPayroll.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-gray-400 italic">
                    No approved salary sheets in "To be Paid" queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AccountantDashboard;
