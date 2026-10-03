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

async function runFix() {
  console.log("=== Upserting Ajan (HOD CRM) & Shamsa (Staff CRM) into hr_employees with id conflict ===");

  const ajanHrEmp = {
    id: 'a1a1a1a1-1111-4111-8111-111111111111',
    full_name: 'Ajan',
    email: 'ajan.crm.head@maisarah.om',
    phone: '+968 9111 2222',
    dept: 'Client Success',
    role: 'Head of Department (HOD)',
    basic_salary: 1500,
    joined_date: '2026-10-01',
    immediate_supervisor: 'Executive Management & Board of Directors',
    employee_type: 'Experienced',
    civil_id: '109876111',
    passport_no: 'OM999111',
    nationality: 'Omani'
  };

  const shamsaHrEmp = {
    id: 'b2b2b2b2-2222-4222-8222-222222222222',
    full_name: 'Shamsa',
    email: 'shamsa.crm.staff@maisarah.om',
    phone: '+968 9333 4444',
    dept: 'Client Success',
    role: 'Client Relationship Officer',
    basic_salary: 800,
    joined_date: '2026-10-01',
    immediate_supervisor: 'Ajan (Head of Client Success)',
    employee_type: 'Experienced',
    civil_id: '109876222',
    passport_no: 'OM999222',
    nationality: 'Omani'
  };

  const { data: h1, error: he1 } = await supabase.from('hr_employees').upsert(ajanHrEmp, { onConflict: 'id' }).select();
  console.log("Ajan hr_employees result:", h1 ? h1[0]?.full_name : null, "Error:", he1?.message);

  const { data: h2, error: he2 } = await supabase.from('hr_employees').upsert(shamsaHrEmp, { onConflict: 'id' }).select();
  console.log("Shamsa hr_employees result:", h2 ? h2[0]?.full_name : null, "Error:", he2?.message);

  console.log("\n=== Final Verification of Database Rows ===");
  const { data: hrEmps } = await supabase.from('hr_employees').select('*');
  console.log("\nTotal hr_employees in DB:", hrEmps ? hrEmps.length : 0);
  if (hrEmps) {
    hrEmps.forEach(e => console.log(` - ${e.full_name} (${e.email}) -> Role: ${e.role}, Dept: ${e.dept}, Supervisor: ${e.immediate_supervisor}`));
  }

  const { data: recruits } = await supabase.from('hr_recruits').select('*');
  console.log("\nTotal hr_recruits in DB:", recruits ? recruits.length : 0);
  if (recruits) {
    recruits.forEach(r => console.log(` - [${r.placement_status}] ${r.name} (${r.email}) -> Role: ${r.role}, Dept: ${r.dept}`));
  }
}

runFix();
