import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logging for extraction service
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

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        finalUrl = `https://vidsrc.xyz/embed/movie/${movieId}/`;
      } else if (mediaType === 'tv' && seasonId && episodeId) {
        finalUrl = `https://vidsrc.xyz/embed/tv/${movieId}/${seasonId}/${episodeId}/`;
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
                          
                          // Try to get the M3U8 URL from the final iframe
                          try {
                            const finalFrame = await finalIframe.contentFrame();
                            if (finalFrame) {
                              // Look for M3U8 URLs in the final frame
                              const m3u8Urls = await finalFrame.evaluate(() => {
                                const urls = [];
                                const scripts = Array.from(document.querySelectorAll('script'));
                                const text = document.body.innerText;
                                
                                // Check scripts for M3U8 URLs
                                scripts.forEach(script => {
                                  if (script.textContent) {
                                    const matches = script.textContent.match(/https?:\/\/[^\s"']*\.m3u8[^\s"']*/gi);
                                    if (matches) {
                                      urls.push(...matches);
                                    }
                                  }
                                });
                                
                                // Check text content for M3U8 URLs
                                const textMatches = text.match(/https?:\/\/[^\s"']*\.m3u8[^\s"']*/gi);
                                if (textMatches) {
                                  urls.push(...textMatches);
                                }
                                
                                return urls;
                              });
                              
                              if (m3u8Urls && m3u8Urls.length > 0) {
                                const m3u8Url = m3u8Urls[0];
                                logger.info('Found M3U8 URL through iframe chain navigation', { url: m3u8Url.substring(0, 100) });
                                return { success: true, m3u8Url, chain: iframeChain };
                              }
                            }
                          } catch (e) {
                            logger.debug('Could not access final iframe content (CORS)', { error: e.message });
                          }
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
    return { success: false, chain: iframeChain, error: 'Could not complete iframe chain navigation' };

  } catch (error) {
    logger.error('Iframe chain navigation failed', error);
    return { success: false, chain: iframeChain, error: error.message };
  }
}

// Pure fetch-based extraction without Puppeteer (primary method)
async function pureFetchExtraction(vidsrcUrl, logger) {
  const extractionStart = Date.now();
  logger.info('Starting pure fetch-based extraction (no Puppeteer)');
  
  try {
    // Step 1: Fetch the vidsrc page to get the cloudnestra/rcp URL
    logger.info('Fetching vidsrc page', { url: vidsrcUrl.substring(0, 100) });
    
    const vidsrcResponse = await fetch(vidsrcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!vidsrcResponse.ok) {
      throw new Error(`Failed to fetch vidsrc page: ${vidsrcResponse.status}`);
    }

    const vidsrcHtml = await vidsrcResponse.text();
    logger.info('Fetched vidsrc page', { size: vidsrcHtml.length });

    // Extract cloudnestra/rcp URL from the HTML
    const cloudnestraPatterns = [
      /src="([^"]*cloudnestra\.com\/rcp[^"]*)"/g,
      /https:\/\/cloudnestra\.com\/rcp\/[^"'\s]+/g,
      /'(https:\/\/cloudnestra\.com\/rcp\/[^']+)'/g,
      /"(https:\/\/cloudnestra\.com\/rcp\/[^"]+)"/g,
      /\/\/cloudnestra\.com\/rcp\/[^"'\s]+/g
    ];

    let cloudnestraUrl = null;
    for (const pattern of cloudnestraPatterns) {
      const matches = vidsrcHtml.match(pattern);
      if (matches) {
        for (const match of matches) {
          let url = match.replace(/src="|"|'/g, '').trim();
          if (url.includes('cloudnestra.com/rcp')) {
            // Add https: if missing
            if (url.startsWith('//')) {
              url = `https:${url}`;
            } else if (!url.startsWith('http')) {
              url = `https://${url}`;
            }
            cloudnestraUrl = url;
            break;
          }
        }
        if (cloudnestraUrl) break;
      }
    }

    if (!cloudnestraUrl) {
      throw new Error('Could not find cloudnestra/rcp URL in vidsrc page');
    }

    logger.info('Found cloudnestra/rcp URL', { url: cloudnestraUrl.substring(0, 100) });

    // Step 2: Fetch the cloudnestra/rcp page to get the prorcp URL
    logger.info('Fetching cloudnestra/rcp page');
    
    const rcpResponse = await fetch(cloudnestraUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': vidsrcUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!rcpResponse.ok) {
      throw new Error(`Failed to fetch rcp page: ${rcpResponse.status}`);
    }

    const rcpHtml = await rcpResponse.text();
    logger.info('Fetched rcp page', { size: rcpHtml.length });

    // Extract prorcp URL from the HTML - it's in the JavaScript code
    const prorcpPatterns = [
      /src:\s*['"]\/prorcp\/([^'"]+)['"]/g,
      /\/prorcp\/[A-Za-z0-9+\/=]+/g,
      /'\/prorcp\/([^']+)'/g,
      /"\/prorcp\/([^"]+)"/g
    ];

    let prorcpUrl = null;
    for (const pattern of prorcpPatterns) {
      const matches = rcpHtml.match(pattern);
      if (matches) {
        for (const match of matches) {
          let url = match.replace(/src:\s*['"]|['"]|src=/g, '').trim();
          if (url.includes('/prorcp/')) {
            // Build full URL
            prorcpUrl = `https://cloudnestra.com${url}`;
            break;
          }
        }
        if (prorcpUrl) break;
      }
    }

    if (!prorcpUrl) {
      throw new Error('Could not find prorcp URL in rcp page');
    }

    logger.info('Found prorcp URL', { url: prorcpUrl.substring(0, 100) });

    // Step 3: Fetch the prorcp page to get the master.m3u8
    logger.info('Fetching prorcp page');
    
    const prorcpResponse = await fetch(prorcpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': cloudnestraUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!prorcpResponse.ok) {
      throw new Error(`Failed to fetch prorcp page: ${prorcpResponse.status}`);
    }

    const prorcpHtml = await prorcpResponse.text();
    logger.info('Fetched prorcp page', { size: prorcpHtml.length });

    // Extract shadowlands URL first, then m3u8 URL from the HTML
    const shadowlandsPatterns = [
      /https?:\/\/[^"'\s]*shadowlandschronicles\.com[^"'\s]*/g,
      /"(https?:\/\/[^"]*shadowlandschronicles\.com[^"]*)"/g,
      /'(https?:\/\/[^']*shadowlandschronicles\.com[^']*)'/g,
      /src="([^"]*shadowlandschronicles\.com[^"]*)"/g
    ];

    let shadowlandsUrl = null;
    for (const pattern of shadowlandsPatterns) {
      const matches = prorcpHtml.match(pattern);
      if (matches) {
        for (const match of matches) {
          let url = match.replace(/['"]/g, '').replace(/src=/g, '').trim();
          if (url.includes('shadowlandschronicles.com')) {
            if (url.startsWith('//')) {
              url = `https:${url}`;
            }
            shadowlandsUrl = url;
            break;
          }
        }
        if (shadowlandsUrl) break;
      }
    }

    let finalStreamUrl = null;

    if (shadowlandsUrl) {
      logger.info('Found shadowlands URL, fetching for m3u8', { url: shadowlandsUrl.substring(0, 100) });
      
      // Fetch the shadowlands page to get the m3u8
      try {
        const shadowlandsResponse = await fetch(shadowlandsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': prorcpUrl,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        });

        if (shadowlandsResponse.ok) {
          const shadowlandsHtml = await shadowlandsResponse.text();
          logger.info('Fetched shadowlands page', { size: shadowlandsHtml.length });

          // Look for m3u8 in shadowlands response
          const m3u8Patterns = [
            /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
            /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
            /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
            /file:\s*["']([^"']*\.m3u8[^"']*)/g,
            /source:\s*["']([^"']*\.m3u8[^"']*)/g
          ];

          for (const pattern of m3u8Patterns) {
            const matches = shadowlandsHtml.match(pattern);
            if (matches) {
              for (const match of matches) {
                let url = match.replace(/['"]/g, '').replace(/file:|source:/g, '').trim();
                if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
                  if (url.startsWith('//')) {
                    url = `https:${url}`;
                  }
                  finalStreamUrl = url;
                  break;
                }
              }
              if (finalStreamUrl) break;
            }
          }
        }
      } catch (e) {
        logger.warn('Failed to fetch shadowlands URL', { error: e.message });
      }
    }

    // If no shadowlands URL or m3u8 found, look directly in prorcp HTML
    if (!finalStreamUrl) {
      const m3u8Patterns = [
        /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
        /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
        /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
        /src="([^"]*\.m3u8[^"]*)"/g,
        /file:\s*["']([^"']*\.m3u8[^"']*)/g,
        /source:\s*["']([^"']*\.m3u8[^"']*)/g,
        /url:\s*["']([^"']*\.m3u8[^"']*)/g
      ];

      for (const pattern of m3u8Patterns) {
        const matches = prorcpHtml.match(pattern);
        if (matches) {
          for (const match of matches) {
            let url = match.replace(/['"]/g, '').replace(/src=|file:|source:|url:/g, '').trim();
            if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
              if (url.startsWith('//')) {
                url = `https:${url}`;
              }
              finalStreamUrl = url;
              break;
            }
          }
          if (finalStreamUrl) break;
        }
      }
    }

    let m3u8Url = finalStreamUrl;

    if (!m3u8Url) {
      throw new Error('Could not find m3u8 URL in prorcp page');
    }

    logger.info('Found m3u8 URL', { url: m3u8Url });

    // Step 4: Verify the m3u8 URL is accessible
    try {
      const m3u8Response = await fetch(m3u8Url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': prorcpUrl
        }
      });

      logger.info('m3u8 URL verification', { status: m3u8Response.status, accessible: m3u8Response.ok });
    } catch (e) {
      logger.warn('Could not verify m3u8 URL accessibility', { error: e.message });
    }

    const extractionTime = Date.now() - extractionStart;
    logger.info('Pure fetch extraction completed', { duration: extractionTime });

    return {
      success: true,
      streamUrl: m3u8Url,
      streamType: 'hls',
      server: 'vidsrc.xyz',
      extractionMethod: 'pure_fetch',
      requiresProxy: true,
      debug: {
        cloudnestraUrl: cloudnestraUrl.substring(0, 100),
        prorcpUrl: prorcpUrl.substring(0, 100),
        m3u8Url: m3u8Url.substring(0, 100),
        extractionTime
      }
    };

  } catch (error) {
    const extractionTime = Date.now() - extractionStart;
    logger.error('Pure fetch extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: 'pure_fetch',
      debug: {
        extractionTime
      }
    };
  }
}

