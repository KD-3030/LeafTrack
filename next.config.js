/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is enabled by default in Next.js 13+
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
    // Ensure serverless traces include chromium assets used by invoice PDF route.
    outputFileTracingIncludes: {
      '/api/invoices/[id]/pdf': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/app/api/invoices/[id]/pdf/route': [
        './node_modules/@sparticuz/chromium/**',
      ],
    },
  },
  // Optimize for serverless deployment
  output: 'standalone',
  // Ignore ESLint warnings during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip font optimization during build (useful for offline builds)
  optimizeFonts: false,
  // Webpack configuration to fix caching issues on Windows/OneDrive
  webpack: (config) => {
    // Disable webpack caching to avoid ENOENT errors on Windows with OneDrive
    config.cache = false;
    return config;
  },
}

module.exports = nextConfig
