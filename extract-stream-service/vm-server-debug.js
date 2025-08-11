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

// Enhanced debugging logger for local development
class DebugLogger {
  constructor(requestId) {
    this.requestId = requestId;
    this.startTime = Date.now();
    this.logs = [];
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    
    const logEntry = {
      timestamp,
      elapsed: `${elapsed}ms`,
      level,
      requestId: this.requestId,
      message,
      data
    };

    this.logs.push(logEntry);

    // Console output with colors
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[90m',   // Gray
      success: '\x1b[32m', // Green
      reset: '\x1b[0m'
    };

    const color = colors[level] || colors.reset;
    console.log(`${color}[${timestamp}] [${elapsed}ms] [${level.toUpperCase()}] ${message}${colors.reset}`);
    
    if (Object.keys(data).length > 0) {
      console.log(`${colors.debug}${JSON.stringify(data, null, 2)}${colors.reset}`);
    }
  }

  info(message, data = {}) { this.log('info', message, data); }
  warn(message, data = {}) { this.log('warn', message, data); }
  error(message, error = null, data = {}) { 
    if (error) {
      data.error = error.message;
      data.stack = error.stack;
    }
    this.log('error', message, data); 
  }
  debug(message, data = {}) { this.log('debug', message, data); }
  success(message, data = {}) { this.log('success', message, data); }

  timing(label, startTime) {
    const duration = Date.now() - startTime;
    this.info(`⏱️  ${label}`, { duration: `${duration}ms` });
    return duration;
  }

  getAllLogs() {
    return this.logs;
  }
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced user agent rotation with realistic browser fingerprints
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
    }
  ];

  return browserFingerprints[0]; // Use consistent fingerprint for debugging
}

