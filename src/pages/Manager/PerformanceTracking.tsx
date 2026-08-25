import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  Star,
  MessageSquare,
  TrendingUp,
  Calendar,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
  clients?: { company_name: string } | null;
}

interface Feedback {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  clients?: { company_name: string } | null;
}

interface EmployeeProps {
  id: string;
  name_ar: string;
  name_en: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  tasksCompleted: number;
  delays: number;
  completionRate: number;
  joinedAt: string;
}

interface Props {
  employee: EmployeeProps;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Status Config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; icon: React.ReactNode; cls: string }> = {
  completed: { label_ar: 'مكتمل', label_en: 'Completed', icon: <CheckCircle2 size={14} />, cls: 'bg-green-100 text-green-700' },
  ongoing: { label_ar: 'قيد التنفيذ', label_en: 'Ongoing', icon: <PlayCircle size={14} />, cls: 'bg-blue-100 text-blue-700' },
  delayed: { label_ar: 'متأخر', label_en: 'Delayed', icon: <AlertTriangle size={14} />, cls: 'bg-red-100 text-red-700' },
  under_review: { label_ar: 'قيد المراجعة', label_en: 'Under Review', icon: <Clock size={14} />, cls: 'bg-amber-100 text-amber-700' },
};

// ---------------------------------------------------------------------------
// Monthly bar chart data builder
// ---------------------------------------------------------------------------
const buildMonthlyData = (tasks: Task[], isAr: boolean) => {
  const months = isAr
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  const now = new Date();
  const buckets: { name: string; completed: number; delayed: number }[] = months.map((m, i) => ({
    name: m,
    completed: 0,
    delayed: 0,
  }));

  tasks.forEach((task) => {
    const d = new Date(task.created_at);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 6) {
      const idx = 5 - monthsAgo;
      if (task.status === 'completed') buckets[idx].completed++;
      if (task.status === 'delayed') buckets[idx].delayed++;
    }
  });

  return buckets;
};

