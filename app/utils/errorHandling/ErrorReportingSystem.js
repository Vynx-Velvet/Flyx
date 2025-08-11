/**
 * Error reporting system for troubleshooting and monitoring
 * Collects and sends error reports for analysis and improvement
 */

import { DiagnosticLogger } from './DiagnosticLogger.js';

export class ErrorReportingSystem {
  constructor() {
    this.logger = new DiagnosticLogger();
    this.reportQueue = [];
    this.isOnline = navigator.onLine;
    this.maxQueueSize = 50;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushReportQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async reportError(classifiedError, context = {}, userFeedback = null) {
    const report = this.createErrorReport(classifiedError, context, userFeedback);
    
    // Log the report creation
    this.logger.logUserAction('error_report_created', {
      errorType: classifiedError.type,
      severity: classifiedError.severity,
      hasUserFeedback: !!userFeedback
    });

    if (this.isOnline) {
      try {
        await this.sendReport(report);
        return { success: true, reportId: report.id };
      } catch (error) {
        // If sending fails, queue the report
        this.queueReport(report);
        return { success: false, queued: true, reportId: report.id };
      }
    } else {
      // Queue the report for later sending
      this.queueReport(report);
      return { success: false, queued: true, reportId: report.id };
    }
  }

  createErrorReport(classifiedError, context = {}, userFeedback = null) {
    const report = {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      sessionId: this.logger.sessionId,
      
      // Error information
      error: {
        type: classifiedError.type,
        severity: classifiedError.severity,
        category: classifiedError.category,
        message: classifiedError.originalError?.message,
        stack: classifiedError.originalError?.stack,
        recoverable: classifiedError.recoverable,
        retryable: classifiedError.retryable
      },

      // Context information
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionDuration: Date.now() - this.logger.startTime
      },

      // Technical metadata
      metadata: classifiedError.metadata,

      // User feedback
      userFeedback: userFeedback ? {
        description: userFeedback.description,
        reproductionSteps: userFeedback.reproductionSteps,
        expectedBehavior: userFeedback.expectedBehavior,
        actualBehavior: userFeedback.actualBehavior,
        additionalInfo: userFeedback.additionalInfo,
        contactEmail: userFeedback.contactEmail,
        allowFollowUp: userFeedback.allowFollowUp
      } : null,

      // Environment information
      environment: this.collectEnvironmentInfo(),

      // Performance metrics
      performance: this.collectPerformanceMetrics(),

      // Recent logs (last 10 relevant logs)
      recentLogs: this.getRecentRelevantLogs(classifiedError.type),

      // Report metadata
      reportMetadata: {
        version: '1.0',
        source: 'flyx_web_app',
        reportType: 'error_report',
        priority: this.determinePriority(classifiedError.severity)
      }
    };

    return report;
  }

  collectEnvironmentInfo() {
    return {
      // Browser information
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,

      // Screen information
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      },

      // Viewport information
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },

      // Connection information
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null,

      // Memory information (if available)
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null,

