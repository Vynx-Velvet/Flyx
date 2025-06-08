/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['image.tmdb.org'],
  },
  env: {
    NEXT_PUBLIC_EXTRACT_SERVICE_URL: process.env.NEXT_PUBLIC_EXTRACT_SERVICE_URL || 'http://35.188.123.210:3001',
  },
  // Optimize for serverless functions
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (isServer) {
      // Ensure @sparticuz/chromium is bundled, not externalized
      config.externals = config.externals || [];
      config.externals = config.externals.filter(external => {
        if (typeof external === 'string') {
          return external !== '@sparticuz/chromium' && external !== 'puppeteer-core';
        }
        return true;
      });
    }
    return config;
  },
}

module.exports = nextConfig 