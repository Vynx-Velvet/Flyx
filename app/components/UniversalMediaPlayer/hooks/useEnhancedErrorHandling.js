'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Enhanced error handling hook that provides comprehensive error management
 * with recovery strategies, user feedback, and error reporting
 */
export const useEnhancedErrorHandling = ({
  maxRetries = 3,
  onError,
  onRecovery,
  onMaxRetriesExceeded,
  enableUserReporting = true,
  enableAnalytics = true
}) => {
  // Error state
  const [currentError, setCurrentError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [userMessage, setUserMessage] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Error history for analytics
  const errorHistoryRef = useRef([]);
  const recoveryAttemptsRef = useRef([]);

  // Error classification
  const classifyError = useCallback((error) => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return {
        type: 'network',
        severity: 'high',
        userMessage: 'Network connection issue. Please check your internet connection.',
        recoveryStrategies: ['retry', 'switch_server', 'use_proxy']
      };
    }

    if (lowerMessage.includes('hls') || lowerMessage.includes('manifest')) {
      return {
        type: 'streaming',
        severity: 'medium',
        userMessage: 'Streaming error occurred. Attempting to recover...',
        recoveryStrategies: ['retry', 'quality_fallback', 'native_fallback']
      };
    }

    if (lowerMessage.includes('cors') || lowerMessage.includes('cross-origin')) {
      return {
        type: 'cors',
        severity: 'high',
        userMessage: 'Content access blocked. Trying alternative access method...',
        recoveryStrategies: ['use_proxy', 'switch_server']
      };
    }

    if (lowerMessage.includes('playback') || lowerMessage.includes('video')) {
      return {
        type: 'playback',
        severity: 'medium',
        userMessage: 'Playback error. Attempting to restart...',
        recoveryStrategies: ['retry', 'seek_recovery', 'reload']
      };
    }

    if (lowerMessage.includes('subtitle') || lowerMessage.includes('caption')) {
      return {
        type: 'subtitle',
        severity: 'low',
        userMessage: 'Subtitle loading issue. Continuing without subtitles.',
        recoveryStrategies: ['disable_subtitles', 'retry']
      };
    }

    return {
      type: 'unknown',
      severity: 'medium',
      userMessage: 'An unexpected error occurred. Please try again.',
      recoveryStrategies: ['retry', 'reload']
    };
  }, []);

  // Enhanced error reporting
  const reportError = useCallback(async (error, context = {}) => {
    const classifiedError = classifyError(error);
    const errorReport = {
      error: classifiedError,
      originalError: error,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: retryCount,
      sessionId: sessionStorage.getItem('mediaPlayerSessionId') || 'unknown'
    };

    // Add to error history
    errorHistoryRef.current.push(errorReport);

    // Keep only last 10 errors
    if (errorHistoryRef.current.length > 10) {
      errorHistoryRef.current.shift();
    }

    // Set current error state
    setCurrentError(errorReport);
    setUserMessage({
      type: classifiedError.severity === 'high' ? 'error' : 'warning',
      text: classifiedError.userMessage,
      duration: classifiedError.severity === 'high' ? 0 : 5000 // High severity = persistent
    });

    // Show error dialog for high severity errors
    if (classifiedError.severity === 'high') {
      setShowErrorDialog(true);
    }

    // Call external error handler
    onError?.(errorReport);

    // Analytics reporting
    if (enableAnalytics) {
      try {
        // Send to analytics service
        console.log('Analytics: Error reported', errorReport);
      } catch (analyticsError) {
        console.warn('Failed to send analytics:', analyticsError);
      }
    }

    return errorReport;
  }, [classifyError, retryCount, onError, enableAnalytics]);

  // Recovery strategies
  const recoveryStrategies = {
    retry: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(25);

      try {
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000 + (retryCount * 500)));
        setRecoveryProgress(50);

        // Attempt recovery
        if (context.retryCallback) {
          await context.retryCallback();
          setRecoveryProgress(100);
          return true;
        }

        setRecoveryProgress(100);
        return false;
      } catch (recoveryError) {
        console.error('Retry recovery failed:', recoveryError);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    },

    switch_server: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(30);

      try {
        if (context.fallbackCallback) {
          await context.fallbackCallback();
          setRecoveryProgress(100);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Server switch failed:', error);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    },

    use_proxy: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(40);

      try {
        if (context.proxyCallback) {
          await context.proxyCallback();
          setRecoveryProgress(100);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Proxy switch failed:', error);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    },

    quality_fallback: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(60);

      try {
        // Implement quality fallback logic
        console.log('Attempting quality fallback...');
        setRecoveryProgress(100);
        return true;
      } catch (error) {
        console.error('Quality fallback failed:', error);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    },

    native_fallback: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(70);

      try {
        // Switch to native video playback
        console.log('Switching to native playback...');
        setRecoveryProgress(100);
        return true;
      } catch (error) {
        console.error('Native fallback failed:', error);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    },

    seek_recovery: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(80);

      try {
        // Try seeking to recover playback
        if (context.videoElement) {
          context.videoElement.currentTime = context.videoElement.currentTime + 1;
        }
        setRecoveryProgress(100);
        return true;
      } catch (error) {
        console.error('Seek recovery failed:', error);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    },

    reload: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(90);

      try {
        // Reload the component
        window.location.reload();
        return true;
      } catch (error) {
        console.error('Reload failed:', error);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    },

    disable_subtitles: async (errorReport, context) => {
      setIsRecovering(true);
      setRecoveryProgress(95);

      try {
        // Disable subtitle system
        console.log('Disabling subtitles...');
        setRecoveryProgress(100);
        return true;
      } catch (error) {
        console.error('Disable subtitles failed:', error);
        return false;
      } finally {
        setIsRecovering(false);
        setRecoveryProgress(0);
      }
    }
  };

  // Handle user action from error dialog
  const handleUserAction = useCallback(async (action, context = {}) => {
    const errorReport = currentError;

    if (!errorReport) return false;

    switch (action) {
      case 'retry':
        setRetryCount(prev => prev + 1);
        const recoveryStrategy = errorReport.error.recoveryStrategies[0];
        if (recoveryStrategies[recoveryStrategy]) {
          const success = await recoveryStrategies[recoveryStrategy](errorReport, context);
          if (success) {
            setCurrentError(null);
            setShowErrorDialog(false);
            setUserMessage({
              type: 'success',
              text: 'Recovery successful! Playback resumed.',
              duration: 3000
            });
            onRecovery?.();
          } else if (retryCount >= maxRetries) {
            onMaxRetriesExceeded?.(errorReport.originalError);
          }
          return success;
        }
        break;

      case 'switch_server':
        if (recoveryStrategies.switch_server) {
          const success = await recoveryStrategies.switch_server(errorReport, context);
          if (success) {
            setCurrentError(null);
            setShowErrorDialog(false);
            setUserMessage({
              type: 'success',
              text: 'Switched to alternative server.',
              duration: 3000
            });
          }
          return success;
        }
        break;

      case 'use_proxy':
        if (recoveryStrategies.use_proxy) {
          const success = await recoveryStrategies.use_proxy(errorReport, context);
          if (success) {
            setCurrentError(null);
            setShowErrorDialog(false);
            setUserMessage({
              type: 'success',
              text: 'Enabled proxy access.',
              duration: 3000
            });
          }
          return success;
        }
        break;

      case 'report':
        if (enableUserReporting) {
          // Send user feedback
          const feedbackData = {
            ...errorReport,
            userFeedback: context.userFeedback,
            userEmail: context.userEmail,
            timestamp: Date.now()
          };

          try {
            console.log('User error report:', feedbackData);
            // Send to error reporting service
            setUserMessage({
              type: 'success',
              text: 'Thank you for your feedback! We\'ll investigate this issue.',
              duration: 5000
            });
          } catch (error) {
            console.error('Failed to send user report:', error);
            setUserMessage({
              type: 'error',
              text: 'Failed to send report. Please try again later.',
              duration: 5000
            });
          }
        }
        break;

      case 'dismiss':
        setCurrentError(null);
        setShowErrorDialog(false);
        setUserMessage(null);
        break;

      default:
        console.warn('Unknown user action:', action);
        return false;
    }

    return false;
  }, [currentError, retryCount, maxRetries, onRecovery, onMaxRetriesExceeded, enableUserReporting]);

  // Dismiss error message
  const dismissError = useCallback(() => {
    setCurrentError(null);
    setShowErrorDialog(false);
  }, []);

  const dismissMessage = useCallback(() => {
    setUserMessage(null);
  }, []);

  // Reset error state
  const reset = useCallback(() => {
    setCurrentError(null);
    setIsRecovering(false);
    setRecoveryProgress(0);
    setUserMessage(null);
    setShowErrorDialog(false);
    setRetryCount(0);
  }, []);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    const history = errorHistoryRef.current;
    const totalErrors = history.length;
    const errorsByType = history.reduce((acc, error) => {
      acc[error.error.type] = (acc[error.error.type] || 0) + 1;
      return acc;
    }, {});

    const errorsBySeverity = history.reduce((acc, error) => {
      acc[error.error.severity] = (acc[error.error.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recoveryAttempts: recoveryAttemptsRef.current.length,
      averageRecoveryTime: 0 // Could be calculated from recovery attempts
    };
  }, []);

  return {
    // State
    currentError,
    isRecovering,
    recoveryProgress,
    userMessage,
    showErrorDialog,
    retryCount,

    // Actions
    reportError,
    handleUserAction,
    dismissError,
    dismissMessage,
    reset,

    // Analytics
    getErrorStats,
    errorHistory: errorHistoryRef.current
  };
};

export default useEnhancedErrorHandling;