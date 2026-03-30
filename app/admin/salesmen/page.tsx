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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ChevronDown,
  ClipboardList,
  Copy,
  Link2,
  MoreVertical,
  Package,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
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

interface AssignmentItem {
  _id: string;
  id: string;
  salesman_id: { _id: string; name: string; email: string } | string;
  product_id: string;
  productId: { _id: string; name: string } | string;
  quantity: number;
  sellingPricePerUnit: number;
  selling_price_per_unit: number;
  created_at: string;
}

const toIdString = (value?: { toString: () => string } | string): string => {
  if (!value) return '';
  return typeof value === 'string' ? value : value.toString();
};

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ExecutiveManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [savingStockAssignment, setSavingStockAssignment] = useState(false);

  const [inviteRole, setInviteRole] = useState<'PrimaryExecutive' | 'SecondaryExecutive'>('PrimaryExecutive');
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  const [stockPrimaryId, setStockPrimaryId] = useState('');
  const [stockProductId, setStockProductId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockSellingPrice, setStockSellingPrice] = useState('');

  const [customerOwnerPrimaryById, setCustomerOwnerPrimaryById] = useState<Record<string, string>>({});
  const [customerOwnerSecondaryById, setCustomerOwnerSecondaryById] = useState<Record<string, string>>({});

  // Edit user sheet state
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'PrimaryExecutive' | 'SecondaryExecutive'>('SecondaryExecutive');
  const [editManagerId, setEditManagerId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  // Recall stock confirmation
  const [recallingAssignment, setRecallingAssignment] = useState<AssignmentItem | null>(null);

  // Stock filter
  const [stockExecFilter, setStockExecFilter] = useState('all');

  // Search/filter
  const [teamSearch, setTeamSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('leaftrack_token') : null;

  const primaryExecutives = useMemo(
    () => users.filter((u) => normalizeRoleId(u.role) === 'primary_executive'),
    [users]
  );

  const secondaryExecutives = useMemo(
    () => users.filter((u) => normalizeRoleId(u.role) === 'secondary_executive'),
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

  // Unassigned secondaries (no manager)
  const unassignedSecondaries = useMemo(
    () => secondaryExecutives.filter((u) => {
      const mid = typeof u.managerId === 'object' && u.managerId ? u.managerId._id : (u.managerId || '');
      return !mid;
    }),
    [secondaryExecutives]
  );

  const getManagerName = (user: ManagedUser) => {
    if (!user.managerId) return '-';
    if (typeof user.managerId === 'object') return user.managerId.name;
    const manager = users.find((u) => u._id === user.managerId);
    return manager?.name || '-';
  };

  // Data loading
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(`Failed to load users: ${data?.error || response.statusText}`);
        return;
      }
      if (Array.isArray(data)) setUsers(data);
      else if (Array.isArray(data?.users)) setUsers(data.users);
      else toast.error('Unexpected response format from users API');
    } catch (err) {
      console.error('loadUsers error:', err);
      toast.error('Could not reach the users API. Check your connection.');
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.products || [];
      setProducts(
        items.map((p: Record<string, unknown>) => ({
          _id: (p._id || p.id) as string,
          name: p.name as string,
          totalStock: (p.totalStock ?? p.total_stock ?? 0) as number,
        }))
      );
    } catch (err) {
      console.error('loadProducts error:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const items: CustomerApiRow[] = Array.isArray(data) ? data : data?.customers || [];
      const mapped: CustomerItem[] = items.map((c) => ({
        _id: c._id,
        name: c.name,
        phone: c.phone,
        primary_executive_id: toIdString(c.primary_executive_id),
        secondary_executive_id: toIdString(c.secondary_executive_id),
      }));
      setCustomers(mapped);

      const pMap: Record<string, string> = {};
      const sMap: Record<string, string> = {};
      for (const c of mapped) {
        if (c.primary_executive_id) pMap[c._id] = c.primary_executive_id;
        if (c.secondary_executive_id) sMap[c._id] = c.secondary_executive_id;
      }
      setCustomerOwnerPrimaryById(pMap);
      setCustomerOwnerSecondaryById(sMap);
    } catch (err) {
      console.error('loadCustomers error:', err);
    }
  };

  const loadAssignments = async () => {
    try {
      const res = await fetch('/api/assignments', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.assignments || [];
      setAssignments(items);
    } catch (err) {
      console.error('loadAssignments error:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadProducts(), loadCustomers(), loadAssignments()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Invite
  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return toast.error('Email is required');
    setInviteLoading(true);
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');
      const link = data.inviteLink || data.invite_link || `${window.location.origin}/signup?token=${data.token}`;
      setGeneratedInviteLink(link);
      toast.success('Invite link generated');
      setInviteEmail('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error creating invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(generatedInviteLink);
    toast.success('Link copied to clipboard');
  };

  // Reassign secondary
  const reassignSecondary = async (secondaryId: string, newManagerId: string) => {
    try {
      const res = await fetch(`/api/users/${secondaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ managerId: newManagerId }),
      });
      if (!res.ok) throw new Error('Failed to reassign');
      toast.success('Executive reassigned');
      await loadUsers();
    } catch {
      toast.error('Failed to reassign executive');
    }
  };

  // Stock assignment
  const assignStockPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockPrimaryId || !stockProductId || !stockQuantity) {
      return toast.error('All fields are required');
    }
    setSavingStockAssignment(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          salesman_id: stockPrimaryId,
          product_id: stockProductId,
          quantity: Number(stockQuantity),
          selling_price_per_unit: Number(stockSellingPrice) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign stock');
      toast.success('Stock pool assigned successfully');
      setStockPrimaryId('');
      setStockProductId('');
      setStockQuantity('');
      setStockSellingPrice('');
      await Promise.all([loadProducts(), loadAssignments()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error assigning stock');
    } finally {
      setSavingStockAssignment(false);
    }
  };

  // Recall stock assignment
  const confirmRecallAssignment = async () => {
    if (!recallingAssignment) return;
    try {
      const res = await fetch(`/api/assignments/${recallingAssignment._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to recall stock');
      toast.success('Stock recalled and returned to inventory');
      setRecallingAssignment(null);
      await Promise.all([loadProducts(), loadAssignments()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error recalling stock');
    }
  };

  // Customer assignment
  const assignCustomerOwner = async (customerId: string) => {
    const primary = customerOwnerPrimaryById[customerId];
    const secondary = customerOwnerSecondaryById[customerId];
    if (!primary) return toast.error('Select a primary executive');
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          primary_executive_id: primary,
          secondary_executive_id: secondary || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update assignment');
      toast.success('Customer assignment saved');
    } catch {
      toast.error('Failed to update customer assignment');
    }
  };

  // Edit user
  const openEditSheet = (user: ManagedUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    const roleNorm = normalizeRoleId(user.role);
    setEditRole(roleNorm === 'primary_executive' ? 'PrimaryExecutive' : 'SecondaryExecutive');
    const managerId = typeof user.managerId === 'object' && user.managerId
      ? user.managerId._id
      : (user.managerId as string || '');
    setEditManagerId(managerId);
    setEditPassword('');
  };

  const saveEditedUser = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const payload: Record<string, string> = {
        name: editName,
        email: editEmail,
        role: editRole,
      };
      if (editRole === 'SecondaryExecutive' && editManagerId) {
        payload.managerId = editManagerId;
      }
      if (editPassword) {
        payload.password = editPassword;
      }
      const res = await fetch(`/api/users/${editingUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.success('User updated successfully');
      setEditingUser(null);
      await loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating user');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete user
  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users/${deletingUser._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Executive deleted');
      setDeletingUser(null);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error deleting user');
    }
  };

  // Filtered secondaries for a given primary (for customer assignment)
  const filteredSecondariesForPrimary = (primaryId: string) => {
    if (!primaryId) return [];
    return secondaryExecutives.filter((se) => {
      const mid = typeof se.managerId === 'object' && se.managerId ? se.managerId._id : (se.managerId || '');
      return mid === primaryId;
    });
  };

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, customerSearch]);

  // Filtered team members for search
  const filteredTeamUsers = useMemo(() => {
    const allExecs = users.filter(
      (u) => ['primary_executive', 'secondary_executive'].includes(normalizeRoleId(u.role) || '')
    );
    if (!teamSearch.trim()) return allExecs;
    const q = teamSearch.toLowerCase();
    return allExecs.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [users, teamSearch]);

  // Assignments grouped by executive for stock monitoring
  const filteredAssignments = useMemo(() => {
    if (stockExecFilter === 'all') return assignments;
    return assignments.filter((a) => {
      const sid = typeof a.salesman_id === 'object' ? a.salesman_id._id : a.salesman_id;
      return sid === stockExecFilter;
    });
  }, [assignments, stockExecFilter]);

  const assignmentsByExec = useMemo(() => {
    const map = new Map<string, { name: string; assignments: AssignmentItem[] }>();
    for (const a of filteredAssignments) {
      const sid = typeof a.salesman_id === 'object' ? a.salesman_id._id : (a.salesman_id || '');
      const sname = typeof a.salesman_id === 'object' ? a.salesman_id.name : (primaryExecutives.find(p => p._id === sid)?.name || 'Unknown');
      if (!map.has(sid)) map.set(sid, { name: sname, assignments: [] });
      map.get(sid)!.assignments.push(a);
    }
    return map;
  }, [filteredAssignments, primaryExecutives]);

  const totalAssignedStock = useMemo(
    () => assignments.reduce((sum, a) => sum + Number(a.quantity), 0),
    [assignments]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Executive Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your team, assign stock &amp; customers</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{primaryExecutives.length + secondaryExecutives.length}</p>
                <p className="text-xs text-muted-foreground">Total Executives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{primaryExecutives.length}</p>
                <p className="text-xs text-muted-foreground">Primary Executives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-100 text-violet-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{secondaryExecutives.length}</p>
                <p className="text-xs text-muted-foreground">Secondary Executives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-100 text-amber-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{products.reduce((sum, p) => sum + p.totalStock, 0)}</p>
                <p className="text-xs text-muted-foreground">Total Stock Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="invite" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users2 className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TEAM TAB ── */}
        <TabsContent value="team" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search executives by name, email or role..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* If searching, show flat list */}
          {teamSearch.trim() ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search Results ({filteredTeamUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredTeamUsers.map((user) => (
                    <UserRow
                      key={user._id}
                      user={user}
                      getManagerName={getManagerName}
                      onEdit={openEditSheet}
                      onDelete={setDeletingUser}
                    />
                  ))}
                  {filteredTeamUsers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No executives match your search.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Team Hierarchy - Primary Executives with their teams */}
              {primaryExecutives.map((primary) => {
                const team = teamByPrimary.get(primary._id) || [];
                return (
                  <Card key={primary._id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-emerald-100 text-emerald-700">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                              {getInitials(primary.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{primary.name}</CardTitle>
                            <CardDescription>{primary.email}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Primary</Badge>
                          <Badge variant="outline">{team.length} member{team.length !== 1 ? 's' : ''}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSheet(primary)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeletingUser(primary)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Executive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    {team.length > 0 && (
                      <>
                        <Separator />
                        <CardContent className="pt-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            Team Members
                          </p>
                          <div className="space-y-2">
                            {team.map((member) => (
                              <UserRow
                                key={member._id}
                                user={member}
                                getManagerName={getManagerName}
                                onEdit={openEditSheet}
                                onDelete={setDeletingUser}
                                onReassign={(id, newManagerId) => reassignSecondary(id, newManagerId)}
                                primaryExecutives={primaryExecutives}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                );
              })}

              {/* Unassigned secondary executives */}
              {unassignedSecondaries.length > 0 && (
                <Card className="border-dashed border-amber-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-amber-700">Unassigned Secondary Executives</CardTitle>
                    <CardDescription>These executives are not assigned to any primary executive.</CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {unassignedSecondaries.map((member) => (
                        <UserRow
                          key={member._id}
                          user={member}
                          getManagerName={getManagerName}
                          onEdit={openEditSheet}
                          onDelete={setDeletingUser}
                          onReassign={(id, newManagerId) => reassignSecondary(id, newManagerId)}
                          primaryExecutives={primaryExecutives}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {primaryExecutives.length === 0 && secondaryExecutives.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      {users.length > 0 ? (
                        <>
                          <p className="text-lg font-medium">No executives found</p>
                          <p className="text-sm mt-1">
                            {users.length} user{users.length !== 1 ? 's' : ''} loaded, but none have a Primary or Secondary Executive role.
                          </p>
                          <p className="text-xs mt-2 font-mono text-left inline-block bg-muted rounded p-2">
                            Roles found: {[...new Set(users.map(u => u.role))].join(', ')}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-medium">No executives yet</p>
                          <p className="text-sm">Go to the Invite tab to add your first executive.</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── INVITE TAB ── */}
        <TabsContent value="invite">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Invite Executive
              </CardTitle>
              <CardDescription>
                Generate a one-time invitation link. The user will sign up using this link and be auto-approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={createInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="executive@company.com"
                    type="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v: 'PrimaryExecutive' | 'SecondaryExecutive') => setInviteRole(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PrimaryExecutive">Primary Executive</SelectItem>
                      <SelectItem value="SecondaryExecutive">Secondary Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button type="submit" className="w-full" disabled={inviteLoading}>
                    <Link2 className="h-4 w-4 mr-2" />
                    {inviteLoading ? 'Creating...' : 'Generate Invite Link'}
                  </Button>
                </div>
              </form>

              {generatedInviteLink && (
                <>
                  <Separator />
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-medium text-emerald-800 mb-2">Invitation link ready</p>
                    <div className="flex gap-2">
                      <Input value={generatedInviteLink} readOnly className="bg-white" />
                      <Button variant="outline" onClick={copyInviteLink}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STOCK ASSIGNMENT TAB ── */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                Assign Stock Pool
              </CardTitle>
              <CardDescription>
                Allocate product stock to a primary executive. Secondary executives will sell from this pool.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={assignStockPool} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Executive</Label>
                    <Select value={stockPrimaryId} onValueChange={setStockPrimaryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary executive" />
                      </SelectTrigger>
                      <SelectContent>
                        {primaryExecutives.map((p) => (
                          <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select value={stockProductId} onValueChange={setStockProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Show selected product stock info */}
                {stockProductId && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium">Available Stock:</span>{' '}
                    {products.find((p) => p._id === stockProductId)?.totalStock ?? 0} units
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selling Price / Unit (&#x20B9;)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={stockSellingPrice}
                      onChange={(e) => setStockSellingPrice(e.target.value)}
                      placeholder="Enter selling price"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={savingStockAssignment}
                >
                  {savingStockAssignment ? 'Assigning...' : 'Assign Stock Pool'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Product stock overview */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Stock Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <span className="font-medium text-sm truncate">{p.name}</span>
                      <Badge variant={p.totalStock > 0 ? 'default' : 'destructive'} className="ml-2">
                        {p.totalStock} units
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Stock Ledger — Assigned Stock Monitoring ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    Stock Ledger
                  </CardTitle>
                  <CardDescription>
                    Monitor stock assigned to each executive. {assignments.length} active assignment{assignments.length !== 1 ? 's' : ''} &middot; {totalAssignedStock} total units allocated
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={stockExecFilter} onValueChange={setStockExecFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by executive" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Executives</SelectItem>
                      {primaryExecutives.map((p) => (
                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => loadAssignments()} title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>No stock has been assigned yet.</p>
                  <p className="text-sm">Use the form above to assign stock to a primary executive.</p>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No assignments for the selected executive.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...assignmentsByExec.entries()].map(([execId, { name: execName, assignments: execAssignments }]) => (
                    <div key={execId} className="rounded-lg border">
                      <div className="flex items-center gap-3 p-4 bg-muted/30">
                        <Avatar className="h-8 w-8 bg-blue-100 text-blue-700">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                            {getInitials(execName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{execName}</p>
                          <p className="text-xs text-muted-foreground">
                            {execAssignments.length} product{execAssignments.length !== 1 ? 's' : ''} &middot;{' '}
                            {execAssignments.reduce((s, a) => s + Number(a.quantity), 0)} units remaining
                          </p>
                        </div>
                        <Badge variant="outline" className="text-blue-700 border-blue-200">
                          Primary Executive
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Remaining Qty</TableHead>
                            <TableHead className="text-right">Price/Unit</TableHead>
                            <TableHead className="text-right">Total Value</TableHead>
                            <TableHead>Assigned On</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {execAssignments.map((a) => {
                            const productName = typeof a.productId === 'object' ? a.productId.name : 'Unknown';
                            const price = Number(a.sellingPricePerUnit || a.selling_price_per_unit || 0);
                            const qty = Number(a.quantity);
                            return (
                              <TableRow key={a._id}>
                                <TableCell className="font-medium">{productName}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={qty > 0 ? 'default' : 'destructive'} className="font-mono">
                                    {qty}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">&#x20B9;{price.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">&#x20B9;{(qty * price).toFixed(2)}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {new Date(a.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setRecallingAssignment(a)}
                                    title="Recall stock"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CUSTOMER ASSIGNMENT TAB ── */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer–Executive Mapping</CardTitle>
              <CardDescription>
                Assign each customer to a primary executive and optionally a secondary executive from their team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className={filteredCustomers.length > 10 ? 'h-[600px]' : ''}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary Executive</TableHead>
                      <TableHead>Secondary Executive</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const primaryId = customerOwnerPrimaryById[customer._id] || '';
                      const secondaryOptions = filteredSecondariesForPrimary(primaryId);
                      return (
                        <TableRow key={customer._id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="text-muted-foreground">{customer.phone}</TableCell>
                          <TableCell>
                            <Select
                              value={primaryId}
                              onValueChange={(value) => {
                                setCustomerOwnerPrimaryById((prev) => ({ ...prev, [customer._id]: value }));
                                setCustomerOwnerSecondaryById((prev) => ({ ...prev, [customer._id]: '' }));
                              }}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select primary" />
                              </SelectTrigger>
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
                              onValueChange={(value) =>
                                setCustomerOwnerSecondaryById((prev) => ({ ...prev, [customer._id]: value }))
                              }
                              disabled={!primaryId}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={primaryId ? 'Select secondary' : 'Select primary first'} />
                              </SelectTrigger>
                              <SelectContent>
                                {secondaryOptions.map((s) => (
                                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => assignCustomerOwner(customer._id)}>
                              Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredCustomers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {customerSearch ? 'No customers match your search.' : 'No customers found.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── EDIT USER SHEET ── */}
      <Sheet open={Boolean(editingUser)} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Executive</SheetTitle>
            <SheetDescription>
              Update profile details, role mapping, and optionally reset the password.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v: 'PrimaryExecutive' | 'SecondaryExecutive') => setEditRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PrimaryExecutive">Primary Executive</SelectItem>
                  <SelectItem value="SecondaryExecutive">Secondary Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editRole === 'SecondaryExecutive' && (
              <div className="space-y-2">
                <Label>Primary Manager</Label>
                <Select value={editManagerId} onValueChange={setEditManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary executive" />
                  </SelectTrigger>
                  <SelectContent>
                    {primaryExecutives.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Reset Password</Label>
              <Input
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave empty to keep current password"
                type="password"
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={saveEditedUser} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── DELETE CONFIRMATION ── */}
      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(open) => { if (!open) setDeletingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Executive</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.name}</strong>?
              {normalizeRoleId(deletingUser?.role || '') === 'primary_executive' &&
                ' This will unassign all secondary executives under them.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── RECALL STOCK CONFIRMATION ── */}
      <AlertDialog open={Boolean(recallingAssignment)} onOpenChange={(open) => { if (!open) setRecallingAssignment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recall Stock Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              This will recall <strong>{recallingAssignment?.quantity} units</strong> of{' '}
              <strong>
                {typeof recallingAssignment?.productId === 'object'
                  ? recallingAssignment.productId.name
                  : 'this product'}
              </strong>{' '}
              from{' '}
              <strong>
                {typeof recallingAssignment?.salesman_id === 'object'
                  ? recallingAssignment.salesman_id.name
                  : 'this executive'}
              </strong>{' '}
              and return the stock to inventory. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRecallAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Recall Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── USER ROW COMPONENT ── */
function UserRow({
  user,
  getManagerName,
  onEdit,
  onDelete,
  onReassign,
  primaryExecutives,
}: {
  user: ManagedUser;
  getManagerName: (u: ManagedUser) => string;
  onEdit: (u: ManagedUser) => void;
  onDelete: (u: ManagedUser) => void;
  onReassign?: (userId: string, newManagerId: string) => void;
  primaryExecutives?: ManagedUser[];
}) {
  const isPrimary = normalizeRoleId(user.role) === 'primary_executive';
  const currentManagerId = typeof user.managerId === 'object' && user.managerId
    ? user.managerId._id
    : (user.managerId as string || '');

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={isPrimary ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-violet-100 text-violet-700 text-xs'}>
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {!isPrimary && (
          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
            {getManagerName(user)}
          </Badge>
        )}
        <Badge className={isPrimary ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-violet-100 text-violet-800 hover:bg-violet-100'}>
          {isPrimary ? 'Primary' : 'Secondary'}
        </Badge>

        {/* Reassign dropdown for secondaries */}
        {!isPrimary && onReassign && primaryExecutives && primaryExecutives.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                Reassign <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {primaryExecutives.map((pe) => (
                <DropdownMenuItem
                  key={pe._id}
                  onClick={() => onReassign(user._id, pe._id)}
                  disabled={pe._id === currentManagerId}
                >
                  {pe.name}
                  {pe._id === currentManagerId && ' (current)'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(user)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
