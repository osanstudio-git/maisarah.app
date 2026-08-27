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
  Building2
} from 'lucide-react';
import { getAllDepartments } from '../../config/departments';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Employee {
  id: string;
  name_ar: string;
  name_en: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  tasksCompleted: number;
  activeJobs: number;
  delays: number;
  completionRate: number;
  joinedAt: string;
  department_id?: string;
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
  const [isPlacing, setIsPlacing] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

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
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['employee', 'manager']);

      if (profErr) throw profErr;

      // Map DB profiles to Employee interface, generating some mock stats for the dashboard
      const mapped: Employee[] = (profiles || []).map(p => {
        const total = Math.floor(Math.random() * 40 + 10);
        const done = Math.floor(total * (0.5 + Math.random() * 0.5));
        return {
          id: p.id,
          name_en: p.full_name || 'Unknown',
          name_ar: p.full_name || 'غير معروف',
          email: p.email || '',
          phone: p.phone || '',
          role: p.role,
          status: Math.random() > 0.1 ? 'active' : 'on_leave',
          tasksCompleted: done,
          activeJobs: total - done,
          delays: Math.floor(Math.random() * 3),
          completionRate: Math.round((done / total) * 100),
          joinedAt: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '2024-01-01',
          // Randomly assign department for visual purposes if not saved
          department_id: p.department_id || getAllDepartments()[Math.floor(Math.random() * getAllDepartments().length)].id,
        };
      });

      setEmployees(mapped);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.name_en,
      email: emp.email,
      phone: emp.phone,
      password: '',
      role: emp.role,
      department_id: emp.department_id || 'audit',
    });
    setIsModalOpen(true);
    setFormMessage(null);
    setShowCredentials(false);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    if (confirmName !== (isAr ? employeeToDelete.name_ar : employeeToDelete.name_en)) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', employeeToDelete.id);
      if (error) throw error;
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
      setDeleteModalOpen(false);
      setNotification({
        show: true,
        title: isAr ? 'تم الحذف بنجاح' : 'Employee Deleted',
        message: isAr ? 'تم حذف حساب الموظف بالكامل.' : 'Employee account successfully deleted.',
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
        const updateData: any = {
          full_name: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          department_id: formData.department_id
        };

        const { error: updateError } = await supabase.from('profiles').update(updateData).eq('id', editingEmployee.id);
        if (updateError) throw updateError;

        setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { ...emp, name_en: formData.fullName, name_ar: formData.fullName, phone: formData.phone, role: formData.role, department_id: formData.department_id } : emp));
        setIsModalOpen(false);
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
      }

      setCreatedCredentials({ email: formData.email, password: formData.password });
      setShowCredentials(true);
      setFormMessage({ type: 'success', text: isAr ? 'تم إضافة الموظف بنجاح' : 'Employee created successfully' });
      fetchEmployees();
    } catch (err: any) {
      setFormMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Hi ${formData.fullName},\n\nYour Maisarah Platform account is ready.\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nLogin here: ${window.location.origin}/login`;
    window.open(`https://wa.me/${formData.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
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
                className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'roster' 
                    ? 'border-brand-dark text-brand-dark' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {isAr ? 'قائمة الموظفين النشطين' : 'Active Workforce'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('placements')}
                className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'placements' 
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
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الموظف' : 'Employee'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'القسم' : 'Department'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الإنجاز' : 'Completion'}</th>
                          <th className="px-6 py-4 text-end"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtered.map(emp => {
                          const dept = getAllDepartments().find(d => d.id === emp.department_id) || getAllDepartments()[0];
                          const isOnline = emp.status === 'active';
                          return (
                            <tr key={emp.id} className="group hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-brand-dark/5 text-brand-dark flex items-center justify-center font-black text-sm relative">
                                    {emp.name_en.charAt(0)}
                                    {isOnline && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 text-sm">{isAr ? emp.name_ar : emp.name_en}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{emp.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Building2 size={14} className="text-gray-400" />
                                  <span className="text-xs font-bold text-gray-700">{dept.name}</span>
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
                                <button onClick={() => openEditModal(emp)} className="p-2 text-gray-400 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors">
                                  <Pencil size={16} />
                                </button>
                                <button onClick={() => { setEmployeeToDelete(emp); setConfirmName(''); setDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{isAr ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input required type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-dark outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                      <input required type="email" disabled={!!editingEmployee} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-dark outline-none disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                      <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-dark outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{isAr ? 'القسم' : 'Department'}</label>
                      <select value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-dark outline-none">
                        {getAllDepartments().map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{isAr ? 'الصلاحية' : 'Role'}</label>
                      <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-dark outline-none">
                        <option value="employee">{isAr ? 'موظف قياسي' : 'Standard Employee'}</option>
                        <option value="department_head">{isAr ? 'رئيس قسم (HOD)' : 'Department Head (HOD)'}</option>
                        <option value="accountant">{isAr ? 'محاسب' : 'Accountant'}</option>
                        <option value="hr">{isAr ? 'إدارة الموارد البشرية (HR)' : 'HR Manager'}</option>
                        <option value="manager">{isAr ? 'مدير تنفيذي' : 'Executive Manager'}</option>
                        <option value="crm">{isAr ? 'علاقات العملاء (CRM)' : 'CRM Coordinator'}</option>
                      </select>
                    </div>
                  </div>
                  {!editingEmployee && (
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">{isAr ? 'كلمة المرور' : 'Password'}</label>
                      <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-dark outline-none" minLength={6} />
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : (editingEmployee ? (isAr ? 'حفظ' : 'Save') : (isAr ? 'إضافة' : 'Create'))}
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
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">{isAr ? 'حذف الموظف' : 'Delete Employee'}</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {isAr ? `للتأكيد، اكتب اسم الموظف: ` : `To confirm, type the employee's name: `}
              <strong className="text-gray-900">{isAr ? employeeToDelete.name_ar : employeeToDelete.name_en}</strong>
            </p>
            <input
              type="text"
              value={confirmName}
              onChange={e => setConfirmName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-red-500 outline-none mb-6"
              placeholder={isAr ? employeeToDelete.name_ar : employeeToDelete.name_en}
            />
            <div className="flex gap-3">
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleDeleteEmployee} 
                disabled={confirmName !== (isAr ? employeeToDelete.name_ar : employeeToDelete.name_en)}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isAr ? 'حذف نهائي' : 'Delete Permanently'}
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
                  onChange={(e) => setPlacementData({ ...placementData, accessRole: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  <option value="employee">{isAr ? 'موظف قياسي' : 'Standard Employee'}</option>
                  <option value="department_head">{isAr ? 'رئيس قسم (HOD)' : 'Department Head (HOD)'}</option>
                  <option value="accountant">{isAr ? 'محاسب' : 'Accountant'}</option>
                  <option value="hr">{isAr ? 'مدير الموارد البشرية (HR)' : 'HR Manager'}</option>
                  <option value="crm">{isAr ? 'علاقات العملاء (CRM)' : 'CRM Coordinator'}</option>
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
                      if (newDept === 'tax_vat') defaultHOD = 'Khalfan Al-Abri';
                      if (newDept === 'bookkeeping') defaultHOD = 'Mazis Al-Balushi';
                      setPlacementData({
                        ...placementData,
                        dept: newDept,
                        supervisor: defaultHOD
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
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isAr ? 'المشرف المباشر / رئيس القسم' : 'Immediate Supervisor (HOD)'}</label>
                <select
                  value={placementData.supervisor}
                  onChange={(e) => setPlacementData({ ...placementData, supervisor: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-brand-dark cursor-pointer"
                >
                  <option value="Nasser Al-Riyami">{isAr ? 'ناصر الريامي (رئيس قسم التدقيق)' : 'Nasser Al-Riyami (Head of Audit)'}</option>
                  <option value="Khalfan Al-Abri">{isAr ? 'خلفان العبري (رئيس قسم الضرائب)' : 'Khalfan Al-Abri (Head of Tax & VAT)'}</option>
                  <option value="Mazis Al-Balushi">{isAr ? 'مازن البلوشي (رئيس قسم مسك الدفاتر)' : 'Mazis Al-Balushi (Head of Bookkeeping)'}</option>
                </select>
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

      {/* Custom Notification Modal Card */}
      {notification.show && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-scale-up border border-gray-100">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center ${
              notification.type === 'success' ? 'bg-green-50 text-green-600 animate-bounce' : 'bg-red-50 text-[#A11212]'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {notification.title}
              </h3>
              <p className="text-xs text-gray-550 mt-2 leading-relaxed font-bold">
                {notification.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className={`w-full text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer ${
                  notification.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-dark hover:bg-gray-800'
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
};

export default EmployeeManagement;
