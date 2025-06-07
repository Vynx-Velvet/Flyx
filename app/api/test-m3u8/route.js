import { NextResponse } from 'next/server';

// Test M3U8 content based on user's example
const SAMPLE_M3U8 = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4500000,RESOLUTION=1920x1080
/api/proxy/viper/froststorm65.pro/file1/mwDacwj+2p1YsREYGDpehUNvYh2urNxMx7ht5lRr21lQYWreFAwYHE+Q84cVaCiTM0yHGRg6PwxcW5P9bamMoxN6FKxTAw+i9ySSSDgk4dsMneKJtPK+5lajimHjiMAjLKey7j~4vDVniEBzXFAA26rgHZn0hUvjsd9WAMQpmpo=/MTA4MA==/aW5kZXgubTN1OA==.png
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1800000,RESOLUTION=1280x720
/api/proxy/viper/froststorm65.pro/file1/mwDacwj+2p1YsREYGDpehUNvYh2urNxMx7ht5lRr21lQYWreFAwYHE+Q84cVaCiTM0yHGRg6PwxcW5P9bamMoxN6FKxTAw+i9ySSSDgk4dsMneKJtPK+5lajimHjiMAjLKey7j~4vDVniEBzXFAA26rgHZn0hUvjsd9WAMQpmpo=/NzIw/aW5kZXgubTN1OA==.png
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=720000,RESOLUTION=640x360
/api/proxy/viper/froststorm65.pro/file1/mwDacwj+2p1YsREYGDpehUNvYh2urNxMx7ht5lRr21lQYWreFAwYHE+Q84cVaCiTM0yHGRg6PwxcW5P9bamMoxN6FKxTAw+i9ySSSDgk4dsMneKJtPK+5lajimHjiMAjLKey7j~4vDVniEBzXFAA26rgHZn0hUvjsd9WAMQpmpo=/MzYw/aW5kZXgubTN1OA==.png`;

// Process M3U8 playlist content and rewrite URLs to use our proxy
function processM3U8Playlist(m3u8Content, originalUrl, request) {
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
        // Root-relative URL - in this case, we know these are from the original embed source
        targetUrl = `${baseUrl.protocol}//${baseUrl.host}${line}`;
      } else {
        // Relative URL
        const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);
        targetUrl = basePath + line;
      }
      
      // Create proxied URL through our stream-proxy
      const proxiedUrl = `${proxyBaseUrl}/api/stream-proxy?url=${encodeURIComponent(targetUrl)}`;
      processedLines.push(proxiedUrl);
      processedCount++;
      
    } catch (error) {
      console.error('Failed to process M3U8 line:', error, { line, lineNumber: i + 1 });
      // Keep original line if processing fails
      processedLines.push(line);
    }
  }
  
  console.log(`M3U8 processing completed: ${processedCount}/${streamCount} URLs processed`);
  
  return processedLines.join('\n');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'processed';
  const originalUrl = searchParams.get('originalUrl') || 'https://embed.su/example/playlist.m3u8';

  console.log('Test M3U8 endpoint called', { mode, originalUrl });

  if (mode === 'original') {
    // Return original M3U8 content
    return new NextResponse(SAMPLE_M3U8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } else if (mode === 'processed') {
    // Return processed M3U8 content with proxied URLs
    const processedM3U8 = processM3U8Playlist(SAMPLE_M3U8, originalUrl, request);
    
    return new NextResponse(processedM3U8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } else if (mode === 'comparison') {
    // Return JSON comparison showing before/after
    const processedM3U8 = processM3U8Playlist(SAMPLE_M3U8, originalUrl, request);
    
    const originalLines = SAMPLE_M3U8.split('\n');
    const processedLines = processedM3U8.split('\n');
    
    const comparison = {
      original: {
        content: SAMPLE_M3U8,
        lines: originalLines.length,
        streamUrls: originalLines.filter(line => !line.startsWith('#') && line.trim()).length
      },
      processed: {
        content: processedM3U8,
        lines: processedLines.length,
        streamUrls: processedLines.filter(line => !line.startsWith('#') && line.trim()).length
      },
      transformations: []
    };
    
    // Show URL transformations
    for (let i = 0; i < originalLines.length; i++) {
      const originalLine = originalLines[i].trim();
      const processedLine = processedLines[i]?.trim();
      
      if (originalLine && !originalLine.startsWith('#') && originalLine !== processedLine) {
        comparison.transformations.push({
          lineNumber: i + 1,
          original: originalLine,
          processed: processedLine
        });
      }
    }
    
    return NextResponse.json(comparison, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  return NextResponse.json({ 
    error: 'Invalid mode. Use ?mode=original, ?mode=processed, or ?mode=comparison' 
  }, { status: 400 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
} 