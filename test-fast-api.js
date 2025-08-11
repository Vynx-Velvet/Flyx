// Test script for the fast extraction API
const { pureFetchExtraction } = require('./extract-stream-service/pure-fetch-extractor.js');

async function testFastAPI() {
  console.log('🧪 Testing Fast Extraction API Logic...');
  
  const logger = {
    info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`WARN: ${msg}`, data || ''),
    error: (msg, error) => console.error(`ERROR: ${msg}`, error?.message || error),
    debug: (msg, data) => console.log(`DEBUG: ${msg}`, data || '')
  };

  // Test with Fight Club
  const testUrl = 'https://vidsrc.xyz/embed/movie?tmdb=550';
  console.log(`\n🎬 Testing with: ${testUrl}`);
  
  const result = await pureFetchExtraction(testUrl, logger);
  
  console.log('\n🎯 API Response:');
  console.log(JSON.stringify({
    success: result.success,
    streamUrl: result.streamUrl ? result.streamUrl.substring(0, 100) + '...' : null,
    streamType: result.streamType,
    server: result.server,
    extractionMethod: result.extractionMethod,
    requiresProxy: result.requiresProxy,
    extractionTime: result.debug?.extractionTime
  }, null, 2));

  if (result.success) {
    console.log('\n✅ Fast extraction API logic works perfectly!');
    console.log(`⚡ Extraction completed in ${result.debug?.extractionTime}ms`);
    console.log(`🎯 Stream URL found: ${result.streamUrl.includes('.m3u8') ? 'HLS' : 'Unknown'} format`);
  } else {
    console.log('\n❌ Fast extraction failed:', result.error);
  }
}

testFastAPI().catch(console.error);