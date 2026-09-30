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
  console.log("Testing direct insert to hr_recruits with sanitized payload...");
  const testId = crypto.randomUUID();
  const insRes = await supabase.from('hr_recruits').insert({
    id: testId,
    name: 'Direct Test',
    email: 'direct@test.com',
    phone: '123',
    role: 'Auditor',
    dept: 'Audit',
    stage: 'cv_received',
    score: 85,
    employment_type: 'Experienced',
    placement_status: 'pending_placement'
  }).select();
  console.log("Direct insert result:", { data: insRes.data, error: insRes.error });

  if (insRes.data) {
    await supabase.from('hr_recruits').delete().eq('id', testId);
  }
}

test();
