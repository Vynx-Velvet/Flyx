'use client';

import React from 'react';

/**
 * Error Recovery Utilities
 *
 * Provides intelligent error recovery strategies and utilities
 * for the media player components
 */

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
export const ErrorCategory = {
  NETWORK: 'network',
  MEDIA: 'media',
  STREAM: 'stream',
  CODEC: 'codec',
  PERMISSION: 'permission',
  MEMORY: 'memory',
  UNKNOWN: 'unknown'
};

/**
 * Classify error severity based on type and frequency
 */
export function classifyErrorSeverity(error, errorCount = 1) {
  const errorMessage = error?.message || error?.toString() || '';
  
  // Critical errors
  if (
    errorMessage.includes('CORS') ||
    errorMessage.includes('403') ||
    errorMessage.includes('401') ||
    errorCount > 5
  ) {
    return ErrorSeverity.CRITICAL;
  }
  
  // High severity
  if (
    errorMessage.includes('404') ||
    errorMessage.includes('500') ||
    errorMessage.includes('memory') ||
    errorCount > 3
  ) {
    return ErrorSeverity.HIGH;
  }
  
  // Medium severity
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorCount > 1
  ) {
    return ErrorSeverity.MEDIUM;
  }
  
  // Low severity
  return ErrorSeverity.LOW;
}

/**
 * Get recovery strategy based on error type
 */
export function getRecoveryStrategy(error, context = {}) {
  const errorMessage = error?.message || error?.toString() || '';
  const { retryCount = 0, lastRetry = null } = context;
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      strategy: 'exponential-backoff',
      delay: Math.min(1000 * Math.pow(2, retryCount), 30000),
      maxRetries: 5,
      action: 'retry-request'
    };
  }
  
  // Stream errors
  if (errorMessage.includes('stream') || errorMessage.includes('HLS')) {
    return {
      strategy: 'fallback-quality',
      delay: 2000,
      maxRetries: 3,
      action: 'switch-quality'
    };
  }
  
  // Media errors
  if (errorMessage.includes('decode') || errorMessage.includes('codec')) {
    return {
      strategy: 'format-fallback',
      delay: 0,
      maxRetries: 1,
      action: 'change-format'
    };
  }
  
  // Memory errors
  if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
    return {
      strategy: 'resource-cleanup',
      delay: 1000,
      maxRetries: 2,
      action: 'clear-cache'
    };
  }
  
  // Default strategy
  return {
    strategy: 'simple-retry',
    delay: 1000,
    maxRetries: 3,
    action: 'retry'
  };
}

/**
 * Execute recovery action
 */
export async function executeRecovery(strategy, callbacks = {}) {
  const {
    onRetry,
    onQualityChange,
    onFormatChange,
    onCacheClear,
    onFallback
  } = callbacks;
  
  switch (strategy.action) {
    case 'retry-request':
    case 'retry':
      if (onRetry) {
        await delay(strategy.delay);
        return onRetry();
      }
      break;
      
    case 'switch-quality':
      if (onQualityChange) {
        await delay(strategy.delay);
        return onQualityChange();
      }
      break;
      
    case 'change-format':
      if (onFormatChange) {
        return onFormatChange();
      }
      break;
      
    case 'clear-cache':
      if (onCacheClear) {
        await clearMediaCache();
        await delay(strategy.delay);
        return onCacheClear();
      }
      break;
      
    default:
      if (onFallback) {
        return onFallback();
      }
  }
}

/**
 * Clear media-related caches
 */
export async function clearMediaCache() {
  try {
    // Clear video element buffers
    const videos = document.getElementsByTagName('video');
    for (let video of videos) {
      if (video.buffered.length > 0) {
        video.pause();
        video.currentTime = 0;
        video.load();
      }
    }
    
    // Clear service worker caches if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const mediaCaches = cacheNames.filter(name => 
        name.includes('media') || name.includes('video') || name.includes('stream')
      );
      await Promise.all(mediaCaches.map(name => caches.delete(name)));
    }
    
    // Clear IndexedDB media data if available
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases?.() || [];
      for (const db of databases) {
        if (db.name?.includes('media')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    console.warn('Failed to clear media cache:', error);
  }
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error, context = {}) {
  const errorMessage = error?.message || error?.toString() || '';
  const { retryCount = 0 } = context;
  
  // Non-recoverable errors
  const nonRecoverable = [
    'CORS',
    '403 Forbidden',
    '401 Unauthorized',
    'Invalid source',
    'Unsupported format'
  ];
  
  if (nonRecoverable.some(msg => errorMessage.includes(msg))) {
    return false;
  }
  
  // Max retries exceeded
  if (retryCount > 10) {
    return false;
  }
  
  return true;
}

