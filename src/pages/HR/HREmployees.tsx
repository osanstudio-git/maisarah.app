import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import {
  Search, User, Phone, MapPin, Briefcase, DollarSign,
  GraduationCap, Award, Users as FamilyIcon, PhoneCall,
  FileText, TrendingUp, AlertTriangle, Gift, ArrowLeftRight,
  Download, UploadCloud, Plus, Edit, Trash2, CheckCircle2, X, PlusCircle, LayoutGrid, ListFilter, SlidersHorizontal, UserX, AlertCircle, ShieldAlert,
  Copy, Check, Share2, Send, Lock, Mail, Key, Loader2, Sparkles
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  dept: string;
  email: string;
  phone: string;
  companyPhone?: string;
  civilId: string;
  passportNo: string;
  residencyNo: string;
  nationality: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  joinedDate: string;
  immediateSupervisor: string;
  basicSalary: number;
  type: 'Experienced' | 'Trainee' | 'Worker';
  accommodationStatus?: string;
  accommodationDetails?: string;
  allowances: { transport: number; housing: number; other: number };
  education: Array<{ degree: string; field: string; institution: string; year: string }>;
  experience: Array<{ role: string; company: string; duration: string }>;
  family: Array<{ name: string; relation: string; dob: string }>;
  emergencyContact: { name: string; relation: string; phone: string };
  documents: Array<{ name: string; type: string; expiry: string; status: 'active' | 'expired' | 'warning'; url?: string }>;
  promotions: Array<{ from: string; to: string; date: string }>;
  disciplinaries: Array<{ type: string; reason: string; date: string; action: string }>;
  bonuses: Array<{ amount: number; reason: string; date: string }>;
  transfers: Array<{ fromDept: string; toDept: string; date: string }>;
}

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Ahmed Al-Kharusi',
    role: 'Senior Auditor',
    dept: 'Audit',
    email: 'ahmed.k@maisarah.om',
    phone: '+968 9123 4567',
    companyPhone: '+968 2456 0001',
    civilId: '109876543',
    passportNo: 'OM1234567',
    residencyNo: 'PR9876543',
    nationality: 'Omani',
    dob: '1988-05-12',
    gender: 'Male',
    maritalStatus: 'Married',
    joinedDate: '2020-01-15',
    immediateSupervisor: 'Fatma Al-Harthy',
    basicSalary: 1800,
    type: 'Experienced',
    accommodationStatus: 'Lives with family',
    allowances: { transport: 150, housing: 300, other: 100 },
    education: [
      { degree: 'Bachelor of Science', field: 'Accounting', institution: 'Sultan Qaboos University', year: '2010' }
    ],
    experience: [
      { role: 'Auditor', company: 'Deloitte Oman', duration: '4 Years' }
    ],
    family: [
      { name: 'Muna Al-Kharusi', relation: 'Spouse', dob: '1992-08-22' },
      { name: 'Faisal Al-Kharusi', relation: 'Son', dob: '2018-04-11' }
    ],
    emergencyContact: { name: 'Salim Al-Kharusi', relation: 'Brother', phone: '+968 9988 7766' },
    documents: [
      { name: 'Passport Copy', type: 'passport', expiry: '2028-10-12', status: 'active' },
      { name: 'Civil ID Card', type: 'civil_id', expiry: '2026-08-24', status: 'active' },
      { name: 'Employment Contract', type: 'contract', expiry: '2025-01-15', status: 'warning' },
      { name: 'Degree Certificate', type: 'certificate', expiry: 'N/A', status: 'active' }
    ],
    promotions: [
      { from: 'Auditor', to: 'Senior Auditor', date: '2022-06-01' }
    ],
    disciplinaries: [],
    bonuses: [
      { amount: 500, reason: 'Annual Performance Bonus', date: '2023-12-25' }
    ],
    transfers: [
      { fromDept: 'Finance Support', toDept: 'Audit', date: '2021-03-01' }
    ]
  },
  {
    id: 'EMP-002',
    name: 'Sara Al-Balushi',
    role: 'Tax Consultant',
    dept: 'Tax & VAT',
    email: 'sara.b@maisarah.om',
    phone: '+968 9234 5678',
    companyPhone: '+968 2456 0002',
    civilId: '108765432',
    passportNo: 'OM2345678',
    residencyNo: 'PR8765432',
    nationality: 'Omani',
    dob: '1991-09-30',
    gender: 'Female',
    maritalStatus: 'Single',
    joinedDate: '2021-08-01',
    immediateSupervisor: 'Fatma Al-Harthy',
    basicSalary: 1500,
    type: 'Experienced',
    accommodationStatus: 'Lives with family',
    allowances: { transport: 150, housing: 250, other: 50 },
    education: [
      { degree: 'Master of Taxation', field: 'Tax Law', institution: 'University of Bedfordshire', year: '2015' }
    ],
    experience: [
      { role: 'Tax Associate', company: 'EY Oman', duration: '3 Years' }
    ],
    family: [],
    emergencyContact: { name: 'Fatma Al-Balushi', relation: 'Mother', phone: '+968 9333 4455' },
    documents: [
      { name: 'Passport Copy', type: 'passport', expiry: '2026-04-18', status: 'warning' },
      { name: 'Civil ID Card', type: 'civil_id', expiry: '2024-02-10', status: 'expired' },
      { name: 'Employment Contract', type: 'contract', expiry: '2026-08-01', status: 'active' }
    ],
    promotions: [],
    disciplinaries: [
      { type: 'Written Warning', reason: 'Repeated late check-ins without valid justification', date: '2023-04-12', action: 'Warning issued' }
    ],
    bonuses: [
      { amount: 300, reason: 'Quarterly Target Achievement', date: '2023-09-30' }
    ],
    transfers: []
  },
  {
    id: 'EMP-003',
    name: 'Mohammed Al-Abri',
    role: 'Audit Intern',
    dept: 'Audit',
    email: 'mohammed.a@maisarah.om',
    phone: '+968 9876 5432',
    companyPhone: '+968 2456 0003',
    civilId: '107654321',
    passportNo: 'OM3456789',
    residencyNo: 'PR7654321',
    nationality: 'Omani',
    dob: '2000-01-01',
    gender: 'Male',
    maritalStatus: 'Single',
    joinedDate: '2026-02-15',
    immediateSupervisor: 'Ahmed Al-Kharusi',
    basicSalary: 450,
    type: 'Trainee',
    accommodationStatus: 'Company Accommodation',
    allowances: { transport: 50, housing: 100, other: 0 },
    education: [
      { degree: 'Diploma', field: 'Accounting', institution: 'Higher College of Technology', year: '2024' }
    ],
    experience: [],
    family: [],
    emergencyContact: { name: 'Ali Al-Abri', relation: 'Father', phone: '+968 9911 2233' },
    documents: [
      { name: 'Civil ID Card', type: 'civil_id', expiry: '2028-12-31', status: 'active' }
    ],
    promotions: [],
    disciplinaries: [],
    bonuses: [],
    transfers: []
  },
  {
    id: 'EMP-004',
    name: 'Tarek Mahmoud',
    role: 'Tax Consultant',
    dept: 'Tax & VAT',
    email: 'tarek.m@maisarah.om',
    phone: '+968 9444 5566',
    companyPhone: '+968 2456 0004',
    civilId: '209876543',
    passportNo: 'EG9876543',
    residencyNo: 'PR5566778',
    nationality: 'Egyptian',
    dob: '1985-11-20',
    gender: 'Male',
    maritalStatus: 'Married',
    joinedDate: '2022-03-01',
    immediateSupervisor: 'Sara Al-Balushi',
    basicSalary: 1400,
    type: 'Experienced',
    accommodationStatus: 'Lives with family',
    allowances: { transport: 150, housing: 250, other: 50 },
    education: [
      { degree: 'Bachelor of Commerce', field: 'Accounting', institution: 'Cairo University', year: '2007' }
    ],
    experience: [
      { role: 'Senior Tax Officer', company: 'Cairo Tax Authority', duration: '8 Years' }
    ],
    family: [
      { name: 'Yasmine Mahmoud', relation: 'Spouse', dob: '1990-05-15' }
    ],
    emergencyContact: { name: 'Moustafa Mahmoud', relation: 'Brother', phone: '+20 100 123 4567' },
    documents: [
      { name: 'Passport Copy', type: 'passport', expiry: '2029-05-01', status: 'active' as const },
      { name: 'Civil ID Card', type: 'civil_id', expiry: '2025-11-01', status: 'active' as const }
    ],
    promotions: [],
    disciplinaries: [],
    bonuses: [],
    transfers: []
  }
];

