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

async function testUsers() {
  const emails = ['hr@maisarah.om', 'crm@maisarah.om', 'hod@maisarah.om', 'sales@maisarah.om'];
  for (const email of emails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'password123'
    });
    console.log(`Login ${email}:`, data?.user ? 'SUCCESS (id: ' + data.user.id + ')' : 'FAIL:', error?.message, error?.status);
  }
}

testUsers();
