'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BarChart3, UserCheck, Settings, DollarSign, Package, Users, FileText, MapPin } from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Products',             //need to fix the pricing and stock feature
    href: '/admin/products',
    icon: Package,
  },
  {
    name: 'Salesmen',
    href: '/admin/salesmen',
    icon: Users,
  },
  {
    name: 'Location Tracking',
    href: '/admin/locations',
    icon: MapPin,
  },
];

const financialNavigation = [
  {
    name: 'Financial Dashboard',
    href: '/admin/financial',
    icon: DollarSign,
  },
  {
    name: 'Invoicing',
    href: '/admin/invoicing',
    icon: FileText,
  },
  {
    name: 'Customers',               //need to add this functionality to the salesman section
    href: '/admin/customers',
    icon: UserCheck,
  },
  {
    name: 'Reports & Analytics',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    name: 'Company Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">SohagTea Admin</h2>
      </div>
      
      <nav className="mt-6">
        <div className="px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
                  isActive
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
        
        {/* Financial Section */}
        <div className="px-3 mt-8">
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Financial Management
            </h3>
          </div>
          {financialNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}