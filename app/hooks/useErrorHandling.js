/**
 * React hook for integrating error handling system with React components
 * Provides easy access to error handling functionality in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { mediaErrorHandler } from '../utils/errorHandling/MediaErrorHandler.js';

export function useErrorHandling() {
  const [currentError, setCurrentError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [userMessage, setUserMessage] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  
  const errorListenerRef = useRef(null);
  const recoveryListenerRef = useRef(null);

  // Error listener
  const handleError = useCallback((classifiedError, context) => {
    setCurrentError(classifiedError);
    setShowErrorDialog(true);
  }, []);

  // Recovery listener
  const handleRecovery = useCallback((event, classifiedError, context, result) => {
    switch (event) {
      case 'recovery_started':
        setIsRecovering(true);
        setRecoveryProgress(0);
        break;
      
      case 'recovery_completed':
        setIsRecovering(false);
        setRecoveryProgress(100);
        if (result?.success) {
          setShowErrorDialog(false);
          setCurrentError(null);
          setUserMessage({
            type: 'success',
            message: `Recovery successful: ${result.action}`,
            duration: 3000
          });
        }
        break;
      
      case 'recovery_failed':
        setIsRecovering(false);
        setRecoveryProgress(0);
        setUserMessage({
          type: 'error',
          message: 'Automatic recovery failed. Please try manual recovery options.',
          duration: 5000
        });
        break;
    }
  }, []);

  // Setup listeners
  useEffect(() => {
    errorListenerRef.current = handleError;
    recoveryListenerRef.current = handleRecovery;
    
    mediaErrorHandler.addErrorListener(handleError);
    mediaErrorHandler.addRecoveryListener(handleRecovery);
    
    return () => {
      mediaErrorHandler.removeErrorListener(handleError);
      mediaErrorHandler.removeRecoveryListener(handleRecovery);
    };
  }, [handleError, handleRecovery]);

  // Main error handling function
  const reportError = useCallback(async (error, context = {}) => {
    try {
      const result = await mediaErrorHandler.handleError(error, context);
      
      if (result.userMessage) {
        setUserMessage({
          type: result.classifiedError?.severity || 'error',
          ...result.userMessage
        });
      }
      
      return result;
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError);
      setUserMessage({
        type: 'error',
        title: 'System Error',
        message: 'An unexpected error occurred. Please refresh the page.',
        actions: [
          { label: 'Refresh Page', action: 'refresh', primary: true }
        ]
      });
      return null;
    }
  }, []);

  // Handle user actions
  const handleUserAction = useCallback(async (action, context = {}) => {
    setRecoveryProgress(0);
    
    try {
      const result = await mediaErrorHandler.handleUserAction(action, {
        ...context,
        classifiedError: currentError
      });
      
      if (result.success) {
        setUserMessage({
          type: 'success',
          message: `Action completed: ${result.action}`,
          duration: 3000
        });
        
        if (action === 'retry' || action === 'restart_player') {
          setShowErrorDialog(false);
          setCurrentError(null);
        }
      } else {
        setUserMessage({
          type: 'error',
          message: `Action failed: ${result.error || result.action}`,
          duration: 5000
        });
      }
      
      return result;
    } catch (error) {
      console.error('User action failed:', error);
      setUserMessage({
        type: 'error',
        message: 'Action failed due to an unexpected error.',
        duration: 5000
      });
      return { success: false, error };
    }
  }, [currentError]);

  // Dismiss error dialog
  const dismissError = useCallback(() => {
    setShowErrorDialog(false);
    setCurrentError(null);
    setUserMessage(null);
  }, []);

  // Dismiss user message
  const dismissMessage = useCallback(() => {
    setUserMessage(null);
  }, []);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    return mediaErrorHandler.getErrorStatistics();
  }, []);

  // Export diagnostic data
  const exportDiagnostics = useCallback(() => {
    mediaErrorHandler.downloadDiagnosticReport();
  }, []);

  // Clear error data
  const clearErrorData = useCallback(() => {
    mediaErrorHandler.clearErrorData();
    setCurrentError(null);
    setUserMessage(null);
    setShowErrorDialog(false);
  }, []);

  return {
    // State
    currentError,
    isRecovering,
    recoveryProgress,
    userMessage,
    showErrorDialog,
    
    // Actions
    reportError,
    handleUserAction,
    dismissError,
    dismissMessage,
    
    // Utilities
    getErrorStats,
    exportDiagnostics,
    clearErrorData
  };
}

// Hook for specific error types
export function useExtractionErrorHandling() {
  const { reportError, handleUserAction, ...rest } = useErrorHandling();
  
  const reportExtractionError = useCallback((error, context = {}) => {
    return reportError(error, { ...context, source: 'extraction' });
  }, [reportError]);
  
  return {
    ...rest,
    reportExtractionError,
    handleUserAction
  };
}

export function usePlaybackErrorHandling() {
  const { reportError, handleUserAction, ...rest } = useErrorHandling();
  
  const reportPlaybackError = useCallback((error, context = {}) => {
    return reportError(error, { ...context, source: 'playback' });
  }, [reportError]);
  
  return {
    ...rest,
    reportPlaybackError,
    handleUserAction
  };
}

export function useSubtitleErrorHandling() {
  const { reportError, handleUserAction, ...rest } = useErrorHandling();
  
  const reportSubtitleError = useCallback((error, context = {}) => {
    return reportError(error, { ...context, source: 'subtitle' });
  }, [reportError]);
  
  return {
    ...rest,
    reportSubtitleError,
    handleUserAction
  };
}