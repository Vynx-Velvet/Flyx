/**
 * Tests for Performance Monitor
 * Validates comprehensive performance monitoring and optimization features
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2
 */

import { PerformanceMonitor } from '../PerformanceMonitor';
import { NetworkConditionDetector } from '../NetworkConditionDetector';
import { MemoryManager } from '../MemoryManager';
import { ConnectionOptimizer } from '../ConnectionOptimizer';

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
};

// Mock navigator
global.navigator = {
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// Mock fetch
global.fetch = jest.fn();

describe('PerformanceMonitor', () => {
  let performanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (performanceMonitor) {
      performanceMonitor.stopMonitoring();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default metrics', () => {
      expect(performanceMonitor.metrics).toBeDefined();
      expect(performanceMonitor.metrics.bufferHealth).toBeDefined();
      expect(performanceMonitor.metrics.networkConditions).toBeDefined();
      expect(performanceMonitor.metrics.segmentMetrics).toBeDefined();
      expect(performanceMonitor.metrics.qualityMetrics).toBeDefined();
      expect(performanceMonitor.metrics.memoryUsage).toBeDefined();
      expect(performanceMonitor.metrics.connectionOptimization).toBeDefined();
    });

    test('should initialize with default thresholds', () => {
      expect(performanceMonitor.thresholds).toBeDefined();
      expect(performanceMonitor.thresholds.bufferHealth.critical).toBe(5);
      expect(performanceMonitor.thresholds.bufferHealth.warning).toBe(15);
      expect(performanceMonitor.thresholds.bufferHealth.optimal).toBe(30);
    });
  });

  describe('Buffer Health Monitoring', () => {
    test('should update buffer level', () => {
      const bufferLevel = 25;
      performanceMonitor.updateBufferLevel(bufferLevel);
      
      expect(performanceMonitor.metrics.bufferHealth.currentLevel).toBe(bufferLevel);
    });

    test('should record buffer stall', () => {
      const stallDuration = 2000;
      performanceMonitor.recordBufferStall(stallDuration);
      
      expect(performanceMonitor.metrics.bufferHealth.stalls).toBe(1);
      expect(performanceMonitor.metrics.bufferHealth.stallDuration).toBe(stallDuration);
    });

    test('should calculate buffer health score', () => {
      performanceMonitor.updateBufferLevel(35); // Above optimal
      performanceMonitor.updateBufferHealth();
      
      expect(performanceMonitor.metrics.bufferHealth.healthScore).toBe(100);
    });

    test('should trigger callback on buffer health change', (done) => {
      performanceMonitor.on('onBufferHealthChange', (data) => {
        expect(data.healthScore).toBeDefined();
        done();
      });

      performanceMonitor.updateBufferLevel(5); // Critical level
      performanceMonitor.updateBufferHealth();
    });
  });

  describe('Segment Metrics Tracking', () => {
    test('should record successful segment load', () => {
      const loadTime = 1500;
      performanceMonitor.recordSegmentLoad(loadTime, true);
      
      expect(performanceMonitor.metrics.segmentMetrics.loadTimes).toContain(loadTime);
      expect(performanceMonitor.metrics.segmentMetrics.totalSegments).toBe(1);
    });

    test('should record failed segment load', () => {
      performanceMonitor.recordSegmentLoad(0, false);
      
      expect(performanceMonitor.metrics.segmentMetrics.failedSegments).toBe(1);
      expect(performanceMonitor.metrics.segmentMetrics.totalSegments).toBe(1);
    });

    test('should calculate average load time', () => {
      performanceMonitor.recordSegmentLoad(1000, true);
      performanceMonitor.recordSegmentLoad(2000, true);
      performanceMonitor.updateSegmentMetrics();
      
      expect(performanceMonitor.metrics.segmentMetrics.averageLoadTime).toBe(1500);
    });

    test('should calculate success rate', () => {
      performanceMonitor.recordSegmentLoad(1000, true);
      performanceMonitor.recordSegmentLoad(0, false);
      performanceMonitor.updateSegmentMetrics();
      
      expect(performanceMonitor.metrics.segmentMetrics.successRate).toBe(50);
    });
  });

  describe('Quality Metrics Tracking', () => {
    test('should record quality switch', () => {
      performanceMonitor.recordQualitySwitch(1080, 720, 'network_conditions');
      
      expect(performanceMonitor.metrics.qualityMetrics.switches).toBe(1);
      expect(performanceMonitor.metrics.qualityMetrics.downgrades).toBe(1);
      expect(performanceMonitor.metrics.qualityMetrics.currentQuality).toBe(720);
    });

    test('should record quality upgrade', () => {
      performanceMonitor.recordQualitySwitch(720, 1080, 'improved_conditions');
      
      expect(performanceMonitor.metrics.qualityMetrics.switches).toBe(1);
      expect(performanceMonitor.metrics.qualityMetrics.upgrades).toBe(1);
    });

    test('should track quality history', () => {
      performanceMonitor.recordQualitySwitch(1080, 720, 'test');
      
      expect(performanceMonitor.metrics.qualityMetrics.qualityHistory).toHaveLength(1);
      expect(performanceMonitor.metrics.qualityMetrics.qualityHistory[0].quality).toBe(720);
      expect(performanceMonitor.metrics.qualityMetrics.qualityHistory[0].reason).toBe('test');
    });

    test('should calculate adaptation score', () => {
      // Create oscillating pattern
      performanceMonitor.recordQualitySwitch(1080, 720, 'test');
      performanceMonitor.recordQualitySwitch(720, 1080, 'test');
      performanceMonitor.recordQualitySwitch(1080, 720, 'test');
      performanceMonitor.updateQualityMetrics();
      
      expect(performanceMonitor.metrics.qualityMetrics.adaptationScore).toBeLessThan(100);
    });
  });

  describe('Memory Usage Monitoring', () => {
    test('should update memory metrics', () => {
      performanceMonitor.updateMemoryUsage();
      
      expect(performanceMonitor.metrics.memoryUsage.heapUsed).toBe(50 * 1024 * 1024);
      expect(performanceMonitor.metrics.memoryUsage.heapTotal).toBe(100 * 1024 * 1024);
    });
  });

  describe('Network Conditions', () => {
    test('should initialize network monitoring', () => {
      expect(performanceMonitor.metrics.networkConditions.connectionType).toBe('wifi');
      expect(performanceMonitor.metrics.networkConditions.effectiveType).toBe('4g');
    });

    test('should estimate bandwidth from effective type', () => {
      expect(performanceMonitor.metrics.networkConditions.bandwidth).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimization', () => {
    test('should detect optimization opportunities', () => {
      // Set up conditions that require optimization
      performanceMonitor.updateBufferLevel(3); // Critical buffer
      performanceMonitor.updateBufferHealth();
      
      const spy = jest.spyOn(performanceMonitor, 'applyOptimization');
      performanceMonitor.checkOptimizationOpportunities();
      
      expect(spy).toHaveBeenCalled();
    });

    test('should trigger optimization callbacks', (done) => {
      performanceMonitor.on('onOptimizationApplied', (optimization) => {
        expect(optimization.type).toBeDefined();
        expect(optimization.action).toBeDefined();
        done();
      });

      performanceMonitor.applyOptimization({
        type: 'buffer',
        action: 'increase_buffer_size',
        reason: 'test',
        priority: 'high'
      });
    });
  });

  describe('Performance Summary', () => {
    test('should generate performance summary', () => {
      performanceMonitor.updateBufferLevel(25);
      performanceMonitor.recordSegmentLoad(1000, true);
      performanceMonitor.recordQualitySwitch(1080, 720, 'test');
      
      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary.overall).toBeDefined();
      expect(summary.buffer).toBeDefined();
      expect(summary.network).toBeDefined();
      expect(summary.segments).toBeDefined();
      expect(summary.quality).toBeDefined();
      expect(summary.memory).toBeDefined();
    });

    test('should calculate overall performance score', () => {
      performanceMonitor.updateBufferLevel(35); // Good buffer
      performanceMonitor.recordSegmentLoad(1000, true); // Good segment load
      performanceMonitor.updateBufferHealth();
      performanceMonitor.updateSegmentMetrics();
      
      const score = performanceMonitor.calculateOverallScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should determine overall status', () => {
      const status = performanceMonitor.getOverallStatus();
      expect(['excellent', 'good', 'fair', 'poor']).toContain(status);
    });
  });

  describe('Monitoring Control', () => {
    test('should start monitoring', () => {
      performanceMonitor.startMonitoring();
      expect(performanceMonitor.isMonitoring).toBe(true);
    });

    test('should stop monitoring', () => {
      performanceMonitor.startMonitoring();
      performanceMonitor.stopMonitoring();
      expect(performanceMonitor.isMonitoring).toBe(false);
    });
  });

  describe('Data Export', () => {
    test('should export performance data', () => {
      const data = performanceMonitor.exportPerformanceData();
      
      expect(data.timestamp).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.thresholds).toBeDefined();
    });
  });
});

