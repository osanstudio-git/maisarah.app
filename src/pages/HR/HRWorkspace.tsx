import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import HRDashboard from './HRDashboard';
import HREmployees from './HREmployees';
import HRAttendance from './HRAttendance';
import HRLeave from './HRLeave';
import HRRequests from './HRRequests';
import HRPayroll from './HRPayroll';
import HRPerformance from './HRPerformance';
import HRContracts from './HRContracts';
import HRDocuments from './HRDocuments';
import HRDisciplinary from './HRDisciplinary';
import HRRecruitment from './HRRecruitment';
import HROnboarding from './HROnboarding';
import HRTermination from './HRTermination';
import HRReports from './HRReports';
import HRAIAssistant from './HRAIAssistant';
import {
  Users,
  Clock,
  Calendar,
  FileText,
  MessageSquare,
  Briefcase,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  UploadCloud,
  Send,
  MoreVertical,
  UserPlus,
  Activity
} from 'lucide-react';

type Tab = 'dashboard' | 'attendance' | 'leave' | 'vault' | 'messages' | 'recruitment';

// --- MOCK DATA ---
const MOCK_ATTENDANCE = [
  { id: '1', name: 'Ahmed Al-Kharusi', role: 'Senior Auditor', checkIn: '08:00 AM', checkOut: '--', status: 'present', breakUsed: 45, location: 'Office HQ' },
  { id: '2', name: 'Sara Al-Balushi', role: 'Tax Consultant', checkIn: '08:15 AM', checkOut: '--', status: 'late', breakUsed: 75, location: 'Remote' },
  { id: '3', name: 'Mohammed Maamari', role: 'Junior Assoc.', checkIn: '--', checkOut: '--', status: 'absent', breakUsed: 0, location: '--' },
  { id: '4', name: 'Fatma Al-Harthy', role: 'HR Manager', checkIn: '07:50 AM', checkOut: '--', status: 'present', breakUsed: 30, location: 'Office HQ' },
];

const MOCK_LEAVE_REQUESTS = [
  { id: 'LR-001', name: 'Ahmed Al-Kharusi', type: 'Annual', date: 'Oct 15 - Oct 20', days: 5, balance: 14, status: 'pending' },
  { id: 'LR-002', name: 'Sara Al-Balushi', type: 'Sick', date: 'Oct 02 - Oct 03', days: 2, balance: 8, status: 'pending' }
];

const MOCK_RECRUITMENT = [
  { id: 'C1', name: 'Ali Abdullah', role: 'Senior Auditor', stage: 'shortlisted', score: 85 },
  { id: 'C2', name: 'Muna Said', role: 'Tax Specialist', stage: 'interview', score: 92 },
  { id: 'C3', name: 'Khalid K.', role: 'Accountant', stage: 'offered', score: 88 },
];

