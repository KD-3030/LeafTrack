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
}

module.exports = nextConfig