describe('NetworkConditionDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new NetworkConditionDetector();
  });

  afterEach(() => {
    if (detector) {
      detector.stopDetection();
    }
  });

  test('should initialize with default conditions', () => {
    expect(detector.conditions).toBeDefined();
    expect(detector.recommendations).toBeDefined();
    expect(detector.thresholds).toBeDefined();
  });

  test('should start and stop detection', () => {
    detector.startDetection();
    expect(detector.isDetecting).toBe(true);
    
    detector.stopDetection();
    expect(detector.isDetecting).toBe(false);
  });

  test('should generate streaming recommendations', () => {
    detector.conditions.bandwidth = 5000000; // 5 Mbps
    detector.conditions.latency = 100;
    detector.conditions.packetLoss = 0.01;
    detector.generateRecommendations();
    
    expect(detector.recommendations.bufferSize).toBeGreaterThan(0);
    expect(detector.recommendations.segmentRetries).toBeGreaterThan(0);
  });

  test('should classify network conditions', () => {
    detector.conditions.bandwidth = 10000000; // 10 Mbps
    detector.conditions.latency = 50;
    detector.conditions.packetLoss = 0.001;
    
    const networkClass = detector.getNetworkClass();
    expect(['excellent', 'good', 'fair', 'poor']).toContain(networkClass);
  });
});

