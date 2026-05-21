'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, User, Package, IndianRupee, Save, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: string;
  unit: 'kg' | 'box' | 'bag';
  price_per_unit: string;
  hsn_code: string;
  gst_rate: number;
  discount_percentage: string;
  taxable_amount: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_price: number;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  gstin?: string;
  email?: string;
  state?: string;
}

interface Product {
  _id: string;
  name: string;
  manufacturingCost: number;
  totalStock: number;
  hsn_code: string;
  gst_rate: number;
}

export default function ExecutiveNewOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerState, setCustomerState] = useState('West Bengal');
  const [companyState, setCompanyState] = useState('West Bengal');

  const [items, setItems] = useState<OrderItem[]>([
    {
      product_name: '',
      quantity: '',
      unit: 'kg',
      price_per_unit: '',
      hsn_code: '0000',
      gst_rate: 18,
      discount_percentage: '0',
      taxable_amount: 0,
      tax_amount: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      total_price: 0
    },
  ]);

  const [discountMode, setDiscountMode] = useState<'amount' | 'percentage'>('amount');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'captured' | 'denied' | 'unavailable'>('pending');

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchCompanySettings();
    
    // Capture GPS location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationLat(position.coords.latitude);
          setLocationLng(position.coords.longitude);
          setLocationStatus('captured');
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          setLocationStatus(error.code === 1 ? 'denied' : 'unavailable');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocationStatus('unavailable');
    }
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/settings/company', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.settings?.state) {
        setCompanyState(data.settings.state);
        // Default customer state to company state
        setCustomerState(data.settings.state);
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
      if (data.success) setCustomers(data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/products?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.products) {
        setProducts(data.products);
      } else if (data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const recalculateAllTotals = (
    itemsList: OrderItem[],
    custState: string,
    compState: string,
    orderDiscountMode: 'amount' | 'percentage',
    orderDiscountValueStr: string
  ) => {
    let totalGrossSubtotal = 0;
    
    // Calculate raw gross amounts first
    const itemsWithGross = itemsList.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price_per_unit) || 0;
      const grossAmount = qty * price;
      
      const itemDiscPct = parseFloat(item.discount_percentage || '0') || 0;
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

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerContact(customer.phone);
      setCustomerAddress(customer.address || '');
      setCustomerGstin(customer.gstin || '');
      setCustomerEmail(customer.email || '');
      const stateVal = customer.state || companyState;
      setCustomerState(stateVal);
      
      const calc = recalculateAllTotals(items, stateVal, companyState, discountMode, discountAmount);
      setItems(calc.updatedItems);
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const basePrice = product.manufacturingCost * 1.3;
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        product_name: product.name,
        unit: 'kg',
        price_per_unit: basePrice.toFixed(2),
        hsn_code: product.hsn_code || '0000',
        gst_rate: product.gst_rate || 18,
        discount_percentage: '0',
      };
      const calc = recalculateAllTotals(newItems, customerState, companyState, discountMode, discountAmount);
      setItems(calc.updatedItems);
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    const newItems = [...items];
    if (field === 'gst_rate') {
      newItems[index] = { ...newItems[index], [field]: parseInt(value) || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    const calc = recalculateAllTotals(newItems, customerState, companyState, discountMode, discountAmount);
    setItems(calc.updatedItems);
  };

  const handleStateChange = (state: string) => {
    setCustomerState(state);
    const calc = recalculateAllTotals(items, state, companyState, discountMode, discountAmount);
    setItems(calc.updatedItems);
  };

  const handleDiscountChange = (val: string) => {
    setDiscountAmount(val);
    const calc = recalculateAllTotals(items, customerState, companyState, discountMode, val);
    setItems(calc.updatedItems);
  };

  const handleDiscountModeChange = (mode: 'amount' | 'percentage') => {
    setDiscountMode(mode);
    setDiscountAmount('0');
    const calc = recalculateAllTotals(items, customerState, companyState, mode, '0');
    setItems(calc.updatedItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product_name: '',
        quantity: '',
        unit: 'kg',
        price_per_unit: '',
        hsn_code: '0000',
        gst_rate: 18,
        discount_percentage: '0',
        taxable_amount: 0,
        tax_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_price: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Order must have at least one item');
      return;
    }
    const filtered = items.filter((_, i) => i !== index);
    const calc = recalculateAllTotals(filtered, customerState, companyState, discountMode, discountAmount);
    setItems(calc.updatedItems);
  };

  const getComputedTotals = () => {
    return recalculateAllTotals(items, customerState, companyState, discountMode, discountAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !customerContact) {
      toast.error('Please provide customer name and contact');
      return;
    }

    const validItems = items.filter(item => item.product_name && parseFloat(item.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item with quantity');
      return;
    }

    const { subtotal, totalTax, totalDiscount, grandTotal } = getComputedTotals();

    // Payload matches what the order APIs expect, with detailed breakdown items
    const payload = {
      customer_id: selectedCustomerId || undefined,
      distributor_id: selectedCustomerId || undefined,
      customer_name: customerName,
      customer_contact: customerContact,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      customer_email: customerEmail,
      items: validItems.map(item => ({
        product_id: item.product_id || undefined,
        product_name: item.product_name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        price_per_unit: parseFloat(item.price_per_unit),
        total_price: item.total_price, // including tax
      })),
      subtotal, // pre-tax discounted subtotal
      tax_percentage: validItems.length > 0 ? validItems[0].gst_rate : 18, // fallback
      tax_amount: totalTax,
      discount_amount: totalDiscount,
      total_amount: grandTotal,
      notes,
      location_lat: locationLat,
      location_lng: locationLng,
    };

    setLoading(true);
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        router.push('/executive/orders');
      } else {
        toast.error(data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalCgst, totalSgst, totalIgst, totalTax, totalDiscount, grandTotal } = getComputedTotals();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-brand-100 shadow-sm">
          <CardHeader className="bg-brand-50/40 border-b border-gray-100">
            <CardTitle className="text-brand-900">Create New Order</CardTitle>
            <CardDescription className="text-gray-600">
              Complete detailed GST and discount calculations. Your order will be sent to the admin for approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${locationStatus === 'captured' ? 'text-green-600 animate-pulse' : locationStatus === 'pending' ? 'text-yellow-500' : 'text-red-500'}`} />
              {locationStatus === 'captured' && (
                <span className="text-green-700 font-medium">Location captured ({locationLat?.toFixed(4)}, {locationLng?.toFixed(4)})</span>
              )}
              {locationStatus === 'pending' && (
                <span className="text-yellow-600">Capturing location...</span>
              )}
              {locationStatus === 'denied' && (
                <span className="text-red-600">Location access denied — please enable location permissions</span>
              )}
              {locationStatus === 'unavailable' && (
                <span className="text-red-600">Location service unavailable</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="border-brand-100 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-brand-50/20 py-3">
            <CardTitle className="flex items-center text-sm font-semibold text-brand-900">
              <User className="mr-2 h-4 w-4 text-brand-600" />Customer & Shipping Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <Label className="text-gray-700">Select Existing Distributor (Optional)</Label>
              <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger className="focus:ring-brand-500"><SelectValue placeholder="Choose a customer or enter details manually..." /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name} - {c.phone} {c.state ? `(${c.state})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Distributor/Customer Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Enter name" className="focus-visible:ring-brand-500" />
              </div>
              <div>
                <Label className="text-gray-700">Contact Number *</Label>
                <Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} required placeholder="+91 98765 43210" className="focus-visible:ring-brand-500" />
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Full Shipping Address</Label>
              <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Full shipping address..." rows={2} className="focus-visible:ring-brand-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-700">Distributor State *</Label>
                <Select value={customerState} onValueChange={handleStateChange}>
                  <SelectTrigger className="focus:ring-brand-500"><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="West Bengal">West Bengal</SelectItem>
                    <SelectItem value="Assam">Assam</SelectItem>
                    <SelectItem value="Bihar">Bihar</SelectItem>
                    <SelectItem value="Jharkhand">Jharkhand</SelectItem>
                    <SelectItem value="Odisha">Odisha</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                    <SelectItem value="Karnataka">Karnataka</SelectItem>
                    <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                    <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700">GSTIN (Optional)</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} placeholder="19ABCDE1234F1Z5" className="focus-visible:ring-brand-500 font-mono uppercase" />
              </div>
              <div>
                <Label className="text-gray-700">Email Address (Optional)</Label>
                <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" className="focus-visible:ring-brand-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="border-brand-100 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-brand-50/20 py-3">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-sm font-semibold text-brand-900">
                <Package className="mr-2 h-4 w-4 text-brand-600" />Order Items & Individual Discounts
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-brand-300 text-brand-700 hover:bg-brand-50">
                <Plus className="mr-1 h-3.5 w-3.5" />Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ScrollArea className="w-full">
              <div className="min-w-[1000px] pb-2">
                <Table>
                  <TableHeader className="bg-gray-50/70">
                    <TableRow>
                      <TableHead className="w-[260px]">Product</TableHead>
                      <TableHead className="w-[100px]">Qty</TableHead>
                      <TableHead className="w-[90px]">Unit</TableHead>
                      <TableHead className="w-[110px]">Price (₹)</TableHead>
                      <TableHead className="w-[100px]">Disc (%)</TableHead>
                      <TableHead className="w-[100px]">GST (%)</TableHead>
                      <TableHead className="w-[110px] text-right">Taxable (₹)</TableHead>
                      <TableHead className="w-[110px] text-right">Tax (₹)</TableHead>
                      <TableHead className="w-[120px] text-right">Total (₹)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} className="hover:bg-brand-50/10">
                        <TableCell>
                          <Select value={item.product_id || ''} onValueChange={(v) => handleProductSelect(index, v)}>
                            <SelectTrigger className="focus:ring-brand-500">
                              <SelectValue placeholder={productsLoading ? 'Loading...' : 'Select product...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.length === 0 && !productsLoading && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
                              )}
                              {products.map((p) => (
                                <SelectItem key={p._id} value={p._id}>
                                  {p.name} {p.totalStock > 0 ? `(Stock: ${p.totalStock})` : '(No stock)'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!item.product_id && (
                            <Input className="mt-2 focus-visible:ring-brand-500" value={item.product_name} onChange={(e) => handleItemChange(index, 'product_name', e.target.value)} placeholder="Or enter manually" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" min="0" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} placeholder="0" className="focus-visible:ring-brand-500" />
                        </TableCell>
                        <TableCell>
                          <Select value={item.unit} onValueChange={(v) => handleItemChange(index, 'unit', v)}>
                            <SelectTrigger className="focus:ring-brand-500"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">KG</SelectItem>
                              <SelectItem value="box">Box</SelectItem>
                              <SelectItem value="bag">Bag</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" min="0" value={item.price_per_unit} onChange={(e) => handleItemChange(index, 'price_per_unit', e.target.value)} placeholder="0.00" className="focus-visible:ring-brand-500" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.1" min="0" max="100" value={item.discount_percentage} onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)} placeholder="0" className="focus-visible:ring-brand-500" />
                        </TableCell>
                        <TableCell>
                          <Select value={item.gst_rate.toString()} onValueChange={(v) => handleItemChange(index, 'gst_rate', v)}>
                            <SelectTrigger className="focus:ring-brand-500"><SelectValue /></SelectTrigger>
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
                          ₹{item.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-gray-500 text-sm">
                          ₹{item.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <div className="text-[10px] text-gray-400">
                            {customerState.trim().toLowerCase() === companyState.trim().toLowerCase() ? (
                              <span>C:{item.cgst_amount.toFixed(1)} S:{item.sgst_amount.toFixed(1)}</span>
                            ) : (
                              <span>I:{item.igst_amount.toFixed(1)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900">
                          ₹{item.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1} className="hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card className="border-brand-100 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-brand-50/20 py-3">
            <CardTitle className="flex items-center text-sm font-semibold text-brand-900">
              <IndianRupee className="mr-2 h-4 w-4 text-brand-600" />Order Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">General Order-Level Discount</Label>
                <div className="flex gap-2">
                  <Select value={discountMode} onValueChange={handleDiscountModeChange}>
                    <SelectTrigger className="w-[120px] focus:ring-brand-500"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Amount (₹)</SelectItem>
                      <SelectItem value="percentage">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.01" min="0" value={discountAmount} onChange={(e) => handleDiscountChange(e.target.value)} className="focus-visible:ring-brand-500 flex-1" />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-brand-700">Intra-State Split Rule Active:</span> GST is split equally into CGST & SGST when billing inside {companyState}. Otherwise, IGST is applied.
                </div>
              </div>
            </div>

            <div className="bg-brand-50/60 border border-brand-100 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxable Amount (Subtotal):</span>
                <span className="font-semibold text-gray-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Order-Level Discount:</span>
                <span className="font-semibold text-red-600">- ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {customerState.trim().toLowerCase() === companyState.trim().toLowerCase() ? (
                <>
                  <div className="flex justify-between text-sm text-gray-500 pl-4 border-l-2 border-brand-200">
                    <span>CGST (Central Tax):</span>
                    <span>₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 pl-4 border-l-2 border-brand-200">
                    <span>SGST (State Tax):</span>
                    <span>₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm text-gray-500 pl-4 border-l-2 border-brand-200">
                  <span>IGST (Integrated Tax):</span>
                  <span>₹{totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Tax Amount:</span>
                <span className="font-semibold text-gray-900">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-brand-100">
                <span className="text-gray-900">Grand Total (Tax Inc.):</span>
                <span className="text-brand-700 text-xl font-extrabold">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <Label className="text-gray-700">Internal Order Notes (Optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add specific order processing notes here..." rows={3} className="focus-visible:ring-brand-500" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="text-gray-600 border-gray-300">Cancel</Button>
          <Button type="submit" disabled={loading} size="lg" className="bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-md">
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Submitting...' : 'Submit for Admin Approval'}
          </Button>
        </div>
      </form>
    </div>
  );
}
