'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Package, 
  UserCheck, 
  Users, 
  FileText,
  Menu, 
  X, 
  ChevronLeft,
  ChevronRight,
  Leaf
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/executive/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/executive/orders', icon: ClipboardCheck },
  { name: 'Team', href: '/executive/team', icon: Users },
  { name: 'Distributor Stock', href: '/executive/stock', icon: Package },
  { name: 'Distributors', href: '/executive/distributors', icon: UserCheck },
  { name: 'Invoicing', href: '/executive/invoicing', icon: FileText },
];

export function ExecutiveSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? "w-[72px]" : "w-60",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
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
          
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          
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

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 border-l-2 border-transparent',
                  isActive
                    ? 'bg-brand-50 text-brand-700 border-brand-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && 'text-brand-600')} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn(
          "p-3 border-t border-gray-100",
          isCollapsed && "flex justify-center"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-brand-50">
              <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-brand-700 font-semibold text-xs">PE</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">Primary Executive</p>
                <p className="text-[10px] text-gray-400 truncate">Team Manager</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-brand-700 font-semibold text-xs">PE</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
