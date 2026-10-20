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

async function run() {
  const { data: p, error: pErr } = await supabase.from('profiles').select('id, email, full_name, role, secondary_roles');
  console.log('Profiles count:', p?.length, p, pErr);

  const { data: h, error: hErr } = await supabase.from('hr_employees').select('id, full_name, email, role, phone, company_phone, nationality, gender, marital_status');
  console.log('HR Employees count:', h?.length, h, hErr);
}

run();