const HRWorkspace = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const location = useLocation();

  // Derive active view from the current URL path
  const getActiveView = () => {
    const path = location.pathname;
    if (path.includes('/employees'))   return 'employees';
    if (path.includes('/attendance'))  return 'attendance';
    if (path.includes('/leave'))       return 'leave';
    if (path.includes('/requests'))    return 'requests';
    if (path.includes('/payroll'))     return 'payroll';
    if (path.includes('/performance')) return 'performance';
    if (path.includes('/contracts'))   return 'contracts';
    if (path.includes('/documents'))   return 'documents';
    if (path.includes('/disciplinary'))return 'disciplinary';
    if (path.includes('/recruitment')) return 'recruitment';
    if (path.includes('/onboarding'))  return 'onboarding';
    if (path.includes('/termination')) return 'termination';
    if (path.includes('/reports'))     return 'reports';
    if (path.includes('/ai'))          return 'ai';
    return 'dashboard';
  };
  const activeView = getActiveView();

  const [leaveRequests, setLeaveRequests] = useState(MOCK_LEAVE_REQUESTS);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // --- SUB-COMPONENTS ---

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#A11212] text-white rounded-2xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -end-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2 relative z-10">{isAr ? 'إجمالي الموظفين' : 'Total Employees'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black leading-none">42</p>
            <Users size={24} className="text-white/20" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'الحضور اليوم' : 'Present Today'}</p>
          <div className="flex justify-between items-end">
            <p className="text-4xl font-black text-gray-900 leading-none">38</p>
            <CheckCircle2 size={24} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'طلبات الإجازة النشطة' : 'Active Leave Req'}</p>
          <div className="flex justify-between items-end">
            <p className="text-4xl font-black text-gray-900 leading-none">{leaveRequests.filter(l => l.status === 'pending').length}</p>
            <Calendar size={24} className="text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isAr ? 'الشواغر المفتوحة' : 'Open Vacancies'}</p>
          <div className="flex justify-between items-end">
            <p className="text-4xl font-black text-gray-900 leading-none">3</p>
            <Briefcase size={24} className="text-blue-500" />
          </div>
        </div>
      </div>

      {/* Quick Alerts Panel */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
          <AlertTriangle size={18} /> {isAr ? 'تنبيهات عاجلة' : 'Quick Alerts'}
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-red-100">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
            <div>
              <p className="text-sm font-bold text-gray-900">Sara Al-Balushi <span className="text-gray-400 font-normal">exceeded 1-hour break limit (75 mins).</span></p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-orange-100">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
            <div>
              <p className="text-sm font-bold text-gray-900">Mohammed Maamari <span className="text-gray-400 font-normal">Visa expiring in 14 days (Oct 28).</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
          <Clock size={20} className="text-[#A11212]" />
          {isAr ? 'سجل الحضور وفترات الراحة' : 'Live Attendance & Break Monitor'}
        </h3>
        <div className="relative">
          <Search size={16} className={`absolute ${isAr ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          <input 
            type="text" 
            placeholder={isAr ? 'بحث عن موظف...' : 'Search employee...'} 
            className={`bg-white border border-gray-200 rounded-xl py-2 ${isAr ? 'pe-10 ps-4' : 'ps-10 pe-4'} text-xs font-bold outline-none focus:border-[#A11212] transition-colors`}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-white">
            <tr>
              <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
              <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'تسجيل الدخول' : 'Check-In'}</th>
              <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموقع' : 'Location'}</th>
              <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'فترة الراحة (الحد: 60د)' : 'Break Used (Limit: 60m)'}</th>
              <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MOCK_ATTENDANCE.map(emp => {
              const isOverBreak = emp.breakUsed > 60;
              return (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-sm text-gray-900">{emp.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold">{emp.role}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-sm text-gray-700">{emp.checkIn}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">{emp.location}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${isOverBreak ? 'bg-red-500' : 'bg-[#A11212]'}`} 
                          style={{ width: `${Math.min((emp.breakUsed / 60) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-black ${isOverBreak ? 'text-red-600' : 'text-gray-700'}`}>{emp.breakUsed}m</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      emp.status === 'present' ? 'bg-green-50 text-green-700' :
                      emp.status === 'late' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLeaveManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
          <Calendar size={20} className="text-[#A11212]" />
          {isAr ? 'صندوق طلبات الإجازة' : 'Leave Requests Inbox'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaveRequests.filter(l => l.status === 'pending').map(req => (
            <div key={req.id} className="border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">{req.type} Leave</span>
                <span className="text-[10px] text-gray-400 font-bold">{req.id}</span>
              </div>
              <h4 className="font-black text-gray-900">{req.name}</h4>
              <p className="text-xs text-gray-500 font-bold mt-1">{req.date} ({req.days} Days)</p>
              <button 
                onClick={() => setSelectedLeave(req)}
                className="mt-4 w-full bg-[#A11212] text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#800e0e] transition-colors"
              >
                {isAr ? 'مراجعة الطلب' : 'Review Request'}
              </button>
            </div>
          ))}
          {leaveRequests.filter(l => l.status === 'pending').length === 0 && (
            <div className="col-span-full p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
              <p className="font-bold text-sm">No pending leave requests.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderVault = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex">
      {/* Directory List */}
      <div className="w-1/3 border-e border-gray-100 bg-gray-50/30 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <input 
            type="text" 
            placeholder={isAr ? 'بحث عن موظف...' : 'Search directory...'} 
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-[#A11212]"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {MOCK_ATTENDANCE.map(emp => (
            <div 
              key={emp.id} 
              onClick={() => setSelectedProfile(emp)}
              className={`p-3 rounded-xl cursor-pointer mb-1 transition-colors ${selectedProfile?.id === emp.id ? 'bg-[#A11212]/5 border border-[#A11212]/20' : 'hover:bg-gray-100 border border-transparent'}`}
            >
              <h4 className="font-black text-sm text-gray-900">{emp.name}</h4>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{emp.role}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Document Vault Detail */}
      <div className="flex-1 p-8">
        {!selectedProfile ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <FileText size={48} className="opacity-20 mb-4" />
            <p className="font-bold">{isAr ? 'اختر ملف موظف لعرض المستندات' : 'Select an employee to view documents'}</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
              <div className="w-16 h-16 bg-[#A11212] text-white rounded-2xl flex items-center justify-center text-2xl font-black">
                {selectedProfile.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">{selectedProfile.name}</h2>
                <p className="text-sm font-bold text-gray-500">{selectedProfile.role} &bull; Document Vault</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {['National ID / Iqama', 'Employment Contract', 'Passport Copy'].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-[#A11212]">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-900">{doc}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">Uploaded: Jan 15, 2024 &bull; 2.4 MB</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:text-[#A11212] hover:border-[#A11212] transition-colors">
                      <Download size={16} />
                    </button>
                    <button className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:text-[#A11212] hover:border-[#A11212] transition-colors">
                      <UploadCloud size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessaging = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 h-[600px] flex flex-col items-center justify-center text-center">
      <MessageSquare size={48} className="text-[#A11212] opacity-50 mb-4" />
      <h3 className="text-xl font-black text-gray-900 mb-2">{isAr ? 'نظام المراسلة المزدوج' : 'Dual-Stream Messaging System'}</h3>
      <p className="text-gray-500 max-w-md mx-auto text-sm">
        {isAr 
          ? 'تواصل مباشرة مع الإدارة العليا للإبلاغ عن التحديثات، أو أرسل تعميمات للموظفين.' 
          : 'Securely message Executive Management, or broadcast company-wide HR memos.'}
      </p>
      <div className="flex gap-4 mt-8 w-full max-w-md">
        <button className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800">
          Message Managers
        </button>
        <button className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#800e0e]">
          Broadcast to Staff
        </button>
      </div>
    </div>
  );

  const renderRecruitment = () => (
    <div className="space-y-6 overflow-x-auto pb-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
          <UserPlus size={20} className="text-[#A11212]" />
          {isAr ? 'لوحة التوظيف المشتركة' : 'Collaborative Recruitment Board'}
        </h3>
        <button className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800">
          + New Posting
        </button>
      </div>
      
      {/* Kanban Board Layout */}
      <div className="flex gap-4 min-w-max">
        {['CV Received', 'Shortlisted', 'Interview Scheduled', 'Interview Done', 'Offered'].map(stage => {
          const stageCandidates = MOCK_RECRUITMENT.filter(c => c.stage === stage.toLowerCase().replace(' ', '_'));
          return (
            <div key={stage} className="w-80 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col h-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-xs uppercase tracking-widest text-gray-500">{stage}</h4>
                <span className="bg-white text-gray-400 text-[10px] font-black px-2 py-0.5 rounded shadow-sm border border-gray-100">
                  {stageCandidates.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pe-1">
                {stageCandidates.map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:border-[#A11212] transition-colors">
                    <p className="font-black text-sm text-gray-900">{c.name}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{c.role}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-[#A11212]">Score: {c.score}</span>
                      <button className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded font-bold hover:bg-gray-100">View CV</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ComingSoon = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-dashed border-gray-200 text-center p-12">
      <div className="w-20 h-20 bg-[#A11212]/5 rounded-2xl flex items-center justify-center mb-4">
        <Briefcase size={32} className="text-[#A11212]/30" />
      </div>
      <h2 className="text-xl font-black text-gray-700 mb-2">{title}</h2>
      <p className="text-sm text-gray-400 font-medium">This module is being built — coming soon!</p>
      <span className="mt-4 bg-[#A11212]/5 text-[#A11212] text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">In Progress</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Content Container (driven by sidebar/URL) ───────────────── */}
      <div className="animate-in fade-in duration-300">
        {activeView === 'dashboard'    && <HRDashboard />}
        {activeView === 'employees'    && <HREmployees />}
        {activeView === 'attendance'   && <HRAttendance />}
        {activeView === 'leave'        && <HRLeave />}
        {activeView === 'requests'     && <HRRequests />}
        {activeView === 'payroll'      && <HRPayroll />}
        {activeView === 'performance'  && <HRPerformance />}
        {activeView === 'contracts'    && <HRContracts />}
        {activeView === 'documents'    && <HRDocuments />}
        {activeView === 'disciplinary' && <HRDisciplinary />}
        {activeView === 'recruitment'  && <HRRecruitment />}
        {activeView === 'onboarding'   && <HROnboarding />}
        {activeView === 'termination'  && <HRTermination />}
        {activeView === 'reports'      && <HRReports />}
        {activeView === 'ai'           && <HRAIAssistant />}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900">{isAr ? 'اعتماد طلب الإجازة' : 'Process Leave Request'}</h3>
              <button onClick={() => setSelectedLeave(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><XCircle size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'رصيد الموظف' : 'Live Balance'}</p>
                  <p className="text-2xl font-black text-gray-900">{selectedLeave.balance} <span className="text-sm font-bold text-gray-500">Days</span></p>
                </div>
                <div className="text-end">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'الأيام المطلوبة' : 'Requested'}</p>
                  <p className="text-2xl font-black text-[#A11212]">{selectedLeave.days} <span className="text-sm font-bold text-[#A11212]/60">Days</span></p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">{isAr ? 'نوع الإجازة' : 'Leave Type'}</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] outline-none">
                  <option value="annual">Annual / Yearly Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => {
                    setLeaveRequests(prev => prev.filter(r => r.id !== selectedLeave.id));
                    setSelectedLeave(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200"
                >
                  {isAr ? 'رفض' : 'Deny'}
                </button>
                <button 
                  onClick={() => {
                    setLeaveRequests(prev => prev.filter(r => r.id !== selectedLeave.id));
                    setSelectedLeave(null);
                  }}
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#800e0e]"
                >
                  {isAr ? 'اعتماد' : 'Approve & Deduct'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HRWorkspace;
