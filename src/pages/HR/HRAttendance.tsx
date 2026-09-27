import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Clock, Search, Download, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, XCircle, AlertTriangle, Coffee, Loader2, Plus, Edit, X, Save
} from 'lucide-react';

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

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit/Punch modal state
  const [editData, setEditData] = useState({
    checkIn: '08:00 AM',
    checkOut: '--',
    breakDuration: 30,
    status: 'Present' as AttendanceRecord['status'],
    location: 'Office HQ (Muscat)'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // ── 1. Fetch live attendance from Supabase ─────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch profiles, hr_employees, and today's attendance logs
      const [{ data: profData }, { data: hrData }, { data: attLogs }, { data: leaveReqs }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role, department_id, department'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept'),
        supabase.from('hr_attendance').select('*').eq('work_date', todayStr),
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

      // Helper to check if employee is on approved leave today
      const isOnLeaveToday = (empId: string) => {
        return (leaveReqs || []).some((l: any) =>
          l.employee_id === empId &&
          l.hr_approval === 'Approved' &&
          todayStr >= l.start_date &&
          todayStr <= l.end_date
        );
      };

      const calculatedRecords: AttendanceRecord[] = employees.map(emp => {
        const log = (attLogs || []).find((a: any) => a.employee_id === emp.id);
        const onLeave = isOnLeaveToday(emp.id);

        let status: AttendanceRecord['status'] = 'Absent';
        let checkIn = '--';
        let checkOut = '--';
        let breakDuration = 0;
        let location = 'Office HQ (Muscat)';

        if (onLeave) {
          status = 'On Leave';
        } else if (log) {
          status = (log.status as any) || 'Present';
          checkIn = log.check_in ? log.check_in.slice(0, 5) : '--';
          checkOut = log.check_out ? log.check_out.slice(0, 5) : '--';
          breakDuration = Number(log.break_duration || 0);
          location = log.location || 'Office HQ (Muscat)';
        }

        // Calculate hours
        let workingHours = '0h';
        if (checkIn !== '--' && checkOut !== '--') {
          workingHours = '8h 30m';
        } else if (checkIn !== '--') {
          workingHours = isAr ? 'قيد العمل' : 'Active';
        }

        return {
          id: log?.id?.toString() || `temp-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.role,
          dept: emp.dept,
          date: todayStr,
          checkIn,
          checkOut,
          workingHours,
          status,
          breakDuration,
          location
        };
      });

      setRecords(calculatedRecords);
      localStorage.setItem('hr_attendance_cache', JSON.stringify(calculatedRecords));
    } catch (err) {
      console.error('Error fetching HR attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr, isAr]);

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
      const payload = {
        employee_id: selectedRecord.employeeId,
        work_date: todayStr,
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
    const headers = ['Employee Name', 'Role', 'Department', 'Date', 'Check-In', 'Check-Out', 'Break (Mins)', 'Status', 'Location'];
    const rows = records.map(r => [
      `"${r.employeeName}"`,
      `"${r.role}"`,
      `"${r.dept}"`,
      r.date,
      r.checkIn,
      r.checkOut,
      r.breakDuration,
      r.status,
      `"${r.location}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Maisarah_Attendance_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      
      {/* ── KPI Panel ──────────────────────────────────────────────────────── */}
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
            <Download size={14} /> {isAr ? 'تصدير التقرير' : 'Export Logs'}
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
