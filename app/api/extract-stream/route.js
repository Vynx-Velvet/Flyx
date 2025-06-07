import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

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

// Validate request parameters and construct embed.su URLs
function validateParameters(searchParams, logger) {
  const url = searchParams.get('url');
  const mediaType = searchParams.get('mediaType');
  const movieId = searchParams.get('movieId');
  const seasonId = searchParams.get('seasonId');
  const episodeId = searchParams.get('episodeId');
  const server = searchParams.get('server') || 'vidsrc.xyz'; // Default to vidsrc.xyz

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

  // Log the final URL being used
  logger.info('Final URL validated', {
    originalUrl: url,
    finalUrl: finalUrl.substring(0, 100) + (finalUrl.length > 100 ? '...' : ''),
    isEmbedSu: finalUrl.includes('embed.su'),
    mediaType
  });

  return {
    isValid: true,
    params: { url: finalUrl, mediaType, movieId, seasonId, episodeId, server }
  };
}

// Enhanced browser configuration with better stealth
function getBrowserConfig(logger) {
  const config = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
  };

  logger.debug('Browser configuration', config);
  return config;
}

// Enhanced context configuration with server-specific optimizations
function getContextConfig(logger, targetUrl = '') {
  const isEmbedSu = targetUrl.includes('embed.su');
  const isVidsrc = targetUrl.includes('vidsrc.xyz');
  
  const config = {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
    javaScriptEnabled: true,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': isEmbedSu ? 'same-site' : 'none',
      ...(isEmbedSu && {
        'Referer': 'https://embed.su/',
        'Origin': 'https://embed.su'
      }),
      ...(isVidsrc && {
        'Referer': 'https://vidsrc.xyz/',
        'Origin': 'https://vidsrc.xyz'
      })
    }
  };

  logger.debug('Context configuration', { 
    ...config, 
    isEmbedSu,
    isVidsrc,
    targetDomain: targetUrl ? new URL(targetUrl).hostname : 'unknown'
  });
  return config;
}

