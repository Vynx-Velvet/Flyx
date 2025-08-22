import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useEpisodeNavigation - Manages TV show episode navigation and metadata
 * 
 * Features:
 * - Episode list management and navigation
 * - Season and episode metadata
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

  // Mock episode data - in a real app this would come from an API
  const mockEpisodeData = useMemo(() => {
    if (mediaType !== 'tv' || !movieId) return null;

    return {
      showId: movieId,
      showTitle: 'Demo TV Show',
      seasons: [
        {
          id: 'season_01',
          number: 1,
          title: 'Season 1',
          episodeCount: 10,
          year: 2024,
          episodes: Array.from({ length: 10 }, (_, i) => ({
            id: `ep_${String(i + 1).padStart(2, '0')}`,
            number: i + 1,
            title: `Episode ${i + 1}: ${['Pilot', 'Rising Action', 'The Discovery', 'Complications', 'Midpoint', 'Crisis', 'The Climax', 'Falling Action', 'Resolution', 'New Beginnings'][i]}`,
            description: `Episode ${i + 1} description - A pivotal moment in the series development.`,
            duration: 2700 + Math.random() * 600, // 45-55 minutes
            airDate: new Date(2024, 0, (i + 1) * 7).toISOString(),
            thumbnail: null,
            watchProgress: Math.random() > 0.7 ? Math.random() : 0, // Some episodes watched
            rating: 7.5 + Math.random() * 2.5, // 7.5-10 rating
            seasonId: 'season_01',
            seasonNumber: 1
          }))
        },
        {
          id: 'season_02',
          number: 2,
          title: 'Season 2',
          episodeCount: 8,
          year: 2024,
          episodes: Array.from({ length: 8 }, (_, i) => ({
            id: `ep_s2_${String(i + 1).padStart(2, '0')}`,
            number: i + 1,
            title: `Season 2 Episode ${i + 1}: ${['Return', 'Revelations', 'Alliances', 'Betrayal', 'Consequences', 'Redemption', 'The Final Hour', 'Finale'][i]}`,
            description: `Season 2 Episode ${i + 1} description - The story continues with higher stakes.`,
            duration: 2800 + Math.random() * 400, // 46-53 minutes
            airDate: new Date(2024, 6, (i + 1) * 7).toISOString(),
            thumbnail: null,
            watchProgress: 0, // Season 2 not watched yet
            rating: 8.0 + Math.random() * 2.0,
            seasonId: 'season_02',
            seasonNumber: 2
          }))
        }
      ]
    };
  }, [mediaType, movieId]);

  // Find current episode
  const findCurrentEpisode = useCallback((sId, eId) => {
    if (!mockEpisodeData || !sId || !eId) return null;

    const season = mockEpisodeData.seasons.find(s => s.id === sId);
    if (!season) return null;

    const episode = season.episodes.find(e => e.id === eId);
    return episode || null;
  }, [mockEpisodeData]);

  // Navigation functions
  const getNextEpisode = useCallback(() => {
    if (!mockEpisodeData || !seasonId || !episodeId) return null;

    const season = mockEpisodeData.seasons.find(s => s.id === seasonId);
    if (!season) return null;

    const currentIndex = season.episodes.findIndex(e => e.id === episodeId);
    if (currentIndex === -1) return null;

    // Check for next episode in current season
    if (currentIndex < season.episodes.length - 1) {
      return {
        episode: season.episodes[currentIndex + 1],
        season: season
      };
    }

    // Check for first episode of next season
    const seasonIndex = mockEpisodeData.seasons.findIndex(s => s.id === seasonId);
    if (seasonIndex < mockEpisodeData.seasons.length - 1) {
      const nextSeason = mockEpisodeData.seasons[seasonIndex + 1];
      return {
        episode: nextSeason.episodes[0],
        season: nextSeason
      };
    }

    return null; // No next episode
  }, [mockEpisodeData, seasonId, episodeId]);

  const getPreviousEpisode = useCallback(() => {
    if (!mockEpisodeData || !seasonId || !episodeId) return null;

    const season = mockEpisodeData.seasons.find(s => s.id === seasonId);
    if (!season) return null;

    const currentIndex = season.episodes.findIndex(e => e.id === episodeId);
    if (currentIndex === -1) return null;

    // Check for previous episode in current season
    if (currentIndex > 0) {
      return {
        episode: season.episodes[currentIndex - 1],
        season: season
      };
    }

    // Check for last episode of previous season
    const seasonIndex = mockEpisodeData.seasons.findIndex(s => s.id === seasonId);
    if (seasonIndex > 0) {
      const prevSeason = mockEpisodeData.seasons[seasonIndex - 1];
      return {
        episode: prevSeason.episodes[prevSeason.episodes.length - 1],
        season: prevSeason
      };
    }

    return null; // No previous episode
  }, [mockEpisodeData, seasonId, episodeId]);

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
    if (!mockEpisodeData || !seasonId) return [];

    const season = mockEpisodeData.seasons.find(s => s.id === seasonId);
    return season ? season.episodes : [];
  }, [mockEpisodeData, seasonId]);

  // Get all seasons
  const getAllSeasons = useCallback(() => {
    return mockEpisodeData ? mockEpisodeData.seasons : [];
  }, [mockEpisodeData]);

  // Get episode by season and episode number
  const getEpisodeByNumber = useCallback((seasonNumber, episodeNumber) => {
    if (!mockEpisodeData) return null;

    const season = mockEpisodeData.seasons.find(s => s.number === seasonNumber);
    if (!season) return null;

    return season.episodes.find(e => e.number === episodeNumber) || null;
  }, [mockEpisodeData]);

  // Update watch progress
  const updateWatchProgress = useCallback((sId, eId, progress) => {
    if (!mockEpisodeData) return;

    // In a real app, this would update the backend
    const season = mockEpisodeData.seasons.find(s => s.id === sId);
    if (season) {
      const episode = season.episodes.find(e => e.id === eId);
      if (episode) {
        episode.watchProgress = Math.max(0, Math.min(1, progress));
      }
    }
  }, [mockEpisodeData]);

  // Get show statistics
  const getShowStats = useCallback(() => {
    if (!mockEpisodeData) return null;

    const totalEpisodes = mockEpisodeData.seasons.reduce((sum, season) => sum + season.episodeCount, 0);
    const watchedEpisodes = mockEpisodeData.seasons.reduce((sum, season) => {
      return sum + season.episodes.filter(ep => ep.watchProgress >= 0.9).length;
    }, 0);
    
    const totalDuration = mockEpisodeData.seasons.reduce((sum, season) => {
      return sum + season.episodes.reduce((epSum, ep) => epSum + ep.duration, 0);
    }, 0);

    const watchedDuration = mockEpisodeData.seasons.reduce((sum, season) => {
      return sum + season.episodes.reduce((epSum, ep) => epSum + (ep.duration * ep.watchProgress), 0);
    }, 0);

    return {
      totalSeasons: mockEpisodeData.seasons.length,
      totalEpisodes,
      watchedEpisodes,
      totalDuration,
      watchedDuration,
      completionRate: totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) : 0,
      averageRating: mockEpisodeData.seasons.reduce((sum, season) => {
        return sum + season.episodes.reduce((epSum, ep) => epSum + ep.rating, 0);
      }, 0) / totalEpisodes
    };
  }, [mockEpisodeData]);

  // Initialize episode data
  useEffect(() => {
    if (mediaType === 'tv' && movieId) {
      setLoading(true);
      setError(null);
      
      // Simulate async loading
      setTimeout(() => {
        setEpisodeData(mockEpisodeData);
        setCurrentEpisode(findCurrentEpisode(seasonId, episodeId));
        setLoading(false);
      }, 100);
    } else {
      setEpisodeData(null);
      setCurrentEpisode(null);
    }
  }, [mediaType, movieId, mockEpisodeData, findCurrentEpisode, seasonId, episodeId]);

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