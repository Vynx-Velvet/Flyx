'use client'

import React, { createContext, useContext, useState, useCallback } from "react";

const UniversalMediaContext = createContext();

export const useUniversalMediaContext = () => {
  const context = useContext(UniversalMediaContext);
  if (!context) {
    throw new Error('useUniversalMediaContext must be used within a UniversalMediaProvider');
  }
  return context;
};

export const UniversalMediaProvider = ({ children }) => {
  // Core media state
  const [currentMedia, setCurrentMedia] = useState(null);
  const [streamData, setStreamData] = useState({});
  const [subtitleCache, setSubtitleCache] = useState({});
  
  // Update current media
  const updateMedia = useCallback((media) => {
    console.log('📺 Media updated:', media?.title || media?.name);
    setCurrentMedia(media);
  }, []);

  // Get current media
  const getMedia = useCallback(() => {
    return currentMedia;
  }, [currentMedia]);

  // Fetch detailed media info with IMDB ID
  const fetchDetailedMedia = useCallback(async (mediaId, type = 'movie', language = 'en-US') => {
    try {
      console.log('🎬 Fetching detailed media:', mediaId, type);

      const response = await fetch(`/api/tmdb?action=getDetailedMedia&movieId=${mediaId}&type=${type}&language=${language}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const mediaData = await response.json();

      if (mediaData) {
        console.log('✅ Media data fetched:', mediaData.title || mediaData.name);
        updateMedia(mediaData);
        return mediaData;
      } else {
        console.warn('⚠️ No media data received');
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching detailed media:', error);
      return null;
    }
  }, [updateMedia]);

  // Simple stream extraction
  const extractStream = useCallback(async (mediaId, mediaType, server = 'vidsrc.xyz', seasonId = null, episodeId = null) => {
    try {
      const cacheKey = `${mediaId}_${mediaType}_${seasonId || 'movie'}_${episodeId || '0'}_${server}`;
      
      // Check cache first
      const cached = streamData[cacheKey];
      if (cached && cached.timestamp > Date.now() - 30 * 60 * 1000) { // 30 min cache
        console.log('✅ Using cached stream data');
        return cached;
      }

      console.log('🔄 Extracting stream:', { mediaId, mediaType, server, seasonId, episodeId });

      const params = new URLSearchParams({
        mediaType,
        movieId: mediaId.toString(),
        server: server === "Vidsrc.xyz" ? "vidsrc.xyz" : "embed.su"
      });

      if (mediaType === 'tv') {
        params.append('seasonId', seasonId.toString());
        params.append('episodeId', episodeId.toString());
      }

      const response = await fetch(`/api/extract-stream?${params}`);
      
      if (!response.ok) {
        throw new Error(`Stream extraction failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.streamUrl) {
        const streamInfo = {
          success: true,
          streamUrl: data.streamUrl,
          streamType: data.streamType || 'mp4',
          qualities: data.qualities || [],
          subtitles: data.subtitles || [],
          server: server,
          timestamp: Date.now(),
          cacheKey
        };

        // Cache the result
        setStreamData(prev => ({
          ...prev,
          [cacheKey]: streamInfo
        }));

        console.log('✅ Stream extracted successfully');
        return streamInfo;
      } else {
        throw new Error(data.error || 'Failed to extract stream');
      }
    } catch (error) {
      console.error('❌ Stream extraction failed:', error);
      return {
        success: false,
        error: error.message,
        streamUrl: null,
        timestamp: Date.now()
      };
    }
  }, [streamData]);

  // Simple subtitle management
  const loadSubtitles = useCallback(async (imdbId, language = 'en', season = null, episode = null) => {
    try {
      const cacheKey = `${imdbId}_${language}_${season || 'movie'}_${episode || '0'}`;
      
      // Check cache first
      const cached = subtitleCache[cacheKey];
      if (cached && cached.timestamp > Date.now() - 60 * 60 * 1000) { // 1 hour cache
        console.log('✅ Using cached subtitles');
        return cached;
      }

      console.log('🔄 Loading subtitles:', { imdbId, language, season, episode });

      // Try OpenSubtitles API
      const response = await fetch('/api/subtitles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imdbId,
          language,
          season,
          episode
        })
      });

      if (!response.ok) {
        throw new Error(`Subtitle fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.subtitles) {
        const subtitleInfo = {
          success: true,
          subtitles: data.subtitles,
          language: language,
          timestamp: Date.now(),
          cacheKey
        };

        // Cache the result
        setSubtitleCache(prev => ({
          ...prev,
          [cacheKey]: subtitleInfo
        }));

        console.log('✅ Subtitles loaded:', data.subtitles.length, 'tracks');
        return subtitleInfo;
      } else {
        throw new Error(data.error || 'No subtitles found');
      }
    } catch (error) {
      console.error('❌ Subtitle loading failed:', error);
      return {
        success: false,
        error: error.message,
        subtitles: [],
        timestamp: Date.now()
      };
    }
  }, [subtitleCache]);

  // Get cached stream data
  const getCachedStream = useCallback((mediaId, mediaType, server, seasonId = null, episodeId = null) => {
    const cacheKey = `${mediaId}_${mediaType}_${seasonId || 'movie'}_${episodeId || '0'}_${server}`;
    const cached = streamData[cacheKey];
    
    if (cached && cached.timestamp > Date.now() - 30 * 60 * 1000) {
      return cached;
    }
    
    return null;
  }, [streamData]);

  // Get cached subtitles
  const getCachedSubtitles = useCallback((imdbId, language, season = null, episode = null) => {
    const cacheKey = `${imdbId}_${language}_${season || 'movie'}_${episode || '0'}`;
    const cached = subtitleCache[cacheKey];
    
    if (cached && cached.timestamp > Date.now() - 60 * 60 * 1000) {
      return cached;
    }
    
    return null;
  }, [subtitleCache]);

  // Clear cache (useful for memory management)
  const clearCache = useCallback(() => {
    console.log('🧹 Clearing media cache');
    setStreamData({});
    setSubtitleCache({});
  }, []);

  // Clear old cache entries (keep only recent ones)
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const streamCutoff = now - 30 * 60 * 1000; // 30 minutes for streams
    const subtitleCutoff = now - 60 * 60 * 1000; // 1 hour for subtitles

    setStreamData(prev => {
      const cleaned = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (value.timestamp > streamCutoff) {
          cleaned[key] = value;
        }
      });
      return cleaned;
    });

    setSubtitleCache(prev => {
      const cleaned = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (value.timestamp > subtitleCutoff) {
          cleaned[key] = value;
        }
      });
      return cleaned;
    });

    console.log('🧹 Cache cleanup completed');
  }, []);

  // Auto cleanup cache periodically
  React.useEffect(() => {
    const interval = setInterval(cleanupCache, 15 * 60 * 1000); // Every 15 minutes
    return () => clearInterval(interval);
  }, [cleanupCache]);

  // Get media statistics for debugging
  const getStats = useCallback(() => {
    return {
      currentMedia: currentMedia ? {
        id: currentMedia.id,
        title: currentMedia.title || currentMedia.name,
        type: currentMedia.media_type || 'unknown',
        imdbId: currentMedia.imdb_id
      } : null,
      cachedStreams: Object.keys(streamData).length,
      cachedSubtitles: Object.keys(subtitleCache).length,
      cacheSize: {
        streams: JSON.stringify(streamData).length,
        subtitles: JSON.stringify(subtitleCache).length
      }
    };
  }, [currentMedia, streamData, subtitleCache]);

  const contextValue = {
    // Core media functions
    updateMedia,
    getMedia,
    fetchDetailedMedia,
    
    // Stream functions
    extractStream,
    getCachedStream,
    
    // Subtitle functions
    loadSubtitles,
    getCachedSubtitles,
    
    // Cache management
    clearCache,
    cleanupCache,
    
    // Debugging
    getStats,
    
    // State (read-only)
    currentMedia,
    streamCache: streamData,
    subtitleCache: subtitleCache
  };

  return (
    <UniversalMediaContext.Provider value={contextValue}>
      {children}
    </UniversalMediaContext.Provider>
  );
};

export default UniversalMediaProvider; 