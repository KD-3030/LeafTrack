'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Package, 
  Search, 
  Boxes, 
  IndianRupee, 
  RefreshCw, 
  UserCheck, 
  Building2, 
  ShieldAlert, 
  AlertTriangle 
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InventoryItem {
  _id: string;
  distributor_id: string;
  product_id: string;
  current_stock: number;
  distributor_name?: string;
  product_name?: string;
  last_restocked_at?: string;
  updated_at?: string;
  pe_id?: string;
  pe_name?: string;
  pe_email?: string;
  pe_phone?: string;
  product_hsn?: string;
}

export default function ExecutiveStockPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-stock');
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getAuthToken = () => {
    return localStorage.getItem('leaftrack_token');
  };

  const loadInventory = async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token found.');

      const response = await fetch('/api/distributor-inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inventory');
      }

      setInventory(data.inventory || data || []);
    } catch (err) {
      console.error('❌ Error loading distributor stock:', err);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    await loadInventory();
    setIsLoading(false);
  };

  // Group distributor stock to compute PE's personal stock pool dynamically
  const peStockPool = useMemo(() => {
    const map = new Map<string, {
      product_id: string;
      product_name: string;
      product_hsn: string;
      quantity: number;
    }>();

    for (const item of inventory) {
      const key = item.product_id;
      const stock = parseFloat(item.current_stock as any) || 0;
      const existing = map.get(key);

      if (existing) {
        existing.quantity += stock;
      } else {
        map.set(key, {
          product_id: item.product_id,
          product_name: item.product_name || 'Unknown Product',
          product_hsn: item.product_hsn || 'N/A',
          quantity: stock,
        });
      }
    }

    return Array.from(map.values());
  }, [inventory]);

  // Memoized stats for PE Stock Pool Tab
  const peStats = useMemo(() => {
    const totalRemaining = peStockPool.reduce((sum, item) => sum + item.quantity, 0);
    const productCount = peStockPool.length;
    return { totalRemaining, productCount };
  }, [peStockPool]);

  // Memoized stats for Distributor Stock Tab
  const distStats = useMemo(() => {
    const distributors = new Set<string>();
    let totalStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const item of inventory) {
      distributors.add(item.distributor_id);
      const stock = parseFloat(item.current_stock as any) || 0;
      totalStock += stock;
      if (stock === 0) {
        outOfStock++;
      } else if (stock < 20) {
        lowStock++;
      }
    }

    return { 
      distributorCount: distributors.size, 
      totalStock,
      lowStock,
      outOfStock
    };
  }, [inventory]);

  // Filters based on active tab and search term
  const filteredPeStockPool = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return peStockPool.filter(item => {
      const prodName = item.product_name || '';
      const prodHsn = item.product_hsn || '';
      return prodName.toLowerCase().includes(q) || prodHsn.toLowerCase().includes(q);
    });
  }, [peStockPool, searchTerm]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const distName = item.distributor_name || '';
      const prodName = item.product_name || '';
      const q = searchTerm.toLowerCase();
      return distName.toLowerCase().includes(q) || prodName.toLowerCase().includes(q);
    });
  }, [inventory, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        <p className="text-sm text-muted-foreground font-medium">Loading products &amp; inventory state...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-brand-600 animate-pulse" />
            Products &amp; Inventory
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Monitor your personal stock allocations and check inventory levels held by your assigned distributors.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={async () => {
            await loadAllData();
            toast.success('Inventory state successfully updated');
          }}
          className="h-10 hover:bg-gray-50 transition-all active:scale-95 border-gray-200"
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh Stock
        </Button>
      </div>

      {/* Layout Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchTerm(''); }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-gray-100 p-1 rounded-xl">
          <TabsTrigger 
            value="my-stock" 
            className="rounded-lg gap-2 text-sm py-2 data-[state=active]:bg-white data-[state=active]:text-brand-700 data-[state=active]:shadow-sm transition-all"
          >
            <UserCheck className="h-4 w-4" />
            <span>My Stock Pool</span>
          </TabsTrigger>
          <TabsTrigger 
            value="distributor-stock" 
            className="rounded-lg gap-2 text-sm py-2 data-[state=active]:bg-white data-[state=active]:text-brand-700 data-[state=active]:shadow-sm transition-all"
          >
            <Building2 className="h-4 w-4" />
            <span>Distributor Warehouses</span>
          </TabsTrigger>
        </TabsList>

        {/* ────── TAB 1: PE ASSIGNED STOCK POOL ────── */}
        <TabsContent value="my-stock" className="space-y-6 outline-none">
          
          {/* My Stock Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-white border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-brand-50 rounded-xl text-brand-600">
                  <Boxes className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Quantity Remaining</p>
                  <p className="text-2xl font-bold text-gray-800">{(peStats.totalRemaining || 0).toLocaleString('en-IN')} units</p>
                  <p className="text-[10px] text-gray-400">Available to log sales</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Products</p>
                  <p className="text-2xl font-bold text-gray-800">{peStats.productCount} products</p>
                  <p className="text-[10px] text-gray-400">Automated from distributor warehouses</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search assigned products..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 h-10 border-gray-200 focus-visible:ring-brand-500 bg-gray-50/50" 
            />
          </div>

          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-brand-600" />
                My Stock Allocations
              </CardTitle>
              <CardDescription>
                Below is the real-time stock pool holding in your territory. Calculated automatically based on the products dispatched to your assigned distributors.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPeStockPool.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-base font-semibold text-gray-800">{searchTerm ? 'No matching products' : 'No assigned stock pool'}</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    {searchTerm ? 'Try updating your search queries' : 'Stocks will render here automatically as orders are approved and dispatched to distributors in your territory.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/75">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">Product Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">HSN Code</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-right">Available Stock Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPeStockPool.map((item) => {
                        const qty = parseFloat(item.quantity as any) || 0;
                        return (
                          <TableRow key={item.product_id} className="hover:bg-gray-50/20 transition-colors">
                            <TableCell className="font-bold text-gray-900 py-3">{item.product_name || 'Unknown Product'}</TableCell>
                            <TableCell className="text-gray-500 font-mono text-xs py-3">{item.product_hsn || 'N/A'}</TableCell>
                            <TableCell className="text-right py-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                qty === 0 
                                  ? 'bg-red-50 text-red-700 border border-red-100' 
                                  : qty <= 15 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {qty.toLocaleString()} units
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────── TAB 2: DISTRIBUTOR STOCK LEVELS ────── */}
        <TabsContent value="distributor-stock" className="space-y-6 outline-none">
          
          {/* Distributor Stock Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-white border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">My Distributors</p>
                  <p className="text-lg font-bold text-gray-800">{distStats.distributorCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Warehouse Volume</p>
                  <p className="text-lg font-bold text-gray-800">{distStats.totalStock.toLocaleString('en-IN')} units</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Low Stock Warnings</p>
                  <p className="text-lg font-bold text-amber-700">{distStats.lowStock} warnings</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-xl text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Out of Stock</p>
                  <p className="text-lg font-bold text-red-700">{distStats.outOfStock} items empty</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by Distributor or Product..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 h-10 border-gray-200 focus-visible:ring-brand-500 bg-gray-50/50" 
            />
          </div>

          {filteredInventory.length === 0 ? (
            <Card className="bg-white border">
              <CardContent className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-base font-semibold text-gray-800">{searchTerm ? 'No matching stock records' : 'No distributor stock yet'}</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  {searchTerm ? 'Check your spelling or filter query' : 'Stocks will render here automatically as orders are approved and dispatched to distributors in your territory.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Group by distributor */}
              {Array.from(
                filteredInventory.reduce((groups, item) => {
                  const distName = item.distributor_name || 'Unmapped Distributor';
                  if (!groups.has(distName)) groups.set(distName, []);
                  groups.get(distName)!.push(item);
                  return groups;
                }, new Map<string, InventoryItem[]>()).entries()
              ).map(([distName, items]) => (
                <Card key={distName} className="bg-white border shadow-sm hover:shadow transition-shadow">
                  <CardHeader className="pb-3 border-b bg-gray-50/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50/60 border border-brand-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-gray-900">{distName}</CardTitle>
                          <CardDescription className="text-xs font-medium text-gray-400">
                            {items.length} product{items.length !== 1 ? 's' : ''} in inventory
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-gray-800">
                          {items.reduce((s, i) => s + (parseFloat(i.current_stock as any) || 0), 0).toLocaleString('en-IN')} units
                        </div>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Aggregate Stock</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader className="bg-gray-50/25">
                          <TableRow>
                            <TableHead className="font-semibold text-gray-600 text-xs py-2 pl-4">Product Name</TableHead>
                            <TableHead className="font-semibold text-gray-600 text-xs text-right py-2 pr-4">Warehouse Stock Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => {
                            const stockVal = parseFloat(item.current_stock as any) || 0;
                            return (
                              <TableRow key={item._id} className="hover:bg-gray-50/20 transition-colors">
                                <TableCell className="font-medium text-gray-800 pl-4 py-2">{item.product_name || 'Unknown Product'}</TableCell>
                                <TableCell className="text-right pr-4 py-2">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    stockVal === 0 
                                      ? 'bg-red-50 text-red-700 border border-red-100' 
                                      : stockVal < 20 
                                        ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  }`}>
                                    {stockVal.toLocaleString()} units
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
