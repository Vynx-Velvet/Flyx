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
        },
        {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            platform: 'MacIntel',
            vendor: 'Google Inc.',
            language: 'en-US',
            languages: ['en-US', 'en'],
            hardwareConcurrency: 8,
            deviceMemory: 8,
            maxTouchPoints: 0,
            colorDepth: 24,
            pixelDepth: 24,
            screenWidth: 1440,
            screenHeight: 900,
            availWidth: 1440,
            availHeight: 875,
            timezone: 'America/New_York'
        },
        {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
            platform: 'Win32',
            vendor: '',
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
            timezone: 'America/Chicago'
        },
        {
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            platform: 'Linux x86_64',
            vendor: 'Google Inc.',
            language: 'en-US',
            languages: ['en-US', 'en'],
            hardwareConcurrency: 4,
            deviceMemory: 4,
            maxTouchPoints: 0,
            colorDepth: 24,
            pixelDepth: 24,
            screenWidth: 1366,
            screenHeight: 768,
            availWidth: 1366,
            availHeight: 728,
            timezone: 'America/New_York'
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
                'language': fingerprint.language,

                // Browsing history simulation
                'last_visit': new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                'visit_count': Math.floor(Math.random() * 50 + 5).toString(),
                'session_start': new Date().toISOString(),

                // Site-specific preferences for cloudnestra and vidsrc
                'cloudnestra_preferences': JSON.stringify({
                    server_preference: 'auto',
                    quality_preference: 'high',
                    buffer_size: 'medium'
                }),
                'vidsrc_settings': JSON.stringify({
                    default_server: 'primary',
                    fallback_enabled: true,
                    debug_mode: false
                }),

                // Additional realistic browser data
                'cookie_consent': 'accepted',
                'privacy_settings': JSON.stringify({
                    analytics: true,
                    functional: true,
                    advertising: false
                }),
                'user_preferences': JSON.stringify({
                    theme: Math.random() > 0.5 ? 'dark' : 'light',
                    notifications: Math.random() > 0.7,
                    auto_continue: Math.random() > 0.4
                })
            };

            // Apply all localStorage settings
            Object.entries(localStorageSettings).forEach(([key, value]) => {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    // Ignore quota exceeded errors
                }
            });

            // Set up sessionStorage as well
            const sessionStorageSettings = {
                'session_id': 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                'page_load_time': Date.now().toString(),
                'referrer': document.referrer || 'direct',
                'user_agent': navigator.userAgent
            };

            Object.entries(sessionStorageSettings).forEach(([key, value]) => {
                try {
                    sessionStorage.setItem(key, value);
                } catch (e) {
                    // Ignore quota exceeded errors
                }
            });

        }, fingerprint);

        logger.info('Enhanced localStorage setup completed', {
            fingerprintTimezone: fingerprint.timezone,
            screenResolution: `${fingerprint.screenWidth}x${fingerprint.screenHeight}`,
            platform: fingerprint.platform
        });

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
        const movements = 5 + Math.floor(Math.random() * 8); // 5-12 movements

        for (let i = 0; i < movements; i++) {
            const x = Math.random() * viewport.width;
            const y = Math.random() * viewport.height;

            // Move mouse with realistic speed variation
            await page.mouse.move(x, y, { steps: 3 + Math.floor(Math.random() * 5) });
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
        }

        // Simulate scrolling behavior
        const scrolls = 2 + Math.floor(Math.random() * 4); // 2-5 scrolls
        for (let i = 0; i < scrolls; i++) {
            const scrollY = Math.random() * 500 - 250; // Random scroll up/down
            await page.evaluate((scrollY) => {
                window.scrollBy(0, scrollY);
            }, scrollY);
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        }

        // Simulate keyboard activity (tab navigation)
        const tabPresses = 1 + Math.floor(Math.random() * 3); // 1-3 tab presses
        for (let i = 0; i < tabPresses; i++) {
            await page.keyboard.press('Tab');
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
        }

        // Simulate focus events
        await page.evaluate(() => {
            window.dispatchEvent(new Event('focus'));
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('resize'));
        });

        logger.info('Advanced human behavior simulation completed', {
            mouseMovements: movements,
            scrolls,
            tabPresses
        });

    } catch (error) {
        logger.warn('Advanced behavior simulation error', { error: error.message });
    }
}

