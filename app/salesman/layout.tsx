import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/ui/navigation';

export const metadata: Metadata = {
  title: {
    default: 'Salesman Portal',
    template: '%s | SohagTea Manage',
  },
};

export default function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['secondary_executive']}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="w-full mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-7xl overflow-x-hidden">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}