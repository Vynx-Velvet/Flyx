'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from './components/HomePage';
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import { MediaProvider } from './context/MediaContext';

export default function Home() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMovieClick = (movieData) => {
    if (movieData && movieData.id) {
      router.push(`/details/${movieData.id}`);
    }
  };

  const handleClearSearch = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <MediaProvider>
      <div className="app">
        <NavBar onClearSearch={handleClearSearch} />
        <HomePage key={refreshKey} movieClick={handleMovieClick} />
        <Footer />
      </div>
    </MediaProvider>
  );
} 