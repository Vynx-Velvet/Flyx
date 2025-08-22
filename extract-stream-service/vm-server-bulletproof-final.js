import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { stealthInjections } from './stealth-injections.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Advanced configuration
const CONFIG = {
  // Proxy configuration
  proxies: process.env.PROXIES ? process.env.PROXIES.split(',') : [],
  proxyAuth: process.env.PROXY_AUTH || null, // username:password
  
  // Browser profiles directory
  profilesDir: path.join(__dirname, 'browser-profiles'),
  cookiesDir: path.join(__dirname, 'cookies'),
  
  // Advanced timing configuration
  timing: {
    humanDelayMin: 500,
    humanDelayMax: 3000,
    mouseMovementSpeed: 100,
    typingSpeed: { min: 50, max: 150 },
    scrollSpeed: { min: 300, max: 700 },
    pageLoadTimeout: 60000,
    challengeTimeout: 45000,
    retryAttempts: 3,
    retryDelay: 2000
  },
  
  // Fingerprint pools
  fingerprints: {
    screens: [
      { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
      { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24 },
      { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24 },
      { width: 1536, height: 864, availWidth: 1536, availHeight: 824, colorDepth: 24, pixelDepth: 24 },
      { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24 },
      { width: 1680, height: 1050, availWidth: 1680, availHeight: 1010, colorDepth: 24, pixelDepth: 24 }
    ],
    languages: [
      ['en-US', 'en'],
      ['en-GB', 'en'],
      ['en-CA', 'en'],
      ['en-AU', 'en'],
      ['en-US', 'en', 'es'],
      ['en-US', 'en', 'fr'],
      ['en-US', 'en', 'de']
    ],
    timezones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Detroit',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin'
    ],
    webGLVendors: [
      'Intel Inc.',
      'NVIDIA Corporation',
      'AMD',
      'Apple Inc.',
      'Microsoft Corporation'
    ],
    webGLRenderers: [
      'Intel Iris OpenGL Engine',
      'NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2',
      'AMD Radeon Pro 5500M OpenGL Engine',
      'ANGLE (NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)'
    ]
  }
};

// Ensure directories exist
[CONFIG.profilesDir, CONFIG.cookiesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Enhanced logging with request tracking
function createLogger(requestId) {
  const prefix = `[${requestId}]`;
  
  return {
    info: (message, data = {}) => {
      console.log(`${prefix} INFO: ${message}`, data);
    },
    warn: (message, data = {}) => {
      console.warn(`${prefix} WARN: ${message}`, data);
    },
    error: (message, error = null, data = {}) => {
      console.error(`${prefix} ERROR: ${message}`, error?.message || error, data);
    },
    debug: (message, data = {}) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`${prefix} DEBUG: ${message}`, data);
      }
    },
    timing: (label, startTime) => {
      const duration = Date.now() - startTime;
      console.log(`${prefix} TIMING: ${label} - ${duration}ms`);
      return duration;
    }
  };
}

// Generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

// Advanced user agent generation
class UserAgentGenerator {
  constructor() {
    this.chromeVersions = ['120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '130', '131', '132'];
    this.platforms = [
      { platform: 'Windows NT 10.0; Win64; x64', weight: 0.6 },
      { platform: 'Windows NT 11.0; Win64; x64', weight: 0.2 },
      { platform: 'Macintosh; Intel Mac OS X 10_15_7', weight: 0.15 },
      { platform: 'X11; Linux x86_64', weight: 0.05 }
    ];
  }

  generate() {
    const chromeVersion = this.chromeVersions[Math.floor(Math.random() * this.chromeVersions.length)];
    const platform = this.weightedRandom(this.platforms);
    
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  }

  weightedRandom(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * total;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.platform;
      }
    }
    
    return items[0].platform;
  }
}

