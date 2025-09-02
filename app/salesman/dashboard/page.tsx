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
import { Package, TrendingUp, ShoppingCart, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import LocationTrackingWidget from '@/components/LocationTrackingWidget';
import SalesmanLocationMap from '@/components/SalesmanLocationMap';

export default function SalesmanDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('leaftrack_token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        toast.error('Authentication required');
        return;
      }

      // Fetch assignments from API
      const response = await fetch('/api/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch assignments');
      }

      if (!data.assignments || data.assignments.length === 0) {
        setAssignments([]);
        setError('No assignments found. Contact your admin for stock allocation.');
        return;
      }
      
      // API should now filter assignments for current salesman automatically
      const userAssignments = data.assignments || [];
      
      // Transform the data to match our interface
      const transformedAssignments = userAssignments.map((assignment: any) => ({
        id: assignment._id,
        _id: assignment._id,
        salesman_id: assignment.salesman_id._id,
        product_id: assignment.product_id._id,
        quantity: assignment.quantity,
        created_at: assignment.createdAt,
        product: {
          id: assignment.product_id._id,
          _id: assignment.product_id._id,
          name: assignment.product_id.name,
          price: assignment.product_id.price,
          stock_quantity: assignment.quantity, // Use assignment quantity as stock
          created_at: assignment.createdAt,
        }
      }));
      
      setAssignments(transformedAssignments);
      setError(null);
      toast.success('Assignments loaded successfully');
    } catch (error) {
      console.error('Error loading assignments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load your assigned stock';
      setError(errorMessage);
      toast.error(errorMessage);
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

    const assignmentId = selectedAssignment.id || selectedAssignment._id;
    if (!assignmentId) {
      toast.error('Invalid assignment data');
      return;
    }

    const quantityToSell = parseInt(saleQuantity);
    const totalSold = stockManager.getTotalSoldForAssignment(assignmentId);
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
      const productId = typeof selectedAssignment.product_id === 'string' 
        ? selectedAssignment.product_id 
        : selectedAssignment.product_id._id || selectedAssignment.product_id.id;
        
      stockManager.addStockUpdate({
        assignmentId: assignmentId,
        quantitySold: quantityToSell,
        timestamp: new Date().toISOString(),
        salesmanId: user.id || user._id || '',
        productId: productId
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
    const assignmentId = assignment.id || assignment._id;
    if (!assignmentId) return assignment.quantity;
    const totalSold = stockManager.getTotalSoldForAssignment(assignmentId);
    return assignment.quantity - totalSold;
  };

  const getTotalSold = (assignment: Assignment) => {
    const assignmentId = assignment.id || assignment._id;
    if (!assignmentId) return 0;
    return stockManager.getTotalSoldForAssignment(assignmentId);
  };

  const totalAssignedItems = assignments.reduce((sum, assignment) => sum + assignment.quantity, 0);
  const totalSoldItems = assignments.reduce((sum, assignment) => sum + getTotalSold(assignment), 0);
  const totalRemainingItems = totalAssignedItems - totalSoldItems;
  const uniqueProducts = new Set(assignments.map(a => a.product_id)).size;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error && assignments.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadAssignments} className="bg-green-600 hover:bg-green-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
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

      {/* Error Alert */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAssignments}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </Button>
        </div>
      )}

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

      {/* Location Tracking Widget and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationTrackingWidget />
        <SalesmanLocationMap />
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Summary</CardTitle>
          <CardDescription>Your performance overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{uniqueProducts}</div>
              <div className="text-sm text-gray-600">Products Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalAssignedItems}</div>
              <div className="text-sm text-gray-600">Total Units</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalSoldItems}</div>
              <div className="text-sm text-gray-600">Units Sold</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalRemainingItems}</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Sales Progress</span>
              <span className="text-sm font-bold">
                {totalAssignedItems > 0 ? Math.round((totalSoldItems / totalAssignedItems) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${totalAssignedItems > 0 ? (totalSoldItems / totalAssignedItems) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <span>Recent Assignments</span>
          </CardTitle>
          <CardDescription>
            Your latest stock assignments from the admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-md font-medium text-gray-900 mb-1">No Recent Assignments</h3>
              <p className="text-sm text-gray-600">
                No new assignments found. Check back later or contact your admin.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.slice(0, 3).map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {assignment.product?.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Assigned: {assignment.quantity} units
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{assignment.product?.price.toFixed(2)}/unit
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {assignments.length > 3 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    +{assignments.length - 3} more assignments
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                      <Dialog open={isDialogOpen && (selectedAssignment?.id === assignment.id || selectedAssignment?._id === assignment._id)} onOpenChange={(open) => {
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