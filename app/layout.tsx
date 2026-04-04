import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Montserrat, Playfair_Display, Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { PageErrorBoundary } from '@/components/ErrorBoundary';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700'],
  display: 'swap',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://sohagtea.in'),
  title: {
    default: 'Sohag Tea — Premium Tea Distribution & Wholesale Supplier',
    template: '%s | Sohag Tea',
  },
  description: 'Sohag Tea is a leading tea distributor and wholesale supplier. We provide premium quality tea with efficient distribution management, GST-compliant invoicing, and seamless order tracking.',
  keywords: ['sohag tea', 'sohag', 'tea distributor', 'tea wholesale', 'tea supplier', 'premium tea', 'bulk tea', 'tea distribution', 'SohagTea'],
  authors: [{ name: 'Sohag Tea' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    siteName: 'Sohag Tea',
    title: 'Sohag Tea — Premium Tea Distribution & Wholesale Supplier',
    description: 'Leading tea distributor and wholesale supplier with premium quality tea products.',
    url: 'https://sohagtea.in',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SohagTea',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16a34a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
        <head>
          <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/icons/icon.svg" />
        </head>
        <body className={`${montserrat.variable} ${playfair.variable} ${inter.variable} font-sans antialiased`} suppressHydrationWarning={true}>
        <PageErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegistration />
            <GoogleAnalytics />
          </AuthProvider>
        </PageErrorBoundary>
      </body>
    </html>
  );
}