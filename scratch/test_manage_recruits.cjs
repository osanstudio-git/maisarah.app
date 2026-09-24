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
  console.log("1. Testing get_recruits via edge function...");
  const getRes = await supabase.functions.invoke('manage-auth', {
    body: { action: 'get_recruits' }
  });
  console.log("get_recruits result:", getRes.data, getRes.error);

  console.log("2. Testing upsert_recruit via edge function...");
  const testId = crypto.randomUUID();
  const upsertRes = await supabase.functions.invoke('manage-auth', {
    body: {
      action: 'upsert_recruit',
      recruit: {
        id: testId,
        name: 'Test Candidate',
        role: 'Senior Auditor',
        dept: 'Audit',
        stage: 'cv_received',
        score: 90,
        email: 'test.candidate@maisarah.om',
        phone: '+968 91112222',
        created_at: new Date().toISOString()
      }
    }
  });
  console.log("upsert_recruit result:", upsertRes.data, upsertRes.error);

  console.log("3. Testing get_recruits again to verify persistence...");
  const getRes2 = await supabase.functions.invoke('manage-auth', {
    body: { action: 'get_recruits' }
  });
  console.log("get_recruits count:", getRes2.data?.data?.length);

  console.log("4. Cleaning up test recruit...");
  const delRes = await supabase.functions.invoke('manage-auth', {
    body: {
      action: 'delete_recruit',
      recruit_id: testId
    }
  });
  console.log("delete_recruit result:", delRes.data);
}

test();
