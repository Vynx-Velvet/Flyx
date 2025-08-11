/**
 * High-frequency subtitle synchronization system for sub-100ms accuracy
 * Implements requirement 3.1, 3.4 for accurate subtitle synchronization and smooth transitions
 */

import { createSubtitleLogger } from './logging/SubtitleLogger.js';

/**
 * Subtitle synchronizer class for high-frequency updates and smooth transitions
 */
export class SubtitleSynchronizer {
  constructor(options = {}) {
    this.options = {
      updateInterval: 100, // 100ms for sub-100ms accuracy
      transitionDuration: 200, // Smooth transition duration
      preloadBuffer: 2000, // Preload subtitles 2 seconds ahead
      maxCacheSize: 1000, // Maximum cached cues
      enablePerformanceOptimization: true,
      ...options
    };

    this.cues = [];
    
    // Enhanced logging for subtitle synchronization
    this.logger = createSubtitleLogger(options.mediaId);
    this.currentCue = null;
    this.previousCue = null;
    this.nextCue = null;
    this.cueCache = new Map();
    this.updateTimer = null;
    this.isActive = false;
    this.callbacks = {
      onSubtitleChange: null,
      onCuePreload: null,
      onPerformanceWarning: null
    };

    // Performance monitoring
    this.performanceMetrics = {
      updateCount: 0,
      averageUpdateTime: 0,
      maxUpdateTime: 0,
      cacheHitRate: 0,
      lastUpdateTime: 0
    };

    this.logger.info('SubtitleSynchronizer initialized', this.options);
  }

  /**
   * Load subtitle cues and start synchronization
   * @param {Array} cues - Array of subtitle cues
   * @param {Function} onSubtitleChange - Callback for subtitle changes
   */
  loadCues(cues, onSubtitleChange) {
    this.logger.info('Loading cues into synchronizer', {
      cueCount: cues.length,
      hasCallback: !!onSubtitleChange
    });

    this.cues = this.optimizeCues(cues);
    this.callbacks.onSubtitleChange = onSubtitleChange;
    this.buildCueCache();
    
    this.logger.info('Cues loaded and optimized', {
      originalCount: cues.length,
      optimizedCount: this.cues.length,
      cacheSize: this.cueCache.size
    });
  }

  /**
   * Start high-frequency subtitle synchronization
   */
  start() {
    if (this.isActive) {
      this.logger.warn('Synchronizer already active');
      return;
    }

    this.isActive = true;
    this.startUpdateLoop();
    this.logger.logSyncStart(this.cues.length, this.options.updateInterval);
  }

