const puppeteer = require('puppeteer');

async function debugExtraction() {
  console.log('🐛 Starting debug extraction test...');
  
  let browser = null;
  let page = null;

  try {
    // Launch browser in non-headless mode for debugging
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      slowMo: 100,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--window-size=1920,1080'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Test URL - using a known movie ID
    const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550'; // Fight Club
    console.log(`📍 Navigating to: ${testUrl}`);

    // Set up network monitoring
    const networkRequests = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.m3u8') || url.includes('playlist') || url.includes('stream') || url.includes('shadowlands')) {
        networkRequests.push({
          url,
          status: response.status(),
          headers: response.headers()
        });
        console.log(`🌐 Network: ${url}`);
      }
    });

    // Navigate to the page
    await page.goto(testUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    console.log('✅ Page loaded');

    // Wait for initial load
    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for iframes
    const iframes = await page.$$('iframe');
    console.log(`🖼️  Found ${iframes.length} iframes`);

    for (let i = 0; i < iframes.length; i++) {
      try {
        const src = await iframes[i].evaluate(el => el.src);
        console.log(`  Iframe ${i + 1}: ${src}`);
        
        // If it's a vidsrc iframe, try to access it
        if (src && src.includes('vidsrc')) {
          console.log(`🔍 Investigating vidsrc iframe...`);
          
          try {
            const frame = await iframes[i].contentFrame();
            if (frame) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Look for nested iframes
              const nestedIframes = await frame.$$('iframe');
              console.log(`  Found ${nestedIframes.length} nested iframes`);
              
              for (let j = 0; j < nestedIframes.length; j++) {
                try {
                  const nestedSrc = await nestedIframes[j].evaluate(el => el.src);
                  console.log(`    Nested iframe ${j + 1}: ${nestedSrc}`);
                } catch (e) {
                  console.log(`    Could not access nested iframe ${j + 1} (CORS)`);
                }
              }
              
              // Look for the specific play button: <i id="pl_but" class="fas fa-play"></i>
              const playButtons = await frame.$$('i#pl_but.fas.fa-play, #pl_but, i.fas.fa-play');
              console.log(`  Found ${playButtons.length} play buttons in iframe`);
              
              if (playButtons.length > 0) {
                console.log('🎮 Found play button element, checking visibility...');
                
                // Check if the play button is visible and clickable
                const isVisible = await playButtons[0].evaluate(el => {
                  const rect = el.getBoundingClientRect();
                  const style = window.getComputedStyle(el);
                  return rect.width > 0 && rect.height > 0 && 
                         style.visibility !== 'hidden' && 
                         style.display !== 'none';
                });
                
                console.log(`  Play button visible: ${isVisible}`);
                
                if (isVisible) {
                  console.log('🎮 Clicking play button...');
                  
                  // Simulate human-like interaction
                  await playButtons[0].hover();
                  await new Promise(resolve => setTimeout(resolve, 500));
                  await playButtons[0].click();
                  
                  console.log('✅ Play button clicked, waiting for response...');
                  await new Promise(resolve => setTimeout(resolve, 8000)); // Wait longer for iframe chain
                  
                  // Check for new iframes after clicking
                  const newIframes = await frame.$$('iframe');
                  console.log(`  After click: Found ${newIframes.length} iframes in frame`);
                  
                  for (let k = 0; k < newIframes.length; k++) {
                    try {
                      const newSrc = await newIframes[k].evaluate(el => el.src);
                      console.log(`    New iframe ${k + 1}: ${newSrc}`);
                      
                      // Check if this is a prorcp or shadowlands iframe
                      if (newSrc && (newSrc.includes('prorcp') || newSrc.includes('shadowlands'))) {
                        console.log(`🎯 Found target iframe: ${newSrc}`);
                      }
                    } catch (e) {
                      console.log(`    Could not access new iframe ${k + 1} (CORS)`);
                    }
                  }
                } else {
                  console.log('⚠️  Play button not visible or clickable');
                }
              }
            }
          } catch (e) {
            console.log(`  Could not access iframe content (CORS): ${e.message}`);
          }
        }
      } catch (e) {
        console.log(`  Could not get src for iframe ${i + 1}`);
      }
    }

    // Check for video elements
    const videos = await page.$$('video');
    console.log(`🎥 Found ${videos.length} video elements`);

    for (let i = 0; i < videos.length; i++) {
      try {
        const src = await videos[i].evaluate(el => el.src || el.currentSrc);
        if (src) {
          console.log(`  Video ${i + 1} src: ${src}`);
        }
      } catch (e) {
        console.log(`  Could not get src for video ${i + 1}`);
      }
    }

    // Wait for more network activity
    console.log('⏳ Waiting for network activity...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log(`\n📊 Summary:`);
    console.log(`  - Iframes found: ${iframes.length}`);
    console.log(`  - Videos found: ${videos.length}`);
    console.log(`  - Network requests: ${networkRequests.length}`);
    
    if (networkRequests.length > 0) {
      console.log(`\n🌐 Network Requests:`);
      networkRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.url} (${req.status})`);
      });
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for manual inspection...');
    console.log('Press Ctrl+C to close when done debugging');
    
    // Wait indefinitely until user closes
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Debug extraction failed:', error.message);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.log('Error closing page');
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.log('Error closing browser');
      }
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Closing debug session...');
  process.exit(0);
});

debugExtraction();