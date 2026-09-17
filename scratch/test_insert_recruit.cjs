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

async function testInsert() {
  const payload = {
    name: 'hamid',
    role: 'Audit Associate',
    dept: 'Audit',
    stage: 'offered',
    score: 85,
    email: 'hamid@test.com',
    phone: '+968 9123 4567',
    employment_type: 'Experienced',
    placement_status: 'pending_placement',
    onboarding_tasks: {
      contract_signed: true,
      bank_details_submitted: true,
      documents_uploaded: true,
      it_assets_ready: true
    }
  };

  console.log("Testing insert into hr_recruits with Anon Key...");
  const { data, error } = await supabase.from('hr_recruits').insert([payload]).select().single();
  console.log("Insert result:", data);
  console.log("Insert error:", error);
}

testInsert();