  /**
   * Stop subtitle synchronization
   */
  stop() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.logger.info('Subtitle synchronizer stopped');
  }

  /**
   * Update current time and synchronize subtitles
   * @param {number} currentTime - Current video time in seconds
   */
  updateTime(currentTime) {
    if (!this.isActive || !this.cues.length) {
      return;
    }

    const startTime = performance.now();
    
    try {
      const activeCue = this.findActiveCue(currentTime);
      const hasChanged = this.updateCurrentCue(activeCue, currentTime);
      
      if (hasChanged && this.callbacks.onSubtitleChange) {
        this.callbacks.onSubtitleChange({
          cue: this.currentCue,
          text: this.currentCue?.text || '',
          time: currentTime,
          transition: this.calculateTransition(currentTime)
        });
      }

      // Preload upcoming cues
      this.preloadUpcomingCues(currentTime);
      
      // Update performance metrics
      this.updatePerformanceMetrics(performance.now() - startTime);
      
    } catch (error) {
      this.logger.error('Subtitle synchronization error', error);
    }
  }

  /**
   * Optimize cues for better performance
   * @param {Array} cues - Original cues
   * @returns {Array} Optimized cues
   */
  optimizeCues(cues) {
    if (!this.options.enablePerformanceOptimization) {
      return cues;
    }

    this.logger.debug('Optimizing cues for performance');

    // Sort cues by start time
    const sortedCues = [...cues].sort((a, b) => a.start - b.start);
    
    // Remove duplicate or overlapping cues
    const optimizedCues = [];
    let lastEndTime = -1;

    for (const cue of sortedCues) {
      // Skip cues that start before the last one ended (overlap handling)
      if (cue.start < lastEndTime) {
        this.logger.debug('Skipping overlapping cue', { cueId: cue.id });
        continue;
      }

      // Skip very short cues (likely errors)
      if (cue.end - cue.start < 0.1) {
        this.logger.debug('Skipping very short cue', { cueId: cue.id, duration: cue.end - cue.start });
        continue;
      }

      // Skip empty text cues
      if (!cue.text || cue.text.trim().length === 0) {
        this.logger.debug('Skipping empty text cue', { cueId: cue.id });
        continue;
      }

      optimizedCues.push({
        ...cue,
        // Pre-calculate search optimization
        searchKey: `${Math.floor(cue.start)}-${Math.floor(cue.end)}`
      });

      lastEndTime = cue.end;
    }

    this.logger.logCacheOptimization(
      cues.length, 
      optimizedCues.length, 
      0, // removedOverlaps - would need to track separately
      0, // removedShort - would need to track separately  
      cues.length - optimizedCues.length  // total removed
    );

    return optimizedCues;
  }

  /**
   * Build cache for fast cue lookup
   */
  buildCueCache() {
    const cacheStartTime = Date.now();
    
    this.cueCache.clear();
    
    // Create time-based cache buckets (1-second intervals)
    for (const cue of this.cues) {
      const startBucket = Math.floor(cue.start);
      const endBucket = Math.floor(cue.end);
      
      for (let bucket = startBucket; bucket <= endBucket; bucket++) {
        if (!this.cueCache.has(bucket)) {
          this.cueCache.set(bucket, []);
        }
        this.cueCache.get(bucket).push(cue);
      }
    }

    const cacheBuildTime = Date.now() - cacheStartTime;
    this.logger.logCacheBuild(this.cueCache.size, this.cues.length, cacheBuildTime);
  }

  /**
   * Find active cue for given time with optimized search
   * @param {number} currentTime - Current time in seconds
   * @returns {Object|null} Active cue or null
   */
  findActiveCue(currentTime) {
    // Use cache for fast lookup
    const bucket = Math.floor(currentTime);
    const candidateCues = this.cueCache.get(bucket) || [];
    
    // Find exact match in candidate cues
    for (const cue of candidateCues) {
      if (currentTime >= cue.start && currentTime <= cue.end) {
        return cue;
      }
    }

    // Fallback to linear search if cache miss
    for (const cue of this.cues) {
      if (currentTime >= cue.start && currentTime <= cue.end) {
        return cue;
      }
    }

    return null;
  }

  /**
   * Update current cue and detect changes
   * @param {Object|null} newCue - New active cue
   * @param {number} currentTime - Current time
   * @returns {boolean} True if cue changed
   */
  updateCurrentCue(newCue, currentTime) {
    const previousCue = this.currentCue;
    
    if (newCue !== previousCue) {
      this.previousCue = previousCue;
      this.currentCue = newCue;
      
      // Find next cue for preloading
      this.nextCue = this.findNextCue(currentTime);
      
      // Calculate sync accuracy (assuming we're within 100ms tolerance)
      const syncAccuracy = Math.abs(currentTime - newCue.start) * 1000; // Convert to ms
      this.logger.logSyncUpdate(currentTime, newCue, this.nextCue, syncAccuracy);
      
      return true;
    }
    
    return false;
  }

  /**
   * Find next cue after current time
   * @param {number} currentTime - Current time
   * @returns {Object|null} Next cue or null
   */
  findNextCue(currentTime) {
    for (const cue of this.cues) {
      if (cue.start > currentTime) {
        return cue;
      }
    }
    return null;
  }

  /**
   * Preload upcoming cues for smooth transitions
   * @param {number} currentTime - Current time
   */
  preloadUpcomingCues(currentTime) {
    const preloadTime = currentTime + (this.options.preloadBuffer / 1000);
    
    for (const cue of this.cues) {
      if (cue.start > currentTime && cue.start <= preloadTime) {
        if (this.callbacks.onCuePreload) {
          this.callbacks.onCuePreload(cue);
        }
      }
    }
  }

  /**
   * Calculate transition properties for smooth subtitle changes
   * @param {number} currentTime - Current time
   * @returns {Object} Transition properties
   */
  calculateTransition(currentTime) {
    if (!this.currentCue) {
      return { type: 'none', progress: 0 };
    }

    const cueProgress = (currentTime - this.currentCue.start) / (this.currentCue.end - this.currentCue.start);
    const transitionTime = this.options.transitionDuration / 1000;
    
    // Fade in at start
    if (cueProgress < transitionTime / (this.currentCue.end - this.currentCue.start)) {
      return {
        type: 'fadeIn',
        progress: cueProgress / (transitionTime / (this.currentCue.end - this.currentCue.start))
      };
    }
    
    // Fade out at end
    const fadeOutStart = 1 - (transitionTime / (this.currentCue.end - this.currentCue.start));
    if (cueProgress > fadeOutStart) {
      return {
        type: 'fadeOut',
        progress: (cueProgress - fadeOutStart) / (1 - fadeOutStart)
      };
    }
    
    return { type: 'stable', progress: 1 };
  }

  /**
   * Start the high-frequency update loop
   */
  startUpdateLoop() {
    this.updateTimer = setInterval(() => {
      // This will be called by the video player with current time
      // The actual time update happens via updateTime() method
    }, this.options.updateInterval);
  }

  /**
   * Update performance metrics
   * @param {number} updateTime - Time taken for update in ms
   */
  updatePerformanceMetrics(updateTime) {
    this.performanceMetrics.updateCount++;
    this.performanceMetrics.lastUpdateTime = updateTime;
    
    // Calculate average update time
    this.performanceMetrics.averageUpdateTime = 
      (this.performanceMetrics.averageUpdateTime * (this.performanceMetrics.updateCount - 1) + updateTime) / 
      this.performanceMetrics.updateCount;
    
    // Track maximum update time
    if (updateTime > this.performanceMetrics.maxUpdateTime) {
      this.performanceMetrics.maxUpdateTime = updateTime;
    }
    
    // Warn about performance issues
    if (updateTime > 10 && this.callbacks.onPerformanceWarning) {
      this.callbacks.onPerformanceWarning({
        updateTime,
        averageTime: this.performanceMetrics.averageUpdateTime,
        maxTime: this.performanceMetrics.maxUpdateTime
      });
    }
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.cueCache.size,
      cueCount: this.cues.length,
      isActive: this.isActive
    };
  }

  /**
   * Set callback functions
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase()}${event.slice(1)}`)) {
      this.callbacks[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`] = callback;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    this.cues = [];
    this.cueCache.clear();
    this.callbacks = {};
    this.logger.info('SubtitleSynchronizer destroyed');
  }
}

/**
 * Create and configure a subtitle synchronizer instance
 * @param {Object} options - Configuration options
 * @returns {SubtitleSynchronizer} Configured synchronizer instance
 */
