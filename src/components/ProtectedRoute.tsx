import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { session, role, secondaryRoles, loading, sessionReady } = useAuth();

  // CRITICAL: Wait until the initial session check is fully complete.
  // Without this, on page refresh session is null while getSession() is still
  // resolving, causing a premature redirect to /login.
  if (!sessionReady || (loading && !role)) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark"></div>
      </div>
    );
  }

  // Not logged in (only after session is confirmed resolved)
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check if current role OR any secondary role satisfies allowedRoles (or user is manager)
  const isManager = role === 'manager' || (secondaryRoles && secondaryRoles.includes('manager'));
  const userRoles = [role, ...(secondaryRoles || [])].filter(Boolean) as string[];
  const matchingRole = allowedRoles?.find(r => userRoles.includes(r));
  const isAuthorized = !allowedRoles || isManager || !!matchingRole;

  // Logged in but role not allowed
  if (!isAuthorized) {
    // Redirect to a dashboard based on their actual role
    if (role === 'manager') return <Navigate to="/manager" replace />;
    if (role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    if (role === 'crm') return <Navigate to="/crm/dashboard" replace />;
    if (role === 'accountant') return <Navigate to="/accountant" replace />;
    if (role === 'employee') return <Navigate to="/employee" replace />;
    if (role === 'client') return <Navigate to="/client" replace />;
    if (role === 'department_head') return <Navigate to="/hod/dashboard" replace />;
    
    return <div className="p-8 text-center text-red-600 font-bold">Unauthorized Access</div>;
  }

  // If currently active role is not in allowedRoles but matching secondary role is, auto-sync active role
  if (allowedRoles && role && !allowedRoles.includes(role) && matchingRole) {
    localStorage.setItem('app_user_role', matchingRole);
  }

  // Logged in and authorized
  return <Outlet />;
};
