import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
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
  Truck
} from 'lucide-react';
import { getDepartmentById } from '../../config/departments';

// --- MOCK DATABASE ENTRIES (CONTEXTUALLY FILTERED) ---
const DEPT_DATA: Record<string, {
  personnel: Array<{ id: string; name: string; role: string; load: number; tasksCompleted: number; delayed: number; accuracy: number }>;
  services: string[];
  clients: Array<{ id: string; name: string; package: string; activeProject: string; status: 'good' | 'warning' | 'critical'; rating?: number }>;
  tasks: Array<{ id: string; title: string; client: string; assignee: string; status: 'todo' | 'in_progress' | 'under_review' | 'completed'; priority: 'high' | 'medium' | 'low'; due: string }>;
  directives: Array<{ id: string; text: string; issuedBy: string; date: string }>;
}> = {
  audit: {
    personnel: [
      { id: 'p1', name: 'Ali Al-Harthy', role: 'Senior Auditor', load: 60, tasksCompleted: 48, delayed: 0, accuracy: 98 },
      { id: 'p2', name: 'Muna Al-Farsi', role: 'Audit Assistant', load: 80, tasksCompleted: 35, delayed: 1, accuracy: 94 },
      { id: 'p3', name: 'Hasan Al-Balushi', role: 'Audit Trainee', load: 45, tasksCompleted: 12, delayed: 3, accuracy: 88 }
    ],
    services: ['Internal Audit', 'KSA Audit', 'Financial Statements', 'Tax Audit', 'Bank Audit'],
    clients: [
      { id: 'cl1', name: 'Oman Telco LLC', package: 'Annual Statutory Audit', activeProject: 'Q4 Audit Review', status: 'good' },
      { id: 'cl2', name: 'Muscat Port Services', package: 'Internal Controls Review', activeProject: 'Compliance Audit', status: 'good' },
      { id: 'cl3', name: 'Al Maha Petroleum', package: 'KSA Branch Audit', activeProject: 'Tax Compliance Audit', status: 'warning' }
    ],
    tasks: [
      { id: 't101', title: 'Q4 Audit Planning', client: 'Oman Telco LLC', assignee: 'Ali Al-Harthy', status: 'in_progress', priority: 'high', due: '2026-07-15' },
      { id: 't102', title: 'Fieldwork Inspection', client: 'Muscat Port Services', assignee: 'Muna Al-Farsi', status: 'under_review', priority: 'medium', due: '2026-07-20' },
      { id: 't103', title: 'Draft Report Compilation', client: 'Al Maha Petroleum', assignee: 'Hasan Al-Balushi', status: 'todo', priority: 'high', due: '2026-07-10' }
    ],
    directives: [
      { id: 'd1', text: 'Accelerate the statutory review cycle for Oman Telco Group.', issuedBy: 'Executive Management', date: '2026-06-30' }
    ]
  },
  tax_vat: {
    personnel: [
      { id: 'p4', name: 'Khalfan Al-Abri', role: 'Tax Accountant', load: 75, tasksCompleted: 52, delayed: 0, accuracy: 99 },
      { id: 'p5', name: 'Fatma Al-Busaidi', role: 'Tax Consultant', load: 85, tasksCompleted: 41, delayed: 2, accuracy: 96 },
      { id: 'p6', name: 'Zaid Al-Siyabi', role: 'Tax Trainee', load: 30, tasksCompleted: 8, delayed: 0, accuracy: 90 }
    ],
    services: ['Income Tax Filing', 'VAT Filing', 'Tax Certificate', 'Renew Tax Certificate', 'Objection', 'Exemption', 'VAT Cancelation'],
    clients: [
      { id: 'cl4', name: 'Mazoon Electricity', package: 'VAT Corporate Filing', activeProject: 'Q2 Return Submission', status: 'good' },
      { id: 'cl5', name: 'Sohar Steel Co', package: 'Tax Advisory Retainer', activeProject: 'Exemption Case Appeal', status: 'warning' },
      { id: 'cl6', name: 'Oman Food Logistics', package: 'Tax Certificate Renewal', activeProject: 'Certificate Verification', status: 'critical' }
    ],
    tasks: [
      { id: 't201', title: 'VAT Return Filing', client: 'Mazoon Electricity', assignee: 'Khalfan Al-Abri', status: 'in_progress', priority: 'high', due: '2026-07-18' },
      { id: 't202', title: 'Prepare Exemption Appeal', client: 'Sohar Steel Co', assignee: 'Fatma Al-Busaidi', status: 'under_review', priority: 'medium', due: '2026-07-25' },
      { id: 't203', title: 'Verify Audit Documents', client: 'Oman Food Logistics', assignee: 'Zaid Al-Siyabi', status: 'todo', priority: 'high', due: '2026-07-05' }
    ],
    directives: [
      { id: 'd2', text: 'All VAT filings for this quarter must undergo dual-verification.', issuedBy: 'Corporate Compliance Head', date: '2026-07-01' }
    ]
  },
  bookkeeping: {
    personnel: [
      { id: 'p7', name: 'Zahra Al-Lawati', role: 'Accounting Consultant', load: 50, tasksCompleted: 60, delayed: 0, accuracy: 97 },
      { id: 'p8', name: 'Issa Al-Riyami', role: 'Bookkeeper', load: 90, tasksCompleted: 74, delayed: 4, accuracy: 91 },
      { id: 'p9', name: 'Azza Al-Kharusi', role: 'Accounting Trainee', load: 65, tasksCompleted: 18, delayed: 1, accuracy: 95 }
    ],
    services: ['Complete Client Bookkeeping', 'Bank Reconciliations', 'Payroll Reconciliation', 'Year-End Account Preparation'],
    clients: [
      { id: 'cl7', name: 'Salalah Port Services', package: 'Monthly Bookkeeping', activeProject: 'June Ledger Reconciliation', status: 'good' },
      { id: 'cl8', name: 'Gulf General Trading', package: 'Ledger Audit Prep', activeProject: 'Bank Sync Validation', status: 'warning' },
      { id: 'cl9', name: 'Muscat Bakery Group', package: 'Payroll Bookkeeping', activeProject: 'Monthly Payroll Run', status: 'good' }
    ],
    tasks: [
      { id: 't301', title: 'June Bank Reconciliation', client: 'Salalah Port Services', assignee: 'Zahra Al-Lawati', status: 'in_progress', priority: 'medium', due: '2026-07-14' },
      { id: 't302', title: 'Sync Bank Statement Logs', client: 'Gulf General Trading', assignee: 'Issa Al-Riyami', status: 'todo', priority: 'high', due: '2026-07-07' },
      { id: 't303', title: 'Compile Payroll Accruals', client: 'Muscat Bakery Group', assignee: 'Azza Al-Kharusi', status: 'completed', priority: 'low', due: '2026-07-01' }
    ],
    directives: [
      { id: 'd3', text: 'Clean up backlog transactions for Gulf General Trading.', issuedBy: 'Financial Controller', date: '2026-06-28' }
    ]
  },
  business_advisory: {
    personnel: [
      { id: 'p10', name: 'Dr. Salim Al-Maskari', role: 'Business Consultant', load: 55, tasksCompleted: 28, delayed: 0, accuracy: 99 },
      { id: 'p11', name: 'Mazin Al-Hinai', role: 'Financial Analyst', load: 70, tasksCompleted: 30, delayed: 1, accuracy: 96 },
      { id: 'p12', name: 'Laila Al-Ajmi', role: 'Liquidation Officer', load: 80, tasksCompleted: 22, delayed: 2, accuracy: 94 },
      { id: 'p13', name: 'Asma Al-Kindi', role: 'BD Assistant', load: 40, tasksCompleted: 15, delayed: 0, accuracy: 92 }
    ],
    services: ['Strategic Consultancy', 'Feasibility Studies', 'Corporate Formations', 'Business Plans', 'Project Budgeting', 'Bank Feasibility Studies', 'CR Cancellations'],
    clients: [
      { id: 'cl10', name: 'Khimji Group', package: 'Feasibility Assessment', activeProject: 'New Retail Mall Study', status: 'good' },
      { id: 'cl11', name: 'Al Zawawi Holdings', package: 'Corporate Re-structuring', activeProject: 'Restructure Advisory', status: 'warning' },
      { id: 'cl12', name: 'Bahwan Engineering', package: 'Ministry Approval Consult', activeProject: 'CR Cancellation Handling', status: 'good' }
    ],
    tasks: [
      { id: 't401', title: 'Financial Model Study', client: 'Khimji Group', assignee: 'Mazin Al-Hinai', status: 'in_progress', priority: 'high', due: '2026-07-22' },
      { id: 't402', title: 'CR Expiry Verification', client: 'Bahwan Engineering', assignee: 'Laila Al-Ajmi', status: 'todo', priority: 'high', due: '2026-07-10' },
      { id: 't403', title: 'Draft Advisory Proposal', client: 'Al Zawawi Holdings', assignee: 'Dr. Salim Al-Maskari', status: 'under_review', priority: 'medium', due: '2026-07-15' }
    ],
    directives: [
      { id: 'd4', text: 'All feasibility studies must pass internal secondary peer review.', issuedBy: 'Managing Director', date: '2026-06-25' }
    ]
  },
  client_success: {
    personnel: [
      { id: 'p14', name: 'Amna Al-Shabibi', role: 'Client Relations Officer', load: 65, tasksCompleted: 95, delayed: 1, accuracy: 97 },
      { id: 'p15', name: 'Qais Al-Zadjali', role: 'Sales Executive', load: 50, tasksCompleted: 40, delayed: 0, accuracy: 95 },
      { id: 'p16', name: 'Hamad Al-Ghafri', role: 'Public Relations Officer', load: 80, tasksCompleted: 110, delayed: 3, accuracy: 92 },
      { id: 'p17', name: 'Said Al-Rawahi', role: 'Driver & Dispatch', load: 90, tasksCompleted: 180, delayed: 5, accuracy: 89 }
    ],
    services: ['Delivery Coordination', 'Client Lifecycle Management', 'Transportation Scheduling', 'Governmental Document Dispatch'],
    clients: [
      { id: 'cl13', name: 'Bank Muscat', package: 'VIP Document Handling', activeProject: 'Ministry Passport Clear', status: 'good', rating: 4.8 },
      { id: 'cl14', name: 'Oman LNG', package: 'Executive PRO Support', activeProject: 'Visa Dispatch Route', status: 'warning', rating: 4.2 },
      { id: 'cl15', name: 'National Bank of Oman', package: 'Onsite PRO Retainer', activeProject: 'CR Registry Dispatch', status: 'good', rating: 4.9 }
    ],
    tasks: [
      { id: 't501', title: 'Deliver VIP Visa Documents', client: 'Bank Muscat', assignee: 'Said Al-Rawahi', status: 'in_progress', priority: 'high', due: '2026-07-02' },
      { id: 't502', title: 'Ministry Passport Delivery', client: 'Oman LNG', assignee: 'Hamad Al-Ghafri', status: 'todo', priority: 'high', due: '2026-07-04' },
      { id: 't503', title: 'Customer Health Call', client: 'National Bank of Oman', assignee: 'Amna Al-Shabibi', status: 'completed', priority: 'medium', due: '2026-07-01' }
    ],
    directives: [
      { id: 'd5', text: 'Address transport delays to Ministry of Commerce immediately.', issuedBy: 'Operations Director', date: '2026-07-02' }
    ]
  }
};

