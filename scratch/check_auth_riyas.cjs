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

async function testAuthLogin() {
  console.log("Testing signInWithPassword for riyas.maisarah@gmail.com with various passwords...");
  
  const passwordsToTest = ['Welcome@8095', 'Welcome@3751', 'Welcome@1234', '123456', 'Welcome123', 'maisarah123'];
  for (const pw of passwordsToTest) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'riyas.maisarah@gmail.com',
      password: pw
    });
    console.log(`Password "${pw}":`, data?.session ? "SUCCESS!" : error?.message);
    if (data?.session) {
      await supabase.auth.signOut();
    }
  }

  const { data: prof } = await supabase.from('profiles').select('*').eq('email', 'riyas.maisarah@gmail.com');
  console.log("Profile in DB:", prof);
}

testAuthLogin();
