import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Check, X, FileText, Info, PlusCircle, AlertCircle, Clock, CheckCircle2
} from 'lucide-react';

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
  sickLeaveDetails?: string; // e.g. "Full salary tier"
}

interface LeaveBalance {
  id: string;
  employeeName: string;
  annual: number;
  sick: number;
  maternity: number;
  paternity: number;
  marriageUsed: boolean;
  hajjUsed: boolean;
}

const INITIAL_REQUESTS: LeaveRequest[] = [
  {
    id: 'LR-201',
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Annual Leave',
    startDate: '2026-07-10',
    endDate: '2026-07-15',
    days: 5,
    managerApproval: 'Approved',
    hrApproval: 'Pending',
    notes: 'Family vacation'
  },
  {
    id: 'LR-202',
    employeeName: 'Sara Al-Balushi',
    type: 'Sick Leave',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    days: 4,
    managerApproval: 'Approved',
    hrApproval: 'Pending',
    notes: 'Medical recovery following dental surgery',
    sickLeaveDetails: 'Eligible for 100% Wage (Day 1 to 21 schedule)'
  },
  {
    id: 'LR-203',
    employeeName: 'Mohammed Maamari',
    type: 'Paternity Leave',
    startDate: '2026-07-20',
    endDate: '2026-07-26',
    days: 7,
    managerApproval: 'Pending',
    hrApproval: 'Pending',
    notes: 'Birth of newborn child'
  }
];

const INITIAL_BALANCES: LeaveBalance[] = [
  { id: '1', employeeName: 'Ahmed Al-Kharusi', annual: 24, sick: 15, maternity: 0, paternity: 7, marriageUsed: true, hajjUsed: false },
  { id: '2', employeeName: 'Sara Al-Balushi', annual: 18, sick: 17, maternity: 98, paternity: 0, marriageUsed: false, hajjUsed: false },
  { id: '3', employeeName: 'Mohammed Maamari', annual: 30, sick: 21, maternity: 0, paternity: 7, marriageUsed: false, hajjUsed: false }
];

