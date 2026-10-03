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

async function testUpsertEmail() {
  const candidate = {
    name: 'hamid',
    email: 'hamid.osanoman@gmail.com',
    phone: '+96899999999',
    role: 'Pending Assignment',
    dept: 'Pending Department',
    stage: 'offered',
    score: 90,
    employment_type: 'Experienced',
    placement_status: 'pending_placement',
    created_at: new Date().toISOString(),
    onboarding_tasks: {
      contract_signed: false,
      bank_details_submitted: false,
      documents_uploaded: false,
      it_assets_ready: false
    }
  };

  console.log("Testing upsert with onConflict email...");
  const { data, error } = await supabase
    .from('hr_recruits')
    .upsert(candidate, { onConflict: 'email' })
    .select()
    .single();

  console.log("Result:", data);
  console.log("Error:", error);
}

testUpsertEmail();
