'use client'

import React, { useState } from "react";
import "./SearchBar.css"

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (onSearch && query.trim()) {
      onSearch(query);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  return (
    <div className="search-bar">
      <div className={`search-container ${query ? 'has-value' : ''}`}>
      <input
        type="text"
          className="search-input"
          placeholder="Search movies, shows, anime..."
        value={query}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
        <button className="search-button" onClick={handleSearch}>
          <span className="search-icon">🔍</span>
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
