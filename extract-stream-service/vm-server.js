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
    }
  ];

  return browserFingerprints[Math.floor(Math.random() * browserFingerprints.length)];
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
  }

  // Fallback - let Puppeteer find Chrome automatically
  return null;
}

// Enhanced stealth browser configuration
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

      // Enhanced anti-detection
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-features=TranslateUI',
      '--disable-features=ScriptStreaming',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',

      // Browser behavior normalization
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-extensions',
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

// Enhanced stream interception
function setupEnhancedStreamInterception(page, logger, targetUrl = '') {
  const streamUrls = [];
  let responseCount = 0;

  // Intercept network responses with enhanced M3U8 detection
  page.on('response', async (response) => {
    responseCount++;
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();

    try {
      // Enhanced M3U8 content detection
      const isM3U8Response =
        contentType.includes('mpegurl') ||
        contentType.includes('m3u8') ||
        contentType.includes('vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegurl') ||
        responseUrl.includes('.m3u8') ||
        responseUrl.includes('master') ||
        responseUrl.includes('playlist');

      if (isM3U8Response && status === 200) {
        logger.info('Stream URL detected', {
          url: responseUrl.substring(0, 150),
          contentType,
          status
        });

        try {
          const responseText = await response.text();
          const isActualM3U8 = responseText.includes('#EXTM3U') || responseText.includes('#EXT-X-');

          if (isActualM3U8) {
            const streamInfo = {
              url: responseUrl,
              contentType,
              status,
              source: targetUrl.includes('vidsrc') ? 'vidsrc' : 'generic',
              priority: 0,
              isMaster: responseUrl.includes('master'),
              extractionMethod: 'enhanced_interception',
              timestamp: Date.now()
            };

            streamUrls.push(streamInfo);
            logger.info('Valid M3U8 stream found', {
              url: responseUrl.substring(0, 150),
              source: streamInfo.source,
              isMaster: streamInfo.isMaster
            });
          }
        } catch (contentError) {
          logger.warn('Could not read response content', {
            url: responseUrl.substring(0, 100),
            error: contentError.message
          });
        }
      }
    } catch (error) {
      logger.warn('Error in response processing', {
        url: responseUrl.substring(0, 100),
        error: error.message
      });
    }
  });

  return { streamUrls };
}

