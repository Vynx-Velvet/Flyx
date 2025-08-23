import { NextResponse } from 'next/server';

// VM extractor configuration
const VM_EXTRACTOR_URL = process.env.VM_EXTRACTION_URL || process.env.NEXT_PUBLIC_VM_EXTRACTION_URL || 'http://35.188.123.210:3001';
// VidSrc.cc extractor configuration
const VIDSRCCC_EXTRACTOR_URL = process.env.VIDSRCCC_EXTRACTION_URL || 'http://localhost:3002';
// Bulletproof extractor configuration
const BULLETPROOF_EXTRACTOR_URL = process.env.VM_EXTRACTION_URL || process.env.NEXT_PUBLIC_VM_EXTRACTION_URL || 'http://35.188.123.210:3001';

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

// Build VM extractor URL with query parameters
function buildVMUrl(searchParams, logger) {
  const vmUrl = new URL(`${VM_EXTRACTOR_URL}/api/extract/bulletproof`);
  
  // Forward all query parameters to the VM
  const paramsToForward = ['url', 'mediaType', 'movieId', 'seasonId', 'episodeId', 'server'];
  
  paramsToForward.forEach(param => {
    const value = searchParams.get(param);
    if (value) {
      vmUrl.searchParams.set(param, value);
    }
  });

  logger.info('Built VM extractor URL', {
    vmBaseUrl: VM_EXTRACTOR_URL,
    vmFullUrl: vmUrl.toString(),
    forwardedParams: Object.fromEntries(vmUrl.searchParams)
  });

  return vmUrl.toString();
}

// Build VidSrc.cc extractor URL with query parameters
function buildVidSrcCcUrl(searchParams, logger) {
  const vidsrcccUrl = new URL(`${VIDSRCCC_EXTRACTOR_URL}/extract-m3u8`);
  
  // Map parameters to VidSrc.cc extractor format
  const movieId = searchParams.get('movieId');
  const mediaType = searchParams.get('mediaType');
  const seasonId = searchParams.get('seasonId');
  const episodeId = searchParams.get('episodeId');
  
  if (movieId) vidsrcccUrl.searchParams.set('mediaId', movieId);
  if (mediaType) vidsrcccUrl.searchParams.set('mediaType', mediaType);
  if (seasonId) vidsrcccUrl.searchParams.set('season', seasonId);
  if (episodeId) vidsrcccUrl.searchParams.set('episode', episodeId);

  logger.info('Built VidSrc.cc extractor URL', {
    vidsrcccBaseUrl: VIDSRCCC_EXTRACTOR_URL,
    vidsrcccFullUrl: vidsrcccUrl.toString(),
    forwardedParams: Object.fromEntries(vidsrcccUrl.searchParams)
  });

  return vidsrcccUrl.toString();
}

// Build Bulletproof extractor URL with query parameters
function buildBulletproofUrl(searchParams, logger) {
  const bulletproofUrl = new URL(`${BULLETPROOF_EXTRACTOR_URL}/api/extract/bulletproof`);
  
  // Map parameters to Bulletproof extractor format
  const movieId = searchParams.get('movieId');
  const mediaType = searchParams.get('mediaType');
  const seasonId = searchParams.get('seasonId');
  const episodeId = searchParams.get('episodeId');
  
  if (movieId) bulletproofUrl.searchParams.set('tmdbId', movieId);
  if (mediaType === 'tv' && seasonId) bulletproofUrl.searchParams.set('season', seasonId);
  if (mediaType === 'tv' && episodeId) bulletproofUrl.searchParams.set('episode', episodeId);

  logger.info('Built Bulletproof extractor URL', {
    bulletproofBaseUrl: BULLETPROOF_EXTRACTOR_URL,
    bulletproofFullUrl: bulletproofUrl.toString(),
    forwardedParams: Object.fromEntries(bulletproofUrl.searchParams)
  });

  return bulletproofUrl.toString();
}

// Determine which extractor to use based on parameters
function getExtractorType(searchParams) {
  const server = searchParams.get('server');
  const mediaType = searchParams.get('mediaType');
  
  // Use Bulletproof extractor for vidsrc.xyz server
  if (server === 'vidsrc.xyz') {
    return 'bulletproof';
  }
  
  // Use VidSrc.cc extractor for vidsrc.cc content
  if ((server && server.includes('vidsrc')) ||
      (mediaType && (mediaType === 'movie' || mediaType === 'tv'))) {
    return 'vidsrccc';
  }
  
  // Default to VM extractor
  return 'vm';
}

