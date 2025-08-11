/**
 * Performance Monitoring Hook
 * Integrates all performance monitoring and optimization components
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import PerformanceMonitor from '../utils/performance/PerformanceMonitor';
import NetworkConditionDetector from '../utils/performance/NetworkConditionDetector';
import MemoryManager from '../utils/performance/MemoryManager';
import ConnectionOptimizer from '../utils/performance/ConnectionOptimizer';

export const usePerformanceMonitoring = (options = {}) => {
  const {
    enableBufferMonitoring = true,
    enableNetworkDetection = true,
    enableMemoryManagement = true,
    enableConnectionOptimization = true,
    autoStart = true
  } = options;

  // Performance monitoring instances
  const performanceMonitorRef = useRef(null);
  const networkDetectorRef = useRef(null);
  const memoryManagerRef = useRef(null);
  const connectionOptimizerRef = useRef(null);

  // State for performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    overall: { score: 0, status: 'unknown' },
    buffer: { health: 0, level: 0, stalls: 0 },
    network: { bandwidth: 0, latency: 0, type: 'unknown' },
    segments: { averageLoadTime: 0, successRate: 0 },
    quality: { adaptationScore: 0, switches: 0, current: null },
    memory: { heapUsed: 0, blobUrls: 0 }
  });

  const [networkConditions, setNetworkConditions] = useState({
    conditions: {
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      stability: 'unknown',
      trend: 'unknown'
    },
    recommendations: {
      bufferSize: 30,
      maxBufferLength: 60,
      segmentRetries: 3,
      adaptationSpeed: 'normal'
    },
    networkClass: 'unknown'
  });

  const [memoryStatus, setMemoryStatus] = useState({
    heap: { used: 0, total: 0, usagePercentage: 0 },
    resources: { blobUrls: 0, eventListeners: 0 },
    pressure: 'low'
  });

  const [connectionStatus, setConnectionStatus] = useState({
    cdnStatus: { current: null, failovers: 0 },
    metrics: { successRate: 0, averageLatency: 0 }
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [optimizations, setOptimizations] = useState([]);

  // Initialize performance monitoring components
  useEffect(() => {
    if (enableBufferMonitoring && !performanceMonitorRef.current) {
      performanceMonitorRef.current = new PerformanceMonitor();
      
      // Set up callbacks
      performanceMonitorRef.current.on('onBufferHealthChange', (data) => {
        setPerformanceMetrics(prev => ({
          ...prev,
          buffer: {
            health: data.healthScore || 0,
            level: data.currentLevel || 0,
            stalls: data.stalls || 0
          }
        }));
      });

      performanceMonitorRef.current.on('onOptimizationApplied', (optimization) => {
        setOptimizations(prev => [...prev.slice(-9), {
          ...optimization,
          timestamp: Date.now()
        }]);
      });
    }

    if (enableNetworkDetection && !networkDetectorRef.current) {
      networkDetectorRef.current = new NetworkConditionDetector();
      
      networkDetectorRef.current.onConditionChange((data) => {
        setNetworkConditions(data);
        
        // Update performance metrics
        setPerformanceMetrics(prev => ({
          ...prev,
          network: {
            bandwidth: Math.round(data.conditions.bandwidth / 1000000 * 100) / 100,
            latency: data.conditions.latency,
            type: data.conditions.effectiveType
          }
        }));
      });
    }

    if (enableMemoryManagement && !memoryManagerRef.current) {
      memoryManagerRef.current = new MemoryManager();
      
      memoryManagerRef.current.on('onMemoryWarning', (data) => {
        console.warn('🧠 Memory warning:', data);
      });

      memoryManagerRef.current.on('onMemoryPressure', (data) => {
        setMemoryStatus(prev => ({
          ...prev,
          pressure: data.level
        }));
      });
    }

    if (enableConnectionOptimization && !connectionOptimizerRef.current) {
      connectionOptimizerRef.current = new ConnectionOptimizer();
      
      connectionOptimizerRef.current.on('onCdnFailover', (data) => {
        console.log('🌐 CDN failover:', data);
        updateConnectionStatus();
      });
    }

    return () => {
      // Cleanup will be handled in the main cleanup effect
    };
  }, [enableBufferMonitoring, enableNetworkDetection, enableMemoryManagement, enableConnectionOptimization]);

  // Start monitoring when components are ready
  useEffect(() => {
    if (autoStart && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [autoStart]);

  // Update performance metrics periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const updateInterval = setInterval(() => {
      updatePerformanceMetrics();
      updateMemoryStatus();
      updateConnectionStatus();
    }, 2000); // Update every 2 seconds

    return () => clearInterval(updateInterval);
  }, [isMonitoring]);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    console.log('📊 Starting comprehensive performance monitoring');
    setIsMonitoring(true);

    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.startMonitoring();
    }

    if (networkDetectorRef.current) {
      networkDetectorRef.current.startDetection();
    }

    if (memoryManagerRef.current) {
      memoryManagerRef.current.startMonitoring();
    }
  }, [isMonitoring]);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    console.log('📊 Stopping performance monitoring');
    setIsMonitoring(false);

    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.stopMonitoring();
    }

    if (networkDetectorRef.current) {
      networkDetectorRef.current.stopDetection();
    }

    if (memoryManagerRef.current) {
      memoryManagerRef.current.stopMonitoring();
    }
  }, [isMonitoring]);

  /**
   * Update performance metrics
   */
  const updatePerformanceMetrics = useCallback(() => {
    if (performanceMonitorRef.current) {
      const summary = performanceMonitorRef.current.getPerformanceSummary();
      setPerformanceMetrics(summary);
    }
  }, []);

  /**
   * Update memory status
   */
  const updateMemoryStatus = useCallback(() => {
    if (memoryManagerRef.current) {
      const summary = memoryManagerRef.current.getMemoryUsageSummary();
      setMemoryStatus(summary);
    }
  }, []);

  /**
   * Update connection status
   */
  const updateConnectionStatus = useCallback(() => {
    if (connectionOptimizerRef.current) {
      const cdnStatus = connectionOptimizerRef.current.getCdnStatus();
      const metrics = connectionOptimizerRef.current.getMetrics();
      
      setConnectionStatus({
        cdnStatus,
        metrics
      });
    }
  }, []);

  /**
   * Record segment loading metrics
   */
  const recordSegmentLoad = useCallback((loadTime, success = true) => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.recordSegmentLoad(loadTime, success);
    }
  }, []);

  /**
   * Record quality switch
   */
  const recordQualitySwitch = useCallback((fromQuality, toQuality, reason = 'unknown') => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.recordQualitySwitch(fromQuality, toQuality, reason);
    }
  }, []);

  /**
   * Record buffer stall
   */
  const recordBufferStall = useCallback((duration = 0) => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.recordBufferStall(duration);
    }
  }, []);

  /**
   * Update buffer level
   */
  const updateBufferLevel = useCallback((level) => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.updateBufferLevel(level);
    }
  }, []);

  /**
   * Optimize request using connection optimizer
   */
  const optimizeRequest = useCallback(async (url, options = {}) => {
    if (connectionOptimizerRef.current) {
      return await connectionOptimizerRef.current.optimizeRequest(url, options);
    }
    
    // Fallback to regular fetch
    return fetch(url, options);
  }, []);

  /**
   * Register blob URL for memory management
   */
  const registerBlobUrl = useCallback((url, metadata = {}) => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.registerBlobUrl(url, metadata);
    }
  }, []);

  /**
   * Unregister blob URL
   */
  const unregisterBlobUrl = useCallback((url) => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.unregisterBlobUrl(url);
    }
  }, []);

  /**
   * Register HLS instance for memory management
   */
  const registerHlsInstance = useCallback((hls) => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.registerHlsInstance(hls);
    }
  }, []);

  /**
   * Unregister HLS instance
   */
  const unregisterHlsInstance = useCallback((hls) => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.unregisterHlsInstance(hls);
    }
  }, []);

  /**
   * Register video element for memory management
   */
  const registerVideoElement = useCallback((video) => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.registerVideoElement(video);
    }
  }, []);

  /**
   * Unregister video element
   */
  const unregisterVideoElement = useCallback((video) => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.unregisterVideoElement(video);
    }
  }, []);

  /**
   * Get streaming parameters based on current network conditions
   */
  const getStreamingParameters = useCallback(() => {
    if (networkDetectorRef.current) {
      return networkDetectorRef.current.getStreamingParameters();
    }
    
    // Default parameters
    return {
      bufferSize: 30,
      maxBufferLength: 60,
      segmentRetries: 3,
      adaptationSpeed: 'normal',
      prefetchSegments: 3,
      qualityLevels: ['1080p', '720p', '480p'],
      networkClass: 'unknown'
    };
  }, []);

  /**
   * Force memory cleanup
   */
  const forceMemoryCleanup = useCallback((aggressive = false) => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.forceCleanup(aggressive);
    }
  }, []);

  /**
   * Measure network conditions immediately
   */
  const measureNetworkNow = useCallback(async () => {
    if (networkDetectorRef.current) {
      return await networkDetectorRef.current.measureNow();
    }
    return null;
  }, []);

  /**
   * Export performance data for debugging
   */
  const exportPerformanceData = useCallback(() => {
    const data = {
      timestamp: Date.now(),
      performanceMetrics,
      networkConditions,
      memoryStatus,
      connectionStatus,
      optimizations
    };

    if (performanceMonitorRef.current) {
      data.detailedMetrics = performanceMonitorRef.current.exportPerformanceData();
    }

    return data;
  }, [performanceMetrics, networkConditions, memoryStatus, connectionStatus, optimizations]);

  /**
   * Get performance recommendations
   */
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations = [];

    // Buffer health recommendations
    if (performanceMetrics.buffer.health < 50) {
      recommendations.push({
        type: 'buffer',
        priority: 'high',
        message: 'Buffer health is low. Consider increasing buffer size.',
        action: 'increase_buffer'
      });
    }

    // Network condition recommendations
    if (networkConditions.networkClass === 'poor') {
      recommendations.push({
        type: 'network',
        priority: 'high',
        message: 'Poor network conditions detected. Consider reducing quality.',
        action: 'reduce_quality'
      });
    }

    // Memory pressure recommendations
    if (memoryStatus.pressure === 'high' || memoryStatus.pressure === 'critical') {
      recommendations.push({
        type: 'memory',
        priority: memoryStatus.pressure === 'critical' ? 'critical' : 'high',
        message: 'High memory usage detected. Consider cleaning up resources.',
        action: 'cleanup_memory'
      });
    }

    // Quality adaptation recommendations
    if (performanceMetrics.quality.adaptationScore < 60) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: 'Quality switching is unstable. Consider stabilizing adaptation.',
        action: 'stabilize_quality'
      });
    }

    return recommendations;
  }, [performanceMetrics, networkConditions, memoryStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.stopMonitoring();
      }
      
      if (networkDetectorRef.current) {
        networkDetectorRef.current.stopDetection();
      }
      
      if (memoryManagerRef.current && typeof memoryManagerRef.current.destroy === 'function') {
        memoryManagerRef.current.destroy();
      }
      
      if (connectionOptimizerRef.current && typeof connectionOptimizerRef.current.destroy === 'function') {
        connectionOptimizerRef.current.destroy();
      }
    };
  }, []);

  return {
    // State
    isMonitoring,
    performanceMetrics,
    networkConditions,
    memoryStatus,
    connectionStatus,
    optimizations,

    // Control functions
    startMonitoring,
    stopMonitoring,

    // Recording functions
    recordSegmentLoad,
    recordQualitySwitch,
    recordBufferStall,
    updateBufferLevel,

    // Optimization functions
    optimizeRequest,
    getStreamingParameters,

    // Memory management functions
    registerBlobUrl,
    unregisterBlobUrl,
    registerHlsInstance,
    unregisterHlsInstance,
    registerVideoElement,
    unregisterVideoElement,
    forceMemoryCleanup,

    // Network functions
    measureNetworkNow,

    // Utility functions
    exportPerformanceData,
    getPerformanceRecommendations
  };
};

export default usePerformanceMonitoring;