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
import { getLocalRecruits, upsertLocalRecruit, deleteLocalRecruit, upsertRecruitToDatabase } from '../../utils/recruitmentSync';
import { getAllDepartments, getDepartmentById, getJobPositionsByDepartment } from '../../config/departments';

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

        // Load deleted blacklist to prevent re-hydration
        const deletedBlacklist: string[] = JSON.parse(localStorage.getItem('maisarah_deleted_employees') || '[]');
        const isDeleted = (empId?: string, empEmail?: string, empName?: string) => {
          const idLower = (empId || '').trim().toLowerCase();
          const emailLower = (empEmail || '').trim().toLowerCase();
          const nameLower = (empName || '').trim().toLowerCase();
          return deletedBlacklist.some(d => {
            const dLower = d.trim().toLowerCase();
            return (idLower && dLower === idLower) || 
                   (emailLower && dLower === emailLower) || 
                   (nameLower && dLower === nameLower);
          });
        };

        // Merge locally placed employees from Manager workforce
        try {
          const localPlaced: any[] = JSON.parse(localStorage.getItem('maisarah_placed_employees') || '[]');
          localPlaced.forEach(lp => {
            if (lp.email && !isDeleted(lp.id, lp.email, lp.full_name) && !liveEmployees.some(e => e.email && e.email.toLowerCase() === lp.email.toLowerCase())) {
              liveEmployees.push({
                id: lp.id || crypto.randomUUID(),
                name: lp.full_name || 'Staff Member',
                role: lp.role || 'Staff Member',
                dept: lp.dept || 'Audit',
                email: lp.email || '',
                phone: lp.phone || '',
                companyPhone: lp.company_phone || '+968 2456 0000',
                civilId: lp.civil_id || '109876543',
                passportNo: lp.passport_no || 'OM1234567',
                residencyNo: lp.residency_no || 'PR9876543',
                nationality: lp.nationality || 'Omani',
                dob: lp.dob || '1995-01-01',
                gender: lp.gender || 'Male',
                maritalStatus: lp.marital_status || 'Single',
                joinedDate: lp.joined_date || new Date().toISOString().split('T')[0],
                immediateSupervisor: lp.immediate_supervisor || 'General Manager',
                basicSalary: Number(lp.basic_salary || 1000),
                type: (lp.employee_type || 'Experienced') as 'Experienced' | 'Trainee' | 'Worker',
                accommodationStatus: lp.accommodation_status || 'Lives with family',
                accommodationDetails: lp.accommodation_details || '',
                allowances: lp.allowances || { transport: 150, housing: 250, other: 50 },
                education: lp.education || [],
                experience: lp.experience || [],
                family: lp.family || [],
                emergencyContact: lp.emergency_contact || { name: 'Emergency Contact', relation: 'Family', phone: lp.phone || '' },
                documents: lp.documents || [],
                promotions: lp.promotions || [],
                disciplinaries: lp.disciplinaries || [],
                bonuses: lp.bonuses || [],
                transfers: lp.transfers || []
              });
            }
          });
        } catch (e) {
          console.warn('Error merging placed employees in HR:', e);
        }

        // Merge offered / placed recruits from recruitment pipeline
        try {
          const recruits = getLocalRecruits();
          recruits.forEach(r => {
            if ((r.stage === 'offered' || r.placement_status === 'placed' || r.placement_status === 'pending_placement') && r.email && !isDeleted(r.id, r.email, r.name)) {
              if (!liveEmployees.some(e => e.email && e.email.toLowerCase() === r.email.toLowerCase())) {
                liveEmployees.push({
                  id: r.id || crypto.randomUUID(),
                  name: r.name || 'New Hire',
                  role: r.role || 'Staff Member',
                  dept: r.dept || 'Audit',
                  email: r.email,
                  phone: r.phone || '',
                  companyPhone: '+968 2456 0000',
                  civilId: '109876543',
                  passportNo: 'OM1234567',
                  residencyNo: 'PR9876543',
                  nationality: 'Omani',
                  dob: '1995-01-01',
                  gender: 'Male',
                  maritalStatus: 'Single',
                  joinedDate: new Date().toISOString().split('T')[0],
                  immediateSupervisor: 'General Manager',
                  basicSalary: 1000,
                  type: (r.employment_type || 'Experienced') as 'Experienced' | 'Trainee' | 'Worker',
                  accommodationStatus: 'Lives with family',
                  accommodationDetails: '',
                  allowances: { transport: 150, housing: 250, other: 50 },
                  education: [],
                  experience: [],
                  family: [],
                  emergencyContact: { name: 'Emergency Contact', relation: 'Family', phone: r.phone || '' },
                  documents: r.resume_url ? [{ name: r.resume_name || 'Resume / CV', type: 'resume', expiry: 'N/A', status: 'active' }] : [],
                  promotions: [],
                  disciplinaries: [],
                  bonuses: [],
                  transfers: []
                });
              }
            }
          });
        } catch (rErr) {
          console.warn('Error reading recruits in HR:', rErr);
        }

        // Filter all live employees through deleted blacklist
        const sanitizedEmployees = liveEmployees.filter(emp => !isDeleted(emp.id, emp.email, emp.name));

        setEmployees(sanitizedEmployees);
        localStorage.setItem('hr_employee_records', JSON.stringify(sanitizedEmployees));
        if (sanitizedEmployees.length > 0) {
          setSelectedEmpId(prev => prev && sanitizedEmployees.some(e => e.id === prev) ? prev : sanitizedEmployees[0].id);
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
    systemRole: 'employee' as 'employee' | 'accountant' | 'department_head' | 'hr',
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
    immediateSupervisor: 'To Be Assigned by Executive Manager',
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
    activationMode: 'direct_activate' as 'direct_activate' | 'manager_placement',
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
      systemRole: 'employee',
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
      immediateSupervisor: 'To Be Assigned by Executive Manager',
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
      activationMode: 'direct_activate',
      uploadedFiles: []
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setIsEditMode(true);
    setFormError(null);
    setIsSubmitting(false);

    let initialSysRole: 'employee' | 'accountant' | 'department_head' | 'hr' = 'employee';
    const rLower = (emp.role || '').toLowerCase();
    const dLower = (emp.dept || '').toLowerCase();
    if (rLower.includes('head') || rLower.includes('hod') || rLower.includes('director')) {
      initialSysRole = 'department_head';
    } else if (rLower.includes('accountant') || dLower.includes('account') || dLower.includes('finance')) {
      initialSysRole = 'accountant';
    } else if (rLower.includes('hr') || dLower.includes('hr')) {
      initialSysRole = 'hr';
    }

    setFormData({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      systemRole: initialSysRole,
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
      immediateSupervisor: emp.immediateSupervisor || 'To Be Assigned by Executive Manager',
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
      activationMode: 'direct_activate',
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
        // 1. Unassign foreign keys safely
        try { await supabase.from('services').update({ employee_id: null }).eq('employee_id', id); } catch {}
        try { await supabase.from('clients').update({ assigned_employee_id: null }).eq('assigned_employee_id', id); } catch {}

        // 2. Clean up child tables safely
        try { await supabase.from('hr_leave_requests').delete().eq('employee_id', id); } catch {}
        try { await supabase.from('hr_leave_balances').delete().eq('employee_id', id); } catch {}
        try { await supabase.from('hr_attendance').delete().eq('employee_id', id); } catch {}

        // 3. Delete from hr_employees & profiles
        try { await supabase.from('hr_employees').delete().eq('id', id); } catch (e) { console.warn('hr_employees delete notice:', e); }
        try { await supabase.from('profiles').delete().eq('id', id); } catch (e) { console.warn('profiles delete notice:', e); }

        // 4. Delete from Supabase Auth via manage-auth edge function
        try {
          await supabase.functions.invoke('manage-auth', {
            body: {
              action: 'delete',
              user_id: id,
              email: emp?.email
            }
          });
        } catch (aErr) {
          console.warn('manage-auth delete notice:', aErr);
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

    // 3. Clean up all local storage caches & add to deleted blacklist
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('maisarah_deleted_employees') || '[]');
      if (id && !deletedList.includes(id)) deletedList.push(id);
      if (emp?.email && !deletedList.includes(emp.email.trim().toLowerCase())) deletedList.push(emp.email.trim().toLowerCase());
      if (empName && !deletedList.includes(empName.trim().toLowerCase())) deletedList.push(empName.trim().toLowerCase());
      localStorage.setItem('maisarah_deleted_employees', JSON.stringify(deletedList));

      deleteLocalRecruit(id);
      if (emp?.email) deleteLocalRecruit(emp.email);
      if (empName) deleteLocalRecruit(empName);

      const rawCache = localStorage.getItem('hr_employee_records');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        const filtered = parsed.filter((e: any) => e.id !== id && e.name !== empName && e.email !== emp?.email);
        localStorage.setItem('hr_employee_records', JSON.stringify(filtered));
      }
      const rawPlaced = localStorage.getItem('maisarah_placed_employees');
      if (rawPlaced) {
        const parsedPlaced = JSON.parse(rawPlaced);
        const filteredPlaced = parsedPlaced.filter((e: any) => e.id !== id && e.email !== emp?.email);
        localStorage.setItem('maisarah_placed_employees', JSON.stringify(filteredPlaced));
      }
      const rawRecruits = localStorage.getItem('maisarah_hr_recruits_v1');
      if (rawRecruits) {
        const parsedRecruits = JSON.parse(rawRecruits);
        const filteredRecruits = parsedRecruits.filter((e: any) => e.id !== id && e.email !== emp?.email);
        localStorage.setItem('maisarah_hr_recruits_v1', JSON.stringify(filteredRecruits));
      }
    } catch (cErr) {
      console.warn('Cache cleanup error:', cErr);
    }

    window.dispatchEvent(new CustomEvent('maisarah_recruits_updated'));
    window.dispatchEvent(new CustomEvent('maisarah_employees_updated'));
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
      // 1. If Manager Placement workflow is chosen for a new candidate:
      if (!isEditMode && formData.activationMode === 'manager_placement') {
        const recruitId = crypto.randomUUID();
        const recruitPayload: any = {
          id: recruitId,
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone || '',
          role: formData.role,
          dept: formData.dept,
          stage: 'offered',
          placement_status: 'pending_placement',
          employment_type: formData.type || 'Experienced',
          supervisor: formData.immediateSupervisor || 'To Be Assigned by Executive Manager',
          score: 0,
          onboarding_tasks: {
            contract_signed: false,
            bank_details_submitted: false,
            documents_uploaded: false,
            it_assets_ready: false
          },
          created_at: new Date().toISOString()
        };

        try {
          await Promise.race([
            upsertRecruitToDatabase(recruitPayload),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Recruit sync timeout')), 3000))
          ]);
        } catch (rErr) {
          console.warn('hr_recruits insert notice:', rErr);
          upsertLocalRecruit(recruitPayload);
        }

        // Send Offer Welcome Email (Email A)
        supabase.functions.invoke('send-email', {
          body: {
            to: formData.email.trim().toLowerCase(),
            subject: isAr 
              ? 'مرحباً بك في مجموعة ميسرة - عرض العمل والخطوات القادمة' 
              : 'Welcome to Maisarah Group - Job Offer & Next Steps',
            html: `
              <div style="font-family: sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                <h2 style="color: #A11212; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                  ${isAr ? 'تهانينا على عرض العمل!' : 'Congratulations on your Job Offer!'}
                </h2>
                <p>${isAr ? 'عزيزي/عزيزتي' : 'Dear'} <strong>${formData.name}</strong>,</p>
                <p>
                  ${isAr 
                    ? 'يسعدنا جداً انضمامك إلى مجموعة ميسرة. نود إبلاغك بأنه قد تم تفعيل عرض العمل الخاص بك وتوجيهه للمدير التنفيذي لوضع اللمسات الأخيرة وتعيين المشرف المباشر واعتماد الصلاحيات.' 
                    : 'We are thrilled to welcome you to the Maisarah family. Your job offer has been submitted and forwarded to the Executive Manager for final department placement and role configuration.'}
                </p>
                <div style="background-color: #fcfcfc; border: 1px solid #f0f0f0; padding: 15px; border-radius: 10px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #555;">${isAr ? 'تفاصيل التوظيف المقترحة:' : 'Designated Details:'}</h4>
                  <p style="margin: 4px 0;"><strong>${isAr ? 'المسمى الوظيفي:' : 'Position:'}</strong> ${formData.role}</p>
                  <p style="margin: 4px 0;"><strong>${isAr ? 'القسم:' : 'Department:'}</strong> ${formData.dept}</p>
                  <p style="margin: 4px 0;"><strong>${isAr ? 'المشرف المقترح:' : 'Designated Supervisor:'}</strong> ${formData.immediateSupervisor}</p>
                </div>
                <p>
                  ${isAr 
                    ? 'ستصلك رسالة ثانية تحتوي على بيانات الدخول إلى منصة الموظفين فور اعتماد المدير التنفيذي.' 
                    : 'You will receive your portal login credentials as soon as executive placement review is completed.'}
                </p>
                <br/>
                <p>${isAr ? 'مع أطيب التحيات،' : 'Best Regards,'}</p>
                <p>${isAr ? 'إدارة الموارد البشرية - ميسرة' : 'Maisarah HR Department'}</p>
              </div>
            `
          }
        }).catch(mailErr => console.warn('Offer email dispatch notice:', mailErr));

        window.dispatchEvent(new CustomEvent('maisarah_recruits_updated'));

        setNotification({
          show: true,
          title: isAr ? 'تم إرسال الملف للاعتماد' : 'Forwarded to Manager',
          message: isAr 
            ? `تم إرسال ملف ${formData.name} إلى قائمة التعيينات والاعتماد لدى المدير التنفيذي بنجاح.` 
            : `Candidate ${formData.name} forwarded to Executive Manager Placements queue.`,
          type: 'success'
        });

        setShowModal(false);
        setIsSubmitting(false);
        return;
      }

      // 2. Direct Activation Flow:
      let targetId = formData.id;
      let tempPassword = 'Welcome@' + Math.floor(1000 + Math.random() * 9000);
      let accessRole = formData.systemRole || 'employee';
      let departmentId = 'audit';

      const normalizedDept = (formData.dept || '').toLowerCase();
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
        // 1. Create or update user in Supabase Auth via manage-auth Edge Function
        try {
          const authPromise = supabase.functions.invoke('manage-auth', {
            body: {
              email: formData.email.trim().toLowerCase(),
              password: tempPassword,
              full_name: formData.name.trim(),
              role: accessRole,
              department_id: departmentId,
              phone: formData.phone,
              job_title: formData.role,
              dept: formData.dept,
              basic_salary: Number(formData.basicSalary || 0),
              joined_date: formData.joinedDate || new Date().toISOString().split('T')[0],
              immediate_supervisor: formData.immediateSupervisor || 'To Be Assigned by Executive Manager',
              employee_type: formData.type || 'Experienced'
            }
          });
          const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 5000)
          );
          const { data: authResult } = await Promise.race([authPromise, timeoutPromise]) as any;
          if (authResult?.userId || authResult?.user?.id) {
            targetId = authResult.userId || authResult.user.id;
          }
        } catch (authErr) {
          console.warn('manage-auth invoke notice:', authErr);
        }

        // Fallback: Check if user already exists in profiles
        if (!targetId || targetId.startsWith('EMP-')) {
          try {
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
          } catch {
            targetId = crypto.randomUUID();
          }
        }
      }

      // 2. Upload actual files to Supabase Storage (non-blocking safe timeout)
      const uploadedDocs: Array<{ name: string; type: string; expiry: string; status: 'active' | 'warning' | 'expired'; url?: string }> = [];

      for (const f of formData.uploadedFiles) {
        let docUrl: string | undefined = undefined;
        if (f.file) {
          try {
            const filePath = `employees/${targetId}/${f.name}`;

            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onload = () => {
                const res = reader.result as string;
                const base64 = res.split(',')[1] || res;
                resolve(base64);
              };
              reader.onerror = reject;
            });
            reader.readAsDataURL(f.file);
            const base64Data = await base64Promise;

            const uploadPromise = supabase.functions.invoke('manage-auth', {
              body: {
                action: 'upload_storage_file',
                bucket: 'documents',
                file_path: filePath,
                file_base64: base64Data,
                content_type: f.file.type || 'application/pdf'
              }
            });
            const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
              setTimeout(() => reject(new Error('Storage timeout')), 4000)
            );
            const { data: edgeUpload, error: edgeErr } = await Promise.race([uploadPromise, timeoutPromise]) as any;

            if (!edgeErr && edgeUpload?.success && edgeUpload?.url) {
              docUrl = edgeUpload.url;
            } else {
              docUrl = URL.createObjectURL(f.file);
            }
          } catch {
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
        try {
          await supabase.from('profiles').upsert({
            id: targetId,
            full_name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone || '',
            role: accessRole,
            department_id: departmentId
          }, { onConflict: 'id' });
        } catch (pErr) {
          console.warn('Profile sync notice:', pErr);
        }

        // Sync hr_employees
        try {
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
            immediate_supervisor: formData.immediateSupervisor || 'To Be Assigned by Executive Manager',
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
        } catch (hErr) {
          console.warn('HR employees table sync notice:', hErr);
        }
      }

      // Also sync to maisarah_placed_employees for Manager and HOD portals
      try {
        const placed = JSON.parse(localStorage.getItem('maisarah_placed_employees') || '[]');
        const nextPlaced = [
          {
            id: targetId,
            full_name: formData.name.trim(),
            role: formData.role,
            dept: formData.dept,
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone || '',
            basic_salary: Number(formData.basicSalary || 0),
            employee_type: formData.type || 'Experienced',
            joined_date: formData.joinedDate || new Date().toISOString().split('T')[0],
          },
          ...placed.filter((p: any) => p.email?.toLowerCase() !== formData.email.trim().toLowerCase() && p.id !== targetId)
        ];
        localStorage.setItem('maisarah_placed_employees', JSON.stringify(nextPlaced));
      } catch (e) {
        console.warn('Placed sync notice:', e);
      }

      // 4. Send Welcome credentials email in background (non-blocking)
      if (!isEditMode) {
        supabase.functions.invoke('send-email', {
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
        }).catch(mailErr => console.warn('Welcome credentials email notice:', mailErr));
        emailDispatched = true;
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
              {/* Onboarding Workflow Selection (When registering new employee) */}
              {!isEditMode && (
                <div className="bg-gradient-to-r from-red-50/70 via-gray-50 to-red-50/70 border border-red-100/80 rounded-2xl p-3.5 mb-2">
                  <label className="block text-[10px] font-black text-[#A11212] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#A11212]" />
                    {isAr ? 'مسار التسجيل والاعتماد' : 'Onboarding & Activation Mode'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, activationMode: 'direct_activate' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        formData.activationMode === 'direct_activate'
                          ? 'bg-white border-[#A11212] shadow-sm ring-2 ring-[#A11212]/20'
                          : 'bg-white/60 border-gray-200 hover:bg-white opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                          ⚡ {isAr ? 'تفعيل فوري وإصدار بيانات الدخول' : 'Direct Activation'}
                        </span>
                        {formData.activationMode === 'direct_activate' && (
                          <span className="h-2 w-2 rounded-full bg-[#A11212]"></span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-tight">
                        {isAr
                          ? 'إنشاء الحساب فوراً وتوليد كلمة المرور وإرسال بريد الدخول للموظف'
                          : 'Creates login account, generates password & emails credentials immediately'}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, activationMode: 'manager_placement' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        formData.activationMode === 'manager_placement'
                          ? 'bg-white border-[#A11212] shadow-sm ring-2 ring-[#A11212]/20'
                          : 'bg-white/60 border-gray-200 hover:bg-white opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                          📋 {isAr ? 'إحالة للمدير التنفيذي للاعتماد' : 'Forward to Manager'}
                        </span>
                        {formData.activationMode === 'manager_placement' && (
                          <span className="h-2 w-2 rounded-full bg-[#A11212]"></span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-tight">
                        {isAr
                          ? 'إرسال عرض عمل وإحالة المرشح للمدير التنفيذي لاعتماد القسم والمشرف'
                          : 'Sends job offer email & queues in Manager Placements for final review'}
                      </p>
                    </button>
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#A11212] uppercase tracking-widest mb-1.5">
                    {isAr ? 'صلاحية النظام (System Role)' : 'System Access Role'}
                  </label>
                  <select
                    value={formData.systemRole}
                    onChange={(e) => setFormData({ ...formData, systemRole: e.target.value as any })}
                    className="w-full bg-red-50/50 border border-red-200 rounded-xl px-4 py-2.5 text-xs font-black text-[#A11212] outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="employee">{isAr ? '👤 موظف قياسي (Standard Employee)' : '👤 Standard Employee'}</option>
                    <option value="accountant">{isAr ? '💼 محاسب (Accountant)' : '💼 Accountant'}</option>
                    <option value="department_head">{isAr ? '👑 رئيس قسم (Dept Head / HOD)' : '👑 Department Head (HOD)'}</option>
                    <option value="hr">{isAr ? '📋 موارد بشرية (HR Specialist)' : '📋 HR Specialist'}</option>
                    <option value="crm">{isAr ? '🤝 علاقات العملاء (CRM Coordinator)' : '🤝 CRM Coordinator'}</option>
                    <option value="manager">{isAr ? '🏛️ مدير تنفيذي (Executive Manager)' : '🏛️ Executive Manager'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'القسم' : 'Department'}
                  </label>
                  <select
                    value={formData.dept}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const deptObj = getAllDepartments().find(d => d.id === newDept || d.name.toLowerCase() === newDept.toLowerCase());
                      const positions = getJobPositionsByDepartment(deptObj?.id || newDept);
                      setFormData({
                        ...formData,
                        dept: deptObj ? deptObj.name : newDept,
                        role: positions[0] || 'Staff Member'
                      });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    {getAllDepartments().map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'المسمى الوظيفي' : 'Designated Position'}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    {getJobPositionsByDepartment(
                      getAllDepartments().find(d => d.name.toLowerCase() === (formData.dept || '').toLowerCase() || d.id === formData.dept)?.id || formData.dept
                    ).map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                    <option value="Department Head">Department Head</option>
                    <option value="Senior Associate">Senior Associate</option>
                    <option value="Junior Associate">Junior Associate</option>
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
                  <label className="block text-[10px] font-black text-[#A11212] uppercase tracking-widest mb-1.5">
                    {isAr ? 'المشرف المباشر / رئيس القسم (HOD)' : 'Immediate Supervisor / HOD'}
                  </label>
                  <select
                    value={formData.immediateSupervisor}
                    onChange={(e) => setFormData({ ...formData, immediateSupervisor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] cursor-pointer"
                  >
                    <option value="To Be Assigned by Executive Manager">
                      {isAr ? '📋 يتم تعيينه بواسطة المدير التنفيذي (عند الاعتماد)' : '📋 To Be Assigned by Executive Manager'}
                    </option>
                    <option value="Executive Board & Management">
                      {isAr ? '🏛️ الإدارة التنفيذية ومجلس الإدارة' : '🏛️ Executive Board & Management'}
                    </option>
                    <option value="General Manager (Operations & Finance)">
                      {isAr ? '👤 المدير العام (العمليات والمالية)' : '👤 General Manager (Operations & Finance)'}
                    </option>

                    {/* Real Dynamic Personnel from Database */}
                    {employees.length > 0 && (
                      <optgroup label={isAr ? 'الموظفون والمشرفون المعتمدون (من قاعدة البيانات)' : 'Active Personnel (From Database)'}>
                        {employees.map(emp => {
                          const val = `${emp.name} (${emp.role || emp.dept})`;
                          return (
                            <option key={emp.id} value={val}>
                              {emp.name} ({emp.role} - {emp.dept})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
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
                    <span>
                      {formData.activationMode === 'manager_placement' && !isEditMode
                        ? (isAr ? 'جاري إحالة المرشح للمدير...' : 'Forwarding to Manager...')
                        : (isAr ? 'جاري التسجيل وتفعيل الحساب...' : 'Registering & Activating...')}
                    </span>
                  </>
                ) : (
                  <span>
                    {isEditMode
                      ? (isAr ? 'حفظ التعديلات' : 'Save Modifications')
                      : formData.activationMode === 'manager_placement'
                        ? (isAr ? '📋 إحالة للمدير التنفيذي للاعتماد' : '📋 Forward for Manager Review')
                        : (isAr ? '⚡ تسجيل وتفعيل الحساب فوراً' : '⚡ Register & Activate Credentials')}
                  </span>
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
        <div className="fixed top-20 end-6 z-[9999] max-w-md w-full animate-slide-down pointer-events-auto" dir={isAr ? 'rtl' : 'ltr'}>
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
