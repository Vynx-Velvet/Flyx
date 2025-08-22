import {
  CONFIG,
  createLogger,
  generateRequestId,
  UserAgentGenerator,
  HumanBehaviorSimulator,
  FingerprintManager,
  BrowserProfileManager,
  ProxyManager,
  app,
  PORT
} from './vm-server-bulletproof-part1.js';
import { stealthInjections } from './stealth-injections.js';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    '--disable-blink-features=AutomationControlled',
    '--disable-features=AutomationControlled',
    '--disable-automation',
    '--disable-blink-features',
    '--disable-infobars',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-sync',
    '--disable-client-side-phishing-detection',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--metrics-recording-only',
    '--no-first-run',
    '--password-store=basic',
    '--use-mock-keychain',
    '--force-color-profile=srgb',
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