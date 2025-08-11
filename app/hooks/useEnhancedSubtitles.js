/**
 * Enhanced subtitle hook with improved VTT parsing, high-frequency synchronization,
 * and multi-language management
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5 for enhanced subtitle management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseVTTEnhanced } from '../utils/enhancedVttParser';
import { createSubtitleSynchronizer } from '../utils/subtitleSynchronizer';
import { createMultiLanguageSubtitleManager, LANGUAGE_PRIORITY_PRESETS } from '../utils/multiLanguageSubtitleManager';

// Language configuration matching the original useSubtitles
const REQUESTED_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'rus', name: 'Russian' },
  { code: 'ara', name: 'Arabic' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'fre', name: 'French' }
];

/**
 * Enhanced subtitle hook with improved parsing and synchronization
 * @param {Object} options - Hook configuration
 * @returns {Object} Subtitle utilities and state
 */
export const useEnhancedSubtitles = ({ imdbId, season, episode, enabled, videoRef }) => {
  // State management
  const [subtitles, setSubtitles] = useState([]);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsingStats, setParsingStats] = useState(null);
  const [synchronizerMetrics, setSynchronizerMetrics] = useState(null);

  // Multi-language management state
  const [activeLanguage, setActiveLanguage] = useState(null);
  const [languagePriority, setLanguagePriority] = useState(LANGUAGE_PRIORITY_PRESETS.ENGLISH_FIRST);
  const [multiLanguageStats, setMultiLanguageStats] = useState(null);

  // Refs for synchronizer and cleanup
  const synchronizerRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const blobUrlsRef = useRef(new Set());
  const multiLanguageManagerRef = useRef(null);

  // Memory manager integration
  const memoryManagerRef = useRef(null);

  // Initialize multi-language subtitle manager
  useEffect(() => {
    // Create multi-language manager
    multiLanguageManagerRef.current = createMultiLanguageSubtitleManager({
      defaultLanguagePriority: languagePriority,
      maxCachedLanguages: 5,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      cacheExpirationTime: 30 * 60 * 1000, // 30 minutes
      preloadNextLanguage: true,
      enableSeamlessSwitching: true
    });

    // Set up multi-language manager callbacks
    multiLanguageManagerRef.current.on('languageChange', ({ currentLanguage, previousLanguage, reason, seamless }) => {
      console.log('🌍 Language changed:', {
        from: previousLanguage,
        to: currentLanguage,
        reason,
        seamless
      });
      setActiveLanguage(currentLanguage);
    });

    multiLanguageManagerRef.current.on('subtitleChange', ({ text, cue, transition, language }) => {
      setCurrentSubtitleText(text);
      
      // Log subtitle changes for debugging (first few only)
      if (cue && multiLanguageManagerRef.current.metrics.languageSwitches <= 5) {
        console.log('📝 Multi-language subtitle display:', {
          language,
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          transition: transition.type,
          progress: transition.progress.toFixed(2)
        });
      }
    });

    multiLanguageManagerRef.current.on('cacheUpdate', (stats) => {
      setMultiLanguageStats(stats);
    });

    multiLanguageManagerRef.current.on('error', ({ type, error, langCode }) => {
      console.error('❌ Multi-language subtitle error:', { type, error, langCode });
      setError(`Multi-language error (${type}): ${error}`);
    });

    // Fallback synchronizer for single-language mode
    synchronizerRef.current = createSubtitleSynchronizer({
      updateInterval: 100, // 100ms for sub-100ms accuracy
      transitionDuration: 200,
      preloadBuffer: 2000,
      enablePerformanceOptimization: true
    });

    // Set up synchronizer callbacks
    synchronizerRef.current.on('subtitleChange', ({ text, cue, transition }) => {
      setCurrentSubtitleText(text);
      
      // Log subtitle changes for debugging (first few only)
      if (cue && synchronizerRef.current.performanceMetrics.updateCount <= 5) {
        console.log('📝 Enhanced subtitle display:', {
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          transition: transition.type,
          progress: transition.progress.toFixed(2)
        });
      }
    });

    synchronizerRef.current.on('performanceWarning', (metrics) => {
      console.warn('⚠️ Subtitle synchronizer performance warning:', metrics);
      setSynchronizerMetrics(synchronizerRef.current.getPerformanceMetrics());
    });

    return () => {
      if (multiLanguageManagerRef.current) {
        multiLanguageManagerRef.current.destroy();
      }
      if (synchronizerRef.current) {
        synchronizerRef.current.destroy();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      // Enhanced blob URL cleanup with memory manager integration
      blobUrlsRef.current.forEach(url => {
        try {
          // Unregister from memory manager if available
          if (memoryManagerRef.current) {
            memoryManagerRef.current.unregisterBlobUrl(url);
          } else {
            // Fallback to direct cleanup
            URL.revokeObjectURL(url);
          }
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      });
      blobUrlsRef.current.clear();
    };
  }, [languagePriority]);

  // Fetch subtitles for all requested languages
  const fetchAllSubtitles = useCallback(async () => {
    if (!imdbId || !enabled) return;

    setLoading(true);
    setError(null);
    const allSubtitles = [];

    try {
      console.log('🌍 Enhanced subtitle fetch starting:', {
        imdbId,
        season,
        episode,
        languages: REQUESTED_LANGUAGES.length
      });

      // Fetch subtitles for each language
      for (const lang of REQUESTED_LANGUAGES) {
        try {
          const params = new URLSearchParams({
            imdbId: imdbId,
            languageId: lang.code,
            ...(season && { season: season }),
            ...(episode && { episode: episode }),
          });

          const response = await fetch(`/api/subtitles?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.subtitles && data.subtitles.length > 0) {
              const bestSubtitle = data.subtitles[0];
              allSubtitles.push({ 
                ...bestSubtitle, 
                language: lang.name,
                langcode: lang.code,
                id: bestSubtitle.id || `${lang.code}_${Math.random()}`
              });
              console.log(`✅ Found enhanced ${lang.name} subtitles`);
            }
          }
        } catch (langError) {
          console.warn(`❌ Failed to fetch ${lang.name} subtitles:`, langError);
        }
      }

      if (allSubtitles.length > 0) {
        setSubtitles(allSubtitles);
        setAvailableLanguages(allSubtitles.map(s => ({ 
          langcode: s.langcode, 
          language: s.language 
        })));
        console.log(`✅ Enhanced subtitle fetch completed: ${allSubtitles.length} languages`);
      } else {
        console.warn('❌ No subtitles found in any language');
        setSubtitles([]);
        setAvailableLanguages([]);
      }
    } catch (err) {
      setError(err.message);
      console.error("❌ Enhanced subtitle fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [imdbId, season, episode, enabled]);

  // Enhanced subtitle selection with improved parsing
  const selectSubtitle = useCallback(async (subtitle) => {
    console.log('🎬 Enhanced subtitle selection:', subtitle?.language);
    
    if (!subtitle) {
      console.log('🔄 Clearing active subtitle');
      setActiveSubtitle(null);
      setCurrentSubtitleText('');
      if (synchronizerRef.current) {
        synchronizerRef.current.stop();
      }
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📥 Downloading subtitle with enhanced processing:', subtitle.downloadLink);
      
      const response = await fetch('/api/subtitles/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ download_link: subtitle.downloadLink }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.status} ${errorText}`);
      }
      
      const responseData = await response.json();
      if (!responseData.vtt) {
        throw new Error('No VTT content in response');
      }

      console.log('🔍 Starting enhanced VTT parsing...');
      
      // Use enhanced VTT parser
      const parseResult = parseVTTEnhanced(responseData.vtt, {
        strictMode: false,
        enableErrorRecovery: true,
        sanitizeHtml: true,
        validateTiming: true,
        maxCues: 5000
      });

      if (parseResult.cues.length === 0) {
        throw new Error('No valid subtitle cues found after enhanced parsing');
      }

      // Store parsing statistics
      setParsingStats({
        totalCues: parseResult.cues.length,
        processedCues: parseResult.metadata.processedCues,
        skippedCues: parseResult.metadata.skippedCues,
        errors: parseResult.metadata.errors.length,
        warnings: parseResult.metadata.warnings.length,
        processingTime: parseResult.metadata.processingTime,
        format: parseResult.metadata.format
      });

      console.log('✅ Enhanced VTT parsing completed:', {
        cues: parseResult.cues.length,
        errors: parseResult.metadata.errors.length,
        warnings: parseResult.metadata.warnings.length,
        processingTime: `${parseResult.metadata.processingTime.toFixed(2)}ms`
      });

      // Create blob URL for compatibility with memory manager integration
      const blob = new Blob([responseData.vtt], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.add(blobUrl);

      // Register blob URL with memory manager for automatic cleanup
      if (memoryManagerRef.current) {
        memoryManagerRef.current.registerBlobUrl(blobUrl, {
          type: 'subtitle',
          language: subtitle.language,
          size: blob.size,
          source: 'opensubtitles'
        });
      }

      // Clean up old blob URL with memory manager integration
      if (activeSubtitle?.blobUrl) {
        if (memoryManagerRef.current) {
          memoryManagerRef.current.unregisterBlobUrl(activeSubtitle.blobUrl);
        } else {
          URL.revokeObjectURL(activeSubtitle.blobUrl);
        }
        blobUrlsRef.current.delete(activeSubtitle.blobUrl);
      }

      const newActiveSubtitle = { 
        ...subtitle, 
        blobUrl,
        cues: parseResult.cues,
        parsingMetadata: parseResult.metadata
      };
      
      setActiveSubtitle(newActiveSubtitle);

      // Load cues into synchronizer
      if (synchronizerRef.current) {
        synchronizerRef.current.loadCues(parseResult.cues, ({ text }) => {
          setCurrentSubtitleText(text);
        });
        synchronizerRef.current.start();
      }

      console.log('✅ Enhanced subtitle selection completed:', {
        language: subtitle.language,
        cues: parseResult.cues.length,
        blobUrl: blobUrl.substring(0, 50) + '...'
      });

    } catch (err) {
      setError(err.message);
      console.error("❌ Enhanced subtitle processing error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeSubtitle]);

  // High-frequency time update for synchronizer
  const updateSubtitleTime = useCallback((currentTime) => {
    if (synchronizerRef.current && activeSubtitle) {
      synchronizerRef.current.updateTime(currentTime);
    }
  }, [activeSubtitle]);

  // Start high-frequency updates when video is available
  useEffect(() => {
    if (videoRef?.current && (activeSubtitle || activeLanguage)) {
      // Clear existing interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      // Start high-frequency updates (every 100ms)
      updateIntervalRef.current = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          const currentTime = videoRef.current.currentTime;
          
          // Update multi-language manager if active
          if (multiLanguageManagerRef.current && activeLanguage) {
            multiLanguageManagerRef.current.updateTime(currentTime);
          } else {
            // Fallback to single synchronizer
            updateSubtitleTime(currentTime);
          }
        }
      }, 100);

      console.log('▶️ Started high-frequency subtitle updates');

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    }
  }, [videoRef, activeSubtitle, activeLanguage, updateSubtitleTime]);

  // Initial subtitle fetch
  useEffect(() => {
    fetchAllSubtitles();
  }, [fetchAllSubtitles]);

  // Multi-language subtitle management functions
  const loadMultipleLanguages = useCallback(async (subtitleData, options = {}) => {
    if (!multiLanguageManagerRef.current) return;

    setLoading(true);
    setError(null);

    try {
      await multiLanguageManagerRef.current.loadMultipleLanguages(subtitleData, {
        autoSelectBest: true,
        preloadAll: false,
        qualityThreshold: 0.5,
        ...options
      });

      // Update available languages from manager
      const availableLangs = multiLanguageManagerRef.current.getAvailableLanguages();
      setAvailableLanguages(availableLangs.map(lang => ({
        langcode: lang.langCode,
        language: REQUESTED_LANGUAGES.find(l => l.code === lang.langCode)?.name || lang.langCode,
        qualityScore: lang.qualityScore,
        cached: lang.cached
      })));

      console.log('🌍 Multi-language subtitles loaded:', availableLangs.length);
    } catch (error) {
      console.error('❌ Error loading multi-language subtitles:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchLanguage = useCallback(async (langCode, options = {}) => {
    if (!multiLanguageManagerRef.current) return;

    setLoading(true);
    setError(null);

    try {
      await multiLanguageManagerRef.current.switchToLanguage(langCode, {
        preserveTime: true,
        reason: 'manual',
        ...options
      });

      console.log('🔄 Switched to language:', langCode);
    } catch (error) {
      console.error('❌ Error switching language:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const setLanguagePriorityOrder = useCallback((priorityOrder) => {
    setLanguagePriority(priorityOrder);
    if (multiLanguageManagerRef.current) {
      multiLanguageManagerRef.current.setLanguagePriority(priorityOrder);
    }
  }, []);

  const getMultiLanguageStats = useCallback(() => {
    if (!multiLanguageManagerRef.current) return null;
    return multiLanguageManagerRef.current.getCacheStats();
  }, []);

  // Integrate with memory manager
  const integrateWithMemoryManager = useCallback((memoryManager) => {
    memoryManagerRef.current = memoryManager;
    console.log('🧠 Enhanced subtitles integrated with memory manager');
    
    // Register existing blob URLs
    blobUrlsRef.current.forEach(url => {
      memoryManager.registerBlobUrl(url, {
        type: 'subtitle',
        source: 'enhanced_subtitles'
      });
    });
  }, []);

  // Get current subtitle cue for external use
  const getCurrentCue = useCallback(() => {
    // Try multi-language manager first
    if (multiLanguageManagerRef.current && multiLanguageManagerRef.current.activeSynchronizer) {
      if (!videoRef?.current) return null;
      const currentTime = videoRef.current.currentTime;
      return multiLanguageManagerRef.current.activeSynchronizer.findActiveCue(currentTime);
    }

    // Fallback to single synchronizer
    if (!synchronizerRef.current || !videoRef?.current) {
      return null;
    }
    
    const currentTime = videoRef.current.currentTime;
    return synchronizerRef.current.findActiveCue(currentTime);
  }, [videoRef]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return {
      parsing: parsingStats,
      synchronizer: synchronizerRef.current?.getPerformanceMetrics() || null,
      multiLanguage: multiLanguageStats
    };
  }, [parsingStats, multiLanguageStats]);

  // Manual time update for external control
  const manualTimeUpdate = useCallback((currentTime) => {
    // Update multi-language manager if active
    if (multiLanguageManagerRef.current && activeLanguage) {
      multiLanguageManagerRef.current.updateTime(currentTime);
    } else {
      // Fallback to single synchronizer
      updateSubtitleTime(currentTime);
    }
  }, [updateSubtitleTime, activeLanguage]);

  return {
    // Original API compatibility
    subtitles,
    availableLanguages,
    activeSubtitle,
    loading,
    error,
    fetchSubtitles: fetchAllSubtitles,
    selectSubtitle,
    
    // Enhanced features
    currentSubtitleText,
    parsingStats,
    synchronizerMetrics,
    getCurrentCue,
    getPerformanceMetrics,
    updateSubtitleTime: manualTimeUpdate,
    
    // Multi-language features
    activeLanguage,
    languagePriority,
    multiLanguageStats,
    loadMultipleLanguages,
    switchLanguage,
    setLanguagePriorityOrder,
    getMultiLanguageStats,
    
    // Utility functions
    isEnhanced: true,
    isMultiLanguage: true,
    integrateWithMemoryManager
  };
};