export default function HRLeave() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>(INITIAL_BALANCES);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // New Request Form State
  const [newReq, setNewReq] = useState({
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    days: 1,
    notes: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('hr_leave_requests');
    if (saved) {
      setRequests(JSON.parse(saved));
    } else {
      localStorage.setItem('hr_leave_requests', JSON.stringify(INITIAL_REQUESTS));
      setRequests(INITIAL_REQUESTS);
    }
  }, []);

  const handleAction = (id: string, action: 'Approve' | 'Reject') => {
    const nextRequests = requests.map(req => {
      if (req.id === id) {
        return {
          ...req,
          hrApproval: action === 'Approve' ? 'Approved' : 'Rejected'
        };
      }
      return req;
    });
    setRequests(nextRequests);
    localStorage.setItem('hr_leave_requests', JSON.stringify(nextRequests));

    // Also deduct balances if approved
    if (action === 'Approve') {
      const approvedReq = requests.find(r => r.id === id);
      if (approvedReq) {
        setBalances(prev => prev.map(b => {
          if (b.employeeName === approvedReq.employeeName) {
            const leaveType = approvedReq.type.toLowerCase();
            if (leaveType.includes('annual')) {
              return { ...b, annual: Math.max(0, b.annual - approvedReq.days) };
            } else if (leaveType.includes('sick')) {
              return { ...b, sick: Math.max(0, b.sick - approvedReq.days) };
            }
          }
          return b;
        }));
      }
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const request: LeaveRequest = {
      id: `LR-${Math.floor(100 + Math.random() * 900)}`,
      employeeName: newReq.employeeName,
      type: newReq.type,
      startDate: newReq.startDate,
      endDate: newReq.endDate,
      days: Number(newReq.days),
      managerApproval: 'Approved', // Auto-approved by HOD if HR inputs directly
      hrApproval: 'Pending',
      notes: newReq.notes
    };
    const nextRequests = [request, ...requests];
    setRequests(nextRequests);
    localStorage.setItem('hr_leave_requests', JSON.stringify(nextRequests));
    setShowApplyModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ── Header Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Calendar className="text-[#A11212]" size={24} />
            {isAr ? 'طلب وإجازة الموظفين' : 'Leave & Holiday Management'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">{isAr ? 'قوانين العمل العمانية المعتمدة' : 'Compliant with Sultanate of Oman Labor Laws'}</p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'تقديم طلب إجازة جديد' : 'Submit Leave Request'}
        </button>
      </div>

      {/* ── Omani Labor Law Quick Reference Info Card ────────────────────── */}
      <div className="bg-[#A11212]/5 border border-[#A11212]/15 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start">
        <Info className="text-[#A11212] flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide mb-1">Omani Labor Law Reference Checklist</h4>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            • <strong>Annual Leave:</strong> 30 calendar days per year. · 
            • <strong>Paternity Leave:</strong> 7 days paid leave. · 
            • <strong>Maternity Leave:</strong> 98 days paid leave. · 
            • <strong>Marriage Leave:</strong> 3 days. · 
            • <strong>Hajj Leave:</strong> 15 days (granted once). · 
            • <strong>Sick Leave Schedule:</strong> 1-21 Days: 100% Pay | 22-35 Days: 75% Pay | 36-70 Days: 50% Pay | 71-182 Days: 25% Pay.
          </p>
        </div>
      </div>

      {/* ── Content Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Pending Approval Requests Inbox */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <Clock size={14} /> Pending HR Approval Inbox
          </h3>
          
          <div className="space-y-4">
            {requests.filter(req => req.managerApproval === 'Approved' && req.hrApproval === 'Pending').map(req => (
              <div key={req.id} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs hover:border-gray-300 transition-all">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h4 className="font-black text-sm text-gray-900">{req.employeeName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{req.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      req.managerApproval === 'Approved' ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-orange-50 text-orange-700'
                    }`}>
                      Manager: {req.managerApproval}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      req.hrApproval === 'Approved' ? 'bg-green-50 text-green-700' :
                      req.hrApproval === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700 border border-orange-150'
                    }`}>
                      HR: {req.hrApproval}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold">Duration</p>
                    <p className="text-xs font-black text-gray-800">{req.startDate} to {req.endDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold">Total Days</p>
                    <p className="text-xs font-black text-gray-800">{req.days} Days</p>
                  </div>
                  {req.notes && (
                    <div className="col-span-2 border-t border-gray-200/50 pt-2">
                      <p className="text-[10px] text-gray-400 font-bold">Reason / Notes</p>
                      <p className="text-xs text-gray-650 font-medium">{req.notes}</p>
                    </div>
                  )}
                </div>

                {req.hrApproval === 'Pending' && (
                  <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 justify-end">
                    <button
                      onClick={() => handleAction(req.id, 'Reject')}
                      className="bg-white border border-gray-200 text-gray-700 hover:text-red-700 hover:border-red-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <X size={14} /> Reject
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'Approve')}
                      className="bg-[#A11212] text-white hover:bg-[#800e0e] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Check size={14} /> Approve & Deduct
                    </button>
                  </div>
                )}
              </div>
            ))}
            {requests.filter(req => req.managerApproval === 'Approved' && req.hrApproval === 'Pending').length === 0 && (
              <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                <p className="font-bold text-sm">No pending leave requests authorized by HOD.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Employee Leave Balances Summary */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
            Employee Leave Balances
          </h3>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
            {balances.map(b => (
              <div key={b.id} className="border-b border-gray-50 last:border-b-0 pb-4 last:pb-0 space-y-2">
                <h4 className="font-black text-xs text-gray-900">{b.employeeName}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <p className="text-[9px] text-gray-400 font-bold">Annual Bal</p>
                    <p className="text-xs font-black text-gray-800">{b.annual} Days</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <p className="text-[9px] text-gray-400 font-bold">Sick Bal</p>
                    <p className="text-xs font-black text-gray-800">{b.sick} Days</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Submit Modal ───────────────────────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleApply} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">New Leave Request</h3>
              <button type="button" onClick={() => setShowApplyModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Employee</label>
                <select
                  value={newReq.employeeName}
                  onChange={(e) => setNewReq({ ...newReq, employeeName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Ahmed Al-Kharusi">Ahmed Al-Kharusi</option>
                  <option value="Sara Al-Balushi">Sara Al-Balushi</option>
                  <option value="Mohammed Maamari">Mohammed Maamari</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Leave Type</label>
                <select
                  value={newReq.type}
                  onChange={(e) => setNewReq({ ...newReq, type: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Annual Leave">Annual Leave (30 Days)</option>
                  <option value="Sick Leave">Sick Leave (Omani 4-Tier Schedule)</option>
                  <option value="Maternity Leave">Maternity Leave (98 Days)</option>
                  <option value="Paternity Leave">Paternity Leave (7 Days)</option>
                  <option value="Marriage Leave">Marriage Leave (3 Days)</option>
                  <option value="Hajj Leave">Hajj Leave (15 Days)</option>
                  <option value="Exam Leave">Exam Leave (15 Days)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newReq.startDate}
                    onChange={(e) => setNewReq({ ...newReq, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={newReq.endDate}
                    onChange={(e) => setNewReq({ ...newReq, endDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Days Duration</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newReq.days}
                  onChange={(e) => setNewReq({ ...newReq, days: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes / Medical Document reference</label>
                <textarea
                  value={newReq.notes}
                  onChange={(e) => setNewReq({ ...newReq, notes: e.target.value })}
                  placeholder="e.g. sick certificate reference, travel destination..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
