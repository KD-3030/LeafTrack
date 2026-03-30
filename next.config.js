/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // HSTS re-enable after SSL: { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob: https://*.tile.openstreetmap.org https://www.google-analytics.com",
      "connect-src 'self' https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      // upgrade-insecure-requests: re-enable after SSL is active
    ].join('; '),
  },
];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    domains: ['localhost', 'sohagtea.in', 'www.sohagtea.in'],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    // Skip security headers in development — CSP blocks Next.js HMR/static assets in non-Chrome browsers
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          ],
        },
      ];
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        // Cache static assets aggressively (fonts, images, JS/CSS bundles)
        source: '/:path*.(js|css|woff|woff2|png|jpg|jpeg|svg|webp|avif|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Service worker must not be cached
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/admin', destination: '/admin/dashboard', permanent: true },
      { source: '/salesman', destination: '/salesman/dashboard', permanent: true },
    ];
  },
};

module.exports = nextConfig;