// Helper to determine work schedule based on nationality
export const getWorkSchedule = (nationality: string) => {
  const isOmani = (nationality || '').trim().toLowerCase() === 'oman' || (nationality || '').trim().toLowerCase() === 'omani' || (nationality || '').trim() === 'عماني';
  return {
    days: isOmani ? 5 : 6,
    weekend: isOmani ? 'Friday & Saturday' : 'Friday',
    weekendAr: isOmani ? 'الجمعة والسبت' : 'الجمعة',
    schedule: isOmani ? 'Sun - Thu' : 'Sat - Thu',
    scheduleAr: isOmani ? 'الأحد - الخميس' : 'السبت - الخميس'
  };
};

export default function HREmployees() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmployeesAndSync = async () => {
      setLoading(true);
      try {
        const [{ data: dbEmployees, error: hrError }, { data: profiles, error: profError }] = await Promise.all([
          supabase.from('hr_employees').select('*'),
          supabase.from('profiles').select('*')
        ]);

        const rawProfiles = (profiles || []).filter(p => p.role !== 'client');
        const rawHr = dbEmployees || [];

        // Build unified list from Supabase profiles + hr_employees
        const liveEmployees: Employee[] = rawProfiles.map(p => {
          const hrEmp = rawHr.find((h: any) => h.id === p.id || (h.email && p.email && h.email.toLowerCase() === p.email.toLowerCase()));

          // Map department
          let rawDept = hrEmp?.dept || p.department || p.department_id || 'Audit';
          let dept = 'Audit';
          const lowerDept = String(rawDept).toLowerCase();
          if (lowerDept.includes('tax') || lowerDept.includes('vat')) dept = 'Tax & VAT';
          else if (lowerDept.includes('book') || lowerDept.includes('account')) dept = 'Bookkeeping';
          else if (lowerDept.includes('advis') || lowerDept.includes('consult')) dept = 'Business Advisory';
          else if (lowerDept.includes('success') || lowerDept.includes('client') || lowerDept.includes('operat')) dept = 'Client Success';
          else if (lowerDept.includes('audit')) dept = 'Audit';

          // Map role
          let role = hrEmp?.role;
          if (!role) {
            if (p.role === 'department_head') role = `Head of ${dept}`;
            else if (p.role === 'accountant') role = 'Senior Accountant';
            else if (p.role === 'hr') role = 'HR Manager';
            else if (p.role === 'manager') role = 'Executive Manager';
            else if (p.role === 'crm') role = 'CRM Coordinator';
            else role = 'Senior Auditor';
          }

          const phone = hrEmp?.phone || p.phone || '+968 98745632';

          return {
            id: p.id,
            name: hrEmp?.full_name || p.full_name || p.name || 'Employee',
            role: role,
            dept: dept,
            email: p.email || hrEmp?.email || '',
            phone: phone,
            companyPhone: hrEmp?.company_phone || '+968 2456 0000',
            civilId: hrEmp?.civil_id || '109876543',
            passportNo: hrEmp?.passport_no || 'OM1234567',
            residencyNo: hrEmp?.residency_no || 'PR9876543',
            nationality: hrEmp?.nationality || 'Omani',
            dob: hrEmp?.dob || '1992-05-15',
            gender: hrEmp?.gender || 'Male',
            maritalStatus: hrEmp?.marital_status || 'Single',
            joinedDate: hrEmp?.joined_date || (p.created_at ? p.created_at.split('T')[0] : '2024-01-15'),
            immediateSupervisor: hrEmp?.immediate_supervisor || (dept === 'Tax & VAT' ? 'Khalfan Al-Abri' : dept === 'Audit' ? 'Dr. Tariq Al-Hashimi' : 'Executive Board'),
            basicSalary: Number(hrEmp?.basic_salary || 1200),
            type: ((hrEmp?.employee_type as any) || 'Experienced') as 'Experienced' | 'Trainee' | 'Worker',
            accommodationStatus: hrEmp?.accommodation_status || 'Lives with family',
            accommodationDetails: hrEmp?.accommodation_details || '',
            allowances: hrEmp?.allowances || { transport: 150, housing: 250, other: 50 },
            education: hrEmp?.education && hrEmp.education.length > 0 ? hrEmp.education : [
              { degree: 'Bachelor of Science', field: 'Accounting & Finance', institution: 'Sultan Qaboos University', year: '2016' }
            ],
            experience: hrEmp?.experience && hrEmp.experience.length > 0 ? hrEmp.experience : [
              { role: 'Audit Associate', company: 'Maisarah Group', duration: '3 Years' }
            ],
            family: hrEmp?.family || [],
            emergencyContact: hrEmp?.emergency_contact || { name: 'Emergency Contact', relation: 'Family', phone: phone },
            documents: hrEmp?.documents && hrEmp.documents.length > 0 ? hrEmp.documents : [
              { name: 'Civil ID Copy', type: 'civil_id', expiry: '2028-12-31', status: 'active' },
              { name: 'Passport Copy', type: 'passport', expiry: '2029-06-30', status: 'active' },
              { name: 'Employment Contract', type: 'contract', expiry: '2026-12-31', status: 'active' }
            ],
            promotions: hrEmp?.promotions || [],
            disciplinaries: hrEmp?.disciplinaries || [],
            bonuses: hrEmp?.bonuses || [],
            transfers: hrEmp?.transfers || []
          };
        });

        // Also add any hr_employees that didn't have profiles
        for (const h of rawHr) {
          if (!liveEmployees.some(e => e.id === h.id || (h.email && e.email && h.email.toLowerCase() === e.email.toLowerCase()))) {
            liveEmployees.push({
              id: h.id,
              name: h.full_name || 'Employee',
              role: h.role || 'Senior Auditor',
              dept: h.dept || 'Audit',
              email: h.email || '',
              phone: h.phone || '',
              companyPhone: h.company_phone || '',
              civilId: h.civil_id || '',
              passportNo: h.passport_no || '',
              residencyNo: h.residency_no || '',
              nationality: h.nationality || 'Omani',
              dob: h.dob || '',
              gender: h.gender || 'Male',
              maritalStatus: h.marital_status || 'Single',
              joinedDate: h.joined_date || '',
              immediateSupervisor: h.immediate_supervisor || '',
              basicSalary: Number(h.basic_salary || 1000),
              type: (h.employee_type || 'Experienced') as 'Experienced' | 'Trainee' | 'Worker',
              accommodationStatus: h.accommodation_status || 'Lives with family',
              accommodationDetails: h.accommodation_details || '',
              allowances: h.allowances || { transport: 150, housing: 250, other: 50 },
              education: h.education || [],
              experience: h.experience || [],
              family: h.family || [],
              emergencyContact: h.emergency_contact || { name: '', relation: '', phone: '' },
              documents: h.documents || [],
              promotions: h.promotions || [],
              disciplinaries: h.disciplinaries || [],
              bonuses: h.bonuses || [],
              transfers: h.transfers || []
            });
          }
        }

        setEmployees(liveEmployees);
        localStorage.setItem('hr_employee_records', JSON.stringify(liveEmployees));
        if (liveEmployees.length > 0) {
          setSelectedEmpId(prev => prev && liveEmployees.some(e => e.id === prev) ? prev : liveEmployees[0].id);
        }
      } catch (err) {
        console.error('Failed to load live employees:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEmployeesAndSync();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('hr_dossier_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadEmployeesAndSync();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_employees' }, () => {
        loadEmployeesAndSync();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveEmployees = async (list: Employee[]) => {
    setEmployees(list);
    localStorage.setItem('hr_employee_records', JSON.stringify(list));

    // Sync real DB employees to Supabase
    for (const emp of list) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emp.id);
      if (isUuid) {
        try {
          // 1. Update profiles table
          await supabase.from('profiles').update({
            full_name: emp.name,
            phone: emp.phone,
          }).eq('id', emp.id);

          // 2. Upsert hr_employees table
          await supabase.from('hr_employees').upsert({
            id: emp.id,
            full_name: emp.name,
            email: emp.email,
            phone: emp.phone,
            company_phone: emp.companyPhone,
            civil_id: emp.civilId,
            passport_no: emp.passportNo,
            residency_no: emp.residencyNo,
            nationality: emp.nationality,
            dob: emp.dob || null,
            gender: emp.gender,
            marital_status: emp.maritalStatus,
            joined_date: emp.joinedDate || null,
            immediate_supervisor: emp.immediateSupervisor,
            basic_salary: emp.basicSalary,
            employee_type: emp.type,
            accommodation_status: emp.accommodationStatus,
            accommodation_details: emp.accommodationDetails,
            allowances: emp.allowances,
            education: emp.education,
            experience: emp.experience,
            family: emp.family,
            emergency_contact: emp.emergencyContact,
            documents: emp.documents,
            promotions: emp.promotions,
            role: emp.role,
            dept: emp.dept,
            disciplinaries: emp.disciplinaries,
            bonuses: emp.bonuses,
            transfers: emp.transfers
          }, { onConflict: 'id' });
        } catch (dbErr) {
          console.error('Error syncing employee edit to database:', dbErr);
        }
      }
    }
  };

  // Filter States
  const [deptFilter, setDeptFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [nationalityFilter, setNationalityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'seniority_old' | 'seniority_new'>('alphabetical');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    dept: string;
    emailDispatched?: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!createdCredentials) return;
    const phone = formData.phone ? formData.phone.replace(/\s+/g, '') : '';
    const text = `مرحباً ${createdCredentials.name}،\n\nتم إنشاء وتفعيل حسابك في منصة ميسرة بنجاح.\nالبريد الإلكتروني: ${createdCredentials.email}\nكلمة المرور المؤقتة: ${createdCredentials.password}\nالقسم: ${createdCredentials.dept}\nرابط تسجيل الدخول: ${window.location.origin}/login\n\nيرجى تغيير كلمة المرور عند تسجيل الدخول لأول مرة.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'salary' | 'background' | 'documents' | 'history'>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
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
  const [viewingDoc, setViewingDoc] = useState<{ name: string; type: string; expiry: string; status: string; employeeName: string } | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: 'Senior Auditor',
    dept: 'Audit',
    email: '',
    phone: '',
    companyPhone: '',
    civilId: '',
    passportNo: '',
    residencyNo: '',
    nationality: 'Omani',
    dob: '',
    gender: 'Male',
    maritalStatus: 'Single',
    joinedDate: '',
    immediateSupervisor: 'Fatma Al-Harthy',
    basicSalary: 1000,
    type: 'Experienced' as Employee['type'],
    accommodationStatus: 'Lives with family',
    accommodationDetails: '',
    transportAllowance: 150,
    housingAllowance: 250,
    otherAllowance: 50,
    degree: '',
    field: '',
    institution: '',
    year: '',
    prevRole: '',
    prevCompany: '',
    prevDuration: '',
    emergencyName: '',
    emergencyRelation: 'Parent',
    emergencyPhone: '',
    uploadedFiles: [] as Array<{ name: string; type: string; file?: File }>
  });

  const selectedEmp = employees.find(e => e.id === selectedEmpId) || employees[0];

  // Unique lists for filters
  const departments = ['All', ...Array.from(new Set(employees.map(e => e.dept)))];
  const nationalities = ['All', ...Array.from(new Set(employees.map(e => e.nationality)))];

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormError(null);
    setIsSubmitting(false);
    setFormData({
      id: `EMP-00${employees.length + 1}`,
      name: '',
      role: 'Senior Auditor',
      dept: 'Audit',
      email: '',
      phone: '',
      companyPhone: '',
      civilId: '',
      passportNo: '',
      residencyNo: '',
      nationality: 'Omani',
      dob: '',
      gender: 'Male',
      maritalStatus: 'Single',
      joinedDate: new Date().toISOString().split('T')[0],
      immediateSupervisor: 'Fatma Al-Harthy',
      basicSalary: 1000,
      type: 'Experienced',
      accommodationStatus: 'Lives with family',
      accommodationDetails: '',
      transportAllowance: 150,
      housingAllowance: 250,
      otherAllowance: 50,
      degree: '',
      field: '',
      institution: '',
      year: '',
      prevRole: '',
      prevCompany: '',
      prevDuration: '',
      emergencyName: '',
      emergencyRelation: 'Parent',
      emergencyPhone: '',
      uploadedFiles: []
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setIsEditMode(true);
    setFormError(null);
    setIsSubmitting(false);
    setFormData({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      dept: emp.dept,
      email: emp.email,
      phone: emp.phone,
      companyPhone: emp.companyPhone || '',
      civilId: emp.civilId,
      passportNo: emp.passportNo,
      residencyNo: emp.residencyNo,
      nationality: emp.nationality,
      dob: emp.dob,
      gender: emp.gender,
      maritalStatus: emp.maritalStatus,
      joinedDate: emp.joinedDate,
      immediateSupervisor: emp.immediateSupervisor,
      basicSalary: emp.basicSalary,
      type: emp.type || 'Experienced',
      accommodationStatus: emp.accommodationStatus || 'Lives with family',
      accommodationDetails: emp.accommodationDetails || '',
      transportAllowance: emp.allowances.transport,
      housingAllowance: emp.allowances.housing,
      otherAllowance: emp.allowances.other,
      degree: emp.education[0]?.degree || '',
      field: emp.education[0]?.field || '',
      institution: emp.education[0]?.institution || '',
      year: emp.education[0]?.year || '',
      prevRole: emp.experience[0]?.role || '',
      prevCompany: emp.experience[0]?.company || '',
      prevDuration: emp.experience[0]?.duration || '',
      emergencyName: emp.emergencyContact?.name || '',
      emergencyRelation: emp.emergencyContact?.relation || 'Parent',
      emergencyPhone: emp.emergencyContact?.phone || '',
      uploadedFiles: []
    });
    setShowModal(true);
  };

  const handleDelete = async (empId: string) => {
    setPendingDeleteId(empId);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    const emp = employees.find(e => e.id === id);
    const empName = emp?.name || '';
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);

    // 1. Update local state immediately
    const remaining = employees.filter(e => e.id !== id);
    setEmployees(remaining);
    if (remaining.length > 0) {
      setSelectedEmpId(remaining[0].id);
    } else {
      setSelectedEmpId(null);
    }

    // 2. Cascade delete from Supabase
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
        const { error: profError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);

        if (profError) {
          console.warn('Profile deletion notice:', profError);
        }

        setNotification({
          show: true,
          title: isAr ? 'تم الحذف بنجاح' : 'Dossier & Account Deleted',
          message: isAr 
            ? `تم حذف ملف الموظف "${empName}" وسجلاته وحساب وصوله بالكامل.` 
            : `Employee dossier and portal account for "${empName}" permanently removed from database.`,
          type: 'success'
        });
      } catch (err: any) {
        setNotification({
          show: true,
          title: isAr ? 'خطأ في الحذف' : 'Deletion Error',
          message: `Failed to sync deletion: ${err.message}`,
          type: 'error'
        });
      }
    } else {
      setNotification({
        show: true,
        title: isAr ? 'تم الحذف بنجاح' : 'Dossier Deleted',
        message: isAr ? `تم حذف ملف الموظف "${empName}" بنجاح.` : `Employee file "${empName}" removed successfully.`,
        type: 'success'
      });
    }

    // 3. Clean up localStorage cache
    try {
      const rawCache = localStorage.getItem('hr_employee_records');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        const filtered = parsed.filter((e: any) => e.id !== id && e.name !== empName);
        localStorage.setItem('hr_employee_records', JSON.stringify(filtered));
      }
    } catch (cErr) {
      console.warn('Cache cleanup error:', cErr);
    }
  };

  const handleRevokeAccess = (empId: string) => {
    setPendingRevokeId(empId);
    setShowRevokeConfirm(true);
  };

  const executeRevoke = async () => {
    if (!pendingRevokeId) return;
    const id = pendingRevokeId;
    setShowRevokeConfirm(false);
    setPendingRevokeId(null);

    const updated = employees.map(e => {
      if (e.id === id) {
        return { ...e, status: 'terminated' };
      }
      return e;
    });
    saveEmployees(updated);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'terminated' })
          .eq('id', id);

        if (error) throw error;

        setNotification({
          show: true,
          title: isAr ? 'تم إلغاء الوصول' : 'Access Revoked',
          message: isAr ? 'تم إلغاء صلاحية الوصول للنظام بنجاح وتجميد الحساب.' : 'System access suspended. Portal login access revoked.',
          type: 'success'
        });
      } catch (err: any) {
        setNotification({
          show: true,
          title: isAr ? 'خطأ في إلغاء الوصول' : 'Revocation Error',
          message: `Failed to sync access revocation: ${err.message}`,
          type: 'error'
        });
      }
    } else {
      setNotification({
        show: true,
        title: isAr ? 'تم إلغاء الوصول' : 'Access Revoked',
        message: isAr ? 'تم إلغاء صلاحية الحساب التجريبي بنجاح.' : 'Mock employee access suspended successfully.',
        type: 'success'
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileObj = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, { name: fileObj.name, type: fileType, file: fileObj }]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name?.trim() || !formData.email?.trim()) {
      setFormError(isAr ? 'يرجى إدخال الاسم الكامل والبريد الإلكتروني المؤسسي' : 'Please provide full name and corporate email');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // 1. Determine final target ID and roles
      let targetId = formData.id;
      let tempPassword = 'Welcome@' + Math.floor(1000 + Math.random() * 9000);
      let accessRole = 'employee';
      let departmentId = 'audit';

      const normalizedDept = (formData.dept || '').toLowerCase();
      const normalizedRole = (formData.role || '').toLowerCase();

      if (normalizedDept.includes('hr') || normalizedRole.includes('hr')) {
        accessRole = 'hr';
      } else if (normalizedDept.includes('finance') || normalizedDept.includes('account') || normalizedRole.includes('accountant')) {
        accessRole = 'accountant';
      } else if (normalizedRole.includes('head') || normalizedRole.includes('hod') || normalizedRole.includes('director')) {
        accessRole = 'department_head';
      }

      if (normalizedDept.includes('tax') || normalizedDept.includes('vat')) {
        departmentId = 'tax_vat';
      } else if (normalizedDept.includes('book') || normalizedDept.includes('ledger') || normalizedDept.includes('account')) {
        departmentId = 'bookkeeping';
      } else if (normalizedDept.includes('advis') || normalizedDept.includes('consult')) {
        departmentId = 'business_advisory';
      } else if (normalizedDept.includes('success') || normalizedDept.includes('client') || normalizedDept.includes('operat')) {
        departmentId = 'client_success';
      }

      let emailDispatched = false;

      if (!isEditMode) {
        // Create user in Supabase Auth via standalone client to prevent session hijack
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: tempPassword,
          options: {
            data: {
              full_name: formData.name.trim(),
              role: accessRole,
              department_id: departmentId
            }
          }
        });

        if (authError) {
          const isAlreadyRegistered =
            authError.status === 422 ||
            authError.status === 400 ||
            authError.message?.toLowerCase().includes('already registered') ||
            authError.message?.toLowerCase().includes('already exists') ||
            authError.message?.toLowerCase().includes('user');

          if (isAlreadyRegistered) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', formData.email.trim().toLowerCase())
              .maybeSingle();

            if (existingProfile?.id) {
              targetId = existingProfile.id;
            } else {
              targetId = crypto.randomUUID();
            }
          } else {
            throw authError;
          }
        } else if (authData?.user) {
          targetId = authData.user.id;
        }

        if (!targetId || targetId.startsWith('EMP-')) {
          targetId = crypto.randomUUID();
        }
      }

      // 2. Upload actual files to Supabase Storage
      const uploadedDocs: Array<{ name: string; type: string; expiry: string; status: 'active' | 'warning' | 'expired'; url?: string }> = [];

      for (const f of formData.uploadedFiles) {
        let docUrl: string | undefined = undefined;
        if (f.file) {
          try {
            const filePath = `employees/${targetId}/${f.name}`;
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, f.file, {
                cacheControl: '3600',
                upsert: true
              });

            if (!uploadError) {
              const { data } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);
              docUrl = data.publicUrl;
            } else {
              docUrl = URL.createObjectURL(f.file);
            }
          } catch (err) {
            docUrl = URL.createObjectURL(f.file);
          }
        }

        uploadedDocs.push({
          name: f.name,
          type: f.type,
          expiry: '2029-12-31',
          status: 'active',
          url: docUrl
        });
      }

      // 3. Update or Insert profiles and hr_employees in DB
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      if (isUuid) {
        // Sync profiles
        await supabase.from('profiles').upsert({
          id: targetId,
          full_name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone || '',
          role: accessRole,
          department_id: departmentId
        }, { onConflict: 'id' });

        // Sync hr_employees
        await supabase.from('hr_employees').upsert({
          id: targetId,
          full_name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone || '',
          company_phone: formData.companyPhone || '',
          civil_id: formData.civilId || '',
          passport_no: formData.passportNo || '',
          residency_no: formData.residencyNo || '',
          nationality: formData.nationality || 'Omani',
          dob: formData.dob || null,
          gender: formData.gender || 'Male',
          marital_status: formData.maritalStatus || 'Single',
          joined_date: formData.joinedDate || new Date().toISOString().split('T')[0],
          immediate_supervisor: formData.immediateSupervisor || 'Fatma Al-Harthy',
          basic_salary: Number(formData.basicSalary || 0),
          employee_type: formData.type || 'Experienced',
          accommodation_status: formData.accommodationStatus || 'Lives with family',
          accommodation_details: formData.accommodationDetails || '',
          allowances: {
            transport: Number(formData.transportAllowance || 0),
            housing: Number(formData.housingAllowance || 0),
            other: Number(formData.otherAllowance || 0)
          },
          education: formData.degree ? [{
            degree: formData.degree,
            field: formData.field,
            institution: formData.institution,
            year: formData.year
          }] : [],
          experience: formData.prevRole ? [{
            role: formData.prevRole,
            company: formData.prevCompany,
            duration: formData.prevDuration
          }] : [],
          family: [],
          emergency_contact: {
            name: formData.emergencyName || '',
            relation: formData.emergencyRelation || 'Parent',
            phone: formData.emergencyPhone || ''
          },
          documents: uploadedDocs.length > 0 ? uploadedDocs : [
            { name: 'Civil ID Card', type: 'civil_id', expiry: '2028-12-31', status: 'active' }
          ],
          promotions: [],
          disciplinaries: [],
          bonuses: [],
          transfers: [],
          role: formData.role,
          dept: formData.dept
        }, { onConflict: 'id' });
      }

      // 4. Send Welcome credentials email if new registration
      if (!isEditMode) {
        try {
          const { error: mailErr } = await supabase.functions.invoke('send-email', {
            body: {
              to: formData.email.trim().toLowerCase(),
              subject: isAr
                ? 'مرحباً بك في مجموعة ميسرة - حساب الموظف الخاص بك جاهز!'
                : 'Welcome to Maisarah - Your Employee Portal is Active!',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; color: #1f2937; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #A11212; margin: 0; font-size: 22px;">Welcome to Maisarah Group!</h2>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Employee Onboarding & Portal Activation</p>
                  </div>
                  
                  <p style="font-size: 14px; line-height: 1.6;">Dear <strong>${formData.name}</strong>,</p>
                  <p style="font-size: 14px; line-height: 1.6;">
                    ${isAr
                      ? 'يسعدنا إبلاغك بأنه قد تم تسجيلك بنجاح في المنصة الرقمية لمجموعة ميسرة. تم إنشاء وتفعيل حساب الموظف الخاص بك.'
                      : 'We are pleased to inform you that your employee record has been registered in the Maisarah platform. Your portal account is now active.'}
                  </p>

                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin: 24px 0;">
                    <h4 style="margin: 0 0 12px 0; color: #111827; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Your Access Credentials:</h4>
                    <p style="margin: 6px 0; font-size: 13px;"><strong>Portal URL:</strong> <a href="${window.location.origin}/login" style="color: #A11212; text-decoration: underline;">${window.location.origin}/login</a></p>
                    <p style="margin: 6px 0; font-size: 13px;"><strong>Email Address:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${formData.email.trim().toLowerCase()}</code></p>
                    <p style="margin: 6px 0; font-size: 13px;"><strong>Temporary Password:</strong> <code style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${tempPassword}</code></p>
                    <p style="margin: 6px 0; font-size: 13px;"><strong>Designated Role:</strong> ${formData.role}</p>
                    <p style="margin: 6px 0; font-size: 13px;"><strong>Department:</strong> ${formData.dept}</p>
                  </div>

                  <p style="font-size: 13px; color: #4b5563; line-height: 1.5;">
                    ${isAr
                      ? 'يرجى تسجيل الدخول لتحديث ملفك وتغيير كلمة المرور المؤقتة لضمان أمان حسابك.'
                      : 'Please sign in to access your employee workspace and change your temporary password upon initial login.'}
                  </p>

                  <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
                    <p style="margin: 0;">Maisarah Corporate Platform • Human Resources Department</p>
                  </div>
                </div>
              `
            }
          });
          if (!mailErr) emailDispatched = true;
        } catch (mailErr) {
          console.warn('Welcome credentials email failed:', mailErr);
        }
      }

      // 5. Update local state
      if (isEditMode) {
        const updatedList = employees.map(emp => {
          if (emp.id === formData.id) {
            return {
              ...emp,
              name: formData.name,
              role: formData.role,
              dept: formData.dept,
              email: formData.email,
              phone: formData.phone,
              companyPhone: formData.companyPhone,
              civilId: formData.civilId,
              passportNo: formData.passportNo,
              residencyNo: formData.residencyNo,
              nationality: formData.nationality,
              dob: formData.dob,
              gender: formData.gender,
              maritalStatus: formData.maritalStatus,
              joinedDate: formData.joinedDate,
              immediateSupervisor: formData.immediateSupervisor,
              basicSalary: Number(formData.basicSalary),
              type: formData.type,
              accommodationStatus: formData.accommodationStatus,
              accommodationDetails: formData.accommodationDetails,
              allowances: {
                transport: Number(formData.transportAllowance),
                housing: Number(formData.housingAllowance),
                other: Number(formData.otherAllowance)
              },
              education: formData.degree ? [{
                degree: formData.degree,
                field: formData.field,
                institution: formData.institution,
                year: formData.year
              }] : emp.education,
              experience: formData.prevRole ? [{
                role: formData.prevRole,
                company: formData.prevCompany,
                duration: formData.prevDuration
              }] : emp.experience,
              emergencyContact: {
                name: formData.emergencyName,
                relation: formData.emergencyRelation,
                phone: formData.emergencyPhone
              },
              documents: [...emp.documents, ...uploadedDocs.filter(d => !emp.documents.some(ed => ed.name === d.name))]
            };
          }
          return emp;
        });
        setEmployees(updatedList);
        localStorage.setItem('hr_employee_records', JSON.stringify(updatedList));

        setNotification({
          show: true,
          title: isAr ? 'تم تحديث الملف' : 'Dossier Updated',
          message: isAr ? 'تم حفظ التعديلات على ملف الموظف بنجاح.' : 'Employee dossier updated successfully.',
          type: 'success'
        });
        setShowModal(false);
      } else {
        const newEmp: Employee = {
          id: targetId,
          name: formData.name,
          role: formData.role,
          dept: formData.dept,
          email: formData.email,
          phone: formData.phone,
          companyPhone: formData.companyPhone,
          civilId: formData.civilId,
          passportNo: formData.passportNo,
          residencyNo: formData.residencyNo,
          nationality: formData.nationality,
          dob: formData.dob,
          gender: formData.gender,
          maritalStatus: formData.maritalStatus,
          joinedDate: formData.joinedDate || new Date().toISOString().split('T')[0],
          immediateSupervisor: formData.immediateSupervisor,
          basicSalary: Number(formData.basicSalary),
          type: formData.type,
          accommodationStatus: formData.accommodationStatus,
          accommodationDetails: formData.accommodationDetails,
          allowances: {
            transport: Number(formData.transportAllowance),
            housing: Number(formData.housingAllowance),
            other: Number(formData.otherAllowance)
          },
          education: formData.degree ? [{
            degree: formData.degree,
            field: formData.field,
            institution: formData.institution,
            year: formData.year
          }] : [],
          experience: formData.prevRole ? [{
            role: formData.prevRole,
            company: formData.prevCompany,
            duration: formData.prevDuration
          }] : [],
          family: [],
          emergencyContact: {
            name: formData.emergencyName,
            relation: formData.emergencyRelation,
            phone: formData.emergencyPhone
          },
          documents: uploadedDocs.length > 0 ? uploadedDocs : [
            { name: 'Civil ID Card', type: 'civil_id', expiry: '2028-12-31', status: 'active' as const }
          ],
          promotions: [],
          disciplinaries: [],
          bonuses: [],
          transfers: []
        };
        const nextList = [newEmp, ...employees.filter(e => e.id !== targetId)];
        setEmployees(nextList);
        localStorage.setItem('hr_employee_records', JSON.stringify(nextList));
        setSelectedEmpId(newEmp.id);

        setCreatedCredentials({
          name: formData.name,
          email: formData.email,
          password: tempPassword,
          role: formData.role,
          dept: formData.dept,
          emailDispatched
        });
        setShowCredentialsModal(true);
        setShowModal(false);
      }
    } catch (err: any) {
      console.error("Employee registration error:", err);
      setFormError(err.message || (isAr ? 'فشل تسجيل الموظف. يرجى المحاولة مجدداً.' : 'Failed to register employee. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Sort Logic
  const filteredEmployees = employees
    .filter(emp => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = deptFilter === 'All' || emp.dept === deptFilter;
      const matchesGender = genderFilter === 'All' || emp.gender === genderFilter;
      const matchesNationality = nationalityFilter === 'All' || emp.nationality === nationalityFilter;
      const matchesType = typeFilter === 'All' || emp.type === typeFilter;

      return matchesSearch && matchesDept && matchesGender && matchesNationality && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'seniority_old') {
        return new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime();
      }
      if (sortBy === 'seniority_new') {
        return new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime();
      }
      return 0;
    });

  // Overview metrics
  const countExperienced = employees.filter(e => e.type === 'Experienced').length;
  const countTrainees = employees.filter(e => e.type === 'Trainee').length;
  const countWorkers = employees.filter(e => e.type === 'Worker').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <User className="text-[#A11212]" size={22} />
            {isAr ? 'إدارة الموظفين والملفات الإلكترونية' : 'Employee Dossier Registry'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'تسجيل الموظفين الجدد، تعديل البيانات والمستندات الرسمية' : 'Register corporate recruits, upload documents, and manage details'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                viewMode === 'split' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Grid Table
            </button>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="bg-[#A11212] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl hover:bg-[#800e0e] shadow-sm transition-all"
          >
            {isAr ? 'تسجيل موظف' : 'Add Employee'}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Total Staff</p>
          <h3 className="text-xl font-black text-gray-900 mt-1">{employees.length}</h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <p className="text-[9px] text-[#A11212] font-black uppercase tracking-widest">Experienced Professionals</p>
          <h3 className="text-xl font-black text-gray-900 mt-1">{countExperienced}</h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <p className="text-[9px] text-orange-655 font-black uppercase tracking-widest">Trainees / Interns</p>
          <h3 className="text-xl font-black text-gray-900 mt-1">{countTrainees}</h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <p className="text-[9px] text-green-700 font-black uppercase tracking-widest">General Workers</p>
          <h3 className="text-xl font-black text-gray-900 mt-1">{countWorkers}</h3>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-50">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-[#A11212]" /> Search Filters & sorting
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {/* Search bar inside filters panel */}
          <div className="col-span-2">
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Search Directory</label>
            <div className="relative">
              <Search size={14} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
              <input
                type="text"
                placeholder="Search dossier records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs font-bold outline-none focus:border-[#A11212] transition-all`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Category Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="All">All Types</option>
              <option value="Experienced">Experienced</option>
              <option value="Trainee">Trainee</option>
              <option value="Worker">Worker</option>
            </select>
          </div>

          <div>
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Nationality</label>
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              {nationalities.map(nat => <option key={nat} value={nat}>{nat}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="alphabetical">Alphabetical (A-Z)</option>
              <option value="seniority_old">Joining Date (Oldest First)</option>
              <option value="seniority_new">Joining Date (Newest First)</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'split' ? (
        /* Split view: directory list on left, detail view on right */
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
          {/* Left list */}
          <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-100 p-4 flex flex-col shadow-sm">
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[700px] no-scrollbar">
              {filteredEmployees.map((emp, index) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmpId(emp.id)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between border transition-all text-start ${
                    selectedEmpId === emp.id
                      ? 'bg-[#A11212]/5 border-[#A11212]'
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <h4 className="font-black text-sm text-gray-900">{emp.name}</h4>
                    <p className="text-[10px] text-gray-500 font-bold">{emp.role} · {emp.dept}</p>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    #{index + 1}
                  </span>
                </button>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-8">No employees match filters.</p>
              )}
            </div>
          </div>

          {/* Right detail view */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
            {selectedEmp ? (
              <>
                {/* Header Profile info card */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pb-6 border-b border-gray-100 justify-between">
                  <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-start flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-[#A11212] text-white font-black text-2xl flex items-center justify-center shadow-md">
                      {selectedEmp.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{selectedEmp.name}</h2>
                      <p className="text-xs font-bold text-gray-500">{selectedEmp.role} · {selectedEmp.dept}</p>
                      <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                        <span className="text-[9px] bg-red-50 text-red-700 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {selectedEmp.nationality}
                        </span>
                        <span className="text-[9px] bg-gray-100 text-gray-700 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Supervisor: {selectedEmp.immediateSupervisor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 items-center">
                    {selectedEmp.email !== 'hr@maisarah.om' && selectedEmp.email !== 'manager@maisarah.om' && (
                      <button
                        onClick={() => handleRevokeAccess(selectedEmp.id)}
                        className="px-3.5 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                        title="Revoke System Access"
                      >
                        <UserX size={14} /> Revoke Access
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(selectedEmp)}
                      className="p-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl hover:text-[#A11212] hover:border-[#A11212] transition-colors"
                      title="Edit Dossier"
                    >
                      <Edit size={16} />
                    </button>
                    {selectedEmp.email !== 'hr@maisarah.om' && selectedEmp.email !== 'manager@maisarah.om' ? (
                      <button
                        onClick={() => handleDelete(selectedEmp.id)}
                        className="p-2.5 bg-gray-50 border border-gray-200 text-gray-655 rounded-xl hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
                        title="Delete Dossier"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/60" title="Core System Administrator cannot be deleted">
                        {isAr ? 'حساب نظام محمي' : 'Protected Account'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dossier sub tabs */}
                <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar gap-2 py-3 mb-6">
                  {[
                    { id: 'profile', icon: User, label: isAr ? 'الملف الشخصي' : 'Profile' },
                    { id: 'salary', icon: DollarSign, label: isAr ? 'الراتب والبدلات' : 'Compensation' },
                    { id: 'background', icon: GraduationCap, label: isAr ? 'الخلفية والأسرة' : 'Credentials & Family' },
                    { id: 'documents', icon: FileText, label: isAr ? 'الوثائق والمستندات' : 'Documents' },
                    { id: 'history', icon: TrendingUp, label: isAr ? 'السجلات والترقيات' : 'History & Records' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap ${
                        activeSubTab === tab.id
                          ? 'bg-[#A11212] text-white shadow-sm'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Sub Tab contents */}
                <div className="flex-1 space-y-6">
                  {activeSubTab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Personal Data</h3>
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                          <div className="col-span-2">
                            <p className="text-[10px] text-gray-400 font-bold">System Employee ID (UUID)</p>
                            <p className="text-xs font-black text-gray-900 select-all font-mono break-all">{selectedEmp.id}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Civil ID</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.civilId || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Passport No.</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.passportNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Residency No.</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.residencyNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Date of Birth</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.dob || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Gender</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.gender}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Marital Status</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.maritalStatus}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Contact & Work Info</h3>
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                          <div className="col-span-2">
                            <p className="text-[10px] text-gray-400 font-bold">Email Address</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.email}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Personal Phone</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Company Phone</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.companyPhone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Joined Date</p>
                            <p className="text-xs font-black text-gray-900">{selectedEmp.joinedDate || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">Accommodation Status</p>
                            <p className="text-xs font-black text-[#A11212]">
                              {selectedEmp.accommodationStatus || 'Lives with family'}
                              {selectedEmp.accommodationStatus === 'Company Accommodation' && selectedEmp.accommodationDetails && (
                                <span className="block text-[10px] text-gray-500 font-normal mt-0.5">({selectedEmp.accommodationDetails})</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'أيام العمل' : 'Work Schedule'}</p>
                            <p className="text-xs font-black text-gray-900">
                              {isAr 
                                ? `${getWorkSchedule(selectedEmp.nationality).days} أيام (${getWorkSchedule(selectedEmp.nationality).scheduleAr})` 
                                : `${getWorkSchedule(selectedEmp.nationality).days} Days (${getWorkSchedule(selectedEmp.nationality).schedule})`
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">{isAr ? 'عطلة نهاية الأسبوع' : 'Weekly Rest (Weekend)'}</p>
                            <p className="text-xs font-black text-[#A11212]">
                              {isAr 
                                ? getWorkSchedule(selectedEmp.nationality).weekendAr 
                                : getWorkSchedule(selectedEmp.nationality).weekend
                              }
                            </p>
                          </div>
                          <div className="col-span-2 border-t border-gray-200/50 pt-2.5">
                            <p className="text-[10px] text-gray-400 font-bold">Emergency Contact</p>
                            <p className="text-xs font-black text-gray-900">
                              {selectedEmp.emergencyContact?.name 
                                ? `${selectedEmp.emergencyContact.name} (${selectedEmp.emergencyContact.relation || 'Relation'})` 
                                : 'N/A'}
                            </p>
                            {selectedEmp.emergencyContact?.phone && (
                              <p className="text-[10px] text-gray-500 mt-0.5">{selectedEmp.emergencyContact.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'salary' && (
                    <div className="space-y-6">
                      <div className="bg-[#A11212]/5 border border-[#A11212]/20 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="text-xs font-black text-[#A11212] uppercase tracking-wider">Total Monthly Package</p>
                          <h3 className="text-3xl font-black text-gray-900 mt-1">
                            {selectedEmp.basicSalary + selectedEmp.allowances.transport + selectedEmp.allowances.housing + selectedEmp.allowances.other} OMR
                          </h3>
                        </div>
                        <div className="text-end">
                          <p className="text-[10px] text-gray-400 font-bold">Basic Salary</p>
                          <p className="text-lg font-black text-gray-700">{selectedEmp.basicSalary} OMR</p>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Allowances Breakdown</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] text-gray-400 font-bold">Housing Allowance</p>
                            <p className="text-base font-black text-gray-900">{selectedEmp.allowances.housing} OMR</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] text-gray-400 font-bold">Transport Allowance</p>
                            <p className="text-base font-black text-gray-900">{selectedEmp.allowances.transport} OMR</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-[10px] text-gray-400 font-bold">Other Allowances</p>
                            <p className="text-base font-black text-gray-900">{selectedEmp.allowances.other} OMR</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'background' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Education</h3>
                          <div className="space-y-3">
                            {selectedEmp.education.map((edu, idx) => (
                              <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs font-black text-gray-900">{edu.degree} in {edu.field}</p>
                                <p className="text-[10px] text-gray-500 font-bold">{edu.institution} · {edu.year}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4 border-t border-gray-100 pt-4">
                          <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Prior Work Experience</h3>
                          {selectedEmp.experience && selectedEmp.experience.length > 0 ? (
                            <div className="space-y-3">
                              {selectedEmp.experience.map((exp, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                  <p className="text-xs font-black text-gray-900">{exp.role}</p>
                                  <p className="text-[10px] text-gray-550 font-bold">{exp.company} · {exp.duration}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center p-8 bg-gray-50 rounded-xl text-gray-400 text-xs">
                              No prior experience records registered.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Family Members</h3>
                        {selectedEmp.family.length > 0 ? (
                          <div className="space-y-3">
                            {selectedEmp.family.map((fam, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                  <p className="text-xs font-black text-gray-900">{fam.name}</p>
                                  <p className="text-[10px] text-gray-500 font-bold">{fam.relation}</p>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold">DOB: {fam.dob}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center p-8 bg-gray-50 rounded-xl text-gray-400 text-xs">
                            No family member records registered.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'documents' && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Dossier Documents</h3>
                      <div className="space-y-3">
                        {selectedEmp.documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-150 hover:border-gray-300 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#A11212] border border-gray-200 shadow-xs">
                                <FileText size={18} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-900">{doc.name}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Expiry: {doc.expiry}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                doc.status === 'active' ? 'bg-green-50 text-green-700 border border-green-150' :
                                doc.status === 'warning' ? 'bg-orange-50 text-orange-700 border border-orange-150' :
                                'bg-red-50 text-red-700 border border-red-150'
                              }`}>
                                {doc.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (doc.url) {
                                    window.open(doc.url, '_blank');
                                  } else {
                                    setViewingDoc({
                                      name: doc.name,
                                      type: doc.type,
                                      expiry: doc.expiry,
                                      status: doc.status,
                                      employeeName: selectedEmp.name
                                    });
                                  }
                                }}
                                className="text-[10px] font-black text-gray-500 hover:text-[#A11212] uppercase cursor-pointer"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'history' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Promotion History</h3>
                        {selectedEmp.promotions.length > 0 ? (
                          <div className="space-y-3">
                            {selectedEmp.promotions.map((p, idx) => (
                              <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-gray-900">{p.to}</p>
                                  <p className="text-[10px] text-gray-500 font-bold">From: {p.from}</p>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold">{p.date}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-450 italic">No promotions recorded.</p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Disciplinary Records</h3>
                        {selectedEmp.disciplinaries.length > 0 ? (
                          <div className="space-y-3">
                            {selectedEmp.disciplinaries.map((d, idx) => (
                              <div key={idx} className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                                <p className="text-xs font-bold text-gray-900">{d.reason}</p>
                                <p className="text-[10px] text-red-700 font-black mt-1">Action: {d.action}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-green-50/30 border border-green-100 p-4 rounded-xl flex items-center gap-2 text-green-700">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold">Clean record. No disciplinaries.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Select an employee file to display the dossier.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Table / Grid view */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'الرقم' : '#'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'القسم' : 'Department'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'التصنيف' : 'Type'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'تاريخ الانضمام' : 'Joined Date'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'الجنسية' : 'Nationality'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'أيام العمل' : 'Work Week'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'الراتب' : 'Salary'}</th>
                  <th className="text-[10px] font-black uppercase text-gray-400 tracking-wider p-4 text-start">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp, index) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-xs font-black text-gray-900">#{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#A11212]/5 text-[#A11212] font-black text-xs flex items-center justify-center">
                          {emp.name.charAt(0)}
                        </div>
                        <div 
                          className="cursor-pointer group"
                          onClick={() => {
                            setSelectedEmpId(emp.id);
                            setViewMode('split');
                          }}
                        >
                          <p className="text-xs font-black text-gray-900 group-hover:text-[#A11212] group-hover:underline transition-all">{emp.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold">{emp.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-600">{emp.dept}</td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        emp.type === 'Experienced' ? 'bg-red-50 text-red-700 border-red-100' :
                        emp.type === 'Trainee' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-green-50 text-green-700 border-green-100'
                      }`}>
                        {emp.type}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-500">{emp.joinedDate}</td>
                    <td className="p-4 text-xs font-black text-gray-700">{emp.nationality}</td>
                    <td className="p-4 text-xs font-bold text-gray-650">
                      {getWorkSchedule(emp.nationality).days} {isAr ? 'أيام' : 'Days'}
                    </td>
                    <td className="p-4 text-xs font-black text-gray-900">{emp.basicSalary} OMR</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedEmpId(emp.id);
                            setViewMode('split');
                          }}
                          className="text-[10px] font-black text-gray-500 hover:text-[#A11212] uppercase cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="text-[10px] font-black text-gray-500 hover:text-[#A11212] uppercase cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="text-[10px] font-black text-gray-400 hover:text-red-700 uppercase cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-gray-400">
                      No employees match selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 border border-gray-100 animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isEditMode ? (isAr ? 'تعديل ملف الموظف' : 'Edit Employee Dossier') : (isAr ? 'تسجيل موظف جديد' : 'Register New Employee')}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Inline Error Message */}
            {formError && (
              <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-shake">
                <AlertCircle size={18} className="shrink-0 text-[#A11212]" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Salim Al-Harthy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'البريد الإلكتروني المؤسسي *' : 'Corporate Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@maisarah.om"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'المسمى الوظيفي' : 'Designated Role'}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Senior Auditor">Senior Auditor</option>
                    <option value="Tax Consultant">Tax Consultant</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Risk Analyst">Risk Analyst</option>
                    <option value="Junior Associate">Junior Associate</option>
                    <option value="Department Head (HOD)">Department Head (HOD)</option>
                    <option value="HR Specialist">HR Specialist</option>
                    <option value="Operations Associate">Operations Associate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'القسم' : 'Department'}
                  </label>
                  <select
                    value={formData.dept}
                    onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Audit">Audit</option>
                    <option value="Tax & VAT">Tax & VAT</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Business Advisory">Business Advisory</option>
                    <option value="Client Success">Client Success</option>
                    <option value="HR & Admin">HR & Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'فئة الموظف' : 'Category Type'}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Experienced">Experienced (خبير)</option>
                    <option value="Trainee">Trainee (متدرب)</option>
                    <option value="Worker">Worker (عامل)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الرقم المدني' : 'Civil ID Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="109876543"
                    value={formData.civilId}
                    onChange={(e) => setFormData({ ...formData, civilId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'رقم جواز السفر' : 'Passport Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="OM123456"
                    value={formData.passportNo}
                    onChange={(e) => setFormData({ ...formData, passportNo: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'رقم الإقامة' : 'Residency Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="PR987654"
                    value={formData.residencyNo}
                    onChange={(e) => setFormData({ ...formData, residencyNo: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الهاتف الشخصي' : 'Personal Phone Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="+968..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'هاتف العمل' : 'Company Phone Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="+968 2456..."
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'حالة السكن' : 'Accommodation Status'}
                  </label>
                  <select
                    value={formData.accommodationStatus}
                    onChange={(e) => setFormData({ ...formData, accommodationStatus: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Lives with family">Lives with family</option>
                    <option value="Company Accommodation">Company Accommodation</option>
                  </select>
                  {formData.accommodationStatus === 'Company Accommodation' && (
                    <input
                      type="text"
                      placeholder="e.g. Building 12, Flat 3B, Muscat"
                      value={formData.accommodationDetails || ''}
                      onChange={(e) => setFormData({ ...formData, accommodationDetails: e.target.value })}
                      className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] animate-scale-up"
                    />
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">
                  {isAr ? 'بيانات جهة الاتصال في حالات الطوارئ' : 'Emergency Contact (Parent/Family Info)'}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      {isAr ? 'اسم جهة الاتصال' : 'Contact Name'}
                    </label>
                    <input
                      type="text"
                      placeholder="Parent/Spouse Name"
                      value={formData.emergencyName}
                      onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      {isAr ? 'صلة القرابة' : 'Relation'}
                    </label>
                    <select
                      value={formData.emergencyRelation}
                      onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      {isAr ? 'هاتف الطوارئ' : 'Emergency Phone'}
                    </label>
                    <input
                      type="text"
                      placeholder="+968..."
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الجنسية' : 'Nationality'}
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                  <div className="mt-1 flex flex-col text-[8px] text-gray-500 font-bold leading-normal">
                    <span>
                      {isAr ? 'نظام العمل: ' : 'Schedule: '}
                      <span className="text-[#A11212]">
                        {isAr 
                          ? `${getWorkSchedule(formData.nationality).days} أيام (${getWorkSchedule(formData.nationality).scheduleAr})` 
                          : `${getWorkSchedule(formData.nationality).days} Days (${getWorkSchedule(formData.nationality).schedule})`
                        }
                      </span>
                    </span>
                    <span>
                      {isAr ? 'الإجازة الأسبوعية: ' : 'Weekend: '}
                      <span className="text-gray-700">
                        {isAr ? getWorkSchedule(formData.nationality).weekendAr : getWorkSchedule(formData.nationality).weekend}
                      </span>
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الجنس' : 'Gender'}
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الحالة الاجتماعية' : 'Marital Status'}
                  </label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'تاريخ الميلاد' : 'DOB'}
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'تاريخ مباشرة العمل' : 'Joined Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.joinedDate}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'المشرف المباشر' : 'Supervisor'}
                  </label>
                  <input
                    type="text"
                    placeholder="Fatma Al-Harthy"
                    value={formData.immediateSupervisor}
                    onChange={(e) => setFormData({ ...formData, immediateSupervisor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الراتب الأساسي (ر.ع)' : 'Basic Salary (OMR)'}
                  </label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              {/* Academic Qualifications Section */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">
                  {isAr ? 'المؤهلات العلمية' : 'Academic Qualifications'}
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Degree</label>
                    <input
                      type="text"
                      placeholder="Bachelor, Master, etc."
                      value={formData.degree}
                      onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Field of Study</label>
                    <input
                      type="text"
                      placeholder="Accounting, Computer Sci, etc."
                      value={formData.field}
                      onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Institution</label>
                    <input
                      type="text"
                      placeholder="Sultan Qaboos University"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Graduation Year</label>
                    <input
                      type="text"
                      placeholder="2020"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                </div>
              </div>

              {/* Work Experience Section */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">
                  {isAr ? 'الخبرات العملية السابقة' : 'Previous Work Experience'}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Previous Job Title</label>
                    <input
                      type="text"
                      placeholder="Tax Auditor, Accountant, etc."
                      value={formData.prevRole}
                      onChange={(e) => setFormData({ ...formData, prevRole: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Company Name</label>
                    <input
                      type="text"
                      placeholder="EY Oman, Deloitte, etc."
                      value={formData.prevCompany}
                      onChange={(e) => setFormData({ ...formData, prevCompany: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Duration</label>
                    <input
                      type="text"
                      placeholder="3 Years, 6 Months, etc."
                      value={formData.prevDuration}
                      onChange={(e) => setFormData({ ...formData, prevDuration: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                </div>
              </div>

              {/* Uploading Files Section */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">
                  {isAr ? 'إرفاق المستندات والشهادات' : 'Attach Scans & File Certificates'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer relative hover:bg-gray-100 transition-colors">
                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                    <span className="text-[9px] font-black text-gray-500 uppercase">Passport Copy Scan</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'Passport Copy')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer relative hover:bg-gray-100 transition-colors">
                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                    <span className="text-[9px] font-black text-gray-500 uppercase">Civil ID Scan</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'Civil ID Card')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer relative hover:bg-gray-100 transition-colors">
                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                    <span className="text-[9px] font-black text-gray-500 uppercase">Residency Permit Scan</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'Residency Permit')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer relative hover:bg-gray-100 transition-colors">
                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                    <span className="text-[9px] font-black text-gray-500 uppercase">Employment Contract</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'Employment Contract')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer relative hover:bg-gray-100 transition-colors">
                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                    <span className="text-[9px] font-black text-gray-500 uppercase">Academic Certificate</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'Academic Certificate')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center cursor-pointer relative hover:bg-gray-100 transition-colors">
                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                    <span className="text-[9px] font-black text-gray-500 uppercase">Experience Certificate</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'Experience Certificate')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {formData.uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Selected Attachments</p>
                    {formData.uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-150">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-700">{file.name}</span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase">{file.type}</span>
                        </div>
                        <div className="flex gap-2">
                          {file.file && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = URL.createObjectURL(file.file!);
                                window.open(url, '_blank');
                              }}
                              className="text-[9px] bg-blue-50 text-blue-700 font-black uppercase px-2.5 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="text-[9px] bg-red-50 text-red-700 font-black uppercase px-2.5 py-1 rounded border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{isAr ? 'جاري التسجيل وتفعيل الحساب...' : 'Registering & Activating...'}</span>
                  </>
                ) : (
                  <span>{isEditMode ? (isAr ? 'حفظ التعديلات' : 'Save Modifications') : (isAr ? 'تسجيل الموظف' : 'Register Employee')}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Employee Credentials & Registration Success Modal ── */}
      {showCredentialsModal && createdCredentials && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
            {/* Header */}
            <div className="p-6 text-center border-b border-gray-100 bg-gradient-to-b from-green-50/50 to-white relative">
              <div className="mx-auto w-14 h-14 bg-green-100/80 rounded-2xl flex items-center justify-center text-green-700 mb-3 shadow-xs">
                <CheckCircle2 size={30} className="text-green-600" />
              </div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'تم تسجيل الموظف وتفعيل الحساب بنجاح' : 'EMPLOYEE REGISTERED SUCCESSFULLY'}
              </h3>
              <p className="text-xs text-gray-500 font-bold mt-1">
                {isAr 
                  ? 'تم إنشاء الملف الوظيفي وبيانات تسجيل الدخول إلى منصة ميسرة.'
                  : 'Employee profile dossier and authentication access credentials have been initialized.'
                }
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-6 space-y-4">
              {/* Employee Summary Card */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'اسم الموظف' : 'Full Name'}</span>
                  <span className="text-xs font-black text-gray-900">{createdCredentials.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'المسمى والفرع' : 'Role & Department'}</span>
                  <span className="text-xs font-black text-[#A11212]">{createdCredentials.role} • {createdCredentials.dept}</span>
                </div>

                {/* Email address with copy */}
                <div className="flex justify-between items-center pt-1">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'البريد المؤسسي' : 'Corporate Email'}</p>
                    <p className="text-xs font-mono font-bold text-gray-800 mt-0.5">{createdCredentials.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(createdCredentials.email, 'email')}
                    className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === 'email' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    <span className="text-[10px]">{copiedField === 'email' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>

                {/* Password with copy */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{isAr ? 'كلمة المرور المؤقتة' : 'Temporary Password'}</p>
                    <p className="text-xs font-mono font-black text-[#A11212] mt-0.5 tracking-wider bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-block">
                      {createdCredentials.password}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(createdCredentials.password, 'password')}
                    className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === 'password' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    <span className="text-[10px]">{copiedField === 'password' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              {/* Email dispatch badge */}
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                createdCredentials.emailDispatched
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <Mail size={16} className={createdCredentials.emailDispatched ? 'text-green-600' : 'text-amber-600'} />
                <span>
                  {createdCredentials.emailDispatched
                    ? (isAr ? `تم إرسال بريد ترحيبي مع بيانات الدخول إلى ${createdCredentials.email}` : `Welcome login email dispatched to ${createdCredentials.email}`)
                    : (isAr ? 'يرجى مشاركة بيانات الدخول المؤقتة مع الموظف مباشرة.' : 'Please share these temporary credentials directly with the employee.')
                  }
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const allText = `Maisarah Employee Account:\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}\nPortal URL: ${window.location.origin}/login`;
                  handleCopyText(allText, 'all');
                }}
                className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedField === 'all' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copiedField === 'all' ? (isAr ? 'تم نسخ كافة البيانات' : 'Copied All') : (isAr ? 'نسخ كافة البيانات' : 'Copy All')}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Share2 size={14} />
                <span>{isAr ? 'مشاركة عبر واتساب' : 'WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCreatedCredentials(null);
                }}
                className="flex-1 py-3 px-4 bg-[#A11212] hover:bg-[#800e0e] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs text-center"
              >
                {isAr ? 'حسناً' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Custom Delete Confirmation Modal */}
      {showDeleteConfirm && pendingDeleteId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-scale-up border border-gray-100">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#A11212] animate-pulse">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'تأكيد حذف الملف' : 'Confirm Dossier Deletion'}
              </h3>
              <p className="text-xs text-gray-505 mt-2 leading-relaxed font-bold">
                {isAr 
                  ? `هل أنت متأكد من حذف ملف الموظف "${employees.find(e => e.id === pendingDeleteId)?.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذفه من قاعدة البيانات.`
                  : `Are you sure you want to permanently delete the employee dossier for "${employees.find(e => e.id === pendingDeleteId)?.name}"? This action is irreversible and will remove all database records.`
                }
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPendingDeleteId(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] hover:shadow-lg transition-all cursor-pointer"
              >
                {isAr ? 'تأكيد الحذف' : 'Confirm & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Custom Revoke Access Confirmation Modal */}
      {showRevokeConfirm && pendingRevokeId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-scale-up border border-gray-100">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#A11212] animate-pulse">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'تأكيد إلغاء صلاحية الوصول' : 'Suspend Portal Access'}
              </h3>
              <p className="text-xs text-gray-505 mt-2 leading-relaxed font-bold">
                {isAr 
                  ? `هل أنت متأكد من إلغاء صلاحيات وصول الموظف "${employees.find(e => e.id === pendingRevokeId)?.name}" للنظام فوراً؟ سيتم تعليق حسابه ومنعه من تسجيل الدخول.`
                  : `Are you sure you want to suspend portal login access for "${employees.find(e => e.id === pendingRevokeId)?.name}"? Their account access will be frozen immediately.`
                }
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRevokeConfirm(false);
                  setPendingRevokeId(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeRevoke}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] hover:shadow-lg transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء الصلاحيات' : 'Confirm & Suspend'}
              </button>
            </div>
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
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
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

      {/* ── Document Viewer Modal ── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-scale-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Document Preview</h3>
                <p className="text-[10px] text-gray-400 font-bold mt-1">File: {viewingDoc.name}</p>
              </div>
              <button 
                onClick={() => setViewingDoc(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document Content Wrapper */}
            <div className="p-8 bg-gray-100 flex-1 flex justify-center items-center">
              <div className="bg-white w-full aspect-[1/1.414] rounded-2xl shadow-md border border-gray-200 p-6 flex flex-col justify-between relative overflow-hidden">
                {/* Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                  <div className="w-64 h-64 bg-[#A11212] rounded-full flex items-center justify-center text-white text-[120px] font-black">م</div>
                </div>

                {/* Doc Header */}
                <div className="border-b-2 border-[#A11212] pb-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-[10px] font-black text-[#A11212] tracking-widest uppercase">Maisarah HR Registry</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Secured Document Vault</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] bg-green-50 text-green-700 font-black px-2 py-0.5 rounded border border-green-150 uppercase tracking-widest">
                      {viewingDoc.status}
                    </span>
                  </div>
                </div>

                {/* Doc Body */}
                <div className="my-8 space-y-6 flex-1 flex flex-col justify-center">
                  <div className="text-center">
                    <span className="text-[10px] text-[#A11212] font-black uppercase tracking-widest">Official Document</span>
                    <h2 className="text-xl font-black text-gray-900 mt-1 uppercase tracking-wider">{viewingDoc.type}</h2>
                  </div>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-150 text-xs">
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-gray-400 font-bold">Employee Name:</span>
                      <span className="font-black text-gray-900">{viewingDoc.employeeName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-gray-400 font-bold">Document Type:</span>
                      <span className="font-black text-gray-900">{viewingDoc.type}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                      <span className="text-gray-400 font-bold">File Reference:</span>
                      <span className="font-mono text-gray-700">{viewingDoc.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-bold">Expiry Date:</span>
                      <span className="font-black text-[#A11212]">{viewingDoc.expiry}</span>
                    </div>
                  </div>

                  <div className="text-[8px] text-gray-400 text-center font-bold">
                    This document copy is verified by the Maisarah Human Resources Department.
                  </div>
                </div>

                {/* Doc Footer */}
                <div className="border-t border-gray-150 pt-4 flex justify-between items-center text-[7px] text-gray-400 font-bold">
                  <span>SYSTEM HASH: SHA-256/MSRH-{viewingDoc.name.split('.')[0]}</span>
                  <span>CONFIDENTIAL</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  alert('Document download initiated successfully.');
                }}
                className="flex-1 py-2.5 bg-[#A11212] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#800e0e] transition-all cursor-pointer"
              >
                Download PDF
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
