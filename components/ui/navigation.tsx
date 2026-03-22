'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

interface NavigationProps {
  children?: React.ReactNode;
}

export function Navigation({ children }: NavigationProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
          {/* Mini tea leaf icon */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <span className="text-xs sm:text-sm text-white">🍃</span>
          </div>
          {/* Company name */}
          <div className="flex items-baseline space-x-1">
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              Sohag
            </span>
            <span className="text-lg sm:text-2xl font-light text-green-500">
              Tea
            </span>
            <span className="hidden sm:inline text-xs font-semibold text-gray-500 tracking-wider ml-1 self-end">
              MANAGE
            </span>
          </div>
        </Link>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">{user.name}</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  {user.role}
                </span>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}