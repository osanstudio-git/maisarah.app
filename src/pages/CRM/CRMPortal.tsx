import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, Target, Clock, PlusCircle, AlertCircle, FileText, CheckCircle2, 
  ChevronRight, XCircle, ArrowUpRight, BarChart2, ShieldCheck, Download, 
  Trash2, Edit, Award, Sparkles, Building2, UserPlus, FileCheck, Check, ArrowRight,
  TrendingUp, RefreshCw, AlertTriangle, Calendar, Layers, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// --- Types & Interfaces ---
interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  status: 'cold' | 'warm' | 'hot' | 'converted';
  qualificationColor: 'red' | 'yellow' | 'green';
  pipelineStep: 'follow_up' | 'add_data' | 'connect' | 'update' | 'sort';
  notes: string;
  created_at: string;
  isClubMember?: boolean;
  clubTier?: 'silver' | 'gold' | 'platinum';
  activityHistory?: string[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyPhone?: string;
  type: 'B2B' | 'B2C';
  companyName?: string;
  registrationNumber?: string;
  servicesPackage: string[];
  overallManager: string; // The Account Owner
  delegatedServices: Record<string, string>; // e.g. {"Tax & VAT": "Khalfan Al-Abri", "Audit": "Ali Al-Harthy"}
  created_at: string;
  monthlyBilling: number;
  yearlyBilling: number;
  activityHistory: string[];
  contractExpiryDate?: string;
  isClubMember?: boolean;
  clubTier?: 'silver' | 'gold' | 'platinum';
}

interface Quotation {
  id: string;
  clientName: string;
  type: 'B2B' | 'B2C';
  serviceType: string;
  budget: number;
  status: 'pending' | 'approved' | 'invoiced';
}

interface Reminder {
  id: string;
  title: string;
  date: string;
  type: 'follow_up' | 'deadline' | 'review';
  completed: boolean;
}

// --- Initial Mock Data ---
const INITIAL_LEADS: Lead[] = [
  { id: 'LD-001', name: 'Salim Al-Busaidi', email: 'salim.b@gmail.com', phone: '+968 9111 2222', companyName: 'Busaidi Logistics', status: 'hot', qualificationColor: 'green', pipelineStep: 'sort', notes: 'Very interested in VAT Filing retainer.', created_at: '2026-07-10', activityHistory: ['2026-07-10 - Lead captured through web form.', '2026-07-12 - Intro call logged. Client requested VAT Retainer proposals.'] },
  { id: 'LD-002', name: 'Nasser Al-Rawahi', email: 'nasser@rawahipower.com', phone: '+968 9888 7777', companyName: 'Rawahi Solar', status: 'warm', qualificationColor: 'yellow', pipelineStep: 'connect', notes: 'Wants to schedule intro meeting next week.', created_at: '2026-07-12', activityHistory: ['2026-07-12 - Lead created via sales agent.', '2026-07-14 - Follow-up email sent. Awaiting schedule reply.'] },
  { id: 'LD-003', name: 'Fatma Al-Balushi', email: 'fatma@balushifashion.om', phone: '+968 9333 4444', companyName: 'Balushi Couture', status: 'cold', qualificationColor: 'red', pipelineStep: 'follow_up', notes: 'Emailed brochure. No reply yet.', created_at: '2026-07-15', activityHistory: ['2026-07-15 - Lead entered system.', '2026-07-16 - Brochure sent. No response.'] },
  { id: 'LD-004', name: 'Hamed Al-Siyabi', email: 'hamed@siyabifood.com', phone: '+968 9444 5555', companyName: 'Siyabi Catering', status: 'warm', qualificationColor: 'yellow', pipelineStep: 'add_data', notes: 'Gathering corporate data sheet.', created_at: '2026-07-16', activityHistory: ['2026-07-16 - Lead created.', '2026-07-17 - Contacted Salim regarding CR info.'] },
  { id: 'LD-005', name: 'Mona Al-Masrouri', email: 'mona@masrouritrade.om', phone: '+968 9555 6666', companyName: 'Masrouri & Partners', status: 'hot', qualificationColor: 'green', pipelineStep: 'update', notes: 'Sent proposal draft OMR 3,500.', created_at: '2026-07-18', activityHistory: ['2026-07-18 - Lead identified.', '2026-07-20 - Proposal draft of OMR 3,500 delivered via email.'] }
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'CL-101',
    name: 'Khalfan Al-Abri',
    email: 'khalfan@soharsteel.om',
    phone: '+968 9234 5678',
    companyPhone: '+968 2456 0002',
    type: 'B2B',
    companyName: 'Sohar Steel Co',
    registrationNumber: 'CR-1098765',
    servicesPackage: ['Tax & VAT', 'Audit'],
    overallManager: 'Ali Al-Harthy',
    delegatedServices: { 'Tax & VAT': 'Khalfan Al-Abri', 'Audit': 'Ali Al-Harthy' },
    created_at: '2024-01-15',
    monthlyBilling: 450,
    yearlyBilling: 5400,
    activityHistory: ['Client onboarded.', 'Introductory call logged.', 'VAT registration certificate verified.'],
    contractExpiryDate: '2026-08-15',
    isClubMember: true,
    clubTier: 'platinum'
  },
  {
    id: 'CL-102',
    name: 'Ahmed Al-Kharusi',
    email: 'ahmed@omantel.om',
    phone: '+968 9123 4567',
    companyPhone: '+968 2456 0001',
    type: 'B2B',
    companyName: 'Oman Telco LLC',
    registrationNumber: 'CR-2039485',
    servicesPackage: ['Audit'],
    overallManager: 'Fatma Al-Harthy',
    delegatedServices: { 'Audit': 'Ali Al-Harthy' },
    created_at: '2025-06-01',
    monthlyBilling: 1200,
    yearlyBilling: 14400,
    activityHistory: ['Account created.', 'Statutory audit schedule confirmed.', 'Engagement letter signed.'],
    contractExpiryDate: '2027-06-01',
    isClubMember: true,
    clubTier: 'gold'
  },
  {
    id: 'CL-103',
    name: 'Mariam Al-Kindi',
    email: 'mariam.kindi@gmail.com',
    phone: '+968 9777 8888',
    type: 'B2C',
    servicesPackage: ['Business Advisory'],
    overallManager: 'Dr. Salim Al-Maskari',
    delegatedServices: { 'Business Advisory': 'Dr. Salim Al-Maskari' },
    created_at: '2026-03-20',
    monthlyBilling: 250,
    yearlyBilling: 3000,
    activityHistory: ['Account created.', 'Initial strategic business advice provided.'],
    contractExpiryDate: '2026-08-10',
    isClubMember: false
  }
];

const INITIAL_QUOTATIONS: Quotation[] = [
  { id: 'QT-901', clientName: 'Mazoon Electricity', type: 'B2B', serviceType: 'VAT Return Filing', budget: 1800, status: 'pending' },
  { id: 'QT-902', clientName: 'Salalah Port Services', type: 'B2B', serviceType: 'Complete Client Bookkeeping', budget: 3200, status: 'pending' },
  { id: 'QT-903', clientName: 'Amal Al-Harthy', type: 'B2C', serviceType: 'Strategic Consultancy', budget: 850, status: 'approved' }
];

const INITIAL_REMINDERS: Reminder[] = [
  { id: 'RM-301', title: 'Follow up with Nasser Al-Rawahi regarding solar contract', date: '2026-07-24', type: 'follow_up', completed: false },
  { id: 'RM-302', title: 'Submit Engagement letter for Mazoon Electricity', date: '2026-07-25', type: 'deadline', completed: false },
  { id: 'RM-303', title: 'Audit billing reconciliation check', date: '2026-07-28', type: 'review', completed: false }
];

const MOCK_EMPLOYEES = [
  { id: 'emp_01', name: 'Ali Al-Harthy', dept: 'Audit' },
  { id: 'emp_02', name: 'Khalfan Al-Abri', dept: 'Tax & VAT' },
  { id: 'emp_03', name: 'Fatma Al-Busaidi', dept: 'Tax & VAT' },
  { id: 'emp_04', name: 'Zahra Al-Lawati', dept: 'Bookkeeping' },
  { id: 'emp_05', name: 'Dr. Salim Al-Maskari', dept: 'Business Advisory' }
];

