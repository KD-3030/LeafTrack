'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestSalesmanAccess() {
  const router = useRouter();

  useEffect(() => {
    const autoLogin = async () => {
      try {
        console.log('Starting auto-login...');
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'john.smith@leaftrack.com',
            password: 'sales123',
            role: 'Salesman'
          })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success) {
          localStorage.setItem('leaftrack_token', data.token);
          localStorage.setItem('leaftrack_user', JSON.stringify(data.user));
          
          console.log('Stored auth data, redirecting to dashboard...');
          
          // Wait a moment then redirect
          setTimeout(() => {
            router.push('/salesman/dashboard');
          }, 1000);
        } else {
          console.error('Login failed:', data.error);
        }
      } catch (error) {
        console.error('Auto-login error:', error);
      }
    };

    autoLogin();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Auto-Login Test</h1>
        <p className="text-gray-600">Logging in as John Smith (Salesman)...</p>
        <p className="text-sm text-gray-500 mt-2">Check console for details</p>
      </div>
    </div>
  );
}
