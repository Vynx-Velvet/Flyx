import { NextResponse } from 'next/server';

// Enhanced rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map();
const connectionPool = new Map();

// Active logger for stream-proxy debugging
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
      console.log(`[${requestId}] DEBUG: ${message}`, JSON.stringify(data, null, 2));
    },
    timing: (label, startTime) => {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] TIMING: ${label} took ${duration}ms`);
      return duration;
    }
  };
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 1000, // Increased to 1000 requests per minute per IP
  blockDuration: 5 * 60 * 1000, // Block for 5 minutes if exceeded
  lightningboltMaxRequests: 2000 // Special higher limit for lightningbolt URLs
};

// STABLE Retry configuration - patient and non-aggressive
const RETRY_CONFIG = {
  maxRetries: 1,         // Only 1 retry to avoid interruptions
  baseDelay: 3000,       // 3 seconds base delay
  maxDelay: 5000,        // 5 seconds max delay
  backoffFactor: 1       // No exponential backoff
};

// STABLE Connection configuration - longer timeouts for stability
const CONNECTION_POOL_CONFIG = {
  maxConnections: 100,
  keepAliveTimeout: 60000,  // 60 seconds keepalive
  timeout: 60000            // 60 seconds request timeout for patience
};

// Generate unique request ID (simplified)
function generateRequestId() {
  return `proxy_${Date.now()}`;
}

// Enhanced rate limiting
function checkRateLimit(clientIp, logger, isLightningbolt = false) {
  const now = Date.now();
  const clientKey = `rate_${clientIp}`;
  
  // Determine the appropriate rate limit based on URL type
  const maxRequests = isLightningbolt ?
    RATE_LIMIT_CONFIG.lightningboltMaxRequests :
    RATE_LIMIT_CONFIG.maxRequests;
  
  if (!rateLimitStore.has(clientKey)) {
    rateLimitStore.set(clientKey, {
      requests: 1,
      windowStart: now,
      blocked: false,
      blockUntil: 0
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  const clientData = rateLimitStore.get(clientKey);
  
  // Check if client is currently blocked
  if (clientData.blocked && now < clientData.blockUntil) {
    logger.warn('Rate limit blocked request', {
      clientIp,
      blockedUntil: new Date(clientData.blockUntil).toISOString(),
      remainingBlockTime: clientData.blockUntil - now
    });
    return {
      allowed: false,
      blocked: true,
      retryAfter: Math.ceil((clientData.blockUntil - now) / 1000)
    };
  }
  
  // Reset window if expired
  if (now - clientData.windowStart > RATE_LIMIT_CONFIG.windowMs) {
    clientData.requests = 1;
    clientData.windowStart = now;
    clientData.blocked = false;
    clientData.blockUntil = 0;
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  // Check if limit exceeded
  if (clientData.requests >= maxRequests) {
    clientData.blocked = true;
    clientData.blockUntil = now + RATE_LIMIT_CONFIG.blockDuration;
    logger.warn('Rate limit exceeded', {
      clientIp,
      requests: clientData.requests,
      windowStart: new Date(clientData.windowStart).toISOString(),
      blockedUntil: new Date(clientData.blockUntil).toISOString(),
      isLightningbolt
    });
    return {
      allowed: false,
      blocked: true,
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.blockDuration / 1000)
    };
  }
  
  // Increment request count
  clientData.requests++;
  return {
    allowed: true,
    remaining: maxRequests - clientData.requests
  };
}

// Enhanced request validation
function validateRequest(request, logger) {
  const userAgent = request.headers.get('user-agent');
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Basic bot detection
  if (!userAgent || userAgent.length < 10) {
    logger.warn('Suspicious request - invalid user agent', { userAgent });
    return { isValid: false, error: 'Invalid user agent' };
  }
  
  // Check for common bot patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    logger.warn('Suspicious request - bot detected', { userAgent });
    return { isValid: false, error: 'Automated requests not allowed' };
  }
  
  return { isValid: true };
}

// SIMPLIFIED fetch with minimal retries for stability
async function fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, strategyIndex = 0, retryCount = 0) {
  // Check if this is a shadowlands URL
  const isShadowlands = source === 'shadowlands' ||
                       source === 'vidsrc' ||  // vidsrc source is used for shadowlands
                       url.includes('shadowlandschronicles') ||
                       url.includes('shadowlands') ||
                       url.includes('tmstr');
  
  let options;
  
  if (isShadowlands) {
    // For shadowlands URLs, fetch directly without any header modifications
    logger.info('Fetching shadowlands URL directly without header modifications', {
      url: url.substring(0, 100)
    });
    
    options = {
      ...baseOptions,
      // Only preserve range header if present, no other headers
      headers: baseOptions.headers?.Range ? { 'Range': baseOptions.headers.Range } : {}
    };
  } else {
    // Use simplified headers for non-shadowlands URLs
    const headers = getSimplifiedHeaders(url, userAgent, source);
    
    options = {
      ...baseOptions,
      headers: {
        ...headers,
        // Preserve range header if present
        ...(baseOptions.headers?.Range && { 'Range': baseOptions.headers.Range })
      }
    };
  }
  
  try {
    logger.debug('Fetch attempt', {
      url: url.substring(0, 100),
      retryCount: retryCount,
      isShadowlands: isShadowlands,
      headers: Object.keys(options.headers || {})
    });
    
    const response = await fetch(url, options);
    
    // If response is successful, return it
    if (response.ok) {
      logger.info('Fetch successful', {
        status: response.status,
        contentType: response.headers.get('content-type')
      });
      return response;
    }
    
    // Only retry server errors once
    const isRetryableError = response.status >= 500;
    
    if (isRetryableError && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = RETRY_CONFIG.baseDelay;
      
      logger.warn('Server error, single retry attempt', {
        status: response.status,
        delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, 0, retryCount + 1);
    }
    
    // Don't retry, just return the response
    return response;
    
  } catch (error) {
    // Single retry for network errors
    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delay = RETRY_CONFIG.baseDelay;
      
      logger.warn('Network error, single retry attempt', {
        error: error.message,
        delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, 0, retryCount + 1);
    }
    
    // Re-throw the error if retries exhausted
    throw error;
  }
}

// SIMPLIFIED headers for non-shadowlands URLs
function getSimplifiedHeaders(url, userAgent, source) {
  const baseUserAgent = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  // Minimal headers for stability
  const headers = {
    'User-Agent': baseUserAgent,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
  };
  
  // Add Origin/Referer for specific non-shadowlands sources
  if (url.includes('embed.su')) {
    headers['Referer'] = 'https://embed.su/';
    headers['Origin'] = 'https://embed.su';
  } else if (url.includes('lightningbolt')) {
    headers['Referer'] = 'https://vidsrc.cc/';
    headers['Origin'] = 'https://vidsrc.cc';
  }
  
  return headers;
}

// Legacy function for backward compatibility
async function fetchWithRetry(url, options, logger, retryCount = 0) {
  // Extract source and userAgent from options if available
  const userAgent = options.headers?.['User-Agent'];
  const source = 'unknown'; // Default source
  
  // Use the new header fallback system
  return fetchWithHeaderFallback(url, options, logger, userAgent, source, 0, retryCount);
}

// Get client IP address
function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

// Validate stream URL
function validateStreamUrl(url, logger) {
  if (!url) {
    logger.error('Missing stream URL parameter');
    return { isValid: false, error: 'Stream URL parameter is required' };
  }

  try {
    const parsedUrl = new URL(url);
    logger.info('Stream URL validated', {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname.substring(0, 100),
      isM3U8: url.includes('.m3u8'),
      isManifest: url.includes('manifest') || url.includes('playlist')
    });
    return { isValid: true, parsedUrl };
  } catch (e) {
    logger.error('Invalid stream URL format', e, { providedUrl: url });
    return { isValid: false, error: 'Invalid stream URL format' };
  }
}

// REMOVED complex header strategies - simplified headers are now used directly in fetchWithHeaderFallback

// Handle different response types
function getResponseHeaders(originalResponse, logger, skipContentLength = false) {
  const responseHeaders = new Headers();
  
  // Copy essential headers from original response
  const headersToKeep = [
    'content-type',
    ...(skipContentLength ? [] : ['content-length']), // Skip content-length if specified
    'content-range',
    'accept-ranges',
    'cache-control',
    'expires',
    'last-modified',
    'etag'
  ];

  headersToKeep.forEach(header => {
    const value = originalResponse.headers.get(header);
    if (value) {
      responseHeaders.set(header, value);
    }
  });

  // Add CORS headers
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range');
  responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

  logger.debug('Response headers prepared', {
    originalHeaders: Object.keys(Object.fromEntries(originalResponse.headers.entries())).length,
    keptHeaders: headersToKeep.filter(h => originalResponse.headers.get(h)).length,
    corsEnabled: true
  });

  return responseHeaders;
}

// Process M3U8 playlist content and rewrite URLs to use our proxy
async function processM3U8Playlist(m3u8Content, originalUrl, request, logger, source) {
  const lines = m3u8Content.split('\n');
  const processedLines = [];
  const baseUrl = new URL(originalUrl);
  const proxyBaseUrl = new URL(request.url).origin;
  
  let streamCount = 0;
  let processedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments (except URLs)
    if (!line || line.startsWith('#')) {
      processedLines.push(line);
      continue;
    }
    
    streamCount++;
    
    try {
      let targetUrl;
      
      if (line.startsWith('http://') || line.startsWith('https://')) {
        // Absolute URL
        targetUrl = line;
      } else if (line.startsWith('/')) {
        // Root-relative URL
        targetUrl = `${baseUrl.protocol}//${baseUrl.host}${line}`;
      } else {
        // Relative URL
        const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);
        targetUrl = basePath + line;
      }
      
      // Create proxied URL with source parameter
      const sourceParam = source ? `&source=${encodeURIComponent(source)}` : '';
      const proxiedUrl = `${proxyBaseUrl}/api/stream-proxy?url=${encodeURIComponent(targetUrl)}${sourceParam}`;
      processedLines.push(proxiedUrl);
      processedCount++;
      
      logger.debug('URL rewritten in M3U8', {
        original: line.substring(0, 100),
        resolved: targetUrl.substring(0, 100),
        proxied: proxiedUrl.substring(0, 100)
      });
      
    } catch (error) {
      logger.warn('Failed to process M3U8 line', error, { 
        line: line.substring(0, 100),
        lineNumber: i + 1 
      });
      // Keep original line if processing fails
      processedLines.push(line);
    }
  }
  
  logger.info('M3U8 URL rewriting completed', {
    totalLines: lines.length,
    streamUrls: streamCount,
    processedUrls: processedCount,
    skippedUrls: streamCount - processedCount,
    finalContentLength: processedLines.join('\n').length
  });
  
  const finalContent = processedLines.join('\n');
  
  // Debug: Log the final few lines to check for truncation
  const finalLines = finalContent.split('\n');
  logger.debug('M3U8 final content check', {
    totalFinalLines: finalLines.length,
    lastFewLines: finalLines.slice(-3).map((line, idx) => ({
      index: finalLines.length - 3 + idx,
      content: line.substring(0, 150) + (line.length > 150 ? '...' : ''),
      isComplete: !line.includes('...') && (line.startsWith('#') || line.startsWith('http'))
    }))
  });
  
  return finalContent;
}

