import React, { useState, useCallback } from 'react';
import FuturisticMediaPlayer from './FuturisticMediaPlayer';

/**
 * FuturisticMediaPlayerDemo - Complete demonstration of the futuristic media player
 * 
 * This demo showcases all the advanced features including:
 * - AI-powered adaptive streaming and quality selection
 * - Intelligent subtitle positioning with content awareness
 * - Immersive ambient lighting synchronized to video content
 * - Advanced gesture and voice control systems
 * - Real-time performance analytics and user behavior tracking
 * - Smart buffering with predictive loading
 * - Dynamic UI adaptation based on content type and user preferences
 * - Comprehensive accessibility features with AI narration
 * - Glassmorphism design with particle effects
 * - Cross-platform compatibility and responsive design
 */
const FuturisticMediaPlayerDemo = () => {
  // Demo state management
  const [currentMedia, setCurrentMedia] = useState({
    type: 'movie', // 'movie' or 'tv'
    movieId: 'demo_movie_001',
    seasonId: null,
    episodeId: null,
    title: 'Demo Movie: Future Vision',
    description: 'A demonstration of cutting-edge media player technology'
  });

  const [playerConfig, setPlayerConfig] = useState({
    enableAdvancedFeatures: true,
    theme: 'dark', // 'dark', 'light', 'auto'
    ambientLighting: true,
    gestureControls: true,
    voiceControls: true,
    adaptiveQuality: true,
    collaborativeMode: false
  });

  const [demoMode, setDemoMode] = useState('showcase'); // 'showcase', 'testing', 'analytics'
  const [showSettings, setShowSettings] = useState(false);

  // Sample media content for demonstration
  const demoContent = {
    movies: [
      {
        id: 'demo_movie_001',
        title: 'Future Vision',
        description: 'A sci-fi thriller showcasing futuristic technology',
        duration: 7200, // 2 hours
        genre: 'Sci-Fi',
        year: 2024,
        rating: 8.5
      },
      {
        id: 'demo_movie_002',
        title: 'Quantum Dreams',
        description: 'An exploration of quantum mechanics through cinema',
        duration: 6300, // 1.75 hours
        genre: 'Drama',
        year: 2024,
        rating: 9.1
      }
    ],
    tvShows: [
      {
        id: 'demo_tv_001',
        title: 'Tech Chronicles',
        description: 'A series about technological advancement',
        seasons: [
          {
            id: 'season_01',
            number: 1,
            episodes: [
              { id: 'ep_01', number: 1, title: 'The Beginning', duration: 2700 },
              { id: 'ep_02', number: 2, title: 'Evolution', duration: 2850 },
              { id: 'ep_03', number: 3, title: 'Revolution', duration: 2920 }
            ]
          }
        ]
      }
    ]
  };

  // Handle media selection
  const handleMediaSelect = useCallback((type, id, seasonId = null, episodeId = null) => {
    let selectedMedia;
    
    if (type === 'movie') {
      selectedMedia = demoContent.movies.find(m => m.id === id);
    } else {
      selectedMedia = demoContent.tvShows.find(s => s.id === id);
    }

    setCurrentMedia({
      type,
      movieId: id,
      seasonId,
      episodeId,
      title: selectedMedia?.title || 'Unknown',
      description: selectedMedia?.description || 'No description available'
    });
  }, []);

  // Handle episode changes for TV shows
  const handleEpisodeChange = useCallback((seasonId, episodeId) => {
    setCurrentMedia(prev => ({
      ...prev,
      seasonId,
      episodeId
    }));
  }, []);

  // Handle back to content selection
  const handleBackToSelection = useCallback(() => {
    setCurrentMedia({
      type: 'movie',
      movieId: null,
      seasonId: null,
      episodeId: null,
      title: '',
      description: ''
    });
  }, []);

  // Toggle configuration options
  const toggleConfig = useCallback((key) => {
    setPlayerConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  // Change theme
  const changeTheme = useCallback((theme) => {
    setPlayerConfig(prev => ({
      ...prev,
      theme
    }));
  }, []);

  // Render content selection screen
  const renderContentSelection = () => (
    <div className="demo-content-selection">
      <div className="demo-header">
        <h1>🚀 Futuristic Media Player Demo</h1>
        <p>Experience the future of video playback with AI-powered features</p>
      </div>

      <div className="demo-controls">
        <div className="demo-modes">
          <button 
            onClick={() => setDemoMode('showcase')}
            className={demoMode === 'showcase' ? 'active' : ''}
          >
            🎬 Showcase Mode
          </button>
          <button 
            onClick={() => setDemoMode('testing')}
            className={demoMode === 'testing' ? 'active' : ''}
          >
            🧪 Testing Mode
          </button>
          <button 
            onClick={() => setDemoMode('analytics')}
            className={demoMode === 'analytics' ? 'active' : ''}
          >
            📊 Analytics Demo
          </button>
        </div>

        <div className="demo-settings">
          <button onClick={() => setShowSettings(!showSettings)}>
            ⚙️ Configuration
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="demo-config-panel">
          <h3>Player Configuration</h3>
          <div className="config-options">
            <label>
              <input
                type="checkbox"
                checked={playerConfig.enableAdvancedFeatures}
                onChange={() => toggleConfig('enableAdvancedFeatures')}
              />
              Enable Advanced Features (AI, Analytics, etc.)
            </label>
            <label>
              <input
                type="checkbox"
                checked={playerConfig.ambientLighting}
                onChange={() => toggleConfig('ambientLighting')}
              />
              Ambient Lighting Effects
            </label>
            <label>
              <input
                type="checkbox"
                checked={playerConfig.gestureControls}
                onChange={() => toggleConfig('gestureControls')}
              />
              Gesture Controls
            </label>
            <label>
              <input
                type="checkbox"
                checked={playerConfig.voiceControls}
                onChange={() => toggleConfig('voiceControls')}
              />
              Voice Controls
            </label>
            <label>
              <input
                type="checkbox"
                checked={playerConfig.adaptiveQuality}
                onChange={() => toggleConfig('adaptiveQuality')}
              />
              Adaptive Quality
            </label>
            <label>
              <input
                type="checkbox"
                checked={playerConfig.collaborativeMode}
                onChange={() => toggleConfig('collaborativeMode')}
              />
              Collaborative Mode (A/B Testing)
            </label>
          </div>
          
          <div className="theme-selector">
            <h4>Theme</h4>
            {['dark', 'light', 'auto'].map(theme => (
              <button
                key={theme}
                onClick={() => changeTheme(theme)}
                className={playerConfig.theme === theme ? 'active' : ''}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="demo-content">
        <div className="content-section">
          <h3>🎬 Movies</h3>
          <div className="content-grid">
            {demoContent.movies.map(movie => (
              <div key={movie.id} className="content-card">
                <div className="content-info">
                  <h4>{movie.title}</h4>
                  <p>{movie.description}</p>
                  <div className="content-meta">
                    <span>{movie.genre}</span>
                    <span>{movie.year}</span>
                    <span>⭐ {movie.rating}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleMediaSelect('movie', movie.id)}
                  className="play-button"
                >
                  ▶️ Play Movie
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="content-section">
          <h3>📺 TV Shows</h3>
          <div className="content-grid">
            {demoContent.tvShows.map(show => (
              <div key={show.id} className="content-card">
                <div className="content-info">
                  <h4>{show.title}</h4>
                  <p>{show.description}</p>
                  <div className="content-meta">
                    <span>{show.seasons.length} Season{show.seasons.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="episode-selector">
                  {show.seasons.map(season => (
                    <div key={season.id} className="season-episodes">
                      <h5>Season {season.number}</h5>
                      {season.episodes.map(episode => (
                        <button
                          key={episode.id}
                          onClick={() => handleMediaSelect('tv', show.id, season.id, episode.id)}
                          className="episode-button"
                        >
                          S{season.number}E{episode.number}: {episode.title}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="demo-features">
        <h3>✨ Available Features</h3>
        <div className="features-grid">
          <div className="feature-card">
            <h4>🤖 AI-Powered Adaptation</h4>
            <p>Intelligent quality selection, scene detection, and user behavior learning</p>
          </div>
          <div className="feature-card">
            <h4>🎨 Immersive Effects</h4>
            <p>Ambient lighting, particle systems, and glassmorphism design</p>
          </div>
          <div className="feature-card">
            <h4>🎮 Advanced Controls</h4>
            <p>Gesture recognition, voice commands, and smart UI adaptation</p>
          </div>
          <div className="feature-card">
            <h4>📊 Analytics & Insights</h4>
            <p>User behavior tracking, performance metrics, and predictive analytics</p>
          </div>
          <div className="feature-card">
            <h4>📱 Cross-Platform</h4>
            <p>Responsive design, picture-in-picture, and multi-device sync</p>
          </div>
          <div className="feature-card">
            <h4>♿ Accessibility</h4>
            <p>AI narration, content-aware subtitles, and comprehensive keyboard support</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .demo-content-selection {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          font-family: 'Arial', sans-serif;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .demo-header h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .demo-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1rem;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .demo-modes {
          display: flex;
          gap: 1rem;
        }

        .demo-modes button, .demo-settings button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .demo-modes button:hover, .demo-settings button:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }

        .demo-modes button.active {
          background: rgba(255,255,255,0.4);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .demo-config-panel {
          background: rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }

        .config-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .config-options label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .theme-selector {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .theme-selector button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          background: rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
        }

        .theme-selector button.active {
          background: rgba(255,255,255,0.4);
        }

        .content-section {
          margin-bottom: 3rem;
        }

        .content-section h3 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .content-card {
          background: rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          transition: transform 0.3s ease;
        }

        .content-card:hover {
          transform: translateY(-5px);
        }

        .content-info h4 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .content-meta {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .play-button, .episode-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          background: #4CAF50;
          color: white;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.3s ease;
        }

        .play-button:hover, .episode-button:hover {
          background: #45a049;
          transform: translateY(-2px);
        }

        .episode-selector {
          margin-top: 1rem;
        }

        .season-episodes h5 {
          margin: 1rem 0 0.5rem 0;
        }

        .episode-button {
          display: block;
          width: 100%;
          margin: 0.5rem 0;
          text-align: left;
          background: rgba(76, 175, 80, 0.8);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          background: rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          text-align: center;
        }

        .feature-card h4 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .demo-content-selection {
            padding: 1rem;
          }
          
          .demo-header h1 {
            font-size: 2rem;
          }
          
          .demo-controls {
            flex-direction: column;
            gap: 1rem;
          }
          
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );

  // Main render
  if (!currentMedia.movieId) {
    return renderContentSelection();
  }

  return (
    <div className="demo-player-container">
      <FuturisticMediaPlayer
        mediaType={currentMedia.type}
        movieId={currentMedia.movieId}
        seasonId={currentMedia.seasonId}
        episodeId={currentMedia.episodeId}
        onBackToShowDetails={handleBackToSelection}
        onEpisodeChange={handleEpisodeChange}
        enableAdvancedFeatures={playerConfig.enableAdvancedFeatures}
        theme={playerConfig.theme}
        ambientLighting={playerConfig.ambientLighting}
        gestureControls={playerConfig.gestureControls}
        voiceControls={playerConfig.voiceControls}
        adaptiveQuality={playerConfig.adaptiveQuality}
        collaborativeMode={playerConfig.collaborativeMode}
      />
      
      <style jsx>{`
        .demo-player-container {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default FuturisticMediaPlayerDemo;