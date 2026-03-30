'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, UserCheck, MapPin, Phone, Mail, Building2, IndianRupee } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  business_name?: string;
  business_type?: string;
  status: string;
  outstanding_balance: number;
  secondary_executive_id?: string;
  created_at?: string;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
}

export default function ExecutiveCustomersPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);

  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '',
    pincode: '', gstin: '', business_name: '', business_type: 'Individual',
    secondary_executive_id: '', notes: '',
  });

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('leaftrack_token');
      if (!token) throw new Error('No authentication token found.');

      const [custRes, teamRes] = await Promise.all([
        fetch('/api/customers?limit=200', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users/team', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const custData = await custRes.json();
      const teamData = await teamRes.json();

      if (custData.success) setCustomers(custData.customers || []);
      if (teamData.success) setTeam(teamData.team || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Name and phone are required');
      return;
    }

    setAddingCustomer(true);
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCustomer),
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Customer added successfully');
        setShowAddDialog(false);
        setNewCustomer({
          name: '', phone: '', email: '', address: '', city: '', state: '',
          pincode: '', gstin: '', business_name: '', business_type: 'Individual',
          secondary_executive_id: '', notes: '',
        });
        loadData();
      } else {
        toast.error(data.error || 'Failed to add customer');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const teamMap = new Map(team.map(t => [t._id, t]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage customers assigned to your territory</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-brand-600 hover:bg-brand-700">
              <Plus className="mr-2 h-4 w-4" />Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>Add a customer to your territory</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Customer name" />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>Business Name</Label>
                  <Input value={newCustomer.business_name} onChange={(e) => setNewCustomer({...newCustomer, business_name: e.target.value})} placeholder="Business name" />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea value={newCustomer.address} onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Full address" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={newCustomer.city} onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})} placeholder="City" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={newCustomer.state} onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})} placeholder="State" />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input value={newCustomer.pincode} onChange={(e) => setNewCustomer({...newCustomer, pincode: e.target.value})} placeholder="000000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GSTIN</Label>
                  <Input value={newCustomer.gstin} onChange={(e) => setNewCustomer({...newCustomer, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <Label>Business Type</Label>
                  <Select value={newCustomer.business_type} onValueChange={(v) => setNewCustomer({...newCustomer, business_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Retailer">Retailer</SelectItem>
                      <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                      <SelectItem value="Distributor">Distributor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {team.length > 0 && (
                <div>
                  <Label>Assign to Secondary Executive (Optional)</Label>
                  <Select
                    value={newCustomer.secondary_executive_id}
                    onValueChange={(v) => setNewCustomer({...newCustomer, secondary_executive_id: v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose a team member..." /></SelectTrigger>
                    <SelectContent>
                      {team.map(t => (
                        <SelectItem key={t._id} value={t._id}>{t.name} ({t.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Notes</Label>
                <Textarea value={newCustomer.notes} onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})} placeholder="Internal notes..." rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddCustomer} disabled={addingCustomer} className="bg-brand-600 hover:bg-brand-700">
                  {addingCustomer ? 'Adding...' : 'Add Customer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <UserCheck className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{customers.filter(c => c.status === 'Active').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-600">
              ₹{customers.reduce((s, c) => s + (c.outstanding_balance || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{customers.filter(c => c.business_type && c.business_type !== 'Individual').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, business, city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-medium">{searchTerm ? 'No matching customers' : 'No customers yet'}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? 'Try a different search' : 'Add your first customer to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned SE</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const assignedSE = customer.secondary_executive_id ? teamMap.get(customer.secondary_executive_id) : null;
                  return (
                    <TableRow key={customer._id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        {customer.business_name && (
                          <div className="text-xs text-muted-foreground">{customer.business_name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />{customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />{customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(customer.city || customer.state) ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {[customer.city, customer.state].filter(Boolean).join(', ')}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{customer.business_type || 'Individual'}</Badge>
                      </TableCell>
                      <TableCell>
                        {assignedSE ? (
                          <span className="text-sm">{assignedSE.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.outstanding_balance > 0 ? (
                          <span className="text-sm font-medium text-amber-600">
                            ₹{customer.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">Clear</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                          {customer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
