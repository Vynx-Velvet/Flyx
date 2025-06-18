'use client'

import React, { useEffect, useState } from "react";
import UniversalMediaPlayer from "./UniversalMediaPlayer"; // Import the Universal MediaPlayer component
import Recommendations from "./Recommendations"; // Import the Recommendations component
import "./ShowDetails.css"; // Custom styles for the compact design


const ShowDetails = ({ movieId, clearMovie, onMediaPlayerStateChange }) => {
  const [movieDetails, setMovieDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(0); // Tracks which season is selected
  const [selectedEpisode, setSelectedEpisode] = useState(null); // Tracks which episode is selected

  // Notify parent when media player state changes
  useEffect(() => {
    if (onMediaPlayerStateChange) {
      onMediaPlayerStateChange(!!selectedEpisode);
    }
  }, [selectedEpisode, onMediaPlayerStateChange]);

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
    clearMovie(null);
  };

  const handleSeasonChange = (seasonIndex) => {
    setSelectedSeason(seasonIndex);
    setSelectedEpisode(null); // Reset the selected episode when the season changes
  };

  const handleEpisodeClick = (episode) => {
    setSelectedEpisode(episode); // Set the clicked episode as the selected episode
  };

  const handleEpisodeChange = (seasonId, episodeNumber) => {
    const newSeasonIndex = seasonId - 1; // Convert 1-indexed season to 0-indexed
    const newEpisode = movieDetails.seasons[newSeasonIndex].episodes.find(
      (ep) => ep.episode_number === episodeNumber
    );
    setSelectedSeason(newSeasonIndex);
    setSelectedEpisode(newEpisode);
  };

  const handleBackToShowDetails = (lastPlayedSeasonId) => {
    setSelectedSeason(lastPlayedSeasonId - 1); // Convert 1-indexed season to 0-indexed
    setSelectedEpisode(null);
  };

  if (loading) {
    return <div className="show-details">Loading...</div>;
  }

  if (!movieDetails) {
    return <div className="show-details">Error loading details. Please try again later.</div>;
  }

  const { movie, seasons } = movieDetails;

  // If an episode is selected OR it's a movie that was clicked to play, show the UniversalMediaPlayer
  if (selectedEpisode) {
    if (movieId.media_type === "movie") {
      // For movies, we don't need season/episode info
      return (
        <UniversalMediaPlayer
          mediaType="movie"
          movieId={movieId.id}
          seasonId={null}
          episodeId={null}
          maxEpisodes={null}
          onEpisodeChange={() => {}}
          onBackToShowDetails={() => setSelectedEpisode(null)}
        />
      );
    } else {
      // For TV shows, use the existing logic
      const maxEpisodes = seasons ? seasons[selectedSeason]?.episodes?.length : null;
      return (
        <UniversalMediaPlayer
          mediaType={movieId.media_type}
          movieId={movieId.id}
          seasonId={selectedSeason + 1} // Season numbers are 1-indexed
          episodeId={selectedEpisode.episode_number}
          maxEpisodes={maxEpisodes}
          onEpisodeChange={handleEpisodeChange}
          onBackToShowDetails={handleBackToShowDetails}
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
        <button className="play-movie-button" onClick={() => handleEpisodeClick(movie)}>
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
              <div className="episodes-grid">
                {seasons[selectedSeason].episodes.map((episode) =>
                  episode.still_path ? (
                    <div
                      key={episode.id}
                      className="episode-card"
                      onClick={() => handleEpisodeClick(episode)}
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
                      onClick={() => handleEpisodeClick(episode)}
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
