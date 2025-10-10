'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Layers, Plus, Edit, Trash2, Search, IndianRupee, Package, CheckCircle, Clock, Archive } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Product {
  _id: string;
  name: string;
  manufacturingCost: number;
}

interface RawMaterial {
  _id: string;
  name: string;
  unit: string;
  base_cost_per_unit: number;
}

interface BOMMaterial {
  material_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
}

interface BOM {
  _id: string;
  product_id: string;
  product_name: string;
  version: number;
  materials: BOMMaterial[];
  total_manufacturing_cost: number;
  overhead_percentage: number;
  final_cost: number;
  notes?: string;
  status: string;
  created_by_name: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export default function BOMsPage() {
  const router = useRouter();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<BOMMaterial[]>([]);
  const [overheadPercentage, setOverheadPercentage] = useState('10');
  const [bomNotes, setBomNotes] = useState('');
  const [bomStatus, setBomStatus] = useState('draft');

  useEffect(() => {
    fetchBOMs();
    fetchProducts();
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/boms?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setBoms(data.boms);
      } else {
        toast.error(data.error || 'Failed to fetch BOMs');
      }
    } catch (error) {
      console.error('Error fetching BOMs:', error);
      toast.error('Failed to fetch BOMs');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/raw-materials?is_active=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(data.materials);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleAddMaterial = () => {
    if (!materials || materials.length === 0) {
      toast.error('Please add raw materials first');
      return;
    }
    
    setSelectedMaterials([
      ...selectedMaterials,
      {
        material_id: '',
        material_name: '',
        quantity: 1,
        unit: '',
        cost_per_unit: 0,
        total_cost: 0,
      },
    ]);
  };

  const handleRemoveMaterial = (index: number) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string | number) => {
    const newMaterials = [...selectedMaterials];
    
    if (field === 'material_id') {
      const material = materials.find(m => m._id === value);
      if (material) {
        newMaterials[index] = {
          ...newMaterials[index],
          material_id: material._id,
          material_name: material.name,
          unit: material.unit,
          cost_per_unit: material.base_cost_per_unit,
          total_cost: newMaterials[index].quantity * material.base_cost_per_unit,
        };
      }
    } else if (field === 'quantity') {
      newMaterials[index].quantity = parseFloat(value as string) || 0;
      newMaterials[index].total_cost = newMaterials[index].quantity * newMaterials[index].cost_per_unit;
    } else if (field === 'cost_per_unit') {
      newMaterials[index].cost_per_unit = parseFloat(value as string) || 0;
      newMaterials[index].total_cost = newMaterials[index].quantity * newMaterials[index].cost_per_unit;
    }
    
    setSelectedMaterials(newMaterials);
  };

  const calculateTotals = () => {
    const materialCost = selectedMaterials.reduce((sum, m) => {
      const total = m.total_cost || 0;
      return sum + total;
    }, 0);
    const overhead = (materialCost * parseFloat(overheadPercentage || '0')) / 100;
    const finalCost = materialCost + overhead;
    
    return { materialCost, overhead, finalCost };
  };

  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (selectedMaterials.length === 0) {
      toast.error('Please add at least one material');
      return;
    }

    const invalidMaterial = selectedMaterials.find(m => !m.material_id || m.quantity <= 0);
    if (invalidMaterial) {
      toast.error('Please fill in all material details');
      return;
    }

    try {
      const token = localStorage.getItem('leaftrack_token');
      
      const response = await fetch('/api/boms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedProduct,
          materials: selectedMaterials,
          overhead_percentage: parseFloat(overheadPercentage),
          notes: bomNotes,
          status: bomStatus,
          is_current: bomStatus === 'active',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('BOM created successfully' + (data.bom.is_current ? ' and product cost updated!' : ''));
        setIsCreateDialogOpen(false);
        resetForm();
        fetchBOMs();
        fetchProducts(); // Refresh to get updated product costs
      } else {
        toast.error(data.error || 'Failed to create BOM');
      }
    } catch (error) {
      console.error('Error creating BOM:', error);
      toast.error('Failed to create BOM');
    }
  };

  const resetForm = () => {
    setSelectedProduct('');
    setSelectedMaterials([]);
    setOverheadPercentage('10');
    setBomNotes('');
    setBomStatus('draft');
  };

