import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  X,
  CheckCircle2,
  Search,
  Phone,
  Mail,
  AlertTriangle,
  Pencil,
  Trash2,
  Briefcase,
  UserCheck,
  Building2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { getAllDepartments, getDepartmentById } from '../../config/departments';
import { logActivity } from '../../lib/activityLogger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Employee {
  id: string;
  name_ar: string;
  name_en: string;
  email: string;
  phone: string;
  role: string; // System access role (e.g. employee, department_head)
  job_title: string; // Designated Job title (e.g. Senior Auditor)
  status: string;
  tasksCompleted: number;
  activeJobs: number;
  delays: number;
  completionRate: number;
  joinedAt: string;
  department_id?: string;
  civilId?: string;
  passportNo?: string;
  residencyNo?: string;
  nationality?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  immediateSupervisor?: string;
  basicSalary?: number;
  type?: string;
  accommodationStatus?: string;
  accommodationDetails?: string;
  allowances?: { transport: number; housing: number; other: number };
  education?: any[];
  experience?: any[];
  family?: any[];
  emergencyContact?: { name: string; relation: string; phone: string };
  promotions?: any[];
  disciplinaries?: any[];
  bonuses?: any[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const EmployeeManagement = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [confirmName, setConfirmName] = useState('');

  // Placements Workflow States
  const [activeTab, setActiveTab] = useState<'roster' | 'placements'>('roster');
  const [pendingPlacements, setPendingPlacements] = useState<any[]>([]);
  const [loadingPlacements, setLoadingPlacements] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<any | null>(null);
  const [placementData, setPlacementData] = useState({
    role: 'Senior Auditor',
    customRole: '',
    dept: 'audit',
    supervisor: 'Fatma Al-Harthy',
    startDate: '',
    accessRole: 'employee'
  });
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [dossierTab, setDossierTab] = useState<'general' | 'job' | 'financials' | 'performance'>('general');
  const [isSavingDossier, setIsSavingDossier] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    civilId: '',
    passportNo: '',
    residencyNo: '',
    nationality: 'Omani',
    dob: '',
    gender: 'Male',
    maritalStatus: 'Single',
    jobTitle: 'Senior Auditor',
    department_id: 'audit',
    accessRole: 'employee',
    immediateSupervisor: 'Nasser Al-Riyami',
    joinedDate: '',
    employeeType: 'Experienced',
    accommodationStatus: 'Lives with family',
    accommodationDetails: '',
    basicSalary: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowance: 0
  });

  useEffect(() => {
    if (viewingEmployee) {
      setEditFormData({
        fullName: viewingEmployee.name_en || '',
        phone: viewingEmployee.phone || '',
        civilId: viewingEmployee.civilId || '',
        passportNo: viewingEmployee.passportNo || '',
        residencyNo: viewingEmployee.residencyNo || '',
        nationality: viewingEmployee.nationality || 'Omani',
        dob: viewingEmployee.dob || '',
        gender: viewingEmployee.gender || 'Male',
        maritalStatus: viewingEmployee.maritalStatus || 'Single',
        jobTitle: viewingEmployee.job_title || 'Senior Auditor',
        department_id: viewingEmployee.department_id || 'audit',
        accessRole: viewingEmployee.role || 'employee',
        immediateSupervisor: viewingEmployee.immediateSupervisor || 'Nasser Al-Riyami',
        joinedDate: viewingEmployee.joinedAt || '',
        employeeType: viewingEmployee.type || 'Experienced',
        accommodationStatus: viewingEmployee.accommodationStatus || 'Lives with family',
        accommodationDetails: viewingEmployee.accommodationDetails || '',
        basicSalary: viewingEmployee.basicSalary || 0,
        transportAllowance: viewingEmployee.allowances?.transport || 0,
        housingAllowance: viewingEmployee.allowances?.housing || 0,
        otherAllowance: viewingEmployee.allowances?.other || 0
      });
      setDossierTab('general');
      setDossierError(null);
      setIsEditing(false);
    }
  }, [viewingEmployee]);

  const [isPlacing, setIsPlacing] = useState(false);
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

  const fetchPlacements = useCallback(async () => {
    setLoadingPlacements(true);
    try {
      const { data, error } = await supabase
        .from('hr_recruits')
        .select('*')
        .eq('stage', 'offered')
        .eq('placement_status', 'pending_placement')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingPlacements(data || []);
    } catch (err) {
      console.error('Error fetching pending placements:', err);
    } finally {
      setLoadingPlacements(false);
    }
  }, []);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  useEffect(() => {
    if (activeTab === 'placements') {
      fetchPlacements();
    }
  }, [activeTab, fetchPlacements]);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'employee',
    department_id: 'audit',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState({ email: '', password: '' });

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [{ data: profiles, error: profErr }, { data: hrEmployees, error: hrErr }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('*')
      ]);

      if (profErr) throw profErr;
      if (hrErr) throw hrErr;

      // Map DB profiles to Employee interface, joining with hr_employees details
      const mapped: Employee[] = (profiles || []).map(p => {
        const hrEmp = (hrEmployees || []).find(h => h.id === p.id || (h.email && p.email && h.email.toLowerCase() === p.email.toLowerCase()));

        // Mock stats for completion rate if not present
        const total = Math.floor(Math.random() * 40 + 10);
        const done = Math.floor(total * (0.5 + Math.random() * 0.5));

        // Normalize department
        let rawDept = p.department_id || p.department || hrEmp?.department_id || hrEmp?.dept || 'audit';
        let normalizedDept = 'audit';
        const lowerDept = String(rawDept).toLowerCase().trim();
        if (lowerDept.includes('tax') || lowerDept.includes('vat')) normalizedDept = 'tax_vat';
        else if (lowerDept.includes('book') || lowerDept.includes('ledger') || lowerDept.includes('account')) normalizedDept = 'bookkeeping';
        else if (lowerDept.includes('advis') || lowerDept.includes('consult')) normalizedDept = 'business_advisory';
        else if (lowerDept.includes('success') || lowerDept.includes('client') || lowerDept.includes('operat')) normalizedDept = 'client_success';
        else if (lowerDept.includes('audit')) normalizedDept = 'audit';

        const realPhone = hrEmp?.phone || p.phone || '';

        return {
          id: p.id,
          name_en: hrEmp?.full_name || p.full_name || p.name || 'Unknown',
          name_ar: p.full_name || hrEmp?.full_name || 'غير معروف',
          email: p.email || hrEmp?.email || '',
          phone: realPhone,
          role: p.role || 'employee', // access role
          job_title: hrEmp?.role || (p.role === 'department_head' ? 'Department Head (HOD)' : 'Senior Auditor'), // designated job position
          status: hrEmp?.status || 'active',
          tasksCompleted: done,
          activeJobs: total - done,
          delays: Math.floor(Math.random() * 3),
          completionRate: Math.round((done / total) * 100),
          joinedAt: hrEmp?.joined_date || (p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '2024-01-01'),
          department_id: normalizedDept,

          // Additional Dossier Details
          civilId: hrEmp?.civil_id || '',
          passportNo: hrEmp?.passport_no || '',
          residencyNo: hrEmp?.residency_no || '',
          nationality: hrEmp?.nationality || 'Omani',
          dob: hrEmp?.dob || '',
          gender: hrEmp?.gender || 'Male',
          maritalStatus: hrEmp?.marital_status || 'Single',
          immediateSupervisor: hrEmp?.immediate_supervisor || (normalizedDept === 'tax_vat' ? 'Khalfan Al-Abri' : normalizedDept === 'bookkeeping' ? 'Mazis Al-Balushi' : 'Nasser Al-Riyami'),
          basicSalary: Number(hrEmp?.basic_salary || 0),
          type: hrEmp?.employee_type || 'Experienced',
          accommodationStatus: hrEmp?.accommodation_status || 'Lives with family',
          accommodationDetails: hrEmp?.accommodation_details || '',
          allowances: hrEmp?.allowances || { transport: 0, housing: 0, other: 0 },
          education: hrEmp?.education || [],
          experience: hrEmp?.experience || [],
          family: hrEmp?.family || [],
          emergencyContact: hrEmp?.emergency_contact || { name: '', relation: '', phone: '' },
          promotions: hrEmp?.promotions || [],
          disciplinaries: hrEmp?.disciplinaries || [],
          bonuses: hrEmp?.bonuses || []
        };
      });

      // Filter out Executive manager profile in employee directory view
      setEmployees(mapped.filter(emp => emp.email !== 'manager@maisarah.om'));
    } catch (err: any) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();

    // ── Supabase Realtime Subscription ─────────────────────────────────────────
    const channel = supabase
      .channel('manager-workforce-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchEmployees(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_employees' },
        () => {
          fetchEmployees(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEmployees]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.name_en || emp.name_ar || '',
      email: emp.email || '',
      phone: emp.phone || '',
      password: '',
      role: emp.role || 'employee',
      department_id: emp.department_id || 'audit',
    });
    setIsModalOpen(true);
    setFormMessage(null);
    setShowCredentials(false);
    setIsSubmitting(false);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsSubmitting(true);

    const id = employeeToDelete.id;
    const empName = isAr ? (employeeToDelete.name_ar || employeeToDelete.name_en) : (employeeToDelete.name_en || employeeToDelete.name_ar);

    // 1. Immediate UI update
    setEmployees(prev => prev.filter(e => e.id !== id));
    if (viewingEmployee?.id === id) {
      setViewingEmployee(null);
    }
    setDeleteModalOpen(false);

    // 2. Cascade delete from Supabase if valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        // Unassign foreign keys
        await supabase.from('services').update({ employee_id: null }).eq('employee_id', id);
        await supabase.from('clients').update({ assigned_employee_id: null }).eq('assigned_employee_id', id);

        // Clean up child tables
        await supabase.from('hr_leave_requests').delete().eq('employee_id', id);
        await supabase.from('hr_leave_balances').delete().eq('employee_id', id);
        await supabase.from('hr_attendance').delete().eq('employee_id', id);
        await supabase.from('hr_onboarding_tasks').delete().eq('employee_id', id);

        // Delete from hr_employees
        await supabase.from('hr_employees').delete().eq('id', id);

        // Delete from profiles (core identity)
        const { error: profError } = await supabase.from('profiles').delete().eq('id', id);
        if (profError) {
          console.warn('Profile deletion notice:', profError);
        }

        setNotification({
          show: true,
          title: isAr ? 'تم الحذف بنجاح' : 'Employee Deleted',
          message: isAr ? `تم حذف حساب وملف الموظف "${empName}" بالكامل.` : `Employee dossier and portal account for "${empName}" permanently removed.`,
          type: 'success'
        });
      } catch (err: any) {
        setNotification({
          show: true,
          title: isAr ? 'خطأ في الحذف' : 'Deletion Error',
          message: err.message || 'Error deleting employee',
          type: 'error'
        });
      }
    } else {
      setNotification({
        show: true,
        title: isAr ? 'تم الحذف بنجاح' : 'Employee Deleted',
        message: isAr ? `تم حذف ملف الموظف "${empName}" بنجاح.` : `Employee record "${empName}" removed successfully.`,
        type: 'success'
      });
    }

    // 3. Clean up localStorage cache
    try {
      const rawCache = localStorage.getItem('hr_employee_records');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        const filtered = parsed.filter((e: any) => e.id !== id && e.name !== empName && e.name_en !== empName);
        localStorage.setItem('hr_employee_records', JSON.stringify(filtered));
      }
    } catch (cErr) {
      console.warn('Cache cleanup error:', cErr);
    } finally {
      setIsSubmitting(false);
      setEmployeeToDelete(null);
    }
  };

  const handleOpenPlacementModal = (placement: any) => {
    setSelectedPlacement(placement);
    const defaultDept = placement.dept === 'Tax & VAT' ? 'tax_vat' : placement.dept === 'Audit' ? 'audit' : 'bookkeeping';
    let defaultHOD = 'Nasser Al-Riyami';
    if (defaultDept === 'tax_vat') defaultHOD = 'Khalfan Al-Abri';
    if (defaultDept === 'bookkeeping') defaultHOD = 'Mazis Al-Balushi';

    setPlacementData({
      role: placement.role || 'Senior Auditor',
      customRole: '',
      dept: defaultDept,
      supervisor: defaultHOD,
      startDate: new Date().toISOString().split('T')[0],
      accessRole: 'employee'
    });
    setPlacementError(null);
  };

  const handleConfirmPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlacement) return;
    setIsPlacing(true);
    setPlacementError(null);

    const tempPassword = 'Welcome@' + Math.floor(1000 + Math.random() * 9000);
    const targetDept = placementData.dept;
    const finalRole = placementData.role === 'custom' ? placementData.customRole : placementData.role;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      let userId: string | null = null;
      let isAlreadyRegistered = false;

      // 1. Sign up the user in Supabase Auth securely
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: selectedPlacement.email,
        password: tempPassword,
        options: {
          data: {
            full_name: selectedPlacement.name,
            role: placementData.accessRole,
            department_id: targetDept
          }
        }
      });

      if (authError) {
        if (
          authError.message?.toLowerCase().includes('already registered') ||
          authError.message?.toLowerCase().includes('already exists') ||
          authError.status === 400
        ) {
          isAlreadyRegistered = true;
          const { data: existingProfile, error: getProfileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', selectedPlacement.email)
            .maybeSingle();

          if (getProfileError) throw getProfileError;
          if (existingProfile) {
            userId = existingProfile.id;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id || null;
      }

      if (!userId) {
        throw new Error(isAr ? 'تعذر التعرف على حساب المستخدم.' : 'Could not identify or create user ID.');
      }

      // 2. Insert/Upsert profile record (this fires handle_new_employee_setup trigger)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: selectedPlacement.name,
        email: selectedPlacement.email,
        role: placementData.accessRole,
        department_id: targetDept
      }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // 3. Upsert active employee card inside hr_employees
      const { error: employeeUpsertError } = await supabase.from('hr_employees').upsert({
        id: userId,
        full_name: selectedPlacement.name,
        email: selectedPlacement.email,
        phone: selectedPlacement.phone,
        role: finalRole,
        dept: targetDept === 'tax_vat' ? 'Tax & VAT' : targetDept === 'audit' ? 'Audit' : 'Bookkeeping',
        employee_type: selectedPlacement.employment_type || 'Experienced',
        joined_date: placementData.startDate || new Date().toISOString().split('T')[0],
        immediate_supervisor: placementData.supervisor || 'Fatma Al-Harthy',
        accommodation_status: 'Lives with family',
        allowances: { transport: 150, housing: 250, other: 50 },
        education: [],
        experience: [],
        family: [],
        emergency_contact: { name: '', relation: 'Parent', phone: '' },
        promotions: [],
        disciplinaries: [],
        bonuses: [],
        transfers: []
      }, { onConflict: 'id' });

      if (employeeUpsertError) throw employeeUpsertError;

      // 4. Update hr_recruits to mark status as 'placed'
      const { error: recruitError } = await supabase
        .from('hr_recruits')
        .update({
          placement_status: 'placed',
          role: finalRole,
          dept: targetDept === 'tax_vat' ? 'Tax & VAT' : targetDept === 'audit' ? 'Audit' : 'Bookkeeping'
        })
        .eq('id', selectedPlacement.id);

      if (recruitError) throw recruitError;

      // 5. Dispatch portal credentials email (Email B) securely via Resend
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: selectedPlacement.email,
            subject: isAr
              ? 'مرحباً بك في مجموعة ميسرة - حساب الموظف الخاص بك جاهز!'
              : 'Welcome to Maisarah - Your Employee Portal is Active!',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; color: #333;">
                <h2 style="color: #A11212; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; text-align: center;">Welcome to Maisarah Group!</h2>
                <p>Dear ${selectedPlacement.name},</p>
                <p>
                  ${isAr
                ? 'يسعدنا إبلاغك بأنه قد تم اعتماد تفاصيل تعيينك وتفعيل حساب الموظف الخاص بك بنجاح. يمكنك الآن تسجيل الدخول لتحديث ملفك والبدء بقائمة مهام التهيئة.'
                : 'We are pleased to inform you that your department placement setup has been finalized and your corporate portal access is now active.'}
                </p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h3 style="margin-top: 0; color: #555;">Your Access Credentials:</h3>
                  <p><strong>Portal URL:</strong> <a href="${window.location.origin}/login">${window.location.origin}/login</a></p>
                  <p><strong>Username/Email:</strong> ${selectedPlacement.email}</p>
                  ${!isAlreadyRegistered ? `<p><strong>Temporary Password:</strong> ${tempPassword}</p>` : ''}
                  <p><strong>Assigned Role:</strong> ${finalRole}</p>
                  <p><strong>Assigned Department:</strong> ${targetDept === 'tax_vat' ? 'Tax & VAT' : targetDept === 'audit' ? 'Audit' : 'Bookkeeping'}</p>
                </div>
                <p>${isAr ? 'يرجى تغيير كلمة المرور المؤقتة فور تسجيل الدخول لأول مرة.' : 'Please log in to complete your onboarding tasklist and change your temporary password for system security.'}</p>
                <br/>
                <p>${isAr ? 'مع أطيب التحيات،' : 'Best Regards,'}</p>
                <p>${isAr ? 'إدارة العمليات والتنفيذ - ميسرة' : 'Maisarah Operations & Placement Management'}</p>
              </div>
            `
          }
        });
      } catch (emailErr) {
        console.warn('Portal credentials email dispatch failed:', emailErr);
      }

      setNotification({
        show: true,
        title: isAr ? 'تم تأكيد التعيين' : 'Placement Finalized',
        message: isAr
          ? `تم تفعيل حساب الموظف لـ ${selectedPlacement.name} بنجاح وإرسال البريد الإلكتروني (Email B).`
          : `Placement details confirmed! Registered employee account for ${selectedPlacement.name} and dispatched login credentials to ${selectedPlacement.email}.`,
        type: 'success'
      });

      setPendingPlacements(prev => prev.filter(p => p.id !== selectedPlacement.id));
      setSelectedPlacement(null);
      fetchEmployees();
    } catch (err: any) {
      setPlacementError(err.message || 'Failed to confirm placement');
    } finally {
      setIsPlacing(false);
    }
  };

  const handleAddOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage(null);

    try {
      if (editingEmployee) {
        // Edit Mode
        // 1. Update security access profiles table
        const profileUpdate: any = {
          full_name: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          department_id: formData.department_id
        };
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', editingEmployee.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
          throw profileError;
        }

        // 2. Upsert/Update core employee records table (hr_employees)
        const deptNames: Record<string, string> = {
          audit: 'Audit',
          tax_vat: 'Tax & VAT',
          bookkeeping: 'Bookkeeping',
          business_advisory: 'Business Advisory',
          client_success: 'Client Success'
        };

        const hrEmployeeData = {
          id: editingEmployee.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          dept: deptNames[formData.department_id] || 'Audit',
          department_id: formData.department_id,
          role: formData.role === 'department_head' ? 'Department Head (HOD)' : (editingEmployee.job_title || 'Employee')
        };

        const { error: hrError } = await supabase
          .from('hr_employees')
          .upsert(hrEmployeeData, { onConflict: 'id' });

        if (hrError) {
          console.warn('Could not upsert hr_employees, but profile updated:', hrError);
        }

        // 3. Log activity
        await logActivity(
          editingEmployee.id,
          formData.fullName,
          'service_updated',
          `Manager updated employee '${formData.fullName}': Role -> '${formData.role}', Dept -> '${deptNames[formData.department_id] || formData.department_id}'`,
          `قام المدير بتحديث بيانات الموظف '${formData.fullName}': الصلاحية -> '${formData.role}'، القسم -> '${deptNames[formData.department_id] || formData.department_id}'`
        );

        // 4. Update local state
        setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { 
          ...emp, 
          name_en: formData.fullName, 
          name_ar: formData.fullName, 
          phone: formData.phone, 
          role: formData.role, 
          department_id: formData.department_id,
          job_title: formData.role === 'department_head' ? 'Department Head (HOD)' : emp.job_title
        } : emp));

        setNotification({
          show: true,
          title: isAr ? 'تم تحديث الموظف بنجاح' : 'Employee Updated',
          message: isAr ? 'تم حفظ التعديلات وتحديث الصلاحيات والقسم بنجاح.' : 'Employee profile, department, and role updated successfully.',
          type: 'success'
        });

        setIsModalOpen(false);
        setEditingEmployee(null);
        return;
      }

      // Create Mode - using a temp client to prevent session takeover
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: formData.role,
            department_id: formData.department_id
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          department_id: formData.department_id
        }, { onConflict: 'id' });

        const deptNames: Record<string, string> = {
          audit: 'Audit',
          tax_vat: 'Tax & VAT',
          bookkeeping: 'Bookkeeping',
          business_advisory: 'Business Advisory',
          client_success: 'Client Success'
        };

        await supabase.from('hr_employees').upsert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          dept: deptNames[formData.department_id] || 'Audit',
          department_id: formData.department_id,
          role: formData.role === 'department_head' ? 'Department Head (HOD)' : 'Employee'
        }, { onConflict: 'id' });
      }

      setCreatedCredentials({ email: formData.email, password: formData.password });
      setShowCredentials(true);
      setFormMessage({ type: 'success', text: isAr ? 'تم إضافة الموظف بنجاح' : 'Employee created successfully' });
      fetchEmployees();
    } catch (err: any) {
      setFormMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Hi ${formData.fullName},\n\nYour Maisarah Platform account is ready.\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nLogin here: ${window.location.origin}/login`;
    window.open(`https://wa.me/${formData.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSaveDossierChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingEmployee) return;
    setIsSavingDossier(true);
    setDossierError(null);

    try {
      // 1. Update security access profiles table
      const profileUpdate: any = {
        full_name: editFormData.fullName,
        phone: editFormData.phone,
        role: editFormData.accessRole,
        department_id: editFormData.department_id
      };
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', viewingEmployee.id);

      if (profileError) throw profileError;

      const deptNames: Record<string, string> = {
        audit: 'Audit',
        tax_vat: 'Tax & VAT',
        bookkeeping: 'Bookkeeping',
        business_advisory: 'Business Advisory',
        client_success: 'Client Success'
      };

      // 2. Upsert core employee records table (which stores phone, civil id, salary, allowances, etc.)
      const employeeUpdate = {
        id: viewingEmployee.id,
        full_name: editFormData.fullName,
        email: viewingEmployee.email,
        phone: editFormData.phone,
        role: editFormData.accessRole === 'department_head' ? 'Department Head (HOD)' : editFormData.jobTitle,
        dept: deptNames[editFormData.department_id] || 'Audit',
        department_id: editFormData.department_id,
        employee_type: editFormData.employeeType,
        joined_date: editFormData.joinedDate,
        immediate_supervisor: editFormData.immediateSupervisor,
        accommodation_status: editFormData.accommodationStatus,
        accommodation_details: editFormData.accommodationDetails,
        basic_salary: Number(editFormData.basicSalary || 0),
        allowances: {
          transport: Number(editFormData.transportAllowance || 0),
          housing: Number(editFormData.housingAllowance || 0),
          other: Number(editFormData.otherAllowance || 0)
        },
        civil_id: editFormData.civilId,
        passport_no: editFormData.passportNo,
        residency_no: editFormData.residencyNo,
        nationality: editFormData.nationality,
        dob: editFormData.dob,
        gender: editFormData.gender,
        marital_status: editFormData.maritalStatus
      };
      const { error: employeeError } = await supabase
        .from('hr_employees')
        .upsert(employeeUpdate, { onConflict: 'id' });

      if (employeeError) {
        console.warn('Could not upsert hr_employees, but profile updated:', employeeError);
      }

      // Update local state in employees list
      const updatedEmployee: Employee = {
        ...viewingEmployee,
        name_en: editFormData.fullName,
        name_ar: editFormData.fullName,
        phone: editFormData.phone,
        role: editFormData.accessRole,
        job_title: editFormData.jobTitle,
        department_id: editFormData.department_id,
        civilId: editFormData.civilId,
        passportNo: editFormData.passportNo,
        residencyNo: editFormData.residencyNo,
        nationality: editFormData.nationality,
        dob: editFormData.dob,
        gender: editFormData.gender,
        maritalStatus: editFormData.maritalStatus,
        immediateSupervisor: editFormData.immediateSupervisor,
        basicSalary: Number(editFormData.basicSalary || 0),
        type: editFormData.employeeType,
        accommodationStatus: editFormData.accommodationStatus,
        accommodationDetails: editFormData.accommodationDetails,
        allowances: {
          transport: Number(editFormData.transportAllowance || 0),
          housing: Number(editFormData.housingAllowance || 0),
          other: Number(editFormData.otherAllowance || 0)
        }
      };

      setEmployees(prev => prev.map(emp => emp.id === viewingEmployee.id ? updatedEmployee : emp));
      setViewingEmployee(updatedEmployee);
      setDossierTab('general');

      // Show dynamic notification modal
      setNotification({
        show: true,
        title: isAr ? 'تم حفظ التعديلات' : 'Changes Saved',
        message: isAr ? 'تم تحديث بيانات الموظف بنجاح في النظام.' : 'Employee details have been successfully updated in the system.',
        type: 'success'
      });
    } catch (err: any) {
      setDossierError(err.message || 'Failed to update employee details');
    } finally {
      setIsSavingDossier(false);
    }
  };

  // ── Computed Stats ───────────────────────────────────────────────────────
  const onLeave = employees.filter(e => e.status === 'on_leave');
  const avgCompletion = employees.length > 0 ? Math.round(employees.reduce((acc, curr) => acc + curr.completionRate, 0) / employees.length) : 0;
  const mockLeaveRequests = 3;

  const filtered = employees.filter(e => {
    const matchSearch = e.name_en.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = deptFilter === 'all' || e.department_id === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="text-brand-dark" size={32} />
            {isAr ? 'إدارة الموارد البشرية' : 'HR & Workforce'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'مراقبة أداء الموظفين، الحضور، وتوزيع المهام' : 'Monitor employee performance, attendance, and task distribution'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setFormData({ fullName: '', email: '', phone: '', password: '', role: 'employee', department_id: 'audit' });
            setIsModalOpen(true);
            setShowCredentials(false);
            setFormMessage(null);
          }}
          className="bg-brand-dark text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
        >
          <UserPlus size={20} />
          {isAr ? 'إضافة موظف' : 'Add Employee'}
        </button>
      </div>

      {/* ── Pulse Bar ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-dark text-white rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2 relative z-10">{isAr ? 'إجمالي الموظفين' : 'Total Headcount'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black leading-none">{employees.length}</p>
            <Users size={24} className="text-white/20" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">{isAr ? 'في إجازة' : 'On Leave'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black text-gray-900 leading-none">{onLeave.length}</p>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <Briefcase size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">{isAr ? 'طلبات معلقة' : 'Pending Requests'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black text-gray-900 leading-none">{mockLeaveRequests}</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">{isAr ? 'معدل الإنجاز العام' : 'Avg Completion'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black text-gray-900 leading-none">{avgCompletion}%</p>
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* ── Main Roster Table ─────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex border-b border-gray-100 px-6 pt-4 bg-gray-50/20">
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'roster'
                  ? 'border-brand-dark text-brand-dark'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                {isAr ? 'قائمة الموظفين النشطين' : 'Active Workforce'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('placements')}
                className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative cursor-pointer flex items-center gap-1.5 ${activeTab === 'placements'
                  ? 'border-brand-dark text-brand-dark'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                {isAr ? 'تعيينات الموظفين الجدد' : 'New Hire Placements'}
                {pendingPlacements.length > 0 && (
                  <span className="bg-[#A11212] text-white text-[9px] font-black px-2 py-0.5 rounded-full leading-none">
                    {pendingPlacements.length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'roster' ? (
              <>
                {/* Filters */}
                <div className="p-4 border-b border-gray-50 flex flex-wrap gap-4 items-center bg-gray-50/30">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
                    <input
                      type="text"
                      placeholder={isAr ? 'بحث عن موظف...' : 'Search employees...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full ${isAr ? 'pr-10' : 'pl-10'} py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-dark text-sm font-bold`}
                    />
                  </div>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-dark min-w-[150px]"
                  >
                    <option value="all">{isAr ? 'كل الأقسام' : 'All Departments'}</option>
                    {getAllDepartments().map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                {loading ? (
                  <div className="p-20 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start whitespace-nowrap">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف والصلاحية' : 'Employee & Role'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'القسم المسؤول عنه' : 'Assigned Department'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الإنجاز' : 'Completion'}</th>
                          <th className="px-6 py-4 text-end"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtered.map(emp => {
                          const dept = getAllDepartments().find(d => d.id === emp.department_id) || getAllDepartments()[0];
                          const isOnline = emp.status === 'active';
                          const isHOD = emp.role === 'department_head';
                          return (
                            <tr key={emp.id} className="group hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm relative shadow-inner ${
                                    isHOD ? 'bg-red-50 text-[#A11212] border border-red-200' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {emp.name_en.charAt(0).toUpperCase()}
                                    {isOnline && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setViewingEmployee(emp)}
                                        className="font-black text-gray-900 text-sm hover:text-brand-dark hover:underline focus:outline-none text-left cursor-pointer"
                                      >
                                        {isAr ? emp.name_ar : emp.name_en}
                                      </button>
                                      {isHOD && (
                                        <span className="inline-flex items-center gap-1 bg-red-50 text-[#A11212] border border-red-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          <ShieldCheck size={10} />
                                          {isAr ? 'رئيس قسم' : 'HOD Head'}
                                        </span>
                                      )}
                                      {emp.role === 'accountant' && (
                                        <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          {isAr ? 'محاسب' : 'Accountant'}
                                        </span>
                                      )}
                                      {emp.role === 'hr' && (
                                        <span className="bg-purple-50 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          {isAr ? 'موارد بشرية' : 'HR'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400">
                                      {emp.email} {emp.phone ? `· ${emp.phone}` : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Building2 size={14} className={isHOD ? 'text-[#A11212]' : 'text-gray-400'} />
                                  <span className={`text-xs font-bold ${isHOD ? 'text-[#A11212] font-black' : 'text-gray-700'}`}>
                                    {dept?.name || emp.department_id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {isOnline ? (
                                  <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase border border-green-100">
                                    {isAr ? 'نشط' : 'Active'}
                                  </span>
                                ) : (
                                  <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase border border-orange-100">
                                    {isAr ? 'إجازة' : 'On Leave'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div className="h-2 rounded-full" style={{ width: `${emp.completionRate}%`, backgroundColor: emp.completionRate > 80 ? '#10B981' : emp.completionRate > 50 ? '#F59E0B' : '#EF4444' }} />
                                  </div>
                                  <span className="text-xs font-black text-gray-700 w-8">{emp.completionRate}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-end space-x-2 space-x-reverse">
                                <button 
                                  onClick={() => openEditModal(emp)} 
                                  title={isAr ? 'تعديل الصلاحية والقسم' : 'Edit Role & Department'}
                                  className="p-2 text-gray-400 hover:text-[#A11212] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => { setEmployeeToDelete(emp); setConfirmName(''); setDeleteModalOpen(true); }} 
                                  title={isAr ? 'حذف الحساب' : 'Delete Account'}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                {loadingPlacements ? (
                  <div className="p-20 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
                  </div>
                ) : pendingPlacements.length === 0 ? (
                  <div className="p-20 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                      <UserCheck size={24} />
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      {isAr ? 'لا توجد تعيينات معلقة حالياً' : 'All Offered Recruits Placed'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start whitespace-nowrap">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المرشح الجديد' : 'New Hire'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المسمى المقترح' : 'Suggested Placement'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'التصنيف' : 'Classification'}</th>
                          <th className="px-6 py-4 text-end"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pendingPlacements.map(p => (
                          <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#A11212]/5 text-[#A11212] flex items-center justify-center font-black text-sm uppercase">
                                  {p.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-black text-gray-900 text-sm">{p.name}</p>
                                  <p className="text-[10px] font-bold text-gray-455">{p.email} · {p.phone || 'N/A'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-black text-gray-900">{p.role}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{p.dept}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-[#A11212]/5 text-[#A11212] px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-[#A11212]/10">
                                {p.employment_type || 'Experienced'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-end">
                              <button
                                onClick={() => handleOpenPlacementModal(p)}
                                className="px-4 py-2 bg-brand-dark text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                <UserCheck size={14} /> {isAr ? 'اعتماد التعيين' : 'Configure Placement'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── HR Inbox (Side Panel) ──────────────────────────────────────── */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
              <Mail size={16} className="text-brand-dark" />
              {isAr ? 'صندوق طلبات الإجازة' : 'Leave Requests Inbox'}
            </h3>

            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-orange-500 bg-orange-100 px-2 py-0.5 rounded uppercase tracking-widest">Annual Leave</span>
                    <span className="text-[10px] text-gray-400 font-bold">2h ago</span>
                  </div>
                  <p className="text-xs font-bold text-gray-900">Sara Al-Balushi</p>
                  <p className="text-[10px] text-gray-500 mt-1">Requesting 5 days from Oct 12.</p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 bg-white border border-gray-200 hover:bg-gray-100 text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-colors">Deny</button>
                    <button className="flex-1 bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-colors">Approve</button>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 text-center text-xs font-bold text-gray-500 hover:text-brand-dark">
              {isAr ? 'عرض كل الطلبات' : 'View all requests'} &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Employee Modal ───────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <UserPlus className="text-brand-dark" size={20} />
                {editingEmployee ? (isAr ? 'تعديل بيانات الموظف' : 'Edit Employee') : (isAr ? 'إضافة موظف جديد' : 'Add New Employee')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {formMessage && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 ${formMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {formMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  {formMessage.text}
                </div>
              )}

              {showCredentials && !editingEmployee ? (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{isAr ? 'بيانات الدخول' : 'Login Credentials'}</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">{isAr ? 'البريد الإلكتروني' : 'Email'}</p>
                        <p className="font-bold text-gray-900">{createdCredentials.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{isAr ? 'كلمة المرور' : 'Password'}</p>
                        <p className="font-bold text-gray-900">{createdCredentials.password}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={handleShareWhatsApp} className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      <Phone size={18} />
                      WhatsApp
                    </button>
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-bold transition-colors">
                      {isAr ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddOrEditSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input required type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                      <input required type="email" disabled={!!editingEmployee} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] outline-none disabled:opacity-60 disabled:cursor-not-allowed" />
                      {editingEmployee && (
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">{isAr ? 'البريد الإلكتروني مرتبط بتسجيل الدخول' : 'Email is tied to authentication'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                      <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+968 9XXXXXXX" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'القسم المسؤول عنه' : 'Department'}</label>
                      <select value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all cursor-pointer">
                        {getAllDepartments().map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'صلاحية النظام' : 'System Role'}</label>
                      <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all cursor-pointer">
                        <option value="employee">{isAr ? 'موظف قياسي (Standard Employee)' : 'Standard Employee'}</option>
                        <option value="department_head">{isAr ? '⭐ رئيس قسم (Head of Department / HOD)' : '⭐ Department Head (HOD)'}</option>
                        <option value="accountant">{isAr ? 'محاسب (Accountant)' : 'Accountant'}</option>
                        <option value="hr">{isAr ? 'إدارة الموارد البشرية (HR Manager)' : 'HR Manager'}</option>
                        <option value="manager">{isAr ? 'مدير تنفيذي (Executive Manager)' : 'Executive Manager'}</option>
                        <option value="crm">{isAr ? 'علاقات العملاء (CRM Coordinator)' : 'CRM Coordinator'}</option>
                      </select>
                    </div>
                  </div>

                  {formData.role === 'department_head' && (
                    <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 flex items-start gap-3">
                      <ShieldCheck size={20} className="text-[#A11212] flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-gray-800">
                        <p className="font-black text-[#A11212] mb-0.5">
                          {isAr ? 'صلاحيات رئيس القسم (HOD Leadership)' : 'Head of Department Access Granted'}
                        </p>
                        <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                          {isAr 
                            ? 'سيتمكن الموظف من قيادة القسم، توجيه المهام، رقابة الجودة، ومعالجة التأخيرات عبر بوابة HOD.' 
                            : 'This employee will have full management control over work routing, QA approvals, and delay action logging in the HOD Portal.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {!editingEmployee && (
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'كلمة المرور المؤقتة' : 'Temporary Password'}</label>
                      <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all" minLength={6} placeholder="Password@123" />
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors cursor-pointer text-sm">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-[#A11212] hover:bg-red-800 text-white rounded-xl font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md text-sm">
                      {isSubmitting ? (
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        (editingEmployee ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'إضافة الحساب' : 'Create Account'))
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      {deleteModalOpen && employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">{isAr ? 'حذف الموظف نهائياً' : 'Delete Employee Permanently'}</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {isAr 
                ? `هل أنت متأكد من رغبتك في حذف الموظف "${employeeToDelete.name_ar || employeeToDelete.name_en}"؟ سيتم حذف جميع بيانات الملف وسجلات الحضور والإجازات وصلاحيات الدخول نهائياً من النظام.`
                : `Are you sure you want to permanently delete "${employeeToDelete.name_en || employeeToDelete.name_ar}"? This will permanently erase their profile dossier, leave/attendance records, and portal credentials.`}
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => { setDeleteModalOpen(false); setEmployeeToDelete(null); }} 
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteEmployee}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>{isAr ? 'تأكيد الحذف' : 'Confirm Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Configure Placement Modal ────────────────────────────────────── */}
      {selectedPlacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="text-brand-dark" size={20} />
                {isAr ? 'تهيئة وتأكيد تعيين الموظف' : 'Configure New Hire Placement'}
              </h3>
              <button onClick={() => setSelectedPlacement(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmPlacement} className="p-6 overflow-y-auto space-y-4">
              {placementError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertTriangle size={16} />
                  <span>{placementError}</span>
                </div>
              )}

              <div className="bg-brand-dark/5 p-4 rounded-2xl border border-brand-dark/10 space-y-2">
                <p className="text-[10px] font-black text-brand-dark uppercase tracking-wider">{isAr ? 'معلومات التوظيف المقترحة' : 'Suggested Onboarding Details'}</p>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-700 mt-2">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase">{isAr ? 'الاسم الكامل:' : 'Full Name:'}</span>
                    {selectedPlacement.name}
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase">{isAr ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                    {selectedPlacement.email}
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase">{isAr ? 'المسمى الوظيفي المقترح:' : 'Suggested Job title:'}</span>
                    {selectedPlacement.role}
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase">{isAr ? 'القسم المقترح:' : 'Suggested Department:'}</span>
                    {selectedPlacement.dept}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'المسمى الوظيفي الفعلي' : 'Designated Job Position'}</label>
                <select
                  value={placementData.role}
                  onChange={(e) => setPlacementData({ ...placementData, role: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  <option value="Senior Auditor">Senior Auditor</option>
                  <option value="Tax Consultant">Tax Consultant</option>
                  <option value="Junior Associate">Junior Associate</option>
                  <option value="custom">+ Add Custom Position...</option>
                </select>
                {placementData.role === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'اكتب المسمى الوظيفي الفعلي...' : 'Type custom position...'}
                    value={placementData.customRole}
                    onChange={(e) => setPlacementData({ ...placementData, customRole: e.target.value })}
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark animate-scale-up"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'مستوى الصلاحية في النظام' : 'System Access Level'}</label>
                <select
                  value={placementData.accessRole}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    let suggestedTitle = placementData.role;
                    if (newRole === 'department_head') {
                      if (placementData.dept === 'tax_vat') suggestedTitle = 'Head of Tax & VAT';
                      else if (placementData.dept === 'audit') suggestedTitle = 'Head of Audit';
                      else suggestedTitle = 'Head of Bookkeeping';
                    }
                    setPlacementData({
                      ...placementData,
                      accessRole: newRole,
                      role: suggestedTitle,
                      supervisor: newRole === 'department_head' ? 'Executive Board & Management' : placementData.supervisor
                    });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  <option value="employee">{isAr ? 'موظف قياسي (Standard Employee)' : 'Standard Employee'}</option>
                  <option value="department_head">{isAr ? 'رئيس قسم (Department Head / HOD)' : 'Department Head (HOD)'}</option>
                  <option value="accountant">{isAr ? 'محاسب (Accountant)' : 'Accountant'}</option>
                  <option value="hr">{isAr ? 'مدير الموارد البشرية (HR Manager)' : 'HR Manager'}</option>
                  <option value="crm">{isAr ? 'علاقات العملاء (CRM Coordinator)' : 'CRM Coordinator'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'القسم المعين' : 'Designated Department'}</label>
                  <select
                    value={placementData.dept}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      let defaultHOD = 'Nasser Al-Riyami';
                      let autoTitle = placementData.role;
                      if (newDept === 'tax_vat') {
                        defaultHOD = 'Khalfan Al-Abri';
                        if (placementData.accessRole === 'department_head') autoTitle = 'Head of Tax & VAT';
                      } else if (newDept === 'bookkeeping') {
                        defaultHOD = 'Mazis Al-Balushi';
                        if (placementData.accessRole === 'department_head') autoTitle = 'Head of Bookkeeping';
                      } else if (newDept === 'audit') {
                        if (placementData.accessRole === 'department_head') autoTitle = 'Head of Audit';
                      }
                      setPlacementData({
                        ...placementData,
                        dept: newDept,
                        role: autoTitle,
                        supervisor: placementData.accessRole === 'department_head' ? 'Executive Board & Management' : defaultHOD
                      });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    <option value="audit">{isAr ? 'التدقيق (Audit)' : 'Audit'}</option>
                    <option value="tax_vat">{isAr ? 'الضرائب وضريبة القيمة المضافة (Tax & VAT)' : 'Tax & VAT'}</option>
                    <option value="bookkeeping">{isAr ? 'إمساك الدفاتر (Bookkeeping)' : 'Bookkeeping/Others'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'تاريخ مباشرة العمل' : 'Employment Start Date'}</label>
                  <input
                    type="date"
                    required
                    value={placementData.startDate}
                    onChange={(e) => setPlacementData({ ...placementData, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {placementData.accessRole === 'department_head'
                    ? (isAr ? 'جهة التبعية والتقارير' : 'Reporting Authority')
                    : (isAr ? 'المشرف المباشر / رئيس القسم' : 'Immediate Supervisor (HOD)')}
                </label>
                {placementData.accessRole === 'department_head' ? (
                  <input
                    type="text"
                    disabled
                    value={isAr ? 'الإدارة التنفيذية العامة ومجلس الإدارة' : 'Executive Management & Board of Directors'}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-xs font-black text-brand-dark cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={placementData.supervisor}
                    onChange={(e) => setPlacementData({ ...placementData, supervisor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    <option value="Nasser Al-Riyami">{isAr ? 'ناصر الريامي (رئيس قسم التدقيق)' : 'Nasser Al-Riyami (Head of Audit)'}</option>
                    <option value="Khalfan Al-Abri">{isAr ? 'خلفان العبري (رئيس قسم الضرائب)' : 'Khalfan Al-Abri (Head of Tax & VAT)'}</option>
                    <option value="Mazis Al-Balushi">{isAr ? 'مازن البلوشي (رئيس قسم مسك الدفاتر)' : 'Mazis Al-Balushi (Head of Bookkeeping)'}</option>
                  </select>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlacement(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isPlacing}
                  className="flex-1 py-3 bg-[#A11212] text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPlacing ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    isAr ? 'اعتماد وتفعيل الحساب' : 'Approve & Activate'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sleek Floating Toast Notification ─────────────────────────── */}
      {notification.show && (
        <div className="fixed top-6 end-6 z-55 max-w-md w-full animate-slide-down pointer-events-auto" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-gray-100/80 flex items-start gap-3.5 ring-1 ring-black/5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-[#A11212]'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-xs font-black text-gray-900 tracking-tight">
                {notification.title}
              </h4>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed font-medium">
                {notification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── View Employee Details Modal (Dossier) ────────────────────────── */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Users className="text-brand-dark" size={20} />
                {isAr ? 'ملف الموظف التفصيلي الشامل' : 'Comprehensive Employee Dossier'}
              </h3>
              <button
                onClick={() => setViewingEmployee(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Card Summary */}
            <div className="px-6 pt-5 pb-2 flex items-center gap-5 bg-white">
              <div className="w-16 h-16 bg-brand-dark text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-dark/20 flex-shrink-0 animate-scale-up">
                {(isAr ? viewingEmployee.name_ar : viewingEmployee.name_en).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xl font-black text-gray-900 truncate">
                  {isAr ? viewingEmployee.name_ar : viewingEmployee.name_en}
                </h4>
                <p className="text-xs text-gray-550 font-bold truncate mt-1">
                  {viewingEmployee.job_title || 'Senior Auditor'} · {viewingEmployee.department_id === 'tax_vat' ? (isAr ? 'الضرائب وضريبة القيمة المضافة' : 'Tax & VAT') : viewingEmployee.department_id === 'audit' ? (isAr ? 'التدقيق' : 'Audit') : (isAr ? 'مسك الدفاتر' : 'Bookkeeping')}
                </p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-2.5 ${viewingEmployee.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${viewingEmployee.status === 'active' ? 'bg-green-500' : 'bg-orange-500'}`} />
                  {viewingEmployee.status === 'active' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'في إجازة' : 'On Leave')}
                </span>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="px-6 bg-gray-50 border-b border-gray-100 flex gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => { if (!isEditing) setDossierTab('general'); }}
                disabled={isEditing}
                className={`py-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer disabled:opacity-50 ${dossierTab === 'general' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-650'
                  }`}
              >
                {isAr ? 'البيانات الشخصية' : 'Personal Info'}
              </button>
              <button
                onClick={() => { if (!isEditing) setDossierTab('job'); }}
                disabled={isEditing}
                className={`py-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer disabled:opacity-50 ${dossierTab === 'job' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-650'
                  }`}
              >
                {isAr ? 'الوظيفة والقسم' : 'Job & Dept'}
              </button>
              <button
                onClick={() => { if (!isEditing) setDossierTab('financials'); }}
                disabled={isEditing}
                className={`py-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer disabled:opacity-50 ${dossierTab === 'financials' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-650'
                  }`}
              >
                {isAr ? 'المالية والرواتب' : 'Financials'}
              </button>
              <button
                onClick={() => { if (!isEditing) setDossierTab('performance'); }}
                disabled={isEditing}
                className={`py-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer disabled:opacity-50 ${dossierTab === 'performance' ? 'border-brand-dark text-brand-dark' : 'border-transparent text-gray-400 hover:text-gray-650'
                  }`}
              >
                {isAr ? 'الأداء والتقارير' : 'Performance'}
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-[400px] mb-2">

              {/* Error state */}
              {dossierError && (
                <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {dossierError}
                </div>
              )}

              {/* Tab 1: General Info */}
              {dossierTab === 'general' && (
                isEditing ? (
                  <div className="space-y-6 animate-scale-up text-xs font-bold text-gray-650">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'الاسم الكامل:' : 'Full Name:'}</label>
                        <input required type="text" value={editFormData.fullName} onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'رقم الهاتف:' : 'Phone Number:'}</label>
                        <input required type="tel" value={editFormData.phone} onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'رقم الهوية المدنية:' : 'Civil ID:'}</label>
                        <input type="text" value={editFormData.civilId} onChange={e => setEditFormData({ ...editFormData, civilId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'رقم جواز السفر:' : 'Passport No:'}</label>
                        <input type="text" value={editFormData.passportNo} onChange={e => setEditFormData({ ...editFormData, passportNo: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'رقم الإقامة / الكفيل:' : 'Residency Card:'}</label>
                        <input type="text" value={editFormData.residencyNo} onChange={e => setEditFormData({ ...editFormData, residencyNo: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'الجنسية:' : 'Nationality:'}</label>
                        <input type="text" value={editFormData.nationality} onChange={e => setEditFormData({ ...editFormData, nationality: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'تاريخ الميلاد:' : 'Date of Birth:'}</label>
                        <input type="date" value={editFormData.dob} onChange={e => setEditFormData({ ...editFormData, dob: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'الجنس:' : 'Gender:'}</label>
                        <select value={editFormData.gender} onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-dark cursor-pointer">
                          <option value="Male">{isAr ? 'ذكر' : 'Male'}</option>
                          <option value="Female">{isAr ? 'أنثى' : 'Female'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'الحالة الاجتماعية:' : 'Marital Status:'}</label>
                        <select value={editFormData.maritalStatus} onChange={e => setEditFormData({ ...editFormData, maritalStatus: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-dark cursor-pointer">
                          <option value="Single">{isAr ? 'أعزب' : 'Single'}</option>
                          <option value="Married">{isAr ? 'متزوج' : 'Married'}</option>
                          <option value="Divorced">{isAr ? 'مطلق' : 'Divorced'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'حالة السكن الموفر:' : 'Accommodation Status:'}</label>
                        <select value={editFormData.accommodationStatus} onChange={e => setEditFormData({ ...editFormData, accommodationStatus: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-dark cursor-pointer">
                          <option value="Lives with family">{isAr ? 'يسكن مع عائلته' : 'Lives with family'}</option>
                          <option value="Company Accommodation">{isAr ? 'سكن موفر من الشركة' : 'Company Accommodation'}</option>
                          <option value="Rent Allowance">{isAr ? 'بدل سكن نقدي' : 'Rent Allowance'}</option>
                        </select>
                      </div>
                    </div>
                    {editFormData.accommodationStatus === 'Company Accommodation' && (
                      <div className="pt-2">
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'تفاصيل السكن / الغرفة:' : 'Accommodation Details:'}</label>
                        <input type="text" value={editFormData.accommodationDetails} onChange={e => setEditFormData({ ...editFormData, accommodationDetails: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" placeholder="e.g. Room 304, Building B" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-scale-up">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                        <span className="font-bold text-gray-900 select-all">{viewingEmployee.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'رقم الهاتف:' : 'Phone Number:'}</span>
                        <span className="font-bold text-gray-900 select-all">{viewingEmployee.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'رقم الهوية المدنية:' : 'Civil ID Number:'}</span>
                        <span className="font-bold text-gray-900 select-all">{viewingEmployee.civilId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'رقم جواز السفر:' : 'Passport Number:'}</span>
                        <span className="font-bold text-gray-900 select-all">{viewingEmployee.passportNo || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'رقم الإقامة الكفيل:' : 'Residency Card:'}</span>
                        <span className="font-bold text-gray-900 select-all">{viewingEmployee.residencyNo || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'الجنسية:' : 'Nationality:'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.nationality || 'Omani'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'تاريخ الميلاد:' : 'Date of Birth:'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.dob || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'الجنس:' : 'Gender:'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.gender || 'Male'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'الحالة الاجتماعية:' : 'Marital Status:'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.maritalStatus || 'Single'}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 text-xs">
                      <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'نوع السكن وتفاصيله:' : 'Accommodation Details:'}</span>
                      <span className="font-black text-gray-950 block">{viewingEmployee.accommodationStatus}</span>
                      {viewingEmployee.accommodationDetails && (
                        <span className="font-bold text-gray-650 block mt-1 bg-white p-2 rounded-lg border border-gray-100">{viewingEmployee.accommodationDetails}</span>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Tab 2: Job & Department */}
              {dossierTab === 'job' && (
                isEditing ? (
                  <div className="space-y-6 animate-scale-up text-xs font-bold text-gray-655">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'المسمى الوظيفي الفعلي:' : 'Designated Job Position:'}</label>
                        <select value={editFormData.jobTitle} onChange={e => setEditFormData({ ...editFormData, jobTitle: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark cursor-pointer">
                          <option value="Senior Auditor">Senior Auditor</option>
                          <option value="Tax Consultant">Tax Consultant</option>
                          <option value="Junior Associate">Junior Associate</option>
                          <option value="Head of Audit">Head of Audit</option>
                          <option value="Head of Tax & VAT">Head of Tax & VAT</option>
                          <option value="Head of Bookkeeping">Head of Bookkeeping</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'القسم المعين:' : 'Designated Department:'}</label>
                        <select
                          value={editFormData.department_id}
                          onChange={(e) => {
                            const newDept = e.target.value;
                            let defaultHOD = 'Nasser Al-Riyami';
                            if (newDept === 'tax_vat') defaultHOD = 'Khalfan Al-Abri';
                            if (newDept === 'bookkeeping') defaultHOD = 'Mazis Al-Balushi';
                            setEditFormData({
                              ...editFormData,
                              department_id: newDept,
                              immediateSupervisor: defaultHOD
                            });
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark cursor-pointer"
                        >
                          <option value="audit">{isAr ? 'التدقيق (Audit)' : 'Audit'}</option>
                          <option value="tax_vat">{isAr ? 'الضرائب وضريبة القيمة المضافة (Tax & VAT)' : 'Tax & VAT'}</option>
                          <option value="bookkeeping">{isAr ? 'إمساك الدفاتر (Bookkeeping)' : 'Bookkeeping/Others'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'الصلاحية في النظام:' : 'System Access Role:'}</label>
                        <select value={editFormData.accessRole} onChange={e => setEditFormData({ ...editFormData, accessRole: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark cursor-pointer">
                          <option value="employee">{isAr ? 'موظف قياسي' : 'Standard Employee'}</option>
                          <option value="department_head">{isAr ? 'رئيس قسم (HOD)' : 'Department Head (HOD)'}</option>
                          <option value="accountant">{isAr ? 'محاسب' : 'Accountant'}</option>
                          <option value="hr">{isAr ? 'إدارة الموارد البشرية (HR)' : 'HR Manager'}</option>
                          <option value="manager">{isAr ? 'مدير تنفيذي' : 'Executive Manager'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'المشرف المباشر (HOD):' : 'Immediate Supervisor (HOD):'}</label>
                        <select value={editFormData.immediateSupervisor} onChange={e => setEditFormData({ ...editFormData, immediateSupervisor: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark cursor-pointer">
                          <option value="Nasser Al-Riyami">Nasser Al-Riyami (Head of Audit)</option>
                          <option value="Khalfan Al-Abri">Khalfan Al-Abri (Head of Tax & VAT)</option>
                          <option value="Mazis Al-Balushi">Mazis Al-Balushi (Head of Bookkeeping)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'تاريخ التوظيف:' : 'Joined Date:'}</label>
                        <input type="date" value={editFormData.joinedDate} onChange={e => setEditFormData({ ...editFormData, joinedDate: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'تصنيف الموظف:' : 'Employee Type:'}</label>
                        <select value={editFormData.employeeType} onChange={e => setEditFormData({ ...editFormData, employeeType: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark cursor-pointer">
                          <option value="Experienced">{isAr ? 'خبرة' : 'Experienced'}</option>
                          <option value="Trainee">{isAr ? 'متدرب' : 'Trainee'}</option>
                          <option value="Temporary">{isAr ? 'مؤقت' : 'Temporary'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-scale-up">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'القسم المعين:' : 'Designated Department:'}</span>
                        <span className="font-bold text-gray-900 capitalize">
                          {viewingEmployee.department_id === 'tax_vat' ? 'Tax & VAT' : viewingEmployee.department_id === 'audit' ? 'Audit' : 'Bookkeeping/Others'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'المسمى الوظيفي الفعلي:' : 'Job Position Title:'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.job_title || 'Senior Auditor'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'المشرف المباشر (HOD):' : 'Immediate Supervisor (HOD):'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.immediateSupervisor || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'مستوى الصلاحية في النظام:' : 'System Access Role:'}</span>
                        <span className="font-bold text-brand-dark capitalize">{viewingEmployee.role}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'تاريخ التوظيف:' : 'Joined Date:'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.joinedAt || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold mb-0.5">{isAr ? 'تصنيف الموظف:' : 'Employee Classification:'}</span>
                        <span className="font-bold text-gray-900">{viewingEmployee.type || 'Experienced'}</span>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Tab 3: Financials & Allowances */}
              {dossierTab === 'financials' && (
                isEditing ? (
                  <div className="space-y-6 animate-scale-up text-xs font-bold text-gray-655">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'الراتب الأساسي (ريال):' : 'Basic Salary (OMR):'}</label>
                        <input type="number" value={editFormData.basicSalary} onChange={e => setEditFormData({ ...editFormData, basicSalary: Number(e.target.value) })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'بدل النقل (ريال):' : 'Transport Allowance (OMR):'}</label>
                        <input type="number" value={editFormData.transportAllowance} onChange={e => setEditFormData({ ...editFormData, transportAllowance: Number(e.target.value) })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'بدل السكن (ريال):' : 'Housing Allowance (OMR):'}</label>
                        <input type="number" value={editFormData.housingAllowance} onChange={e => setEditFormData({ ...editFormData, housingAllowance: Number(e.target.value) })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'بدلات أخرى (ريال):' : 'Other Allowance (OMR):'}</label>
                        <input type="number" value={editFormData.otherAllowance} onChange={e => setEditFormData({ ...editFormData, otherAllowance: Number(e.target.value) })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-scale-up">
                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 space-y-4">
                      <h4 className="text-xs font-black text-brand-dark uppercase tracking-widest border-b border-gray-200 pb-2">
                        {isAr ? 'تفاصيل الراتب والبدلات الشهري' : 'Monthly Salary Structure'}
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-505 font-bold">{isAr ? 'الراتب الأساسي:' : 'Basic Salary:'}</span>
                          <span className="font-black text-gray-900">OMR {viewingEmployee.basicSalary || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-550 font-bold">{isAr ? 'بدل النقل:' : 'Transport Allowance:'}</span>
                          <span className="font-bold text-gray-900">OMR {viewingEmployee.allowances?.transport || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-550 font-bold">{isAr ? 'بدل السكن:' : 'Housing Allowance:'}</span>
                          <span className="font-bold text-gray-900">OMR {viewingEmployee.allowances?.housing || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-550 font-bold">{isAr ? 'بدلات أخرى:' : 'Other Allowances:'}</span>
                          <span className="font-bold text-gray-900">OMR {viewingEmployee.allowances?.other || 0}</span>
                        </div>
                        <div className="h-px bg-gray-200 my-2" />
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                          <span className="text-gray-900 font-black">{isAr ? 'إجمالي الراتب المستحق:' : 'Total Monthly Salary:'}</span>
                          <span className="text-base font-black text-brand-dark">
                            OMR {(viewingEmployee.basicSalary || 0) + (viewingEmployee.allowances?.transport || 0) + (viewingEmployee.allowances?.housing || 0) + (viewingEmployee.allowances?.other || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Tab 4: Performance & Lists */}
              {dossierTab === 'performance' && (
                <div className="space-y-6 animate-scale-up">
                  {/* Task metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 text-center">
                      <span className="text-2xl font-black text-brand-dark">{viewingEmployee.tasksCompleted || 0}</span>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1.5">{isAr ? 'المهام المكتملة' : 'Tasks Completed'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 text-center">
                      <span className="text-2xl font-black text-orange-600">{viewingEmployee.activeJobs || 0}</span>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1.5">{isAr ? 'المهام النشطة' : 'Active Jobs'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 text-center">
                      <span className="text-2xl font-black text-red-600">{viewingEmployee.delays || 0}</span>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1.5">{isAr ? 'حالات التأخير' : 'Delays'}</p>
                    </div>
                  </div>

                  {/* Completion Rate */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700">{isAr ? 'معدل إكمال المهام الكلي' : 'Overall Task Completion Rate'}</span>
                      <span className="text-xs font-black text-brand-dark">{viewingEmployee.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-dark h-full rounded-full transition-all duration-500"
                        style={{ width: `${viewingEmployee.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Corporate Records lists */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150">
                      <h6 className="font-black text-gray-900 border-b border-gray-200 pb-1.5 mb-2">{isAr ? 'التعليم والتأهيل' : 'Education'}</h6>
                      {viewingEmployee.education && viewingEmployee.education.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {viewingEmployee.education.map((edu: any, i: number) => (
                            <li key={i}>{edu.degree} - {edu.school}</li>
                          ))}
                        </ul>
                      ) : <p className="text-gray-400 italic">{isAr ? 'لا يوجد سجلات' : 'No records uploaded'}</p>}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150">
                      <h6 className="font-black text-gray-900 border-b border-gray-200 pb-1.5 mb-2">{isAr ? 'الترقيات والعلاوات الاستثنائية' : 'Promotions & History'}</h6>
                      {viewingEmployee.promotions && viewingEmployee.promotions.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {viewingEmployee.promotions.map((p: any, i: number) => (
                            <li key={i}>{p.title} ({p.date})</li>
                          ))}
                        </ul>
                      ) : <p className="text-gray-400 italic">{isAr ? 'لا يوجد ترقيات سابقة' : 'No previous promotions'}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      if (viewingEmployee) {
                        setEditFormData({
                          fullName: viewingEmployee.name_en || '',
                          phone: viewingEmployee.phone || '',
                          civilId: viewingEmployee.civilId || '',
                          passportNo: viewingEmployee.passportNo || '',
                          residencyNo: viewingEmployee.residencyNo || '',
                          nationality: viewingEmployee.nationality || 'Omani',
                          dob: viewingEmployee.dob || '',
                          gender: viewingEmployee.gender || 'Male',
                          maritalStatus: viewingEmployee.maritalStatus || 'Single',
                          jobTitle: viewingEmployee.job_title || 'Senior Auditor',
                          department_id: viewingEmployee.department_id || 'audit',
                          accessRole: viewingEmployee.role || 'employee',
                          immediateSupervisor: viewingEmployee.immediateSupervisor || 'Nasser Al-Riyami',
                          joinedDate: viewingEmployee.joinedAt || '',
                          employeeType: viewingEmployee.type || 'Experienced',
                          accommodationStatus: viewingEmployee.accommodationStatus || 'Lives with family',
                          accommodationDetails: viewingEmployee.accommodationDetails || '',
                          basicSalary: viewingEmployee.basicSalary || 0,
                          transportAllowance: viewingEmployee.allowances?.transport || 0,
                          housingAllowance: viewingEmployee.allowances?.housing || 0,
                          otherAllowance: viewingEmployee.allowances?.other || 0
                        });
                      }
                    }}
                    className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-750 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveDossierChanges}
                    disabled={isSavingDossier}
                    className="px-6 py-2.5 bg-[#A11212] hover:bg-[#800e0e] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingDossier ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      isAr ? 'حفظ التغييرات' : 'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <>
                  {dossierTab !== 'performance' ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-5 py-2.5 bg-brand-dark hover:bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil size={12} />
                      {isAr ? 'تعديل البيانات' : 'Edit Profile'}
                    </button>
                  ) : <div />}
                  <button
                    onClick={() => setViewingEmployee(null)}
                    className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-750 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {isAr ? 'إغلاق' : 'Close'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
