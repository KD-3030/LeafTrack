'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, TrendingUp, ClipboardCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Order {
  _id: string;
  customer_name: string;
  salesman_name: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalSalesmen: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    rejectedOrders: 0,
    totalOrderValue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    loadStats(controller.signal);
    return () => controller.abort();
  }, []);

  const loadStats = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      
      const [productsResponse, usersResponse, ordersResponse] = await Promise.all([
        fetch('/api/products', { signal }),
        fetch('/api/users', { signal }),
        fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` }, signal }),
      ]);
      
      const productsData = await productsResponse.json();
      const usersData = await usersResponse.json();
      const ordersData = await ordersResponse.json();
      
      if (productsData.success && usersData.success && ordersData.success) {
        const salesmen = usersData.users.filter((user: User) => user.role?.toLowerCase() === 'salesman');
        const totalStock = productsData.products.reduce((sum: number, product: Product) => sum + (product.totalStock || 0), 0);
        
        const orders = ordersData.orders || [];
        const pending = orders.filter((o: Order) => o.status === 'pending');
        const approved = orders.filter((o: Order) => o.status === 'approved');
        const rejected = orders.filter((o: Order) => o.status === 'rejected');
        const totalValue = approved.reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0);
        
        setStats({
          totalProducts: productsData.products.length,
          totalStock,
          totalSalesmen: salesmen.length,
          pendingOrders: pending.length,
          approvedOrders: approved.length,
          rejectedOrders: rejected.length,
          totalOrderValue: totalValue,
        });
        
        setRecentOrders(pending.slice(0, 5));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-1"></div>
                <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.totalStock.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Units available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
            <Users className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.totalSalesmen}</div>
            <p className="text-xs text-muted-foreground">Active executives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-brand-600">{stats.approvedOrders}</div>
            <p className="text-xs text-muted-foreground">Orders completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-destructive">{stats.rejectedOrders}</div>
            <p className="text-xs text-muted-foreground">Orders declined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₹{stats.totalOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Approved orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders Queue */}
      {stats.pendingOrders > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-amber-600" />
                  Pending Approvals
                </CardTitle>
                <CardDescription>Orders waiting for review</CardDescription>
              </div>
              <Button 
                onClick={() => router.push('/admin/orders')}
                variant="outline"
                size="sm"
              >
                View All ({stats.pendingOrders})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div 
                  key={order._id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push('/admin/orders')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{order.customer_name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Pending</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.salesman_name} &middot; ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button 
              onClick={() => router.push('/admin/products')}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors text-left group"
            >
              <Package className="h-6 w-6 text-brand-600 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-sm">Products</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage catalog</p>
            </button>

            <button 
              onClick={() => router.push('/admin/orders')}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors text-left relative group"
            >
              <ClipboardCheck className="h-6 w-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
              {stats.pendingOrders > 0 && (
                <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.pendingOrders}
                </span>
              )}
              <h3 className="font-medium text-sm">Orders</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Review & approve</p>
            </button>

            <button 
              onClick={() => router.push('/admin/reports')}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors text-left group"
            >
              <TrendingUp className="h-6 w-6 text-brand-600 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-sm">Reports</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Analytics & stats</p>
            </button>

            <button 
              onClick={() => router.push('/admin/customers')}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors text-left group"
            >
              <Users className="h-6 w-6 text-brand-600 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-sm">Customers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage accounts</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}