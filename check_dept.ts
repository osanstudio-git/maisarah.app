import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {} as any);

const supabaseUrl = env['VITE_SUPABASE_URL'] || '';
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('departments').select('*').limit(1);
  if (error) {
    console.log('Error checking departments:', error.message);
  } else {
    console.log('Departments table exists. Data:', data);
  }
}

check();
