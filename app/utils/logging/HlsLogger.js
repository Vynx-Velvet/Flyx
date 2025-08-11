/**
 * Specialized logger for HLS player events and error recovery
 * Provides detailed logging for HLS.js events, errors, and recovery attempts
 */

import { getLogger } from './EnhancedLogger.js';

export class HlsLogger {
  constructor(streamUrl = null) {
    this.streamUrl = streamUrl;
    this.playbackSessionId = this.generatePlaybackSessionId();
    this.logger = getLogger('HLS', {
      enableConsole: true,
      enableStorage: true,
      logLevel: 'debug'
    });
    
    // HLS-specific tracking
    this.qualitySwitches = [];
    this.errorRecoveryAttempts = [];
    this.segmentErrors = new Map();
    this.bufferEvents = [];
    this.performanceMetrics = {
      segmentLoadTimes: [],
      qualityChanges: 0,
      stallEvents: 0,
      recoveryAttempts: 0
    };
  }

  generatePlaybackSessionId() {
    return `hls_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // HLS initialization and configuration logging
  logHlsInitialization(config, streamUrl) {
    this.streamUrl = streamUrl;
    
    return this.logger.info('HLS player initialization', {
      playbackSessionId: this.playbackSessionId,
      streamUrl: streamUrl?.substring(0, 100) + (streamUrl?.length > 100 ? '...' : ''),
      config: {
        maxBufferLength: config.maxBufferLength,
        fragLoadingMaxRetry: config.fragLoadingMaxRetry,
        fragLoadingRetryDelay: config.fragLoadingRetryDelay,
        abrBandWidthFactor: config.abrBandWidthFactor,
        renderTextTracksNatively: config.renderTextTracksNatively
      },
      hlsInitialization: true
    });
  }

  logSourceSpecificHeaders(hostname, headers) {
    return this.logger.debug('Source-specific headers applied', {
      playbackSessionId: this.playbackSessionId,
      hostname,
      headers,
      sourceHeaders: true
    });
  }

  // Manifest and quality logging
  logManifestParsed(levels, initialQuality) {
    const qualityInfo = levels.map(level => ({
      id: level.id,
      height: level.height,
      bitrate: level.bitrate,
      bandwidth: level.bandwidth
    }));
    
    return this.logger.info('HLS manifest parsed', {
      playbackSessionId: this.playbackSessionId,
      levelCount: levels.length,
      qualities: qualityInfo,
      initialQuality: {
        id: initialQuality?.id,
        height: initialQuality?.height,
        bitrate: initialQuality?.bitrate
      },
      manifestParsed: true
    });
  }

  logQualitySwitch(fromLevel, toLevel, reason, automatic = true) {
    const switchEvent = {
      timestamp: Date.now(),
      fromLevel: fromLevel ? {
        id: fromLevel.id,
        height: fromLevel.height,
        bitrate: fromLevel.bitrate
      } : null,
      toLevel: toLevel ? {
        id: toLevel.id,
        height: toLevel.height,
        bitrate: toLevel.bitrate
      } : null,
      reason,
      automatic
    };
    
    this.qualitySwitches.push(switchEvent);
    this.performanceMetrics.qualityChanges++;
    
    return this.logger.info('Quality switch', {
      playbackSessionId: this.playbackSessionId,
      ...switchEvent,
      totalSwitches: this.qualitySwitches.length,
      qualitySwitch: true
    });
  }

  // HLS event logging
  logHlsEvent(eventType, eventData = {}) {
    const sanitizedData = this.sanitizeHlsEventData(eventData);
    
    return this.logger.debug(`HLS Event: ${eventType}`, {
      playbackSessionId: this.playbackSessionId,
      eventType,
      eventData: sanitizedData,
      hlsEvent: true
    });
  }

  sanitizeHlsEventData(data) {
    // Remove large or circular objects from HLS event data
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      if (key === 'frag' && value) {
        sanitized.frag = {
          level: value.level,
          sn: value.sn,
          duration: value.duration,
          url: value.url?.split('/').pop(),
          start: value.start,
          end: value.end
        };
      } else if (key === 'response' && value) {
        sanitized.response = {
          code: value.code,
          text: value.text
        };
      } else if (key === 'networkDetails' && value) {
        sanitized.networkDetails = {
          timeout: value.timeout,
          withCredentials: value.withCredentials
        };
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = JSON.stringify(value).substring(0, 200);
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  // Fragment/segment logging
  logFragmentLoading(frag) {
    const segmentKey = `${frag.level}-${frag.sn}`;
    
    return this.logger.debug('Fragment loading started', {
      playbackSessionId: this.playbackSessionId,
      segmentKey,
      level: frag.level,
      sequenceNumber: frag.sn,
      duration: frag.duration,
      url: frag.url?.split('/').pop(),
      fragmentLoading: true
    });
  }

  logFragmentLoaded(frag, loadTime) {
    const segmentKey = `${frag.level}-${frag.sn}`;
    
    // Track performance
    this.performanceMetrics.segmentLoadTimes.push(loadTime);
    if (this.performanceMetrics.segmentLoadTimes.length > 50) {
      this.performanceMetrics.segmentLoadTimes = this.performanceMetrics.segmentLoadTimes.slice(-50);
    }
    
    // Clear any error tracking for this segment
    this.segmentErrors.delete(segmentKey);
    
    return this.logger.debug('Fragment loaded successfully', {
      playbackSessionId: this.playbackSessionId,
      segmentKey,
      level: frag.level,
      sequenceNumber: frag.sn,
      loadTime: `${loadTime}ms`,
      size: frag.loaded || 'unknown',
      averageLoadTime: this.getAverageSegmentLoadTime(),
      fragmentLoaded: true
    });
  }

  logFragmentError(frag, error, errorCount) {
    const segmentKey = `${frag.level}-${frag.sn}`;
    
    // Track segment error
    this.segmentErrors.set(segmentKey, {
      count: errorCount,
      lastError: Date.now(),
      url: frag.url,
      level: frag.level,
      sequenceNumber: frag.sn
    });
    
    return this.logger.warn('Fragment load error', {
      playbackSessionId: this.playbackSessionId,
      segmentKey,
      level: frag.level,
      sequenceNumber: frag.sn,
      errorCount,
      url: frag.url?.split('/').pop(),
      error: error?.message,
      httpCode: error?.response?.code,
      fragmentError: true
    });
  }

  logSegmentSkip(frag, reason, skipDistance) {
    const segmentKey = `${frag.level}-${frag.sn}`;
    
    return this.logger.info('Segment skip executed', {
      playbackSessionId: this.playbackSessionId,
      segmentKey,
      level: frag.level,
      sequenceNumber: frag.sn,
      reason,
      skipDistance: `${skipDistance.toFixed(2)}s`,
      url: frag.url?.split('/').pop(),
      segmentSkip: true
    });
  }

  // Error and recovery logging
  logHlsError(errorType, errorDetails, fatal, context = {}) {
    const errorEvent = {
      timestamp: Date.now(),
      errorType,
      errorDetails,
      fatal,
      context
    };
    
    return this.logger.error(`HLS ${fatal ? 'Fatal' : 'Non-Fatal'} Error: ${errorType}`, null, {
      playbackSessionId: this.playbackSessionId,
      ...errorEvent,
      hlsError: true
    });
  }

  logRecoveryAttempt(recoveryType, attempt, strategy, context = {}) {
    const recoveryEvent = {
      timestamp: Date.now(),
      recoveryType,
      attempt,
      strategy,
      context
    };
    
    this.errorRecoveryAttempts.push(recoveryEvent);
    this.performanceMetrics.recoveryAttempts++;
    
    return this.logger.info(`Recovery attempt: ${recoveryType}`, {
      playbackSessionId: this.playbackSessionId,
      ...recoveryEvent,
      totalRecoveryAttempts: this.errorRecoveryAttempts.length,
      hlsRecovery: true
    });
  }

  logRecoveryResult(recoveryType, success, action, timeTaken, context = {}) {
    return this.logger.info(`Recovery ${success ? 'successful' : 'failed'}: ${recoveryType}`, {
      playbackSessionId: this.playbackSessionId,
      recoveryType,
      success,
      action,
      timeTaken: `${timeTaken}ms`,
      context,
      hlsRecoveryResult: true
    });
  }

  logProgressiveRecovery(stage, attempt, maxAttempts, strategy) {
    return this.logger.info(`Progressive recovery - Stage: ${stage}`, {
      playbackSessionId: this.playbackSessionId,
      stage,
      attempt,
      maxAttempts,
      strategy,
      progressiveRecovery: true
    });
  }

  // Buffer health and performance logging
  logBufferStall(currentTime, bufferLength, stallCount) {
    const stallEvent = {
      timestamp: Date.now(),
      currentTime: currentTime.toFixed(3),
      bufferLength: bufferLength.toFixed(3),
      stallCount
    };
    
    this.bufferEvents.push(stallEvent);
    this.performanceMetrics.stallEvents++;
    
    return this.logger.warn('Buffer stall detected', {
      playbackSessionId: this.playbackSessionId,
      ...stallEvent,
      totalStalls: this.performanceMetrics.stallEvents,
      bufferStall: true
    });
  }

  logGapJump(fromTime, toTime, gapSize, method, success) {
    return this.logger.info('Gap jump executed', {
      playbackSessionId: this.playbackSessionId,
      fromTime: fromTime.toFixed(3),
      toTime: toTime.toFixed(3),
      gapSize: gapSize.toFixed(3),
      method,
      success,
      gapJump: true
    });
  }

  logBufferHealth(bufferLength, stallCount, gapJumps, averageLoadTime) {
    const healthData = {
      bufferLength: bufferLength.toFixed(2),
      stallCount,
      gapJumps,
      averageLoadTime: averageLoadTime.toFixed(0),
      segmentErrorCount: this.segmentErrors.size,
      qualitySwitches: this.qualitySwitches.length
    };
    
    return this.logger.info('Buffer health update', {
      playbackSessionId: this.playbackSessionId,
      ...healthData,
      bufferHealth: true
    });
  }

  // Performance metrics
  getAverageSegmentLoadTime() {
    const times = this.performanceMetrics.segmentLoadTimes;
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  logPerformanceMetrics() {
    const metrics = {
      averageSegmentLoadTime: this.getAverageSegmentLoadTime(),
      totalQualityChanges: this.performanceMetrics.qualityChanges,
      totalStallEvents: this.performanceMetrics.stallEvents,
      totalRecoveryAttempts: this.performanceMetrics.recoveryAttempts,
      activeSegmentErrors: this.segmentErrors.size,
      bufferEventCount: this.bufferEvents.length
    };
    
    return this.logger.info('Performance metrics snapshot', {
      playbackSessionId: this.playbackSessionId,
      ...metrics,
      performanceMetrics: true
    });
  }

  // Network and connection logging
  logNetworkCondition(effectiveType, downlink, rtt) {
    return this.logger.debug('Network condition detected', {
      playbackSessionId: this.playbackSessionId,
      effectiveType,
      downlink: `${downlink}Mbps`,
      rtt: `${rtt}ms`,
      networkCondition: true
    });
  }

  logConnectionOptimization(optimization, applied, reason) {
    return this.logger.info('Connection optimization', {
      playbackSessionId: this.playbackSessionId,
      optimization,
      applied,
      reason,
      connectionOptimization: true
    });
  }

  // Export HLS-specific diagnostic data
  exportHlsDiagnostics() {
    const baseExport = this.logger.exportLogs({
      category: 'hls'
    });
    
    return {
      ...baseExport,
      playbackSessionId: this.playbackSessionId,
      streamUrl: this.streamUrl?.substring(0, 100) + '...',
      hlsSpecific: {
        qualitySwitches: this.qualitySwitches,
        errorRecoveryAttempts: this.errorRecoveryAttempts,
        segmentErrors: Object.fromEntries(this.segmentErrors),
        bufferEvents: this.bufferEvents.slice(-20), // Last 20 buffer events
        performanceMetrics: {
          ...this.performanceMetrics,
          averageSegmentLoadTime: this.getAverageSegmentLoadTime()
        }
      }
    };
  }

  // Convenience methods
  info(message, data = {}) {
    return this.logger.info(message, {
      playbackSessionId: this.playbackSessionId,
      ...data
    });
  }

  warn(message, data = {}) {
    return this.logger.warn(message, {
      playbackSessionId: this.playbackSessionId,
      ...data
    });
  }

  error(message, error = null, data = {}) {
    return this.logger.error(message, error, {
      playbackSessionId: this.playbackSessionId,
      ...data
    });
  }

  debug(message, data = {}) {
    return this.logger.debug(message, {
      playbackSessionId: this.playbackSessionId,
      ...data
    });
  }

  // Timer methods with session context
  startTimer(label) {
    return this.logger.startTimer(`${this.playbackSessionId}_${label}`);
  }

  endTimer(label, additionalData = {}) {
    return this.logger.endTimer(`${this.playbackSessionId}_${label}`, {
      playbackSessionId: this.playbackSessionId,
      ...additionalData
    });
  }
}

// Factory function for creating HLS loggers
export function createHlsLogger(streamUrl = null) {
  return new HlsLogger(streamUrl);
}