import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { logActivity } from '../../lib/activityLogger';
import {
  Activity,
  Users,
  Briefcase,
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Plus,
  MoreVertical,
  Calendar,
  FileText,
  TrendingUp,
  MessageSquare,
  Send,
  Layers,
  FileBarChart,
  ShieldCheck,
  CheckSquare,
  PlusCircle,
  ArrowRight,
  TrendingDown,
  UserCheck,
  SlidersHorizontal,
  ChevronRight,
  XCircle,
  Edit2,
  Trash2,
  ArrowUpRight,
  ThumbsUp,
  Truck,
  Building2,
  UserPlus,
  RefreshCw,
  X,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import { getDepartmentById, getAllDepartments } from '../../config/departments';

interface EmployeeProfile {
  id: string;
  full_name: string;
  role: string;
  department_id?: string;
  email?: string;
  phone?: string;
  load?: number;
  tasksCompleted?: number;
  activeTasks?: number;
  delayed?: number;
  accuracy?: number;
}

interface ServiceDeliverable {
  id: string;
  title: string;
  description?: string | null;
  status: 'ongoing' | 'completed' | 'delayed' | 'under_review';
  created_at: string;
  due_date: string | null;
  client_id?: string | null;
  employee_id?: string | null;
  clients?: {
    id?: string;
    company_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  profiles?: {
    id?: string;
    full_name: string;
    role?: string | null;
  } | null;
  delayReason?: string;
  delayAction?: string;
  delayActionDate?: string;
  revisedDue?: string;
}

interface ClientItem {
  id: string;
  company_name: string;
  email?: string | null;
  phone?: string | null;
}

interface DelayLogRecord {
  serviceId: string;
  reasonCategory: string;
  reasonDetail: string;
  actionCategory: string;
  actionDetail: string;
  revisedDueDate?: string;
  loggedAt: string;
  loggedBy: string;
}

const DELAY_REASONS_EN = [
  'Client Missing Financial Documents',
  'Regulatory Authority Filing Queue',
  'Client Approval / Payment Pending',
  'Staff Workload / Capacity Bottleneck',
  'Accounting / Valuation Complexity',
  'Client Unresponsive / Postponed Meeting',
  'Other / Custom Reason'
];

const DELAY_REASONS_AR = [
  'نقص في مستندات وسجلات العميل المالية',
  'انتظار مراجعة الدوائر الحكومية أو الضريبية',
  'في انتظار موافقة أو سداد العميل',
  'ضغط عمل وتراكم مهام لدى الفريق',
  'تعقيدات فنية تتطلب معايير محاسبية إضافية',
  'العميل غير متجاوب أو أجل الموعد',
  'سبب آخر مخصص'
];

const DELAY_ACTIONS_EN = [
  'Sent Formal Demand Notice to Client',
  'Assigned Senior Auditor / Co-Pilot',
  'Scheduled Urgent Alignment Meeting',
  'Re-routed to Alternate Specialist',
  'Granted 48-Hour Extension Window',
  'Escalated to Executive Management'
];

const DELAY_ACTIONS_AR = [
  'تم إرسال إشعار رسمي عاجل للعميل',
  'تم إسناد مساعد أو مدقق أول لمساندة المهمة',
  'تمت جدولة اجتماع تنسيقي عاجل مع العميل',
  'تمت إعادة التوجيه إلى متخصص بديل',
  'تم منح مهلة تمديد إضافية لمدة 48 ساعة',
  'تم تصعيد المسألة للإدارة التنفيذية العليا'
];

const DepartmentHeadWorkspace = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';
  const location = useLocation();

  // Retrieve department context from Layout outlet context
  const context = useOutletContext<{ deptContext: string }>() || { deptContext: 'audit' };
  const currentDeptId = context.deptContext || 'audit';
  const deptConfig = getDepartmentById(currentDeptId) || getDepartmentById('audit');

  // Core Data States
  const [personnel, setPersonnel] = useState<EmployeeProfile[]>([]);
  const [services, setServices] = useState<ServiceDeliverable[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [hodLeaveRequests, setHodLeaveRequests] = useState<any[]>([]);
  const [delayLogs, setDelayLogs] = useState<Record<string, DelayLogRecord>>({});
  const [loading, setLoading] = useState(true);

  // Task Router Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskClientId, setTaskClientId] = useState('');
  const [taskEmployeeId, setTaskEmployeeId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDue, setTaskDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Delay Logging Modal State
  const [selectedDelayService, setSelectedDelayService] = useState<ServiceDeliverable | null>(null);
  const [delayReasonCat, setDelayReasonCat] = useState(DELAY_REASONS_EN[0]);
  const [delayReasonDetail, setDelayReasonDetail] = useState('');
  const [delayActionCat, setDelayActionCat] = useState(DELAY_ACTIONS_EN[0]);
  const [delayActionDetail, setDelayActionDetail] = useState('');
  const [delayRevisedDue, setDelayRevisedDue] = useState('');
  const [isSavingDelayAction, setIsSavingDelayAction] = useState(false);

  // Reassign Modal State
  const [reassignService, setReassignService] = useState<ServiceDeliverable | null>(null);

  // Specialized workspace states
  const [vatQuarter, setVatQuarter] = useState('Q3 2026');
  const [auditSignedLedger, setAuditSignedLedger] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<Array<{ id: string; label: string; done: boolean }>>([
    { id: 'c1', label: 'Verify general ledger entries reconciliation', done: true },
    { id: 'c2', label: 'Reconcile payroll summaries with Omani Social Insurance (PASI)', done: false },
    { id: 'c3', label: 'Match bank statements with synced feed entries', done: false },
    { id: 'c4', label: 'Review accuracy of accounting tax provision settings', done: false }
  ]);
  const [proposals, setProposals] = useState([
    { id: 'p_01', client: 'Khimji Group', type: 'Strategic Feasibility', budget: 'OMR 4,500', status: 'pending' },
    { id: 'p_02', client: 'Sohar Steel Co', type: 'Liquidation Advisory', budget: 'OMR 2,800', status: 'approved' }
  ]);

  // Directives
  const directives = [
    { id: 'd1', text: isAr ? 'تسريع دورة المراجعة القانونية للشركات ذات الأولوية.' : 'Accelerate statutory review cycle for high-priority accounts.', issuedBy: 'Executive Management', date: '2026-07-01' },
    { id: 'd2', text: isAr ? 'يجب إخضاع جميع التسليمات لتدقيق الجودة الثنائي قبل الإغلاق النهائي.' : 'All deliverable files must undergo dual-verification before final sign-off.', issuedBy: 'Quality Assurance Head', date: '2026-07-03' }
  ];

  // ── Load Saved Delay Logs ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hod_delay_logs');
      if (saved) {
        setDelayLogs(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error reading delay logs:', e);
    }
  }, []);

  // ── Fetch Core Department Data from Supabase ───────────────────────────────
  const fetchDepartmentData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: sData, error: sErr },
        { data: pData, error: pErr },
        { data: cData, error: cErr },
        { data: lData, error: lErr }
      ] = await Promise.all([
        supabase
          .from('services')
          .select(`
            id,
            title,
            description,
            status,
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
              role,
              department_id
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, role, department_id, email, phone').order('full_name'),
        supabase.from('clients').select('id, company_name, email, phone').order('company_name'),
        supabase.from('hr_leave_requests').select('*').order('created_at', { ascending: false })
      ]);

      if (sErr) console.error('HOD fetch services error:', sErr);
      if (pErr) console.error('HOD fetch profiles error:', pErr);
      if (cErr) console.error('HOD fetch clients error:', cErr);

      // Filter employees by department
      const allProfiles: EmployeeProfile[] = (pData as any[]) || [];
      const deptEmployees = allProfiles.filter(p => {
        if (!p.department_id) return true; // Include unassigned as eligible
        const d = p.department_id.toLowerCase();
        return d === currentDeptId || d.includes(currentDeptId) || currentDeptId.includes(d);
      });

      // Map services for this department
      const allServices: ServiceDeliverable[] = (sData as any[]) || [];
      const deptServices = allServices.filter(s => {
        // Check if assigned employee is in this department or if service title matches department config
        const emp = allProfiles.find(p => p.id === s.employee_id);
        const matchesEmp = emp && (emp.department_id === currentDeptId || (emp.department_id || '').includes(currentDeptId));
        const matchesTitle = deptConfig?.services.some(srv => s.title.toLowerCase().includes(srv.toLowerCase()));
        return matchesEmp || matchesTitle || allServices.length < 5;
      });

      // Calculate real workload & stats per employee
      const calculatedPersonnel: EmployeeProfile[] = (deptEmployees.length > 0 ? deptEmployees : allProfiles.slice(0, 5)).map(emp => {
        const empTasks = deptServices.filter(s => s.employee_id === emp.id);
        const activeTasks = empTasks.filter(s => s.status === 'ongoing' || s.status === 'under_review').length;
        const tasksCompleted = empTasks.filter(s => s.status === 'completed').length;
        const delayed = empTasks.filter(s => s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed')).length;
        const load = Math.min(100, Math.max(20, (activeTasks * 25) + (delayed * 15)));
        const accuracy = empTasks.length > 0 ? Math.max(85, 100 - (delayed * 4)) : 98;

        return {
          ...emp,
          activeTasks,
          tasksCompleted,
          delayed,
          load,
          accuracy
        };
      });

      setPersonnel(calculatedPersonnel);
      setServices(deptServices.length > 0 ? deptServices : allServices);
      if (cData) setClients(cData);
      if (lData) setHodLeaveRequests(lData);

      // Default task form dropdowns
      if (cData && cData.length > 0 && !taskClientId) setTaskClientId(cData[0].id);
      if (calculatedPersonnel.length > 0 && !taskEmployeeId) setTaskEmployeeId(calculatedPersonnel[0].id);

    } catch (err) {
      console.error('HOD Workspace Fetch Error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [currentDeptId, deptConfig, taskClientId, taskEmployeeId]);

  useEffect(() => {
    fetchDepartmentData();

    // Live Supabase Realtime Subscription
    const channel = supabase
      .channel(`hod-${currentDeptId}-live-sync`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchDepartmentData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchDepartmentData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchDepartmentData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_leave_requests' }, () => fetchDepartmentData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDepartmentData, currentDeptId]);

  // ── Action: Dispatch New Task Directly to Supabase ─────────────────────────
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      alert(isAr ? 'يرجى كتابة عنوان المهمة' : 'Please enter a task title');
      return;
    }

    setIsSubmittingTask(true);
    try {
      const targetClient = clients.find(c => c.id === taskClientId) || clients[0];
      const targetEmp = personnel.find(p => p.id === taskEmployeeId) || personnel[0];

      const { data, error } = await supabase
        .from('services')
        .insert([{
          title: taskTitle.trim(),
          description: taskDesc.trim() || null,
          client_id: targetClient?.id || null,
          employee_id: targetEmp?.id || null,
          due_date: taskDue || null,
          status: 'ongoing'
        }])
        .select()
        .single();

      if (error) throw error;

      // Broadcast Activity Log
      await logActivity(
        user?.id || '',
        user?.user_metadata?.full_name || user?.email || 'Department Head',
        'task_dispatched',
        `[${deptConfig?.name}] Dispatched task '${taskTitle}' assigned to ${targetEmp?.full_name || 'Staff'} for ${targetClient?.company_name || 'Client'}`,
        `[${deptConfig?.name}] تم إسناد المهمة '${taskTitle}' إلى ${targetEmp?.full_name || 'موظف'} لصالح شركة ${targetClient?.company_name || 'العميل'}`
      );

      // Reset form
      setTaskTitle('');
      setTaskDesc('');
      setTaskDue(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
      alert(isAr ? 'تم إسناد وتوجيه المهمة بنجاح إلى النظام!' : 'Task successfully dispatched and assigned in live database!');
      fetchDepartmentData(true);
    } catch (err: any) {
      alert(err.message || 'Error creating task');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // ── Action: Reassign Employee Directly in Supabase ─────────────────────────
  const handleReassignSubmit = async (serviceId: string, newEmployeeId: string) => {
    const assignedEmp = personnel.find(p => p.id === newEmployeeId);
    
    // Optimistic Update
    setServices(prev => prev.map(s => s.id === serviceId ? {
      ...s,
      employee_id: newEmployeeId,
      profiles: assignedEmp ? { full_name: assignedEmp.full_name, role: assignedEmp.role } : null
    } : s));

    const { error } = await supabase
      .from('services')
      .update({ employee_id: newEmployeeId })
      .eq('id', serviceId);

    setReassignService(null);
    if (error) {
      console.error('Failed to reassign:', error);
      fetchDepartmentData(true);
    } else {
      await logActivity(
        user?.id || '',
        user?.user_metadata?.full_name || user?.email || 'Department Head',
        'service_updated',
        `[${deptConfig?.name}] Reassigned task to ${assignedEmp?.full_name || 'Employee'}`,
        `[${deptConfig?.name}] تم تغيير المسؤول عن المهمة إلى ${assignedEmp?.full_name || 'الموظف'}`
      );
    }
  };

  // ── Action: Quick Status / Kanban Move ─────────────────────────────────────
  const handleUpdateStatus = async (serviceId: string, newStatus: ServiceDeliverable['status']) => {
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: newStatus } : s));

    const { error } = await supabase
      .from('services')
      .update({ status: newStatus })
      .eq('id', serviceId);

    if (error) {
      console.error('Failed to update status:', error);
      fetchDepartmentData(true);
    }
  };

  // ── Action: Log Delay Root-Cause & Corrective Action ───────────────────────
  const handleSaveDelayAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelayService) return;

    setIsSavingDelayAction(true);
    try {
      const record: DelayLogRecord = {
        serviceId: selectedDelayService.id,
        reasonCategory: delayReasonCat,
        reasonDetail: delayReasonDetail,
        actionCategory: delayActionCat,
        actionDetail: delayActionDetail,
        revisedDueDate: delayRevisedDue || selectedDelayService.due_date || undefined,
        loggedAt: new Date().toISOString(),
        loggedBy: user?.user_metadata?.full_name || user?.email || 'HOD'
      };

      // Save locally and in state
      const updatedLogs = { ...delayLogs, [selectedDelayService.id]: record };
      setDelayLogs(updatedLogs);
      localStorage.setItem('hod_delay_logs', JSON.stringify(updatedLogs));

      // If a revised due date is given, optionally update services.due_date
      if (delayRevisedDue) {
        await supabase
          .from('services')
          .update({ due_date: delayRevisedDue })
          .eq('id', selectedDelayService.id);
      }

      // Dual-Alert Broadcast to activity_log (Visible to Manager & HOD)
      const empName = selectedDelayService.profiles?.full_name || 'Assignee';
      const compName = selectedDelayService.clients?.company_name || 'Client';
      
      await logActivity(
        user?.id || '',
        user?.user_metadata?.full_name || user?.email || 'Department Head',
        'delay_action_logged',
        `[${deptConfig?.name} Alert] HOD Corrective Action for '${selectedDelayService.title}' (${compName}, ${empName}): Reason - '${delayReasonCat}'; Action - '${delayActionCat}'`,
        `[تنبيه قسم ${deptConfig?.name}] إجراء تصحيحي من رئيس القسم لمهمة '${selectedDelayService.title}' (${compName}, ${empName}): السبب - '${delayReasonCat}'; الإجراء - '${delayActionCat}'`
      );

      alert(isAr 
        ? 'تم توثيق وتعميم الإجراء التصحيحي وإشعار الإدارة العامة بنجاح!' 
        : 'Corrective action logged and broadcasted to Executive Management successfully!');

      setSelectedDelayService(null);
      setDelayReasonDetail('');
      setDelayActionDetail('');
      fetchDepartmentData(true);
    } catch (err: any) {
      alert(err.message || 'Error saving delay action');
    } finally {
      setIsSavingDelayAction(false);
    }
  };

  // ── Action: HOD Leave Request Approval ─────────────────────────────────────
  const handleHodLeaveAction = async (id: string, action: 'Approved' | 'Rejected') => {
    try {
      await supabase
        .from('hr_leave_requests')
        .update({ managerApproval: action, status: action === 'Approved' ? 'Pending HR' : 'Rejected' })
        .eq('id', id);

      setHodLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, managerApproval: action } : r));
      alert(action === 'Approved' 
        ? (isAr ? 'تمت الموافقة المبدئية وتحويل الطلب إلى الموارد البشرية (HR)' : 'Leave authorized by HOD and forwarded to HR!') 
        : (isAr ? 'تم رفض طلب الإجازة.' : 'Leave request rejected by HOD.'));
    } catch (err) {
      console.error(err);
    }
  };

  // Active path view parser
  const getViewFromPath = () => {
    const path = location.pathname;
    if (path.includes('/team-leadership')) return 'team';
    if (path.includes('/work-routing'))   return 'routing';
    if (path.includes('/quality-control')) return 'quality';
    if (path.includes('/client-directory'))return 'clients';
    if (path.includes('/coordination'))    return 'coordination';
    if (path.includes('/performance'))     return 'performance';
    return 'dashboard';
  };
  const activeView = getViewFromPath();

  // Metrics computation
  const overdueServices = services.filter(s => s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed'));
  const completedServices = services.filter(s => s.status === 'completed');
  const activeServices = services.filter(s => s.status === 'ongoing' || s.status === 'under_review');
  const completionRate = services.length > 0 ? Math.round((completedServices.length / services.length) * 100) : 100;
  const avgLoad = personnel.length > 0 ? Math.round(personnel.reduce((sum, p) => sum + (p.load || 50), 0) / personnel.length) : 60;

  // ─────────────────────────────────────────────────────────────────────────
  // SUB-VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  // 1. Dashboard View
  const renderDashboardView = () => {
    return (
      <div className="space-y-6">
        {/* KPI Command Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:border-brand-dark/30 transition-all">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'معدل إنجاز المهام' : 'Department Completion'}</p>
              <h3 className="text-3xl font-black text-gray-900 leading-none">{completionRate}%</h3>
            </div>
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold mt-4">
              <TrendingUp size={14} />
              <span>{completedServices.length} {isAr ? 'مهام منجزة' : 'Deliverables Completed'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:border-brand-dark/30 transition-all">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'أعباء عمل الفريق' : 'Team Unit Capacity'}</p>
              <h3 className="text-3xl font-black text-gray-900 leading-none">{avgLoad}%</h3>
            </div>
            <div className="flex items-center gap-1.5 text-brand-dark text-xs font-bold mt-4">
              <Activity size={14} />
              <span>{personnel.length} {isAr ? 'موظفين تحت الإشراف' : 'Assigned Staff Members'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:border-brand-dark/30 transition-all">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'العمليات النشطة' : 'Active Deliverables'}</p>
              <h3 className="text-3xl font-black text-gray-900 leading-none">{activeServices.length}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold mt-4">
              <ShieldCheck size={14} />
              <span>{isAr ? 'قيد التنفيذ والمراجعة' : 'In Production Pipeline'}</span>
            </div>
          </div>

          <div className={`rounded-2xl p-6 shadow-sm border flex flex-col justify-between transition-all ${
            overdueServices.length > 0 ? 'bg-red-500 text-white shadow-lg shadow-red-500/10' : 'bg-white border-gray-100'
          }`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                overdueServices.length > 0 ? 'text-white/80' : 'text-gray-400'
              }`}>{isAr ? 'التسليمات المتعثرة' : 'Delayed Bottlenecks'}</p>
              <h3 className={`text-3xl font-black leading-none ${overdueServices.length > 0 ? 'text-white' : 'text-gray-900'}`}>
                {overdueServices.length}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold mt-4">
              <AlertTriangle size={14} className={overdueServices.length > 0 ? 'text-white' : 'text-gray-400'} />
              <span className={overdueServices.length > 0 ? 'text-white' : 'text-gray-500'}>
                {overdueServices.length > 0 ? (isAr ? 'تتطلب تدخلاً وتوثيق إجراء' : 'Requires HOD Action') : (isAr ? 'الجميع في المسار' : 'On Track')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Delayed Deliverables Alert & Action Station ───────────────────── */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" />
                {isAr ? 'محطة متابعة التأخيرات وتوثيق الإجراءات' : 'Delay Escalation & Corrective Action Hub'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {isAr 
                  ? 'رصد الموظفين المتعثرين وتوثيق سبب التأخير والإجراء المتخذ لإشعار الإدارة التنفيذية' 
                  : 'Identify slippages, document root cause and record corrective intervention for executive review'}
              </p>
            </div>
            <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
              {overdueServices.length} {isAr ? 'مهام متأخرة' : 'Overdue Items'}
            </span>
          </div>

          {overdueServices.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-bold text-xs bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500 opacity-60" />
              {isAr ? 'رائع! لا توجد تسليمات متأخرة بالقسم حالياً.' : 'Excellent! All department deliverables are on track.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overdueServices.map(svc => {
                const log = delayLogs[svc.id];
                const now = new Date();
                const due = svc.due_date ? new Date(svc.due_date) : now;
                const daysOverdue = Math.max(1, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));

                return (
                  <div key={svc.id} className="border border-red-100 rounded-2xl p-5 bg-red-50/30 hover:border-red-200 transition-all flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-100/80 px-2 py-0.5 rounded">
                            {daysOverdue} {isAr ? 'أيام تأخير' : 'Days Overdue'}
                          </span>
                          <h4 className="font-black text-sm text-gray-900 mt-1.5">{svc.title}</h4>
                          <p className="text-xs text-gray-500 font-bold flex items-center gap-1.5 mt-0.5">
                            <Building2 size={12} className="text-gray-400" />
                            {svc.clients?.company_name || 'Client'}
                          </p>
                        </div>
                        <div className="text-end">
                          <span className="text-[10px] font-bold text-gray-400 block">{isAr ? 'الموعد:' : 'Due:'} {svc.due_date || 'N/A'}</span>
                          <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1 inline-block">
                            {svc.status}
                          </span>
                        </div>
                      </div>

                      {/* Assignee Card */}
                      <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-red-50">
                        <div className="w-6 h-6 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] font-black">
                          {svc.profiles?.full_name ? svc.profiles.full_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="text-start">
                          <span className="text-xs font-bold text-gray-800 block leading-tight">{svc.profiles?.full_name || 'Unassigned'}</span>
                          <span className="text-[9px] text-gray-400 font-medium">{svc.profiles?.role || 'Staff'}</span>
                        </div>
                      </div>

                      {/* Logged HOD Action display if exists */}
                      {log ? (
                        <div className="bg-white/80 border border-green-200 rounded-xl p-3 space-y-1 text-start">
                          <div className="flex items-center gap-1.5 text-green-700 font-black text-[10px]">
                            <CheckCircle size={12} />
                            <span>{isAr ? 'تم توثيق الإجراء بواسطة رئيس القسم' : 'HOD Action Recorded'}</span>
                          </div>
                          <p className="text-[11px] text-gray-700 font-semibold">
                            <strong className="text-gray-900">{isAr ? 'السبب:' : 'Reason:'}</strong> {log.reasonCategory} {log.reasonDetail && `(${log.reasonDetail})`}
                          </p>
                          <p className="text-[11px] text-gray-700 font-semibold">
                            <strong className="text-gray-900">{isAr ? 'الإجراء المتخذ:' : 'Action Taken:'}</strong> {log.actionCategory} {log.actionDetail && `(${log.actionDetail})`}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 font-bold flex items-center gap-2">
                          <HelpCircle size={14} className="shrink-0 text-amber-600" />
                          <span>{isAr ? 'لم يتم توثيق سبب التأخير بعد؛ يرجى تسجيل الإجراء.' : 'No delay action recorded yet; action required.'}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-red-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setReassignService(svc)}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:border-brand-dark text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <UserPlus size={13} />
                        <span>{isAr ? 'إعادة تعيين' : 'Reassign'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDelayService(svc);
                          setDelayReasonCat(DELAY_REASONS_EN[0]);
                          setDelayActionCat(DELAY_ACTIONS_EN[0]);
                          setDelayRevisedDue(svc.due_date || '');
                        }}
                        className="px-4 py-1.5 bg-brand-dark hover:bg-brand text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <AlertTriangle size={13} />
                        <span>{log ? (isAr ? 'تعديل الإجراء' : 'Update Action') : (isAr ? 'تسجيل إجراء التأخير' : 'Log Delay Action')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Management Directives Panel */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-sm font-black text-brand-dark uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={18} /> {isAr ? 'توجيهات وقرارات الإدارة العامة' : 'Management Directives'}
          </h3>
          <div className="space-y-3">
            {directives.map(d => (
              <div key={d.id} className="flex justify-between items-center bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-dark mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{d.text}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">Issued By: {d.issuedBy} &bull; {d.date}</p>
                  </div>
                </div>
                <span className="bg-brand-dark/10 text-brand-dark text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border border-brand-dark/20 shrink-0">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contextual Specialist Module */}
        {renderSpecialistWorkspace()}
      </div>
    );
  };

  // 2. Team Leadership View
  const renderTeamView = () => {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-gray-50 pb-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Users className="text-brand-dark" size={20} />
              {isAr ? 'إدارة طاقم العمل ومراقبة القدرة التشغيلية' : 'Team Leadership & Workload Distribution'}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {isAr ? 'تحليل معدل توزيع المهام والإنتاجية لكل موظف بالقسم' : 'Real-time staff allocation, active deliverables, and capacity metrics'}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-black text-brand-dark uppercase tracking-wider">
            {personnel.length} {isAr ? 'موظفين' : 'Staff Members'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {personnel.map(emp => {
            const isOverloaded = (emp.load || 50) > 80;
            return (
              <div key={emp.id} className="border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-all bg-gray-50/40 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-brand-dark/10 text-brand-dark font-black flex items-center justify-center text-sm">
                        {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-gray-900">{emp.full_name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold capitalize">{emp.role}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                      isOverloaded 
                        ? 'bg-red-50 text-red-700 border-red-150' 
                        : 'bg-green-50 text-green-700 border-green-150'
                    }`}>
                      {isOverloaded ? 'High Load' : 'Optimal'}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>{isAr ? 'عبء العمل' : 'Allocation Load'}</span>
                      <span className={isOverloaded ? 'text-red-600 font-black' : 'text-gray-700 font-black'}>{emp.load}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-green-500'}`} 
                        style={{ width: `${emp.load}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 mt-4 text-center">
                  <div className="bg-white p-2 rounded-xl border border-gray-100">
                    <span className="text-[9px] text-gray-400 font-bold block">{isAr ? 'نشط' : 'Active'}</span>
                    <span className="text-xs font-black text-gray-900">{emp.activeTasks || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-100">
                    <span className="text-[9px] text-gray-400 font-bold block">{isAr ? 'منجز' : 'Done'}</span>
                    <span className="text-xs font-black text-green-600">{emp.tasksCompleted || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-100">
                    <span className="text-[9px] text-gray-400 font-bold block">{isAr ? 'متأخر' : 'Delayed'}</span>
                    <span className={`text-xs font-black ${emp.delayed && emp.delayed > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {emp.delayed || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* HOD Team Leave Approvals Section */}
        <div className="border-t border-gray-100 pt-6 space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="text-brand-dark" size={18} />
            {isAr ? 'اعتماد إجازات موظفي القسم' : 'HOD Leave Authorization Queue'}
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            {isAr ? 'موافقة رئيس القسم المبدئية قبل تحويل الطلبات إلى الموارد البشرية' : 'Authorize leave requests ensuring department workload coverage.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hodLeaveRequests.filter(r => r.managerApproval === 'Pending' || r.status === 'Pending').map(req => (
              <div key={req.id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 shadow-xs hover:border-gray-200 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-gray-900">{req.employeeName || req.employee_name || 'Staff Member'}</h4>
                      <span className="text-[8px] bg-red-50 text-brand-dark px-2 py-0.5 rounded font-black uppercase tracking-wider">{req.type || 'Annual'}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">#{req.id?.substring(0,6)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Duration</p>
                      <p className="font-black text-gray-800">{req.startDate || req.start_date} to {req.endDate || req.end_date}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Total Days</p>
                      <p className="font-black text-gray-800">{req.days || 1} Days</p>
                    </div>
                  </div>
                  {req.notes && (
                    <p className="text-xs text-gray-600 font-medium mt-2 italic bg-white p-2 rounded-xl border border-gray-100">&ldquo;{req.notes}&rdquo;</p>
                  )}
                </div>

                <div className="mt-4 flex gap-2 justify-end border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleHodLeaveAction(req.id, 'Rejected')}
                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:text-red-700 hover:border-red-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {isAr ? 'رفض' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleHodLeaveAction(req.id, 'Approved')}
                    className="px-4 py-2 bg-brand-dark text-white hover:bg-brand rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    {isAr ? 'اعتماد وتحويل لـ HR' : 'Authorize & Forward'}
                  </button>
                </div>
              </div>
            ))}
            {hodLeaveRequests.filter(r => r.managerApproval === 'Pending' || r.status === 'Pending').length === 0 && (
              <div className="col-span-2 p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white">
                <CheckCircle2 className="mx-auto mb-1 opacity-25" size={24} />
                <p className="text-xs font-bold">{isAr ? 'لا توجد طلبات إجازة معلقة للمراجعة حالياً.' : 'No pending leave requests requiring department head authorization.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 3. Work Routing View (Live Task Dispatcher)
  const renderRoutingView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigner Matrix Form */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <PlusCircle size={18} className="text-brand-dark" />
            {isAr ? 'توجيه وتعيين مهمة جديدة' : 'Direct Task Dispatcher'}
          </h3>
          <p className="text-xs text-gray-400 font-medium mb-4">
            {isAr ? 'إنشاء مهام جديدة مباشرة في قاعدة بيانات النظام' : 'Creates real deliverable entries in Supabase synced with Employee portal.'}
          </p>

          <form className="space-y-4" onSubmit={handleAssignTask}>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'عنوان المهمة / الخدمة' : 'Service Title'}</label>
              <input 
                type="text" 
                required
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none" 
                placeholder={isAr ? 'مثال: إعداد الإقرار الضريبي...' : 'e.g. Audit Draft Sign-off'}
              />

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 mt-2">
                {deptConfig?.services.slice(0, 3).map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setTaskTitle(s)}
                    className="text-[9px] bg-gray-100 hover:bg-brand-dark hover:text-white px-2 py-0.5 rounded font-bold text-gray-600 transition-all cursor-pointer"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'نطاق العمل والملاحظات' : 'Scope / Instructions'}</label>
              <textarea 
                rows={2}
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none resize-none" 
                placeholder={isAr ? 'تفاصيل المهمة...' : 'Expectations and specific notes...'}
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'الشركة / العميل' : 'Client Company'}</label>
              <select 
                value={taskClientId}
                onChange={e => setTaskClientId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none cursor-pointer"
              >
                {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.company_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'الموظف المسؤول' : 'Assigned Staff'}</label>
              <select 
                value={taskEmployeeId}
                onChange={e => setTaskEmployeeId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none cursor-pointer"
              >
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role}) - {p.load || 50}% load
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'الموعد النهائي (SLA)' : 'Hard Deadline'}</label>
              <input 
                type="date" 
                required
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmittingTask}
              className="w-full bg-brand-dark text-white rounded-xl py-3 text-xs font-black uppercase tracking-widest hover:bg-brand transition-colors mt-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingTask ? '...' : (isAr ? 'إسناد المهمة وتعميمها' : 'Dispatch Task to System')}
            </button>
          </form>
        </div>

        {/* Current Dispatched Tasks Live Ledger */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Clock size={18} className="text-brand-dark" />
                {isAr ? 'سجل المهام الموزعة الحية' : 'Live Department Deliverables Ledger'}
              </h3>
              <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-50 px-2.5 py-1 rounded-xl">
                {services.length} {isAr ? 'مهام' : 'Tasks'}
              </span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto no-scrollbar pr-1">
              {services.map(s => {
                const isDelayed = s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed');
                return (
                  <div key={s.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-gray-50/70 rounded-2xl border border-gray-100 gap-3 hover:border-gray-200 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.status === 'completed' ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <h4 className="font-black text-sm text-gray-900">{s.title}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                        <span><strong>Client:</strong> {s.clients?.company_name || 'Client'}</span>
                        <span>&bull;</span>
                        <span><strong>Assignee:</strong> {s.profiles?.full_name || 'Unassigned'}</span>
                        <span>&bull;</span>
                        <span><strong>Due:</strong> {s.due_date || 'N/A'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        s.status === 'completed' ? 'bg-green-50 text-green-700' : isDelayed ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {s.status}
                      </span>
                      <button
                        onClick={() => setReassignService(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-dark hover:bg-white transition-colors cursor-pointer"
                        title={isAr ? 'إعادة التعيين' : 'Reassign'}
                      >
                        <UserPlus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. Quality Control & Live Kanban Intervention
  const renderQualityView = () => {
    const statuses: Array<'ongoing' | 'under_review' | 'delayed' | 'completed'> = ['ongoing', 'under_review', 'delayed', 'completed'];

    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CheckSquare className="text-brand-dark" size={20} />
            {isAr ? 'لوحة المراقبة الحية والتدخل الفوري (كانبان)' : 'Real-Time Kanban Intervention Board'}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {isAr ? 'متابعة مراحل التنفيذ وإجراء تعديلات وتدخلات فورية بالقسم' : 'Track live progress and execute reassignments or corrective actions on deliverables'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {statuses.map(st => {
            const list = services.filter(s => {
              if (st === 'delayed') return s.status === 'delayed' || (s.due_date && new Date(s.due_date) < new Date() && s.status !== 'completed');
              if (st === 'ongoing') return s.status === 'ongoing' && !(s.due_date && new Date(s.due_date) < new Date());
              return s.status === st;
            });

            const titles: Record<string, string> = {
              ongoing: isAr ? 'قيد التنفيذ' : 'In Progress',
              under_review: isAr ? 'تحت المراجعة' : 'Under Review',
              delayed: isAr ? 'متأخرة / متعثرة' : 'Delayed / Action',
              completed: isAr ? 'مكتملة' : 'Completed'
            };

            const headerColors: Record<string, string> = {
              ongoing: 'text-blue-600',
              under_review: 'text-amber-600',
              delayed: 'text-red-600',
              completed: 'text-green-600'
            };

            return (
              <div key={st} className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 min-h-[440px] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                  <h4 className={`font-black text-xs uppercase tracking-widest ${headerColors[st]}`}>{titles[st]}</h4>
                  <span className="bg-white text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs border border-gray-100">
                    {list.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                  {list.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3 text-start hover:shadow-md transition-all">
                      <div>
                        <h5 className="font-bold text-xs text-gray-900">{s.title}</h5>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{s.clients?.company_name || 'Client'}</p>
                        <p className="text-[10px] text-gray-600 font-bold mt-1">
                          {isAr ? 'المسؤول:' : 'Assigned:'} {s.profiles?.full_name || 'Unassigned'}
                        </p>
                      </div>

                      <div className="flex gap-1.5 pt-2 border-t border-gray-50 justify-between items-center text-[9px]">
                        <span className="text-gray-400 font-bold">Due: {s.due_date || 'N/A'}</span>
                        
                        <div className="flex items-center gap-1">
                          {st !== 'completed' && (
                            <button 
                              onClick={() => handleUpdateStatus(s.id, 'completed')}
                              className="bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-[8px] font-black uppercase transition-colors cursor-pointer"
                              title={isAr ? 'تحديد كمكتمل' : 'Mark Completed'}
                            >
                              ✓ Done
                            </button>
                          )}
                          <button 
                            onClick={() => setReassignService(s)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-[8px] font-black uppercase transition-colors cursor-pointer"
                          >
                            Reassign
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="text-center py-8 text-gray-300 font-bold text-[10px]">
                      {isAr ? 'فارغ' : 'Empty'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 5. Client Directory View
  const renderClientsView = () => {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Briefcase className="text-brand-dark" size={20} />
            {isAr ? 'دليل عملاء القسم المباشر' : 'Department Client Directory'}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {isAr ? 'العملاء المستفيدون من خدمات هذا القسم حالياً' : 'Companies currently receiving services and deliverables from your department'}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-start whitespace-nowrap">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الشركة / العميل' : 'Company Name'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'التواصل' : 'Contact'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المهام المسندة' : 'Engagements'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(cl => {
                const clientTasks = services.filter(s => s.client_id === cl.id);
                const hasDelay = clientTasks.some(s => s.status === 'delayed');

                return (
                  <tr key={cl.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-sm text-gray-900 flex items-center gap-2">
                      <Building2 size={16} className="text-brand-dark shrink-0" />
                      {cl.company_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">
                      {cl.email || cl.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-700">
                      {clientTasks.length} {isAr ? 'عمليات' : 'Services'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        hasDelay ? 'bg-red-50 text-red-700 border-red-150' : 'bg-green-50 text-green-700 border-green-150'
                      }`}>
                        {hasDelay ? 'Attention Needed' : 'Good Standing'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 6. Coordination Hub View
  const renderCoordinationView = () => {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Layers className="text-brand-dark" size={20} />
            {isAr ? 'مركز التنسيق والتكامل بين الأقسام' : 'Cross-Department Coordination Hub'}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {isAr ? 'متابعة المشروعات والطلبات المشتركة بين الأقسام' : 'Oversee cross-functional services requiring inter-department collaboration'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-red-50 text-brand-dark text-[8px] font-black uppercase px-2 py-0.5 rounded border border-red-150">Audit &harr; Tax & VAT</span>
              <h4 className="font-black text-sm text-gray-900 mt-2">Annual Statutory Tax Verification</h4>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Audit files require VAT transaction summaries.</p>
            </div>
            <span className="bg-green-50 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-green-150 uppercase tracking-widest">
              Synced & Completed
            </span>
          </div>

          <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-red-50 text-brand-dark text-[8px] font-black uppercase px-2 py-0.5 rounded border border-red-150">Bookkeeping &harr; Client Success</span>
              <h4 className="font-black text-sm text-gray-900 mt-2">Client Bank Account Feeds Integration</h4>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Client Success team coordinating with bank advisors for access.</p>
            </div>
            <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-amber-150 uppercase tracking-widest">
              Pending Coordination
            </span>
          </div>
        </div>
      </div>
    );
  };

  // 7. Performance Reports View
  const renderPerformanceView = () => {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileBarChart className="text-brand-dark" size={20} />
            {isAr ? 'سجل الأداء والمؤشرات الرقابية للقسم' : 'Performance Analytics Ledger'}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {isAr ? 'مؤشرات الأداء التاريخية، دقة العمليات، والملاحظات الإشرافية' : 'Historical tracking of staff accuracy, timely completions, and internal review logs'}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-start whitespace-nowrap">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المهام المنجزة' : 'Completions'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المتأخرات' : 'Delays'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'مؤشر الدقة' : 'Accuracy Index'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'ملاحظة المشرف ورئيس القسم' : 'Review Remarks'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {personnel.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-sm text-gray-900">{p.full_name}</p>
                    <p className="text-[9px] text-gray-400 font-bold capitalize mt-0.5">{p.role}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-700">{p.tasksCompleted || 0}</td>
                  <td className="px-6 py-4 text-xs font-bold text-red-600">{p.delayed || 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">{p.accuracy || 98}%</span>
                      <div className="w-16 bg-gray-100 h-1.5 rounded-full">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${p.accuracy || 98}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-500">
                    {(p.delayed || 0) > 1 
                      ? (isAr ? 'تم رصد تأخير متكرر؛ يتطلب توجيه وإشراف.' : 'Deadline slippage noted; coaching required.')
                      : (isAr ? 'أداء ممتاز وملتزم بالدقة والمواعيد.' : 'Demonstrates excellent work quality and compliance.')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Contextual Specialist Workspace Modules ────────────────────────────────
  const renderSpecialistWorkspace = () => {
    switch (currentDeptId) {
      case 'audit':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={16} /> {isAr ? 'مسار مراحل التدقيق' : 'Engagement Stages Pipeline'}
              </h3>
              <div className="space-y-3">
                {['Statutory Audit Review', 'Internal Controls Compliance'].map((proj, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-xs text-gray-900 mb-2">{proj}</h4>
                    <div className="flex justify-between items-center text-[9px] text-gray-400 font-black uppercase tracking-wider">
                      <span className="text-brand-dark">Planning</span>
                      <ChevronRight size={10} />
                      <span className="text-brand-dark">Fieldwork</span>
                      <ChevronRight size={10} />
                      <span className={idx === 0 ? 'text-brand-dark' : ''}>Draft Report</span>
                      <ChevronRight size={10} />
                      <span>Final Sign-off</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckSquare size={16} /> {isAr ? 'مركز اعتماد وتوقيع التقارير' : 'Report Sign-Off & Verification'}
              </h3>
              <div className="space-y-3">
                {clients.slice(0, 3).map(cl => (
                  <div key={cl.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-bold text-xs text-gray-900">{cl.company_name}</p>
                      <p className="text-[9px] text-gray-400 mt-1">Audit Report Sign-off</p>
                    </div>
                    {auditSignedLedger.includes(cl.id) ? (
                      <span className="bg-green-50 text-green-700 text-[8px] font-black uppercase px-2 py-1 rounded border border-green-150 flex items-center gap-1">
                        <CheckCircle2 size={10} /> SIGNED
                      </span>
                    ) : (
                      <button 
                        onClick={() => {
                          setAuditSignedLedger(prev => [...prev, cl.id]);
                          alert(isAr ? 'تم توقيع وتصديق تقرير الحسابات الختامي بنجاح.' : 'Audit report signed & verified successfully.');
                        }}
                        className="bg-brand-dark hover:bg-brand text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Sign-Off
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'tax_vat':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={16} /> {isAr ? 'تقويم الإقرارات الضريبية' : 'Regulatory VAT Calendar'}
                </h3>
                <span className="text-[10px] bg-red-50 text-brand-dark font-black px-2.5 py-0.5 rounded-lg border border-red-100">{vatQuarter}</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-xs text-gray-900">VAT Quarterly Return</p>
                    <p className="text-[9px] text-gray-400 mt-1">Target Submission: 2026-07-28</p>
                  </div>
                  <span className="bg-amber-50 text-amber-700 text-[8px] font-black px-2 py-1 rounded border border-amber-150 uppercase tracking-widest">
                    Action Required
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-brand-dark text-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -end-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/70 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} /> {isAr ? 'محرك تنبيهات الغرامات المالية' : 'Penalty Alert Engine'}
                </h3>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl space-y-2">
                  <h4 className="font-black text-sm">Tax Certificate Expiration Watch</h4>
                  <p className="text-[11px] text-white/80">Automated monitoring for expiry deadlines to avoid tax authority penalty fines.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'bookkeeping':
        return (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={16} /> {isAr ? 'قائمة الفحص للإغلاق الشهري' : 'Interactive Monthly Closure Checklist'}
              </h3>
              <span className="text-[10px] bg-green-50 text-green-700 border border-green-150 px-2.5 py-0.5 rounded-lg font-black">
                {checklist.filter(c => c.done).length} / {checklist.length} Completed
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklist.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: !c.done } : c))}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    item.done ? 'bg-green-50/30 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    item.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                  }`}>
                    {item.done && <CheckCircle2 size={10} />}
                  </div>
                  <span className={`text-xs font-bold ${item.done ? 'text-green-800 line-through' : 'text-gray-700'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'team': return renderTeamView();
      case 'routing': return renderRoutingView();
      case 'quality': return renderQualityView();
      case 'clients': return renderClientsView();
      case 'coordination': return renderCoordinationView();
      case 'performance': return renderPerformanceView();
      default: return renderDashboardView();
    }
  };

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── View Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <ShieldCheck className="text-brand-dark" size={26} />
            {isAr ? 'بوابة رئيس القسم الإشرافية' : 'Department Head Control Center'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr 
              ? `إدارة عمليات قسم: ${deptConfig?.name || ''} والرقابة على الفريق والمهام الموزعة` 
              : `Supervisory operations control for ${deptConfig?.name || ''} unit`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDepartmentData()}
            className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 hover:text-brand-dark transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            title={isAr ? 'تحديث البيانات' : 'Sync Live Data'}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Sync'}</span>
          </button>

          <span className="bg-red-50 text-brand-dark border border-red-100 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-wider">
            {deptConfig?.name}
          </span>
        </div>
      </div>

      {/* ── Active View Rendering ───────────────────────────────────────── */}
      {loading ? (
        <div className="p-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {renderActiveView()}
        </div>
      )}

      {/* ── Delay Action & Root-Cause Logging Modal ───────────────────────── */}
      {selectedDelayService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 animate-scale-up border border-gray-100 text-start">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                {isAr ? 'توثيق سبب التأخير والإجراء المتخذ' : 'Log Delay Root Cause & HOD Action'}
              </h3>
              <button 
                onClick={() => setSelectedDelayService(null)} 
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-red-50/60 p-3.5 rounded-2xl border border-red-100 mb-4 space-y-1 text-xs">
              <p className="font-black text-gray-900">{selectedDelayService.title}</p>
              <p className="text-gray-600"><strong>{isAr ? 'العميل:' : 'Client:'}</strong> {selectedDelayService.clients?.company_name || 'Client'}</p>
              <p className="text-gray-600"><strong>{isAr ? 'الموظف المسؤول:' : 'Assignee:'}</strong> {selectedDelayService.profiles?.full_name || 'Unassigned'}</p>
            </div>

            <form onSubmit={handleSaveDelayAction} className="space-y-4 text-start">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'تصنيف سبب التأخير' : 'Delay Root Cause Category'}
                </label>
                <select
                  value={delayReasonCat}
                  onChange={e => setDelayReasonCat(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none cursor-pointer"
                >
                  {(isAr ? DELAY_REASONS_AR : DELAY_REASONS_EN).map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'تفاصيل إضافية حول سبب التأخير' : 'Specific Delay Notes'}
                </label>
                <textarea
                  rows={2}
                  value={delayReasonDetail}
                  onChange={e => setDelayReasonDetail(e.target.value)}
                  placeholder={isAr ? 'اكتب ملاحظات توضيحية إضافية...' : 'Describe specific circumstances...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-medium focus:border-brand-dark outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'الإجراء التصحيحي المتخذ من رئيس القسم' : 'Corrective Action Taken by HOD'}
                </label>
                <select
                  value={delayActionCat}
                  onChange={e => setDelayActionCat(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none cursor-pointer"
                >
                  {(isAr ? DELAY_ACTIONS_AR : DELAY_ACTIONS_EN).map((a, i) => (
                    <option key={i} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'تفاصيل الإجراء والمتابعة' : 'Action Details & Follow-up Plan'}
                </label>
                <textarea
                  rows={2}
                  value={delayActionDetail}
                  onChange={e => setDelayActionDetail(e.target.value)}
                  placeholder={isAr ? 'تفاصيل الإجراء وخطة تدارك التأخير...' : 'Action steps taken to recover deadline...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-medium focus:border-brand-dark outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'تاريخ الإنجاز المستهدف الجديد (اختياري)' : 'Revised Target Completion Date (Optional)'}
                </label>
                <input
                  type="date"
                  value={delayRevisedDue}
                  onChange={e => setDelayRevisedDue(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-brand-dark outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDelayService(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingDelayAction}
                  className="flex-1 py-3 bg-brand-dark hover:bg-brand text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isSavingDelayAction ? '...' : (isAr ? 'حفظ وتعميم الإجراء' : 'Save & Broadcast Action')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reassign Employee Modal ───────────────────────────────────────── */}
      {reassignService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 animate-scale-up border border-gray-100 text-start">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <UserCheck size={18} className="text-brand-dark" />
                {isAr ? 'إعادة تعيين مسؤول المهمة' : 'Reassign Staff Member'}
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
              {personnel.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleReassignSubmit(reassignService.id, emp.id)}
                  className="w-full text-start p-3 rounded-xl border border-gray-100 hover:border-brand-dark hover:bg-brand-dark/5 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-black text-gray-900">{emp.full_name}</p>
                    <p className="text-[10px] font-bold text-gray-400 capitalize">{emp.role || 'Staff'}</p>
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

export default DepartmentHeadWorkspace;
