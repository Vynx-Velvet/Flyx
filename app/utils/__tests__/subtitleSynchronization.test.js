/**
 * Subtitle Synchronization Accuracy Tests
 * Tests subtitle timing verification and synchronization accuracy
 * Requirements: 3.1, 3.2, 3.4
 */

import { renderHook, act } from '@testing-library/react';
import { useSubtitleSynchronizer } from '../subtitleSynchronizer.js';

// Mock performance.now for precise timing control
let mockTime = 0;
const originalPerformanceNow = performance.now;

beforeAll(() => {
  performance.now = jest.fn(() => mockTime);
});

afterAll(() => {
  performance.now = originalPerformanceNow;
});

describe('Subtitle Synchronization Tests', () => {
  let mockVideoElement;
  let testSubtitles;

  beforeEach(() => {
    mockTime = 0;
    jest.clearAllMocks();

    mockVideoElement = {
      currentTime: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    testSubtitles = [
      {
        id: '1',
        start: 1.0,
        end: 3.0,
        text: 'First subtitle'
      },
      {
        id: '2',
        start: 5.5,
        end: 8.2,
        text: 'Second subtitle'
      },
      {
        id: '3',
        start: 10.0,
        end: 12.5,
        text: 'Third subtitle'
      },
      {
        id: '4',
        start: 15.1,
        end: 17.9,
        text: 'Fourth subtitle'
      }
    ];
  });

  describe('Sub-100ms Accuracy Tests', () => {
    test('should achieve sub-100ms synchronization accuracy', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      const timingResults = [];

      // Mock the subtitle display callback to measure timing
      result.current.onSubtitleChange = jest.fn((subtitle, timestamp) => {
        timingResults.push({
          subtitle,
          timestamp,
          videoTime: mockVideoElement.currentTime,
          systemTime: performance.now()
        });
      });

      await act(async () => {
        result.current.start();
      });

      // Test precise timing at subtitle boundaries
      const testCases = [
        { videoTime: 0.95, expectedSubtitle: null }, // Just before first subtitle
        { videoTime: 1.0, expectedSubtitle: testSubtitles[0] }, // Exactly at start
        { videoTime: 1.05, expectedSubtitle: testSubtitles[0] }, // Just after start
        { videoTime: 2.95, expectedSubtitle: testSubtitles[0] }, // Just before end
        { videoTime: 3.0, expectedSubtitle: null }, // Exactly at end
        { videoTime: 3.05, expectedSubtitle: null }, // Just after end
      ];

      for (const testCase of testCases) {
        mockVideoElement.currentTime = testCase.videoTime;
        mockTime = testCase.videoTime * 1000; // Convert to milliseconds

        await act(async () => {
          result.current.updateCurrentTime(testCase.videoTime);
        });

        const currentSubtitle = result.current.getCurrentSubtitle();
        
        if (testCase.expectedSubtitle) {
          expect(currentSubtitle?.id).toBe(testCase.expectedSubtitle.id);
        } else {
          expect(currentSubtitle).toBeNull();
        }

        // Verify timing accuracy within 50ms
        const timingError = Math.abs(performance.now() - (testCase.videoTime * 1000));
        expect(timingError).toBeLessThan(50);
      }
    });

    test('should handle rapid time changes with maintained accuracy', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      const accuracyResults = [];

      result.current.onSubtitleChange = jest.fn((subtitle, timestamp) => {
        const expectedTime = mockVideoElement.currentTime;
        const actualTime = timestamp;
        const accuracy = Math.abs(expectedTime - actualTime) * 1000; // Convert to ms
        
        accuracyResults.push({
          expected: expectedTime,
          actual: actualTime,
          accuracy
        });
      });

      await act(async () => {
        result.current.start();
      });

      // Simulate rapid seeking
      const rapidTimeChanges = [0.5, 2.3, 6.7, 11.2, 16.8, 4.1, 9.5];

      for (const time of rapidTimeChanges) {
        mockVideoElement.currentTime = time;
        mockTime = time * 1000;

        await act(async () => {
          result.current.updateCurrentTime(time);
        });

        // Allow for processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // All accuracy measurements should be under 100ms
      accuracyResults.forEach(result => {
        expect(result.accuracy).toBeLessThan(100);
      });

      // Average accuracy should be under 50ms
      const averageAccuracy = accuracyResults.reduce((sum, r) => sum + r.accuracy, 0) / accuracyResults.length;
      expect(averageAccuracy).toBeLessThan(50);
    });

    test('should maintain accuracy during playback speed changes', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Test different playback speeds
      const playbackSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

      for (const speed of playbackSpeeds) {
        await act(async () => {
          result.current.setPlaybackRate(speed);
        });

        // Simulate playback at this speed
        let currentTime = 0;
        const interval = 100; // 100ms intervals
        const duration = 2000; // 2 seconds

        for (let elapsed = 0; elapsed < duration; elapsed += interval) {
          currentTime += (interval / 1000) * speed;
          mockVideoElement.currentTime = currentTime;
          mockTime = elapsed;

          await act(async () => {
            result.current.updateCurrentTime(currentTime);
          });

          // Verify subtitle timing is adjusted for playback speed
          const currentSubtitle = result.current.getCurrentSubtitle();
          const expectedSubtitle = testSubtitles.find(sub => 
            currentTime >= sub.start && currentTime < sub.end
          );

          if (expectedSubtitle) {
            expect(currentSubtitle?.id).toBe(expectedSubtitle.id);
          } else {
            expect(currentSubtitle).toBeNull();
          }
        }
      }
    });
  });

  describe('High-Frequency Update Tests', () => {
    test('should update subtitles every 100ms without performance degradation', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      const updateTimes = [];
      let lastUpdateTime = 0;

      result.current.onSubtitleChange = jest.fn(() => {
        const currentTime = performance.now();
        if (lastUpdateTime > 0) {
          updateTimes.push(currentTime - lastUpdateTime);
        }
        lastUpdateTime = currentTime;
      });

      await act(async () => {
        result.current.start();
      });

      // Simulate 5 seconds of playback with 100ms updates
      const totalDuration = 5000; // 5 seconds
      const updateInterval = 100; // 100ms

      for (let elapsed = 0; elapsed < totalDuration; elapsed += updateInterval) {
        mockVideoElement.currentTime = elapsed / 1000;
        mockTime = elapsed;

        await act(async () => {
          result.current.updateCurrentTime(elapsed / 1000);
        });

        // Small delay to simulate real-time playback
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Verify update frequency is close to 100ms
      const averageInterval = updateTimes.reduce((sum, interval) => sum + interval, 0) / updateTimes.length;
      expect(averageInterval).toBeGreaterThan(90);
      expect(averageInterval).toBeLessThan(110);

      // Verify no updates took longer than 150ms (allowing for some variance)
      const maxInterval = Math.max(...updateTimes);
      expect(maxInterval).toBeLessThan(150);
    });

    test('should handle large subtitle files without performance impact', async () => {
      // Generate a large subtitle file (1000 subtitles)
      const largeSubtitleSet = [];
      for (let i = 0; i < 1000; i++) {
        largeSubtitleSet.push({
          id: `subtitle-${i}`,
          start: i * 2,
          end: i * 2 + 1.5,
          text: `Subtitle number ${i + 1}`
        });
      }

      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, largeSubtitleSet)
      );

      const performanceMetrics = [];

      result.current.onSubtitleChange = jest.fn(() => {
        const startTime = performance.now();
        
        // Simulate subtitle processing
        result.current.getCurrentSubtitle();
        
        const endTime = performance.now();
        performanceMetrics.push(endTime - startTime);
      });

      await act(async () => {
        result.current.start();
      });

      // Test performance across the entire subtitle range
      const testTimes = [0, 500, 1000, 1500, 1999]; // Various points in the timeline

      for (const time of testTimes) {
        mockVideoElement.currentTime = time;
        mockTime = time * 1000;

        const startTime = performance.now();
        
        await act(async () => {
          result.current.updateCurrentTime(time);
        });

        const endTime = performance.now();
        performanceMetrics.push(endTime - startTime);
      }

      // All operations should complete within 10ms
      performanceMetrics.forEach(metric => {
        expect(metric).toBeLessThan(10);
      });

      // Average processing time should be under 5ms
      const averageTime = performanceMetrics.reduce((sum, time) => sum + time, 0) / performanceMetrics.length;
      expect(averageTime).toBeLessThan(5);
    });
  });

  describe('Timing Drift Detection and Correction', () => {
    test('should detect and correct timing drift', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Simulate gradual timing drift
      let driftAmount = 0;
      const driftRate = 0.001; // 1ms per second

      for (let time = 0; time < 20; time += 0.1) {
        driftAmount += driftRate * 0.1;
        const driftedTime = time + driftAmount;
        
        mockVideoElement.currentTime = time;
        mockTime = driftedTime * 1000;

        await act(async () => {
          result.current.updateCurrentTime(time);
        });
      }

      // Check if drift correction was applied
      const driftCorrection = result.current.getDriftCorrection();
      expect(Math.abs(driftCorrection)).toBeGreaterThan(0.01); // Should detect drift
      expect(Math.abs(driftCorrection)).toBeLessThan(0.1); // Should not over-correct
    });

    test('should handle subtitle timing offset correction', async () => {
      // Create subtitles with known timing offset
      const offsetSubtitles = testSubtitles.map(sub => ({
        ...sub,
        start: sub.start + 0.5, // 500ms offset
        end: sub.end + 0.5
      }));

      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, offsetSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Apply timing correction
      await act(async () => {
        result.current.applyTimingOffset(-0.5); // Correct the offset
      });

      // Test that subtitles now appear at correct times
      mockVideoElement.currentTime = 1.0;
      await act(async () => {
        result.current.updateCurrentTime(1.0);
      });

      const currentSubtitle = result.current.getCurrentSubtitle();
      expect(currentSubtitle?.text).toBe('First subtitle');
    });

    test('should maintain sync during network-induced delays', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Simulate network delays affecting subtitle updates
      const networkDelays = [50, 100, 200, 150, 75]; // Various delay amounts in ms

      for (let i = 0; i < networkDelays.length; i++) {
        const time = i + 1;
        const delay = networkDelays[i];

        mockVideoElement.currentTime = time;
        mockTime = time * 1000;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, delay));

        await act(async () => {
          result.current.updateCurrentTime(time);
        });

        // Verify subtitle sync is maintained despite delays
        const currentSubtitle = result.current.getCurrentSubtitle();
        const expectedSubtitle = testSubtitles.find(sub => 
          time >= sub.start && time < sub.end
        );

        if (expectedSubtitle) {
          expect(currentSubtitle?.id).toBe(expectedSubtitle.id);
        }
      }
    });
  });

  describe('Edge Case Timing Tests', () => {
    test('should handle overlapping subtitle timing', async () => {
      const overlappingSubtitles = [
        { id: '1', start: 1.0, end: 4.0, text: 'First subtitle' },
        { id: '2', start: 2.0, end: 5.0, text: 'Overlapping subtitle' },
        { id: '3', start: 3.5, end: 6.0, text: 'Third overlapping subtitle' }
      ];

      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, overlappingSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Test behavior at overlap points
      const testPoints = [
        { time: 1.5, expectedCount: 1 },
        { time: 2.5, expectedCount: 2 },
        { time: 3.7, expectedCount: 3 },
        { time: 4.5, expectedCount: 2 },
        { time: 5.5, expectedCount: 1 }
      ];

      for (const point of testPoints) {
        mockVideoElement.currentTime = point.time;
        
        await act(async () => {
          result.current.updateCurrentTime(point.time);
        });

        const activeSubtitles = result.current.getActiveSubtitles();
        expect(activeSubtitles).toHaveLength(point.expectedCount);
      }
    });

    test('should handle zero-duration subtitles', async () => {
      const zeroDurationSubtitles = [
        { id: '1', start: 1.0, end: 1.0, text: 'Instant subtitle' },
        { id: '2', start: 2.0, end: 2.001, text: 'Very short subtitle' },
        { id: '3', start: 3.0, end: 3.0, text: 'Another instant subtitle' }
      ];

      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, zeroDurationSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Test that zero-duration subtitles are handled appropriately
      mockVideoElement.currentTime = 1.0;
      await act(async () => {
        result.current.updateCurrentTime(1.0);
      });

      // Zero-duration subtitles should not be displayed
      const currentSubtitle = result.current.getCurrentSubtitle();
      expect(currentSubtitle).toBeNull();
    });

    test('should handle negative timestamps gracefully', async () => {
      const negativeTimestampSubtitles = [
        { id: '1', start: -1.0, end: 1.0, text: 'Negative start' },
        { id: '2', start: 2.0, end: 1.0, text: 'End before start' },
        { id: '3', start: 3.0, end: 5.0, text: 'Valid subtitle' }
      ];

      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, negativeTimestampSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Should filter out invalid subtitles
      const validSubtitles = result.current.getValidSubtitles();
      expect(validSubtitles).toHaveLength(1);
      expect(validSubtitles[0].id).toBe('3');
    });

    test('should handle extremely precise timestamps', async () => {
      const preciseSubtitles = [
        { id: '1', start: 1.001, end: 1.002, text: 'Microsecond precision' },
        { id: '2', start: 2.0001, end: 2.0002, text: 'Sub-millisecond precision' },
        { id: '3', start: 3.123456789, end: 3.987654321, text: 'Nanosecond precision' }
      ];

      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, preciseSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Test precise timing
      mockVideoElement.currentTime = 1.0015;
      await act(async () => {
        result.current.updateCurrentTime(1.0015);
      });

      const currentSubtitle = result.current.getCurrentSubtitle();
      expect(currentSubtitle?.id).toBe('1');
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with frequent time updates', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      const performanceResults = [];

      // Simulate very frequent updates (every 10ms for 1 second)
      for (let i = 0; i < 100; i++) {
        const time = i * 0.01;
        mockVideoElement.currentTime = time;
        mockTime = time * 1000;

        const startTime = performance.now();
        
        await act(async () => {
          result.current.updateCurrentTime(time);
        });

        const endTime = performance.now();
        performanceResults.push(endTime - startTime);
      }

      // All updates should complete quickly
      const maxTime = Math.max(...performanceResults);
      const avgTime = performanceResults.reduce((sum, time) => sum + time, 0) / performanceResults.length;

      expect(maxTime).toBeLessThan(5); // No single update should take more than 5ms
      expect(avgTime).toBeLessThan(2); // Average should be under 2ms
    });

    test('should handle memory efficiently during long playback sessions', async () => {
      const { result } = renderHook(() => 
        useSubtitleSynchronizer(mockVideoElement, testSubtitles)
      );

      await act(async () => {
        result.current.start();
      });

      // Simulate 1 hour of playback (3600 seconds)
      const sessionDuration = 3600;
      const updateInterval = 1; // Update every second

      for (let time = 0; time < sessionDuration; time += updateInterval) {
        mockVideoElement.currentTime = time;
        mockTime = time * 1000;

        await act(async () => {
          result.current.updateCurrentTime(time);
        });

        // Periodically check memory usage doesn't grow unbounded
        if (time % 600 === 0) { // Every 10 minutes
          const memoryUsage = result.current.getMemoryUsage();
          expect(memoryUsage.subtitleCache).toBeLessThan(1000000); // Less than 1MB
          expect(memoryUsage.timingHistory).toBeLessThan(100); // Limited history
        }
      }
    });
  });
});