import { NextResponse } from 'next/server';

// Bulletproof extractor configuration
const BULLETPROOF_EXTRACTOR_URL = process.env.VM_EXTRACTION_URL || 'http://localhost:3001';

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
    }
  };
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Build bulletproof extractor URL with query parameters
function buildBulletproofUrl(searchParams, logger) {
  const bulletproofUrl = new URL(`${BULLETPROOF_EXTRACTOR_URL}/api/extract/bulletproof`);
  
  // Map parameters to Bulletproof extractor format
  const movieId = searchParams.get('movieId');
  const mediaType = searchParams.get('mediaType');
  const seasonId = searchParams.get('seasonId');
  const episodeId = searchParams.get('episodeId');
  const server = searchParams.get('server');
  
  if (movieId) bulletproofUrl.searchParams.set('tmdbId', movieId);
  if (mediaType) bulletproofUrl.searchParams.set('mediaType', mediaType);
  if (mediaType === 'tv' && seasonId) bulletproofUrl.searchParams.set('season', seasonId);
  if (mediaType === 'tv' && episodeId) bulletproofUrl.searchParams.set('episode', episodeId);
  if (server) bulletproofUrl.searchParams.set('server', server);

  logger.info('Built bulletproof extractor SSE URL', {
    bulletproofBaseUrl: BULLETPROOF_EXTRACTOR_URL,
    bulletproofFullUrl: bulletproofUrl.toString(),
    forwardedParams: Object.fromEntries(bulletproofUrl.searchParams)
  });

  return bulletproofUrl.toString();
}

// Create SSE progress events
function createProgressEvent(phase, progress, message, data = {}) {
  return `data: ${JSON.stringify({ phase, progress, message, ...data })}\n\n`;
}

// Server-Sent Events proxy for real-time progress updates
export async function GET(request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info('SSE proxy request started', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  });

  try {
    // Parse parameters
    const { searchParams } = new URL(request.url);
    
    // Use bulletproof extractor for all requests
    return await proxyBulletproofExtractor(request, searchParams, logger, requestId);
  } catch (error) {
    logger.error('SSE proxy initialization failed', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize stream extraction',
        requestId,
        debug: {
          errorType: error.name,
          errorMessage: error.message
        }
      },
      { status: 500 }
    );
  }
}

// Proxy to bulletproof extractor
async function proxyBulletproofExtractor(request, searchParams, logger, requestId) {
  const bulletproofUrl = buildBulletproofUrl(searchParams, logger);

  logger.info('Forwarding request to bulletproof extractor', {
    bulletproofUrl: bulletproofUrl.substring(0, 200) + (bulletproofUrl.length > 200 ? '...' : ''),
    bulletproofBaseUrl: BULLETPROOF_EXTRACTOR_URL
  });

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initializing progress event
        controller.enqueue(createProgressEvent('initializing', 0, 'Starting extraction...'));
        
        // Make request to bulletproof extractor (regular HTTP, not SSE)
        const bulletproofResponse = await fetch(bulletproofUrl, {
          method: 'GET',
          headers: {
            'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          // Set a reasonable timeout for the VM request
          signal: AbortSignal.timeout(180000) // 3 minutes timeout
        });

        // Send progress update
        controller.enqueue(createProgressEvent('processing', 50, 'Processing response...'));

        if (!bulletproofResponse.ok) {
          logger.error('Bulletproof extractor returned error', null, {
            status: bulletproofResponse.status,
            statusText: bulletproofResponse.statusText,
            bulletproofUrl: bulletproofUrl.substring(0, 100)
          });

          // Send error event to client
          const errorData = {
            error: true,
            message: `Bulletproof extractor error: ${bulletproofResponse.status} ${bulletproofResponse.statusText}`,
            phase: 'error',
            progress: 0,
            requestId
          };
          controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
          controller.close();
          return;
        }

        // Parse extractor response
        const extractorData = await bulletproofResponse.json();
        
        logger.info('Extractor response received', {
          success: extractorData.success,
          hasUrl: !!extractorData.data?.url,
          requestId: extractorData.requestId
        });

        // Format Bulletproof response to match frontend expectations
        const formattedResponse = {
          success: extractorData.success,
          streamUrl: extractorData.data?.url,
          streamType: extractorData.data?.type || 'shadowlands',
          server: 'vidsrc.xyz',
          extractionMethod: 'bulletproof_puppeteer',
          requiresProxy: true, // Shadowlands URLs need proxy
          totalFound: extractorData.data?.url ? 1 : 0,
          m3u8Count: 0, // Shadowlands URL, not m3u8 yet
          subtitles: [],
          requestId: extractorData.requestId || requestId,
          debug: {
            extractorType: 'bulletproof',
            source: extractorData.data?.source || 'prorcp',
            metadata: extractorData.data?.metadata || {}
          }
        };

        // Send completion event with formatted response
        controller.enqueue(createProgressEvent('complete', 100, 'Extraction complete', {
          result: formattedResponse
        }));
        
        controller.close();

      } catch (error) {
        logger.error('Bulletproof extractor proxy error', error);

        // Send error event to client
        const errorData = {
          error: true,
          message: error.name === 'AbortError' ? 'Request timeout' : 'Stream extraction failed',
          phase: 'error',
          progress: 0,
          requestId,
          debug: {
            errorType: error.name,
            errorMessage: error.message
          }
        };
        controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
        controller.close();
      }
    }
  });

  // Return Server-Sent Events response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}