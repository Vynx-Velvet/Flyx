import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useEpisodeNavigation - Manages TV show episode navigation and metadata
 * 
 * Features:
 * - Episode list management and navigation using real TMDB API
 * - Season and episode metadata from TMDB
 * - Next/previous episode logic
 * - Auto-advance functionality integration
 * - Watch progress tracking
 */
const useEpisodeNavigation = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  onEpisodeChange
} = {}) => {
  // State management
  const [episodeData, setEpisodeData] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  // Cache management
  const getCacheKey = useCallback((id) => `tv_episodes_${id}`, []);
  
  const getCachedData = useCallback((key) => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 60 * 60 * 1000) { // 1 hour cache
          return data.value;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return null;
  }, []);

  const setCachedData = useCallback((key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  }, []);

  // Fetch TV show details and episodes from TMDB API
  const fetchEpisodeData = useCallback(async (showId) => {
    if (!showId || mediaType !== 'tv') return null;

    const cacheKey = getCacheKey(showId);
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      setEpisodeData(cached);
      return cached;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch show details using the existing TMDB API
      const response = await fetch(`/api/tmdb?action=getShowDetails&movieId=${showId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch TV show details: ${response.status}`);
      }
      
      const show = await response.json();
      
      // Fetch detailed episode data for each season
      const seasons = [];
      
      for (const seasonInfo of show.seasons || []) {
        try {
          const seasonResponse = await fetch(`/api/tmdb/tv/${showId}/season/${seasonInfo.season_number}`);
          
          if (seasonResponse.ok) {
            const season = await seasonResponse.json();
              
            seasons.push({
              id: `season_${season.season_number}`,
              number: season.season_number,
              title: season.name,
              episodeCount: season.episodes?.length || 0,
              year: season.air_date ? new Date(season.air_date).getFullYear() : null,
              episodes: (season.episodes || []).map(episode => ({
                id: `ep_${season.season_number}_${episode.episode_number}`,
                number: episode.episode_number,
                title: episode.name,
                description: episode.overview,
                duration: episode.runtime ? episode.runtime * 60 : 2700, // Convert to seconds, default 45min
                airDate: episode.air_date,
                thumbnail: episode.still_path ?
                  `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
                watchProgress: 0, // Will be managed by watch progress system later
                rating: episode.vote_average || 0,
                seasonId: `season_${season.season_number}`,
                seasonNumber: season.season_number,
                tmdbId: episode.id,
                imdbId: episode.external_ids?.imdb_id || null
              }))
            });
          }
        } catch (seasonError) {
          console.warn(`Failed to fetch season ${seasonInfo.season_number}:`, seasonError);
          // Add basic season info even if detailed fetch fails
          seasons.push({
            id: `season_${seasonInfo.season_number}`,
            number: seasonInfo.season_number,
            title: seasonInfo.name,
            episodeCount: seasonInfo.episode_count || 0,
            year: seasonInfo.air_date ? new Date(seasonInfo.air_date).getFullYear() : null,
            episodes: []
          });
        }
      }

      const episodeData = {
        showId: showId,
        showTitle: show.name,
        totalSeasons: show.number_of_seasons,
        totalEpisodes: show.number_of_episodes,
        seasons: seasons.sort((a, b) => a.number - b.number)
      };

      setEpisodeData(episodeData);
      setCachedData(cacheKey, episodeData);
      setLastFetch(Date.now());
      
      return episodeData;
    } catch (err) {
      console.error('Failed to fetch episode data:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mediaType, getCacheKey, getCachedData, setCachedData]);

  // Convert season/episode IDs to find current episode
  const parseIds = useCallback((sId, eId) => {
    if (!sId || !eId) return { seasonNumber: null, episodeNumber: null };
    
    // Parse season ID (format: "season_1" or just "1")
    const seasonNumber = typeof sId === 'string' ? 
      (sId.startsWith('season_') ? parseInt(sId.replace('season_', '')) : parseInt(sId)) :
      parseInt(sId);
    
    // Parse episode ID (format: "ep_1_1" or just "1")
    const episodeNumber = typeof eId === 'string' ? 
      (eId.includes('_') ? parseInt(eId.split('_').pop()) : parseInt(eId)) :
      parseInt(eId);
      
    return { seasonNumber, episodeNumber };
  }, []);

  // Find current episode
  const findCurrentEpisode = useCallback((sId, eId) => {
    if (!episodeData || !sId || !eId) return null;

    const { seasonNumber, episodeNumber } = parseIds(sId, eId);
    if (!seasonNumber || !episodeNumber) return null;

    const season = episodeData.seasons.find(s => s.number === seasonNumber);
    if (!season) return null;

    const episode = season.episodes.find(e => e.number === episodeNumber);
    return episode || null;
  }, [episodeData, parseIds]);

  // Navigation functions
  const getNextEpisode = useCallback(() => {
    if (!episodeData || !seasonId || !episodeId) return null;

    const { seasonNumber, episodeNumber } = parseIds(seasonId, episodeId);
    if (!seasonNumber || !episodeNumber) return null;

    const season = episodeData.seasons.find(s => s.number === seasonNumber);
    if (!season) return null;

    const currentIndex = season.episodes.findIndex(e => e.number === episodeNumber);
    if (currentIndex === -1) return null;

    // Check for next episode in current season
    if (currentIndex < season.episodes.length - 1) {
      return {
        episode: season.episodes[currentIndex + 1],
        season: season
      };
    }

    // Check for first episode of next season
    const seasonIndex = episodeData.seasons.findIndex(s => s.number === seasonNumber);
    if (seasonIndex < episodeData.seasons.length - 1) {
      const nextSeason = episodeData.seasons[seasonIndex + 1];
      if (nextSeason.episodes.length > 0) {
        return {
          episode: nextSeason.episodes[0],
          season: nextSeason
        };
      }
    }

    return null; // No next episode
  }, [episodeData, seasonId, episodeId, parseIds]);

  const getPreviousEpisode = useCallback(() => {
    if (!episodeData || !seasonId || !episodeId) return null;

    const { seasonNumber, episodeNumber } = parseIds(seasonId, episodeId);
    if (!seasonNumber || !episodeNumber) return null;

    const season = episodeData.seasons.find(s => s.number === seasonNumber);
    if (!season) return null;

    const currentIndex = season.episodes.findIndex(e => e.number === episodeNumber);
    if (currentIndex === -1) return null;

    // Check for previous episode in current season
    if (currentIndex > 0) {
      return {
        episode: season.episodes[currentIndex - 1],
        season: season
      };
    }

    // Check for last episode of previous season
    const seasonIndex = episodeData.seasons.findIndex(s => s.number === seasonNumber);
    if (seasonIndex > 0) {
      const prevSeason = episodeData.seasons[seasonIndex - 1];
      if (prevSeason.episodes.length > 0) {
        return {
          episode: prevSeason.episodes[prevSeason.episodes.length - 1],
          season: prevSeason
        };
      }
    }

    return null; // No previous episode
  }, [episodeData, seasonId, episodeId, parseIds]);

  const getCurrentEpisode = useCallback(() => {
    return findCurrentEpisode(seasonId, episodeId);
  }, [findCurrentEpisode, seasonId, episodeId]);

  // Navigation actions
  const goToNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (next && onEpisodeChange) {
      onEpisodeChange(next.season.id, next.episode.id);
    }
  }, [getNextEpisode, onEpisodeChange]);

  const goToPreviousEpisode = useCallback(() => {
    const prev = getPreviousEpisode();
    if (prev && onEpisodeChange) {
      onEpisodeChange(prev.season.id, prev.episode.id);
    }
  }, [getPreviousEpisode, onEpisodeChange]);

  const goToEpisode = useCallback((sId, eId) => {
    if (onEpisodeChange) {
      onEpisodeChange(sId, eId);
    }
  }, [onEpisodeChange]);

  // Convenience properties
  const hasNextEpisode = useMemo(() => {
    return getNextEpisode() !== null;
  }, [getNextEpisode]);

  const hasPreviousEpisode = useMemo(() => {
    return getPreviousEpisode() !== null;
  }, [getPreviousEpisode]);

  // Get episode list for current season
  const getCurrentSeasonEpisodes = useCallback(() => {
    if (!episodeData || !seasonId) return [];

    const { seasonNumber } = parseIds(seasonId, null);
    if (!seasonNumber) return [];

    const season = episodeData.seasons.find(s => s.number === seasonNumber);
    return season ? season.episodes : [];
  }, [episodeData, seasonId, parseIds]);

  // Get all seasons
  const getAllSeasons = useCallback(() => {
    return episodeData ? episodeData.seasons : [];
  }, [episodeData]);

  // Get episode by season and episode number
  const getEpisodeByNumber = useCallback((seasonNumber, episodeNumber) => {
    if (!episodeData) return null;

    const season = episodeData.seasons.find(s => s.number === seasonNumber);
    if (!season) return null;

    return season.episodes.find(e => e.number === episodeNumber) || null;
  }, [episodeData]);

  // Update watch progress (placeholder - would integrate with backend later)
  const updateWatchProgress = useCallback((sId, eId, progress) => {
    if (!episodeData) return;

    // Find and update the episode progress
    const { seasonNumber, episodeNumber } = parseIds(sId, eId);
    if (!seasonNumber || !episodeNumber) return;

    const season = episodeData.seasons.find(s => s.number === seasonNumber);
    if (season) {
      const episode = season.episodes.find(e => e.number === episodeNumber);
      if (episode) {
        episode.watchProgress = Math.max(0, Math.min(1, progress));
        // In a real app, this would also update the backend
        console.log(`Updated watch progress for S${seasonNumber}E${episodeNumber}: ${Math.round(progress * 100)}%`);
      }
    }
  }, [episodeData, parseIds]);

  // Get show statistics
  const getShowStats = useCallback(() => {
    if (!episodeData) return null;

    const totalEpisodes = episodeData.totalEpisodes || episodeData.seasons.reduce((sum, season) => sum + season.episodeCount, 0);
    const watchedEpisodes = episodeData.seasons.reduce((sum, season) => {
      return sum + season.episodes.filter(ep => ep.watchProgress >= 0.9).length;
    }, 0);
    
    const totalDuration = episodeData.seasons.reduce((sum, season) => {
      return sum + season.episodes.reduce((epSum, ep) => epSum + (ep.duration || 2700), 0);
    }, 0);

    const watchedDuration = episodeData.seasons.reduce((sum, season) => {
      return sum + season.episodes.reduce((epSum, ep) => epSum + ((ep.duration || 2700) * ep.watchProgress), 0);
    }, 0);

    const avgRating = episodeData.seasons.reduce((sum, season) => {
      return sum + season.episodes.reduce((epSum, ep) => epSum + (ep.rating || 0), 0);
    }, 0) / Math.max(1, totalEpisodes);

    return {
      totalSeasons: episodeData.totalSeasons || episodeData.seasons.length,
      totalEpisodes,
      watchedEpisodes,
      totalDuration,
      watchedDuration,
      completionRate: totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) : 0,
      averageRating: avgRating
    };
  }, [episodeData]);

  // Initialize episode data
  useEffect(() => {
    if (mediaType === 'tv' && movieId) {
      fetchEpisodeData(movieId);
    } else {
      setEpisodeData(null);
      setCurrentEpisode(null);
    }
  }, [mediaType, movieId, fetchEpisodeData]);

  // Update current episode when navigation changes
  useEffect(() => {
    if (episodeData) {
      setCurrentEpisode(findCurrentEpisode(seasonId, episodeId));
    }
  }, [episodeData, seasonId, episodeId, findCurrentEpisode]);

  return {
    // Data
    episodeData,
    currentEpisode,
    loading,
    error,

    // Navigation state
    hasNextEpisode,
    hasPreviousEpisode,

    // Navigation actions
    goToNextEpisode,
    goToPreviousEpisode,
    goToEpisode,

    // Getters
    getCurrentEpisode,
    getNextEpisode,
    getPreviousEpisode,
    getCurrentSeasonEpisodes,
    getAllSeasons,
    getEpisodeByNumber,
    getShowStats,

    // Actions
    updateWatchProgress,

    // Utilities
    isLastEpisode: !hasNextEpisode,
    isFirstEpisode: !hasPreviousEpisode,
    currentSeasonNumber: currentEpisode?.seasonNumber,
    currentEpisodeNumber: currentEpisode?.number
  };
};

export default useEpisodeNavigation;