  const handleDeleteBOM = async (id: string) => {
    if (!confirm('Are you sure you want to delete this BOM?')) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/boms/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('BOM deleted successfully');
        fetchBOMs();
      } else {
        toast.error(data.error || 'Failed to delete BOM');
      }
    } catch (error) {
      console.error('Error deleting BOM:', error);
      toast.error('Failed to delete BOM');
    }
  };

  const getStatusBadge = (status: string, isCurrent: boolean) => {
    if (isCurrent) {
      return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Current</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'draft':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'archived':
        return <Badge variant="secondary"><Archive className="h-3 w-3 mr-1" />Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredBOMs = boms.filter(bom =>
    bom.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.created_by_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { materialCost, overhead, finalCost } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading BOMs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bill of Materials (BOM)</h1>
          <p className="text-gray-500 mt-1">Manage product BOMs and calculate manufacturing costs</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create BOM
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New BOM</DialogTitle>
              <DialogDescription>
                Define materials and quantities for product manufacturing cost calculation
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBOM} className="space-y-6">
              {/* Product Selection */}
              <div>
                <Label htmlFor="product">Select Product *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name} (Current Cost: ₹{(product.manufacturingCost || 0).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Materials */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Materials *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddMaterial}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Material
                  </Button>
                </div>
                
                {selectedMaterials.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No materials added yet</p>
                    <p className="text-sm text-gray-400">Click &quot;Add Material&quot; to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedMaterials.map((material, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-4">
                            <Label className="text-xs">Material</Label>
                            <Select
                              value={material.material_id}
                              onValueChange={(value) => handleMaterialChange(index, 'material_id', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.map((m) => (
                                  <SelectItem key={m._id} value={m._id}>
                                    {m.name} (₹{m.base_cost_per_unit}/{m.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="col-span-2">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={material.quantity}
                              onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Label className="text-xs">Unit</Label>
                            <Input
                              value={material.unit || '-'}
                              disabled
                              className="h-9 bg-gray-50"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Label className="text-xs">Cost/Unit</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={material.cost_per_unit}
                              onChange={(e) => handleMaterialChange(index, 'cost_per_unit', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          
                          <div className="col-span-1">
                            <Label className="text-xs">Total</Label>
                            <div className="h-9 flex items-center text-sm font-medium">
                              ₹{(material.total_cost || 0).toFixed(2)}
                            </div>
                          </div>
                          
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveMaterial(index)}
                              className="h-9 w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Cost Summary */}
              {selectedMaterials.length > 0 && (
                <Card className="bg-gray-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Cost Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Material Cost:</span>
                      <span className="font-medium">₹{materialCost.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Overhead:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={overheadPercentage}
                          onChange={(e) => setOverheadPercentage(e.target.value)}
                          className="w-20 h-8 text-right"
                        />
                        <span className="text-gray-600">%</span>
                        <span className="font-medium w-24 text-right">₹{overhead.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Final Manufacturing Cost:</span>
                      <span className="text-purple-600">₹{finalCost.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={bomStatus} onValueChange={setBomStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active (Set as Current)</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Setting as &quot;Active&quot; will update the product&apos;s manufacturing cost
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={bomNotes}
                    onChange={(e) => setBomNotes(e.target.value)}
                    placeholder="Optional notes about this BOM"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Create BOM
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by product, creator, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('draft')}
              >
                Draft
              </Button>
              <Button
                variant={statusFilter === 'archived' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('archived')}
              >
                Archived
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOMs Table */}
      <Card>
        <CardHeader>
          <CardTitle>BOMs ({filteredBOMs.length})</CardTitle>
          <CardDescription>View and manage product bill of materials</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBOMs.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No BOMs found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first BOM'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Material Cost</TableHead>
                  <TableHead>Overhead</TableHead>
                  <TableHead>Final Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBOMs.map((bom) => (
                  <TableRow key={bom._id}>
                    <TableCell className="font-medium">{bom.product_name}</TableCell>
                    <TableCell>v{bom.version}</TableCell>
                    <TableCell>{bom.materials.length} items</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        {(bom.total_manufacturing_cost || 0).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>{bom.overhead_percentage || 0}%</TableCell>
                    <TableCell>
                      <div className="flex items-center font-semibold text-purple-600">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        {(bom.final_cost || 0).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(bom.status, bom.is_current)}</TableCell>
                    <TableCell>{bom.created_by_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/boms/${bom._id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteBOM(bom._id)}
                          disabled={bom.is_current && bom.status === 'active'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
