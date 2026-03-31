'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  MapPin,
  Package,
  IndianRupee,
  Save,
  Store,
  UserPlus,
  Loader2,
} from 'lucide-react';

interface Distributor {
  _id: string;
  id: string;
  name: string;
  phone?: string;
  city?: string;
}

interface InventoryItem {
  _id: string;
  product_id: string;
  product_name: string;
  current_stock: number;
  distributor_id: string;
  distributor_name: string;
}

interface Retailer {
  _id: string;
  id: string;
  name: string;
  phone?: string;
  shop_name?: string;
}

export default function LogDailySalePage() {
  const router = useRouter();
  const { user } = useAuth();
  const getToken = () => localStorage.getItem('leaftrack_token');

  const [loading, setLoading] = useState(false);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingRetailers, setLoadingRetailers] = useState(false);

  // Sale fields
  const [selectedDistributorId, setSelectedDistributorId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [quantitySold, setQuantitySold] = useState('');
  const [unit, setUnit] = useState('kg');
  const [saleAmount, setSaleAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [notes, setNotes] = useState('');

  // GPS
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // New retailer dialog
  const [showNewRetailer, setShowNewRetailer] = useState(false);
  const [newRetailerName, setNewRetailerName] = useState('');
  const [newRetailerPhone, setNewRetailerPhone] = useState('');
  const [newRetailerShopName, setNewRetailerShopName] = useState('');
  const [creatingRetailer, setCreatingRetailer] = useState(false);

  useEffect(() => {
    fetchDistributors();
    captureGPS();
  }, []);

  const fetchDistributors = async () => {
    try {
      setLoadingDistributors(true);
      const response = await fetch('/api/distributors', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (data.success) {
        setDistributors(data.distributors || []);
      }
    } catch (error) {
      console.error('Error fetching distributors:', error);
      toast.error('Failed to load distributors');
    } finally {
      setLoadingDistributors(false);
    }
  };

  const fetchInventory = useCallback(async (distributorId: string) => {
    try {
      setLoadingInventory(true);
      const response = await fetch(`/api/distributor-inventory?distributor_id=${distributorId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (data.success) {
        setInventory(data.inventory || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  const fetchRetailers = useCallback(async (distributorId: string) => {
    try {
      setLoadingRetailers(true);
      const response = await fetch(`/api/retailers?distributor_id=${distributorId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (data.success) {
        setRetailers(data.retailers || []);
      }
    } catch (error) {
      console.error('Error fetching retailers:', error);
    } finally {
      setLoadingRetailers(false);
    }
  }, []);

  const handleDistributorChange = (distributorId: string) => {
    setSelectedDistributorId(distributorId);
    setSelectedProductId('');
    setSelectedRetailerId('');
    setInventory([]);
    setRetailers([]);
    if (distributorId) {
      fetchInventory(distributorId);
      fetchRetailers(distributorId);
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLat(position.coords.latitude);
        setLocationLng(position.coords.longitude);
        setGpsStatus('success');
      },
      () => {
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleCreateRetailer = async () => {
    if (!newRetailerName.trim()) {
      toast.error('Retailer name is required');
      return;
    }
    if (!selectedDistributorId) {
      toast.error('Select a distributor first');
      return;
    }
    setCreatingRetailer(true);
    try {
      const response = await fetch('/api/retailers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: newRetailerName.trim(),
          phone: newRetailerPhone.trim() || null,
          shop_name: newRetailerShopName.trim() || null,
          distributor_id: selectedDistributorId,
          location_lat: locationLat,
          location_lng: locationLng,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Retailer created');
        const newRetailer = data.retailer;
        setRetailers(prev => [newRetailer, ...prev]);
        setSelectedRetailerId(newRetailer._id || newRetailer.id);
        setShowNewRetailer(false);
        setNewRetailerName('');
        setNewRetailerPhone('');
        setNewRetailerShopName('');
      } else {
        toast.error(data.error || 'Failed to create retailer');
      }
    } catch (error) {
      console.error('Error creating retailer:', error);
      toast.error('Failed to create retailer');
    } finally {
      setCreatingRetailer(false);
    }
  };

  const selectedProduct = inventory.find(i => i.product_id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDistributorId) {
      toast.error('Please select a distributor');
      return;
    }
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }
    const qty = parseFloat(quantitySold);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    const amount = parseFloat(saleAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid sale amount');
      return;
    }

    if (selectedProduct && qty > selectedProduct.current_stock) {
      const proceed = confirm(
        `Warning: Selling ${qty} units but only ${selectedProduct.current_stock} in stock. Continue?`
      );
      if (!proceed) return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/daily-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          distributor_id: selectedDistributorId,
          product_id: selectedProductId,
          quantity_sold: qty,
          unit,
          sale_amount: amount,
          payment_type: paymentType,
          retailer_id: selectedRetailerId || null,
          location_lat: locationLat,
          location_lng: locationLng,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sale logged successfully!');
        router.push('/salesman/orders');
      } else {
        toast.error(data.error || 'Failed to log sale');
      }
    } catch (error) {
      console.error('Error logging sale:', error);
      toast.error('Failed to log sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Log Daily Sale</CardTitle>
            <CardDescription>
              Record a sale from a distributor&apos;s inventory to a retailer
            </CardDescription>
          </CardHeader>
        </Card>

        {/* GPS Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${gpsStatus === 'success' ? 'text-green-600' : gpsStatus === 'error' ? 'text-red-500' : 'text-gray-400'}`} />
              {gpsStatus === 'loading' && <span className="text-muted-foreground">Capturing GPS location...</span>}
              {gpsStatus === 'success' && (
                <span className="text-green-700">
                  Location captured ({locationLat?.toFixed(5)}, {locationLng?.toFixed(5)})
                </span>
              )}
              {gpsStatus === 'error' && (
                <span className="text-red-600">
                  GPS unavailable.{' '}
                  <button type="button" className="underline" onClick={captureGPS}>Retry</button>
                </span>
              )}
              {gpsStatus === 'idle' && <span className="text-muted-foreground">GPS not requested</span>}
            </div>
          </CardContent>
        </Card>

        {/* Distributor Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Store className="mr-2 h-5 w-5" />
              Distributor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDistributors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading distributors...
              </div>
            ) : distributors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No distributors assigned to you. Contact your manager.</p>
            ) : (
              <Select value={selectedDistributorId} onValueChange={handleDistributorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a distributor..." />
                </SelectTrigger>
                <SelectContent>
                  {distributors.map((d) => (
                    <SelectItem key={d._id || d.id} value={d._id || d.id}>
                      {d.name} {d.city ? `(${d.city})` : ''} {d.phone ? `- ${d.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Product Selection */}
        {selectedDistributorId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Package className="mr-2 h-5 w-5" />
                Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingInventory ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory...
                </div>
              ) : inventory.length === 0 ? (
                <p className="text-sm text-muted-foreground">This distributor has no inventory.</p>
              ) : (
                <>
                  <div>
                    <Label>Select Product</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.product_id} value={item.product_id}>
                            {item.product_name} — Stock: {item.current_stock} {item.current_stock <= 0 ? '(Out of stock)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProduct && (
                    <div className="text-sm bg-muted/50 p-3 rounded-md">
                      <span className="font-medium">{selectedProduct.product_name}</span>
                      <span className="ml-2 text-muted-foreground">
                        Available: <span className={selectedProduct.current_stock <= 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>
                          {selectedProduct.current_stock}
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity Sold *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        value={quantitySold}
                        onChange={(e) => setQuantitySold(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger id="unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">KG</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="bag">Bag</SelectItem>
                          <SelectItem value="pcs">Pcs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Retailer Selection */}
        {selectedDistributorId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-base">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Retailer (Optional)
                </CardTitle>
                <Dialog open={showNewRetailer} onOpenChange={setShowNewRetailer}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      New Retailer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Retailer</DialogTitle>
                      <DialogDescription>
                        Create a new retailer for the selected distributor.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="retailer_name">Name *</Label>
                        <Input
                          id="retailer_name"
                          value={newRetailerName}
                          onChange={(e) => setNewRetailerName(e.target.value)}
                          placeholder="Retailer name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="retailer_phone">Phone</Label>
                        <Input
                          id="retailer_phone"
                          value={newRetailerPhone}
                          onChange={(e) => setNewRetailerPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div>
                        <Label htmlFor="retailer_shop">Shop Name</Label>
                        <Input
                          id="retailer_shop"
                          value={newRetailerShopName}
                          onChange={(e) => setNewRetailerShopName(e.target.value)}
                          placeholder="Shop name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowNewRetailer(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={handleCreateRetailer} disabled={creatingRetailer}>
                        {creatingRetailer ? 'Creating...' : 'Create Retailer'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRetailers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading retailers...
                </div>
              ) : retailers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No retailers yet. Create one using the button above, or skip to log a walk-in sale.
                </p>
              ) : (
                <Select value={selectedRetailerId} onValueChange={setSelectedRetailerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a retailer (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers.map((r) => (
                      <SelectItem key={r._id || r.id} value={r._id || r.id}>
                        {r.name} {r.shop_name ? `(${r.shop_name})` : ''} {r.phone ? `- ${r.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sale Amount & Payment */}
        {selectedDistributorId && selectedProductId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <IndianRupee className="mr-2 h-5 w-5" />
                Sale Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sale_amount">Sale Amount (₹) *</Label>
                <Input
                  id="sale_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="payment_type">Payment Type</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger id="payment_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedDistributorId || !selectedProductId}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Logging Sale...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Log Sale
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
