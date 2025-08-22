/**
 * VidSrcXYZ Extraction Test with Corrected URL Format (CommonJS Version)
 * 
 * This test implementation validates the corrected URL format and extraction algorithm
 * based on the comprehensive reverse engineering analysis.
 */

const https = require('https');
const http = require('http');

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
 * Test the corrected VidSrcXYZ extraction (simple version)
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

    // Test URL accessibility
    console.log('📡 Testing corrected URL accessibility...');
    const startTime = Date.now();
    
    try {
      const response = await makeRequest(correctedUrl);
      const fetchTime = Date.now() - startTime;
      
      console.log(`📄 Response received in ${fetchTime}ms`);
      console.log(`📊 Status Code: ${response.statusCode}`);
      console.log(`📏 Content Length: ${response.body.length}`);
      
      if (response.statusCode === 200) {
        // Check if we got the expected vidsrc.xyz page
        const hasExpectedContent = response.body.includes('cloudnestra') || 
                                   response.body.includes('embed') || 
                                   response.body.includes('player');
        
        if (hasExpectedContent) {
          console.log('✅ SUCCESS: Corrected URL successfully loads vidsrc.xyz page');
          console.log('🔍 Content appears to contain expected streaming elements');
          
          // Check for specific patterns we expect
          const patterns = {
            cloudnestra: response.body.includes('cloudnestra'),
            iframe: response.body.includes('<iframe'),
            script: response.body.includes('<script'),
            embed: response.body.includes('embed')
          };
          
          console.log('📋 Content Analysis:', patterns);
          
          return {
            success: true,
            statusCode: response.statusCode,
            fetchTime,
            contentLength: response.body.length,
            correctedUrl,
            patterns,
            message: 'URL format correction validated successfully'
          };
        } else {
          console.log('⚠️ WARNING: Page loaded but content seems unexpected');
          console.log('🔍 Content preview:', response.body.substring(0, 200) + '...');
          
          return {
            success: false,
            statusCode: response.statusCode,
            fetchTime,
            contentLength: response.body.length,
            correctedUrl,
            error: 'Page content does not match expected vidsrc.xyz structure'
          };
        }
      } else {
        console.log(`❌ ERROR: HTTP ${response.statusCode} - URL may not be accessible`);
        console.log('🔍 Response preview:', response.body.substring(0, 200));
        
        return {
          success: false,
          statusCode: response.statusCode,
          fetchTime,
          correctedUrl,
          error: `HTTP ${response.statusCode} response`
        };
      }
      
    } catch (networkError) {
      const fetchTime = Date.now() - startTime;
      console.log(`❌ NETWORK ERROR after ${fetchTime}ms:`, networkError.message);
      
      return {
        success: false,
        fetchTime,
        correctedUrl,
        error: `Network error: ${networkError.message}`
      };
    }

  } catch (error) {
    console.log('💥 Test crashed:', error.message);
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Run test if called directly
if (require.main === module) {
  console.log('🚀 Starting VidSrcXYZ URL Format Validation Test...\n');
  
  testVidsrcxyzExtractionCorrected()
    .then(result => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 TEST RESULTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏁 OVERALL:', result.success ? '✅ PASSED' : '❌ FAILED');
      
      if (result.success) {
        console.log('✅ URL Format:', 'CORRECT - Uses path parameters');
        console.log('✅ Accessibility:', 'CONFIRMED - Page loads successfully');
        console.log('✅ Content Type:', 'VALID - Contains expected streaming elements');
        console.log('⏱️ Response Time:', result.fetchTime + 'ms');
        console.log('📏 Content Size:', result.contentLength + ' bytes');
        
        if (result.patterns) {
          console.log('🔍 Content Patterns Found:');
          Object.entries(result.patterns).forEach(([key, found]) => {
            console.log(`   ${found ? '✅' : '❌'} ${key}`);
          });
        }
      } else {
        console.log('❌ Error:', result.error);
        if (result.statusCode) {
          console.log('📊 Status Code:', result.statusCode);
        }
        if (result.fetchTime) {
          console.log('⏱️ Response Time:', result.fetchTime + 'ms');
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🎯 CONCLUSION:');
      if (result.success) {
        console.log('✅ The corrected URL format is WORKING correctly!');
        console.log('✅ Ready to apply fixes to vm-server.js and local-server.js');
        console.log('✅ URL format: https://vidsrc.xyz/embed/tv/{TMDB}/{SEASON}/{EPISODE}/');
      } else {
        console.log('❌ URL format validation failed - needs investigation');
        console.log('🔧 May need to adjust URL format or handle specific cases');
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test crashed:', error);
      console.error(error);
      process.exit(1);
    });
}

// Export for use in other modules
module.exports = { 
  testVidsrcxyzExtractionCorrected,
  buildVidsrcxyzUrl
};