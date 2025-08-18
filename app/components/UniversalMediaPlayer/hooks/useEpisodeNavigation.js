/**
 * Episode Navigation Hook
 * Handles next/previous episode functionality for TV shows
 */

import { useState, useEffect, useCallback } from 'react';

export const useEpisodeNavigation = ({ 
  mediaType, 
  movieId, 
  seasonId, 
  episodeId, 
  onEpisodeChange 
}) => {
  const [episodeList, setEpisodeList] = useState([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch episode list for the current season
  const fetchEpisodeList = useCallback(async () => {
    if (mediaType !== 'tv' || !movieId || !seasonId) {
      setEpisodeList([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📺 Fetching episode list for navigation:', { movieId, seasonId });
      
      const response = await fetch(`/api/tmdb/tv/${movieId}/season/${seasonId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch episode list: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.episodes && Array.isArray(data.episodes)) {
        const episodes = data.episodes
          .filter(ep => ep.episode_number) // Only episodes with valid numbers
          .sort((a, b) => a.episode_number - b.episode_number)
          .map(ep => ({
            id: ep.id,
            episodeNumber: ep.episode_number,
            name: ep.name,
            overview: ep.overview,
            airDate: ep.air_date,
            stillPath: ep.still_path
          }));

        setEpisodeList(episodes);
        
        // Find current episode index
        const currentIndex = episodes.findIndex(ep => ep.episodeNumber === parseInt(episodeId));
        setCurrentEpisodeIndex(currentIndex);
        
        console.log('✅ Episode list loaded:', {
          totalEpisodes: episodes.length,
          currentEpisode: episodeId,
          currentIndex
        });
      } else {
        throw new Error('Invalid episode data received');
      }
    } catch (err) {
      console.error('❌ Failed to fetch episode list:', err);
      setError(err.message);
      setEpisodeList([]);
    } finally {
      setLoading(false);
    }
  }, [mediaType, movieId, seasonId, episodeId]);

  // Navigate to next episode (supports cross-season navigation)
  const goToNextEpisode = useCallback(async () => {
    if (currentEpisodeIndex === -1) {
      console.log('📺 No current episode found');
      return false;
    }

    // Check if there's a next episode in current season
    if (currentEpisodeIndex < episodeList.length - 1) {
      const nextEpisode = episodeList[currentEpisodeIndex + 1];
      console.log('📺 Navigating to next episode in same season:', nextEpisode.episodeNumber);
      
      if (onEpisodeChange) {
        onEpisodeChange({
          seasonId,
          episodeId: nextEpisode.episodeNumber,
          episodeData: nextEpisode
        });
      }
      return true;
    }

    // Try to navigate to next season's first episode
    try {
      console.log('📺 End of season reached, checking next season...');
      const nextSeasonId = parseInt(seasonId) + 1;
      
      const response = await fetch(`/api/tmdb/tv/${movieId}/season/${nextSeasonId}`);
      
      if (response.ok) {
        const nextSeasonData = await response.json();
        
        if (nextSeasonData.episodes && nextSeasonData.episodes.length > 0) {
          const firstEpisode = nextSeasonData.episodes
            .filter(ep => ep.episode_number)
            .sort((a, b) => a.episode_number - b.episode_number)[0];
          
          if (firstEpisode) {
            console.log('📺 Navigating to first episode of next season:', {
              season: nextSeasonId,
              episode: firstEpisode.episode_number,
              name: firstEpisode.name
            });
            
            if (onEpisodeChange) {
              onEpisodeChange({
                seasonId: nextSeasonId,
                episodeId: firstEpisode.episode_number,
                episodeData: {
                  ...firstEpisode,
                  episodeNumber: firstEpisode.episode_number
                },
                crossSeason: true
              });
            }
            return true;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking next season:', error);
    }

    console.log('📺 No next episode available (end of series or error)');
    return false;
  }, [currentEpisodeIndex, episodeList, seasonId, movieId, onEpisodeChange]);

  // Navigate to previous episode
  const goToPreviousEpisode = useCallback(() => {
    if (currentEpisodeIndex <= 0) {
      console.log('📺 No previous episode available');
      return false;
    }

    const previousEpisode = episodeList[currentEpisodeIndex - 1];
    console.log('📺 Navigating to previous episode:', previousEpisode.episodeNumber);
    
    if (onEpisodeChange) {
      onEpisodeChange({
        seasonId,
        episodeId: previousEpisode.episodeNumber,
        episodeData: previousEpisode
      });
    }
    
    return true;
  }, [currentEpisodeIndex, episodeList, seasonId, onEpisodeChange]);

  // Check if navigation is available (including cross-season)
  const [hasNextEpisode, setHasNextEpisode] = useState(false);
  const hasPreviousEpisode = currentEpisodeIndex > 0;

  // Check for next episode availability (including next season)
  useEffect(() => {
    const checkNextEpisode = async () => {
      if (currentEpisodeIndex === -1) {
        setHasNextEpisode(false);
        return;
      }

      // If there's a next episode in current season
      if (currentEpisodeIndex < episodeList.length - 1) {
        setHasNextEpisode(true);
        return;
      }

      // Check if next season exists
      try {
        const nextSeasonId = parseInt(seasonId) + 1;
        const response = await fetch(`/api/tmdb/tv/${movieId}/season/${nextSeasonId}`);
        
        if (response.ok) {
          const nextSeasonData = await response.json();
          const hasEpisodes = nextSeasonData.episodes && nextSeasonData.episodes.length > 0;
          setHasNextEpisode(hasEpisodes);
        } else {
          setHasNextEpisode(false);
        }
      } catch (error) {
        console.error('❌ Error checking next season:', error);
        setHasNextEpisode(false);
      }
    };

    if (mediaType === 'tv' && seasonId && movieId) {
      checkNextEpisode();
    } else {
      setHasNextEpisode(false);
    }
  }, [currentEpisodeIndex, episodeList.length, seasonId, movieId, mediaType]);

  // Get current episode info
  const getCurrentEpisode = useCallback(() => {
    if (currentEpisodeIndex === -1 || !episodeList[currentEpisodeIndex]) {
      return null;
    }
    return episodeList[currentEpisodeIndex];
  }, [currentEpisodeIndex, episodeList]);

  // Get next episode info (supports cross-season)
  const getNextEpisode = useCallback(async () => {
    if (currentEpisodeIndex === -1) return null;

    // Check if there's a next episode in current season
    if (currentEpisodeIndex < episodeList.length - 1) {
      return episodeList[currentEpisodeIndex + 1];
    }

    // Try to get first episode of next season
    try {
      const nextSeasonId = parseInt(seasonId) + 1;
      const response = await fetch(`/api/tmdb/tv/${movieId}/season/${nextSeasonId}`);
      
      if (response.ok) {
        const nextSeasonData = await response.json();
        
        if (nextSeasonData.episodes && nextSeasonData.episodes.length > 0) {
          const firstEpisode = nextSeasonData.episodes
            .filter(ep => ep.episode_number)
            .sort((a, b) => a.episode_number - b.episode_number)[0];
          
          if (firstEpisode) {
            return {
              ...firstEpisode,
              episodeNumber: firstEpisode.episode_number,
              isNextSeason: true,
              nextSeasonId
            };
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching next season info:', error);
    }

    return null;
  }, [currentEpisodeIndex, episodeList, seasonId, movieId]);

  const getPreviousEpisode = useCallback(() => {
    if (!hasPreviousEpisode) return null;
    return episodeList[currentEpisodeIndex - 1];
  }, [hasPreviousEpisode, currentEpisodeIndex, episodeList]);

  // Fetch episode list when dependencies change
  useEffect(() => {
    fetchEpisodeList();
  }, [fetchEpisodeList]);

  // Update current episode index when episodeId changes
  useEffect(() => {
    if (episodeList.length > 0 && episodeId) {
      const newIndex = episodeList.findIndex(ep => ep.episodeNumber === parseInt(episodeId));
      setCurrentEpisodeIndex(newIndex);
    }
  }, [episodeId, episodeList]);

  return {
    // Episode list data
    episodeList,
    currentEpisodeIndex,
    
    // Navigation functions
    goToNextEpisode,
    goToPreviousEpisode,
    
    // Navigation availability
    hasNextEpisode,
    hasPreviousEpisode,
    
    // Episode info getters
    getCurrentEpisode,
    getNextEpisode,
    getPreviousEpisode,
    
    // State
    loading,
    error,
    
    // Manual refresh
    refreshEpisodeList: fetchEpisodeList
  };
};