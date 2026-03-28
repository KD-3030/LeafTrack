import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/ui/navigation';
import { ExecutiveSidebar } from '@/components/executive/Sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['primary_executive']}>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <ExecutiveSidebar />
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
