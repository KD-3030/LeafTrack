'use client';

import { useEffect, useState, useMemo } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  IndianRupee, 
  Package2, 
  Search, 
  RefreshCw, 
  UserCheck, 
  Building2, 
  ShieldAlert, 
  Boxes, 
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';

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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Extra stock monitoring state
  const [activeTab, setActiveTab] = useState('products');
  const [distInventory, setDistInventory] = useState<any[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [peSearch, setPeSearch] = useState('');
  const [distSearch, setDistSearch] = useState('');

  useEffect(() => {
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    loadAllInventory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('leaftrack_token');
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products?page=${currentPage}&limit=${itemsPerPage}`);
      const data = await response.json();
      
      console.log('📦 Products API Response:', data);
      
      if (data.success) {
        console.log('✅ Products loaded:', data.products.length);
        setProducts(data.products);
        if (data.pagination) {
          setCurrentPage(data.pagination.currentPage);
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
        }
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

  const loadDistributorStock = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch('/api/distributor-inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setDistInventory(data.inventory || []);
      } else {
        console.error('❌ Failed to load distributor inventory:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading distributor inventory:', error);
    }
  };

  const loadAllInventory = async () => {
    setIsLoadingInventory(true);
    await loadDistributorStock();
    setIsLoadingInventory(false);
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
        loadProducts(); // Reload to refresh pagination
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
        loadProducts(); // Reload to refresh pagination
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
        loadProducts(); // Reload to refresh pagination
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

  // Group distributor inventories by assigned Primary Executive (pe_id) and product
  const peStockPools = useMemo(() => {
    const map = new Map<string, {
      pe_id: string;
      pe_name: string;
      pe_email: string;
      pe_phone: string;
      product_id: string;
      product_name: string;
      product_hsn: string;
      quantity: number;
    }>();

    for (const item of distInventory) {
      if (!item.pe_id) continue; // Only sum stocks of distributors assigned to a PE
      const key = `${item.pe_id}_${item.product_id}`;
      const existing = map.get(key);
      const stock = parseFloat(item.current_stock) || 0;

      if (existing) {
        existing.quantity += stock;
      } else {
        map.set(key, {
          pe_id: item.pe_id,
          pe_name: item.pe_name || 'Unassigned Executive',
          pe_email: item.pe_email || '',
          pe_phone: item.pe_phone || '',
          product_id: item.product_id,
          product_name: item.product_name || 'Unknown Product',
          product_hsn: item.product_hsn || 'N/A',
          quantity: stock,
        });
      }
    }

    return Array.from(map.values());
  }, [distInventory]);

  // Client-side search filters
  const filteredPeStockPools = useMemo(() => {
    const q = peSearch.toLowerCase();
    return peStockPools.filter(item => {
      return item.pe_name.toLowerCase().includes(q) ||
             item.pe_email.toLowerCase().includes(q) ||
             item.product_name.toLowerCase().includes(q);
    });
  }, [peStockPools, peSearch]);

  const filteredDistInventory = useMemo(() => {
    const q = distSearch.toLowerCase();
    return distInventory.filter(item => {
      const distName = item.distributor_name || '';
      const prodName = item.product_name || '';
      return distName.toLowerCase().includes(q) || 
             prodName.toLowerCase().includes(q);
    });
  }, [distInventory, distSearch]);

  // Calculate statistics for PE tab automatically
  const peStats = useMemo(() => {
    const totalRemaining = peStockPools.reduce((sum, item) => sum + item.quantity, 0);
    const activePEs = new Set(peStockPools.map(item => item.pe_id).filter(Boolean)).size;
    const assignedProducts = new Set(peStockPools.map(item => item.product_id).filter(Boolean)).size;
    return { totalRemaining, activePEs, assignedProducts };
  }, [peStockPools]);

  // Calculate statistics for Distributor tab
  const distStats = useMemo(() => {
    const totalStock = distInventory.reduce((sum, item) => sum + (parseFloat(item.current_stock) || 0), 0);
    const lowStock = distInventory.filter(item => {
      const stock = parseFloat(item.current_stock) || 0;
      return stock > 0 && stock < 20;
    }).length;
    const outOfStock = distInventory.filter(item => (parseFloat(item.current_stock) || 0) === 0).length;
    return {
      distributorCount: new Set(distInventory.map(item => item.distributor_id).filter(Boolean)).size,
      totalStock,
      lowStock,
      outOfStock
    };
  }, [distInventory]);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl border shadow-sm">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Boxes className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 animate-pulse" />
              Products &amp; Inventory Workspace
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2">
              Consolidated workspace to monitor main product catalogs, Primary Executive stock allocations, and distributor warehouses.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await Promise.all([loadProducts(), loadAllInventory()]);
                toast.success('Inventory state successfully refreshed');
              }}
              disabled={isLoading || isLoadingInventory}
              className="h-10 hover:bg-gray-50 transition-all active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isLoadingInventory) ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>

            {activeTab === 'products' && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 bg-green-600 hover:bg-green-700 text-white font-medium shadow-md hover:shadow-lg transition-all active:scale-95">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
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
                    
                    <div className="flex justify-end space-x-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                        Create Product
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Unified Tabs Area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-xl bg-gray-100 p-1 rounded-xl">
            <TabsTrigger 
              value="products" 
              className="rounded-lg gap-2 text-sm py-2 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all"
            >
              <Package className="h-4 w-4" />
              <span>Company Catalog</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pe-stock" 
              className="rounded-lg gap-2 text-sm py-2 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all"
            >
              <UserCheck className="h-4 w-4" />
              <span>PE Stock Pools</span>
            </TabsTrigger>
            <TabsTrigger 
              value="dist-stock" 
              className="rounded-lg gap-2 text-sm py-2 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span>Distributor Stock</span>
            </TabsTrigger>
          </TabsList>

          {/* ────── TAB 1: COMPANY CATALOG ────── */}
          <TabsContent value="products" className="space-y-4 outline-none">
            <Card className="bg-white shadow-sm border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <Package2 className="h-5 w-5 text-green-600" />
                  Product Catalog &amp; Direct Stock
                </CardTitle>
                <CardDescription>
                  View and manage the core manufactured products, total inventory capacities, and default GST structures.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center py-16 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    <p className="text-gray-400 text-sm font-medium">Loading catalog items...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <Table>
                        <TableHeader className="bg-gray-50/75">
                          <TableRow>
                            <TableHead className="font-semibold text-gray-700">Product Name</TableHead>
                            <TableHead className="font-semibold text-gray-700">Mfg Cost</TableHead>
                            <TableHead className="font-semibold text-gray-700">Central Stock</TableHead>
                            <TableHead className="hidden md:table-cell font-semibold text-gray-700">HSN Code</TableHead>
                            <TableHead className="hidden sm:table-cell font-semibold text-gray-700">GST Rate</TableHead>
                            <TableHead className="w-24 text-right font-semibold text-gray-700">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product._id} className="hover:bg-gray-50/50 transition-colors">
                              <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                              <TableCell className="text-gray-600">{formatCurrency(product.manufacturingCost)}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  (product.totalStock || 0) <= 10 
                                    ? 'bg-red-50 text-red-700 border border-red-100' 
                                    : (product.totalStock || 0) <= 50 
                                      ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {product.totalStock || 0} units
                                </span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-gray-600 font-mono">{product.hsn_code}</TableCell>
                              <TableCell className="hidden sm:table-cell text-gray-600">{product.gst_rate}%</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingProduct(product);
                                      setIsEditDialogOpen(true);
                                    }}
                                    className="h-8 w-8 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteProduct(product._id!)}
                                    className="h-8 w-8 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {!isLoading && products.length > 0 && (
                      <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                        itemName="products"
                      />
                    )}
                    
                    {products.length === 0 && !isLoading && (
                      <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-gray-800 mb-1">No products cataloged</h3>
                        <p className="text-gray-500 text-xs max-w-sm mx-auto">Click "Add Product" to create your first central product definition.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ────── TAB 2: PE STOCK POOLS (AUTOMATED FROM DISPATCHES) ────── */}
          <TabsContent value="pe-stock" className="space-y-6 outline-none">
            
            {/* Stats widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-white border hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-xl text-green-600">
                    <Boxes className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Territory Stock</p>
                    <p className="text-2xl font-bold text-gray-800">{peStats.totalRemaining.toLocaleString()} units</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Executives</p>
                    <p className="text-2xl font-bold text-gray-800">{peStats.activePEs} PEs with stock</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dispatched Products</p>
                    <p className="text-2xl font-bold text-gray-800">{peStats.assignedProducts} distinct products</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white shadow-sm border">
              <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    Primary Executive Stock Pools (Derived Automatically)
                  </CardTitle>
                  <CardDescription>
                    Real-time stock pools holding in each PE's territory. Calculated automatically based on the products dispatched to their assigned distributors.
                  </CardDescription>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by PE Name or Product..."
                    value={peSearch}
                    onChange={(e) => setPeSearch(e.target.value)}
                    className="pl-9 h-10 border-gray-200 rounded-lg focus-visible:ring-green-500 bg-gray-50/50"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {isLoadingInventory ? (
                  <div className="flex flex-col justify-center items-center py-16 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    <p className="text-gray-400 text-sm font-medium">Loading executive inventories...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <Table>
                        <TableHeader className="bg-gray-50/75">
                          <TableRow>
                            <TableHead className="font-semibold text-gray-700">Primary Executive</TableHead>
                            <TableHead className="font-semibold text-gray-700">Product</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right">Territory Stock Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPeStockPools.map((item) => {
                            const peName = item.pe_name;
                            const peEmail = item.pe_email;
                            const pePhone = item.pe_phone;
                            
                            const prodName = item.product_name;
                            const prodHsn = item.product_hsn;

                            const qty = item.quantity;

                            return (
                              <TableRow key={`${item.pe_id}_${item.product_id}`} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="py-3">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-900">{peName}</span>
                                    {peEmail && <span className="text-gray-400 text-xs">{peEmail}</span>}
                                    {pePhone && <span className="text-gray-400 text-[10px]">{pePhone}</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">{prodName}</span>
                                    <span className="text-gray-400 text-xs font-mono">HSN: {prodHsn}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                  <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold shadow-sm border ${
                                    qty === 0 
                                      ? 'bg-red-50 text-red-700 border-red-100' 
                                      : qty <= 15 
                                        ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' 
                                        : 'bg-emerald-50/60 text-emerald-700 border-emerald-100'
                                  }`}>
                                    {qty.toLocaleString()} units available
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {filteredPeStockPools.length === 0 && (
                      <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-gray-800 mb-1">No stocks reflected under Primary Executives</h3>
                        <p className="text-gray-500 text-xs max-w-sm mx-auto">
                          Distribute stock to distributors who are assigned to PEs, and it will reflect here automatically.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ────── TAB 3: DISTRIBUTOR STOCK ────── */}
          <TabsContent value="dist-stock" className="space-y-6 outline-none">
            
            {/* Stats widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-white border hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-xl text-green-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Distributor Aggregate Stock</p>
                    <p className="text-2xl font-bold text-gray-800">{distStats.totalStock.toLocaleString()} units</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Low Stock Warnings</p>
                    <p className="text-2xl font-bold text-amber-700">{distStats.lowStock} alerts (&lt;20 units)</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl text-red-600">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Out of Stock Items</p>
                    <p className="text-2xl font-bold text-red-700">{distStats.outOfStock} items empty</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white shadow-sm border">
              <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                    <Building2 className="h-5 w-5 text-green-600" />
                    Distributor Warehouses Inventory
                  </CardTitle>
                  <CardDescription>
                    Real-time view of remaining inventory levels stored across individual distributor channels.
                  </CardDescription>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by Distributor or Product..."
                    value={distSearch}
                    onChange={(e) => setDistSearch(e.target.value)}
                    className="pl-9 h-10 border-gray-200 rounded-lg focus-visible:ring-green-500 bg-gray-50/50"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {isLoadingInventory ? (
                  <div className="flex flex-col justify-center items-center py-16 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    <p className="text-gray-400 text-sm font-medium">Loading distributor inventories...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <Table>
                        <TableHeader className="bg-gray-50/75">
                          <TableRow>
                            <TableHead className="font-semibold text-gray-700">Distributor</TableHead>
                            <TableHead className="font-semibold text-gray-700">Product</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right">Current Stock Level</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right">Stock Status</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right hidden md:table-cell">Last Restocked</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDistInventory.map((item) => {
                            const stock = parseFloat(item.current_stock) || 0;
                            
                            // Badge configuration based on stock level
                            let statusBadge = (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Healthy
                              </span>
                            );
                            if (stock === 0) {
                              statusBadge = (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-155 animate-pulse">
                                  Out of Stock
                                </span>
                              );
                            } else if (stock < 20) {
                              statusBadge = (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                  Low Stock
                                </span>
                              );
                            }

                            return (
                              <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-gray-400 hidden sm:block" />
                                    <span className="font-bold text-gray-900">{item.distributor_name || 'Unmapped Distributor'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 font-medium text-gray-800">
                                  {item.product_name || 'Unmapped Product'}
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                  <span className={`font-bold text-sm ${
                                    stock === 0 
                                      ? 'text-red-600' 
                                      : stock < 20 
                                        ? 'text-amber-600' 
                                        : 'text-gray-900'
                                  }`}>
                                    {stock.toLocaleString()} units
                                  </span>
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                  {statusBadge}
                                </TableCell>
                                <TableCell className="py-3 text-right text-gray-500 text-xs hidden md:table-cell font-mono">
                                  {item.last_restocked_at ? new Date(item.last_restocked_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  }) : 'N/A'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {filteredDistInventory.length === 0 && (
                      <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-gray-800 mb-1">No distributor stocks recorded</h3>
                        <p className="text-gray-500 text-xs max-w-sm mx-auto">
                          {distSearch ? 'Try clearing your search query' : 'Stocks will appear here as distributors make purchases.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="edit-totalStock">Central Stock *</Label>
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
                
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
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