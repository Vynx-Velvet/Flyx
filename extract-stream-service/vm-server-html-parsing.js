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

// Enhanced logging system for extraction service (CommonJS compatible)
function createLogger(requestId) {
    const logPrefix = `[${requestId}]`;

    return {
        info: (message, data = {}) => {
            console.log(`${logPrefix} INFO: ${message}`, data);
        },
        warn: (message, data = {}) => {
            console.warn(`${logPrefix} WARN: ${message}`, data);
        },
        error: (message, error = null, data = {}) => {
            console.error(`${logPrefix} ERROR: ${message}`, error, data);
        },
        debug: (message, data = {}) => {
            console.debug(`${logPrefix} DEBUG: ${message}`, data);
        },
        timing: (label, startTime) => {
            const duration = Date.now() - startTime;
            console.log(`${logPrefix} TIMING: ${label} - ${duration}ms`);
            return duration;
        }
    };
}

// Generate unique request ID for tracking
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Advanced user agent rotation with realistic browser fingerprints
function getAdvancedUserAgent() {
    const browserFingerprints = [
        {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            platform: 'Win32',
            vendor: 'Google Inc.',
            language: 'en-US',
            languages: ['en-US', 'en'],
            hardwareConcurrency: 8,
            deviceMemory: 8,
            maxTouchPoints: 0,
            colorDepth: 24,
            pixelDepth: 24,
            screenWidth: 1920,
            screenHeight: 1080,
            availWidth: 1920,
            availHeight: 1040,
            timezone: 'America/New_York'
        },
        {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            platform: 'Win32',
            vendor: 'Google Inc.',
            language: 'en-US',
            languages: ['en-US', 'en'],
            hardwareConcurrency: 12,
            deviceMemory: 16,
            maxTouchPoints: 0,
            colorDepth: 24,
            pixelDepth: 24,
            screenWidth: 2560,
            screenHeight: 1440,
            availWidth: 2560,
            availHeight: 1400,
            timezone: 'America/Los_Angeles'
        }
    ];

    return browserFingerprints[Math.floor(Math.random() * browserFingerprints.length)];
}

// Enhanced localStorage manipulation for subtitle preferences and player settings
async function setupEnhancedLocalStorage(page, logger, fingerprint) {
    try {
        logger.info('Setting up enhanced localStorage with realistic user preferences');

        await page.evaluateOnNewDocument((fingerprint) => {
            // Enhanced localStorage settings with realistic user preferences
            const localStorageSettings = {
                // Subtitle preferences (English priority with variations)
                'pljssubtitle': 'English',
                'subtitle_language': 'en',
                'preferred_subtitle_lang': 'eng',
                'subtitle_enabled': 'true',
                'subtitle_size': Math.random() > 0.7 ? 'large' : 'medium',
                'subtitle_color': Math.random() > 0.8 ? 'yellow' : 'white',
                'subtitle_background': Math.random() > 0.6 ? 'true' : 'false',

                // Realistic player preferences with variations
                'player_volume': (0.6 + Math.random() * 0.4).toFixed(1),
                'player_quality': Math.random() > 0.7 ? 'auto' : (Math.random() > 0.5 ? '720p' : '1080p'),
                'player_theme': Math.random() > 0.5 ? 'dark' : 'light',
                'player_autoplay': Math.random() > 0.3 ? 'true' : 'false',
                'player_muted': Math.random() > 0.8 ? 'true' : 'false',
                'player_speed': Math.random() > 0.9 ? '1.25' : '1.0',

                // Browser fingerprint data for consistency
                'timezone': fingerprint.timezone,
                'screen_resolution': `${fingerprint.screenWidth}x${fingerprint.screenHeight}`,
                'hardware_concurrency': fingerprint.hardwareConcurrency.toString(),
                'device_memory': fingerprint.deviceMemory.toString(),
                'color_depth': fingerprint.colorDepth.toString(),
                'platform': fingerprint.platform,
                'language': fingerprint.language
            };

            // Apply all localStorage settings
            Object.entries(localStorageSettings).forEach(([key, value]) => {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    // Ignore quota exceeded errors
                }
            });

        }, fingerprint);

        logger.info('Enhanced localStorage setup completed');

    } catch (error) {
        logger.warn('Enhanced localStorage setup failed', { error: error.message });
    }
}

