'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  Copy,
  GitBranch,
  LayoutList,
  Link2,
  MoreVertical,
  Network,
  Pencil,
  RefreshCw,
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



interface DistributorItem {
  _id: string;
  name: string;
  phone: string;
  pe_id?: string;
}


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
  const [distributors, setDistributors] = useState<DistributorItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<'Admin' | 'PrimaryExecutive' | 'SecondaryExecutive'>('PrimaryExecutive');
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

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

  // Search/filter
  const [teamSearch, setTeamSearch] = useState('');
  const [distributorSearch, setDistributorSearch] = useState('');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('leaftrack_token') : null;

  const primaryExecutives = useMemo(
    () => users.filter((u) => normalizeRoleId(u.role) === 'primary_executive' && u.approval_status === 'approved'),
    [users]
  );

  const secondaryExecutives = useMemo(
    () => users.filter((u) => normalizeRoleId(u.role) === 'secondary_executive' && u.approval_status === 'approved'),
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

  const loadDistributors = async () => {
    try {
      const res = await fetch('/api/distributors', { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const items = Array.isArray(data) ? data : data?.distributors || [];
      setDistributors(
        items.map((d: Record<string, unknown>) => ({
          _id: (d._id || d.id) as string,
          name: d.name as string,
          phone: d.phone as string,
          pe_id: (d.pe_id || '') as string,
        }))
      );
    } catch (err) {
      console.error('loadDistributors error:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadDistributors()]);
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
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');
      const raw = data.inviteLink || data.invite_link || `/signup?token=${data.token}`;
      const link = raw.startsWith('http') ? raw : `${window.location.origin}${raw}`;
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

  // Filtered distributors for search
  const filteredDistributors = useMemo(() => {
    if (!distributorSearch.trim()) return distributors;
    const q = distributorSearch.toLowerCase();
    return distributors.filter(
      (d) => d.name.toLowerCase().includes(q) || d.phone.includes(q)
    );
  }, [distributors, distributorSearch]);

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
          <p className="text-sm sm:text-base text-muted-foreground">Manage your team &amp; distributors</p>
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
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distributors.length}</p>
                <p className="text-xs text-muted-foreground">Distributors</p>
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
          <TabsTrigger value="distributors" className="gap-2">
            <Users2 className="h-4 w-4" />
            <span className="hidden sm:inline">Distributors</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="gap-2">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Mapping</span>
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
                    onValueChange={(v: 'Admin' | 'PrimaryExecutive' | 'SecondaryExecutive') => setInviteRole(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
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

        {/* ── DISTRIBUTOR OVERVIEW TAB ── */}
        <TabsContent value="distributors" className="space-y-4">
          {/* Distributor List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-blue-600" />
                PE → Distributor Assignments
              </CardTitle>
              <CardDescription>
                Distributors are assigned to Primary Executives. Secondary Executives under a PE can see and sell for all of that PE&apos;s distributors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search distributors by name or phone..."
                  value={distributorSearch}
                  onChange={(e) => setDistributorSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className={filteredDistributors.length > 10 ? 'h-[400px]' : ''}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distributor</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary Executive</TableHead>
                      <TableHead>SEs with Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDistributors.map((dist) => {
                      const pe = primaryExecutives.find(p => p._id === dist.pe_id);
                      const sesWithAccess = pe ? (teamByPrimary.get(pe._id) || []) : [];
                      return (
                        <TableRow key={dist._id}>
                          <TableCell className="font-medium">{dist.name}</TableCell>
                          <TableCell className="text-muted-foreground">{dist.phone}</TableCell>
                          <TableCell>
                            {pe ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{pe.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {sesWithAccess.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {sesWithAccess.map((se) => (
                                  <Badge key={se._id} variant="outline" className="text-xs">{se.name}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No SEs</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredDistributors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {distributorSearch ? 'No distributors match your search.' : 'No distributors found.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MAPPING TAB ── */}
        <TabsContent value="mapping">
          <MappingView
            primaryExecutives={primaryExecutives}
            secondaryExecutives={secondaryExecutives}
            distributors={distributors}
            teamByPrimary={teamByPrimary}
          />
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


    </div>
  );
}

/* ── MAPPING VIEW COMPONENT ── */
function MappingView({
  primaryExecutives,
  secondaryExecutives,
  distributors,
  teamByPrimary,
}: {
  primaryExecutives: ManagedUser[];
  secondaryExecutives: ManagedUser[];
  distributors: DistributorItem[];
  teamByPrimary: Map<string, ManagedUser[]>;
}) {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const svgRef = useRef<SVGSVGElement>(null);

  // Build graph data — PE→SE from manager, PE→Distributor from pe_id
  const graphData = useMemo(() => {
    const peNodes = primaryExecutives.map((pe, i) => ({
      id: pe._id,
      label: pe.name,
      type: 'pe' as const,
      x: 0,
      y: 0,
      index: i,
    }));

    const seNodes = secondaryExecutives.map((se, i) => ({
      id: se._id,
      label: se.name,
      type: 'se' as const,
      x: 0,
      y: 0,
      index: i,
    }));

    // Only show distributors assigned to a PE
    const assignedDistributors = distributors.filter(d => d.pe_id);
    const distNodes = assignedDistributors.map((d, i) => ({
      id: d._id,
      label: d.name,
      type: 'dist' as const,
      x: 0,
      y: 0,
      index: i,
    }));

    // PE→SE links from teamByPrimary (manager relationship)
    const peSeLinks: { source: string; target: string }[] = [];
    for (const [peId, team] of teamByPrimary) {
      for (const se of team) {
        peSeLinks.push({ source: peId, target: se._id });
      }
    }

    // PE→Distributor links from pe_id
    const peDistLinks = assignedDistributors
      .filter(d => d.pe_id)
      .map(d => ({ source: d.pe_id!, target: d._id }));

    return { peNodes, seNodes, distNodes, peSeLinks, peDistLinks };
  }, [primaryExecutives, secondaryExecutives, distributors, teamByPrimary]);

  // Layout calculation
  const layout = useMemo(() => {
    const { peNodes, seNodes, distNodes } = graphData;
    const padding = 60;
    const colWidth = 280;
    const nodeSpacing = 80;

    const maxRows = Math.max(peNodes.length, seNodes.length, distNodes.length, 1);
    const svgWidth = padding * 2 + colWidth * 2 + 200;
    const svgHeight = padding * 2 + maxRows * nodeSpacing;

    const peX = padding + 60;
    const seX = padding + colWidth + 60;
    const distX = padding + colWidth * 2 + 60;

    const centerVertical = (count: number) => {
      const totalHeight = (count - 1) * nodeSpacing;
      return (svgHeight - totalHeight) / 2;
    };

    const positioned = {
      pe: peNodes.map((n, i) => ({
        ...n,
        x: peX,
        y: centerVertical(peNodes.length) + i * nodeSpacing,
      })),
      se: seNodes.map((n, i) => ({
        ...n,
        x: seX,
        y: centerVertical(seNodes.length) + i * nodeSpacing,
      })),
      dist: distNodes.map((n, i) => ({
        ...n,
        x: distX,
        y: centerVertical(distNodes.length) + i * nodeSpacing,
      })),
    };

    return { positioned, svgWidth, svgHeight };
  }, [graphData]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    [...layout.positioned.pe, ...layout.positioned.se, ...layout.positioned.dist].forEach(n => {
      map.set(n.id, { x: n.x, y: n.y });
    });
    return map;
  }, [layout]);

  // Tree data for list view
  const treeData = useMemo(() => {
    return primaryExecutives.map(pe => {
      const team = teamByPrimary.get(pe._id) || [];
      const peDistributors = distributors.filter(d => d.pe_id === pe._id);
      return { pe, peDistributors, team };
    });
  }, [primaryExecutives, distributors, teamByPrimary]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-blue-600" />
              Organization Mapping
            </CardTitle>
            <CardDescription>
              Visualize PE → SE and PE → Distributor relationships
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'graph' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('graph')}
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Graph
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'graph' ? (
          <div className="overflow-auto border rounded-lg bg-slate-50/50">
            {/* Legend */}
            <div className="flex items-center gap-4 px-4 pt-3 pb-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> Primary Executive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-violet-500" /> Secondary Executive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500" /> Distributor
              </span>
              <span className="flex items-center gap-1.5 ml-4 border-l pl-4">
                <span className="inline-block w-6 h-0.5 bg-emerald-400" /> PE→SE (manages)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-0.5 bg-amber-400 border-dashed border-t-2 border-amber-400 bg-transparent" /> PE→Distributor (owns)
              </span>
            </div>

            <svg
              ref={svgRef}
              width={layout.svgWidth}
              height={Math.max(layout.svgHeight, 200)}
              className="mx-auto"
            >
              {/* Column headers */}
              <text x={layout.positioned.pe[0]?.x || 120} y={24} textAnchor="middle" className="fill-muted-foreground text-xs font-semibold">
                PRIMARY EXECUTIVES
              </text>
              <text x={layout.positioned.se[0]?.x || 400} y={24} textAnchor="middle" className="fill-muted-foreground text-xs font-semibold">
                SECONDARY EXECUTIVES
              </text>
              <text x={layout.positioned.dist[0]?.x || 680} y={24} textAnchor="middle" className="fill-muted-foreground text-xs font-semibold">
                DISTRIBUTORS
              </text>

              {/* PE→Distributor links (dashed) */}
              {graphData.peDistLinks.map((link, i) => {
                const src = nodeMap.get(link.source);
                const tgt = nodeMap.get(link.target);
                if (!src || !tgt) return null;
                const midX = (src.x + tgt.x) / 2;
                return (
                  <path
                    key={`pe-dist-${i}`}
                    d={`M ${src.x + 50} ${src.y} C ${midX} ${src.y}, ${midX} ${tgt.y}, ${tgt.x - 50} ${tgt.y}`}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    opacity={0.5}
                  />
                );
              })}

              {/* PE→SE links */}
              {graphData.peSeLinks.map((link, i) => {
                const src = nodeMap.get(link.source);
                const tgt = nodeMap.get(link.target);
                if (!src || !tgt) return null;
                const midX = (src.x + tgt.x) / 2;
                return (
                  <path
                    key={`pe-se-${i}`}
                    d={`M ${src.x + 50} ${src.y} C ${midX} ${src.y}, ${midX} ${tgt.y}, ${tgt.x - 50} ${tgt.y}`}
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                );
              })}

              {/* PE nodes */}
              {layout.positioned.pe.map(node => (
                <g key={node.id}>
                  <rect
                    x={node.x - 50}
                    y={node.y - 18}
                    width={100}
                    height={36}
                    rx={18}
                    className="fill-emerald-100 stroke-emerald-400"
                    strokeWidth={2}
                  />
                  <text x={node.x} y={node.y + 5} textAnchor="middle" className="fill-emerald-800 text-xs font-semibold" style={{ fontSize: 11 }}>
                    {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                  </text>
                </g>
              ))}

              {/* SE nodes */}
              {layout.positioned.se.map(node => (
                <g key={node.id}>
                  <rect
                    x={node.x - 50}
                    y={node.y - 18}
                    width={100}
                    height={36}
                    rx={18}
                    className="fill-violet-100 stroke-violet-400"
                    strokeWidth={2}
                  />
                  <text x={node.x} y={node.y + 5} textAnchor="middle" className="fill-violet-800 text-xs font-semibold" style={{ fontSize: 11 }}>
                    {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                  </text>
                </g>
              ))}

              {/* Distributor nodes */}
              {layout.positioned.dist.map(node => (
                <g key={node.id}>
                  <rect
                    x={node.x - 50}
                    y={node.y - 18}
                    width={100}
                    height={36}
                    rx={18}
                    className="fill-amber-100 stroke-amber-400"
                    strokeWidth={2}
                  />
                  <text x={node.x} y={node.y + 5} textAnchor="middle" className="fill-amber-800 text-xs font-semibold" style={{ fontSize: 11 }}>
                    {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                  </text>
                </g>
              ))}

              {/* Empty state */}
              {layout.positioned.pe.length === 0 && layout.positioned.se.length === 0 && layout.positioned.dist.length === 0 && (
                <text x={layout.svgWidth / 2} y={100} textAnchor="middle" className="fill-muted-foreground text-sm">
                  No data to display. Add executives and distributors to see the mapping.
                </text>
              )}
            </svg>
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="space-y-4">
            {treeData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Network className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No mapping data yet.</p>
              </div>
            ) : (
              treeData.map(({ pe, peDistributors, team }) => (
                <div key={pe._id} className="border rounded-lg overflow-hidden">
                  {/* PE Header */}
                  <div className="bg-emerald-50 px-4 py-3 flex items-center gap-3 border-b">
                    <div className="h-8 w-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-xs font-bold">
                      {getInitials(pe.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-emerald-900">{pe.name}</p>
                      <p className="text-xs text-emerald-700">{pe.email} · Primary Executive</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      {team.length} SE{team.length !== 1 ? 's' : ''} · {peDistributors.length} Dist{peDistributors.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="divide-y">
                    {/* Team members (SEs) */}
                    {team.length > 0 && (
                      <div className="px-4 py-2 bg-violet-50/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Secondary Executives
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {team.map(se => (
                            <Badge key={se._id} variant="outline" className="bg-violet-50 border-violet-300 text-violet-800">
                              {se.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Distributors */}
                    {peDistributors.length > 0 && (
                      <div className="px-4 py-2 bg-amber-50/50">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Distributors
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {peDistributors.map(d => (
                            <Badge key={d._id} variant="outline" className="bg-amber-50 border-amber-300 text-amber-800">
                              {d.name} · {d.phone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {team.length === 0 && peDistributors.length === 0 && (
                      <div className="px-4 py-3 text-xs text-muted-foreground italic ml-4">
                        No team members or distributors under this PE
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
