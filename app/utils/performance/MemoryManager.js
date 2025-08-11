/**
 * Memory Manager for Media Playback System
 * Monitors memory usage and performs automatic cleanup of unused resources
 * Requirements: 5.1, 5.2, 5.4, 6.2
 */

export class MemoryManager {
  constructor() {
    this.resources = {
      blobUrls: new Map(), // url -> { created, lastAccessed, size, type }
      eventListeners: new Map(), // element -> listeners[]
      hlsInstances: new Set(),
      videoElements: new Set(),
      subtitleCaches: new Map(), // language -> { data, created, size }
      bufferReferences: new Set()
    };

    this.metrics = {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      totalBlobUrls: 0,
      totalBlobSize: 0,
      totalEventListeners: 0,
      lastCleanup: 0,
      cleanupCount: 0,
      memoryPressure: 'low' // low, medium, high, critical
    };

    this.thresholds = {
      heapWarning: 100 * 1024 * 1024,    // 100MB
      heapCritical: 200 * 1024 * 1024,   // 200MB
      maxBlobUrls: 50,
      maxBlobAge: 5 * 60 * 1000,         // 5 minutes
      maxSubtitleCacheAge: 10 * 60 * 1000, // 10 minutes
      cleanupInterval: 30 * 1000,         // 30 seconds
      aggressiveCleanupThreshold: 150 * 1024 * 1024 // 150MB
    };

    this.callbacks = {
      onMemoryWarning: [],
      onMemoryCleanup: [],
      onMemoryPressure: [],
      onPerformanceDataCleanup: [],
      onBufferSizeReduction: []
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.cleanupInterval = null;

    // Bind methods to preserve context
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleMemoryPressure = this.handleMemoryPressure.bind(this);

    // Set up browser event listeners
    this.setupBrowserEventListeners();
  }

  /**
   * Set up browser event listeners for memory management
   */
  setupBrowserEventListeners() {
    if (typeof window !== 'undefined') {
      // Clean up on page unload
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      
      // Clean up when page becomes hidden
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Listen for memory pressure events (if supported)
      if ('memory' in performance && 'addEventListener' in performance.memory) {
        performance.memory.addEventListener('memorypressure', this.handleMemoryPressure);
      }
    }
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    console.log('🧠 Memory Manager: Starting memory monitoring');
    this.isMonitoring = true;

    // Monitor memory usage every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryMetrics();
      this.checkMemoryPressure();
    }, 5000);

