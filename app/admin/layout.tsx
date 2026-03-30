import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/ui/navigation';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | SohagTea Manage',
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </div>
    </ProtectedRoute>
  );
}