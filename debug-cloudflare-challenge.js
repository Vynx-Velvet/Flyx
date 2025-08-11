// Debug script to understand the Cloudflare challenge
async function debugCloudflareChallenge() {
  console.log('🔍 Debugging Cloudflare challenge...');
  
  try {
    // Test URL
    const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550';
    
    // Step 1: Get vidsrc page
    const vidsrcResponse = await fetch(testUrl);
    const vidsrcHtml = await vidsrcResponse.text();
    
    // Extract cloudnestra URL with multiple patterns
    const cloudnestraPatterns = [
      /src="(https?:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/,
      /src="(\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/,
      /"(https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/,
      /https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+/,
      /\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+/
    ];
    
    let cloudnestraUrl = null;
    for (const pattern of cloudnestraPatterns) {
      const match = vidsrcHtml.match(pattern);
      if (match) {
        let url = match[1] || match[0];
        url = url.replace(/src="|"/g, '').trim();
        if (url.startsWith('//')) {
          url = `https:${url}`;
        }
        cloudnestraUrl = url;
        break;
      }
    }
    
    if (!cloudnestraUrl) {
      console.log('❌ No cloudnestra URL found');
      console.log('Vidsrc HTML preview:', vidsrcHtml.substring(0, 1000));
      return;
    }
    
    console.log('✅ Found cloudnestra URL:', cloudnestraUrl);
    
    // Step 2: Try different approaches to get past Cloudflare
    const approaches = [
      {
        name: 'Standard headers',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': testUrl
        }
      },
      {
        name: 'Mobile user agent',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': testUrl
        }
      },
      {
        name: 'Minimal headers',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': testUrl
        }
      }
    ];
    
    for (const approach of approaches) {
      console.log(`\n🧪 Testing: ${approach.name}`);
      
      try {
        const response = await fetch(cloudnestraUrl, { headers: approach.headers });
        const html = await response.text();
        
        console.log(`Status: ${response.status}`);
        console.log(`Size: ${html.length} bytes`);
        
        // Check for different types of content
        if (html.includes('cf-turnstile')) {
          console.log('❌ Cloudflare Turnstile challenge detected');
        } else if (html.includes('challenges.cloudflare.com')) {
          console.log('❌ Cloudflare challenge detected');
        } else if (html.includes('/prorcp/')) {
          console.log('✅ Found prorcp reference!');
          
          // Extract prorcp URL
          const prorcpMatch = html.match(/\/prorcp\/[A-Za-z0-9+\/=]+/);
          if (prorcpMatch) {
            console.log('✅ Extracted prorcp path:', prorcpMatch[0]);
          }
        } else if (html.includes('loadIframe')) {
          console.log('✅ Found loadIframe function - might contain prorcp');
          
          // Look for iframe src in JavaScript
          const iframeSrcMatch = html.match(/src:\s*['"]([^'"]+)['"]/);
          if (iframeSrcMatch) {
            console.log('✅ Found iframe src:', iframeSrcMatch[1]);
          }
        } else {
          console.log('⚠️ Unknown content type');
          console.log('First 500 chars:', html.substring(0, 500));
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    // Step 3: Try constructing prorcp URL directly
    console.log('\n🔧 Trying direct prorcp construction...');
    const rcpPath = cloudnestraUrl.split('/rcp/')[1];
    const prorcpUrl = `https://cloudnestra.com/prorcp/${rcpPath}`;
    
    console.log('Constructed prorcp URL:', prorcpUrl);
    
    try {
      const prorcpResponse = await fetch(prorcpUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': cloudnestraUrl
        }
      });
      
      const prorcpHtml = await prorcpResponse.text();
      console.log(`Prorcp status: ${prorcpResponse.status}`);
      console.log(`Prorcp size: ${prorcpHtml.length} bytes`);
      
      if (prorcpHtml.includes('shadowlandschronicles.com')) {
        console.log('✅ Found shadowlands URL in prorcp!');
        
        const shadowlandsMatch = prorcpHtml.match(/https?:\/\/[^"'\s]*shadowlandschronicles\.com[^"'\s]*/);
        if (shadowlandsMatch) {
          console.log('✅ Shadowlands URL:', shadowlandsMatch[0]);
          
          // Test shadowlands URL
          try {
            const shadowlandsResponse = await fetch(shadowlandsMatch[0], {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': prorcpUrl
              }
            });
            
            const shadowlandsHtml = await shadowlandsResponse.text();
            console.log(`Shadowlands status: ${shadowlandsResponse.status}`);
            console.log(`Shadowlands size: ${shadowlandsHtml.length} bytes`);
            
            // Look for m3u8
            const m3u8Match = shadowlandsHtml.match(/https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/);
            if (m3u8Match) {
              console.log('🎯 SUCCESS! Found m3u8 URL:', m3u8Match[0]);
            } else {
              console.log('❌ No m3u8 URL found in shadowlands page');
              console.log('Shadowlands content preview:', shadowlandsHtml.substring(0, 500));
            }
            
          } catch (error) {
            console.log(`❌ Error fetching shadowlands: ${error.message}`);
          }
        }
      } else if (prorcpHtml.includes('cf-turnstile')) {
        console.log('❌ Prorcp also has Cloudflare challenge');
      } else {
        console.log('⚠️ Prorcp content unknown');
        console.log('First 500 chars:', prorcpHtml.substring(0, 500));
      }
      
    } catch (error) {
      console.log(`❌ Error fetching prorcp: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCloudflareChallenge();