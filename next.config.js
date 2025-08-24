/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['image.tmdb.org'],
  },
  env: {
    // VM extractor URL is now handled server-side by the serverless function
    VM_EXTRACTOR_URL: process.env.VM_EXTRACTOR_URL || 'http://35.188.123.210:3001',
  },
  webpack: (config, { isServer }) => {
    // Fix HLS.js module loading issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // Force HLS.js to be treated as external module for proper loading
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'hls.js': 'hls.js'
        });
      }
    }
    
    return config;
  },
  transpilePackages: ['hls.js'],
  experimental: {
    esmExternals: 'loose'
  }
}

module.exports = nextConfig