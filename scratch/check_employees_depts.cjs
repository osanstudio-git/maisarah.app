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

async function checkProfiles() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, full_name, email, role, department_id, department, is_department_head, secondary_roles');
  console.log('Profiles in DB:', profiles);

  const { data: hrEmps } = await supabase.from('hr_employees').select('id, full_name, email, role, dept, department_id');
  console.log('HR Employees in DB:', hrEmps);
}
checkProfiles();
