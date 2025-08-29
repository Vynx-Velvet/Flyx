import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WatchProgressIndicator, { EpisodeProgressOverlay } from './WatchProgressIndicator';
import { getWatchProgress } from '../utils/watchProgressStorage';

/**
 * EpisodeCarousel - Simplified version for debugging
 * 
 * Features:
 * - Basic episode navigation and browsing
 * - User-controlled visibility
 * - Simplified styling to avoid CSS module issues
 */
const EpisodeCarousel = ({
  episodes = [],
  currentEpisode = null,
  onEpisodeSelect = null,
  onEpisodePlay = null,
  onClose = null,
  layout = 'grid',
  showMetadata = true,
  searchEnabled = false,
  filterEnabled = false,
  showId = null, // NEW: Show ID for progress loading
  showProgress = true // NEW: Toggle progress display
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [episodeProgresses, setEpisodeProgresses] = useState({}); // NEW: Episode progress storage
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0); // NEW: Current season tab

  // Organize episodes by season and determine current season
  const seasonsData = useMemo(() => {
    if (!Array.isArray(episodes)) return [];
    
    const seasons = episodes.map(season => ({
      ...season,
      episodes: season.episodes || []
    }));

    // Find current season based on currentEpisode
    if (currentEpisode && seasons.length > 0) {
      const currentSeasonIndex = seasons.findIndex(season =>
        season.number === parseInt(currentEpisode.seasonId) ||
        season.number === currentEpisode.seasonNumber
      );
      
      if (currentSeasonIndex !== -1) {
        setSelectedSeasonIndex(currentSeasonIndex);
      }
    }

    return seasons;
  }, [episodes, currentEpisode]);

  // Get episodes for the selected season with search filter
  const filteredEpisodes = useMemo(() => {
    if (!seasonsData[selectedSeasonIndex]) return [];
    
    let seasonEpisodes = seasonsData[selectedSeasonIndex].episodes || [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      seasonEpisodes = seasonEpisodes.filter(episode =>
        episode.title?.toLowerCase().includes(query) ||
        episode.description?.toLowerCase().includes(query) ||
        episode.number?.toString().includes(query)
      );
    }

    return seasonEpisodes.map(episode => ({
      ...episode,
      seasonTitle: seasonsData[selectedSeasonIndex].title,
      seasonNumber: seasonsData[selectedSeasonIndex].number
    }));
  }, [seasonsData, selectedSeasonIndex, searchQuery]);

  // Check if episode is currently playing
  const isCurrentEpisode = useCallback((episode) => {
    if (!currentEpisode) return false;
    return (
      episode.seasonNumber === (parseInt(currentEpisode.seasonId) || currentEpisode.seasonNumber) &&
      episode.number === (parseInt(currentEpisode.episodeId) || currentEpisode.episodeNumber)
    );
  }, [currentEpisode]);

  // Load episode progress data - NEW
  useEffect(() => {
    if (!showProgress || !showId || !episodes.length) return;

    const progresses = {};
    
    episodes.forEach(season => {
      if (season.episodes && Array.isArray(season.episodes)) {
        season.episodes.forEach(episode => {
          const progress = getWatchProgress(
            'tv',
            showId,
            episode.seasonNumber || season.number,
            episode.number
          );
          
          if (progress.isStarted) {
            const key = `${episode.seasonNumber || season.number}_${episode.number}`;
            progresses[key] = progress;
          }
        });
      }
    });
    
    setEpisodeProgresses(progresses);
    console.log('📊 Loaded episode carousel progress:', progresses);
  }, [episodes, showId, showProgress]);

  // Helper to get episode progress
  const getEpisodeProgress = useCallback((episode) => {
    const key = `${episode.seasonNumber}_${episode.number}`;
    return episodeProgresses[key] || null;
  }, [episodeProgresses]);

  // Format duration helper
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Inline styles for debugging
  const containerStyle = {
    position: 'fixed',
    bottom: '120px',
    left: '2rem',
    right: '2rem',
    maxHeight: '60vh',
    zIndex: 50,
    background: 'rgba(0, 0, 0, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
    color: 'white'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)'
  };

  const titleStyle = {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0
  };

  const closeButtonStyle = {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '6px 10px',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const contentStyle = {
    padding: '1rem',
    maxHeight: '40vh',
    overflowY: 'auto'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem'
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const thumbnailStyle = {
    position: 'relative',
    width: '100%',
    height: '120px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const metadataStyle = {
    padding: '1rem'
  };

  const episodeNumberStyle = {
    fontSize: '12px',
    color: '#00f5ff',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem'
  };

  const episodeTitleStyle = {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 0.5rem 0',
    lineHeight: '1.3'
  };

  const episodeDescStyle = {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: '1.4',
    margin: '0 0 0.5rem 0'
  };

  const emptyStateStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    textAlign: 'center'
  };

  // Season tab styles
  const seasonTabsStyle = {
    display: 'flex',
    overflowX: 'auto',
    padding: '0 1rem',
    gap: '0.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.02)'
  };

  const seasonTabStyle = {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease'
  };

  const activeSeasonTabStyle = {
    ...seasonTabStyle,
    color: '#00f5ff',
    borderBottomColor: '#00f5ff'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          {seasonsData[selectedSeasonIndex]?.title || `Season ${selectedSeasonIndex + 1}`} Episodes ({filteredEpisodes.length})
        </h2>
        
        {onClose && (
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 0, 110, 0.1)';
              e.target.style.borderColor = '#ff006e';
              e.target.style.color = '#ff006e';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.target.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
            aria-label="Close episode list"
            title="Close episode list (E key)"
          >
            ✕
          </button>
        )}
      </div>

      {/* Season Tabs */}
      {seasonsData.length > 1 && (
        <div style={seasonTabsStyle}>
          {seasonsData.map((season, index) => (
            <button
              key={season.number || index}
              style={index === selectedSeasonIndex ? activeSeasonTabStyle : seasonTabStyle}
              onClick={() => setSelectedSeasonIndex(index)}
              onMouseEnter={(e) => {
                if (index !== selectedSeasonIndex) {
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (index !== selectedSeasonIndex) {
                  e.target.style.color = 'rgba(255, 255, 255, 0.6)';
                }
              }}
            >
              {season.title || `Season ${season.number || index + 1}`}
              <span style={{
                marginLeft: '6px',
                fontSize: '12px',
                opacity: 0.7
              }}>
                ({season.episodes?.length || 0})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={contentStyle}>
        {filteredEpisodes.length === 0 ? (
          <div style={emptyStateStyle}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📺</span>
            <h3>No episodes found</h3>
            <p>Loading episode data...</p>
          </div>
        ) : (
          <div style={gridStyle}>
            {filteredEpisodes.map((episode, index) => {
              const episodeProgress = showProgress ? getEpisodeProgress(episode) : null;
              const isCurrent = isCurrentEpisode(episode);
              
              // Dynamic card style based on current episode status
              const dynamicCardStyle = {
                ...cardStyle,
                border: isCurrent ? '2px solid #ff006e' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isCurrent ? 'rgba(255, 0, 110, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                boxShadow: isCurrent ? '0 0 20px rgba(255, 0, 110, 0.3)' : 'none'
              };
              
              return (
                <motion.div
                  key={episode.id || index}
                  style={dynamicCardStyle}
                  whileHover={{
                    transform: 'translateY(-2px)',
                    borderColor: isCurrent ? '#ff006e' :
                               episodeProgress?.isCompleted ? '#00ff88' : '#00f5ff',
                    boxShadow: isCurrent ? '0 4px 25px rgba(255, 0, 110, 0.4)' :
                              episodeProgress?.isCompleted
                                ? '0 4px 20px rgba(0, 255, 136, 0.2)'
                                : '0 4px 20px rgba(0, 245, 255, 0.2)'
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (onEpisodeSelect) {
                      onEpisodeSelect(episode);
                    }
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ ...thumbnailStyle, position: 'relative' }}>
                    {episode.thumbnail ? (
                      <img
                        src={episode.thumbnail}
                        alt={episode.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <span style={{ fontSize: '2rem', opacity: 0.5 }}>🎬</span>
                    )}
                    
                    {/* Watch Progress Overlay - NEW */}
                    {episodeProgress && (
                      <EpisodeProgressOverlay
                        progress={episodeProgress.progress}
                        isCompleted={episodeProgress.isCompleted}
                        isStarted={episodeProgress.isStarted}
                      />
                    )}
                    
                    {/* Progress Badge - NEW */}
                    {episodeProgress && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        zIndex: 3
                      }}>
                        <WatchProgressIndicator
                          progress={episodeProgress.progress}
                          isCompleted={episodeProgress.isCompleted}
                          isStarted={episodeProgress.isStarted}
                          mode="badge"
                          size="small"
                          animate={false}
                          theme="dark"
                        />
                      </div>
                    )}
                    
                    {/* Currently Playing Indicator */}
                    {isCurrent && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#ff006e',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '600',
                        zIndex: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        NOW PLAYING
                      </div>
                    )}
                    
                    {/* Duration badge */}
                    {episode.duration > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        zIndex: 2
                      }}>
                        {formatDuration(episode.duration)}
                      </div>
                    )}
                  </div>

                {/* Metadata */}
                {showMetadata && (
                  <div style={metadataStyle}>
                    <div style={{
                      ...episodeNumberStyle,
                      color: isCurrent ? '#ff006e' : '#00f5ff'
                    }}>
                      S{episode.seasonNumber}E{episode.number}
                      {isCurrent && <span style={{ marginLeft: '8px' }}>▶ PLAYING</span>}
                    </div>
                    <h3 style={{
                      ...episodeTitleStyle,
                      color: isCurrent ? '#ff006e' : 'white'
                    }}>{episode.title}</h3>
                    {episode.description && (
                      <p style={episodeDescStyle}>
                        {episode.description.substring(0, 100)}
                        {episode.description.length > 100 ? '...' : ''}
                      </p>
                    )}
                    
                    {/* Progress Info - NEW */}
                    {episodeProgress && (
                      <div style={{
                        marginBottom: '8px',
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0, 245, 255, 0.1)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: episodeProgress.isCompleted ? '#00ff88' : '#00f5ff',
                        fontWeight: '600'
                      }}>
                        {episodeProgress.isCompleted ? '✓ Completed' :
                          episodeProgress.canResume ? `Resume ${Math.round(episodeProgress.progress * 100)}%` :
                          `${Math.round(episodeProgress.progress * 100)}% watched`}
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      {episode.airDate && (
                        <span>
                          {new Date(episode.airDate).getFullYear()}
                        </span>
                      )}
                      {episode.rating && (
                        <span>
                          ⭐ {episode.rating.toFixed(1)}
                        </span>
                      )}
                      {episodeProgress && (
                        <span style={{
                          color: episodeProgress.isCompleted ? '#00ff88' : '#00f5ff',
                          fontSize: '10px'
                        }}>
                          Last watched {new Date(episodeProgress.lastWatched).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EpisodeCarousel;