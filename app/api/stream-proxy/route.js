import { NextResponse } from 'next/server';

// Enhanced rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map();
const connectionPool = new Map();

// Silent logger for stream-proxy (no console output)
function createLogger(requestId) {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    timing: (label, startTime) => Date.now() - startTime
  };
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 100, // Max 100 requests per minute per IP
  blockDuration: 5 * 60 * 1000 // Block for 5 minutes if exceeded
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second base delay
  maxDelay: 10000, // 10 seconds max delay
  backoffFactor: 2
};

// Connection pool configuration
const CONNECTION_POOL_CONFIG = {
  maxConnections: 50,
  keepAliveTimeout: 30000, // 30 seconds
  timeout: 30000 // 30 seconds request timeout
};

// Generate unique request ID (simplified)
function generateRequestId() {
  return `proxy_${Date.now()}`;
}

// Enhanced rate limiting
function checkRateLimit(clientIp, logger) {
  const now = Date.now();
  const clientKey = `rate_${clientIp}`;
  
  if (!rateLimitStore.has(clientKey)) {
    rateLimitStore.set(clientKey, {
      requests: 1,
      windowStart: now,
      blocked: false,
      blockUntil: 0
    });
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - 1 };
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
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.maxRequests - 1 };
  }
  
  // Check if limit exceeded
  if (clientData.requests >= RATE_LIMIT_CONFIG.maxRequests) {
    clientData.blocked = true;
    clientData.blockUntil = now + RATE_LIMIT_CONFIG.blockDuration;
    logger.warn('Rate limit exceeded', {
      clientIp,
      requests: clientData.requests,
      windowStart: new Date(clientData.windowStart).toISOString(),
      blockedUntil: new Date(clientData.blockUntil).toISOString()
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
    remaining: RATE_LIMIT_CONFIG.maxRequests - clientData.requests 
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

// Enhanced retry logic with header fallback strategies
async function fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, strategyIndex = 0, retryCount = 0) {
  const strategies = getHeaderStrategies(url, userAgent, logger, source);
  const maxStrategies = strategies.length;
  
  // If we've exhausted all strategies, throw the last error
  if (strategyIndex >= maxStrategies) {
    throw new Error(`All ${maxStrategies} header strategies failed for URL: ${url.substring(0, 100)}`);
  }
  
  const currentStrategy = strategies[strategyIndex];
  const options = {
    ...baseOptions,
    headers: {
      ...currentStrategy.headers,
      // Preserve range header if present
      ...(baseOptions.headers?.Range && { 'Range': baseOptions.headers.Range })
    }
  };
  
  try {
    logger.debug('Fetch attempt with header strategy', { 
      url: url.substring(0, 100), 
      strategyName: currentStrategy.name,
      strategyIndex: strategyIndex + 1,
      totalStrategies: maxStrategies,
      retryCount: retryCount + 1,
      maxRetries: RETRY_CONFIG.maxRetries 
    });
    
    const response = await fetch(url, options);
    
    // If response is successful, return it
    if (response.ok) {
      logger.info('Fetch successful with header strategy', {
        strategyName: currentStrategy.name,
        strategyIndex: strategyIndex + 1,
        status: response.status,
        contentType: response.headers.get('content-type')
      });
      return response;
    }
    
    // Handle different types of failures
    const isHeaderRelated = response.status === 403 || // Forbidden
                           response.status === 401 || // Unauthorized  
                           response.status === 405 || // Method Not Allowed
                           response.status === 406;   // Not Acceptable
    
    const isRetryableError = response.status >= 500 || 
                            response.status === 408 || // Request Timeout
                            response.status === 429 || // Too Many Requests
                            response.status === 502 || // Bad Gateway
                            response.status === 503 || // Service Unavailable
                            response.status === 504;   // Gateway Timeout
    
    if (isHeaderRelated) {
      // Try next header strategy immediately
      logger.warn('Header-related error, trying next strategy', {
        status: response.status,
        statusText: response.statusText,
        currentStrategy: currentStrategy.name,
        nextStrategy: strategies[strategyIndex + 1]?.name || 'none'
      });
      
      return fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, strategyIndex + 1, 0);
      
    } else if (isRetryableError && retryCount < RETRY_CONFIG.maxRetries) {
      // Retry with same headers after delay
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount),
        RETRY_CONFIG.maxDelay
      );
      
      logger.warn('Retryable error, waiting before retry', {
        status: response.status,
        statusText: response.statusText,
        strategyName: currentStrategy.name,
        retryCount: retryCount + 1,
        delay,
        nextAttempt: retryCount + 2
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, strategyIndex, retryCount + 1);
      
    } else {
      // Try next header strategy for other errors
      logger.warn('Non-retryable error, trying next header strategy', {
        status: response.status,
        statusText: response.statusText,
        currentStrategy: currentStrategy.name,
        nextStrategy: strategies[strategyIndex + 1]?.name || 'none'
      });
      
      return fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, strategyIndex + 1, 0);
    }
    
  } catch (error) {
    const isNetworkError = error.name === 'TypeError' || // Network error
                          error.name === 'AbortError' || // Timeout
                          error.code === 'ECONNRESET' ||
                          error.code === 'ENOTFOUND' ||
                          error.code === 'ECONNREFUSED';
    
    if (isNetworkError && retryCount < RETRY_CONFIG.maxRetries) {
      // Retry with same headers after delay
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount),
        RETRY_CONFIG.maxDelay
      );
      
      logger.warn('Network error, retrying with same strategy', {
        error: error.message,
        strategyName: currentStrategy.name,
        retryCount: retryCount + 1,
        delay,
        nextAttempt: retryCount + 2
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, strategyIndex, retryCount + 1);
      
    } else {
      // Try next header strategy
      logger.warn('Network error, trying next header strategy', {
        error: error.message,
        currentStrategy: currentStrategy.name,
        nextStrategy: strategies[strategyIndex + 1]?.name || 'none'
      });
      
      return fetchWithHeaderFallback(url, baseOptions, logger, userAgent, source, strategyIndex + 1, 0);
    }
  }
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

