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

async function testUpsert() {
  const candidate = {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'test_upsert_user',
    email: 'test_upsert@test.com',
    phone: '12345678',
    role: 'Audit Associate',
    dept: 'Audit',
    stage: 'offered',
    score: 90,
    employment_type: 'Experienced',
    placement_status: 'pending_placement',
    created_at: new Date().toISOString(),
    onboarding_tasks: {
      contract_signed: true,
      dossier: {
        civil_id: '123456',
        nationality: 'Omani'
      }
    }
  };

  console.log("Testing upsert into hr_recruits...");
  const { data, error } = await supabase
    .from('hr_recruits')
    .upsert(candidate, { onConflict: 'id' })
    .select()
    .single();

  console.log("Upsert result:", data);
  console.log("Upsert error:", error);
}

testUpsert();
