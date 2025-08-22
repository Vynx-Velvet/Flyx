import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logging for local debugging
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

// Get browser configuration for local debugging
async function getBrowserConfig(logger) {
  logger.debug('Using local Puppeteer configuration');
  
  return {
    headless: false, // Set to true for headless mode
    devtools: true,  // Open devtools for debugging
    slowMo: 100,     // Slow down operations for debugging
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
  };
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

// Pure fetch-based extraction without Puppeteer
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

// Use pure fetch extraction as the main method
async function extractStream(url, logger) {
  return await pureFetchExtraction(url, logger);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'flyx-extract-stream-local',
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
app.listen(PORT, () => {
  console.log(`🚀 Flyx Extract Stream Service (Local Debug) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Extract endpoint: http://localhost:${PORT}/extract`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/extract-stream`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`� DeQbug mode: ${process.env.NODE_ENV === 'development' ? 'ON' : 'OFF'}`);
  console.log(`\n💡 Quick test commands:`);
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log(`   curl http://localhost:${PORT}/test`);
  console.log(`   curl "http://localhost:${PORT}/extract?mediaType=movie&movieId=550"`);
  console.log(`   curl "http://localhost:${PORT}/extract-stream?mediaType=movie&movieId=550"`);
});