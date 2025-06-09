'use client'

import React, { useState, useEffect, useCallback } from "react";
import "./SearchResults.css"

const SearchResults = ({ query, movieClick }) => {
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchSearchResults = async (pageNumber) => {
    if (!query || !hasMore || loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/tmdb?action=search&query=${encodeURIComponent(
          query
        )}&pageNumber=${pageNumber}`
      );
      const data = await response.json();

      // Filter out people from the results (only include movies and TV shows)
      const filteredResults = (data.results || []).filter(
        (result) => result.media_type === "movie" || result.media_type === "tv"
      );

      // Append new results only if they're not duplicates
      setResults((prevResults) => [
        ...prevResults,
        ...filteredResults.filter(
          (newResult) => !prevResults.some((r) => r.id === newResult.id)
        ),
      ]);

      // Update hasMore if there are more pages to fetch and results still available
      setHasMore(pageNumber < data.total_pages && filteredResults.length > 0);

      // Handle case where the first few pages don't fill the viewport
      if (filteredResults.length > 0 && document.documentElement.scrollHeight <= window.innerHeight) {
        setCurrentPage((prevPage) => prevPage + 1); // Fetch the next page
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(() => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 50 && !loading && hasMore) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    // Reset results when the query changes
    setResults([]);
    setCurrentPage(1);
    setHasMore(true);
  }, [query]);

  useEffect(() => {
    // Fetch results whenever query or current page changes
    fetchSearchResults(currentPage);
    // eslint-disable-next-line
  }, [query, currentPage]);

  useEffect(() => {
    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <div className="search-results">
      {results.length > 0 ? (
        <div className="results-container">
          <div className="results-grid">
            {results.map((result) =>
              result.poster_path ? (
                <div
                  key={result.id}
                  className="result-item"
                  onClick={() => {
                    console.log('Search result clicked:', result);
                    console.log('movieClick function:', movieClick);
                    
                    // Ensure media_type is present, fallback logic
                    const resultWithType = {
                      ...result,
                      media_type: result.media_type || (result.title ? 'movie' : 'tv')
                    };
                    
                    if (movieClick) {
                      movieClick(resultWithType);
                    } else {
                      console.error('movieClick function is not defined');
                    }
                  }}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
                    alt={result.title || result.name}
                  />
                  <h3>{result.title || result.name}</h3>
                </div>
              ) : null
            )}
          </div>
          {loading && <p>Loading more...</p>}
        </div>
      ) : (
        <p>{loading ? "Loading..." : "No results found."}</p>
      )}
    </div>
  );
};

export default SearchResults;
