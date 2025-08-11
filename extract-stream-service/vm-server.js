const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logging system for extraction service (CommonJS compatible)
function createLogger(requestId) {
  const logPrefix = `[${requestId}]`;

  return {
    info: (message, data = {}) => {
      const timestamp = new Date().toISOString();
      console.log(`ℹ️  ${timestamp} ${logPrefix} ${message}`, data && Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
    },
    warn: (message, data = {}) => {
      const timestamp = new Date().toISOString();
      console.log(`⚠️  ${timestamp} ${logPrefix} ${message}`, data && Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
    },
    error: (message, error = null, data = {}) => {
      const timestamp = new Date().toISOString();
      const errorMsg = error?.message || error || '';
      console.log(`❌ ${timestamp} ${logPrefix} ${message}`, errorMsg, data && Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
    },
    debug: (message, data = {}) => {
      const timestamp = new Date().toISOString();
      console.log(`🔍 ${timestamp} ${logPrefix} ${message}`, data && Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
    },
    timing: (label, startTime) => {
      const duration = Date.now() - startTime;
      const timestamp = new Date().toISOString();
      console.log(`⏱️  ${timestamp} ${logPrefix} Timer: ${label} - ${duration}ms`);
      return duration;
    }
  };
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Advanced user agent rotation with realistic browser fingerprints
function getAdvancedUserAgent() {
  const browserFingerprints = [
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      platform: 'Win32',
      vendor: 'Google Inc.',
      language: 'en-US',
      languages: ['en-US', 'en'],
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 0,
      colorDepth: 24,
      pixelDepth: 24,
      screenWidth: 1920,
      screenHeight: 1080,
      availWidth: 1920,
      availHeight: 1040,
      timezone: 'America/New_York'
    },
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      platform: 'Win32',
      vendor: 'Google Inc.',
      language: 'en-US',
      languages: ['en-US', 'en'],
      hardwareConcurrency: 12,
      deviceMemory: 16,
      maxTouchPoints: 0,
      colorDepth: 24,
      pixelDepth: 24,
      screenWidth: 2560,
      screenHeight: 1440,
      availWidth: 2560,
      availHeight: 1400,
      timezone: 'America/Los_Angeles'
    },
    {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      vendor: 'Google Inc.',
      language: 'en-US',
      languages: ['en-US', 'en'],
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 0,
      colorDepth: 24,
      pixelDepth: 24,
      screenWidth: 1440,
      screenHeight: 900,
      availWidth: 1440,
      availHeight: 875,
      timezone: 'America/New_York'
    },
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
      platform: 'Win32',
      vendor: '',
      language: 'en-US',
      languages: ['en-US', 'en'],
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 0,
      colorDepth: 24,
      pixelDepth: 24,
      screenWidth: 1920,
      screenHeight: 1080,
      availWidth: 1920,
      availHeight: 1040,
      timezone: 'America/Chicago'
    },
    {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      vendor: 'Google Inc.',
      language: 'en-US',
      languages: ['en-US', 'en'],
      hardwareConcurrency: 4,
      deviceMemory: 4,
      maxTouchPoints: 0,
      colorDepth: 24,
      pixelDepth: 24,
      screenWidth: 1366,
      screenHeight: 768,
      availWidth: 1366,
      availHeight: 728,
      timezone: 'America/New_York'
    }
  ];

  return browserFingerprints[Math.floor(Math.random() * browserFingerprints.length)];
}

// Legacy function for backward compatibility
function getRandomUserAgent() {
  return getAdvancedUserAgent().userAgent;
}

// Server hash rotation system for CloudStream Pro, 2Embed, Superembed fallback
async function tryServerHashes(movieId, seasonId, episodeId, mediaType, logger) {
  const servers = [
    { name: 'CloudStream Pro', hash: 'pro' },
    { name: '2Embed', hash: '2embed' },
    { name: 'Superembed', hash: 'super' }
  ];

  const attempts = [];

  for (const server of servers) {
    try {
      logger.info(`Attempting server hash: ${server.name}`, { hash: server.hash });

      let url;
      if (mediaType === 'movie') {
        url = `https://vidsrc.xyz/embed/movie?tmdb=${movieId}&server=${server.hash}`;
      } else {
        url = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}&server=${server.hash}`;
      }

      attempts.push({
        server: server.name,
        hash: server.hash,
        url: url,
        attempted: true
      });

      // Return the URL for this server attempt
      return { url, server: server.name, hash: server.hash, attempts };

    } catch (error) {
      logger.warn(`Server hash ${server.name} failed`, { error: error.message });
      attempts.push({
        server: server.name,
        hash: server.hash,
        error: error.message,
        attempted: true
      });
    }
  }

  return { url: null, server: null, hash: null, attempts };
}

// Enhanced iframe chain navigation for vidsrc.xyz → cloudnestra.com/rcp → cloudnestra.com/prorcp flow
async function navigateIframeChain(page, logger) {
  const navigationStart = Date.now();
  const iframeChain = [];

  try {
    logger.info('Starting enhanced iframe chain navigation');

    // Wait for initial page load
    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 1: Look for vidsrc.xyz iframe
    const vidsrcIframe = await page.$('iframe[src*="vidsrc"]');
    if (vidsrcIframe) {
      const src = await vidsrcIframe.evaluate(el => el.src);
      iframeChain.push({ step: 1, url: src, description: 'vidsrc.xyz initial iframe' });
      logger.info('Found vidsrc.xyz iframe', { src: src.substring(0, 100) });

      try {
        const vidsrcFrame = await vidsrcIframe.contentFrame();
        if (vidsrcFrame) {
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Step 2: Look for cloudnestra.com/rcp iframe within vidsrc frame
          const rcpIframe = await vidsrcFrame.$('iframe[src*="cloudnestra.com/rcp"], iframe[src*="/rcp"]');
          if (rcpIframe) {
            const rcpSrc = await rcpIframe.evaluate(el => el.src);
            iframeChain.push({ step: 2, url: rcpSrc, description: 'cloudnestra.com/rcp iframe' });
            logger.info('Found cloudnestra.com/rcp iframe', { src: rcpSrc.substring(0, 100) });

            try {
              const rcpFrame = await rcpIframe.contentFrame();
              if (rcpFrame) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Step 3: Look for play button (#pl_but) in rcp frame
                const playButton = await rcpFrame.$('#pl_but, .fas.fa-play, button[class*="play"]');
                if (playButton) {
                  logger.info('Found play button in rcp frame, simulating click');

                  // Simulate realistic human interaction
                  await playButton.hover();
                  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
                  await playButton.click();

                  // Wait for prorcp iframe to load
                  await new Promise(resolve => setTimeout(resolve, 4000));

                  // Step 4: Look for cloudnestra.com/prorcp iframe
                  const prorcp = await rcpFrame.$('iframe[src*="cloudnestra.com/prorcp"], iframe[src*="/prorcp"]');
                  if (prorcp) {
                    const prorcpSrc = await prorcp.evaluate(el => el.src);
                    iframeChain.push({ step: 4, url: prorcpSrc, description: 'cloudnestra.com/prorcp final iframe' });
                    logger.info('Found cloudnestra.com/prorcp iframe', { src: prorcpSrc.substring(0, 100) });

                    try {
                      const prorcpFrame = await prorcp.contentFrame();
                      if (prorcpFrame) {
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        // Step 5: Look for final video player or shadowlandschronicles iframe
                        const finalIframe = await prorcpFrame.$('iframe[src*="shadowlandschronicles"], iframe[src*="stream"]');
                        if (finalIframe) {
                          const finalSrc = await finalIframe.evaluate(el => el.src);
                          iframeChain.push({ step: 5, url: finalSrc, description: 'shadowlandschronicles.com stream iframe' });
                          logger.info('Found shadowlandschronicles stream iframe', { src: finalSrc.substring(0, 100) });
                        }
                      }
                    } catch (e) {
                      logger.debug('Could not access prorcp iframe content (CORS)', { error: e.message });
                    }
                  }
                }
              }
            } catch (e) {
              logger.debug('Could not access rcp iframe content (CORS)', { error: e.message });
            }
          }
        }
      } catch (e) {
        logger.debug('Could not access vidsrc iframe content (CORS)', { error: e.message });
      }
    }

    logger.timing('Iframe chain navigation completed', navigationStart);
    return { success: true, iframeChain, extractionMethod: 'iframe_chain' };

  } catch (error) {
    logger.error('Iframe chain navigation failed', error);
    return { success: false, iframeChain, error: error.message, extractionMethod: 'iframe_chain' };
  }
}

// Advanced behavioral simulation with realistic mouse movements and timing delays
async function simulateAdvancedHumanBehavior(page, logger) {
  try {
    logger.info('Starting advanced human behavior simulation');

    // Simulate realistic mouse movements across the page
    const viewport = await page.viewport();
    const movements = 5 + Math.floor(Math.random() * 8); // 5-12 movements

    for (let i = 0; i < movements; i++) {
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;

      // Move mouse with realistic speed variation
      await page.mouse.move(x, y, { steps: 3 + Math.floor(Math.random() * 5) });
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
    }

    // Simulate scrolling behavior
    const scrolls = 2 + Math.floor(Math.random() * 4); // 2-5 scrolls
    for (let i = 0; i < scrolls; i++) {
      const scrollY = Math.random() * 500 - 250; // Random scroll up/down
      await page.evaluate((scrollY) => {
        window.scrollBy(0, scrollY);
      }, scrollY);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    }

    // Simulate keyboard activity (tab navigation)
    const tabPresses = 1 + Math.floor(Math.random() * 3); // 1-3 tab presses
    for (let i = 0; i < tabPresses; i++) {
      await page.keyboard.press('Tab');
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
    }

    // Simulate focus events
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('resize'));
    });

    logger.info('Advanced human behavior simulation completed', {
      mouseMovements: movements,
      scrolls,
      tabPresses
    });

  } catch (error) {
    logger.warn('Advanced behavior simulation error', { error: error.message });
  }
}

// Enhanced request throttling and pattern randomization
class RequestThrottler {
  constructor() {
    this.requestTimes = [];
    this.minDelay = 100; // Minimum delay between requests
    this.maxDelay = 2000; // Maximum delay between requests
    this.burstLimit = 5; // Maximum requests in burst
    this.burstWindow = 10000; // 10 second window
  }

  async throttleRequest(logger) {
    const now = Date.now();

    // Clean old requests outside burst window
    this.requestTimes = this.requestTimes.filter(time => now - time < this.burstWindow);

    // Check if we're hitting burst limit
    if (this.requestTimes.length >= this.burstLimit) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = this.burstWindow - (now - oldestRequest);

      if (waitTime > 0) {
        logger.info('Request throttling active', { waitTime, requestCount: this.requestTimes.length });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Add randomized delay to avoid pattern detection
    const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Record this request
    this.requestTimes.push(Date.now());

    logger.debug('Request throttled', { delay: Math.round(delay), activeRequests: this.requestTimes.length });
  }
}

const globalThrottler = new RequestThrottler();

// Sandbox detection bypass with proper iframe access handling
async function bypassSandboxDetection(page, logger) {
  try {
    logger.info('Implementing sandbox detection bypass');

    await page.evaluateOnNewDocument(() => {
      // Override iframe sandbox detection
      const originalCreateElement = document.createElement;
      document.createElement = function (tagName) {
        const element = originalCreateElement.call(this, tagName);

        if (tagName.toLowerCase() === 'iframe') {
          // Remove sandbox restrictions
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function (name, value) {
            if (name.toLowerCase() === 'sandbox') {
              // Allow all iframe capabilities
              return originalSetAttribute.call(this, name, 'allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock allow-top-navigation');
            }
            return originalSetAttribute.call(this, name, value);
          };
        }

        return element;
      };

      // Override window.parent access detection
      try {
        Object.defineProperty(window, 'parent', {
          get: function () {
            return window;
          },
          configurable: true
        });
      } catch (e) {
        // Ignore if already defined
      }

      // Override window.top access detection
      try {
        Object.defineProperty(window, 'top', {
          get: function () {
            return window;
          },
          configurable: true
        });
      } catch (e) {
        // Ignore if already defined
      }

      // Override frame access detection
      try {
        Object.defineProperty(window, 'frameElement', {
          get: function () {
            return null;
          },
          configurable: true
        });
      } catch (e) {
        // Ignore if already defined
      }

      // Override document.domain to prevent cross-origin restrictions
      try {
        Object.defineProperty(document, 'domain', {
          get: function () {
            return location.hostname;
          },
          set: function (value) {
            // Allow domain setting
            return value;
          },
          configurable: true
        });
      } catch (e) {
        // Ignore if already defined
      }
    });

    logger.info('Sandbox detection bypass implemented');
    return { success: true };

  } catch (error) {
    logger.warn('Sandbox detection bypass failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

// Enhanced Cloudflare challenge detection and handling
async function detectAndHandleCloudflareChallenge(page, logger) {
  try {
    logger.info('Checking for Cloudflare challenges');

    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Check for Cloudflare challenge indicators
    const challengeIndicators = await page.evaluate(() => {
      const indicators = {
        hasTurnstile: !!document.querySelector('[data-sitekey]') || !!document.querySelector('.cf-turnstile'),
        hasCloudflareText: document.body.innerText.includes('Cloudflare') || document.body.innerText.includes('Just a moment'),
        hasChallengePage: document.title.includes('Just a moment') || document.title.includes('Cloudflare'),
        hasRayId: !!document.querySelector('[data-ray]') || document.body.innerText.includes('Ray ID'),
        pageSize: document.body.innerText.length
      };
      return indicators;
    });

    if (challengeIndicators.hasTurnstile || challengeIndicators.hasCloudflareText ||
      challengeIndicators.hasChallengePage || (challengeIndicators.pageSize < 3000 && challengeIndicators.hasRayId)) {

      logger.warn('Cloudflare challenge detected', challengeIndicators);

      // Try to wait for challenge to complete automatically
      logger.info('Waiting for Cloudflare challenge to resolve...');

      try {
        // Wait up to 30 seconds for challenge to complete
        await page.waitForFunction(() => {
          return !document.body.innerText.includes('Just a moment') &&
            !document.body.innerText.includes('Checking your browser') &&
            document.body.innerText.length > 3000;
        }, { timeout: 30000 });

        logger.info('Cloudflare challenge appears to have resolved');
        return { challengeDetected: true, resolved: true };

      } catch (timeoutError) {
        logger.error('Cloudflare challenge did not resolve within timeout');
        return { challengeDetected: true, resolved: false, error: 'Challenge timeout' };
      }
    }

    logger.info('No Cloudflare challenge detected');
    return { challengeDetected: false, resolved: true };

  } catch (error) {
    logger.error('Error detecting Cloudflare challenge', error);
    return { challengeDetected: false, resolved: false, error: error.message };
  }
}

// Realistic play button interaction simulation with Cloudflare challenge handling
async function simulatePlayButtonInteraction(page, logger, browser) {
  const interactionStart = Date.now();

  try {
    logger.info('Starting realistic play button interaction simulation');

    // Skip advanced behavior simulation and server selection - just find play button

    // Simple play button selector - focus on #pl_but
    const playSelectors = [
      '#pl_but'  // Primary play button
    ];

    let playButtonFound = false;

    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found play button elements', { selector, count: elements.length });

          for (const element of elements) {
            try {
              // Check if element is visible and interactable
              const isVisible = await element.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 &&
                  window.getComputedStyle(el).visibility !== 'hidden' &&
                  window.getComputedStyle(el).display !== 'none';
              });

              if (isVisible) {
                logger.info('Found visible #pl_but, clicking it', { selector });

                // Simple click without extra delays
                const clickSuccess = await safeClick(element, page, browser, logger, `play button (${selector})`);
                playButtonFound = clickSuccess;

                if (clickSuccess) {
                  logger.info('✅ Successfully clicked #pl_but, waiting for stream loading...');
                  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for streams to load
                }

                break;
              }
            } catch (e) {
              logger.debug('Error interacting with play button element', { error: e.message });
            }
          }

          if (playButtonFound) break;
        }
      } catch (e) {
        logger.debug('Error with play button selector', { selector, error: e.message });
      }
    }

    // If no standard play button found, try iframe-specific interaction
    if (!playButtonFound) {
      logger.info('No standard play button found, checking iframes');

      const iframes = await page.$$('iframe');
      for (const iframe of iframes) {
        try {
          const src = await iframe.evaluate(el => el.src);
          if (src && (src.includes('cloudnestra') || src.includes('rcp') || src.includes('prorcp'))) {
            logger.info('Found cloudnestra iframe, attempting interaction', { src: src.substring(0, 100) });

            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Look for play button in iframe
                for (const selector of playSelectors) {
                  try {
                    const playButton = await frame.$(selector);
                    if (playButton) {
                      logger.info('Found play button in iframe', { selector });
                      await playButton.hover();
                      await new Promise(resolve => setTimeout(resolve, 300));
                      await playButton.click();
                      playButtonFound = true;
                      await new Promise(resolve => setTimeout(resolve, 3000));
                      break;
                    }
                  } catch (e) {
                    // Continue to next selector
                  }
                }

                if (playButtonFound) break;
              }
            } catch (e) {
              logger.debug('Could not access iframe content (CORS)');
            }
          }
        } catch (e) {
          logger.debug('Error checking iframe', { error: e.message });
        }
      }
    }

    logger.timing('Play button interaction completed', interactionStart);
    return { success: playButtonFound, interactionMethod: 'realistic_simulation' };

  } catch (error) {
    logger.error('Play button interaction failed', error);
    return { success: false, error: error.message, interactionMethod: 'realistic_simulation' };
  }
}

// Screenshot functionality removed - VM-server now focuses only on stream extraction

// Validate request parameters and construct URLs
function validateParameters(query, logger) {
  const url = query.url;
  const mediaType = query.mediaType;
  const movieId = query.movieId;
  const seasonId = query.seasonId;
  const episodeId = query.episodeId;
  const server = query.server || 'vidsrc.xyz';

  logger.info('Request parameters received', {
    url: url ? url.substring(0, 100) + (url.length > 100 ? '...' : '') : null,
    mediaType,
    movieId,
    seasonId,
    episodeId,
    server,
    hasUrl: !!url
  });

  let finalUrl = url;

  // If no URL provided but we have media info, construct URL based on server
  if (!url && mediaType && movieId) {
    if (server.toLowerCase() === 'vidsrc.xyz' || server.toLowerCase() === 'vidsrc') {
      // Construct vidsrc.xyz URL
      if (mediaType === 'movie') {
        finalUrl = `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`;
        logger.info('Constructed vidsrc.xyz movie URL', {
          movieId,
          server,
          constructedUrl: finalUrl
        });
      } else if (mediaType === 'tv' && seasonId && episodeId) {
        finalUrl = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}`;
        logger.info('Constructed vidsrc.xyz TV episode URL', {
          movieId,
          seasonId,
          episodeId,
          server,
          constructedUrl: finalUrl
        });
      } else if (mediaType === 'tv') {
        logger.error('TV show missing season/episode parameters', null, {
          movieId,
          seasonId,
          episodeId,
          server
        });
        return {
          isValid: false,
          error: 'TV shows require seasonId and episodeId parameters'
        };
      }
    } else {
      // Default to embed.su URL construction (backup server)
      if (mediaType === 'movie') {
        finalUrl = `https://embed.su/embed/movie/${movieId}`;
        logger.info('Constructed embed.su movie URL', {
          movieId,
          server,
          constructedUrl: finalUrl
        });
      } else if (mediaType === 'tv' && seasonId && episodeId) {
        finalUrl = `https://embed.su/embed/tv/${movieId}/${seasonId}/${episodeId}`;
        logger.info('Constructed embed.su TV episode URL', {
          movieId,
          seasonId,
          episodeId,
          server,
          constructedUrl: finalUrl
        });
      } else if (mediaType === 'tv') {
        logger.error('TV show missing season/episode parameters', null, {
          movieId,
          seasonId,
          episodeId,
          server
        });
        return {
          isValid: false,
          error: 'TV shows require seasonId and episodeId parameters'
        };
      }
    }
  }

  // If still no URL, return error
  if (!finalUrl) {
    logger.error('Missing required parameters', null, {
      hasUrl: !!url,
      hasMediaType: !!mediaType,
      hasMovieId: !!movieId,
      message: 'Either url parameter or mediaType+movieId (and seasonId/episodeId for TV) are required'
    });
    return {
      isValid: false,
      error: 'Either url parameter or mediaType+movieId (and seasonId/episodeId for TV) are required'
    };
  }

  // Validate URL format
  try {
    new URL(finalUrl);
  } catch (e) {
    logger.error('Invalid URL format', e, { providedUrl: finalUrl });
    return { isValid: false, error: 'Invalid URL format' };
  }

  logger.info('Final URL validated', {
    originalUrl: url,
    finalUrl: finalUrl,
    isEmbedSu: finalUrl.includes('embed.su'),
    mediaType
  });

  return {
    isValid: true,
    params: { url: finalUrl, mediaType, movieId, seasonId, episodeId, server }
  };
}

// Cross-platform Chrome executable detection
function findChromeExecutable() {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  const platform = os.platform();

  if (platform === 'win32') {
    // Windows Chrome paths
    const windowsPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
      path.join(os.homedir(), 'AppData\\Local\\Chromium\\Application\\chrome.exe')
    ];

    for (const chromePath of windowsPaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }
  } else if (platform === 'linux') {
    // Linux Chrome paths
    const linuxPaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    ];

    for (const chromePath of linuxPaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }
  } else if (platform === 'darwin') {
    // macOS Chrome paths
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];

    for (const chromePath of macPaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }
  }

  // Fallback - let Puppeteer find Chrome automatically
  return null;
}

