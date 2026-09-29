import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Calendar,
  Building2,
  RefreshCw,
  ChevronDown,
  Search,
  DollarSign,
  PlusCircle,
  CreditCard,
  X,
  FileText,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Filter,
  Check
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ServiceTask {
  id: string;
  title: string;
  status: 'pending' | 'started' | 'ongoing' | 'under_review' | 'completed' | 'delayed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string | null;
  budget: number;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  client_id: string | null;
  employee_id: string | null;
  department_id?: string | null;
  clients?: {
    id?: string;
    company_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  invoices?: Array<{
    id: string;
    invoice_number: string;
    status: string;
    amount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Kanban Columns
// ---------------------------------------------------------------------------
const COLUMNS = [
  {
    key: 'pending',
    label_ar: 'قيد الانتظار (جديدة)',
    label_en: 'Pending Start',
    color: 'bg-amber-500',
    borderAccent: 'border-s-amber-500',
    badgeCls: 'bg-amber-100 text-amber-800'
  },
  {
    key: 'started',
    label_ar: 'قيد التنفيذ',
    label_en: 'In Progress',
    color: 'bg-blue-600',
    borderAccent: 'border-s-blue-600',
    badgeCls: 'bg-blue-100 text-blue-800'
  },
  {
    key: 'under_review',
    label_ar: 'قيد المراجعة والاعتماد',
    label_en: 'Under Review',
    color: 'bg-purple-600',
    borderAccent: 'border-s-purple-600',
    badgeCls: 'bg-purple-100 text-purple-800'
  },
  {
    key: 'completed',
    label_ar: 'مكتملة',
    label_en: 'Completed',
    color: 'bg-emerald-600',
    borderAccent: 'border-s-emerald-600',
    badgeCls: 'bg-emerald-100 text-emerald-800'
  }
];

export default function Transactions() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modal States
  const [selectedTaskForPayment, setSelectedTaskForPayment] = useState<ServiceTask | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: '',
    gov_fee: '0',
    payment_method: 'Bank transfer' as 'Mobile Payment' | 'POS' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Online',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Notification Toast
  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // ── Fetch Employee Tasks ──────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('services')
        .select(`
          id,
          title,
          status,
          priority,
          description,
          budget,
          due_date,
          started_at,
          completed_at,
          created_at,
          client_id,
          employee_id,
          department_id,
          clients (
            id,
            company_name,
            email,
            phone
          ),
          invoices (
            id,
            invoice_number,
            status,
            amount
          )
        `)
        .order('created_at', { ascending: false });

      // Scope to the logged-in employee if available
      if (user?.id) {
        query = query.or(`employee_id.eq.${user.id},employee_id.is.null`);
      }

      const { data, error } = await query;
      if (!error && data) {
        const formattedTasks: ServiceTask[] = (data as any[]).map((task: any) => ({
          ...task,
          clients: Array.isArray(task.clients)
            ? (task.clients[0] || null)
            : (task.clients || null)
        }));
        setTasks(formattedTasks);
      } else if (error) {
        console.warn('Error fetching employee tasks:', error.message);
      }
    } catch (err) {
      console.error('Fetch tasks exception:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTasks();

    // Supabase Realtime Subscription for Task Updates
    const channel = supabase
      .channel('employee-tasks-live-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  // ── Task Start Action & Idempotent Auto-Invoicing ──────────────────────────
  const handleStartTask = async (task: ServiceTask) => {
    setIsProcessingAction(task.id);
    const nowIso = new Date().toISOString();

    // 1. Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'started', started_at: nowIso } : t));

    try {
      // Step A: Update task status to started
      const { error: serviceErr } = await supabase
        .from('services')
        .update({
          status: 'started',
          started_at: nowIso
        })
        .eq('id', task.id);

      if (serviceErr) throw serviceErr;

      // Step B: Idempotent Draft Invoice Generation (Check if invoice exists first)
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('service_id', task.id);

      let invoiceNumber = '';
      if (!existingInvoices || existingInvoices.length === 0) {
        const generatedInvNumber = `INV-${Date.now().toString().slice(-6)}`;
        invoiceNumber = generatedInvNumber;
        const invoiceBudget = Number(task.budget || 0);

        const { error: invErr } = await supabase
          .from('invoices')
          .insert([{
            invoice_number: generatedInvNumber,
            service_id: task.id,
            client_id: task.client_id,
            created_by: user?.id || null,
            amount: invoiceBudget,
            tax_amount: 0,
            total_amount: invoiceBudget,
            status: 'draft',
            due_date: task.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            notes: `Auto-generated draft invoice upon work start for task: "${task.title}"`
          }]);

        if (invErr) console.warn('Draft invoice creation notice:', invErr.message);

        // Step C: Push Realtime Notification to Accounts Team
        const { error: notifErr } = await supabase
          .from('notifications')
          .insert([{
            sender_id: user?.id || null,
            recipient_role: 'accountant',
            service_id: task.id,
            title: isAr ? 'بدء مهمة جديدة - مسودة فاتورة جاهزة' : 'New Task Started - Draft Invoice Ready',
            message: isAr
              ? `قام الموظف ببدء العمل على المهمة "${task.title}". تم إنشاء مسودة فاتورة بقيمة ${invoiceBudget.toFixed(3)} ر.ع جاهزة بالمحاسبة.`
              : `Work started on task "${task.title}". Draft invoice ${generatedInvNumber} (OMR ${invoiceBudget.toFixed(3)}) is ready in Accounts.`,
            type: 'task_started'
          }]);
        if (notifErr) console.warn('Notification notice:', notifErr);
      }

      setNotification({
        show: true,
        title: isAr ? 'تم بدء المهمة بنجاح' : 'Work Started',
        message: isAr
          ? `تم تحديث حالة المهمة وإنشاء مسودة الفاتورة في قسم المحاسبة بنجاح.`
          : `Task is now In Progress. Draft invoice automatically generated for Accounts.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في التحديث' : 'Update Failed',
        message: err.message || 'Could not start task',
        type: 'error'
      });
      fetchTasks();
    } finally {
      setIsProcessingAction(null);
    }
  };

  // ── Move Task Stage (e.g. Under Review or Completed) ──────────────────────
  const handleUpdateStatus = async (taskId: string, newStatus: ServiceTask['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'completed') {
        payload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('services').update(payload).eq('id', taskId);
      if (error) throw error;

      setNotification({
        show: true,
        title: isAr ? 'تم تحديث الحالة' : 'Status Updated',
        message: isAr ? 'تم حفظ حالة المهمة بنجاح.' : `Task moved to ${newStatus}.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || 'Failed to update status',
        type: 'error'
      });
      fetchTasks();
    }
  };

  // ── Payment Logging Handler (Strictly inserts draft receipt) ───────────────
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForPayment) return;

    const amountPaid = Number(paymentData.amount);
    if (!amountPaid || amountPaid <= 0) {
      setNotification({
        show: true,
        title: isAr ? 'مبلغ غير صالح' : 'Invalid Amount',
        message: isAr ? 'يرجى إدخال مبلغ صحيح للدفعة.' : 'Please enter a valid payment amount.',
        type: 'error'
      });
      return;
    }

    setIsProcessingAction(selectedTaskForPayment.id);
    try {
      const generatedReceiptNo = `REC-${Date.now().toString().slice(-6)}`;
      const linkedInvoiceId = selectedTaskForPayment.invoices && selectedTaskForPayment.invoices.length > 0
        ? selectedTaskForPayment.invoices[0].id
        : null;

      // Strictly insert into receipts with status = 'draft'
      const { error: rcpErr } = await supabase
        .from('receipts')
        .insert([{
          receipt_number: generatedReceiptNo,
          invoice_id: linkedInvoiceId,
          service_id: selectedTaskForPayment.id,
          client_id: selectedTaskForPayment.client_id,
          collected_by: user?.id || null,
          amount_paid: amountPaid,
          gov_fee: Number(paymentData.gov_fee || 0),
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.payment_reference || '',
          payment_date: paymentData.payment_date,
          status: 'draft',
          notes: paymentData.notes || `Draft payment collected for ${selectedTaskForPayment.title}`
        }]);

      if (rcpErr) throw rcpErr;

      // Push Realtime notification to Accounts team for verification
      const { error: notifErr } = await supabase
        .from('notifications')
        .insert([{
          sender_id: user?.id || null,
          recipient_role: 'accountant',
          service_id: selectedTaskForPayment.id,
          receipt_id: null,
          title: isAr ? 'تسجيل دفعة جديدة للتحقق' : 'New Payment Logged for Verification',
          message: isAr
            ? `تم تسجيل دفعة نقدية/بنكية بقيمة ${amountPaid.toFixed(3)} ر.ع للمهمة "${selectedTaskForPayment.title}". بانتظار اعتماد المحاسب والمزامنة في DSR.`
            : `Draft payment of OMR ${amountPaid.toFixed(3)} logged for "${selectedTaskForPayment.title}" (${generatedReceiptNo}). Awaiting verification.`,
          type: 'payment_logged'
        }]);
      if (notifErr) console.warn('Payment notification notice:', notifErr);

      // Close modal & reset
      setSelectedTaskForPayment(null);
      setPaymentData({
        amount: '',
        gov_fee: '0',
        payment_method: 'Bank transfer',
        payment_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      setNotification({
        show: true,
        title: isAr ? 'تم تسجيل مسودة الإيصال' : 'Draft Payment Logged',
        message: isAr
          ? `تم تسجيل الدفعة (${generatedReceiptNo}) بنجاح وإرسال إشعار لفريق المحاسبة للتدقيق والمطابقة.`
          : `Receipt ${generatedReceiptNo} logged as DRAFT and forwarded to Accounts for verification.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في تسجيل الدفعة' : 'Payment Logging Error',
        message: err.message || 'Could not record receipt',
        type: 'error'
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm.trim() ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed top-6 end-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'success'
            ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/30'
            : 'bg-red-900/95 text-red-100 border-red-500/30'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={20} className="text-red-400 shrink-0" />}
          <div>
            <p className="text-xs font-black uppercase tracking-wider">{notification.title}</p>
            <p className="text-xs font-semibold mt-0.5 text-white/90">{notification.message}</p>
          </div>
        </div>
      )}

      {/* ── Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white to-gray-50/80 p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#A11212]/10 text-[#A11212] text-[10px] font-black uppercase tracking-widest rounded-full">
                {isAr ? 'مساحة العمل والتنفيذ' : 'Task Execution & Service Delivery'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                <ShieldCheck size={14} className="text-blue-500" />
                {isAr ? 'مزامنة مباشرة مع الحسابات' : 'Auto-Invoicing Enabled'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {isAr ? 'المهام ومتابعة التسليم' : 'My Assigned Tasks & Deliverables'}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
              {isAr
                ? 'استلم المهام الموجهة من رئيس القسم، وابدأ العمل لإنشاء مسودة الفاتورة تلقائياً وسجل الدفعات المستلمة.'
                : 'Execute assignments from your HOD, auto-generate draft invoices upon start, and log client payments.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={fetchTasks}
              className="p-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl border border-gray-200 shadow-xs transition-colors"
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Search & Priority Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-100">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isAr ? 'بحث في المهام أو أسماء الشركات...' : 'Search tasks or clients...'}
              className="w-full bg-white border border-gray-200 rounded-2xl ps-10 pe-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#A11212]"
            >
              <option value="all">{isAr ? 'جميع درجات الأولوية' : 'All Priorities'}</option>
              <option value="urgent">{isAr ? 'طوارئ / عاجل' : 'Urgent'}</option>
              <option value="high">{isAr ? 'أولوية عالية' : 'High'}</option>
              <option value="medium">{isAr ? 'أولوية متوسطة' : 'Medium'}</option>
              <option value="low">{isAr ? 'أولوية منخفضة' : 'Low'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── KANBAN TASK BOARD ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-gray-100">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#A11212] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-400">{isAr ? 'جاري تحميل المهام...' : 'Loading tasks...'}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const columnTasks = filteredTasks.filter(t => {
              if (col.key === 'started') return t.status === 'started' || t.status === 'ongoing';
              return t.status === col.key;
            });

            return (
              <div key={col.key} className="bg-gray-50/80 rounded-3xl p-4 border border-gray-100 flex flex-col min-h-[500px]">
                {/* Column Title */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                      {isAr ? col.label_ar : col.label_en}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${col.badgeCls}`}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] scrollbar-hide">
                  {columnTasks.length === 0 ? (
                    <div className="h-36 flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-200 rounded-2xl bg-white/40">
                      <Briefcase size={22} className="text-gray-300 mb-1" />
                      <p className="text-xs font-bold text-gray-400">{isAr ? 'لا توجد مهام' : 'No tasks'}</p>
                    </div>
                  ) : (
                    columnTasks.map(task => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                      const isStarting = isProcessingAction === task.id;

                      return (
                        <div
                          key={task.id}
                          className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-xs hover:shadow-md transition-all border-s-4 ${col.borderAccent} space-y-3`}
                        >
                          {/* Title & Priority */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-black text-sm text-gray-900 leading-snug">
                              {task.title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              task.priority === 'urgent' || task.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {task.priority || 'medium'}
                            </span>
                          </div>

                          {/* Client Name */}
                          {task.clients?.company_name && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#A11212] bg-[#A11212]/5 px-2.5 py-1 rounded-lg w-fit">
                              <Building2 size={12} />
                              <span className="truncate max-w-[170px]">{task.clients.company_name}</span>
                            </div>
                          )}

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-gray-500 font-medium line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Budget & Due Date */}
                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-50">
                            <span className="font-bold text-gray-700">
                              OMR {(task.budget || 0).toFixed(3)}
                            </span>
                            {task.due_date && (
                              <span className={`flex items-center gap-1 font-bold ${isOverdue ? 'text-red-600 font-black' : ''}`}>
                                <Calendar size={12} />
                                {task.due_date}
                              </span>
                            )}
                          </div>

                          {/* Action Bar Based on Current Stage */}
                          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                            {/* If Pending -> Show Big "Start Work" Button */}
                            {task.status === 'pending' && (
                              <button
                                onClick={() => handleStartTask(task)}
                                disabled={isStarting}
                                className="w-full flex items-center justify-center gap-2 bg-[#A11212] hover:bg-[#800e0e] text-white py-2 rounded-xl text-xs font-black transition-all shadow-xs disabled:opacity-50"
                              >
                                <PlayCircle size={14} />
                                <span>{isStarting ? (isAr ? 'جاري البدء...' : 'Starting...') : (isAr ? 'بدء العمل (إنشاء فاتورة)' : 'Start Work (Auto-Invoice)')}</span>
                              </button>
                            )}

                            {/* If Started/In Progress -> Show Log Payment and Submit for Review */}
                            {(task.status === 'started' || task.status === 'ongoing') && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedTaskForPayment(task)}
                                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-[11px] font-black transition-colors"
                                >
                                  <Receipt size={13} />
                                  <span>{isAr ? 'تسجيل دفعة' : 'Log Payment'}</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(task.id, 'under_review')}
                                  className="flex-1 flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 py-1.5 rounded-xl text-[11px] font-black transition-colors"
                                >
                                  <Send size={13} />
                                  <span>{isAr ? 'للمراجعة' : 'Review'}</span>
                                </button>
                              </div>
                            )}

                            {/* If Under Review -> Option to complete */}
                            {task.status === 'under_review' && (
                              <button
                                onClick={() => handleUpdateStatus(task.id, 'completed')}
                                className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-xl text-xs font-black transition-colors"
                              >
                                <CheckCircle2 size={13} />
                                <span>{isAr ? 'اعتماد الإنجاز كـ مكتمل' : 'Mark as Completed'}</span>
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

      {/* ── MODAL: LOG DRAFT PAYMENT ───────────────────────────────────── */}
      {selectedTaskForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {isAr ? 'تسجيل دفعة / تحصيل نقد' : 'Log Client Payment'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedTaskForPayment.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskForPayment(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-950 font-bold flex items-center justify-between">
                <span>{isAr ? 'العميل المستفيد:' : 'Client:'} {selectedTaskForPayment.clients?.company_name || 'N/A'}</span>
                <span>{isAr ? 'الميزانية:' : 'Budget:'} OMR {(selectedTaskForPayment.budget || 0).toFixed(3)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'المبلغ المحصل (ر.ع) *' : 'Amount Paid (OMR) *'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={paymentData.amount}
                    onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="0.000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'الرسوم الحكومية (إن وجدت)' : 'Government Fees (OMR)'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={paymentData.gov_fee}
                    onChange={e => setPaymentData({ ...paymentData, gov_fee: e.target.value })}
                    placeholder="0.000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'طريقة الدفع *' : 'Payment Method *'}
                  </label>
                  <select
                    value={paymentData.payment_method}
                    onChange={e => setPaymentData({ ...paymentData, payment_method: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  >
                    <option value="Bank transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="POS">{isAr ? 'نقطة بيع (POS)' : 'POS Card'}</option>
                    <option value="Mobile Payment">{isAr ? 'دفع عبر الهاتف' : 'Mobile Payment'}</option>
                    <option value="Cash">{isAr ? 'نقداً (Cash)' : 'Cash'}</option>
                    <option value="Cheque">{isAr ? 'شيك' : 'Cheque'}</option>
                    <option value="Online">{isAr ? 'بوابة إلكترونية' : 'Online'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                    {isAr ? 'تاريخ الدفعة' : 'Payment Date'}
                  </label>
                  <input
                    type="date"
                    value={paymentData.payment_date}
                    onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'رقم الإيصال البنكي / المرجع' : 'Payment / Bank Slip Reference'}
                </label>
                <input
                  type="text"
                  value={paymentData.payment_reference}
                  onChange={e => setPaymentData({ ...paymentData, payment_reference: e.target.value })}
                  placeholder={isAr ? 'مثال: TRX-88219482 أو رقم الشيك' : 'e.g. Bank slip reference, POS ref'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase mb-1">
                  {isAr ? 'ملاحظات المحاسبة' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={paymentData.notes}
                  onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder={isAr ? 'أي ملاحظات إضافية...' : 'Optional notes...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForPayment(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction === selectedTaskForPayment.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isProcessingAction === selectedTaskForPayment.id ? (isAr ? 'جاري التسجيل...' : 'Logging...') : (isAr ? 'تسجيل كـ مسودة إيصال' : 'Log Draft Receipt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
