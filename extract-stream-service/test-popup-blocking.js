const puppeteer = require('puppeteer');

async function testPopupBlocking() {
  console.log('🚫 Testing popup blocking behavior...');
  
  let browser = null;
  let page = null;

  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      slowMo: 200,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-popup-blocking',  // Disable popup blocking
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Override popup blocking at page level
    await page.evaluateOnNewDocument(() => {
      // Override window.open to prevent blocking
      const originalOpen = window.open;
      window.open = function(...args) {
        console.log('window.open called with:', args);
        return originalOpen.apply(this, args);
      };

      // Override popup blocking detection
      Object.defineProperty(window, 'opener', {
        get: () => null,
        set: () => {},
        configurable: true
      });
    });

    // Monitor for popups and new windows
    browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        console.log('🪟 New window/popup created:', target.url());
        
        try {
          const newPage = await target.page();
          if (newPage) {
            console.log('📄 New page accessible, URL:', await newPage.url());
            
            // Monitor this new page for stream URLs
            newPage.on('response', response => {
              const url = response.url();
              if (url.includes('.m3u8') || url.includes('stream') || url.includes('shadowlands')) {
                console.log('🎯 STREAM URL in popup:', url);
              }
            });
          }
        } catch (e) {
          console.log('❌ Could not access new page:', e.message);
        }
      }
    });

    // Test URL
    const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550';
    console.log(`📍 Navigating to: ${testUrl}`);

    await page.goto(testUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    console.log('✅ Page loaded, looking for iframes and play buttons...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Function to handle iframe interaction with popup awareness
    async function interactWithIframes() {
      const iframes = await page.$$('iframe');
      console.log(`📦 Found ${iframes.length} iframes`);

      for (let i = 0; i < iframes.length; i++) {
        try {
          const src = await iframes[i].evaluate(el => el.src);
          console.log(`🔍 Iframe ${i + 1}: ${src}`);

          if (src && src.includes('vidsrc')) {
            console.log('🎯 Found vidsrc iframe, attempting interaction...');
            
            try {
              const frame = await iframes[i].contentFrame();
              if (frame) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Look for play button in this frame
                const playButton = await frame.$('i#pl_but.fas.fa-play, #pl_but, i.fas.fa-play');
                if (playButton) {
                  console.log('🎮 Found play button in vidsrc iframe!');
                  
                  // Check if it's visible
                  const isVisible = await playButton.evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                  });
                  
                  if (isVisible) {
                    console.log('✅ Play button is visible, clicking...');
                    
                    // Click and wait for potential popup
                    await playButton.hover();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await playButton.click();
                    
                    console.log('🎮 Play button clicked! Waiting for popup or iframe changes...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    
                    // Check for new iframes after click
                    const newIframes = await frame.$$('iframe');
                    console.log(`📦 After click: Found ${newIframes.length} iframes in frame`);
                    
                    for (let j = 0; j < newIframes.length; j++) {
                      try {
                        const newSrc = await newIframes[j].evaluate(el => el.src);
                        console.log(`  New iframe ${j + 1}: ${newSrc}`);
                        
                        if (newSrc && (newSrc.includes('prorcp') || newSrc.includes('shadowlands'))) {
                          console.log('🎯 Found target iframe after play button click!');
                        }
                      } catch (e) {
                        console.log(`  Could not access new iframe ${j + 1}`);
                      }
                    }
                  } else {
                    console.log('⚠️  Play button not visible');
                  }
                } else {
                  console.log('❌ No play button found in vidsrc iframe');
                }
              }
            } catch (e) {
              console.log(`🚫 Could not access vidsrc iframe content: ${e.message}`);
            }
          }
        } catch (e) {
          console.log(`❌ Error with iframe ${i + 1}: ${e.message}`);
        }
      }
    }

    await interactWithIframes();

    // Wait for any delayed popups or network activity
    console.log('⏳ Waiting for delayed activity...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('\n🔍 Browser staying open for inspection...');
    console.log('Check for any popups or new windows, then press Ctrl+C');
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Closing test...');
  process.exit(0);
});

testPopupBlocking();