import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/ui/navigation';

export default function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['Salesman']}>
      <div className="min-h-screen bg-[#F5F5DC]">
        <Navigation />
        <main className="max-w-7xl mx-auto p-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}