import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: string | null;
  secondaryRoles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  switchPortal: (targetRole: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  secondaryRoles: [],
  loading: true,
  signOut: async () => {},
  switchPortal: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Initialize role from localStorage if available to prevent UI flashes
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('app_user_role'));
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('app_user_secondary_roles') || '[]');
    } catch {
      return [];
    }
  });
  
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
          setLoading(false); 
        }
        
        // Fetch fresh role in the background to verify
        await fetchRole(initialSession.user, !immediateRole);
      } else {
        localStorage.removeItem('app_user_role');
        localStorage.removeItem('app_user_secondary_roles');
        setRole(null);
        setSecondaryRoles([]);
        setLoading(false);
      }

      // 2. Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          if (event === 'SIGNED_IN') {
            // Fresh login: clear any stale cached role from prior user/tests so primary profile role takes precedence
            localStorage.removeItem('app_user_role');
            localStorage.removeItem('app_user_secondary_roles');
            await fetchRole(session.user, true);
          } else if (!role) {
            await fetchRole(session.user, true);
          }
        } else {
          localStorage.removeItem('app_user_role');
          localStorage.removeItem('app_user_secondary_roles');
          setRole(null);
          setSecondaryRoles([]);
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

    if (shouldSetLoading && !role) {
      setLoading(true);
    }

    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('Profiles query notice:', profileErr.message);
      }
        
      if (profileData?.role) {
        const sec = Array.isArray(profileData.secondary_roles) ? profileData.secondary_roles : [];
        setSecondaryRoles(sec);
        localStorage.setItem('app_user_secondary_roles', JSON.stringify(sec));

        // Validate cached role against authorized roles for this user
        const cachedRole = localStorage.getItem('app_user_role');
        const isAuthorized = cachedRole && (
          cachedRole === profileData.role || 
          sec.includes(cachedRole) || 
          profileData.role === 'manager'
        );

        const activeRole = isAuthorized ? cachedRole : profileData.role;
        setRole(activeRole);
        localStorage.setItem('app_user_role', activeRole);
      } else {
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

  const switchPortal = (targetRole: string) => {
    localStorage.setItem('app_user_role', targetRole);
    setRole(targetRole);
    const portalRoutes: Record<string, string> = {
      accountant: '/accountant',
      employee: '/employee',
      department_head: '/hod/dashboard',
      hr: '/hr/dashboard',
      crm: '/crm/dashboard',
      manager: '/manager',
      client: '/client'
    };
    const targetPath = portalRoutes[targetRole] || '/';
    window.location.href = targetPath;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out from Supabase:", error);
    } finally {
      localStorage.removeItem('app_user_role');
      localStorage.removeItem('app_user_secondary_roles');
      setSession(null);
      setUser(null);
      setRole(null);
      setSecondaryRoles([]);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, secondaryRoles, loading, signOut, switchPortal }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
