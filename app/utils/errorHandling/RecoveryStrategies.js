/**
 * Recovery strategies for different error types
 * Implements automatic fallback mechanisms as specified in requirements
 */

import { ErrorTypes, ErrorCategory } from './ErrorTypes.js';
import { DiagnosticLogger } from './DiagnosticLogger.js';

export class RecoveryStrategies {
  constructor() {
    this.logger = new DiagnosticLogger();
    this.recoveryAttempts = new Map();
    this.maxRetries = 3;
  }

  async executeRecovery(classifiedError, context = {}) {
    const { type, category, metadata } = classifiedError;
    const attemptKey = `${type}_${Date.now()}`;
    
    this.logger.logRecoveryAttempt(classifiedError, context);

    try {
      let result;
      
      switch (category) {
        case ErrorCategory.RECOVERABLE:
          result = await this.handleRecoverableError(type, context, metadata);
          break;
        case ErrorCategory.RETRY_REQUIRED:
          result = await this.handleRetryError(type, context, metadata);
          break;
        case ErrorCategory.FALLBACK_AVAILABLE:
          result = await this.handleFallbackError(type, context, metadata);
          break;
        case ErrorCategory.FATAL:
          result = await this.handleFatalError(type, context, metadata);
          break;
        default:
          result = { success: false, action: 'unknown_category' };
      }

      this.logger.logRecoveryResult(classifiedError, result);
      return result;
    } catch (recoveryError) {
      this.logger.logRecoveryFailure(classifiedError, recoveryError);
      return { success: false, action: 'recovery_failed', error: recoveryError };
    }
  }

  async handleRecoverableError(errorType, context, metadata) {
    switch (errorType) {
      case ErrorTypes.PLAYBACK.BUFFER_STALLED:
        return await this.recoverBufferStall(context, metadata);
      
      case ErrorTypes.PLAYBACK.QUALITY_SWITCH_FAILED:
        return await this.recoverQualitySwitch(context, metadata);
      
      case ErrorTypes.SUBTITLE.SYNC_DRIFT:
        return await this.recoverSubtitleSync(context, metadata);
      
      case ErrorTypes.SUBTITLE.SUBTITLE_DISPLAY_ERROR:
        return await this.recoverSubtitleDisplay(context, metadata);
      
      default:
        return { success: false, action: 'no_recovery_strategy' };
    }
  }

  async handleRetryError(errorType, context, metadata) {
    const retryCount = this.getRetryCount(errorType);
    
    if (retryCount >= this.maxRetries) {
      return { success: false, action: 'max_retries_exceeded', retryCount };
    }

    this.incrementRetryCount(errorType);

    switch (errorType) {
      case ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED:
        return await this.retrySegmentLoad(context, metadata, retryCount);
      
      case ErrorTypes.EXTRACTION.EXTRACTION_TIMEOUT:
        return await this.retryExtraction(context, metadata, retryCount);
      
      case ErrorTypes.SUBTITLE.SUBTITLE_LOAD_TIMEOUT:
        return await this.retrySubtitleLoad(context, metadata, retryCount);
      
      default:
        return { success: false, action: 'no_retry_strategy' };
    }
  }

  async handleFallbackError(errorType, context, metadata) {
    switch (errorType) {
      case ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED:
        return await this.fallbackToAlternativeServer(context, metadata);
      
      case ErrorTypes.EXTRACTION.IFRAME_NAVIGATION_FAILED:
        return await this.fallbackToDirectExtraction(context, metadata);
      
      case ErrorTypes.PLAYBACK.STREAM_PROXY_FAILED:
        return await this.fallbackToDirectStream(context, metadata);
      
      case ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR:
        return await this.fallbackToAlternativeQuality(context, metadata);
      
      case ErrorTypes.SUBTITLE.LANGUAGE_SWITCH_FAILED:
        return await this.fallbackToAlternativeLanguage(context, metadata);
      
      default:
        return { success: false, action: 'no_fallback_strategy' };
    }
  }

