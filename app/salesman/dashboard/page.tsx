'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Assignment } from '@/types';
import { stockManager, StockUpdate } from '@/lib/stockManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, TrendingUp, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

// Mock data for assignments
const mockAssignments: Assignment[] = [
  {
    id: '1',
    salesman_id: '2',
    product_id: '1',
    quantity: 50,
    created_at: '2024-01-15T10:00:00Z',
    product: {
      id: '1',
      name: 'Earl Grey Premium',
      price: 2099,
      stock_quantity: 100,
      created_at: '2024-01-01T00:00:00Z',
    }
  },
  {
    id: '2',
    salesman_id: '2',
    product_id: '2',
    quantity: 30,
    created_at: '2024-01-16T14:30:00Z',
    product: {
      id: '2',
      name: 'Dragon Well Green',
      price: 2750,
      stock_quantity: 75,
      created_at: '2024-01-01T00:00:00Z',
    }
  },
  {
    id: '3',
    salesman_id: '2',
    product_id: '3',
    quantity: 25,
    created_at: '2024-01-17T09:15:00Z',
    product: {
      id: '3',
      name: 'Chamomile Dreams',
      price: 1575,
      stock_quantity: 60,
      created_at: '2024-01-01T00:00:00Z',
    }
  }
];

export default function SalesmanDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  useEffect(() => {
    // Subscribe to stock updates to refresh data
    const unsubscribe = stockManager.subscribe(() => {
      // Refresh assignments when stock updates occur
      if (user) {
        loadAssignments();
      }
    });

    return unsubscribe;
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter assignments for current salesman
      const userAssignments = mockAssignments.filter(
        assignment => assignment.salesman_id === user.id
      );
      
      setAssignments(userAssignments);
      toast.success('Assignments loaded successfully');
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load your assigned stock');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAssignment || !saleQuantity || !user) {
      toast.error('Please fill in all fields');
      return;
    }

    const quantityToSell = parseInt(saleQuantity);
    const totalSold = stockManager.getTotalSoldForAssignment(selectedAssignment.id);
    const remainingStock = selectedAssignment.quantity - totalSold;

    if (quantityToSell <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (quantityToSell > remainingStock) {
      toast.error(`Cannot sell ${quantityToSell} units. Only ${remainingStock} units remaining.`);
      return;
    }

    try {
      // Record the sale
      stockManager.addStockUpdate({
        assignmentId: selectedAssignment.id,
        quantitySold: quantityToSell,
        timestamp: new Date().toISOString(),
        salesmanId: user.id,
        productId: selectedAssignment.product_id
      });

      toast.success(`Successfully sold ${quantityToSell} units of ${selectedAssignment.product?.name}`);
      setSaleQuantity('');
      setSelectedAssignment(null);
      setIsDialogOpen(false);
      
      // Refresh the assignments to show updated stock
      loadAssignments();
    } catch (error) {
      toast.error('Failed to record sale');
    }
  };

  const getRemainingStock = (assignment: Assignment) => {
    const totalSold = stockManager.getTotalSoldForAssignment(assignment.id);
    return assignment.quantity - totalSold;
  };

  const getTotalSold = (assignment: Assignment) => {
    return stockManager.getTotalSoldForAssignment(assignment.id);
  };

  const totalAssignedItems = assignments.reduce((sum, assignment) => sum + assignment.quantity, 0);
  const totalSoldItems = assignments.reduce((sum, assignment) => sum + getTotalSold(assignment), 0);
  const totalRemainingItems = totalAssignedItems - totalSoldItems;
  const uniqueProducts = new Set(assignments.map(a => a.product_id)).size;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.name}
        </h1>
        <p className="text-gray-600 mt-2">Your assigned tea leaf inventory</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignedItems}</div>
            <p className="text-xs text-gray-600">Total assigned inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSoldItems}</div>
            <p className="text-xs text-gray-600">Total items sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRemainingItems}</div>
            <p className="text-xs text-gray-600">Items available to sell</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>My Assigned Stock</span>
          </CardTitle>
          <CardDescription>
            Tea leaf inventory assigned to you by the admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Assigned</h3>
              <p className="text-gray-600">
                You don't have any assigned inventory yet. Contact your admin for stock allocation.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Price per Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.product?.name}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Tea Leaf
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {assignment.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {getTotalSold(assignment)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {getRemainingStock(assignment)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-lg">₹</span>
                        <span className="ml-1">{assignment.product?.price.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={isDialogOpen && selectedAssignment?.id === assignment.id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                          setSelectedAssignment(null);
                          setSaleQuantity('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setIsDialogOpen(true);
                            }}
                            disabled={getRemainingStock(assignment) === 0}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Sell
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Sell Stock - {assignment.product?.name}</DialogTitle>
                            <DialogDescription>
                              Record a sale for this product. Remaining stock: {getRemainingStock(assignment)} units
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleSellStock} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="saleQuantity">Quantity to Sell</Label>
                              <Input
                                id="saleQuantity"
                                type="number"
                                min="1"
                                max={getRemainingStock(assignment)}
                                value={saleQuantity}
                                onChange={(e) => setSaleQuantity(e.target.value)}
                                placeholder="Enter quantity"
                                required
                              />
                              <p className="text-sm text-gray-600">
                                Available: {getRemainingStock(assignment)} units | 
                                Price: ₹{assignment.product?.price.toFixed(2)} per unit
                              </p>
                            </div>
                            
                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                              Record Sale
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
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