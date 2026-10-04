import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import {
  syncRecruitsFromSupabase,
  getLocalRecruits,
  saveLocalRecruits,
  updateRecruitStatus,
  deleteLocalRecruit,
  invokeEdgeFunctionWithTimeout,
  DEFAULT_OFFERED_RECRUITS
} from '../../utils/recruitmentSync';
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
  Sparkles,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { getAllDepartments, getDepartmentById, getJobPositionsByDepartment } from '../../config/departments';
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
  secondaryRoles?: string[];
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
    role: 'Accountant',
    customRole: '',
    dept: 'tax_vat',
    customDept: '',
    supervisor: 'Khalfan Al-Abri (Head of Tax & VAT)',
    customSupervisor: '',
    startDate: '',
    accessRole: 'accountant',
    secondaryRoles: ['employee', 'accountant'],
    isHOD: false
  });
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{
    show: boolean;
    name: string;
    email: string;
    password: string;
    role: string;
    dept: string;
    supervisor: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
  };

  const handleIssueOrResetCredentials = async (emp: any) => {
    const newTempPassword = 'Welcome@' + Math.floor(1000 + Math.random() * 9000);
    const cleanEmail = (emp.email || '').trim().toLowerCase();

    // Call manage-auth to update password in Supabase Auth directly
    try {
      await supabase.functions.invoke('manage-auth', {
        body: {
          email: cleanEmail,
          password: newTempPassword,
          full_name: emp.name_en || emp.name_ar,
          role: emp.role,
          department_id: emp.department_id,
          secondary_roles: emp.secondary_roles || []
        }
      });
    } catch (e) {
      console.warn('manage-auth invoke notice:', e);
    }

    setCredentialsModal({
      show: true,
      name: emp.name_en || emp.name_ar,
      email: cleanEmail,
      password: newTempPassword,
      role: emp.job_title || emp.role,
      dept: emp.department_id || 'Bookkeeping',
      supervisor: emp.immediateSupervisor || 'Executive Management & Board of Directors'
    });
  };
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
      const [dbRecruits, { data: profiles }] = await Promise.all([
        syncRecruitsFromSupabase(),
        supabase.from('profiles').select('id, email, role')
      ]);

      const activeProfileEmails = new Set(
        (profiles || [])
          .filter(p => p.role && p.role !== 'client')
          .map(p => (p.email || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const activeProfileIds = new Set((profiles || []).filter(p => p.role && p.role !== 'client').map(p => p.id));

      const localRecruits = getLocalRecruits();
      const mergedMap = new Map<string, any>();
      localRecruits.forEach(r => {
        const k = (r.id || r.email || '').toLowerCase().trim();
        if (k) mergedMap.set(k, r);
      });
      if (Array.isArray(dbRecruits)) {
        dbRecruits.forEach(r => {
          const k = (r.id || r.email || '').toLowerCase().trim();
          if (k) mergedMap.set(k, r);
        });
      }

      const recruits: any[] = Array.from(mergedMap.values());

      const filtered = recruits.filter((c: any) => {
        // Must NOT be placed
        if (c.placement_status === 'placed') return false;

        const cEmail = (c.email || '').trim().toLowerCase();
        const cId = c.id;

        // If candidate already exists as an active staff profile in profiles, they have already been placed
        if (cEmail && activeProfileEmails.has(cEmail)) return false;
        if (cId && activeProfileIds.has(cId)) return false;

        return true;
      });

      setPendingPlacements(filtered);
    } catch (err) {
      console.error('Error fetching pending placements:', err);
      const local = getLocalRecruits();
      setPendingPlacements(local.filter((c: any) =>
        (c.stage === 'offered' || c.placement_status === 'pending_placement') &&
        c.placement_status !== 'placed'
      ));
    } finally {
      setLoadingPlacements(false);
    }
  }, []);

  useEffect(() => {
    fetchPlacements();

    const handleSyncEvent = () => fetchPlacements();
    window.addEventListener('maisarah_recruits_updated', handleSyncEvent);

    // Supabase Realtime subscription for instant updates across manager sessions
    const channel = supabase
      .channel('manager_placements_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_recruits' }, () => {
        fetchPlacements();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_employees' }, () => {
        fetchPlacements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('maisarah_recruits_updated', handleSyncEvent);
    };
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
    jobTitle: 'Auditor',
    department_id: 'audit',
    secondaryRoles: ['employee'] as string[]
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

      // Helper for robust department normalization
      const getNormalizedDepartmentId = (rawDept: any, role: string = '', jobTitle: string = ''): string => {
        const d = String(rawDept || '').toLowerCase().trim();
        const r = String(role || '').toLowerCase().trim();
        const t = String(jobTitle || '').toLowerCase().trim();

        if (d.includes('manage') || d.includes('execut') || r === 'manager' || t.includes('executive') || t.includes('manager')) return 'management';
        if (d.includes('hr') || d.includes('human') || d.includes('support') || d.includes('admin') || r === 'hr' || t.includes('hr')) return 'internal_support';
        if (d.includes('innovat') || d.includes('tech') || d.includes('dev')) return 'innovation_dev';
        if (d.includes('crm') || d.includes('client') || d.includes('success')) return 'client_success';
        if (d.includes('tax') || d.includes('vat')) return 'tax_vat';
        if (d.includes('book') || d.includes('ledger') || d.includes('account')) return 'bookkeeping';
        if (d.includes('advis') || d.includes('consult')) return 'business_advisory';
        if (d.includes('audit')) return 'audit';

        if (r === 'manager' || t.includes('executive')) return 'management';
        if (r === 'hr' || t.includes('hr')) return 'internal_support';
        if (r === 'crm' || t.includes('client')) return 'client_success';
        if (r === 'accountant') return 'bookkeeping';

        return 'audit';
      };

      // Map DB profiles to Employee interface, joining with hr_employees details
      const mapped: Employee[] = (profiles || []).map(p => {
        const hrEmp = (hrEmployees || []).find(h => h.id === p.id || (h.email && p.email && h.email.toLowerCase() === p.email.toLowerCase()));

        // Mock stats for completion rate if not present
        const total = Math.floor(Math.random() * 40 + 10);
        const done = Math.floor(total * (0.5 + Math.random() * 0.5));

        // Normalize department
        let rawDept = p.department_id || p.department || hrEmp?.department_id || hrEmp?.dept || '';
        let normalizedDept = getNormalizedDepartmentId(rawDept, p.role || hrEmp?.role, hrEmp?.role);

        const realPhone = hrEmp?.phone || p.phone || '';
        const secRoles = Array.isArray(p.secondary_roles) ? p.secondary_roles : (Array.isArray(hrEmp?.secondary_roles) ? hrEmp.secondary_roles : []);

        const resolvedJobTitle = hrEmp?.role || (
          p.role === 'manager' ? 'Operations & Executive Manager' :
            p.role === 'hr' ? 'HR Specialist' :
              p.role === 'crm' ? 'Client Relationship Officer' :
                p.role === 'department_head' ? 'Department Head (HOD)' :
                  p.role === 'accountant' ? 'Senior Accountant' : 'Staff Member'
        );

        return {
          id: p.id,
          name_en: hrEmp?.full_name || p.full_name || p.name || 'Unknown',
          name_ar: p.full_name || hrEmp?.full_name || 'غير معروف',
          email: p.email || hrEmp?.email || '',
          phone: realPhone,
          role: p.role || 'employee', // access role
          job_title: resolvedJobTitle,
          secondaryRoles: secRoles,
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

      // Also add any hr_employees that didn't have profiles (excluding pending placement candidates)
      for (const h of hrEmployees || []) {
        if (h.status === 'pending_placement' || h.role === 'Pending Assignment') continue;
        if (h.email && !mapped.some(m => m.id === h.id || (m.email && m.email.toLowerCase() === h.email.toLowerCase()))) {
          let rawDept = h.department_id || h.dept || '';
          const resolvedAccessRole = h.accessRole || h.role || 'employee';
          let normalizedDept = getNormalizedDepartmentId(rawDept, resolvedAccessRole, h.role);

          const resolvedJobTitle = h.role || (
            resolvedAccessRole === 'manager' ? 'Operations & Executive Manager' :
              resolvedAccessRole === 'hr' ? 'HR Specialist' :
                resolvedAccessRole === 'crm' ? 'Client Relationship Officer' :
                  resolvedAccessRole === 'department_head' ? 'Department Head (HOD)' : 'Staff Member'
          );

          mapped.push({
            id: h.id || crypto.randomUUID(),
            name_en: h.full_name || 'Staff Member',
            name_ar: h.full_name || 'موظف',
            email: h.email,
            phone: h.phone || '',
            role: resolvedAccessRole,
            job_title: resolvedJobTitle,
            secondaryRoles: Array.isArray(h.secondary_roles) ? h.secondary_roles : [],
            status: h.status || 'active',
            tasksCompleted: 10,
            activeJobs: 3,
            delays: 0,
            completionRate: 85,
            joinedAt: h.joined_date || new Date().toISOString().split('T')[0],
            department_id: normalizedDept,
            civilId: h.civil_id || '',
            passportNo: h.passport_no || '',
            residencyNo: h.residency_no || '',
            nationality: h.nationality || 'Omani',
            dob: h.dob || '',
            gender: h.gender || 'Male',
            maritalStatus: h.marital_status || 'Single',
            immediateSupervisor: h.immediate_supervisor || 'General Manager (Operations & Finance)',
            basicSalary: Number(h.basic_salary || 1000),
            type: h.employee_type || 'Experienced',
            accommodationStatus: h.accommodation_status || 'Lives with family',
            accommodationDetails: h.accommodation_details || '',
            allowances: h.allowances || { transport: 150, housing: 250, other: 50 },
            education: h.education || [],
            experience: h.experience || [],
            family: h.family || [],
            emergencyContact: h.emergency_contact || { name: '', relation: '', phone: '' },
            promotions: h.promotions || [],
            disciplinaries: h.disciplinaries || [],
            bonuses: h.bonuses || []
          });
        }
      }

      // Also include placed candidates from hr_recruits & local placed cache
      try {
        const dbRecruits = await syncRecruitsFromSupabase();
        const localPlaced: any[] = JSON.parse(localStorage.getItem('maisarah_placed_employees') || '[]');
        const allPlacedSources = [...(dbRecruits || []), ...localPlaced];

        for (const p of allPlacedSources) {
          if (p.placement_status === 'placed' || p.status === 'active') {
            const pEmail = (p.email || '').trim().toLowerCase();
            if (pEmail && !mapped.some(m => m.id === p.id || (m.email && m.email.toLowerCase() === pEmail))) {
              let rawDept = p.department_id || p.dept || '';
              const resolvedAccessRole = p.accessRole || (p.role?.toLowerCase().includes('head') ? 'department_head' : p.role?.toLowerCase().includes('hr') ? 'hr' : p.role?.toLowerCase().includes('crm') ? 'crm' : p.role?.toLowerCase().includes('accountant') ? 'accountant' : 'employee');
              let normalizedDept = getNormalizedDepartmentId(rawDept, resolvedAccessRole, p.role);

              mapped.push({
                id: p.id || crypto.randomUUID(),
                name_en: p.name || p.full_name || 'Placed Employee',
                name_ar: p.full_name || p.name || 'موظف',
                email: pEmail,
                phone: p.phone || '',
                role: resolvedAccessRole,
                job_title: p.role || p.job_title || 'Staff Member',
                secondaryRoles: Array.isArray(p.secondary_roles) ? p.secondary_roles : [resolvedAccessRole, 'employee'],
                status: 'active',
                tasksCompleted: 12,
                activeJobs: 2,
                delays: 0,
                completionRate: 90,
                joinedAt: p.joined_date || (p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                department_id: normalizedDept,
                civilId: p.civil_id || '',
                passportNo: p.passport_no || '',
                residencyNo: p.residency_no || '',
                nationality: p.nationality || 'Omani',
                dob: p.dob || '',
                gender: p.gender || 'Male',
                maritalStatus: p.marital_status || 'Single',
                immediateSupervisor: p.supervisor || p.immediate_supervisor || 'Executive Management & Board of Directors',
                basicSalary: Number(p.basic_salary || 1000),
                type: p.employment_type || 'Experienced',
                accommodationStatus: p.accommodation_status || 'Lives with family',
                accommodationDetails: '',
                allowances: p.allowances || { transport: 150, housing: 250, other: 50 },
                education: p.education || [],
                experience: p.experience || [],
                family: [],
                emergencyContact: p.emergency_contact || { name: '', relation: '', phone: '' },
                promotions: [],
                disciplinaries: [],
                bonuses: []
              });
            }
          }
        }
      } catch (pErr) {
        console.warn('Placed recruits merge notice in fetchEmployees:', pErr);
      }

      // Filter out Executive manager profile in employee directory view
      setEmployees(mapped.filter(emp => emp.email !== 'manager@maisarah.om'));
    } catch (err: any) {
      console.error('Error fetching live employees, using offline fallback:', err);
      try {
        const localPlaced: any[] = JSON.parse(localStorage.getItem('maisarah_placed_employees') || '[]');
        const hrRecords: any[] = JSON.parse(localStorage.getItem('hr_employee_records') || '[]');
        const combined = [...localPlaced, ...hrRecords].filter(emp => emp.email !== 'manager@maisarah.om');
        setEmployees(combined);
      } catch {}
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();

    const handleEmpUpdated = () => fetchEmployees(true);
    window.addEventListener('maisarah_employees_updated', handleEmpUpdated);

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
          fetchPlacements();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hr_recruits' },
        () => {
          fetchPlacements();
          fetchEmployees(true);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('maisarah_employees_updated', handleEmpUpdated);
      supabase.removeChannel(channel);
    };
  }, [fetchEmployees, fetchPlacements]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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
        // 1. Unassign foreign keys safely
        try { await supabase.from('services').update({ employee_id: null }).eq('employee_id', id); } catch { }
        try { await supabase.from('clients').update({ assigned_employee_id: null }).eq('assigned_employee_id', id); } catch { }

        // 2. Clean up child tables safely
        try { await supabase.from('hr_leave_requests').delete().eq('employee_id', id); } catch { }
        try { await supabase.from('hr_leave_balances').delete().eq('employee_id', id); } catch { }
        try { await supabase.from('hr_attendance').delete().eq('employee_id', id); } catch { }

        // 3. Delete from hr_employees & profiles
        try { await supabase.from('hr_employees').delete().eq('id', id); } catch (e) { console.warn('HR employee deletion notice:', e); }
        try { await supabase.from('profiles').delete().eq('id', id); } catch (e) { console.warn('Profile deletion notice:', e); }

        // 4. Delete from Supabase Auth via manage-auth edge function
        try {
          await supabase.functions.invoke('manage-auth', {
            body: {
              action: 'delete',
              user_id: id,
              email: employeeToDelete.email
            }
          });
        } catch (aErr) {
          console.warn('manage-auth delete notice:', aErr);
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

    // 3. Clean up localStorage caches & add to deleted blacklist
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('maisarah_deleted_employees') || '[]');
      if (id && !deletedList.includes(id)) deletedList.push(id);
      if (employeeToDelete.email && !deletedList.includes(employeeToDelete.email.trim().toLowerCase())) deletedList.push(employeeToDelete.email.trim().toLowerCase());
      if (empName && !deletedList.includes(empName.trim().toLowerCase())) deletedList.push(empName.trim().toLowerCase());
      localStorage.setItem('maisarah_deleted_employees', JSON.stringify(deletedList));

      deleteLocalRecruit(id);
      if (employeeToDelete.email) deleteLocalRecruit(employeeToDelete.email);
      if (empName) deleteLocalRecruit(empName);

      const rawCache = localStorage.getItem('hr_employee_records');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        const filtered = parsed.filter((e: any) => e.id !== id && e.name !== empName && e.name_en !== empName && e.email !== employeeToDelete.email);
        localStorage.setItem('hr_employee_records', JSON.stringify(filtered));
      }
      const rawPlaced = localStorage.getItem('maisarah_placed_employees');
      if (rawPlaced) {
        const parsedPlaced = JSON.parse(rawPlaced);
        const filteredPlaced = parsedPlaced.filter((e: any) => e.id !== id && e.email !== employeeToDelete.email);
        localStorage.setItem('maisarah_placed_employees', JSON.stringify(filteredPlaced));
      }
      const rawRecruits = localStorage.getItem('maisarah_hr_recruits_v1');
      if (rawRecruits) {
        const parsedRecruits = JSON.parse(rawRecruits);
        const filteredRecruits = parsedRecruits.filter((e: any) => e.id !== id && e.email !== employeeToDelete.email);
        localStorage.setItem('maisarah_hr_recruits_v1', JSON.stringify(filteredRecruits));
      }
    } catch (cErr) {
      console.warn('Cache cleanup error:', cErr);
    } finally {
      setIsSubmitting(false);
      setEmployeeToDelete(null);
      window.dispatchEvent(new CustomEvent('maisarah_recruits_updated'));
      window.dispatchEvent(new CustomEvent('maisarah_employees_updated'));
    }
  };

  const handleOpenPlacementModal = (placement: any) => {
    setSelectedPlacement(placement);

    const rawDept = String(placement.dept || '').toLowerCase();
    const allDepts = getAllDepartments();
    const matched = (rawDept && !rawDept.includes('pending'))
      ? allDepts.find(d =>
          d.id.toLowerCase() === rawDept ||
          d.name.toLowerCase() === rawDept ||
          rawDept.includes(d.id.toLowerCase()) ||
          rawDept.includes(d.name.toLowerCase()) ||
          (rawDept.includes('client') && d.id === 'client_success') ||
          (rawDept.includes('crm') && d.id === 'client_success') ||
          (rawDept.includes('advis') && d.id === 'business_advisory') ||
          (rawDept.includes('tax') && d.id === 'tax_vat') ||
          (rawDept.includes('audit') && d.id === 'audit') ||
          (rawDept.includes('book') && d.id === 'bookkeeping') ||
          (rawDept.includes('hr') && d.id === 'internal_support') ||
          (rawDept.includes('innovat') && d.id === 'innovation_dev')
        )
      : null;
    const defaultDept = matched ? matched.id : 'audit';

    const matchingHOD = employees.find(emp => {
      const isHead = emp.role === 'department_head' || emp.job_title?.toLowerCase().includes('head');
      const empDept = String(emp.department_id || '').toLowerCase();
      return isHead && (empDept.includes(defaultDept) || defaultDept.includes(empDept));
    });

    const defaultHOD = matchingHOD
      ? `${matchingHOD.name_en} (${matchingHOD.job_title})`
      : 'General Manager (Operations & Finance)';

    const suggestedRole = (placement.role && !placement.role.toLowerCase().includes('pending'))
      ? placement.role
      : (getJobPositionsByDepartment(defaultDept)[0] || 'Senior Auditor');

    let derivedAccessRole: 'employee' | 'accountant' | 'department_head' | 'hr' | 'manager' | 'crm' = 'employee';
    const sLower = (suggestedRole || '').toLowerCase();
    const dLower = (defaultDept || '').toLowerCase();

    if (sLower.includes('head') || sLower.includes('hod') || sLower.includes('director')) {
      derivedAccessRole = 'department_head';
    } else if (sLower.includes('manager') || dLower.includes('management')) {
      derivedAccessRole = 'manager';
    } else if (sLower.includes('accountant') || dLower.includes('bookkeeping') || dLower.includes('tax')) {
      derivedAccessRole = 'accountant';
    } else if (sLower.includes('hr') || dLower.includes('internal_support')) {
      derivedAccessRole = 'hr';
    } else if (sLower.includes('crm') || sLower.includes('client') || dLower.includes('client_success')) {
      derivedAccessRole = 'crm';
    }

    setPlacementData({
      role: suggestedRole,
      customRole: '',
      dept: defaultDept,
      customDept: '',
      supervisor: defaultHOD,
      customSupervisor: '',
      startDate: new Date().toISOString().split('T')[0],
      accessRole: derivedAccessRole,
      secondaryRoles: Array.from(new Set(['employee', derivedAccessRole])),
      isHOD: derivedAccessRole === 'department_head'
    });
    setPlacementError(null);
  };

  const handleConfirmPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlacement) return;
    setIsPlacing(true);
    setPlacementError(null);

    const tempPassword = 'Welcome@' + Math.floor(1000 + Math.random() * 9000);
    const targetDeptKey = placementData.dept === 'custom' 
      ? (placementData.customDept || 'Operations') 
      : (placementData.dept === 'Pending Department' ? 'audit' : placementData.dept);
    
    const targetDeptObj = getAllDepartments().find(d => d.id === targetDeptKey);
    const targetDeptName = targetDeptObj 
      ? targetDeptObj.name 
      : (targetDeptKey === 'tax_vat' ? 'Tax & VAT' : targetDeptKey === 'audit' ? 'Audit' : targetDeptKey === 'bookkeeping' ? 'Bookkeeping' : targetDeptKey === 'internal_support' ? 'Internal Support & Administration' : targetDeptKey === 'client_success' ? 'Client Success' : targetDeptKey === 'innovation_dev' ? 'Innovation & Development' : targetDeptKey === 'business_advisory' ? 'Business Advisory' : targetDeptKey);
    
    const finalRole = placementData.role === 'custom' 
      ? (placementData.customRole || 'Staff Member') 
      : (placementData.role === 'Pending Assignment' ? (getJobPositionsByDepartment(targetDeptKey)[0] || 'Senior Auditor') : placementData.role);

    // Effective access role (if isHOD is true and accessRole is standard employee, assign department_head; otherwise preserve chosen portal access role)
    const effectiveRole = (placementData.isHOD && placementData.accessRole === 'employee')
      ? 'department_head'
      : placementData.accessRole;
    const finalSupervisor = (placementData.isHOD || placementData.accessRole === 'department_head')
      ? 'Executive Management & Board of Directors'
      : (placementData.supervisor === 'custom' ? (placementData.customSupervisor || 'General Manager') : placementData.supervisor);

    const userId: string = crypto.randomUUID();
    const cleanEmail = selectedPlacement.email.trim().toLowerCase();
    const fullSecondaryRoles = Array.from(new Set([effectiveRole, ...(placementData.secondaryRoles || [])]));

    const newEmployeeRecord = {
      id: userId,
      full_name: selectedPlacement.name,
      email: selectedPlacement.email,
      phone: selectedPlacement.phone || '+968 9000 0000',
      role: finalRole,
      accessRole: effectiveRole,
      secondary_roles: fullSecondaryRoles,
      dept: targetDeptName,
      department_id: targetDeptKey,
      employee_type: selectedPlacement.employment_type || 'Experienced',
      joined_date: placementData.startDate || new Date().toISOString().split('T')[0],
      immediate_supervisor: finalSupervisor,
      status: 'active',
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
    };

    const activePlacement = selectedPlacement;

    try {
      // ═══════════════════════════════════════════════════════════════
      // LAYER 1 — INSTANT DB WRITES (~200ms, critical path only)
      // These are the only awaited operations. Once done, UI unlocks.
      // ═══════════════════════════════════════════════════════════════

      // 1a. Mark recruit as placed in hr_recruits
      const { error: recruitUpdateErr } = await supabase
        .from('hr_recruits')
        .update({
          placement_status: 'placed',
          role: finalRole,
          dept: targetDeptName
        })
        .or(`id.eq.${activePlacement.id},email.eq.${cleanEmail}`);

      if (recruitUpdateErr) {
        console.warn('Direct recruit status update notice:', recruitUpdateErr.message);
      }

      // 1b. Upsert into hr_employees so employee appears in roster immediately
      await supabase.from('hr_employees').upsert({
        id: userId,
        full_name: activePlacement.name,
        email: cleanEmail,
        phone: activePlacement.phone || '',
        dept: targetDeptName,
        department_id: targetDeptKey,
        role: finalRole,
        secondary_roles: fullSecondaryRoles,
        status: 'active',
        basic_salary: Number(activePlacement.basic_salary || 0),
        joined_date: placementData.startDate || new Date().toISOString().split('T')[0],
        immediate_supervisor: finalSupervisor,
        employee_type: activePlacement.employment_type || 'Experienced',
        civil_id: activePlacement.civil_id || '',
        passport_no: activePlacement.passport_no || '',
        residency_no: activePlacement.residency_no || '',
        nationality: activePlacement.nationality || 'Omani'
      }, { onConflict: 'email' }).catch((hrErr: any) => console.warn('hr_employees upsert notice:', hrErr));

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2 — ZERO-WAIT UI UPDATE (instant, ~0ms)
      // Spinner closes and credentials modal opens BEFORE auth/email.
      // ═══════════════════════════════════════════════════════════════
      setIsPlacing(false);
      setPendingPlacements(prev => prev.filter(p => p.id !== activePlacement.id && p.email?.toLowerCase() !== cleanEmail));
      setSelectedPlacement(null);

      // Credentials always available in modal — safe fallback even if email fails
      setCredentialsModal({
        show: true,
        name: activePlacement.name,
        email: activePlacement.email,
        password: tempPassword,
        role: finalRole,
        dept: targetDeptName,
        supervisor: finalSupervisor
      });

      setNotification({
        show: true,
        title: isAr ? 'تم تأكيد التعيين ✓' : 'Placement Confirmed ✓',
        message: isAr
          ? `تم تسكين ${activePlacement.name} بنجاح. جارٍ إرسال البريد والصلاحيات في الخلفية.`
          : `${activePlacement.name} placed! Auth & welcome email dispatching in background.`,
        type: 'success'
      });

      window.dispatchEvent(new CustomEvent('maisarah_recruits_updated'));
      window.dispatchEvent(new CustomEvent('maisarah_employees_updated'));
      Promise.allSettled([fetchEmployees(true), fetchPlacements()]);

      // ═══════════════════════════════════════════════════════════════
      // LAYER 3 — BACKGROUND TASKS (fire-and-forget, never blocks UI)
      // 5-second hard timeout per task. Failures are logged silently.
      // The credentials modal above is always the safe copy-paste fallback.
      // ═══════════════════════════════════════════════════════════════
      const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('bg-timeout')), ms))]);

      const portalLoginUrl = `${window.location.origin}/login`;
      const bgEmailBody = {
        to: activePlacement.email,
        subject: isAr
          ? `مرحباً بك في مجموعة ميسرة - تفاصيل التعيين وحسابك بالبوابة الإلكترونية`
          : `Welcome to Maisarah Group - Placement Details & Portal Access`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;direction:${isAr?'rtl':'ltr'};text-align:${isAr?'right':'left'};font-size:14px;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;background:#fff"><div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #f3f4f6"><h2 style="color:#A11212;margin:0;font-size:20px;font-weight:800">${isAr?'مجموعة ميسرة للاستشارات المالية والتدقيق':'Maisarah Financial & Auditing Group'}</h2><p style="color:#6b7280;font-size:12px;margin-top:4px;font-weight:600">${isAr?'إشعار اعتماد التعيين وتفعيل حساب الموظف':'Placement Confirmation & Portal Activation'}</p></div><p style="font-size:15px">${isAr?'عزيزي/عزيزتي':'Dear'} <strong>${activePlacement.name}</strong>,</p><p>${isAr?'يسعدنا انضمامك إلى فريق مجموعة ميسرة. تم اعتماد تعيينك وتفعيل حسابك في بوابة الموظفين.':'We are pleased to welcome you to Maisarah Group. Your placement is approved and your Employee Portal account is active.'}</p><div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0"><h4 style="margin:0 0 10px;color:#374151;font-size:13px;font-weight:700">${isAr?'تفاصيل التعيين:':'Placement Details:'}</h4><p style="margin:4px 0;font-size:13px"><strong>${isAr?'القسم:':'Department:'}</strong> ${targetDeptName}</p><p style="margin:4px 0;font-size:13px"><strong>${isAr?'المسمى الوظيفي:':'Job Title:'}</strong> ${finalRole}</p><p style="margin:4px 0;font-size:13px"><strong>${isAr?'المشرف:':'Supervisor:'}</strong> ${finalSupervisor}</p></div><div style="background:#fff8f8;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:20px 0"><h4 style="margin:0 0 10px;color:#991b1b;font-size:13px;font-weight:700">${isAr?'بيانات تسجيل الدخول:':'Access Credentials:'}</h4><p style="margin:6px 0;font-size:13px"><strong>${isAr?'رابط البوابة:':'Portal URL:'}</strong> <a href="${portalLoginUrl}" style="color:#A11212;font-weight:bold">${portalLoginUrl}</a></p><p style="margin:6px 0;font-size:13px"><strong>${isAr?'البريد:':'Email:'}</strong> <span style="font-family:monospace;font-weight:bold">${activePlacement.email}</span></p><p style="margin:6px 0;font-size:13px"><strong>${isAr?'كلمة المرور المؤقتة:':'Temp Password:'}</strong> <span style="font-family:monospace;background:#fff;padding:4px 10px;border-radius:6px;font-weight:bold;color:#111827;border:1px solid #e5e7eb">${tempPassword}</span></p></div><div style="text-align:center;margin:24px 0"><a href="${portalLoginUrl}" style="display:inline-block;background:#A11212;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:13px">${isAr?'تسجيل الدخول':'Log In to Portal'}</a></div><p style="font-size:12px;color:#6b7280">${isAr?'يرجى تغيير كلمة المرور فور تسجيل الدخول.':'Please change your temporary password on first login.'}</p><div style="border-top:1px solid #f3f4f6;padding-top:16px;color:#6b7280;font-size:12px"><p style="margin:0">${isAr?'مع أطيب التحيات،':'Best Regards,'}</p><p style="margin:2px 0 0;font-weight:700;color:#111827">${isAr?'إدارة التسكين · مجموعة ميسرة':'Operations & Placement · Maisarah Group'}</p></div></div>`
      };

      (async () => {
        const [authResult, emailResult] = await Promise.allSettled([
          withTimeout(supabase.functions.invoke('manage-auth', {
            body: {
              email: cleanEmail,
              password: tempPassword,
              full_name: activePlacement.name,
              role: effectiveRole,
              department_id: targetDeptKey,
              secondary_roles: fullSecondaryRoles,
              job_title: finalRole,
              dept: targetDeptName,
              immediate_supervisor: finalSupervisor,
              joined_date: placementData.startDate || new Date().toISOString().split('T')[0],
              basic_salary: Number(activePlacement.basic_salary || 0),
              phone: activePlacement.phone || '',
              employee_type: activePlacement.employment_type || 'Experienced'
            }
          }), 5000),
          withTimeout(supabase.functions.invoke('send-email', { body: bgEmailBody }), 5000)
        ]);
        if (authResult.status === 'rejected') console.warn('[BG] manage-auth timed out or failed:', authResult.reason);
        else console.log('[BG] manage-auth ok:', authResult.value);
        if (emailResult.status === 'rejected') console.warn('[BG] send-email timed out or failed:', emailResult.reason);
        else console.log('[BG] send-email ok:', emailResult.value);
      })().catch(e => console.warn('[BG] background placement error:', e));

    } catch (err: any) {
      console.error('Placement confirmation error (Layer 1):', err);
      setPlacementError(err?.message || 'Failed to finalize placement. Please try again.');
      setIsPlacing(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    const primaryRole = emp.role || 'employee';
    const initialSec = Array.isArray(emp.secondaryRoles) && emp.secondaryRoles.length > 0
      ? emp.secondaryRoles
      : [primaryRole];

    setFormData({
      fullName: emp.name_en || emp.name_ar,
      email: emp.email,
      phone: emp.phone,
      password: '',
      role: primaryRole,
      jobTitle: emp.job_title || 'Auditor',
      department_id: emp.department_id || 'audit',
      secondaryRoles: Array.from(new Set([primaryRole, ...initialSec]))
    });
    setIsModalOpen(true);
    setShowCredentials(false);
    setFormMessage(null);
  };

  const handleAddOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const cleanEmail = (formData.email || editingEmployee?.email || '').trim().toLowerCase();
      const deptConfig = getDepartmentById(formData.department_id);
      const targetDeptName = deptConfig?.name || formData.department_id;
      const targetJobTitle = formData.jobTitle || 'Staff Member';
      const effectiveSecondary = Array.from(new Set([formData.role, ...(formData.secondaryRoles || [])]));

      if (editingEmployee) {
        // 1. Direct DB updates immediately (profiles, hr_employees, hr_recruits)
        const profileUpdate: any = {
          full_name: formData.fullName,
          role: formData.role,
          department_id: formData.department_id,
          secondary_roles: effectiveSecondary
        };

        const hrEmployeeData = {
          id: editingEmployee.id,
          full_name: formData.fullName,
          email: cleanEmail,
          phone: formData.phone,
          dept: targetDeptName,
          role: targetJobTitle
        };

        try {
          await Promise.allSettled([
            supabase.from('profiles').update(profileUpdate).or(`id.eq.${editingEmployee.id},email.eq.${cleanEmail}`),
            supabase.from('hr_employees').upsert(hrEmployeeData, { onConflict: 'id' }),
            supabase.from('hr_recruits').update({ 
              dept: targetDeptName, 
              role: targetJobTitle, 
              name: formData.fullName,
              placement_status: 'placed'
            }).or(`id.eq.${editingEmployee.id},email.eq.${cleanEmail}`)
          ]);
        } catch (dbErr) {
          console.warn('Direct edit DB update notice:', dbErr);
        }

        // 2. Background auth sync with strict 3s timeout (non-blocking)
        invokeEdgeFunctionWithTimeout('manage-auth', {
          email: cleanEmail,
          full_name: formData.fullName,
          role: formData.role,
          department_id: formData.department_id,
          secondary_roles: effectiveSecondary
        }, 3000).catch(authEdgeErr => console.warn('manage-auth invoke notice during edit:', authEdgeErr));

        // 3. Update local storage placed employees & recruits cache
        try {
          const localPlaced: any[] = JSON.parse(localStorage.getItem('maisarah_placed_employees') || '[]');
          const updatedPlaced = localPlaced.map(lp => {
            if ((lp.email && lp.email.toLowerCase() === cleanEmail) || lp.id === editingEmployee.id) {
              return {
                ...lp,
                full_name: formData.fullName,
                phone: formData.phone,
                dept: targetDeptName,
                role: targetJobTitle,
                accessRole: formData.role,
                secondary_roles: effectiveSecondary
              };
            }
            return lp;
          });
          localStorage.setItem('maisarah_placed_employees', JSON.stringify(updatedPlaced));

          // Also update HR cache
          const rawHrCache = localStorage.getItem('hr_employee_records');
          if (rawHrCache) {
            const parsed = JSON.parse(rawHrCache);
            const updatedHr = parsed.map((e: any) => {
              if ((e.email && e.email.toLowerCase() === cleanEmail) || e.id === editingEmployee.id) {
                return {
                  ...e,
                  name: formData.fullName,
                  phone: formData.phone,
                  dept: targetDeptName,
                  role: targetJobTitle
                };
              }
              return e;
            });
            localStorage.setItem('hr_employee_records', JSON.stringify(updatedHr));
          }

          // Also update recruits cache
          const rawRecruits = localStorage.getItem('maisarah_hr_recruits_v1');
          if (rawRecruits) {
            const parsed = JSON.parse(rawRecruits);
            const updatedRecruits = parsed.map((r: any) => {
              if ((r.email && r.email.toLowerCase() === cleanEmail) || r.id === editingEmployee.id) {
                return {
                  ...r,
                  name: formData.fullName,
                  dept: targetDeptName,
                  role: targetJobTitle,
                  placement_status: 'placed'
                };
              }
              return r;
            });
            localStorage.setItem('maisarah_hr_recruits_v1', JSON.stringify(updatedRecruits));
          }
        } catch (e) {
          console.warn('Error updating local caches during edit:', e);
        }

        // 4. Log activity
        await logActivity(
          editingEmployee.id,
          formData.fullName,
          'service_updated',
          `Manager updated employee '${formData.fullName}': Role -> '${formData.role}', Dept -> '${targetDeptName}', Position -> '${targetJobTitle}'`,
          `قام المدير بتحديث بيانات الموظف '${formData.fullName}': الصلاحية -> '${formData.role}'، القسم -> '${targetDeptName}'، المسمى -> '${targetJobTitle}'`
        ).catch(() => {});

        // 5. Update local state
        setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? {
          ...emp,
          name_en: formData.fullName,
          name_ar: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          department_id: formData.department_id,
          job_title: targetJobTitle,
          secondaryRoles: effectiveSecondary
        } : emp));

        setNotification({
          show: true,
          title: isAr ? 'تم تحديث الموظف بنجاح' : 'Employee Updated',
          message: isAr ? 'تم حفظ التعديلات وتحديث الصلاحيات والقسم بنجاح.' : 'Employee profile, department, and multi-portal roles updated successfully.',
          type: 'success'
        });

        setIsSubmitting(false);
        setIsModalOpen(false);
        setEditingEmployee(null);

        window.dispatchEvent(new CustomEvent('maisarah_employees_updated'));
        window.dispatchEvent(new CustomEvent('maisarah_recruits_updated'));
        return;
      }

      // Create Mode - using manage-auth edge function directly for seamless auth creation
      try {
        const authPromise = supabase.functions.invoke('manage-auth', {
          body: {
            email: cleanEmail,
            password: formData.password,
            full_name: formData.fullName,
            role: formData.role,
            department_id: formData.department_id,
            secondary_roles: effectiveSecondary,
            phone: formData.phone,
            job_title: targetJobTitle,
            dept: targetDeptName
          }
        });
        const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        );
        const { data: authData, error: authErr } = await Promise.race([authPromise, timeoutPromise]) as any;

        if (authErr) console.warn('manage-auth create notice:', authErr);

        const targetUserId = authData?.userId || authData?.user?.id || crypto.randomUUID();

        // Upsert into hr_employees
        try {
          await supabase.from('hr_employees').upsert({
            id: targetUserId,
            full_name: formData.fullName,
            email: cleanEmail,
            phone: formData.phone,
            role: targetJobTitle,
            dept: targetDeptName,
            created_at: new Date().toISOString()
          }, { onConflict: 'id' });
        } catch (hrErr) {
          console.warn('Client hr_employees upsert notice:', hrErr);
        }

        // Save locally to maisarah_placed_employees
        try {
          const placed = JSON.parse(localStorage.getItem('maisarah_placed_employees') || '[]');
          const nextPlaced = [
            {
              id: targetUserId,
              full_name: formData.fullName,
              role: targetJobTitle,
              dept: targetDeptName,
              email: cleanEmail,
              phone: formData.phone || '',
              accessRole: formData.role,
              secondary_roles: effectiveSecondary,
              joined_date: new Date().toISOString().split('T')[0]
            },
            ...placed.filter((p: any) => p.email?.toLowerCase() !== cleanEmail && p.id !== targetUserId)
          ];
          localStorage.setItem('maisarah_placed_employees', JSON.stringify(nextPlaced));
        } catch (lsErr) {
          console.warn('Placed sync notice:', lsErr);
        }

        setCreatedCredentials({
          email: cleanEmail,
          password: formData.password
        });
        setShowCredentials(true);
        setFormMessage({ type: 'success', text: isAr ? 'تم إضافة الموظف بنجاح' : 'Employee created successfully' });
        fetchEmployees();
        window.dispatchEvent(new CustomEvent('maisarah_employees_updated'));
      } catch (createErr: any) {
        setFormMessage({ type: 'error', text: createErr.message || (isAr ? 'فشلت إضافة الموظف' : 'Operation failed') });
      }
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
            setFormData({
              fullName: '',
              email: '',
              phone: '',
              password: '',
              role: 'employee',
              jobTitle: 'Auditor',
              department_id: 'audit',
              secondaryRoles: ['employee']
            });
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
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm relative shadow-inner ${isHOD ? 'bg-red-50 text-[#A11212] border border-red-200' : 'bg-gray-100 text-gray-700'
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
                                  onClick={() => handleIssueOrResetCredentials(emp)}
                                  title={isAr ? 'عرض / إعادة إصدار بيانات الدخول' : 'View / Issue Login Credentials'}
                                  className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Key size={16} />
                                </button>
                                <button
                                  onClick={() => openEditModal(emp)}
                                  title={isAr ? 'تعديل الصلاحية والقسم' : 'Edit Role & Department'}
                                  className="p-2 text-gray-400 hover:text-[#A11212] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil size={16} />
                                </button>
                                {emp.email !== 'manager@maisarah.om' && emp.email !== 'hr@maisarah.om' ? (
                                  <button
                                    onClick={() => { setEmployeeToDelete(emp); setConfirmName(''); setDeleteModalOpen(true); }}
                                    title={isAr ? 'حذف الحساب' : 'Delete Account'}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  <span className="p-2 text-gray-300 inline-flex items-center" title="Core System Administrator Protected">
                                    <ShieldCheck size={16} className="text-amber-500" />
                                  </span>
                                )}
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
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'القسم' : 'Department'}</label>
                      <select
                        value={formData.department_id}
                        onChange={e => {
                          const newDept = e.target.value;
                          const positions = getJobPositionsByDepartment(newDept);
                          setFormData({
                            ...formData,
                            department_id: newDept,
                            jobTitle: positions[0] || 'Staff Member'
                          });
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all cursor-pointer"
                      >
                        {getAllDepartments().map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'المسمى الوظيفي الفعلي' : 'Designated Job Position'}</label>
                      <select
                        value={formData.jobTitle}
                        onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all cursor-pointer"
                      >
                        {getJobPositionsByDepartment(formData.department_id).map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                        <option value="Department Head">Department Head</option>
                        <option value="Senior Auditor">Senior Auditor</option>
                        <option value="Tax Consultant">Tax Consultant</option>
                        <option value="Accounting Consultant">Accounting Consultant</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{isAr ? 'صلاحية البوابة الرئيسية' : 'Primary System Role'}</label>
                    <select
                      value={formData.role}
                      onChange={e => {
                        const newRole = e.target.value;
                        setFormData({
                          ...formData,
                          role: newRole,
                          secondaryRoles: Array.from(new Set([newRole, ...(formData.secondaryRoles || [])]))
                        });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#A11212] focus:bg-white outline-none transition-all cursor-pointer"
                    >
                      <option value="employee">{isAr ? '👤 موظف قياسي (Standard Employee)' : '👤 Standard Employee (Staff Portal)'}</option>
                      <option value="department_head">{isAr ? '👑 رئيس قسم (Head of Department / HOD)' : '👑 Department Head (HOD Portal)'}</option>
                      <option value="accountant">{isAr ? '💼 محاسب (Accountant)' : '💼 Accountant (Accounting & Invoicing)'}</option>
                      <option value="hr">{isAr ? '📋 إدارة الموارد البشرية (HR Manager)' : '📋 HR Manager (HR Control Center)'}</option>
                      <option value="crm">{isAr ? '🤝 علاقات العملاء (CRM Coordinator)' : '🤝 CRM Coordinator (Leads & Clients)'}</option>
                      <option value="manager">{isAr ? '🏛️ مدير تنفيذي (Executive Manager)' : '🏛️ Executive Manager (Full System Oversight)'}</option>
                    </select>
                  </div>

                  {/* Secondary Cross-Portal Access Checkboxes */}
                  <div className="bg-gray-50/90 p-4 rounded-2xl border border-gray-200/80 space-y-2.5">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {isAr ? 'صلاحيات البوابات الإضافية (تبديل البوابات بحساب واحد)' : 'Cross-Portal Multi-Role Access (Switch portals from TopNav)'}
                    </label>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      {isAr
                        ? 'تتيح هذه الصلاحيات للموظف التبديل بين البوابات المعينة له (مثل: المحاسب، الموظف، رئيس القسم) مباشرة من القائمة العلوية دون الحاجة لتسجيل خروج.'
                        : 'Enables this employee to switch between authorized portals (e.g. Staff Workspace, Accountant, HOD) directly from their portal navigation bar.'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { id: 'accountant', labelEn: '💼 Accountant Portal', labelAr: '💼 بوابة المحاسب' },
                        { id: 'employee', labelEn: '👤 Staff Workspace', labelAr: '👤 مساحة الموظف' },
                        { id: 'department_head', labelEn: '👑 HOD Leadership', labelAr: '👑 رئيس قسم' },
                        { id: 'crm', labelEn: '🤝 CRM Portal', labelAr: '🤝 علاقات العملاء' },
                        { id: 'hr', labelEn: '📋 HR Manager', labelAr: '📋 الموارد البشرية' },
                        { id: 'manager', labelEn: '🏛️ Executive Manager', labelAr: '🏛️ المدير التنفيذي' }
                      ].map(sec => {
                        const isPrimary = formData.role === sec.id;
                        const isChecked = isPrimary || formData.secondaryRoles?.includes(sec.id);
                        return (
                          <label
                            key={sec.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isPrimary
                              ? 'bg-[#A11212]/10 border-[#A11212] text-[#A11212] opacity-90 cursor-not-allowed'
                              : isChecked
                                ? 'bg-red-50 border-red-200 text-[#A11212]'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isPrimary}
                              checked={isChecked}
                              onChange={(e) => {
                                if (isPrimary) return;
                                const cur = formData.secondaryRoles || [];
                                const updated = e.target.checked
                                  ? Array.from(new Set([...cur, sec.id]))
                                  : cur.filter(r => r !== sec.id);
                                setFormData({ ...formData, secondaryRoles: updated });
                              }}
                              className="rounded text-[#A11212] focus:ring-[#A11212] h-3.5 w-3.5"
                            />
                            <span>{isAr ? sec.labelAr : sec.labelEn}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

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

              {/* 1. Designated Department & Employment Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'القسم المعين' : 'Designated Department'}</label>
                  <select
                    value={placementData.dept}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const deptPositions = getJobPositionsByDepartment(newDept);
                      const defaultPos = deptPositions[0] || selectedPlacement.role || 'Staff Member';

                      const matchingHOD = employees.find(emp => {
                        const isHead = emp.role === 'department_head' || emp.job_title?.toLowerCase().includes('head');
                        const empDept = String(emp.department_id || '').toLowerCase();
                        return isHead && (empDept.includes(newDept) || newDept.includes(empDept));
                      });

                      const defaultHOD = matchingHOD
                        ? `${matchingHOD.name_en} (${matchingHOD.job_title})`
                        : 'General Manager (Operations & Finance)';

                      setPlacementData({
                        ...placementData,
                        dept: newDept,
                        role: defaultPos,
                        supervisor: placementData.accessRole === 'department_head' ? 'Executive Management & Board of Directors' : defaultHOD
                      });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                  >
                    {getAllDepartments().map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {isAr ? '' : 'Department'}
                      </option>
                    ))}
                    <option value="custom">{isAr ? '+ إنشاء قسم جديد...' : '+ Create New Department...'}</option>
                  </select>
                  {placementData.dept === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder={isAr ? 'اكتب اسم القسم الجديد...' : 'Type custom department name...'}
                      value={placementData.customDept}
                      onChange={(e) => setPlacementData({ ...placementData, customDept: e.target.value })}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark animate-scale-up"
                    />
                  )}
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

              {/* 2. Designated Job Position (Filtered dynamically by chosen Department) */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'المسمى الوظيفي الفعلي (حسب القسم)' : 'Designated Job Position (Filtered by Department)'}</label>
                <select
                  value={placementData.role}
                  onChange={(e) => setPlacementData({ ...placementData, role: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  {selectedPlacement.role && (
                    <option value={selectedPlacement.role}>
                      {selectedPlacement.role} ({isAr ? 'مقترح من طلب التوظيف' : 'Suggested from Application'})
                    </option>
                  )}
                  {getJobPositionsByDepartment(placementData.dept).map((pos) => (
                    pos !== selectedPlacement.role && (
                      <option key={pos} value={pos}>{pos}</option>
                    )
                  ))}
                  <option value="Head of Department">Head of Department (HOD)</option>
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

              {/* 3. System Portal Access Role */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'صلاحيات الدخول للنظام (Portal Access)' : 'System Portal Access Permission'}</label>
                <select
                  value={placementData.accessRole}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    const isHead = newRole === 'department_head';
                    setPlacementData({
                      ...placementData,
                      accessRole: newRole,
                      isHOD: isHead,
                      supervisor: isHead ? 'Executive Management & Board of Directors' : (placementData.supervisor === 'Executive Management & Board of Directors' ? 'General Manager (Operations & Finance)' : placementData.supervisor)
                    });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  <option value="employee">{isAr ? '👤 موظف قياسي (بوابة الموظف والمستندات والمهام)' : '👤 Standard Employee (Staff Portal & My Tasks)'}</option>
                  <option value="department_head">{isAr ? '👑 رئيس قسم (إدارة القسم وتوزيع المهام)' : '👑 Department Head / HOD (HOD Portal & Task Distribution)'}</option>
                  <option value="accountant">{isAr ? '💼 محاسب (صلاحيات المحاسبة والفواتير والإيصالات)' : '💼 Accountant (Accounting, Invoicing & Receipts Portal)'}</option>
                  <option value="hr">{isAr ? '📋 مدير الموارد البشرية (التوظيف وشؤون الموظفين)' : '📋 HR Manager (HR Control & Recruitment)'}</option>
                  <option value="crm">{isAr ? '🤝 علاقات العملاء (عروض الأسعار والعملاء)' : '🤝 CRM Coordinator (Leads & Quotations)'}</option>
                </select>
                <p className="text-[10px] font-bold text-gray-500 mt-1 flex items-center gap-1">
                  💡 {isAr
                    ? 'يقوم المحاسب بالربط بين رؤوس الأقسام والموظفين لإدارة الفواتير والإيصالات والمطالبات المالية للعملاء.'
                    : 'The Accountant acts as the operational bridge between HODs and employees to manage client invoices, payment receipts, and billing notifications.'}
                </p>

                {/* Secondary Cross-Portal Access Checkboxes */}
                <div className="mt-3 bg-gray-50/90 p-3.5 rounded-2xl border border-gray-200/80 space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {isAr ? 'صلاحيات البوابات الإضافية (تبديل البوابات بحساب واحد)' : 'Cross-Portal Secondary Access (Single Identity Multi-Portal)'}
                  </label>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {[
                      { id: 'accountant', labelEn: '💼 Accountant Portal', labelAr: '💼 بوابة المحاسب' },
                      { id: 'employee', labelEn: '👤 Staff Workspace', labelAr: '👤 مساحة الموظف' },
                      { id: 'department_head', labelEn: '👑 HOD Leadership', labelAr: '👑 رئيس قسم' },
                      { id: 'crm', labelEn: '🤝 CRM Portal', labelAr: '🤝 علاقات العملاء' },
                      { id: 'hr', labelEn: '📋 HR Manager', labelAr: '📋 الموارد البشرية' }
                    ].map(sec => {
                      const isPrimary = placementData.accessRole === sec.id;
                      const isChecked = isPrimary || placementData.secondaryRoles?.includes(sec.id);
                      return (
                        <label
                          key={sec.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isPrimary
                            ? 'bg-brand-dark/10 border-brand-dark text-brand-dark opacity-90 cursor-not-allowed'
                            : isChecked
                              ? 'bg-red-50 border-red-200 text-[#A11212]'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isPrimary}
                            checked={isChecked}
                            onChange={(e) => {
                              const current = new Set(placementData.secondaryRoles || []);
                              if (e.target.checked) current.add(sec.id);
                              else current.delete(sec.id);
                              setPlacementData({ ...placementData, secondaryRoles: Array.from(current) });
                            }}
                            className="w-3.5 h-3.5 accent-[#A11212] rounded cursor-pointer"
                          />
                          <span>{isAr ? sec.labelAr : sec.labelEn}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium pt-0.5">
                    ✨ {isAr
                      ? 'يمكن للموظف التنقل بين البوابات المحددة عبر زر "تبديل البوابة" أعلى الشاشة.'
                      : 'The employee can switch between selected portals via the "Switch Portal" dropdown in top bar.'}
                  </p>
                </div>
              </div>

              {/* 5. Reporting Authority / Immediate Supervisor */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {placementData.isHOD || placementData.accessRole === 'department_head'
                    ? (isAr ? 'جهة التبعية والتقارير' : 'Reporting Authority')
                    : (isAr ? 'المشرف المباشر / رئيس القسم' : 'Immediate Supervisor (HOD)')}
                </label>
                {placementData.isHOD || placementData.accessRole === 'department_head' ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      disabled
                      value={isAr ? 'الإدارة التنفيذية العامة ومجلس الإدارة' : 'Executive Management & Board of Directors'}
                      className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-black text-amber-900 cursor-not-allowed"
                    />
                    <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                      👑 {isAr ? 'مستوى رئيس قسم: يقود القسم ويرفع التقارير مباشرة للإدارة التنفيذية ومجلس الإدارة.' : `Head of Department: Leads ${placementData.dept === 'custom' ? (placementData.customDept || 'Department') : placementData.dept.toUpperCase()} and reports directly to Executive Board.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={placementData.supervisor}
                      onChange={(e) => setPlacementData({ ...placementData, supervisor: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                    >
                      <option value="Executive Management & Board of Directors">{isAr ? 'الإدارة التنفيذية ومجلس الإدارة' : 'Executive Board & Management'}</option>
                      <option value="General Manager (Operations & Finance)">{isAr ? 'المدير العام (العمليات والمالية)' : 'General Manager (Operations & Finance)'}</option>

                      {/* Real Dynamic Personnel from DB */}
                      {employees.length > 0 && (
                        <optgroup label={isAr ? 'الموظفون المعتمدون بالمؤسسة (من قاعدة البيانات)' : 'Real Active Company Personnel (From Database)'}>
                          {employees.map(emp => {
                            const val = `${emp.name_en} (${emp.job_title})`;
                            return (
                              <option key={emp.id} value={val}>
                                {isAr ? `${emp.name_ar || emp.name_en} (${emp.job_title})` : val}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      <option value="custom">{isAr ? '+ تحديد اسم مشرف مخصص...' : '+ Specify Custom Supervisor Name...'}</option>
                    </select>
                    {placementData.supervisor === 'custom' && (
                      <input
                        type="text"
                        required
                        placeholder={isAr ? 'اكتب اسم ورتبة المشرف المباشر...' : 'Type custom supervisor name & position...'}
                        value={placementData.customSupervisor}
                        onChange={(e) => setPlacementData({ ...placementData, customSupervisor: e.target.value })}
                        className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark animate-scale-up"
                      />
                    )}
                    <p className="text-[10px] font-bold text-gray-500">
                      📌 {isAr ? `المشرف المباشر المحدد: ${placementData.supervisor === 'custom' ? (placementData.customSupervisor || 'مشرف مخصص') : placementData.supervisor}` : `Direct Supervisor Assigned: ${placementData.supervisor === 'custom' ? (placementData.customSupervisor || 'Custom Supervisor') : placementData.supervisor}`}
                    </p>
                  </div>
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

      {/* ── Placement Credentials & Portal Registration Success Modal ────── */}
      {credentialsModal && credentialsModal.show && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 p-6 text-white text-center relative">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h3 className="text-lg font-black tracking-tight">
                {isAr ? '🎉 تم اعتماد التعيين وتفعيل حساب الموظف!' : '🎉 Employee Placement Finalized & Registered!'}
              </h3>
              <p className="text-xs text-emerald-100 font-medium mt-1">
                {isAr
                  ? `تم تسجيل حساب الموظف لـ ${credentialsModal.name} بنجاح وإرسال تفاصيل الدخول إلى بريده الإلكتروني.`
                  : `Corporate portal access granted for ${credentialsModal.name}. Credentials generated and dispatched via email.`}
              </p>
            </div>

            {/* Body Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Employee & Assignment Summary Card */}
              <div className="bg-gray-50/90 p-4 rounded-2xl border border-gray-200/80 grid grid-cols-2 gap-3 text-xs font-bold text-gray-700">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-black">{isAr ? 'الاسم الكامل:' : 'Full Name:'}</span>
                  <span className="text-gray-900 font-extrabold">{credentialsModal.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-black">{isAr ? 'المسمى الوظيفي:' : 'Designated Position:'}</span>
                  <span className="text-gray-900 font-extrabold">{credentialsModal.role}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-black">{isAr ? 'القسم المعين:' : 'Designated Department:'}</span>
                  <span className="text-gray-900 font-extrabold">{credentialsModal.dept}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-black">{isAr ? 'المشرف المباشر:' : 'Reporting Supervisor:'}</span>
                  <span className="text-gray-900 font-extrabold">{credentialsModal.supervisor}</span>
                </div>
              </div>

              {/* Credentials Box */}
              <div className="space-y-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Key size={16} className="text-amber-600" />
                    {isAr ? 'بيانات الدخول للبوابة (جاهزة للنسخ والمشاركة)' : 'Generated Login Credentials'}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    📧 {isAr ? 'تم إرسالها بالبريد' : 'Dispatched via Email'}
                  </span>
                </div>

                {/* 1. Portal URL */}
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs font-bold shadow-2xs">
                  <div className="truncate me-2 min-w-0 flex-1">
                    <span className="text-[9px] font-black text-gray-400 block uppercase">{isAr ? 'رابط تسجيل الدخول للبوابة:' : 'Login Portal Link:'}</span>
                    <span className="text-gray-900 truncate block font-mono text-[11px]">{window.location.origin}/login</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(`${window.location.origin}/login`, 'url')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    {copiedField === 'url' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedField === 'url' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy URL')}</span>
                  </button>
                </div>

                {/* 2. Username / Email */}
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs font-bold shadow-2xs">
                  <div className="truncate me-2 min-w-0 flex-1">
                    <span className="text-[9px] font-black text-gray-400 block uppercase">{isAr ? 'البريد الإلكتروني / اسم المستخدم:' : 'Username / Email:'}</span>
                    <span className="text-gray-900 truncate block font-mono text-xs">{credentialsModal.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(credentialsModal.email, 'email')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    {copiedField === 'email' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedField === 'email' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ البريد' : 'Copy Email')}</span>
                  </button>
                </div>

                {/* 3. Temporary Password */}
                <div className="bg-white p-3 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs font-bold shadow-2xs">
                  <div className="me-2 min-w-0 flex-1">
                    <span className="text-[9px] font-black text-gray-400 block uppercase">{isAr ? 'كلمة المرور المؤقتة:' : 'Temporary Password:'}</span>
                    <span className="font-mono text-base font-black text-[#A11212] tracking-widest">{credentialsModal.password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(credentialsModal.password, 'password')}
                    className="px-3.5 py-2 bg-[#A11212] hover:bg-red-800 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs"
                  >
                    {copiedField === 'password' ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                    <span>{copiedField === 'password' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ كلمة المرور' : 'Copy Password')}</span>
                  </button>
                </div>
              </div>

              {/* Copy All Button */}
              <button
                type="button"
                onClick={() => {
                  const fullText = `Maisarah Employee Portal Credentials:\n-----------------------------------------\nEmployee Name: ${credentialsModal.name}\nPortal URL: ${window.location.origin}/login\nEmail/Username: ${credentialsModal.email}\nTemporary Password: ${credentialsModal.password}\nPosition: ${credentialsModal.role}\nDepartment: ${credentialsModal.dept}\nSupervisor: ${credentialsModal.supervisor}`;
                  handleCopyText(fullText, 'all');
                }}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {copiedField === 'all' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copiedField === 'all' ? (isAr ? 'تم نسخ جميع البيانات بنجاح! 📋' : 'All Credentials Copied to Clipboard! 📋') : (isAr ? 'نسخ جميع بيانات الدخول بالكامل' : 'Copy All Credentials to Clipboard')}</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCredentialsModal(null)}
                className="w-full py-3 bg-[#A11212] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-800 transition-colors cursor-pointer shadow-md"
              >
                {isAr ? 'إغلاق وإنهاء التعيين' : 'Done / Complete Placement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sleek Floating Toast Notification ─────────────────────────── */}
      {notification.show && (
        <div className="fixed top-20 end-6 z-[9999] max-w-md w-full animate-slide-down pointer-events-auto" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-gray-100/80 flex items-start gap-3.5 ring-1 ring-black/5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-[#A11212]'
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
                          {getJobPositionsByDepartment(editFormData.department_id).map((pos) => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                          <option value="Department Head">Department Head</option>
                          <option value="Senior Auditor">Senior Auditor</option>
                          <option value="Tax Consultant">Tax Consultant</option>
                          <option value="Accounting Consultant">Accounting Consultant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase text-gray-400 mb-1">{isAr ? 'القسم المعين:' : 'Designated Department:'}</label>
                        <select
                          value={editFormData.department_id}
                          onChange={(e) => {
                            const newDept = e.target.value;
                            const deptPositions = getJobPositionsByDepartment(newDept);
                            const defaultPos = deptPositions[0] || 'Staff Member';
                            setEditFormData({
                              ...editFormData,
                              department_id: newDept,
                              jobTitle: defaultPos
                            });
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-dark cursor-pointer"
                        >
                          {getAllDepartments().map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-5 py-2.5 bg-brand-dark hover:bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Pencil size={12} />
                        {isAr ? 'تعديل البيانات' : 'Edit Profile'}
                      </button>
                      <button
                        onClick={() => handleIssueOrResetCredentials(viewingEmployee)}
                        className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Key size={13} />
                        {isAr ? 'عرض / إصدار كلمة المرور' : 'View / Reset Password'}
                      </button>
                    </div>
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

      {/* ------------------------------------------------------------------ */}
      {/* Credentials Issued Success Modal (For Manager Copying & Review) */}
      {/* ------------------------------------------------------------------ */}
      {credentialsModal?.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 animate-scale-up">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 p-6 text-white relative">
              <button
                onClick={() => setCredentialsModal(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">
                  <CheckCircle2 size={24} className="text-emerald-200" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-emerald-800/40 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    {isAr ? 'تم التسجيل وتفعيل الحساب' : 'Placement & Registration Complete'}
                  </span>
                  <h3 className="text-xl font-black mt-0.5">
                    {isAr ? 'تم إنشاء بيانات الدخول بنجاح!' : 'Employee Credentials Generated'}
                  </h3>
                </div>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium leading-relaxed mt-2">
                {isAr
                  ? `تم تفعيل حساب الموظف ${credentialsModal.name} وإرسال إشعار الترحيب عبر البريد الإلكتروني. يمكنك نسخ البيانات أدناه لتزويد الموظف بها مباشرة.`
                  : `Registered portal access for ${credentialsModal.name} and dispatched login setup to their email. You can copy the credentials below for direct handover.`}
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              {/* Employee Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-base">{credentialsModal.name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-bold">
                    <span className="flex items-center gap-1"><Building2 size={13} className="text-slate-400" /> {credentialsModal.dept}</span>
                    <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-slate-400" /> {credentialsModal.role}</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">
                  {credentialsModal.name.charAt(0)}
                </div>
              </div>

              {/* Credential Fields with Copy Buttons */}
              <div className="space-y-3">
                {/* 1. Portal URL */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="overflow-hidden mr-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">{isAr ? 'رابط البوابة' : 'Portal Login URL'}</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">{window.location.origin}/login</span>
                  </div>
                  <button
                    onClick={() => handleCopyText(`${window.location.origin}/login`, 'url')}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    {copiedField === 'url' ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700 font-black">{isAr ? 'تم النسخ' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-slate-500" />
                        <span>{isAr ? 'نسخ الرابط' : 'Copy URL'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 2. Registered Email */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="overflow-hidden mr-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">{isAr ? 'البريد الإلكتروني / اسم المستخدم' : 'Email / Username'}</span>
                    <span className="text-xs font-black text-slate-900 truncate block select-all">{credentialsModal.email}</span>
                  </div>
                  <button
                    onClick={() => handleCopyText(credentialsModal.email, 'email')}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700 font-black">{isAr ? 'تم النسخ' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-slate-500" />
                        <span>{isAr ? 'نسخ الإيميل' : 'Copy Email'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 3. Password */}
                <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div className="overflow-hidden mr-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 block">{isAr ? 'كلمة المرور المؤقتة' : 'Temporary Password'}</span>
                    <span className="text-sm font-black text-emerald-950 font-mono tracking-wide block select-all">{credentialsModal.password || '●●●●●●●●'}</span>
                  </div>
                  <button
                    onClick={() => handleCopyText(credentialsModal.password, 'password')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    {copiedField === 'password' ? (
                      <>
                        <Check size={13} className="text-white" />
                        <span className="font-black">{isAr ? 'تم النسخ' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Key size={13} className="text-emerald-100" />
                        <span>{isAr ? 'نسخ كلمة المرور' : 'Copy Password'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Master Copy All Button */}
              <button
                onClick={() => {
                  const fullText = `Employee Credentials - Maisarah Portal\n-----------------------------------\nEmployee: ${credentialsModal.name}\nDepartment: ${credentialsModal.dept}\nRole: ${credentialsModal.role}\n\nLogin URL: ${window.location.origin}/login\nEmail: ${credentialsModal.email}\nTemporary Password: ${credentialsModal.password}`;
                  handleCopyText(fullText, 'all');
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer mt-2"
              >
                {copiedField === 'all' ? (
                  <>
                    <Check size={15} className="text-emerald-400" />
                    <span className="text-emerald-400">{isAr ? 'تم نسخ جميع البيانات في الحافظة!' : 'All Credentials Copied to Clipboard!'}</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} className="text-slate-300" />
                    <span>{isAr ? '📋 نسخ كافة البيانات دفعة واحدة' : '📋 Copy All Credentials to Clipboard'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setCredentialsModal(null)}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                {isAr ? 'إغلاق وإكمال' : 'Done / Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
