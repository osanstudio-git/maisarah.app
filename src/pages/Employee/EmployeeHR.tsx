import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import {
  Clock, Calendar, Download, AlertCircle, CheckCircle2, User, FileText, Send, Loader2, Info,
  Timer, TrendingUp, Check, RotateCcw, Filter, Coffee, Eye, X, CreditCard, ShieldCheck, RefreshCw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import EmployeeTimesheet from '../../components/employee/EmployeeTimesheet';

interface AttendanceLog {
  id: string;
  name: string;
  role: string;
  date: string;
  checkIn: string;
  checkOut: string;
  duration?: string;
  durationMinutes?: number;
  breakDuration?: number;
  status: 'present' | 'late' | 'absent';
  location: string;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  managerApproval: 'Pending' | 'Approved' | 'Rejected';
  hrApproval: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
}

interface Payslip {
  id: string;
  month: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'Disbursed' | 'Processed' | 'Pending';
  disbursedDate?: string;
  paymentRef?: string;
}

export default function EmployeeHR() {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: Timesheet (default) | Overview & Leave | Payslips
  const initialTab = (searchParams.get('tab') as 'timesheet' | 'overview' | 'payslips') || 'timesheet';
  const [activeTab, setActiveTab] = useState<'timesheet' | 'overview' | 'payslips'>(initialTab);

  // --- Dynamic Employee Profile ---
  const [employeeProfile, setEmployeeProfile] = useState<{
    id: string;
    name: string;
    role: string;
    dept: string;
    email: string;
    basicSalary: number;
    allowances: { housing: number; transport: number; other: number };
  }>({
    id: 'b1a85438-dcc9-4964-a251-7de0a0b07897',
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Ajan',
    role: 'Client Relationship Officer',
    dept: 'Client Success & Coordination',
    email: user?.email || 'marketing@maisarah.net',
    basicSalary: 1400,
    allowances: { housing: 300, transport: 150, other: 50 }
  });

  const employeeName = employeeProfile.name;
  const employeeRole = employeeProfile.role;

  // --- Attendance States ---
  const [clockLogs, setClockLogs] = useState<AttendanceLog[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeClockLog, setActiveClockLog] = useState<AttendanceLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toLocaleDateString('en-CA').slice(0, 7)); // e.g. "2026-11"
  const [selectedDay, setSelectedDay] = useState<string>(''); // specific date filter e.g. "2026-11-04"
  const [isTogglingClock, setIsTogglingClock] = useState(false);
  const [clockToast, setClockToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- Payslips States ---
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslipModal, setSelectedPayslipModal] = useState<Payslip | null>(null);
  const [loadingPayslips, setLoadingPayslips] = useState(false);

  // --- Leave Form States ---
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    days: 1,
    notes: ''
  });

  // --- Resolve Authoritative Employee UUID ---
  const getEffectiveEmployeeId = useCallback(async (): Promise<string> => {
    if (employeeProfile.id) return employeeProfile.id;
    if (user?.email) {
      const { data: byEmail } = await supabase.from('hr_employees').select('id').ilike('email', user.email).maybeSingle();
      if (byEmail?.id) return byEmail.id;
    }
    if (user?.id) {
      const { data: byId } = await supabase.from('hr_employees').select('id').eq('id', user.id).maybeSingle();
      if (byId?.id) return byId.id;
    }
    return 'b1a85438-dcc9-4964-a251-7de0a0b07897'; // Ajan UUID in hr_employees
  }, [employeeProfile.id, user]);

  // --- Sync / Load Live Leave Requests & Local Storage ---
  const fetchLeaves = useCallback(async () => {
    try {
      const liveList: LeaveRequest[] = [];
      const empId = await getEffectiveEmployeeId();

      // 1. Fetch from Supabase
      const { data: dbLeaves, error: dbErr } = await supabase
        .from('hr_leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbErr) {
        console.error('Error fetching hr_leave_requests:', dbErr);
      }

      if (dbLeaves && dbLeaves.length > 0) {
        dbLeaves.forEach((leave: any) => {
          const isMine = empId ? (leave.employee_id === empId || (user?.id && leave.employee_id === user.id)) : true;
          if (isMine) {
            liveList.push({
              id: leave.id.toString(),
              employeeName: employeeName,
              type: leave.type || 'Annual Leave',
              startDate: leave.start_date || '',
              endDate: leave.end_date || '',
              days: Number(leave.days || 1),
              managerApproval: leave.manager_approval || 'Pending',
              hrApproval: leave.hr_approval || 'Pending',
              notes: leave.notes || ''
            });
          }
        });
      }

      // 2. Auto-sync any previously stuck requests from local storage directly to DB
      const savedLeaves = localStorage.getItem('hr_leave_requests');
      if (savedLeaves && empId) {
        try {
          const localLeaves = JSON.parse(savedLeaves) as LeaveRequest[];
          for (const local of localLeaves) {
            const alreadyInDb = liveList.some(
              l => l.startDate === local.startDate && l.endDate === local.endDate && l.type === local.type
            );
            if (!alreadyInDb && local.startDate && local.endDate) {
              const { data: inserted, error: insErr } = await supabase
                .from('hr_leave_requests')
                .insert([{
                  employee_id: empId,
                  type: local.type || 'Annual Leave',
                  start_date: local.startDate,
                  end_date: local.endDate,
                  days: Number(local.days) || 1,
                  manager_approval: local.managerApproval || 'Pending',
                  hr_approval: local.hrApproval || 'Pending',
                  notes: local.notes || null
                }])
                .select()
                .maybeSingle();

              if (!insErr && inserted) {
                liveList.unshift({
                  id: inserted.id.toString(),
                  employeeName: employeeName,
                  type: inserted.type,
                  startDate: inserted.start_date,
                  endDate: inserted.end_date,
                  days: Number(inserted.days),
                  managerApproval: inserted.manager_approval || 'Pending',
                  hrApproval: inserted.hr_approval || 'Pending',
                  notes: inserted.notes || ''
                });
              }
            }
          }
          // Clean up local storage once migrated to live database
          localStorage.removeItem('hr_leave_requests');
        } catch (syncErr) {
          console.warn('Sync local leaves warning:', syncErr);
        }
      }

      setLeaveRequests(liveList);
    } catch (e) {
      console.error('Error loading leave requests:', e);
    }
  }, [employeeName, user?.id, getEffectiveEmployeeId]);

  // --- Dynamic Employee Profile & Payslip Loader ---
  const loadEmployeeProfileAndPayslips = useCallback(async () => {
    setLoadingPayslips(true);
    try {
      const empId = await getEffectiveEmployeeId();
      let activeName = employeeProfile.name;
      let activeRole = employeeProfile.role;
      let basic = 1400;
      let housing = 300;
      let transport = 150;
      let other = 50;

      // Authoritative profile lookup from hr_employees
      const { data: empData } = await supabase
        .from('hr_employees')
        .select('*')
        .or(`id.eq.${empId},email.ilike.${user?.email || 'marketing@maisarah.net'}`)
        .maybeSingle();

      const resolvedEmpId = empData?.id || empId;

      if (empData) {
        activeName = empData.name || empData.full_name || activeName;
        activeRole = empData.role || empData.designation || empData.department || activeRole;

        // Exact live salary package from hr_employees
        if (empData.basic_salary !== undefined && empData.basic_salary !== null && Number(empData.basic_salary) > 0) {
          basic = Number(empData.basic_salary);
        } else if (empData.salary && Number(empData.salary) > 0) {
          const s = Number(empData.salary);
          basic = Math.round(s * 0.7);
          housing = Math.round(s * 0.18);
          transport = Math.round(s * 0.08);
          other = Math.max(0, s - basic - housing - transport);
        }

        // Live allowances from hr_employees
        if (empData.allowances && typeof empData.allowances === 'object') {
          if (empData.allowances.housing !== undefined) housing = Number(empData.allowances.housing) || 0;
          if (empData.allowances.transport !== undefined) transport = Number(empData.allowances.transport) || 0;
          if (empData.allowances.other !== undefined) other = Number(empData.allowances.other) || 0;
        }

        setEmployeeProfile({
          id: resolvedEmpId,
          name: activeName,
          role: activeRole,
          dept: empData.dept || empData.department || 'Client Success & Coordination',
          email: empData.email || user?.email || 'marketing@maisarah.net',
          basicSalary: basic,
          allowances: { housing, transport, other }
        });
      }

      // Check if hr_payroll_runs has records for this specific employee
      const { data: dbPayroll } = await supabase
        .from('hr_payroll_runs')
        .select('*')
        .eq('employee_id', resolvedEmpId)
        .order('created_at', { ascending: false });

      const totalAllowances = housing + transport + other;
      // Oman PASI social insurance contribution (7% on basic + housing)
      const pasiDeduction = Math.round((basic + housing) * 0.07);
      const gross = basic + totalAllowances;
      const net = gross - pasiDeduction;

      let generatedPayslips: Payslip[] = [];

      if (dbPayroll && dbPayroll.length > 0) {
        generatedPayslips = dbPayroll.map((p, idx) => {
          const pBasic = Number(p.basic_salary) || basic;
          const pHousing = p.housing_allowance !== undefined && p.housing_allowance !== null ? Number(p.housing_allowance) : housing;
          const pTransport = p.transport_allowance !== undefined && p.transport_allowance !== null ? Number(p.transport_allowance) : transport;
          const pOther = p.other_allowance !== undefined && p.other_allowance !== null ? Number(p.other_allowance) : other;
          const pAllowances = pHousing + pTransport + pOther;
          const pDeductions = p.deductions !== undefined && p.deductions !== null ? Number(p.deductions) : Math.round((pBasic + pHousing) * 0.07);
          const pOvertime = Number(p.overtime || 0);
          const pIncentives = Number(p.incentives || 0);
          const pBonuses = Number(p.bonuses || 0);
          const pNet = p.net_salary !== undefined && p.net_salary !== null
            ? Number(p.net_salary)
            : (pBasic + pAllowances + pOvertime + pIncentives + pBonuses - pDeductions);

          const dateStr = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

          return {
            id: p.id ? String(p.id) : `PAY-${(p.month || 'RUN').replace(/\s+/g, '-').toUpperCase()}-${idx + 1}`,
            month: p.month || p.period || 'Current',
            basicSalary: pBasic,
            housingAllowance: pHousing,
            transportAllowance: pTransport,
            otherAllowance: pOther,
            allowances: pAllowances,
            deductions: pDeductions,
            netSalary: pNet,
            status: p.status === 'Paid' ? 'Disbursed' : (p.status || 'Disbursed'),
            disbursedDate: dateStr,
            paymentRef: `WPS-BMAIS-${p.id ? p.id.replace(/[^0-9]/g, '').slice(0, 6) : String(idx + 1000)}`
          };
        });
      }

      // If no DB payroll records yet, generate authoritative live statement from employee database salary
      if (generatedPayslips.length === 0) {
        const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const currentRefDate = new Date().toISOString().split('T')[0];

        generatedPayslips = [
          {
            id: `PAY-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${resolvedEmpId.slice(0, 4).toUpperCase()}`,
            month: currentMonthName,
            basicSalary: basic,
            housingAllowance: housing,
            transportAllowance: transport,
            otherAllowance: other,
            allowances: totalAllowances,
            deductions: pasiDeduction,
            netSalary: net,
            status: 'Disbursed',
            disbursedDate: currentRefDate,
            paymentRef: `WPS-BMAIS-${resolvedEmpId.replace(/[^0-9]/g, '').slice(0, 6) || '202611'}`
          }
        ];
      }

      setPayslips(generatedPayslips);
    } catch (err) {
      console.error('Error loading employee profile and payslips:', err);
    } finally {
      setLoadingPayslips(false);
    }
  }, [employeeProfile.name, employeeProfile.role, getEffectiveEmployeeId, user?.email]);

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

  // --- Real-time Authoritative Attendance Sync from Supabase ---
  const fetchAttendanceLogs = useCallback(async () => {
    try {
      const empId = await getEffectiveEmployeeId();
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const { data: dbLogs, error } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('employee_id', empId)
        .order('work_date', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Error fetching hr_attendance from DB:', error);
      }

      if (dbLogs) {
        const mapped: AttendanceLog[] = dbLogs.map(l => {
          const rawIn = l.check_in ? l.check_in.slice(0, 8) : '--';
          const rawOut = l.check_out ? l.check_out.slice(0, 8) : '--';
          const breakMins = Number(l.break_duration || 0);

          let duration = '--';
          let durationMinutes = 0;

          if (rawIn !== '--' && rawOut !== '--') {
            const [ih, im] = rawIn.split(':').map(Number);
            const [oh, om] = rawOut.split(':').map(Number);
            if (!isNaN(ih) && !isNaN(im) && !isNaN(oh) && !isNaN(om)) {
              durationMinutes = Math.max(0, (oh * 60 + om) - (ih * 60 + im) - breakMins);
              duration = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
            }
          } else if (rawIn !== '--') {
            duration = isAr ? 'قيد العمل' : 'Active';
          }

          return {
            id: String(l.id),
            name: employeeName,
            role: employeeRole,
            date: l.work_date,
            checkIn: rawIn !== '--' ? formatDisplayTime(rawIn.slice(0, 5)) : '--',
            checkOut: rawOut !== '--' ? formatDisplayTime(rawOut.slice(0, 5)) : '--',
            duration,
            durationMinutes,
            breakDuration: breakMins,
            status: (l.status?.toLowerCase() === 'late' ? 'late' : 'present'),
            location: l.location || 'Office HQ'
          };
        });

        setClockLogs(mapped);

        const todayRecord = dbLogs.find(l => l.work_date === todayStr);
        if (todayRecord) {
          const isClocked = !!todayRecord.check_in && !todayRecord.check_out;
          setIsClockedIn(isClocked);
          const mappedToday = mapped.find(m => m.date === todayStr);
          setActiveClockLog(mappedToday || null);
        } else {
          setIsClockedIn(false);
          setActiveClockLog(null);
        }
      }
    } catch (err) {
      console.error('Error in fetchAttendanceLogs:', err);
    }
  }, [employeeName, employeeRole, getEffectiveEmployeeId, isAr]);

  useEffect(() => {
    // 1. Employee Profile & Payslips
    loadEmployeeProfileAndPayslips();

    // 2. Attendance Sync
    fetchAttendanceLogs();

    // 3. Fetch Leaves
    fetchLeaves();

    // 4. Supabase Realtime Subscriptions
    const leavesChannel = supabase
      .channel('employee-leaves-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_leave_requests' },
        () => {
          fetchLeaves();
        }
      )
      .subscribe();

    const attChannel = supabase
      .channel('employee-attendance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_attendance' },
        () => {
          fetchAttendanceLogs();
        }
      )
      .subscribe();

    const payrollChannel = supabase
      .channel('employee-payroll-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_payroll_runs' },
        () => {
          loadEmployeeProfileAndPayslips();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_employees' },
        () => {
          loadEmployeeProfileAndPayslips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leavesChannel);
      supabase.removeChannel(attChannel);
      supabase.removeChannel(payrollChannel);
    };
  }, [fetchAttendanceLogs, fetchLeaves, loadEmployeeProfileAndPayslips]);

  // --- Live Stopwatch Timer for Active Work Shift ---
  useEffect(() => {
    if (!isClockedIn || !activeClockLog?.checkIn || activeClockLog.checkIn === '--') {
      setElapsedSeconds(0);
      return;
    }

    const parts = activeClockLog.checkIn.split(':');
    const startHour = parseInt(parts[0], 10) || 0;
    const startMin = parseInt(parts[1], 10) || 0;
    const startSec = parseInt(parts[2], 10) || 0;

    const startDate = new Date();
    startDate.setHours(startHour, startMin, startSec, 0);

    const updateTimer = () => {
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - startDate.getTime());
      setElapsedSeconds(Math.floor(diffMs / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, activeClockLog]);

  const formatTimerDigits = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- Real-Time Instant Clock In / Clock Out (0ms Optimistic UI + Direct DB) ---
  const handleClockToggle = async () => {
    if (isTogglingClock) return;
    setIsTogglingClock(true);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const shortTime = formatDisplayTime(timeStr.slice(0, 5));
    const empId = await getEffectiveEmployeeId();

    try {
      if (!isClockedIn) {
        // Immediate optimistic UI response (0ms lag, no page reload needed)
        const checkInHour = now.getHours();
        const statusVal = checkInHour >= 9 ? 'Late' : 'Present';
        setIsClockedIn(true);
        setActiveClockLog({
          id: 'temp-' + Date.now(),
          name: employeeName,
          role: employeeRole,
          date: todayStr,
          checkIn: shortTime,
          checkOut: '--',
          duration: isAr ? 'قيد العمل' : 'Active',
          durationMinutes: 0,
          breakDuration: 0,
          status: statusVal.toLowerCase() as any,
          location: 'Office HQ'
        });

        const payload = {
          employee_id: empId,
          work_date: todayStr,
          check_in: timeStr,
          check_out: null,
          status: statusVal,
          break_duration: 0,
          location: 'Office HQ'
        };

        const { error } = await supabase
          .from('hr_attendance')
          .upsert(payload, { onConflict: 'employee_id,work_date' });

        if (error) {
          console.warn('DB upsert error on clock in:', error);
          throw error;
        }

        setClockToast({
          type: 'success',
          message: isAr ? 'تم تسجيل حضورك بنجاح في النظام!' : 'Clocked in successfully! Have a productive shift.'
        });
        setTimeout(() => setClockToast(null), 4000);

        // Silent authoritative sync in background
        await fetchAttendanceLogs();
      } else {
        // Immediate optimistic UI response (0ms lag)
        setIsClockedIn(false);
        setActiveClockLog(prev => prev ? {
          ...prev,
          checkOut: shortTime,
          duration: isAr ? 'مكتمل' : 'Completed'
        } : null);

        // Update database with checkout time
        const { error } = await supabase
          .from('hr_attendance')
          .update({
            check_out: timeStr
          })
          .eq('employee_id', empId)
          .eq('work_date', todayStr);

        if (error) {
          console.warn('DB update error on clock out, attempting upsert fallback:', error);
          await supabase.from('hr_attendance').upsert({
            employee_id: empId,
            work_date: todayStr,
            check_out: timeStr
          }, { onConflict: 'employee_id,work_date' });
        }

        setClockToast({
          type: 'success',
          message: isAr ? 'تم تسجيل انصرافك بنجاح في النظام!' : 'Clocked out successfully! Great work today.'
        });
        setTimeout(() => setClockToast(null), 4000);

        // Silent authoritative sync in background
        await fetchAttendanceLogs();
      }
    } catch (err: any) {
      console.error('Error toggling attendance:', err);
      // Revert in case of failure
      await fetchAttendanceLogs();
      setClockToast({
        type: 'error',
        message: isAr ? 'حدث خطأ أثناء تحديث بيانات الحضور في قاعدة البيانات' : 'Failed to update attendance in database. Please try again.'
      });
      setTimeout(() => setClockToast(null), 4000);
    } finally {
      setIsTogglingClock(false);
    }
  };

  // --- Export Attendance Report to CSV ---
  const handleExportAttendanceCSV = () => {
    const headers = [
      'Date',
      'Employee Name',
      'Role',
      'Check-In Time',
      'Check-Out Time',
      'Hours Worked',
      'Break (Minutes)',
      'Status',
      'Location'
    ];

    const targetLogs = clockLogs.filter(log => {
      if (!log.date) return false;
      if (selectedDay) return log.date === selectedDay;
      if (selectedMonth) return log.date.startsWith(selectedMonth);
      return true;
    });

    const rows = targetLogs.map(l => [
      l.date,
      `"${l.name}"`,
      `"${l.role}"`,
      l.checkIn,
      l.checkOut,
      `"${l.duration || '--'}"`,
      l.breakDuration || 0,
      l.status.toUpperCase(),
      `"${l.location}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Maisarah_Attendance_${employeeName.replace(/\s+/g, '_')}_${selectedDay || selectedMonth || 'Statement'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Actions: Date Calculations & Sync ---
  const handleStartDateChange = (startDate: string) => {
    setLeaveError(null);
    setLeaveForm(prev => {
      let days = prev.days;
      let endDate = prev.endDate;
      if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (e >= s) {
          days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        } else {
          const newEnd = new Date(s.getTime() + (Math.max(1, days) - 1) * (1000 * 60 * 60 * 24));
          endDate = newEnd.toISOString().split('T')[0];
        }
      } else if (startDate && !endDate) {
        const s = new Date(startDate);
        const newEnd = new Date(s.getTime() + (Math.max(1, days) - 1) * (1000 * 60 * 60 * 24));
        endDate = newEnd.toISOString().split('T')[0];
      }
      return { ...prev, startDate, endDate, days };
    });
  };

  const handleEndDateChange = (endDate: string) => {
    setLeaveError(null);
    setLeaveForm(prev => {
      let days = prev.days;
      if (prev.startDate && endDate) {
        const s = new Date(prev.startDate);
        const e = new Date(endDate);
        if (e >= s) {
          days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        } else {
          setLeaveError(isAr ? 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.' : 'End date must be after start date.');
        }
      }
      return { ...prev, endDate, days };
    });
  };

  const handleDaysChange = (daysVal: number) => {
    const days = Math.max(1, daysVal);
    setLeaveError(null);
    setLeaveForm(prev => {
      let endDate = prev.endDate;
      if (prev.startDate) {
        const s = new Date(prev.startDate);
        const newEnd = new Date(s.getTime() + (days - 1) * (1000 * 60 * 60 * 24));
        endDate = newEnd.toISOString().split('T')[0];
      }
      return { ...prev, days, endDate };
    });
  };

  // --- Actions: Leave Request Submission ---
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError(null);
    setLeaveSuccess(null);

    if (!leaveForm.startDate || !leaveForm.endDate) {
      setLeaveError(isAr ? 'يرجى تحديد تاريخ بداية ونهاية الإجازة.' : 'Please select both a Start Date and End Date.');
      return;
    }

    const s = new Date(leaveForm.startDate);
    const eDate = new Date(leaveForm.endDate);
    if (eDate < s) {
      setLeaveError(isAr ? 'تاريخ نهاية الإجازة لا يمكن أن يكون قبل تاريخ البداية.' : 'End date cannot be earlier than start date.');
      return;
    }

    setIsSubmittingLeave(true);

    try {
      const empId = await getEffectiveEmployeeId();
      const calculatedDays = Math.max(1, Math.round((eDate.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const dbPayload = {
        employee_id: empId,
        type: leaveForm.type,
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        days: calculatedDays,
        manager_approval: 'Pending',
        hr_approval: 'Pending',
        notes: leaveForm.notes?.trim() || null
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('hr_leave_requests')
        .insert([dbPayload])
        .select()
        .single();

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      // Broadcast notifications to HOD / Manager and HR in real-time
      try {
        await supabase.from('notifications').insert([
          {
            role: 'manager',
            type: 'leave_request',
            title: isAr ? 'طلب إجازة جديد للاعتماد' : 'New Leave Request for Authorization',
            message: isAr
              ? `قدّم ${employeeName} طلب إجازة (${leaveForm.type} - ${calculatedDays} أيام) من ${leaveForm.startDate} إلى ${leaveForm.endDate}.`
              : `${employeeName} requested ${calculatedDays} days ${leaveForm.type} (${leaveForm.startDate} to ${leaveForm.endDate}). Awaiting HOD authorization.`,
            ref_id: inserted ? inserted.id : undefined,
            ref_table: 'hr_leave_requests'
          },
          {
            role: 'hr',
            type: 'leave_request',
            title: isAr ? 'طلب إجازة جديد للمراجعة' : 'New Leave Request for HR Review',
            message: isAr
              ? `طلب إجازة جديد للموظف ${employeeName} (${calculatedDays} أيام). يرجى مراجعة الرصيد والاعتماد.`
              : `New leave request submitted by ${employeeName} (${calculatedDays} days). Please review leave balance.`,
            ref_id: inserted ? inserted.id : undefined,
            ref_table: 'hr_leave_requests'
          }
        ]);
      } catch (notifErr) {
        console.warn('Notification notice:', notifErr);
      }

      if (inserted) {
        setLeaveRequests(prev => [
          {
            id: inserted.id.toString(),
            employeeName: employeeName,
            type: inserted.type,
            startDate: inserted.start_date,
            endDate: inserted.end_date,
            days: Number(inserted.days),
            managerApproval: inserted.manager_approval || 'Pending',
            hrApproval: inserted.hr_approval || 'Pending',
            notes: inserted.notes || ''
          },
          ...prev.filter(p => p.id !== inserted.id.toString())
        ]);
      }

      // Reset Form
      setLeaveForm({
        type: 'Annual Leave',
        startDate: '',
        endDate: '',
        days: 1,
        notes: ''
      });

      setLeaveSuccess(
        isAr
          ? 'تم إرسال طلب الإجازة بنجاح لرئيس القسم (HOD) وقسم الموارد البشرية (HR)!'
          : '🎉 Leave request submitted successfully to HOD & HR!'
      );
      setTimeout(() => setLeaveSuccess(null), 6000);
    } catch (err: any) {
      console.error('Failed to submit leave to DB:', err);
      setLeaveError(err.message || (isAr ? 'خطأ أثناء إرسال طلب الإجازة' : 'Error submitting leave request'));
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // --- Actions: Download PDF Payslip ---
  const handleDownloadPayslip = (payslip: Payslip) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const brandRed = [161, 18, 18];
    const charcoal = [26, 26, 26];
    const grayText = [110, 110, 110];
    const bgLight = [249, 249, 249];

    // Corporate Top Accent Bar
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(0, 0, 210, 8, 'F');

    // Title / Corporate Brand
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MAISARAH GROUP', 14, 24);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Employee Self Service Payslip | Muscat, Sultanate of Oman', 14, 29);

    // Document Type
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('OFFICIAL PAYSLIP', 135, 24);

    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFontSize(10);
    doc.text(`Period: ${payslip.month}`, 135, 29);

    // Separator Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 34, 196, 34);

    // Employee Details Card
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(14, 38, 182, 34, 'F');
    doc.setDrawColor(235, 235, 235);
    doc.rect(14, 38, 182, 34, 'D');

    doc.setFontSize(9);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Employee Name:', 18, 44);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(employeeName, 52, 44);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Designated Role:', 18, 51);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(employeeRole, 52, 51);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Department:', 18, 58);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(employeeProfile.dept, 52, 58);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Statement ID:', 120, 44);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(payslip.id, 150, 44);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Payment Ref:', 120, 51);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(payslip.paymentRef || 'WPS-DIRECT', 150, 51);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Disbursed Date:', 120, 58);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(payslip.disbursedDate || 'Direct Deposit', 150, 58);

    // Earnings & Deductions Tables
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EARNINGS BREAKDOWN', 14, 82);
    doc.text('DEDUCTIONS', 110, 82);

    doc.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setLineWidth(0.8);
    doc.line(14, 85, 98, 85);
    doc.line(110, 85, 196, 85);

    doc.setFontSize(9);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Basic Salary', 16, 92);
    doc.setFont('Helvetica', 'bold');
    doc.text(`+${payslip.basicSalary.toLocaleString()} OMR`, 72, 92);
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(14, 94, 98, 94);

    doc.setFont('Helvetica', 'normal');
    doc.text('Housing Allowance', 16, 100);
    doc.setFont('Helvetica', 'bold');
    doc.text(`+${payslip.housingAllowance.toLocaleString()} OMR`, 72, 100);
    doc.line(14, 102, 98, 102);

    doc.setFont('Helvetica', 'normal');
    doc.text('Transport Allowance', 16, 108);
    doc.setFont('Helvetica', 'bold');
    doc.text(`+${payslip.transportAllowance.toLocaleString()} OMR`, 72, 108);
    doc.line(14, 110, 98, 110);

    doc.setFont('Helvetica', 'normal');
    doc.text('Other Special Allowances', 16, 116);
    doc.setFont('Helvetica', 'bold');
    doc.text(`+${(payslip.otherAllowance || 0).toLocaleString()} OMR`, 72, 116);
    doc.line(14, 118, 98, 118);

    const grossSalary = payslip.basicSalary + payslip.allowances;
    doc.setFont('Helvetica', 'bold');
    doc.text('Total Gross Earnings', 16, 126);
    doc.text(`+${grossSalary.toLocaleString()} OMR`, 72, 126);

    // Deductions
    doc.setFont('Helvetica', 'normal');
    doc.text('Social Protection / PASI', 112, 92);
    doc.setFont('Helvetica', 'bold');
    doc.text(`-${payslip.deductions.toLocaleString()} OMR`, 170, 92);
    doc.line(110, 94, 196, 94);

    doc.setFont('Helvetica', 'normal');
    doc.text('Tax / Statutory Withholding', 112, 100);
    doc.setFont('Helvetica', 'bold');
    doc.text('0 OMR', 170, 100);
    doc.line(110, 102, 196, 102);

    doc.setFont('Helvetica', 'bold');
    doc.text('Total Deductions', 112, 126);
    doc.text(`-${payslip.deductions.toLocaleString()} OMR`, 170, 126);

    // Net Salary Box
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(14, 138, 182, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NET DISBURSED AMOUNT:', 20, 149);
    doc.setFontSize(15);
    doc.text(`${payslip.netSalary.toLocaleString()} OMR`, 142, 150);

    // Legal / Electronic Transfer Footer
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('This payslip is electronically generated and digitally authenticated by Maisarah Group HR & Finance Dept.', 14, 168);
    doc.text('Bank routing processed via Oman Wages Protection System (WPS) compliant channel.', 14, 173);

    doc.save(`Payslip_${employeeName.replace(/\s+/g, '_')}_${payslip.month.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Real-time Notification Banner for Attendance / Clock Operations */}
      {clockToast && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
            clockToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`p-1.5 rounded-full ${clockToast.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              <CheckCircle2 size={18} />
            </span>
            <p className="text-xs font-bold">{clockToast.message}</p>
          </div>
          <button
            onClick={() => setClockToast(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Welcome & Live Attendance Bar */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Clock className="text-[#A11212]" size={24} />
            {isAr ? 'الخدمة الذاتية للموظفين (ESS)' : 'Employee Self-Service (ESS)'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr
              ? 'إدارة الحضور والانصراف المباشر، ساعات العمل، تقديم الإجازات ومراجعة كشوف الرواتب'
              : 'Directly manage your work attendance, live shift counter, leave applications, and view statements'}
          </p>
        </div>

        {/* Live Attendance Punch Box & Stopwatch */}
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 border border-gray-200/80 p-3.5 rounded-2xl w-full lg:w-auto">
          {isClockedIn ? (
            <div className="flex items-center gap-3.5 pr-2">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    {isAr ? 'قيد العمل الآن' : 'Currently On Duty'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    ({isAr ? 'بدء:' : 'In:'} {activeClockLog?.checkIn})
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono text-xl font-black text-gray-900 tracking-tight">
                    {formatTimerDigits(elapsedSeconds)}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    {elapsedSeconds < 28800
                      ? `${Math.floor((28800 - elapsedSeconds) / 3600)}h ${Math.floor(((28800 - elapsedSeconds) % 3600) / 60)}m ${isAr ? 'متبقي من ٨س' : 'remaining'}`
                      : `+${Math.floor((elapsedSeconds - 28800) / 3600)}h ${Math.floor(((elapsedSeconds - 28800) % 3600) / 60)}m ${isAr ? 'ساعات إضافية' : 'overtime'}`}
                  </span>
                </div>
                {/* Visual Progress Bar to 8 Hours */}
                <div className="w-36 h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((elapsedSeconds / 28800) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="pr-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                {activeClockLog?.checkOut && activeClockLog.checkOut !== '--'
                  ? (isAr ? 'اكتمل دوام اليوم' : 'Shift Completed Today')
                  : (isAr ? 'لم تسجل الحضور بعد' : 'Not Clocked In Today')}
              </p>
              <p className="text-xs font-black text-gray-800 mt-0.5">
                {activeClockLog?.checkOut && activeClockLog.checkOut !== '--'
                  ? `${isAr ? 'ساعات العمل:' : 'Hours Worked:'} ${activeClockLog.duration || '--'} (${activeClockLog.checkIn} - ${activeClockLog.checkOut})`
                  : (isAr ? 'جاهز لبدء الدوام وتسجيل الحضور' : 'Ready to start your work shift')}
              </p>
            </div>
          )}

          <button
            onClick={handleClockToggle}
            disabled={isTogglingClock}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 ${
              isTogglingClock ? 'opacity-70 cursor-not-allowed' : ''
            } ${
              isClockedIn
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            {isTogglingClock ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Clock size={16} />
            )}
            <span>
              {isTogglingClock
                ? (isAr ? 'جاري التحديث...' : 'Updating...')
                : isClockedIn
                ? (isAr ? 'تسجيل انصراف' : 'Clock Out')
                : (isAr ? 'تسجيل حضور' : 'Clock In')}
            </span>
          </button>
        </div>
      </div>

      {/* --- ESS Navigation Tabs --- */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200/80 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('timesheet');
            setSearchParams({ tab: 'timesheet' });
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'timesheet'
              ? 'bg-[#A11212] text-white shadow-md shadow-red-900/20'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Calendar size={15} />
          <span>{isAr ? 'سجل الدوام والتايم شيت (My Timesheet)' : 'My Timesheet & Attendance'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('overview');
            setSearchParams({ tab: 'overview' });
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#A11212] text-white shadow-md shadow-red-900/20'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Clock size={15} />
          <span>{isAr ? 'تقديم الإجازات وحالة الوردية' : 'Leave Requests & Shift Overview'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('payslips');
            setSearchParams({ tab: 'payslips' });
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'payslips'
              ? 'bg-[#A11212] text-white shadow-md shadow-red-900/20'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <FileText size={15} />
          <span>{isAr ? 'كشوف الرواتب' : 'My Payslip Statements'}</span>
        </button>
      </div>

      {/* --- Tab 1: My Timesheet & Attendance (Matching User Model & Image 2) --- */}
      {activeTab === 'timesheet' && (
        <EmployeeTimesheet
          currentEmployeeId={employeeProfile.id}
          currentEmployeeName={employeeProfile.name}
          isAr={isAr}
        />
      )}

      {/* --- Tab 2: Overview & Leave Requests --- */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2: Leave & History */}
          <div className="lg:col-span-2 space-y-6">
          {/* Submit Leave Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="text-[#A11212]" size={18} />
              {isAr ? 'تقديم طلب إجازة جديد' : 'Submit Leave Request'}
            </h3>
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Leave Type</label>
                  <select
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Annual Leave">Annual Leave (30 Days)</option>
                    <option value="Sick Leave">Sick Leave (Medical Certificate Required)</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Paternity Leave">Paternity Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'المدة (بالأيام)' : 'Duration (Days)'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={leaveForm.days}
                    onChange={(e) => handleDaysChange(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'تاريخ البداية *' : 'Start Date *'}</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'تاريخ النهاية *' : 'End Date *'}</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'الملاحظات / المبررات' : 'Notes / Justification'}</label>
                <textarea
                  value={leaveForm.notes}
                  onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                  placeholder={isAr ? 'تفاصيل إضافية حول طلب الإجازة...' : 'Details regarding your request...'}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              {/* Approval Workflow Explanation Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-600">
                <Info size={16} className="text-[#A11212] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">{isAr ? 'آلية اعتماد الإجازات:' : 'Leave Approval Workflow:'}</span>
                  <span className="text-[10px] text-slate-500">
                    {isAr
                      ? '١. اعتماد رئيس القسم (HOD): مراجعة تغطية الأعمال والمهام أثناء غيابك. ٢. اعتماد الموارد البشرية (HR): مراجعة رصيد الإجازات والامتثال لسياسة العمل وقانون العمل العماني.'
                      : '1. HOD Approval: Department head verifies work coverage. 2. HR Approval: HR verifies leave balance and Oman labor law compliance.'}
                  </span>
                </div>
              </div>

              {leaveError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-600" />
                  <span>{leaveError}</span>
                </div>
              )}

              {leaveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                  <span>{leaveSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingLeave}
                className="w-full bg-[#A11212] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#800e0e] shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingLeave ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>{isAr ? 'جاري إرسال الطلب...' : 'Submitting to HOD & HR...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>{isAr ? 'إرسال للاعتماد (رئيس القسم والموارد البشرية)' : 'Send to HOD & HR for Authorization'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Leave History List */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="text-[#A11212]" size={18} />
              {isAr ? 'سجل طلبات الإجازات' : 'My Leave Requests History'}
            </h3>

            <div className="space-y-3">
              {leaveRequests.map((req) => (
                <div key={req.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-150 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <span className="text-[8px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-black uppercase">{req.type}</span>
                    <h4 className="font-black text-xs text-gray-900 mt-1">{req.startDate} to {req.endDate} ({req.days} Days)</h4>
                    {req.notes && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{req.notes}</p>}
                  </div>
                  <div className="flex gap-2 text-[9px] font-black uppercase">
                    <span className={`px-2 py-0.5 rounded border ${req.managerApproval === 'Approved' ? 'bg-green-50 text-green-700 border-green-150' :
                        req.managerApproval === 'Rejected' ? 'bg-red-50 text-red-700 border-red-150' : 'bg-orange-50 text-orange-700 border-orange-150'
                      }`}>
                      HOD: {req.managerApproval}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${req.hrApproval === 'Approved' ? 'bg-green-50 text-green-700 border-green-150' :
                        req.hrApproval === 'Rejected' ? 'bg-red-50 text-red-700 border-red-150' : 'bg-orange-50 text-orange-700 border-orange-150'
                      }`}>
                      HR: {req.hrApproval}
                    </span>
                  </div>
                </div>
              ))}
              {leaveRequests.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center p-4">No leave requests submitted yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Today's Shift & Payslips */}
        <div className="space-y-6">
          {/* Today's Shift Overview */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Clock className="text-[#A11212]" size={18} />
              {isAr ? 'حالة دوام اليوم' : "Today's Work Shift"}
            </h3>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{isAr ? 'الحالة الحالية:' : 'Current Status:'}</span>
                <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  isClockedIn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-200 text-gray-700'
                }`}>
                  {isClockedIn ? (isAr ? 'على رأس العمل' : 'Active On Duty') : (isAr ? 'غير مسجل حضور' : 'Off Duty')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{isAr ? 'وقت تسجيل الحضور:' : 'Check-In Time:'}</span>
                <span className="font-bold text-gray-900">{activeClockLog?.checkIn || '--'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{isAr ? 'وقت تسجيل الانصراف:' : 'Check-Out Time:'}</span>
                <span className="font-bold text-gray-900">{activeClockLog?.checkOut || '--'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{isAr ? 'ساعات العمل اليوم:' : 'Total Worked Today:'}</span>
                <span className="font-mono font-bold text-[#A11212]">
                  {isClockedIn ? formatTimerDigits(elapsedSeconds) : (activeClockLog?.duration || '--')}
                </span>
              </div>
            </div>
          </div>

          {/* Payslip Downloader & Itemized Breakdown */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <FileText className="text-[#A11212]" size={18} />
                {isAr ? 'كشوف الرواتب والتحويلات' : 'My Payslip Statements'}
              </h3>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {payslips.length} {isAr ? 'كشوف' : 'Statements'}
              </span>
            </div>

            {loadingPayslips ? (
              <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-[#A11212]" />
                {isAr ? 'جاري تحميل كشوف الرواتب...' : 'Loading verified payslips...'}
              </div>
            ) : (
              <div className="space-y-3">
                {payslips.map(payslip => (
                  <div
                    key={payslip.id}
                    className="p-3.5 bg-gray-50 hover:bg-gray-100/70 rounded-2xl border border-gray-150 flex justify-between items-center transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs text-gray-900">{payslip.month}</h4>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {payslip.status || 'Disbursed'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 font-bold mt-0.5">
                        <span className="text-[#A11212] font-black">{payslip.netSalary.toLocaleString()} OMR</span> Net
                        <span className="text-gray-400 font-normal ml-2">({payslip.paymentRef || 'WPS Verified'})</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedPayslipModal(payslip)}
                        className="p-2 bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200 rounded-xl transition-all shadow-xs flex items-center gap-1 text-[11px] font-bold"
                        title={isAr ? 'عرض التفاصيل' : 'View Statement Breakdown'}
                      >
                        <Eye size={13} />
                        <span className="hidden sm:inline">{isAr ? 'عرض' : 'View'}</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPayslip(payslip)}
                        className="p-2 bg-white hover:bg-red-50 text-gray-600 hover:text-[#A11212] border border-gray-200 rounded-xl transition-all shadow-xs flex items-center gap-1 text-[11px] font-bold"
                        title={isAr ? 'تحميل PDF' : 'Download PDF Statement'}
                      >
                        <Download size={13} />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
                {payslips.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center p-4">
                    {isAr ? 'لا توجد كشوف رواتب صادرة بعد' : 'No payslip statements issued yet.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
      )}

      {/* --- Tab 3: Payslips Dedicated Tab --- */}
      {activeTab === 'payslips' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-base font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <FileText className="text-[#A11212]" size={20} />
              {isAr ? 'كشوف الرواتب والتحويلات الرسمية' : 'Verified Payslip Statements & Records'}
            </h3>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {payslips.length} {isAr ? 'كشوف صادرة' : 'Statements Issued'}
            </span>
          </div>

          {loadingPayslips ? (
            <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-[#A11212]" />
              {isAr ? 'جاري تحميل كشوف الرواتب...' : 'Loading verified payslips...'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payslips.map(payslip => (
                <div
                  key={payslip.id}
                  className="p-4 bg-gray-50 hover:bg-gray-100/70 rounded-2xl border border-gray-150 flex justify-between items-center transition-all group shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-gray-900">{payslip.month}</h4>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {payslip.status || 'Disbursed'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-bold mt-1">
                      <span className="text-[#A11212] font-black text-sm">{payslip.netSalary.toLocaleString()} OMR</span> Net
                      <span className="text-gray-400 font-normal ml-2">({payslip.paymentRef || 'WPS Verified'})</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPayslipModal(payslip)}
                      className="p-2.5 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
                      title={isAr ? 'عرض التفاصيل' : 'View Statement Breakdown'}
                    >
                      <Eye size={14} />
                      <span>{isAr ? 'عرض' : 'View'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadPayslip(payslip)}
                      className="p-2.5 bg-white hover:bg-red-50 text-gray-700 hover:text-[#A11212] border border-gray-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
                      title={isAr ? 'تحميل PDF' : 'Download PDF Statement'}
                    >
                      <Download size={14} />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))}
              {payslips.length === 0 && (
                <p className="col-span-2 text-xs text-gray-400 italic text-center py-8">
                  {isAr ? 'لا توجد كشوف رواتب صادرة بعد' : 'No payslip statements issued yet.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Payslip Itemized Breakdown Modal --- */}
      {selectedPayslipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-150 relative space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-50 text-[#A11212] border border-red-100">
                  <CreditCard size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900">
                      {isAr ? 'كشف الراتب المفصل' : 'Itemized Payslip Statement'}
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedPayslipModal.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">
                    {selectedPayslipModal.month} • {isAr ? 'مرجع التحويل:' : 'Ref:'} {selectedPayslipModal.paymentRef || 'WPS-DIRECT'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPayslipModal(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Employee Credentials Box */}
            <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{isAr ? 'الموظف' : 'Employee'}</p>
                <p className="font-bold text-gray-900 mt-0.5">{employeeName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{isAr ? 'المسمى الوظيفي' : 'Role'}</p>
                <p className="font-bold text-gray-900 mt-0.5">{employeeRole}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{isAr ? 'القسم' : 'Department'}</p>
                <p className="font-bold text-gray-900 mt-0.5">{employeeProfile.dept}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{isAr ? 'تاريخ الصرف' : 'Disbursed Date'}</p>
                <p className="font-bold text-gray-900 mt-0.5">{selectedPayslipModal.disbursedDate || 'Direct Deposit'}</p>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earnings Column */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 pb-1 border-b border-emerald-100">
                  <TrendingUp size={14} />
                  {isAr ? 'تفاصيل المستحقات (الأرباح)' : 'Earnings Breakdown'}
                </h4>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">{isAr ? 'الراتب الأساسي:' : 'Basic Salary:'}</span>
                  <span className="font-bold text-gray-900">+{selectedPayslipModal.basicSalary.toLocaleString()} OMR</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">{isAr ? 'بدل سكن:' : 'Housing Allowance:'}</span>
                  <span className="font-bold text-gray-900">+{selectedPayslipModal.housingAllowance.toLocaleString()} OMR</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">{isAr ? 'بدل نقل:' : 'Transport Allowance:'}</span>
                  <span className="font-bold text-gray-900">+{selectedPayslipModal.transportAllowance.toLocaleString()} OMR</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">{isAr ? 'بدلات أخرى:' : 'Other Allowances:'}</span>
                  <span className="font-bold text-gray-900">+{(selectedPayslipModal.otherAllowance || 0).toLocaleString()} OMR</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-emerald-200/60 font-black">
                  <span className="text-emerald-900">{isAr ? 'إجمالي الراتب (Gross):' : 'Total Gross Earnings:'}</span>
                  <span className="text-emerald-700">
                    +{(selectedPayslipModal.basicSalary + selectedPayslipModal.allowances).toLocaleString()} OMR
                  </span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="bg-red-50/40 border border-red-100 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5 pb-1 border-b border-red-100">
                  <ShieldCheck size={14} />
                  {isAr ? 'تفاصيل الاستقطاعات' : 'Statutory Deductions'}
                </h4>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">{isAr ? 'التأمينات الاجتماعية (PASI):' : 'Social Insurance (PASI):'}</span>
                  <span className="font-bold text-red-600">-{selectedPayslipModal.deductions.toLocaleString()} OMR</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-medium">{isAr ? 'ضرائب / استقطاعات أخرى:' : 'Withholding Taxes:'}</span>
                  <span className="font-bold text-gray-500">0 OMR</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-7 border-t border-red-200/60 font-black">
                  <span className="text-red-900">{isAr ? 'إجمالي الاستقطاعات:' : 'Total Deductions:'}</span>
                  <span className="text-red-600">-{selectedPayslipModal.deductions.toLocaleString()} OMR</span>
                </div>
              </div>
            </div>

            {/* Net Amount Card */}
            <div className="bg-gradient-to-r from-red-900 to-[#A11212] text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-200">
                  {isAr ? 'صافي الراتب المستحق في الحساب' : 'Net Disbursed Take-Home Pay'}
                </p>
                <p className="text-2xl font-black tracking-tight mt-0.5">
                  {selectedPayslipModal.netSalary.toLocaleString()} <span className="text-sm font-bold text-red-200">OMR</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPayslip(selectedPayslipModal)}
                  className="px-4 py-2.5 bg-white text-[#A11212] hover:bg-gray-100 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all active:scale-95"
                >
                  <Download size={14} />
                  <span>{isAr ? 'تحميل PDF' : 'Download PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
