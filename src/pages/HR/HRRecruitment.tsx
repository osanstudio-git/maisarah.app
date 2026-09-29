import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  UserPlus, Search, ChevronRight, FileText, X, AlertCircle, CheckCircle2,
  ClipboardCheck, Eye, Trash2, AlertTriangle, CheckSquare, Square,
  Building2, Briefcase, Mail, Phone, Calendar, ArrowRight, Sparkles, Filter,
  Layers, ShieldCheck, UserCheck, Clock, Download, UploadCloud
} from 'lucide-react';
import {
  syncRecruitsFromSupabase,
  upsertRecruitToDatabase,
  deleteRecruitFromDatabase,
  updateRecruitStatus,
  getLocalRecruits
} from '../../utils/recruitmentSync';
import { getAllDepartments, getJobPositionsByDepartment } from '../../config/departments';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  dept: string;
  stage: 'cv_received' | 'shortlisted' | 'interview_scheduled' | 'interview_done' | 'offered' | 'on_hold' | 'rejected';
  score: number;
  email: string;
  phone: string;
  civil_id?: string;
  passport_no?: string;
  residency_no?: string;
  nationality?: string;
  dob?: string;
  gender?: string;
  marital_status?: string;
  supervisor?: string;
  resume_name?: string;
  resume_url?: string;
  employment_type?: 'Experienced' | 'Trainee' | 'Worker';
  placement_status?: 'pending_placement' | 'placed' | null;
  onboarding_tasks?: {
    contract_signed: boolean;
    bank_details_submitted: boolean;
    documents_uploaded: boolean;
    it_assets_ready: boolean;
  };
  created_at?: string;
}

const STAGES: { key: Candidate['stage']; labelEn: string; labelAr: string; color: string }[] = [
  { key: 'cv_received', labelEn: 'CVs Received', labelAr: 'استلام السير الذاتية', color: 'bg-blue-500' },
  { key: 'shortlisted', labelEn: 'Shortlisted', labelAr: 'القائمة المختصرة', color: 'bg-indigo-500' },
  { key: 'interview_scheduled', labelEn: 'Interviews', labelAr: 'المقابلات', color: 'bg-amber-500' },
  { key: 'offered', labelEn: 'Offered & Onboarding', labelAr: 'العروض والتهيئة', color: 'bg-emerald-600' }
];

