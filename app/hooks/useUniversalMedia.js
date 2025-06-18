'use client'

import { useState, useEffect, useCallback } from 'react';
import { useUniversalMediaContext } from '../context/UniversalMediaContext';

/**
 * Universal media hook for simple, reliable media playback across all devices
 * @param {string} mediaId - TMDB ID for the media
 * @param {object} options - Configuration options
 * @returns {object} Media utilities and state
 */
export const useUniversalMedia = (mediaId, options = {}) => {
  const {
    mediaType = 'movie',
    seasonId = null,
    episodeId = null,
    server = 'Vidsrc.xyz',
    autoLoad = true,
    language = 'en-US'
  } = options;

  const {
    updateMedia,
    getMedia,
    fetchDetailedMedia,
    extractStream,
    getCachedStream,
    loadSubtitles,
    getCachedSubtitles,
    getStats
  } = useUniversalMediaContext();

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [mediaDetails, setMediaDetails] = useState(null);

  // Load media details
  const loadMediaDetails = useCallback(async () => {
    if (!mediaId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🎬 Loading media details:', mediaId, mediaType);

      const details = await fetchDetailedMedia(mediaId, mediaType, language);
      
      if (details) {
        setMediaDetails(details);
        console.log('✅ Media details loaded:', details.title || details.name);
        return details;
      } else {
        throw new Error('Failed to load media details');
      }
    } catch (err) {
      console.error('❌ Failed to load media details:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mediaId, mediaType, language, fetchDetailedMedia]);

  // Extract stream URL
  const loadStream = useCallback(async (forceRefresh = false) => {
    if (!mediaId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🎯 Loading stream:', { mediaId, mediaType, server, seasonId, episodeId });

      // Check cache first unless forced refresh
      if (!forceRefresh) {
        const cached = getCachedStream(mediaId, mediaType, server, seasonId, episodeId);
        if (cached && cached.success) {
          setStreamInfo(cached);
          console.log('✅ Using cached stream');
          return cached;
        }
      }

      const result = await extractStream(mediaId, mediaType, server, seasonId, episodeId);
      
      if (result.success) {
        setStreamInfo(result);
        console.log('✅ Stream loaded successfully');
        return result;
      } else {
        throw new Error(result.error || 'Stream extraction failed');
      }
    } catch (err) {
      console.error('❌ Failed to load stream:', err);
      setError(err.message);
      setStreamInfo(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mediaId, mediaType, server, seasonId, episodeId, extractStream, getCachedStream]);

  // Load subtitles
  const loadSubtitleTracks = useCallback(async (imdbId, languages = ['en']) => {
    if (!imdbId) return;

    try {
      console.log('🎭 Loading subtitles for IMDB:', imdbId);

      const results = await Promise.allSettled(
        languages.map(lang => loadSubtitles(imdbId, lang, seasonId, episodeId))
      );

      const allSubtitles = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          allSubtitles.push(...result.value.subtitles);
        } else {
          console.warn(`⚠️ Failed to load subtitles for language ${languages[index]}:`, result.reason);
        }
      });

      setSubtitles(allSubtitles);
      console.log('✅ Loaded subtitles:', allSubtitles.length, 'tracks');
      return allSubtitles;
    } catch (err) {
      console.error('❌ Failed to load subtitles:', err);
      return [];
    }
  }, [loadSubtitles, seasonId, episodeId]);

  // Initialize everything
  const initialize = useCallback(async () => {
    if (!mediaId) return;

    try {
      setLoading(true);
      setError(null);

      // Load media details first
      const details = await loadMediaDetails();
      
      if (details) {
        // Try to load subtitles if we have IMDB ID
        if (details.imdb_id) {
          loadSubtitleTracks(details.imdb_id, ['en', 'es', 'fr', 'de']);
        }

        // Load stream
        await loadStream();
      }
    } catch (err) {
      console.error('❌ Initialization failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mediaId, loadMediaDetails, loadStream, loadSubtitleTracks]);

  // Auto-initialize when parameters change
  useEffect(() => {
    if (autoLoad && mediaId) {
      initialize();
    }
  }, [autoLoad, mediaId, mediaType, seasonId, episodeId, initialize]);

  // Retry with different server
  const retryWithDifferentServer = useCallback(async () => {
    const newServer = server === 'Vidsrc.xyz' ? 'Embed.su' : 'Vidsrc.xyz';
    console.log('🔄 Retrying with server:', newServer);
    
    // This would need to be handled by the parent component
    // since server is passed as a prop
    return loadStream(true);
  }, [server, loadStream]);

  // Get formatted subtitle tracks for HTML5 video
  const getSubtitleTracks = useCallback(() => {
    return subtitles.map((subtitle, index) => ({
      id: `subtitle_${index}`,
      src: subtitle.url || subtitle.downloadUrl,
      label: subtitle.languageName || subtitle.language || `Subtitle ${index + 1}`,
      srcLang: subtitle.languageCode || subtitle.iso639 || 'en',
      kind: 'subtitles',
      default: index === 0 || subtitle.language === 'english'
    }));
  }, [subtitles]);

  // Check if ready to play
  const isReadyToPlay = useCallback(() => {
    return !!(streamInfo && streamInfo.success && streamInfo.streamUrl && !loading && !error);
  }, [streamInfo, loading, error]);

  // Get current stats
  const getCurrentStats = useCallback(() => {
    const contextStats = getStats();
    return {
      ...contextStats,
      currentStream: streamInfo ? {
        server: streamInfo.server,
        streamType: streamInfo.streamType,
        qualityCount: streamInfo.qualities?.length || 0,
        hasSubtitles: subtitles.length > 0
      } : null,
      isReady: isReadyToPlay()
    };
  }, [getStats, streamInfo, subtitles.length, isReadyToPlay]);

  return {
    // State
    loading,
    error,
    streamInfo,
    subtitles,
    mediaDetails,
    
    // Actions
    initialize,
    loadMediaDetails,
    loadStream,
    loadSubtitleTracks,
    retryWithDifferentServer,
    
    // Helpers
    getSubtitleTracks,
    isReadyToPlay,
    getCurrentStats,
    
    // Computed
    streamUrl: streamInfo?.streamUrl || null,
    streamType: streamInfo?.streamType || 'mp4',
    qualities: streamInfo?.qualities || [],
    hasStream: !!(streamInfo && streamInfo.success),
    hasSubtitles: subtitles.length > 0,
    imdbId: mediaDetails?.imdb_id || null
  };
};

export default useUniversalMedia; 