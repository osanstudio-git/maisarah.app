import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { session, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark"></div></div>;
  }

  // Not logged in
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but role not allowed
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to a dashboard based on their actual role
    if (role === 'manager') return <Navigate to="/manager" replace />;
    if (role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    if (role === 'accountant') return <Navigate to="/accountant" replace />;
    if (role === 'employee') return <Navigate to="/employee" replace />;
    if (role === 'client') return <Navigate to="/client" replace />;
    if (role === 'department_head') return <Navigate to="/hod/dashboard" replace />;
    
    return <div className="p-8 text-center text-red-600 font-bold">Unauthorized Access</div>;
  }

  // Logged in and authorized
  return <Outlet />;
};
