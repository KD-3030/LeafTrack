'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  Cell
} from 'recharts';
import { TrendingUp, DollarSign, Download, RefreshCw, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessReport {
  stats: {
    total_revenue: number;
    total_invoices: number;
    paid_amount: number;
    pending_amount: number;
  };
  top_products: Array<{
    _id: string;
    quantity_sold: number;
    revenue: number;
    orders: number;
  }>;
  top_salesmen: Array<{
    _id: string;
    salesman_name: string;
    total_sales: number;
    total_invoices: number;
  }>;
  monthly_trend: Array<{
    _id: {
      year: number;
      month: number;
    };
    revenue: number;
    invoices: number;
  }>;
}

interface ProfitLossReport {
  total_revenue: number;
  total_cost: number;
  total_tax: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
}

interface GSTReport {
  summary: {
    total_invoices: number;
    total_taxable_amount: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_tax: number;
    total_invoice_value: number;
  };
  gst_rate_wise: Array<{
    _id: number;
    count: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_amount: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportsPage() {
  const [businessReport, setBusinessReport] = useState<BusinessReport | null>(null);
  const [profitLossReport, setProfitLossReport] = useState<ProfitLossReport | null>(null);
  const [gstReport, setGSTReport] = useState<GSTReport | null>(null);
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
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setBusinessReport(data);
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
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setProfitLossReport(data.profit_loss);
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
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        console.log('GST Report loaded:', data);
        setGSTReport(data);
      } else {
        console.error('GST Report error:', data);
        toast.error(data.details || 'Failed to load GST report');
      }
    } catch (error) {
      console.error('Error loading GST report:', error);
      toast.error('Failed to load GST report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const exportGSTR1 = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(
        `/api/reports/gst?type=gstr1&from_date=${dateRange.from}&to_date=${dateRange.to}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success && data.data) {
        console.log('GSTR-1 data:', data);
        
        if (data.data.length === 0) {
          toast.error('No invoices found for the selected date range');
          return;
        }
        
        // Convert to CSV and download
        const csvContent = convertToCSV(data.data);
        if (csvContent) {
          downloadCSV(csvContent, `GSTR1_${dateRange.from}_to_${dateRange.to}.csv`);
          toast.success(`GSTR-1 report exported successfully (${data.data.length} invoices)`);
        } else {
          toast.error('Failed to generate CSV content');
        }
      } else {
        console.error('GSTR-1 export error:', data);
        toast.error(data.details || 'Failed to export GSTR-1 report');
      }
    } catch (error) {
      console.error('Error exporting GSTR-1:', error);
      toast.error('Failed to export GSTR-1 report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return '';
    
    // Flatten GSTR-1 data structure for CSV export
    const flattenedData: any[] = [];
    
    data.forEach(invoice => {
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item: any) => {
          flattenedData.push({
            invoice_number: invoice.invoice_number,
            invoice_date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
            customer_name: invoice.customer_name || '',
            customer_gstin: invoice.customer_gstin || 'Unregistered',
            customer_state: invoice.customer_state || '',
            invoice_type: invoice.invoice_type,
            item_description: item.item_description,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit_price: item.unit_price.toFixed(2),
            discount: item.discount,
            taxable_amount: item.taxable_amount.toFixed(2),
            gst_rate: item.gst_rate,
            cgst_amount: item.cgst_amount.toFixed(2),
            sgst_amount: item.sgst_amount.toFixed(2),
            igst_amount: item.igst_amount.toFixed(2),
            total_amount: item.total_amount.toFixed(2),
          });
        });
      } else {
        // Handle invoices without items
        flattenedData.push({
          invoice_number: invoice.invoice_number,
          invoice_date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
          customer_name: invoice.customer_name || '',
          customer_gstin: invoice.customer_gstin || 'Unregistered',
          customer_state: invoice.customer_state || '',
          invoice_type: invoice.invoice_type,
          item_description: '',
          hsn_code: '',
          quantity: 0,
          unit_price: 0,
          discount: 0,
          taxable_amount: invoice.total_taxable_amount.toFixed(2),
          gst_rate: 0,
          cgst_amount: invoice.total_cgst.toFixed(2),
          sgst_amount: invoice.total_sgst.toFixed(2),
          igst_amount: invoice.total_igst.toFixed(2),
          total_amount: invoice.invoice_value.toFixed(2),
        });
      }
    });
    
    if (flattenedData.length === 0) return '';
    
    const headers = Object.keys(flattenedData[0]);
    const csvRows = [
      headers.join(','),
      ...flattenedData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes in strings and wrap in quotes
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
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

  const formatMonthlyTrendData = (data: { _id: { year: number; month: number }; revenue: number; invoices: number }[]) => {
    return data.map(item => ({
      name: `${item._id.month}/${item._id.year}`,
      revenue: item.revenue,
      invoices: item.invoices,
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Comprehensive business insights and GST compliance reports</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportGSTR1}
              variant="outline"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export GSTR-1
            </Button>
            <Button
              onClick={loadAllReports}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <Label htmlFor="from-date">From:</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="to-date">To:</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-40"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Business Overview</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="gst">GST Reports</TabsTrigger>
            <TabsTrigger value="analytics">Sales Analytics</TabsTrigger>
          </TabsList>

          {/* Business Overview */}
          <TabsContent value="overview" className="space-y-6">
            {businessReport && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{businessReport.stats.total_revenue.toLocaleString()}</div>
                      <p className="text-xs text-gray-600">From {businessReport.stats.total_invoices} invoices</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{businessReport.stats.paid_amount.toLocaleString()}</div>
                      <p className="text-xs text-gray-600">
                        {((businessReport.stats.paid_amount / businessReport.stats.total_revenue) * 100).toFixed(1)}% collected
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                      <FileText className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{businessReport.stats.pending_amount.toLocaleString()}</div>
                      <p className="text-xs text-gray-600">Pending collection</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                      <FileText className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{businessReport.stats.total_invoices}</div>
                      <p className="text-xs text-gray-600">Total generated</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Products */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Selling Products</CardTitle>
                      <CardDescription>Revenue by product</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={businessReport.top_products}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="_id" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Salesmen */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Salesmen</CardTitle>
                      <CardDescription>Sales by salesman</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={businessReport.top_salesmen}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ salesman_name, percent }) => `${salesman_name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="total_sales"
                          >
                            {businessReport.top_salesmen.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Sales']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Trend</CardTitle>
                    <CardDescription>Monthly revenue trend</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={formatMonthlyTrendData(businessReport.monthly_trend)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Profit & Loss */}
          <TabsContent value="profit-loss" className="space-y-6">
            {profitLossReport && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profit & Loss Statement</CardTitle>
                    <CardDescription>Financial performance overview</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Total Revenue</span>
                      <span className="text-green-600 font-semibold">₹{profitLossReport.total_revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Total Cost</span>
                      <span className="text-red-600 font-semibold">-₹{profitLossReport.total_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Gross Profit</span>
                      <span className="text-blue-600 font-semibold">₹{profitLossReport.gross_profit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Total Tax</span>
                      <span className="text-orange-600 font-semibold">-₹{profitLossReport.total_tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t-2 border-gray-300 font-bold text-lg">
                      <span>Net Profit</span>
                      <span className={profitLossReport.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₹{profitLossReport.net_profit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium">Profit Margin</span>
                      <span className="font-semibold">{profitLossReport.profit_margin.toFixed(2)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Profit Breakdown</CardTitle>
                    <CardDescription>Visual representation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Net Profit', value: profitLossReport.net_profit },
                            { name: 'Cost', value: profitLossReport.total_cost },
                            { name: 'Tax', value: profitLossReport.total_tax },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#00C49F" />
                          <Cell fill="#FF8042" />
                          <Cell fill="#FFBB28" />
                        </Pie>
                        <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* GST Reports */}
          <TabsContent value="gst" className="space-y-6">
            {gstReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Taxable Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{gstReport.summary.total_taxable_amount.toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total GST Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{gstReport.summary.total_tax.toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Invoice Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{gstReport.summary.total_invoice_value.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>GST Rate-wise Summary</CardTitle>
                    <CardDescription>Tax collection by GST rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>GST Rate</TableHead>
                          <TableHead>Transactions</TableHead>
                          <TableHead>Taxable Amount</TableHead>
                          <TableHead>CGST</TableHead>
                          <TableHead>SGST</TableHead>
                          <TableHead>IGST</TableHead>
                          <TableHead>Total Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gstReport.gst_rate_wise.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>{item._id}%</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>₹{item.taxable_amount.toLocaleString()}</TableCell>
                            <TableCell>₹{item.cgst_amount.toLocaleString()}</TableCell>
                            <TableCell>₹{item.sgst_amount.toLocaleString()}</TableCell>
                            <TableCell>₹{item.igst_amount.toLocaleString()}</TableCell>
                            <TableCell>₹{(item.cgst_amount + item.sgst_amount + item.igst_amount).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Sales Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            {businessReport && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Performance</CardTitle>
                      <CardDescription>Quantity sold by product</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity Sold</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Orders</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {businessReport.top_products.map((product) => (
                            <TableRow key={product._id}>
                              <TableCell className="font-medium">{product._id}</TableCell>
                              <TableCell>{product.quantity_sold}</TableCell>
                              <TableCell>₹{product.revenue.toLocaleString()}</TableCell>
                              <TableCell>{product.orders}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Salesman Performance</CardTitle>
                      <CardDescription>Sales performance by team member</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Salesman</TableHead>
                            <TableHead>Total Sales</TableHead>
                            <TableHead>Invoices</TableHead>
                            <TableHead>Avg. Invoice</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {businessReport.top_salesmen.map((salesman) => (
                            <TableRow key={salesman._id}>
                              <TableCell className="font-medium">{salesman.salesman_name}</TableCell>
                              <TableCell>₹{salesman.total_sales.toLocaleString()}</TableCell>
                              <TableCell>{salesman.total_invoices}</TableCell>
                              <TableCell>₹{(salesman.total_sales / salesman.total_invoices).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
