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

async function setupAndFixAccounts() {
  const accounts = [
    {
      email: 'ekhlas@maisarah.om',
      password: 'Welcome@2026',
      full_name: 'Ekhlas',
      role: 'hr',
      department_id: 'hr_admin',
      secondary_roles: ['employee']
    },
    {
      email: 'budoor@maisarah.om',
      password: 'Welcome@2026',
      full_name: 'Budoor Alhasani',
      role: 'manager',
      department_id: 'management',
      secondary_roles: ['employee']
    }
  ];

  for (const acc of accounts) {
    console.log(`\n========================================`);
    console.log(`Configuring GoTrue account for: ${acc.email}...`);
    const { data, error } = await supabase.functions.invoke('manage-auth', {
      body: acc
    });

    console.log("manage-auth response:", data, error);

    console.log(`Testing signInWithPassword for ${acc.email}...`);
    const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });

    if (signData?.session) {
      console.log(`✅ SUCCESS: ${acc.email} logged in successfully! User ID: ${signData.user.id}`);
      // Also check profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signData.user.id)
        .single();
      console.log("Profile data:", prof, profErr);
    } else {
      console.error(`❌ FAILED: ${acc.email} could not sign in. Error:`, signError);
    }
  }
}

setupAndFixAccounts();