// Human behavior simulator
class HumanBehaviorSimulator {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
  }

  async simulateReading(duration = 2000) {
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    while (Date.now() < endTime) {
      // Random scroll
      if (Math.random() > 0.7) {
        await this.smoothScroll(Math.random() * 200 - 100);
      }
      
      // Random mouse movement
      if (Math.random() > 0.5) {
        await this.moveMouseNaturally();
      }
      
      // Random pause
      await this.humanDelay(300, 800);
    }
  }

  async moveMouseNaturally() {
    try {
      const viewport = await this.page.viewport();
      const currentX = Math.random() * viewport.width;
      const currentY = Math.random() * viewport.height;
      const targetX = Math.random() * viewport.width;
      const targetY = Math.random() * viewport.height;
      
      // Generate bezier curve points for natural movement
      const steps = 20 + Math.floor(Math.random() * 20);
      const curve = this.generateBezierCurve(
        { x: currentX, y: currentY },
        { x: targetX, y: targetY },
        steps
      );
      
      for (const point of curve) {
        await this.page.mouse.move(point.x, point.y);
        await this.humanDelay(10, 30);
      }
    } catch (e) {
      this.logger.debug('Mouse movement error', { error: e.message });
    }
  }

  generateBezierCurve(start, end, steps) {
    const curve = [];
    const cp1 = {
      x: start.x + (Math.random() - 0.5) * 200,
      y: start.y + (Math.random() - 0.5) * 200
    };
    const cp2 = {
      x: end.x + (Math.random() - 0.5) * 200,
      y: end.y + (Math.random() - 0.5) * 200
    };
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.pow(1 - t, 3) * start.x +
                3 * Math.pow(1 - t, 2) * t * cp1.x +
                3 * (1 - t) * Math.pow(t, 2) * cp2.x +
                Math.pow(t, 3) * end.x;
      const y = Math.pow(1 - t, 3) * start.y +
                3 * Math.pow(1 - t, 2) * t * cp1.y +
                3 * (1 - t) * Math.pow(t, 2) * cp2.y +
                Math.pow(t, 3) * end.y;
      curve.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    return curve;
  }

  async smoothScroll(distance) {
    try {
      const steps = Math.abs(distance) / 10;
      const stepSize = distance / steps;
      
      for (let i = 0; i < steps; i++) {
        await this.page.evaluate((scrollBy) => {
          window.scrollBy(0, scrollBy);
        }, stepSize);
        await this.humanDelay(20, 50);
      }
    } catch (e) {
      this.logger.debug('Scroll error', { error: e.message });
    }
  }

  async humanType(text, element = null) {
    if (element) {
      await element.click();
      await this.humanDelay(100, 300);
    }
    
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.humanDelay(
        CONFIG.timing.typingSpeed.min,
        CONFIG.timing.typingSpeed.max
      );
      
      // Occasional typo and correction
      if (Math.random() < 0.03) {
        const typo = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        await this.page.keyboard.type(typo);
        await this.humanDelay(100, 200);
        await this.page.keyboard.press('Backspace');
        await this.humanDelay(50, 150);
      }
    }
  }

  async humanDelay(min = CONFIG.timing.humanDelayMin, max = CONFIG.timing.humanDelayMax) {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async simulateTabSwitch() {
    // Simulate user switching tabs
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      });
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      window.dispatchEvent(new Event('blur'));
    });
    
    await this.humanDelay(2000, 5000);
    
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true
      });
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
      window.dispatchEvent(new Event('focus'));
    });
  }
}

// Advanced fingerprint manager
class FingerprintManager {
  constructor() {
    this.userAgentGen = new UserAgentGenerator();
  }

  generateFingerprint() {
    const screen = CONFIG.fingerprints.screens[Math.floor(Math.random() * CONFIG.fingerprints.screens.length)];
    const languages = CONFIG.fingerprints.languages[Math.floor(Math.random() * CONFIG.fingerprints.languages.length)];
    const timezone = CONFIG.fingerprints.timezones[Math.floor(Math.random() * CONFIG.fingerprints.timezones.length)];
    const webGLVendor = CONFIG.fingerprints.webGLVendors[Math.floor(Math.random() * CONFIG.fingerprints.webGLVendors.length)];
    const webGLRenderer = CONFIG.fingerprints.webGLRenderers[Math.floor(Math.random() * CONFIG.fingerprints.webGLRenderers.length)];
    
    return {
      userAgent: this.userAgentGen.generate(),
      screen,
      languages,
      timezone,
      webGL: {
        vendor: webGLVendor,
        renderer: webGLRenderer
      },
      hardwareConcurrency: [2, 4, 6, 8, 12, 16][Math.floor(Math.random() * 6)],
      deviceMemory: [2, 4, 8, 16, 32][Math.floor(Math.random() * 5)],
      platform: this.getPlatformForUserAgent(),
      canvas: {
        noise: Math.random() * 0.0001
      }
    };
  }

