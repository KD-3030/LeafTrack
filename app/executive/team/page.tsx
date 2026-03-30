'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, TrendingUp, BarChart3, Search, Mail, Phone } from 'lucide-react';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  approval_status: string;
}

interface SaleRow {
  _id: string;
  sale_date: string;
  total_amount: number;
  quantity_sold: number;
  salesman_id?: { _id: string; name?: string };
  customer_id?: { name?: string };
  product_id?: { name?: string };
}

export default function ExecutiveTeamPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      if (!token) throw new Error('No authentication token found.');

      const [teamRes, salesRes] = await Promise.all([
        fetch('/api/users/team', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/sales?limit=500', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const teamData = await teamRes.json();
      const salesData = await salesRes.json();

      if (teamData.success) setTeam(teamData.team || []);
      if (salesData.success) setSales(salesData.sales || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team data';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const memberStats = useMemo(() => {
    const stats = new Map<string, { revenue: number; transactions: number; lastSale: string }>();
    for (const sale of sales) {
      const id = sale.salesman_id?._id || '';
      const existing = stats.get(id) || { revenue: 0, transactions: 0, lastSale: '' };
      existing.revenue += sale.total_amount || 0;
      existing.transactions += 1;
      if (!existing.lastSale || sale.sale_date > existing.lastSale) {
        existing.lastSale = sale.sale_date;
      }
      stats.set(id, existing);
    }
    return stats;
  }, [sales]);

  const totalTeamRevenue = useMemo(() => {
    let total = 0;
    memberStats.forEach(s => total += s.revenue);
    return total;
  }, [memberStats]);

  const filteredTeam = team.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Team Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Your secondary executives and their performance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Size</CardTitle>
            <Users className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{team.length}</div>
            <p className="text-xs text-muted-foreground">secondary executives</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₹{totalTeamRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">total sales value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{sales.length}</div>
            <p className="text-xs text-muted-foreground">across all members</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Team Members */}
      {filteredTeam.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium">
              {searchTerm ? 'No matching members found' : 'No team members yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Try a different search term' : 'Secondary executives assigned to you will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeam.map((member) => {
            const stats = memberStats.get(member._id);
            return (
              <Card key={member._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-brand-700 font-semibold text-sm">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-sm">{member.name}</CardTitle>
                        <CardDescription className="text-xs">Secondary Executive</CardDescription>
                      </div>
                    </div>
                    <Badge variant={member.approval_status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                      {member.approval_status === 'approved' ? 'Active' : member.approval_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />{member.email}
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />{member.phone}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="text-sm font-semibold">
                          ₹{(stats?.revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sales</p>
                        <p className="text-sm font-semibold">{stats?.transactions || 0}</p>
                      </div>
                    </div>
                    {stats?.lastSale && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Last sale: {new Date(stats.lastSale).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
