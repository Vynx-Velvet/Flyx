const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Utility function for structured logging
function createLogger(requestId) {
  return {
    info: (message, data = {}) => {
      console.log(`[${requestId}] INFO: ${message}`, JSON.stringify(data, null, 2));
    },
    warn: (message, data = {}) => {
      console.warn(`[${requestId}] WARN: ${message}`, JSON.stringify(data, null, 2));
    },
    error: (message, error = null, data = {}) => {
      console.error(`[${requestId}] ERROR: ${message}`, {
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null,
        ...data
      });
    },
    debug: (message, data = {}) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${requestId}] DEBUG: ${message}`, JSON.stringify(data, null, 2));
      }
    },
    timing: (label, startTime) => {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] TIMING: ${label} took ${duration}ms`);
      return duration;
    }
  };
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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

// Get browser configuration
async function getBrowserConfig(logger) {
  logger.debug('Using Google VM Chrome configuration');
  
  return {
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-extensions-file-access-check',
      '--disable-extensions-http-throttling',
      '--disable-extensions-https-throttling',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-component-extensions-with-background-pages',
      '--disable-sync',
      '--disable-translate',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-component-update',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--disable-prompt-on-repost',
      '--disable-hang-monitor',
      '--disable-client-side-phishing-detection',
      '--disable-popup-blocking',
      '--disable-print-preview',
      '--disable-component-extensions-with-background-pages',
      '--enable-automation=false',
      '--password-store=basic',
      '--use-mock-keychain',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-gpu'
    ]
  };
}

