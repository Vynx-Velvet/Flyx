/**
 * Main error handler that integrates all error handling components
 * Provides a unified interface for error handling across the media playback system
 */

import { ErrorClassifier } from './ErrorClassifier.js';
import { RecoveryStrategies } from './RecoveryStrategies.js';
import { DiagnosticLogger } from './DiagnosticLogger.js';
import { UserFriendlyMessages } from './UserFriendlyMessages.js';
import { ErrorReportingSystem } from './ErrorReportingSystem.js';

export class MediaErrorHandler {
  constructor() {
    this.classifier = new ErrorClassifier();
    this.recoveryStrategies = new RecoveryStrategies();
    this.logger = new DiagnosticLogger();
    this.userMessages = new UserFriendlyMessages();
    this.reportingSystem = new ErrorReportingSystem();
    
    this.errorListeners = new Set();
    this.recoveryListeners = new Set();
    this.isRecovering = false;
    this.currentRecoveryPromise = null;
  }

  /**
   * Main error handling method
   * Classifies error, attempts recovery, and provides user feedback
   */
  async handleError(error, context = {}) {
    try {
      // Classify the error
      const classifiedError = ErrorClassifier.classify(error, context);
      
      // Log the error
      this.logger.logError(classifiedError, context);
      
      // Notify error listeners
      this.notifyErrorListeners(classifiedError, context);
      
      // Get user-friendly message
      const userMessage = UserFriendlyMessages.getErrorMessage(classifiedError, context);
      
      // Attempt recovery if possible
      let recoveryResult = null;
      if (classifiedError.recoverable && !this.isRecovering) {
        recoveryResult = await this.attemptRecovery(classifiedError, context);
      }
      
      return {
        classifiedError,
        userMessage,
        recoveryResult,
        canRetry: classifiedError.retryable,
        canRecover: classifiedError.recoverable,
        requiresUserAction: recoveryResult?.requiresUserAction || false
      };
    } catch (handlingError) {
      // If error handling itself fails, log it and return basic response
      console.error('Error handling failed:', handlingError);
      this.logger.logError(
        ErrorClassifier.classify(handlingError, { source: 'error_handler' }),
        { originalError: error, context }
      );
      
      return {
        classifiedError: null,
        userMessage: {
          title: "System Error",
          message: "An unexpected error occurred in the error handling system. Please refresh the page.",
          actions: [
            { label: "Refresh Page", action: "refresh", primary: true },
            { label: "Report Issue", action: "report" }
          ]
        },
        recoveryResult: null,
        canRetry: true,
        canRecover: false,
        requiresUserAction: true
      };
    }
  }

  /**
   * Attempt automatic recovery for recoverable errors
   */
  async attemptRecovery(classifiedError, context = {}) {
    if (this.isRecovering) {
      return this.currentRecoveryPromise;
    }

    this.isRecovering = true;
    this.currentRecoveryPromise = this._performRecovery(classifiedError, context);
    
    try {
      const result = await this.currentRecoveryPromise;
      return result;
    } finally {
      this.isRecovering = false;
      this.currentRecoveryPromise = null;
    }
  }

  async _performRecovery(classifiedError, context) {
    try {
      // Notify recovery listeners that recovery is starting
      this.notifyRecoveryListeners('recovery_started', classifiedError, context);
      
      // Execute recovery strategy
      const recoveryResult = await this.recoveryStrategies.executeRecovery(classifiedError, context);
      
      // Notify recovery listeners of the result
      this.notifyRecoveryListeners('recovery_completed', classifiedError, context, recoveryResult);
      
      return recoveryResult;
    } catch (recoveryError) {
      // Recovery failed
      const failureResult = {
        success: false,
        action: 'recovery_failed',
        error: recoveryError,
        requiresUserAction: true
      };
      
      this.notifyRecoveryListeners('recovery_failed', classifiedError, context, failureResult);
      return failureResult;
    }
  }

  /**
   * Handle user-initiated actions (retry, fallback, etc.)
   */
  async handleUserAction(action, context = {}) {
    this.logger.logUserAction(action, context);
    
    switch (action) {
      case 'retry':
        return await this.handleRetry(context);
      
      case 'restart_player':
        return await this.handleRestartPlayer(context);
      
      case 'fallback_server':
        return await this.handleFallbackServer(context);
      
      case 'use_proxy':
        return await this.handleUseProxy(context);
      
      case 'lower_quality':
        return await this.handleLowerQuality(context);
      
      case 'resync_subtitles':
        return await this.handleResyncSubtitles(context);
      
      case 'report':
        return await this.handleReportError(context);
      
      case 'refresh':
        window.location.reload();
        return { success: true, action: 'page_refreshed' };
      
      default:
        return { success: false, action: 'unknown_action', error: 'Unknown action requested' };
    }
  }

  async handleRetry(context) {
    const { originalError, retryCount = 0 } = context;
    
    if (retryCount >= 3) {
      return { success: false, action: 'max_retries_exceeded' };
    }
    
    // Wait with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Trigger retry through context callback
    if (context.retryCallback && typeof context.retryCallback === 'function') {
      try {
        await context.retryCallback();
        return { success: true, action: 'retry_successful', retryCount: retryCount + 1 };
      } catch (error) {
        return await this.handleError(error, { ...context, retryCount: retryCount + 1 });
      }
    }
    
    return { success: false, action: 'no_retry_callback' };
  }