    // Perform cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performScheduledCleanup();
    }, this.thresholds.cleanupInterval);

    // Initial memory check
    this.updateMemoryMetrics();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    console.log('🧠 Memory Manager: Stopping memory monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics() {
    if ('memory' in performance) {
      const memory = performance.memory;
      this.metrics.heapUsed = memory.usedJSHeapSize;
      this.metrics.heapTotal = memory.totalJSHeapSize;
      this.metrics.heapLimit = memory.jsHeapSizeLimit;
    }

    // Update resource metrics
    this.metrics.totalBlobUrls = this.resources.blobUrls.size;
    this.metrics.totalBlobSize = Array.from(this.resources.blobUrls.values())
      .reduce((total, blob) => total + (blob.size || 0), 0);
    
    this.metrics.totalEventListeners = Array.from(this.resources.eventListeners.values())
      .reduce((total, listeners) => total + listeners.length, 0);
  }

  /**
   * Check memory pressure and update status
   */
  checkMemoryPressure() {
    const heapUsed = this.metrics.heapUsed;
    const heapLimit = this.metrics.heapLimit;
    const usageRatio = heapUsed / heapLimit;

    let newPressure = 'low';
    
    if (usageRatio > 0.9 || heapUsed > this.thresholds.heapCritical) {
      newPressure = 'critical';
    } else if (usageRatio > 0.7 || heapUsed > this.thresholds.aggressiveCleanupThreshold) {
      newPressure = 'high';
    } else if (usageRatio > 0.5 || heapUsed > this.thresholds.heapWarning) {
      newPressure = 'medium';
    }

    if (newPressure !== this.metrics.memoryPressure) {
      const oldPressure = this.metrics.memoryPressure;
      this.metrics.memoryPressure = newPressure;
      
      console.log(`🧠 Memory pressure changed: ${oldPressure} → ${newPressure}`, {
        heapUsed: Math.round(heapUsed / 1024 / 1024) + 'MB',
        heapLimit: Math.round(heapLimit / 1024 / 1024) + 'MB',
        usageRatio: Math.round(usageRatio * 100) + '%'
      });

      this.triggerCallbacks('onMemoryPressure', {
        level: newPressure,
        heapUsed,
        heapLimit,
        usageRatio
      });

      // Trigger aggressive cleanup for high/critical pressure
      if (newPressure === 'high' || newPressure === 'critical') {
        this.performAggressiveCleanup();
      }
    }

    // Trigger memory warning callbacks
    if (heapUsed > this.thresholds.heapWarning) {
      this.triggerCallbacks('onMemoryWarning', {
        level: heapUsed > this.thresholds.heapCritical ? 'critical' : 'warning',
        heapUsed,
        heapLimit,
        usageRatio
      });
    }
  }

  /**
   * Register a blob URL for tracking
   */
  registerBlobUrl(url, metadata = {}) {
    this.resources.blobUrls.set(url, {
      created: Date.now(),
      lastAccessed: Date.now(),
      size: metadata.size || 0,
      type: metadata.type || 'unknown',
      source: metadata.source || 'unknown'
    });

    console.log(`🧠 Registered blob URL: ${url.substring(0, 50)}... (${metadata.type})`);
    
    // Check if we need cleanup
    if (this.resources.blobUrls.size > this.thresholds.maxBlobUrls) {
      this.cleanupOldBlobUrls();
    }
  }

  /**
   * Access a blob URL (updates last accessed time)
   */
  accessBlobUrl(url) {
    const blob = this.resources.blobUrls.get(url);
    if (blob) {
      blob.lastAccessed = Date.now();
    }
  }

  /**
   * Unregister and revoke a blob URL
   */
  unregisterBlobUrl(url) {
    if (this.resources.blobUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
        this.resources.blobUrls.delete(url);
        console.log(`🧠 Unregistered blob URL: ${url.substring(0, 50)}...`);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error);
      }
    }
  }

  /**
   * Register event listeners for cleanup tracking
   */
  registerEventListeners(element, listeners) {
    if (!this.resources.eventListeners.has(element)) {
      this.resources.eventListeners.set(element, []);
    }
    
    const elementListeners = this.resources.eventListeners.get(element);
    listeners.forEach(listener => {
      elementListeners.push({
        ...listener,
        registered: Date.now()
      });
    });

    console.log(`🧠 Registered ${listeners.length} event listeners for element`);
  }

  /**
   * Unregister event listeners
   */
  unregisterEventListeners(element) {
    const listeners = this.resources.eventListeners.get(element);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          element.removeEventListener(listener.event, listener.handler, listener.options);
        } catch (error) {
          console.warn('Failed to remove event listener:', error);
        }
      });
      
      this.resources.eventListeners.delete(element);
      console.log(`🧠 Unregistered ${listeners.length} event listeners`);
    }
  }

  /**
   * Register HLS instance for cleanup tracking
   */
  registerHlsInstance(hls) {
    this.resources.hlsInstances.add(hls);
    console.log('🧠 Registered HLS instance');
  }

  /**
   * Unregister and cleanup HLS instance
   */
  unregisterHlsInstance(hls) {
    if (this.resources.hlsInstances.has(hls)) {
      try {
        if (hls.destroy) {
          hls.destroy();
        }
        this.resources.hlsInstances.delete(hls);
        console.log('🧠 Unregistered and destroyed HLS instance');
      } catch (error) {
        console.warn('Failed to destroy HLS instance:', error);
      }
    }
  }

  /**
   * Register video element for cleanup tracking
   */
  registerVideoElement(video) {
    this.resources.videoElements.add(video);
    console.log('🧠 Registered video element');
  }

  /**
   * Unregister and cleanup video element
   */
  unregisterVideoElement(video) {
    if (this.resources.videoElements.has(video)) {
      try {
        // Pause and clear video
        video.pause();
        video.src = '';
        video.load();
        
        // Remove from tracking
        this.resources.videoElements.delete(video);
        console.log('🧠 Unregistered and cleaned video element');
      } catch (error) {
        console.warn('Failed to cleanup video element:', error);
      }
    }
  }

  /**
   * Cache subtitle data
   */
  cacheSubtitleData(language, data, size = 0) {
    this.resources.subtitleCaches.set(language, {
      data,
      created: Date.now(),
      size,
      lastAccessed: Date.now()
    });

    console.log(`🧠 Cached subtitle data for ${language} (${Math.round(size / 1024)}KB)`);
    
    // Check if we need cleanup
    this.cleanupOldSubtitleCaches();
  }

  /**
   * Get cached subtitle data
   */
  getCachedSubtitleData(language) {
    const cache = this.resources.subtitleCaches.get(language);
    if (cache) {
      cache.lastAccessed = Date.now();
      return cache.data;
    }
    return null;
  }

  /**
   * Clear subtitle cache
   */
  clearSubtitleCache(language = null) {
    if (language) {
      this.resources.subtitleCaches.delete(language);
      console.log(`🧠 Cleared subtitle cache for ${language}`);
    } else {
      const count = this.resources.subtitleCaches.size;
      this.resources.subtitleCaches.clear();
      console.log(`🧠 Cleared all subtitle caches (${count} items)`);
    }
  }

  /**
   * Perform scheduled cleanup
   */
  performScheduledCleanup() {
    console.log('🧹 Performing scheduled memory cleanup');
    
    const startTime = Date.now();
    let cleanedItems = 0;

    // Clean up old blob URLs
    cleanedItems += this.cleanupOldBlobUrls();
    
    // Clean up old subtitle caches
    cleanedItems += this.cleanupOldSubtitleCaches();
    
    // Clean up orphaned event listeners
    cleanedItems += this.cleanupOrphanedEventListeners();

    const cleanupTime = Date.now() - startTime;
    this.metrics.lastCleanup = Date.now();
    this.metrics.cleanupCount++;

    console.log(`🧹 Scheduled cleanup completed: ${cleanedItems} items cleaned in ${cleanupTime}ms`);
    
    this.triggerCallbacks('onMemoryCleanup', {
      type: 'scheduled',
      itemsCleaned: cleanedItems,
      duration: cleanupTime
    });
  }

  /**
   * Perform aggressive cleanup during high memory pressure
   */
  performAggressiveCleanup() {
    console.log('🚨 Performing aggressive memory cleanup due to high memory pressure');
    
    const startTime = Date.now();
    let cleanedItems = 0;

    // Clean ALL blob URLs
    cleanedItems += this.cleanupAllBlobUrls();
    
    // Clear all subtitle caches
    const subtitleCount = this.resources.subtitleCaches.size;
    this.clearSubtitleCache();
    cleanedItems += subtitleCount;
    
    // Clean up all orphaned resources
    cleanedItems += this.cleanupOrphanedEventListeners();
    cleanedItems += this.cleanupOrphanedVideoElements();
    
    // Force garbage collection if available
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
      console.log('🧹 Forced garbage collection');
    }

    const cleanupTime = Date.now() - startTime;
    
    console.log(`🚨 Aggressive cleanup completed: ${cleanedItems} items cleaned in ${cleanupTime}ms`);
    
    this.triggerCallbacks('onMemoryCleanup', {
      type: 'aggressive',
      itemsCleaned: cleanedItems,
      duration: cleanupTime
    });
  }

  /**
   * Clean up old blob URLs
   */
  cleanupOldBlobUrls() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [url, metadata] of this.resources.blobUrls.entries()) {
      const age = now - metadata.created;
      const timeSinceAccess = now - metadata.lastAccessed;
      
      // Clean up if too old or not accessed recently
      if (age > this.thresholds.maxBlobAge || timeSinceAccess > this.thresholds.maxBlobAge) {
        this.unregisterBlobUrl(url);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old blob URLs`);
    }

    return cleanedCount;
  }

  /**
   * Clean up ALL blob URLs (aggressive cleanup)
   */
  cleanupAllBlobUrls() {
    const count = this.resources.blobUrls.size;
    
    for (const url of this.resources.blobUrls.keys()) {
      this.unregisterBlobUrl(url);
    }

    if (count > 0) {
      console.log(`🧹 Cleaned up ALL ${count} blob URLs`);
    }

    return count;
  }

  /**
   * Clean up old subtitle caches
   */
  cleanupOldSubtitleCaches() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [language, cache] of this.resources.subtitleCaches.entries()) {
      const age = now - cache.created;
      const timeSinceAccess = now - cache.lastAccessed;
      
      if (age > this.thresholds.maxSubtitleCacheAge || timeSinceAccess > this.thresholds.maxSubtitleCacheAge) {
        this.clearSubtitleCache(language);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old subtitle caches`);
    }

    return cleanedCount;
  }

  /**
   * Clean up orphaned event listeners
   */
  cleanupOrphanedEventListeners() {
    let cleanedCount = 0;

    for (const [element, listeners] of this.resources.eventListeners.entries()) {
      // Check if element is still in the DOM
      if (!document.contains(element)) {
        this.unregisterEventListeners(element);
        cleanedCount += listeners.length;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} orphaned event listeners`);
    }

    return cleanedCount;
  }

  /**
   * Clean up orphaned video elements
   */
  cleanupOrphanedVideoElements() {
    let cleanedCount = 0;

    for (const video of this.resources.videoElements) {
      // Check if video element is still in the DOM
      if (!document.contains(video)) {
        this.unregisterVideoElement(video);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} orphaned video elements`);
    }

    return cleanedCount;
  }

  /**
   * Handle page unload - clean up all resources
   */
  handleBeforeUnload() {
    console.log('🧠 Page unloading - performing complete cleanup');
    this.performCompleteCleanup();
  }

  /**
   * Handle visibility change - clean up when page is hidden
   */
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('🧠 Page hidden - performing cleanup');
      this.performScheduledCleanup();
    }
  }

  /**
   * Handle memory pressure events
   */
  handleMemoryPressure(event) {
    console.log('🧠 Memory pressure event detected:', event);
    this.performAggressiveCleanup();
  }

  /**
   * Perform complete cleanup of all resources
   */
  performCompleteCleanup() {
    console.log('🧹 Performing complete memory cleanup');
    
    const startTime = Date.now();
    let cleanedItems = 0;

    // Clean up all blob URLs
    cleanedItems += this.cleanupAllBlobUrls();
    
    // Clean up all HLS instances
    for (const hls of this.resources.hlsInstances) {
      this.unregisterHlsInstance(hls);
      cleanedItems++;
    }
    
    // Clean up all video elements
    for (const video of this.resources.videoElements) {
      this.unregisterVideoElement(video);
      cleanedItems++;
    }
    
    // Clean up all event listeners
    for (const element of this.resources.eventListeners.keys()) {
      const listeners = this.resources.eventListeners.get(element);
      this.unregisterEventListeners(element);
      cleanedItems += listeners.length;
    }
    
    // Clear all subtitle caches
    const subtitleCount = this.resources.subtitleCaches.size;
    this.clearSubtitleCache();
    cleanedItems += subtitleCount;

    const cleanupTime = Date.now() - startTime;
    
    console.log(`🧹 Complete cleanup finished: ${cleanedItems} items cleaned in ${cleanupTime}ms`);
    
    this.triggerCallbacks('onMemoryCleanup', {
      type: 'complete',
      itemsCleaned: cleanedItems,
      duration: cleanupTime
    });
  }

  /**
   * Register callback for memory events
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * Unregister callback
   */
  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  /**
   * Trigger callbacks for an event
   */
  triggerCallbacks(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Get current memory metrics
   */
  getMetrics() {
    this.updateMemoryMetrics();
    return { ...this.metrics };
  }

  /**
   * Get memory usage summary
   */
  getMemoryUsageSummary() {
    this.updateMemoryMetrics();
    
    return {
      heap: {
        used: Math.round(this.metrics.heapUsed / 1024 / 1024), // MB
        total: Math.round(this.metrics.heapTotal / 1024 / 1024), // MB
        limit: Math.round(this.metrics.heapLimit / 1024 / 1024), // MB
        usagePercentage: Math.round((this.metrics.heapUsed / this.metrics.heapLimit) * 100)
      },
      resources: {
        blobUrls: this.metrics.totalBlobUrls,
        blobSize: Math.round(this.metrics.totalBlobSize / 1024), // KB
        eventListeners: this.metrics.totalEventListeners,
        hlsInstances: this.resources.hlsInstances.size,
        videoElements: this.resources.videoElements.size,
        subtitleCaches: this.resources.subtitleCaches.size
      },
      pressure: this.metrics.memoryPressure,
      lastCleanup: this.metrics.lastCleanup,
      cleanupCount: this.metrics.cleanupCount
    };
  }

  /**
   * Force immediate cleanup
   */
  forceCleanup(aggressive = false) {
    if (aggressive) {
      this.performAggressiveCleanup();
    } else {
      this.performScheduledCleanup();
    }
  }

  /**
   * Intelligent buffer size management based on network conditions
   */
  optimizeBufferSize(networkConditions, currentBufferSize) {
    const { bandwidth, stability, trend } = networkConditions;
    const mbps = bandwidth / 1000000;
    
    let recommendedBufferSize = currentBufferSize;
    
    // Base buffer size on bandwidth
    if (mbps >= 10 && stability === 'stable') {
      recommendedBufferSize = Math.min(currentBufferSize, 30); // Reduce for good connections
    } else if (mbps < 2 || stability === 'unstable') {
      recommendedBufferSize = Math.max(currentBufferSize, 90); // Increase for poor connections
    }
    
    // Adjust based on memory pressure
    if (this.metrics.memoryPressure === 'high' || this.metrics.memoryPressure === 'critical') {
      recommendedBufferSize = Math.min(recommendedBufferSize, 45); // Reduce under memory pressure
    }
    
    // Adjust based on trend
    if (trend === 'degrading') {
      recommendedBufferSize = Math.min(recommendedBufferSize * 1.2, 120); // Increase if degrading
    }
    
    console.log(`🧠 Buffer optimization: ${currentBufferSize}MB → ${recommendedBufferSize}MB`, {
      bandwidth: `${mbps.toFixed(1)}Mbps`,
      stability,
      trend,
      memoryPressure: this.metrics.memoryPressure
    });
    
    return recommendedBufferSize;
  }

  /**
   * Garbage collection optimization for long playback sessions
   */
  optimizeGarbageCollection() {
    const sessionDuration = Date.now() - (this.sessionStartTime || Date.now());
    const isLongSession = sessionDuration > 30 * 60 * 1000; // 30 minutes
    
    if (isLongSession && this.metrics.memoryPressure !== 'low') {
      console.log('🧠 Long session detected - optimizing garbage collection');
      
      // Force cleanup of old resources
      this.performScheduledCleanup();
      
      // Clear old performance data
      this.clearOldPerformanceData();
      
      // Suggest garbage collection if available
      if (window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
          console.log('🧹 Manual garbage collection triggered');
        } catch (error) {
          console.warn('Failed to trigger manual garbage collection:', error);
        }
      }
      
      // Reset session tracking
      this.sessionStartTime = Date.now();
    }
  }

  /**
   * Clear old performance data to free memory
   */
  clearOldPerformanceData() {
    // This would be called by performance monitoring components
    // to clear old metrics data
    console.log('🧹 Clearing old performance data');
    
    this.triggerCallbacks('onPerformanceDataCleanup', {
      timestamp: Date.now(),
      reason: 'memory_optimization'
    });
  }

  /**
   * Monitor resource usage and provide automatic cleanup recommendations
   */
  monitorResourceUsage() {
    const usage = this.getMemoryUsageSummary();
    const recommendations = [];
    
    // Check blob URL usage
    if (usage.resources.blobUrls > 20) {
      recommendations.push({
        type: 'blob_cleanup',
        priority: 'medium',
        message: `${usage.resources.blobUrls} blob URLs active. Consider cleanup.`,
        action: () => this.cleanupOldBlobUrls()
      });
    }
    
    // Check event listener count
    if (usage.resources.eventListeners > 100) {
      recommendations.push({
        type: 'listener_cleanup',
        priority: 'medium',
        message: `${usage.resources.eventListeners} event listeners active. Check for leaks.`,
        action: () => this.cleanupOrphanedEventListeners()
      });
    }
    
    // Check memory pressure
    if (usage.pressure === 'high' || usage.pressure === 'critical') {
      recommendations.push({
        type: 'memory_pressure',
        priority: usage.pressure === 'critical' ? 'critical' : 'high',
        message: `Memory pressure is ${usage.pressure}. Immediate cleanup recommended.`,
        action: () => this.performAggressiveCleanup()
      });
    }
    
    // Check heap usage percentage
    if (usage.heap.usagePercentage > 80) {
      recommendations.push({
        type: 'heap_usage',
        priority: 'high',
        message: `Heap usage at ${usage.heap.usagePercentage}%. Consider reducing buffer sizes.`,
        action: () => this.triggerCallbacks('onBufferSizeReduction', { currentUsage: usage.heap.usagePercentage })
      });
    }
    
    return recommendations;
  }

  /**
   * Automatic cleanup of unused extraction results
   */
  cleanupExtractionResults() {
    // This would be integrated with the extraction service
    // to clean up old extraction results that are no longer needed
    const extractionCacheSize = this.resources.extractionCache?.size || 0;
    
    if (extractionCacheSize > 10) {
      console.log(`🧹 Cleaning up ${extractionCacheSize} old extraction results`);
      
      if (this.resources.extractionCache) {
        // Keep only the 5 most recent extraction results
        const entries = Array.from(this.resources.extractionCache.entries());
        const sortedEntries = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const toKeep = sortedEntries.slice(0, 5);
        
        this.resources.extractionCache.clear();
        toKeep.forEach(([key, value]) => {
          this.resources.extractionCache.set(key, value);
        });
        
        console.log(`🧹 Kept ${toKeep.length} recent extraction results, cleaned ${extractionCacheSize - toKeep.length}`);
        return extractionCacheSize - toKeep.length;
      }
    }
    
    return 0;
  }

  /**
   * Register extraction result for cleanup tracking
   */
  registerExtractionResult(key, result) {
    if (!this.resources.extractionCache) {
      this.resources.extractionCache = new Map();
    }
    
    this.resources.extractionCache.set(key, {
      ...result,
      timestamp: Date.now(),
      size: JSON.stringify(result).length
    });
    
    console.log(`🧠 Registered extraction result: ${key}`);
    
    // Trigger cleanup if cache is getting large
    if (this.resources.extractionCache.size > 15) {
      this.cleanupExtractionResults();
    }
  }

  /**
   * Enhanced resource monitoring with automatic cleanup
   */
  startResourceMonitoring() {
    if (this.resourceMonitoringInterval) return;
    
    console.log('🧠 Starting enhanced resource monitoring');
    
    // Monitor resources every 15 seconds
    this.resourceMonitoringInterval = setInterval(() => {
      const recommendations = this.monitorResourceUsage();
      
      if (recommendations.length > 0) {
        console.log(`🧠 Resource monitoring found ${recommendations.length} recommendations:`, recommendations);
        
        // Auto-apply medium priority recommendations
        recommendations
          .filter(r => r.priority === 'medium')
          .forEach(r => {
            try {
              r.action();
            } catch (error) {
              console.error('Failed to apply resource recommendation:', error);
            }
          });
        
        // Notify about high/critical priority recommendations
        const criticalRecommendations = recommendations.filter(r => r.priority === 'high' || r.priority === 'critical');
        if (criticalRecommendations.length > 0) {
          this.triggerCallbacks('onResourceRecommendations', criticalRecommendations);
        }
      }
      
      // Optimize garbage collection for long sessions
      this.optimizeGarbageCollection();
      
    }, 15000);
  }

  /**
   * Stop resource monitoring
   */
  stopResourceMonitoring() {
    if (this.resourceMonitoringInterval) {
      clearInterval(this.resourceMonitoringInterval);
      this.resourceMonitoringInterval = null;
      console.log('🧠 Stopped resource monitoring');
    }
  }

  /**
   * Enhanced start monitoring with resource monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    console.log('🧠 Memory Manager: Starting comprehensive memory monitoring');
    this.isMonitoring = true;
    this.sessionStartTime = Date.now();

    // Monitor memory usage every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryMetrics();
      this.checkMemoryPressure();
    }, 5000);

    // Perform cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performScheduledCleanup();
    }, this.thresholds.cleanupInterval);

    // Start enhanced resource monitoring
    this.startResourceMonitoring();

    // Initial memory check
    this.updateMemoryMetrics();
  }

  /**
   * Enhanced stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    console.log('🧠 Memory Manager: Stopping comprehensive memory monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Stop resource monitoring
    this.stopResourceMonitoring();
  }

  /**
   * Get comprehensive resource usage report
   */
  getResourceUsageReport() {
    const usage = this.getMemoryUsageSummary();
    const recommendations = this.monitorResourceUsage();
    
    return {
      ...usage,
      recommendations,
      sessionDuration: Date.now() - (this.sessionStartTime || Date.now()),
      extractionCacheSize: this.resources.extractionCache?.size || 0,
      lastCleanupAge: Date.now() - this.metrics.lastCleanup,
      isLongSession: (Date.now() - (this.sessionStartTime || Date.now())) > 30 * 60 * 1000
    };
  }

  /**
   * Destroy memory manager and clean up all resources
   */
  destroy() {
    console.log('🧠 Destroying Memory Manager');
    
    // Stop monitoring
    this.stopMonitoring();
    
    // Remove browser event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      
      if ('memory' in performance && 'removeEventListener' in performance.memory) {
        performance.memory.removeEventListener('memorypressure', this.handleMemoryPressure);
      }
    }
    
    // Perform complete cleanup
    this.performCompleteCleanup();
  }
}

export default MemoryManager;