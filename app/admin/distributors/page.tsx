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
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Receipt,
  IndianRupee,
  Calendar,
  TrendingUp,
  AlertCircle,
  Download
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// import { useAuth } from '@/contexts/AuthContext'; // Removed unused import
import { toast } from 'sonner';
// XLSX is dynamically imported in downloadTransactionExcel() for bundle optimization

interface Distributor {
  _id: string;
  name: string;
  email?: string; // Now optional
  phone: string; // Now required
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  business_name?: string;
  business_type: 'Individual' | 'Partnership' | 'Company' | 'LLP';
  credit_limit: number;
  credit_days: number;
  status: 'Active' | 'Inactive';
  tags?: string[];
  notes?: string;
  outstanding_balance?: number; // Outstanding amount to be collected
  pe_id?: string;
  createdAt: string;
}

interface PrimaryExecutive {
  _id: string;
  name: string;
  email: string;
}

interface DistributorTransaction {
  summary: {
    total_invoices: number;
    total_invoice_amount: number;
    total_paid_amount: number;
    total_payment_records: number; // Actual sum from payment records
    total_due_amount: number;
    paid_invoices: number;
    pending_invoices: number;
    partial_invoices: number;
    overdue_invoices: number;
    payment_count: number; // Number of payment records
  };
  transactions: {
    invoices: Array<{
      _id: string;
      invoice_number: string;
      invoice_date: string;
      grand_total: number;
      paid_amount: number;
      balance_due: number;
      payment_status: 'Pending' | 'Partial' | 'Paid';
      status: string;
      items: Array<{
        product_name: string;
        quantity: number;
        unit_price: number;
        total_amount: number;
      }>;
      taxable_amount: number;
      total_tax: number;
    }>;
    payments: Array<{
      _id: string;
      payment_date: string;
      amount: number;
      payment_method: string;
      reference_number?: string;
      invoice_id?: {
        invoice_number: string;
      };
      notes?: string;
    }>;
  };
}

interface DistributorFormData {
  name: string;
  email: string; // Keep as string for form, but not required
  phone: string; // Now required
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  business_name: string;
  business_type: 'Individual' | 'Partnership' | 'Company' | 'LLP';
  credit_limit: number;
  credit_days: number;
  status: 'Active' | 'Inactive';
  notes: string;
  pe_id: string;
}

const initialFormData: DistributorFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan: '',
  business_name: '',
  business_type: 'Individual',
  credit_limit: 0,
  credit_days: 30,
  status: 'Active',
  notes: '',
  pe_id: '',
};

