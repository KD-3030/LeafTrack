'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Download, RefreshCw, FileText, Calendar, Package, Users, ShoppingCart, IndianRupee, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessReport {
  totalRevenue: number;
  totalPurchases: number;
  grossProfit: number;
  totalOutstanding: number;
  totalInvoices: number;
  totalPurchaseOrders: number;
  totalCustomers: number;
  totalProducts: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  topSalesmen: Array<{
    name: string;
    revenue: number;
    invoiceCount: number;
  }>;
}

interface ProfitLossReport {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  salesTax: number;
  purchaseTax: number;
  netTax: number;
  netProfit: number;
  profitMargin: number;
  monthly: Array<{
    month: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

interface GSTSummaryReport {
  type: 'summary';
  data: Array<{
    gst_rate: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
    count: number;
  }>;
  totalInvoices: number;
  totalItems: number;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function ReportsPage() {
  const [businessReport, setBusinessReport] = useState<BusinessReport | null>(null);
  const [profitLossReport, setProfitLossReport] = useState<ProfitLossReport | null>(null);
  const [gstReport, setGSTReport] = useState<GSTSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadAllReports = async () => {
    setIsLoading(true);
    await Promise.all([
      loadBusinessReport(),
      loadProfitLossReport(),
      loadGSTReport(),
    ]);
    setIsLoading(false);
  };

  const loadBusinessReport = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(
        `/api/reports/business?type=overview&from_date=${dateRange.from}&to_date=${dateRange.to}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setBusinessReport(data.report);
      } else {
        toast.error('Failed to load business report');
      }
    } catch (error) {
      console.error('Error loading business report:', error);
      toast.error('Failed to load business report');
    }
  };

  const loadProfitLossReport = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(
        `/api/reports/business?type=profit_loss&from_date=${dateRange.from}&to_date=${dateRange.to}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setProfitLossReport(data.report);
      } else {
        toast.error('Failed to load profit & loss report');
      }
    } catch (error) {
      console.error('Error loading profit & loss report:', error);
      toast.error('Failed to load profit & loss report');
    }
  };

  const loadGSTReport = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(
        `/api/reports/gst?type=summary&from_date=${dateRange.from}&to_date=${dateRange.to}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setGSTReport(data.report);
      } else {
        toast.error(data.details || 'Failed to load GST report');
      }
    } catch (error) {
      console.error('Error loading GST report:', error);
      toast.error('Failed to load GST report');
    }
  };

  const exportGSTR1 = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(
        `/api/reports/gst?type=gstr1&from_date=${dateRange.from}&to_date=${dateRange.to}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success && data.report?.data) {
        const invoices = data.report.data;
        if (invoices.length === 0) {
          toast.error('No invoices found for the selected date range');
          return;
        }
        const csvContent = convertGSTR1ToCSV(invoices);
        if (csvContent) {
          downloadCSV(csvContent, `GSTR1_${dateRange.from}_to_${dateRange.to}.csv`);
          toast.success(`GSTR-1 report exported (${invoices.length} invoices)`);
        } else {
          toast.error('Failed to generate CSV content');
        }
      } else {
        toast.error(data.details || 'Failed to export GSTR-1 report');
      }
    } catch (error) {
      console.error('Error exporting GSTR-1:', error);
      toast.error('Failed to export GSTR-1 report');
    }
  };

  const convertGSTR1ToCSV = (invoices: Array<Record<string, unknown>>) => {
    if (!invoices || invoices.length === 0) return '';

    const rows = invoices.map(inv => ({
      invoice_number: String(inv.invoice_number || ''),
      invoice_date: inv.invoice_date ? new Date(inv.invoice_date as string).toLocaleDateString('en-IN') : '',
      customer_name: String(inv.customer_name || ''),
      customer_gstin: String(inv.customer_gstin || 'Unregistered'),
      place_of_supply: String(inv.place_of_supply || ''),
      supply_type: String(inv.supply_type || ''),
      taxable_amount: Number(inv.taxable_amount || 0).toFixed(2),
      cgst: Number(inv.cgst || 0).toFixed(2),
      sgst: Number(inv.sgst || 0).toFixed(2),
      igst: Number(inv.igst || 0).toFixed(2),
      total_tax: Number(inv.total_tax || 0).toFixed(2),
      invoice_value: Number(inv.invoice_value || 0).toFixed(2),
    }));

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      ),
    ];
    return csvRows.join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(m) - 1]} ${year.slice(2)}`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive business insights and GST compliance</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportGSTR1}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export GSTR-1
            </Button>
            <Button onClick={loadAllReports} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div className="flex items-center gap-2">
                <Label htmlFor="from-date" className="text-sm text-gray-600">From</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-40 h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="to-date" className="text-sm text-gray-600">To</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-40 h-8"
                />
              </div>
              <div className="flex gap-1 ml-auto">
                {[
                  { label: '7D', days: 7 },
                  { label: '30D', days: 30 },
                  { label: '90D', days: 90 },
                  { label: '1Y', days: 365 },
                ].map(preset => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setDateRange({
                      from: new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      to: new Date().toISOString().split('T')[0],
                    })}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading reports...</p>
          </div>
        )}

        {!isLoading && (
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="grid w-full grid-cols-4 h-10">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="profit-loss" className="text-xs sm:text-sm">Profit & Loss</TabsTrigger>
              <TabsTrigger value="gst" className="text-xs sm:text-sm">GST Reports</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
            </TabsList>

            {/* ==================== BUSINESS OVERVIEW ==================== */}
            <TabsContent value="overview" className="space-y-5">
              {businessReport ? (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <IndianRupee className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold mt-1">₹{businessReport.totalRevenue.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-500 mt-1">{businessReport.totalInvoices} invoices</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Purchases</p>
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <ShoppingCart className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold mt-1">₹{businessReport.totalPurchases.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-500 mt-1">{businessReport.totalPurchaseOrders} orders</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Profit</p>
                          <div className="p-1.5 bg-emerald-100 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold mt-1">₹{businessReport.grossProfit.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {businessReport.totalRevenue > 0
                            ? `${((businessReport.grossProfit / businessReport.totalRevenue) * 100).toFixed(1)}% margin`
                            : '0% margin'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Outstanding</p>
                          <div className="p-1.5 bg-orange-100 rounded-lg">
                            <FileText className="h-4 w-4 text-orange-600" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold mt-1">₹{businessReport.totalOutstanding.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-gray-500 mt-1">Pending collection</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{businessReport.totalCustomers}</p>
                        <p className="text-xs text-gray-500">Customers</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
                      <div className="p-2 bg-cyan-100 rounded-lg">
                        <Package className="h-4 w-4 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{businessReport.totalProducts}</p>
                        <p className="text-xs text-gray-500">Products</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <FileText className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{businessReport.totalInvoices}</p>
                        <p className="text-xs text-gray-500">Invoices</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <ShoppingCart className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{businessReport.totalPurchaseOrders}</p>
                        <p className="text-xs text-gray-500">Purchase Orders</p>
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Top Products Bar Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Top Products by Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {businessReport.topProducts.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={businessReport.topProducts} layout="vertical" margin={{ left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                              <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-gray-400 py-12">No product data available</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top Salesmen Pie Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Sales by Team Member</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {businessReport.topSalesmen.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={businessReport.topSalesmen}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={90}
                                innerRadius={40}
                                fill="#8884d8"
                                dataKey="revenue"
                                paddingAngle={2}
                              >
                                {businessReport.topSalesmen.map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-gray-400 py-12">No salesman data available</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 py-12">No data available for the selected date range</p>
              )}
            </TabsContent>

            {/* ==================== PROFIT & LOSS ==================== */}
            <TabsContent value="profit-loss" className="space-y-5">
              {profitLossReport ? (
                <>
                  {/* P&L Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Revenue</p>
                        <p className="text-xl font-bold text-green-600 mt-1">₹{profitLossReport.totalRevenue.toLocaleString('en-IN')}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Cost</p>
                        <p className="text-xl font-bold text-red-600 mt-1">₹{profitLossReport.totalCost.toLocaleString('en-IN')}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Net Profit</p>
                        <p className={`text-xl font-bold mt-1 ${profitLossReport.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ₹{profitLossReport.netProfit.toLocaleString('en-IN')}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Profit Margin</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xl font-bold ${profitLossReport.profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {profitLossReport.profitMargin}%
                          </p>
                          {profitLossReport.profitMargin >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* P&L Statement */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Profit & Loss Statement</CardTitle>
                        <CardDescription>Financial performance breakdown</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-sm text-gray-600">Total Revenue</span>
                            <span className="font-semibold text-green-600">₹{profitLossReport.totalRevenue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-sm text-gray-600">Total Cost of Goods</span>
                            <span className="font-semibold text-red-600">-₹{profitLossReport.totalCost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b bg-gray-50 px-2 rounded">
                            <span className="text-sm font-medium">Gross Profit</span>
                            <span className="font-bold text-blue-600">₹{profitLossReport.grossProfit.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-sm text-gray-600">Sales Tax (GST Output)</span>
                            <span className="font-semibold text-orange-600">₹{profitLossReport.salesTax.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-sm text-gray-600">Purchase Tax (GST Input)</span>
                            <span className="font-semibold text-orange-600">₹{profitLossReport.purchaseTax.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-sm text-gray-600">Net Tax Liability</span>
                            <span className="font-semibold text-orange-600">-₹{profitLossReport.netTax.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between py-3 border-t-2 border-gray-300 bg-gray-50 px-2 rounded">
                            <span className="font-bold text-base">Net Profit</span>
                            <span className={`font-bold text-base ${profitLossReport.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              ₹{profitLossReport.netProfit.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Profit Breakdown Pie */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Cost Breakdown</CardTitle>
                        <CardDescription>Where your money goes</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Net Profit', value: Math.max(0, profitLossReport.netProfit) },
                                { name: 'Cost of Goods', value: profitLossReport.totalCost },
                                { name: 'Tax', value: Math.max(0, profitLossReport.netTax) },
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={90}
                              innerRadius={40}
                              fill="#8884d8"
                              dataKey="value"
                              paddingAngle={2}
                            >
                              <Cell fill="#22c55e" />
                              <Cell fill="#ef4444" />
                              <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Trend */}
                  {profitLossReport.monthly && profitLossReport.monthly.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Monthly Revenue & Profit Trend</CardTitle>
                        <CardDescription>Performance over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                          <AreaChart data={profitLossReport.monthly.map(item => ({
                            name: formatMonthLabel(item.month),
                            revenue: item.revenue,
                            cost: item.cost,
                            profit: item.profit,
                          }))}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                            <Legend />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#colorRevenue)" strokeWidth={2} />
                            <Area type="monotone" dataKey="profit" stroke="#22c55e" fill="url(#colorProfit)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-400 py-12">No profit & loss data available</p>
              )}
            </TabsContent>

            {/* ==================== GST REPORTS ==================== */}
            <TabsContent value="gst" className="space-y-5">
              {gstReport ? (
                <>
                  {/* GST Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="border-l-4 border-l-indigo-500">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Total Invoices</p>
                        <p className="text-2xl font-bold mt-1">{gstReport.totalInvoices}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Total Taxable</p>
                        <p className="text-2xl font-bold mt-1">
                          ₹{gstReport.data.reduce((sum, d) => sum + d.taxable, 0).toLocaleString('en-IN')}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Total GST</p>
                        <p className="text-2xl font-bold mt-1">
                          ₹{gstReport.data.reduce((sum, d) => sum + d.total, 0).toLocaleString('en-IN')}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* GST Rate-wise Table */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">GST Rate-wise Summary</CardTitle>
                        <CardDescription>Tax collection by GST rate slab</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rate</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                                <TableHead className="text-right">Taxable</TableHead>
                                <TableHead className="text-right">CGST</TableHead>
                                <TableHead className="text-right">SGST</TableHead>
                                <TableHead className="text-right">Total Tax</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {gstReport.data.map((item) => (
                                <TableRow key={item.gst_rate}>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono">{item.gst_rate}%</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{item.count}</TableCell>
                                  <TableCell className="text-right">₹{item.taxable.toLocaleString('en-IN')}</TableCell>
                                  <TableCell className="text-right">₹{item.cgst.toLocaleString('en-IN')}</TableCell>
                                  <TableCell className="text-right">₹{item.sgst.toLocaleString('en-IN')}</TableCell>
                                  <TableCell className="text-right font-medium">₹{item.total.toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                              ))}
                              {/* Totals row */}
                              <TableRow className="bg-gray-50 font-bold">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{gstReport.data.reduce((s, d) => s + d.count, 0)}</TableCell>
                                <TableCell className="text-right">₹{gstReport.data.reduce((s, d) => s + d.taxable, 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-right">₹{gstReport.data.reduce((s, d) => s + d.cgst, 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-right">₹{gstReport.data.reduce((s, d) => s + d.sgst, 0).toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-right">₹{gstReport.data.reduce((s, d) => s + d.total, 0).toLocaleString('en-IN')}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* GST Distribution Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Tax Distribution by Rate</CardTitle>
                        <CardDescription>Visual breakdown of GST collection</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {gstReport.data.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={gstReport.data.map(d => ({
                              rate: `${d.gst_rate}%`,
                              CGST: d.cgst,
                              SGST: d.sgst,
                              IGST: d.igst,
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="rate" />
                              <YAxis tickFormatter={(v) => formatCurrency(v)} />
                              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                              <Legend />
                              <Bar dataKey="CGST" stackId="tax" fill="#6366f1" />
                              <Bar dataKey="SGST" stackId="tax" fill="#22c55e" />
                              <Bar dataKey="IGST" stackId="tax" fill="#f59e0b" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-gray-400 py-12">No GST data available</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 py-12">No GST data available for the selected date range</p>
              )}
            </TabsContent>

            {/* ==================== SALES ANALYTICS ==================== */}
            <TabsContent value="analytics" className="space-y-5">
              {businessReport ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Product Performance Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Product Performance</CardTitle>
                      <CardDescription>Sales breakdown by product</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {businessReport.topProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty Sold</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {businessReport.topProducts.map((product, idx) => (
                                <TableRow key={product.name}>
                                  <TableCell>
                                    <Badge variant={idx < 3 ? 'default' : 'secondary'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                                      {idx + 1}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">{product.name}</TableCell>
                                  <TableCell className="text-right">{product.quantity}</TableCell>
                                  <TableCell className="text-right font-semibold">₹{product.revenue.toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-center text-gray-400 py-8">No product data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Salesman Performance Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Salesman Performance</CardTitle>
                      <CardDescription>Performance by team member</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {businessReport.topSalesmen.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Salesman</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Invoices</TableHead>
                                <TableHead className="text-right hidden sm:table-cell">Avg Invoice</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {businessReport.topSalesmen.map((salesman, idx) => (
                                <TableRow key={salesman.name}>
                                  <TableCell>
                                    <Badge variant={idx < 3 ? 'default' : 'secondary'} className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                                      {idx + 1}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">{salesman.name}</TableCell>
                                  <TableCell className="text-right font-semibold">₹{salesman.revenue.toLocaleString('en-IN')}</TableCell>
                                  <TableCell className="text-right">{salesman.invoiceCount}</TableCell>
                                  <TableCell className="text-right hidden sm:table-cell">
                                    ₹{salesman.invoiceCount > 0 ? Math.round(salesman.revenue / salesman.invoiceCount).toLocaleString('en-IN') : 0}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-center text-gray-400 py-8">No salesman data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Revenue Distribution - Products */}
                  {businessReport.topProducts.length > 0 && (
                    <Card className="lg:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Revenue Distribution</CardTitle>
                        <CardDescription>Product revenue comparison</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={businessReport.topProducts}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="quantity" name="Quantity" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-12">No analytics data available</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
