/**
 * Performance Monitor for Media Playback System
 * Implements comprehensive performance monitoring and optimization features
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      bufferHealth: {
        currentLevel: 0,
        targetLevel: 30, // 30 seconds target buffer
        stalls: 0,
        stallDuration: 0,
        lastStallTime: 0,
        gapJumps: 0,
        bufferUnderruns: 0
      },
      networkConditions: {
        bandwidth: 0,
        latency: 0,
        packetLoss: 0,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        lastMeasurement: 0
      },
      segmentMetrics: {
        loadTimes: [],
        averageLoadTime: 0,
        failedSegments: 0,
        totalSegments: 0,
        retryCount: 0,
        timeoutCount: 0
      },
      qualityMetrics: {
        switches: 0,
        downgrades: 0,
        upgrades: 0,
        currentQuality: null,
        qualityHistory: [],
        adaptationScore: 100 // 0-100 score for adaptation efficiency
      },
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        bufferSize: 0,
        blobUrls: new Set(),
        eventListeners: 0,
        lastCleanup: 0
      },
      connectionOptimization: {
        cdnFailovers: 0,
        requestBatches: 0,
        keepAliveConnections: 0,
        compressionRatio: 0,
        cacheHitRate: 0
      }
    };

    this.thresholds = {
      bufferHealth: {
        critical: 5, // seconds
        warning: 15,
        optimal: 30
      },
      networkConditions: {
        slowConnection: 1000000, // 1 Mbps
        fastConnection: 5000000, // 5 Mbps
        highLatency: 200, // ms
        packetLossThreshold: 0.05 // 5%
      },
      segmentMetrics: {
        slowLoadTime: 3000, // ms
        fastLoadTime: 1000,
        maxRetries: 3,
        timeoutThreshold: 5000
      },
      memoryUsage: {
        heapWarning: 100 * 1024 * 1024, // 100MB
        heapCritical: 200 * 1024 * 1024, // 200MB
        maxBlobUrls: 50,
        cleanupInterval: 60000 // 1 minute
      }
    };

    this.callbacks = {
      onBufferHealthChange: [],
      onNetworkConditionChange: [],
      onQualityRecommendation: [],
      onMemoryWarning: [],
      onOptimizationApplied: []
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.networkMonitoringInterval = null;
    this.memoryMonitoringInterval = null;

    // Initialize network monitoring if available
    this.initializeNetworkMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    console.log('📊 Performance Monitor: Starting comprehensive monitoring');
    this.isMonitoring = true;

    // Main monitoring loop - every 1 second
    this.monitoringInterval = setInterval(() => {
      this.updateBufferHealth();
      this.updateSegmentMetrics();
      this.updateQualityMetrics();
      this.checkOptimizationOpportunities();
    }, 1000);

    // Network monitoring - every 5 seconds
    this.networkMonitoringInterval = setInterval(() => {
      this.updateNetworkConditions();
    }, 5000);

    // Memory monitoring - every 10 seconds
    this.memoryMonitoringInterval = setInterval(() => {
      this.updateMemoryUsage();
      this.performMemoryCleanup();
    }, 10000);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    console.log('📊 Performance Monitor: Stopping monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.networkMonitoringInterval) {
      clearInterval(this.networkMonitoringInterval);
      this.networkMonitoringInterval = null;
    }

    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
    }
  }

  /**
   * Initialize network monitoring using Network Information API
   */
  initializeNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        // Initial network state
        this.updateNetworkFromAPI(connection);

        // Listen for network changes
        connection.addEventListener('change', () => {
          this.updateNetworkFromAPI(connection);
          this.triggerCallbacks('onNetworkConditionChange', this.metrics.networkConditions);
        });
      }
    }
  }

  /**
   * Update network conditions from Network Information API
   */
  updateNetworkFromAPI(connection) {
    this.metrics.networkConditions = {
      ...this.metrics.networkConditions,
      connectionType: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      lastMeasurement: Date.now()
    };

    // Estimate bandwidth from effective type
    const bandwidthEstimates = {
      'slow-2g': 50000,    // 50 Kbps
      '2g': 250000,        // 250 Kbps
      '3g': 1500000,       // 1.5 Mbps
      '4g': 10000000       // 10 Mbps
    };

    this.metrics.networkConditions.bandwidth = bandwidthEstimates[connection.effectiveType] || 
                                               (connection.downlink * 1000000) || 0;
  }

  /**
   * Update buffer health monitoring
   */
  updateBufferHealth() {
    // This will be called from the HLS hook with actual buffer data
    const bufferHealth = this.metrics.bufferHealth;
    
    // Calculate buffer health score (0-100)
    let healthScore = 100;
    if (bufferHealth.currentLevel < this.thresholds.bufferHealth.critical) {
      healthScore = 0;
    } else if (bufferHealth.currentLevel < this.thresholds.bufferHealth.warning) {
      healthScore = 30;
    } else if (bufferHealth.currentLevel < this.thresholds.bufferHealth.optimal) {
      healthScore = 70;
    }

    bufferHealth.healthScore = healthScore;

    // Trigger callbacks if buffer health changed significantly
    if (Math.abs(bufferHealth.lastHealthScore - healthScore) > 20) {
      bufferHealth.lastHealthScore = healthScore;
      this.triggerCallbacks('onBufferHealthChange', bufferHealth);
    }
  }

  /**
   * Update segment loading metrics
   */
  updateSegmentMetrics() {
    const metrics = this.metrics.segmentMetrics;
    
    // Calculate average load time from recent segments
    if (metrics.loadTimes.length > 0) {
      metrics.averageLoadTime = metrics.loadTimes.reduce((a, b) => a + b, 0) / metrics.loadTimes.length;
    }

    // Calculate success rate
    metrics.successRate = metrics.totalSegments > 0 ? 
      ((metrics.totalSegments - metrics.failedSegments) / metrics.totalSegments) * 100 : 100;

    // Keep only recent load times (last 20 segments)
    if (metrics.loadTimes.length > 20) {
      metrics.loadTimes = metrics.loadTimes.slice(-20);
    }
  }

  /**
   * Update quality switching metrics
   */
  updateQualityMetrics() {
    const metrics = this.metrics.qualityMetrics;
    
    // Calculate adaptation efficiency score
    const recentSwitches = metrics.qualityHistory.slice(-10);
    if (recentSwitches.length > 1) {
      let oscillations = 0;
      for (let i = 1; i < recentSwitches.length - 1; i++) {
        const prev = recentSwitches[i - 1];
        const curr = recentSwitches[i];
        const next = recentSwitches[i + 1];
        
        // Detect oscillation (up then down or down then up)
        if ((prev.quality < curr.quality && curr.quality > next.quality) ||
            (prev.quality > curr.quality && curr.quality < next.quality)) {
          oscillations++;
        }
      }
      
      // Score based on oscillations (fewer is better)
      metrics.adaptationScore = Math.max(0, 100 - (oscillations * 20));
    }
  }

  /**
   * Update network conditions with bandwidth testing
   */
  updateNetworkConditions() {
    // Perform simple bandwidth test using a small image
    const startTime = performance.now();
    const testImage = new Image();
    
    testImage.onload = () => {
      const loadTime = performance.now() - startTime;
      const imageSize = 1024; // Assume 1KB test image
      const bandwidth = (imageSize * 8) / (loadTime / 1000); // bits per second
      
      this.metrics.networkConditions.bandwidth = bandwidth;
      this.metrics.networkConditions.latency = loadTime;
      this.metrics.networkConditions.lastMeasurement = Date.now();
    };

    testImage.onerror = () => {
      console.warn('📊 Network bandwidth test failed');
    };

    // Use a small test image (you might want to host this yourself)
    testImage.src = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?t=${Date.now()}`;
  }

  /**
   * Update memory usage monitoring
   */
  updateMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      this.metrics.memoryUsage.heapUsed = memory.usedJSHeapSize;
      this.metrics.memoryUsage.heapTotal = memory.totalJSHeapSize;
      
      // Check for memory warnings
      if (memory.usedJSHeapSize > this.thresholds.memoryUsage.heapWarning) {
        this.triggerCallbacks('onMemoryWarning', {
          level: memory.usedJSHeapSize > this.thresholds.memoryUsage.heapCritical ? 'critical' : 'warning',
          usage: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize
        });
      }
    }
  }

  /**
   * Perform automatic memory cleanup
   */
  performMemoryCleanup() {
    const now = Date.now();
    const timeSinceLastCleanup = now - this.metrics.memoryUsage.lastCleanup;
    
    if (timeSinceLastCleanup > this.thresholds.memoryUsage.cleanupInterval) {
      console.log('🧹 Performance Monitor: Performing memory cleanup');
      
      // Clean up old blob URLs
      let cleanedUrls = 0;
      this.metrics.memoryUsage.blobUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
          this.metrics.memoryUsage.blobUrls.delete(url);
          cleanedUrls++;
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      });
      
      // Force garbage collection if available (development only)
      if (window.gc && typeof window.gc === 'function') {
        window.gc();
      }
      
      this.metrics.memoryUsage.lastCleanup = now;
      console.log(`🧹 Memory cleanup completed: ${cleanedUrls} blob URLs cleaned`);
    }
  }

  /**
   * Check for optimization opportunities and apply them
   */
  checkOptimizationOpportunities() {
    const optimizations = [];

    // Buffer health optimization
    if (this.metrics.bufferHealth.healthScore < 50) {
      optimizations.push({
        type: 'buffer',
        action: 'increase_buffer_size',
        reason: 'Low buffer health detected',
        priority: 'high'
      });
    }

    // Network condition optimization
    if (this.metrics.networkConditions.bandwidth < this.thresholds.networkConditions.slowConnection) {
      optimizations.push({
        type: 'quality',
        action: 'reduce_quality',
        reason: 'Slow network connection detected',
        priority: 'high'
      });
    }

    // Segment loading optimization
    if (this.metrics.segmentMetrics.averageLoadTime > this.thresholds.segmentMetrics.slowLoadTime) {
      optimizations.push({
        type: 'cdn',
        action: 'try_alternative_cdn',
        reason: 'Slow segment loading detected',
        priority: 'medium'
      });
    }

    // Quality switching optimization
    if (this.metrics.qualityMetrics.adaptationScore < 60) {
      optimizations.push({
        type: 'adaptation',
        action: 'stabilize_quality',
        reason: 'Quality oscillation detected',
        priority: 'medium'
      });
    }

    // Apply optimizations
    optimizations.forEach(optimization => {
      this.applyOptimization(optimization);
    });
  }

  /**
   * Apply a specific optimization
   */
  applyOptimization(optimization) {
    console.log('⚡ Applying optimization:', optimization);
    
    switch (optimization.type) {
      case 'buffer':
        this.optimizeBufferSettings(optimization);
        break;
      case 'quality':
        this.optimizeQualitySettings(optimization);
        break;
      case 'cdn':
        this.optimizeCDNSettings(optimization);
        break;
      case 'adaptation':
        this.optimizeAdaptationSettings(optimization);
        break;
    }

    this.triggerCallbacks('onOptimizationApplied', optimization);
  }

  /**
   * Optimize buffer settings
   */
  optimizeBufferSettings(optimization) {
    // This will be implemented by the HLS hook
    console.log('📦 Buffer optimization requested:', optimization.action);
  }

  /**
   * Optimize quality settings
   */
  optimizeQualitySettings(optimization) {
    // This will be implemented by the HLS hook
    console.log('🎥 Quality optimization requested:', optimization.action);
  }

  /**
   * Optimize CDN settings
   */
  optimizeCDNSettings(optimization) {
    // This will be implemented by the stream proxy
    console.log('🌐 CDN optimization requested:', optimization.action);
    this.metrics.connectionOptimization.cdnFailovers++;
  }

  /**
   * Optimize adaptation settings
   */
  optimizeAdaptationSettings(optimization) {
    // This will be implemented by the HLS hook
    console.log('🔄 Adaptation optimization requested:', optimization.action);
  }

  /**
   * Record segment loading metrics
   */
  recordSegmentLoad(loadTime, success = true) {
    const metrics = this.metrics.segmentMetrics;
    
    if (success) {
      metrics.loadTimes.push(loadTime);
    } else {
      metrics.failedSegments++;
    }
    
    metrics.totalSegments++;
  }

  /**
   * Record quality switch
   */
  recordQualitySwitch(fromQuality, toQuality, reason = 'unknown') {
    const metrics = this.metrics.qualityMetrics;
    
    metrics.switches++;
    if (toQuality < fromQuality) {
      metrics.downgrades++;
    } else if (toQuality > fromQuality) {
      metrics.upgrades++;
    }

    metrics.currentQuality = toQuality;
    metrics.qualityHistory.push({
      quality: toQuality,
      timestamp: Date.now(),
      reason
    });

    // Keep only recent history
    if (metrics.qualityHistory.length > 50) {
      metrics.qualityHistory = metrics.qualityHistory.slice(-50);
    }
  }

  /**
   * Record buffer stall
   */
  recordBufferStall(duration = 0) {
    const metrics = this.metrics.bufferHealth;
    
    metrics.stalls++;
    metrics.stallDuration += duration;
    metrics.lastStallTime = Date.now();
  }

  /**
   * Update buffer level
   */
  updateBufferLevel(level) {
    this.metrics.bufferHealth.currentLevel = level;
  }

  /**
   * Register callback for performance events
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
   * Get current performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const metrics = this.metrics;
    
    return {
      overall: {
        score: this.calculateOverallScore(),
        status: this.getOverallStatus()
      },
      buffer: {
        health: metrics.bufferHealth.healthScore || 0,
        level: metrics.bufferHealth.currentLevel,
        stalls: metrics.bufferHealth.stalls
      },
      network: {
        bandwidth: Math.round(metrics.networkConditions.bandwidth / 1000000 * 100) / 100, // Mbps
        latency: metrics.networkConditions.latency,
        type: metrics.networkConditions.effectiveType
      },
      segments: {
        averageLoadTime: Math.round(metrics.segmentMetrics.averageLoadTime),
        successRate: Math.round(metrics.segmentMetrics.successRate || 0)
      },
      quality: {
        adaptationScore: metrics.qualityMetrics.adaptationScore,
        switches: metrics.qualityMetrics.switches,
        current: metrics.qualityMetrics.currentQuality
      },
      memory: {
        heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024), // MB
        blobUrls: metrics.memoryUsage.blobUrls.size
      }
    };
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallScore() {
    const metrics = this.metrics;
    let score = 0;
    let factors = 0;

    // Buffer health (30% weight)
    if (metrics.bufferHealth.healthScore !== undefined) {
      score += metrics.bufferHealth.healthScore * 0.3;
      factors += 0.3;
    }

    // Segment loading (25% weight)
    if (metrics.segmentMetrics.successRate !== undefined) {
      score += metrics.segmentMetrics.successRate * 0.25;
      factors += 0.25;
    }

    // Quality adaptation (25% weight)
    if (metrics.qualityMetrics.adaptationScore !== undefined) {
      score += metrics.qualityMetrics.adaptationScore * 0.25;
      factors += 0.25;
    }

    // Network conditions (20% weight)
    const networkScore = metrics.networkConditions.bandwidth > this.thresholds.networkConditions.fastConnection ? 100 :
                        metrics.networkConditions.bandwidth > this.thresholds.networkConditions.slowConnection ? 70 : 30;
    score += networkScore * 0.2;
    factors += 0.2;

    return factors > 0 ? Math.round(score / factors) : 0;
  }

  /**
   * Get overall performance status
   */
  getOverallStatus() {
    const score = this.calculateOverallScore();
    
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  /**
   * Export performance data for debugging
   */
  exportPerformanceData() {
    return {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      summary: this.getPerformanceSummary(),
      thresholds: this.thresholds
    };
  }
}

export default PerformanceMonitor;