// Validate request parameters and construct URLs
function validateParameters(query, logger) {
  const url = query.url;
  const mediaType = query.mediaType;
  const movieId = query.movieId;
  const seasonId = query.seasonId;
  const episodeId = query.episodeId;
  const server = query.server || 'vidsrc.xyz';

  logger.info('🔍 Request parameters received', {
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
        logger.success('🎬 Constructed vidsrc.xyz movie URL', {
          movieId,
          server,
          constructedUrl: finalUrl
        });
      } else if (mediaType === 'tv' && seasonId && episodeId) {
        finalUrl = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}`;
        logger.success('📺 Constructed vidsrc.xyz TV episode URL', {
          movieId,
          seasonId,
          episodeId,
          server,
          constructedUrl: finalUrl
        });
      } else if (mediaType === 'tv') {
        logger.error('❌ TV show missing season/episode parameters', null, {
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
    logger.error('❌ Missing required parameters', null, {
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
    logger.error('❌ Invalid URL format', e, { providedUrl: finalUrl });
    return { isValid: false, error: 'Invalid URL format' };
  }

  logger.success('✅ Final URL validated', {
    originalUrl: url,
    finalUrl: finalUrl,
    isVidsrc: finalUrl.includes('vidsrc'),
    mediaType
  });

  return {
    isValid: true,
    params: { url: finalUrl, mediaType, movieId, seasonId, episodeId, server }
  };
}

// Enhanced browser configuration for debugging
async function getBrowserConfig(logger) {
  logger.debug('🔧 Using debug browser configuration');

  const fingerprint = getAdvancedUserAgent();

  // Check if Chrome is available
  const possiblePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  let executablePath = null;
  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      executablePath = chromePath;
      logger.success('✅ Found Chrome executable', { path: chromePath });
      break;
    }
  }

  if (!executablePath) {
    logger.warn('⚠️  Chrome executable not found, using system default');
  }

  const config = {
    headless: false, // Set to false for debugging to see what's happening
    devtools: true,  // Open DevTools for debugging
    slowMo: 100,     // Slow down operations for debugging
    args: [
      // Core sandbox and security
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',

      // Debug-friendly settings
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',

      // User agent
      '--user-agent=' + fingerprint.userAgent,

      // Window size
      `--window-size=${fingerprint.screenWidth},${fingerprint.screenHeight}`,

      // Debug specific
      '--enable-logging',
      '--log-level=0',
      '--v=1'
    ],
    fingerprint: fingerprint
  };

  if (executablePath) {
    config.executablePath = executablePath;
  }

  return config;
}

// Enhanced stream interception with detailed debugging
function setupEnhancedStreamInterception(page, logger, targetUrl = '') {
  const streamUrls = [];
  let responseCount = 0;
  const allRequests = [];
  const allResponses = [];

  logger.info('🕸️  Setting up network interception');

  // Intercept all requests for debugging
  page.on('request', async (request) => {
    const requestUrl = request.url();
    const requestInfo = {
      url: requestUrl,
      method: request.method(),
      headers: request.headers(),
      timestamp: Date.now()
    };
    
    allRequests.push(requestInfo);

    // Log interesting requests
    if (requestUrl.includes('m3u8') || 
        requestUrl.includes('cloudnestra') || 
        requestUrl.includes('shadowlandschronicles') ||
        requestUrl.includes('vidsrc')) {
      logger.debug('📤 Interesting request', {
        url: requestUrl.substring(0, 150),
        method: request.method(),
        resourceType: request.resourceType()
      });
    }

    await request.continue();
  });

  // Intercept all responses for debugging
  page.on('response', async (response) => {
    responseCount++;
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();
    const headers = response.headers();

    const responseInfo = {
      url: responseUrl,
      status,
      contentType,
      headers,
      timestamp: Date.now()
    };
    
    allResponses.push(responseInfo);

    try {
      // Log all responses for first 50 requests
      if (responseCount <= 50) {
        logger.debug('📥 Network response', {
          url: responseUrl.substring(0, 150),
          status,
          contentType,
          responseCount
        });
      }

      // Enhanced M3U8 detection
      const isM3U8Response =
        contentType.includes('mpegurl') ||
        contentType.includes('m3u8') ||
        contentType.includes('vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegurl') ||
        responseUrl.includes('.m3u8') ||
        responseUrl.includes('master') ||
        responseUrl.includes('index') ||
        responseUrl.includes('playlist');

      // Enhanced source detection
      const isShadowlandschronicles = responseUrl.includes('shadowlandschronicles');
      const isCloudnestra = responseUrl.includes('cloudnestra');
      const isVidsrc = responseUrl.includes('vidsrc');

      // Priority detection
      if (isM3U8Response || isShadowlandschronicles || isCloudnestra) {
        logger.success('🎯 Potential stream URL detected!', {
          url: responseUrl.substring(0, 150),
          contentType,
          status,
          isShadowlandschronicles,
          isCloudnestra,
          isVidsrc,
          isM3U8Response
        });

        // Try to read content for validation
        if (status === 200) {
          try {
            const responseText = await response.text();
            
            // Enhanced M3U8 content validation
            const isActualM3U8 = responseText.includes('#EXTM3U') ||
              responseText.includes('#EXT-X-') ||
              responseUrl.includes('.m3u8') ||
              isShadowlandschronicles ||
              isCloudnestra;

            if (isActualM3U8) {
              let source = 'unknown';
              if (isShadowlandschronicles) source = 'shadowlandschronicles';
              else if (isCloudnestra) source = 'cloudnestra';
              else if (isVidsrc) source = 'vidsrc';

              const streamInfo = {
                url: responseUrl,
                contentType,
                status,
                source,
                priority: isShadowlandschronicles ? 0 : isCloudnestra ? 1 : 2,
                isMaster: responseUrl.includes('master'),
                needsProxy: isShadowlandschronicles || status === 403,
                extractionMethod: 'debug_interception',
                timestamp: Date.now(),
                contentPreview: responseText.substring(0, 500)
              };

              streamUrls.push(streamInfo);

              logger.success('✅ Valid M3U8 stream found!', {
                url: responseUrl.substring(0, 150),
                source,
                priority: streamInfo.priority,
                isMaster: streamInfo.isMaster,
                contentLength: responseText.length,
                contentPreview: responseText.substring(0, 200)
              });
            } else {
              logger.warn('⚠️  False positive - not actual M3U8', {
                url: responseUrl.substring(0, 100),
                contentPreview: responseText.substring(0, 200)
              });
            }
          } catch (contentError) {
            logger.warn('❌ Could not read response content', {
              url: responseUrl.substring(0, 100),
              error: contentError.message
            });
          }
        } else if (isShadowlandschronicles) {
          // Even if we can't read content, shadowlandschronicles URLs are valuable
          streamUrls.push({
            url: responseUrl,
            contentType,
            status,
            source: 'shadowlandschronicles',
            priority: 0,
            isMaster: responseUrl.includes('master'),
            needsProxy: true,
            extractionMethod: 'debug_interception',
            contentError: 'Status not 200',
            timestamp: Date.now()
          });

          logger.success('✅ Shadowlandschronicles stream found (status not 200)', {
            url: responseUrl.substring(0, 150),
            status
          });
        }
      }
    } catch (error) {
      logger.warn('❌ Error in response processing', {
        url: responseUrl.substring(0, 100),
        error: error.message
      });
    }
  });

  return { streamUrls, allRequests, allResponses };
}

// Enhanced page interaction with detailed debugging
async function interactWithPage(page, logger) {
  const interactionStart = Date.now();

  try {
    logger.info('🎭 Starting page interaction');

    // Wait for page to be ready
    await page.waitForSelector('body', { timeout: 15000 });
    logger.success('✅ Page body loaded');

    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-page-loaded.png', fullPage: true });
    logger.info('📸 Screenshot saved: debug-page-loaded.png');

    // Get page info
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 500),
      iframeCount: document.querySelectorAll('iframe').length,
      videoCount: document.querySelectorAll('video').length
    }));

    logger.info('📄 Page information', pageInfo);

    // Look for iframes
    const iframes = await page.$$('iframe');
    if (iframes.length > 0) {
      logger.success(`🖼️  Found ${iframes.length} iframes`);

      for (let i = 0; i < iframes.length; i++) {
        try {
          const iframe = iframes[i];
          const src = await iframe.evaluate(el => el.src);
          const id = await iframe.evaluate(el => el.id);
          const className = await iframe.evaluate(el => el.className);

          logger.info(`🖼️  Iframe ${i + 1}`, {
            src: src ? src.substring(0, 100) : 'no src',
            id,
            className
          });

          if (src && (src.includes('player') || src.includes('embed') || src.includes('video') || src.includes('cloudnestra'))) {
            logger.success(`🎯 Found video iframe ${i + 1}`, { src: src.substring(0, 100) });

            // Try to access iframe content
            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                logger.success(`✅ Can access iframe ${i + 1} content`);
                
                // Wait for iframe to load
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Look for play buttons in iframe
                const playSelectors = [
                  '#pl_but',
                  '.fas.fa-play',
                  'button#pl_but',
                  '[id="pl_but"]',
                  'button.fas.fa-play',
                  'button[class*="play"]',
                  '.play-button',
                  '.video-play-button'
                ];

                for (const selector of playSelectors) {
                  try {
                    const playButton = await frame.$(selector);
                    if (playButton) {
                      logger.success(`🎮 Found play button in iframe ${i + 1}`, { selector });
                      
                      // Get button info
                      const buttonInfo = await playButton.evaluate(el => ({
                        id: el.id,
                        className: el.className,
                        tagName: el.tagName,
                        visible: el.offsetParent !== null,
                        innerText: el.innerText
                      }));
                      
                      logger.info('🎮 Play button details', buttonInfo);

                      // Click the button
                      await playButton.hover();
                      await new Promise(resolve => setTimeout(resolve, 500));
                      await playButton.click();
                      logger.success(`✅ Clicked play button in iframe ${i + 1}`);
                      
                      // Wait for response
                      await new Promise(resolve => setTimeout(resolve, 5000));
                      
                      // Take screenshot after click
                      await page.screenshot({ path: `debug-after-click-iframe-${i + 1}.png`, fullPage: true });
                      logger.info(`📸 Screenshot saved: debug-after-click-iframe-${i + 1}.png`);
                      
                      break;
                    }
                  } catch (e) {
                    logger.debug(`No play button found with selector ${selector} in iframe ${i + 1}`);
                  }
                }
              } else {
                logger.warn(`❌ Cannot access iframe ${i + 1} content (CORS)`);
              }
            } catch (e) {
              logger.warn(`❌ Error accessing iframe ${i + 1}`, { error: e.message });
            }
          }
        } catch (e) {
          logger.warn(`❌ Error processing iframe ${i + 1}`, { error: e.message });
        }
      }
    } else {
      logger.warn('⚠️  No iframes found on page');
    }

    // Look for play buttons on main page
    const playSelectors = [
      '#pl_but',
      '.fas.fa-play',
      'button#pl_but',
      '[id="pl_but"]',
      'button.fas.fa-play',
      'button[class*="play"]',
      '.play-button',
      '.video-play-button',
      'button[aria-label*="play" i]',
      'button[title*="play" i]'
    ];

    let playButtonFound = false;
    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.success(`🎮 Found ${elements.length} play button(s) with selector: ${selector}`);

          for (let j = 0; j < elements.length; j++) {
            const element = elements[j];
            
            // Get element info
            const elementInfo = await element.evaluate(el => ({
              id: el.id,
              className: el.className,
              tagName: el.tagName,
              visible: el.offsetParent !== null,
              innerText: el.innerText,
              disabled: el.disabled
            }));

            logger.info(`🎮 Play button ${j + 1} details`, elementInfo);

            if (elementInfo.visible && !elementInfo.disabled) {
              // Click the button
              await element.hover();
              await new Promise(resolve => setTimeout(resolve, 500));
              await element.click();
              logger.success(`✅ Clicked play button ${j + 1} (${selector})`);
              playButtonFound = true;

              // Wait for response
              await new Promise(resolve => setTimeout(resolve, 5000));

              // Take screenshot after click
              await page.screenshot({ path: `debug-after-click-main-${j + 1}.png`, fullPage: true });
              logger.info(`📸 Screenshot saved: debug-after-click-main-${j + 1}.png`);

              break;
            }
          }

          if (playButtonFound) break;
        }
      } catch (e) {
        logger.debug(`No play button found with selector: ${selector}`);
      }
    }

    if (!playButtonFound) {
      logger.warn('⚠️  No play buttons found, trying generic interactions');

      // Try clicking on video elements
      const videoSelectors = ['video', '.video-container', '.player', '#player'];
      for (const selector of videoSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            logger.info(`🎬 Found video element: ${selector}`);
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
          }
        } catch (e) {
          logger.debug(`No video element found with selector: ${selector}`);
        }
      }
    }

    // Wait for additional network activity
    logger.info('⏳ Waiting for additional network activity...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Take final screenshot
    await page.screenshot({ path: 'debug-final-state.png', fullPage: true });
    logger.info('📸 Final screenshot saved: debug-final-state.png');

    logger.timing('🎭 Page interaction completed', interactionStart);

  } catch (error) {
    logger.error('❌ Page interaction error', error);
  }
}

// Main debug extraction endpoint
app.get('/debug-extract', async (req, res) => {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = new DebugLogger(requestId);

  logger.info('🚀 DEBUG: Stream extraction request started', {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
    query: req.query
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
        requestId,
        logs: logger.getAllLogs()
      });
    }

    ({ url, mediaType, movieId, seasonId, episodeId, server } = validation.params);

    // Launch browser
    logger.info('🌐 Launching Puppeteer browser');
    const launchStart = Date.now();

    const browserConfig = await getBrowserConfig(logger);
    browser = await puppeteer.launch(browserConfig);

    logger.timing('🌐 Browser launch completed', launchStart);

    // Create new page
    const page = await browser.newPage();
    const fingerprint = browserConfig.fingerprint;

    // Set viewport
    await page.setViewport({
      width: fingerprint.screenWidth,
      height: fingerprint.screenHeight,
      deviceScaleFactor: 1
    });

    // Set user agent
    await page.setUserAgent(fingerprint.userAgent);

    // Set up network interception
    const { streamUrls, allRequests, allResponses } = setupEnhancedStreamInterception(page, logger, url);

    // Navigate to URL
    logger.info('🧭 Navigating to URL', { url });
    const navigationStart = Date.now();
    
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    logger.timing('🧭 Navigation completed', navigationStart);

    // Interact with page
    await interactWithPage(page, logger);

    // Wait for final network activity
    logger.info('⏳ Final wait for network activity...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Sort streams by priority
    streamUrls.sort((a, b) => a.priority - b.priority);

    const result = {
      success: streamUrls.length > 0,
      requestId,
      streamUrl: streamUrls.length > 0 ? streamUrls[0].url : null,
      allStreams: streamUrls,
      debug: {
        totalRequests: allRequests.length,
        totalResponses: allResponses.length,
        streamUrlsFound: streamUrls.length,
        extractionTime: Date.now() - requestStart,
        targetUrl: url,
        interestingRequests: allRequests.filter(req => 
          req.url.includes('m3u8') || 
          req.url.includes('cloudnestra') || 
          req.url.includes('shadowlandschronicles')
        ),
        interestingResponses: allResponses.filter(res => 
          res.url.includes('m3u8') || 
          res.url.includes('cloudnestra') || 
          res.url.includes('shadowlandschronicles')
        )
      },
      logs: logger.getAllLogs()
    };

    logger.success('✅ DEBUG: Extraction completed', {
      streamsFound: streamUrls.length,
      totalTime: Date.now() - requestStart
    });

    res.json(result);

  } catch (error) {
    logger.error('❌ DEBUG: Extraction failed', error);

    res.status(500).json({
      success: false,
      error: error.message,
      requestId,
      logs: logger.getAllLogs()
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.info('🌐 Browser closed');
      } catch (e) {
        logger.warn('⚠️  Error closing browser', { error: e.message });
      }
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Flyx Extract Stream Service - DEBUG MODE',
    version: '1.0.0-debug'
  });
});

// Root endpoint with debug documentation
app.get('/', (req, res) => {
  res.json({
    service: 'Flyx Extract Stream Service - DEBUG MODE',
    version: '1.0.0-debug',
    endpoints: {
      '/health': 'Health check',
      '/debug-extract': 'Debug stream extraction with detailed logging and screenshots'
    },
    debugFeatures: {
      detailedLogging: 'Comprehensive logging with timestamps and colors',
      screenshots: 'Automatic screenshots at key points (debug-*.png)',
      networkCapture: 'Complete request/response logging',
      browserVisible: 'Browser runs in non-headless mode with DevTools',
      slowMotion: 'Slowed down operations for easier debugging'
    },
    usage: {
      debugExtract: {
        method: 'GET',
        endpoint: '/debug-extract',
        parameters: {
          url: 'Direct URL to extract from (optional)',
          mediaType: 'movie or tv (required if no url)',
          movieId: 'TMDB movie/show ID (required if no url)',
          seasonId: 'Season number (required for TV)',
          episodeId: 'Episode number (required for TV)',
          server: 'vidsrc.xyz (default)'
        },
        examples: [
          '/debug-extract?mediaType=movie&movieId=123456',
          '/debug-extract?mediaType=tv&movieId=123456&seasonId=1&episodeId=1',
          '/debug-extract?url=https://vidsrc.xyz/embed/movie?tmdb=123456'
        ],
        debugOutput: {
          logs: 'Complete execution log with timestamps',
          screenshots: 'Saved as debug-*.png files',
          networkData: 'All requests and responses captured',
          streamAnalysis: 'Detailed analysis of found streams'
        }
      }
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Flyx Extract Stream Service (DEBUG MODE) running on http://0.0.0.0:' + PORT);
  console.log('📊 Health check: http://0.0.0.0:' + PORT + '/health');
  console.log('🐛 Debug extraction: http://0.0.0.0:' + PORT + '/debug-extract');
  console.log('');
  console.log('🔍 DEBUG FEATURES:');
  console.log('  • Detailed console logging with colors');
  console.log('  • Automatic screenshots saved as debug-*.png');
  console.log('  • Browser runs visible with DevTools');
  console.log('  • Complete network request/response capture');
  console.log('  • Slow motion execution for easier debugging');
  console.log('');
  console.log('📝 Example usage:');
  console.log(`  curl "http://localhost:${PORT}/debug-extract?mediaType=movie&movieId=550"`);
});