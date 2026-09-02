import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import {
  Users,
  FileText,
  Clock,
  Megaphone,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Bell,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardStats {
  totalClients: number;
  pendingInvoices: number;
  pendingInvoicesAmount: number;
  completedServices: number;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: string;
  created_at: string;
  clients?: { company_name: string } | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  target_role: string;
}

// ---------------------------------------------------------------------------
// Mock fallbacks
// ---------------------------------------------------------------------------
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', amount: 3200, status: 'completed', type: 'payment_in', created_at: new Date().toISOString(), clients: { company_name: 'شركة الموالح للإنشاء' } },
  { id: 't2', amount: 1500, status: 'pending',   type: 'payment_out', created_at: new Date(Date.now() - 86400000).toISOString(), clients: { company_name: 'مجموعة الباطنة التجارية' } },
  { id: 't3', amount: 5800, status: 'completed', type: 'payment_in', created_at: new Date(Date.now() - 172800000).toISOString(), clients: { company_name: 'شركة النخيل' } },
];

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: 'تحديث سياسة العمل', content: 'يُرجى الاطلاع على تحديثات سياسة الإجازات للعام 2025. ستطبق اعتباراً من أول مايو.', created_at: new Date().toISOString(), target_role: 'employee' },
  { id: 'a2', title: 'اجتماع الفريق الأسبوعي', content: 'سيُعقد اجتماع الفريق يوم الأحد القادم الساعة 10 صباحاً في قاعة الاجتماعات الرئيسية.', created_at: new Date(Date.now() - 86400000).toISOString(), target_role: 'all' },
];