export default function DistributorsPage() {
  // const { user } = useAuth(); // Removed unused variable
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDistributor, setselectedDistributor] = useState<Distributor | null>(null);
  const [DistributorTransactions, setDistributorTransactions] = useState<DistributorTransaction | null>(null);
  const [isLoadingTransactions, setisLoadingTransactions] = useState(false);
  const [formData, setFormData] = useState<DistributorFormData>(initialFormData);
  const [editingDistributor, seteditingDistributor] = useState<Distributor | null>(null);
  const [primaryExecutives, setPrimaryExecutives] = useState<PrimaryExecutive[]>([]);
  
  const [deleteTarget, setDeleteTarget] = useState<Distributor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invoice filtering and sorting state
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceSortBy, setInvoiceSortBy] = useState<'date' | 'amount' | 'invoice_number'>('date');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Payment filtering and sorting state
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentSortBy, setPaymentSortBy] = useState<'date' | 'amount'>('date');
  const [paymentSortOrder, setPaymentSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadDistributors();
    loadPrimaryExecutives();
  }, []);

  const loadDistributors = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/distributors', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setDistributors(data.distributors);
      } else {
        toast.error('Failed to load Distributors');
      }
    } catch (error) {
      console.error('Error loading Distributors:', error);
      toast.error('Failed to load Distributors');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPrimaryExecutives = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const pes = data.users
          .filter((u: { role: string; approval_status: string }) => 
            u.role === 'PrimaryExecutive' && u.approval_status === 'approved'
          )
          .map((u: { id: string; _id?: string; name: string; email: string }) => ({
            _id: u._id || u.id,
            name: u.name,
            email: u.email,
          }));
        setPrimaryExecutives(pes);
      }
    } catch (error) {
      console.error('Error loading primary executives:', error);
    }
  };

  const loadDistributorTransactions = async (DistributorId: string) => {
    try {
      setisLoadingTransactions(true);
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/distributors/${DistributorId}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setDistributorTransactions(data);
      } else {
        toast.error('Failed to load distributor transactions');
        console.error('Transaction load error:', data);
      }
    } catch (error) {
      console.error('Error loading distributor transactions:', error);
      toast.error('Failed to load distributor transactions');
    } finally {
      setisLoadingTransactions(false);
    }
  };

  const createDistributor = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/distributors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Distributor created successfully');
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        loadDistributors();
      } else {
        toast.error(data.error || 'Failed to create Distributor');
      }
    } catch (error) {
      console.error('Error creating Distributor:', error);
      toast.error('Failed to create Distributor');
    }
  };

  const updateDistributor = async (DistributorId: string, updates: Partial<DistributorFormData>) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/distributors/${DistributorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Distributor updated successfully');
        loadDistributors();
      } else {
        toast.error(data.error || 'Failed to update Distributor');
      }
    } catch (error) {
      console.error('Error updating Distributor:', error);
      toast.error('Failed to update Distributor');
    }
  };

  const deleteDistributor = async (distributor: Distributor) => {
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/distributors/${distributor._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Distributor "${distributor.name}" removed successfully`);
        loadDistributors();
      } else {
        toast.error(data.error || 'Failed to remove distributor');
      }
    } catch (error) {
      console.error('Error deleting distributor:', error);
      toast.error('Failed to remove distributor');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Download individual distributor report with all transactions as Excel
  const downloadDistributorReport = async () => {
    if (!selectedDistributor || !DistributorTransactions) {
      toast.error('No distributor data available to download');
      return;
    }

    const distributor = selectedDistributor;
    const summary = DistributorTransactions.summary;
    const transactions = DistributorTransactions.transactions;

    // Dynamically import xlsx for bundle optimization
    const XLSX = await import('xlsx');

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: distributor Information & Summary
    const distributorInfoData: (string | number)[][] = [
      ['Distributor TRANSACTION REPORT'],
      ['Generated on:', new Date().toLocaleString('en-IN')],
      [],
      ['Distributor INFORMATION'],
      ['Name:', distributor.name],
      ['Phone:', distributor.phone],
    ];

    if (distributor.email) distributorInfoData.push(['Email:', distributor.email]);
    if (distributor.business_name) distributorInfoData.push(['Business Name:', distributor.business_name]);
    distributorInfoData.push(['Business Type:', distributor.business_type]);
    if (distributor.address) distributorInfoData.push(['Address:', distributor.address]);
    if (distributor.city && distributor.state) {
      distributorInfoData.push(['City:', distributor.city]);
      distributorInfoData.push(['State:', distributor.state]);
      distributorInfoData.push(['Pincode:', distributor.pincode || '']);
    }
    if (distributor.gstin) distributorInfoData.push(['GSTIN:', distributor.gstin]);
    if (distributor.pan) distributorInfoData.push(['PAN:', distributor.pan]);
    distributorInfoData.push(['Credit Limit:', `₹${distributor.credit_limit.toLocaleString('en-IN')}`]);
    distributorInfoData.push(['Credit Days:', `${distributor.credit_days} days`]);
    distributorInfoData.push(['Status:', distributor.status]);
    
    distributorInfoData.push([]);
    distributorInfoData.push(['TRANSACTION SUMMARY']);
    distributorInfoData.push(['Total Invoices:', summary.total_invoices]);
    distributorInfoData.push(['Total Invoice Amount:', `₹${summary.total_invoice_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    distributorInfoData.push(['Total Paid Amount:', `₹${summary.total_paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    distributorInfoData.push(['Total Outstanding/Due:', `₹${summary.total_due_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    distributorInfoData.push(['Payment Count:', summary.payment_count]);
    distributorInfoData.push(['Paid Invoices:', summary.paid_invoices]);
    distributorInfoData.push(['Pending Invoices:', summary.pending_invoices]);
    distributorInfoData.push(['Partial Invoices:', summary.partial_invoices]);
    distributorInfoData.push(['Overdue Invoices:', summary.overdue_invoices]);

    const distributorInfoSheet = XLSX.utils.aoa_to_sheet(distributorInfoData);
    
    // Set column widths for better readability
    distributorInfoSheet['!cols'] = [
      { wch: 25 },
      { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(workbook, distributorInfoSheet, 'Distributor Info');

    // Sheet 2: Invoices
    if (transactions.invoices && transactions.invoices.length > 0) {
      const invoiceData: (string | number)[][] = [
        ['INVOICE DETAILS'],
        [],
        ['Invoice Number', 'Invoice Date', 'Total Amount', 'Paid Amount', 'Balance Due', 'Payment Status', 'Status']
      ];

      transactions.invoices.forEach(invoice => {
        invoiceData.push([
          invoice.invoice_number,
          new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
          invoice.grand_total,
          invoice.paid_amount,
          invoice.balance_due,
          invoice.payment_status,
          invoice.status
        ]);
      });

      const invoiceSheet = XLSX.utils.aoa_to_sheet(invoiceData);
      
      // Set column widths
      invoiceSheet['!cols'] = [
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 }
      ];

      XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoices');
    }

    // Sheet 3: Invoice Items Breakdown
    if (transactions.invoices && transactions.invoices.length > 0) {
      const invoiceItemsData: (string | number)[][] = [
        ['INVOICE ITEMS BREAKDOWN'],
        [],
        ['Invoice Number', 'Product Name', 'Quantity', 'Unit Price', 'Total Amount']
      ];

      transactions.invoices.forEach(invoice => {
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach(item => {
            invoiceItemsData.push([
              invoice.invoice_number,
              item.product_name,
              item.quantity,
              item.unit_price,
              item.total_amount
            ]);
          });
        }
      });

      const invoiceItemsSheet = XLSX.utils.aoa_to_sheet(invoiceItemsData);
      
      // Set column widths
      invoiceItemsSheet['!cols'] = [
        { wch: 18 },
        { wch: 30 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(workbook, invoiceItemsSheet, 'Invoice Items');
    }

    // Sheet 4: Payments
    if (transactions.payments && transactions.payments.length > 0) {
      const paymentData: (string | number)[][] = [
        ['PAYMENT DETAILS'],
        [],
        ['Payment Date', 'Amount Paid', 'Payment Method', 'Reference Number', 'Invoice Number', 'Notes']
      ];

      transactions.payments.forEach(payment => {
        paymentData.push([
          new Date(payment.payment_date).toLocaleDateString('en-IN'),
          payment.amount,
          payment.payment_method,
          payment.reference_number || 'N/A',
          payment.invoice_id?.invoice_number || 'N/A',
          payment.notes || 'N/A'
        ]);
      });

      const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
      
      // Set column widths
      paymentSheet['!cols'] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 20 },
        { wch: 18 },
        { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payments');
    }

    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${distributor.name.replace(/\s+/g, '_')}_transaction_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Transaction report downloaded for ${distributor.name}`);
  };

  // Filter and sort invoices
  const getFilteredAndSortedInvoices = () => {
    if (!DistributorTransactions?.transactions?.invoices) return [];
    
    const filtered = [...DistributorTransactions.transactions.invoices].filter((invoice) => {
      const matchesSearch = invoiceSearchTerm === '' || 
        invoice.invoice_number.toLowerCase().includes(invoiceSearchTerm.toLowerCase());
      
      const matchesStatus = invoiceStatusFilter === 'all' || 
        invoice.payment_status === invoiceStatusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort invoices
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (invoiceSortBy) {
        case 'date':
          comparison = new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime();
          break;
        case 'amount':
          comparison = (a.grand_total || 0) - (b.grand_total || 0);
          break;
        case 'invoice_number':
          comparison = a.invoice_number.localeCompare(b.invoice_number);
          break;
      }
      
      return invoiceSortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  // Filter and sort payments
  const getFilteredAndSortedPayments = () => {
    if (!DistributorTransactions?.transactions?.payments) return [];
    
    const filtered = [...DistributorTransactions.transactions.payments].filter((payment) => {
      const matchesSearch = paymentSearchTerm === '' || 
        payment.invoice_id?.invoice_number?.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
        payment.reference_number?.toLowerCase().includes(paymentSearchTerm.toLowerCase());
      
      const matchesMethod = paymentMethodFilter === 'all' || 
        payment.payment_method === paymentMethodFilter;
      
      return matchesSearch && matchesMethod;
    });

    // Sort payments
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (paymentSortBy) {
        case 'date':
          comparison = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
          break;
        case 'amount':
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
      }
      
      return paymentSortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {status}
      </Badge>
    );
  };

  const getBusinessTypeBadge = (type: string) => {
    const styles = {
      Individual: 'bg-blue-100 text-blue-800',
      Partnership: 'bg-purple-100 text-purple-800',
      Company: 'bg-orange-100 text-orange-800',
      LLP: 'bg-green-100 text-green-800',
    };
    return <Badge className={styles[type as keyof typeof styles]}>{type}</Badge>;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDistributor) {
      updateDistributor(editingDistributor._id, formData);
      seteditingDistributor(null);
    } else {
      createDistributor();
    }
  };

  const openEditDialog = (dist: Distributor) => {
    seteditingDistributor(dist);
    setFormData({
      name: dist.name,
      email: dist.email || '',
      phone: dist.phone,
      address: dist.address || '',
      city: dist.city || '',
      state: dist.state || '',
      pincode: dist.pincode || '',
      gstin: dist.gstin || '',
      pan: dist.pan || '',
      business_name: dist.business_name || '',
      business_type: dist.business_type,
      credit_limit: dist.credit_limit,
      credit_days: dist.credit_days,
      status: dist.status,
      notes: dist.notes || '',
      pe_id: dist.pe_id || '',
    });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    seteditingDistributor(null);
  };

  const filteredDistributors = distributors.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.email && d.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      d.phone.includes(searchTerm) ||
      (d.business_name && d.business_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || d.status.toLowerCase() === statusFilter;
    const matchesState = stateFilter === 'all' || (d.state && d.state.toLowerCase() === stateFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesState;
  });

  const uniqueStates = [...new Set(distributors.map(c => c.state).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">distributor Management</h1>
            <p className="text-gray-600 text-sm mt-1">Manage your distributor database and relationships</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            size="sm"
            className="w-fit"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Distributor
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Distributors</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{distributors.length}</div>
              <p className="text-xs text-gray-600">Registered Distributors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Distributors</CardTitle>
              <Building className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {distributors.filter(c => c.status === 'Active').length}
              </div>
              <p className="text-xs text-gray-600">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST Registered</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {distributors.filter(c => c.gstin).length}
              </div>
              <p className="text-xs text-gray-600">With GSTIN</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credit Limit</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{distributors.reduce((sum, c) => sum + c.credit_limit, 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">Total credit offered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search Distributors by name, email, phone, or business..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-48">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state!.toLowerCase()}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadDistributors}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Distributors Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Distributors</span>
            </CardTitle>
            <CardDescription>
              Complete distributor database with business information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Distributors...</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Primary Executive</TableHead>
                    <TableHead className="hidden lg:table-cell">Business</TableHead>
                    <TableHead className="hidden xl:table-cell">Location</TableHead>
                    <TableHead className="hidden xl:table-cell">GST Info</TableHead>
                    <TableHead className="hidden md:table-cell">Credit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributors.map((dist) => (
                    <TableRow key={dist._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dist.name}</div>
                          <div className="text-sm text-gray-600">{dist.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {dist.phone}
                          </div>
                          {dist.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1" />
                              {dist.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {dist.pe_id ? (
                            <span className="font-medium">
                              {primaryExecutives.find(pe => pe._id === dist.pe_id)?.name || 'Assigned'}
                            </span>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div>
                          {dist.business_name && (
                            <div className="font-medium">{dist.business_name}</div>
                          )}
                          {getBusinessTypeBadge(dist.business_type)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="text-sm">
                          {dist.city && dist.state ? (
                            <>
                              <div>{dist.city}</div>
                              <div className="text-gray-600">{dist.state} - {dist.pincode}</div>
                            </>
                          ) : (
                            <span className="text-gray-400">Not provided</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="text-sm">
                          {dist.gstin ? (
                            <>
                              <div className="font-medium">GSTIN: {dist.gstin}</div>
                              {dist.pan && <div className="text-gray-600">PAN: {dist.pan}</div>}
                            </>
                          ) : (
                            <span className="text-gray-400">Not registered</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          <div>₹{dist.credit_limit.toLocaleString()}</div>
                          <div className="text-gray-600">{dist.credit_days} days</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          {dist.outstanding_balance !== undefined ? (
                            <>
                              <div className={`font-semibold ${
                                dist.outstanding_balance > 0 
                                  ? 'text-orange-600' 
                                  : 'text-green-600'
                              }`}>
                                ₹{dist.outstanding_balance.toLocaleString()}
                              </div>
                              {dist.outstanding_balance > dist.credit_limit && (
                                <div className="text-xs text-red-600">Over limit!</div>
                              )}
                            </>
                          ) : (
                            <div className="text-gray-400">-</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getStatusBadge(dist.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setselectedDistributor(dist);
                              setDistributorTransactions(null);
                              setInvoiceSearchTerm('');
                              setInvoiceStatusFilter('all');
                              setInvoiceSortBy('date');
                              setInvoiceSortOrder('desc');
                              setPaymentSearchTerm('');
                              setPaymentMethodFilter('all');
                              setPaymentSortBy('date');
                              setPaymentSortOrder('desc');
                              setIsViewDialogOpen(true);
                              loadDistributorTransactions(dist._id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(dist)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(dist)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit distributor Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDistributor ? 'Edit Distributor' : 'Add New Distributor'}
              </DialogTitle>
              <DialogDescription>
                {editingDistributor ? 'Update distributor information' : 'Create a new distributor record'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">distributor Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pe_id">Assigned Primary Executive</Label>
                    <Select 
                      value={formData.pe_id || 'none'} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, pe_id: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select PE (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No PE Assigned —</SelectItem>
                        {primaryExecutives.map((pe) => (
                          <SelectItem key={pe._id} value={pe._id}>
                            {pe.name} ({pe.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Address Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business & Tax Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Business & Tax Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_type">Business Type</Label>
                    <Select 
                      value={formData.business_type} 
                      onValueChange={(value: 'Individual' | 'Partnership' | 'Company' | 'LLP') => setFormData(prev => ({ ...prev, business_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="Company">Company</SelectItem>
                        <SelectItem value="LLP">LLP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: 'Active' | 'Inactive') => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value }))}
                      placeholder="15 digit GST number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN</Label>
                    <Input
                      id="pan"
                      value={formData.pan}
                      onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value }))}
                      placeholder="10 digit PAN number"
                    />
                  </div>
                </div>
              </div>

              {/* Credit Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Credit Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit_days">Credit Days</Label>
                    <Input
                      id="credit_days"
                      type="number"
                      value={formData.credit_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, credit_days: parseInt(e.target.value) || 30 }))}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-medium mb-4">Additional Notes</h3>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional information about the Distributor..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="">
                  {editingDistributor ? 'Update Distributor' : 'Create Distributor'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View distributor Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>distributor Details & Transaction History</DialogTitle>
                  <DialogDescription>
                    Complete distributor information and all transaction details
                  </DialogDescription>
                </div>
                {DistributorTransactions && (
                  <Button
                    onClick={downloadDistributorReport}
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report (Excel)
                  </Button>
                )}
              </div>
            </DialogHeader>
            
            {selectedDistributor && (
              <div className="space-y-6">
                {/* distributor Basic Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedDistributor.name}</p>
                      <p><strong>Phone:</strong> {selectedDistributor.phone}</p>
                      {selectedDistributor.email && <p><strong>Email:</strong> {selectedDistributor.email}</p>}
                      {selectedDistributor.business_name && <p><strong>Business:</strong> {selectedDistributor.business_name}</p>}
                      <p><strong>Type:</strong> {getBusinessTypeBadge(selectedDistributor.business_type)}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedDistributor.status)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Address</h3>
                    <div className="space-y-2">
                      {selectedDistributor.address && <p>{selectedDistributor.address}</p>}
                      {selectedDistributor.city && selectedDistributor.state && (
                        <p>{selectedDistributor.city}, {selectedDistributor.state} - {selectedDistributor.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Tax Information</h3>
                    <div className="space-y-2">
                      {selectedDistributor.gstin ? (
                        <p><strong>GSTIN:</strong> {selectedDistributor.gstin}</p>
                      ) : (
                        <p className="text-gray-500">Not GST registered</p>
                      )}
                      {selectedDistributor.pan && <p><strong>PAN:</strong> {selectedDistributor.pan}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Credit Information</h3>
                    <div className="space-y-2">
                      <p><strong>Credit Limit:</strong> ₹{selectedDistributor.credit_limit.toLocaleString()}</p>
                      <p><strong>Credit Days:</strong> {selectedDistributor.credit_days} days</p>
                    </div>
                  </div>
                </div>

                {selectedDistributor.notes && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Notes</h3>
                    <p className="text-gray-700">{selectedDistributor.notes}</p>
                  </div>
                )}

                {/* Outstanding Balance Highlight */}
                {DistributorTransactions && (
                  <div className="border-2 border-orange-300 bg-orange-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">Outstanding Balance</h3>
                        <p className="text-sm text-gray-600">Total amount pending payment</p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-orange-600">
                          ₹{(DistributorTransactions.summary.total_due_amount || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          From {DistributorTransactions.summary.total_invoices} invoice(s)
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-orange-200">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Billed</p>
                        <p className="text-lg font-semibold text-gray-700">
                          ₹{(DistributorTransactions.summary.total_invoice_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">
                          Total Paid ({DistributorTransactions.summary.payment_count || 0} payment{(DistributorTransactions.summary.payment_count || 0) !== 1 ? 's' : ''})
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{(DistributorTransactions.summary.total_paid_amount || 0).toLocaleString()}
                        </p>
                        {DistributorTransactions.summary.total_payment_records !== undefined && 
                         Math.abs((DistributorTransactions.summary.total_paid_amount || 0) - (DistributorTransactions.summary.total_payment_records || 0)) > 0.01 && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Mismatch with records
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Payment Rate</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {DistributorTransactions.summary.total_invoice_amount > 0 
                            ? Math.round((DistributorTransactions.summary.total_paid_amount / DistributorTransactions.summary.total_invoice_amount) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction Summary */}
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-600">Loading transaction history...</span>
                  </div>
                ) : DistributorTransactions && (
                  <>
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-lg mb-4 flex items-center">
                        <Receipt className="h-5 w-5 mr-2" />
                        Transaction Summary
                      </h3>
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">Total Invoices</p>
                                <p className="text-2xl font-bold">{DistributorTransactions.summary.total_invoices}</p>
                              </div>
                              <Receipt className="h-8 w-8 text-blue-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold text-blue-600">₹{(DistributorTransactions.summary.total_invoice_amount || 0).toLocaleString()}</p>
                              </div>
                              <IndianRupee className="h-8 w-8 text-blue-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">Paid Amount</p>
                                <p className="text-2xl font-bold text-green-600">₹{(DistributorTransactions.summary.total_paid_amount || 0).toLocaleString()}</p>
                              </div>
                              <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">Due Amount</p>
                                <p className="text-2xl font-bold text-red-600">₹{(DistributorTransactions.summary.total_due_amount || 0).toLocaleString()}</p>
                              </div>
                              <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Payment Status Breakdown */}
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">Paid Invoices</p>
                          <p className="text-xl font-semibold text-green-700">{DistributorTransactions.summary.paid_invoices}</p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">Partial Payment</p>
                          <p className="text-xl font-semibold text-yellow-700">{DistributorTransactions.summary.partial_invoices}</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="text-xl font-semibold text-orange-700">{DistributorTransactions.summary.pending_invoices}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">Overdue</p>
                          <p className="text-xl font-semibold text-red-700">{DistributorTransactions.summary.overdue_invoices}</p>
                        </div>
                      </div>
                    </div>

                    {/* Invoices Table */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Invoice History</h3>
                        <div className="flex gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search invoice..."
                              value={invoiceSearchTerm}
                              onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                              className="pl-10 w-48"
                            />
                          </div>
                          <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="Paid">Paid</SelectItem>
                              <SelectItem value="Partial">Partial</SelectItem>
                              <SelectItem value="Pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={invoiceSortBy} onValueChange={(value) => setInvoiceSortBy(value as 'date' | 'amount' | 'invoice_number')}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="amount">Amount</SelectItem>
                              <SelectItem value="invoice_number">Invoice #</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc')}
                            title={invoiceSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                          >
                            {invoiceSortOrder === 'asc' ? '↑' : '↓'}
                          </Button>
                        </div>
                      </div>
                      {getFilteredAndSortedInvoices().length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead className="text-right">Due</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredAndSortedInvoices().map((invoice) => (
                                <TableRow key={invoice._id}>
                                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                      {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {(invoice.items || []).slice(0, 2).map((item, idx) => (
                                        <div key={idx} className="text-gray-600">
                                          {item.product_name} ({item.quantity})
                                        </div>
                                      ))}
                                      {(invoice.items || []).length > 2 && (
                                        <div className="text-xs text-gray-400">
                                          +{invoice.items.length - 2} more
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">₹{(invoice.grand_total || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-green-600">₹{(invoice.paid_amount || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-red-600">₹{(invoice.balance_due || 0).toLocaleString()}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        invoice.payment_status === 'Paid' ? 'default' :
                                        invoice.payment_status === 'Partial' ? 'secondary' : 'destructive'
                                      }
                                    >
                                      {invoice.payment_status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">No invoices found for this Distributor</p>
                      )}
                    </div>

                    {/* Payments Table */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Payment History ({DistributorTransactions.summary.payment_count || 0} payments)</h3>
                        <div className="flex gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search payment..."
                            value={paymentSearchTerm}
                            onChange={(e) => setPaymentSearchTerm(e.target.value)}
                            className="pl-10 w-48"
                          />
                        </div>
                          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Methods</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={paymentSortBy} onValueChange={(value) => setPaymentSortBy(value as 'date' | 'amount')}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="amount">Amount</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPaymentSortOrder(paymentSortOrder === 'asc' ? 'desc' : 'asc')}
                            title={paymentSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                          >
                            {paymentSortOrder === 'asc' ? '↑' : '↓'}
                          </Button>
                        </div>
                      </div>
                      {getFilteredAndSortedPayments().length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredAndSortedPayments().map((payment) => (
                                <TableRow key={payment._id}>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                      {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {payment.invoice_id?.invoice_number || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{payment.payment_method}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {payment.reference_number || '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-600">
                                    ₹{(payment.amount || 0).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {payment.notes || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">No payments found</p>
                      )}
                    </div>
                  </>
                )}

                <div className="text-sm text-gray-500 border-t pt-4">
                  <p>distributor since: {new Date(selectedDistributor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Distributor</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{deleteTarget?.name}</strong>?
                This will deactivate the distributor. They will no longer appear in active lists,
                but their transaction history will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteDistributor(deleteTarget)}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? 'Removing...' : 'Remove Distributor'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
