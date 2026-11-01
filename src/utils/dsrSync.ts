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

// Seed data from the real user DSR spreadsheet
const INITIAL_DSR_SEED: DSREntry[] = [
  {
    id: 'dsr-001',
    date: '2026-07-30',
    employee_name: 'Yousuf',
    service: 'VAT Q2',
    company_name: 'JABAL AL HADEED TRADING',
    cr_number: 'OM1100244153',
    amount: 30.000,
    gov_fee: 0.000,
    profit: 30.000,
    status: 'Paid',
    payment_date: '2026-08-04',
    payment_method: 'Mobile Payment',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-002',
    date: '2026-07-28',
    employee_name: 'Yousuf',
    service: 'VAT Q2',
    company_name: 'ALDAWAHI',
    cr_number: '',
    amount: 25.000,
    gov_fee: 0.000,
    profit: 25.000,
    status: 'Paid',
    payment_date: '2026-08-05',
    payment_method: 'Mobile Payment',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-003',
    date: '2026-08-06',
    employee_name: 'Yousuf',
    service: 'VAT',
    company_name: 'إطلال الخليج الحديثة ش م م',
    cr_number: '1108366',
    amount: 75.000,
    gov_fee: 0.000,
    profit: 75.000,
    status: 'Paid',
    payment_date: '2026-08-06',
    payment_method: 'POS',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-004',
    date: '2026-08-02',
    employee_name: 'Shahad',
    service: 'Liquidation',
    company_name: 'Salah faroq(salah faroq)',
    cr_number: '1475532',
    amount: 175.000,
    gov_fee: 0.000,
    profit: 175.000,
    status: 'Paid',
    payment_date: '2026-08-02',
    payment_method: 'Mobile Payment',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-005',
    date: '2026-08-02',
    employee_name: 'Shahad',
    service: 'Festability study',
    company_name: 'abduarhman',
    cr_number: '1663800',
    amount: 30.000,
    gov_fee: 0.000,
    profit: 30.000,
    status: 'Paid',
    payment_date: '2026-08-02',
    payment_method: 'Mobile Payment',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-006',
    date: '2026-08-02',
    employee_name: 'Shahad',
    service: 'Festability study',
    company_name: 'suvaid',
    cr_number: '1604222',
    amount: 25.000,
    gov_fee: 0.000,
    profit: 25.000,
    status: 'Unpaid',
    payment_date: '',
    payment_method: '',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-007',
    date: '2026-08-02',
    employee_name: 'Shahad',
    service: 'Festability study',
    company_name: 'suvaid',
    cr_number: '1668010',
    amount: 25.000,
    gov_fee: 0.000,
    profit: 25.000,
    status: 'Unpaid',
    payment_date: '',
    payment_method: '',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-008',
    date: '2026-08-02',
    employee_name: 'Shahad',
    service: 'Festability study',
    company_name: 'suvaid',
    cr_number: '1667952',
    amount: 25.000,
    gov_fee: 0.000,
    profit: 25.000,
    status: 'Unpaid',
    payment_date: '',
    payment_method: '',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-009',
    date: '2026-08-03',
    employee_name: 'Shahad',
    service: 'Minstry of labor',
    company_name: 'sohaila',
    cr_number: '1615163',
    amount: 5.000,
    gov_fee: 0.000,
    profit: 5.000,
    status: 'Paid',
    payment_date: '2026-08-04',
    payment_method: 'Mobile Payment',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-010',
    date: '2026-08-04',
    employee_name: 'Shahad',
    service: 'Festability study',
    company_name: 'shafnaas',
    cr_number: '1666825',
    amount: 30.000,
    gov_fee: 0.000,
    profit: 30.000,
    status: 'Paid',
    payment_date: '2026-08-05',
    payment_method: 'Bank transfer',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-011',
    date: '2026-07-27',
    employee_name: 'Shafnas',
    service: 'VAT FILING 2026 Q2',
    company_name: 'JAY PRAKASH INTERNATIONAL TRADING & CONT EST SPC',
    cr_number: '1527047',
    amount: 10.000,
    gov_fee: 0.000,
    profit: 10.000,
    status: 'Paid',
    payment_date: '2026-08-01',
    payment_method: 'Mobile Payment',
    accountant_note: '',
    invoice_issued: true,
    invoice_number: 'INV-2026-8801',
    receipt_number: 'REC-2026-8801',
  },
  {
    id: 'dsr-012',
    date: '2026-07-26',
    employee_name: 'Shafnas',
    service: 'VAT FILING 2026 Q2',
    company_name: 'GEO MATICS',
    cr_number: '1310264',
    amount: 25.000,
    gov_fee: 0.000,
    profit: 25.000,
    status: 'Paid',
    payment_date: '2026-08-03',
    payment_method: 'Cash',
    accountant_note: '',
    invoice_issued: true,
    invoice_number: 'INV-2026-8802',
    receipt_number: 'REC-2026-8802',
  },
  {
    id: 'dsr-013',
    date: '2026-08-02',
    employee_name: 'Shafnas',
    service: 'VAT FILING 2026 Q2',
    company_name: 'WEST POINT INTERNATIONAL',
    cr_number: '1454687',
    amount: 15.000,
    gov_fee: 0.000,
    profit: 15.000,
    status: 'Paid',
    payment_date: '2026-08-05',
    payment_method: 'POS',
    accountant_note: 'change the invoice amount 20 to 15',
    invoice_issued: true,
    invoice_number: 'INV-2026-8803',
    receipt_number: 'REC-2026-8803',
  },
  {
    id: 'dsr-014',
    date: '2026-08-04',
    employee_name: 'Shafnas',
    service: 'Vat Cancellation',
    company_name: 'SALIM MOHSIN AND PARTNER',
    cr_number: '1355875',
    amount: 25.000,
    gov_fee: 0.000,
    profit: 25.000,
    status: 'Paid',
    payment_date: '2026-08-04',
    payment_method: 'POS',
    accountant_note: '',
    invoice_issued: true,
    invoice_number: 'INV-2026-8804',
    receipt_number: 'REC-2026-8804',
  },
  {
    id: 'dsr-015',
    date: '2026-08-04',
    employee_name: 'Shafnas',
    service: 'VAT FILING 2026 Q2',
    company_name: 'Alpha Union Trading Company LLC',
    cr_number: '1600462',
    amount: 25.000,
    gov_fee: 0.000,
    profit: 25.000,
    status: 'Paid',
    payment_date: '2026-08-04',
    payment_method: 'Bank transfer',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-016',
    date: '2026-07-29',
    employee_name: 'Shafnas',
    service: 'VAT FILING 2026 Q2',
    company_name: 'Quality services and trading',
    cr_number: '1592723',
    amount: 10.000,
    gov_fee: 0.000,
    profit: 10.000,
    status: 'Paid',
    payment_date: '2026-08-04',
    payment_method: 'Bank transfer',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-017',
    date: '2026-07-15',
    employee_name: 'Shafnas',
    service: 'Income tax and Vat Filing',
    company_name: 'Urban Crew Investment',
    cr_number: '1452206',
    amount: 75.000,
    gov_fee: 0.000,
    profit: 75.000,
    status: 'Partial',
    payment_date: '2026-08-06',
    payment_method: 'POS',
    accountant_note: '50 to 150, he paid 75 only, at the end of the month balance',
    invoice_issued: true,
    invoice_number: 'INV-2026-8805',
    receipt_number: 'REC-2026-8805',
  },
  {
    id: 'dsr-018',
    date: '2026-08-03',
    employee_name: 'Azhaar',
    service: 'KSA Audit',
    company_name: 'Osbic(Ayoob)',
    cr_number: '1454255',
    amount: 60.000,
    gov_fee: 4.000,
    profit: 56.000,
    status: 'Paid',
    payment_date: '2026-08-05',
    payment_method: 'Mobile Payment',
    accountant_note: '',
    invoice_issued: false,
  },
  {
    id: 'dsr-019',
    date: '2026-09-10',
    employee_name: 'Shafnas',
    service: 'Tax & VAT',
    company_name: 'Thanveer (OSBIC)',
    cr_number: '1454255',
    amount: 350.000,
    gov_fee: 0.000,
    profit: 350.000,
    status: 'Unpaid',
    payment_date: '',
    payment_method: '',
    accountant_note: 'Accepted from Quote #QT-2026-7418',
    invoice_issued: false,
  }
];

