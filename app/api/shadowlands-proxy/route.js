import { NextResponse } from 'next/server';

/**
 * Shadowlands proxy endpoint
 * 
 * This endpoint receives a shadowlands URL and:
 * 1. Fetches the shadowlands page
 * 2. Extracts the actual m3u8 stream URL
 * 3. Proxies the m3u8 content with proper CORS headers
 */

// Utility function for logging
function createLogger(requestId) {
  return {
    info: (message, data = {}) => {
      console.log(`[${requestId}] INFO: ${message}`, JSON.stringify(data, null, 2));
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

// Extract m3u8 URL from Shadowlands HTML
function extractM3u8FromShadowlands(html, logger) {
  logger.info('Extracting m3u8 URL from Shadowlands HTML...');

  // Check if the input is already m3u8 content
  if (html.includes('#EXTM3U') || html.includes('#EXT-X-VERSION')) {
    logger.error('Input appears to be m3u8 content, not HTML page');
    return null;
  }

  const patterns = [
    // More specific patterns for shadowlands
    /['"]?file['"]?\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /source\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /src\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /<source[^>]+src=['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /video[^>]*src=['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /jwplayer[^}]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /playlist\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    // Direct m3u8 URL patterns
    /https:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi,
    // Generic quoted URLs that might be m3u8
    /['"]([^'"]*tmstr[^'"]*\.m3u8[^'"]*)['"]/gi,
    /['"]([^'"]*shadowlands[^'"]*\.m3u8[^'"]*)['"]/gi
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    logger.info(`Trying pattern ${i + 1}/${patterns.length}`);
    
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      logger.info(`Found ${matches.length} matches with pattern ${i + 1}`);
      
      for (const match of matches) {
        let url = match;
        
        // Extract URL from the match based on the pattern
        if (match.includes('file') || match.includes('source') || match.includes('src')) {
          const fileMatch = match.match(/['"]?(?:file|source|src)['"]?\s*:\s*['"]([^'"]+)['"]/i);
          if (fileMatch) {
            url = fileMatch[1];
          }
        } else if (match.includes('<source')) {
          const srcMatch = match.match(/src=['"]([^'"]+)['"]/i);
          if (srcMatch) {
            url = srcMatch[1];
          }
        } else if (match.startsWith('"') || match.startsWith("'")) {
          url = match.slice(1, -1);
        } else if (match.startsWith('https://')) {
          url = match;
        }
        
        // Clean up the URL
        url = url.trim();
        
        // Skip if it doesn't look like a stream URL
        if (!url.includes('.m3u8')) {
          continue;
        }
        
        // Ensure it's a full URL
        if (!url.startsWith('http')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (url.startsWith('/')) {
            url = `https://tmstr2.shadowlandschronicles.com${url}`;
          } else {
            url = `https://tmstr2.shadowlandschronicles.com/${url}`;
          }
        }
        
        logger.info('Found potential stream URL:', url);
        
        // Validate URL format
        try {
          new URL(url);
          logger.info('Valid URL found:', url);
          return url;
        } catch (e) {
          logger.info('Invalid URL format, skipping:', url);
          continue;
        }
      }
    }
  }

  logger.error('Stream URL not found in Shadowlands HTML');
  logger.info('HTML preview (first 500 chars):', html.substring(0, 500));
  return null;
}

export async function GET(request) {
  const requestId = `shadowlands_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const logger = createLogger(requestId);
  
  try {
    const { searchParams } = new URL(request.url);
    const shadowlandsUrl = searchParams.get('url');
    
    if (!shadowlandsUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing shadowlands URL parameter' },
        { status: 400 }
      );
    }

    logger.info('Processing shadowlands URL', { url: shadowlandsUrl });

    let m3u8Url = shadowlandsUrl;

    // Check if the URL is already a direct m3u8 URL
    if (shadowlandsUrl.includes('.m3u8')) {
      logger.info('Direct m3u8 URL detected, skipping extraction');
      m3u8Url = shadowlandsUrl;
    } else {
      logger.info('HTML page URL detected, extracting m3u8');
      
      // Fetch the shadowlands page
      const response = await fetch(shadowlandsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`Shadowlands returned ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      m3u8Url = extractM3u8FromShadowlands(html, logger);
      
      if (!m3u8Url) {
        throw new Error('Could not extract m3u8 URL from shadowlands page');
      }
    }

    // Now fetch the m3u8 content
    logger.info('Fetching m3u8 content', { url: m3u8Url });
    
    try {
      const m3u8Response = await fetch(m3u8Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Origin': 'https://tmstr2.shadowlandschronicles.com',
          'Referer': 'https://tmstr2.shadowlandschronicles.com/'
        }
      });

      logger.info('M3U8 fetch response', {
        status: m3u8Response.status,
        statusText: m3u8Response.statusText,
        headers: Object.fromEntries(m3u8Response.headers.entries())
      });

      if (!m3u8Response.ok) {
        logger.error(`M3U8 fetch failed: ${m3u8Response.status} ${m3u8Response.statusText}`);
        
        // Try to return the original URL with CORS headers instead of failing
        return new Response(null, {
          status: 302,
          headers: {
            'Location': m3u8Url,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Range',
            'X-Proxy-Status': 'redirect-fallback'
          }
        });
      }

      const m3u8Content = await m3u8Response.text();
      logger.info('M3U8 content fetched successfully', {
        contentLength: m3u8Content.length,
        firstLine: m3u8Content.split('\n')[0]
      });
    } catch (fetchError) {
      logger.error('M3U8 fetch error', fetchError);
      
      // Return a simple redirect as fallback
      return new Response(null, {
        status: 302,
        headers: {
          'Location': m3u8Url,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'X-Proxy-Status': 'redirect-fallback'
        }
      });
    }
    
    // Parse the base URL for relative segment URLs
    const m3u8BaseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
    
    // Process the m3u8 content to make relative URLs absolute
    const processedContent = m3u8Content.split('\n').map(line => {
      if (line.startsWith('#') || line.trim() === '') {
        return line;
      }
      
      // This is a segment URL
      if (!line.startsWith('http')) {
        if (line.startsWith('/')) {
          const urlObj = new URL(m3u8Url);
          return `${urlObj.protocol}//${urlObj.host}${line}`;
        } else {
          return `${m3u8BaseUrl}${line}`;
        }
      }
      
      return line;
    }).join('\n');

    // Return the m3u8 content with proper CORS headers
    return new Response(processedContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Stream-Source': 'shadowlands',
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    logger.error('Shadowlands proxy failed', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        requestId
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400'
    }
  });
}