// Puppeteer-based extraction as backup method
async function puppeteerExtraction(vidsrcUrl, logger) {
  const extractionStart = Date.now();
  logger.info('Starting puppeteer-based extraction (backup method)');
  
  let browser = null;
  
  try {
    // Launch browser with stealth configuration
    logger.info('Launching browser with stealth configuration');
    browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging the about:blank issue
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    logger.info('Created new page');

    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
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

    // Advanced stealth measures
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });

      // Remove automation flags
      ['__nightmare', '__phantomas', '__fxdriver_unwrapped', '__driver_evaluate', '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped', '_phantom', '__phantom', '_selenium', 'callPhantom', 'callSelenium', '_Selenium_IDE_Recorder'].forEach(prop => {
        delete window[prop];
      });

      // Mock chrome object
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
    });

    // Enable request interception for debugging
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });

    // Capture page content before potential redirects
    let capturedHtml = '';
    let capturedUrl = '';
    
    // Listen for navigation events to capture content before redirect
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        logger.info('Frame navigated', { url });
        
        // If we're about to go to about:blank, capture current content first
        if (url === 'about:blank') {
          logger.warn('About to navigate to about:blank, capturing current content');
        }
      }
    });

    // Ensure the html-captures directory exists
    const captureDir = path.join(process.cwd(), 'html-captures');
    if (!fs.existsSync(captureDir)) {
      fs.mkdirSync(captureDir, { recursive: true });
    }

    // Promise to resolve when we find an M3U8 URL
    const m3u8Promise = new Promise((resolve, reject) => {
      // Set a timeout to reject if no M3U8 is found
      const timeout = setTimeout(() => {
        reject(new Error("Timeout: No M3U8 URL found"));
      }, 30000); // 30 second timeout
      
      // Listen for network responses
      page.on('response', async (response) => {
        const url = response.url();
        
        // Check if this is an M3U8 URL
        if (url.includes('.m3u8')) {
          clearTimeout(timeout);
          resolve(url);
        }
        
        // Capture HTML content for debugging
        if (response.headers()['content-type'] && response.headers()['content-type'].includes('text/html')) {
          try {
            const html = await response.text();
            if (html.length > 1000) { // Only capture substantial HTML content
              capturedHtml = html;
              capturedUrl = url;
              logger.info('Captured HTML content from response', { url, size: html.length });
              
              // Save HTML content to file for inspection
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `html-capture-${timestamp}.html`;
              const filepath = path.join(captureDir, filename);
              
              fs.writeFileSync(filepath, html, 'utf8');
              logger.info('Saved HTML capture to file', { filepath, url });
            }
          } catch (e) {
            logger.debug('Could not capture HTML from response', { error: e.message });
          }
        }
      });
    });

    // Navigate to vidsrc.xyz
    logger.info('Navigating to vidsrc page', { url: vidsrcUrl });
    await page.goto(vidsrcUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    logger.info('Page loaded');

    // Capture page content immediately after loading
    try {
      capturedHtml = await page.content();
      capturedUrl = page.url();
      logger.info('Captured page HTML content', { url: capturedUrl, size: capturedHtml.length });
    } catch (e) {
      logger.warn('Could not capture page content', { error: e.message });
    }

    // Wait for the page to load and try to find M3U8 URLs
    try {
      const m3u8Url = await m3u8Promise;
      logger.info('Found M3U8 URL through network monitoring', { url: m3u8Url });
      
      const extractionTime = Date.now() - extractionStart;
      return {
        success: true,
        streamUrl: m3u8Url,
        streamType: 'hls',
        server: 'vidsrc.xyz',
        extractionMethod: 'puppeteer',
        requiresProxy: true,
        debug: {
          extractionTime,
          capturedUrl: capturedUrl.substring(0, 100)
        }
      };
    } catch (error) {
      logger.warn('Network monitoring timeout, trying content extraction', { error: error.message });
    }

    // If we didn't find M3U8 URLs through network monitoring,
    // try to extract from page content
    logger.info('Trying to extract M3U8 URL from page content...');
    
    // Use captured HTML content if available, otherwise get current content
    let htmlContent = capturedHtml;
    if (!htmlContent || htmlContent.length < 1000) {
      try {
        htmlContent = await page.content();
        logger.info('Using current page content', { size: htmlContent.length });
      } catch (e) {
        logger.warn('Could not get current page content', { error: e.message });
        htmlContent = '';
      }
    } else {
      logger.info('Using previously captured HTML content', { size: htmlContent.length });
    }
    
    // Save HTML content to file for debugging (optional)
    if (htmlContent && htmlContent.length > 0) {
      logger.info('HTML content available for analysis', { size: htmlContent.length });
    }
    
    // Try to get M3U8 URLs from JavaScript variables
    if (htmlContent) {
      const jsM3u8Matches = htmlContent.match(/['"](?:https?:)?\/\/[^\s"']+\.m3u8[^\s"']*['"]/gi);
      if (jsM3u8Matches && jsM3u8Matches.length > 0) {
        logger.info('Found M3U8 URLs in JavaScript', { count: jsM3u8Matches.length });
        // Clean up the URLs (remove quotes)
        const rawUrl = jsM3u8Matches[0].replace(/['"]/g, '');
        const extractionTime = Date.now() - extractionStart;
        return {
          success: true,
          streamUrl: rawUrl,
          streamType: 'hls',
          server: 'vidsrc.xyz',
          extractionMethod: 'puppeteer_content',
          requiresProxy: true,
          debug: {
            extractionTime,
            capturedUrl: capturedUrl.substring(0, 100)
          }
        };
      }
    }

    // Try iframe chain navigation approach
    logger.info('Trying iframe chain navigation approach...');
    const iframeResult = await navigateIframeChain(page, logger);
    if (iframeResult.success && iframeResult.m3u8Url) {
      const extractionTime = Date.now() - extractionStart;
      return {
        success: true,
        streamUrl: iframeResult.m3u8Url,
        streamType: 'hls',
        server: 'vidsrc.xyz',
        extractionMethod: 'puppeteer_iframe',
        requiresProxy: true,
        debug: {
          extractionTime,
          capturedUrl: capturedUrl.substring(0, 100),
          iframeChain: iframeResult.chain
        }
      };
    }

    throw new Error("No M3U8 URLs found through puppeteer extraction");

  } catch (error) {
    const extractionTime = Date.now() - extractionStart;
    logger.error('Puppeteer extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: 'puppeteer',
      debug: {
        extractionTime
      }
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.info('Browser closed');
      } catch (closeError) {
        logger.warn('Error closing browser', { error: closeError.message });
      }
    }
  }
}