// Enhanced request throttling and pattern randomization
class RequestThrottler {
    constructor() {
        this.requestTimes = [];
        this.minDelay = 100; // Minimum delay between requests
        this.maxDelay = 2000; // Maximum delay between requests
        this.burstLimit = 5; // Maximum requests in burst
        this.burstWindow = 10000; // 10 second window
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

            // Override window.parent access detection
            try {
                Object.defineProperty(window, 'parent', {
                    get: function () {
                        return window;
                    },
                    configurable: true
                });
            } catch (e) {
                // Ignore if already defined
            }

            // Override window.top access detection
            try {
                Object.defineProperty(window, 'top', {
                    get: function () {
                        return window;
                    },
                    configurable: true
                });
            } catch (e) {
                // Ignore if already defined
            }

            // Override frame access detection
            try {
                Object.defineProperty(window, 'frameElement', {
                    get: function () {
                        return null;
                    },
                    configurable: true
                });
            } catch (e) {
                // Ignore if already defined
            }

            // Override document.domain to prevent cross-origin restrictions
            try {
                Object.defineProperty(document, 'domain', {
                    get: function () {
                        return location.hostname;
                    },
                    set: function (value) {
                        // Allow domain setting
                        return value;
                    },
                    configurable: true
                });
            } catch (e) {
                // Ignore if already defined
            }
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
            executablePath = undefined; // Let Puppeteer find it
        } else {
            logger.info('Found Chrome at:', { path: executablePath });
        }
    } else {
        // Linux/Unix paths
        executablePath = '/usr/bin/google-chrome-stable';
    }

    return {
        executablePath,
        headless: true,
        args: [
            // Core sandbox and security
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',

            // Enhanced anti-detection with fingerprint matching
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--disable-features=TranslateUI',
            '--disable-features=ScriptStreaming',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
            '--disable-component-extensions-with-background-pages',

            // Browser behavior normalization
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-extensions-file-access-check',
            '--disable-extensions-http-throttling',
            '--disable-extensions-https-throttling',
            '--disable-component-update',
            '--disable-sync',
            '--disable-translate',

            // Performance and stealth
            '--disable-prompt-on-repost',
            '--disable-hang-monitor',
            '--disable-client-side-phishing-detection',
            '--disable-popup-blocking',
            '--disable-print-preview',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--password-store=basic',
            '--use-mock-keychain',
            '--hide-scrollbars',
            '--mute-audio',
            '--disable-gpu',

            // Additional stealth measures
            '--disable-plugins-discovery',
            '--disable-preconnect',
            '--disable-background-networking',
            '--disable-background-sync',
            '--disable-permissions-api',
            '--disable-presentation-api',

            // Fingerprint matching
            `--user-agent=${fingerprint.userAgent}`,
            `--window-size=${fingerprint.screenWidth},${fingerprint.screenHeight}`,
            `--lang=${fingerprint.language}`,

            // Memory and performance
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
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
        fingerprint: fingerprint // Store for later use
    };
}

