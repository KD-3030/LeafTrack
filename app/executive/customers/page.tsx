'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Distributor {
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
  approval_status?: string;
  outstanding_balance: number;
  pe_id?: string;
  created_at?: string;
}

export default function ExecutiveDistributorsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingDistributor, setAddingDistributor] = useState(false);

  const [newDistributor, setNewDistributor] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '',
    pincode: '', gstin: '', business_name: '', business_type: 'Distributor',
    notes: '',
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

      const res = await fetch('/api/distributors', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (Array.isArray(data)) {
        setDistributors(data);
      } else if (data.success && Array.isArray(data.distributors)) {
        setDistributors(data.distributors);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDistributor = async () => {
    if (!newDistributor.name || !newDistributor.phone) {
      toast.error('Name and phone are required');
      return;
    }
    setAddingDistributor(true);
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/distributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newDistributor),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Distributor added successfully');
        setShowAddDialog(false);
        setNewDistributor({
          name: '', phone: '', email: '', address: '', city: '', state: '',
          pincode: '', gstin: '', business_name: '', business_type: 'Distributor',
          notes: '',
        });
        loadData();
      } else {
        toast.error(data.error || 'Failed to add distributor');
      }
    } catch (error) {
      console.error('Error adding distributor:', error);
      toast.error('Failed to add distributor');
    } finally {
      setAddingDistributor(false);
    }
  };

  const filteredDistributors = distributors.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.includes(searchTerm) ||
    (d.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading distributors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Distributors</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage distributors assigned to your territory</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-brand-600 hover:bg-brand-700">
              <Plus className="mr-2 h-4 w-4" />Add Distributor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Distributor</DialogTitle>
              <DialogDescription>Add a distributor to your territory</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={newDistributor.name} onChange={(e) => setNewDistributor({...newDistributor, name: e.target.value})} placeholder="Distributor name" /></div>
                <div><Label>Phone *</Label><Input value={newDistributor.phone} onChange={(e) => setNewDistributor({...newDistributor, phone: e.target.value})} placeholder="+91 98765 43210" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={newDistributor.email} onChange={(e) => setNewDistributor({...newDistributor, email: e.target.value})} placeholder="email@example.com" /></div>
                <div><Label>Business Name</Label><Input value={newDistributor.business_name} onChange={(e) => setNewDistributor({...newDistributor, business_name: e.target.value})} placeholder="Business name" /></div>
              </div>
              <div><Label>Address</Label><Textarea value={newDistributor.address} onChange={(e) => setNewDistributor({...newDistributor, address: e.target.value})} placeholder="Full address" rows={2} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>City</Label><Input value={newDistributor.city} onChange={(e) => setNewDistributor({...newDistributor, city: e.target.value})} placeholder="City" /></div>
                <div><Label>State</Label><Input value={newDistributor.state} onChange={(e) => setNewDistributor({...newDistributor, state: e.target.value})} placeholder="State" /></div>
                <div><Label>Pincode</Label><Input value={newDistributor.pincode} onChange={(e) => setNewDistributor({...newDistributor, pincode: e.target.value})} placeholder="000000" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>GSTIN</Label><Input value={newDistributor.gstin} onChange={(e) => setNewDistributor({...newDistributor, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" /></div>
                <div>
                  <Label>Business Type</Label>
                  <Select value={newDistributor.business_type} onValueChange={(v) => setNewDistributor({...newDistributor, business_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Distributor">Distributor</SelectItem>
                      <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                      <SelectItem value="Retailer">Retailer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={newDistributor.notes} onChange={(e) => setNewDistributor({...newDistributor, notes: e.target.value})} placeholder="Internal notes..." rows={2} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddDistributor} disabled={addingDistributor} className="bg-brand-600 hover:bg-brand-700">
                  {addingDistributor ? 'Adding...' : 'Add Distributor'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle><UserCheck className="h-4 w-4 text-brand-600" /></CardHeader><CardContent><div className="text-2xl font-semibold">{distributors.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle><UserCheck className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-semibold text-green-600">{distributors.filter(d => d.status === 'Active').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle><IndianRupee className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-semibold text-amber-600">{'\u20B9'}{distributors.reduce((s, d) => s + (d.outstanding_balance || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Businesses</CardTitle><Building2 className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-semibold">{distributors.filter(d => d.business_name).length}</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, business, city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="pt-6">
          {filteredDistributors.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-medium">{searchTerm ? 'No matching distributors' : 'No distributors yet'}</h3>
              <p className="text-sm text-muted-foreground mt-1">{searchTerm ? 'Try a different search' : 'Add your first distributor to get started'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Distributor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDistributors.map((dist) => (
                  <TableRow key={dist._id}>
                    <TableCell>
                      <div className="font-medium">{dist.name}</div>
                      {dist.business_name && <div className="text-xs text-muted-foreground">{dist.business_name}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-muted-foreground" />{dist.phone}</div>
                        {dist.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{dist.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(dist.city || dist.state) ? (
                        <div className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-muted-foreground" />{[dist.city, dist.state].filter(Boolean).join(', ')}</div>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{dist.business_type || 'Distributor'}</Badge></TableCell>
                    <TableCell>
                      {(dist.outstanding_balance || 0) > 0
                        ? <span className="text-sm font-medium text-amber-600">{'\u20B9'}{dist.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        : <span className="text-sm text-green-600">Clear</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={dist.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600'}>{dist.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
