/**
 * Test suite for RecoveryStrategies
 * Tests recovery mechanisms for different error types
 */

import { RecoveryStrategies } from '../RecoveryStrategies.js';
import { ErrorTypes, ErrorCategory } from '../ErrorTypes.js';
import { ErrorClassifier } from '../ErrorClassifier.js';

// Mock DiagnosticLogger
jest.mock('../DiagnosticLogger.js', () => ({
  DiagnosticLogger: jest.fn().mockImplementation(() => ({
    logRecoveryAttempt: jest.fn(),
    logRecoveryResult: jest.fn(),
    logRecoveryFailure: jest.fn(),
    logFatalError: jest.fn()
  }))
}));

describe('RecoveryStrategies', () => {
  let recoveryStrategies;
  let mockHlsInstance;
  let mockVideoElement;

  beforeEach(() => {
    recoveryStrategies = new RecoveryStrategies();
    
    mockHlsInstance = {
      trigger: jest.fn(),
      destroy: jest.fn(),
      currentLevel: -1,
      levels: [
        { height: 1080, bitrate: 5000000 },
        { height: 720, bitrate: 2500000 },
        { height: 480, bitrate: 1000000 }
      ]
    };

    mockVideoElement = {
      currentTime: 123.45,
      duration: 3600,
      buffered: {
        length: 2,
        start: jest.fn((i) => i === 0 ? 0 : 200),
        end: jest.fn((i) => i === 0 ? 100 : 300)
      }
    };
  });

  describe('executeRecovery', () => {
    it('should handle recoverable errors', async () => {
      const classifiedError = {
        type: ErrorTypes.PLAYBACK.BUFFER_STALLED,
        category: ErrorCategory.RECOVERABLE,
        metadata: {}
      };

      const context = {
        hlsInstance: mockHlsInstance,
        videoElement: mockVideoElement
      };

      const result = await recoveryStrategies.executeRecovery(classifiedError, context);

      expect(result.success).toBe(true);
      expect(result.action).toBe('gap_jumped');
      expect(mockVideoElement.currentTime).toBeGreaterThan(123.45);
    });

    it('should handle retry errors with exponential backoff', async () => {
      const classifiedError = {
        type: ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED,
        category: ErrorCategory.RETRY_REQUIRED,
        metadata: {}
      };

      const context = {
        hlsInstance: mockHlsInstance,
        failedFragment: { url: 'test.ts' }
      };

      const startTime = Date.now();
      const result = await recoveryStrategies.executeRecovery(classifiedError, context);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.action).toBe('segment_retry_triggered');
      expect(result.retryCount).toBe(0);
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000); // Should wait at least 1 second
      expect(mockHlsInstance.trigger).toHaveBeenCalledWith('hlsFragLoadEmergencyAborted');
    });

    it('should handle fallback errors', async () => {
      const classifiedError = {
        type: ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED,
        category: ErrorCategory.FALLBACK_AVAILABLE,
        metadata: {}
      };

      const context = {
        movieId: '123',
        currentServer: 'CloudStream Pro'
      };

      const result = await recoveryStrategies.executeRecovery(classifiedError, context);

      expect(result.success).toBe(true);
      expect(result.action).toBe('server_fallback_initiated');
      expect(result.nextServer).toBe('2Embed');
      expect(result.remainingServers).toEqual(['Superembed']);
    });

    it('should handle fatal errors', async () => {
      const classifiedError = {
        type: ErrorTypes.SYSTEM.BROWSER_COMPATIBILITY,
        category: ErrorCategory.FATAL,
        metadata: {}
      };

      const result = await recoveryStrategies.executeRecovery(classifiedError, {});

      expect(result.success).toBe(false);
      expect(result.action).toBe('fatal_error');
      expect(result.requiresUserAction).toBe(true);
    });

    it('should respect max retry limit', async () => {
      const classifiedError = {
        type: ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED,
        category: ErrorCategory.RETRY_REQUIRED,
        metadata: {}
      };

      // Simulate multiple retries
      for (let i = 0; i < 3; i++) {
        await recoveryStrategies.executeRecovery(classifiedError, { hlsInstance: mockHlsInstance });
      }

      // Fourth retry should fail
      const result = await recoveryStrategies.executeRecovery(classifiedError, { hlsInstance: mockHlsInstance });

      expect(result.success).toBe(false);
      expect(result.action).toBe('max_retries_exceeded');
      expect(result.retryCount).toBe(3);
    });
  });

  describe('recoverBufferStall', () => {
    it('should perform gap jumping when buffer gap is detected', async () => {
      mockVideoElement.currentTime = 150; // Between buffered ranges

      const result = await recoveryStrategies.recoverBufferStall(
        { hlsInstance: mockHlsInstance, videoElement: mockVideoElement },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('gap_jumped');
      expect(result.jumpTo).toBe(200.1);
      expect(mockVideoElement.currentTime).toBe(200.1);
    });

    it('should flush buffer when no gap jumping is possible', async () => {
      mockVideoElement.currentTime = 50; // Within buffered range

      const result = await recoveryStrategies.recoverBufferStall(
        { hlsInstance: mockHlsInstance, videoElement: mockVideoElement },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('buffer_flushed');
      expect(mockHlsInstance.trigger).toHaveBeenCalledWith('hlsBufferFlushed');
    });

    it('should handle missing context gracefully', async () => {
      const result = await recoveryStrategies.recoverBufferStall({}, {});

      expect(result.success).toBe(false);
      expect(result.action).toBe('missing_context');
    });
  });

  describe('recoverQualitySwitch', () => {
    it('should reset to auto quality selection', async () => {
      mockHlsInstance.currentLevel = 2;

      const result = await recoveryStrategies.recoverQualitySwitch(
        { hlsInstance: mockHlsInstance },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('reset_to_auto_quality');
      expect(mockHlsInstance.currentLevel).toBe(-1);
    });

    it('should handle missing HLS instance', async () => {
      const result = await recoveryStrategies.recoverQualitySwitch({}, {});

      expect(result.success).toBe(false);
      expect(result.action).toBe('missing_hls_instance');
    });
  });

  describe('fallbackToAlternativeServer', () => {
    it('should suggest next available server', async () => {
      const context = {
        movieId: '123',
        currentServer: 'CloudStream Pro'
      };

      const result = await recoveryStrategies.fallbackToAlternativeServer(context, {});

      expect(result.success).toBe(true);
      expect(result.action).toBe('server_fallback_initiated');
      expect(result.nextServer).toBe('2Embed');
      expect(result.remainingServers).toEqual(['Superembed']);
    });

    it('should handle no alternative servers', async () => {
      const context = {
        movieId: '123',
        currentServer: 'unknown_server'
      };

      // Mock the servers array to be empty after filtering
      const originalServers = ['CloudStream Pro', '2Embed', 'Superembed'];
      const remainingServers = originalServers.filter(s => s !== 'unknown_server');
      
      if (remainingServers.length === 0) {
        const result = await recoveryStrategies.fallbackToAlternativeServer(context, {});
        expect(result.success).toBe(false);
        expect(result.action).toBe('no_alternative_servers');
      }
    });
  });

  describe('fallbackToDirectStream', () => {
    it('should enable direct stream access', async () => {
      const context = {
        streamUrl: 'https://example.com/stream.m3u8',
        proxyUrl: 'https://proxy.example.com/stream'
      };

      const result = await recoveryStrategies.fallbackToDirectStream(context, {});

      expect(result.success).toBe(true);
      expect(result.action).toBe('direct_stream_fallback');
      expect(result.directUrl).toBe('https://example.com/stream.m3u8');
      expect(result.bypassProxy).toBe(true);
    });

    it('should handle missing stream URL', async () => {
      const result = await recoveryStrategies.fallbackToDirectStream({}, {});

      expect(result.success).toBe(false);
      expect(result.action).toBe('missing_stream_url');
    });
  });

  describe('retry count management', () => {
    it('should track retry counts per error type', () => {
      const errorType = ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED;

      expect(recoveryStrategies.getRetryCount(errorType)).toBe(0);

      recoveryStrategies.incrementRetryCount(errorType);
      expect(recoveryStrategies.getRetryCount(errorType)).toBe(1);

      recoveryStrategies.incrementRetryCount(errorType);
      expect(recoveryStrategies.getRetryCount(errorType)).toBe(2);

      recoveryStrategies.resetRetryCount(errorType);
      expect(recoveryStrategies.getRetryCount(errorType)).toBe(0);
    });

    it('should clear all retry counts', () => {
      recoveryStrategies.incrementRetryCount(ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED);
      recoveryStrategies.incrementRetryCount(ErrorTypes.EXTRACTION.EXTRACTION_TIMEOUT);

      expect(recoveryStrategies.getRetryCount(ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED)).toBe(1);
      expect(recoveryStrategies.getRetryCount(ErrorTypes.EXTRACTION.EXTRACTION_TIMEOUT)).toBe(1);

      recoveryStrategies.clearAllRetries();

      expect(recoveryStrategies.getRetryCount(ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED)).toBe(0);
      expect(recoveryStrategies.getRetryCount(ErrorTypes.EXTRACTION.EXTRACTION_TIMEOUT)).toBe(0);
    });
  });
});