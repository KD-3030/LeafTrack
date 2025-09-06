import Link from 'next/link';
import { Navigation } from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import { Package, Users, TrendingUp, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-24">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            {/* Beautiful SohagTea Logo */}
            <div className="relative">
              {/* Main logo container */}
              <div className="bg-white rounded-2xl shadow-2xl p-10 border border-gray-100">
                <div className="flex items-center justify-center space-x-4">
                  {/* Tea leaf icon with gradient */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-3xl text-white">🍃</span>
                    </div>
                  </div>
                  
                  {/* Company name */}
                  <div className="text-center">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-4xl font-bold font-display bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                        Sohag
                      </span>
                      <span className="text-4xl font-light font-display text-green-500">
                        Tea
                      </span>
                    </div>
                    <div className="text-base font-semibold font-heading text-gray-500 tracking-[0.3em] -mt-1">
                      MANAGE
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements - moved further away */}
              <div className="absolute -top-3 -left-3 w-4 h-4 bg-green-200 rounded-full opacity-40"></div>
              <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-green-100 rounded-full opacity-30"></div>
              <div className="absolute top-1/2 -left-6 w-3 h-3 bg-green-300 rounded-full opacity-25"></div>
              <div className="absolute top-1/4 -right-5 w-2 h-2 bg-green-400 rounded-full opacity-35"></div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold font-display text-gray-900 mb-8 leading-tight">
            SohagTea Manage
          </h1>
          <p className="text-2xl font-sans text-gray-700 max-w-4xl mx-auto leading-relaxed font-light">
            Welcome to SohagTea Manage, the modern inventory management solution designed for our tea distribution network. 
            Admins can manage our complete tea leaf catalog, and salesmen can access their assigned stock on the go while managing their finances.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold font-heading text-gray-900 mb-2">Inventory Management</h3>
            <p className="text-gray-600 font-sans">Complete control over tea leaf products and categories</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold font-heading text-gray-900 mb-2">Role-Based Access</h3>
            <p className="text-gray-600 font-sans">Separate dashboards for admins and salesmen</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold font-heading text-gray-900 mb-2">Stock Assignment</h3>
            <p className="text-gray-600 font-sans">Efficiently assign inventory to field salesmen</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold font-heading text-gray-900 mb-2">Secure Access</h3>
            <p className="text-gray-600 font-sans">JWT-based authentication for secure operations</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white p-12 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-3xl font-bold font-display text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 font-sans mb-8 max-w-2xl mx-auto">
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