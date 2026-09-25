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

async function syncAndCheck() {
  const email = 'riyas.maisarah@gmail.com';
  const password = 'Welcome@8095';

  const { data, error } = await supabase.functions.invoke('manage-auth', {
    body: {
      email,
      password,
      full_name: 'Riyas',
      role: 'accountant',
      department_id: 'bookkeeping',
      secondary_roles: ['department_head', 'employee']
    } 
  });

  console.log("manage-auth response:", data, error);

  const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  console.log("Logged in user_metadata:", signData?.user?.user_metadata);

  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', signData?.user?.id)
    .maybeSingle();

  console.log("Profile row:", prof, pErr);
}

syncAndCheck();
