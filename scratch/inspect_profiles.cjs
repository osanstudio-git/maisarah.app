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

async function inspectProfiles() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'riyas.maisarah@gmail.com',
    password: 'Welcome@8095'
  });
  if (authError) {
    console.log('Auth error:', authError);
    return;
  }
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles columns:', data && data.length > 0 ? Object.keys(data[0]) : null, error);
}

inspectProfiles();