// Main proxy function to handle requests to extractor
export async function GET(request) {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('Proxy request started', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  });

  try {
    // Parse parameters
    const { searchParams } = new URL(request.url);
    const extractorType = getExtractorType(searchParams);
    
    let extractorUrl;
    
    // Use the correct extractor based on the determined type
    switch (extractorType) {
      case 'bulletproof':
        extractorUrl = buildBulletproofUrl(searchParams, logger);
        logger.info('Using Bulletproof extractor', { extractorUrl });
        break;
      case 'vidsrccc':
        extractorUrl = buildVidSrcCcUrl(searchParams, logger);
        logger.info('Using VidSrc.cc extractor', { extractorUrl });
        break;
      default: // 'vm'
        extractorUrl = buildVMUrl(searchParams, logger);
        logger.info('Using VM extractor', { extractorUrl });
        break;
    }
    
    logger.info('Forwarding request to extractor', {
      extractorUrl: extractorUrl.substring(0, 200) + (extractorUrl.length > 200 ? '...' : ''),
      extractorType
    });

    // Forward request to extractor
    const extractorResponse = await fetch(extractorUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': request.headers.get('referer') || '',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache'
      },
      // Set a reasonable timeout for the extractor request
      signal: AbortSignal.timeout(120000) // 2 minutes timeout
    });

    const extractorResponseTime = Date.now() - requestStart;
    logger.timing('Extractor response time', requestStart);

    // Check if extractor responded successfully
    if (!extractorResponse.ok) {
      logger.error('Extractor returned error', null, {
        status: extractorResponse.status,
        statusText: extractorResponse.statusText,
        extractorUrl: extractorUrl.substring(0, 100),
        extractorType
      });

      return NextResponse.json(
        { 
          success: false, 
          error: `${extractorType.toUpperCase()} extractor error: ${extractorResponse.status} ${extractorResponse.statusText}`,
          requestId,
          extractorStatus: extractorResponse.status,
          extractorResponseTime
        },
        { status: extractorResponse.status }
      );
    }

    // Parse extractor response
    const extractorData = await extractorResponse.json();
    
    logger.info('Extractor response received', {
      success: extractorData.success,
      hasStreamUrl: !!extractorData.m3u8Url || !!extractorData.streamUrl,
      extractorType,
      requestId: extractorData.requestId,
      extractorResponseTime
    });

    // Format response based on extractor type
    let formattedResponse;
    if (extractorType === 'bulletproof') {
      // Format Bulletproof response to match expected structure
      formattedResponse = {
        success: extractorData.success,
        streamUrl: extractorData.data?.url || extractorData.url,
        streamType: extractorData.data?.type || extractorData.type || 'shadowlands',
        server: 'vidsrc.xyz',
        extractionMethod: 'bulletproof_puppeteer',
        requiresProxy: true, // Shadowlands URLs don't need proxy
        totalFound: extractorData.data?.url ? 1 : 0,
        m3u8Count: 0, // Shadowlands URL, not m3u8 yet
        subtitles: [],
        requestId: extractorData.requestId || requestId,
        debug: {
          extractorType: 'bulletproof',
          extractorResponseTime,
          source: extractorData.data?.source || 'prorcp',
          metadata: extractorData.data?.metadata || {}
        }
      };
    } else if (extractorType === 'vidsrccc') {
      // Format VidSrc.cc response to match VM response structure
      formattedResponse = {
        success: extractorData.success,
        streamUrl: extractorData.m3u8Url,
        streamType: 'hls',
        server: 'vidsrc.cc',
        extractionMethod: 'puppeteer_scraping',
        requiresProxy: false,
        totalFound: extractorData.m3u8Url ? 1 : 0,
        m3u8Count: extractorData.m3u8Url ? 1 : 0,
        subtitles: [],
        requestId,
        debug: {
          extractorType: 'vidsrccc',
          extractorResponseTime
        }
      };
    } else {
      // Use VM response as-is with added proxy metadata
      formattedResponse = {
        ...extractorData,
        proxy: {
          requestId,
          extractorResponseTime,
          timestamp: new Date().toISOString(),
          extractorUrl: VM_EXTRACTOR_URL 
        }
      };
    }

    // Return the formatted response
    return NextResponse.json(formattedResponse);

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    logger.error('Proxy request failed', error, {
      requestDuration: totalDuration
    });

    // Determine error type for better error messages
    let errorMessage = 'Failed to extract stream';
    let statusCode = 500;

    if (error.name === 'AbortError') {
      errorMessage = 'Extractor timeout - request took too long';
      statusCode = 504;
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Cannot connect to extractor';
      statusCode = 503;
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Extractor is not available';
      statusCode = 503;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        requestId,
        debug: {
          requestDuration: totalDuration,
          errorType: error.name,
          errorMessage: error.message
        }
      },
      { status: statusCode }
    );
  }
}