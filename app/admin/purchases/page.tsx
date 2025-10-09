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
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Package,
  IndianRupee,
  Calendar,
  Store,
  FileText,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Purchase {
  _id: string;
  purchase_number: string;
  purchase_date: string;
  product_name: string;
  product_category?: string;
  product_description?: string;
  quantity: number;
  unit: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date?: string;
  supplier_name: string;
  supplier_contact?: string;
  supplier_address?: string;
  supplier_gstin?: string;
  supplier_email?: string;
  unit_price: number;
  total_amount: number;
  is_taxable?: boolean;
  tax_amount?: number;
  tax_percentage?: number;
  discount_amount?: number;
  final_amount: number;
  payment_status: 'Pending' | 'Partial' | 'Paid';
  paid_amount: number;
  due_amount: number;
  payment_method?: string;
  payment_date?: string;
  invoice_number?: string;
  notes?: string;
  received_by?: string;
  quality_check?: 'Pass' | 'Fail' | 'Pending';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseSummary {
  total_purchases: number;
  total_amount: number;
  total_paid: number;
  total_due: number;
  pending_count: number;
  partial_count: number;
  paid_count: number;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [qualityCheckFilter, setQualityCheckFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    product_name: '',
    product_category: '',
    product_description: '',
    quantity: '',
    unit: 'kg',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    supplier_name: '',
    supplier_contact: '',
    supplier_address: '',
    supplier_gstin: '',
    supplier_email: '',
    unit_price: '',
    is_taxable: false,
    tax_percentage: '',
    discount_amount: '',
    paid_amount: '',
    payment_method: '',
    payment_date: '',
    invoice_number: '',
    notes: '',
    received_by: '',
    quality_check: 'Pending',
  });

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, paymentStatusFilter, qualityCheckFilter, fromDate, toDate]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (paymentStatusFilter && paymentStatusFilter !== 'all') params.append('payment_status', paymentStatusFilter);
      if (qualityCheckFilter && qualityCheckFilter !== 'all') params.append('quality_check', qualityCheckFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const response = await fetch(`/api/purchases?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPurchases(data.purchases);
        setSummary(data.summary);
      } else {
        toast.error(data.error || 'Failed to fetch purchases');
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateAmounts = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unit_price = parseFloat(formData.unit_price) || 0;
    const tax_percentage = formData.is_taxable ? (parseFloat(formData.tax_percentage) || 0) : 0;
    const discount_amount = parseFloat(formData.discount_amount) || 0;

    const total_amount = quantity * unit_price;
    const tax_amount = formData.is_taxable ? (total_amount * tax_percentage) / 100 : 0;
    const final_amount = total_amount + tax_amount - discount_amount;

    return { total_amount, tax_amount, final_amount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { total_amount, tax_amount, final_amount } = calculateAmounts();

    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      unit_price: parseFloat(formData.unit_price),
      total_amount,
      is_taxable: formData.is_taxable,
      tax_amount: formData.is_taxable ? tax_amount : 0,
      tax_percentage: formData.is_taxable ? (parseFloat(formData.tax_percentage) || 0) : 0,
      discount_amount: parseFloat(formData.discount_amount) || 0,
      final_amount,
      paid_amount: parseFloat(formData.paid_amount) || 0,
    };

    try {
      const token = localStorage.getItem('leaftrack_token');
      const url = isEditing
        ? `/api/purchases/${selectedPurchase?._id}`
        : '/api/purchases';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setIsDialogOpen(false);
        resetForm();
        fetchPurchases();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving purchase:', error);
      toast.error('Failed to save purchase');
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsEditing(true);
    setFormData({
      purchase_date: purchase.purchase_date.split('T')[0],
      product_name: purchase.product_name,
      product_category: purchase.product_category || '',
      product_description: purchase.product_description || '',
      quantity: purchase.quantity.toString(),
      unit: purchase.unit,
      batch_number: purchase.batch_number,
      manufacturing_date: purchase.manufacturing_date
        ? purchase.manufacturing_date.split('T')[0]
        : '',
      expiry_date: purchase.expiry_date ? purchase.expiry_date.split('T')[0] : '',
      supplier_name: purchase.supplier_name,
      supplier_contact: purchase.supplier_contact || '',
      supplier_address: purchase.supplier_address || '',
      supplier_gstin: purchase.supplier_gstin || '',
      supplier_email: purchase.supplier_email || '',
      unit_price: purchase.unit_price.toString(),
      is_taxable: purchase.is_taxable || false,
      tax_percentage: purchase.tax_percentage?.toString() || '',
      discount_amount: purchase.discount_amount?.toString() || '',
      paid_amount: purchase.paid_amount.toString(),
      payment_method: purchase.payment_method || '',
      payment_date: purchase.payment_date ? purchase.payment_date.split('T')[0] : '',
      invoice_number: purchase.invoice_number || '',
      notes: purchase.notes || '',
      received_by: purchase.received_by || '',
      quality_check: purchase.quality_check || 'Pending',
    });
    setIsDialogOpen(true);
  };

  const handleView = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Purchase deleted successfully');
        fetchPurchases();
      } else {
        toast.error(data.error || 'Failed to delete purchase');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error('Failed to delete purchase');
    }
  };

  const resetForm = () => {
    setFormData({
      purchase_date: new Date().toISOString().split('T')[0],
      product_name: '',
      product_category: '',
      product_description: '',
      quantity: '',
      unit: 'kg',
      batch_number: '',
      manufacturing_date: '',
      expiry_date: '',
      supplier_name: '',
      supplier_contact: '',
      supplier_address: '',
      supplier_gstin: '',
      supplier_email: '',
      unit_price: '',
      is_taxable: false,
      tax_percentage: '',
      discount_amount: '',
      paid_amount: '',
      payment_method: '',
      payment_date: '',
      invoice_number: '',
      notes: '',
      received_by: '',
      quality_check: 'Pending',
    });
    setIsEditing(false);
    setSelectedPurchase(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Pass':
        return 'bg-green-100 text-green-800';
      case 'Fail':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const { total_amount, tax_amount, final_amount } = calculateAmounts();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Management</h1>
          <p className="text-gray-600">Record and manage all material purchases</p>
        </div>
        <Button onClick={openAddDialog} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Purchases</CardDescription>
              <CardTitle className="text-2xl">{summary.total_purchases}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">
                Pending: {summary.pending_count} | Partial: {summary.partial_count} | Paid:{' '}
                {summary.paid_count}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Amount</CardDescription>
              <CardTitle className="text-2xl flex items-center">
                <IndianRupee className="h-5 w-5 mr-1" />
                {summary.total_amount.toLocaleString('en-IN')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">Sum of all purchases</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Paid</CardDescription>
              <CardTitle className="text-2xl flex items-center text-green-600">
                <IndianRupee className="h-5 w-5 mr-1" />
                {summary.total_paid.toLocaleString('en-IN')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">Amount paid to suppliers</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Due</CardDescription>
              <CardTitle className="text-2xl flex items-center text-red-600">
                <IndianRupee className="h-5 w-5 mr-1" />
                {summary.total_due.toLocaleString('en-IN')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">Outstanding payments</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search purchases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="payment-status">Payment Status</Label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger id="payment-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quality-check">Quality Check</Label>
              <Select value={qualityCheckFilter} onValueChange={setQualityCheckFilter}>
                <SelectTrigger id="quality-check">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setPaymentStatusFilter('all');
                setQualityCheckFilter('all');
                setFromDate('');
                setToDate('');
              }}
            >
              Clear Filters
            </Button>
            <Button variant="outline" onClick={fetchPurchases}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading purchases...</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No purchases found. Click &quot;Add Purchase&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell className="font-medium">
                        {purchase.purchase_number}
                      </TableCell>
                      <TableCell>
                        {new Date(purchase.purchase_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{purchase.product_name}</div>
                          {purchase.product_category && (
                            <div className="text-xs text-gray-500">
                              {purchase.product_category}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {purchase.quantity} {purchase.unit}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {purchase.batch_number}
                      </TableCell>
                      <TableCell>{purchase.supplier_name}</TableCell>
                      <TableCell className="font-medium">
                        ₹{purchase.final_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-green-600">
                        ₹{purchase.paid_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-red-600">
                        ₹{purchase.due_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            purchase.payment_status
                          )}`}
                        >
                          {purchase.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(
                            purchase.quality_check || 'Pending'
                          )}`}
                        >
                          {purchase.quality_check || 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(purchase)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(purchase)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(purchase._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Purchase' : 'Add New Purchase'}
            </DialogTitle>
            <DialogDescription>
              Enter all purchase details manually. All fields with * are required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Purchase Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Purchase Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_date">Purchase Date *</Label>
                  <Input
                    id="purchase_date"
                    name="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleInputChange}
                    placeholder="INV-12345"
                  />
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <Package className="mr-2 h-4 w-4" />
                Product Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Green Tea Leaves"
                  />
                </div>
                <div>
                  <Label htmlFor="product_category">Product Category</Label>
                  <Input
                    id="product_category"
                    name="product_category"
                    value={formData.product_category}
                    onChange={handleInputChange}
                    placeholder="e.g., Raw Materials"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="product_description">Product Description</Label>
                <Textarea
                  id="product_description"
                  name="product_description"
                  value={formData.product_description}
                  onChange={handleInputChange}
                  placeholder="Detailed description of the product..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => handleSelectChange('unit', value)}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="g">Gram (g)</SelectItem>
                      <SelectItem value="ton">Ton</SelectItem>
                      <SelectItem value="liter">Liter (L)</SelectItem>
                      <SelectItem value="ml">Milliliter (ml)</SelectItem>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="carton">Carton</SelectItem>
                      <SelectItem value="bag">Bag</SelectItem>
                      <SelectItem value="packet">Packet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    required
                    placeholder="500.00"
                  />
                </div>
              </div>
            </div>

            {/* Batch Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Batch Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="batch_number">Batch Number *</Label>
                  <Input
                    id="batch_number"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    required
                    placeholder="BATCH-2025-001"
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
                  <Input
                    id="manufacturing_date"
                    name="manufacturing_date"
                    type="date"
                    value={formData.manufacturing_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    name="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Supplier Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <Store className="mr-2 h-4 w-4" />
                Supplier Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_name">Supplier Name *</Label>
                  <Input
                    id="supplier_name"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleInputChange}
                    required
                    placeholder="ABC Trading Company"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier_contact">Supplier Contact</Label>
                  <Input
                    id="supplier_contact"
                    name="supplier_contact"
                    value={formData.supplier_contact}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="supplier_address">Supplier Address</Label>
                <Textarea
                  id="supplier_address"
                  name="supplier_address"
                  value={formData.supplier_address}
                  onChange={handleInputChange}
                  placeholder="Full address of the supplier..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_gstin">Supplier GSTIN</Label>
                  <Input
                    id="supplier_gstin"
                    name="supplier_gstin"
                    value={formData.supplier_gstin}
                    onChange={handleInputChange}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier_email">Supplier Email</Label>
                  <Input
                    id="supplier_email"
                    name="supplier_email"
                    type="email"
                    value={formData.supplier_email}
                    onChange={handleInputChange}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <IndianRupee className="mr-2 h-4 w-4" />
                Pricing Details
              </h3>
              
              {/* Is Taxable Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_taxable"
                  checked={formData.is_taxable}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      is_taxable: checked as boolean,
                      tax_percentage: checked ? formData.tax_percentage : '',
                    });
                  }}
                />
                <Label htmlFor="is_taxable" className="text-sm font-normal cursor-pointer">
                  This purchase is taxable (includes GST/Tax)
                </Label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {formData.is_taxable && (
                  <div>
                    <Label htmlFor="tax_percentage">Tax Percentage (%) *</Label>
                    <Input
                      id="tax_percentage"
                      name="tax_percentage"
                      type="number"
                      step="0.01"
                      value={formData.tax_percentage}
                      onChange={handleInputChange}
                      placeholder="18"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                  <Input
                    id="discount_amount"
                    name="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={handleInputChange}
                    placeholder="500.00"
                  />
                </div>
                <div>
                  <Label htmlFor="paid_amount">Paid Amount (₹)</Label>
                  <Input
                    id="paid_amount"
                    name="paid_amount"
                    type="number"
                    step="0.01"
                    value={formData.paid_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Calculated Amounts Display */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">
                    ₹{total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {formData.is_taxable && (
                  <div className="flex justify-between text-sm">
                    <span>Tax Amount ({formData.tax_percentage || 0}%):</span>
                    <span className="font-medium">
                      ₹{tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span className="font-medium">
                    - ₹
                    {(parseFloat(formData.discount_amount) || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Final Amount:</span>
                  <span className="text-blue-600">
                    ₹{final_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Due Amount:</span>
                  <span className="font-medium">
                    ₹
                    {(final_amount - (parseFloat(formData.paid_amount) || 0)).toLocaleString(
                      'en-IN',
                      { minimumFractionDigits: 2 }
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => handleSelectChange('payment_method', value)}
                  >
                    <SelectTrigger id="payment_method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_date">Payment Date</Label>
                  <Input
                    id="payment_date"
                    name="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Additional Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="received_by">Received By</Label>
                  <Input
                    id="received_by"
                    name="received_by"
                    value={formData.received_by}
                    onChange={handleInputChange}
                    placeholder="Person who received the goods"
                  />
                </div>
                <div>
                  <Label htmlFor="quality_check">Quality Check</Label>
                  <Select
                    value={formData.quality_check}
                    onValueChange={(value) => handleSelectChange('quality_check', value)}
                  >
                    <SelectTrigger id="quality_check">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Any additional notes or remarks..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Purchase' : 'Create Purchase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Purchase Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
            <DialogDescription>
              {selectedPurchase?.purchase_number} - Complete purchase information
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-6">
              {/* Purchase Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Purchase Number</Label>
                  <p className="font-medium">{selectedPurchase.purchase_number}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Purchase Date</Label>
                  <p className="font-medium">
                    {new Date(selectedPurchase.purchase_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Product Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Product Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Product Name</Label>
                    <p className="font-medium">{selectedPurchase.product_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Category</Label>
                    <p className="font-medium">
                      {selectedPurchase.product_category || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Quantity</Label>
                    <p className="font-medium">
                      {selectedPurchase.quantity} {selectedPurchase.unit}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Unit Price</Label>
                    <p className="font-medium">
                      ₹{selectedPurchase.unit_price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                {selectedPurchase.product_description && (
                  <div className="mt-2">
                    <Label className="text-gray-600">Description</Label>
                    <p className="text-sm">{selectedPurchase.product_description}</p>
                  </div>
                )}
              </div>

              {/* Batch Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Batch Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-600">Batch Number</Label>
                    <p className="font-medium font-mono">{selectedPurchase.batch_number}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Manufacturing Date</Label>
                    <p className="font-medium">
                      {selectedPurchase.manufacturing_date
                        ? new Date(selectedPurchase.manufacturing_date).toLocaleDateString(
                            'en-IN'
                          )
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Expiry Date</Label>
                    <p className="font-medium">
                      {selectedPurchase.expiry_date
                        ? new Date(selectedPurchase.expiry_date).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Supplier Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Supplier Name</Label>
                    <p className="font-medium">{selectedPurchase.supplier_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Contact</Label>
                    <p className="font-medium">{selectedPurchase.supplier_contact || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">GSTIN</Label>
                    <p className="font-medium">{selectedPurchase.supplier_gstin || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Email</Label>
                    <p className="font-medium">{selectedPurchase.supplier_email || 'N/A'}</p>
                  </div>
                </div>
                {selectedPurchase.supplier_address && (
                  <div className="mt-2">
                    <Label className="text-gray-600">Address</Label>
                    <p className="text-sm">{selectedPurchase.supplier_address}</p>
                  </div>
                )}
              </div>

              {/* Pricing Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Pricing Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">
                      ₹{selectedPurchase.total_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {selectedPurchase.is_taxable && (
                    <div className="flex justify-between">
                      <span>Tax ({selectedPurchase.tax_percentage}%):</span>
                      <span className="font-medium">
                        ₹{(selectedPurchase.tax_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-medium">
                      - ₹{(selectedPurchase.discount_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Final Amount:</span>
                    <span className="text-blue-600">
                      ₹{selectedPurchase.final_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Paid Amount:</span>
                    <span className="font-medium">
                      ₹{selectedPurchase.paid_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Due Amount:</span>
                    <span className="font-medium">
                      ₹{selectedPurchase.due_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label className="text-gray-600">Payment Status</Label>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        selectedPurchase.payment_status
                      )}`}
                    >
                      {selectedPurchase.payment_status}
                    </span>
                  </div>
                  <div>
                    <Label className="text-gray-600">Payment Method</Label>
                    <p className="font-medium">{selectedPurchase.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Payment Date</Label>
                    <p className="font-medium">
                      {selectedPurchase.payment_date
                        ? new Date(selectedPurchase.payment_date).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Invoice Number</Label>
                    <p className="font-medium">{selectedPurchase.invoice_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Received By</Label>
                    <p className="font-medium">{selectedPurchase.received_by || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Quality Check</Label>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getQualityColor(
                        selectedPurchase.quality_check || 'Pending'
                      )}`}
                    >
                      {selectedPurchase.quality_check || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <Label className="text-gray-600">Created By</Label>
                    <p className="font-medium">{selectedPurchase.created_by || 'N/A'}</p>
                  </div>
                </div>
                {selectedPurchase.notes && (
                  <div className="mt-2">
                    <Label className="text-gray-600">Notes</Label>
                    <p className="text-sm">{selectedPurchase.notes}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="border-t pt-4 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>
                    Created: {new Date(selectedPurchase.created_at).toLocaleString('en-IN')}
                  </span>
                  <span>
                    Updated: {new Date(selectedPurchase.updated_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedPurchase) {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedPurchase);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
