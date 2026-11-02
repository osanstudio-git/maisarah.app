import { supabase } from '../lib/supabaseClient';

export interface DSREntry {
  id: string;
  date: string; // YYYY-MM-DD
  employee_name: string;
  employee_id?: string;
  created_by?: string;
  department_id?: string;
  service: string;
  company_name: string;
  client_id?: string;
  cr_number: string;
  amount: number;
  gov_fee: number;
  profit: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
  work_status?: 'Pending' | 'In Progress' | 'Completed';
  payment_terms?: 'Full Upfront' | 'Advance Payment' | 'Milestone (3-Parts)' | 'Quarterly' | 'Post-Work';
  total_agreed_amount?: number;
  paid_amount?: number;
  remaining_balance?: number;
  installment_number?: string;
  payment_date: string;
  payment_method: 'Mobile Payment' | 'POS' | 'Bank transfer' | 'Cash' | '';
  accountant_note: string;
  invoice_issued: boolean;
  invoice_number?: string;
  receipt_number?: string;
  payment_reference?: string;
  verified_by_accountant?: boolean;
  reconciled?: boolean;
  reconciled_at?: string;
  bank_reference?: string;
  bank_name?: string;
  created_at?: string;
}

const STORAGE_KEY = 'maisarah_dsr_entries_v1';
const DELETED_KEY = 'maisarah_dsr_deleted_ids_v1';

