import { NextResponse } from 'next/server';

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

// Generate unique request ID (simplified)
function generateRequestId() {
  return `proxy_${Date.now()}`;
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

// Get appropriate headers for the stream request
function getStreamHeaders(originalUrl, userAgent, logger, source) {
  // Check if this is a subtitle file
  const isSubtitle = originalUrl.includes('.vtt') || originalUrl.includes('.srt');
  
  // Check if this came from vidsrc.xyz (use clean headers) or shadowlandschronicles (always clean)
  const isVidsrc = source === 'vidsrc';
  const isShadowlands = originalUrl.includes('shadowlandschronicles');
  const isCloudnestra = originalUrl.includes('cloudnestra.com');
  const needsCleanHeaders = isVidsrc || isShadowlands || isCloudnestra || isSubtitle;
  
  if (needsCleanHeaders) {
    // Minimal headers for vidsrc.xyz sources, shadowlandschronicles, cloudnestra, or subtitle files
    const headers = {
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': isSubtitle ? 'text/vtt, text/plain, */*' : '*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    
    logger.debug('Using clean headers', {
      reason: isVidsrc ? 'vidsrc source' : 
               isShadowlands ? 'shadowlandschronicles URL' : 
               isCloudnestra ? 'cloudnestra URL' :
               isSubtitle ? 'subtitle file' : 'unknown',
      isVidsrc,
      isShadowlands,
      isCloudnestra,
      isSubtitle
    });
    
    return headers;
  }
  
  // Standard headers for embed.su streams
  const headers = {
    'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://embed.su/',
    'Origin': 'https://embed.su',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
  
  logger.debug('Using embed.su headers', {
    source: source || 'unknown'
  });

  // Add specific headers for different stream types
  if (originalUrl.includes('.m3u8')) {
    headers['Accept'] = 'application/vnd.apple.mpegurl, application/x-mpegURL, */*';
  } else if (originalUrl.includes('.ts')) {
    headers['Accept'] = 'video/MP2T, */*';
  } else if (originalUrl.includes('.mp4')) {
    headers['Accept'] = 'video/mp4, */*';
  } else if (originalUrl.includes('.vtt') || originalUrl.includes('.srt')) {
    headers['Accept'] = 'text/vtt, text/plain, */*';
  }

  logger.debug('Request headers prepared', {
    totalHeaders: Object.keys(headers).length,
    hasReferer: !!headers.Referer,
    hasOrigin: !!headers.Origin,
    contentType: headers.Accept,
    isShadowlands,
    headerMode: isShadowlands ? 'direct' : 'embed.su'
  });

  return headers;
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

  logger.info('Stream proxy request started', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin')
  });

  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');
  const source = searchParams.get('source'); // 'vidsrc' or 'embed.su'

  logger.info('Stream proxy parameters', {
    url: streamUrl?.substring(0, 100) + (streamUrl?.length > 100 ? '...' : ''),
    source: source || 'unknown'
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

    // Prepare headers based on source (clean headers for vidsrc, embed.su masking for others)
    const headers = getStreamHeaders(
      streamUrl, 
      request.headers.get('user-agent'),
      logger,
      source
    );

    // Add range header if present in original request
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
      logger.debug('Range request detected', { range: rangeHeader });
    }

    // Fetch the stream content
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

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
        
        logger.info('M3U8 playlist processed successfully', {
          originalLines: m3u8Content.split('\n').length,
          processedLines: processedM3U8.split('\n').length,
          originalLength: m3u8Content.length,
          processedLength: processedBuffer.length,
          hasQualityStreams: processedM3U8.includes('EXT-X-STREAM-INF')
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
        
        logger.info('Subtitle file processed successfully', {
          originalLength: subtitleContent.length,
          processedLength: subtitleBuffer.length,
          contentType: responseHeaders.get('content-type'),
          processingTime: Date.now() - subtitleProcessingStart
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

      logger.info('Stream proxy completed successfully', {
        totalDuration: Date.now() - requestStartTime,
        streamSetupTime: Date.now() - responseStartTime,
        status: response.status,
        contentType: contentType || 'unknown'
      });

      return streamResponse;
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

  logger.info('CORS preflight request', {
    origin: request.headers.get('origin'),
    method: request.headers.get('access-control-request-method'),
    headers: request.headers.get('access-control-request-headers')
  });

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Handle HEAD requests for stream info
export async function HEAD(request) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  logger.info('HEAD request for stream info');

  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');
  const source = searchParams.get('source');

  const validation = validateStreamUrl(streamUrl, logger);
  if (!validation.isValid) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const headers = getStreamHeaders(streamUrl, request.headers.get('user-agent'), logger, source);
    
    const response = await fetch(streamUrl, {
      method: 'HEAD',
      headers,
      signal: AbortSignal.timeout(10000)
    });

    const responseHeaders = getResponseHeaders(response, logger);
    
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