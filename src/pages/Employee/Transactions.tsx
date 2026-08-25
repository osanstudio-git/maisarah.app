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
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ServiceTask {
  id: string;
  title: string;
  status: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  client_id: string | null;
  clients?: { company_name: string } | null;
}

// ---------------------------------------------------------------------------
// Column Configuration
// ---------------------------------------------------------------------------
const COLUMNS = [
  {
    key: 'ongoing',
    label_ar: 'قيد التنفيذ',
    label_en: 'Ongoing',
    icon: <PlayCircle size={16} className="text-blue-500" />,
    headerCls: 'bg-blue-500',
    countCls: 'bg-blue-100 text-blue-700',
    cardAccent: 'border-s-blue-400',
    emptyColor: 'text-blue-300',
  },
  {
    key: 'under_review',
    label_ar: 'قيد المراجعة',
    label_en: 'Under Review',
    icon: <Clock size={16} className="text-amber-500" />,
    headerCls: 'bg-amber-400',
    countCls: 'bg-amber-100 text-amber-700',
    cardAccent: 'border-s-amber-400',
    emptyColor: 'text-amber-300',
  },
  {
    key: 'completed',
    label_ar: 'مكتمل',
    label_en: 'Completed',
    icon: <CheckCircle2 size={16} className="text-green-500" />,
    headerCls: 'bg-green-500',
    countCls: 'bg-green-100 text-green-700',
    cardAccent: 'border-s-green-400',
    emptyColor: 'text-green-300',
  },
  {
    key: 'delayed',
    label_ar: 'متأخر',
    label_en: 'Delayed',
    icon: <AlertTriangle size={16} className="text-red-500" />,
    headerCls: 'bg-brand-dark',
    countCls: 'bg-red-100 text-red-700',
    cardAccent: 'border-s-brand-dark',
    emptyColor: 'text-red-300',
  },
];

// ---------------------------------------------------------------------------
// Task Card
// ---------------------------------------------------------------------------
const TaskCard = ({
  task,
  isAr,
  onStatusChange,
}: {
  task: ServiceTask;
  isAr: boolean;
  onStatusChange: (id: string, status: string) => void;
}) => {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'completed';

  const daysUntilDue = task.due_date
    ? Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-s-4 ${
      COLUMNS.find(c => c.key === task.status)?.cardAccent || 'border-s-gray-300'
    } hover:shadow-md transition-all duration-200 group`}>

      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h4 className="font-bold text-sm text-gray-800 leading-tight mb-1">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Client chip */}
        {task.clients?.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-brand-dark font-semibold bg-red-50 px-2.5 py-1 rounded-full w-fit">
            <Building2 size={11} />
            <span className="truncate max-w-[130px]">{task.clients.company_name}</span>
          </div>
        )}

        {/* Due date */}
        {task.due_date && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-500' : daysUntilDue !== null && daysUntilDue <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
            <Calendar size={12} />
            {isOverdue
              ? (isAr ? 'متأخر عن' : 'Overdue:')
              : (isAr ? 'استحقاق:' : 'Due:')} {new Date(task.due_date).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', { day: '2-digit', month: 'short' })}
            {isOverdue && (
              <span className="bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded font-bold ms-1">
                {isAr ? 'متأخر' : 'LATE'}
              </span>
            )}
          </div>
        )}

        {/* Status changer */}
        <div className="pt-1 border-t border-gray-50">
          <div className="relative">
            <select
              value={task.status}
              onChange={e => onStatusChange(task.id, e.target.value)}
              className="w-full appearance-none text-xs border border-gray-200 rounded-lg ps-3 pe-7 py-1.5
                outline-none focus:border-red-700 bg-gray-50 text-gray-600 font-medium cursor-pointer"
            >
              {COLUMNS.map(col => (
                <option key={col.key} value={col.key}>
                  {isAr ? col.label_ar : col.label_en}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty column placeholder
// ---------------------------------------------------------------------------
const EmptyColumn = ({ label, isAr }: { label: string; isAr: boolean }) => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-300 border-2 border-dashed border-gray-100 rounded-xl">
    <Briefcase size={28} className="mb-2 opacity-40" />
    <p className="text-xs text-center">{isAr ? 'لا توجد مهام' : 'No tasks'}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const Transactions = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [tasks, setTasks]         = useState<ServiceTask[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      /**
       * Fetch all services linked to this employee.
       * If the `assigned_employee_id` column exists and RLS is set,
       * Supabase will automatically scope this to the logged-in user.
       * Otherwise this returns all services (useful for demo / testing).
       */
      const { data, error } = await supabase
        .from('services')
        .select('id, title, status, description, due_date, created_at, client_id, clients(company_name)')
        .order('created_at', { ascending: false });

      if (!error && data) setTasks(data as ServiceTask[]);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Inline status update ──────────────────────────────────────────────────
  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status } : t));
    const { error } = await supabase.from('services').update({ status: status }).eq('id', id);
    if (error) {
      // Rollback on failure
      fetchTasks();
    }
  };

  // ── Filtered + grouped ────────────────────────────────────────────────────
  const filtered = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getByStatus = (status: string) => filtered.filter(t => t.status === status);
  const totalDelayed = tasks.filter(t => t.status === 'delayed' ||
    (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isAr ? 'text-right' : 'text-left'}`}>
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <Briefcase size={28} className="text-brand-dark" />
            {t('employee.tasksView')}
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">{t('employee.tasksSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {totalDelayed > 0 && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm shadow-red-900/5">
              <AlertTriangle size={14} className="animate-pulse" />
              {totalDelayed} {isAr ? 'متأخرة' : 'Delayed'}
            </div>
          )}
          <button
            onClick={fetchTasks}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-brand-dark hover:border-brand-dark/30 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {COLUMNS.map(col => (
          <div key={col.key} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-1.5 h-12 rounded-full ${col.headerCls} flex-shrink-0 shadow-sm`} />
            <div className={isAr ? 'text-right' : 'text-left'}>
              <div className="text-3xl font-black text-gray-900 tracking-tight">{getByStatus(col.key).length}</div>
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1 opacity-70">{isAr ? col.label_ar : col.label_en}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
        <input
          type="text"
          placeholder={isAr ? 'بحث في المهام...' : 'Search tasks...'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 border border-gray-200 rounded-2xl text-sm outline-none
            focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-white shadow-inner transition-all`}
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {COLUMNS.map(col => {
          const columnTasks = getByStatus(col.key);
          return (
            <div key={col.key} className="bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm transition-all hover:shadow-md">
              {/* Column Header */}
              <div className="p-5 bg-white border-b border-gray-100">
                <div className={`flex items-center justify-between ${isAr ? 'flex-row' : 'flex-row'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gray-50 shadow-inner`}>
                      {col.icon}
                    </div>
                    <h3 className="font-black text-sm text-gray-800 uppercase tracking-tight">
                      {isAr ? col.label_ar : col.label_en}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-sm ${col.countCls}`}>
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-3 min-h-[320px]">
                {columnTasks.length === 0 ? (
                  <EmptyColumn label={isAr ? col.label_ar : col.label_en} isAr={isAr} />
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAr={isAr}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Transactions;
