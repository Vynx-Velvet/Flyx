// Advanced fetch-based extraction that handles Cloudflare challenges
async function advancedFetchExtraction(vidsrcUrl, logger) {
  const extractionStart = Date.now();
  logger.info('Starting advanced fetch-based extraction with challenge handling');
  
  try {
    // Step 1: Fetch the vidsrc page to get the cloudnestra/rcp URL
    logger.info('Fetching vidsrc page', { url: vidsrcUrl.substring(0, 100) });
    
    const vidsrcResponse = await fetch(vidsrcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!vidsrcResponse.ok) {
      throw new Error(`Failed to fetch vidsrc page: ${vidsrcResponse.status}`);
    }

    const vidsrcHtml = await vidsrcResponse.text();
    logger.info('Fetched vidsrc page', { size: vidsrcHtml.length });

    // Extract cloudnestra/rcp URL with improved patterns
    const cloudnestraPatterns = [
      /src="(https?:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/g,
      /src="(\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/g,
      /"(https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/g,
      /'(https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)'/g,
      /https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+/g,
      /\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+/g
    ];

    let cloudnestraUrl = null;
    for (const pattern of cloudnestraPatterns) {
      const matches = vidsrcHtml.match(pattern);
      if (matches) {
        for (const match of matches) {
          let url = match.replace(/src="|"|'/g, '').trim();
          if (url.includes('cloudnestra.com/rcp')) {
            if (url.startsWith('//')) {
              url = `https:${url}`;
            } else if (!url.startsWith('http')) {
              url = `https://${url}`;
            }
            cloudnestraUrl = url;
            break;
          }
        }
        if (cloudnestraUrl) break;
      }
    }

    if (!cloudnestraUrl) {
      throw new Error('Could not find cloudnestra/rcp URL in vidsrc page');
    }

    logger.info('Found cloudnestra/rcp URL', { url: cloudnestraUrl.substring(0, 100) });

    // Step 2: Try to get the prorcp URL directly from the RCP page
    logger.info('Fetching cloudnestra/rcp page');
    
    const rcpResponse = await fetch(cloudnestraUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': vidsrcUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!rcpResponse.ok) {
      throw new Error(`Failed to fetch rcp page: ${rcpResponse.status}`);
    }

    const rcpHtml = await rcpResponse.text();
    logger.info('Fetched rcp page', { size: rcpHtml.length });

    // Check if there's a Cloudflare challenge
    if (rcpHtml.includes('cf-turnstile') || rcpHtml.includes('challenges.cloudflare.com')) {
      logger.warn('Cloudflare Turnstile challenge detected, trying alternative approach');
      
      // Try to extract the prorcp URL from the RCP URL itself by decoding the base64
      const rcpPath = cloudnestraUrl.split('/rcp/')[1];
      if (rcpPath) {
        logger.info('Attempting to decode RCP path for direct prorcp access');
        
        // Try constructing prorcp URL directly
        const possibleProrcp = `https://cloudnestra.com/prorcp/${rcpPath}`;
        logger.info('Trying constructed prorcp URL', { url: possibleProrcp.substring(0, 100) });
        
        // Test if the constructed URL works
        const testResponse = await fetch(possibleProrcp, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': cloudnestraUrl
          }
        });
        
        if (testResponse.ok) {
          logger.info('Constructed prorcp URL is accessible, proceeding');
          
          // Fetch the prorcp page directly
          const prorcpResponse = await fetch(possibleProrcp, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Referer': cloudnestraUrl,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
          });

          if (prorcpResponse.ok) {
            const prorcpHtml = await prorcpResponse.text();
            logger.info('Fetched prorcp page directly', { size: prorcpHtml.length });

            // Extract shadowlands URL and m3u8
            const result = await extractStreamFromProrcp(prorcpHtml, possibleProrcp, logger);
            if (result.success) {
              const extractionTime = Date.now() - extractionStart;
              return {
                ...result,
                debug: {
                  ...result.debug,
                  cloudnestraUrl: cloudnestraUrl.substring(0, 100),
                  prorcpUrl: possibleProrcp.substring(0, 100),
                  extractionTime,
                  method: 'direct_prorcp_construction'
                }
              };
            }
          }
        }
      }
      
      throw new Error('Cloudflare challenge detected and alternative methods failed');
    }

    // If no challenge, proceed with normal extraction
    const prorcpPatterns = [
      /src:\s*['"]\/prorcp\/([A-Za-z0-9+\/=]+)['"]/g,
      /\/prorcp\/[A-Za-z0-9+\/=]+/g,
      /'\/prorcp\/([A-Za-z0-9+\/=]+)'/g,
      /"\/prorcp\/([A-Za-z0-9+\/=]+)"/g
    ];

    let prorcpUrl = null;
    for (const pattern of prorcpPatterns) {
      const matches = rcpHtml.match(pattern);
      if (matches) {
        for (const match of matches) {
          let url = match.replace(/src:\s*['"]|['"]|src=/g, '').trim();
          if (url.includes('/prorcp/')) {
            prorcpUrl = `https://cloudnestra.com${url}`;
            break;
          }
        }
        if (prorcpUrl) break;
      }
    }

    if (!prorcpUrl) {
      throw new Error('Could not find prorcp URL in rcp page');
    }

    logger.info('Found prorcp URL', { url: prorcpUrl.substring(0, 100) });

    // Fetch prorcp page
    const prorcpResponse = await fetch(prorcpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': cloudnestraUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    if (!prorcpResponse.ok) {
      throw new Error(`Failed to fetch prorcp page: ${prorcpResponse.status}`);
    }

    const prorcpHtml = await prorcpResponse.text();
    logger.info('Fetched prorcp page', { size: prorcpHtml.length });

    // Extract stream from prorcp
    const result = await extractStreamFromProrcp(prorcpHtml, prorcpUrl, logger);
    if (result.success) {
      const extractionTime = Date.now() - extractionStart;
      return {
        ...result,
        debug: {
          ...result.debug,
          cloudnestraUrl: cloudnestraUrl.substring(0, 100),
          prorcpUrl: prorcpUrl.substring(0, 100),
          extractionTime
        }
      };
    }

    throw new Error('Failed to extract stream from prorcp page');

  } catch (error) {
    const extractionTime = Date.now() - extractionStart;
    logger.error('Advanced fetch extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: 'advanced_fetch',
      debug: { extractionTime }
    };
  }
}

// Helper function to extract stream from prorcp HTML
async function extractStreamFromProrcp(prorcpHtml, prorcpUrl, logger) {
  // Extract shadowlands URL
  const shadowlandsPatterns = [
    /https?:\/\/[^"'\s]*shadowlandschronicles\.com[^"'\s]*/g,
    /"(https?:\/\/[^"]*shadowlandschronicles\.com[^"]*)"/g,
    /'(https?:\/\/[^']*shadowlandschronicles\.com[^']*)'/g,
    /src="([^"]*shadowlandschronicles\.com[^"]*)"/g
  ];

  let shadowlandsUrl = null;
  for (const pattern of shadowlandsPatterns) {
    const matches = prorcpHtml.match(pattern);
    if (matches) {
      for (const match of matches) {
        let url = match.replace(/['"]/g, '').replace(/src=/g, '').trim();
        if (url.includes('shadowlandschronicles.com')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          }
          shadowlandsUrl = url;
          break;
        }
      }
      if (shadowlandsUrl) break;
    }
  }

  if (!shadowlandsUrl) {
    return { success: false, error: 'No shadowlands URL found in prorcp page' };
  }

  logger.info('Found shadowlands URL, fetching for m3u8', { url: shadowlandsUrl.substring(0, 100) });

  // Fetch shadowlands page for m3u8
  const shadowlandsResponse = await fetch(shadowlandsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': prorcpUrl,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
  });

  if (!shadowlandsResponse.ok) {
    return { success: false, error: `Failed to fetch shadowlands page: ${shadowlandsResponse.status}` };
  }

  const shadowlandsHtml = await shadowlandsResponse.text();
  logger.info('Fetched shadowlands page', { size: shadowlandsHtml.length });

  // Extract m3u8 URL
  const m3u8Patterns = [
    /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
    /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
    /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
    /file:\s*["']([^"']*\.m3u8[^"']*)/g,
    /source:\s*["']([^"']*\.m3u8[^"']*)/g
  ];

  let m3u8Url = null;
  for (const pattern of m3u8Patterns) {
    const matches = shadowlandsHtml.match(pattern);
    if (matches) {
      for (const match of matches) {
        let url = match.replace(/['"]/g, '').replace(/file:|source:/g, '').trim();
        if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          }
          m3u8Url = url;
          break;
        }
      }
      if (m3u8Url) break;
    }
  }

  if (!m3u8Url) {
    return { success: false, error: 'No m3u8 URL found in shadowlands page' };
  }

  logger.info('Found m3u8 URL', { url: m3u8Url });

  return {
    success: true,
    streamUrl: m3u8Url,
    streamType: 'hls',
    server: 'vidsrc.xyz',
    extractionMethod: 'advanced_fetch',
    requiresProxy: true,
    debug: {
      shadowlandsUrl: shadowlandsUrl.substring(0, 100),
      m3u8Url: m3u8Url.substring(0, 100)
    }
  };
}

// Test the advanced extraction
async function testAdvancedExtraction() {
  console.log('🚀 Testing advanced fetch extraction...');
  
  const logger = {
    info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`WARN: ${msg}`, data || ''),
    error: (msg, error) => console.error(`ERROR: ${msg}`, error?.message || error),
    debug: (msg, data) => console.log(`DEBUG: ${msg}`, data || '')
  };

  const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550'; // Fight Club
  const result = await advancedFetchExtraction(testUrl, logger);
  
  console.log('\n🎯 RESULT:');
  console.log(JSON.stringify(result, null, 2));
}

// Export for use in other files
module.exports = { advancedFetchExtraction };

// Run test if called directly
if (require.main === module) {
  testAdvancedExtraction();
}