export default function HRRecruitment() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>(() => getLocalRecruits() as Candidate[]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'onboarding'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Modals & Drawers
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [cvFile, setCVFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // Unified Registration Form State
  const [newHire, setNewHire] = useState({
    name: '',
    email: '',
    phone: '',
    civil_id: '',
    nationality: 'Omani',
    gender: 'Male',
    marital_status: 'Single',
    dept: 'Audit',
    role: 'Senior Auditor',
    customDept: '',
    customRole: '',
    employment_type: 'Experienced' as 'Experienced' | 'Trainee' | 'Worker',
    stage: 'offered' as Candidate['stage'], // default to offer/onboarding for direct registrations
    contract_signed: true,
    bank_details_submitted: false,
    documents_uploaded: false,
    it_assets_ready: false
  });

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await syncRecruitsFromSupabase();
      setCandidates(data as Candidate[]);
    } catch (err: any) {
      console.warn('Error fetching recruits:', err);
      setCandidates(getLocalRecruits() as Candidate[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Update specific onboarding task
  const handleToggleTask = async (candidateId: string, taskKey: keyof NonNullable<Candidate['onboarding_tasks']>) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const currentTasks = candidate.onboarding_tasks || {
      contract_signed: false,
      bank_details_submitted: false,
      documents_uploaded: false,
      it_assets_ready: false
    };

    const updatedTasks = {
      ...currentTasks,
      [taskKey]: !currentTasks[taskKey]
    };

    // Optimistic local state update
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, onboarding_tasks: updatedTasks } : c));
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      setSelectedCandidate({ ...selectedCandidate, onboarding_tasks: updatedTasks });
    }

    try {
      await updateRecruitStatus(candidateId, { onboarding_tasks: updatedTasks });
    } catch (err: any) {
      console.warn('Error updating task in database:', err);
    }
  };

  // Move stage (e.g. advance to interview or offer)
  const handleMoveStage = async (id: string, nextStage: Candidate['stage']) => {
    setCandidates(prev => prev.map(c => c.id === id ? {
      ...c,
      stage: nextStage,
      placement_status: nextStage === 'offered' ? 'pending_placement' : c.placement_status
    } : c));

    try {
      await updateRecruitStatus(id, {
        stage: nextStage,
        ...(nextStage === 'offered' ? { placement_status: 'pending_placement' } : {})
      });

      setNotification({
        show: true,
        title: isAr ? 'تم تحديث المرحلة' : 'Candidate Advanced',
        message: isAr
          ? (nextStage === 'offered' ? 'تم نقل المرشح إلى مرحلة التعيين وتوجيهه لاعتماد المدير التنفيذي.' : 'تم تحديث مرحلة المرشح بنجاح.')
          : (nextStage === 'offered' ? 'Candidate placed in Offer & Onboarding queue and routed to Manager.' : 'Stage updated successfully.'),
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في التحديث' : 'Update Failed',
        message: err.message || 'Error updating stage',
        type: 'error'
      });
      fetchCandidates();
    }
  };

  // Unified Registration Submit (Strictly NO email sent)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHire.name.trim() || !newHire.email.trim()) {
      setNotification({
        show: true,
        title: isAr ? 'بيانات ناقصة' : 'Missing Information',
        message: isAr ? 'يرجى إدخال اسم الموظف والبريد الإلكتروني.' : 'Full name and email are required.',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = newHire.email.trim().toLowerCase();
      const cleanName = newHire.name.trim();
      const targetDept = newHire.dept === 'custom' ? newHire.customDept : newHire.dept;
      const targetRole = newHire.role === 'custom' ? newHire.customRole : newHire.role;

      let uploadedResumeUrl: string | null = null;
      if (cvFile) {
        try {
          const fileExt = cvFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1] || res);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(cvFile);
          const base64Data = await base64Promise;

          const { data: edgeUpload } = await supabase.functions.invoke('manage-auth', {
            body: {
              action: 'upload_storage_file',
              bucket: 'resumes',
              file_path: fileName,
              file_base64: base64Data,
              content_type: cvFile.type || 'application/pdf'
            }
          });
          if (edgeUpload?.success && edgeUpload?.url) {
            uploadedResumeUrl = edgeUpload.url;
          }
        } catch { }
      }

      const newId = crypto.randomUUID();
      const payload: Candidate = {
        id: newId,
        name: cleanName,
        email: cleanEmail,
        phone: newHire.phone || '',
        civil_id: newHire.civil_id || '',
        nationality: newHire.nationality || 'Omani',
        gender: newHire.gender || 'Male',
        marital_status: newHire.marital_status || 'Single',
        dept: targetDept || 'Audit',
        role: targetRole || 'Senior Auditor',
        stage: newHire.stage,
        score: 90,
        resume_name: cvFile ? cvFile.name : undefined,
        resume_url: uploadedResumeUrl || undefined,
        employment_type: newHire.employment_type,
        placement_status: 'pending_placement',
        onboarding_tasks: {
          contract_signed: newHire.contract_signed,
          bank_details_submitted: newHire.bank_details_submitted,
          documents_uploaded: newHire.documents_uploaded,
          it_assets_ready: newHire.it_assets_ready
        },
        created_at: new Date().toISOString()
      };

      // Save directly to hr_recruits database
      const saved = await upsertRecruitToDatabase(payload);
      setCandidates(prev => [saved, ...prev.filter(c => c.id !== saved.id)]);

      // Close modal & reset
      setShowRegisterModal(false);
      setCVFile(null);
      setNewHire({
        name: '',
        email: '',
        phone: '',
        civil_id: '',
        nationality: 'Omani',
        gender: 'Male',
        marital_status: 'Single',
        dept: 'Audit',
        role: 'Senior Auditor',
        customDept: '',
        customRole: '',
        employment_type: 'Experienced',
        stage: 'offered',
        contract_signed: true,
        bank_details_submitted: false,
        documents_uploaded: false,
        it_assets_ready: false
      });

      setNotification({
        show: true,
        title: isAr ? 'تم تسجيل الموظف بنجاح' : 'New Hire Dossier Registered',
        message: isAr
          ? `تم حفظ ملف "${cleanName}" وتوجيهه إلى قائمة التسكين لدى المدير التنفيذي.`
          : `Candidate profile for "${cleanName}" registered and forwarded to Manager Placements Queue.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في التسجيل' : 'Registration Error',
        message: err.message || 'Failed to save recruit',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteRecruitFromDatabase(candidateToDelete.id);
      setCandidates(prev => prev.filter(c => c.id !== candidateToDelete.id));
      setCandidateToDelete(null);
      if (selectedCandidate?.id === candidateToDelete.id) {
        setSelectedCandidate(null);
      }
      setNotification({
        show: true,
        title: isAr ? 'تم الحذف' : 'Candidate Removed',
        message: isAr ? 'تم حذف الملف بنجاح.' : 'Candidate profile removed.',
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ' : 'Error',
        message: err.message || 'Failed to delete candidate',
        type: 'error'
      });
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'all' || c.dept?.toLowerCase() === deptFilter.toLowerCase();
    return matchesSearch && matchesDept;
  });

  const offeredHires = filteredCandidates.filter(c => c.stage === 'offered' || c.placement_status === 'pending_placement');

  return (
    <div className="space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed top-6 end-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'success'
            ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/30'
            : 'bg-red-900/95 text-red-100 border-red-500/30'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0" /> : <AlertCircle size={20} className="text-red-400 shrink-0" />}
          <div>
            <p className="text-xs font-black uppercase tracking-wider">{notification.title}</p>
            <p className="text-xs font-semibold mt-0.5 text-white/90">{notification.message}</p>
          </div>
        </div>
      )}

      {/* ── Header & Action Banner ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white to-gray-50/80 p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#A11212]/10 text-[#A11212] text-[10px] font-black uppercase tracking-widest rounded-full">
                {isAr ? 'إدارة المواهب والتوظيف' : 'Talent Acquisition & Onboarding'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
                <ShieldCheck size={14} className="text-emerald-500" />
                {isAr ? 'نظام التسجيل الموحد' : 'Unified HR Workflow'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {isAr ? 'استقطاب وتعيين الموظفين' : 'HR Recruitment & Onboarding Hub'}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
              {isAr
                ? 'سجل بيانات المرشحين الجدد وتحقق من متطلبات التهيئة والتسكين تمهيداً لاعتمادها وتوجيهها للمدير التنفيذي.'
                : 'Consolidated portal to screen talent, verify onboarding prerequisites, and submit dossiers to Executive Management for placement.'}
            </p>
          </div>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center justify-center gap-2.5 bg-[#A11212] hover:bg-[#850e0e] text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-[#A11212]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <UserPlus size={18} />
            <span>{isAr ? 'تسجيل مرشح / تعيين موظف' : 'Register New Hire'}</span>
          </button>
        </div>

        {/* Metric Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{isAr ? 'إجمالي المتقدمين' : 'Total Candidates'}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{candidates.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{isAr ? 'قيد الفرز والمقابلة' : 'Screening & Interviews'}</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">
              {candidates.filter(c => c.stage === 'shortlisted' || c.stage === 'interview_scheduled').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{isAr ? 'جاهزون للتهيئة' : 'Offered & Onboarding'}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{offeredHires.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{isAr ? 'بانتظار اعتماد المدير' : 'Manager Placements'}</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {candidates.filter(c => c.placement_status === 'pending_placement').length}
            </p>
          </div>
        </div>
      </div>

      {/* ── View Mode Controls & Filters ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        {/* View Switcher Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'pipeline'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers size={15} />
            <span>{isAr ? 'مسار الاستقطاب (Pipeline)' : 'Recruitment Pipeline'}</span>
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black transition-all ${
              activeTab === 'onboarding'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <UserCheck size={15} />
            <span>{isAr ? 'قائمة التهيئة والتسكين' : 'Onboarding & Placements'}</span>
            {offeredHires.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                {offeredHires.length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Dept Filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو التخصص...' : 'Search candidates...'}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl ps-9 pe-4 py-2 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#A11212]"
            />
          </div>

          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#A11212]"
          >
            <option value="all">{isAr ? 'جميع الأقسام' : 'All Departments'}</option>
            {getAllDepartments().map(d => (
              <option key={d.id} value={d.name}>{isAr ? d.nameAr : d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── TAB 1: PIPELINE BOARD VIEW ──────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map(stageObj => {
            const stageCandidates = filteredCandidates.filter(c => c.stage === stageObj.key);
            return (
              <div key={stageObj.key} className="bg-gray-50/70 rounded-3xl p-4 border border-gray-100 flex flex-col min-h-[500px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stageObj.color}`} />
                    <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                      {isAr ? stageObj.labelAr : stageObj.labelEn}
                    </h3>
                  </div>
                  <span className="bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {stageCandidates.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] scrollbar-hide">
                  {stageCandidates.length === 0 ? (
                    <div className="h-36 flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-200 rounded-2xl bg-white/40">
                      <p className="text-xs font-bold text-gray-400">{isAr ? 'لا يوجد مرشحون' : 'No candidates'}</p>
                    </div>
                  ) : (
                    stageCandidates.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCandidate(c)}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md hover:border-[#A11212]/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-black text-sm text-gray-900 group-hover:text-[#A11212] transition-colors">
                            {c.name}
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                            {c.dept || 'Audit'}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-gray-500 mb-3">{c.role}</p>

                        <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-50 pt-2 mt-2">
                          <span className="flex items-center gap-1 font-semibold">
                            <Mail size={12} /> {c.email}
                          </span>
                        </div>

                        {/* Onboarding preview indicator for offered stage */}
                        {c.stage === 'offered' && c.onboarding_tasks && (
                          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                            <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {isAr ? 'جاهز للتسكين' : 'Pending Placement'}
                            </span>
                            <span className="text-gray-400 font-bold">
                              {Object.values(c.onboarding_tasks).filter(Boolean).length}/4 tasks
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: ONBOARDING & PLACEMENTS ROSTER ────────────────────────── */}
      {activeTab === 'onboarding' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
            <div>
              <h3 className="text-base font-black text-gray-900">
                {isAr ? 'قائمة المرشحين المؤهلين للتهيئة والتعيين' : 'New Hire Onboarding & Placements Queue'}
              </h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                {isAr
                  ? 'تحقق من اكتمال المستندات وتأكيد جاهزية ملف الموظف قبل اعتماد التعيين لدى المدير.'
                  : 'Track task readiness for accepted candidates before final allocation in Manager Portal.'}
              </p>
            </div>
            <span className="text-xs font-black text-[#A11212] bg-[#A11212]/10 px-3 py-1.5 rounded-full self-start sm:self-auto">
              {offeredHires.length} {isAr ? 'موظف جاهز' : 'Candidates in Queue'}
            </span>
          </div>

          {offeredHires.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <UserCheck size={28} />
              </div>
              <h4 className="text-sm font-black text-gray-700">{isAr ? 'لا توجد تعيينات قيد الانتظار' : 'No Onboarding Hires Currently'}</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {isAr
                  ? 'عند نقل أي مرشح إلى مرحلة العرض أو تسجيل موظف جديد، سيظهر مباشرة في هذه القائمة.'
                  : 'When candidates are offered a position or registered, they will appear here with their onboarding checklist.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {offeredHires.map(c => {
                const tasks = c.onboarding_tasks || {
                  contract_signed: false,
                  bank_details_submitted: false,
                  documents_uploaded: false,
                  it_assets_ready: false
                };
                const completedCount = Object.values(tasks).filter(Boolean).length;

                return (
                  <div key={c.id} className="p-6 hover:bg-gray-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Candidate Info */}
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-base text-gray-900">{c.name}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {c.placement_status === 'placed' ? (isAr ? 'تم التسكين' : 'Placed') : (isAr ? 'بانتظار المدير' : 'Awaiting Placement')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 mb-2">
                        {c.role} • <span className="text-[#A11212]">{c.dept}</span> • {c.employment_type || 'Experienced'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-semibold">
                        <span className="flex items-center gap-1"><Mail size={13} /> {c.email}</span>
                        {c.phone && <span className="flex items-center gap-1"><Phone size={13} /> {c.phone}</span>}
                        {c.civil_id && <span className="flex items-center gap-1"><ShieldCheck size={13} /> ID: {c.civil_id}</span>}
                      </div>
                    </div>

                    {/* Interactive Onboarding Checklist */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <button
                        onClick={() => handleToggleTask(c.id, 'contract_signed')}
                        className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold text-start transition-all ${
                          tasks.contract_signed ? 'bg-emerald-100/70 text-emerald-900 font-black' : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {tasks.contract_signed ? <CheckSquare size={14} className="text-emerald-600 shrink-0" /> : <Square size={14} className="text-gray-400 shrink-0" />}
                        <span>{isAr ? 'توقيع العقد' : 'Signed Contract'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleTask(c.id, 'bank_details_submitted')}
                        className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold text-start transition-all ${
                          tasks.bank_details_submitted ? 'bg-emerald-100/70 text-emerald-900 font-black' : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {tasks.bank_details_submitted ? <CheckSquare size={14} className="text-emerald-600 shrink-0" /> : <Square size={14} className="text-gray-400 shrink-0" />}
                        <span>{isAr ? 'البيانات البنكية' : 'Bank Details'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleTask(c.id, 'documents_uploaded')}
                        className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold text-start transition-all ${
                          tasks.documents_uploaded ? 'bg-emerald-100/70 text-emerald-900 font-black' : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {tasks.documents_uploaded ? <CheckSquare size={14} className="text-emerald-600 shrink-0" /> : <Square size={14} className="text-gray-400 shrink-0" />}
                        <span>{isAr ? 'المستندات الرسمية' : 'ID & Docs'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleTask(c.id, 'it_assets_ready')}
                        className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold text-start transition-all ${
                          tasks.it_assets_ready ? 'bg-emerald-100/70 text-emerald-900 font-black' : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {tasks.it_assets_ready ? <CheckSquare size={14} className="text-emerald-600 shrink-0" /> : <Square size={14} className="text-gray-400 shrink-0" />}
                        <span>{isAr ? 'تجهيز الأجهزة' : 'IT Assets'}</span>
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCandidate(c)}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
                      >
                        {isAr ? 'عرض الملف' : 'View Dossier'}
                      </button>
                      <button
                        onClick={() => setCandidateToDelete(c)}
                        className="p-2.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: UNIFIED CANDIDATE / NEW HIRE REGISTRATION ────────── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden my-8" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {isAr ? 'تسجيل موظف / مرشح جديد' : 'Register New Candidate / Hire'}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {isAr ? 'أدخل البيانات الأساسية لتوجيه الملف مباشرة إلى قائمة التعيينات لدى المدير.' : 'Enter employee dossier details to route directly to Manager Placements.'}
                </p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#A11212] mb-3">
                  {isAr ? '1. البيانات الشخصية' : '1. Personal Information'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newHire.name}
                      onChange={e => setNewHire({ ...newHire, name: e.target.value })}
                      placeholder={isAr ? 'مثال: أحمد الحارثي' : 'e.g. Ahmed Al-Harthy'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'البريد الإلكتروني *' : 'Corporate Email *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={newHire.email}
                      onChange={e => setNewHire({ ...newHire, email: e.target.value })}
                      placeholder="employee@maisarah.om"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'رقم الهاتف' : 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      value={newHire.phone}
                      onChange={e => setNewHire({ ...newHire, phone: e.target.value })}
                      placeholder="+968 9123 4567"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'الرقم المدني / الجواز' : 'Civil ID / Passport'}
                    </label>
                    <input
                      type="text"
                      value={newHire.civil_id}
                      onChange={e => setNewHire({ ...newHire, civil_id: e.target.value })}
                      placeholder="12345678"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    />
                  </div>
                </div>
              </div>

              {/* Department & Position */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#A11212] mb-3">
                  {isAr ? '2. القسم والمسمى الوظيفي المقترح' : '2. Proposed Department & Role'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'القسم' : 'Department'}
                    </label>
                    <select
                      value={newHire.dept}
                      onChange={e => {
                        const val = e.target.value;
                        const pos = getJobPositionsByDepartment(val);
                        setNewHire({
                          ...newHire,
                          dept: val,
                          role: pos[0] || 'Senior Associate'
                        });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    >
                      {getAllDepartments().map(d => (
                        <option key={d.id} value={d.name}>{isAr ? d.nameAr : d.name}</option>
                      ))}
                      <option value="custom">{isAr ? '+ قسم مخصص...' : '+ Custom Department...'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'المسمى الوظيفي' : 'Job Title'}
                    </label>
                    <select
                      value={newHire.role}
                      onChange={e => setNewHire({ ...newHire, role: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    >
                      {getJobPositionsByDepartment(newHire.dept).map((pos, idx) => (
                        <option key={idx} value={pos}>{pos}</option>
                      ))}
                      <option value="custom">{isAr ? '+ مسمى مخصص...' : '+ Custom Title...'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'تصنيف التوظيف' : 'Employment Type'}
                    </label>
                    <select
                      value={newHire.employment_type}
                      onChange={e => setNewHire({ ...newHire, employment_type: e.target.value as any })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#A11212]"
                    >
                      <option value="Experienced">{isAr ? 'خبرة (Experienced)' : 'Experienced'}</option>
                      <option value="Trainee">{isAr ? 'متدرب (Trainee)' : 'Trainee'}</option>
                      <option value="Worker">{isAr ? 'عامل / دعم (Worker)' : 'Worker'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">
                      {isAr ? 'السيرة الذاتية / CV (اختياري)' : 'Resume / CV (Optional)'}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={e => setCVFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-[#A11212] file:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Onboarding Pre-Checks */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
                  {isAr ? '3. الفحوصات الأولية للتهيئة' : '3. Initial Onboarding Pre-Checks'}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={newHire.contract_signed}
                      onChange={e => setNewHire({ ...newHire, contract_signed: e.target.checked })}
                      className="rounded text-[#A11212] focus:ring-0"
                    />
                    <span>{isAr ? 'توقيع عرض العمل / العقد' : 'Offer / Contract Signed'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={newHire.bank_details_submitted}
                      onChange={e => setNewHire({ ...newHire, bank_details_submitted: e.target.checked })}
                      className="rounded text-[#A11212] focus:ring-0"
                    />
                    <span>{isAr ? 'استلام البيانات البنكية' : 'Bank Details Submitted'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={newHire.documents_uploaded}
                      onChange={e => setNewHire({ ...newHire, documents_uploaded: e.target.checked })}
                      className="rounded text-[#A11212] focus:ring-0"
                    />
                    <span>{isAr ? 'استلام بطاقة الهوية / الجواز' : 'ID & Passport Uploaded'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={newHire.it_assets_ready}
                      onChange={e => setNewHire({ ...newHire, it_assets_ready: e.target.checked })}
                      className="rounded text-[#A11212] focus:ring-0"
                    />
                    <span>{isAr ? 'طلب الحاسب / الأصول' : 'IT Assets Requested'}</span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#A11212] hover:bg-[#850e0e] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#A11212]/20 disabled:opacity-50"
                >
                  {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving Dossier...') : (isAr ? 'حفظ وتوجيه للمدير' : 'Save & Forward to Manager')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CANDIDATE DOSSIER DRAWER ─────────────────────────── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#A11212]/10 text-[#A11212] font-black flex items-center justify-center text-sm">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">{selectedCandidate.name}</h3>
                  <p className="text-xs font-bold text-gray-500">{selectedCandidate.role} • {selectedCandidate.dept}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'البريد' : 'Email'}</p>
                  <p className="font-bold text-gray-900">{selectedCandidate.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'الهاتف' : 'Phone'}</p>
                  <p className="font-bold text-gray-900">{selectedCandidate.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'المرحلة' : 'Stage'}</p>
                  <p className="font-bold text-[#A11212] uppercase">{selectedCandidate.stage}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{isAr ? 'حالة التسكين' : 'Placement Status'}</p>
                  <p className="font-bold text-emerald-700">{selectedCandidate.placement_status || 'Pending'}</p>
                </div>
              </div>

              {/* CV Download / View */}
              {selectedCandidate.resume_url && (
                <div className="flex items-center justify-between p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                    <FileText size={16} className="text-indigo-600" />
                    <span>{selectedCandidate.resume_name || 'Resume / CV Document'}</span>
                  </div>
                  <a
                    href={selectedCandidate.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Download size={13} /> {isAr ? 'تحميل' : 'View'}
                  </a>
                </div>
              )}

              {/* Stage Progression Actions */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">
                  {isAr ? 'ترقية المرحلة' : 'Advance Pipeline Stage'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => {
                        handleMoveStage(selectedCandidate.id, s.key);
                        setSelectedCandidate(null);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedCandidate.stage === s.key
                          ? 'bg-[#A11212] text-white font-black'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isAr ? s.labelAr : s.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setCandidateToDelete(selectedCandidate);
                  setSelectedCandidate(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 p-2"
              >
                <Trash2 size={14} />
                <span>{isAr ? 'حذف المرشح' : 'Delete Candidate'}</span>
              </button>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black"
              >
                {isAr ? 'إغلاق' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DELETE CONFIRMATION ──────────────────────────────── */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-base text-gray-900">{isAr ? 'تأكيد الحذف' : 'Confirm Removal'}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {isAr
                  ? `هل أنت متأكد من حذف ملف "${candidateToDelete.name}" نهائياً من قاعدة البيانات؟`
                  : `Are you sure you want to permanently remove "${candidateToDelete.name}"?`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCandidateToDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteCandidate}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-black text-xs"
              >
                {isAr ? 'حذف نهائي' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