      // Timezone
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset()
    };
  }

  collectPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      // Navigation timing
      navigation: navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        firstByte: navigation.responseStart - navigation.requestStart
      } : null,

      // Paint timing
      paint: paint.reduce((acc, entry) => {
        acc[entry.name] = entry.startTime;
        return acc;
      }, {}),

      // Current performance
      now: performance.now(),
      timeOrigin: performance.timeOrigin
    };
  }

  getRecentRelevantLogs(errorType) {
    const allLogs = this.logger.logs;
    const relevantLogs = allLogs.filter(log => 
      log.errorType === errorType || 
      log.type === 'recovery_attempt' || 
      log.type === 'recovery_result' ||
      log.type === 'user_action'
    );
    
    // Return last 10 relevant logs
    return relevantLogs.slice(-10);
  }

  determinePriority(severity) {
    switch (severity) {
      case 'critical':
        return 'high';
      case 'high':
        return 'medium';
      case 'medium':
        return 'low';
      default:
        return 'low';
    }
  }

  async sendReport(report) {
    // In a real implementation, this would send to your error reporting service
    // For now, we'll simulate the API call and store locally
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store the report locally for demonstration
      const existingReports = JSON.parse(localStorage.getItem('flyx_error_reports') || '[]');
      existingReports.push(report);
      
      // Keep only last 100 reports
      const recentReports = existingReports.slice(-100);
      localStorage.setItem('flyx_error_reports', JSON.stringify(recentReports));
      
      // Log successful report
      this.logger.logUserAction('error_report_sent', {
        reportId: report.id,
        errorType: report.error.type,
        severity: report.error.severity
      });
      
      return { success: true, reportId: report.id };
    } catch (error) {
      console.error('Failed to send error report:', error);
      throw error;
    }
  }

  queueReport(report) {
    this.reportQueue.push(report);
    
    // Maintain queue size limit
    if (this.reportQueue.length > this.maxQueueSize) {
      this.reportQueue = this.reportQueue.slice(-this.maxQueueSize);
    }
    
    // Store queue in localStorage for persistence
    localStorage.setItem('flyx_report_queue', JSON.stringify(this.reportQueue));
  }

  async flushReportQueue() {
    if (this.reportQueue.length === 0) return;
    
    const reportsToSend = [...this.reportQueue];
    this.reportQueue = [];
    
    for (const report of reportsToSend) {
      try {
        await this.sendReport(report);
      } catch (error) {
        // If sending fails, put it back in the queue
        this.queueReport(report);
      }
    }
    
    // Update localStorage
    localStorage.setItem('flyx_report_queue', JSON.stringify(this.reportQueue));
  }

  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // User feedback collection methods

  createFeedbackForm(classifiedError) {
    return {
      errorType: classifiedError.type,
      severity: classifiedError.severity,
      fields: [
        {
          name: 'description',
          label: 'What happened?',
          type: 'textarea',
          required: true,
          placeholder: 'Please describe what you were trying to do when this error occurred...'
        },
        {
          name: 'reproductionSteps',
          label: 'How can we reproduce this issue?',
          type: 'textarea',
          required: false,
          placeholder: '1. Go to...\n2. Click on...\n3. See error...'
        },
        {
          name: 'expectedBehavior',
          label: 'What did you expect to happen?',
          type: 'textarea',
          required: false,
          placeholder: 'I expected the video to play normally...'
        },
        {
          name: 'actualBehavior',
          label: 'What actually happened?',
          type: 'textarea',
          required: false,
          placeholder: 'Instead, I saw an error message...'
        },
        {
          name: 'additionalInfo',
          label: 'Any additional information?',
          type: 'textarea',
          required: false,
          placeholder: 'Browser version, device type, etc...'
        },
        {
          name: 'contactEmail',
          label: 'Email (optional)',
          type: 'email',
          required: false,
          placeholder: 'your.email@example.com'
        },
        {
          name: 'allowFollowUp',
          label: 'Allow follow-up contact?',
          type: 'checkbox',
          required: false,
          defaultValue: false
        }
      ]
    };
  }

  // Analytics and monitoring methods

  getErrorStatistics() {
    const reports = JSON.parse(localStorage.getItem('flyx_error_reports') || '[]');
    
    const stats = {
      totalReports: reports.length,
      byType: {},
      bySeverity: {},
      byTimeRange: {
        last24Hours: 0,
        lastWeek: 0,
        lastMonth: 0
      }
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    const month = 30 * day;

    reports.forEach(report => {
      // Count by type
      const errorType = report.error.type;
      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
      
      // Count by severity
      const severity = report.error.severity;
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      
      // Count by time range
      const reportTime = new Date(report.timestamp).getTime();
      if (now - reportTime < day) {
        stats.byTimeRange.last24Hours++;
      }
      if (now - reportTime < week) {
        stats.byTimeRange.lastWeek++;
      }
      if (now - reportTime < month) {
        stats.byTimeRange.lastMonth++;
      }
    });

    return stats;
  }

  exportErrorReports() {
    const reports = JSON.parse(localStorage.getItem('flyx_error_reports') || '[]');
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyx_error_reports_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearErrorReports() {
    localStorage.removeItem('flyx_error_reports');
    localStorage.removeItem('flyx_report_queue');
    this.reportQueue = [];
  }
}