/**
 * Specialized logger for subtitle parsing and synchronization
 * Provides detailed logging for VTT parsing, timing, and language switching
 */

import { getLogger } from './EnhancedLogger.js';

export class SubtitleLogger {
  constructor(mediaId = null) {
    this.mediaId = mediaId;
    this.subtitleSessionId = this.generateSubtitleSessionId();
    this.logger = getLogger('Subtitle', {
      enableConsole: true,
      enableStorage: true,
      logLevel: 'debug'
    });
    
    // Subtitle-specific tracking
    this.parseAttempts = [];
    this.syncEvents = [];
    this.languageSwitches = [];
    this.cueCache = new Map();
    this.performanceMetrics = {
      totalParseTime: 0,
      totalCuesParsed: 0,
      syncAccuracySum: 0,
      syncEventCount: 0,
      languageSwitchCount: 0
    };
  }

  generateSubtitleSessionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Subtitle parsing logging
  logParseStart(format, source, language, fileSize) {
    const parseAttempt = {
      id: this.generateParseId(),
      timestamp: Date.now(),
      format,
      source,
      language,
      fileSize,
      startTime: Date.now()
    };
    
    this.parseAttempts.push(parseAttempt);
    
    return this.logger.info('Subtitle parsing started', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      parseId: parseAttempt.id,
      format,
      source,
      language,
      fileSize: fileSize ? `${(fileSize / 1024).toFixed(1)}KB` : 'unknown',
      subtitleParsing: true
    });
  }

  generateParseId() {
    return `parse_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  logParseProgress(parseId, linesProcessed, cuesFound, errors = []) {
    return this.logger.debug('Subtitle parse progress', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      parseId,
      linesProcessed,
      cuesFound,
      errorCount: errors.length,
      recentErrors: errors.slice(-3), // Last 3 errors
      parseProgress: true
    });
  }

  logParseError(parseId, lineNumber, line, error, errorType) {
    return this.logger.warn('Subtitle parse error', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      parseId,
      lineNumber,
      line: line?.substring(0, 100) + (line?.length > 100 ? '...' : ''),
      error: error?.message,
      errorType,
      parseError: true
    });
  }

  logParseComplete(parseId, success, cueCount, parseTime, errors = [], warnings = []) {
    const parseAttempt = this.parseAttempts.find(p => p.id === parseId);
    if (parseAttempt) {
      parseAttempt.endTime = Date.now();
      parseAttempt.success = success;
      parseAttempt.cueCount = cueCount;
      parseAttempt.parseTime = parseTime;
      parseAttempt.errorCount = errors.length;
      parseAttempt.warningCount = warnings.length;
    }
    
    // Update performance metrics
    this.performanceMetrics.totalParseTime += parseTime;
    this.performanceMetrics.totalCuesParsed += cueCount;
    
    const result = {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      parseId,
      success,
      cueCount,
      parseTime: `${parseTime}ms`,
      errorCount: errors.length,
      warningCount: warnings.length,
      averageParseTime: this.getAverageParseTime(),
      parseComplete: true
    };
    
    if (success) {
      this.logger.info('Subtitle parsing completed successfully', result);
    } else {
      this.logger.error('Subtitle parsing failed', null, result);
    }
    
    return result;
  }

  logVttTimeParsing(timeString, parsedTime, format) {
    return this.logger.debug('VTT time parsing', {
      subtitleSessionId: this.subtitleSessionId,
      timeString,
      parsedTime: parsedTime?.toFixed(3),
      format, // 'HH:MM:SS.mmm' or 'MM:SS.mmm'
      timeParsing: true
    });
  }

  logCueValidation(cueId, startTime, endTime, text, valid, issues = []) {
    return this.logger.debug('Cue validation', {
      subtitleSessionId: this.subtitleSessionId,
      cueId,
      startTime: startTime?.toFixed(3),
      endTime: endTime?.toFixed(3),
      textLength: text?.length,
      textPreview: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
      valid,
      issues,
      cueValidation: true
    });
  }

  logHtmlSanitization(originalText, sanitizedText, tagsRemoved) {
    return this.logger.debug('HTML sanitization', {
      subtitleSessionId: this.subtitleSessionId,
      originalLength: originalText?.length,
      sanitizedLength: sanitizedText?.length,
      tagsRemoved,
      textPreview: sanitizedText?.substring(0, 50) + '...',
      htmlSanitization: true
    });
  }

  // Subtitle synchronization logging
  logSyncStart(cueCount, updateFrequency) {
    return this.logger.info('Subtitle synchronization started', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      cueCount,
      updateFrequency: `${updateFrequency}ms`,
      syncStart: true
    });
  }

  logSyncUpdate(currentTime, activeCue, nextCue, syncAccuracy, method = 'timer') {
    const syncEvent = {
      timestamp: Date.now(),
      currentTime: parseFloat(currentTime.toFixed(3)),
      activeCue: activeCue ? {
        id: activeCue.id,
        start: parseFloat(activeCue.start.toFixed(3)),
        end: parseFloat(activeCue.end.toFixed(3)),
        text: activeCue.text?.substring(0, 30) + '...'
      } : null,
      nextCue: nextCue ? {
        id: nextCue.id,
        start: parseFloat(nextCue.start.toFixed(3))
      } : null,
      syncAccuracy: parseFloat(syncAccuracy.toFixed(1)),
      method
    };
    
    this.syncEvents.push(syncEvent);
    
    // Keep only last 100 sync events for performance
    if (this.syncEvents.length > 100) {
      this.syncEvents = this.syncEvents.slice(-100);
    }
    
    // Update performance metrics
    this.performanceMetrics.syncAccuracySum += syncAccuracy;
    this.performanceMetrics.syncEventCount++;
    
    return this.logger.debug('Subtitle sync update', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      ...syncEvent,
      averageSyncAccuracy: this.getAverageSyncAccuracy(),
      subtitleSync: true
    });
  }

  logSyncDrift(expectedTime, actualTime, drift, correctionApplied) {
    return this.logger.warn('Subtitle sync drift detected', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      expectedTime: expectedTime.toFixed(3),
      actualTime: actualTime.toFixed(3),
      drift: `${drift.toFixed(1)}ms`,
      correctionApplied,
      syncDrift: true
    });
  }

  logCueTransition(fromCue, toCue, transitionTime, smooth) {
    return this.logger.debug('Cue transition', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      fromCue: fromCue ? {
        id: fromCue.id,
        text: fromCue.text?.substring(0, 30) + '...'
      } : null,
      toCue: toCue ? {
        id: toCue.id,
        text: toCue.text?.substring(0, 30) + '...'
      } : null,
      transitionTime: `${transitionTime}ms`,
      smooth,
      cueTransition: true
    });
  }

  // Language switching logging
  logLanguageSwitchStart(fromLanguage, toLanguage, reason) {
    const switchId = this.generateSwitchId();
    
    const languageSwitch = {
      id: switchId,
      timestamp: Date.now(),
      fromLanguage,
      toLanguage,
      reason,
      startTime: Date.now()
    };
    
    this.languageSwitches.push(languageSwitch);
    
    return this.logger.info('Language switch started', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      switchId,
      fromLanguage,
      toLanguage,
      reason,
      languageSwitch: true
    });
  }

  generateSwitchId() {
    return `switch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  logLanguageSwitchProgress(switchId, stage, progress) {
    return this.logger.debug('Language switch progress', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      switchId,
      stage, // 'loading', 'parsing', 'applying'
      progress,
      languageSwitchProgress: true
    });
  }

  logLanguageSwitchComplete(switchId, success, loadTime, newCueCount) {
    const languageSwitch = this.languageSwitches.find(s => s.id === switchId);
    if (languageSwitch) {
      languageSwitch.endTime = Date.now();
      languageSwitch.success = success;
      languageSwitch.loadTime = loadTime;
      languageSwitch.newCueCount = newCueCount;
    }
    
    // Update performance metrics
    this.performanceMetrics.languageSwitchCount++;
    
    const result = {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      switchId,
      success,
      loadTime: `${loadTime}ms`,
      newCueCount,
      totalSwitches: this.performanceMetrics.languageSwitchCount,
      languageSwitchComplete: true
    };
    
    if (success) {
      this.logger.info('Language switch completed successfully', result);
    } else {
      this.logger.error('Language switch failed', null, result);
    }
    
    return result;
  }

  // Blob URL and resource management logging
  logBlobUrlCreation(language, blobUrl, size) {
    return this.logger.debug('Blob URL created', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      language,
      blobUrl: blobUrl?.substring(0, 50) + '...',
      size: size ? `${(size / 1024).toFixed(1)}KB` : 'unknown',
      blobUrlCreation: true
    });
  }

  logBlobUrlCleanup(language, blobUrl, success) {
    return this.logger.debug('Blob URL cleanup', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      language,
      blobUrl: blobUrl?.substring(0, 50) + '...',
      success,
      blobUrlCleanup: true
    });
  }

  logMemoryUsage(activeBlobUrls, cacheSize, totalCues) {
    return this.logger.debug('Subtitle memory usage', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      activeBlobUrls,
      cacheSize,
      totalCues,
      memoryUsage: true
    });
  }

  // Cue cache optimization logging
  logCacheOptimization(originalCount, optimizedCount, removedOverlaps, removedShort, removedEmpty) {
    return this.logger.info('Cue cache optimization', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      originalCount,
      optimizedCount,
      removedOverlaps,
      removedShort,
      removedEmpty,
      optimizationRatio: ((optimizedCount / originalCount) * 100).toFixed(1) + '%',
      cacheOptimization: true
    });
  }

  logCacheBuild(bucketCount, totalCues, buildTime) {
    return this.logger.debug('Cue cache built', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      bucketCount,
      totalCues,
      buildTime: `${buildTime}ms`,
      averageCuesPerBucket: (totalCues / bucketCount).toFixed(1),
      cacheBuild: true
    });
  }

  // Performance metrics
  getAverageParseTime() {
    return this.parseAttempts.length > 0 
      ? this.performanceMetrics.totalParseTime / this.parseAttempts.length 
      : 0;
  }

  getAverageSyncAccuracy() {
    return this.performanceMetrics.syncEventCount > 0 
      ? this.performanceMetrics.syncAccuracySum / this.performanceMetrics.syncEventCount 
      : 0;
  }

  logPerformanceMetrics() {
    const metrics = {
      totalParseAttempts: this.parseAttempts.length,
      successfulParses: this.parseAttempts.filter(p => p.success).length,
      averageParseTime: this.getAverageParseTime(),
      totalCuesParsed: this.performanceMetrics.totalCuesParsed,
      averageSyncAccuracy: this.getAverageSyncAccuracy(),
      totalSyncEvents: this.performanceMetrics.syncEventCount,
      totalLanguageSwitches: this.performanceMetrics.languageSwitchCount,
      activeCacheSize: this.cueCache.size
    };
    
    return this.logger.info('Subtitle performance metrics', {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      ...metrics,
      subtitlePerformanceMetrics: true
    });
  }

  // Export subtitle-specific diagnostic data
  exportSubtitleDiagnostics() {
    const baseExport = this.logger.exportLogs({
      category: 'subtitle'
    });
    
    return {
      ...baseExport,
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      subtitleSpecific: {
        parseAttempts: this.parseAttempts,
        syncEvents: this.syncEvents.slice(-50), // Last 50 sync events
        languageSwitches: this.languageSwitches,
        performanceMetrics: {
          ...this.performanceMetrics,
          averageParseTime: this.getAverageParseTime(),
          averageSyncAccuracy: this.getAverageSyncAccuracy()
        }
      }
    };
  }

  // Convenience methods
  info(message, data = {}) {
    return this.logger.info(message, {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      ...data
    });
  }

  warn(message, data = {}) {
    return this.logger.warn(message, {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      ...data
    });
  }

  error(message, error = null, data = {}) {
    return this.logger.error(message, error, {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      ...data
    });
  }

  debug(message, data = {}) {
    return this.logger.debug(message, {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      ...data
    });
  }

  // Timer methods with session context
  startTimer(label) {
    return this.logger.startTimer(`${this.subtitleSessionId}_${label}`);
  }

  endTimer(label, additionalData = {}) {
    return this.logger.endTimer(`${this.subtitleSessionId}_${label}`, {
      subtitleSessionId: this.subtitleSessionId,
      mediaId: this.mediaId,
      ...additionalData
    });
  }
}

// Factory function for creating subtitle loggers
export function createSubtitleLogger(mediaId = null) {
  return new SubtitleLogger(mediaId);
}