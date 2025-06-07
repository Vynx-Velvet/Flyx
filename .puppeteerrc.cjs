const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Tell Puppeteer to skip downloading Chromium. We'll be using the version provided by @sparticuz/chromium
  skipDownload: true,
  // Set a custom cache directory for development
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
}; 