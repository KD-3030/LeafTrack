'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BarChart3, CheckCircle, Clock, Plus, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

interface OrderSummary {
  total_orders: number;
  pending_count: number;
  primary_review_count?: number;
  approved_count: number;
  rejected_count: number;
  total_value: number;
  pending_value: number;
  approved_value: number;
}

interface SaleRow {
  _id: string;
  sale_date: string;
  total_amount: number;
  quantity_sold: number;
  salesman_id?: { _id: string; name?: string; email?: string };
  customer_id?: { name?: string };
  product_id?: { name?: string };
}

interface TeamSecondary {
  _id: string;
  name: string;
  email: string;
}

export default function ExecutiveDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamSales, setTeamSales] = useState<SaleRow[]>([]);
  const [teamSecondaries, setTeamSecondaries] = useState<TeamSecondary[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  const teamMetrics = useMemo(() => {
    if (!teamSales.length) {
      return { totalRevenue: 0, totalTransactions: 0, activeExecutives: 0, topPerformer: 'N/A' };
    }

    const performerMap = new Map<string, { name: string; revenue: number }>();
    let totalRevenue = 0;

    for (const sale of teamSales) {
      totalRevenue += sale.total_amount || 0;
      const execId = sale.salesman_id?._id || 'unknown';
      const execName = sale.salesman_id?.name || 'Unknown';
      const current = performerMap.get(execId) || { name: execName, revenue: 0 };
      current.revenue += sale.total_amount || 0;
      performerMap.set(execId, current);
    }

    const topPerformer = Array.from(performerMap.values()).sort((a, b) => b.revenue - a.revenue)[0]?.name || 'N/A';

    return { totalRevenue, totalTransactions: teamSales.length, activeExecutives: performerMap.size, topPerformer };
  }, [teamSales]);

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getTokenOrThrow = () => {
    const token = localStorage.getItem('leaftrack_token');
    if (!token) throw new Error('No authentication token found. Please log in again.');
    return token;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = getTokenOrThrow();
      const [salesResponse, teamResponse, ordersResponse] = await Promise.all([
        fetch('/api/sales?limit=200', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users/team', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/orders?status=all', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const salesData = await salesResponse.json();
      const teamData = await teamResponse.json();
      const ordersData = await ordersResponse.json();

      if (!salesResponse.ok || !salesData.success) throw new Error(salesData.error || 'Failed to load team activity');
      if (!teamResponse.ok || !teamData.success) throw new Error(teamData.error || 'Failed to load team');
      if (!ordersResponse.ok || !ordersData.success) throw new Error(ordersData.error || 'Failed to load orders');

      setTeamSales(salesData.sales || []);
      setTeamSecondaries(teamData.team || []);
      setOrderSummary(ordersData.summary || null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !teamSales.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} className="bg-brand-600 hover:bg-brand-700">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor your team and manage orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>Refresh</Button>
          <Button size="sm" className="bg-brand-600 hover:bg-brand-700" onClick={() => router.push('/executive/orders/new')}>
            <Plus className="mr-1.5 h-4 w-4" />New Order
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₹{teamMetrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{teamMetrics.totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Executives</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{teamMetrics.activeExecutives}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
            <CheckCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold truncate">{teamMetrics.topPerformer}</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Cards */}
      {orderSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />Awaiting Your Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{orderSummary.primary_review_count || 0}</div>
              <Button className="w-full mt-3" variant="outline" size="sm" onClick={() => router.push('/executive/orders')}>
                Review Orders
              </Button>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />Pending Admin Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{orderSummary.pending_count}</div>
            </CardContent>
          </Card>
          <Card className="border-brand-200 bg-brand-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-brand-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />Approved This Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-700">{orderSummary.approved_count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Recent Team Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Team Sales</CardTitle>
          <CardDescription>Latest sales by your team members</CardDescription>
        </CardHeader>
        <CardContent>
          {teamSales.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No sales activity yet.</p>
          ) : (
            <div className="space-y-2">
              {teamSales.slice(0, 10).map((sale) => (
                <div key={sale._id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{sale.salesman_id?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {sale.customer_id?.name || 'Walk-in'} &middot; {sale.product_id?.name || 'Product'}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-sm">₹{(sale.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <Badge variant="outline" className="text-[10px]">Qty: {sale.quantity_sold}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Team</CardTitle>
          <CardDescription>Secondary executives under your management</CardDescription>
        </CardHeader>
        <CardContent>
          {teamSecondaries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No secondary executives assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {teamSecondaries.map((se) => (
                <div key={se._id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium text-sm">{se.name}</p>
                    <p className="text-xs text-muted-foreground">{se.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Secondary Executive</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
