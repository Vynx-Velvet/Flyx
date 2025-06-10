import { NextResponse } from 'next/server';

// VM extractor configuration
const VM_EXTRACTOR_URL = process.env.VM_EXTRACTOR_URL || 'http://35.188.123.210:3001';

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
  const vmUrl = new URL(`${VM_EXTRACTOR_URL}/extract`);
  
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

// Main proxy function to handle requests to VM extractor
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
    // Parse parameters and build VM URL
    const { searchParams } = new URL(request.url);
    const vmUrl = buildVMUrl(searchParams, logger);
    
    logger.info('Forwarding request to VM extractor', {
      vmUrl: vmUrl.substring(0, 200) + (vmUrl.length > 200 ? '...' : ''),
      vmBaseUrl: VM_EXTRACTOR_URL
    });

    // Forward request to VM extractor
    const vmResponse = await fetch(vmUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': request.headers.get('referer') || '',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache'
      },
      // Set a reasonable timeout for the VM request
      signal: AbortSignal.timeout(120000) // 2 minutes timeout
    });

    const vmResponseTime = Date.now() - requestStart;
    logger.timing('VM extractor response time', requestStart);

    // Check if VM responded successfully
    if (!vmResponse.ok) {
      logger.error('VM extractor returned error', null, {
        status: vmResponse.status,
        statusText: vmResponse.statusText,
        vmUrl: vmUrl.substring(0, 100)
      });

      return NextResponse.json(
        { 
          success: false, 
          error: `VM extractor error: ${vmResponse.status} ${vmResponse.statusText}`,
          requestId,
          vmStatus: vmResponse.status,
          vmResponseTime
        },
        { status: vmResponse.status }
      );
    }

    // Parse VM response
    const vmData = await vmResponse.json();
    
    logger.info('VM extractor response received', {
      success: vmData.success,
      hasStreamUrl: !!vmData.streamUrl,
      server: vmData.server,
      totalFound: vmData.totalFound,
      requestId: vmData.requestId,
      vmResponseTime,
      hasSubtitles: !!vmData.subtitles,
      subtitleCount: vmData.subtitleCount || 0,
      hasEnglishSubtitles: !!vmData.englishSubtitles
    });

    // Add proxy metadata to response
    const proxyResponse = {
      ...vmData,
      proxy: {
        requestId,
        vmResponseTime,
        timestamp: new Date().toISOString(),
        vmUrl: VM_EXTRACTOR_URL
      }
    };

    // Return the VM response data
    return NextResponse.json(proxyResponse);

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    logger.error('Proxy request failed', error, {
      requestDuration: totalDuration,
      vmUrl: VM_EXTRACTOR_URL
    });

    // Determine error type for better error messages
    let errorMessage = 'Failed to extract stream';
    let statusCode = 500;

    if (error.name === 'AbortError') {
      errorMessage = 'VM extractor timeout - request took too long';
      statusCode = 504;
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Cannot connect to VM extractor';
      statusCode = 503;
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'VM extractor is not available';
      statusCode = 503;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        requestId,
        debug: {
          requestDuration: totalDuration,
          vmUrl: VM_EXTRACTOR_URL,
          errorType: error.name,
          errorMessage: error.message
        }
      },
      { status: statusCode }
    );
  }
} 