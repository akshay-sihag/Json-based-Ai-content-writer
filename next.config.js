const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizeFonts: true,
    optimizeImages: true,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  }
}

module.exports = nextConfig

