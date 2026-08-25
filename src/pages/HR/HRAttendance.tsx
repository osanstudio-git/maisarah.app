import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock, Search, Filter, Download, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, XCircle, AlertTriangle, Coffee, Calendar, ShieldAlert
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
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

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'ATT-101',
    employeeName: 'Ahmed Al-Kharusi',
    role: 'Senior Auditor',
    dept: 'Audit',
    date: '2026-06-30',
    checkIn: '07:55 AM',
    checkOut: '05:02 PM',
    workingHours: '9h 7m',
    status: 'Present',
    breakDuration: 45,
    location: 'Office HQ (Muscat)'
  },
  {
    id: 'ATT-102',
    employeeName: 'Sara Al-Balushi',
    role: 'Tax Consultant',
    dept: 'Tax & VAT',
    date: '2026-06-30',
    checkIn: '08:45 AM',
    checkOut: '05:30 PM',
    workingHours: '8h 45m',
    status: 'Late',
    breakDuration: 75, // Exceeded 60m
    location: 'Remote (Sohar)'
  },
  {
    id: 'ATT-103',
    employeeName: 'Mohammed Maamari',
    role: 'Junior Associate',
    dept: 'Accounting',
    date: '2026-06-30',
    checkIn: '--',
    checkOut: '--',
    workingHours: '0h',
    status: 'Absent',
    breakDuration: 0,
    location: 'N/A'
  },
  {
    id: 'ATT-104',
    employeeName: 'Noor Al-Lawati',
    role: 'VAT Specialist',
    dept: 'Tax & VAT',
    date: '2026-06-30',
    checkIn: '--',
    checkOut: '--',
    workingHours: '0h',
    status: 'On Leave',
    breakDuration: 0,
    location: 'N/A'
  },
  {
    id: 'ATT-105',
    employeeName: 'Bader Al-Raisi',
    role: 'Audit Assistant',
    dept: 'Audit',
    date: '2026-06-30',
    checkIn: '08:02 AM',
    checkOut: '--',
    workingHours: 'Active',
    status: 'Present',
    breakDuration: 30,
    location: 'Office HQ (Muscat)'
  }
];

export default function HRAttendance() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [records, setRecords] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
  const leaveCount = records.filter(r => r.status === 'On Leave').length;
  const lateCount = records.filter(r => r.status === 'Late').length;
  const breakExceededCount = records.filter(r => r.breakDuration > 60).length;

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
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
        <div className="p-5 border-b border-gray-55 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
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
          <button className="bg-gray-900 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center">
            <Download size={14} /> {isAr ? 'تصدير التقرير' : 'Export Logs'}
          </button>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'تسجيل الدخول' : 'Check-In'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'تسجيل الخروج' : 'Check-Out'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'ساعات العمل' : 'Work Hours'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الاستراحة (الأقصى: 60د)' : 'Break (Max: 60m)'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموقع' : 'Location'}</th>
                <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
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
                            <span className="bg-red-50 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <ShieldAlert size={10} /> Limit Exceeded
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
