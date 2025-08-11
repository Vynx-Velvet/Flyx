/**
 * Diagnostic Export Utility for User Issue Troubleshooting
 * Provides comprehensive diagnostic data export functionality
 */

import { loggerManager } from './EnhancedLogger.js';

export class DiagnosticExporter {
  constructor() {
    this.exportId = this.generateExportId();
  }

  generateExportId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export all logs with filtering options
  exportAllDiagnostics(options = {}) {
    const {
      includeComponents = [],
      excludeComponents = [],
      logLevel = null,
      timeRange = null,
      includePerformanceMetrics = true,
      includeSystemInfo = true,
      includeErrorSummary = true,
      maxLogsPerComponent = 1000
    } = options;

    const allLogs = loggerManager.getAllLogs();
    let filteredLogs = [...allLogs];

    // Apply component filters
    if (includeComponents.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        includeComponents.includes(log.component)
      );
    }

    if (excludeComponents.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        !excludeComponents.includes(log.component)
      );
    }

    // Apply log level filter
    if (logLevel) {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
      const minPriority = levelPriority[logLevel] || 0;
      
      filteredLogs = filteredLogs.filter(log => 
        (levelPriority[log.level] || 0) >= minPriority
      );
    }

    // Apply time range filter
    if (timeRange && timeRange.start && timeRange.end) {
      filteredLogs = filteredLogs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= timeRange.start && logTime <= timeRange.end;
      });
    }

    // Limit logs per component
    const logsByComponent = this.groupLogsByComponent(filteredLogs);
    const limitedLogs = [];
    
    Object.keys(logsByComponent).forEach(component => {
      const componentLogs = logsByComponent[component];
      const limitedComponentLogs = componentLogs.slice(-maxLogsPerComponent);
      limitedLogs.push(...limitedComponentLogs);
    });

    // Sort by timestamp
    limitedLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const diagnosticData = {
      exportId: this.exportId,
      exportTimestamp: new Date().toISOString(),
      exportOptions: options,
      summary: {
        totalLogs: allLogs.length,
        filteredLogs: limitedLogs.length,
        components: Object.keys(logsByComponent),
        timeRange: {
          earliest: limitedLogs[0]?.timestamp,
          latest: limitedLogs[limitedLogs.length - 1]?.timestamp
        }
      },
      logs: limitedLogs
    };

    // Add system information
    if (includeSystemInfo) {
      diagnosticData.systemInfo = this.collectSystemInfo();
    }

    // Add performance metrics
    if (includePerformanceMetrics) {
      diagnosticData.performanceMetrics = this.collectPerformanceMetrics(limitedLogs);
    }

    // Add error summary
    if (includeErrorSummary) {
      diagnosticData.errorSummary = this.generateErrorSummary(limitedLogs);
    }

    return diagnosticData;
  }

  // Export component-specific diagnostics
  exportComponentDiagnostics(componentName, options = {}) {
    const logger = loggerManager.getLogger(componentName);
    
    if (!logger) {
      throw new Error(`Component logger not found: ${componentName}`);
    }

    const componentExport = logger.exportLogs(options);
    
    return {
      exportId: this.exportId,
      exportTimestamp: new Date().toISOString(),
      component: componentName,
      ...componentExport,
      systemInfo: this.collectSystemInfo(),
      componentSpecific: this.getComponentSpecificData(componentName, logger)
    };
  }

  // Export error-focused diagnostics
  exportErrorDiagnostics(options = {}) {
    const errorOptions = {
      ...options,
      logLevel: 'error',
      includePerformanceMetrics: true,
      includeSystemInfo: true
    };

    const errorDiagnostics = this.exportAllDiagnostics(errorOptions);
    
    // Add error analysis
    errorDiagnostics.errorAnalysis = this.analyzeErrors(errorDiagnostics.logs);
    
    return errorDiagnostics;
  }

  // Export performance-focused diagnostics
  exportPerformanceDiagnostics(options = {}) {
    const performanceOptions = {
      ...options,
      includeComponents: ['HLS', 'Performance', 'Subtitle'],
      includePerformanceMetrics: true,
      includeSystemInfo: true
    };

    const performanceDiagnostics = this.exportAllDiagnostics(performanceOptions);
    
    // Add performance analysis
    performanceDiagnostics.performanceAnalysis = this.analyzePerformance(performanceDiagnostics.logs);
    
    return performanceDiagnostics;
  }

  // Collect system information
  collectSystemInfo() {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'server',
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : null,
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : null,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      } : null,
      screen: typeof screen !== 'undefined' ? {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      } : null,
      connection: typeof navigator !== 'undefined' && navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null,
      memory: typeof performance !== 'undefined' && performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usagePercentage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1)
      } : null,
      timing: typeof performance !== 'undefined' && performance.timing ? {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd,
        pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
      } : null
    };

    return systemInfo;
  }

  // Collect performance metrics from logs
  collectPerformanceMetrics(logs) {
    const metrics = {
      totalLogs: logs.length,
      logsByLevel: {},
      logsByComponent: {},
      errorCounts: {},
      performanceEvents: {
        bufferStalls: 0,
        qualitySwitches: 0,
        segmentErrors: 0,
        recoveryAttempts: 0,
        languageSwitches: 0
      },
      timingMetrics: {
        averageSegmentLoadTime: 0,
        averageParseTime: 0,
        averageSyncAccuracy: 0
      }
    };

    logs.forEach(log => {
      // Count by level
      metrics.logsByLevel[log.level] = (metrics.logsByLevel[log.level] || 0) + 1;
      
      // Count by component
      metrics.logsByComponent[log.component] = (metrics.logsByComponent[log.component] || 0) + 1;
      
      // Count errors by type
      if (log.level === 'error' && log.data?.errorType) {
        metrics.errorCounts[log.data.errorType] = (metrics.errorCounts[log.data.errorType] || 0) + 1;
      }
      
      // Count performance events
      if (log.data?.bufferStall) metrics.performanceEvents.bufferStalls++;
      if (log.data?.qualitySwitch) metrics.performanceEvents.qualitySwitches++;
      if (log.data?.segmentError) metrics.performanceEvents.segmentErrors++;
      if (log.data?.hlsRecovery) metrics.performanceEvents.recoveryAttempts++;
      if (log.data?.languageSwitch) metrics.performanceEvents.languageSwitches++;
    });

    return metrics;
  }

  // Generate error summary
  generateErrorSummary(logs) {
    const errorLogs = logs.filter(log => log.level === 'error');
    
    const summary = {
      totalErrors: errorLogs.length,
      errorsByType: {},
      errorsByComponent: {},
      criticalErrors: [],
      errorTimeline: [],
      mostCommonErrors: []
    };

    errorLogs.forEach(log => {
      // Group by error type
      const errorType = log.data?.errorType || 'unknown';
      summary.errorsByType[errorType] = (summary.errorsByType[errorType] || 0) + 1;
      
      // Group by component
      summary.errorsByComponent[log.component] = (summary.errorsByComponent[log.component] || 0) + 1;
      
      // Collect critical errors
      if (log.data?.fatal || log.data?.severity === 'critical') {
        summary.criticalErrors.push({
          timestamp: log.timestamp,
          component: log.component,
          errorType,
          message: log.message,
          context: log.data?.context
        });
      }
      
      // Build error timeline
      summary.errorTimeline.push({
        timestamp: log.timestamp,
        component: log.component,
        errorType,
        message: log.message
      });
    });

    // Find most common errors
    summary.mostCommonErrors = Object.entries(summary.errorsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([errorType, count]) => ({ errorType, count }));

    return summary;
  }

  // Group logs by component
  groupLogsByComponent(logs) {
    const grouped = {};
    
    logs.forEach(log => {
      if (!grouped[log.component]) {
        grouped[log.component] = [];
      }
      grouped[log.component].push(log);
    });
    
    return grouped;
  }

  // Get component-specific data
  getComponentSpecificData(componentName, logger) {
    const specificData = {};
    
    // Try to get component-specific export methods
    if (typeof logger.exportExtractionDiagnostics === 'function') {
      specificData.extraction = logger.exportExtractionDiagnostics();
    }
    
    if (typeof logger.exportHlsDiagnostics === 'function') {
      specificData.hls = logger.exportHlsDiagnostics();
    }
    
    if (typeof logger.exportSubtitleDiagnostics === 'function') {
      specificData.subtitle = logger.exportSubtitleDiagnostics();
    }
    
    if (typeof logger.exportPerformanceDiagnostics === 'function') {
      specificData.performance = logger.exportPerformanceDiagnostics();
    }
    
    return specificData;
  }

  // Analyze errors for patterns
  analyzeErrors(logs) {
    const errorLogs = logs.filter(log => log.level === 'error');
    
    const analysis = {
      patterns: [],
      recommendations: [],
      severity: 'low'
    };

    // Check for error patterns
    const errorCounts = {};
    errorLogs.forEach(log => {
      const errorType = log.data?.errorType || 'unknown';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });

    // Analyze patterns and generate recommendations
    Object.entries(errorCounts).forEach(([errorType, count]) => {
      if (count > 5) {
        analysis.patterns.push(`Frequent ${errorType} errors (${count} occurrences)`);
        
        switch (errorType) {
          case 'networkError':
            analysis.recommendations.push('Check internet connection stability');
            break;
          case 'segmentError':
            analysis.recommendations.push('Try switching to a different quality or server');
            break;
          case 'subtitleError':
            analysis.recommendations.push('Try disabling and re-enabling subtitles');
            break;
          case 'extractionError':
            analysis.recommendations.push('Try refreshing the page or using a different server');
            break;
        }
      }
    });

    // Determine severity
    const criticalErrors = errorLogs.filter(log => log.data?.fatal || log.data?.severity === 'critical');
    if (criticalErrors.length > 0) {
      analysis.severity = 'critical';
    } else if (errorLogs.length > 10) {
      analysis.severity = 'high';
    } else if (errorLogs.length > 3) {
      analysis.severity = 'medium';
    }

    return analysis;
  }

  // Analyze performance for issues
  analyzePerformance(logs) {
    const analysis = {
      issues: [],
      recommendations: [],
      score: 100
    };

    const performanceLogs = logs.filter(log => 
      log.data?.bufferStall || 
      log.data?.qualitySwitch || 
      log.data?.segmentError ||
      log.data?.memoryUsage
    );

    // Analyze buffer stalls
    const bufferStalls = performanceLogs.filter(log => log.data?.bufferStall);
    if (bufferStalls.length > 5) {
      analysis.issues.push(`Frequent buffer stalls (${bufferStalls.length})`);
      analysis.recommendations.push('Consider lowering video quality or checking network connection');
      analysis.score -= 20;
    }

    // Analyze quality switches
    const qualitySwitches = performanceLogs.filter(log => log.data?.qualitySwitch);
    if (qualitySwitches.length > 10) {
      analysis.issues.push(`Excessive quality switching (${qualitySwitches.length})`);
      analysis.recommendations.push('Network connection may be unstable');
      analysis.score -= 15;
    }

    // Analyze segment errors
    const segmentErrors = performanceLogs.filter(log => log.data?.segmentError);
    if (segmentErrors.length > 3) {
      analysis.issues.push(`Multiple segment errors (${segmentErrors.length})`);
      analysis.recommendations.push('Try switching to a different server or quality');
      analysis.score -= 25;
    }

    // Analyze memory usage
    const memoryLogs = performanceLogs.filter(log => log.data?.memoryUsage);
    const highMemoryUsage = memoryLogs.filter(log => 
      log.data?.usagePercentage && parseFloat(log.data.usagePercentage) > 80
    );
    if (highMemoryUsage.length > 0) {
      analysis.issues.push('High memory usage detected');
      analysis.recommendations.push('Consider refreshing the page to free up memory');
      analysis.score -= 10;
    }

    analysis.score = Math.max(0, analysis.score);
    return analysis;
  }

  // Download diagnostic report
  downloadDiagnosticReport(diagnosticData, filename = null) {
    const defaultFilename = `flyx_diagnostic_${this.exportId}.json`;
    const finalFilename = filename || defaultFilename;
    
    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return finalFilename;
  }

  // Generate user-friendly diagnostic report
  generateUserFriendlyReport(diagnosticData) {
    const report = {
      summary: {
        exportTime: new Date(diagnosticData.exportTimestamp).toLocaleString(),
        totalIssues: (diagnosticData.errorSummary?.totalErrors || 0) + 
                    (diagnosticData.performanceAnalysis?.issues?.length || 0),
        severity: diagnosticData.errorAnalysis?.severity || 'low',
        performanceScore: diagnosticData.performanceAnalysis?.score || 100
      },
      issues: [],
      recommendations: [],
      technicalDetails: {
        browser: this.getBrowserInfo(diagnosticData.systemInfo?.userAgent),
        connection: diagnosticData.systemInfo?.connection,
        memory: diagnosticData.systemInfo?.memory,
        logCounts: diagnosticData.performanceMetrics?.logsByComponent
      }
    };

    // Combine issues and recommendations
    if (diagnosticData.errorAnalysis) {
      report.issues.push(...diagnosticData.errorAnalysis.patterns);
      report.recommendations.push(...diagnosticData.errorAnalysis.recommendations);
    }

    if (diagnosticData.performanceAnalysis) {
      report.issues.push(...diagnosticData.performanceAnalysis.issues);
      report.recommendations.push(...diagnosticData.performanceAnalysis.recommendations);
    }

    return report;
  }

  getBrowserInfo(userAgent) {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }
}

// Export singleton instance
export const diagnosticExporter = new DiagnosticExporter();

// Convenience functions
export function exportAllDiagnostics(options = {}) {
  return diagnosticExporter.exportAllDiagnostics(options);
}

export function exportComponentDiagnostics(componentName, options = {}) {
  return diagnosticExporter.exportComponentDiagnostics(componentName, options);
}

export function exportErrorDiagnostics(options = {}) {
  return diagnosticExporter.exportErrorDiagnostics(options);
}

export function exportPerformanceDiagnostics(options = {}) {
  return diagnosticExporter.exportPerformanceDiagnostics(options);
}

export function downloadDiagnosticReport(diagnosticData, filename = null) {
  return diagnosticExporter.downloadDiagnosticReport(diagnosticData, filename);
}