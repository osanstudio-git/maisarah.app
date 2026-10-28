import { DEPARTMENT_CONFIGS, getAllDepartments } from '../config/departments';
import { getDSREntries } from './dsrSync';

export interface ScopedDepartmentInfo {
  id: string;
  name: string;
  name_ar: string;
  cycle_type: string;
  color: string;
  icon: string;
  services: string[];
}

/**
 * Normalizes any department ID string to one of the 6 canonical department IDs
 */
export function normalizeDepartmentId(rawDept?: string | null): string {
  if (!rawDept) return 'bookkeeping';
  const clean = rawDept.toLowerCase().trim();

  // Bookkeeping / Accounting
  if (clean === 'accounting' || clean === 'bookkeeping' || clean === 'accounts' || clean === 'finance') {
    return 'bookkeeping';
  }
  // Tax & VAT
  if (clean === 'tax_vat' || clean === 'vat' || clean === 'tax' || clean === 'value_added_tax') {
    return 'tax_vat';
  }
  // Income Tax
  if (clean === 'income_tax' || clean === 'corporate_tax' || clean === 'direct_tax') {
    return 'income_tax';
  }
  // Audit
  if (clean === 'audit' || clean === 'auditing' || clean === 'statutory_audit') {
    return 'audit';
  }
  // Consultancy / Advisory
  if (clean === 'consultancy' || clean === 'advisory' || clean === 'business_advisory' || clean === 'consulting') {
    return 'consultancy';
  }
  // Liquidation / Legal
  if (clean === 'liquidation' || clean === 'legal' || clean === 'closure') {
    return 'liquidation';
  }

  return clean;
}

/**
 * Keywords for matching service titles or descriptions to departments
 */
export const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  bookkeeping: [
    'bookkeep', 'book', 'reconcil', 'financial statement', 'financial report',
    'net wealth', 'ledger', 'accounting', 'trial balance', 'balance sheet',
    'bank statement', 'transaction', 'payroll', 'closure'
  ],
  tax_vat: [
    'vat', 'value added tax', 'tax exemption', 'vat inspection',
    'quarterly', 'penalty reduction', 'vat return', 'tax cert'
  ],
  income_tax: [
    'income tax', 'corporate tax', 'tax card', 'zero filing', '0 filing',
    'profit & loss', 'p&l', 'tax objection', 'tax calculation', 'annual return'
  ],
  audit: [
    'audit', 'statutory', 'internal audit', 'ksa audit', 'fraud audit',
    'bank audit', 'forensic', 'financial statement audit', 'engagement'
  ],
  consultancy: [
    'feasibility', 'business plan', 'financial analysis', 'financial model',
    'market study', 'market survey', 'advisory', 'jaheez', 'consult'
  ],
  liquidation: [
    'liquidation', 'liquidate', 'cr cancel', 'cancellation', 'clearance',
    'ministry approval', 'gosi clearance', 'closure', 'dissolution'
  ],
};

/**
 * Checks if a service title or description belongs to a given department
 */
export function isServiceMatchingDepartment(serviceTitleOrDesc: string, deptId: string): boolean {
  if (!serviceTitleOrDesc) return false;
  const canonical = normalizeDepartmentId(deptId);
  const text = serviceTitleOrDesc.toLowerCase();

  // 1. Direct match with department services in config
  const config = DEPARTMENT_CONFIGS[canonical];
  if (config?.services?.some(s => text.includes(s.toLowerCase()) || s.toLowerCase().includes(text))) {
    return true;
  }

  // 2. Keyword heuristic
  const keywords = DEPARTMENT_KEYWORDS[canonical] || [];
  return keywords.some(kw => text.includes(kw));
}

/**
 * Gets a clean list of services belonging to a department, with fallback from static config
 */
export function getDepartmentServicesList(deptId: string): string[] {
  const canonical = normalizeDepartmentId(deptId);
  const config = DEPARTMENT_CONFIGS[canonical];
  return config?.services || [
    'General Operational Service'
  ];
}

/**
 * Determines whether a client is relevant to the given employee and department
 */
export function isClientRelevantToDepartment(
  client: { id: string; assigned_employee_id?: string | null; company_name?: string },
  userId: string | undefined,
  deptId: string,
  clientServicesMap?: Map<string, Array<{ title: string; employee_id?: string | null; department_id?: string | null }>>,
  clientDsrSet?: Set<string>
): boolean {
  const canonical = normalizeDepartmentId(deptId);

  // 1. Assigned directly to this employee
  if (userId && client.assigned_employee_id && client.assigned_employee_id === userId) {
    return true;
  }

  // 2. Client has DSR records associated with this department or logged by this employee
  if (clientDsrSet && clientDsrSet.has(client.id)) {
    return true;
  }

  // 3. Client has active or past services registered in this department
  if (clientServicesMap && clientServicesMap.has(client.id)) {
    const services = clientServicesMap.get(client.id) || [];
    for (const svc of services) {
      if (svc.employee_id && userId && svc.employee_id === userId) return true;
      if (svc.department_id && normalizeDepartmentId(svc.department_id) === canonical) return true;
      if (isServiceMatchingDepartment(svc.title, canonical)) return true;
    }
  }

  return false;
}

/**
 * Returns a set of client IDs that have DSR entries in the given department or by the given employee
 */
export function getDepartmentClientIdsFromDSR(userId: string | undefined, deptId: string): Set<string> {
  const canonical = normalizeDepartmentId(deptId);
  const entries = getDSREntries();
  const clientIds = new Set<string>();

  for (const entry of entries) {
    let belongs = false;
    if (userId && entry.created_by === userId) {
      belongs = true;
    } else if (entry.department_id && normalizeDepartmentId(entry.department_id) === canonical) {
      belongs = true;
    } else if (entry.service && isServiceMatchingDepartment(entry.service, canonical)) {
      belongs = true;
    }

    if (belongs) {
      if (entry.client_id) clientIds.add(entry.client_id);
    }
  }

  return clientIds;
}
