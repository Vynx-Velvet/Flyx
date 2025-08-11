/**
 * Demo component for Multi-language Subtitle Management System
 * Demonstrates requirements 3.3, 3.5 implementation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEnhancedSubtitles } from '../hooks/useEnhancedSubtitles';
import { LANGUAGE_PRIORITY_PRESETS, QUALITY_SCORING_PRESETS } from '../utils/multiLanguageSubtitleManager';

const MultiLanguageSubtitleDemo = ({ imdbId = 'tt0111161', season = null, episode = null }) => {
  const [demoMode, setDemoMode] = useState('single'); // 'single' or 'multi'
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [priorityPreset, setPriorityPreset] = useState('ENGLISH_FIRST');
  const [qualityPreset, setQualityPreset] = useState('BALANCED');
  const [showStats, setShowStats] = useState(false);
  const videoRef = useRef(null);

  // Use enhanced subtitles hook
  const {
    // Original features
    subtitles,
    availableLanguages,
    activeSubtitle,
    loading,
    error,
    currentSubtitleText,
    fetchSubtitles,
    selectSubtitle,
    
    // Multi-language features
    activeLanguage,
    languagePriority,
    multiLanguageStats,
    loadMultipleLanguages,
    switchLanguage,
    setLanguagePriorityOrder,
    getMultiLanguageStats,
    
    // Enhanced features
    parsingStats,
    getPerformanceMetrics,
    isEnhanced,
    isMultiLanguage
  } = useEnhancedSubtitles({
    imdbId,
    season,
    episode,
    enabled: true,
    videoRef
  });

  // Demo subtitle data (simulated)
  const demoSubtitleData = {
    eng: [
      {
        id: 'eng_1',
        fileName: 'The.Shawshank.Redemption.1994.1080p.BluRay.x264.srt',
        downloadCount: 15420,
        rating: 9.2,
        fileSize: 87 * 1024,
        uploadDate: new Date('2023-06-15'),
        downloadLink: '/demo/subtitles/eng_high.srt'
      },
      {
        id: 'eng_2',
        fileName: 'shawshank.1994.web-dl.srt',
        downloadCount: 8930,
        rating: 8.1,
        fileSize: 82 * 1024,
        uploadDate: new Date('2023-05-20'),
        downloadLink: '/demo/subtitles/eng_medium.srt'
      }
    ],
    spa: [
      {
        id: 'spa_1',
        fileName: 'Cadena.Perpetua.1994.BluRay.Spanish.srt',
        downloadCount: 7650,
        rating: 8.8,
        fileSize: 91 * 1024,
        uploadDate: new Date('2023-07-01'),
        downloadLink: '/demo/subtitles/spa_high.srt'
      }
    ],
    fre: [
      {
        id: 'fre_1',
        fileName: 'Les.Evades.1994.French.srt',
        downloadCount: 4320,
        rating: 8.3,
        fileSize: 89 * 1024,
        uploadDate: new Date('2023-06-10'),
        downloadLink: '/demo/subtitles/fre_medium.srt'
      }
    ],
    ger: [
      {
        id: 'ger_1',
        fileName: 'Die.Verurteilten.1994.German.srt',
        downloadCount: 3210,
        rating: 7.9,
        fileSize: 85 * 1024,
        uploadDate: new Date('2023-05-15'),
        downloadLink: '/demo/subtitles/ger_medium.srt'
      }
    ],
    ita: [
      {
        id: 'ita_1',
        fileName: 'Le.Ali.della.Liberta.1994.Italian.srt',
        downloadCount: 2890,
        rating: 8.0,
        fileSize: 88 * 1024,
        uploadDate: new Date('2023-06-25'),
        downloadLink: '/demo/subtitles/ita_medium.srt'
      }
    ]
  };

  // Handle demo mode switch
  const handleDemoModeChange = async (mode) => {
    setDemoMode(mode);
    
    if (mode === 'multi' && isMultiLanguage) {
      console.log('🌍 Switching to multi-language mode');
      await loadMultipleLanguages(demoSubtitleData, {
        autoSelectBest: true,
        preloadAll: false,
        qualityThreshold: 0.4
      });
    } else if (mode === 'single') {
      console.log('📝 Switching to single language mode');
      await fetchSubtitles();
    }
  };

  // Handle language priority change
  const handlePriorityChange = (preset) => {
    setPriorityPreset(preset);
    const priority = LANGUAGE_PRIORITY_PRESETS[preset];
    setLanguagePriorityOrder(priority);
  };

  // Handle language switch
  const handleLanguageSwitch = async (langCode) => {
    if (demoMode === 'multi' && isMultiLanguage) {
      await switchLanguage(langCode, { reason: 'user_selection' });
    } else {
      // Single language mode - find and select subtitle
      const subtitle = subtitles.find(s => s.langcode === langCode);
      if (subtitle) {
        await selectSubtitle(subtitle);
      }
    }
    setSelectedLanguage(langCode);
  };

  // Get current stats
  const currentStats = getMultiLanguageStats();
  const performanceMetrics = getPerformanceMetrics();

  return (
    <div className="multi-language-subtitle-demo" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🌍 Multi-Language Subtitle Management Demo</h2>
      
      {/* Demo Controls */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h3>Demo Controls</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            <strong>Mode: </strong>
            <select value={demoMode} onChange={(e) => handleDemoModeChange(e.target.value)}>
              <option value="single">Single Language</option>
              <option value="multi">Multi-Language</option>
            </select>
          </label>
        </div>

        {demoMode === 'multi' && (
          <div style={{ marginBottom: '10px' }}>
            <label>
              <strong>Language Priority: </strong>
              <select value={priorityPreset} onChange={(e) => handlePriorityChange(e.target.value)}>
                <option value="ENGLISH_FIRST">English First</option>
                <option value="SPANISH_FIRST">Spanish First</option>
                <option value="EUROPEAN">European Languages</option>
                <option value="GLOBAL">Global Languages</option>
              </select>
            </label>
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
            />
            <strong> Show Performance Stats</strong>
          </label>
        </div>
      </div>

      {/* Status Display */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Status</h3>
        <div><strong>Mode:</strong> {demoMode === 'multi' ? 'Multi-Language' : 'Single Language'}</div>
        <div><strong>Enhanced:</strong> {isEnhanced ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Multi-Language:</strong> {isMultiLanguage ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Loading:</strong> {loading ? '⏳ Yes' : '✅ No'}</div>
        <div><strong>Active Language:</strong> {activeLanguage || selectedLanguage || 'None'}</div>
        <div><strong>Available Languages:</strong> {availableLanguages.length}</div>
        {error && <div style={{ color: 'red' }}><strong>Error:</strong> {error}</div>}
      </div>

      {/* Language Selection */}
      {availableLanguages.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>Available Languages</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {availableLanguages.map((lang) => (
              <button
                key={lang.langcode}
                onClick={() => handleLanguageSwitch(lang.langcode)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: (activeLanguage || selectedLanguage) === lang.langcode ? '#007bff' : '#fff',
                  color: (activeLanguage || selectedLanguage) === lang.langcode ? '#fff' : '#000',
                  cursor: 'pointer'
                }}
              >
                {lang.language || lang.langcode}
                {lang.qualityScore && (
                  <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>
                    ({(lang.qualityScore * 100).toFixed(0)}%)
                  </span>
                )}
                {lang.cached && <span style={{ marginLeft: '5px' }}>💾</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Subtitle Display */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '2px solid #007bff', borderRadius: '5px' }}>
        <h3>Current Subtitle</h3>
        <div style={{
          minHeight: '60px',
          padding: '10px',
          backgroundColor: '#000',
          color: '#fff',
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '18px',
          lineHeight: '1.4'
        }}>
          {currentSubtitleText || 'No subtitle text currently displayed'}
        </div>
      </div>

      {/* Performance Stats */}
      {showStats && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>Performance Statistics</h3>
          
          {/* Multi-language stats */}
          {currentStats && (
            <div style={{ marginBottom: '15px' }}>
              <h4>Multi-Language Manager</h4>
              <div><strong>Cache Hits:</strong> {currentStats.cacheHits}</div>
              <div><strong>Cache Misses:</strong> {currentStats.cacheMisses}</div>
              <div><strong>Language Switches:</strong> {currentStats.languageSwitches}</div>
              <div><strong>Cached Languages:</strong> {currentStats.cachedLanguages}</div>
              <div><strong>Cache Size:</strong> {(currentStats.cacheSize / 1024).toFixed(1)} KB</div>
              <div><strong>Blob URLs Created:</strong> {currentStats.blobUrlsCreated}</div>
              <div><strong>Blob URLs Revoked:</strong> {currentStats.blobUrlsRevoked}</div>
            </div>
          )}

          {/* Parsing stats */}
          {parsingStats && (
            <div style={{ marginBottom: '15px' }}>
              <h4>VTT Parsing</h4>
              <div><strong>Total Cues:</strong> {parsingStats.totalCues}</div>
              <div><strong>Processed Cues:</strong> {parsingStats.processedCues}</div>
              <div><strong>Skipped Cues:</strong> {parsingStats.skippedCues}</div>
              <div><strong>Errors:</strong> {parsingStats.errors}</div>
              <div><strong>Warnings:</strong> {parsingStats.warnings}</div>
              <div><strong>Processing Time:</strong> {parsingStats.processingTime?.toFixed(2)} ms</div>
            </div>
          )}

          {/* Synchronizer stats */}
          {performanceMetrics?.synchronizer && (
            <div>
              <h4>Synchronizer</h4>
              <div><strong>Update Count:</strong> {performanceMetrics.synchronizer.updateCount}</div>
              <div><strong>Average Update Time:</strong> {performanceMetrics.synchronizer.averageUpdateTime?.toFixed(2)} ms</div>
              <div><strong>Max Update Time:</strong> {performanceMetrics.synchronizer.maxUpdateTime?.toFixed(2)} ms</div>
              <div><strong>Cache Size:</strong> {performanceMetrics.synchronizer.cacheSize}</div>
              <div><strong>Active:</strong> {performanceMetrics.synchronizer.isActive ? '✅' : '❌'}</div>
            </div>
          )}
        </div>
      )}

      {/* Language Priority Display */}
      {demoMode === 'multi' && languagePriority && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>Language Priority Order</h3>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {languagePriority.map((lang, index) => (
              <span
                key={lang}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '3px',
                  fontSize: '0.9em'
                }}
              >
                {index + 1}. {lang.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Demo Instructions */}
      <div style={{ padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '5px', fontSize: '0.9em' }}>
        <h3>Demo Instructions</h3>
        <ul>
          <li><strong>Single Language Mode:</strong> Traditional subtitle management with one language at a time</li>
          <li><strong>Multi-Language Mode:</strong> Advanced management with caching, quality scoring, and seamless switching</li>
          <li><strong>Language Priority:</strong> Determines which language is automatically selected when multiple are available</li>
          <li><strong>Quality Scoring:</strong> Subtitles are scored based on download count, rating, file size, and upload date</li>
          <li><strong>Caching:</strong> Frequently used subtitles are cached for better performance (💾 icon indicates cached)</li>
          <li><strong>Seamless Switching:</strong> Language changes preserve current playback time</li>
        </ul>
      </div>

      {/* Hidden video element for demo */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        src="/demo/sample-video.mp4"
        controls
      />
    </div>
  );
};

export default MultiLanguageSubtitleDemo;