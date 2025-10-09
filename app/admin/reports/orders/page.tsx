'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Calendar,
  Download,
  BarChart3,
} from 'lucide-react';

interface Order {
  _id: string;
  order_number: string;
  order_date: string;
  salesman_name: string;
  customer_name: string;
  total_amount: number;
  status: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit: string;
    total_price: number;
  }>;
}

interface OrderStats {
  total_orders: number;
  total_value: number;
  pending_count: number;
  pending_value: number;
  approved_count: number;
  approved_value: number;
  rejected_count: number;
  average_order_value: number;
  approval_rate: number;
  rejection_rate: number;
}

interface SalesmanStats {
  salesman_name: string;
  total_orders: number;
  total_value: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;
}

interface ProductStats {
  product_name: string;
  total_quantity: number;
  unit: string;
  total_orders: number;
  total_value: number;
}

export default function OrderReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [salesmanStats, setSalesmanStats] = useState<SalesmanStats[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, statusFilter]);

  const fetchOrderData = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const params = new URLSearchParams();
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (dateFrom) {
        params.append('from_date', dateFrom);
      }
      if (dateTo) {
        params.append('to_date', dateTo);
      }

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
        calculateStatistics(data.orders);
      } else {
        toast.error(data.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (ordersData: Order[]) => {
    // Overall stats
    const totalOrders = ordersData.length;
    const totalValue = ordersData.reduce((sum, order) => sum + order.total_amount, 0);
    const pendingOrders = ordersData.filter(o => o.status === 'pending');
    const approvedOrders = ordersData.filter(o => o.status === 'approved');
    const rejectedOrders = ordersData.filter(o => o.status === 'rejected');

    const overallStats: OrderStats = {
      total_orders: totalOrders,
      total_value: totalValue,
      pending_count: pendingOrders.length,
      pending_value: pendingOrders.reduce((sum, o) => sum + o.total_amount, 0),
      approved_count: approvedOrders.length,
      approved_value: approvedOrders.reduce((sum, o) => sum + o.total_amount, 0),
      rejected_count: rejectedOrders.length,
      average_order_value: totalOrders > 0 ? totalValue / totalOrders : 0,
      approval_rate: totalOrders > 0 ? (approvedOrders.length / totalOrders) * 100 : 0,
      rejection_rate: totalOrders > 0 ? (rejectedOrders.length / totalOrders) * 100 : 0,
    };

    setStats(overallStats);

    // Salesman stats
    const salesmanMap = new Map<string, SalesmanStats>();
    ordersData.forEach(order => {
      const existing = salesmanMap.get(order.salesman_name) || {
        salesman_name: order.salesman_name,
        total_orders: 0,
        total_value: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        approval_rate: 0,
      };

      existing.total_orders++;
      existing.total_value += order.total_amount;
      if (order.status === 'pending') existing.pending_count++;
      if (order.status === 'approved') existing.approved_count++;
      if (order.status === 'rejected') existing.rejected_count++;

      salesmanMap.set(order.salesman_name, existing);
    });

    const salesmanArray = Array.from(salesmanMap.values()).map(s => ({
      ...s,
      approval_rate: s.total_orders > 0 ? (s.approved_count / s.total_orders) * 100 : 0,
    }));
    salesmanArray.sort((a, b) => b.total_value - a.total_value);
    setSalesmanStats(salesmanArray);

    // Product stats
    const productMap = new Map<string, ProductStats>();
    ordersData.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.product_name}-${item.unit}`;
        const existing = productMap.get(key) || {
          product_name: item.product_name,
          total_quantity: 0,
          unit: item.unit,
          total_orders: 0,
          total_value: 0,
        };

        existing.total_quantity += item.quantity;
        existing.total_orders++;
        existing.total_value += item.total_price;

        productMap.set(key, existing);
      });
    });

    const productArray = Array.from(productMap.values());
    productArray.sort((a, b) => b.total_value - a.total_value);
    setProductStats(productArray);
  };

  const handleExport = () => {
    // Prepare CSV data
    let csv = 'Order Statistics Report\n\n';
    
    // Overall stats
    csv += 'Overall Statistics\n';
    csv += 'Metric,Value\n';
    csv += `Total Orders,${stats?.total_orders || 0}\n`;
    csv += `Total Value,₹${(stats?.total_value || 0).toLocaleString('en-IN')}\n`;
    csv += `Average Order Value,₹${(stats?.average_order_value || 0).toLocaleString('en-IN')}\n`;
    csv += `Pending Orders,${stats?.pending_count || 0}\n`;
    csv += `Approved Orders,${stats?.approved_count || 0}\n`;
    csv += `Rejected Orders,${stats?.rejected_count || 0}\n`;
    csv += `Approval Rate,${(stats?.approval_rate || 0).toFixed(2)}%\n`;
    csv += `Rejection Rate,${(stats?.rejection_rate || 0).toFixed(2)}%\n\n`;

    // Salesman stats
    csv += 'Salesman Performance\n';
    csv += 'Salesman,Total Orders,Total Value (₹),Pending,Approved,Rejected,Approval Rate\n';
    salesmanStats.forEach(s => {
      csv += `${s.salesman_name},${s.total_orders},${s.total_value.toFixed(2)},${s.pending_count},${s.approved_count},${s.rejected_count},${s.approval_rate.toFixed(2)}%\n`;
    });
    csv += '\n';

    // Product stats
    csv += 'Product Statistics\n';
    csv += 'Product,Total Quantity,Unit,Orders,Total Value (₹)\n';
    productStats.forEach(p => {
      csv += `${p.product_name},${p.total_quantity},${p.unit},${p.total_orders},${p.total_value.toFixed(2)}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-statistics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Statistics</h1>
          <p className="text-gray-500 mt-1">Comprehensive order analytics and insights</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter orders by date range and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date_from">From Date</Label>
              <Input
                id="date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date_to">To Date</Label>
              <Input
                id="date_to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Total Orders
                </CardDescription>
                <CardTitle className="text-3xl">{stats.total_orders}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  <IndianRupee className="inline h-4 w-4" />
                  {stats.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Average Order Value
                </CardDescription>
                <CardTitle className="text-3xl">
                  ₹{stats.average_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Per order</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center text-green-700">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Approval Rate
                </CardDescription>
                <CardTitle className="text-3xl text-green-700">
                  {stats.approval_rate.toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-600">
                  {stats.approved_count} approved orders
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center text-red-700">
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Rejection Rate
                </CardDescription>
                <CardTitle className="text-3xl text-red-700">
                  {stats.rejection_rate.toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600">
                  {stats.rejected_count} rejected orders
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-yellow-200">
              <CardHeader>
                <CardDescription className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                  Pending Orders
                </CardDescription>
                <CardTitle className="text-2xl">{stats.pending_count}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  <IndianRupee className="inline h-4 w-4" />
                  {stats.pending_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-300">
                  {stats.total_orders > 0 ? ((stats.pending_count / stats.total_orders) * 100).toFixed(1) : 0}% of total
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader>
                <CardDescription className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Approved Orders
                </CardDescription>
                <CardTitle className="text-2xl">{stats.approved_count}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  <IndianRupee className="inline h-4 w-4" />
                  {stats.approved_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-300">
                  {stats.total_orders > 0 ? ((stats.approved_count / stats.total_orders) * 100).toFixed(1) : 0}% of total
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardDescription className="flex items-center">
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  Rejected Orders
                </CardDescription>
                <CardTitle className="text-2xl">{stats.rejected_count}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Lost potential revenue</p>
                <Badge variant="outline" className="mt-2 bg-red-50 text-red-700 border-red-300">
                  {stats.total_orders > 0 ? ((stats.rejected_count / stats.total_orders) * 100).toFixed(1) : 0}% of total
                </Badge>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Salesman Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Salesman Performance
          </CardTitle>
          <CardDescription>Order statistics by salesman</CardDescription>
        </CardHeader>
        <CardContent>
          {salesmanStats.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No salesman data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salesman</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead className="text-right">Approval Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesmanStats.map((salesman) => (
                  <TableRow key={salesman.salesman_name}>
                    <TableCell className="font-medium">{salesman.salesman_name}</TableCell>
                    <TableCell className="text-right">{salesman.total_orders}</TableCell>
                    <TableCell className="text-right">
                      ₹{salesman.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        {salesman.pending_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        {salesman.approved_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                        {salesman.rejected_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <span className={`font-medium ${
                          salesman.approval_rate >= 80 ? 'text-green-600' :
                          salesman.approval_rate >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {salesman.approval_rate.toFixed(1)}%
                        </span>
                        {salesman.approval_rate >= 80 && <TrendingUp className="ml-1 h-4 w-4 text-green-600" />}
                        {salesman.approval_rate < 50 && <TrendingDown className="ml-1 h-4 w-4 text-red-600" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Product Statistics
          </CardTitle>
          <CardDescription>Most ordered products</CardDescription>
        </CardHeader>
        <CardContent>
          {productStats.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No product data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Total Quantity</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Times Ordered</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productStats.slice(0, 20).map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="text-right">{product.total_quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{product.unit}</TableCell>
                    <TableCell className="text-right">{product.total_orders}</TableCell>
                    <TableCell className="text-right">
                      ₹{product.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {productStats.length > 20 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Showing top 20 products. Export report to see all.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Recent Orders
          </CardTitle>
          <CardDescription>Latest order activity</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No orders available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Salesman</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 10).map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{order.salesman_name}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell className="text-right">
                      ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {order.status === 'pending' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          Pending
                        </Badge>
                      )}
                      {order.status === 'approved' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          Approved
                        </Badge>
                      )}
                      {order.status === 'rejected' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {orders.length > 10 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Showing 10 most recent orders
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
