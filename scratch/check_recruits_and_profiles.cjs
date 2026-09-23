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

async function checkData() {
  const { data: profs } = await supabase.from('profiles').select('id, full_name, email, role');
  console.log("PROFILES in DB:", profs);

  const { data: recs } = await supabase.from('hr_recruits').select('id, name, email, stage, placement_status');
  console.log("HR_RECRUITS in DB:", recs);
}

checkData();
