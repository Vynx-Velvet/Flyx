const puppeteer = require('puppeteer');

async function testPlayButtonInteraction() {
  console.log('🎮 Testing play button interaction...');
  
  let browser = null;
  let page = null;

  try {
    // Launch browser with popup blocking
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      slowMo: 200,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-popup-blocking',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Speed up loading
        '--window-size=1920,1080',
        // Block ads and popups
        '--block-new-web-contents',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions-file-access-check',
        '--disable-sync'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Block popups and ads
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();
      
      // Block ads, popups, and unnecessary resources
      if (resourceType === 'image' || 
          resourceType === 'stylesheet' ||
          resourceType === 'font' ||
          url.includes('ads') ||
          url.includes('popup') ||
          url.includes('analytics') ||
          url.includes('tracking') ||
          url.includes('doubleclick') ||
          url.includes('googletagmanager') ||
          url.includes('facebook') ||
          url.includes('twitter')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Handle new page/popup attempts
    browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        console.log('🚫 Blocking popup/new tab:', target.url());
        const newPage = await target.page();
        if (newPage) {
          await newPage.close();
        }
      }
    });

    // Prevent window.open calls
    await page.evaluateOnNewDocument(() => {
      window.open = () => {
        console.log('Blocked window.open call');
        return null;
      };
    });

    // Monitor network for stream URLs
    const streamUrls = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.m3u8') || 
          url.includes('playlist') || 
          url.includes('stream') || 
          url.includes('shadowlands') ||
          url.includes('prorcp') ||
          url.includes('cloudnestra')) {
        streamUrls.push({
          url,
          status: response.status(),
          timestamp: new Date().toISOString()
        });
        console.log(`🌐 Stream URL detected: ${url}`);
      }
    });

    // Test URL
    const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550'; // Fight Club
    console.log(`📍 Navigating to: ${testUrl}`);

    await page.goto(testUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    console.log('✅ Page loaded, waiting for iframes...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Function to recursively search for play button in iframes
    async function searchForPlayButton(frame, depth = 0) {
      const indent = '  '.repeat(depth);
      console.log(`${indent}🔍 Searching for play button at depth ${depth}`);

      try {
        // Look for the specific play button
        const playButton = await frame.$('i#pl_but.fas.fa-play, #pl_but, i.fas.fa-play');
        
        if (playButton) {
          console.log(`${indent}🎯 Found play button!`);
          
          // Check visibility
          const isVisible = await playButton.evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return {
              visible: rect.width > 0 && rect.height > 0 && 
                      style.visibility !== 'hidden' && 
                      style.display !== 'none',
              rect: {
                width: rect.width,
                height: rect.height,
                x: rect.x,
                y: rect.y
              },
              style: {
                visibility: style.visibility,
                display: style.display,
                opacity: style.opacity
              }
            };
          });
          
          console.log(`${indent}👁️  Visibility check:`, isVisible);
          
          if (isVisible.visible) {
            console.log(`${indent}🎮 Clicking play button...`);
            
            // Store current page count to detect popups
            const initialPages = (await browser.pages()).length;
            
            // Human-like interaction with popup prevention
            await playButton.hover();
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Click with popup monitoring
            await Promise.all([
              playButton.click(),
              // Monitor for popups during click
              new Promise(resolve => {
                const timeout = setTimeout(resolve, 2000);
                browser.on('targetcreated', () => {
                  clearTimeout(timeout);
                  resolve();
                });
              })
            ]);
            
            // Check if popups were created and close them
            const currentPages = await browser.pages();
            if (currentPages.length > initialPages) {
              console.log(`${indent}🚫 Detected ${currentPages.length - initialPages} popup(s), closing...`);
              for (let i = initialPages; i < currentPages.length; i++) {
                try {
                  await currentPages[i].close();
                } catch (e) {
                  console.log(`${indent}  Could not close popup ${i}`);
                }
              }
            }
            
            console.log(`${indent}✅ Play button clicked! Waiting for response...`);
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            return true; // Found and clicked
          } else {
            console.log(`${indent}⚠️  Play button not visible`);
          }
        }

        // Search in nested iframes
        const iframes = await frame.$$('iframe');
        console.log(`${indent}📦 Found ${iframes.length} nested iframes`);
        
        for (let i = 0; i < iframes.length; i++) {
          try {
            const src = await iframes[i].evaluate(el => el.src);
            console.log(`${indent}  Iframe ${i + 1}: ${src}`);
            
            const nestedFrame = await iframes[i].contentFrame();
            if (nestedFrame) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              const found = await searchForPlayButton(nestedFrame, depth + 1);
              if (found) return true;
            }
          } catch (e) {
            console.log(`${indent}  Could not access iframe ${i + 1} (CORS)`);
          }
        }

      } catch (error) {
        console.log(`${indent}❌ Error searching at depth ${depth}:`, error.message);
      }

      return false;
    }

    // Start search from main page
    const found = await searchForPlayButton(page);
    
    if (found) {
      console.log('🎉 Play button interaction completed!');
      
      // Wait for additional network activity
      console.log('⏳ Waiting for stream URLs...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log(`\n📊 Results:`);
      console.log(`  - Stream URLs found: ${streamUrls.length}`);
      
      if (streamUrls.length > 0) {
        console.log(`\n🌐 Stream URLs:`);
        streamUrls.forEach((stream, i) => {
          console.log(`  ${i + 1}. ${stream.url}`);
          console.log(`     Status: ${stream.status}, Time: ${stream.timestamp}`);
        });
      }
    } else {
      console.log('❌ Play button not found or not clickable');
    }

    // Keep browser open for inspection
    console.log('\n🔍 Browser staying open for inspection...');
    console.log('Press Ctrl+C to close');
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup handled by Ctrl+C
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Closing test...');
  process.exit(0);
});

testPlayButtonInteraction();