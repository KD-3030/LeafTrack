'use client';

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  RefreshCw,
  MapPin,
  IndianRupee,
  Calendar,
  Package,
  User,
  Store,
  Map as MapIcon,
  List,
  Eye,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MapMarker } from '@/components/SalesMap';

const SalesMap = lazy(() => import('@/components/SalesMap'));

interface DailySale {
  _id: string;
  se_id: string;
  distributor_id: string;
  retailer_id?: string;
  product_id: string;
  quantity_sold: number;
  unit: string;
  sale_amount: number;
  payment_type: string;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
  sale_date: string;
  created_at: string;
  se_name?: string;
  distributor_name?: string;
  retailer_name?: string;
  product_name?: string;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('leaftrack_token') || localStorage.getItem('token');
}

export default function PEFieldSalesPage() {
  const [sales, setSales] = useState<DailySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [seFilter, setSeFilter] = useState('all');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedSale, setSelectedSale] = useState<DailySale | null>(null);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);

  // Derived lists
  const seList = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach(s => {
      if (s.se_id && s.se_name) map.set(s.se_id, s.se_name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [sales]);

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const params = new URLSearchParams();
      if (dateFilter) {
        params.set('from_date', dateFilter);
        params.set('to_date', dateFilter);
      }
      if (seFilter !== 'all') params.set('se_id', seFilter);

      const res = await fetch(`/api/daily-sales?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSales(data.daily_sales || []);
      } else {
        toast.error(data.error || 'Failed to load field sales');
      }
    } catch {
      toast.error('Failed to load field sales');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, seFilter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const filteredSales = useMemo(() => {
    if (!search) return sales;
    const q = search.toLowerCase();
    return sales.filter(
      s =>
        s.se_name?.toLowerCase().includes(q) ||
        s.distributor_name?.toLowerCase().includes(q) ||
        s.retailer_name?.toLowerCase().includes(q) ||
        s.product_name?.toLowerCase().includes(q)
    );
  }, [sales, search]);

  const salesWithLocation = useMemo(
    () => filteredSales.filter(s => s.location_lat && s.location_lng),
    [filteredSales]
  );

  const formatIST = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      salesWithLocation.map(s => ({
        lat: s.location_lat!,
        lng: s.location_lng!,
        color: 'green' as const,
        popup: `
          <div style="min-width: 180px">
            <strong>${s.se_name || 'SE'}</strong><br/>
            <small>${s.product_name || 'Product'} — ${s.quantity_sold} ${s.unit}</small><br/>
            <small>₹${s.sale_amount.toLocaleString()}</small><br/>
            ${s.retailer_name ? `<small>Retailer: ${s.retailer_name}</small><br/>` : ''}
            ${s.distributor_name ? `<small>Distributor: ${s.distributor_name}</small><br/>` : ''}
            <small>Logged: ${formatIST(s.created_at)} IST</small>
          </div>
        `,
      })),
    [salesWithLocation]
  );

  const totalSaleAmount = filteredSales.reduce((sum, s) => sum + s.sale_amount, 0);
  const totalQty = filteredSales.reduce((sum, s) => sum + s.quantity_sold, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Sales Activity</h1>
          <p className="text-gray-600">Monitor daily sales and locations of your Secondary Executives</p>
        </div>
        <Button onClick={loadSales} variant="outline" size="sm" disabled={loading} className="border-brand-300 text-brand-700 hover:bg-brand-50">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-brand-100 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{filteredSales.length}</div>
                <div className="text-xs text-gray-500">Total Sales Logs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-brand-100 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">₹{totalSaleAmount.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Total Sales Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-brand-100 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalQty}</div>
                <div className="text-xs text-gray-500">Total Qty Sold</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-brand-100 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{salesWithLocation.length}</div>
                <div className="text-xs text-gray-500">With GPS Data</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-brand-100 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by SE, distributor, product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs focus-visible:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40 focus-visible:ring-brand-500"
              />
            </div>
            <Select value={seFilter} onValueChange={setSeFilter}>
              <SelectTrigger className="w-[180px] focus:ring-brand-500">
                <SelectValue placeholder="All SEs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SEs</SelectItem>
                {seList.map(se => (
                  <SelectItem key={se.id} value={se.id}>{se.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                className={`rounded-none px-3 ${view === 'list' ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('map')}
                className={`rounded-none px-3 ${view === 'map' ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'text-gray-600'}`}
              >
                <MapIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map View */}
      {view === 'map' && (
        <Card className="border-brand-100 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-brand-50/50 py-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-brand-900">
              <MapPin className="h-4 w-4 text-brand-600" />
              SE Locations Map — {dateFilter}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {salesWithLocation.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <MapPin className="h-12 w-12 mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">No GPS data available</p>
                <p className="text-sm">Sales logged without GPS locations won&apos;t appear on the map</p>
              </div>
            ) : (
              <Suspense fallback={<div className="h-[400px] flex items-center justify-center text-gray-400">Loading map...</div>}>
                <SalesMap markers={mapMarkers} />
              </Suspense>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      {view === 'list' && (
        <Card className="border-brand-100 shadow-sm">
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">No field sales records found</p>
                <p className="text-sm">Try adjusting the date, query, or SE filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Secondary Executive</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="hidden sm:table-cell">Distributor</TableHead>
                      <TableHead className="hidden md:table-cell">Retailer</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Payment</TableHead>
                      <TableHead className="hidden lg:table-cell">GPS</TableHead>
                      <TableHead className="hidden md:table-cell">Logged At (IST)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale._id} className="hover:bg-brand-50/20">
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">
                              {sale.se_name?.substring(0, 2).toUpperCase() || 'SE'}
                            </div>
                            <span className="font-medium text-gray-950 text-sm">{sale.se_name || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-700">{sale.product_name || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-gray-600">{sale.distributor_name || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {sale.retailer_name ? (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Store className="h-3.5 w-3.5 text-gray-400" />
                              {sale.retailer_name}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-gray-900">
                          {sale.quantity_sold} {sale.unit}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-brand-700">
                          ₹{sale.sale_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={sale.payment_type === 'cash' ? 'default' : 'secondary'} className="text-[11px] px-2 py-0.5 rounded-full capitalize">
                            {sale.payment_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {sale.location_lat && sale.location_lng ? (
                            <Badge variant="outline" className="text-[11px] text-green-700 border-green-200 bg-green-50 px-2 py-0.5 rounded-full">
                              <MapPin className="h-3 w-3 mr-0.5" />
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">No</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {formatIST(sale.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sale.location_lat && sale.location_lng && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedSale(sale); setIsMapDialogOpen(true); }}
                              title="View SE Location"
                              className="h-8 w-8 hover:bg-brand-50 hover:text-brand-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SE Location Map Dialog */}
      <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-900">
              <MapPin className="h-5 w-5 text-brand-600" />SE Location While Logging Sale
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Logged by {selectedSale?.se_name} for {selectedSale?.product_name} at {selectedSale ? formatIST(selectedSale.created_at) : ''} IST
            </DialogDescription>
          </DialogHeader>
          {selectedSale?.location_lat && selectedSale?.location_lng && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div><span className="text-gray-500 font-medium">SE Name:</span> <span className="font-semibold text-gray-900">{selectedSale.se_name}</span></div>
                <div><span className="text-gray-500 font-medium">Distributor:</span> <span className="font-semibold text-gray-900">{selectedSale.distributor_name}</span></div>
                <div><span className="text-gray-500 font-medium">Product:</span> <span className="font-semibold text-gray-900">{selectedSale.product_name}</span></div>
                <div><span className="text-gray-500 font-medium">Quantity:</span> <span className="font-semibold text-gray-900">{selectedSale.quantity_sold} {selectedSale.unit}</span></div>
                <div><span className="text-gray-500 font-medium">Sale Value:</span> <span className="font-bold text-brand-700">₹{selectedSale.sale_amount.toLocaleString()}</span></div>
                {selectedSale.retailer_name && <div><span className="text-gray-500 font-medium">Retailer:</span> <span className="font-semibold text-gray-900">{selectedSale.retailer_name}</span></div>}
              </div>
              <Suspense fallback={<div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">Loading map...</div>}>
                <SalesMap
                  markers={[{
                    lat: selectedSale.location_lat,
                    lng: selectedSale.location_lng,
                    popup: `<strong>${selectedSale.se_name}</strong><br/>₹${selectedSale.sale_amount.toLocaleString()}<br/>${formatIST(selectedSale.created_at)} IST`,
                    color: 'green',
                  }]}
                  zoom={14}
                />
              </Suspense>
            </div>
          )}
          <DialogFooter className="pt-2 border-t border-gray-100">
            <Button onClick={() => setIsMapDialogOpen(false)} className="bg-brand-600 hover:bg-brand-700 text-white">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