export function getDSREntries(): DSREntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DSR_SEED));
      return INITIAL_DSR_SEED;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DSR_SEED));
      return INITIAL_DSR_SEED;
    }
    return parsed;
  } catch {
    return INITIAL_DSR_SEED;
  }
}

export function saveDSREntries(entries: DSREntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('maisarah_dsr_updated', { detail: entries }));
  } catch (e) {
    console.error('Failed to save DSR entries:', e);
  }
}

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
    employee_name: entry.employee_name || 'Unassigned',
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
    created_at: new Date().toISOString(),
  };

  // Check if duplicate already exists by company & service
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
  return newEntry;
}

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
  return updatedEntry;
}

export function autoCreateDSREntryFromTask(params: {
  serviceTitle: string;
  companyName: string;
  crNumber?: string;
  clientId?: string;
  employeeName: string;
  employeeId?: string;
  amount?: number;
  govFee?: number;
  date?: string;
  paymentMethod?: DSREntry['payment_method'];
}): DSREntry {
  const dateStr = params.date || new Date().toISOString().split('T')[0];
  const amt = Number(params.amount || 0);
  const gov = Number(params.govFee || 0);

  const entry = addDSREntry({
    date: dateStr,
    employee_name: params.employeeName || 'Staff Member',
    employee_id: params.employeeId,
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

  // Async sync to Supabase with real schema columns
  try {
    const cloudPayload: any = {
      gov_fee: gov,
      profit: amt - gov,
      verified_by_accountant: false,
      invoice_issued: false,
      accountant_note: `Auto-created from task: ${params.serviceTitle || ''}`
    };
    if (params.clientId) cloudPayload.client_id = params.clientId;
    if (params.employeeId) cloudPayload.employee_id = params.employeeId;

    supabase
      .from('dsr_entries')
      .insert([cloudPayload])
      .then(({ error }) => {
        if (error) console.warn('Supabase DSR auto-sync notice:', error.message);
      });
  } catch (err) {
    console.warn('Auto DSR cloud sync caught:', err);
  }

  return entry;
}

/**
 * Synchronize a DSR entry and optional invoice directly with Supabase
 */
export async function syncDSRToCloud(entry: DSREntry, clientId?: string): Promise<{ dsrId?: string; invoiceId?: string }> {
  try {
    const paymentRef = entry.payment_reference || [
      entry.payment_method,
      entry.payment_terms ? `Terms: ${entry.payment_terms}` : '',
      entry.installment_number ? `Inst: ${entry.installment_number}` : '',
      entry.remaining_balance ? `Bal: OMR ${entry.remaining_balance}` : ''
    ].filter(Boolean).join(' | ');

    const noteDetails = [
      entry.service,
      entry.company_name ? `Client: ${entry.company_name}` : '',
      `Work: ${entry.work_status || 'In Progress'}`,
      `Paid: OMR ${entry.paid_amount || entry.amount} / Total: OMR ${entry.total_agreed_amount || entry.amount}`,
      entry.accountant_note ? `Note: ${entry.accountant_note}` : ''
    ].filter(Boolean).join(' | ');

    const payload: any = {
      gov_fee: entry.gov_fee || 0,
      profit: entry.profit || (entry.amount - entry.gov_fee),
      verified_by_accountant: Boolean(entry.verified_by_accountant),
      invoice_issued: Boolean(entry.invoice_issued),
      payment_reference: paymentRef || null,
      accountant_note: noteDetails
    };

    const targetClientId = clientId || entry.client_id;
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

export function deleteDSREntry(id: string): void {
  const current = getDSREntries();
  const next = current.filter(e => e.id !== id);
  saveDSREntries(next);
}

