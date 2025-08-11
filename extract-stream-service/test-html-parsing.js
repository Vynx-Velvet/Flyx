const axios = require('axios');

// Test the HTML parsing VM server
async function testHtmlParsing() {
    console.log('🧪 Testing HTML Parsing VM Server');
    console.log('=====================================');

    const testCases = [
        {
            name: 'Movie Test - The Matrix',
            data: {
                mediaType: 'movie',
                movieId: '603',
                server: 'vidsrc.xyz'
            }
        },
        {
            name: 'TV Show Test - Breaking Bad S1E1',
            data: {
                mediaType: 'tv',
                movieId: '1396',
                seasonId: '1',
                episodeId: '1',
                server: 'vidsrc.xyz'
            }
        },
        {
            name: 'Direct URL Test',
            data: {
                url: 'https://vidsrc.xyz/embed/movie?tmdb=603'
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n🎬 Testing: ${testCase.name}`);
        console.log('-----------------------------------');

        try {
            const startTime = Date.now();
            
            const response = await axios.post('http://localhost:3001/extract-stream', testCase.data, {
                timeout: 120000, // 2 minute timeout
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                }
            });

            const duration = Date.now() - startTime;
            
            console.log(`✅ Success (${duration}ms)`);
            console.log(`📊 Request ID: ${response.data.requestId}`);
            console.log(`🔧 Method: ${response.data.extractionMethod}`);
            
            if (response.data.data.htmlParsingResult) {
                const result = response.data.data.htmlParsingResult;
                console.log(`🎯 HTML Parsing Success: ${result.success}`);
                
                if (result.urls) {
                    console.log(`🔗 RCP URL: ${result.urls.rcp ? result.urls.rcp.substring(0, 80) + '...' : 'Not found'}`);
                    console.log(`🔗 ProRCP URL: ${result.urls.prorcp ? result.urls.prorcp.substring(0, 80) + '...' : 'Not found'}`);
                    console.log(`🔗 Shadowlands URL: ${result.urls.shadowlands ? result.urls.shadowlands.substring(0, 80) + '...' : 'Not found'}`);
                }
                
                if (result.finalStreamUrl) {
                    console.log(`🎥 Final Stream URL: ${result.finalStreamUrl.substring(0, 80)}...`);
                } else {
                    console.log(`❌ No final stream URL found: ${result.error || 'Unknown error'}`);
                }
            }
            
            console.log(`📺 Iframes found: ${response.data.data.extractedData.iframes.length}`);
            console.log(`🎞️ Videos found: ${response.data.data.extractedData.videos.length}`);
            console.log(`🌐 Network requests: ${response.data.data.networkRequests.length}`);
            
            // Show some iframe sources if found
            if (response.data.data.extractedData.iframes.length > 0) {
                console.log('📋 Iframe sources:');
                response.data.data.extractedData.iframes.slice(0, 3).forEach((iframe, index) => {
                    if (iframe.src) {
                        console.log(`   ${index + 1}. ${iframe.src.substring(0, 80)}...`);
                    }
                });
            }

        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            
            if (error.response) {
                console.log(`📊 Status: ${error.response.status}`);
                console.log(`📝 Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }
    }

    console.log('\n🏁 Testing completed');
}

// Test server health first
async function testHealth() {
    try {
        console.log('🏥 Checking server health...');
        const response = await axios.get('http://localhost:3001/health');
        console.log(`✅ Server is healthy: ${response.data.service} v${response.data.version}`);
        return true;
    } catch (error) {
        console.log(`❌ Server health check failed: ${error.message}`);
        console.log('💡 Make sure to start the server first with: node vm-server-html-parsing.js');
        return false;
    }
}

// Main test function
async function main() {
    console.log('🚀 HTML Parsing VM Server Test Suite');
    console.log('=====================================');
    
    const isHealthy = await testHealth();
    if (!isHealthy) {
        process.exit(1);
    }

    await testHtmlParsing();
}

// Run tests
main().catch(console.error);