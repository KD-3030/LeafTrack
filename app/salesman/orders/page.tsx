'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRoleId } from '@/lib/roles';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  IndianRupee,
  Package,
  Calendar,
  Download,
} from 'lucide-react';
// pdfGenerator is dynamically imported on-demand for bundle optimization

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

export default function SalesmanOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const roleId = normalizeRoleId(user?.role || '');
  const isPrimaryExecutive = roleId === 'primary_executive';
  const currentUserId = user?._id || '';

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const params = new URLSearchParams();
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const handleDownloadPDF = async (order: Order) => {
    try {
      // Add missing fields for PDF generation
      const orderForPDF = {
        ...order,
        salesman_id: order._id, // Use order ID as fallback
        salesman_name: 'Salesman', // Will be filled from actual data
        tax_percentage: order.tax_amount > 0 ? (order.tax_amount / order.subtotal) * 100 : 0,
        customer_address: '',
        customer_gstin: '',
        customer_email: '',
        delivery_date: '',
        payment_terms: '',
      };
      
      const { generateOrderBillPDF } = await import('@/lib/pdfGenerator');
      await generateOrderBillPDF(orderForPDF as typeof order & { salesman_id: string; salesman_name: string; tax_percentage: number });
      toast.success('Order bill downloaded successfully!');
    } catch (error) {
      console.error('Error downloading order bill:', error);
      toast.error('Failed to download order bill');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'pending',
          admin_notes: 'Forwarded by primary executive for admin review',
        }),
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
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'pending_primary':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><Clock className="mr-1 h-3 w-3" />Awaiting Primary Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_contact.includes(searchTerm)
  );

  const teamReviewOrders = isPrimaryExecutive
    ? filteredOrders.filter((order) => order.salesman_id !== currentUserId && order.status === 'pending_primary')
    : [];

  const ownOrders = isPrimaryExecutive
    ? filteredOrders.filter((order) => order.salesman_id === currentUserId || order.status !== 'pending_primary')
    : filteredOrders;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">
            {isPrimaryExecutive
              ? 'Monitor team orders, forward reviewed orders to admin, and manage your own submissions'
              : 'Create and manage customer orders'}
          </p>
        </div>
        <Button onClick={() => router.push('/salesman/orders/new')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          New Order
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-3xl">{summary.total_orders}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                <IndianRupee className="inline h-4 w-4" />
                {summary.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-yellow-700">Pending Admin Approval</CardDescription>
              <CardTitle className="text-3xl text-yellow-700">{summary.pending_count || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-600">
                <IndianRupee className="inline h-4 w-4" />
                {summary.pending_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {isPrimaryExecutive && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-700">Awaiting Your Review</CardDescription>
                <CardTitle className="text-3xl text-blue-700">{summary.primary_review_count || 0}</CardTitle>
              </CardHeader>
            </Card>
          )}

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-700">Approved</CardDescription>
              <CardTitle className="text-3xl text-green-700">{summary.approved_count}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600">
                <IndianRupee className="inline h-4 w-4" />
                {summary.approved_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-700">Rejected</CardDescription>
              <CardTitle className="text-3xl text-red-700">{summary.rejected_count}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, customer name, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isPrimaryExecutive && (
        <Card>
          <CardHeader>
            <CardTitle>Secondary Executive Orders Awaiting Review</CardTitle>
            <CardDescription>
              Review team submissions and forward approved ones to admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamReviewOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No team orders are awaiting your review.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Executive</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamReviewOrders.map((order) => (
                    <TableRow key={`team-${order._id}`}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.salesman_name}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendToAdmin(order._id)}
                          >
                            Send To Admin
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(order._id)}
                            title="Delete Team Order"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isPrimaryExecutive ? 'My And Team Orders' : 'Orders List'}</CardTitle>
          <CardDescription>
            {isPrimaryExecutive
              ? 'Track your own orders and team lifecycle from primary review to admin approval'
              : 'View and manage your submitted orders'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ownOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No orders found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first order'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => router.push('/salesman/orders/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Order
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ownOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_contact}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{order.items.length} item(s)</div>
                      {isPrimaryExecutive && order.salesman_id !== currentUserId && (
                        <div className="text-xs text-gray-500">By: {order.salesman_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {order.admin_modified && (
                        <div className="text-xs text-blue-600">Modified by admin</div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/salesman/orders/${order._id}`)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(order)}
                          title="Download Bill"
                        >
                          <Download className="h-4 w-4 text-blue-600" />
                        </Button>
                        {(order.status === 'pending' || order.status === 'pending_primary') && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/salesman/orders/${order._id}/edit`)}
                              title="Edit Order"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isPrimaryExecutive && order.salesman_id !== currentUserId && order.status === 'pending_primary' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendToAdmin(order._id)}
                                title="Forward To Admin"
                              >
                                Send To Admin
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(order._id)}
                              title="Delete Order"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
