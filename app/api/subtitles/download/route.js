// Server-side proxy for downloading subtitle files (avoids CORS issues)

import { NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

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
    const body = await request.json();
    const { download_link } = body;

    if (!download_link) {
      console.error('❌ Missing download_link parameter:', {
        receivedBody: body,
        hasDownloadLink: !!body.download_link,
        bodyKeys: Object.keys(body)
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Download link is required',
          debug: {
            receivedBody: body,
            expectedParameter: 'download_link'
          }
        },
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

    // Get as array buffer to handle both text and binary content
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('📄 Downloaded subtitle content:', {
      size: arrayBuffer.byteLength,
      firstBytes: Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' '),
      isGzipped: uint8Array.length >= 2 && uint8Array[0] === 0x1f && uint8Array[1] === 0x8b
    });

    let subtitleContent;
    
    // Check if content is gzipped (magic number: 1f 8b)
    if (uint8Array.length >= 2 && uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
      console.log('🗜️ Decompressing gzipped content...');
      try {
        // Decompress using Node.js zlib
        const decompressed = gunzipSync(Buffer.from(arrayBuffer));
        subtitleContent = decompressed.toString('utf-8');
        console.log('✅ Successfully decompressed gzipped content:', {
          originalSize: arrayBuffer.byteLength,
          decompressedSize: subtitleContent.length
        });
      } catch (decompressError) {
        console.error('❌ Failed to decompress gzipped content:', decompressError);
        throw new Error(`Failed to decompress gzipped subtitle: ${decompressError.message}`);
      }
    } else {
      // Not gzipped, treat as regular text
      console.log('📄 Processing uncompressed content');
      subtitleContent = new TextDecoder('utf-8').decode(arrayBuffer);
    }

    console.log('📝 Subtitle content preview:', {
      length: subtitleContent.length,
      startsWithWebVTT: subtitleContent.startsWith('WEBVTT'),
      firstLine: subtitleContent.split('\n')[0],
      hasNumbers: /^\d+$/.test(subtitleContent.split('\n')[0]) // SRT format check
    });

    // Convert SRT to VTT if needed
    let vttContent;
    if (subtitleContent.startsWith('WEBVTT')) {
      // Already VTT format
      vttContent = subtitleContent;
      console.log('✅ Already in VTT format');
    } else if (download_link.includes('.srt') || subtitleContent.includes('-->') && !subtitleContent.startsWith('WEBVTT')) {
      // Convert SRT to VTT
      vttContent = convertSrtToVtt(subtitleContent);
      console.log('🔄 Converted SRT to VTT');
    } else {
      // Assume it's SRT and convert
      vttContent = convertSrtToVtt(subtitleContent);
      console.log('🔄 Assumed SRT format and converted to VTT');
    }

    // Validate VTT content
    if (!vttContent.startsWith('WEBVTT')) {
      console.warn('⚠️ VTT content does not start with WEBVTT header, adding it...');
      vttContent = 'WEBVTT\n\n' + vttContent;
    }

    console.log('📄 Final VTT content preview:', {
      length: vttContent.length,
      startsWithWebVTT: vttContent.startsWith('WEBVTT'),
      firstLines: vttContent.split('\n').slice(0, 5)
    });

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
  console.log('🔄 Converting SRT to VTT...');
  
  // Basic SRT to VTT conversion
  let vtt = 'WEBVTT\n\n';
  
  // Replace SRT timestamps (00:00:00,000) with VTT timestamps (00:00:00.000)
  vtt += srtContent
    .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  console.log('✅ SRT to VTT conversion completed:', {
    originalLength: srtContent.length,
    vttLength: vtt.length
  });

  return vtt;
} 