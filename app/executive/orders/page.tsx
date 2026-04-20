'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Search, Eye, Edit, Trash2, Clock, CheckCircle, XCircle,
  IndianRupee, Package, Calendar, Download, Send,
} from 'lucide-react';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
}

interface Order {
  _id: string;
  salesman_id: string;
  salesman_name: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  customer_contact: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending_primary' | 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewer_name?: string;
  admin_modified: boolean;
  admin_notes?: string;
  rejection_reason?: string;
  notes?: string;
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

export default function ExecutiveOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const currentUserId = user?._id || '';

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
        setSummary(data.summary);
      } else {
        toast.error(data.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchOrders();
      } else {
        toast.error(data.error || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const handleSendToAdmin = async (id: string) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'pending', admin_notes: 'Forwarded by primary executive for admin review' }),
      });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to send order to admin');
        return;
      }
      toast.success('Order forwarded to admin successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error forwarding order to admin:', error);
      toast.error('Failed to send order to admin');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="mr-1 h-3 w-3" />Pending Admin</Badge>;
      case 'pending_primary':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><Clock className="mr-1 h-3 w-3" />Awaiting Your Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_contact?.includes(searchTerm)
  );

  const teamReviewOrders = filteredOrders.filter(
    (order) => order.salesman_id !== currentUserId && order.status === 'pending_primary'
  );

  const allOtherOrders = filteredOrders.filter(
    (order) => order.salesman_id === currentUserId || order.status !== 'pending_primary'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review team orders, forward to admin, and manage your own submissions
          </p>
        </div>
        <Button onClick={() => router.push('/executive/orders/new')} className="bg-brand-600 hover:bg-brand-700">
          <Plus className="mr-2 h-4 w-4" />New Order
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Package className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{summary.total_orders}</div>
              <p className="text-xs text-muted-foreground">₹{summary.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Needs Review</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-blue-700">{summary.primary_review_count || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Pending Admin</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-amber-600">{summary.pending_count}</div>
              <p className="text-xs text-muted-foreground">₹{summary.pending_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-green-600">{summary.approved_count}</div>
              <p className="text-xs text-muted-foreground">₹{summary.approved_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-red-600">{summary.rejected_count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by order number, customer name, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending_primary', 'pending', 'approved', 'rejected'].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s === 'pending_primary' ? 'Needs Review' : s === 'pending' ? 'Pending Admin' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Orders Awaiting Review */}
      {teamReviewOrders.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Team Orders Awaiting Your Review ({teamReviewOrders.length})
            </CardTitle>
            <CardDescription>Review and forward approved orders to admin</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Executive</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamReviewOrders.map((order) => (
                  <TableRow key={`review-${order._id}`}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.salesman_name}</TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_contact}</div>
                    </TableCell>
                    <TableCell className="font-medium">₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm">{new Date(order.order_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="default" size="sm" onClick={() => handleSendToAdmin(order._id)} className="bg-brand-600 hover:bg-brand-700">
                          <Send className="mr-1 h-3 w-3" />Forward
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(order._id)} title="Reject & Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* All Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Orders</CardTitle>
          <CardDescription>Your orders and team orders lifecycle</CardDescription>
        </CardHeader>
        <CardContent>
          {allOtherOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">No orders found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : 'Create your first order to get started'}
              </p>
              {!searchTerm && (
                <Button className="mt-4 bg-brand-600 hover:bg-brand-700" onClick={() => router.push('/executive/orders/new')}>
                  <Plus className="mr-2 h-4 w-4" />Create Order
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allOtherOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_contact}</div>
                    </TableCell>
                    <TableCell>
                      <div>{order.items?.length || 0} item(s)</div>
                      {order.salesman_id !== currentUserId && (
                        <div className="text-xs text-muted-foreground">By: {order.salesman_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      {order.admin_modified && <div className="text-xs text-blue-600">Modified by admin</div>}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {order.status === 'pending' && order.salesman_id === currentUserId && (
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/executive/orders/${order._id}/edit`)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {order.status === 'pending_primary' && order.salesman_id !== currentUserId && (
                          <Button variant="ghost" size="sm" onClick={() => handleSendToAdmin(order._id)} title="Forward To Admin">
                            <Send className="mr-1 h-3 w-3" />Forward
                          </Button>
                        )}
                        {(order.status === 'pending' || order.status === 'pending_primary') && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(order._id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
