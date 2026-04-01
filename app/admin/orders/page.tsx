'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  Calendar,
  User,
  Package,
  Edit,
  Trash2,
  Download,
  MapPin,
} from 'lucide-react';

const SalesMap = lazy(() => import('@/components/SalesMap'));
// pdfGenerator is dynamically imported on-demand for bundle optimization

interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
}

interface Order {
  _id: string;
  order_number: string;
  order_date: string;
  salesman_id: string;
  salesman_name: string;
  customer_name: string;
  customer_contact: string;
  customer_address?: string;
  customer_gstin?: string;
  customer_email?: string;
  items: OrderItem[];
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending_primary' | 'pending' | 'approved' | 'dispatched' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewer_name?: string;
  admin_modified: boolean;
  admin_notes?: string;
  original_total?: number;
  rejection_reason?: string;
  delivery_date?: string;
  payment_terms?: string;
  notes?: string;
  location_lat?: number | null;
  location_lng?: number | null;
}

interface OrderSummary {
  total_orders: number;
  pending_count: number;
  approved_count: number;
  dispatched_count: number;
  rejected_count: number;
  total_value: number;
  pending_value: number;
  approved_value: number;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Approval form states
  const [modifiedItems, setModifiedItems] = useState<OrderItem[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [modifiedTaxPercentage, setModifiedTaxPercentage] = useState('');
  const [modifiedDiscount, setModifiedDiscount] = useState('');

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      
      // Fetch all orders for summary (without status filter)
      const summaryResponse = await fetch('/api/orders?status=all', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const summaryData = await summaryResponse.json();
      if (summaryData.success) {
        setSummary(summaryData.summary);
      }
      
      // Fetch filtered orders for display
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
        console.log(`Fetched ${data.orders.length} orders with status filter: ${statusFilter}`);
        setOrders(data.orders);
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

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleDownloadPDF = async (order: Order) => {
    try {
      const { generateOrderBillPDF } = await import('@/lib/pdfGenerator');
      await generateOrderBillPDF(order);
      toast.success('Order bill downloaded successfully!');
    } catch (error) {
      console.error('Error downloading order bill:', error);
      toast.error('Failed to download order bill');
    }
  };

  const handleOpenApproval = (order: Order) => {
    setSelectedOrder(order);
    setModifiedItems([...order.items]);
    setAdminNotes('');
    setRejectionReason('');
    setDeliveryDate('');
    setPaymentTerms('');
    setModifiedTaxPercentage(order.tax_percentage.toString());
    setModifiedDiscount(order.discount_amount.toString());
    setIsApprovalDialogOpen(true);
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...modifiedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total price
    if (field === 'quantity' || field === 'price_per_unit') {
      const qty = field === 'quantity' ? parseFloat(value as string) : newItems[index].quantity;
      const price = field === 'price_per_unit' ? parseFloat(value as string) : newItems[index].price_per_unit;
      newItems[index].total_price = qty * price;
    }
    
    setModifiedItems(newItems);
  };

  const calculateModifiedTotals = () => {
    const subtotal = modifiedItems.reduce((sum, item) => sum + item.total_price, 0);
    const tax = (subtotal * parseFloat(modifiedTaxPercentage || '0')) / 100;
    const discount = parseFloat(modifiedDiscount || '0');
    const total = subtotal + tax - discount;

    return { subtotal, tax, discount, total };
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;

    const { subtotal, tax, total } = calculateModifiedTotals();
    const hasModifications = JSON.stringify(modifiedItems) !== JSON.stringify(selectedOrder.items) ||
                           parseFloat(modifiedTaxPercentage) !== selectedOrder.tax_percentage ||
                           parseFloat(modifiedDiscount) !== selectedOrder.discount_amount;

    const payload: Record<string, unknown> = {
      status: 'approved',
      admin_notes: adminNotes,
      delivery_date: deliveryDate || undefined,
      payment_terms: paymentTerms || undefined,
    };

    if (hasModifications) {
      payload.items = modifiedItems;
      payload.subtotal = subtotal;
      payload.tax_percentage = parseFloat(modifiedTaxPercentage);
      payload.tax_amount = tax;
      payload.discount_amount = parseFloat(modifiedDiscount);
      payload.total_amount = total;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Order approved successfully:', data);
        toast.success(hasModifications ? 'Order approved with modifications' : 'Order approved successfully');
        setIsApprovalDialogOpen(false);
        setSelectedOrder(null);
        await fetchOrders(); // Wait for refresh to complete
      } else {
        console.error('Failed to approve order:', data);
        toast.error(data.error || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Failed to approve order');
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason,
          admin_notes: adminNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Order rejected successfully:', data);
        toast.success('Order rejected');
        setIsApprovalDialogOpen(false);
        setSelectedOrder(null);
        setRejectionReason('');
        await fetchOrders(); // Wait for refresh to complete
      } else {
        console.error('Failed to reject order:', data);
        toast.error(data.error || 'Failed to reject order');
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
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

  const handleDispatch = async (orderId: string) => {
    if (!confirm('Mark this order as dispatched? This will transfer stock to the distributor.')) {
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'dispatched' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Order dispatched — stock transferred to distributor');
        await fetchOrders();
      } else {
        toast.error(data.error || 'Failed to dispatch order');
      }
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast.error('Failed to dispatch order');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_primary':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><Clock className="mr-1 h-3 w-3" />Awaiting Primary Review</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'dispatched':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300"><Package className="mr-1 h-3 w-3" />Dispatched</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Backend already filters by status, so we only apply search filter here
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    
    return order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.salesman_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_contact.includes(searchTerm);
  });

  const { subtotal: modSubtotal, tax: modTax, discount: modDiscount, total: modTotal } = calculateModifiedTotals();

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
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Order Approvals</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">Review and approve salesman orders</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
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
              <CardDescription className="text-yellow-700">Pending Review</CardDescription>
              <CardTitle className="text-3xl text-yellow-700">{summary.pending_count}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-600">
                <IndianRupee className="inline h-4 w-4" />
                {summary.pending_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

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

          <Card className="border-indigo-200 bg-indigo-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-indigo-700">Dispatched</CardDescription>
              <CardTitle className="text-3xl text-indigo-700">{summary.dispatched_count || 0}</CardTitle>
            </CardHeader>
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
                  placeholder="Search by order number, distributor, salesman..."
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
                variant={statusFilter === 'dispatched' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('dispatched')}
              >
                Dispatched
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Review and manage salesman orders</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No orders found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ? 'Try adjusting your search' : 'No orders to review'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Salesman</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center text-sm">
                        <User className="mr-1 h-4 w-4 text-gray-400" />
                        {order.salesman_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_contact}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{order.items.length} item(s)</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {order.admin_modified && (
                        <div className="text-xs text-blue-600">Modified</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(order)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.location_lat && order.location_lng && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedOrder(order); setIsMapDialogOpen(true); }}
                            title="View SE Location"
                          >
                            <MapPin className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(order)}
                          title="Download Bill"
                        >
                          <Download className="h-4 w-4 text-blue-600" />
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenApproval(order)}
                            title="Approve/Edit"
                          >
                            <Edit className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {order.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDispatch(order._id)}
                            title="Dispatch to Distributor"
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Dispatch
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.order_number} - {getStatusBadge(selectedOrder?.status || 'pending')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer & Salesman Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                    <p><strong>Contact:</strong> {selectedOrder.customer_contact}</p>
                    {selectedOrder.customer_address && <p><strong>Address:</strong> {selectedOrder.customer_address}</p>}
                    {selectedOrder.customer_gstin && <p><strong>GSTIN:</strong> {selectedOrder.customer_gstin}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Salesman Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedOrder.salesman_name}</p>
                    <p><strong>Submitted:</strong> {new Date(selectedOrder.submitted_at).toLocaleString('en-IN')}</p>
                    {selectedOrder.reviewed_at && (
                      <>
                        <p><strong>Reviewed:</strong> {new Date(selectedOrder.reviewed_at).toLocaleString('en-IN')}</p>
                        <p><strong>Reviewed By:</strong> {selectedOrder.reviewer_name}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Price/Unit</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>₹{item.price_per_unit.toFixed(2)}</TableCell>
                        <TableCell>₹{item.total_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pricing Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{selectedOrder.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({selectedOrder.tax_percentage}%):</span>
                  <span className="font-medium">₹{selectedOrder.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-medium">-₹{selectedOrder.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Amount:</span>
                  <span className="text-orange-600">₹{selectedOrder.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedOrder.admin_modified && selectedOrder.original_total && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Original Amount:</span>
                    <span>₹{selectedOrder.original_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Notes and Admin Info */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Salesman Notes</h3>
                  <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.admin_notes && (
                <div>
                  <h3 className="font-semibold mb-2">Admin Notes</h3>
                  <p className="text-sm text-gray-600">{selectedOrder.admin_notes}</p>
                </div>
              )}

              {selectedOrder.rejection_reason && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Rejection Reason</h3>
                  <p className="text-sm text-gray-600">{selectedOrder.rejection_reason}</p>
                </div>
              )}

              {/* SE Location */}
              {selectedOrder.location_lat && selectedOrder.location_lng && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />SE Location When Order Was Placed
                  </h3>
                  <Suspense fallback={<div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">Loading map...</div>}>
                    <SalesMap
                      markers={[{
                        lat: selectedOrder.location_lat,
                        lng: selectedOrder.location_lng,
                        popup: `${selectedOrder.salesman_name} — ${selectedOrder.order_number}`,
                        color: 'green',
                      }]}
                      className="h-[300px]"
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval/Rejection Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Order</DialogTitle>
            <DialogDescription>
              {selectedOrder?.order_number} - Modify and approve or reject
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Items - Editable */}
              <div>
                <h3 className="font-semibold mb-2">Order Items (Editable)</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[120px]">Quantity</TableHead>
                      <TableHead className="w-[100px]">Unit</TableHead>
                      <TableHead className="w-[150px]">Price/Unit (₹)</TableHead>
                      <TableHead>Total (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modifiedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price_per_unit}
                            onChange={(e) => handleItemChange(index, 'price_per_unit', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ₹{item.total_price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pricing Adjustments */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_percentage">Tax Percentage (%)</Label>
                  <Input
                    id="tax_percentage"
                    type="number"
                    step="0.01"
                    value={modifiedTaxPercentage}
                    onChange={(e) => setModifiedTaxPercentage(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={modifiedDiscount}
                    onChange={(e) => setModifiedDiscount(e.target.value)}
                  />
                </div>
              </div>

              {/* Modified Summary */}
              <div className="bg-orange-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{modSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax ({modifiedTaxPercentage}%):</span>
                  <span className="font-medium">₹{modTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span className="font-medium">-₹{modDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Amount:</span>
                  <span className="text-orange-600">₹{modTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {modTotal !== selectedOrder.total_amount && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Original Amount:</span>
                    <span>₹{selectedOrder.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_date">Delivery Date (Optional)</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_terms">Payment Terms (Optional)</Label>
                  <Input
                    id="payment_terms"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g., Net 30, Cash on Delivery"
                  />
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="admin_notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about modifications or approval..."
                  rows={3}
                />
              </div>

              {/* Rejection Reason */}
              <div>
                <Label htmlFor="rejection_reason">Rejection Reason (Required for rejection)</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this order is being rejected..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject Order
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Map Dialog */}
      <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />SE Location
            </DialogTitle>
            <DialogDescription>
              Location of {selectedOrder?.salesman_name} when placing order {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder?.location_lat && selectedOrder?.location_lng && (
            <Suspense fallback={<div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">Loading map...</div>}>
              <SalesMap
                markers={[{
                  lat: selectedOrder.location_lat,
                  lng: selectedOrder.location_lng,
                  popup: `${selectedOrder.salesman_name}<br/>${selectedOrder.customer_name}<br/>₹${selectedOrder.total_amount.toLocaleString('en-IN')}`,
                  color: 'green',
                }]}
                zoom={14}
              />
            </Suspense>
          )}
          <DialogFooter>
            <Button onClick={() => setIsMapDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