// Realistic play button interaction simulation with enhanced stealth
async function simulatePlayButtonInteraction(page, logger) {
    const interactionStart = Date.now();

    try {
        logger.info('Starting realistic play button interaction simulation');

        // Apply request throttling
        await globalThrottler.throttleRequest(logger);

        // Perform advanced human behavior simulation first
        await simulateAdvancedHumanBehavior(page, logger);

        // Enhanced play button selectors with priority for cloudnestra.com specific elements
        const playSelectors = [
            '#pl_but',                                    // Primary cloudnestra.com play button
            '.fas.fa-play',                              // FontAwesome play icon
            'button#pl_but',                             // More specific button selector
            '[id="pl_but"]',                             // Alternative ID selector
            'button.fas.fa-play',                        // Button with FontAwesome class
            'div#pl_but',                                // Div with play button ID
            '[class*="pl_but"]',                         // Any element with pl_but in class
            'button[class*="play"]',                     // Generic play button classes
            '.play-button',
            '.video-play-button',
            '[data-testid*="play"]',
            'button[aria-label*="play" i]',
            'button[title*="play" i]'
        ];

        let playButtonFound = false;

        for (const selector of playSelectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    logger.info('Found play button elements', { selector, count: elements.length });

                    for (const element of elements) {
                        try {
                            // Check if element is visible and interactable
                            const isVisible = await element.evaluate(el => {
                                const rect = el.getBoundingClientRect();
                                return rect.width > 0 && rect.height > 0 &&
                                    window.getComputedStyle(el).visibility !== 'hidden' &&
                                    window.getComputedStyle(el).display !== 'none';
                            });

                            if (isVisible) {
                                logger.info('Interacting with visible play button', { selector });

                                // Simulate realistic human behavior
                                // 1. Move mouse to element area (hover)
                                await element.hover();
                                await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

                                // 2. Brief pause (human reading/decision time)
                                await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

                                // 3. Click with slight randomization
                                await element.click();
                                playButtonFound = true;

                                // 4. Wait for response (longer for #pl_but as it triggers iframe chain)
                                if (selector === '#pl_but' || selector.includes('pl_but')) {
                                    logger.info('Clicked cloudnestra.com #pl_but, waiting for iframe chain...');
                                    await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 2000));
                                } else {
                                    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
                                }

                                break;
                            }
                        } catch (e) {
                            logger.debug('Error interacting with play button element', { error: e.message });
                        }
                    }

                    if (playButtonFound) break;
                }
            } catch (e) {
                logger.debug('Error with play button selector', { selector, error: e.message });
            }
        }

        // If no standard play button found, try iframe-specific interaction
        if (!playButtonFound) {
            logger.info('No standard play button found, checking iframes');

            const iframes = await page.$$('iframe');
            for (const iframe of iframes) {
                try {
                    const src = await iframe.evaluate(el => el.src);
                    if (src && (src.includes('cloudnestra') || src.includes('rcp') || src.includes('prorcp'))) {
                        logger.info('Found cloudnestra iframe, attempting interaction', { src: src.substring(0, 100) });

                        try {
                            const frame = await iframe.contentFrame();
                            if (frame) {
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                // Look for play button in iframe
                                for (const selector of playSelectors) {
                                    try {
                                        const playButton = await frame.$(selector);
                                        if (playButton) {
                                            logger.info('Found play button in iframe', { selector });
                                            await playButton.hover();
                                            await new Promise(resolve => setTimeout(resolve, 300));
                                            await playButton.click();
                                            playButtonFound = true;
                                            await new Promise(resolve => setTimeout(resolve, 3000));
                                            break;
                                        }
                                    } catch (e) {
                                        // Continue to next selector
                                    }
                                }

                                if (playButtonFound) break;
                            }
                        } catch (e) {
                            logger.debug('Could not access iframe content (CORS)');
                        }
                    }
                } catch (e) {
                    logger.debug('Error checking iframe', { error: e.message });
                }
            }
        }

        logger.timing('Play button interaction completed', interactionStart);
        return { success: playButtonFound, interactionMethod: 'realistic_simulation' };

    } catch (error) {
        logger.error('Play button interaction failed', error);
        return { success: false, error: error.message, interactionMethod: 'realistic_simulation' };
    }
}

