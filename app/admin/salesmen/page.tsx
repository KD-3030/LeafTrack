'use client';

import { useEffect, useState } from 'react';
import { User, Product, Assignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Package, Edit, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function SalesmenPage() {
  const { user } = useAuth();
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<User | null>(null);
  const [editingSalesman, setEditingSalesman] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    product_id: '',
    quantity: '',
  });

  useEffect(() => {
    loadSalesmen();
    loadProducts();
    loadAssignments();
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
        const salesmenOnly = data.users.filter((user: User) => user.role === 'Salesman');
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

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await fetch('/api/assignments');
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
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
      } else {
        toast.error(data.error || 'Failed to delete salesman');
      }
    } catch (error) {
      console.error('Error deleting salesman:', error);
      toast.error('Failed to delete salesman');
    }
  };

  const handleAssignStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSalesman || !newAssignment.product_id || !newAssignment.quantity) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          salesman_id: selectedSalesman._id,
          product_id: newAssignment.product_id,
          quantity: parseInt(newAssignment.quantity),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAssignments([data.assignment, ...assignments]);
        toast.success('Stock assigned successfully');
        setNewAssignment({ product_id: '', quantity: '' });
        setSelectedSalesman(null);
      } else {
        toast.error(data.error || 'Failed to assign stock');
      }
    } catch (error) {
      console.error('Error assigning stock:', error);
      toast.error('Failed to assign stock');
    }
  };

  const getSalesmanAssignments = (salesmanId: string) => {
    return assignments.filter(assignment => assignment.salesman_id === salesmanId);
  };

  const getSalesmanSales = (salesmanId: string) => {
    // This would come from sales data when implemented
    return 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Salesmen Management</h1>
        <p className="text-gray-600 mt-2">Manage salesmen and assign stock allocations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Salesmen List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>Salesmen</span>
            </CardTitle>
            <CardDescription>
              All registered salesmen in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesmen.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No salesmen found. They can register via the signup page.
              </div>
            ) : (
              <div className="space-y-3">
                {salesmen.map((salesman) => {
                  const salesmanAssignments = getSalesmanAssignments(salesman._id || salesman.id);
                  const salesmanSales = getSalesmanSales(salesman._id || salesman.id);
                  return (
                    <div key={salesman._id || salesman.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{salesman.name}</h4>
                        <p className="text-sm text-gray-600">{salesman.email}</p>
                        <div className="flex space-x-4 text-xs">
                          <span className="text-blue-600">
                            {salesmanAssignments.length} assignments
                          </span>
                          <span className="text-green-600">
                            {salesmanSales} items sold
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {/* Edit Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSalesman(salesman);
                            setIsEditDialogOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {/* Assign Stock Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedSalesman(salesman)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Stock to {salesman.name}</DialogTitle>
                              <DialogDescription>
                                Select a product and quantity to assign to this salesman.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAssignStock} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="product">Product</Label>
                                <Select
                                  value={newAssignment.product_id}
                                  onValueChange={(value) => setNewAssignment({ ...newAssignment, product_id: value })}
                                  required
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product._id || product.id} value={product._id || product.id}>
                                        {product.name} (Stock: {product.stock_quantity})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                  id="quantity"
                                  type="number"
                                  value={newAssignment.quantity}
                                  onChange={(e) => setNewAssignment({ ...newAssignment, quantity: e.target.value })}
                                  placeholder="Enter quantity"
                                  required
                                />
                              </div>
                              
                              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                                Assign Stock
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>

                        {/* Delete Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSalesman(salesman._id || salesman.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Recent Assignments</span>
            </CardTitle>
            <CardDescription>
              Latest stock assignments to salesmen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No assignments found. Start assigning stock to salesmen.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 10).map((assignment) => (
                  <div key={assignment._id || assignment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{assignment.salesman?.name}</h4>
                      <p className="text-sm text-gray-600">{assignment.product?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">Qty: {assignment.quantity}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Salesman Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-blue-600" />
              <span>Edit Salesman</span>
            </DialogTitle>
            <DialogDescription>
              Update the salesman information.
            </DialogDescription>
          </DialogHeader>
          {editingSalesman && (
            <form onSubmit={handleEditSalesman} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  value={editingSalesman.name}
                  onChange={(e) => setEditingSalesman({ ...editingSalesman, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingSalesman.email}
                  onChange={(e) => setEditingSalesman({ ...editingSalesman, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editingSalesman.role}
                  onValueChange={(value: 'Admin' | 'Salesman') => setEditingSalesman({ ...editingSalesman, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salesman">Salesman</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Update Salesman
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}