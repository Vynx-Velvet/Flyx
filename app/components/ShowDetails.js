'use client'

import React, { useEffect, useState, useRef } from "react";
import SimpleVideoPlayer from "./SimpleVideoPlayer"; // Import the simple video player
import Recommendations from "./Recommendations"; // Import the Recommendations component
import WatchProgressIndicator, { EpisodeProgressOverlay, ShowProgressSummary } from "./UniversalMediaPlayer/components/WatchProgressIndicator";
import { getWatchProgress, getShowProgress } from "./UniversalMediaPlayer/utils/watchProgressStorage";
import "./ShowDetails.css"; // Custom styles for the compact design


const ShowDetails = ({ movieId, clearMovie, onMediaPlayerStateChange }) => {
  const [movieDetails, setMovieDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(0); // Tracks which season is selected
  const [selectedEpisode, setSelectedEpisode] = useState(null); // Tracks which episode is selected
  const [episodeLoading, setEpisodeLoading] = useState(false); // Track episode loading state
  const [isLaunching, setIsLaunching] = useState(false); // Track when media player is being launched
  const [showProgress, setShowProgress] = useState(null); // Track overall show progress
  const [episodeProgresses, setEpisodeProgresses] = useState({}); // Track individual episode progress

  // Show media player only when:
  // - For movies: when launching or when selected episode is set (movie object)
  // - For TV shows: only when a specific episode is selected (not just launching)
  const shouldShowPlayer = () => {
    if (movieId.media_type === "movie") {
      return selectedEpisode || isLaunching;
    } else if (movieId.media_type === "tv") {
      return selectedEpisode !== null; // Only show player for TV when specific episode selected
    }
    return false;
  };

  // Notify parent when media player state changes
  useEffect(() => {
    if (onMediaPlayerStateChange) {
      // Calculate player state directly instead of using shouldShowPlayer function
      const isPlayerActive = movieId.media_type === "movie"
        ? selectedEpisode || isLaunching
        : selectedEpisode !== null;
      onMediaPlayerStateChange(isPlayerActive);
    }
  }, [selectedEpisode, isLaunching, movieId.media_type, onMediaPlayerStateChange]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        if (movieId.media_type === "tv" || !movieId.media_type) {
          const showResponse = await fetch(
            `/api/tmdb?action=getShowDetails&movieId=${movieId.id}`
          );
          const showDetailsResponse = await showResponse.json();
          const seasons = await Promise.all(
            showDetailsResponse.seasons.map(async (season) => {
              const seasonResponse = await fetch(
                `/api/tmdb?action=getSeasonDetails&movieId=${movieId.id}&seasonId=${season.season_number}`
              );
              return seasonResponse.json();
            })
          );
          setMovieDetails({ movie: showDetailsResponse, seasons });
        } else {
          const movieResponse = await fetch(
            `/api/tmdb?action=getMovieDetails&movieId=${movieId.id}`
          );
          const movieDetailsResponse = await movieResponse.json();
          setMovieDetails({ movie: movieDetailsResponse });
        }
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [movieId]);

  // Load watch progress data when movie details change
  useEffect(() => {
    if (!movieDetails) return;

    if (movieId.media_type === "tv") {
      // Load show-level progress
      const progress = getShowProgress(movieId.id);
      setShowProgress(progress);

      // Load individual episode progress
      const progresses = {};
      movieDetails.seasons?.forEach((season, seasonIndex) => {
        season.episodes?.forEach((episode) => {
          const episodeProgress = getWatchProgress(
            'tv',
            movieId.id,
            season.season_number,
            episode.episode_number
          );
          if (episodeProgress.isStarted) {
            progresses[`${season.season_number}_${episode.episode_number}`] = episodeProgress;
          }
        });
      });
      setEpisodeProgresses(progresses);
    } else if (movieId.media_type === "movie") {
      // Load movie progress
      const movieProgress = getWatchProgress('movie', movieId.id);
      if (movieProgress.isStarted) {
        setEpisodeProgresses({ movie: movieProgress });
      }
    }
  }, [movieDetails, movieId]);

  const returnToHome = () => {
    // Prevent navigation back to home if media player is launching or active
    if (isLaunching || selectedEpisode) {
      console.log('🚫 Navigation to home blocked - media player is active');
      return;
    }
    console.log('🏠 Navigating back to home page');
    clearMovie(null);
  };

  const handleSeasonChange = (seasonIndex) => {
    const season = seasons[seasonIndex];
    console.log('📺 Season changed:', {
      seasonIndex,
      seasonNumber: season?.season_number,
      seasonName: season?.name,
      episodeCount: season?.episodes?.length
    });
    
    setEpisodeLoading(true);
    setSelectedSeason(seasonIndex);
    setSelectedEpisode(null); // Reset the selected episode when the season changes
    
    // Simulate episode loading for better UX
    setTimeout(() => {
      setEpisodeLoading(false);
    }, 300);
  };

  // Handle playing a specific episode (for TV shows)
  const handlePlayEpisode = (episode) => {
    console.log('📺 Playing specific episode:', episode.name, 'Episode', episode.episode_number);
    setIsLaunching(true); // Set launching state to prevent home page rendering
    setSelectedEpisode(episode);
  };

  // Handle playing a movie (for movies only)
  const handlePlayMovie = (movie) => {
    console.log('🎬 Playing movie:', movie.title || movie.name);
    setIsLaunching(true); // Set launching state to prevent home page rendering
    setSelectedEpisode(movie); // For movies, we use selectedEpisode to trigger player
  };

  // Legacy function - kept for compatibility but should not set launching state immediately
  const handleEpisodeClick = (episode) => {
    // This function should only be used for actual episode playback now
    handlePlayEpisode(episode);
  };



  // FIXED: Properly clear media player state and return to show details (NOT home)
  const handleBackFromMediaPlayer = () => {
    console.log('🔙 Back button pressed - returning to show details');
    
    // CRITICAL: Reset media player state to return to show details view
    setSelectedEpisode(null);
    setIsLaunching(false);
    
    // DO NOT call clearMovie - stay in the modal/show details view
    console.log('✅ Media player closed - returned to show details modal');
  };

  // Handle episode navigation (including cross-season)
  const handleEpisodeChange = ({ seasonId, episodeId, episodeData, crossSeason }) => {
    console.log('📺 Episode navigation:', { seasonId, episodeId, episodeData, crossSeason });
    
    if (crossSeason) {
      // Handle cross-season navigation
      const newSeasonIndex = movieDetails?.seasons?.findIndex(
        season => season.season_number === seasonId
      );
      
      if (newSeasonIndex !== -1 && movieDetails.seasons[newSeasonIndex]) {
        const newSeasonData = movieDetails.seasons[newSeasonIndex];
        const newEpisode = newSeasonData.episodes?.find(ep => ep.episode_number === episodeId);
        
        if (newEpisode) {
          console.log('✅ Cross-season navigation:', {
            fromSeason: selectedSeason,
            toSeason: newSeasonIndex,
            episode: newEpisode.name
          });
          
          setSelectedSeason(newSeasonIndex);
          setSelectedEpisode(newEpisode);
        } else {
          console.warn('❌ Episode not found in new season:', episodeId);
        }
      } else {
        console.warn('❌ Season not found:', seasonId);
      }
    } else {
      // Handle same-season navigation
      const currentSeasonData = movieDetails?.seasons?.[selectedSeason];
      if (currentSeasonData && currentSeasonData.episodes) {
        const newEpisode = currentSeasonData.episodes.find(ep => ep.episode_number === episodeId);
        if (newEpisode) {
          setSelectedEpisode(newEpisode);
          console.log('✅ Episode changed to:', newEpisode.name);
        } else {
          console.warn('❌ Episode not found:', episodeId);
        }
      }
    }
  };

  // NEW: Create structured episode data for media player
  const createEpisodeDataForPlayer = () => {
    if (!movieDetails?.seasons) return null;
    
    return {
      showId: movieId.id,
      showTitle: movieDetails.movie.name,
      currentSeason: seasons[selectedSeason]?.season_number || selectedSeason + 1,
      currentEpisode: selectedEpisode?.episode_number || 1,
      seasons: seasons.map(season => ({
        season_number: season.season_number,
        name: season.name,
        air_date: season.air_date,
        episodes: season.episodes || []
      }))
    };
  };

  // Use refs to track previous values and prevent unnecessary resets
  const prevMovieIdRef = useRef(movieId?.id);
  const prevMediaTypeRef = useRef(movieId?.media_type);

  // FIXED: Reset state when movieId changes (switching between different media)
  // Only reset if we're actually switching to a different media item
  useEffect(() => {
    const currentId = movieId?.id;
    const currentType = movieId?.media_type;

    if (prevMovieIdRef.current !== currentId || prevMediaTypeRef.current !== currentType) {
      console.log('🔄 MovieId changed - resetting all state', {
        from: { id: prevMovieIdRef.current, type: prevMediaTypeRef.current },
        to: { id: currentId, type: currentType }
      });

      setSelectedEpisode(null);
      setIsLaunching(false);
      setSelectedSeason(0);
      setEpisodeLoading(false);

      // Update refs
      prevMovieIdRef.current = currentId;
      prevMediaTypeRef.current = currentType;
    }
  }, [movieId?.id, movieId?.media_type]);

  // Helper function to get episode progress
  const getEpisodeProgress = (seasonNumber, episodeNumber) => {
    return episodeProgresses[`${seasonNumber}_${episodeNumber}`] || null;
  };

  // Helper function to get movie progress
  const getMovieProgress = () => {
    return episodeProgresses.movie || null;
  };

  if (loading) {
    return <div className="show-details">Loading...</div>;
  }

  if (!movieDetails) {
    return <div className="show-details">Error loading details. Please try again later.</div>;
  }

  const { movie, seasons } = movieDetails;

  if (shouldShowPlayer()) {
    if (movieId.media_type === "movie") {
      // For movies, we don't need season/episode info
      return (
        <SimpleVideoPlayer
          mediaType="movie"
          movieId={movieId.id}
          seasonId={null}
          episodeId={null}
          onBackToShowDetails={handleBackFromMediaPlayer}
        />
      );
    } else if (movieId.media_type === "tv") {
      // For TV shows, we know selectedEpisode is not null here
      // Get the actual season number from the season data (handles Specials = Season 0)
      const actualSeasonNumber = seasons[selectedSeason]?.season_number || selectedSeason + 1;
      
      console.log('🎬 Launching media player:', {
        seasonIndex: selectedSeason,
        actualSeasonNumber,
        episodeNumber: selectedEpisode.episode_number,
        episodeName: selectedEpisode.name
      });
      
      return (
        <SimpleVideoPlayer
          mediaType={movieId.media_type}
          movieId={movieId.id}
          seasonId={actualSeasonNumber} // Use actual season number (0 for Specials, 1+ for regular seasons)
          episodeId={selectedEpisode.episode_number}
          onBackToShowDetails={handleBackFromMediaPlayer}
        />
      );
    }
  }

  return (
    <div className="show-details">
      <button className="back-button" onClick={returnToHome}>
      ◄ Back To Home
      </button>

      <div className="movie-header">
        {movie.poster_path && (
          <img
            className="movie-poster"
            src={`https://image.tmdb.org/t/p/w400${movie.poster_path}`}
            alt={`${movie.name || movie.title} poster`}
          />
        )}
        <div className="movie-info">
        <h1>{movie.name || movie.title}</h1>
        <p className="movie-overview">{movie.overview}</p>
        </div>
      </div>

      {movieId.media_type === "movie" && (
        <div className="movie-actions">
          <button className="play-movie-button" onClick={() => handlePlayMovie(movie)}>
            {getMovieProgress()?.canResume ? 'Resume Movie' : 'Play Movie'}
          </button>
          {getMovieProgress()?.isStarted && (
            <div className="movie-progress-container" style={{ marginTop: '16px' }}>
              <WatchProgressIndicator
                progress={getMovieProgress().progress}
                isCompleted={getMovieProgress().isCompleted}
                isStarted={getMovieProgress().isStarted}
                mode="bar"
                size="large"
                showPercentage={true}
                showTimeRemaining={true}
                timeRemaining={getMovieProgress().timeRemaining}
                animate={true}
                theme="dark"
              />
              <div style={{
                marginTop: '8px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center'
              }}>
                {getMovieProgress().isCompleted ? 'Completed' :
                  `${Math.round(getMovieProgress().progress * 100)}% watched`}
              </div>
            </div>
          )}
        </div>
      )}

      {movieId.media_type === "tv" && seasons && (
        <>
          {/* Show Progress Summary */}
          {showProgress && showProgress.totalEpisodes > 0 && (
            <div className="show-progress-section" style={{ margin: '24px 0' }}>
              <ShowProgressSummary
                totalEpisodes={showProgress.totalEpisodes}
                watchedEpisodes={showProgress.watchedEpisodes}
                completionRate={showProgress.completionRate}
                size="large"
              />
            </div>
          )}

          <div className="season-selector-container">
            <h2>Seasons</h2>
            <div className="season-buttons">
              {seasons.map((season, index) =>
                season.episodes.length > 0 ? (
                  <button
                    key={season.id}
                    className={`season-button ${selectedSeason === index ? "active" : ""}`}
                    onClick={() => handleSeasonChange(index)}
                  >
                    {season.name || (season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`)}
                  </button>
                ) : null
              )}
            </div>
          </div>

          {seasons[selectedSeason] && (
            <div className="episodes-container">
              {episodeLoading ? (
                <div className="episodes-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading episodes...</p>
                </div>
              ) : (
                <div className="episodes-grid">
                  {seasons[selectedSeason].episodes.map((episode) => {
                    const seasonNumber = seasons[selectedSeason].season_number;
                    const episodeProgress = getEpisodeProgress(seasonNumber, episode.episode_number);
                    
                    return episode.still_path ? (
                      <div
                        key={episode.id}
                        className="episode-card"
                        onClick={() => handlePlayEpisode(episode)}
                        style={{ position: 'relative' }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            className="episode-thumbnail"
                            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                            alt={`${episode.name} thumbnail`}
                          />
                          {/* Episode Progress Overlay */}
                          {episodeProgress && (
                            <EpisodeProgressOverlay
                              progress={episodeProgress.progress}
                              isCompleted={episodeProgress.isCompleted}
                              isStarted={episodeProgress.isStarted}
                            />
                          )}
                          {/* Resume/Completed Badge */}
                          {episodeProgress && (
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              zIndex: 3
                            }}>
                              <WatchProgressIndicator
                                progress={episodeProgress.progress}
                                isCompleted={episodeProgress.isCompleted}
                                isStarted={episodeProgress.isStarted}
                                mode="badge"
                                size="small"
                                animate={false}
                                theme="dark"
                              />
                            </div>
                          )}
                        </div>
                        <div className="episode-info">
                          <h4>Episode {episode.episode_number}</h4>
                          <p>{episode.name}</p>
                          <p>{episode.overview}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>{episode.air_date}</p>
                            {episodeProgress && (
                              <span style={{
                                fontSize: '11px',
                                color: episodeProgress.isCompleted ? '#00ff88' : '#00f5ff',
                                fontWeight: 'bold'
                              }}>
                                {episodeProgress.isCompleted ? 'Completed' :
                                  episodeProgress.canResume ? 'Resume' :
                                  `${Math.round(episodeProgress.progress * 100)}%`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={episode.id}
                        className="episode-card"
                        onClick={() => handlePlayEpisode(episode)}
                        style={{ position: 'relative' }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            className="episode-thumbnail"
                            src={`/imgs/TBA.webp`}
                            alt={`${episode.name} thumbnail`}
                          />
                          {/* Episode Progress Overlay */}
                          {episodeProgress && (
                            <EpisodeProgressOverlay
                              progress={episodeProgress.progress}
                              isCompleted={episodeProgress.isCompleted}
                              isStarted={episodeProgress.isStarted}
                            />
                          )}
                          {/* Resume/Completed Badge */}
                          {episodeProgress && (
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              zIndex: 3
                            }}>
                              <WatchProgressIndicator
                                progress={episodeProgress.progress}
                                isCompleted={episodeProgress.isCompleted}
                                isStarted={episodeProgress.isStarted}
                                mode="badge"
                                size="small"
                                animate={false}
                                theme="dark"
                              />
                            </div>
                          )}
                        </div>
                        <div className="episode-info">
                          <h4>Episode {episode.episode_number}</h4>
                          <p>{episode.name}</p>
                          <p>{episode.overview}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>{episode.air_date}</p>
                            {episodeProgress && (
                              <span style={{
                                fontSize: '11px',
                                color: episodeProgress.isCompleted ? '#00ff88' : '#00f5ff',
                                fontWeight: 'bold'
                              }}>
                                {episodeProgress.isCompleted ? 'Completed' :
                                  episodeProgress.canResume ? 'Resume' :
                                  `${Math.round(episodeProgress.progress * 100)}%`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Recommendations Section */}
      <Recommendations 
        contentId={movieId.id} 
        contentType={movieId.media_type} 
      />
    </div>
  );
};

export default ShowDetails;
