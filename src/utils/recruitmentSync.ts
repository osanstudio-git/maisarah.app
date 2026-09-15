import { supabase } from '../lib/supabaseClient';

export interface RecruitCandidate {
  id: string;
  name: string;
  role: string;
  dept: string;
  stage: 'cv_received' | 'shortlisted' | 'interview_scheduled' | 'interview_done' | 'offered' | 'on_hold' | 'rejected';
  score: number;
  email: string;
  phone: string;
  resume_name?: string;
  resume_url?: string;
  employment_type?: 'Experienced' | 'Trainee' | 'Worker';
  placement_status?: 'pending_placement' | 'placed' | 'none';
  onboarding_tasks?: {
    contract_signed: boolean;
    bank_details_submitted: boolean;
    documents_uploaded: boolean;
    it_assets_ready: boolean;
  };
  created_at?: string;
}

const STORAGE_KEY = 'maisarah_hr_recruits_v1';

export const DEFAULT_OFFERED_RECRUITS: RecruitCandidate[] = [
  {
    id: 'rec-001',
    name: 'Riyas',
    role: 'Accountant',
    dept: 'Tax & VAT',
    stage: 'offered',
    score: 80,
    email: 'riyas.maisarah@gmail.com',
    phone: '+968 9800 1234',
    employment_type: 'Experienced',
    placement_status: 'pending_placement',
    onboarding_tasks: {
      contract_signed: true,
      bank_details_submitted: true,
      documents_uploaded: true,
      it_assets_ready: true
    },
    created_at: new Date().toISOString()
  }
];

export function getLocalRecruits(): RecruitCandidate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to read local recruits:', e);
  }
  saveLocalRecruits(DEFAULT_OFFERED_RECRUITS);
  return DEFAULT_OFFERED_RECRUITS;
}

export function saveLocalRecruits(recruits: RecruitCandidate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recruits));
    window.dispatchEvent(new Event('maisarah_recruits_updated'));
  } catch (e) {
    console.warn('Failed to save local recruits:', e);
  }
}

export function upsertLocalRecruit(candidate: RecruitCandidate) {
  const current = getLocalRecruits();
  const index = current.findIndex(c => c.id === candidate.id || (c.email && c.email.toLowerCase() === candidate.email.toLowerCase()));
  
  let updated: RecruitCandidate[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...candidate };
  } else {
    updated = [candidate, ...current];
  }
  
  saveLocalRecruits(updated);
  return updated;
}

export async function syncRecruitsFromSupabase(): Promise<RecruitCandidate[]> {
  try {
    const { data, error } = await supabase
      .from('hr_recruits')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      saveLocalRecruits(data);
      return data;
    }
  } catch (e) {
    console.warn('Supabase recruits fetch error, fallback to local storage:', e);
  }
  return getLocalRecruits();
}

export async function updateRecruitStatus(id: string, updates: Partial<RecruitCandidate>) {
  const current = getLocalRecruits();
  const candidate = current.find(c => c.id === id);
  if (candidate) {
    const updatedCandidate = { ...candidate, ...updates };
    upsertLocalRecruit(updatedCandidate);
  }

  const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  if (isValidUUID) {
    try {
      await supabase.from('hr_recruits').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase recruit update failed (cached locally):', e);
    }
  }
}
