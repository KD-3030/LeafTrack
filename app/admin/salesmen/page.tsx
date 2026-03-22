'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  CheckCircle,
  Copy,
  Link2,
  Package,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
  Pencil,
  Trash2,
  Users2,
} from 'lucide-react';
import { normalizeRoleId } from '@/lib/roles';

interface ManagerInfo {
  _id: string;
  name: string;
  email: string;
}

interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  managerId?: string | ManagerInfo | null;
}

interface ProductItem {
  _id: string;
  name: string;
  totalStock: number;
}

interface CustomerItem {
  _id: string;
  name: string;
  phone: string;
  primary_executive_id?: string;
  secondary_executive_id?: string;
}

interface CustomerApiRow {
  _id: string;
  name: string;
  phone: string;
  primary_executive_id?: { toString: () => string } | string;
  secondary_executive_id?: { toString: () => string } | string;
}

const toIdString = (value?: { toString: () => string } | string): string => {
  if (!value) return '';
  return typeof value === 'string' ? value : value.toString();
};

export default function ExecutiveManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [savingStockAssignment, setSavingStockAssignment] = useState(false);

  const [inviteRole, setInviteRole] = useState<'PrimaryExecutive' | 'SecondaryExecutive'>('PrimaryExecutive');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteManagerId, setInviteManagerId] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [rejectionReasonById, setRejectionReasonById] = useState<Record<string, string>>({});

  const [stockPrimaryId, setStockPrimaryId] = useState('');
  const [stockProductId, setStockProductId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockSellingPrice, setStockSellingPrice] = useState('');

  const [customerOwnerPrimaryById, setCustomerOwnerPrimaryById] = useState<Record<string, string>>({});
  const [customerOwnerSecondaryById, setCustomerOwnerSecondaryById] = useState<Record<string, string>>({});

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'PrimaryExecutive' | 'SecondaryExecutive'>('SecondaryExecutive');
  const [editManagerId, setEditManagerId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('leaftrack_token') : null;

  const primaryExecutives = useMemo(
    () => users.filter((u) => normalizeRoleId(u.role) === 'primary_executive' && u.approval_status === 'approved'),
    [users]
  );

  const secondaryExecutives = useMemo(
    () => users.filter((u) => normalizeRoleId(u.role) === 'secondary_executive' && u.approval_status === 'approved'),
    [users]
  );

  const pendingUsers = useMemo(
    () => users.filter((u) => u.approval_status === 'pending'),
    [users]
  );

  const teamByPrimary = useMemo(() => {
    const map = new Map<string, ManagedUser[]>();
    for (const secondary of secondaryExecutives) {
      const managerId = typeof secondary.managerId === 'object' && secondary.managerId
        ? secondary.managerId._id
        : (secondary.managerId || '');
      if (!managerId) continue;
      if (!map.has(managerId)) map.set(managerId, []);
      map.get(managerId)?.push(secondary);
    }
    return map;
  }, [secondaryExecutives]);

  const getManagerName = (user: ManagedUser) => {
    if (!user.managerId) return '-';
    if (typeof user.managerId === 'object') return user.managerId.name;
    const manager = users.find((u) => u._id === user.managerId);
    return manager?.name || '-';
  };

  const loadUsers = async () => {
    const response = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load users');
    setUsers(data.users || []);
  };

  const loadProducts = async () => {
    const response = await fetch('/api/products', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load products');
    setProducts(data.products || []);
  };

  const loadCustomers = async () => {
    const response = await fetch('/api/customers?limit=200', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load customers');

    const rows = (data.customers || []) as CustomerApiRow[];
    const normalizedRows: CustomerItem[] = rows.map((c) => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      primary_executive_id: toIdString(c.primary_executive_id),
      secondary_executive_id: toIdString(c.secondary_executive_id),
    }));

    setCustomers(normalizedRows);

    const primaryMap: Record<string, string> = {};
    const secondaryMap: Record<string, string> = {};
    for (const c of normalizedRows) {
      primaryMap[c._id] = c.primary_executive_id || '';
      secondaryMap[c._id] = c.secondary_executive_id || '';
    }
    setCustomerOwnerPrimaryById(primaryMap);
    setCustomerOwnerSecondaryById(secondaryMap);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUsers(), loadProducts(), loadCustomers()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load executive management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error('Email is required');
      return;
    }
    if (inviteRole === 'SecondaryExecutive' && !inviteManagerId) {
      toast.error('Select primary executive for secondary invitation');
      return;
    }

    try {
      setInviteLoading(true);
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          managerId: inviteRole === 'SecondaryExecutive' ? inviteManagerId : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create invitation');
      }

      const fullLink = `${window.location.origin}${data.inviteLink}`;
      setGeneratedInviteLink(fullLink);
      toast.success('Invitation link created');
      setInviteEmail('');
      setInviteManagerId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!generatedInviteLink) return;
    await navigator.clipboard.writeText(generatedInviteLink);
    toast.success('Invite link copied');
  };

  const approveUser = async (id: string) => {
    const response = await fetch(`/api/users/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      toast.error(data.error || 'Failed to approve user');
      return;
    }
    toast.success('User approved');
    loadAll();
  };

  const rejectUser = async (id: string) => {
    const reason = (rejectionReasonById[id] || '').trim();
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }

    const response = await fetch(`/api/users/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      toast.error(data.error || 'Failed to reject user');
      return;
    }
    toast.success('User rejected');
    loadAll();
  };

  const reassignSecondary = async (secondaryId: string, managerId: string) => {
    const response = await fetch(`/api/users/${secondaryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ managerId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      toast.error(data.error || 'Failed to reassign executive');
      return;
    }
    toast.success('Secondary executive reassigned');
    loadAll();
  };

  const assignStockPool = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockPrimaryId || !stockProductId || !stockQuantity || !stockSellingPrice) {
      toast.error('Please fill all stock assignment fields');
      return;
    }

    try {
      setSavingStockAssignment(true);
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          primaryExecutiveId: stockPrimaryId,
          productId: stockProductId,
          quantity: Number(stockQuantity),
          sellingPricePerUnit: Number(stockSellingPrice),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign stock pool');
      }

      toast.success('Stock pool assigned to primary executive');
      setStockPrimaryId('');
      setStockProductId('');
      setStockQuantity('');
      setStockSellingPrice('');
      loadProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign stock');
    } finally {
      setSavingStockAssignment(false);
    }
  };

  const assignCustomerOwner = async (customerId: string) => {
    const primaryId = customerOwnerPrimaryById[customerId] || '';
    const secondaryId = customerOwnerSecondaryById[customerId] || '';

    if (!primaryId) {
      toast.error('Primary executive is required for customer ownership');
      return;
    }

    const response = await fetch(`/api/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        primary_executive_id: primaryId,
        secondary_executive_id: secondaryId || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      toast.error(data.error || 'Failed to assign customer ownership');
      return;
    }

    toast.success('Customer ownership updated');
    loadCustomers();
  };

  const openEditDialog = (user: ManagedUser) => {
    const role = normalizeRoleId(user.role) === 'primary_executive' ? 'PrimaryExecutive' : 'SecondaryExecutive';
    const managerId = typeof user.managerId === 'object' && user.managerId ? user.managerId._id : (user.managerId || '');

    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(role);
    setEditManagerId(managerId);
    setEditPassword('');
  };

  const saveEditedUser = async () => {
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (editRole === 'SecondaryExecutive' && !editManagerId) {
      toast.error('Secondary executive requires a primary manager');
      return;
    }

    try {
      setSavingEdit(true);
      const response = await fetch(`/api/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          managerId: editRole === 'SecondaryExecutive' ? editManagerId : undefined,
          password: editPassword.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update executive');
      }

      toast.success('Executive updated successfully');
      setEditingUser(null);
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update executive');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteExecutive = async (user: ManagedUser) => {
    const confirmed = window.confirm(`Delete ${user.name}? This action cannot be undone.`);
    if (!confirmed) return;

    const response = await fetch(`/api/users/${user._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      toast.error(data.error || 'Failed to delete executive');
      return;
    }

    toast.success('Executive deleted successfully');
    loadAll();
  };

  const filteredSecondariesForPrimary = (primaryId: string) => {
    return secondaryExecutives.filter((s) => {
      const managerId = typeof s.managerId === 'object' && s.managerId ? s.managerId._id : (s.managerId || '');
      return managerId === primaryId;
    });
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading executive management...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-green-600" />
            Executive Management
          </h1>
          <p className="text-gray-600 mt-2">Manage hierarchy, assign stock pools and customers, and maintain executive accounts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Primary Executives</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{primaryExecutives.length}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Secondary Executives</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{secondaryExecutives.length}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Pending Approvals</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-yellow-700">{pendingUsers.length}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Customers</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{customers.length}</CardContent></Card>
        </div>

        <Tabs defaultValue="invite">
          <TabsList className="flex flex-wrap h-auto gap-2">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            <TabsTrigger value="stock">Stock Pool</TabsTrigger>
            <TabsTrigger value="customers">Customer Assignment</TabsTrigger>
            <TabsTrigger value="manage">Manage Executives</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-green-600" />Create Invite Link</CardTitle>
                <CardDescription>Invite-only onboarding is enforced. Generate and share invitation links.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <Label>Email</Label>
                    <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="executive@company.com" type="email" required />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v: 'PrimaryExecutive' | 'SecondaryExecutive') => setInviteRole(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PrimaryExecutive">Primary Executive</SelectItem>
                        <SelectItem value="SecondaryExecutive">Secondary Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Primary Manager</Label>
                    <Select value={inviteManagerId} onValueChange={setInviteManagerId} disabled={inviteRole !== 'SecondaryExecutive'}>
                      <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        {primaryExecutives.map((p) => (
                          <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={inviteLoading}>
                      <Link2 className="h-4 w-4 mr-2" />
                      {inviteLoading ? 'Creating...' : 'Generate Invite Link'}
                    </Button>
                  </div>
                </form>

                {generatedInviteLink && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-gray-700 mb-2">Invitation link generated</p>
                    <div className="flex gap-2">
                      <Input value={generatedInviteLink} readOnly />
                      <Button type="button" variant="outline" onClick={copyInviteLink}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-yellow-600" />Approval Queue</CardTitle>
                <CardDescription>Approve or reject invited users after signup completion.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Reject Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((u) => (
                      <TableRow key={u._id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell><Badge>{u.role}</Badge></TableCell>
                        <TableCell>{getManagerName(u)}</TableCell>
                        <TableCell>
                          <Input
                            placeholder="Reason for rejection"
                            value={rejectionReasonById[u._id] || ''}
                            onChange={(e) => setRejectionReasonById((prev) => ({ ...prev, [u._id]: e.target.value }))}
                          />
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => approveUser(u._id)} className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectUser(u._id)}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">No pending users.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-blue-600" />Secondary Reassignment</CardTitle>
                <CardDescription>Admin can reassign secondary executives between primary executives.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Secondary Executive</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Manager</TableHead>
                      <TableHead>Reassign To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secondaryExecutives.map((u) => {
                      const currentManagerId = typeof u.managerId === 'object' && u.managerId ? u.managerId._id : (u.managerId || '');
                      return (
                        <TableRow key={u._id}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{getManagerName(u)}</TableCell>
                          <TableCell>
                            <Select defaultValue={currentManagerId} onValueChange={(managerId) => reassignSecondary(u._id, managerId)}>
                              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select primary executive" /></SelectTrigger>
                              <SelectContent>
                                {primaryExecutives.map((p) => (
                                  <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {secondaryExecutives.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">No secondary executives found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users2 className="h-5 w-5 text-indigo-600" />Teams by Primary Executive</CardTitle>
                <CardDescription>Primary executives and the secondary executives reporting to them.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {primaryExecutives.map((primary) => {
                  const team = teamByPrimary.get(primary._id) || [];
                  return (
                    <div key={primary._id} className="p-3 rounded-md border bg-white">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{primary.name}</p>
                        <Badge variant="outline">{team.length} secondary</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{primary.email}</p>
                      {team.length === 0 ? (
                        <p className="text-sm text-gray-500">No secondary executives assigned.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {team.map((member) => (
                            <Badge key={member._id} variant="secondary">{member.name}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-emerald-600" />Assign Stock Pool to Primary Executive</CardTitle>
                <CardDescription>Secondaries will sell from this primary-owned stock pool.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={assignStockPool} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label>Primary Executive</Label>
                    <Select value={stockPrimaryId} onValueChange={setStockPrimaryId}>
                      <SelectTrigger><SelectValue placeholder="Select primary" /></SelectTrigger>
                      <SelectContent>
                        {primaryExecutives.map((p) => (
                          <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Product</Label>
                    <Select value={stockProductId} onValueChange={setStockProductId}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p._id} value={p._id}>{p.name} (Stock: {p.totalStock})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="Quantity" />
                  </div>

                  <div>
                    <Label>Selling Price/Unit</Label>
                    <Input type="number" min="0" step="0.01" value={stockSellingPrice} onChange={(e) => setStockSellingPrice(e.target.value)} placeholder="Price" />
                  </div>

                  <div className="md:col-span-4">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={savingStockAssignment}>
                      {savingStockAssignment ? 'Assigning...' : 'Assign Stock Pool'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Assign Customers to Primary/Secondary Executives</CardTitle>
                <CardDescription>Each customer can be owned by a primary and optionally a mapped secondary.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary Executive</TableHead>
                      <TableHead>Secondary Executive</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.slice(0, 120).map((customer) => {
                      const primaryId = customerOwnerPrimaryById[customer._id] || '';
                      const secondaryOptions = filteredSecondariesForPrimary(primaryId);
                      return (
                        <TableRow key={customer._id}>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>
                            <Select
                              value={primaryId}
                              onValueChange={(value) => {
                                setCustomerOwnerPrimaryById((prev) => ({ ...prev, [customer._id]: value }));
                                setCustomerOwnerSecondaryById((prev) => ({ ...prev, [customer._id]: '' }));
                              }}
                            >
                              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select primary" /></SelectTrigger>
                              <SelectContent>
                                {primaryExecutives.map((p) => (
                                  <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={customerOwnerSecondaryById[customer._id] || ''}
                              onValueChange={(value) => setCustomerOwnerSecondaryById((prev) => ({ ...prev, [customer._id]: value }))}
                              disabled={!primaryId}
                            >
                              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Optional secondary" /></SelectTrigger>
                              <SelectContent>
                                {secondaryOptions.map((s) => (
                                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => assignCustomerOwner(customer._id)}>Save</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {customers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">No customers found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Executives</CardTitle>
                <CardDescription>Edit executive profiles, manager mappings, and delete users.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter((u) => ['primary_executive', 'secondary_executive'].includes(normalizeRoleId(u.role) || ''))
                      .map((u) => (
                        <TableRow key={u._id}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell><Badge>{u.role}</Badge></TableCell>
                          <TableCell>{getManagerName(u)}</TableCell>
                          <TableCell><Badge variant="outline">{u.approval_status || '-'}</Badge></TableCell>
                          <TableCell className="space-x-2">
                            <Button size="icon" variant="outline" onClick={() => openEditDialog(u)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="destructive" onClick={() => deleteExecutive(u)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Executive</DialogTitle>
            <DialogDescription>Update profile details, role mapping, and optional password reset.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v: 'PrimaryExecutive' | 'SecondaryExecutive') => setEditRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PrimaryExecutive">Primary Executive</SelectItem>
                  <SelectItem value="SecondaryExecutive">Secondary Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editRole === 'SecondaryExecutive' && (
              <div>
                <Label>Primary Manager</Label>
                <Select value={editManagerId} onValueChange={setEditManagerId}>
                  <SelectTrigger><SelectValue placeholder="Select primary" /></SelectTrigger>
                  <SelectContent>
                    {primaryExecutives.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Reset Password (optional)</Label>
              <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave empty to keep existing" type="password" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={saveEditedUser} disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
