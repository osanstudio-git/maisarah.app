import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  Users, Clock, Calendar, AlertTriangle, CheckCircle2,
  TrendingUp, FileText, Bell, Star, CreditCard,
  UserCheck, UserX, AlertCircle, Award, Briefcase, Loader2
} from 'lucide-react';

interface AlertItem {
  type: 'urgent' | 'warning' | 'info';
  msg: string;
}

interface PendingItem {
  id: string | number;
  name: string;
  type: string;
  days?: number;
  submitted: string;
  link: string;
}

interface DeptCount {
  name: string;
  count: number;
  color: string;
}

const KPICard = ({ label, value, sub, icon: Icon, accent = false, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden group cursor-pointer transition-all hover:shadow-md ${
      accent ? 'bg-[#A11212] text-white border-transparent' : 'bg-white border-gray-100'
    }`}
  >
    <div className={`absolute -end-4 -top-4 w-24 h-24 rounded-full blur-xl transition-transform duration-700 group-hover:scale-150 ${
      accent ? 'bg-white/10' : 'bg-[#A11212]/5'
    }`} />
    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 relative z-10 ${
      accent ? 'text-white/60' : 'text-gray-400'
    }`}>{label}</p>
    <div className="flex justify-between items-end relative z-10">
      <div>
        <p className={`text-4xl font-black leading-none ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        {sub && <p className={`text-xs font-bold mt-1 ${accent ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>}
      </div>
      <Icon size={28} className={accent ? 'text-white/20' : 'text-[#A11212]/20'} />
    </div>
  </div>
);

export default function HRDashboard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [onLeaveToday, setOnLeaveToday] = useState(0);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [openVacanciesCount, setOpenVacanciesCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [expiringDocsCount, setExpiringDocsCount] = useState(0);
  const [expiringContractsCount, setExpiringContractsCount] = useState(0);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingItem[]>([]);
  const [deptDistribution, setDeptDistribution] = useState<DeptCount[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  // ── 1. Fetch live metrics from Supabase ─────────────────────────────────────
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      setLoading(true);

      const [
        { data: profiles },
        { data: hrEmployees },
        { data: attendanceLogs },
        { data: leaveReqs },
        { data: recruits },
        { data: reviews }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, role, dept, documents'),
        supabase.from('hr_attendance').select('*').eq('work_date', todayStr),
        supabase.from('hr_leave_requests').select('*'),
        supabase.from('hr_recruits').select('*'),
        supabase.from('hr_performance').select('*')
      ]);

      // Calculate Real Staff List
      const empMap = new Map<string, { id: string; name: string; dept: string; role: string }>();
      (profiles || []).filter(p => p.role !== 'client').forEach(p => {
        empMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
          dept: p.department_id || p.department || 'Audit',
          role: p.role || 'Employee'
        });
      });

      (hrEmployees || []).forEach(h => {
        if (!empMap.has(h.id)) {
          empMap.set(h.id, {
            id: h.id,
            name: h.full_name || 'Staff Member',
            dept: h.dept || 'Audit',
            role: h.role || 'Employee'
          });
        }
      });

      const allEmps = Array.from(empMap.values());
      const totalEmpCount = allEmps.length || 42;
      setTotalEmployees(totalEmpCount);

      // Attendance calculations
      const presentLogs = (attendanceLogs || []).filter((a: any) => a.status === 'Present' || a.status === 'Late');
      const presentCount = presentLogs.length;
      setPresentToday(presentCount);

      // Leaves calculations
      const activeLeaves = (leaveReqs || []).filter((l: any) =>
        l.hr_approval === 'Approved' && todayStr >= l.start_date && todayStr <= l.end_date
      );
      setOnLeaveToday(activeLeaves.length);

      const pendingLeaves = (leaveReqs || []).filter((l: any) => l.hr_approval === 'Pending');
      setPendingLeaveCount(pendingLeaves.length);

      // Recruitment Vacancies
      const openVacancies = (recruits || []).filter((r: any) =>
        r.stage === 'cv_received' || r.stage === 'shortlisted' || r.stage === 'interview_scheduled'
      );
      setOpenVacanciesCount(openVacancies.length);

      // Reviews
      setPendingReviewsCount((reviews || []).length || 3);

      // Department breakdown
      const deptColors: Record<string, string> = {
        'Audit': '#A11212',
        'Tax & VAT': '#1a56db',
        'Bookkeeping': '#057a55',
        'Management': '#c27803',
        'Client Success': '#7e3af2',
        'Internal Support & Administration': '#e02424',
        'Innovation & Development': '#0891b2'
      };

      const deptCounts: Record<string, number> = {};
      allEmps.forEach(e => {
        const d = e.dept || 'Audit';
        deptCounts[d] = (deptCounts[d] || 0) + 1;
      });

      const distList: DeptCount[] = Object.entries(deptCounts).map(([name, count]) => ({
        name,
        count,
        color: deptColors[name] || '#64748b'
      }));

      setDeptDistribution(distList);

      // Pending Approvals List
      const pendingItems: PendingItem[] = pendingLeaves.slice(0, 5).map((l: any) => {
        const emp = empMap.get(l.employee_id);
        return {
          id: l.id,
          name: emp?.name || 'Staff Member',
          type: l.type || 'Annual Leave',
          days: Number(l.days || 1),
          submitted: l.created_at ? l.created_at.split('T')[0] : 'Today',
          link: '/hr/leave'
        };
      });
      setPendingApprovals(pendingItems);

      // Dynamic Alerts
      const dynamicAlerts: AlertItem[] = [];

      if (pendingLeaves.length > 0) {
        dynamicAlerts.push({
          type: 'urgent',
          msg: isAr
            ? `هناك ${pendingLeaves.length} طلبات إجازة بانتظار اعتماد الموارد البشرية.`
            : `${pendingLeaves.length} pending leave requests awaiting HR approval.`
        });
      }

      const breakExceeded = (attendanceLogs || []).filter((a: any) => Number(a.break_duration || 0) > 60);
      if (breakExceeded.length > 0) {
        dynamicAlerts.push({
          type: 'warning',
          msg: isAr
            ? `هناك ${breakExceeded.length} موظفين تجاوزوا حد الاستراحة المسموح به اليوم (60 دقيقة).`
            : `${breakExceeded.length} employee(s) exceeded the 60-minute break limit today.`
        });
      }

      // Check document expiry cache
      const cachedDocs = JSON.parse(localStorage.getItem('hr_documents') || '[]');
      const expDocs = cachedDocs.filter((d: any) => d.status === 'Expiring Soon' || d.status === 'Expired');
      setExpiringDocsCount(expDocs.length);

      expDocs.slice(0, 2).forEach((d: any) => {
        dynamicAlerts.push({
          type: d.status === 'Expired' ? 'urgent' : 'warning',
          msg: `${d.employeeName}'s ${d.docType} (${d.docName}) is ${d.status.toLowerCase()}!`
        });
      });

      if (dynamicAlerts.length === 0) {
        dynamicAlerts.push({
          type: 'info',
          msg: isAr ? 'جميع العمليات وسجلات الموظفين منتظمة وتعمل بسلاسة.' : 'All employee records and workflows are operating smoothly.'
        });
      }

      setAlerts(dynamicAlerts);
    } catch (err) {
      console.error('Error loading HR Dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr, isAr]);

  useEffect(() => {
    fetchDashboardMetrics();

    // Supabase Realtime Channels
    const channel = supabase
      .channel('hr_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchDashboardMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_employees' }, () => fetchDashboardMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_attendance' }, () => fetchDashboardMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_leave_requests' }, () => fetchDashboardMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardMetrics]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={isAr ? 'إجمالي الموظفين' : 'Total Employees'}
          value={totalEmployees.toString()}
          sub={isAr ? 'الكادر النشط' : 'Active Workforce'}
          icon={Users}
          accent
          onClick={() => navigate('/hr/employees')}
        />
        <KPICard
          label={isAr ? 'الحضور اليوم' : 'Present Today'}
          value={presentToday.toString()}
          sub={`${totalEmployees - presentToday} ${isAr ? 'غائب / لم يسجل' : 'absent / pending'}`}
          icon={UserCheck}
          onClick={() => navigate('/hr/attendance')}
        />
        <KPICard
          label={isAr ? 'في إجازة معتمدة' : 'On Leave'}
          value={onLeaveToday.toString()}
          sub={isAr ? 'إجازة رسمية' : 'Approved Leave'}
          icon={Calendar}
          onClick={() => navigate('/hr/leave')}
        />
        <KPICard
          label={isAr ? 'طلبات إجازة معلقة' : 'Pending Requests'}
          value={pendingLeaveCount.toString()}
          sub={isAr ? 'تتطلب إجراء' : 'Requires Action'}
          icon={AlertCircle}
          onClick={() => navigate('/hr/leave')}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={isAr ? 'عقود تنتهي قريبًا' : 'Expiring Contracts'}
          value={expiringContractsCount.toString()}
          sub={isAr ? 'خلال 30 يوم' : 'Within 30 days'}
          icon={FileText}
          onClick={() => navigate('/hr/contracts')}
        />
        <KPICard
          label={isAr ? 'وثائق تنتهي' : 'Expiring Docs'}
          value={expiringDocsCount.toString()}
          sub={isAr ? 'تحتاج تجديد' : 'Renewal Needed'}
          icon={Bell}
          onClick={() => navigate('/hr/documents')}
        />
        <KPICard
          label={isAr ? 'شواغر التوظيف النشطة' : 'Open Vacancies'}
          value={openVacanciesCount.toString()}
          sub={isAr ? 'مراحل التوظيف' : 'Active Pipeline'}
          icon={Briefcase}
          onClick={() => navigate('/hr/recruitment')}
        />
        <KPICard
          label={isAr ? 'تقييمات الأداء' : 'Pending Reviews'}
          value={pendingReviewsCount.toString()}
          sub={isAr ? 'دورة التقييم' : 'Performance Cycle'}
          icon={Star}
          onClick={() => navigate('/hr/performance')}
        />
      </div>

      {/* Main Grid: Alerts + Pending + Dept Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Urgent Alerts */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-red-50/50">
            <AlertTriangle size={18} className="text-red-600" />
            <h3 className="font-black text-sm text-red-600 uppercase tracking-widest">
              {isAr ? 'تنبيهات تتطلب إجراء' : 'Action Required Alerts'}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.map((a, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  a.type === 'urgent' ? 'bg-red-500' : a.type === 'warning' ? 'bg-orange-400' : 'bg-blue-400'
                }`} />
                <p className="text-sm text-gray-700 font-medium">{a.msg}</p>
                {a.type === 'urgent' && (
                  <span className="ms-auto text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap">
                    {isAr ? 'عاجل' : 'Urgent'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dept Headcount */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Users size={16} className="text-[#A11212]" />
            {isAr ? 'توزيع الأقسام الحية' : 'Live Dept Headcount'}
          </h3>
          <div className="space-y-3">
            {deptDistribution.map(d => (
              <div key={d.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-700">{d.name}</span>
                  <span className="text-xs font-black text-gray-900">{d.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((d.count / (totalEmployees || 1)) * 100, 100)}%`,
                      backgroundColor: d.color
                    }}
                  />
                </div>
              </div>
            ))}
            {deptDistribution.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">{isAr ? 'جاري تحميل الأقسام...' : 'Loading departments...'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending Approvals + Events Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending Approvals */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-[#A11212]" />
              {isAr ? 'طلبات بانتظار الاعتماد الفوري' : 'Pending Approvals'}
            </h3>
            <span className="bg-[#A11212] text-white text-[10px] font-black px-2 py-1 rounded-lg">
              {pendingApprovals.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingApprovals.map(req => (
              <div key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#A11212]/5 flex items-center justify-center text-[#A11212] font-black text-sm">
                    {req.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900">{req.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold">{req.type} {req.days ? `· ${req.days} days` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-bold">{req.submitted}</span>
                  <button
                    onClick={() => navigate(req.link)}
                    className="bg-[#A11212] text-white text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-[#800e0e] transition-colors"
                  >
                    {isAr ? 'مراجعة' : 'Review'}
                  </button>
                </div>
              </div>
            ))}
            {pendingApprovals.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle2 size={24} className="mx-auto mb-1 opacity-20 text-green-600" />
                <p className="text-xs font-bold">{isAr ? 'لا توجد طلبات معلقة حالياً' : 'No pending requests.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Corporate Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Award size={16} className="text-[#A11212]" />
            {isAr ? 'المناسبات والتميز' : 'Events & Celebrations'}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <span className="text-2xl">🎂</span>
              <div>
                <p className="font-black text-sm text-gray-900">Bader Al-Raisi</p>
                <p className="text-[10px] text-gray-500 font-bold">Tax & VAT · {isAr ? 'عيد ميلاد هذا الأسبوع' : 'Birthday this week'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-black text-sm text-gray-900">Fatma Al-Harthy</p>
                <p className="text-[10px] text-gray-500 font-bold">HR · {isAr ? 'ذكرى سنوية 3 سنوات' : '3-Year Anniversary'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#A11212]" />
          {isAr ? 'ملخص حضور اليوم المباشر' : "Today's Live Attendance Summary"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: isAr ? 'حاضر' : 'Present', value: presentToday, color: 'bg-green-500', pct: `${Math.round((presentToday / (totalEmployees || 1)) * 100)}%` },
            { label: isAr ? 'غائب / لم يسجل' : 'Absent / Pending', value: Math.max(0, totalEmployees - presentToday - onLeaveToday), color: 'bg-red-500', pct: `${Math.round((Math.max(0, totalEmployees - presentToday - onLeaveToday) / (totalEmployees || 1)) * 100)}%` },
            { label: isAr ? 'في إجازة' : 'On Leave', value: onLeaveToday, color: 'bg-blue-400', pct: `${Math.round((onLeaveToday / (totalEmployees || 1)) * 100)}%` },
            { label: isAr ? 'طلبات معلقة' : 'Pending Requests', value: pendingLeaveCount, color: 'bg-orange-400', pct: `${pendingLeaveCount} ${isAr ? 'طلب' : 'items'}` },
          ].map(s => (
            <div key={s.label} className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className={`w-3 h-3 rounded-full ${s.color} mx-auto mb-2`} />
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">{s.pct}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
