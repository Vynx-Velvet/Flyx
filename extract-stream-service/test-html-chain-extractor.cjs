/**
 * Test script for HTML Chain Extractor
 * Tests CloudNestra URL extraction from captured HTML and full chain extraction
 */

const fs = require('fs').promises;
const path = require('path');
const HtmlChainExtractor = require('./html-chain-extractor.cjs');

async function testCloudNestraExtraction() {
    console.log('=== Testing CloudNestra URL Extraction ===');
    
    try {
        // Read the captured HTML file
        const htmlPath = path.join(__dirname, 'html-captures', 'html-capture-2025-08-20T22-41-44-410Z.html');
        const html = await fs.readFile(htmlPath, 'utf8');
        
        console.log('Loaded HTML file, length:', html.length);
        
        // Create extractor instance
        const extractor = new HtmlChainExtractor();
        
        // Test CloudNestra URL extraction
        const cloudNestraUrl = extractor.extractCloudNestraUrl(html);
        
        if (cloudNestraUrl) {
            console.log('✅ CloudNestra URL extracted successfully:');
            console.log(cloudNestraUrl);
            
            // Parse the URL to understand its structure
            const url = new URL(cloudNestraUrl);
            console.log('\nURL Components:');
            console.log('- Protocol:', url.protocol);
            console.log('- Host:', url.host);
            console.log('- Pathname:', url.pathname);
            console.log('- Parameter length:', url.pathname.split('/').pop().length);
            
            return cloudNestraUrl;
        } else {
            console.log('❌ Failed to extract CloudNestra URL');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return null;
    }
}

async function testFullChainExtraction() {
    console.log('\n=== Testing Full Chain Extraction ===');
    
    const extractor = new HtmlChainExtractor({
        headless: false, // Set to true in production
        captureHtml: true,
        timeout: 45000
    });
    
    try {
        // Test with a real VidSrc URL - you can modify this URL
        const testUrl = 'https://vidsrc.xyz/embed/movie/1396484'; // The Bad Guys 2 (2025)
        
        console.log('Testing with URL:', testUrl);
        
        const result = await extractor.extractStream(testUrl);
        
        console.log('\n=== Final Result ===');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ Full chain extraction successful!');
            console.log('Stream URL:', result.streamUrl);
            
            // Display the complete chain
            console.log('\n📊 URL Chain:');
            console.log('1. VidSrc:', result.chain.vidsrc);
            console.log('2. CloudNestra:', result.chain.cloudnestra);
            console.log('3. ProRCP:', result.chain.prorcp);
            console.log('4. Shadowlands/Stream:', result.chain.shadowlands);
            
        } else {
            console.log('❌ Full chain extraction failed:', result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Full chain test failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        await extractor.close();
    }
}

async function testWithAlternativeUrls() {
    console.log('\n=== Testing with Alternative URLs ===');
    
    const testUrls = [
        'https://vidsrc.xyz/embed/movie/1396484', // The Bad Guys 2
        'https://vidsrc.xyz/embed/movie/558449',  // Gladiator 2
        'https://vidsrc.xyz/embed/tv/1399/1/1'    // Game of Thrones S1E1
    ];
    
    const extractor = new HtmlChainExtractor({
        headless: true, // Run in headless mode for multiple tests
        captureHtml: true,
        timeout: 30000
    });
    
    const results = [];
    
    for (const url of testUrls) {
        console.log(`\nTesting URL: ${url}`);
        
        try {
            const result = await extractor.extractStream(url);
            results.push({
                url,
                success: result.success,
                streamUrl: result.success ? result.streamUrl : null,
                error: result.error || null
            });
            
            if (result.success) {
                console.log('✅ Success - Stream URL:', result.streamUrl);
            } else {
                console.log('❌ Failed:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Test error:', error.message);
            results.push({
                url,
                success: false,
                error: error.message
            });
        }
        
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await extractor.close();
    
    console.log('\n=== Alternative URLs Test Summary ===');
    results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.url}`);
        console.log(`   ${result.success ? '✅ Success' : '❌ Failed'}: ${result.success ? result.streamUrl : result.error}`);
    });
    
    return results;
}

async function runAllTests() {
    console.log('🚀 Starting HTML Chain Extractor Tests\n');
    
    // Test 1: CloudNestra URL extraction from captured HTML
    await testCloudNestraExtraction();
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Full chain extraction with single URL
    await testFullChainExtraction();
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Multiple URLs (optional - comment out if not needed)
    // await testWithAlternativeUrls();
    
    console.log('\n🏁 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testCloudNestraExtraction,
    testFullChainExtraction,
    testWithAlternativeUrls,
    runAllTests
};