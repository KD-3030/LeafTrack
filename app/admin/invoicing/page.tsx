'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Search, Edit, Download, RefreshCw, DollarSign, TrendingUp, AlertCircle, Calendar, Filter, Eye, ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateInvoicePDF } from '@/lib/pdfGenerator';

interface Invoice {
  _id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_details: {
    name: string;
    email: string;
    phone?: string;
    gstin?: string;
  };
  salesman_id: {
    name: string;
    email: string;
  };
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  payment_status: 'Pending' | 'Partial' | 'Paid';
  payment_date?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: { 
    product_id: string; 
    product_name: string;
    hsn_code: string;
    quantity: number; 
    price: number;
    unit_price: number;
    taxable_amount: number;
    gst_rate: number;
    total_amount: number;
  }[];
}

interface Sale {
  _id: string;
  assignment_id: string;
  product_id: {
    name: string;
    price: number;
  };
  salesman_id: {
    name: string;
  };
  quantity_sold: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  invoice_generated: boolean;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gstin?: string;
  address?: string;
}

interface Product {
  _id: string;
  name: string;
  hsn_code: string;
  price: number;
  gst_rate: number;
  totalStock: number;
}

interface ManualInvoiceItem {
  product_id: string;
  product_name: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  taxable_amount: number;
  tax_amount: number;
  total_amount: number;
}

interface ManualInvoiceForm {
  customer_id: string;
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  notes?: string;
  items: ManualInvoiceItem[];
}

interface SaleReturn {
  _id: string;
  return_number: string;
  original_invoice_id?: {
    invoice_number: string;
    invoice_date: string;
  };
  customer_id?: {
    name: string;
    email: string;
  };
  customer_details?: {
    name: string;
    email?: string;
    phone?: string;
  };
  is_manual_entry?: boolean;
  return_items: {
    product_id?: string;
    product_name: string;
    return_quantity?: number;
    quantity_returned?: number;
    unit_price: number;
    condition?: 'Good' | 'Damaged' | 'Defective';
    reason?: string;
    total_refund?: number;
    total_amount?: number;
  }[];
  total_refund?: number;
  total_refund_amount?: number;
  status: 'Pending' | 'Processing' | 'Rejected' | 'Completed';
  refund_status: 'Pending' | 'Processed' | 'Failed';
  refund_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit Note';
  return_date: string;
  return_reason?: string;
  admin_approval?: boolean;
  approved_by?: {
    name: string;
  };
  approval_date?: string;
  notes?: string;
}