// Enhanced Cloudflare challenge detection and handling
async function detectAndHandleCloudflareChallenge(page, logger) {
  try {
    logger.info('Checking for Cloudflare challenges');

    // Wait briefly for page to load
    await new Promise(resolve => setTimeout(resolve, 1000));

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

// Tab management utility functions
async function handleNewTabsAndFocus(browser, originalPage, logger) {
  try {
    const allPages = await browser.pages();

    if (allPages.length > 1) {
      logger.info(`Detected ${allPages.length} tabs, closing popups`);

      for (const page of allPages) {
        if (page !== originalPage) {
          try {
            const pageUrl = await page.url();
            logger.info(`Closing popup: ${pageUrl.substring(0, 100)}`);
            await page.close();
          } catch (e) {
            logger.warn('Could not close popup', { error: e.message });
          }
        }
      }

      await originalPage.bringToFront();
      await originalPage.focus();
      logger.info('Successfully closed all popups and restored focus');
    }

    return true;
  } catch (error) {
    logger.warn('Error managing tabs', { error: error.message });
    return false;
  }
}

// Enhanced click function that handles popups
async function safeClick(element, page, browser, logger, description = 'element') {
  try {
    logger.info(`Attempting to click ${description}`);

    const initialPages = await browser.pages();
    const initialTabCount = initialPages.length;

    await element.click();

    // Check for new tabs and handle them
    await new Promise(resolve => setTimeout(resolve, 500));
    const afterPages = await browser.pages();

    if (afterPages.length > initialTabCount) {
      logger.info(`New tabs opened after clicking ${description}`);
      await handleNewTabsAndFocus(browser, page, logger);
    }

    logger.info(`Successfully clicked ${description}`);
    return true;

  } catch (error) {
    logger.error(`Error clicking ${description}`, error);
    return false;
  }
}

// Interact with the page to trigger stream loading
async function interactWithPage(page, logger, browser, requestStart = Date.now(), sendProgress = null) {
  const interactionStart = Date.now();

  // Helper function for progress updates
  const updateProgress = (phase, percentage, message) => {
    if (sendProgress && typeof sendProgress === 'function') {
      sendProgress(phase, percentage, message);
    }
  };

  try {
    logger.info('Starting page interaction');

    // Wait briefly for page to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Look for play buttons
    const playSelectors = [
      '#pl_but',
      '.fas.fa-play',
      'button[class*="play"]',
      '.play-button',
      '.video-play-button',
      'button[aria-label*="play" i]',
      '.play',
      '.btn-play'
    ];

    let playButtonFound = false;

    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);

        if (elements.length > 0) {
          logger.info('Found play button element', { selector });

          for (const element of elements) {
            try {
              const isVisible = await element.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 &&
                  window.getComputedStyle(el).visibility !== 'hidden' &&
                  window.getComputedStyle(el).display !== 'none';
              });

              if (isVisible) {
                logger.info('Found visible play button, clicking it', { selector });

                await element.hover();
                await new Promise(resolve => setTimeout(resolve, 200));

                const clickSuccess = await safeClick(element, page, browser, logger, 'play button');

                if (clickSuccess) {
                  playButtonFound = true;
                  updateProgress('extracting', 80, 'Play button clicked, waiting for streams');

                  // Wait for streams to load
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  break;
                }
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

    // If no play button found, try clicking on video elements
    if (!playButtonFound) {
      logger.warn('No play button found, trying video center clicking');
      updateProgress('extracting', 78, 'Attempting video center clicking as fallback');

      const videoSelectors = [
        'video',
        'iframe[src*="embed"]',
        'iframe[src*="player"]',
        '.video-player',
        '.player'
      ];

      for (const selector of videoSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            logger.info('Found video element for center clicking', { selector });

            const elementInfo = await element.evaluate(el => {
              const rect = el.getBoundingClientRect();
              return {
                visible: el.offsetParent !== null,
                rect: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  centerX: rect.x + rect.width / 2,
                  centerY: rect.y + rect.height / 2
                }
              };
            });

            if (elementInfo.visible && elementInfo.rect.width > 0 && elementInfo.rect.height > 0) {
              logger.info('Clicking center of video element');

              // Two-click pattern
              await page.mouse.click(elementInfo.rect.centerX, elementInfo.rect.centerY);
              await new Promise(resolve => setTimeout(resolve, 100));
              await page.mouse.click(elementInfo.rect.centerX, elementInfo.rect.centerY);

              playButtonFound = true;
              await new Promise(resolve => setTimeout(resolve, 2000));
              break;
            }
          }
        } catch (e) {
          logger.debug('Error with video center clicking', { selector, error: e.message });
        }
      }
    }

    // Trigger additional events
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('click'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Final wait for streams
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info('Page interaction completed', { playButtonFound });

  } catch (error) {
    logger.warn('Page interaction error', { error: error.message });
  }
}

// Validate request parameters
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

  // If no URL provided but we have media info, construct URL
  if (!url && mediaType && movieId) {
    if (server.toLowerCase() === 'vidsrc.xyz' || server.toLowerCase() === 'vidsrc') {
      if (mediaType === 'movie') {
        finalUrl = `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`;
      } else if (mediaType === 'tv' && seasonId && episodeId) {
        finalUrl = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}`;
      } else if (mediaType === 'tv') {
        return {
          isValid: false,
          error: 'TV shows require seasonId and episodeId parameters'
        };
      }
    }
  }

  if (!finalUrl) {
    return {
      isValid: false,
      error: 'Either url parameter or mediaType+movieId (and seasonId/episodeId for TV) are required'
    };
  }

  // Validate URL format
  try {
    new URL(finalUrl);
  } catch (e) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  return {
    isValid: true,
    params: { url: finalUrl, mediaType, movieId, seasonId, episodeId, server }
  };
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
      '/extract': 'Extract stream URLs (JSON response)',
      '/extract-stream': 'Extract stream URLs with real-time progress (Server-Sent Events)',
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
          server: 'vidsrc.xyz (default)'
        },
        examples: [
          '/extract?mediaType=movie&movieId=123456&server=vidsrc.xyz',
          '/extract?mediaType=tv&movieId=123456&seasonId=1&episodeId=1&server=vidsrc.xyz',
          '/extract?url=https://vidsrc.xyz/embed/movie?tmdb=123456'
        ]
      }
    }
  });
});

// Main extract endpoint
app.get('/extract', async (req, res) => {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info('Stream extraction request started');

  let browser = null;

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

    const { url, mediaType, movieId, seasonId, episodeId, server } = validation.params;

    // Launch browser
    logger.info('Launching Puppeteer browser');
    const browserConfig = await getBrowserConfig(logger);
    browser = await puppeteer.launch(browserConfig);

    // Create new page
    const page = await browser.newPage();
    const fingerprint = browserConfig.fingerprint;

    // Set viewport
    await page.setViewport({
      width: fingerprint.screenWidth,
      height: fingerprint.screenHeight,
      deviceScaleFactor: 1,
      hasTouch: fingerprint.maxTouchPoints > 0,
      isLandscape: fingerprint.screenWidth > fingerprint.screenHeight
    });

    // Setup stream interception
    const { streamUrls } = setupEnhancedStreamInterception(page, logger, url);

    // Navigate to URL
    logger.info('Navigating to URL', { url: url.substring(0, 100) });

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } catch (navigationError) {
      logger.error('Navigation failed', navigationError);
      throw new Error(`Navigation failed: ${navigationError.message}`);
    }

    // Handle Cloudflare challenges
    const cloudflareResult = await detectAndHandleCloudflareChallenge(page, logger);
    if (cloudflareResult.challengeDetected && !cloudflareResult.resolved) {
      throw new Error('Cloudflare challenge could not be resolved');
    }

    // Interact with page to trigger stream loading
    await interactWithPage(page, logger, browser, requestStart);

    // Wait for streams to be detected
    let streamWaitTime = 0;
    const maxStreamWait = 15000; // 15 seconds max

    while (streamUrls.length === 0 && streamWaitTime < maxStreamWait) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      streamWaitTime += 1000;

      if (streamWaitTime % 3000 === 0) {
        logger.info(`Still waiting for streams... ${streamWaitTime}ms elapsed`);
      }
    }

    // Process results
    const totalTime = Date.now() - requestStart;

    if (streamUrls.length > 0) {
      // Sort streams by priority
      streamUrls.sort((a, b) => a.priority - b.priority);

      const bestStream = streamUrls[0];

      logger.info('Stream extraction successful', {
        streamCount: streamUrls.length,
        bestStreamSource: bestStream.source,
        totalTime,
        requestId
      });

      res.json({
        success: true,
        streamUrl: bestStream.url,
        streamInfo: {
          source: bestStream.source,
          quality: 'auto',
          type: 'hls'
        },
        debug: {
          totalStreams: streamUrls.length,
          extractionTime: totalTime,
          method: bestStream.extractionMethod,
          requestId
        }
      });
    } else {
      logger.warn('No streams found', { totalTime, requestId });

      res.json({
        success: false,
        error: 'No streams found',
        debug: {
          extractionTime: totalTime,
          requestId
        }
      });
    }

  } catch (error) {
    const totalTime = Date.now() - requestStart;
    logger.error('Stream extraction failed', error, { totalTime, requestId });

    res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        extractionTime: totalTime,
        requestId
      }
    });
  } finally {
    // Cleanup
    if (browser) {
      try {
        await browser.close();
        logger.info('Browser closed successfully');
      } catch (e) {
        logger.warn('Error closing browser', { error: e.message });
      }
    }
  }
});

// Server-Sent Events endpoint for real-time progress
app.get('/extract-stream', async (req, res) => {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  function sendProgress(phase, percentage, message, data = {}) {
    const progressData = {
      phase,
      percentage,
      message,
      timestamp: new Date().toISOString(),
      requestId,
      ...data
    };

    res.write(`data: ${JSON.stringify(progressData)}\n\n`);
    logger.info(`Progress: ${phase} (${percentage}%) - ${message}`);
  }

  let browser = null;

  try {
    sendProgress('initializing', 5, 'Starting stream extraction service');

    // Parse and validate parameters
    const validation = validateParameters(req.query, logger);
    if (!validation.isValid) {
      sendProgress('error', 0, validation.error);
      res.write(`data: ${JSON.stringify({ success: false, error: validation.error, requestId })}\n\n`);
      return res.end();
    }

    const { url, mediaType, movieId, seasonId, episodeId, server } = validation.params;

    sendProgress('connecting', 10, 'Launching browser');
    const browserConfig = await getBrowserConfig(logger);
    browser = await puppeteer.launch(browserConfig);

    sendProgress('connecting', 15, 'Creating new page');
    const page = await browser.newPage();
    const fingerprint = browserConfig.fingerprint;

    sendProgress('navigating', 25, 'Setting up browser');
    await page.setViewport({
      width: fingerprint.screenWidth,
      height: fingerprint.screenHeight,
      deviceScaleFactor: 1,
      hasTouch: fingerprint.maxTouchPoints > 0,
      isLandscape: fingerprint.screenWidth > fingerprint.screenHeight
    });

    sendProgress('navigating', 35, 'Setting up stream interception');
    const { streamUrls } = setupEnhancedStreamInterception(page, logger, url);

    sendProgress('bypassing', 45, 'Navigating to target URL');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    sendProgress('bypassing', 50, 'Handling anti-bot measures');
    const cloudflareResult = await detectAndHandleCloudflareChallenge(page, logger);
    if (cloudflareResult.challengeDetected && !cloudflareResult.resolved) {
      throw new Error('Cloudflare challenge could not be resolved');
    }

    sendProgress('extracting', 65, 'Triggering stream loading');
    await interactWithPage(page, logger, browser, requestStart, sendProgress);

    sendProgress('validating', 90, 'Waiting for stream detection');
    let streamWaitTime = 0;
    const maxStreamWait = 15000;

    while (streamUrls.length === 0 && streamWaitTime < maxStreamWait) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      streamWaitTime += 1000;

      if (streamWaitTime % 3000 === 0) {
        sendProgress('validating', 90 + (streamWaitTime / maxStreamWait) * 5,
          `Still detecting streams... ${streamWaitTime}ms elapsed`);
      }
    }

    sendProgress('finalizing', 95, 'Processing results');

    const totalTime = Date.now() - requestStart;

    if (streamUrls.length > 0) {
      streamUrls.sort((a, b) => a.priority - b.priority);
      const bestStream = streamUrls[0];

      sendProgress('complete', 100, 'Stream extraction successful');

      const result = {
        success: true,
        streamUrl: bestStream.url,
        streamInfo: {
          source: bestStream.source,
          quality: 'auto',
          type: 'hls'
        },
        debug: {
          totalStreams: streamUrls.length,
          extractionTime: totalTime,
          method: bestStream.extractionMethod,
          requestId
        }
      };

      res.write(`data: ${JSON.stringify(result)}\n\n`);
    } else {
      sendProgress('error', 100, 'No streams found');
      res.write(`data: ${JSON.stringify({
        success: false,
        error: 'No streams found',
        debug: { extractionTime: totalTime, requestId }
      })}\n\n`);
    }

  } catch (error) {
    const totalTime = Date.now() - requestStart;
    logger.error('Stream extraction failed', error);

    sendProgress('error', 100, `Extraction failed: ${error.message}`);
    res.write(`data: ${JSON.stringify({
      success: false,
      error: error.message,
      debug: { extractionTime: totalTime, requestId }
    })}\n\n`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        logger.warn('Error closing browser', { error: e.message });
      }
    }
    res.end();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Flyx Extract Stream Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎬 Extract endpoint: http://localhost:${PORT}/extract`);
  console.log(`📡 Streaming endpoint: http://localhost:${PORT}/extract-stream`);
});