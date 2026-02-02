'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Package,
  IndianRupee,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { scanBillImage, fileToBase64 } from '@/lib/ocrHelper';

interface Seller {
  _id: string;
  name: string;
  gstin?: string;
  phone?: string;
  city?: string;
}

interface PurchaseItem {
  product_name: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  rate: number;
  taxable_value: number;
}

interface Purchase {
  _id: string;
  serial_number: number;
  purchase_number: string;
  purchase_date: string;
  seller_id?: {
    _id: string;
    name: string;
    gstin?: string;
    phone?: string;
    city?: string;
  };
  place_of_supply?: string;
  items?: PurchaseItem[];
  product_name?: string;
  hsn_code?: string;
  product_category?: string;
  quantity?: number;
  unit?: string;
  batch_number?: string;
  supplier_name?: string;
  supplier_gstin?: string;
  unit_price?: number;
  taxable_amount?: number;
  total_amount?: number;
  is_taxable?: boolean;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  tax_amount?: number;
  tax_percentage?: number;
  discount_amount?: number;
  final_amount?: number;
  payment_status: 'Pending' | 'Partial' | 'Paid';
  paid_amount: number;
  due_amount: number;
  payment_method?: string;
  invoice_number?: string;
  bill_image_url?: string;
  notes?: string;
  packaging_note?: string;
  quality_check?: 'Pass' | 'Fail' | 'Pending';
  created_at: string;
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

const initialFormData = {
  purchase_date: new Date().toISOString().split('T')[0],
  seller_id: '',
  place_of_supply: '',
  product_name: '',
  hsn_code: '',
  product_category: '',
  quantity: '',
  unit: 'kg',
  batch_number: '',
  supplier_name: '',
  supplier_gstin: '',
  unit_price: '',
  is_taxable: false,
  cgst_rate: '',
  sgst_rate: '',
  igst_rate: '',
  discount_amount: '',
  paid_amount: '',
  payment_method: '',
  invoice_number: '',
  notes: '',
  packaging_note: '',
  quality_check: 'Pending',
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');

  // OCR states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState(initialFormData);

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (paymentStatusFilter && paymentStatusFilter !== 'all') {
        params.append('payment_status', paymentStatusFilter);
      }
      if (sellerFilter && sellerFilter !== 'all') {
        params.append('seller_id', sellerFilter);
      }

      const response = await fetch(`/api/purchases?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
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
  }, [searchTerm, paymentStatusFilter, sellerFilter]);

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/sellers?is_active=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSellers(data.sellers);
      }
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchSellers();
  }, [fetchPurchases]);

  // OCR Bill Scanning
  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setIsScanning(true);
      setScanProgress(0);
      setOcrResult(null);

      // Show preview
      const preview = await fileToBase64(file);
      setBillPreview(preview);

      toast.info('Scanning bill... This may take a moment.');

      // Perform OCR
      const result = await scanBillImage(file, (progress) => {
        setScanProgress(progress);
      });

      if (result.success) {
        setOcrResult(`Confidence: ${result.confidence.toFixed(1)}%`);

        // Auto-fill form fields from OCR
        const extracted = result.extractedData;

        setFormData((prev) => ({
          ...prev,
          invoice_number: extracted.invoiceNumber || prev.invoice_number,
          purchase_date: extracted.billDate || prev.purchase_date,
          supplier_gstin: extracted.gstin || prev.supplier_gstin,
          place_of_supply: extracted.placeOfSupply || prev.place_of_supply,
          // If total amount found, set it
          ...(extracted.totalAmount && {
            unit_price: extracted.totalAmount,
            quantity: '1',
          }),
          // GST fields
          cgst_rate: extracted.cgstRate || prev.cgst_rate,
          sgst_rate: extracted.sgstRate || prev.sgst_rate,
          igst_rate: extracted.igstRate || prev.igst_rate,
          is_taxable: !!(extracted.cgstRate || extracted.sgstRate || extracted.igstRate),
        }));

        // Try to match seller by GSTIN
        if (extracted.gstin) {
          const matchedSeller = sellers.find(
            (s) => s.gstin?.toUpperCase() === extracted.gstin.toUpperCase()
          );
          if (matchedSeller) {
            setFormData((prev) => ({ ...prev, seller_id: matchedSeller._id }));
            toast.success(`Matched seller: ${matchedSeller.name}`);
          }
        }

        toast.success('Bill scanned successfully! Review and edit fields as needed.');
      } else {
        toast.error(result.error || 'OCR scanning failed');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Failed to scan bill');
    } finally {
      setIsScanning(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    // Convert _none placeholder back to empty string
    const actualValue = value === '_none' ? '' : value;
    setFormData((prev) => ({ ...prev, [name]: actualValue }));

    // If seller selected, auto-fill supplier info
    if (name === 'seller_id' && actualValue) {
      const seller = sellers.find((s) => s._id === actualValue);
      if (seller) {
        setFormData((prev) => ({
          ...prev,
          seller_id: actualValue,
          supplier_name: seller.name,
          supplier_gstin: seller.gstin || '',
        }));
      }
    }
  };

  const calculateAmounts = useCallback(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    const discountAmount = parseFloat(formData.discount_amount) || 0;

    const taxableAmount = quantity * unitPrice;
    
    // Calculate GST amounts
    const cgstRate = formData.is_taxable ? parseFloat(formData.cgst_rate) || 0 : 0;
    const sgstRate = formData.is_taxable ? parseFloat(formData.sgst_rate) || 0 : 0;
    const igstRate = formData.is_taxable ? parseFloat(formData.igst_rate) || 0 : 0;
    
    const cgstAmount = (taxableAmount * cgstRate) / 100;
    const sgstAmount = (taxableAmount * sgstRate) / 100;
    const igstAmount = (taxableAmount * igstRate) / 100;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    
    const finalAmount = taxableAmount + totalTax - discountAmount;

    return { 
      taxableAmount, 
      cgstAmount, 
      sgstAmount, 
      igstAmount, 
      totalTax, 
      finalAmount 
    };
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { taxableAmount, cgstAmount, sgstAmount, igstAmount, totalTax, finalAmount } = calculateAmounts();

    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity) || undefined,
      unit_price: parseFloat(formData.unit_price) || undefined,
      taxable_amount: taxableAmount || undefined,
      total_amount: taxableAmount || undefined,
      is_taxable: formData.is_taxable,
      cgst_rate: formData.is_taxable ? parseFloat(formData.cgst_rate) || 0 : 0,
      cgst_amount: formData.is_taxable ? cgstAmount : 0,
      sgst_rate: formData.is_taxable ? parseFloat(formData.sgst_rate) || 0 : 0,
      sgst_amount: formData.is_taxable ? sgstAmount : 0,
      igst_rate: formData.is_taxable ? parseFloat(formData.igst_rate) || 0 : 0,
      igst_amount: formData.is_taxable ? igstAmount : 0,
      tax_amount: formData.is_taxable ? totalTax : 0,
      discount_amount: parseFloat(formData.discount_amount) || 0,
      final_amount: finalAmount || undefined,
      paid_amount: parseFloat(formData.paid_amount) || 0,
      seller_id: formData.seller_id || undefined,
    };

    try {
      const token = localStorage.getItem('leaftrack_token');
      const url = isEditing ? `/api/purchases/${selectedPurchase?._id}` : '/api/purchases';
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
        const serialMsg = data.serial_number ? ` (Serial #${data.serial_number})` : '';
        toast.success(`${data.message}${serialMsg}`);
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
      purchase_date: purchase.purchase_date?.split('T')[0] || '',
      seller_id: purchase.seller_id?._id || '',
      place_of_supply: purchase.place_of_supply || '',
      product_name: purchase.product_name || '',
      hsn_code: purchase.hsn_code || '',
      product_category: purchase.product_category || '',
      quantity: purchase.quantity?.toString() || '',
      unit: purchase.unit || 'kg',
      batch_number: purchase.batch_number || '',
      supplier_name: purchase.supplier_name || '',
      supplier_gstin: purchase.supplier_gstin || '',
      unit_price: purchase.unit_price?.toString() || '',
      is_taxable: purchase.is_taxable || false,
      cgst_rate: purchase.cgst_rate?.toString() || '',
      sgst_rate: purchase.sgst_rate?.toString() || '',
      igst_rate: purchase.igst_rate?.toString() || '',
      discount_amount: purchase.discount_amount?.toString() || '',
      paid_amount: purchase.paid_amount?.toString() || '',
      payment_method: purchase.payment_method || '',
      invoice_number: purchase.invoice_number || '',
      notes: purchase.notes || '',
      packaging_note: purchase.packaging_note || '',
      quality_check: purchase.quality_check || 'Pending',
    });
    setBillPreview(null);
    setOcrResult(null);
    setIsDialogOpen(true);
  };

