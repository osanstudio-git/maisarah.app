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

async function testManageAuth() {
  const email = 'riyas.maisarah@gmail.com';
  const password = 'Welcome@8095';

  console.log(`Calling manage-auth edge function to set password for ${email} to ${password}...`);
  const { data, error } = await supabase.functions.invoke('manage-auth', {
    body: {
      email,
      password,
      full_name: 'Riyas',
      role: 'accountant',
      department_id: 'bookkeeping',
      secondary_roles: ['employee']
    }
  });

  console.log("manage-auth response:", data, error);

  if (data?.success) {
    console.log("Now testing actual login (signInWithPassword)...");
    const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log("LOGIN RESULT:", signData?.session ? "🎉 SUCCESS! USER LOGGED IN!" : "FAILED");
    console.log("User details:", signData?.user?.id, signData?.user?.email);
    console.log("Sign in error (if any):", signError);
  }
}

testManageAuth();
