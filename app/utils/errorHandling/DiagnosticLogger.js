/**
 * Diagnostic logging system with detailed error context
 * Provides comprehensive logging for troubleshooting and monitoring
 */

import { ErrorSeverity } from './ErrorTypes.js';

export class DiagnosticLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logError(classifiedError, context = {}) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'error',
      severity: classifiedError.severity,
      errorType: classifiedError.type,
      category: classifiedError.category,
      message: classifiedError.originalError?.message || 'Unknown error',
      stack: classifiedError.originalError?.stack,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        sessionDuration: Date.now() - this.startTime
      },
      metadata: classifiedError.metadata,
      recoverable: classifiedError.recoverable,
      retryable: classifiedError.retryable
    };

    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    
    // Send critical errors to monitoring immediately
    if (classifiedError.severity === ErrorSeverity.CRITICAL) {
      this.sendToMonitoring(logEntry);
    }

    return logEntry;
  }

  logRecoveryAttempt(classifiedError, context = {}) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'recovery_attempt',
      errorType: classifiedError.type,
      category: classifiedError.category,
      context,
      metadata: {
        originalErrorId: classifiedError.id,
        attemptNumber: context.attemptNumber || 1,
        strategy: context.strategy || 'auto'
      }
    };

    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    return logEntry;
  }

  logRecoveryResult(classifiedError, result) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'recovery_result',
      errorType: classifiedError.type,
      success: result.success,
      action: result.action,
      result,
      metadata: {
        originalErrorId: classifiedError.id,
        recoveryTime: Date.now()
      }
    };

    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    return logEntry;
  }

  logRecoveryFailure(classifiedError, recoveryError) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'recovery_failure',
      severity: ErrorSeverity.HIGH,
      errorType: classifiedError.type,
      originalError: classifiedError.originalError?.message,
      recoveryError: recoveryError?.message,
      stack: recoveryError?.stack,
      metadata: {
        originalErrorId: classifiedError.id,
        failureTime: Date.now()
      }
    };

    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    this.sendToMonitoring(logEntry);
    return logEntry;
  }

  logFatalError(errorType, context, metadata) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'fatal_error',
      severity: ErrorSeverity.CRITICAL,
      errorType,
      context,
      metadata: {
        ...metadata,
        sessionDuration: Date.now() - this.startTime,
        totalLogs: this.logs.length
      }
    };

    this.addLog(logEntry);
    this.outputToConsole(logEntry);
    this.sendToMonitoring(logEntry);
    return logEntry;
  }

  logPerformanceMetric(metric, value, context = {}) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'performance_metric',
      metric,
      value,
      context,
      metadata: {
        sessionDuration: Date.now() - this.startTime
      }
    };

    this.addLog(logEntry);
    return logEntry;
  }

  logUserAction(action, context = {}) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: 'user_action',
      action,
      context,
      metadata: {
        sessionDuration: Date.now() - this.startTime
      }
    };

    this.addLog(logEntry);
    return logEntry;
  }

  addLog(logEntry) {
    this.logs.push(logEntry);
    
    // Maintain max log limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  outputToConsole(logEntry) {
    const { type, severity, errorType, message } = logEntry;
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error(`[CRITICAL] ${type}: ${errorType}`, logEntry);
        break;
      case ErrorSeverity.HIGH:
        console.error(`[HIGH] ${type}: ${errorType}`, logEntry);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(`[MEDIUM] ${type}: ${errorType}`, logEntry);
        break;
      default:
        console.log(`[${severity?.toUpperCase() || 'INFO'}] ${type}: ${errorType || message}`, logEntry);
    }
  }

  async sendToMonitoring(logEntry) {
    try {
      // In a real implementation, this would send to a monitoring service
      // For now, we'll store it locally and provide export functionality
      const monitoringData = {
        ...logEntry,
        environment: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          } : null
        }
      };

      // Store in localStorage for export
      const existingData = JSON.parse(localStorage.getItem('flyx_error_reports') || '[]');
      existingData.push(monitoringData);
      
      // Keep only last 100 error reports
      const recentReports = existingData.slice(-100);
      localStorage.setItem('flyx_error_reports', JSON.stringify(recentReports));
      
    } catch (error) {
      console.error('Failed to send error to monitoring:', error);
    }
  }

  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export functionality for troubleshooting

  exportDiagnosticData() {
    const diagnosticData = {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.startTime,
      totalLogs: this.logs.length,
      logs: this.logs,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null,
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null
      },
      summary: this.generateSummary()
    };

    return diagnosticData;
  }

  generateSummary() {
    const errorCounts = {};
    const severityCounts = {};
    const typeCounts = {};

    this.logs.forEach(log => {
      if (log.errorType) {
        errorCounts[log.errorType] = (errorCounts[log.errorType] || 0) + 1;
      }
      if (log.severity) {
        severityCounts[log.severity] = (severityCounts[log.severity] || 0) + 1;
      }
      if (log.type) {
        typeCounts[log.type] = (typeCounts[log.type] || 0) + 1;
      }
    });

    return {
      totalLogs: this.logs.length,
      errorCounts,
      severityCounts,
      typeCounts,
      sessionDuration: Date.now() - this.startTime,
      firstLogTime: this.logs[0]?.timestamp,
      lastLogTime: this.logs[this.logs.length - 1]?.timestamp
    };
  }

  downloadDiagnosticReport() {
    const data = this.exportDiagnosticData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyx_diagnostic_report_${this.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearLogs() {
    this.logs = [];
  }

  getLogsByType(type) {
    return this.logs.filter(log => log.type === type);
  }

  getLogsBySeverity(severity) {
    return this.logs.filter(log => log.severity === severity);
  }

  getLogsInTimeRange(startTime, endTime) {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= startTime && logTime <= endTime;
    });
  }
}