// Main extraction function that tries pure fetch first, then falls back to puppeteer
async function extractStream(url, logger) {
  logger.info('Starting stream extraction with pure fetch method');
  
  // Try pure fetch extraction first
  const fetchResult = await pureFetchExtraction(url, logger);
  
  if (fetchResult.success) {
    logger.info('Pure fetch extraction successful');
    return fetchResult;
  }
  
  logger.warn('Pure fetch extraction failed, falling back to puppeteer', { error: fetchResult.error });
  
  // If pure fetch fails, try puppeteer as backup
  const puppeteerResult = await puppeteerExtraction(url, logger);
  
  if (puppeteerResult.success) {
    logger.info('Puppeteer extraction successful');
    return puppeteerResult;
  }
  
  logger.error('Both extraction methods failed');
  return puppeteerResult; // Return the puppeteer error result
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'flyx-vm-extractor',
    version: '1.0.0'
  });
});

// Main extraction endpoint
app.get('/extract', async (req, res) => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('Extraction request received', { query: req.query });

  try {
    // Validate parameters
    const validation = validateParameters(req.query, logger);
    if (!validation.isValid) {
      logger.error('Parameter validation failed', null, { error: validation.error });
      return res.status(400).json({
        success: false,
        error: validation.error,
        requestId
      });
    }

    const { url } = validation.params;

    // Extract stream
    const result = await extractStream(url, logger);

    logger.info('Extraction completed', { 
      success: result.success,
      hasStreamUrl: !!result.streamUrl 
    });

    res.json({
      ...result,
      requestId
    });

  } catch (error) {
    logger.error('Unexpected error during extraction', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId
    });
  }
});