// Enhanced iframe chain navigation for vidsrc.xyz → cloudnestra.com/rcp → cloudnestra.com/prorcp flow
async function navigateIframeChain(page, logger) {
    const navigationStart = Date.now();
    const iframeChain = [];

    try {
        logger.info('Starting enhanced iframe chain navigation');

        // Wait for initial page load
        await page.waitForSelector('body', { timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 1: Look for vidsrc.xyz iframe
        const vidsrcIframe = await page.$('iframe[src*="vidsrc"]');
        if (vidsrcIframe) {
            const src = await vidsrcIframe.evaluate(el => el.src);
            iframeChain.push({ step: 1, url: src, description: 'vidsrc.xyz initial iframe' });
            logger.info('Found vidsrc.xyz iframe', { src: src.substring(0, 100) });

            try {
                const vidsrcFrame = await vidsrcIframe.contentFrame();
                if (vidsrcFrame) {
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Step 2: Look for cloudnestra.com/rcp iframe within vidsrc frame
                    const rcpIframe = await vidsrcFrame.$('iframe[src*="cloudnestra.com/rcp"], iframe[src*="/rcp"]');
                    if (rcpIframe) {
                        const rcpSrc = await rcpIframe.evaluate(el => el.src);
                        iframeChain.push({ step: 2, url: rcpSrc, description: 'cloudnestra.com/rcp iframe' });
                        logger.info('Found cloudnestra.com/rcp iframe', { src: rcpSrc.substring(0, 100) });

                        try {
                            const rcpFrame = await rcpIframe.contentFrame();
                            if (rcpFrame) {
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                // Step 3: Look for play button (#pl_but) in rcp frame
                                const playButton = await rcpFrame.$('#pl_but, .fas.fa-play, button[class*="play"]');
                                if (playButton) {
                                    logger.info('Found play button in rcp frame, simulating click');

                                    // Simulate realistic human interaction
                                    await playButton.hover();
                                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
                                    await playButton.click();

                                    // Wait for prorcp iframe to load
                                    await new Promise(resolve => setTimeout(resolve, 4000));

                                    // Step 4: Look for cloudnestra.com/prorcp iframe
                                    const prorcp = await rcpFrame.$('iframe[src*="cloudnestra.com/prorcp"], iframe[src*="/prorcp"]');
                                    if (prorcp) {
                                        const prorcpSrc = await prorcp.evaluate(el => el.src);
                                        iframeChain.push({ step: 4, url: prorcpSrc, description: 'cloudnestra.com/prorcp final iframe' });
                                        logger.info('Found cloudnestra.com/prorcp iframe', { src: prorcpSrc.substring(0, 100) });

                                        try {
                                            const prorcpFrame = await prorcp.contentFrame();
                                            if (prorcpFrame) {
                                                await new Promise(resolve => setTimeout(resolve, 3000));

                                                // Step 5: Look for final video player or shadowlandschronicles iframe
                                                const finalIframe = await prorcpFrame.$('iframe[src*="shadowlandschronicles"], iframe[src*="stream"]');
                                                if (finalIframe) {
                                                    const finalSrc = await finalIframe.evaluate(el => el.src);
                                                    iframeChain.push({ step: 5, url: finalSrc, description: 'shadowlandschronicles.com stream iframe' });
                                                    logger.info('Found shadowlandschronicles stream iframe', { src: finalSrc.substring(0, 100) });
                                                }
                                            }
                                        } catch (e) {
                                            logger.debug('Could not access prorcp iframe content (CORS)', { error: e.message });
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            logger.debug('Could not access rcp iframe content (CORS)', { error: e.message });
                        }
                    }
                }
            } catch (e) {
                logger.debug('Could not access vidsrc iframe content (CORS)', { error: e.message });
            }
        }

        logger.timing('Iframe chain navigation completed', navigationStart);
        return { success: true, iframeChain, extractionMethod: 'iframe_chain' };

    } catch (error) {
        logger.error('Iframe chain navigation failed', error);
        return { success: false, iframeChain, error: error.message, extractionMethod: 'iframe_chain' };
    }
}

// Server hash rotation system for CloudStream Pro, 2Embed, Superembed fallback
async function tryServerHashes(movieId, seasonId, episodeId, mediaType, logger) {
    const servers = [
        { name: 'CloudStream Pro', hash: 'pro' },
        { name: '2Embed', hash: '2embed' },
        { name: 'Superembed', hash: 'super' }
    ];

    const attempts = [];

    for (const server of servers) {
        try {
            logger.info(`Attempting server hash: ${server.name}`, { hash: server.hash });

            let url;
            if (mediaType === 'movie') {
                url = `https://vidsrc.xyz/embed/movie?tmdb=${movieId}&server=${server.hash}`;
            } else {
                url = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}&server=${server.hash}`;
            }

            attempts.push({
                server: server.name,
                hash: server.hash,
                url: url,
                attempted: true
            });

            // Return the URL for this server attempt
            return { url, server: server.name, hash: server.hash, attempts };

        } catch (error) {
            logger.warn(`Server hash ${server.name} failed`, { error: error.message });
            attempts.push({
                server: server.name,
                hash: server.hash,
                error: error.message,
                attempted: true
            });
        }
    }

    return { url: null, server: null, hash: null, attempts };
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
// Enhanced stream extraction endpoint with comprehensive stealth features
app.post('/extract-stream', async (req, res) => {
    const requestId = generateRequestId();
    const logger = createLogger(requestId);
    const extractionStart = Date.now();

    logger.info('Enhanced stream extraction request received', {
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

                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => fingerprint.hardwareConcurrency,
                    configurable: true
                });

                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => fingerprint.deviceMemory,
                    configurable: true
                });

                Object.defineProperty(navigator, 'maxTouchPoints', {
                    get: () => fingerprint.maxTouchPoints,
                    configurable: true
                });

                // Override screen properties
                Object.defineProperty(screen, 'width', {
                    get: () => fingerprint.screenWidth,
                    configurable: true
                });

                Object.defineProperty(screen, 'height', {
                    get: () => fingerprint.screenHeight,
                    configurable: true
                });

                Object.defineProperty(screen, 'availWidth', {
                    get: () => fingerprint.availWidth,
                    configurable: true
                });

                Object.defineProperty(screen, 'availHeight', {
                    get: () => fingerprint.availHeight,
                    configurable: true
                });

                Object.defineProperty(screen, 'colorDepth', {
                    get: () => fingerprint.colorDepth,
                    configurable: true
                });

                Object.defineProperty(screen, 'pixelDepth', {
                    get: () => fingerprint.pixelDepth,
                    configurable: true
                });

                // Override timezone
                try {
                    Intl.DateTimeFormat = class extends Intl.DateTimeFormat {
                        resolvedOptions() {
                            const options = super.resolvedOptions();
                            options.timeZone = fingerprint.timezone;
                            return options;
                        }
                    };
                } catch (e) {
                    // Ignore if already overridden
                }

                // Remove automation indicators
                delete navigator.__proto__.webdriver;
                delete navigator.webdriver;

                // Override permissions API
                const originalQuery = navigator.permissions.query;
                navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );

                // Override plugins to appear more realistic
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {
                            name: 'Chrome PDF Plugin',
                            filename: 'internal-pdf-viewer',
                            description: 'Portable Document Format'
                        },
                        {
                            name: 'Chrome PDF Viewer',
                            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                            description: ''
                        }
                    ],
                    configurable: true
                });

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

            // Simulate realistic play button interaction
            const playButtonResult = await simulatePlayButtonInteraction(page, logger);
            logger.info('Play button interaction result', playButtonResult);

            // Navigate iframe chain for comprehensive extraction
            const iframeResult = await navigateIframeChain(page, logger);
            logger.info('Iframe chain navigation result', {
                success: iframeResult.success,
                chainLength: iframeResult.iframeChain?.length || 0
            });

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
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Extract iframe sources and video elements
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

            logger.timing('Enhanced extraction completed', extractionStart);

            // Compile comprehensive results
            const results = {
                success: true,
                requestId,
                extractionMethod: 'enhanced_stealth',
                data: {
                    originalUrl: url,
                    extractedData,
                    networkRequests,
                    iframeChain: iframeResult.iframeChain || [],
                    playButtonInteraction: playButtonResult,
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

            logger.info('Enhanced extraction successful', {
                iframeCount: extractedData.iframes.length,
                videoCount: extractedData.videos.length,
                networkRequestCount: networkRequests.length,
                extractionTime: results.metadata.extractionTime
            });

            res.json(results);

        } finally {
            await browser.close();
        }

    } catch (error) {
        logger.error('Enhanced extraction failed', error, {
            extractionTime: Date.now() - extractionStart
        });

        res.status(500).json({
            success: false,
            error: error.message,
            requestId,
            extractionMethod: 'enhanced_stealth',
            metadata: {
                extractionTime: Date.now() - extractionStart,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Enhanced fast extraction endpoint with server hash rotation
app.post('/extract-fast', async (req, res) => {
    const requestId = generateRequestId();
    const logger = createLogger(requestId);
    const extractionStart = Date.now();

    logger.info('Enhanced fast extraction request received', {
        requestId,
        userAgent: req.headers['user-agent']
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

        // Try server hash rotation for vidsrc.xyz URLs
        let serverAttempts = [];
        let finalUrl = url;

        if (url.includes('vidsrc.xyz') && mediaType && movieId) {
            const hashResult = await tryServerHashes(movieId, seasonId, episodeId, mediaType, logger);
            if (hashResult.url) {
                finalUrl = hashResult.url;
                serverAttempts = hashResult.attempts;
                logger.info('Using server hash URL', {
                    server: hashResult.server,
                    hash: hashResult.hash,
                    url: finalUrl.substring(0, 100)
                });
            }
        }

        // Get enhanced browser configuration
        const browserConfig = await getBrowserConfig(logger);
        const browser = await puppeteer.launch(browserConfig);

        try {
            const page = await browser.newPage();
            const fingerprint = browserConfig.fingerprint;

            // Set viewport and enhanced stealth setup
            await page.setViewport({
                width: fingerprint.screenWidth,
                height: fingerprint.screenHeight,
                hasTouch: fingerprint.maxTouchPoints > 0
            });

            await setupEnhancedLocalStorage(page, logger, fingerprint);
            await bypassSandboxDetection(page, logger);

            // Apply request throttling for fast extraction
            await globalThrottler.throttleRequest(logger);

            logger.info('Fast navigation with enhanced stealth', {
                url: finalUrl.substring(0, 100)
            });

            // Navigate with shorter timeout for fast extraction
            await page.goto(finalUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            // Quick Cloudflare check
            const cloudflareResult = await detectAndHandleCloudflareChallenge(page, logger);
            if (cloudflareResult.challengeDetected && !cloudflareResult.resolved) {
                throw new Error(`Cloudflare challenge not resolved: ${cloudflareResult.error}`);
            }

            // Fast play button interaction (reduced timing)
            const playButtonResult = await simulatePlayButtonInteraction(page, logger);

            // Quick iframe extraction
            const extractedData = await page.evaluate(() => {
                const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => ({
                    src: iframe.src,
                    id: iframe.id,
                    className: iframe.className
                }));

                const videos = Array.from(document.querySelectorAll('video')).map(video => ({
                    src: video.src,
                    currentSrc: video.currentSrc
                }));

                return { iframes, videos };
            });

            logger.timing('Enhanced fast extraction completed', extractionStart);

            const results = {
                success: true,
                requestId,
                extractionMethod: 'enhanced_fast',
                data: {
                    originalUrl: url,
                    finalUrl: finalUrl,
                    extractedData,
                    serverAttempts,
                    playButtonInteraction: playButtonResult,
                    cloudflareHandling: cloudflareResult
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

            logger.info('Enhanced fast extraction successful', {
                iframeCount: extractedData.iframes.length,
                videoCount: extractedData.videos.length,
                extractionTime: results.metadata.extractionTime
            });

            res.json(results);

        } finally {
            await browser.close();
        }

    } catch (error) {
        logger.error('Enhanced fast extraction failed', error, {
            extractionTime: Date.now() - extractionStart
        });

        res.status(500).json({
            success: false,
            error: error.message,
            requestId,
            extractionMethod: 'enhanced_fast',
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
        service: 'enhanced-vm-server',
        timestamp: new Date().toISOString(),
        version: '2.0.0-enhanced'
    });
});

// Server status endpoint with enhanced capabilities info
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        service: 'enhanced-vm-server',
        version: '2.0.0-enhanced',
        capabilities: {
            advancedUserAgentRotation: true,
            behavioralSimulation: true,
            sandboxDetectionBypass: true,
            enhancedLocalStorage: true,
            requestThrottling: true,
            cloudflareHandling: true,
            serverHashRotation: true,
            iframeChainNavigation: true
        },
        endpoints: [
            '/extract-stream - Enhanced stream extraction with comprehensive stealth',
            '/extract-fast - Fast extraction with server hash rotation',
            '/health - Health check',
            '/status - Server status and capabilities'
        ],
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Start the enhanced server
app.listen(PORT, () => {
    console.log(`🚀 Enhanced VM Server running on port ${PORT}`);
    console.log(`📡 Enhanced stealth capabilities active`);
    console.log(`🔒 Advanced anti-detection measures enabled`);
    console.log(`⚡ Server hash rotation and iframe chain navigation ready`);
    console.log(`🎯 Endpoints: /extract-stream, /extract-fast, /health, /status`);
});

module.exports = app;