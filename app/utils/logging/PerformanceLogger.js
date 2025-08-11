/**
 * Specialized logger for performance metrics and buffer health monitoring
 * Provides detailed logging for quality switches, buffer events, and system performance
 */

import { getLogger } from './EnhancedLogger.js';

export class PerformanceLogger {
  constructor(component = 'Performance') {
    this.component = component;
    this.performanceSessionId = this.generatePerformanceSessionId();
    this.logger = getLogger(component, {
      enableConsole: true,
      enableStorage: true,
      logLevel: 'info'
    });
    
    // Performance tracking
    this.bufferHealthHistory = [];
    this.qualitySwitchHistory = [];
    this.networkConditions = [];
    this.memorySnapshots = [];
    this.connectionOptimizations = [];
    
    // Metrics aggregation
    this.metrics = {
      bufferStalls: 0,
      qualityChanges: 0,
      networkErrors: 0,
      memoryLeaks: 0,
      connectionOptimizations: 0,
      averageBufferHealth: 0,
      averageLoadTime: 0
    };
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  generatePerformanceSessionId() {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startPerformanceMonitoring() {
    this.logger.info('Performance monitoring started', {
      performanceSessionId: this.performanceSessionId,
      component: this.component,
      performanceMonitoringStart: true
    });
    
    // Start periodic performance snapshots
    this.performanceInterval = setInterval(() => {
      this.capturePerformanceSnapshot();
    }, 30000); // Every 30 seconds
  }

  // Buffer health monitoring
  logBufferHealth(bufferLength, stallCount, gapJumps, averageLoadTime, additionalMetrics = {}) {
    const healthSnapshot = {
      timestamp: Date.now(),
      bufferLength: parseFloat(bufferLength.toFixed(2)),
      stallCount,
      gapJumps,
      averageLoadTime: parseFloat(averageLoadTime.toFixed(0)),
      ...additionalMetrics
    };
    
    this.bufferHealthHistory.push(healthSnapshot);
    
    // Keep only last 100 snapshots
    if (this.bufferHealthHistory.length > 100) {
      this.bufferHealthHistory = this.bufferHealthHistory.slice(-100);
    }
    
    // Update metrics
    this.metrics.averageBufferHealth = this.calculateAverageBufferHealth();
    this.metrics.averageLoadTime = averageLoadTime;
    
    return this.logger.info('Buffer health update', {
      performanceSessionId: this.performanceSessionId,
      ...healthSnapshot,
      bufferHealthTrend: this.getBufferHealthTrend(),
      bufferHealth: true
    });
  }

  logBufferStall(currentTime, bufferLength, stallDuration, recoveryMethod) {
    this.metrics.bufferStalls++;
    
    return this.logger.warn('Buffer stall detected', {
      performanceSessionId: this.performanceSessionId,
      currentTime: currentTime.toFixed(3),
      bufferLength: bufferLength.toFixed(3),
      stallDuration: `${stallDuration}ms`,
      recoveryMethod,
      totalStalls: this.metrics.bufferStalls,
      bufferStall: true
    });
  }

  logBufferRecovery(stallDuration, recoveryMethod, success, newBufferLength) {
    return this.logger.info('Buffer stall recovery', {
      performanceSessionId: this.performanceSessionId,
      stallDuration: `${stallDuration}ms`,
      recoveryMethod,
      success,
      newBufferLength: newBufferLength.toFixed(3),
      bufferRecovery: true
    });
  }

  // Quality switch monitoring
  logQualitySwitch(fromQuality, toQuality, reason, automatic, switchTime, bufferState) {
    const qualitySwitch = {
      timestamp: Date.now(),
      fromQuality: fromQuality ? {
        level: fromQuality.level,
        height: fromQuality.height,
        bitrate: fromQuality.bitrate
      } : null,
      toQuality: toQuality ? {
        level: toQuality.level,
        height: toQuality.height,
        bitrate: toQuality.bitrate
      } : null,
      reason,
      automatic,
      switchTime,
      bufferState: {
        length: bufferState?.length?.toFixed(2),
        health: bufferState?.health
      }
    };
    
    this.qualitySwitchHistory.push(qualitySwitch);
    this.metrics.qualityChanges++;
    
    // Keep only last 50 switches
    if (this.qualitySwitchHistory.length > 50) {
      this.qualitySwitchHistory = this.qualitySwitchHistory.slice(-50);
    }
    
    return this.logger.info('Quality switch executed', {
      performanceSessionId: this.performanceSessionId,
      ...qualitySwitch,
      totalQualityChanges: this.metrics.qualityChanges,
      qualityStability: this.calculateQualityStability(),
      qualitySwitch: true
    });
  }

  logQualityOscillation(switchCount, timeWindow, levels) {
    return this.logger.warn('Quality oscillation detected', {
      performanceSessionId: this.performanceSessionId,
      switchCount,
      timeWindow: `${timeWindow}ms`,
      levels: levels.map(l => `${l.height}p`),
      qualityOscillation: true
    });
  }

  // Network condition monitoring
  logNetworkCondition(effectiveType, downlink, rtt, saveData) {
    const networkCondition = {
      timestamp: Date.now(),
      effectiveType,
      downlink: parseFloat(downlink?.toFixed(2)) || 0,
      rtt: parseInt(rtt) || 0,
      saveData: !!saveData
    };
    
    this.networkConditions.push(networkCondition);
    
    // Keep only last 20 network condition snapshots
    if (this.networkConditions.length > 20) {
      this.networkConditions = this.networkConditions.slice(-20);
    }
    
    return this.logger.debug('Network condition detected', {
      performanceSessionId: this.performanceSessionId,
      ...networkCondition,
      networkTrend: this.getNetworkTrend(),
      networkCondition: true
    });
  }

  logNetworkChange(fromCondition, toCondition, impact) {
    return this.logger.info('Network condition changed', {
      performanceSessionId: this.performanceSessionId,
      fromCondition,
      toCondition,
      impact, // 'positive', 'negative', 'neutral'
      networkChange: true
    });
  }

  // Memory usage monitoring
  logMemoryUsage(usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit) {
    const memorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: Math.round(usedJSHeapSize / 1024 / 1024), // MB
      totalJSHeapSize: Math.round(totalJSHeapSize / 1024 / 1024), // MB
      jsHeapSizeLimit: Math.round(jsHeapSizeLimit / 1024 / 1024), // MB
      usagePercentage: ((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(1)
    };
    
    this.memorySnapshots.push(memorySnapshot);
    
    // Keep only last 50 snapshots
    if (this.memorySnapshots.length > 50) {
      this.memorySnapshots = this.memorySnapshots.slice(-50);
    }
    
    // Check for memory leaks
    const memoryTrend = this.getMemoryTrend();
    if (memoryTrend === 'increasing' && memorySnapshot.usagePercentage > 80) {
      this.metrics.memoryLeaks++;
      this.logger.warn('Potential memory leak detected', {
        performanceSessionId: this.performanceSessionId,
        ...memorySnapshot,
        memoryTrend,
        memoryLeak: true
      });
    }
    
    return this.logger.debug('Memory usage snapshot', {
      performanceSessionId: this.performanceSessionId,
      ...memorySnapshot,
      memoryTrend,
      memoryUsage: true
    });
  }

  logMemoryCleanup(cleanupType, freedMemory, success) {
    return this.logger.info('Memory cleanup executed', {
      performanceSessionId: this.performanceSessionId,
      cleanupType,
      freedMemory: `${(freedMemory / 1024 / 1024).toFixed(1)}MB`,
      success,
      memoryCleanup: true
    });
  }

  // Connection optimization monitoring
  logConnectionOptimization(optimizationType, applied, reason, impact) {
    const optimization = {
      timestamp: Date.now(),
      optimizationType,
      applied,
      reason,
      impact
    };
    
    this.connectionOptimizations.push(optimization);
    
    if (applied) {
      this.metrics.connectionOptimizations++;
    }
    
    return this.logger.info('Connection optimization', {
      performanceSessionId: this.performanceSessionId,
      ...optimization,
      totalOptimizations: this.metrics.connectionOptimizations,
      connectionOptimization: true
    });
  }

  logCdnFailover(fromCdn, toCdn, reason, switchTime) {
    return this.logger.warn('CDN failover executed', {
      performanceSessionId: this.performanceSessionId,
      fromCdn,
      toCdn,
      reason,
      switchTime: `${switchTime}ms`,
      cdnFailover: true
    });
  }

  // Performance metrics calculation
  calculateAverageBufferHealth() {
    if (this.bufferHealthHistory.length === 0) return 0;
    
    const totalHealth = this.bufferHealthHistory.reduce((sum, snapshot) => {
      return sum + snapshot.bufferLength;
    }, 0);
    
    return parseFloat((totalHealth / this.bufferHealthHistory.length).toFixed(2));
  }

  getBufferHealthTrend() {
    if (this.bufferHealthHistory.length < 3) return 'stable';
    
    const recent = this.bufferHealthHistory.slice(-3);
    const trend = recent[2].bufferLength - recent[0].bufferLength;
    
    if (trend > 1) return 'improving';
    if (trend < -1) return 'declining';
    return 'stable';
  }

  calculateQualityStability() {
    if (this.qualitySwitchHistory.length < 2) return 100;
    
    const recentSwitches = this.qualitySwitchHistory.slice(-10);
    const timeWindow = 60000; // 1 minute
    const now = Date.now();
    
    const recentSwitchCount = recentSwitches.filter(
      s => now - s.timestamp < timeWindow
    ).length;
    
    // Lower switch count = higher stability
    return Math.max(0, 100 - (recentSwitchCount * 10));
  }

  getNetworkTrend() {
    if (this.networkConditions.length < 3) return 'stable';
    
    const recent = this.networkConditions.slice(-3);
    const downlinkTrend = recent[2].downlink - recent[0].downlink;
    const rttTrend = recent[0].rtt - recent[2].rtt; // Lower RTT is better
    
    if (downlinkTrend > 0.5 || rttTrend > 10) return 'improving';
    if (downlinkTrend < -0.5 || rttTrend < -10) return 'declining';
    return 'stable';
  }

  getMemoryTrend() {
    if (this.memorySnapshots.length < 5) return 'stable';
    
    const recent = this.memorySnapshots.slice(-5);
    const usageTrend = recent[4].usedJSHeapSize - recent[0].usedJSHeapSize;
    
    if (usageTrend > 10) return 'increasing'; // 10MB increase
    if (usageTrend < -10) return 'decreasing';
    return 'stable';
  }

  // Periodic performance snapshot
  capturePerformanceSnapshot() {
    if (typeof performance === 'undefined') return;
    
    const snapshot = {
      timestamp: Date.now(),
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      navigation: performance.navigation ? {
        type: performance.navigation.type,
        redirectCount: performance.navigation.redirectCount
      } : null,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
    
    this.logger.debug('Performance snapshot captured', {
      performanceSessionId: this.performanceSessionId,
      ...snapshot,
      performanceSnapshot: true
    });
    
    // Log memory usage if available
    if (snapshot.memory) {
      this.logMemoryUsage(
        performance.memory.usedJSHeapSize,
        performance.memory.totalJSHeapSize,
        performance.memory.jsHeapSizeLimit
      );
    }
    
    // Log network condition if available
    if (snapshot.connection) {
      this.logNetworkCondition(
        snapshot.connection.effectiveType,
        snapshot.connection.downlink,
        snapshot.connection.rtt
      );
    }
  }

  // Performance summary and reporting
  generatePerformanceSummary() {
    const summary = {
      sessionId: this.performanceSessionId,
      component: this.component,
      duration: Date.now() - this.performanceSessionId.split('_')[1],
      metrics: { ...this.metrics },
      trends: {
        bufferHealth: this.getBufferHealthTrend(),
        qualityStability: this.calculateQualityStability(),
        networkTrend: this.getNetworkTrend(),
        memoryTrend: this.getMemoryTrend()
      },
      snapshots: {
        bufferHealth: this.bufferHealthHistory.length,
        qualitySwitches: this.qualitySwitchHistory.length,
        networkConditions: this.networkConditions.length,
        memorySnapshots: this.memorySnapshots.length
      }
    };
    
    this.logger.info('Performance summary generated', {
      performanceSessionId: this.performanceSessionId,
      ...summary,
      performanceSummary: true
    });
    
    return summary;
  }

  // Export performance-specific diagnostic data
  exportPerformanceDiagnostics() {
    const baseExport = this.logger.exportLogs({
      category: 'performance'
    });
    
    return {
      ...baseExport,
      performanceSessionId: this.performanceSessionId,
      component: this.component,
      performanceSpecific: {
        bufferHealthHistory: this.bufferHealthHistory,
        qualitySwitchHistory: this.qualitySwitchHistory,
        networkConditions: this.networkConditions,
        memorySnapshots: this.memorySnapshots,
        connectionOptimizations: this.connectionOptimizations,
        metrics: this.metrics,
        summary: this.generatePerformanceSummary()
      }
    };
  }

  // Cleanup
  destroy() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    this.logger.info('Performance monitoring stopped', {
      performanceSessionId: this.performanceSessionId,
      finalSummary: this.generatePerformanceSummary(),
      performanceMonitoringStop: true
    });
    
    this.bufferHealthHistory = [];
    this.qualitySwitchHistory = [];
    this.networkConditions = [];
    this.memorySnapshots = [];
    this.connectionOptimizations = [];
  }

  // Convenience methods
  info(message, data = {}) {
    return this.logger.info(message, {
      performanceSessionId: this.performanceSessionId,
      ...data
    });
  }

  warn(message, data = {}) {
    return this.logger.warn(message, {
      performanceSessionId: this.performanceSessionId,
      ...data
    });
  }

  error(message, error = null, data = {}) {
    return this.logger.error(message, error, {
      performanceSessionId: this.performanceSessionId,
      ...data
    });
  }

  debug(message, data = {}) {
    return this.logger.debug(message, {
      performanceSessionId: this.performanceSessionId,
      ...data
    });
  }
}

// Factory function for creating performance loggers
export function createPerformanceLogger(component = 'Performance') {
  return new PerformanceLogger(component);
}