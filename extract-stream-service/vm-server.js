import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
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

// Simplified configuration - bulletproof method only
const CONFIG = {
  // Browser profiles directory
  profilesDir: path.join(__dirname, 'browser-profiles'),
  cookiesDir: path.join(__dirname, 'cookies'),
  
  // Timing configuration
  timing: {
    humanDelayMin: 100,
    humanDelayMax: 500,
    mouseMovementSpeed: 80,
    typingSpeed: { min: 80, max: 200 },
    scrollSpeed: { min: 200, max: 500 },
    pageLoadTimeout: 30000,
    challengeTimeout: 20000,
    retryAttempts: 3,
    retryDelay: 2000,
    navigationDelay: { min: 1000, max: 3000 },
    requestDelay: { min: 500, max: 1500 }
  },
  
  // Fingerprint pools
  fingerprints: {
    screens: [
      { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
      { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24 },
      { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24 },
      { width: 1536, height: 864, availWidth: 1536, availHeight: 824, colorDepth: 24, pixelDepth: 24 },
      { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24 }
    ],
    languages: [
      ['en-US', 'en'],
      ['en-GB', 'en'],
      ['en-CA', 'en'],
      ['en-AU', 'en']
    ],
    timezones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris'
    ],
    webGLVendors: [
      'Intel Inc.',
      'NVIDIA Corporation',
      'AMD',
      'Apple Inc.'
    ],
    webGLRenderers: [
      'Intel Iris OpenGL Engine',
      'NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2',
      'AMD Radeon Pro 5500M OpenGL Engine',
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

// Global request tracking
const activeRequests = new Map();
const profileUsage = new Map();

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
      const targetX = Math.random() * viewport.width;
      const targetY = Math.random() * viewport.height;
      
      await this.page.mouse.move(targetX, targetY, { steps: 10 });
      await this.humanDelay(10, 30);
    } catch (e) {
      this.logger.debug('Mouse movement error', { error: e.message });
    }
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

  async humanDelay(min = CONFIG.timing.humanDelayMin, max = CONFIG.timing.humanDelayMax) {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
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
      platform: this.getPlatformForUserAgent()
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

// Simplified Browser profile manager
class BrowserProfileManager {
  constructor(profilesDir) {
    this.profilesDir = profilesDir;
    this.profiles = new Map();
  }

  async getProfile(domain, requestId) {
    const baseProfileName = `profile_${domain.replace(/[^a-z0-9]/gi, '_')}_${requestId}`;
    const profilePath = path.join(this.profilesDir, baseProfileName);
    
    // Clean up any existing lock files
    const lockFile = path.join(profilePath, 'SingletonLock');
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch (e) {
        // Lock file might be in use
      }
    }
    
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    
    this.profiles.set(requestId, profilePath);
    return profilePath;
  }

  cleanupProfile(requestId) {
    const profilePath = this.profiles.get(requestId);
    if (profilePath) {
      try {
        // Remove lock file if it exists
        const lockFile = path.join(profilePath, 'SingletonLock');
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
        }
        
        this.profiles.delete(requestId);
      } catch (e) {
        // Cleanup failed, but don't throw
      }
    }
  }
}

// Cookie management
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
      
      await new Promise(resolve => setTimeout(resolve, 100));
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
    
    // Enhanced challenge detection and handling
    await this.behaviorSimulator.simulateReading(1500);
    
    // Wait for challenge to appear
    try {
      await this.page.waitForSelector('.cf-turnstile, #challenge-form, .cf-challenge-running', {
        timeout: 15000,
        visible: true
      });
    } catch (e) {
      this.logger.debug('Challenge selector not found, checking for other patterns');
      
      const hasChallengePage = await this.page.evaluate(() => {
        return document.title.includes('Just a moment') ||
               document.title.includes('Checking your browser') ||
               document.body.textContent.includes('Cloudflare') ||
               document.body.textContent.includes('checking your browser') ||
               document.querySelector('script[src*="challenges.cloudflare.com"]') !== null;
      });
      
      if (!hasChallengePage) {
        this.logger.debug('No Cloudflare challenge detected');
        return true;
      }
    }
    
    // Extended delay for challenge to fully load
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    
    // Simulate human-like interaction
    await this.behaviorSimulator.moveMouseNaturally();
    await this.behaviorSimulator.humanDelay(500, 1000);
    
    // Check for various challenge types
    const challengeTypes = [
      'input[type="checkbox"]',
      '.cf-turnstile input',
      '.challenge-form input[type="checkbox"]',
      '#challenge-form input',
      'input[name*="cf"]',
      'button[type="submit"]'
    ];
    
    for (const selector of challengeTypes) {
      const element = await this.page.$(selector);
      if (element) {
        this.logger.info(`Found challenge element: ${selector}`);
        const box = await element.boundingBox();
        if (box) {
          await this.behaviorSimulator.moveMouseNaturally();
          await this.behaviorSimulator.humanDelay(1000, 2000);
          
          await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
          await this.behaviorSimulator.humanDelay(300, 700);
          
          await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          this.logger.info('Clicked challenge element');
          
          await this.behaviorSimulator.humanDelay(500, 1000);
          break;
        }
      }
    }
    
    // Wait for solution
    const solved = await this.waitForSolution(45000);
    
    if (solved) {
      this.logger.info('Cloudflare challenge solved successfully');
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

// Create browser without proxy functionality
async function createStealthBrowser(logger, options = {}) {
  const requestId = options.requestId || 'unknown';
  const fingerprintManager = new FingerprintManager();
  const fingerprint = fingerprintManager.generateFingerprint();
  const profileManager = new BrowserProfileManager(CONFIG.profilesDir);
  
  const profilePath = await profileManager.getProfile(options.domain || 'default', requestId);
  
  logger.info('Creating stealth browser', {
    requestId,
    fingerprint: {
      userAgent: fingerprint.userAgent.substring(0, 50) + '...',
      screen: fingerprint.screen,
      timezone: fingerprint.timezone
    },
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
    `--lang=${fingerprint.languages[0]}`,
    '--disable-features=VizDisplayCompositor',
    '--disable-features=VizServiceDisplayCompositor',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-java',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-hang-monitor',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-domain-reliability',
    '--autoplay-policy=no-user-gesture-required'
  ];
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      userDataDir: profilePath,
      args: launchArgs,
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled'],
      defaultViewport: null
    });
    
    logger.info('Browser launched successfully', { requestId, profilePath });
    
    // Apply fingerprint to all pages
    browser.on('targetcreated', async (target) => {
      const page = await target.page();
      if (page) {
        await applyFingerprint(page, fingerprint, logger);
      }
    });
    
    return { browser, fingerprint, profileManager, requestId };
    
  } catch (error) {
    logger.error('Browser launch failed', error, {
      requestId,
      profilePath,
      lockFileExists: fs.existsSync(path.join(profilePath, 'SingletonLock')),
      profileExists: fs.existsSync(profilePath)
    });
    
    // Clean up on failure
    profileManager.cleanupProfile(requestId);
    throw error;
  }
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

  if (html.includes('player_parent') || html.includes('Playerjs') || html.includes('plyr')) {
    logger.info('Direct player detected, no ProRCP URL needed');
    return null;
  }

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      for (const match of matches) {
        let url = match[1] || match[0];
        
        // Clean up the URL
        url = url.replace(/^["']|["']$/g, '');
        
        // Skip if it's not a ProRCP URL
        if (!url.includes('prorcp')) continue;
        
        // Add domain if it's a relative URL
        if (url.startsWith('/prorcp/')) {
          url = `https://cloudnestra.com${url}`;
        } else if (!url.startsWith('http')) {
          url = `https://${url}`;
        }
        
        logger.info('Found ProRCP URL:', url);
        return url;
      }
    }
  }

  logger.error('ProRCP URL not found');
  return null;
}

