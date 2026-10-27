// ---------------------------------------------------------------------------
// Sales CRM Unified Types, Metadata & Business Rules
// ---------------------------------------------------------------------------

export type SalesStage =
  | 'new'
  | 'contacted'
  | 'consultation'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface PaymentEntry {
  id: string;
  date: string;
  amount: number;
}

export interface RecurringJob {
  id: string;
  service: string;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  next_due: string;
  fee: number;
  fee_received: boolean;
  period?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completed_at?: string | null;
  last_rollover_at?: string;
  cycle_count?: number;
  notes?: string;
}

export interface LeadActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
  author?: string;
}

export interface LeadMetadata {
  probability?: number;
  services?: string[];
  owner?: string;
  b2b_partner?: string;
  expected_close?: string;
  next_followup?: string;
  closed_at?: string | null;
  delivery_status?: 'not_started' | 'in_progress' | 'completed';
  expected_completion?: string;
  completed_at?: string | null;
  payment_due_date?: string;
  payments?: PaymentEntry[];
  total_paid?: number;
  pending_payment?: number;
  payment_status?: 'unpaid' | 'partially_paid' | 'fully_paid';
  recurring_jobs?: RecurringJob[];
  activity_log?: LeadActivityLog[];
}

export const STAGE_CONFIG: Record<string, {
  id: SalesStage;
  labelEn: string;
  labelAr: string;
  probability: number;
  color: string;
  border: string;
  bg: string;
  badgeBg: string;
}> = {
  new: {
    id: 'new',
    labelEn: 'New',
    labelAr: 'جديدة',
    probability: 10,
    color: 'text-blue-700',
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    badgeBg: 'bg-blue-100 text-blue-800'
  },
  contacted: {
    id: 'contacted',
    labelEn: 'Contacted',
    labelAr: 'تم التواصل',
    probability: 25,
    color: 'text-sky-700',
    border: 'border-sky-200',
    bg: 'bg-sky-50/50',
    badgeBg: 'bg-sky-100 text-sky-800'
  },
  consultation: {
    id: 'consultation',
    labelEn: 'Consultation',
    labelAr: 'استشارة',
    probability: 35,
    color: 'text-indigo-700',
    border: 'border-indigo-200',
    bg: 'bg-indigo-50/50',
    badgeBg: 'bg-indigo-100 text-indigo-800'
  },
  proposal_sent: {
    id: 'proposal_sent',
    labelEn: 'Proposal Sent',
    labelAr: 'تم تقديم عرض',
    probability: 50,
    color: 'text-amber-700',
    border: 'border-amber-200',
    bg: 'bg-amber-50/50',
    badgeBg: 'bg-amber-100 text-amber-800'
  },
  quoted: {
    id: 'proposal_sent',
    labelEn: 'Proposal Sent',
    labelAr: 'تم تقديم عرض',
    probability: 50,
    color: 'text-amber-700',
    border: 'border-amber-200',
    bg: 'bg-amber-50/50',
    badgeBg: 'bg-amber-100 text-amber-800'
  },
  negotiation: {
    id: 'negotiation',
    labelEn: 'Negotiation',
    labelAr: 'تفاوض',
    probability: 75,
    color: 'text-purple-700',
    border: 'border-purple-200',
    bg: 'bg-purple-50/50',
    badgeBg: 'bg-purple-100 text-purple-800'
  },
  won: {
    id: 'won',
    labelEn: 'Won',
    labelAr: 'صفقة ناجحة',
    probability: 100,
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    badgeBg: 'bg-emerald-100 text-emerald-800'
  },
  accepted: {
    id: 'won',
    labelEn: 'Won',
    labelAr: 'صفقة ناجحة',
    probability: 100,
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    badgeBg: 'bg-emerald-100 text-emerald-800'
  },
  lost: {
    id: 'lost',
    labelEn: 'Lost',
    labelAr: 'ملغاة / مفقودة',
    probability: 0,
    color: 'text-rose-700',
    border: 'border-rose-200',
    bg: 'bg-rose-50/50',
    badgeBg: 'bg-rose-100 text-rose-800'
  },
  rejected: {
    id: 'lost',
    labelEn: 'Lost',
    labelAr: 'ملغاة / مفقودة',
    probability: 0,
    color: 'text-rose-700',
    border: 'border-rose-200',
    bg: 'bg-rose-50/50',
    badgeBg: 'bg-rose-100 text-rose-800'
  }
};

export const PIPELINE_COLUMNS: Array<{
  id: SalesStage;
  labelEn: string;
  labelAr: string;
  probability: number;
  color: string;
  border: string;
  bg: string;
  badgeBg: string;
}> = [
  STAGE_CONFIG.new,
  STAGE_CONFIG.contacted,
  STAGE_CONFIG.consultation,
  STAGE_CONFIG.proposal_sent,
  STAGE_CONFIG.negotiation,
  STAGE_CONFIG.won,
  STAGE_CONFIG.lost
];

export const SPEC_SERVICES = [
  { id: 'Auditing', en: 'Auditing', ar: 'تدقيق الحسابات' },
  { id: 'VAT', en: 'VAT', ar: 'ضريبة القيمة المضافة' },
  { id: 'VAT registration', en: 'VAT registration', ar: 'التسجيل في القيمة المضافة' },
  { id: 'VAT filing', en: 'VAT filing', ar: 'إقرار القيمة المضافة' },
  { id: 'IT', en: 'IT', ar: 'تقنية معلومات وبرمجيات' },
  { id: 'Feasibility study', en: 'Feasibility study', ar: 'دراسة جدوى' },
  { id: 'Liquidation', en: 'Liquidation', ar: 'تصفية وحل شركات' },
  { id: 'Bookkeeping', en: 'Bookkeeping', ar: 'مسك الدفاتر والمحاسبة' },
  { id: 'Financial consultation', en: 'Financial consultation', ar: 'استشارات مالية' },
  { id: 'Tax card renewal', en: 'Tax card renewal', ar: 'تجديد البطاقة الضريبية' },
  { id: 'Other', en: 'Other', ar: 'خدمات أخرى' }
];