  async handleFatalError(errorType, context, metadata) {
    // Log fatal error for monitoring
    this.logger.logFatalError(errorType, context, metadata);
    
    return {
      success: false,
      action: 'fatal_error',
      requiresUserAction: true,
      errorType
    };
  }

  // Specific recovery implementations

  async recoverBufferStall(context, metadata) {
    const { hlsInstance, videoElement } = context;
    
    if (!hlsInstance || !videoElement) {
      return { success: false, action: 'missing_context' };
    }

    try {
      // Attempt gap jumping
      const buffered = videoElement.buffered;
      const currentTime = videoElement.currentTime;
      
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i);
        const end = buffered.end(i);
        
        if (currentTime < start && start - currentTime < 5) {
          videoElement.currentTime = start + 0.1;
          return { success: true, action: 'gap_jumped', jumpTo: start + 0.1 };
        }
      }

      // If gap jumping fails, try buffer flush
      hlsInstance.trigger('hlsBufferFlushed');
      return { success: true, action: 'buffer_flushed' };
    } catch (error) {
      return { success: false, action: 'recovery_failed', error };
    }
  }

  async recoverQualitySwitch(context, metadata) {
    const { hlsInstance } = context;
    
    if (!hlsInstance) {
      return { success: false, action: 'missing_hls_instance' };
    }

    try {
      // Reset to auto quality selection
      hlsInstance.currentLevel = -1;
      return { success: true, action: 'reset_to_auto_quality' };
    } catch (error) {
      return { success: false, action: 'quality_reset_failed', error };
    }
  }

  async retrySegmentLoad(context, metadata, retryCount) {
    const { hlsInstance, failedFragment } = context;
    
    if (!hlsInstance) {
      return { success: false, action: 'missing_hls_instance' };
    }

    try {
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Trigger segment reload
      hlsInstance.trigger('hlsFragLoadEmergencyAborted');
      return { success: true, action: 'segment_retry_triggered', delay, retryCount };
    } catch (error) {
      return { success: false, action: 'segment_retry_failed', error };
    }
  }

  async fallbackToAlternativeServer(context, metadata) {
    const { movieId, seasonId, episodeId, currentServer } = context;
    const servers = ['CloudStream Pro', '2Embed', 'Superembed'];
    const remainingServers = servers.filter(s => s !== currentServer);
    
    if (remainingServers.length === 0) {
      return { success: false, action: 'no_alternative_servers' };
    }

    try {
      // This would trigger a new extraction with the next server
      return {
        success: true,
        action: 'server_fallback_initiated',
        nextServer: remainingServers[0],
        remainingServers: remainingServers.slice(1)
      };
    } catch (error) {
      return { success: false, action: 'server_fallback_failed', error };
    }
  }

  async fallbackToDirectStream(context, metadata) {
    const { streamUrl, proxyUrl } = context;
    
    if (!streamUrl) {
      return { success: false, action: 'missing_stream_url' };
    }

    try {
      // Attempt direct access without proxy
      return {
        success: true,
        action: 'direct_stream_fallback',
        directUrl: streamUrl,
        bypassProxy: true
      };
    } catch (error) {
      return { success: false, action: 'direct_stream_failed', error };
    }
  }

  async recoverSubtitleSync(context, metadata) {
    const { subtitleManager, currentTime } = context;
    
    if (!subtitleManager) {
      return { success: false, action: 'missing_subtitle_manager' };
    }

    try {
      // Reset subtitle synchronization
      subtitleManager.resyncSubtitles(currentTime);
      return { success: true, action: 'subtitle_resync', syncTime: currentTime };
    } catch (error) {
      return { success: false, action: 'subtitle_resync_failed', error };
    }
  }

  // Utility methods

  getRetryCount(errorType) {
    return this.recoveryAttempts.get(errorType) || 0;
  }

  incrementRetryCount(errorType) {
    const current = this.getRetryCount(errorType);
    this.recoveryAttempts.set(errorType, current + 1);
  }

  resetRetryCount(errorType) {
    this.recoveryAttempts.delete(errorType);
  }

  clearAllRetries() {
    this.recoveryAttempts.clear();
  }
}