export function getDeletedDSRIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function addDeletedDSRId(id: string): void {
  try {
    const set = getDeletedDSRIds();
    set.add(id);
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(DELETED_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Failed to save deleted DSR id:', e);
  }
}

// Known authoritative employee mappings by UUID
const KNOWN_STAFF_MAP: Record<string, string> = {
  '2b71648c-86a0-454a-8c46-ad0a69cf8664': 'Ali Al-Harthy',
  'e8fbb851-713d-473a-83f3-dd1da4aa81b4': 'Afrah Khan',
  'emp_01': 'Ali Al-Harthy',
  'emp_02': 'Khalfan Al-Abri',
  'emp_03': 'Fatma Al-Busaidi',
  'emp_04': 'Zahra Al-Lawati',
  'emp_05': 'Dr. Salim Al-Maskari',
};

// Department default managers
const DEPT_STAFF_FALLBACK: Record<string, string> = {
  audit: 'Ali Al-Harthy',
  bookkeeping: 'Zahra Al-Lawati',
  accounting: 'Zahra Al-Lawati',
  tax: 'Afrah Khan',
  tax_vat: 'Afrah Khan',
  vat: 'Afrah Khan',
  income_tax: 'Khalfan Al-Abri',
  consultancy: 'Dr. Salim Al-Maskari',
  advisory: 'Dr. Salim Al-Maskari',
  liquidation: 'Khalfan Al-Abri',
};

/**
 * Resolves the real staff member name instead of generic 'Staff Member'
 */
export function resolveStaffName(
  rawName: string | undefined | null,
  employeeId: string | undefined | null,
  deptId: string | undefined | null,
  serviceName: string | undefined | null,
  noteText: string | undefined | null,
  profileMap?: Map<string, string>
): string {
  // 1. If explicit valid name exists and is not 'Staff Member'
  if (rawName && rawName.trim() && rawName.trim() !== 'Staff Member' && rawName.trim() !== 'undefined') {
    return rawName.trim();
  }

  // 2. Check noteText for "Staff: [Name]" or "Employee: [Name]" or "Manager: [Name]"
  if (noteText) {
    const staffMatch = noteText.match(/Staff:\s*([^|]+)/i) ||
                       noteText.match(/Employee:\s*([^|]+)/i) ||
                       noteText.match(/Assigned Manager:\s*([^|]+)/i) ||
                       noteText.match(/Manager:\s*([^|]+)/i) ||
                       noteText.match(/by\s+([^|]+)/i);
    if (staffMatch) {
      const found = staffMatch[1].trim();
      if (found && found !== 'Staff Member' && found !== 'Employee') {
        return found;
      }
    }
  }

  // 3. Check profileMap by employeeId
  if (employeeId && profileMap && profileMap.has(employeeId)) {
    const found = profileMap.get(employeeId);
    if (found && found !== 'Staff Member') return found;
  }

  // 4. Check KNOWN_STAFF_MAP
  if (employeeId && KNOWN_STAFF_MAP[employeeId]) {
    return KNOWN_STAFF_MAP[employeeId];
  }

  // 5. Keyword analysis on service name
  const sLower = (serviceName || '').toLowerCase();
  if (sLower.includes('audit') || sLower.includes('assurance')) {
    return 'Ali Al-Harthy';
  }
  if (sLower.includes('vat') || sLower.includes('tax')) {
    return 'Afrah Khan';
  }
  if (sLower.includes('bookkeeping') || sLower.includes('financial statement') || sLower.includes('p&l')) {
    return 'Zahra Al-Lawati';
  }
  if (sLower.includes('feasibility') || sLower.includes('advisory') || sLower.includes('business plan')) {
    return 'Dr. Salim Al-Maskari';
  }
  if (sLower.includes('liquidation') || sLower.includes('cr cancellation')) {
    return 'Khalfan Al-Abri';
  }

  // 6. Check department ID fallback
  const dLower = (deptId || '').toLowerCase().trim();
  if (dLower && DEPT_STAFF_FALLBACK[dLower]) {
    return DEPT_STAFF_FALLBACK[dLower];
  }

  return 'Shafnas C';
}

// Known dummy / test seed identifiers to permanently purge
const DUMMY_SEED_IDS = new Set([
  'dsr-001', 'dsr-002', 'dsr-003', 'dsr-004', 'dsr-005',
  'dsr-006', 'dsr-007', 'dsr-008', 'dsr-009', 'dsr-010',
  'dsr-011', 'dsr-012', 'dsr-013', 'dsr-014', 'dsr-015',
  'dsr-016', 'dsr-017', 'dsr-018', 'dsr-019'
]);

const DUMMY_SEED_COMPANIES = new Set([
  'jabal al hadeed trading',
  'aldawahi',
  'إطلال الخليج الحديثة ش م م',
  'salah faroq ali al madhani',
  'abduarhman al shanfari',
  'quality services and trading llc',
  'al amal al mutamayez trading',
  'barka oasis projects',
  'royal horizon investments',
  'sohar logistics hub spc',
  'al raha advanced healthcare',
  'al majd fast transport llc',
  'summit trading & contracting',
  'jay prakash international trading & cont est spc',
  'geo matics',
  'west point international',
  'salim mohsin and partner',
  'thanveer (osbic)'
]);

export function isDummyDSREntry(entry: any): boolean {
  if (!entry) return true;
  if (typeof entry.id === 'string') {
    if (DUMMY_SEED_IDS.has(entry.id)) return true;
    if (/^dsr-0\d{2}$/.test(entry.id)) return true;
  }
  if (entry.company_name && DUMMY_SEED_COMPANIES.has(String(entry.company_name).trim().toLowerCase())) {
    return true;
  }
  return false;
}

// Initial DSR seed is strictly empty - no hardcoded dummy data
const INITIAL_DSR_SEED: DSREntry[] = [];

/**
 * Get non-dummy DSR entries from local storage and purge any legacy mock seeds
 */
export function getDSREntries(): DSREntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    // Filter out dummy seed records from legacy browser caches
    const cleaned = parsed.filter(e => !isDummyDSREntry(e));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      try {
        window.dispatchEvent(new CustomEvent('maisarah_dsr_updated', { detail: cleaned }));
      } catch {
        // ignore
      }
    }
    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Save entries to local storage and trigger global sync event
 */
export function saveDSREntries(entries: DSREntry[]): void {
  try {
    const validOnly = entries.filter(e => !isDummyDSREntry(e));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validOnly));
    window.dispatchEvent(new CustomEvent('maisarah_dsr_updated', { detail: validOnly }));
  } catch (e) {
    console.error('Failed to save DSR entries:', e);
  }
}

/**
 * Fetch real live DSR entries directly from Supabase and synchronize with local storage
 */