// Advanced behavioral simulation with realistic mouse movements and timing delays
async function simulateAdvancedHumanBehavior(page, logger) {
    try {
        logger.info('Starting advanced human behavior simulation');

        // Simulate realistic mouse movements across the page
        const viewport = await page.viewport();
        const movements = 3 + Math.floor(Math.random() * 5); // 3-7 movements

        for (let i = 0; i < movements; i++) {
            const x = Math.random() * viewport.width;
            const y = Math.random() * viewport.height;

            // Move mouse with realistic speed variation
            await page.mouse.move(x, y, { steps: 2 + Math.floor(Math.random() * 3) });
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        }

        // Simulate scrolling behavior
        const scrolls = 1 + Math.floor(Math.random() * 3); // 1-3 scrolls
        for (let i = 0; i < scrolls; i++) {
            const scrollY = Math.random() * 300 - 150; // Random scroll up/down
            await page.evaluate((scrollY) => {
                window.scrollBy(0, scrollY);
            }, scrollY);
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));
        }

        logger.info('Advanced human behavior simulation completed');

    } catch (error) {
        logger.warn('Advanced behavior simulation error', { error: error.message });
    }
}

// Enhanced request throttling and pattern randomization
class RequestThrottler {
    constructor() {
        this.requestTimes = [];
        this.minDelay = 100;
        this.maxDelay = 1500;
        this.burstLimit = 3;
        this.burstWindow = 8000;
    }

