'use client'

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useMediaContext } from '../context/MediaContext';

/**
 * Custom hook for managing subtitles using frontend OpenSubtitles API (cloudnestra approach)
 * Falls back to vm-server extraction data if available
 * @param {string} mediaId - TMDB ID for the media  
 * @param {object} options - Options for subtitle handling
 * @returns {object} Subtitle utilities and state
 */
export const useSubtitles = (mediaId, options = {}) => {
  const {
    season = null,
    episode = null,
    autoLoad = true,
    preferredLanguage = 'english',
    imdbId = null, // IMDB ID for OpenSubtitles API
    preferredLanguages = ['eng', 'spa', 'fre'], // Multiple language support
    useFrontendSubtitles = true // Use new frontend approach by default
  } = options;

  const {
    // New frontend subtitle methods
    fetchSubtitlesFromOpenSubtitles,
    downloadAndProcessSubtitle,
    getCachedSubtitles,
    fetchMultiLanguageSubtitles,
    getBestAvailableSubtitle,
    // Legacy vm-server methods (fallback)
    getSubtitlesFromExtraction,
    hasSubtitleData,
    getVideoPlayerSubtitles,
    getBestSubtitle,
    getExtractionStats,
    clearSubtitleCache
  } = useMediaContext();

  const [subtitles, setSubtitles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blobUrls, setBlobUrls] = useState(new Map()); // Track created blob URLs for cleanup

  // Generate cache key for this media item
  const cacheKey = useMemo(() => 
    `${mediaId}_${season || 'movie'}_${episode || '0'}`, 
    [mediaId, season, episode]
  );

  // Create blob URL from VTT content
  const createBlobUrl = useCallback((vttContent) => {
    try {
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Track blob URL for cleanup
      setBlobUrls(prev => new Map(prev.set(blobUrl, Date.now())));
      
      console.log('Created blob URL for VTT content:', blobUrl);
      return blobUrl;
    } catch (error) {
      console.error('Failed to create blob URL:', error);
      return null;
    }
  }, []);

  // Clean up blob URL
  const cleanupBlobUrl = useCallback((blobUrl) => {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(blobUrl);
        setBlobUrls(prev => {
          const newMap = new Map(prev);
          newMap.delete(blobUrl);
          return newMap;
        });
        console.log('Cleaned up blob URL:', blobUrl);
      } catch (error) {
        console.error('Failed to cleanup blob URL:', error);
      }
    }
  }, []);

  // Clean up all blob URLs
  const cleanupAllBlobUrls = useCallback(() => {
    setBlobUrls(prev => {
      prev.forEach((timestamp, blobUrl) => {
        if (blobUrl && blobUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(blobUrl);
            console.log('Cleaned up blob URL:', blobUrl);
          } catch (error) {
            console.error('Failed to cleanup blob URL:', error);
          }
        }
      });
      return new Map();
    });
  }, []);

  // Auto-load when parameters change
  useEffect(() => {
    if (!autoLoad || !mediaId) return;
    
    const loadSubtitles = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try frontend OpenSubtitles approach first if IMDB ID is available
        if (useFrontendSubtitles && imdbId) {
          console.log('🎬 Loading subtitles via frontend OpenSubtitles API');
          
          // Check if we have cached subtitles first
          const languageCode = preferredLanguage === 'english' ? 'eng' : 
                              preferredLanguage === 'spanish' ? 'spa' : 
                              preferredLanguage === 'portuguese' ? 'por' :
                              preferredLanguage === 'arabic' ? 'ara' :
                              preferredLanguage === 'russian' ? 'rus' :
                              preferredLanguage === 'polish' ? 'pol' :
                              preferredLanguage === 'french' ? 'fre' : 
                              preferredLanguage === 'german' ? 'ger' : 'eng';
          
          let cachedSubtitles = getCachedSubtitles(imdbId, languageCode, season, episode);
          
          if (!cachedSubtitles) {
            console.log('🌐 Fetching fresh subtitles from OpenSubtitles API');
            
            // Fetch multiple languages if requested
            if (preferredLanguages.length > 1) {
              const result = await fetchMultiLanguageSubtitles(imdbId, preferredLanguages, season, episode);
              if (result.success) {
                setSubtitles(result);
                setError(null);
                console.log('✅ Multi-language subtitles loaded:', result.totalCount);
                return;
              }
            } else {
              // Fetch single language
              const result = await fetchSubtitlesFromOpenSubtitles(imdbId, languageCode, season, episode);
              if (result.success) {
                setSubtitles(result);
                setError(null);
                console.log('✅ Single language subtitles loaded:', result.totalCount);
                return;
              }
            }
          } else {
            console.log('✅ Using cached frontend subtitles:', cachedSubtitles.totalCount);
            setSubtitles(cachedSubtitles);
            setError(null);
            return;
          }
        }
        
        // Fallback to vm-server extraction data
        console.log('🔄 Falling back to vm-server extraction data');
        const vmSubtitles = getSubtitlesFromExtraction(cacheKey);
        
        if (vmSubtitles) {
          console.log('✅ Loaded subtitles from vm-server extraction cache:', vmSubtitles);
          
          // Process subtitles to create blob URLs if needed
          const processedSubtitles = {
            ...vmSubtitles,
            subtitles: vmSubtitles.subtitles.map(sub => {
              if (sub.content && !sub.blobUrl) {
                // Create blob URL from content
                sub.blobUrl = createBlobUrl(sub.content);
              }
              return sub;
            })
          };
          
          setSubtitles(processedSubtitles);
          setError(null);
        } else {
          console.log('❌ No subtitles found in any source for:', cacheKey);
          setSubtitles(null);
          setError(imdbId ? 'No subtitles available from OpenSubtitles' : 'No IMDB ID provided - extract stream first or provide IMDB ID');
        }
      } catch (err) {
        console.error('❌ Error loading subtitles:', err);
        setError(err.message || 'Failed to load subtitles');
        setSubtitles(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadSubtitles();
  }, [autoLoad, mediaId, imdbId, season, episode, preferredLanguage, useFrontendSubtitles]); // Include all relevant dependencies

  // Load subtitles function for manual refetch
  const loadSubtitles = useCallback(() => {
    if (!mediaId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const cachedSubtitles = getSubtitlesFromExtraction(cacheKey);
      
      if (cachedSubtitles) {
        console.log('Loaded subtitles from extraction cache:', cachedSubtitles);
        
        // Process subtitles to create blob URLs if needed
        const processedSubtitles = {
          ...cachedSubtitles,
          subtitles: cachedSubtitles.subtitles.map(sub => {
            if (sub.content && !sub.blobUrl) {
              // Create blob URL from content
              sub.blobUrl = createBlobUrl(sub.content);
            }
            return sub;
          })
        };
        
        setSubtitles(processedSubtitles);
        setError(null);
      } else {
        console.log('No subtitles found in extraction cache for:', cacheKey);
        setSubtitles(null);
        setError('No subtitles available - extract stream first');
      }
    } catch (err) {
      console.error('Error loading subtitles:', err);
      setError(err.message || 'Failed to load subtitles');
      setSubtitles(null);
    } finally {
      setLoading(false);
    }
  }, [mediaId, cacheKey]); // Keep minimal dependencies to avoid infinite loops

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return cleanupAllBlobUrls;
  }, []);

  // Check if subtitles are available
  const hasSubtitles = useCallback(() => {
    return hasSubtitleData(mediaId, season, episode);
  }, [hasSubtitleData, mediaId, season, episode]);

  // Get subtitles formatted for video player
  const getVideoPlayerTracks = useCallback(() => {
    return getVideoPlayerSubtitles(mediaId, season, episode);
  }, [getVideoPlayerSubtitles, mediaId, season, episode]);

  // Get the best subtitle for a specific language
  const getSubtitleForLanguage = useCallback((language = preferredLanguage) => {
    const subtitle = getBestSubtitle(mediaId, language, season, episode);
    
    // Ensure blob URL is created if we have content
    if (subtitle && subtitle.content && !subtitle.blobUrl) {
      subtitle.blobUrl = createBlobUrl(subtitle.content);
    }
    
    return subtitle;
  }, [getBestSubtitle, mediaId, preferredLanguage, season, episode, createBlobUrl]);

  // Get all available languages
  const getAvailableLanguages = useCallback(() => {
    if (!subtitles?.subtitles) return [];
    
    return subtitles.subtitles.map(sub => ({
      code: sub.iso639,
      name: sub.languageName,
      language: sub.language,
      hasContent: !!sub.content
    }));
  }, [subtitles]);

  // Check if a specific language is available
  const hasLanguage = useCallback((language) => {
    if (!subtitles?.subtitles) return false;
    
    return subtitles.subtitles.some(sub => 
      sub.language === language || 
      sub.languageName?.toLowerCase() === language.toLowerCase() ||
      sub.iso639 === language
    );
  }, [subtitles]);

  // Helper functions for specific languages
  const hasEnglish = useCallback(() => hasLanguage('english'), [hasLanguage]);
  const hasSpanish = useCallback(() => hasLanguage('spanish'), [hasLanguage]);
  const hasPortuguese = useCallback(() => hasLanguage('portuguese'), [hasLanguage]);
  const hasArabic = useCallback(() => hasLanguage('arabic'), [hasLanguage]);
  const hasRussian = useCallback(() => hasLanguage('russian'), [hasLanguage]);
  const hasPolish = useCallback(() => hasLanguage('polish'), [hasLanguage]);
  const hasFrench = useCallback(() => hasLanguage('french'), [hasLanguage]);
  const hasGerman = useCallback(() => hasLanguage('german'), [hasLanguage]);

  const getEnglishSubtitle = useCallback(() => getSubtitleForLanguage('english'), [getSubtitleForLanguage]);
  const getSpanishSubtitle = useCallback(() => getSubtitleForLanguage('spanish'), [getSubtitleForLanguage]);
  const getPortugueseSubtitle = useCallback(() => getSubtitleForLanguage('portuguese'), [getSubtitleForLanguage]);
  const getArabicSubtitle = useCallback(() => getSubtitleForLanguage('arabic'), [getSubtitleForLanguage]);
  const getRussianSubtitle = useCallback(() => getSubtitleForLanguage('russian'), [getSubtitleForLanguage]);
  const getPolishSubtitle = useCallback(() => getSubtitleForLanguage('polish'), [getSubtitleForLanguage]);
  const getFrenchSubtitle = useCallback(() => getSubtitleForLanguage('french'), [getSubtitleForLanguage]);
  const getGermanSubtitle = useCallback(() => getSubtitleForLanguage('german'), [getSubtitleForLanguage]);

  // Get subtitle statistics from extraction
  const getStats = useCallback(() => {
    return getExtractionStats(mediaId, season, episode);
  }, [getExtractionStats, mediaId, season, episode]);

  // Format subtitle for video player with blob URL
  const formatForVideoPlayer = useCallback((subtitle) => {
    if (!subtitle) return null;
    
    // Ensure we have a blob URL for CORS-free playback
    let srcUrl = subtitle.blobUrl;
    if (!srcUrl && subtitle.content) {
      srcUrl = createBlobUrl(subtitle.content);
      subtitle.blobUrl = srcUrl; // Cache the blob URL
    }
    
    return {
      src: srcUrl || subtitle.downloadLink || subtitle.url,
      label: `${subtitle.languageName}${subtitle.hearingImpaired ? ' (HI)' : ''}`,
      srcLang: subtitle.iso639 || 'en',
      default: subtitle.language === 'english' || subtitle.iso639 === 'en',
      kind: 'subtitles',
      format: subtitle.format || 'vtt',
      quality: subtitle.qualityScore || 85,
      content: subtitle.content,
      metadata: {
        language: subtitle.language,
        isVTT: subtitle.isVTT,
        contentLength: subtitle.contentLength,
        source: 'vm-server',
        trusted: subtitle.fromTrusted,
        extractionSource: true,
        hasContent: !!subtitle.content,
        usedBlobUrl: !!(srcUrl && srcUrl.startsWith('blob:'))
      }
    };
  }, [createBlobUrl]);

  // Process and download a specific subtitle
  const processSubtitle = useCallback(async (subtitle) => {
    try {
      setLoading(true);
      console.log('📥 Processing subtitle:', subtitle.fileName);
      
      const processedSubtitle = await downloadAndProcessSubtitle(subtitle);
      
      // Track the blob URL for cleanup
      setBlobUrls(prev => new Map(prev.set(processedSubtitle.blobUrl, Date.now())));
      
      console.log('✅ Subtitle processed successfully');
      return processedSubtitle;
    } catch (error) {
      console.error('❌ Error processing subtitle:', error);
      setError(error.message || 'Failed to process subtitle');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [downloadAndProcessSubtitle]);

  // Get best subtitle for video player
  const getBestSubtitleForPlayer = useCallback(async (preferredLang = preferredLanguage) => {
    if (!subtitles?.subtitles) return null;
    
    try {
      const languageName = preferredLang === 'english' ? 'English' :
                          preferredLang === 'spanish' ? 'Spanish' :
                          preferredLang === 'portuguese' ? 'Portuguese' :
                          preferredLang === 'arabic' ? 'Arabic' :
                          preferredLang === 'russian' ? 'Russian' :
                          preferredLang === 'polish' ? 'Polish' :
                          preferredLang === 'french' ? 'French' : 
                          preferredLang === 'german' ? 'German' : 'English';
      
      const bestSubtitle = getBestAvailableSubtitle(subtitles.subtitles, languageName);
      
      if (bestSubtitle && !bestSubtitle.processed) {
        // Process the subtitle to get VTT content and blob URL
        return await processSubtitle(bestSubtitle);
      }
      
      return bestSubtitle;
    } catch (error) {
      console.error('❌ Error getting best subtitle:', error);
      return null;
    }
  }, [subtitles, preferredLanguage, getBestAvailableSubtitle, processSubtitle]);

  // Refresh subtitles from OpenSubtitles API
  const refreshFromOpenSubtitles = useCallback(async (forceRefresh = false) => {
    if (!imdbId) {
      setError('No IMDB ID provided for subtitle refresh');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Refreshing subtitles from OpenSubtitles API');
      
      const languageCode = preferredLanguage === 'english' ? 'eng' : 
                          preferredLanguage === 'spanish' ? 'spa' : 
                          preferredLanguage === 'portuguese' ? 'por' :
                          preferredLanguage === 'arabic' ? 'ara' :
                          preferredLanguage === 'russian' ? 'rus' :
                          preferredLanguage === 'polish' ? 'pol' :
                          preferredLanguage === 'french' ? 'fre' : 
                          preferredLanguage === 'german' ? 'ger' : 'eng';
      
      // Check cache unless force refresh
      if (!forceRefresh) {
        const cached = getCachedSubtitles(imdbId, languageCode, season, episode);
        if (cached) {
          console.log('✅ Using cached subtitles (use forceRefresh=true to override)');
          setSubtitles(cached);
          return true;
        }
      }
      
      const result = await fetchSubtitlesFromOpenSubtitles(imdbId, languageCode, season, episode);
      
      if (result.success) {
        setSubtitles(result);
        setError(null);
        console.log('✅ Subtitles refreshed:', result.totalCount, 'found');
        return true;
      } else {
        setError(result.error || 'Failed to fetch subtitles');
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing subtitles:', error);
      setError(error.message || 'Failed to refresh subtitles');
      return false;
    } finally {
      setLoading(false);
    }
  }, [imdbId, preferredLanguage, season, episode, getCachedSubtitles, fetchSubtitlesFromOpenSubtitles]);

  // Get subtitle statistics for display
  const getSubtitleInfo = useCallback(() => {
    if (!subtitles) return null;

    const extractionStats = getStats();
    
    return {
      totalCount: subtitles.totalCount || 0,
      availableLanguages: getAvailableLanguages().length,
      source: subtitles.source || 'unknown',
      extractionTimestamp: subtitles.extractionTimestamp,
      fetchedAt: subtitles.fetchedAt,
      isFromFrontend: subtitles.source?.includes('opensubtitles'),
      isFromVmServer: subtitles.source?.includes('vm-server'),
      extractionStats: extractionStats ? {
        server: extractionStats.server,
        extractionTime: extractionStats.extractionTime,
        streamFound: !!extractionStats.streamUrl
      } : null,
      languages: getAvailableLanguages(),
      blobUrlsCreated: blobUrls.size,
      hasImdbId: !!imdbId,
      errors: subtitles.errors || []
    };
  }, [subtitles, getStats, getAvailableLanguages, blobUrls.size, imdbId]);

  return {
    // State
    subtitles,
    loading,
    error,
    
    // Actions
    refetch: loadSubtitles,
    reload: loadSubtitles,
    
    // New frontend subtitle actions
    processSubtitle,
    getBestSubtitleForPlayer,
    refreshFromOpenSubtitles,
    
    // Data access helpers (legacy + new)
    hasSubtitles,
    getVideoPlayerTracks,
    getSubtitleForLanguage,
    getAvailableLanguages,
    
    // Language checks
    hasLanguage,
    hasEnglish,
    hasSpanish,  
    hasPortuguese,
    hasArabic,
    hasRussian,
    hasPolish,
    hasFrench,
    hasGerman,
    
    // Language-specific getters
    getEnglishSubtitle,
    getSpanishSubtitle,
    getPortugueseSubtitle,
    getArabicSubtitle,
    getRussianSubtitle,
    getPolishSubtitle,
    getFrenchSubtitle,
    getGermanSubtitle,
    
    // Video player integration
    formatForVideoPlayer,
    
    // Blob URL management
    createBlobUrl,
    cleanupBlobUrl,
    cleanupAllBlobUrls,
    
    // Statistics and info
    getStats,
    getSubtitleInfo,
    
    // Configuration info
    useFrontendSubtitles,
    hasImdbId: !!imdbId
  };
};

export default useSubtitles; 