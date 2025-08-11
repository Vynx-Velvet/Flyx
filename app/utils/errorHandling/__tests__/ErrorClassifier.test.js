/**
 * Test suite for ErrorClassifier
 * Tests error classification, severity determination, and metadata extraction
 */

import { ErrorClassifier } from '../ErrorClassifier.js';
import { ErrorTypes, ErrorSeverity, ErrorCategory } from '../ErrorTypes.js';

describe('ErrorClassifier', () => {
  describe('classify', () => {
    it('should classify HLS network errors correctly', () => {
      const hlsError = {
        type: 'hlsError',
        details: 'fragLoadError',
        fatal: true,
        frag: {
          url: 'https://example.com/segment.ts',
          level: 2,
          sn: 123
        }
      };

      const result = ErrorClassifier.classify(hlsError, { source: 'playback' });

      expect(result.type).toBe(ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.category).toBe(ErrorCategory.RETRY_REQUIRED);
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
      expect(result.metadata.hlsDetails).toBeDefined();
      expect(result.metadata.hlsDetails.frag.url).toBe('https://example.com/segment.ts');
    });

    it('should classify extraction iframe navigation errors', () => {
      const extractionError = new Error('iframe navigation failed');
      
      const result = ErrorClassifier.classify(extractionError, { source: 'extraction' });

      expect(result.type).toBe(ErrorTypes.EXTRACTION.IFRAME_NAVIGATION_FAILED);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.category).toBe(ErrorCategory.FALLBACK_AVAILABLE);
      expect(result.recoverable).toBe(true);
    });

    it('should classify CORS errors based on context', () => {
      const corsError = new TypeError('CORS policy blocked');
      
      const extractionResult = ErrorClassifier.classify(corsError, { source: 'extraction' });
      expect(extractionResult.type).toBe(ErrorTypes.EXTRACTION.SHADOWLANDS_CORS_ERROR);

      const playbackResult = ErrorClassifier.classify(corsError, { source: 'playback' });
      expect(playbackResult.type).toBe(ErrorTypes.PLAYBACK.CORS_ERROR);
    });

    it('should classify subtitle errors correctly', () => {
      const vttError = new Error('VTT parse failed');
      
      const result = ErrorClassifier.classify(vttError, { source: 'subtitle' });

      expect(result.type).toBe(ErrorTypes.SUBTITLE.VTT_PARSE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.category).toBe(ErrorCategory.RECOVERABLE);
    });

    it('should classify video element errors', () => {
      const videoError = {
        target: { tagName: 'VIDEO', currentTime: 123.45, duration: 3600 },
        type: 'error'
      };
      
      const result = ErrorClassifier.classify(videoError);

      expect(result.type).toBe(ErrorTypes.PLAYBACK.VIDEO_ELEMENT_ERROR);
      expect(result.metadata.videoDetails).toBeDefined();
      expect(result.metadata.videoDetails.currentTime).toBe(123.45);
    });

    it('should classify system errors', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      const result = ErrorClassifier.classify(quotaError);

      expect(result.type).toBe(ErrorTypes.SYSTEM.QUOTA_EXCEEDED);
      expect(result.severity).toBe(ErrorSeverity.LOW);
    });

    it('should handle unknown errors gracefully', () => {
      const unknownError = new Error('Something weird happened');
      
      const result = ErrorClassifier.classify(unknownError);

      expect(result.type).toBe(ErrorTypes.SYSTEM.UNKNOWN_ERROR);
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.category).toBe(ErrorCategory.RECOVERABLE);
    });
  });

  describe('determineSeverity', () => {
    it('should assign critical severity to fatal errors', () => {
      const severity = ErrorClassifier.determineSeverity(ErrorTypes.EXTRACTION.VM_SERVICE_UNAVAILABLE);
      expect(severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign high severity to major errors', () => {
      const severity = ErrorClassifier.determineSeverity(ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED);
      expect(severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assign medium severity to recoverable errors', () => {
      const severity = ErrorClassifier.determineSeverity(ErrorTypes.PLAYBACK.BUFFER_STALLED);
      expect(severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should assign low severity to minor errors', () => {
      const severity = ErrorClassifier.determineSeverity(ErrorTypes.SUBTITLE.SYNC_DRIFT);
      expect(severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('determineCategory', () => {
    it('should categorize fatal errors correctly', () => {
      const category = ErrorClassifier.determineCategory(ErrorTypes.SYSTEM.BROWSER_COMPATIBILITY);
      expect(category).toBe(ErrorCategory.FATAL);
    });

    it('should categorize retry errors correctly', () => {
      const category = ErrorClassifier.determineCategory(ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED);
      expect(category).toBe(ErrorCategory.RETRY_REQUIRED);
    });

    it('should categorize fallback errors correctly', () => {
      const category = ErrorClassifier.determineCategory(ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED);
      expect(category).toBe(ErrorCategory.FALLBACK_AVAILABLE);
    });

    it('should categorize recoverable errors correctly', () => {
      const category = ErrorClassifier.determineCategory(ErrorTypes.PLAYBACK.BUFFER_STALLED);
      expect(category).toBe(ErrorCategory.RECOVERABLE);
    });
  });

  describe('extractMetadata', () => {
    it('should extract HLS error metadata', () => {
      const hlsError = {
        type: 'hlsError',
        details: 'fragLoadError',
        fatal: true,
        frag: { url: 'test.ts', level: 1, sn: 5 },
        response: { code: 404, text: 'Not Found' }
      };

      const metadata = ErrorClassifier.extractMetadata(hlsError, {});

      expect(metadata.hlsDetails).toBeDefined();
      expect(metadata.hlsDetails.type).toBe('hlsError');
      expect(metadata.hlsDetails.frag.url).toBe('test.ts');
      expect(metadata.hlsDetails.response.code).toBe(404);
    });

    it('should extract video element metadata', () => {
      const videoError = {
        target: {
          tagName: 'VIDEO',
          currentTime: 100,
          duration: 3600,
          readyState: 4,
          networkState: 2,
          error: { code: 3, message: 'MEDIA_ERR_DECODE' }
        }
      };

      const metadata = ErrorClassifier.extractMetadata(videoError, {});

      expect(metadata.videoDetails).toBeDefined();
      expect(metadata.videoDetails.currentTime).toBe(100);
      expect(metadata.videoDetails.error.code).toBe(3);
    });

    it('should extract network error metadata', () => {
      const networkError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          url: 'https://api.example.com/stream'
        }
      };

      const metadata = ErrorClassifier.extractMetadata(networkError, {});

      expect(metadata.networkDetails).toBeDefined();
      expect(metadata.networkDetails.status).toBe(500);
      expect(metadata.networkDetails.url).toBe('https://api.example.com/stream');
    });

    it('should include context and environment data', () => {
      const error = new Error('Test error');
      const context = { movieId: '123', server: 'vidsrc' };

      const metadata = ErrorClassifier.extractMetadata(error, context);

      expect(metadata.movieId).toBe('123');
      expect(metadata.server).toBe('vidsrc');
      expect(metadata.userAgent).toBeDefined();
      expect(metadata.url).toBeDefined();
      expect(metadata.timestamp).toBeDefined();
    });
  });
});