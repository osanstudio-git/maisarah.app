import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  UserMinus, CheckSquare, Square, FileText, CheckCircle2, PlusCircle, Trash2, Calendar, ShieldAlert, Award, Download, X, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  dept: string;
}

interface OffboardingTask {
  id: string;
  title: string;
  completed: boolean;
}

interface TerminatedEmployee {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  dept: string;
  lastWorkingDay: string;
  reason: 'Resignation' | 'Dismissal' | 'Redundancy' | 'End of Contract';
  eosBenefits: number;
  tasks: OffboardingTask[];
}

export default function HRTermination() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [terminations, setTerminations] = useState<TerminatedEmployee[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [newTerm, setNewTerm] = useState({
    employeeId: '',
    lastWorkingDay: '',
    reason: 'Resignation' as TerminatedEmployee['reason'],
    eosBenefits: 1200
  });

  // ── 1. Fetch live terminations & employees ─────────────────────────────────
  const fetchTerminationsData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: profData }, { data: hrData }, { data: termData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept'),
        supabase.from('hr_terminations').select('*').order('created_at', { ascending: false })
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

      if (empList.length > 0 && !newTerm.employeeId) {
        setNewTerm(prev => ({ ...prev, employeeId: empList[0].id }));
      }

      // Parse DB records
      const parsedTerminations: TerminatedEmployee[] = (termData || []).map((t: any) => {
        const emp = empMap.get(t.employee_id);
        const defaultTasks: OffboardingTask[] = [
          { id: 't1', title: isAr ? 'استلام الحاسب المحمول وبطاقة الدخول' : 'Return Company Laptop, Monitors & Access Card', completed: false },
          { id: 't2', title: isAr ? 'إلغاء تفعيل البريد والحسابات المؤسسية' : 'Deactivate Corporate Email & System Accounts', completed: false },
          { id: 't3', title: isAr ? 'حساب واعتماد مستحقات نهاية الخدمة' : 'Calculate & Approve Final EOS Settlement Pay', completed: false },
          { id: 't4', title: isAr ? 'إصدار شهادة الخبرة وبراءة الذمة' : 'Draft & Issue Certificate of Employment Experience', completed: false }
        ];

        return {
          id: t.id,
          employeeId: t.employee_id,
          name: emp ? emp.name : 'Staff Member',
          role: emp ? emp.role : 'Staff Member',
          dept: emp ? emp.dept : 'General',
          lastWorkingDay: t.last_working_day,
          reason: t.reason,
          eosBenefits: Number(t.eos_benefits || 0),
          tasks: t.tasks && Array.isArray(t.tasks) ? t.tasks : defaultTasks
        };
      });

      // Default mock fallback if empty
      if (parsedTerminations.length === 0 && empList.length > 0) {
        parsedTerminations.push({
          id: 'TERM-1301',
          employeeId: empList[0].id,
          name: empList[0].name,
          role: empList[0].role,
          dept: empList[0].dept,
          lastWorkingDay: '2026-07-15',
          reason: 'Resignation',
          eosBenefits: 1200,
          tasks: [
            { id: 't1', title: isAr ? 'استلام الحاسب المحمول وبطاقة الدخول' : 'Return Company Laptop, Monitors & Access Card', completed: true },
            { id: 't2', title: isAr ? 'إلغاء تفعيل البريد والحسابات المؤسسية' : 'Deactivate Corporate Email & System Accounts', completed: false },
            { id: 't3', title: isAr ? 'حساب واعتماد مستحقات نهاية الخدمة' : 'Calculate & Approve Final EOS Settlement Pay', completed: false },
            { id: 't4', title: isAr ? 'إصدار شهادة الخبرة وبراءة الذمة' : 'Draft & Issue Certificate of Employment Experience', completed: false }
          ]
        });
      }

      setTerminations(parsedTerminations);
      if (parsedTerminations.length > 0 && !selectedTermId) {
        setSelectedTermId(parsedTerminations[0].id);
      }
    } catch (err) {
      console.error('Error fetching terminations data:', err);
    } finally {
      setLoading(false);
    }
  }, [newTerm.employeeId, selectedTermId, isAr]);

  useEffect(() => {
    fetchTerminationsData();

    const channel = supabase
      .channel('hr_terminations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_terminations' }, () => fetchTerminationsData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTerminationsData]);

  const selectedTerm = terminations.find(t => t.id === selectedTermId) || terminations[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.employeeId) return;

    setSubmitting(true);
    const selectedEmp = employees.find(e => e.id === newTerm.employeeId);
    const today = new Date().toISOString().split('T')[0];

    const defaultTasks: OffboardingTask[] = [
      { id: 't1', title: isAr ? 'استلام الحاسب المحمول وبطاقة الدخول' : 'Return Company Laptop, Monitors & Access Card', completed: false },
      { id: 't2', title: isAr ? 'إلغاء تفعيل البريد والحسابات المؤسسية' : 'Deactivate Corporate Email & System Accounts', completed: false },
      { id: 't3', title: isAr ? 'حساب واعتماد مستحقات نهاية الخدمة' : 'Calculate & Approve Final EOS Settlement Pay', completed: false },
      { id: 't4', title: isAr ? 'إصدار شهادة الخبرة وبراءة الذمة' : 'Draft & Issue Certificate of Employment Experience', completed: false }
    ];

    const tempTerm: TerminatedEmployee = {
      id: `TERM-${Math.floor(1300 + Math.random() * 100)}`,
      employeeId: newTerm.employeeId,
      name: selectedEmp?.name || 'Staff Member',
      role: selectedEmp?.role || 'Staff Member',
      dept: selectedEmp?.dept || 'General',
      lastWorkingDay: newTerm.lastWorkingDay || today,
      reason: newTerm.reason,
      eosBenefits: Number(newTerm.eosBenefits || 0),
      tasks: defaultTasks
    };

    try {
      const { data, error } = await supabase
        .from('hr_terminations')
        .insert({
          employee_id: newTerm.employeeId,
          last_working_day: tempTerm.lastWorkingDay,
          reason: newTerm.reason,
          eos_benefits: tempTerm.eosBenefits,
          tasks: defaultTasks
        })
        .select()
        .single();

      if (!error && data) {
        tempTerm.id = data.id;
      }
    } catch (err) {
      console.warn('Direct hr_terminations DB insert notice:', err);
    }

    const nextTerms = [tempTerm, ...terminations];
    setTerminations(nextTerms);
    setSelectedTermId(tempTerm.id);
    setShowModal(false);
    setSubmitting(false);
  };

  const toggleTask = async (termId: string, taskId: string) => {
    const target = terminations.find(t => t.id === termId);
    if (!target) return;

    const updatedTasks = target.tasks.map(tsk =>
      tsk.id === taskId ? { ...tsk, completed: !tsk.completed } : tsk
    );

    setTerminations(prev => prev.map(t => t.id === termId ? { ...t, tasks: updatedTasks } : t));
    localStorage.setItem('hr_terminations_cache', JSON.stringify(terminations));

    try {
      await supabase
        .from('hr_terminations')
        .update({ tasks: updatedTasks })
        .eq('id', termId);
    } catch (err) {
      console.warn('DB update notice for hr_terminations tasks:', err);
    }
  };

  const calculateProgress = (term: TerminatedEmployee) => {
    const done = term.tasks.filter(t => t.completed).length;
    return Math.round((done / term.tasks.length) * 100);
  };

  const downloadExperienceCertificate = (term: TerminatedEmployee) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const brandRed = [161, 18, 18];
    const charcoal = [26, 26, 26];
    const grayText = [110, 110, 110];
    const bgLight = [249, 249, 249];

    // 1. Accent Bar
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
    doc.text('Corporate HR Services Portal | Muscat, Sultanate of Oman', 14, 29);

    // Document Type
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CERTIFICATE OF EXPERIENCE & CLEARANCE', 105, 24, { align: 'right' });

    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFontSize(9);
    doc.text(`Clearance ID: ${term.id}`, 196, 29, { align: 'right' });

    // Separator Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 34, 196, 34);

    // 2. Certificate Body
    let y = 50;
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TO WHOM IT MAY CONCERN', 105, y, { align: 'center' });

    y += 14;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(50, 50, 50);

    const statement = `This is to certify that ${term.name} was employed with Maisarah Group as ${term.role} in the ${term.dept} Department until their last working day on ${term.lastWorkingDay}.

During their tenure, they demonstrated dedication, high professional ethics, and delivered their responsibilities in compliance with company standards and Sultanate of Oman Labor regulations.

All company assets, clearances, and end of service entitlements (Totaling ${term.eosBenefits.toFixed(2)} OMR) have been successfully finalized and settled.

We thank them for their service and wish them continuous success in their future career endeavors.`;

    doc.text(doc.splitTextToSize(statement, 180), 14, y);

    // Signatures Block
    y = 220;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 75, y);
    doc.line(135, y, 196, y);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text('Authorized HR Executive', 14, y + 6);
    doc.text('Director of Operations', 135, y + 6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('Maisarah Group Human Resources', 14, y + 11);
    doc.text('Muscat Head Office, Oman', 135, y + 11);

    doc.save(`Experience_Certificate_${term.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <UserMinus className="text-[#A11212]" size={24} />
            {isAr ? 'إنهاء الخدمة وبراءة الذمة' : 'Termination & Offboarding Clearances'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'متابعة براءة الذمة، مكافأة نهاية الخدمة، وإصدار شهادات الخبرة' : 'Track offboarding checklists, EOS settlements, and issue experience letters'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'بدء إجراء خروج جديد' : 'New Offboarding Case'}
        </button>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Offboarding List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-4">
            {isAr ? 'ملفات إنهاء الخدمة' : 'Offboarding Cases'}
          </h3>

          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 size={24} className="animate-spin text-[#A11212] mx-auto mb-2" />
              <p className="text-xs font-bold">{isAr ? 'جاري التحميل...' : 'Loading cases...'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto">
              {terminations.map(term => {
                const progress = calculateProgress(term);
                return (
                  <div
                    key={term.id}
                    onClick={() => setSelectedTermId(term.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedTermId === term.id
                        ? 'bg-red-50/60 border-[#A11212]/30 shadow-xs'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-xs text-gray-900">{term.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold">{term.role} · {term.dept}</p>
                      </div>
                      <span className="bg-gray-100 text-gray-700 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                        {term.reason}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[9px] font-black text-gray-400 mb-1">
                        <span>{isAr ? 'اكتمال براءة الذمة' : 'Clearance Progress'}</span>
                        <span className={progress === 100 ? 'text-green-600' : 'text-gray-900'}>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-600' : 'bg-[#A11212]'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Offboarding Case Details */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          {selectedTerm ? (
            <>
              <div className="border-b border-gray-100 pb-5 flex justify-between items-start flex-wrap gap-4">
                <div>
                  <span className="text-[9px] font-black uppercase bg-[#A11212]/10 text-[#A11212] px-2.5 py-1 rounded-md">
                    {selectedTerm.id}
                  </span>
                  <h2 className="text-xl font-black text-gray-900 mt-2">{selectedTerm.name}</h2>
                  <p className="text-xs text-gray-500 font-bold">{selectedTerm.role} · {selectedTerm.dept}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadExperienceCertificate(selectedTerm)}
                    className="bg-[#A11212] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Download size={14} /> {isAr ? 'إصدار شهادة الخبرة PDF' : 'Experience Certificate'}
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'سبب المغادرة' : 'Exit Reason'}</p>
                  <p className="text-xs font-black text-gray-900">{selectedTerm.reason}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'آخر يوم عمل' : 'Last Working Day'}</p>
                  <p className="text-xs font-black text-gray-900">{selectedTerm.lastWorkingDay}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'مستحقات نهاية الخدمة' : 'EOS Settlement'}</p>
                  <p className="text-xs font-black text-[#A11212]">{selectedTerm.eosBenefits.toFixed(2)} OMR</p>
                </div>
              </div>

              {/* Tasks Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <CheckSquare size={16} className="text-[#A11212]" />
                  {isAr ? 'قائمة مهام براءة الذمة والتسليم' : 'Offboarding Clearance Checklist'}
                </h4>

                <div className="space-y-2">
                  {selectedTerm.tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(selectedTerm.id, task.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        task.completed ? 'bg-green-50/60 border-green-200' : 'bg-white border-gray-150 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {task.completed ? (
                          <CheckSquare size={18} className="text-green-600" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                        <span className={`text-xs font-bold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </span>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        task.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {task.completed ? (isAr ? 'مكتمل' : 'Done') : (isAr ? 'معلق' : 'Pending')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 py-12">{isAr ? 'اختر ملفاً لعرض التفاصيل' : 'Select a case to view checklist'}</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'بدء إجراء إنهاء خدمة جديد' : 'New Offboarding Case Form'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'اختيار الموظف' : 'Select Employee'}
                </label>
                <select
                  value={newTerm.employeeId}
                  onChange={(e) => setNewTerm({ ...newTerm, employeeId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.dept} - {emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'سبب إنهاء الخدمة' : 'Exit Reason'}
                  </label>
                  <select
                    value={newTerm.reason}
                    onChange={(e) => setNewTerm({ ...newTerm, reason: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Resignation">{isAr ? 'استقالة (Resignation)' : 'Resignation'}</option>
                    <option value="End of Contract">{isAr ? 'انتهاء العقد (End of Contract)' : 'End of Contract'}</option>
                    <option value="Redundancy">{isAr ? 'إنهاء خدمات (Redundancy)' : 'Redundancy'}</option>
                    <option value="Dismissal">{isAr ? 'فصل (Dismissal)' : 'Dismissal'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'آخر يوم عمل' : 'Last Working Day'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newTerm.lastWorkingDay}
                    onChange={(e) => setNewTerm({ ...newTerm, lastWorkingDay: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'مستحقات نهاية الخدمة التقديرية (OMR)' : 'Estimated EOS Settlement (OMR)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={newTerm.eosBenefits}
                  onChange={(e) => setNewTerm({ ...newTerm, eosBenefits: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
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
                  {isAr ? 'بدء الإجراء' : 'Initialize Case'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
