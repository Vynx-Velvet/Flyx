async function extractFullChain() {
  try {
    console.log('=== Starting Full Extraction Chain ===\n');
    
    // Step 1: Fetch VidSrc page
    console.log('Step 1: Fetching VidSrc page...');
    const vidsrcUrl = "https://vidsrc.xyz/embed/tv/259909/1/2/";
    const vidsrcResponse = await fetch(vidsrcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });
    
    const vidsrcHtml = await vidsrcResponse.text();
    console.log(`✓ VidSrc HTML received (${vidsrcHtml.length} bytes)\n`);
    
    // Step 2: Extract CloudNestra RCP URL from VidSrc
    console.log('Step 2: Extracting CloudNestra RCP URL...');
    const cloudNestraUrl = extractCloudNestraUrl(vidsrcHtml);
    
    if (!cloudNestraUrl) {
      throw new Error('CloudNestra URL not found in VidSrc HTML');
    }
    console.log(`✓ CloudNestra URL found: ${cloudNestraUrl}\n`);
    
    // Step 3: Fetch CloudNestra page
    console.log('Step 3: Fetching CloudNestra page...');
    const cloudNestraResponse = await fetch(cloudNestraUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': vidsrcUrl
      }
    });
    
    const cloudNestraHtml = await cloudNestraResponse.text();
    console.log(`✓ CloudNestra HTML received (${cloudNestraHtml.length} bytes)\n`);
    
    // Step 4: Extract ProRCP URL from CloudNestra
    console.log('Step 4: Extracting ProRCP URL...');
    const proRcpPath = extractProRcpUrl(cloudNestraHtml);
    
    if (!proRcpPath) {
      throw new Error('ProRCP URL not found in CloudNestra HTML');
    }
    
    // Build full ProRCP URL
    const proRcpUrl = proRcpPath.startsWith('http') 
      ? proRcpPath 
      : `https://cloudnestra.com${proRcpPath}`;
    
    console.log(`✓ ProRCP URL found: ${proRcpUrl}\n`);
    
    // Step 5: Fetch ProRCP page
    console.log('Step 5: Fetching ProRCP page...');
    const proRcpResponse = await fetch(proRcpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': cloudNestraUrl
      }
    });
    
    const proRcpHtml = await proRcpResponse.text();
    console.log(`✓ ProRCP HTML received (${proRcpHtml.length} bytes)\n`);
    
    // Step 6: Extract Shadowlands URL from ProRCP
    console.log('Step 6: Extracting Shadowlands URL...');
    const shadowlandsUrl = extractShadowlandsUrl(proRcpHtml);
    
    if (!shadowlandsUrl) {
      throw new Error('Shadowlands URL not found in ProRCP HTML');
    }
    console.log(`✓ Shadowlands URL found: ${shadowlandsUrl}\n`);
    
    return {
      vidsrcUrl,
      cloudNestraUrl,
      proRcpUrl,
      shadowlandsUrl
    };
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
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
        
        if (match.includes('<iframe')) {
          const srcMatch = match.match(/src\s*=\s*["']([^"']*)["']/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        } else if (match.match(/^["'][^]*["']$/)) {
          url = match.substring(1, match.length - 1);
        }
        
        url = url.trim();
        
        if (url.includes('cloudnestra.com/rcp')) {
          if (url.startsWith('//')) {
            url = `https:${url}`;
          } else if (!url.startsWith('http')) {
            url = `https://${url}`;
          }
          
          const urlEndIndex = url.search(/(%3E|>|%20|\s)/);
          if (urlEndIndex > 0) {
            url = url.substring(0, urlEndIndex);
          }
          
          return url; // Return first valid URL
        }
      }
    }
  }
  
  return null;
}

