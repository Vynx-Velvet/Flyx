import React, { useEffect, useState, useRef } from 'react';
import Flag from 'react-world-flags';
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
              process.env.REACT_APP_GET_TRENDING_DAY_API
            );
            const trendingResult = await trendingResponse.json();
            moviesData = trendingResult.results;
            break;
          case 'Trending This Week':
            const airingTodayResponse = await fetch(
              process.env.REACT_APP_GET_TRENDING_WEEK_API
            );
            const airingTodayResult = await airingTodayResponse.json();
            moviesData = airingTodayResult.results;
            break;
          case 'Popular Anime':
            const popularAnimeResponse = await fetch(
              process.env.REACT_APP_GET_POPULAR_ANIME_API
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
        <div>Loading...</div>
      ) : movies.length === 0 ? (
        <div>No movies found.</div>
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
                onClick={() => movieClick(movie)}
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
                    <p><strong>Country:</strong> {movie.origin_country[1]  ? <><Flag code={movie.origin_country[0]} style={{width: '12px'}}/> <Flag code={movie.origin_country[1]} style={{width: '12px'}}/> </>: <Flag code={movie.origin_country[0]} style={{width: '24px'}}/>}</p>
                    <p><strong>Rating:</strong> {`${movie.vote_average}⭐` || 'N/A'}</p>
                    <p><strong>Release Year:</strong> {movie.first_air_date?.split('-')[0] || 'N/A'}</p>
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
      <style jsx>{`
        .carousel-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .movies-carousel {
          display: flex;
          overflow-x: auto;
          scroll-behavior: smooth;
          gap: 10px;
        }
        .movies-carousel::-webkit-scrollbar {
          display: none;
        }
        .movie-card {
          flex: 0 0 auto;
          min-width: 200px;
          position: relative;
        }
        .movie-card img {
          width: 100%;
          border-radius: 8px;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
        }
        .movie-details {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          border-radius: 5px;
          text-align: center;
          width: 90%;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
        }
        .left-arrow, .right-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(0, 0, 0, 0.5);
          border: none;
          color: white;
          font-size: 24px;
          padding: 10px;
          cursor: pointer;
          z-index: 10;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }
        .left-arrow:hover, .right-arrow:hover {
          background-color: rgba(0, 0, 0, 0.8);
        }
        .left-arrow {
          left: 10px;
        }
        .right-arrow {
          right: 10px;
        }
      `}</style>
    </div>
  );
};

export default Results;
