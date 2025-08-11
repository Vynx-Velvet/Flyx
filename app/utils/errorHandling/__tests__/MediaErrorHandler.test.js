/**
 * Test suite for MediaErrorHandler
 * Tests the main error handling integration and user action handling
 */

import { MediaErrorHandler } from '../MediaErrorHandler.js';
import { ErrorTypes, ErrorSeverity } from '../ErrorTypes.js';

// Mock all dependencies
jest.mock('../ErrorClassifier.js');
jest.mock('../RecoveryStrategies.js');
jest.mock('../DiagnosticLogger.js');
jest.mock('../UserFriendlyMessages.js');
jest.mock('../ErrorReportingSystem.js');

describe('MediaErrorHandler', () => {
  let errorHandler;
  let mockClassifiedError;
  let mockUserMessage;
  let mockRecoveryResult;

  beforeEach(() => {
    errorHandler = new MediaErrorHandler();
    
    mockClassifiedError = {
      type: ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      category: 'recoverable',
      recoverable: true,
      retryable: true,
      originalError: new Error('Test error'),
      metadata: {}
    };

    mockUserMessage = {
      title: 'Network Error',
      message: 'There was a problem loading the video.',
      actions: [
        { label: 'Try Again', action: 'retry', primary: true },
        { label: 'Report Issue', action: 'report' }
      ]
    };

    mockRecoveryResult = {
      success: true,
      action: 'network_recovery',
      requiresUserAction: false
    };

    // Setup mocks
    const { ErrorClassifier } = require('../ErrorClassifier.js');
    const { UserFriendlyMessages } = require('../UserFriendlyMessages.js');
    const { RecoveryStrategies } = require('../RecoveryStrategies.js');

    ErrorClassifier.classify = jest.fn().mockReturnValue(mockClassifiedError);
    UserFriendlyMessages.getErrorMessage = jest.fn().mockReturnValue(mockUserMessage);
    
    errorHandler.recoveryStrategies = {
      executeRecovery: jest.fn().mockResolvedValue(mockRecoveryResult)
    };
    
    errorHandler.logger = {
      logError: jest.fn(),
      logUserAction: jest.fn()
    };
  });

  describe('handleError', () => {
    it('should classify error and provide user message', async () => {
      const error = new Error('Test error');
      const context = { source: 'playback' };

      const result = await errorHandler.handleError(error, context);

      expect(result.classifiedError).toBe(mockClassifiedError);
      expect(result.userMessage).toBe(mockUserMessage);
      expect(result.canRetry).toBe(true);
      expect(result.canRecover).toBe(true);
      expect(result.requiresUserAction).toBe(false);
    });

    it('should attempt recovery for recoverable errors', async () => {
      const error = new Error('Test error');
      const context = { source: 'playback' };

      const result = await errorHandler.handleError(error, context);

      expect(errorHandler.recoveryStrategies.executeRecovery).toHaveBeenCalledWith(
        mockClassifiedError,
        context
      );
      expect(result.recoveryResult).toBe(mockRecoveryResult);
    });

    it('should not attempt recovery if already recovering', async () => {
      const error = new Error('Test error');
      errorHandler.isRecovering = true;

      const result = await errorHandler.handleError(error, {});

      expect(errorHandler.recoveryStrategies.executeRecovery).not.toHaveBeenCalled();
      expect(result.recoveryResult).toBeNull();
    });

    it('should handle non-recoverable errors', async () => {
      mockClassifiedError.recoverable = false;
      const error = new Error('Fatal error');

      const result = await errorHandler.handleError(error, {});

      expect(errorHandler.recoveryStrategies.executeRecovery).not.toHaveBeenCalled();
      expect(result.recoveryResult).toBeNull();
    });

    it('should handle error handling failures gracefully', async () => {
      const { ErrorClassifier } = require('../ErrorClassifier.js');
      ErrorClassifier.classify.mockImplementation(() => {
        throw new Error('Classification failed');
      });

      const error = new Error('Test error');
      const result = await errorHandler.handleError(error, {});

      expect(result.classifiedError).toBeNull();
      expect(result.userMessage.title).toBe('System Error');
      expect(result.requiresUserAction).toBe(true);
    });
  });

  describe('handleUserAction', () => {
    it('should handle retry action', async () => {
      const context = {
        retryCallback: jest.fn().mockResolvedValue(),
        retryCount: 0
      };

      const result = await errorHandler.handleUserAction('retry', context);

      expect(result.success).toBe(true);
      expect(result.action).toBe('retry_successful');
      expect(context.retryCallback).toHaveBeenCalled();
    });

    it('should handle retry with exponential backoff', async () => {
      const context = {
        retryCallback: jest.fn().mockResolvedValue(),
        retryCount: 2
      };

      const startTime = Date.now();
      await errorHandler.handleUserAction('retry', context);
      const endTime = Date.now();

      // Should wait at least 4 seconds (2^2 * 1000ms)
      expect(endTime - startTime).toBeGreaterThanOrEqual(4000);
    });

    it('should respect max retry limit', async () => {
      const context = {
        retryCallback: jest.fn(),
        retryCount: 3
      };

      const result = await errorHandler.handleUserAction('retry', context);

      expect(result.success).toBe(false);
      expect(result.action).toBe('max_retries_exceeded');
      expect(context.retryCallback).not.toHaveBeenCalled();
    });

    it('should handle restart player action', async () => {
      const mockHlsInstance = {
        destroy: jest.fn()
      };
      const mockVideoElement = {
        currentTime: 123.45
      };
      const context = {
        hlsInstance: mockHlsInstance,
        videoElement: mockVideoElement,
        restartCallback: jest.fn().mockResolvedValue()
      };

      const result = await errorHandler.handleUserAction('restart_player', context);

      expect(result.success).toBe(true);
      expect(result.action).toBe('player_restarted');
      expect(result.resumeTime).toBe(123.45);
      expect(mockHlsInstance.destroy).toHaveBeenCalled();
      expect(context.restartCallback).toHaveBeenCalledWith(123.45);
    });

    it('should handle lower quality action', async () => {
      const mockHlsInstance = {
        levels: [
          { height: 1080 },
          { height: 720 },
          { height: 480 }
        ],
        currentLevel: 0
      };
      const context = { hlsInstance: mockHlsInstance };

      const result = await errorHandler.handleUserAction('lower_quality', context);

      expect(result.success).toBe(true);
      expect(result.action).toBe('quality_lowered');
      expect(mockHlsInstance.currentLevel).toBe(2); // Should go to lowest quality
    });

    it('should handle already lowest quality', async () => {
      const mockHlsInstance = {
        levels: [{ height: 480 }],
        currentLevel: 0
      };
      const context = { hlsInstance: mockHlsInstance };

      const result = await errorHandler.handleUserAction('lower_quality', context);

      expect(result.success).toBe(false);
      expect(result.action).toBe('already_lowest_quality');
    });

    it('should handle refresh action', async () => {
      // Mock window.location.reload
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();

      const result = await errorHandler.handleUserAction('refresh', {});

      expect(result.success).toBe(true);
      expect(result.action).toBe('page_refreshed');
      expect(window.location.reload).toHaveBeenCalled();

      // Restore original
      window.location.reload = originalReload;
    });

    it('should handle unknown actions', async () => {
      const result = await errorHandler.handleUserAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.action).toBe('unknown_action');
      expect(result.error).toBe('Unknown action requested');
    });
  });

  describe('event listeners', () => {
    it('should add and remove error listeners', () => {
      const listener = jest.fn();

      errorHandler.addErrorListener(listener);
      expect(errorHandler.errorListeners.has(listener)).toBe(true);

      errorHandler.removeErrorListener(listener);
      expect(errorHandler.errorListeners.has(listener)).toBe(false);
    });

    it('should add and remove recovery listeners', () => {
      const listener = jest.fn();

      errorHandler.addRecoveryListener(listener);
      expect(errorHandler.recoveryListeners.has(listener)).toBe(true);

      errorHandler.removeRecoveryListener(listener);
      expect(errorHandler.recoveryListeners.has(listener)).toBe(false);
    });

    it('should notify error listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      errorHandler.addErrorListener(listener1);
      errorHandler.addErrorListener(listener2);

      const context = { test: 'data' };
      errorHandler.notifyErrorListeners(mockClassifiedError, context);

      expect(listener1).toHaveBeenCalledWith(mockClassifiedError, context);
      expect(listener2).toHaveBeenCalledWith(mockClassifiedError, context);
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener failed');
      });
      const goodListener = jest.fn();

      errorHandler.addErrorListener(faultyListener);
      errorHandler.addErrorListener(goodListener);

      // Should not throw
      expect(() => {
        errorHandler.notifyErrorListeners(mockClassifiedError, {});
      }).not.toThrow();

      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should export diagnostic data', () => {
      errorHandler.logger.exportDiagnosticData = jest.fn().mockReturnValue({ test: 'data' });

      const result = errorHandler.exportDiagnosticData();

      expect(result).toEqual({ test: 'data' });
      expect(errorHandler.logger.exportDiagnosticData).toHaveBeenCalled();
    });

    it('should download diagnostic report', () => {
      errorHandler.logger.downloadDiagnosticReport = jest.fn();

      errorHandler.downloadDiagnosticReport();

      expect(errorHandler.logger.downloadDiagnosticReport).toHaveBeenCalled();
    });

    it('should clear error data', () => {
      errorHandler.logger.clearLogs = jest.fn();
      errorHandler.reportingSystem = {
        clearErrorReports: jest.fn()
      };
      errorHandler.recoveryStrategies.clearAllRetries = jest.fn();

      errorHandler.clearErrorData();

      expect(errorHandler.logger.clearLogs).toHaveBeenCalled();
      expect(errorHandler.reportingSystem.clearErrorReports).toHaveBeenCalled();
      expect(errorHandler.recoveryStrategies.clearAllRetries).toHaveBeenCalled();
    });
  });

  describe('global error handling setup', () => {
    it('should setup global error handlers', () => {
      const mockErrorHandler = {
        handleError: jest.fn()
      };

      // Mock addEventListener
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn();

      MediaErrorHandler.setupGlobalErrorHandling(mockErrorHandler);

      expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function), true);

      // Restore original
      window.addEventListener = originalAddEventListener;
    });
  });
});