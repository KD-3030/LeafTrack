import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Package, Users, TrendingUp, Shield, Leaf } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-brand-100/50" />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Leaf className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-4 tracking-tight">
            Sohag Tea
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Premium tea distribution and wholesale supply. Streamlined inventory, orders, invoicing, and reporting — all in one place.
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg">
                Login to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl border bg-card">
            <Package className="h-8 w-8 text-brand-600 mb-3" />
            <h3 className="font-medium text-foreground mb-1">Inventory</h3>
            <p className="text-sm text-muted-foreground">Complete product catalog and stock management</p>
          </div>
          
          <div className="p-5 rounded-xl border bg-card">
            <Users className="h-8 w-8 text-brand-600 mb-3" />
            <h3 className="font-medium text-foreground mb-1">Role-Based Access</h3>
            <p className="text-sm text-muted-foreground">Admin, executive, and salesman dashboards</p>
          </div>
          
          <div className="p-5 rounded-xl border bg-card">
            <TrendingUp className="h-8 w-8 text-brand-600 mb-3" />
            <h3 className="font-medium text-foreground mb-1">Orders & Sales</h3>
            <p className="text-sm text-muted-foreground">Approval workflows and sales tracking</p>
          </div>
          
          <div className="p-5 rounded-xl border bg-card">
            <Shield className="h-8 w-8 text-brand-600 mb-3" />
            <h3 className="font-medium text-foreground mb-1">Secure</h3>
            <p className="text-sm text-muted-foreground">JWT authentication and role-based permissions</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center">
        <p className="text-xs text-muted-foreground">Sohag Tea &middot; Premium Tea Distribution &amp; Wholesale Supply</p>
      </footer>
    </div>
  );
}