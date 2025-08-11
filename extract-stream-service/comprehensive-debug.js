const puppeteer = require('puppeteer');

async function comprehensiveDebug() {
  console.log('🔍 Starting comprehensive extraction debug...');
  
  let browser = null;
  let page = null;

  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      slowMo: 300,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-popup-blocking',
        '--window-size=1920,1080'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Enhanced network monitoring
    const networkActivity = [];
    page.on('response', response => {
      const url = response.url();
      const isRelevant = url.includes('.m3u8') || 
                        url.includes('playlist') || 
                        url.includes('stream') || 
                        url.includes('shadowlands') ||
                        url.includes('prorcp') ||
                        url.includes('cloudnestra') ||
                        url.includes('vidsrc');
      
      if (isRelevant) {
        const entry = {
          url,
          status: response.status(),
          headers: response.headers(),
          timestamp: new Date().toISOString()
        };
        networkActivity.push(entry);
        console.log(`🌐 NETWORK: ${url} (${response.status()})`);
      }
    });

    // Test URL
    const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550'; // Fight Club
    console.log(`📍 Navigating to: ${testUrl}`);

    await page.goto(testUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    console.log('✅ Initial page loaded');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Function to analyze iframe structure
    async function analyzeIframeStructure(frame, depth = 0, path = 'main') {
      const indent = '  '.repeat(depth);
      console.log(`${indent}📦 Analyzing frame at depth ${depth} (${path})`);

      try {
        // Get frame URL
        const frameUrl = await frame.url();
        console.log(`${indent}🔗 Frame URL: ${frameUrl}`);

        // Look for play button
        const playButtonSelectors = [
          'i#pl_but.fas.fa-play',
          '#pl_but',
          'i.fas.fa-play',
          '.fas.fa-play'
        ];

        let playButtonFound = false;
        for (const selector of playButtonSelectors) {
          try {
            const element = await frame.$(selector);
            if (element) {
              console.log(`${indent}🎯 FOUND PLAY BUTTON: ${selector}`);
              
              const elementInfo = await element.evaluate(el => ({
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                innerHTML: el.innerHTML,
                visible: el.offsetWidth > 0 && el.offsetHeight > 0,
                rect: el.getBoundingClientRect(),
                style: {
                  display: window.getComputedStyle(el).display,
                  visibility: window.getComputedStyle(el).visibility,
                  opacity: window.getComputedStyle(el).opacity
                }
              }));
              
              console.log(`${indent}📋 Element info:`, JSON.stringify(elementInfo, null, 2));
              
              if (elementInfo.visible) {
                console.log(`${indent}🎮 CLICKING PLAY BUTTON...`);
                
                // Human-like interaction
                await element.hover();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await element.click();
                
                console.log(`${indent}✅ Play button clicked! Waiting for response...`);
                await new Promise(resolve => setTimeout(resolve, 8000));
                
                playButtonFound = true;
                break;
              } else {
                console.log(`${indent}⚠️  Play button not visible`);
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        // Get all iframes in this frame
        const iframes = await frame.$$('iframe');
        console.log(`${indent}📦 Found ${iframes.length} nested iframes`);

        for (let i = 0; i < iframes.length; i++) {
          try {
            const src = await iframes[i].evaluate(el => el.src);
            console.log(`${indent}  Iframe ${i + 1}: ${src}`);
            
            // Try to access the iframe content
            try {
              const nestedFrame = await iframes[i].contentFrame();
              if (nestedFrame) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await analyzeIframeStructure(nestedFrame, depth + 1, `${path}-iframe${i + 1}`);
              } else {
                console.log(`${indent}  ❌ Could not access iframe ${i + 1} content`);
              }
            } catch (e) {
              console.log(`${indent}  🚫 CORS blocked iframe ${i + 1}: ${e.message}`);
            }
          } catch (e) {
            console.log(`${indent}  ❌ Error with iframe ${i + 1}: ${e.message}`);
          }
        }

        return playButtonFound;

      } catch (error) {
        console.log(`${indent}❌ Error analyzing frame: ${error.message}`);
        return false;
      }
    }

    // Start analysis
    console.log('\n🔍 Starting iframe structure analysis...');
    const playButtonClicked = await analyzeIframeStructure(page);

    if (playButtonClicked) {
      console.log('\n🎉 Play button was clicked! Waiting for additional network activity...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    // Final network summary
    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`  - Network requests captured: ${networkActivity.length}`);
    console.log(`  - Play button clicked: ${playButtonClicked}`);

    if (networkActivity.length > 0) {
      console.log(`\n🌐 NETWORK ACTIVITY:`);
      networkActivity.forEach((activity, i) => {
        console.log(`  ${i + 1}. ${activity.url}`);
        console.log(`     Status: ${activity.status}, Time: ${activity.timestamp}`);
        if (activity.url.includes('.m3u8')) {
          console.log(`     🎯 POTENTIAL STREAM URL!`);
        }
      });
    } else {
      console.log(`\n❌ No relevant network activity detected`);
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser staying open for manual inspection...');
    console.log('Check the browser window and press Ctrl+C when done');
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Closing debug session...');
  process.exit(0);
});

comprehensiveDebug();