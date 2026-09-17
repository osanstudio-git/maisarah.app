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

async function inspectHREmployees() {
  const id = '11111111-2222-3333-4444-555555555555';
  const payload = {
    id: id,
    full_name: 'hamid',
    email: 'hamid@test.com',
    role: 'Audit Associate',
    dept: 'Audit'
  };

  console.log("Testing upsert without status...");
  const { data, error } = await supabase.from('hr_employees').upsert(payload, { onConflict: 'id' }).select();
  console.log("hr_employees result:", data, error);
}

inspectHREmployees();
