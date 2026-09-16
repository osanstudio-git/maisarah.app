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

async function checkAll() {
  console.log("Checking all profiles...");
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log("Profiles count:", profiles ? profiles.length : 0, profiles);

  console.log("Checking all hr_employees...");
  const { data: employees } = await supabase.from('hr_employees').select('*');
  console.log("Employees count:", employees ? employees.length : 0, employees);

  console.log("Checking all hr_recruits...");
  const { data: recruits } = await supabase.from('hr_recruits').select('*');
  console.log("Recruits count:", recruits ? recruits.length : 0, recruits);
}

checkAll();
