#!/usr/bin/env node

/**
 * Debug script for vm-server.js
 * This script helps debug m3u8 URL retrieval issues locally
 */

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');

// Simple logger for debugging
const logger = {
  info: (msg, data) => console.log(`ℹ️  ${new Date().toISOString()} ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  warn: (msg, data) => console.log(`⚠️  ${new Date().toISOString()} ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (msg, error, data) => console.log(`❌ ${new Date().toISOString()} ${msg}`, error?.message || error, data ? JSON.stringify(data, null, 2) : ''),
  debug: (msg, data) => console.log(`🔍 ${new Date().toISOString()} ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  timing: (label, startTime) => {
    const duration = Date.now() - startTime;
    console.log(`⏱️  ${new Date().toISOString()} Timer: ${label} - ${duration}ms`);
    return duration;
  }
};

// Generate unique request ID for tracking
function generateRequestId() {
  return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced stream interception with debugging
function setupDebugStreamInterception(page, logger, targetUrl = '') {
  const streamUrls = [];
  let responseCount = 0;
  const debugRequests = [];
  const debugResponses = [];
  const allRequests = [];
  const allResponses = [];

  // Intercept ALL network requests for debugging
  page.on('request', async (request) => {
    const requestUrl = request.url();
    
    allRequests.push({
      url: requestUrl,
      method: request.method(),
      headers: request.headers(),
      timestamp: Date.now()
    });

    // Debug logging for potential stream requests
    if (requestUrl.includes('.m3u8') || requestUrl.includes('master') || 
        requestUrl.includes('playlist') || requestUrl.includes('stream') ||
        requestUrl.includes('upcloud') || requestUrl.includes('vidplay') ||
        requestUrl.includes('cloudnestra') || requestUrl.includes('shadowlands')) {
      debugRequests.push({
        url: requestUrl,
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
      logger.info('🔍 POTENTIAL STREAM REQUEST', {
        url: requestUrl.substring(0, 150),
        method: request.method(),
        isM3U8: requestUrl.includes('.m3u8'),
        isUpCloud: requestUrl.includes('upcloud'),
        isVidplay: requestUrl.includes('vidplay'),
        isCloudnestra: requestUrl.includes('cloudnestra')
      });
    }

    await request.continue();
  });

  // Intercept ALL network responses for debugging
  page.on('response', async (response) => {
    responseCount++;
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();
    const headers = response.headers();

    allResponses.push({
      url: responseUrl,
      status,
      contentType,
      headers: headers,
      timestamp: Date.now()
    });

    // Debug logging for potential stream responses
    if (responseUrl.includes('.m3u8') || responseUrl.includes('master') || 
        responseUrl.includes('playlist') || responseUrl.includes('stream') ||
        responseUrl.includes('upcloud') || responseUrl.includes('vidplay') ||
        responseUrl.includes('cloudnestra') || responseUrl.includes('shadowlands') ||
        contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      
      debugResponses.push({
        url: responseUrl,
        status,
        contentType,
        headers: headers,
        timestamp: Date.now()
      });

      logger.info('🎯 POTENTIAL STREAM RESPONSE', {
        url: responseUrl.substring(0, 150),
        status,
        contentType,
        isM3U8: responseUrl.includes('.m3u8'),
        isUpCloud: responseUrl.includes('upcloud'),
        isVidplay: responseUrl.includes('vidplay'),
        isCloudnestra: responseUrl.includes('cloudnestra'),
        isMpegUrl: contentType.includes('mpegurl')
      });

      // Try to read content for M3U8 validation
      if (status === 200) {
        try {
          const responseText = await response.text();
          const isActualM3U8 = responseText.includes('#EXTM3U') || responseText.includes('#EXT-X-');
          
          if (isActualM3U8) {
            const streamInfo = {
              url: responseUrl,
              contentType,
              status,
              source: responseUrl.includes('upcloud') ? 'upcloud' : 
                     responseUrl.includes('vidplay') ? 'vidplay' :
                     responseUrl.includes('cloudnestra') ? 'cloudnestra' :
                     responseUrl.includes('shadowlands') ? 'shadowlands' : 'unknown',
              isMaster: responseUrl.includes('master'),
              contentLength: responseText.length,
              timestamp: Date.now()
            };

            streamUrls.push(streamInfo);

            logger.info('✅ VALID M3U8 STREAM FOUND', {
              url: responseUrl.substring(0, 150),
              source: streamInfo.source,
              isMaster: streamInfo.isMaster,
              contentLength: streamInfo.contentLength
            });
          }
        } catch (contentError) {
          logger.warn('Could not read response content', { error: contentError.message });
        }
      }
    }
  });

  return { streamUrls, debugRequests, debugResponses, allRequests, allResponses };
}

// Simple page interaction for debugging
async function debugPageInteraction(page, logger) {
  try {
    logger.info('Starting debug page interaction');

    // Wait for page to load
    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check current URL
    const currentUrl = await page.url();
    logger.info('Current page URL', { url: currentUrl });

    // For vidsrc.xyz, try to select UpCloud server
    if (currentUrl.includes('vidsrc.xyz')) {
      logger.info('vidsrc.xyz detected, looking for server selection');

      // Look for any server-related elements
      const serverElements = await page.evaluate(() => {
        const elements = [];
        const allElements = document.querySelectorAll('*');

        for (const el of allElements) {
          const text = el.innerText?.toLowerCase() || '';
          const className = el.className?.toLowerCase() || '';
          const id = el.id?.toLowerCase() || '';

          if (text.includes('upcloud') || text.includes('vidplay') || text.includes('server') ||
              className.includes('server') || id.includes('server')) {
            elements.push({
              tagName: el.tagName,
              text: el.innerText?.substring(0, 50) || '',
              className: el.className,
              id: el.id,
              visible: el.offsetParent !== null
            });
          }
        }
        return elements;
      });

      logger.info('Found server-related elements', { count: serverElements.length, elements: serverElements.slice(0, 5) });
    }

    // Look for play buttons
    const playButtons = await page.evaluate(() => {
      const elements = [];
      const selectors = ['#pl_but', '.fas.fa-play', 'button[class*="play"]', '.play-button'];
      
      for (const selector of selectors) {
        const els = document.querySelectorAll(selector);
        for (const el of els) {
          elements.push({
            selector,
            tagName: el.tagName,
            text: el.innerText?.substring(0, 30) || '',
            className: el.className,
            id: el.id,
            visible: el.offsetParent !== null
          });
        }
      }
      return elements;
    });

    logger.info('Found play button elements', { count: playButtons.length, elements: playButtons });

    // Try clicking the first visible play button
    if (playButtons.length > 0) {
      const visibleButton = playButtons.find(btn => btn.visible);
      if (visibleButton) {
        logger.info('Attempting to click play button', visibleButton);
        
        try {
          const button = await page.$(visibleButton.selector);
          if (button) {
            await button.hover();
            await new Promise(resolve => setTimeout(resolve, 500));
            await button.click();
            logger.info('✅ Clicked play button successfully');
            
            // Wait for streams to load
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (e) {
          logger.error('Error clicking play button', e);
        }
      }
    }

    // Check for iframes
    const iframes = await page.$$('iframe');
    logger.info('Found iframes', { count: iframes.length });

    for (let i = 0; i < Math.min(iframes.length, 3); i++) {
      try {
        const src = await iframes[i].evaluate(el => el.src);
        logger.info(`Iframe ${i + 1}`, { src: src?.substring(0, 100) });
      } catch (e) {
        logger.debug(`Error getting iframe ${i + 1} src`, { error: e.message });
      }
    }

  } catch (error) {
    logger.error('Debug page interaction failed', error);
  }
}

async function debugExtraction(testUrl) {
  let browser = null;
  const requestId = generateRequestId();

  try {
    logger.info('🚀 Starting debug extraction', { testUrl, requestId });

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
        '--disable-web-security',
        '--disable-blink-features=AutomationControlled'
      ]
    };

    if (chromeExecutable) {
      launchConfig.executablePath = chromeExecutable;
      logger.info(`Using Chrome: ${chromeExecutable}`);
    } else {
      logger.info('Using Puppeteer auto-detection for Chrome');
    }

    // Launch browser
    browser = await puppeteer.launch(launchConfig);

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080
    });

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Enable request interception
    await page.setRequestInterception(true);

    // Setup debug stream interception
    const { streamUrls, debugRequests, debugResponses, allRequests, allResponses } = setupDebugStreamInterception(page, logger, testUrl);

    // Navigate to the page
    logger.info('Navigating to test URL');
    const navigationStart = Date.now();

    await page.goto(testUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    logger.timing('Navigation completed', navigationStart);

    // Interact with the page
    await debugPageInteraction(page, logger);

    // Wait for additional streams
    logger.info('Waiting for additional streams...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Take a screenshot
    await page.screenshot({ path: 'debug-extraction-result.png', fullPage: true });
    logger.info('Screenshot saved as debug-extraction-result.png');

    // Print results
    console.log('\n📊 DEBUG RESULTS:');
    console.log('==================');
    console.log(`Total Requests: ${allRequests.length}`);
    console.log(`Total Responses: ${allResponses.length}`);
    console.log(`Debug Requests: ${debugRequests.length}`);
    console.log(`Debug Responses: ${debugResponses.length}`);
    console.log(`Stream URLs Found: ${streamUrls.length}`);

    if (debugRequests.length > 0) {
      console.log('\n🔍 Debug Requests:');
      debugRequests.slice(0, 10).forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url.substring(0, 100)}`);
      });
    }

    if (debugResponses.length > 0) {
      console.log('\n🎯 Debug Responses:');
      debugResponses.slice(0, 10).forEach((res, i) => {
        console.log(`  ${i + 1}. ${res.status} ${res.contentType} ${res.url.substring(0, 100)}`);
      });
    }

    if (streamUrls.length > 0) {
      console.log('\n✅ Stream URLs Found:');
      streamUrls.forEach((stream, i) => {
        console.log(`  ${i + 1}. [${stream.source}] ${stream.isMaster ? 'MASTER' : 'STREAM'} ${stream.url.substring(0, 100)}`);
      });
    } else {
      console.log('\n❌ No stream URLs found');
      
      // Show some recent requests/responses for debugging
      console.log('\n🔍 Recent Requests (last 10):');
      allRequests.slice(-10).forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url.substring(0, 100)}`);
      });

      console.log('\n🔍 Recent Responses (last 10):');
      allResponses.slice(-10).forEach((res, i) => {
        console.log(`  ${i + 1}. ${res.status} ${res.contentType || 'no-type'} ${res.url.substring(0, 100)}`);
      });
    }

  } catch (error) {
    logger.error('Debug extraction failed', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node debug-vm-server.js <test-url>');
    console.log('Example: node debug-vm-server.js "https://vidsrc.xyz/embed/movie?tmdb=550"');
    process.exit(1);
  }

  const testUrl = args[0];
  await debugExtraction(testUrl);
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });
}

module.exports = { debugExtraction };