export const SPEC_SOURCES = [
  { id: 'Referral', en: 'Referral', ar: 'توصية / ترشيح' },
  { id: 'Existing client', en: 'Existing client', ar: 'عميل حالي' },
  { id: 'Website', en: 'Website', ar: 'الموقع الإلكتروني' },
  { id: 'Social media', en: 'Social media', ar: 'وسائل التواصل' },
  { id: 'Cold call', en: 'Cold call', ar: 'اتصال تسويقي' },
  { id: 'Event', en: 'Event', ar: 'فعالية / معرض' },
  { id: 'Direct', en: 'Direct', ar: 'تواصل مباشر / زيارة' },
  { id: 'Other', en: 'Other', ar: 'أخرى' }
];

export const DEFAULT_B2B_PARTNERS = [
  'None, direct client',
  'ODB - Oman Development Bank (بنك التنمية العماني)',
  'Sanad Services Centers Group (مراكز سند للخدمات)',
  'Riyada - SME Development Authority (هيئة تنمية المؤسسات الصغيرة والمتوسطة)',
  'Partner Law & Corporate Chambers (مكاتب المحاماة والاستشارات القانونية)',
  'Al-Tasheel Business Services Group',
  'Sohar Industrial Holding Cluster',
  'Duqm Business & Startup Incubator'
];

export const normalizeStage = (stage?: string): SalesStage => {
  if (!stage) return 'new';
  const lower = stage.toLowerCase().trim();
  if (lower === 'quoted' || lower === 'proposal_sent') return 'proposal_sent';
  if (lower === 'accepted' || lower === 'won') return 'won';
  if (lower === 'rejected' || lower === 'lost') return 'lost';
  if (lower === 'contacted') return 'contacted';
  if (lower === 'consultation') return 'consultation';
  if (lower === 'negotiation') return 'negotiation';
  return 'new';
};

// ---------------------------------------------------------------------------
// Metadata Encoding & Decoding in crm_leads.notes
// ---------------------------------------------------------------------------
const META_PREFIX = '<!--CRM_META:';
const META_SUFFIX = '-->';

export function parseLeadNotes(rawNotes?: string | null): { userNotes: string; meta: LeadMetadata } {
  if (!rawNotes) return { userNotes: '', meta: {} };
  const startIdx = rawNotes.indexOf(META_PREFIX);
  const endIdx = rawNotes.indexOf(META_SUFFIX, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const userNotes = (rawNotes.slice(0, startIdx) + rawNotes.slice(endIdx + META_SUFFIX.length)).trim();
    try {
      const jsonStr = rawNotes.slice(startIdx + META_PREFIX.length, endIdx);
      const meta = JSON.parse(jsonStr) as LeadMetadata;
      return { userNotes, meta };
    } catch {
      return { userNotes: rawNotes, meta: {} };
    }
  }
  return { userNotes: rawNotes, meta: {} };
}

export function encodeLeadNotes(userNotes: string, meta: LeadMetadata): string {
  const cleanNotes = (userNotes || '').trim();
  const metaString = `${META_PREFIX}${JSON.stringify(meta)}${META_SUFFIX}`;
  return cleanNotes ? `${cleanNotes}\n${metaString}` : metaString;
}

export function calculatePayments(
  totalValue: number,
  payments: PaymentEntry[] = []
): { totalPaid: number; pendingPayment: number; paymentStatus: 'unpaid' | 'partially_paid' | 'fully_paid' } {
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingPayment = Math.max(0, (totalValue || 0) - totalPaid);
  let paymentStatus: 'unpaid' | 'partially_paid' | 'fully_paid' = 'unpaid';
  if (totalPaid >= totalValue && totalValue > 0) {
    paymentStatus = 'fully_paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partially_paid';
  }
  return { totalPaid, pendingPayment, paymentStatus };
}

export function isFollowUpOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

export function advanceRecurringPeriod(
  currentDue: string,
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
): { nextDue: string; nextPeriod: string } {
  const baseDate = currentDue ? new Date(currentDue) : new Date();
  const nextDate = new Date(baseDate);

  let nextPeriod = '';
  if (frequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    nextPeriod = `${y}-${m}`;
  } else if (frequency === 'quarterly') {
    nextDate.setMonth(nextDate.getMonth() + 3);
    const quarter = Math.floor(nextDate.getMonth() / 3) + 1;
    nextPeriod = `Q${quarter} ${nextDate.getFullYear()}`;
  } else if (frequency === 'half_yearly') {
    nextDate.setMonth(nextDate.getMonth() + 6);
    const half = nextDate.getMonth() < 6 ? 'H1' : 'H2';
    nextPeriod = `${half} ${nextDate.getFullYear()}`;
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    nextPeriod = `FY ${nextDate.getFullYear()}`;
  }

  const nextDue = nextDate.toISOString().split('T')[0];
  return { nextDue, nextPeriod };
}

export function calculateMRR(amount: number, frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'): number {
  if (!amount || amount <= 0) return 0;
  switch (frequency) {
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'half_yearly':
      return amount / 6;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

