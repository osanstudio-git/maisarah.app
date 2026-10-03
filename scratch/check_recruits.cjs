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

async function checkAllRecruits() {
  console.log("Fetching all rows from hr_recruits in Supabase...");
  const { data, error } = await supabase.from('hr_recruits').select('*');
  console.log("Total rows in hr_recruits:", data ? data.length : 0);
  console.log("Error:", error);
  if (data) {
    console.log("Rows:", JSON.stringify(data, null, 2));
  }

  console.log("\nFetching all profiles in Supabase...");
  const { data: profs, error: profErr } = await supabase.from('profiles').select('id, email, full_name, role');
  console.log("Total profiles:", profs ? profs.length : 0);
  if (profs) {
    console.log("Profiles:", JSON.stringify(profs, null, 2));
  }
}

checkAllRecruits();
