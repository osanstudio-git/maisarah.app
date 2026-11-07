import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Clock, Search, Download, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, XCircle, AlertTriangle, Coffee, Loader2, Plus, Edit, X, Save,
  Calendar, Filter, CalendarDays, Settings2, Trash2, Sun, Moon, Briefcase, RefreshCw, Palmtree
} from 'lucide-react';
import {
  getWorkSchedules,
  saveWorkSchedules,
  getHolidays,
  saveHolidays,
  DEFAULT_OMANI_SCHEDULE,
  DEFAULT_EXPAT_SCHEDULE,
  deleteHoliday,
  type DaySchedule,
  type HolidayItem,
  type EmployeeCategory
} from '../../utils/workScheduleConfig';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  dept: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave';
  breakDuration: number; // in minutes
  location: string;
}

export default function HRAttendance() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'schedules' | 'holidays'>('attendance');

  // Work Schedule & Shift editor state
  const [scheduleCategory, setScheduleCategory] = useState<EmployeeCategory>('Expat');
  const [omaniSchedules, setOmaniSchedules] = useState<DaySchedule[]>(() => getWorkSchedules().omani);
  const [expatSchedules, setExpatSchedules] = useState<DaySchedule[]>(() => getWorkSchedules().expat);
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false);

  // Holiday Manager state
  const [holidaysList, setHolidaysList] = useState<HolidayItem[]>(() => getHolidays());
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Omit<HolidayItem, 'id'>>({
    nameEn: '',
    nameAr: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    targetCategory: 'All',
    notes: ''
  });

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Period / Date selection
  const todayStr = new Date().toISOString().split('T')[0];
  const [viewMode, setViewMode] = useState<'today' | 'customDate' | 'month'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7));

  // Edit/Punch modal state
  const [editData, setEditData] = useState({
    checkIn: '08:00 AM',
    checkOut: '--',
    breakDuration: 30,
    status: 'Present' as AttendanceRecord['status'],
    location: 'Office HQ (Muscat)'
  });

  // ── 1. Fetch live attendance from Supabase ─────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const activeDate = viewMode === 'today' ? todayStr : selectedDate;

      let attQuery = supabase.from('hr_attendance').select('*');
      if (viewMode === 'month') {
        const [yStr, mStr] = selectedMonth.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        const lastDay = new Date(y, m, 0).getDate();
        const startOfMonth = `${selectedMonth}-01`;
        const endOfMonth = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        attQuery = attQuery.gte('work_date', startOfMonth).lte('work_date', endOfMonth).order('work_date', { ascending: false });
      } else {
        attQuery = attQuery.eq('work_date', activeDate);
      }

      // Fetch profiles, hr_employees, and target attendance logs
      const [{ data: profData }, { data: hrData }, { data: attLogs }, { data: leaveReqs }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept'),
        attQuery,
        supabase.from('hr_leave_requests').select('employee_id, start_date, end_date, hr_approval')
      ]);

      // Unified employee map
      const empMap = new Map<string, { id: string; name: string; role: string; dept: string }>();

      (profData || []).filter(p => p.role !== 'client').forEach(p => {
        empMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
          role: p.role || 'Employee',
          dept: p.department_id || p.department || 'General'
        });
      });

      (hrData || []).forEach(h => {
        if (!empMap.has(h.id)) {
          empMap.set(h.id, {
            id: h.id,
            name: h.full_name || h.email?.split('@')[0] || 'Staff Member',
            role: h.role || 'Employee',
            dept: h.dept || 'General'
          });
        }
      });

      const employees = Array.from(empMap.values());

      // Helper to check if employee is on approved leave
      const isOnLeaveOnDate = (empId: string, dStr: string) => {
        return (leaveReqs || []).some((l: any) =>
          l.employee_id === empId &&
          l.hr_approval === 'Approved' &&
          dStr >= l.start_date &&
          dStr <= l.end_date
        );
      };

