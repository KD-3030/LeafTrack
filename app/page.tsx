import Link from 'next/link';
import { Navigation } from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import { Package, Users, TrendingUp, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Streamlining Tea Distribution
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Welcome to LeafTrack, the modern inventory management solution designed for our distribution network. 
            Admins can manage our complete tea leaf catalog, and salesmen can access their assigned stock on the go.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory Management</h3>
            <p className="text-gray-600">Complete control over tea leaf products and categories</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Role-Based Access</h3>
            <p className="text-gray-600">Separate dashboards for admins and salesmen</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Stock Assignment</h3>
            <p className="text-gray-600">Efficiently assign inventory to field salesmen</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Access</h3>
            <p className="text-gray-600">JWT-based authentication for secure operations</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white p-12 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join our distribution network and start managing your tea leaf inventory efficiently.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/login">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Login to Dashboard
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}