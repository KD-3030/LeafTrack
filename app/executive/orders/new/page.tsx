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

interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: string;
  unit: 'kg' | 'box' | 'bag';
  price_per_unit: string;
  total_price: number;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  gstin?: string;
  email?: string;
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

  const [items, setItems] = useState<OrderItem[]>([
    { product_name: '', quantity: '', unit: 'kg', price_per_unit: '', total_price: 0 },
  ]);

  const [taxPercentage, setTaxPercentage] = useState('18');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'captured' | 'denied' | 'unavailable'>('pending');

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
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
      console.log('Products API response:', data);
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

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerContact(customer.phone);
      setCustomerAddress(customer.address || '');
      setCustomerGstin(customer.gstin || '');
      setCustomerEmail(customer.email || '');
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
      };
      setItems(newItems);
      calculateItemTotal(index, newItems);
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    if (field === 'quantity' || field === 'price_per_unit') {
      calculateItemTotal(index, newItems);
    }
  };

  const calculateItemTotal = (index: number, itemsList: OrderItem[]) => {
    const item = itemsList[index];
    const quantity = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price_per_unit) || 0;
    const newItems = [...itemsList];
    newItems[index].total_price = quantity * price;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_name: '', quantity: '', unit: 'kg', price_per_unit: '', total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) { toast.error('Order must have at least one item'); return; }
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const tax = (subtotal * parseFloat(taxPercentage)) / 100;
    const discount = parseFloat(discountAmount) || 0;
    return { subtotal, tax, discount, total: subtotal + tax - discount };
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

    const { subtotal, tax, total } = calculateTotals();

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
        total_price: item.total_price,
      })),
      subtotal,
      tax_percentage: parseFloat(taxPercentage),
      tax_amount: tax,
      discount_amount: parseFloat(discountAmount),
      total_amount: total,
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

  const { subtotal, tax, discount, total } = calculateTotals();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Order</CardTitle>
            <CardDescription>
              This order will be sent directly to admin for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${locationStatus === 'captured' ? 'text-green-600' : locationStatus === 'pending' ? 'text-yellow-500' : 'text-red-500'}`} />
              {locationStatus === 'captured' && (
                <span className="text-green-700">Location captured ({locationLat?.toFixed(4)}, {locationLng?.toFixed(4)})</span>
              )}
              {locationStatus === 'pending' && (
                <span className="text-yellow-600">Capturing location...</span>
              )}
              {locationStatus === 'denied' && (
                <span className="text-red-600">Location access denied — please enable location permissions</span>
              )}
              {locationStatus === 'unavailable' && (
                <span className="text-red-600">Location unavailable</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <User className="mr-2 h-5 w-5" />Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Existing Customer (Optional)</Label>
              <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger><SelectValue placeholder="Choose a customer or enter manually..." /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name} - {c.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Customer name" />
              </div>
              <div>
                <Label>Contact Number *</Label>
                <Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} required placeholder="+91 98765 43210" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Full address..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GSTIN</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-base">
                <Package className="mr-2 h-5 w-5" />Order Items
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Product</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  <TableHead className="w-[90px]">Unit</TableHead>
                  <TableHead className="w-[130px]">Price/Unit (₹)</TableHead>
                  <TableHead className="w-[130px]">Total (₹)</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select value={item.product_id || ''} onValueChange={(v) => handleProductSelect(index, v)}>
                        <SelectTrigger><SelectValue placeholder={productsLoading ? 'Loading products...' : 'Select product...'} /></SelectTrigger>
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
                        <Input className="mt-2" value={item.product_name} onChange={(e) => handleItemChange(index, 'product_name', e.target.value)} placeholder="Or enter product name" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} placeholder="0" />
                    </TableCell>
                    <TableCell>
                      <Select value={item.unit} onValueChange={(v) => handleItemChange(index, 'unit', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">KG</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="bag">Bag</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={item.price_per_unit} onChange={(e) => handleItemChange(index, 'price_per_unit', e.target.value)} placeholder="0.00" />
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{item.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <IndianRupee className="mr-2 h-5 w-5" />Pricing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tax Percentage (%)</Label>
                <Input type="number" step="0.01" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} />
              </div>
              <div>
                <Label>Discount Amount (₹)</Label>
                <Input type="number" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
              </div>
            </div>

            <div className="bg-brand-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxPercentage}%):</span>
                <span className="font-medium">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span className="font-medium">- ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Amount:</span>
                <span className="text-brand-700">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes or special instructions..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading} size="lg" className="bg-brand-600 hover:bg-brand-700">
            <Save className="mr-2 h-5 w-5" />
            {loading ? 'Submitting...' : 'Submit for Admin Approval'}
          </Button>
        </div>
      </form>
    </div>
  );
}
