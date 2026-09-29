import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  ClipboardCheck, Check, X, FileText, Gift, HelpCircle, AlertCircle, PlusCircle, CheckCircle2, Loader2, User
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  dept: string;
}

interface HRRequest {
  id: string | number;
  employeeId: string;
  employeeName: string;
  type: 'Salary Certificate' | 'Certificate for Relevant Parties' | 'Advance Payment' | 'Allowance Request' | 'Resignation' | 'Department Transfer' | 'Schedule Change' | 'Data Update' | 'Training Request' | 'Equipment/Custody Request';
  submittedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  details: string;
}

export default function HRRequests() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    type: 'Salary Certificate' as HRRequest['type'],
    details: ''
  });

  // ── 1. Fetch live requests & employees ─────────────────────────────────────
  const fetchRequestsData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: profData }, { data: hrData }, { data: reqData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept'),
        supabase.from('hr_requests').select('*').order('created_at', { ascending: false })
      ]);

      const empMap = new Map<string, EmployeeProfile>();
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
            name: h.full_name || 'Staff Member',
            role: h.role || 'Employee',
            dept: h.dept || 'General'
          });
        }
      });

      const empList = Array.from(empMap.values());
      setEmployees(empList);

      if (empList.length > 0 && !newRequest.employeeId) {
        setNewRequest(prev => ({ ...prev, employeeId: empList[0].id }));
      }

      // Parse live requests
      const parsedReqs: HRRequest[] = (reqData || []).map((r: any) => {
        const emp = empMap.get(r.employee_id);
        return {
          id: r.id,
          employeeId: r.employee_id,
          employeeName: emp ? emp.name : 'Staff Member',
          type: r.type,
          submittedDate: r.submitted_date || (r.created_at ? r.created_at.split('T')[0] : 'Today'),
          status: r.status,
          details: r.details || ''
        };
      });

      // Merge cached requests if any
      const cached = JSON.parse(localStorage.getItem('hr_requests_cache') || '[]');
      cached.forEach((c: HRRequest) => {
        if (!parsedReqs.some(p => String(p.id) === String(c.id))) {
          parsedReqs.push(c);
        }
      });

      setRequests(parsedReqs);
    } catch (err) {
      console.error('Error fetching HR requests:', err);
    } finally {
      setLoading(false);
    }
  }, [newRequest.employeeId]);

  useEffect(() => {
    fetchRequestsData();

    // Realtime channel
    const channel = supabase
      .channel('hr_requests_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_requests' }, () => fetchRequestsData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequestsData]);

  // ── 2. Handle Action (Approve / Reject) ───────────────────────────────────
  const handleAction = async (id: string | number, status: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));

    try {
      await supabase
        .from('hr_requests')
        .update({ status })
        .eq('id', id);
    } catch (err) {
      console.warn('DB update notice for hr_requests:', err);
    }

    const updated = requests.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem('hr_requests_cache', JSON.stringify(updated));
  };

  // ── 3. Handle Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.employeeId) return;

    setSubmitting(true);
    const selectedEmp = employees.find(e => e.id === newRequest.employeeId);
    const today = new Date().toISOString().split('T')[0];

    const tempReq: HRRequest = {
      id: `REQ-${Math.floor(500 + Math.random() * 500)}`,
      employeeId: newRequest.employeeId,
      employeeName: selectedEmp?.name || 'Staff Member',
      type: newRequest.type,
      submittedDate: today,
      status: 'Pending',
      details: newRequest.details
    };

    try {
      const { data, error } = await supabase
        .from('hr_requests')
        .insert({
          employee_id: newRequest.employeeId,
          type: newRequest.type,
          submitted_date: today,
          status: 'Pending',
          details: newRequest.details
        })
        .select()
        .single();

      if (!error && data) {
        tempReq.id = data.id;
      }
    } catch (err) {
      console.warn('Direct hr_requests DB insert notice:', err);
    }

    const nextReqs = [tempReq, ...requests];
    setRequests(nextReqs);
    localStorage.setItem('hr_requests_cache', JSON.stringify(nextReqs));

    setShowModal(false);
    setNewRequest(prev => ({ ...prev, details: '' }));
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="text-[#A11212]" size={24} />
            {isAr ? 'الطلبات الإلكترونية الحية' : 'Online HR Requests'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'إدارة واعتماد طلبات الموظفين الخدمية بمزامنة فورية' : 'Manage and authorize employee service requests in real time'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'تقديم طلب جديد' : 'Submit Service Request'}
        </button>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 size={28} className="animate-spin text-[#A11212] mx-auto mb-2" />
            <p className="text-xs font-bold">{isAr ? 'جاري تحميل الطلبات...' : 'Syncing live requests...'}</p>
          </div>
        ) : (
          <>
            {requests.map(req => (
              <div key={req.id} className="border border-gray-150 rounded-2xl p-5 hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm text-gray-900">{req.employeeName}</h4>
                    <span className="bg-[#A11212]/5 text-[#A11212] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {req.type}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">#{req.id}</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">{req.details}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'تاريخ التقديم:' : 'Submitted:'} {req.submittedDate}</p>
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                    req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-150' :
                    req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-150' :
                    'bg-orange-50 text-orange-700 border-orange-150'
                  }`}>
                    {req.status}
                  </span>
                  
                  {req.status === 'Pending' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAction(req.id, 'Rejected')}
                        className="p-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-red-700 hover:border-red-200 transition-colors"
                        title={isAr ? 'رفض' : 'Reject'}
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'Approved')}
                        className="p-2 bg-[#A11212] text-white rounded-xl hover:bg-[#800e0e] transition-colors"
                        title={isAr ? 'اعتماد' : 'Approve'}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20 text-green-600" />
                <p className="font-bold text-sm">{isAr ? 'لا توجد طلبات مسجلة حالياً' : 'No service requests found.'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'نموذج طلب خدمة جديد' : 'New Service Request Form'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'اختيار الموظف' : 'Employee Name'}
                </label>
                <select
                  value={newRequest.employeeId}
                  onChange={(e) => setNewRequest({ ...newRequest, employeeId: e.target.value })}
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
                  {isAr ? 'نوع الطلب' : 'Request Type'}
                </label>
                <select
                  value={newRequest.type}
                  onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Salary Certificate">{isAr ? 'شهادة راتب (Salary Certificate)' : 'Salary Certificate'}</option>
                  <option value="Certificate for Relevant Parties">{isAr ? 'شهادة لمن يهمه الأمر' : 'Certificate for Relevant Parties'}</option>
                  <option value="Advance Payment">{isAr ? 'سلفة مالية (Advance Payment)' : 'Advance Payment'}</option>
                  <option value="Allowance Request">{isAr ? 'طلب بدل (Allowance Request)' : 'Allowance Request'}</option>
                  <option value="Resignation">{isAr ? 'استقالة (Resignation)' : 'Resignation'}</option>
                  <option value="Department Transfer">{isAr ? 'طلب نقل قسم (Department Transfer)' : 'Department Transfer'}</option>
                  <option value="Schedule Change">{isAr ? 'تغيير أوقات الدوام' : 'Schedule Change'}</option>
                  <option value="Data Update">{isAr ? 'تحديث وتعديل بيانات' : 'Data Update'}</option>
                  <option value="Training Request">{isAr ? 'طلب دورة تدريبية' : 'Training Request'}</option>
                  <option value="Equipment/Custody Request">{isAr ? 'طلب عهدة ومعدات' : 'Equipment/Custody Request'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'التفاصيل والمبررات' : 'Details & Justification'}
                </label>
                <textarea
                  required
                  value={newRequest.details}
                  onChange={(e) => setNewRequest({ ...newRequest, details: e.target.value })}
                  placeholder={isAr ? 'حدد التفاصيل المطلوبة...' : 'Specify details, e.g., bank details, equipment models, reasons...'}
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {isAr ? 'إرسال الطلب' : 'Submit Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
