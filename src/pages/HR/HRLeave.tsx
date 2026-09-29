import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Calendar, Check, X, FileText, Info, PlusCircle, AlertCircle, Clock, CheckCircle2, Loader2, User
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  dept: string;
}

interface LeaveRequest {
  id: string | number;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  managerApproval: 'Pending' | 'Approved' | 'Rejected';
  hrApproval: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  sickLeaveDetails?: string;
  createdAt?: string;
}

interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  annual: number;
  sick: number;
  maternity: number;
  paternity: number;
  marriageUsed: boolean;
  hajjUsed: boolean;
}

export default function HRLeave() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // New Request Form State
  const [newReq, setNewReq] = useState({
    employeeId: '',
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    days: 1,
    notes: ''
  });

  // ── 1. Fetch Employees, Balances & Leave Requests ─────────────────────────
  const fetchAllLeaveData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch Profiles and HR Employees
      const [{ data: profData }, { data: hrData }, { data: leaveReqData }, { data: leaveBalData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept'),
        supabase.from('hr_leave_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('hr_leave_balances').select('*')
      ]);

      // Build unified employee map
      const empMap = new Map<string, EmployeeProfile>();
      (profData || []).filter(p => p.role !== 'client').forEach(p => {
        empMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Employee',
          email: p.email || '',
          role: p.role || 'Staff',
          dept: p.department_id || p.department || 'General'
        });
      });

      (hrData || []).forEach(h => {
        if (!empMap.has(h.id)) {
          empMap.set(h.id, {
            id: h.id,
            name: h.full_name || h.email?.split('@')[0] || 'Employee',
            email: h.email || '',
            role: h.role || 'Staff',
            dept: h.dept || 'General'
          });
        }
      });

      const empList = Array.from(empMap.values());
      setEmployees(empList);

      if (empList.length > 0 && !newReq.employeeId) {
        setNewReq(prev => ({ ...prev, employeeId: empList[0].id }));
      }

      // Map leave requests
      const parsedRequests: LeaveRequest[] = (leaveReqData || []).map((req: any) => {
        const emp = empMap.get(req.employee_id);
        return {
          id: req.id,
          employeeId: req.employee_id,
          employeeName: emp ? emp.name : 'Staff Member',
          type: req.type || 'Annual Leave',
          startDate: req.start_date || '',
          endDate: req.end_date || '',
          days: Number(req.days || 1),
          managerApproval: (req.manager_approval as any) || 'Approved',
          hrApproval: (req.hr_approval as any) || 'Pending',
          notes: req.notes || '',
          sickLeaveDetails: req.sick_leave_details || '',
          createdAt: req.created_at
        };
      });

      setRequests(parsedRequests);
      localStorage.setItem('hr_leave_requests', JSON.stringify(parsedRequests));

      // Map leave balances
      const parsedBalances: LeaveBalance[] = empList.map(emp => {
        const dbBal = (leaveBalData || []).find((b: any) => b.employee_id === emp.id);
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          annual: dbBal ? Number(dbBal.annual ?? 30) : 30,
          sick: dbBal ? Number(dbBal.sick ?? 15) : 15,
          maternity: dbBal ? Number(dbBal.maternity ?? 98) : 98,
          paternity: dbBal ? Number(dbBal.paternity ?? 7) : 7,
          marriageUsed: dbBal ? Boolean(dbBal.marriage_used) : false,
          hajjUsed: dbBal ? Boolean(dbBal.hajj_used) : false
        };
      });

      setBalances(parsedBalances);
    } catch (e) {
      console.error('Error fetching HR leave data:', e);
    } finally {
      setLoading(false);
    }
  }, [newReq.employeeId]);

  useEffect(() => {
    fetchAllLeaveData();

    // ── Supabase Realtime Subscriptions ─────────────────────────────────────
    const channel = supabase
      .channel('hr_leave_live_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_leave_requests' },
        () => {
          fetchAllLeaveData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_leave_balances' },
        () => {
          fetchAllLeaveData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchAllLeaveData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllLeaveData]);

  // ── 2. Handle Approve / Reject ───────────────────────────────────────────
  const handleAction = async (requestId: string | number, action: 'Approve' | 'Reject') => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return;

    const newHrStatus = action === 'Approve' ? 'Approved' : 'Rejected';

    // Optimistic UI update
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, hrApproval: newHrStatus } : r));

    try {
      // 1. Update hr_leave_requests in Supabase
      const { error: reqErr } = await supabase
        .from('hr_leave_requests')
        .update({
          hr_approval: newHrStatus,
          manager_approval: 'Approved' // Ensure both are aligned if HR approves directly
        })
        .eq('id', requestId);

      if (reqErr) throw reqErr;

      // 2. If Approved, deduct corresponding balance in DB
      if (action === 'Approve' && targetReq.employeeId) {
        const leaveType = (targetReq.type || '').toLowerCase();
        const currentBal = balances.find(b => b.employeeId === targetReq.employeeId);
        const daysToDeduct = Number(targetReq.days || 1);

        if (currentBal) {
          let updatedAnnual = currentBal.annual;
          let updatedSick = currentBal.sick;

          if (leaveType.includes('annual')) {
            updatedAnnual = Math.max(0, currentBal.annual - daysToDeduct);
          } else if (leaveType.includes('sick')) {
            updatedSick = Math.max(0, currentBal.sick - daysToDeduct);
          }

          // Upsert to hr_leave_balances in Supabase
          const { error: balErr } = await supabase
            .from('hr_leave_balances')
            .upsert({
              employee_id: targetReq.employeeId,
              annual: updatedAnnual,
              sick: updatedSick,
              maternity: currentBal.maternity,
              paternity: currentBal.paternity
            }, { onConflict: 'employee_id' });

          if (balErr) {
            console.warn('Notice updating leave balance in DB:', balErr);
          } else {
            setBalances(prev => prev.map(b => b.employeeId === targetReq.employeeId ? {
              ...b,
              annual: updatedAnnual,
              sick: updatedSick
            } : b));
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync leave decision to Supabase DB:', err);
      fetchAllLeaveData();
    }
  };

  // ── 3. Handle Submit New Leave Request ────────────────────────────────────
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.employeeId || !newReq.startDate || !newReq.endDate) return;

    setSubmitting(true);
    try {
      const selectedEmp = employees.find(e => e.id === newReq.employeeId);

      const dbPayload = {
        employee_id: newReq.employeeId,
        type: newReq.type,
        start_date: newReq.startDate,
        end_date: newReq.endDate,
        days: Number(newReq.days),
        manager_approval: 'Approved',
        hr_approval: 'Pending',
        notes: newReq.notes || null,
        sick_leave_details: newReq.type.includes('Sick') ? 'Tier-1 Omani Labor Law Schedule' : null
      };

      const { data, error } = await supabase
        .from('hr_leave_requests')
        .insert(dbPayload)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newRecord: LeaveRequest = {
          id: data.id,
          employeeId: data.employee_id,
          employeeName: selectedEmp?.name || 'Employee',
          type: data.type,
          startDate: data.start_date,
          endDate: data.end_date,
          days: Number(data.days),
          managerApproval: 'Approved',
          hrApproval: 'Pending',
          notes: data.notes || '',
          sickLeaveDetails: data.sick_leave_details || '',
          createdAt: data.created_at
        };

        setRequests(prev => [newRecord, ...prev]);
      }

      setShowApplyModal(false);
      setNewReq({
        employeeId: employees[0]?.id || '',
        type: 'Annual Leave',
        startDate: '',
        endDate: '',
        days: 1,
        notes: ''
      });
    } catch (err: any) {
      console.error('Failed to insert leave request to Supabase:', err);
      alert(isAr ? 'فشل حفظ طلب الإجازة في قاعدة البيانات' : 'Failed to save leave request to Supabase');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequests = requests.filter(req => req.hrApproval === 'Pending');

  return (
    <div className="space-y-8 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ── Header Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Calendar className="text-[#A11212]" size={24} />
            {isAr ? 'طلب وإجازة الموظفين' : 'Leave & Holiday Management'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">{isAr ? 'متصل بقاعدة بيانات ميسرة وقوانين العمل العمانية المعتمدة' : 'Real-time Supabase sync & compliant with Sultanate of Oman Labor Laws'}</p>
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={14} className="text-[#A11212]" /> {isAr ? 'صندوق طلبات الإجازة المعلقة للموافقة' : 'Pending HR Approval Inbox'}
            </h3>
            <span className="bg-red-50 text-[#A11212] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-100">
              {pendingRequests.length} {isAr ? 'معلق' : 'Pending'}
            </span>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Loader2 size={28} className="animate-spin text-[#A11212] mx-auto mb-2" />
              <p className="text-xs font-bold">{isAr ? 'جاري مزامنة الطلبات...' : 'Syncing live leave requests...'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(req => (
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
                      <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'الفترة' : 'Duration'}</p>
                      <p className="text-xs font-black text-gray-800">{req.startDate} {isAr ? 'إلى' : 'to'} {req.endDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'عدد الأيام' : 'Total Days'}</p>
                      <p className="text-xs font-black text-[#A11212]">{req.days} {isAr ? 'أيام' : 'Days'}</p>
                    </div>
                    {req.notes && (
                      <div className="col-span-2 border-t border-gray-200/50 pt-2">
                        <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'السبب / الملاحظات' : 'Reason / Notes'}</p>
                        <p className="text-xs text-gray-700 font-medium">{req.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 justify-end">
                    <button
                      onClick={() => handleAction(req.id, 'Reject')}
                      className="bg-white border border-gray-200 text-gray-700 hover:text-red-700 hover:border-red-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <X size={14} /> {isAr ? 'رفض' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'Approve')}
                      className="bg-[#A11212] text-white hover:bg-[#800e0e] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <Check size={14} /> {isAr ? 'اعتماد وخصم الرصيد' : 'Approve & Deduct'}
                    </button>
                  </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20 text-green-600" />
                  <p className="font-bold text-sm">{isAr ? 'لا توجد طلبات إجازة معلقة حالياً' : 'No pending leave requests.'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Employee Leave Balances Summary */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <User size={14} /> {isAr ? 'أرصدة إجازات الموظفين الحية' : 'Employee Leave Balances'}
          </h3>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4 max-h-[600px] overflow-y-auto">
            {balances.map(b => (
              <div key={b.employeeId} className="border-b border-gray-50 last:border-b-0 pb-4 last:pb-0 space-y-2">
                <h4 className="font-black text-xs text-gray-900">{b.employeeName}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                    <p className="text-[9px] text-gray-400 font-bold">{isAr ? 'الرصيد السنوي' : 'Annual Bal'}</p>
                    <p className="text-xs font-black text-gray-800">{b.annual} {isAr ? 'يوم' : 'Days'}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                    <p className="text-[9px] text-gray-400 font-bold">{isAr ? 'الرصيد المرضي' : 'Sick Bal'}</p>
                    <p className="text-xs font-black text-gray-800">{b.sick} {isAr ? 'يوم' : 'Days'}</p>
                  </div>
                </div>
              </div>
            ))}
            {balances.length === 0 && !loading && (
              <p className="text-xs text-gray-400 text-center py-4">{isAr ? 'لا توجد بيانات موظفين' : 'No employee balances found.'}</p>
            )}
          </div>
        </div>

      </div>

      {/* ── Submit Modal ───────────────────────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleApply} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'تقديم طلب إجازة جديد' : 'New Leave Request'}
              </h3>
              <button type="button" onClick={() => setShowApplyModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'اختيار الموظف' : 'Select Employee'}
                </label>
                <select
                  value={newReq.employeeId}
                  onChange={(e) => setNewReq({ ...newReq, employeeId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.dept} - {emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'نوع الإجازة' : 'Leave Type'}
                </label>
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'تاريخ البداية' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newReq.startDate}
                    onChange={(e) => setNewReq({ ...newReq, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'تاريخ النهاية' : 'End Date'}
                  </label>
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
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'عدد الأيام' : 'Days Duration'}
                </label>
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
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'ملاحظات / تقرير طبي' : 'Notes / Medical Document reference'}
                </label>
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
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {isAr ? 'إرسال الطلب' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