    async throttleRequest(logger) {
        const now = Date.now();

        // Clean old requests outside burst window
        this.requestTimes = this.requestTimes.filter(time => now - time < this.burstWindow);

        // Check if we're hitting burst limit
        if (this.requestTimes.length >= this.burstLimit) {
            const oldestRequest = Math.min(...this.requestTimes);
            const waitTime = this.burstWindow - (now - oldestRequest);

            if (waitTime > 0) {
                logger.info('Request throttling active', { waitTime, requestCount: this.requestTimes.length });
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        // Add randomized delay to avoid pattern detection
        const delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Record this request
        this.requestTimes.push(Date.now());

        logger.debug('Request throttled', { delay: Math.round(delay), activeRequests: this.requestTimes.length });
    }
}

const globalThrottler = new RequestThrottler();

// Sandbox detection bypass with proper iframe access handling
async function bypassSandboxDetection(page, logger) {
    try {
        logger.info('Implementing sandbox detection bypass');

        await page.evaluateOnNewDocument(() => {
            // Override iframe sandbox detection
            const originalCreateElement = document.createElement;
            document.createElement = function (tagName) {
                const element = originalCreateElement.call(this, tagName);

                if (tagName.toLowerCase() === 'iframe') {
                    // Remove sandbox restrictions
                    const originalSetAttribute = element.setAttribute;
                    element.setAttribute = function (name, value) {
                        if (name.toLowerCase() === 'sandbox') {
                            // Allow all iframe capabilities
                            return originalSetAttribute.call(this, name, 'allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock allow-top-navigation');
                        }
                        return originalSetAttribute.call(this, name, value);
                    };
                }

                return element;
            };

            // Remove automation indicators
            delete navigator.__proto__.webdriver;
            delete navigator.webdriver;
        });

        logger.info('Sandbox detection bypass implemented');
        return { success: true };

    } catch (error) {
        logger.warn('Sandbox detection bypass failed', { error: error.message });
        return { success: false, error: error.message };
    }
}

// Enhanced Cloudflare challenge detection and handling
async function detectAndHandleCloudflareChallenge(page, logger) {
    try {
        logger.info('Checking for Cloudflare challenges');

        // Wait for page to load
        await page.waitForSelector('body', { timeout: 10000 });

        // Check for Cloudflare challenge indicators
        const challengeIndicators = await page.evaluate(() => {
            const indicators = {
                hasTurnstile: !!document.querySelector('[data-sitekey]') || !!document.querySelector('.cf-turnstile'),
                hasCloudflareText: document.body.innerText.includes('Cloudflare') || document.body.innerText.includes('Just a moment'),
                hasChallengePage: document.title.includes('Just a moment') || document.title.includes('Cloudflare'),
                hasRayId: !!document.querySelector('[data-ray]') || document.body.innerText.includes('Ray ID'),
                pageSize: document.body.innerText.length
            };
            return indicators;
        });

        if (challengeIndicators.hasTurnstile || challengeIndicators.hasCloudflareText ||
            challengeIndicators.hasChallengePage || (challengeIndicators.pageSize < 3000 && challengeIndicators.hasRayId)) {

            logger.warn('Cloudflare challenge detected', challengeIndicators);

            // Try to wait for challenge to complete automatically
            logger.info('Waiting for Cloudflare challenge to resolve...');

            try {
                // Wait up to 30 seconds for challenge to complete
                await page.waitForFunction(() => {
                    return !document.body.innerText.includes('Just a moment') &&
                        !document.body.innerText.includes('Checking your browser') &&
                        document.body.innerText.length > 3000;
                }, { timeout: 30000 });

                logger.info('Cloudflare challenge appears to have resolved');
                return { challengeDetected: true, resolved: true };

            } catch (timeoutError) {
                logger.error('Cloudflare challenge did not resolve within timeout');
                return { challengeDetected: true, resolved: false, error: 'Challenge timeout' };
            }
        }

        logger.info('No Cloudflare challenge detected');
        return { challengeDetected: false, resolved: true };

    } catch (error) {
        logger.error('Error detecting Cloudflare challenge', error);
        return { challengeDetected: false, resolved: false, error: error.message };
    }
}

// Enhanced stealth browser configuration with advanced fingerprinting
async function getBrowserConfig(logger) {
    logger.debug('Using enhanced stealth browser configuration');

    const fingerprint = getAdvancedUserAgent();

    // Detect Chrome path based on platform
    let executablePath;
    if (process.platform === 'win32') {
        // Windows Chrome paths
        const windowsPaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
            process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
            process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
        ];

        executablePath = windowsPaths.find(path => {
            try {
                return path && fs.existsSync(path);
            } catch (e) {
                return false;
            }
        });

        if (!executablePath) {
            logger.warn('Chrome not found in standard Windows locations, using default');
            executablePath = undefined;
        } else {
            logger.info('Found Chrome at:', { path: executablePath });
        }
    } else {
        executablePath = '/usr/bin/google-chrome-stable';
    }

    return {
        executablePath,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--disable-features=TranslateUI',
            '--disable-features=ScriptStreaming',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-popup-blocking',
            '--disable-gpu',
            `--user-agent=${fingerprint.userAgent}`,
            `--window-size=${fingerprint.screenWidth},${fingerprint.screenHeight}`,
            `--lang=${fingerprint.language}`,
            '--memory-pressure-off',
            '--max_old_space_size=4096'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        ignoreHTTPSErrors: true,
        defaultViewport: {
            width: fingerprint.screenWidth,
            height: fingerprint.screenHeight,
            hasTouch: fingerprint.maxTouchPoints > 0,
            isMobile: false,
            deviceScaleFactor: 1
        },
        fingerprint: fingerprint
    };
}

// HTML parsing approach for cloudnestra RCP URL extraction
async function parseHtmlForCloudnestraUrls(page, logger) {
    const parseStart = Date.now();

    try {
        logger.info('Starting HTML parsing for cloudnestra RCP URLs');

        // Apply request throttling
        await globalThrottler.throttleRequest(logger);

        // Perform advanced human behavior simulation first
        await simulateAdvancedHumanBehavior(page, logger);

        // Parse the current page HTML for cloudnestra RCP URLs
        const rcpUrl = await page.evaluate(() => {
            const html = document.documentElement.outerHTML;
            
            // Look for cloudnestra RCP URLs in various formats
            const rcpPatterns = [
                /https?:\/\/[^"'\s]*cloudnestra[^"'\s]*\/rcp[^"'\s]*/gi,
                /https?:\/\/[^"'\s]*\/rcp[^"'\s]*cloudnestra[^"'\s]*/gi,
                /cloudnestra[^"'\s]*\/rcp[^"'\s]*/gi,
                /\/rcp[^"'\s]*cloudnestra[^"'\s]*/gi,
                /src\s*=\s*["']([^"']*cloudnestra[^"']*\/rcp[^"']*)["']/gi,
                /src\s*=\s*["']([^"']*\/rcp[^"']*cloudnestra[^"']*)["']/gi
            ];

            for (const pattern of rcpPatterns) {
                const matches = html.match(pattern);
                if (matches && matches.length > 0) {
                    // Clean up the URL
                    let url = matches[0];
                    // Remove src=" prefix if present
                    url = url.replace(/^src\s*=\s*["']/, '').replace(/["']$/, '');
                    
                    if (!url.startsWith('http')) {
                        if (url.startsWith('//')) {
                            url = 'https:' + url;
                        } else if (url.startsWith('/')) {
                            url = 'https://cloudnestra.com' + url;
                        } else {
                            url = 'https://' + url;
                        }
                    }
                    return url;
                }
            }

            // Also check iframe sources
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                const src = iframe.src;
                if (src && (src.includes('cloudnestra') && src.includes('rcp'))) {
                    return src;
                }
            }

            return null;
        });

        if (!rcpUrl) {
            logger.warn('No cloudnestra RCP URL found in HTML');
            return { success: false, error: 'No cloudnestra RCP URL found', method: 'html_parsing' };
        }

        logger.info('Found cloudnestra RCP URL', { url: rcpUrl.substring(0, 100) });

        // Open new tab for RCP URL
        const rcpPage = await page.browser().newPage();
        
        try {
            // Apply same stealth settings to new page
            const fingerprint = await page.evaluate(() => ({
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenWidth: screen.width,
                screenHeight: screen.height,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory || 8,
                maxTouchPoints: navigator.maxTouchPoints,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }));

            await rcpPage.setViewport(await page.viewport());
            await setupEnhancedLocalStorage(rcpPage, logger, fingerprint);
            await bypassSandboxDetection(rcpPage, logger);

            logger.info('Navigating to RCP URL in new tab');
            await rcpPage.goto(rcpUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Handle Cloudflare if present
            const cloudflareResult = await detectAndHandleCloudflareChallenge(rcpPage, logger);
            if (cloudflareResult.challengeDetected && !cloudflareResult.resolved) {
                logger.warn('Cloudflare challenge on RCP page');
            }

            // Parse RCP page for prorcp URL
            const prorcpUrl = await rcpPage.evaluate(() => {
                const html = document.documentElement.outerHTML;
                
                // Look for prorcp URLs
                const prorcpPatterns = [
                    /https?:\/\/[^"'\s]*cloudnestra[^"'\s]*\/prorcp[^"'\s]*/gi,
                    /https?:\/\/[^"'\s]*\/prorcp[^"'\s]*cloudnestra[^"'\s]*/gi,
                    /cloudnestra[^"'\s]*\/prorcp[^"'\s]*/gi,
                    /\/prorcp[^"'\s]*cloudnestra[^"'\s]*/gi,
                    /src\s*=\s*["']([^"']*cloudnestra[^"']*\/prorcp[^"']*)["']/gi,
                    /src\s*=\s*["']([^"']*\/prorcp[^"']*cloudnestra[^"']*)["']/gi
                ];

                for (const pattern of prorcpPatterns) {
                    const matches = html.match(pattern);
                    if (matches && matches.length > 0) {
                        let url = matches[0];
                        // Remove src=" prefix if present
                        url = url.replace(/^src\s*=\s*["']/, '').replace(/["']$/, '');
                        
                        if (!url.startsWith('http')) {
                            if (url.startsWith('//')) {
                                url = 'https:' + url;
                            } else if (url.startsWith('/')) {
                                url = 'https://cloudnestra.com' + url;
                            } else {
                                url = 'https://' + url;
                            }
                        }
                        return url;
                    }
                }

                // Check iframe sources
                const iframes = document.querySelectorAll('iframe');
                for (const iframe of iframes) {
                    const src = iframe.src;
                    if (src && (src.includes('cloudnestra') && src.includes('prorcp'))) {
                        return src;
                    }
                }

                return null;
            });

            if (!prorcpUrl) {
                logger.warn('No prorcp URL found in RCP page');
                await rcpPage.close();
                return { success: false, error: 'No prorcp URL found', method: 'html_parsing', rcpUrl };
            }

            logger.info('Found prorcp URL', { url: prorcpUrl.substring(0, 100) });

            // Open new tab for prorcp URL
            const prorcpPage = await page.browser().newPage();
            
            try {
                await prorcpPage.setViewport(await page.viewport());
                await setupEnhancedLocalStorage(prorcpPage, logger, fingerprint);
                await bypassSandboxDetection(prorcpPage, logger);

                logger.info('Navigating to prorcp URL in new tab');
                await prorcpPage.goto(prorcpUrl, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                // Handle Cloudflare if present
                const prorcpCloudflareResult = await detectAndHandleCloudflareChallenge(prorcpPage, logger);
                if (prorcpCloudflareResult.challengeDetected && !prorcpCloudflareResult.resolved) {
                    logger.warn('Cloudflare challenge on prorcp page');
                }

                // Parse prorcp page for shadowlands URL
                const shadowlandsUrl = await prorcpPage.evaluate(() => {
                    const html = document.documentElement.outerHTML;
                    
                    // Look for shadowlands URLs
                    const shadowlandsPatterns = [
                        /https?:\/\/[^"'\s]*shadowlandschronicles[^"'\s]*/gi,
                        /https?:\/\/[^"'\s]*shadowlands[^"'\s]*/gi,
                        /shadowlandschronicles[^"'\s]*/gi,
                        /shadowlands[^"'\s]*stream[^"'\s]*/gi,
                        /src\s*=\s*["']([^"']*shadowlandschronicles[^"']*)["']/gi,
                        /src\s*=\s*["']([^"']*shadowlands[^"']*)["']/gi,
                        /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
                        /https?:\/\/[^"'\s]*stream[^"'\s]*\.m3u8[^"'\s]*/gi
                    ];

                    for (const pattern of shadowlandsPatterns) {
                        const matches = html.match(pattern);
                        if (matches && matches.length > 0) {
                            let url = matches[0];
                            // Remove src=" prefix if present
                            url = url.replace(/^src\s*=\s*["']/, '').replace(/["']$/, '');
                            
                            if (!url.startsWith('http') && !url.endsWith('.m3u8')) {
                                if (url.startsWith('//')) {
                                    url = 'https:' + url;
                                } else if (url.startsWith('/')) {
                                    url = 'https://shadowlandschronicles.com' + url;
                                } else {
                                    url = 'https://' + url;
                                }
                            }
                            return url;
                        }
                    }

                    // Check iframe sources
                    const iframes = document.querySelectorAll('iframe');
                    for (const iframe of iframes) {
                        const src = iframe.src;
                        if (src && (src.includes('shadowlands') || src.includes('stream') || src.includes('.m3u8'))) {
                            return src;
                        }
                    }

                    // Check video sources
                    const videos = document.querySelectorAll('video');
                    for (const video of videos) {
                        if (video.src && (video.src.includes('stream') || video.src.includes('.m3u8'))) {
                            return video.src;
                        }
                    }

                    // Check source elements
                    const sources = document.querySelectorAll('source');
                    for (const source of sources) {
                        if (source.src && (source.src.includes('stream') || source.src.includes('.m3u8'))) {
                            return source.src;
                        }
                    }

                    return null;
                });

                logger.timing('HTML parsing completed', parseStart);

                const result = {
                    success: true,
                    method: 'html_parsing',
                    urls: {
                        rcp: rcpUrl,
                        prorcp: prorcpUrl,
                        shadowlands: shadowlandsUrl
                    },
                    finalStreamUrl: shadowlandsUrl
                };

                if (shadowlandsUrl) {
                    logger.info('Successfully found shadowlands URL', { url: shadowlandsUrl.substring(0, 100) });
                } else {
                    logger.warn('No shadowlands URL found in prorcp page');
                    result.success = false;
                    result.error = 'No shadowlands URL found';
                }

                await prorcpPage.close();
                return result;

            } finally {
                if (!prorcpPage.isClosed()) {
                    await prorcpPage.close();
                }
            }

        } finally {
            if (!rcpPage.isClosed()) {
                await rcpPage.close();
            }
        }

    } catch (error) {
        logger.error('HTML parsing failed', error);
        return { success: false, error: error.message, method: 'html_parsing' };
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
        mediaType
    });

    return {
        isValid: true,
        params: { url: finalUrl, mediaType, movieId, seasonId, episodeId, server }
    };
}

// Enhanced stream extraction endpoint with HTML parsing approach
app.post('/extract-stream', async (req, res) => {
    const requestId = generateRequestId();
    const logger = createLogger(requestId);
    const extractionStart = Date.now();

    logger.info('HTML parsing stream extraction request received', {
        requestId,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        referer: req.headers.referer
    });

    try {
        // Validate request parameters
        const validation = validateParameters(req.body, logger);
        if (!validation.isValid) {
            logger.error('Parameter validation failed', null, { error: validation.error });
            return res.status(400).json({
                success: false,
                error: validation.error,
                requestId
            });
        }

        const { url, mediaType, movieId, seasonId, episodeId, server } = validation.params;

        // Get enhanced browser configuration with fingerprinting
        const browserConfig = await getBrowserConfig(logger);
        const browser = await puppeteer.launch(browserConfig);

        try {
            const page = await browser.newPage();

            // Get fingerprint from browser config
            const fingerprint = browserConfig.fingerprint;

            // Set viewport matching fingerprint
            await page.setViewport({
                width: fingerprint.screenWidth,
                height: fingerprint.screenHeight,
                hasTouch: fingerprint.maxTouchPoints > 0
            });

            // Setup enhanced localStorage with fingerprint
            await setupEnhancedLocalStorage(page, logger, fingerprint);

            // Implement sandbox detection bypass
            await bypassSandboxDetection(page, logger);

            // Enhanced stealth setup
            await page.evaluateOnNewDocument((fingerprint) => {
                // Override navigator properties to match fingerprint
                Object.defineProperty(navigator, 'userAgent', {
                    get: () => fingerprint.userAgent,
                    configurable: true
                });

                Object.defineProperty(navigator, 'platform', {
                    get: () => fingerprint.platform,
                    configurable: true
                });

                Object.defineProperty(navigator, 'vendor', {
                    get: () => fingerprint.vendor,
                    configurable: true
                });

                Object.defineProperty(navigator, 'language', {
                    get: () => fingerprint.language,
                    configurable: true
                });

                Object.defineProperty(navigator, 'languages', {
                    get: () => fingerprint.languages,
                    configurable: true
                });

                // Remove automation indicators
                delete navigator.__proto__.webdriver;
                delete navigator.webdriver;

            }, fingerprint);

            logger.info('Navigating to URL with enhanced stealth', {
                url: url.substring(0, 100),
                fingerprint: {
                    userAgent: fingerprint.userAgent.substring(0, 50),
                    platform: fingerprint.platform,
                    screenSize: `${fingerprint.screenWidth}x${fingerprint.screenHeight}`
                }
            });

            // Navigate to the URL
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Handle Cloudflare challenges
            const cloudflareResult = await detectAndHandleCloudflareChallenge(page, logger);
            if (cloudflareResult.challengeDetected && !cloudflareResult.resolved) {
                throw new Error(`Cloudflare challenge not resolved: ${cloudflareResult.error}`);
            }

            // Use HTML parsing approach instead of play button interaction
            const htmlParsingResult = await parseHtmlForCloudnestraUrls(page, logger);
            logger.info('HTML parsing result', htmlParsingResult);

            // Extract all network requests for stream URLs
            const networkRequests = [];
            page.on('response', response => {
                const url = response.url();
                if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('stream') ||
                    url.includes('video') || url.includes('manifest')) {
                    networkRequests.push({
                        url: url,
                        status: response.status(),
                        headers: response.headers(),
                        type: 'network_capture'
                    });
                }
            });

            // Wait for potential stream loading
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Extract iframe sources and video elements from main page
            const extractedData = await page.evaluate(() => {
                const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => ({
                    src: iframe.src,
                    id: iframe.id,
                    className: iframe.className,
                    sandbox: iframe.sandbox?.toString() || null
                }));

                const videos = Array.from(document.querySelectorAll('video')).map(video => ({
                    src: video.src,
                    currentSrc: video.currentSrc,
                    poster: video.poster,
                    id: video.id,
                    className: video.className
                }));

                const sources = Array.from(document.querySelectorAll('source')).map(source => ({
                    src: source.src,
                    type: source.type
                }));

                return { iframes, videos, sources };
            });

            logger.timing('HTML parsing extraction completed', extractionStart);

            // Compile comprehensive results
            const results = {
                success: htmlParsingResult.success,
                requestId,
                extractionMethod: 'html_parsing',
                data: {
                    originalUrl: url,
                    extractedData,
                    networkRequests,
                    htmlParsingResult,
                    cloudflareHandling: cloudflareResult,
                    fingerprint: {
                        userAgent: fingerprint.userAgent,
                        platform: fingerprint.platform,
                        screenResolution: `${fingerprint.screenWidth}x${fingerprint.screenHeight}`,
                        timezone: fingerprint.timezone
                    }
                },
                metadata: {
                    extractionTime: Date.now() - extractionStart,
                    timestamp: new Date().toISOString(),
                    server: server || 'vidsrc.xyz',
                    mediaType,
                    movieId,
                    seasonId,
                    episodeId
                }
            };

            if (!htmlParsingResult.success) {
                results.error = htmlParsingResult.error;
            }

            logger.info('HTML parsing extraction result', {
                success: htmlParsingResult.success,
                iframeCount: extractedData.iframes.length,
                videoCount: extractedData.videos.length,
                networkRequestCount: networkRequests.length,
                extractionTime: results.metadata.extractionTime,
                finalStreamUrl: htmlParsingResult.finalStreamUrl
            });

            res.json(results);

        } finally {
            await browser.close();
        }

    } catch (error) {
        logger.error('HTML parsing extraction failed', error, {
            extractionTime: Date.now() - extractionStart
        });

        res.status(500).json({
            success: false,
            error: error.message,
            requestId,
            extractionMethod: 'html_parsing',
            metadata: {
                extractionTime: Date.now() - extractionStart,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'html-parsing-vm-server',
        timestamp: new Date().toISOString(),
        version: '1.0.0-html-parsing'
    });
});

// Server status endpoint
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        service: 'html-parsing-vm-server',
        version: '1.0.0-html-parsing',
        capabilities: {
            htmlParsing: true,
            multiTabNavigation: true,
            cloudnestraRcpExtraction: true,
            shadowlandsUrlExtraction: true,
            advancedUserAgentRotation: true,
            behavioralSimulation: true,
            sandboxDetectionBypass: true,
            enhancedLocalStorage: true,
            requestThrottling: true,
            cloudflareHandling: true
        },
        endpoints: [
            '/extract-stream - HTML parsing stream extraction',
            '/health - Health check',
            '/status - Server status and capabilities'
        ],
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Start the HTML parsing server
app.listen(PORT, () => {
    console.log(`🚀 HTML Parsing VM Server running on port ${PORT}`);
    console.log(`📡 HTML parsing capabilities active`);
    console.log(`🔍 Multi-tab navigation for cloudnestra RCP → prorcp → shadowlands`);
    console.log(`🔒 Advanced anti-detection measures enabled`);
    console.log(`🎯 Endpoints: /extract-stream, /health, /status`);
});

module.exports = app;