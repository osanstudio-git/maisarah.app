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

async function checkAllData() {
  console.log("--- SUPABASE DB CHECK ---");
  const { data: recruits, error: rErr } = await supabase.from('hr_recruits').select('*');
  console.log("hr_recruits count:", recruits ? recruits.length : 0);
  if (recruits) console.log("hr_recruits rows:", recruits.map(r => ({ id: r.id, name: r.name, email: r.email, status: r.placement_status })));

  const { data: hrEmps } = await supabase.from('hr_employees').select('*');
  console.log("\nhr_employees count:", hrEmps ? hrEmps.length : 0);
  if (hrEmps) console.log("hr_employees rows:", hrEmps.map(e => ({ id: e.id, full_name: e.full_name, email: e.email })));

  const { data: profs } = await supabase.from('profiles').select('*');
  console.log("\nprofiles count:", profs ? profs.length : 0);
  if (profs) console.log("profiles rows:", profs.map(p => ({ id: p.id, full_name: p.full_name, email: p.email, role: p.role })));
}

checkAllData();
