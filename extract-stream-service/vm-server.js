const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Utility function for structured logging
function createLogger(requestId) {
  return {
    info: (message, data = {}) => {
      console.log(`[${requestId}] INFO: ${message}`, JSON.stringify(data, null, 2));
    },
    warn: (message, data = {}) => {
      console.warn(`[${requestId}] WARN: ${message}`, JSON.stringify(data, null, 2));
    },
    error: (message, error = null, data = {}) => {
      console.error(`[${requestId}] ERROR: ${message}`, {
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null,
        ...data
      });
    },
    debug: (message, data = {}) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${requestId}] DEBUG: ${message}`, JSON.stringify(data, null, 2));
      }
    },
    timing: (label, startTime) => {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] TIMING: ${label} took ${duration}ms`);
      return duration;
    }
  };
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to take screenshots with unix timestamp filenames
async function takeScreenshot(page, logger, prefix = 'screenshot') {
  logger.info(`SCREENSHOT DEBUG: Attempting to take screenshot with prefix: ${prefix}`);
  
  try {
    // Check if page is valid
    if (!page) {
      logger.error('SCREENSHOT ERROR: Page object is null or undefined');
      return { success: false, error: 'Page object is null or undefined' };
    }

    const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
    const filename = `${prefix}_${timestamp}.png`;
    
    // Use absolute path to be sure
    const screenshotsDir = path.resolve(__dirname, 'screenshots');
    const filepath = path.join(screenshotsDir, filename);
    
    logger.info('SCREENSHOT DEBUG: Paths calculated', {
      __dirname: __dirname,
      screenshotsDir,
      filename,
      filepath
    });
    
    // Ensure screenshots directory exists with detailed logging
    if (!fs.existsSync(screenshotsDir)) {
      logger.info(`SCREENSHOT DEBUG: Creating screenshots directory: ${screenshotsDir}`);
      try {
        fs.mkdirSync(screenshotsDir, { recursive: true });
        logger.info('SCREENSHOT DEBUG: Screenshots directory created successfully');
      } catch (mkdirError) {
        logger.error('SCREENSHOT ERROR: Failed to create screenshots directory', {
          error: mkdirError.message,
          directory: screenshotsDir
        });
        return { success: false, error: `Failed to create directory: ${mkdirError.message}` };
      }
    } else {
      logger.info('SCREENSHOT DEBUG: Screenshots directory already exists');
    }
    
    // Check directory permissions
    try {
      fs.accessSync(screenshotsDir, fs.constants.W_OK);
      logger.info('SCREENSHOT DEBUG: Directory is writable');
    } catch (accessError) {
      logger.error('SCREENSHOT ERROR: Directory is not writable', {
        error: accessError.message,
        directory: screenshotsDir
      });
      return { success: false, error: `Directory not writable: ${accessError.message}` };
    }
    
    logger.info('SCREENSHOT DEBUG: About to take screenshot with page.screenshot()');
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      type: 'png'
    });
    
    // Verify file was created
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      logger.info('✅ SCREENSHOT SUCCESS: Screenshot taken and verified', {
        filename,
        filepath,
        timestamp,
        prefix,
        fileSize: stats.size,
        exists: true
      });
    } else {
      logger.error('❌ SCREENSHOT ERROR: File was not created after screenshot call');
      return { success: false, error: 'Screenshot file was not created' };
    }
    
    return { success: true, filename, filepath, timestamp };
  } catch (error) {
    logger.error('❌ SCREENSHOT ERROR: Exception during screenshot', {
      error: error.message,
      stack: error.stack,
      prefix
    });
    return { success: false, error: error.message };
  }
}

// Validate request parameters and construct URLs
function validateParameters(query, logger) {
  const url = query.url;
  const mediaType = query.mediaType;
  const movieId = query.movieId;
  const seasonId = query.seasonId;
  const episodeId = query.episodeId;
  const server = query.server || 'vidsrc.xyz';

  logger.info('Request parameters received', {
    url: url ? url.substring(0, 100) + (url.length > 100 ? '...' : '') : null,
    mediaType,
    movieId,
    seasonId,
    episodeId,
    server,
    hasUrl: !!url
  });

  let finalUrl = url;

  // If no URL provided but we have media info, construct URL based on server
  if (!url && mediaType && movieId) {
    if (server.toLowerCase() === 'vidsrc.xyz' || server.toLowerCase() === 'vidsrc') {
      // Construct vidsrc.xyz URL
      if (mediaType === 'movie') {
        finalUrl = `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`;
        logger.info('Constructed vidsrc.xyz movie URL', { 
          movieId, 
          server,
          constructedUrl: finalUrl 
        });
      } else if (mediaType === 'tv' && seasonId && episodeId) {
        finalUrl = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}`;
        logger.info('Constructed vidsrc.xyz TV episode URL', { 
          movieId, 
          seasonId, 
          episodeId,
          server, 
          constructedUrl: finalUrl 
        });
      } else if (mediaType === 'tv') {
        logger.error('TV show missing season/episode parameters', null, {
          movieId,
          seasonId,
          episodeId,
          server
        });
        return { 
          isValid: false, 
          error: 'TV shows require seasonId and episodeId parameters' 
        };
      }
    } else {
      // Default to embed.su URL construction (backup server)
      if (mediaType === 'movie') {
        finalUrl = `https://embed.su/embed/movie/${movieId}`;
        logger.info('Constructed embed.su movie URL', { 
          movieId, 
          server,
          constructedUrl: finalUrl 
        });
      } else if (mediaType === 'tv' && seasonId && episodeId) {
        finalUrl = `https://embed.su/embed/tv/${movieId}/${seasonId}/${episodeId}`;
        logger.info('Constructed embed.su TV episode URL', { 
          movieId, 
          seasonId, 
          episodeId, 
          server, 
          constructedUrl: finalUrl 
        });
      } else if (mediaType === 'tv') {
        logger.error('TV show missing season/episode parameters', null, {
          movieId,
          seasonId,
          episodeId,
          server
        });
        return { 
          isValid: false, 
          error: 'TV shows require seasonId and episodeId parameters' 
        };
      }
    }
  }

  // If still no URL, return error
  if (!finalUrl) {
    logger.error('Missing required parameters', null, {
      hasUrl: !!url,
      hasMediaType: !!mediaType,
      hasMovieId: !!movieId,
      message: 'Either url parameter or mediaType+movieId (and seasonId/episodeId for TV) are required'
    });
    return { 
      isValid: false, 
      error: 'Either url parameter or mediaType+movieId (and seasonId/episodeId for TV) are required' 
    };
  }

  // Validate URL format
  try {
    new URL(finalUrl);
  } catch (e) {
    logger.error('Invalid URL format', e, { providedUrl: finalUrl });
    return { isValid: false, error: 'Invalid URL format' };
  }

  logger.info('Final URL validated', {
    originalUrl: url,
    finalUrl: finalUrl,
    isEmbedSu: finalUrl.includes('embed.su'),
    mediaType
  });

  return {
    isValid: true,
    params: { url: finalUrl, mediaType, movieId, seasonId, episodeId, server }
  };
}

// Get browser configuration
async function getBrowserConfig(logger) {
  logger.debug('Using Google VM Chrome configuration');
  
  return {
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-extensions-file-access-check',
      '--disable-extensions-http-throttling',
      '--disable-extensions-https-throttling',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-component-extensions-with-background-pages',
      '--disable-sync',
      '--disable-translate',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-component-update',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--disable-prompt-on-repost',
      '--disable-hang-monitor',
      '--disable-client-side-phishing-detection',
      '--disable-popup-blocking',
      '--disable-print-preview',
      '--disable-component-extensions-with-background-pages',
      '--enable-automation=false',
      '--password-store=basic',
      '--use-mock-keychain',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-gpu'
    ]
  };
}

// Subtitle processing has been moved to frontend OpenSubtitles API integration
// VM-server now focuses only on stream extraction for better performance

