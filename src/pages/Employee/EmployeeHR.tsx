import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import {
  Clock, Calendar, Download, AlertCircle, CheckCircle2, User, FileText, Send, Loader2, Info,
  Timer, TrendingUp, Check, RotateCcw, Filter, Coffee
} from 'lucide-react';
import { jsPDF } from 'jspdf';

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
  netSalary: number;
  allowances: number;
  deductions: number;
}

export default function EmployeeHR() {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user } = useAuth();

  const employeeName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Afrah Khan';
  const employeeRole = user?.user_metadata?.role === 'manager' ? 'Executive Director' : 'Consultant Staff';

  // --- Attendance States ---
  const [clockLogs, setClockLogs] = useState<AttendanceLog[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeClockLog, setActiveClockLog] = useState<AttendanceLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // e.g. "2026-11"
  const [selectedDay, setSelectedDay] = useState<string>(''); // specific date filter e.g. "2026-11-03"

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

  // --- Payslips ---
  const MOCK_PAYSLIPS: Payslip[] = [
    { id: 'PAY-801', month: 'June 2026', basicSalary: 1500, allowances: 450, deductions: 50, netSalary: 1900 },
    { id: 'PAY-802', month: 'May 2026', basicSalary: 1500, allowances: 450, deductions: 50, netSalary: 1900 },
    { id: 'PAY-803', month: 'April 2026', basicSalary: 1500, allowances: 400, deductions: 50, netSalary: 1850 }
  ];

  // --- Resolve Authoritative Employee UUID ---
  const getEffectiveEmployeeId = useCallback(async (): Promise<string> => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (user?.id && uuidRegex.test(user.id)) {
      return user.id;
    }
    if (user?.email) {
      const { data: byEmail } = await supabase.from('hr_employees').select('id').eq('email', user.email).maybeSingle();
      if (byEmail?.id) return byEmail.id;
    }
    if (employeeName) {
      const { data: byName } = await supabase.from('hr_employees').select('id').ilike('full_name', `%${employeeName}%`).maybeSingle();
      if (byName?.id) return byName.id;
    }
    return 'e8fbb851-713d-473a-83f3-dd1da4aa81b4'; // Afrah Khan UUID in hr_employees
  }, [user?.id, user?.email, employeeName]);

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

  // --- Attendance Sync from Supabase ---
  const fetchAttendanceLogs = useCallback(async () => {
    try {
      const empId = await getEffectiveEmployeeId();
      const todayStr = new Date().toISOString().split('T')[0];

      const { data: dbLogs, error } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('employee_id', empId)
        .order('work_date', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Error fetching hr_attendance from DB, using fallback:', error);
      }

      if (dbLogs && dbLogs.length > 0) {
        const mapped: AttendanceLog[] = dbLogs.map(l => {
          const checkIn = l.check_in ? l.check_in.slice(0, 8) : '--';
          const checkOut = l.check_out ? l.check_out.slice(0, 8) : '--';
          const breakMins = Number(l.break_duration || 0);

          let duration = '--';
          let durationMinutes = 0;

          if (checkIn !== '--' && checkOut !== '--') {
            const [ih, im] = checkIn.split(':').map(Number);
            const [oh, om] = checkOut.split(':').map(Number);
            if (!isNaN(ih) && !isNaN(im) && !isNaN(oh) && !isNaN(om)) {
              durationMinutes = Math.max(0, (oh * 60 + om) - (ih * 60 + im) - breakMins);
              duration = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
            }
          } else if (checkIn !== '--') {
            duration = isAr ? 'قيد العمل' : 'Active';
          }

          return {
            id: String(l.id),
            name: employeeName,
            role: employeeRole,
            date: l.work_date,
            checkIn: checkIn !== '--' ? checkIn.slice(0, 5) : '--',
            checkOut: checkOut !== '--' ? checkOut.slice(0, 5) : '--',
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
      } else {
        // Fallback to localStorage
        const savedLogs = localStorage.getItem('hr_attendance_logs');
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs) as AttendanceLog[];
          const todayLog = parsedLogs.find(l => l.name === employeeName && l.date === todayStr);
          setClockLogs(parsedLogs.filter(l => l.name === employeeName));
          if (todayLog) {
            setActiveClockLog(todayLog);
            setIsClockedIn(todayLog.checkOut === '--');
          }
        }
      }
    } catch (err) {
      console.error('Error in fetchAttendanceLogs:', err);
    }
  }, [employeeName, employeeRole, getEffectiveEmployeeId, isAr]);

  useEffect(() => {
    // 1. Attendance Sync
    fetchAttendanceLogs();

    // 2. Fetch Leaves
    fetchLeaves();

    // 3. Supabase Realtime Subscriptions
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

    return () => {
      supabase.removeChannel(leavesChannel);
      supabase.removeChannel(attChannel);
    };
  }, [fetchAttendanceLogs, fetchLeaves]);

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

  // --- Actions: Clock In / Clock Out ---
  const handleClockToggle = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const empId = await getEffectiveEmployeeId();

    try {
      if (!isClockedIn) {
        // Clock In
        const checkInHour = now.getHours();
        const statusVal = checkInHour >= 9 ? 'Late' : 'Present';

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
          console.warn('DB upsert error, saving locally fallback:', error);
        }

        setIsClockedIn(true);
        await fetchAttendanceLogs();
        alert(isAr ? 'تم تسجيل حضورك اليوم بنجاح في النظام!' : 'Clocked in successfully to attendance system!');
      } else {
        // Clock Out
        const payload = {
          employee_id: empId,
          work_date: todayStr,
          check_out: timeStr,
        };

        const { error } = await supabase
          .from('hr_attendance')
          .upsert(payload, { onConflict: 'employee_id,work_date' });

        if (error) {
          console.warn('DB upsert error on clock out:', error);
        }

        setIsClockedIn(false);
        setActiveClockLog(null);
        await fetchAttendanceLogs();
        alert(isAr ? 'تم تسجيل انصرافك بنجاح في النظام!' : 'Clocked out successfully to attendance system!');
      }
    } catch (err: any) {
      console.error('Error toggling attendance:', err);
      alert(isAr ? 'حدث خطأ أثناء تسجيل الحضور/الانصراف' : 'Error updating attendance log');
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
    doc.text('Employee Self Service Payslip | Muscat, Oman', 14, 29);

    // Document Type
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ELECTRONIC PAYSLIP', 140, 24);

    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFontSize(10);
    doc.text(`Month: ${payslip.month}`, 140, 29);

    // Separator Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 34, 196, 34);

    // Employee Details Card
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.rect(14, 38, 182, 30, 'F');
    doc.setDrawColor(235, 235, 235);
    doc.rect(14, 38, 182, 30, 'D');

    doc.setFontSize(9);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Employee Name:', 18, 44);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(employeeName, 48, 44);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Designated Role:', 18, 51);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(employeeRole, 48, 51);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Statement ID:', 120, 44);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text(payslip.id, 148, 44);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Currency:', 120, 51);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text('OMR', 148, 51);

    // Earnings & Deductions Tables
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EARNINGS', 14, 78);
    doc.text('DEDUCTIONS', 110, 78);

    doc.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setLineWidth(0.8);
    doc.line(14, 81, 98, 81);
    doc.line(110, 81, 196, 81);

    doc.setFontSize(9);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Basic Salary', 16, 88);
    doc.setFont('Helvetica', 'bold');
    doc.text(`+${payslip.basicSalary.toLocaleString()} OMR`, 72, 88);
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(14, 90, 98, 90);

    doc.setFont('Helvetica', 'normal');
    doc.text('Allowances (Housing & Transport)', 16, 96);
    doc.setFont('Helvetica', 'bold');
    doc.text(`+${payslip.allowances.toLocaleString()} OMR`, 72, 96);
    doc.line(14, 98, 98, 98);

    // Deductions
    doc.setFont('Helvetica', 'normal');
    doc.text('Social Security (PASI)', 112, 88);
    doc.setFont('Helvetica', 'bold');
    doc.text(`-${payslip.deductions.toLocaleString()} OMR`, 170, 88);
    doc.line(110, 90, 196, 90);

    // Net Salary Box
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(14, 115, 182, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NET DISBURSED AMOUNT:', 20, 125);
    doc.setFontSize(14);
    doc.text(`${payslip.netSalary.toLocaleString()} OMR`, 145, 125);

    doc.save(`Payslip_${employeeName.replace(/\s+/g, '_')}_${payslip.month.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
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
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 ${
              isClockedIn
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            <Clock size={16} />
            <span>{isClockedIn ? (isAr ? 'تسجيل انصراف' : 'Clock Out') : (isAr ? 'تسجيل حضور' : 'Clock In')}</span>
          </button>
        </div>
      </div>

      {/* Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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

          {/* Payslip Downloader */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <FileText className="text-[#A11212]" size={18} />
              {isAr ? 'كشوف الرواتب والتحويلات' : 'My Payslip Statements'}
            </h3>

            <div className="space-y-3">
              {MOCK_PAYSLIPS.map(payslip => (
                <div key={payslip.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-150 flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-xs text-gray-900">{payslip.month}</h4>
                    <p className="text-[10px] text-gray-500 font-bold mt-0.5">{payslip.netSalary.toLocaleString()} OMR Net</p>
                  </div>
                  <button
                    onClick={() => handleDownloadPayslip(payslip)}
                    className="p-2.5 bg-white hover:bg-gray-100 text-gray-700 hover:text-[#A11212] border border-gray-200 rounded-xl transition-all shadow-xs"
                    title={isAr ? 'تحميل كشف الراتب' : 'Download Payslip'}
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* --- Full Detailed Attendance & Shift Timesheet (Day-wise & Month-wise) --- */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
        {/* Controls & Export Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Timer className="text-[#A11212]" size={20} />
              {isAr ? 'سجل الحضور والدوام المفصل (يومي وشهري)' : 'Detailed Attendance & Shift Timesheet'}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {isAr
                ? 'استعراض سجلات الحضور، الانصراف، الساعات المنجزة مع إمكانية التصدير والتحميل'
                : 'Review check-in/out logs, total hours worked, shift status, and download statements'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <Calendar size={14} className="text-gray-400" />
              <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">{isAr ? 'الشهر:' : 'Month:'}</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedDay('');
                }}
                className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
              />
            </div>

            {/* Day Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <Filter size={14} className="text-gray-400" />
              <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">{isAr ? 'اليوم:' : 'Day:'}</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
              />
            </div>

            {selectedDay && (
              <button
                onClick={() => setSelectedDay('')}
                className="text-[10px] font-bold text-gray-500 hover:text-[#A11212] underline"
              >
                {isAr ? 'إلغاء فلتر اليوم' : 'Clear Day'}
              </button>
            )}

            {/* Export CSV Button */}
            <button
              onClick={handleExportAttendanceCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Download size={14} />
              <span>{isAr ? 'تحميل التقرير (CSV)' : 'Download Report (CSV)'}</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metrics Cards for Period */}
        {(() => {
          const filtered = clockLogs.filter(log => {
            if (!log.date) return false;
            if (selectedDay) return log.date === selectedDay;
            if (selectedMonth) return log.date.startsWith(selectedMonth);
            return true;
          });
          const totalDays = filtered.filter(l => l.checkIn !== '--').length;
          const totalMins = filtered.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
          const totalHours = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
          const avgMins = totalDays > 0 ? Math.round(totalMins / totalDays) : 0;
          const avgHours = `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`;
          const late = filtered.filter(l => l.status === 'late').length;

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'أيام العمل المسجلة' : 'Days Worked'}</p>
                <h4 className="text-xl font-black text-gray-900 mt-1">{totalDays} {isAr ? 'يوم' : 'Days'}</h4>
              </div>
              <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'إجمالي الساعات المنجزة' : 'Total Hours Logged'}</p>
                <h4 className="text-xl font-black text-[#A11212] mt-1">{totalHours}</h4>
              </div>
              <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'المعدل اليومي' : 'Daily Average'}</p>
                <h4 className="text-xl font-black text-gray-900 mt-1">{avgHours} / {isAr ? 'يوم' : 'day'}</h4>
              </div>
              <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'مرات التأخير' : 'Late Check-ins'}</p>
                <h4 className={`text-xl font-black mt-1 ${late > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {late} {isAr ? 'يوم' : 'Days'}
                </h4>
              </div>
            </div>
          );
        })()}

        {/* Detailed Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-150 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <th className="py-3 px-4">{isAr ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 px-4">{isAr ? 'وقت الحضور' : 'Check-In'}</th>
                <th className="py-3 px-4">{isAr ? 'وقت الانصراف' : 'Check-Out'}</th>
                <th className="py-3 px-4">{isAr ? 'ساعات العمل' : 'Hours Worked'}</th>
                <th className="py-3 px-4">{isAr ? 'الاستراحة' : 'Break'}</th>
                <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4">{isAr ? 'الموقع' : 'Location'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const filtered = clockLogs.filter(log => {
                  if (!log.date) return false;
                  if (selectedDay) return log.date === selectedDay;
                  if (selectedMonth) return log.date.startsWith(selectedMonth);
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                        {isAr ? 'لا توجد سجلات دوام في الفترة المحددة' : 'No attendance logs recorded for this selected period.'}
                      </td>
                    </tr>
                  );
                }

                return filtered.map((log) => {
                  const isCurrentActive = isClockedIn && log.date === new Date().toISOString().split('T')[0];

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{log.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700">{log.checkIn}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700">
                        {isCurrentActive ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {isAr ? 'مستمر الآن' : 'In Progress'}
                          </span>
                        ) : log.checkOut}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {isCurrentActive ? (
                          <span className="text-[#A11212]">{formatTimerDigits(elapsedSeconds)}</span>
                        ) : (
                          log.duration || '--'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{log.breakDuration || 0} min</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          log.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{log.location}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
