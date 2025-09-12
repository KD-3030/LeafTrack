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
  RefreshCw,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard
} from 'lucide-react';
// import { useAuth } from '@/contexts/AuthContext'; // Removed unused import
import { toast } from 'sonner';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
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
  createdAt: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
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
}

const initialFormData: CustomerFormData = {
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
};

export default function CustomersPage() {
  // const { user } = useAuth(); // Removed unused variable
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      } else {
        toast.error('Failed to load customers');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomer = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Customer created successfully');
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        loadCustomers();
      } else {
        toast.error(data.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  };

  const updateCustomer = async (customerId: string, updates: Partial<CustomerFormData>) => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Customer updated successfully');
        loadCustomers();
      } else {
        toast.error(data.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    }
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
    if (editingCustomer) {
      updateCustomer(editingCustomer._id, formData);
      setEditingCustomer(null);
    } else {
      createCustomer();
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      gstin: customer.gstin || '',
      pan: customer.pan || '',
      business_name: customer.business_name || '',
      business_type: customer.business_type,
      credit_limit: customer.credit_limit,
      credit_days: customer.credit_days,
      status: customer.status,
      notes: customer.notes || '',
    });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.business_name && customer.business_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || customer.status.toLowerCase() === statusFilter;
    const matchesState = stateFilter === 'all' || (customer.state && customer.state.toLowerCase() === stateFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesState;
  });

  const uniqueStates = [...new Set(customers.map(c => c.state).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage your customer database and relationships</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-gray-600">Registered customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Building className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers.filter(c => c.status === 'Active').length}
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
                {customers.filter(c => c.gstin).length}
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
                ₹{customers.reduce((sum, c) => sum + c.credit_limit, 0).toLocaleString()}
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
                    placeholder="Search customers by name, email, phone, or business..."
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
              <Button variant="outline" onClick={loadCustomers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Customers</span>
            </CardTitle>
            <CardDescription>
              Complete customer database with business information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading customers...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>GST Info</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" />
                              {customer.phone}
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {customer.business_name && (
                            <div className="font-medium">{customer.business_name}</div>
                          )}
                          {getBusinessTypeBadge(customer.business_type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.city && customer.state ? (
                            <>
                              <div>{customer.city}</div>
                              <div className="text-gray-600">{customer.state} - {customer.pincode}</div>
                            </>
                          ) : (
                            <span className="text-gray-400">Not provided</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.gstin ? (
                            <>
                              <div className="font-medium">GSTIN: {customer.gstin}</div>
                              {customer.pan && <div className="text-gray-600">PAN: {customer.pan}</div>}
                            </>
                          ) : (
                            <span className="text-gray-400">Not registered</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>₹{customer.credit_limit.toLocaleString()}</div>
                          <div className="text-gray-600">{customer.credit_days} days</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(customer.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Customer Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? 'Update customer information' : 'Create a new customer record'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Customer Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
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
                  <div className="grid grid-cols-3 gap-4">
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
                    placeholder="Any additional information about the customer..."
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
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Customer Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>
            
            {selectedCustomer && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedCustomer.name}</p>
                      <p><strong>Email:</strong> {selectedCustomer.email}</p>
                      {selectedCustomer.phone && <p><strong>Phone:</strong> {selectedCustomer.phone}</p>}
                      {selectedCustomer.business_name && <p><strong>Business:</strong> {selectedCustomer.business_name}</p>}
                      <p><strong>Type:</strong> {getBusinessTypeBadge(selectedCustomer.business_type)}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedCustomer.status)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Address</h3>
                    <div className="space-y-2">
                      {selectedCustomer.address && <p>{selectedCustomer.address}</p>}
                      {selectedCustomer.city && selectedCustomer.state && (
                        <p>{selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Tax Information</h3>
                    <div className="space-y-2">
                      {selectedCustomer.gstin ? (
                        <p><strong>GSTIN:</strong> {selectedCustomer.gstin}</p>
                      ) : (
                        <p className="text-gray-500">Not GST registered</p>
                      )}
                      {selectedCustomer.pan && <p><strong>PAN:</strong> {selectedCustomer.pan}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Credit Information</h3>
                    <div className="space-y-2">
                      <p><strong>Credit Limit:</strong> ₹{selectedCustomer.credit_limit.toLocaleString()}</p>
                      <p><strong>Credit Days:</strong> {selectedCustomer.credit_days} days</p>
                    </div>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Notes</h3>
                    <p className="text-gray-700">{selectedCustomer.notes}</p>
                  </div>
                )}

                <div className="text-sm text-gray-500 border-t pt-4">
                  <p>Customer since: {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
