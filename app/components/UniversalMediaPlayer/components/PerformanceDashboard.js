import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * PerformanceDashboard - Advanced performance monitoring and analytics dashboard
 * 
 * Features:
 * - Real-time performance metrics (FPS, CPU, memory, network)
 * - Interactive performance graphs and charts
 * - System capability detection and recommendations
 * - Performance optimization suggestions
 * - Resource usage tracking and alerts
 * - Detailed analytics with historical data
 * - Export performance reports
 * - Adaptive performance profiling
 */
const PerformanceDashboard = ({
  isVisible = false,
  videoRef = null,
  onClose = null,
  onOptimizationApply = null,
  enableProfiling = true,
  alertThresholds = {
    cpu: 80,
    memory: 85,
    fps: 30,
    network: 1000
  }
}) => {
  const [metrics, setMetrics] = useState({
    fps: 60,
    cpuUsage: 0,
    memoryUsage: 0,
    networkSpeed: 0,
    bufferHealth: 100,
    renderTime: 0,
    decodeTime: 0,
    droppedFrames: 0,
    totalFrames: 0
  });
  
  const [systemInfo, setSystemInfo] = useState({});
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [optimizations, setOptimizations] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('fps');

  const metricsRef = useRef({});
  const historyRef = useRef([]);
  const monitoringRef = useRef(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });

  // System capability detection
  useEffect(() => {
    const detectSystemCapabilities = () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      const info = {
        // Hardware info
        deviceMemory: navigator.deviceMemory || 4,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        
        // Browser capabilities
        webglVersion: gl ? (canvas.getContext('webgl2') ? '2.0' : '1.0') : 'None',
        webglRenderer: gl ? gl.getParameter(gl.RENDERER) : 'Unknown',
        webglVendor: gl ? gl.getParameter(gl.VENDOR) : 'Unknown',
        
        // Screen info
        screenWidth: screen.width,
        screenHeight: screen.height,
        pixelRatio: window.devicePixelRatio || 1,
        colorDepth: screen.colorDepth,
        
        // Connection info
        connectionType: navigator.connection?.effectiveType || 'unknown',
        connectionSpeed: navigator.connection?.downlink || 0,
        
        // Performance observer support
        performanceObserver: 'PerformanceObserver' in window,
        intersectionObserver: 'IntersectionObserver' in window,
        requestIdleCallback: 'requestIdleCallback' in window,
        
        // Media capabilities
        mediaCapabilities: 'mediaCapabilities' in navigator,
        webcodecs: 'VideoDecoder' in window,
        
        // Storage
        storageQuota: null // Will be filled asynchronously
      };
      
      // Get storage quota if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          info.storageQuota = estimate.quota;
          info.storageUsed = estimate.usage;
          setSystemInfo({ ...info });
        });
      } else {
        setSystemInfo(info);
      }
    };
    
    detectSystemCapabilities();
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (!enableProfiling || !isVisible) return;
    
    const monitor = () => {
      const now = performance.now();
      const newMetrics = { ...metrics };
      
      // FPS calculation
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        newMetrics.fps = fpsCounterRef.current.frames;
        fpsCounterRef.current = { frames: 0, lastTime: now };
      }
      
      // Memory usage (if available)
      if (performance.memory) {
        newMetrics.memoryUsage = Math.round(
          (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100
        );
      }
      
      // Network speed estimation
      if (navigator.connection) {
        newMetrics.networkSpeed = navigator.connection.downlink * 1000; // Convert to kbps
      }
      
      // Video-specific metrics
      if (videoRef?.current) {
        const video = videoRef.current;
        const videoQuality = video.getVideoPlaybackQuality?.();
        
        if (videoQuality) {
          newMetrics.droppedFrames = videoQuality.droppedVideoFrames;
          newMetrics.totalFrames = videoQuality.totalVideoFrames;
        }
        
        // Buffer health
        if (video.buffered.length > 0) {
          const buffered = video.buffered.end(video.buffered.length - 1);
          const currentTime = video.currentTime;
          const bufferAhead = Math.max(0, buffered - currentTime);
          newMetrics.bufferHealth = Math.min(100, (bufferAhead / 10) * 100); // 10 seconds = 100%
        }
      }
      
      // CPU usage estimation (rough approximation)
      const renderStart = performance.now();
      requestAnimationFrame(() => {
        const renderEnd = performance.now();
        newMetrics.renderTime = renderEnd - renderStart;
        
        // Estimate CPU usage based on frame timing
        const targetFrameTime = 1000 / 60; // 16.67ms for 60fps
        newMetrics.cpuUsage = Math.min(100, (newMetrics.renderTime / targetFrameTime) * 100);
      });
      
      setMetrics(newMetrics);
      metricsRef.current = newMetrics;
      
      // Add to history
      const historyEntry = {
        timestamp: now,
        ...newMetrics
      };
      
      historyRef.current = [historyEntry, ...historyRef.current.slice(0, 299)]; // Keep last 300 entries
      setPerformanceHistory([...historyRef.current]);
      
      // Check for alerts
      checkForAlerts(newMetrics);
      
      // Generate optimizations
      generateOptimizations(newMetrics);
    };
    
    monitoringRef.current = setInterval(monitor, 1000);
    
    return () => {
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
      }
    };
  }, [enableProfiling, isVisible, videoRef, metrics, alertThresholds]);

  // Alert checking
  const checkForAlerts = useCallback((currentMetrics) => {
    const newAlerts = [];
    
    if (currentMetrics.fps < alertThresholds.fps) {
      newAlerts.push({
        id: 'low-fps',
        type: 'warning',
        title: 'Low Frame Rate',
        message: `FPS dropped to ${currentMetrics.fps}. Consider reducing visual effects.`,
        timestamp: Date.now()
      });
    }
    
    if (currentMetrics.cpuUsage > alertThresholds.cpu) {
      newAlerts.push({
        id: 'high-cpu',
        type: 'error',
        title: 'High CPU Usage',
        message: `CPU usage at ${Math.round(currentMetrics.cpuUsage)}%. System may be overloaded.`,
        timestamp: Date.now()
      });
    }
    
    if (currentMetrics.memoryUsage > alertThresholds.memory) {
      newAlerts.push({
        id: 'high-memory',
        type: 'warning',
        title: 'High Memory Usage',
        message: `Memory usage at ${currentMetrics.memoryUsage}%. Consider clearing cache.`,
        timestamp: Date.now()
      });
    }
    
    if (currentMetrics.bufferHealth < 20) {
      newAlerts.push({
        id: 'low-buffer',
        type: 'error',
        title: 'Low Buffer',
        message: 'Video buffer is running low. Check network connection.',
        timestamp: Date.now()
      });
    }
    
    setAlerts(prev => {
      const existing = prev.filter(alert => 
        !newAlerts.some(newAlert => newAlert.id === alert.id)
      );
      return [...newAlerts, ...existing].slice(0, 10);
    });
  }, [alertThresholds]);

  // Optimization suggestions
  const generateOptimizations = useCallback((currentMetrics) => {
    const suggestions = [];
    
    if (currentMetrics.fps < 45) {
      suggestions.push({
        id: 'reduce-particles',
        title: 'Reduce Particle Effects',
        description: 'Lower particle quality to improve frame rate',
        impact: 'High',
        action: () => onOptimizationApply?.({ particleQuality: 'low' })
      });
      
      suggestions.push({
        id: 'disable-ambient',
        title: 'Disable Ambient Lighting',
        description: 'Turn off ambient lighting effects to reduce GPU load',
        impact: 'Medium',
        action: () => onOptimizationApply?.({ ambientLighting: false })
      });
    }
    
    if (currentMetrics.memoryUsage > 80) {
      suggestions.push({
        id: 'clear-cache',
        title: 'Clear Video Cache',
        description: 'Free up memory by clearing unused video data',
        impact: 'Medium',
        action: () => {
          // Clear caches
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }
        }
      });
    }
    
    if (currentMetrics.networkSpeed < 1000 && currentMetrics.bufferHealth < 50) {
      suggestions.push({
        id: 'lower-quality',
        title: 'Lower Video Quality',
        description: 'Reduce video quality to improve buffering',
        impact: 'High',
        action: () => onOptimizationApply?.({ quality: 'auto', adaptiveStreaming: true })
      });
    }
    
    if (systemInfo.deviceMemory && systemInfo.deviceMemory < 4) {
      suggestions.push({
        id: 'performance-mode',
        title: 'Enable Performance Mode',
        description: 'Optimize settings for low-memory devices',
        impact: 'High',
        action: () => onOptimizationApply?.({
          renderingMode: 'performance',
          particleQuality: 'low',
          ambientLighting: false
        })
      });
    }
    
    setOptimizations(suggestions.slice(0, 5));
  }, [onOptimizationApply, systemInfo.deviceMemory]);

  // Export performance report
  const exportReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      systemInfo,
      currentMetrics: metrics,
      performanceHistory: historyRef.current.slice(0, 100),
      alerts: alerts,
      optimizations: optimizations
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-report-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [systemInfo, metrics, alerts, optimizations]);

  // Metric chart component
  const MetricChart = ({ data, metric, color = '#00ff88' }) => {
    const maxValue = useMemo(() => {
      return Math.max(...data.map(d => d[metric] || 0)) || 100;
    }, [data, metric]);
    
    const points = useMemo(() => {
      if (data.length < 2) return '';
      
      const width = 300;
      const height = 80;
      
      return data
        .slice(0, 60) // Show last minute of data
        .reverse()
        .map((d, i) => {
          const x = (i / 59) * width;
          const y = height - ((d[metric] || 0) / maxValue) * height;
          return `${x},${y}`;
        })
        .join(' ');
    }, [data, metric, maxValue]);
    
    return (
      <div className={styles.metricChart}>
        <svg width="300" height="80" className={styles.chartSvg}>
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill={`url(#gradient-${metric})`}
            points={`0,80 ${points} 300,80`}
          />
        </svg>
      </div>
    );
  };

  // Animation variants
  const dashboardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, staggerChildren: 0.1 }
    },
    exit: { opacity: 0, y: -50, scale: 0.95, transition: { duration: 0.2 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.dashboardOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.dashboardContainer}
          variants={dashboardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.dashboardHeader}>
            <h2>📊 Performance Dashboard</h2>
            <div className={styles.headerActions}>
              <button
                className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? '⏸️ Stop Recording' : '🔴 Start Recording'}
              </button>
              <button className={styles.exportButton} onClick={exportReport}>
                📤 Export Report
              </button>
              <button className={styles.closeButton} onClick={onClose}>
                ✕
              </button>
            </div>
          </div>

          <div className={styles.dashboardContent}>
            {/* Current Metrics */}
            <motion.div className={styles.metricsGrid} variants={cardVariants}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricIcon}>⚡</span>
                  <span className={styles.metricTitle}>FPS</span>
                </div>
                <div className={styles.metricValue}>
                  {Math.round(metrics.fps)}
                  <span className={styles.metricUnit}>fps</span>
                </div>
                <div className={`${styles.metricStatus} ${metrics.fps > 50 ? styles.good : metrics.fps > 30 ? styles.warning : styles.error}`}>
                  {metrics.fps > 50 ? 'Excellent' : metrics.fps > 30 ? 'Good' : 'Poor'}
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricIcon}>🧠</span>
                  <span className={styles.metricTitle}>CPU</span>
                </div>
                <div className={styles.metricValue}>
                  {Math.round(metrics.cpuUsage)}
                  <span className={styles.metricUnit}>%</span>
                </div>
                <div className={`${styles.metricStatus} ${metrics.cpuUsage < 60 ? styles.good : metrics.cpuUsage < 80 ? styles.warning : styles.error}`}>
                  {metrics.cpuUsage < 60 ? 'Low' : metrics.cpuUsage < 80 ? 'Medium' : 'High'}
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricIcon}>💾</span>
                  <span className={styles.metricTitle}>Memory</span>
                </div>
                <div className={styles.metricValue}>
                  {Math.round(metrics.memoryUsage)}
                  <span className={styles.metricUnit}>%</span>
                </div>
                <div className={`${styles.metricStatus} ${metrics.memoryUsage < 70 ? styles.good : metrics.memoryUsage < 85 ? styles.warning : styles.error}`}>
                  {metrics.memoryUsage < 70 ? 'Low' : metrics.memoryUsage < 85 ? 'Medium' : 'High'}
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricIcon}>🌐</span>
                  <span className={styles.metricTitle}>Network</span>
                </div>
                <div className={styles.metricValue}>
                  {metrics.networkSpeed > 1000 
                    ? `${(metrics.networkSpeed / 1000).toFixed(1)}M`
                    : `${Math.round(metrics.networkSpeed)}K`}
                  <span className={styles.metricUnit}>bps</span>
                </div>
                <div className={`${styles.metricStatus} ${metrics.networkSpeed > 5000 ? styles.good : metrics.networkSpeed > 1000 ? styles.warning : styles.error}`}>
                  {metrics.networkSpeed > 5000 ? 'Fast' : metrics.networkSpeed > 1000 ? 'Medium' : 'Slow'}
                </div>
              </div>
            </motion.div>

            {/* Performance Charts */}
            <motion.div className={styles.chartsSection} variants={cardVariants}>
              <div className={styles.chartTabs}>
                {['fps', 'cpuUsage', 'memoryUsage', 'bufferHealth'].map(metric => (
                  <button
                    key={metric}
                    className={`${styles.chartTab} ${selectedMetric === metric ? styles.active : ''}`}
                    onClick={() => setSelectedMetric(metric)}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1')}
                  </button>
                ))}
              </div>
              
              <div className={styles.chartContainer}>
                <MetricChart
                  data={performanceHistory}
                  metric={selectedMetric}
                  color={
                    selectedMetric === 'fps' ? '#00ff88' :
                    selectedMetric === 'cpuUsage' ? '#ff6b6b' :
                    selectedMetric === 'memoryUsage' ? '#4ecdc4' :
                    '#ffa726'
                  }
                />
              </div>
            </motion.div>

            {/* System Information */}
            <motion.div className={styles.systemInfo} variants={cardVariants}>
              <h3>🖥️ System Information</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Device Memory:</span>
                  <span className={styles.infoValue}>{systemInfo.deviceMemory || 'Unknown'} GB</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>CPU Cores:</span>
                  <span className={styles.infoValue}>{systemInfo.hardwareConcurrency || 'Unknown'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Screen:</span>
                  <span className={styles.infoValue}>
                    {systemInfo.screenWidth}×{systemInfo.screenHeight} 
                    ({systemInfo.pixelRatio}x)
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>WebGL:</span>
                  <span className={styles.infoValue}>{systemInfo.webglVersion}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Connection:</span>
                  <span className={styles.infoValue}>{systemInfo.connectionType}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Renderer:</span>
                  <span className={styles.infoValue} title={systemInfo.webglRenderer}>
                    {systemInfo.webglRenderer ? 
                      systemInfo.webglRenderer.substring(0, 30) + '...' : 
                      'Unknown'
                    }
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <motion.div className={styles.alertsSection} variants={cardVariants}>
                <h3>⚠️ Performance Alerts</h3>
                <div className={styles.alertsList}>
                  {alerts.map(alert => (
                    <div key={alert.id} className={`${styles.alert} ${styles[alert.type]}`}>
                      <div className={styles.alertContent}>
                        <div className={styles.alertTitle}>{alert.title}</div>
                        <div className={styles.alertMessage}>{alert.message}</div>
                      </div>
                      <div className={styles.alertTime}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Optimization Suggestions */}
            {optimizations.length > 0 && (
              <motion.div className={styles.optimizationsSection} variants={cardVariants}>
                <h3>🔧 Optimization Suggestions</h3>
                <div className={styles.optimizationsList}>
                  {optimizations.map(opt => (
                    <div key={opt.id} className={styles.optimization}>
                      <div className={styles.optimizationContent}>
                        <div className={styles.optimizationTitle}>{opt.title}</div>
                        <div className={styles.optimizationDescription}>{opt.description}</div>
                        <div className={`${styles.optimizationImpact} ${styles[opt.impact.toLowerCase()]}`}>
                          Impact: {opt.impact}
                        </div>
                      </div>
                      <button
                        className={styles.applyButton}
                        onClick={opt.action}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PerformanceDashboard;