// Setup stealth measures
async function setupStealthMeasures(page, logger) {
  const startTime = Date.now();
  logger.info('Setting up stealth measures');

  try {
    await page.addInitScript(() => {
      // Remove webdriver property completely
      delete navigator.__proto__.webdriver;
      delete window.navigator.webdriver;
      
      // Override webdriver detection
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });

      // Remove automation flags and detection properties
      ['__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_function', 
       '__webdriver_script_func', '__webdriver_script_fn', '__fxdriver_evaluate', 
       '__driver_unwrapped', '__webdriver_unwrapped', '__driver_evaluate', 
       '__selenium_unwrapped', '__fxdriver_unwrapped', '__webdriver_undefix',
       '__webdriver_undefined', '__selenium_undefined', '__fxdriver_undefined',
       'webdriver', 'domAutomation', 'domAutomationController'].forEach(prop => {
        delete window[prop];
      });

      // Remove more detection properties
      ['_phantom', '__phantom', '_selenium', '__selenium', 'callPhantom', 'callSelenium',
       'selenium', 'webdriver', 'driver'].forEach(prop => {
        if (prop in window) {
          delete window[prop];
        }
        if (prop in navigator) {
          delete navigator[prop];
        }
      });

      // Mock chrome object more realistically
      window.chrome = window.chrome || {
        runtime: {
          onConnect: undefined,
          onMessage: undefined
        },
        app: {
          isInstalled: false,
        },
      };

      // Mock plugins more realistically
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            {
              0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format", 
              filename: "internal-pdf-viewer", 
              length: 1, 
              name: "Chrome PDF Plugin"
            },
            {
              0: {type: "application/pdf", suffixes: "pdf", description: ""},
              description: "", 
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai", 
              length: 1, 
              name: "Chrome PDF Viewer"
            }
          ];
        },
        configurable: true
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });

      // Mock more realistic user agent data
      if (navigator.userAgentData) {
        Object.defineProperty(navigator, 'userAgentData', {
          get: () => ({
            brands: [
              { brand: "Not_A Brand", version: "8" },
              { brand: "Chromium", version: "120" }, 
              { brand: "Google Chrome", version: "120" }
            ],
            mobile: false,
            platform: "Windows"
          }),
          configurable: true
        });
      }

      // Override permissions
      if (window.navigator.permissions && window.navigator.permissions.query) {
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: 'granted' }) :
            originalQuery(parameters)
        );
      }

      // Mock realistic screen properties
      Object.defineProperty(screen, 'availWidth', {get: () => 1920, configurable: true});
      Object.defineProperty(screen, 'availHeight', {get: () => 1040, configurable: true});
      Object.defineProperty(screen, 'width', {get: () => 1920, configurable: true});
      Object.defineProperty(screen, 'height', {get: () => 1080, configurable: true});

      // Override WebGL rendering context
      if (window.WebGLRenderingContext) {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return 'Intel Inc.';
          }
          if (parameter === 37446) {
            return 'Intel Iris OpenGL Engine';
          }
          return getParameter.call(this, parameter);
        };
      }

      // Add performance marker
      if (window.performance && window.performance.mark) {
        window.performance.mark('stealth-setup-complete');
      }

      // Override toString methods that might reveal automation
      if (window.navigator.permissions && window.navigator.permissions.query) {
        window.navigator.permissions.query.toString = () => 'function query() { [native code] }';
      }

      // Mock battery API to avoid detection
      if ('getBattery' in navigator) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1
        });
      }

      // Override connection API
      if ('connection' in navigator) {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            downlink: 10,
            effectiveType: '4g',
            rtt: 50,
            saveData: false
          }),
          configurable: true
        });
      }

      // Mock more realistic timing
      const originalNow = performance.now;
      performance.now = () => originalNow.call(performance) + Math.random() * 0.1;

      // Override console methods to avoid detection via console monitoring
      const originalLog = console.log;
      console.log = (...args) => {
        if (!args.some(arg => typeof arg === 'string' && arg.includes('webdriver'))) {
          originalLog.apply(console, args);
        }
      };

      // Mock iframe detection
      if (window.top !== window.self) {
        Object.defineProperty(window, 'top', {
          get: () => window,
          configurable: true
        });
      }
    });

    // Add realistic human-like mouse movements with curves
    const startX = Math.random() * 100 + 50;
    const startY = Math.random() * 100 + 50;
    const endX = Math.random() * 200 + 100;
    const endY = Math.random() * 150 + 100;
    
    // Simulate curved mouse movement
    const steps = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentX = startX + (endX - startX) * progress + (Math.random() - 0.5) * 10;
      const currentY = startY + (endY - startY) * progress + (Math.random() - 0.5) * 10;
      await page.mouse.move(currentX, currentY);
      await page.waitForTimeout(20 + Math.random() * 30);
    }
    
    // Random pause like a human would
    await page.waitForTimeout(200 + Math.random() * 300);

    logger.timing('Stealth measures setup', startTime);
    logger.info('Stealth measures configured successfully');
  } catch (error) {
    logger.error('Failed to setup stealth measures', error);
    throw error;
  }
}