// Tab management utility functions
async function handleNewTabsAndFocus(browser, originalPage, logger) {
  try {
    // Get all pages (tabs)
    const allPages = await browser.pages();

    if (allPages.length > 1) {
      logger.info(`🔄 Detected ${allPages.length} tabs, managing focus`, {
        totalTabs: allPages.length,
        originalPageUrl: await originalPage.url()
      });

      // Close any new tabs that aren't our original page
      for (const page of allPages) {
        if (page !== originalPage) {
          const pageUrl = await page.url();
          logger.info(`🗑️ Closing unwanted tab: ${pageUrl.substring(0, 100)}`);
          await page.close();
        }
      }

      // Ensure our original page is focused and brought to front
      await originalPage.bringToFront();
      await originalPage.focus();

      logger.info('✅ Successfully managed tabs and restored focus to original page');
    }

    return true;
  } catch (error) {
    logger.warn('⚠️ Error managing tabs', { error: error.message });
    return false;
  }
}

// Enhanced initial tab management for embed sites that auto-open popups
async function handleInitialPopups(browser, originalPage, logger) {
  try {
    logger.info('🚀 Starting initial popup management for embed site');

    // Wait for any immediate popups (many embed sites open them instantly)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get all pages and log them for debugging
    const allPages = await browser.pages();
    logger.info(`📊 Initial tab count: ${allPages.length}`);

    if (allPages.length > 1) {
      logger.info('🚨 Detected immediate popups/new tabs from embed site');

      // Log all tab URLs for debugging
      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];
        const pageUrl = await page.url();
        const isOriginal = page === originalPage;
        logger.info(`📄 Tab ${i + 1}: ${isOriginal ? '[ORIGINAL]' : '[POPUP]'} ${pageUrl.substring(0, 150)}`);
      }

      // Close all tabs except the original
      let closedCount = 0;
      for (const page of allPages) {
        if (page !== originalPage) {
          try {
            await page.close();
            closedCount++;
          } catch (e) {
            logger.warn('⚠️ Could not close popup tab', { error: e.message });
          }
        }
      }

      logger.info(`🗑️ Closed ${closedCount} popup tabs`);

      // Ensure original page is active and focused
      await originalPage.bringToFront();
      await originalPage.focus();

      // Wait a moment for focus to settle
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('✅ Initial popup management completed, focus restored to embed page');
    } else {
      logger.info('✅ No immediate popups detected, proceeding normally');
    }

    return true;
  } catch (error) {
    logger.error('❌ Error in initial popup management', error);
    return false;
  }
}

// Enhanced click function that handles popups and new tabs
async function safeClick(element, page, browser, logger, description = 'element') {
  try {
    logger.info(`🖱️ Attempting to click ${description}`);

    // Get initial tab count
    const initialPages = await browser.pages();
    const initialTabCount = initialPages.length;

    // Perform the click
    await element.click();

    // Wait a moment for any popups/new tabs to open
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for new tabs and handle them
    const afterPages = await browser.pages();
    const afterTabCount = afterPages.length;

    if (afterTabCount > initialTabCount) {
      logger.info(`📂 New tabs opened after clicking ${description}`, {
        before: initialTabCount,
        after: afterTabCount,
        newTabs: afterTabCount - initialTabCount
      });

      // Handle the new tabs and restore focus
      await handleNewTabsAndFocus(browser, page, logger);
    }

    logger.info(`✅ Successfully clicked ${description} and managed any popups`);
    return true;

  } catch (error) {
    logger.error(`❌ Error clicking ${description}`, error);
    return false;
  }
}

