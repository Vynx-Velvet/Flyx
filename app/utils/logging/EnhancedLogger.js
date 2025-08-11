/**
 * Enhanced Logging System for Media Playback
 * Provides structured logging for extraction, HLS playback, subtitles, and performance
 */

export class EnhancedLogger {
  constructor(component = 'Unknown', options = {}) {
    this.component = component;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.logs = [];
    this.maxLogs = options.maxLogs || 2000;
    this.enableConsole = options.enableConsole !== false;
    this.enableStorage = options.enableStorage !== false;
    this.logLevel = options.logLevel || 'info'; // debug, info, warn, error
    
    // Performance tracking
    this.performanceMetrics = new Map();
    this.timers = new Map();
    
    this.info('Logger initialized', {
      component: this.component,
      sessionId: this.sessionId,
      options
    });
  }

  generateSessionId() {
    return `${this.component.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  createLogEntry(level, message, data = {}, context = {}) {
    const timestamp = new Date().toISOString();
    const sessionDuration = Date.now() - this.startTime;
    
    return {
      id: this.generateLogId(),
      timestamp,
      sessionId: this.sessionId,
      component: this.component,
      level,
      message,
      data: this.sanitizeData(data),
      context: {
        ...context,
        sessionDuration,
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
      },
      performance: this.getCurrentPerformanceSnapshot()
    };
  }

  sanitizeData(data) {
    try {
      // Remove circular references and large objects
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
        if (typeof value === 'string' && value.length > 1000) {
          return value.substring(0, 1000) + '... [truncated]';
        }
        return value;
      }));
    } catch (error) {
      return { error: 'Failed to sanitize data', original: String(data) };
    }
  }

  getCurrentPerformanceSnapshot() {
    if (typeof performance === 'undefined') return null;
    
    return {
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null,
      timing: performance.timing ? {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
      } : null,
      now: performance.now()
    };
  }

  addLog(logEntry) {
    this.logs.push(logEntry);
    
    // Maintain max log limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Store in localStorage if enabled
    if (this.enableStorage && typeof localStorage !== 'undefined') {
      try {
        const storageKey = `flyx_logs_${this.component.toLowerCase()}`;
        const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
        existingLogs.push(logEntry);
        
        // Keep only last 500 logs per component in storage
        const recentLogs = existingLogs.slice(-500);
        localStorage.setItem(storageKey, JSON.stringify(recentLogs));
      } catch (error) {
        // Ignore storage errors
      }
    }
  }

  outputToConsole(logEntry) {
    if (!this.enableConsole) return;
    
    const { level, message, component, data, context } = logEntry;
    const prefix = `[${component}]`;
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} 🔍 ${message}`, data, context);
        break;
      case 'info':
        console.log(`${prefix} ℹ️ ${message}`, data);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`, data);
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data, context);
        break;
      default:
        console.log(`${prefix} ${message}`, data);
    }
  }

  // Core logging methods
  debug(message, data = {}, context = {}) {
    if (!this.shouldLog('debug')) return;
    
    const logEntry = this.createLogEntry('debug', message, data, context);
    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    return logEntry;
  }

  info(message, data = {}, context = {}) {
    if (!this.shouldLog('info')) return;
    
    const logEntry = this.createLogEntry('info', message, data, context);
    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    return logEntry;
  }

  warn(message, data = {}, context = {}) {
    if (!this.shouldLog('warn')) return;
    
    const logEntry = this.createLogEntry('warn', message, data, context);
    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    return logEntry;
  }

  error(message, error = null, data = {}, context = {}) {
    if (!this.shouldLog('error')) return;
    
    const errorData = {
      ...data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };
    
    const logEntry = this.createLogEntry('error', message, errorData, context);
    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    return logEntry;
  }

  // Performance timing methods
  startTimer(label) {
    const startTime = Date.now();
    this.timers.set(label, startTime);
    this.debug(`Timer started: ${label}`, { startTime });
    return startTime;
  }

  endTimer(label, data = {}) {
    const endTime = Date.now();
    const startTime = this.timers.get(label);
    
    if (!startTime) {
      this.warn(`Timer not found: ${label}`);
      return null;
    }
    
    const duration = endTime - startTime;
    this.timers.delete(label);
    
    // Store performance metric
    this.performanceMetrics.set(label, {
      duration,
      startTime,
      endTime,
      data
    });
    
    this.info(`Timer completed: ${label}`, {
      duration: `${duration}ms`,
      ...data
    });
    
    return duration;
  }

  // Performance metrics tracking
  trackMetric(name, value, unit = '', context = {}) {
    const metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context
    };
    
    this.performanceMetrics.set(`metric_${name}_${Date.now()}`, metric);
    
    this.info(`Performance metric: ${name}`, {
      value: `${value}${unit}`,
      ...context
    });
    
    return metric;
  }

  // Specialized logging methods for different components

  // Extraction process logging
  logExtractionStart(url, mediaType, server) {
    return this.info('Extraction started', {
      url: url?.substring(0, 100) + (url?.length > 100 ? '...' : ''),
      mediaType,
      server,
      extractionId: this.generateLogId()
    });
  }

  logIframeNavigation(step, url, description, success = true) {
    return this.info(`Iframe navigation - Step ${step}`, {
      step,
      url: url?.substring(0, 100) + (url?.length > 100 ? '...' : ''),
      description,
      success,
      navigationChain: true
    });
  }

  logPlayButtonInteraction(selector, success, method = 'click') {
    return this.info('Play button interaction', {
      selector,
      success,
      method,
      interactionType: 'play_button'
    });
  }

  logExtractionResult(success, streamUrl, server, extractionTime, iframeChain = []) {
    return this.info('Extraction completed', {
      success,
      streamUrl: streamUrl?.substring(0, 100) + (streamUrl?.length > 100 ? '...' : ''),
      server,
      extractionTime: `${extractionTime}ms`,
      iframeChainLength: iframeChain.length,
      iframeChain: iframeChain.map(step => ({
        step: step.step,
        description: step.description,
        url: step.url?.substring(0, 50) + '...'
      }))
    });
  }

  // HLS player event logging
  logHlsEvent(eventType, data = {}) {
    return this.info(`HLS Event: ${eventType}`, {
      eventType,
      hlsEvent: true,
      ...data
    });
  }

  logHlsError(errorType, errorDetails, fatal, context = {}) {
    return this.error(`HLS Error: ${errorType}`, null, {
      errorType,
      errorDetails,
      fatal,
      hlsError: true,
      ...context
    });
  }

  logHlsRecovery(recoveryType, attempt, success, context = {}) {
    return this.info(`HLS Recovery: ${recoveryType}`, {
      recoveryType,
      attempt,
      success,
      hlsRecovery: true,
      ...context
    });
  }

  logQualitySwitch(fromLevel, toLevel, reason, automatic = true) {
    return this.info('Quality switch', {
      fromLevel,
      toLevel,
      reason,
      automatic,
      qualitySwitch: true
    });
  }

  logSegmentError(segmentUrl, level, sequenceNumber, errorCount, skipAction = false) {
    return this.warn('Segment error', {
      segmentUrl: segmentUrl?.split('/').pop(),
      level,
      sequenceNumber,
      errorCount,
      skipAction,
      segmentError: true
    });
  }

  logBufferHealth(bufferLength, stallCount, gapJumps, averageLoadTime) {
    return this.info('Buffer health update', {
      bufferLength: `${bufferLength.toFixed(2)}s`,
      stallCount,
      gapJumps,
      averageLoadTime: `${averageLoadTime.toFixed(0)}ms`,
      bufferHealth: true
    });
  }

  // Subtitle logging
  logSubtitleParsing(format, cueCount, parseTime, errors = []) {
    return this.info('Subtitle parsing', {
      format,
      cueCount,
      parseTime: `${parseTime}ms`,
      errorCount: errors.length,
      errors: errors.slice(0, 5), // Only log first 5 errors
      subtitleParsing: true
    });
  }

  logSubtitleSync(currentTime, activeCue, nextCue, syncAccuracy) {
    return this.debug('Subtitle synchronization', {
      currentTime: currentTime.toFixed(3),
      activeCue: activeCue ? {
        id: activeCue.id,
        start: activeCue.start.toFixed(3),
        end: activeCue.end.toFixed(3),
        text: activeCue.text?.substring(0, 50) + '...'
      } : null,
      nextCue: nextCue ? {
        id: nextCue.id,
        start: nextCue.start.toFixed(3)
      } : null,
      syncAccuracy: `${syncAccuracy.toFixed(1)}ms`,
      subtitleSync: true
    });
  }

  logSubtitleLanguageSwitch(fromLang, toLang, success, loadTime) {
    return this.info('Subtitle language switch', {
      fromLang,
      toLang,
      success,
      loadTime: `${loadTime}ms`,
      languageSwitch: true
    });
  }

  // Export functionality
  exportLogs(filterOptions = {}) {
    let filteredLogs = [...this.logs];
    
    // Apply filters
    if (filterOptions.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filterOptions.level);
    }
    
    if (filterOptions.component) {
      filteredLogs = filteredLogs.filter(log => log.component === filterOptions.component);
    }
    
    if (filterOptions.startTime && filterOptions.endTime) {
      filteredLogs = filteredLogs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= filterOptions.startTime && logTime <= filterOptions.endTime;
      });
    }
    
    if (filterOptions.category) {
      filteredLogs = filteredLogs.filter(log => 
        log.data && Object.keys(log.data).some(key => key.includes(filterOptions.category))
      );
    }
    
    return {
      sessionId: this.sessionId,
      component: this.component,
      exportTime: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime,
      totalLogs: this.logs.length,
      filteredLogs: filteredLogs.length,
      logs: filteredLogs,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      summary: this.generateSummary(filteredLogs)
    };
  }

  generateSummary(logs = this.logs) {
    const summary = {
      totalLogs: logs.length,
      levelCounts: {},
      componentCounts: {},
      errorCounts: {},
      performanceMetrics: {
        averageSessionDuration: 0,
        totalTimers: this.timers.size,
        completedTimers: this.performanceMetrics.size
      }
    };
    
    logs.forEach(log => {
      // Level counts
      summary.levelCounts[log.level] = (summary.levelCounts[log.level] || 0) + 1;
      
      // Component counts
      summary.componentCounts[log.component] = (summary.componentCounts[log.component] || 0) + 1;
      
      // Error type counts
      if (log.level === 'error' && log.data?.errorType) {
        summary.errorCounts[log.data.errorType] = (summary.errorCounts[log.data.errorType] || 0) + 1;
      }
    });
    
    return summary;
  }

  downloadDiagnosticReport(filterOptions = {}) {
    const data = this.exportLogs(filterOptions);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyx_${this.component.toLowerCase()}_diagnostic_${this.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.info('Diagnostic report downloaded', {
      component: this.component,
      sessionId: this.sessionId,
      logCount: data.filteredLogs
    });
  }

  // Cleanup
  destroy() {
    this.info('Logger destroyed', {
      totalLogs: this.logs.length,
      sessionDuration: Date.now() - this.startTime
    });
    
    this.logs = [];
    this.performanceMetrics.clear();
    this.timers.clear();
  }
}

// Singleton logger manager for global access
class LoggerManager {
  constructor() {
    this.loggers = new Map();
  }

  getLogger(component, options = {}) {
    if (!this.loggers.has(component)) {
      this.loggers.set(component, new EnhancedLogger(component, options));
    }
    return this.loggers.get(component);
  }

  getAllLogs() {
    const allLogs = [];
    this.loggers.forEach(logger => {
      allLogs.push(...logger.logs);
    });
    
    // Sort by timestamp
    return allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  exportAllLogs() {
    const allLogs = this.getAllLogs();
    const summary = {
      exportTime: new Date().toISOString(),
      totalComponents: this.loggers.size,
      totalLogs: allLogs.length,
      components: Array.from(this.loggers.keys()),
      logs: allLogs
    };
    
    return summary;
  }

  downloadFullDiagnosticReport() {
    const data = this.exportAllLogs();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyx_full_diagnostic_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearAllLogs() {
    this.loggers.forEach(logger => {
      logger.logs = [];
    });
  }

  destroyAll() {
    this.loggers.forEach(logger => {
      logger.destroy();
    });
    this.loggers.clear();
  }
}

// Export singleton instance
export const loggerManager = new LoggerManager();

// Convenience function to get logger
export function getLogger(component, options = {}) {
  return loggerManager.getLogger(component, options);
}