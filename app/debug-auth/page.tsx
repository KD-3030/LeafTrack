'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugAuth() {
  const [tokenInfo, setTokenInfo] = useState<{
    token: string;
    tokenLength: number;
    user: unknown;
    hasToken: boolean;
  } | null>(null);
  const [apiResult, setApiResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Check what's in localStorage
    const token = localStorage.getItem('leaftrack_token');
    const user = localStorage.getItem('leaftrack_user');
    
    setTokenInfo({
      token: token ? token.substring(0, 20) + '...' : 'No token',
      tokenLength: token?.length || 0,
      user: user ? JSON.parse(user) : 'No user',
      hasToken: !!token
    });
  }, []);

  const testToken = async () => {
    const token = localStorage.getItem('leaftrack_token');
    if (!token) {
      setApiResult({ error: 'No token in localStorage' });
      return;
    }

    try {
      const response = await fetch('/api/debug-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setApiResult(data);
    } catch (error) {
      setApiResult({ error: 'Fetch failed', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('leaftrack_token');
    localStorage.removeItem('leaftrack_user');
    window.location.href = '/login';
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Authentication Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>LocalStorage Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(tokenInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testToken} disabled={!tokenInfo?.hasToken}>
            Test Current Token
          </Button>
          {apiResult && (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={clearAuth} variant="destructive">
            Clear Auth & Redirect to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
