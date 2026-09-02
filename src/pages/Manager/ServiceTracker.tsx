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
  UserCheck,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  X,
  RefreshCw
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modals & Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [reassignService, setReassignService] = useState<ServiceRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    employee_id: '',
    due_date: '',
    status: 'ongoing' as 'ongoing' | 'completed' | 'delayed' | 'under_review'
  });

  // ── Fetch Core Data ────────────────────────────────────────────────────────
  const fetchServices = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: sData, error: sErr },
        { data: pData, error: pErr },
        { data: cData, error: cErr }
      ] = await Promise.all([
        supabase
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
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, role, department_id'),
        supabase.from('clients').select('id, company_name')
      ]);

      if (sErr) throw sErr;
      setServices((sData as any[]) || []);
      if (pData) setEmployees(pData);
      if (cData) setClients(cData);
    } catch (err) {
      console.error('Fetch services error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();

    // ── Live Supabase Realtime Subscription ──────────────────────────────────
    const channel = supabase
      .channel('manager-operations-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchServices(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchServices(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServices]);

  // ── Map service title to department ────────────────────────────────────────
  const getDepartmentForService = (title: string) => {
    const depts = getAllDepartments();
    for (const d of depts) {
      if (d.services.some(s => title.toLowerCase().includes(s.toLowerCase()))) return d;
    }
    return depts[0];
  };

  // ── Calculate SLA ──────────────────────────────────────────────────────────
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

  // ── Status Quick-Update ────────────────────────────────────────────────────
  const handleStatusChange = async (serviceId: string, newStatus: ServiceRecord['status']) => {
    setActiveMenuId(null);
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: newStatus } : s));

    const { error } = await supabase
      .from('services')
      .update({ status: newStatus })
      .eq('id', serviceId);

    if (error) {
      console.error('Failed to update status:', error);
      fetchServices(true);
    }
  };

  // ── Reassign Employee ──────────────────────────────────────────────────────
  const handleReassignSubmit = async (serviceId: string, newEmployeeId: string) => {
    setIsSubmitting(true);
    const assignedEmp = employees.find(e => e.id === newEmployeeId);
    
    // Optimistic Update
    setServices(prev => prev.map(s => s.id === serviceId ? {
      ...s,
      employee_id: newEmployeeId,
      profiles: assignedEmp ? { full_name: assignedEmp.full_name } : null
    } : s));

    const { error } = await supabase
      .from('services')
      .update({ employee_id: newEmployeeId })
      .eq('id', serviceId);

    setIsSubmitting(false);
    setReassignService(null);
    if (error) {
      console.error('Failed to reassign:', error);
      fetchServices(true);
    }
  };

  // ── Create or Edit Submit ──────────────────────────────────────────────────
  const handleCreateOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingService) {
        // Edit existing
        const { error } = await supabase
          .from('services')
          .update({
            title: formData.title,
            client_id: formData.client_id || null,
            employee_id: formData.employee_id || null,
            due_date: formData.due_date || null,
            status: formData.status
          })
          .eq('id', editingService.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('services')
          .insert([{
            title: formData.title,
            client_id: formData.client_id || (clients[0]?.id ?? null),
            employee_id: formData.employee_id || (employees[0]?.id ?? null),
            due_date: formData.due_date || null,
            status: formData.status
          }]);

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingService(null);
      fetchServices(true);
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete Service ─────────────────────────────────────────────────────────
  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه العملية؟' : 'Are you sure you want to delete this operation?')) return;
    
    setServices(prev => prev.filter(s => s.id !== serviceId));
    setActiveMenuId(null);

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      console.error('Failed to delete service:', error);
      fetchServices(true);
    }
  };

  const filtered = services.filter(s => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
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

  const escalations = services.filter(s => s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed')).slice(0, 4);

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Zap className="text-brand-dark" size={32} fill="currentColor" />
            {isAr ? 'مركز العمليات المباشر' : 'Live Operations Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'التحكم المباشر في خط الإنتاج وتتبع المهام وإعادة التعيين' : 'Live production line control, task reassignment, and SLA tracking'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchServices()}
            className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-600 hover:text-brand-dark hover:shadow-sm transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            title={isAr ? 'تحديث البيانات' : 'Refresh Operations'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Sync'}</span>
          </button>

          <button
            onClick={() => {
              setEditingService(null);
              setFormData({
                title: '',
                client_id: clients[0]?.id || '',
                employee_id: employees[0]?.id || '',
                due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                status: 'ongoing'
              });
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-brand-dark hover:bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand-dark/15 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة عملية جديدة' : 'New Operation'}</span>
          </button>
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
                placeholder={isAr ? 'بحث سريع باسم الخدمة أو العميل أو الموظف...' : 'Search by service, client, or employee...'}
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
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* High-Density Table */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-visible">
            {loading ? (
              <div className="p-20 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-gray-400 font-bold text-sm">
                {isAr ? 'لا توجد عمليات تطابق البحث' : 'No operations found matching your filters.'}
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
                      <th className="px-6 py-4 text-end text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(svc => {
                      const status = SERVICE_STATUS_STYLES[svc.status] || SERVICE_STATUS_STYLES.ongoing;
                      const dept = getDepartmentForService(svc.title);
                      const sla = getSLAStatus(svc.due_date);
                      const isMenuOpen = activeMenuId === svc.id;

                      return (
                        <tr key={svc.id} className="group hover:bg-gray-50/50 transition-colors relative">
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
                              <span className="text-xs font-black text-gray-700">{svc.clients?.company_name || 'Generic Client'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setReassignService(svc)}
                              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-start"
                              title={isAr ? 'تغيير المسؤول' : 'Reassign Employee'}
                            >
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600">
                                {svc.profiles?.full_name ? svc.profiles.full_name.charAt(0) : '?'}
                              </div>
                              <span className="text-xs font-bold text-gray-600 hover:underline">{svc.profiles?.full_name || 'Unassigned'}</span>
                            </button>
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
                          <td className="px-6 py-4 text-end relative">
                            <button 
                              onClick={() => setActiveMenuId(isMenuOpen ? null : svc.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-dark hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Dropdown Action Menu */}
                            {isMenuOpen && (
                              <div className={`absolute ${isAr ? 'left-6' : 'right-6'} mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-up text-start`}>
                                <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">
                                  {isAr ? 'تغيير الحالة' : 'Change State'}
                                </div>
                                <button
                                  onClick={() => handleStatusChange(svc.id, 'ongoing')}
                                  className="w-full px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <PlayCircle size={14} /> Ongoing
                                </button>
                                <button
                                  onClick={() => handleStatusChange(svc.id, 'under_review')}
                                  className="w-full px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Clock size={14} /> Review
                                </button>
                                <button
                                  onClick={() => handleStatusChange(svc.id, 'completed')}
                                  className="w-full px-3 py-2 text-xs font-bold text-green-600 hover:bg-green-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 size={14} /> Completed
                                </button>
                                <button
                                  onClick={() => handleStatusChange(svc.id, 'delayed')}
                                  className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <AlertTriangle size={14} /> Delayed
                                </button>

                                <div className="my-1 border-t border-gray-100" />
                                
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setReassignService(svc);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <UserPlus size={14} className="text-gray-400" /> {isAr ? 'إعادة تعيين المسؤول' : 'Reassign Assignee'}
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setEditingService(svc);
                                    setFormData({
                                      title: svc.title,
                                      client_id: svc.client_id,
                                      employee_id: svc.employee_id || '',
                                      due_date: svc.due_date || '',
                                      status: svc.status
                                    });
                                    setShowCreateModal(true);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit size={14} className="text-gray-400" /> {isAr ? 'تعديل العملية' : 'Edit Operation'}
                                </button>
                                <button
                                  onClick={() => handleDeleteService(svc.id)}
                                  className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 size={14} /> {isAr ? 'حذف العملية' : 'Delete Operation'}
                                </button>
                              </div>
                            )}
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
              {isAr ? 'مركز التصعيد والتعثر' : 'Escalation Hub'}
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
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Breach SLA</p>
                    <p className="text-xs font-bold text-gray-900 leading-tight mb-2">{esc.title}</p>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] text-gray-500 font-medium">{esc.profiles?.full_name || 'Unassigned'}</span>
                      <button 
                        onClick={() => setReassignService(esc)}
                        className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-black transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        Action <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Operation Modal ─────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 animate-scale-up border border-gray-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Zap className="text-brand-dark" size={20} />
                {editingService 
                  ? (isAr ? 'تعديل العملية' : 'Edit Operation') 
                  : (isAr ? 'إضافة عملية تسليم جديدة' : 'New Deliverable Operation')}
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'عنوان المهمة / الخدمة' : 'Service Deliverable Title'}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={isAr ? 'مثال: إعداد إقرار ضريبة القيمة المضافة لشركة...' : 'e.g., VAT Return Filing for Khimji Group'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'العميل' : 'Client'}</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'المسؤول المباشر' : 'Assignee'}</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name} ({e.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'الموعد النهائي (SLA)' : 'Due Date (SLA)'}</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'الحالة' : 'Status'}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    <option value="ongoing">Ongoing (قيد التنفيذ)</option>
                    <option value="under_review">Review (قيد المراجعة)</option>
                    <option value="delayed">Delayed (متأخر)</option>
                    <option value="completed">Completed (مكتمل)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-dark hover:bg-brand text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? '...' : (isAr ? 'حفظ العملية' : 'Save Operation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reassign Modal ────────────────────────────────────────────────── */}
      {reassignService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 animate-scale-up border border-gray-100 text-start">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <UserCheck size={18} className="text-brand-dark" />
                {isAr ? 'إعادة تعيين المسؤول' : 'Reassign Assignee'}
              </h3>
              <button 
                onClick={() => setReassignService(null)} 
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-bold mb-4">{reassignService.title}</p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleReassignSubmit(reassignService.id, emp.id)}
                  className="w-full text-start p-3 rounded-xl border border-gray-100 hover:border-brand-dark hover:bg-brand-dark/5 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-black text-gray-900">{emp.full_name}</p>
                    <p className="text-[10px] font-bold text-gray-400 capitalize">{emp.role}</p>
                  </div>
                  {reassignService.employee_id === emp.id && (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OperationsCenter;
