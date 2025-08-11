#!/usr/bin/env node

/**
 * Test script for enhanced VM extraction service
 * Tests the new multi-layered iframe navigation and server hash rotation
 */

const { spawn } = require('child_process');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  serverPort: 3001,
  testCases: [
    {
      name: 'vidsrc.xyz movie with server hash rotation',
      params: {
        mediaType: 'movie',
        movieId: '550', // Fight Club
        server: 'vidsrc.xyz'
      },
      expectedFeatures: ['serverHash', 'iframeChain', 'stealthBypass']
    },
    {
      name: 'vidsrc.xyz TV episode with enhanced navigation',
      params: {
        mediaType: 'tv',
        movieId: '1399', // Game of Thrones
        seasonId: '1',
        episodeId: '1',
        server: 'vidsrc.xyz'
      },
      expectedFeatures: ['serverHash', 'iframeChain', 'enhancedNavigation']
    }
  ]
};

// Helper function to make HTTP requests
function makeRequest(path, params) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `http://localhost:${TEST_CONFIG.serverPort}${path}?${queryString}`;
    
    console.log(`Making request to: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

// Test function
async function runTests() {
  console.log('🚀 Starting Enhanced VM Extraction Service Tests\n');
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test health endpoint
  try {
    const healthCheck = await makeRequest('/health', {});
    if (healthCheck.status === 200) {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return;
  }
  
  // Run test cases
  for (const testCase of TEST_CONFIG.testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    
    try {
      const result = await makeRequest('/extract', testCase.params);
      
      if (result.status === 200 && result.data.success) {
        console.log('✅ Extraction successful');
        
        // Check for enhanced features
        const debug = result.data.debug || {};
        
        // Check server hash rotation
        if (testCase.expectedFeatures.includes('serverHash')) {
          if (result.data.serverHash) {
            console.log(`  ✅ Server hash rotation: ${result.data.serverHash}`);
          } else {
            console.log('  ⚠️  Server hash not found');
          }
        }
        
        // Check iframe chain navigation
        if (testCase.expectedFeatures.includes('iframeChain')) {
          if (debug.iframeChain && debug.iframeChain.length > 0) {
            console.log(`  ✅ Iframe chain navigation: ${debug.iframeChain.length} steps`);
            debug.iframeChain.forEach((step, i) => {
              console.log(`    ${i + 1}. ${step.description}`);
            });
          } else {
            console.log('  ⚠️  Iframe chain navigation not detected');
          }
        }
        
        // Check stealth bypass
        if (testCase.expectedFeatures.includes('stealthBypass')) {
          if (debug.stealthBypass) {
            console.log('  ✅ Stealth bypass enabled');
          } else {
            console.log('  ⚠️  Stealth bypass not confirmed');
          }
        }
        
        // Check enhanced navigation
        if (testCase.expectedFeatures.includes('enhancedNavigation')) {
          if (debug.enhancedNavigation) {
            console.log('  ✅ Enhanced navigation successful');
          } else {
            console.log('  ⚠️  Enhanced navigation not successful');
          }
        }
        
        // Check play button interaction
        if (debug.playButtonInteraction) {
          console.log('  ✅ Play button interaction successful');
        } else {
          console.log('  ⚠️  Play button interaction not successful');
        }
        
        // Show extraction method
        console.log(`  📊 Extraction method: ${result.data.extractionMethod}`);
        console.log(`  🎯 Stream source: ${debug.selectedStream?.source}`);
        console.log(`  🔗 Stream URL: ${result.data.streamUrl?.substring(0, 80)}...`);
        
        if (result.data.requiresProxy) {
          console.log('  🔒 Requires proxy for CORS handling');
        }
        
      } else {
        console.log('❌ Extraction failed');
        console.log(`  Status: ${result.status}`);
        console.log(`  Error: ${result.data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log('❌ Test failed with error:', error.message);
    }
  }
  
  console.log('\n🏁 Tests completed');
}

// Main execution
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, TEST_CONFIG };