describe('MemoryManager', () => {
  let memoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager();
  });

  afterEach(() => {
    if (memoryManager) {
      memoryManager.destroy();
    }
  });

  test('should register and unregister blob URLs', () => {
    const testUrl = 'blob:test-url';
    memoryManager.registerBlobUrl(testUrl, { size: 1024, type: 'video' });
    
    expect(memoryManager.resources.blobUrls.has(testUrl)).toBe(true);
    
    memoryManager.unregisterBlobUrl(testUrl);
    expect(memoryManager.resources.blobUrls.has(testUrl)).toBe(false);
  });

  test('should track memory usage', () => {
    memoryManager.updateMemoryMetrics();
    
    expect(memoryManager.metrics.heapUsed).toBe(50 * 1024 * 1024);
    expect(memoryManager.metrics.totalBlobUrls).toBe(0);
  });

  test('should perform cleanup', () => {
    const testUrl = 'blob:test-url';
    memoryManager.registerBlobUrl(testUrl);
    
    memoryManager.performScheduledCleanup();
    // Cleanup behavior depends on age and access patterns
  });

  test('should detect memory pressure', () => {
    // Mock high memory usage
    global.performance.memory.usedJSHeapSize = 180 * 1024 * 1024; // 180MB
    
    memoryManager.checkMemoryPressure();
    expect(['low', 'medium', 'high', 'critical']).toContain(memoryManager.metrics.memoryPressure);
  });
});

describe('ConnectionOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new ConnectionOptimizer();
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    });
  });

  afterEach(() => {
    if (optimizer) {
      optimizer.destroy();
    }
  });

  test('should initialize with default settings', () => {
    expect(optimizer.cdnEndpoints).toBeDefined();
    expect(optimizer.requestBatching).toBeDefined();
    expect(optimizer.connectionPool).toBeDefined();
    expect(optimizer.optimization).toBeDefined();
  });

  test('should add and remove CDN endpoints', () => {
    const testEndpoint = 'https://test-cdn.example.com';
    optimizer.addCdnEndpoint(testEndpoint, true);
    
    expect(optimizer.cdnEndpoints.primary).toContain(testEndpoint);
    
    optimizer.removeCdnEndpoint(testEndpoint);
    expect(optimizer.cdnEndpoints.primary).not.toContain(testEndpoint);
  });

  test('should optimize requests', async () => {
    const testUrl = 'https://example.com/test';
    const response = await optimizer.optimizeRequest(testUrl);
    
    expect(response).toBeDefined();
    expect(optimizer.metrics.totalRequests).toBe(1);
  });

  test('should handle CDN failover', async () => {
    const failedEndpoint = 'https://failed-cdn.example.com';
    optimizer.addCdnEndpoint(failedEndpoint, true);
    
    await optimizer.triggerCdnFailover(failedEndpoint);
    expect(optimizer.cdnEndpoints.failedEndpoints.has(failedEndpoint)).toBe(true);
  });

  test('should batch requests when enabled', () => {
    const testUrl = 'https://example.com/api/test';
    const shouldBatch = optimizer.shouldBatchRequest(testUrl, { method: 'GET' });
    
    expect(typeof shouldBatch).toBe('boolean');
  });

  test('should get optimization metrics', () => {
    const metrics = optimizer.getMetrics();
    
    expect(metrics.totalRequests).toBeDefined();
    expect(metrics.successfulRequests).toBeDefined();
    expect(metrics.failedRequests).toBeDefined();
    expect(metrics.successRate).toBeDefined();
  });
});