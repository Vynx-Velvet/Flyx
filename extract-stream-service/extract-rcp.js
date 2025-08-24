/**
 * Extract CloudNestra RCP URL from VidSrc HTML
 * This uses simple HTTP requests like Insomnia does
 */

async function extractRCPFromVidSrc(vidsrcUrl) {
  try {
    console.log(`Fetching VidSrc page: ${vidsrcUrl}`);
    
    // Simple fetch like Insomnia
    const response = await fetch(vidsrcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`VidSrc returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Received HTML (${html.length} bytes)`);

    // Extract CloudNestra RCP URL from HTML
    const rcpUrl = extractCloudNestraUrl(html);
    
    if (rcpUrl) {
      console.log(`✅ Extracted RCP URL: ${rcpUrl}`);
      return rcpUrl;
    } else {
      throw new Error('No CloudNestra RCP URL found in VidSrc HTML');
    }
    
  } catch (error) {
    console.error('Error extracting RCP URL:', error.message);
    throw error;
  }
}

function extractCloudNestraUrl(html) {
  const patterns = [
    /<iframe[^>]*src\s*=\s*["']([^"']*cloudnestra\.com\/rcp[^"']*)["'][^>]*>/gi,
    /src\s*=\s*["']([^"']*cloudnestra\.com\/rcp[^\s"']*)/gi,
    /https:\/\/cloudnestra\.com\/rcp\/[^\s"'>]*/gi,
    /["'](https:\/\/cloudnestra\.com\/rcp\/[^"']*)["']/gi,
    /\/\/cloudnestra\.com\/rcp\/[^\s"'>]*/gi
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        let url = match;
        
        // Extract URL from iframe tag
        if (match.includes('<iframe')) {
          const srcMatch = match.match(/src\s*=\s*["']([^"']*)["']/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        } 
        // Remove quotes if present
        else if (match.match(/^["'][^]*["']$/)) {
          url = match.substring(1, match.length - 1);
        }
        
        url = url.trim();
        
        // Validate and clean the URL
        if (url.includes('cloudnestra.com/rcp')) {
          // Add protocol if missing
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (!url.startsWith('http')) {
            url = `https://${url}`;
          }
          
          // Remove any trailing garbage characters
          const urlEndIndex = url.search(/(%3E|>|%20|\s|"|')/);
          if (urlEndIndex > 0) {
            url = url.substring(0, urlEndIndex);
          }
          
          // Validate URL format
          try {
            new URL(url);
            return url; // Return first valid URL found
          } catch (e) {
            console.warn(`Invalid URL format: ${url}`);
            continue;
          }
        }
      }
    }
  }
  
  return null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractRCPFromVidSrc, extractCloudNestraUrl };
}

// CLI usage
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node extract-rcp.js <vidsrc-url>');
    console.log('Example: node extract-rcp.js "https://vidsrc.xyz/embed/tv/259909/1/1/"');
    process.exit(1);
  }
  
  extractRCPFromVidSrc(url)
    .then(rcpUrl => {
      console.log('\n🎯 Final RCP URL:');
      console.log(rcpUrl);
    })
    .catch(error => {
      console.error('\n❌ Extraction failed:', error.message);
      process.exit(1);
    });
}