  getPlatformForUserAgent() {
    const platforms = {
      'Windows NT': 'Win32',
      'Macintosh': 'MacIntel',
      'X11': 'Linux x86_64'
    };
    
    const userAgent = this.userAgentGen.generate();
    for (const [key, value] of Object.entries(platforms)) {
      if (userAgent.includes(key)) {
        return value;
      }
    }
    
    return 'Win32';
  }
}

// Browser profile manager
class BrowserProfileManager {
  constructor(profilesDir) {
    this.profilesDir = profilesDir;
    this.profiles = new Map();
  }

  async getProfile(domain) {
    if (!this.profiles.has(domain)) {
      const profilePath = path.join(this.profilesDir, `profile_${domain.replace(/[^a-z0-9]/gi, '_')}`);
      
      if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
      }
      
      this.profiles.set(domain, profilePath);
    }
    
    return this.profiles.get(domain);
  }
}

// Proxy manager
class ProxyManager {
  constructor(proxies, auth) {
    this.proxies = proxies;
    this.auth = auth;
    this.currentIndex = 0;
    this.blacklist = new Set();
  }

  getNext() {
    if (this.proxies.length === 0) return null;
    
    let attempts = 0;
    while (attempts < this.proxies.length) {
      const proxy = this.proxies[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      
      if (!this.blacklist.has(proxy)) {
        return {
          server: proxy,
          auth: this.auth
        };
      }
      
      attempts++;
    }
    
    // All proxies blacklisted, clear blacklist and start over
    this.blacklist.clear();
    return this.getNext();
  }

  blacklistProxy(proxy) {
    this.blacklist.add(proxy);
  }
}

// Enhanced cookie management
class CookieManager {
  constructor(cookiesDir) {
    this.cookiesDir = cookiesDir || CONFIG.cookiesDir;
    if (!fs.existsSync(this.cookiesDir)) {
      fs.mkdirSync(this.cookiesDir, { recursive: true });
    }
  }

  async save(page, domain, logger) {
    try {
      const cookies = await page.cookies();
      const filename = `cookies_${domain.replace(/[^a-z0-9]/gi, '_')}.json`;
      const filepath = path.join(this.cookiesDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(cookies, null, 2), 'utf8');
      logger.info('Saved cookies', { domain, count: cookies.length, filepath });
      
      return true;
    } catch (error) {
      logger.error('Failed to save cookies', error, { domain });
      return false;
    }
  }

  async restore(page, domain, logger) {
    try {
      const filename = `cookies_${domain.replace(/[^a-z0-9]/gi, '_')}.json`;
      const filepath = path.join(this.cookiesDir, filename);
      
      if (!fs.existsSync(filepath)) {
        logger.debug('No cookies file found', { domain, filepath });
        return false;
      }
      
      const cookies = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Filter out expired cookies
      const validCookies = cookies.filter(cookie => {
        if (!cookie.expires || cookie.expires === -1) return true;
        return cookie.expires * 1000 > Date.now();
      });
      
      if (validCookies.length > 0) {
        await page.setCookie(...validCookies);
        logger.info('Restored cookies', { domain, count: validCookies.length });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to restore cookies', error, { domain });
      return false;
    }
  }
}

// Advanced Cloudflare challenge solver
class CloudflareSolver {
  constructor(page, behaviorSimulator, logger) {
    this.page = page;
    this.behaviorSimulator = behaviorSimulator;
    this.logger = logger;
  }

  async waitForChallenge(timeout = CONFIG.timing.challengeTimeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const hasChallenge = await this.detectChallenge();
      
      if (hasChallenge) {
        this.logger.info('Cloudflare challenge detected');
        return true;
      }
      
      // Check if page has loaded normally
      const isLoaded = await this.page.evaluate(() => {
        return document.readyState === 'complete' && 
               !document.querySelector('.cf-turnstile') &&
               !document.querySelector('#challenge-form');
      });
      
      if (isLoaded) {
        return false;
      }
      
      await this.behaviorSimulator.humanDelay(500, 1000);
    }
    
