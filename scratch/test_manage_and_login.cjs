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

async function testManageAndLogin() {
  const email = 'riyas.maisarah@gmail.com';
  const password = 'Welcome@8095';

  const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('manage-auth', {
    body: {
      email,
      password,
      full_name: 'Riyas',
      role: 'accountant',
      department_id: 'bookkeeping',
      secondary_roles: ['department_head', 'employee']
    }
  });
  console.log("Edge function result:", edgeRes, edgeErr);

  const { data: signRes, error: signErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  console.log("Sign in result:", signRes?.session ? "LOGGED IN OK!" : "FAILED", signErr);
  console.log("User metadata:", signRes?.user?.user_metadata);
}

testManageAndLogin();
