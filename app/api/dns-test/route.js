// DNS and connection test endpoint to debug subtitle proxy issues

import { NextResponse } from 'next/server';
import dns from 'dns';
import https from 'https';

export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: DNS resolution
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4('rest.opensubtitles.org', (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    
    results.tests.dnsResolution = {
      success: true,
      addresses: addresses,
      message: `Successfully resolved to ${addresses.length} address(es)`
    };
  } catch (error) {
    results.tests.dnsResolution = {
      success: false,
      error: error.message,
      code: error.code
    };
  }

  // Test 2: DNS lookup
  try {
    const lookup = await new Promise((resolve, reject) => {
      dns.lookup('rest.opensubtitles.org', (err, address, family) => {
        if (err) reject(err);
        else resolve({ address, family });
      });
    });
    
    results.tests.dnsLookup = {
      success: true,
      address: lookup.address,
      family: lookup.family,
      message: `Successfully looked up: ${lookup.address} (IPv${lookup.family})`
    };
  } catch (error) {
    results.tests.dnsLookup = {
      success: false,
      error: error.message,
      code: error.code
    };
  }

  // Test 3: Simple HTTPS connection
  try {
    const connectionTest = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'rest.opensubtitles.org',
        port: 443,
        path: '/',
        method: 'HEAD',
        timeout: 5000,
        agent: false
      };

      const req = https.request(options, (res) => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: Object.keys(res.headers)
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Connection timeout')));
      req.end();
    });
    
    results.tests.httpsConnection = {
      success: true,
      statusCode: connectionTest.statusCode,
      statusMessage: connectionTest.statusMessage,
      headerCount: connectionTest.headers.length,
      message: `Successfully connected, got HTTP ${connectionTest.statusCode}`
    };
  } catch (error) {
    results.tests.httpsConnection = {
      success: false,
      error: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname
    };
  }

  // Test 4: Fetch API test
  try {
    const fetchTest = await fetch('https://rest.opensubtitles.org/', {
      method: 'HEAD',
      agent: false
    });
    
    results.tests.fetchApi = {
      success: true,
      status: fetchTest.status,
      statusText: fetchTest.statusText,
      message: `Fetch API successful, got ${fetchTest.status} ${fetchTest.statusText}`
    };
  } catch (error) {
    results.tests.fetchApi = {
      success: false,
      error: error.message,
      code: error.code,
      cause: error.cause ? {
        message: error.cause.message,
        code: error.cause.code,
        hostname: error.cause.hostname
      } : null
    };
  }

  // Environment info
  results.environment = {
    HTTP_PROXY: process.env.HTTP_PROXY || 'not set',
    HTTPS_PROXY: process.env.HTTPS_PROXY || 'not set', 
    NO_PROXY: process.env.NO_PROXY || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    platform: process.platform,
    nodeVersion: process.version
  };

  // Summary
  const successCount = Object.values(results.tests).filter(test => test.success).length;
  const totalTests = Object.keys(results.tests).length;
  
  results.summary = {
    passed: successCount,
    total: totalTests,
    success: successCount === totalTests,
    message: `${successCount}/${totalTests} tests passed`
  };

  console.log('🧪 DNS Test Results:', results);

  return NextResponse.json(results);
}

export async function POST(request) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 