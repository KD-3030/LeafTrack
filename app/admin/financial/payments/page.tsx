'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search,
  Download,
  Filter,
  Receipt,
  Calendar,
  IndianRupee,
  Check,
  X,
  Clock,
  FileText,
  User,
} from 'lucide-react';

interface Payment {
  _id: string;
  invoice_id: {
    _id: string;
    invoice_number: string;
    grand_total: number;
    invoice_date: string;
  };
  customer_id: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    gstin?: string;
  };
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  transaction_id?: string;
  bank_reference?: string;
  cheque_number?: string;
  cheque_date?: string;
  bank_name?: string;
  status: 'Pending' | 'Confirmed' | 'Failed' | 'Cancelled';
  reconciled: boolean;
  notes?: string;
}

interface CustomerPaymentSummary {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_gstin?: string;
  total_payments: number;
  total_amount: number;
  confirmed_amount: number;
  pending_amount: number;
  payments: Payment[];
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [reconciledFilter, setReconciledFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Customer detail dialog
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPaymentSummary | null>(null);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter, reconciledFilter, dateFrom, dateTo]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const params = new URLSearchParams();
      
      if (dateFrom) params.append('from_date', dateFrom);
      if (dateTo) params.append('to_date', dateTo);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (methodFilter && methodFilter !== 'all') params.append('payment_method', methodFilter);
      if (reconciledFilter && reconciledFilter !== 'all') {
        params.append('reconciled', reconciledFilter === 'yes' ? 'true' : 'false');
      }

