'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Package, Search, Boxes, IndianRupee } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InventoryItem {
  _id: string;
  distributor_id: string;
  product_id: string;
  current_stock: number;
  distributor?: { name: string; phone: string };
  product?: { name: string; hsn_code?: string };
}

export default function ExecutiveStockPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      if (!token) throw new Error('No authentication token found.');

      const response = await fetch('/api/distributor-inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inventory');
      }

      // Map API response to expected structure
      const items = (data.inventory || data || []).map((item: Record<string, unknown>) => ({
        ...item,
        distributor: { name: (item.distributor_name as string) || 'Unknown', phone: '' },
        product: { name: (item.product_name as string) || 'Unknown', hsn_code: '' },
      }));
      setInventory(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const stockSummary = useMemo(() => {
    const distributors = new Set<string>();
    const products = new Set<string>();
    let totalQuantity = 0;

    for (const item of inventory) {
      distributors.add(item.distributor_id);
      products.add(item.product_id);
      totalQuantity += item.current_stock || 0;
    }

    return { distributorCount: distributors.size, productCount: products.size, totalQuantity };
  }, [inventory]);

  const filteredInventory = inventory.filter(item => {
    const distName = item.distributor?.name || '';
    const prodName = item.product?.name || '';
    const q = searchTerm.toLowerCase();
    return distName.toLowerCase().includes(q) || prodName.toLowerCase().includes(q);
  });

  // Group by distributor
  const byDistributor = useMemo(() => {
    const map = new Map<string, { name: string; items: InventoryItem[] }>();
    for (const item of filteredInventory) {
      const key = item.distributor_id;
      const existing = map.get(key) || { name: item.distributor?.name || 'Unknown', items: [] };
      existing.items.push(item);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [filteredInventory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading distributor stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Distributor Stock</h1>
        <p className="text-muted-foreground text-sm mt-1">Inventory held by distributors in your territory</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distributors</CardTitle>
            <Boxes className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stockSummary.distributorCount}</div>
            <p className="text-xs text-muted-foreground">with stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stockSummary.productCount}</div>
            <p className="text-xs text-muted-foreground">unique products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stockSummary.totalQuantity.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">units across all distributors</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by distributor or product..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {byDistributor.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium">{searchTerm ? 'No matching results' : 'No distributor stock yet'}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Try a different search' : 'Stock will appear here once orders are dispatched to distributors'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {byDistributor.map(([distId, { name, items }]) => (
            <Card key={distId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                      <Boxes className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{name}</CardTitle>
                      <CardDescription className="text-xs">{items.length} product{items.length !== 1 ? 's' : ''}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{items.reduce((s, i) => s + (i.current_stock || 0), 0).toLocaleString('en-IN')} units</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="w-full">
                <div className="min-w-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.product?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.current_stock > 0 ? 'default' : 'destructive'} className="font-mono">
                            {item.current_stock}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