// Setup stream interception to capture m3u8 URLs
function setupStreamInterception(page, logger, targetUrl = '') {
  const streamUrls = [];
  let responseCount = 0;

  // Intercept network responses
  page.on('response', async (response) => {
    responseCount++;
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();

    try {
      // Log all responses for debugging
      if (responseCount <= 50) { // Limit logging to prevent spam
        logger.debug('Network response intercepted', {
          url: responseUrl.substring(0, 150),
          status,
          contentType,
          responseCount
        });
      }

      // Check for shadowlandschronicles URLs with master playlists
      const isShadowlandschronicles = responseUrl.includes('shadowlandschronicles') && responseUrl.includes('master');
      
      // Check for general M3U8 content
      const isM3U8Response = 
        contentType.includes('mpegurl') ||
        contentType.includes('m3u8') ||
        contentType.includes('vnd.apple.mpegurl') ||
        contentType.includes('text/plain') ||
        responseUrl.includes('.m3u8') ||
        responseUrl.includes('master') ||
        responseUrl.includes('index');

      // Priority for shadowlandschronicles master playlists
      if (isShadowlandschronicles || (isM3U8Response && (status === 200 || (isShadowlandschronicles && status === 403)))) {
        logger.info('Potential stream URL detected', {
          url: responseUrl.substring(0, 150),
          contentType,
          status,
          isShadowlandschronicles,
          isM3U8Response,
          priority: isShadowlandschronicles ? 0 : isM3U8Response ? 1 : 2
        });

        // For shadowlandschronicles URLs or successful M3U8 responses, try to read content
        if (status === 200 || (isShadowlandschronicles && status === 403)) {
          try {
            let responseText = '';
            if (status === 200) {
              responseText = await response.text();
            }

            // Check if it's actually M3U8 content
            const isActualM3U8 = responseText.includes('#EXTM3U') || responseUrl.includes('.m3u8') || isShadowlandschronicles;

            if (isActualM3U8) {
              // Determine stream source
              let source = 'unknown';
              if (responseUrl.includes('shadowlandschronicles')) {
                source = 'shadowlandschronicles';
              } else if (targetUrl.includes('vidsrc')) {
                source = 'vidsrc';
              } else if (targetUrl.includes('embed.su')) {
                source = 'embed.su';
              }

              streamUrls.push({
                url: responseUrl,
                contentType,
                status,
                source,
                priority: isShadowlandschronicles ? 0 : 1,
                isMaster: responseUrl.includes('master'),
                needsCleanHeaders: isShadowlandschronicles || status === 403
              });

              logger.info('Valid M3U8 stream found', {
                url: responseUrl.substring(0, 150),
                source,
                priority: isShadowlandschronicles ? 0 : 1,
                isMaster: responseUrl.includes('master'),
                contentLength: responseText.length,
                needsCleanHeaders: isShadowlandschronicles || status === 403
              });
            }
          } catch (contentError) {
            logger.warn('Could not read response content', {
              url: responseUrl.substring(0, 100),
              error: contentError.message
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Error processing response', {
        url: responseUrl.substring(0, 100),
        error: error.message
      });
    }
  });

  return { streamUrls };
}

// Interact with the page to trigger stream loading with realistic human behavior
async function interactWithPage(page, logger) {
  const interactionStart = Date.now();
  
  try {
    // Wait for page to be ready with realistic timing
    await page.waitForSelector('body', { timeout: 15000 });
    
    // Simulate human-like page reading time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Simulate mouse movement and scrolling
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
    
    // Look for and click play buttons in main page (prioritizing vidsrc.xyz specific button)
    const playSelectors = [
      '#pl_but',                                    // Specific vidsrc.xyz play button ID
      '.fas.fa-play',                              // Specific vidsrc.xyz play button class
      'button#pl_but',                             // More specific vidsrc button selector
      '[id="pl_but"]',                             // Alternative ID selector
      'button.fas.fa-play',                        // Alternative class selector
      'button[class*="play"]',
      'div[class*="play"]',
      '[data-testid*="play"]',
      '.play-button',
      '.video-play-button', 
      '[data-testid="play-button"]',
      'button[aria-label*="play" i]',
      'button[title*="play" i]',
      '.play',
      '.btn-play',
      '#play-btn',
      '.play-icon',
      'div[role="button"]',  // Will check text content programmatically if needed
      '[class*="play"][role="button"]',
      '[id*="play"]',
      '.vjs-big-play-button',
      '.plyr__control--overlaid'
    ];

    let playButtonFound = false;
    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found play button', { selector, count: elements.length });
          
          // Special handling for vidsrc.xyz play button
          if (selector === '#pl_but' || selector === '.fas.fa-play') {
            logger.info('Found vidsrc.xyz specific play button', { selector });
            
            // Get button properties for debugging
            const buttonInfo = await elements[0].evaluate(el => ({
              id: el.id,
              className: el.className,
              tagName: el.tagName,
              visible: el.offsetParent !== null,
              disabled: el.disabled,
              innerText: el.innerText
            }));
            
            logger.info('vidsrc.xyz play button properties', buttonInfo);
          }
          
          // Human-like interaction - hover first, then click
          await elements[0].hover();
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
          await elements[0].click();
          playButtonFound = true;
          
          // Extra wait for vidsrc.xyz button to ensure it processes
          if (selector === '#pl_but' || selector === '.fas.fa-play') {
            logger.info('Clicked vidsrc.xyz play button, waiting for stream initialization...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
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
      '/extract': 'Extract stream URLs',
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
    
    // Set realistic viewport and user agent
    await page.setViewport({ 
      width: 1920, 
      height: 1080, 
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
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
          csi: function() {},
          loadTimes: function() {
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
        navigator.permissions.query = function(parameters) {
          return parameters.name === 'notifications' 
            ? Promise.resolve({ state: 'default' })
            : originalQuery ? originalQuery.call(this, parameters) : Promise.reject(new Error('Permission API not available'));
        };
      }
      
      // === CANVAS FINGERPRINT PROTECTION ===
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attributes) {
        if (type === '2d') {
          const context = originalGetContext.call(this, type, attributes);
          const originalFillText = context.fillText;
          const originalStrokeText = context.strokeText;
          const originalGetImageData = context.getImageData;
          
          context.fillText = function() {
            const args = Array.prototype.slice.call(arguments);
            return originalFillText.apply(this, args);
          };
          
          context.strokeText = function() {
            const args = Array.prototype.slice.call(arguments);
            return originalStrokeText.apply(this, args);
          };
          
          context.getImageData = function() {
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
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
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
          get: function() {
            const win = originalContentWindow.get.call(this);
            if (win) {
              try {
                win.navigator.webdriver = undefined;
                delete win.navigator.webdriver;
              } catch (e) {}
            }
            return win;
          },
          configurable: true
        });
      }
      
      // === FUNCTION PROTOTYPE TOSTRING OVERRIDE ===
      const originalToString = Function.prototype.toString;
      const proxyToString = new Proxy(originalToString, {
        apply: function(target, thisArg, argumentsList) {
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
        apply: function(target, thisArg, argumentsList) {
          return target.apply(thisArg, argumentsList) + performanceOffset + (Math.random() - 0.5) * 0.1;
        }
      });
      
      // === DATE TIMEZONE PROTECTION ===
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
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
        navigator.mediaDevices.enumerateDevices = function() {
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
      window.Error = function(...args) {
        const error = new originalError(...args);
        if (error.stack) {
          error.stack = error.stack.replace(/\s+at (chrome-extension|moz-extension|webkit-extension):\/\/[^\s]+/g, '');
        }
        return error;
      };
      
      // === GEOLOCATION MOCKING ===
      if (navigator.geolocation) {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
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
   
    // Enable request interception for header modification
    await page.setRequestInterception(true);
    
    // Intercept and modify requests for better stealth
    page.on('request', request => {
      const headers = {
        ...request.headers(),
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': request.resourceType() === 'document' ? 'document' : request.resourceType(),
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1'
      };
      
      // Remove automation headers
      delete headers['x-devtools-emulation-enabled'];
      delete headers['x-client-data'];
      
      request.continue({ headers });
    });
    
    // Setup stream interception
    const { streamUrls } = setupStreamInterception(page, logger, url);

    // Navigate to the page
    logger.info('Navigating to target URL');
    const navigationStart = Date.now();
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      const navigationStatus = response?.status() || 'unknown';
      logger.info('Page navigation completed', { 
        status: navigationStatus,
        url: url.substring(0, 100)
      });

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

    // Interact with page to trigger stream loading
    await interactWithPage(page, logger);

    // Wait additional time for streams to be captured with progressive checking
    let checkCount = 0;
    const maxChecks = 8;
    
    while (checkCount < maxChecks && streamUrls.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      checkCount++;
      
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
        server
      });
      
      return res.status(404).json({
        success: false,
        error: `No streams found on ${server}. Try switching servers.`,
        debug: {
          totalFound: streamUrls.length,
          m3u8Count: 0,
          server,
          suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz'
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

    // Return successful response
    return res.json({ 
      success: true, 
      streamUrl: selectedStream.url,
      type: 'hls',
      server: server,
      totalFound: streamUrls.length,
      m3u8Count: m3u8Streams.length,
      requestId,
      debug: {
        selectedStream: {
          source: selectedStream.source,
          priority: selectedStream.priority,
          isMaster: selectedStream.isMaster,
          needsCleanHeaders: selectedStream.needsCleanHeaders
        },
        totalDuration,
        server
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Flyx Extract Stream Service running on http://0.0.0.0:' + PORT);
  console.log('📊 Health check: http://0.0.0.0:' + PORT + '/health');
  console.log('📖 API docs: http://0.0.0.0:' + PORT + '/');
  console.log('🎬 Extract endpoint: http://0.0.0.0:' + PORT + '/extract');
});

module.exports = app; 