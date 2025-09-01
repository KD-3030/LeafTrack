'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FolderOpen, Users, TrendingUp, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalSalesmen: 0,
    totalAssignments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      
      // Fetch users (salesmen)
      const usersResponse = await fetch('/api/users');
      const usersData = await usersResponse.json();
      
      // Fetch assignments
      const assignmentsResponse = await fetch('/api/assignments');
      const assignmentsData = await assignmentsResponse.json();
      
      if (productsData.success && usersData.success && assignmentsData.success) {
        const salesmen = usersData.users.filter((user: any) => user.role === 'Salesman');
        const totalStock = productsData.products.reduce((sum: number, product: any) => sum + product.stock_quantity, 0);
        
        setStats({
          totalProducts: productsData.products.length,
          totalStock,
          totalSalesmen: salesmen.length,
          totalAssignments: assignmentsData.assignments.length,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}! Here's your inventory overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-gray-600">Tea leaf products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock}</div>
            <p className="text-xs text-gray-600">Total inventory units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salesmen</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalesmen}</div>
            <p className="text-xs text-gray-600">Active salesmen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-xs text-gray-600">Stock assignments made</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/admin/products" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Package className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Products</h3>
              <p className="text-sm text-gray-600 mt-1">Add, edit, or remove tea products</p>
            </a>

            <a href="/admin/salesmen" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Assign Stock</h3>
              <p className="text-sm text-gray-600 mt-1">Allocate inventory to salesmen</p>
            </a>

            <div className="block p-4 border border-gray-200 rounded-lg bg-gray-50">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Sales Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">Track performance and trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your inventory management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-gray-600">Tea leaf products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockProducts.reduce((sum, p) => sum + p.stock, 0)}</div>
            <p className="text-xs text-gray-600">Total inventory units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salesmen</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalesmen}</div>
            <p className="text-xs text-gray-600">Active salesmen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-xs text-gray-600">Stock assignments made</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/admin/products" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Package className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Products</h3>
              <p className="text-sm text-gray-600 mt-1">Add, edit, or remove tea products</p>
            </a>

            <a href="/admin/salesmen" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Assign Stock</h3>
              <p className="text-sm text-gray-600 mt-1">Allocate inventory to salesmen</p>
            </a>

            <div className="block p-4 border border-gray-200 rounded-lg bg-gray-50">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Sales Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">Track performance and trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}