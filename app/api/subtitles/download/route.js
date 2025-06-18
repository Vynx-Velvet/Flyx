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
  try {
    const { download_link } = await request.json();
    
    if (!download_link) {
      return NextResponse.json(
        { success: false, error: 'Download link is required' },
        { status: 400 }
      );
    }

    console.log('📥 Downloading subtitle from:', download_link);

    // Download the subtitle file
    const response = await fetch(download_link, {
      headers: {
        'User-Agent': 'TemporaryUserAgent',
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download subtitle: ${response.status}`);
    }

    const subtitleContent = await response.text();
    console.log('📄 Downloaded subtitle content length:', subtitleContent.length);

    // Convert SRT to VTT if needed
    let vttContent;
    if (download_link.includes('.srt') || subtitleContent.includes('-->') && !subtitleContent.startsWith('WEBVTT')) {
      // Convert SRT to VTT
      vttContent = convertSrtToVtt(subtitleContent);
      console.log('🔄 Converted SRT to VTT');
    } else if (subtitleContent.startsWith('WEBVTT')) {
      // Already VTT format
      vttContent = subtitleContent;
      console.log('✅ Already in VTT format');
    } else {
      // Assume it's SRT and convert
      vttContent = convertSrtToVtt(subtitleContent);
      console.log('🔄 Assumed SRT format and converted to VTT');
    }

    return NextResponse.json({
      success: true,
      vtt: vttContent,
    });

  } catch (error) {
    console.error('❌ Error downloading subtitle:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function convertSrtToVtt(srtContent) {
  // Basic SRT to VTT conversion
  let vtt = 'WEBVTT\n\n';
  
  // Replace SRT timestamps (00:00:00,000) with VTT timestamps (00:00:00.000)
  vtt += srtContent
    .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return vtt;
} 