// Enhanced stream URL detection
function setupStreamInterception(page, logger, targetUrl = '') {
    const streamUrls = [];
  const capturedHeaders = new Map(); // Store headers for different domains/CDNs
  let interceptedRequests = 0;
  let interceptedResponses = 0;
  const isVidsrc = targetUrl.includes('vidsrc.xyz');

  logger.info('Setting up stream URL interception with header monitoring', {
    isVidsrc,
    targetDomain: targetUrl ? new URL(targetUrl).hostname : 'unknown'
  });

  // Intercept requests - Monitor headers for video segments and CDN requests (silent monitoring)
  page.on('request', async (request) => {
    interceptedRequests++;
    const url = request.url();
    const headers = request.headers();
    const method = request.method();
    
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;
      
      // Silently monitor M3U8 playlist requests
      if (url.includes('.m3u8') || url.includes('playlist') || url.includes('manifest')) {
        // Store headers for this domain
        capturedHeaders.set(`${domain}_m3u8`, {
          referer: headers.referer,
          origin: headers.origin,
          userAgent: headers['user-agent'],
          timestamp: Date.now(),
          url: url.substring(0, 100)
        });
      }
      
      // Silently monitor video segment requests (especially from CDNs like viper.congacdn.cc)
      else if (url.includes('.ts') || url.includes('.mp4') || url.includes('.webm') || 
               domain.includes('cdn') || domain.includes('viper') || domain.includes('conga')) {
        // Store headers for this CDN domain
        capturedHeaders.set(`${domain}_segments`, {
          referer: headers.referer,
          origin: headers.origin,
          userAgent: headers['user-agent'],
          range: headers.range,
          timestamp: Date.now(),
          url: url.substring(0, 100)
        });
      }
      
      // Silently monitor any CDN or streaming-related requests
      else if (domain.includes('embed') || domain.includes('stream') || 
               domain.includes('video') || domain.includes('play') ||
               url.includes('stream') || url.includes('video')) {
        // Store headers for analysis
        if (headers.referer || headers.origin) {
          capturedHeaders.set(`${domain}_general`, {
            referer: headers.referer,
            origin: headers.origin,
            userAgent: headers['user-agent'],
            timestamp: Date.now(),
            url: url.substring(0, 100)
          });
        }
      }
      
    } catch (error) {
      // Silently handle URL parsing errors
    }
  });

  // Intercept responses - only log actual stream findings
  page.on('response', async (response) => {
    interceptedResponses++;
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();
    
    // Log all shadowlandschronicles responses for debugging, highlighting master URLs
    if (responseUrl.includes('shadowlandschronicles')) {
      const isMaster = responseUrl.includes('master');
      logger.info(isMaster ? '🎯 SHADOWLANDSCHRONICLES MASTER URL DETECTED' : '🔍 SHADOWLANDSCHRONICLES RESPONSE DETECTED', {
        url: responseUrl,
        status,
        contentType,
        isMaster,
        headers: response.headers()
      });
    }
      
    try {
      // Primary target: M3U8 playlist files (enhanced detection for shadowlandschronicles)
      const isM3U8 = responseUrl.includes('.m3u8') || 
          responseUrl.includes('playlist') ||
          responseUrl.includes('manifest') ||
          contentType.includes('application/vnd.apple.mpegurl') ||
          contentType.includes('application/x-mpegURL') ||
          contentType.includes('vnd.apple.mpegurl') ||
          contentType.includes('text/plain') || // Sometimes M3U8 is served as text/plain
          (responseUrl.includes('shadowlandschronicles') && contentType.includes('text/')) || // Shadowlandschronicles might use text content-type
          responseUrl.includes('master') || // Master playlist detection
          responseUrl.includes('index.m3u8');
      
      // Accept M3U8 responses (200 OK or 403 for shadowlandschronicles master playlists)
      if (isM3U8 && (status === 200 || (status === 403 && responseUrl.includes('shadowlandschronicles') && responseUrl.includes('master')))) {
        // For vidsrc, prioritize shadowlandschronicles master URLs (including subdomains)
        const isShadowlands = responseUrl.includes('shadowlandschronicles') && responseUrl.includes('master');
        
                  if (isVidsrc) {
            if (isShadowlands) {
              // This is what we want for vidsrc - shadowlandschronicles master playlist
              logger.info('🎯 FOUND SHADOWLANDSCHRONICLES MASTER M3U8 for vidsrc', {
                url: responseUrl,
                status,
                domain: new URL(responseUrl).hostname,
                note: status === 403 ? 'Got 403 - will use clean headers in proxy' : 'Got 200 - ready to use',
                isMaster: true
              });
            } else {
              // Log other M3U8s but they're lower priority
              logger.debug('Found non-shadowlandschronicles M3U8 for vidsrc', {
                url: responseUrl.substring(0, 100),
                domain: new URL(responseUrl).hostname,
                status,
                isMaster: responseUrl.includes('master')
              });
            }
          }
        
        // Only log when we actually find relevant M3U8 streams
        logger.info('🎯 FOUND M3U8 PLAYLIST', {
          url: responseUrl,
          status,
          isShadowlands,
          isVidsrc,
          headers: {
            'content-type': contentType,
            'content-length': response.headers()['content-length'],
            'referer': response.request().headers()['referer'],
            'origin': response.request().headers()['origin']
          }
        });

        streamUrls.push({
          url: responseUrl,
          headers: response.headers(),
          type: 'm3u8',
          status: status,
          timestamp: Date.now(),
          priority: isShadowlands ? 0 : (responseUrl.includes('master') ? 1 : 2), // Shadowlandschronicles master = 0, other masters = 1, others = 2
          isShadowlands,
          source: isVidsrc ? 'vidsrc' : 'embed.su',
          needsCleanHeaders: status === 403 && isShadowlands // Flag for proxy to use clean headers
        });
      }
      
      // Secondary target: Direct video URLs
      const isDirectVideo = (responseUrl.includes('.mp4') || 
          responseUrl.includes('.webm') ||
          responseUrl.includes('.mkv') ||
          responseUrl.includes('.ts') ||
          contentType.includes('video/')) && status === 200;
      
      if (isDirectVideo) {
        // Only log when we actually find video streams
        logger.info('📹 FOUND VIDEO STREAM', {
          url: responseUrl,
          headers: {
            'content-type': contentType,
            'content-length': response.headers()['content-length'],
            'referer': response.request().headers()['referer'],
            'origin': response.request().headers()['origin']
          }
        });

        streamUrls.push({
          url: responseUrl,
          headers: response.headers(),
          type: 'direct',
          status: status,
          timestamp: Date.now(),
          priority: 2
        });
      }
      
      // For shadowlandschronicles master playlists, also check any response that might contain playlist content (even 403s)
      if (responseUrl.includes('shadowlandschronicles') && responseUrl.includes('master') && (status === 200 || status === 403) && !isM3U8 && !isDirectVideo) {
        try {
          // Try to read the response text to see if it contains M3U8 content
          const responseText = await response.text();
                      if (responseText.includes('#EXTM3U') || responseText.includes('#EXT-X-')) {
              logger.info('🎯 FOUND M3U8 CONTENT in shadowlandschronicles master response (detected by content)', {
                url: responseUrl,
                contentType,
                contentPreview: responseText.substring(0, 200),
                isMaster: true
              });

                          streamUrls.push({
                url: responseUrl,
                headers: response.headers(),
                type: 'm3u8',
                status: status,
                timestamp: Date.now(),
                priority: 0, // Highest priority for shadowlandschronicles master
                isShadowlands: true,
                source: 'vidsrc',
                detectedBy: 'content',
                isMaster: true
              });
          }
        } catch (textError) {
          // Ignore errors reading response text
        }
      }
      
    } catch (error) {
      // Silently handle response processing errors
    }
  });

  // No periodic stats logging - only log final results

  return {
    streamUrls,
    capturedHeaders,
    cleanup: () => {
      logger.info('Stream interception cleanup completed', {
        totalRequests: interceptedRequests,
        totalResponses: interceptedResponses,
        totalStreamsFound: streamUrls.length,
        headersCaptured: capturedHeaders.size,
        capturedDomains: Array.from(capturedHeaders.keys()).map(key => key.split('_')[0])
      });
    }
  };
}

