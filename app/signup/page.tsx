'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    
    if (!name || !email || !password || !invitationToken) {
      toast.error('Please fill in all fields');
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
        toast.success('Account created. Please wait for admin approval.');
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
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navigation />
      
      <main className="max-w-md mx-auto px-6 py-16">
        <Card className="border border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
              <UserPlus className="h-6 w-6 text-green-600" />
              <span>Complete Invitation</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              Invite-only onboarding for executives
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={inviteStatus === 'valid'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invitation">Invitation Token</Label>
                <Input
                  id="invitation"
                  type="text"
                  value={invitationToken}
                  onChange={(e) => setInvitationToken(e.target.value)}
                  placeholder="Invitation token"
                  required
                  disabled
                />
                {inviteStatus === 'validating' && (
                  <p className="text-xs text-gray-500">Validating invitation...</p>
                )}
                {inviteStatus === 'valid' && (
                  <p className="text-xs text-green-600">Invitation valid for role: {invitedRole}</p>
                )}
                {inviteStatus === 'invalid' && (
                  <p className="text-xs text-red-600">This invitation is invalid or expired.</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading || inviteStatus !== 'valid'}
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