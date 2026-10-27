export type CycleType = 
  | 'quarterly' 
  | 'monthly' 
  | 'engagement' 
  | 'yearly' 
  | 'project' 
  | 'case_govt' 
  | 'custom';

export interface DepartmentStage {
  step_number: number;
  name_en: string;
  name_ar: string;
  deadline_rule: string;
  requires_approval?: boolean;
  description_en?: string;
  description_ar?: string;
}

export interface DepartmentRole {
  title_en: string;
  title_ar: string;
  access_role?: string;
}

export interface DepartmentConfig {
  id: string;
  name: string;
  name_ar?: string;
  head_title: string;
  head_title_ar?: string;
  duty: string;
  duty_ar?: string;
  cycle_type: CycleType;
  color?: string;
  icon?: string;
  enable_cross_handoff?: boolean;
  allowed_handoff_dept_ids?: string[];
  job_positions: string[];
  roles?: DepartmentRole[];
  stages?: DepartmentStage[];
  services: string[];
  services_ar?: Record<string, string>;
  kpis: {
    id: string;
    label: string;
    label_ar?: string;
    type: 'count' | 'percentage' | 'days' | 'score';
  }[];
  extra_features: string[];
}

export const DEPARTMENTS: Record<string, DepartmentConfig> = {
  // 1. Tax & VAT
  tax_vat: {
    id: 'tax_vat',
    name: 'Tax & VAT',
    name_ar: 'الضرائب والقيمة المضافة',
    head_title: 'VAT & Tax Head',
    head_title_ar: 'رئيس قسم الضرائب والقيمة المضافة',
    duty: 'Deliver accurate VAT compliance, handle tax certificates, exemptions, and objections.',
    duty_ar: 'إدارة إقرارات ضريبة القيمة المضافة والشهادات الضريبية والإعفاءات والاعتراضات.',
    cycle_type: 'quarterly',
    color: '#6366F1',
    icon: 'Receipt',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: ['bookkeeping', 'liquidation', 'management'],
    job_positions: [
      'VAT & Tax Head',
      'Senior VAT Specialist',
      'VAT Accountant',
      'Tax Trainee'
    ],
    stages: [
      { step_number: 1, name_en: 'VAT Q1 (Jan-Mar)', name_ar: 'إقرار الربع الأول (يناير - مارس)', deadline_rule: '30 Apr', requires_approval: true },
      { step_number: 2, name_en: 'VAT Q2 (Apr-Jun)', name_ar: 'إقرار الربع الثاني (أبريل - يونيو)', deadline_rule: '31 Jul', requires_approval: true },
      { step_number: 3, name_en: 'VAT Q3 (Jul-Sep)', name_ar: 'إقرار الربع الثالث (يوليو - سبتمبر)', deadline_rule: '31 Oct', requires_approval: true },
      { step_number: 4, name_en: 'VAT Q4 (Oct-Dec)', name_ar: 'إقرار الربع الرابع (أكتوبر - ديسمبر)', deadline_rule: '31 Jan', requires_approval: true },
      { step_number: 5, name_en: 'Tax Certificate', name_ar: 'الشهادة الضريبية وبراءة الذمة', deadline_rule: 'One-off', requires_approval: true }
    ],
    services: [
      'VAT filing',
      'VAT consultancy',
      'VAT cancellation',
      'Tax certificate',
      'Renew tax certificate',
      'Objection',
      'Exemption',
      'Tax calculation & fin. statement'
    ],
    kpis: [
      { id: 'filings_submitted_on_time', label: 'Filings submitted on time (%)', label_ar: 'نسبة تقديم الإقرارات بالموعد', type: 'percentage' },
      { id: 'penalties_avoided', label: 'Penalties avoided (count)', label_ar: 'الغرامات المتفادية', type: 'count' },
      { id: 'pending_docs_per_client', label: 'Pending docs per client', label_ar: 'مستندات معلقة لكل عميل', type: 'count' },
      { id: 'client_filing_completion', label: 'Client filing completion rate', label_ar: 'نسبة اكتمال إقرارات العملاء', type: 'percentage' }
    ],
    extra_features: [
      'VAT calendar (quarterly deadlines per client)',
      'Penalty alert (flags clients near deadline)',
      'Filing status tracker per client',
      'Tax authority notices log'
    ]
  },

  // 2. Income Tax
  income_tax: {
    id: 'income_tax',
    name: 'Income Tax',
    name_ar: 'ضريبة الدخل',
    head_title: 'Tax Head',
    head_title_ar: 'رئيس قسم ضريبة الدخل',
    duty: 'Manage annual corporate tax returns, tax cards, P&L prep, and tax authority objections.',
    duty_ar: 'إدارة إقرارات ضريبة الدخل السنوية والبطاقات الضريبية وتجهيز الأرباح والخسائر والاعتراضات.',
    cycle_type: 'yearly',
    color: '#0284C7',
    icon: 'Calculator',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: ['bookkeeping', 'audit', 'liquidation'],
    job_positions: [
      'Income Tax Head',
      'Corporate Tax Advisor',
      'Tax Preparer',
      'Tax Consultant'
    ],
    stages: [
      { step_number: 1, name_en: 'P&L Preparation', name_ar: 'إعداد حساب الأرباح والخسائر', deadline_rule: 'Before filing', requires_approval: false },
      { step_number: 2, name_en: 'Income Tax Return', name_ar: 'تقديم الإقرار الضريبي السنوي', deadline_rule: '120 days after FY end', requires_approval: true },
      { step_number: 3, name_en: 'Tax Card Renewal', name_ar: 'تجديد البطاقة الضريبية', deadline_rule: 'Yearly per client', requires_approval: false },
      { step_number: 4, name_en: 'Zero Filing (0 Filing)', name_ar: 'تقديم الإقرار الصفري', deadline_rule: 'Per client schedule', requires_approval: false },
      { step_number: 5, name_en: 'Objection Filing', name_ar: 'تقديم الاعتراض الضريبي', deadline_rule: 'Within 60 days', requires_approval: true }
    ],
    services: [
      'Profit & loss account prep',
      'Tax card renewal',
      'Zero filing (0 filing)',
      'Income tax filing',
      'Tax calculation',
      'Financial statement (for tax)',
      'Tax objection',
      'Tax exemption'
    ],
    kpis: [
      { id: 'tax_returns_on_time', label: 'Tax returns filed on time (%)', label_ar: 'إقرارات ضريبة الدخل بالموعد', type: 'percentage' },
      { id: 'tax_card_renewals_pending', label: 'Tax card renewals pending', label_ar: 'تجديدات بطاقات ضريبية معلقة', type: 'count' },
      { id: 'zero_filings_completed', label: 'Zero filings completed', label_ar: 'إقرارات صفرية منجزة', type: 'count' },
      { id: 'objections_resolved', label: 'Objections resolved (count)', label_ar: 'اعتراضات ضريبية محسومة', type: 'count' }
    ],
    extra_features: [
      'Tax return deadline calendar per client',
      'Tax card expiry tracker & renewal alert',
      'P&L preparation status',
      'Objection case tracker'
    ]
  },

  // 3. Bookkeeping
  bookkeeping: {
    id: 'bookkeeping',
    name: 'Bookkeeping',
    name_ar: 'مسك الدفاتر والمحاسبة',
    head_title: 'Bookkeeping Head',
    head_title_ar: 'رئيس قسم مسك الدفاتر',
    duty: 'Maintain accurate financial records, monthly closures, and bank reconciliations.',
    duty_ar: 'إجراء الإغلاقات الشهرية الدورية والمطابقات البنكية وإعداد القوائم المالية.',
    cycle_type: 'monthly',
    color: '#10B981',
    icon: 'BookOpen',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: ['tax_vat', 'audit', 'income_tax'],
    job_positions: [
      'Bookkeeping Head',
      'Senior Accountant',
      'Bookkeeper',
      'Accounting Consultant',
      'Bookkeeping Trainee'
    ],
    stages: [
      { step_number: 1, name_en: 'Bank statements received', name_ar: 'استلام كشوفات الحسابات البنكية', deadline_rule: 'By 5th', requires_approval: false },
      { step_number: 2, name_en: 'Transactions recorded', name_ar: 'تسجيل القيود والعمليات اليومية', deadline_rule: 'By 10th', requires_approval: false },
      { step_number: 3, name_en: 'Reconciliation done', name_ar: 'إتمام التسوية والمطابقة البنكية', deadline_rule: 'By 15th', requires_approval: false },
      { step_number: 4, name_en: 'Report generated', name_ar: 'استخراج القوائم والتقارير المالية', deadline_rule: 'By 20th', requires_approval: true },
      { step_number: 5, name_en: 'Client delivery', name_ar: 'تسليم التقرير للعميل والاعتماد', deadline_rule: 'By 25th', requires_approval: true }
    ],
    services: [
      'Bookkeeping (monthly)',
      'Financial reports (merge)',
      'Net wealth certificate',
      'Accounting consultancy',
      'Monthly reconciliation',
      'Financial statement prep'
    ],
    kpis: [
      { id: 'monthly_closures_on_time', label: 'Monthly closures on time (%)', label_ar: 'إغلاقات شهرية في الموعد', type: 'percentage' },
      { id: 'reconciliation_accuracy', label: 'Reconciliation accuracy (%)', label_ar: 'دقة المطابقة البنكية', type: 'percentage' },
      { id: 'clients_with_pending_docs', label: 'Clients with pending docs', label_ar: 'عملاء بمستندات ناقصة', type: 'count' },
      { id: 'report_delivery_time', label: 'Report delivery time (days)', label_ar: 'متوسط زمن تسليم التقارير', type: 'days' }
    ],
    extra_features: [
      'Monthly closure checklist per client',
      'Reconciliation status tracker',
      'Reporting accuracy KPI dashboard',
      'Handoff flag to Tax & VAT dept'
    ]
  },

  // 4. Audit
  audit: {
    id: 'audit',
    name: 'Audit',
    name_ar: 'التدقيق والمراجعة',
    head_title: 'Audit Head',
    head_title_ar: 'رئيس قسم التدقيق',
    duty: 'Deliver statutory, internal, forensic, and financial audits following standard engagement stages.',
    duty_ar: 'تقديم خدمات التدقيق القانوني والداخلي وفحص الاحتيال ومراجعة القوائم المالية.',
    cycle_type: 'engagement',
    color: '#F97316',
    icon: 'FileCheck',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: ['bookkeeping', 'income_tax', 'management'],
    job_positions: [
      'Audit Head',
      'Senior Auditor',
      'Auditor',
      'Audit Assistant',
      'Audit Trainee'
    ],
    stages: [
      { step_number: 1, name_en: 'Engagement letter', name_ar: 'توقيع خطاب الارتباط', deadline_rule: 'Start / Day 1', requires_approval: true },
      { step_number: 2, name_en: 'Document collection', name_ar: 'تجميع وثائق التدقيق', deadline_rule: 'Ongoing', requires_approval: false },
      { step_number: 3, name_en: 'Fieldwork', name_ar: 'التدقيق الميداني وفحص العينات', deadline_rule: '2-4 wks', requires_approval: false },
      { step_number: 4, name_en: 'Draft report', name_ar: 'مسودة تقرير التدقيق الداخلي', deadline_rule: 'Internal review', requires_approval: true },
      { step_number: 5, name_en: 'Manager approval', name_ar: 'اعتماد ومصادقة مدير التدقيق', deadline_rule: 'Sign-off', requires_approval: true },
      { step_number: 6, name_en: 'Client delivery', name_ar: 'تسليم التقرير المعتمد للعميل', deadline_rule: 'Done', requires_approval: false }
    ],
    services: [
      'Statutory audit',
      'Internal audit',
      'Management audit',
      'Fraud audit',
      'Financial report audit',
      'KSA audit',
      'Tax audit',
      'Bank audit',
      'Audit consultancy'
    ],
    kpis: [
      { id: 'audits_completed', label: 'Audits completed (monthly)', label_ar: 'عمليات التدقيق المكتملة', type: 'count' },
      { id: 'avg_turnaround_time', label: 'Avg turnaround time (days)', label_ar: 'متوسط مدة الإنجاز (أيام)', type: 'days' },
      { id: 'delayed_engagements', label: 'Delayed engagements (count)', label_ar: 'التعاقدات المتأخرة', type: 'count' },
      { id: 'pending_docs_from_clients', label: 'Pending docs from clients', label_ar: 'مستندات معلقة من العملاء', type: 'count' }
    ],
    extra_features: [
      'Engagement stage tracker per client',
      'Document requests tracker',
      'Internal review workflow',
      'Manager report approval flow'
    ]
  },

  // 5. Consultancy (Business Advisory)
  consultancy: {
    id: 'consultancy',
    name: 'Business Advisory & Consultancy',
    name_ar: 'الاستشارات وتطوير الأعمال',
    head_title: 'Advisory Head',
    head_title_ar: 'رئيس قسم الاستشارات وتطوير الأعمال',
    duty: 'Deliver feasibility studies, business plans, financial modelling, and growth consultancy.',
    duty_ar: 'تقديم دراسات الجدوى وخطط العمل والنمذجة المالية واستشارات النمو.',
    cycle_type: 'project',
    color: '#F59E0B',
    icon: 'Lightbulb',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: ['income_tax', 'bookkeeping', 'management'],
    job_positions: [
      'Advisory Head',
      'Senior Business Consultant',
      'Financial Analyst',
      'Business Development Officer',
      'Advisory Trainee'
    ],
    stages: [
      { step_number: 1, name_en: 'Client brief & scope', name_ar: 'تحديد النطاق وجلسة الاحتياج', deadline_rule: 'Week 1', requires_approval: false },
      { step_number: 2, name_en: 'Research & data collection', name_ar: 'جمع البيانات وأبحاث السوق', deadline_rule: '1-2 wks', requires_approval: false },
      { step_number: 3, name_en: 'Analysis & modelling', name_ar: 'التحليل المالي وبناء النموذج', deadline_rule: '1-2 wks', requires_approval: false },
      { step_number: 4, name_en: 'Draft report', name_ar: 'إعداد مسودة التقرير الاستشاري', deadline_rule: 'Review', requires_approval: true },
      { step_number: 5, name_en: 'Client presentation', name_ar: 'العرض التقديمي للعميل والتسليم', deadline_rule: 'Delivery', requires_approval: true }
    ],
    services: [
      'Business plan',
      'Project evaluation',
      'Feasibility study',
      'Market survey',
      'Jaheez program',
      'Business consultancy',
      'Financial modelling',
      'Industry research'
    ],
    kpis: [
      { id: 'projects_completed_monthly', label: 'Projects completed (monthly)', label_ar: 'المشاريع الاستشارية المنجزة', type: 'count' },
      { id: 'avg_delivery_time', label: 'Avg delivery time (days)', label_ar: 'متوسط زمن التسليم (أيام)', type: 'days' },
      { id: 'client_satisfaction_score', label: 'Client satisfaction score', label_ar: 'مؤشر رضا العملاء', type: 'score' },
      { id: 'proposal_approval_rate', label: 'Proposal approval rate (%)', label_ar: 'نسبة قبول العروض المقدمة', type: 'percentage' }
    ],
    extra_features: [
      'Project stages tracker per client',
      'Financial model review status',
      'Research tracking',
      'Proposal approval workflow'
    ]
  },

  // 6. Liquidation & Corporate Services
  liquidation: {
    id: 'liquidation',
    name: 'Liquidation & Corporate Services',
    name_ar: 'التصفية وخدمات الشركات',
    head_title: 'Service Head',
    head_title_ar: 'رئيس قسم التصفية وخدمات الشركات',
    duty: 'Handle complete company liquidation, ministerial clearances, and commercial registration cancellation.',
    duty_ar: 'إجراءات تصفية الشركات وموافقات الوزارات وبراءات الذمة وشطب السجلات التجارية.',
    cycle_type: 'case_govt',
    color: '#E11D48',
    icon: 'Building2',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: ['tax_vat', 'income_tax', 'bookkeeping', 'management'],
    job_positions: [
      'Service Head',
      'Liquidation Officer',
      'Legal and Liquidation Specialist',
      'Public Relations Officer (PRO)'
    ],
    stages: [
      { step_number: 1, name_en: 'Client engagement', name_ar: 'فتح ملف التصفية وتعيين المصفي', deadline_rule: 'Day 1', requires_approval: true },
      { step_number: 2, name_en: 'Tax clearance (ZATCA / OTA)', name_ar: 'براءة ذمة الضرائب', deadline_rule: '2-6 wks', requires_approval: true },
      { step_number: 3, name_en: 'GOSI & labour clearance', name_ar: 'براءة ذمة التأمينات ومكتب العمل', deadline_rule: '2-4 wks', requires_approval: true },
      { step_number: 4, name_en: 'Ministry of Commerce', name_ar: 'إجراءات وزارة التجارة', deadline_rule: 'Varies', requires_approval: true },
      { step_number: 5, name_en: 'CR cancellation confirmed', name_ar: 'تأكيد شطب وإلغاء السجل التجاري', deadline_rule: 'Final', requires_approval: true }
    ],
    services: [
      'Business liquidation',
      'CR cancellation',
      'Ministry approvals',
      'Tax clearance certificate',
      'GOSI clearance',
      'CR closure stages',
      'Government procedure tracking'
    ],
    kpis: [
      { id: 'cases_completed_monthly', label: 'Cases completed (monthly)', label_ar: 'قضايا التصفية المنجزة', type: 'count' },
      { id: 'avg_case_duration', label: 'Avg case duration (days)', label_ar: 'متوسط مدة القضية (أيام)', type: 'days' },
      { id: 'pending_govt_approvals', label: 'Pending govt approvals', label_ar: 'موافقات حكومية معلقة', type: 'count' },
      { id: 'blocked_cases_count', label: 'Blocked cases (count)', label_ar: 'قضايا متوقفة أو متعثرة', type: 'count' }
    ],
    extra_features: [
      'Step-by-step govt procedure tracker',
      'Ministry approvals tracker',
      'Tax clearance status per client',
      'Blocked case escalation alerts'
    ]
  },

  // 7. Client Success & Operations Coordination
  client_success: {
    id: 'client_success',
    name: 'Client Success & Coordination',
    name_ar: 'خدمة وتنسيق العملاء',
    head_title: 'Head of Client Success',
    head_title_ar: 'رئيس قسم خدمة وتنسيق العملاء',
    duty: 'Support service teams, coordinate deliverable dispatch, and maintain high client engagement.',
    duty_ar: 'تنسيق طلبات العملاء والتواصل والمتابعات المستمرة.',
    cycle_type: 'custom',
    color: '#8B5CF6',
    icon: 'Users',
    enable_cross_handoff: false,
    allowed_handoff_dept_ids: [],
    job_positions: [
      'Client Relationship Officer',
      'Sales Executive',
      'Customer Support Agent',
      'Operations Driver'
    ],
    services: [
      'Client support and coordination'
    ],
    kpis: [
      { id: 'client_satisfaction_score', label: 'Client satisfaction score', label_ar: 'مؤشر رضا العملاء', type: 'score' },
      { id: 'tickets_resolved', label: 'Tickets resolved', label_ar: 'التذاكر المنجزة', type: 'count' }
    ],
    extra_features: [
      'Client feedback tracker',
      'Follow-up reminders',
      'Client health dashboard'
    ]
  },

  // 8. Executive Management
  management: {
    id: 'management',
    name: 'Executive Management',
    name_ar: 'الإدارة التنفيذية',
    head_title: 'CEO / General Manager',
    head_title_ar: 'المدير التنفيذي / المدير العام',
    duty: 'Provide executive leadership, strategic oversight, and overall governance across all service lines.',
    duty_ar: 'القيادة التنفيذية والإشراف الاستراتيجي والاعتمادات النهائية.',
    cycle_type: 'custom',
    color: '#A11212',
    icon: 'ShieldCheck',
    enable_cross_handoff: true,
    allowed_handoff_dept_ids: ['tax_vat', 'audit', 'bookkeeping', 'income_tax', 'consultancy', 'liquidation'],
    job_positions: [
      'Chief Executive Officer (CEO)',
      'General Manager',
      'Operations & Executive Manager'
    ],
    services: [
      'Strategic Oversight'
    ],
    kpis: [
      { id: 'total_revenue', label: 'Total Revenue', label_ar: 'إجمالي الإيرادات', type: 'count' },
      { id: 'overall_growth', label: 'Overall Growth', label_ar: 'نسبة النمو الإجمالية', type: 'percentage' }
    ],
    extra_features: [
      'Executive dashboard',
      'Strategic reports',
      'Approvals center'
    ]
  }
};

