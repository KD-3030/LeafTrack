/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is enabled by default in Next.js 13+
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
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
  // Webpack configuration to fix caching issues on Windows/OneDrive
  webpack: (config) => {
    // Disable webpack caching to avoid ENOENT errors on Windows with OneDrive
    config.cache = false;
    return config;
  },
}

module.exports = nextConfig