  async handleRestartPlayer(context) {
    const { hlsInstance, videoElement, currentTime } = context;
    
    if (!hlsInstance || !videoElement) {
      return { success: false, action: 'missing_player_context' };
    }
    
    try {
      // Save current position
      const savedTime = currentTime || videoElement.currentTime;
      
      // Destroy and recreate HLS instance
      hlsInstance.destroy();
      
      // Trigger player restart through callback
      if (context.restartCallback && typeof context.restartCallback === 'function') {
        await context.restartCallback(savedTime);
        return { success: true, action: 'player_restarted', resumeTime: savedTime };
      }
      
      return { success: false, action: 'no_restart_callback' };
    } catch (error) {
      return { success: false, action: 'restart_failed', error };
    }
  }

  async handleFallbackServer(context) {
    const { movieId, seasonId, episodeId, currentServer } = context;
    
    if (context.fallbackCallback && typeof context.fallbackCallback === 'function') {
      try {
        await context.fallbackCallback();
        return { success: true, action: 'server_fallback_initiated' };
      } catch (error) {
        return { success: false, action: 'server_fallback_failed', error };
      }
    }
    
    return { success: false, action: 'no_fallback_callback' };
  }

  async handleUseProxy(context) {
    if (context.proxyCallback && typeof context.proxyCallback === 'function') {
      try {
        await context.proxyCallback();
        return { success: true, action: 'proxy_enabled' };
      } catch (error) {
        return { success: false, action: 'proxy_failed', error };
      }
    }
    
    return { success: false, action: 'no_proxy_callback' };
  }

  async handleLowerQuality(context) {
    const { hlsInstance } = context;
    
    if (!hlsInstance) {
      return { success: false, action: 'missing_hls_instance' };
    }
    
    try {
      const levels = hlsInstance.levels;
      const currentLevel = hlsInstance.currentLevel;
      
      // Find a lower quality level
      let targetLevel = -1;
      for (let i = levels.length - 1; i >= 0; i--) {
        if (i < currentLevel || currentLevel === -1) {
          targetLevel = i;
          break;
        }
      }
      
      if (targetLevel >= 0) {
        hlsInstance.currentLevel = targetLevel;
        return { 
          success: true, 
          action: 'quality_lowered', 
          newLevel: targetLevel,
          newQuality: levels[targetLevel]?.height || 'unknown'
        };
      }
      
      return { success: false, action: 'already_lowest_quality' };
    } catch (error) {
      return { success: false, action: 'quality_change_failed', error };
    }
  }

  async handleResyncSubtitles(context) {
    const { subtitleManager, videoElement } = context;
    
    if (!subtitleManager || !videoElement) {
      return { success: false, action: 'missing_subtitle_context' };
    }
    
    try {
      const currentTime = videoElement.currentTime;
      subtitleManager.resyncSubtitles(currentTime);
      return { success: true, action: 'subtitles_resynced', syncTime: currentTime };
    } catch (error) {
      return { success: false, action: 'subtitle_resync_failed', error };
    }
  }

  async handleReportError(context) {
    const { classifiedError, userFeedback } = context;
    
    if (!classifiedError) {
      return { success: false, action: 'no_error_to_report' };
    }
    
    try {
      const result = await this.reportingSystem.reportError(classifiedError, context, userFeedback);
      return { success: result.success, action: 'error_reported', reportId: result.reportId };
    } catch (error) {
      return { success: false, action: 'report_failed', error };
    }
  }

  // Event listener management

  addErrorListener(listener) {
    this.errorListeners.add(listener);
  }

  removeErrorListener(listener) {
    this.errorListeners.delete(listener);
  }

  addRecoveryListener(listener) {
    this.recoveryListeners.add(listener);
  }

  removeRecoveryListener(listener) {
    this.recoveryListeners.delete(listener);
  }

  notifyErrorListeners(classifiedError, context) {
    this.errorListeners.forEach(listener => {
      try {
        listener(classifiedError, context);
      } catch (error) {
        console.error('Error listener failed:', error);
      }
    });
  }

  notifyRecoveryListeners(event, classifiedError, context, result = null) {
    this.recoveryListeners.forEach(listener => {
      try {
        listener(event, classifiedError, context, result);
      } catch (error) {
        console.error('Recovery listener failed:', error);
      }
    });
  }

  // Utility methods

  exportDiagnosticData() {
    return this.logger.exportDiagnosticData();
  }

  downloadDiagnosticReport() {
    this.logger.downloadDiagnosticReport();
  }

  getErrorStatistics() {
    return this.reportingSystem.getErrorStatistics();
  }

  clearErrorData() {
    this.logger.clearLogs();
    this.reportingSystem.clearErrorReports();
    this.recoveryStrategies.clearAllRetries();
  }

  // Global error handler setup
  static setupGlobalErrorHandling(errorHandler) {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.handleError(event.reason, { source: 'unhandled_promise' });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      errorHandler.handleError(event.error, { 
        source: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        errorHandler.handleError(new Error(`Resource failed to load: ${event.target.src || event.target.href}`), {
          source: 'resource_error',
          element: event.target.tagName,
          url: event.target.src || event.target.href
        });
      }
    }, true);
  }
}

// Create and export a singleton instance
export const mediaErrorHandler = new MediaErrorHandler();

// Setup global error handling
MediaErrorHandler.setupGlobalErrorHandling(mediaErrorHandler);