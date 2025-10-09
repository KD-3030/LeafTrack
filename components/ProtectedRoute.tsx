'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Case-insensitive role check
      const normalizedUserRole = user.role?.toLowerCase();
      const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
      
      if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
        router.push('/');
        return;
      }
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Case-insensitive role check
  const normalizedUserRole = user?.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
  
  if (!user || !normalizedAllowedRoles.includes(normalizedUserRole || '')) {
    return null;
  }

  return <>{children}</>;
}