// Enhanced stealth browser configuration with advanced fingerprinting
async function getBrowserConfig(logger) {
  const platform = require('os').platform();
  logger.debug(`Using enhanced stealth Chrome configuration for ${platform}`);

  const fingerprint = getAdvancedUserAgent();
  const chromeExecutable = findChromeExecutable();

  if (chromeExecutable) {
    logger.debug(`Found Chrome executable: ${chromeExecutable}`);
  } else {
    logger.debug('Using Puppeteer auto-detection for Chrome');
  }

  // Determine headless mode based on platform and environment
  const isWindows = platform === 'win32';
  const forceHeadless = process.env.FORCE_HEADLESS === 'true';
  const forceVisible = process.env.FORCE_VISIBLE === 'true';

  let headlessMode = true; // Default to headless

  if (forceVisible) {
    headlessMode = false;
    logger.info('Running in visible mode (FORCE_VISIBLE=true)');
  } else if (forceHeadless) {
    headlessMode = true;
    logger.info('Running in headless mode (FORCE_HEADLESS=true)');
  } else if (isWindows) {
    headlessMode = false;
    logger.info('Running in visible mode on Windows for debugging');
  } else {
    headlessMode = true;
    logger.info('Running in headless mode on Linux/production');
  }

  const config = {
    headless: headlessMode,
    args: [
      // Core sandbox and security
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',

      // Enhanced anti-detection with fingerprint matching
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-features=TranslateUI',
      '--disable-features=ScriptStreaming',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
      '--disable-component-extensions-with-background-pages',

      // Browser behavior normalization
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-extensions-file-access-check',
      '--disable-extensions-http-throttling',
      '--disable-extensions-https-throttling',
      '--disable-component-update',
      '--disable-sync',
      '--disable-translate',

      // Performance and stealth
      '--disable-prompt-on-repost',
      '--disable-hang-monitor',
      '--disable-client-side-phishing-detection',
      '--disable-popup-blocking',
      '--disable-print-preview',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--password-store=basic',
      '--use-mock-keychain',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-gpu',

      // Additional stealth measures
      '--disable-plugins-discovery',
      '--disable-preconnect',
      '--disable-background-networking',
      '--disable-background-sync',
      '--disable-permissions-api',
      '--disable-notifications',
      '--disable-desktop-notifications',
      '--disable-file-system',
      '--disable-geolocation',
      '--disable-media-stream',
      '--disable-speech-api',
      '--disable-sensors-api',
      '--disable-payment-request',
      '--disable-wake-on-wifi',
      '--disable-webgl',
      '--disable-webgl2',
      '--disable-3d-apis',

      // Advanced automation hiding
      '--enable-automation=false',
      '--exclude-switches=enable-automation',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-extensions-except=',
      '--disable-plugins-discovery',
      '--disable-default-apps',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-client-side-phishing-detection',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--password-store=basic',
      '--use-mock-keychain',
      '--force-color-profile=srgb',
      '--disable-background-networking',

      // Use advanced fingerprint user agent
      '--user-agent=' + fingerprint.userAgent,

      // Window size matching fingerprint
      `--window-size=${fingerprint.screenWidth},${fingerprint.screenHeight}`
    ],

    // Store fingerprint for later use
    fingerprint: fingerprint
  };

  // Only set executablePath if we found Chrome, otherwise let Puppeteer auto-detect
  if (chromeExecutable) {
    config.executablePath = chromeExecutable;
  }

  return config;
}

