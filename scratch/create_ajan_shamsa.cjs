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

async function runWorkflow() {
  console.log("=== STEP 1: Registering Ajan (HOD CRM) & Shamsa (Staff CRM) into hr_recruits ===");

  const ajanRecruit = {
    id: 'a1a1a1a1-1111-4111-8111-111111111111',
    name: 'Ajan',
    email: 'ajan.crm.head@maisarah.om',
    phone: '+968 9111 2222',
    role: 'Head of Client Success (CRM)',
    dept: 'Client Success',
    stage: 'offered',
    score: 95,
    employment_type: 'Experienced',
    placement_status: 'placed',
    supervisor: 'Executive Board',
    created_at: new Date().toISOString(),
    onboarding_tasks: {
      contract_signed: true,
      bank_details_submitted: true,
      documents_uploaded: true,
      it_assets_ready: true,
      dossier: {
        civil_id: '109876111',
        passport_no: 'OM999111',
        nationality: 'Omani',
        basic_salary: 1500
      }
    }
  };

  const shamsaRecruit = {
    id: 'b2b2b2b2-2222-4222-8222-222222222222',
    name: 'Shamsa',
    email: 'shamsa.crm.staff@maisarah.om',
    phone: '+968 9333 4444',
    role: 'Client Relationship Officer',
    dept: 'Client Success',
    stage: 'offered',
    score: 90,
    employment_type: 'Experienced',
    placement_status: 'placed',
    supervisor: 'Ajan (Head of Client Success)',
    created_at: new Date().toISOString(),
    onboarding_tasks: {
      contract_signed: true,
      bank_details_submitted: true,
      documents_uploaded: true,
      it_assets_ready: true,
      dossier: {
        civil_id: '109876222',
        passport_no: 'OM999222',
        nationality: 'Omani',
        basic_salary: 800
      }
    }
  };

  const { data: r1, error: e1 } = await supabase.from('hr_recruits').upsert(ajanRecruit, { onConflict: 'email' }).select();
  console.log("Ajan hr_recruits result:", r1 ? r1[0]?.name : null, "Error:", e1?.message);

  const { data: r2, error: e2 } = await supabase.from('hr_recruits').upsert(shamsaRecruit, { onConflict: 'email' }).select();
  console.log("Shamsa hr_recruits result:", r2 ? r2[0]?.name : null, "Error:", e2?.message);

  console.log("\n=== STEP 2: Upserting Ajan & Shamsa into hr_employees ===");

  const ajanEmployee = {
    id: 'a1a1a1a1-1111-4111-8111-111111111111',
    full_name: 'Ajan',
    email: 'ajan.crm.head@maisarah.om',
    phone: '+968 9111 2222',
    dept: 'Client Success',
    role: 'Head of Client Success (CRM)',
    status: 'active',
    basic_salary: 1500,
    joined_date: '2026-10-01',
    immediate_supervisor: 'Executive Board',
    employee_type: 'Experienced',
    civil_id: '109876111',
    passport_no: 'OM999111',
    nationality: 'Omani'
  };

  const shamsaEmployee = {
    id: 'b2b2b2b2-2222-4222-8222-222222222222',
    full_name: 'Shamsa',
    email: 'shamsa.crm.staff@maisarah.om',
    phone: '+968 9333 4444',
    dept: 'Client Success',
    role: 'Client Relationship Officer',
    status: 'active',
    basic_salary: 800,
    joined_date: '2026-10-01',
    immediate_supervisor: 'Ajan (Head of Client Success)',
    employee_type: 'Experienced',
    civil_id: '109876222',
    passport_no: 'OM999222',
    nationality: 'Omani'
  };

  const { data: emp1, error: empE1 } = await supabase.from('hr_employees').upsert(ajanEmployee, { onConflict: 'email' }).select();
  console.log("Ajan hr_employees result:", emp1 ? emp1[0]?.full_name : null, "Error:", empE1?.message);

  const { data: emp2, error: empE2 } = await supabase.from('hr_employees').upsert(shamsaEmployee, { onConflict: 'email' }).select();
  console.log("Shamsa hr_employees result:", emp2 ? emp2[0]?.full_name : null, "Error:", empE2?.message);

  console.log("\n=== STEP 3: Verifying final database contents ===");
  const { data: allRecruits } = await supabase.from('hr_recruits').select('*');
  console.log("\nTotal hr_recruits in DB:", allRecruits ? allRecruits.length : 0);
  if (allRecruits) {
    allRecruits.forEach(r => console.log(` - [${r.placement_status}] ${r.name} (${r.email}) -> Role: ${r.role}, Dept: ${r.dept}, Supervisor: ${r.supervisor}`));
  }

  const { data: allHrEmps } = await supabase.from('hr_employees').select('*');
  console.log("\nTotal hr_employees in DB:", allHrEmps ? allHrEmps.length : 0);
  if (allHrEmps) {
    allHrEmps.forEach(e => console.log(` - [${e.status}] ${e.full_name} (${e.email}) -> Role: ${e.role}, Dept: ${e.dept}, Supervisor: ${e.immediate_supervisor}`));
  }
}

runWorkflow();
