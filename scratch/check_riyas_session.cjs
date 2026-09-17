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

async function testRiyasSession() {
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
    email: 'riyas.maisarah@gmail.com',
    password: 'Welcome@8095'
  });

  console.log("Sign in data:", signData?.user?.id, "signErr:", signErr);

  if (signData?.session) {
    const { data: prof, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signData.user.id)
      .maybeSingle();

    console.log("Riyas Profile in Supabase:", prof, pErr);
  }
}

testRiyasSession();
