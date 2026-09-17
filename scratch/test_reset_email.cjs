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

async function testMore() {
  const email = 'riyas.maisarah@gmail.com';
  // Test password reset email
  console.log("Sending password reset email to riyas.maisarah@gmail.com...");
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://app.maisarah.net/login'
  });
  console.log("Reset email result:", data, error);
}

testMore();
