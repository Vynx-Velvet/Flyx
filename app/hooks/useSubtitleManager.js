import { useState, useEffect, useCallback, useRef } from 'react';
import { useSubtitles } from './useSubtitles';
import { 
  fetchAndParseSubtitle, 
  createSubtitleBlobUrl, 
  cleanupSubtitleBlobUrl,
  convertSrtToVtt,
  validateSrtContent
} from '../utils/subtitleParser';

/**
 * Enhanced subtitle manager hook for video players
 * Integrates OpenSubtitles API with SRT parsing and video player functionality
 */
export const useSubtitleManager = (imdbId, options = {}) => {
  const {
    videoRef,
    languages = ['eng', 'spa'],
    season = null,
    episode = null,
    autoLoad = true,
    preferHD = true,
    qualityFilter = 'good',
    maxCacheSize = 50,
    preloadSubtitles = true
  } = options;

  // State management
  const [loadedSubtitles, setLoadedSubtitles] = useState(new Map());
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [loadingSubtitles, setLoadingSubtitles] = useState(new Set());
  const [subtitleErrors, setSubtitleErrors] = useState(new Map());
  const [blobUrls, setBlobUrls] = useState(new Map());
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1); // -1 = off
  
  // Refs for cleanup
  const mountedRef = useRef(true);
  const loadingAbortControllers = useRef(new Map());
  
  // Use our enhanced subtitle hook
  const {
    subtitles,
    loading: subtitlesLoading,
    error: subtitlesError,
    recommendations,
    getVideoPlayerTracks,
    getBestSubtitle,
    hasLanguage,
    refetch: refetchSubtitles
  } = useSubtitles(imdbId, {
    languages,
    season,
    episode,
    autoFetch: autoLoad,
    preferHD,
    qualityFilter
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Cleanup blob URLs
      blobUrls.forEach(url => cleanupSubtitleBlobUrl(url));
      
      // Abort any loading operations
      loadingAbortControllers.current.forEach(controller => {
        controller.abort();
      });
    };
  }, []);

  /**
   * Load and parse a subtitle file
   */
  const loadSubtitle = useCallback(async (subtitle, options = {}) => {
    if (!subtitle || !subtitle.downloadLink) {
      console.warn('Invalid subtitle object provided');
      return null;
    }

    const { forceReload = false, timeout = 15000 } = options;
    const subtitleKey = `${subtitle.language}_${subtitle.id}`;
    
    // Check if already loaded and not forcing reload
    if (!forceReload && loadedSubtitles.has(subtitleKey)) {
      return loadedSubtitles.get(subtitleKey);
    }
    
    // Check if already loading
    if (loadingSubtitles.has(subtitleKey)) {
      // Clear the loading state and continue - this handles stuck loading states
      setLoadingSubtitles(prev => {
        const newSet = new Set(prev);
        newSet.delete(subtitleKey);
        return newSet;
      });
    }
    
    setLoadingSubtitles(prev => new Set(prev).add(subtitleKey));
    setSubtitleErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(subtitleKey);
      return newErrors;
    });
    
    try {
      
      // Create abort controller for this request
      const abortController = new AbortController();
      loadingAbortControllers.current.set(subtitleKey, abortController);
      
      const result = await fetchAndParseSubtitle(subtitle.downloadLink, {
        timeout,
        format: subtitle.format === 'srt' ? 'srt' : 'auto',
        validateContent: true,
        signal: abortController.signal
      });
      
      // Cleanup abort controller
      loadingAbortControllers.current.delete(subtitleKey);
      
      // Note: We don't abort loading if component unmounts since the result can still be cached
      // The finally block will handle cleanup appropriately
      
      if (result.success) {
        // Validate content before creating blob URL
        if (!result.content) {
          throw new Error('No content returned from subtitle parsing');
        }
        
        if (typeof result.content !== 'string') {
          throw new Error('Invalid content type from subtitle parsing');
        }
        
        // Create blob URL for the processed content
        let blobUrl;
        try {
          blobUrl = createSubtitleBlobUrl(result.content);
        } catch (blobError) {
          throw new Error(`Blob URL creation failed: ${blobError.message}`);
        }
        
        if (blobUrl) {
          const subtitleData = {
            ...subtitle,
            blobUrl,
            content: result.content,
            originalContent: result.originalContent,
            format: result.format,
            validation: result.validation,
            loadedAt: Date.now(),
            size: result.size,
            processedSize: result.processedSize
          };
          
          // Update state (only if component is still mounted)
          if (mountedRef.current) {
            setLoadedSubtitles(prev => new Map(prev).set(subtitleKey, subtitleData));
            setBlobUrls(prev => new Map(prev).set(subtitleKey, blobUrl));
          }
          
          return subtitleData;
        } else {
          throw new Error('Failed to create blob URL - createSubtitleBlobUrl returned null');
        }
      } else {
        throw new Error(result.error || 'Failed to parse subtitle');
      }
      
    } catch (error) {
      console.error('Failed to load subtitle:', subtitleKey, error.message);
      
      if (mountedRef.current) {
        setSubtitleErrors(prev => new Map(prev).set(subtitleKey, {
          error: error.message,
          timestamp: Date.now(),
          subtitle
        }));
      }
      
      return null;
    } finally {
      if (mountedRef.current) {
        setLoadingSubtitles(prev => {
          const newSet = new Set(prev);
          newSet.delete(subtitleKey);
          return newSet;
        });
      }
    }
  }, [loadedSubtitles, loadingSubtitles]);

  /**
   * Apply subtitle to video element
   */
  const applySubtitleToVideo = useCallback((subtitleData) => {
    if (!videoRef?.current || !subtitleData?.blobUrl) {
      console.warn('Cannot apply subtitle: missing video ref or blob URL', {
        hasVideoRef: !!videoRef?.current,
        hasBlobUrl: !!subtitleData?.blobUrl,
        subtitleData: subtitleData ? {
          language: subtitleData.languageName,
          format: subtitleData.format,
          blobUrl: subtitleData.blobUrl ? 'present' : 'missing'
        } : 'null'
      });
      return false;
    }
    
    try {
      console.log('🎬 Applying subtitle to video:', {
        language: subtitleData.languageName,
        format: subtitleData.format,
        blobUrl: subtitleData.blobUrl.substring(0, 50) + '...',
        validation: subtitleData.validation
      });
      
      // Remove existing tracks
      const existingTracks = videoRef.current.querySelectorAll('track');
      existingTracks.forEach(track => {
        console.log('🗑️ Removing existing track:', track.label);
        track.remove();
      });
      
      // Disable all text tracks
      const textTracks = videoRef.current.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        textTracks[i].mode = 'disabled';
        console.log('🔇 Disabled text track:', i);
      }
      
      // Create new track element
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.src = subtitleData.blobUrl;
      track.srclang = subtitleData.iso639 || subtitleData.language || 'en';
      track.label = `${subtitleData.languageName}${subtitleData.hearingImpaired ? ' (HI)' : ''}${subtitleData.foreignPartsOnly ? ' (Foreign Only)' : ''}`;
      track.default = true;
      
      console.log('🎯 Creating track element:', {
        kind: track.kind,
        src: track.src.substring(0, 50) + '...',
        srclang: track.srclang,
        label: track.label,
        default: track.default
      });
      
      // Add track to video element
      videoRef.current.appendChild(track);
      
      // Try to enable immediately after adding
      setTimeout(() => {
        if (videoRef.current?.textTracks?.length > 0) {
          const addedTrack = videoRef.current.textTracks[videoRef.current.textTracks.length - 1];
          addedTrack.mode = 'showing';
          console.log('✅ Immediately enabled text track:', addedTrack.label, 'Mode:', addedTrack.mode);
        }
      }, 100);
      
      // Also enable when track loads (backup)
      track.addEventListener('load', () => {
        console.log('📥 Track load event fired');
        if (videoRef.current?.textTracks?.length > 0) {
          const textTrack = videoRef.current.textTracks[videoRef.current.textTracks.length - 1];
          textTrack.mode = 'showing';
          console.log('✅ Track loaded and enabled via load event:', subtitleData.languageName, 'Mode:', textTrack.mode);
        }
      });
      
      // Error handling
      track.addEventListener('error', (error) => {
        console.error('❌ Subtitle track error:', error, {
          src: track.src,
          subtitleData: {
            language: subtitleData.languageName,
            format: subtitleData.format,
            validation: subtitleData.validation
          }
        });
      });
      
      // Additional debugging for track readiness
      track.addEventListener('canplaythrough', () => {
        console.log('🎬 Track canplaythrough event fired');
      });
      
      setActiveSubtitle(subtitleData);
      
      console.log('✅ Applied subtitle to video successfully:', {
        language: subtitleData.languageName,
        format: subtitleData.format,
        label: track.label,
        trackCount: videoRef.current.textTracks.length
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to apply subtitle to video:', error);
      return false;
    }
  }, [videoRef]);

  /**
   * Select and load a subtitle
   */
  const selectSubtitle = useCallback(async (subtitle, options = {}) => {
    if (!subtitle) {
      // Turn off subtitles
      if (videoRef?.current) {
        const existingTracks = videoRef.current.querySelectorAll('track');
        existingTracks.forEach(track => track.remove());
        
        const textTracks = videoRef.current.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
          textTracks[i].mode = 'disabled';
        }
      }
      
      setActiveSubtitle(null);
      setCurrentTrackIndex(-1);
      console.log('Subtitles turned off');
      return true;
    }
    
    const subtitleKey = `${subtitle.language}_${subtitle.id}`;
    
    // Check if already loaded
    let subtitleData = loadedSubtitles.get(subtitleKey);
    
    if (!subtitleData) {
      // Load the subtitle
      subtitleData = await loadSubtitle(subtitle, options);
      if (!subtitleData) {
        console.error('Failed to load subtitle:', subtitleKey);
        return false;
      }
    }
    
    // Apply to video
    const success = applySubtitleToVideo(subtitleData);
    if (success) {
      setCurrentTrackIndex(subtitleKey);
    }
    
    return success;
  }, [loadedSubtitles, loadSubtitle, applySubtitleToVideo, videoRef]);

  /**
   * Auto-select best subtitle for a language
   */
  const selectBestSubtitle = useCallback(async (language = 'eng', options = {}) => {
    const bestSubtitle = getBestSubtitle(language);
    if (bestSubtitle) {
      return await selectSubtitle(bestSubtitle, options);
    }
    
    console.log('No suitable subtitle found for language:', language);
    return false;
  }, [getBestSubtitle, selectSubtitle]);

  /**
   * Preload popular subtitles for better performance
   */
  const preloadPopularSubtitles = useCallback(async () => {
    if (!preloadSubtitles || !subtitles) return;
    
    const tracksToPreload = getVideoPlayerTracks({
      maxPerLanguage: 2,
      qualityFilter: 'good'
    });
    
    console.log('Preloading popular subtitles:', tracksToPreload.length);
    
    // Load top 2 subtitles for each language concurrently
    const preloadPromises = tracksToPreload.slice(0, 6).map(track => {
      const subtitle = subtitles.languages?.[track.srcLang]?.subtitles?.[0];
      if (subtitle) {
        return loadSubtitle(subtitle, { timeout: 8000 });
      }
      return Promise.resolve(null);
    });
    
    try {
      await Promise.allSettled(preloadPromises);
      console.log('Preloading completed');
    } catch (error) {
      console.warn('Preloading failed:', error);
    }
  }, [subtitles, getVideoPlayerTracks, loadSubtitle, preloadSubtitles]);

  /**
   * Get available subtitle options for UI
   */
  const getSubtitleOptions = useCallback(() => {
    if (!subtitles) return [];
    
    const options = [
      { value: 'off', label: 'Off', language: null }
    ];
    
    Object.entries(subtitles.languages || {}).forEach(([langCode, langData]) => {
      if (langData.subtitles && langData.subtitles.length > 0) {
        langData.subtitles.slice(0, 3).forEach((subtitle, index) => {
          const subtitleKey = `${subtitle.language}_${subtitle.id}`;
          const isLoaded = loadedSubtitles.has(subtitleKey);
          const isLoading = loadingSubtitles.has(subtitleKey);
          const hasError = subtitleErrors.has(subtitleKey);
          
          options.push({
            value: subtitleKey,
            label: `${subtitle.languageName}${index > 0 ? ` (${index + 1})` : ''}${subtitle.hearingImpaired ? ' (HI)' : ''}`,
            subtitle,
            isLoaded,
            isLoading,
            hasError,
            quality: subtitle.qualityScore || 0,
            metadata: {
              downloads: subtitle.downloadCount,
              rating: subtitle.rating,
              trusted: subtitle.fromTrusted,
              hd: subtitle.isHD
            }
          });
        });
      }
    });
    
    return options.sort((a, b) => {
      if (a.value === 'off') return -1;
      if (b.value === 'off') return 1;
      return (b.quality || 0) - (a.quality || 0);
    });
  }, [subtitles, loadedSubtitles, loadingSubtitles, subtitleErrors]);

  /**
   * Get subtitle statistics
   */
  const getStats = useCallback(() => {
    return {
      totalAvailable: subtitles?.totalCount || 0,
      loaded: loadedSubtitles.size,
      loading: loadingSubtitles.size,
      errors: subtitleErrors.size,
      languages: Object.keys(subtitles?.languages || {}),
      activeSubtitle: activeSubtitle?.languageName || null,
      cacheSize: blobUrls.size,
      hasEnglish: hasLanguage('eng'),
      hasSpanish: hasLanguage('spa')
    };
  }, [subtitles, loadedSubtitles, loadingSubtitles, subtitleErrors, activeSubtitle, blobUrls, hasLanguage]);

  /**
   * Clear subtitle cache
   */
  const clearCache = useCallback(() => {
    // Cleanup blob URLs
    blobUrls.forEach(url => cleanupSubtitleBlobUrl(url));
    
    // Reset state
    setLoadedSubtitles(new Map());
    setBlobUrls(new Map());
    setSubtitleErrors(new Map());
    setActiveSubtitle(null);
    setCurrentTrackIndex(-1);
    
    console.log('Subtitle cache cleared');
  }, [blobUrls]);

  // Auto-preload when subtitles become available
  useEffect(() => {
    if (subtitles && !subtitlesLoading && preloadSubtitles) {
      const timer = setTimeout(preloadPopularSubtitles, 1000);
      return () => clearTimeout(timer);
    }
  }, [subtitles, subtitlesLoading, preloadPopularSubtitles, preloadSubtitles]);

  return {
    // Core functionality
    selectSubtitle,
    selectBestSubtitle,
    loadSubtitle,
    
    // State
    subtitles,
    activeSubtitle,
    currentTrackIndex,
    
    // Loading states
    loading: subtitlesLoading,
    loadingSubtitles: Array.from(loadingSubtitles),
    
    // Errors
    error: subtitlesError,
    subtitleErrors: Array.from(subtitleErrors.entries()),
    
    // UI helpers
    getSubtitleOptions,
    getStats,
    
    // Cache management
    clearCache,
    loadedCount: loadedSubtitles.size,
    
    // Advanced features
    recommendations,
    preloadPopularSubtitles,
    
    // Utilities
    hasLanguage,
    getBestSubtitle,
    getVideoPlayerTracks,
    
    // Refresh
    refresh: refetchSubtitles
  };
}; 