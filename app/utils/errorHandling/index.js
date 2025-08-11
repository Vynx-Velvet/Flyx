/**
 * Error handling system exports
 * Provides a unified interface for importing error handling components
 */

// Core error handling components
export { ErrorTypes, ErrorSeverity, ErrorCategory } from './ErrorTypes.js';
export { ErrorClassifier } from './ErrorClassifier.js';
export { RecoveryStrategies } from './RecoveryStrategies.js';
export { DiagnosticLogger } from './DiagnosticLogger.js';
export { UserFriendlyMessages } from './UserFriendlyMessages.js';
export { ErrorReportingSystem } from './ErrorReportingSystem.js';
export { MediaErrorHandler, mediaErrorHandler } from './MediaErrorHandler.js';

// React integration
export { 
  useErrorHandling, 
  useExtractionErrorHandling, 
  usePlaybackErrorHandling, 
  useSubtitleErrorHandling 
} from '../hooks/useErrorHandling.js';

// UI components
export { ErrorDialog } from '../components/ErrorHandling/ErrorDialog.js';
export { ErrorToast, ErrorToastContainer } from '../components/ErrorHandling/ErrorToast.js';

// Integration utilities
export { 
  ErrorHandlingIntegration,
  UniversalMediaPlayerWithErrorHandling,
  reportExtractionError,
  reportSubtitleError
} from '../components/UniversalMediaPlayer/ErrorHandlingIntegration.js';

// Quick setup function for easy integration
export function setupErrorHandling(options = {}) {
  const {
    enableGlobalHandling = true,
    enableConsoleLogging = true,
    enableErrorReporting = true,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  // Configure the global error handler
  if (enableGlobalHandling) {
    MediaErrorHandler.setupGlobalErrorHandling(mediaErrorHandler);
  }

  // Configure logging
  if (!enableConsoleLogging) {
    // Disable console output (would need to be implemented in DiagnosticLogger)
    console.warn('Console logging disable not yet implemented');
  }

  // Configure error reporting
  if (!enableErrorReporting) {
    // Disable error reporting (would need to be implemented in ErrorReportingSystem)
    console.warn('Error reporting disable not yet implemented');
  }

  // Configure retry settings
  if (mediaErrorHandler.recoveryStrategies) {
    mediaErrorHandler.recoveryStrategies.maxRetries = maxRetries;
    // Additional configuration would go here
  }

  return mediaErrorHandler;
}

// Error handling utilities
export const ErrorHandlingUtils = {
  // Check if an error is recoverable
  isRecoverable: (error) => {
    const classified = ErrorClassifier.classify(error);
    return classified.recoverable;
  },

  // Check if an error is retryable
  isRetryable: (error) => {
    const classified = ErrorClassifier.classify(error);
    return classified.retryable;
  },

  // Get error severity
  getSeverity: (error) => {
    const classified = ErrorClassifier.classify(error);
    return classified.severity;
  },

  // Get user-friendly error message
  getUserMessage: (error, context = {}) => {
    const classified = ErrorClassifier.classify(error, context);
    return UserFriendlyMessages.getErrorMessage(classified, context);
  },

  // Create error report
  createErrorReport: async (error, context = {}, userFeedback = null) => {
    const classified = ErrorClassifier.classify(error, context);
    const reportingSystem = new ErrorReportingSystem();
    return await reportingSystem.reportError(classified, context, userFeedback);
  },

  // Export diagnostic data
  exportDiagnostics: () => {
    return mediaErrorHandler.exportDiagnosticData();
  },

  // Get error statistics
  getErrorStats: () => {
    return mediaErrorHandler.getErrorStatistics();
  }
};

// Default export for convenience
export default {
  mediaErrorHandler,
  setupErrorHandling,
  ErrorHandlingUtils,
  ErrorTypes,
  ErrorSeverity,
  ErrorCategory
};