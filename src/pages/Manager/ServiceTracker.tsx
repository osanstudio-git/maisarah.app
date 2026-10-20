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
  ongoing: { icon: PlayCircle, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200/80', dot: 'bg-blue-500', label_en: 'Ongoing', label_ar: 'قيد التنفيذ' },
  completed: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200/80', dot: 'bg-emerald-500', label_en: 'Completed', label_ar: 'مكتمل' },
  delayed: { icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200/80', dot: 'bg-rose-600', label_en: 'Delayed', label_ar: 'متأخر' },
  under_review: { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200/80', dot: 'bg-amber-500', label_en: 'Review', label_ar: 'قيد المراجعة' },
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

  const statusCounts = useMemo(() => {
    return {
      all: services.length,
      ongoing: services.filter(s => s.status === 'ongoing').length,
      under_review: services.filter(s => s.status === 'under_review').length,
      delayed: services.filter(s => s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed')).length,
      completed: services.filter(s => s.status === 'completed').length,
    };
  }, [services]);

  const stats = {
    active: services.filter(s => s.status === 'ongoing' || s.status === 'under_review').length,
    bottlenecks: services.filter(s => s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed')).length,
    completedToday: services.filter(s => s.status === 'completed' && new Date(s.created_at).toDateString() === new Date().toDateString()).length,
  };

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#fbf9f9]/80 -m-4 md:-m-6 p-4 md:p-6 min-h-screen text-slate-800" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Instant Notification Feedback Toast ──────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-6 start-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-rose-900/40 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <CheckCheck size={16} />
          </div>
          <span className="text-xs font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}

      {/* ── Top Executive Command Banner & View Switcher ─────────────────── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(136,19,55,0.06)] border border-rose-100/60">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-red-900 text-[10px] font-black border border-rose-200/60 mb-1">
              <Building2 size={11} className="text-red-800" />
              <span>{isAr ? 'ميسرة للاستشارات والتدقيق المالي' : 'Maisarah Financial & Auditing'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isAr ? 'إدارة العمليات والمهام التنفيذية' : 'Operations & Deliverables Command'}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isAr ? 'مزامنة حية ومباشرة' : 'Live Real-Time Stream'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">
              {isAr
                ? 'متابعة تدفق إنجاز العمليات والخدمات، تخصيص استيعاب المستشارين، ومراقبة الالتزام بمواعيد التسليم SLA'
                : 'Live monitoring of client deliverables, consultant capacity distribution & SLA timeline execution'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            {/* View Mode Switcher */}
            <div className="bg-rose-50/70 p-1 rounded-2xl flex items-center gap-1 border border-rose-100/80">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white shadow-xs font-black'
                    : 'text-slate-500 hover:text-red-900'
                }`}
              >
                <List size={14} />
                <span>{isAr ? 'جدول البيانات' : 'Table'}</span>
              </button>

              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white shadow-xs font-black'
                    : 'text-slate-500 hover:text-red-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>{isAr ? 'لوحة كانبان' : 'Kanban'}</span>
              </button>
            </div>

            {/* Sync Button */}
            <button
              onClick={() => fetchServices()}
              className="px-3.5 py-2 bg-white border border-rose-100/80 rounded-2xl text-slate-600 hover:text-red-900 hover:border-rose-200 shadow-xs transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
              title={isAr ? 'تحديث البيانات' : 'Sync Operations'}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-red-900' : 'text-slate-400'} />
              <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Sync'}</span>
            </button>

            {/* + Assign New Task Button with Signature Maisarah Red */}
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
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-red-950 via-rose-900 to-red-900 hover:from-red-900 hover:to-rose-950 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/25 transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>{isAr ? 'إسناد مهمة جديدة' : '+ Assign New Task'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 1: Executive 4-Pulse Real-Time Metrics ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Deliverables (Signature Maisarah Red Hero) */}
        <div className="bg-gradient-to-br from-red-950 via-rose-900 to-red-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-red-950/25 flex flex-col justify-between min-h-[120px] transition-transform hover:-translate-y-0.5 border border-red-800/40 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-200">
              {isAr ? 'العمليات النشطة' : 'Active Deliverables'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center shadow-xs">
              <Activity size={16} />
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline justify-between gap-1.5 my-0.5">
              <span className="text-3xl font-black tracking-tight text-white">{stats.active}</span>
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0 shadow-xs">
                {isAr ? 'قيد التنفيذ والمراجعة' : 'In Production'}
              </span>
            </div>
            <p className="text-[10px] text-rose-200/80 mt-1">
              {isAr ? `${services.length} إجمالي المعاملات المسجلة` : `${services.length} Total Registered Files`}
            </p>
          </div>
        </div>

        {/* Card 2: SLA Bottlenecks & Critical Delivery Alerts */}
        <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[120px] transition-transform hover:-translate-y-0.5 border relative overflow-hidden ${
          stats.bottlenecks > 0
            ? 'bg-gradient-to-br from-rose-800 via-red-900 to-red-950 text-white border-rose-600/50 shadow-lg shadow-red-950/25'
            : 'bg-white border-rose-100/80 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between relative z-10 mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${stats.bottlenecks > 0 ? 'text-rose-200' : 'text-slate-400'}`}>
              {isAr ? 'تنبيهات SLA والمتأخرات' : 'SLA Bottlenecks'}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${
              stats.bottlenecks > 0 ? 'bg-white/20 text-white' : 'bg-rose-50 text-red-900'
            }`}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline justify-between gap-1.5 my-0.5">
              <span className={`text-3xl font-black tracking-tight ${stats.bottlenecks > 0 ? 'text-white' : 'text-slate-900'}`}>
                {stats.bottlenecks}
              </span>
              <span className={`font-black text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0 ${
                stats.bottlenecks > 0
                  ? 'bg-rose-950/70 text-white border border-rose-400/40'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
              }`}>
                {stats.bottlenecks > 0 ? (isAr ? 'يتطلب تدخل' : 'Action Needed') : (isAr ? 'ضمن الوقت' : '100% On Track')}
              </span>
            </div>
            <p className={`text-[10px] mt-1 ${stats.bottlenecks > 0 ? 'text-rose-200/80' : 'text-slate-400'}`}>
              {stats.bottlenecks > 0
                ? (isAr ? 'معاملات تجاوزت الموعد النهائي' : 'Tasks exceeding SLA deadline')
                : (isAr ? 'كافة المعاملات ضمن الإطار الزمني' : 'Zero SLA violations recorded')}
            </p>
          </div>
        </div>

        {/* Card 3: Today's Completed Throughput */}
        <div className="bg-white border border-rose-100/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[120px] transition-transform hover:-translate-y-0.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {isAr ? 'إنجاز اليوم' : 'Completed Today'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-1.5 my-0.5">
              <span className="text-3xl font-black text-emerald-700 tracking-tight">{stats.completedToday}</span>
              <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0 border border-emerald-200/60">
                {isAr ? 'مكتمل' : 'Deliverables Done'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isAr ? 'معاملات منجزة ومسلمة للعميل' : 'Delivered & finalized for clients'}
            </p>
          </div>
        </div>

        {/* Card 4: Staff Workload & Team Capacity */}
        <div className="bg-white border border-rose-100/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[120px] transition-transform hover:-translate-y-0.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {isAr ? 'توزيع ضغط الفريق' : 'Team Capacity'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-red-900 flex items-center justify-center shadow-xs">
              <UserCheck size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-1.5 my-0.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {employees.length} <span className="text-xs text-slate-400 font-normal">{isAr ? 'مستشار' : 'Staff'}</span>
              </span>
              <span className="bg-rose-100 text-red-900 font-black text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0 border border-rose-200/60">
                {isAr ? 'توزيع متوازن' : 'Load Balanced'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isAr ? 'إسناد مباشر وذكي حسب السعة' : 'Direct capacity-aware allocation'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Department Quick Filter Pills ─────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          onClick={() => setDeptFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            deptFilter === 'all'
              ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white shadow-sm shadow-red-950/20'
              : 'bg-white border border-rose-100/80 text-slate-600 hover:text-red-900 hover:bg-rose-50/50 shadow-2xs'
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
                ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-900 text-white shadow-sm shadow-red-950/20 font-black'
                : 'bg-white border border-rose-100/80 text-slate-600 hover:text-red-900 hover:bg-rose-50/50 shadow-2xs'
            }`}
          >
            <span>{d.name}</span>
          </button>
        ))}
      </div>

      {/* ── Section 3: Interactive Filter & Search Command Bar ───────────── */}
      <div className="bg-white rounded-2xl shadow-xs border border-rose-100/80 p-3 flex flex-wrap gap-3 items-center justify-between">
        {/* Quick Status Stage Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-red-900 border border-slate-200/60'
            }`}
          >
            <span>{isAr ? 'الكل' : 'All'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}>
              {statusCounts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ongoing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'ongoing'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50/70 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{isAr ? 'قيد التنفيذ' : 'Ongoing'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'ongoing' ? 'bg-white/20 text-white' : 'bg-blue-200/70 text-blue-800'
            }`}>
              {statusCounts.ongoing}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('under_review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'under_review'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50/70 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{isAr ? 'للمراجعة' : 'In Review'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'under_review' ? 'bg-white/20 text-white' : 'bg-amber-200/70 text-amber-800'
            }`}>
              {statusCounts.under_review}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('delayed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'delayed'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-rose-50/70 text-red-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{isAr ? 'متأخرة / تنبيه' : 'Delayed / SLA'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'delayed' ? 'bg-white/20 text-white' : 'bg-rose-200/80 text-red-900'
            }`}>
              {statusCounts.delayed}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isAr ? 'مكتملة' : 'Completed'}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-200/70 text-emerald-800'
            }`}>
              {statusCounts.completed}
            </span>
          </button>
        </div>

        {/* Search Bar with Red Focus */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400`} size={15} />
          <input
            type="text"
            placeholder={isAr ? 'بحث باسم الخدمة، الشركة أو المستشار المسؤول...' : 'Search by deliverable, client, or staff...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isAr ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-900 focus:bg-white focus:ring-2 focus:ring-red-900/10 text-xs font-bold transition-all text-slate-800`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`absolute ${isAr ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── View Mode 1: Executive Table View ────────────────────────────── */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(136,19,55,0.06)] border border-rose-100/60 overflow-hidden min-h-[380px]">
          {loading ? (
            <div className="p-20 flex flex-col justify-center items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-900" />
              <p className="text-xs text-slate-400 font-bold">{isAr ? 'جاري مزامنة خط العمليات...' : 'Syncing operations data...'}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 lg:p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-red-900 mx-auto flex items-center justify-center border border-rose-200/60 shadow-xs">
                <Activity size={26} />
              </div>
              <h3 className="text-base font-black text-slate-900">{isAr ? 'لا توجد مهام مطابقة للبحث' : 'No Matching Operations Found'}</h3>
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                {isAr ? 'جرب تغيير معايير البحث أو القسم أو قم بإسناد مهمة جديدة للفريق' : 'Adjust your search filters or click "+ Assign New Task" to register a deliverable'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start whitespace-nowrap">
                <thead className="bg-rose-50/40 border-b border-rose-100/80">
                  <tr>
                    <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-rose-950/70 tracking-wider w-24">
                      {isAr ? 'الرقم / الكود' : '# / ID'}
                    </th>
                    <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-rose-950/70 tracking-wider">
                      {isAr ? 'الشركة (العميل)' : 'Client / Company'}
                    </th>
                    <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-rose-950/70 tracking-wider">
                      {isAr ? 'القسم والخدمة' : 'Dept & Service'}
                    </th>
                    <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-rose-950/70 tracking-wider">
                      {isAr ? 'المسؤول المباشر وضغط العمل' : 'Assignee & Workload'}
                    </th>
                    <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-rose-950/70 tracking-wider">
                      {isAr ? 'مؤشر SLA' : 'SLA Status'}
                    </th>
                    <th className="px-6 py-4 text-start text-[10px] font-black uppercase text-rose-950/70 tracking-wider">
                      {isAr ? 'الحالة' : 'State'}
                    </th>
                    <th className="px-6 py-4 text-end text-[10px] font-black uppercase text-rose-950/70 tracking-wider">
                      {isAr ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/40 text-xs">
                  {filtered.map((svc, index) => {
                    const status = SERVICE_STATUS_STYLES[svc.status] || SERVICE_STATUS_STYLES.ongoing;
                    const dept = getDepartmentForService(svc.title);
                    const deptCode = DEPARTMENT_CODES[dept.id] || 'OPS';
                    const sla = getSLAStatus(svc.due_date);
                    const isSelected = activeMenuId === svc.id;
                    const empLoad = svc.employee_id ? employeeWorkload[svc.employee_id] : null;

                    return (
                      <tr key={svc.id} className="group hover:bg-rose-50/30 transition-colors">
                        {/* 1. Sequence & Department Code */}
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50/70 border border-rose-200/60 text-red-950 font-black text-xs">
                            <span className="text-[10px] text-red-900 uppercase tracking-wider font-extrabold">{deptCode}</span>
                            <span className="text-slate-400 font-bold">#{index + 1}</span>
                          </div>
                        </td>

                        {/* 2. Company */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-950 to-rose-900 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                              {(svc.clients?.company_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-slate-900 tracking-tight block truncate max-w-[200px]">
                                {svc.clients?.company_name || (isAr ? 'عميل عام' : 'Corporate Client')}
                              </span>
                              {svc.clients?.email && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                  {svc.clients.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Department & Service Deliverable */}
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-black text-red-900 uppercase tracking-widest mb-0.5">{dept.name}</p>
                          <p className="font-bold text-slate-900 truncate max-w-[240px]" title={svc.title}>{svc.title}</p>
                          {svc.description && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[240px] mt-0.5">{svc.description}</p>
                          )}
                        </td>

                        {/* 4. Handled By (Assignee) with Workload Indicator */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setReassignService(svc)}
                            className="flex items-center gap-2.5 hover:opacity-85 transition-all cursor-pointer text-start group/btn"
                            title={isAr ? 'تغيير المسؤول وإرسال إشعار فوري' : 'Reassign & notify staff'}
                          >
                            <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200/70 flex items-center justify-center text-xs font-black text-red-900 group-hover/btn:bg-red-900 group-hover/btn:text-white transition-colors shrink-0">
                              {svc.profiles?.full_name ? svc.profiles.full_name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-slate-800 group-hover/btn:text-red-900 group-hover/btn:underline block truncate">
                                {svc.profiles?.full_name || (isAr ? 'غير مسند' : 'Unassigned')}
                              </span>
                              {empLoad && (
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-md mt-0.5 ${
                                  empLoad.active <= 2
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : empLoad.active <= 5
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-red-700 border border-rose-200'
                                }`}>
                                  {empLoad.active} {isAr ? 'مهام جارية' : 'active tasks'}
                                </span>
                              )}
                            </div>
                          </button>
                        </td>

                        {/* 5. SLA Status */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase inline-flex items-center gap-1 shadow-2xs ${sla.bg} ${sla.color}`}>
                            <Clock size={11} />
                            {sla.text}
                          </span>
                        </td>

                        {/* 6. State / Status */}
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/60">
                            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                            <span className="font-black text-slate-800 text-[11px] uppercase tracking-tight">
                              {isAr ? status.label_ar : status.label_en}
                            </span>
                          </div>
                        </td>

                        {/* 7. Actions Menu Button */}
                        <td className="px-6 py-4 text-end">
                          <button
                            onClick={(e) => handleOpenMenu(e, svc.id)}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-red-950 to-rose-900 text-white shadow-xs'
                                : 'text-slate-400 hover:text-red-900 hover:bg-rose-50'
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
              <div key={colStatus} className="bg-slate-50/70 rounded-3xl p-4 border border-rose-100/60 flex flex-col h-[700px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-rose-100/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colStyle.dot}`} />
                    <h4 className="font-black text-slate-900 text-sm">
                      {isAr ? colStyle.label_ar : colStyle.label_en}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 text-xs font-black border border-rose-100/80 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards Area */}
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pe-1">
                  {colTasks.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-rose-100/80 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-bold bg-white/40">
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
                          className="bg-white p-4 rounded-2xl border border-rose-100/70 hover:border-red-900/40 shadow-xs hover:shadow-md transition-all space-y-3 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-red-900 border border-rose-200/60 uppercase tracking-wider">
                              {dept.name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${sla.bg} ${sla.color}`}>
                              <Clock size={10} />
                              {sla.text}
                            </span>
                          </div>

                          <div>
                            <h5 className="font-black text-slate-900 text-xs line-clamp-2" title={task.title}>
                              {task.title}
                            </h5>
                            <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                              <Building2 size={12} className="text-red-900/70 shrink-0" />
                              <span className="truncate">{task.clients?.company_name || 'Corporate Client'}</span>
                            </p>
                          </div>

                          {/* Assignee & Workload */}
                          <div className="pt-2 border-t border-rose-100/40 flex items-center justify-between">
                            <button
                              onClick={() => setReassignService(task)}
                              className="flex items-center gap-1.5 text-start hover:opacity-85 transition cursor-pointer"
                              title="Click to reassign"
                            >
                              <div className="w-6 h-6 rounded-full bg-rose-50 text-red-900 border border-rose-200/60 flex items-center justify-center text-[10px] font-black">
                                {task.profiles?.full_name ? task.profiles.full_name.charAt(0) : '?'}
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 truncate max-w-[100px]">
                                {task.profiles?.full_name || 'Unassigned'}
                              </span>
                            </button>

                            {empLoad && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                empLoad.active <= 2
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : empLoad.active <= 5
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-red-700 border border-rose-200'
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
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Move to Ongoing"
                              >
                                {isAr ? <ArrowRight size={11} /> : <ArrowLeft size={11} />}
                                {isAr ? 'قيد التنفيذ' : 'Ongoing'}
                              </button>
                            )}

                            {colStatus !== 'under_review' && colStatus !== 'completed' && (
                              <button
                                onClick={() => handleQuickStatusChange(task.id, 'under_review')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ms-auto cursor-pointer border border-amber-200/60"
                                title="Move to Review"
                              >
                                {isAr ? 'للمراجعة' : 'Review'}
                                {isAr ? <ArrowLeft size={11} /> : <ArrowRight size={11} />}
                              </button>
                            )}

                            {colStatus !== 'completed' && (
                              <button
                                onClick={() => handleQuickStatusChange(task.id, 'completed')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ms-auto cursor-pointer border border-emerald-200/60"
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
          className="w-56 bg-white rounded-2xl shadow-2xl border border-rose-100/80 py-1.5 text-start animate-scale-up"
        >
          <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-rose-100/60">
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
              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-red-900 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <UserPlus size={15} className="text-red-900" />
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
              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Edit size={15} className="text-blue-600" />
              <span>{isAr ? 'تعديل تفاصيل المهمة' : 'Edit Deliverable'}</span>
            </button>
          </div>

          <div className="p-1 border-t border-rose-100/60">
            <button
              onClick={() => {
                const id = activeMenuId;
                setActiveMenuId(null);
                setMenuPos(null);
                handleDeleteService(id);
              }}
              className="w-full px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Trash2 size={15} className="text-rose-600" />
              <span>{isAr ? 'حذف العملية' : 'Delete Operation'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Create / Edit Operation Modal with Maisarah Red Identity ──────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden p-6 animate-scale-up border border-rose-100/80">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-rose-100/60">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-900">
                  {isAr ? 'مركز العمليات الذكي' : 'Maisarah Operations'}
                </span>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mt-0.5">
                  <Activity className="text-red-900" size={19} />
                  {editingService
                    ? (isAr ? 'تعديل تفاصيل العملية' : 'Edit Deliverable')
                    : (isAr ? 'إسناد مهمة جديدة للمستشار' : 'Assign New Client Deliverable')}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrEditSubmit} className="space-y-4 text-start">
              {/* Service Title */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>{isAr ? 'عنوان المهمة / الخدمة' : 'Service Deliverable Title'}</span>
                  <span className="text-red-900 flex items-center gap-1 font-bold text-[10px]">
                    <Sparkles size={11} /> {isAr ? 'اقتراحات سريعة' : 'Quick templates'}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={isAr ? 'مثال: إعداد إقرار ضريبة القيمة المضافة للربع الثاني...' : 'e.g., VAT Return Filing Q2 2026'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-red-900 focus:bg-white focus:ring-2 focus:ring-red-900/10 text-slate-900"
                />

                {/* Quick Service Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {POPULAR_SERVICES.slice(0, 4).map(srv => (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => setFormData({ ...formData, title: srv })}
                      className="px-2.5 py-1 bg-rose-50/70 hover:bg-gradient-to-r hover:from-red-950 hover:to-rose-900 hover:text-white rounded-lg text-[10px] font-bold text-red-900 border border-rose-200/60 transition-all cursor-pointer"
                    >
                      + {srv}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client & Assignee with Workload Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'العميل (الشركة)' : 'Client (Company)'}
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-red-900 focus:bg-white cursor-pointer text-slate-900"
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'المسؤول المباشر (مع مؤشر العبء)' : 'Assignee (Workload Aware)'}
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-red-900 focus:bg-white cursor-pointer text-slate-900"
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الموعد النهائي (SLA)' : 'Due Date (SLA)'}
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-red-900 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'حالة العملية' : 'Initial Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-red-900 focus:bg-white cursor-pointer text-slate-900"
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'ملاحظات ونطاق العمل' : 'Deliverable Scope / Notes'}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isAr ? 'أضف أي تفاصيل أو متطلبات للمهمة...' : 'Add any deliverable details or specific requirements...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-red-900 focus:bg-white resize-none text-slate-900"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-red-950 via-rose-900 to-red-900 hover:from-red-900 hover:to-rose-950 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-red-950/20 flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>{isSubmitting ? '...' : (isAr ? 'إسناد وإرسال الإشعار' : 'Assign & Notify')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reassign Modal with Workload Intelligence & Maisarah Red ─────── */}
      {reassignService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 animate-scale-up border border-rose-100/80 text-start">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-rose-100/60">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UserCheck size={18} className="text-red-900" />
                  {isAr ? 'إعادة إسناد المهمة وإشعار المستشار' : 'Reassign Assignee & Notify'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {isAr ? 'اختر المستشار الأنسب استيعاباً' : 'Select optimal staff by capacity'}
                </p>
              </div>
              <button
                onClick={() => setReassignService(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-50/50 p-3 rounded-2xl mb-4 border border-rose-100/70">
              <p className="text-xs font-black text-slate-900">{reassignService.title}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                {isAr ? 'العميل:' : 'Client:'} {reassignService.clients?.company_name || 'Corporate Client'}
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
                        ? 'border-red-900 bg-rose-50/60 ring-1 ring-red-900'
                        : 'border-slate-100 hover:border-rose-200 hover:bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-red-900 font-black flex items-center justify-center text-xs">
                        {emp.full_name ? emp.full_name.charAt(0) : '?'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{emp.full_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 capitalize">{emp.role || 'Staff'}</p>
                      </div>
                    </div>

                    <div className="text-end">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeCount <= 2
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : activeCount <= 5
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-red-700 border border-rose-200'
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

