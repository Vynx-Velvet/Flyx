'use client'

import React, { useEffect, useState, useRef } from 'react';
import Flag from 'react-world-flags';
import "./Results.css"
const Results = ({ category, movieClick }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMovie, setHoveredMovie] = useState(null); // Track the currently hovered movie
  const [scrollState, setScrollState] = useState(0);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        let moviesData = [];

        switch (category) {
          case 'Trending Today':
            const trendingResponse = await fetch(
              "/api/tmdb?action=getTrendingNow"
            );
            const trendingResult = await trendingResponse.json();
            moviesData = trendingResult.results;
            break;
          case 'Trending This Week':
            const airingTodayResponse = await fetch(
              "/api/tmdb?action=getTrendingWeekly"
            );
            const airingTodayResult = await airingTodayResponse.json();
            moviesData = airingTodayResult.results;
            break;
          case 'Popular Anime':
            const popularAnimeResponse = await fetch(
              "/api/tmdb?action=getPopularAnime"
            );
            const popularAnimeResult = await popularAnimeResponse.json();
            moviesData = popularAnimeResult.results;
            break;
          default:
            moviesData = [];
        }

        setMovies(moviesData);
      } catch (error) {
        console.error('Error fetching movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [category]);

  const handleArrowScroll = (direction) => {
    const carousel = carouselRef.current;
    const scrollAmount = 300; // Adjust scroll distance
    if (direction === 'left') {
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };


  const handleMouseEnter = (movie) => {
    setHoveredMovie(movie);
  };

  const handleMouseLeave = () => {
    setHoveredMovie(null);
  };

  const handleCarouselScroll = (event) => {
    console.log(event.target.scrollLeft);
    setScrollState(event.target.scrollLeft);
  }

  return (
    <div className="results">
      <h2>{category}</h2>
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : movies.length === 0 ? (
        <div className="loading-state">No movies found.</div>
      ) : (
        <div className="carousel-container">
            {scrollState === 0 ? null :
            <button
              className="left-arrow"
              onClick={() => handleArrowScroll('left')}
            >
              ◀
            </button>
          }
          <div
            className="movies-carousel"
            ref={carouselRef}
            onScroll={(e) => handleCarouselScroll(e)}
          >
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="movie-card"
                onClick={() => {
                  console.log('Movie card clicked:', movie);
                  console.log('movieClick function:', movieClick);
                  
                  // Ensure media_type is present, fallback to 'movie' if missing
                  const movieWithType = {
                    ...movie,
                    media_type: movie.media_type || (movie.title ? 'movie' : 'tv')
                  };
                  
                  if (movieClick) {
                    movieClick(movieWithType);
                  } else {
                    console.error('movieClick function is not defined');
                  }
                }}
                onMouseEnter={() => handleMouseEnter(movie)}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title || movie.name}
                />
                {hoveredMovie && hoveredMovie.id === movie.id && (
                  <div className="movie-details">
                    <p>{movie.media_type}</p>
                    <p><strong>Title:</strong> {movie.title || movie.name}</p>
                    <p><strong>Country:</strong> {movie.origin_country && movie.origin_country.length > 1 ? <><Flag code={movie.origin_country[0]} style={{width: '12px'}}/> <Flag code={movie.origin_country[1]} style={{width: '12px'}}/> </> : movie.origin_country && movie.origin_country.length > 0 ? <Flag code={movie.origin_country[0]} style={{width: '24px'}}/> : 'N/A'}</p>
                    <p><strong>Rating:</strong> {movie.vote_average ? `${movie.vote_average}⭐` : 'N/A'}</p>
                    <p><strong>Release Year:</strong> {(movie.release_date || movie.first_air_date)?.split('-')[0] || 'N/A'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

            <button
              className="right-arrow"
              onClick={() => handleArrowScroll('right')}
            >
              ▶
            </button>

        </div>
      )}
    </div>
  );
};

export default Results;
