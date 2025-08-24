import { NextResponse } from 'next/server';

/**
 * Shadowlands Direct Extraction API
 * Uses simple HTTP requests (like Insomnia) to extract streaming URLs
 * Chain: VidSrc → CloudNestra → ProRCP → Shadowlands
 */

// Utility function for logging
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
    }
  };
}

// Generate unique request ID
function generateRequestId() {
  return `shadowlands_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
            url = `https:${url}`;
          } else if (!url.startsWith('http')) {
            url = `https://${url}`;
          }
          
          const urlEndIndex = url.search(/(%3E|>|%20|\s)/);
          if (urlEndIndex > 0) {
            url = url.substring(0, urlEndIndex);
          }
          
          logger.info('Found CloudNestra URL', { url });
          return url;
        }
      }
    }
  }
  
  logger.error('CloudNestra URL not found in VidSrc HTML');
  return null;
}

// Extract ProRCP URL from CloudNestra HTML
function extractProRcpUrl(html, logger) {
  logger.info('Extracting ProRCP URL from CloudNestra HTML...');
  
  const patterns = [
    // jQuery iframe creation with src: '/prorcp/...'
    /\$\(['"]<iframe['"]\s*,\s*\{[^}]*src:\s*['"]([^'"]*prorcp[^'"]+)['"]/gi,
    /src:\s*['"]\/prorcp\/([^'"]+)['"]/gi,
    /src:\s*['"]([^'"]*\/prorcp\/[^'"]+)['"]/gi,
    
    // Direct iframe tags
    /<iframe[^>]*src\s*=\s*["']([^"']*prorcp[^"']*)["'][^>]*>/gi,
    /iframe\.src\s*=\s*["']([^"']*prorcp[^'"]*)['"]/gi,
    
    // Generic patterns for ProRCP URLs
    /\/prorcp\/[A-Za-z0-9+\/=]+/g,
    /['"]\/prorcp\/([^'"]+)['"]/g,
    /["']([^'"]*prorcp[^'"]+)['"]/g
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const matches = html.match(pattern);
    
    if (matches && matches.length > 0) {
      logger.info(`Pattern ${i + 1} found ${matches.length} match(es)`);
      
      for (const match of matches) {
        let url = match;
        
        // Extract from jQuery iframe syntax
        if (match.includes('$') || match.includes('src:')) {
          const srcMatch = match.match(/src:\s*['"]([^'"]+)['"]/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        }
        // Extract from iframe tag
        else if (match.includes('<iframe')) {
          const srcMatch = match.match(/src\s*=\s*["']([^"']*)["']/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        }
        // Remove quotes if present
        else if (match.match(/^["'][^]*["']$/)) {
          url = match.substring(1, match.length - 1);
        }
        
        url = url.trim();
        
        // Check if it's a ProRCP URL
        if (url.includes('prorcp')) {
          // Clean up the URL
          if (!url.startsWith('/') && !url.startsWith('http')) {
            url = '/' + url;
          }
          
          logger.info('Found ProRCP path', { url: url.substring(0, 50) + '...' });
          return url;
        }
      }
    }
  }
  
  logger.error('ProRCP URL not found in CloudNestra HTML');
  return null;
}

// Extract Shadowlands URL from ProRCP HTML
function extractShadowlandsUrl(html, logger) {
  logger.info('Extracting Shadowlands URL from ProRCP HTML...');
  
  const patterns = [
    // Playerjs file parameter - most common pattern
    /new\s+Playerjs\s*\([^)]*file\s*:\s*['"]([^'"]*shadowlands[^'"]+\.m3u8[^'"]*)['"]/gi,
    /\bfile\s*:\s*['"]([^'"]*shadowlands[^'"]+\.m3u8[^'"]*)['"]/gi,
    
    // Direct shadowlands URLs
    /https?:\/\/[^\s"'<>]*shadowlands[^\s"'<>]*\.m3u8[^\s"'<>]*/gi,
    /['"]([^'"]*shadowlands[^'"]*\.m3u8[^'"]*)['"]/gi,
    
    // Player configurations
    /player[^{]*\{[^}]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /source\s*:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/gi,
    /src\s*:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/gi,
    
    // Any m3u8 URL (fallback)
    /['"]([^'"]*\.m3u8[^'"]*)['"]/gi,
    /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const matches = html.match(pattern);
    
    if (matches && matches.length > 0) {
      logger.info(`Pattern ${i + 1} found ${matches.length} match(es)`);
      
      for (const match of matches) {
        let url = match;
        
        // Extract URL from Playerjs syntax
        if (match.includes('Playerjs') || match.includes('file')) {
          const fileMatch = match.match(/file\s*:\s*['"]([^'"]+)['"]/i);
          if (fileMatch && fileMatch[1]) {
            url = fileMatch[1];
          }
        }
        // Extract URL from source/src
        else if (match.includes('source') || match.includes('src')) {
          const srcMatch = match.match(/(?:source|src)\s*:\s*['"]([^'"]+)['"]/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        }
        // Remove quotes if present
        else if (match.match(/^["'][^]*["']$/)) {
          url = match.substring(1, match.length - 1);
        }
        
        url = url.trim();
        
        // Check if it's a valid stream URL
        if (url.includes('.m3u8')) {
          // Ensure it's a full URL
          if (!url.startsWith('http')) {
            if (url.startsWith('//')) {
              url = `https:${url}`;
            } else if (url.startsWith('/')) {
              url = `https://tmstr2.shadowlandschronicles.com${url}`;
            } else {
              url = `https://${url}`;
            }
          }
          
          logger.info('Found Shadowlands URL', { url: url.substring(0, 80) + '...' });
          return url;
        }
      }
    }
  }
  
  logger.error('Shadowlands URL not found in ProRCP HTML');
  return null;
}

// Main extraction function
async function extractShadowlandsChain(tmdbId, season, episode, requestId) {
  const logger = createLogger(requestId);
  const startTime = Date.now();
  
  try {
    // Build VidSrc URL
    let vidsrcUrl;
    if (season && episode) {
      vidsrcUrl = `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`;
    } else {
      vidsrcUrl = `https://vidsrc.xyz/embed/movie/${tmdbId}`;
    }
    
    logger.info('Starting extraction chain', { vidsrcUrl, tmdbId, season, episode });
    
    // Step 1: Fetch VidSrc
    logger.info('Step 1: Fetching VidSrc page');
    const vidsrcResponse = await fetch(vidsrcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!vidsrcResponse.ok) {
      throw new Error(`VidSrc returned ${vidsrcResponse.status}: ${vidsrcResponse.statusText}`);
    }
    
    const vidsrcHtml = await vidsrcResponse.text();
    logger.info('VidSrc HTML received', { bytes: vidsrcHtml.length });
    
    // Step 2: Extract CloudNestra URL
    const cloudNestraUrl = extractCloudNestraUrl(vidsrcHtml, logger);
    if (!cloudNestraUrl) {
      throw new Error('CloudNestra URL not found in VidSrc HTML');
    }
    
    // Step 3: Fetch CloudNestra
    logger.info('Step 3: Fetching CloudNestra page');
    const cloudNestraResponse = await fetch(cloudNestraUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': vidsrcUrl
      }
    });
    
    if (!cloudNestraResponse.ok) {
      throw new Error(`CloudNestra returned ${cloudNestraResponse.status}: ${cloudNestraResponse.statusText}`);
    }
    
    const cloudNestraHtml = await cloudNestraResponse.text();
    logger.info('CloudNestra HTML received', { bytes: cloudNestraHtml.length });
    
    // Step 4: Extract ProRCP URL
    const proRcpPath = extractProRcpUrl(cloudNestraHtml, logger);
    if (!proRcpPath) {
      throw new Error('ProRCP URL not found in CloudNestra HTML');
    }
    
    const proRcpUrl = proRcpPath.startsWith('http') 
      ? proRcpPath 
      : `https://cloudnestra.com${proRcpPath}`;
    
    // Step 5: Fetch ProRCP
    logger.info('Step 5: Fetching ProRCP page');
    const proRcpResponse = await fetch(proRcpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': cloudNestraUrl
      }
    });
    
    if (!proRcpResponse.ok) {
      throw new Error(`ProRCP returned ${proRcpResponse.status}: ${proRcpResponse.statusText}`);
    }
    
    const proRcpHtml = await proRcpResponse.text();
    logger.info('ProRCP HTML received', { bytes: proRcpHtml.length });
    
    // Step 6: Extract Shadowlands URL
    const shadowlandsUrl = extractShadowlandsUrl(proRcpHtml, logger);
    if (!shadowlandsUrl) {
      throw new Error('Shadowlands URL not found in ProRCP HTML');
    }
    
    const duration = Date.now() - startTime;
    logger.info('Extraction chain complete', { duration, shadowlandsUrl });
    
    return {
      success: true,
      streamUrl: shadowlandsUrl,
      streamType: 'hls',
      server: 'shadowlands',
      extractionMethod: 'direct_http',
      requiresProxy: true,
      chain: {
        vidsrc: vidsrcUrl,
        cloudnestra: cloudNestraUrl,
        prorcp: proRcpUrl,
        shadowlands: shadowlandsUrl
      },
      metadata: {
        tmdbId,
        season,
        episode,
        duration,
        requestId
      }
    };
    
  } catch (error) {
    logger.error('Extraction failed', error);
    throw error;
  }
}

// GET handler
export async function GET(request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const startTime = Date.now();
  
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId') || searchParams.get('movieId');
    const season = searchParams.get('season') || searchParams.get('seasonId');
    const episode = searchParams.get('episode') || searchParams.get('episodeId');
    
    // Validate required parameters
    if (!tmdbId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: tmdbId or movieId',
          requestId
        },
        { status: 400 }
      );
    }
    
    logger.info('Extraction request received', {
      tmdbId,
      season,
      episode,
      timestamp: new Date().toISOString()
    });
    
    // Perform extraction
    const result = await extractShadowlandsChain(tmdbId, season, episode, requestId);
    
    // Return successful response
    return NextResponse.json(result);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Request failed', error, { duration });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        requestId,
        duration
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}