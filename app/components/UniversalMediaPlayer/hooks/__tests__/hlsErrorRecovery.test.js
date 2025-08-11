/**
 * HLS Error Recovery Testing with Simulated Network Failures
 * Tests HLS error recovery mechanisms under various failure conditions
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { renderHook, act } from '@testing-library/react';
import { useHls } from '../useHls.js';

// Mock HLS.js
const mockHlsInstance = {
  loadSource: jest.fn(),
  attachMedia: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  recoverMediaError: jest.fn(),
  swapAudioCodec: jest.fn(),
  levels: [
    { height: 1080, bitrate: 5000000, index: 0 },
    { height: 720, bitrate: 2500000, index: 1 },
    { height: 480, bitrate: 1000000, index: 2 }
  ],
  currentLevel: 0,
  startLevel: -1,
  autoLevelEnabled: true,
  config: {}
};

global.Hls = jest.fn(() => mockHlsInstance);
global.Hls.isSupported = jest.fn(() => true);
global.Hls.Events = {
  MEDIA_ATTACHED: 'hlsMediaAttached',
  MANIFEST_PARSED: 'hlsManifestParsed',
  LEVEL_LOADED: 'hlsLevelLoaded',
  FRAG_LOADED: 'hlsFragLoaded',
  FRAG_LOAD_ERROR: 'hlsFragLoadError',
  ERROR: 'hlsError',
  BUFFER_STALLED: 'hlsBufferStalled'
};
global.Hls.ErrorTypes = {
  NETWORK_ERROR: 'networkError',
  MEDIA_ERROR: 'mediaError',
  MUX_ERROR: 'muxError',
  OTHER_ERROR: 'otherError'
};
global.Hls.ErrorDetails = {
  FRAG_LOAD_ERROR: 'fragLoadError',
  FRAG_LOAD_TIMEOUT: 'fragLoadTimeout',
  FRAG_PARSING_ERROR: 'fragParsingError',
  MANIFEST_LOAD_ERROR: 'manifestLoadError',
  MANIFEST_LOAD_TIMEOUT: 'manifestLoadTimeout',
  LEVEL_LOAD_ERROR: 'levelLoadError',
  LEVEL_LOAD_TIMEOUT: 'levelLoadTimeout',
  BUFFER_STALLED_ERROR: 'bufferStalledError',
  BUFFER_FULL_ERROR: 'bufferFullError'
};

describe('HLS Error Recovery Tests', () => {
  let mockVideoElement;
  let eventHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock video element
    mockVideoElement = {
      currentTime: 0,
      duration: 100,
      buffered: {
        length: 1,
        start: () => 0,
        end: () => 30
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      load: jest.fn()
    };

    // Capture event handlers
    eventHandlers = {};
    mockHlsInstance.on.mockImplementation((event, handler) => {
      eventHandlers[event] = handler;
    });

    // Reset HLS instance
    Object.assign(mockHlsInstance, {
      loadSource: jest.fn(),
      attachMedia: jest.fn(),
      on: jest.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      off: jest.fn(),
      destroy: jest.fn(),
      recoverMediaError: jest.fn(),
      swapAudioCodec: jest.fn(),
      currentLevel: 0,
      startLevel: -1,
      autoLevelEnabled: true
    });
  });

  describe('Network Error Recovery', () => {
    test('should recover from fragment load errors with segment skipping', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate fragment load error
      const errorData = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
        fatal: false,
        frag: {
          sn: 10,
          url: 'https://example.com/segment10.ts',
          start: 100,
          end: 104
        },
        response: {
          code: 404,
          text: 'Not Found'
        }
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, errorData);
      });

      // Should attempt segment skip within 2 seconds
      expect(result.current.segmentErrors.get(10)).toBe(1);
      
      // Verify error was handled non-fatally
      expect(result.current.error).toBeNull();
    });

    test('should implement progressive recovery for repeated network errors', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // First network error - should try network recovery
      const networkError = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
        fatal: true
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, networkError);
      });

      expect(result.current.recoveryAttempts.network).toBe(1);

      // Second network error - should try media recovery
      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, networkError);
      });

      expect(mockHlsInstance.recoverMediaError).toHaveBeenCalled();
      expect(result.current.recoveryAttempts.media).toBe(1);

      // Third error - should trigger full restart
      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, networkError);
      });

      expect(result.current.recoveryAttempts.restart).toBe(1);
    });

    test('should handle manifest load errors with retry logic', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const manifestError = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
        fatal: true,
        url: 'https://example.com/stream.m3u8',
        response: {
          code: 500,
          text: 'Internal Server Error'
        }
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, manifestError);
      });

      // Should retry manifest loading
      expect(mockHlsInstance.loadSource).toHaveBeenCalledTimes(2);
    });

    test('should implement exponential backoff for retries', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const startTime = Date.now();

      // Trigger multiple errors to test backoff
      for (let i = 0; i < 3; i++) {
        const error = {
          type: global.Hls.ErrorTypes.NETWORK_ERROR,
          details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
          fatal: true
        };

        await act(async () => {
          eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
        });
      }

      const endTime = Date.now();
      
      // Should have waited for exponential backoff
      expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second total
    });
  });

  describe('Media Error Recovery', () => {
    test('should recover from media errors with codec swapping', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const mediaError = {
        type: global.Hls.ErrorTypes.MEDIA_ERROR,
        details: global.Hls.ErrorDetails.FRAG_PARSING_ERROR,
        fatal: true,
        frag: {
          sn: 5,
          url: 'https://example.com/segment5.ts'
        }
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, mediaError);
      });

      expect(mockHlsInstance.recoverMediaError).toHaveBeenCalled();
      expect(result.current.recoveryAttempts.media).toBe(1);
    });

    test('should handle buffer stall errors with gap jumping', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Mock buffered ranges with gap
      mockVideoElement.buffered = {
        length: 2,
        start: (index) => index === 0 ? 0 : 50,
        end: (index) => index === 0 ? 30 : 80
      };
      mockVideoElement.currentTime = 35; // In the gap

      const bufferError = {
        type: global.Hls.ErrorTypes.MEDIA_ERROR,
        details: global.Hls.ErrorDetails.BUFFER_STALLED_ERROR,
        fatal: false
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, bufferError);
      });

      // Should jump to next buffered range
      expect(mockVideoElement.currentTime).toBe(50);
    });

    test('should handle buffer full errors with buffer management', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      const bufferFullError = {
        type: global.Hls.ErrorTypes.MEDIA_ERROR,
        details: global.Hls.ErrorDetails.BUFFER_FULL_ERROR,
        fatal: false
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, bufferFullError);
      });

      // Should trigger buffer cleanup
      expect(result.current.bufferHealth).toBeLessThan(100);
    });
  });

  describe('Quality Management During Errors', () => {
    test('should lower quality on repeated segment errors', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate multiple segment errors
      for (let i = 0; i < 5; i++) {
        const error = {
          type: global.Hls.ErrorTypes.NETWORK_ERROR,
          details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
          fatal: false,
          frag: { sn: i }
        };

        await act(async () => {
          eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
        });
      }

      // Should have lowered quality
      expect(mockHlsInstance.currentLevel).toBeGreaterThan(0);
    });

    test('should prevent quality oscillation during error recovery', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Set initial quality
      mockHlsInstance.currentLevel = 1;

      // Simulate error that would normally trigger quality change
      const error = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
        fatal: false
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
      });

      // Should maintain stable quality during recovery
      const initialLevel = mockHlsInstance.currentLevel;

      // Trigger another error quickly
      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
      });

      expect(mockHlsInstance.currentLevel).toBe(initialLevel);
    });
  });

  describe('Error Tracking and Metrics', () => {
    test('should track segment error counts', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate errors on same segment
      const segmentNumber = 10;
      for (let i = 0; i < 3; i++) {
        const error = {
          type: global.Hls.ErrorTypes.NETWORK_ERROR,
          details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
          fatal: false,
          frag: { sn: segmentNumber }
        };

        await act(async () => {
          eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
        });
      }

      expect(result.current.segmentErrors.get(segmentNumber)).toBe(3);
    });

    test('should track recovery success rates', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate successful recovery
      const error = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
        fatal: true
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
      });

      // Simulate successful fragment load after recovery
      await act(async () => {
        eventHandlers[global.Hls.Events.FRAG_LOADED](global.Hls.Events.FRAG_LOADED, {
          frag: { sn: 11 }
        });
      });

      expect(result.current.recoveryAttempts.network).toBe(1);
      expect(result.current.successfulRecoveries).toBe(1);
    });

    test('should provide error diagnostics', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate various errors
      const errors = [
        {
          type: global.Hls.ErrorTypes.NETWORK_ERROR,
          details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
          fatal: false
        },
        {
          type: global.Hls.ErrorTypes.MEDIA_ERROR,
          details: global.Hls.ErrorDetails.BUFFER_STALLED_ERROR,
          fatal: false
        }
      ];

      for (const error of errors) {
        await act(async () => {
          eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
        });
      }

      const diagnostics = result.current.getErrorDiagnostics();
      
      expect(diagnostics.totalErrors).toBe(2);
      expect(diagnostics.networkErrors).toBe(1);
      expect(diagnostics.mediaErrors).toBe(1);
      expect(diagnostics.errorHistory).toHaveLength(2);
    });
  });

  describe('Simulated Network Conditions', () => {
    test('should handle intermittent connectivity', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Simulate network going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const networkError = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
        fatal: true
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, networkError);
      });

      // Should pause recovery while offline
      expect(result.current.isRecovering).toBe(false);

      // Simulate network coming back online
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      await act(async () => {
        // Should resume recovery
      });

      expect(result.current.recoveryAttempts.network).toBeGreaterThan(0);
    });

    test('should adapt to slow network conditions', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      // Mock slow network conditions
      global.navigator.connection = {
        effectiveType: 'slow-2g',
        downlink: 0.5,
        rtt: 2000
      };

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Should start at lower quality for slow networks
      expect(mockHlsInstance.startLevel).toBeGreaterThan(0);

      // Should increase retry delays for slow networks
      const error = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_TIMEOUT,
        fatal: true
      };

      const startTime = Date.now();
      
      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
      });

      const endTime = Date.now();
      
      // Should have longer retry delay for slow networks
      expect(endTime - startTime).toBeGreaterThan(1000);
    });

    test('should handle high latency conditions', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      // Mock high latency network
      global.navigator.connection = {
        effectiveType: '3g',
        downlink: 1.5,
        rtt: 1000
      };

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Should increase buffer size for high latency
      expect(mockHlsInstance.config.maxBufferLength).toBeGreaterThan(30);

      // Should be more tolerant of timeout errors
      const timeoutError = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_TIMEOUT,
        fatal: false
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, timeoutError);
      });

      // Should not immediately mark as fatal for high latency networks
      expect(result.current.error).toBeNull();
    });
  });

  describe('Recovery Time Limits', () => {
    test('should enforce maximum recovery time', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Mock Date.now to control time
      const originalNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      const error = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
        fatal: true
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
      });

      // Advance time beyond recovery limit
      mockTime += 31000; // 31 seconds

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
      });

      // Should give up recovery after time limit
      expect(result.current.error).not.toBeNull();
      expect(result.current.error.type).toBe('recovery_timeout');

      // Restore original Date.now
      Date.now = originalNow;
    });

    test('should reset recovery attempts after successful playback', async () => {
      const { result } = renderHook(() => useHls(mockVideoElement));

      await act(async () => {
        result.current.initializeHls('https://example.com/stream.m3u8');
      });

      // Trigger some errors
      const error = {
        type: global.Hls.ErrorTypes.NETWORK_ERROR,
        details: global.Hls.ErrorDetails.FRAG_LOAD_ERROR,
        fatal: true
      };

      await act(async () => {
        eventHandlers[global.Hls.Events.ERROR](global.Hls.Events.ERROR, error);
      });

      expect(result.current.recoveryAttempts.network).toBe(1);

      // Simulate successful playback for a period
      await act(async () => {
        eventHandlers[global.Hls.Events.FRAG_LOADED](global.Hls.Events.FRAG_LOADED, {
          frag: { sn: 20 }
        });
      });

      // Should reset recovery attempts after successful period
      expect(result.current.recoveryAttempts.network).toBe(0);
    });
  });
});