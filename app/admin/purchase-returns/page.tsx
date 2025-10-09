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
  PackageX,
  Package,
  IndianRupee,
  Calendar,
  Store,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface PurchaseReturn {
  _id: string;
  return_number: string;
  return_date: string;
  original_purchase_number?: string;
  product_name: string;
  product_category?: string;
  product_description?: string;
  returned_quantity: number;
  unit: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date?: string;
  supplier_name: string;
  supplier_contact?: string;
  supplier_address?: string;
  supplier_gstin?: string;
  supplier_email?: string;
  return_reason: string;
  return_type: 'Quality Issue' | 'Damaged' | 'Expired' | 'Wrong Item' | 'Excess Stock' | 'Other';
  unit_price: number;
  total_return_amount: number;
  tax_amount?: number;
  tax_percentage?: number;
  discount_amount?: number;
  final_return_amount: number;
  refund_status: 'Pending' | 'Partial' | 'Completed' | 'Rejected';
  refunded_amount: number;
  pending_refund_amount: number;
  refund_method?: string;
  refund_date?: string;
  debit_note_number?: string;
  notes?: string;
  returned_by?: string;
  condition_on_return?: 'Good' | 'Damaged' | 'Unusable';
  approval_status?: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface ReturnSummary {
  total_returns: number;
  total_return_amount: number;
  total_refunded: number;
  total_pending_refund: number;
  pending_count: number;
  partial_count: number;
  completed_count: number;
  rejected_count: number;
  approval_pending_count: number;
  approved_count: number;
  rejected_approval_count: number;
}

interface Purchase {
  _id: string;
  purchase_number: string;
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
  tax_percentage?: number;
  discount_amount?: number;
}

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Purchases for dropdown
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [refundStatusFilter, setRefundStatusFilter] = useState('all');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('all');
  const [returnTypeFilter, setReturnTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    purchase_id: '',
    return_date: new Date().toISOString().split('T')[0],
    original_purchase_number: '',
    product_name: '',
    product_category: '',
    product_description: '',
    returned_quantity: '',
    original_quantity: '',
    unit: 'kg',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    supplier_name: '',
    supplier_contact: '',
    supplier_address: '',
    supplier_gstin: '',
    supplier_email: '',
    return_reason: '',
    return_type: 'Other' as PurchaseReturn['return_type'],
    unit_price: '',
    tax_percentage: '',
    discount_amount: '',
    refunded_amount: '',
    refund_method: '',
    refund_date: '',
    debit_note_number: '',
    notes: '',
    returned_by: '',
    condition_on_return: 'Good' as PurchaseReturn['condition_on_return'],
    approval_status: 'Pending' as PurchaseReturn['approval_status'],
  });

  useEffect(() => {
    fetchReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, refundStatusFilter, approvalStatusFilter, returnTypeFilter, fromDate, toDate]);

  useEffect(() => {
    if (isDialogOpen && !isEditing) {
      fetchPurchases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, isEditing]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (refundStatusFilter && refundStatusFilter !== 'all') params.append('refund_status', refundStatusFilter);
      if (approvalStatusFilter && approvalStatusFilter !== 'all') params.append('approval_status', approvalStatusFilter);
      if (returnTypeFilter && returnTypeFilter !== 'all') params.append('return_type', returnTypeFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const response = await fetch(`/api/purchase-returns?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setReturns(data.returns);
        setSummary(data.summary);
      } else {
        toast.error(data.error || 'Failed to fetch purchase returns');
      }
    } catch (error) {
      console.error('Error fetching purchase returns:', error);
      toast.error('Failed to fetch purchase returns');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoadingPurchases(true);
      const token = localStorage.getItem('leaftrack_token');

      const response = await fetch('/api/purchase-returns/purchases', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPurchases(data.purchases);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to fetch purchases');
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handlePurchaseSelect = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    
    const purchase = purchases.find(p => p._id === purchaseId);
    if (purchase) {
      setFormData({
        ...formData,
        purchase_id: purchase._id,
        original_purchase_number: purchase.purchase_number,
        product_name: purchase.product_name,
        product_category: purchase.product_category || '',
        product_description: purchase.product_description || '',
        original_quantity: purchase.quantity.toString(),
        returned_quantity: '', // User will enter this
        unit: purchase.unit,
        batch_number: purchase.batch_number,
        manufacturing_date: purchase.manufacturing_date ? purchase.manufacturing_date.split('T')[0] : '',
        expiry_date: purchase.expiry_date ? purchase.expiry_date.split('T')[0] : '',
        supplier_name: purchase.supplier_name,
        supplier_contact: purchase.supplier_contact || '',
        supplier_address: purchase.supplier_address || '',
        supplier_gstin: purchase.supplier_gstin || '',
        supplier_email: purchase.supplier_email || '',
        unit_price: purchase.unit_price.toString(),
        tax_percentage: purchase.tax_percentage?.toString() || '',
        discount_amount: purchase.discount_amount?.toString() || '',
      });
      toast.success('Purchase details loaded');
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
    const quantity = parseFloat(formData.returned_quantity) || 0;
    const unit_price = parseFloat(formData.unit_price) || 0;
    const tax_percentage = parseFloat(formData.tax_percentage) || 0;
    const discount_amount = parseFloat(formData.discount_amount) || 0;

    const total_return_amount = quantity * unit_price;
    const tax_amount = (total_return_amount * tax_percentage) / 100;
    const final_return_amount = total_return_amount + tax_amount - discount_amount;

    return { total_return_amount, tax_amount, final_return_amount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { total_return_amount, tax_amount, final_return_amount } = calculateAmounts();
    const refunded_amount = parseFloat(formData.refunded_amount) || 0;
    const pending_refund_amount = final_return_amount - refunded_amount;

    const payload = {
      ...formData,
      purchase_id: selectedPurchaseId || undefined,
      original_quantity: formData.original_quantity ? parseFloat(formData.original_quantity) : undefined,
      returned_quantity: parseFloat(formData.returned_quantity),
      unit_price: parseFloat(formData.unit_price),
      total_return_amount,
      tax_amount,
      tax_percentage: parseFloat(formData.tax_percentage) || 0,
      discount_amount: parseFloat(formData.discount_amount) || 0,
      final_return_amount,
      refunded_amount,
      pending_refund_amount,
    };

    try {
      const token = localStorage.getItem('leaftrack_token');
      const url = isEditing
        ? `/api/purchase-returns/${selectedReturn?._id}`
        : '/api/purchase-returns';
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
        fetchReturns();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving purchase return:', error);
      toast.error('Failed to save purchase return');
    }
  };

  const handleEdit = (returnItem: PurchaseReturn) => {
    setSelectedReturn(returnItem);
    setIsEditing(true);
    setFormData({
      purchase_id: '',
      return_date: returnItem.return_date.split('T')[0],
      original_purchase_number: returnItem.original_purchase_number || '',
      product_name: returnItem.product_name,
      product_category: returnItem.product_category || '',
      product_description: returnItem.product_description || '',
      returned_quantity: returnItem.returned_quantity.toString(),
      original_quantity: '',
      unit: returnItem.unit,
      batch_number: returnItem.batch_number,
      manufacturing_date: returnItem.manufacturing_date
        ? returnItem.manufacturing_date.split('T')[0]
        : '',
      expiry_date: returnItem.expiry_date ? returnItem.expiry_date.split('T')[0] : '',
      supplier_name: returnItem.supplier_name,
      supplier_contact: returnItem.supplier_contact || '',
      supplier_address: returnItem.supplier_address || '',
      supplier_gstin: returnItem.supplier_gstin || '',
      supplier_email: returnItem.supplier_email || '',
      return_reason: returnItem.return_reason,
      return_type: returnItem.return_type,
      unit_price: returnItem.unit_price.toString(),
      tax_percentage: returnItem.tax_percentage?.toString() || '',
      discount_amount: returnItem.discount_amount?.toString() || '',
      refunded_amount: returnItem.refunded_amount.toString(),
      refund_method: returnItem.refund_method || '',
      refund_date: returnItem.refund_date ? returnItem.refund_date.split('T')[0] : '',
      debit_note_number: returnItem.debit_note_number || '',
      notes: returnItem.notes || '',
      returned_by: returnItem.returned_by || '',
      condition_on_return: returnItem.condition_on_return || 'Good',
      approval_status: returnItem.approval_status || 'Pending',
    });
    setIsDialogOpen(true);
  };

  const handleView = (returnItem: PurchaseReturn) => {
    setSelectedReturn(returnItem);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase return record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/purchase-returns/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Purchase return deleted successfully');
        fetchReturns();
      } else {
        toast.error(data.error || 'Failed to delete purchase return');
      }
    } catch (error) {
      console.error('Error deleting purchase return:', error);
      toast.error('Failed to delete purchase return');
    }
  };

  const resetForm = () => {
    setFormData({
      purchase_id: '',
      return_date: new Date().toISOString().split('T')[0],
      original_purchase_number: '',
      product_name: '',
      product_category: '',
      product_description: '',
      returned_quantity: '',
      original_quantity: '',
      unit: 'kg',
      batch_number: '',
      manufacturing_date: '',
      expiry_date: '',
      supplier_name: '',
      supplier_contact: '',
      supplier_address: '',
      supplier_gstin: '',
      supplier_email: '',
      return_reason: '',
      return_type: 'Other',
      unit_price: '',
      tax_percentage: '',
      discount_amount: '',
      refunded_amount: '',
      refund_method: '',
      refund_date: '',
      debit_note_number: '',
      notes: '',
      returned_by: '',
      condition_on_return: 'Good',
      approval_status: 'Pending',
    });
    setIsEditing(false);
    setSelectedReturn(null);
    setSelectedPurchaseId('');
    setPurchases([]);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getRefundStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReturnTypeColor = (type: string) => {
    switch (type) {
      case 'Quality Issue':
        return 'bg-red-100 text-red-800';
      case 'Damaged':
        return 'bg-orange-100 text-orange-800';
      case 'Expired':
        return 'bg-purple-100 text-purple-800';
      case 'Wrong Item':
        return 'bg-yellow-100 text-yellow-800';
      case 'Excess Stock':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const { total_return_amount, tax_amount, final_return_amount } = calculateAmounts();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Returns Management</h1>
          <p className="text-gray-600">Record and manage all returned materials</p>
        </div>
        <Button onClick={openAddDialog} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Return
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Returns</CardDescription>
              <CardTitle className="text-2xl">{summary.total_returns}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">
                Pending: {summary.pending_count} | Partial: {summary.partial_count} | Completed:{' '}
                {summary.completed_count}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Return Amount</CardDescription>
              <CardTitle className="text-2xl flex items-center">
                <IndianRupee className="h-5 w-5 mr-1" />
                {summary.total_return_amount.toLocaleString('en-IN')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">Sum of all returns</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Refunded</CardDescription>
              <CardTitle className="text-2xl flex items-center text-green-600">
                <IndianRupee className="h-5 w-5 mr-1" />
                {summary.total_refunded.toLocaleString('en-IN')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">Amount refunded</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Refund</CardDescription>
              <CardTitle className="text-2xl flex items-center text-orange-600">
                <IndianRupee className="h-5 w-5 mr-1" />
                {summary.total_pending_refund.toLocaleString('en-IN')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600">
                Approval Pending: {summary.approval_pending_count}
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="refund-status">Refund Status</Label>
              <Select value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
                <SelectTrigger id="refund-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="approval-status">Approval Status</Label>
              <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                <SelectTrigger id="approval-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="return-type">Return Type</Label>
              <Select value={returnTypeFilter} onValueChange={setReturnTypeFilter}>
                <SelectTrigger id="return-type">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                  <SelectItem value="Excess Stock">Excess Stock</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
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
                setRefundStatusFilter('all');
                setApprovalStatusFilter('all');
                setReturnTypeFilter('all');
                setFromDate('');
                setToDate('');
              }}
            >
              Clear Filters
            </Button>
            <Button variant="outline" onClick={fetchReturns}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading returns...</div>
          ) : returns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No returns found. Click &quot;Add Return&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Return Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Refunded</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Refund Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((returnItem) => (
                    <TableRow key={returnItem._id}>
                      <TableCell className="font-medium">
                        {returnItem.return_number}
                      </TableCell>
                      <TableCell>
                        {new Date(returnItem.return_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{returnItem.product_name}</div>
                          {returnItem.product_category && (
                            <div className="text-xs text-gray-500">
                              {returnItem.product_category}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {returnItem.returned_quantity} {returnItem.unit}
                      </TableCell>
                      <TableCell>{returnItem.supplier_name}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getReturnTypeColor(
                            returnItem.return_type
                          )}`}
                        >
                          {returnItem.return_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{returnItem.final_return_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-green-600">
                        ₹{returnItem.refunded_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        ₹{returnItem.pending_refund_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getRefundStatusColor(
                            returnItem.refund_status
                          )}`}
                        >
                          {returnItem.refund_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getApprovalStatusColor(
                            returnItem.approval_status || 'Pending'
                          )}`}
                        >
                          {returnItem.approval_status || 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(returnItem)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(returnItem)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(returnItem._id)}
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

      {/* Add/Edit Dialog - Will continue in next part due to length */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Purchase Return' : 'Add New Purchase Return'}
            </DialogTitle>
            <DialogDescription>
              Enter all return details manually. All fields with * are required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Purchase Selection */}
            {!isEditing && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold flex items-center text-blue-900">
                  <Package className="mr-2 h-4 w-4" />
                  Select Purchase to Return
                </h3>
                <div>
                  <Label htmlFor="purchase_select">Search and Select Purchase *</Label>
                  <Select value={selectedPurchaseId} onValueChange={handlePurchaseSelect}>
                    <SelectTrigger id="purchase_select">
                      <SelectValue placeholder={loadingPurchases ? "Loading purchases..." : "Select a purchase to return"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingPurchases ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : purchases.length === 0 ? (
                        <SelectItem value="empty" disabled>No purchases found</SelectItem>
                      ) : (
                        purchases.map((purchase) => (
                          <SelectItem key={purchase._id} value={purchase._id}>
                            {purchase.purchase_number} - {purchase.product_name} ({purchase.quantity} {purchase.unit}) - {purchase.supplier_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    Select the original purchase that you want to return
                  </p>
                </div>
              </div>
            )}

            {/* Return Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Return Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="return_date">Return Date *</Label>
                  <Input
                    id="return_date"
                    name="return_date"
                    type="date"
                    value={formData.return_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="original_purchase_number">Original Purchase #</Label>
                  <Input
                    id="original_purchase_number"
                    name="original_purchase_number"
                    value={formData.original_purchase_number}
                    onChange={handleInputChange}
                    placeholder="PUR000001"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <PackageX className="mr-2 h-4 w-4" />
                Product Details {!isEditing && selectedPurchaseId && <span className="text-sm font-normal text-gray-500 ml-2">(Auto-populated from purchase)</span>}
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
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                  placeholder="Detailed description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="returned_quantity">Returned Quantity *</Label>
                  <Input
                    id="returned_quantity"
                    name="returned_quantity"
                    type="number"
                    step="0.01"
                    value={formData.returned_quantity}
                    onChange={handleInputChange}
                    required
                    placeholder="10"
                  />
                  {formData.original_quantity && (
                    <p className="text-xs text-gray-500 mt-1">
                      Original: {formData.original_quantity} {formData.unit}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => handleSelectChange('unit', value)}
                    disabled={!isEditing && !!selectedPurchaseId}
                  >
                    <SelectTrigger id="unit" className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="bag">Bag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit_price">
                    Unit Price (₹) *
                    {!isEditing && selectedPurchaseId && (
                      <span className="text-xs text-gray-500 ml-2">(Auto-populated from purchase)</span>
                    )}
                  </Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                {!isEditing && selectedPurchaseId && (
                  <span className="text-xs text-gray-500 ml-2">(Auto-populated from purchase)</span>
                )}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="batch_number">Batch Number *</Label>
                  <Input
                    id="batch_number"
                    name="batch_number"
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
                  />
                </div>
              </div>
            </div>

            {/* Supplier Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <Store className="mr-2 h-4 w-4" />
                Supplier Details
                {!isEditing && selectedPurchaseId && (
                  <span className="text-xs text-gray-500 ml-2">(Auto-populated from purchase)</span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_name">Supplier Name *</Label>
                  <Input
                    id="supplier_name"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleInputChange}
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                  disabled={!isEditing && !!selectedPurchaseId}
                  className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
                  placeholder="Full address..."
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
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
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
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Return Reason */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                Return Reason
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="return_type">Return Type *</Label>
                  <Select
                    value={formData.return_type}
                    onValueChange={(value) => handleSelectChange('return_type', value)}
                  >
                    <SelectTrigger id="return_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                      <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                      <SelectItem value="Excess Stock">Excess Stock</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="condition_on_return">Condition on Return</Label>
                  <Select
                    value={formData.condition_on_return}
                    onValueChange={(value) => handleSelectChange('condition_on_return', value)}
                  >
                    <SelectTrigger id="condition_on_return">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Damaged">Damaged</SelectItem>
                      <SelectItem value="Unusable">Unusable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="return_reason">Detailed Return Reason *</Label>
                <Textarea
                  id="return_reason"
                  name="return_reason"
                  value={formData.return_reason}
                  onChange={handleInputChange}
                  required
                  placeholder="Explain why the product is being returned..."
                  rows={3}
                />
              </div>
            </div>

            {/* Pricing & Refund Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center">
                <IndianRupee className="mr-2 h-4 w-4" />
                Pricing & Refund Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tax_percentage">
                    Tax Percentage (%)
                    {!isEditing && selectedPurchaseId && (
                      <span className="text-xs text-gray-500 ml-2">(Auto-populated)</span>
                    )}
                  </Label>
                  <Input
                    id="tax_percentage"
                    name="tax_percentage"
                    type="number"
                    step="0.01"
                    value={formData.tax_percentage}
                    onChange={handleInputChange}
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
                    placeholder="18"
                  />
                </div>
                <div>
                  <Label htmlFor="discount_amount">
                    Discount Amount (₹)
                    {!isEditing && selectedPurchaseId && (
                      <span className="text-xs text-gray-500 ml-2">(Auto-populated)</span>
                    )}
                  </Label>
                  <Input
                    id="discount_amount"
                    name="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={handleInputChange}
                    disabled={!isEditing && !!selectedPurchaseId}
                    className={!isEditing && selectedPurchaseId ? "bg-gray-50" : ""}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="refunded_amount">Refunded Amount (₹)</Label>
                  <Input
                    id="refunded_amount"
                    name="refunded_amount"
                    type="number"
                    step="0.01"
                    value={formData.refunded_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Calculated Amounts Display */}
              <div className="bg-orange-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Return Amount:</span>
                  <span className="font-medium">
                    ₹{total_return_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax Amount:</span>
                  <span className="font-medium">
                    ₹{tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
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
                  <span>Final Return Amount:</span>
                  <span className="text-orange-600">
                    ₹{final_return_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Refunded:</span>
                  <span className="font-medium">
                    ₹
                    {(parseFloat(formData.refunded_amount) || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Pending Refund:</span>
                  <span className="font-medium">
                    ₹
                    {(final_return_amount - (parseFloat(formData.refunded_amount) || 0)).toLocaleString(
                      'en-IN',
                      { minimumFractionDigits: 2 }
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="refund_method">Refund Method</Label>
                  <Select
                    value={formData.refund_method}
                    onValueChange={(value) => handleSelectChange('refund_method', value)}
                  >
                    <SelectTrigger id="refund_method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit Note">Credit Note</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="refund_date">Refund Date</Label>
                  <Input
                    id="refund_date"
                    name="refund_date"
                    type="date"
                    value={formData.refund_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="debit_note_number">Debit Note Number</Label>
                  <Input
                    id="debit_note_number"
                    name="debit_note_number"
                    value={formData.debit_note_number}
                    onChange={handleInputChange}
                    placeholder="DN-12345"
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Additional Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="returned_by">Returned By</Label>
                  <Input
                    id="returned_by"
                    name="returned_by"
                    value={formData.returned_by}
                    onChange={handleInputChange}
                    placeholder="Person who processed the return"
                  />
                </div>
                <div>
                  <Label htmlFor="approval_status">Approval Status</Label>
                  <Select
                    value={formData.approval_status}
                    onValueChange={(value) => handleSelectChange('approval_status', value)}
                  >
                    <SelectTrigger id="approval_status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
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
                {isEditing ? 'Update Return' : 'Create Return'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Return Details</DialogTitle>
            <DialogDescription>
              {selectedReturn?.return_number} - Complete return information
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6">
              {/* Return Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Return Number</Label>
                  <p className="font-medium">{selectedReturn.return_number}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Return Date</Label>
                  <p className="font-medium">
                    {new Date(selectedReturn.return_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
                {selectedReturn.original_purchase_number && (
                  <div>
                    <Label className="text-gray-600">Original Purchase #</Label>
                    <p className="font-medium">{selectedReturn.original_purchase_number}</p>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Product Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Product Name</Label>
                    <p className="font-medium">{selectedReturn.product_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Category</Label>
                    <p className="font-medium">
                      {selectedReturn.product_category || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Returned Quantity</Label>
                    <p className="font-medium">
                      {selectedReturn.returned_quantity} {selectedReturn.unit}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Unit Price</Label>
                    <p className="font-medium">
                      ₹{selectedReturn.unit_price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                {selectedReturn.product_description && (
                  <div className="mt-2">
                    <Label className="text-gray-600">Description</Label>
                    <p className="text-sm">{selectedReturn.product_description}</p>
                  </div>
                )}
              </div>

              {/* Batch Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Batch Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-600">Batch Number</Label>
                    <p className="font-medium font-mono">{selectedReturn.batch_number}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Manufacturing Date</Label>
                    <p className="font-medium">
                      {selectedReturn.manufacturing_date
                        ? new Date(selectedReturn.manufacturing_date).toLocaleDateString(
                            'en-IN'
                          )
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Expiry Date</Label>
                    <p className="font-medium">
                      {selectedReturn.expiry_date
                        ? new Date(selectedReturn.expiry_date).toLocaleDateString('en-IN')
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
                    <p className="font-medium">{selectedReturn.supplier_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Contact</Label>
                    <p className="font-medium">{selectedReturn.supplier_contact || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">GSTIN</Label>
                    <p className="font-medium">{selectedReturn.supplier_gstin || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Email</Label>
                    <p className="font-medium">{selectedReturn.supplier_email || 'N/A'}</p>
                  </div>
                </div>
                {selectedReturn.supplier_address && (
                  <div className="mt-2">
                    <Label className="text-gray-600">Address</Label>
                    <p className="text-sm">{selectedReturn.supplier_address}</p>
                  </div>
                )}
              </div>

              {/* Return Reason */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Return Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Return Type</Label>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getReturnTypeColor(
                        selectedReturn.return_type
                      )}`}
                    >
                      {selectedReturn.return_type}
                    </span>
                  </div>
                  <div>
                    <Label className="text-gray-600">Condition on Return</Label>
                    <p className="font-medium">{selectedReturn.condition_on_return || 'N/A'}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-gray-600">Return Reason</Label>
                  <p className="text-sm">{selectedReturn.return_reason}</p>
                </div>
              </div>

              {/* Pricing & Refund Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Pricing & Refund Information</h3>
                <div className="bg-orange-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Total Return Amount:</span>
                    <span className="font-medium">
                      ₹{selectedReturn.total_return_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({selectedReturn.tax_percentage}%):</span>
                    <span className="font-medium">
                      ₹{(selectedReturn.tax_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-medium">
                      - ₹{(selectedReturn.discount_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Final Return Amount:</span>
                    <span className="text-orange-600">
                      ₹{selectedReturn.final_return_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Refunded Amount:</span>
                    <span className="font-medium">
                      ₹{selectedReturn.refunded_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Pending Refund:</span>
                    <span className="font-medium">
                      ₹{selectedReturn.pending_refund_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label className="text-gray-600">Refund Status</Label>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getRefundStatusColor(
                        selectedReturn.refund_status
                      )}`}
                    >
                      {selectedReturn.refund_status}
                    </span>
                  </div>
                  <div>
                    <Label className="text-gray-600">Refund Method</Label>
                    <p className="font-medium">{selectedReturn.refund_method || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Refund Date</Label>
                    <p className="font-medium">
                      {selectedReturn.refund_date
                        ? new Date(selectedReturn.refund_date).toLocaleDateString('en-IN')
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
                    <Label className="text-gray-600">Debit Note Number</Label>
                    <p className="font-medium">{selectedReturn.debit_note_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Returned By</Label>
                    <p className="font-medium">{selectedReturn.returned_by || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Approval Status</Label>
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getApprovalStatusColor(
                        selectedReturn.approval_status || 'Pending'
                      )}`}
                    >
                      {selectedReturn.approval_status || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <Label className="text-gray-600">Created By</Label>
                    <p className="font-medium">{selectedReturn.created_by || 'N/A'}</p>
                  </div>
                </div>
                {selectedReturn.notes && (
                  <div className="mt-2">
                    <Label className="text-gray-600">Notes</Label>
                    <p className="text-sm">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="border-t pt-4 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>
                    Created: {new Date(selectedReturn.created_at).toLocaleString('en-IN')}
                  </span>
                  <span>
                    Updated: {new Date(selectedReturn.updated_at).toLocaleString('en-IN')}
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
                if (selectedReturn) {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedReturn);
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
