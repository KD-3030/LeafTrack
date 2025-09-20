/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
      font-src 'self' https://fonts.gstatic.com data:;
      img-src 'self' data: https: blob: https://*.tile.openstreetmap.org;
      connect-src 'self' https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
      object-src 'none';
      script-src-attr 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

const nextConfig = {
  // Optimize for production
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  
  // React strict mode for better error detection
  reactStrictMode: true,
  
  // SWC minification for better performance
  swcMinify: true,
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
    optimizeCss: true,
  },
  
  // Image optimization
  images: {
    domains: ['localhost', 'yourdomain.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Headers configuration
  async headers() {
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
    ];
  },
  
  // Redirects for security
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
      {
        source: '/salesman',
        destination: '/salesman/dashboard',
        permanent: true,
      },
    ];
  },
  
  // Environment variables validation
  env: {
    // Add runtime environment variables here (public only)
    NEXT_PUBLIC_APP_NAME: 'LeafTrack',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    config.optimization.minimize = true;
    
    // Add fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Production optimizations
    if (process.env.NODE_ENV === 'production') {
      // Remove source maps in production
      config.devtool = false;
      
      // Tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    return config;
  },
  
  // TypeScript configuration
  typescript: {
    // During production build, fail on TypeScript errors
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // During production build, fail on ESLint errors
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
