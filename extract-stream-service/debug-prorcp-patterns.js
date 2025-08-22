import fetch from 'node-fetch';

// Create a logger
const logger = {
    info: (message, data) => console.log(`INFO: ${message}`, data || ''),
    error: (message, data) => console.log(`ERROR: ${message}`, data || '')
};

// Copy the extractProRcpUrl function to test locally
function extractProRcpUrl(html, logger) {
    logger.info('Extracting ProRCP URL from CloudNestra HTML...');

    // Look for ProRCP URL patterns
    const patterns = [
        // jQuery iframe creation pattern (specifically looking for the pattern in the task)
        /\$\(\'<iframe>\'[\s\S]*?src:\s*\'(\/prorcp\/[^\']+)\'/g,
        // Standard iframe src pattern
        /src:\s*['"]\/prorcp\/([^'"]+)['"]/g,
        // Base64-like prorcp paths
        /\/prorcp\/[A-Za-z0-9+\/=]+/g,
        // prorcp paths in single quotes
        /'\/prorcp\/([^']+)'/g,
        // prorcp paths in double quotes
        /"\/prorcp\/([^"]+)"/g,
        // iframe with prorcp src
        /iframe[^>]*src\s*=\s*["']([^"']*prorcp[^"']*)["']/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            let url = match[1] || match[0]; // Use captured group if available
            
            // If we have a captured group (match[1]), use that as it's the clean URL
            // Otherwise, we need to clean up the match
            if (!match[1]) {
                // Handle jQuery iframe pattern specifically
                if (pattern.toString().includes("jQuery") || pattern.toString().includes("<iframe>")) {
                    // Extract just the src value from the match
                    const srcMatch = url.match(/src:\s*'([^']+)'/);
                    if (srcMatch && srcMatch[1]) {
                        url = srcMatch[1];
                    }
                } else {
                    // Handle other patterns
                    url = url.replace(/src:\s*['"]|['"]|src=|iframe[^>]*src\s*=\s*["']|["']/gi, '').trim();
                }
            }
            
            // Check if we have a prorcp URL
            if (url.includes('/prorcp/')) {
                // Build full URL if needed
                if (!url.startsWith('http')) {
                    // Check if it's an absolute path or relative
                    if (url.startsWith('/')) {
                        url = `https://cloudnestra.com${url}`;
                    } else {
                        url = `https://cloudnestra.com/${url}`;
                    }
                }
                logger.info('Found ProRCP URL:', url);
                return url;
            }
        }
    }

    logger.error('ProRCP URL not found in CloudNestra HTML');
    return null;
}

