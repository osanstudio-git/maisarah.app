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

async function inspectError() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/manage-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      email: 'ekhlas@maisarah.om',
      password: 'Welcome@2026',
      full_name: 'Ekhlas',
      role: 'hr'
    })
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

inspectError();