// Header fallback strategies for different sources
function getHeaderStrategies(originalUrl, userAgent, logger, source) {
  const isSubtitle = originalUrl.includes('.vtt') || originalUrl.includes('.srt');
  const isVidsrc = source === 'vidsrc';
  const isShadowlands = originalUrl.includes('shadowlandschronicles');
  const isCloudnestra = originalUrl.includes('cloudnestra.com');
  const isEmbed = source === 'embed.su' || originalUrl.includes('embed.su');
  const isStarpulse = originalUrl.includes('starpulsecreative.xyz');
  
  const baseUserAgent = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  // Define different header strategies to try in order
  const strategies = [];
  
  if (isVidsrc || isCloudnestra || isStarpulse) {
    // Strategy 1: Minimal headers (most likely to work for vidsrc.xyz)
    strategies.push({
      name: 'minimal',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': isSubtitle ? 'text/vtt, text/plain, */*' : '*/*'
      }
    });
    
    // Strategy 2: Basic headers with connection keep-alive
    strategies.push({
      name: 'basic',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': isSubtitle ? 'text/vtt, text/plain, */*' : '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      }
    });
    
    // Strategy 3: No headers at all (sometimes works when servers are picky)
    strategies.push({
      name: 'none',
      headers: {}
    });
    
    // Strategy 4: Only User-Agent (fallback)
    strategies.push({
      name: 'user-agent-only',
      headers: {
        'User-Agent': baseUserAgent
      }
    });
    
  } else if (isShadowlands) {
    // Strategy 1: Full shadowlandschronicles headers
    strategies.push({
      name: 'shadowlands-full',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://cloudnestra.com/',
        'Origin': 'https://cloudnestra.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    // Strategy 2: Minimal shadowlands headers
    strategies.push({
      name: 'shadowlands-minimal',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': '*/*',
        'Referer': 'https://cloudnestra.com/',
        'Origin': 'https://cloudnestra.com'
      }
    });
    
    // Strategy 3: No referer/origin (sometimes works)
    strategies.push({
      name: 'shadowlands-no-referer',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': '*/*'
      }
    });
    
  } else {
    // Default strategies for embed.su and others
    // Strategy 1: Full embed headers
    strategies.push({
      name: 'embed-full',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://embed.su/',
        'Origin': 'https://embed.su',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    // Strategy 2: Basic headers
    strategies.push({
      name: 'basic',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      }
    });
    
    // Strategy 3: Minimal headers
    strategies.push({
      name: 'minimal',
      headers: {
        'User-Agent': baseUserAgent,
        'Accept': '*/*'
      }
    });
  }
  
  // Add content-type specific Accept headers
  strategies.forEach(strategy => {
    if (strategy.headers.Accept && strategy.headers.Accept === '*/*') {
      if (originalUrl.includes('.m3u8')) {
        strategy.headers.Accept = 'application/vnd.apple.mpegurl, application/x-mpegURL, */*';
      } else if (originalUrl.includes('.ts')) {
        strategy.headers.Accept = 'video/MP2T, */*';
      } else if (originalUrl.includes('.mp4')) {
        strategy.headers.Accept = 'video/mp4, */*';
      } else if (originalUrl.includes('.vtt') || originalUrl.includes('.srt')) {
        strategy.headers.Accept = 'text/vtt, text/plain, */*';
      }
    }
  });
  
  logger.debug('Header strategies prepared', {
    totalStrategies: strategies.length,
    strategyNames: strategies.map(s => s.name),
    isVidsrc,
    isShadowlands,
    isEmbed,
    isStarpulse
  });
  
  return strategies;
}

// Enhanced source-specific header management with fallback
function getStreamHeaders(originalUrl, userAgent, logger, source, strategyIndex = 0) {
  const strategies = getHeaderStrategies(originalUrl, userAgent, logger, source);
  
  if (strategyIndex >= strategies.length) {
    // Fallback to minimal headers if all strategies exhausted
    logger.warn('All header strategies exhausted, using minimal fallback');
    return {
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
  }
  
  const selectedStrategy = strategies[strategyIndex];
  
  logger.debug('Using header strategy', {
    strategyName: selectedStrategy.name,
    strategyIndex: strategyIndex + 1,
    totalStrategies: strategies.length,
    headerCount: Object.keys(selectedStrategy.headers).length,
    hasReferer: !!selectedStrategy.headers.Referer,
    hasOrigin: !!selectedStrategy.headers.Origin
  });
  
  return selectedStrategy.headers;
}

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

  // Rate limiting check (Requirement 5.3)
  const rateLimitResult = checkRateLimit(clientIp, logger);
  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded', { clientIp, blocked: rateLimitResult.blocked });
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

  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');
  const source = searchParams.get('source'); // 'vidsrc', 'embed.su', etc.

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
  const rateLimitResult = checkRateLimit(clientIp, logger);
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

  const rateLimitResult = checkRateLimit(clientIp, logger);
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

  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');
  const source = searchParams.get('source');

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
    
    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    logger.error('HEAD request failed', error);
    return new NextResponse(null, { status: 500 });
  }
} 