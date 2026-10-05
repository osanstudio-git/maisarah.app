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

async function checkShamsa() {
  const { data: p } = await supabase.from('profiles').select('*');
  console.log('Profiles in DB:', p?.map(x => ({ id: x.id, name: x.full_name, email: x.email, role: x.role, dept: x.department_id || x.department })));

  const { data: h } = await supabase.from('hr_employees').select('*');
  console.log('HR Employees in DB:', h?.map(x => ({ id: x.id, name: x.full_name, email: x.email, role: x.role, dept: x.dept || x.department_id })));

  const { data: r } = await supabase.from('hr_recruits').select('*');
  console.log('HR Recruits in DB:', r?.map(x => ({ id: x.id, name: x.name, email: x.email, stage: x.stage, placement_status: x.placement_status, dept: x.dept })));
}
checkShamsa();
