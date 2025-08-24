import { useState, useEffect, useCallback } from 'react';

/**
 * useFetchMediaDetails - Fetches and manages media metadata from TMDB API
 * 
 * Features:
 * - Fetches media details from TMDB API
 * - Scene detection and content analysis (placeholder for future implementation)
 * - Caching and error handling
 * - Real-time updates
 */
const useFetchMediaDetails = (movieId, mediaType, options = {}) => {
  const {
    enableSceneDetection = false,
    enableContentAnalysis = false,
    cacheEnabled = true,
    refreshInterval = 0
  } = options;

  // State management
  const [details, setDetails] = useState(null);
  const [sceneData, setSceneData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  // Cache management
  const getCacheKey = useCallback((id, type) => `media_${type}_${id}`, []);
  
  const getCachedData = useCallback((key) => {
    if (!cacheEnabled) return null;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 30 * 60 * 1000) { // 30 minutes cache
          return data.value;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return null;
  }, [cacheEnabled]);

  const setCachedData = useCallback((key, value) => {
    if (!cacheEnabled) return;
    try {
      localStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  }, [cacheEnabled]);

  // Fetch media details from TMDB API
  const fetchDetails = useCallback(async (id, type) => {
    if (!id || !type) return null;

    const cacheKey = getCacheKey(id, type);
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      setDetails(cached);
      return cached;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🎬 Fetching ${type} details for ID: ${id}`);
      
      // Use the existing TMDB API with action parameters
      const action = type === 'tv' ? 'getShowDetails' : 'getMovieDetails';
      const endpoint = `/api/tmdb?action=${action}&movieId=${id}`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} details: ${response.status} ${response.statusText}`);
      }
      
      const apiResponse = await response.json();
      
      // The existing API returns data directly, not wrapped in success/data structure
      const data = apiResponse;
      
      // Normalize the data structure for both movies and TV shows
      const normalizedDetails = {
        id: data.id,
        tmdb_id: data.id,
        imdb_id: data.imdb_id || data.external_ids?.imdb_id || null,
        title: data.title || data.name,
        originalTitle: data.original_title || data.original_name,
        description: data.overview,
        tagline: data.tagline,
        
        // Media type specific fields
        ...(type === 'movie' ? {
          duration: data.runtime ? data.runtime * 60 : 7200, // Convert to seconds, default 2 hours
          releaseDate: data.release_date,
          year: data.release_date ? new Date(data.release_date).getFullYear() : null
        } : {
          duration: data.episode_run_time?.[0] ? data.episode_run_time[0] * 60 : 2700, // Convert to seconds, default 45min
          firstAirDate: data.first_air_date,
          lastAirDate: data.last_air_date,
          year: data.first_air_date ? new Date(data.first_air_date).getFullYear() : null,
          totalSeasons: data.number_of_seasons,
          totalEpisodes: data.number_of_episodes,
          inProduction: data.in_production,
          status: data.status,
          seasons: data.seasons
        }),
        
        // Common fields
        genres: (data.genres || []).map(g => g.name),
        genre: (data.genres || [])[0]?.name || 'Unknown',
        rating: data.vote_average || 0,
        voteCount: data.vote_count || 0,
        popularity: data.popularity || 0,
        
        // Images
        poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
        
        // Cast and crew (from credits if available)
        cast: (data.credits?.cast || []).slice(0, 10).map(person => ({
          name: person.name,
          character: person.character,
          profile_path: person.profile_path,
          order: person.order
        })),
        crew: (data.credits?.crew || []).filter(person => 
          ['Director', 'Producer', 'Executive Producer', 'Writer', 'Screenplay'].includes(person.job)
        ).slice(0, 10).map(person => ({
          name: person.name,
          job: person.job,
          profile_path: person.profile_path
        })),
        
        // Language and country info
        languages: data.spoken_languages?.map(lang => lang.iso_639_1) || ['en'],
        originalLanguage: data.original_language,
        productionCountries: data.production_countries?.map(country => country.iso_3166_1) || [],
        
        // Additional metadata
        adult: data.adult || false,
        homepage: data.homepage,
        
        // Available subtitle languages (placeholder - would be populated by subtitle system)
        subtitles: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'ja', 'ko', 'zh'],
        
        // Content chapters (placeholder for future implementation)
        chapters: generateChapters(type, data.runtime || (data.episode_run_time?.[0]) || (type === 'movie' ? 120 : 45))
      };

      console.log(`✅ Successfully fetched ${type} details:`, {
        title: normalizedDetails.title,
        year: normalizedDetails.year,
        rating: normalizedDetails.rating,
        genres: normalizedDetails.genres
      });

      setDetails(normalizedDetails);
      setCachedData(cacheKey, normalizedDetails);
      setLastFetch(Date.now());
      
      return normalizedDetails;
    } catch (err) {
      console.error(`Failed to fetch ${type} details:`, err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getCacheKey, getCachedData, setCachedData]);

  // Generate placeholder chapters based on runtime
  const generateChapters = useCallback((type, runtimeMinutes) => {
    if (!runtimeMinutes) return [];
    
    const totalSeconds = runtimeMinutes * 60;
    
    if (type === 'movie') {
      // Movie chapters - typically 3-act structure
      if (totalSeconds < 3600) { // Less than 1 hour
        return [
          { time: 0, title: 'Opening' },
          { time: Math.floor(totalSeconds * 0.25), title: 'Development' },
          { time: Math.floor(totalSeconds * 0.75), title: 'Resolution' },
          { time: Math.floor(totalSeconds * 0.95), title: 'Credits' }
        ];
      } else {
        // Longer movie
        return [
          { time: 0, title: 'Opening' },
          { time: Math.floor(totalSeconds * 0.15), title: 'Act 1' },
          { time: Math.floor(totalSeconds * 0.35), title: 'Act 2A' },
          { time: Math.floor(totalSeconds * 0.6), title: 'Act 2B' },
          { time: Math.floor(totalSeconds * 0.8), title: 'Act 3' },
          { time: Math.floor(totalSeconds * 0.95), title: 'Credits' }
        ];
      }
    } else {
      // TV episode chapters
      return [
        { time: 0, title: 'Cold Open' },
        { time: Math.floor(totalSeconds * 0.1), title: 'Main Story' },
        { time: Math.floor(totalSeconds * 0.85), title: 'Resolution' },
        { time: Math.floor(totalSeconds * 0.95), title: 'Credits' }
      ];
    }
  }, []);

  // Scene detection (placeholder for future AI implementation)
  const performSceneDetection = useCallback(async (mediaDetails) => {
    if (!enableSceneDetection || !mediaDetails) return null;

    try {
      console.log('🎭 Performing scene detection for:', mediaDetails.title);
      
      // Placeholder scene detection based on content analysis
      // In a real implementation, this would use AI/ML services
      const sceneCount = Math.ceil(mediaDetails.duration / 600); // One scene per ~10 minutes
      const mockScenes = [];
      
      for (let i = 0; i < sceneCount; i++) {
        const startTime = (mediaDetails.duration / sceneCount) * i;
        const endTime = Math.min((mediaDetails.duration / sceneCount) * (i + 1), mediaDetails.duration);
        
        // Generate scene type based on position in content
        const progress = i / (sceneCount - 1);
        let sceneType, mood, activity;
        
        if (progress < 0.25) {
          sceneType = 'introduction';
          mood = 'calm';
          activity = 'low';
        } else if (progress < 0.5) {
          sceneType = 'development';
          mood = 'building';
          activity = 'medium';
        } else if (progress < 0.75) {
          sceneType = 'conflict';
          mood = 'intense';
          activity = 'high';
        } else {
          sceneType = 'resolution';
          mood = 'triumphant';
          activity = 'medium';
        }

        mockScenes.push({
          id: `scene_${i + 1}`,
          startTime: Math.floor(startTime),
          endTime: Math.floor(endTime),
          type: sceneType,
          description: `Scene ${i + 1}: ${sceneType} sequence`,
          thumbnail: null, // Would be generated from video frames
          dominantColors: generateSceneColors(mood),
          mood,
          activity
        });
      }

      const sceneAnalysis = {
        scenes: mockScenes,
        totalScenes: mockScenes.length,
        averageSceneLength: mediaDetails.duration / mockScenes.length,
        dominantMoods: [...new Set(mockScenes.map(s => s.mood))],
        colorProfile: {
          primary: '#2563eb',
          secondary: '#dc2626', 
          accent: '#059669'
        },
        activityLevel: 'varied',
        contentRating: mediaDetails.adult ? 'R' : 'PG-13',
        analysisVersion: '1.0.0',
        analysisDate: new Date().toISOString()
      };

      console.log(`✅ Scene detection completed: ${mockScenes.length} scenes`);
      setSceneData(sceneAnalysis);
      return sceneAnalysis;
    } catch (err) {
      console.error('Scene detection failed:', err);
      return null;
    }
  }, [enableSceneDetection]);

  // Generate scene colors based on mood
  const generateSceneColors = useCallback((mood) => {
    const colorMap = {
      calm: ['#2563eb', '#1e40af', '#1e3a8a'],
      building: ['#7c3aed', '#6d28d9', '#5b21b6'],
      intense: ['#dc2626', '#b91c1c', '#991b1b'],
      triumphant: ['#059669', '#047857', '#065f46'],
      emotional: ['#d97706', '#b45309', '#92400e']
    };
    return colorMap[mood] || colorMap.calm;
  }, []);

  // Main fetch effect
  useEffect(() => {
    const shouldFetch = movieId && mediaType && (
      !details || 
      details.id !== movieId ||
      (refreshInterval > 0 && Date.now() - lastFetch > refreshInterval)
    );

    if (shouldFetch) {
      fetchDetails(movieId, mediaType).then(fetchedDetails => {
        if (fetchedDetails && enableSceneDetection) {
          performSceneDetection(fetchedDetails);
        }
      });
    }
  }, [movieId, mediaType, details, fetchDetails, performSceneDetection, enableSceneDetection, refreshInterval, lastFetch]);

  // Refresh function
  const refresh = useCallback(() => {
    if (movieId && mediaType) {
      return fetchDetails(movieId, mediaType).then(fetchedDetails => {
        if (fetchedDetails && enableSceneDetection) {
          return performSceneDetection(fetchedDetails);
        }
        return fetchedDetails;
      });
    }
    return Promise.resolve(null);
  }, [movieId, mediaType, fetchDetails, performSceneDetection, enableSceneDetection]);

  // Clear cache
  const clearCache = useCallback(() => {
    if (movieId && mediaType) {
      const cacheKey = getCacheKey(movieId, mediaType);
      try {
        localStorage.removeItem(cacheKey);
      } catch (e) {
        console.warn('Cache clear error:', e);
      }
    }
  }, [movieId, mediaType, getCacheKey]);

  return {
    details,
    sceneData,
    loading,
    error,
    refresh,
    clearCache,
    lastFetch
  };
};

export default useFetchMediaDetails;