// Enhanced page interaction - click center of screen approach
async function interactWithPage(page, logger) {
  const startTime = Date.now();
  logger.info('Starting page interactions');

  // Wait for page to fully load
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch (timeoutError) {
    // Proceed anyway if network idle times out
  }

  // Additional wait to ensure all dynamic content is loaded
  await page.waitForTimeout(5000);

  // Get viewport dimensions and calculate center
  const viewport = page.viewportSize();
  const centerX = Math.floor(viewport.width / 2);
  const centerY = Math.floor(viewport.height / 2);

  // More realistic interaction approach
  try {
    // Simulate human-like exploration of the page first
    const explorationMoves = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < explorationMoves; i++) {
      const randomX = Math.random() * viewport.width;
      const randomY = Math.random() * viewport.height;
      await page.mouse.move(randomX, randomY);
      await page.waitForTimeout(100 + Math.random() * 200);
    }
    
    // Move toward center in a curved path
    const currentPos = await page.evaluate(() => ({ x: 0, y: 0 }));
    const steps = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const currentX = currentPos.x + (centerX - currentPos.x) * easeProgress + (Math.random() - 0.5) * 15;
      const currentY = currentPos.y + (centerY - currentPos.y) * easeProgress + (Math.random() - 0.5) * 15;
      await page.mouse.move(currentX, currentY);
      await page.waitForTimeout(30 + Math.random() * 40);
    }
    
    // Pause before clicking (like humans do)
    await page.waitForTimeout(300 + Math.random() * 400);
    
    // Single click with realistic timing
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(800 + Math.random() * 400);
    
    // Only double-click if first click didn't work (check for changes)
    const hasVideoStarted = await page.evaluate(() => {
      const videos = document.querySelectorAll('video');
      return Array.from(videos).some(v => !v.paused);
    });
    
    if (!hasVideoStarted) {
      await page.mouse.click(centerX, centerY);
    }
    
  } catch (clickError) {
    // Ignore click errors
  }

  // Wait for stream requests after click
  await page.waitForTimeout(4000);
  
  // Try additional interaction methods
  try {
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  } catch (keyError) {
    // Ignore keyboard errors
  }

  // Final wait for stream URL extraction
  await page.waitForTimeout(6000);

  // Log page state for debugging
  try {
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        videoElements: document.querySelectorAll('video').length,
        hasPlayButton: !!(document.querySelector('[class*="play"]') || document.querySelector('[id*="play"]')),
        bodyClasses: document.body.className,
        isErrorPage: window.location.href.includes('/error'),
        pageText: document.body.innerText.substring(0, 500) // First 500 chars for debugging
      };
    });
    
    logger.debug('Final page state', pageInfo);
    
    // If we're on an error page, log more details
    if (pageInfo.isErrorPage) {
      logger.warn('Detected error page after interaction', {
        url: pageInfo.url,
        pageText: pageInfo.pageText,
        suggestion: 'embed.su may be blocking automation or content is not available'
      });
    }
  } catch (evalError) {
    logger.debug('Could not evaluate page state', { error: evalError.message });
  }

  logger.timing('Page interactions', startTime);
}