async function debugCloudNestraHTML() {
    console.log('🔍 Debugging CloudNestra HTML structure...\n');
    
    // Test with a real CloudNestra URL from the logs
    const testUrl = 'https://cloudnestra.com/rcp/M2QyZmM1ZjkwNmI2MGRiMzg5ODE5Y2Q1YzhkYmQxMTM6VkZoMlJVMVhaRnBWVlRWMWJqUkVkVzFSVTJaMGRUSm9lRlJHUkZCdlYwNU9RM2xpVm5obU5qRm5aV1UwV0d4YVdHY3JaM1Y0TlN0clptY3hlbE5pY1V3eVJIaFhRemRCWkhOSE9VZFdaa2R0YzAwM00yRlRaekZUTkcxWFozVTVXa0pvYlhKVkx6aHRRaXN6Y0cxNFRYRlVRbGQxYkdWblZEWnBSRE5TVFVKV1JGSnFkRlJaUmtGbVRVeEpXRXhxVG5KNldVTndiM0JTVTJWMllpOTFjaTlJWTNOTWVXUlZSemx3UlhSNlZXNXVVVXhhTkZjeGNXMTFiMlprYTNwdlRqZG5UVVExVkVZMVVVZHJiV04wU1cxc1NHZFJVMnhXT0hodk1qWmxkVWgxY1RoVWRuSk9Na2xoZDA0ck1saDZaalYwVGpKYU1sWlhVSEpXUmtVNWJFeFFlRkpPY0hkWU56Rm1ibTVUYVZsRlMzQlBSM1pSTVZWak5qZFJVR1JDT0RGSGQyeHBWRTFKVldkTVdIaDJTVE5oY0VKUFdGcFBiVFpsU3pOdVpHSlpWSEpDTjFaV2JtRkVPSHA1TDA5aVpVeHBhR3M1VTBSNlQwWjRhek5QYnl0R1pITlVWMlpVWm05VVRURk1RbUpuVDBaRlRqRlZWRkpxUVRWTU1rOURhMlZ2WTBVeVRrTjNjazF4U0hSVGIyMUZXREptU1dkaGRHUm9WMHhwZGtwclpHWmtkVkZuV0UxNVlsUXlXbkpLUldGUk9FOU1MMHB5WW1RMUwyWldhV2hxUkZobmFYQllha05QTkRGWWFscElSM294U20wMFlUa3lXazVWU1d3eU5YWTFLMVpLY2podU5ucHhNa0ZRUTFRd2FWQnpUa3RRVDFrcmVWTTFhblFyV1hoeGNtOWlPVE5VWkZkVmRWQjBVRE40UXpsT1dHaEdWWEZ5Wm1kSlprSlZiM3BzT0d4UWRqWkpWRFp6ZVU1bFVYaGhPSGxTZDBKbWMwNVJUamxPT0M5SksyRnZjVFp5ZERSbVMwdEdURmN3TDJWWlpHMTZORU5MWjI1ckx6YzNjVXh1WjNSc1NXTklUelp6ZUhKWFNHUklkek5RYkhOcE4wdzBVMmRYV1ZVNFRqRXJkbVIyWWpsbFVuQlRWVTlWWkZCcVlqVXpNa3hIWVZkUlEzVmxlbUpDWjBac1JEbGtTbEI1Yld0UVZWTTBWRWRoZVRCblR5dHFURWRqWTB4WFoyRmtlaXN5VERKWlRGQm1VbGh1TTFrMVNXaE5XSE0wT0UxbldFbFBaemxtVDBJNE5VUnRaM1Z1UzNjeGJHUnZkbEIxZUVwWFdtTk1ZbEptSzFGd1owbHJlWEZ2TDFWRVMxbG9iRW81VjNsV01ubHRSbTlGY1dseWRHeG1UVVozY0N0NGRHWnpNbEk0UkhCa1MwdEVSRE5yYm1obVZVbzVWREU1WXpKaGVXbFpWelZtVkdKR2NtaDRjV1phT0dzM1ptWTBhRGxzTlVKUE5WWkJjRFJZTm5SellsSXpLMVp2S3pjMlNrVmxTRVp0YkVKWllVeFBZaloxVFRCd1RWWnpZM0kzZFV4TWJYaFJNbGw0VlNzelFrZFdibTFPT0cwMEx6QnVaVUZxV25Oa2VHdHNVWGROYkc5VVZHZG1jemhOYlhoT1JYSkpSbTVCYVdwbWFUZ3dSa0ZKZUZkbVdrdFlNRWxKSzNZMFZYTjVaRVYzU21Fd2NYQTNjQzlHY1RkUksycFhNREJ3YmxkWVlVRnlOM1V5YWpGbE1WbHlTVnBMZUU1UFJWWnhOMU1yUTFSSU0xcHpWbmN3UlUxMmJXdDJiQzg1TlZVdmRGWlhNRmg2YjFjNVlqSkxOMVZCWTAxM1JuRlZVMmxvWmpKTlJsTTBaMUZFTHpKVmRHTnlTSFZ6YlhkWWF6ZEVNbVE1ZDFGbVpVaFhXWEJoTmpWRlZXWlhhMDlLTjJWWlFWVTJRbFYxYVZZck5teFVUM1F5Wm5RelNHSnJZV014SzJGMWRERlBXSEJWYnpGMmVURkVWMUV6VkV4dFEwTXljMmRDTVU0eE9XSnpTazE1TVZCamJIQk1TMGx3WkVscWNXWnhZejA9';
    
    console.log('Fetching CloudNestra page...');
    try {
        const response = await fetch(testUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': 'https://vidsrc.xyz/embed/movie/1175942/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });
        
        if (!response.ok) {
            console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            console.log('This might be due to bot protection or expired URLs');
            return;
        }
        
        const html = await response.text();
        console.log(`✅ Successfully fetched HTML (${html.length} bytes)`);
        console.log('\n📄 HTML Sample (first 500 characters):');
        console.log('-'.repeat(60));
        console.log(html.substring(0, 500));
        console.log('-'.repeat(60));
        
        // Test ProRCP extraction
        console.log('\n🔍 Testing ProRCP URL extraction:');
        const prorcpUrl = extractProRcpUrl(html, logger);
        
        if (prorcpUrl) {
            console.log('✅ ProRCP URL extraction succeeded!');
        } else {
            console.log('❌ ProRCP URL extraction failed');
            console.log('\n🔍 Let\'s analyze the HTML for potential patterns:');
            
            // Look for various iframe patterns
            const iframeMatches = html.match(/<iframe[^>]*>/g);
            if (iframeMatches) {
                console.log(`Found ${iframeMatches.length} iframe(s):`);
                iframeMatches.forEach((iframe, i) => {
                    console.log(`  ${i + 1}: ${iframe}`);
                });
            }
            
            // Look for prorcp mentions
            const prorcpMatches = html.match(/prorcp/gi);
            if (prorcpMatches) {
                console.log(`Found ${prorcpMatches.length} mentions of 'prorcp'`);
                
                // Find context around prorcp mentions
                const lines = html.split('\n');
                lines.forEach((line, i) => {
                    if (line.toLowerCase().includes('prorcp')) {
                        console.log(`  Line ${i + 1}: ${line.trim()}`);
                    }
                });
            }
            
            // Look for jQuery patterns
            const jqueryMatches = html.match(/\$\([^)]+\)/g);
            if (jqueryMatches && jqueryMatches.length > 0) {
                console.log(`Found ${jqueryMatches.length} jQuery patterns:`);
                jqueryMatches.slice(0, 5).forEach((match, i) => {
                    console.log(`  ${i + 1}: ${match}`);
                });
            }
        }
        
    } catch (error) {
        console.log(`❌ Fetch failed: ${error.message}`);
        console.log('This might be due to network issues or bot protection');
    }
}

// Run the debug
debugCloudNestraHTML();