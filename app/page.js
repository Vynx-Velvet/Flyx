'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from './components/HomePage';
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import { MediaProvider } from './context/MediaContext';
import { UniversalMediaProvider } from './context/UniversalMediaContext';

export default function Home() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMovieClick = (movieData) => {
    console.log('handleMovieClick called with:', movieData);
    if (movieData && movieData.id && movieData.media_type) {
      console.log('Navigating to details page for:', movieData.media_type, movieData.id);
      router.push(`/details/${movieData.id}?type=${movieData.media_type}`);
    } else {
      console.error('Invalid movie data or missing media_type:', movieData);
    }
  };

  const handleClearSearch = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <MediaProvider>
      <UniversalMediaProvider>
        <div className="app">
          <NavBar onClearSearch={handleClearSearch} />
          <HomePage key={refreshKey} movieClick={handleMovieClick} />
          <Footer />
        </div>
      </UniversalMediaProvider>
    </MediaProvider>
  );
} 