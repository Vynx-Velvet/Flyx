'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './TestDashboard.module.css';
import { MediaPlayerIntegrationTests } from './MediaPlayerIntegration.test';

/**
 * Visual Test Dashboard for Media Player
 * 
 * Provides an interactive UI for running through integration tests
 * and tracking their status.
 */
const TestDashboard = ({ onClose }) => {
  const [testResults, setTestResults] = useState({});
  const [activeCategory, setActiveCategory] = useState('coreFunctionality');
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [overallStats, setOverallStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0
  });

  // Initialize test results from test suite
  useEffect(() => {
    const results = {};
    let stats = { total: 0, passed: 0, failed: 0, pending: 0 };
    
    Object.entries(MediaPlayerIntegrationTests).forEach(([categoryKey, category]) => {
      results[categoryKey] = {};
      category.tests.forEach(test => {
        results[categoryKey][test.id] = {
          ...test,
          status: 'pending',
          notes: '',
          timestamp: null
        };
        stats.total++;
        stats.pending++;
      });
    });
    
    setTestResults(results);
    setOverallStats(stats);
  }, []);

  // Update overall stats when test results change
  useEffect(() => {
    let stats = { total: 0, passed: 0, failed: 0, pending: 0 };
    
    Object.values(testResults).forEach(category => {
      Object.values(category).forEach(test => {
        stats.total++;
        stats[test.status]++;
      });
    });
    
    setOverallStats(stats);
  }, [testResults]);

  // Mark test as passed/failed
  const updateTestStatus = (categoryKey, testId, status, notes = '') => {
    setTestResults(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [testId]: {
          ...prev[categoryKey][testId],
          status,
          notes,
          timestamp: new Date().toISOString()
        }
      }
    }));
  };

  // Run a specific test
  const runTest = async (categoryKey, testId) => {
    setIsRunning(true);
    setCurrentTest({ category: categoryKey, id: testId });
    
    const test = testResults[categoryKey]?.[testId];
    if (!test) return;
    
    console.group(`🧪 Running: ${test.name}`);
    console.log('📋 Description:', test.description);
    console.log('📝 Steps:');
    test.steps.forEach(step => console.log(`  ${step}`));
    console.log('✅ Expected:', test.expectedResult);
    console.groupEnd();
    
    // Simulate test execution (in real scenario, this would run actual test code)
    setTimeout(() => {
      setIsRunning(false);
      setCurrentTest(null);
    }, 1000);
  };

  // Run all tests in a category
  const runCategoryTests = async (categoryKey) => {
    const category = testResults[categoryKey];
    if (!category) return;
    
    for (const testId of Object.keys(category)) {
      await runTest(categoryKey, testId);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Reset all tests
  const resetAllTests = () => {
    const results = {};
    Object.entries(MediaPlayerIntegrationTests).forEach(([categoryKey, category]) => {
      results[categoryKey] = {};
      category.tests.forEach(test => {
        results[categoryKey][test.id] = {
          ...test,
          status: 'pending',
          notes: '',
          timestamp: null
        };
      });
    });
    setTestResults(results);
  };

  // Export test report
  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      stats: overallStats,
      results: testResults
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media-player-test-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return '#00ff88';
      case 'failed': return '#ff4444';
      case 'pending': return '#888888';
      case 'running': return '#ffaa00';
      default: return '#888888';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'running': return '🔄';
      default: return '❓';
    }
  };

  const categories = Object.entries(MediaPlayerIntegrationTests);

  return (
    <motion.div
      className={styles.dashboard}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <h2>🧪 Media Player Test Dashboard</h2>
        <button onClick={onClose} className={styles.closeBtn}>✕</button>
      </div>

      {/* Overall Stats */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total:</span>
          <span className={styles.statValue}>{overallStats.total}</span>
        </div>
        <div className={styles.stat} style={{ color: getStatusColor('passed') }}>
          <span className={styles.statLabel}>Passed:</span>
          <span className={styles.statValue}>{overallStats.passed}</span>
        </div>
        <div className={styles.stat} style={{ color: getStatusColor('failed') }}>
          <span className={styles.statLabel}>Failed:</span>
          <span className={styles.statValue}>{overallStats.failed}</span>
        </div>
        <div className={styles.stat} style={{ color: getStatusColor('pending') }}>
          <span className={styles.statLabel}>Pending:</span>
          <span className={styles.statValue}>{overallStats.pending}</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${(overallStats.passed / overallStats.total) * 100}%`,
              background: 'linear-gradient(90deg, #00ff88 0%, #00cc66 100%)'
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button 
          onClick={() => runCategoryTests(activeCategory)}
          disabled={isRunning}
          className={styles.actionBtn}
        >
          🚀 Run Category Tests
        </button>
        <button 
          onClick={resetAllTests}
          className={styles.actionBtn}
        >
          🔄 Reset All
        </button>
        <button 
          onClick={exportReport}
          className={styles.actionBtn}
        >
          📥 Export Report
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Category Tabs */}
        <div className={styles.tabs}>
          {categories.map(([key, category]) => {
            const categoryTests = testResults[key] || {};
            const categoryStats = {
              passed: Object.values(categoryTests).filter(t => t.status === 'passed').length,
              failed: Object.values(categoryTests).filter(t => t.status === 'failed').length,
              total: Object.values(categoryTests).length
            };
            
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`${styles.tab} ${activeCategory === key ? styles.activeTab : ''}`}
              >
                <span className={styles.tabIcon}>{category.name.split(' ')[0]}</span>
                <span className={styles.tabName}>{category.name.split(' ').slice(1).join(' ')}</span>
                <span className={styles.tabStats}>
                  {categoryStats.passed}/{categoryStats.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Test List */}
        <div className={styles.testList}>
          <AnimatePresence mode="wait">
            {testResults[activeCategory] && (
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {Object.values(testResults[activeCategory]).map(test => {
                  const isCurrentTest = currentTest?.category === activeCategory && currentTest?.id === test.id;
                  const status = isCurrentTest ? 'running' : test.status;
                  
                  return (
                    <div
                      key={test.id}
                      className={`${styles.testItem} ${styles[`test-${status}`]}`}
                    >
                      <div className={styles.testHeader}>
                        <span className={styles.testStatus}>
                          {getStatusIcon(status)}
                        </span>
                        <h3 className={styles.testName}>{test.name}</h3>
                        <button
                          onClick={() => runTest(activeCategory, test.id)}
                          disabled={isRunning}
                          className={styles.runBtn}
                          title="Run test"
                        >
                          ▶
                        </button>
                      </div>
                      
                      <p className={styles.testDescription}>{test.description}</p>
                      
                      <details className={styles.testDetails}>
                        <summary>Test Steps</summary>
                        <ol className={styles.testSteps}>
                          {test.steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                        <p className={styles.expectedResult}>
                          <strong>Expected:</strong> {test.expectedResult}
                        </p>
                      </details>
                      
                      {/* Test Controls */}
                      <div className={styles.testControls}>
                        <button
                          onClick={() => updateTestStatus(activeCategory, test.id, 'passed')}
                          className={`${styles.statusBtn} ${styles.passBtn}`}
                          disabled={isRunning}
                        >
                          ✅ Pass
                        </button>
                        <button
                          onClick={() => updateTestStatus(activeCategory, test.id, 'failed')}
                          className={`${styles.statusBtn} ${styles.failBtn}`}
                          disabled={isRunning}
                        >
                          ❌ Fail
                        </button>
                        <button
                          onClick={() => updateTestStatus(activeCategory, test.id, 'pending')}
                          className={`${styles.statusBtn} ${styles.resetBtn}`}
                          disabled={isRunning}
                        >
                          🔄 Reset
                        </button>
                      </div>
                      
                      {/* Notes */}
                      {test.notes && (
                        <div className={styles.testNotes}>
                          <strong>Notes:</strong> {test.notes}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      {test.timestamp && (
                        <div className={styles.testTimestamp}>
                          Tested: {new Date(test.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default TestDashboard;