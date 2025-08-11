// Pure fetch-based extraction without Puppeteer
async function pureFetchExtraction(vidsrcUrl, logger) {
    const extractionStart = Date.now();
    logger.info('Starting pure fetch-based extraction (no Puppeteer)');

    try {
        // Step 1: Fetch the vidsrc page to get the cloudnestra/rcp URL
        logger.info('Fetching vidsrc page', { url: vidsrcUrl.substring(0, 100) });

        const vidsrcResponse = await fetch(vidsrcUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!vidsrcResponse.ok) {
            throw new Error(`Failed to fetch vidsrc page: ${vidsrcResponse.status}`);
        }

        const vidsrcHtml = await vidsrcResponse.text();
        logger.info('Fetched vidsrc page', { size: vidsrcHtml.length });

        // Extract cloudnestra/rcp URL from the HTML
        const cloudnestraPatterns = [
            /src="(https?:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/g,
            /src="(\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/g,
            /"(https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)"/g,
            /'(https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+)'/g,
            /https:\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+/g,
            /\/\/cloudnestra\.com\/rcp\/[A-Za-z0-9+\/=]+/g
        ];

        let cloudnestraUrl = null;
        for (const pattern of cloudnestraPatterns) {
            const matches = vidsrcHtml.match(pattern);
            if (matches) {
                for (const match of matches) {
                    let url = match.replace(/src="|"|'/g, '').trim();
                    if (url.includes('cloudnestra.com/rcp')) {
                        // Add https: if missing
                        if (url.startsWith('//')) {
                            url = `https:${url}`;
                        } else if (!url.startsWith('http')) {
                            url = `https://${url}`;
                        }
                        cloudnestraUrl = url;
                        break;
                    }
                }
                if (cloudnestraUrl) break;
            }
        }

        if (!cloudnestraUrl) {
            // Log part of the HTML for debugging
            logger.debug('vidsrc HTML content (first 2000 chars)', { html: vidsrcHtml.substring(0, 2000) });
            throw new Error('Could not find cloudnestra/rcp URL in vidsrc page');
        }

        logger.info('Found cloudnestra/rcp URL', { url: cloudnestraUrl.substring(0, 100) });

        // Step 2: Fetch the cloudnestra/rcp page to get the prorcp URL
        logger.info('Fetching cloudnestra/rcp page');

        const rcpResponse = await fetch(cloudnestraUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': vidsrcUrl,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!rcpResponse.ok) {
            throw new Error(`Failed to fetch rcp page: ${rcpResponse.status}`);
        }

        const rcpHtml = await rcpResponse.text();
        logger.info('Fetched rcp page', { size: rcpHtml.length });

        // Extract prorcp URL from the HTML - it's in the JavaScript code
        const prorcpPatterns = [
            /src:\s*['"]\/prorcp\/([A-Za-z0-9+\/=]+)['"]/g,
            /\/prorcp\/[A-Za-z0-9+\/=]+/g,
            /'\/prorcp\/([A-Za-z0-9+\/=]+)'/g,
            /"\/prorcp\/([A-Za-z0-9+\/=]+)"/g
        ];

        let prorcpUrl = null;
        for (const pattern of prorcpPatterns) {
            const matches = rcpHtml.match(pattern);
            if (matches) {
                for (const match of matches) {
                    let url = match.replace(/src:\s*['"]|['"]|src=/g, '').trim();
                    if (url.includes('/prorcp/')) {
                        // Build full URL
                        prorcpUrl = `https://cloudnestra.com${url}`;
                        break;
                    }
                }
                if (prorcpUrl) break;
            }
        }

        if (!prorcpUrl) {
            // Log part of the HTML for debugging
            logger.debug('rcp HTML content (first 2000 chars)', { html: rcpHtml.substring(0, 2000) });
            throw new Error('Could not find prorcp URL in rcp page');
        }

        logger.info('Found prorcp URL', { url: prorcpUrl.substring(0, 100) });

        // Step 3: Fetch the prorcp page to get the master.m3u8
        logger.info('Fetching prorcp page');

        const prorcpResponse = await fetch(prorcpUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': cloudnestraUrl,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!prorcpResponse.ok) {
            throw new Error(`Failed to fetch prorcp page: ${prorcpResponse.status}`);
        }

        const prorcpHtml = await prorcpResponse.text();
        logger.info('Fetched prorcp page', { size: prorcpHtml.length });

        // Extract shadowlands URL first, then m3u8 URL from the HTML
        const shadowlandsPatterns = [
            /https?:\/\/[^"'\s]*shadowlandschronicles\.com[^"'\s]*/g,
            /"(https?:\/\/[^"]*shadowlandschronicles\.com[^"]*)"/g,
            /'(https?:\/\/[^']*shadowlandschronicles\.com[^']*)'/g,
            /src="([^"]*shadowlandschronicles\.com[^"]*)"/g
        ];

        let shadowlandsUrl = null;
        for (const pattern of shadowlandsPatterns) {
            const matches = prorcpHtml.match(pattern);
            if (matches) {
                for (const match of matches) {
                    let url = match.replace(/['"]/g, '').replace(/src=/g, '').trim();
                    if (url.includes('shadowlandschronicles.com')) {
                        if (url.startsWith('//')) {
                            url = `https:${url}`;
                        }
                        shadowlandsUrl = url;
                        break;
                    }
                }
                if (shadowlandsUrl) break;
            }
        }

        let finalStreamUrl = null;

        if (shadowlandsUrl) {
            logger.info('Found shadowlands URL, fetching for m3u8', { url: shadowlandsUrl.substring(0, 100) });

            // Fetch the shadowlands page to get the m3u8
            try {
                const shadowlandsResponse = await fetch(shadowlandsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                        'Referer': prorcpUrl,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    }
                });

                if (shadowlandsResponse.ok) {
                    const shadowlandsHtml = await shadowlandsResponse.text();
                    logger.info('Fetched shadowlands page', { size: shadowlandsHtml.length });

                    // Look for m3u8 in shadowlands response
                    const m3u8Patterns = [
                        /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
                        /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
                        /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
                        /file:\s*["']([^"']*\.m3u8[^"']*)/g,
                        /source:\s*["']([^"']*\.m3u8[^"']*)/g
                    ];

                    for (const pattern of m3u8Patterns) {
                        const matches = shadowlandsHtml.match(pattern);
                        if (matches) {
                            for (const match of matches) {
                                let url = match.replace(/['"]/g, '').replace(/file:|source:/g, '').trim();
                                if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
                                    if (url.startsWith('//')) {
                                        url = `https:${url}`;
                                    }
                                    finalStreamUrl = url;
                                    break;
                                }
                            }
                            if (finalStreamUrl) break;
                        }
                    }
                }
            } catch (e) {
                logger.warn('Failed to fetch shadowlands URL', { error: e.message });
            }
        }

        // If no shadowlands URL or m3u8 found, look directly in prorcp HTML
        if (!finalStreamUrl) {
            const m3u8Patterns = [
                /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
                /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
                /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
                /src="([^"]*\.m3u8[^"]*)"/g,
                /file:\s*["']([^"']*\.m3u8[^"']*)/g,
                /source:\s*["']([^"']*\.m3u8[^"']*)/g,
                /url:\s*["']([^"']*\.m3u8[^"']*)/g
            ];

            for (const pattern of m3u8Patterns) {
                const matches = prorcpHtml.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        let url = match.replace(/['"]/g, '').replace(/src=|file:|source:|url:/g, '').trim();
                        if (url.includes('.m3u8') && (url.startsWith('http') || url.startsWith('//'))) {
                            if (url.startsWith('//')) {
                                url = `https:${url}`;
                            }
                            finalStreamUrl = url;
                            break;
                        }
                    }
                    if (finalStreamUrl) break;
                }
            }
        }

        let m3u8Url = finalStreamUrl;

        if (!m3u8Url) {
            // Log the HTML for debugging
            logger.debug('prorcp HTML content (first 2000 chars)', { html: prorcpHtml.substring(0, 2000) });
            throw new Error('Could not find m3u8 URL in prorcp page');
        }

        logger.info('Found m3u8 URL', { url: m3u8Url });

        // Step 4: Verify the m3u8 URL is accessible
        try {
            const m3u8Response = await fetch(m3u8Url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Referer': prorcpUrl
                }
            });

            logger.info('m3u8 URL verification', { status: m3u8Response.status, accessible: m3u8Response.ok });
        } catch (e) {
            logger.warn('Could not verify m3u8 URL accessibility', { error: e.message });
        }

        const extractionTime = Date.now() - extractionStart;
        logger.info('Pure fetch extraction completed', { duration: extractionTime });

        return {
            success: true,
            streamUrl: m3u8Url,
            streamType: 'hls',
            server: 'vidsrc.xyz',
            extractionMethod: 'pure_fetch',
            requiresProxy: true,
            debug: {
                cloudnestraUrl: cloudnestraUrl.substring(0, 100),
                prorcpUrl: prorcpUrl.substring(0, 100),
                m3u8Url: m3u8Url.substring(0, 100),
                extractionTime
            }
        };

    } catch (error) {
        const extractionTime = Date.now() - extractionStart;
        logger.error('Pure fetch extraction failed', error);
        return {
            success: false,
            error: error.message,
            extractionMethod: 'pure_fetch',
            debug: {
                extractionTime
            }
        };
    }
}

// Test the pure fetch extraction
async function testPureFetchExtraction() {
    console.log('🚀 Testing pure fetch extraction (no Puppeteer)...');

    const logger = {
        info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
        warn: (msg, data) => console.warn(`WARN: ${msg}`, data || ''),
        error: (msg, error) => console.error(`ERROR: ${msg}`, error?.message || error),
        debug: (msg, data) => console.log(`DEBUG: ${msg}`, data || '')
    };

    const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550'; // Fight Club
    const result = await pureFetchExtraction(testUrl, logger);

    console.log('\n🎯 RESULT:');
    console.log(JSON.stringify(result, null, 2));
}

// Export for use in other files
module.exports = { pureFetchExtraction };

// Run test if called directly
if (require.main === module) {
    testPureFetchExtraction();
}