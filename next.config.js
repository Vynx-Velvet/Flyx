/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['image.tmdb.org'],
  },
  // Optimize for serverless functions
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium'],
  },
  // Ensure these packages are not externalized in the serverless bundle
  serverExternalPackages: ['@sparticuz/chromium'],
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