'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Search, Edit, Download, RefreshCw, DollarSign, TrendingUp, AlertCircle, Calendar, Filter, Eye, Trash2, Edit2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// pdfGenerator is dynamically imported on-demand for bundle optimization

interface Invoice {
  _id: string;
  customer_id?: string;
  order_id?: string;
  order_status?: string | null;
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
  customer_state?: string;
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
  total_discount?: number;
  discount_mode?: 'amount' | 'percentage';
  discount_value?: number;
  subtotal?: number;
  total_tax?: number;
  total_cgst?: number;
  total_sgst?: number;
  total_igst?: number;
}

interface OrderForInvoice {
  _id: string;
  order_number: string;
  customer_name: string;
  salesman_name: string;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    price_per_unit: number;
    total_price: number;
  }[];
  subtotal: number;
  total_amount: number;
  order_date: string;
  status: string;
  distributor_id?: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gstin?: string;
  address?: string;
  outstanding_balance?: number;
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
  manual_discount: number;
  discount_mode: 'amount' | 'percentage';
  discount_value: number;
  items: ManualInvoiceItem[];
  invoice_sequence?: string; // Custom sequence number (last 4 digits)
}

export default function InvoicingPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<OrderForInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isManualInvoiceDialogOpen, setIsManualInvoiceDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  
  // Manual invoice form state
  const [manualInvoiceForm, setManualInvoiceForm] = useState<ManualInvoiceForm>({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    payment_terms: '30 days',
    notes: '',
    manual_discount: 0,
    discount_mode: 'amount',
    discount_value: 0,
    items: []
  });
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState<string>('');
  const [invoiceSequence, setInvoiceSequence] = useState<string>(''); // Custom sequence number
  const [maxSequenceNumber, setMaxSequenceNumber] = useState<number>(0);
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState<string>(''); // Full custom invoice number
  const [isEditingFullInvoiceNumber, setIsEditingFullInvoiceNumber] = useState(false); // Toggle for editing mode
  const [isEditingExistingInvoiceNumber, setIsEditingExistingInvoiceNumber] = useState(false); // For editing existing invoice
  const [editedInvoiceNumber, setEditedInvoiceNumber] = useState<string>(''); // New invoice number for existing invoice
  const [editDiscountMode, setEditDiscountMode] = useState<'amount' | 'percentage'>('amount');
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQuantity, setItemQuantity] = useState<string>('1');
  const [itemUnitPrice, setItemUnitPrice] = useState<string>('');
  const [gstApplicationMode, setGstApplicationMode] = useState<'applied' | 'not_applied' | 'inclusive'>('applied');
  const [companyState, setCompanyState] = useState<string>('West Bengal');

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

  const recalculateInvoiceTotals = (
    itemsList: any[],
    custState: string,
    compState: string,
    orderDiscountMode: 'amount' | 'percentage',
    orderDiscountValue: number
  ) => {
    let totalGrossSubtotal = 0;
    
    // Calculate raw gross amounts first
    const itemsWithGross = itemsList.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
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

    const orderDiscount = orderDiscountMode === 'percentage'
      ? (totalGrossSubtotal * orderDiscountValue) / 100
      : orderDiscountValue;

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
      
      const gstRate = item.gst_rate ?? 18;
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
        total_amount: totalItemPrice,
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

  const updateInvoiceItemsAndRecalculate = (
    newItems: any[], 
    discountVal = editDiscountValue, 
    mode = editDiscountMode, 
    inv = selectedInvoice
  ) => {
    if (!inv) return;
    const custState = inv.customer_state || 'West Bengal';
    const calc = recalculateInvoiceTotals(newItems, custState, companyState, mode, discountVal);
    setSelectedInvoice({
      ...inv,
      items: calc.updatedItems,
      subtotal: calc.subtotal,
      taxable_amount: calc.subtotal,
      total_cgst: calc.totalCgst,
      total_sgst: calc.totalSgst,
      total_igst: calc.totalIgst,
      total_tax: calc.totalTax,
      total_discount: calc.totalDiscount,
      discount_value: discountVal,
      discount_mode: mode,
      grand_total: calc.grandTotal,
      balance_due: Math.max(0, calc.grandTotal - inv.paid_amount),
    });
  };

  const handleInvoiceItemChange = (index: number, field: string, value: any) => {
    if (!selectedInvoice) return;
    const newItems = [...selectedInvoice.items];
    if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate' || field === 'discount_percentage') {
      newItems[index] = { ...newItems[index], [field]: Number(value) || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    updateInvoiceItemsAndRecalculate(newItems);
  };

  const addInvoiceItem = () => {
    if (!selectedInvoice) return;
    const newItem: any = {
      product_id: '',
      product_name: '',
      unit: 'kg',
      quantity: 1,
      unit_price: 0,
      gst_rate: 18,
      discount_percentage: 0,
      hsn_code: '0000',
      taxable_amount: 0,
      total_amount: 0,
    };
    updateInvoiceItemsAndRecalculate([...selectedInvoice.items, newItem]);
  };

  const removeInvoiceItem = (index: number) => {
    if (!selectedInvoice) return;
    if (selectedInvoice.items.length === 1) {
      toast({
        title: "Error",
        description: "Invoice must have at least one item",
        variant: "destructive",
      });
      return;
    }
    const filtered = selectedInvoice.items.filter((_, i) => i !== index);
    updateInvoiceItemsAndRecalculate(filtered);
  };

  const handleInvoiceProductSelect = (index: number, productId: string) => {
    if (!selectedInvoice) return;
    const product = products.find(p => p._id === productId);
    if (product) {
      const newItems = [...selectedInvoice.items];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        product_name: product.name,
        unit: 'kg',
        unit_price: product.price || 0,
        hsn_code: product.hsn_code || '0000',
        gst_rate: product.gst_rate || 18,
        discount_percentage: 0,
      };
      updateInvoiceItemsAndRecalculate(newItems);
    }
  };

  useEffect(() => {
    loadInvoices(currentPage, itemsPerPage);
    loadApprovedOrders();
    loadCustomers();
    loadProducts();
    fetchCompanySettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  // Fetch preview invoice number when manual invoice dialog opens or date/sequence changes
  useEffect(() => {
    if (isManualInvoiceDialogOpen) {
      fetchPreviewInvoiceNumber();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManualInvoiceDialogOpen, manualInvoiceForm.invoice_date, invoiceSequence]);

  const loadInvoices = async (page = currentPage, limit = itemsPerPage) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/invoices?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setInvoices(data.invoices);
        if (data.pagination) {
          setCurrentPage(data.pagination.currentPage);
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
        }
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

  const loadApprovedOrders = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/orders?status=approved', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Filter out orders that already have invoices
        const orders = data.orders || [];
        const orderIds = orders.map((o: OrderForInvoice) => o._id);
        if (orderIds.length > 0) {
          const invRes = await fetch(`/api/invoices?limit=1000`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const invData = await invRes.json();
          const invoicedOrderIds = new Set(
            (invData.invoices || []).filter((inv: Invoice) => inv.order_id).map((inv: Invoice) => inv.order_id)
          );
          setApprovedOrders(orders.filter((o: OrderForInvoice) => !invoicedOrderIds.has(o._id)));
        } else {
          setApprovedOrders([]);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load approved orders",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading approved orders:', error);
      toast({
        title: "Error",
        description: "Failed to load approved orders",
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
      const response = await fetch('/api/products?limit=1000', {
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

  const fetchPreviewInvoiceNumber = async (date?: string, customSequence?: string) => {
    try {
      const invoiceDate = date || manualInvoiceForm.invoice_date;
      const sequenceParam = customSequence || invoiceSequence;
      const url = sequenceParam 
        ? `/api/invoices/preview-number?date=${invoiceDate}&sequence=${sequenceParam}`
        : `/api/invoices/preview-number?date=${invoiceDate}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setPreviewInvoiceNumber(data.invoice_number);
        setMaxSequenceNumber(data.max_sequence);
        
        // If no custom sequence is set, update it with the next available
        if (!invoiceSequence) {
          setInvoiceSequence(data.next_sequence.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching preview invoice number:', error);
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

    const parsedQty = parseInt(itemQuantity, 10) || 0;
    const parsedPrice = parseFloat(itemUnitPrice) || 0;

    if (parsedQty <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (parsedPrice <= 0) {
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
      taxableAmount = parsedQty * parsedPrice;
      taxAmount = 0;
      totalAmount = taxableAmount;
      unitPriceToStore = parsedPrice;
    } else if (gstApplicationMode === 'inclusive') {
      // GST Inclusive - Amount already includes GST, need to extract it
      // User enters price WITH GST included, so final amount = entered amount
      const totalWithGst = parsedQty * parsedPrice;
      const baseUnitPrice = parsedPrice / (1 + product.gst_rate / 100);
      taxableAmount = parsedQty * baseUnitPrice;
      taxAmount = totalWithGst - taxableAmount;
      totalAmount = totalWithGst; // Final amount is what user entered
      unitPriceToStore = baseUnitPrice; // Store the extracted base price
    } else {
      // GST Applied (default) - Add GST to the amount
      taxableAmount = parsedQty * parsedPrice;
      taxAmount = (taxableAmount * product.gst_rate) / 100;
      totalAmount = taxableAmount + taxAmount;
      unitPriceToStore = parsedPrice;
    }

    const newItem: ManualInvoiceItem = {
      product_id: product._id,
      product_name: product.name,
      hsn_code: product.hsn_code,
      quantity: parsedQty,
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
    setItemQuantity('1');
    setItemUnitPrice('');
  };

  const removeItemFromManualInvoice = (index: number) => {
    setManualInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateDiscountAmount = (
    baseTotal: number,
    mode: 'amount' | 'percentage',
    value: number,
  ) => {
    const sanitizedValue = Math.max(0, Number(value) || 0);
    const rawDiscount = mode === 'percentage'
      ? (baseTotal * sanitizedValue) / 100
      : sanitizedValue;
    return Math.min(rawDiscount, baseTotal);
  };

  // Recalculate grand total with discount applied BEFORE tax
  const recalcWithDiscount = (itemsList: Invoice['items'], mode: 'amount' | 'percentage', value: number) => {
    const { subtotal, totalTax } = calculateItemTotals(itemsList);
    const discount = calculateDiscountAmount(subtotal, mode, value);
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const adjustedTax = subtotal > 0 ? Math.round((totalTax * (discountedSubtotal / subtotal)) * 100) / 100 : 0;
    const grandTotal = Math.round((discountedSubtotal + adjustedTax) * 100) / 100;
    return { discount, grandTotal };
  };

  const calculateItemTotals = (items: Invoice['items']) => {
    const subtotal = items.reduce((sum, item) => {
      const taxable = item.taxable_amount || (item.quantity * item.unit_price) || 0;
      return sum + taxable;
    }, 0);
    const totalTax = items.reduce((sum, item) => {
      const taxable = item.taxable_amount || (item.quantity * item.unit_price) || 0;
      const tax = item.total_amount - taxable;
      return sum + (tax > 0 ? tax : 0);
    }, 0);

    return {
      subtotal,
      totalTax,
      grossTotal: subtotal + totalTax,
    };
  };

  const getManualInvoiceTotals = () => {
    const subtotal = manualInvoiceForm.items.reduce((sum, item) => sum + item.taxable_amount, 0);
    const rawTotalTax = manualInvoiceForm.items.reduce((sum, item) => sum + item.tax_amount, 0);

    // Discount applies to subtotal (pre-tax), then tax is proportionally adjusted
    const clampedDiscount = calculateDiscountAmount(
      subtotal,
      manualInvoiceForm.discount_mode,
      manualInvoiceForm.discount_value,
    );
    const discountedSubtotal = Math.max(0, subtotal - clampedDiscount);
    const totalTax = subtotal > 0 ? Math.round((rawTotalTax * (discountedSubtotal / subtotal)) * 100) / 100 : 0;
    const grandTotal = Math.round((discountedSubtotal + totalTax) * 100) / 100;

    return {
      subtotal,
      totalTax,
      grossTotal: subtotal + rawTotalTax,
      discountAmount: clampedDiscount,
      grandTotal,
    };
  };

  const createManualInvoice = async () => {
    try {
      const totals = getManualInvoiceTotals();

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

      if (isEditingFullInvoiceNumber && !customInvoiceNumber.trim()) {
        toast({
          title: "Error",
          description: "Please enter a custom invoice number or switch back to sequence mode",
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
        body: JSON.stringify({
          ...manualInvoiceForm,
          manual_discount: totals.discountAmount,
          discount_mode: manualInvoiceForm.discount_mode,
          discount_value: Math.max(0, manualInvoiceForm.discount_value || 0),
          invoice_sequence: !isEditingFullInvoiceNumber && invoiceSequence ? parseInt(invoiceSequence) : undefined,
          custom_invoice_number: isEditingFullInvoiceNumber && customInvoiceNumber ? customInvoiceNumber : undefined
        }),
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
          manual_discount: 0,
          discount_mode: 'amount',
          discount_value: 0,
          items: []
        });
        setInvoiceSequence(''); // Reset sequence number
        setPreviewInvoiceNumber(''); // Reset preview
        setCustomInvoiceNumber(''); // Reset custom invoice number
        setIsEditingFullInvoiceNumber(false); // Reset editing mode
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

  const createInvoiceFromOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Invoice created successfully from order",
        });
        setIsCreateDialogOpen(false);
        loadInvoices();
        loadApprovedOrders();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating invoice from order:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const handleDispatchOrder = async (orderId: string) => {
    if (!confirm('Mark this order as dispatched? This will transfer stock to the distributor.')) {
      return;
    }
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'dispatched' }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Order dispatched — stock transferred to distributor",
        });
        loadInvoices();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to dispatch order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast({
        title: "Error",
        description: "Failed to dispatch order",
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
        const mode = data.invoice.discount_mode === 'percentage' ? 'percentage' : 'amount';
        const value = Math.max(
          0,
          Number(
            data.invoice.discount_value ??
              (mode === 'amount' ? data.invoice.total_discount : 0) ??
              0,
          ),
        );

        const custState = data.invoice.customer_state || customers.find(c => c._id === data.invoice.customer_id || c._id === data.invoice.distributor_id)?.address || 'West Bengal';

        // Ensure all items are properly initialized and enriched
        const initialItems = data.invoice.items.map((item: any) => {
          const product = products.find(p => p._id === item.product_id);
          return {
            ...item,
            discount_percentage: item.discount_percentage ?? 0,
            hsn_code: item.hsn_code || product?.hsn_code || '0000',
            unit_price: item.unit_price || item.price || product?.price || 0,
          };
        });

        const invoiceWithCalculatedItems = {
          ...data.invoice,
          customer_state: custState,
          discount_mode: mode,
          discount_value: value,
          total_discount: data.invoice.total_discount || 0,
          items: initialItems
        };

        setEditDiscountMode(mode);
        setEditDiscountValue(value);
        setSelectedInvoice(invoiceWithCalculatedItems);
        setIsEditDialogOpen(true);

        // Run initial calculation to update and sync all split taxes
        setTimeout(() => {
          updateInvoiceItemsAndRecalculate(initialItems, value, mode, invoiceWithCalculatedItems);
        }, 50);
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
          subtotal: selectedInvoice.subtotal,
          taxable_amount: selectedInvoice.subtotal,
          total_discount: selectedInvoice.total_discount,
          discount_mode: selectedInvoice.discount_mode,
          discount_value: selectedInvoice.discount_value,
          grand_total: selectedInvoice.grand_total,
          balance_due: selectedInvoice.balance_due,
          total_cgst: selectedInvoice.total_cgst,
          total_sgst: selectedInvoice.total_sgst,
          total_igst: selectedInvoice.total_igst,
          total_tax: selectedInvoice.total_tax,
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

  // Show all invoices from the current page (filtering is done on client side for now)
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

  const manualTotals = getManualInvoiceTotals();
  const selectedManualCustomer = customers.find((customer) => customer._id === manualInvoiceForm.customer_id);
  const selectedCustomerOutstanding = Math.max(0, selectedManualCustomer?.outstanding_balance || 0);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Invoice Management</h1>
            <p className="text-gray-600 text-sm mt-1">Manage GST-compliant invoices and billing</p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={() => setIsManualInvoiceDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Manual Invoice</span>
              <span className="sm:hidden">Manual</span>
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">From Orders</span>
              <span className="sm:hidden">Order</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
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
                  loadApprovedOrders();
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
            <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-xs sm:text-sm">{invoice.customer_details.name}</div>
                        <div className="text-xs text-gray-600 hidden sm:block">{invoice.customer_details.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
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
                    <TableCell className="hidden sm:table-cell">
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
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
                        {invoice.order_id && invoice.order_status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                            onClick={() => handleDispatchOrder(invoice.order_id!)}
                            title="Dispatch to Distributor"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Dispatch
                          </Button>
                        )}
                        {invoice.order_id && invoice.order_status === 'dispatched' && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            Dispatched
                          </Badge>
                        )}
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
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('leaftrack_token');
                              const response = await fetch(`/api/invoices/${invoice._id}`, {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              });

                              const data = await response.json();
                              if (data.success && data.invoice) {
                                const customerId = typeof data.invoice.customer_id === 'string'
                                  ? data.invoice.customer_id
                                  : data.invoice.customer_id?._id;
                                const matchingCustomer = customers.find((customer) => customer._id === customerId);

                                const { generateInvoicePDF } = await import('@/lib/pdfGenerator');
                                const success = await generateInvoicePDF({
                                  ...data.invoice,
                                  customer_total_due: matchingCustomer?.outstanding_balance ?? data.invoice.customer_total_due,
                                });
                                if (success) {
                                  toast({
                                    title: 'Success',
                                    description: 'Invoice PDF downloaded successfully',
                                  });
                                } else {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to generate PDF',
                                    variant: 'destructive',
                                  });
                                }
                              } else {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to load invoice details',
                                  variant: 'destructive',
                                });
                              }
                            } catch (error) {
                              console.error('PDF generation error:', error);
                              toast({
                                title: 'Error',
                                description: 'Failed to download PDF',
                                variant: 'destructive',
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
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">
                  {invoices.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Invoice Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create Invoice from Order</DialogTitle>
              <DialogDescription>
                Select an approved order to generate a GST-compliant invoice
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {approvedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>No approved orders waiting for invoicing.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Salesman</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedOrders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.salesman_name}</TableCell>
                        <TableCell>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</TableCell>
                        <TableCell>₹{order.total_amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          {new Date(order.order_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => createInvoiceFromOrder(order._id)}
                          >
                            Generate Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) {
            setIsEditingExistingInvoiceNumber(false);
            setEditedInvoiceNumber('');
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Invoice Details - {selectedInvoice?.invoice_number}
              </DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <strong>Status:</strong>
                        {getStatusBadge(selectedInvoice.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <strong>Payment:</strong>
                        {getPaymentStatusBadge(selectedInvoice.payment_status)}
                      </div>
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
                          <TableCell>₹{Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell>₹{Number(item.taxable_amount).toFixed(2)}</TableCell>
                          <TableCell>{item.gst_rate}%</TableCell>
                          <TableCell>₹{Number(item.total_amount).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-72 space-y-2 text-sm">
                      {selectedInvoice.subtotal != null && (
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                        </div>
                      )}
                      {(selectedInvoice.total_discount ?? 0) > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>
                            Discount
                            {selectedInvoice.discount_mode === 'percentage' && selectedInvoice.discount_value
                              ? ` (${selectedInvoice.discount_value}%)`
                              : ''}
                            :
                          </span>
                          <span>- ₹{Number(selectedInvoice.total_discount).toFixed(2)}</span>
                        </div>
                      )}
                      {(selectedInvoice.total_tax ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Tax (GST):</span>
                          <span>₹{Number(selectedInvoice.total_tax).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Grand Total:</span>
                        <span>₹{Number(selectedInvoice.grand_total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid Amount:</span>
                        <span className="text-green-600">₹{Number(selectedInvoice.paid_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Balance Due:</span>
                        <span className="font-semibold text-red-600">₹{Number(selectedInvoice.balance_due).toFixed(2)}</span>
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

            {/* Preview Invoice Number with Edit Options */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Invoice Number</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingFullInvoiceNumber(!isEditingFullInvoiceNumber);
                    if (!isEditingFullInvoiceNumber) {
                      // Switching to full edit mode - populate with current preview
                      setCustomInvoiceNumber(previewInvoiceNumber || '');
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {isEditingFullInvoiceNumber ? 'Edit Sequence Only' : 'Edit Full Invoice Number'}
                </button>
              </div>
              
              {!isEditingFullInvoiceNumber ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-blue-700">
                      {previewInvoiceNumber ? previewInvoiceNumber.split('-').slice(0, 2).join('-') + '-' : 'INV-YYYYMMDD-'}
                    </p>
                    <input
                      type="text"
                      value={invoiceSequence}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setInvoiceSequence(value);
                      }}
                      placeholder="0000"
                      maxLength={4}
                      className="w-20 px-2 py-1 text-lg font-bold text-blue-700 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-2">
                    Next available: <span className="font-semibold">{(maxSequenceNumber + 1).toString().padStart(4, '0')}</span>
                    {' '} | Highest used: <span className="font-semibold">{maxSequenceNumber.toString().padStart(4, '0')}</span>
                  </p>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={customInvoiceNumber}
                    onChange={(e) => setCustomInvoiceNumber(e.target.value.toUpperCase())}
                    placeholder="INV-YYYYMMDD-XXXX or custom format"
                    className="w-full px-3 py-2 text-lg font-bold text-blue-700 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Custom format: Enter any invoice number. Make sure it&apos;s unique!
                  </p>
                </>
              )}
            </div>
            
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
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
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
                        onChange={(e) => setItemUnitPrice(e.target.value)}
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
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Discount Type</Label>
                          <Select
                            value={manualInvoiceForm.discount_mode}
                            onValueChange={(value: 'amount' | 'percentage') =>
                              setManualInvoiceForm((prev) => ({
                                ...prev,
                                discount_mode: value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount">Amount (₹)</SelectItem>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="manual_discount" className="text-xs text-gray-600">
                            Discount Value ({manualInvoiceForm.discount_mode === 'percentage' ? '%' : '₹'})
                          </Label>
                          <Input
                            id="manual_discount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={manualInvoiceForm.discount_value}
                            onChange={(e) =>
                              setManualInvoiceForm((prev) => ({
                                ...prev,
                                discount_value: Math.max(0, parseFloat(e.target.value) || 0),
                              }))
                            }
                            onFocus={(e) => { if (parseFloat(e.target.value) === 0) e.target.value = ''; }}
                            onBlur={(e) => { if (e.target.value === '') setManualInvoiceForm((prev) => ({ ...prev, discount_value: 0 })); }}
                            className="h-8"
                          />
                        </div>
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{manualTotals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>₹{manualTotals.totalTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Discount:</span>
                          <span>-₹{manualTotals.discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Customer Total Due:</span>
                          <span>₹{(selectedCustomerOutstanding + manualTotals.grandTotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Grand Total:</span>
                          <span>₹{manualTotals.grandTotal.toFixed(2)}</span>
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
                  className=""
                >
                  Create Invoice
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">Invoice Number</Label>
                        {isEditingExistingInvoiceNumber ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedInvoiceNumber}
                              onChange={(e) => setEditedInvoiceNumber(e.target.value.toUpperCase())}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                              placeholder="Enter new invoice number"
                            />
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!editedInvoiceNumber.trim()) {
                                  toast({
                                    title: "Error",
                                    description: "Invoice number cannot be empty",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                try {
                                  const token = localStorage.getItem('leaftrack_token');
                                  const response = await fetch(`/api/invoices/${selectedInvoice._id}/update-number`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ new_invoice_number: editedInvoiceNumber })
                                  });
                                  
                                  const data = await response.json();
                                  if (data.success) {
                                    toast({
                                      title: "Success",
                                      description: "Invoice number updated successfully"
                                    });
                                    setIsEditingExistingInvoiceNumber(false);
                                    loadInvoices();
                                    setIsViewDialogOpen(false);
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: data.error || "Failed to update invoice number",
                                      variant: "destructive"
                                    });
                                  }
                                } catch {
                                  toast({
                                    title: "Error",
                                    description: "Failed to update invoice number",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingExistingInvoiceNumber(false);
                                setEditedInvoiceNumber(selectedInvoice.invoice_number);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{selectedInvoice.invoice_number}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingExistingInvoiceNumber(true);
                                setEditedInvoiceNumber(selectedInvoice.invoice_number);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
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
                <Card className="border border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b border-gray-200 py-3">
                    <CardTitle className="text-sm font-semibold text-slate-800">Invoice Items</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="font-semibold text-slate-700">Product</TableHead>
                            <TableHead className="font-semibold text-slate-700">HSN</TableHead>
                            <TableHead className="font-semibold text-slate-700">Unit</TableHead>
                            <TableHead className="font-semibold text-slate-700 w-20">Qty</TableHead>
                            <TableHead className="font-semibold text-slate-700 w-24">Unit Price</TableHead>
                            <TableHead className="font-semibold text-slate-700 w-20">Item Disc (%)</TableHead>
                            <TableHead className="font-semibold text-slate-700 w-20">GST %</TableHead>
                            <TableHead className="text-right font-semibold text-slate-700">Total</TableHead>
                            <TableHead className="w-10 text-center font-semibold text-slate-700"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.items.map((item, index) => (
                            <TableRow key={index} className="hover:bg-slate-50/40 transition-colors">
                              <TableCell className="align-middle">
                                <Select
                                  value={item.product_id || ''}
                                  onValueChange={(value) => handleInvoiceProductSelect(index, value)}
                                >
                                  <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((p) => (
                                      <SelectItem key={p._id} value={p._id}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                    {item.product_id && !products.some(p => p._id === item.product_id) && (
                                      <SelectItem key={item.product_id} value={item.product_id}>
                                        {item.product_name || 'Selected Product'}
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="align-middle">
                                <Input
                                  value={item.hsn_code || ''}
                                  onChange={(e) => handleInvoiceItemChange(index, 'hsn_code', e.target.value)}
                                  placeholder="HSN code"
                                  className="w-20 h-9"
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <Select
                                  value={item.unit || 'kg'}
                                  onValueChange={(value) => handleInvoiceItemChange(index, 'unit', value)}
                                >
                                  <SelectTrigger className="w-16 h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="kg">KG</SelectItem>
                                    <SelectItem value="box">Box</SelectItem>
                                    <SelectItem value="bag">Bag</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="align-middle">
                                <Input
                                  type="number"
                                  value={item.quantity ?? ''}
                                  onChange={(e) => handleInvoiceItemChange(index, 'quantity', e.target.value)}
                                  placeholder="0"
                                  className="w-20 h-9"
                                  min="0"
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <div className="relative">
                                  <span className="absolute left-2 top-2.5 text-xs text-gray-500">₹</span>
                                  <Input
                                    type="number"
                                    value={item.unit_price ?? ''}
                                    onChange={(e) => handleInvoiceItemChange(index, 'unit_price', e.target.value)}
                                    placeholder="0.00"
                                    className="pl-5 w-24 h-9"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="align-middle">
                                <Input
                                  type="number"
                                  value={item.discount_percentage ?? ''}
                                  onChange={(e) => handleInvoiceItemChange(index, 'discount_percentage', e.target.value)}
                                  placeholder="0"
                                  className="w-16 h-9"
                                  min="0"
                                  max="100"
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <Select
                                  value={String(item.gst_rate ?? 18)}
                                  onValueChange={(value) => handleInvoiceItemChange(index, 'gst_rate', Number(value))}
                                >
                                  <SelectTrigger className="w-16 h-9">
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
                              <TableCell className="text-right font-medium align-middle">
                                ₹{(item.total_amount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center align-middle">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeInvoiceItem(index)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 font-medium"
                        onClick={addInvoiceItem}
                      >
                        <Plus className="h-4 w-4" /> Add Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Summary and Settings Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Settings column */}
                  <div className="space-y-4">
                    <Card className="border border-gray-200 shadow-sm">
                      <CardHeader className="py-3 bg-slate-50 border-b border-gray-200">
                        <CardTitle className="text-sm font-semibold text-slate-800">Order Discount & Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-600">Discount Type</Label>
                            <Select
                              value={editDiscountMode}
                              onValueChange={(value: 'amount' | 'percentage') => {
                                setEditDiscountMode(value);
                                updateInvoiceItemsAndRecalculate(selectedInvoice.items, editDiscountValue, value);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">Amount (₹)</SelectItem>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="edit_discount" className="text-xs font-semibold text-gray-600">
                              Discount Value ({editDiscountMode === 'percentage' ? '%' : '₹'})
                            </Label>
                            <Input
                              id="edit_discount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={editDiscountValue}
                              onChange={(e) => {
                                const nextValue = Math.max(0, parseFloat(e.target.value) || 0);
                                setEditDiscountValue(nextValue);
                                updateInvoiceItemsAndRecalculate(selectedInvoice.items, nextValue, editDiscountMode);
                              }}
                              onFocus={(e) => { if (parseFloat(e.target.value) === 0) e.target.value = ''; }}
                              onBlur={(e) => {
                                if (e.target.value === '') {
                                  setEditDiscountValue(0);
                                  updateInvoiceItemsAndRecalculate(selectedInvoice.items, 0, editDiscountMode);
                                }
                              }}
                              className="h-9"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="edit_status" className="text-xs font-semibold text-gray-600">Invoice Status</Label>
                            <Select
                              value={selectedInvoice.status}
                              onValueChange={(value) => 
                                setSelectedInvoice({ ...selectedInvoice, status: value as Invoice['status'] })
                              }
                            >
                              <SelectTrigger id="edit_status" className="h-9">
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

                          <div className="space-y-1">
                            <Label htmlFor="edit_due_date" className="text-xs font-semibold text-gray-600">Due Date</Label>
                            <Input
                              id="edit_due_date"
                              type="date"
                              value={new Date(selectedInvoice.due_date).toISOString().split('T')[0]}
                              onChange={(e) =>
                                setSelectedInvoice({ ...selectedInvoice, due_date: e.target.value })
                              }
                              className="h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="edit_notes" className="text-xs font-semibold text-gray-600">Notes</Label>
                          <Textarea
                            id="edit_notes"
                            placeholder="Add notes about this invoice..."
                            value={selectedInvoice.notes || ''}
                            onChange={(e) =>
                              setSelectedInvoice({ ...selectedInvoice, notes: e.target.value })
                            }
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary Box Column */}
                  <div>
                    <Card className="border border-slate-200 bg-slate-50 shadow-sm overflow-hidden h-full">
                      <CardHeader className="py-3 bg-slate-100 border-b border-slate-200">
                        <CardTitle className="text-sm font-semibold text-slate-800">Pricing Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        {(() => {
                          const isSameState = (selectedInvoice.customer_state || 'West Bengal').trim().toLowerCase() === companyState.trim().toLowerCase();
                          const grossSubtotal = selectedInvoice.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
                          
                          return (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                                <span className="text-slate-600">Gross Subtotal:</span>
                                <span className="font-medium text-slate-900">₹{grossSubtotal.toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60 text-red-600">
                                <span>Pre-tax Order Discount:</span>
                                <span>-₹{(selectedInvoice.total_discount || 0).toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                                <span className="text-slate-600">Taxable Subtotal:</span>
                                <span className="font-semibold text-slate-900">₹{(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                              </div>

                              {isSameState ? (
                                <>
                                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60 text-slate-600">
                                    <span>CGST Amount:</span>
                                    <span className="font-medium text-slate-900">₹{(selectedInvoice.total_cgst || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60 text-slate-600">
                                    <span>SGST Amount:</span>
                                    <span className="font-medium text-slate-900">₹{(selectedInvoice.total_sgst || 0).toFixed(2)}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60 text-slate-600">
                                  <span>IGST Amount:</span>
                                  <span className="font-medium text-slate-900">₹{(selectedInvoice.total_igst || 0).toFixed(2)}</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60">
                                <span className="text-slate-600">Total Tax:</span>
                                <span className="font-medium text-slate-900">₹{(selectedInvoice.total_tax || 0).toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between items-center text-base font-bold py-2 border-b border-slate-300">
                                <span className="text-slate-800">Grand Total:</span>
                                <span className="text-blue-700">₹{(selectedInvoice.grand_total || 0).toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-200/60 text-slate-600">
                                <span>Paid Amount:</span>
                                <span className="font-medium text-green-700">₹{(selectedInvoice.paid_amount || 0).toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between items-center text-base font-bold py-2 bg-red-50 px-3 rounded-lg border border-red-200 text-red-700 mt-2">
                                <span>Balance Due:</span>
                                <span>₹{(selectedInvoice.balance_due || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
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
