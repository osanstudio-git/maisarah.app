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

async function checkPublic() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log("Profiles count:", profiles?.length, pErr);
  console.log("Profiles:", profiles);

  const { data: employees, error: eErr } = await supabase.from('hr_employees').select('id, full_name, email, role');
  console.log("Employees count:", employees?.length, eErr);
  console.log("Employees:", employees);
}

checkPublic();