function extractProRcpUrl(html) {
  const patterns = [
    // jQuery iframe creation with src: '/prorcp/...'
    /\$\(['"]<iframe['"]\s*,\s*\{[^}]*src:\s*['"]([^'"]*prorcp[^'"]+)['"]/gi,
    /src:\s*['"]\/prorcp\/([^'"]+)['"]/gi,
    /src:\s*['"]([^'"]*\/prorcp\/[^'"]+)['"]/gi,
    
    // Direct iframe tags
    /<iframe[^>]*src\s*=\s*["']([^"']*prorcp[^"']*)["'][^>]*>/gi,
    /iframe\.src\s*=\s*["']([^"']*prorcp[^'"]*)['"]/gi,
    
    // Generic patterns for ProRCP URLs
    /\/prorcp\/[A-Za-z0-9+\/=]+/g,
    /['"]\/prorcp\/([^'"]+)['"]/g,
    /["']([^'"]*prorcp[^'"]+)['"]/g
  ];

  console.log('Searching for ProRCP URL patterns...');
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const matches = html.match(pattern);
    
    if (matches && matches.length > 0) {
      console.log(`  Pattern ${i + 1} found ${matches.length} match(es)`);
      
      for (const match of matches) {
        let url = match;
        
        // Extract from jQuery iframe syntax
        if (match.includes('$') || match.includes('src:')) {
          const srcMatch = match.match(/src:\s*['"]([^'"]+)['"]/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        }
        // Extract from iframe tag
        else if (match.includes('<iframe')) {
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
        
        // Check if it's a ProRCP URL
        if (url.includes('prorcp')) {
          // Clean up the URL
          if (!url.startsWith('/') && !url.startsWith('http')) {
            url = '/' + url;
          }
          
          console.log(`  Found ProRCP path: ${url.substring(0, 50)}...`);
          return url; // Return first valid ProRCP URL
        }
      }
    }
  }
  
  // If no patterns matched, show a sample of the HTML for debugging
  console.log('\n  No ProRCP URL found. HTML sample:');
  const sampleStart = html.indexOf('prorcp');
  if (sampleStart !== -1) {
    console.log('  ' + html.substring(Math.max(0, sampleStart - 100), Math.min(html.length, sampleStart + 200)));
  } else {
    console.log('  (No "prorcp" text found in HTML)');
  }
  
  return null;
}

function extractShadowlandsUrl(html) {
  const patterns = [
    // Playerjs file parameter - most common pattern
    /new\s+Playerjs\s*\([^)]*file\s*:\s*['"]([^'"]*shadowlands[^'"]+\.m3u8[^'"]*)['"]/gi,
    /\bfile\s*:\s*['"]([^'"]*shadowlands[^'"]+\.m3u8[^'"]*)['"]/gi,
    
    // Direct shadowlands URLs
    /https?:\/\/[^\s"'<>]*shadowlands[^\s"'<>]*\.m3u8[^\s"'<>]*/gi,
    /['"]([^'"]*shadowlands[^'"]*\.m3u8[^'"]*)['"]/gi,
    
    // Player configurations
    /player[^{]*\{[^}]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/gi,
    /source\s*:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/gi,
    /src\s*:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/gi,
    
    // Any m3u8 URL (fallback)
    /['"]([^'"]*\.m3u8[^'"]*)['"]/gi,
    /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi
  ];

  console.log('Searching for Shadowlands URL patterns...');
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const matches = html.match(pattern);
    
    if (matches && matches.length > 0) {
      console.log(`  Pattern ${i + 1} found ${matches.length} match(es)`);
      
      for (const match of matches) {
        let url = match;
        
        // Extract URL from Playerjs syntax
        if (match.includes('Playerjs') || match.includes('file')) {
          const fileMatch = match.match(/file\s*:\s*['"]([^'"]+)['"]/i);
          if (fileMatch && fileMatch[1]) {
            url = fileMatch[1];
          }
        }
        // Extract URL from source/src
        else if (match.includes('source') || match.includes('src')) {
          const srcMatch = match.match(/(?:source|src)\s*:\s*['"]([^'"]+)['"]/i);
          if (srcMatch && srcMatch[1]) {
            url = srcMatch[1];
          }
        }
        // Remove quotes if present
        else if (match.match(/^["'][^]*["']$/)) {
          url = match.substring(1, match.length - 1);
        }
        
        url = url.trim();
        
        // Check if it's a valid stream URL
        if (url.includes('.m3u8')) {
          // Ensure it's a full URL
          if (!url.startsWith('http')) {
            if (url.startsWith('//')) {
              url = `https:${url}`;
            } else if (url.startsWith('/')) {
              url = `https://tmstr2.shadowlandschronicles.com${url}`;
            } else {
              url = `https://${url}`;
            }
          }
          
          console.log(`  Found Shadowlands URL: ${url.substring(0, 80)}...`);
          return url; // Return first valid m3u8 URL
        }
      }
    }
  }
  
  // If no patterns matched, show a sample of the HTML for debugging
  console.log('\n  No Shadowlands URL found. HTML sample:');
  const sampleStart = Math.max(0, html.indexOf('m3u8') - 100);
  if (html.indexOf('m3u8') !== -1) {
    console.log('  ' + html.substring(sampleStart, Math.min(html.length, sampleStart + 300)));
  } else {
    const playerStart = html.indexOf('Playerjs');
    if (playerStart !== -1) {
      console.log('  ' + html.substring(Math.max(0, playerStart - 50), Math.min(html.length, playerStart + 250)));
    } else {
      console.log('  (No "m3u8" or "Playerjs" text found in HTML)');
    }
  }
  
  return null;
}

// Run the full extraction chain
extractFullChain()
  .then(result => {
    console.log('=== ✅ Extraction Complete ===');
    console.log('\n📍 Final URLs:');
    console.log('  1. VidSrc:', result.vidsrcUrl);
    console.log('  2. CloudNestra:', result.cloudNestraUrl);
    console.log('  3. ProRCP:', result.proRcpUrl);
    console.log('  4. Shadowlands:', result.shadowlandsUrl);
    
    console.log('\n🎯 The Shadowlands URL is the final streaming URL!');
    console.log('📺 This URL can be played directly in a video player');
  })
  .catch(error => {
    console.error('\n=== ❌ Extraction Failed ===');
    console.error('Error:', error.message);
    process.exit(1);
  });
