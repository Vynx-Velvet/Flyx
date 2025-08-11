/**
 * Tests for Enhanced Logging System
 * Validates logging functionality, performance tracking, and diagnostic export
 */

import { 
  EnhancedLogger, 
  loggerManager, 
  getLogger,
  createExtractionLogger,
  createHlsLogger,
  createSubtitleLogger,
  createPerformanceLogger,
  exportAllDiagnostics
} from '../index.js';

describe('Enhanced Logging System', () => {
  beforeEach(() => {
    // Clear all logs before each test
    loggerManager.clearAllLogs();
  });

  afterAll(() => {
    // Clean up after all tests
    loggerManager.destroyAll();
  });

  describe('EnhancedLogger', () => {
    test('should create logger with correct configuration', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false,
        logLevel: 'warn'
      });

      expect(logger.component).toBe('TestComponent');
      expect(logger.enableConsole).toBe(false);
      expect(logger.enableStorage).toBe(false);
      expect(logger.logLevel).toBe('warn');
      expect(logger.sessionId).toMatch(/testcomponent_\d+_[a-z0-9]+/);
    });

    test('should log messages with correct structure', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false
      });

      const logEntry = logger.info('Test message', { key: 'value' });

      expect(logEntry).toMatchObject({
        component: 'TestComponent',
        level: 'info',
        message: 'Test message',
        data: { key: 'value' }
      });
      expect(logEntry.id).toBeDefined();
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.sessionId).toBeDefined();
    });

    test('should respect log level filtering', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false,
        logLevel: 'warn'
      });

      const debugLog = logger.debug('Debug message');
      const infoLog = logger.info('Info message');
      const warnLog = logger.warn('Warn message');

      expect(debugLog).toBeUndefined();
      expect(infoLog).toBeUndefined();
      expect(warnLog).toBeDefined();
      expect(logger.logs).toHaveLength(1);
    });

    test('should track performance metrics', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false
      });

      const startTime = logger.startTimer('test-operation');
      expect(startTime).toBeGreaterThan(0);
      expect(logger.timers.has('test-operation')).toBe(true);

      // Simulate some work
      const duration = logger.endTimer('test-operation', { result: 'success' });
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(logger.timers.has('test-operation')).toBe(false);
      expect(logger.performanceMetrics.has('test-operation')).toBe(true);
    });

    test('should export diagnostic data', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false
      });

      logger.info('Test message 1');
      logger.warn('Test warning');
      logger.error('Test error', new Error('Test error'));

      const diagnosticData = logger.exportLogs();

      expect(diagnosticData.sessionId).toBeDefined();
      expect(diagnosticData.component).toBe('TestComponent');
      expect(diagnosticData.totalLogs).toBeGreaterThanOrEqual(3);
      expect(diagnosticData.logs.length).toBeGreaterThanOrEqual(3);
      expect(diagnosticData.summary).toBeDefined();
    });
  });

  describe('Specialized Loggers', () => {
    test('should create extraction logger with request tracking', () => {
      const extractionLogger = createExtractionLogger('test-request-123');

      expect(extractionLogger.requestId).toBe('test-request-123');
      expect(extractionLogger.logger.component).toBe('Extraction');

      const logEntry = extractionLogger.startExtraction(
        'https://example.com/stream',
        'movie',
        'vidsrc.xyz',
        '12345'
      );

      expect(logEntry.data.requestId).toBe('test-request-123');
      expect(logEntry.data.extractionStart).toBe(true);
    });

    test('should create HLS logger with playback session tracking', () => {
      const hlsLogger = createHlsLogger('https://example.com/stream.m3u8');

      expect(hlsLogger.streamUrl).toBe('https://example.com/stream.m3u8');
      expect(hlsLogger.logger.component).toBe('HLS');
      expect(hlsLogger.playbackSessionId).toMatch(/hls_\d+_[a-z0-9]+/);

      const logEntry = hlsLogger.logHlsInitialization(
        { maxBufferLength: 60 },
        'https://example.com/stream.m3u8'
      );

      expect(logEntry.data.hlsInitialization).toBe(true);
      expect(logEntry.data.playbackSessionId).toBeDefined();
    });

    test('should create subtitle logger with media tracking', () => {
      const subtitleLogger = createSubtitleLogger('media-123');

      expect(subtitleLogger.mediaId).toBe('media-123');
      expect(subtitleLogger.logger.component).toBe('Subtitle');

      const parseId = subtitleLogger.generateParseId();
      const logEntry = subtitleLogger.logParseStart('vtt', 'opensubtitles', 'en', 1024);

      expect(logEntry.data.subtitleParsing).toBe(true);
      expect(logEntry.data.mediaId).toBe('media-123');
    });

    test('should create performance logger with metrics tracking', () => {
      const performanceLogger = createPerformanceLogger('TestPerformance');

      expect(performanceLogger.component).toBe('TestPerformance');
      expect(performanceLogger.logger.component).toBe('TestPerformance');

      const logEntry = performanceLogger.logBufferHealth(5.2, 2, 1, 150.5);

      expect(logEntry.data.bufferHealth).toBe(true);
      expect(logEntry.data.bufferLength).toBe(5.2);
      expect(logEntry.data.stallCount).toBe(2);
    });
  });

  describe('Logger Manager', () => {
    test('should manage multiple loggers', () => {
      const logger1 = getLogger('Component1');
      const logger2 = getLogger('Component2');
      const logger1Again = getLogger('Component1');

      expect(logger1).toBe(logger1Again); // Should return same instance
      expect(logger1).not.toBe(logger2);
      expect(loggerManager.loggers.has('Component1')).toBe(true);
      expect(loggerManager.loggers.has('Component2')).toBe(true);
    });

    test('should collect logs from all loggers', () => {
      const logger1 = getLogger('Component1', { enableConsole: false, enableStorage: false });
      const logger2 = getLogger('Component2', { enableConsole: false, enableStorage: false });

      logger1.info('Message from component 1');
      logger2.warn('Warning from component 2');

      const allLogs = loggerManager.getAllLogs();
      expect(allLogs).toHaveLength(2);
      expect(allLogs.some(log => log.component === 'Component1')).toBe(true);
      expect(allLogs.some(log => log.component === 'Component2')).toBe(true);
    });
  });

  describe('Diagnostic Export', () => {
    test('should export comprehensive diagnostic data', () => {
      const extractionLogger = createExtractionLogger();
      const hlsLogger = createHlsLogger('https://example.com/stream.m3u8');

      // Generate some test logs
      extractionLogger.startExtraction('https://example.com', 'movie', 'vidsrc.xyz');
      extractionLogger.logIframeStep(1, 'https://vidsrc.xyz/embed', 'Initial iframe', true);
      
      hlsLogger.logHlsInitialization({}, 'https://example.com/stream.m3u8');
      hlsLogger.logHlsError('networkError', 'NETWORK_ERROR', true);

      const diagnostics = exportAllDiagnostics({
        includeSystemInfo: true,
        includePerformanceMetrics: true,
        includeErrorSummary: true
      });

      expect(diagnostics.exportId).toBeDefined();
      expect(diagnostics.summary.totalLogs).toBeGreaterThan(0);
      expect(diagnostics.summary.components).toContain('Extraction');
      expect(diagnostics.summary.components).toContain('HLS');
      expect(diagnostics.systemInfo).toBeDefined();
      expect(diagnostics.performanceMetrics).toBeDefined();
      expect(diagnostics.errorSummary).toBeDefined();
    });

    test('should filter logs by component', () => {
      const extractionLogger = createExtractionLogger();
      const hlsLogger = createHlsLogger();

      extractionLogger.info('Extraction message');
      hlsLogger.info('HLS message');

      const extractionDiagnostics = exportAllDiagnostics({
        includeComponents: ['Extraction']
      });

      expect(extractionDiagnostics.logs.every(log => log.component === 'Extraction')).toBe(true);
    });

    test('should filter logs by level', () => {
      const logger = getLogger('TestComponent', { enableConsole: false, enableStorage: false });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const errorDiagnostics = exportAllDiagnostics({
        logLevel: 'error'
      });

      expect(errorDiagnostics.logs.every(log => log.level === 'error')).toBe(true);
    });
  });

  describe('Performance Tracking', () => {
    test('should track timing metrics', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false
      });

      logger.startTimer('operation1');
      logger.startTimer('operation2');

      // Simulate work
      setTimeout(() => {
        const duration1 = logger.endTimer('operation1');
        const duration2 = logger.endTimer('operation2');

        expect(duration1).toBeGreaterThanOrEqual(0);
        expect(duration2).toBeGreaterThanOrEqual(0);
        expect(logger.performanceMetrics.size).toBe(2);
      }, 10);
    });

    test('should track custom metrics', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false
      });

      const metric = logger.trackMetric('buffer-length', 5.2, 'seconds', {
        quality: '720p'
      });

      expect(metric.name).toBe('buffer-length');
      expect(metric.value).toBe(5.2);
      expect(metric.unit).toBe('seconds');
      expect(metric.context.quality).toBe('720p');
    });
  });

  describe('Error Handling', () => {
    test('should handle circular references in data', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false
      });

      const circularObj = { name: 'test' };
      circularObj.self = circularObj;

      const logEntry = logger.info('Test with circular reference', { circular: circularObj });

      expect(logEntry).toBeDefined();
      expect(logEntry.data).toBeDefined();
    });

    test('should handle large data objects', () => {
      const logger = new EnhancedLogger('TestComponent', {
        enableConsole: false,
        enableStorage: false
      });

      const largeString = 'x'.repeat(2000);
      const logEntry = logger.info('Test with large data', { large: largeString });

      expect(logEntry.data.large).toContain('... [truncated]');
      expect(logEntry.data.large.length).toBeLessThan(largeString.length);
    });
  });
});

