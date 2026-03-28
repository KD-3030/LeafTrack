'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BarChart3, 
  UserCheck, 
  Settings, 
  DollarSign, 
  Package, 
  Users, 
  FileText, 
  ShoppingCart, 
  PackageX, 
  Boxes, 
  Layers, 
  Menu, 
  X, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Store,
  ClipboardCheck,
  Leaf
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ClipboardCheck },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Sellers', href: '/admin/sellers', icon: Store },
  { name: 'Purchases', href: '/admin/purchases', icon: ShoppingCart },
  { name: 'Purchase Returns', href: '/admin/purchase-returns', icon: PackageX },
  { name: 'Users', href: '/admin/salesmen', icon: Users },
];

const bomNavigation = [
  { name: 'BOM Management', href: '/admin/boms', icon: Layers },
  { name: 'Raw Materials', href: '/admin/raw-materials', icon: Boxes },
];

const financialNavigation = [
  { name: 'Financial', href: '/admin/financial', icon: DollarSign },
  { name: 'Invoicing', href: '/admin/invoicing', icon: FileText },
  { name: 'Sales Returns', href: '/admin/sales-returns', icon: RotateCcw },
  { name: 'Customers', href: '/admin/customers', icon: UserCheck },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];


export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const NavItem = ({ item, colorClass }: { item: typeof navigation[0], colorClass: string }) => {
    const isActive = pathname === item.href;
    const activeColors: Record<string, string> = {
      green: 'bg-brand-50 text-brand-700 border-brand-500',
      purple: 'bg-purple-50 text-purple-700 border-purple-500',
      blue: 'bg-blue-50 text-blue-700 border-blue-500',
    };
    
    return (
      <Link
        href={item.href}
        title={isCollapsed ? item.name : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border-l-2 border-transparent',
          isActive
            ? activeColors[colorClass]
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && (colorClass === 'green' ? 'text-brand-600' : `text-${colorClass}-600`))} />
        {!isCollapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    !isCollapsed ? (
      <div className="px-3 pt-4 pb-1">
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
      </div>
    ) : (
      <div className="my-2 mx-3 border-t border-gray-200" />
    )
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? "w-[72px]" : "w-60",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between h-14 px-4 border-b border-gray-100",
          isCollapsed && "justify-center px-2"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">SohagTea</span>
            </div>
          )}
          
          {/* Mobile Close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          
          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {/* Main Navigation */}
          {navigation.map((item) => (
            <NavItem key={item.href} item={item} colorClass="green" />
          ))}

          {/* BOM Section */}
          <SectionHeader title="Manufacturing" />
          {bomNavigation.map((item) => (
            <NavItem key={item.href} item={item} colorClass="purple" />
          ))}

          {/* Financial Section */}
          <SectionHeader title="Finance" />
          {financialNavigation.map((item) => (
            <NavItem key={item.href} item={item} colorClass="blue" />
          ))}
        </nav>

        {/* Footer */}
        <div className={cn(
          "p-3 border-t border-gray-100",
          isCollapsed && "flex justify-center"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-brand-50">
              <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-brand-700 font-semibold text-xs">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">Admin</p>
                <p className="text-[10px] text-gray-400 truncate">Administrator</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-brand-700 font-semibold text-xs">A</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}