// Helper to format 24h string to 12h AM/PM
function formatDisplayTime(rawTime?: string | null): string {
  if (!rawTime || rawTime === '--') return '--';
  const clean = rawTime.trim();
  if (clean.includes('AM') || clean.includes('PM') || clean.includes('ص') || clean.includes('م')) {
    return clean;
  }
  const parts = clean.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h) || isNaN(m)) return rawTime;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

      let calculatedRecords: AttendanceRecord[] = [];

      if (viewMode === 'month') {
        // In Month View, render all recorded shifts in this month
        calculatedRecords = (attLogs || []).map((log: any) => {
          const emp = empMap.get(log.employee_id) || {
            id: log.employee_id,
            name: 'Staff Member',
            role: 'Employee',
            dept: 'General'
          };

          const rawIn = log.check_in ? log.check_in.slice(0, 5) : null;
          const rawOut = log.check_out ? log.check_out.slice(0, 5) : null;
          const checkIn = rawIn ? formatDisplayTime(rawIn) : '--';
          const checkOut = rawOut ? formatDisplayTime(rawOut) : '--';
          const breakDuration = Number(log.break_duration || 0);

          let workingHours = '0h';
          if (rawIn && rawOut) {
            const [ih, im] = rawIn.split(':').map(Number);
            const [oh, om] = rawOut.split(':').map(Number);
            if (!isNaN(ih) && !isNaN(im) && !isNaN(oh) && !isNaN(om)) {
              const diffM = Math.max(0, (oh * 60 + om) - (ih * 60 + im) - breakDuration);
              workingHours = `${Math.floor(diffM / 60)}h ${diffM % 60}m`;
            }
          } else if (rawIn) {
            workingHours = isAr ? 'قيد العمل' : 'Active';
          }

          return {
            id: log.id.toString(),
            employeeId: emp.id,
            employeeName: emp.name,
            role: emp.role,
            dept: emp.dept,
            date: log.work_date,
            checkIn,
            checkOut,
            workingHours,
            status: (log.status as any) || 'Present',
            breakDuration,
            location: log.location || 'Office HQ (Muscat)'
          };
        });
      } else {
        // Daily View (Today or Custom Date)
        calculatedRecords = employees.map(emp => {
          const log = (attLogs || []).find((a: any) => a.employee_id === emp.id);
          const onLeave = isOnLeaveOnDate(emp.id, activeDate);

          const rawIn = log?.check_in ? log.check_in.slice(0, 5) : null;
          const rawOut = log?.check_out ? log.check_out.slice(0, 5) : null;
          const checkIn = rawIn ? formatDisplayTime(rawIn) : '--';
          const checkOut = rawOut ? formatDisplayTime(rawOut) : '--';

          let status: AttendanceRecord['status'] = 'Absent';
          let breakDuration = 0;
          let location = 'Office HQ (Muscat)';

          if (onLeave) {
            status = 'On Leave';
          } else if (log) {
            status = (log.status as any) || 'Present';
            breakDuration = Number(log.break_duration || 0);
            location = log.location || 'Office HQ (Muscat)';
          }

          // Calculate hours
          let workingHours = '0h';
          if (rawIn && rawOut) {
            const [ih, im] = rawIn.split(':').map(Number);
            const [oh, om] = rawOut.split(':').map(Number);
            if (!isNaN(ih) && !isNaN(im) && !isNaN(oh) && !isNaN(om)) {
              const diffM = Math.max(0, (oh * 60 + om) - (ih * 60 + im) - breakDuration);
              workingHours = `${Math.floor(diffM / 60)}h ${diffM % 60}m`;
            }
          } else if (rawIn) {
            if (activeDate === todayStr) {
              const [ih, im] = rawIn.split(':').map(Number);
              if (!isNaN(ih) && !isNaN(im)) {
                const now = new Date();
                const elapsedM = Math.max(0, (now.getHours() * 60 + now.getMinutes()) - (ih * 60 + im));
                workingHours = `${isAr ? 'قيد العمل' : 'Active'} (${Math.floor(elapsedM / 60)}h ${elapsedM % 60}m)`;
              } else {
                workingHours = isAr ? 'قيد العمل' : 'Active';
              }
            } else {
              workingHours = isAr ? 'قيد العمل' : 'Active';
            }
          }

          return {
            id: log?.id?.toString() || `temp-${emp.id}`,
            employeeId: emp.id,
            employeeName: emp.name,
            role: emp.role,
            dept: emp.dept,
            date: activeDate,
            checkIn,
            checkOut,
            workingHours,
            status,
            breakDuration,
            location
          };
        });
      }

      setRecords(calculatedRecords);
      localStorage.setItem('hr_attendance_cache', JSON.stringify(calculatedRecords));
    } catch (err) {
      console.error('Error fetching HR attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr, selectedDate, selectedMonth, viewMode, isAr]);

  useEffect(() => {
    fetchAttendance();

    // Realtime subscription on hr_attendance
    const channel = supabase
      .channel('hr_attendance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_attendance' },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAttendance]);

  // ── 2. Save / Punch Attendance Log in Supabase ────────────────────────────
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setSaving(true);
    try {
      const activeDate = viewMode === 'today' ? todayStr : selectedDate;
      const payload = {
        employee_id: selectedRecord.employeeId,
        work_date: viewMode === 'month' ? selectedRecord.date : activeDate,
        check_in: editData.checkIn !== '--' ? editData.checkIn : null,
        check_out: editData.checkOut !== '--' ? editData.checkOut : null,
        break_duration: Number(editData.breakDuration || 0),
        status: editData.status,
        location: editData.location
      };

      const { error } = await supabase
        .from('hr_attendance')
        .upsert(payload, { onConflict: 'employee_id,work_date' });

      if (error) throw error;

      setShowEditModal(false);
      fetchAttendance();
    } catch (err: any) {
      console.error('Error saving attendance in DB:', err);
      alert(isAr ? 'فشل تحديث سجل الحضور في قاعدة البيانات' : 'Failed to update attendance log in DB');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setEditData({
      checkIn: rec.checkIn !== '--' ? rec.checkIn : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkOut: rec.checkOut !== '--' ? rec.checkOut : '--',
      breakDuration: rec.breakDuration || 0,
      status: rec.status,
      location: rec.location || 'Office HQ (Muscat)'
    });
    setShowEditModal(true);
  };

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Role', 'Department', 'Date', 'Check-In', 'Check-Out', 'Hours Worked', 'Break (Mins)', 'Status', 'Location'];
    const rows = filteredRecords.map(r => [
      `"${r.employeeName}"`,
      `"${r.role}"`,
      `"${r.dept}"`,
      r.date,
      r.checkIn,
      r.checkOut,
      `"${r.workingHours}"`,
      r.breakDuration,
      r.status,
      `"${r.location}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const label = viewMode === 'month' ? selectedMonth : (viewMode === 'today' ? todayStr : selectedDate);
    link.setAttribute('download', `Maisarah_Staff_Attendance_${label}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── 3. Work Schedule Handlers ──────────────────────────────────────────────
  const activeSchedules = scheduleCategory === 'Omani' ? omaniSchedules : expatSchedules;

  const handleUpdateScheduleDay = (dayIndex: number, field: keyof DaySchedule, val: any) => {
    if (scheduleCategory === 'Omani') {
      const updated = [...omaniSchedules];
      updated[dayIndex] = { ...updated[dayIndex], [field]: val };
      setOmaniSchedules(updated);
    } else {
      const updated = [...expatSchedules];
      updated[dayIndex] = { ...updated[dayIndex], [field]: val };
      setExpatSchedules(updated);
    }
  };

  const handleSaveAllSchedules = () => {
    saveWorkSchedules({ omani: omaniSchedules, expat: expatSchedules });
    setScheduleSaveSuccess(true);
    setTimeout(() => setScheduleSaveSuccess(false), 3000);
  };

  const handleResetToDefaults = () => {
    if (scheduleCategory === 'Omani') {
      setOmaniSchedules(DEFAULT_OMANI_SCHEDULE);
      saveWorkSchedules({ omani: DEFAULT_OMANI_SCHEDULE, expat: expatSchedules });
    } else {
      setExpatSchedules(DEFAULT_EXPAT_SCHEDULE);
      saveWorkSchedules({ omani: omaniSchedules, expat: DEFAULT_EXPAT_SCHEDULE });
    }
    setScheduleSaveSuccess(true);
    setTimeout(() => setScheduleSaveSuccess(false), 2500);
  };

  // ── 4. Holiday Management Handlers ─────────────────────────────────────────
  const handleAddNewHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.nameEn.trim() && !newHoliday.nameAr.trim()) return;

    const item: HolidayItem = {
      id: `hol-${Date.now()}`,
      nameEn: newHoliday.nameEn.trim() || newHoliday.nameAr.trim(),
      nameAr: newHoliday.nameAr.trim() || newHoliday.nameEn.trim(),
      startDate: newHoliday.startDate,
      endDate: newHoliday.endDate || newHoliday.startDate,
      targetCategory: newHoliday.targetCategory,
      notes: newHoliday.notes
    };

    const updated = [...holidaysList, item];
    setHolidaysList(updated);
    saveHolidays(updated);
    setShowAddHolidayModal(false);
    setNewHoliday({
      nameEn: '',
      nameAr: '',
      startDate: todayStr,
      endDate: todayStr,
      targetCategory: 'All',
      notes: ''
    });
  };

  const handleDeleteHoliday = (id: string) => {
    if (!confirm(isAr ? 'هل تريد حذف هذه العطلة من التقويم؟' : 'Remove this holiday from the calendar?')) return;
    deleteHoliday(id, holidaysList);
    setHolidaysList(prev => prev.filter(h => h.id !== id));
  };

  const filteredRecords = records.filter(rec => {
    const matchesSearch = rec.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rec.dept.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rec.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalEmployees = records.length;
  const presentCount = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;
  const lateCount = records.filter(r => r.status === 'Late').length;
  const breakExceededCount = records.filter(r => r.breakDuration > 60).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ── Top Level HR Navigation Tabs ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-gray-150 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'attendance'
                ? 'bg-[#A11212] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock size={16} />
            <span>{isAr ? 'سجل الحضور اليومي' : 'Staff Daily Attendance'}</span>
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'schedules'
                ? 'bg-[#A11212] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings2 size={16} />
            <span>{isAr ? 'مواعيد وورديات العمل (عمانيون / وافدون)' : 'Work Schedules & Shifts (Omani / Expat)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'holidays'
                ? 'bg-[#A11212] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Palmtree size={16} />
            <span>{isAr ? 'جدول العطلات الرسمية والإجازات' : 'Holiday & Leave Calendar'}</span>
          </button>
        </div>

        {activeTab === 'schedules' && (
          <div className="flex items-center gap-2">
            {scheduleSaveSuccess && (
              <span className="text-xs font-bold text-green-600 flex items-center gap-1 animate-pulse">
                <CheckCircle2 size={15} /> {isAr ? 'تم حفظ التعديلات بنجاح' : 'Schedules Saved & Applied!'}
              </span>
            )}
            <button
              onClick={handleSaveAllSchedules}
              className="bg-[#A11212] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save size={14} />
              {isAr ? 'حفظ السياسة وتطبيقها' : 'Save & Apply Policy'}
            </button>
          </div>
        )}

        {activeTab === 'holidays' && (
          <button
            onClick={() => setShowAddHolidayModal(true)}
            className="bg-[#A11212] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            {isAr ? 'إضافة عطلة رسمية جديدة' : 'Add Official Holiday'}
          </button>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 1: STAFF DAILY ATTENDANCE
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'حاضر اليوم' : 'Present Today'}</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{presentCount} / {totalEmployees}</h3>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'الغياب' : 'Absences'}</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{absentCount}</h3>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                <XCircle size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'متأخر' : 'Late Arrival'}</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{lateCount}</h3>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                <AlertTriangle size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'تجاوز فترة الاستراحة' : 'Exceeded Breaks'}</p>
                <h3 className="text-2xl font-black text-red-600 mt-1">{breakExceededCount}</h3>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#A11212]">
                <Coffee size={20} />
              </div>
            </div>
          </div>

      {/* ── Table & Filters ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Period / Date Selector Toolbar */}
        <div className="p-4 bg-white border-b border-gray-150 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">
              {isAr ? 'عرض الحضور حسب:' : 'View By:'}
            </span>

            {/* Mode: Today */}
            <button
              onClick={() => {
                setViewMode('today');
                setSelectedDate(todayStr);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'today'
                  ? 'bg-[#A11212] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isAr ? 'اليوم' : 'Today'}
            </button>

            {/* Mode: Specific Date */}
            <button
              onClick={() => setViewMode('customDate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'customDate'
                  ? 'bg-[#A11212] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isAr ? 'يوم محدد' : 'Specific Date'}
            </button>

            {/* Mode: Full Month */}
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-[#A11212] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isAr ? 'سجل الشهر كاملاً' : 'Full Month Timesheet'}
            </button>
          </div>

          {/* Conditional Pickers */}
          <div className="flex items-center gap-2">
            {viewMode === 'customDate' && (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                <Calendar size={14} className="text-gray-400" />
                <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">
                  {isAr ? 'التاريخ:' : 'Date:'}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                />
              </div>
            )}

            {viewMode === 'month' && (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                <Calendar size={14} className="text-gray-400" />
                <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">
                  {isAr ? 'الشهر:' : 'Month:'}
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Filters Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="flex flex-1 w-full gap-2">
            <div className="relative flex-1">
              <Search size={16} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
              <input
                type="text"
                placeholder={isAr ? 'البحث بالاسم أو القسم...' : 'Search by name or department...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-white border border-gray-200 rounded-xl py-2.5 ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs font-bold outline-none focus:border-[#A11212] transition-colors`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#A11212]"
            >
              <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="present">{isAr ? 'حاضر' : 'Present'}</option>
              <option value="late">{isAr ? 'متأخر' : 'Late'}</option>
              <option value="absent">{isAr ? 'غائب' : 'Absent'}</option>
              <option value="on leave">{isAr ? 'في إجازة' : 'On Leave'}</option>
            </select>
          </div>
          <button 
            onClick={handleExportCSV}
            className="bg-gray-900 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center"
          >
            <Download size={14} /> {isAr ? 'تصدير التقرير (CSV)' : 'Export Logs (CSV)'}
          </button>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <Loader2 size={28} className="animate-spin text-[#A11212] mx-auto mb-2" />
              <p className="text-xs font-bold">{isAr ? 'جاري مزامنة سجلات الحضور...' : 'Syncing live attendance...'}</p>
            </div>
          ) : (
            <table className="w-full text-start">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
                  {viewMode === 'month' && (
                    <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'التاريخ' : 'Date'}</th>
                  )}
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'تسجيل الدخول' : 'Check-In'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'تسجيل الخروج' : 'Check-Out'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'ساعات العمل' : 'Work Hours'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الاستراحة' : 'Break'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموقع' : 'Location'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.map(rec => {
                  const breakExceeded = rec.breakDuration > 60;
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-sm text-gray-900">{rec.employeeName}</p>
                        <p className="text-[10px] text-gray-500 font-bold">{rec.role} · {rec.dept}</p>
                      </td>
                      {viewMode === 'month' && (
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">{rec.date}</td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                          {rec.checkIn !== '--' && <ArrowDownLeft size={14} className="text-green-500" />}
                          {rec.checkIn}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                          {rec.checkOut !== '--' && <ArrowUpRight size={14} className="text-red-500" />}
                          {rec.checkOut}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-xs text-gray-900">{rec.workingHours}</td>
                      <td className="px-6 py-4">
                        {rec.breakDuration > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black ${breakExceeded ? 'text-red-600' : 'text-gray-700'}`}>
                              {rec.breakDuration}m
                            </span>
                            {breakExceeded && (
                              <span className="bg-red-50 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded">
                                Exceeded
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500">{rec.location}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          rec.status === 'Present' ? 'bg-green-50 text-green-700 border border-green-150' :
                          rec.status === 'Late' ? 'bg-orange-50 text-orange-700 border border-orange-150' :
                          rec.status === 'Absent' ? 'bg-red-50 text-red-700 border border-red-150' :
                          'bg-blue-50 text-blue-700 border border-blue-150'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Edit size={12} /> {isAr ? 'تعديل / تسجيل' : 'Log / Edit'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )}

  {/* ═════════════════════════════════════════════════════════════════════════
      TAB 2: WORK SCHEDULES & SHIFTS (OMANI VS EXPAT)
  ═════════════════════════════════════════════════════════════════════════ */}
  {activeTab === 'schedules' && (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Category Switcher & Policy Description */}
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Settings2 size={18} className="text-[#A11212]" />
              {isAr ? 'سياسة مواعيد العمل وساعات الدوام' : 'Work Schedule & Shift Policies'}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {isAr
                ? 'تحديد أوقات الدوام الرسمي، أيام العمل، والإجازات الأسبوعية (L) للموظفين العمانيين والوافدين'
                : 'Configure official shift hours, working days, and weekly off-days (L) for Omani and Expat staff.'}
            </p>
          </div>

          {/* Category Toggle Pills */}
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            <button
              onClick={() => setScheduleCategory('Expat')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                scheduleCategory === 'Expat'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🌍 {isAr ? 'الموظفون الوافدون (Expats)' : 'Expat Staff'}
            </button>
            <button
              onClick={() => setScheduleCategory('Omani')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                scheduleCategory === 'Omani'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🇴🇲 {isAr ? 'الموظفون العمانيون (Omanis)' : 'Omani Staff'}
            </button>
          </div>
        </div>

        {/* Policy Summary Callout */}
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#A11212]/10 text-[#A11212] flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
            {scheduleCategory === 'Omani' ? 'OM' : 'EX'}
          </div>
          <div className="text-xs space-y-1">
            <div className="font-black text-gray-900">
              {scheduleCategory === 'Omani'
                ? (isAr ? 'نظام دوام الموظف العماني:' : 'Omani Staff Shift Policy:')
                : (isAr ? 'نظام دوام الموظف الوافد:' : 'Expat Staff Shift Policy:')}
            </div>
            <div className="text-gray-600 leading-relaxed">
              {scheduleCategory === 'Omani' ? (
                isAr
                  ? 'الجمعة والسبت: إجازة أسبوعية (L) • الأحد إلى الأربعاء: 08:30 إلى 17:00 • الخميس: 08:30 إلى 16:00'
                  : 'Friday & Saturday: Day Off (L) • Sunday to Wednesday: 08:30 to 17:00 • Thursday: 08:30 to 16:00'
              ) : (
                isAr
                  ? 'الجمعة: إجازة أسبوعية (L) • السبت: دوام عمل من 10:00 إلى 16:00 • الأحد إلى الأربعاء: 08:30 إلى 17:00 • الخميس: 08:30 إلى 16:00'
                  : 'Friday: Day Off (L) • Saturday: Working Day (10:00 to 16:00) • Sunday to Wednesday: 08:30 to 17:00 • Thursday: 08:30 to 16:00'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Day by Day Schedule Table */}
      <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-xs">
        <div className="p-4 bg-gray-50/50 border-b border-gray-150 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            {isAr ? 'جدول الأيام وساعات الوردية' : 'WEEKLY SHIFT SCHEDULE'}
          </span>
          <button
            onClick={handleResetToDefaults}
            className="text-xs font-bold text-gray-500 hover:text-[#A11212] flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={13} />
            {isAr ? 'استعادة الجدول الافتراضي' : 'Reset to Standard'}
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {activeSchedules.map((day, idx) => {
            const isFriOrSat = day.dayOfWeek === 5 || day.dayOfWeek === 6;
            
            // Calculate shift duration
            let shiftDurationLabel = '--';
            if (!day.isOffDay && day.startTime && day.endTime) {
              const [sh, sm] = day.startTime.split(':').map(Number);
              const [eh, em] = day.endTime.split(':').map(Number);
              const diff = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
              shiftDurationLabel = `${Math.floor(diff / 60)}h ${diff % 60}m`;
            }

            return (
              <div
                key={day.dayOfWeek}
                className={`p-4 flex flex-wrap items-center justify-between gap-4 transition-colors ${
                  day.isOffDay ? 'bg-gray-50/50' : 'hover:bg-gray-50/80'
                }`}
              >
                {/* Day Name & Indicator */}
                <div className="w-44 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    day.isOffDay ? 'bg-gray-200 text-gray-600' : 'bg-red-50 text-[#A11212]'
                  }`}>
                    {day.dayOfWeek === 5 ? 'L' : day.dayOfWeek === 6 ? (scheduleCategory === 'Omani' ? 'L' : 'Sat') : (idx + 1)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">{isAr ? day.dayNameAr : day.dayNameEn}</h4>
                    <span className="text-[10px] text-gray-400 font-bold block">
                      {day.isOffDay ? (isAr ? 'إجازة أسبوعية' : 'Day Off') : (isAr ? 'يوم عمل رسمي' : 'Official Workday')}
                    </span>
                  </div>
                </div>

                {/* Day Off Toggle */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={day.isOffDay}
                      onChange={(e) => handleUpdateScheduleDay(idx, 'isOffDay', e.target.checked)}
                      className="w-4 h-4 rounded text-[#A11212] focus:ring-[#A11212] cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${day.isOffDay ? 'text-amber-700' : 'text-gray-600'}`}>
                      {isAr ? 'إجازة أسبوعية (L)' : 'Day Off (L)'}
                    </span>
                  </label>
                </div>

                {/* Start Time & End Time */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      {isAr ? 'البدء:' : 'Start:'}
                    </span>
                    <input
                      type="time"
                      disabled={day.isOffDay}
                      value={day.startTime}
                      onChange={(e) => handleUpdateScheduleDay(idx, 'startTime', e.target.value)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                        day.isOffDay
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-[#A11212] focus:ring-1 focus:ring-[#A11212]'
                      }`}
                    />
                  </div>

                  <span className="text-gray-300 font-bold">→</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      {isAr ? 'الانتهاء:' : 'End:'}
                    </span>
                    <input
                      type="time"
                      disabled={day.isOffDay}
                      value={day.endTime}
                      onChange={(e) => handleUpdateScheduleDay(idx, 'endTime', e.target.value)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                        day.isOffDay
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-[#A11212] focus:ring-1 focus:ring-[#A11212]'
                      }`}
                    />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="w-28 text-right">
                  {day.isOffDay ? (
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black bg-gray-100 text-gray-500 uppercase tracking-wider">
                      {isAr ? 'إجازة (L)' : 'Off (L)'}
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                      {shiftDurationLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Footer Bar */}
        <div className="p-4 bg-gray-50 border-t border-gray-150 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500 font-medium">
            {isAr
              ? 'تنعكس هذه التغييرات فوراً على ساعات الحضور والانصراف واحتساب التأخير والإجازات في تقويم الموظفين.'
              : 'Changes apply immediately across staff punch schedules, late arrival thresholds, and calendar timesheets.'}
          </p>
          <button
            onClick={handleSaveAllSchedules}
            className="bg-[#A11212] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save size={14} />
            {isAr ? 'حفظ السياسة لجميع الموظفين' : 'Save Policy Changes'}
          </button>
        </div>
      </div>
    </div>
  )}

  {/* ═════════════════════════════════════════════════════════════════════════
      TAB 3: HOLIDAY & LEAVE CALENDAR
  ═════════════════════════════════════════════════════════════════════════ */}
  {activeTab === 'holidays' && (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Palmtree size={18} className="text-[#A11212]" />
            {isAr ? 'جدول العطلات الرسمية والمناسبات' : 'Official Holidays & Company Off-Days'}
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {isAr
              ? 'تظهر العطلات المسجلة هنا تلقائياً في تقويم وسجل دوام جميع الموظفين كأيام إجازة رسمية بدون تسجيل غياب'
              : 'Registered holidays automatically reflect on all employee timesheets and heatmap calendars as official off-days.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddHolidayModal(true)}
          className="bg-[#A11212] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={15} />
          {isAr ? 'إضافة عطلة رسمية' : 'Add New Holiday'}
        </button>
      </div>

      {/* Holidays List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidaysList.map((h) => (
          <div
            key={h.id}
            className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:border-gray-200 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-sm shrink-0">
                  🌴
                </div>
                <button
                  onClick={() => handleDeleteHoliday(h.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={isAr ? 'حذف العطلة' : 'Delete Holiday'}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h4 className="text-sm font-black text-gray-900 mt-3">{isAr ? h.nameAr : h.nameEn}</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{isAr ? h.nameEn : h.nameAr}</p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Calendar size={14} className="text-[#A11212]" />
                  <span>
                    {h.startDate} {h.endDate && h.endDate !== h.startDate ? `— ${h.endDate}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                    {h.targetCategory === 'All'
                      ? (isAr ? 'جميع الموظفين' : 'All Staff')
                      : h.targetCategory === 'Omani'
                      ? (isAr ? 'العمانيون فقط' : 'Omani Staff Only')
                      : (isAr ? 'الوافدون فقط' : 'Expat Staff Only')}
                  </span>
                </div>

                {h.notes && (
                  <p className="text-[11px] text-gray-500 italic mt-1 bg-gray-50 p-2 rounded-xl border border-gray-100">
                    {h.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400">
              <span>{isAr ? 'معتمد في التقويم' : 'Active in Timesheet'}</span>
              <span className="text-green-600 flex items-center gap-1 font-black">
                <CheckCircle2 size={12} /> {isAr ? 'مطبق' : 'Applied'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* ═════════════════════════════════════════════════════════════════════════
      ADD HOLIDAY MODAL
  ═════════════════════════════════════════════════════════════════════════ */}
  {showAddHolidayModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
      <form onSubmit={handleAddNewHoliday} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Palmtree size={16} className="text-[#A11212]" />
              {isAr ? 'إضافة عطلة رسمية جديدة' : 'Add Official Holiday'}
            </h3>
            <p className="text-xs text-gray-500 font-bold mt-0.5">
              {isAr ? 'سوف تنعكس على تقويم الموظفين كإجازة معتمدة' : 'Will reflect on employee timesheets as off-days'}
            </p>
          </div>
          <button type="button" onClick={() => setShowAddHolidayModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              {isAr ? 'اسم العطلة (بالإنجليزية)' : 'Holiday Name (English)'}
            </label>
            <input
              type="text"
              required
              value={newHoliday.nameEn}
              onChange={(e) => setNewHoliday({ ...newHoliday, nameEn: e.target.value })}
              placeholder="e.g. Oman National Day, Eid Al Fitr"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              {isAr ? 'اسم العطلة (بالعربية)' : 'Holiday Name (Arabic)'}
            </label>
            <input
              type="text"
              value={newHoliday.nameAr}
              onChange={(e) => setNewHoliday({ ...newHoliday, nameAr: e.target.value })}
              placeholder="مثال: العيد الوطني العماني المجيد"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                {isAr ? 'تاريخ البداية' : 'Start Date'}
              </label>
              <input
                type="date"
                required
                value={newHoliday.startDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, startDate: e.target.value, endDate: e.target.value > newHoliday.endDate ? e.target.value : newHoliday.endDate })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                {isAr ? 'تاريخ النهاية' : 'End Date'}
              </label>
              <input
                type="date"
                required
                value={newHoliday.endDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              {isAr ? 'الفئة المستهدفة' : 'Target Category'}
            </label>
            <select
              value={newHoliday.targetCategory}
              onChange={(e) => setNewHoliday({ ...newHoliday, targetCategory: e.target.value as any })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
            >
              <option value="All">{isAr ? 'جميع الموظفين (All Employees)' : 'All Employees'}</option>
              <option value="Omani">{isAr ? 'الموظفون العمانيون فقط' : 'Omani Staff Only'}</option>
              <option value="Expat">{isAr ? 'الموظفون الوافدون فقط' : 'Expat Staff Only'}</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              {isAr ? 'ملاحظات / وصف' : 'Notes / Description'}
            </label>
            <textarea
              rows={2}
              value={newHoliday.notes}
              onChange={(e) => setNewHoliday({ ...newHoliday, notes: e.target.value })}
              placeholder={isAr ? 'تفاصيل إضافية عن العطلة...' : 'Additional holiday details...'}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddHolidayModal(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={15} />
              {isAr ? 'إضافة العطلة' : 'Add Holiday'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )}

      {/* ── Edit / Punch Modal ────────────────────────────────────────────── */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveAttendance} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  {isAr ? 'تسجيل وتحديث الحضور' : 'Log & Update Attendance'}
                </h3>
                <p className="text-xs text-gray-500 font-bold mt-0.5">{selectedRecord.employeeName}</p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'الحالة' : 'Attendance Status'}
                </label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Present">{isAr ? 'حاضر (Present)' : 'Present'}</option>
                  <option value="Late">{isAr ? 'متأخر (Late)' : 'Late'}</option>
                  <option value="Absent">{isAr ? 'غائب (Absent)' : 'Absent'}</option>
                  <option value="On Leave">{isAr ? 'في إجازة (On Leave)' : 'On Leave'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'وقت الدخول' : 'Check-In Time'}
                  </label>
                  <input
                    type="text"
                    value={editData.checkIn}
                    onChange={(e) => setEditData({ ...editData, checkIn: e.target.value })}
                    placeholder="08:00 AM"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'وقت الخروج' : 'Check-Out Time'}
                  </label>
                  <input
                    type="text"
                    value={editData.checkOut}
                    onChange={(e) => setEditData({ ...editData, checkOut: e.target.value })}
                    placeholder="05:00 PM"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'مدة الاستراحة (بالدقائق)' : 'Break Duration (Minutes)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={editData.breakDuration}
                  onChange={(e) => setEditData({ ...editData, breakDuration: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'الموقع' : 'Location'}
                </label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  placeholder="Office HQ (Muscat)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {isAr ? 'حفظ التحديث' : 'Save Update'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
