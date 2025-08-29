import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useEpisodeNavigation - Refactored to work with provided episode data
 * 
 * Key Changes:
 * - NO MORE DATA FETCHING - receives data from parent component
 * - Single source of truth pattern
 * - Optimized navigation logic
 * - Consistent data structure
 */
const useEpisodeNavigation = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  episodeData = null, // NEW: Receive data instead of fetching
  onEpisodeChange
} = {}) => {
  // State management - simplified since no fetching
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [loading] = useState(false); // Always false since no fetching
  const [error] = useState(null); // Always null since no fetching

  // Parse season/episode IDs to find current episode
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

  // Find current episode from provided data
  const findCurrentEpisode = useCallback((sId, eId) => {
    if (!episodeData || !sId || !eId) return null;

    const { seasonNumber, episodeNumber } = parseIds(sId, eId);
    if (!seasonNumber || !episodeNumber) return null;

    const season = episodeData.seasons?.find(s => s.season_number === seasonNumber);
    if (!season) return null;

    const episode = season.episodes?.find(e => e.episode_number === episodeNumber);
    if (!episode) return null;

    // Return normalized episode data
    return {
      id: `ep_${seasonNumber}_${episodeNumber}`,
      number: episode.episode_number,
      title: episode.name,
      description: episode.overview,
      duration: episode.runtime ? episode.runtime * 60 : 2700, // Convert to seconds
      airDate: episode.air_date,
      thumbnail: episode.still_path ?
        `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
      watchProgress: 0, // Will be managed by watch progress system later
      rating: episode.vote_average || 0,
      seasonId: `season_${seasonNumber}`,
      seasonNumber,
      tmdbId: episode.id,
      imdbId: episode.external_ids?.imdb_id || null
    };
  }, [episodeData, parseIds]);

  // Navigation functions using provided data
  const getNextEpisode = useCallback(() => {
    if (!episodeData || !seasonId || !episodeId) return null;

    const { seasonNumber, episodeNumber } = parseIds(seasonId, episodeId);
    if (!seasonNumber || !episodeNumber) return null;

    const currentSeason = episodeData.seasons?.find(s => s.season_number === seasonNumber);
    if (!currentSeason) return null;

    const currentIndex = currentSeason.episodes?.findIndex(e => e.episode_number === episodeNumber);
    if (currentIndex === -1) return null;

    // Check for next episode in current season
    if (currentIndex < currentSeason.episodes.length - 1) {
      const nextEpisode = currentSeason.episodes[currentIndex + 1];
      return {
        episode: {
          id: `ep_${seasonNumber}_${nextEpisode.episode_number}`,
          number: nextEpisode.episode_number,
          title: nextEpisode.name,
          description: nextEpisode.overview,
          duration: nextEpisode.runtime ? nextEpisode.runtime * 60 : 2700,
          airDate: nextEpisode.air_date,
          thumbnail: nextEpisode.still_path ?
            `https://image.tmdb.org/t/p/w500${nextEpisode.still_path}` : null,
          watchProgress: 0,
          rating: nextEpisode.vote_average || 0,
          seasonNumber,
          tmdbId: nextEpisode.id
        },
        season: {
          id: `season_${seasonNumber}`,
          number: seasonNumber,
          title: currentSeason.name
        }
      };
    }

    // Check for first episode of next season
    const nextSeasonNumber = seasonNumber + 1;
    const nextSeason = episodeData.seasons?.find(s => s.season_number === nextSeasonNumber);
    
    if (nextSeason && nextSeason.episodes?.length > 0) {
      const firstEpisode = nextSeason.episodes[0];
      return {
        episode: {
          id: `ep_${nextSeasonNumber}_${firstEpisode.episode_number}`,
          number: firstEpisode.episode_number,
          title: firstEpisode.name,
          description: firstEpisode.overview,
          duration: firstEpisode.runtime ? firstEpisode.runtime * 60 : 2700,
          airDate: firstEpisode.air_date,
          thumbnail: firstEpisode.still_path ?
            `https://image.tmdb.org/t/p/w500${firstEpisode.still_path}` : null,
          watchProgress: 0,
          rating: firstEpisode.vote_average || 0,
          seasonNumber: nextSeasonNumber,
          tmdbId: firstEpisode.id
        },
        season: {
          id: `season_${nextSeasonNumber}`,
          number: nextSeasonNumber,
          title: nextSeason.name
        }
      };
    }

    return null; // No next episode
  }, [episodeData, seasonId, episodeId, parseIds]);

  const getPreviousEpisode = useCallback(() => {
    if (!episodeData || !seasonId || !episodeId) return null;

    const { seasonNumber, episodeNumber } = parseIds(seasonId, episodeId);
    if (!seasonNumber || !episodeNumber) return null;

    const currentSeason = episodeData.seasons?.find(s => s.season_number === seasonNumber);
    if (!currentSeason) return null;

    const currentIndex = currentSeason.episodes?.findIndex(e => e.episode_number === episodeNumber);
    if (currentIndex === -1) return null;

    // Check for previous episode in current season
    if (currentIndex > 0) {
      const prevEpisode = currentSeason.episodes[currentIndex - 1];
      return {
        episode: {
          id: `ep_${seasonNumber}_${prevEpisode.episode_number}`,
          number: prevEpisode.episode_number,
          title: prevEpisode.name,
          description: prevEpisode.overview,
          duration: prevEpisode.runtime ? prevEpisode.runtime * 60 : 2700,
          airDate: prevEpisode.air_date,
          thumbnail: prevEpisode.still_path ?
            `https://image.tmdb.org/t/p/w500${prevEpisode.still_path}` : null,
          watchProgress: 0,
          rating: prevEpisode.vote_average || 0,
          seasonNumber,
          tmdbId: prevEpisode.id
        },
        season: {
          id: `season_${seasonNumber}`,
          number: seasonNumber,
          title: currentSeason.name
        }
      };
    }

    // Check for last episode of previous season
    const prevSeasonNumber = seasonNumber - 1;
    const prevSeason = episodeData.seasons?.find(s => s.season_number === prevSeasonNumber);
    
    if (prevSeason && prevSeason.episodes?.length > 0) {
      const lastEpisode = prevSeason.episodes[prevSeason.episodes.length - 1];
      return {
        episode: {
          id: `ep_${prevSeasonNumber}_${lastEpisode.episode_number}`,
          number: lastEpisode.episode_number,
          title: lastEpisode.name,
          description: lastEpisode.overview,
          duration: lastEpisode.runtime ? lastEpisode.runtime * 60 : 2700,
          airDate: lastEpisode.air_date,
          thumbnail: lastEpisode.still_path ?
            `https://image.tmdb.org/t/p/w500${lastEpisode.still_path}` : null,
          watchProgress: 0,
          rating: lastEpisode.vote_average || 0,
          seasonNumber: prevSeasonNumber,
          tmdbId: lastEpisode.id
        },
        season: {
          id: `season_${prevSeasonNumber}`,
          number: prevSeasonNumber,
          title: prevSeason.name
        }
      };
    }

    return null; // No previous episode
  }, [episodeData, seasonId, episodeId, parseIds]);

  const getCurrentEpisode = useCallback(() => {
    return findCurrentEpisode(seasonId, episodeId);
  }, [findCurrentEpisode, seasonId, episodeId]);

  // Navigation actions - simplified since we're not managing episode data
  const goToNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (next && onEpisodeChange) {
      onEpisodeChange({
        seasonId: next.season.number,
        episodeId: next.episode.number,
        episodeData: next.episode,
        crossSeason: next.season.number !== parseIds(seasonId, episodeId).seasonNumber
      });
    }
  }, [getNextEpisode, onEpisodeChange, seasonId, episodeId, parseIds]);

  const goToPreviousEpisode = useCallback(() => {
    const prev = getPreviousEpisode();
    if (prev && onEpisodeChange) {
      onEpisodeChange({
        seasonId: prev.season.number,
        episodeId: prev.episode.number,
        episodeData: prev.episode,
        crossSeason: prev.season.number !== parseIds(seasonId, episodeId).seasonNumber
      });
    }
  }, [getPreviousEpisode, onEpisodeChange, seasonId, episodeId, parseIds]);

  const goToEpisode = useCallback((sId, eId) => {
    if (onEpisodeChange) {
      const episode = findCurrentEpisode(sId, eId);
      onEpisodeChange({
        seasonId: sId,
        episodeId: eId,
        episodeData: episode,
        crossSeason: sId !== seasonId
      });
    }
  }, [onEpisodeChange, findCurrentEpisode, seasonId]);

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

    const season = episodeData.seasons?.find(s => s.season_number === seasonNumber);
    if (!season) return [];

    return season.episodes?.map(episode => ({
      id: `ep_${seasonNumber}_${episode.episode_number}`,
      number: episode.episode_number,
      title: episode.name,
      description: episode.overview,
      duration: episode.runtime ? episode.runtime * 60 : 2700,
      airDate: episode.air_date,
      thumbnail: episode.still_path ?
        `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
      watchProgress: 0,
      rating: episode.vote_average || 0,
      seasonNumber,
      tmdbId: episode.id
    })) || [];
  }, [episodeData, seasonId, parseIds]);

  // Get all seasons data in normalized format
  const getAllSeasons = useCallback(() => {
    if (!episodeData) return [];

    return episodeData.seasons?.map(season => ({
      id: `season_${season.season_number}`,
      number: season.season_number,
      title: season.name,
      episodeCount: season.episodes?.length || 0,
      year: season.air_date ? new Date(season.air_date).getFullYear() : null,
      episodes: season.episodes?.map(episode => ({
        id: `ep_${season.season_number}_${episode.episode_number}`,
        number: episode.episode_number,
        title: episode.name,
        description: episode.overview,
        duration: episode.runtime ? episode.runtime * 60 : 2700,
        airDate: episode.air_date,
        thumbnail: episode.still_path ?
          `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
        watchProgress: 0,
        rating: episode.vote_average || 0,
        seasonNumber: season.season_number,
        tmdbId: episode.id
      })) || []
    })) || [];
  }, [episodeData]);

  // Update current episode when navigation changes
  useEffect(() => {
    if (episodeData) {
      setCurrentEpisode(findCurrentEpisode(seasonId, episodeId));
    }
  }, [episodeData, seasonId, episodeId, findCurrentEpisode]);

  // Get show statistics
  const getShowStats = useCallback(() => {
    if (!episodeData) return null;

    const allSeasons = getAllSeasons();
    const totalEpisodes = allSeasons.reduce((sum, season) => sum + season.episodeCount, 0);
    const watchedEpisodes = allSeasons.reduce((sum, season) => {
      return sum + season.episodes.filter(ep => ep.watchProgress >= 0.9).length;
    }, 0);
    
    const totalDuration = allSeasons.reduce((sum, season) => {
      return sum + season.episodes.reduce((epSum, ep) => epSum + (ep.duration || 2700), 0);
    }, 0);

    const avgRating = allSeasons.reduce((sum, season) => {
      return sum + season.episodes.reduce((epSum, ep) => epSum + (ep.rating || 0), 0);
    }, 0) / Math.max(1, totalEpisodes);

    return {
      totalSeasons: allSeasons.length,
      totalEpisodes,
      watchedEpisodes,
      totalDuration,
      completionRate: totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) : 0,
      averageRating: avgRating
    };
  }, [episodeData, getAllSeasons]);

  return {
    // Data - now provided from parent, not fetched
    episodeData: getAllSeasons(), // Return in normalized format
    currentEpisode,
    loading, // Always false
    error, // Always null

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
    getShowStats,

    // Utilities
    isLastEpisode: !hasNextEpisode,
    isFirstEpisode: !hasPreviousEpisode,
    currentSeasonNumber: currentEpisode?.seasonNumber,
    currentEpisodeNumber: currentEpisode?.number
  };
};

export default useEpisodeNavigation;