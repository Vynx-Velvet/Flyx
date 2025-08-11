/**
 * Error classification and metadata system
 * Provides detailed error context and recovery information
 */

import { ErrorTypes, ErrorSeverity, ErrorCategory } from './ErrorTypes.js';

export class ErrorClassifier {
  static classify(error, context = {}) {
    const errorType = this.determineErrorType(error, context);
    const severity = this.determineSeverity(errorType, error);
    const category = this.determineCategory(errorType);
    const metadata = this.extractMetadata(error, context);

    return {
      type: errorType,
      severity,
      category,
      originalError: error,
      context,
      metadata,
      timestamp: new Date().toISOString(),
      recoverable: category !== ErrorCategory.FATAL,
      retryable: category === ErrorCategory.RETRY_REQUIRED || category === ErrorCategory.RECOVERABLE
    };
  }

  static determineErrorType(error, context) {
    // HLS.js specific errors
    if (error.type === 'hlsError') {
      switch (error.details) {
        case 'manifestLoadError':
        case 'fragLoadError':
        case 'keyLoadError':
          return ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR;
        case 'bufferStalledError':
          return ErrorTypes.PLAYBACK.BUFFER_STALLED;
        case 'mediaError':
          return ErrorTypes.PLAYBACK.HLS_MEDIA_ERROR;
        default:
          return ErrorTypes.PLAYBACK.HLS_FATAL_ERROR;
      }
    }

    // Video element errors
    if (error.target && error.target.tagName === 'VIDEO') {
      return ErrorTypes.PLAYBACK.VIDEO_ELEMENT_ERROR;
    }

    // Network/CORS errors
    if (error.name === 'TypeError' && error.message.includes('CORS')) {
      return context.source === 'extraction' 
        ? ErrorTypes.EXTRACTION.SHADOWLANDS_CORS_ERROR 
        : ErrorTypes.PLAYBACK.CORS_ERROR;
    }

    // Extraction specific errors
    if (context.source === 'extraction') {
      if (error.message?.includes('iframe')) {
        return ErrorTypes.EXTRACTION.IFRAME_NAVIGATION_FAILED;
      }
      if (error.message?.includes('server hash')) {
        return ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED;
      }
      if (error.message?.includes('anti-bot') || error.message?.includes('blocked')) {
        return ErrorTypes.EXTRACTION.ANTI_BOT_DETECTED;
      }
      if (error.message?.includes('play button')) {
        return ErrorTypes.EXTRACTION.PLAY_BUTTON_NOT_FOUND;
      }
      if (error.message?.includes('timeout')) {
        return ErrorTypes.EXTRACTION.EXTRACTION_TIMEOUT;
      }
      return ErrorTypes.EXTRACTION.VM_SERVICE_UNAVAILABLE;
    }

    // Subtitle specific errors
    if (context.source === 'subtitle') {
      if (error.message?.includes('VTT') || error.message?.includes('parse')) {
        return ErrorTypes.SUBTITLE.VTT_PARSE_ERROR;
      }
      if (error.message?.includes('sync') || error.message?.includes('timing')) {
        return ErrorTypes.SUBTITLE.SYNC_DRIFT;
      }
      if (error.message?.includes('blob')) {
        return ErrorTypes.SUBTITLE.BLOB_URL_FAILED;
      }
      if (error.message?.includes('language')) {
        return ErrorTypes.SUBTITLE.LANGUAGE_SWITCH_FAILED;
      }
      return ErrorTypes.SUBTITLE.SUBTITLE_DISPLAY_ERROR;
    }

    // System errors
    if (error.name === 'QuotaExceededError') {
      return ErrorTypes.SYSTEM.QUOTA_EXCEEDED;
    }
    if (error.message?.includes('memory')) {
      return ErrorTypes.SYSTEM.MEMORY_EXHAUSTED;
    }

    return ErrorTypes.SYSTEM.UNKNOWN_ERROR;
  }

  static determineSeverity(errorType, error) {
    // Critical errors that completely break functionality
    const criticalErrors = [
      ErrorTypes.EXTRACTION.VM_SERVICE_UNAVAILABLE,
      ErrorTypes.PLAYBACK.HLS_FATAL_ERROR,
      ErrorTypes.SYSTEM.MEMORY_EXHAUSTED,
      ErrorTypes.SYSTEM.BROWSER_COMPATIBILITY
    ];

    // High severity errors that significantly impact user experience
    const highSeverityErrors = [
      ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED,
      ErrorTypes.PLAYBACK.VIDEO_ELEMENT_ERROR,
      ErrorTypes.PLAYBACK.STREAM_PROXY_FAILED,
      ErrorTypes.SYSTEM.NETWORK_UNAVAILABLE
    ];

    // Medium severity errors that cause temporary issues
    const mediumSeverityErrors = [
      ErrorTypes.EXTRACTION.IFRAME_NAVIGATION_FAILED,
      ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED,
      ErrorTypes.PLAYBACK.BUFFER_STALLED,
      ErrorTypes.SUBTITLE.VTT_PARSE_ERROR
    ];

    if (criticalErrors.includes(errorType)) {
      return ErrorSeverity.CRITICAL;
    }
    if (highSeverityErrors.includes(errorType)) {
      return ErrorSeverity.HIGH;
    }
    if (mediumSeverityErrors.includes(errorType)) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.LOW;
  }

  static determineCategory(errorType) {
    // Fatal errors that cannot be recovered from
    const fatalErrors = [
      ErrorTypes.SYSTEM.BROWSER_COMPATIBILITY,
      ErrorTypes.SYSTEM.MEMORY_EXHAUSTED
    ];

    // Errors that require retry with same parameters
    const retryErrors = [
      ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED,
      ErrorTypes.EXTRACTION.EXTRACTION_TIMEOUT,
      ErrorTypes.SUBTITLE.SUBTITLE_LOAD_TIMEOUT
    ];

    // Errors that have fallback options available
    const fallbackErrors = [
      ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED,
      ErrorTypes.EXTRACTION.IFRAME_NAVIGATION_FAILED,
      ErrorTypes.PLAYBACK.STREAM_PROXY_FAILED,
      ErrorTypes.SUBTITLE.LANGUAGE_SWITCH_FAILED
    ];

    if (fatalErrors.includes(errorType)) {
      return ErrorCategory.FATAL;
    }
    if (retryErrors.includes(errorType)) {
      return ErrorCategory.RETRY_REQUIRED;
    }
    if (fallbackErrors.includes(errorType)) {
      return ErrorCategory.FALLBACK_AVAILABLE;
    }
    return ErrorCategory.RECOVERABLE;
  }

  static extractMetadata(error, context) {
    const metadata = {
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      url: window.location.href,
      ...context
    };

    // Extract HLS.js specific metadata
    if (error.type === 'hlsError') {
      metadata.hlsDetails = {
        type: error.type,
        details: error.details,
        fatal: error.fatal,
        frag: error.frag ? {
          url: error.frag.url,
          level: error.frag.level,
          sn: error.frag.sn
        } : null,
        response: error.response ? {
          code: error.response.code,
          text: error.response.text
        } : null
      };
    }

    // Extract network error metadata
    if (error.response) {
      metadata.networkDetails = {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.response.url
      };
    }

    // Extract video element metadata
    if (error.target && error.target.tagName === 'VIDEO') {
      const video = error.target;
      metadata.videoDetails = {
        currentTime: video.currentTime,
        duration: video.duration,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error ? {
          code: video.error.code,
          message: video.error.message
        } : null
      };
    }

    return metadata;
  }
}