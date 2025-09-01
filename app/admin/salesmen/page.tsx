'use client';

import { useEffect, useState } from 'react';
import { User, Product, Assignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Package } from 'lucide-react';
import { toast } from 'sonner';
import { stockManager } from '@/lib/stockManager';

// Mock data
const mockSalesmen: User[] = [
  {
    id: '1',
    email: 'jane@leaftrack.com',
    name: 'Jane Smith',
    role: 'Salesman',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    email: 'bob@leaftrack.com',
    name: 'Bob Johnson',
    role: 'Salesman',
    created_at: '2024-01-20T14:30:00Z'
  },
  {
    id: '3',
    email: 'alice@leaftrack.com',
    name: 'Alice Brown',
    role: 'Salesman',
    created_at: '2024-02-01T09:15:00Z'
  }
];

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Earl Grey Premium',
    price: 2099,
    stock_quantity: 150,
    created_at: '2024-01-10T08:00:00Z'
  },
  {
    id: '2',
    name: 'Dragon Well Green',
    price: 2750,
    stock_quantity: 200,
    created_at: '2024-01-12T10:30:00Z'
  },
  {
    id: '3',
    name: 'Chamomile Dreams',
    price: 1575,
    stock_quantity: 100,
    created_at: '2024-01-15T14:20:00Z'
  }
];

const mockAssignments: Assignment[] = [
  {
    id: '1',
    salesman_id: '1',
    product_id: '1',
    quantity: 50,
    created_at: '2024-01-16T09:00:00Z',
    salesman: mockSalesmen[0],
    product: mockProducts[0]
  },
  {
    id: '2',
    salesman_id: '1',
    product_id: '2',
    quantity: 30,
    created_at: '2024-01-17T11:30:00Z',
    salesman: mockSalesmen[0],
    product: mockProducts[1]
  },
  {
    id: '3',
    salesman_id: '2',
    product_id: '3',
    quantity: 25,
    created_at: '2024-01-18T15:45:00Z',
    salesman: mockSalesmen[1],
    product: mockProducts[2]
  }
];

export default function SalesmenPage() {
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<User | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    product_id: '',
    quantity: '',
  });

  useEffect(() => {
    loadSalesmen();
    loadProducts();
    loadAssignments();
  }, []);

  useEffect(() => {
    // Subscribe to stock updates to refresh assignments
    const unsubscribe = stockManager.subscribe(() => {
      loadAssignments();
    });

    return unsubscribe;
  }, []);

  const loadSalesmen = async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setSalesmen(mockSalesmen);
    } catch (error) {
      console.error('Error loading salesmen:', error);
      toast.error('Failed to load salesmen');
    }
  };

  const loadProducts = async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 400));
      setAssignments(mockAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleAssignStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSalesman || !newAssignment.product_id || !newAssignment.quantity) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Find the selected product
      const selectedProduct = products.find(p => p.id === newAssignment.product_id);
      
      // Create new assignment
      const newAssignmentData: Assignment = {
        id: (assignments.length + 1).toString(),
        salesman_id: selectedSalesman.id,
        product_id: newAssignment.product_id,
        quantity: parseInt(newAssignment.quantity),
        created_at: new Date().toISOString(),
        salesman: selectedSalesman,
        product: selectedProduct!
      };

      // Add to assignments
      setAssignments([...assignments, newAssignmentData]);
      
      toast.success('Stock assigned successfully');
      setNewAssignment({ product_id: '', quantity: '' });
      setSelectedSalesman(null);
    } catch (error) {
      toast.error('Failed to assign stock');
    }
  };

  const getSalesmanAssignments = (salesmanId: string) => {
    return assignments.filter(assignment => assignment.salesman_id === salesmanId);
  };

  const getSalesmanSales = (salesmanId: string) => {
    const stockUpdates = stockManager.getStockUpdates();
    return stockUpdates
      .filter(update => update.salesmanId === salesmanId)
      .reduce((total, update) => total + update.quantitySold, 0);
  };

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
                  const salesmanAssignments = getSalesmanAssignments(salesman.id);
                  const salesmanSales = getSalesmanSales(salesman.id);
                  return (
                    <div key={salesman.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
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
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => setSelectedSalesman(salesman)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Assign Stock
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
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} (Stock: {product.total_stock})
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
                  <div key={assignment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
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
    </div>
  );
}