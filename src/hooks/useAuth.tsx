import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Initialize role from localStorage if available to prevent UI flashes
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('app_user_role'));
  
  // If we already have a cached role, we don't strictly need to block the UI, 
  // BUT we MUST wait for the local session to initialize to prevent premature redirects to /login.
  const [loading, setLoading] = useState(true);
  
  // Track if we are already fetching the role to avoid race conditions
  const isFetchingRole = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      // 1. Initial session check (Supabase reads this instantly from its own localStorage)
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (error) {
        console.error("Supabase session error:", error.message);
        setLoading(false);
        return;
      }

      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        
        // Optimistically use cached role or metadata to speed up UI loading
        const cachedRole = localStorage.getItem('app_user_role');
        const metaRole = initialSession.user.user_metadata?.role;
        const immediateRole = metaRole || cachedRole;

        if (immediateRole) {
          setRole(immediateRole);
          // Stop loading immediately so the user sees the UI instantly!
          setLoading(false); 
        }
        
        // Fetch fresh role in the background to verify
        await fetchRole(initialSession.user, !immediateRole);
      } else {
        // No session, stop loading and let ProtectedRoute redirect to login
        localStorage.removeItem('app_user_role');
        setRole(null);
        setLoading(false);
      }

      // 2. Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          // If sign in occurs, fetch role
          if (event === 'SIGNED_IN' || !role) {
            await fetchRole(session.user, true);
          }
        } else {
          // Signed out
          localStorage.removeItem('app_user_role');
          setRole(null);
          setLoading(false);
        }
      });

      return subscription;
    }

    const authSubscriptionPromise = initializeAuth();

    return () => {
      mounted = false;
      authSubscriptionPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  const fetchRole = async (currentUser: User, shouldSetLoading: boolean) => {
    if (isFetchingRole.current) return;
    isFetchingRole.current = true;

    if (shouldSetLoading && !localStorage.getItem('app_user_role')) {
      setLoading(true);
    }

    try {
      // Priority 1: Profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();
        
      if (profileData?.role) {
        setRole(profileData.role);
        localStorage.setItem('app_user_role', profileData.role);
      } else {
        // Priority 2: Fallback to metadata
        const fallbackRole = currentUser.user_metadata?.role || null;
        setRole(fallbackRole);
        if (fallbackRole) {
          localStorage.setItem('app_user_role', fallbackRole);
        } else {
          localStorage.removeItem('app_user_role');
        }
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    } finally {
      isFetchingRole.current = false;
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out from Supabase:", error);
    } finally {
      localStorage.removeItem('app_user_role');
      setSession(null);
      setUser(null);
      setRole(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