  const handleView = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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
    setFormData(initialFormData);
    setIsEditing(false);
    setSelectedPurchase(null);
    setBillPreview(null);
    setOcrResult(null);
    setScanProgress(0);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const { taxableAmount, cgstAmount, sgstAmount, igstAmount, totalTax, finalAmount } = calculateAmounts();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'Partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'Pending':
        return <Badge className="bg-red-100 text-red-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Record purchases with OCR bill scanning
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          New Purchase
        </Button>
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Total Purchases</p>
                  <p className="text-xl font-bold">{summary.total_purchases}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold">₹{summary.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Total Paid</p>
                  <p className="text-xl font-bold">₹{summary.total_paid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Total Due</p>
                  <p className="text-xl font-bold">₹{summary.total_due.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Purchases</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by serial, product, invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Sellers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchPurchases}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No purchases found</p>
              <p className="text-sm">Record your first purchase to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell>
                        <span className="font-mono font-medium">#{purchase.serial_number}</span>
                      </TableCell>
                      <TableCell>
                        {new Date(purchase.purchase_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {purchase.seller_id ? (
                          <div>
                            <p className="font-medium">{purchase.seller_id.name}</p>
                            {purchase.seller_id.city && (
                              <p className="text-xs text-gray-500">{purchase.seller_id.city}</p>
                            )}
                          </div>
                        ) : purchase.supplier_name ? (
                          <p>{purchase.supplier_name}</p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {purchase.product_name || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        {purchase.invoice_number ? (
                          <span className="font-mono text-sm">{purchase.invoice_number}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{(purchase.final_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleView(purchase)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(purchase)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(purchase._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Purchase Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Purchase' : 'Record New Purchase'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the purchase details below'
                : 'Upload a bill image to auto-fill or enter details manually'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* OCR Bill Upload Section */}
              {!isEditing && (
                <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        <Camera className="inline h-4 w-4 mr-1" />
                        Scan Bill (Auto-fill)
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Upload a bill image to automatically extract details
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleBillUpload}
                        className="mt-2"
                        disabled={isScanning}
                      />
                      {isScanning && (
                        <div className="mt-2 space-y-1">
                          <Progress value={scanProgress} className="h-2" />
                          <p className="text-xs text-blue-600">
                            <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                            Scanning... {scanProgress}%
                          </p>
                        </div>
                      )}
                      {ocrResult && (
                        <p className="text-xs text-green-600 mt-1">
                          <CheckCircle2 className="inline h-3 w-3 mr-1" />
                          {ocrResult}
                        </p>
                      )}
                    </div>
                    {billPreview && (
                      <div className="relative">
                        <img
                          src={billPreview}
                          alt="Bill preview"
                          className="h-20 w-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setBillPreview(null);
                            setOcrResult(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seller Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seller_id">Select Seller</Label>
                  <Select
                    value={formData.seller_id || '_none'}
                    onValueChange={(val) => handleSelectChange('seller_id', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a seller..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">-- No Seller --</SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name} {s.gstin && `(${s.gstin})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    name="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Invoice & Supplier Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Bill/Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleInputChange}
                    placeholder="e.g., INV-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Supplier Name</Label>
                  <Input
                    id="supplier_name"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleInputChange}
                    placeholder="Auto-filled from seller"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_gstin">Supplier GSTIN</Label>
                  <Input
                    id="supplier_gstin"
                    name="supplier_gstin"
                    value={formData.supplier_gstin}
                    onChange={handleInputChange}
                    placeholder="22AAAAA0000A1Z5"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="place_of_supply">Place of Supply</Label>
                  <Input
                    id="place_of_supply"
                    name="place_of_supply"
                    value={formData.place_of_supply}
                    onChange={handleInputChange}
                    placeholder="State name"
                  />
                </div>
              </div>

              {/* Product Details */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Product Details</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="product_name">Product Name</Label>
                    <Input
                      id="product_name"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hsn_code">HSN/SAC Code</Label>
                    <Input
                      id="hsn_code"
                      name="hsn_code"
                      value={formData.hsn_code}
                      onChange={handleInputChange}
                      placeholder="e.g., 0902"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(val) => handleSelectChange('unit', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="g">Grams</SelectItem>
                        <SelectItem value="pcs">Pieces</SelectItem>
                        <SelectItem value="ltr">Liters</SelectItem>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="pack">Pack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="packaging_note">Packaging Note</Label>
                    <Input
                      id="packaging_note"
                      name="packaging_note"
                      value={formData.packaging_note}
                      onChange={handleInputChange}
                      placeholder="e.g., 1 Kg Packet"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_category">Product Category</Label>
                    <Input
                      id="product_category"
                      name="product_category"
                      value={formData.product_category}
                      onChange={handleInputChange}
                      placeholder="e.g., Tea"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Pricing</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Rate / Unit Price (₹)</Label>
                    <Input
                      id="unit_price"
                      name="unit_price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Taxable Amount</Label>
                    <div className="h-10 px-3 flex items-center bg-gray-100 rounded-md font-medium">
                      ₹{taxableAmount.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_amount">Discount (₹)</Label>
                    <Input
                      id="discount_amount"
                      name="discount_amount"
                      type="number"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Final Amount</Label>
                    <div className="h-10 px-3 flex items-center bg-green-100 rounded-md font-bold text-green-800">
                      ₹{finalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Tax Section */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="is_taxable"
                      checked={formData.is_taxable}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, is_taxable: !!checked }))
                      }
                    />
                    <Label htmlFor="is_taxable" className="font-medium">GST Applicable</Label>
                  </div>
                  
                  {formData.is_taxable && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="cgst_rate" className="text-xs">CGST %</Label>
                        <Input
                          id="cgst_rate"
                          name="cgst_rate"
                          type="number"
                          step="0.01"
                          value={formData.cgst_rate}
                          onChange={handleInputChange}
                          className="h-9"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CGST Amt</Label>
                        <div className="h-9 px-2 flex items-center bg-blue-50 rounded text-sm">
                          ₹{cgstAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sgst_rate" className="text-xs">SGST %</Label>
                        <Input
                          id="sgst_rate"
                          name="sgst_rate"
                          type="number"
                          step="0.01"
                          value={formData.sgst_rate}
                          onChange={handleInputChange}
                          className="h-9"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">SGST Amt</Label>
                        <div className="h-9 px-2 flex items-center bg-blue-50 rounded text-sm">
                          ₹{sgstAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="igst_rate" className="text-xs">IGST %</Label>
                        <Input
                          id="igst_rate"
                          name="igst_rate"
                          type="number"
                          step="0.01"
                          value={formData.igst_rate}
                          onChange={handleInputChange}
                          className="h-9"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Total Tax</Label>
                        <div className="h-9 px-2 flex items-center bg-yellow-50 rounded font-medium text-sm">
                          ₹{totalTax.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Payment</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select
                      value={formData.payment_method || '_none'}
                      onValueChange={(val) => handleSelectChange('payment_method', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">-- None --</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Balance Due</Label>
                    <div
                      className={`h-10 px-3 flex items-center rounded-md font-medium ${
                        finalAmount - (parseFloat(formData.paid_amount) || 0) > 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      ₹{(finalAmount - (parseFloat(formData.paid_amount) || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes about this purchase"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {isEditing ? 'Update Purchase' : 'Save Purchase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Purchase Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
            <DialogDescription>
              Serial #{selectedPurchase?.serial_number} | {selectedPurchase?.purchase_number}
            </DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">
                    {new Date(selectedPurchase.purchase_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Invoice #</p>
                  <p className="font-medium font-mono">
                    {selectedPurchase.invoice_number || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Seller</p>
                  <p className="font-medium">
                    {selectedPurchase.seller_id?.name || selectedPurchase.supplier_name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">GSTIN</p>
                  <p className="font-medium font-mono">
                    {selectedPurchase.seller_id?.gstin || selectedPurchase.supplier_gstin || '-'}
                  </p>
                </div>
                {selectedPurchase.place_of_supply && (
                  <div>
                    <p className="text-gray-500">Place of Supply</p>
                    <p className="font-medium">{selectedPurchase.place_of_supply}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Product</p>
                  <p className="font-medium">{selectedPurchase.product_name || '-'}</p>
                </div>
                {selectedPurchase.hsn_code && (
                  <div>
                    <p className="text-gray-500">HSN Code</p>
                    <p className="font-medium font-mono">{selectedPurchase.hsn_code}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Quantity</p>
                  <p className="font-medium">
                    {selectedPurchase.quantity
                      ? `${selectedPurchase.quantity} ${selectedPurchase.unit}`
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Taxable Amount</p>
                    <p className="font-medium">
                      ₹{(selectedPurchase.taxable_amount || selectedPurchase.total_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  {selectedPurchase.is_taxable && (
                    <>
                      {(selectedPurchase.cgst_rate || 0) > 0 && (
                        <div>
                          <p className="text-gray-500">CGST ({selectedPurchase.cgst_rate}%)</p>
                          <p className="font-medium">₹{(selectedPurchase.cgst_amount || 0).toFixed(2)}</p>
                        </div>
                      )}
                      {(selectedPurchase.sgst_rate || 0) > 0 && (
                        <div>
                          <p className="text-gray-500">SGST ({selectedPurchase.sgst_rate}%)</p>
                          <p className="font-medium">₹{(selectedPurchase.sgst_amount || 0).toFixed(2)}</p>
                        </div>
                      )}
                      {(selectedPurchase.igst_rate || 0) > 0 && (
                        <div>
                          <p className="text-gray-500">IGST ({selectedPurchase.igst_rate}%)</p>
                          <p className="font-medium">₹{(selectedPurchase.igst_amount || 0).toFixed(2)}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <p className="text-gray-500">Final Amount</p>
                    <p className="font-bold text-lg">
                      ₹{(selectedPurchase.final_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Paid</p>
                    <p className="font-medium text-green-600">
                      ₹{(selectedPurchase.paid_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due</p>
                    <p className="font-medium text-red-600">
                      ₹{(selectedPurchase.due_amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <div className="text-sm">
                  <p className="text-gray-500">Payment Status</p>
                  {getStatusBadge(selectedPurchase.payment_status)}
                </div>
                <div className="text-sm text-right">
                  <p className="text-gray-500">Payment Method</p>
                  <p className="font-medium">{selectedPurchase.payment_method || '-'}</p>
                </div>
              </div>

              {(selectedPurchase.notes || selectedPurchase.packaging_note) && (
                <div className="border-t pt-4">
                  {selectedPurchase.packaging_note && (
                    <div className="mb-2">
                      <p className="text-gray-500 text-sm">Packaging</p>
                      <p className="text-sm">{selectedPurchase.packaging_note}</p>
                    </div>
                  )}
                  {selectedPurchase.notes && (
                    <div>
                      <p className="text-gray-500 text-sm">Notes</p>
                      <p className="text-sm">{selectedPurchase.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false);
                if (selectedPurchase) handleEdit(selectedPurchase);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
