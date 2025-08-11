/**
 * Enhanced Logging System - Main Export
 * Provides comprehensive logging for media playback debugging and troubleshooting
 */

// Core logging system
export { 
  EnhancedLogger, 
  loggerManager, 
  getLogger 
} from './EnhancedLogger.js';

// Specialized loggers
export { 
  ExtractionLogger, 
  createExtractionLogger 
} from './ExtractionLogger.js';

export { 
  HlsLogger, 
  createHlsLogger 
} from './HlsLogger.js';

export { 
  SubtitleLogger, 
  createSubtitleLogger 
} from './SubtitleLogger.js';

export { 
  PerformanceLogger, 
  createPerformanceLogger 
} from './PerformanceLogger.js';

// Diagnostic export utilities
export { 
  DiagnosticExporter,
  diagnosticExporter,
  exportAllDiagnostics,
  exportComponentDiagnostics,
  exportErrorDiagnostics,
  exportPerformanceDiagnostics,
  downloadDiagnosticReport
} from './DiagnosticExporter.js';

// Convenience functions for quick logger access
export function createMediaPlaybackLogger(streamUrl, mediaId) {
  return {
    extraction: createExtractionLogger(),
    hls: createHlsLogger(streamUrl),
    subtitle: createSubtitleLogger(mediaId),
    performance: createPerformanceLogger('MediaPlayback')
  };
}

// Global diagnostic functions
export function downloadFullDiagnosticReport() {
  return loggerManager.downloadFullDiagnosticReport();
}

export function clearAllLogs() {
  return loggerManager.clearAllLogs();
}

export function getAllLogs() {
  return loggerManager.getAllLogs();
}

// Logger configuration presets
export const LoggerPresets = {
  DEVELOPMENT: {
    enableConsole: true,
    enableStorage: true,
    logLevel: 'debug',
    maxLogs: 2000
  },
  PRODUCTION: {
    enableConsole: false,
    enableStorage: true,
    logLevel: 'warn',
    maxLogs: 1000
  },
  DEBUGGING: {
    enableConsole: true,
    enableStorage: true,
    logLevel: 'debug',
    maxLogs: 5000
  },
  MINIMAL: {
    enableConsole: false,
    enableStorage: false,
    logLevel: 'error',
    maxLogs: 100
  }
};

// Quick setup function
export function setupLogging(preset = 'DEVELOPMENT') {
  const config = LoggerPresets[preset] || LoggerPresets.DEVELOPMENT;
  
  // Configure all existing loggers with the preset
  loggerManager.loggers.forEach(logger => {
    Object.assign(logger, config);
  });
  
  return config;
}