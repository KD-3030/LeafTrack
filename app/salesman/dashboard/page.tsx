'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BarChart3, CheckCircle, Clock, Package, Plus, ShoppingCart, TrendingUp, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import LocationTrackingWidget from '@/components/LocationTrackingWidget';
import SalesmanLocationMap from '@/components/SalesmanLocationMap';
import { normalizeRoleId } from '@/lib/roles';

interface Order {
  _id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  total_amount: number;
  status: 'pending_primary' | 'pending' | 'approved' | 'rejected';
  items: Array<{ product_name: string }>;
}

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

export default function SalesmanDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);

  const [teamSales, setTeamSales] = useState<SaleRow[]>([]);
  const [teamSecondaries, setTeamSecondaries] = useState<TeamSecondary[]>([]);
  const [primaryOrderSummary, setPrimaryOrderSummary] = useState<OrderSummary | null>(null);

  const roleId = normalizeRoleId(user?.role || '');
  const isPrimaryExecutive = roleId === 'primary_executive';

  const teamMetrics = useMemo(() => {
    if (!teamSales.length) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        activeExecutives: 0,
        topPerformer: 'N/A',
      };
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

    return {
      totalRevenue,
      totalTransactions: teamSales.length,
      activeExecutives: performerMap.size,
      topPerformer,
    };
  }, [teamSales]);

  useEffect(() => {
    if (!user) return;

    if (isPrimaryExecutive) {
      loadPrimarySalesActivity();
    } else {
      loadSecondaryOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isPrimaryExecutive]);

  const getTokenOrThrow = () => {
    const token = localStorage.getItem('leaftrack_token');
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    return token;
  };

  const loadPrimarySalesActivity = async () => {
    try {
      setIsLoading(true);
      const token = getTokenOrThrow();
      const [salesResponse, teamResponse, orderSummaryResponse] = await Promise.all([
        fetch('/api/sales?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/users/team', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/orders?status=all', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const salesData = await salesResponse.json();
      const teamData = await teamResponse.json();
      const orderSummaryData = await orderSummaryResponse.json();

      if (!salesResponse.ok || !salesData.success) {
        throw new Error(salesData.error || 'Failed to load team activity');
      }

      if (!teamResponse.ok || !teamData.success) {
        throw new Error(teamData.error || 'Failed to load team executives');
      }

      if (!orderSummaryResponse.ok || !orderSummaryData.success) {
        throw new Error(orderSummaryData.error || 'Failed to load team order summary');
      }

      setTeamSales(salesData.sales || []);
      setTeamSecondaries(teamData.team || []);
      setPrimaryOrderSummary(orderSummaryData.summary || null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team activity';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecondaryOrders = async () => {
    try {
      setIsLoading(true);
      const token = getTokenOrThrow();
      const response = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      setOrders(data.orders || []);
      setSummary(data.summary || null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load your orders';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && (isPrimaryExecutive ? !teamSales.length : !summary)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={isPrimaryExecutive ? loadPrimarySalesActivity : loadSecondaryOrders} className="bg-orange-600 hover:bg-orange-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPrimaryExecutive) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Primary Executive Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor your secondary executives and team sales activity.</p>
          </div>
          <Button variant="outline" onClick={loadPrimarySalesActivity}>Refresh</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Team Revenue</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">₹{teamMetrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Transactions</CardTitle><BarChart3 className="h-4 w-4 text-blue-600" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{teamMetrics.totalTransactions}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Executives</CardTitle><Users className="h-4 w-4 text-purple-600" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{teamMetrics.activeExecutives}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Top Performer</CardTitle><CheckCircle className="h-4 w-4 text-orange-600" /></CardHeader>
            <CardContent><div className="text-sm font-semibold">{teamMetrics.topPerformer}</div></CardContent>
          </Card>
        </div>

        {primaryOrderSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Awaiting Your Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{primaryOrderSummary.primary_review_count || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Admin Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">{primaryOrderSummary.pending_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Order Workbench</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" onClick={() => router.push('/salesman/orders')}>
                  Review Team Orders
                </Button>
                <Button className="w-full" onClick={() => router.push('/salesman/orders/new')}>
                  Create My Order
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Team Sales</CardTitle>
            <CardDescription>Latest sales made by your team members.</CardDescription>
          </CardHeader>
          <CardContent>
            {teamSales.length === 0 ? (
              <p className="text-gray-500">No sales activity yet under your team.</p>
            ) : (
              <div className="space-y-3">
                {teamSales.slice(0, 10).map((sale) => (
                  <div key={sale._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{sale.salesman_id?.name || 'Unknown Executive'}</p>
                      <p className="text-sm text-gray-600">{sale.customer_id?.name || 'Walk-in customer'} • {sale.product_id?.name || 'Product'}</p>
                      <p className="text-xs text-gray-500">{new Date(sale.sale_date).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{(sale.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <Badge variant="outline">Qty: {sale.quantity_sold}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Secondary Executives Under You</CardTitle>
            <CardDescription>Your reporting team for stock pool based sales execution.</CardDescription>
          </CardHeader>
          <CardContent>
            {teamSecondaries.length === 0 ? (
              <p className="text-gray-500">No secondary executives are assigned to you yet.</p>
            ) : (
              <div className="space-y-2">
                {teamSecondaries.map((secondary) => (
                  <div key={secondary._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{secondary.name}</p>
                      <p className="text-sm text-gray-600">{secondary.email}</p>
                    </div>
                    <Badge variant="outline">Secondary Executive</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LocationTrackingWidget />
          <SalesmanLocationMap />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}</h1>
          <p className="text-gray-600 mt-2">Your order management dashboard</p>
        </div>
        <Button onClick={() => router.push('/salesman/orders/new')} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" />Create New Order
        </Button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><Package className="h-4 w-4 text-gray-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total_orders}</div></CardContent></Card>
          <Card className="border-yellow-200 bg-yellow-50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-yellow-700">Pending</CardTitle><Clock className="h-4 w-4 text-yellow-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-700">{summary.pending_count}</div></CardContent></Card>
          <Card className="border-green-200 bg-green-50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-green-700">Approved</CardTitle><CheckCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{summary.approved_count}</div></CardContent></Card>
          <Card className="border-red-200 bg-red-50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-red-700">Rejected</CardTitle><XCircle className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-700">{summary.rejected_count}</div></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationTrackingWidget />
        <SalesmanLocationMap />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-orange-600" />Recent Orders</CardTitle>
          <CardDescription>Your latest submitted orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-500">No orders found.</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 8).map((order) => (
                <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{new Date(order.order_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
