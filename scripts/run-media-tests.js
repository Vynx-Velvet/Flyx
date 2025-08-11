#!/usr/bin/env node

/**
 * Media Playback Testing Suite Runner
 * Runs comprehensive tests for the media playback system
 * Requirements: All requirements - testing coverage
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🎬 Running Media Playback Testing Suite...\n');

const testSuites = [
  {
    name: 'VTT Parser Tests',
    path: 'app/utils/__tests__/vttParser.test.js',
    description: 'Tests VTT parsing with various subtitle formats and malformed files'
  },
  {
    name: 'Integration Tests',
    path: 'app/components/UniversalMediaPlayer/__tests__/integration.test.js',
    description: 'Tests end-to-end playback flow from extraction to display'
  },
  {
    name: 'HLS Error Recovery Tests',
    path: 'app/components/UniversalMediaPlayer/hooks/__tests__/hlsErrorRecovery.test.js',
    description: 'Tests HLS error recovery with simulated network failures'
  },
  {
    name: 'Subtitle Synchronization Tests',
    path: 'app/utils/__tests__/subtitleSynchronization.test.js',
    description: 'Tests subtitle synchronization accuracy with timing verification'
  },
  {
    name: 'Performance Tests',
    path: 'app/components/UniversalMediaPlayer/__tests__/performanceTests.test.js',
    description: 'Tests buffer management and quality switching under different network conditions'
  }
];

const runTestSuite = (suite) => {
  console.log(`\n📋 Running ${suite.name}...`);
  console.log(`   ${suite.description}`);
  console.log(`   File: ${suite.path}\n`);

  try {
    const startTime = Date.now();
    
    // Run the specific test file
    execSync(`npm test -- --testPathPattern="${suite.path}" --verbose`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ ${suite.name} completed in ${duration}s\n`);
    return { success: true, duration };
    
  } catch (error) {
    console.log(`\n❌ ${suite.name} failed\n`);
    return { success: false, error: error.message };
  }
};

const runAllTests = () => {
  console.log('Running all test suites...\n');
  
  try {
    execSync('npm test -- --coverage', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  }
};

const runCoverageReport = () => {
  console.log('\n📊 Generating coverage report...\n');
  
  try {
    execSync('npm run test:coverage', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n✅ Coverage report generated!');
    
  } catch (error) {
    console.log('\n❌ Failed to generate coverage report.');
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'vtt':
    runTestSuite(testSuites[0]);
    break;
    
  case 'integration':
    runTestSuite(testSuites[1]);
    break;
    
  case 'hls':
    runTestSuite(testSuites[2]);
    break;
    
  case 'sync':
    runTestSuite(testSuites[3]);
    break;
    
  case 'performance':
    runTestSuite(testSuites[4]);
    break;
    
  case 'coverage':
    runCoverageReport();
    break;
    
  case 'all':
  default:
    console.log('Available test suites:');
    testSuites.forEach((suite, index) => {
      console.log(`  ${index + 1}. ${suite.name}`);
      console.log(`     ${suite.description}`);
    });
    console.log('\nUsage:');
    console.log('  node scripts/run-media-tests.js [command]');
    console.log('\nCommands:');
    console.log('  vtt          - Run VTT parser tests');
    console.log('  integration  - Run integration tests');
    console.log('  hls          - Run HLS error recovery tests');
    console.log('  sync         - Run subtitle synchronization tests');
    console.log('  performance  - Run performance tests');
    console.log('  coverage     - Generate coverage report');
    console.log('  all          - Run all tests (default)');
    
    if (!command || command === 'all') {
      console.log('\n🚀 Running all tests...\n');
      runAllTests();
    }
    break;
}