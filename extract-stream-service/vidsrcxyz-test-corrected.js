/**
 * VidSrcXYZ Extraction Test with Corrected URL Format
 *
 * This test implementation validates the corrected URL format and extraction algorithm
 * based on the comprehensive reverse engineering analysis.
 */

import https from 'https';
import http from 'http';

// Test data from vidsrcxyz.html
const TEST_DATA = {
  tmdbId: '33043892',
  mediaType: 'tv',
  season: 1,
  episode: 1,
  title: 'Dexter: Resurrection S01E01'
};

/**
 * Build corrected vidsrc.xyz URL using path parameters (not query parameters)
 */
function buildVidsrcxyzUrl(tmdbId, mediaType, season, episode) {
  if (mediaType === 'movie') {
    return `https://vidsrc.xyz/embed/movie/${tmdbId}/`;
  } else if (mediaType === 'tv' && season && episode) {
    return `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}/`;
  } else {
    throw new Error('Invalid media type or missing season/episode for TV shows');
  }
}

/**
 * Get realistic headers for HTTP requests
 */
function getRealisticHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };
}

/**
 * Make HTTP request with promise support
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { ...getRealisticHeaders(), ...options.headers },
      timeout: options.timeout || 30000
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Extract cloudnestra RCP URL from vidsrc.xyz page content
 */
function extractRcpUrlFromVidsrc(html, log) {
  console.log('🔍 Looking for cloudnestra RCP URLs in HTML content...');
  
  // Multiple patterns to match cloudnestra URLs
  const rcpPatterns = [
    /src="([^"]*cloudnestra\.com\/rcp[^"]*)"/gi,
    /https?:\/\/[^"'\s]*cloudnestra\.com\/rcp[^"'\s]*/gi,
    /'([^']*cloudnestra\.com\/rcp[^']*)'/gi,
    /\/\/cloudnestra\.com\/rcp\/[^"'\s]+/gi
  ];
  
  for (const pattern of rcpPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      console.log(`📋 Found ${matches.length} potential RCP URLs with pattern: ${pattern.source.substring(0, 50)}...`);
      
      for (let match of matches) {
        let url = match.replace(/src="|["']/g, '').trim();
        if (url.includes('cloudnestra.com/rcp')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (!url.startsWith('http')) {
            url = `https://${url}`;
          }
          
          console.log(`✅ Extracted RCP URL: ${url.substring(0, 100)}...`);
          log.push({ step: 2, action: 'Extracted RCP URL', url: url.substring(0, 100) });
          return url;
        }
      }
    }
  }
  
  console.log('❌ No cloudnestra RCP URLs found in HTML');
  return null;
}

/**
 * Extract prorcp URL from RCP page content
 */
function extractProrcpUrlFromRcp(html, log) {
  console.log('🔍 Looking for prorcp URLs in RCP page content...');
  
  // Patterns to match prorcp URLs
  const prorcpPatterns = [
    /src:\s*['"]\/prorcp\/([^'"]+)['"]/gi,
    /\/prorcp\/[A-Za-z0-9+\/=]+/gi,
    /'\/prorcp\/([^']+)'/gi,
    /"\/prorcp\/([^"]+)"/gi,
    /https?:\/\/[^"'\s]*cloudnestra[^"'\s]*\/prorcp[^"'\s]*/gi
  ];
  
  for (const pattern of prorcpPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      console.log(`📋 Found ${matches.length} potential prorcp URLs with pattern: ${pattern.source.substring(0, 50)}...`);
      
      for (let match of matches) {
        let url = match.replace(/src:\s*['"]|['"]|src=/gi, '').trim();
        if (url.includes('/prorcp/')) {
          if (url.startsWith('/')) {
            url = `https://cloudnestra.com${url}`;
          } else if (!url.startsWith('http')) {
            url = `https://cloudnestra.com/prorcp/${url}`;
          }
          
          console.log(`✅ Extracted prorcp URL: ${url.substring(0, 100)}...`);
          log.push({ step: 3, action: 'Extracted prorcp URL', url: url.substring(0, 100) });
          return url;
        }
      }
    }
  }
  
  console.log('❌ No prorcp URLs found in RCP page');
  return null;
}

