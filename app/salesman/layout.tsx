import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/ui/navigation';

export default function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['salesman']}>
      <div className="min-h-screen bg-[#F5F5DC]">
        <Navigation />
        <main className="w-full mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl overflow-x-hidden">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}