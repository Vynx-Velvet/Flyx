/**
 * Specialized logger for VM extraction service
 * Provides structured logging for iframe navigation and stream extraction
 */

import { getLogger } from './EnhancedLogger.js';

export class ExtractionLogger {
  constructor(requestId = null) {
    this.requestId = requestId || this.generateRequestId();
    this.logger = getLogger('Extraction', {
      enableConsole: true,
      enableStorage: true,
      logLevel: 'debug'
    });
    
    this.extractionStartTime = null;
    this.iframeChain = [];
    this.serverAttempts = [];
    this.stealthBypass = false;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Extraction process logging
  startExtraction(url, mediaType, server, movieId, seasonId, episodeId) {
    this.extractionStartTime = Date.now();
    
    return this.logger.info('Extraction process started', {
      requestId: this.requestId,
      url: url?.substring(0, 100) + (url?.length > 100 ? '...' : ''),
      mediaType,
      server,
      movieId,
      seasonId,
      episodeId,
      extractionStart: true
    });
  }

  logServerHashAttempt(serverName, serverHash, url, success = null) {
    const attempt = {
      server: serverName,
      hash: serverHash,
      url: url?.substring(0, 100) + '...',
      timestamp: Date.now(),
      success
    };
    
    this.serverAttempts.push(attempt);
    
    return this.logger.info(`Server hash attempt: ${serverName}`, {
      requestId: this.requestId,
      serverName,
      serverHash,
      url: url?.substring(0, 100) + '...',
      attemptNumber: this.serverAttempts.length,
      serverAttempt: true
    });
  }

  logIframeChainStart() {
    return this.logger.info('Iframe chain navigation started', {
      requestId: this.requestId,
      iframeChainStart: true
    });
  }

  logIframeStep(step, url, description, success = true, additionalData = {}) {
    const iframeStep = {
      step,
      url: url?.substring(0, 150),
      description,
      success,
      timestamp: Date.now(),
      ...additionalData
    };
    
    this.iframeChain.push(iframeStep);
    
    return this.logger.info(`Iframe navigation - Step ${step}: ${description}`, {
      requestId: this.requestId,
      step,
      url: url?.substring(0, 100) + (url?.length > 100 ? '...' : ''),
      description,
      success,
      iframeNavigation: true,
      ...additionalData
    });
  }

  logVidsrcIframe(src, success) {
    return this.logIframeStep(1, src, 'vidsrc.xyz initial iframe', success, {
      iframeType: 'vidsrc',
      isInitialFrame: true
    });
  }

  logCloudnestraRcpIframe(src, success) {
    return this.logIframeStep(2, src, 'cloudnestra.com/rcp iframe', success, {
      iframeType: 'cloudnestra_rcp',
      requiresPlayButton: true
    });
  }

  logPlayButtonFound(selector, elementInfo = {}) {
    return this.logger.info('Play button found', {
      requestId: this.requestId,
      selector,
      elementInfo,
      playButtonFound: true
    });
  }

  logPlayButtonInteraction(selector, method, success, timing = {}) {
    return this.logger.info('Play button interaction', {
      requestId: this.requestId,
      selector,
      method,
      success,
      timing: {
        hoverDelay: timing.hoverDelay || 0,
        clickDelay: timing.clickDelay || 0,
        waitAfterClick: timing.waitAfterClick || 0
      },
      playButtonInteraction: true
    });
  }

  logCloudnestraProrcpIframe(src, success) {
    return this.logIframeStep(4, src, 'cloudnestra.com/prorcp final iframe', success, {
      iframeType: 'cloudnestra_prorcp',
      isFinalFrame: true
    });
  }

  logShadowlandsIframe(src, success) {
    return this.logIframeStep(5, src, 'shadowlandschronicles.com stream iframe', success, {
      iframeType: 'shadowlands',
      isStreamFrame: true
    });
  }

  logCorsError(iframeType, url, error) {
    return this.logger.warn('CORS error accessing iframe', {
      requestId: this.requestId,
      iframeType,
      url: url?.substring(0, 100) + '...',
      error: error?.message,
      corsError: true
    });
  }

  // Stealth and anti-detection logging
  logStealthConfigApplied(fingerprint, localStorage, userAgent) {
    this.stealthBypass = true;
    
    return this.logger.info('Stealth configuration applied', {
      requestId: this.requestId,
      fingerprint: {
        platform: fingerprint?.platform,
        language: fingerprint?.language,
        screenWidth: fingerprint?.screenWidth,
        screenHeight: fingerprint?.screenHeight,
        timezone: fingerprint?.timezone
      },
      localStorage: Object.keys(localStorage || {}),
      userAgent: userAgent?.substring(0, 100) + '...',
      stealthConfig: true
    });
  }

  logBehaviorSimulation(mouseMovements, scrolls, tabPresses, duration) {
    return this.logger.debug('Human behavior simulation completed', {
      requestId: this.requestId,
      mouseMovements,
      scrolls,
      tabPresses,
      duration: `${duration}ms`,
      behaviorSimulation: true
    });
  }

  logRequestThrottling(delay, activeRequests, burstLimit) {
    return this.logger.debug('Request throttling applied', {
      requestId: this.requestId,
      delay: `${delay}ms`,
      activeRequests,
      burstLimit,
      requestThrottling: true
    });
  }

  logSandboxBypass(success, methods = []) {
    return this.logger.info('Sandbox detection bypass', {
      requestId: this.requestId,
      success,
      methods,
      sandboxBypass: true
    });
  }

  // Stream extraction results
  logStreamFound(streamUrl, streamType, requiresProxy = false) {
    return this.logger.info('Stream URL extracted', {
      requestId: this.requestId,
      streamUrl: streamUrl?.substring(0, 100) + '...',
      streamType,
      requiresProxy,
      streamFound: true
    });
  }

  logExtractionComplete(success, streamUrl, streamType, server, serverHash) {
    const extractionTime = this.extractionStartTime ? Date.now() - this.extractionStartTime : 0;
    
    const result = {
      requestId: this.requestId,
      success,
      streamUrl: streamUrl?.substring(0, 100) + (streamUrl?.length > 100 ? '...' : ''),
      streamType,
      server,
      serverHash,
      extractionTime: `${extractionTime}ms`,
      iframeChainLength: this.iframeChain.length,
      serverAttempts: this.serverAttempts.length,
      stealthBypass: this.stealthBypass,
      extractionComplete: true
    };
    
    if (success) {
      this.logger.info('Extraction completed successfully', result);
    } else {
      this.logger.error('Extraction failed', null, result);
    }
    
    return result;
  }

  logExtractionError(error, context = {}) {
    return this.logger.error('Extraction error', error, {
      requestId: this.requestId,
      context,
      extractionError: true
    });
  }

  // Fallback and retry logging
  logServerFallback(fromServer, toServer, reason) {
    return this.logger.warn('Server fallback triggered', {
      requestId: this.requestId,
      fromServer,
      toServer,
      reason,
      serverFallback: true
    });
  }

  logRetryAttempt(attemptNumber, maxAttempts, reason, delay) {
    return this.logger.info(`Retry attempt ${attemptNumber}/${maxAttempts}`, {
      requestId: this.requestId,
      attemptNumber,
      maxAttempts,
      reason,
      delay: `${delay}ms`,
      retryAttempt: true
    });
  }

  // Performance and timing
  startTimer(label) {
    return this.logger.startTimer(`${this.requestId}_${label}`);
  }

  endTimer(label, additionalData = {}) {
    return this.logger.endTimer(`${this.requestId}_${label}`, {
      requestId: this.requestId,
      ...additionalData
    });
  }

  // Export extraction-specific diagnostic data
  exportExtractionDiagnostics() {
    const baseExport = this.logger.exportLogs({
      category: 'extraction'
    });
    
    return {
      ...baseExport,
      requestId: this.requestId,
      extractionSpecific: {
        iframeChain: this.iframeChain,
        serverAttempts: this.serverAttempts,
        stealthBypass: this.stealthBypass,
        extractionDuration: this.extractionStartTime ? Date.now() - this.extractionStartTime : 0
      }
    };
  }

  // Convenience methods for common patterns
  info(message, data = {}) {
    return this.logger.info(message, {
      requestId: this.requestId,
      ...data
    });
  }

  warn(message, data = {}) {
    return this.logger.warn(message, {
      requestId: this.requestId,
      ...data
    });
  }

  error(message, error = null, data = {}) {
    return this.logger.error(message, error, {
      requestId: this.requestId,
      ...data
    });
  }

  debug(message, data = {}) {
    return this.logger.debug(message, {
      requestId: this.requestId,
      ...data
    });
  }
}

// Factory function for creating extraction loggers
export function createExtractionLogger(requestId = null) {
  return new ExtractionLogger(requestId);
}