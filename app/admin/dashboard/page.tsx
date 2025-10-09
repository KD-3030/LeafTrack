'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, TrendingUp, ClipboardCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SalesmanLocationMap from '@/components/admin/SalesmanLocationMap';
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
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      
      // Fetch products
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      
      // Fetch users (salesmen)
      const usersResponse = await fetch('/api/users');
      const usersData = await usersResponse.json();
      
      // Fetch orders
      const ordersResponse = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
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
        
        // Set recent orders (last 5 pending orders)
        setRecentOrders(pending.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
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
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}! Here&apos;s your inventory overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-gray-600">Tea leaf products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock}</div>
            <p className="text-xs text-gray-600">Total inventory units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salesmen</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalesmen}</div>
            <p className="text-xs text-gray-600">Active salesmen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            <p className="text-xs text-gray-600">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedOrders}</div>
            <p className="text-xs text-gray-600">Successfully approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Orders</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejectedOrders}</div>
            <p className="text-xs text-gray-600">Orders declined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalOrderValue.toFixed(2)}</div>
            <p className="text-xs text-gray-600">Approved orders value</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders Section */}
      {stats.pendingOrders > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-yellow-600" />
                  Pending Order Approvals
                </CardTitle>
                <CardDescription>Orders waiting for your review and approval</CardDescription>
              </div>
              <Button 
                onClick={() => router.push('/admin/orders')}
                variant="outline"
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
              >
                View All ({stats.pendingOrders})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order._id} 
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 transition-colors cursor-pointer"
                  onClick={() => router.push('/admin/orders')}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{order.customer_name}</h4>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Pending</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Salesman: {order.salesman_name} • Amount: ₹{order.total_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-yellow-700">
                    Review →
                  </Button>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <p className="text-center text-gray-500 py-4">No pending orders at the moment</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button 
              onClick={() => router.push('/admin/products')}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Package className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Products</h3>
              <p className="text-sm text-gray-600 mt-1">Add, edit, or remove tea products</p>
            </button>

            <button 
              onClick={() => router.push('/admin/orders')}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left relative"
            >
              <ClipboardCheck className="h-8 w-8 text-yellow-600 mb-2" />
              {stats.pendingOrders > 0 && (
                <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {stats.pendingOrders}
                </span>
              )}
              <h3 className="font-medium text-gray-900">Approve Orders</h3>
              <p className="text-sm text-gray-600 mt-1">Review and approve salesman orders</p>
            </button>

            <button 
              onClick={() => router.push('/admin/reports/orders')}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Order Reports</h3>
              <p className="text-sm text-gray-600 mt-1">View order statistics and analytics</p>
            </button>

            <button 
              onClick={() => router.push('/admin/customers')}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Users className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Customers</h3>
              <p className="text-sm text-gray-600 mt-1">View and manage customer accounts</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Location Tracking Map */}
      <SalesmanLocationMap />
    </div>
  );
}