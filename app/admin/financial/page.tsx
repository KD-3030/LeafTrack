'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, TrendingUp, TrendingDown, Receipt, RefreshCw, Plus, Check, X, AlertCircle, BarChart3, Clock, Trash2, Search, Download, Filter, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  _id: string;
  invoice_id: {
    _id: string;
    invoice_number: string;
    grand_total: number;
  };
  customer_id: {
    name: string;
    email: string;
  };
  payment_date: string;
  amount_paid: number;
  payment_method: string;
  transaction_id?: string;
  status: 'Pending' | 'Confirmed' | 'Failed' | 'Cancelled';
  reconciled: boolean;
  notes?: string;
}

interface FinancialStats {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  overdueCount: number;
  paymentsToday: number;
  paymentsTodayCount: number;
  paymentsThisMonth: number;
  collectionRate: number;
  avgPaymentDays: number;
  totalInvoices: number;
  totalPayments: number;
  statusBreakdown: {
    paid: number;
    partial: number;
    unpaid: number;
    overdue: number;
  };
}

interface OutstandingInvoice {
  _id: string;
  invoice_number: string;
  customer_id: {
    _id: string;
    id: string;
    name: string;
    email: string;
    phone?: string;
    gstin?: string;
  };
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  due_date: string;
  days_overdue: number;
  is_overdue: boolean;
}

