/**
 * Diagnostic Dashboard Component
 * Provides user interface for viewing logs and exporting diagnostic reports
 */

import React, { useState, useEffect } from 'react';
import { 
  loggerManager, 
  exportAllDiagnostics, 
  exportErrorDiagnostics,
  exportPerformanceDiagnostics,
  downloadDiagnosticReport 
} from '../../utils/logging/index.js';
import './DiagnosticDashboard.css';

export function DiagnosticDashboard({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filters, setFilters] = useState({
    component: 'all',
    level: 'all',
    timeRange: 'all',
    search: ''
  });
  const [summary, setSummary] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  // Refresh logs every 5 seconds when dashboard is open
  useEffect(() => {
    if (!isOpen) return;

    const refreshLogs = () => {
      const allLogs = loggerManager.getAllLogs();
      setLogs(allLogs);
      generateSummary(allLogs);
    };

    refreshLogs();
    const interval = setInterval(refreshLogs, 5000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Apply filters when logs or filters change
  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const generateSummary = (allLogs) => {
    const summary = {
      totalLogs: allLogs.length,
      components: {},
      levels: {},
      errors: 0,
      warnings: 0,
      timeRange: {
        earliest: null,
        latest: null
      }
    };

    allLogs.forEach(log => {
      // Count by component
      summary.components[log.component] = (summary.components[log.component] || 0) + 1;
      
      // Count by level
      summary.levels[log.level] = (summary.levels[log.level] || 0) + 1;
      
      // Count errors and warnings
      if (log.level === 'error') summary.errors++;
      if (log.level === 'warn') summary.warnings++;
      
      // Track time range
      const logTime = new Date(log.timestamp);
      if (!summary.timeRange.earliest || logTime < summary.timeRange.earliest) {
        summary.timeRange.earliest = logTime;
      }
      if (!summary.timeRange.latest || logTime > summary.timeRange.latest) {
        summary.timeRange.latest = logTime;
      }
    });

    setSummary(summary);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Component filter
    if (filters.component !== 'all') {
      filtered = filtered.filter(log => log.component === filters.component);
    }

    // Level filter
    if (filters.level !== 'all') {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = Date.now();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      };
      
      if (timeRanges[filters.timeRange]) {
        const cutoff = now - timeRanges[filters.timeRange];
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() > cutoff);
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.component.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.data).toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredLogs(filtered);
  };

  const handleExport = async (exportType) => {
    setIsExporting(true);
    
    try {
      let diagnosticData;
      let filename;

      switch (exportType) {
        case 'all':
          diagnosticData = exportAllDiagnostics({
            includeSystemInfo: true,
            includePerformanceMetrics: true,
            includeErrorSummary: true
          });
          filename = 'flyx_full_diagnostic.json';
          break;
          
        case 'errors':
          diagnosticData = exportErrorDiagnostics({
            includeSystemInfo: true
          });
          filename = 'flyx_error_diagnostic.json';
          break;
          
        case 'performance':
          diagnosticData = exportPerformanceDiagnostics({
            includeSystemInfo: true
          });
          filename = 'flyx_performance_diagnostic.json';
          break;
          
        case 'filtered':
          diagnosticData = {
            exportType: 'filtered',
            exportTimestamp: new Date().toISOString(),
            filters,
            logs: filteredLogs,
            summary: {
              totalLogs: filteredLogs.length,
              timeRange: {
                earliest: filteredLogs[filteredLogs.length - 1]?.timestamp,
                latest: filteredLogs[0]?.timestamp
              }
            }
          };
          filename = 'flyx_filtered_logs.json';
          break;
          
        default:
          throw new Error('Unknown export type');
      }

      downloadDiagnosticReport(diagnosticData, filename);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearAllLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      loggerManager.clearAllLogs();
      setLogs([]);
      setFilteredLogs([]);
      setSummary({});
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatLogData = (data) => {
    if (!data || Object.keys(data).length === 0) return '';
    
    // Show key information in a compact format
    const keyInfo = [];
    
    if (data.requestId) keyInfo.push(`Request: ${data.requestId}`);
    if (data.playbackSessionId) keyInfo.push(`Session: ${data.playbackSessionId.split('_').pop()}`);
    if (data.errorType) keyInfo.push(`Error: ${data.errorType}`);
    if (data.duration) keyInfo.push(`Duration: ${data.duration}`);
    if (data.bufferLength) keyInfo.push(`Buffer: ${data.bufferLength}s`);
    
    return keyInfo.length > 0 ? keyInfo.join(' | ') : JSON.stringify(data).substring(0, 100) + '...';
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const getLevelClass = (level) => {
    return `log-level log-level-${level}`;
  };

  if (!isOpen) return null;

  return (
    <div className="diagnostic-dashboard-overlay">
      <div className="diagnostic-dashboard">
        <div className="dashboard-header">
          <h2>🔧 Diagnostic Dashboard</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Summary Section */}
        <div className="dashboard-summary">
          <div className="summary-card">
            <h3>📊 Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Logs:</span>
                <span className="stat-value">{summary.totalLogs || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Errors:</span>
                <span className="stat-value error">{summary.errors || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Warnings:</span>
                <span className="stat-value warning">{summary.warnings || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Components:</span>
                <span className="stat-value">{Object.keys(summary.components || {}).length}</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>📈 Components</h3>
            <div className="component-breakdown">
              {Object.entries(summary.components || {}).map(([component, count]) => (
                <div key={component} className="component-stat">
                  <span className="component-name">{component}:</span>
                  <span className="component-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="dashboard-controls">
          <div className="filters">
            <select 
              value={filters.component} 
              onChange={(e) => setFilters(prev => ({ ...prev, component: e.target.value }))}
            >
              <option value="all">All Components</option>
              {Object.keys(summary.components || {}).map(component => (
                <option key={component} value={component}>{component}</option>
              ))}
            </select>

            <select 
              value={filters.level} 
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
            >
              <option value="all">All Levels</option>
              <option value="error">Errors</option>
              <option value="warn">Warnings</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>

            <select 
              value={filters.timeRange} 
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
            >
              <option value="all">All Time</option>
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>

            <input
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="search-input"
            />
          </div>

          <div className="actions">
            <button 
              onClick={() => handleExport('all')} 
              disabled={isExporting}
              className="export-button"
            >
              📥 Export All
            </button>
            <button 
              onClick={() => handleExport('errors')} 
              disabled={isExporting}
              className="export-button"
            >
              🚨 Export Errors
            </button>
            <button 
              onClick={() => handleExport('performance')} 
              disabled={isExporting}
              className="export-button"
            >
              📊 Export Performance
            </button>
            <button 
              onClick={() => handleExport('filtered')} 
              disabled={isExporting}
              className="export-button"
            >
              🔍 Export Filtered
            </button>
            <button 
              onClick={clearAllLogs}
              className="clear-button"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>

        {/* Logs Section */}
        <div className="dashboard-logs">
          <div className="logs-header">
            <h3>📝 Logs ({filteredLogs.length})</h3>
          </div>
          
          <div className="logs-container">
            {filteredLogs.length === 0 ? (
              <div className="no-logs">
                {logs.length === 0 ? 'No logs available' : 'No logs match current filters'}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={log.id || index} className={`log-entry ${getLevelClass(log.level)}`}>
                  <div className="log-header">
                    <span className="log-icon">{getLevelIcon(log.level)}</span>
                    <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                    <span className="log-component">{log.component}</span>
                    <span className="log-level-badge">{log.level.toUpperCase()}</span>
                  </div>
                  <div className="log-message">{log.message}</div>
                  {log.data && Object.keys(log.data).length > 0 && (
                    <div className="log-data">{formatLogData(log.data)}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="dashboard-footer">
          <div className="footer-info">
            {summary.timeRange?.earliest && summary.timeRange?.latest && (
              <span>
                Logs from {formatTimestamp(summary.timeRange.earliest)} 
                to {formatTimestamp(summary.timeRange.latest)}
              </span>
            )}
          </div>
          <div className="footer-actions">
            <button onClick={() => window.location.reload()} className="refresh-button">
              🔄 Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}