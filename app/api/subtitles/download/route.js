// Server-side proxy for downloading subtitle files (avoids CORS issues)

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const downloadUrl = searchParams.get('url');

  if (!downloadUrl) {
    return NextResponse.json(
      { success: false, error: 'Download URL is required' },
      { status: 400 }
    );
  }

  try {
    console.log('📥 Proxying subtitle download:', downloadUrl.substring(0, 100) + '...');

    // Download the subtitle file with appropriate headers
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('❌ Subtitle download failed:', {
        status: response.status,
        statusText: response.statusText,
        url: downloadUrl.substring(0, 100)
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Subtitle download failed: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    // Get the file content as array buffer
    const arrayBuffer = await response.arrayBuffer();
    const contentLength = arrayBuffer.byteLength;
    
    console.log(`✅ Downloaded subtitle file: ${contentLength} bytes`);

    // Return the binary content with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Length': contentLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ Error proxying subtitle download:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to download subtitle file',
        debug: {
          errorType: error.constructor.name,
          errorMessage: error.message
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 