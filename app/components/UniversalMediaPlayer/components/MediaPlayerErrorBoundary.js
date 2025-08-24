'use client';

import React, { Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * MediaPlayerErrorBoundary - Comprehensive error handling for media player
 * 
 * Features:
 * - Graceful error recovery with automatic retry
 * - Error classification and intelligent recovery strategies
 * - User-friendly error messages
 * - Error reporting and analytics
 * - Fallback UI with recovery options
 * - Persistent error log for debugging
 */
class MediaPlayerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
      errorHistory: [],
      isRecovering: false,
      recoveryAttempts: 0,
      errorType: null,
      userAction: null
    };
    
    this.maxRecoveryAttempts = 3;
    this.errorResetTimeout = null;
    this.recoveryStrategies = {
      'ChunkLoadError': this.handleChunkError,
      'NetworkError': this.handleNetworkError,
      'MediaError': this.handleMediaError,
      'StreamError': this.handleStreamError,
      'RenderError': this.handleRenderError,
      'MemoryError': this.handleMemoryError,
      'Default': this.handleDefaultError
    };
  }
  
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    const errorType = MediaPlayerErrorBoundary.classifyError(error);
    
    return {
      hasError: true,
      error,
      errorType,
      lastErrorTime: new Date()
    };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    this.logError(error, errorInfo);
    
    // Update error history
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      errorHistory: [
        ...prevState.errorHistory.slice(-9), // Keep last 10 errors
        {
          error: error.toString(),
          errorInfo: errorInfo.componentStack,
          timestamp: new Date(),
          type: prevState.errorType
        }
      ]
    }));
    
    // Attempt automatic recovery based on error type
    this.attemptRecovery();
  }
  
  componentDidUpdate(prevProps) {
    // Reset error boundary if key prop changes (force reset)
    if (this.props.resetKey !== prevProps.resetKey) {
      this.resetErrorBoundary();
    }
  }
  
  componentWillUnmount() {
    if (this.errorResetTimeout) {
      clearTimeout(this.errorResetTimeout);
    }
  }
  
  static classifyError(error) {
    const errorMessage = error?.message || error?.toString() || '';
    
    if (errorMessage.includes('ChunkLoadError') || errorMessage.includes('Loading chunk')) {
      return 'ChunkLoadError';
    }
    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      return 'NetworkError';
    }
    if (errorMessage.includes('Media') || errorMessage.includes('video') || errorMessage.includes('audio')) {
      return 'MediaError';
    }
    if (errorMessage.includes('Stream') || errorMessage.includes('HLS')) {
      return 'StreamError';
    }
    if (errorMessage.includes('render') || errorMessage.includes('React')) {
      return 'RenderError';
    }
    if (errorMessage.includes('memory') || errorMessage.includes('Maximum call stack')) {
      return 'MemoryError';
    }
    
    return 'UnknownError';
  }
  
  logError = (error, errorInfo) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Media Player Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Type:', this.state.errorType);
      console.error('Component Stack:', errorInfo?.componentStack);
      console.groupEnd();
    }
    
    // Send to error reporting service
    if (this.props.onError) {
      this.props.onError({
        error: error.toString(),
        errorInfo: errorInfo?.componentStack,
        errorType: this.state.errorType,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
    
    // Store error in localStorage for debugging
    try {
      const storedErrors = JSON.parse(localStorage.getItem('mediaPlayerErrors') || '[]');
      storedErrors.push({
        error: error.toString(),
        type: this.state.errorType,
        timestamp: new Date().toISOString()
      });
      // Keep only last 20 errors
      localStorage.setItem('mediaPlayerErrors', JSON.stringify(storedErrors.slice(-20)));
    } catch (e) {
      // Ignore localStorage errors
    }
  };
  
  attemptRecovery = async () => {
    const { errorType, recoveryAttempts } = this.state;
    
    if (recoveryAttempts >= this.maxRecoveryAttempts) {
      console.warn('Max recovery attempts reached');
      return;
    }
    
    this.setState({ 
      isRecovering: true, 
      recoveryAttempts: recoveryAttempts + 1 
    });
    
    const strategy = this.recoveryStrategies[errorType] || this.recoveryStrategies.Default;
    
    try {
      await strategy.call(this);
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  };
  
  handleChunkError = async () => {
    console.log('Attempting to recover from chunk load error...');
    
    // Clear module cache
    if ('webpackChunkName' in window) {
      delete window.webpackChunkName;
    }
    
    // Wait a moment and reload
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to reset the component
    this.resetErrorBoundary();
  };
  
  handleNetworkError = async () => {
    console.log('Attempting to recover from network error...');
    
    // Check network connectivity
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      // Wait for network to come back
      await new Promise(resolve => {
        const handleOnline = () => {
          window.removeEventListener('online', handleOnline);
          resolve();
        };
        window.addEventListener('online', handleOnline);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('online', handleOnline);
          resolve();
        }, 30000);
      });
    }
    
    // Retry after a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.resetErrorBoundary();
  };
  
  handleMediaError = async () => {
    console.log('Attempting to recover from media error...');
    
    // Clear video element cache
    const videos = document.getElementsByTagName('video');
    for (let video of videos) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.resetErrorBoundary();
  };
  
  handleStreamError = async () => {
    console.log('Attempting to recover from stream error...');
    
    // Notify parent to retry stream extraction
    if (this.props.onStreamError) {
      this.props.onStreamError();
    }
    
    // Wait longer for stream issues
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.resetErrorBoundary();
  };
  
  handleRenderError = async () => {
    console.log('Attempting to recover from render error...');
    
    // Clear React's internal cache
    if (window.React && window.React.clearCache) {
      window.React.clearCache();
    }
    
    // Short delay and retry
    await new Promise(resolve => setTimeout(resolve, 500));
    this.resetErrorBoundary();
  };
  
  handleMemoryError = async () => {
    console.log('Attempting to recover from memory error...');
    
    // Try to free up memory
    if (global.gc) {
      global.gc();
    }
    
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Longer delay for memory recovery
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.resetErrorBoundary();
  };
  
  handleDefaultError = async () => {
    console.log('Attempting default recovery...');
    
    // Generic recovery with delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.resetErrorBoundary();
  };
  
  resetErrorBoundary = () => {
    console.log('Resetting error boundary...');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      errorType: null,
      userAction: null
    });
    
    // Notify parent of reset
    if (this.props.onReset) {
      this.props.onReset();
    }
  };
  
  handleUserAction = (action) => {
    this.setState({ userAction: action });
    
    switch (action) {
      case 'retry':
        this.resetErrorBoundary();
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'goBack':
        if (this.props.onBack) {
          this.props.onBack();
        }
        break;
      case 'report':
        this.reportError();
        break;
      default:
        break;
    }
  };
  
  reportError = () => {
    const { error, errorInfo, errorType, errorHistory } = this.state;
    
    const report = {
      error: error?.toString(),
      errorInfo: errorInfo?.componentStack,
      errorType,
      errorHistory,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      .then(() => {
        alert('Error report copied to clipboard');
      })
      .catch(() => {
        console.error('Failed to copy error report');
      });
  };
  
  render() {
    const { hasError, error, errorType, isRecovering, recoveryAttempts } = this.state;
    const { children, fallback } = this.props;
    
    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback(error, this.resetErrorBoundary);
      }
      
      // Default error UI
      return (
        <div className={styles.errorBoundary}>
          <AnimatePresence>
            <motion.div
              className={styles.errorContainer}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {/* Error header */}
              <div className={styles.errorHeader}>
                <span className={styles.errorIcon}>
                  {isRecovering ? '🔄' : '⚠️'}
                </span>
                <h2 className={styles.errorTitle}>
                  {isRecovering ? 'Recovering...' : 'Something went wrong'}
                </h2>
              </div>
              
              {/* Error details */}
              <div className={styles.errorDetails}>
                <p className={styles.errorMessage}>
                  {this.getErrorMessage(errorType, error)}
                </p>
                
                {recoveryAttempts > 0 && (
                  <p className={styles.recoveryStatus}>
                    Recovery attempt {recoveryAttempts} of {this.maxRecoveryAttempts}
                  </p>
                )}
                
                {process.env.NODE_ENV === 'development' && (
                  <details className={styles.errorTechnical}>
                    <summary>Technical Details</summary>
                    <pre>{error?.stack || error?.toString()}</pre>
                  </details>
                )}
              </div>
              
              {/* Action buttons */}
              {!isRecovering && (
                <div className={styles.errorActions}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => this.handleUserAction('retry')}
                  >
                    🔄 Try Again
                  </button>
                  
                  <button
                    className={styles.secondaryButton}
                    onClick={() => this.handleUserAction('reload')}
                  >
                    🔃 Reload Page
                  </button>
                  
                  {this.props.onBack && (
                    <button
                      className={styles.secondaryButton}
                      onClick={() => this.handleUserAction('goBack')}
                    >
                      ← Go Back
                    </button>
                  )}
                  
                  <button
                    className={styles.ghostButton}
                    onClick={() => this.handleUserAction('report')}
                  >
                    📋 Copy Error Report
                  </button>
                </div>
              )}
              
              {/* Recovery spinner */}
              {isRecovering && (
                <div className={styles.recoverySpinner}>
                  <motion.div
                    className={styles.spinner}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }
    
    return children;
  }
  
  getErrorMessage(errorType, error) {
    const messages = {
      'ChunkLoadError': 'Failed to load application resources. This might be due to a network issue or outdated cache.',
      'NetworkError': 'Network connection issue detected. Please check your internet connection.',
      'MediaError': 'The media could not be played. The format might not be supported or the file might be corrupted.',
      'StreamError': 'Failed to load the video stream. The source might be unavailable or there might be a connection issue.',
      'RenderError': 'Display error occurred. The page layout might be corrupted.',
      'MemoryError': 'The application is using too much memory. Try closing other tabs or restarting your browser.',
      'UnknownError': 'An unexpected error occurred. Please try again or contact support if the issue persists.'
    };
    
    return messages[errorType] || error?.message || 'An unexpected error occurred.';
  }
}

// Specialized error boundary for stream errors
export class StreamErrorBoundary extends Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    if (error.message?.includes('stream') || error.message?.includes('extraction')) {
      return { hasError: true, error };
    }
    throw error; // Re-throw if not a stream error
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.streamError}>
          <h3>Stream Loading Error</h3>
          <p>Failed to load the video stream. Please try:</p>
          <ul>
            <li>Refreshing the page</li>
            <li>Checking your internet connection</li>
            <li>Trying a different server</li>
          </ul>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Hook for error handling
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);
  
  const resetError = () => setError(null);
  
  const captureError = React.useCallback((error) => {
    console.error('Captured error:', error);
    setError(error);
  }, []);
  
  React.useEffect(() => {
    const handleError = (event) => {
      captureError(new Error(event.message));
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [captureError]);
  
  return { error, resetError, captureError };
};

export default MediaPlayerErrorBoundary;