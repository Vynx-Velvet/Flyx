'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ShowDetails from '../../components/ShowDetails';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import { MediaProvider } from '../../context/MediaContext';

export default function DetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMediaPlayerActive, setIsMediaPlayerActive] = useState(false);
  const [preventNavigation, setPreventNavigation] = useState(false);

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        
        // Get media type from URL parameter
        const mediaType = searchParams.get('type');
        console.log('Media type from URL:', mediaType);
        
        if (!mediaType) {
          console.error('Media type not specified in URL');
          setLoading(false);
          return;
        }
        
        let movieDetails = null;
        
        if (mediaType === 'tv') {
          const tvResponse = await fetch(
            `/api/tmdb?action=getShowDetails&movieId=${params.id}`
          );
          if (tvResponse.ok) {
            movieDetails = await tvResponse.json();
          }
        } else if (mediaType === 'movie') {
          const movieResponse = await fetch(
            `/api/tmdb?action=getMovieDetails&movieId=${params.id}`
          );
          if (movieResponse.ok) {
            movieDetails = await movieResponse.json();
          }
        }
        
        if (movieDetails && movieDetails.id) {
          setMovieData({
            id: parseInt(params.id),
            media_type: mediaType,
            ...movieDetails
          });
        } else {
          console.error('Could not fetch details for ID:', params.id, 'Type:', mediaType);
        }
      } catch (error) {
        console.error('Error in fetchMovieData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [params.id, searchParams]);

  // FIXED: Clear media player state when navigating between different media items
  useEffect(() => {
    console.log('🔄 Details page: ID changed, clearing media player states');
    setIsMediaPlayerActive(false);
    setPreventNavigation(false);
  }, [params.id]); // Trigger when the route ID changes

  const handleClearMovie = () => {
    if (preventNavigation) {
      console.log('🚫 Navigation blocked - media player session active');
      return;
    }
    console.log('🏠 Navigating to home page from details');
    router.push('/');
  };

  const handleNavBarClear = () => {
    if (preventNavigation) {
      console.log('🚫 Navigation blocked - media player session active');
      return;
    }
    console.log('🏠 Navigating to home page from navbar');
    router.push('/');
  };

  const handleMediaPlayerStateChange = (isActive) => {
    console.log('📺 Media player state changed:', isActive ? 'ACTIVE' : 'INACTIVE');
    setIsMediaPlayerActive(isActive);
    setPreventNavigation(isActive); // Prevent navigation when media player is active
  };

  if (loading) {
    return (
      <MediaProvider>
        <div className="app">
          {!isMediaPlayerActive && <NavBar onClearSearch={handleNavBarClear} />}
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
          {!isMediaPlayerActive && <Footer />}
        </div>
      </MediaProvider>
    );
  }

  if (!movieData) {
    return (
      <MediaProvider>
        <div className="app">
          {!isMediaPlayerActive && <NavBar onClearSearch={handleNavBarClear} />}
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Movie or show not found.
            <br />
            <button onClick={handleClearMovie} style={{ marginTop: '10px' }}>
              Back to Home
            </button>
          </div>
          {!isMediaPlayerActive && <Footer />}
        </div>
      </MediaProvider>
    );
  }

  return (
    <MediaProvider>
      <div className="app">
        {!isMediaPlayerActive && <NavBar onClearSearch={handleNavBarClear} />}
        <ShowDetails 
          movieId={movieData} 
          clearMovie={handleClearMovie} 
          onMediaPlayerStateChange={handleMediaPlayerStateChange}
        />
        {!isMediaPlayerActive && <Footer />}
      </div>
    </MediaProvider>
  );
} 