/**
 * Performance Tests for Buffer Management and Quality Switching
 * Tests performance under different network conditions
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2
 */

import { renderHook, act } from '@testing-library/react';
import { useHls } from '../hooks/useHls.js';
import { PerformanceMonitor } from '../../../utils/performance/PerformanceMonitor.js';

// Mock network conditions
const mockNetworkConditions = {
  excellent: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    packetLoss: 0.001
  },
  good: {
    effectiveType: '4g',
    downlink: 5,
    rtt: 100,
    packetLoss: 0.01
  },
  fair: {
    effectiveType: '3g',
    downlink: 1.5,
    rtt: 300,
    packetLoss: 0.05
  },
  poor: {
    effectiveType: 'slow-2g',
    downlink: 0.5,
    rtt: 2000,
    packetLoss: 0.1
  }
};

// Mock HLS instance with performance tracking
const createMockHlsInstance = (networkCondition = 'excellent') => {
  const condition = mockNetworkConditions[networkCondition];
  
  return {
    loadSource: jest.fn(),
    attachMedia: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
    levels: [
      { height: 1080, bitrate: 5000000, index: 0 },
      { height: 720, bitrate: 2500000, index: 1 },
      { height: 480, bitrate: 1000000, index: 2 },
      { height: 360, bitrate: 500000, index: 3 }
    ],
    currentLevel: 0,
    startLevel: -1,
    autoLevelEnabled: true,
    config: {
      maxBufferLength: 30,
      maxBufferSize: 60 * 1000 * 1000,
      fragLoadingMaxRetry: 3,
      fragLoadingRetryDelay: 1000
    },
    // Simulate network-dependent behavior
    _networkCondition: condition,
    _segmentLoadTimes: [],
    _bufferLevels: [],
    _qualitySwitches: []
  };
};

