'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Search,
  IndianRupee,
  Package,
  Calendar,
  MapPin,
  Store,
  CreditCard,
} from 'lucide-react';

interface DailySale {
  _id: string;
  se_id: string;
  se_name: string | null;
  distributor_id: string;
  distributor_name: string | null;
  retailer_id: string | null;
  retailer_name: string | null;
  product_id: string;
  product_name: string | null;
  quantity_sold: number;
  unit: string;
  sale_amount: number;
  payment_type: string;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  sale_date: string;
  created_at: string;
}

export default function DailySalesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sales, setSales] = useState<DailySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const getToken = () => localStorage.getItem('leaftrack_token');

  useEffect(() => {
    fetchSales();
  }, [dateFilter]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter) {
        params.append('from_date', dateFilter);
        params.append('to_date', dateFilter);
      }

      const response = await fetch(`/api/daily-sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const data = await response.json();
      if (data.success) {
        setSales(data.daily_sales || []);
      } else {
        toast.error(data.error || 'Failed to fetch sales');
      }
    } catch (error) {
      console.error('Error fetching daily sales:', error);
      toast.error('Failed to fetch daily sales');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentBadge = (type: string) => {
    switch (type) {
      case 'cash':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Cash</Badge>;
      case 'credit':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Credit</Badge>;
      case 'upi':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">UPI</Badge>;
      case 'bank_transfer':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Bank Transfer</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredSales = sales.filter(sale =>
    (sale.distributor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.retailer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.sale_date === todayStr);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.sale_amount, 0);
  const todayQty = todaySales.reduce((sum, s) => sum + s.quantity_sold, 0);
  const totalAmount = sales.reduce((sum, s) => sum + s.sale_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Sales</h1>
          <p className="text-gray-500 mt-1">Track and manage your field sales</p>
        </div>
        <Button onClick={() => router.push('/salesman/orders/new')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Log Sale
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today&apos;s Sales</CardDescription>
            <CardTitle className="text-2xl">{todaySales.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">{todayQty} units sold</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-700">Today&apos;s Revenue</CardDescription>
            <CardTitle className="text-2xl text-green-700">
              ₹{todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sales</CardDescription>
            <CardTitle className="text-2xl">{sales.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-700">Total Revenue</CardDescription>
            <CardTitle className="text-2xl text-blue-700">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by distributor, retailer, or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-[180px]"
              />
              {dateFilter && (
                <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
          <CardDescription>
            {dateFilter ? `Sales on ${new Date(dateFilter).toLocaleDateString('en-IN')}` : 'All your recorded sales'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No sales found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm || dateFilter ? 'Try adjusting your filters' : 'Start by logging your first sale'}
              </p>
              {!searchTerm && !dateFilter && (
                <Button className="mt-4" onClick={() => router.push('/salesman/orders/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Sale
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Distributor</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Retailer</TableHead>
                    <TableHead>GPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                          {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Store className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">{sale.distributor_name || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{sale.product_name || '—'}</TableCell>
                      <TableCell>
                        {sale.quantity_sold} {sale.unit}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium flex items-center">
                          <IndianRupee className="h-3 w-3" />
                          {sale.sale_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </TableCell>
                      <TableCell>{getPaymentBadge(sale.payment_type)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {sale.retailer_name || 'Walk-in'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sale.location_lat && sale.location_lng ? (
                          <MapPin className="h-4 w-4 text-green-600" />
                        ) : (
                          <MapPin className="h-4 w-4 text-gray-300" />
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
    </div>
  );
}
