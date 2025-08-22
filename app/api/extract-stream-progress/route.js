import { NextResponse } from 'next/server';

// Unified VM extractor configuration - Handles all extraction types
const VM_EXTRACTOR_URL = process.env.VM_EXTRACTION_URL || 'http://localhost:3001';

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

// Build unified VM extractor URL with query parameters
function buildVMUrl(searchParams, logger) {
  const vmUrl = new URL(`${VM_EXTRACTOR_URL}/api/extract/bulletproof`);

  // Forward all query parameters to the unified VM extractor
  const paramsToForward = ['url', 'mediaType', 'movieId', 'seasonId', 'episodeId', 'server', 'method'];

  paramsToForward.forEach(param => {
    const value = searchParams.get(param);
    if (value) {
      vmUrl.searchParams.set(param, value);
    }
  });

  logger.info('Built unified VM extractor SSE URL', {
    vmBaseUrl: VM_EXTRACTOR_URL,
    vmFullUrl: vmUrl.toString(),
    forwardedParams: Object.fromEntries(vmUrl.searchParams)
  });

  return vmUrl.toString();
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
    
    // Use unified VM extractor for all requests
    return await proxyUnifiedVMExtractor(request, searchParams, logger, requestId);
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

// Proxy to unified VM extractor
async function proxyUnifiedVMExtractor(request, searchParams, logger, requestId) {
  const vmUrl = buildVMUrl(searchParams, logger);

  logger.info('Forwarding SSE request to unified VM extractor', {
    vmUrl: vmUrl.substring(0, 200) + (vmUrl.length > 200 ? '...' : ''),
    vmBaseUrl: VM_EXTRACTOR_URL
  });

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Forward request to VM extractor's SSE streaming endpoint
        const vmResponse = await fetch(vmUrl, {
          method: 'GET',
          headers: {
            'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
          },
          // Set a reasonable timeout for the VM request
          signal: AbortSignal.timeout(180000) // 3 minutes timeout for streaming
        });

        if (!vmResponse.ok) {
          logger.error('Unified VM extractor returned error', null, {
            status: vmResponse.status,
            statusText: vmResponse.statusText,
            vmUrl: vmUrl.substring(0, 100)
          });

          // Send error event to client
          const errorData = JSON.stringify({
            error: true,
            message: `VM extractor error: ${vmResponse.status} ${vmResponse.statusText}`,
            phase: 'error',
            progress: 0,
            requestId
          });
          controller.enqueue(`data: ${errorData}\n\n`);
          controller.close();
          return;
        }

        // Stream the response from VM extractor to client
        const reader = vmResponse.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              logger.info('Unified VM extractor stream completed');
              break;
            }

            // Decode and forward the chunk
            const chunk = decoder.decode(value, { stream: true });

            // Log progress updates for debugging
            if (chunk.includes('data:')) {
              try {
                const dataMatch = chunk.match(/data: (.+)/);
                if (dataMatch) {
                  const progressData = JSON.parse(dataMatch[1]);
                  logger.debug('Progress update', {
                    phase: progressData.phase,
                    progress: progressData.progress || progressData.percentage,
                    message: progressData.message
                  });
                }
              } catch (e) {
                // Ignore JSON parse errors for progress logging
              }
            }

            // Forward the chunk to the client
            controller.enqueue(chunk);
          }
        } finally {
          reader.releaseLock();
        }

        controller.close();

      } catch (error) {
        logger.error('Unified VM extractor SSE proxy stream error', error);

        // Send error event to client
        const errorData = JSON.stringify({
          error: true,
          message: error.name === 'AbortError' ? 'Request timeout' : 'Stream extraction failed',
          phase: 'error',
          progress: 0,
          requestId,
          debug: {
            errorType: error.name,
            errorMessage: error.message
          }
        });
        controller.enqueue(`data: ${errorData}\n\n`);
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