const DEPARTMENTS = ['Tax & VAT', 'Audit', 'Bookkeeping', 'Business Advisory'];

const RECHARTS_DATA = [
  { month: 'Jan', Leads: 12, Converted: 5 },
  { month: 'Feb', Leads: 18, Converted: 8 },
  { month: 'Mar', Leads: 15, Converted: 10 },
  { month: 'Apr', Leads: 22, Converted: 14 },
  { month: 'May', Leads: 28, Converted: 19 },
  { month: 'Jun', Leads: 32, Converted: 24 }
];

export default function CRMPortal() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // --- Core React Router hooks ---
  const location = useLocation();
  const navigate = useNavigate();

  // Derived active tab from current URL pathname
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/crm/leads')) return 'pipeline';
    if (path.includes('/crm/clients')) return 'clients';
    if (path.includes('/crm/combo')) return 'combo_work';
    if (path.includes('/crm/financials')) return 'financials';
    if (path.includes('/crm/reminders')) return 'reminders';
    if (path.includes('/crm/club')) return 'club';
    return 'dashboard';
  };
  
  const activeTab = getActiveTabFromPath();

  const handleTabChange = (tabId: string) => {
    if (tabId === 'dashboard') navigate('/crm/dashboard');
    else if (tabId === 'pipeline') navigate('/crm/leads');
    else if (tabId === 'clients') navigate('/crm/clients');
    else if (tabId === 'combo_work') navigate('/crm/combo');
    else if (tabId === 'financials') navigate('/crm/financials');
    else if (tabId === 'reminders') navigate('/crm/reminders');
    else if (tabId === 'club') navigate('/crm/club');
  };

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('crm_leads');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('crm_leads', JSON.stringify(INITIAL_LEADS));
    return INITIAL_LEADS;
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('crm_clients');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('crm_clients', JSON.stringify(INITIAL_CLIENTS));
    return INITIAL_CLIENTS;
  });
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    const saved = localStorage.getItem('crm_quotations');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('crm_quotations', JSON.stringify(INITIAL_QUOTATIONS));
    return INITIAL_QUOTATIONS;
  });
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);

  const [tips, setTips] = useState([
    { id: 'tip_1', title: 'GCC VAT Filing Guide', content: 'Ensure all input tax credits match custom clearance bills of entry for smooth filing.', date: '2026-08-01', category: 'Tax' },
    { id: 'tip_2', title: 'Statutory Audit Readiness', content: 'Keep general ledgers reconciled and payroll PASI tax registries up to date before Q4 audit.', date: '2026-08-05', category: 'Audit' },
    { id: 'tip_3', title: 'SME Feasibility Checklists', content: 'For bank loan approvals, include a detailed 3-year cash flow projections model and sensitivity matrices.', date: '2026-08-10', category: 'Advisory' }
  ]);
  const [selectedClubTierFilter, setSelectedClubTierFilter] = useState<'all' | 'silver' | 'gold' | 'platinum'>('all');
  const [clubSearch, setClubSearch] = useState('');
  
  // WhatsApp States
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetUser, setWhatsAppTargetUser] = useState<{ name: string; phone: string } | null>(null);
  const [whatsAppBroadcastMode, setWhatsAppBroadcastMode] = useState(false);
  const [selectedBroadcastTip, setSelectedBroadcastTip] = useState<{ title: string; content: string } | null>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState('welcome');
  const [whatsAppCustomText, setWhatsAppCustomText] = useState('');
  const [apiDispatching, setApiDispatching] = useState(false);
  const [apiProgress, setApiProgress] = useState(0);
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  // Dossier & Logs States
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<Lead | null>(null);
  const [newClientLogText, setNewClientLogText] = useState('');
  const [newLeadLogText, setNewLeadLogText] = useState('');

  // Pipeline View Mode & Filters
  const [pipelineViewMode, setPipelineViewMode] = useState<'kanban' | 'list'>('kanban');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadStepFilter, setLeadStepFilter] = useState('all');

  // Sync to local storage
  React.useEffect(() => {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  }, [leads]);

  React.useEffect(() => {
    localStorage.setItem('crm_clients', JSON.stringify(clients));
  }, [clients]);

  React.useEffect(() => {
    localStorage.setItem('crm_quotations', JSON.stringify(quotations));
  }, [quotations]);

  // Generate dynamic alerts (stale leads and expiring contracts)
  const dynamicAlerts = React.useMemo(() => {
    const alertsList: { type: 'stale_lead' | 'expiry'; title: string; desc: string }[] = [];
    
    // 1. Check for stale leads (> 7 days in follow_up or connect)
    leads.forEach(lead => {
      if (lead.pipelineStep === 'follow_up' || lead.pipelineStep === 'connect') {
        const created = new Date(lead.created_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          alertsList.push({
            type: 'stale_lead',
            title: isAr ? 'تحذير: فرصة معلقة قديمة' : 'Warning: Stale Lead',
            desc: isAr 
              ? `العميل المحتمل ${lead.name} معلق في خطوة "${lead.pipelineStep === 'follow_up' ? 'المتابعة' : 'الاتصال'}" منذ ${diffDays} أيام.` 
              : `Lead ${lead.name} has been stuck in "${lead.pipelineStep === 'follow_up' ? 'Follow-up' : 'Connect'}" step for ${diffDays} days.`,
          });
        }
      }
    });

    // 2. Check for contract expiries (within 30 days)
    clients.forEach(client => {
      if (client.contractExpiryDate) {
        const expiry = new Date(client.contractExpiryDate);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          alertsList.push({
            type: 'expiry',
            title: isAr ? 'تنبيه: انتهاء عقد قريب' : 'Alert: Contract Expiring Soon',
            desc: isAr 
              ? `عقد ${client.companyName || client.name} ينتهي خلال ${diffDays} يوم (${client.contractExpiryDate}).` 
              : `Contract for ${client.companyName || client.name} expires in ${diffDays} days (${client.contractExpiryDate}).`,
          });
        }
      }
    });

    return alertsList;
  }, [leads, clients, isAr]);

  // --- Lead Qualification / Assignment States ---
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState(MOCK_EMPLOYEES[0].name);

  // --- Onboarding Client Modal/Form States ---
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [clientType, setClientType] = useState<'B2B' | 'B2C'>('B2B');
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyPhone: '',
    companyName: '',
    registrationNumber: '',
    servicePackage: [] as string[],
    overallManager: MOCK_EMPLOYEES[0].name,
    initialActivity: '',
    monthlyBilling: 0,
    contractExpiryDate: '',
    isClubMember: false,
    clubTier: 'silver' as 'silver' | 'gold' | 'platinum',
    autoQuotation: true
  });

  const SERVICE_RATES: Record<string, number> = {
    'Tax & VAT': 150,
    'Audit': 300,
    'Bookkeeping': 250,
    'Business Advisory': 400
  };

  // --- Combo Work Configuration States ---
  const [selectedClientForCombo, setSelectedClientForCombo] = useState<string>(INITIAL_CLIENTS[0].id);
  const [comboSetup, setComboSetup] = useState({
    overallManager: INITIAL_CLIENTS[0].overallManager,
    services: INITIAL_CLIENTS[0].servicesPackage,
    delegation: INITIAL_CLIENTS[0].delegatedServices
  });

  // --- Export & Approval States ---
  const [isVpSignedOff, setIsVpSignedOff] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // --- Reminder Add State ---
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderType, setNewReminderType] = useState<'follow_up' | 'deadline' | 'review'>('follow_up');

  // --- Client History Detail View Modal ---
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  // --- Lead Onboarding & Submission logic ---
  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-calculate final monthly price
    let calculatedBilling = onboardForm.monthlyBilling;
    if (calculatedBilling === 0) {
      calculatedBilling = onboardForm.servicePackage.reduce((sum, pkg) => sum + (SERVICE_RATES[pkg] || 0), 0);
      if (onboardForm.isClubMember) {
        const discount = onboardForm.clubTier === 'platinum' ? 0.20 : onboardForm.clubTier === 'gold' ? 0.15 : 0.10;
        calculatedBilling = Math.round(calculatedBilling * (1 - discount));
      }
    }

    const newClient: Client = {
      id: `CL-${Math.floor(200 + Math.random() * 800)}`,
      name: onboardForm.name,
      email: onboardForm.email,
      phone: onboardForm.phone,
      companyPhone: onboardForm.companyPhone,
      type: clientType,
      companyName: clientType === 'B2B' ? onboardForm.companyName : undefined,
      registrationNumber: clientType === 'B2B' ? onboardForm.registrationNumber : undefined,
      servicesPackage: onboardForm.servicePackage,
      overallManager: onboardForm.overallManager,
      delegatedServices: onboardForm.servicePackage.reduce((acc, service) => {
        const emp = MOCK_EMPLOYEES.find(e => e.dept === service) || MOCK_EMPLOYEES[0];
        acc[service] = emp.name;
        return acc;
      }, {} as Record<string, string>),
      created_at: new Date().toISOString().split('T')[0],
      monthlyBilling: calculatedBilling,
      yearlyBilling: calculatedBilling * 12,
      isClubMember: onboardForm.isClubMember,
      clubTier: onboardForm.isClubMember ? onboardForm.clubTier : undefined,
      activityHistory: [
        'Client onboarded through registry form.',
        onboardForm.initialActivity || 'Initial client record registered.'
      ],
      contractExpiryDate: onboardForm.contractExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    // Auto Quotation Insertion logic
    if (onboardForm.autoQuotation && onboardForm.servicePackage.length > 0) {
      const newQuotes: Quotation[] = onboardForm.servicePackage.map(pkg => {
        let budget = SERVICE_RATES[pkg] || 0;
        if (onboardForm.isClubMember) {
          const discount = onboardForm.clubTier === 'platinum' ? 0.20 : onboardForm.clubTier === 'gold' ? 0.15 : 0.10;
          budget = Math.round(budget * (1 - discount));
        }
        return {
          id: `QT-${Math.floor(100 + Math.random() * 900)}`,
          clientName: clientType === 'B2B' ? onboardForm.companyName : onboardForm.name,
          type: clientType,
          serviceType: pkg,
          budget: budget,
          status: 'pending'
        };
      });
      setQuotations(prev => [...newQuotes, ...prev]);
    }

    setClients([newClient, ...clients]);
    setShowOnboardingModal(false);
    setOnboardForm({
      name: '',
      email: '',
      phone: '',
      companyPhone: '',
      companyName: '',
      registrationNumber: '',
      servicePackage: [],
      overallManager: MOCK_EMPLOYEES[0].name,
      initialActivity: '',
      monthlyBilling: 0,
      contractExpiryDate: '',
      isClubMember: false,
      clubTier: 'silver',
      autoQuotation: true
    });
  };

  // --- Drag & Drop or Direct Step Shift logic for lead pipeline ---
  const shiftLeadStep = (leadId: string, nextStep: Lead['pipelineStep']) => {
    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.id === leadId) {
        // If moved to "Sort", trigger qualification popup
        if (nextStep === 'sort') {
          setQualifyingLead(lead);
        }
        const today = new Date().toISOString().split('T')[0];
        const logEntry = `${today} - Stage shifted to: ${nextStep.replace('_', ' ')}`;
        const updatedHistory = [...(lead.activityHistory || []), logEntry];
        return { ...lead, pipelineStep: nextStep, activityHistory: updatedHistory };
      }
      return lead;
    }));
  };

  // --- Lead Qualification / Assignment Confirmation ---
  const handleConfirmQualification = () => {
    if (!qualifyingLead) return;

    // Convert Lead to Client
    const newClient: Client = {
      id: `CL-${Math.floor(200 + Math.random() * 800)}`,
      name: qualifyingLead.name,
      email: qualifyingLead.email,
      phone: qualifyingLead.phone,
      type: qualifyingLead.companyName ? 'B2B' : 'B2C',
      companyName: qualifyingLead.companyName,
      servicesPackage: ['Audit'],
      overallManager: selectedAssignee,
      delegatedServices: { 'Audit': selectedAssignee },
      created_at: new Date().toISOString().split('T')[0],
      monthlyBilling: 750,
      yearlyBilling: 9000,
      activityHistory: [
        'Converted from pipeline lead.',
        qualifyingLead.notes || 'Lead qualified and converted.'
      ],
      contractExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setClients([newClient, ...clients]);
    setLeads(prevLeads => prevLeads.filter(l => l.id !== qualifyingLead.id));
    setQualifyingLead(null);
  };

  // --- Update Combo Work Settings ---
  const handleUpdateCombo = (e: React.FormEvent) => {
    e.preventDefault();
    setClients(prevClients => prevClients.map(c => {
      if (c.id === selectedClientForCombo) {
        return {
          ...c,
          overallManager: comboSetup.overallManager,
          servicesPackage: comboSetup.services,
          delegatedServices: comboSetup.delegation
        };
      }
      return c;
    }));
    alert('Combo account assignments updated successfully!');
  };

  // --- Approve Engagement Letter & Generate Invoice ---
  const handleApproveQuotation = (quotation: Quotation) => {
    setQuotations(prevQuotations => prevQuotations.map(q => {
      if (q.id === quotation.id) {
        return { ...q, status: 'invoiced' };
      }
      return q;
    }));

    // Trigger mock notification of Invoice creation
    alert(`Quotation Approved! Draft Invoice CRM-${quotation.id} created successfully for OMR ${quotation.budget}.`);
  };

  // --- Trigger Lead Export ---
  const handleExportData = () => {
    if (!isVpSignedOff) {
      setShowExportModal(true);
      return;
    }
    // Simulate File Download
    alert('Export Verification Completed. Downloading CRM_Data_Export.csv...');
  };

  // --- Add Reminder ---
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle || !newReminderDate) return;
    const item: Reminder = {
      id: `RM-${Math.floor(400 + Math.random() * 600)}`,
      title: newReminderTitle,
      date: newReminderDate,
      type: newReminderType,
      completed: false
    };
    setReminders([...reminders, item]);
    setNewReminderTitle('');
    setNewReminderDate('');
  };

  // Toggle Reminder completion
  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  // WhatsApp helper functions
  const getInterpolatedWhatsAppText = () => {
    if (whatsAppBroadcastMode) {
      if (selectedBroadcastTip) {
        return `Maisarah Business Club Tip of the Week: *${selectedBroadcastTip.title}* - ${selectedBroadcastTip.content}. Access more guides inside your Maisarah portal.`;
      }
      return `Welcome to Maisarah Business Club! Read weekly tax tips inside the portal.`;
    }
    if (!whatsAppTargetUser) return '';
    const name = whatsAppTargetUser.name;
    if (whatsAppTemplate === 'welcome') {
      return `Dear *${name}*, Welcome to the Maisarah Business Club! We are thrilled to support your corporate growth. Feel free to access our exclusive tips and reach out to your Account Manager anytime.`;
    }
    if (whatsAppTemplate === 'vat') {
      return `Dear *${name}*, This is a tax compliance reminder from Maisarah. The Q3 VAT filing portal is closing shortly. Please upload your transaction spreadsheets to your Client Vault.`;
    }
    return whatsAppCustomText;
  };

  const handleOpenWhatsAppWeb = () => {
    const text = getInterpolatedWhatsAppText();
    const phone = whatsAppBroadcastMode ? '' : (whatsAppTargetUser?.phone || '').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const startWhatsAppSimulation = () => {
    setApiProgress(0);
    setApiDispatching(true);
    setApiLogs(['Initializing Secure WhatsApp Gateway (Meta Cloud API)...']);
    
    setTimeout(() => {
      setApiLogs(prev => [...prev, 'Authenticating credentials... Token verified.']);
      setApiProgress(20);
    }, 850);

    setTimeout(() => {
      const recipientCount = whatsAppBroadcastMode 
        ? clients.filter(c => c.isClubMember).length 
        : 1;
      setApiLogs(prev => [...prev, `Compiling payload. Total messages queued: ${recipientCount}`]);
      setApiProgress(40);
    }, 1600);

    setTimeout(() => {
      if (whatsAppBroadcastMode) {
        const clubRecipients = clients.filter(c => c.isClubMember);
        clubRecipients.forEach((rec, idx) => {
          setTimeout(() => {
            setApiLogs(prev => [...prev, `Dispatched to ${rec.companyName || rec.name} (${rec.phone}) - [DELIVERED]`]);
            setApiProgress(prev => Math.min(prev + (50 / Math.max(clubRecipients.length, 1)), 95));
          }, idx * 400);
        });
      } else if (whatsAppTargetUser) {
        setApiLogs(prev => [...prev, `Dispatched to ${whatsAppTargetUser.name} (${whatsAppTargetUser.phone}) - [DELIVERED]`]);
        setApiProgress(80);
      }
    }, 2400);

    const completeTime = whatsAppBroadcastMode 
      ? 2400 + (clients.filter(c => c.isClubMember).length * 400) + 500
      : 3400;

    setTimeout(() => {
      setApiLogs(prev => [...prev, 'WhatsApp campaign dispatch finished successfully. Connection closed.']);
      setApiProgress(100);
      setApiDispatching(false);
    }, completeTime);
  };

  // Advanced Logs & Reminders helper functions
  const handleAddClientLog = (clientId: string) => {
    if (!newClientLogText.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const logEntry = `${today} - ${newClientLogText.trim()}`;
    
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const updatedHistory = [...c.activityHistory, logEntry];
        // Instantly sync modal state
        setSelectedClientForHistory({ ...c, activityHistory: updatedHistory });
        return { ...c, activityHistory: updatedHistory };
      }
      return c;
    }));
    setNewClientLogText('');
  };

  const handleAddLeadLog = (leadId: string) => {
    if (!newLeadLogText.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const logEntry = `${today} - ${newLeadLogText.trim()}`;
    
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const updatedHistory = [...(l.activityHistory || []), logEntry];
        // Instantly sync modal state
        setSelectedLeadForHistory({ ...l, activityHistory: updatedHistory });
        return { ...l, activityHistory: updatedHistory };
      }
      return l;
    }));
    setNewLeadLogText('');
  };

  const handleScheduleLeadReminder = (leadName: string) => {
    const today = new Date();
    // Schedule follow-up for 3 days from now
    today.setDate(today.getDate() + 3);
    const dateStr = today.toISOString().split('T')[0];
    
    const newRem: Reminder = {
      id: `RM-${Math.floor(400 + Math.random() * 600)}`,
      title: `Follow up callback with lead: ${leadName}`,
      date: dateStr,
      type: 'follow_up',
      completed: false
    };

    setReminders(prev => [...prev, newRem]);
    alert(`Success: Scheduled a follow-up reminder callback for ${leadName} on ${dateStr}!`);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      (lead.companyName && lead.companyName.toLowerCase().includes(leadSearchQuery.toLowerCase())) ||
      lead.email.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      lead.id.toLowerCase().includes(leadSearchQuery.toLowerCase());
      
    const matchesStep = leadStepFilter === 'all' || lead.pipelineStep === leadStepFilter;
    const matchesStatus = leadStatusFilter === 'all' || lead.status === leadStatusFilter;
    
    return matchesSearch && matchesStep && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* --- Tab Content Areas --- */}
      
      {/* 1. DASHBOARD INSIGHTS TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Leads</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">{leads.length + 3}</h3>
              <p className="text-[10px] text-orange-600 font-bold mt-1">Pending Qualification</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-[#A11212] font-black uppercase tracking-widest">Converted Clients</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">24</h3>
              <p className="text-[10px] text-green-700 font-bold mt-1">➔ 75% Conversion Rate</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">B2B Retainers</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2">
                {clients.filter(c => c.type === 'B2B').length}
              </h3>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Active Accounts</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total ARR value</p>
              <h3 className="text-3xl font-black text-[#A11212] mt-2">
                {clients.reduce((acc, c) => acc + c.yearlyBilling, 0).toLocaleString()} OMR
              </h3>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Annual Recurring Revenue</p>
            </div>
          </div>

          {/* Chart & Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversion Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Conversion Metrics & Growth</h4>
                <p className="text-[10px] text-gray-400 font-bold">Historical data indicating client conversion performance</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={RECHARTS_DATA}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A11212" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#A11212" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Leads" stroke="#A11212" fillOpacity={1} fill="url(#colorLeads)" />
                    <Area type="monotone" dataKey="Converted" stroke="#16a34a" fillOpacity={1} fill="url(#colorConv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Summary / Notifications */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Recent Activities & Alerts</h4>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {dynamicAlerts.length === 0 ? (
                    <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-2xl border border-gray-200">
                      <CheckCircle2 size={18} className="text-green-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-gray-700">{isAr ? 'لا توجد تنبيهات عاجلة' : 'No Urgent Alerts'}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{isAr ? 'جميع العمليات والفرص تسير بشكل جيد.' : 'All pipelines and active retentions are in healthy status.'}</p>
                      </div>
                    </div>
                  ) : (
                    dynamicAlerts.map((alert, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 items-start p-3 rounded-2xl border ${
                          alert.type === 'stale_lead' 
                            ? 'bg-red-50/40 border-red-100/50 text-[#A11212]' 
                            : 'bg-yellow-50/40 border-yellow-100/50 text-yellow-700'
                        }`}
                      >
                        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-gray-800">{alert.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{alert.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#A11212]/5 p-4 rounded-2xl border border-[#A11212]/10 text-center">
                <p className="text-xs font-black text-gray-900">VP Verification Required</p>
                <p className="text-[10px] text-gray-500 mt-1">There are pending exports awaiting managerial sign-off.</p>
                <button
                  onClick={() => handleTabChange('financials')}
                  className="mt-3 w-full bg-[#A11212] hover:bg-[#800e0e] text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  Manage Approvals
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LEAD PIPELINE TAB */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Qualification & Lead Pipeline</h3>
              <p className="text-xs text-gray-500 font-bold">Follow leads through the step-by-step qualification flow to Client status</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Temperature Codes */}
              <div className="hidden lg:flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase mr-3">Cold</span>
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase mr-3">Warm</span>
                <span className="w-2.5 h-2.5 bg-green-600 rounded-full"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase">Hot / Qualified</span>
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-205">
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    pipelineViewMode === 'kanban' 
                      ? 'bg-[#A11212] text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Kanban Board
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    pipelineViewMode === 'list' 
                      ? 'bg-[#A11212] text-white shadow-sm' 
                      : 'text-gray-650 hover:text-gray-900'
                  }`}
                >
                  Data List
                </button>
              </div>
            </div>
          </div>

          {/* List View Search/Filters */}
          {pipelineViewMode === 'list' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs animate-in fade-in duration-200">
              {/* Search Bar */}
              <div>
                <label className="block text-[9px] font-black text-gray-450 uppercase tracking-widest mb-1.5 font-bold">Search Leads</label>
                <input
                  type="text"
                  placeholder="Search by name, company..."
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] focus:bg-white transition-all"
                />
              </div>
              {/* Funnel Stage Filter */}
              <div>
                <label className="block text-[9px] font-black text-gray-455 uppercase tracking-widest mb-1.5 font-bold">Funnel Phase</label>
                <select
                  value={leadStepFilter}
                  onChange={(e) => setLeadStepFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider outline-none text-gray-700 focus:border-[#A11212] focus:bg-white transition-all"
                >
                  <option value="all">All Steps</option>
                  <option value="follow_up">1. Follow Up</option>
                  <option value="add_data">2. Add Data</option>
                  <option value="connect">3. Connect</option>
                  <option value="update">4. Update</option>
                  <option value="sort">5. Sort & Qualify</option>
                </select>
              </div>
              {/* Interest Status Filter */}
              <div>
                <label className="block text-[9px] font-black text-gray-455 uppercase tracking-widest mb-1.5 font-bold">Interest Status</label>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider outline-none text-gray-700 focus:border-[#A11212] focus:bg-white transition-all"
                >
                  <option value="all">All Temperatures</option>
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              </div>
            </div>
          )}

          {/* Conditional Rendering: Kanban vs List */}
          {pipelineViewMode === 'kanban' ? (
            /* Kanban Columns View */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
              
              {/* Column 1: Follow Up */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>1. Follow-Up</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'follow_up').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'follow_up').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onScheduleReminder={() => handleScheduleLeadReminder(lead.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 2: Add Data */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>2. Add Data</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'add_data').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'add_data').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onScheduleReminder={() => handleScheduleLeadReminder(lead.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 3: Connect */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>3. Connect</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'connect').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'connect').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onScheduleReminder={() => handleScheduleLeadReminder(lead.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 4: Update */}
              <div className="bg-gray-100/70 p-4 rounded-3xl border border-gray-200/50 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>4. Update</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'update').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'update').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onScheduleReminder={() => handleScheduleLeadReminder(lead.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Column 5: Sort (Qualified) */}
              <div className="bg-[#A11212]/5 p-4 rounded-3xl border border-[#A11212]/20 min-h-[450px] flex flex-col space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-widest border-b pb-2 flex justify-between">
                  <span>5. Sort & Qualify</span>
                  <span className="bg-[#A11212] text-white px-2 py-0.5 rounded font-black">{leads.filter(l => l.pipelineStep === 'sort').length}</span>
                </h4>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
                  {leads.filter(l => l.pipelineStep === 'sort').map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onMove={(step) => shiftLeadStep(lead.id, step)}
                      onViewDossier={() => setSelectedLeadForHistory(lead)}
                      onScheduleReminder={() => handleScheduleLeadReminder(lead.name)}
                    />
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Structured Leads Spreadsheet View */
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm animate-in fade-in duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-4 pl-6">ID / Contact Name</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Phone & Email</th>
                      <th className="p-4">Interest Rating</th>
                      <th className="p-4">Funnel Phase</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 italic font-medium">
                          No leads match the active search parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map(lead => {
                        const statusColors = {
                          cold: 'bg-red-50 text-red-700 border-red-100',
                          warm: 'bg-yellow-50 text-yellow-800 border-yellow-100',
                          hot: 'bg-green-50 text-green-700 border-green-100',
                          converted: 'bg-blue-50 text-blue-700 border-blue-100'
                        }[lead.status] || 'bg-gray-50 text-gray-600';

                        return (
                          <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="p-4 pl-6">
                              <span className="block text-[8px] bg-gray-100 border text-gray-500 font-black px-1.5 py-0.5 rounded w-max mb-1">
                                {lead.id}
                              </span>
                              <span className="font-black text-gray-900 text-sm">{lead.name}</span>
                            </td>
                            <td className="p-4 font-bold text-gray-700">
                              {lead.companyName || <span className="text-gray-400 italic text-[10px]">B2C Client</span>}
                            </td>
                            <td className="p-4 space-y-0.5 text-gray-500 font-bold text-[11px]">
                              <p className="flex items-center gap-1.5">📞 {lead.phone}</p>
                              <p className="flex items-center gap-1.5 text-[10px]">✉️ {lead.email}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColors}`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <select
                                value={lead.pipelineStep}
                                onChange={(e) => shiftLeadStep(lead.id, e.target.value as Lead['pipelineStep'])}
                                className="bg-gray-50 border border-gray-250 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider outline-none text-gray-750 focus:border-[#A11212]"
                              >
                                <option value="follow_up">1. Follow Up</option>
                                <option value="add_data">2. Add Data</option>
                                <option value="connect">3. Connect</option>
                                <option value="update">4. Update</option>
                                <option value="sort">5. Sort & Qualify</option>
                              </select>
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLeadForHistory(lead)}
                                  className="bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                  Dossier
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleScheduleLeadReminder(lead.name)}
                                  className="bg-red-900/5 hover:bg-red-900/10 border border-red-900/10 text-[#A11212] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all font-bold"
                                >
                                  + Follow-up
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CLIENTS & LEADS DIRECTORY TAB */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Header Controls & Export Verification */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Onboarded Clients & Active Accounts</h3>
              <p className="text-xs text-gray-500 font-bold">Select client rows to review historical data, timeline actions, or trigger export</p>
            </div>
            <div className="flex items-center gap-3">
              {/* VP Signoff Toggle */}
              <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-250">
                <ShieldCheck size={16} className={isVpSignedOff ? 'text-green-700' : 'text-gray-400'} />
                <span className="text-[10px] font-black uppercase text-gray-600">VP Export Sign-off</span>
                <input
                  type="checkbox"
                  checked={isVpSignedOff}
                  onChange={(e) => setIsVpSignedOff(e.target.checked)}
                  className="w-4 h-4 text-[#A11212] accent-[#A11212] rounded cursor-pointer"
                />
              </div>

              <button
                onClick={() => setShowOnboardingModal(true)}
                className="bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#A11212]/20 active:scale-95 transition-all"
              >
                <UserPlus size={14} /> {isAr ? 'تسجيل عميل جديد' : 'Onboard Client'}
              </button>

              <button
                onClick={handleExportData}
                className="bg-white border border-gray-200 hover:border-brand-dark/40 text-gray-700 text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Download size={14} /> Export Directory
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-start">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">ID</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Client</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Segment Type</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Services Package</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-start">Account Owner</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-end">ARR Value</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.map(client => (
                    <tr key={client.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="p-4 text-xs font-black text-gray-900">{client.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#A11212]/5 text-[#A11212] font-black text-xs flex items-center justify-center">
                            {client.companyName ? <Building2 size={14} /> : client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900">{client.companyName || client.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{client.email} · {client.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          client.type === 'B2B' 
                            ? 'bg-red-50 text-red-700 border-red-100' 
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {client.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {client.servicesPackage.map(s => (
                            <span key={s} className="bg-gray-50 border border-gray-200 text-gray-650 text-[9px] px-2 py-0.5 rounded font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-black text-gray-700">{client.overallManager}</td>
                      <td className="p-4 text-xs font-black text-gray-950 text-end">
                        {client.yearlyBilling.toLocaleString()} OMR
                        <span className="block text-[8px] text-gray-400 font-bold">Monthly: {client.monthlyBilling} OMR</span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedClientForHistory(client)}
                          className="bg-gray-50 border border-gray-200 hover:border-[#A11212] hover:text-[#A11212] text-gray-600 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all"
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMBO WORK TAB */}
      {activeTab === 'combo_work' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Account Configuration Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Multi-Department Combo Account Settings</h3>
              <p className="text-xs text-gray-500 font-bold">Configure client account owners and assign specialized personnel for multi-departmental services</p>
            </div>

            <form onSubmit={handleUpdateCombo} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Active Client</label>
                <select
                  value={selectedClientForCombo}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setSelectedClientForCombo(cId);
                    const targetClient = clients.find(c => c.id === cId);
                    if (targetClient) {
                      setComboSetup({
                        overallManager: targetClient.overallManager,
                        services: targetClient.servicesPackage,
                        delegation: targetClient.delegatedServices || {}
                      });
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName || c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Lead Owner */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Overall Account Owner</label>
                  <select
                    value={comboSetup.overallManager}
                    onChange={(e) => setComboSetup({ ...comboSetup, overallManager: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    {MOCK_EMPLOYEES.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.dept})</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1 font-bold">Account Owner oversees client correspondence across all services.</p>
                </div>

                {/* Sub services checkboxes */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Active Service Departments</label>
                  <div className="space-y-2 mt-1.5">
                    {DEPARTMENTS.map(dept => {
                      const active = comboSetup.services.includes(dept);
                      return (
                        <label key={dept} className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              let nextServices = [...comboSetup.services];
                              let nextDelegation = { ...comboSetup.delegation };

                              if (checked) {
                                nextServices.push(dept);
                                const defaultEmp = MOCK_EMPLOYEES.find(emp => emp.dept === dept) || MOCK_EMPLOYEES[0];
                                nextDelegation[dept] = defaultEmp.name;
                              } else {
                                nextServices = nextServices.filter(s => s !== dept);
                                delete nextDelegation[dept];
                              }

                              setComboSetup({
                                ...comboSetup,
                                services: nextServices,
                                delegation: nextDelegation
                              });
                            }}
                            className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                          />
                          <span>{dept}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Department Personnel Delegation grid */}
              {comboSetup.services.length > 0 && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Departmental Resource Assignment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {comboSetup.services.map(dept => (
                      <div key={dept} className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-2">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">{dept} Assignee</label>
                        <select
                          value={comboSetup.delegation[dept] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setComboSetup(prev => ({
                              ...prev,
                              delegation: {
                                ...prev.delegation,
                                [dept]: val
                              }
                            }));
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                        >
                          {MOCK_EMPLOYEES.filter(emp => emp.dept === dept || dept === 'Tax & VAT').map(emp => (
                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl transition-all"
              >
                Save Account Structure
              </button>

            </form>
          </div>

          {/* Right panel: Current Delegation Overview */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Account Matrix View</h4>
            {(() => {
              const selectedC = clients.find(c => c.id === selectedClientForCombo);
              if (!selectedC) return <p className="text-xs text-gray-400">Select a client to preview account matrix.</p>;
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Corporate Client</p>
                    <h5 className="font-black text-sm text-gray-900 mt-1">{selectedC.companyName || selectedC.name}</h5>
                    <p className="text-[10px] text-gray-400 font-bold">ID: {selectedC.id}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Manager (Supervisor)</p>
                    <div className="flex items-center gap-2 p-3 bg-red-50/30 border border-red-100 rounded-xl">
                      <Award className="text-[#A11212]" size={16} />
                      <span className="text-xs font-black text-gray-800">{selectedC.overallManager}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-Service Assignments</p>
                    <div className="space-y-2">
                      {selectedC.servicesPackage.map(service => {
                        const assignee = selectedC.delegatedServices?.[service] || 'Not Assigned';
                        return (
                          <div key={service} className="flex justify-between items-center bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-150">
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">{service}</p>
                              <p className="text-xs font-black text-gray-900">{assignee}</p>
                            </div>
                            <span className="text-[9px] bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded">Active</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 5. FINANCIAL CONTROLS TAB */}
      {activeTab === 'financials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HOD Workspace: Quotation to Invoice pipeline */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">HOD Engagement Approvals & Invoicing</h3>
              <p className="text-xs text-gray-500 font-bold">Approve draft quotation/engagement letters and convert them directly into invoices</p>
            </div>

            <div className="space-y-3">
              {quotations.map(q => (
                <div key={q.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">{q.clientName}</span>
                      <span className="text-[9px] bg-gray-100 border text-gray-600 px-1.5 py-0.5 rounded font-black uppercase">{q.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-bold">{q.serviceType} · <span className="text-[#A11212]">{q.budget.toLocaleString()} OMR</span></p>
                  </div>
                  <div>
                    {q.status === 'pending' ? (
                      <button
                        onClick={() => handleApproveQuotation(q)}
                        className="bg-[#A11212] hover:bg-[#800e0e] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all"
                      >
                        Approve & Bill
                      </button>
                    ) : (
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-150 px-2.5 py-1.5 rounded-xl font-black uppercase inline-flex items-center gap-1">
                        <CheckCheckIcon size={12} /> Billed (Invoice Created)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export verification instructions */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Export Regulatory Control</h4>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-3 text-xs text-gray-600 leading-relaxed">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="text-[#A11212]" size={16} /> Manager Signature Audit
              </p>
              <p>Under regulatory policy guidelines, corporate data spreadsheets cannot be downloaded without secondary authorization.</p>
              <p>Please toggle the **VP Export Sign-off** inside the clients tab to enable full directory downloads.</p>
            </div>
            
            <div className="border-t border-gray-100 pt-4 text-center">
              <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${
                isVpSignedOff ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isVpSignedOff ? 'Export Authorized' : 'Export Restricted'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. REMINDER DASHBOARD TAB */}
      {activeTab === 'reminders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reminders List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Tasks & Deadline Alerts</h3>
              <p className="text-xs text-gray-500 font-bold">Review and check off follow-up callbacks or contract deadlines</p>
            </div>

            <div className="space-y-3">
              {reminders.map(rem => (
                <div 
                  key={rem.id} 
                  onClick={() => toggleReminder(rem.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                    rem.completed 
                      ? 'bg-gray-50 border-gray-200 opacity-60' 
                      : 'bg-white border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      rem.completed ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}>
                      {rem.completed && <Check size={12} className="text-white" />}
                    </div>
                    <span className={`text-xs font-bold ${rem.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {rem.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      rem.type === 'follow_up' ? 'bg-orange-50 text-orange-700' :
                      rem.type === 'deadline' ? 'bg-red-50 text-red-750' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {rem.type}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">{rem.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Reminder Form */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#A11212]">Add Task Alert</h4>
            <form onSubmit={handleAddReminder} className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call Client regarding audit draft"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Deadline Date</label>
                <input
                  type="date"
                  required
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Classification</label>
                <select
                  value={newReminderType}
                  onChange={(e) => setNewReminderType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="follow_up">Follow Up</option>
                  <option value="deadline">Deadline</option>
                  <option value="review">Audit / Review</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all"
              >
                Log Reminder Alert
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. BUSINESS CLUB SPACE */}
      {activeTab === 'club' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-950 to-red-800 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            <div className="relative z-10 space-y-2">
              <span className="bg-red-500/20 border border-red-500/30 text-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {isAr ? 'برنامج عضوية نادي الأعمال' : 'Business Club Member Program'}
              </span>
              <h2 className="text-3xl font-black tracking-tight">{isAr ? 'نادي أعمال ميسرة' : 'Maisarah Business Club'}</h2>
              <p className="text-red-100/70 text-xs max-w-xl font-medium">
                {isAr 
                  ? 'برنامج حصري يربط بين رواد الأعمال وأصحاب الشركات لتلقي استشارات مجانية، وتحديثات ضريبية دورية، وخصومات مميزة على باقات خدماتنا.' 
                  : 'An exclusive network connecting corporate clients to receive complimentary tax advisories, regulatory digests, and tier-based discounts.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Member Roster */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{isAr ? 'أعضاء النادي النشطون' : 'Active Club Members'}</h3>
                  <p className="text-xs text-gray-500 font-bold">{isAr ? 'إدارة وتصفية العملاء المشتركين بالنادي' : 'Manage and filter active club members and benefits'}</p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث بالاسم...' : 'Search members...'}
                    value={clubSearch}
                    onChange={(e) => setClubSearch(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212] w-full sm:w-40"
                  />
                  <select
                    value={selectedClubTierFilter}
                    onChange={(e) => setSelectedClubTierFilter(e.target.value as any)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="all">{isAr ? 'كل الفئات' : 'All Tiers'}</option>
                    <option value="silver">{isAr ? 'الفئة الفضية' : 'Silver Tier'}</option>
                    <option value="gold">{isAr ? 'الفئة الذهبية' : 'Gold Tier'}</option>
                    <option value="platinum">{isAr ? 'الفئة البلاتينية' : 'Platinum Tier'}</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="border-b border-gray-50 text-[9px] font-black uppercase text-gray-400 tracking-widest">
                      <th className="pb-3 text-start">{isAr ? 'العضو' : 'Member'}</th>
                      <th className="pb-3 text-start">{isAr ? 'فئة العضوية' : 'Membership Tier'}</th>
                      <th className="pb-3 text-start">{isAr ? 'الاشتراكات الشهرية' : 'Monthly Retainer'}</th>
                      <th className="pb-3 text-end">{isAr ? 'تواصل' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clients
                      .filter(c => c.isClubMember)
                      .filter(c => selectedClubTierFilter === 'all' || c.clubTier === selectedClubTierFilter)
                      .filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase()) || (c.companyName || '').toLowerCase().includes(clubSearch.toLowerCase()))
                      .map(member => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4">
                            <h4 className="font-black text-sm text-gray-900">{member.companyName || member.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold">{member.name} &bull; {member.phone}</p>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              member.clubTier === 'platinum' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                              member.clubTier === 'gold' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              'bg-slate-50 border-slate-200 text-slate-600'
                            }`}>
                              {member.clubTier}
                            </span>
                          </td>
                          <td className="py-4 font-black text-xs text-gray-800">
                            {member.monthlyBilling} OMR <span className="text-[9px] text-gray-400 font-bold">/mo</span>
                          </td>
                          <td className="py-4 text-end">
                            <button
                              onClick={() => {
                                setWhatsAppTargetUser({ name: member.name, phone: member.phone });
                                setWhatsAppBroadcastMode(false);
                                setWhatsAppTemplate('welcome');
                                setWhatsAppModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors"
                            >
                              WhatsApp
                            </button>
                          </td>
                        </tr>
                      ))}
                    {clients.filter(c => c.isClubMember).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                          No active club members found. Register new clients and check the 'Business Club' option!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Tips & Resources */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{isAr ? 'مستندات وتوجيهات مجانية' : 'Complimentary Resources'}</h3>
                  <p className="text-xs text-gray-500 font-bold">{isAr ? 'تعميم نصائح الأعمال للأعضاء عبر واتساب' : 'Broadcast business advisories to members'}</p>
                </div>

                <div className="space-y-4">
                  {tips.map(tip => (
                    <div key={tip.id} className="border border-gray-100 rounded-2xl p-4 space-y-3 hover:border-gray-250 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="bg-[#A11212]/5 text-[#A11212] px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{tip.category}</span>
                        <span className="text-[9px] text-gray-400 font-bold">{tip.date}</span>
                      </div>
                      <h4 className="font-black text-sm text-gray-900">{tip.title}</h4>
                      <p className="text-xs text-gray-550 leading-relaxed font-medium">{tip.content}</p>
                      
                      <div className="border-t border-gray-50 pt-3 flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-bold">Free Club Perk</span>
                        <button
                          onClick={() => {
                            setWhatsAppBroadcastMode(true);
                            setSelectedBroadcastTip(tip);
                            setWhatsAppModalOpen(true);
                          }}
                          className="bg-[#A11212] hover:bg-[#800e0e] text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          Broadcast Tip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS & POPUPS --- */}

      {/* A. Onboarding Client Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <form onSubmit={handleOnboardSubmit} className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Client Onboarding Portal</h3>
              <button type="button" onClick={() => setShowOnboardingModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              {/* Type Switcher */}
              <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setClientType('B2B')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                    clientType === 'B2B' ? 'bg-[#A11212] text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  B2B Corporate Account
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('B2C')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                    clientType === 'B2C' ? 'bg-[#A11212] text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  B2C Standard Customer
                </button>
              </div>

              {/* General Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contact Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Salim Al-Busaidi"
                    value={onboardForm.name}
                    onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.om"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Personal Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+968..."
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                {clientType === 'B2B' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Corporate Phone</label>
                    <input
                      type="text"
                      placeholder="+968 2456..."
                      value={onboardForm.companyPhone}
                      onChange={(e) => setOnboardForm({ ...onboardForm, companyPhone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                )}
              </div>

              {/* B2B Specific details */}
              {clientType === 'B2B' && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">B2B Corporate Identifiers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Company Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Mazoon Electricity SAOC"
                        value={onboardForm.companyName}
                        onChange={(e) => setOnboardForm({ ...onboardForm, companyName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Commercial Registration (CR)</label>
                      <input
                        type="text"
                        required
                        placeholder="CR-1234567"
                        value={onboardForm.registrationNumber}
                        onChange={(e) => setOnboardForm({ ...onboardForm, registrationNumber: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Scope & Assignee */}
              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Overall Account Manager</label>
                  <select
                    value={onboardForm.overallManager}
                    onChange={(e) => setOnboardForm({ ...onboardForm, overallManager: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    {MOCK_EMPLOYEES.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.dept})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>Monthly Billing (OMR)</span>
                    <span className="text-[#A11212] font-black">
                      Est: {onboardForm.servicePackage.reduce((sum, pkg) => sum + (SERVICE_RATES[pkg] || 0), 0) > 0 ? (
                        (() => {
                          let sum = onboardForm.servicePackage.reduce((acc, pkg) => acc + (SERVICE_RATES[pkg] || 0), 0);
                          if (onboardForm.isClubMember) {
                            const disc = onboardForm.clubTier === 'platinum' ? 0.20 : onboardForm.clubTier === 'gold' ? 0.15 : 0.10;
                            sum = Math.round(sum * (1 - disc));
                          }
                          return `${sum} OMR`;
                        })()
                      ) : 'Select services'}
                    </span>
                  </label>
                  <input
                    type="number"
                    required
                    value={onboardForm.monthlyBilling}
                    onChange={(e) => setOnboardForm({ ...onboardForm, monthlyBilling: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                    placeholder="Enter 0 to use Auto-Estimate"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contract Expiry Date</label>
                  <input
                    type="date"
                    value={onboardForm.contractExpiryDate}
                    onChange={(e) => setOnboardForm({ ...onboardForm, contractExpiryDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              {/* Service Select Checklist */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Scope of Services</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-2xl">
                  {DEPARTMENTS.map(dept => (
                    <label key={dept} className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onboardForm.servicePackage.includes(dept)}
                        onChange={(e) => {
                          const active = e.target.checked;
                          setOnboardForm(prev => ({
                            ...prev,
                            servicePackage: active 
                              ? [...prev.servicePackage, dept] 
                              : prev.servicePackage.filter(s => s !== dept)
                          }));
                        }}
                        className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                      />
                      <span>{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Business Club Membership & Quotations */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Business Club & Estimations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-red-900/5 p-4 rounded-2xl border border-red-900/10">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onboardForm.isClubMember}
                      onChange={(e) => setOnboardForm({ ...onboardForm, isClubMember: e.target.checked })}
                      className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                    />
                    <span>Business Club Member</span>
                  </label>

                  {onboardForm.isClubMember && (
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Club Tier</label>
                      <select
                        value={onboardForm.clubTier}
                        onChange={(e) => setOnboardForm({ ...onboardForm, clubTier: e.target.value as any })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-[#A11212]"
                      >
                        <option value="silver">Silver Tier (10% Off)</option>
                        <option value="gold">Gold Tier (15% Off)</option>
                        <option value="platinum">Platinum Tier (20% Off)</option>
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onboardForm.autoQuotation}
                      onChange={(e) => setOnboardForm({ ...onboardForm, autoQuotation: e.target.checked })}
                      className="w-4 h-4 rounded text-[#A11212] accent-[#A11212]"
                    />
                    <span>Auto-create Quotations</span>
                  </label>
                </div>
              </div>

              {/* Log Initial Activity */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Log Initial Activity</label>
                <textarea
                  placeholder="e.g. Introductory presentation completed, NDA signed..."
                  value={onboardForm.initialActivity}
                  onChange={(e) => setOnboardForm({ ...onboardForm, initialActivity: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowOnboardingModal(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
              >
                Register & Onboard
              </button>
            </div>
          </form>
        </div>
      )}

      {/* B. Lead Qualification prompt popup */}
      {qualifyingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-700 mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Qualify & Convert Lead</h3>
              <p className="text-xs text-gray-500 font-bold">
                Assign **{qualifyingLead.name}** ({qualifyingLead.companyName || 'B2C Account'}) to an employee to automatically convert them to an active client.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assign Account Manager</label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
              >
                {MOCK_EMPLOYEES.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name} ({emp.dept})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQualifyingLead(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmQualification}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-colors"
              >
                Convert to Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. Export Verification warning popup */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-[#A11212] mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Export Restricted</h3>
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              You cannot export the client registry spreadsheet without VP Verification. Please toggle the **VP Export Sign-off** checklist at the top of the directory to authenticate your download.
            </p>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase transition-all"
            >
              Understand
            </button>
          </div>
        </div>
      )}

      {/* D. Client History & Activity Logs Modal */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#A11212]">Account History Logs</h3>
              <button onClick={() => setSelectedClientForHistory(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150">
              <h4 className="font-black text-sm text-gray-900">{selectedClientForHistory.companyName || selectedClientForHistory.name}</h4>
              <p className="text-[10px] text-gray-500 mt-1 font-bold">Onboarded: {selectedClientForHistory.created_at}</p>
              {selectedClientForHistory.contractExpiryDate && (
                <p className={`text-[10px] mt-1.5 font-black ${
                  (new Date(selectedClientForHistory.contractExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 30
                    ? 'text-red-700'
                    : 'text-green-700'
                }`}>
                  {isAr ? 'تاريخ انتهاء العقد: ' : 'Contract Expiry Date: '} {selectedClientForHistory.contractExpiryDate}
                </p>
              )}
            </div>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {selectedClientForHistory.activityHistory.map((log, index) => (
                <div key={index} className="flex gap-3 items-start p-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                  <Activity size={14} className="text-gray-400 mt-0.5" />
                  <span className="text-xs font-medium text-gray-700">{log}</span>
                </div>
              ))}
            </div>

            {/* Add Log Form */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <label className="block text-[9px] font-black text-gray-455 uppercase tracking-wider">Log New Interaction</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Sent tax update document, Callback requested..."
                  value={newClientLogText}
                  onChange={(e) => setNewClientLogText(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                />
                <button
                  type="button"
                  onClick={() => handleAddClientLog(selectedClientForHistory.id)}
                  className="bg-[#A11212] hover:bg-[#800e0e] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Log
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedClientForHistory(null)}
              className="w-full bg-[#A11212] hover:bg-[#800e0e] text-white py-3 rounded-xl font-black text-xs uppercase transition-all"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}

      {/* E. Lead Details & Activity Logs Modal */}
      {selectedLeadForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#A11212]">Lead Details & History</h3>
              <button onClick={() => setSelectedLeadForHistory(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>
            
            {/* Lead Meta Information Card */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-155 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Lead Name</p>
                <p className="font-black text-gray-950 text-sm mt-0.5">{selectedLeadForHistory.name}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Company Name</p>
                <p className="font-black text-gray-950 text-sm mt-0.5">{selectedLeadForHistory.companyName || 'B2C'}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Contact Email</p>
                <p className="font-bold text-gray-600 mt-0.5">{selectedLeadForHistory.email}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase text-gray-400 font-black">Contact Phone</p>
                <p className="font-bold text-gray-600 mt-0.5">{selectedLeadForHistory.phone}</p>
              </div>
            </div>

            {/* Lead Status Details */}
            <div className="flex justify-between items-center bg-red-900/5 p-4 rounded-xl border border-red-900/10">
              <div>
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Funnel Phase</span>
                <p className="text-xs font-black text-gray-900 capitalize mt-0.5">{selectedLeadForHistory.pipelineStep.replace('_', ' ')}</p>
              </div>
              <div className="text-end">
                <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Interest Level</span>
                <p className="text-xs font-black text-[#A11212] uppercase tracking-wide mt-0.5">{selectedLeadForHistory.status}</p>
              </div>
            </div>

            {/* Lead Log Timeline */}
            <div>
              <label className="block text-[10px] font-black text-gray-450 uppercase tracking-widest mb-1.5 font-bold">Interaction History Logs</label>
              <div className="space-y-2 max-h-[22vh] overflow-y-auto pr-1">
                {(selectedLeadForHistory.activityHistory || []).map((log, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-white border border-gray-100 rounded-xl shadow-xs">
                    <Activity size={14} className="text-gray-400 mt-0.5" />
                    <span className="text-xs font-medium text-gray-700">{log}</span>
                  </div>
                ))}
                {(!selectedLeadForHistory.activityHistory || selectedLeadForHistory.activityHistory.length === 0) && (
                  <p className="text-xs text-gray-400 italic text-center p-3 bg-gray-50 rounded-xl border">No activities logged yet.</p>
                )}
              </div>
            </div>

            {/* Add Log Form */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <label className="block text-[9px] font-black text-gray-455 uppercase tracking-wider">Log New Interaction</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Completed intro meeting, Requested pricing info..."
                  value={newLeadLogText}
                  onChange={(e) => setNewLeadLogText(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
                />
                <button
                  type="button"
                  onClick={() => handleAddLeadLog(selectedLeadForHistory.id)}
                  className="bg-[#A11212] hover:bg-[#800e0e] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Log
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleScheduleLeadReminder(selectedLeadForHistory.name);
                  setSelectedLeadForHistory(null);
                }}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Schedule Follow-up
              </button>
              <button
                type="button"
                onClick={() => setSelectedLeadForHistory(null)}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-all"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. WhatsApp Dispatcher & Gateway Simulator Modal */}
      {whatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  {whatsAppBroadcastMode ? 'WhatsApp Broadcast Campaign' : 'WhatsApp Contact Manager'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setWhatsAppModalOpen(false);
                  setApiLogs([]);
                  setApiProgress(0);
                }} 
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Recipient Details */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-bold text-gray-700">
                <p className="text-[10px] uppercase text-gray-400 mb-1">Target Audience</p>
                {whatsAppBroadcastMode ? (
                  <p className="text-gray-900 text-sm">All Active Business Club Members ({clients.filter(c => c.isClubMember).length} Recipients)</p>
                ) : (
                  <p className="text-gray-900 text-sm">{whatsAppTargetUser?.name} ({whatsAppTargetUser?.phone})</p>
                )}
              </div>

              {/* Template Options (Only for Single User Contact) */}
              {!whatsAppBroadcastMode && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Message Template</label>
                  <select
                    value={whatsAppTemplate}
                    onChange={(e) => setWhatsAppTemplate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="welcome">Welcome to Business Club</option>
                    <option value="vat">Q3 VAT Compliance Reminder</option>
                    <option value="custom">Custom Message (Free text)</option>
                  </select>
                </div>
              )}

              {/* Message Preview */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Message Preview</label>
                {whatsAppTemplate === 'custom' && !whatsAppBroadcastMode ? (
                  <textarea
                    rows={4}
                    value={whatsAppCustomText}
                    onChange={(e) => setWhatsAppCustomText(e.target.value)}
                    placeholder="Type your WhatsApp message..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                  />
                ) : (
                  <div className="bg-green-50/50 border border-green-150 p-4 rounded-2xl text-xs text-green-950 font-bold whitespace-pre-line leading-relaxed">
                    {getInterpolatedWhatsAppText()}
                  </div>
                )}
              </div>

              {/* API Dispatch Progress & Console Simulator */}
              {(apiDispatching || apiLogs.length > 0) && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs font-black text-gray-900 uppercase">
                    <span>Sending Progress</span>
                    <span>{Math.round(apiProgress)}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${apiProgress}%` }}
                    />
                  </div>

                  {/* Mock Terminal Console */}
                  <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-[10px] h-32 overflow-y-auto space-y-1 scrollbar-hide shadow-inner border border-gray-850">
                    {apiLogs.map((log, idx) => (
                      <p key={idx} className="animate-fade-in">&gt; {log}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
              {!whatsAppBroadcastMode && (
                <button
                  type="button"
                  onClick={handleOpenWhatsAppWeb}
                  disabled={apiDispatching}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Open WhatsApp Web
                </button>
              )}
              <button
                type="button"
                onClick={startWhatsAppSimulation}
                disabled={apiDispatching}
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {apiDispatching ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Run API Broadcaster</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Inner Sub Component: Lead Card ---
function LeadCard({ 
  lead, 
  onMove, 
  onViewDossier, 
  onScheduleReminder 
}: { 
  lead: Lead; 
  onMove: (step: Lead['pipelineStep']) => void; 
  onViewDossier: () => void;
  onScheduleReminder: () => void;
}) {
  const stepMap: Record<Lead['pipelineStep'], Lead['pipelineStep'][]> = {
    follow_up: ['add_data'],
    add_data: ['follow_up', 'connect'],
    connect: ['add_data', 'update'],
    update: ['connect', 'sort'],
    sort: ['update']
  };

  const nextSteps = stepMap[lead.pipelineStep];

  const colorCls = {
    red: 'bg-red-500 border-red-200',
    yellow: 'bg-yellow-500 border-yellow-200',
    green: 'bg-green-500 border-green-200'
  }[lead.qualificationColor];

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3 hover:border-gray-400 transition-all">
      <div className="flex justify-between items-start">
        <span className="text-[9px] bg-gray-100 border text-gray-500 font-black px-1.5 py-0.5 rounded">
          {lead.id}
        </span>
        <span className={`w-2.5 h-2.5 rounded-full border ${colorCls}`}></span>
      </div>

      <div>
        <h5 className="font-black text-xs text-gray-900">{lead.name}</h5>
        {lead.companyName && (
          <p className="text-[10px] text-gray-500 font-bold">{lead.companyName}</p>
        )}
      </div>

      <p className="text-[10px] text-gray-500 leading-normal bg-gray-50 p-2 rounded-lg font-medium border border-gray-150">
        {lead.notes}
      </p>

      {/* Move Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[9px] font-black uppercase text-gray-400">
        <span>Transition</span>
        <div className="flex gap-1">
          {nextSteps.map(step => (
            <button
              key={step}
              onClick={() => onMove(step)}
              className="bg-gray-150 hover:bg-[#A11212] hover:text-white px-2 py-1 rounded transition-colors text-gray-700"
            >
              {step.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Interaction Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={onViewDossier}
          className="flex-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-center"
        >
          Dossier
        </button>
        <button
          onClick={onScheduleReminder}
          className="flex-1 bg-red-900/5 hover:bg-red-900/10 border border-red-900/10 text-[#A11212] py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-center font-bold"
        >
          + Follow-up
        </button>
      </div>
    </div>
  );
}

// Helper icons
function CheckCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      style={{ width: props.size, height: props.size }}
    >
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}
