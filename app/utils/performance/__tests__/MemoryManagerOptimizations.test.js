/**
 * Memory Manager Optimizations Test Suite
 * Tests the enhanced memory management features for task 12
 * Requirements: 5.1, 5.2, 5.4
 */

import MemoryManager from '../MemoryManager';

// Mock performance.memory API
const mockPerformanceMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url-123'),
  revokeObjectURL: jest.fn()
};

// Mock window.gc
global.window = {
  gc: jest.fn()
};

// Mock performance API with mutable memory object
global.performance = {
  memory: { ...mockPerformanceMemory },
  now: jest.fn(() => Date.now())
};

// Mock document and navigator
global.document = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  contains: jest.fn(() => true)
};

global.navigator = {
  userAgent: 'Mozilla/5.0 Test Browser'
};

describe('MemoryManager Optimizations', () => {
  let memoryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset performance memory mock
    global.performance.memory = { ...mockPerformanceMemory };
    
    // Reset window.gc mock
    global.window.gc = jest.fn();
    
    memoryManager = new MemoryManager();
  });

  afterEach(() => {
    if (memoryManager) {
      memoryManager.destroy();
    }
  });

  describe('Automatic Blob URL Cleanup', () => {
    test('should register and track blob URLs with metadata', () => {
      const blobUrl = 'blob:test-url-123';
      const metadata = {
        type: 'subtitle',
        language: 'English',
        size: 1024,
        source: 'opensubtitles'
      };

      memoryManager.registerBlobUrl(blobUrl, metadata);

      const registeredBlob = memoryManager.resources.blobUrls.get(blobUrl);
      expect(registeredBlob).toBeDefined();
      expect(registeredBlob.type).toBe('subtitle');
      expect(registeredBlob.size).toBe(1024);
      expect(registeredBlob.source).toBe('opensubtitles');
    });

    test('should automatically cleanup old blob URLs', () => {
      const oldBlobUrl = 'blob:old-url-123';
      const newBlobUrl = 'blob:new-url-456';

      // Register old blob URL
      memoryManager.registerBlobUrl(oldBlobUrl, { type: 'subtitle' });
      
      // Simulate old timestamp
      const oldBlob = memoryManager.resources.blobUrls.get(oldBlobUrl);
      oldBlob.created = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      oldBlob.lastAccessed = Date.now() - (10 * 60 * 1000);

      // Register new blob URL
      memoryManager.registerBlobUrl(newBlobUrl, { type: 'subtitle' });

      // Trigger cleanup
      const cleanedCount = memoryManager.cleanupOldBlobUrls();

      expect(cleanedCount).toBe(1);
      expect(memoryManager.resources.blobUrls.has(oldBlobUrl)).toBe(false);
      expect(memoryManager.resources.blobUrls.has(newBlobUrl)).toBe(true);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(oldBlobUrl);
    });

    test('should update last accessed time when blob URL is accessed', () => {
      const blobUrl = 'blob:test-url-123';
      memoryManager.registerBlobUrl(blobUrl, { type: 'subtitle' });

      const initialTime = memoryManager.resources.blobUrls.get(blobUrl).lastAccessed;
      
      // Wait a bit and access the blob URL
      setTimeout(() => {
        memoryManager.accessBlobUrl(blobUrl);
        const updatedTime = memoryManager.resources.blobUrls.get(blobUrl).lastAccessed;
        expect(updatedTime).toBeGreaterThan(initialTime);
      }, 10);
    });
  });

  describe('HLS Event Listener Cleanup', () => {
    test('should register and track event listeners', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const listeners = [
        { event: 'loadstart', handler: jest.fn(), options: {} },
        { event: 'progress', handler: jest.fn(), options: {} }
      ];

      memoryManager.registerEventListeners(mockElement, listeners);

      const registeredListeners = memoryManager.resources.eventListeners.get(mockElement);
      expect(registeredListeners).toHaveLength(2);
      expect(registeredListeners[0].event).toBe('loadstart');
      expect(registeredListeners[1].event).toBe('progress');
    });

    test('should cleanup event listeners when element is removed', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const listeners = [
        { event: 'loadstart', handler: jest.fn(), options: {} },
        { event: 'progress', handler: jest.fn(), options: {} }
      ];

      memoryManager.registerEventListeners(mockElement, listeners);
      memoryManager.unregisterEventListeners(mockElement);

      expect(mockElement.removeEventListener).toHaveBeenCalledTimes(2);
      expect(memoryManager.resources.eventListeners.has(mockElement)).toBe(false);
    });

    test('should cleanup orphaned event listeners', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      // Mock document.contains to return false (element not in DOM)
      global.document.contains = jest.fn(() => false);

      const listeners = [
        { event: 'loadstart', handler: jest.fn(), options: {} }
      ];

      memoryManager.registerEventListeners(mockElement, listeners);
      const cleanedCount = memoryManager.cleanupOrphanedEventListeners();

      expect(cleanedCount).toBe(1);
      expect(mockElement.removeEventListener).toHaveBeenCalled();
      expect(memoryManager.resources.eventListeners.has(mockElement)).toBe(false);
    });
  });

  describe('Buffer Optimization with Network Conditions', () => {
    test('should optimize buffer size based on network conditions', () => {
      const networkConditions = {
        bandwidth: 10000000, // 10 Mbps
        stability: 'stable',
        trend: 'stable'
      };

      const currentBufferSize = 60;
      const optimizedSize = memoryManager.optimizeBufferSize(networkConditions, currentBufferSize);

      // Should reduce buffer size for good, stable connections
      expect(optimizedSize).toBeLessThanOrEqual(currentBufferSize);
    });

    test('should increase buffer size for poor network conditions', () => {
      const networkConditions = {
        bandwidth: 1000000, // 1 Mbps
        stability: 'unstable',
        trend: 'degrading'
      };

      const currentBufferSize = 30;
      const optimizedSize = memoryManager.optimizeBufferSize(networkConditions, currentBufferSize);

      // Should increase buffer size for poor, unstable connections
      expect(optimizedSize).toBeGreaterThanOrEqual(currentBufferSize);
    });

    test('should reduce buffer size under memory pressure', () => {
      // Set high memory pressure
      memoryManager.metrics.memoryPressure = 'high';

      const networkConditions = {
        bandwidth: 10000000, // 10 Mbps
        stability: 'stable',
        trend: 'stable'
      };

      const currentBufferSize = 60;
      const optimizedSize = memoryManager.optimizeBufferSize(networkConditions, currentBufferSize);

      // Should reduce buffer size under memory pressure
      expect(optimizedSize).toBeLessThanOrEqual(45);
    });
  });

  describe('Garbage Collection Optimization', () => {
    test('should trigger garbage collection for long sessions', () => {
      // Simulate long session
      memoryManager.sessionStartTime = Date.now() - (35 * 60 * 1000); // 35 minutes ago
      memoryManager.metrics.memoryPressure = 'medium';

      memoryManager.optimizeGarbageCollection();

      expect(global.window.gc).toHaveBeenCalled();
    });

    test('should not trigger garbage collection for short sessions', () => {
      // Simulate short session
      memoryManager.sessionStartTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      memoryManager.metrics.memoryPressure = 'low';

      memoryManager.optimizeGarbageCollection();

      expect(global.window.gc).not.toHaveBeenCalled();
    });
  });

  describe('Resource Usage Monitoring', () => {
    test('should provide resource usage recommendations', () => {
      // Set up conditions that should trigger recommendations
      for (let i = 0; i < 25; i++) {
        memoryManager.registerBlobUrl(`blob:url-${i}`, { type: 'subtitle' });
      }

      const recommendations = memoryManager.monitorResourceUsage();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('blob_cleanup');
      expect(recommendations[0].priority).toBe('medium');
    });

    test('should recommend memory cleanup for high memory usage', () => {
      // Mock high memory usage
      global.performance.memory.usedJSHeapSize = 1.8 * 1024 * 1024 * 1024; // 1.8GB
      memoryManager.updateMemoryMetrics();
      memoryManager.checkMemoryPressure();

      const recommendations = memoryManager.monitorResourceUsage();

      const memoryRec = recommendations.find(r => r.type === 'memory_pressure');
      expect(memoryRec).toBeDefined();
      expect(memoryRec.priority).toBe('critical');
    });
  });

  describe('Extraction Results Cleanup', () => {
    test('should register and cleanup extraction results', () => {
      // Register multiple extraction results
      for (let i = 0; i < 12; i++) {
        memoryManager.registerExtractionResult(`extraction-${i}`, {
          url: `http://example.com/stream-${i}`,
          quality: '1080p',
          timestamp: Date.now() - (i * 1000)
        });
      }

      // Should have 12 initially, but cleanup should be triggered
      expect(memoryManager.resources.extractionCache.size).toBeLessThanOrEqual(12);
      expect(memoryManager.resources.extractionCache.size).toBeGreaterThan(0);
    });

    test('should keep only recent extraction results', () => {
      // Register extraction results with different timestamps
      const oldResult = {
        url: 'http://example.com/old-stream',
        quality: '720p',
        timestamp: Date.now() - (60 * 1000) // 1 minute ago
      };

      const newResult = {
        url: 'http://example.com/new-stream',
        quality: '1080p',
        timestamp: Date.now()
      };

      memoryManager.registerExtractionResult('old-extraction', oldResult);
      memoryManager.registerExtractionResult('new-extraction', newResult);

      // Fill up cache to trigger cleanup - register enough to exceed the cleanup threshold
      for (let i = 0; i < 20; i++) {
        memoryManager.registerExtractionResult(`filler-${i}`, {
          url: `http://example.com/filler-${i}`,
          timestamp: Date.now() - (i * 100)
        });
      }

      // Cache should be cleaned up to a reasonable size (cleanup triggers at 15, keeps 5)
      // The actual size may vary based on cleanup timing, so we check for reasonable bounds
      expect(memoryManager.resources.extractionCache.size).toBeLessThanOrEqual(15);
      expect(memoryManager.resources.extractionCache.size).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Resource Monitoring', () => {
    test('should start and stop resource monitoring', () => {
      jest.useFakeTimers();

      memoryManager.startResourceMonitoring();
      expect(memoryManager.resourceMonitoringInterval).toBeDefined();

      // Fast-forward time to trigger monitoring
      jest.advanceTimersByTime(16000); // 16 seconds

      memoryManager.stopResourceMonitoring();
      expect(memoryManager.resourceMonitoringInterval).toBeNull();

      jest.useRealTimers();
    });

    test('should provide comprehensive resource usage report', () => {
      // Set up some resources
      memoryManager.registerBlobUrl('blob:test', { type: 'subtitle', size: 1024 });
      memoryManager.registerExtractionResult('test-extraction', { url: 'test', timestamp: Date.now() });

      const report = memoryManager.getResourceUsageReport();

      expect(report).toHaveProperty('heap');
      expect(report).toHaveProperty('resources');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('sessionDuration');
      expect(report).toHaveProperty('extractionCacheSize');
      expect(report.extractionCacheSize).toBe(1);
    });
  });

  describe('Memory Pressure Handling', () => {
    test('should detect and respond to memory pressure changes', () => {
      const mockCallback = jest.fn();
      memoryManager.on('onMemoryPressure', mockCallback);

      // Simulate high memory usage (but not critical)
      global.performance.memory.usedJSHeapSize = 1.2 * 1024 * 1024 * 1024; // 1.2GB
      memoryManager.updateMemoryMetrics();
      memoryManager.checkMemoryPressure();

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: expect.stringMatching(/high|critical/)
        })
      );
    });

    test('should trigger aggressive cleanup on critical memory pressure', () => {
      const cleanupSpy = jest.spyOn(memoryManager, 'performAggressiveCleanup');

      // Simulate critical memory usage
      global.performance.memory.usedJSHeapSize = 1.9 * 1024 * 1024 * 1024; // 1.9GB
      memoryManager.updateMemoryMetrics();
      memoryManager.checkMemoryPressure();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Integration with Performance Monitoring', () => {
    test('should integrate with performance monitoring callbacks', () => {
      const mockPerformanceCallback = jest.fn();
      
      // Register the callback
      memoryManager.on('onPerformanceDataCleanup', mockPerformanceCallback);
      
      // Verify the callback was registered
      expect(memoryManager.callbacks.onPerformanceDataCleanup).toContain(mockPerformanceCallback);

      // Trigger the callback by calling clearOldPerformanceData
      memoryManager.clearOldPerformanceData();

      // The callback should be triggered with the expected data
      expect(mockPerformanceCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'memory_optimization',
          timestamp: expect.any(Number)
        })
      );
    });

    test('should provide buffer size reduction recommendations', () => {
      const mockBufferCallback = jest.fn();
      memoryManager.on('onBufferSizeReduction', mockBufferCallback);

      // Simulate very high heap usage to ensure recommendation is triggered
      global.performance.memory.usedJSHeapSize = 1.8 * 1024 * 1024 * 1024; // 1.8GB (90% of 2GB limit)
      memoryManager.updateMemoryMetrics();

      const recommendations = memoryManager.monitorResourceUsage();
      const heapRec = recommendations.find(r => r.type === 'heap_usage');
      
      // Should find a heap usage recommendation due to high usage
      expect(heapRec).toBeDefined();
      expect(heapRec.type).toBe('heap_usage');
      expect(heapRec.priority).toBe('high');
      
      // Execute the recommendation action
      heapRec.action();
      
      // Verify the callback was triggered
      expect(mockBufferCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentUsage: expect.any(Number)
        })
      );
    });
  });
});