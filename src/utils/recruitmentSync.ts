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
  placement_status?: 'pending_placement' | 'placed' | null;
  onboarding_tasks?: {
    contract_signed: boolean;
    bank_details_submitted: boolean;
    documents_uploaded: boolean;
    it_assets_ready: boolean;
  };
  created_at?: string;
}

const STORAGE_KEY = 'maisarah_hr_recruits_v1';

export const DEFAULT_OFFERED_RECRUITS: RecruitCandidate[] = [];

export function getLocalRecruits(): RecruitCandidate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
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

export function deleteLocalRecruit(idOrEmail: string) {
  try {
    const current = getLocalRecruits();
    const cleanTarget = (idOrEmail || '').trim().toLowerCase();
    const filtered = current.filter(r => 
      r.id !== idOrEmail && 
      r.name?.toLowerCase() !== cleanTarget &&
      r.email?.toLowerCase() !== cleanTarget
    );
    saveLocalRecruits(filtered);
  } catch (e) {
    console.warn('Failed to delete local recruit:', e);
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
    const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('manage-auth', {
      body: { action: 'get_recruits' }
    });

    if (!edgeErr && edgeRes?.success && Array.isArray(edgeRes.data)) {
      saveLocalRecruits(edgeRes.data);
      return edgeRes.data;
    }

    // Direct fallback if edge function unavailable
    const { data, error } = await supabase
      .from('hr_recruits')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      saveLocalRecruits(data);
      return data;
    }
  } catch (e) {
    console.warn('Supabase recruits fetch error, fallback to local storage:', e);
  }
  return getLocalRecruits();
}

export async function upsertRecruitToDatabase(candidate: RecruitCandidate): Promise<RecruitCandidate> {
  upsertLocalRecruit(candidate);
  try {
    const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('manage-auth', {
      body: { action: 'upsert_recruit', recruit: candidate }
    });
    if (!edgeErr && edgeRes?.success && edgeRes?.data) {
      upsertLocalRecruit(edgeRes.data);
      return edgeRes.data;
    }
  } catch (e) {
    console.warn('Edge function upsert recruit notice:', e);
  }
  return candidate;
}

export async function deleteRecruitFromDatabase(idOrEmail: string) {
  deleteLocalRecruit(idOrEmail);
  try {
    await supabase.functions.invoke('manage-auth', {
      body: { action: 'delete_recruit', recruit_id: idOrEmail }
    });
  } catch (e) {
    console.warn('Edge function delete recruit notice:', e);
  }
}

export async function updateRecruitStatus(id: string, updates: Partial<RecruitCandidate>) {
  const current = getLocalRecruits();
  const candidate = current.find(c => c.id === id);
  if (candidate) {
    const updatedCandidate = { ...candidate, ...updates };
    upsertLocalRecruit(updatedCandidate);
  }

  try {
    await supabase.functions.invoke('manage-auth', {
      body: { action: 'update_recruit', recruit_id: id, updates }
    });
  } catch (e) {
    console.warn('Edge function update recruit notice:', e);
  }
}
