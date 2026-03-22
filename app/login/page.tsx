'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !role) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(email, password, role);
      if (!result.success) {
        toast.error(result.error || 'Invalid credentials or role mismatch');
        return;
      }
      toast.success('Login successful! Redirecting...');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
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
              <LogIn className="h-6 w-6 text-green-600" />
              <span>Login to SohagTea</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              Access your dashboard with your credentials
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="PrimaryExecutive">Primary Executive</SelectItem>
                    <SelectItem value="SecondaryExecutive">Secondary Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Accounts are invite-only. Contact your admin for an invitation link.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}