// ---------------------------------------------------------------------------
// Star Rating Display
// ---------------------------------------------------------------------------
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={14}
        className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const PerformanceTracking = ({ employee, onBack }: Props) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'feedback'>('tasks');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        /**
         * Complex join: services + clients
         * Filter by assigned_employee_id when the column exists in your schema.
         * Falls back to fetching all services and using mock data if not present.
         */
        const { data: serviceData } = await supabase
          .from('services')
          .select('id, title, status, due_date, created_at, clients(company_name)')
          .order('created_at', { ascending: false });

        // Map the data to handle the fact that Supabase returns 'clients' as an array
        const formattedTasks = (serviceData || []).map((s: any) => ({
          ...s,
          clients: Array.isArray(s.clients) ? s.clients[0] : s.clients
        }));

        setTasks(formattedTasks.length ? (formattedTasks as Task[]) : MOCK_TASKS);

        /**
         * Complex join: feedback + clients
         * Assumes a `feedback` table with columns:
         *   id, employee_id, client_id, rating (int), comment (text), created_at
         */
        const { data: feedbackData } = await supabase
          .from('feedback')
          .select('id, rating, comment, created_at, clients(company_name)')
          .eq('employee_id', employee.id)
          .order('created_at', { ascending: false });

        const formattedFeedback = (feedbackData || []).map((f: any) => ({
          ...f,
          clients: Array.isArray(f.clients) ? f.clients[0] : f.clients
        }));

        setFeedback(formattedFeedback.length ? (formattedFeedback as Feedback[]) : MOCK_FEEDBACK);
      } catch (err) {
        console.error('Fetch performance error:', err);
        setTasks(MOCK_TASKS);
        setFeedback(MOCK_FEEDBACK);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel('performance-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee.id]);

  // ── Computed Stats ─────────────────────────────────────────────────────────
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const delayedTasks = tasks.filter((t) => t.status === 'delayed' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')).length;
  const ongoingTasks = tasks.filter((t) => t.status === 'ongoing').length;
  const avgRating = feedback.length ? +(feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : 0;
  const chartData = buildMonthlyData(tasks, isAr);

  const completionRate = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : employee.completionRate;

  const getRateColor = (rate: number) => {
    if (rate >= 90) return '#10B981';
    if (rate >= 70) return '#F59E0B';
    return '#EF4444';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Back Button + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-brand-dark transition-colors"
        >
          <ArrowLeft size={20} className={isAr ? 'rotate-180' : ''} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {isAr ? 'تقرير أداء:' : 'Performance Report:'} <span className="text-brand-dark">{isAr ? employee.name_ar : employee.name_en}</span>
          </h2>
          <p className="text-sm text-gray-400">{employee.email}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
        </div>
      ) : (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: isAr ? 'منجزة' : 'Completed',
                value: completedTasks,
                icon: <CheckCircle2 size={20} />,
                bg: 'bg-green-50 text-green-600',
                textColor: 'text-green-700',
              },
              {
                label: isAr ? 'جارية' : 'Ongoing',
                value: ongoingTasks,
                icon: <PlayCircle size={20} />,
                bg: 'bg-blue-50 text-blue-600',
                textColor: 'text-blue-700',
              },
              {
                label: isAr ? 'متأخرة' : 'Delayed',
                value: delayedTasks,
                icon: <AlertTriangle size={20} />,
                bg: 'bg-red-50 text-red-600',
                textColor: 'text-red-700',
              },
              {
                label: isAr ? 'متوسط التقييم' : 'Avg. Rating',
                value: `${avgRating}/5`,
                icon: <Star size={20} />,
                bg: 'bg-amber-50 text-amber-500',
                textColor: 'text-amber-700',
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative group overflow-hidden">
                <div className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${kpi.bg}`}>
                  {kpi.icon}
                </div>
                <div className="mt-8 text-start">
                  <div className={`text-3xl font-black tracking-tight ${kpi.textColor}`}>{kpi.value}</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.15em] mt-2">{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Completion Rate + Bar Chart ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Completion Rate Ring */}
            <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-8 w-full text-start">
                {isAr ? 'معدل الإنجاز الكلي' : 'Overall Completion Rate'}
              </h3>
              {/* SVG Ring */}
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={getRateColor(completionRate)}
                    strokeWidth="3"
                    strokeDasharray={`${completionRate} ${100 - completionRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800">{completionRate}%</span>
                </div>
              </div>

              {/* Info below ring */}
              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{isAr ? 'إجمالي المهام' : 'Total Tasks'}</span>
                  <span className="font-bold text-gray-700">{tasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{isAr ? 'انضم في' : 'Joined'}</span>
                  <span className="font-bold text-gray-700 flex items-center gap-1">
                    <Calendar size={12} /> {employee.joinedAt}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Performance Bar Chart */}
            <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400 text-start">
                  {isAr ? 'أداء المهام الشهري (آخر 6 أشهر)' : 'Monthly Task Performance (Last 6 Months)'}
                </h3>
                <BarChart2 className="text-brand-dark opacity-40" size={20} />
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)', fontSize: '12px' }}
                    />
                    <Bar dataKey="completed" name={isAr ? 'منجزة' : 'Completed'} fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delayed" name={isAr ? 'متأخرة' : 'Delayed'} fill="#A11212" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  {isAr ? 'منجزة' : 'Completed'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <span className="w-3 h-3 rounded-full bg-brand-dark" />
                  {isAr ? 'متأخرة' : 'Delayed'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs: Tasks + Feedback ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab Bar */}
            <div className="flex border-b border-gray-100">
              {(['tasks', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === tab
                    ? 'text-brand-dark border-b-2 border-brand-dark bg-red-50/50'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab === 'tasks' ? <TrendingUp size={16} /> : <MessageSquare size={16} />}
                  {tab === 'tasks'
                    ? (isAr ? 'المهام' : 'Tasks')
                    : (isAr ? 'تقييمات العملاء' : 'Client Feedback')}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {tab === 'tasks' ? tasks.length : feedback.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab: Tasks */}
            {activeTab === 'tasks' && (
              <div className="divide-y divide-gray-50">
                {tasks.length === 0 ? (
                  <div className="text-center p-12 text-gray-400">
                    {isAr ? 'لا توجد مهام' : 'No tasks found'}
                  </div>
                ) : (
                  tasks.map((task) => {
                    const s = STATUS_CONFIG[task.status] || STATUS_CONFIG.ongoing;
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                    return (
                      <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-gray-50/70 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-lg ${s.cls}`}>{s.icon}</div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-800">{task.title}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {task.clients?.company_name || (isAr ? 'غير محدد' : 'Unassigned')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ms-9 sm:ms-0">
                          <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold ${s.cls}`}>
                            {isAr ? s.label_ar : s.label_en}
                          </span>
                          {task.due_date && (
                            <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                              <Calendar size={11} className="inline me-1" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab: Feedback */}
            {activeTab === 'feedback' && (
              <div className="divide-y divide-gray-50">
                {feedback.length === 0 ? (
                  <div className="text-center p-12 text-gray-400">
                    {isAr ? 'لا توجد تقييمات' : 'No feedback yet'}
                  </div>
                ) : (
                  feedback.map((fb) => (
                    <div key={fb.id} className="p-5 hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-brand-dark/10 text-brand-dark flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {(fb.clients?.company_name || 'C').charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-800">
                                {fb.clients?.company_name || (isAr ? 'عميل' : 'Client')}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(fb.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 ms-10 leading-relaxed">{fb.comment}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StarRating rating={fb.rating} />
                          <span className="text-xs font-bold text-amber-600">{fb.rating}/5</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mock Data (used as fallback when DB tables don't exist yet)
// ---------------------------------------------------------------------------
const MOCK_TASKS: Task[] = [
  { id: '1', title: 'إعداد الإقرار الضريبي', status: 'completed', due_date: '2025-03-15', created_at: '2025-01-10T10:00:00Z', clients: { company_name: 'شركة الموالح للإنشاء' } },
  { id: '2', title: 'مراجعة عقود العمل', status: 'ongoing', due_date: '2025-05-30', created_at: '2025-02-15T10:00:00Z', clients: { company_name: 'مجموعة الباطنة التجارية' } },
  { id: '3', title: 'تدقيق الحسابات الشهري', status: 'delayed', due_date: '2025-02-28', created_at: '2025-02-01T10:00:00Z', clients: { company_name: 'وزارة الإسكان' } },
  { id: '4', title: 'إصدار فاتورة ضريبية', status: 'completed', due_date: '2025-03-10', created_at: '2025-03-01T10:00:00Z', clients: { company_name: 'شركة الموالح للإنشاء' } },
  { id: '5', title: 'تقرير الأرباح الربعي', status: 'under_review', due_date: '2025-04-30', created_at: '2025-04-01T10:00:00Z', clients: { company_name: 'شركة النخيل' } },
];

const MOCK_FEEDBACK: Feedback[] = [
  { id: 'f1', rating: 5, comment: 'خدمة ممتازة وسريعة، الموظف محترف ودقيق جداً في عمله.', created_at: '2025-03-20T10:00:00Z', clients: { company_name: 'شركة الموالح للإنشاء' } },
  { id: 'f2', rating: 4, comment: 'أداء جيد جداً، ولكن كان هناك تأخير بسيط في التسليم.', created_at: '2025-02-15T10:00:00Z', clients: { company_name: 'مجموعة الباطنة التجارية' } },
  { id: 'f3', rating: 5, comment: 'تعامل راقٍ وحل مشكلتنا بكفاءة عالية. شكراً جزيلاً.', created_at: '2025-01-25T10:00:00Z', clients: { company_name: 'وزارة الإسكان' } },
];

export default PerformanceTracking;
