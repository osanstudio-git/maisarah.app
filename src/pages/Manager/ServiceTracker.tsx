import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Calendar,
  Building2,
  MoreVertical,
  Zap,
  ShieldAlert,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { getAllDepartments } from '../../config/departments';

interface ServiceRecord {
  id: string;
  title: string;
  status: 'ongoing' | 'completed' | 'delayed' | 'under_review';
  created_at: string;
  due_date: string | null;
  client_id: string;
  employee_id: string | null;
  clients: {
    company_name: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

const SERVICE_STATUS_STYLES = {
  ongoing: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label_en: 'Ongoing', label_ar: 'قيد التنفيذ' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', label_en: 'Completed', label_ar: 'مكتمل' },
  delayed: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label_en: 'Delayed', label_ar: 'متأخر' },
  under_review: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label_en: 'Review', label_ar: 'قيد المراجعة' },
};

const OperationsCenter = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const fetchServices = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          id, 
          title, 
          status, 
          created_at, 
          due_date, 
          client_id,
          employee_id,
          clients (
            company_name
          ),
          profiles:profiles!employee_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data as any[] || []);
    } catch (err) {
      console.error('Fetch services error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();

    // Realtime channel for Operations Center
    const channel = supabase
      .channel('manager-operations-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => {
          fetchServices(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServices]);

  // Map service title to department (Basic heuristic for UI demonstration)
  const getDepartmentForService = (title: string) => {
    const depts = getAllDepartments();
    for (const d of depts) {
      if (d.services.some(s => title.toLowerCase().includes(s.toLowerCase()))) return d;
    }
    return depts[0]; // Fallback to first
  };

  // Helper to calculate SLA/Time remaining
  const getSLAStatus = (dueDate: string | null) => {
    if (!dueDate) return { text: 'No SLA', color: 'text-gray-400', bg: 'bg-gray-100' };
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d Overdue`, color: 'text-white', bg: 'bg-red-500' };
    if (diffDays === 0) return { text: 'Due Today', color: 'text-white', bg: 'bg-orange-500' };
    if (diffDays <= 3) return { text: `${diffDays}d Left`, color: 'text-orange-700', bg: 'bg-orange-100' };
    return { text: `${diffDays}d Left`, color: 'text-green-700', bg: 'bg-green-100' };
  };

  const filtered = services.filter(s => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const mappedDept = getDepartmentForService(s.title);
    const matchesDept = deptFilter === 'all' || mappedDept.id === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const stats = {
    active: services.filter(s => s.status === 'ongoing' || s.status === 'under_review').length,
    bottlenecks: services.filter(s => s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed')).length,
    completedToday: services.filter(s => s.status === 'completed' && new Date(s.created_at).toDateString() === new Date().toDateString()).length,
  };

  const escalations = services.filter(s => s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed')).slice(0, 3);

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Zap className="text-brand-dark" size={32} fill="currentColor" />
            {isAr ? 'مركز العمليات' : 'Operations Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'التحكم المباشر في خط الإنتاج وتتبع المهام' : 'Live production line control and task tracking'}
          </p>
        </div>
      </div>

      {/* ── Section 1: Real-Time Pulse Bar ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-dark text-white rounded-[2rem] p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">{isAr ? 'العمليات النشطة' : 'Active Operations'}</p>
            <p className="text-4xl font-black leading-none">{stats.active}</p>
          </div>
          <Activity size={32} className="text-white/20 relative z-10" />
        </div>

        <div className="bg-red-500 text-white rounded-[2rem] p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-black/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-1">{isAr ? 'عقبات حرجة' : 'Critical Bottlenecks'}</p>
            <p className="text-4xl font-black leading-none">{stats.bottlenecks}</p>
          </div>
          <ShieldAlert size={32} className="text-white/20 relative z-10" />
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{isAr ? 'إنجاز اليوم' : 'Today\'s Throughput'}</p>
            <p className="text-4xl font-black leading-none text-gray-900">{stats.completedToday}</p>
          </div>
          <CheckCircle2 size={32} className="text-green-500/20 relative z-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* ── Section 2: Global Pipeline Board ────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
              <input
                type="text"
                placeholder={isAr ? 'بحث سريع...' : 'Quick search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${isAr ? 'pr-10' : 'pl-10'} py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark text-sm font-bold transition-all`}
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-dark min-w-[140px]"
            >
              <option value="all">{isAr ? 'كل الأقسام' : 'All Departments'}</option>
              {getAllDepartments().map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-dark min-w-[120px]"
            >
              <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="ongoing">Ongoing</option>
              <option value="under_review">Review</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          {/* High-Density Table */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-20 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start whitespace-nowrap">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'معرف العملية' : 'Op ID'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'القسم والخدمة' : 'Dept & Service'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'العميل' : 'Client'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المسؤول' : 'Assignee'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'SLA مؤشر' : 'SLA Status'}</th>
                      <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'State'}</th>
                      <th className="px-6 py-4 text-end"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(svc => {
                      const status = SERVICE_STATUS_STYLES[svc.status] || SERVICE_STATUS_STYLES.ongoing;
                      const dept = getDepartmentForService(svc.title);
                      const sla = getSLAStatus(svc.due_date);

                      return (
                        <tr key={svc.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4 text-xs font-black text-gray-400">
                            #{svc.id.substring(0,6).toUpperCase()}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mb-0.5">{dept.name}</p>
                            <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{svc.title}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-gray-400" />
                              <span className="text-xs font-black text-gray-700">{svc.clients?.company_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600">
                                {svc.profiles?.full_name ? svc.profiles.full_name.charAt(0) : '?'}
                              </div>
                              <span className="text-xs font-bold text-gray-600">{svc.profiles?.full_name || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase ${sla.bg} ${sla.color}`}>
                              {sla.text}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${status.bg.replace('bg-', 'bg-').replace('-50', '-500')}`} />
                              <span className="text-xs font-black text-gray-700 uppercase tracking-tight">
                                {isAr ? status.label_ar : status.label_en}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-end">
                            <button className="text-gray-400 hover:text-brand-dark transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Escalation Hub ───────────────────────────────────── */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-red-50 rounded-2xl border border-red-100 p-5 shadow-sm">
            <h3 className="text-sm font-black text-red-900 uppercase tracking-widest flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-600" />
              {isAr ? 'مركز التصعيد' : 'Escalation Hub'}
            </h3>
            
            <div className="space-y-3">
              {escalations.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="mx-auto text-red-200 mb-2" size={24} />
                  <p className="text-xs font-bold text-red-400">{isAr ? 'لا توجد تصعيدات' : 'No active escalations'}</p>
                </div>
              ) : (
                escalations.map(esc => (
                  <div key={esc.id} className="bg-white rounded-xl p-4 shadow-sm border border-red-100 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Breach</p>
                    <p className="text-xs font-bold text-gray-900 leading-tight mb-2">{esc.title}</p>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] text-gray-500 font-medium">{esc.profiles?.full_name || 'Unassigned'}</span>
                      <button className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-black transition-colors flex items-center gap-1">
                        Action <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {escalations.length > 0 && (
              <button className="w-full mt-4 bg-white text-red-600 border border-red-200 hover:border-red-300 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all">
                {isAr ? 'عرض كل التصعيدات' : 'View All Escalations'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsCenter;
