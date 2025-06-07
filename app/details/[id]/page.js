'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ShowDetails from '../../components/ShowDetails';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import { MediaProvider } from '../../context/MediaContext';

export default function DetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        // The ID from URL is just the TMDB ID, we need to determine if it's a movie or TV show
        // We'll make requests to both endpoints and see which one succeeds
        
        let movieDetails = null;
        let mediaType = null;
        
        // Try TV show first
        try {
          const tvResponse = await fetch(
            `/api/tmdb?action=getShowDetails&movieId=${params.id}`
          );
          if (tvResponse.ok) {
            const tvData = await tvResponse.json();
            if (tvData && tvData.id) {
              movieDetails = tvData;
              mediaType = 'tv';
            }
          }
        } catch (error) {
          console.log('Not a TV show, trying movie...');
        }
        
        // If not a TV show, try movie
        if (!movieDetails) {
          try {
            const movieResponse = await fetch(
              `/api/tmdb?action=getMovieDetails&movieId=${params.id}`
            );
            if (movieResponse.ok) {
              const movieData = await movieResponse.json();
              if (movieData && movieData.id) {
                movieDetails = movieData;
                mediaType = 'movie';
              }
            }
          } catch (error) {
            console.error('Error fetching movie details:', error);
          }
        }
        
        if (movieDetails && mediaType) {
          setMovieData({
            id: parseInt(params.id),
            media_type: mediaType,
            ...movieDetails
          });
        } else {
          console.error('Could not fetch details for ID:', params.id);
        }
      } catch (error) {
        console.error('Error in fetchMovieData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [params.id]);

  const handleClearMovie = () => {
    router.push('/');
  };

  const handleNavBarClear = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <MediaProvider>
        <div className="app">
          <NavBar onClearSearch={handleNavBarClear} />
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
          <Footer />
        </div>
      </MediaProvider>
    );
  }

  if (!movieData) {
    return (
      <MediaProvider>
        <div className="app">
          <NavBar onClearSearch={handleNavBarClear} />
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Movie or show not found.
            <br />
            <button onClick={handleClearMovie} style={{ marginTop: '10px' }}>
              Back to Home
            </button>
          </div>
          <Footer />
        </div>
      </MediaProvider>
    );
  }

  return (
    <MediaProvider>
      <div className="app">
        <NavBar onClearSearch={handleNavBarClear} />
        <ShowDetails movieId={movieData} clearMovie={handleClearMovie} />
        <Footer />
      </div>
    </MediaProvider>
  );
} 