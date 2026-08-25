import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import {
  UserPlus, Search, ChevronRight, FileText, X, AlertCircle, CheckCircle2, ClipboardCheck, Eye, Trash2, AlertTriangle
} from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  role: string;
  dept: string;
  stage: 'cv_received' | 'shortlisted' | 'interview_scheduled' | 'interview_done' | 'offered' | 'on_hold' | 'rejected';
  score: number;
  email: string;
  phone: string;
  resume_name?: string;
  resume_url?: string;
  employment_type?: 'Experienced' | 'Trainee' | 'Worker';
  onboarding_tasks?: {
    contract_signed: boolean;
    bank_details_submitted: boolean;
    documents_uploaded: boolean;
    it_assets_ready: boolean;
  };
  created_at?: string;
}

export default function HRRecruitment() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, score

  // Drag over stage monitoring to highlight valid drop columns
  const [activeDragStage, setActiveDragStage] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'onboarding'>('details');
  const [showCVPreview, setShowCVPreview] = useState(false);
  const [cvFile, setCVFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: string; nextStage: Candidate['stage'] } | null>(null);
  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  const [newCandidate, setNewCandidate] = useState({
    name: '',
    role: 'Senior Auditor',
    dept: 'Audit',
    score: 0, // Default to 0 (Pending) when receiving CV
    email: '',
    phone: '',
    employment_type: 'Experienced' as 'Experienced' | 'Trainee' | 'Worker',
    customRole: '',
    customDept: '',
    stage: 'cv_received' as Candidate['stage']
  });

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_recruits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (err: any) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      const { error } = await supabase
        .from('hr_recruits')
        .delete()
        .eq('id', candidateToDelete.id);
        
      if (error) throw error;
      
      setCandidates(prev => prev.filter(c => c.id !== candidateToDelete.id));
      setCandidateToDelete(null);
      
      setNotification({
        show: true,
        title: isAr ? 'تم الحذف' : 'Candidate Deleted',
        message: isAr 
          ? 'تم حذف بيانات المرشح بنجاح من قاعدة البيانات.' 
          : 'Candidate profile permanently removed from the system.',
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في الحذف' : 'Deletion Error',
        message: err.message || 'Error deleting candidate',
        type: 'error'
      });
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Sync tab selection with candidate changes
  useEffect(() => {
    if (selectedCandidate && selectedCandidate.stage !== 'offered') {
      setModalTab('details');
    }
  }, [selectedCandidate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      let uploadedUrl: string | null = null;
      if (cvFile) {
        try {
          const fileExt = cvFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(filePath, cvFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.warn('Storage upload error (using local blob URL fallback):', uploadError);
            uploadedUrl = URL.createObjectURL(cvFile);
          } else {
            const { data } = supabase.storage
              .from('resumes')
              .getPublicUrl(filePath);
            uploadedUrl = data.publicUrl;
          }
        } catch (storageErr) {
          console.warn('Supabase storage upload failed, using local object URL fallback:', storageErr);
          uploadedUrl = URL.createObjectURL(cvFile);
        }
      }

      const payload = {
        name: newCandidate.name,
        role: newCandidate.role === 'custom' ? newCandidate.customRole : newCandidate.role,
        dept: newCandidate.dept === 'custom' ? newCandidate.customDept : newCandidate.dept,
        stage: newCandidate.stage,
        score: Number(newCandidate.score),
        email: newCandidate.email,
        phone: newCandidate.phone,
        resume_name: cvFile ? cvFile.name : null,
        resume_url: uploadedUrl,
        employment_type: newCandidate.employment_type,
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

      setCandidates(prev => [data, ...prev]);
      setShowModal(false);
      setCVFile(null); // Reset CV file selector
      setNewCandidate({
        name: '',
        role: 'Senior Auditor',
        dept: 'Audit',
        score: 0,
        email: '',
        phone: '',
        employment_type: 'Experienced',
        customRole: '',
        customDept: '',
        stage: 'cv_received'
      });
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في التسجيل' : 'Registration Error',
        message: err.message || 'Failed to register candidate',
        type: 'error'
      });
    }
  };

  const sendOfferWelcomeEmail = async (c: Candidate) => {
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

  const handleMoveCard = async (id: string, nextStage: Candidate['stage']) => {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;
    if (candidate.stage === nextStage) return;

    // Confirm before moving to offered to prevent accidental onboarding side-effects
    if (nextStage === 'offered') {
      setPendingMove({ id, nextStage });
      setShowConfirmModal(true);
      return;
    }

    await executeMoveAction(id, nextStage);
  };

  const executeMoveAction = async (id: string, nextStage: Candidate['stage']) => {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;

    // Optimistic local state update
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, stage: nextStage } : c));

    try {
      const { error } = await supabase
        .from('hr_recruits')
        .update({ 
          stage: nextStage,
          ...(nextStage === 'offered' ? { placement_status: 'pending_placement' } : {})
        })
        .eq('id', id);

      if (error) throw error;

      // Special action: if promoted to offered, trigger welcome offer email
      if (nextStage === 'offered') {
        await sendOfferWelcomeEmail(candidate);
      }
    } catch (err: any) {
      setNotification({
        show: true,
        title: isAr ? 'خطأ في تحديث البيانات' : 'Update Error',
        message: `Error moving candidate: ${err.message}`,
        type: 'error'
      });
      // Rollback local state
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, stage: candidate.stage } : c));
    }
  };

  const executeConfirmMove = async () => {
    if (!pendingMove) return;
    const { id, nextStage } = pendingMove;
    setShowConfirmModal(false);
    setPendingMove(null);
    await executeMoveAction(id, nextStage);
  };

  const promoteStage = async (id: string) => {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;
    let nextStage = candidate.stage;
    if (candidate.stage === 'cv_received') nextStage = 'shortlisted';
    else if (candidate.stage === 'shortlisted') nextStage = 'interview_scheduled';
    else if (candidate.stage === 'interview_scheduled') nextStage = 'interview_done';
    else if (candidate.stage === 'interview_done') nextStage = 'offered';

    await handleMoveCard(id, nextStage);
  };

  const handleToggleTask = async (taskKey: string) => {
    if (!selectedCandidate) return;
    const currentTasks = selectedCandidate.onboarding_tasks || {
      contract_signed: false,
      bank_details_submitted: false,
      documents_uploaded: false,
      it_assets_ready: false
    };

    const updatedTasks = {
      ...currentTasks,
      [taskKey as keyof typeof currentTasks]: !currentTasks[taskKey as keyof typeof currentTasks]
    };

    const updatedCandidate = { ...selectedCandidate, onboarding_tasks: updatedTasks };
    setSelectedCandidate(updatedCandidate);

    // Update main list reference locally
    setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? updatedCandidate : c));

    try {
      const { error } = await supabase
        .from('hr_recruits')
        .update({ onboarding_tasks: updatedTasks })
        .eq('id', selectedCandidate.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error saving onboarding checklist:', err);
    }
  };

  const STAGES: { id: Candidate['stage']; label: string }[] = [
    { id: 'cv_received', label: isAr ? 'السير الذاتية' : 'CV Received' },
    { id: 'shortlisted', label: isAr ? 'قائمة الفرز' : 'Shortlisted' },
    { id: 'interview_scheduled', label: isAr ? 'المقابلات' : 'Interviews' },
    { id: 'interview_done', label: isAr ? 'تقييم المقابلة' : 'Evaluations' },
    { id: 'offered', label: isAr ? 'العروض الوظيفية' : 'Offered' },
    { id: 'on_hold', label: isAr ? 'قيد الانتظار' : 'On Hold' },
    { id: 'rejected', label: isAr ? 'المستبعدين' : 'Rejected' }
  ];

  // Apply Search, Filter & Sort criteria
  const filteredCandidates = candidates
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'all' || c.dept === deptFilter;
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      if (sortBy === 'oldest') return dateA - dateB;
      return dateB - dateA; // newest
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <UserPlus className="text-[#A11212]" size={22} />
            {isAr ? 'إدارة عمليات التوظيف والفرز' : 'Collaborative Recruitment Pipeline'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'متابعة مسار تعيين الموظفين الجدد وعروض العمل' : 'Track applicants, conduct reviews, and release job offers'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gray-900 text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-1.5 hover:bg-gray-800 shadow-sm transition-all whitespace-nowrap"
        >
          + Add Applicant
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          <input 
            type="text" 
            placeholder={isAr ? 'بحث عن مرشح...' : 'Search candidates...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs font-bold outline-none focus:border-[#A11212] focus:bg-white transition-all`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'القسم:' : 'Dept:'}</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
            >
              <option value="all">{isAr ? 'الكل' : 'All Departments'}</option>
              <option value="Audit">Audit</option>
              <option value="Tax & VAT">Tax & VAT</option>
              <option value="Accounting">Accounting</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'ترتيب:' : 'Sort:'}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
            >
              <option value="newest">{isAr ? 'الأحدث' : 'Newest'}</option>
              <option value="oldest">{isAr ? 'الأقدم' : 'Oldest'}</option>
              <option value="score">{isAr ? 'الأعلى تقييماً' : 'Highest Score'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      {/* View Switcher Tabs */}
      <div className="flex border-b border-gray-100 text-xs font-bold gap-3 mb-2">
        <button
          onClick={() => setViewMode('pipeline')}
          className={`px-4 py-2 border-b-2 transition-all ${
            viewMode === 'pipeline' ? 'border-[#A11212] text-[#A11212]' : 'border-transparent text-gray-400'
          }`}
        >
          {isAr ? 'عرض مخطط العمل (Kanban)' : 'Pipeline Board'}
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 border-b-2 transition-all ${
            viewMode === 'list' ? 'border-[#A11212] text-[#A11212]' : 'border-transparent text-gray-400'
          }`}
        >
          {isAr ? 'عرض القائمة' : 'List View Table'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A11212]"></div>
        </div>
      ) : viewMode === 'pipeline' ? (
        <div className="overflow-x-auto pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 min-w-[1450px]">
          {STAGES.map(stg => {
            const colCandidates = filteredCandidates.filter(c => c.stage === stg.id);
            const isDraggingOverThis = activeDragStage === stg.id;

            return (
              <div 
                key={stg.id} 
                onDragOver={(e) => {
                  e.preventDefault();
                  if (activeDragStage !== stg.id) {
                    setActiveDragStage(stg.id);
                  }
                }}
                onDragLeave={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                    setActiveDragStage(null);
                  }
                }}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData('text/plain');
                  handleMoveCard(id, stg.id);
                  setActiveDragStage(null);
                }}
                className={`rounded-2xl p-4 border transition-all duration-200 flex flex-col min-h-[480px] ${
                  isDraggingOverThis 
                    ? 'border-dashed border-[#A11212] bg-[#A11212]/5 scale-[1.01]' 
                    : 'bg-gray-50/30 border-gray-150'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-xs uppercase tracking-wider text-gray-500">{stg.label}</h4>
                  <span className="bg-white text-gray-500 text-[10px] font-black px-2 py-0.5 rounded shadow-xs border border-gray-100">
                    {colCandidates.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  {colCandidates.map(c => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', c.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => setSelectedCandidate(c)}
                      className="bg-white p-4 rounded-xl border border-gray-150 hover:border-[#A11212] transition-all cursor-grab active:cursor-grabbing hover:shadow-md shadow-xs space-y-3 active:scale-[0.98] select-none"
                    >
                      <div>
                        <p className="font-black text-xs text-gray-900">{c.name}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{c.role}</p>
                      </div>

                      {c.stage === 'offered' && (
                        <div className="space-y-1 border-t border-gray-50 pt-2">
                          {(() => {
                            const tasks = c.onboarding_tasks || { contract_signed: false, bank_details_submitted: false, documents_uploaded: false, it_assets_ready: false };
                            const completed = Object.values(tasks).filter(Boolean).length;
                            const total = 4;
                            const pct = Math.round((completed / total) * 100);
                            return (
                              <>
                                <div className="flex justify-between items-center text-[8px] font-bold text-gray-405">
                                  <span>ONBOARDING CHECKS</span>
                                  <span>{completed}/{total}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                  <div className="bg-green-600 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-gray-50 pt-2.5">
                        <span className={`text-[10px] font-black ${
                          c.score >= 85 ? 'text-green-600' : c.score >= 70 ? 'text-orange-500' : c.score > 0 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {isAr ? 'التقييم:' : 'Score:'} {c.score > 0 ? `${c.score}%` : (isAr ? 'معلق' : 'Pending')}
                        </span>
                        {c.stage !== 'offered' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              promoteStage(c.id);
                            }}
                            className="bg-[#A11212] text-white p-1.5 rounded-lg hover:bg-[#800e0e] transition-colors"
                            title="Advance Stage"
                          >
                            <ChevronRight size={12} className={isAr ? 'rotate-180' : ''} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {colCandidates.length === 0 && (
                    <div className="h-full flex items-center justify-center border border-dashed border-gray-200 rounded-xl py-12 text-center text-[10px] text-gray-400">
                      {isAr ? 'لا يوجد مرشحين' : 'No candidates'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" dir={isAr ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4">{isAr ? 'المرشح' : 'Applicant'}</th>
                  <th className="px-6 py-4">{isAr ? 'المنصب' : 'Position'}</th>
                  <th className="px-6 py-4">{isAr ? 'القسم' : 'Department'}</th>
                  <th className="px-6 py-4">{isAr ? 'المرحلة' : 'Pipeline Stage'}</th>
                  <th className="px-6 py-4">{isAr ? 'التقييم' : 'Score'}</th>
                  <th className="px-6 py-4">{isAr ? 'تاريخ التقديم' : 'Applied Date'}</th>
                  <th className="px-6 py-4 text-center">{isAr ? 'الخيارات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                {filteredCandidates.map(c => {
                  const completedTasks = c.onboarding_tasks 
                    ? Object.values(c.onboarding_tasks).filter(Boolean).length 
                    : 0;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black text-gray-900">{c.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{c.email} · {c.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{c.role}</td>
                      <td className="px-6 py-4">{c.dept}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          c.stage === 'offered' ? 'bg-green-50 text-green-700 border border-green-100' :
                          c.stage === 'interview_done' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          c.stage === 'interview_scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          c.stage === 'shortlisted' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                          c.stage === 'on_hold' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                          c.stage === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                          'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {c.stage.replace('_', ' ')}
                          {c.stage === 'offered' && ` (${completedTasks}/4)`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={c.score >= 85 ? 'text-green-600' : c.score >= 70 ? 'text-orange-500' : c.score > 0 ? 'text-red-500' : 'text-gray-400'}>
                          {c.score > 0 ? `${c.score}%` : (isAr ? 'معلق' : 'Pending')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-US') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedCandidate(c)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                            title="View dossier"
                          >
                            <Eye size={14} />
                          </button>
                          {c.resume_url && (
                            <button
                              onClick={() => {
                                setSelectedCandidate(c);
                                setShowCVPreview(true);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                              title="Screen CV"
                            >
                              <FileText size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setCandidateToDelete(c)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                            title={isAr ? 'حذف المرشح' : 'Delete Candidate'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-xs">
                      {isAr ? 'لا يوجد مرشحين مطابقتين للبحث' : 'No candidates matching search criteria'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Inspector Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'ملف المرشح' : 'Applicant Dossier Sheet'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCandidateToDelete(selectedCandidate);
                    setSelectedCandidate(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={isAr ? 'حذف المرشح' : 'Delete Candidate'}
                >
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelectedCandidate(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Tab Navigation if Offered (Active Onboarding) */}
              {selectedCandidate.stage === 'offered' && (
                <div className="flex border-b border-gray-100 text-xs font-bold gap-2">
                  <button 
                    type="button" 
                    onClick={() => setModalTab('details')}
                    className={`px-4 py-2 border-b-2 transition-all ${
                      modalTab === 'details' ? 'border-[#A11212] text-[#A11212]' : 'border-transparent text-gray-400'
                    }`}
                  >
                    {isAr ? 'بيانات المرشح' : 'Candidate Details'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setModalTab('onboarding')}
                    className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
                      modalTab === 'onboarding' ? 'border-[#A11212] text-[#A11212]' : 'border-transparent text-gray-400'
                    }`}
                  >
                    <ClipboardCheck size={14} />
                    {isAr ? 'قائمة الفحص والتهيئة (Onboarding)' : 'Onboarding Checklist'}
                  </button>
                </div>
              )}

              {/* Tab Content 1: Details */}
              {modalTab === 'details' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#A11212] text-white font-black text-xl rounded-xl flex items-center justify-center">
                      {selectedCandidate.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-gray-900">{selectedCandidate.name}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{selectedCandidate.role} · {selectedCandidate.dept}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">Email Address</p>
                      <p className="text-xs font-black text-gray-800">{selectedCandidate.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">Phone Number</p>
                      <p className="text-xs font-black text-gray-800">{selectedCandidate.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">Current Pipeline Stage</p>
                      <p className="text-xs font-black text-[#A11212] uppercase tracking-wider mt-0.5">{selectedCandidate.stage.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'تصنيف التوظيف' : 'Employment Classification'}</p>
                      <select
                        value={selectedCandidate.employment_type || 'Experienced'}
                        onChange={async (e) => {
                          const val = e.target.value as any;
                          const updated = { ...selectedCandidate, employment_type: val };
                          setSelectedCandidate(updated);
                          setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? updated : c));
                          
                          // Save to Supabase
                          await supabase
                            .from('hr_recruits')
                            .update({ employment_type: val })
                            .eq('id', selectedCandidate.id);
                        }}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-lg px-2.5 py-0.5 text-xs font-black outline-none focus:border-[#A11212] cursor-pointer"
                      >
                        <option value="Experienced">Experienced</option>
                        <option value="Trainee">Trainee</option>
                        <option value="Worker">Worker</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'درجة التقييم (%)' : 'Screening Assessment Score'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="-"
                          value={selectedCandidate.score || ''}
                          onChange={async (e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            const updated = { ...selectedCandidate, score: val };
                            setSelectedCandidate(updated);
                            setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? updated : c));
                            
                            // Save to Supabase
                            await supabase
                              .from('hr_recruits')
                              .update({ score: val })
                              .eq('id', selectedCandidate.id);
                          }}
                          className={`w-14 bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 text-xs font-black outline-none focus:border-[#A11212] text-center ${
                            selectedCandidate.score >= 85 ? 'text-green-700' : selectedCandidate.score >= 70 ? 'text-orange-600' : selectedCandidate.score > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab Content 2: Onboarding Tasks */
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'التحقق من مهام مباشرة العمل' : 'Check Onboarding Steps'}</p>
                    
                    <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-700 select-none">
                      <input 
                        type="checkbox"
                        checked={!!selectedCandidate.onboarding_tasks?.contract_signed}
                        onChange={() => handleToggleTask('contract_signed')}
                        className="rounded text-[#A11212] focus:ring-[#A11212] h-4 w-4 border-gray-300 cursor-pointer"
                      />
                      <span>{isAr ? 'توقيع عقد العمل' : 'Employment Contract Signed'}</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-700 select-none">
                      <input 
                        type="checkbox"
                        checked={!!selectedCandidate.onboarding_tasks?.bank_details_submitted}
                        onChange={() => handleToggleTask('bank_details_submitted')}
                        className="rounded text-[#A11212] focus:ring-[#A11212] h-4 w-4 border-gray-300 cursor-pointer"
                      />
                      <span>{isAr ? 'تقديم التفاصيل البنكية' : 'Bank Remittance Details Uploaded'}</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-700 select-none">
                      <input 
                        type="checkbox"
                        checked={!!selectedCandidate.onboarding_tasks?.documents_uploaded}
                        onChange={() => handleToggleTask('documents_uploaded')}
                        className="rounded text-[#A11212] focus:ring-[#A11212] h-4 w-4 border-gray-300 cursor-pointer"
                      />
                      <span>{isAr ? 'تحميل البطاقة الشخصية وجواز السفر' : 'Civil ID / Passport Copied'}</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-700 select-none">
                      <input 
                        type="checkbox"
                        checked={!!selectedCandidate.onboarding_tasks?.it_assets_ready}
                        onChange={() => handleToggleTask('it_assets_ready')}
                        className="rounded text-[#A11212] focus:ring-[#A11212] h-4 w-4 border-gray-300 cursor-pointer"
                      />
                      <span>{isAr ? 'توفير الأجهزة المحمولة والبريد' : 'IT Assets & Corporate Laptop Ready'}</span>
                    </label>
                  </div>

                  {/* Onboarding Tasks Progress Bar */}
                  {(() => {
                    const tasks = selectedCandidate.onboarding_tasks || { contract_signed: false, bank_details_submitted: false, documents_uploaded: false, it_assets_ready: false };
                    const total = 4;
                    const completed = Object.values(tasks).filter(Boolean).length;
                    const pct = Math.round((completed / total) * 100);

                    return (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400">
                          <span>{isAr ? 'نسبة الإنجاز' : 'PROGRESS STATUS'}</span>
                          <span>{pct}% ({completed}/{total})</span>
                        </div>
                        <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                          <div className="bg-green-600 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Attached CV File Info */}
              {selectedCandidate.resume_name && (
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                  <FileText size={12} className="text-[#A11212]" />
                  <span>{isAr ? 'الملف المرفق:' : 'Attached CV:'} {selectedCandidate.resume_name}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setShowCVPreview(true)}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText size={14} /> Screen CV Copy
                </button>
                {selectedCandidate.stage !== 'offered' && (
                  <button
                    onClick={() => {
                      promoteStage(selectedCandidate.id);
                      setSelectedCandidate(null);
                    }}
                    className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
                  >
                    Promote Candidate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CV Preview Document Modal */}
      {showCVPreview && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {selectedCandidate.resume_url ? 'CV File Preview' : 'Curriculum Vitae Sheet'}
              </h3>
              <button onClick={() => setShowCVPreview(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>
            
            {selectedCandidate.resume_url ? (
              <iframe
                src={selectedCandidate.resume_url}
                className="w-full h-full border-0 rounded-b-3xl"
                title="CV PDF Document"
              />
            ) : (
              <>
                {/* Elegant Document Layout (Fallback) */}
                <div className="p-10 flex-1 overflow-y-auto space-y-6 text-gray-800 bg-white" style={{ fontFamily: 'Georgia, serif' }}>
                  <div className="text-center border-b border-gray-200 pb-6">
                    {selectedCandidate.resume_name && (
                      <div className="mb-4 inline-flex items-center gap-1.5 bg-[#A11212]/5 border border-[#A11212]/15 px-3 py-1 rounded-full text-[9px] font-bold text-[#A11212] uppercase tracking-wider">
                        <FileText size={10} />
                        <span>Attached Document: {selectedCandidate.resume_name}</span>
                      </div>
                    )}
                    <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-955">{selectedCandidate.name}</h1>
                    <p className="text-xs text-gray-500 mt-1 italic">{selectedCandidate.role} · {selectedCandidate.dept} Candidate</p>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedCandidate.email} | {selectedCandidate.phone} | Muscat, Oman</p>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#A11212] border-b border-gray-100 pb-1">Professional Summary</h2>
                    <p className="text-xs leading-relaxed text-gray-600">
                      Dedicated and analytical professional seeking a permanent position at Maisarah Group. 
                      Experienced in local Omani regulatory practices, compliance audits, tax filings, internal audit procedures, and client relations. 
                      Strong proficiency in bookkeeping systems, VAT reconciliation, and corporate audit automation.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#A11212] border-b border-gray-100 pb-1">Education</h2>
                    <div>
                      <p className="text-xs font-bold text-gray-950">B.Sc. in Accounting & Finance (Honors)</p>
                      <p className="text-xs text-gray-500">Sultan Qaboos University, Muscat · 2018 - 2022</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#A11212] border-b border-gray-100 pb-1">Work History</h2>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-bold text-gray-900">Junior Audit & Finance Associate</p>
                        <p className="text-xs text-gray-500">Al-Nokhba Financial Services, Muscat · 2022 - 2024</p>
                        <ul className="list-disc list-inside text-[11px] text-gray-600 mt-1.5 leading-relaxed space-y-1">
                          <li>Conducted internal audit tests for small and medium businesses in Oman.</li>
                          <li>Assisted in preparing and filing annual corporate tax returns with the Oman Tax Authority.</li>
                          <li>Identified reconciliations and ledger discrepancies, improving financial reporting speed by 15%.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#A11212] border-b border-gray-100 pb-1">Skills & Certifications</h2>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>• Omani VAT Regulation Compliance</div>
                      <div>• International Financial Reporting Standards (IFRS)</div>
                      <div>• Financial Statement Auditing</div>
                      <div>• Advanced Excel & Financial Modeling</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={() => window.print()}
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-colors"
                  >
                    Print CV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Applicant Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Add Applicant to pipeline</h3>
              <button type="button" onClick={() => { setShowModal(false); setFormError(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">


              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Applicant Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salim Al-Harthy"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'المنصب المطلوب' : 'Position Applied'}</label>
                  <select
                    value={newCandidate.role}
                    onChange={(e) => setNewCandidate({ ...newCandidate, role: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Senior Auditor">Senior Auditor</option>
                    <option value="Tax Consultant">Tax Consultant</option>
                    <option value="Junior Associate">Junior Associate</option>
                    <option value="custom">{isAr ? '+ إضافة منصب مخصص...' : '+ Add Custom Position...'}</option>
                  </select>
                  {newCandidate.role === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'اكتب المنصب المخصص...' : 'Type custom position...'}
                      value={newCandidate.customRole}
                      onChange={(e) => setNewCandidate({ ...newCandidate, customRole: e.target.value })}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] animate-scale-up"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'القسم' : 'Department'}</label>
                  <select
                    value={newCandidate.dept}
                    onChange={(e) => setNewCandidate({ ...newCandidate, dept: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Audit">Audit</option>
                    <option value="Tax & VAT">Tax & VAT</option>
                    <option value="Accounting">Accounting</option>
                    <option value="custom">{isAr ? '+ إضافة قسم مخصص...' : '+ Add Custom Department...'}</option>
                  </select>
                  {newCandidate.dept === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'اكتب القسم المخصص...' : 'Type custom department...'}
                      value={newCandidate.customDept}
                      onChange={(e) => setNewCandidate({ ...newCandidate, customDept: e.target.value })}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] animate-scale-up"
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
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+968 9..."
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'درجة التقييم (اختياري)' : 'Assessment Score (% - Optional)'}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder={isAr ? 'قيد التقييم' : 'Pending'}
                    value={newCandidate.score || ''}
                    onChange={(e) => setNewCandidate({ ...newCandidate, score: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Starting Stage</label>
                  <select
                    value={newCandidate.stage}
                    onChange={(e) => setNewCandidate({ ...newCandidate, stage: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="cv_received">CV Received</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'إرفاق السيرة الذاتية (PDF)' : 'Attach CV Resume (PDF)'}</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setCVFile(e.target.files?.[0] || null)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[#A11212]/10 file:text-[#A11212] hover:file:bg-[#A11212]/20 file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'تصنيف التوظيف' : 'Employment Classification'}</label>
                <select
                  value={newCandidate.employment_type}
                  onChange={(e) => setNewCandidate({ ...newCandidate, employment_type: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                >
                  <option value="Experienced">{isAr ? 'موظف ذو خبرة (Experienced)' : 'Experienced'}</option>
                  <option value="Trainee">{isAr ? 'متدرب / طالب تدريب (Trainee)' : 'Trainee'}</option>
                  <option value="Worker">{isAr ? 'عامل عام (Worker)' : 'Worker'}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
                >
                  Register Candidate
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Premium Custom Promotion Confirmation Modal */}
      {showConfirmModal && pendingMove && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-scale-up border border-gray-100">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#A11212] animate-pulse">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'تأكيد تقديم عرض العمل' : 'Confirm Job Offer'}
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed font-bold">
                {isAr 
                  ? `هل أنت متأكد من تقديم عرض عمل لـ "${candidates.find(c => c.id === pendingMove.id)?.name}"؟ هذا الإجراء سيقوم بإنشاء حساب موظف وتفعيل وبوابة مباشرة العمل وتلقائياً إرسال رسالة ترحيبية بالبيانات إلى بريده.`
                  : `Are you sure you want to offer the job to "${candidates.find(c => c.id === pendingMove.id)?.name}"? This will automatically provision their employee portal account and dispatch their welcome credentials email.`
                }
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingMove(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeConfirmMove}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] hover:shadow-lg transition-all cursor-pointer"
              >
                {isAr ? 'تأكيد التوظيف' : 'Confirm & Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#A11212] flex items-center justify-center mb-2 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{isAr ? 'حذف مرشح' : 'Delete Candidate'}</h3>
            <p className="text-xs text-gray-550 leading-relaxed font-bold">
              {isAr 
                ? `هل أنت متأكد من حذف ملف المرشح ${candidateToDelete.name}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to permanently delete the recruitment profile of ${candidateToDelete.name}? This action cannot be undone.`}
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                type="button"
                onClick={() => setCandidateToDelete(null)} 
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                type="button"
                onClick={handleDeleteCandidate} 
                className="flex-1 py-3 bg-[#A11212] text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors cursor-pointer"
              >
                {isAr ? 'حذف نهائي' : 'Delete Permanently'}
              </button>
            </div>
          </div>
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
