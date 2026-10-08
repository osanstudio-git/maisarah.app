import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  User,
  Mail,
  Phone,
  MoreVertical,
  Zap,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  X,
  RefreshCw,
  FileText,
  Sparkles,
  LayoutGrid,
  List,
  Flame,
  CheckCheck,
  Bell,
  Send,
  Layers,
  Award
} from 'lucide-react';
import { getAllDepartments } from '../../config/departments';
import { autoCreateDSREntryFromTask } from '../../utils/dsrSync';

const DEPARTMENT_CODES: Record<string, string> = {
  audit: 'AUD',
  tax_vat: 'TAX',
  bookkeeping: 'BKP',
  business_advisory: 'ADV',
  client_success: 'CS',
  innovation_dev: 'INN',
  internal_support: 'ADM',
  management: 'MGT'
};

const POPULAR_SERVICES = [
  'VAT Return Filing',
  'Internal Audit Engagement',
  'Financial Statements Preparation',
  'Monthly Bookkeeping & Reconciliation',
  'Tax Certificate Renewal',
  'Feasibility Study',
  'Corporate Advisory',
  'KSA Audit & Compliance'
];

interface ServiceRecord {
  id: string;
  title: string;
  description?: string | null;
  status: 'ongoing' | 'completed' | 'delayed' | 'under_review';
  created_at: string;
  due_date: string | null;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  client_id: string;
  employee_id: string | null;
  clients: {
    id?: string;
    company_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  profiles: {
    id?: string;
    full_name: string;
    role?: string | null;
    department_id?: string | null;
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
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Modals & Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [reassignService, setReassignService] = useState<ServiceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    employee_id: '',
    due_date: '',
    description: '',
    priority: 'medium' as 'urgent' | 'high' | 'medium' | 'low',
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
            description,
            created_at, 
            due_date, 
            client_id,
            employee_id,
            clients (
              id,
              company_name,
              email,
              phone
            ),
            profiles:profiles!employee_id (
              id,
              full_name,
              role
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, role, department_id').order('full_name'),
        supabase.from('clients').select('id, company_name, email, phone').order('company_name')
      ]);

      if (sErr) console.error('Error fetching services:', sErr);
      if (pErr) console.error('Error fetching profiles:', pErr);
      if (cErr) console.error('Error fetching clients:', cErr);

      if (sData) setServices(sData as any[]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchServices(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServices]);

  // Click outside / scroll listener to close action menu
  useEffect(() => {
    const handleClose = () => {
      setActiveMenuId(null);
      setMenuPos(null);
    };
    if (activeMenuId) {
      window.addEventListener('click', handleClose);
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('resize', handleClose);
    }
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [activeMenuId]);

  // Open / Toggle Action Menu with exact screen positioning
  const handleOpenMenu = (e: React.MouseEvent, svcId: string) => {
    e.stopPropagation();
    if (activeMenuId === svcId) {
      setActiveMenuId(null);
      setMenuPos(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const menuWidth = 208;
      const menuHeight = 145;

      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuHeight ? rect.top - menuHeight + 2 : rect.bottom + 4;
      const left = isAr ? Math.max(12, rect.left) : Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth);

      setMenuPos({ top, left });
      setActiveMenuId(svcId);
    }
  };

  // ── Map service title to department ────────────────────────────────────────
  const getDepartmentForService = (title: string) => {
    const depts = getAllDepartments();
    for (const d of depts) {
      if (d.services.some(s => (title || '').toLowerCase().includes(s.toLowerCase()))) return d;
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

  // ── Employee Workload & Capacity Calculation ──────────────────────────────
  const employeeWorkload = useMemo(() => {
    const map: Record<string, { total: number; active: number; overdue: number; deptName: string }> = {};
    employees.forEach(emp => {
      const dept = getAllDepartments().find(d => d.id === emp.department_id);
      map[emp.id] = {
        total: 0,
        active: 0,
        overdue: 0,
        deptName: isAr ? (dept?.name_ar || 'عام') : (dept?.name_en || 'General')
      };
    });

    services.forEach(s => {
      if (s.employee_id && map[s.employee_id]) {
        map[s.employee_id].total += 1;
        if (s.status === 'ongoing' || s.status === 'under_review') {
          map[s.employee_id].active += 1;
        }
        if (s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed')) {
          map[s.employee_id].overdue += 1;
        }
      }
    });
    return map;
  }, [employees, services, isAr]);

  // ── Quick Status Transition for Kanban & Rows ─────────────────────────────
  const handleQuickStatusChange = async (serviceId: string, newStatus: ServiceRecord['status']) => {
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: newStatus } : s));
    try {
      await supabase.from('services').update({ status: newStatus }).eq('id', serviceId);
      setToastMessage(isAr ? '✓ تم تحديث حالة المهمة' : '✓ Task status updated');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.warn('Status update notice:', err);
    }
  };

  // ── Reassign Employee with Instant Notification ───────────────────────────
  const handleReassignSubmit = async (serviceId: string, newEmployeeId: string) => {
    setIsSubmitting(true);
    const assignedEmp = employees.find(e => e.id === newEmployeeId);
    const targetService = services.find(s => s.id === serviceId);

    // Optimistic Update
    setServices(prev => prev.map(s => s.id === serviceId ? {
      ...s,
      employee_id: newEmployeeId,
      profiles: assignedEmp ? { full_name: assignedEmp.full_name, role: assignedEmp.role, department_id: assignedEmp.department_id } : null
    } : s));

    const { error } = await supabase
      .from('services')
      .update({ employee_id: newEmployeeId })
      .eq('id', serviceId);

    if (newEmployeeId && targetService) {
      try {
        await supabase.from('notifications').insert([{
          user_id: newEmployeeId,
          recipient_id: newEmployeeId,
          recipient_role: 'employee',
          title: isAr ? 'تم إسناد مهمة جديدة إليك' : 'Task Reassigned to You',
          message: isAr
            ? `قام المدير بإسناد المهمة (${targetService.title}) للعميل (${targetService.clients?.company_name || 'العميل'}) إليك.`
            : `Manager reassigned "${targetService.title}" for ${targetService.clients?.company_name || 'Client'} to you.`,
          type: 'task_assigned',
          link: '/employee/services'
        }]);
      } catch (notifErr) {
        console.warn('Notif error:', notifErr);
      }
    }

    setToastMessage(isAr
      ? `✓ تم إسناد المهمة إلى (${assignedEmp?.full_name || 'الموظف'}) وإرسال إشعار فوري.`
      : `✓ Task assigned to ${assignedEmp?.full_name || 'Staff'} & notification dispatched.`
    );
    setTimeout(() => setToastMessage(null), 4000);

    setIsSubmitting(false);
    setReassignService(null);
    if (error) {
      console.error('Failed to reassign:', error);
      fetchServices(true);
    }
  };

  // ── Create or Edit Submit with Workload & Notification ────────────────────
  const handleCreateOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert(isAr ? 'يرجى كتابة أو اختيار اسم الخدمة' : 'Please enter or select a service title');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClientId = formData.client_id || clients[0]?.id || null;
      const selectedEmployeeId = formData.employee_id || employees[0]?.id || null;
      const selectedClientObj = clients.find(c => c.id === selectedClientId);
      const selectedEmployeeObj = employees.find(e => e.id === selectedEmployeeId);

      if (editingService) {
        // Edit existing
        const { error } = await supabase
          .from('services')
          .update({
            title: formData.title,
            client_id: selectedClientId,
            employee_id: selectedEmployeeId,
            due_date: formData.due_date || null,
            description: formData.description || null,
            status: formData.status
          })
          .eq('id', editingService.id);

        if (error) throw error;
        setToastMessage(isAr ? '✓ تم تحديث بيانات العملية بنجاح' : '✓ Operation updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('services')
          .insert([{
            title: formData.title,
            client_id: selectedClientId,
            employee_id: selectedEmployeeId,
            due_date: formData.due_date || null,
            description: formData.description || null,
            status: formData.status
          }]);

        if (error) throw error;

        // Auto-create DSR Draft for assigned employee so they never forget to log
        autoCreateDSREntryFromTask({
          serviceTitle: formData.title,
          companyName: selectedClientObj?.company_name || 'Valued Corporate Client',
          crNumber: selectedClientObj?.cr_number || '',
          clientId: selectedClientId || undefined,
          employeeName: selectedEmployeeObj?.full_name || 'Staff Member',
          employeeId: selectedEmployeeId || undefined,
          amount: 0,
          date: new Date().toISOString().split('T')[0]
        });

        // Send instant notification to assigned staff member
        if (selectedEmployeeId) {
          try {
            await supabase.from('notifications').insert([{
              user_id: selectedEmployeeId,
              recipient_id: selectedEmployeeId,
              recipient_role: 'employee',
              title: isAr ? 'مهمة عمل جديدة مسندة إليك' : 'New Task Assigned',
              message: isAr
                ? `تم إسناد مهمة (${formData.title}) للعميل (${selectedClientObj?.company_name || 'العميل'}) بتاريخ استحقاق ${formData.due_date || 'غير محدد'}.`
                : `New task assigned: "${formData.title}" for ${selectedClientObj?.company_name || 'Client'}. Due: ${formData.due_date || 'N/A'}.`,
              type: 'task_assigned',
              link: '/employee/services'
            }]);
          } catch (notifErr) {
            console.warn('Notif error:', notifErr);
          }
        }

        setToastMessage(isAr
          ? `✓ تم إسناد المهمة وإرسال إشعار فوري وتوليد مسودة DSR لـ (${selectedEmployeeObj?.full_name || 'الموظف'}).`
          : `✓ Task assigned, instant notification dispatched & DSR draft created for ${selectedEmployeeObj?.full_name || 'Staff'}.`
        );
      }

      setTimeout(() => setToastMessage(null), 4000);
      setShowCreateModal(false);
      setEditingService(null);
      fetchServices(true);
    } catch (err: any) {
      console.error('Save service error:', err);
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
    setMenuPos(null);

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
      (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.clients?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  return (
    <div className="space-y-6 pb-10 max-w-[1600px] mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Instant Notification Feedback Toast ──────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-6 start-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-700/80 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
            <CheckCheck size={16} />
          </div>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── Header & View Mode Switcher ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-dark/10 rounded-full text-xs font-bold text-brand-dark mb-1.5">
            <Zap size={13} className="text-brand-dark" />
            {isAr ? 'إدارة خط الإنتاج والعمليات الذكية' : 'Smart Production Line & Workload Engine'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            {isAr ? 'مركز العمليات وإسناد المهام' : 'Operations & Task Assignment Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {isAr ? 'إسناد المهام بذكاء حسب ضغط العمل، تتبع اتفاقيات SLA، وإرسال إشعارات فورية للموظفين' : 'Workload-aware delegation, real-time staff alerts, SLA tracking & Kanban execution'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 border border-gray-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <List size={14} />
              <span>{isAr ? 'جدول البيانات' : 'Table'}</span>
            </button>

            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>{isAr ? 'لوحة كانبان' : 'Kanban'}</span>
            </button>
          </div>

          <button
            onClick={() => fetchServices()}
            className="p-2.5 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:text-brand-dark hover:shadow-sm transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
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
                description: '',
                priority: 'medium',
                status: 'ongoing'
              });
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-brand-dark hover:bg-brand text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand-dark/15 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>{isAr ? 'إسناد مهمة جديدة' : '+ Assign New Task'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: Real-Time Executive Pulse Bar ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Operations */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-dark text-white rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              {isAr ? 'العمليات النشطة' : 'Active Deliverables'}
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Activity size={16} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-black">{stats.active}</p>
            <p className="text-[11px] text-slate-300 font-medium mt-0.5">
              {isAr ? 'معاملة قيد التنفيذ والمراجعة' : 'In production & review'}
            </p>
          </div>
        </div>

        {/* Card 2: Critical Bottlenecks */}
        <div className={`rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between border transition-all ${
          stats.bottlenecks > 0 
            ? 'bg-gradient-to-br from-red-600 via-red-700 to-rose-900 text-white border-red-500' 
            : 'bg-white border-gray-100 text-gray-900'
        }`}>
          <div className="flex items-center justify-between relative z-10 mb-3">
            <span className={`text-[10px] font-black uppercase tracking-wider ${stats.bottlenecks > 0 ? 'text-rose-200' : 'text-gray-400'}`}>
              {isAr ? 'تنبيهات SLA / متأخرة' : 'SLA Bottlenecks'}
            </span>
            <div className={`p-2 rounded-xl ${stats.bottlenecks > 0 ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'}`}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="relative z-10">
            <p className={`text-3xl font-black ${stats.bottlenecks > 0 ? 'text-white' : 'text-gray-900'}`}>{stats.bottlenecks}</p>
            <p className={`text-[11px] font-medium mt-0.5 ${stats.bottlenecks > 0 ? 'text-rose-200' : 'text-gray-500'}`}>
              {stats.bottlenecks > 0 ? (isAr ? 'تتطلب تدخلاً فورياً' : 'Requires manager action') : (isAr ? 'الكل ضمن الجدول الزمني' : 'All tasks on SLA track')}
            </p>
          </div>
        </div>

        {/* Card 3: Today's Completed Throughput */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between relative z-10 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {isAr ? 'إنجاز اليوم' : 'Completed Today'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-black text-gray-900">{stats.completedToday}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              {isAr ? 'معاملة سلمت للعملاء' : 'Deliverables finished'}
            </p>
          </div>
        </div>

        {/* Card 4: Staff Workload Health */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between relative z-10 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {isAr ? 'توزيع ضغط الفريق' : 'Team Capacity'}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-black text-gray-900">
              {employees.length} <span className="text-xs text-gray-400 font-normal">{isAr ? 'مستشار وموظف' : 'Consultants'}</span>
            </p>
            <p className="text-[11px] text-blue-600 font-bold mt-0.5">
              {isAr ? 'توزيع مباشر بذكاء استيعابي' : 'Capacity-aware allocation'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Global Pipeline Operations ─────────────────────────── */}
      <div className="space-y-4">
        {/* Department Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setDeptFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              deptFilter === 'all'
                ? 'bg-brand-dark text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isAr ? 'جميع الأقسام' : 'All Departments'}
          </button>
          
          {getAllDepartments().map(d => (
            <button
              key={d.id}
              onClick={() => setDeptFilter(d.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                deptFilter === d.id
                  ? 'bg-brand-dark text-white shadow-sm font-black'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{d.name}</span>
            </button>
          ))}
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
            <input
              type="text"
              placeholder={isAr ? 'بحث سريع باسم الخدمة، الشركة أو الموظف...' : 'Search by service, company, or employee...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isAr ? 'pr-10' : 'pl-10'} py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-dark text-xs font-bold transition-all`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-dark min-w-[130px] cursor-pointer"
          >
            <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="ongoing">{isAr ? 'قيد التنفيذ' : 'Ongoing'}</option>
            <option value="under_review">{isAr ? 'قيد المراجعة' : 'Under Review'}</option>
            <option value="delayed">{isAr ? 'متأخرة' : 'Delayed'}</option>
            <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
          </select>
        </div>

        {/* ── View Mode 1: Table View ─────────────────────────────────────── */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[360px]">
            {loading ? (
              <div className="p-20 flex flex-col justify-center items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
                <p className="text-xs text-gray-400 font-bold">{isAr ? 'جاري مزامنة خط العمليات...' : 'Syncing operations line...'}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 lg:p-14 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-red-50 text-brand-dark mx-auto flex items-center justify-center shadow-inner">
                  <Zap size={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900">{isAr ? 'لا توجد مهام مطابقة' : 'No Tasks Found'}</h3>
                <p className="text-xs text-gray-500 font-medium">{isAr ? 'قم بإنشاء مهمة جديدة لإسنادها للفريق' : 'Create a new task to assign to staff'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start whitespace-nowrap">
                  <thead className="bg-gray-50/75 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-wider w-20">
                        {isAr ? 'الرقم / الكود' : '# / ID'}
                      </th>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        {isAr ? 'الشركة (العميل)' : 'Client / Company'}
                      </th>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        {isAr ? 'القسم والخدمة' : 'Dept & Service'}
                      </th>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        {isAr ? 'المسؤول المباشر وضغط العمل' : 'Assignee & Workload'}
                      </th>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        {isAr ? 'مؤشر SLA' : 'SLA Status'}
                      </th>
                      <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        {isAr ? 'الحالة' : 'State'}
                      </th>
                      <th className="px-6 py-4 text-end text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        {isAr ? 'إجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {filtered.map((svc, index) => {
                      const status = SERVICE_STATUS_STYLES[svc.status] || SERVICE_STATUS_STYLES.ongoing;
                      const dept = getDepartmentForService(svc.title);
                      const deptCode = DEPARTMENT_CODES[dept.id] || 'OPS';
                      const sla = getSLAStatus(svc.due_date);
                      const isSelected = activeMenuId === svc.id;
                      const empLoad = svc.employee_id ? employeeWorkload[svc.employee_id] : null;

                      return (
                        <tr key={svc.id} className="group hover:bg-gray-50/60 transition-colors">
                          {/* 1. Sequence & Department Code */}
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100/80 border border-gray-200/60 text-gray-800 font-black text-xs">
                              <span className="text-[10px] text-brand-dark uppercase tracking-wider font-extrabold">{deptCode}</span>
                              <span className="text-gray-400 font-bold">#{index + 1}</span>
                            </div>
                          </td>

                          {/* 2. Company */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-brand-dark shrink-0" />
                              <span className="font-black text-gray-900 tracking-tight">
                                {svc.clients?.company_name || (isAr ? 'عميل عام' : 'Generic Client')}
                              </span>
                            </div>
                          </td>

                          {/* 3. Department & Service Deliverable */}
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest mb-0.5">{dept.name}</p>
                            <p className="font-bold text-gray-900 truncate max-w-[240px]" title={svc.title}>{svc.title}</p>
                            {svc.description && (
                              <p className="text-[10px] text-gray-400 truncate max-w-[240px] mt-0.5">{svc.description}</p>
                            )}
                          </td>

                          {/* 4. Handled By (Assignee) with Workload Indicator */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setReassignService(svc)}
                              className="flex items-center gap-2.5 hover:opacity-80 transition-all cursor-pointer text-start group/btn"
                              title={isAr ? 'تغيير المسؤول وإرسال إشعار فوري' : 'Reassign & notify employee'}
                            >
                              <div className="w-8 h-8 rounded-full bg-brand-dark/10 border border-brand-dark/20 flex items-center justify-center text-xs font-black text-brand-dark group-hover/btn:bg-brand-dark group-hover/btn:text-white transition-colors shrink-0">
                                {svc.profiles?.full_name ? svc.profiles.full_name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0">
                                <span className="font-black text-gray-800 group-hover/btn:text-brand-dark group-hover/btn:underline block truncate">
                                  {svc.profiles?.full_name || (isAr ? 'غير مسند' : 'Unassigned')}
                                </span>
                                {empLoad && (
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-md mt-0.5 ${
                                    empLoad.active <= 2
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : empLoad.active <= 5
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    {empLoad.active} {isAr ? 'مهام جارية' : 'active tasks'}
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>

                          {/* 5. SLA Status */}
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1 ${sla.bg} ${sla.color}`}>
                              <Clock size={11} />
                              {sla.text}
                            </span>
                          </td>

                          {/* 6. State / Status */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${status.bg.replace('-50', '-500')}`} />
                              <span className="font-black text-gray-800 uppercase tracking-tight">
                                {isAr ? status.label_ar : status.label_en}
                              </span>
                            </div>
                          </td>

                          {/* 7. Actions Menu Button */}
                          <td className="px-6 py-4 text-end">
                            <button
                              onClick={(e) => handleOpenMenu(e, svc.id)}
                              className={`p-2 rounded-xl transition-all cursor-pointer ${isSelected
                                ? 'bg-brand-dark text-white shadow-sm'
                                : 'text-gray-400 hover:text-brand-dark hover:bg-gray-100'
                                }`}
                              title={isAr ? 'إجراءات' : 'Actions'}
                            >
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
        ) : (
          /* ── View Mode 2: Interactive Kanban Board ───────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {(['ongoing', 'under_review', 'delayed', 'completed'] as const).map(colStatus => {
              const colTasks = filtered.filter(s => s.status === colStatus);
              const colStyle = SERVICE_STATUS_STYLES[colStatus];

              return (
                <div key={colStatus} className="bg-gray-50/80 rounded-3xl p-4 border border-gray-200 flex flex-col h-[680px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${colStyle.bg.replace('-50', '-500')}`} />
                      <h4 className="font-black text-gray-900 text-sm">
                        {isAr ? colStyle.label_ar : colStyle.label_en}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white text-gray-700 text-xs font-black border border-gray-200 shadow-2xs">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards Area */}
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pe-1">
                    {colTasks.length === 0 ? (
                      <div className="h-40 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-xs text-gray-400 font-bold">
                        {isAr ? 'لا توجد مهام في هذه المرحلة' : 'No tasks in this stage'}
                      </div>
                    ) : (
                      colTasks.map(task => {
                        const dept = getDepartmentForService(task.title);
                        const sla = getSLAStatus(task.due_date);
                        const empLoad = task.employee_id ? employeeWorkload[task.employee_id] : null;

                        return (
                          <div
                            key={task.id}
                            className="bg-white p-4 rounded-2xl border border-gray-200/80 hover:border-brand-dark/40 shadow-xs hover:shadow-md transition-all space-y-3 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-brand-dark/10 text-brand-dark uppercase tracking-wider">
                                {dept.name}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${sla.bg} ${sla.color}`}>
                                <Clock size={10} />
                                {sla.text}
                              </span>
                            </div>

                            <div>
                              <h5 className="font-black text-gray-900 text-xs line-clamp-2" title={task.title}>
                                {task.title}
                              </h5>
                              <p className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1">
                                <Building2 size={12} className="text-gray-400" />
                                <span className="truncate">{task.clients?.company_name || 'Generic Client'}</span>
                              </p>
                            </div>

                            {/* Assignee & Workload */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                              <button
                                onClick={() => setReassignService(task)}
                                className="flex items-center gap-1.5 text-start hover:opacity-80 transition"
                                title="Click to reassign"
                              >
                                <div className="w-6 h-6 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center text-[10px] font-black">
                                  {task.profiles?.full_name ? task.profiles.full_name.charAt(0) : '?'}
                                </div>
                                <span className="text-[11px] font-bold text-gray-800 truncate max-w-[90px]">
                                  {task.profiles?.full_name || 'Unassigned'}
                                </span>
                              </button>

                              {empLoad && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                  empLoad.active <= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {empLoad.active} {isAr ? 'مهام' : 'tasks'}
                                </span>
                              )}
                            </div>

                            {/* Quick Kanban Action Progression */}
                            <div className="flex items-center justify-between pt-1 gap-1">
                              {colStatus !== 'ongoing' && (
                                <button
                                  onClick={() => handleQuickStatusChange(task.id, 'ongoing')}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  title="Move to Ongoing"
                                >
                                  {isAr ? <ArrowRight size={11} /> : <ArrowLeft size={11} />}
                                  {isAr ? 'قيد التنفيذ' : 'Ongoing'}
                                </button>
                              )}

                              {colStatus !== 'under_review' && colStatus !== 'completed' && (
                                <button
                                  onClick={() => handleQuickStatusChange(task.id, 'under_review')}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ms-auto"
                                  title="Move to Review"
                                >
                                  {isAr ? 'للمراجعة' : 'Review'}
                                  {isAr ? <ArrowLeft size={11} /> : <ArrowRight size={11} />}
                                </button>
                              )}

                              {colStatus !== 'completed' && (
                                <button
                                  onClick={() => handleQuickStatusChange(task.id, 'completed')}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ms-auto"
                                  title="Mark as Completed"
                                >
                                  <CheckCheck size={11} />
                                  {isAr ? 'إكمال' : 'Done'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Global Fixed Actions Popover Menu ─────────────────────────────── */}
      {activeMenuId && menuPos && (
        <div
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-56 bg-white rounded-2xl shadow-2xl border border-gray-200/90 py-1.5 text-start animate-scale-up"
        >
          <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
            {isAr ? 'الإجراءات السريعة' : 'Quick Actions'}
          </div>

          <div className="p-1 space-y-0.5">
            <button
              onClick={() => {
                const svc = services.find(s => s.id === activeMenuId);
                setActiveMenuId(null);
                setMenuPos(null);
                if (svc) setReassignService(svc);
              }}
              className="w-full px-3 py-2 text-xs font-bold text-gray-700 hover:bg-brand-dark/5 hover:text-brand-dark rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <UserPlus size={15} className="text-brand-dark" />
              <span>{isAr ? 'إعادة تعيين المسؤول وإشعاره' : 'Reassign & Notify'}</span>
            </button>

            <button
              onClick={() => {
                const svc = services.find(s => s.id === activeMenuId);
                setActiveMenuId(null);
                setMenuPos(null);
                if (svc) {
                  setEditingService(svc);
                  setFormData({
                    title: svc.title,
                    client_id: svc.client_id || '',
                    employee_id: svc.employee_id || '',
                    due_date: svc.due_date || '',
                    description: svc.description || '',
                    priority: svc.priority || 'medium',
                    status: svc.status
                  });
                  setShowCreateModal(true);
                }
              }}
              className="w-full px-3 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Edit size={15} className="text-blue-600" />
              <span>{isAr ? 'تعديل تفاصيل المهمة' : 'Edit Deliverable'}</span>
            </button>
          </div>

          <div className="p-1 border-t border-gray-100">
            <button
              onClick={() => {
                const id = activeMenuId;
                setActiveMenuId(null);
                setMenuPos(null);
                handleDeleteService(id);
              }}
              className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Trash2 size={15} className="text-red-500" />
              <span>{isAr ? 'حذف العملية' : 'Delete Operation'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Create / Edit Operation Modal with Workload Intelligence ──────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden p-6 animate-scale-up border border-gray-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-dark">
                  {isAr ? 'إسناد العمليات الذكي' : 'Workload-Aware Assignation'}
                </span>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mt-0.5">
                  <Zap className="text-brand-dark" size={20} />
                  {editingService
                    ? (isAr ? 'تعديل تفاصيل العملية' : 'Edit Deliverable')
                    : (isAr ? 'إسناد مهمة جديدة للموظف' : 'Assign New Client Task')}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrEditSubmit} className="space-y-4 text-start">
              {/* Service Title */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>{isAr ? 'عنوان المهمة / الخدمة' : 'Service Deliverable Title'}</span>
                  <span className="text-brand-dark flex items-center gap-1 font-bold text-[10px]">
                    <Sparkles size={11} /> {isAr ? 'اقتراحات سريعة' : 'Quick templates'}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={isAr ? 'مثال: إعداد إقرار ضريبة القيمة المضافة للربع الثاني...' : 'e.g., VAT Return Filing Q2 2026'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark"
                />

                {/* Quick Service Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {POPULAR_SERVICES.slice(0, 4).map(srv => (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => setFormData({ ...formData, title: srv })}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-brand-dark hover:text-white rounded-lg text-[10px] font-bold text-gray-600 transition-all cursor-pointer"
                    >
                      + {srv}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client & Assignee with Workload Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'العميل (الشركة)' : 'Client (Company)'}</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {clients.length === 0 ? (
                      <option value="">{isAr ? 'لا يوجد عملاء متاحين' : 'No clients found'}</option>
                    ) : (
                      clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.company_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'المسؤول المباشر (مع مؤشر العبء)' : 'Assignee (Workload Aware)'}
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {employees.length === 0 ? (
                      <option value="">{isAr ? 'لا يوجد موظفين متاحين' : 'No employees found'}</option>
                    ) : (
                      employees.map(e => {
                        const load = employeeWorkload[e.id];
                        const count = load ? load.active : 0;
                        const capacityTag = count <= 2 ? '🟢 Available' : count <= 5 ? '🟡 Moderate' : '🔴 Busy';
                        return (
                          <option key={e.id} value={e.id}>
                            {e.full_name} — {capacityTag} ({count} active)
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>

              {/* Due Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'حالة العملية' : 'Initial Status'}</label>
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

              {/* Description / Scope */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'ملاحظات ونطاق العمل' : 'Deliverable Scope / Notes'}</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isAr ? 'أضف أي تفاصيل أو متطلبات للمهمة...' : 'Add any deliverable details or specific requirements...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-brand-dark resize-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors cursor-pointer text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-dark hover:bg-brand text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>{isSubmitting ? '...' : (isAr ? 'إسناد وإرسال الإشعار' : 'Assign & Notify')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reassign Modal with Workload Intelligence ─────────────────────── */}
      {reassignService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 animate-scale-up border border-gray-100 text-start">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <UserCheck size={18} className="text-brand-dark" />
                  {isAr ? 'إعادة إسناد المهمة وإشعار المستشار' : 'Reassign Assignee & Notify'}
                </h3>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                  {isAr ? 'اختر المستشار الأنسب استيعاباً' : 'Select optimal staff by capacity'}
                </p>
              </div>
              <button
                onClick={() => setReassignService(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-2xl mb-4">
              <p className="text-xs font-black text-gray-900">{reassignService.title}</p>
              <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                {isAr ? 'العميل:' : 'Client:'} {reassignService.clients?.company_name || 'Generic Client'}
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pe-1 custom-scrollbar">
              {employees.map(emp => {
                const load = employeeWorkload[emp.id];
                const activeCount = load ? load.active : 0;
                const isCurrent = reassignService.employee_id === emp.id;

                return (
                  <button
                    key={emp.id}
                    onClick={() => handleReassignSubmit(reassignService.id, emp.id)}
                    className={`w-full text-start p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'border-brand-dark bg-brand-dark/5 ring-1 ring-brand-dark'
                        : 'border-gray-100 hover:border-brand-dark hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-dark/10 text-brand-dark font-black flex items-center justify-center text-xs">
                        {emp.full_name ? emp.full_name.charAt(0) : '?'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900">{emp.full_name}</p>
                        <p className="text-[10px] font-bold text-gray-400 capitalize">{emp.role || 'Staff'}</p>
                      </div>
                    </div>

                    <div className="text-end">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeCount <= 2
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : activeCount <= 5
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {activeCount} {isAr ? 'مهام جارية' : 'active'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OperationsCenter;