export async function GET(request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const requestStartTime = Date.now();

  logger.info('Stream extraction request started', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  });

  const { searchParams } = new URL(request.url);
  
  // Validate parameters
  const validation = validateParameters(searchParams, logger);
  if (!validation.isValid) {
    logger.error('Parameter validation failed', null, { error: validation.error });
    return NextResponse.json({ 
      success: false,
      error: validation.error,
      requestId 
    }, { status: 400 });
  }

  const { url, mediaType, movieId, seasonId, episodeId, server } = validation.params;

  let browser;
  let context;
  let page;
  let streamInterception;

  try {
    // Launch browser
    const browserStartTime = Date.now();
    logger.info('Launching Playwright browser');
    
    browser = await chromium.launch(getBrowserConfig(logger));
    logger.timing('Browser launch', browserStartTime);

    // Create context
    const contextStartTime = Date.now();
    context = await browser.newContext(getContextConfig(logger, url));
    logger.timing('Context creation', contextStartTime);

    // Create page
    const pageStartTime = Date.now();
    page = await context.newPage();
    logger.timing('Page creation', pageStartTime);

    // Setup stealth measures
    await setupStealthMeasures(page, logger);

    // Setup stream interception
          streamInterception = setupStreamInterception(page, logger, url);

    // Navigate to URL
    const navigationStartTime = Date.now();
    logger.info('Navigating to target URL', { 
      url: url.substring(0, 100) + (url.length > 100 ? '...' : '')
    });

    const response = await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    const navigationStatus = response?.status();
    const finalUrl = response?.url();
    
    logger.info('Navigation completed', {
      status: navigationStatus,
      url: finalUrl,
      timing: Date.now() - navigationStartTime
    });

    // Handle 404 responses - the content might not exist on this server
    if (navigationStatus === 404) {
      logger.warn('Embed URL returned 404 - content not found', {
        requestedUrl: url,
        finalUrl,
        suggestion: 'Content may not be available on embed.su, consider trying Vidsrc.xyz'
      });
      
      // Don't immediately fail, but note this for later
      // Some embed sites still load content dynamically even on 404 pages
    }

    // Check if we already have streams from initial page load (avoid interaction if possible)
    const { streamUrls: initialStreams } = streamInterception;
    if (initialStreams.length > 0) {
      logger.info('Streams already found during page load, skipping interaction to avoid detection', {
        streamsFound: initialStreams.length,
        streamTypes: initialStreams.map(s => s.type)
      });
      
      // Wait a bit more for any additional streams, then proceed without interaction
      await page.waitForTimeout(3000);
    } else {
      // Check for error page before interaction
      const currentUrl = page.url();
      if (currentUrl.includes('/error')) {
        logger.warn('Page redirected to error page, attempting to handle', {
          currentUrl,
          errorDetected: true
        });
        
        // Try to navigate back or handle the error
        try {
          await page.goBack({ waitUntil: 'networkidle', timeout: 10000 });
          await page.waitForTimeout(2000);
        } catch (backError) {
          logger.debug('Could not navigate back from error page', { error: backError.message });
        }
      }

      // Only interact if no streams found yet
      await interactWithPage(page, logger);
    }

    // Get results
    const { streamUrls, capturedHeaders } = streamInterception;
    streamInterception.cleanup();

    // Analyze captured headers for CDN insights
    const headerAnalysis = {
      domains: [],
      refererHeaders: new Set(),
      originHeaders: new Set(),
      totalHeaderSets: capturedHeaders.size
    };

    for (const [key, headerData] of capturedHeaders.entries()) {
      const domain = key.split('_')[0];
      if (!headerAnalysis.domains.includes(domain)) {
        headerAnalysis.domains.push(domain);
      }
      
      if (headerData.referer) {
        headerAnalysis.refererHeaders.add(headerData.referer);
      }
      
      if (headerData.origin) {
        headerAnalysis.originHeaders.add(headerData.origin);
      }
    }

    // Convert Sets to Arrays for JSON serialization
    headerAnalysis.refererHeaders = Array.from(headerAnalysis.refererHeaders);
    headerAnalysis.originHeaders = Array.from(headerAnalysis.originHeaders);

    logger.info('Header analysis completed', {
      domainsDetected: headerAnalysis.domains,
      refererHeaders: headerAnalysis.refererHeaders,
      originHeaders: headerAnalysis.originHeaders,
      totalHeaderSets: headerAnalysis.totalHeaderSets
    });

    logger.info('Stream extraction completed', {
      totalStreamsFound: streamUrls.length,
      streamTypes: streamUrls.map(s => s.type),
      requestDuration: Date.now() - requestStartTime
    });

    // Close browser
    await browser.close();
    logger.info('Browser closed successfully');

    // Process results - prioritize shadowlandschronicles M3U8 playlists
    if (streamUrls.length > 0) {
      // Sort by priority (0 = highest for shadowlandschronicles, 1 = M3U8, 2 = direct video)
      const sortedStreams = streamUrls.sort((a, b) => (a.priority || 99) - (b.priority || 99));
      
      // Prefer shadowlandschronicles M3U8 playlists, then other M3U8, then direct video
      const m3u8Streams = sortedStreams.filter(s => s.type === 'm3u8');
      const shadowlandsStreams = m3u8Streams.filter(s => s.isShadowlands);
      const selectedStream = m3u8Streams.length > 0 ? m3u8Streams[0] : sortedStreams[0];

      logger.info('🎉 Stream extraction successful', {
        selectedStreamType: selectedStream.type,
        selectedStreamUrl: selectedStream.url.substring(0, 100) + (selectedStream.url.length > 100 ? '...' : ''),
        isShadowlands: selectedStream.isShadowlands || false,
        source: selectedStream.source || 'unknown',
        totalOptions: streamUrls.length,
        m3u8Count: m3u8Streams.length,
        shadowlandsCount: shadowlandsStreams.length,
        directVideoCount: sortedStreams.filter(s => s.type === 'direct').length,
        selectionReason: selectedStream.isShadowlands ? 'Shadowlandschronicles M3U8 found' : 
                        m3u8Streams.length > 0 ? 'M3U8 playlist found' : 'Direct video fallback'
      });

      return NextResponse.json({ 
        success: true, 
        streamUrl: selectedStream.url,
        type: selectedStream.type,
        server: server, // Include the server used for extraction
        totalFound: streamUrls.length,
        m3u8Count: m3u8Streams.length,
        requestId,
        timing: {
          totalDuration: Date.now() - requestStartTime,
          timestamp: new Date().toISOString()
        },
        headers: {
          analysis: headerAnalysis,
          captured: Object.fromEntries(
            Array.from(capturedHeaders.entries()).map(([key, value]) => [
              key, 
              {
                ...value,
                url: value.url // Keep shortened URL for logging
              }
            ])
          )
        },
        debug: {
          allStreams: streamUrls.map(s => ({
            type: s.type,
            url: s.url.substring(0, 100) + (s.url.length > 100 ? '...' : ''),
            priority: s.priority,
            isShadowlands: s.isShadowlands || false,
            source: s.source || 'unknown'
          })),
          cdnDomains: headerAnalysis.domains,
          requiredHeaders: {
            referer: headerAnalysis.refererHeaders,
            origin: headerAnalysis.originHeaders
          }
        }
      });
    } else {
      const wasNavigationError = navigationStatus === 404;
      
      logger.warn('No stream URLs found', {
        originalUrl: url,
        mediaType,
        navigationStatus,
        wasNavigationError,
        requestDuration: Date.now() - requestStartTime
      });

      let errorMessage = 'No stream URL found';
      let suggestions = [];
      
      if (wasNavigationError) {
        const isVidsrcUrl = url.includes('vidsrc.xyz');
        errorMessage = isVidsrcUrl ? 'Content not available on vidsrc.xyz' : 'Content not available on embed.su';
        const backupServer = isVidsrcUrl ? 'Embed.su' : 'Vidsrc.xyz';
        suggestions.push(`Try switching to ${backupServer} server`);
        suggestions.push('Content may not be available for this episode');
      } else {
        suggestions.push('Try refreshing or switching servers');
        suggestions.push('Content may still be loading');
      }

      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        suggestions,
        requestId,
        headers: {
          analysis: headerAnalysis,
          captured: Object.fromEntries(
            Array.from(capturedHeaders.entries()).map(([key, value]) => [
              key, 
              {
                ...value,
                url: value.url // Keep shortened URL for logging
              }
            ])
          )
        },
        debug: {
          originalUrl: url,
          mediaType,
          movieId,
          seasonId,
          episodeId,
          navigationStatus,
          streamsFound: 0,
          wasNavigationError,
          cdnDomains: headerAnalysis.domains,
          requiredHeaders: {
            referer: headerAnalysis.refererHeaders,
            origin: headerAnalysis.originHeaders
          },
          timing: {
            totalDuration: Date.now() - requestStartTime,
            timestamp: new Date().toISOString()
          }
        }
      }, { status: wasNavigationError ? 404 : 400 });
    }

  } catch (error) {
    logger.error('Stream extraction failed', error, {
      url,
      mediaType,
      requestDuration: Date.now() - requestStartTime
    });
    
    // Cleanup resources
    try {
      if (streamInterception) {
        streamInterception.cleanup();
      }
      if (page) {
        await page.close();
      }
      if (context) {
        await context.close();
      }
    if (browser) {
        await browser.close();
      }
      logger.info('Resource cleanup completed');
    } catch (cleanupError) {
      logger.error('Error during resource cleanup', cleanupError);
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to extract stream URL',
      details: error.message,
      requestId,
      timing: {
        totalDuration: Date.now() - requestStartTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
} 