const DepartmentHeadWorkspace = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const location = useLocation();

  // Retrieve department context from Layout outlet context if available (defaults to audit)
  const context = useOutletContext<{ deptContext: string }>() || { deptContext: 'audit' };
  const currentDeptId = context.deptContext || 'audit';

  // --- Dynamic Local State ---
  const [personnel, setPersonnel] = useState(DEPT_DATA[currentDeptId]?.personnel || DEPT_DATA.audit.personnel);
  const [services, setServices] = useState(DEPT_DATA[currentDeptId]?.services || DEPT_DATA.audit.services);
  const [clients, setClients] = useState(DEPT_DATA[currentDeptId]?.clients || DEPT_DATA.audit.clients);
  const [tasks, setTasks] = useState(DEPT_DATA[currentDeptId]?.tasks || DEPT_DATA.audit.tasks);
  const [directives, setDirectives] = useState(DEPT_DATA[currentDeptId]?.directives || DEPT_DATA.audit.directives);
  
  // Advanced Task Assigner Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskClient, setTaskClient] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDue, setTaskDue] = useState('');

  // specialized workspace local states
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
  const [hodLeaveRequests, setHodLeaveRequests] = useState<any[]>([]);

  const handleHodLeaveAction = (id: string, action: 'Approved' | 'Rejected') => {
    const updated = hodLeaveRequests.map(r => {
      if (r.id === id) {
        return { ...r, managerApproval: action };
      }
      return r;
    });
    setHodLeaveRequests(updated);
    
    const allSavedLeaves = localStorage.getItem('hr_leave_requests')
      ? JSON.parse(localStorage.getItem('hr_leave_requests')!) as any[]
      : [];
    const nextLeaves = allSavedLeaves.map(r => {
      if (r.id === id) {
        return { ...r, managerApproval: action };
      }
      return r;
    });
    localStorage.setItem('hr_leave_requests', JSON.stringify(nextLeaves));
    alert(action === 'Approved' ? 'Leave authorized and forwarded to HR!' : 'Leave request rejected.');
  };

  // Sync state whenever department context changes
  useEffect(() => {
    const data = DEPT_DATA[currentDeptId] || DEPT_DATA.audit;
    setPersonnel(data.personnel);
    setServices(data.services);
    setDirectives(data.directives);

    // Sync HOD personnel metrics for HR Performance appraisals access
    const savedStats = localStorage.getItem('hod_personnel_stats') 
      ? JSON.parse(localStorage.getItem('hod_personnel_stats')!) as any[]
      : [];
    const filteredStats = savedStats.filter((p: any) => !data.personnel.some(dp => dp.name === p.name));
    const nextStats = [...filteredStats, ...data.personnel];
    localStorage.setItem('hod_personnel_stats', JSON.stringify(nextStats));

    // Fetch live leave requests from Supabase
    const fetchLiveLeaves = async () => {
      try {
        const { data: leaves } = await supabase.from('hr_leave_requests').select('*');
        if (leaves && leaves.length > 0) {
          setHodLeaveRequests(leaves);
        } else {
          const savedLeaves = localStorage.getItem('hr_leave_requests');
          if (savedLeaves) setHodLeaveRequests(JSON.parse(savedLeaves));
        }
      } catch (err) {
        const savedLeaves = localStorage.getItem('hr_leave_requests');
        if (savedLeaves) setHodLeaveRequests(JSON.parse(savedLeaves));
      }
    };
    fetchLiveLeaves();

    // ── Supabase Realtime Subscription ─────────────────────────────────────
    const channel = supabase
      .channel(`hod-${currentDeptId}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        console.log('Services updated in HOD workspace');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_leave_requests' }, () => {
        fetchLiveLeaves();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDeptId]);

  // Parse path to set view
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

  // Helper config
  const deptConfig = getDepartmentById(currentDeptId) || getDepartmentById('audit');

  // --- Dynamic Supabase Fetch (Mocked calls showing security query constraints) ---
  const triggerMockSupabaseFetch = async () => {
    console.log(`Executing SECURE Fetch constraint: SELECT * FROM tasks WHERE department = '${currentDeptId}'`);
    console.log(`Executing SECURE Fetch constraint: SELECT * FROM members WHERE department = '${currentDeptId}'`);
  };

  useEffect(() => {
    triggerMockSupabaseFetch();
  }, [currentDeptId]);

  // Action: Add Task
  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDue) return;

    const newTask = {
      id: `t${Date.now().toString().slice(-3)}`,
      title: taskTitle,
      client: taskClient,
      assignee: taskAssignee,
      status: 'todo' as const,
      priority: taskPriority,
      due: taskDue
    };

    setTasks(prev => {
      const nextTasks = [newTask, ...prev];
      localStorage.setItem(`hod_tasks_${currentDeptId}`, JSON.stringify(nextTasks));
      return nextTasks;
    });

    // Optimistically update assignee load
    setPersonnel(prev => prev.map(p => {
      if (p.name === taskAssignee) {
        return { ...p, load: Math.min(p.load + 10, 100) };
      }
      return p;
    }));

    // Reset fields
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    setTaskDue('');
    alert(isAr ? 'تم توجيه وتعيين المهمة بنجاح!' : 'Task successfully dispatched and assigned!');
  };

  // Action: Escalate Task
  const handleEscalateTask = (taskId: string, title: string) => {
    alert(isAr 
      ? `تم تصعيد المهمة: "${title}" إلى الإدارة التنفيذية العليا بنجاح.` 
      : `Task: "${title}" has been escalated to Executive Management.`);
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, priority: 'high' as const };
      }
      return t;
    }));
  };

  // Action: Reassign Task
  const handleReassignTask = (taskId: string, currentAssignee: string) => {
    const nextPerson = personnel.find(p => p.name !== currentAssignee);
    if (nextPerson) {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return { ...t, assignee: nextPerson.name, status: 'todo' };
        }
        return t;
      }));
      alert(isAr 
        ? `تمت إعادة التعيين لـ: ${nextPerson.name}` 
        : `Successfully reassigned to: ${nextPerson.name}`);
    }
  };

  // --- SUB-VIEWS RENDERERS ---

  // 1. Dashboard View
  const renderDashboardView = () => {
    const overdueCount = tasks.filter(t => t.status !== 'completed' && new Date(t.due) < new Date()).length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 80;
    
    // Calculate average load
    const avgLoad = personnel.length > 0 ? Math.round(personnel.reduce((sum, p) => sum + p.load, 0) / personnel.length) : 70;

    return (
      <div className="space-y-6">
        {/* KPI Command Dashboard grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:border-red-100 transition-all group">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'معدل إنجاز المهام' : 'Total Task Completion'}</p>
              <h3 className="text-3xl font-black text-gray-900 leading-none">{completionRate}%</h3>
            </div>
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold mt-4">
              <TrendingUp size={14} />
              <span>+4.2% {isAr ? 'الشهر الماضي' : 'vs last month'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:border-red-100 transition-all">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'كفاءة طاقم العمل' : 'Team Workload Efficiency'}</p>
              <h3 className="text-3xl font-black text-gray-900 leading-none">{100 - avgLoad}%</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[#A11212] text-xs font-bold mt-4">
              <Activity size={14} />
              <span>{avgLoad}% {isAr ? 'عبء العمل الحالي' : 'average unit capacity'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:border-red-100 transition-all">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'العملاء النشطون بالقسم' : 'Active Managed Clients'}</p>
              <h3 className="text-3xl font-black text-gray-900 leading-none">{clients.length}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold mt-4">
              <ShieldCheck size={14} />
              <span>{isAr ? 'مضمون العقد' : '100% Retained'}</span>
            </div>
          </div>

          <div className={`rounded-2xl p-6 shadow-sm border flex flex-col justify-between transition-all ${
            overdueCount > 0 ? 'bg-red-50/50 border-red-100 text-red-900' : 'bg-white border-gray-100'
          }`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                overdueCount > 0 ? 'text-red-500' : 'text-gray-400'
              }`}>{isAr ? 'التسليمات المتأخرة' : 'Overdue Deliverables'}</p>
              <h3 className={`text-3xl font-black leading-none ${overdueCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{overdueCount}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold mt-4">
              <AlertTriangle size={14} className={overdueCount > 0 ? 'text-red-500' : 'text-gray-400'} />
              <span className={overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}>
                {overdueCount > 0 ? (isAr ? 'تتطلب تدخل فوري' : 'Require Immediate Action') : (isAr ? 'الجميع في المسار' : 'On Track')}
              </span>
            </div>
          </div>
        </div>

        {/* Management Directives Panel */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-[#A11212] uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={18} /> {isAr ? 'توجيهات وقرارات الإدارة العليا' : 'Management Directives'}
          </h3>
          <div className="space-y-3">
            {directives.map(d => (
              <div key={d.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-150">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#A11212] mt-1.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{d.text}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">Issued By: {d.issuedBy} &bull; {d.date}</p>
                  </div>
                </div>
                <span className="bg-[#A11212]/5 text-[#A11212] text-[9px] font-black uppercase px-2 py-1 rounded border border-[#A11212]/20">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Context Injected Specialist Module */}
        {renderSpecialistWorkspace()}
      </div>
    );
  };

  // 2. Team Leadership View
  const renderTeamView = () => {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Users className="text-[#A11212]" size={20} />
            {isAr ? 'مراقبة وتوزيع عبء عمل الفريق' : 'Team Leadership & Workload Capacity'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr ? 'تحليل معدل توزيع المهام لمنع الإرهاق الوظيفي بالقسم' : 'Roster of assigned personnel with current workload allocation metrics'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personnel.map(emp => {
            const isOverloaded = emp.load > 80;
            return (
              <div key={emp.id} className="border border-gray-100 rounded-2xl p-5 hover:border-gray-300 transition-colors bg-gray-50/30 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-gray-900">{emp.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">{emp.role}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                      isOverloaded 
                        ? 'bg-red-50 text-red-700 border-red-150' 
                        : 'bg-green-50 text-green-700 border-green-150'
                    }`}>
                      {isOverloaded ? 'Overloaded' : 'Optimal'}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>Allocation Load</span>
                      <span className={isOverloaded ? 'text-red-650 font-black' : 'text-gray-700 font-black'}>{emp.load}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-green-500'}`} 
                        style={{ width: `${emp.load}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-150 pt-4 mt-6 text-[10px] text-gray-400 font-bold">
                  <span>Completed: {emp.tasksCompleted}</span>
                  <span className={emp.delayed > 0 ? 'text-red-500 font-black' : ''}>Delayed: {emp.delayed}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* HOD Team Leave Approvals Section */}
        <div className="border-t border-gray-150 pt-6 space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="text-[#A11212]" size={18} />
            {isAr ? 'اعتماد الإجازات للموظفين' : 'HOD Leave Authorization Queue'}
          </h3>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'طلبات الإجازة المعلقة لموظفي القسم المباشرين' : 'Approve leave requests to ensure coverage matches department workloads.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hodLeaveRequests.filter(r => r.managerApproval === 'Pending').map(req => (
              <div key={req.id} className="border border-gray-150 rounded-2xl p-5 bg-gray-50/50 shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-gray-900">{req.employeeName}</h4>
                      <span className="text-[8px] bg-red-50 text-[#A11212] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">{req.type}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">{req.id}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Duration</p>
                      <p className="font-black text-gray-800">{req.startDate} to {req.endDate}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Total Days</p>
                      <p className="font-black text-gray-800">{req.days} Days</p>
                    </div>
                  </div>
                  {req.notes && (
                    <p className="text-xs text-gray-550 font-bold mt-2 italic bg-white p-2 rounded-xl border border-gray-100">&ldquo;{req.notes}&rdquo;</p>
                  )}
                </div>

                <div className="mt-4 flex gap-2 justify-end border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleHodLeaveAction(req.id, 'Rejected')}
                    className="px-4 py-2 border border-gray-250 text-gray-700 hover:text-red-700 hover:border-red-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleHodLeaveAction(req.id, 'Approved')}
                    className="px-4 py-2 bg-[#A11212] text-white hover:bg-[#800e0e] rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Authorize & Forward
                  </button>
                </div>
              </div>
            ))}
            {hodLeaveRequests.filter(r => r.managerApproval === 'Pending').length === 0 && (
              <div className="col-span-2 p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white">
                <CheckCircle2 className="mx-auto mb-1 opacity-25" size={24} />
                <p className="text-xs font-bold">No leave requests currently pending department head authorization.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 3. Work Routing View (Advanced Task Router)
  const renderRoutingView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigner Matrix Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <PlusCircle size={18} className="text-[#A11212]" />
            {isAr ? 'توجيه وتعيين الأهداف اليومية' : 'Advanced Task Router Matrix'}
          </h3>
          <form className="space-y-4" onSubmit={handleAssignTask}>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Task Title</label>
              <input 
                type="text" 
                required
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#A11212] outline-none" 
                placeholder="e.g. Audit Draft Sign-off"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
              <textarea 
                rows={3}
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#A11212] outline-none resize-none" 
                placeholder="Details of expectations..."
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Client Association</label>
              <select 
                value={taskClient}
                onChange={e => setTaskClient(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#A11212] outline-none"
              >
                {clients.map(cl => <option key={cl.id} value={cl.name}>{cl.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Employee</label>
              <select 
                value={taskAssignee}
                onChange={e => setTaskAssignee(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#A11212] outline-none"
              >
                {personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Priority</label>
                <select 
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#A11212] outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Hard Deadline</label>
                <input 
                  type="date" 
                  required
                  value={taskDue}
                  onChange={e => setTaskDue(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#A11212] outline-none"
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#A11212] text-white rounded-xl py-3 text-xs font-black uppercase tracking-widest hover:bg-[#800e0e] transition-colors mt-2 shadow-sm">
              Dispatch Task
            </button>
          </form>
        </div>

        {/* Current Dispatched tasks list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Clock size={18} className="text-[#A11212]" />
            {isAr ? 'قائمة المهام الموزعة حالياً' : 'Active Dispatched Task ledger'}
          </h3>
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-150">
                <div>
                  <h4 className="font-black text-sm text-gray-900">{t.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">
                    Client: {t.client} &bull; Assignee: {t.assignee} &bull; Due: {t.due}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                  t.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 4. Quality Control & Kanban Intervention
  const renderQualityView = () => {
    const statuses: Array<'todo' | 'in_progress' | 'under_review' | 'completed'> = ['todo', 'in_progress', 'under_review', 'completed'];

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CheckSquare className="text-[#A11212]" size={20} />
            {isAr ? 'لوحة المراقبة الحية والتدخل الفوري' : 'Real-Time Kanban Intervention Board'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr ? 'متابعة مراحل التنفيذ وإجراء تدخلات فورية للمهام المتأخرة بالقسم' : 'Track staff progress and execute reassignments or escalations instantly'}
          </p>
        </div>

        {/* Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {statuses.map(st => {
            const list = tasks.filter(t => t.status === st);
            const titles: Record<string, string> = {
              todo: isAr ? 'معلقة' : 'To Do',
              in_progress: isAr ? 'قيد التنفيذ' : 'In Progress',
              under_review: isAr ? 'تحت المراجعة والاعتماد' : 'Under Review',
              completed: isAr ? 'مكتملة' : 'Completed'
            };
            return (
              <div key={st} className="bg-gray-50/50 border border-gray-150 rounded-2xl p-4 min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-150">
                  <h4 className="font-black text-xs uppercase tracking-widest text-gray-500">{titles[st]}</h4>
                  <span className="bg-white text-gray-500 text-[9px] font-black px-2 py-0.5 rounded shadow-xs border">
                    {list.length}
                  </span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                  {list.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
                      <div>
                        <h5 className="font-bold text-xs text-gray-900">{t.title}</h5>
                        <p className="text-[9px] text-gray-400 font-bold mt-0.5">{t.client}</p>
                        <p className="text-[9px] text-gray-500 font-bold mt-1">Assigned: {t.assignee}</p>
                      </div>

                      {/* Intervention action hooks */}
                      {st !== 'completed' && (
                        <div className="flex gap-1.5 pt-2 border-t border-gray-100 justify-end">
                          <button 
                            onClick={() => handleReassignTask(t.id, t.assignee)}
                            className="bg-gray-50 hover:bg-gray-100 text-gray-600 border px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider"
                          >
                            Reassign
                          </button>
                          <button 
                            onClick={() => handleEscalateTask(t.id, t.title)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider"
                          >
                            Escalate
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Briefcase className="text-[#A11212]" size={20} />
            {isAr ? 'مصفوفة تتبع حسابات وعملاء القسم' : 'Client Tracking Matrix'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr ? 'العملاء النشطون الذين يتلقون خدمات من القسم حالياً' : 'Clients actively receiving services from your unit'}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-start">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'العميل' : 'Company Name'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الخدمة المفعلة' : 'Active Package'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المشروع الحالي' : 'Active Project'}</th>
                {currentDeptId === 'client_success' && (
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">CSI Rating</th>
                )}
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(cl => (
                <tr key={cl.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-sm text-gray-900">{cl.name}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{cl.package}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{cl.activeProject}</td>
                  {currentDeptId === 'client_success' && (
                    <td className="px-6 py-4 text-xs font-black text-amber-500 flex items-center gap-1">
                      <ThumbsUp size={12} /> {cl.rating || 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      cl.status === 'good' ? 'bg-green-50 text-green-700 border-green-150' :
                      cl.status === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-150' : 'bg-red-50 text-red-700 border-red-150'
                    }`}>
                      {cl.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 6. Coordination Hub View
  const renderCoordinationView = () => {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Layers className="text-[#A11212]" size={20} />
            {isAr ? 'مركز التنسيق والتكامل بين الأقسام' : 'Cross-Department Coordination Hub'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr ? 'متابعة المشروعات والطلبات المشتركة بين الأقسام الأخرى لضمان سرعة الإنجاز' : 'Oversee cross-functional services and initiatives requiring inter-department collaboration'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-red-50 text-[#A11212] text-[8px] font-black uppercase px-2 py-0.5 rounded border border-red-150">Audit &harr; Tax</span>
              <h4 className="font-black text-sm text-gray-900 mt-2">Annual Compliance Package Exchange</h4>
              <p className="text-xs text-gray-400 font-bold mt-0.5">Audit files require VAT transaction summaries.</p>
            </div>
            <span className="bg-green-50 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-green-150 uppercase tracking-widest">
              Synced & Completed
            </span>
          </div>

          <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-red-50 text-[#A11212] text-[8px] font-black uppercase px-2 py-0.5 rounded border border-red-150">Bookkeeping &harr; Success</span>
              <h4 className="font-black text-sm text-gray-900 mt-2">Client Bank Account Feeds Integration</h4>
              <p className="text-xs text-gray-400 font-bold mt-0.5">Client Success team coordinating with bank advisors for access.</p>
            </div>
            <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-orange-150 uppercase tracking-widest">
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileBarChart className="text-[#A11212]" size={20} />
            {isAr ? 'دفتر سجل أداء الموظفين' : 'Performance Analytics Ledger'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr ? 'مؤشرات الأداء التاريخية، دقة العمليات، والملاحظات الإشرافية' : 'Historical reporting tracking staff accuracy, timely completions, and internal review logs'}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-start">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المهام المنجزة' : 'Completions'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'معدل الدقة والالتزام' : 'Accuracy Index'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'ملاحظة المشرف ورئيس القسم' : 'Review Logs / Remarks'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {personnel.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-sm text-gray-900">{p.name}</p>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">{p.role}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-700">{p.tasksCompleted}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-950">{p.accuracy}%</span>
                      <div className="w-16 bg-gray-100 h-1.5 rounded-full">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${p.accuracy}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">
                    {p.delayed > 2 
                      ? (isAr ? 'تم رصد تأخير متكرر؛ يتطلب توجيه.' : 'Frequent deadline slippages noted; coaching required.')
                      : (isAr ? 'أداء ممتاز وملتزم بالدقة والمهام.' : 'Demonstrates excellent work quality and compliance.')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- CONTEXTUAL WORKSPACES INJECTIONS ---

  const renderSpecialistWorkspace = () => {
    switch (currentDeptId) {
      case 'audit':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Stage tracker */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={16} /> {isAr ? 'مسار مراحل التدقيق' : 'Engagement Stages Pipeline'}
              </h3>
              <div className="space-y-4">
                {['Oman Telco Q4 Review', 'Muscat Port statutory audit'].map((proj, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-xl border">
                    <h4 className="font-bold text-xs text-gray-900 mb-2">{proj}</h4>
                    <div className="flex justify-between items-center text-[9px] text-gray-400 font-black uppercase tracking-wider">
                      <span className="text-[#A11212]">Planning</span>
                      <ChevronRight size={10} />
                      <span className="text-[#A11212]">Fieldwork</span>
                      <ChevronRight size={10} />
                      <span className={idx === 0 ? 'text-[#A11212]' : ''}>Draft Report</span>
                      <ChevronRight size={10} />
                      <span>Final Review</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authoritative Sign-off Verification */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckSquare size={16} /> {isAr ? 'مركز اعتماد وتوقيع التقارير' : 'Report Sign-Off & Verification Ledger'}
              </h3>
              <div className="space-y-3">
                {clients.map(cl => (
                  <div key={cl.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border">
                    <div>
                      <p className="font-bold text-xs text-gray-900">{cl.name}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{cl.activeProject}</p>
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
                        className="bg-[#A11212] hover:bg-[#800e0e] text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors"
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
            {/* VAT Calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={16} /> {isAr ? 'تقويم الإقرارات الضريبية' : 'Regulatory VAT Calendar'}
                </h3>
                <span className="text-[10px] bg-red-50 text-[#A11212] font-black px-2 py-0.5 rounded border border-red-150">{vatQuarter}</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-150">
                  <div>
                    <p className="font-bold text-xs text-gray-900">Mazoon Electricity return</p>
                    <p className="text-[9px] text-gray-400 mt-1">Submission Target: 2026-07-28</p>
                  </div>
                  <span className="bg-orange-50 text-orange-700 text-[8px] font-black px-2 py-1 rounded border border-orange-150 uppercase tracking-widest">
                    Action Required
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-150">
                  <div>
                    <p className="font-bold text-xs text-gray-900">Sohar Steel Exemption Case</p>
                    <p className="text-[9px] text-gray-400 mt-1">Hearing: 2026-07-25</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-[8px] font-black px-2 py-1 rounded border border-blue-150 uppercase tracking-widest">
                    On Track
                  </span>
                </div>
              </div>
            </div>

            {/* Penalty Alert Engine */}
            <div className="bg-[#A11212] text-white rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -end-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/70 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} /> {isAr ? 'محرك تنبيهات الغرامات المالية' : 'Penalty Alert Engine'}
                </h3>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl space-y-2">
                  <h4 className="font-black text-sm">Oman Food Logistics Certificate</h4>
                  <p className="text-[11px] text-white/80">Exceeds renewal period by 5 days. High penalty risk of OMR 500 under Tax Regulations.</p>
                </div>
              </div>
              <button 
                onClick={() => alert(isAr ? 'تم تصعيد التحذير وتكليف الفريق بمتابعة التجديد فوراً!' : 'Warning escalated to executive team to execute renewal immediately!')}
                className="mt-6 w-full bg-white hover:bg-gray-100 text-[#A11212] py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
              >
                Escalate Penalty Threat
              </button>
            </div>
          </div>
        );

      case 'bookkeeping':
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={16} /> {isAr ? 'قائمة الفحص للإغلاق الشهري' : 'Interactive Monthly Closure Checklist'}
              </h3>
              <span className="text-[10px] bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded font-black">
                {checklist.filter(c => c.done).length} / {checklist.length} Completed
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklist.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: !c.done } : c))}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    item.done ? 'bg-green-50/20 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
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

      case 'business_advisory':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Gantt milestones */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={16} /> {isAr ? 'مخطط مراحل المشروعات' : 'Custom Project Milestone Gantt'}
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                    <span>Khimji Feasibility Assessment</span>
                    <span>70%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-red h-2 rounded-full" style={{ width: '70%', backgroundColor: '#A11212' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                    <span>Al Zawawi Re-structuring</span>
                    <span>40%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-red h-2 rounded-full" style={{ width: '40%', backgroundColor: '#A11212' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Proposal validation */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckSquare size={16} /> {isAr ? 'مركز اعتماد المقترحات المالية والتعاقدية' : 'Proposal Approvals Validation Interface'}
              </h3>
              <div className="space-y-3">
                {proposals.map(prop => (
                  <div key={prop.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border">
                    <div>
                      <p className="font-bold text-xs text-gray-900">{prop.client}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{prop.type} &bull; {prop.budget}</p>
                    </div>
                    {prop.status === 'approved' ? (
                      <span className="bg-green-50 text-green-700 text-[8px] font-black uppercase px-2.5 py-1 rounded border border-green-150">APPROVED</span>
                    ) : (
                      <button 
                        onClick={() => {
                          setProposals(prev => prev.map(p => p.id === prop.id ? { ...p, status: 'approved' } : p));
                          alert(isAr ? 'تم اعتماد المقترح وإرساله للعميل للتوقيع.' : 'Proposal approved & forwarded to client.');
                        }}
                        className="bg-[#A11212] hover:bg-[#800e0e] text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'client_success':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Customer Satisfaction Index index metrics */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest mb-4 flex items-center gap-2">
                <ThumbsUp size={16} /> {isAr ? 'مؤشرات رضا العملاء CSI' : 'Client Satisfaction Index (CSI)'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-xs text-gray-900">Department CSI Average</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Based on client feedback log</p>
                  </div>
                  <span className="text-lg font-black text-amber-500">4.6 / 5.0</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-xs text-gray-900">Bottlenecks Identified</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Fulfillment delays at Ministry</p>
                  </div>
                  <span className="text-sm font-black text-red-600">2 Active</span>
                </div>
              </div>
            </div>

            {/* route/delivery status boards */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#A11212] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Truck size={16} /> {isAr ? 'جدولة وتوزيع مستندات وزارة التجارة' : 'Route & Governmental Document Delivery Board'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-bold text-xs text-gray-900">MOCI Document Dispatch</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Said Al-Rawahi &bull; Route: Ruwi &rarr; Al-Khuwair</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-[8px] font-black px-2 py-1 rounded border border-blue-150 uppercase tracking-widest">
                    In Transit
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-bold text-xs text-gray-900">Tax Authority Objection Delivery</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Hamad Al-Ghafri &bull; Route: Corporate Office HQ</p>
                  </div>
                  <span className="bg-green-50 text-green-700 text-[8px] font-black px-2 py-1 rounded border border-green-150 uppercase tracking-widest">
                    Delivered
                  </span>
                </div>
              </div>
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
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-[#A11212]" size={22} />
            {isAr ? 'بوابة رئيس قسم العمليات والخدمات' : 'Department Head Portal'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr 
              ? `إدارة شؤون قسم: ${deptConfig?.name || ''} والمتابعة الإشرافية المباشرة` 
              : `Operational control center for ${deptConfig?.name || ''} unit`}
          </p>
        </div>
        
        {/* Dynamic Context Display indicator badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{isAr ? 'القسم الحالي:' : 'Scope Context:'}</span>
          <span className="bg-red-50 text-[#A11212] border border-red-100 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {deptConfig?.name}
          </span>
        </div>
      </div>

      {/* Render Active Tab / View content */}
      <div className="animate-in fade-in duration-300">
        {renderActiveView()}
      </div>
    </div>
  );
};

export default DepartmentHeadWorkspace;
