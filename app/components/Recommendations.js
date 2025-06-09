'use client';

import React, { useState, useEffect } from 'react';
import './Recommendations.css';
import { useRouter } from 'next/navigation';

const Recommendations = ({ contentId, contentType, title = "You Might Also Like" }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        if (!contentId || !contentType) return;
        
        fetchRecommendations();
    }, [contentId, contentType]);

    const fetchRecommendations = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Try recommendations first, then fall back to similar content
            const actions = contentType === 'movie' 
                ? ['getMovieRecommendations', 'getSimilarMovies']
                : ['getTVRecommendations', 'getSimilarTV'];
            
            let data = null;
            
            for (const action of actions) {
                const response = await fetch(`/api/tmdb?action=${action}&movieId=${contentId}`);
                const result = await response.json();
                
                if (result.results && result.results.length > 0) {
                    data = result;
                    break;
                }
            }
            
            if (data && data.results) {
                setRecommendations(data.results.slice(0, 20)); // Limit to 20 items
            } else {
                setRecommendations([]);
            }
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError('Failed to load recommendations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemClick = (item) => {
        // Ensure media_type is present, fallback to contentType or detect from data structure
        const mediaType = item.media_type || contentType || (item.title ? 'movie' : 'tv');
        router.push(`/details/${item.id}?type=${mediaType}`);
    };

    const getTitle = (item) => {
        return item.title || item.name || 'Unknown Title';
    };

    const getReleaseYear = (item) => {
        const date = item.release_date || item.first_air_date;
        return date ? new Date(date).getFullYear() : '';
    };

    const getRating = (item) => {
        return item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    };

    if (isLoading) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">{title}</h2>
                <div className="recommendations-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading recommendations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recommendations-container">
                <h2 className="recommendations-title">{title}</h2>
                <div className="recommendations-error">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return null; // Don't show the section if no recommendations
    }

    return (
        <div className="recommendations-container">
            <h2 className="recommendations-title">{title}</h2>
            <div className="recommendations-grid">
                {recommendations.map((item) => (
                    <div
                        key={item.id}
                        className="recommendation-card"
                        onClick={() => handleItemClick(item)}
                    >
                        <div className="recommendation-poster">
                            {item.poster_path ? (
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                                    alt={getTitle(item)}
                                    loading="lazy"
                                />
                            ) : (
                                <div className="no-poster">
                                    <span>No Image</span>
                                </div>
                            )}
                            <div className="recommendation-overlay">
                                <div className="recommendation-info">
                                    <h3 className="recommendation-title">{getTitle(item)}</h3>
                                    <div className="recommendation-meta">
                                        <span className="recommendation-year">{getReleaseYear(item)}</span>
                                        <span className="recommendation-rating">★ {getRating(item)}</span>
                                    </div>
                                    <span className="recommendation-type">
                                        {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Recommendations; 