// Main GET handler
export async function GET(request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const requestStartTime = Date.now();
  const clientIp = getClientIp(request);

  logger.info('Stream proxy request started', {
    timestamp: new Date().toISOString(),
    clientIp,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin')
  });

  // Enhanced request validation (Requirement 4.2)
  const requestValidation = validateRequest(request, logger);
  if (!requestValidation.isValid) {
    logger.error('Request validation failed', null, { 
      error: requestValidation.error,
      clientIp 
    });
    return NextResponse.json({
      success: false,
      error: requestValidation.error,
      requestId
    }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');
  const source = searchParams.get('source'); // 'vidsrc', 'embed.su', 'shadowlands', etc.

  // Rate limiting check (Requirement 5.3)
  const isLightningboltUrl = (streamUrl?.includes('lightningbolt') || streamUrl?.includes('lightningbolts.ru')) || false;
  const rateLimitResult = checkRateLimit(clientIp, logger, isLightningboltUrl);
  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded', { clientIp, blocked: rateLimitResult.blocked, isLightningboltUrl });
    return NextResponse.json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter,
      requestId
    }, {
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rateLimitResult.retryAfter * 1000)).toISOString()
      }
    });
  }

  logger.info('Stream proxy parameters', {
    url: streamUrl?.substring(0, 100) + (streamUrl?.length > 100 ? '...' : ''),
    source: source || 'unknown',
    rateLimitRemaining: rateLimitResult.remaining
  });

  // Validate stream URL
  const validation = validateStreamUrl(streamUrl, logger);
  if (!validation.isValid) {
    logger.error('Stream URL validation failed', null, { error: validation.error });
    return NextResponse.json({
      success: false,
      error: validation.error,
      requestId
    }, { status: 400 });
  }

  try {
    const fetchStartTime = Date.now();
    logger.info('Fetching stream content', {
      url: streamUrl.substring(0, 100) + (streamUrl.length > 100 ? '...' : ''),
      method: 'GET'
    });

    // Prepare base fetch options
    const rangeHeader = request.headers.get('range');
    const userAgent = request.headers.get('user-agent');
    
    const baseFetchOptions = {
      method: 'GET',
      signal: AbortSignal.timeout(CONNECTION_POOL_CONFIG.timeout),
      keepalive: true,
      headers: rangeHeader ? { 'Range': rangeHeader } : {}
    };

    if (rangeHeader) {
      logger.debug('Range request detected', { range: rangeHeader });
    }

    // Use enhanced fetch with header fallback strategies
    const response = await fetchWithHeaderFallback(
      streamUrl, 
      baseFetchOptions, 
      logger, 
      userAgent, 
      source
    );

    const fetchDuration = logger.timing('Stream fetch', fetchStartTime);

    if (!response.ok) {
      logger.error('Stream fetch failed', null, {
        status: response.status,
        statusText: response.statusText,
        url: streamUrl.substring(0, 100)
      });
      return NextResponse.json({
        success: false,
        error: `Stream fetch failed: ${response.status} ${response.statusText}`,
        requestId
      }, { status: response.status });
    }

    logger.info('Stream fetch successful', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      hasRangeSupport: !!response.headers.get('accept-ranges'),
      fetchDuration
    });

    // Check if this is an M3U8 playlist that needs URL rewriting
    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = streamUrl.includes('.m3u8') ||
                   contentType.includes('application/vnd.apple.mpegurl') ||
                   contentType.includes('application/x-mpegURL');
    
    // Check if this is a TS segment (including lightningbolt.site with wrong content type)
    const isTSSegment = streamUrl.includes('.ts') ||
                       streamUrl.includes('lightningbolt') ||
                       streamUrl.includes('lightningbolts') || // Also check for plural form
                       contentType.includes('video/mp2t') ||
                       contentType.includes('application/octet-stream') ||
                       (contentType.includes('image') && streamUrl.includes('.ts'));
    
    // Check if this is a subtitle file
    const isSubtitle = streamUrl.includes('.vtt') || streamUrl.includes('.srt') ||
                      contentType.includes('text/vtt') || contentType.includes('text/plain');

    if (isM3U8) {
      // Process M3U8 playlist to rewrite URLs
      const m3u8ProcessingStart = Date.now();
      logger.info('Processing M3U8 playlist', {
        originalUrl: streamUrl.substring(0, 100),
        contentType
      });

      try {
        const m3u8Content = await response.text();
        const processedM3U8 = await processM3U8Playlist(m3u8Content, streamUrl, request, logger, source);
        
        logger.timing('M3U8 processing', m3u8ProcessingStart);
        
        // Prepare response headers (skip original content-length as we'll set our own)
        const responseHeaders = getResponseHeaders(response, logger, true);
        
        // Set correct content-length header for the processed content
        const processedBuffer = Buffer.from(processedM3U8, 'utf-8');
        responseHeaders.set('content-length', processedBuffer.length.toString());
        
        // Add rate limiting headers
        responseHeaders.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0');
        responseHeaders.set('X-RateLimit-Reset', new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString());
        
        logger.info('M3U8 playlist processed successfully', {
          originalLines: m3u8Content.split('\n').length,
          processedLines: processedM3U8.split('\n').length,
          originalLength: m3u8Content.length,
          processedLength: processedBuffer.length,
          hasQualityStreams: processedM3U8.includes('EXT-X-STREAM-INF'),
          rateLimitRemaining: rateLimitResult.remaining
        });

        // Ensure the response is not truncated by using Buffer
        const responseBuffer = Buffer.from(processedM3U8, 'utf-8');
        
        return new NextResponse(responseBuffer, {
          status: response.status,
          headers: responseHeaders
        });
      } catch (m3u8Error) {
        logger.error('M3U8 processing failed', m3u8Error);
        // Fallback to original content
        const fallbackContent = await response.text();
        return new NextResponse(fallbackContent, {
          status: response.status,
          headers: responseHeaders
        });
      }
    } else if (isSubtitle) {
      // Handle subtitle files with proper content-type
      const subtitleProcessingStart = Date.now();
      logger.info('Processing subtitle file', {
        originalUrl: streamUrl.substring(0, 100),
        contentType,
        isVTT: streamUrl.includes('.vtt'),
        isSRT: streamUrl.includes('.srt')
      });

      try {
        const subtitleContent = await response.text();
        
        // Prepare response headers for subtitle
        const responseHeaders = getResponseHeaders(response, logger, true);
        
        // Set appropriate content-type for subtitles
        if (streamUrl.includes('.vtt') || contentType.includes('text/vtt')) {
          responseHeaders.set('content-type', 'text/vtt; charset=utf-8');
        } else if (streamUrl.includes('.srt')) {
          responseHeaders.set('content-type', 'text/plain; charset=utf-8');
        } else {
          responseHeaders.set('content-type', 'text/plain; charset=utf-8');
        }
        
        // Set correct content-length header
        const subtitleBuffer = Buffer.from(subtitleContent, 'utf-8');
        responseHeaders.set('content-length', subtitleBuffer.length.toString());
        
        // Add rate limiting headers
        responseHeaders.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0');
        responseHeaders.set('X-RateLimit-Reset', new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString());
        
        logger.info('Subtitle file processed successfully', {
          originalLength: subtitleContent.length,
          processedLength: subtitleBuffer.length,
          contentType: responseHeaders.get('content-type'),
          processingTime: Date.now() - subtitleProcessingStart,
          rateLimitRemaining: rateLimitResult.remaining
        });

        return new NextResponse(subtitleBuffer, {
          status: response.status,
          headers: responseHeaders
        });
      } catch (subtitleError) {
        logger.error('Subtitle processing failed', subtitleError);
        // Fallback to original content
        const responseHeaders = getResponseHeaders(response, logger);
        return new NextResponse(response.body, {
          status: response.status,
          headers: responseHeaders
        });
      }
    } else if (isTSSegment) {
      // Handle TS segments (including lightningbolt.site with wrong content type)
      logger.info('Processing TS segment', {
        originalUrl: streamUrl.substring(0, 100),
        contentType,
        hasWrongContentType: contentType.includes('image') && streamUrl.includes('.ts')
      });

      // Prepare response headers with correct content type for TS segments
      const responseHeaders = getResponseHeaders(response, logger);
      
      // Fix content type for TS segments with wrong content type
      if (contentType.includes('image')) {
        responseHeaders.set('content-type', 'video/mp2t');
        logger.info('Fixed content type from image to video/mp2t for TS segment');
      } else if (!contentType || contentType.includes('application/octet-stream')) {
        responseHeaders.set('content-type', 'video/mp2t');
        logger.info('Set content type to video/mp2t for TS segment');
      } else if (!contentType || contentType === 'text/plain') {
        responseHeaders.set('content-type', 'video/mp2t');
        logger.info('Set content type to video/mp2t for TS segment (was text/plain)');
      }

      // Add rate limiting headers
      responseHeaders.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0');
      responseHeaders.set('X-RateLimit-Reset', new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString());

      logger.info('TS segment processed successfully', {
        status: response.status,
        contentType: responseHeaders.get('content-type'),
        rateLimitRemaining: rateLimitResult.remaining
      });

      // Stream the response directly for TS segments
      return new NextResponse(response.body, {
        status: response.status,
        headers: responseHeaders
      });
    } else {
      // Prepare response headers for non-M3U8 content
      const responseHeaders = getResponseHeaders(response, logger);
      
      // Stream the response directly for non-M3U8 content
      const responseStartTime = Date.now();
      const streamResponse = new NextResponse(response.body, {
        status: response.status,
        headers: responseHeaders
      });

      // Add rate limiting headers to response
      responseHeaders.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0');
      responseHeaders.set('X-RateLimit-Reset', new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString());

      logger.info('Stream proxy completed successfully', {
        totalDuration: Date.now() - requestStartTime,
        streamSetupTime: Date.now() - responseStartTime,
        status: response.status,
        contentType: contentType || 'unknown',
        rateLimitRemaining: rateLimitResult.remaining
      });

      const finalStreamResponse = new NextResponse(response.body, {
        status: response.status,
        headers: responseHeaders
      });

      return finalStreamResponse;
    }

  } catch (error) {
    logger.error('Stream proxy failed', error, {
      streamUrl: streamUrl.substring(0, 100),
      requestDuration: Date.now() - requestStartTime,
      errorType: error.name
    });

    // Handle different error types
    let status = 500;
    let errorMessage = 'Stream proxy failed';

    if (error.name === 'AbortError') {
      status = 408;
      errorMessage = 'Stream request timeout';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      status = 502;
      errorMessage = 'Failed to connect to stream source';
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.message,
      requestId,
      timing: {
        totalDuration: Date.now() - requestStartTime,
        timestamp: new Date().toISOString()
      }
    }, { status });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const clientIp = getClientIp(request);

  logger.info('CORS preflight request', {
    clientIp,
    origin: request.headers.get('origin'),
    method: request.headers.get('access-control-request-method'),
    headers: request.headers.get('access-control-request-headers')
  });

  // Apply rate limiting to OPTIONS requests as well
  const { searchParams: optionsParams } = new URL(request.url);
  const optionsStreamUrl = optionsParams.get('url');
  const isOptionsLightningboltUrl = (optionsStreamUrl?.includes('lightningbolt') || optionsStreamUrl?.includes('lightningbolts.ru')) || false;
  const rateLimitResult = checkRateLimit(clientIp, logger, isOptionsLightningboltUrl);
  if (!rateLimitResult.allowed) {
    return new NextResponse(null, {
      status: 429,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rateLimitResult.retryAfter * 1000)).toISOString()
      }
    });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range',
      'Access-Control-Max-Age': '86400',
      'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
      'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString()
    }
  });
}

