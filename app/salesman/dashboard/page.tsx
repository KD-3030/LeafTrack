'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, ShoppingCart, AlertCircle, RefreshCw, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import LocationTrackingWidget from '@/components/LocationTrackingWidget';
import SalesmanLocationMap from '@/components/SalesmanLocationMap';

interface Order {
  _id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  items: Array<{
    product_name: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    total_price: number;
  }>;
  admin_modified: boolean;
  rejection_reason?: string;
}

interface OrderSummary {
  total_orders: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_value: number;
  pending_value: number;
  approved_value: number;
}

export default function SalesmanDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('leaftrack_token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch orders');
      }
      
      setOrders(data.orders || []);
      setSummary(data.summary || null);
      setError(null);
    } catch (error) {
      console.error('Error loading orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load your orders';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = () => {
    router.push('/salesman/orders/new');
  };

  const handleViewOrders = () => {
    router.push('/salesman/orders');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadOrders} className="bg-orange-600 hover:bg-orange-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.name}
          </h1>
          <p className="text-gray-600 mt-2">Your order management dashboard</p>
        </div>
        <Button onClick={handleCreateOrder} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" />
          Create New Order
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_orders}</div>
              <p className="text-xs text-gray-600">
                ₹{summary.total_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{summary.pending_count}</div>
              <p className="text-xs text-yellow-600">
                ₹{summary.pending_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{summary.approved_count}</div>
              <p className="text-xs text-green-600">
                ₹{summary.approved_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{summary.rejected_count}</div>
              <p className="text-xs text-red-600">Orders declined</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Location Tracking Widget and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationTrackingWidget />
        <SalesmanLocationMap />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Manage your orders efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleCreateOrder}
              className="h-20 bg-orange-600 hover:bg-orange-700 text-lg"
            >
              <Plus className="mr-2 h-6 w-6" />
              Create New Order
            </Button>
            <Button 
              onClick={handleViewOrders}
              variant="outline"
              className="h-20 text-lg"
            >
              <ShoppingCart className="mr-2 h-6 w-6" />
              View All Orders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                <span>Recent Orders</span>
              </CardTitle>
              <CardDescription>
                Your latest order submissions
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleViewOrders}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600 mb-4">
                You haven&apos;t created any orders yet. Start by creating your first order!
              </p>
              <Button onClick={handleCreateOrder} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Order
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div 
                  key={order._id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </h4>
                        {getStatusBadge(order.status)}
                        {order.admin_modified && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                            Modified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.customer_name} • {order.items.length} item(s)
                      </p>
                      {order.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">
                          Reason: {order.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(order.order_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
              {orders.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="link" onClick={handleViewOrders}>
                    View all {orders.length} orders →
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {summary && summary.total_orders > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Insights</CardTitle>
            <CardDescription>Your order performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{summary.total_orders}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.total_orders > 0 
                    ? Math.round((summary.approved_count / summary.total_orders) * 100) 
                    : 0}%
                </div>
                <div className="text-sm text-gray-600">Approval Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ₹{(summary.approved_value / (summary.approved_count || 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600">Avg Order Value</div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Approval Progress</span>
                <span className="text-sm font-bold">
                  {summary.approved_count} / {summary.total_orders} approved
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${summary.total_orders > 0 ? (summary.approved_count / summary.total_orders) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}