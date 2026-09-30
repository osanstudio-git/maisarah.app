const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('./.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function sanitizeRecruitForDb(candidate) {
  const baseKeys = [
    'id', 'name', 'email', 'phone', 'role', 'dept',
    'stage', 'score', 'resume_name', 'resume_url',
    'employment_type', 'placement_status', 'created_at'
  ];

  const sanitized = {};
  for (const key of baseKeys) {
    if (key in candidate && candidate[key] !== undefined) {
      sanitized[key] = candidate[key];
    }
  }

  sanitized.id = candidate.id || crypto.randomUUID();
  sanitized.name = candidate.name || 'Unnamed Candidate';
  sanitized.email = candidate.email || '';
  sanitized.phone = candidate.phone || '';
  sanitized.role = candidate.role || 'Pending Assignment';
  sanitized.dept = candidate.dept || 'Pending Department';
  sanitized.stage = candidate.stage || 'offered';
  sanitized.score = typeof candidate.score === 'number' ? candidate.score : 90;
  sanitized.employment_type = candidate.employment_type || 'Experienced';
  sanitized.placement_status = candidate.placement_status || 'pending_placement';
  sanitized.created_at = candidate.created_at || new Date().toISOString();

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
    accommodation_status: candidate.accommodation_status || '',
    company_phone: candidate.company_phone || ''
  };

  sanitized.onboarding_tasks = baseTasks;
  return sanitized;
}

async function testFlow() {
  const candidate = {
    id: crypto.randomUUID(),
    name: 'Hamid Candidate',
    email: 'hamid.test@maisarah.om',
    phone: '+968 98765432',
    role: 'Pending Assignment',
    dept: 'Pending Department',
    stage: 'offered',
    placement_status: 'pending_placement',
    employment_type: 'Experienced',
    basic_salary: 0,
    created_at: new Date().toISOString()
  };

  console.log("1. Testing sanitized direct upsert to hr_recruits...");
  const sanitized = sanitizeRecruitForDb(candidate);
  const { data, error } = await supabase.from('hr_recruits').upsert(sanitized, { onConflict: 'id' }).select().single();
  console.log("Direct upsert result:", { data, error });

  console.log("2. Testing direct select from hr_recruits...");
  const sel = await supabase.from('hr_recruits').select('*').order('created_at', { ascending: false });
  console.log("Direct select count:", sel.data?.length, "rows:", sel.data);

  console.log("3. Cleaning up test record...");
  await supabase.from('hr_recruits').delete().eq('id', candidate.id);
  console.log("Cleanup done.");
}

testFlow();
