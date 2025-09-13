'use client';

import { useEffect, useState } from 'react';
import { User, Product, Assignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Users, Package, Plus, IndianRupee, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function SalesmenPage() {
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<User | null>(null);
  const [editingSalesman, setEditingSalesman] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [newSalesman, setNewSalesman] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [newAssignment, setNewAssignment] = useState({
    productId: '',
    quantity: '',
    sellingPricePerUnit: '',
  });

  useEffect(() => {
    loadSalesmen();
    loadProducts();
    loadAssignments();
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
      const token = getAuthToken();
      const response = await fetch('/api/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
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
          role: 'Salesman'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSalesmen(prev => [data.user, ...prev]);
        setNewSalesman({ name: '', email: '', password: '' });
        setIsAddDialogOpen(false);
        toast.success('Salesman created successfully');
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
      } else {
        toast.error(data.error || 'Failed to delete salesman');
      }
    } catch (error) {
      console.error('Error deleting salesman:', error);
      toast.error('Failed to delete salesman');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSalesman || !newAssignment.productId || !newAssignment.quantity || !newAssignment.sellingPricePerUnit) {
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
          salesmanId: selectedSalesman._id,
          productId: newAssignment.productId,
          quantity: parseInt(newAssignment.quantity),
          sellingPricePerUnit: parseFloat(newAssignment.sellingPricePerUnit),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAssignments(prev => [data.assignment, ...prev]);
        setNewAssignment({ productId: '', quantity: '', sellingPricePerUnit: '' });
        setIsAssignDialogOpen(false);
        toast.success('Product assigned successfully');
        // Reload products to get updated stock
        loadProducts();
      } else {
        toast.error(data.error || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAssignments(prev => prev.filter(a => a._id !== assignmentId));
        toast.success('Assignment deleted successfully');
        // Reload products to get updated stock
        loadProducts();
      } else {
        toast.error(data.error || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getProductName = (productId: string | Product) => {
    if (typeof productId === 'object' && productId.name) {
      return productId.name;
    }
    const product = products.find(p => p._id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const getSalesmanName = (salesmanId: string | User) => {
    if (typeof salesmanId === 'object' && salesmanId.name) {
      return salesmanId.name;
    }
    const salesman = salesmen.find(s => s._id === salesmanId);
    return salesman ? salesman.name : 'Unknown Salesman';
  };

  const selectedProduct = products.find(p => p._id === newAssignment.productId);

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              Salesmen Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage salesmen and assign products with custom pricing
            </p>
          </div>
          
          <div className="flex gap-2">
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

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                  <Package className="h-4 w-4 mr-2" />
                  Assign Product
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Assign Product to Salesman</DialogTitle>
                  <DialogDescription>
                    Select a salesman, product, quantity, and set the selling price.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div>
                    <Label htmlFor="salesman">Salesman *</Label>
                    <Select
                      value={selectedSalesman?._id || ''}
                      onValueChange={(value) => {
                        const salesman = salesmen.find(s => s._id === value);
                        setSelectedSalesman(salesman || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a salesman" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesmen.map((salesman) => (
                          <SelectItem key={salesman._id} value={salesman._id!}>
                            {salesman.name} ({salesman.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="product">Product *</Label>
                    <Select
                      value={newAssignment.productId}
                      onValueChange={(value) => setNewAssignment({ ...newAssignment, productId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.filter(product => product.totalStock > 0).map((product) => (
                          <SelectItem key={product._id} value={product._id!}>
                            {product.name} (Stock: {product.totalStock} units)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={selectedProduct?.totalStock || 999999}
                      value={newAssignment.quantity}
                      onChange={(e) => setNewAssignment({ ...newAssignment, quantity: e.target.value })}
                      placeholder="Enter quantity to assign"
                      required
                    />
                    {selectedProduct && (
                      <p className="text-sm text-gray-500 mt-1">
                        Available stock: {selectedProduct.totalStock} units
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="sellingPrice" className="flex items-center space-x-1">
                      <IndianRupee className="h-4 w-4" />
                      <span>Selling Price Per Unit (INR) *</span>
                    </Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAssignment.sellingPricePerUnit}
                      onChange={(e) => setNewAssignment({ ...newAssignment, sellingPricePerUnit: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    {selectedProduct && (
                      <p className="text-sm text-gray-500 mt-1">
                        Manufacturing cost: {formatCurrency(selectedProduct.manufacturingCost)} per unit
                      </p>
                    )}
                  </div>

                  {selectedProduct && newAssignment.quantity && newAssignment.sellingPricePerUnit && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Assignment Summary</h4>
                      <div className="space-y-1 text-sm">
                        <p>Total Cost: {formatCurrency(selectedProduct.manufacturingCost * parseInt(newAssignment.quantity))}</p>
                        <p>Total Selling Price: {formatCurrency(parseFloat(newAssignment.sellingPricePerUnit) * parseInt(newAssignment.quantity))}</p>
                        <p className="font-medium text-green-600">
                          Profit Margin: {formatCurrency((parseFloat(newAssignment.sellingPricePerUnit) - selectedProduct.manufacturingCost) * parseInt(newAssignment.quantity))}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAssignDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Assign Product
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Salesmen Card */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Salesmen ({salesmen.length})
              </CardTitle>
              <CardDescription>
                All registered salesmen in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : salesmen.length === 0 ? (
                <div className="text-center py-8">
                  <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No salesmen found</h3>
                  <p className="text-gray-500">Create your first salesman to get started.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {salesmen.map((salesman) => (
                    <div key={salesman._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{salesman.name}</h4>
                        <p className="text-sm text-gray-500">{salesman.email}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSalesman(salesman);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSalesman(salesman._id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Assignments Card */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Active Assignments ({assignments.length})
              </CardTitle>
              <CardDescription>
                Current product assignments to salesmen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                  <p className="text-gray-500">Assign products to salesmen to get started.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {assignments.map((assignment) => (
                    <div key={assignment._id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {getProductName(assignment.productId)}
                        </h4>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment._id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Salesman: {getSalesmanName(assignment.salesman_id)}</p>
                        <p>Quantity: {assignment.quantity} units</p>
                        <p>Selling Price: {formatCurrency(assignment.sellingPricePerUnit)} per unit</p>
                        <p className="font-medium">Total Value: {formatCurrency(assignment.quantity * assignment.sellingPricePerUnit)}</p>
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