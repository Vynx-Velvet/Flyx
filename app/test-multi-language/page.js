/**
 * Test page for Multi-language Subtitle Management System
 */

'use client';

import React, { useState, useEffect } from 'react';
import MultiLanguageSubtitleDemo from '../components/MultiLanguageSubtitleDemo';

export default function TestMultiLanguagePage() {
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const runTests = async () => {
    setTesting(true);
    setTestResults(null);

    try {
      // Import and run tests
      const { testMultiLanguageSubtitleManager } = await import('../utils/testMultiLanguageSubtitleManager');
      const results = await testMultiLanguageSubtitleManager();
      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
      setTestResults({
        passed: 0,
        failed: 1,
        tests: [{ name: 'Test Runner', status: 'FAILED', error: error.message }]
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🌍 Multi-Language Subtitle Management System Test</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <p>
          This page tests the implementation of <strong>Task 5: Implement multi-language subtitle management system</strong>
          from the media playback fixes specification.
        </p>
        
        <h2>Features Tested:</h2>
        <ul>
          <li>✅ Language priority system with automatic fallback</li>
          <li>✅ Seamless subtitle language switching without playback interruption</li>
          <li>✅ Blob URL management with automatic cleanup</li>
          <li>✅ Subtitle caching system for improved performance</li>
          <li>✅ Subtitle quality scoring and selection based on download count and ratings</li>
        </ul>
      </div>

      {/* Test Runner Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '2px solid #007bff', borderRadius: '8px' }}>
        <h2>🧪 Automated Tests</h2>
        <p>Run comprehensive tests to verify all multi-language subtitle management features.</p>
        
        <button
          onClick={runTests}
          disabled={testing}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: testing ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testing ? 'not-allowed' : 'pointer',
            marginBottom: '20px'
          }}
        >
          {testing ? '🔄 Running Tests...' : '▶️ Run Tests'}
        </button>

        {/* Test Results */}
        {testResults && (
          <div style={{
            padding: '15px',
            backgroundColor: testResults.failed === 0 ? '#d4edda' : '#f8d7da',
            border: `1px solid ${testResults.failed === 0 ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            marginTop: '15px'
          }}>
            <h3>Test Results</h3>
            <div><strong>✅ Passed:</strong> {testResults.passed}</div>
            <div><strong>❌ Failed:</strong> {testResults.failed}</div>
            <div><strong>📊 Total:</strong> {testResults.passed + testResults.failed}</div>
            <div><strong>🎯 Success Rate:</strong> {((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%</div>

            {testResults.failed > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>Failed Tests:</h4>
                {testResults.tests.filter(t => t.status === 'FAILED').map((test, index) => (
                  <div key={index} style={{ marginBottom: '5px', color: '#721c24' }}>
                    <strong>{test.name}:</strong> {test.error}
                  </div>
                ))}
              </div>
            )}

            {testResults.failed === 0 && (
              <div style={{ marginTop: '15px', color: '#155724' }}>
                <strong>🎉 All tests passed! Multi-language subtitle management system is working correctly.</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demo Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '2px solid #28a745', borderRadius: '8px' }}>
        <h2>🎮 Interactive Demo</h2>
        <p>Try the multi-language subtitle management system with a live demo.</p>
        
        <button
          onClick={() => setShowDemo(!showDemo)}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          {showDemo ? '🔼 Hide Demo' : '🔽 Show Demo'}
        </button>

        {showDemo && (
          <div style={{ marginTop: '20px' }}>
            <MultiLanguageSubtitleDemo imdbId="tt0111161" />
          </div>
        )}
      </div>

      {/* Implementation Details */}
      <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h2>📋 Implementation Details</h2>
        
        <h3>Core Components:</h3>
        <ul>
          <li><strong>MultiLanguageSubtitleManager:</strong> Main class managing multiple subtitle languages</li>
          <li><strong>Enhanced useEnhancedSubtitles Hook:</strong> React hook with multi-language support</li>
          <li><strong>Quality Scoring System:</strong> Evaluates subtitles based on download count, rating, file size, and upload date</li>
          <li><strong>Caching System:</strong> Intelligent caching with size limits and expiration</li>
          <li><strong>Blob URL Management:</strong> Automatic cleanup to prevent memory leaks</li>
        </ul>

        <h3>Key Features:</h3>
        <ul>
          <li><strong>Language Priority:</strong> Configurable priority order with automatic fallback</li>
          <li><strong>Seamless Switching:</strong> Change languages without interrupting playback</li>
          <li><strong>Performance Optimization:</strong> Caching, preloading, and efficient synchronization</li>
          <li><strong>Quality Selection:</strong> Automatically selects best subtitle based on multiple factors</li>
          <li><strong>Memory Management:</strong> Automatic cleanup of resources and blob URLs</li>
        </ul>

        <h3>Requirements Satisfied:</h3>
        <ul>
          <li><strong>Requirement 3.3:</strong> Multiple subtitle languages with seamless switching</li>
          <li><strong>Requirement 3.5:</strong> Quality scoring and selection based on download count and ratings</li>
        </ul>
      </div>
    </div>
  );
}