// Enhanced localStorage manipulation for stealth and preferences with fingerprint matching
async function setupEnhancedLocalStorage(page, logger, fingerprint = null) {
  try {
    logger.info('Setting up enhanced localStorage for stealth and preferences');

    await page.evaluateOnNewDocument((fp) => {
      // Enhanced localStorage settings for video players and subtitle preferences
      const localStorageSettings = {
        // Subtitle preferences
        'pljssubtitle': 'English',
        'subtitle_language': 'en',
        'subtitle_enabled': 'true',
        'preferred_subtitle_lang': 'eng',

        // Player preferences to appear as regular user
        'player_volume': (0.6 + Math.random() * 0.4).toFixed(1), // Random volume 0.6-1.0
        'player_quality': Math.random() > 0.7 ? 'auto' : '720p', // Mostly auto, sometimes specific
        'player_autoplay': Math.random() > 0.3 ? 'true' : 'false', // Mostly true
        'player_theme': Math.random() > 0.5 ? 'dark' : 'light',
        'playback_rate': '1',
        'theater_mode': Math.random() > 0.8 ? 'true' : 'false', // Occasionally true

        // Browser fingerprint normalization using provided fingerprint
        'timezone': fp ? fp.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
        'language': fp ? fp.language : navigator.language,
        'platform': fp ? fp.platform : navigator.platform,
        'screen_resolution': fp ? `${fp.screenWidth}x${fp.screenHeight}` : `${screen.width}x${screen.height}`,
        'color_depth': fp ? fp.colorDepth.toString() : screen.colorDepth.toString(),
        'hardware_concurrency': fp ? fp.hardwareConcurrency.toString() : navigator.hardwareConcurrency?.toString() || '4',

        // Realistic browsing history simulation
        'last_visit': new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Within last week
        'visit_count': Math.floor(Math.random() * 50 + 5).toString(), // 5-54 visits
        'session_start': new Date().toISOString(),

        // Cloudnestra specific settings with realistic variations
        'cloudnestra_player_prefs': JSON.stringify({
          subtitle: Math.random() > 0.2 ? 'English' : 'Off', // Mostly English
          quality: Math.random() > 0.6 ? 'auto' : '720p',
          volume: (0.6 + Math.random() * 0.4).toFixed(1),
          autoplay: Math.random() > 0.3,
          last_used: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
        }),

        // vidsrc.xyz specific settings with realistic variations
        'vidsrc_preferences': JSON.stringify({
          defaultSubtitle: Math.random() > 0.15 ? 'en' : 'off',
          autoSelectSubtitle: Math.random() > 0.25,
          playerTheme: Math.random() > 0.5 ? 'dark' : 'light',
          preferredQuality: Math.random() > 0.7 ? 'auto' : '720p',
          last_server: ['vidsrc', 'embed', 'cloudnestra'][Math.floor(Math.random() * 3)]
        }),

        // Additional realistic browser data
        'user_preferences': JSON.stringify({
          cookies_accepted: true,
          notifications_blocked: Math.random() > 0.7,
          location_blocked: Math.random() > 0.5,
          camera_blocked: true,
          microphone_blocked: true,
          ads_blocked: Math.random() > 0.4
        })
      };

      // Set all localStorage items
      Object.entries(localStorageSettings).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          // Ignore localStorage errors
        }
      });

      // Also set sessionStorage for some preferences with realistic data
      try {
        sessionStorage.setItem('subtitle_preference', Math.random() > 0.2 ? 'English' : 'Off');
        sessionStorage.setItem('player_initialized', 'true');
        sessionStorage.setItem('user_interaction', 'true');
        sessionStorage.setItem('session_id', 'sess_' + Math.random().toString(36).substr(2, 9));
        sessionStorage.setItem('page_load_time', Date.now().toString());
        sessionStorage.setItem('interaction_count', Math.floor(Math.random() * 10).toString());
      } catch (e) {
        // Ignore sessionStorage errors
      }
    }, fingerprint);

    logger.info('Enhanced localStorage setup completed', {
      fingerprintUsed: !!fingerprint,
      timezone: fingerprint?.timezone || 'default'
    });
    return { success: true };

  } catch (error) {
    logger.warn('Enhanced localStorage setup failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

// Subtitle processing has been moved to frontend OpenSubtitles API integration
// VM-server now focuses only on stream extraction for better performance

// Enhanced stream interception with shadowlandschronicles.com CORS handling
function setupEnhancedStreamInterception(page, logger, targetUrl = '') {
  const streamUrls = [];
  let responseCount = 0;
  const corsHeaders = new Map();
  const debugRequests = [];
  const debugResponses = [];

  // Intercept network requests to modify headers for CORS handling
  page.on('request', async (request) => {
    const requestUrl = request.url();

    // Debug logging for all requests
    if (requestUrl.includes('.m3u8') || requestUrl.includes('master') ||
      requestUrl.includes('playlist') || requestUrl.includes('stream') ||
      requestUrl.includes('upcloud') || requestUrl.includes('vidplay')) {
      debugRequests.push({
        url: requestUrl,
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
      logger.debug('🔍 DEBUG REQUEST: Potential stream request detected', {
        url: requestUrl.substring(0, 150),
        method: request.method(),
        isM3U8: requestUrl.includes('.m3u8'),
        isUpCloud: requestUrl.includes('upcloud'),
        isVidplay: requestUrl.includes('vidplay')
      });
    }

    // Enhanced header modification for shadowlandschronicles.com
    if (requestUrl.includes('shadowlandschronicles.com')) {
      const headers = {
        ...request.headers(),
        'Origin': 'https://cloudnestra.com',
        'Referer': 'https://cloudnestra.com/',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty'
      };

      try {
        await request.continue({ headers });
        logger.debug('Modified headers for shadowlandschronicles request', {
          url: requestUrl.substring(0, 100),
          modifiedHeaders: Object.keys(headers)
        });
      } catch (e) {
        await request.continue();
      }
    } else {
      await request.continue();
    }
  });

  // Intercept network responses with enhanced M3U8 detection
  page.on('response', async (response) => {
    responseCount++;
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();
    const headers = response.headers();

    try {
      // Store CORS headers for later use
      if (responseUrl.includes('shadowlandschronicles')) {
        corsHeaders.set(responseUrl, {
          'access-control-allow-origin': headers['access-control-allow-origin'],
          'access-control-allow-credentials': headers['access-control-allow-credentials'],
          'access-control-allow-methods': headers['access-control-allow-methods'],
          'access-control-allow-headers': headers['access-control-allow-headers']
        });
      }

      // Enhanced logging for debugging
      if (responseCount <= 100) {
        logger.debug('Network response intercepted', {
          url: responseUrl.substring(0, 150),
          status,
          contentType,
          responseCount,
          corsHeaders: responseUrl.includes('shadowlandschronicles') ? 'present' : 'none'
        });
      }

      // Debug logging for potential stream responses
      if (responseUrl.includes('.m3u8') || responseUrl.includes('master') ||
        responseUrl.includes('playlist') || responseUrl.includes('stream') ||
        responseUrl.includes('upcloud') || responseUrl.includes('vidplay') ||
        contentType.includes('mpegurl') || contentType.includes('m3u8')) {
        debugResponses.push({
          url: responseUrl,
          status,
          contentType,
          headers: headers,
          timestamp: Date.now()
        });
        logger.info('🎯 DEBUG RESPONSE: Potential stream response detected', {
          url: responseUrl.substring(0, 150),
          status,
          contentType,
          isM3U8: responseUrl.includes('.m3u8'),
          isUpCloud: responseUrl.includes('upcloud'),
          isVidplay: responseUrl.includes('vidplay'),
          isMpegUrl: contentType.includes('mpegurl')
        });
      }

      // Enhanced shadowlandschronicles detection
      const isShadowlandschronicles = responseUrl.includes('shadowlandschronicles') &&
        (responseUrl.includes('master') || responseUrl.includes('.m3u8'));

      // Enhanced M3U8 content detection
      const isM3U8Response =
        contentType.includes('mpegurl') ||
        contentType.includes('m3u8') ||
        contentType.includes('vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegurl') ||
        contentType.includes('text/plain') ||
        responseUrl.includes('.m3u8') ||
        responseUrl.includes('master') ||
        responseUrl.includes('index') ||
        responseUrl.includes('playlist');

      // Enhanced cloudnestra detection
      const isCloudnestra = responseUrl.includes('cloudnestra') &&
        (responseUrl.includes('.m3u8') || responseUrl.includes('stream'));

      // Priority handling: shadowlandschronicles > cloudnestra > general M3U8
      if (isShadowlandschronicles || isCloudnestra || (isM3U8Response && (status === 200 || status === 403))) {
        logger.info('Enhanced stream URL detection', {
          url: responseUrl.substring(0, 150),
          contentType,
          status,
          isShadowlandschronicles,
          isCloudnestra,
          isM3U8Response,
          priority: isShadowlandschronicles ? 0 : isCloudnestra ? 1 : 2
        });

        // Try to read content for validation
        if (status === 200 || (isShadowlandschronicles && (status === 403 || status === 404))) {
          try {
            let responseText = '';
            if (status === 200) {
              responseText = await response.text();
            }

            // Enhanced M3U8 content validation
            const isActualM3U8 = responseText.includes('#EXTM3U') ||
              responseText.includes('#EXT-X-') ||
              responseUrl.includes('.m3u8') ||
              isShadowlandschronicles ||
              isCloudnestra;

            if (isActualM3U8) {
              // Enhanced source determination
              let source = 'unknown';
              let serverHash = null;

              if (responseUrl.includes('shadowlandschronicles')) {
                source = 'shadowlandschronicles';
              } else if (responseUrl.includes('cloudnestra')) {
                source = 'cloudnestra';
                // Try to extract server hash from URL
                const hashMatch = responseUrl.match(/[?&]hash=([^&]+)/);
                if (hashMatch) serverHash = hashMatch[1];
              } else if (targetUrl.includes('vidsrc')) {
                source = 'vidsrc';
              } else if (targetUrl.includes('embed.su')) {
                source = 'embed.su';
              }

              const streamInfo = {
                url: responseUrl,
                contentType,
                status,
                source,
                serverHash,
                priority: isShadowlandschronicles ? 0 : isCloudnestra ? 1 : 2,
                isMaster: responseUrl.includes('master'),
                needsProxy: isShadowlandschronicles || status === 403,
                corsHeaders: corsHeaders.get(responseUrl) || {},
                extractionMethod: 'enhanced_interception',
                timestamp: Date.now()
              };

              streamUrls.push(streamInfo);

              logger.info('Valid enhanced M3U8 stream found', {
                url: responseUrl.substring(0, 150),
                source,
                serverHash,
                priority: streamInfo.priority,
                isMaster: streamInfo.isMaster,
                contentLength: responseText.length,
                needsProxy: streamInfo.needsProxy,
                corsSupport: Object.keys(streamInfo.corsHeaders).length > 0
              });
            }
          } catch (contentError) {
            // Even if we can't read content, shadowlandschronicles URLs are valuable
            if (isShadowlandschronicles) {
              streamUrls.push({
                url: responseUrl,
                contentType,
                status,
                source: 'shadowlandschronicles',
                priority: 0,
                isMaster: responseUrl.includes('master'),
                needsProxy: true,
                corsHeaders: corsHeaders.get(responseUrl) || {},
                extractionMethod: 'enhanced_interception',
                contentError: contentError.message,
                timestamp: Date.now()
              });

              logger.info('Shadowlandschronicles stream found (content unreadable)', {
                url: responseUrl.substring(0, 150),
                status,
                error: contentError.message
              });
            } else {
              logger.warn('Could not read response content', {
                url: responseUrl.substring(0, 100),
                error: contentError.message
              });
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Error in enhanced response processing', {
        url: responseUrl.substring(0, 100),
        error: error.message
      });
    }
  });

  return { streamUrls, corsHeaders, debugRequests, debugResponses };
}

// Select better server on vidsrc.xyz before clicking play button
async function selectUpCloudServer(page, logger, browser) {
  try {
    logger.info('🔄 Attempting to select UpCloud server on vidsrc.xyz');

    // Check if we're running visibly (for debugging)
    const isWindows = require('os').platform() === 'win32';
    const isVisible = !process.env.FORCE_HEADLESS && (isWindows || process.env.FORCE_VISIBLE);
    const debugDelay = isVisible ? 3000 : 2000; // Longer delays when visible for debugging

    logger.info(`Running in ${isVisible ? 'VISIBLE' : 'HEADLESS'} mode`);

    // Wait for server selection elements to load
    await new Promise(resolve => setTimeout(resolve, debugDelay));

    // Step 1: First click the server toggle to open the dropdown
    logger.info('🔍 Looking for server toggle button (.serversToggle)');

    let serverToggleClicked = false;
    try {
      const serverToggle = await page.$('.serversToggle');
      if (serverToggle) {
        logger.info('📂 Found server toggle button, clicking to open server list');

        // Highlight the toggle if visible (for debugging)
        if (isVisible) {
          await serverToggle.evaluate(el => {
            el.style.border = '3px solid blue';
            el.style.backgroundColor = 'lightblue';
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await serverToggle.hover();
        await new Promise(resolve => setTimeout(resolve, isVisible ? 1000 : 500));

        // Use safe click to handle any popups/new tabs
        const clickSuccess = await safeClick(serverToggle, page, browser, logger, 'server toggle button');
        serverToggleClicked = clickSuccess;

        logger.info('✅ Successfully clicked server toggle button!');

        // Wait for server list to appear
        await new Promise(resolve => setTimeout(resolve, isVisible ? 2000 : 1000));
      } else {
        logger.warn('⚠️ Server toggle button not found');
      }
    } catch (e) {
      logger.error('❌ Error clicking server toggle', e);
    }

    if (!serverToggleClicked) {
      logger.warn('⚠️ Could not open server dropdown, proceeding with default server');
      return { success: false, serverSelected: 'default' };
    }

    // Step 2: Look for better server options (2Embed, Superembed instead of CloudStream Pro)
    const preferredServers = [
      { name: '2Embed', selector: '.server[data-hash*="2Embed"], .server:contains("2Embed")' },
      { name: 'Superembed', selector: '.server[data-hash*="Superembed"], .server:contains("Superembed")' },
      { name: 'UpCloud', selector: '.server[data-hash*="UpCloud"], .server:contains("UpCloud")' }
    ];

    let serverSelected = false;

    // Try to find and click UpCloud server button
    for (const selector of serverSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found UpCloud server selector', { selector, count: elements.length });

          for (const element of elements) {
            try {
              // Check if element is visible and contains upcloud text
              const elementInfo = await element.evaluate(el => ({
                visible: el.offsetParent !== null,
                text: el.innerText?.toLowerCase() || '',
                className: el.className,
                id: el.id,
                dataset: el.dataset
              }));

              if (elementInfo.visible &&
                (elementInfo.text.includes('upcloud') ||
                  elementInfo.className.includes('upcloud') ||
                  elementInfo.id.includes('upcloud') ||
                  elementInfo.dataset.server === 'upcloud')) {

                logger.info('🎯 Clicking UpCloud server button', elementInfo);

                // Simulate human-like interaction with longer delays for visual debugging
                await element.hover();
                await new Promise(resolve => setTimeout(resolve, isVisible ? 1000 : 300 + Math.random() * 200));

                // Highlight the element if visible (for debugging)
                if (isVisible) {
                  await element.evaluate(el => {
                    el.style.border = '3px solid red';
                    el.style.backgroundColor = 'yellow';
                  });
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }

                await element.click();
                serverSelected = true;

                logger.info('✅ Successfully clicked UpCloud server button!');

                // Wait for server switch to complete
                await new Promise(resolve => setTimeout(resolve, isVisible ? 4000 : 2000 + Math.random() * 1000));
                break;
              }
            } catch (e) {
              logger.debug('Error checking UpCloud server element', { error: e.message });
            }
          }

          if (serverSelected) break;
        }
      } catch (e) {
        logger.debug('Error with UpCloud server selector', { selector, error: e.message });
      }
    }

    // Alternative approach: look for server tabs or dropdown
    if (!serverSelected) {
      logger.info('Trying alternative UpCloud server selection methods');

      try {
        // Look for server tabs or buttons with text content
        const serverElements = await page.evaluate(() => {
          const elements = [];
          const allElements = document.querySelectorAll('button, a, div[role="button"], span[role="button"]');

          for (const el of allElements) {
            const text = el.innerText?.toLowerCase() || '';
            const title = el.title?.toLowerCase() || '';
            const className = el.className?.toLowerCase() || '';
            const id = el.id?.toLowerCase() || '';

            if (text.includes('upcloud') || title.includes('upcloud') ||
              className.includes('upcloud') || id.includes('upcloud') ||
              el.dataset?.server === 'upcloud') {
              elements.push({
                tagName: el.tagName,
                text: el.innerText,
                className: el.className,
                id: el.id,
                visible: el.offsetParent !== null
              });
            }
          }
          return elements;
        });

        if (serverElements.length > 0) {
          logger.info('Found UpCloud server elements via text search', { count: serverElements.length, elements: serverElements });

          // Try to click the first visible UpCloud element
          for (const elementInfo of serverElements) {
            if (elementInfo.visible) {
              try {
                const element = await page.evaluateHandle((info) => {
                  const elements = document.querySelectorAll('button, a, div[role="button"], span[role="button"]');
                  for (const el of elements) {
                    if (el.innerText === info.text && el.className === info.className) {
                      return el;
                    }
                  }
                  return null;
                }, elementInfo);

                if (element) {
                  await element.hover();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await element.click();
                  logger.info('Clicked UpCloud server element', { text: elementInfo.text });
                  serverSelected = true;
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  break;
                }
              } catch (e) {
                logger.debug('Error clicking UpCloud server element', { error: e.message });
              }
            }
          }
        }
      } catch (e) {
        logger.debug('Error in alternative UpCloud server selection', { error: e.message });
      }
    }

    // Check inside iframes for server selection
    if (!serverSelected) {
      logger.info('Checking iframes for UpCloud server selection');

      const iframes = await page.$$('iframe');
      for (const iframe of iframes) {
        try {
          const src = await iframe.evaluate(el => el.src);
          if (src && src.includes('vidsrc')) {
            logger.info('Found vidsrc iframe, checking for server selection', { src: src.substring(0, 100) });

            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Look for UpCloud server selection in iframe
                for (const selector of serverSelectors) {
                  try {
                    const serverButton = await frame.$(selector);
                    if (serverButton) {
                      logger.info('Found UpCloud server button in iframe', { selector });
                      await serverButton.hover();
                      await new Promise(resolve => setTimeout(resolve, 300));
                      await serverButton.click();
                      serverSelected = true;
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      break;
                    }
                  } catch (e) {
                    // Continue to next selector
                  }
                }

                if (serverSelected) break;
              }
            } catch (e) {
              logger.debug('Could not access iframe content for server selection (CORS)');
            }
          }
        } catch (e) {
          logger.debug('Error checking iframe for server selection', { error: e.message });
        }
      }
    }

    if (serverSelected) {
      logger.info(`✅ Successfully selected ${selectedServerName} server`);
      return { success: true, serverSelected: selectedServerName };
    } else {
      logger.warn('⚠️ Could not find better server selection, proceeding with default server');
      return { success: false, serverSelected: 'default' };
    }

  } catch (error) {
    logger.error('Error in UpCloud server selection', error);
    return { success: false, error: error.message, serverSelected: 'default' };
  }
}

// Interact with the page to trigger stream loading with realistic human behavior
async function interactWithPage(page, logger, browser) {
  const interactionStart = Date.now();

  try {
    // Wait for page to be ready with realistic timing
    await page.waitForSelector('body', { timeout: 15000 });

    // Subtitle localStorage settings removed - now handled by frontend OpenSubtitles API

    // Wait for page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Skip server selection for now - just proceed to play button

    // Look for iframes first (common on vidsrc)
    const iframes = await page.$$('iframe');
    if (iframes.length > 0) {
      logger.info('Found iframes, attempting to interact', { count: iframes.length });

      for (let i = 0; i < Math.min(iframes.length, 3); i++) {
        try {
          const iframe = iframes[i];
          const src = await iframe.evaluate(el => el.src);

          if (src && (src.includes('player') || src.includes('embed') || src.includes('video'))) {
            logger.info('Found video iframe', { src: src.substring(0, 100) });

            // Try to access iframe content
            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Look for play buttons in iframe (prioritizing vidsrc.xyz specific)
                const playSelectors = [
                  '#pl_but',                           // Specific vidsrc.xyz play button ID
                  '.fas.fa-play',                     // Specific vidsrc.xyz play button class
                  'button#pl_but',                    // More specific vidsrc button selector
                  '[id="pl_but"]',                    // Alternative ID selector
                  'button.fas.fa-play',               // Alternative class selector
                  'button[class*="play"]',
                  'div[class*="play"]',
                  '[data-testid*="play"]',
                  '.play-button',
                  '.video-play-button',
                  'button[aria-label*="play" i]',
                  'button[title*="play" i]',
                  '.play',
                  '.btn-play',
                  '#play-btn',
                  '.play-icon'
                ];

                for (const selector of playSelectors) {
                  try {
                    const playButton = await frame.$(selector);
                    if (playButton) {
                      logger.info('Found play button in iframe', { selector });
                      await playButton.click();
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      break;
                    }
                  } catch (e) {
                    // Continue
                  }
                }

                // Try clicking on video elements in iframe
                const videoElements = await frame.$$('video, .video, .player');
                if (videoElements.length > 0) {
                  try {
                    await videoElements[0].click();
                    logger.info('Clicked video element in iframe');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } catch (e) {
                    // Continue
                  }
                }
              }
            } catch (e) {
              logger.debug('Could not access iframe content (CORS)');
            }

            // Click on the iframe itself
            try {
              await iframe.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Continue
            }
          }
        } catch (e) {
          logger.debug('Error interacting with iframe', { index: i, error: e.message });
        }
      }
    }

    // Look for #pl_but play button
    const playSelectors = ['#pl_but'];

    let playButtonFound = false;
    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found #pl_but play button', { selector, count: elements.length });

          // Get button properties for debugging
          const buttonInfo = await elements[0].evaluate(el => ({
            id: el.id,
            className: el.className,
            tagName: el.tagName,
            visible: el.offsetParent !== null,
            disabled: el.disabled,
            innerText: el.innerText
          }));

          logger.info('#pl_but play button properties', buttonInfo);

          // Simple click without extra delays
          const clickSuccess = await safeClick(elements[0], page, browser, logger, 'play button (#pl_but)');
          playButtonFound = clickSuccess;

          if (clickSuccess) {
            logger.info('✅ Successfully clicked #pl_but, waiting for stream loading...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          break;
        }
      } catch (e) {
        logger.debug('Error with play button selector', { selector, error: e.message });
      }
    }

    if (!playButtonFound) {
      logger.warn('⚠️ #pl_but play button not found on page');
    }

    // Simulate additional user behavior
    await page.evaluate(() => {
      // Trigger some events that might initiate video loading
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('click'));
      document.dispatchEvent(new Event('visibilitychange'));

      // Try to trigger any lazy loading
      if (window.IntersectionObserver) {
        const videos = document.querySelectorAll('video, iframe');
        videos.forEach(video => {
          const event = new Event('intersect');
          video.dispatchEvent(event);
        });
      }
    });

    // Additional realistic wait for streams to load
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    // Final attempt - trigger more events
    await page.evaluate(() => {
      // Try to simulate user interactions that might trigger video loading
      const allElements = document.querySelectorAll('*');
      let attempts = 0;

      for (const element of allElements) {
        if (attempts >= 10) break;

        if (element.tagName === 'VIDEO' ||
          element.className.toLowerCase().includes('play') ||
          element.className.toLowerCase().includes('video') ||
          element.id.toLowerCase().includes('play') ||
          element.id.toLowerCase().includes('video')) {

          try {
            element.dispatchEvent(new Event('click', { bubbles: true }));
            element.dispatchEvent(new Event('mouseenter', { bubbles: true }));
            attempts++;
          } catch (e) {
            // Continue
          }
        }
      }
    });

    // Subtitle automation no longer needed - localStorage sets English preference automatically
    logger.info('✅ SUBTITLE AUTOMATION: Using localStorage approach - English subtitles should load automatically', {
      subtitleUrlsFound: 0 // Subtitles now handled by frontend OpenSubtitles API
    });

    logger.timing('Page interaction completed', interactionStart);

  } catch (error) {
    logger.warn('Page interaction error', { error: error.message });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Flyx Extract Stream Service',
    version: '1.0.0'
  });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    service: 'Flyx Extract Stream Service',
    version: '1.0.0',
    endpoints: {
      '/health': 'Health check',
      '/extract': 'Extract stream URLs and subtitles (JSON response)',
      '/extract-stream': 'Extract stream URLs and subtitles with real-time progress (Server-Sent Events)',
    },
    features: {
      streamExtraction: 'Automatically extracts M3U8 stream URLs from video embedding sites',
      subtitleAutomation: 'Automatically enables English subtitles via localStorage and captures VTT files',
      stealthMode: 'Advanced anti-bot detection bypass with realistic human behavior simulation',
      multiServer: 'Support for vidsrc.xyz, embed.su, and other embedding services'
    },
    usage: {
      extract: {
        method: 'GET',
        parameters: {
          url: 'Direct URL to extract from (optional)',
          mediaType: 'movie or tv (required if no url)',
          movieId: 'TMDB movie/show ID (required if no url)',
          seasonId: 'Season number (required for TV)',
          episodeId: 'Episode number (required for TV)',
          server: 'vidsrc.xyz or embed.su (default: vidsrc.xyz)'
        },
        examples: [
          '/extract?mediaType=movie&movieId=123456&server=vidsrc.xyz',
          '/extract?mediaType=tv&movieId=123456&seasonId=1&episodeId=1&server=vidsrc.xyz',
          '/extract?url=https://vidsrc.xyz/embed/movie?tmdb=123456'
        ],
        response: {
          streamUrl: 'M3U8 stream URL for video playback',
          subtitles: 'Array of detected subtitle/VTT files with language detection',
          debug: 'Technical details about extraction process'
        }
      },
      'extract-stream': {
        method: 'GET',
        description: 'Real-time streaming extraction with progress updates via Server-Sent Events',
        parameters: 'Same as /extract endpoint',
        response: 'text/event-stream with JSON progress updates',
        examples: [
          '/extract-stream?mediaType=movie&movieId=123456&server=vidsrc.xyz',
          '/extract-stream?mediaType=tv&movieId=123456&seasonId=1&episodeId=1&server=vidsrc.xyz'
        ],
        progressPhases: [
          'initializing (5%)',
          'connecting (10-15%)',
          'navigating (25-35%)',
          'bypassing (45-50%)',
          'extracting (65-95%)',
          'subtitles (82-95%) - English subtitles enabled via localStorage',
          'validating (90%)',
          'finalizing (95%)',
          'complete (100%)'
        ]
      }
    },
    subtitleAutomation: {
      description: 'Automatically enables English subtitles for enhanced video experience',
      process: [
        '1. Set localStorage preferences (pljssubtitle=English) before video player loads',
        '2. Video player automatically loads English subtitles',
        '3. Capture VTT subtitle files through network interception',
        '4. Return subtitle content with proper CORS handling'
      ],
      supportedFormats: ['VTT', 'WebVTT', 'Text-based subtitles'],
      languageDetection: 'Automatic language detection from URL patterns'
    }
  });
});

