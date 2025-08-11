#!/usr/bin/env node

/**
 * Test script for Enhanced VM Server
 * Shows how to properly use the new extraction endpoints
 */

const axios = require('axios');

const VM_SERVER_URL = 'http://localhost:3001';

// Test data for Fight Club (TMDB ID: 550)
const testRequests = {
  // Test 1: Movie extraction using TMDB ID
  movieByTmdb: {
    mediaType: 'movie',
    movieId: '550',
    server: 'vidsrc.xyz'
  },

  // Test 2: TV show extraction
  tvByTmdb: {
    mediaType: 'tv',
    movieId: '1399', // Game of Thrones
    seasonId: '1',
    episodeId: '1',
    server: 'vidsrc.xyz'
  },

  // Test 3: Direct URL extraction
  directUrl: {
    url: 'https://vidsrc.xyz/embed/movie?tmdb=550'
  }
};

async function testExtraction(endpoint, data, testName) {
  console.log(`\n🧪 Testing ${testName}...`);
  console.log(`📡 Endpoint: ${endpoint}`);
  console.log(`📋 Data:`, JSON.stringify(data, null, 2));

  const startTime = Date.now(); // Move startTime outside try block

  try {
    const response = await axios.post(`${VM_SERVER_URL}${endpoint}`, data, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const duration = Date.now() - startTime;
    
    console.log(`✅ Success! (${duration}ms)`);
    console.log(`📊 Results:`, {
      success: response.data.success,
      requestId: response.data.requestId,
      extractionMethod: response.data.extractionMethod,
      iframeCount: response.data.data?.extractedData?.iframes?.length || 0,
      videoCount: response.data.data?.extractedData?.videos?.length || 0,
      networkRequests: response.data.data?.networkRequests?.length || 0,
      extractionTime: response.data.metadata?.extractionTime
    });

    // Show first few iframes found
    if (response.data.data?.extractedData?.iframes?.length > 0) {
      console.log(`🎬 Found iframes:`);
      response.data.data.extractedData.iframes.slice(0, 3).forEach((iframe, i) => {
        console.log(`  ${i + 1}. ${iframe.src?.substring(0, 80)}...`);
      });
    }

    return response.data;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Failed! (${duration}ms)`);
    
    if (error.response) {
      console.log(`📛 HTTP ${error.response.status}: ${error.response.statusText}`);
      console.log(`📄 Error:`, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`📛 Connection refused - Is the VM server running on port 3001?`);
      console.log(`💡 Start it with: cd extract-stream-service && node vm-server-enhanced.js`);
    } else {
      console.log(`📛 Error:`, error.message);
    }
    
    return null;
  }
}

async function checkServerHealth() {
  console.log(`🏥 Checking server health...`);
  
  try {
    const response = await axios.get(`${VM_SERVER_URL}/health`, { timeout: 5000 });
    console.log(`✅ Server is healthy:`, response.data);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`❌ Server is not running on port 3001`);
      console.log(`💡 Start it with: cd extract-stream-service && node vm-server-enhanced.js`);
    } else {
      console.log(`❌ Health check failed:`, error.message);
    }
    return false;
  }
}

async function showServerStatus() {
  console.log(`📊 Getting server status...`);
  
  try {
    const response = await axios.get(`${VM_SERVER_URL}/status`, { timeout: 5000 });
    console.log(`📋 Server capabilities:`, response.data.capabilities);
    console.log(`🎯 Available endpoints:`, response.data.endpoints);
    return true;
  } catch (error) {
    console.log(`❌ Status check failed:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🚀 Enhanced VM Server Test Suite`);
  console.log(`===============================`);

  // Check if server is running
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.log(`\n💡 To start the enhanced VM server:`);
    console.log(`   cd extract-stream-service`);
    console.log(`   node vm-server-enhanced.js`);
    return;
  }

  // Show server capabilities
  await showServerStatus();

  // Test enhanced extraction endpoint
  console.log(`\n🎯 Testing Enhanced Extraction Endpoint`);
  console.log(`========================================`);
  
  await testExtraction('/extract-stream', testRequests.movieByTmdb, 'Movie by TMDB ID (Fight Club)');
  await testExtraction('/extract-stream', testRequests.directUrl, 'Direct URL extraction');

  // Test fast extraction endpoint
  console.log(`\n⚡ Testing Fast Extraction Endpoint`);
  console.log(`===================================`);
  
  await testExtraction('/extract-fast', testRequests.movieByTmdb, 'Fast movie extraction');
  await testExtraction('/extract-fast', testRequests.tvByTmdb, 'Fast TV extraction');

  console.log(`\n✨ Test suite completed!`);
  console.log(`\n💡 Usage Examples:`);
  console.log(`   curl -X POST http://localhost:3001/extract-stream \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"mediaType":"movie","movieId":"550"}'`);
  console.log(`\n   curl -X POST http://localhost:3001/extract-fast \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"url":"https://vidsrc.xyz/embed/movie?tmdb=550"}'`);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Enhanced VM Server Test Tool`);
  console.log(`Usage: node test-enhanced-vm.js [options]`);
  console.log(`Options:`);
  console.log(`  --help, -h     Show this help message`);
  console.log(`  --health       Check server health only`);
  console.log(`  --status       Show server status only`);
  console.log(`  --movie <id>   Test specific movie TMDB ID`);
  console.log(`  --tv <id> <s> <e>  Test specific TV show`);
  process.exit(0);
}

if (args.includes('--health')) {
  checkServerHealth().then(() => process.exit(0));
} else if (args.includes('--status')) {
  showServerStatus().then(() => process.exit(0));
} else if (args.includes('--movie')) {
  const movieId = args[args.indexOf('--movie') + 1];
  if (!movieId) {
    console.log('❌ Please provide a movie TMDB ID');
    process.exit(1);
  }
  testExtraction('/extract-stream', { mediaType: 'movie', movieId }, `Movie ${movieId}`)
    .then(() => process.exit(0));
} else if (args.includes('--tv')) {
  const tvIndex = args.indexOf('--tv');
  const movieId = args[tvIndex + 1];
  const seasonId = args[tvIndex + 2];
  const episodeId = args[tvIndex + 3];
  
  if (!movieId || !seasonId || !episodeId) {
    console.log('❌ Please provide TV show TMDB ID, season, and episode');
    console.log('   Example: node test-enhanced-vm.js --tv 1399 1 1');
    process.exit(1);
  }
  
  testExtraction('/extract-stream', { 
    mediaType: 'tv', 
    movieId, 
    seasonId, 
    episodeId 
  }, `TV ${movieId} S${seasonId}E${episodeId}`)
    .then(() => process.exit(0));
} else {
  runTests().then(() => process.exit(0));
}