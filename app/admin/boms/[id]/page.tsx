'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, IndianRupee, Package, Layers } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

export default function BOMDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bomId = params.id as string;

  const [bom, setBom] = useState<BOM | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<BOMMaterial[]>([]);
  const [overheadPercentage, setOverheadPercentage] = useState('10');
  const [bomNotes, setBomNotes] = useState('');
  const [bomStatus, setBomStatus] = useState('draft');

  useEffect(() => {
    fetchBOM();
    fetchProducts();
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomId]);

  const fetchBOM = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/boms/${bomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBom(data.bom);
        setSelectedProduct(data.bom.product_id);
        setSelectedMaterials(data.bom.materials || []);
        setOverheadPercentage(data.bom.overhead_percentage.toString());
        setBomNotes(data.bom.notes || '');
        setBomStatus(data.bom.status);
      } else {
        toast.error('Failed to fetch BOM details');
        router.push('/admin/boms');
      }
    } catch (error) {
      console.error('Error fetching BOM:', error);
      toast.error('Error loading BOM');
      router.push('/admin/boms');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const addMaterial = () => {
    if (materials.length === 0) {
      toast.error('No materials available');
      return;
    }

    const firstMaterial = materials[0];
    setSelectedMaterials([
      ...selectedMaterials,
      {
        material_id: firstMaterial._id,
        material_name: firstMaterial.name,
        quantity: 1,
        unit: firstMaterial.unit,
        cost_per_unit: firstMaterial.base_cost_per_unit,
        total_cost: firstMaterial.base_cost_per_unit,
      },
    ]);
  };

  const removeMaterial = (index: number) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof BOMMaterial, value: string | number) => {
    const updated = [...selectedMaterials];
    updated[index] = { ...updated[index], [field]: value };

    // If material_id changed, update related fields
    if (field === 'material_id') {
      const material = materials.find(m => m._id === value);
      if (material) {
        updated[index].material_name = material.name;
        updated[index].unit = material.unit;
        updated[index].cost_per_unit = material.base_cost_per_unit;
        updated[index].total_cost = updated[index].quantity * material.base_cost_per_unit;
      }
    }

    // If quantity or cost_per_unit changed, recalculate total_cost
    if (field === 'quantity' || field === 'cost_per_unit') {
      updated[index].total_cost = updated[index].quantity * updated[index].cost_per_unit;
    }

    setSelectedMaterials(updated);
  };

  const handleSave = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (selectedMaterials.length === 0) {
      toast.error('Please add at least one material');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/boms/${bomId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: selectedProduct,
          materials: selectedMaterials,
          overhead_percentage: parseFloat(overheadPercentage),
          notes: bomNotes,
          status: bomStatus,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('BOM updated successfully');
        fetchBOM(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to update BOM');
      }
    } catch (error) {
      console.error('Error updating BOM:', error);
      toast.error('Error updating BOM');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/boms/${bomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('BOM deleted successfully');
        router.push('/admin/boms');
      } else {
        toast.error('Failed to delete BOM');
      }
    } catch (error) {
      console.error('Error deleting BOM:', error);
      toast.error('Error deleting BOM');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading BOM details...</div>
        </div>
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">BOM not found</div>
        </div>
      </div>
    );
  }

  const materialsCost = selectedMaterials.reduce((sum, m) => sum + m.total_cost, 0);
  const overheadCost = (materialsCost * parseFloat(overheadPercentage)) / 100;
  const totalCost = materialsCost + overheadCost;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/boms')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to BOMs
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-8 w-8" />
              Edit BOM
            </h1>
            <p className="text-gray-600 mt-1">
              Version {bom.version} • Created by {bom.created_by_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this BOM. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product
              </CardTitle>
              <CardDescription>Select the product for this BOM</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Materials</CardTitle>
                  <CardDescription>Add raw materials and quantities</CardDescription>
                </div>
                <Button onClick={addMaterial} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedMaterials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No materials added yet. Click &quot;Add Material&quot; to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedMaterials.map((material, index) => (
                    <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label>Material</Label>
                        <Select
                          value={material.material_id}
                          onValueChange={(value) => updateMaterial(index, 'material_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m._id} value={m._id}>
                                {m.name} ({m.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="w-32">
                        <Label>Cost/Unit</Label>
                        <Input
                          type="number"
                          value={material.cost_per_unit}
                          onChange={(e) => updateMaterial(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="w-32">
                        <Label>Total</Label>
                        <div className="h-10 flex items-center font-semibold">
                          ₹{material.total_cost.toFixed(2)}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeMaterial(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional information about this BOM</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={bomNotes}
                onChange={(e) => setBomNotes(e.target.value)}
                placeholder="Enter any notes or instructions..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={bomStatus} onValueChange={setBomStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {bom.is_current && (
                <Badge className="mt-2" variant="default">Current Version</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Materials Cost:</span>
                <span className="font-semibold">₹{materialsCost.toFixed(2)}</span>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="overhead">Overhead %</Label>
                  <span className="text-sm text-gray-600">{overheadPercentage}%</span>
                </div>
                <Input
                  id="overhead"
                  type="number"
                  value={overheadPercentage}
                  onChange={(e) => setOverheadPercentage(e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Overhead Cost:</span>
                <span className="font-semibold">₹{overheadCost.toFixed(2)}</span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Cost:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{totalCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4 text-sm text-gray-500">
                <p>Last updated: {new Date(bom.updated_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
