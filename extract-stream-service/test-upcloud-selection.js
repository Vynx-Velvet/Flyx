#!/usr/bin/env node

/**
 * Test script for UpCloud server selection on vidsrc.xyz
 * This script tests the new UpCloud server selection functionality
 */

const puppeteer = require('puppeteer-core');

// Simple logger for testing
const logger = {
  info: (msg, data) => console.log(`ℹ️  ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  warn: (msg, data) => console.log(`⚠️  ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (msg, error, data) => console.log(`❌ ${msg}`, error?.message || error, data ? JSON.stringify(data, null, 2) : ''),
  debug: (msg, data) => console.log(`🔍 ${msg}`, data ? JSON.stringify(data, null, 2) : '')
};

// Select UpCloud server on vidsrc.xyz before clicking play button
async function selectUpCloudServer(page, logger) {
  try {
    logger.info('Attempting to select UpCloud server on vidsrc.xyz');

    // Wait for server selection elements to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Look for server selection buttons/links
    const serverSelectors = [
      'button[data-server="upcloud"]',
      'a[data-server="upcloud"]',
      '[data-server="upcloud"]',
      'button:contains("UpCloud")',
      'a:contains("UpCloud")',
      '.server-upcloud',
      '#server-upcloud',
      '[class*="upcloud"]',
      '[id*="upcloud"]'
    ];

    let serverSelected = false;

    // Try to find and click UpCloud server button
    for (const selector of serverSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found UpCloud server selector', { selector, count: elements.length });

          for (const element of elements) {
            try {
              // Check if element is visible and contains upcloud text
              const elementInfo = await element.evaluate(el => ({
                visible: el.offsetParent !== null,
                text: el.innerText?.toLowerCase() || '',
                className: el.className,
                id: el.id,
                dataset: el.dataset
              }));

              if (elementInfo.visible && 
                  (elementInfo.text.includes('upcloud') || 
                   elementInfo.className.includes('upcloud') ||
                   elementInfo.id.includes('upcloud') ||
                   elementInfo.dataset.server === 'upcloud')) {
                
                logger.info('Clicking UpCloud server button', elementInfo);
                
                // Simulate human-like interaction
                await element.hover();
                await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
                await element.click();
                serverSelected = true;
                
                // Wait for server switch to complete
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
                break;
              }
            } catch (e) {
              logger.debug('Error checking UpCloud server element', { error: e.message });
            }
          }

          if (serverSelected) break;
        }
      } catch (e) {
        logger.debug('Error with UpCloud server selector', { selector, error: e.message });
      }
    }

    // Alternative approach: look for server tabs or dropdown
    if (!serverSelected) {
      logger.info('Trying alternative UpCloud server selection methods');

      try {
        // Look for server tabs or buttons with text content
        const serverElements = await page.evaluate(() => {
          const elements = [];
          const allElements = document.querySelectorAll('button, a, div[role="button"], span[role="button"]');

          for (const el of allElements) {
            const text = el.innerText?.toLowerCase() || '';
            const title = el.title?.toLowerCase() || '';
            const className = el.className?.toLowerCase() || '';
            const id = el.id?.toLowerCase() || '';

            if (text.includes('upcloud') || title.includes('upcloud') || 
                className.includes('upcloud') || id.includes('upcloud') ||
                el.dataset?.server === 'upcloud') {
              elements.push({
                tagName: el.tagName,
                text: el.innerText,
                className: el.className,
                id: el.id,
                visible: el.offsetParent !== null
              });
            }
          }
          return elements;
        });

        if (serverElements.length > 0) {
          logger.info('Found UpCloud server elements via text search', { count: serverElements.length, elements: serverElements });

          // Try to click the first visible UpCloud element
          for (const elementInfo of serverElements) {
            if (elementInfo.visible) {
              try {
                const element = await page.evaluateHandle((info) => {
                  const elements = document.querySelectorAll('button, a, div[role="button"], span[role="button"]');
                  for (const el of elements) {
                    if (el.innerText === info.text && el.className === info.className) {
                      return el;
                    }
                  }
                  return null;
                }, elementInfo);

                if (element) {
                  await element.hover();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await element.click();
                  logger.info('Clicked UpCloud server element', { text: elementInfo.text });
                  serverSelected = true;
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  break;
                }
              } catch (e) {
                logger.debug('Error clicking UpCloud server element', { error: e.message });
              }
            }
          }
        }
      } catch (e) {
        logger.debug('Error in alternative UpCloud server selection', { error: e.message });
      }
    }

    if (serverSelected) {
      logger.info('✅ Successfully selected UpCloud server');
      return { success: true, serverSelected: 'upcloud' };
    } else {
      logger.warn('⚠️ Could not find UpCloud server selection, proceeding with default server');
      return { success: false, serverSelected: 'default' };
    }

  } catch (error) {
    logger.error('Error in UpCloud server selection', error);
    return { success: false, error: error.message, serverSelected: 'default' };
  }
}

async function testUpCloudSelection() {
  let browser = null;

  try {
    console.log('🚀 Starting UpCloud server selection test...\n');

    // Cross-platform Chrome detection
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    
    function findChromeExecutable() {
      const platform = os.platform();
      
      if (platform === 'win32') {
        const windowsPaths = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
        ];
        
        for (const chromePath of windowsPaths) {
          if (fs.existsSync(chromePath)) {
            return chromePath;
          }
        }
      } else if (platform === 'linux') {
        const linuxPaths = [
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser'
        ];
        
        for (const chromePath of linuxPaths) {
          if (fs.existsSync(chromePath)) {
            return chromePath;
          }
        }
      }
      
      return null;
    }

    const chromeExecutable = findChromeExecutable();
    const launchConfig = {
      headless: false, // Set to true for headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    };

    if (chromeExecutable) {
      launchConfig.executablePath = chromeExecutable;
      console.log(`Using Chrome: ${chromeExecutable}`);
    } else {
      console.log('Using Puppeteer auto-detection for Chrome');
    }

    // Launch browser
    browser = await puppeteer.launch(launchConfig);

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080
    });

    // Test URL - replace with actual vidsrc.xyz URL
    const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550'; // Fight Club for testing

    logger.info('Navigating to test URL', { url: testUrl });

    // Navigate to the page
    await page.goto(testUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test UpCloud server selection
    const result = await selectUpCloudServer(page, logger);

    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Success: ${result.success}`);
    console.log(`Server Selected: ${result.serverSelected}`);
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'upcloud-test-result.png', fullPage: true });
    logger.info('Screenshot saved as upcloud-test-result.png');

    // Wait a bit to see the result
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    logger.error('Test failed', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  testUpCloudSelection().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { selectUpCloudServer };