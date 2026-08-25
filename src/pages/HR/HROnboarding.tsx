import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserPlus, CheckSquare, Square, CheckCircle2, PlusCircle, Trash2, Calendar, UserCheck, Mail, FileSignature, ShieldAlert, X, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

interface Recruit {
  id: string;
  name: string;
  role: string;
  dept: string;
  email: string;
  phone: string;
  employment_type?: 'Experienced' | 'Trainee' | 'Worker';
  onboarding_tasks: {
    contract_signed: boolean;
    bank_details_submitted: boolean;
    documents_uploaded: boolean;
    it_assets_ready: boolean;
  };
  created_at?: string;
}

export default function HROnboarding() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [newHires, setNewHires] = useState<Recruit[]>([]);
  const [selectedHireId, setSelectedHireId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [newHireData, setNewHireData] = useState({
    name: '',
    role: 'Senior Auditor',
    dept: 'Audit',
    email: '',
    phone: '',
    employment_type: 'Experienced' as 'Experienced' | 'Trainee' | 'Worker',
    customRole: '',
    customDept: '',
    startDate: ''
  });

  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  const fetchHires = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_recruits')
        .select('*')
        .eq('stage', 'offered')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNewHires(data || []);
      if (data && data.length > 0 && !selectedHireId) {
        setSelectedHireId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching onboarding roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHires();
  }, []);

  const sendOfferWelcomeEmail = async (c: Recruit) => {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: c.email,
          subject: isAr 
            ? 'مرحباً بك في مجموعة ميسرة - عرض العمل والخطوات القادمة' 
            : 'Welcome to Maisarah Group - Job Offer & Next Steps',
          html: `
            <div style="font-family: sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; font-size: 14px; line-height: 1.6; color: #333;">
              <h2 style="color: #A11212; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                ${isAr ? 'تهانينا على عرض العمل!' : 'Congratulations on your Job Offer!'}
              </h2>
              <p>${isAr ? 'عزيزي/عزيزتي' : 'Dear'} <strong>${c.name}</strong>,</p>
              <p>
                ${isAr 
                  ? 'يسعدنا جداً انضمامك إلى مجموعة ميسرة. نود إبلاغك بأنه قد تم تفعيل عرض العمل الخاص بك وتوجيهه للمدير التنفيذي المسؤول لوضع اللمسات الأخيرة وتعيين القسم والمشرف المباشر.' 
                  : 'We are absolutely thrilled to welcome you to the Maisarah Group family. We would like to inform you that your job offer has been successfully processed and forwarded to the Executive Operations Manager for final department and supervisor placement allocation.'}
              </p>
              <div style="background-color: #fcfcfc; border: 1px solid #f0f0f0; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #555;">${isAr ? 'تفاصيل التوظيف الأولية:' : 'Initial Employment Details:'}</h3>
                <p><strong>${isAr ? 'الاسم الكامل:' : 'Full Name:'}</strong> ${c.name}</p>
                <p><strong>${isAr ? 'المسمى الوظيفي المقترح:' : 'Designated Position:'}</strong> ${c.role}</p>
                <p><strong>${isAr ? 'القسم المقترح:' : 'Department:'}</strong> ${c.dept}</p>
                <p><strong>${isAr ? 'نوع التوظيف:' : 'Employment Type:'}</strong> ${c.employment_type || 'Experienced'}</p>
              </div>
              <p>
                ${isAr 
                  ? 'بمجرد أن يقوم المدير المسؤول باعتماد تفاصيل التعيين، ستصلك رسالة بريد إلكتروني ثانية تحتوي على رابط تفعيل الحساب وبيانات تسجيل الدخول الخاصة بك لبدء مهام قائمة مباشرة العمل.' 
                  : 'As soon as the responsible manager confirms your final placement, you will receive a second email containing your portal activation link and secure temporary credentials to access your Employee Dashboard and begin your onboarding checklist.'}
              </p>
              <br/>
              <p>${isAr ? 'مع أطيب التحيات،' : 'Best Regards,'}</p>
              <p>${isAr ? 'إدارة الموارد البشرية - ميسرة' : 'Maisarah HR Department'}</p>
            </div>
          `
        }
      });

      setNotification({
        show: true,
        title: isAr ? 'تم تفعيل التوظيف' : 'Job Offer Extended',
        message: isAr 
          ? `تم تحديث حالة المرشح ${c.name} إلى "مقبول" بنجاح، وتم إرسال البريد الترحيبي الأول.`
          : `Candidate ${c.name} promoted to Offered. Welcome offer email (Email A) dispatched, awaiting manager placement.`,
        type: 'success'
      });
    } catch (mailErr: any) {
      console.warn('Welcome offer email dispatch failed:', mailErr);
      setNotification({
        show: true,
        title: isAr ? 'تم التحديث مع تنبيه' : 'Updated with Warning',
        message: isAr 
          ? `تم تحديث حالة المرشح ولكن تعذر إرسال البريد الإلكتروني: ${mailErr.message}`
          : `Candidate updated, but welcome email dispatch failed: ${mailErr.message}`,
        type: 'error'
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const finalRole = newHireData.role === 'custom' ? newHireData.customRole : newHireData.role;
      const finalDept = newHireData.dept === 'custom' ? newHireData.customDept : newHireData.dept;

      const payload = {
        name: newHireData.name,
        role: finalRole,
        dept: finalDept,
        email: newHireData.email,
        phone: newHireData.phone,
        employment_type: newHireData.employment_type,
        stage: 'offered', // Direct to onboarding
        placement_status: 'pending_placement',
        score: 0,
        onboarding_tasks: {
          contract_signed: false,
          bank_details_submitted: false,
          documents_uploaded: false,
          it_assets_ready: false
        }
      };

      const { data, error } = await supabase
        .from('hr_recruits')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Optimistically update list
      setNewHires(prev => [data, ...prev]);
      setSelectedHireId(data.id);
      setShowModal(false);
      
      // Reset form data
      setNewHireData({
        name: '',
        role: 'Senior Auditor',
        dept: 'Audit',
        email: '',
        phone: '',
        employment_type: 'Experienced',
        customRole: '',
        customDept: '',
        startDate: ''
      });

      // Send welcome offer email (Email A)!
      await sendOfferWelcomeEmail(data);
    } catch (err: any) {
      setFormError(err.message || 'Failed to initialize direct onboarding');
    }
  };

  const toggleTask = async (hireId: string, taskId: string) => {
    const hire = newHires.find(h => h.id === hireId);
    if (!hire) return;
    const currentTasks = hire.onboarding_tasks || {
      contract_signed: false,
      bank_details_submitted: false,
      documents_uploaded: false,
      it_assets_ready: false
    };
    const updatedTasks = {
      ...currentTasks,
      [taskId]: !currentTasks[taskId]
    };

    // Update locally optimistically
    setNewHires(prev => prev.map(h => h.id === hireId ? { ...h, onboarding_tasks: updatedTasks } : h));

    try {
      const { error } = await supabase
        .from('hr_recruits')
        .update({ onboarding_tasks: updatedTasks })
        .eq('id', hireId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating task checklist:', err);
    }
  };

  const selectedHire = newHires.find(h => h.id === selectedHireId) || null;

  const getTasksList = (h: Recruit) => {
    const tasks = h.onboarding_tasks || {
      contract_signed: false,
      bank_details_submitted: false,
      documents_uploaded: false,
      it_assets_ready: false
    };
    return [
      { id: 'contract_signed', title: isAr ? 'توقيع عقد العمل' : 'Sign Employment Contract', completed: !!tasks.contract_signed },
      { id: 'bank_details_submitted', title: isAr ? 'تقديم بيانات البنك للرواتب' : 'Submit Bank Details for Payroll', completed: !!tasks.bank_details_submitted },
      { id: 'documents_uploaded', title: isAr ? 'تحميل وثائق الهوية والشهادات' : 'Upload Identification Documents', completed: !!tasks.documents_uploaded },
      { id: 'it_assets_ready', title: isAr ? 'تهيئة البريد الإلكتروني وأجهزة الشركة' : 'Configure Corporate Email & IT Assets', completed: !!tasks.it_assets_ready }
    ];
  };

  const calculateProgress = (h: Recruit) => {
    const list = getTasksList(h);
    const done = list.filter(t => t.completed).length;
    return Math.round((done / list.length) * 100);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <UserCheck className="text-[#A11212]" size={24} />
            {isAr ? 'تهيئة الموظفين الجدد' : 'New Hire Onboarding Hub'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'متابعة وإتمام قائمة المهام الترحيبية وتدريب الموظفين الجدد' : 'Monitor welcome checklists and track integration completion rates'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <PlusCircle size={16} /> {isAr ? 'تهيئة تعيين مباشر' : 'New Hire Onboarding'}
        </button>
      </div>

      {/* Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Left Side: Directory with completion indicators */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1 mb-3">Onboarding Roster</h3>
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-xs text-gray-400 font-bold">
                {isAr ? 'جاري تحميل قائمة الموظفين...' : 'Loading onboarding roster...'}
              </div>
            ) : newHires.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-bold">
                {isAr ? 'لا يوجد موظفون جدد تحت التهيئة حالياً' : 'No new hires currently onboarding.'}
              </div>
            ) : (
              newHires.map(h => {
                const progress = calculateProgress(h);
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHireId(h.id)}
                    className={`w-full p-4 rounded-xl flex flex-col gap-2 border transition-all text-start cursor-pointer ${
                      selectedHireId === h.id
                        ? 'bg-[#A11212]/5 border-[#A11212]'
                        : 'bg-white border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h4 className="font-black text-xs text-gray-900">{h.name}</h4>
                        <p className="text-[9px] text-gray-500 font-bold">{h.role} · {h.dept}</p>
                      </div>
                      <span className="text-[9px] font-black text-[#A11212]">{progress}%</span>
                    </div>

                    {/* Micro Progress Bar */}
                    <div className="w-full h-1 bg-gray-150 rounded-full overflow-hidden">
                      <div className="h-full bg-[#A11212] transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Checklist Inspector */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          {selectedHire ? (
            <div className="space-y-6">
              {/* Header profile info */}
              <div className="flex justify-between items-center pb-6 border-b border-gray-100 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#A11212] text-white font-black text-xl rounded-xl flex items-center justify-center">
                    {selectedHire.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-gray-900">{selectedHire.name}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{selectedHire.role} · {selectedHire.dept}</p>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">{selectedHire.email} · {selectedHire.phone}</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Classification</p>
                  <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-205">
                    {selectedHire.employment_type || 'Experienced'}
                  </span>
                </div>
              </div>

              {/* Progress Indicator Card */}
              <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-gray-955">Integration Progress</h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">Check completed items to update status.</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-[#A11212]">{calculateProgress(selectedHire)}%</p>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Setup Tasks Checklist</h4>
                <div className="space-y-2 pt-1">
                  {getTasksList(selectedHire).map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTask(selectedHire.id, t.id)}
                      className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all text-start cursor-pointer ${
                        t.completed ? 'bg-green-50/10 border-green-200' : 'bg-white border-gray-150 hover:border-gray-300'
                      }`}
                    >
                      {t.completed ? (
                        <CheckSquare className="text-green-700 flex-shrink-0" size={16} />
                      ) : (
                        <Square className="text-gray-450 flex-shrink-0" size={16} />
                      )}
                      <span className={`text-xs font-bold ${t.completed ? 'text-green-950 line-through' : 'text-gray-900'}`}>
                        {t.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold py-12">
              Select a new hire onboarding profile from the roster list.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Initialize Onboarding</h3>
              <button type="button" onClick={() => { setShowModal(false); setFormError(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salim Al-Harthy"
                  value={newHireData.name}
                  onChange={(e) => setNewHireData({ ...newHireData, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Designated Position</label>
                  <select
                    value={newHireData.role}
                    onChange={(e) => setNewHireData({ ...newHireData, role: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Senior Auditor">Senior Auditor</option>
                    <option value="Tax Consultant">Tax Consultant</option>
                    <option value="Junior Associate">Junior Associate</option>
                    <option value="custom">+ Add Custom Position...</option>
                  </select>
                  {newHireData.role === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom position..."
                      value={newHireData.customRole}
                      onChange={(e) => setNewHireData({ ...newHireData, customRole: e.target.value })}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                  <select
                    value={newHireData.dept}
                    onChange={(e) => setNewHireData({ ...newHireData, dept: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Audit">Audit</option>
                    <option value="Tax & VAT">Tax & VAT</option>
                    <option value="Accounting">Accounting</option>
                    <option value="custom">+ Add Custom Department...</option>
                  </select>
                  {newHireData.dept === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom department..."
                      value={newHireData.customDept}
                      onChange={(e) => setNewHireData({ ...newHireData, customDept: e.target.value })}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={newHireData.email}
                    onChange={(e) => setNewHireData({ ...newHireData, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+968 9..."
                    value={newHireData.phone}
                    onChange={(e) => setNewHireData({ ...newHireData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employment Start Date</label>
                  <input
                    type="date"
                    required
                    value={newHireData.startDate}
                    onChange={(e) => setNewHireData({ ...newHireData, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employment Classification</label>
                  <select
                    value={newHireData.employment_type}
                    onChange={(e) => setNewHireData({ ...newHireData, employment_type: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Experienced">Experienced</option>
                    <option value="Trainee">Trainee</option>
                    <option value="Worker">Worker</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-2 bg-gray-50/50">
              <button
                type="button"
                onClick={() => { setShowModal(false); setFormError(null); }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors cursor-pointer"
              >
                Initialize Checklist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Notification Modal Card */}
      {notification.show && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-scale-up border border-gray-100">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center ${
              notification.type === 'success' ? 'bg-green-50 text-green-600 animate-bounce' : 'bg-red-50 text-[#A11212]'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {notification.title}
              </h3>
              <p className="text-xs text-gray-505 mt-2 leading-relaxed font-bold">
                {notification.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className={`w-full text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer ${
                  notification.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#A11212] hover:bg-[#800e0e]'
                }`}
              >
                {isAr ? 'حسناً' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