// Main extract endpoint
app.get('/extract', async (req, res) => {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info('Stream extraction request started', {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  });

  let browser = null;
  let url, mediaType, movieId, seasonId, episodeId, server;

  try {
    // Parse and validate parameters
    const validation = validateParameters(req.query, logger);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        requestId
      });
    }

    ({ url, mediaType, movieId, seasonId, episodeId, server } = validation.params);

    // Launch browser
    logger.info('Launching Puppeteer browser');
    const launchStart = Date.now();

    const browserConfig = await getBrowserConfig(logger);
    logger.debug('Browser configuration', browserConfig);

    browser = await puppeteer.launch(browserConfig);

    logger.timing('Browser launch took', launchStart);

    // Create new page with enhanced stealth settings
    const page = await browser.newPage();

    // Get the fingerprint from browser config
    const fingerprint = browserConfig.fingerprint;

    // Set realistic viewport matching fingerprint
    await page.setViewport({
      width: fingerprint.screenWidth,
      height: fingerprint.screenHeight,
      deviceScaleFactor: 1,
      hasTouch: fingerprint.maxTouchPoints > 0,
      isLandscape: fingerprint.screenWidth > fingerprint.screenHeight,
      isMobile: false
    });

    // Set user agent from fingerprint
    await page.setUserAgent(fingerprint.userAgent);

    // Set extra HTTP headers to mimic real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    // Advanced stealth measures - equivalent to puppeteer-extra-plugin-stealth
    await page.evaluateOnNewDocument(() => {
      // === WEBDRIVER PROPERTY REMOVAL ===
      // Remove all possible webdriver traces
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });

      delete navigator.__proto__.webdriver;
      delete navigator.webdriver;
      delete window.navigator.webdriver;

      // Remove automation flags
      ['__nightmare', '__phantomas', '__fxdriver_unwrapped', '__driver_evaluate', '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped', '_phantom', '__phantom', '_selenium', 'callPhantom', 'callSelenium', '_Selenium_IDE_Recorder'].forEach(prop => {
        delete window[prop];
      });

      // === CHROME OBJECT MOCKING ===
      Object.defineProperty(window, 'chrome', {
        value: {
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: 'disabled',
              INSTALLED: 'installed',
              NOT_INSTALLED: 'not_installed'
            },
            RunningState: {
              CANNOT_RUN: 'cannot_run',
              READY_TO_RUN: 'ready_to_run',
              RUNNING: 'running'
            }
          },
          runtime: {
            onConnect: null,
            onMessage: null,
            PlatformOs: {
              ANDROID: 'android',
              CROS: 'cros',
              LINUX: 'linux',
              MAC: 'mac',
              OPENBSD: 'openbsd',
              WIN: 'win'
            }
          },
          csi: function () { },
          loadTimes: function () {
            return {
              requestTime: Date.now() / 1000 - Math.random() * 2,
              startLoadTime: Date.now() / 1000 - Math.random() * 1.5,
              commitLoadTime: Date.now() / 1000 - Math.random() * 1,
              finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 0.5,
              finishLoadTime: Date.now() / 1000 - Math.random() * 0.2,
              firstPaintTime: Date.now() / 1000 - Math.random() * 0.1,
              firstPaintAfterLoadTime: 0,
              navigationType: 'Other'
            };
          }
        },
        configurable: true,
        writable: true
      });

      // === PLUGIN AND MIMETYPE MOCKING ===
      const mockPlugins = [
        {
          0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: null },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'Chrome PDF Plugin'
        },
        {
          0: { type: 'application/x-nacl', suffixes: '', enabledPlugin: null },
          1: { type: 'application/x-pnacl', suffixes: '', enabledPlugin: null },
          description: '',
          filename: 'internal-nacl-plugin',
          length: 2,
          name: 'Native Client'
        }
      ];

      const mockMimeTypes = [
        { type: 'application/pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-nacl', suffixes: '', enabledPlugin: mockPlugins[1] },
        { type: 'application/x-pnacl', suffixes: '', enabledPlugin: mockPlugins[1] }
      ];

      Object.defineProperty(navigator, 'plugins', {
        get: () => mockPlugins,
        configurable: true
      });

      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => mockMimeTypes,
        configurable: true
      });

      // === NAVIGATOR PROPERTY MOCKING ===
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });

      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
        configurable: true
      });

      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true
      });

      Object.defineProperty(navigator, 'doNotTrack', {
        get: () => null,
        configurable: true
      });

      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 100,
          downlink: 10,
          saveData: false
        }),
        configurable: true
      });

      // === PERMISSIONS API MOCKING ===
      const originalQuery = navigator.permissions && navigator.permissions.query;
      if (navigator.permissions) {
        navigator.permissions.query = function (parameters) {
          return parameters.name === 'notifications'
            ? Promise.resolve({ state: 'default' })
            : originalQuery ? originalQuery.call(this, parameters) : Promise.reject(new Error('Permission API not available'));
        };
      }

      // === CANVAS FINGERPRINT PROTECTION ===
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, attributes) {
        if (type === '2d') {
          const context = originalGetContext.call(this, type, attributes);
          const originalFillText = context.fillText;
          const originalStrokeText = context.strokeText;
          const originalGetImageData = context.getImageData;

          context.fillText = function () {
            const args = Array.prototype.slice.call(arguments);
            return originalFillText.apply(this, args);
          };

          context.strokeText = function () {
            const args = Array.prototype.slice.call(arguments);
            return originalStrokeText.apply(this, args);
          };

          context.getImageData = function () {
            const imageData = originalGetImageData.apply(this, arguments);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] + Math.floor(Math.random() * 3) - 1);
            }
            return imageData;
          };

          return context;
        }
        return originalGetContext.call(this, type, attributes);
      };

      // === WEBGL FINGERPRINT PROTECTION ===
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return originalGetParameter.call(this, parameter);
      };

      // === SCREEN PROPERTIES ===
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });

      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });

      // === IFRAME CONTENT WINDOW PROTECTION ===
      const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (originalContentWindow) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function () {
            const win = originalContentWindow.get.call(this);
            if (win) {
              try {
                win.navigator.webdriver = undefined;
                delete win.navigator.webdriver;
              } catch (e) { }
            }
            return win;
          },
          configurable: true
        });
      }

      // === FUNCTION PROTOTYPE TOSTRING OVERRIDE ===
      const originalToString = Function.prototype.toString;
      const proxyToString = new Proxy(originalToString, {
        apply: function (target, thisArg, argumentsList) {
          if (thisArg === Function.prototype.toString) {
            return 'function toString() { [native code] }';
          }
          if (thisArg === originalToString) {
            return 'function toString() { [native code] }';
          }
          return target.apply(thisArg, argumentsList);
        }
      });

      Function.prototype.toString = proxyToString;

      // === TIMING ATTACKS PROTECTION ===
      const originalPerformanceNow = performance.now;
      let performanceOffset = Math.random() * 100;
      performance.now = new Proxy(originalPerformanceNow, {
        apply: function (target, thisArg, argumentsList) {
          return target.apply(thisArg, argumentsList) + performanceOffset + (Math.random() - 0.5) * 0.1;
        }
      });

      // === DATE TIMEZONE PROTECTION ===
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function () {
        return 300; // EST timezone
      };

      // === BATTERY API MOCKING ===
      if ('getBattery' in navigator) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: Infinity,
          dischargingTime: Infinity,
          level: 0.95
        });
      }

      // === NOTIFICATION PERMISSIONS ===
      if ('Notification' in window) {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'default',
          configurable: true
        });
      }

      // === REMOVE AUTOMATION INDICATORS ===
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy;

      // === MEDIA DEVICES MOCKING ===
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function () {
          return originalEnumerateDevices.call(this).then(devices => {
            return devices.map(device => ({
              ...device,
              label: device.label || 'Default Device'
            }));
          });
        };
      }

      // === ERROR STACK TRACE CLEANING ===
      const originalError = window.Error;
      window.Error = function (...args) {
        const error = new originalError(...args);
        if (error.stack) {
          error.stack = error.stack.replace(/\s+at (chrome-extension|moz-extension|webkit-extension):\/\/[^\s]+/g, '');
        }
        return error;
      };

      // === GEOLOCATION MOCKING ===
      if (navigator.geolocation) {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function (success, error, options) {
          const mockPosition = {
            coords: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 20000,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
          if (success) success(mockPosition);
        };
      }
    });

    // Enable request interception for enhanced header modification and CORS handling
    await page.setRequestInterception(true);

    // Setup enhanced localStorage for stealth and preferences
    await setupEnhancedLocalStorage(page, logger, fingerprint);

    // Implement sandbox detection bypass
    await bypassSandboxDetection(page, logger);

    // Setup enhanced stream interception with CORS handling
    const { streamUrls, corsHeaders, debugRequests, debugResponses } = setupEnhancedStreamInterception(page, logger, url);

    // Try server hash rotation if this is a vidsrc.xyz URL
    let serverAttempts = [];
    let currentUrl = url;
    let currentServer = server;
    let currentHash = null;

    if (url.includes('vidsrc.xyz')) {
      logger.info('vidsrc.xyz detected, attempting server hash rotation');
      const hashResult = await tryServerHashes(movieId, seasonId, episodeId, mediaType, logger);
      if (hashResult.url) {
        currentUrl = hashResult.url;
        currentServer = hashResult.server;
        currentHash = hashResult.hash;
        serverAttempts = hashResult.attempts;
        logger.info('Using server hash', { server: currentServer, hash: currentHash });
      }
    }

    // Navigate to the page with enhanced URL
    logger.info('Navigating to target URL with enhanced configuration');
    const navigationStart = Date.now();

    try {
      const response = await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const navigationStatus = response?.status() || 'unknown';
      logger.info('Page navigation completed', {
        status: navigationStatus,
        url: url.substring(0, 100)
      });

      // Handle any immediate popups/new tabs that opened during navigation
      await handleInitialPopups(browser, page, logger);

      // Check for 404 error (for auto-switching)
      if (navigationStatus === 404) {
        logger.warn('404 error detected - page not found', {
          status: navigationStatus,
          server
        });

        return res.status(404).json({
          success: false,
          error: `Content not found on ${server}`,
          debug: {
            navigationStatus: 404,
            wasNavigationError: true,
            server,
            suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz'
          },
          requestId
        });
      }

    } catch (navigationError) {
      logger.error('Navigation failed', navigationError, { url });

      // Check if it's a 404 specifically
      if (navigationError.message?.includes('404') || navigationError.message?.includes('ERR_FAILED')) {
        return res.status(404).json({
          success: false,
          error: `Content not found on ${server}`,
          debug: {
            wasNavigationError: true,
            navigationStatus: 404,
            server,
            suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz'
          },
          requestId
        });
      }

      throw navigationError;
    }

    logger.timing('Navigation took', navigationStart);

    // Enhanced iframe chain navigation for vidsrc.xyz
    let iframeChainResult = null;
    if (currentUrl.includes('vidsrc.xyz')) {
      logger.info('Attempting enhanced iframe chain navigation for vidsrc.xyz');
      iframeChainResult = await navigateIframeChain(page, logger);
    }

    // Enhanced play button interaction simulation
    const playButtonResult = await simulatePlayButtonInteraction(page, logger, browser);

    // Fallback to original interaction if enhanced methods didn't work
    if (!playButtonResult.success) {
      logger.info('Enhanced interaction failed, falling back to original method');
      await interactWithPage(page, logger, browser);
    }

    // Wait additional time for streams to be captured with progressive checking
    let checkCount = 0;
    const maxChecks = 8;

    while (checkCount < maxChecks && streamUrls.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      checkCount++;

      // Manage any new popups that might have opened during extraction
      if (checkCount % 3 === 0) {
        logger.info(`🔄 Periodic tab management check ${checkCount}/${maxChecks}`);
        await handleNewTabsAndFocus(browser, page, logger);
      }

      if (checkCount % 2 === 0) {
        // Trigger additional interactions every 4 seconds
        await page.evaluate(() => {
          // Trigger events that might load delayed content
          window.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('resize'));
          document.dispatchEvent(new Event('visibilitychange'));

          // Try clicking specific vidsrc.xyz play button first
          const vidsrcPlayButton = document.querySelector('#pl_but') || document.querySelector('.fas.fa-play');
          if (vidsrcPlayButton) {
            try {
              vidsrcPlayButton.click();
              vidsrcPlayButton.dispatchEvent(new Event('mouseenter'));
              vidsrcPlayButton.dispatchEvent(new Event('focus'));
            } catch (e) {
              // Continue
            }
          }

          // Try clicking any remaining play buttons or video elements
          const elements = document.querySelectorAll('video, iframe, [class*="play"], [id*="play"]');
          elements.forEach((element, index) => {
            if (index < 3) { // Limit to first 3 elements
              try {
                element.click();
                element.dispatchEvent(new Event('mouseenter'));
              } catch (e) {
                // Continue
              }
            }
          });
        });

        logger.info(`Progressive check ${checkCount}/${maxChecks}`, {
          currentStreams: streamUrls.length
        });
      }
    }

    logger.info('Stream detection completed after progressive checks', {
      totalChecks: checkCount,
      finalStreamCount: streamUrls.length
    });

    // Sort and filter streams
    const m3u8Streams = streamUrls.filter(stream =>
      stream.url && (
        stream.url.includes('.m3u8') ||
        stream.contentType?.includes('mpegurl') ||
        stream.source === 'shadowlandschronicles'
      )
    );

    // Sort by priority: shadowlandschronicles master (0) > other masters (1) > regular m3u8 (2)
    m3u8Streams.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isMaster !== b.isMaster) return b.isMaster - a.isMaster; // Masters first
      return 0;
    });

    logger.info('Stream extraction completed', {
      totalFound: streamUrls.length,
      m3u8Count: m3u8Streams.length,
      streams: m3u8Streams.slice(0, 3).map(s => ({
        url: s.url.substring(0, 100),
        source: s.source,
        priority: s.priority,
        isMaster: s.isMaster
      }))
    });

    if (m3u8Streams.length === 0) {
      logger.warn('No streams found', {
        totalResponses: streamUrls.length,
        server,
        debugRequestsCount: debugRequests.length,
        debugResponsesCount: debugResponses.length
      });

      // Log debug information for troubleshooting
      logger.info('🔍 DEBUG INFO: All intercepted requests', {
        requests: debugRequests.slice(0, 10).map(r => ({ url: r.url.substring(0, 100), method: r.method })),
        totalRequests: debugRequests.length
      });

      logger.info('🔍 DEBUG INFO: All intercepted responses', {
        responses: debugResponses.slice(0, 10).map(r => ({ url: r.url.substring(0, 100), status: r.status, contentType: r.contentType })),
        totalResponses: debugResponses.length
      });

      return res.status(404).json({
        success: false,
        error: `No streams found on ${server}. Try switching servers.`,
        debug: {
          totalFound: streamUrls.length,
          m3u8Count: 0,
          server,
          suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz',
          debugInfo: {
            totalRequests: debugRequests.length,
            totalResponses: debugResponses.length,
            recentRequests: debugRequests.slice(-5).map(r => ({ url: r.url.substring(0, 100), method: r.method })),
            recentResponses: debugResponses.slice(-5).map(r => ({ url: r.url.substring(0, 100), status: r.status, contentType: r.contentType }))
          }
        },
        requestId
      });
    }

    // Select the best stream (highest priority, preferring masters)
    const selectedStream = m3u8Streams[0];

    logger.info('Selected optimal stream', {
      url: selectedStream.url.substring(0, 150),
      source: selectedStream.source,
      priority: selectedStream.priority,
      isMaster: selectedStream.isMaster,
      needsCleanHeaders: selectedStream.needsCleanHeaders
    });

    const totalDuration = logger.timing('Total request duration', requestStart);

    // Return enhanced successful response with multi-layered iframe navigation data
    return res.json({
      success: true,
      streamUrl: selectedStream.url,
      streamType: 'hls',
      server: currentServer,
      serverHash: currentHash,
      extractionMethod: iframeChainResult?.extractionMethod || 'enhanced_interception',
      requiresProxy: selectedStream.needsProxy || false,
      totalFound: streamUrls.length,
      m3u8Count: m3u8Streams.length,
      subtitles: [], // Empty - now handled by frontend OpenSubtitles API
      requestId,
      debug: {
        selectedStream: {
          source: selectedStream.source,
          priority: selectedStream.priority,
          isMaster: selectedStream.isMaster,
          needsProxy: selectedStream.needsProxy,
          corsHeaders: selectedStream.corsHeaders || {}
        },
        iframeChain: iframeChainResult?.iframeChain || [],
        serverAttempts: serverAttempts,
        extractionTime: totalDuration,
        stealthBypass: true,
        playButtonInteraction: playButtonResult?.success || false,
        enhancedNavigation: iframeChainResult?.success || false,
        server: currentServer,
        originalServer: server
      }
    });

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    logger.error('Stream extraction failed', error, {
      url: url || 'unknown',
      mediaType: mediaType || 'unknown',
      requestDuration: totalDuration
    });

    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      requestId,
      debug: {
        requestDuration: totalDuration
      }
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug('Browser closed successfully');
      } catch (closeError) {
        logger.warn('Error closing browser', { error: closeError.message });
      }
    }
  }
});

