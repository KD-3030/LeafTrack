import './globals.css';
import type { Metadata } from 'next';
import { Montserrat, Playfair_Display, Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { PageErrorBoundary } from '@/components/ErrorBoundary';

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['300', '400', '500', '600', '700', '800']
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900']
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'SohagTea Manage',
  description: 'Modern inventory management solution for tea leaf distribution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
        <body className={`${montserrat.variable} ${playfair.variable} ${inter.variable} font-sans antialiased`} suppressHydrationWarning={true}>
        <PageErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </PageErrorBoundary>
      </body>
    </html>
  );
}