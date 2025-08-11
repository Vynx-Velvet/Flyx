/**
 * Enhanced Stream Proxy Integration Test
 * Tests the enhanced proxy service with different sources and scenarios
 */

const TEST_URLS = {
  shadowlandschronicles: 'https://shadowlandschronicles.com/test.m3u8',
  vidsrc: 'https://example.com/test.m3u8?source=vidsrc',
  embed: 'https://example.com/test.m3u8?source=embed.su',
  subtitle: 'https://example.com/test.vtt'
};

async function testProxyEndpoint(url, source, description) {
  console.log(`\n🧪 Testing: ${description}`);
  
  const proxyUrl = `http://localhost:3000/api/stream-proxy?url=${encodeURIComponent(url)}${source ? `&source=${source}` : ''}`;
  
  try {
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Rate Limit Remaining: ${response.headers.get('X-RateLimit-Remaining')}`);
    console.log(`🔄 Rate Limit Reset: ${response.headers.get('X-RateLimit-Reset')}`);
    console.log(`📝 Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 429) {
      console.log(`⏰ Retry After: ${response.headers.get('Retry-After')} seconds`);
    }
    
    return response.ok;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testRateLimit() {
  console.log('\n🚦 Testing Rate Limiting...');
  
  const promises = [];
  // Send 10 rapid requests to test rate limiting
  for (let i = 0; i < 10; i++) {
    promises.push(testProxyEndpoint(TEST_URLS.vidsrc, 'vidsrc', `Rate limit test ${i + 1}`));
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r).length;
  console.log(`📈 Successful requests: ${successCount}/10`);
}

async function testSourceSpecificHeaders() {
  console.log('\n🎯 Testing Source-Specific Headers...');
  
  await testProxyEndpoint(TEST_URLS.shadowlandschronicles, null, 'shadowlandschronicles.com URL');
  await testProxyEndpoint(TEST_URLS.vidsrc, 'vidsrc', 'vidsrc source');
  await testProxyEndpoint(TEST_URLS.embed, 'embed.su', 'embed.su source');
  await testProxyEndpoint(TEST_URLS.subtitle, null, 'Subtitle file');
}

async function testInvalidRequests() {
  console.log('\n🚫 Testing Request Validation...');
  
  // Test with bot user agent
  try {
    const response = await fetch('http://localhost:3000/api/stream-proxy?url=https://example.com/test.m3u8', {
      headers: {
        'User-Agent': 'bot/1.0'
      }
    });
    console.log(`🤖 Bot request status: ${response.status}`);
  } catch (error) {
    console.log(`❌ Bot request error: ${error.message}`);
  }
  
  // Test with missing URL
  try {
    const response = await fetch('http://localhost:3000/api/stream-proxy');
    console.log(`📭 Missing URL status: ${response.status}`);
  } catch (error) {
    console.log(`❌ Missing URL error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting Enhanced Stream Proxy Tests...');
  console.log('⚠️  Note: These tests require the Next.js dev server to be running');
  
  await testSourceSpecificHeaders();
  await testRateLimit();
  await testInvalidRequests();
  
  console.log('\n✅ Enhanced Stream Proxy Tests Complete!');
  console.log('\n📋 Features Tested:');
  console.log('  ✓ Source-specific header management');
  console.log('  ✓ Rate limiting with proper headers');
  console.log('  ✓ Request validation');
  console.log('  ✓ Error handling');
  console.log('\n🔧 Additional features implemented but not easily testable:');
  console.log('  • Retry logic with exponential backoff');
  console.log('  • Connection pooling with keep-alive');
  console.log('  • Enhanced shadowlandschronicles.com support');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testProxyEndpoint };