// Real-time streaming extract endpoint with progress updates
app.get('/extract-stream', async (req, res) => {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info('Streaming extraction request started', {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  });

  // Set up Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Function to send progress updates
  const sendProgress = (phase, progress, message, additionalData = {}) => {
    const data = {
      phase,
      progress,
      message,
      timestamp: Date.now(),
      requestId,
      ...additionalData
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    logger.info(`Progress: ${phase} (${progress}%)`, { message });
  };

  let browser = null;
  let url, mediaType, movieId, seasonId, episodeId, server;

  try {
    // Send initial progress
    sendProgress('initializing', 5, 'Initializing extraction service');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Parse and validate parameters
    sendProgress('connecting', 10, 'Validating request parameters');
    const validation = validateParameters(req.query, logger);

    if (!validation.isValid) {
      sendProgress('error', 0, validation.error, { error: true });
      return res.end();
    }

    ({ url, mediaType, movieId, seasonId, episodeId, server } = validation.params);

    // Launch browser
    sendProgress('connecting', 15, 'Launching browser instance');
    const launchStart = Date.now();

    const browserConfig = await getBrowserConfig(logger);
    logger.debug('Browser configuration', browserConfig);

    browser = await puppeteer.launch(browserConfig);
    logger.timing('Browser launch took', launchStart);

    sendProgress('navigating', 25, 'Setting up browser environment');

    // Create new page with enhanced stealth settings
    const page = await browser.newPage();

    // Get the fingerprint from browser config
    const fingerprint = browserConfig.fingerprint;

    // Set realistic viewport matching fingerprint
    await page.setViewport({
      width: fingerprint.screenWidth,
      height: fingerprint.screenHeight,
      deviceScaleFactor: 1,
      hasTouch: fingerprint.maxTouchPoints > 0,
      isLandscape: fingerprint.screenWidth > fingerprint.screenHeight,
      isMobile: false
    });

    // Set user agent from fingerprint
    await page.setUserAgent(fingerprint.userAgent);

    sendProgress('navigating', 35, 'Configuring stealth measures');

    // Set extra HTTP headers to mimic real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    // Advanced stealth measures - equivalent to puppeteer-extra-plugin-stealth
    await page.evaluateOnNewDocument(() => {
      // === WEBDRIVER PROPERTY REMOVAL ===
      // Remove all possible webdriver traces
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });

      delete navigator.__proto__.webdriver;
      delete navigator.webdriver;
      delete window.navigator.webdriver;

      // Remove automation flags
      ['__nightmare', '__phantomas', '__fxdriver_unwrapped', '__driver_evaluate', '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped', '_phantom', '__phantom', '_selenium', 'callPhantom', 'callSelenium', '_Selenium_IDE_Recorder'].forEach(prop => {
        delete window[prop];
      });

      // === CHROME OBJECT MOCKING ===
      Object.defineProperty(window, 'chrome', {
        value: {
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: 'disabled',
              INSTALLED: 'installed',
              NOT_INSTALLED: 'not_installed'
            },
            RunningState: {
              CANNOT_RUN: 'cannot_run',
              READY_TO_RUN: 'ready_to_run',
              RUNNING: 'running'
            }
          },
          runtime: {
            onConnect: null,
            onMessage: null,
            PlatformOs: {
              ANDROID: 'android',
              CROS: 'cros',
              LINUX: 'linux',
              MAC: 'mac',
              OPENBSD: 'openbsd',
              WIN: 'win'
            }
          },
          csi: function () { },
          loadTimes: function () {
            return {
              requestTime: Date.now() / 1000 - Math.random() * 2,
              startLoadTime: Date.now() / 1000 - Math.random() * 1.5,
              commitLoadTime: Date.now() / 1000 - Math.random() * 1,
              finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 0.5,
              finishLoadTime: Date.now() / 1000 - Math.random() * 0.2,
              firstPaintTime: Date.now() / 1000 - Math.random() * 0.1,
              firstPaintAfterLoadTime: 0,
              navigationType: 'Other'
            };
          }
        },
        configurable: true,
        writable: true
      });

      // === PLUGIN AND MIMETYPE MOCKING ===
      const mockPlugins = [
        {
          0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: null },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'Chrome PDF Plugin'
        },
        {
          0: { type: 'application/x-nacl', suffixes: '', enabledPlugin: null },
          1: { type: 'application/x-pnacl', suffixes: '', enabledPlugin: null },
          description: '',
          filename: 'internal-nacl-plugin',
          length: 2,
          name: 'Native Client'
        }
      ];

      const mockMimeTypes = [
        { type: 'application/pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-nacl', suffixes: '', enabledPlugin: mockPlugins[1] },
        { type: 'application/x-pnacl', suffixes: '', enabledPlugin: mockPlugins[1] }
      ];

      Object.defineProperty(navigator, 'plugins', {
        get: () => mockPlugins,
        configurable: true
      });

      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => mockMimeTypes,
        configurable: true
      });

      // === NAVIGATOR PROPERTY MOCKING ===
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });

      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
        configurable: true
      });

      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true
      });

      Object.defineProperty(navigator, 'doNotTrack', {
        get: () => null,
        configurable: true
      });

      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 100,
          downlink: 10,
          saveData: false
        }),
        configurable: true
      });

      // === PERMISSIONS API MOCKING ===
      const originalQuery = navigator.permissions && navigator.permissions.query;
      if (navigator.permissions) {
        navigator.permissions.query = function (parameters) {
          return parameters.name === 'notifications'
            ? Promise.resolve({ state: 'default' })
            : originalQuery ? originalQuery.call(this, parameters) : Promise.reject(new Error('Permission API not available'));
        };
      }

      // === CANVAS FINGERPRINT PROTECTION ===
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, attributes) {
        if (type === '2d') {
          const context = originalGetContext.call(this, type, attributes);
          const originalFillText = context.fillText;
          const originalStrokeText = context.strokeText;
          const originalGetImageData = context.getImageData;

          context.fillText = function () {
            const args = Array.prototype.slice.call(arguments);
            return originalFillText.apply(this, args);
          };

          context.strokeText = function () {
            const args = Array.prototype.slice.call(arguments);
            return originalStrokeText.apply(this, args);
          };

          context.getImageData = function () {
            const imageData = originalGetImageData.apply(this, arguments);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] + Math.floor(Math.random() * 3) - 1);
            }
            return imageData;
          };

          return context;
        }
        return originalGetContext.call(this, type, attributes);
      };

      // === WEBGL FINGERPRINT PROTECTION ===
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return originalGetParameter.call(this, parameter);
      };

      // === SCREEN PROPERTIES ===
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });

      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });

      // === IFRAME CONTENT WINDOW PROTECTION ===
      const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (originalContentWindow) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function () {
            const win = originalContentWindow.get.call(this);
            if (win) {
              try {
                win.navigator.webdriver = undefined;
                delete win.navigator.webdriver;
              } catch (e) { }
            }
            return win;
          },
          configurable: true
        });
      }

      // === FUNCTION PROTOTYPE TOSTRING OVERRIDE ===
      const originalToString = Function.prototype.toString;
      const proxyToString = new Proxy(originalToString, {
        apply: function (target, thisArg, argumentsList) {
          if (thisArg === Function.prototype.toString) {
            return 'function toString() { [native code] }';
          }
          if (thisArg === originalToString) {
            return 'function toString() { [native code] }';
          }
          return target.apply(thisArg, argumentsList);
        }
      });

      Function.prototype.toString = proxyToString;

      // === TIMING ATTACKS PROTECTION ===
      const originalPerformanceNow = performance.now;
      let performanceOffset = Math.random() * 100;
      performance.now = new Proxy(originalPerformanceNow, {
        apply: function (target, thisArg, argumentsList) {
          return target.apply(thisArg, argumentsList) + performanceOffset + (Math.random() - 0.5) * 0.1;
        }
      });

      // === DATE TIMEZONE PROTECTION ===
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function () {
        return 300; // EST timezone
      };

      // === BATTERY API MOCKING ===
      if ('getBattery' in navigator) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: Infinity,
          dischargingTime: Infinity,
          level: 0.95
        });
      }

      // === NOTIFICATION PERMISSIONS ===
      if ('Notification' in window) {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'default',
          configurable: true
        });
      }

      // === REMOVE AUTOMATION INDICATORS ===
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy;

      // === MEDIA DEVICES MOCKING ===
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function () {
          return originalEnumerateDevices.call(this).then(devices => {
            return devices.map(device => ({
              ...device,
              label: device.label || 'Default Device'
            }));
          });
        };
      }

      // === ERROR STACK TRACE CLEANING ===
      const originalError = window.Error;
      window.Error = function (...args) {
        const error = new originalError(...args);
        if (error.stack) {
          error.stack = error.stack.replace(/\s+at (chrome-extension|moz-extension|webkit-extension):\/\/[^\s]+/g, '');
        }
        return error;
      };

      // === GEOLOCATION MOCKING ===
      if (navigator.geolocation) {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function (success, error, options) {
          const mockPosition = {
            coords: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 20000,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
          if (success) success(mockPosition);
        };
      }
    });

    // Enable request interception for enhanced header modification and CORS handling
    await page.setRequestInterception(true);

    sendProgress('bypassing', 40, 'Setting up enhanced stealth configuration');

    // Setup enhanced localStorage for stealth and preferences
    await setupEnhancedLocalStorage(page, logger, fingerprint);

    // Implement sandbox detection bypass
    await bypassSandboxDetection(page, logger);

    sendProgress('bypassing', 45, 'Bypassing anti-bot detection with enhanced techniques');

    // Setup enhanced stream interception with CORS handling
    const { streamUrls, corsHeaders, debugRequests, debugResponses } = setupEnhancedStreamInterception(page, logger, url);

    // Try server hash rotation if this is a vidsrc.xyz URL
    let serverAttempts = [];
    let currentUrl = url;
    let currentServer = server;
    let currentHash = null;

    if (url.includes('vidsrc.xyz')) {
      sendProgress('bypassing', 47, 'Attempting server hash rotation for vidsrc.xyz');
      const hashResult = await tryServerHashes(movieId, seasonId, episodeId, mediaType, logger);
      if (hashResult.url) {
        currentUrl = hashResult.url;
        currentServer = hashResult.server;
        currentHash = hashResult.hash;
        serverAttempts = hashResult.attempts;
        logger.info('Using server hash', { server: currentServer, hash: currentHash });
      }
    }
    const interceptedRequests = new Map();

    // Navigate to the page with enhanced URL
    sendProgress('bypassing', 50, 'Navigating to media page with enhanced configuration');
    const navigationStart = Date.now();

    try {
      const response = await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const navigationStatus = response?.status() || 'unknown';
      logger.info('Page navigation completed', {
        status: navigationStatus,
        url: url.substring(0, 100)
      });

      // Handle any immediate popups/new tabs that opened during navigation
      sendProgress('bypassing', 52, 'Managing immediate popups and focus');
      await handleInitialPopups(browser, page, logger);

      // Check for 404 error (for auto-switching)
      if (navigationStatus === 404) {
        logger.warn('404 error detected - page not found', {
          status: navigationStatus,
          server
        });

        sendProgress('autoswitch', 0, `Content not found on ${server}, switching servers...`, {
          autoSwitchTo: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz',
          debug: {
            navigationStatus: 404,
            wasNavigationError: true,
            server
          }
        });
        return res.end();
      }

    } catch (navigationError) {
      logger.error('Navigation failed', navigationError, { url });

      // Check if it's a 404 specifically
      if (navigationError.message?.includes('404') || navigationError.message?.includes('ERR_FAILED')) {
        sendProgress('autoswitch', 0, `Content not found on ${server}, switching servers...`, {
          autoSwitchTo: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz',
          debug: {
            wasNavigationError: true,
            navigationStatus: 404,
            server
          }
        });
        return res.end();
      }

      throw navigationError;
    }

    logger.timing('Navigation took', navigationStart);

    sendProgress('extracting', 65, 'Interacting with page elements');

    // Enhanced iframe chain navigation for vidsrc.xyz
    let iframeChainResult = null;
    if (currentUrl.includes('vidsrc.xyz')) {
      sendProgress('extracting', 65, 'Attempting enhanced iframe chain navigation for vidsrc.xyz');
      iframeChainResult = await navigateIframeChain(page, logger);
    }

    // Enhanced play button interaction simulation
    sendProgress('extracting', 70, 'Simulating realistic play button interaction');
    const playButtonResult = await simulatePlayButtonInteraction(page, logger, browser);

    // Fallback to original interaction if enhanced methods didn't work
    if (!playButtonResult.success) {
      sendProgress('extracting', 75, 'Enhanced interaction failed, using fallback method');
      await interactWithPageWithProgress(page, logger, sendProgress, browser);
    }

    sendProgress('extracting', 80, 'Capturing stream URLs');

    // Wait additional time for streams to be captured with progressive checking
    let checkCount = 0;
    const maxChecks = 8;

    while (checkCount < maxChecks && streamUrls.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      checkCount++;

      // Manage any new popups that might have opened during extraction
      if (checkCount % 3 === 0) {
        logger.info(`🔄 Periodic tab management check ${checkCount}/${maxChecks}`);
        await handleNewTabsAndFocus(browser, page, logger);
      }

      if (checkCount % 2 === 0) {
        sendProgress('extracting', 80 + (checkCount * 2), `Detecting streams... (${checkCount}/${maxChecks})`);

        // Trigger additional interactions every 4 seconds
        await page.evaluate(() => {
          // Trigger events that might load delayed content
          window.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('resize'));
          document.dispatchEvent(new Event('visibilitychange'));

          // Try clicking specific vidsrc.xyz play button first
          const vidsrcPlayButton = document.querySelector('#pl_but') || document.querySelector('.fas.fa-play');
          if (vidsrcPlayButton) {
            try {
              vidsrcPlayButton.click();
              vidsrcPlayButton.dispatchEvent(new Event('mouseenter'));
              vidsrcPlayButton.dispatchEvent(new Event('focus'));
            } catch (e) {
              // Continue
            }
          }

          // Try clicking any remaining play buttons or video elements
          const elements = document.querySelectorAll('video, iframe, [class*="play"], [id*="play"]');
          elements.forEach((element, index) => {
            if (index < 3) { // Limit to first 3 elements
              try {
                element.click();
                element.dispatchEvent(new Event('mouseenter'));
              } catch (e) {
                // Continue
              }
            }
          });
        });

        logger.info(`Progressive check ${checkCount}/${maxChecks}`, {
          currentStreams: streamUrls.length
        });
      }
    }

    sendProgress('validating', 90, 'Processing captured streams');

    logger.info('Stream detection completed after progressive checks', {
      totalChecks: checkCount,
      finalStreamCount: streamUrls.length
    });

    // Sort and filter streams
    const m3u8Streams = streamUrls.filter(stream =>
      stream.url && (
        stream.url.includes('.m3u8') ||
        stream.contentType?.includes('mpegurl') ||
        stream.source === 'shadowlandschronicles'
      )
    );

    // Sort by priority: shadowlandschronicles master (0) > other masters (1) > regular m3u8 (2)
    m3u8Streams.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isMaster !== b.isMaster) return b.isMaster - a.isMaster; // Masters first
      return 0;
    });

    logger.info('Stream extraction completed', {
      totalFound: streamUrls.length,
      m3u8Count: m3u8Streams.length,
      streams: m3u8Streams.slice(0, 3).map(s => ({
        url: s.url.substring(0, 100),
        source: s.source,
        priority: s.priority,
        isMaster: s.isMaster
      }))
    });

    if (m3u8Streams.length === 0) {
      logger.warn('No streams found', {
        totalResponses: streamUrls.length,
        server
      });

      // Log debug information for troubleshooting
      logger.info('🔍 DEBUG INFO: All intercepted requests (streaming)', {
        requests: debugRequests.slice(0, 10).map(r => ({ url: r.url.substring(0, 100), method: r.method })),
        totalRequests: debugRequests.length
      });

      logger.info('🔍 DEBUG INFO: All intercepted responses (streaming)', {
        responses: debugResponses.slice(0, 10).map(r => ({ url: r.url.substring(0, 100), status: r.status, contentType: r.contentType })),
        totalResponses: debugResponses.length
      });

      sendProgress('error', 0, `No streams found on ${server}. Try switching servers.`, {
        error: true,
        debug: {
          totalFound: streamUrls.length,
          m3u8Count: 0,
          server,
          suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz',
          debugInfo: {
            totalRequests: debugRequests.length,
            totalResponses: debugResponses.length,
            recentRequests: debugRequests.slice(-5).map(r => ({ url: r.url.substring(0, 100), method: r.method })),
            recentResponses: debugResponses.slice(-5).map(r => ({ url: r.url.substring(0, 100), status: r.status, contentType: r.contentType }))
          }
        }
      });
      return res.end();
    }

    // Select the best stream (highest priority, preferring masters)
    const selectedStream = m3u8Streams[0];

    sendProgress('finalizing', 95, 'Preparing stream for playback');

    logger.info('Selected optimal stream', {
      url: selectedStream.url.substring(0, 150),
      source: selectedStream.source,
      priority: selectedStream.priority,
      isMaster: selectedStream.isMaster,
      needsCleanHeaders: selectedStream.needsCleanHeaders
    });

    const totalDuration = logger.timing('Total request duration', requestStart);

    // Send enhanced final completion with multi-layered iframe navigation data
    sendProgress('complete', 100, 'Enhanced stream extraction complete!', {
      result: {
        success: true,
        streamUrl: selectedStream.url,
        streamType: 'hls',
        server: currentServer,
        serverHash: currentHash,
        extractionMethod: iframeChainResult?.extractionMethod || 'enhanced_interception',
        requiresProxy: selectedStream.needsProxy || false,
        totalFound: streamUrls.length,
        m3u8Count: m3u8Streams.length,
        subtitles: [], // Empty - now handled by frontend OpenSubtitles API
        requestId,
        debug: {
          selectedStream: {
            source: selectedStream.source,
            priority: selectedStream.priority,
            isMaster: selectedStream.isMaster,
            needsProxy: selectedStream.needsProxy,
            corsHeaders: selectedStream.corsHeaders || {}
          },
          iframeChain: iframeChainResult?.iframeChain || [],
          serverAttempts: serverAttempts,
          extractionTime: totalDuration,
          stealthBypass: true,
          playButtonInteraction: playButtonResult?.success || false,
          enhancedNavigation: iframeChainResult?.success || false,
          server: currentServer,
          originalServer: server
        }
      }
    });

    // Close the stream
    res.end();

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    logger.error('Streaming extraction failed', error, {
      url: url || 'unknown',
      mediaType: mediaType || 'unknown',
      requestDuration: totalDuration
    });

    sendProgress('error', 0, error.message || 'Unknown error occurred', {
      error: true,
      debug: {
        requestDuration: totalDuration
      }
    });

    res.end();
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug('Browser closed successfully');
      } catch (closeError) {
        logger.warn('Error closing browser', { error: closeError.message });
      }
    }
  }
});

