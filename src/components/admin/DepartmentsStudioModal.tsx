import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Plus, Check, Edit2, Trash2, Layers, Briefcase, Calendar,
  Clock, Shield, ArrowRight, RefreshCw, Sparkles, Building2,
  CheckCircle2, AlertCircle, Share2, DollarSign, Settings2,
  Calculator, BookOpen, FileCheck, Lightbulb, ChevronRight
} from 'lucide-react';
import {
  fetchAllDepartments,
  saveDepartment,
  fetchDepartmentStages,
  saveDepartmentStage,
  fetchDepartmentRoles,
  saveDepartmentRole
} from '../../services/departmentService';
import {
  getAllDepartments,
  type DepartmentConfig,
  type DepartmentStage,
  type DepartmentRole,
  type CycleType
} from '../../config/departments';

interface DepartmentsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepartmentUpdated?: () => void;
}

export const DepartmentsStudioModal: React.FC<DepartmentsStudioModalProps> = ({
  isOpen,
  onClose,
  onDepartmentUpdated
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'departments' | 'stages' | 'roles'>('departments');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('tax_vat');

  // Edit / Create Department Modal state
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [deptForm, setDeptForm] = useState<Partial<DepartmentConfig>>({
    id: '',
    name: '',
    name_ar: '',
    head_title: '',
    head_title_ar: '',
    duty: '',
    duty_ar: '',
    cycle_type: 'custom',
    color: '#6366F1',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: []
  });

  // Stage form state
  const [deptStages, setDeptStages] = useState<DepartmentStage[]>([]);
  const [newStage, setNewStage] = useState<{ name_en: string; name_ar: string; deadline_rule: string; requires_approval: boolean }>({
    name_en: '',
    name_ar: '',
    deadline_rule: '',
    requires_approval: false
  });

  // Role form state
  const [deptRoles, setDeptRoles] = useState<DepartmentRole[]>([]);
  const [newRole, setNewRole] = useState<{ title_en: string; title_ar: string; access_role: string }>({
    title_en: '',
    title_ar: '',
    access_role: 'employee'
  });

  const [savingNotice, setSavingNotice] = useState<string | null>(null);

  // Load departments
  const loadData = async () => {
    setLoading(true);
    const list = await fetchAllDepartments();
    setDepartments(list);
    if (list.length > 0 && !selectedDeptId) {
      setSelectedDeptId(list[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Load stages & roles when selectedDeptId changes
  useEffect(() => {
    if (selectedDeptId) {
      fetchDepartmentStages(selectedDeptId).then(setDeptStages);
      fetchDepartmentRoles(selectedDeptId).then(setDeptRoles);
    }
  }, [selectedDeptId]);

  if (!isOpen) return null;

  const currentSelectedDept = departments.find(d => d.id === selectedDeptId) || departments[0];

  const handleOpenEditDept = (dept?: DepartmentConfig) => {
    if (dept) {
      setDeptForm({ ...dept });
    } else {
      setDeptForm({
        id: '',
        name: '',
        name_ar: '',
        head_title: '',
        head_title_ar: '',
        duty: '',
        duty_ar: '',
        cycle_type: 'custom',
        color: '#A11212',
        enable_cross_handoff: true,
        allowed_handoff_dept_ids: []
      });
    }
    setIsEditingDept(true);
  };

  const handleSaveDeptForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.id || !deptForm.name) return;

    const formattedId = deptForm.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const completeDept: DepartmentConfig = {
      id: formattedId,
      name: deptForm.name,
      name_ar: deptForm.name_ar || deptForm.name,
      head_title: deptForm.head_title || 'Head of Department',
      head_title_ar: deptForm.head_title_ar || 'رئيس القسم',
      duty: deptForm.duty || '',
      duty_ar: deptForm.duty_ar || deptForm.duty || '',
      cycle_type: (deptForm.cycle_type as CycleType) || 'custom',
      color: deptForm.color || '#A11212',
      icon: deptForm.icon || 'Briefcase',
      enable_cross_handoff: deptForm.enable_cross_handoff ?? true,
      allowed_handoff_dept_ids: deptForm.allowed_handoff_dept_ids || [],
      job_positions: deptForm.job_positions || [],
      stages: deptForm.stages || [],
      services: deptForm.services || [],
      kpis: deptForm.kpis || [],
      extra_features: deptForm.extra_features || []
    };

    await saveDepartment(completeDept);
    setSavingNotice(isAr ? 'تم حفظ وتحديث بيانات القسم بنجاح' : 'Department saved successfully');
    setTimeout(() => setSavingNotice(null), 3000);
    setIsEditingDept(false);
    await loadData();
    onDepartmentUpdated?.();
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStage.name_en && !newStage.name_ar) return;

    const nextStepNum = deptStages.length + 1;
    const stageObj: DepartmentStage = {
      step_number: nextStepNum,
      name_en: newStage.name_en || newStage.name_ar,
      name_ar: newStage.name_ar || newStage.name_en,
      deadline_rule: newStage.deadline_rule,
      requires_approval: newStage.requires_approval
    };

    await saveDepartmentStage(selectedDeptId, stageObj);
    setDeptStages(prev => [...prev, stageObj]);
    setNewStage({ name_en: '', name_ar: '', deadline_rule: '', requires_approval: false });
    setSavingNotice(isAr ? 'تمت إضافة المرحلة بنجاح' : 'Stage added successfully');
    setTimeout(() => setSavingNotice(null), 3000);
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.title_en && !newRole.title_ar) return;

    const roleObj: DepartmentRole = {
      title_en: newRole.title_en || newRole.title_ar,
      title_ar: newRole.title_ar || newRole.title_en,
      access_role: newRole.access_role
    };

    await saveDepartmentRole(selectedDeptId, roleObj);
    setDeptRoles(prev => [...prev, roleObj]);
    setNewRole({ title_en: '', title_ar: '', access_role: 'employee' });
    setSavingNotice(isAr ? 'تمت إضافة المسمى الوظيفي بنجاح' : 'Role title added successfully');
    setTimeout(() => setSavingNotice(null), 3000);
  };

  const getCycleBadge = (type: CycleType) => {
    switch (type) {
      case 'quarterly':
        return <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Quarterly (ربع سنوي)</span>;
      case 'monthly':
        return <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Monthly (شهري 5-25)</span>;
      case 'engagement':
        return <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-orange-50 text-orange-700 border border-orange-200">Engagement (مراحل تعاقد)</span>;
      case 'yearly':
        return <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-sky-50 text-sky-700 border border-sky-200">Yearly / 120-Day (سنوي)</span>;
      case 'project':
        return <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-amber-50 text-amber-700 border border-amber-200">Project-Based (مشروعات)</span>;
      case 'case_govt':
        return <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-rose-50 text-rose-700 border border-rose-200">Case-Govt (إجراءات حكومية)</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-gray-100 text-gray-700 border border-gray-200">Custom (مخصص)</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-100 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-red-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#A11212] flex items-center justify-center text-white shadow-lg shadow-[#A11212]/30">
              <Layers size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">
                  {isAr ? 'استوديو إدارة الأقسام والخدمات' : 'Departments & Services Studio'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                  Admin System
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-0.5">
                {isAr 
                  ? 'التحكم الديناميكي الكامل في الأقسام، الأدوار، المراحل، وخيارات الربط بين البوابات'
                  : 'Manage departments, workflow cycles, roles, and inter-department handoff settings'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Save Notice Banner */}
        {savingNotice && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-6 py-2.5 flex items-center gap-2 shrink-0 animate-fade-in">
            <CheckCircle2 size={16} />
            <span>{savingNotice}</span>
          </div>
        )}

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'departments'
                ? 'border-[#A11212] text-[#A11212] bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building2 size={16} />
            <span>{isAr ? '1. جميع الأقسام والربط' : '1. Departments & Handoffs'}</span>
          </button>

          <button
            onClick={() => setActiveTab('stages')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'stages'
                ? 'border-[#A11212] text-[#A11212] bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock size={16} />
            <span>{isAr ? '2. مراحل دورات العمل' : '2. Workflow Stages & Milestones'}</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'border-[#A11212] text-[#A11212] bg-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Briefcase size={16} />
            <span>{isAr ? '3. المسميات والوظائف' : '3. Job Positions & Roles'}</span>
          </button>
        </div>

        {/* Tab 1: Departments List */}
        {activeTab === 'departments' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-gray-900">
                  {isAr ? 'الأقسام التشغيلية المفعلة في النظام' : 'Active Operational Departments'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isAr ? 'كل قسم يمتلك نوع دورة عمل محددة وبوابة متكيفة لموظفيه' : 'Each department drives its specific operational portal'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEditDept()}
                className="px-4 py-2 bg-[#A11212] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:bg-red-800 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>{isAr ? 'إضافة قسم جديد' : 'Create New Department'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map(dept => {
                const isSelected = dept.id === selectedDeptId;
                return (
                  <div
                    key={dept.id}
                    className={`p-5 rounded-2xl border transition-all relative ${
                      isSelected 
                        ? 'border-[#A11212] bg-red-50/10 shadow-md ring-2 ring-[#A11212]/10' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: dept.color || '#A11212' }}
                        >
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-gray-900">
                            {isAr ? dept.name_ar || dept.name : dept.name}
                          </h4>
                          <span className="text-[11px] text-gray-500 font-mono">
                            ID: {dept.id}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditDept(dept)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                        title="Edit Department"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {isAr ? dept.duty_ar || dept.duty : dept.duty}
                    </p>

                    <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-gray-100">
                      {getCycleBadge(dept.cycle_type)}

                      {/* Handoff Connection Badge */}
                      {dept.enable_cross_handoff ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Share2 size={11} />
                          <span>{isAr ? 'الربط التلقائي مفعل' : 'Cross-Handoff ON'}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {isAr ? 'مستقل (بدون ربط)' : 'Standalone'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeptId(dept.id);
                          setActiveTab('stages');
                        }}
                        className="text-[11px] font-black text-[#A11212] hover:underline ml-auto flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isAr ? 'إدارة المراحل' : 'Manage Stages'}</span>
                        <ChevronRight size={12} className={isAr ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Stages & Workflow Milestones */}
        {activeTab === 'stages' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Department Selector */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-700">
                  {isAr ? 'اختر القسم لتخصيص مراحله:' : 'Select Department to configure stages:'}
                </span>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A11212]"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {isAr ? d.name_ar || d.name : d.name} ({d.cycle_type})
                    </option>
                  ))}
                </select>
              </div>

              {currentSelectedDept && getCycleBadge(currentSelectedDept.cycle_type)}
            </div>

            {/* Stages Timeline */}
            <div>
              <h4 className="font-black text-xs text-gray-700 uppercase tracking-wider mb-3">
                {isAr ? 'المراحل المجدولة للقسم حالياً' : 'Current Scheduled Stages & Milestones'}
              </h4>

              {deptStages.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500 text-xs">
                  {isAr ? 'لا توجد مراحل مسجلة لهذا القسم حالياً.' : 'No stages configured for this department yet.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {deptStages.map((st, idx) => (
                    <div 
                      key={idx}
                      className="p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-800 font-black text-xs flex items-center justify-center">
                          {st.step_number || idx + 1}
                        </span>
                        <div>
                          <p className="font-black text-xs text-gray-900">
                            {isAr ? st.name_ar || st.name_en : st.name_en}
                          </p>
                          {st.deadline_rule && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {isAr ? `الموعد: ${st.deadline_rule}` : `Deadline: ${st.deadline_rule}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {st.requires_approval && (
                        <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Shield size={12} />
                          <span>{isAr ? 'يتطلب اعتماد المدير' : 'Requires Approval'}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Stage Form */}
            <form onSubmit={handleAddStage} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <h5 className="font-black text-xs text-gray-800">
                {isAr ? '+ إضافة مرحلة أو خطوة جديدة' : '+ Add New Stage / Step'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder={isAr ? 'اسم المرحلة بالعربية' : 'Stage name (Arabic)'}
                  value={newStage.name_ar}
                  onChange={(e) => setNewStage({ ...newStage, name_ar: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder={isAr ? 'اسم المرحلة بالإنجليزية' : 'Stage name (English)'}
                  value={newStage.name_en}
                  onChange={(e) => setNewStage({ ...newStage, name_en: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder={isAr ? 'الموعد النهائي (مثال: By 15th, 1-2 wks)' : 'Deadline rule (e.g. By 15th, 1-2 wks)'}
                  value={newStage.deadline_rule}
                  onChange={(e) => setNewStage({ ...newStage, deadline_rule: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={newStage.requires_approval}
                    onChange={(e) => setNewStage({ ...newStage, requires_approval: e.target.checked })}
                    className="rounded text-[#A11212] focus:ring-[#A11212]"
                  />
                  <span>{isAr ? 'تتطلب هذه الخطوة اعتماد رئيس القسم' : 'Require Manager Approval'}</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                >
                  {isAr ? 'حفظ المرحلة' : 'Add Stage'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Roles & Positions */}
        {activeTab === 'roles' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Department Selector */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-700">
                  {isAr ? 'اختر القسم لإدارة المسميات:' : 'Select Department to manage roles:'}
                </span>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A11212]"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {isAr ? d.name_ar || d.name : d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Roles List */}
            <div className="space-y-2.5">
              {deptRoles.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500 text-xs">
                  {isAr ? 'لا توجد مسميات وظيفية مسجلة.' : 'No roles configured yet.'}
                </div>
              ) : (
                deptRoles.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <p className="font-black text-xs text-gray-900">
                        {isAr ? role.title_ar || role.title_en : role.title_en}
                      </p>
                      <span className="text-[11px] text-gray-400">
                        {role.title_en}
                      </span>
                    </div>

                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-gray-100 text-gray-700">
                      Role: {role.access_role || 'employee'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Add Role Form */}
            <form onSubmit={handleAddRole} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <h5 className="font-black text-xs text-gray-800">
                {isAr ? '+ إضافة مسمى وظيفي جديد' : '+ Add New Job Position'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder={isAr ? 'المسمى بالعربية (مثال: مدقق أول)' : 'Job title in Arabic'}
                  value={newRole.title_ar}
                  onChange={(e) => setNewRole({ ...newRole, title_ar: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder={isAr ? 'المسمى بالإنجليزية (مثال: Senior Auditor)' : 'Job title in English'}
                  value={newRole.title_en}
                  onChange={(e) => setNewRole({ ...newRole, title_en: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                />
                <select
                  value={newRole.access_role}
                  onChange={(e) => setNewRole({ ...newRole, access_role: e.target.value })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  <option value="employee">Staff / Employee</option>
                  <option value="department_head">Department Head</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                >
                  {isAr ? 'إضافة المسمى الوظيفي' : 'Add Position'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400">
            {isAr ? 'كل التعديلات تطبق فورياً على البوابات المخصصة للموظفين' : 'All modifications update employee portals dynamically'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl text-xs font-bold text-gray-800 transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      {/* ── SUB-MODAL: CREATE / EDIT DEPARTMENT ─────────────────── */}
      {isEditingDept && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden my-8" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#A11212] text-white flex items-center justify-center font-black shadow-md shadow-[#A11212]/20">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {deptForm.id ? (isAr ? 'تعديل إعدادات القسم' : 'Edit Department') : (isAr ? 'إنشاء قسم تشغيلي جديد' : 'Create Department')}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {isAr ? 'تحديد نوع الدورة التشغيلية وخيارات الربط' : 'Configure operational cycle and cross-portal handoffs'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingDept(false)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDeptForm} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'معرف القسم (ID/Slug)' : 'Department ID'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. tax_vat, audit"
                    value={deptForm.id}
                    onChange={(e) => setDeptForm({ ...deptForm, id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'لون القسم' : 'Theme Color'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={deptForm.color || '#A11212'}
                      onChange={(e) => setDeptForm({ ...deptForm, color: e.target.value })}
                      className="w-9 h-9 p-0.5 border border-gray-200 rounded-xl cursor-pointer"
                    />
                    <span className="text-xs font-mono text-gray-600">{deptForm.color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'اسم القسم (عربي)' : 'Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الضرائب والقيمة المضافة"
                    value={deptForm.name_ar}
                    onChange={(e) => setDeptForm({ ...deptForm, name_ar: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {isAr ? 'اسم القسم (إنجليزي)' : 'Name (English)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tax & VAT"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Cycle Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'نوع دورة العمل (تحدد شكل بوابة الموظفين)' : 'Operational Cycle Type (Drives Portal Layout)'}
                </label>
                <select
                  value={deptForm.cycle_type}
                  onChange={(e) => setDeptForm({ ...deptForm, cycle_type: e.target.value as CycleType })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                >
                  <option value="quarterly">Quarterly Cycle (الربع سنوي - مثل القيمة المضافة Q1-Q4)</option>
                  <option value="monthly">Monthly Cycle (شهري دوري - مثل مسك الدفاتر 5 إلى 25)</option>
                  <option value="engagement">Engagement Stages (مراحل التعاقد - مثل التدقيق 1 إلى 6)</option>
                  <option value="yearly">Yearly / Post-FY (سنوي - مثل ضريبة الدخل والـ 120 يوماً)</option>
                  <option value="project">Project-Based (مشروعات محددة - مثل الاستشارات والجدوى)</option>
                  <option value="case_govt">Case / Government (إجراءات حكومية - مثل التصفية)</option>
                  <option value="custom">Custom / Freeform (مخصص بدون دورة ثابتة)</option>
                </select>
              </div>

              {/* Cross-Department Connection Toggle */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={deptForm.enable_cross_handoff}
                    onChange={(e) => setDeptForm({ ...deptForm, enable_cross_handoff: e.target.checked })}
                    className="rounded text-[#A11212] focus:ring-[#A11212]"
                  />
                  <span>
                    {isAr 
                      ? 'تفعيل خيار الربط والتحويل التلقائي مع الأقسام الأخرى (Cross-Portal Handoff)' 
                      : 'Enable Cross-Portal Handoff (Connected Mode)'}
                  </span>
                </label>
                <p className="text-[11px] text-gray-500">
                  {isAr 
                    ? 'في حال إلغاء التحديد، سيعمل القسم بشكل مستقل تماماً دون الحاجة للربط بين الأقسام.' 
                    : 'If unchecked, this department will run purely standalone with no handoff dependencies.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditingDept(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#A11212] text-white rounded-xl text-xs font-black shadow-md hover:bg-red-800 transition-colors"
                >
                  {isAr ? 'حفظ القسم' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsStudioModal;
