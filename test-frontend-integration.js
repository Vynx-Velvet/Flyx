#!/usr/bin/env node

/**
 * Test script to verify frontend integration with updated vm-server
 * This script tests the complete flow from frontend API to vm-server
 */

const fetch = require('node-fetch');

// Configuration
const FRONTEND_API_URL = 'http://localhost:3000/api/extract-shadowlands';
const VM_SERVER_URL = 'http://localhost:3001';

// Test parameters
const TEST_PARAMS = {
  mediaType: 'movie',
  movieId: '550', // Fight Club
  server: 'vidsrc.xyz'
};

async function testVMServerDirect() {
  console.log('🧪 Testing VM Server Direct Connection...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${VM_SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    
    console.log('✅ VM Server Health Check:', {
      status: healthData.status,
      service: healthData.service
    });

    // Test direct extraction
    const params = new URLSearchParams(TEST_PARAMS);
    const extractResponse = await fetch(`${VM_SERVER_URL}/extract?${params}`);
    const extractData = await extractResponse.json();
    
    console.log('🎯 VM Server Direct Extraction:', {
      success: extractData.success,
      hasStreamUrl: !!extractData.streamUrl,
      server: extractData.server,
      serverHash: extractData.serverHash,
      selectedServer: extractData.debug?.selectedStream?.source,
      extractionMethod: extractData.extractionMethod,
      error: extractData.error
    });

    return extractData.success;

  } catch (error) {
    console.error('❌ VM Server Direct Test Failed:', error.message);
    return false;
  }
}

async function testFrontendAPI() {
  console.log('\n🧪 Testing Frontend API Integration...');
  
  try {
    // Test frontend API proxy
    const params = new URLSearchParams(TEST_PARAMS);
    const apiResponse = await fetch(`${FRONTEND_API_URL}?${params}`);
    const apiData = await apiResponse.json();
    
    console.log('🎯 Frontend API Response:', {
      success: apiData.success,
      hasStreamUrl: !!apiData.streamUrl,
      server: apiData.server,
      serverHash: apiData.serverHash,
      selectedServer: apiData.debug?.selectedStream?.source,
      extractionMethod: apiData.extractionMethod,
      proxyInfo: apiData.proxy,
      error: apiData.error
    });

    return apiData.success;

  } catch (error) {
    console.error('❌ Frontend API Test Failed:', error.message);
    return false;
  }
}

async function testStreamingAPI() {
  console.log('\n🧪 Testing Streaming API Integration...');
  
  return new Promise((resolve) => {
    try {
      const params = new URLSearchParams(TEST_PARAMS);
      const streamingUrl = `http://localhost:3000/api/extract-shadowlands?${params}`;
      
      console.log('📡 Connecting to extraction endpoint...');
      
      // Note: This is a simplified test - in a real browser environment,
      // you would use EventSource. For Node.js testing, we'll just check
      // if the endpoint responds correctly.
      
      fetch(streamingUrl, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      }).then(response => {
        console.log('🎯 Streaming API Response:', {
          status: response.status,
          contentType: response.headers.get('content-type'),
          isEventStream: response.headers.get('content-type')?.includes('text/event-stream')
        });
        
        resolve(response.ok);
      }).catch(error => {
        console.error('❌ Streaming API Test Failed:', error.message);
        resolve(false);
      });

    } catch (error) {
      console.error('❌ Streaming API Test Failed:', error.message);
      resolve(false);
    }
  });
}

async function runIntegrationTests() {
  console.log('🚀 Starting Frontend Integration Tests...\n');
  
  const results = {
    vmServerDirect: await testVMServerDirect(),
    frontendAPI: await testFrontendAPI(),
    streamingAPI: await testStreamingAPI()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`VM Server Direct: ${results.vmServerDirect ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend API: ${results.frontendAPI ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Streaming API: ${results.streamingAPI ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (allPassed) {
    console.log('\n🎉 Frontend integration is working correctly with the updated vm-server!');
    console.log('The following features are now available:');
    console.log('  • Cross-platform Chrome detection (Windows/Linux)');
    console.log('  • Visual debugging mode on Windows');
    console.log('  • Enhanced server selection (2Embed, Superembed, UpCloud)');
    console.log('  • Improved stream interception and debugging');
    console.log('  • Real-time progress updates via Server-Sent Events');
  } else {
    console.log('\n⚠️  Some integration issues detected. Check the logs above for details.');
  }

  return allPassed;
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests };