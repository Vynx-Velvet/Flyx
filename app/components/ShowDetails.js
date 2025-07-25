'use client'

import React, { useEffect, useState } from "react";
import UniversalMediaPlayer from "./UniversalMediaPlayer"; // Import the new UniversalMediaPlayer component
import Recommendations from "./Recommendations"; // Import the Recommendations component
import "./ShowDetails.css"; // Custom styles for the compact design


const ShowDetails = ({ movieId, clearMovie, onMediaPlayerStateChange }) => {
  const [movieDetails, setMovieDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(0); // Tracks which season is selected
  const [selectedEpisode, setSelectedEpisode] = useState(null); // Tracks which episode is selected
  const [episodeLoading, setEpisodeLoading] = useState(false); // Track episode loading state
  const [isLaunching, setIsLaunching] = useState(false); // Track when media player is being launched

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
      onMediaPlayerStateChange(shouldShowPlayer());
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

  const handleEpisodeChange = (seasonId, episodeNumber) => {
    const newSeasonIndex = seasonId - 1; // Convert 1-indexed season to 0-indexed
    const newEpisode = movieDetails.seasons[newSeasonIndex].episodes.find(
      (ep) => ep.episode_number === episodeNumber
    );
    setSelectedSeason(newSeasonIndex);
    setSelectedEpisode(newEpisode);
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

  // FIXED: Reset state when movieId changes (switching between different media)
  useEffect(() => {
    console.log('🔄 MovieId changed - resetting all state');
    setSelectedEpisode(null);
    setIsLaunching(false);
    setSelectedSeason(0);
    setEpisodeLoading(false);
  }, [movieId.id, movieId.media_type]);

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
        <UniversalMediaPlayer
          mediaType="movie"
          movieId={movieId.id}
          seasonId={null}
          episodeId={null}
          onBackToShowDetails={handleBackFromMediaPlayer}
        />
      );
    } else if (movieId.media_type === "tv") {
      // For TV shows, we know selectedEpisode is not null here
      return (
        <UniversalMediaPlayer
          mediaType={movieId.media_type}
          movieId={movieId.id}
          seasonId={selectedSeason + 1} // Season numbers are 1-indexed
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
        <button className="play-movie-button" onClick={() => handlePlayMovie(movie)}>
          Play Movie
        </button>
      )}

      {movieId.media_type === "tv" && seasons && (
        <>
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
                    {season.name || `Season ${index + 1}`}
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
                  {seasons[selectedSeason].episodes.map((episode) =>
                    episode.still_path ? (
                      <div
                        key={episode.id}
                        className="episode-card"
                        onClick={() => handlePlayEpisode(episode)}
                      >
                        <img
                          className="episode-thumbnail"
                          src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                          alt={`${episode.name} thumbnail`}
                        />
                        <div className="episode-info">
                          <h4>Episode {episode.episode_number}</h4>
                          <p>{episode.name}</p>
                          <p>{episode.overview}</p>
                          <p>{episode.air_date}</p>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={episode.id}
                        className="episode-card"
                        onClick={() => handlePlayEpisode(episode)}
                      >
                        <img
                          className="episode-thumbnail"
                          src={`/imgs/TBA.webp`}
                          alt={`${episode.name} thumbnail`}
                        />
                        <div className="episode-info">
                          <h4>Episode {episode.episode_number}</h4>
                          <p>{episode.name}</p>
                          <p>{episode.overview}</p>
                          <p>{episode.air_date}</p>
                        </div>
                      </div>
                    )
                  )}
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
