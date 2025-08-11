/**
 * Simple test runner for Multi-language Subtitle Management System
 * Tests requirements 3.3, 3.5 implementation
 */

import { 
  createMultiLanguageSubtitleManager,
  LANGUAGE_PRIORITY_PRESETS,
  QUALITY_SCORING_PRESETS
} from './multiLanguageSubtitleManager.js';

/**
 * Run comprehensive tests for the multi-language subtitle manager
 */
export async function testMultiLanguageSubtitleManager() {
  console.log('🧪 Starting Multi-Language Subtitle Manager Tests...');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper function to run a test
  const runTest = async (name, testFn) => {
    try {
      console.log(`\n🔍 Running test: ${name}`);
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      results.passed++;
      results.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ FAILED: ${name} - ${error.message}`);
      results.failed++;
      results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  };

  // Test 1: Manager Creation
  await runTest('Manager Creation', async () => {
    const manager = createMultiLanguageSubtitleManager({
      defaultLanguagePriority: ['eng', 'spa', 'fre'],
      maxCachedLanguages: 3
    });

    if (!manager) throw new Error('Manager not created');
    if (manager.languagePriority[0] !== 'eng') throw new Error('Priority not set correctly');
    
    manager.destroy();
  });

  // Test 2: Language Priority System
  await runTest('Language Priority System', async () => {
    const manager = createMultiLanguageSubtitleManager();
    
    // Test setting priority
    const newPriority = ['fre', 'eng', 'spa'];
    manager.setLanguagePriority(newPriority);
    
    if (JSON.stringify(manager.languagePriority) !== JSON.stringify(newPriority)) {
      throw new Error('Priority not set correctly');
    }

    // Test preset priorities
    manager.setLanguagePriority(LANGUAGE_PRIORITY_PRESETS.SPANISH_FIRST);
    if (manager.languagePriority[0] !== 'spa') {
      throw new Error('Preset priority not applied');
    }

    // Test best available language selection
    manager.availableLanguages.set('fre', { qualityScore: 0.9 });
    manager.availableLanguages.set('spa', { qualityScore: 0.7 });
    manager.availableLanguages.set('ger', { qualityScore: 0.95 });

    const bestLang = manager.getBestAvailableLanguage();
    if (bestLang !== 'spa') {
      throw new Error(`Expected 'spa' but got '${bestLang}'`);
    }

    manager.destroy();
  });

  // Test 3: Quality Scoring System
  await runTest('Quality Scoring System', async () => {
    const manager = createMultiLanguageSubtitleManager();

    const subtitle1 = {
      downloadCount: 1000,
      rating: 7,
      fileSize: 50 * 1024,
      uploadDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      fileName: 'movie.srt'
    };

    const subtitle2 = {
      downloadCount: 10000,
      rating: 9,
      fileSize: 50 * 1024,
      uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      fileName: 'movie.1080p.bluray.srt'
    };

    const score1 = manager.calculateQualityScore(subtitle1);
    const score2 = manager.calculateQualityScore(subtitle2);

    if (score1 >= score2) {
      throw new Error(`Expected subtitle2 to have higher score: ${score1} vs ${score2}`);
    }

    if (score1 <= 0 || score1 > 1) {
      throw new Error(`Score1 out of range: ${score1}`);
    }

    if (score2 <= 0 || score2 > 1) {
      throw new Error(`Score2 out of range: ${score2}`);
    }

    // Test best subtitle selection
    const subtitles = [subtitle1, subtitle2];
    const bestSubtitle = manager.selectBestSubtitle(subtitles);

    if (bestSubtitle.downloadCount !== 10000) {
      throw new Error('Wrong subtitle selected as best');
    }

    manager.destroy();
  });

  // Test 4: Caching System
  await runTest('Caching System', async () => {
    const manager = createMultiLanguageSubtitleManager({
      maxCachedLanguages: 2,
      maxCacheSize: 1024, // 1KB for testing
      cacheExpirationTime: 1000 // 1 second
    });

    const cacheKey = 'eng_test_1000';
    const content = 'WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nTest subtitle';
    const subtitle = { fileName: 'test.srt', id: 'test' };

    // Test caching
    manager.cacheSubtitleContent(cacheKey, content, subtitle);

    if (!manager.cachedSubtitles.has(cacheKey)) {
      throw new Error('Content not cached');
    }

    if (manager.metrics.totalCacheSize !== content.length) {
      throw new Error('Cache size not tracked correctly');
    }

    // Test cache expiration
    const entry = manager.cachedSubtitles.get(cacheKey);
    entry.cachedAt = Date.now() - 2000; // 2 seconds ago

    if (!manager.isCacheExpired(entry)) {
      throw new Error('Cache expiration not working');
    }

    // Test cache limits enforcement
    manager.enforceCacheLimits();
    if (manager.cachedSubtitles.has(cacheKey)) {
      throw new Error('Expired cache entry not removed');
    }

    manager.destroy();
  });

  // Test 5: Multi-language Loading
  await runTest('Multi-language Loading', async () => {
    const manager = createMultiLanguageSubtitleManager();

    const subtitleData = {
      eng: [
        { id: '1', downloadCount: 5000, rating: 8, fileName: 'eng.srt' },
        { id: '2', downloadCount: 3000, rating: 7, fileName: 'eng2.srt' }
      ],
      spa: [
        { id: '3', downloadCount: 4000, rating: 8.5, fileName: 'spa.srt' }
      ],
      fre: [
        { id: '4', downloadCount: 2000, rating: 6, fileName: 'fre.srt' }
      ]
    };

    await manager.loadMultipleLanguages(subtitleData, {
      autoSelectBest: false,
      qualityThreshold: 0.3
    });

    if (manager.availableLanguages.size !== 3) {
      throw new Error(`Expected 3 languages, got ${manager.availableLanguages.size}`);
    }

    if (!manager.availableLanguages.has('eng')) {
      throw new Error('English not loaded');
    }

    // Check that best subtitles were selected
    const engData = manager.availableLanguages.get('eng');
    if (engData.bestSubtitle.id !== '1') {
      throw new Error('Wrong best subtitle selected for English');
    }

    manager.destroy();
  });

  // Test 6: Blob URL Management
  await runTest('Blob URL Management', async () => {
    const manager = createMultiLanguageSubtitleManager();

    // Mock URL.revokeObjectURL
    const originalRevoke = global.URL?.revokeObjectURL;
    let revokeCount = 0;
    global.URL = global.URL || {};
    global.URL.revokeObjectURL = () => { revokeCount++; };

    const blobUrls = [
      'blob:http://localhost/test-1',
      'blob:http://localhost/test-2',
      'blob:http://localhost/test-3'
    ];

    blobUrls.forEach(url => {
      manager.blobUrls.add(url);
      manager.metrics.blobUrlsCreated++;
    });

    if (manager.blobUrls.size !== 3) {
      throw new Error('Blob URLs not tracked correctly');
    }

    manager.cleanupAllBlobUrls();

    if (revokeCount !== 3) {
      throw new Error(`Expected 3 revokes, got ${revokeCount}`);
    }

    if (manager.blobUrls.size !== 0) {
      throw new Error('Blob URLs not cleared');
    }

    if (manager.metrics.blobUrlsRevoked !== 3) {
      throw new Error('Revoke count not tracked');
    }

    // Restore original function
    if (originalRevoke) {
      global.URL.revokeObjectURL = originalRevoke;
    }

    manager.destroy();
  });

  // Test 7: Performance Metrics
  await runTest('Performance Metrics', async () => {
    const manager = createMultiLanguageSubtitleManager();

    const stats = manager.getCacheStats();

    const expectedProperties = [
      'cacheHits', 'cacheMisses', 'languageSwitches', 
      'blobUrlsCreated', 'blobUrlsRevoked', 'totalCacheSize',
      'cachedLanguages', 'availableLanguages', 'cacheSize', 'activeBlobUrls'
    ];

    for (const prop of expectedProperties) {
      if (!stats.hasOwnProperty(prop)) {
        throw new Error(`Missing property in stats: ${prop}`);
      }
    }

    if (typeof stats.cacheHits !== 'number') {
      throw new Error('Cache hits should be a number');
    }

    manager.destroy();
  });

  // Test 8: Event Callbacks
  await runTest('Event Callbacks', async () => {
    const manager = createMultiLanguageSubtitleManager();

    let callbackCalled = false;
    let callbackData = null;

    manager.on('languageChange', (data) => {
      callbackCalled = true;
      callbackData = data;
    });

    // Simulate language change
    manager.notifyCallback('onLanguageChange', {
      currentLanguage: 'spa',
      previousLanguage: 'eng',
      reason: 'test'
    });

    if (!callbackCalled) {
      throw new Error('Callback not called');
    }

    if (callbackData.currentLanguage !== 'spa') {
      throw new Error('Callback data incorrect');
    }

    manager.destroy();
  });

  // Test 9: Cleanup and Destruction
  await runTest('Cleanup and Destruction', async () => {
    const manager = createMultiLanguageSubtitleManager();

    // Add some test data
    manager.availableLanguages.set('eng', { test: 'data' });
    manager.cachedSubtitles.set('test', { content: 'test', size: 4 });
    manager.blobUrls.add('blob:test');
    manager.metrics.totalCacheSize = 4;

    if (manager.availableLanguages.size === 0) {
      throw new Error('Test data not added');
    }

    manager.destroy();

    if (manager.availableLanguages.size !== 0) {
      throw new Error('Available languages not cleared');
    }

    if (manager.cachedSubtitles.size !== 0) {
      throw new Error('Cached subtitles not cleared');
    }

    if (manager.blobUrls.size !== 0) {
      throw new Error('Blob URLs not cleared');
    }

    if (manager.activeLanguage !== null) {
      throw new Error('Active language not cleared');
    }

    if (manager.metrics.totalCacheSize !== 0) {
      throw new Error('Cache size not reset');
    }
  });

  // Test 10: Quality Scoring Presets
  await runTest('Quality Scoring Presets', async () => {
    const manager = createMultiLanguageSubtitleManager();

    // Test different presets
    manager.options.qualityWeights = QUALITY_SCORING_PRESETS.DOWNLOAD_FOCUSED;
    
    const subtitle = {
      downloadCount: 10000,
      rating: 5, // Low rating
      fileSize: 50 * 1024
    };

    const score = manager.calculateQualityScore(subtitle);
    
    if (score <= 0.3) {
      throw new Error('Download-focused scoring should give higher score for high downloads');
    }

    // Test balanced preset
    manager.options.qualityWeights = QUALITY_SCORING_PRESETS.BALANCED;
    const balancedScore = manager.calculateQualityScore(subtitle);

    if (typeof balancedScore !== 'number' || balancedScore <= 0 || balancedScore > 1) {
      throw new Error('Balanced scoring produced invalid score');
    }

    manager.destroy();
  });

  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('🧪 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.passed + results.failed}`);
  console.log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => t.status === 'FAILED').forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }

  console.log('\n✅ All core multi-language subtitle management features tested!');
  
  return results;
}

// Export for use in other files
export default testMultiLanguageSubtitleManager;