export default function FinancialDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OutstandingInvoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: 0,
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0], // Default to today
    transaction_id: '',
    bank_reference: '',
    cheque_number: '',
    cheque_date: '',
    bank_name: '',
    notes: '',
  });

  // Search and filter states for payments
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentReconciledFilter, setPaymentReconciledFilter] = useState('all');

  // Search and filter states for invoices
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');

  // Edit payment state
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount_paid: 0,
    payment_method: 'Cash',
    payment_date: '',
    status: 'Pending' as 'Pending' | 'Confirmed' | 'Failed' | 'Cancelled',
    transaction_id: '',
    bank_reference: '',
    cheque_number: '',
    cheque_date: '',
    bank_name: '',
    notes: '',
  });

  useEffect(() => {
    loadFinancialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFinancialData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadFinancialStats(),
      loadRecentPayments(),
      loadOutstandingInvoices(),
    ]);
    setIsLoading(false);
  };

  const loadFinancialStats = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/financial/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        toast({
          title: "Error",
          description: "Failed to load financial statistics",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading financial stats:', error);
      toast({
        title: "Error",
        description: "Failed to load financial statistics",
        variant: "destructive",
      });
    }
  };

  const loadRecentPayments = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/payments?limit=10&sort=-payment_date', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Recent payments loaded:', data);
      
      if (data.success && Array.isArray(data.payments)) {
        // Filter out any payments with critical null data
        const validPayments = data.payments.filter((payment: Payment) => 
          payment && payment._id && payment.payment_date
        );
        console.log('Valid payments after filtering:', validPayments.length, 'out of', data.payments.length);
        setPayments(validPayments);
      } else {
        console.error('Invalid payment data structure:', data);
        toast({
          title: "Error",
          description: data.error || "Failed to load recent payments",
          variant: "destructive",
        });
        setPayments([]);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load recent payments",
        variant: "destructive",
      });
      setPayments([]);
    }
  };

  const loadOutstandingInvoices = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/financial/outstanding', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setOutstandingInvoices(data.invoices);
      } else {
        toast({
          title: "Error",
          description: "Failed to load outstanding invoices",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading outstanding invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load outstanding invoices",
        variant: "destructive",
      });
    }
  };

  const recordPayment = async () => {
    if (!selectedInvoice) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoice_id: selectedInvoice._id,
          customer_id: selectedInvoice.customer_id?._id || selectedInvoice.customer_id?.id,
          ...paymentForm,
        }),
      });

      const data = await response.json();
      console.log('Payment recording response:', data);
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Payment recorded successfully",
        });
        setIsPaymentDialogOpen(false);
        setSelectedInvoice(null);
        setPaymentForm({
          amount_paid: 0,
          payment_method: 'Cash',
          payment_date: new Date().toISOString().split('T')[0],
          transaction_id: '',
          bank_reference: '',
          cheque_number: '',
          cheque_date: '',
          bank_name: '',
          notes: '',
        });
        
        // Add a small delay to ensure database write completes
        console.log('Reloading financial data after payment...');
        await loadFinancialData();
        console.log('Financial data reloaded');
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to record payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const markPaymentAsReconciled = async (paymentId: string) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reconciled: true,
          status: 'Confirmed',
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Payment marked as reconciled",
        });
        loadRecentPayments();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    }
  };

  const openEditPaymentDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setEditPaymentForm({
      amount_paid: payment.amount_paid,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : '',
      status: payment.status,
      transaction_id: payment.transaction_id || '',
      bank_reference: '',
      cheque_number: '',
      cheque_date: '',
      bank_name: '',
      notes: payment.notes || '',
    });
    setIsEditPaymentDialogOpen(true);
  };

  const savePaymentEdits = async () => {
    if (!selectedPayment) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/payments/${selectedPayment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editPaymentForm),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Payment updated successfully",
        });
        setIsEditPaymentDialogOpen(false);
        setSelectedPayment(null);
        loadRecentPayments();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayment = async (paymentId: string, isReconciled: boolean) => {
    // Ask for confirmation
    const confirmMessage = isReconciled 
      ? 'This payment is reconciled. Are you sure you want to permanently delete it? This action cannot be undone.'
      : 'Are you sure you want to delete this payment? This will cancel the payment.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      // Use force delete for reconciled payments
      const url = isReconciled 
        ? `/api/payments/${paymentId}?force=true`
        : `/api/payments/${paymentId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Payment deleted successfully",
        });
        loadRecentPayments();
        loadFinancialStats();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
    }
  };

  const openPaymentDialog = (invoice: OutstandingInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm(prev => ({
      ...prev,
      amount_paid: invoice.balance_due,
    }));
    setIsPaymentDialogOpen(true);
  };

  // Filter payments based on search and filters
  const filteredPayments = payments.filter(payment => {
    // Search filter
    const matchesSearch = 
      payment.invoice_id?.invoice_number?.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
      payment.customer_id?.name?.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
      payment.customer_id?.email?.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(paymentSearchTerm.toLowerCase());

    // Status filter
    const matchesStatus = paymentStatusFilter === 'all' || payment.status === paymentStatusFilter;

    // Method filter
    const matchesMethod = paymentMethodFilter === 'all' || payment.payment_method === paymentMethodFilter;

    // Reconciled filter
    const matchesReconciled = 
      paymentReconciledFilter === 'all' || 
      (paymentReconciledFilter === 'yes' && payment.reconciled) ||
      (paymentReconciledFilter === 'no' && !payment.reconciled);

    return matchesSearch && matchesStatus && matchesMethod && matchesReconciled;
  });

  // Filter invoices based on search and filters
  const filteredInvoices = outstandingInvoices.filter(invoice => {
    // Search filter
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
      invoice.customer_id?.name?.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
      invoice.customer_id?.email?.toLowerCase().includes(invoiceSearchTerm.toLowerCase());

    // Status filter (overdue or pending)
    const matchesStatus = 
      invoiceStatusFilter === 'all' ||
      (invoiceStatusFilter === 'overdue' && (invoice.is_overdue || invoice.days_overdue > 0)) ||
      (invoiceStatusFilter === 'pending' && !invoice.is_overdue && invoice.days_overdue <= 0);

    return matchesSearch && matchesStatus;
  });

  // Group payments by customer for individual downloads
  interface CustomerPaymentGroup {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    total_amount: number;
    payment_count: number;
    confirmed_amount: number;
    pending_amount: number;
    payments: Payment[];
  }

  const groupPaymentsByCustomer = (): CustomerPaymentGroup[] => {
    const customerMap = new Map<string, CustomerPaymentGroup>();

    filteredPayments.forEach(payment => {
      const customerId = payment.customer_id?.name || 'Unknown';
      const existing = customerMap.get(customerId);
      
      if (existing) {
        existing.payments.push(payment);
        existing.payment_count++;
        existing.total_amount += payment.amount_paid;
        if (payment.status === 'Confirmed') {
          existing.confirmed_amount += payment.amount_paid;
        } else if (payment.status === 'Pending') {
          existing.pending_amount += payment.amount_paid;
        }
      } else {
        customerMap.set(customerId, {
          customer_id: customerId,
          customer_name: payment.customer_id?.name || 'Unknown',
          customer_email: payment.customer_id?.email || 'N/A',
          total_amount: payment.amount_paid,
          payment_count: 1,
          confirmed_amount: payment.status === 'Confirmed' ? payment.amount_paid : 0,
          pending_amount: payment.status === 'Pending' ? payment.amount_paid : 0,
          payments: [payment],
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.total_amount - a.total_amount);
  };

  // Group outstanding invoices by customer
  interface CustomerInvoiceGroup {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    total_outstanding: number;
    invoice_count: number;
    overdue_amount: number;
    invoices: OutstandingInvoice[];
  }

  const groupInvoicesByCustomer = (): CustomerInvoiceGroup[] => {
    const customerMap = new Map<string, CustomerInvoiceGroup>();

    filteredInvoices.forEach(invoice => {
      const customerId = invoice.customer_id?.name || 'Unknown';
      const existing = customerMap.get(customerId);
      
      if (existing) {
        existing.invoices.push(invoice);
        existing.invoice_count++;
        existing.total_outstanding += invoice.balance_due;
        if (invoice.is_overdue || invoice.days_overdue > 0) {
          existing.overdue_amount += invoice.balance_due;
        }
      } else {
        customerMap.set(customerId, {
          customer_id: customerId,
          customer_name: invoice.customer_id?.name || 'Unknown',
          customer_email: invoice.customer_id?.email || 'N/A',
          total_outstanding: invoice.balance_due,
          invoice_count: 1,
          overdue_amount: (invoice.is_overdue || invoice.days_overdue > 0) ? invoice.balance_due : 0,
          invoices: [invoice],
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.total_outstanding - a.total_outstanding);
  };

  // Download individual customer payment report
  const downloadCustomerPaymentReport = (customerGroup: CustomerPaymentGroup) => {
    let csv = `Customer Payment Report\n\n`;
    csv += `Customer Information\n`;
    csv += `Name,${customerGroup.customer_name}\n`;
    csv += `Email,${customerGroup.customer_email}\n`;
    csv += `\n`;
    
    csv += `Payment Summary\n`;
    csv += `Total Payments,${customerGroup.payment_count}\n`;
    csv += `Total Amount,₹${customerGroup.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `Confirmed Amount,₹${customerGroup.confirmed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `Pending Amount,₹${customerGroup.pending_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `\n`;

    csv += `Payment Details\n`;
    csv += `Date,Invoice Number,Amount,Payment Method,Transaction ID,Status,Reconciled,Notes\n`;
    
    customerGroup.payments.forEach(payment => {
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

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customerGroup.customer_name.replace(/\s+/g, '_')}_payment_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: `Payment report downloaded for ${customerGroup.customer_name}`,
    });
  };

  // Download individual customer invoice report
  const downloadCustomerInvoiceReport = (customerGroup: CustomerInvoiceGroup) => {
    let csv = `Customer Outstanding Invoice Report\n\n`;
    csv += `Customer Information\n`;
    csv += `Name,${customerGroup.customer_name}\n`;
    csv += `Email,${customerGroup.customer_email}\n`;
    csv += `\n`;
    
    csv += `Outstanding Summary\n`;
    csv += `Total Invoices,${customerGroup.invoice_count}\n`;
    csv += `Total Outstanding,₹${customerGroup.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `Overdue Amount,₹${customerGroup.overdue_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    csv += `\n`;

    csv += `Invoice Details\n`;
    csv += `Invoice Number,Total Amount,Paid Amount,Balance Due,Due Date,Days Overdue,Status\n`;
    
    customerGroup.invoices.forEach(invoice => {
      const invoiceNumber = invoice.invoice_number || 'N/A';
      const total = invoice.grand_total.toFixed(2);
      const paid = invoice.paid_amount.toFixed(2);
      const balance = invoice.balance_due.toFixed(2);
      const dueDate = new Date(invoice.due_date).toLocaleDateString('en-IN');
      const daysOverdue = invoice.days_overdue;
      const status = invoice.days_overdue > 0 ? 'Overdue' : 'Pending';
      
      csv += `${invoiceNumber},${total},${paid},${balance},${dueDate},${daysOverdue},${status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customerGroup.customer_name.replace(/\s+/g, '_')}_invoice_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: `Invoice report downloaded for ${customerGroup.customer_name}`,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Confirmed: 'bg-green-100 text-green-800',
      Failed: 'bg-red-100 text-red-800',
      Cancelled: 'bg-gray-100 text-gray-800',
    };
    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    return <Badge className={style}>{status || 'Unknown'}</Badge>;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cash': return '💵';
      case 'Bank Transfer': return '🏦';
      case 'UPI': return '📱';
      case 'Cheque': return '📝';
      case 'Credit Card': return '💳';
      case 'Debit Card': return '💳';
      default: return '💰';
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Complete financial overview and payment management</p>
          </div>
          <Button onClick={loadFinancialData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Financial Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
                <p className="text-xs text-gray-600">All time revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalPaid.toLocaleString('en-IN')}</div>
                <p className="text-xs text-gray-600">
                  {stats.collectionRate ? `${stats.collectionRate.toFixed(1)}% collection rate` : '0.0% collection rate'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalOutstanding.toLocaleString('en-IN')}</div>
                <p className="text-xs text-gray-600">Pending collection</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalOverdue.toLocaleString('en-IN')}</div>
                <p className="text-xs text-gray-600">{stats.overdueCount} overdue invoices</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="payments" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
            <TabsTrigger value="outstanding" className="text-xs sm:text-sm">Outstanding</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
          </TabsList>

          {/* Recent Payments */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <span>Recent Payments</span>
                </CardTitle>
                <CardDescription>
                  Latest payment transactions and reconciliation status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters for Payments */}
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by invoice, customer, email, or transaction ID..."
                          value={paymentSearchTerm}
                          onChange={(e) => setPaymentSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPaymentSearchTerm('');
                        setPaymentStatusFilter('all');
                        setPaymentMethodFilter('all');
                        setPaymentReconciledFilter('all');
                      }}
                      className="whitespace-nowrap"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-status-filter" className="text-sm font-medium">Status</Label>
                      <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                        <SelectTrigger id="payment-status-filter">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Failed">Failed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-method-filter" className="text-sm font-medium">Payment Method</Label>
                      <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                        <SelectTrigger id="payment-method-filter">
                          <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Debit Card">Debit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-reconciled-filter" className="text-sm font-medium">Reconciled</Label>
                      <Select value={paymentReconciledFilter} onValueChange={setPaymentReconciledFilter}>
                        <SelectTrigger id="payment-reconciled-filter">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="yes">Reconciled</SelectItem>
                          <SelectItem value="no">Not Reconciled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {filteredPayments.length} of {payments.length} payments
                    </p>
                  </div>
                </div>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payments...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Method</TableHead>
                        <TableHead className="hidden lg:table-cell">Date</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Reconciled</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            {paymentSearchTerm || paymentStatusFilter !== 'all' || paymentMethodFilter !== 'all' || paymentReconciledFilter !== 'all'
                              ? 'No payments found matching your filters'
                              : 'No recent payments found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPayments.map((payment) => (
                          <TableRow key={payment._id}>
                            <TableCell className="font-medium">
                              {payment.invoice_id?.invoice_number || 'No Invoice'}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {payment.customer_id?.name || 'Unknown Customer'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {payment.customer_id?.email || 'No email'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>₹{(payment.amount_paid || 0).toLocaleString()}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center space-x-2">
                                <span>{getPaymentMethodIcon(payment.payment_method)}</span>
                                <span>{payment.payment_method}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {getStatusBadge(payment.status)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {payment.reconciled ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <Check className="h-3 w-3 mr-1" />
                                  Yes
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">
                                  <X className="h-3 w-3 mr-1" />
                                  No
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Edit button for all payments */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditPaymentDialog(payment)}
                                  title="Edit payment"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                  Edit
                                </Button>
                                
                                {/* Delete button for all payments */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeletePayment(payment._id, payment.reconciled)}
                                  title={payment.reconciled ? "Delete payment (force delete)" : "Delete payment"}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                                
                                {!payment.reconciled && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markPaymentAsReconciled(payment._id)}
                                    title="Mark as reconciled"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Reconcile
                                  </Button>
                                )}
                                {payment.transaction_id && (
                                  <span className="text-xs text-gray-500" title={payment.transaction_id}>
                                    #{payment.transaction_id.substring(0, 8)}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outstanding Invoices */}
          <TabsContent value="outstanding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span>Outstanding Invoices</span>
                </CardTitle>
                <CardDescription>
                  Invoices pending payment with due dates and overdue information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters for Outstanding Invoices */}
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by invoice number, customer name, or email..."
                          value={invoiceSearchTerm}
                          onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setInvoiceSearchTerm('');
                        setInvoiceStatusFilter('all');
                      }}
                      className="whitespace-nowrap"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-status-filter" className="text-sm font-medium">Status</Label>
                      <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                        <SelectTrigger id="invoice-status-filter">
                          <SelectValue placeholder="All Invoices" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Invoices</SelectItem>
                          <SelectItem value="overdue">Overdue Only</SelectItem>
                          <SelectItem value="pending">Pending (Not Overdue)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">
                          Showing {filteredInvoices.length} of {outstandingInvoices.length} invoices
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Total</TableHead>
                      <TableHead>Balance Due</TableHead>
                      <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {invoiceSearchTerm || invoiceStatusFilter !== 'all'
                            ? 'No invoices found matching your filters'
                            : 'No outstanding invoices found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice._id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {invoice.customer_id?.name || 'Unknown Customer'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {invoice.customer_id?.email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">₹{invoice.grand_total.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="font-medium text-red-600">
                            ₹{invoice.balance_due.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div>
                            <div>{new Date(invoice.due_date).toLocaleDateString()}</div>
                            {invoice.days_overdue > 0 && (
                              <div className="text-sm text-red-600">
                                {invoice.days_overdue} days overdue
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {(invoice.is_overdue || invoice.days_overdue > 0) ? (
                            <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(invoice)}
                            className=""
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>Financial Analytics</span>
                </CardTitle>
                <CardDescription>
                  Key financial metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Collection Performance</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Collection Rate:</span>
                          <span className="font-semibold">
                            {stats.collectionRate ? `${stats.collectionRate.toFixed(1)}%` : '0.0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Payment Time:</span>
                          <span className="font-semibold">{stats.avgPaymentDays || 0} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payments Today:</span>
                          <span className="font-semibold">₹{stats.paymentsToday.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payments This Month:</span>
                          <span className="font-semibold">₹{stats.paymentsThisMonth.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Outstanding Analysis</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Outstanding:</span>
                          <span className="font-semibold">₹{stats.totalOutstanding.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overdue Amount:</span>
                          <span className="font-semibold text-red-600">₹{stats.totalOverdue.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overdue Ratio:</span>
                          <span className="font-semibold text-red-600">
                            {stats.totalOutstanding > 0 ? ((stats.totalOverdue / stats.totalOutstanding) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Payment Dialog */}
        <Dialog open={isEditPaymentDialogOpen} onOpenChange={setIsEditPaymentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>
                Edit payment details for invoice {selectedPayment?.invoice_id?.invoice_number || 'N/A'}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPayment && (
              <div className="space-y-6">
                {/* Payment Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Payment Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Invoice:</span> {selectedPayment.invoice_id?.invoice_number || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span> {selectedPayment.customer_id?.name || 'Unknown Customer'}
                    </div>
                    <div>
                      <span className="font-medium">Original Amount:</span> ₹{(selectedPayment.amount_paid || 0).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Reconciled:</span> {selectedPayment.reconciled ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>

                {/* Edit Payment Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_amount_paid">Amount Paid *</Label>
                      <Input
                        id="edit_amount_paid"
                        type="number"
                        value={editPaymentForm.amount_paid}
                        onChange={(e) => setEditPaymentForm(prev => ({ 
                          ...prev, 
                          amount_paid: parseFloat(e.target.value) || 0 
                        }))}
                        min={0}
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit_payment_method">Payment Method *</Label>
                      <Select 
                        value={editPaymentForm.payment_method}
                        onValueChange={(value) => setEditPaymentForm(prev => ({ 
                          ...prev, 
                          payment_method: value 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_payment_date">Payment Date *</Label>
                      <Input
                        id="edit_payment_date"
                        type="date"
                        value={editPaymentForm.payment_date}
                        onChange={(e) => setEditPaymentForm(prev => ({ 
                          ...prev, 
                          payment_date: e.target.value 
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit_status">Status *</Label>
                      <Select 
                        value={editPaymentForm.status}
                        onValueChange={(value: 'Pending' | 'Confirmed' | 'Failed' | 'Cancelled') => 
                          setEditPaymentForm(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Failed">Failed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Additional fields based on payment method */}
                  {(editPaymentForm.payment_method === 'Bank Transfer' || editPaymentForm.payment_method === 'UPI') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_transaction_id">Transaction ID</Label>
                        <Input
                          id="edit_transaction_id"
                          value={editPaymentForm.transaction_id}
                          onChange={(e) => setEditPaymentForm(prev => ({ 
                            ...prev, 
                            transaction_id: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_bank_reference">Bank Reference</Label>
                        <Input
                          id="edit_bank_reference"
                          value={editPaymentForm.bank_reference}
                          onChange={(e) => setEditPaymentForm(prev => ({ 
                            ...prev, 
                            bank_reference: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  {editPaymentForm.payment_method === 'Cheque' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_cheque_number">Cheque Number</Label>
                        <Input
                          id="edit_cheque_number"
                          value={editPaymentForm.cheque_number}
                          onChange={(e) => setEditPaymentForm(prev => ({ 
                            ...prev, 
                            cheque_number: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_cheque_date">Cheque Date</Label>
                        <Input
                          id="edit_cheque_date"
                          type="date"
                          value={editPaymentForm.cheque_date}
                          onChange={(e) => setEditPaymentForm(prev => ({ 
                            ...prev, 
                            cheque_date: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_bank_name">Bank Name</Label>
                        <Input
                          id="edit_bank_name"
                          value={editPaymentForm.bank_name}
                          onChange={(e) => setEditPaymentForm(prev => ({ 
                            ...prev, 
                            bank_name: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit_notes">Notes</Label>
                    <Textarea
                      id="edit_notes"
                      value={editPaymentForm.notes}
                      onChange={(e) => setEditPaymentForm(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                      rows={3}
                      placeholder="Any additional notes about this payment..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditPaymentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={savePaymentEdits}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={editPaymentForm.amount_paid <= 0}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Record Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a new payment for invoice {selectedInvoice?.invoice_number || 'N/A'}
              </DialogDescription>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Invoice Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Invoice:</span> {selectedInvoice?.invoice_number || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span> {selectedInvoice.customer_id?.name || 'Unknown Customer'}
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span> ₹{(selectedInvoice?.grand_total || 0).toLocaleString('en-IN')}
                    </div>
                    <div>
                      <span className="font-medium">Balance Due:</span> ₹{(selectedInvoice?.balance_due || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount_paid">Amount Paid *</Label>
                      <Input
                        id="amount_paid"
                        type="number"
                        value={paymentForm.amount_paid}
                        onChange={(e) => setPaymentForm(prev => ({ 
                          ...prev, 
                          amount_paid: parseFloat(e.target.value) || 0 
                        }))}
                        max={selectedInvoice.balance_due}
                        min={0}
                        step="0.01"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Payment Method *</Label>
                      <Select 
                        value={paymentForm.payment_method}
                        onValueChange={(value) => setPaymentForm(prev => ({ 
                          ...prev, 
                          payment_method: value 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Payment Date *</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm(prev => ({ 
                        ...prev, 
                        payment_date: e.target.value 
                      }))}
                      max={new Date().toISOString().split('T')[0]} // Don't allow future dates
                    />
                  </div>

                  {/* Additional fields based on payment method */}
                  {(paymentForm.payment_method === 'Bank Transfer' || paymentForm.payment_method === 'UPI') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="transaction_id">Transaction ID</Label>
                        <Input
                          id="transaction_id"
                          value={paymentForm.transaction_id}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            transaction_id: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_reference">Bank Reference</Label>
                        <Input
                          id="bank_reference"
                          value={paymentForm.bank_reference}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            bank_reference: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  {paymentForm.payment_method === 'Cheque' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cheque_number">Cheque Number</Label>
                        <Input
                          id="cheque_number"
                          value={paymentForm.cheque_number}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            cheque_number: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cheque_date">Cheque Date</Label>
                        <Input
                          id="cheque_date"
                          type="date"
                          value={paymentForm.cheque_date}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            cheque_date: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          value={paymentForm.bank_name}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            bank_name: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                      rows={3}
                      placeholder="Any additional notes about this payment..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsPaymentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={recordPayment}
                    className=""
                    disabled={paymentForm.amount_paid <= 0}
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
