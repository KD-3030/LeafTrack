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
import { Package, Search, TrendingUp, Boxes, IndianRupee } from 'lucide-react';

interface Assignment {
  _id: string;
  salesman_id: { _id: string; name: string; email: string } | string;
  productId: { _id: string; name: string; manufacturing_cost: number; hsn_code: string; gst_rate: number } | string;
  product_id: string;
  quantity: number;
  sellingPricePerUnit: number;
  selling_price_per_unit: number;
  created_at: string;
}

export default function ExecutiveStockPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      if (!token) throw new Error('No authentication token found.');

      const response = await fetch('/api/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch stock assignments');
      }

      setAssignments(data.assignments || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load assignments';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const stockSummary = useMemo(() => {
    let totalProducts = new Set<string>();
    let totalQuantity = 0;
    let totalValue = 0;

    for (const a of assignments) {
      const productId = typeof a.productId === 'object' ? a.productId._id : a.product_id;
      if (productId) totalProducts.add(productId);
      totalQuantity += a.quantity || 0;
      const price = a.sellingPricePerUnit || a.selling_price_per_unit || 0;
      totalValue += (a.quantity || 0) * price;
    }

    return {
      uniqueProducts: totalProducts.size,
      totalQuantity,
      totalValue,
    };
  }, [assignments]);

  const filteredAssignments = assignments.filter(a => {
    const productName = typeof a.productId === 'object' ? a.productId.name : '';
    return productName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Group by product for a summarized view
  const productGroups = useMemo(() => {
    const groups = new Map<string, {
      productName: string;
      hsnCode: string;
      totalQuantity: number;
      totalValue: number;
      assignments: Assignment[];
    }>();

    for (const a of filteredAssignments) {
      const product = typeof a.productId === 'object' ? a.productId : null;
      const key = product?._id || a.product_id || 'unknown';
      const existing = groups.get(key) || {
        productName: product?.name || 'Unknown Product',
        hsnCode: product?.hsn_code || '',
        totalQuantity: 0,
        totalValue: 0,
        assignments: [],
      };
      const price = a.sellingPricePerUnit || a.selling_price_per_unit || 0;
      existing.totalQuantity += a.quantity || 0;
      existing.totalValue += (a.quantity || 0) * price;
      existing.assignments.push(a);
      groups.set(key, existing);
    }

    return Array.from(groups.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredAssignments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading stock pool...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Stock Pool</h1>
        <p className="text-muted-foreground text-sm mt-1">Products assigned to you by admin</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Boxes className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stockSummary.uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">unique products assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stockSummary.totalQuantity.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">remaining units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₹{stockSummary.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">at selling price</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stock by Product */}
      {productGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium">
              {searchTerm ? 'No matching products' : 'No stock assigned yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Try a different search term' : 'Contact your admin to get stock assigned'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {productGroups.map((group) => (
            <Card key={group.productName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                      <Package className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{group.productName}</CardTitle>
                      {group.hsnCode && (
                        <CardDescription className="text-xs">HSN: {group.hsnCode}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{group.totalQuantity.toLocaleString('en-IN')} units</div>
                    <div className="text-sm text-muted-foreground">₹{group.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              </CardHeader>
              {group.assignments.length > 1 && (
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price/Unit</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Assigned On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.assignments.map((a, i) => {
                        const price = a.sellingPricePerUnit || a.selling_price_per_unit || 0;
                        return (
                          <TableRow key={a._id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">#{i + 1}</Badge>
                            </TableCell>
                            <TableCell>{a.quantity?.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="font-medium">₹{((a.quantity || 0) * price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