/**
 * Create error report for analytics
 */
export function createErrorReport(error, context = {}) {
  const {
    component = 'Unknown',
    action = 'Unknown',
    metadata = {}
  } = context;
  
  return {
    timestamp: new Date().toISOString(),
    component,
    action,
    error: {
      message: error?.message || error?.toString(),
      stack: error?.stack,
      name: error?.name
    },
    context: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata
    },
    severity: classifyErrorSeverity(error),
    category: categorizeError(error)
  };
}

/**
 * Categorize error type
 */
function categorizeError(error) {
  const errorMessage = error?.message || error?.toString() || '';
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }
  if (errorMessage.includes('media') || errorMessage.includes('video')) {
    return ErrorCategory.MEDIA;
  }
  if (errorMessage.includes('stream') || errorMessage.includes('HLS')) {
    return ErrorCategory.STREAM;
  }
  if (errorMessage.includes('codec') || errorMessage.includes('decode')) {
    return ErrorCategory.CODEC;
  }
  if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return ErrorCategory.PERMISSION;
  }
  if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
    return ErrorCategory.MEMORY;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Delay utility
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Error recovery hook
 */
export function useErrorRecovery(options = {}) {
  const {
    maxRetries = 3,
    onError,
    onRecovery,
    onMaxRetriesExceeded
  } = options;
  
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [lastError, setLastError] = React.useState(null);
  
  const handleError = React.useCallback(async (error) => {
    setLastError(error);
    
    if (!isRecoverableError(error, { retryCount })) {
      if (onError) onError(error);
      return false;
    }
    
    if (retryCount >= maxRetries) {
      if (onMaxRetriesExceeded) onMaxRetriesExceeded(error);
      return false;
    }
    
    setIsRecovering(true);
    const strategy = getRecoveryStrategy(error, { retryCount });
    
    try {
      await executeRecovery(strategy, {
        onRetry: () => {
          setRetryCount(prev => prev + 1);
          if (onRecovery) onRecovery();
        }
      });
      
      setIsRecovering(false);
      return true;
    } catch (recoveryError) {
      setIsRecovering(false);
      if (onError) onError(recoveryError);
      return false;
    }
  }, [retryCount, maxRetries, onError, onRecovery, onMaxRetriesExceeded]);
  
  const reset = React.useCallback(() => {
    setRetryCount(0);
    setIsRecovering(false);
    setLastError(null);
  }, []);
  
  return {
    handleError,
    reset,
    retryCount,
    isRecovering,
    lastError
  };
}

/**
 * Network health monitor
 */
export class NetworkHealthMonitor {
  constructor(options = {}) {
    this.checkInterval = options.checkInterval || 5000;
    this.healthEndpoint = options.healthEndpoint || '/api/health';
    this.onStatusChange = options.onStatusChange || (() => {});
    this.isMonitoring = false;
    this.intervalId = null;
    this.status = 'unknown';
  }
  
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.check(); // Initial check
    
    this.intervalId = setInterval(() => {
      this.check();
    }, this.checkInterval);
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }
  
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
  
  handleOnline = () => {
    this.updateStatus('online');
  };
  
  handleOffline = () => {
    this.updateStatus('offline');
  };
  
  async check() {
    if (!navigator.onLine) {
      this.updateStatus('offline');
      return;
    }
    
    try {
      const response = await fetch(this.healthEndpoint, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        this.updateStatus('healthy');
      } else {
        this.updateStatus('degraded');
      }
    } catch (error) {
      this.updateStatus('error');
    }
  }
  
  updateStatus(newStatus) {
    if (this.status !== newStatus) {
      const oldStatus = this.status;
      this.status = newStatus;
      this.onStatusChange(newStatus, oldStatus);
    }
  }
  
  getStatus() {
    return this.status;
  }
}

// Export React hooks
export { useErrorHandler } from '../components/MediaPlayerErrorBoundary';

export default {
  ErrorSeverity,
  ErrorCategory,
  classifyErrorSeverity,
  getRecoveryStrategy,
  executeRecovery,
  clearMediaCache,
  isRecoverableError,
  createErrorReport,
  useErrorRecovery,
  NetworkHealthMonitor
};