export async function fetchCloudDSREntries(): Promise<DSREntry[]> {
  try {
    const deletedIds = getDeletedDSRIds();

    const [dsrRes, profilesRes] = await Promise.all([
      supabase
        .from('dsr_entries')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .catch(() => ({ data: null }))
    ]);

    const { data, error } = dsrRes;

    if (error) {
      console.warn('Error fetching cloud DSR entries:', error.message);
      return getDSREntries().filter(e => !deletedIds.has(e.id));
    }

    // Build profile lookup map
    const profileMap = new Map<string, string>();
    if (profilesRes && (profilesRes as any).data && Array.isArray((profilesRes as any).data)) {
      for (const p of (profilesRes as any).data) {
        const name = p.full_name || (p.email ? p.email.split('@')[0] : '');
        if (name) profileMap.set(p.id, name);
      }
    }

    if (data && Array.isArray(data)) {
      const local = getDSREntries();
      const localMap = new Map(local.map(e => [e.id, e]));

      const cloudEntries: DSREntry[] = data
        .filter((row: any) => !isDummyDSREntry(row) && !deletedIds.has(row.id))
        .map((row: any) => {
          const matchedLocal = localMap.get(row.id);

          // Parse extra details if stored in accountant_note or local memory
          const noteText = row.accountant_note || '';
          const refText = row.payment_reference || '';

          // Match patterns: "Paid: OMR XX / Total: OMR YY"
          let parsedAmt = matchedLocal?.amount;
          if (parsedAmt === undefined) {
            const amtMatch = noteText.match(/Paid:\s*OMR\s*([\d.]+)/i) || noteText.match(/Total:\s*OMR\s*([\d.]+)/i);
            if (amtMatch) {
              parsedAmt = parseFloat(amtMatch[1]);
            } else {
              parsedAmt = Number(row.profit || 0) + Number(row.gov_fee || 0);
            }
          }

          // Match client: "Client: ABC"
          let parsedCompany = matchedLocal?.company_name || row.company_name;
          if (!parsedCompany) {
            const compMatch = noteText.match(/Client:\s*([^|]+)/i);
            parsedCompany = compMatch ? compMatch[1].trim() : 'Valued Client';
          }

          // Match service: First segment before '|'
          let parsedService = matchedLocal?.service || row.service_name;
          if (!parsedService) {
            const parts = noteText.split('|');
            parsedService = parts[0]?.trim() || 'Professional Service';
          }

          // Resolve real employee name
          const resolvedEmp = resolveStaffName(
            matchedLocal?.employee_name,
            row.employee_id,
            matchedLocal?.department_id || row.department_id,
            parsedService,
            noteText,
            profileMap
          );

          return {
            id: row.id,
            date: matchedLocal?.date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            employee_name: resolvedEmp,
            employee_id: row.employee_id,
            department_id: matchedLocal?.department_id || row.department_id,
            service: parsedService,
            company_name: parsedCompany,
            client_id: row.client_id,
            cr_number: matchedLocal?.cr_number || row.cr_number || '',
            amount: Number(parsedAmt || 0),
            gov_fee: Number(row.gov_fee || 0),
            profit: Number(row.profit !== undefined ? row.profit : (Number(parsedAmt || 0) - Number(row.gov_fee || 0))),
            status: matchedLocal?.status || (Number(parsedAmt || 0) > 0 ? 'Paid' : 'Unpaid'),
            work_status: matchedLocal?.work_status || 'In Progress',
            payment_terms: matchedLocal?.payment_terms || 'Full Upfront',
            total_agreed_amount: Number(matchedLocal?.total_agreed_amount || parsedAmt || 0),
            paid_amount: Number(matchedLocal?.paid_amount || (matchedLocal?.status === 'Paid' ? parsedAmt : 0)),
            remaining_balance: Number(matchedLocal?.remaining_balance || 0),
            installment_number: matchedLocal?.installment_number || '',
            payment_date: matchedLocal?.payment_date || (row.created_at ? row.created_at.split('T')[0] : ''),
            payment_method: matchedLocal?.payment_method || (refText.split('|')[0]?.trim() as any) || '',
            accountant_note: noteText,
            invoice_issued: Boolean(row.invoice_issued),
            invoice_number: matchedLocal?.invoice_number || '',
            receipt_number: matchedLocal?.receipt_number || '',
            payment_reference: refText,
            verified_by_accountant: Boolean(row.verified_by_accountant),
            reconciled: Boolean(matchedLocal?.reconciled),
            bank_reference: matchedLocal?.bank_reference || '',
            bank_name: matchedLocal?.bank_name || '',
            created_at: row.created_at,
          };
        });

      // Merge only genuine unsynced pending local entries (never resurrect deleted or old cloud rows)
      const cloudIds = new Set(cloudEntries.map(e => e.id));
      const nonCloudLocal = local.filter(e =>
        !cloudIds.has(e.id) &&
        !deletedIds.has(e.id) &&
        !isDummyDSREntry(e) &&
        e.id.startsWith('dsr-')
      );
      const merged = [...cloudEntries, ...nonCloudLocal];
      saveDSREntries(merged);
      return merged;
    }

    return getDSREntries().filter(e => !deletedIds.has(e.id));
  } catch (err) {
    console.warn('fetchCloudDSREntries error:', err);
    return getDSREntries();
  }
}