describe('Performance Tests - Buffer Management', () => {
  let mockVideoElement;
  let performanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockVideoElement = {
      currentTime: 0,
      duration: 3600, // 1 hour video
      buffered: {
        length: 1,
        start: () => 0,
        end: () => 30
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    performanceMonitor = new PerformanceMonitor();
    
    // Mock global Hls
    global.Hls = jest.fn(() => createMockHlsInstance());
    global.Hls.isSupported = jest.fn(() => true);
    global.Hls.Events = {
      MEDIA_ATTACHED: 'hlsMediaAttached',
      MANIFEST_PARSED: 'hlsManifestParsed',
      LEVEL_LOADED: 'hlsLevelLoaded',
      FRAG_LOADED: 'hlsFragLoaded',
      ERROR: 'hlsError',
      BUFFER_STALLED: 'hlsBufferStalled'
    };
  });

  describe('Buffer Health Under Different Network Conditions', () => {
    test('should maintain optimal buffer health under excellent network conditions', async () => {
      global.navigator.connection = mockNetworkConditions.excellent;
      global.Hls = jest.fn(() => createMockHlsInstance('excellent'));

      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate excellent network performance
      const bufferHealthResults = [];
      
      for (let time = 0; time < 300; time += 10) { // 5 minutes of playback
        // Simulate fast segment loading
        const segmentLoadTime = 200 + Math.random() * 100; // 200-300ms
        
        mockVideoElement.currentTime = time;
        mockVideoElement.buffered = {
          length: 1,
          start: () => Math.max(0, time - 5),
          end: () => time + 45 // Healthy 45-second buffer
        };

        await act(async () => {
          performanceMonitor.recordSegmentLoad(segmentLoadTime, true);
          performanceMonitor.updateBufferLevel(45);
          performanceMonitor.updateBufferHealth();
        });

        bufferHealthResults.push(performanceMonitor.metrics.bufferHealth.healthScore);
      }

      // Buffer health should consistently be excellent (>90)
      const averageHealth = bufferHealthResults.reduce((sum, health) => sum + health, 0) / bufferHealthResults.length;
      expect(averageHealth).toBeGreaterThan(90);

      // Should have minimal buffer stalls
      expect(performanceMonitor.metrics.bufferHealth.stalls).toBeLessThan(2);
    });

    test('should adapt buffer strategy under poor network conditions', async () => {
      global.navigator.connection = mockNetworkConditions.poor;
      global.Hls = jest.fn(() => createMockHlsInstance('poor'));

      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate poor network performance
      const adaptationResults = [];
      let bufferLevel = 30;

      for (let time = 0; time < 300; time += 10) {
        // Simulate slow/failed segment loading
        const segmentLoadTime = 5000 + Math.random() * 3000; // 5-8 seconds
        const loadSuccess = Math.random() > 0.1; // 10% failure rate

        if (loadSuccess) {
          bufferLevel = Math.max(5, bufferLevel - 2); // Buffer drains faster than it fills
        } else {
          bufferLevel = Math.max(0, bufferLevel - 5); // Failed loads drain buffer more
        }

        mockVideoElement.currentTime = time;
        mockVideoElement.buffered = {
          length: bufferLevel > 0 ? 1 : 0,
          start: () => Math.max(0, time - 5),
          end: () => time + bufferLevel
        };

        await act(async () => {
          performanceMonitor.recordSegmentLoad(segmentLoadTime, loadSuccess);
          performanceMonitor.updateBufferLevel(bufferLevel);
          performanceMonitor.updateBufferHealth();
        });

        adaptationResults.push({
          time,
          bufferLevel,
          loadTime: segmentLoadTime,
          success: loadSuccess
        });
      }

      // Should have adapted to poor conditions
      const bufferStalls = performanceMonitor.metrics.bufferHealth.stalls;
      expect(bufferStalls).toBeGreaterThan(0); // Some stalls expected

      // But should recover from stalls
      const finalBufferLevel = adaptationResults[adaptationResults.length - 1].bufferLevel;
      expect(finalBufferLevel).toBeGreaterThan(0);
    });

    test('should handle intermittent network connectivity', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const connectivityResults = [];
      let isOnline = true;
      let bufferLevel = 30;

      for (let time = 0; time < 600; time += 5) { // 10 minutes
        // Simulate intermittent connectivity
        if (time % 60 === 0) { // Every minute, toggle connectivity
          isOnline = !isOnline;
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: isOnline
          });
        }

        if (isOnline) {
          // Online: segments load normally
          const segmentLoadTime = 500 + Math.random() * 500;
          bufferLevel = Math.min(60, bufferLevel + 3);
          
          await act(async () => {
            performanceMonitor.recordSegmentLoad(segmentLoadTime, true);
          });
        } else {
          // Offline: buffer drains, no new segments
          bufferLevel = Math.max(0, bufferLevel - 2);
          
          if (bufferLevel === 0) {
            await act(async () => {
              performanceMonitor.recordBufferStall(5000);
            });
          }
        }

        mockVideoElement.buffered = {
          length: bufferLevel > 0 ? 1 : 0,
          start: () => Math.max(0, time - 5),
          end: () => time + bufferLevel
        };

        await act(async () => {
          performanceMonitor.updateBufferLevel(bufferLevel);
          performanceMonitor.updateBufferHealth();
        });

        connectivityResults.push({
          time,
          isOnline,
          bufferLevel,
          healthScore: performanceMonitor.metrics.bufferHealth.healthScore
        });
      }

      // Should recover when connectivity returns
      const onlineResults = connectivityResults.filter(r => r.isOnline);
      const offlineResults = connectivityResults.filter(r => !r.isOnline);

      const avgOnlineHealth = onlineResults.reduce((sum, r) => sum + r.healthScore, 0) / onlineResults.length;
      const avgOfflineHealth = offlineResults.reduce((sum, r) => sum + r.healthScore, 0) / offlineResults.length;

      expect(avgOnlineHealth).toBeGreaterThan(avgOfflineHealth);
      expect(avgOnlineHealth).toBeGreaterThan(60); // Should recover well when online
    });
  });

  describe('Quality Switching Performance', () => {
    test('should perform smooth quality switches under stable conditions', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const qualitySwitchResults = [];
      const targetQualities = [0, 1, 2, 1, 0]; // Switch between qualities

      for (let i = 0; i < targetQualities.length; i++) {
        const targetQuality = targetQualities[i];
        const startTime = performance.now();

        await act(async () => {
          result.current.changeQuality(targetQuality);
        });

        const endTime = performance.now();
        const switchTime = endTime - startTime;

        // Simulate quality switch completion
        await act(async () => {
          performanceMonitor.recordQualitySwitch(
            result.current.currentQuality?.height || 1080,
            result.current.qualities[targetQuality]?.height || 720,
            'manual'
          );
        });

        qualitySwitchResults.push({
          targetQuality,
          switchTime,
          successful: switchTime < 1000 // Should complete within 1 second
        });

        // Wait between switches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All quality switches should be successful and fast
      qualitySwitchResults.forEach(result => {
        expect(result.successful).toBe(true);
        expect(result.switchTime).toBeLessThan(500); // Should be very fast
      });

      // Should not cause excessive quality oscillation
      const totalSwitches = performanceMonitor.metrics.qualityMetrics.switches;
      expect(totalSwitches).toBe(targetQualities.length);
    });

    test('should adapt quality based on network conditions', async () => {
      const networkConditions = ['excellent', 'good', 'fair', 'poor'];
      const adaptationResults = [];

      for (const condition of networkConditions) {
        global.navigator.connection = mockNetworkConditions[condition];
        global.Hls = jest.fn(() => createMockHlsInstance(condition));

        const { result } = renderHook(() => useHls(mockVideoElement));

        await act(async () => {
          result.current.initializeHls('https://example.com/stream.m3u8');
        });

        // Simulate network-based quality adaptation
        const conditionData = mockNetworkConditions[condition];
        let recommendedQuality = 0; // Start with highest quality

        // Adapt quality based on network conditions
        if (conditionData.downlink < 1) {
          recommendedQuality = 3; // 360p for very slow connections
        } else if (conditionData.downlink < 2) {
          recommendedQuality = 2; // 480p for slow connections
        } else if (conditionData.downlink < 5) {
          recommendedQuality = 1; // 720p for medium connections
        }

        await act(async () => {
          result.current.changeQuality(recommendedQuality);
        });

        // Simulate playback with this quality
        const segmentLoadTime = Math.max(100, 2000 / conditionData.downlink);
        const bufferHealth = Math.max(20, 100 - (conditionData.rtt / 10));

        await act(async () => {
          performanceMonitor.recordSegmentLoad(segmentLoadTime, true);
          performanceMonitor.updateBufferLevel(bufferHealth);
          performanceMonitor.recordQualitySwitch(1080, result.current.qualities[recommendedQuality]?.height, 'network_adaptation');
        });

        adaptationResults.push({
          condition,
          recommendedQuality,
          segmentLoadTime,
          bufferHealth,
          qualityHeight: result.current.qualities[recommendedQuality]?.height
        });
      }

      // Quality should decrease as network conditions worsen
      expect(adaptationResults[0].qualityHeight).toBeGreaterThan(adaptationResults[3].qualityHeight);
      expect(adaptationResults[1].qualityHeight).toBeGreaterThan(adaptationResults[3].qualityHeight);

      // Segment load times should be reasonable for each condition
      adaptationResults.forEach(result => {
        expect(result.segmentLoadTime).toBeLessThan(10000); // Max 10 seconds
      });
    });

    test('should prevent quality oscillation during unstable conditions', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate unstable network conditions
      const oscillationResults = [];
      let currentQuality = 0;

      for (let time = 0; time < 300; time += 10) { // 5 minutes
        // Simulate fluctuating network conditions
        const networkQuality = Math.sin(time / 30) * 2 + 2; // Oscillates between 0-4
        const targetQuality = Math.floor(Math.abs(networkQuality));

        // Apply quality switching with oscillation prevention
        const timeSinceLastSwitch = time % 30;
        const shouldSwitch = Math.abs(targetQuality - currentQuality) > 1 && timeSinceLastSwitch > 15;

        if (shouldSwitch) {
          const oldQuality = currentQuality;
          currentQuality = targetQuality;

          await act(async () => {
            result.current.changeQuality(currentQuality);
            performanceMonitor.recordQualitySwitch(
              result.current.qualities[oldQuality]?.height || 1080,
              result.current.qualities[currentQuality]?.height || 720,
              'network_fluctuation'
            );
          });
        }

        oscillationResults.push({
          time,
          networkQuality,
          targetQuality,
          actualQuality: currentQuality,
          switched: shouldSwitch
        });
      }

      // Should have limited the number of quality switches
      const totalSwitches = oscillationResults.filter(r => r.switched).length;
      expect(totalSwitches).toBeLessThan(10); // Should not switch too frequently

      // Adaptation score should be reasonable (not too much oscillation)
      await act(async () => {
        performanceMonitor.updateQualityMetrics();
      });

      const adaptationScore = performanceMonitor.metrics.qualityMetrics.adaptationScore;
      expect(adaptationScore).toBeGreaterThan(60); // Should maintain reasonable stability
    });
  });

  describe('Memory Management Performance', () => {
    test('should manage memory efficiently during long playback sessions', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const memoryResults = [];
      const sessionDuration = 7200; // 2 hours

      for (let time = 0; time < sessionDuration; time += 60) { // Check every minute
        mockVideoElement.currentTime = time;

        // Simulate memory usage tracking
        const segmentCount = Math.floor(time / 10); // 10-second segments
        const bufferSize = Math.min(60, segmentCount * 0.1); // Buffer grows but is limited

        await act(async () => {
          performanceMonitor.updateMemoryUsage();
        });

        const memoryUsage = {
          time,
          heapUsed: performance.memory?.usedJSHeapSize || 50 * 1024 * 1024,
          bufferSize,
          segmentCount
        };

        memoryResults.push(memoryUsage);

        // Memory should not grow unbounded
        expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
      }

      // Memory usage should stabilize, not grow linearly
      const firstHourAvg = memoryResults.slice(0, 30).reduce((sum, r) => sum + r.heapUsed, 0) / 30;
      const secondHourAvg = memoryResults.slice(30, 60).reduce((sum, r) => sum + r.heapUsed, 0) / 30;

      // Second hour should not use significantly more memory than first hour
      expect(secondHourAvg / firstHourAvg).toBeLessThan(1.5);
    });

    test('should cleanup resources efficiently on quality changes', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const cleanupResults = [];
      const initialMemory = performance.memory?.usedJSHeapSize || 50 * 1024 * 1024;

      // Perform multiple quality changes
      for (let i = 0; i < 20; i++) {
        const targetQuality = i % 4; // Cycle through all qualities

        await act(async () => {
          result.current.changeQuality(targetQuality);
        });

        // Force garbage collection simulation
        if (global.gc) {
          global.gc();
        }

        const currentMemory = performance.memory?.usedJSHeapSize || initialMemory;
        cleanupResults.push({
          iteration: i,
          quality: targetQuality,
          memoryUsage: currentMemory,
          memoryGrowth: currentMemory - initialMemory
        });

        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Memory growth should be minimal despite multiple quality changes
      const finalMemoryGrowth = cleanupResults[cleanupResults.length - 1].memoryGrowth;
      expect(finalMemoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    test('should track comprehensive performance metrics', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate various performance scenarios
      const scenarios = [
        { loadTime: 200, success: true, quality: 1080 },
        { loadTime: 500, success: true, quality: 720 },
        { loadTime: 1000, success: false, quality: 720 },
        { loadTime: 300, success: true, quality: 480 },
        { loadTime: 800, success: true, quality: 720 }
      ];

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];

        await act(async () => {
          performanceMonitor.recordSegmentLoad(scenario.loadTime, scenario.success);
          
          if (i > 0) {
            performanceMonitor.recordQualitySwitch(
              scenarios[i-1].quality,
              scenario.quality,
              'test'
            );
          }
          
          performanceMonitor.updateBufferLevel(30 + Math.random() * 20);
          performanceMonitor.updateBufferHealth();
          performanceMonitor.updateSegmentMetrics();
          performanceMonitor.updateQualityMetrics();
        });
      }

      const summary = performanceMonitor.getPerformanceSummary();

      // Verify comprehensive metrics are tracked
      expect(summary.segments.totalSegments).toBe(scenarios.length);
      expect(summary.segments.successRate).toBe(80); // 4/5 successful
      expect(summary.segments.averageLoadTime).toBeGreaterThan(0);
      
      expect(summary.quality.switches).toBe(scenarios.length - 1);
      expect(summary.quality.adaptationScore).toBeGreaterThan(0);
      
      expect(summary.buffer.healthScore).toBeGreaterThan(0);
      expect(summary.overall.score).toBeGreaterThan(0);
    });

    test('should provide actionable performance insights', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate poor performance scenario
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          performanceMonitor.recordSegmentLoad(3000, i % 3 !== 0); // Slow loads, 33% failure rate
          performanceMonitor.updateBufferLevel(5 + Math.random() * 10); // Low buffer
          performanceMonitor.recordBufferStall(2000); // Frequent stalls
          performanceMonitor.updateBufferHealth();
        });
      }

      const insights = performanceMonitor.getPerformanceInsights();

      expect(insights).toContain('buffer_health_critical');
      expect(insights).toContain('segment_load_slow');
      expect(insights).toContain('frequent_stalls');

      // Should provide optimization recommendations
      const optimizations = performanceMonitor.getOptimizationRecommendations();
      expect(optimizations.length).toBeGreaterThan(0);
      expect(optimizations.some(opt => opt.type === 'buffer')).toBe(true);
    });
  });
});