// Extract Shadowlands URL from ProRCP HTML
function extractShadowlandsUrlFromProRCP(html, logger) {
  logger.info('Extracting Shadowlands URL from ProRCP HTML...');
  
  const patterns = [
    // Look for direct shadowlands URLs
    /https?:\/\/[^\s"'<>]*shadowlands[^\s"'<>]*/gi,
    /['"]([^'"]*shadowlands[^'"]*)['"]/gi,
    
    // Look for iframe src with shadowlands
    /<iframe[^>]*src\s*=\s*["']([^"']*shadowlands[^"']*)["'][^>]*>/gi,
    /iframe\.src\s*=\s*["']([^"']*shadowlands[^'"]*)['"]/gi,
    
    // Look for any URL pattern that might be shadowlands
    /src\s*[:=]\s*["']([^"']*(?:shadow|lands|player)[^'"]*)['"]/gi,
    
    // Look in JavaScript code
    /(?:url|src|source|file)\s*[:=]\s*["']([^"']*shadowlands[^'"]*)['"]/gi,
    
    // Look for base64 encoded URLs that might contain shadowlands
    /atob\(['"]([^'"]+)['"]\)/gi,
    
    // Look for any iframe src
    /<iframe[^>]*src\s*=\s*["']([^"']*)["'][^>]*>/gi,
    /iframe\.src\s*=\s*["']([^'"]+)['"]/gi
  ];
  
  // First try to find direct shadowlands URLs
  for (const pattern of patterns.slice(0, 6)) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      let url = match[1] || match[0];
      
      // Clean up the URL
      url = url.replace(/^["']|["']$/g, '').trim();
      
      if (url.includes('shadowlands') || url.includes('shadow') || url.includes('lands')) {
        // Ensure it's a full URL
        if (!url.startsWith('http')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (url.startsWith('/')) {
            url = `https://shadowlands.com${url}`;
          } else {
            url = `https://${url}`;
          }
        }
        
        logger.info('Found Shadowlands URL:', url);
        return url;
      }
    }
  }
  
  // Try to decode base64 URLs
  const base64Matches = [...html.matchAll(/atob\(['"]([^'"]+)['"]\)/gi)];
  for (const match of base64Matches) {
    try {
      const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
      if (decoded.includes('shadowlands') || decoded.includes('http')) {
        logger.info('Found base64 encoded Shadowlands URL:', decoded);
        return decoded;
      }
    } catch (e) {
      // Invalid base64
    }
  }
  
  // Last resort: find any iframe src and check if it might be shadowlands
  const iframeMatches = [...html.matchAll(/<iframe[^>]*src\s*=\s*["']([^"']*)["'][^>]*>/gi)];
  for (const match of iframeMatches) {
    let url = match[1].trim();
    
    if (url && !url.includes('about:blank') && !url.includes('javascript:')) {
      // Ensure it's a full URL
      if (!url.startsWith('http')) {
        if (url.startsWith('//')) {
          url = `https:${url}`;
        } else if (url.startsWith('/')) {
          url = `https://prorcp.cc${url}`;
        } else {
          url = `https://${url}`;
        }
      }
      
      logger.info('Found potential Shadowlands iframe URL:', url);
      return url;
    }
  }
  
  logger.error('Shadowlands URL not found in ProRCP HTML');
  return null;
}

// Bulletproof extraction function - simplified without proxies
async function bulletproofExtraction(url, tmdbId, season, episode, requestId) {
  const logger = createLogger(requestId);
  const startTime = Date.now();
  
  logger.info('Starting bulletproof extraction', { url, tmdbId, season, episode });
  
  // Track this request
  activeRequests.set(requestId, {
    id: requestId,
    startTime: Date.now(),
    url,
    profilePath: null
  });
  
  const cookieManager = new CookieManager();
  let browser = null;
  let browserInfo = null;
  let attempt = 0;
  let lastError = null;
  
  while (attempt < CONFIG.timing.retryAttempts) {
    attempt++;
    logger.info(`Attempt ${attempt}/${CONFIG.timing.retryAttempts}`);
    
    try {
      // Create stealth browser
      browserInfo = await createStealthBrowser(logger, {
        domain: 'vidsrc.cc',
        requestId: requestId
      });
      browser = browserInfo.browser;
      const { fingerprint, profileManager } = browserInfo;
      
      // Update request tracking
      const requestData = activeRequests.get(requestId);
      if (requestData) {
        requestData.profilePath = browserInfo.profilePath;
      }
      
      const page = await browser.newPage();
      const behaviorSimulator = new HumanBehaviorSimulator(page, logger);
      const cloudflareSolver = new CloudflareSolver(page, behaviorSimulator, logger);
      
      // Apply fingerprint
      await applyFingerprint(page, fingerprint, logger);
      
      // Enable request interception
      await page.setRequestInterception(true);
      
      // Advanced request interception
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();
        
        // Block unnecessary resources
        if (['image', 'stylesheet', 'font', 'texttrack', 'manifest'].includes(resourceType)) {
          request.abort();
          return;
        }
        
        // Block tracking and analytics
        if (url.includes('google-analytics') ||
            url.includes('doubleclick') ||
            url.includes('facebook') ||
            url.includes('twitter') ||
            url.includes('amazon-adsystem')) {
          request.abort();
          return;
        }
        
        // Modify headers
        const headers = {
          ...request.headers(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': fingerprint.languages.join(','),
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        };
        
        // Remove automation headers
        delete headers['x-devtools-emulate-network-conditions-client-id'];
        delete headers['x-automation'];
        
        request.continue({ headers });
      });
      
      // Log responses
      page.on('response', (response) => {
        const status = response.status();
        const url = response.url();
        
        if (status >= 400) {
          logger.warn('HTTP error', { url, status });
        }
      });
      
      // Handle console messages
      page.on('console', (msg) => {
        logger.debug('Console', { type: msg.type(), text: msg.text() });
      });
      
      // Restore cookies for VidSrc
      await cookieManager.restore(page, 'vidsrc.cc', logger);
      
      // Navigate to VidSrc
      logger.info('Navigating to VidSrc URL');
      
      const preNavDelay = CONFIG.timing.navigationDelay.min +
        Math.random() * (CONFIG.timing.navigationDelay.max - CONFIG.timing.navigationDelay.min);
      await new Promise(resolve => setTimeout(resolve, preNavDelay));
      
      try {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: CONFIG.timing.pageLoadTimeout
        });
      } catch (navError) {
        logger.warn('Navigation error, checking if page loaded anyway', { error: navError.message });
        
        try {
          await page.waitForSelector('body', { timeout: 5000 });
        } catch (e) {
          logger.error('Page did not load at all');
          throw navError;
        }
      }
      
      // Human-like behavior
      await behaviorSimulator.simulateReading(2000);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for Cloudflare challenge
      const hasChallenge = await cloudflareSolver.waitForChallenge(3000);
      if (hasChallenge) {
        const solved = await cloudflareSolver.solveChallenge();
        if (!solved) {
          throw new Error('Failed to solve Cloudflare challenge');
        }
      }
      
      // Wait for CloudNestra URL
      logger.info('Waiting for CloudNestra URL...');
      let cloudNestraUrl = null;
      const startWait = Date.now();
      
      while (!cloudNestraUrl && (Date.now() - startWait < 5000)) {
        const html = await page.content();
        cloudNestraUrl = extractCloudNestraUrl(html, logger);
        if (!cloudNestraUrl) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      if (!cloudNestraUrl) {
        throw new Error('CloudNestra URL not found');
      }
      
      // Navigate to CloudNestra
      logger.info('Navigating to CloudNestra');
      
      const cloudNavDelay = CONFIG.timing.navigationDelay.min +
        Math.random() * (CONFIG.timing.navigationDelay.max - CONFIG.timing.navigationDelay.min);
      await new Promise(resolve => setTimeout(resolve, cloudNavDelay));
      
      try {
        await page.goto(cloudNestraUrl, {
          waitUntil: 'networkidle2',
          timeout: CONFIG.timing.pageLoadTimeout
        });
      } catch (navError) {
        logger.warn('CloudNestra navigation error', { error: navError.message });
      }
      
      // Human-like behavior
      await behaviorSimulator.simulateReading(1500);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check for Cloudflare on CloudNestra
      const cloudNestraChallenge = await cloudflareSolver.waitForChallenge(2000);
      if (cloudNestraChallenge) {
        await cloudflareSolver.solveChallenge();
      }
      
      // Wait for ProRCP URL
      logger.info('Waiting for ProRCP URL...');
      let proRcpUrl = null;
      const proRcpStartWait = Date.now();
      
      while (!proRcpUrl && (Date.now() - proRcpStartWait < 5000)) {
        const html = await page.content();
        proRcpUrl = extractProRcpUrl(html, logger);
        
        if (!proRcpUrl) {
          // Check if player is directly available
          const hasDirectPlayer = await page.evaluate(() => {
            return document.querySelector('#player_parent') !== null ||
                   document.querySelector('video') !== null;
          });
          
          if (hasDirectPlayer) {
            logger.info('Direct player found, extracting stream');
            const streamUrl = await page.evaluate(() => {
              const video = document.querySelector('video');
              if (video && video.src) return video.src;
              
              const scripts = Array.from(document.scripts);
              for (const script of scripts) {
                const match = script.textContent.match(/file:\s*["']([^"']+)["']/);
                if (match) return match[1];
              }
              
              return null;
            });
            
            if (streamUrl) {
              if (browser) await browser.close();
              const duration = logger.timing('Total extraction time', startTime);
              return {
                url: streamUrl,
                type: 'direct',
                source: 'cloudnestra',
                metadata: {
                  tmdbId,
                  season,
                  episode,
                  duration,
                  attempts: attempt,
                  proxy: 'none'
                }
              };
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      if (!proRcpUrl) {
        throw new Error('ProRCP URL not found and no direct player available');
      }
      
      // Navigate to ProRCP
      logger.info('Navigating to ProRCP');
      
      const proNavDelay = CONFIG.timing.navigationDelay.min +
        Math.random() * (CONFIG.timing.navigationDelay.max - CONFIG.timing.navigationDelay.min);
      await new Promise(resolve => setTimeout(resolve, proNavDelay));
      
      try {
        await page.goto(proRcpUrl, {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.timing.pageLoadTimeout
        });
      } catch (navError) {
        logger.warn('ProRCP navigation error', { error: navError.message });
      }
      
      // Human-like behavior
      await behaviorSimulator.simulateReading(1800);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for Cloudflare on ProRCP
      const proRcpChallenge = await cloudflareSolver.waitForChallenge(5000);
      if (proRcpChallenge) {
        await cloudflareSolver.solveChallenge();
      }
      
      // Wait for Shadowlands URL
      logger.info('Waiting for Shadowlands URL...');
      let shadowlandsUrl = null;
      const shadowlandsStartWait = Date.now();
      
      while (!shadowlandsUrl && (Date.now() - shadowlandsStartWait < 5000)) {
        const html = await page.content();
        shadowlandsUrl = await extractShadowlandsUrlFromProRCP(html, logger);
        
        if (!shadowlandsUrl) {
          // Try to find iframes
          try {
            const iframes = await page.$$eval('iframe', frames =>
              frames.map(f => f.src).filter(src => src && src.length > 0)
            );
            
            for (const iframe of iframes) {
              if (iframe && (iframe.includes('shadowlands') || iframe.includes('shadow') || iframe.includes('lands'))) {
                logger.info('Found Shadowlands iframe:', iframe);
                shadowlandsUrl = iframe;
                break;
              }
            }
          } catch (e) {
            // No iframes yet
          }
          
          if (!shadowlandsUrl) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
      
      if (!shadowlandsUrl) {
        throw new Error('Shadowlands URL not found in ProRCP page');
      }
      
      logger.info('Found Shadowlands URL, returning it directly:', shadowlandsUrl);
      
      // Close browser
      if (browser) {
        await browser.close();
      }
      
      // Clean up profile and tracking
      if (browserInfo?.profileManager && browserInfo?.requestId) {
        browserInfo.profileManager.cleanupProfile(browserInfo.requestId);
      }
      activeRequests.delete(requestId);
      
      const duration = logger.timing('Total extraction time', startTime);
      
      // Return the shadowlands URL directly
      return {
        url: shadowlandsUrl,
        type: 'shadowlands',
        source: 'prorcp',
        metadata: {
          tmdbId,
          season,
          episode,
          duration,
          attempts: attempt,
          proxy: 'none'
        }
      };
      
    } catch (error) {
      lastError = error;
      logger.error(`Attempt ${attempt} failed`, error);
      
      // Clean up browser and profile
      if (browser) {
        await browser.close();
        browser = null;
      }
      
      if (browserInfo?.profileManager && browserInfo?.requestId) {
        browserInfo.profileManager.cleanupProfile(browserInfo.requestId);
      }
      
      if (attempt < CONFIG.timing.retryAttempts) {
        const delay = CONFIG.timing.retryDelay;
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Clean up tracking
  activeRequests.delete(requestId);
  
  throw new Error(`Failed after ${CONFIG.timing.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
}

// API endpoint for bulletproof extraction
app.get('/api/extract/bulletproof', async (req, res) => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const startTime = Date.now();
  
  try {
    // Get parameters from query string
    const { tmdbId, season, episode } = req.query;
    
    if (!tmdbId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: tmdbId',
        requestId
      });
    }
    
    logger.info('Received extraction request', { tmdbId, season, episode });
    
    // Build VidSrc URL
    let url;
    if (season && episode) {
      url = `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`;
    } else {
      url = `https://vidsrc.xyz/embed/movie/${tmdbId}`;
    }
    
    // Perform bulletproof extraction
    const result = await bulletproofExtraction(url, tmdbId, season, episode, requestId);
    
    const totalDuration = logger.timing('Total request time', startTime);
    
    res.json({
      success: true,
      data: result,
      requestId,
      duration: totalDuration
    });
    
  } catch (error) {
    logger.error('Extraction failed', error);
    const totalDuration = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: error.message,
      requestId,
      duration: totalDuration
    });
  }
});

// Test endpoint
app.get('/test', async (req, res) => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  try {
    logger.info('Test endpoint called');
    
    // Test with a known working movie
    const testTmdbId = '550'; // Fight Club
    const url = `https://vidsrc.xyz/embed/movie/${testTmdbId}`;
    
    const result = await bulletproofExtraction(url, testTmdbId, null, null, requestId);
    
    res.json({
      success: true,
      message: 'Bulletproof extraction service is working',
      test_result: result,
      requestId
    });
    
  } catch (error) {
    logger.error('Test failed', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Bulletproof extraction service test failed',
      requestId
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vm-server-bulletproof',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    config: {
      proxies: 0, // No proxies in this version
      retryAttempts: CONFIG.timing.retryAttempts,
      profiles: fs.existsSync(CONFIG.profilesDir),
      cookies: fs.existsSync(CONFIG.cookiesDir)
    }
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Bulletproof VM Server (No Proxies) running on ${HOST}:${PORT}`);
  console.log('\n🌐 Server is accessible from:');
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://${HOST}:${PORT}`);
  console.log(`   - Public: http://<your-public-ip>:${PORT}`);
  console.log('\n📋 Configuration:');
  console.log(`   - Proxies configured: 0 (bulletproof method only)`);
  console.log(`   - Retry attempts: ${CONFIG.timing.retryAttempts}`);
  console.log(`   - Human delay range: ${CONFIG.timing.humanDelayMin}-${CONFIG.timing.humanDelayMax}ms`);
  console.log(`   - Page load timeout: ${CONFIG.timing.pageLoadTimeout}ms`);
  console.log(`   - Challenge timeout: ${CONFIG.timing.challengeTimeout}ms`);
  console.log(`   - Browser profiles: ${CONFIG.profilesDir}`);
  console.log(`   - Cookies storage: ${CONFIG.cookiesDir}`);
  console.log('\n🔧 Available endpoints:');
  console.log(`   GET /api/extract/bulletproof - Extract shadowlands URL`);
  console.log(`   GET /test - Test the extraction service`);
  console.log(`   GET /health - Check service health`);
  console.log('\n🔗 Example GET request:');
  console.log(`   GET http://${HOST}:${PORT}/api/extract/bulletproof?tmdbId=550`);
  console.log(`   GET http://${HOST}:${PORT}/api/extract/bulletproof?tmdbId=1396&season=1&episode=1\n`);
});

export default app;