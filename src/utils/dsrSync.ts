import { supabase } from '../lib/supabaseClient';

export interface DSREntry {
  id: string;
  date: string; // YYYY-MM-DD
  employee_name: string;
  employee_id?: string;
  service: string;
  company_name: string;
  client_id?: string;
  cr_number: string;
  amount: number;
  gov_fee: number;
  profit: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
  payment_date: string;
  payment_method: 'Mobile Payment' | 'POS' | 'Bank transfer' | 'Cash' | '';
  accountant_note: string;
  invoice_issued: boolean;
  invoice_number?: string;
  receipt_number?: string;
  payment_reference?: string;
  verified_by_accountant?: boolean;
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

  const newEntry: DSREntry = {
    id: entry.id || `dsr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: entry.date || new Date().toISOString().split('T')[0],
    employee_name: entry.employee_name || 'Unassigned',
    employee_id: entry.employee_id,
    service: entry.service || 'General Service',
    company_name: entry.company_name || 'Valued Client',
    client_id: entry.client_id,
    cr_number: entry.cr_number || '',
    amount: amt,
    gov_fee: gov,
    profit: profit,
    status: entry.status || 'Unpaid',
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

  const updatedEntry: DSREntry = {
    ...existing,
    ...patch,
    amount: updatedAmount,
    gov_fee: updatedGovFee,
    profit: updatedProfit,
  };

  const next = [...current];
  next[idx] = updatedEntry;
  saveDSREntries(next);
  return updatedEntry;
}

export function deleteDSREntry(id: string): void {
  const current = getDSREntries();
  const next = current.filter(e => e.id !== id);
  saveDSREntries(next);
}
