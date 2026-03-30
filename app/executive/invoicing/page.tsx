'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, FileText, IndianRupee, Clock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface Invoice {
  _id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal: number;
  total_tax: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  payment_status: string;
  status: string;
  items: InvoiceItem[];
  createdAt?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function ExecutiveInvoicingPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1, totalPages: 1, totalCount: 0, hasNextPage: false, hasPrevPage: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      if (!token) throw new Error('No authentication token found.');

      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/invoices?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setInvoices(data.invoices || []);
        setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalCount: 0, hasNextPage: false, hasPrevPage: false });
      } else {
        toast.error(data.error || 'Failed to load invoices');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load invoices';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (user) loadInvoices();
  }, [user, loadInvoices]);

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = invoices.reduce(
    (acc, inv) => ({
      total: acc.total + inv.grand_total,
      paid: acc.paid + inv.paid_amount,
      pending: acc.pending + inv.balance_due,
    }),
    { total: 0, paid: 0, pending: 0 }
  );

  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const paymentBadge = (status: string) => {
    if (status === 'Paid') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
    if (status === 'Partial') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Partial</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Pending</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Invoicing</h1>
        <p className="text-muted-foreground text-sm mt-1">View invoices for your territory customers</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pagination.totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{formatCurrency(totals.paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">{formatCurrency(totals.pending)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Generated">Generated</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-medium">{searchTerm ? 'No matching invoices' : 'No invoices yet'}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? 'Try a different search' : 'Invoices will appear here when created from approved sales'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv._id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{inv.customer_name}</div>
                      {inv.customer_phone && (
                        <div className="text-xs text-muted-foreground">{inv.customer_phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(inv.invoice_date || inv.createdAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.due_date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.grand_total)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(inv.paid_amount)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatCurrency(inv.balance_due)}</TableCell>
                    <TableCell>{paymentBadge(inv.payment_status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} invoices)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage(p => p + 1)}
            >
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
