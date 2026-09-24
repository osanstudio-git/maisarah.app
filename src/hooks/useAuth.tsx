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
  
  // If we already have a cached role, start loading as false for instant 0ms render
  const [loading, setLoading] = useState<boolean>(() => !localStorage.getItem('app_user_role'));
  
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
        const immediateRole = cachedRole || metaRole;

        const metaSecondary = Array.isArray(initialSession.user.user_metadata?.secondary_roles)
          ? initialSession.user.user_metadata.secondary_roles
          : [];
        if (metaSecondary.length > 0) {
          setSecondaryRoles(metaSecondary);
          localStorage.setItem('app_user_secondary_roles', JSON.stringify(metaSecondary));
        }

        if (immediateRole) {
          setRole(immediateRole);
          setLoading(false); 
        }
        
        // Fetch fresh role in the background to verify without blocking UI
        fetchRole(initialSession.user, !immediateRole);
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
          if (event === 'SIGNED_IN' || !role) {
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
      // Refresh live user metadata directly from server
      const { data: freshUserRes } = await supabase.auth.getUser();
      const liveUser = freshUserRes?.user || currentUser;

      // 4-second timeout safety for profiles query so UI never hangs indefinitely
      const fetchProfilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', liveUser.id)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 4000)
      );

      const { data: profileData, error: profileErr } = await Promise.race([
        fetchProfilePromise,
        timeoutPromise
      ]) as any;

      if (profileErr) {
        console.warn('Profiles query notice:', profileErr.message);
      }
      
      const metaSec = Array.isArray(liveUser.user_metadata?.secondary_roles) ? liveUser.user_metadata.secondary_roles : [];
      const profileSec = (profileData && Array.isArray(profileData.secondary_roles) && profileData.secondary_roles.length > 0)
        ? profileData.secondary_roles
        : metaSec;

      setSecondaryRoles(profileSec);
      localStorage.setItem('app_user_secondary_roles', JSON.stringify(profileSec));
        
      if (profileData?.role) {
        // Validate cached role against authorized roles for this user
        const cachedRole = localStorage.getItem('app_user_role');
        const isAuthorized = cachedRole && (
          cachedRole === profileData.role || 
          profileSec.includes(cachedRole) || 
          profileData.role === 'manager'
        );

        const activeRole = isAuthorized ? cachedRole : profileData.role;
        setRole(activeRole);
        localStorage.setItem('app_user_role', activeRole);
      } else {
        const fallbackRole = currentUser.user_metadata?.role || localStorage.getItem('app_user_role') || null;
        setRole(fallbackRole);
        if (fallbackRole) {
          localStorage.setItem('app_user_role', fallbackRole);
        } else {
          localStorage.removeItem('app_user_role');
        }
      }
    } catch (err) {
      console.warn("Notice during user role fetch:", err);
      const fallbackRole = currentUser.user_metadata?.role || localStorage.getItem('app_user_role') || null;
      if (fallbackRole) {
        setRole(fallbackRole);
      }
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
      window.location.replace('/login');
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
