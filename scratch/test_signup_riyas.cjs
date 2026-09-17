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

const tempClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function testSignUp() {
  const email = 'riyas.maisarah@gmail.com';
  const password = 'Welcome@8095';

  console.log(`Testing tempClient.auth.signUp for ${email} with password ${password}...`);
  const { data, error } = await tempClient.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: 'Riyas',
        role: 'accountant',
        department_id: 'bookkeeping'
      }
    }
  });

  console.log("signUp data:", JSON.stringify(data, null, 2));
  console.log("signUp error:", error);

  if (!error) {
    console.log("Now testing signInWithPassword...");
    const { data: signData, error: signError } = await tempClient.auth.signInWithPassword({
      email,
      password
    });
    console.log("signIn result:", signData?.session ? "SUCCESS - LOGGED IN!" : "FAILED");
    console.log("signIn error:", signError);
  }
}

testSignUp();
