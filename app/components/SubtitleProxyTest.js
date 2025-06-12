// Test component to verify server-side subtitle proxy functionality
'use client';

import { useState } from 'react';
import subtitleService from '@/services/subtitleService';

export default function SubtitleProxyTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [downloadTest, setDownloadTest] = useState(null);
  const [dnsTest, setDnsTest] = useState(null);

  const testImdbIds = [
    { id: 'tt0137523', title: 'Fight Club (1999)' },
    { id: 'tt0111161', title: 'The Shawshank Redemption (1994)' },
    { id: 'tt0068646', title: 'The Godfather (1972)' },
    { id: 'tt0944947', title: 'Game of Thrones (TV)' }
  ];

  const testSubtitleFetch = async (imdbId, title) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDownloadTest(null);

    try {
      console.log(`🧪 Testing subtitle fetch for ${title} (${imdbId})`);
      
      const startTime = Date.now();
      const response = await subtitleService.fetchSubtitles(imdbId, 'eng');
      const endTime = Date.now();

      console.log('✅ Subtitle fetch test result:', response);

      setResult({
        imdbId,
        title,
        ...response,
        fetchTime: endTime - startTime
      });

      // If we found subtitles, test downloading the first one
      if (response.success && response.subtitles.length > 0) {
        const bestSubtitle = response.subtitles[0];
        console.log('🧪 Testing subtitle download for:', bestSubtitle.fileName);
        
        try {
          const downloadStart = Date.now();
          const processed = await subtitleService.downloadSubtitle(bestSubtitle);
          const downloadEnd = Date.now();
          
          setDownloadTest({
            success: true,
            subtitle: processed,
            downloadTime: downloadEnd - downloadStart,
            contentPreview: processed.content.substring(0, 500) + '...',
            hasBlobUrl: !!processed.blobUrl,
            contentLength: processed.contentLength
          });

          console.log('✅ Subtitle download test successful:', processed);
        } catch (downloadError) {
          console.error('❌ Download test failed:', downloadError);
          setDownloadTest({
            success: false,
            error: downloadError.message
          });
        }
      }

    } catch (fetchError) {
      console.error('❌ Fetch test failed:', fetchError);
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  const testDNS = async () => {
    setLoading(true);
    setDnsTest(null);
    
    try {
      console.log('🧪 Testing DNS and connection to OpenSubtitles...');
      
      const response = await fetch('/api/dns-test');
      const data = await response.json();
      
      setDnsTest(data);
      console.log('✅ DNS test completed:', data);
    } catch (error) {
      console.error('❌ DNS test failed:', error);
      setDnsTest({
        summary: { success: false, message: 'DNS test request failed' },
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1000px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>🧪 Subtitle Proxy Test</h2>
      <p>Test our server-side proxy for OpenSubtitles API to avoid 302 redirects</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Movies/Shows:</h3>
        {testImdbIds.map(({ id, title }) => (
          <button
            key={id}
            onClick={() => testSubtitleFetch(id, title)}
            disabled={loading}
            style={{
              margin: '5px',
              padding: '10px 15px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 Testing...' : `Test ${title}`}
          </button>
        ))}
        
        <button
          onClick={testDNS}
          disabled={loading}
          style={{
            margin: '5px',
            padding: '10px 15px',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 Testing...' : '🧪 Test DNS & Connection'}
        </button>
      </div>

      {dnsTest && (
        <div style={{
          padding: '15px',
          backgroundColor: dnsTest.summary?.success ? '#d4edda' : '#f8d7da',
          color: dnsTest.summary?.success ? '#155724' : '#721c24',
          border: `1px solid ${dnsTest.summary?.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h4>{dnsTest.summary?.success ? '✅' : '❌'} DNS Test Result:</h4>
          <p><strong>Status:</strong> {dnsTest.summary?.message}</p>
          <p><strong>Passed:</strong> {dnsTest.summary?.passed}/{dnsTest.summary?.total} tests</p>
          
          {dnsTest.tests && (
            <details style={{ marginTop: '10px' }}>
              <summary>Test Details</summary>
              <div style={{ padding: '10px', fontSize: '12px' }}>
                {Object.entries(dnsTest.tests).map(([testName, result]) => (
                  <div key={testName} style={{
                    margin: '5px 0',
                    padding: '8px',
                    backgroundColor: result.success ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                    borderRadius: '3px'
                  }}>
                    <strong>{testName}:</strong> {result.success ? '✅' : '❌'} {result.message || result.error}
                    {result.error && <div style={{ fontSize: '11px', color: '#666' }}>Error: {result.error}</div>}
                    {result.code && <div style={{ fontSize: '11px', color: '#666' }}>Code: {result.code}</div>}
                  </div>
                ))}
              </div>
            </details>
          )}
          
          {dnsTest.environment && (
            <details style={{ marginTop: '10px' }}>
              <summary>Environment Info</summary>
              <pre style={{ fontSize: '11px', overflow: 'auto', backgroundColor: 'rgba(0,0,0,0.1)', padding: '8px' }}>
                {JSON.stringify(dnsTest.environment, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h4>❌ Error:</h4>
          <pre>{error}</pre>
        </div>
      )}

      {result && (
        <div style={{
          padding: '15px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          color: result.success ? '#155724' : '#721c24',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h4>{result.success ? '✅' : '❌'} Fetch Test Result:</h4>
          <p><strong>Title:</strong> {result.title}</p>
          <p><strong>IMDB ID:</strong> {result.imdbId}</p>
          <p><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</p>
          <p><strong>Fetch Time:</strong> {result.fetchTime}ms</p>
          
          {result.success ? (
            <>
              <p><strong>Found Subtitles:</strong> {result.totalCount}</p>
              <p><strong>Language:</strong> {result.language}</p>
              <p><strong>Source:</strong> {result.source}</p>
              
              {result.debug && (
                <details style={{ marginTop: '10px' }}>
                  <summary>Debug Info</summary>
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(result.debug, null, 2)}
                  </pre>
                </details>
              )}

              {result.subtitles.length > 0 && (
                <details style={{ marginTop: '10px' }}>
                  <summary>Top Subtitles ({result.subtitles.length} found)</summary>
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {result.subtitles.slice(0, 5).map((sub, index) => (
                      <div key={sub.id} style={{
                        padding: '10px',
                        margin: '5px 0',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        borderRadius: '3px'
                      }}>
                        <p><strong>#{index + 1}</strong> {sub.fileName}</p>
                        <p>Quality: {sub.qualityScore}/100, Downloads: {sub.downloads}, Rating: {sub.rating}</p>
                        <p>Format: {sub.format}, Language: {sub.language}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          ) : (
            <p><strong>Error:</strong> {result.error}</p>
          )}
        </div>
      )}

      {downloadTest && (
        <div style={{
          padding: '15px',
          backgroundColor: downloadTest.success ? '#d4edda' : '#f8d7da',
          color: downloadTest.success ? '#155724' : '#721c24',
          border: `1px solid ${downloadTest.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h4>{downloadTest.success ? '✅' : '❌'} Download Test Result:</h4>
          
          {downloadTest.success ? (
            <>
              <p><strong>File:</strong> {downloadTest.subtitle.fileName}</p>
              <p><strong>Download Time:</strong> {downloadTest.downloadTime}ms</p>
              <p><strong>Content Length:</strong> {downloadTest.contentLength} characters</p>
              <p><strong>Has Blob URL:</strong> {downloadTest.hasBlobUrl ? 'Yes' : 'No'}</p>
              <p><strong>Used Proxy:</strong> {downloadTest.subtitle.usedProxy ? 'Yes' : 'No'}</p>
              
              <details style={{ marginTop: '10px' }}>
                <summary>Content Preview</summary>
                <pre style={{ 
                  fontSize: '12px', 
                  overflow: 'auto', 
                  maxHeight: '200px',
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  padding: '10px',
                  borderRadius: '3px'
                }}>
                  {downloadTest.contentPreview}
                </pre>
              </details>

              {downloadTest.hasBlobUrl && (
                <p style={{ marginTop: '10px' }}>
                  <strong>🎉 Success!</strong> Subtitle can be used as blob URL for video playback.
                  <br />
                  <small>Blob URL: {downloadTest.subtitle.blobUrl.substring(0, 50)}...</small>
                </p>
              )}
            </>
          ) : (
            <p><strong>Error:</strong> {downloadTest.error}</p>
          )}
        </div>
      )}

      <div style={{
        padding: '15px',
        backgroundColor: '#e7f3ff',
        color: '#004085',
        border: '1px solid #b0d4f1',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <h4>ℹ️ How It Works:</h4>
        <ol>
          <li><strong>Server Proxy:</strong> Frontend calls <code>/api/subtitles</code> instead of OpenSubtitles directly</li>
          <li><strong>CORS Avoidance:</strong> Server makes the actual API call with proper headers</li>
          <li><strong>Download Proxy:</strong> Subtitle files are downloaded via <code>/api/subtitles/download</code></li>
          <li><strong>Blob URLs:</strong> Processed subtitles become blob URLs for CORS-free video playback</li>
        </ol>
        <p><strong>This solves the 302 redirect issue you were experiencing!</strong></p>
      </div>
    </div>
  );
} 