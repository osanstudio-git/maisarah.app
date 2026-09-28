import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configuration to mitigate NavigatorLockAcquireTimeoutError and handle session stability
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'maisarah-app-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Non-blocking lock handler to prevent orphaned browser locks (e.g. React StrictMode / unmounts)
    lock: async (_name, _acquireTimeout, fn) => {
      return await fn();
    },
  },
});