// Enhanced page interaction function with progress updates
async function interactWithPageWithProgress(page, logger, sendProgress, browser) {
  const interactionStart = Date.now();

  try {
    // Wait for page to be ready with realistic timing
    sendProgress('extracting', 67, 'Waiting for page to load');
    await page.waitForSelector('body', { timeout: 15000 });

    // Simulate human-like page reading time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    sendProgress('extracting', 70, 'Looking for play button');

    // Wait for page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.evaluate(() => {
      // Generate some mouse events
      const events = ['mousemove', 'mousedown', 'mouseup'];
      events.forEach(eventType => {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight
        });
        document.dispatchEvent(event);
      });

      // Simulate scroll
      window.scrollTo(0, Math.random() * 200);
    });

    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    sendProgress('extracting', 72, 'Looking for video iframes');

    // Look for iframes first (common on vidsrc)
    const iframes = await page.$$('iframe');
    if (iframes.length > 0) {
      logger.info('Found iframes, attempting to interact', { count: iframes.length });

      for (let i = 0; i < Math.min(iframes.length, 3); i++) {
        try {
          const iframe = iframes[i];
          const src = await iframe.evaluate(el => el.src);

          if (src && (src.includes('player') || src.includes('embed') || src.includes('video'))) {
            logger.info('Found video iframe', { src: src.substring(0, 100) });

            // Try to access iframe content
            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Look for play buttons in iframe (prioritizing vidsrc.xyz specific)
                const playSelectors = [
                  '#pl_but',                           // Specific vidsrc.xyz play button ID
                  '.fas.fa-play',                     // Specific vidsrc.xyz play button class
                  'button#pl_but',                    // More specific vidsrc button selector
                  '[id="pl_but"]',                    // Alternative ID selector
                  'button.fas.fa-play',               // Alternative class selector
                  'button[class*="play"]',
                  'div[class*="play"]',
                  '[data-testid*="play"]',
                  '.play-button',
                  '.video-play-button',
                  'button[aria-label*="play" i]',
                  'button[title*="play" i]',
                  '.play',
                  '.btn-play',
                  '#play-btn',
                  '.play-icon'
                ];

                for (const selector of playSelectors) {
                  try {
                    const playButton = await frame.$(selector);
                    if (playButton) {
                      logger.info('Found play button in iframe', { selector });
                      await playButton.click();
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      break;
                    }
                  } catch (e) {
                    // Continue
                  }
                }

                // Try clicking on video elements in iframe
                const videoElements = await frame.$$('video, .video, .player');
                if (videoElements.length > 0) {
                  try {
                    await videoElements[0].click();
                    logger.info('Clicked video element in iframe');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } catch (e) {
                    // Continue
                  }
                }
              }
            } catch (e) {
              logger.debug('Could not access iframe content (CORS)');
            }

            // Click on the iframe itself
            try {
              await iframe.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Continue
            }
          }
        } catch (e) {
          logger.debug('Error interacting with iframe', { index: i, error: e.message });
        }
      }
    }

    sendProgress('extracting', 75, 'Looking for #pl_but play button');

    // Look for #pl_but play button
    const playSelectors = ['#pl_but'];

    let playButtonFound = false;
    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found #pl_but play button', { selector, count: elements.length });
          sendProgress('extracting', 77, 'Clicking #pl_but play button');

          // Get button properties for debugging
          const buttonInfo = await elements[0].evaluate(el => ({
            id: el.id,
            className: el.className,
            tagName: el.tagName,
            visible: el.offsetParent !== null,
            disabled: el.disabled,
            innerText: el.innerText
          }));

          logger.info('#pl_but play button properties', buttonInfo);

          // Simple click without extra delays
          const clickSuccess = await safeClick(elements[0], page, browser, logger, 'play button (#pl_but)');
          playButtonFound = clickSuccess;

          if (clickSuccess) {
            logger.info('✅ Successfully clicked #pl_but, waiting for stream loading...');
            sendProgress('extracting', 80, 'Waiting for streams to load after clicking play button');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          break;
        }
      } catch (e) {
        logger.debug('Error with play button selector', { selector, error: e.message });
      }
    }

    // If still no play button found, try text-based detection
    if (!playButtonFound) {
      logger.info('Attempting text-based play button detection');
      sendProgress('extracting', 78, 'Looking for text-based play buttons');

      try {
        // Look for buttons or elements with "Play" text
        const playButtons = await page.evaluate(() => {
          const elements = [];
          const allElements = document.querySelectorAll('button, div[role="button"], span, a');

          for (const el of allElements) {
            const text = el.innerText?.toLowerCase() || '';
            const title = el.title?.toLowerCase() || '';
            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';

            if (text.includes('play') || title.includes('play') || ariaLabel.includes('play')) {
              elements.push({
                selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
                text: el.innerText,
                visible: el.offsetParent !== null
              });
            }
          }
          return elements;
        });

        if (playButtons.length > 0) {
          logger.info('Found text-based play buttons', { count: playButtons.length, buttons: playButtons });

          // Try to click the first visible one
          for (const buttonInfo of playButtons) {
            if (buttonInfo.visible) {
              try {
                const button = await page.evaluateHandle((selector) => {
                  // More robust element finding
                  const elements = document.querySelectorAll('button, div[role="button"], span, a');
                  for (const el of elements) {
                    const text = el.innerText?.toLowerCase() || '';
                    if (text.includes('play')) {
                      return el;
                    }
                  }
                  return null;
                }, buttonInfo.selector);

                if (button) {
                  await button.hover();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await button.click();
                  logger.info('Clicked text-based play button', { text: buttonInfo.text });
                  playButtonFound = true;
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  break;
                }
              } catch (e) {
                logger.debug('Error clicking text-based play button', { error: e.message });
              }
            }
          }
        }
      } catch (e) {
        logger.debug('Error in text-based play button detection', { error: e.message });
      }
    }

    if (!playButtonFound) {
      logger.info('No play button found, attempting hover and click interactions');
      sendProgress('extracting', 79, 'Trying alternative interaction methods');

      // Try clicking on potential video areas
      const videoSelectors = [
        'video',
        '.video-container',
        '.player',
        '.video-player',
        '#player',
        '.video-wrapper',
        '.player-container',
        '[class*="video"]',
        '[class*="player"]'
      ];

      for (const selector of videoSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            logger.info('Interacting with video container', { selector });

            // Simulate human-like interaction
            await element.hover();
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

            // Try multiple click types
            try {
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Try clicking at center
              const box = await element.boundingBox();
              if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            break;
          }
        } catch (e) {
          logger.debug('Error interacting with video selector', { selector, error: e.message });
        }
      }
    }

    // Simulate additional user behavior
    await page.evaluate(() => {
      // Trigger some events that might initiate video loading
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('click'));
      document.dispatchEvent(new Event('visibilitychange'));

      // Try to trigger any lazy loading
      if (window.IntersectionObserver) {
        const videos = document.querySelectorAll('video, iframe');
        videos.forEach(video => {
          const event = new Event('intersect');
          video.dispatchEvent(event);
        });
      }
    });

    // Additional realistic wait for streams to load
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    // Final attempt - trigger more events
    await page.evaluate(() => {
      // Try to simulate user interactions that might trigger video loading
      const allElements = document.querySelectorAll('*');
      let attempts = 0;

      for (const element of allElements) {
        if (attempts >= 10) break;

        if (element.tagName === 'VIDEO' ||
          element.className.toLowerCase().includes('play') ||
          element.className.toLowerCase().includes('video') ||
          element.id.toLowerCase().includes('play') ||
          element.id.toLowerCase().includes('video')) {

          try {
            element.dispatchEvent(new Event('click', { bubbles: true }));
            element.dispatchEvent(new Event('mouseenter', { bubbles: true }));
            attempts++;
          } catch (e) {
            // Continue
          }
        }
      }
    });

    // Subtitle automation no longer needed - localStorage sets English preference automatically
    logger.info('✅ SUBTITLE AUTOMATION: Using localStorage approach - English subtitles should load automatically', {
      subtitleUrlsFound: 0 // Subtitles now handled by frontend OpenSubtitles API
    });

    if (sendProgress) {
      sendProgress('subtitles', 85, 'English subtitles enabled via localStorage - waiting for VTT files');
    }

    logger.timing('Page interaction completed', interactionStart);

  } catch (error) {
    logger.warn('Page interaction error', { error: error.message });
  }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Flyx Extract Stream Service running on http://0.0.0.0:' + PORT);
  console.log('📊 Health check: http://0.0.0.0:' + PORT + '/health');
  console.log('📖 API docs: http://0.0.0.0:' + PORT + '/');
  console.log('🎬 Extract endpoint: http://0.0.0.0:' + PORT + '/extract');
});

module.exports = app; 