// Handle HEAD requests for stream info
export async function HEAD(request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  const clientIp = getClientIp(request);

  logger.info('HEAD request for stream info', { clientIp });

  // Apply rate limiting and request validation
  const requestValidation = validateRequest(request, logger);
  if (!requestValidation.isValid) {
    return new NextResponse(null, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');
  const source = searchParams.get('source');

  const isHeadLightningboltUrl = (streamUrl?.includes('lightningbolt') || streamUrl?.includes('lightningbolts.ru')) || false;
  const rateLimitResult = checkRateLimit(clientIp, logger, isHeadLightningboltUrl);
  if (!rateLimitResult.allowed) {
    return new NextResponse(null, {
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rateLimitResult.retryAfter * 1000)).toISOString()
      }
    });
  }

  const validation = validateStreamUrl(streamUrl, logger);
  if (!validation.isValid) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const userAgent = request.headers.get('user-agent');
    
    // Use enhanced fetch with header fallback strategies
    const baseFetchOptions = {
      method: 'HEAD',
      signal: AbortSignal.timeout(CONNECTION_POOL_CONFIG.timeout),
      keepalive: true
    };

    const response = await fetchWithHeaderFallback(
      streamUrl,
      baseFetchOptions,
      logger,
      userAgent,
      source
    );

    const responseHeaders = getResponseHeaders(response, logger);
    
    // Add rate limiting headers
    responseHeaders.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '0');
    responseHeaders.set('X-RateLimit-Reset', new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString());
    
    // Set appropriate content-type for subtitle files
    const isSubtitle = streamUrl.includes('.vtt') || streamUrl.includes('.srt');
    if (isSubtitle) {
      if (streamUrl.includes('.vtt')) {
        responseHeaders.set('content-type', 'text/vtt; charset=utf-8');
      } else if (streamUrl.includes('.srt')) {
        responseHeaders.set('content-type', 'text/plain; charset=utf-8');
      }
    }
    
    // Set appropriate content-type for TS segments
    const isTSSegment = streamUrl.includes('.ts') ||
                       streamUrl.includes('lightningbolt') ||
                       streamUrl.includes('lightningbolts') || // Also check for plural form
                       (response.headers.get('content-type') || '').includes('image') && streamUrl.includes('.ts');
    if (isTSSegment) {
      // Fix content type for TS segments with wrong content type
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('image')) {
        responseHeaders.set('content-type', 'video/mp2t');
      } else if (!contentType || contentType.includes('application/octet-stream') || contentType === 'text/plain') {
        responseHeaders.set('content-type', 'video/mp2t');
      } else {
        responseHeaders.set('content-type', 'video/mp2t');
      }
    }
    
    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    logger.error('HEAD request failed', error);
    return new NextResponse(null, { status: 500 });
  }
}