// Setup stream interception to capture m3u8 URLs
function setupStreamInterception(page, logger, targetUrl = '') {
  const streamUrls = [];
  let responseCount = 0;

  // Intercept network responses
  page.on('response', async (response) => {
    responseCount++;
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();

    try {
      // Log all responses for debugging
      if (responseCount <= 50) { // Limit logging to prevent spam
        logger.debug('Network response intercepted', {
          url: responseUrl.substring(0, 150),
          status,
          contentType,
          responseCount
        });
      }

      // Subtitle detection removed - now handled by frontend OpenSubtitles API

      // Check for shadowlandschronicles URLs with master playlists
      const isShadowlandschronicles = responseUrl.includes('shadowlandschronicles') && responseUrl.includes('master');
      
      // Check for general M3U8 content
      const isM3U8Response = 
        contentType.includes('mpegurl') ||
        contentType.includes('m3u8') ||
        contentType.includes('vnd.apple.mpegurl') ||
        contentType.includes('text/plain') ||
        responseUrl.includes('.m3u8') ||
        responseUrl.includes('master') ||
        responseUrl.includes('index');

      // Note: Subtitle processing removed - now handled by OpenSubtitles API

      // Priority for shadowlandschronicles master playlists
      if (isShadowlandschronicles || (isM3U8Response && (status === 200 || (isShadowlandschronicles && status === 403)))) {
        logger.info('Potential stream URL detected', {
          url: responseUrl.substring(0, 150),
          contentType,
          status,
          isShadowlandschronicles,
          isM3U8Response,
          priority: isShadowlandschronicles ? 0 : isM3U8Response ? 1 : 2
        });

        // For shadowlandschronicles URLs or successful M3U8 responses, try to read content
        if (status === 200 || (isShadowlandschronicles && status === 403)) {
          try {
            let responseText = '';
            if (status === 200) {
              responseText = await response.text();
            }

            // Check if it's actually M3U8 content
            const isActualM3U8 = responseText.includes('#EXTM3U') || responseUrl.includes('.m3u8') || isShadowlandschronicles;

            if (isActualM3U8) {
              // Determine stream source
              let source = 'unknown';
              if (responseUrl.includes('shadowlandschronicles')) {
                source = 'shadowlandschronicles';
              } else if (targetUrl.includes('vidsrc')) {
                source = 'vidsrc';
              } else if (targetUrl.includes('embed.su')) {
                source = 'embed.su';
              }

              streamUrls.push({
                url: responseUrl,
                contentType,
                status,
                source,
                priority: isShadowlandschronicles ? 0 : 1,
                isMaster: responseUrl.includes('master'),
                needsCleanHeaders: isShadowlandschronicles || status === 403
              });

              logger.info('Valid M3U8 stream found', {
                url: responseUrl.substring(0, 150),
                source,
                priority: isShadowlandschronicles ? 0 : 1,
                isMaster: responseUrl.includes('master'),
                contentLength: responseText.length,
                needsCleanHeaders: isShadowlandschronicles || status === 403
              });
            }
          } catch (contentError) {
            logger.warn('Could not read response content', {
              url: responseUrl.substring(0, 100),
              error: contentError.message
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Error processing response', {
        url: responseUrl.substring(0, 100),
        error: error.message
      });
    }
  });

  return { streamUrls };
}

// Subtitle interception removed - now handled by frontend OpenSubtitles API
// This allows the VM-server to focus purely on stream extraction
          });
          if (!requestHandled) {
            requestHandled = true;
            await request.continue();
          }
        }
      } catch (error) {
        logger.warn('Error intercepting subtitle request', {
          url: requestUrl.substring(0, 100),
          error: error.message
        });
        if (!requestHandled) {
          requestHandled = true;
          await request.continue();
        }
      }
    } else {
      // Continue with non-subtitle requests normally
      if (!requestHandled) {
        requestHandled = true;
        await request.continue();
      }
    }
  });

  // Intercept network responses for subtitle files
  page.on('response', async (response) => {
    const responseUrl = response.url();
    const contentType = response.headers()['content-type'] || '';
    const status = response.status();

    try {
      // Check for VTT/subtitle content
      const isSubtitleResponse = 
        contentType.includes('text/vtt') ||
        contentType.includes('text/plain') ||
        responseUrl.includes('.vtt') ||
        responseUrl.includes('subtitle') ||
        responseUrl.includes('caption') ||
        responseUrl.toLowerCase().includes('sub') ||
        responseUrl.includes('cloudnestra.com') ||
        responseUrl.includes('subtitles_pjs');

      if (isSubtitleResponse && status === 200) {
        vttResponseCount++;
        logger.info('Subtitle/VTT URL detected', {
          url: responseUrl.substring(0, 150),
          contentType,
          status,
          vttResponseCount
        });

        try {
          const responseText = await response.text();
          
          // Check if it's actually VTT content or subtitle-related
          const isActualVTT = responseText.includes('WEBVTT') || 
                             responseUrl.includes('.vtt') ||
                             contentType.includes('text/vtt');
                             
          const isSubtitleJS = responseText.includes('showSubtitles') ||
                              responseText.includes('addSubtitle') ||
                              responseUrl.includes('subtitles_pjs') ||
                              responseUrl.includes('pjs_main_drv_cast.js') ||
                              responseUrl.includes('.js') ||
                              responseText.includes('function') ||
                              responseText.includes('var ') ||
                              responseText.includes('document.') ||
                              responseText.includes('window.');

          // ONLY process actual VTT files, not JavaScript
          if (isActualVTT && !isSubtitleJS) {
            logger.info('🎯 VTT DEBUG: Found actual VTT content', {
              url: responseUrl.substring(0, 150),
              contentLength: responseText.length,
              startsWithWEBVTT: responseText.includes('WEBVTT'),
              contentType
            });
            
            // Fetch the actual VTT content to avoid CORS issues in frontend
            let vttContent = responseText;
            
            // If we only got a partial response or need to fetch the full content
            if (!vttContent || (vttContent.length < 100 && isActualVTT)) {
              try {
                logger.info('Fetching full VTT content to avoid CORS', { url: responseUrl.substring(0, 100) });
                
                const vttResponse = await fetch(responseUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept': 'text/vtt, text/plain, */*',
                    'Referer': page.url(),
                    'Origin': new URL(page.url()).origin
                  }
                });
                
                if (vttResponse.ok) {
                  vttContent = await vttResponse.text();
                  logger.info('Successfully fetched full VTT content', { 
                    url: responseUrl.substring(0, 100),
                    contentLength: vttContent.length 
                  });
                } else {
                  logger.warn('Failed to fetch VTT content', { 
                    url: responseUrl.substring(0, 100),
                    status: vttResponse.status 
                  });
                }
              } catch (fetchError) {
                logger.warn('Error fetching VTT content', {
                  url: responseUrl.substring(0, 100),
                  error: fetchError.message
                });
                // Use the original response text as fallback
              }
            }

            // Only store actual VTT content with WEBVTT header
            if (vttContent.includes('WEBVTT')) {
              const detectedLanguage = detectLanguageFromUrl(responseUrl);
              
              subtitleUrls.push({
                url: responseUrl,
                contentType,
                status,
                language: detectedLanguage,
                isVTT: true,
                contentLength: vttContent.length,
                content: vttContent, // Store the actual VTT content
                preview: vttContent.substring(0, 200)
              });

              logger.info('✅ VALID VTT SUBTITLE STORED', {
                url: responseUrl.substring(0, 150),
                language: detectedLanguage,
                contentLength: vttContent.length,
                hasContent: !!vttContent,
                isOpenSubtitles: responseUrl.includes('opensubtitles'),
                hasWEBVTT: vttContent.includes('WEBVTT')
              });
            } else {
              logger.warn('🚫 VTT DEBUG: Content does not contain WEBVTT header', {
                url: responseUrl.substring(0, 100),
                contentPreview: vttContent.substring(0, 100)
              });
            }
          } else if (isSubtitleJS) {
            logger.info('🚫 VTT DEBUG: Skipping JavaScript file', {
              url: responseUrl.substring(0, 100),
              contentType,
              contentPreview: responseText.substring(0, 100)
            });
          } else {
            logger.info('🚫 VTT DEBUG: Not VTT content', {
              url: responseUrl.substring(0, 100),
              contentType,
              isActualVTT,
              isSubtitleJS,
              contentLength: responseText.length
            });
          }
                  } catch (contentError) {
            logger.warn('Could not read subtitle response content', {
              url: responseUrl.substring(0, 100),
              error: contentError.message
            });
          }
        } else {
          logger.info('🚫 VTT DEBUG: Response not matching subtitle criteria', {
            url: responseUrl.substring(0, 100),
            contentType,
            status,
            isSubtitleResponse
          });
      }
    } catch (error) {
      logger.warn('Error processing subtitle response', {
        url: responseUrl.substring(0, 100),
        error: error.message
      });
    }
  });

  return { subtitleUrls, vttResponseCount: () => vttResponseCount, interceptedRequests };
}

// Helper function to detect language from URL
function detectLanguageFromUrl(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('english') || urlLower.includes('en')) return 'english';
  if (urlLower.includes('spanish') || urlLower.includes('es')) return 'spanish';
  if (urlLower.includes('french') || urlLower.includes('fr')) return 'french';
  if (urlLower.includes('german') || urlLower.includes('de')) return 'german';
  if (urlLower.includes('italian') || urlLower.includes('it')) return 'italian';
  if (urlLower.includes('portuguese') || urlLower.includes('pt')) return 'portuguese';
  
  return 'unknown';
}

// Interact with the page to trigger stream loading with realistic human behavior
async function interactWithPage(page, logger, subtitleUrls = []) {
  const interactionStart = Date.now();
  
  try {
    // Wait for page to be ready with realistic timing
    await page.waitForSelector('body', { timeout: 15000 });
    
    // Set localStorage for subtitle preferences BEFORE any video player loads
    await page.evaluate(() => {
      try {
        // Set subtitle preference to English for various video players
        localStorage.setItem('pljssubtitle', 'English');
        localStorage.setItem('pljs_subtitle', 'English');
        localStorage.setItem('subtitle_lang', 'English');
        localStorage.setItem('subtitle_language', 'English');
        localStorage.setItem('captions_lang', 'English');
        localStorage.setItem('video_subtitle_lang', 'en');
        localStorage.setItem('player_subtitle', 'English');
        
        console.log('✅ LOCAL STORAGE: Set subtitle preferences to English', {
          pljssubtitle: localStorage.getItem('pljssubtitle'),
          pljs_subtitle: localStorage.getItem('pljs_subtitle'),
          subtitle_lang: localStorage.getItem('subtitle_lang')
        });
      } catch (e) {
        console.warn('⚠️ LOCAL STORAGE: Error setting subtitle preferences', e);
      }
    });
    
    // Simulate human-like page reading time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Simulate mouse movement and scrolling
    await page.evaluate(() => {
      // Generate some mouse events
      const events = ['mousemove', 'mousedown', 'mouseup'];
      events.forEach(eventType => {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight
        });
        document.dispatchEvent(event);
      });
      
      // Simulate scroll
      window.scrollTo(0, Math.random() * 200);
    });
    
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    // Look for iframes first (common on vidsrc)
    const iframes = await page.$$('iframe');
    if (iframes.length > 0) {
      logger.info('Found iframes, attempting to interact', { count: iframes.length });
      
      for (let i = 0; i < Math.min(iframes.length, 3); i++) {
        try {
          const iframe = iframes[i];
          const src = await iframe.evaluate(el => el.src);
          
          if (src && (src.includes('player') || src.includes('embed') || src.includes('video'))) {
            logger.info('Found video iframe', { src: src.substring(0, 100) });
            
            // Try to access iframe content
            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Look for play buttons in iframe (prioritizing vidsrc.xyz specific)
                const playSelectors = [
                  '#pl_but',                           // Specific vidsrc.xyz play button ID
                  '.fas.fa-play',                     // Specific vidsrc.xyz play button class
                  'button#pl_but',                    // More specific vidsrc button selector
                  '[id="pl_but"]',                    // Alternative ID selector
                  'button.fas.fa-play',               // Alternative class selector
                  'button[class*="play"]',
                  'div[class*="play"]',
                  '[data-testid*="play"]',
                  '.play-button',
                  '.video-play-button',
                  'button[aria-label*="play" i]',
                  'button[title*="play" i]',
                  '.play',
                  '.btn-play',
                  '#play-btn',
                  '.play-icon'
                ];
                
                for (const selector of playSelectors) {
                  try {
                    const playButton = await frame.$(selector);
                    if (playButton) {
                      logger.info('Found play button in iframe', { selector });
                      await playButton.click();
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      break;
                    }
                  } catch (e) {
                    // Continue
                  }
                }
                
                // Try clicking on video elements in iframe
                const videoElements = await frame.$$('video, .video, .player');
                if (videoElements.length > 0) {
                  try {
                    await videoElements[0].click();
                    logger.info('Clicked video element in iframe');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } catch (e) {
                    // Continue
                  }
                }
              }
            } catch (e) {
              logger.debug('Could not access iframe content (CORS)');
            }
            
            // Click on the iframe itself
            try {
              await iframe.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Continue
            }
          }
        } catch (e) {
          logger.debug('Error interacting with iframe', { index: i, error: e.message });
        }
      }
    }
    
    // Look for and click play buttons in main page (prioritizing vidsrc.xyz specific button)
    const playSelectors = [
      '#pl_but',                                    // Specific vidsrc.xyz play button ID
      '.fas.fa-play',                              // Specific vidsrc.xyz play button class
      'button#pl_but',                             // More specific vidsrc button selector
      '[id="pl_but"]',                             // Alternative ID selector
      'button.fas.fa-play',                        // Alternative class selector
      'button[class*="play"]',
      'div[class*="play"]',
      '[data-testid*="play"]',
      '.play-button',
      '.video-play-button', 
      '[data-testid="play-button"]',
      'button[aria-label*="play" i]',
      'button[title*="play" i]',
      '.play',
      '.btn-play',
      '#play-btn',
      '.play-icon',
      'div[role="button"]',  // Will check text content programmatically if needed
      '[class*="play"][role="button"]',
      '[id*="play"]',
      '.vjs-big-play-button',
      '.plyr__control--overlaid'
    ];

    let playButtonFound = false;
    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found play button', { selector, count: elements.length });
          
          // Special handling for vidsrc.xyz play button
          if (selector === '#pl_but' || selector === '.fas.fa-play') {
            logger.info('Found vidsrc.xyz specific play button', { selector });
            
            // Get button properties for debugging
            const buttonInfo = await elements[0].evaluate(el => ({
              id: el.id,
              className: el.className,
              tagName: el.tagName,
              visible: el.offsetParent !== null,
              disabled: el.disabled,
              innerText: el.innerText
            }));
            
            logger.info('vidsrc.xyz play button properties', buttonInfo);
          }
          
          // Human-like interaction - hover first, then click
          await elements[0].hover();
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
          await elements[0].click();
          playButtonFound = true;
          
          // Extra wait for vidsrc.xyz button to ensure it processes
          if (selector === '#pl_but' || selector === '.fas.fa-play') {
            logger.info('Clicked vidsrc.xyz play button, waiting for stream initialization...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
          }
          break;
        }
      } catch (e) {
        logger.debug('Error with play button selector', { selector, error: e.message });
      }
    }

    // If still no play button found, try text-based detection
    if (!playButtonFound) {
      logger.info('Attempting text-based play button detection');
      
      try {
        // Look for buttons or elements with "Play" text
        const playButtons = await page.evaluate(() => {
          const elements = [];
          const allElements = document.querySelectorAll('button, div[role="button"], span, a');
          
          for (const el of allElements) {
            const text = el.innerText?.toLowerCase() || '';
            const title = el.title?.toLowerCase() || '';
            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
            
            if (text.includes('play') || title.includes('play') || ariaLabel.includes('play')) {
              elements.push({
                selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
                text: el.innerText,
                visible: el.offsetParent !== null
              });
            }
          }
          return elements;
        });
        
        if (playButtons.length > 0) {
          logger.info('Found text-based play buttons', { count: playButtons.length, buttons: playButtons });
          
          // Try to click the first visible one
          for (const buttonInfo of playButtons) {
            if (buttonInfo.visible) {
              try {
                const button = await page.evaluateHandle((selector) => {
                  // More robust element finding
                  const elements = document.querySelectorAll('button, div[role="button"], span, a');
                  for (const el of elements) {
                    const text = el.innerText?.toLowerCase() || '';
                    if (text.includes('play')) {
                      return el;
                    }
                  }
                  return null;
                }, buttonInfo.selector);
                
                if (button) {
                  await button.hover();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await button.click();
                  logger.info('Clicked text-based play button', { text: buttonInfo.text });
                  playButtonFound = true;
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  break;
                }
              } catch (e) {
                logger.debug('Error clicking text-based play button', { error: e.message });
              }
            }
          }
        }
      } catch (e) {
        logger.debug('Error in text-based play button detection', { error: e.message });
      }
    }

    if (!playButtonFound) {
      logger.info('No play button found, attempting hover and click interactions');
      
      // Try clicking on potential video areas
      const videoSelectors = [
        'video',
        '.video-container',
        '.player',
        '.video-player',
        '#player',
        '.video-wrapper',
        '.player-container',
        '[class*="video"]',
        '[class*="player"]'
      ];

      for (const selector of videoSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            logger.info('Interacting with video container', { selector });
            
            // Simulate human-like interaction
            await element.hover();
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
            
            // Try multiple click types
            try {
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Try clicking at center
              const box = await element.boundingBox();
              if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            break;
          }
        } catch (e) {
          logger.debug('Error interacting with video selector', { selector, error: e.message });
        }
      }
    }
    
    // Simulate additional user behavior
    await page.evaluate(() => {
      // Trigger some events that might initiate video loading
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('click'));
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Try to trigger any lazy loading
      if (window.IntersectionObserver) {
        const videos = document.querySelectorAll('video, iframe');
        videos.forEach(video => {
          const event = new Event('intersect');
          video.dispatchEvent(event);
        });
      }
    });

    // Additional realistic wait for streams to load
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    
    // Final attempt - trigger more events
    await page.evaluate(() => {
      // Try to simulate user interactions that might trigger video loading
      const allElements = document.querySelectorAll('*');
      let attempts = 0;
      
      for (const element of allElements) {
        if (attempts >= 10) break;
        
        if (element.tagName === 'VIDEO' || 
            element.className.toLowerCase().includes('play') ||
            element.className.toLowerCase().includes('video') ||
            element.id.toLowerCase().includes('play') ||
            element.id.toLowerCase().includes('video')) {
          
          try {
            element.dispatchEvent(new Event('click', { bubbles: true }));
            element.dispatchEvent(new Event('mouseenter', { bubbles: true }));
            attempts++;
          } catch (e) {
            // Continue
          }
        }
      }
    });

    // Subtitle automation no longer needed - localStorage sets English preference automatically
    logger.info('✅ SUBTITLE AUTOMATION: Using localStorage approach - English subtitles should load automatically', {
      subtitleUrlsFound: subtitleUrls ? subtitleUrls.length : 0
    });

    logger.timing('Page interaction completed', interactionStart);
      
  } catch (error) {
    logger.warn('Page interaction error', { error: error.message });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Flyx Extract Stream Service',
    version: '1.0.0'
  });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    service: 'Flyx Extract Stream Service',
    version: '1.0.0',
    endpoints: {
      '/health': 'Health check',
      '/extract': 'Extract stream URLs and subtitles (JSON response)',
      '/extract-stream': 'Extract stream URLs and subtitles with real-time progress (Server-Sent Events)',
    },
    features: {
      streamExtraction: 'Automatically extracts M3U8 stream URLs from video embedding sites',
      subtitleAutomation: 'Automatically enables English subtitles via localStorage and captures VTT files',
      stealthMode: 'Advanced anti-bot detection bypass with realistic human behavior simulation',
      multiServer: 'Support for vidsrc.xyz, embed.su, and other embedding services'
    },
    usage: {
      extract: {
        method: 'GET',
        parameters: {
          url: 'Direct URL to extract from (optional)',
          mediaType: 'movie or tv (required if no url)',
          movieId: 'TMDB movie/show ID (required if no url)',
          seasonId: 'Season number (required for TV)',
          episodeId: 'Episode number (required for TV)',
          server: 'vidsrc.xyz or embed.su (default: vidsrc.xyz)'
        },
        examples: [
          '/extract?mediaType=movie&movieId=123456&server=vidsrc.xyz',
          '/extract?mediaType=tv&movieId=123456&seasonId=1&episodeId=1&server=vidsrc.xyz',
          '/extract?url=https://vidsrc.xyz/embed/movie?tmdb=123456'
        ],
        response: {
          streamUrl: 'M3U8 stream URL for video playback',
          subtitles: 'Array of detected subtitle/VTT files with language detection',
          debug: 'Technical details about extraction process'
        }
      },
      'extract-stream': {
        method: 'GET',
        description: 'Real-time streaming extraction with progress updates via Server-Sent Events',
        parameters: 'Same as /extract endpoint',
        response: 'text/event-stream with JSON progress updates',
        examples: [
          '/extract-stream?mediaType=movie&movieId=123456&server=vidsrc.xyz',
          '/extract-stream?mediaType=tv&movieId=123456&seasonId=1&episodeId=1&server=vidsrc.xyz'
        ],
        progressPhases: [
          'initializing (5%)',
          'connecting (10-15%)',
          'navigating (25-35%)',
          'bypassing (45-50%)',
          'extracting (65-95%)',
          'subtitles (82-95%) - English subtitles enabled via localStorage',
          'validating (90%)',
          'finalizing (95%)',
          'complete (100%)'
        ]
      }
    },
    subtitleAutomation: {
      description: 'Automatically enables English subtitles for enhanced video experience',
      process: [
        '1. Set localStorage preferences (pljssubtitle=English) before video player loads',
        '2. Video player automatically loads English subtitles',
        '3. Capture VTT subtitle files through network interception',
        '4. Return subtitle content with proper CORS handling'
      ],
      supportedFormats: ['VTT', 'WebVTT', 'Text-based subtitles'],
      languageDetection: 'Automatic language detection from URL patterns'
    }
  });
});

// Main extract endpoint
app.get('/extract', async (req, res) => {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('Stream extraction request started', {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  });

  let browser = null;
  let url, mediaType, movieId, seasonId, episodeId, server;
  
  try {
    // Parse and validate parameters
    const validation = validateParameters(req.query, logger);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false, 
        error: validation.error,
        requestId 
      });
    }

    ({ url, mediaType, movieId, seasonId, episodeId, server } = validation.params);

    // Launch browser
    logger.info('Launching Puppeteer browser');
    const launchStart = Date.now();
    
    const browserConfig = await getBrowserConfig(logger);
    logger.debug('Browser configuration', browserConfig);
    
    browser = await puppeteer.launch(browserConfig);
    
    logger.timing('Browser launch took', launchStart);

    // Create new page with enhanced stealth settings
    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ 
      width: 1920, 
      height: 1080, 
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    // Set extra HTTP headers to mimic real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Advanced stealth measures - equivalent to puppeteer-extra-plugin-stealth
    await page.evaluateOnNewDocument(() => {
      // === WEBDRIVER PROPERTY REMOVAL ===
      // Remove all possible webdriver traces
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      
      delete navigator.__proto__.webdriver;
      delete navigator.webdriver;
      delete window.navigator.webdriver;
      
      // Remove automation flags
      ['__nightmare', '__phantomas', '__fxdriver_unwrapped', '__driver_evaluate', '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped', '_phantom', '__phantom', '_selenium', 'callPhantom', 'callSelenium', '_Selenium_IDE_Recorder'].forEach(prop => {
        delete window[prop];
      });
      
      // === CHROME OBJECT MOCKING ===
      Object.defineProperty(window, 'chrome', {
        value: {
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: 'disabled',
              INSTALLED: 'installed',
              NOT_INSTALLED: 'not_installed'
            },
            RunningState: {
              CANNOT_RUN: 'cannot_run',
              READY_TO_RUN: 'ready_to_run',
              RUNNING: 'running'
            }
          },
          runtime: {
            onConnect: null,
            onMessage: null,
            PlatformOs: {
              ANDROID: 'android',
              CROS: 'cros', 
              LINUX: 'linux',
              MAC: 'mac',
              OPENBSD: 'openbsd',
              WIN: 'win'
            }
          },
          csi: function() {},
          loadTimes: function() {
            return {
              requestTime: Date.now() / 1000 - Math.random() * 2,
              startLoadTime: Date.now() / 1000 - Math.random() * 1.5,
              commitLoadTime: Date.now() / 1000 - Math.random() * 1,
              finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 0.5,
              finishLoadTime: Date.now() / 1000 - Math.random() * 0.2,
              firstPaintTime: Date.now() / 1000 - Math.random() * 0.1,
              firstPaintAfterLoadTime: 0,
              navigationType: 'Other'
            };
          }
        },
        configurable: true,
        writable: true
      });
      
      // === PLUGIN AND MIMETYPE MOCKING ===
      const mockPlugins = [
        {
          0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: null },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'Chrome PDF Plugin'
        },
        {
          0: { type: 'application/x-nacl', suffixes: '', enabledPlugin: null },
          1: { type: 'application/x-pnacl', suffixes: '', enabledPlugin: null },
          description: '',
          filename: 'internal-nacl-plugin',
          length: 2,
          name: 'Native Client'
        }
      ];
      
      const mockMimeTypes = [
        { type: 'application/pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-nacl', suffixes: '', enabledPlugin: mockPlugins[1] },
        { type: 'application/x-pnacl', suffixes: '', enabledPlugin: mockPlugins[1] }
      ];
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => mockPlugins,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => mockMimeTypes,
        configurable: true
      });
      
      // === NAVIGATOR PROPERTY MOCKING ===
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });
      
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
        configurable: true
      });
      
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
      });
      
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'doNotTrack', {
        get: () => null,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 100,
          downlink: 10,
          saveData: false
        }),
        configurable: true
      });
      
      // === PERMISSIONS API MOCKING ===
      const originalQuery = navigator.permissions && navigator.permissions.query;
      if (navigator.permissions) {
        navigator.permissions.query = function(parameters) {
          return parameters.name === 'notifications' 
            ? Promise.resolve({ state: 'default' })
            : originalQuery ? originalQuery.call(this, parameters) : Promise.reject(new Error('Permission API not available'));
        };
      }
      
      // === CANVAS FINGERPRINT PROTECTION ===
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attributes) {
        if (type === '2d') {
          const context = originalGetContext.call(this, type, attributes);
          const originalFillText = context.fillText;
          const originalStrokeText = context.strokeText;
          const originalGetImageData = context.getImageData;
          
          context.fillText = function() {
            const args = Array.prototype.slice.call(arguments);
            return originalFillText.apply(this, args);
          };
          
          context.strokeText = function() {
            const args = Array.prototype.slice.call(arguments);
            return originalStrokeText.apply(this, args);
          };
          
          context.getImageData = function() {
            const imageData = originalGetImageData.apply(this, arguments);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] + Math.floor(Math.random() * 3) - 1);
            }
            return imageData;
          };
          
          return context;
        }
        return originalGetContext.call(this, type, attributes);
      };
      
      // === WEBGL FINGERPRINT PROTECTION ===
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return originalGetParameter.call(this, parameter);
      };
      
      // === SCREEN PROPERTIES ===
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });
      
      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });
      
      // === IFRAME CONTENT WINDOW PROTECTION ===
      const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (originalContentWindow) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
            const win = originalContentWindow.get.call(this);
            if (win) {
              try {
                win.navigator.webdriver = undefined;
                delete win.navigator.webdriver;
              } catch (e) {}
            }
            return win;
          },
          configurable: true
        });
      }
      
      // === FUNCTION PROTOTYPE TOSTRING OVERRIDE ===
      const originalToString = Function.prototype.toString;
      const proxyToString = new Proxy(originalToString, {
        apply: function(target, thisArg, argumentsList) {
          if (thisArg === Function.prototype.toString) {
            return 'function toString() { [native code] }';
          }
          if (thisArg === originalToString) {
            return 'function toString() { [native code] }';
          }
          return target.apply(thisArg, argumentsList);
        }
      });
      
      Function.prototype.toString = proxyToString;
      
      // === TIMING ATTACKS PROTECTION ===
      const originalPerformanceNow = performance.now;
      let performanceOffset = Math.random() * 100;
      performance.now = new Proxy(originalPerformanceNow, {
        apply: function(target, thisArg, argumentsList) {
          return target.apply(thisArg, argumentsList) + performanceOffset + (Math.random() - 0.5) * 0.1;
        }
      });
      
      // === DATE TIMEZONE PROTECTION ===
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        return 300; // EST timezone
      };
      
      // === BATTERY API MOCKING ===
      if ('getBattery' in navigator) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: Infinity,
          dischargingTime: Infinity,
          level: 0.95
        });
      }
      
      // === NOTIFICATION PERMISSIONS ===
      if ('Notification' in window) {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'default',
          configurable: true
        });
      }
      
      // === REMOVE AUTOMATION INDICATORS ===
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy;
      
      // === MEDIA DEVICES MOCKING ===
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function() {
          return originalEnumerateDevices.call(this).then(devices => {
            return devices.map(device => ({
              ...device,
              label: device.label || 'Default Device'
            }));
          });
        };
      }
      
      // === ERROR STACK TRACE CLEANING ===
      const originalError = window.Error;
      window.Error = function(...args) {
        const error = new originalError(...args);
        if (error.stack) {
          error.stack = error.stack.replace(/\s+at (chrome-extension|moz-extension|webkit-extension):\/\/[^\s]+/g, '');
        }
        return error;
      };
      
      // === GEOLOCATION MOCKING ===
      if (navigator.geolocation) {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          const mockPosition = {
            coords: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 20000,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
          if (success) success(mockPosition);
        };
      }
    });
   
    // Enable request interception for header modification
    await page.setRequestInterception(true);
    
    // Intercept and modify requests for better stealth
    page.on('request', request => {
      const headers = {
        ...request.headers(),
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': request.resourceType() === 'document' ? 'document' : request.resourceType(),
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1'
      };
      
      // Remove automation headers
      delete headers['x-devtools-emulation-enabled'];
      delete headers['x-client-data'];
      
      request.continue({ headers });
          });
      
      // Setup stream interception
      const { streamUrls } = setupStreamInterception(page, logger, url);
  
      // Subtitle interception removed - now handled by frontend OpenSubtitles API
      const subtitleUrls = [];
      const vttResponseCount = () => 0;
      const interceptedRequests = new Map();

    // Navigate to the page
    logger.info('Navigating to target URL');
    const navigationStart = Date.now();
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      const navigationStatus = response?.status() || 'unknown';
      logger.info('Page navigation completed', { 
        status: navigationStatus,
        url: url.substring(0, 100)
      });

      // Check for 404 error (for auto-switching)
      if (navigationStatus === 404) {
        logger.warn('404 error detected - page not found', { 
          status: navigationStatus,
          server 
        });
        
        return res.status(404).json({
          success: false,
          error: `Content not found on ${server}`,
          debug: {
            navigationStatus: 404,
            wasNavigationError: true,
            server,
            suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz'
          },
          requestId
        });
      }
      
    } catch (navigationError) {
      logger.error('Navigation failed', navigationError, { url });
      
      // Check if it's a 404 specifically
      if (navigationError.message?.includes('404') || navigationError.message?.includes('ERR_FAILED')) {
        return res.status(404).json({
          success: false,
          error: `Content not found on ${server}`,
          debug: {
            wasNavigationError: true,
            navigationStatus: 404,
            server,
            suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz'
          },
          requestId
        });
      }
      
      throw navigationError;
    }
    
    logger.timing('Navigation took', navigationStart);

    // Interact with page to trigger stream loading
    await interactWithPage(page, logger, subtitleUrls);

    // Wait additional time for streams to be captured with progressive checking
    let checkCount = 0;
    const maxChecks = 8;
    
    while (checkCount < maxChecks && streamUrls.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      checkCount++;
      
      if (checkCount % 2 === 0) {
        // Trigger additional interactions every 4 seconds
        await page.evaluate(() => {
          // Trigger events that might load delayed content
          window.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('resize'));
          document.dispatchEvent(new Event('visibilitychange'));
          
          // Try clicking specific vidsrc.xyz play button first
          const vidsrcPlayButton = document.querySelector('#pl_but') || document.querySelector('.fas.fa-play');
          if (vidsrcPlayButton) {
            try {
              vidsrcPlayButton.click();
              vidsrcPlayButton.dispatchEvent(new Event('mouseenter'));
              vidsrcPlayButton.dispatchEvent(new Event('focus'));
            } catch (e) {
              // Continue
            }
          }
          
          // Try clicking any remaining play buttons or video elements
          const elements = document.querySelectorAll('video, iframe, [class*="play"], [id*="play"]');
          elements.forEach((element, index) => {
            if (index < 3) { // Limit to first 3 elements
              try {
                element.click();
                element.dispatchEvent(new Event('mouseenter'));
              } catch (e) {
                // Continue
              }
            }
          });
        });
       
        logger.info(`Progressive check ${checkCount}/${maxChecks}`, { 
          currentStreams: streamUrls.length 
        });
      }
    }
    
    logger.info('Stream detection completed after progressive checks', {
      totalChecks: checkCount,
      finalStreamCount: streamUrls.length
    });

    // Sort and filter streams
    const m3u8Streams = streamUrls.filter(stream => 
      stream.url && (
        stream.url.includes('.m3u8') || 
        stream.contentType?.includes('mpegurl') ||
        stream.source === 'shadowlandschronicles'
      )
    );

    // Sort by priority: shadowlandschronicles master (0) > other masters (1) > regular m3u8 (2)
    m3u8Streams.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isMaster !== b.isMaster) return b.isMaster - a.isMaster; // Masters first
      return 0;
    });

    logger.info('Stream extraction completed', {
      totalFound: streamUrls.length,
      m3u8Count: m3u8Streams.length,
      streams: m3u8Streams.slice(0, 3).map(s => ({
        url: s.url.substring(0, 100),
        source: s.source,
        priority: s.priority,
        isMaster: s.isMaster
      }))
    });

    if (m3u8Streams.length === 0) {
      logger.warn('No streams found', {
        totalResponses: streamUrls.length,
        server
      });
      
      return res.status(404).json({
        success: false,
        error: `No streams found on ${server}. Try switching servers.`,
        debug: {
          totalFound: streamUrls.length,
          m3u8Count: 0,
          server,
          suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz'
        },
        requestId
      });
    }

    // Select the best stream (highest priority, preferring masters)
    const selectedStream = m3u8Streams[0];
    
    logger.info('Selected optimal stream', {
      url: selectedStream.url.substring(0, 150),
      source: selectedStream.source,
      priority: selectedStream.priority,
      isMaster: selectedStream.isMaster,
      needsCleanHeaders: selectedStream.needsCleanHeaders
    });

    const totalDuration = logger.timing('Total request duration', requestStart);

    // Note: Subtitle processing moved to OpenSubtitles API integration

    // Return successful response
    return res.json({ 
      success: true, 
      streamUrl: selectedStream.url,
      type: 'hls',
      server: server,
      totalFound: streamUrls.length,
      m3u8Count: m3u8Streams.length,
      subtitles: {
        found: subtitleUrls.length,
        urls: subtitleUrls.map(sub => ({
          url: sub.url,
          language: sub.language,
          isVTT: sub.isVTT,
          contentLength: sub.contentLength,
          content: sub.content // Include actual VTT content to avoid CORS
        }))
      },
      requestId,
      debug: {
        selectedStream: {
          source: selectedStream.source,
          priority: selectedStream.priority,
          isMaster: selectedStream.isMaster,
          needsCleanHeaders: selectedStream.needsCleanHeaders
        },
        totalDuration,
        server,
        subtitleAutomation: subtitleUrls.length > 0 ? 'enabled' : 'no_subtitles_found'
      }
    });

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    logger.error('Stream extraction failed', error, {
      url: url || 'unknown',
      mediaType: mediaType || 'unknown',
      requestDuration: totalDuration
    });

    return res.status(500).json({
      success: false, 
      error: error.message || 'Unknown error occurred',
      requestId,
      debug: {
        requestDuration: totalDuration
      }
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug('Browser closed successfully');
      } catch (closeError) {
        logger.warn('Error closing browser', { error: closeError.message });
      }
    }
  }
});

// Real-time streaming extract endpoint with progress updates
app.get('/extract-stream', async (req, res) => {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('Streaming extraction request started', {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  });

  // Set up Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Function to send progress updates
  const sendProgress = (phase, progress, message, additionalData = {}) => {
    const data = {
      phase,
      progress,
      message,
      timestamp: Date.now(),
      requestId,
      ...additionalData
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    logger.info(`Progress: ${phase} (${progress}%)`, { message });
  };

  let browser = null;
  let url, mediaType, movieId, seasonId, episodeId, server;
  
  try {
    // Send initial progress
    sendProgress('initializing', 5, 'Initializing extraction service');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Parse and validate parameters
    sendProgress('connecting', 10, 'Validating request parameters');
    const validation = validateParameters(req.query, logger);
    
    if (!validation.isValid) {
      sendProgress('error', 0, validation.error, { error: true });
      return res.end();
    }

    ({ url, mediaType, movieId, seasonId, episodeId, server } = validation.params);

    // Launch browser
    sendProgress('connecting', 15, 'Launching browser instance');
    const launchStart = Date.now();
    
    const browserConfig = await getBrowserConfig(logger);
    logger.debug('Browser configuration', browserConfig);
    
    browser = await puppeteer.launch(browserConfig);
    logger.timing('Browser launch took', launchStart);

    sendProgress('navigating', 25, 'Setting up browser environment');
    
    // Create new page with enhanced stealth settings
    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ 
      width: 1920, 
      height: 1080, 
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    sendProgress('navigating', 35, 'Configuring stealth measures');
    
    // Set extra HTTP headers to mimic real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Advanced stealth measures - equivalent to puppeteer-extra-plugin-stealth
    await page.evaluateOnNewDocument(() => {
      // === WEBDRIVER PROPERTY REMOVAL ===
      // Remove all possible webdriver traces
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      
      delete navigator.__proto__.webdriver;
      delete navigator.webdriver;
      delete window.navigator.webdriver;
      
      // Remove automation flags
      ['__nightmare', '__phantomas', '__fxdriver_unwrapped', '__driver_evaluate', '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped', '_phantom', '__phantom', '_selenium', 'callPhantom', 'callSelenium', '_Selenium_IDE_Recorder'].forEach(prop => {
        delete window[prop];
      });
      
      // === CHROME OBJECT MOCKING ===
      Object.defineProperty(window, 'chrome', {
        value: {
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: 'disabled',
              INSTALLED: 'installed',
              NOT_INSTALLED: 'not_installed'
            },
            RunningState: {
              CANNOT_RUN: 'cannot_run',
              READY_TO_RUN: 'ready_to_run',
              RUNNING: 'running'
            }
          },
          runtime: {
            onConnect: null,
            onMessage: null,
            PlatformOs: {
              ANDROID: 'android',
              CROS: 'cros', 
              LINUX: 'linux',
              MAC: 'mac',
              OPENBSD: 'openbsd',
              WIN: 'win'
            }
          },
          csi: function() {},
          loadTimes: function() {
            return {
              requestTime: Date.now() / 1000 - Math.random() * 2,
              startLoadTime: Date.now() / 1000 - Math.random() * 1.5,
              commitLoadTime: Date.now() / 1000 - Math.random() * 1,
              finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 0.5,
              finishLoadTime: Date.now() / 1000 - Math.random() * 0.2,
              firstPaintTime: Date.now() / 1000 - Math.random() * 0.1,
              firstPaintAfterLoadTime: 0,
              navigationType: 'Other'
            };
          }
        },
        configurable: true,
        writable: true
      });
      
      // === PLUGIN AND MIMETYPE MOCKING ===
      const mockPlugins = [
        {
          0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: null },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'Chrome PDF Plugin'
        },
        {
          0: { type: 'application/x-nacl', suffixes: '', enabledPlugin: null },
          1: { type: 'application/x-pnacl', suffixes: '', enabledPlugin: null },
          description: '',
          filename: 'internal-nacl-plugin',
          length: 2,
          name: 'Native Client'
        }
      ];
      
      const mockMimeTypes = [
        { type: 'application/pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', enabledPlugin: mockPlugins[0] },
        { type: 'application/x-nacl', suffixes: '', enabledPlugin: mockPlugins[1] },
        { type: 'application/x-pnacl', suffixes: '', enabledPlugin: mockPlugins[1] }
      ];
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => mockPlugins,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => mockMimeTypes,
        configurable: true
      });
      
      // === NAVIGATOR PROPERTY MOCKING ===
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });
      
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US',
        configurable: true
      });
      
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
      });
      
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'doNotTrack', {
        get: () => null,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 100,
          downlink: 10,
          saveData: false
        }),
        configurable: true
      });
      
      // === PERMISSIONS API MOCKING ===
      const originalQuery = navigator.permissions && navigator.permissions.query;
      if (navigator.permissions) {
        navigator.permissions.query = function(parameters) {
          return parameters.name === 'notifications' 
            ? Promise.resolve({ state: 'default' })
            : originalQuery ? originalQuery.call(this, parameters) : Promise.reject(new Error('Permission API not available'));
        };
      }
      
      // === CANVAS FINGERPRINT PROTECTION ===
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attributes) {
        if (type === '2d') {
          const context = originalGetContext.call(this, type, attributes);
          const originalFillText = context.fillText;
          const originalStrokeText = context.strokeText;
          const originalGetImageData = context.getImageData;
          
          context.fillText = function() {
            const args = Array.prototype.slice.call(arguments);
            return originalFillText.apply(this, args);
          };
          
          context.strokeText = function() {
            const args = Array.prototype.slice.call(arguments);
            return originalStrokeText.apply(this, args);
          };
          
          context.getImageData = function() {
            const imageData = originalGetImageData.apply(this, arguments);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] + Math.floor(Math.random() * 3) - 1);
              imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] + Math.floor(Math.random() * 3) - 1);
            }
            return imageData;
          };
          
          return context;
        }
        return originalGetContext.call(this, type, attributes);
      };
      
      // === WEBGL FINGERPRINT PROTECTION ===
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return originalGetParameter.call(this, parameter);
      };
      
      // === SCREEN PROPERTIES ===
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
      });
      
      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
      });
      
      // === IFRAME CONTENT WINDOW PROTECTION ===
      const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (originalContentWindow) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
            const win = originalContentWindow.get.call(this);
            if (win) {
              try {
                win.navigator.webdriver = undefined;
                delete win.navigator.webdriver;
              } catch (e) {}
            }
            return win;
          },
          configurable: true
        });
      }
      
      // === FUNCTION PROTOTYPE TOSTRING OVERRIDE ===
      const originalToString = Function.prototype.toString;
      const proxyToString = new Proxy(originalToString, {
        apply: function(target, thisArg, argumentsList) {
          if (thisArg === Function.prototype.toString) {
            return 'function toString() { [native code] }';
          }
          if (thisArg === originalToString) {
            return 'function toString() { [native code] }';
          }
          return target.apply(thisArg, argumentsList);
        }
      });
      
      Function.prototype.toString = proxyToString;
      
      // === TIMING ATTACKS PROTECTION ===
      const originalPerformanceNow = performance.now;
      let performanceOffset = Math.random() * 100;
      performance.now = new Proxy(originalPerformanceNow, {
        apply: function(target, thisArg, argumentsList) {
          return target.apply(thisArg, argumentsList) + performanceOffset + (Math.random() - 0.5) * 0.1;
        }
      });
      
      // === DATE TIMEZONE PROTECTION ===
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        return 300; // EST timezone
      };
      
      // === BATTERY API MOCKING ===
      if ('getBattery' in navigator) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: Infinity,
          dischargingTime: Infinity,
          level: 0.95
        });
      }
      
      // === NOTIFICATION PERMISSIONS ===
      if ('Notification' in window) {
        Object.defineProperty(Notification, 'permission', {
          get: () => 'default',
          configurable: true
        });
      }
      
      // === REMOVE AUTOMATION INDICATORS ===
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy;
      
      // === MEDIA DEVICES MOCKING ===
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
        navigator.mediaDevices.enumerateDevices = function() {
          return originalEnumerateDevices.call(this).then(devices => {
            return devices.map(device => ({
              ...device,
              label: device.label || 'Default Device'
            }));
          });
        };
      }
      
      // === ERROR STACK TRACE CLEANING ===
      const originalError = window.Error;
      window.Error = function(...args) {
        const error = new originalError(...args);
        if (error.stack) {
          error.stack = error.stack.replace(/\s+at (chrome-extension|moz-extension|webkit-extension):\/\/[^\s]+/g, '');
        }
        return error;
      };
      
      // === GEOLOCATION MOCKING ===
      if (navigator.geolocation) {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          const mockPosition = {
            coords: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 20000,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
          if (success) success(mockPosition);
        };
      }
    });
   
    // Enable request interception for header modification
    await page.setRequestInterception(true);
    
    // Intercept and modify requests for better stealth
    page.on('request', request => {
      const headers = {
        ...request.headers(),
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': request.resourceType() === 'document' ? 'document' : request.resourceType(),
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1'
      };
      
      // Remove automation headers
      delete headers['x-devtools-emulation-enabled'];
      delete headers['x-client-data'];
      
      request.continue({ headers });
    });
    
    sendProgress('bypassing', 45, 'Bypassing anti-bot detection');
    
    // Setup stream interception
    const { streamUrls } = setupStreamInterception(page, logger, url);

    // Subtitle interception removed - now handled by frontend OpenSubtitles API
    const subtitleUrls = [];
    const vttResponseCount = () => 0;
    const interceptedRequests = new Map();

    // Navigate to the page
    sendProgress('bypassing', 50, 'Navigating to media page');
    const navigationStart = Date.now();
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      const navigationStatus = response?.status() || 'unknown';
      logger.info('Page navigation completed', { 
        status: navigationStatus,
        url: url.substring(0, 100)
      });

      // Check for 404 error (for auto-switching)
      if (navigationStatus === 404) {
        logger.warn('404 error detected - page not found', { 
          status: navigationStatus,
          server 
        });
        
        sendProgress('autoswitch', 0, `Content not found on ${server}, switching servers...`, {
          autoSwitchTo: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz',
          debug: {
            navigationStatus: 404,
            wasNavigationError: true,
            server
          }
        });
        return res.end();
      }
      
    } catch (navigationError) {
      logger.error('Navigation failed', navigationError, { url });
      
      // Check if it's a 404 specifically
      if (navigationError.message?.includes('404') || navigationError.message?.includes('ERR_FAILED')) {
        sendProgress('autoswitch', 0, `Content not found on ${server}, switching servers...`, {
          autoSwitchTo: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz',
          debug: {
            wasNavigationError: true,
            navigationStatus: 404,
            server
          }
        });
        return res.end();
      }
      
      throw navigationError;
    }
    
    logger.timing('Navigation took', navigationStart);

    sendProgress('extracting', 65, 'Interacting with page elements');
    
    // Interact with page to trigger stream loading
    await interactWithPageWithProgress(page, logger, sendProgress, subtitleUrls);

    sendProgress('extracting', 80, 'Capturing stream URLs');

    // Wait additional time for streams to be captured with progressive checking
    let checkCount = 0;
    const maxChecks = 8;
    
    while (checkCount < maxChecks && streamUrls.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      checkCount++;
      
      if (checkCount % 2 === 0) {
        sendProgress('extracting', 80 + (checkCount * 2), `Detecting streams... (${checkCount}/${maxChecks})`);
        
        // Trigger additional interactions every 4 seconds
        await page.evaluate(() => {
          // Trigger events that might load delayed content
          window.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('resize'));
          document.dispatchEvent(new Event('visibilitychange'));
          
          // Try clicking specific vidsrc.xyz play button first
          const vidsrcPlayButton = document.querySelector('#pl_but') || document.querySelector('.fas.fa-play');
          if (vidsrcPlayButton) {
            try {
              vidsrcPlayButton.click();
              vidsrcPlayButton.dispatchEvent(new Event('mouseenter'));
              vidsrcPlayButton.dispatchEvent(new Event('focus'));
            } catch (e) {
              // Continue
            }
          }
          
          // Try clicking any remaining play buttons or video elements
          const elements = document.querySelectorAll('video, iframe, [class*="play"], [id*="play"]');
          elements.forEach((element, index) => {
            if (index < 3) { // Limit to first 3 elements
              try {
                element.click();
                element.dispatchEvent(new Event('mouseenter'));
              } catch (e) {
                // Continue
              }
            }
          });
        });
       
        logger.info(`Progressive check ${checkCount}/${maxChecks}`, { 
          currentStreams: streamUrls.length 
        });
      }
    }
    
    sendProgress('validating', 90, 'Processing captured streams');
    
    logger.info('Stream detection completed after progressive checks', {
      totalChecks: checkCount,
      finalStreamCount: streamUrls.length
    });

    // Sort and filter streams
    const m3u8Streams = streamUrls.filter(stream => 
      stream.url && (
        stream.url.includes('.m3u8') || 
        stream.contentType?.includes('mpegurl') ||
        stream.source === 'shadowlandschronicles'
      )
    );

    // Sort by priority: shadowlandschronicles master (0) > other masters (1) > regular m3u8 (2)
    m3u8Streams.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isMaster !== b.isMaster) return b.isMaster - a.isMaster; // Masters first
      return 0;
    });

    logger.info('Stream extraction completed', {
      totalFound: streamUrls.length,
      m3u8Count: m3u8Streams.length,
      streams: m3u8Streams.slice(0, 3).map(s => ({
        url: s.url.substring(0, 100),
        source: s.source,
        priority: s.priority,
        isMaster: s.isMaster
      }))
    });

    if (m3u8Streams.length === 0) {
      logger.warn('No streams found', {
        totalResponses: streamUrls.length,
        server
      });
      
      sendProgress('error', 0, `No streams found on ${server}. Try switching servers.`, {
        error: true,
        debug: {
          totalFound: streamUrls.length,
          m3u8Count: 0,
          server,
          suggestSwitch: server === 'vidsrc.xyz' ? 'embed.su' : 'vidsrc.xyz'
        }
      });
      return res.end();
    }

    // Select the best stream (highest priority, preferring masters)
    const selectedStream = m3u8Streams[0];
    
    sendProgress('finalizing', 95, 'Preparing stream for playback');
    
    logger.info('Selected optimal stream', {
      url: selectedStream.url.substring(0, 150),
      source: selectedStream.source,
      priority: selectedStream.priority,
      isMaster: selectedStream.isMaster,
      needsCleanHeaders: selectedStream.needsCleanHeaders
    });

    const totalDuration = logger.timing('Total request duration', requestStart);

    // Note: Subtitle processing moved to OpenSubtitles API integration

    // Send final completion with stream data
    sendProgress('complete', 100, 'Stream ready!', {
      result: {
        success: true, 
        streamUrl: selectedStream.url,
        type: 'hls',
        server: server,
        totalFound: streamUrls.length,
        m3u8Count: m3u8Streams.length,
        subtitles: {
          found: subtitleUrls.length,
          urls: subtitleUrls.map(sub => ({
            url: sub.url,
            language: sub.language,
            isVTT: sub.isVTT,
            contentLength: sub.contentLength,
            content: sub.content // Include actual VTT content to avoid CORS
          }))
        },
        requestId,
        debug: {
          selectedStream: {
            source: selectedStream.source,
            priority: selectedStream.priority,
            isMaster: selectedStream.isMaster,
            needsCleanHeaders: selectedStream.needsCleanHeaders
          },
          totalDuration,
          server,
          subtitleAutomation: subtitleUrls.length > 0 ? 'enabled' : 'no_subtitles_found'
        }
      }
    });

    // Close the stream
    res.end();

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    logger.error('Streaming extraction failed', error, {
      url: url || 'unknown',
      mediaType: mediaType || 'unknown',
      requestDuration: totalDuration
    });

    sendProgress('error', 0, error.message || 'Unknown error occurred', {
      error: true,
      debug: {
        requestDuration: totalDuration
      }
    });
    
    res.end();
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug('Browser closed successfully');
      } catch (closeError) {
        logger.warn('Error closing browser', { error: closeError.message });
      }
    }
  }
});

// Enhanced page interaction function with progress updates
async function interactWithPageWithProgress(page, logger, sendProgress, subtitleUrls = []) {
  const interactionStart = Date.now();
  
  try {
    // Wait for page to be ready with realistic timing
    sendProgress('extracting', 67, 'Waiting for page to load');
    await page.waitForSelector('body', { timeout: 15000 });
    
    // Simulate human-like page reading time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    sendProgress('extracting', 70, 'Simulating user interactions');
    
    // Simulate mouse movement and scrolling
    await page.evaluate(() => {
      // Generate some mouse events
      const events = ['mousemove', 'mousedown', 'mouseup'];
      events.forEach(eventType => {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight
        });
        document.dispatchEvent(event);
      });
      
      // Simulate scroll
      window.scrollTo(0, Math.random() * 200);
    });
    
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    sendProgress('extracting', 72, 'Looking for video iframes');
    
    // Look for iframes first (common on vidsrc)
    const iframes = await page.$$('iframe');
    if (iframes.length > 0) {
      logger.info('Found iframes, attempting to interact', { count: iframes.length });
      
      for (let i = 0; i < Math.min(iframes.length, 3); i++) {
        try {
          const iframe = iframes[i];
          const src = await iframe.evaluate(el => el.src);
          
          if (src && (src.includes('player') || src.includes('embed') || src.includes('video'))) {
            logger.info('Found video iframe', { src: src.substring(0, 100) });
            
            // Try to access iframe content
            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Look for play buttons in iframe (prioritizing vidsrc.xyz specific)
                const playSelectors = [
                  '#pl_but',                           // Specific vidsrc.xyz play button ID
                  '.fas.fa-play',                     // Specific vidsrc.xyz play button class
                  'button#pl_but',                    // More specific vidsrc button selector
                  '[id="pl_but"]',                    // Alternative ID selector
                  'button.fas.fa-play',               // Alternative class selector
                  'button[class*="play"]',
                  'div[class*="play"]',
                  '[data-testid*="play"]',
                  '.play-button',
                  '.video-play-button',
                  'button[aria-label*="play" i]',
                  'button[title*="play" i]',
                  '.play',
                  '.btn-play',
                  '#play-btn',
                  '.play-icon'
                ];
                
                for (const selector of playSelectors) {
                  try {
                    const playButton = await frame.$(selector);
                    if (playButton) {
                      logger.info('Found play button in iframe', { selector });
                      await playButton.click();
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      break;
                    }
                  } catch (e) {
                    // Continue
                  }
                }
                
                // Try clicking on video elements in iframe
                const videoElements = await frame.$$('video, .video, .player');
                if (videoElements.length > 0) {
                  try {
                    await videoElements[0].click();
                    logger.info('Clicked video element in iframe');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } catch (e) {
                    // Continue
                  }
                }
              }
            } catch (e) {
              logger.debug('Could not access iframe content (CORS)');
            }
            
            // Click on the iframe itself
            try {
              await iframe.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Continue
            }
          }
        } catch (e) {
          logger.debug('Error interacting with iframe', { index: i, error: e.message });
        }
      }
    }
    
    sendProgress('extracting', 75, 'Searching for play buttons');
    
    // Look for and click play buttons in main page (prioritizing vidsrc.xyz specific button)
    const playSelectors = [
      '#pl_but',                                    // Specific vidsrc.xyz play button ID
      '.fas.fa-play',                              // Specific vidsrc.xyz play button class
      'button#pl_but',                             // More specific vidsrc button selector
      '[id="pl_but"]',                             // Alternative ID selector
      'button.fas.fa-play',                        // Alternative class selector
      'button[class*="play"]',
      'div[class*="play"]',
      '[data-testid*="play"]',
      '.play-button',
      '.video-play-button', 
      '[data-testid="play-button"]',
      'button[aria-label*="play" i]',
      'button[title*="play" i]',
      '.play',
      '.btn-play',
      '#play-btn',
      '.play-icon',
      'div[role="button"]',  // Will check text content programmatically if needed
      '[class*="play"][role="button"]',
      '[id*="play"]',
      '.vjs-big-play-button',
      '.plyr__control--overlaid'
    ];

    let playButtonFound = false;
    for (const selector of playSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          logger.info('Found play button', { selector, count: elements.length });
          
          // Special handling for vidsrc.xyz play button
          if (selector === '#pl_but' || selector === '.fas.fa-play') {
            logger.info('Found vidsrc.xyz specific play button', { selector });
            sendProgress('extracting', 77, 'Clicking vidsrc.xyz play button');
            
            // Get button properties for debugging
            const buttonInfo = await elements[0].evaluate(el => ({
              id: el.id,
              className: el.className,
              tagName: el.tagName,
              visible: el.offsetParent !== null,
              disabled: el.disabled,
              innerText: el.innerText
            }));
            
            logger.info('vidsrc.xyz play button properties', buttonInfo);
          }
          
          // Human-like interaction - hover first, then click
          await elements[0].hover();
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
          await elements[0].click();
          playButtonFound = true;
          
          // Extra wait for vidsrc.xyz button to ensure it processes
          if (selector === '#pl_but' || selector === '.fas.fa-play') {
            logger.info('Clicked vidsrc.xyz play button, waiting for stream initialization...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
          }
          break;
        }
      } catch (e) {
        logger.debug('Error with play button selector', { selector, error: e.message });
      }
    }

    // If still no play button found, try text-based detection
    if (!playButtonFound) {
      logger.info('Attempting text-based play button detection');
      sendProgress('extracting', 78, 'Looking for text-based play buttons');
      
      try {
        // Look for buttons or elements with "Play" text
        const playButtons = await page.evaluate(() => {
          const elements = [];
          const allElements = document.querySelectorAll('button, div[role="button"], span, a');
          
          for (const el of allElements) {
            const text = el.innerText?.toLowerCase() || '';
            const title = el.title?.toLowerCase() || '';
            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
            
            if (text.includes('play') || title.includes('play') || ariaLabel.includes('play')) {
              elements.push({
                selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
                text: el.innerText,
                visible: el.offsetParent !== null
              });
            }
          }
          return elements;
        });
        
        if (playButtons.length > 0) {
          logger.info('Found text-based play buttons', { count: playButtons.length, buttons: playButtons });
          
          // Try to click the first visible one
          for (const buttonInfo of playButtons) {
            if (buttonInfo.visible) {
              try {
                const button = await page.evaluateHandle((selector) => {
                  // More robust element finding
                  const elements = document.querySelectorAll('button, div[role="button"], span, a');
                  for (const el of elements) {
                    const text = el.innerText?.toLowerCase() || '';
                    if (text.includes('play')) {
                      return el;
                    }
                  }
                  return null;
                }, buttonInfo.selector);
                
                if (button) {
                  await button.hover();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await button.click();
                  logger.info('Clicked text-based play button', { text: buttonInfo.text });
                  playButtonFound = true;
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  break;
                }
              } catch (e) {
                logger.debug('Error clicking text-based play button', { error: e.message });
              }
            }
          }
        }
      } catch (e) {
        logger.debug('Error in text-based play button detection', { error: e.message });
      }
    }

    if (!playButtonFound) {
      logger.info('No play button found, attempting hover and click interactions');
      sendProgress('extracting', 79, 'Trying alternative interaction methods');
      
      // Try clicking on potential video areas
      const videoSelectors = [
        'video',
        '.video-container',
        '.player',
        '.video-player',
        '#player',
        '.video-wrapper',
        '.player-container',
        '[class*="video"]',
        '[class*="player"]'
      ];

      for (const selector of videoSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            logger.info('Interacting with video container', { selector });
            
            // Simulate human-like interaction
            await element.hover();
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
            
            // Try multiple click types
            try {
              await element.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Try clicking at center
              const box = await element.boundingBox();
              if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            break;
          }
        } catch (e) {
          logger.debug('Error interacting with video selector', { selector, error: e.message });
        }
      }
    }
    
    // Simulate additional user behavior
    await page.evaluate(() => {
      // Trigger some events that might initiate video loading
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('click'));
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Try to trigger any lazy loading
      if (window.IntersectionObserver) {
        const videos = document.querySelectorAll('video, iframe');
        videos.forEach(video => {
          const event = new Event('intersect');
          video.dispatchEvent(event);
        });
      }
    });

    // Additional realistic wait for streams to load
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    
    // Final attempt - trigger more events
    await page.evaluate(() => {
      // Try to simulate user interactions that might trigger video loading
      const allElements = document.querySelectorAll('*');
      let attempts = 0;
      
      for (const element of allElements) {
        if (attempts >= 10) break;
        
        if (element.tagName === 'VIDEO' || 
            element.className.toLowerCase().includes('play') ||
            element.className.toLowerCase().includes('video') ||
            element.id.toLowerCase().includes('play') ||
            element.id.toLowerCase().includes('video')) {
          
          try {
            element.dispatchEvent(new Event('click', { bubbles: true }));
            element.dispatchEvent(new Event('mouseenter', { bubbles: true }));
            attempts++;
          } catch (e) {
            // Continue
          }
        }
      }
    });

    // Subtitle automation no longer needed - localStorage sets English preference automatically
    logger.info('✅ SUBTITLE AUTOMATION: Using localStorage approach - English subtitles should load automatically', {
      subtitleUrlsFound: subtitleUrls ? subtitleUrls.length : 0
    });
    
    if (sendProgress) {
      sendProgress('subtitles', 85, 'English subtitles enabled via localStorage - waiting for VTT files');
    }

    logger.timing('Page interaction completed', interactionStart);
      
  } catch (error) {
    logger.warn('Page interaction error', { error: error.message });
  }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Flyx Extract Stream Service running on http://0.0.0.0:' + PORT);
  console.log('📊 Health check: http://0.0.0.0:' + PORT + '/health');
  console.log('📖 API docs: http://0.0.0.0:' + PORT + '/');
  console.log('🎬 Extract endpoint: http://0.0.0.0:' + PORT + '/extract');
});

module.exports = app; 