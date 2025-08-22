import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

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

// Extract CloudNestra URL from VidSrc HTML
function extractCloudNestraUrl(html, logger) {
  logger.info('Extracting CloudNestra URL from VidSrc HTML...');

  // Look for iframe with cloudnestra.com src
  // Updated patterns to handle encoded URLs and longer paths
  const patterns = [
    // Match iframe with cloudnestra.com/rcp src, allowing for encoded characters and spaces
    /<iframe[^>]*src\s*=\s*["']([^"']*cloudnestra\.com\/rcp[^"']*)["'][^>]*>/gi,
    // Match src attribute with cloudnestra.com/rcp, allowing for encoded characters
    /src\s*=\s*["']([^"']*cloudnestra\.com\/rcp[^\s"']*)/gi,
    // Match URLs with encoded characters
    /https:\/\/cloudnestra\.com\/rcp\/[^\s"'>]*/gi,
    // Match URLs that might be in quotes
    /["'](https:\/\/cloudnestra\.com\/rcp\/[^"']*)["']/gi,
    // Match URLs that might be in single quotes
    /'(https:\/\/cloudnestra\.com\/rcp\/[^']*)'/gi,
    // Match URLs that might be in double quotes
    /"(https:\/\/cloudnestra\.com\/rcp\/[^"]*)"/gi,
    // Match protocol-relative URLs
    /\/\/cloudnestra\.com\/rcp\/[^\s"'>]*/gi
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Extract URL from match, handling different match formats
        let url = match;
        
        // If the match is the full iframe tag, extract just the src
        if (match.includes('<iframe')) {
          const srcMatch = match.match(/src\s*=\s*["']([^"']*)["']/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        }
        // If the match contains quotes, extract content between them
        else if (match.match(/^["'][^]*["']$/)) {
          url = match.substring(1, match.length - 1);
        }
        
        // Clean up the URL
        url = url.trim();
        
        if (url.includes('cloudnestra.com/rcp')) {
          // Add https: if missing
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (!url.startsWith('http')) {
            url = `https://${url}`;
          }
          
          // Remove any trailing iframe attributes that might have been captured
          // Handle both %3E (URL encoded >) and regular > characters
          const urlEndIndex = url.indexOf('%3E');
          const urlEndIndex2 = url.indexOf('>');
          if (urlEndIndex > 0) {
            url = url.substring(0, urlEndIndex);
          } else if (urlEndIndex2 > 0) {
            url = url.substring(0, urlEndIndex2);
          }
          
          // Also remove any trailing iframe attributes that come after the URL
          // These are typically space-separated attributes like frameborder, scrolling, etc.
          if (url.includes('%20')) {
            // Split by %20 (URL encoded space) and take only the first part (the actual URL)
            url = url.split('%20')[0];
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

  // Look for ProRCP URL patterns
  const patterns = [
    // jQuery iframe creation pattern (specifically looking for the pattern in the task)
    /\$\(\'<iframe>\'[\s\S]*?src:\s*\'(\/prorcp\/[^\']+)\'/g,
    // Standard iframe src pattern
    /src:\s*['"]\/prorcp\/([^'"]+)['"]/g,
    // Base64-like prorcp paths
    /\/prorcp\/[A-Za-z0-9+\/=]+/g,
    // prorcp paths in single quotes
    /'\/prorcp\/([^']+)'/g,
    // prorcp paths in double quotes
    /"\/prorcp\/([^"]+)"/g,
    // iframe with prorcp src
    /iframe[^>]*src\s*=\s*["']([^"']*prorcp[^"']*)["']/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1] || match[0]; // Use captured group if available
      
      // If we have a captured group (match[1]), use that as it's the clean URL
      // Otherwise, we need to clean up the match
      if (!match[1]) {
        // Handle jQuery iframe pattern specifically
        if (pattern.toString().includes("jQuery") || pattern.toString().includes("<iframe>")) {
          // Extract just the src value from the match
          const srcMatch = url.match(/src:\s*'([^']+)'/);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        } else {
          // Handle other patterns
          url = url.replace(/src:\s*['"]|['"]|src=|iframe[^>]*src\s*=\s*["']|["']/gi, '').trim();
        }
      }
      
      // Check if we have a prorcp URL
      if (url.includes('/prorcp/')) {
        // Build full URL if needed
        if (!url.startsWith('http')) {
          // Check if it's an absolute path or relative
          if (url.startsWith('/')) {
            url = `https://cloudnestra.com${url}`;
          } else {
            url = `https://cloudnestra.com/${url}`;
          }
        }
        logger.info('Found ProRCP URL:', url);
        return url;
      }
    }
  }

  logger.error('ProRCP URL not found in CloudNestra HTML');
  return null;
}

