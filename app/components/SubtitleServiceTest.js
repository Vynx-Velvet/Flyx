'use client'

import React, { useState } from 'react';
import subtitleService from '../services/subtitleService';
import { useMediaContext } from '../context/MediaContext';

const SubtitleServiceTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testSubtitles, setTestSubtitles] = useState([]);
  const { fetchSubtitlesFromOpenSubtitles, downloadAndProcessSubtitle } = useMediaContext();

  // Test the enhanced subtitle processing
  const runTests = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Running subtitle service tests...');
      
      // Test 1: Basic service functionality
      const basicTest = await subtitleService.testSubtitleProcessing();
      
      // Test 2: Fetch subtitles for a known movie (Fight Club)
      const fightClubSubtitles = await fetchSubtitlesFromOpenSubtitles('0137523', 'eng');
      
      // Test 3: Download and process a subtitle if available
      let processedSubtitle = null;
      if (fightClubSubtitles.success && fightClubSubtitles.subtitles.length > 0) {
        try {
          const bestSubtitle = fightClubSubtitles.subtitles[0];
          processedSubtitle = await downloadAndProcessSubtitle(bestSubtitle);
          setTestSubtitles([processedSubtitle]);
        } catch (downloadError) {
          console.error('Download test failed:', downloadError);
        }
      }

      const results = {
        timestamp: new Date().toISOString(),
        basicTest,
        fetchTest: {
          success: fightClubSubtitles.success,
          subtitleCount: fightClubSubtitles.subtitles?.length || 0,
          error: fightClubSubtitles.error
        },
        downloadTest: processedSubtitle ? {
          success: true,
          fileName: processedSubtitle.fileName,
          wasGzipped: processedSubtitle.wasGzipped,
          originalSize: processedSubtitle.originalSize,
          processedSize: processedSubtitle.contentLength,
          hasValidVTT: processedSubtitle.content?.startsWith('WEBVTT'),
          blobUrl: processedSubtitle.blobUrl?.substring(0, 50) + '...'
        } : { success: false, error: 'No subtitle available for download test' }
      };

      setTestResults(results);
      console.log('✅ Test results:', results);

    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear test data
  const clearTests = () => {
    setTestResults(null);
    setTestSubtitles([]);
    
    // Clean up any blob URLs
    testSubtitles.forEach(sub => {
      if (sub.blobUrl) {
        subtitleService.cleanupBlobUrl(sub.blobUrl);
      }
    });
  };

  return (
    <div className="subtitle-test-container" style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      borderRadius: '8px'
    }}>
      <h2>🧪 Subtitle Service Test</h2>
      <p>Test the enhanced subtitle service with gzip decompression and SRT to VTT conversion.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: loading ? '#666' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 Running Tests...' : '▶️ Run Tests'}
        </button>
        
        <button 
          onClick={clearTests}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Results
        </button>
      </div>

      {testResults && (
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>📊 Test Results</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      {testSubtitles.length > 0 && (
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '15px',
          borderRadius: '4px'
        }}>
          <h3>📋 Processed Subtitles</h3>
          {testSubtitles.map((sub, index) => (
            <div key={index} style={{
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: '#3a3a3a',
              borderRadius: '4px'
            }}>
              <h4>{sub.fileName}</h4>
              <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                <div>📦 Original Size: {sub.originalSize} bytes</div>
                <div>📄 Processed Size: {sub.contentLength} bytes</div>
                <div>🗜️ Was Gzipped: {sub.wasGzipped ? '✅' : '❌'}</div>
                <div>📹 Valid VTT: {sub.content?.startsWith('WEBVTT') ? '✅' : '❌'}</div>
                <div>🔗 Blob URL: {sub.blobUrl ? '✅ Created' : '❌ Failed'}</div>
              </div>
              
              {sub.blobUrl && (
                <div>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = sub.blobUrl;
                      link.download = sub.fileName.replace(/\.[^/.]+$/, '') + '.vtt';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    💾 Download VTT
                  </button>
                </div>
              )}
              
              {sub.content && (
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
                    📝 View Content Preview (first 500 chars)
                  </summary>
                  <pre style={{
                    fontSize: '10px',
                    backgroundColor: '#1a1a1a',
                    padding: '10px',
                    marginTop: '5px',
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {sub.content.substring(0, 500)}
                    {sub.content.length > 500 && '\n... (truncated)'}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        fontSize: '12px',
        color: '#888',
        marginTop: '20px'
      }}>
        <p>📝 <strong>Test Description:</strong></p>
        <ul>
          <li><strong>Basic Test:</strong> Tests SRT format detection, VTT conversion, and pako library loading</li>
          <li><strong>Fetch Test:</strong> Fetches subtitles for Fight Club (IMDB: tt0137523) from OpenSubtitles</li>
          <li><strong>Download Test:</strong> Downloads and processes the first available subtitle with gzip decompression</li>
        </ul>
        
        <p>🔧 <strong>Enhanced Features Tested:</strong></p>
        <ul>
          <li>Gzip detection and decompression using pako library</li>
          <li>Improved SRT to VTT conversion with proper timestamp formatting</li>
          <li>Error handling and fallback conversion methods</li>
          <li>Blob URL generation for CORS-free subtitle playback</li>
        </ul>
      </div>
    </div>
  );
};

export default SubtitleServiceTest; 