export const getDepartmentById = (id: string): DepartmentConfig | undefined => {
  if (!id) return undefined;
  // Direct match
  if (DEPARTMENTS[id]) return DEPARTMENTS[id];
  // Normalized match (handling legacy IDs like 'business_advisory')
  if (id === 'business_advisory') return DEPARTMENTS.consultancy;
  if (id === 'internal_support') return DEPARTMENTS.client_success;
  return Object.values(DEPARTMENTS).find(d => d.id.toLowerCase() === id.toLowerCase());
};

export const getAllDepartments = (): DepartmentConfig[] => {
  return Object.values(DEPARTMENTS);
};

export const getJobPositionsByDepartment = (deptId: string): string[] => {
  const dept = getDepartmentById(deptId);
  return dept?.job_positions || ['Staff Member', 'Associate', 'Trainee'];
};

export const getDepartmentStages = (deptId: string): DepartmentStage[] => {
  const dept = getDepartmentById(deptId);
  return dept?.stages || [];
};

export const getDepartmentDuty = (deptId: string, isAr = false): string => {
  const dept = getDepartmentById(deptId);
  if (!dept) return '';
  return isAr ? (dept.duty_ar || dept.duty) : dept.duty;
};

export const isCrossHandoffAllowed = (sourceDeptId: string, targetDeptId: string): boolean => {
  const source = getDepartmentById(sourceDeptId);
  if (!source || !source.enable_cross_handoff) return false;
  if (!source.allowed_handoff_dept_ids) return false;
  return source.allowed_handoff_dept_ids.includes(targetDeptId);
};
