/**
 * Network Condition Detector
 * Detects network conditions and provides dynamic streaming parameter recommendations
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

export class NetworkConditionDetector {
  constructor() {
    this.conditions = {
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      stability: 'stable', // stable, unstable, fluctuating
      trend: 'stable' // improving, degrading, stable
    };

    this.measurements = {
      bandwidthHistory: [],
      latencyHistory: [],
      packetLossHistory: [],
      measurementCount: 0,
      lastMeasurement: 0
    };

    this.recommendations = {
      bufferSize: 30, // seconds
      maxBufferLength: 60,
      segmentRetries: 3,
      qualityLevels: [],
      adaptationSpeed: 'normal', // slow, normal, fast
      prefetchSegments: 3
    };

    this.thresholds = {
      bandwidth: {
        excellent: 10000000, // 10 Mbps
        good: 5000000,       // 5 Mbps
        fair: 2000000,       // 2 Mbps
        poor: 1000000        // 1 Mbps
      },
      latency: {
        excellent: 50,   // ms
        good: 100,
        fair: 200,
        poor: 500
      },
      packetLoss: {
        excellent: 0.001, // 0.1%
        good: 0.01,       // 1%
        fair: 0.03,       // 3%
        poor: 0.05        // 5%
      },
      stability: {
        varianceThreshold: 0.3, // 30% variance
        trendThreshold: 0.2     // 20% trend change
      }
    };

    this.isDetecting = false;
    this.detectionInterval = null;
    this.callbacks = [];

    // Initialize with Network Information API if available
    this.initializeNetworkAPI();
  }

  /**
   * Initialize Network Information API monitoring
   */
  initializeNetworkAPI() {
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        this.updateFromNetworkAPI(connection);
        
        connection.addEventListener('change', () => {
          console.log('🌐 Network condition changed via API');
          this.updateFromNetworkAPI(connection);
          this.analyzeConditions();
          this.notifyCallbacks();
        });
      }
    }
  }

  /**
   * Update conditions from Network Information API
   */
  updateFromNetworkAPI(connection) {
    this.conditions.connectionType = connection.type || 'unknown';
    this.conditions.effectiveType = connection.effectiveType || 'unknown';
    
    // Convert downlink to bits per second
    if (connection.downlink) {
      this.conditions.bandwidth = connection.downlink * 1000000;
    }
    
    // Use RTT as latency estimate
    if (connection.rtt) {
      this.conditions.latency = connection.rtt;
    }

    console.log('🌐 Network API update:', {
      type: this.conditions.connectionType,
      effectiveType: this.conditions.effectiveType,
      bandwidth: Math.round(this.conditions.bandwidth / 1000000 * 100) / 100 + ' Mbps',
      latency: this.conditions.latency + 'ms'
    });
  }

  /**
   * Start network condition detection
   */
  startDetection() {
    if (this.isDetecting) return;

    console.log('🌐 Starting network condition detection');
    this.isDetecting = true;

    // Perform initial measurement
    this.performMeasurement();

    // Set up periodic measurements
    this.detectionInterval = setInterval(() => {
      this.performMeasurement();
    }, 10000); // Every 10 seconds
  }

  /**
   * Stop network condition detection
   */
  stopDetection() {
    if (!this.isDetecting) return;

    console.log('🌐 Stopping network condition detection');
    this.isDetecting = false;

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  /**
   * Perform network measurement
   */
  async performMeasurement() {
    const startTime = performance.now();
    
    try {
      // Bandwidth test using multiple small requests
      const bandwidthResult = await this.measureBandwidth();
      
      // Latency test using ping-like requests
      const latencyResult = await this.measureLatency();
      
      // Packet loss estimation
      const packetLossResult = await this.measurePacketLoss();

      // Update conditions
      this.updateConditions(bandwidthResult, latencyResult, packetLossResult);
      
      // Analyze and generate recommendations
      this.analyzeConditions();
      this.generateRecommendations();
      
      // Notify callbacks
      this.notifyCallbacks();

      const measurementTime = performance.now() - startTime;
      console.log(`🌐 Network measurement completed in ${Math.round(measurementTime)}ms`);

    } catch (error) {
      console.error('🌐 Network measurement failed:', error);
    }
  }

  /**
   * Measure bandwidth using multiple small requests
   */
  async measureBandwidth() {
    const testSizes = [1024, 2048, 4096]; // Different test sizes in bytes
    const results = [];

    for (const size of testSizes) {
      try {
        const startTime = performance.now();
        
        // Create a test request (you might want to use your own endpoint)
        const testData = new ArrayBuffer(size);
        const blob = new Blob([testData]);
        const url = URL.createObjectURL(blob);
        
        const response = await fetch(url);
        await response.arrayBuffer();
        
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000; // seconds
        const bandwidth = (size * 8) / duration; // bits per second
        
        results.push(bandwidth);
        URL.revokeObjectURL(url);
        
      } catch (error) {
        console.warn('Bandwidth test failed for size', size, error);
      }
    }

    // Return average bandwidth
    return results.length > 0 ? 
      results.reduce((a, b) => a + b, 0) / results.length : 
      this.conditions.bandwidth;
  }

  /**
   * Measure latency using timing requests
   */
  async measureLatency() {
    const measurements = [];
    const testCount = 3;

    for (let i = 0; i < testCount; i++) {
      try {
        const startTime = performance.now();
        
        // Use a small request to measure round-trip time
        await fetch('data:text/plain,ping', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
        
      } catch (error) {
        console.warn('Latency measurement failed:', error);
      }
    }

    // Return average latency
    return measurements.length > 0 ?
      measurements.reduce((a, b) => a + b, 0) / measurements.length :
      this.conditions.latency;
  }

  /**
   * Estimate packet loss using request success rate
   */
  async measurePacketLoss() {
    const testCount = 10;
    let successCount = 0;

    const promises = Array.from({ length: testCount }, async () => {
      try {
        await fetch('data:text/plain,test', { 
          method: 'HEAD',
          cache: 'no-cache',
          timeout: 5000
        });
        return true;
      } catch (error) {
        return false;
      }
    });

    const results = await Promise.allSettled(promises);
    successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    const packetLoss = 1 - (successCount / testCount);
    return Math.max(0, packetLoss);
  }

  /**
   * Update network conditions with new measurements
   */
  updateConditions(bandwidth, latency, packetLoss) {
    // Update current conditions
    this.conditions.bandwidth = bandwidth;
    this.conditions.latency = latency;
    this.conditions.packetLoss = packetLoss;

    // Add to history
    this.measurements.bandwidthHistory.push({
      value: bandwidth,
      timestamp: Date.now()
    });

    this.measurements.latencyHistory.push({
      value: latency,
      timestamp: Date.now()
    });

    this.measurements.packetLossHistory.push({
      value: packetLoss,
      timestamp: Date.now()
    });

    // Keep only recent measurements (last 20)
    if (this.measurements.bandwidthHistory.length > 20) {
      this.measurements.bandwidthHistory = this.measurements.bandwidthHistory.slice(-20);
    }
    if (this.measurements.latencyHistory.length > 20) {
      this.measurements.latencyHistory = this.measurements.latencyHistory.slice(-20);
    }
    if (this.measurements.packetLossHistory.length > 20) {
      this.measurements.packetLossHistory = this.measurements.packetLossHistory.slice(-20);
    }

    this.measurements.measurementCount++;
    this.measurements.lastMeasurement = Date.now();
  }

  /**
   * Analyze network conditions and determine stability/trends
   */
  analyzeConditions() {
    // Analyze bandwidth stability
    const bandwidthValues = this.measurements.bandwidthHistory.map(m => m.value);
    const bandwidthVariance = this.calculateVariance(bandwidthValues);
    const bandwidthMean = bandwidthValues.reduce((a, b) => a + b, 0) / bandwidthValues.length;
    const bandwidthCV = Math.sqrt(bandwidthVariance) / bandwidthMean; // Coefficient of variation

    // Analyze latency stability
    const latencyValues = this.measurements.latencyHistory.map(m => m.value);
    const latencyVariance = this.calculateVariance(latencyValues);
    const latencyMean = latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length;
    const latencyCV = Math.sqrt(latencyVariance) / latencyMean;

    // Determine stability
    if (bandwidthCV > this.thresholds.stability.varianceThreshold || 
        latencyCV > this.thresholds.stability.varianceThreshold) {
      this.conditions.stability = 'unstable';
    } else if (bandwidthCV > this.thresholds.stability.varianceThreshold / 2) {
      this.conditions.stability = 'fluctuating';
    } else {
      this.conditions.stability = 'stable';
    }

    // Determine trend
    if (bandwidthValues.length >= 5) {
      const recentBandwidth = bandwidthValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderBandwidth = bandwidthValues.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      const bandwidthChange = (recentBandwidth - olderBandwidth) / olderBandwidth;

      if (bandwidthChange > this.thresholds.stability.trendThreshold) {
        this.conditions.trend = 'improving';
      } else if (bandwidthChange < -this.thresholds.stability.trendThreshold) {
        this.conditions.trend = 'degrading';
      } else {
        this.conditions.trend = 'stable';
      }
    }

    console.log('🌐 Network analysis:', {
      bandwidth: Math.round(this.conditions.bandwidth / 1000000 * 100) / 100 + ' Mbps',
      latency: Math.round(this.conditions.latency) + 'ms',
      packetLoss: Math.round(this.conditions.packetLoss * 10000) / 100 + '%',
      stability: this.conditions.stability,
      trend: this.conditions.trend
    });
  }

  /**
   * Calculate variance of an array of numbers
   */
  calculateVariance(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Generate streaming recommendations based on network conditions
   */
  generateRecommendations() {
    const bandwidth = this.conditions.bandwidth;
    const latency = this.conditions.latency;
    const packetLoss = this.conditions.packetLoss;
    const stability = this.conditions.stability;

    // Buffer size recommendations
    if (stability === 'unstable' || packetLoss > this.thresholds.packetLoss.fair) {
      this.recommendations.bufferSize = 60; // Larger buffer for unstable connections
      this.recommendations.maxBufferLength = 120;
    } else if (bandwidth > this.thresholds.bandwidth.good) {
      this.recommendations.bufferSize = 20; // Smaller buffer for good connections
      this.recommendations.maxBufferLength = 40;
    } else {
      this.recommendations.bufferSize = 30; // Default buffer
      this.recommendations.maxBufferLength = 60;
    }

    // Retry recommendations
    if (packetLoss > this.thresholds.packetLoss.poor) {
      this.recommendations.segmentRetries = 5; // More retries for lossy connections
    } else if (packetLoss > this.thresholds.packetLoss.fair) {
      this.recommendations.segmentRetries = 3;
    } else {
      this.recommendations.segmentRetries = 1; // Fewer retries for good connections
    }

    // Quality level recommendations
    this.recommendations.qualityLevels = this.getRecommendedQualityLevels(bandwidth);

    // Adaptation speed recommendations
    if (stability === 'unstable') {
      this.recommendations.adaptationSpeed = 'slow'; // Slower adaptation for unstable connections
    } else if (stability === 'stable' && bandwidth > this.thresholds.bandwidth.good) {
      this.recommendations.adaptationSpeed = 'fast'; // Faster adaptation for stable, good connections
    } else {
      this.recommendations.adaptationSpeed = 'normal';
    }

    // Prefetch recommendations
    if (bandwidth > this.thresholds.bandwidth.excellent && stability === 'stable') {
      this.recommendations.prefetchSegments = 5; // More prefetching for excellent connections
    } else if (bandwidth < this.thresholds.bandwidth.fair || stability === 'unstable') {
      this.recommendations.prefetchSegments = 1; // Less prefetching for poor/unstable connections
    } else {
      this.recommendations.prefetchSegments = 3; // Default prefetching
    }

    console.log('🌐 Generated recommendations:', this.recommendations);
  }

  /**
   * Get recommended quality levels based on bandwidth
   */
  getRecommendedQualityLevels(bandwidth) {
    const mbps = bandwidth / 1000000;
    
    if (mbps >= 25) {
      return ['4K', '1080p', '720p', '480p'];
    } else if (mbps >= 10) {
      return ['1080p', '720p', '480p', '360p'];
    } else if (mbps >= 5) {
      return ['720p', '480p', '360p'];
    } else if (mbps >= 2) {
      return ['480p', '360p', '240p'];
    } else {
      return ['360p', '240p'];
    }
  }

  /**
   * Get network condition classification
   */
  getNetworkClass() {
    const bandwidth = this.conditions.bandwidth;
    const latency = this.conditions.latency;
    const packetLoss = this.conditions.packetLoss;

    // Determine overall network class
    let bandwidthClass = 'poor';
    let latencyClass = 'poor';
    let packetLossClass = 'poor';

    // Classify bandwidth
    if (bandwidth >= this.thresholds.bandwidth.excellent) bandwidthClass = 'excellent';
    else if (bandwidth >= this.thresholds.bandwidth.good) bandwidthClass = 'good';
    else if (bandwidth >= this.thresholds.bandwidth.fair) bandwidthClass = 'fair';

    // Classify latency
    if (latency <= this.thresholds.latency.excellent) latencyClass = 'excellent';
    else if (latency <= this.thresholds.latency.good) latencyClass = 'good';
    else if (latency <= this.thresholds.latency.fair) latencyClass = 'fair';

    // Classify packet loss
    if (packetLoss <= this.thresholds.packetLoss.excellent) packetLossClass = 'excellent';
    else if (packetLoss <= this.thresholds.packetLoss.good) packetLossClass = 'good';
    else if (packetLoss <= this.thresholds.packetLoss.fair) packetLossClass = 'fair';

    // Overall classification (worst of the three)
    const classes = ['excellent', 'good', 'fair', 'poor'];
    const bandwidthIndex = classes.indexOf(bandwidthClass);
    const latencyIndex = classes.indexOf(latencyClass);
    const packetLossIndex = classes.indexOf(packetLossClass);
    
    const overallIndex = Math.max(bandwidthIndex, latencyIndex, packetLossIndex);
    return classes[overallIndex];
  }

  /**
   * Register callback for network condition changes
   */
  onConditionChange(callback) {
    this.callbacks.push(callback);
  }

  /**
   * Unregister callback
   */
  offConditionChange(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Notify all callbacks of condition changes
   */
  notifyCallbacks() {
    const data = {
      conditions: { ...this.conditions },
      recommendations: { ...this.recommendations },
      networkClass: this.getNetworkClass()
    };

    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in network condition callback:', error);
      }
    });
  }

  /**
   * Get current network conditions
   */
  getConditions() {
    return {
      conditions: { ...this.conditions },
      recommendations: { ...this.recommendations },
      networkClass: this.getNetworkClass(),
      measurements: {
        count: this.measurements.measurementCount,
        lastMeasurement: this.measurements.lastMeasurement
      }
    };
  }

  /**
   * Force immediate measurement
   */
  async measureNow() {
    console.log('🌐 Performing immediate network measurement');
    await this.performMeasurement();
    return this.getConditions();
  }

  /**
   * Get streaming parameters for current conditions
   */
  getStreamingParameters() {
    return {
      bufferSize: this.recommendations.bufferSize,
      maxBufferLength: this.recommendations.maxBufferLength,
      segmentRetries: this.recommendations.segmentRetries,
      adaptationSpeed: this.recommendations.adaptationSpeed,
      prefetchSegments: this.recommendations.prefetchSegments,
      qualityLevels: this.recommendations.qualityLevels,
      networkClass: this.getNetworkClass(),
      stability: this.conditions.stability,
      trend: this.conditions.trend
    };
  }
}

export default NetworkConditionDetector;