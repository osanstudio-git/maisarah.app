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

async function test() {
  const { data: signData, error: sErr } = await supabase.auth.signInWithPassword({
    email: 'riyas.maisarah@gmail.com',
    password: 'Welcome@8095'
  });
  console.log('User ID:', signData?.user?.id, sErr);
  
  const { data: userRes, error: uErr } = await supabase.auth.getUser();
  console.log('getUser metadata:', userRes?.user?.user_metadata);

  const { data: p, error: pErr } = await supabase.from('profiles').select('*');
  console.log('All profiles count:', p?.length, p, pErr);

  const { data: h, error: hErr } = await supabase.from('hr_employees').select('*');
  console.log('All hr_employees count:', h?.length, h?.map(x => ({ email: x.email, role: x.role, dept: x.dept, secondary: x.secondary_roles })), hErr);
}

test();
