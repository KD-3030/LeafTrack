/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is enabled by default in Next.js 13+
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  // Optimize for serverless deployment
  output: 'standalone',
}

module.exports = nextConfig
