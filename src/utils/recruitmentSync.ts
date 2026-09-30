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
  company_phone?: string;
  civil_id?: string;
  passport_no?: string;
  residency_no?: string;
  nationality?: string;
  dob?: string;
  gender?: string;
  marital_status?: string;
  supervisor?: string;
  basic_salary?: number;
  accommodation_status?: string;
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

export function saveLocalRecruits(recruits: RecruitCandidate[], shouldDispatch: boolean = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recruits));
    if (shouldDispatch) {
      window.dispatchEvent(new Event('maisarah_recruits_updated'));
    }
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

function getDeletedBlacklist(): string[] {
  try {
    const raw = localStorage.getItem('maisarah_deleted_employees');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function isRecruitDeleted(id?: string, email?: string, name?: string): boolean {
  const list = getDeletedBlacklist();
  if (list.length === 0) return false;

  const idLower = (id || '').trim().toLowerCase();
  const emailLower = (email || '').trim().toLowerCase();
  const nameLower = (name || '').trim().toLowerCase();

  return list.some(d => {
    const dLower = d.trim().toLowerCase();
    return (idLower && dLower === idLower) ||
           (emailLower && dLower === emailLower) ||
           (nameLower && dLower === nameLower);
  });
}

/**
 * Sync all recruits from Supabase DB (trying direct table read first, then edge function fallback).
 * Falls back to localStorage if the DB is unreachable.
 */
export async function syncRecruitsFromSupabase(): Promise<RecruitCandidate[]> {
  try {
    let rawRecruits: any[] | null = null;

    // 1. Direct table read first (instant, reliable, no cold start)
    try {
      const { data, error } = await supabase
        .from('hr_recruits')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        rawRecruits = data;
      } else if (error) {
        console.warn('Direct hr_recruits select error:', error.message);
      }
    } catch (e) {
      console.warn('Direct hr_recruits select notice:', e);
    }

    // 2. Edge function fallback if direct table failed
    if (rawRecruits === null) {
      try {
        const edgeRes = await invokeEdgeFunctionWithTimeout('manage-auth', {
          action: 'get_recruits'
        }, 3000);
        if (!edgeRes.error && edgeRes.data?.success && Array.isArray(edgeRes.data.data)) {
          rawRecruits = edgeRes.data.data;
        }
      } catch (e) {
        console.warn('Edge function get_recruits notice:', e);
      }
    }

    if (Array.isArray(rawRecruits)) {
      // Unpack dossier metadata directly from Supabase
      const cleanDbData: RecruitCandidate[] = rawRecruits
        .map(item => {
          const dossier = item.onboarding_tasks?.dossier || {};
          return {
            ...item,
            civil_id: item.civil_id || dossier.civil_id || '',
            passport_no: item.passport_no || dossier.passport_no || '',
            residency_no: item.residency_no || dossier.residency_no || '',
            nationality: item.nationality || dossier.nationality || 'Omani',
            dob: item.dob || dossier.dob || '',
            gender: item.gender || dossier.gender || 'Male',
            marital_status: item.marital_status || dossier.marital_status || 'Single',
            supervisor: item.supervisor || dossier.supervisor || '',
            basic_salary: item.basic_salary !== undefined ? item.basic_salary : (dossier.basic_salary || 0),
            accommodation_status: item.accommodation_status || dossier.accommodation_status || '',
            company_phone: item.company_phone || dossier.company_phone || ''
          };
        });

      // Save database state directly to localStorage without dispatching recursive sync events
      saveLocalRecruits(cleanDbData, false);
      return cleanDbData;
    }
  } catch (e) {
    console.warn('Supabase recruits fetch notice, using local storage:', e);
  }
  return getLocalRecruits();
}

function sanitizeRecruitForDb(candidate: any): any {
  // Guaranteed base schema columns of hr_recruits in Supabase
  const baseKeys = [
    'id', 'name', 'email', 'phone', 'role', 'dept',
    'stage', 'score', 'resume_name', 'resume_url',
    'employment_type', 'placement_status', 'created_at'
  ];

  const sanitized: any = {};
  for (const key of baseKeys) {
    if (key in candidate && candidate[key] !== undefined) {
      sanitized[key] = candidate[key];
    }
  }

  // Ensure mandatory NOT NULL columns have valid defaults
  sanitized.id = candidate.id || crypto.randomUUID();
  sanitized.name = candidate.name || 'Unnamed Candidate';
  sanitized.email = candidate.email || '';
  sanitized.phone = candidate.phone || '';
  sanitized.role = candidate.role || 'Pending Assignment';
  sanitized.dept = candidate.dept || 'Pending Department';
  sanitized.stage = candidate.stage || 'offered';
  sanitized.score = typeof candidate.score === 'number' ? candidate.score : 90;
  sanitized.employment_type = candidate.employment_type || 'Experienced';
  sanitized.placement_status = sanitizePlacementStatus(candidate.placement_status) || 'pending_placement';
  sanitized.created_at = candidate.created_at || new Date().toISOString();

  // Preserve all extra dossier fields safely inside the JSONB onboarding_tasks column
  const baseTasks = typeof candidate.onboarding_tasks === 'object' && candidate.onboarding_tasks !== null
    ? { ...candidate.onboarding_tasks }
    : { contract_signed: false, bank_details_submitted: false, documents_uploaded: false, it_assets_ready: false };

  baseTasks.dossier = {
    civil_id: candidate.civil_id || '',
    passport_no: candidate.passport_no || '',
    residency_no: candidate.residency_no || '',
    nationality: candidate.nationality || 'Omani',
    dob: candidate.dob || null,
    gender: candidate.gender || 'Male',
    marital_status: candidate.marital_status || 'Single',
    supervisor: candidate.supervisor || '',
    basic_salary: Number(candidate.basic_salary || 0),
    accommodation_status: candidate.accommodation_status || candidate.accommodationStatus || '',
    company_phone: candidate.company_phone || ''
  };

  sanitized.onboarding_tasks = baseTasks;
  return sanitized;
}

/**
 * Save a recruit to the DB directly (fastest, zero cold start).
 * Edge function fallback is used if direct write fails.
 * Always updates localStorage immediately for instant UI response.
 */
export async function upsertRecruitToDatabase(candidate: RecruitCandidate): Promise<RecruitCandidate> {
  // 1. Always save to localStorage first (instant, cross-page)
  upsertLocalRecruit(candidate);

  const sanitized = sanitizeRecruitForDb(candidate);

  // 2. Direct table upsert FIRST (Fastest, < 100ms)
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
    if (error) {
      console.warn('Direct recruit DB upsert error, falling back to edge function:', error.message);
    }
  } catch (e) {
    console.warn('Direct recruit DB upsert notice:', e);
  }

  // 3. Edge function fallback with 8-second timeout
  try {
    const edgeRes = await invokeEdgeFunctionWithTimeout('manage-auth', {
      action: 'upsert_recruit',
      recruit: sanitized
    }, 8000);
    if (!edgeRes.error && edgeRes.data?.success && edgeRes.data?.data) {
      upsertLocalRecruit(edgeRes.data.data);
      return edgeRes.data.data;
    }
  } catch (edgeE) {
    console.warn('Edge function upsert notice:', edgeE);
  }

  return candidate;
}

export async function invokeEdgeFunctionWithTimeout(
  functionName: string,
  payload: any,
  timeoutMs: number = 8000
): Promise<any> {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Edge function ${functionName} timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const res = await Promise.race([
      supabase.functions.invoke(functionName, { body: payload }),
      timeoutPromise
    ]);
    return res;
  } catch (err) {
    console.warn(`Edge function ${functionName} notice:`, err);
    return { data: null, error: err };
  }
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
      await invokeEdgeFunctionWithTimeout('manage-auth', {
        action: 'delete_recruit', recruit_id: idOrEmail
      }, 8000);
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
  const updatedList = current.map(c => {
    const isMatch = c.id === id || (c.email && updates.email && c.email.toLowerCase() === updates.email.toLowerCase()) || (c.name && updates.name && c.name.toLowerCase() === updates.name.toLowerCase());
    if (isMatch) {
      return { ...c, ...updates };
    }
    return c;
  });
  saveLocalRecruits(updatedList);

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
      await invokeEdgeFunctionWithTimeout('manage-auth', {
        action: 'update_recruit', recruit_id: id, updates: sanitizedUpdates
      }, 8000);
    }
  } catch (e) {
    console.warn('Recruit update notice:', e);
  }
}

