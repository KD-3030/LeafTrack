'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { normalizeRoleId } from '@/lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const getDefaultRouteForRole = (role?: string) => {
    const roleId = normalizeRoleId(role || '');
    if (roleId === 'admin') return '/admin/dashboard';
    if (roleId === 'primary_executive') return '/executive/dashboard';
    if (roleId === 'secondary_executive') return '/salesman/dashboard';
    return '/login';
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      const normalizedUserRole = normalizeRoleId(user.role);
      const normalizedAllowedRoles = allowedRoles.map((r) => normalizeRoleId(r));
      
      if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
        router.replace(getDefaultRouteForRole(user.role));
        return;
      }
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent"></div>
      </div>
    );
  }

  const normalizedUserRole = normalizeRoleId(user?.role || '');
  const normalizedAllowedRoles = allowedRoles.map((r) => normalizeRoleId(r));
  
  if (!user || !normalizedAllowedRoles.includes(normalizedUserRole)) {
    return null;
  }

  return <>{children}</>;
}