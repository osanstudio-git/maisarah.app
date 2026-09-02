import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import {
  Clock, Calendar, Download, AlertCircle, CheckCircle2, User, FileText, Send
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface AttendanceLog {
  id: string;
  name: string;
  role: string;
  date: string;
  checkIn: string;
  checkOut: string;
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
  
  const employeeName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Employee';
  const employeeRole = user?.user_metadata?.role === 'manager' ? 'Executive Director' : 'Consultant Staff';

  // --- Attendance States ---
  const [clockLogs, setClockLogs] = useState<AttendanceLog[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeClockLog, setActiveClockLog] = useState<AttendanceLog | null>(null);

  // --- Leave Form States ---
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
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

  // --- Sync / Load Live Leave Requests & Local Storage ---
  const fetchLeaves = useCallback(async () => {
    try {
      const liveList: LeaveRequest[] = [];

      // 1. Fetch from Supabase
      const { data: dbLeaves } = await supabase
        .from('hr_leave_requests')
        .select('*');

      if (dbLeaves && dbLeaves.length > 0) {
        dbLeaves.forEach((leave: any) => {
          const isMine = (leave.employee_name && leave.employee_name.toLowerCase() === employeeName.toLowerCase()) ||
                         (user?.id && leave.employee_id === user.id);
          if (isMine) {
            liveList.push({
              id: leave.id.toString().slice(0, 8),
              employeeName: leave.employee_name || employeeName,
              type: leave.leave_type || 'Annual Leave',
              startDate: leave.start_date || '',
              endDate: leave.end_date || '',
              days: leave.days || 1,
              managerApproval: leave.status === 'approved' ? 'Approved' : leave.status === 'rejected' ? 'Rejected' : 'Pending',
              hrApproval: leave.status === 'approved' ? 'Approved' : leave.status === 'rejected' ? 'Rejected' : 'Pending',
              notes: leave.reason || ''
            });
          }
        });
      }

      // 2. Merge with local storage fallback
      const savedLeaves = localStorage.getItem('hr_leave_requests');
      if (savedLeaves) {
        const localLeaves = JSON.parse(savedLeaves) as LeaveRequest[];
        localLeaves.filter(l => l.employeeName === employeeName).forEach(local => {
          if (!liveList.some(l => l.id === local.id)) {
            liveList.push(local);
          }
        });
      }

      setLeaveRequests(liveList);
    } catch (e) {
      console.error('Error loading leave requests:', e);
    }
  }, [employeeName, user?.id]);

  useEffect(() => {
    // 1. Attendance Sync
    const savedLogs = localStorage.getItem('hr_attendance_logs');
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs) as AttendanceLog[];
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLog = parsedLogs.find(l => l.name === employeeName && l.date === todayStr);
      
      setClockLogs(parsedLogs.filter(l => l.name === employeeName));
      if (todayLog) {
        setActiveClockLog(todayLog);
        setIsClockedIn(todayLog.checkOut === '--');
      }
    }

    // 2. Fetch Leaves
    fetchLeaves();

    // 3. Supabase Realtime Subscription for instant approval reflections
    const channel = supabase
      .channel('employee-leaves-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_leave_requests' },
        () => {
          fetchLeaves();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeName, fetchLeaves]);

  // --- Actions: Clock In / Clock Out ---
  const handleClockToggle = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const allSavedLogs = localStorage.getItem('hr_attendance_logs') 
      ? JSON.parse(localStorage.getItem('hr_attendance_logs')!) as AttendanceLog[]
      : [];

    if (!isClockedIn) {
      // Clock In
      const checkInHour = new Date().getHours();
      const status: 'present' | 'late' = checkInHour >= 9 ? 'late' : 'present'; // Late if checked in after 9 AM

      const newLog: AttendanceLog = {
        id: `ATT-${Date.now().toString().slice(-4)}`,
        name: employeeName,
        role: employeeRole,
        date: todayStr,
        checkIn: timeStr,
        checkOut: '--',
        status,
        location: 'Office HQ'
      };

      const nextLogs = [newLog, ...allSavedLogs];
      localStorage.setItem('hr_attendance_logs', JSON.stringify(nextLogs));
      setClockLogs(nextLogs.filter(l => l.name === employeeName));
      setActiveClockLog(newLog);
      setIsClockedIn(true);
      alert(isAr ? 'تم تسجيل الحضور بنجاح!' : 'Clocked in successfully!');
    } else {
      // Clock Out
      if (activeClockLog) {
        const nextLogs = allSavedLogs.map(log => {
          if (log.id === activeClockLog.id) {
            return { ...log, checkOut: timeStr };
          }
          return log;
        });
        localStorage.setItem('hr_attendance_logs', JSON.stringify(nextLogs));
        setClockLogs(nextLogs.filter(l => l.name === employeeName));
        setIsClockedIn(false);
        setActiveClockLog(null);
        alert(isAr ? 'تم تسجيل الانصراف بنجاح!' : 'Clocked out successfully!');
      }
    }
  };

  // --- Actions: Leave Request Submission ---
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) return;

    const newRequestId = `LR-${Math.floor(100 + Math.random() * 900)}`;

    const newRequest: LeaveRequest = {
      id: newRequestId,
      employeeName: employeeName,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      days: Number(leaveForm.days),
      managerApproval: 'Pending',
      hrApproval: 'Pending',
      notes: leaveForm.notes
    };

    // 1. Write to Supabase if session available
    try {
      if (user?.id) {
        await supabase.from('hr_leave_requests').insert([{
          employee_id: user.id,
          employee_name: employeeName,
          leave_type: leaveForm.type,
          start_date: leaveForm.startDate,
          end_date: leaveForm.endDate,
          days: Number(leaveForm.days),
          reason: leaveForm.notes,
          status: 'pending'
        }]);
      }
    } catch (err) {
      console.error('Failed to submit leave to DB:', err);
    }

    // 2. Save locally as fallback
    const allSavedLeaves = localStorage.getItem('hr_leave_requests')
      ? JSON.parse(localStorage.getItem('hr_leave_requests')!) as LeaveRequest[]
      : [];
    const nextLeaves = [newRequest, ...allSavedLeaves];
    localStorage.setItem('hr_leave_requests', JSON.stringify(nextLeaves));
    setLeaveRequests(prev => [newRequest, ...prev]);
    
    // Reset Form
    setLeaveForm({
      type: 'Annual Leave',
      startDate: '',
      endDate: '',
      days: 1,
      notes: ''
    });
    alert(isAr ? 'تم تقديم طلب الإجازة بنجاح لرئيس القسم!' : 'Leave request successfully submitted to HOD!');
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
      {/* Welcome & Info */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Clock className="text-[#A11212]" size={24} />
            {isAr ? 'الخدمة الذاتية للموظفين (ESS)' : 'Employee Self-Service (ESS)'}
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr 
              ? 'إدارة الحضور والانصراف، تقديم الإجازات ومراجعة كشوف الرواتب' 
              : 'Directly manage your work attendance, leave applications, and view earnings statements'}
          </p>
        </div>

        {/* Live Attendance Punch Button */}
        <button
          onClick={handleClockToggle}
          className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 ${
            isClockedIn 
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' 
              : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
          }`}
        >
          <Clock size={16} />
          <span>{isClockedIn ? (isAr ? 'تسجيل انصراف' : 'Clock Out') : (isAr ? 'تسجيل حضور' : 'Clock In')}</span>
        </button>
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
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={leaveForm.days}
                    onChange={(e) => setLeaveForm({ ...leaveForm, days: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes / Justification</label>
                <textarea
                  value={leaveForm.notes}
                  onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                  placeholder="Details regarding your request..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#800e0e] shadow-sm transition-all"
              >
                Send to HOD for Authorization
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
                    <span className={`px-2 py-0.5 rounded border ${
                      req.managerApproval === 'Approved' ? 'bg-green-50 text-green-700 border-green-150' :
                      req.managerApproval === 'Rejected' ? 'bg-red-50 text-red-700 border-red-150' : 'bg-orange-50 text-orange-700 border-orange-150'
                    }`}>
                      HOD: {req.managerApproval}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${
                      req.hrApproval === 'Approved' ? 'bg-green-50 text-green-700 border-green-150' :
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

        {/* Column 3: Attendance Logs & Payslips */}
        <div className="space-y-6">
          {/* Active Attendance Logs */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Clock className="text-[#A11212]" size={18} />
              {isAr ? 'سجل الحضور اليومي' : 'Recent Clock Logs'}
            </h3>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {clockLogs.map(log => (
                <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-150">
                  <div>
                    <p className="text-gray-900">{log.date}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">In: {log.checkIn} &bull; Out: {log.checkOut}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    log.status === 'present' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
              {clockLogs.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center p-4">No clock-in logs recorded for this month.</p>
              )}
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
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
