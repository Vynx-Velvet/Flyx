/**
 * Performance Dashboard Component
 * Displays comprehensive performance monitoring data and controls
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2
 */

import React, { useState, useEffect } from 'react';
import usePerformanceMonitoring from '../../hooks/usePerformanceMonitoring';
import './PerformanceDashboard.css';

const PerformanceDashboard = ({ isVisible = false, onClose }) => {
  const {
    isMonitoring,
    performanceMetrics,
    networkConditions,
    memoryStatus,
    connectionStatus,
    optimizations,
    startMonitoring,
    stopMonitoring,
    forceMemoryCleanup,
    measureNetworkNow,
    exportPerformanceData,
    getPerformanceRecommendations
  } = usePerformanceMonitoring({ autoStart: true });

  const [activeTab, setActiveTab] = useState('overview');
  const [recommendations, setRecommendations] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Update recommendations periodically
  useEffect(() => {
    const updateRecommendations = () => {
      const newRecommendations = getPerformanceRecommendations();
      setRecommendations(newRecommendations);
    };

    updateRecommendations();
    const interval = setInterval(updateRecommendations, 5000);
    
    return () => clearInterval(interval);
  }, [getPerformanceRecommendations]);

  if (!isVisible) return null;

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = exportPerformanceData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export performance data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getMemoryPressureColor = (pressure) => {
    switch (pressure) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#FF5722';
      case 'critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const renderOverviewTab = () => (
    <div className="performance-overview">
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Overall Performance</h3>
          <div className="metric-value" style={{ color: getStatusColor(performanceMetrics.overall.status) }}>
            {performanceMetrics.overall.score}/100
          </div>
          <div className="metric-label">{performanceMetrics.overall.status}</div>
        </div>

        <div className="metric-card">
          <h3>Buffer Health</h3>
          <div className="metric-value" style={{ color: performanceMetrics.buffer.health > 70 ? '#4CAF50' : performanceMetrics.buffer.health > 40 ? '#FF9800' : '#F44336' }}>
            {performanceMetrics.buffer.health}%
          </div>
          <div className="metric-label">{performanceMetrics.buffer.level}s buffered</div>
        </div>

        <div className="metric-card">
          <h3>Network</h3>
          <div className="metric-value" style={{ color: getStatusColor(networkConditions.networkClass) }}>
            {networkConditions.conditions.bandwidth > 0 ? 
              `${(networkConditions.conditions.bandwidth / 1000000).toFixed(1)} Mbps` : 
              'Unknown'
            }
          </div>
          <div className="metric-label">{networkConditions.conditions.latency}ms latency</div>
        </div>

        <div className="metric-card">
          <h3>Memory Usage</h3>
          <div className="metric-value" style={{ color: getMemoryPressureColor(memoryStatus.pressure) }}>
            {memoryStatus.heap.used} MB
          </div>
          <div className="metric-label">{memoryStatus.heap.usagePercentage}% used</div>
        </div>
      </div>

      <div className="recommendations-section">
        <h3>Performance Recommendations</h3>
        {recommendations.length > 0 ? (
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className={`recommendation ${rec.priority}`}>
                <div className="recommendation-icon">
                  {rec.priority === 'critical' ? '🚨' : 
                   rec.priority === 'high' ? '⚠️' : 
                   rec.priority === 'medium' ? '💡' : 'ℹ️'}
                </div>
                <div className="recommendation-content">
                  <div className="recommendation-message">{rec.message}</div>
                  <div className="recommendation-type">{rec.type}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-recommendations">
            ✅ All systems performing optimally
          </div>
        )}
      </div>

      <div className="recent-optimizations">
        <h3>Recent Optimizations</h3>
        {optimizations.length > 0 ? (
          <div className="optimizations-list">
            {optimizations.slice(-5).map((opt, index) => (
              <div key={index} className="optimization-item">
                <div className="optimization-time">
                  {new Date(opt.timestamp).toLocaleTimeString()}
                </div>
                <div className="optimization-details">
                  <span className="optimization-type">{opt.type}</span>
                  <span className="optimization-action">{opt.action}</span>
                  <span className="optimization-reason">{opt.reason}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-optimizations">
            No optimizations applied yet
          </div>
        )}
      </div>
    </div>
  );

  const renderBufferTab = () => (
    <div className="buffer-monitoring">
      <div className="buffer-metrics">
        <div className="buffer-health-chart">
          <h3>Buffer Health</h3>
          <div className="health-bar">
            <div 
              className="health-fill" 
              style={{ 
                width: `${performanceMetrics.buffer.health}%`,
                backgroundColor: performanceMetrics.buffer.health > 70 ? '#4CAF50' : 
                                performanceMetrics.buffer.health > 40 ? '#FF9800' : '#F44336'
              }}
            />
          </div>
          <div className="health-details">
            <span>Current Level: {performanceMetrics.buffer.level}s</span>
            <span>Stalls: {performanceMetrics.buffer.stalls}</span>
          </div>
        </div>

        <div className="segment-metrics">
          <h3>Segment Loading</h3>
          <div className="segment-stats">
            <div className="stat">
              <label>Average Load Time</label>
              <value>{performanceMetrics.segments.averageLoadTime}ms</value>
            </div>
            <div className="stat">
              <label>Success Rate</label>
              <value>{performanceMetrics.segments.successRate}%</value>
            </div>
          </div>
        </div>

        <div className="quality-metrics">
          <h3>Quality Adaptation</h3>
          <div className="quality-stats">
            <div className="stat">
              <label>Adaptation Score</label>
              <value>{performanceMetrics.quality.adaptationScore}/100</value>
            </div>
            <div className="stat">
              <label>Quality Switches</label>
              <value>{performanceMetrics.quality.switches}</value>
            </div>
            <div className="stat">
              <label>Current Quality</label>
              <value>{performanceMetrics.quality.current || 'Auto'}</value>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNetworkTab = () => (
    <div className="network-monitoring">
      <div className="network-status">
        <h3>Network Conditions</h3>
        <div className="network-grid">
          <div className="network-metric">
            <label>Bandwidth</label>
            <value>{(networkConditions.conditions.bandwidth / 1000000).toFixed(1)} Mbps</value>
          </div>
          <div className="network-metric">
            <label>Latency</label>
            <value>{networkConditions.conditions.latency}ms</value>
          </div>
          <div className="network-metric">
            <label>Packet Loss</label>
            <value>{(networkConditions.conditions.packetLoss * 100).toFixed(2)}%</value>
          </div>
          <div className="network-metric">
            <label>Stability</label>
            <value>{networkConditions.conditions.stability}</value>
          </div>
          <div className="network-metric">
            <label>Trend</label>
            <value>{networkConditions.conditions.trend}</value>
          </div>
          <div className="network-metric">
            <label>Class</label>
            <value style={{ color: getStatusColor(networkConditions.networkClass) }}>
              {networkConditions.networkClass}
            </value>
          </div>
        </div>
      </div>

      <div className="streaming-recommendations">
        <h3>Streaming Parameters</h3>
        <div className="recommendations-grid">
          <div className="param">
            <label>Buffer Size</label>
            <value>{networkConditions.recommendations.bufferSize}s</value>
          </div>
          <div className="param">
            <label>Max Buffer</label>
            <value>{networkConditions.recommendations.maxBufferLength}s</value>
          </div>
          <div className="param">
            <label>Segment Retries</label>
            <value>{networkConditions.recommendations.segmentRetries}</value>
          </div>
          <div className="param">
            <label>Adaptation Speed</label>
            <value>{networkConditions.recommendations.adaptationSpeed}</value>
          </div>
        </div>
      </div>

      <div className="network-actions">
        <button 
          className="action-button"
          onClick={measureNetworkNow}
        >
          📡 Measure Now
        </button>
      </div>
    </div>
  );

  const renderMemoryTab = () => (
    <div className="memory-monitoring">
      <div className="memory-status">
        <h3>Memory Usage</h3>
        <div className="memory-chart">
          <div className="memory-bar">
            <div 
              className="memory-fill" 
              style={{ 
                width: `${memoryStatus.heap.usagePercentage}%`,
                backgroundColor: getMemoryPressureColor(memoryStatus.pressure)
              }}
            />
          </div>
          <div className="memory-details">
            <span>{memoryStatus.heap.used} MB / {memoryStatus.heap.total} MB</span>
            <span className={`pressure-indicator ${memoryStatus.pressure}`}>
              {memoryStatus.pressure} pressure
            </span>
          </div>
        </div>
      </div>

      <div className="resource-tracking">
        <h3>Resource Tracking</h3>
        <div className="resource-grid">
          <div className="resource-metric">
            <label>Blob URLs</label>
            <value>{memoryStatus.resources.blobUrls}</value>
          </div>
          <div className="resource-metric">
            <label>Event Listeners</label>
            <value>{memoryStatus.resources.eventListeners}</value>
          </div>
          <div className="resource-metric">
            <label>HLS Instances</label>
            <value>{memoryStatus.resources.hlsInstances || 0}</value>
          </div>
          <div className="resource-metric">
            <label>Video Elements</label>
            <value>{memoryStatus.resources.videoElements || 0}</value>
          </div>
        </div>
      </div>

      <div className="memory-actions">
        <button 
          className="action-button"
          onClick={() => forceMemoryCleanup(false)}
        >
          🧹 Clean Memory
        </button>
        <button 
          className="action-button danger"
          onClick={() => forceMemoryCleanup(true)}
        >
          🚨 Aggressive Cleanup
        </button>
      </div>
    </div>
  );

  const renderConnectionTab = () => (
    <div className="connection-monitoring">
      <div className="cdn-status">
        <h3>CDN Status</h3>
        <div className="cdn-info">
          <div className="cdn-metric">
            <label>Current CDN</label>
            <value>{connectionStatus.cdnStatus.current || 'None'}</value>
          </div>
          <div className="cdn-metric">
            <label>Failovers</label>
            <value>{connectionStatus.cdnStatus.failovers}</value>
          </div>
        </div>
      </div>

      <div className="connection-metrics">
        <h3>Connection Metrics</h3>
        <div className="connection-grid">
          <div className="connection-metric">
            <label>Success Rate</label>
            <value>{connectionStatus.metrics.successRate?.toFixed(1) || 0}%</value>
          </div>
          <div className="connection-metric">
            <label>Average Latency</label>
            <value>{connectionStatus.metrics.averageLatency?.toFixed(0) || 0}ms</value>
          </div>
          <div className="connection-metric">
            <label>Batched Requests</label>
            <value>{connectionStatus.metrics.batchedRequests || 0}</value>
          </div>
          <div className="connection-metric">
            <label>Connection Reuses</label>
            <value>{connectionStatus.metrics.connectionReuses || 0}</value>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h2>Performance Dashboard</h2>
        <div className="header-controls">
          <div className="monitoring-status">
            <span className={`status-indicator ${isMonitoring ? 'active' : 'inactive'}`}>
              {isMonitoring ? '🟢' : '🔴'}
            </span>
            <span>{isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}</span>
          </div>
          <button 
            className="control-button"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          <button 
            className="control-button"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : '📊 Export Data'}
          </button>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'buffer' ? 'active' : ''}`}
          onClick={() => setActiveTab('buffer')}
        >
          Buffer
        </button>
        <button 
          className={`tab ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          Network
        </button>
        <button 
          className={`tab ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
        >
          Memory
        </button>
        <button 
          className={`tab ${activeTab === 'connection' ? 'active' : ''}`}
          onClick={() => setActiveTab('connection')}
        >
          Connection
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'buffer' && renderBufferTab()}
        {activeTab === 'network' && renderNetworkTab()}
        {activeTab === 'memory' && renderMemoryTab()}
        {activeTab === 'connection' && renderConnectionTab()}
      </div>
    </div>
  );
};

export default PerformanceDashboard;