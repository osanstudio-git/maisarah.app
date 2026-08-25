export interface DepartmentConfig {
  id: string;
  name: string;
  head_title: string;
  services: string[];
  kpis: {
    id: string;
    label: string;
    type: 'count' | 'percentage' | 'days' | 'score';
  }[];
  extra_features: string[];
}

export const DEPARTMENTS: Record<string, DepartmentConfig> = {
  audit: {
    id: 'audit',
    name: 'Audit',
    head_title: 'Audit Head',
    services: [
      'Internal Audit',
      'KSA Audit',
      'Financial Statements',
      'Tax Audit',
      'Bank Audit'
    ],
    kpis: [
      { id: 'audits_completed', label: 'Audits completed', type: 'count' },
      { id: 'report_turnaround_time', label: 'Report turnaround time', type: 'days' },
      { id: 'delayed_engagements', label: 'Delayed engagements', type: 'count' }
    ],
    extra_features: [
      'Engagement stages tracker',
      'Document requests tracker',
      'Audit review workflow',
      'Report approval flow'
    ]
  },
  tax_vat: {
    id: 'tax_vat',
    name: 'Tax & VAT',
    head_title: 'Tax Head',
    services: [
      'Income Tax filing',
      'VAT filing',
      'Tax Certificate',
      'Renew Tax Certificate',
      'Objection',
      'Exemption',
      'VAT Cancelation'
    ],
    kpis: [
      { id: 'filings_completed', label: 'Filings completed', type: 'count' },
      { id: 'on_time_submission_rate', label: 'On-time submission rate', type: 'percentage' },
      { id: 'pending_documents', label: 'Pending documents', type: 'count' },
      { id: 'penalties_avoided', label: 'Penalties avoided', type: 'count' }
    ],
    extra_features: [
      'VAT calendar',
      'Filing tracker',
      'Tax authority notices log',
      'Penalty alerts'
    ]
  },
  bookkeeping: {
    id: 'bookkeeping',
    name: 'Bookkeeping',
    head_title: 'Bookkeeping Head',
    services: [
      'Bookkeeping'
    ],
    kpis: [
      { id: 'monthly_closures_completed', label: 'Monthly closures completed', type: 'count' },
      { id: 'reconciliation_completion_rate', label: 'Reconciliation completion rate', type: 'percentage' },
      { id: 'reporting_accuracy_rate', label: 'Reporting accuracy rate', type: 'percentage' }
    ],
    extra_features: [
      'Monthly closure checklist per client',
      'Reconciliation status per client'
    ]
  },
  business_advisory: {
    id: 'business_advisory',
    name: 'Business Advisory and Development',
    head_title: 'Business Advisory',
    services: [
      'Consultancy',
      'Feasibility',
      'Liquidation',
      'Corporate Services',
      'Business plan',
      'Project budgeting',
      'Bank feasibility study',
      'CR cancelation'
    ],
    kpis: [
      { id: 'projects_completed', label: 'Projects completed', type: 'count' },
      { id: 'client_satisfaction_score', label: 'Client satisfaction score', type: 'score' },
      { id: 'report_delivery_time', label: 'Report delivery time', type: 'days' }
    ],
    extra_features: [
      'Project stages tracker',
      'Financial model review status',
      'Research tracking',
      'Proposal approvals workflow',
      'Government procedure tracking',
      'Ministry approvals tracker'
    ]
  },
  client_success: {
    id: 'client_success',
    name: 'Client Success and Operations Coordination',
    head_title: 'Head of Client Success',
    services: [
      'Client support and coordination'
    ],
    kpis: [
      { id: 'client_satisfaction_score', label: 'Client satisfaction score', type: 'score' },
      { id: 'tickets_resolved', label: 'Tickets resolved', type: 'count' }
    ],
    extra_features: [
      'Client feedback tracker',
      'Follow-up reminders',
      'Client health dashboard'
    ]
  },
  innovation_dev: {
    id: 'innovation_dev',
    name: 'Innovation and Development',
    head_title: 'Head of Business Development and Innovation',
    services: [
      'Digital Marketing',
      'Technology Projects'
    ],
    kpis: [
      { id: 'new_leads', label: 'New leads', type: 'count' },
      { id: 'conversion_rate', label: 'Conversion rate', type: 'percentage' }
    ],
    extra_features: [
      'Lead pipeline view',
      'Campaign performance'
    ]
  },
  internal_support: {
    id: 'internal_support',
    name: 'Internal Support & Administration',
    head_title: 'Administration Manager',
    services: [
      'HR Management',
      'Internal Accounting',
      'Facility Maintenance'
    ],
    kpis: [
      { id: 'employee_retention', label: 'Employee retention', type: 'percentage' },
      { id: 'compliance_rate', label: 'Compliance rate', type: 'percentage' }
    ],
    extra_features: [
      'Leave requests dashboard',
      'Attendance tracking',
      'Disciplinary records'
    ]
  },
  management: {
    id: 'management',
    name: 'Management',
    head_title: 'CEO / GM',
    services: [
      'Strategic Oversight'
    ],
    kpis: [
      { id: 'total_revenue', label: 'Total Revenue', type: 'count' },
      { id: 'overall_growth', label: 'Overall Growth', type: 'percentage' }
    ],
    extra_features: [
      'Executive dashboard',
      'Strategic reports',
      'Approvals center'
    ]
  }
};

export const getDepartmentById = (id: string): DepartmentConfig | undefined => {
  return DEPARTMENTS[id];
};

export const getAllDepartments = (): DepartmentConfig[] => {
  return Object.values(DEPARTMENTS);
};
