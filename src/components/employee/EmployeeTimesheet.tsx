import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, AlertCircle,
  ChevronLeft, ChevronRight, Download, Users, RefreshCw, UserCheck
} from 'lucide-react';

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
  dept: string;
}

interface AttendanceLogItem {
  id: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'late' | 'active' | 'scheduled' | 'absent';
  lateMinutes: number;
  durationMinutes: number;
  durationFormatted: string;
  isToday: boolean;
  isActiveShift: boolean;
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

  // ── 1. Fetch available employees ──────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      const [{ data: hrData }, { data: profData }] = await Promise.all([
        supabase.from('hr_employees').select('id, full_name, email, role, dept'),
        supabase.from('profiles').select('id, full_name, email, role')
      ]);

      const empMap = new Map<string, EmployeeOption>();

      (hrData || []).forEach(h => {
        empMap.set(h.id, {
          id: h.id,
          name: h.full_name || h.email?.split('@')[0] || 'Staff Member',
          role: h.role || 'Employee',
          dept: h.dept || 'Operations'
        });
      });

      (profData || []).filter(p => p.role !== 'client').forEach(p => {
        if (!empMap.has(p.id)) {
          empMap.set(p.id, {
            id: p.id,
            name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
            role: p.role || 'Employee',
            dept: 'Operations'
          });
        }
      });

      const list = Array.from(empMap.values());
      setEmployees(list);

      // Default selected employee
      if (!selectedEmpId && list.length > 0) {
        if (currentEmployeeId && list.some(e => e.id === currentEmployeeId)) {
          setSelectedEmpId(currentEmployeeId);
        } else {
          setSelectedEmpId(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Error loading employees for timesheet:', err);
    }
  }, [currentEmployeeId, selectedEmpId]);

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

  // Year and Month strings
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthStr = String(month + 1).padStart(2, '0');
  const monthKey = `${year}-${monthStr}`;

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const monthAbbr = currentDate.toLocaleString('default', { month: 'short' });

  // ── 2. Fetch Attendance for Selected Employee & Month ───────────────────────
  const fetchMonthAttendance = useCallback(async () => {
    if (!selectedEmpId) return;
    setLoading(true);

    try {
      const startDate = `${monthKey}-01`;
      const endDate = `${monthKey}-31`;

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

      const todayStr = new Date().toLocaleDateString('en-CA');
      const recordsByDate = new Map<string, any>();
      (records || []).forEach(r => {
        recordsByDate.set(r.work_date, r);
      });

      // Scheduled work shift start: 08:30 (510 minutes from midnight)
      const SCHEDULED_START_MINS = 8 * 60 + 30; // 08:30 AM

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const generatedLogs: AttendanceLogItem[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
        const dayDate = new Date(year, month, day);
        const dayOfWeek = dayDate.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday in Oman
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

            if (inMins > SCHEDULED_START_MINS) {
              lateMinutes = inMins - SCHEDULED_START_MINS;
              status = 'late';
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
              durationFormatted = isAr ? 'قيد العمل' : 'In Progress';
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
            lateMinutes,
            durationMinutes,
            durationFormatted,
            isToday,
            isActiveShift
          });
        } else {
          // No DB log for this day
          if (isWeekend) {
            // Weekend day: not listed as scheduled workday
            continue;
          } else if (isFuture) {
            // Future scheduled day
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
              isActiveShift: false
            });
          } else if (isPast) {
            // Past workday without log: Absent
            generatedLogs.push({
              id: `absent_${dateStr}`,
              date: dateStr,
              checkIn: null,
              checkOut: null,
              status: 'absent',
              lateMinutes: 0,
              durationMinutes: 0,
              durationFormatted: '0m',
              isToday: false,
              isActiveShift: false
            });
          } else if (isToday) {
            // Today but not clocked in yet
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
              isActiveShift: false
            });
          }
        }
      }

      setAttendanceLogs(generatedLogs);
    } catch (err) {
      console.warn('Error computing timesheet logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmpId, monthKey, year, month, monthStr, isAr]);

  useEffect(() => {
    fetchMonthAttendance();

    // Realtime subscription on hr_attendance
    const ch = supabase
      .channel('hr_attendance_timesheet')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_attendance' },
        () => fetchMonthAttendance()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchMonthAttendance]);

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

            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              {/* Employee Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200/80 px-2.5 py-1 rounded-xl transition-colors cursor-pointer border border-gray-200">
                <Users size={13} className="text-gray-500" />
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="bg-transparent font-black text-gray-900 outline-none cursor-pointer text-xs"
                  title="Switch employee to view their attendance"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.dept || emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-gray-300">•</span>
              <span className="text-gray-500 font-bold">
                {isAr ? 'الدوام المجدول: ٠٨:٣٠ – ١٧:٠٠' : 'Scheduled: 08:30 – 17:00'}
              </span>
            </div>
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
                  title={`${dateStr}: ${log ? log.status : 'No record'}`}
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
              <span className="w-3 h-3 rounded-md bg-gray-100 border border-gray-300"></span>
              {isAr ? 'مجدول' : 'Scheduled'}
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

          {loading ? (
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
                      const itemDate = new Date(item.date);
                      const dayName = itemDate.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNumFormatted = String(itemDate.getDate()).padStart(2, '0');
                      const monthAbbrFormatted = itemDate.toLocaleDateString('en-US', { month: 'short' });
                      const dateTitle = `${dayNumFormatted} ${monthAbbrFormatted} ${year}`;

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
                              <span className="text-emerald-700 font-bold">{isAr ? 'قيد العمل' : 'In Progress'}</span>
                            ) : item.durationFormatted}
                          </td>

                          {/* STATUS Column (Pill Badges matching Image 2) */}
                          <td className="py-3.5 px-4 text-center">
                            {item.status === 'late' || item.lateMinutes > 0 ? (
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
