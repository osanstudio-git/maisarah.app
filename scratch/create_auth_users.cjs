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

async function createAuthAccounts() {
  console.log("=== Creating Supabase Auth Users for Ajan & Shamsa via manage-auth edge function ===");

  // 1. Create Ajan Auth Account
  try {
    const resAjan = await supabase.functions.invoke('manage-auth', {
      body: {
        email: 'ajan.crm.head@maisarah.om',
        password: 'Welcome@2026',
        full_name: 'Ajan',
        role: 'department_head',
        department_id: 'client_success',
        secondary_roles: ['employee', 'department_head', 'crm'],
        job_title: 'Head of Department (HOD)',
        dept: 'Client Success'
      }
    });
    console.log("Ajan auth creation response:", resAjan.data, "Error:", resAjan.error);
  } catch (e) {
    console.warn("Ajan auth creation error:", e);
  }

  // 2. Create Shamsa Auth Account
  try {
    const resShamsa = await supabase.functions.invoke('manage-auth', {
      body: {
        email: 'shamsa.crm.staff@maisarah.om',
        password: 'Welcome@2026',
        full_name: 'Shamsa',
        role: 'employee',
        department_id: 'client_success',
        secondary_roles: ['employee', 'crm'],
        job_title: 'Client Relationship Officer',
        dept: 'Client Success'
      }
    });
    console.log("Shamsa auth creation response:", resShamsa.data, "Error:", resShamsa.error);
  } catch (e) {
    console.warn("Shamsa auth creation error:", e);
  }
}

createAuthAccounts();