    return false;
  }

  async detectChallenge() {
    return await this.page.evaluate(() => {
      const indicators = [
        '.cf-turnstile',
        '#challenge-form',
        'div[class*="challenge"]',
        'div[class*="captcha"]',
        'iframe[src*="challenges.cloudflare.com"]',
        'script[src*="challenges.cloudflare.com"]'
      ];
      
      return indicators.some(selector => document.querySelector(selector) !== null);
    });
  }

  async solveChallenge() {
    this.logger.info('Attempting to solve Cloudflare challenge');
    
    // Wait for challenge to appear
    try {
      await this.page.waitForSelector('.cf-turnstile, #challenge-form', { 
        timeout: 10000,
        visible: true 
      });
    } catch (e) {
      this.logger.debug('Challenge selector not found in time');
    }
    
    // Simulate human behavior while challenge loads
    await this.behaviorSimulator.simulateReading(2000);
    
    // Move mouse naturally around the page
    await this.behaviorSimulator.moveMouseNaturally();
    
    // Check for checkbox-style challenge
    const checkboxChallenge = await this.page.$('input[type="checkbox"]');
    if (checkboxChallenge) {
      this.logger.info('Found checkbox challenge');
      const box = await checkboxChallenge.boundingBox();
      if (box) {
        // Move to checkbox naturally
        await this.behaviorSimulator.moveMouseNaturally();
        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await this.behaviorSimulator.humanDelay(300, 700);
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        this.logger.info('Clicked checkbox challenge');
      }
    }
    
    // Wait for challenge to be solved
    const solved = await this.waitForSolution();
    
    if (solved) {
      this.logger.info('Cloudflare challenge solved successfully');
      // Extra delay to ensure everything loads
      await this.behaviorSimulator.humanDelay(1000, 2000);
    } else {
      this.logger.warn('Cloudflare challenge may not have been solved');
    }
    
    return solved;
  }

  async waitForSolution(timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const hasChallenge = await this.detectChallenge();
      
      if (!hasChallenge) {
        // Check if we're on the target page
        const url = this.page.url();
        if (!url.includes('challenges.cloudflare.com')) {
          return true;
        }
      }
      
      // Check for specific success indicators
      const hasPassed = await this.page.evaluate(() => {
        return document.querySelector('video') !== null ||
               document.querySelector('#player_parent') !== null ||
               document.querySelector('iframe[src*="prorcp"]') !== null ||
               (document.body && document.body.innerHTML.includes('prorcp'));
      });
      
      if (hasPassed) {
        return true;
      }
      
      await this.behaviorSimulator.humanDelay(500, 1000);
    }
    
    return false;
  }
}

// Create browser with advanced stealth
async function createStealthBrowser(logger, options = {}) {
  const fingerprintManager = new FingerprintManager();
  const fingerprint = fingerprintManager.generateFingerprint();
  const profileManager = new BrowserProfileManager(CONFIG.profilesDir);
  const proxyManager = new ProxyManager(CONFIG.proxies, CONFIG.proxyAuth);
  
  const proxy = proxyManager.getNext();
  const profilePath = await profileManager.getProfile(options.domain || 'default');
  
  logger.info('Creating stealth browser', {
    fingerprint: {
      userAgent: fingerprint.userAgent.substring(0, 50) + '...',
      screen: fingerprint.screen,
      timezone: fingerprint.timezone
    },
    proxy: proxy ? proxy.server : 'none',
    profile: profilePath
  });
  
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--flag-switches-begin',
    '--disable-site-isolation-trials',
    '--flag-switches-end',
    `--window-size=${fingerprint.screen.width},${fingerprint.screen.height}`,
    '--start-maximized',
    '--disable-web-security',
    '--disable-features=CrossSiteDocumentBlockingIfIsolating',
    '--disable-site-isolation-for-policy',
    '--disable-features=BlockInsecurePrivateNetworkRequests',
    '--allow-running-insecure-content',
    '--disable-features=AutomationControlled',
    '--disable-automation',
    '--disable-infobars',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--disable-webrtc-hw-encoding',
    '--disable-webrtc-hw-decoding',
    '--disable-webrtc-multiple-routes',
    '--disable-webrtc-nonproxied-udp',
    `--lang=${fingerprint.languages[0]}`,
  ];
  
  if (proxy) {
    launchArgs.push(`--proxy-server=${proxy.server}`);
  }
  
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: profilePath,
    args: launchArgs,
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
    defaultViewport: null
  });
  
  // Apply fingerprint to all pages
  browser.on('targetcreated', async (target) => {
    const page = await target.page();
    if (page) {
      await applyFingerprint(page, fingerprint, logger);
    }
  });
  
  return { browser, fingerprint, proxy, proxyManager };
}

