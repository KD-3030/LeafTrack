'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Filter, Eye, RefreshCw, ArrowLeft, Trash2, Package, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface Product {
  _id: string;
  name: string;
  manufacturingCost: number;
  gst_rate: number;
  hsn_code: string;
  totalStock: number;
}

interface SaleReturn {
  _id: string;
  return_number: string;
  customer_details: {
    name: string;
    email?: string;
    phone?: string;
  };
  return_items: {
    product_name: string;
    quantity_returned: number;
    unit_price: number;
    total_amount: number;
    condition?: string;
    reason?: string;
  }[];
  total_refund_amount: number;
  status: 'Pending' | 'Processing' | 'Rejected' | 'Completed';
  refund_status: 'Pending' | 'Processed' | 'Failed';
  refund_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit Note';
  return_date: string;
  return_reason?: string;
  notes?: string;
  created_at: string;
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  condition: 'Good' | 'Damaged' | 'Defective';
  reason: string;
}

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refundStatusFilter, setRefundStatusFilter] = useState('all');

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit Note'>('Cash');
  const [notes, setNotes] = useState('');

  // Add item form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemCondition, setItemCondition] = useState<'Good' | 'Damaged' | 'Defective'>('Good');
  const [itemReason, setItemReason] = useState('');

  useEffect(() => {
    loadReturns();
    loadCustomers();
    loadProducts();
  }, []);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/sale-returns', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setReturns(data.returns || []);
      } else {
        toast.error('Failed to load sale returns');
      }
    } catch (error) {
      console.error('Error loading sale returns:', error);
      toast.error('Failed to load sale returns');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!confirm('Are you sure you want to delete this sale return? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/sale-returns/${returnId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sale return deleted successfully');
        loadReturns();
      } else {
        toast.error(data.error || 'Failed to delete sale return');
      }
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('Failed to delete sale return');
    }
  };

  const handleDownloadReturn = (ret: SaleReturn) => {
    // Create a simple text receipt
    const content = `
SALE RETURN RECEIPT
${'='.repeat(50)}

Return Number: ${ret.return_number}
Return Date: ${new Date(ret.return_date).toLocaleString()}
Customer: ${ret.customer_details.name}
Email: ${ret.customer_details.email || 'N/A'}
Phone: ${ret.customer_details.phone || 'N/A'}

Status: ${ret.status}
Refund Status: ${ret.refund_status}

${'='.repeat(50)}
RETURN ITEMS
${'='.repeat(50)}

${ret.return_items.map((item, idx) => `
${idx + 1}. ${item.product_name}
   Quantity: ${item.quantity_returned}
   Unit Price: ₹${(item.unit_price || 0).toFixed(2)}
   Condition: ${item.condition}
   Total: ₹${((item.quantity_returned * (item.unit_price || 0))).toFixed(2)}
   ${item.reason ? `Reason: ${item.reason}` : ''}
`).join('\n')}

${'='.repeat(50)}
TOTAL REFUND AMOUNT: ₹${(ret.total_refund_amount || 0).toFixed(2)}
${'='.repeat(50)}

${ret.notes ? `Notes: ${ret.notes}\n` : ''}
Generated on: ${new Date().toLocaleString()}
    `;

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sale-return-${ret.return_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Sale return downloaded successfully');
  };

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addReturnItem = () => {
    const product = products.find(p => p._id === selectedProductId);
    if (!product) {
      toast.error('Please select a product');
      return;
    }

    if (itemQuantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (!itemReason.trim()) {
      toast.error('Please provide a reason for return');
      return;
    }

    // Calculate price with GST: manufacturing cost + (cost × GST rate / 100)
    const manufacturingCost = Number(product.manufacturingCost) || 0;
    const gstRate = Number(product.gst_rate) || 0;
    const priceWithGST = manufacturingCost * (1 + gstRate / 100);

    const newItem: ReturnItem = {
      product_id: product._id,
      product_name: product.name,
      quantity: itemQuantity,
      unit_price: Number(priceWithGST.toFixed(2)) || 0,
      condition: itemCondition,
      reason: itemReason,
    };

    setReturnItems([...returnItems, newItem]);

    // Reset form
    setSelectedProductId('');
    setItemQuantity(1);
    setItemCondition('Good');
    setItemReason('');
  };

  const removeReturnItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const calculateTotalRefund = () => {
    return returnItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  };

  const handleSubmit = async () => {
    try {
      if (!selectedCustomerId) {
        toast.error('Please select a customer');
        return;
      }

      if (returnItems.length === 0) {
        toast.error('Please add at least one item to return');
        return;
      }

      if (!returnReason.trim()) {
        toast.error('Please provide a return reason');
        return;
      }

      const customer = customers.find(c => c._id === selectedCustomerId);
      if (!customer) {
        toast.error('Invalid customer selected');
        return;
      }

      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/sale-returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_details: {
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
          },
          return_date: returnDate,
          return_items: returnItems.map(item => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unit_price) || 0;
            return {
              product_name: item.product_name,
              quantity_returned: quantity,
              unit_price: unitPrice,
              total_amount: quantity * unitPrice,
              condition: item.condition,
              reason: item.reason,
            };
          }),
          total_refund_amount: calculateTotalRefund(),
          refund_method: refundMethod,
          return_reason: returnReason,
          status: 'Pending',
          refund_status: 'Pending',
          is_manual_entry: true,
          notes: notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Sale return created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        loadReturns();
      } else {
        toast.error(data.error || 'Failed to create sale return');
      }
    } catch (error) {
      console.error('Error creating sale return:', error);
      toast.error('Failed to create sale return');
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnItems([]);
    setReturnReason('');
    setRefundMethod('Cash');
    setNotes('');
    setSelectedProductId('');
    setItemQuantity(1);
    setItemCondition('Good');
    setItemReason('');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Processing: 'bg-blue-100 text-blue-800',
      Completed: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const getRefundStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-orange-100 text-orange-800',
      Processed: 'bg-green-100 text-green-800',
      Failed: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customer_details.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ret.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesRefundStatus = refundStatusFilter === 'all' || ret.refund_status.toLowerCase() === refundStatusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesRefundStatus;
  });

  const totalReturns = returns.length;
  const totalRefundAmount = returns.reduce((sum, ret) => sum + (Number(ret.total_refund_amount) || 0), 0);
  const pendingReturns = returns.filter(ret => ret.status === 'Pending').length;
  const completedReturns = returns.filter(ret => ret.status === 'Completed').length;

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Returns Management</h1>
            <p className="text-gray-600 mt-1">Manage product returns and refunds</p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Return
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <ArrowLeft className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReturns}</div>
              <p className="text-xs text-gray-600">All time returns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Refund Amount</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRefundAmount.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Total refunded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReturns}</div>
              <p className="text-xs text-gray-600">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <ArrowLeft className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReturns}</div>
              <p className="text-xs text-gray-600">Successfully processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by return number or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Refund Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Refund Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadReturns}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Returns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sale Returns</CardTitle>
            <CardDescription>List of all product returns and refunds</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Refund Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Refund Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No returns found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturns.map((ret) => (
                      <TableRow key={ret._id}>
                        <TableCell className="font-medium">{ret.return_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{ret.customer_details.name}</div>
                            {ret.customer_details.email && (
                              <div className="text-sm text-gray-600">{ret.customer_details.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(ret.return_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{ret.return_items.length} item(s)</TableCell>
                        <TableCell className="font-medium">
                          ₹{(ret.total_refund_amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(ret.status)}</TableCell>
                        <TableCell>{getRefundStatusBadge(ret.refund_status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReturn(ret);
                                setIsViewDialogOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadReturn(ret)}
                              title="Download Return"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteReturn(ret._id)}
                              title="Delete Return"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Return Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sale Return</DialogTitle>
              <DialogDescription>
                Create a new product return with customer and product details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Customer and Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.name} {customer.email && `(${customer.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnDate">Return Date *</Label>
                  <Input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Add Return Item Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Return Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product">Product *</Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => {
                            const manufacturingCost = Number(product.manufacturingCost) || 0;
                            const gstRate = Number(product.gst_rate) || 0;
                            const priceWithGST = manufacturingCost * (1 + gstRate / 100);
                            return (
                              <SelectItem key={product._id} value={product._id}>
                                {product.name} - ₹{priceWithGST.toFixed(2)} (₹{manufacturingCost.toFixed(2)} + {gstRate}% GST)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition">Condition *</Label>
                      <Select value={itemCondition} onValueChange={(value) => setItemCondition(value as 'Good' | 'Damaged' | 'Defective')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Damaged">Damaged</SelectItem>
                          <SelectItem value="Defective">Defective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="itemReason">Item Return Reason *</Label>
                      <Input
                        id="itemReason"
                        placeholder="e.g., Wrong item, Quality issue"
                        value={itemReason}
                        onChange={(e) => setItemReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={addReturnItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item to Return
                  </Button>
                </CardContent>
              </Card>

              {/* Return Items List */}
              {returnItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Return Items ({returnItems.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-sm text-gray-600">{item.reason}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{(item.unit_price || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={item.condition === 'Good' ? 'default' : 'destructive'}>
                                {item.condition}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              ₹{(item.quantity * (item.unit_price || 0)).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeReturnItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={4} className="text-right font-bold">
                            Total Refund Amount:
                          </TableCell>
                          <TableCell className="font-bold text-lg">
                            ₹{calculateTotalRefund().toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Return Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="returnReason">Overall Return Reason *</Label>
                  <Textarea
                    id="returnReason"
                    placeholder="Describe the reason for this return..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refundMethod">Refund Method *</Label>
                  <Select value={refundMethod} onValueChange={(value) => setRefundMethod(value as 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit Note')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Credit Note">Credit Note</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label htmlFor="notes" className="mt-4">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                Submit Return
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Return Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Return Details - {selectedReturn?.return_number}</DialogTitle>
            </DialogHeader>

            {selectedReturn && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Customer Details</h3>
                    <p className="text-sm"><strong>Name:</strong> {selectedReturn.customer_details.name}</p>
                    {selectedReturn.customer_details.email && (
                      <p className="text-sm"><strong>Email:</strong> {selectedReturn.customer_details.email}</p>
                    )}
                    {selectedReturn.customer_details.phone && (
                      <p className="text-sm"><strong>Phone:</strong> {selectedReturn.customer_details.phone}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Return Information</h3>
                    <p className="text-sm"><strong>Date:</strong> {new Date(selectedReturn.return_date).toLocaleDateString()}</p>
                    <p className="text-sm"><strong>Status:</strong> {getStatusBadge(selectedReturn.status)}</p>
                    <p className="text-sm"><strong>Refund Status:</strong> {getRefundStatusBadge(selectedReturn.refund_status)}</p>
                    <p className="text-sm"><strong>Refund Method:</strong> {selectedReturn.refund_method}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Return Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.return_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity_returned}</TableCell>
                          <TableCell>₹{(item.unit_price || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{(item.total_amount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">Total Refund:</TableCell>
                        <TableCell className="font-bold">₹{(selectedReturn.total_refund_amount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {selectedReturn.return_reason && (
                  <div>
                    <h3 className="font-semibold mb-2">Return Reason</h3>
                    <p className="text-sm text-gray-700">{selectedReturn.return_reason}</p>
                  </div>
                )}

                {selectedReturn.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-gray-700">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