/**
 * Extract stream URL from prorcp page content
 */
function extractStreamUrlFromProrcp(html, log) {
  console.log('🔍 Looking for stream URLs in prorcp page content...');
  
  // First, look for shadowlandschronicles URLs
  const shadowlandsPatterns = [
    /https?:\/\/[^"'\s]*shadowlandschronicles\.com[^"'\s]*/gi,
    /"(https?:\/\/[^"]*shadowlandschronicles\.com[^"]*)"/gi,
    /'(https?:\/\/[^']*shadowlandschronicles\.com[^']*)'/gi,
    /src="([^"]*shadowlandschronicles\.com[^"]*)"/gi
  ];
  
  for (const pattern of shadowlandsPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      console.log(`📋 Found ${matches.length} potential shadowlandschronicles URLs`);
      
      for (let match of matches) {
        let url = match.replace(/['"]/g, '').replace(/src=/g, '').trim();
        if (url.includes('shadowlandschronicles.com')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          }
          
          console.log(`🎯 Found shadowlandschronicles URL: ${url.substring(0, 100)}...`);
          log.push({ step: 4, action: 'Found shadowlandschronicles URL', url: url.substring(0, 100) });
          return url; // Return shadowlands URL for further processing
        }
      }
    }
  }
  
  // If no shadowlands URL, look for direct m3u8 URLs
  const m3u8Patterns = [
    /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
    /"(https?:\/\/[^"]*\.m3u8[^"]*)"/gi,
    /'(https?:\/\/[^']*\.m3u8[^']*)'/gi,
    /file:\s*["']([^"']*\.m3u8[^"']*)/gi,
    /source:\s*["']([^"']*\.m3u8[^"']*)/gi,
    /url:\s*["']([^"']*\.m3u8[^"']*)/gi
  ];
  
  for (const pattern of m3u8Patterns) {
    const matches = html.match(pattern);
    if (matches) {
      console.log(`📋 Found ${matches.length} potential m3u8 URLs`);
      
      for (let match of matches) {
        let url = match.replace(/['"]/g, '').replace(/file:|source:|url:|src=/g, '').trim();
        if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          }
          
          console.log(`🎯 Found direct m3u8 URL: ${url.substring(0, 100)}...`);
          log.push({ step: 4, action: 'Found direct m3u8 URL', url: url.substring(0, 100) });
          return url;
        }
      }
    }
  }
  
  console.log('❌ No stream URLs found in prorcp page');
  return null;
}

/**
 * Extract m3u8 from shadowlandschronicles URL
 */
