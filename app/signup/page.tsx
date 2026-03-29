'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupPageContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [invitedRole, setInvitedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token') || '';
    setInvitationToken(token);

    if (!token) {
      setInviteStatus('invalid');
      return;
    }

    const validateInvite = async () => {
      setInviteStatus('validating');
      try {
        const response = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        if (response.ok && data?.valid) {
          setInviteStatus('valid');
          setInvitedRole(data?.invitation?.role || 'Executive');
          if (data?.invitation?.email) {
            setEmail(data.invitation.email);
          }
          return;
        }
      } catch {
        // Fall through to invalid state.
      }
      setInviteStatus('invalid');
    };

    validateInvite();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword || !invitationToken) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (inviteStatus !== 'valid') {
      toast.error('Valid invitation is required');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await signup(name, email, password, invitationToken);
      if (result.success) {
        toast.success('Account created! You can now log in.');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        toast.error(result.error || 'Failed to create account.');
      }
    } catch {
      toast.error('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-md mx-auto px-6 py-16">
        <Card className="border border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
              <UserPlus className="h-6 w-6 text-green-600" />
              <span>Set Up Your Account</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              Complete your account setup to get started
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {inviteStatus === 'validating' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Validating your invitation...</p>
              </div>
            )}
            {inviteStatus === 'invalid' && (
              <div className="text-center py-8">
                <p className="text-red-600 font-medium">This invitation link is invalid or has expired.</p>
                <p className="text-sm text-gray-500 mt-2">Please contact your admin for a new invitation.</p>
              </div>
            )}
            {inviteStatus === 'valid' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">Invitation valid for role: <strong>{invitedRole}</strong></p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="Your email"
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 6 characters)"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-green-600 hover:text-green-700 font-medium">
                  Login here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupPageContent />
    </Suspense>
  );
}