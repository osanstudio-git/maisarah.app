import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Search, User, Phone, MapPin, Briefcase, DollarSign,
  GraduationCap, Award, Users as FamilyIcon, PhoneCall,
  FileText, TrendingUp, AlertTriangle, Gift, ArrowLeftRight,
  Download, UploadCloud, Plus, Edit, Trash2, CheckCircle2, X, PlusCircle, LayoutGrid, ListFilter, SlidersHorizontal, UserX, AlertCircle, ShieldAlert
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
  documents: Array<{ name: string; type: string; expiry: string; status: 'active' | 'expired' | 'warning' }>;
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
        const { data: dbEmployees, error } = await supabase
          .from('hr_employees')
          .select('*');

        const saved = localStorage.getItem('hr_employee_records');
        let baseList = saved ? JSON.parse(saved) : MOCK_EMPLOYEES;

        if (dbEmployees && dbEmployees.length > 0) {
          const mappedDb = dbEmployees.map((item: any) => ({
            id: item.id,
            name: item.full_name,
            role: item.role || 'Senior Auditor',
            dept: item.dept || 'Audit',
            email: item.email,
            phone: item.phone || '',
            companyPhone: item.company_phone || '',
            civilId: item.civil_id || '',
            passportNo: item.passport_no || '',
            residencyNo: item.residency_no || '',
            nationality: item.nationality || 'Omani',
            dob: item.dob || '',
            gender: item.gender || 'Male',
            maritalStatus: item.marital_status || 'Single',
            joinedDate: item.joined_date || '',
            immediateSupervisor: item.immediate_supervisor || '',
            basicSalary: Number(item.basic_salary || 0),
            type: item.employee_type || 'Experienced',
            accommodationStatus: item.accommodation_status || '',
            accommodationDetails: item.accommodation_details || '',
            allowances: item.allowances || { transport: 0, housing: 0, other: 0 },
            education: item.education || [],
            experience: item.experience || [],
            family: item.family || [],
            emergencyContact: item.emergency_contact || { name: '', relation: '', phone: '' },
            documents: item.documents || [],
            promotions: item.promotions || [],
            disciplinaries: item.disciplinaries || [],
            bonuses: item.bonuses || [],
            transfers: item.transfers || []
          }));

          // Filter out localStorage duplicates by ID
          const filteredBase = baseList.filter(
            (be: any) => !mappedDb.some((de: any) => de.id === be.id)
          );

          const merged = [...mappedDb, ...filteredBase];
          setEmployees(merged);
          localStorage.setItem('hr_employee_records', JSON.stringify(merged));
          if (merged.length > 0) {
            setSelectedEmpId(merged[0].id);
          }
        } else {
          setEmployees(baseList);
          if (baseList.length > 0) {
            setSelectedEmpId(baseList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load live employees, using localStorage fallback:', err);
        const saved = localStorage.getItem('hr_employee_records');
        const baseList = saved ? JSON.parse(saved) : MOCK_EMPLOYEES;
        setEmployees(baseList);
        if (baseList.length > 0) {
          setSelectedEmpId(baseList[0].id);
        }
      } finally {
        setLoading(false);
      }
    };

    loadEmployeesAndSync();
  }, []);

  const saveEmployees = async (list: Employee[]) => {
    setEmployees(list);
    localStorage.setItem('hr_employee_records', JSON.stringify(list));

    // Sync real DB employees to Supabase
    for (const emp of list) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emp.id);
      if (isUuid) {
        try {
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
          });
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
    uploadedFiles: [] as Array<{ name: string; type: string }>
  });

  const selectedEmp = employees.find(e => e.id === selectedEmpId) || employees[0];

  // Unique lists for filters
  const departments = ['All', ...Array.from(new Set(employees.map(e => e.dept)))];
  const nationalities = ['All', ...Array.from(new Set(employees.map(e => e.nationality)))];

  const handleOpenAddModal = () => {
    setIsEditMode(false);
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
      joinedDate: '',
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
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);

    const remaining = employees.filter(e => e.id !== id);
    saveEmployees(remaining);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        const { error: empError } = await supabase
          .from('hr_employees')
          .delete()
          .eq('id', id);

        if (empError) throw empError;

        setNotification({
          show: true,
          title: isAr ? 'تم الحذف بنجاح' : 'Dossier Deleted',
          message: isAr ? 'تم حذف ملف الموظف وسجلاته بالكامل.' : 'Employee dossier successfully deleted from database.',
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
        message: isAr ? 'تم حذف الملف المحلي بنجاح.' : 'Mock employee file successfully deleted.',
        type: 'success'
      });
    }

    if (remaining.length > 0) {
      setSelectedEmpId(remaining[0].id);
    } else {
      setSelectedEmpId(null);
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
      const fileName = e.target.files[0].name;
      setFormData(prev => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, { name: fileName, type: fileType }]
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const mockDocs = [
      ...formData.uploadedFiles.map(f => ({
        name: f.name,
        type: f.type,
        expiry: '2029-12-31',
        status: 'active' as const
      }))
    ];

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
            documents: [...emp.documents, ...mockDocs.filter(d => !emp.documents.some(ed => ed.name === d.name))]
          };
        }
        return emp;
      });
      saveEmployees(updatedList);
    } else {
      const newEmp: Employee = {
        id: formData.id || `EMP-${Math.floor(100 + Math.random() * 900)}`,
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
        documents: mockDocs.length > 0 ? mockDocs : [
          { name: 'Civil ID Card', type: 'civil_id', expiry: '2027-06-30', status: 'active' as const }
        ],
        promotions: [],
        disciplinaries: [],
        bonuses: [],
        transfers: []
      };
      const nextList = [...employees, newEmp];
      saveEmployees(nextList);
      setSelectedEmpId(newEmp.id);
    }

    setShowModal(false);
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
                    <button
                      onClick={() => handleRevokeAccess(selectedEmp.id)}
                      className="px-3.5 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                      title="Revoke System Access"
                    >
                      <UserX size={14} /> Revoke Access
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(selectedEmp)}
                      className="p-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl hover:text-[#A11212] hover:border-[#A11212] transition-colors"
                      title="Edit Dossier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedEmp.id)}
                      className="p-2.5 bg-gray-50 border border-gray-200 text-gray-655 rounded-xl hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                      title="Delete Dossier"
                    >
                      <Trash2 size={16} />
                    </button>
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
                            <p className="text-xs font-black text-gray-900">{selectedEmp.phone}</p>
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
                            <p className="text-xs font-black text-gray-900">{selectedEmp.emergencyContact.name} ({selectedEmp.emergencyContact.relation})</p>
                            <p className="text-[10px] text-gray-505 mt-0.5">{selectedEmp.emergencyContact.phone}</p>
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
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isEditMode ? 'Edit Employee Dossier' : 'Register New Employee'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Corporate Email</label>
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Designated Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Senior Auditor">Senior Auditor</option>
                    <option value="Tax Consultant">Tax Consultant</option>
                    <option value="Risk Analyst">Risk Analyst</option>
                    <option value="Junior Associate">Junior Associate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                  <select
                    value={formData.dept}
                    onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Audit">Audit</option>
                    <option value="Tax & VAT">Tax & VAT</option>
                    <option value="Accounting">Accounting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Category Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Experienced">Experienced (خبير)</option>
                    <option value="Trainee">Trainee (متدرب)</option>
                    <option value="Worker">Worker (عامل)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Civil ID Number</label>
                  <input
                    type="text"
                    required
                    value={formData.civilId}
                    onChange={(e) => setFormData({ ...formData, civilId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Passport Number</label>
                  <input
                    type="text"
                    required
                    value={formData.passportNo}
                    onChange={(e) => setFormData({ ...formData, passportNo: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Residency Number</label>
                  <input
                    type="text"
                    required
                    value={formData.residencyNo}
                    onChange={(e) => setFormData({ ...formData, residencyNo: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Personal Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+968..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Company Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+968 2456..."
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Accommodation Status</label>
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
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Emergency Contact (Parent's Info)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Parent/Spouse Name"
                      value={formData.emergencyName}
                      onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Relation</label>
                    <select
                      value={formData.emergencyRelation}
                      onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Emergency Phone</label>
                    <input
                      type="text"
                      required
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nationality</label>
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Marital Status</label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">DOB</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Joined Date</label>
                  <input
                    type="date"
                    required
                    value={formData.joinedDate}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Supervisor</label>
                  <input
                    type="text"
                    value={formData.immediateSupervisor}
                    onChange={(e) => setFormData({ ...formData, immediateSupervisor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Basic Salary (OMR)</label>
                  <input
                    type="number"
                    required
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              {/* Academic Qualifications Section */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Academic Qualifications</h4>
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
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Previous Work Experience</h4>
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
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Attach Scans & File Certificates</h4>
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
                        <span className="text-[10px] font-bold text-gray-700">{file.name}</span>
                        <span className="text-[9px] bg-red-50 text-red-700 font-black uppercase px-2 py-0.5 rounded border border-red-100">{file.type}</span>
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
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
              >
                {isEditMode ? 'Save Modifications' : 'Register Employee'}
              </button>
            </div>
          </form>
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