      const response = await fetch(`/api/payments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPayments(data.payments || []);
      } else {
        toast.error(data.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMethodFilter('all');
    setReconciledFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <Check className="mr-1 h-3 w-3" />
            Confirmed
          </Badge>
        );
      case 'Pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'Failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <X className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case 'Cancelled':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <X className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.invoice_id?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_id?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_method?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const groupPaymentsByCustomer = (): CustomerPaymentSummary[] => {
    const customerMap = new Map<string, CustomerPaymentSummary>();

    filteredPayments.forEach(payment => {
      const customerId = payment.customer_id?._id;
      if (!customerId) return;

      const existing = customerMap.get(customerId);
      
      if (existing) {
        existing.payments.push(payment);
        existing.total_payments++;
        existing.total_amount += payment.amount_paid;
        if (payment.status === 'Confirmed') {
          existing.confirmed_amount += payment.amount_paid;
        } else if (payment.status === 'Pending') {
          existing.pending_amount += payment.amount_paid;
        }
      } else {
        customerMap.set(customerId, {
          customer_name: payment.customer_id.name,
          customer_email: payment.customer_id.email,
          customer_phone: payment.customer_id.phone,
          customer_address: payment.customer_id.address,
          customer_gstin: payment.customer_id.gstin,
          total_payments: 1,
          total_amount: payment.amount_paid,
          confirmed_amount: payment.status === 'Confirmed' ? payment.amount_paid : 0,
          pending_amount: payment.status === 'Pending' ? payment.amount_paid : 0,
          payments: [payment],
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.total_amount - a.total_amount);
  };

  const handleViewCustomerDetails = (customer: CustomerPaymentSummary) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(true);
  };

  const handleDownloadCustomerReport = () => {
    if (!selectedCustomer) return;

    // Generate CSV content
    let csv = `Customer Payment Report\n\n`;
    csv += `Customer Information\n`;
    csv += `Name,${selectedCustomer.customer_name}\n`;
    csv += `Email,${selectedCustomer.customer_email}\n`;
    csv += `Phone,${selectedCustomer.customer_phone}\n`;
    csv += `Address,"${selectedCustomer.customer_address}"\n`;
    if (selectedCustomer.customer_gstin) {
      csv += `GSTIN,${selectedCustomer.customer_gstin}\n`;
    }
    csv += `\n`;
    
    csv += `Payment Summary\n`;
    csv += `Total Payments,${selectedCustomer.total_payments}\n`;
    csv += `Total Amount,₹${selectedCustomer.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `Confirmed Amount,₹${selectedCustomer.confirmed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `Pending Amount,₹${selectedCustomer.pending_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `\n`;

    csv += `Payment Details\n`;
    csv += `Date,Invoice Number,Amount,Payment Method,Transaction ID,Status,Reconciled,Notes\n`;
    
    selectedCustomer.payments.forEach(payment => {
      const date = new Date(payment.payment_date).toLocaleDateString('en-IN');
      const invoice = payment.invoice_id?.invoice_number || 'N/A';
      const amount = payment.amount_paid.toFixed(2);
      const method = payment.payment_method;
      const transactionId = payment.transaction_id || 'N/A';
      const status = payment.status;
      const reconciled = payment.reconciled ? 'Yes' : 'No';
      const notes = payment.notes ? `"${payment.notes.replace(/"/g, '""')}"` : 'N/A';
      
      csv += `${date},${invoice},${amount},${method},${transactionId},${status},${reconciled},${notes}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCustomer.customer_name.replace(/\s+/g, '_')}_payment_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Customer report downloaded successfully');
  };

  const handleDownloadAllPayments = () => {
    let csv = `All Payments Report\n`;
    csv += `Generated on: ${new Date().toLocaleString('en-IN')}\n\n`;
    
    csv += `Date,Invoice Number,Customer Name,Customer Email,Amount,Payment Method,Transaction ID,Status,Reconciled,Notes\n`;
    
    filteredPayments.forEach(payment => {
      const date = new Date(payment.payment_date).toLocaleDateString('en-IN');
      const invoice = payment.invoice_id?.invoice_number || 'N/A';
      const customerName = payment.customer_id?.name || 'Unknown';
      const customerEmail = payment.customer_id?.email || 'N/A';
      const amount = payment.amount_paid.toFixed(2);
      const method = payment.payment_method;
      const transactionId = payment.transaction_id || 'N/A';
      const status = payment.status;
      const reconciled = payment.reconciled ? 'Yes' : 'No';
      const notes = payment.notes ? `"${payment.notes.replace(/"/g, '""')}"` : 'N/A';
      
      csv += `${date},${invoice},${customerName},${customerEmail},${amount},${method},${transactionId},${status},${reconciled},${notes}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all_payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('All payments report downloaded successfully');
  };

  const calculateSummary = () => {
    const total = filteredPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const confirmed = filteredPayments.filter(p => p.status === 'Confirmed').reduce((sum, p) => sum + p.amount_paid, 0);
    const pending = filteredPayments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount_paid, 0);
    const reconciled = filteredPayments.filter(p => p.reconciled).length;
    
    return { total, confirmed, pending, reconciled, totalCount: filteredPayments.length };
  };

  const summary = calculateSummary();
  const customerSummaries = groupPaymentsByCustomer();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-500 mt-1">View, search, and manage all payment transactions</p>
        </div>
        <Button onClick={handleDownloadAllPayments}>
          <Download className="mr-2 h-4 w-4" />
          Export All Payments
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Receipt className="mr-2 h-4 w-4" />
              Total Payments
            </CardDescription>
            <CardTitle className="text-3xl">{summary.totalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              <IndianRupee className="inline h-4 w-4" />
              {summary.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center text-green-700">
              <Check className="mr-2 h-4 w-4" />
              Confirmed
            </CardDescription>
            <CardTitle className="text-3xl text-green-700">
              ₹{summary.confirmed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-600">Successfully confirmed</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center text-yellow-700">
              <Clock className="mr-2 h-4 w-4" />
              Pending
            </CardDescription>
            <CardTitle className="text-3xl text-yellow-700">
              ₹{summary.pending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-600">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center text-blue-700">
              <Check className="mr-2 h-4 w-4" />
              Reconciled
            </CardDescription>
            <CardTitle className="text-3xl text-blue-700">{summary.reconciled}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-600">Matched with bank</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Search & Filters
          </CardTitle>
          <CardDescription>Filter payments by various criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by invoice, customer, email, transaction ID, or payment method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="status_filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="method_filter">Payment Method</Label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger id="method_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reconciled_filter">Reconciled</Label>
              <Select value={reconciledFilter} onValueChange={setReconciledFilter}>
                <SelectTrigger id="reconciled_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Reconciled</SelectItem>
                  <SelectItem value="no">Not Reconciled</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <Button variant="outline" onClick={handleClearFilters}>
            Clear All Filters
          </Button>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>
            Showing {filteredPayments.length} payment(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No payments found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm || statusFilter !== 'all' || methodFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No payment transactions available'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reconciled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                        {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.invoice_id?.invoice_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.customer_id?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{payment.customer_id?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{payment.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">
                        {payment.transaction_id || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.reconciled ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Check className="mr-1 h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          <X className="mr-1 h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer-wise Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Customer-wise Payment Summary
          </CardTitle>
          <CardDescription>
            Payments grouped by customer with download options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customerSummaries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No customer data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Total Payments</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerSummaries.map((customer, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{customer.customer_name}</TableCell>
                    <TableCell>{customer.customer_email}</TableCell>
                    <TableCell className="text-right">{customer.total_payments}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{customer.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{customer.confirmed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      ₹{customer.pending_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCustomerDetails(customer)}
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Payment Details</DialogTitle>
            <DialogDescription>
              Complete payment history for {selectedCustomer?.customer_name}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Name</Label>
                    <p className="font-medium">{selectedCustomer.customer_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Email</Label>
                    <p className="font-medium">{selectedCustomer.customer_email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Phone</Label>
                    <p className="font-medium">{selectedCustomer.customer_phone}</p>
                  </div>
                  {selectedCustomer.customer_gstin && (
                    <div>
                      <Label className="text-gray-600">GSTIN</Label>
                      <p className="font-medium">{selectedCustomer.customer_gstin}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label className="text-gray-600">Address</Label>
                    <p className="font-medium">{selectedCustomer.customer_address}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Payments</CardDescription>
                    <CardTitle className="text-2xl">{selectedCustomer.total_payments}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      ₹{selectedCustomer.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-green-700">Confirmed</CardDescription>
                    <CardTitle className="text-2xl text-green-700">
                      ₹{selectedCustomer.confirmed_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-green-600">Verified payments</p>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-yellow-700">Pending</CardDescription>
                    <CardTitle className="text-2xl text-yellow-700">
                      ₹{selectedCustomer.pending_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-yellow-600">Awaiting confirmation</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment List */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reconciled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCustomer.payments.map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.invoice_id?.invoice_number || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            ₹{payment.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {payment.transaction_id || 'N/A'}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {payment.reconciled ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Check className="mr-1 h-3 w-3" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <X className="mr-1 h-3 w-3" />
                                No
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleDownloadCustomerReport}>
              <Download className="mr-2 h-4 w-4" />
              Download Customer Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
