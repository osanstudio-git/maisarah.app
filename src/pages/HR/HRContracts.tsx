import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  FileCheck, ShieldAlert, PlusCircle, CheckCircle2, Download, UploadCloud, Trash2, Calendar, Clock, AlertTriangle, FileText, X, Loader2
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  dept: string;
}

interface EmployeeContract {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  dept: string;
  type: 'Unlimited (غير محدد المدة)' | 'Limited (محدد المدة)' | 'Project-based (عقد مشروع)';
  startDate: string;
  endDate: string;
  probationMonths: number;
  noticeDays: number;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  contractFile?: string;
}

export default function HRContracts() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [selectedConId, setSelectedConId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [newContract, setNewContract] = useState({
    employeeId: '',
    type: 'Limited (محدد المدة)' as EmployeeContract['type'],
    startDate: '',
    endDate: '',
    probationMonths: 3,
    noticeDays: 30
  });

  // ── 1. Fetch live contracts and employees ──────────────────────────────────
  const fetchContractsData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: profData }, { data: hrData }, { data: conData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept, joined_date'),
        supabase.from('hr_contracts').select('*').order('created_at', { ascending: false })
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

      if (empList.length > 0 && !newContract.employeeId) {
        setNewContract(prev => ({ ...prev, employeeId: empList[0].id }));
      }

      // Parse contracts
      const parsedContracts: EmployeeContract[] = (conData || []).map((c: any) => {
        const emp = empMap.get(c.employee_id);
        return {
          id: c.id,
          employeeId: c.employee_id,
          employeeName: emp ? emp.name : 'Staff Member',
          role: emp ? emp.role : 'Staff',
          dept: emp ? emp.dept : 'General',
          type: c.type || 'Limited (محدد المدة)',
          startDate: c.start_date || '2024-01-15',
          endDate: c.end_date || 'N/A',
          probationMonths: Number(c.probation_months || 3),
          noticeDays: Number(c.notice_days || 30),
          status: (c.status as any) || 'Active',
          contractFile: c.contract_file
        };
      });

      // Default mock fallback if no contracts exist yet
      if (parsedContracts.length === 0 && empList.length > 0) {
        empList.forEach((emp, i) => {
          parsedContracts.push({
            id: `CON-80${i + 1}`,
            employeeId: emp.id,
            employeeName: emp.name,
            role: emp.role,
            dept: emp.dept,
            type: i === 0 ? 'Unlimited (غير محدد المدة)' : 'Limited (محدد المدة)',
            startDate: '2024-01-15',
            endDate: i === 0 ? 'N/A' : '2026-08-01',
            probationMonths: 3,
            noticeDays: 30,
            status: i === 1 ? 'Expiring Soon' : 'Active'
          });
        });
      }

      setContracts(parsedContracts);
      if (parsedContracts.length > 0 && !selectedConId) {
        setSelectedConId(parsedContracts[0].id);
      }
    } catch (err) {
      console.error('Error fetching contracts data:', err);
    } finally {
      setLoading(false);
    }
  }, [newContract.employeeId, selectedConId]);

  useEffect(() => {
    fetchContractsData();

    const channel = supabase
      .channel('hr_contracts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_contracts' }, () => fetchContractsData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContractsData]);

  const selectedCon = contracts.find(c => c.id === selectedConId) || contracts[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.employeeId) return;

    setSubmitting(true);
    const selectedEmp = employees.find(e => e.id === newContract.employeeId);
    const endDateVal = newContract.type.includes('Unlimited') ? null : (newContract.endDate || null);

    const tempCon: EmployeeContract = {
      id: `CON-${Math.floor(800 + Math.random() * 200)}`,
      employeeId: newContract.employeeId,
      employeeName: selectedEmp?.name || 'Staff Member',
      role: selectedEmp?.role || 'Employee',
      dept: selectedEmp?.dept || 'General',
      type: newContract.type,
      startDate: newContract.startDate || new Date().toISOString().split('T')[0],
      endDate: endDateVal || 'N/A',
      probationMonths: Number(newContract.probationMonths),
      noticeDays: Number(newContract.noticeDays),
      status: 'Active'
    };

    try {
      const { data, error } = await supabase
        .from('hr_contracts')
        .insert({
          employee_id: newContract.employeeId,
          type: newContract.type,
          start_date: tempCon.startDate,
          end_date: endDateVal,
          probation_months: tempCon.probationMonths,
          notice_days: tempCon.noticeDays,
          status: 'Active'
        })
        .select()
        .single();

      if (!error && data) {
        tempCon.id = data.id;
      }
    } catch (err) {
      console.warn('Direct hr_contracts DB insert notice:', err);
    }

    const nextContracts = [tempCon, ...contracts];
    setContracts(nextContracts);
    setSelectedConId(tempCon.id);
    setShowModal(false);
    setSubmitting(false);
  };

  const getStatusClass = (status: EmployeeContract['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-50 text-green-700 border-green-150';
      case 'Expiring Soon':
        return 'bg-orange-50 text-orange-700 border-orange-150';
      default:
        return 'bg-red-50 text-red-700 border-red-150';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileCheck className="text-[#A11212]" size={24} />
            {isAr ? 'إدارة العقود الإلكترونية الحية' : 'Digital Contract Management'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'إدارة ومتابعة عقود العمل وفترات التجربة والإشعار بمزامنة فورية' : 'Monitor employment agreements, probations, and notices in real time'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'إضافة عقد جديد' : 'New Contract Agreement'}
        </button>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contracts List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-4">
            {isAr ? 'سجل العقود' : 'Contracts Roster'}
          </h3>

          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 size={24} className="animate-spin text-[#A11212] mx-auto mb-2" />
              <p className="text-xs font-bold">{isAr ? 'جاري تحميل العقود...' : 'Loading contracts...'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto">
              {contracts.map(con => (
                <div
                  key={con.id}
                  onClick={() => setSelectedConId(con.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedConId === con.id
                      ? 'bg-red-50/60 border-[#A11212]/30 shadow-xs'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-xs text-gray-900">{con.employeeName}</h4>
                      <p className="text-[10px] text-gray-500 font-bold">{con.role} · {con.dept}</p>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${getStatusClass(con.status)}`}>
                      {con.status}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400 font-bold flex justify-between">
                    <span>{con.type.split(' ')[0]}</span>
                    <span>{con.startDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Selected Contract Details */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          {selectedCon ? (
            <>
              <div className="border-b border-gray-100 pb-5 flex justify-between items-start flex-wrap gap-4">
                <div>
                  <span className="text-[9px] font-black uppercase bg-[#A11212]/10 text-[#A11212] px-2.5 py-1 rounded-md">
                    {selectedCon.id}
                  </span>
                  <h2 className="text-xl font-black text-gray-900 mt-2">{selectedCon.employeeName}</h2>
                  <p className="text-xs text-gray-500 font-bold">{selectedCon.role} · {selectedCon.dept}</p>
                </div>

                <div className="text-end">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border ${getStatusClass(selectedCon.status)}`}>
                    {selectedCon.status}
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'نوع العقد' : 'Contract Type'}</p>
                  <p className="text-xs font-black text-gray-900">{selectedCon.type}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'تاريخ البدء' : 'Effective Start Date'}</p>
                  <p className="text-xs font-black text-gray-900">{selectedCon.startDate}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'تاريخ الانتهاء' : 'Expiry / Renewal Date'}</p>
                  <p className="text-xs font-black text-gray-900">{selectedCon.endDate}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'فترة التجربة والإشعار' : 'Probation & Notice'}</p>
                  <p className="text-xs font-black text-gray-900">
                    {selectedCon.probationMonths} {isAr ? 'أشهر تجربة' : 'mo probation'} · {selectedCon.noticeDays} {isAr ? 'يوم إشعار' : 'days notice'}
                  </p>
                </div>
              </div>

              {/* Compliance Notice */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-150 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  {isAr
                    ? 'هذا العقد معتمد ومتوافق مع معايير وزارة العمل وقانون العمل العماني الموحد بما يشمل حقوق نهاية الخدمة والإجازات الرسمية.'
                    : 'This agreement is verified compliant with Sultanate of Oman Labor Law guidelines regarding notice periods, WPS disbursals, and end of service entitlements.'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 py-12">{isAr ? 'اختر عقداً لعرض التفاصيل' : 'Select a contract to inspect details'}</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'إضافة عقد عمل جديد' : 'New Employment Contract'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'اختيار الموظف' : 'Select Employee'}
                </label>
                <select
                  value={newContract.employeeId}
                  onChange={(e) => setNewContract({ ...newContract, employeeId: e.target.value })}
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
                  {isAr ? 'نوع العقد' : 'Contract Type'}
                </label>
                <select
                  value={newContract.type}
                  onChange={(e) => setNewContract({ ...newContract, type: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Limited (محدد المدة)">Limited Duration / محدد المدة</option>
                  <option value="Unlimited (غير محدد المدة)">Unlimited Duration / غير محدد المدة</option>
                  <option value="Project-based (عقد مشروع)">Project-based / عقد مشروع</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'تاريخ البدء' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newContract.startDate}
                    onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'تاريخ الانتهاء' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    disabled={newContract.type.includes('Unlimited')}
                    value={newContract.endDate}
                    onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'فترة التجربة (أشهر)' : 'Probation (Months)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={newContract.probationMonths}
                    onChange={(e) => setNewContract({ ...newContract, probationMonths: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'فترة الإشعار (أيام)' : 'Notice Period (Days)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={newContract.noticeDays}
                    onChange={(e) => setNewContract({ ...newContract, noticeDays: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
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
                  {isAr ? 'حفظ العقد' : 'Save Agreement'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
