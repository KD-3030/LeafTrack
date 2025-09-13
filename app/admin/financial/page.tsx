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
import { DollarSign, TrendingUp, TrendingDown, Receipt, RefreshCw, Plus, Check, X, AlertCircle, BarChart3, Clock } from 'lucide-react';
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
  total_revenue: number;
  total_paid: number;
  total_pending: number;
  overdue_amount: number;
  payments_today: number;
  payments_this_month: number;
  average_payment_time: number;
}

interface OutstandingInvoice {
  _id: string;
  invoice_number: string;
  customer_id: string;
  customer_details: {
    name: string;
    email: string;
  };
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  due_date: string;
  days_overdue: number;
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
      const response = await fetch('/api/payments?limit=10&sort=-payment_date', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPayments(data.payments);
      } else {
        toast({
          title: "Error",
          description: "Failed to load recent payments",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: "Failed to load recent payments",
        variant: "destructive",
      });
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
          customer_id: selectedInvoice.customer_id,
          ...paymentForm,
        }),
      });

      const data = await response.json();
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
          transaction_id: '',
          bank_reference: '',
          cheque_number: '',
          cheque_date: '',
          bank_name: '',
          notes: '',
        });
        loadFinancialData();
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

  const openPaymentDialog = (invoice: OutstandingInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm(prev => ({
      ...prev,
      amount_paid: invoice.balance_due,
    }));
    setIsPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Confirmed: 'bg-green-100 text-green-800',
      Failed: 'bg-red-100 text-red-800',
      Cancelled: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={styles[status as keyof typeof styles]}>{status}</Badge>;
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
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-gray-600 mt-1">Complete financial overview and payment management</p>
          </div>
          <Button onClick={loadFinancialData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Financial Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.total_revenue.toLocaleString()}</div>
                <p className="text-xs text-gray-600">All time revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.total_paid.toLocaleString()}</div>
                <p className="text-xs text-gray-600">
                  {((stats.total_paid / stats.total_revenue) * 100).toFixed(1)}% collection rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.total_pending.toLocaleString()}</div>
                <p className="text-xs text-gray-600">Pending collection</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.overdue_amount.toLocaleString()}</div>
                <p className="text-xs text-gray-600">Needs immediate attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments">Recent Payments</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
            <TabsTrigger value="analytics">Financial Analytics</TabsTrigger>
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
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payments...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reconciled</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-medium">
                            {payment.invoice_id.invoice_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.customer_id.name}</div>
                              <div className="text-sm text-gray-600">{payment.customer_id.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>₹{payment.amount_paid.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{getPaymentMethodIcon(payment.payment_method)}</span>
                              <span>{payment.payment_method}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell>
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
                            {!payment.reconciled && payment.status === 'Pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markPaymentAsReconciled(payment._id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance Due</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingInvoices.map((invoice) => (
                      <TableRow key={invoice._id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.customer_details.name}</div>
                            <div className="text-sm text-gray-600">{invoice.customer_details.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>₹{invoice.grand_total.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="font-medium text-red-600">
                            ₹{invoice.balance_due.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{new Date(invoice.due_date).toLocaleDateString()}</div>
                            {invoice.days_overdue > 0 && (
                              <div className="text-sm text-red-600">
                                {invoice.days_overdue} days overdue
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.days_overdue > 0 ? (
                            <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(invoice)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                            {((stats.total_paid / stats.total_revenue) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Payment Time:</span>
                          <span className="font-semibold">{stats.average_payment_time} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payments Today:</span>
                          <span className="font-semibold">₹{stats.payments_today.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payments This Month:</span>
                          <span className="font-semibold">₹{stats.payments_this_month.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Outstanding Analysis</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Outstanding:</span>
                          <span className="font-semibold">₹{stats.total_pending.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overdue Amount:</span>
                          <span className="font-semibold text-red-600">₹{stats.overdue_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overdue Ratio:</span>
                          <span className="font-semibold text-red-600">
                            {stats.total_pending > 0 ? ((stats.overdue_amount / stats.total_pending) * 100).toFixed(1) : 0}%
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

        {/* Record Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a new payment for invoice {selectedInvoice?.invoice_number}
              </DialogDescription>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Invoice Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Invoice:</span> {selectedInvoice.invoice_number}
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span> {selectedInvoice.customer_details.name}
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span> ₹{selectedInvoice.grand_total.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Balance Due:</span> ₹{selectedInvoice.balance_due.toLocaleString()}
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
                    className="bg-green-600 hover:bg-green-700"
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
