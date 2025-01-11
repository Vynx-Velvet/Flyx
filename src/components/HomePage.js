import React, { useState } from "react";
import "./HomePage.css"
import Results from "./Results";
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults"; // New component to display search results

const HomePage = ({ movieClick }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return (
    <div className="home-page">
      <SearchBar onSearch={handleSearch} />
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
  );
};

export default HomePage;
 