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

async function inspectColumns() {
  const { data, error } = await supabase.from('hr_employees').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('hr_employees columns:', Object.keys(data[0]));
  } else {
    console.log('No data or error in hr_employees:', error);
  }
}

inspectColumns();