async function extractM3u8FromShadowlands(shadowlandsUrl, referer, log) {
  try {
    console.log('📡 Fetching shadowlandschronicles page for m3u8...');
    
    const response = await makeRequest(shadowlandsUrl, {
      headers: {
        'Referer': referer,
        'Origin': 'https://cloudnestra.com',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty'
      }
    });
    
    if (response.statusCode === 200) {
      const html = response.body;
      console.log(`📄 Shadowlands page fetched, size: ${html.length}`);
      log.push({ step: 5, action: 'Fetched shadowlands page', size: html.length });
      
      // Extract final m3u8 URLs
      const finalM3u8Patterns = [
        /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
        /"(https?:\/\/[^"]*\.m3u8[^"]*)"/gi,
        /'(https?:\/\/[^']*\.m3u8[^']*)'/gi,
        /file:\s*["']([^"']*\.m3u8[^"']*)/gi,
        /source:\s*["']([^"']*\.m3u8[^"']*)/gi,
        /https?:\/\/[^"'\s]*master\.m3u8[^"'\s]*/gi
      ];
      
      for (const pattern of finalM3u8Patterns) {
        const matches = html.match(pattern);
        if (matches) {
          for (let match of matches) {
            let url = match.replace(/['"]/g, '').replace(/file:|source:/g, '').trim();
            if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
              if (url.startsWith('//')) {
                url = `https:${url}`;
              }
              
              console.log(`🎯 Extracted final m3u8 from shadowlands: ${url.substring(0, 100)}...`);
              log.push({ step: 5, action: 'Extracted final m3u8 from shadowlands', url: url.substring(0, 100) });
              return url;
            }
          }
        }
      }
    } else {
      console.log(`⚠️ Shadowlands request failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Failed to fetch shadowlands page: ${error.message}`);
    log.push({ step: 5, action: 'Failed to fetch shadowlands page', error: error.message });
  }
  
  return null;
}

/**
 * Pure fetch extraction implementation with corrected URL format
 */
async function extractVidsrcxyzM3U8_PureFetch(tmdbId, mediaType, season, episode) {
  const startTime = Date.now();
  const extractionLog = [];
  
  try {
    console.log('🚀 Starting pure fetch extraction with corrected URL format');
    
    // Step 1: Build corrected vidsrc.xyz URL
    const vidsrcUrl = buildVidsrcxyzUrl(tmdbId, mediaType, season, episode);
    console.log(`🔗 Built corrected vidsrc.xyz URL: ${vidsrcUrl}`);
    extractionLog.push({ step: 1, action: 'Built corrected vidsrc.xyz URL', url: vidsrcUrl });
    
    // Step 2: Fetch vidsrc.xyz page
    console.log('📡 Fetching vidsrc.xyz page...');
    const vidsrcResponse = await makeRequest(vidsrcUrl);
    
    if (vidsrcResponse.statusCode !== 200) {
      throw new Error(`Failed to fetch vidsrc page: ${vidsrcResponse.statusCode}`);
    }
    
    const html = vidsrcResponse.body;
    console.log(`📄 Vidsrc page fetched successfully, size: ${html.length}`);
    extractionLog.push({ step: 2, action: 'Fetched vidsrc.xyz page', size: html.length });
    
    // Step 3: Extract RCP URL
    const rcpUrl = extractRcpUrlFromVidsrc(html, extractionLog);
    if (!rcpUrl) {
      throw new Error('Failed to extract RCP URL from vidsrc.xyz');
    }
    
    // Step 4: Fetch RCP page
    console.log('📡 Fetching cloudnestra RCP page...');
    const rcpResponse = await makeRequest(rcpUrl, {
      headers: { 'Referer': vidsrcUrl }
    });
    
    if (rcpResponse.statusCode !== 200) {
      throw new Error(`Failed to fetch RCP page: ${rcpResponse.statusCode}`);
    }
    
    const rcpHtml = rcpResponse.body;
    console.log(`📄 RCP page fetched successfully, size: ${rcpHtml.length}`);
    extractionLog.push({ step: 3, action: 'Fetched RCP page', size: rcpHtml.length });
    
    // Step 5: Extract prorcp URL
    const prorcpUrl = extractProrcpUrlFromRcp(rcpHtml, extractionLog);
    if (!prorcpUrl) {
      throw new Error('Failed to extract prorcp URL from RCP page');
    }
    
    // Step 6: Fetch prorcp page
    console.log('📡 Fetching cloudnestra prorcp page...');
    const prorcpResponse = await makeRequest(prorcpUrl, {
      headers: { 'Referer': rcpUrl }
    });
    
    if (prorcpResponse.statusCode !== 200) {
      throw new Error(`Failed to fetch prorcp page: ${prorcpResponse.statusCode}`);
    }
    
    const prorcpHtml = prorcpResponse.body;
    console.log(`📄 Prorcp page fetched successfully, size: ${prorcpHtml.length}`);
    extractionLog.push({ step: 4, action: 'Fetched prorcp page', size: prorcpHtml.length });
    
    // Step 7: Extract stream URL
    const streamUrlOrShadowlands = extractStreamUrlFromProrcp(prorcpHtml, extractionLog);
    if (!streamUrlOrShadowlands) {
      throw new Error('Failed to extract stream URL from prorcp page');
    }
    
    let finalStreamUrl = streamUrlOrShadowlands;
    
    // If it's a shadowlandschronicles URL, fetch the final m3u8
    if (streamUrlOrShadowlands.includes('shadowlandschronicles.com')) {
      console.log('🎯 Found shadowlandschronicles URL, extracting final m3u8...');
      const finalUrl = await extractM3u8FromShadowlands(streamUrlOrShadowlands, prorcpUrl, extractionLog);
      if (finalUrl) {
        finalStreamUrl = finalUrl;
      } else {
        console.log('⚠️ Could not extract m3u8 from shadowlands, using shadowlands URL as fallback');
        finalStreamUrl = streamUrlOrShadowlands;
      }
    }
    
    const extractionTime = Date.now() - startTime;
    console.log(`✅ Pure fetch extraction completed successfully in ${extractionTime}ms`);
    console.log(`🎯 Final stream URL: ${finalStreamUrl}`);
    
    return {
      success: true,
      streamUrl: finalStreamUrl,
      streamType: 'hls',
      extractionMethod: 'pure_fetch_corrected',
      extractionTime,
      isAccessible: null, // Would need additional check
      debug: { 
        extractionLog,
        correctedUrl: vidsrcUrl,
        urlChain: [vidsrcUrl, rcpUrl, prorcpUrl, streamUrlOrShadowlands, finalStreamUrl].filter(Boolean)
      }
    };
    
  } catch (error) {
    const extractionTime = Date.now() - startTime;
    console.log(`❌ Pure fetch extraction failed: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      extractionMethod: 'pure_fetch_corrected',
      extractionTime,
      debug: { extractionLog }
    };
  }
}

/**
 * Test the corrected VidSrcXYZ extraction
 */
async function testVidsrcxyzExtractionCorrected() {
  console.log('🧪 Testing VidSrcXYZ Extraction with Corrected URL Format');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Test Data:', TEST_DATA);

  try {
    // Test URL building
    const correctedUrl = buildVidsrcxyzUrl(TEST_DATA.tmdbId, TEST_DATA.mediaType, TEST_DATA.season, TEST_DATA.episode);
    console.log('🔗 Corrected URL:', correctedUrl);
    
    // Compare with old format
    const oldUrl = `https://vidsrc.xyz/embed/tv?tmdb=${TEST_DATA.tmdbId}&season=${TEST_DATA.season}&episode=${TEST_DATA.episode}`;
    console.log('❌ Old (incorrect) URL:', oldUrl);
    console.log('✅ New (correct) URL:', correctedUrl);
    console.log('');

    // Test pure fetch extraction
    console.log('🚀 Starting extraction test...');
    const result = await extractVidsrcxyzM3U8_PureFetch(
      TEST_DATA.tmdbId, 
      TEST_DATA.mediaType, 
      TEST_DATA.season, 
      TEST_DATA.episode
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXTRACTION RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Success:', result.success);
    console.log('⏱️ Extraction Time:', result.extractionTime + 'ms');
    console.log('🔧 Method:', result.extractionMethod);
    
    if (result.success) {
      console.log('🎯 Stream URL:', result.streamUrl);
      console.log('📺 Stream Type:', result.streamType);
      console.log('🔗 URL Chain Length:', result.debug.urlChain?.length || 0);
      console.log('📋 Extraction Steps:', result.debug.extractionLog.length);
      
      // Show URL chain
      if (result.debug.urlChain) {
        console.log('\n🔗 URL CHAIN:');
        result.debug.urlChain.forEach((url, index) => {
          console.log(`   ${index + 1}. ${url.substring(0, 80)}...`);
        });
      }
      
      // Show extraction log
      console.log('\n📋 EXTRACTION LOG:');
      result.debug.extractionLog.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.action} ${entry.url ? `(${entry.url}...)` : ''}`);
      });
    } else {
      console.log('❌ Error:', result.error);
      console.log('📋 Debug Log:', result.debug.extractionLog);
    }

    return result;

  } catch (error) {
    console.log('💥 Test crashed:', error.message);
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Run test if called directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  testVidsrcxyzExtractionCorrected()
    .then(result => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏁 TEST COMPLETED:', result.success ? '✅ PASSED' : '❌ FAILED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}

// Export for use in other modules
export {
  testVidsrcxyzExtractionCorrected,
  buildVidsrcxyzUrl,
  extractVidsrcxyzM3U8_PureFetch
};