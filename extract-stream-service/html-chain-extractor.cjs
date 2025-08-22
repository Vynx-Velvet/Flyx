/**
 * VidSrc HTML Chain Extractor
 * Extracts stream URLs by parsing HTML from the chain: VidSrc → CloudNestra → ProRCP → Shadowlands
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class HtmlChainExtractor {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            captureHtml: true,
            ...options
        };
        this.browser = null;
    }

    /**
     * Initialize the browser instance
     */
    async initialize() {
        if (this.browser) return;

        this.browser = await puppeteer.launch({
            headless: this.options.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--user-agent=' + this.options.userAgent
            ]
        });

        console.log('Browser initialized');
    }

    /**
     * Extract cloudnestra RCP URL from VidSrc embed HTML
     */
    extractCloudNestraUrl(html) {
        console.log('Extracting CloudNestra URL from VidSrc HTML...');

        // Look for iframe with cloudnestra.com src
        const iframeRegex = /<iframe[^>]*src\s*=\s*["']([^"']*cloudnestra\.com[^"']*)["'][^>]*>/i;
        const match = html.match(iframeRegex);

        if (match) {
            let url = match[1];
            // Add protocol if missing
            if (url.startsWith('//')) {
                url = 'https:' + url;
            }
            console.log('Found CloudNestra URL:', url);
            return url;
        }

        console.error('CloudNestra URL not found in VidSrc HTML');
        return null;
    }

    /**
     * Extract ProRCP URL from CloudNestra HTML
     */
    extractProRcpUrl(html) {
        console.log('Extracting ProRCP URL from CloudNestra HTML...');

        // Look for URLs containing "prorcp" in various formats
        const patterns = [
            /https?:\/\/[^"'\s]*prorcp[^"'\s]*/gi,
            /"(https?:\/\/[^"]*prorcp[^"]*)"/gi,
            /'(https?:\/\/[^']*prorcp[^']*)'/gi,
            /src\s*=\s*["']([^"']*prorcp[^"']*)["']/gi,
            /href\s*=\s*["']([^"']*prorcp[^"']*)["']/gi
        ];

        for (const pattern of patterns) {
            const matches = [...html.matchAll(pattern)];
            for (const match of matches) {
                const url = match[1] || match[0];
                if (url && url.includes('prorcp')) {
                    console.log('Found ProRCP URL:', url);
                    return url;
                }
            }
        }

        console.error('ProRCP URL not found in CloudNestra HTML');
        return null;
    }

    /**
     * Extract Shadowlands URL from ProRCP HTML
     */
    extractShadowlandsUrl(html) {
        console.log('Extracting Shadowlands URL from ProRCP HTML...');

        // Look for URLs containing "shadowlands" in various formats
        const patterns = [
            /https?:\/\/[^"'\s]*shadowlands[^"'\s]*/gi,
            /"(https?:\/\/[^"]*shadowlands[^"]*)"/gi,
            /'(https?:\/\/[^']*shadowlands[^']*)'/gi,
            /src\s*=\s*["']([^"']*shadowlands[^"']*)["']/gi,
            /href\s*=\s*["']([^"']*shadowlands[^"']*)["']/gi,
            // Also look for .m3u8 URLs that might be the final stream
            /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
            /"(https?:\/\/[^"]*\.m3u8[^"]*)"/gi,
            /'(https?:\/\/[^']*\.m3u8[^']*)'/gi
        ];

        for (const pattern of patterns) {
            const matches = [...html.matchAll(pattern)];
            for (const match of matches) {
                const url = match[1] || match[0];
                if (url && (url.includes('shadowlands') || url.includes('.m3u8'))) {
                    console.log('Found Shadowlands/Stream URL:', url);
                    return url;
                }
            }
        }

        console.error('Shadowlands URL not found in ProRCP HTML');
        return null;
    }

    /**
     * Load a URL and get its HTML content
     */
    async loadUrlAndGetHtml(url, step = '') {
        console.log(`Loading ${step} URL:`, url);

        const page = await this.browser.newPage();
        
        try {
            // Set user agent and viewport
            await page.setUserAgent(this.options.userAgent);
            await page.setViewport(this.options.viewport);

            // Set headers to mimic real browser
            await page.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive'
            });

            // Navigate to URL
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: this.options.timeout
            });

            // Wait for page to be fully loaded
            await page.waitForTimeout(2000);

            // Get HTML content
            const html = await page.content();
            console.log(`${step} HTML length:`, html.length);

            // Optionally save HTML for debugging
            if (this.options.captureHtml && step) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `${step.toLowerCase()}-capture-${timestamp}.html`;
                const filePath = path.join(__dirname, 'html-captures', filename);
                
                try {
                    await fs.mkdir(path.dirname(filePath), { recursive: true });
                    await fs.writeFile(filePath, html);
                    console.log(`Saved ${step} HTML to:`, filePath);
                } catch (error) {
                    console.error(`Failed to save ${step} HTML:`, error.message);
                }
            }

            return html;

        } catch (error) {
            console.error(`Error loading ${step} URL:`, error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * Extract stream URL from VidSrc URL using HTML chain parsing
     */
    async extractStream(vidsrcUrl) {
        console.log('\n=== Starting HTML Chain Extraction ===');
        console.log('VidSrc URL:', vidsrcUrl);

        try {
            await this.initialize();

            // Step 1: Load VidSrc embed page and extract CloudNestra URL
            const vidsrcHtml = await this.loadUrlAndGetHtml(vidsrcUrl, 'VidSrc');
            const cloudNestraUrl = this.extractCloudNestraUrl(vidsrcHtml);
            
            if (!cloudNestraUrl) {
                throw new Error('Failed to extract CloudNestra URL from VidSrc HTML');
            }

            // Step 2: Load CloudNestra page and extract ProRCP URL
            const cloudNestraHtml = await this.loadUrlAndGetHtml(cloudNestraUrl, 'CloudNestra');
            const proRcpUrl = this.extractProRcpUrl(cloudNestraHtml);
            
            if (!proRcpUrl) {
                throw new Error('Failed to extract ProRCP URL from CloudNestra HTML');
            }

            // Step 3: Load ProRCP page and extract Shadowlands/Stream URL
            const proRcpHtml = await this.loadUrlAndGetHtml(proRcpUrl, 'ProRCP');
            const shadowlandsUrl = this.extractShadowlandsUrl(proRcpHtml);
            
            if (!shadowlandsUrl) {
                throw new Error('Failed to extract Shadowlands URL from ProRCP HTML');
            }

            console.log('\n=== Extraction Complete ===');
            console.log('Final Stream URL:', shadowlandsUrl);

            return {
                success: true,
                streamUrl: shadowlandsUrl,
                chain: {
                    vidsrc: vidsrcUrl,
                    cloudnestra: cloudNestraUrl,
                    prorcp: proRcpUrl,
                    shadowlands: shadowlandsUrl
                }
            };

        } catch (error) {
            console.error('HTML Chain extraction failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Close the browser instance
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('Browser closed');
        }
    }
}

module.exports = HtmlChainExtractor;

// Test function
async function testExtraction() {
    const extractor = new HtmlChainExtractor({
        headless: false, // Set to true for production
        captureHtml: true
    });

    try {
        // Test URL - you'll need to provide a real VidSrc embed URL
        const testUrl = 'https://vidsrc.xyz/embed/movie/1396484'; // Example URL
        
        const result = await extractor.extractStream(testUrl);
        console.log('\nFinal Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await extractor.close();
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testExtraction();
}