'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import { useRouter } from 'next/navigation';
import { normalizeRoleId } from '@/lib/roles';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('leaftrack_token');
    const userData = localStorage.getItem('leaftrack_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        localStorage.removeItem('leaftrack_token');
        localStorage.removeItem('leaftrack_user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data?.error || 'Login failed',
        };
      }
      
      localStorage.setItem('leaftrack_token', data.token);
      localStorage.setItem('leaftrack_user', JSON.stringify(data.user));
      
      setUser(data.user);
      
      // Redirect based on role
      const roleId = normalizeRoleId(data.user.role);
      if (roleId === 'admin') {
        router.replace('/admin/dashboard');
      } else if (roleId === 'primary_executive') {
        router.replace('/executive/dashboard');
      } else {
        router.replace('/salesman/dashboard');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    invitationToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, invitationToken }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data?.error || 'Signup failed',
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: 'Signup failed. Please try again.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('leaftrack_token');
    localStorage.removeItem('leaftrack_user');
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}