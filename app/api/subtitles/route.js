// Server-side proxy for OpenSubtitles API (cloudnestra approach)
// This avoids CORS issues and 302 redirects when calling from browser

import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imdbId = searchParams.get('imdbId');
  const languageId = searchParams.get('languageId') || 'eng';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!imdbId) {
    return NextResponse.json(
      { success: false, error: 'IMDB ID is required' },
      { status: 400 }
    );
  }

  try {
    // Build OpenSubtitles API URL with PROPER parameter sorting (alphabetical order required!)
    // OpenSubtitles redirects with 302 if parameters are not sorted alphabetically
    
    // Extract numeric IMDB ID (OpenSubtitles expects just the number, not "tt123456")
    const numericImdbId = imdbId.replace(/^tt/, '');
    console.log('🎬 Converting IMDB ID:', { original: imdbId, numeric: numericImdbId });
    
    const params = [];
    
    if (season && episode) {
      // TV show episode - parameters must be in alphabetical order
      params.push(`episode-${episode}`);
      params.push(`imdbid-${numericImdbId}`);
      params.push(`season-${season}`);
      params.push(`sublanguageid-${languageId}`);
    } else {
      // Movie - parameters must be in alphabetical order
      params.push(`imdbid-${numericImdbId}`);
      params.push(`sublanguageid-${languageId}`);
    }
    
    // Sort parameters alphabetically (OpenSubtitles requirement)
    params.sort();
    
    // Build URL with sorted parameters (must be lowercase)
    let apiUrl = 'https://rest.opensubtitles.org/search/' + params.join('/');
    apiUrl = apiUrl.toLowerCase(); // OpenSubtitles requires lowercase URLs

    console.log('🎬 Proxying OpenSubtitles request:', {
      imdbId,
      languageId,
      season,
      episode,
      apiUrl,
      parametersUsed: params,
      parametersSorted: params.join('/'),
      isLowercase: apiUrl === apiUrl.toLowerCase()
    });

    // Debug environment variables that might affect DNS
    console.log('🔍 Environment debug:', {
      HTTP_PROXY: process.env.HTTP_PROXY,
      HTTPS_PROXY: process.env.HTTPS_PROXY,
      NO_PROXY: process.env.NO_PROXY,
      NODE_ENV: process.env.NODE_ENV
    });

    // Make request with better error handling and explicit agent
    const agent = new https.Agent({
      keepAlive: false,
      timeout: 10000,
      rejectUnauthorized: true
    });

        let response;
    let finalUrl = apiUrl;
    
    // Function to make a request and handle redirects manually
    const makeRequest = async (url, maxRedirects = 3) => {
      console.log(`🔄 Making request to: ${url} (redirects left: ${maxRedirects})`);
      
      const requestResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'TemporaryUserAgent', 
          'X-User-Agent': 'TemporaryUserAgent',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        agent: agent,
        redirect: 'manual' // Handle redirects manually
      });

      console.log(`📡 Response status: ${requestResponse.status} for URL: ${url}`);

      // Handle redirects manually
      if (requestResponse.status === 302 && maxRedirects > 0) {
        const redirectLocation = requestResponse.headers.get('location');
        console.log(`🔄 302 redirect to: ${redirectLocation}`);
        
        if (redirectLocation) {
          // Follow the redirect recursively
          finalUrl = redirectLocation;
          return await makeRequest(redirectLocation, maxRedirects - 1);
        } else {
          throw new Error('302 redirect received but no location header found');
        }
      }

      return requestResponse;
    };

    try {
      // First try with fetch API and manual redirect handling
      response = await makeRequest(apiUrl);
    } catch (fetchError) {
      console.log('⚠️ Fetch failed, trying direct HTTPS request:', fetchError.message);
      
      // Fallback to direct HTTPS request with manual redirect handling
      const makeHttpsRequest = async (url, maxRedirects = 3) => {
        console.log(`🔄 Making HTTPS request to: ${url} (redirects left: ${maxRedirects})`);
        
        return new Promise((resolve, reject) => {
          const urlObj = new URL(url);
          const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
              'User-Agent': 'TemporaryUserAgent',
              'X-User-Agent': 'TemporaryUserAgent',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            timeout: 10000,
            agent: false
          };

          const req = https.request(options, (res) => {
            console.log(`📡 HTTPS Response status: ${res.statusCode} for URL: ${url}`);
            
            // Handle redirects manually
            if (res.statusCode === 302 && maxRedirects > 0) {
              const redirectLocation = res.headers.location;
              console.log(`🔄 HTTPS 302 redirect to: ${redirectLocation}`);
              
              if (redirectLocation) {
                finalUrl = redirectLocation;
                makeHttpsRequest(redirectLocation, maxRedirects - 1)
                  .then(resolve)
                  .catch(reject);
                return;
              } else {
                reject(new Error('302 redirect received but no location header found'));
                return;
              }
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: res.headers,
                json: async () => JSON.parse(data)
              });
            });
          });

          req.on('error', reject);
          req.on('timeout', () => reject(new Error('Request timeout')));
          req.end();
        });
      };
      
      response = await makeHttpsRequest(apiUrl);
      console.log('✅ Direct HTTPS request successful');
    }

    console.log('📡 OpenSubtitles final response status:', response.status, '(after following any redirects)');
    console.log('🎯 Final URL after redirects:', finalUrl);

    if (!response.ok) {
      console.error('❌ OpenSubtitles API error:', {
        status: response.status,
        statusText: response.statusText,
        url: apiUrl
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenSubtitles API error: ${response.status} ${response.statusText}`,
          debug: {
            status: response.status,
            statusText: response.statusText,
            url: apiUrl
          }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('❌ Invalid OpenSubtitles response format:', typeof data);
      return NextResponse.json(
        { success: false, error: 'Invalid response format from OpenSubtitles API' },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${data.length} subtitles from OpenSubtitles`);

    // Filter for VTT and SRT formats only (like cloudnestra)
    const validSubtitles = data.filter(sub => 
      sub.SubFormat === "srt" || sub.SubFormat === "vtt"
    );

    // Language mapping (simplified for key languages)
    const languageMap = {
      'eng': { name: 'English', iso639: 'en' },
      'spa': { name: 'Spanish', iso639: 'es' },
      'fre': { name: 'French', iso639: 'fr' },
      'ger': { name: 'German', iso639: 'de' },
      'ita': { name: 'Italian', iso639: 'it' },
      'por': { name: 'Portuguese', iso639: 'pt' },
      'rus': { name: 'Russian', iso639: 'ru' },
      'ara': { name: 'Arabic', iso639: 'ar' },
      'chi': { name: 'Chinese (simplified)', iso639: 'zh' },
      'jpn': { name: 'Japanese', iso639: 'ja' }
    };

    const languageInfo = languageMap[languageId] || { name: 'Unknown', iso639: 'en' };

    // Calculate quality score (cloudnestra approach)
    const calculateQualityScore = (subtitle) => {
      let score = 50;
      
      const downloads = parseInt(subtitle.SubDownloadsCnt) || 0;
      if (downloads > 1000) score += 20;
      else if (downloads > 100) score += 10;
      else if (downloads > 10) score += 5;
      
      const rating = parseFloat(subtitle.SubRating) || 0;
      score += Math.round(rating * 5);
      
      if (subtitle.SubFormat === 'vtt') score += 15;
      
      return Math.min(100, Math.max(0, score));
    };

    // Format subtitles in our expected format
    const formattedSubtitles = validSubtitles.map(sub => ({
      id: sub.IDSubtitleFile,
      url: sub.SubDownloadLink,
      downloadLink: sub.SubDownloadLink,
      download_link: sub.SubDownloadLink, // Add this for compatibility with download API
      language: languageInfo.name,
      languageName: languageInfo.name,
      iso639: languageInfo.iso639,
      langCode: languageId,
      format: sub.SubFormat,
      encoding: sub.SubEncoding || 'UTF-8',
      fileName: sub.SubFileName,
      releaseName: sub.MovieReleaseName,
      qualityScore: calculateQualityScore(sub),
      isVTT: sub.SubFormat === "vtt",
      downloads: sub.SubDownloadsCnt || 0,
      rating: sub.SubRating || 0,
      source: 'opensubtitles',
      trusted: true
    }));

    return NextResponse.json({
      success: true,
      subtitles: formattedSubtitles,
      totalCount: validSubtitles.length,
      language: languageInfo.name,
      source: 'opensubtitles-proxy',
      debug: {
        apiUrl,
        totalFound: data.length,
        validFound: validSubtitles.length
      }
    });

  } catch (error) {
    console.error('❌ Error proxying OpenSubtitles request:', error);
    
    // Enhanced error debugging
    const errorDetails = {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorCode: error.code,
      errorErrno: error.errno,
      errorSyscall: error.syscall,
      errorHostname: error.hostname,
      errorAddress: error.address,
      errorPort: error.port,
      cause: error.cause ? {
        message: error.cause.message,
        code: error.cause.code,
        errno: error.cause.errno,
        syscall: error.cause.syscall,
        hostname: error.cause.hostname
      } : null
    };

    console.error('🔍 Detailed error info:', errorDetails);
    
    // Provide more specific error messages
    let userFriendlyError = 'Failed to fetch subtitles';
    if (error.code === 'ENOTFOUND') {
      userFriendlyError = 'DNS resolution failed - unable to connect to OpenSubtitles API';
    } else if (error.code === 'ECONNREFUSED') {
      userFriendlyError = 'Connection refused by OpenSubtitles API';
    } else if (error.code === 'ETIMEDOUT') {
      userFriendlyError = 'Request timed out - OpenSubtitles API is not responding';
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: userFriendlyError,
        debug: errorDetails
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