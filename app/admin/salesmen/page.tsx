'use client';

import { useEffect, useState } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, Users, Plus, User as UserIcon, ShoppingCart, TrendingUp, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  _id: string;
  salesman_id: {
    _id: string;
    name: string;
    email: string;
  };
  customer_name: string;
  customer_phone: string;
  products: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface SalesmanStats {
  salesman_id: string;
  salesman_name: string;
  salesman_email: string;
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  rejected_orders: number;
  total_order_value: number;
  approved_order_value: number;
}

export default function SalesmenPage() {
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [salesmanStats, setSalesmanStats] = useState<SalesmanStats[]>([]);
  const [salesmanOrders, setSalesmanOrders] = useState<Order[]>([]);
  const [selectedSalesman] = useState<User | null>(null);
  const [editingSalesman, setEditingSalesman] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewOrdersDialogOpen, setIsViewOrdersDialogOpen] = useState(false);
  const [newSalesman, setNewSalesman] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    loadSalesmen();
    loadSalesmanStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('leaftrack_token');
  };

  const loadSalesmen = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        // Filter only salesmen
        const salesmenOnly = data.users.filter((user: User) => user.role?.toLowerCase() === 'salesman');
        setSalesmen(salesmenOnly);
      } else {
        toast.error('Failed to load salesmen');
      }
    } catch (error) {
      console.error('Error loading salesmen:', error);
      toast.error('Failed to load salesmen');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSalesmanStats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        // Calculate stats for each salesman
        const statsMap = new Map<string, SalesmanStats>();
        
        data.orders.forEach((order: Order) => {
          const salesmanId = order.salesman_id._id;
          const existing = statsMap.get(salesmanId);
          
          if (existing) {
            existing.total_orders++;
            existing.total_order_value += order.total_amount;
            
            if (order.status === 'pending') existing.pending_orders++;
            else if (order.status === 'approved') {
              existing.approved_orders++;
              existing.approved_order_value += order.total_amount;
            }
            else if (order.status === 'rejected') existing.rejected_orders++;
          } else {
            statsMap.set(salesmanId, {
              salesman_id: salesmanId,
              salesman_name: order.salesman_id.name,
              salesman_email: order.salesman_id.email,
              total_orders: 1,
              pending_orders: order.status === 'pending' ? 1 : 0,
              approved_orders: order.status === 'approved' ? 1 : 0,
              rejected_orders: order.status === 'rejected' ? 1 : 0,
              total_order_value: order.total_amount,
              approved_order_value: order.status === 'approved' ? order.total_amount : 0,
            });
          }
        });
        
        setSalesmanStats(Array.from(statsMap.values()).sort((a, b) => b.total_order_value - a.total_order_value));
      }
    } catch (error) {
      console.error('Error loading salesman stats:', error);
    }
  };

  const loadSalesmanOrders = async (salesmanId: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/orders?salesman_id=${salesmanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setSalesmanOrders(data.orders);
        setIsViewOrdersDialogOpen(true);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    }
  };

  const handleCreateSalesman = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSalesman.name || !newSalesman.email || !newSalesman.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newSalesman.name,
          email: newSalesman.email,
          password: newSalesman.password,
          role: 'salesman'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSalesmen(prev => [data.user, ...prev]);
        setNewSalesman({ name: '', email: '', password: '' });
        setIsAddDialogOpen(false);
        toast.success('Salesman created successfully');
        loadSalesmanStats();
      } else {
        toast.error(data.error || 'Failed to create salesman');
      }
    } catch (error) {
      console.error('Error creating salesman:', error);
      toast.error('Failed to create salesman');
    }
  };

  const handleEditSalesman = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSalesman) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/users/${editingSalesman._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingSalesman.name,
          email: editingSalesman.email,
          role: editingSalesman.role,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSalesmen(prev => prev.map(s => 
          s._id === editingSalesman._id ? data.user : s
        ));
        setEditingSalesman(null);
        setIsEditDialogOpen(false);
        toast.success('Salesman updated successfully');
      } else {
        toast.error(data.error || 'Failed to update salesman');
      }
    } catch (error) {
      console.error('Error updating salesman:', error);
      toast.error('Failed to update salesman');
    }
  };

  const handleDeleteSalesman = async (salesmanId: string) => {
    if (!confirm('Are you sure you want to delete this salesman? This action cannot be undone.')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/users/${salesmanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSalesmen(prev => prev.filter(s => s._id !== salesmanId));
        toast.success('Salesman deleted successfully');
        loadSalesmanStats();
      } else {
        toast.error(data.error || 'Failed to delete salesman');
      }
    } catch (error) {
      console.error('Error deleting salesman:', error);
      toast.error('Failed to delete salesman');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      rejected: <XCircle className="h-3 w-3 mr-1" />,
    };
    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    const icon = icons[status as keyof typeof icons] || null;
    
    return (
      <Badge className={`${style} flex items-center w-fit`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              Salesmen Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage salesmen, view their performance, and track order statistics
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Salesman
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Add New Salesman</DialogTitle>
                <DialogDescription>
                  Create a new salesman account with login credentials.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSalesman} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={newSalesman.name}
                      onChange={(e) => setNewSalesman({ ...newSalesman, name: e.target.value })}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSalesman.email}
                      onChange={(e) => setNewSalesman({ ...newSalesman, email: e.target.value })}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newSalesman.password}
                      onChange={(e) => setNewSalesman({ ...newSalesman, password: e.target.value })}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Create Salesman
                    </Button>
                  </div>
                </form>
              </DialogContent>
          </Dialog>
        </div>

        {/* Salesman Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Salesmen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{salesmen.length}</div>
              <p className="text-sm text-gray-500 mt-1">Active sales team</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {salesmanStats.reduce((sum, s) => sum + s.total_orders, 0)}
              </div>
              <p className="text-sm text-gray-500 mt-1">All orders combined</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {salesmanStats.reduce((sum, s) => sum + s.pending_orders, 0)}
              </div>
              <p className="text-sm text-gray-500 mt-1">Awaiting admin action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(salesmanStats.reduce((sum, s) => sum + s.total_order_value, 0))}
              </div>
              <p className="text-sm text-gray-500 mt-1">Approved orders only</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="performance">Performance & Analytics</TabsTrigger>
            <TabsTrigger value="list">Salesman List</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Salesman Performance Overview</CardTitle>
                <CardDescription>
                  Order statistics and performance metrics for each salesman
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : salesmanStats.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data yet</h3>
                    <p className="text-gray-500">Salesmen haven&apos;t created any orders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salesmanStats.map((stat) => (
                      <Card key={stat.salesman_id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{stat.salesman_name}</h3>
                              <p className="text-sm text-gray-500">{stat.salesman_email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadSalesmanOrders(stat.salesman_id)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Orders
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-600 font-medium mb-1">Total Orders</p>
                              <p className="text-2xl font-bold text-blue-900">{stat.total_orders}</p>
                            </div>

                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <p className="text-xs text-yellow-600 font-medium mb-1">Pending</p>
                              <p className="text-2xl font-bold text-yellow-900">{stat.pending_orders}</p>
                            </div>

                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-xs text-green-600 font-medium mb-1">Approved</p>
                              <p className="text-2xl font-bold text-green-900">{stat.approved_orders}</p>
                            </div>

                            <div className="bg-red-50 p-3 rounded-lg">
                              <p className="text-xs text-red-600 font-medium mb-1">Rejected</p>
                              <p className="text-2xl font-bold text-red-900">{stat.rejected_orders}</p>
                            </div>

                            <div className="bg-indigo-50 p-3 rounded-lg">
                              <p className="text-xs text-indigo-600 font-medium mb-1">Order Value</p>
                              <p className="text-lg font-bold text-indigo-900">{formatCurrency(stat.approved_order_value)}</p>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Approval Rate:</span>
                              <span className="font-semibold text-gray-900">
                                {stat.total_orders > 0
                                  ? `${((stat.approved_orders / stat.total_orders) * 100).toFixed(1)}%`
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salesman List Tab */}
          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  All Salesmen ({salesmen.length})
                </CardTitle>
                <CardDescription>
                  Manage salesman accounts and credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : salesmen.length === 0 ? (
                  <div className="text-center py-12">
                    <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No salesmen found</h3>
                    <p className="text-gray-500">Create your first salesman to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesmen.map((salesman) => {
                        const stats = salesmanStats.find(s => s.salesman_id === salesman._id);
                        return (
                          <TableRow key={salesman._id}>
                            <TableCell className="font-medium">
                              <div>
                                <p className="font-semibold">{salesman.name}</p>
                                {stats && (
                                  <p className="text-xs text-gray-500">
                                    {stats.total_orders} orders • {formatCurrency(stats.approved_order_value)} value
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{salesman.email}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800">
                                {salesman.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {stats && stats.total_orders > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => loadSalesmanOrders(salesman._id!)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingSalesman(salesman);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteSalesman(salesman._id!)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Orders Dialog */}
        <Dialog open={isViewOrdersDialogOpen} onOpenChange={setIsViewOrdersDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>Salesman Orders</DialogTitle>
              <DialogDescription>
                {selectedSalesman && `All orders from ${selectedSalesman.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {salesmanOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500">This salesman hasn&apos;t created any orders yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesmanOrders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-sm text-gray-500">{order.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.products.map((p, idx) => (
                              <div key={idx} className="text-gray-600">
                                {p.product_name} x {p.quantity}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Salesman Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Edit Salesman</DialogTitle>
              <DialogDescription>
                Update salesman information.
              </DialogDescription>
            </DialogHeader>
            {editingSalesman && (
              <form onSubmit={handleEditSalesman} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingSalesman.name}
                    onChange={(e) => setEditingSalesman({ ...editingSalesman, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-email">Email Address *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingSalesman.email}
                    onChange={(e) => setEditingSalesman({ ...editingSalesman, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Update Salesman
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}