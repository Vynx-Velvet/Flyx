import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const testUrl = searchParams.get('url') || 'https://cloudnestra.com/subs/d15447dc0714a7f83b92a58f165e306c/English.eng.vtt';
    
    console.log('Testing subtitle proxy with URL:', testUrl);
    
    // Test the stream-proxy with a subtitle URL
    const proxyUrl = new URL('/api/stream-proxy', request.url).toString();
    const testProxyUrl = `${proxyUrl}?url=${encodeURIComponent(testUrl)}`;
    
    console.log('Proxied URL:', testProxyUrl);
    
    const response = await fetch(testProxyUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const success = response.ok;
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    let content = '';
    if (success && response.ok) {
      content = await response.text();
    }
    
    return NextResponse.json({
      success,
      status: response.status,
      contentType,
      contentLength,
      contentPreview: content.substring(0, 500),
      testUrl,
      proxyUrl: testProxyUrl,
      headers: Object.fromEntries(response.headers.entries())
    });
    
  } catch (error) {
    console.error('Subtitle test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 