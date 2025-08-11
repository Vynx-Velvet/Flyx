/**
 * Multi-language subtitle management system
 * Implements requirements 3.3, 3.5 for multi-language subtitle management
 * 
 * Features:
 * - Language priority system with automatic fallback
 * - Seamless subtitle language switching without playback interruption
 * - Blob URL management with automatic cleanup
 * - Subtitle caching system for improved performance
 * - Subtitle quality scoring and selection based on download count and ratings
 */

import { parseVTTEnhanced } from './enhancedVttParser';
import { createSubtitleSynchronizer } from './subtitleSynchronizer';

/**
 * Multi-language subtitle manager class
 */
export class MultiLanguageSubtitleManager {
  constructor(options = {}) {
    this.options = {
      // Language priority configuration
      defaultLanguagePriority: ['eng', 'spa', 'fre', 'ger', 'ita', 'por', 'rus', 'ara'],
      maxCachedLanguages: 5,
      maxCacheSize: 50 * 1024 * 1024, // 50MB cache limit
      cacheExpirationTime: 30 * 60 * 1000, // 30 minutes
      
      // Quality scoring weights
      qualityWeights: {
        downloadCount: 0.4,
        rating: 0.3,
        fileSize: 0.2,
        uploadDate: 0.1
      },
      
      // Performance settings
      preloadNextLanguage: true,
      enableSeamlessSwitching: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      
      ...options
    };

    // State management
    this.availableLanguages = new Map(); // langCode -> subtitle data
    this.cachedSubtitles = new Map(); // cacheKey -> cached subtitle data
    this.blobUrls = new Set(); // Track all blob URLs for cleanup
    this.activeLanguage = null;
    this.languagePriority = [...this.options.defaultLanguagePriority];
    
    // Synchronizer management
    this.synchronizers = new Map(); // langCode -> synchronizer instance
    this.activeSynchronizer = null;
    
    // Performance tracking
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      languageSwitches: 0,
      blobUrlsCreated: 0,
      blobUrlsRevoked: 0,
      totalCacheSize: 0
    };

    // Event callbacks
    this.callbacks = {
      onLanguageChange: null,
      onSubtitleChange: null,
      onCacheUpdate: null,
      onError: null
    };

    // Start cleanup interval
    this.startCleanupInterval();

