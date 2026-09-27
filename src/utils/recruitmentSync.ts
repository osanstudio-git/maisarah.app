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

/** Sanitize placement_status to only what Postgres check constraint allows */
function sanitizePlacementStatus(status?: string | null): 'pending_placement' | 'placed' | null {
  if (status === 'pending_placement' || status === 'placed') return status;
  return null;
}

/**
 * Sync all recruits from Supabase DB directly (no edge function needed for reads).
 * Falls back to localStorage if the DB is unreachable.
 */
export async function syncRecruitsFromSupabase(): Promise<RecruitCandidate[]> {
  try {
    // Primary: direct table read — fast and no cold-start delay
    const { data, error } = await supabase
      .from('hr_recruits')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      saveLocalRecruits(data);
      return data;
    }

    console.warn('Direct hr_recruits read error:', error?.message);
  } catch (e) {
    console.warn('Supabase recruits fetch notice, using local storage:', e);
  }
  return getLocalRecruits();
}

/**
 * Save a recruit to the DB directly.
 * Always updates localStorage immediately for instant UI response.
 * DB write happens concurrently (fire-and-forget style with logging).
 */
export async function upsertRecruitToDatabase(candidate: RecruitCandidate): Promise<RecruitCandidate> {
  // 1. Always save to localStorage first (instant, cross-page)
  upsertLocalRecruit(candidate);

  const sanitized = {
    ...candidate,
    placement_status: sanitizePlacementStatus(candidate.placement_status),
  };

  // 2. Try direct Supabase upsert (no edge function cold-start)
  try {
    const { data, error } = await supabase
      .from('hr_recruits')
      .upsert(sanitized, { onConflict: 'id' })
      .select()
      .single();

    if (!error && data) {
      upsertLocalRecruit(data);
      return data;
    }

    // If direct upsert fails (e.g. RLS), fall back to edge function
    if (error) {
      console.warn('Direct hr_recruits upsert failed, trying edge function:', error.message);
      try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('manage-auth', {
          body: { action: 'upsert_recruit', recruit: sanitized }
        });
        if (!edgeErr && edgeRes?.success && edgeRes?.data) {
          upsertLocalRecruit(edgeRes.data);
          return edgeRes.data;
        }
      } catch (edgeE) {
        console.warn('Edge function fallback upsert recruit notice:', edgeE);
      }
    }
  } catch (e) {
    console.warn('Recruit DB upsert notice:', e);
  }

  return candidate;
}

/**
 * Delete a recruit from the DB.
 * Always removes from localStorage immediately.
 */
export async function deleteRecruitFromDatabase(idOrEmail: string) {
  deleteLocalRecruit(idOrEmail);
  try {
    // Try direct delete first
    const { error } = await supabase
      .from('hr_recruits')
      .delete()
      .or(`id.eq.${idOrEmail},email.eq.${idOrEmail}`);

    if (error) {
      console.warn('Direct delete failed, trying edge function:', error.message);
      await supabase.functions.invoke('manage-auth', {
        body: { action: 'delete_recruit', recruit_id: idOrEmail }
      });
    }
  } catch (e) {
    console.warn('Recruit delete notice:', e);
  }
}

/**
 * Update a recruit's status fields.
 * Always updates localStorage immediately.
 */
export async function updateRecruitStatus(id: string, updates: Partial<RecruitCandidate>) {
  const current = getLocalRecruits();
  const candidate = current.find(c => c.id === id);
  if (candidate) {
    const updatedCandidate = { ...candidate, ...updates };
    upsertLocalRecruit(updatedCandidate);
  }

  const sanitizedUpdates = { ...updates };
  if ('placement_status' in sanitizedUpdates) {
    sanitizedUpdates.placement_status = sanitizePlacementStatus(sanitizedUpdates.placement_status);
  }

  try {
    // Try direct update first
    const { error } = await supabase
      .from('hr_recruits')
      .update(sanitizedUpdates)
      .eq('id', id);

    if (error) {
      console.warn('Direct update failed, trying edge function:', error.message);
      await supabase.functions.invoke('manage-auth', {
        body: { action: 'update_recruit', recruit_id: id, updates: sanitizedUpdates }
      });
    }
  } catch (e) {
    console.warn('Recruit update notice:', e);
  }
}
