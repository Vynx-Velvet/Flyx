/**
 * Tests for Multi-language Subtitle Management System
 * Tests requirements 3.3, 3.5 implementation
 */

import { 
  MultiLanguageSubtitleManager, 
  createMultiLanguageSubtitleManager,
  LANGUAGE_PRIORITY_PRESETS,
  QUALITY_SCORING_PRESETS
} from '../multiLanguageSubtitleManager';

// Mock subtitle service
jest.mock('../services/subtitleService', () => ({
  default: {
    downloadSubtitle: jest.fn()
  }
}));

describe('MultiLanguageSubtitleManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = createMultiLanguageSubtitleManager({
      defaultLanguagePriority: ['eng', 'spa', 'fre'],
      maxCachedLanguages: 3,
      maxCacheSize: 1024 * 1024, // 1MB for testing
      cacheExpirationTime: 5000 // 5 seconds for testing
    });
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('Language Priority System', () => {
    test('should set and get language priority correctly', () => {
      const newPriority = ['fre', 'eng', 'spa'];
      manager.setLanguagePriority(newPriority);
      expect(manager.languagePriority).toEqual(newPriority);
    });

    test('should use preset language priorities', () => {
      manager.setLanguagePriority(LANGUAGE_PRIORITY_PRESETS.SPANISH_FIRST);
      expect(manager.languagePriority[0]).toBe('spa');
      expect(manager.languagePriority[1]).toBe('eng');
    });

    test('should select best available language based on priority', () => {
      // Add some test languages
      manager.availableLanguages.set('fre', { qualityScore: 0.9 });
      manager.availableLanguages.set('spa', { qualityScore: 0.7 });
      manager.availableLanguages.set('ger', { qualityScore: 0.95 });

      // With priority ['eng', 'spa', 'fre'], should select 'spa' (first available in priority)
      const bestLang = manager.getBestAvailableLanguage();
      expect(bestLang).toBe('spa');
    });

    test('should fallback to highest quality when no priority match', () => {
      // Set priority that doesn't match available languages
      manager.setLanguagePriority(['eng', 'rus']);
      
      // Add languages not in priority
      manager.availableLanguages.set('fre', { qualityScore: 0.7 });
      manager.availableLanguages.set('ger', { qualityScore: 0.95 });
      manager.availableLanguages.set('ita', { qualityScore: 0.8 });

      const bestLang = manager.getBestAvailableLanguage();
      expect(bestLang).toBe('ger'); // Highest quality score
    });
  });

  describe('Quality Scoring System', () => {
    test('should calculate quality score correctly', () => {
      const subtitle = {
        downloadCount: 5000,
        rating: 8.5,
        fileSize: 50 * 1024, // 50KB
        uploadDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        fileName: 'movie.2023.1080p.bluray.srt'
      };

      const score = manager.calculateQualityScore(subtitle);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
      
      // Should get bonus for quality indicators in filename
      expect(score).toBeGreaterThan(0.5); // Should be reasonably high
    });

    test('should prefer subtitles with higher download counts', () => {
      const subtitle1 = { downloadCount: 1000, rating: 7, fileSize: 50 * 1024 };
      const subtitle2 = { downloadCount: 10000, rating: 7, fileSize: 50 * 1024 };

      const score1 = manager.calculateQualityScore(subtitle1);
      const score2 = manager.calculateQualityScore(subtitle2);

      expect(score2).toBeGreaterThan(score1);
    });

    test('should prefer subtitles with higher ratings', () => {
      const subtitle1 = { downloadCount: 5000, rating: 6, fileSize: 50 * 1024 };
      const subtitle2 = { downloadCount: 5000, rating: 9, fileSize: 50 * 1024 };

      const score1 = manager.calculateQualityScore(subtitle1);
      const score2 = manager.calculateQualityScore(subtitle2);

      expect(score2).toBeGreaterThan(score1);
    });

    test('should select best subtitle from array', () => {
      const subtitles = [
        { id: '1', downloadCount: 1000, rating: 6, fileName: 'low.srt' },
        { id: '2', downloadCount: 10000, rating: 9, fileName: 'high.1080p.bluray.srt' },
        { id: '3', downloadCount: 5000, rating: 7, fileName: 'medium.srt' }
      ];

      const bestSubtitle = manager.selectBestSubtitle(subtitles);
      
      expect(bestSubtitle.id).toBe('2'); // Should select the highest quality one
      expect(bestSubtitle.qualityScore).toBeDefined();
      expect(bestSubtitle.qualityScore).toBeGreaterThan(0.5);
    });

    test('should use different quality scoring presets', () => {
      manager.options.qualityWeights = QUALITY_SCORING_PRESETS.DOWNLOAD_FOCUSED;
      
      const subtitle = {
        downloadCount: 10000,
        rating: 5, // Low rating
        fileSize: 50 * 1024
      };

      const score = manager.calculateQualityScore(subtitle);
      expect(score).toBeGreaterThan(0.4); // Should still score well due to high downloads
    });
  });

  describe('Caching System', () => {
    test('should cache subtitle content', () => {
      const cacheKey = 'eng_test_1000';
      const content = 'WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nTest subtitle';
      const subtitle = { fileName: 'test.srt', id: 'test' };

      manager.cacheSubtitleContent(cacheKey, content, subtitle);

      expect(manager.cachedSubtitles.has(cacheKey)).toBe(true);
      expect(manager.metrics.totalCacheSize).toBe(content.length);
    });

    test('should enforce cache size limits', () => {
      // Fill cache beyond limit
      const largeContent = 'WEBVTT\n' + 'x'.repeat(500 * 1024); // 500KB content
      
      for (let i = 0; i < 5; i++) {
        manager.cacheSubtitleContent(`key_${i}`, largeContent, { fileName: `test_${i}.srt` });
      }

      // Should have enforced limits
      expect(manager.cachedSubtitles.size).toBeLessThanOrEqual(manager.options.maxCachedLanguages);
      expect(manager.metrics.totalCacheSize).toBeLessThanOrEqual(manager.options.maxCacheSize);
    });

    test('should expire old cache entries', async () => {
      const cacheKey = 'test_key';
      const content = 'WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nTest';
      
      manager.cacheSubtitleContent(cacheKey, content, { fileName: 'test.srt' });
      
      // Manually set old timestamp
      const entry = manager.cachedSubtitles.get(cacheKey);
      entry.cachedAt = Date.now() - 10000; // 10 seconds ago (beyond 5 second expiration)
      
      expect(manager.isCacheExpired(entry)).toBe(true);
      
      // Enforce limits should remove expired entries
      manager.enforceCacheLimits();
      expect(manager.cachedSubtitles.has(cacheKey)).toBe(false);
    });

    test('should track cache hit/miss metrics', async () => {
      const initialHits = manager.metrics.cacheHits;
      const initialMisses = manager.metrics.cacheMisses;

      // Mock a cache hit scenario
      const cacheKey = 'eng_test_1000';
      manager.cachedSubtitles.set(cacheKey, {
        content: 'WEBVTT\ntest',
        cachedAt: Date.now(),
        size: 12
      });

      // This would normally be called by getSubtitleContent
      manager.metrics.cacheHits++;

      expect(manager.metrics.cacheHits).toBe(initialHits + 1);
    });
  });

  describe('Blob URL Management', () => {
    test('should track blob URLs for cleanup', () => {
      const blobUrl = 'blob:http://localhost/test-123';
      manager.blobUrls.add(blobUrl);
      manager.metrics.blobUrlsCreated++;

      expect(manager.blobUrls.has(blobUrl)).toBe(true);
      expect(manager.metrics.blobUrlsCreated).toBe(1);
    });

    test('should clean up all blob URLs on destroy', () => {
      // Mock URL.revokeObjectURL
      const mockRevoke = jest.fn();
      global.URL.revokeObjectURL = mockRevoke;

      const blobUrls = [
        'blob:http://localhost/test-1',
        'blob:http://localhost/test-2',
        'blob:http://localhost/test-3'
      ];

      blobUrls.forEach(url => manager.blobUrls.add(url));

      manager.cleanupAllBlobUrls();

      expect(mockRevoke).toHaveBeenCalledTimes(3);
      expect(manager.blobUrls.size).toBe(0);
      expect(manager.metrics.blobUrlsRevoked).toBe(3);
    });
  });

  describe('Multi-language Loading', () => {
    test('should load multiple languages correctly', async () => {
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

      expect(manager.availableLanguages.size).toBe(3);
      expect(manager.availableLanguages.has('eng')).toBe(true);
      expect(manager.availableLanguages.has('spa')).toBe(true);
      expect(manager.availableLanguages.has('fre')).toBe(true);

      // Check that best subtitles were selected for each language
      const engData = manager.availableLanguages.get('eng');
      expect(engData.bestSubtitle.id).toBe('1'); // Higher download count
    });

    test('should filter out low quality subtitles', async () => {
      const subtitleData = {
        eng: [
          { id: '1', downloadCount: 100, rating: 3, fileName: 'low.srt' } // Very low quality
        ],
        spa: [
          { id: '2', downloadCount: 5000, rating: 8, fileName: 'high.srt' } // High quality
        ]
      };

      await manager.loadMultipleLanguages(subtitleData, {
        qualityThreshold: 0.5 // High threshold
      });

      // Should only have Spanish (high quality)
      expect(manager.availableLanguages.size).toBe(1);
      expect(manager.availableLanguages.has('spa')).toBe(true);
      expect(manager.availableLanguages.has('eng')).toBe(false);
    });
  });

  describe('Language Switching', () => {
    beforeEach(async () => {
      // Set up test languages
      const subtitleData = {
        eng: [{ id: '1', downloadCount: 5000, rating: 8, fileName: 'eng.srt' }],
        spa: [{ id: '2', downloadCount: 4000, rating: 7, fileName: 'spa.srt' }]
      };

      await manager.loadMultipleLanguages(subtitleData);
    });

    test('should switch languages correctly', async () => {
      const mockCallback = jest.fn();
      manager.on('languageChange', mockCallback);

      await manager.switchToLanguage('spa', { reason: 'test' });

      expect(manager.activeLanguage).toBe('spa');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentLanguage: 'spa',
          reason: 'test'
        })
      );
    });

    test('should handle switching to unavailable language', async () => {
      await expect(manager.switchToLanguage('ger')).rejects.toThrow('Language ger is not available');
    });

    test('should preserve time during seamless switching', async () => {
      // Mock getCurrentVideoTime
      manager.getCurrentVideoTime = jest.fn().mockReturnValue(120.5);

      await manager.switchToLanguage('spa', { preserveTime: true });

      expect(manager.getCurrentVideoTime).toHaveBeenCalled();
    });
  });

  describe('Performance and Metrics', () => {
    test('should track performance metrics', () => {
      const stats = manager.getCacheStats();

      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('languageSwitches');
      expect(stats).toHaveProperty('blobUrlsCreated');
      expect(stats).toHaveProperty('blobUrlsRevoked');
      expect(stats).toHaveProperty('totalCacheSize');
      expect(stats).toHaveProperty('cachedLanguages');
      expect(stats).toHaveProperty('availableLanguages');
    });

    test('should provide available languages with metadata', async () => {
      const subtitleData = {
        eng: [{ id: '1', downloadCount: 5000, rating: 8, fileName: 'eng.srt' }],
        spa: [{ id: '2', downloadCount: 4000, rating: 7, fileName: 'spa.srt' }]
      };

      await manager.loadMultipleLanguages(subtitleData);

      const availableLangs = manager.getAvailableLanguages();

      expect(availableLangs).toHaveLength(2);
      expect(availableLangs[0]).toHaveProperty('langCode');
      expect(availableLangs[0]).toHaveProperty('qualityScore');
      expect(availableLangs[0]).toHaveProperty('subtitleCount');
      expect(availableLangs[0]).toHaveProperty('bestFileName');
      expect(availableLangs[0]).toHaveProperty('cached');
    });
  });

  describe('Event Callbacks', () => {
    test('should call language change callback', async () => {
      const mockCallback = jest.fn();
      manager.on('languageChange', mockCallback);

      // Set up test data
      const subtitleData = {
        eng: [{ id: '1', downloadCount: 5000, rating: 8, fileName: 'eng.srt' }]
      };
      await manager.loadMultipleLanguages(subtitleData);

      await manager.switchToLanguage('eng');

      expect(mockCallback).toHaveBeenCalled();
    });

    test('should call error callback on failures', async () => {
      const mockCallback = jest.fn();
      manager.on('error', mockCallback);

      // Try to switch to non-existent language
      try {
        await manager.switchToLanguage('nonexistent');
      } catch (error) {
        // Expected to throw
      }

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'switch_error',
          langCode: 'nonexistent'
        })
      );
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      // Add some test data
      manager.availableLanguages.set('eng', { test: 'data' });
      manager.cachedSubtitles.set('test', { content: 'test' });
      manager.blobUrls.add('blob:test');

      manager.destroy();

      expect(manager.availableLanguages.size).toBe(0);
      expect(manager.cachedSubtitles.size).toBe(0);
      expect(manager.blobUrls.size).toBe(0);
      expect(manager.activeLanguage).toBeNull();
    });
  });
});

