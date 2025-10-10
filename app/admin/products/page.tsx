'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Edit, Trash2, IndianRupee, Package2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProductsPage() {
  const { } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturingCost: '',
    totalStock: '',
    hsn_code: '',
    gst_rate: '18',
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('leaftrack_token');
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products');
      const data = await response.json();
      
      console.log('📦 Products API Response:', data);
      
      if (data.success) {
        console.log('✅ Products loaded:', data.products.length);
        setProducts(data.products);
      } else {
        console.error('❌ Failed to load products:', data.error);
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
      toast.error('Error loading products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProduct.name || !newProduct.manufacturingCost || !newProduct.totalStock || !newProduct.hsn_code) {
      toast.error('Please fill in all fields');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProduct.name,
          manufacturingCost: parseFloat(newProduct.manufacturingCost),
          totalStock: parseInt(newProduct.totalStock),
          hsn_code: newProduct.hsn_code,
          gst_rate: parseFloat(newProduct.gst_rate),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProducts([data.product, ...products]);
        setNewProduct({ name: '', manufacturingCost: '', totalStock: '', hsn_code: '', gst_rate: '18' });
        setIsDialogOpen(false);
        toast.success('Product created successfully');
      } else {
        toast.error(data.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Error creating product');
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const response = await fetch(`/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingProduct.name,
          manufacturingCost: editingProduct.manufacturingCost,
          totalStock: editingProduct.totalStock,
          hsn_code: editingProduct.hsn_code,
          gst_rate: editingProduct.gst_rate,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProducts(products.map(p => p._id === editingProduct._id ? data.product : p));
        setEditingProduct(null);
        setIsEditDialogOpen(false);
        toast.success('Product updated successfully');
      } else {
        toast.error(data.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error updating product');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setProducts(products.filter(p => p._id !== productId));
        toast.success('Product deleted successfully');
      } else {
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="h-8 w-8 text-green-600" />
              Products Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your product inventory with manufacturing costs and stock levels
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Create a new product with manufacturing cost and initial stock.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="manufacturingCost" className="flex items-center space-x-1">
                    <IndianRupee className="h-4 w-4" />
                    <span>Manufacturing Cost (INR) *</span>
                  </Label>
                  <Input
                    id="manufacturingCost"
                    type="number"
                    step="0.01"
                    value={newProduct.manufacturingCost}
                    onChange={(e) => setNewProduct({ ...newProduct, manufacturingCost: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="totalStock">Initial Stock Quantity *</Label>
                  <Input
                    id="totalStock"
                    type="number"
                    value={newProduct.totalStock}
                    onChange={(e) => setNewProduct({ ...newProduct, totalStock: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="hsn_code">HSN Code *</Label>
                  <Input
                    id="hsn_code"
                    value={newProduct.hsn_code}
                    onChange={(e) => setNewProduct({ ...newProduct, hsn_code: e.target.value })}
                    placeholder="Enter HSN code"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="gst_rate">GST Rate (%) *</Label>
                  <Select
                    value={newProduct.gst_rate}
                    onValueChange={(value) => setNewProduct({ ...newProduct, gst_rate: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Create Product
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Products Overview
            </CardTitle>
            <CardDescription>
              View and manage all your products, their costs, and stock levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Manufacturing Cost</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>GST Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product._id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{formatCurrency(product.manufacturingCost)}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            (product.totalStock || 0) <= 10 ? 'text-red-600' : 
                            (product.totalStock || 0) <= 50 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {product.totalStock || 0} units
                          </span>
                        </TableCell>
                        <TableCell>{product.hsn_code}</TableCell>
                        <TableCell>{product.gst_rate}%</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProduct(product._id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {products.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-500">Create your first product to get started.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product information and manage stock levels.
              </DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-manufacturingCost" className="flex items-center space-x-1">
                    <IndianRupee className="h-4 w-4" />
                    <span>Manufacturing Cost (INR) *</span>
                  </Label>
                  <Input
                    id="edit-manufacturingCost"
                    type="number"
                    step="0.01"
                    value={editingProduct.manufacturingCost}
                    onChange={(e) => setEditingProduct({ ...editingProduct, manufacturingCost: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-totalStock">Total Stock *</Label>
                  <Input
                    id="edit-totalStock"
                    type="number"
                    value={editingProduct.totalStock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, totalStock: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-hsn_code">HSN Code *</Label>
                  <Input
                    id="edit-hsn_code"
                    value={editingProduct.hsn_code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, hsn_code: e.target.value })}
                    placeholder="Enter HSN code"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-gst_rate">GST Rate (%) *</Label>
                  <Select
                    value={editingProduct.gst_rate.toString()}
                    onValueChange={(value) => setEditingProduct({ ...editingProduct, gst_rate: parseFloat(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
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
                    Update Product
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