// Server-Sent Events endpoint for real-time progress (required by frontend)
app.get('/extract-stream', async (req, res) => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('SSE extraction request received', { query: req.query });

  // Set up Server-Sent Events headers
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
      progress: percentage, // Frontend expects 'progress' field
      message,
      timestamp: new Date().toISOString(),
      requestId,
      ...data
    };
    
    res.write(`data: ${JSON.stringify(progressData)}\n\n`);
    logger.info(`Progress: ${phase} (${percentage}%) - ${message}`);
  }

  try {
    sendProgress('initializing', 5, 'Starting stream extraction service');

    // Validate parameters
    const validation = validateParameters(req.query, logger);
    if (!validation.isValid) {
      sendProgress('error', 0, validation.error);
      res.write(`data: ${JSON.stringify({ success: false, error: validation.error, requestId })}\n\n`);
      return res.end();
    }

    const { url } = validation.params;

    sendProgress('connecting', 15, 'Initializing extraction');
    sendProgress('navigating', 35, 'Fetching video page');
    sendProgress('bypassing', 50, 'Processing video sources');
    sendProgress('extracting', 75, 'Extracting stream URL');

    // Extract stream
    const result = await extractStream(url, logger);

    if (result.success) {
      sendProgress('complete', 100, 'Stream extraction successful');
      
      const finalResult = {
        success: true,
        streamUrl: result.streamUrl,
        streamInfo: {
          source: result.server || 'vidsrc.xyz',
          quality: 'auto',
          type: 'hls',
          requiresProxy: result.requiresProxy || false
        },
        debug: {
          extractionMethod: result.extractionMethod,
          extractionTime: result.debug?.extractionTime,
          requestId
        }
      };

      res.write(`data: ${JSON.stringify(finalResult)}\n\n`);
    } else {
      sendProgress('error', 100, `Extraction failed: ${result.error}`);
      res.write(`data: ${JSON.stringify({ 
        success: false, 
        error: result.error,
        debug: { extractionMethod: result.extractionMethod, requestId }
      })}\n\n`);
    }

  } catch (error) {
    logger.error('SSE extraction failed', error);
    
    sendProgress('error', 100, `Extraction failed: ${error.message}`);
    res.write(`data: ${JSON.stringify({ 
      success: false, 
      error: error.message,
      debug: { requestId }
    })}\n\n`);
  } finally {
    res.end();
  }
});

// Test endpoint for quick debugging
app.get('/test', async (req, res) => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('Test extraction request');
  
  try {
    // Test with Fight Club
    const result = await extractStream('https://vidsrc.xyz/embed/movie?tmdb=550', logger);
    
    res.json({
      ...result,
      requestId,
      testUrl: 'https://vidsrc.xyz/embed/movie?tmdb=550',
      testMovie: 'Fight Club (1999)'
    });
    
  } catch (error) {
    logger.error('Test extraction failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Flyx VM Extractor Service running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 Extract endpoint: http://0.0.0.0:${PORT}/extract`);
  console.log(`📡 SSE endpoint: http://0.0.0.0:${PORT}/extract-stream`);
  console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/test`);
});