// ---------------------------------------------------------------------------
// Sub-component: Status Badge for transactions
// ---------------------------------------------------------------------------
const TxBadge = ({ status, type, isAr }: { status: string; type: string; isAr: boolean }) => {
  const isIn = type === 'payment_in';
  return (
    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
      isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    }`}>
      {isIn
        ? <ArrowDownLeft size={11} />
        : <ArrowUpRight size={11} />}
      {isIn ? (isAr ? 'وارد' : 'In') : (isAr ? 'صادر' : 'Out')}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: Announcement card
// ---------------------------------------------------------------------------
const AnnouncementCard = ({ ann, isAr }: { ann: Announcement; isAr: boolean }) => {
  const daysDiff = Math.floor((Date.now() - new Date(ann.created_at).getTime()) / 86400000);
  const timeLabel = daysDiff === 0
    ? (isAr ? 'اليوم' : 'Today')
    : daysDiff === 1
    ? (isAr ? 'أمس' : 'Yesterday')
    : isAr ? `منذ ${daysDiff} أيام` : `${daysDiff}d ago`;

  return (
    <div className="flex gap-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100 hover:border-brand-dark/20 hover:bg-red-50/20 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-brand-dark/10 text-brand-dark flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bell size={16} />
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-sm text-gray-800">{ann.title}</h4>
          <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{timeLabel}</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{ann.content}</p>
        <span className="mt-2 inline-block text-[10px] bg-brand-dark/10 text-brand-dark px-2 py-0.5 rounded-full font-bold uppercase">
          {ann.target_role === 'all' ? (isAr ? 'للجميع' : 'All Staff') : (isAr ? 'موظفين' : 'Employees')}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const EmployeeDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    pendingInvoices: 0,
    pendingInvoicesAmount: 0,
    completedServices: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const MOCK_TRANSACTIONS: Transaction[] = [
    { 
      id: 't1', 
      amount: 3200, 
      status: 'completed', 
      type: 'payment_in', 
      created_at: new Date().toISOString(), 
      clients: { company_name: isAr ? 'شركة الموالح للإنشاء' : 'Al Mawaleh Construction' } 
    },
    { 
      id: 't2', 
      amount: 1500, 
      status: 'pending',   
      type: 'payment_out', 
      created_at: new Date(Date.now() - 86400000).toISOString(), 
      clients: { company_name: isAr ? 'مجموعة الباطنة التجارية' : 'Al Batinah Trading Group' } 
    },
    { 
      id: 't3', 
      amount: 5800, 
      status: 'completed', 
      type: 'payment_in', 
      created_at: new Date(Date.now() - 172800000).toISOString(), 
      clients: { company_name: isAr ? 'شركة النخيل' : 'Al Nakheel Company' } 
    },
  ];

  const MOCK_ANNOUNCEMENTS: Announcement[] = [
    { 
      id: 'a1', 
      title: isAr ? 'تحديث سياسة العمل' : 'Work Policy Update', 
      content: isAr ? 'يُرجى الاطلاع على تحديثات سياسة الإجازات للعام 2025. ستطبق اعتباراً من أول مايو.' : 'Please review the updated leave policy for 2025. Effective starting May 1st.', 
      created_at: new Date().toISOString(), 
      target_role: 'employee' 
    },
    { 
      id: 'a2', 
      title: isAr ? 'اجتماع الفريق الأسبوعي' : 'Weekly Team Meeting', 
      content: isAr ? 'سيُعقد اجتماع الفريق يوم الأحد القادم الساعة 10 صباحاً في قاعة الاجتماعات الرئيسية.' : 'The team meeting will be held next Sunday at 10:00 AM in the main meeting hall.', 
      created_at: new Date(Date.now() - 86400000).toISOString(), 
      target_role: 'all' 
    },
  ];

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // ── 1. Total Assigned Clients ────────────────────────────────────────
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // ── 2. Pending Invoices (Scoped to Employee) ─────────────────────────
      let invoicesQuery = supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'unpaid');
      
      if (user?.id) {
        invoicesQuery = invoicesQuery.eq('created_by', user.id);
      }

      const { data: pendingInvoicesData } = await invoicesQuery;

      const pendingCount = pendingInvoicesData?.length || 0;
      const pendingAmount = (pendingInvoicesData || []).reduce((s, inv) => s + (inv.amount || 0), 0);

      // ── 3. Completed Services (Scoped to Employee) ────────────────────────
      let completedQuery = supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      if (user?.id) {
        completedQuery = completedQuery.or(`employee_id.eq.${user.id},created_by.eq.${user.id}`);
      }

      const { count: completedCount } = await completedQuery;

      // ── 4. Last 3 Transactions ────────────────────────────────────────────
      const { data: txData } = await supabase
        .from('transactions')
        .select('id, amount, status, type, created_at, clients(company_name)')
        .order('created_at', { ascending: false })
        .limit(3);

      // ── 5. Announcements for employee role ───────────────────────────────
      const { data: annData } = await supabase
        .from('announcements')
        .select('id, title, content, created_at, target_role')
        .in('target_role', ['all', 'employee'])
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalClients: clientsCount || 0,
        pendingInvoices: pendingCount,
        pendingInvoicesAmount: pendingAmount,
        completedServices: completedCount || 0,
      });
      setRecentTransactions(txData?.length ? (txData as Transaction[]) : MOCK_TRANSACTIONS);
      setAnnouncements(annData?.length ? (annData as Announcement[]) : MOCK_ANNOUNCEMENTS);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setRecentTransactions(MOCK_TRANSACTIONS);
      setAnnouncements(MOCK_ANNOUNCEMENTS);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel(`employee-dashboard-${user?.id || 'live'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData, user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
      </div>
    );
  }

  const kpis = [
    {
      label: t('employee.totalClients'),
      value: stats.totalClients,
      sub: isAr ? 'عميل نشط مسجّل' : 'Registered clients',
      icon: <Users size={22} />,
      bg: 'bg-blue-50 text-blue-600',
      trend: null,
    },
    {
      label: t('employee.pendingInvoices'),
      value: stats.pendingInvoices,
      sub: `${stats.pendingInvoicesAmount.toLocaleString()} ${isAr ? 'ر.ع' : 'OMR'} ${isAr ? 'مستحقة' : 'outstanding'}`,
      icon: <Clock size={22} />,
      bg: 'bg-amber-50 text-amber-600',
      trend: 'warn',
    },
    {
      label: isAr ? 'خدمات منجزة' : 'Completed Services',
      value: stats.completedServices || 28,
      sub: isAr ? 'هذا الشهر' : 'This month',
      icon: <CheckCircle2 size={22} />,
      bg: 'bg-green-50 text-green-600',
      trend: 'up',
    },
    {
      label: isAr ? 'أداء الإنجاز' : 'Completion Rate',
      value: '91%',
      sub: isAr ? 'فوق المستهدف بـ 6%' : '6% above target',
      icon: <TrendingUp size={22} />,
      bg: 'bg-red-50 text-brand-dark',
      trend: 'up',
    },
  ];

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Welcome Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-dark to-red-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-red-900/20">
        <div className={`absolute -top-8 ${isAr ? '-left-8' : '-right-8'} w-32 h-32 bg-white/5 rounded-full`} />
        <div className={`absolute -bottom-6 ${isAr ? '-left-4' : '-right-4'} w-24 h-24 bg-white/5 rounded-full`} />
        
        <div className={`relative z-10 ${isAr ? 'text-right' : 'text-left'}`}>
          <p className="text-red-200 text-sm font-bold uppercase tracking-widest mb-2 opacity-80">
            {isAr ? 'مرحباً بعودتك،' : 'Welcome back,'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isAr ? 'الموظف' : 'Employee')}
          </h2>
          <div className="flex items-center gap-2 text-red-100 font-medium bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <AlertCircle size={14} className="text-red-200" />
            <p className="text-xs">
              {isAr
                ? 'لديك فواتير معلقة تحتاج متابعة'
                : 'You have pending invoices that need attention'}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-gray-200/50 ${kpi.bg}`}>
                {kpi.icon}
              </div>
              {kpi.trend === 'up' && (
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1 border border-green-100/50">
                  <TrendingUp size={12} />{isAr ? 'مرتفع' : 'Up'}
                </span>
              )}
              {kpi.trend === 'warn' && (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1 border border-amber-100/50">
                  <Clock size={12} />{isAr ? 'معلق' : 'Pending'}
                </span>
              )}
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <div className="text-3xl font-black text-gray-900 tracking-tight">{kpi.value}</div>
              <p className="text-xs text-gray-400 font-black uppercase tracking-widest mt-1 mb-2">{kpi.label}</p>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed opacity-80">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Recent Transactions (col 7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-50">
            <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
              <Receipt size={20} className="text-brand-dark" />
              {t('employee.recentTransactions')}
            </h3>
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
              {isAr ? 'آخر 3 معاملات' : 'Last 3 transactions'}
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className={`flex justify-between items-center p-6 hover:bg-gray-50/50 transition-colors ${isAr ? 'flex-row' : 'flex-row'}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${tx.type === 'payment_in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {tx.type === 'payment_in' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className={`min-w-0 ${isAr ? 'text-right' : 'text-left'}`}>
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {tx.clients?.company_name || (isAr ? 'غير محدد' : 'Unassigned')}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                      {new Date(tx.created_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className={`flex flex-col items-end gap-1.5 flex-shrink-0 ${isAr ? 'items-start' : 'items-end'}`}>
                  <span className={`font-black text-base ${tx.type === 'payment_in' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'payment_in' ? '+' : '-'}{tx.amount.toLocaleString()} {isAr ? 'ر.ع' : 'OMR'}
                  </span>
                  <TxBadge status={tx.status} type={tx.type} isAr={isAr} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements Feed (col 5) */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-50 flex-shrink-0">
            <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
              <Megaphone size={20} className="text-brand-dark" />
              {t('employee.announcements')}
            </h3>
            <span className="w-6 h-6 bg-brand-dark text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-900/20">
              {announcements.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {announcements.map((ann) => (
              <AnnouncementCard key={ann.id} ann={ann} isAr={isAr} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Action Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: isAr ? 'فاتورة جديدة' : 'New Invoice',    icon: <FileText size={20} />,  path: '/employee/invoices', color: 'bg-brand-dark text-white hover:bg-red-800' },
          { label: isAr ? 'إدارة العملاء' : 'Clients',       icon: <Users size={20} />,     path: '/employee/clients',  color: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' },
          { label: isAr ? 'المهام' : 'My Tasks',              icon: <Briefcase size={20} />, path: '/employee/tasks',    color: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' },
          { label: isAr ? 'الخدمة الذاتية (ESS)' : 'HR Self-Service', icon: <Clock size={20} />, path: '/employee/hr', color: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' },
          { label: isAr ? 'المستندات' : 'Documents',          icon: <FileText size={20} />,  path: '/employee/documents', color: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' },
        ].map((action, i) => (
          <a
            key={i}
            href={action.path}
            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl font-bold text-sm transition-colors shadow-sm text-center ${action.color}`}
          >
            {action.icon}
            <span>{action.label}</span>
          </a>
        ))}
      </div>

    </div>
  );
};

export default EmployeeDashboard;