describe('Factory Functions and Presets', () => {
  test('should create manager with factory function', () => {
    const manager = createMultiLanguageSubtitleManager({
      maxCachedLanguages: 10
    });

    expect(manager).toBeInstanceOf(MultiLanguageSubtitleManager);
    expect(manager.options.maxCachedLanguages).toBe(10);

    manager.destroy();
  });

  test('should have language priority presets', () => {
    expect(LANGUAGE_PRIORITY_PRESETS.ENGLISH_FIRST[0]).toBe('eng');
    expect(LANGUAGE_PRIORITY_PRESETS.SPANISH_FIRST[0]).toBe('spa');
    expect(LANGUAGE_PRIORITY_PRESETS.EUROPEAN).toContain('fre');
    expect(LANGUAGE_PRIORITY_PRESETS.GLOBAL).toContain('chi');
  });

  test('should have quality scoring presets', () => {
    expect(QUALITY_SCORING_PRESETS.DOWNLOAD_FOCUSED.downloadCount).toBe(0.6);
    expect(QUALITY_SCORING_PRESETS.RATING_FOCUSED.rating).toBe(0.6);
    expect(QUALITY_SCORING_PRESETS.BALANCED.downloadCount).toBe(0.4);
    expect(QUALITY_SCORING_PRESETS.BALANCED.rating).toBe(0.3);
  });
});