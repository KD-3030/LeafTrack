'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, IndianRupee, MapPin, Package, Plus, Store } from 'lucide-react';
import { toast } from 'sonner';

interface DailySale {
  _id: string;
  distributor_name: string | null;
  product_name: string | null;
  retailer_name: string | null;
  quantity_sold: number;
  unit: string;
  sale_amount: number;
  payment_type: string;
  sale_date: string;
  location_lat: number | null;
  location_lng: number | null;
}

interface Distributor {
  _id: string;
  name: string;
  city?: string;
  phone?: string;
}

interface InventoryItem {
  product_id: string;
  product_name: string;
  current_stock: number;
  distributor_id: string;
  distributor_name: string;
}

export default function SalesmanDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<DailySale[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const getToken = () => localStorage.getItem('leaftrack_token');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      if (!token) throw new Error('No authentication token found.');

      const [salesRes, distRes, invRes] = await Promise.all([
        fetch('/api/daily-sales', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/distributors', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/distributor-inventory', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [salesData, distData, invData] = await Promise.all([
        salesRes.json(),
        distRes.json(),
        invRes.json(),
      ]);

      if (salesData.success) setSales(salesData.daily_sales || []);
      if (distData.success) setDistributors(distData.distributors || []);
      if (invData.success) setInventory(invData.inventory || []);

      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.sale_date === todayStr);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.sale_amount, 0);
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.sale_amount, 0);
  const totalProducts = inventory.reduce((sum, i) => sum + i.current_stock, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && distributors.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back, {user?.name}</p>
        </div>
        <Button onClick={() => router.push('/salesman/orders/new')}>
          <Plus className="mr-2 h-4 w-4" />Log Sale
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Distributors</CardTitle>
            <Store className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{distributors.length}</div>
            <p className="text-xs text-muted-foreground">{totalProducts} total units in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Sales</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">{todaySales.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-brand-600">{sales.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GPS Tracked</CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">
              {sales.filter(s => s.location_lat && s.location_lng).length}
            </div>
            <p className="text-xs text-muted-foreground">of {sales.length} total sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Distributors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-600" />
                My Distributors
              </CardTitle>
              <CardDescription>Distributors assigned to you</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {distributors.length === 0 ? (
            <div className="text-center py-8">
              <Store className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No distributors assigned yet</p>
              <p className="text-muted-foreground text-xs mt-1">Contact your manager to get assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {distributors.map((dist) => {
                const distStock = inventory.filter(i => i.distributor_id === (dist._id));
                const stockCount = distStock.reduce((sum, i) => sum + i.current_stock, 0);
                const productCount = distStock.length;
                return (
                  <div
                    key={dist._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{dist.name}</span>
                        {dist.city && (
                          <Badge variant="outline" className="text-xs">{dist.city}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {productCount} product(s) &middot; {stockCount} total units
                      </p>
                    </div>
                    {dist.phone && (
                      <span className="text-xs text-muted-foreground">{dist.phone}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-brand-600" />
                Recent Sales
              </CardTitle>
              <CardDescription>Your latest logged sales</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/salesman/orders')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No sales logged yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/salesman/orders/new')}>
                Log your first sale
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.slice(0, 8).map((sale) => (
                <div
                  key={sale._id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push('/salesman/orders')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{sale.product_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{sale.payment_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sale.distributor_name} &middot; {sale.retailer_name || 'Walk-in'} &middot; {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-sm">
                      ₹{sale.sale_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-xs text-muted-foreground">{sale.quantity_sold} {sale.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
