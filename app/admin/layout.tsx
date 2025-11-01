import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/ui/navigation';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-[#F5F5DC]">
        <Navigation />
        <div className="flex flex-col md:flex-row">
          <AdminSidebar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-x-hidden">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </ProtectedRoute>
  );
}