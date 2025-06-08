/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['image.tmdb.org'],
  },
  env: {
    // VM extractor URL is now handled server-side by the serverless function
    VM_EXTRACTOR_URL: process.env.VM_EXTRACTOR_URL || 'http://35.188.123.210:3001',
  },
  // Note: Webpack/Chromium config removed since serverless function now proxies to VM
}

module.exports = nextConfig 