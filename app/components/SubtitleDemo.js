'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSubtitleManager } from '../hooks/useSubtitleManager';
import { 
  convertSrtToVtt, 
  validateSrtContent, 
  fetchAndParseSubtitle,
  createSubtitleBlobUrl,
  cleanupSubtitleBlobUrl
} from '../utils/subtitleParser';
import { useSubtitles } from '../hooks/useSubtitles';

/**
 * Demo component showcasing SRT subtitle processing capabilities
 * Integrates with OpenSubtitles API and video player
 */
const SubtitleDemo = ({ movieId, imdbId, season = null, episode = null }) => {
  const [demoVideo, setDemoVideo] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [processedSubtitle, setProcessedSubtitle] = useState(null);
  const [testSrtContent, setTestSrtContent] = useState('');
  const [processingResults, setProcessingResults] = useState(null);
  const [showProcessingDetails, setShowProcessingDetails] = useState(false);
  
  const videoRef = useRef(null);
  
  // Use the subtitle manager hook
  const {
    selectSubtitle,
    selectBestSubtitle,
    getSubtitleOptions,
    activeSubtitle,
    loading,
    error,
    getStats,
    preloadPopularSubtitles,
    hasLanguage,
    subtitlesError
  } = useSubtitleManager(imdbId, {
    videoRef,
    languages: ['eng', 'spa', 'fre', 'ger', 'ita'],
    autoLoad: true,
    preferHD: true,
    qualityFilter: 'good',
    preloadSubtitles: true
  });
  
  // Use the new frontend subtitle system
  const {
    subtitles,
    processSubtitle,
    getBestSubtitleForPlayer,
    refreshFromOpenSubtitles,
    getAvailableLanguages,
    hasImdbId,
    getSubtitleInfo,
    useFrontendSubtitles
  } = useSubtitles(movieId, {
    season,
    episode,
    imdbId, // IMDB ID for OpenSubtitles API
    preferredLanguage: selectedLanguage,
    preferredLanguages: ['eng', 'spa', 'fre'], // Multiple languages
    useFrontendSubtitles: true, // Use new frontend approach
    autoLoad: true
  });
  
  // Sample SRT content for testing
  const sampleSrtContent = `1
00:00:02,000 --> 00:00:05,000
This is a sample subtitle
demonstrating SRT format

2
00:00:06,500 --> 00:00:09,800
<i>SRT files can contain formatting</i>
like <b>bold</b> and <u>underlined</u> text

3
00:00:10,000 --> 00:00:13,500
Our parser converts SRT to WebVTT
for HTML5 video compatibility

4
00:00:14,000 --> 00:00:17,000
High-quality subtitles from OpenSubtitles
with intelligent quality scoring`;

  // Demo video URLs for testing
  const demoVideos = {
    'Big Buck Bunny': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'Elephant Dream': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'Sintel': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
  };

  // Process SRT content manually for demonstration
  const processSrtContent = async (srtContent) => {
    try {
      setProcessingResults(null);
      
      // Validate SRT content
      const validation = validateSrtContent(srtContent);
      
      // Convert to WebVTT
      const vttContent = convertSrtToVtt(srtContent);
      
      // Create blob URL
      const blobUrl = createSubtitleBlobUrl(vttContent);
      
      const results = {
        validation,
        originalContent: srtContent,
        vttContent,
        blobUrl,
        stats: {
          originalSize: srtContent.length,
          processedSize: vttContent.length,
          subtitleCount: validation.subtitleCount,
          processingTime: Date.now()
        }
      };
      
      setProcessingResults(results);
      console.log('SRT Processing Results:', results);
      
      return results;
    } catch (error) {
      console.error('Failed to process SRT content:', error);
      setProcessingResults({
        error: error.message,
        validation: { isValid: false, error: error.message }
      });
    }
  };

  // Load sample SRT content
  useEffect(() => {
    setTestSrtContent(sampleSrtContent);
  }, []);

  // Auto-select best subtitle when available
  useEffect(() => {
    if (!loading && hasLanguage(selectedLanguage)) {
      const timer = setTimeout(() => {
        selectBestSubtitle(selectedLanguage);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, hasLanguage, selectedLanguage, selectBestSubtitle]);

  const stats = getStats();
  const subtitleOptions = getSubtitleOptions();

  // Get subtitle info for display
  const subtitleInfo = getSubtitleInfo();

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
    setSelectedSubtitle(null);
    setProcessedSubtitle(null);
  };

  const handleSubtitleSelect = async (subtitle) => {
    try {
      setSelectedSubtitle(subtitle);
      setProcessedSubtitle(null);
      
      // Process the subtitle to get VTT content and blob URL
      console.log('Processing subtitle:', subtitle.fileName);
      const processed = await processSubtitle(subtitle);
      setProcessedSubtitle(processed);
      
      console.log('Subtitle processed successfully:', {
        hasContent: !!processed.content,
        hasBlobUrl: !!processed.blobUrl,
        contentLength: processed.contentLength
      });
    } catch (error) {
      console.error('Failed to process subtitle:', error);
    }
  };

  const handleGetBestSubtitle = async () => {
    try {
      console.log('Getting best subtitle for language:', selectedLanguage);
      const best = await getBestSubtitleForPlayer(selectedLanguage);
      if (best) {
        setSelectedSubtitle(best);
        setProcessedSubtitle(best);
        console.log('Best subtitle selected:', best.fileName);
      } else {
        console.log('No suitable subtitle found');
      }
    } catch (error) {
      console.error('Failed to get best subtitle:', error);
    }
  };

  const handleRefreshSubtitles = async (forceRefresh = false) => {
    try {
      console.log('Refreshing subtitles, force:', forceRefresh);
      const success = await refreshFromOpenSubtitles(forceRefresh);
      if (success) {
        console.log('Subtitles refreshed successfully');
        setSelectedSubtitle(null);
        setProcessedSubtitle(null);
      }
    } catch (error) {
      console.error('Failed to refresh subtitles:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">SRT Subtitle Processing Demo</h1>
        <p className="text-gray-300">
          Demonstration of advanced SRT subtitle processing with OpenSubtitles API integration
        </p>
      </div>

      {/* Video Player Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Video Player with Enhanced Subtitles</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Demo Video:</label>
          <select 
            value={demoVideo} 
            onChange={(e) => setDemoVideo(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full max-w-md"
          >
            <option value="">Select a demo video...</option>
            {Object.entries(demoVideos).map(([name, url]) => (
              <option key={name} value={url}>{name}</option>
            ))}
          </select>
        </div>

        {demoVideo && (
          <div className="bg-black rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              src={demoVideo}
              controls
              className="w-full max-w-4xl h-auto"
              crossOrigin="anonymous"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Subtitle Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">IMDB ID for Subtitles:</label>
            <input
              type="text"
              value={imdbId}
              onChange={(e) => setImdbId(e.target.value)}
              placeholder="e.g., 0361748 (Inglourious Basterds)"
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Preferred Language:
              {loading && <span className="ml-2 text-blue-400">Loading...</span>}
            </label>
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full"
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
            </select>
          </div>
        </div>

        {/* Subtitle Selection */}
        {subtitleOptions.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Available Subtitles:</label>
            <select
              onChange={(e) => selectSubtitle(subtitleOptions.find(opt => opt.value === e.target.value)?.subtitle)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full max-w-md"
            >
              {subtitleOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.hasError}>
                  {option.label}
                  {option.isLoading && ' (Loading...)'}
                  {option.hasError && ' (Error)'}
                  {option.metadata?.trusted && ' ✓'}
                  {option.metadata?.hd && ' HD'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active Subtitle Info */}
        {activeSubtitle && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">Active Subtitle:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Language:</strong> {activeSubtitle.languageName}</p>
              <p><strong>Format:</strong> {activeSubtitle.format?.toUpperCase()}</p>
              <p><strong>Quality Score:</strong> {activeSubtitle.qualityScore}/100</p>
              <p><strong>Downloads:</strong> {activeSubtitle.downloadCount?.toLocaleString()}</p>
              <p><strong>Rating:</strong> {activeSubtitle.rating}/10</p>
              <p><strong>Trusted:</strong> {activeSubtitle.fromTrusted ? 'Yes ✓' : 'No'}</p>
              <p><strong>HD:</strong> {activeSubtitle.isHD ? 'Yes' : 'No'}</p>
              <p><strong>Size:</strong> {(activeSubtitle.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        )}
      </div>

      {/* SRT Processing Demo */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">SRT Processing Demo</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">SRT Content:</label>
          <textarea
            value={testSrtContent}
            onChange={(e) => setTestSrtContent(e.target.value)}
            placeholder="Paste SRT content here..."
            rows={10}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full font-mono text-sm"
          />
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => processSrtContent(testSrtContent)}
            disabled={!testSrtContent}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
          >
            Process SRT Content
          </button>
          
          <button
            onClick={() => setTestSrtContent(sampleSrtContent)}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-medium"
          >
            Load Sample SRT
          </button>
          
          <button
            onClick={() => setShowProcessingDetails(!showProcessingDetails)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-medium"
          >
            {showProcessingDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {/* Processing Results */}
        {processingResults && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Processing Results:</h3>
            
            {processingResults.error ? (
              <div className="text-red-400">
                <p><strong>Error:</strong> {processingResults.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Status</p>
                    <p className={processingResults.validation.isValid ? 'text-green-400' : 'text-red-400'}>
                      {processingResults.validation.isValid ? 'Valid ✓' : 'Invalid ✗'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Subtitles</p>
                    <p>{processingResults.validation.subtitleCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Original Size</p>
                    <p>{processingResults.stats.originalSize} bytes</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Processed Size</p>
                    <p>{processingResults.stats.processedSize} bytes</p>
                  </div>
                </div>

                {showProcessingDetails && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">WebVTT Output:</h4>
                      <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto max-h-40">
                        {processingResults.vttContent}
                      </pre>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Validation Details:</h4>
                      <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(processingResults.validation, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Subtitle System Statistics:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Total Available</p>
            <p>{stats.totalAvailable}</p>
          </div>
          <div>
            <p className="text-gray-400">Languages</p>
            <p>{stats.languages.length}</p>
          </div>
          <div>
            <p className="text-gray-400">Loaded</p>
            <p>{stats.loaded}</p>
          </div>
          <div>
            <p className="text-gray-400">Cache Size</p>
            <p>{stats.cacheSize}</p>
          </div>
        </div>
        
        {stats.languages.length > 0 && (
          <div className="mt-3">
            <p className="text-gray-400 text-sm">Available Languages:</p>
            <p className="text-sm">{stats.languages.join(', ')}</p>
          </div>
        )}
        
        {error && (
          <div className="mt-3 p-3 bg-red-900/50 border border-red-600 rounded">
            <p className="text-red-400 text-sm">Error: {error}</p>
          </div>
        )}
      </div>

      {/* Frontend Subtitle System Demo */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Frontend Subtitle System Demo</h2>
        
        {/* Configuration Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-3">Configuration</h3>
          <p><strong>Movie ID:</strong> {movieId}</p>
          <p><strong>IMDB ID:</strong> {imdbId || 'Not provided'}</p>
          <p><strong>Season/Episode:</strong> {season ? `S${season}E${episode}` : 'Movie'}</p>
          <p><strong>Frontend Subtitles:</strong> {useFrontendSubtitles ? '✅ Enabled' : '❌ Disabled'}</p>
          <p><strong>Has IMDB ID:</strong> {hasImdbId ? '✅ Yes' : '❌ No'}</p>
        </div>

        {/* Subtitle Info */}
        {subtitleInfo && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Subtitle Information</h3>
            <div className="space-y-2">
              <p><strong>Total Count:</strong> {subtitleInfo.totalCount}</p>
              <p><strong>Available Languages:</strong> {subtitleInfo.availableLanguages}</p>
              <p><strong>Source:</strong> {subtitleInfo.source}</p>
              <p><strong>From Frontend:</strong> {subtitleInfo.isFromFrontend ? '✅ Yes' : '❌ No'}</p>
              <p><strong>From VM-Server:</strong> {subtitleInfo.isFromVmServer ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Blob URLs Created:</strong> {subtitleInfo.blobUrlsCreated}</p>
              {subtitleInfo.errors?.length > 0 && (
                <p><strong>Errors:</strong> {subtitleInfo.errors.length}</p>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => handleRefreshSubtitles(false)} 
            disabled={loading || !hasImdbId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
          >
            {loading ? 'Loading...' : 'Refresh Cache'}
          </button>
          
          <button 
            onClick={() => handleRefreshSubtitles(true)} 
            disabled={loading || !hasImdbId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
          >
            {loading ? 'Loading...' : 'Force Refresh'}
          </button>
          
          <button 
            onClick={handleGetBestSubtitle} 
            disabled={loading || !subtitles?.subtitles?.length}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
          >
            Get Best Subtitle
          </button>
        </div>

        {/* Loading/Error States */}
        {loading && <p className="text-blue-400">⏳ Loading subtitles...</p>}
        {error && <p className="text-red-400">❌ Error: {error}</p>}

        {/* Available Subtitles */}
        {subtitles?.subtitles && subtitles.subtitles.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Available Subtitles ({subtitles.subtitles.length})</h3>
            <div className="max-height-200 overflow-y-auto border border-gray-700 rounded">
              {subtitles.subtitles.map((subtitle, index) => (
                <div 
                  key={subtitle.id || index}
                  className={`p-2 border-b border-gray-700 ${selectedSubtitle?.id === subtitle.id ? 'bg-gray-700' : ''}`}
                  onClick={() => handleSubtitleSelect(subtitle)}
                >
                  <div className="font-semibold">
                    <strong>{subtitle.languageName}</strong> - {subtitle.fileName}
                  </div>
                  <div className="text-sm text-gray-400">
                    Quality: {subtitle.qualityScore}/100 | 
                    Format: {subtitle.format} | 
                    Downloads: {subtitle.downloads} |
                    Rating: {subtitle.rating}/10
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Subtitle Info */}
        {selectedSubtitle && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Selected Subtitle</h3>
            <div className="space-y-2">
              <p><strong>File:</strong> {selectedSubtitle.fileName}</p>
              <p><strong>Language:</strong> {selectedSubtitle.languageName}</p>
              <p><strong>Format:</strong> {selectedSubtitle.format}</p>
              <p><strong>Quality Score:</strong> {selectedSubtitle.qualityScore}/100</p>
              <p><strong>Downloads:</strong> {selectedSubtitle.downloads}</p>
              <p><strong>Rating:</strong> {selectedSubtitle.rating}/10</p>
              <p><strong>Processed:</strong> {selectedSubtitle.processed ? '✅ Yes' : '❌ No'}</p>
            </div>
          </div>
        )}

        {/* Processed Subtitle Info */}
        {processedSubtitle && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Processed Subtitle (Ready for Video Player)</h3>
            <div className="space-y-2">
              <p><strong>Has Content:</strong> {processedSubtitle.content ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Content Length:</strong> {processedSubtitle.contentLength || 0} characters</p>
              <p><strong>Has Blob URL:</strong> {processedSubtitle.blobUrl ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Blob URL:</strong> {processedSubtitle.blobUrl ? processedSubtitle.blobUrl.substring(0, 50) + '...' : 'None'}</p>
              
              {processedSubtitle.blobUrl && (
                <div className="mt-2">
                  <strong>Ready for Video Player:</strong>
                  <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto">
{`<track 
  kind="subtitles" 
  src="${processedSubtitle.blobUrl}" 
  srclang="${processedSubtitle.iso639}" 
  label="${processedSubtitle.languageName}" 
  default
/>`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No IMDB ID Warning */}
        {!hasImdbId && (
          <div className="bg-gray-800 rounded-lg p-4 mt-4">
            <strong className="text-red-400">⚠️ No IMDB ID provided</strong>
            <p>The frontend subtitle system requires an IMDB ID to fetch subtitles from OpenSubtitles API. 
               Without it, the system will fall back to vm-server extraction data if available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitleDemo; 