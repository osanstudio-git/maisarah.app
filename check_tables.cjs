const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    acc[key] = value;
  }
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'] || '';
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Let's check table names or query some tables
  const tables = ['clients', 'tasks', 'invoices', 'services', 'proposals'];
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Table ${t} check failed:`, error.message);
      } else {
        console.log(`Table ${t} exists and has records count:`, data.length);
      }
    } catch (e) {
      console.log(`Table ${t} error:`, e.message);
    }
  }
}

check();
