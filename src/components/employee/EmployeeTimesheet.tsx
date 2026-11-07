import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, AlertCircle,
  ChevronLeft, ChevronRight, Download, Users, RefreshCw, UserCheck, Palmtree
} from 'lucide-react';
import {
  getDayScheduleForEmployee,
  resolveEmployeeCategory,
  subscribeWorkSchedules,
  type EmployeeCategory
} from '../../utils/workScheduleConfig';

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
  dept: string;
  nationality?: string | null;
}

interface AttendanceLogItem {
  id: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'late' | 'active' | 'scheduled' | 'absent' | 'off_day' | 'holiday';
  holidayName?: string;
  lateMinutes: number;
  durationMinutes: number;
  durationFormatted: string;
  isToday: boolean;
  isActiveShift: boolean;
  scheduledTime?: string;
}

interface EmployeeTimesheetProps {
  currentEmployeeId?: string;
  currentEmployeeName?: string;
  isAr?: boolean;
}

export default function EmployeeTimesheet({
  currentEmployeeId,
  currentEmployeeName,
  isAr = false
}: EmployeeTimesheetProps) {
  const { t } = useTranslation();

  // Active Month & Year
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // All Employees for the employee switcher dropdown
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(currentEmployeeId || '');
  const [loading, setLoading] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogItem[]>([]);
  const isInitialLoad = useRef(true);

  // ── 1. Fetch available employees ──────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      const [{ data: hrData }, { data: profData }] = await Promise.all([
        supabase.from('hr_employees').select('id, full_name, email, role, dept, nationality'),
        supabase.from('profiles').select('id, full_name, email, role, nationality')
      ]);

      const empMap = new Map<string, EmployeeOption>();

      (hrData || []).forEach(h => {
        empMap.set(h.id, {
          id: h.id,
          name: h.full_name || h.email?.split('@')[0] || 'Staff Member',
          role: h.role || 'Employee',
          dept: h.dept || 'Operations',
          nationality: h.nationality || null
        });
      });

      (profData || []).filter(p => p.role !== 'client').forEach(p => {
        if (!empMap.has(p.id)) {
          empMap.set(p.id, {
            id: p.id,
            name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
            role: p.role || 'Employee',
            dept: 'Operations',
            nationality: p.nationality || null
          });
        }
      });

      const list = Array.from(empMap.values());
      setEmployees(list);

      // Lock strictly to the logged in employee
      if (currentEmployeeId) {
        setSelectedEmpId(currentEmployeeId);
      } else {
        setSelectedEmpId(prev => prev || (list.length > 0 ? list[0].id : ''));
      }
    } catch (err) {
      console.warn('Error loading employees for timesheet:', err);
    }
  }, [currentEmployeeId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // If prop currentEmployeeId changes and is set
  useEffect(() => {
    if (currentEmployeeId) {
      setSelectedEmpId(currentEmployeeId);
    }
  }, [currentEmployeeId]);

  // Derived selected employee object
  const activeEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || {
      id: selectedEmpId,
      name: currentEmployeeName || 'Hamid',
      role: 'Staff Member',
      dept: 'Operations'
    };
  }, [employees, selectedEmpId, currentEmployeeName]);

  const empCategory = useMemo(() => resolveEmployeeCategory(activeEmployee), [activeEmployee]);

  // Year and Month strings
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthStr = String(month + 1).padStart(2, '0');
  const monthKey = `${year}-${monthStr}`;

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const monthAbbr = currentDate.toLocaleString('default', { month: 'short' });

  // ── 2. Fetch Attendance for Selected Employee & Month ───────────────────────
  const fetchMonthAttendance = useCallback(async (isSilent = false) => {
    if (!selectedEmpId) {
      setLoading(false);
      return;
    }
    if (!isSilent && isInitialLoad.current) {
      setLoading(true);
    }

    try {
      const daysInThisMonth = new Date(year, month + 1, 0).getDate();
      const startDate = `${monthKey}-01`;
      const endDate = `${monthKey}-${String(daysInThisMonth).padStart(2, '0')}`;

      const { data: records, error } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('employee_id', selectedEmpId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: true });

      if (error) {
        console.warn('Error fetching hr_attendance:', error);
      }

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
      const todayDay = String(now.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

      const recordsByDate = new Map<string, any>();
      (records || []).forEach(r => {
        recordsByDate.set(r.work_date, r);
      });

      // Resolve employee category: Omani vs Expat based on nationality
      const categoryToUse = empCategory;

      const daysInMonth = daysInThisMonth;
      const generatedLogs: AttendanceLogItem[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
        const daySchedule = getDayScheduleForEmployee(dateStr, categoryToUse);
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        const isFuture = dateStr > todayStr;

        const dbRecord = recordsByDate.get(dateStr);

        if (dbRecord) {
          const rawIn = dbRecord.check_in ? dbRecord.check_in.slice(0, 5) : null;
          const rawOut = dbRecord.check_out ? dbRecord.check_out.slice(0, 5) : null;
          const breakMins = Number(dbRecord.break_duration || 0);

          let durationMinutes = 0;
          let durationFormatted = '--';
          let lateMinutes = 0;
          let status: AttendanceLogItem['status'] = 'present';
          let isActiveShift = false;

          if (rawIn) {
            const [ih, im] = rawIn.split(':').map(Number);
            const inMins = ih * 60 + im;

            // Target scheduled start time based on policy for this day & category (e.g. 10:00 on Saturday for Expats)
            const targetStartMins = daySchedule.scheduledStartMins || (8 * 60 + 30);

            // Only mark as late for shift if inMins > targetStartMins and not on day off / holiday
            if (!daySchedule.isOffDay && !daySchedule.isHoliday && inMins > targetStartMins) {
              lateMinutes = inMins - targetStartMins;
              status = 'late';
            } else if (!rawOut && isToday) {
              status = 'active';
            } else {
              status = 'present';
            }

            if (rawOut) {
              const [oh, om] = rawOut.split(':').map(Number);
              const outMins = oh * 60 + om;
              durationMinutes = Math.max(0, outMins - inMins - breakMins);
              durationFormatted = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
            } else if (isToday) {
              isActiveShift = true;
              status = 'active';
              const curMins = now.getHours() * 60 + now.getMinutes();
              durationMinutes = Math.max(0, curMins - inMins - breakMins);
              const elapsedH = Math.floor(durationMinutes / 60);
              const elapsedM = durationMinutes % 60;
              durationFormatted = `${elapsedH}h ${elapsedM}m (${isAr ? 'قيد العمل' : 'Active'})`;
            } else {
              durationFormatted = isAr ? 'غير مكتمل' : 'Incomplete';
            }
          }

          generatedLogs.push({
            id: String(dbRecord.id),
            date: dateStr,
            checkIn: rawIn ? formatTime12(rawIn) : null,
            checkOut: rawOut ? formatTime12(rawOut) : (isActiveShift ? (isAr ? 'دوام مستمر' : 'Active Shift') : null),
            status,
            holidayName: daySchedule.holidayName,
            lateMinutes,
            durationMinutes,
            durationFormatted,
            isToday,
            isActiveShift,
            scheduledTime: `${daySchedule.startTime} – ${daySchedule.endTime}`
          });
        } else {
          // No DB log for this day
          if (daySchedule.isHoliday) {
            // Official Registered Holiday (e.g. Oman National Day)
            generatedLogs.push({
              id: `hol_${dateStr}`,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              status: 'holiday',
              holidayName: daySchedule.holidayName,
              lateMinutes: 0,
              durationMinutes: 0,
              durationFormatted: isAr ? 'عطلة رسمية' : 'Official Holiday',
              isToday,
              isActiveShift: false,
              scheduledTime: isAr ? 'إجازة رسمية' : 'Public Holiday'
            });
          } else if (daySchedule.isOffDay) {
            // Day Off (L) (e.g. Friday for all; Saturday for Omani)
            generatedLogs.push({
              id: `off_${dateStr}`,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              status: 'off_day',
              lateMinutes: 0,
              durationMinutes: 0,
              durationFormatted: isAr ? 'إجازة أسبوعية' : 'Day Off (L)',
              isToday,
              isActiveShift: false,
              scheduledTime: isAr ? 'إجازة أسبوعية' : 'Day Off (L)'
            });
          } else if (isFuture) {
            // Future scheduled working day (e.g. Saturday for Expat from 10:00 to 16:00, or Sun-Wed 08:30-17:00)
            generatedLogs.push({
              id: `sched_${dateStr}`,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              status: 'scheduled',
              lateMinutes: 0,
              durationMinutes: 0,
              durationFormatted: '--:--',
              isToday: false,
              isActiveShift: false,
              scheduledTime: `${daySchedule.startTime} – ${daySchedule.endTime}`
            });
          } else if (isPast) {
            // Past working day without punch
            continue;
          } else if (isToday) {
            // Today working day, pending punch
            generatedLogs.push({
              id: `today_${dateStr}`,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              status: 'scheduled',
              lateMinutes: 0,
              durationMinutes: 0,
              durationFormatted: '--:--',
              isToday: true,
              isActiveShift: false,
              scheduledTime: `${daySchedule.startTime} – ${daySchedule.endTime}`
            });
          }
        }
      }

      setAttendanceLogs(generatedLogs);
    } catch (err) {
      console.warn('Error computing timesheet logs:', err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [selectedEmpId, monthKey, year, month, monthStr, empCategory, isAr]);

  useEffect(() => {
    fetchMonthAttendance();

    // Auto-update live shift duration every 30 seconds silently
    const ticker = setInterval(() => {
      fetchMonthAttendance(true);
    }, 30000);

    // Subscribe to schedule and holiday configuration changes across tabs silently
    const unsubSchedule = subscribeWorkSchedules(() => {
      fetchMonthAttendance(true);
    });

    // Realtime subscription on hr_attendance
    const ch = supabase
      .channel(`hr_attendance_timesheet_${selectedEmpId || 'me'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_attendance' },
        () => fetchMonthAttendance(true)
      )
      .subscribe();

    return () => {
      clearInterval(ticker);
      unsubSchedule();
      supabase.removeChannel(ch);
    };
  }, [fetchMonthAttendance, selectedEmpId]);

  // Helper 24h -> 12h
  function formatTime12(time24: string): string {
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time24;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  // ── 3. Calculate 4 Summary Metrics ────────────────────────────────────────
  const metrics = useMemo(() => {
    const presentLogs = attendanceLogs.filter(l => l.checkIn !== null);
    const totalMinutes = presentLogs.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const workedHoursFormatted = `${hours}h ${mins}m`;

    const daysPresent = presentLogs.length;
    const lateArrivals = presentLogs.filter(l => l.status === 'late' || l.lateMinutes > 0).length;
    const absences = attendanceLogs.filter(l => l.status === 'absent').length;

    return {
      workedHoursFormatted,
      daysPresent,
      lateArrivals,
      absences
    };
  }, [attendanceLogs]);

  // ── 4. Calendar Heatmap Days ──────────────────────────────────────────────
  const heatmapDays = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

    const logMap = new Map<number, AttendanceLogItem>();
    attendanceLogs.forEach(l => {
      const dayNum = parseInt(l.date.split('-')[2], 10);
      if (!isNaN(dayNum)) logMap.set(dayNum, l);
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${monthStr}-${String(dayNum).padStart(2, '0')}`;
      const log = logMap.get(dayNum);
      const isSelected = selectedDay === dateStr;

      return {
        dayNum,
        dateStr,
        log,
        isSelected
      };
    });

    return { blanks, days };
  }, [year, month, monthStr, attendanceLogs, selectedDay]);

  // ── 5. Month Navigation ───────────────────────────────────────────────────
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().toLocaleDateString('en-CA'));
  };

  // Filtered log feed (if a specific day in heatmap is clicked, highlight/filter)
  const displayedFeed = useMemo(() => {
    if (selectedDay) {
      const match = attendanceLogs.filter(l => l.date === selectedDay);
      return match.length > 0 ? match : attendanceLogs;
    }
    return attendanceLogs;
  }, [attendanceLogs, selectedDay]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Day', 'Punch In', 'Punch Out', 'Shift Hours', 'Status', 'Late Minutes'];
    const rows = attendanceLogs.map(l => {
      const d = new Date(l.date);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      return [
        l.date,
        dayName,
        l.checkIn || '--',
        l.checkOut || '--',
        l.durationFormatted,
        l.status,
        l.lateMinutes ? `${l.lateMinutes}m` : '0m'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Timesheet_${activeEmployee.name.replace(/\s+/g, '_')}_${monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── HEADER CARD: Month Title, Employee Switcher, Navigation ────────── */}
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Left: Calendar Icon + Month Title + Subtitle with Employee Switcher */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon size={28} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {monthName} {year}
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-1">
              {isAr ? 'سجل الحضور والدوام الشهري' : 'Monthly attendance & shift history'}
            </p>
          </div>
        </div>

        {/* Right: Today Button + Month Navigation (< Nov >) */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Download CSV */}
          <button
            onClick={handleExportCSV}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
            title="Download Timesheet Report (CSV)"
          >
            <Download size={14} />
            <span className="hidden sm:inline">{isAr ? 'تقرير' : 'Export'}</span>
          </button>

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            {isAr ? 'اليوم' : 'Today'}
          </button>

          {/* Month Step Controls: < Nov > */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-all"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-black text-gray-800 tracking-wider">
              {monthAbbr}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-all"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 STATS CARDS: Worked Hours, Days Present, Late Arrivals, Absences ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Worked Hours */}
        <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {isAr ? 'ساعات العمل' : 'WORKED HOURS'}
            </p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">
              {metrics.workedHoursFormatted}
            </h3>
          </div>
        </div>

        {/* 2. Days Present */}
        <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {isAr ? 'أيام الحضور' : 'DAYS PRESENT'}
            </p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">
              {metrics.daysPresent} <span className="text-xs text-gray-400 font-bold">{isAr ? 'أيام' : 'days'}</span>
            </h3>
          </div>
        </div>

        {/* 3. Late Arrivals */}
        <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {isAr ? 'مرات التأخير' : 'LATE ARRIVALS'}
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">
              {metrics.lateArrivals} <span className="text-xs text-amber-500 font-bold">{isAr ? 'مرات' : 'times'}</span>
            </h3>
          </div>
        </div>

        {/* 4. Absences */}
        <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {isAr ? 'أيام الغياب' : 'ABSENCES'}
            </p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">
              {metrics.absences} <span className="text-xs text-rose-400 font-bold">{isAr ? 'أيام' : 'days'}</span>
            </h3>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN SECTION: Heatmap Grid (Left) + Attendance Log Feed (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (4 cols): Heatmap Grid */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              {monthName} {year} Heatmap Grid
            </h3>
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[10px] font-bold text-[#A11212] hover:underline"
              >
                {isAr ? 'إظهار الكل' : 'Clear filter'}
              </button>
            )}
          </div>

          {/* Weekday Labels (S M T W T F S) */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Calendar Grid of Day Badges */}
          <div className="grid grid-cols-7 gap-2">
            {/* Leading blanks */}
            {heatmapDays.blanks.map(b => (
              <div key={`blank_${b}`} className="w-9 h-9" />
            ))}

            {/* Days in Month */}
            {heatmapDays.days.map(({ dayNum, dateStr, log, isSelected }) => {
              // Styling based on status in Image 2:
              // - Late Warning: Orange (#f59e0b)
              // - On Time: Green (#10b981)
              // - Active Shift / Selected: Purple (#7c3aed)
              // - Default / Scheduled: Muted gray
              let badgeColor = 'bg-gray-50 border border-gray-200/80 text-gray-600 hover:bg-gray-100';

              if (log) {
                if (log.isActiveShift) {
                  badgeColor = 'bg-purple-600 text-white font-black shadow-xs shadow-purple-600/30';
                } else if (log.status === 'holiday') {
                  badgeColor = 'bg-purple-100 text-purple-700 border border-purple-300 font-bold';
                } else if (log.status === 'off_day') {
                  badgeColor = 'bg-gray-100 text-gray-400 border border-gray-200';
                } else if (log.status === 'late' || log.lateMinutes > 0) {
                  badgeColor = 'bg-amber-500 text-white font-black shadow-xs shadow-amber-500/30';
                } else if (log.status === 'present') {
                  badgeColor = 'bg-emerald-500 text-white font-black shadow-xs shadow-emerald-500/30';
                } else if (log.status === 'absent') {
                  badgeColor = 'bg-rose-100 text-rose-700 border border-rose-200 font-bold';
                }
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all cursor-pointer ${badgeColor} ${
                    isSelected ? 'ring-2 ring-offset-2 ring-[#A11212] scale-105' : ''
                  }`}
                  title={`${dateStr}: ${log ? (log.status === 'holiday' ? `Holiday: ${log.holidayName || 'Public Holiday'}` : log.status === 'off_day' ? 'Day Off (L)' : log.status) : 'No record'}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Heatmap Legend */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              {isAr ? 'في الموعد' : 'On Time'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500"></span>
              {isAr ? 'تأخير' : 'Late'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-600"></span>
              {isAr ? 'نشط الآن' : 'Active'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-100 border border-purple-300"></span>
              {isAr ? 'عطلة رسمية' : 'Holiday'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gray-100 border border-gray-300"></span>
              {isAr ? 'إجازة أسبوعية' : 'Day Off (L)'}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN (8 cols): Attendance Log Feed Table */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Attendance Log Feed — {monthName} {year}
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {isAr
                ? 'عرض الورديات المسجلة وحالات الحضور والانصراف لهذا الشهر'
                : 'Showing recorded shifts and attendance statuses for this month'}
            </p>
          </div>

          {loading && attendanceLogs.length === 0 ? (
            <div className="py-12 flex items-center justify-center gap-2 text-gray-400 text-xs">
              <RefreshCw size={16} className="animate-spin text-[#A11212]" />
              <span>{isAr ? 'جاري تحميل السجلات...' : 'Loading attendance logs...'}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                    <th className="py-3 px-4">{isAr ? 'التاريخ' : 'DATE'}</th>
                    <th className="py-3 px-4">{isAr ? 'تسجيل الدخول' : 'PUNCH IN'}</th>
                    <th className="py-3 px-4">{isAr ? 'تسجيل الخروج' : 'PUNCH OUT'}</th>
                    <th className="py-3 px-4">{isAr ? 'ساعات الوردية' : 'SHIFT HOURS'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'STATUS'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedFeed.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                        {isAr ? 'لا توجد سجلات لهذا الشهر' : 'No attendance logs recorded for this period.'}
                      </td>
                    </tr>
                  ) : (
                    displayedFeed.map(item => {
                      const [iYear, iMonth, iDay] = item.date.split('-').map(Number);
                      const itemDate = new Date(iYear, iMonth - 1, iDay);
                      const dayName = itemDate.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNumFormatted = String(iDay).padStart(2, '0');
                      const monthAbbrFormatted = itemDate.toLocaleDateString('en-US', { month: 'short' });
                      const dateTitle = `${dayNumFormatted} ${monthAbbrFormatted} ${iYear}`;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            item.date === selectedDay ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          {/* DATE Column */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900 block">{dateTitle}</span>
                            <span className="text-[10px] text-gray-400 font-medium block">{dayName}</span>
                          </td>

                          {/* PUNCH IN Column */}
                          <td className="py-3.5 px-4 font-semibold text-gray-700">
                            {item.checkIn || (item.status === 'scheduled' ? (isAr ? 'وردية مجدولة' : 'Scheduled Shift') : '--')}
                          </td>

                          {/* PUNCH OUT Column */}
                          <td className="py-3.5 px-4 font-semibold text-gray-700">
                            {item.isActiveShift ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                {isAr ? 'دوام مستمر' : 'Active Shift'}
                              </span>
                            ) : item.checkOut || (item.status === 'scheduled' ? (isAr ? 'وردية مجدولة' : 'Scheduled Shift') : '--')}
                          </td>

                          {/* SHIFT HOURS Column */}
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                            {item.isActiveShift ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                {item.durationFormatted}
                              </span>
                            ) : item.durationFormatted}
                          </td>

                          {/* STATUS Column (Pill Badges matching Image 2) */}
                          <td className="py-3.5 px-4 text-center">
                            {item.status === 'holiday' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide bg-purple-50 text-purple-700 border border-purple-200">
                                <span>🌴</span>
                                {item.holidayName || (isAr ? 'عطلة رسمية' : 'Official Holiday')}
                              </span>
                            ) : item.status === 'off_day' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-gray-100 text-gray-500 border border-gray-200">
                                {isAr ? 'إجازة أسبوعية (L)' : 'Day Off (L)'}
                              </span>
                            ) : item.status === 'late' || item.lateMinutes > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                {isAr ? `تأخير (${item.lateMinutes}د)` : `Late Warning (${item.lateMinutes}m)`}
                              </span>
                            ) : item.status === 'present' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {isAr ? 'في الموعد' : 'On Time'}
                              </span>
                            ) : item.status === 'active' || item.isActiveShift ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide bg-purple-50 text-purple-700 border border-purple-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                {isAr ? 'مستمر الآن' : 'Active Shift'}
                              </span>
                            ) : item.status === 'scheduled' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-gray-100 text-gray-500 border border-gray-200">
                                {isAr ? 'مجدول' : 'Scheduled'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
                                {isAr ? 'غائب' : 'Absent'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