// Apply fingerprint to page
async function applyFingerprint(page, fingerprint, logger) {
  try {
    // Set user agent
    await page.setUserAgent(fingerprint.userAgent);
    
    // Set viewport
    await page.setViewport({
      width: fingerprint.screen.width,
      height: fingerprint.screen.height,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: fingerprint.screen.width > fingerprint.screen.height,
      isMobile: false
    });
    
    // Apply stealth injections
    await page.evaluateOnNewDocument(stealthInjections(fingerprint));
    
    // Additional fingerprinting
    await page.evaluateOnNewDocument(`
      // Set timezone
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: function() {
          return Object.assign(
            Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, 'resolvedOptions').value.call(this),
            { timeZone: '${fingerprint.timezone}' }
          );
        }
      });
      
      // Set languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ${JSON.stringify(fingerprint.languages)}
      });
      Object.defineProperty(navigator, 'language', {
        get: () => '${fingerprint.languages[0]}'
      });
    `);
    
    logger.debug('Applied fingerprint to page');
  } catch (error) {
    logger.error('Failed to apply fingerprint', error);
  }
}

// Extract CloudNestra URL from VidSrc HTML
function extractCloudNestraUrl(html, logger) {
  logger.info('Extracting CloudNestra URL from VidSrc HTML...');

  const patterns = [
    /<iframe[^>]*src\s*=\s*["']([^"']*cloudnestra\.com\/rcp[^"']*)["'][^>]*>/gi,
    /src\s*=\s*["']([^"']*cloudnestra\.com\/rcp[^\s"']*)/gi,
    /https:\/\/cloudnestra\.com\/rcp\/[^\s"'>]*/gi,
    /["'](https:\/\/cloudnestra\.com\/rcp\/[^"']*)["']/gi,
    /\/\/cloudnestra\.com\/rcp\/[^\s"'>]*/gi
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        let url = match;
        
        if (match.includes('<iframe')) {
          const srcMatch = match.match(/src\s*=\s*["']([^"']*)["']/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        } else if (match.match(/^["'][^]*["']$/)) {
          url = match.substring(1, match.length - 1);
        }
        
        url = url.trim();
        
        if (url.includes('cloudnestra.com/rcp')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (!url.startsWith('http')) {
            url = `https://${url}`;
          }
          
          const urlEndIndex = url.search(/(%3E|>|%20|\s)/);
          if (urlEndIndex > 0) {
            url = url.substring(0, urlEndIndex);
          }
          
          logger.info('Found CloudNestra URL:', url);
          return url;
        }
      }
    }
  }

  logger.error('CloudNestra URL not found in VidSrc HTML');
  return null;
}

// Extract ProRCP URL from CloudNestra HTML
export function extractProRcpUrl(html, logger) {
  logger.info('Extracting ProRCP URL from CloudNestra HTML...');

  const patterns = [
    /\$\(\'<iframe>\'[\s\S]*?src:\s*\'(\/prorcp\/[^\']+)\'/g,
    /src:\s*['"]\/prorcp\/([^'"]+)['"]/g,
    /\/prorcp\/[A-Za-z0-9+\/=]+/g,
    /'\/prorcp\/([^']+)'/g,
    /"\/prorcp\/([^"]+)"/g,
    /iframe[^>]*src\s*=\s*["']([^"']*prorcp[^"']*)["']/gi,
    /<iframe[^>]*src=["']([^"']*prorcp[^"']*)["'][^>]*>/gi,
    /file:\s*["']([^"']*prorcp[^"']*)/gi,
    /var\s+\w+\s*=\s*["']([^"']*prorcp[^"']*)/gi
  ];

  if (html.includes('player_parent') || html.includes('Playerjs') || html.includes('plyr