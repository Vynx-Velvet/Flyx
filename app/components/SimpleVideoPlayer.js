'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimpleSubtitles } from './SimpleVideoPlayer/hooks/useSimpleSubtitles';
import SubtitleControls from './SimpleVideoPlayer/components/SubtitleControls';

/**
 * Enhanced SimpleVideoPlayer - Fixed Core + Modern UI
 * 
 * ✨ Modern design with beautiful animations
 * 📺 Auto-queue next episode (30 seconds before end)  
 * 🎮 Enhanced controls with smooth interactions
 * 📱 Responsive and accessible design
 * 🔄 Seamless episode navigation
 */
const SimpleVideoPlayer = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  onBackToShowDetails
}) => {
  // Core refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  // Core state (keep original working logic)
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hlsInstance, setHlsInstance] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaDetails, setMediaDetails] = useState(null);
  
  // Enhanced features
  const [showEpisodeCarousel, setShowEpisodeCarousel] = useState(false);
  const [showAutoQueuePrompt, setShowAutoQueuePrompt] = useState(false);
  const [autoQueueCountdown, setAutoQueueCountdown] = useState(30);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [currentSeasonId, setCurrentSeasonId] = useState(seasonId);
  const [currentEpisodeId, setCurrentEpisodeId] = useState(episodeId);

  // Subtitle functionality
  const subtitleHook = useSimpleSubtitles({
    imdbId: mediaDetails?.imdb_id,
    season: mediaType === 'tv' ? currentSeasonId : null,
    episode: mediaType === 'tv' ? currentEpisodeId : null,
    videoRef,
    enabled: true
  });

  // Update current episode ID when props change
  useEffect(() => {
    setCurrentEpisodeId(episodeId);
  }, [episodeId]);

  // Fetch media details for subtitle functionality
  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (!movieId) return;

      try {
        const action = mediaType === 'tv' ? 'getShowDetails' : 'getMovieDetails';
        const response = await fetch(`/api/tmdb?action=${action}&movieId=${movieId}`);
        
        if (response.ok) {
          const data = await response.json();
          setMediaDetails(data);
          console.log('📺 Media details loaded for subtitles:', {
            title: data.title || data.name,
            imdbId: data.imdb_id,
            mediaType
          });
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch media details for subtitles:', err);
      }
    };

    fetchMediaDetails();
  }, [movieId, mediaType]);

  // CORE FUNCTIONALITY - Keep original working stream extraction
  useEffect(() => {
    const extractStream = async () => {
      try {
        console.log('🔄 [DEBUG] Starting stream extraction...', {
          movieId,
          mediaType,
          currentSeasonId,
          currentEpisodeId,
          loadingState: loading
        });
        
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          tmdbId: movieId.toString(),
          ...(mediaType === 'tv' && {
            season: currentSeasonId.toString(),
            episode: currentEpisodeId.toString()
          })
        });

        console.log('📡 [DEBUG] Fetching stream with params:', params.toString());

        const response = await fetch(`/api/extract-shadowlands?${params}`);
        const data = await response.json();

        console.log('📊 [DEBUG] Stream extraction response:', {
          success: data.success,
          hasStreamUrl: !!data.streamUrl,
          error: data.error
        });

        if (data.success && data.streamUrl) {
          const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(data.streamUrl)}&source=shadowlands`;
          console.log('🔗 [DEBUG] Setting proxy URL:', proxyUrl);
          setStreamUrl(proxyUrl);
          console.log('⚠️ [DEBUG] Loading state still TRUE - waiting for video ready...');
        } else {
          console.error('❌ [DEBUG] Stream extraction failed:', data.error || 'No stream URL');
          setError(data.error || 'Failed to extract stream');
          setLoading(false);
        }
      } catch (err) {
        console.error('💥 [DEBUG] Stream extraction error:', err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    if (movieId) {
      extractStream();
    }
  }, [movieId, mediaType, currentSeasonId, currentEpisodeId]);

  // CORE FUNCTIONALITY - Fetch show data and seasons (original working logic)
  useEffect(() => {
    const fetchShowData = async () => {
      if (mediaType !== 'tv' || !movieId) return;

      try {
        setEpisodesLoading(true);
        
        const showResponse = await fetch(`/api/tmdb?action=getShowDetails&movieId=${movieId}`);
        if (!showResponse.ok) {
          throw new Error(`Failed to fetch show details: ${showResponse.status}`);
        }

        const showData = await showResponse.json();

        if (showData.seasons && Array.isArray(showData.seasons)) {
          const validSeasons = showData.seasons
            .filter(season => season.season_number > 0)
            .sort((a, b) => a.season_number - b.season_number);

          setSeasons(validSeasons);

          // Set current season
          const currentSeason = validSeasons.find(s => s.season_number === parseInt(seasonId)) || validSeasons[0];
          if (currentSeason) {
            setSelectedSeason(currentSeason);
            setCurrentSeasonId(currentSeason.season_number.toString());
          }
        }
      } catch (err) {
        console.error('Error fetching show data:', err);
        setEpisodesLoading(false);
      }
    };

    fetchShowData();
  }, [mediaType, movieId, seasonId]);

  // Fetch episodes for selected season (original working logic)
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!selectedSeason || !movieId) return;

      try {
        setEpisodesLoading(true);

        const response = await fetch(`/api/tmdb?action=getSeasonDetails&movieId=${movieId}&seasonId=${selectedSeason.season_number}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.episodes && Array.isArray(data.episodes)) {
          setEpisodes(data.episodes);
        } else {
          // Fallback
          const fallbackEpisodes = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Episode ${i + 1}`,
            overview: `Episode ${i + 1} description`,
            episode_number: i + 1,
            season_number: selectedSeason.season_number,
            still_path: null,
            air_date: '2023-01-01'
          }));
          setEpisodes(fallbackEpisodes);
        }
      } catch (err) {
        console.error('Error fetching episodes:', err);
      } finally {
        setEpisodesLoading(false);
      }
    };

    fetchEpisodes();
  }, [selectedSeason, movieId]);

  // CORE FUNCTIONALITY - Video setup (original working logic)
  useEffect(() => {
    console.log('🔍 [DEBUG] Video setup effect triggered:', {
      hasStreamUrl: !!streamUrl,
      hasVideoRef: !!videoRef.current,
      streamUrl: streamUrl ? streamUrl.substring(0, 100) + '...' : null
    });

    if (!streamUrl || !videoRef.current) {
      console.log('⚠️ [DEBUG] Video setup skipped:', {
        hasStreamUrl: !!streamUrl,
        hasVideoRef: !!videoRef.current
      });
      return;
    }

    // **CRITICAL FIX: Prevent re-running if already set up**
    if (videoRef.current.src === streamUrl) {
      console.log('✅ [DEBUG] Video already set up with this stream URL, skipping');
      return;
    }

    const video = videoRef.current;
    console.log('🎬 [DEBUG] Setting up video element with stream URL:', streamUrl.substring(0, 100) + '...');

    const handleLoadedMetadata = () => {
      console.log('✅ [DEBUG] Video metadata loaded:', {
        duration: video.duration,
        volume: video.volume,
        muted: video.muted,
        readyState: video.readyState
      });
      setDuration(video.duration);
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleCanPlay = () => {
      console.log('🎯 [DEBUG] Video can play - CLEARING LOADING STATE');
      setLoading(false);
    };

    const handleLoadStart = () => {
      console.log('🔄 [DEBUG] Video load started');
    };

    const handleWaiting = () => {
      console.log('⏳ [DEBUG] Video is waiting/buffering');
    };

    const handlePlaying = () => {
      console.log('▶️ [DEBUG] Video is playing');
      setLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      console.log('🎵 [DEBUG] Video play event fired');
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      console.log('⏸️ [DEBUG] Video pause event fired');
      setIsPlaying(false);
    };
    
    const handleVolumeChange = () => {
      console.log('🔊 [DEBUG] Volume changed:', { volume: video.volume, muted: video.muted });
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = (e) => {
      console.error('💥 [DEBUG] Video element error:', {
        error: e,
        videoError: video.error,
        networkState: video.networkState,
        readyState: video.readyState
      });
    };

    // Add all event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    console.log('🔗 [DEBUG] Setting video src:', streamUrl.substring(0, 100) + '...');
    
    // Set a timeout to clear loading state if video doesn't load within 30 seconds
    const loadingTimeout = setTimeout(() => {
      console.error('⏰ [DEBUG] Video loading timeout - forcing loading state to false');
      setLoading(false);
      setError('Video loading timeout. The stream may be unavailable.');
    }, 30000);

    // Clear timeout when video starts playing
    const clearLoadingTimeout = () => {
      clearTimeout(loadingTimeout);
    };
    video.addEventListener('playing', clearLoadingTimeout);
    video.addEventListener('canplay', clearLoadingTimeout);

    video.src = streamUrl;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('📱 [DEBUG] Using native HLS support');
      video.load();
      return () => {
        clearTimeout(loadingTimeout);
        video.removeEventListener('playing', clearLoadingTimeout);
        video.removeEventListener('canplay', clearLoadingTimeout);
      };
    }

    const loadHLS = async () => {
      try {
        console.log('🔧 [DEBUG] Loading HLS.js library...');
        if (!window.Hls) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.10/dist/hls.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          console.log('✅ [DEBUG] HLS.js library loaded');
        }

        if (window.Hls && window.Hls.isSupported()) {
          console.log('🎯 [DEBUG] HLS.js is supported, initializing...');
          const hls = new window.Hls({
            debug: false,
            enableWorker: true
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            console.log('📋 [DEBUG] HLS manifest parsed successfully');
            // Clear loading state when manifest is parsed
            setLoading(false);
          });

          hls.on(window.Hls.Events.ERROR, (event, data) => {
            console.error('💥 [DEBUG] HLS Error:', {
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              error: data
            });
            if (data.fatal) {
              clearTimeout(loadingTimeout);
              setError(`HLS playback error: ${data.details || data.type}`);
              setLoading(false);
            }
          });

          setHlsInstance(hls);
          console.log('🎬 [DEBUG] HLS instance created and attached');
        } else {
          console.log('⚠️ [DEBUG] HLS.js not supported, using native video load');
          video.load();
        }
      } catch (err) {
        console.error('💥 [DEBUG] HLS loading error:', err);
        video.load();
      }
    };

    loadHLS();

    return () => {
      console.log('🧹 [DEBUG] Cleaning up video event listeners and timeout');
      clearTimeout(loadingTimeout);
      
      // **CRITICAL FIX: Only remove event listeners if video element still exists**
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('volumechange', handleVolumeChange);
        video.removeEventListener('error', handleError);
        video.removeEventListener('playing', clearLoadingTimeout);
        video.removeEventListener('canplay', clearLoadingTimeout);
      }

      // **CRITICAL FIX: Only destroy HLS if it exists AND we're actually unmounting**
      // Don't destroy on every re-render
      if (hlsInstance && !videoRef.current) {
        console.log('🧹 [DEBUG] Destroying HLS instance (component unmounting)');
        try {
          hlsInstance.destroy();
        } catch (err) {
          console.warn('⚠️ [DEBUG] Error destroying HLS:', err);
        }
        setHlsInstance(null);
      }
    };
  }, [streamUrl]); // Keep streamUrl as only dependency

  // NEW: Auto-queue next episode functionality
  useEffect(() => {
    if (!isPlaying || !duration || mediaType !== 'tv' || episodes.length === 0) {
      return;
    }

    const timeRemaining = duration - currentTime;
    const currentEpisodeNumber = parseInt(currentEpisodeId);
    const currentEpisode = episodes.find(ep => ep.episode_number === currentEpisodeNumber);
    const currentIndex = episodes.indexOf(currentEpisode);
    const hasNextEpisode = currentIndex < episodes.length - 1;

    // Show auto-queue prompt 30 seconds before end
    if (timeRemaining <= 30 && timeRemaining > 25 && !showAutoQueuePrompt && hasNextEpisode) {
      setShowAutoQueuePrompt(true);
      setAutoQueueCountdown(Math.ceil(timeRemaining));
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setAutoQueueCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Auto-play next episode
            const nextEpisode = episodes[currentIndex + 1];
            if (nextEpisode) {
              handleEpisodeSelect(nextEpisode);
            }
            setShowAutoQueuePrompt(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }

    // Hide prompt if user seeks away
    if (timeRemaining > 30 && showAutoQueuePrompt) {
      setShowAutoQueuePrompt(false);
    }
  }, [currentTime, duration, isPlaying, currentEpisodeId, episodes, showAutoQueuePrompt, mediaType]);

  // Enhanced controls visibility
  useEffect(() => {
    let controlsTimeout;
    const showControlsTemporarily = () => {
      setShowControls(true);
      clearTimeout(controlsTimeout);
      if (isPlaying) {
        controlsTimeout = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const handleMouseMove = () => showControlsTemporarily();
    const handleMouseLeave = () => {
      if (isPlaying) {
        controlsTimeout = setTimeout(() => setShowControls(false), 1000);
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'e' || e.key === 'E') {
        if (mediaType === 'tv') {
          setShowEpisodeCarousel(prev => !prev);
        }
      }
      if (e.key === 'Escape') {
        setShowEpisodeCarousel(false);
        setShowAutoQueuePrompt(false);
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (videoRef.current) {
          if (isPlaying) {
            videoRef.current.pause();
          } else {
            videoRef.current.play();
          }
        }
      }
      showControlsTemporarily();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      document.removeEventListener('keydown', handleKeyPress);
      clearTimeout(controlsTimeout);
    };
  }, [isPlaying, mediaType]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Player control handlers
  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (volume) => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      setVolume(volume);
      if (volume > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const handleEpisodeSelect = useCallback((episode) => {
    const newSeasonId = selectedSeason?.season_number || episode.season_number || currentSeasonId;
    const newEpisodeId = episode.episode_number;

    setCurrentSeasonId(newSeasonId);
    setCurrentEpisodeId(newEpisodeId);
    setStreamUrl(null);
    setLoading(true);
    setShowEpisodeCarousel(false);
  }, [selectedSeason, currentSeasonId]);

  const cancelAutoQueue = useCallback(() => {
    setShowAutoQueuePrompt(false);
  }, []);

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state - Only show loading screen if we don't have a stream URL yet
  if (loading && !streamUrl) {
    return (
      <div className="video-player-container loading">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loading-screen"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="loading-spinner"
          >
            ⚡
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="loading-text"
          >
            Loading your cinematic experience...
          </motion.div>
        </motion.div>
        
        <style jsx>{`
          .video-player-container.loading {
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .loading-screen {
            text-align: center;
            padding: 2rem;
          }
          .loading-spinner {
            font-size: 4rem;
            margin-bottom: 2rem;
            display: inline-block;
            filter: drop-shadow(0 0 30px #00f5ff);
          }
          .loading-text {
            font-size: 1.4rem;
            font-weight: 300;
            color: #00f5ff;
            letter-spacing: 1px;
            text-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="video-player-container error">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="error-screen"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="error-icon"
          >
            ⚠️
          </motion.div>
          <h2 className="error-title">Streaming Error</h2>
          <p className="error-message">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            🔄 Try Again
          </motion.button>
        </motion.div>
        
        <style jsx>{`
          .video-player-container.error {
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #1a0a0a 0%, #2e1a1a 50%, #3e1616 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
            padding: 2rem;
          }
          .error-screen {
            max-width: 500px;
          }
          .error-icon {
            font-size: 5rem;
            margin-bottom: 2rem;
            filter: drop-shadow(0 0 30px #ff6b6b);
          }
          .error-title {
            font-size: 2.2rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: #ff6b6b;
            text-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
          }
          .error-message {
            font-size: 1.1rem;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 2.5rem;
            line-height: 1.6;
          }
          .retry-button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            border: none;
            border-radius: 15px;
            color: white;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
          }
          .retry-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(255, 107, 107, 0.5);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${isFullscreen ? 'fullscreen' : ''}`}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        position: 'relative',
        cursor: showControls ? 'default' : 'none',
        overflow: 'hidden'
      }}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setTimeout(() => setShowControls(false), 1000)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: isFullscreen ? 'cover' : 'contain',
          backgroundColor: '#000'
        }}
        controls={false}
        autoPlay
        playsInline
        onError={() => setError('Video playback failed')}
      />

      {/* Video Loading Overlay - Shows while video is initializing */}
      <AnimatePresence>
        {loading && streamUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.95)',
              zIndex: 100
            }}
          >
            <div style={{ textAlign: 'center', color: 'white' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid rgba(255, 255, 255, 0.1)',
                  borderTop: '4px solid #00f5ff',
                  borderRadius: '50%',
                  margin: '0 auto 20px'
                }}
              />
              <div style={{ fontSize: '18px', marginBottom: '10px', color: '#00f5ff' }}>
                Initializing Video Player...
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>Loading HLS stream</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Queue Prompt */}
      <AnimatePresence>
        {showAutoQueuePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.95)',
              border: '2px solid rgba(0, 245, 255, 0.4)',
              borderRadius: '24px',
              padding: '2.5rem',
              minWidth: '420px',
              textAlign: 'center',
              backdropFilter: 'blur(25px)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 245, 255, 0.1)',
              zIndex: 100
            }}
          >
            <div style={{ color: 'white' }}>
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  fontSize: '3rem',
                  marginBottom: '1rem',
                  filter: 'drop-shadow(0 0 20px #00f5ff)'
                }}
              >
                ⏭️
              </motion.div>
              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '600',
                margin: '0 0 1rem 0',
                color: '#00f5ff',
                textShadow: '0 0 20px rgba(0, 245, 255, 0.5)'
              }}>
                Up Next
              </h3>
              <div style={{
                fontSize: '1.2rem',
                marginBottom: '1.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '500'
              }}>
                Next episode loading...
              </div>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  fontSize: '1.3rem',
                  marginBottom: '2rem',
                  color: '#00f5ff',
                  fontWeight: '600',
                  textShadow: '0 0 15px rgba(0, 245, 255, 0.8)'
                }}
              >
                Playing in {autoQueueCountdown} seconds
              </motion.div>
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                justifyContent: 'center'
              }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={cancelAutoQueue}
                  style={{
                    padding: '15px 30px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '15px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const currentEpisodeNumber = parseInt(currentEpisodeId);
                    const currentEpisode = episodes.find(ep => ep.episode_number === currentEpisodeNumber);
                    const currentIndex = episodes.indexOf(currentEpisode);
                    const nextEpisode = episodes[currentIndex + 1];
                    if (nextEpisode) {
                      handleEpisodeSelect(nextEpisode);
                    }
                    setShowAutoQueuePrompt(false);
                  }}
                  style={{
                    padding: '15px 30px',
                    background: 'linear-gradient(135deg, #00f5ff, #00d4ff)',
                    border: 'none',
                    borderRadius: '15px',
                    color: '#000',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 25px rgba(0, 245, 255, 0.4)'
                  }}
                >
                  ▶️ Play Now
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Episode Carousel */}
      {(mediaType === 'tv' || episodes.length > 0) && showEpisodeCarousel && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            bottom: '120px',
            left: '2rem',
            right: '2rem',
            maxHeight: '65vh',
            zIndex: 50,
            background: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid rgba(0, 245, 255, 0.3)',
            borderRadius: '20px',
            backdropFilter: 'blur(25px)',
            overflow: 'hidden',
            color: 'white',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem 2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 245, 255, 0.05)'
          }}>
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: '600',
              margin: 0,
              color: '#00f5ff',
              textShadow: '0 0 15px rgba(0, 245, 255, 0.5)'
            }}>
              {selectedSeason ? (selectedSeason.name || `Season ${selectedSeason.season_number}`) : `Season ${currentSeasonId}`} Episodes ({episodes.length})
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'transparent',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                padding: '8px 12px',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              onClick={() => setShowEpisodeCarousel(false)}
            >
              ✕
            </motion.button>
          </div>

          {/* Content */}
          <div style={{
            padding: '1.5rem',
            maxHeight: '45vh',
            overflowY: 'auto'
          }}>
            {episodesLoading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem',
                textAlign: 'center'
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  style={{
                    fontSize: '2.5rem',
                    marginBottom: '1rem',
                    filter: 'drop-shadow(0 0 20px #00f5ff)'
                  }}
                >
                  ⚡
                </motion.div>
                <p>Loading episodes...</p>
              </div>
            ) : episodes.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📺</span>
                <h3>No episodes found</h3>
                <p>Unable to load episode data</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {episodes.map((episode, index) => {
                  const currentSeasonNumber = selectedSeason?.season_number || parseInt(currentSeasonId);
                  const isCurrent = episode.episode_number === parseInt(currentEpisodeId) &&
                                   episode.season_number === currentSeasonNumber;

                  return (
                    <motion.div
                      key={episode.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{
                        scale: 1.02,
                        y: -5
                      }}
                      style={{
                        background: isCurrent ? 'rgba(0, 245, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: isCurrent ? '2px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: isCurrent ? '0 0 30px rgba(0, 245, 255, 0.3)' : 'none'
                      }}
                      onClick={() => handleEpisodeSelect(episode)}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '140px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {episode.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w400${episode.still_path}`}
                            alt={episode.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <span style={{ fontSize: '3rem', opacity: 0.5 }}>🎬</span>
                        )}

                        {/* Currently Playing Indicator */}
                        {isCurrent && (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'linear-gradient(135deg, #00f5ff, #00d4ff)',
                              color: '#000',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              zIndex: 4,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              boxShadow: '0 0 20px rgba(0, 245, 255, 0.6)'
                            }}
                          >
                            ▶ NOW PLAYING
                          </motion.div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{
                          fontSize: '13px',
                          color: isCurrent ? '#00f5ff' : '#00f5ff',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '0.75rem',
                          textShadow: '0 0 10px rgba(0, 245, 255, 0.5)'
                        }}>
                          S{selectedSeason?.season_number || currentSeasonId}E{episode.episode_number}
                        </div>
                        <h3 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          margin: '0 0 0.75rem 0',
                          lineHeight: '1.3',
                          color: isCurrent ? '#00f5ff' : 'white'
                        }}>
                          {episode.name}
                        </h3>
                        {episode.overview && (
                          <p style={{
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: '1.4',
                            margin: '0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {episode.overview}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Enhanced Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.3) 70%, transparent 100%)',
              backdropFilter: 'blur(15px)',
              borderTop: '1px solid rgba(0, 245, 255, 0.1)',
              padding: '3rem 2rem 2rem',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '5px',
                marginBottom: '2rem',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                border: '1px solid rgba(0, 245, 255, 0.2)'
              }}
              onClick={(e) => {
                if (videoRef.current && duration) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const progress = (e.clientX - rect.left) / rect.width;
                  const newTime = progress * duration;
                  videoRef.current.currentTime = newTime;
                }
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                transition={{ duration: 0.1 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #00f5ff 0%, #00d4ff 50%, #00f5ff 100%)',
                  borderRadius: '5px',
                  boxShadow: '0 0 15px rgba(0, 245, 255, 0.6)',
                  position: 'relative'
                }}
              />
              {/* Progress thumb */}
              <motion.div
                animate={{ 
                  left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  left: { duration: 0.1 },
                  scale: { duration: 2, repeat: Infinity }
                }}
                style={{
                  position: 'absolute',
                  top: '-3px',
                  width: '16px',
                  height: '16px',
                  background: '#00f5ff',
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                  boxShadow: '0 0 20px rgba(0, 245, 255, 0.8), 0 0 40px rgba(0, 245, 255, 0.4)',
                  border: '2px solid rgba(255, 255, 255, 0.8)'
                }}
              />
            </div>

            {/* Main Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '2rem'
            }}>
              {/* Left Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Play/Pause */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => isPlaying ? handlePause() : handlePlay()}
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(0,245,255,0.4) 100%)',
                    border: '2px solid rgba(0,245,255,0.6)',
                    borderRadius: '50%',
                    width: '70px',
                    height: '70px',
                    color: 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 25px rgba(0, 245, 255, 0.3)',
                    backdropFilter: 'blur(15px)'
                  }}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </motion.button>

                {/* Skip Controls */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSeek(-10)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  ⏮️ 10s
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSeek(10)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  10s ⏭️
                </motion.button>

                {/* Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '8px'
                    }}
                  >
                    {isMuted || volume === 0 ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
                  </motion.button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      console.log('🎚️ [DEBUG] Volume slider changed:', {
                        newVolume,
                        isMuted,
                        currentVolume: volume
                      });
                      handleVolumeChange(newVolume);
                    }}
                    style={{
                      width: '120px',
                      height: '6px',
                      background: 'rgba(255,255,255,0.3)',
                      outline: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                    onMouseEnter={() => console.log('🎚️ [DEBUG] Volume slider hovered')}
                  />
                </div>

                {/* Time Display */}
                <div style={{
                  color: 'white',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  fontWeight: '500',
                  minWidth: '120px',
                  textShadow: '0 0 10px rgba(255, 255, 255, 0.3)'
                }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Subtitle Controls */}
                <SubtitleControls
                  subtitles={subtitleHook.subtitles}
                  availableLanguages={subtitleHook.availableLanguages}
                  activeSubtitle={subtitleHook.activeSubtitle}
                  subtitlesVisible={subtitleHook.subtitlesVisible}
                  fontSize={subtitleHook.fontSize}
                  fontColor={subtitleHook.fontColor}
                  backgroundColor={subtitleHook.backgroundColor}
                  position={subtitleHook.position}
                  onSelectSubtitle={subtitleHook.selectSubtitle}
                  onToggleSubtitles={subtitleHook.toggleSubtitles}
                  onUpdateStyle={subtitleHook.updateSubtitleStyle}
                  loading={subtitleHook.loading}
                  hasSubtitles={subtitleHook.hasSubtitles}
                />

                {/* Episode List Button */}
                {(mediaType === 'tv' || episodes.length > 0) && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEpisodeCarousel(prev => !prev)}
                    style={{
                      background: showEpisodeCarousel ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255,255,255,0.1)',
                      border: showEpisodeCarousel ? '2px solid #00f5ff' : '1px solid rgba(255,255,255,0.2)',
                      color: showEpisodeCarousel ? '#00f5ff' : 'white',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.3s ease',
                      fontWeight: showEpisodeCarousel ? '600' : 'normal',
                      backdropFilter: 'blur(10px)',
                      textShadow: showEpisodeCarousel ? '0 0 10px rgba(0, 245, 255, 0.8)' : 'none'
                    }}
                    title="Toggle episode list (E key)"
                  >
                    📺 Episodes
                  </motion.button>
                )}

                {/* Fullscreen */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleFullscreen}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px'
                  }}
                >
                  {isFullscreen ? '🗗' : '🗖'}
                </motion.button>

                {/* Back Button */}
                <motion.button
                  whileHover={{ scale: 1.05, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBackToShowDetails}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  ← Back
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add CSS for volume slider and subtitle styling */}
      <style jsx>{`
        /* Volume slider debugging - Check if these styles are being applied */
        input[type="range"] {
          /* DEBUG: Base slider styles */
          -webkit-appearance: none !important;
          appearance: none !important;
          background: transparent !important;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          height: 18px !important;
          width: 18px !important;
          border-radius: 50% !important;
          background: linear-gradient(135deg, #00f5ff 0%, #00d4ff 100%) !important;
          cursor: pointer !important;
          border: 2px solid rgba(255, 255, 255, 0.8) !important;
          box-shadow: 0 0 15px rgba(0, 245, 255, 0.6), 0 0 30px rgba(0, 245, 255, 0.3) !important;
          margin-top: -6px !important;
          transition: all 0.2s ease !important;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.3) !important;
          box-shadow: 0 0 20px rgba(0, 245, 255, 0.8), 0 0 40px rgba(0, 245, 255, 0.5) !important;
        }
        input[type="range"]::-moz-range-thumb {
          height: 18px !important;
          width: 18px !important;
          border-radius: 50% !important;
          background: linear-gradient(135deg, #00f5ff 0%, #00d4ff 100%) !important;
          cursor: pointer !important;
          border: 2px solid rgba(255, 255, 255, 0.8) !important;
          box-shadow: 0 0 15px rgba(0, 245, 255, 0.6) !important;
          transition: all 0.2s ease !important;
        }
        input[type="range"]::-webkit-slider-track {
          background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(0,245,255,0.1) 100%) !important;
          height: 6px !important;
          border-radius: 3px !important;
          border: 1px solid rgba(0, 245, 255, 0.2) !important;
        }
        input[type="range"]::-moz-range-track {
          background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(0,245,255,0.1) 100%) !important;
          height: 6px !important;
          border-radius: 3px !important;
          border: 1px solid rgba(0, 245, 255, 0.2) !important;
        }

        /* Custom subtitle styling */
        video::cue {
          font-family: 'Arial', sans-serif !important;
          font-size: ${subtitleHook.fontSize}px !important;
          color: ${subtitleHook.fontColor} !important;
          background-color: ${subtitleHook.backgroundColor} !important;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          line-height: 1.4 !important;
          text-align: center !important;
        }

        video::cue(.bottom) {
          position: absolute !important;
          bottom: 10% !important;
        }

        video::cue(.top) {
          position: absolute !important;
          top: 10% !important;
        }

        video::cue(.center) {
          position: absolute !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
        }

        /* WebKit specific subtitle styling */
        video::-webkit-media-text-track-display {
          font-family: 'Arial', sans-serif !important;
          font-size: ${subtitleHook.fontSize}px !important;
          color: ${subtitleHook.fontColor} !important;
          background-color: ${subtitleHook.backgroundColor} !important;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          line-height: 1.4 !important;
          text-align: center !important;
        }
      `}</style>
    </div>
  );
};

export default SimpleVideoPlayer;
                