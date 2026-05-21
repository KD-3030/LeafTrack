'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  discount_percentage?: number;
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
  const [discountMode, setDiscountMode] = useState<'amount' | 'percentage'>('amount');

  // New products, customers, company settings states
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [companyState, setCompanyState] = useState('West Bengal');

  const fetchCompanySettings = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/settings/company', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.settings?.state) {
        setCompanyState(data.settings.state);
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.customers) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/products?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchCustomers();
    fetchCompanySettings();
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

  const recalculateAllTotals = (
    itemsList: any[],
    custState: string,
    compState: string,
    orderDiscountMode: 'amount' | 'percentage',
    orderDiscountValueStr: string
  ) => {
    let totalGrossSubtotal = 0;
    
    // Calculate raw gross amounts first
    const itemsWithGross = itemsList.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price_per_unit) || 0;
      const grossAmount = qty * price;
      
      const itemDiscPct = Number(item.discount_percentage || 0);
      const itemDiscountAmount = (grossAmount * itemDiscPct) / 100;
      
      totalGrossSubtotal += grossAmount;
      return {
        ...item,
        grossAmount,
        itemDiscountAmount,
      };
    });

    const orderDiscountInput = parseFloat(orderDiscountValueStr) || 0;
    const orderDiscount = orderDiscountMode === 'percentage'
      ? (totalGrossSubtotal * orderDiscountInput) / 100
      : orderDiscountInput;

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;

    const isSameState = custState.trim().toLowerCase() === compState.trim().toLowerCase();

    const updatedItems = itemsWithGross.map(item => {
      // Proportional distribution of overall order discount
      const orderDiscShare = totalGrossSubtotal > 0
        ? (item.grossAmount / totalGrossSubtotal) * orderDiscount
        : 0;

      const totalItemDiscount = Math.round((item.itemDiscountAmount + orderDiscShare) * 100) / 100;
      const taxableAmount = Math.max(0, Math.round((item.grossAmount - totalItemDiscount) * 100) / 100);
      
      const gstRate = item.gst_rate || 18;
      const taxAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
      
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isSameState) {
        cgst = Math.round((taxAmount / 2) * 100) / 100;
        sgst = Math.round((taxAmount - cgst) * 100) / 100;
      } else {
        igst = taxAmount;
      }

      const totalItemPrice = Math.round((taxableAmount + taxAmount) * 100) / 100;

      subtotal += taxableAmount;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      totalTax += taxAmount;

      return {
        ...item,
        taxable_amount: taxableAmount,
        tax_amount: taxAmount,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_price: totalItemPrice,
      };
    });

    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

    return {
      updatedItems,
      subtotal,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      totalDiscount: orderDiscount,
      grandTotal,
    };
  };

  const updateItemsAndRecalculate = (newItems: any[], discountVal = modifiedDiscount, mode = discountMode) => {
    const customer = customers.find(c => c._id === selectedOrder?.customer_id || c._id === selectedOrder?.distributor_id);
    const custState = customer?.state || 'West Bengal';
    const calc = recalculateAllTotals(newItems, custState, companyState, mode, discountVal);
    setModifiedItems(calc.updatedItems);
  };

  const handleOpenApproval = (order: Order) => {
    setSelectedOrder(order);
    
    // Enrich items with products details if available
    const enriched = order.items.map(item => {
      const product = products.find(p => p._id === item.product_id);
      return {
        ...item,
        gst_rate: (item as any).gst_rate ?? product?.gst_rate ?? 18,
        discount_percentage: (item as any).discount_percentage ?? 0,
        hsn_code: (item as any).hsn_code ?? product?.hsn_code ?? '0000',
        taxable_amount: (item as any).taxable_amount ?? (item.quantity * item.price_per_unit),
        tax_amount: (item as any).tax_amount ?? 0,
        cgst_amount: (item as any).cgst_amount ?? 0,
        sgst_amount: (item as any).sgst_amount ?? 0,
        igst_amount: (item as any).igst_amount ?? 0,
      };
    });

    const customer = customers.find(c => c._id === order.customer_id || c._id === order.distributor_id);
    const custState = customer?.state || 'West Bengal';

    setModifiedItems(enriched);
    setAdminNotes('');
    setRejectionReason('');
    setDeliveryDate(order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '');
    setPaymentTerms(order.payment_terms || '');
    setModifiedTaxPercentage(order.tax_percentage.toString());
    
    let initialMode: 'amount' | 'percentage' = 'amount';
    let initialDiscount = '0';
    if (order.discount_percentage && order.discount_percentage > 0) {
      initialMode = 'percentage';
      initialDiscount = order.discount_percentage.toString();
    } else if (order.discount_amount && order.discount_amount > 0) {
      initialMode = 'amount';
      initialDiscount = order.discount_amount.toString();
    }
    
    setDiscountMode(initialMode);
    setModifiedDiscount(initialDiscount);
    setIsApprovalDialogOpen(true);
    
    // Run initial recalculation to populate splits
    setTimeout(() => {
      const calc = recalculateAllTotals(enriched, custState, companyState, initialMode, initialDiscount);
      setModifiedItems(calc.updatedItems);
    }, 50);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const basePrice = product.manufacturingCost * 1.3;
      const newItems = [...modifiedItems];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        product_name: product.name,
        unit: 'kg',
        price_per_unit: basePrice,
        hsn_code: product.hsn_code || '0000',
        gst_rate: product.gst_rate || 18,
        discount_percentage: 0,
      };
      updateItemsAndRecalculate(newItems);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...modifiedItems];
    if (field === 'quantity' || field === 'price_per_unit' || field === 'gst_rate' || field === 'discount_percentage') {
      newItems[index] = { ...newItems[index], [field]: Number(value) || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    updateItemsAndRecalculate(newItems);
  };

  const addModifiedItem = () => {
    const newItem: any = {
      product_name: '',
      quantity: 1,
      unit: 'kg',
      price_per_unit: 0,
      gst_rate: 18,
      discount_percentage: 0,
      total_price: 0,
    };
    updateItemsAndRecalculate([...modifiedItems, newItem]);
  };

  const removeModifiedItem = (index: number) => {
    if (modifiedItems.length === 1) {
      toast.error('Order must have at least one item');
      return;
    }
    const filtered = modifiedItems.filter((_, i) => i !== index);
    updateItemsAndRecalculate(filtered);
  };

  const calculateModifiedTotals = () => {
    const customer = customers.find(c => c._id === selectedOrder?.customer_id || c._id === selectedOrder?.distributor_id);
    const custState = customer?.state || 'West Bengal';
    const calc = recalculateAllTotals(modifiedItems, custState, companyState, discountMode, modifiedDiscount);
    return {
      subtotal: calc.subtotal,
      tax: calc.totalTax,
      discount: calc.totalDiscount,
      total: calc.grandTotal,
      cgst: calc.totalCgst,
      sgst: calc.totalSgst,
      igst: calc.totalIgst,
    };
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;

    const calc = calculateModifiedTotals();
    const customer = customers.find(c => c._id === selectedOrder.customer_id || c._id === selectedOrder.distributor_id);
    const custState = customer?.state || 'West Bengal';
    const fullCalcResult = recalculateAllTotals(modifiedItems, custState, companyState, discountMode, modifiedDiscount);

    const payload: Record<string, unknown> = {
      status: 'approved',
      admin_notes: adminNotes,
      delivery_date: deliveryDate || undefined,
      payment_terms: paymentTerms || undefined,
      items: fullCalcResult.updatedItems,
      subtotal: calc.subtotal,
      tax_percentage: fullCalcResult.updatedItems.length > 0 ? fullCalcResult.updatedItems[0].gst_rate : 18,
      tax_amount: calc.tax,
      discount_amount: calc.discount,
      discount_percentage: discountMode === 'percentage' ? parseFloat(modifiedDiscount) : 0,
      total_amount: calc.total,
      admin_modified: true,
    };

    if (!selectedOrder.admin_modified) {
      payload.original_total = selectedOrder.total_amount;
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
        toast.success('Order approved with modifications successfully');
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

  const {
    subtotal: modSubtotal,
    tax: modTax,
    discount: modDiscount,
    total: modTotal,
    cgst: modCgst,
    sgst: modSgst,
    igst: modIgst,
  } = calculateModifiedTotals();

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
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {selectedOrder?.order_number} - {getStatusBadge(selectedOrder?.status || 'pending')}
              </div>
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
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg text-gray-800">Order Items (Editable)</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addModifiedItem} className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                    <Package className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/70">
                        <TableRow>
                          <TableHead className="min-w-[220px]">Product</TableHead>
                          <TableHead className="w-[100px]">Qty</TableHead>
                          <TableHead className="w-[90px]">Unit</TableHead>
                          <TableHead className="w-[110px]">Price (₹)</TableHead>
                          <TableHead className="w-[90px]">Disc (%)</TableHead>
                          <TableHead className="w-[95px]">GST (%)</TableHead>
                          <TableHead className="text-right w-[100px]">Taxable (₹)</TableHead>
                          <TableHead className="text-right w-[110px]">Tax (₹)</TableHead>
                          <TableHead className="text-right w-[110px]">Total (₹)</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modifiedItems.map((item, index) => (
                          <TableRow key={index} className="hover:bg-orange-50/10">
                            <TableCell>
                              <Select value={item.product_id || ''} onValueChange={(v) => handleProductSelect(index, v)}>
                                <SelectTrigger className="w-full focus:ring-orange-500">
                                  <SelectValue placeholder="Select product..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p._id} value={p._id}>
                                      {p.name} {p.totalStock > 0 ? `(Stock: ${p.totalStock})` : '(No stock)'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!item.product_id && (
                                <Input
                                  className="mt-2 focus-visible:ring-orange-500"
                                  value={item.product_name}
                                  onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                  placeholder="Or enter manually"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                placeholder="0"
                                className="focus-visible:ring-orange-500"
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={item.unit} onValueChange={(v) => handleItemChange(index, 'unit', v)}>
                                <SelectTrigger className="focus:ring-orange-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">KG</SelectItem>
                                  <SelectItem value="box">Box</SelectItem>
                                  <SelectItem value="bag">Bag</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price_per_unit}
                                onChange={(e) => handleItemChange(index, 'price_per_unit', e.target.value)}
                                placeholder="0.00"
                                className="focus-visible:ring-orange-500"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.discount_percentage || 0}
                                onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                                placeholder="0"
                                className="focus-visible:ring-orange-500"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={(item.gst_rate ?? 18).toString()}
                                onValueChange={(v) => handleItemChange(index, 'gst_rate', v)}
                              >
                                <SelectTrigger className="focus:ring-orange-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="5">5%</SelectItem>
                                  <SelectItem value="12">12%</SelectItem>
                                  <SelectItem value="18">18%</SelectItem>
                                  <SelectItem value="28">28%</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              ₹{(item.taxable_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-gray-500 text-sm">
                              ₹{(item.tax_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <div className="text-[10px] text-gray-400">
                                {customers.find(c => c._id === selectedOrder.customer_id || c._id === selectedOrder.distributor_id)?.state?.trim()?.toLowerCase() === companyState.trim().toLowerCase() ? (
                                  <span>C:{((item.cgst_amount ?? 0)).toFixed(1)} S:{((item.sgst_amount ?? 0)).toFixed(1)}</span>
                                ) : (
                                  <span>I:{((item.igst_amount ?? 0)).toFixed(1)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-gray-900">
                              ₹{(item.total_price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeModifiedItem(index)}
                                disabled={modifiedItems.length === 1}
                                className="hover:bg-red-50 hover:text-red-500 text-gray-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Pricing Adjustments */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_mode">Discount Type</Label>
                  <Select value={discountMode} onValueChange={(v: 'amount' | 'percentage') => { setDiscountMode(v); setModifiedDiscount(''); }}>
                    <SelectTrigger id="discount_mode" className="focus:ring-orange-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Amount (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="discount_value">
                    {discountMode === 'percentage' ? 'Order-level Discount (%)' : 'Order-level Discount (₹)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    max={discountMode === 'percentage' ? '100' : undefined}
                    value={modifiedDiscount}
                    onChange={(e) => setModifiedDiscount(e.target.value)}
                    onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                    onBlur={(e) => { if (e.target.value === '') setModifiedDiscount('0'); }}
                    className="focus-visible:ring-orange-500"
                  />
                </div>
              </div>

              {/* Modified Summary */}
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl space-y-3">
                <h4 className="font-semibold text-sm text-orange-800 uppercase tracking-wider">Pricing Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-medium text-gray-900">₹{(modSubtotal + modDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {modDiscount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Discount{discountMode === 'percentage' ? ` (${modifiedDiscount}%)` : ''}:</span>
                      <span className="font-medium text-green-600">-₹{modDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600 pt-1 border-t border-dashed border-orange-200">
                    <span>Taxable Amount (Pre-Tax Subtotal):</span>
                    <span className="font-semibold text-gray-900">₹{modSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  {/* Tax Splits details */}
                  <div className="pl-4 border-l-2 border-orange-200 space-y-1">
                    {customers.find(c => c._id === selectedOrder.customer_id || c._id === selectedOrder.distributor_id)?.state?.trim()?.toLowerCase() === companyState.trim().toLowerCase() ? (
                      <>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Central GST (CGST):</span>
                          <span>₹{modCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>State GST (SGST):</span>
                          <span>₹{modSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Integrated GST (IGST):</span>
                        <span>₹{modIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-sm text-gray-600 pt-1 border-t border-dashed border-orange-200">
                    <span>Total GST Tax:</span>
                    <span className="font-medium text-gray-900">₹{modTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-orange-200 text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-orange-600">₹{modTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  {modTotal !== selectedOrder.total_amount && (
                    <div className="flex justify-between text-xs text-blue-600 pt-1">
                      <span>Original Order Amount:</span>
                      <span>₹{selectedOrder.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
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