export function createSubtitleSynchronizer(options = {}) {
  return new SubtitleSynchronizer(options);
}

/**
 * Utility function to validate subtitle timing accuracy
 * @param {Array} cues - Subtitle cues
 * @param {number} tolerance - Timing tolerance in seconds
 * @returns {Object} Validation result
 */
export function validateSubtitleTiming(cues, tolerance = 0.1) {
  const issues = [];
  const stats = {
    totalCues: cues.length,
    averageDuration: 0,
    shortCues: 0,
    longCues: 0,
    overlaps: 0
  };

  let totalDuration = 0;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const duration = cue.end - cue.start;
    totalDuration += duration;

    // Check for very short cues
    if (duration < tolerance) {
      stats.shortCues++;
      issues.push(`Cue ${cue.id} is very short: ${duration.toFixed(3)}s`);
    }

    // Check for very long cues
    if (duration > 10) {
      stats.longCues++;
      issues.push(`Cue ${cue.id} is very long: ${duration.toFixed(1)}s`);
    }

    // Check for overlaps with next cue
    if (i < cues.length - 1) {
      const nextCue = cues[i + 1];
      if (cue.end > nextCue.start) {
        stats.overlaps++;
        issues.push(`Cue ${cue.id} overlaps with ${nextCue.id}`);
      }
    }
  }

  stats.averageDuration = totalDuration / cues.length;

  return {
    isValid: issues.length === 0,
    issues,
    stats
  };
}