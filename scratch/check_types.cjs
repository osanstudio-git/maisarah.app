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

async function checkTypes() {
  const { data: h } = await supabase.from('hr_employees').select('*').limit(1);
  if (h && h[0]) {
    console.log('hr_employees.secondary_roles value & type:', typeof h[0].secondary_roles, h[0].secondary_roles);
  }
}

checkTypes();