/**
 * Add a new DSR entry locally and sync to cloud
 */
export function addDSREntry(entry: Omit<DSREntry, 'id' | 'profit'> & { id?: string; profit?: number }): DSREntry {
  const current = getDSREntries();
  const amt = Number(entry.amount || 0);
  const gov = Number(entry.gov_fee || 0);
  const profit = Number((amt - gov).toFixed(3));
  const totalAgreed = entry.total_agreed_amount !== undefined ? Number(entry.total_agreed_amount) : amt;
  const paidAmt = entry.paid_amount !== undefined ? Number(entry.paid_amount) : (entry.status === 'Paid' ? amt : 0);
  const remaining = entry.remaining_balance !== undefined ? Number(entry.remaining_balance) : Math.max(0, Number((totalAgreed - paidAmt).toFixed(3)));

  const newEntry: DSREntry = {
    id: entry.id || `dsr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: entry.date || new Date().toISOString().split('T')[0],
    employee_name: entry.employee_name || 'Staff Member',
    employee_id: entry.employee_id,
    created_by: entry.created_by || entry.employee_id,
    department_id: entry.department_id,
    service: entry.service || 'General Service',
    company_name: entry.company_name || 'Valued Client',
    client_id: entry.client_id,
    cr_number: entry.cr_number || '',
    amount: amt,
    gov_fee: gov,
    profit: profit,
    status: entry.status || (remaining > 0 && paidAmt > 0 ? 'Partial' : (paidAmt >= totalAgreed && totalAgreed > 0 ? 'Paid' : 'Unpaid')),
    work_status: entry.work_status || 'In Progress',
    payment_terms: entry.payment_terms || 'Full Upfront',
    total_agreed_amount: totalAgreed,
    paid_amount: paidAmt,
    remaining_balance: remaining,
    installment_number: entry.installment_number || '',
    payment_date: entry.payment_date || '',
    payment_method: entry.payment_method || '',
    accountant_note: entry.accountant_note || '',
    invoice_issued: entry.invoice_issued || false,
    invoice_number: entry.invoice_number,
    receipt_number: entry.receipt_number,
    payment_reference: entry.payment_reference,
    verified_by_accountant: entry.verified_by_accountant || false,
    created_at: new Date().toISOString(),
  };

  if (isDummyDSREntry(newEntry)) {
    return newEntry;
  }

  // Deduplicate if matching unverified unpaid task
  const existingIdx = current.findIndex(e =>
    e.company_name.toLowerCase() === newEntry.company_name.toLowerCase() &&
    e.service.toLowerCase() === newEntry.service.toLowerCase() &&
    e.status === 'Unpaid'
  );

  let updated: DSREntry[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...newEntry };
  } else {
    updated = [newEntry, ...current];
  }

  saveDSREntries(updated);

  // Sync to Supabase in the background
  try {
    syncDSRToCloud(newEntry);
  } catch (err) {
    console.warn('addDSREntry cloud sync caught:', err);
  }

  return newEntry;
}

/**
 * Update an existing DSR entry locally and sync to Supabase
 */
export function updateDSREntry(id: string, patch: Partial<DSREntry>): DSREntry | null {
  const current = getDSREntries();
  const idx = current.findIndex(e => e.id === id);
  if (idx === -1) return null;

  const existing = current[idx];
  const updatedAmount = patch.amount !== undefined ? Number(patch.amount) : existing.amount;
  const updatedGovFee = patch.gov_fee !== undefined ? Number(patch.gov_fee) : existing.gov_fee;
  const updatedProfit = Number((updatedAmount - updatedGovFee).toFixed(3));
  const totalAgreed = patch.total_agreed_amount !== undefined ? Number(patch.total_agreed_amount) : (existing.total_agreed_amount !== undefined ? existing.total_agreed_amount : updatedAmount);
  const paidAmt = patch.paid_amount !== undefined ? Number(patch.paid_amount) : (existing.paid_amount !== undefined ? existing.paid_amount : updatedAmount);
  const remaining = patch.remaining_balance !== undefined ? Number(patch.remaining_balance) : Math.max(0, Number((totalAgreed - paidAmt).toFixed(3)));

  const updatedEntry: DSREntry = {
    ...existing,
    ...patch,
    amount: updatedAmount,
    gov_fee: updatedGovFee,
    profit: updatedProfit,
    total_agreed_amount: totalAgreed,
    paid_amount: paidAmt,
    remaining_balance: remaining,
  };

  const next = [...current];
  next[idx] = updatedEntry;
  saveDSREntries(next);

  // If this entry exists in Supabase (valid UUID), sync the update
  if (id && !id.startsWith('dsr-')) {
    const cloudUpdate: any = {};
    if (patch.verified_by_accountant !== undefined) cloudUpdate.verified_by_accountant = patch.verified_by_accountant;
    if (patch.invoice_issued !== undefined) cloudUpdate.invoice_issued = patch.invoice_issued;
    if (patch.accountant_note !== undefined) cloudUpdate.accountant_note = patch.accountant_note;
    if (patch.gov_fee !== undefined) cloudUpdate.gov_fee = patch.gov_fee;
    if (patch.payment_reference !== undefined) cloudUpdate.payment_reference = patch.payment_reference;
    cloudUpdate.profit = updatedProfit;

    supabase
      .from('dsr_entries')
      .update(cloudUpdate)
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('Supabase DSR update notice:', error.message);
      });
  }

  return updatedEntry;
}

/**
 * Auto-create a DSR entry when a task or service is assigned
 */
export function autoCreateDSREntryFromTask(params: {
  serviceTitle: string;
  companyName: string;
  crNumber?: string;
  clientId?: string;
  employeeName: string;
  employeeId?: string;
  departmentId?: string;
  amount?: number;
  govFee?: number;
  date?: string;
  paymentMethod?: DSREntry['payment_method'];
}): DSREntry {
  const dateStr = params.date || new Date().toISOString().split('T')[0];
  const amt = Number(params.amount || 0);
  const gov = Number(params.govFee || 0);

  const resolvedStaff = resolveStaffName(
    params.employeeName,
    params.employeeId,
    params.departmentId,
    params.serviceTitle,
    'Auto-created from task assignment'
  );

  const entry = addDSREntry({
    date: dateStr,
    employee_name: resolvedStaff,
    employee_id: params.employeeId,
    department_id: params.departmentId,
    service: params.serviceTitle || 'Professional Accounting Service',
    company_name: params.companyName || 'Valued Corporate Client',
    client_id: params.clientId,
    cr_number: params.crNumber || '',
    amount: amt,
    gov_fee: gov,
    profit: amt - gov,
    status: amt > 0 ? 'Paid' : 'Unpaid',
    work_status: 'In Progress',
    payment_terms: 'Full Upfront',
    total_agreed_amount: amt,
    paid_amount: amt,
    remaining_balance: 0,
    payment_date: amt > 0 ? dateStr : '',
    payment_method: params.paymentMethod || '',
    accountant_note: 'Auto-created from task assignment',
    invoice_issued: false,
    verified_by_accountant: false
  });

  return entry;
}

/**
 * Synchronize a DSR entry and optional invoice directly with Supabase
 */
export async function syncDSRToCloud(entry: DSREntry, clientId?: string): Promise<{ dsrId?: string; invoiceId?: string }> {
  try {
    if (isDummyDSREntry(entry)) {
      return {};
    }

    const paymentRef = entry.payment_reference || [
      entry.payment_method,
      entry.payment_terms ? `Terms: ${entry.payment_terms}` : '',
      entry.installment_number ? `Inst: ${entry.installment_number}` : '',
      entry.remaining_balance ? `Bal: OMR ${entry.remaining_balance}` : ''
    ].filter(Boolean).join(' | ');

    const staffName = resolveStaffName(
      entry.employee_name,
      entry.employee_id,
      entry.department_id,
      entry.service,
      entry.accountant_note
    );

    const noteDetails = [
      entry.service,
      entry.company_name ? `Client: ${entry.company_name}` : '',
      `Staff: ${staffName}`,
      `Work: ${entry.work_status || 'In Progress'}`,
      `Paid: OMR ${entry.paid_amount || entry.amount} / Total: OMR ${entry.total_agreed_amount || entry.amount}`,
      entry.accountant_note ? `Note: ${entry.accountant_note}` : ''
    ].filter(Boolean).join(' | ');

    const targetClientId = clientId || entry.client_id;

    const payload: any = {
      gov_fee: Number(entry.gov_fee || 0),
      profit: Number(entry.profit !== undefined ? entry.profit : (Number(entry.amount || 0) - Number(entry.gov_fee || 0))),
      verified_by_accountant: Boolean(entry.verified_by_accountant),
      invoice_issued: Boolean(entry.invoice_issued),
      payment_reference: paymentRef || null,
      accountant_note: noteDetails
    };

    if (targetClientId) payload.client_id = targetClientId;
    if (entry.employee_id) payload.employee_id = entry.employee_id;

    const { data: dsrData, error: dsrErr } = await supabase
      .from('dsr_entries')
      .insert([payload])
      .select('id')
      .single();

    if (dsrErr) {
      console.warn('DSR cloud sync message:', dsrErr.message);
    }

    let createdInvoiceId: string | undefined;

    // If invoice is issued or paid, sync to invoices table
    if ((entry.invoice_issued || entry.status === 'Paid' || entry.status === 'Partial') && entry.amount > 0 && targetClientId) {
      const invNumber = entry.invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const grossContract = entry.total_agreed_amount || entry.amount;
      const taxAmt = Number((grossContract * 0.05).toFixed(3));
      const totalAmt = Number((grossContract + taxAmt).toFixed(3));
      const paidSoFar = entry.paid_amount !== undefined ? entry.paid_amount : (entry.status === 'Paid' ? entry.amount : 0);

      const invStatus = (entry.remaining_balance && entry.remaining_balance > 0) || entry.status === 'Partial'
        ? 'partial'
        : (entry.status === 'Paid' ? 'paid' : 'unpaid');

      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invNumber,
          client_id: targetClientId,
          amount: grossContract,
          amount_paid: paidSoFar,
          tax_amount: taxAmt,
          total_amount: totalAmt,
          status: invStatus,
          issued_date: entry.date || new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          invoice_type: 'tax_invoice',
          billing_cycle: entry.payment_terms || 'one_time',
          notes: noteDetails
        }])
        .select('id')
        .single();

      if (!invErr && invData) {
        createdInvoiceId = invData.id;
      }
    }

    return { dsrId: dsrData?.id, invoiceId: createdInvoiceId };
  } catch (e) {
    console.warn('syncDSRToCloud encountered error:', e);
    return {};
  }
}

/**
 * Delete a DSR entry locally and remove from Supabase
 */
export async function deleteDSREntry(id: string): Promise<boolean> {
  if (!id) return false;

  // 1. Immediately remove from local memory & storage
  const current = getDSREntries();
  const next = current.filter(e => e.id !== id);
  saveDSREntries(next);

  // 2. Mark this ID as deleted so it can NEVER be resurrected by sync
  addDeletedDSRId(id);

  // 3. Delete from Supabase
  try {
    const { error } = await supabase
      .from('dsr_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase DSR delete notice:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('deleteDSREntry error:', e);
    return false;
  }
}