    console.log('🌍 MultiLanguageSubtitleManager initialized:', {
      defaultPriority: this.languagePriority,
      maxCachedLanguages: this.options.maxCachedLanguages,
      cacheSize: `${this.options.maxCacheSize / 1024 / 1024}MB`
    });
  }

  /**
   * Set language priority order
   * @param {string[]} languageCodes - Array of language codes in priority order
   */
  setLanguagePriority(languageCodes) {
    console.log('🎯 Setting language priority:', languageCodes);
    this.languagePriority = [...languageCodes];
    
    // Re-evaluate best language if we have subtitles loaded
    if (this.availableLanguages.size > 0) {
      const bestLanguage = this.getBestAvailableLanguage();
      if (bestLanguage && bestLanguage !== this.activeLanguage) {
        console.log('🔄 Priority change suggests new best language:', bestLanguage);
        this.switchToLanguage(bestLanguage, { reason: 'priority_change' });
      }
    }
  }

  /**
   * Load subtitles for multiple languages
   * @param {Object} subtitleData - Object with language codes as keys and subtitle arrays as values
   * @param {Object} options - Loading options
   */
  async loadMultipleLanguages(subtitleData, options = {}) {
    const { 
      autoSelectBest = true,
      preloadAll = false,
      qualityThreshold = 0.5 
    } = options;

    console.log('🌍 Loading multiple language subtitles:', {
      languages: Object.keys(subtitleData),
      autoSelectBest,
      preloadAll
    });

    try {
      // Clear existing data
      this.clearAllLanguages();

      // Process each language
      for (const [langCode, subtitles] of Object.entries(subtitleData)) {
        if (Array.isArray(subtitles) && subtitles.length > 0) {
          // Score and select best subtitle for this language
          const bestSubtitle = this.selectBestSubtitle(subtitles);
          
          if (bestSubtitle.qualityScore >= qualityThreshold) {
            this.availableLanguages.set(langCode, {
              langCode,
              subtitles,
              bestSubtitle,
              qualityScore: bestSubtitle.qualityScore,
              loadedAt: Date.now(),
              processed: false
            });

            console.log(`✅ Added ${langCode} subtitles:`, {
              count: subtitles.length,
              bestQuality: bestSubtitle.qualityScore.toFixed(2),
              bestFile: bestSubtitle.fileName
            });
          } else {
            console.warn(`⚠️ Skipping ${langCode} - quality too low:`, bestSubtitle.qualityScore);
          }
        }
      }

      // Auto-select best language if requested
      if (autoSelectBest && this.availableLanguages.size > 0) {
        const bestLanguage = this.getBestAvailableLanguage();
        if (bestLanguage) {
          await this.switchToLanguage(bestLanguage, { reason: 'auto_select' });
        }
      }

      // Preload all languages if requested
      if (preloadAll) {
        await this.preloadAllLanguages();
      }

      console.log('🌍 Multi-language loading completed:', {
        availableLanguages: Array.from(this.availableLanguages.keys()),
        activeLanguage: this.activeLanguage,
        cacheSize: this.getCacheSize()
      });

      this.notifyCallback('onCacheUpdate', {
        availableLanguages: Array.from(this.availableLanguages.keys()),
        cacheSize: this.getCacheSize()
      });

    } catch (error) {
      console.error('❌ Error loading multiple languages:', error);
      this.notifyCallback('onError', { type: 'load_error', error: error.message });
      throw error;
    }
  }

  /**
   * Switch to a specific language
   * @param {string} langCode - Language code to switch to
   * @param {Object} options - Switch options
   */
  async switchToLanguage(langCode, options = {}) {
    const { 
      preserveTime = true,
      reason = 'manual',
      forceReload = false 
    } = options;

    console.log('🔄 Switching to language:', {
      from: this.activeLanguage,
      to: langCode,
      reason,
      preserveTime
    });

    try {
      // Check if language is available
      if (!this.availableLanguages.has(langCode)) {
        throw new Error(`Language ${langCode} is not available`);
      }

      // Get current time for seamless switching
      let currentTime = 0;
      if (preserveTime && this.activeSynchronizer) {
        // This would need to be provided by the video player
        currentTime = this.getCurrentVideoTime();
      }

      // Stop current synchronizer
      if (this.activeSynchronizer) {
        this.activeSynchronizer.stop();
      }

      // Get or create synchronizer for new language
      let synchronizer = this.synchronizers.get(langCode);
      if (!synchronizer || forceReload) {
        synchronizer = await this.createSynchronizerForLanguage(langCode);
        this.synchronizers.set(langCode, synchronizer);
      }

      // Switch active synchronizer
      this.activeSynchronizer = synchronizer;
      this.activeLanguage = langCode;

      // Start new synchronizer
      if (this.activeSynchronizer) {
        this.activeSynchronizer.start();
        
        // Resume at current time for seamless switching
        if (preserveTime && currentTime > 0) {
          this.activeSynchronizer.updateTime(currentTime);
        }
      }

      // Update metrics
      this.metrics.languageSwitches++;

      console.log('✅ Language switch completed:', {
        activeLanguage: this.activeLanguage,
        synchronizerActive: !!this.activeSynchronizer,
        resumedAt: currentTime
      });

      // Notify callbacks
      this.notifyCallback('onLanguageChange', {
        previousLanguage: options.from || null,
        currentLanguage: langCode,
        reason,
        seamless: preserveTime
      });

      // Preload next priority language if enabled
      if (this.options.preloadNextLanguage) {
        this.preloadNextPriorityLanguage(langCode);
      }

    } catch (error) {
      console.error('❌ Error switching language:', error);
      this.notifyCallback('onError', { 
        type: 'switch_error', 
        error: error.message,
        langCode 
      });
      throw error;
    }
  }

  /**
   * Get best available language based on priority
   * @returns {string|null} Best available language code
   */
  getBestAvailableLanguage() {
    // Check priority order
    for (const langCode of this.languagePriority) {
      if (this.availableLanguages.has(langCode)) {
        return langCode;
      }
    }

    // Fallback to highest quality available
    let bestLang = null;
    let bestScore = 0;

    for (const [langCode, data] of this.availableLanguages) {
      if (data.qualityScore > bestScore) {
        bestScore = data.qualityScore;
        bestLang = langCode;
      }
    }

    return bestLang;
  }

  /**
   * Select best subtitle from array based on quality scoring
   * @param {Array} subtitles - Array of subtitle options
   * @returns {Object} Best subtitle with quality score
   */
  selectBestSubtitle(subtitles) {
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      return null;
    }

    console.log('🎯 Scoring subtitles for quality selection:', subtitles.length);

    let bestSubtitle = null;
    let bestScore = 0;

    for (const subtitle of subtitles) {
      const score = this.calculateQualityScore(subtitle);
      
      if (score > bestScore) {
        bestScore = score;
        bestSubtitle = { ...subtitle, qualityScore: score };
      }
    }

    console.log('✅ Best subtitle selected:', {
      fileName: bestSubtitle?.fileName,
      score: bestScore.toFixed(2),
      downloadCount: bestSubtitle?.downloadCount,
      rating: bestSubtitle?.rating
    });

    return bestSubtitle;
  }

  /**
   * Calculate quality score for a subtitle
   * @param {Object} subtitle - Subtitle data
   * @returns {number} Quality score (0-1)
   */
  calculateQualityScore(subtitle) {
    const weights = this.options.qualityWeights;
    let score = 0;

    // Download count score (normalized to 0-1)
    if (subtitle.downloadCount) {
      const downloadScore = Math.min(subtitle.downloadCount / 10000, 1);
      score += downloadScore * weights.downloadCount;
    }

    // Rating score (assuming 0-10 scale, normalize to 0-1)
    if (subtitle.rating) {
      const ratingScore = Math.min(subtitle.rating / 10, 1);
      score += ratingScore * weights.rating;
    }

    // File size score (prefer reasonable sizes, penalize too small or too large)
    if (subtitle.fileSize) {
      const sizeKB = subtitle.fileSize / 1024;
      let sizeScore = 0;
      
      if (sizeKB >= 10 && sizeKB <= 500) { // Ideal range
        sizeScore = 1;
      } else if (sizeKB < 10) { // Too small
        sizeScore = sizeKB / 10;
      } else if (sizeKB > 500) { // Too large
        sizeScore = Math.max(0, 1 - (sizeKB - 500) / 1000);
      }
      
      score += sizeScore * weights.fileSize;
    }

    // Upload date score (prefer recent uploads)
    if (subtitle.uploadDate) {
      const daysSinceUpload = (Date.now() - new Date(subtitle.uploadDate).getTime()) / (1000 * 60 * 60 * 24);
      const dateScore = Math.max(0, 1 - daysSinceUpload / 365); // Decay over a year
      score += dateScore * weights.uploadDate;
    }

    // Bonus for specific quality indicators
    if (subtitle.fileName) {
      // Bonus for common quality indicators in filename
      const qualityIndicators = ['bluray', 'web-dl', 'webrip', '1080p', '720p'];
      const hasQualityIndicator = qualityIndicators.some(indicator => 
        subtitle.fileName.toLowerCase().includes(indicator)
      );
      if (hasQualityIndicator) {
        score += 0.1; // 10% bonus
      }
    }

    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Create synchronizer for a specific language
   * @param {string} langCode - Language code
   * @returns {Object} Synchronizer instance
   */
  async createSynchronizerForLanguage(langCode) {
    console.log('🔧 Creating synchronizer for language:', langCode);

    const languageData = this.availableLanguages.get(langCode);
    if (!languageData) {
      throw new Error(`No data available for language: ${langCode}`);
    }

    // Get or download subtitle content
    let subtitleContent = await this.getSubtitleContent(langCode);
    
    // Parse VTT content
    const parseResult = parseVTTEnhanced(subtitleContent, {
      strictMode: false,
      enableErrorRecovery: true,
      sanitizeHtml: true,
      validateTiming: true
    });

    if (parseResult.cues.length === 0) {
      throw new Error(`No valid cues found for language: ${langCode}`);
    }

    // Create synchronizer
    const synchronizer = createSubtitleSynchronizer({
      updateInterval: 100,
      transitionDuration: 200,
      preloadBuffer: 2000,
      enablePerformanceOptimization: true
    });

    // Set up callbacks
    synchronizer.on('subtitleChange', (data) => {
      this.notifyCallback('onSubtitleChange', {
        ...data,
        language: langCode
      });
    });

    // Load cues
    synchronizer.loadCues(parseResult.cues);

    console.log('✅ Synchronizer created for language:', {
      langCode,
      cueCount: parseResult.cues.length,
      errors: parseResult.metadata.errors.length
    });

    return synchronizer;
  }

  /**
   * Get subtitle content for a language (from cache or download)
   * @param {string} langCode - Language code
   * @returns {string} VTT content
   */
  async getSubtitleContent(langCode) {
    const cacheKey = this.getCacheKey(langCode);
    
    // Check cache first
    const cached = this.cachedSubtitles.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      console.log('📦 Using cached subtitle content for:', langCode);
      this.metrics.cacheHits++;
      return cached.content;
    }

    // Download and process
    console.log('📥 Downloading subtitle content for:', langCode);
    this.metrics.cacheMisses++;

    const languageData = this.availableLanguages.get(langCode);
    const bestSubtitle = languageData.bestSubtitle;

    // This would typically use the subtitle service to download
    // For now, we'll simulate the download process
    const downloadedContent = await this.downloadSubtitleContent(bestSubtitle);
    
    // Cache the content
    this.cacheSubtitleContent(cacheKey, downloadedContent, bestSubtitle);

    return downloadedContent;
  }

  /**
   * Download subtitle content using subtitle service
   * @param {Object} subtitle - Subtitle data
   * @returns {string} VTT content
   */
  async downloadSubtitleContent(subtitle) {
    console.log('📥 Downloading subtitle:', subtitle.fileName);
    
    try {
      // Import subtitle service dynamically to avoid circular dependencies
      const { default: subtitleService } = await import('../services/subtitleService');
      
      // Download and process subtitle
      const processedSubtitle = await subtitleService.downloadSubtitle(subtitle);
      
      if (processedSubtitle.useDirectContent && processedSubtitle.content) {
        console.log('✅ Using direct VTT content from subtitle service');
        return processedSubtitle.content;
      } else if (processedSubtitle.blobUrl) {
        // Fallback to blob URL if direct content not available
        console.log('📥 Fetching content from blob URL');
        const response = await fetch(processedSubtitle.blobUrl);
        const content = await response.text();
        
        // Track blob URL for cleanup
        this.blobUrls.add(processedSubtitle.blobUrl);
        this.metrics.blobUrlsCreated++;
        
        return content;
      } else {
        throw new Error('No content or blob URL available from subtitle service');
      }
    } catch (error) {
      console.error('❌ Error downloading subtitle content:', error);
      
      // Return fallback content to prevent complete failure
      return `WEBVTT
NOTE Error downloading subtitle: ${subtitle.fileName}

00:00:01.000 --> 00:00:05.000
Subtitle download failed: ${error.message}

00:00:06.000 --> 00:00:10.000
Please try switching to another language or refreshing subtitles.
`;
    }
  }

  /**
   * Cache subtitle content
   * @param {string} cacheKey - Cache key
   * @param {string} content - VTT content
   * @param {Object} subtitle - Subtitle metadata
   */
  cacheSubtitleContent(cacheKey, content, subtitle) {
    const cacheEntry = {
      content,
      subtitle,
      cachedAt: Date.now(),
      size: content.length,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Check cache size limits
    this.enforceCacheLimits();

    this.cachedSubtitles.set(cacheKey, cacheEntry);
    this.metrics.totalCacheSize += content.length;

    console.log('💾 Cached subtitle content:', {
      cacheKey,
      size: `${(content.length / 1024).toFixed(1)}KB`,
      totalCacheSize: `${(this.metrics.totalCacheSize / 1024).toFixed(1)}KB`
    });
  }

  /**
   * Enforce cache size and count limits
   */
  enforceCacheLimits() {
    // Remove expired entries first
    for (const [key, entry] of this.cachedSubtitles) {
      if (this.isCacheExpired(entry)) {
        this.metrics.totalCacheSize -= entry.size;
        this.cachedSubtitles.delete(key);
      }
    }

    // If still over limits, remove least recently used
    while (this.cachedSubtitles.size > this.options.maxCachedLanguages ||
           this.metrics.totalCacheSize > this.options.maxCacheSize) {
      
      let oldestKey = null;
      let oldestTime = Date.now();

      for (const [key, entry] of this.cachedSubtitles) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const entry = this.cachedSubtitles.get(oldestKey);
        this.metrics.totalCacheSize -= entry.size;
        this.cachedSubtitles.delete(oldestKey);
        console.log('🗑️ Evicted cached subtitle:', oldestKey);
      } else {
        break; // Safety break
      }
    }
  }

  /**
   * Check if cache entry is expired
   * @param {Object} entry - Cache entry
   * @returns {boolean} True if expired
   */
  isCacheExpired(entry) {
    return Date.now() - entry.cachedAt > this.options.cacheExpirationTime;
  }

  /**
   * Generate cache key for language
   * @param {string} langCode - Language code
   * @returns {string} Cache key
   */
  getCacheKey(langCode) {
    const languageData = this.availableLanguages.get(langCode);
    if (!languageData) return langCode;
    
    const bestSubtitle = languageData.bestSubtitle;
    return `${langCode}_${bestSubtitle.id || bestSubtitle.fileName}_${bestSubtitle.downloadCount || 0}`;
  }

  /**
   * Preload all available languages
   */
  async preloadAllLanguages() {
    console.log('⚡ Preloading all languages...');
    
    const promises = Array.from(this.availableLanguages.keys()).map(async (langCode) => {
      try {
        await this.getSubtitleContent(langCode);
        console.log(`✅ Preloaded ${langCode}`);
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${langCode}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
    console.log('⚡ Preloading completed');
  }

  /**
   * Preload next priority language
   * @param {string} currentLang - Current active language
   */
  async preloadNextPriorityLanguage(currentLang) {
    const currentIndex = this.languagePriority.indexOf(currentLang);
    if (currentIndex === -1) return;

    // Find next available language in priority order
    for (let i = currentIndex + 1; i < this.languagePriority.length; i++) {
      const nextLang = this.languagePriority[i];
      if (this.availableLanguages.has(nextLang)) {
        try {
          await this.getSubtitleContent(nextLang);
          console.log('⚡ Preloaded next priority language:', nextLang);
          break;
        } catch (error) {
          console.warn('⚠️ Failed to preload next language:', error.message);
        }
      }
    }
  }

  /**
   * Get current video time (placeholder - would be provided by video player)
   * @returns {number} Current time in seconds
   */
  getCurrentVideoTime() {
    // This would be provided by the video player integration
    return 0;
  }

  /**
   * Update subtitle time for active synchronizer
   * @param {number} currentTime - Current video time
   */
  updateTime(currentTime) {
    if (this.activeSynchronizer) {
      this.activeSynchronizer.updateTime(currentTime);
    }
  }

  /**
   * Get available languages with metadata
   * @returns {Array} Available languages with metadata
   */
  getAvailableLanguages() {
    return Array.from(this.availableLanguages.entries()).map(([langCode, data]) => ({
      langCode,
      qualityScore: data.qualityScore,
      subtitleCount: data.subtitles.length,
      bestFileName: data.bestSubtitle.fileName,
      cached: this.cachedSubtitles.has(this.getCacheKey(langCode))
    }));
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      ...this.metrics,
      cachedLanguages: this.cachedSubtitles.size,
      availableLanguages: this.availableLanguages.size,
      cacheSize: this.getCacheSize(),
      activeBlobUrls: this.blobUrls.size
    };
  }

  /**
   * Get total cache size
   * @returns {number} Cache size in bytes
   */
  getCacheSize() {
    return this.metrics.totalCacheSize;
  }

  /**
   * Clear all languages and cache
   */
  clearAllLanguages() {
    console.log('🗑️ Clearing all languages and cache');

    // Stop all synchronizers
    for (const synchronizer of this.synchronizers.values()) {
      synchronizer.destroy();
    }
    this.synchronizers.clear();
    this.activeSynchronizer = null;

    // Clear data
    this.availableLanguages.clear();
    this.cachedSubtitles.clear();
    this.activeLanguage = null;

    // Clean up blob URLs
    this.cleanupAllBlobUrls();

    // Reset metrics
    this.metrics.totalCacheSize = 0;
  }

  /**
   * Clean up all blob URLs
   */
  cleanupAllBlobUrls() {
    console.log('🗑️ Cleaning up blob URLs:', this.blobUrls.size);
    
    for (const blobUrl of this.blobUrls) {
      try {
        URL.revokeObjectURL(blobUrl);
        this.metrics.blobUrlsRevoked++;
      } catch (error) {
        console.warn('⚠️ Failed to revoke blob URL:', error);
      }
    }
    
    this.blobUrls.clear();
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.performPeriodicCleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Perform periodic cleanup
   */
  performPeriodicCleanup() {
    console.log('🧹 Performing periodic cleanup...');
    
    // Clean expired cache entries
    this.enforceCacheLimits();
    
    // Clean up unused synchronizers
    for (const [langCode, synchronizer] of this.synchronizers) {
      if (langCode !== this.activeLanguage && !synchronizer.isActive) {
        synchronizer.destroy();
        this.synchronizers.delete(langCode);
        console.log('🗑️ Cleaned up unused synchronizer:', langCode);
      }
    }
  }

  /**
   * Set event callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase()}${event.slice(1)}`)) {
      this.callbacks[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`] = callback;
    }
  }

  /**
   * Notify callback
   * @param {string} callbackName - Callback name
   * @param {*} data - Data to pass to callback
   */
  notifyCallback(callbackName, data) {
    const callback = this.callbacks[callbackName];
    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Error in ${callbackName} callback:`, error);
      }
    }
  }

  /**
   * Destroy manager and clean up resources
   */
  destroy() {
    console.log('🗑️ Destroying MultiLanguageSubtitleManager');
    
    this.clearAllLanguages();
    
    // Clear callbacks
    this.callbacks = {};
    
    console.log('✅ MultiLanguageSubtitleManager destroyed');
  }
}

/**
 * Create multi-language subtitle manager instance
 * @param {Object} options - Configuration options
 * @returns {MultiLanguageSubtitleManager} Manager instance
 */
export function createMultiLanguageSubtitleManager(options = {}) {
  return new MultiLanguageSubtitleManager(options);
}

/**
 * Language priority presets
 */
export const LANGUAGE_PRIORITY_PRESETS = {
  ENGLISH_FIRST: ['eng', 'spa', 'fre', 'ger', 'ita', 'por', 'rus', 'ara'],
  SPANISH_FIRST: ['spa', 'eng', 'por', 'fre', 'ita', 'ger', 'rus', 'ara'],
  EUROPEAN: ['eng', 'fre', 'ger', 'ita', 'spa', 'por', 'rus', 'ara'],
  GLOBAL: ['eng', 'spa', 'fre', 'ger', 'ita', 'por', 'rus', 'ara', 'chi', 'jpn']
};

/**
 * Quality scoring presets
 */
export const QUALITY_SCORING_PRESETS = {
  DOWNLOAD_FOCUSED: {
    downloadCount: 0.6,
    rating: 0.2,
    fileSize: 0.1,
    uploadDate: 0.1
  },
  RATING_FOCUSED: {
    downloadCount: 0.2,
    rating: 0.6,
    fileSize: 0.1,
    uploadDate: 0.1
  },
  BALANCED: {
    downloadCount: 0.4,
    rating: 0.3,
    fileSize: 0.2,
    uploadDate: 0.1
  }
};