// Extract Shadowlands/Stream URL from ProRCP HTML
export function extractStreamUrl(html, logger) {
  logger.info('Extracting Stream URL from ProRCP HTML...');

  // Look for Shadowlands or M3U8 URLs
  const patterns = [
    // Player initialization patterns (like Playerjs)
    /new\s+Playerjs\s*\([^)]*file\s*:\s*['"]([^'"]+shadowlandschronicles[^'"]+)['"]/gi,
    /player\s*=\s*new\s+Playerjs\s*\([^)]*file\s*:\s*['"]([^'"]+shadowlandschronicles[^'"]+)['"]/gi,
    /new\s+Playerjs\s*\([^)]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]+)['"]/gi,
    /player\s*=\s*new\s+Playerjs\s*\([^)]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]+)['"]/gi,
    // Standard URL patterns
    /https?:\/\/[^"'\s]*shadowlandschronicles\.com[^"'\s]*/g,
    /"(https?:\/\/[^"]*shadowlandschronicles\.com[^"]*)"/g,
    /'(https?:\/\/[^']*shadowlandschronicles\.com[^']*)'/g,
    /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
    /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
    /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
    /file:\s*["']([^"']*\.m3u8[^"']*)/g,
    /source:\s*["']([^"']*\.m3u8[^"']*)/g,
    // Additional pattern for file parameter in player config
    /file\s*:\s*"([^"]+shadowlandschronicles[^"]+)"/g,
    /file\s*:\s*'([^']+shadowlandschronicles[^']+)'/g,
    /file\s*:\s*"([^"]+\.m3u8[^"]+)"/g,
    /file\s*:\s*'([^']+\.m3u8[^']+)'/g
  ];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(html)) !== null) {
      let url = match[1] || match[0]; // Use captured group if available
      
      // Clean up the URL
      url = url.replace(/['"]/g, '').replace(/file:|source:/g, '').trim();
      
      // Check if it's a valid stream URL
      if ((url.includes('shadowlandschronicles.com') || url.includes('.m3u8')) && url.startsWith('http')) {
        logger.info('Found Stream URL:', url);
        return url;
      }
    }
  }

  // Also try to find player initialization code and extract URL
  const playerInitPattern = /new\s+Playerjs\s*\(\s*{[^}]*file\s*:\s*['"]([^'"]+)['"]/gi;
  let playerMatch;
  while ((playerMatch = playerInitPattern.exec(html)) !== null) {
    const url = playerMatch[1];
    if ((url.includes('shadowlandschronicles.com') || url.includes('.m3u8')) && url.startsWith('http')) {
      logger.info('Found Stream URL in player init:', url);
      return url;
    }
  }

  logger.error('Stream URL not found in ProRCP HTML');
  return null;
}

// Save HTML capture to file
async function saveHtmlCapture(html, stage, url, logger) {
  try {
    const captureDir = path.join(process.cwd(), 'html-captures');
    if (!fs.existsSync(captureDir)) {
      fs.mkdirSync(captureDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${stage}-capture-${timestamp}.html`;
    const filepath = path.join(captureDir, filename);
    
    // Add metadata comment at the top of the HTML
    const htmlWithMetadata = `<!-- 
Capture Stage: ${stage}
URL: ${url}
Timestamp: ${new Date().toISOString()}
Size: ${html.length} bytes
-->
${html}`;
    
    fs.writeFileSync(filepath, htmlWithMetadata, 'utf8');
    logger.info(`Saved ${stage} HTML capture`, { filepath, url, size: html.length });
    
    return filepath;
  } catch (error) {
    logger.error(`Failed to save ${stage} HTML capture`, error);
    return null;
  }
}

// Enhanced Puppeteer extraction with HTML chain navigation
async function puppeteerHtmlChainExtraction(vidsrcUrl, logger) {
  const extractionStart = Date.now();
  logger.info('Starting enhanced Puppeteer HTML chain extraction');
  
  let browser = null;
  
  try {
    // Launch browser with stealth configuration
    logger.info('Launching browser with stealth configuration');
    browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        '--window-size=1920,1080',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection'
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

    // Store the HTML chain
    const htmlChain = [];
    let finalStreamUrl = null;

    // Step 1: Navigate to VidSrc page
    logger.info('Step 1: Navigating to VidSrc page', { url: vidsrcUrl });
    await page.goto(vidsrcUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    logger.info('VidSrc page loaded, waiting for content...');
    
    // Wait for iframe or specific content to appear
    try {
      await page.waitForSelector('iframe', { timeout: 15000 });
      logger.info('Found iframe on VidSrc page');
    } catch (e) {
      logger.warn('No iframe found, waiting for any content...', { error: e.message });
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Wait a bit more for any JavaScript to finish loading
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Capture VidSrc HTML
    let vidsrcHtml = await page.content();
    logger.info('Captured VidSrc HTML', { size: vidsrcHtml.length });
    
    // Check if page is empty
    if (vidsrcHtml.length < 100) {
      logger.warn('VidSrc page appears to be empty or blocked', { htmlSnippet: vidsrcHtml.substring(0, 200) });
      
      // Try to reload the page
      logger.info('Attempting to reload the page...');
      await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const reloadedHtml = await page.content();
      logger.info('Captured HTML after reload', { size: reloadedHtml.length });
      
      if (reloadedHtml.length > vidsrcHtml.length) {
        vidsrcHtml = reloadedHtml;
      }
    }
    
    await saveHtmlCapture(vidsrcHtml, 'vidsrc', vidsrcUrl, logger);
    htmlChain.push({ stage: 'vidsrc', url: vidsrcUrl, htmlSize: vidsrcHtml.length });

    // Extract CloudNestra URL from VidSrc HTML
    const cloudnestraUrl = extractCloudNestraUrl(vidsrcHtml, logger);
    
    if (!cloudnestraUrl) {
      throw new Error('Failed to extract CloudNestra URL from VidSrc HTML');
    }

    // Step 2: Navigate to CloudNestra RCP page
    logger.info('Step 2: Navigating to CloudNestra RCP page', { url: cloudnestraUrl });
    await page.goto(cloudnestraUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    logger.info('CloudNestra RCP page loaded');

    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Capture initial CloudNestra RCP HTML
    let cloudnestraHtml = await page.content();
    logger.info('Captured initial CloudNestra RCP HTML', { size: cloudnestraHtml.length });
    await saveHtmlCapture(cloudnestraHtml, 'cloudnestra-rcp-initial', cloudnestraUrl, logger);
    
    // Check for Cloudflare Turnstile challenge
    if (cloudnestraHtml.includes('cf-turnstile') || cloudnestraHtml.includes('turnstile')) {
      logger.info('Detected Cloudflare Turnstile challenge, waiting for resolution...');
      
      try {
        // Wait for the challenge to be solved and page content to change
        // Monitor for changes in the #the_frame div or disappearance of turnstile
        await page.waitForFunction(
          () => {
            const frame = document.getElementById('the_frame');
            const turnstile = document.querySelector('.cf-turnstile');
            // Wait for either frame to have content or turnstile to be hidden/solved
            return (frame && frame.innerHTML.trim() !== '') ||
                   (turnstile && (turnstile.style.display === 'none' ||
                                 turnstile.getAttribute('data-solved') === 'true'));
          },
          { timeout: 30000 } // 30 second timeout for challenge resolution
        );
        
        logger.info('Turnstile challenge appears to be resolved, waiting for content...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Re-capture HTML after challenge resolution
        cloudnestraHtml = await page.content();
        logger.info('Captured CloudNestra HTML after Turnstile resolution', { size: cloudnestraHtml.length });
        await saveHtmlCapture(cloudnestraHtml, 'cloudnestra-rcp-after-turnstile', cloudnestraUrl, logger);
        
      } catch (challengeError) {
        logger.warn('Turnstile challenge resolution timeout or failed', { error: challengeError.message });
        // Continue with the current HTML anyway
      }
    }
    
    htmlChain.push({ stage: 'cloudnestra-rcp', url: cloudnestraUrl, htmlSize: cloudnestraHtml.length });

    // Check if we need to click a play button
    try {
      const playButton = await page.$('#pl_but, .fas.fa-play, button[class*="play"]');
      if (playButton) {
        logger.info('Found play button, clicking it');
        await playButton.click();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time
        
        // Capture updated HTML after clicking play
        const updatedHtml = await page.content();
        await saveHtmlCapture(updatedHtml, 'cloudnestra-rcp-after-play', cloudnestraUrl, logger);
        cloudnestraHtml = updatedHtml; // Use the updated HTML
      }
    } catch (e) {
      logger.debug('No play button found or could not click', { error: e.message });
    }

    // Final HTML capture
    const cloudnestraHtmlFinal = await page.content();
    if (cloudnestraHtmlFinal !== cloudnestraHtml) {
      await saveHtmlCapture(cloudnestraHtmlFinal, 'cloudnestra-rcp-final', cloudnestraUrl, logger);
    }
    
    // Extract ProRCP URL from CloudNestra HTML
    const prorcpUrl = extractProRcpUrl(cloudnestraHtmlFinal, logger);
    
    if (prorcpUrl) {
      // Step 3: Navigate to ProRCP page
      logger.info('Step 3: Navigating to ProRCP page', { url: prorcpUrl });
      await page.goto(prorcpUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      logger.info('ProRCP page loaded');
  
      // Wait a bit for any dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Capture ProRCP HTML
      const prorcpHtml = await page.content();
      logger.info('Captured ProRCP HTML', { size: prorcpHtml.length });
      await saveHtmlCapture(prorcpHtml, 'prorcp', prorcpUrl, logger);
      htmlChain.push({ stage: 'prorcp', url: prorcpUrl, htmlSize: prorcpHtml.length });

      // Extract Stream URL from ProRCP HTML
      finalStreamUrl = extractStreamUrl(prorcpHtml, logger);

      // If we found a Shadowlands URL but not M3U8, navigate to it
      if (!finalStreamUrl || (finalStreamUrl && finalStreamUrl.includes('shadowlandschronicles') && !finalStreamUrl.includes('.m3u8'))) {
        const shadowlandsUrl = finalStreamUrl;
        if (shadowlandsUrl) {
          logger.info('Step 4: Navigating to Shadowlands page', { url: shadowlandsUrl });
          await page.goto(shadowlandsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          logger.info('Shadowlands page loaded');
      
          // Wait a bit for any dynamic content to load
          await new Promise(resolve => setTimeout(resolve, 5000));
      
          // Capture Shadowlands HTML
          const shadowlandsHtml = await page.content();
          logger.info('Captured Shadowlands HTML', { size: shadowlandsHtml.length });
          await saveHtmlCapture(shadowlandsHtml, 'shadowlands', shadowlandsUrl, logger);
          htmlChain.push({ stage: 'shadowlands', url: shadowlandsUrl, htmlSize: shadowlandsHtml.length });

          // Extract M3U8 URL from Shadowlands HTML
          finalStreamUrl = extractStreamUrl(shadowlandsHtml, logger);
        }
      }
    } else {
      logger.warn('Could not extract ProRCP URL, checking for direct stream URLs in CloudNestra HTML');
      // Try to find stream URL directly in CloudNestra HTML
      finalStreamUrl = extractStreamUrl(cloudnestraHtmlFinal, logger);
      
      if (!finalStreamUrl) {
        // If we still can't find a stream URL, use the CloudNestra RCP URL itself as the stream URL
        // This handles cases where the RCP URL is the final stream URL
        logger.info('Using CloudNestra RCP URL as stream URL');
        finalStreamUrl = cloudnestraUrl;
      }
    }

    // Also monitor network for M3U8 URLs as backup
    const m3u8Urls = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.m3u8')) {
        m3u8Urls.push(url);
        logger.info('Detected M3U8 URL in network', { url });
      }
    });

    // If we didn't find a stream URL through HTML parsing, check network captures
    if (!finalStreamUrl && m3u8Urls.length > 0) {
      finalStreamUrl = m3u8Urls[0];
      logger.info('Using M3U8 URL from network monitoring', { url: finalStreamUrl });
    }

    if (finalStreamUrl) {
      const extractionTime = Date.now() - extractionStart;
      logger.info('HTML chain extraction successful', { 
        streamUrl: finalStreamUrl,
        chainLength: htmlChain.length,
        extractionTime 
      });

      return {
        success: true,
        streamUrl: finalStreamUrl,
        streamType: 'hls',
        server: 'vidsrc.xyz',
        extractionMethod: 'puppeteer_html_chain',
        requiresProxy: true,
        debug: {
          htmlChain,
          extractionTime
        }
      };
    } else {
      throw new Error('No stream URL found through HTML chain extraction');
    }

  } catch (error) {
    const extractionTime = Date.now() - extractionStart;
    logger.error('Puppeteer HTML chain extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: 'puppeteer_html_chain',
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

// Pure fetch-based extraction (same as before)
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

    // Extract cloudnestra URL
    const cloudnestraUrl = extractCloudNestraUrl(vidsrcHtml, logger);
    
    if (!cloudnestraUrl) {
      throw new Error('Could not find cloudnestra/rcp URL in vidsrc page');
    }

    // Step 2: Fetch the cloudnestra/rcp page
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

    // Extract prorcp URL
    const prorcpUrl = extractProRcpUrl(rcpHtml, logger);
    
    let streamUrl = null;
    
    if (prorcpUrl) {
      // Step 3: Fetch the prorcp page
      logger.info('Fetching prorcp page');
      
      const prorcpResponse = await fetch(prorcpUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': cloudnestraUrl,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      if (!prorcpResponse.ok) {
        throw new Error(`Failed to fetch prorcp page: ${prorcpResponse.status}`);
      }

      const prorcpHtml = await prorcpResponse.text();
      logger.info('Fetched prorcp page', { size: prorcpHtml.length });

      // Extract stream URL
      streamUrl = extractStreamUrl(prorcpHtml, logger);
      
      if (!streamUrl) {
        throw new Error('Could not find stream URL in prorcp page');
      }
    } else {
      logger.warn('Could not extract prorcp URL, checking for direct stream URLs in rcp page');
      // Try to find stream URL directly in CloudNestra HTML
      streamUrl = extractStreamUrl(rcpHtml, logger);
      
      if (!streamUrl) {
        // If we still can't find a stream URL, use the CloudNestra RCP URL itself as the stream URL
        // This handles cases where the RCP URL is the final stream URL
        logger.info('Using CloudNestra RCP URL as stream URL');
        streamUrl = cloudnestraUrl;
      }
    }

    const extractionTime = Date.now() - extractionStart;
    logger.info('Pure fetch extraction completed', { duration: extractionTime });

    return {
      success: true,
      streamUrl: streamUrl,
      streamType: 'hls',
      server: 'vidsrc.xyz',
      extractionMethod: 'pure_fetch',
      requiresProxy: true,
      debug: {
        cloudnestraUrl: cloudnestraUrl.substring(0, 100),
        prorcpUrl: prorcpUrl ? prorcpUrl.substring(0, 100) : null,
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

// Main extraction function that tries pure fetch first, then falls back to puppeteer
async function extractStream(url, logger, method = 'auto') {
  logger.info('Starting stream extraction', { method });
  
  if (method === 'fetch' || method === 'auto') {
    // Try pure fetch extraction first
    const fetchResult = await pureFetchExtraction(url, logger);
    
    if (fetchResult.success) {
      logger.info('Pure fetch extraction successful');
      return fetchResult;
    }
    
    if (method === 'fetch') {
      // If specifically requested fetch only, return the error
      return fetchResult;
    }
    
    logger.warn('Pure fetch extraction failed, falling back to puppeteer', { error: fetchResult.error });
  }
  
  if (method === 'puppeteer' || method === 'auto') {
    // Use enhanced Puppeteer HTML chain extraction
    const puppeteerResult = await puppeteerHtmlChainExtraction(url, logger);
    
    if (puppeteerResult.success) {
      logger.info('Puppeteer HTML chain extraction successful');
      return puppeteerResult;
    }
    
    logger.error('Puppeteer extraction failed');
    return puppeteerResult;
  }
  
  return {
    success: false,
    error: `Invalid extraction method: ${method}`,
    extractionMethod: method
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'flyx-vm-extractor-enhanced',
    version: '2.0.0',
    methods: ['auto', 'fetch', 'puppeteer']
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
    const method = req.query.method || 'auto'; // auto, fetch, or puppeteer

    // Extract stream
    const result = await extractStream(url, logger, method);

    logger.info('Extraction completed', { 
      success: result.success,
      hasStreamUrl: !!result.streamUrl,
      method: result.extractionMethod
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
    const method = req.query.method || 'auto';

    sendProgress('connecting', 15, 'Initializing extraction');
    sendProgress('navigating', 35, 'Fetching video page');
    sendProgress('bypassing', 50, 'Processing video sources');
    sendProgress('extracting', 75, 'Extracting stream URL');

    // Extract stream
    const result = await extractStream(url, logger, method);

    if (result.success) {
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
          htmlChain: result.debug?.htmlChain,
          requestId
        }
      };
      
      // Send completion data in the format expected by the media player
      const completionData = {
        phase: 'complete',
        percentage: 100,
        progress: 100,
        message: 'Stream extraction successful',
        timestamp: new Date().toISOString(),
        requestId,
        result: finalResult
      };
      
      res.write(`data: ${JSON.stringify(completionData)}\n\n`);
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
    const result = await extractStream('https://vidsrc.xyz/embed/movie/550', logger, 'puppeteer');
    
    res.json({
      ...result,
      requestId,
      testUrl: 'https://vidsrc.xyz/embed/movie/550',
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
  console.log(`🚀 Flyx VM Extractor Enhanced Service running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 Extract endpoint: http://0.0.0.0:${PORT}/extract`);
  console.log(`📡 SSE endpoint: http://0.0.0.0:${PORT}/extract-stream`);
  console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/test`);
  console.log(`\n✨ Enhanced Features:`);
  console.log(`   - HTML Chain Navigation: VidSrc → CloudNestra → ProRCP → Shadowlands`);
  console.log(`   - HTML Capture Saving: All stages saved to html-captures/`);
  console.log(`   - Dual Method Support: Pure fetch (fast) or Puppeteer (comprehensive)`);
});