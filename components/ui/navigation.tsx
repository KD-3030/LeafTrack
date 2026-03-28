'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Leaf } from 'lucide-react';

interface NavigationProps {
  children?: React.ReactNode;
}

export function Navigation({ children }: NavigationProps) {
  const { user, logout } = useAuth();

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'primary_executive': return 'Primary Executive';
      case 'secondary_executive': return 'Executive';
      default: return role || '';
    }
  };

  return (
    <header className="bg-white border-b border-border px-4 py-3 sm:px-6 sm:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-600 rounded-lg flex items-center justify-center group-hover:bg-brand-700 transition-colors">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-semibold text-foreground">
              LeafTrack
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">{user.name}</span>
                <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-medium">
                  {roleLabel(user.role)}
                </span>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}