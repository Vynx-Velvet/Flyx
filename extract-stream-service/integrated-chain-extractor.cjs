/**
 * Integrated HTML Chain Extractor Service
 * Combines pure fetch approach with Puppeteer fallback for maximum reliability
 */

const HtmlChainExtractor = require('./html-chain-extractor.cjs');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logging for chain extractor service
function createLogger(requestId) {
  const prefix = `[CHAIN-${requestId}]`;
  
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

// Pure fetch-based extraction (faster, no browser needed)
async function pureFetchExtraction(vidsrcUrl, logger) {
  const extractionStart = Date.now();
  logger.info('Starting pure fetch-based HTML chain extraction');
  
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

    // Extract prorcp URL from the HTML
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

    // Step 3: Fetch the prorcp page to get the shadowlands/stream URL
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

    // If shadowlands URL found, fetch it to get the m3u8
    if (shadowlandsUrl) {
      logger.info('Found shadowlands URL, fetching for m3u8', { url: shadowlandsUrl.substring(0, 100) });
      
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

    if (!finalStreamUrl) {
      throw new Error('Could not find m3u8 URL in prorcp page');
    }

    logger.info('Found final stream URL', { url: finalStreamUrl });

    // Verify the m3u8 URL is accessible
    try {
      const m3u8Response = await fetch(finalStreamUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': prorcpUrl
        }
      });

      logger.info('M3U8 URL verification', { status: m3u8Response.status, accessible: m3u8Response.ok });
    } catch (e) {
      logger.warn('Could not verify m3u8 URL accessibility', { error: e.message });
    }

    const extractionTime = Date.now() - extractionStart;
    logger.info('Pure fetch HTML chain extraction completed', { duration: extractionTime });

    return {
      success: true,
      streamUrl: finalStreamUrl,
      streamType: 'hls',
      server: 'vidsrc.xyz',
      extractionMethod: 'html_chain_fetch',
      requiresProxy: true,
      debug: {
        cloudnestraUrl: cloudnestraUrl.substring(0, 100),
        prorcpUrl: prorcpUrl.substring(0, 100),
        shadowlandsUrl: shadowlandsUrl ? shadowlandsUrl.substring(0, 100) : 'none',
        m3u8Url: finalStreamUrl.substring(0, 100),
        extractionTime
      }
    };

  } catch (error) {
    const extractionTime = Date.now() - extractionStart;
    logger.error('Pure fetch HTML chain extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: 'html_chain_fetch',
      debug: {
        extractionTime
      }
    };
  }
}

// Puppeteer-based extraction (fallback method)
async function puppeteerExtraction(vidsrcUrl, logger) {
  const extractor = new HtmlChainExtractor({
    headless: false,
    captureHtml: true,
    timeout: 45000
  });

  try {
    const result = await extractor.extractStream(vidsrcUrl);
    return {
      ...result,
      extractionMethod: 'html_chain_puppeteer'
    };
  } catch (error) {
    logger.error('Puppeteer HTML chain extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: 'html_chain_puppeteer'
    };
  } finally {
    await extractor.close();
  }
}

// Main extraction function with fallback chain
async function extractStream(url, method = 'auto', logger) {
  logger.info('Starting integrated HTML chain extraction', { url: url.substring(0, 100), method });

  let result = null;

  // Method 1: Pure fetch (fastest)
  if (method === 'auto' || method === 'fetch') {
    logger.info('Attempting pure fetch HTML chain extraction');
    result = await pureFetchExtraction(url, logger);
    
    if (result.success) {
      logger.info('✅ Pure fetch extraction successful');
      return result;
    } else {
      logger.warn('❌ Pure fetch extraction failed:', result.error);
    }
  }

  // Method 2: Puppeteer fallback (if fetch failed)
  if ((method === 'auto' || method === 'puppeteer') && (!result || !result.success)) {
    logger.info('Attempting Puppeteer HTML chain extraction as fallback');
    result = await puppeteerExtraction(url, logger);
    
    if (result.success) {
      logger.info('✅ Puppeteer extraction successful');
      return result;
    } else {
      logger.warn('❌ Puppeteer extraction failed:', result.error);
    }
  }

  // If both methods failed
  return result || {
    success: false,
    error: 'All extraction methods failed',
    extractionMethod: 'integrated_chain_failed'
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'flyx-html-chain-extractor',
    version: '1.0.0',
    methods: ['fetch', 'puppeteer', 'auto']
  });
});

// Main extraction endpoint
app.get('/extract', async (req, res) => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('HTML Chain extraction request received', { query: req.query });

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
    const method = req.query.method || 'auto'; // auto, fetch, puppeteer

    // Extract stream using integrated chain extractor
    const result = await extractStream(url, method, logger);

    logger.info('HTML Chain extraction completed', { 
      success: result.success,
      hasStreamUrl: !!result.streamUrl,
      method: result.extractionMethod 
    });

    res.json({
      ...result,
      requestId
    });

  } catch (error) {
    logger.error('Unexpected error during HTML chain extraction', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId
    });
  }
});

// Server-Sent Events endpoint for real-time progress
app.get('/extract-stream', async (req, res) => {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('SSE HTML Chain extraction request received', { query: req.query });

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
      progress: percentage,
      message,
      timestamp: new Date().toISOString(),
      requestId,
      ...data
    };
    
    res.write(`data: ${JSON.stringify(progressData)}\n\n`);
    logger.info(`Progress: ${phase} (${percentage}%) - ${message}`);
  }

  try {
    sendProgress('initializing', 5, 'Starting HTML chain extraction service');

    // Validate parameters
    const validation = validateParameters(req.query, logger);
    if (!validation.isValid) {
      sendProgress('error', 0, validation.error);
      res.write(`data: ${JSON.stringify({ success: false, error: validation.error, requestId })}\n\n`);
      return res.end();
    }

    const { url } = validation.params;
    const method = req.query.method || 'auto';

    sendProgress('connecting', 15, 'Initializing HTML chain extraction');
    sendProgress('navigating', 25, 'Fetching VidSrc embed page');
    
    // Extract stream with progress updates
    const result = await extractStream(url, method, logger);

    if (result.success) {
      sendProgress('extracting', 75, 'Extracting stream URLs from HTML chain');
      sendProgress('complete', 100, 'HTML chain extraction successful');
      
      const finalResult = {
        success: true,
        streamUrl: result.streamUrl,
        streamInfo: {
          source: 'vidsrc.xyz',
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
      sendProgress('error', 100, `HTML chain extraction failed: ${result.error}`);
      res.write(`data: ${JSON.stringify({ 
        success: false, 
        error: result.error,
        debug: { extractionMethod: result.extractionMethod, requestId }
      })}\n\n`);
    }

  } catch (error) {
    logger.error('SSE HTML chain extraction failed', error);
    
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Flyx HTML Chain Extractor running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Extract endpoint: http://localhost:${PORT}/extract`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/extract-stream`);
  console.log(`\n💡 Quick test commands:`);
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log(`   curl "http://localhost:${PORT}/extract?mediaType=movie&movieId=550&method=fetch"`);
  console.log(`   curl "http://localhost:${PORT}/extract-stream?mediaType=movie&movieId=550&method=auto"`);
});

module.exports = app;