describe('Integration Tests', () => {
  test('should work with media playback workflow', () => {
    // Simulate a complete media playback workflow with logging
    const extractionLogger = createExtractionLogger('workflow-test');
    const hlsLogger = createHlsLogger('https://example.com/stream.m3u8');
    const subtitleLogger = createSubtitleLogger('media-123');

    // Extraction phase
    extractionLogger.startExtraction('https://vidsrc.xyz/embed/movie?tmdb=12345', 'movie', 'vidsrc.xyz');
    extractionLogger.logIframeStep(1, 'https://vidsrc.xyz/embed', 'Initial iframe', true);
    extractionLogger.logPlayButtonInteraction('#pl_but', 'click', true);
    extractionLogger.logExtractionComplete(true, 'https://stream.example.com/video.m3u8', 'hls', 'vidsrc.xyz', 'pro');

    // HLS playback phase
    hlsLogger.logHlsInitialization({ maxBufferLength: 60 }, 'https://stream.example.com/video.m3u8');
    hlsLogger.logManifestParsed([
      { id: 0, height: 720, bitrate: 2000000 },
      { id: 1, height: 480, bitrate: 1000000 }
    ], { id: 0, height: 720, bitrate: 2000000 });
    hlsLogger.logFragmentLoading({ level: 0, sn: 1, url: 'segment1.ts', duration: 4 });
    hlsLogger.logFragmentLoaded({ level: 0, sn: 1 }, 150);

    // Subtitle phase
    const parseId = subtitleLogger.generateParseId();
    subtitleLogger.logParseStart('vtt', 'opensubtitles', 'en', 2048);
    subtitleLogger.logParseComplete(parseId, true, 150, 45, [], []);
    subtitleLogger.logSyncStart(150, 100);

    // Export comprehensive diagnostics
    const diagnostics = exportAllDiagnostics({
      includeSystemInfo: true,
      includePerformanceMetrics: true,
      includeErrorSummary: true
    });

    expect(diagnostics.summary.components).toContain('Extraction');
    expect(diagnostics.summary.components).toContain('HLS');
    expect(diagnostics.summary.components).toContain('Subtitle');
    expect(diagnostics.summary.totalLogs).toBeGreaterThan(8);
  });
});