export default function InvoicingPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isManualInvoiceDialogOpen, setIsManualInvoiceDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReturnInvoice, setSelectedReturnInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  
  // Manual invoice form state
  const [manualInvoiceForm, setManualInvoiceForm] = useState<ManualInvoiceForm>({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    payment_terms: '30 days',
    notes: '',
    items: []
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);
  const [gstApplicationMode, setGstApplicationMode] = useState<'applied' | 'not_applied' | 'inclusive'>('applied');

  // Sale return form state
  const [returnItems, setReturnItems] = useState<{
    product_id: string;
    product_name: string;
    original_quantity: number;
    return_quantity: number;
    unit_price: number;
    condition: 'Good' | 'Damaged' | 'Defective';
    reason: string;
  }[]>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit Note'>('Cash');
  const [isManualReturnMode, setIsManualReturnMode] = useState(false);
  const [manualReturnData, setManualReturnData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    returnDate: new Date().toISOString().split('T')[0],
    refundAmount: 0,
    reason: '',
    items: [] as Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
    }>
  });

  useEffect(() => {
    loadInvoices();
    loadSales();
    loadCustomers();
    loadProducts();
    loadSaleReturns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setInvoices(data.invoices);
      } else {
        toast({
          title: "Error",
          description: "Failed to load invoices",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    }
  };

  const loadSales = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/sales?invoice_generated=false', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSales(data.sales);
      } else {
        toast({
          title: "Error",
          description: "Failed to load sales",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      toast({
        title: "Error",
        description: "Failed to load sales",
        variant: "destructive",
      });
    }
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
        setCustomers(data.customers);
      } else {
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
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
        setProducts(data.products);
      } else {
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const loadSaleReturns = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/sale-returns', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSaleReturns(data.returns);
      } else {
        toast({
          title: "Error",
          description: "Failed to load sale returns",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading sale returns:', error);
      toast({
        title: "Error",
        description: "Failed to load sale returns",
        variant: "destructive",
      });
    }
  };

  const initializeSaleReturn = (invoice: Invoice) => {
    const returnItemsFromInvoice = invoice.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      original_quantity: item.quantity,
      return_quantity: 0,
      unit_price: item.unit_price,
      condition: 'Good' as const,
      reason: ''
    }));

    setReturnItems(returnItemsFromInvoice);
    setSelectedReturnInvoice(invoice);
    setReturnNotes('');
    setRefundMethod('Cash');
    setIsManualReturnMode(false); // Ensure we're in invoice-based mode
    setIsReturnDialogOpen(true);
  };

  const updateReturnItem = (index: number, field: string, value: string | number) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const submitSaleReturn = async () => {
    if (!selectedReturnInvoice) return;

    const validReturnItems = returnItems.filter(item => item.return_quantity > 0);
    
    if (validReturnItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item to return",
        variant: "destructive",
      });
      return;
    }

    // Validate return quantities don't exceed original quantities
    for (const item of validReturnItems) {
      if (item.return_quantity > item.original_quantity) {
        toast({
          title: "Error",
          description: `Cannot return more than ${item.original_quantity} units of ${item.product_name}`,
          variant: "destructive",
        });
        return;
      }

      if (!item.reason.trim()) {
        toast({
          title: "Error",
          description: `Please provide a reason for returning ${item.product_name}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/sale-returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          original_invoice_id: selectedReturnInvoice._id,
          return_items: validReturnItems,
          refund_method: refundMethod,
          notes: returnNotes
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Sale return request submitted successfully",
        });
        setIsReturnDialogOpen(false);
        loadSaleReturns();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit return request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error submitting sale return:', error);
      toast({
        title: "Error",
        description: "Failed to submit return request",
        variant: "destructive",
      });
    }
  };

  const submitManualReturn = async () => {
    try {
      // Validate required fields
      if (!manualReturnData.customerName.trim()) {
        toast({
          title: "Validation Error",
          description: "Customer name is required",
          variant: "destructive",
        });
        return;
      }

      if (manualReturnData.items.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one return item is required",
          variant: "destructive",
        });
        return;
      }

      if (!manualReturnData.reason.trim()) {
        toast({
          title: "Validation Error",
          description: "Return reason is required",
          variant: "destructive",
        });
        return;
      }

      // Validate all items have required fields
      for (let i = 0; i < manualReturnData.items.length; i++) {
        const item = manualReturnData.items[i];
        if (!item.productName.trim()) {
          toast({
            title: "Validation Error",
            description: `Product name is required for item ${i + 1}`,
            variant: "destructive",
          });
          return;
        }
        if (item.quantity <= 0) {
          toast({
            title: "Validation Error",
            description: `Quantity must be greater than 0 for item ${i + 1}`,
            variant: "destructive",
          });
          return;
        }
        if (item.unitPrice <= 0) {
          toast({
            title: "Validation Error",
            description: `Unit price must be greater than 0 for item ${i + 1}`,
            variant: "destructive",
          });
          return;
        }
      }

      const token = localStorage.getItem('leaftrack_token');
      const totalRefundAmount = manualReturnData.items.reduce((sum, item) => sum + item.totalAmount, 0);

      const response = await fetch('/api/sale-returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_details: {
            name: manualReturnData.customerName,
            email: manualReturnData.customerEmail || '',
            phone: manualReturnData.customerPhone || ''
          },
          return_date: manualReturnData.returnDate,
          return_items: manualReturnData.items.map(item => ({
            product_name: item.productName,
            quantity_returned: item.quantity,
            unit_price: item.unitPrice,
            total_amount: item.totalAmount,
            reason: manualReturnData.reason
          })),
          total_refund_amount: totalRefundAmount,
          refund_method: refundMethod,
          return_reason: manualReturnData.reason,
          status: 'Pending',
          refund_status: 'Pending',
          is_manual_entry: true
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Manual return created successfully",
        });
        
        loadSaleReturns();
        setIsReturnDialogOpen(false);
        setIsManualReturnMode(false);
        
        // Reset manual return data
        setManualReturnData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          returnDate: new Date().toISOString().split('T')[0],
          refundAmount: 0,
          reason: '',
          items: []
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create manual return",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating manual return:', error);
      toast({
        title: "Error",
        description: "Failed to create manual return",
        variant: "destructive",
      });
    }
  };

  const updateReturnStatus = async (returnId: string, status: string, refundStatus?: string, adminNotes?: string) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/sale-returns', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          return_id: returnId,
          status: status,
          refund_status: refundStatus,
          admin_notes: adminNotes
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Return status updated successfully",
        });
        loadSaleReturns();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update return status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating return status:', error);
      toast({
        title: "Error",
        description: "Failed to update return status",
        variant: "destructive",
      });
    }
  };

  const addItemToManualInvoice = () => {
    const product = products.find(p => p._id === selectedProduct);
    if (!product) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    if (itemQuantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (itemUnitPrice <= 0) {
      toast({
        title: "Error",
        description: "Unit price must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    let taxableAmount: number;
    let taxAmount: number;
    let totalAmount: number;
    let unitPriceToStore: number;

    // Calculate based on GST application mode
    if (gstApplicationMode === 'not_applied') {
      // GST Not Applied - No tax calculation
      taxableAmount = itemQuantity * itemUnitPrice;
      taxAmount = 0;
      totalAmount = taxableAmount;
      unitPriceToStore = itemUnitPrice;
    } else if (gstApplicationMode === 'inclusive') {
      // GST Inclusive - Amount already includes GST, need to extract it
      // User enters price WITH GST included, so final amount = entered amount
      const totalWithGst = itemQuantity * itemUnitPrice;
      const baseUnitPrice = itemUnitPrice / (1 + product.gst_rate / 100);
      taxableAmount = itemQuantity * baseUnitPrice;
      taxAmount = totalWithGst - taxableAmount;
      totalAmount = totalWithGst; // Final amount is what user entered
      unitPriceToStore = baseUnitPrice; // Store the extracted base price
    } else {
      // GST Applied (default) - Add GST to the amount
      taxableAmount = itemQuantity * itemUnitPrice;
      taxAmount = (taxableAmount * product.gst_rate) / 100;
      totalAmount = taxableAmount + taxAmount;
      unitPriceToStore = itemUnitPrice;
    }

    const newItem: ManualInvoiceItem = {
      product_id: product._id,
      product_name: product.name,
      hsn_code: product.hsn_code,
      quantity: itemQuantity,
      unit_price: unitPriceToStore,
      gst_rate: gstApplicationMode === 'not_applied' ? 0 : product.gst_rate,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount
    };

    setManualInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset form
    setSelectedProduct('');
    setItemQuantity(1);
    setItemUnitPrice(0);
  };

  const removeItemFromManualInvoice = (index: number) => {
    setManualInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const createManualInvoice = async () => {
    try {
      if (!manualInvoiceForm.customer_id) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return;
      }

      if (manualInvoiceForm.items.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one item",
          variant: "destructive",
        });
        return;
      }

      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/invoices/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(manualInvoiceForm),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Manual invoice created successfully",
        });
        setIsManualInvoiceDialogOpen(false);
        setManualInvoiceForm({
          customer_id: '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_terms: '30 days',
          notes: '',
          items: []
        });
        loadInvoices();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create manual invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating manual invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create manual invoice",
        variant: "destructive",
      });
    }
  };

  const createInvoiceFromSale = async (saleId: string) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sale_id: saleId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Invoice created successfully",
        });
        setIsCreateDialogOpen(false);
        loadInvoices();
        loadSales();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateInvoiceStatus = async (invoiceId: string, updates: Record<string, unknown>) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Invoice updated successfully",
        });
        loadInvoices();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = async (invoice: Invoice) => {
    try {
      // Fetch full invoice details
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/invoices/${invoice._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success && data.invoice) {
        setSelectedInvoice(data.invoice);
        setIsEditDialogOpen(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to load invoice details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading invoice for edit:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    }
  };

  const saveInvoiceEdits = async () => {
    if (!selectedInvoice) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/invoices/${selectedInvoice._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: selectedInvoice.status,
          due_date: selectedInvoice.due_date,
          notes: selectedInvoice.notes,
          items: selectedInvoice.items,
          grand_total: selectedInvoice.grand_total,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Invoice updated successfully",
        });
        setIsEditDialogOpen(false);
        setSelectedInvoice(null);
        loadInvoices();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving invoice edits:', error);
      toast({
        title: "Error",
        description: "Failed to save invoice edits",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async (forceDelete: boolean = false) => {
    if (!invoiceToDelete) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const url = forceDelete 
        ? `/api/invoices/${invoiceToDelete._id}?force=true`
        : `/api/invoices/${invoiceToDelete._id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Invoice deleted successfully",
        });
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        loadInvoices();
      } else {
        if (data.hasPayments && !forceDelete) {
          // Show option to force delete
          const shouldForceDelete = window.confirm(
            `This invoice has ${data.paymentCount} confirmed payment(s). Do you want to delete the invoice anyway? This will permanently remove the invoice and all associated payments.`
          );
          if (shouldForceDelete) {
            handleDeleteInvoice(true);
          }
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete invoice",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Draft: 'bg-gray-100 text-gray-800',
      Sent: 'bg-blue-100 text-blue-800',
      Paid: 'bg-green-100 text-green-800',
      Overdue: 'bg-red-100 text-red-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status as keyof typeof styles]}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Partial: 'bg-orange-100 text-orange-800',
      Paid: 'bg-green-100 text-green-800',
    };
    return <Badge className={styles[status as keyof typeof styles]}>{status}</Badge>;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_details.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const totalPending = invoices.reduce((sum, inv) => sum + inv.balance_due, 0);
  const overdueInvoices = invoices.filter(inv => 
    inv.status === 'Overdue' || 
    (new Date(inv.due_date) < new Date() && inv.payment_status !== 'Paid')
  ).length;

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
            <p className="text-gray-600 mt-1">Manage GST-compliant invoices and billing</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsManualInvoiceDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Manual Invoice
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              From Sale
            </Button>
          </div>
        </div>

        {/* Tabs for Invoices and Returns */}
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-gray-600">From {invoices.length} invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</div>
              <p className="text-xs text-gray-600">
                {((totalPaid / totalRevenue) * 100).toFixed(1)}% collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPending.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Pending collection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueInvoices}</div>
              <p className="text-xs text-gray-600">Invoices overdue</p>
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
                    placeholder="Search invoices by number or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => {
                  loadInvoices();
                  loadSales();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Invoices</span>
            </CardTitle>
            <CardDescription>
              All generated invoices with payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customer_details.name}</div>
                        <div className="text-sm text-gray-600">{invoice.customer_details.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">₹{invoice.grand_total.toLocaleString()}</div>
                        {invoice.balance_due > 0 && (
                          <div className="text-sm text-red-600">
                            Due: ₹{invoice.balance_due.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(invoice.payment_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsViewDialogOpen(true);
                          }}
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status !== 'Cancelled' && invoice.status !== 'Paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(invoice)}
                            title="Edit Invoice"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => initializeSaleReturn(invoice)}
                          title="Create Return"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              // Fetch full invoice details for PDF generation
                              const token = localStorage.getItem('leaftrack_token');
                              const response = await fetch(`/api/invoices/${invoice._id}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              });
                              
                              const data = await response.json();
                              if (data.success && data.invoice) {
                                const success = generateInvoicePDF(data.invoice);
                                if (success) {
                                  toast({
                                    title: "Success",
                                    description: "Invoice PDF downloaded successfully",
                                  });
                                } else {
                                  toast({
                                    title: "Error",
                                    description: "Failed to generate PDF",
                                    variant: "destructive",
                                  });
                                }
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to load invoice details",
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              console.error('PDF generation error:', error);
                              toast({
                                title: "Error",
                                description: "Failed to download PDF",
                                variant: "destructive",
                              });
                            }
                          }}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {invoice.status !== 'Cancelled' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setInvoiceToDelete(invoice);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="Cancel Invoice"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Invoice Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create Invoice from Sale</DialogTitle>
              <DialogDescription>
                Select a sale to generate a GST-compliant invoice
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Salesman</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="font-medium">
                        {sale.product_id.name}
                      </TableCell>
                      <TableCell>{sale.salesman_id.name}</TableCell>
                      <TableCell>{sale.quantity_sold}</TableCell>
                      <TableCell>₹{sale.total_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => createInvoiceFromSale(sale._id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Generate Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Invoice Details - {selectedInvoice?.invoice_number}
              </DialogTitle>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Customer Details</h3>
                    <div className="space-y-1">
                      <p><strong>Name:</strong> {selectedInvoice.customer_details.name}</p>
                      <p><strong>Email:</strong> {selectedInvoice.customer_details.email}</p>
                      {selectedInvoice.customer_details.phone && (
                        <p><strong>Phone:</strong> {selectedInvoice.customer_details.phone}</p>
                      )}
                      {selectedInvoice.customer_details.gstin && (
                        <p><strong>GSTIN:</strong> {selectedInvoice.customer_details.gstin}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Invoice Summary</h3>
                    <div className="space-y-1">
                      <p><strong>Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                      <p><strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedInvoice.status)}</p>
                      <p><strong>Payment:</strong> {getPaymentStatusBadge(selectedInvoice.payment_status)}</p>
                      {selectedInvoice.payment_date && (
                        <p><strong>Payment Date:</strong> {new Date(selectedInvoice.payment_date).toLocaleDateString()}</p>
                      )}
                      <p><strong>Created:</strong> {new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                      <p><strong>Last Updated:</strong> {new Date(selectedInvoice.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.hsn_code}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.unit_price}</TableCell>
                          <TableCell>₹{item.taxable_amount}</TableCell>
                          <TableCell>{item.gst_rate}%</TableCell>
                          <TableCell>₹{item.total_amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span>Grand Total:</span>
                        <span className="font-semibold">₹{selectedInvoice.grand_total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid Amount:</span>
                        <span className="text-green-600">₹{selectedInvoice.paid_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Balance Due:</span>
                        <span className="font-semibold text-red-600">₹{selectedInvoice.balance_due.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manual Invoice Dialog */}
        <Dialog open={isManualInvoiceDialogOpen} onOpenChange={setIsManualInvoiceDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manual Invoice</DialogTitle>
              <DialogDescription>
                Create a custom invoice with selected customers and products
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Customer and Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customer">Customer *</Label>
                    <Select 
                      value={manualInvoiceForm.customer_id} 
                      onValueChange={(value) => setManualInvoiceForm(prev => ({...prev, customer_id: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer._id} value={customer._id}>
                            {customer.name} - {customer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="invoice_date">Invoice Date *</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={manualInvoiceForm.invoice_date}
                      onChange={(e) => setManualInvoiceForm(prev => ({...prev, invoice_date: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={manualInvoiceForm.due_date}
                      onChange={(e) => setManualInvoiceForm(prev => ({...prev, due_date: e.target.value}))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="payment_terms">Payment Terms</Label>
                    <Select 
                      value={manualInvoiceForm.payment_terms} 
                      onValueChange={(value) => setManualInvoiceForm(prev => ({...prev, payment_terms: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Immediate">Immediate</SelectItem>
                        <SelectItem value="15 days">15 days</SelectItem>
                        <SelectItem value="30 days">30 days</SelectItem>
                        <SelectItem value="45 days">45 days</SelectItem>
                        <SelectItem value="60 days">60 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Add Product Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* GST Application Mode Dropdown */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Label htmlFor="gst_mode" className="text-base font-semibold mb-2 block">
                      GST Application Mode *
                    </Label>
                    <Select value={gstApplicationMode} onValueChange={(value: 'applied' | 'not_applied' | 'inclusive') => setGstApplicationMode(value)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select GST mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">
                          <div className="flex flex-col">
                            <span className="font-semibold">GST Applied (Add GST)</span>
                            <span className="text-xs text-gray-600">Price + GST = Final Amount</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="not_applied">
                          <div className="flex flex-col">
                            <span className="font-semibold">GST Not Applied (No GST)</span>
                            <span className="text-xs text-gray-600">Price = Final Amount (No tax)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="inclusive">
                          <div className="flex flex-col">
                            <span className="font-semibold">GST Inclusive (GST Included)</span>
                            <span className="text-xs text-gray-600">Price already includes GST</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 mt-2">
                      {gstApplicationMode === 'applied' && '✓ GST will be added to the unit price'}
                      {gstApplicationMode === 'not_applied' && '✓ No GST will be calculated or charged'}
                      {gstApplicationMode === 'inclusive' && '✓ GST will be extracted from the unit price'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="product">Product *</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product._id} value={product._id}>
                              {product.name} (₹{product.price})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        value={itemQuantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemQuantity(val === '' ? 0 : parseInt(val) || 0);
                        }}
                        placeholder="Enter quantity"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="unit_price">
                        Unit Price * 
                        {gstApplicationMode === 'inclusive' && <span className="text-xs text-gray-600"> (GST Incl.)</span>}
                        {gstApplicationMode === 'applied' && <span className="text-xs text-gray-600"> (Before GST)</span>}
                      </Label>
                      <Input
                        id="unit_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={itemUnitPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemUnitPrice(val === '' ? 0 : parseFloat(val) || 0);
                        }}
                        placeholder="Enter unit price"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button onClick={addItemToManualInvoice} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Items */}
              {manualInvoiceForm.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>HSN</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Taxable</TableHead>
                          <TableHead>GST</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualInvoiceForm.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.hsn_code}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{item.unit_price.toFixed(2)}</TableCell>
                            <TableCell>₹{item.taxable_amount.toFixed(2)}</TableCell>
                            <TableCell>
                              {item.gst_rate > 0 ? (
                                <span>{item.gst_rate}%</span>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100">No GST</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">₹{item.total_amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeItemFromManualInvoice(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Invoice Summary */}
                    <div className="mt-4 flex justify-end">
                      <div className="w-64 space-y-2 border-t pt-4">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{manualInvoiceForm.items.reduce((sum, item) => sum + item.taxable_amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>₹{manualInvoiceForm.items.reduce((sum, item) => sum + item.tax_amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Grand Total:</span>
                          <span>₹{manualInvoiceForm.items.reduce((sum, item) => sum + item.total_amount, 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes for the invoice..."
                  value={manualInvoiceForm.notes}
                  onChange={(e) => setManualInvoiceForm(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsManualInvoiceDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createManualInvoice}
                  disabled={!manualInvoiceForm.customer_id || manualInvoiceForm.items.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Invoice
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </TabsContent>

          <TabsContent value="returns" className="space-y-6">
            {/* Manual Sales Return Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  <span>Create Manual Sales Return</span>
                </CardTitle>
                <CardDescription>
                  Manually enter a sales return without selecting from existing invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => {
                    setIsManualReturnMode(true);
                    setSelectedReturnInvoice(null);
                    setIsReturnDialogOpen(true);
                  }}
                  className="mb-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Manual Return
                </Button>
              </CardContent>
            </Card>

            {/* Sale Returns Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowLeft className="h-5 w-5 text-orange-600" />
                  <span>Sale Returns</span>
                </CardTitle>
                <CardDescription>
                  All return requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Refund Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Refund Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleReturns.map((saleReturn) => (
                      <TableRow key={saleReturn._id}>
                        <TableCell className="font-medium">
                          {saleReturn.return_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            {saleReturn.is_manual_entry ? (
                              <>
                                <div className="font-medium">Manual Entry</div>
                                <div className="text-sm text-gray-600">
                                  {new Date(saleReturn.return_date).toLocaleDateString()}
                                </div>
                              </>
                            ) : saleReturn.original_invoice_id ? (
                              <>
                                <div className="font-medium">{saleReturn.original_invoice_id.invoice_number}</div>
                                <div className="text-sm text-gray-600">
                                  {new Date(saleReturn.original_invoice_id.invoice_date).toLocaleDateString()}
                                </div>
                              </>
                            ) : (
                              <div className="text-gray-500">N/A</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {saleReturn.is_manual_entry && saleReturn.customer_details ? (
                              <>
                                <div className="font-medium">{saleReturn.customer_details.name}</div>
                                <div className="text-sm text-gray-600">{saleReturn.customer_details.email || 'No email'}</div>
                              </>
                            ) : saleReturn.customer_id ? (
                              <>
                                <div className="font-medium">{saleReturn.customer_id.name}</div>
                                <div className="text-sm text-gray-600">{saleReturn.customer_id.email}</div>
                              </>
                            ) : (
                              <div className="text-gray-500">N/A</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(saleReturn.return_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          ₹{(saleReturn.total_refund_amount || saleReturn.total_refund || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            saleReturn.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            saleReturn.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                            saleReturn.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {saleReturn.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            saleReturn.refund_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            saleReturn.refund_status === 'Processed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {saleReturn.refund_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {saleReturn.status === 'Pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateReturnStatus(saleReturn._id, 'Processing', 'Pending')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateReturnStatus(saleReturn._id, 'Rejected')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {saleReturn.status === 'Processing' && saleReturn.refund_status === 'Pending' && (
                              <Button
                                size="sm"
                                onClick={() => updateReturnStatus(saleReturn._id, 'Completed', 'Processed')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Mark Refunded
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sale Return Dialog */}
        <Dialog open={isReturnDialogOpen} onOpenChange={(open) => {
          setIsReturnDialogOpen(open);
          if (!open) {
            setIsManualReturnMode(false);
            setManualReturnData({
              customerName: '',
              customerEmail: '',
              customerPhone: '',
              returnDate: new Date().toISOString().split('T')[0],
              refundAmount: 0,
              reason: '',
              items: []
            });
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isManualReturnMode ? 'Create Manual Sale Return' : 'Create Sale Return'}
              </DialogTitle>
              <DialogDescription>
                {isManualReturnMode 
                  ? 'Enter return details manually without linking to an existing invoice'
                  : selectedReturnInvoice 
                    ? `Select items to return from invoice ${selectedReturnInvoice?.invoice_number}`
                    : 'Create a new sale return'
                }
              </DialogDescription>
            </DialogHeader>
            
            {isManualReturnMode ? (
              /* Manual Return Form */
              <div className="space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={manualReturnData.customerName}
                          onChange={(e) => setManualReturnData({
                            ...manualReturnData,
                            customerName: e.target.value
                          })}
                          placeholder="Enter customer name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={manualReturnData.customerEmail}
                          onChange={(e) => setManualReturnData({
                            ...manualReturnData,
                            customerEmail: e.target.value
                          })}
                          placeholder="customer@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone">Phone</Label>
                        <Input
                          id="customerPhone"
                          value={manualReturnData.customerPhone}
                          onChange={(e) => setManualReturnData({
                            ...manualReturnData,
                            customerPhone: e.target.value
                          })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="returnDate">Return Date *</Label>
                        <Input
                          id="returnDate"
                          type="date"
                          value={manualReturnData.returnDate}
                          onChange={(e) => setManualReturnData({
                            ...manualReturnData,
                            returnDate: e.target.value
                          })}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Return Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Return Items</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManualReturnData({
                            ...manualReturnData,
                            items: [...manualReturnData.items, {
                              productName: '',
                              quantity: 1,
                              unitPrice: 0,
                              totalAmount: 0
                            }]
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {manualReturnData.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No items added. Click &ldquo;Add Item&rdquo; to get started.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {manualReturnData.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                            <div className="col-span-4">
                              <Label>Product Name</Label>
                              <Input
                                value={item.productName}
                                onChange={(e) => {
                                  const updatedItems = [...manualReturnData.items];
                                  updatedItems[index].productName = e.target.value;
                                  setManualReturnData({
                                    ...manualReturnData,
                                    items: updatedItems
                                  });
                                }}
                                placeholder="Enter product name"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const quantity = parseInt(e.target.value) || 1;
                                  const updatedItems = [...manualReturnData.items];
                                  updatedItems[index].quantity = quantity;
                                  updatedItems[index].totalAmount = quantity * updatedItems[index].unitPrice;
                                  setManualReturnData({
                                    ...manualReturnData,
                                    items: updatedItems
                                  });
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Unit Price</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const unitPrice = parseFloat(e.target.value) || 0;
                                  const updatedItems = [...manualReturnData.items];
                                  updatedItems[index].unitPrice = unitPrice;
                                  updatedItems[index].totalAmount = updatedItems[index].quantity * unitPrice;
                                  setManualReturnData({
                                    ...manualReturnData,
                                    items: updatedItems
                                  });
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Total</Label>
                              <Input
                                type="number"
                                value={item.totalAmount}
                                readOnly
                                className="bg-gray-50"
                              />
                            </div>
                            <div className="col-span-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  const updatedItems = manualReturnData.items.filter((_, i) => i !== index);
                                  setManualReturnData({
                                    ...manualReturnData,
                                    items: updatedItems
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-end pt-4 border-t">
                          <div className="text-lg font-semibold">
                            Total Refund Amount: ₹{manualReturnData.items.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Return Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Return Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="returnReason">Return Reason *</Label>
                        <Textarea
                          id="returnReason"
                          value={manualReturnData.reason}
                          onChange={(e) => setManualReturnData({
                            ...manualReturnData,
                            reason: e.target.value
                          })}
                          placeholder="Enter reason for return"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="refundMethod">Refund Method</Label>
                        <Select value={refundMethod} onValueChange={(value: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit Note') => setRefundMethod(value)}>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : selectedReturnInvoice && (
              <div className="space-y-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer & Invoice Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Customer:</strong> {selectedReturnInvoice.customer_details.name}</p>
                        <p><strong>Email:</strong> {selectedReturnInvoice.customer_details.email}</p>
                      </div>
                      <div>
                        <p><strong>Invoice:</strong> {selectedReturnInvoice.invoice_number}</p>
                        <p><strong>Invoice Date:</strong> {new Date(selectedReturnInvoice.invoice_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Return Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select Items to Return</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Original Qty</TableHead>
                          <TableHead>Return Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Refund</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.original_quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={item.original_quantity}
                                value={item.return_quantity}
                                onChange={(e) => updateReturnItem(index, 'return_quantity', parseInt(e.target.value) || 0)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>₹{item.unit_price}</TableCell>
                            <TableCell>
                              <Select 
                                value={item.condition} 
                                onValueChange={(value) => updateReturnItem(index, 'condition', value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Good">Good</SelectItem>
                                  <SelectItem value="Damaged">Damaged</SelectItem>
                                  <SelectItem value="Defective">Defective</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Return reason"
                                value={item.reason}
                                onChange={(e) => updateReturnItem(index, 'reason', e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              ₹{(item.return_quantity * item.unit_price).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Return Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="refund_method">Refund Method</Label>
                    <Select value={refundMethod} onValueChange={(value: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit Note') => setRefundMethod(value)}>
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
                  </div>

                  <div className="flex justify-end">
                    <div className="w-48 space-y-2">
                      <div className="flex justify-between">
                        <span>Total Refund:</span>
                        <span className="font-semibold">
                          ₹{returnItems.reduce((sum, item) => sum + (item.return_quantity * item.unit_price), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="return_notes">Additional Notes</Label>
                  <Textarea
                    id="return_notes"
                    placeholder="Add any additional notes about the return..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsReturnDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={isManualReturnMode ? submitManualReturn : submitSaleReturn}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isManualReturnMode ? 'Create Manual Return' : 'Submit Return Request'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Invoice Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Invoice</DialogTitle>
              <DialogDescription>
                Update invoice details, items, status, and notes
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">Invoice Number</Label>
                        <p className="font-medium">{selectedInvoice.invoice_number}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Customer</Label>
                        <p className="font-medium">{selectedInvoice.customer_details.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Invoice Date</Label>
                        <p className="font-medium">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Payment Status</Label>
                        {getPaymentStatusBadge(selectedInvoice.payment_status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoice Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Invoice Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>HSN</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>GST %</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                value={item.product_name || ''}
                                onChange={(e) => {
                                  const updatedItems = [...selectedInvoice.items];
                                  updatedItems[index].product_name = e.target.value;
                                  setSelectedInvoice({ ...selectedInvoice, items: updatedItems });
                                }}
                                placeholder="Product name"
                                className="w-40"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.hsn_code || ''}
                                onChange={(e) => {
                                  const updatedItems = [...selectedInvoice.items];
                                  updatedItems[index].hsn_code = e.target.value;
                                  setSelectedInvoice({ ...selectedInvoice, items: updatedItems });
                                }}
                                placeholder="HSN code"
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity ?? ''}
                                onChange={(e) => {
                                  const updatedItems = [...selectedInvoice.items];
                                  const qty = parseFloat(e.target.value) || 0;
                                  updatedItems[index].quantity = qty;
                                  const taxableAmount = qty * item.unit_price;
                                  const taxAmount = (taxableAmount * item.gst_rate) / 100;
                                  updatedItems[index].taxable_amount = taxableAmount;
                                  updatedItems[index].total_amount = taxableAmount + taxAmount;
                                  
                                  // Recalculate grand total
                                  const newGrandTotal = updatedItems.reduce((sum, i) => sum + i.total_amount, 0);
                                  setSelectedInvoice({ 
                                    ...selectedInvoice, 
                                    items: updatedItems,
                                    grand_total: newGrandTotal,
                                    balance_due: newGrandTotal - selectedInvoice.paid_amount
                                  });
                                }}
                                placeholder="Enter quantity"
                                className="w-20"
                                min="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.unit_price ?? ''}
                                onChange={(e) => {
                                  const updatedItems = [...selectedInvoice.items];
                                  const price = parseFloat(e.target.value) || 0;
                                  updatedItems[index].unit_price = price;
                                  const taxableAmount = item.quantity * price;
                                  const taxAmount = (taxableAmount * item.gst_rate) / 100;
                                  updatedItems[index].taxable_amount = taxableAmount;
                                  updatedItems[index].total_amount = taxableAmount + taxAmount;
                                  
                                  // Recalculate grand total
                                  const newGrandTotal = updatedItems.reduce((sum, i) => sum + i.total_amount, 0);
                                  setSelectedInvoice({ 
                                    ...selectedInvoice, 
                                    items: updatedItems,
                                    grand_total: newGrandTotal,
                                    balance_due: newGrandTotal - selectedInvoice.paid_amount
                                  });
                                }}
                                placeholder="Enter price"
                                className="w-24"
                                min="0"
                                step="0.01"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.gst_rate ?? ''}
                                onChange={(e) => {
                                  const updatedItems = [...selectedInvoice.items];
                                  const gstRate = parseFloat(e.target.value) || 0;
                                  updatedItems[index].gst_rate = gstRate;
                                  const taxableAmount = item.quantity * item.unit_price;
                                  const taxAmount = (taxableAmount * gstRate) / 100;
                                  updatedItems[index].taxable_amount = taxableAmount;
                                  updatedItems[index].total_amount = taxableAmount + taxAmount;
                                  
                                  // Recalculate grand total
                                  const newGrandTotal = updatedItems.reduce((sum, i) => sum + i.total_amount, 0);
                                  setSelectedInvoice({ 
                                    ...selectedInvoice, 
                                    items: updatedItems,
                                    grand_total: newGrandTotal,
                                    balance_due: newGrandTotal - selectedInvoice.paid_amount
                                  });
                                }}
                                placeholder="Enter GST rate"
                                className="w-20"
                                min="0"
                                max="100"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{item.total_amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>₹{selectedInvoice.items.reduce((sum, item) => sum + item.taxable_amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Tax:</span>
                          <span>₹{selectedInvoice.items.reduce((sum, item) => sum + (item.total_amount - item.taxable_amount), 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Grand Total:</span>
                          <span>₹{selectedInvoice.grand_total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Balance Due:</span>
                          <span>₹{selectedInvoice.balance_due.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Other Editable Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit_status">Invoice Status</Label>
                    <Select
                      value={selectedInvoice.status}
                      onValueChange={(value) => 
                        setSelectedInvoice({ ...selectedInvoice, status: value as Invoice['status'] })
                      }
                    >
                      <SelectTrigger id="edit_status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit_due_date">Due Date</Label>
                    <Input
                      id="edit_due_date"
                      type="date"
                      value={new Date(selectedInvoice.due_date).toISOString().split('T')[0]}
                      onChange={(e) =>
                        setSelectedInvoice({ ...selectedInvoice, due_date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_notes">Notes</Label>
                    <Textarea
                      id="edit_notes"
                      placeholder="Add notes about this invoice..."
                      value={selectedInvoice.notes || ''}
                      onChange={(e) =>
                        setSelectedInvoice({ ...selectedInvoice, notes: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setSelectedInvoice(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveInvoiceEdits} className="bg-blue-600 hover:bg-blue-700">
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Delete Invoice
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this invoice? This action cannot be undone and will completely remove the invoice from the database.
              </DialogDescription>
            </DialogHeader>
            {invoiceToDelete && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="font-medium">{invoiceToDelete.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">{invoiceToDelete.customer_details.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">₹{invoiceToDelete.grand_total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span>{getStatusBadge(invoiceToDelete.status)}</span>
                    </div>
                  </CardContent>
                </Card>

                {invoiceToDelete.paid_amount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> This invoice has received payments totaling ₹
                      {invoiceToDelete.paid_amount.toLocaleString()}. Deleting this invoice will also permanently remove all associated payment records.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                      setInvoiceToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteInvoice(false)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
