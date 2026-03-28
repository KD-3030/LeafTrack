'use client';

import { useState, useEffect } from 'react';
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
import { Package, Plus, Edit, Trash2, Search, IndianRupee } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface RawMaterial {
  _id: string;
  name: string;
  description?: string;
  unit: string;
  base_cost_per_unit: number;
  current_stock?: number;
  min_stock_level?: number;
  supplier?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    unit: 'kg',
    base_cost_per_unit: '',
    current_stock: '',
    min_stock_level: '',
    supplier: '',
  });

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('leaftrack_token');
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('is_active', statusFilter);
      }

      const response = await fetch(`/api/raw-materials?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMaterials(data.materials);
      } else {
        toast.error(data.error || 'Failed to fetch materials');
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newMaterial,
          base_cost_per_unit: parseFloat(newMaterial.base_cost_per_unit),
          current_stock: newMaterial.current_stock ? parseFloat(newMaterial.current_stock) : 0,
          min_stock_level: newMaterial.min_stock_level ? parseFloat(newMaterial.min_stock_level) : 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Raw material created successfully');
        setIsAddDialogOpen(false);
        setNewMaterial({
          name: '',
          description: '',
          unit: 'kg',
          base_cost_per_unit: '',
          current_stock: '',
          min_stock_level: '',
          supplier: '',
        });
        fetchMaterials();
      } else {
        toast.error(data.error || 'Failed to create material');
      }
    } catch (error) {
      console.error('Error creating material:', error);
      toast.error('Failed to create material');
    }
  };

  const handleEditMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/raw-materials/${editingMaterial._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingMaterial),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Raw material updated successfully');
        setIsEditDialogOpen(false);
        setEditingMaterial(null);
        fetchMaterials();
      } else {
        toast.error(data.error || 'Failed to update material');
      }
    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('Failed to update material');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this raw material?')) return;

    try {
      const token = localStorage.getItem('leaftrack_token');
      const response = await fetch(`/api/raw-materials/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Raw material deleted successfully');
        fetchMaterials();
      } else {
        toast.error(data.error || 'Failed to delete material');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading raw materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Raw Materials</h1>
          <p className="text-gray-500 mt-1">Manage raw materials for BOM calculations</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Raw Material</DialogTitle>
              <DialogDescription>
                Create a new raw material for use in BOM calculations
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Material Name *</Label>
                  <Input
                    id="name"
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                    placeholder="e.g., Tea Leaves, Sugar, Packaging Material"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={newMaterial.unit}
                    onValueChange={(value) => setNewMaterial({ ...newMaterial, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="gram">Gram (g)</SelectItem>
                      <SelectItem value="liter">Liter (L)</SelectItem>
                      <SelectItem value="piece">Piece (pcs)</SelectItem>
                      <SelectItem value="meter">Meter (m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="cost">Base Cost per Unit (₹) *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMaterial.base_cost_per_unit}
                    onChange={(e) => setNewMaterial({ ...newMaterial, base_cost_per_unit: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="stock">Current Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMaterial.current_stock}
                    onChange={(e) => setNewMaterial({ ...newMaterial, current_stock: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="min_stock">Min Stock Level</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMaterial.min_stock_level}
                    onChange={(e) => setNewMaterial({ ...newMaterial, min_stock_level: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={newMaterial.supplier}
                    onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="">
                  Create Material
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
                  placeholder="Search materials..."
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
                variant={statusFilter === 'true' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('true')}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'false' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('false')}
              >
                Inactive
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Materials ({filteredMaterials.length})</CardTitle>
          <CardDescription>Manage your inventory of raw materials</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No materials found</h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first raw material'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => (
                  <TableRow key={material._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{material.name}</div>
                        {material.description && (
                          <div className="text-sm text-gray-500">{material.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        {material.base_cost_per_unit.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{material.current_stock || 0} {material.unit}</div>
                        {material.min_stock_level && material.current_stock !== undefined && material.current_stock < material.min_stock_level && (
                          <Badge variant="destructive" className="text-xs mt-1">Low Stock</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{material.supplier || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={material.is_active ? 'default' : 'secondary'}>
                        {material.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingMaterial(material);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMaterial(material._id)}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Raw Material</DialogTitle>
            <DialogDescription>
              Update raw material information
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <form onSubmit={handleEditMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-name">Material Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingMaterial.name}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingMaterial.description || ''}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-unit">Unit *</Label>
                  <Select
                    value={editingMaterial.unit}
                    onValueChange={(value) => setEditingMaterial({ ...editingMaterial, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="gram">Gram (g)</SelectItem>
                      <SelectItem value="liter">Liter (L)</SelectItem>
                      <SelectItem value="piece">Piece (pcs)</SelectItem>
                      <SelectItem value="meter">Meter (m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-cost">Base Cost per Unit (₹) *</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingMaterial.base_cost_per_unit}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, base_cost_per_unit: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-stock">Current Stock</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingMaterial.current_stock || 0}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, current_stock: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-min-stock">Min Stock Level</Label>
                  <Input
                    id="edit-min-stock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingMaterial.min_stock_level || 0}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, min_stock_level: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="edit-supplier">Supplier</Label>
                  <Input
                    id="edit-supplier"
                    value={editingMaterial.supplier || ''}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, supplier: e.target.value })}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editingMaterial.is_active.toString()}
                    onValueChange={(value) => setEditingMaterial({ ...editingMaterial, is_active: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="">
                  Update Material
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
