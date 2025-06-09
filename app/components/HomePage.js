'use client'

import React, { useState } from 'react';
import "./HomePage.css"
import Results from "./Results";
import SearchBar from "./SearchBar";
import SearchResults from './SearchResults';

const HomePage = ({ movieClick }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="hero-highlight">Flyx</span>
          </h1>
          <p className="hero-description">
            Your gateway to unlimited entertainment. Search and discover movies and TV shows with our clean, secure streaming platform.
          </p>
          <div className="hero-search">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="content-section">
        <div className="trending-sections">
          {searchQuery ? (
            <SearchResults query={searchQuery} movieClick={movieClick} />
          ) : (
            <>
              <Results movieClick={movieClick} category="Trending Today" />
              <Results movieClick={movieClick} category="Trending This Week" />
              <Results movieClick={movieClick} category="Popular Anime" />
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
 