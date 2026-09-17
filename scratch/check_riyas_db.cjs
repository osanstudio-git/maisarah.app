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

async function check() {
  const { data: prof, error: pErr } = await supabase.from('profiles').select('*').ilike('email', '%riyas%');
  console.log('Profiles:', prof, pErr);

  const { data: emp, error: eErr } = await supabase.from('hr_employees').select('*').ilike('email', '%riyas%');
  console.log('HR Employees:', emp, eErr);

  const { data: recruits, error: rErr } = await supabase.from('hr_recruits').select('*').ilike('email', '%riyas%');
  console.log('HR Recruits:', recruits, rErr);
}

check();
