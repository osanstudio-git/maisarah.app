import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { getAllDepartments, getDepartmentById } from '../../config/departments';
import {
  Layers,
  ChevronDown,
  CheckCircle2,
  Clock,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Activity,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

interface EmployeeWorkload {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  tasksTotal: number;
  tasksActive: number;
  tasksCompleted: number;
  delays: number;
  completionRate: number;
  status: 'optimal' | 'busy' | 'available';
}

interface DelayIncident {
  id: string;
  created_at: string;
  user_name: string;
  activity_type: string;
  description_en: string;
  description_ar: string;
}

const DepartmentPerformance = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const departments = getAllDepartments();
  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || 'audit');
  const [hodProfile, setHodProfile] = useState<any | null>(null);
  const [employees, setEmployees] = useState<EmployeeWorkload[]>([]);
  const [delayIncidents, setDelayIncidents] = useState<DelayIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Overall Department Statistics
  const [deptStats, setDeptStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    delayedTasks: 0,
    avgCompletionRate: 0,
    teamSize: 0,
  });

  const selectedDept = getDepartmentById(selectedDeptId);

  useEffect(() => {
    fetchDepartmentData(selectedDeptId);

    // Realtime subscription to services and activity_log
    const channel = supabase
      .channel(`dept_perf_${selectedDeptId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchDepartmentData(selectedDeptId, true);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => {
        fetchDepartmentData(selectedDeptId, true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDeptId]);

  const fetchDepartmentData = async (deptId: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch profiles matching this department or all active employee/HOD profiles
      const { data: allProfiles, error: pError } = await supabase
        .from('profiles')
        .select('*');

      if (pError) throw pError;

      // Filter for this department
      const deptProfiles = (allProfiles || []).filter(p => {
        if (!p.department_id && !p.department) return true; // Include general profiles
        const d = (p.department_id || p.department || '').toLowerCase().trim();
        if (deptId === 'audit' && d.includes('audit')) return true;
        if (deptId === 'tax_vat' && (d.includes('tax') || d.includes('vat'))) return true;
        if (deptId === 'bookkeeping' && (d.includes('book') || d.includes('account'))) return true;
        if (deptId === 'business_advisory' && (d.includes('advisor') || d.includes('consult'))) return true;
        if (deptId === 'client_success' && (d.includes('client') || d.includes('success') || d.includes('operation'))) return true;
        return d === deptId;
      });

      // Find Head of Department
      const hod = deptProfiles.find(p => p.role === 'department_head') || 
                  (allProfiles || []).find(p => p.role === 'department_head') || 
                  null;
      setHodProfile(hod);

      // 2. Fetch all services (operations)
      const { data: services, error: sError } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          created_at,
          employee_id,
          client_id,
          profiles:employee_id(id, full_name, email),
          clients:client_id(id, company_name)
        `);

      if (sError) throw sError;

      const now = new Date();
      const allServices = services || [];

      // Group and calculate workload per employee
      const teamProfiles = deptProfiles.filter(p => p.role === 'employee' || p.role === 'department_head');
      // If none explicitly matched, take general employees
      const effectiveTeam = teamProfiles.length > 0 
        ? teamProfiles 
        : (allProfiles || []).filter(p => p.role === 'employee');

      let totalTasks = 0;
      let activeTasks = 0;
      let completedTasks = 0;
      let delayedTasks = 0;

      const employeeWorkloads: EmployeeWorkload[] = effectiveTeam.map(emp => {
        const empServices = allServices.filter(s => s.employee_id === emp.id);
        const empTotal = empServices.length;
        const empCompleted = empServices.filter(s => s.status === 'completed').length;
        const empActive = empServices.filter(s => s.status === 'ongoing' || s.status === 'under_review' || s.status === 'in_progress').length;
        
        const empDelayed = empServices.filter(s => {
          if (s.status === 'completed') return false;
          if (s.status === 'delayed') return true;
          if (s.due_date) {
            return new Date(s.due_date) < now;
          }
          return false;
        }).length;

        totalTasks += empTotal;
        activeTasks += empActive;
        completedTasks += empCompleted;
        delayedTasks += empDelayed;

        const rate = empTotal > 0 ? Math.round((empCompleted / empTotal) * 100) : 100;
        
        let status: 'optimal' | 'busy' | 'available' = 'optimal';
        if (empActive >= 4 || empDelayed > 0) status = 'busy';
        else if (empActive <= 1) status = 'available';

        return {
          id: emp.id,
          name: emp.full_name || emp.name || emp.email || 'Employee',
          email: emp.email || '',
          phone: emp.phone || '',
          role: emp.role,
          tasksTotal: empTotal,
          tasksActive: empActive,
          tasksCompleted: empCompleted,
          delays: empDelayed,
          completionRate: rate,
          status
        };
      });

      // Sort by workload or delays descending
      employeeWorkloads.sort((a, b) => (b.delays - a.delays) || (b.tasksActive - a.tasksActive));
      setEmployees(employeeWorkloads);

      const avgRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      setDeptStats({
        totalTasks,
        activeTasks,
        completedTasks,
        delayedTasks,
        avgCompletionRate: avgRate,
        teamSize: employeeWorkloads.length,
      });

      // 3. Fetch recent delay logs & corrective actions from activity_log
      const { data: actLogs, error: actError } = await supabase
        .from('activity_log')
        .select('*')
        .in('activity_type', ['delay_action_logged', 'delay_escalated', 'task_dispatched'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (!actError && actLogs) {
        setDelayIncidents(actLogs as DelayIncident[]);
      }
    } catch (err) {
      console.error('Error loading department performance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!selectedDept) return null;

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header & Department Selector ─────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#A11212] flex items-center justify-center font-black shadow-inner flex-shrink-0">
            <Layers size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
                {isAr ? 'أداء ورقابة الأقسام' : 'Department Performance & Supervision'}
              </h1>
              {refreshing && (
                <RefreshCw size={18} className="text-[#A11212] animate-spin" />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              {isAr 
                ? 'مراقبة أداء رؤساء الأقسام، متابعة إنجاز الفرق، والاطلاع على معالجة التأخيرات' 
                : 'Monitor HOD leadership, team workload capacity, and review delay corrective actions'}
            </p>
          </div>
        </div>
        
        {/* Department Switcher */}
        <div className="relative min-w-[280px] w-full md:w-auto">
          <select 
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full py-3.5 px-5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#A11212] focus:ring-2 focus:ring-red-100 text-gray-900 font-black appearance-none transition-all hover:bg-gray-100 cursor-pointer text-sm"
          >
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.head_title})
              </option>
            ))}
          </select>
          <ChevronDown className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none`} size={18} />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center gap-3 bg-white rounded-[2rem] border border-gray-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#A11212]" />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {isAr ? 'جاري مزامنة بيانات القسم...' : 'Syncing Live Department Metrics...'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Key Performance Indicators (Live Supabase Data) ─────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Operations */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  {isAr ? 'إجمالي العمليات المسندة' : 'Total Operations'}
                </p>
                <div className="p-2 rounded-xl bg-gray-50 text-gray-600">
                  <Briefcase size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-gray-900">{deptStats.totalTasks}</p>
                <p className="text-xs font-bold text-gray-400 mt-1">
                  {isAr ? `عبر ${deptStats.teamSize} موظف` : `Across ${deptStats.teamSize} members`}
                </p>
              </div>
            </div>

            {/* In-Progress / Active */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">
                  {isAr ? 'العمليات النشطة قيد التنفيذ' : 'Active Works in Progress'}
                </p>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Activity size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-blue-700">{deptStats.activeTasks}</p>
                <p className="text-xs font-bold text-blue-500 mt-1">
                  {isAr ? 'تخضع لإشراف ومتابعة القسم' : 'Under direct HOD routing'}
                </p>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                  {isAr ? 'العمليات المكتملة' : 'Completed Works'}
                </p>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-emerald-700">{deptStats.completedTasks}</p>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1">
                  <TrendingUp size={12} />
                  <span>{deptStats.avgCompletionRate}% {isAr ? 'معدل النجاح' : 'Success Rate'}</span>
                </div>
              </div>
            </div>

            {/* Delayed / Attention Required */}
            <div className={`rounded-3xl p-6 shadow-sm border transition-all relative overflow-hidden group ${
              deptStats.delayedTasks > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-100'
            }`}>
              <div className="flex justify-between items-start">
                <p className={`text-[10px] font-black uppercase tracking-widest ${
                  deptStats.delayedTasks > 0 ? 'text-red-700' : 'text-gray-400'
                }`}>
                  {isAr ? 'تأخيرات تتطلب إجراء' : 'Delayed / Attention Needed'}
                </p>
                <div className={`p-2 rounded-xl ${
                  deptStats.delayedTasks > 0 ? 'bg-red-100 text-[#A11212]' : 'bg-gray-50 text-gray-400'
                }`}>
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-3xl font-black ${
                  deptStats.delayedTasks > 0 ? 'text-[#A11212]' : 'text-gray-900'
                }`}>{deptStats.delayedTasks}</p>
                <p className={`text-xs font-bold mt-1 ${
                  deptStats.delayedTasks > 0 ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {deptStats.delayedTasks > 0 
                    ? (isAr ? 'تنبيه مسجل لرئيس القسم' : 'Logged with HOD Action')
                    : (isAr ? 'جميع العمليات ضمن الجدول' : 'All jobs on schedule')}
                </p>
              </div>
            </div>
          </div>

          {/* ── HOD Leadership & Direct Accountability Card ────────────── */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-[#5C0A0A] rounded-[2rem] p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-black text-2xl shadow-xl flex-shrink-0">
                  {hodProfile?.full_name?.charAt(0) || hodProfile?.name?.charAt(0) || 'H'}
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-200 border border-red-400/30 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                    <ShieldCheck size={12} />
                    <span>{selectedDept.head_title} ({selectedDept.name})</span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-black tracking-tight">
                    {hodProfile?.full_name || hodProfile?.name || (isAr ? 'رئيس القسم المسؤول' : 'Assigned Department Head')}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 mt-1 font-medium">
                    {hodProfile?.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} className="text-red-300" />
                        {hodProfile.email}
                      </span>
                    )}
                    {hodProfile?.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-red-300" />
                        {hodProfile.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {isAr ? 'نشط في النظام' : 'Active On Duty'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Accountability Summary Matrix */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 w-full lg:w-auto justify-around">
                <div className="text-center px-3">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {isAr ? 'فريق العمل' : 'Supervised Staff'}
                  </p>
                  <p className="text-xl font-black text-white mt-0.5">{employees.length}</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="text-center px-3">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {isAr ? 'المهام قيد الإشراف' : 'Active Workload'}
                  </p>
                  <p className="text-xl font-black text-amber-300 mt-0.5">{deptStats.activeTasks}</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="text-center px-3">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {isAr ? 'حالات التأخير' : 'Pending Delays'}
                  </p>
                  <p className={`text-xl font-black mt-0.5 ${deptStats.delayedTasks > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                    {deptStats.delayedTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── Employee Team Roster & Capacity ───────────────────────── */}
            <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 text-[#A11212] rounded-xl">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900 tracking-tight">
                      {isAr ? 'سجل فريق العمل وحجم المهام' : 'Team Workload & Capacity Roster'}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {isAr ? 'مراقبة توزيع المهام ونسبة الإنجاز لكل موظف تحت إدارة رئيس القسم' : 'Real-time tasks, delays, and completion rates per employee'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-white text-gray-600 font-black px-3.5 py-1.5 rounded-xl border border-gray-200 shadow-sm uppercase tracking-widest">
                  {employees.length} {isAr ? 'أعضاء' : 'Members'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead className="bg-gray-50/70 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المهام النشطة' : 'Active'}</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المكتملة' : 'Completed'}</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المتأخرة' : 'Delayed'}</th>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'معدل الإنجاز' : 'Progress'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <User size={32} className="mx-auto mb-2 opacity-30" />
                          <p className="font-bold text-sm">{isAr ? 'لا يوجد موظفين مسجلين بهذا القسم حالياً' : 'No employees registered in this department yet'}</p>
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp.id} className="group hover:bg-red-50/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center font-black text-sm flex-shrink-0 group-hover:bg-[#A11212] group-hover:text-white transition-all shadow-inner">
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-start">
                                <p className="font-black text-gray-900 text-sm">{emp.name}</p>
                                <p className="text-[10px] font-bold text-gray-400">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-xs">
                              {emp.tasksActive}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black text-xs">
                              {emp.tasksCompleted}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-black text-xs ${
                              emp.delays > 0 ? 'bg-red-100 text-[#A11212]' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {emp.delays}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 min-w-[120px]">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 shadow-inner overflow-hidden">
                                <div 
                                  className="h-2 rounded-full transition-all duration-500" 
                                  style={{ 
                                    width: `${emp.completionRate}%`, 
                                    backgroundColor: emp.completionRate >= 80 ? '#10B981' : emp.completionRate >= 50 ? '#F59E0B' : '#EF4444' 
                                  }} 
                                />
                              </div>
                              <span className="text-[10px] font-black text-gray-700 w-8">{emp.completionRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Delay Incidents & Corrective Actions Log ─────────────── */}
            <div className="xl:col-span-1 space-y-4">
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-[#A11212]" />
                    <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider">
                      {isAr ? 'سجل معالجة التأخيرات' : 'HOD Delay Corrective Actions'}
                    </h3>
                  </div>
                  <span className="text-[10px] bg-red-50 text-[#A11212] font-black px-2 py-0.5 rounded-full">
                    {isAr ? 'مباشر' : 'Live Stream'}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] no-scrollbar">
                  {delayIncidents.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 border border-gray-100 border-dashed">
                      <ShieldCheck size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="font-bold text-xs text-gray-600">
                        {isAr ? 'لا توجد تأخيرات غير معالجة' : 'No unresolved delay incidents'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {isAr ? 'جميع المهام تسير وفق الخطة الزمنية المعتمدة' : 'Department operations are strictly adhering to target milestones'}
                      </p>
                    </div>
                  ) : (
                    delayIncidents.map((incident) => (
                      <div 
                        key={incident.id} 
                        className="bg-gray-50 hover:bg-red-50/30 border border-gray-200/70 hover:border-red-200 rounded-2xl p-4 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#A11212] uppercase tracking-wider">
                            <Clock size={11} />
                            {incident.activity_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400">
                            {new Date(incident.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-black text-gray-900 leading-snug">
                          {isAr ? incident.description_ar : incident.description_en}
                        </p>
                        <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center justify-between text-[10px] text-gray-500 font-bold">
                          <span>{isAr ? 'المسؤول:' : 'Action by:'} {incident.user_name}</span>
                          <span className="text-emerald-600 font-black">{isAr ? 'تم التوثيق' : 'Broadcasted'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DepartmentPerformance;
