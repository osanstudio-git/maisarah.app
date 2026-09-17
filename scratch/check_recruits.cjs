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

async function checkRecruits() {
  console.log("Checking all hr_recruits in Supabase...");
  const { data: recruits, error } = await supabase.from('hr_recruits').select('*');
  console.log("Recruits count:", recruits ? recruits.length : 0);
  console.log("Recruits data:", JSON.stringify(recruits, null, 2));
  if (error) console.error("Error fetching hr_recruits:", error);
}

checkRecruits();
