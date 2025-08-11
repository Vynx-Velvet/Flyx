const puppeteer = require('puppeteer');

// Fast fetch-based extraction
async function fastFetchExtraction(vidsrcUrl, logger) {
  logger.info('Starting fast fetch-based extraction');
  
  let browser = null;
  let page = null;

  try {
    // Step 1: Use Puppeteer only to get the cloudnestra/rcp URL
    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Use system Chrome
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    page = await browser.newPage();
    await page.goto(vidsrcUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract cloudnestra/rcp URL from iframe
    const cloudnestraUrl = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        if (iframe.src && iframe.src.includes('cloudnestra.com/rcp')) {
          return iframe.src;
        }
      }
      return null;
    });

    await browser.close();
    browser = null;

    if (!cloudnestraUrl) {
      throw new Error('Could not find cloudnestra/rcp URL');
    }

    logger.info('Found cloudnestra/rcp URL', { url: cloudnestraUrl.substring(0, 100) });

    // Step 2: Fetch the cloudnestra/rcp page to get the prorcp URL
    const rcpResponse = await fetch(cloudnestraUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': vidsrcUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    if (!rcpResponse.ok) {
      throw new Error(`Failed to fetch rcp page: ${rcpResponse.status}`);
    }

    const rcpHtml = await rcpResponse.text();
    logger.info('Fetched rcp page', { size: rcpHtml.length });

    // Extract prorcp URL from the HTML
    const prorcpUrlMatch = rcpHtml.match(/src="([^"]*cloudnestra\.com\/prorcp[^"]*)"/);
    if (!prorcpUrlMatch) {
      // Try alternative patterns
      const altMatch = rcpHtml.match(/cloudnestra\.com\/prorcp\/[^"'\s]+/);
      if (!altMatch) {
        throw new Error('Could not find prorcp URL in rcp page');
      }
      var prorcpUrl = altMatch[0].startsWith('http') ? altMatch[0] : `https://${altMatch[0]}`;
    } else {
      var prorcpUrl = prorcpUrlMatch[1];
    }

    logger.info('Found prorcp URL', { url: prorcpUrl.substring(0, 100) });

    // Step 3: Fetch the prorcp page to get the master.m3u8
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

    // Extract m3u8 URL from the HTML
    const m3u8Patterns = [
      /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
      /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
      /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
      /src="([^"]*\.m3u8[^"]*)"/g,
      /file:\s*["']([^"']*\.m3u8[^"']*)/g
    ];

    let m3u8Url = null;
    for (const pattern of m3u8Patterns) {
      const matches = prorcpHtml.match(pattern);
      if (matches) {
        // Find the best match (usually the longest or most complete URL)
        for (const match of matches) {
          const url = match.replace(/['"]/g, '').replace('src=', '').replace('file:', '').trim();
          if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
            m3u8Url = url.startsWith('//') ? `https:${url}` : url;
            break;
          }
        }
        if (m3u8Url) break;
      }
    }

    if (!m3u8Url) {
      // Log the HTML for debugging
      logger.debug('prorcp HTML content', { html: prorcpHtml.substring(0, 1000) });
      throw new Error('Could not find m3u8 URL in prorcp page');
    }

    logger.info('Found m3u8 URL', { url: m3u8Url });

    // Step 4: Verify the m3u8 URL is accessible
    const m3u8Response = await fetch(m3u8Url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': prorcpUrl
      }
    });

    if (!m3u8Response.ok) {
      logger.warn('m3u8 URL not accessible via HEAD request, trying GET');
      
      const m3u8GetResponse = await fetch(m3u8Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': prorcpUrl
        }
      });
      
      if (!m3u8GetResponse.ok) {
        throw new Error(`m3u8 URL not accessible: ${m3u8GetResponse.status}`);
      }
    }

    return {
      success: true,
      streamUrl: m3u8Url,
      streamType: 'hls',
      server: 'vidsrc.xyz',
      extractionMethod: 'fast_fetch',
      requiresProxy: true,
      debug: {
        cloudnestraUrl: cloudnestraUrl.substring(0, 100),
        prorcpUrl: prorcpUrl.substring(0, 100),
        m3u8Url: m3u8Url.substring(0, 100)
      }
    };

  } catch (error) {
    logger.error('Fast fetch extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: 'fast_fetch'
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        logger.debug('Error closing browser');
      }
    }
  }
}

// Test the fast extraction
async function testFastExtraction() {
  console.log('🚀 Testing fast fetch extraction...');
  
  const logger = {
    info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`WARN: ${msg}`, data || ''),
    error: (msg, error) => console.error(`ERROR: ${msg}`, error?.message || error),
    debug: (msg, data) => console.log(`DEBUG: ${msg}`, data || '')
  };

  const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550'; // Fight Club
  const result = await fastFetchExtraction(testUrl, logger);
  
  console.log('\n🎯 RESULT:');
  console.log(JSON.stringify(result, null, 2));
}

// Export for use in other files
module.exports = { fastFetchExtraction };

// Run test if called directly
if (require.main === module) {
  testFastExtraction();
}