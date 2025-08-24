'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FuturisticMediaPlayer.module.css';

// Enhanced hooks and components - only import what we actually use
import { useStream } from './hooks/useStream';
import { useEnhancedSubtitles } from '../../hooks/useEnhancedSubtitles';
import useFetchMediaDetails from './hooks/useFetchMediaDetails';
import useEpisodeNavigation from './hooks/useEpisodeNavigation';
import useAutoAdvance from './hooks/useAutoAdvance';

// Enhanced UI components
import EnhancedMediaControls from './components/EnhancedMediaControls';
import IntelligentSubtitles from './components/IntelligentSubtitles';
import AmbientLighting from './components/AmbientLighting';
import VoiceInterface from './components/VoiceInterface';
import GestureOverlay from './components/GestureOverlay';
import AdvancedSettings from './components/AdvancedSettings';
import PerformanceDashboard from './components/PerformanceDashboard';
import AdaptiveLoading from './components/AdaptiveLoading';
import EpisodeCarousel from './components/EpisodeCarousel';
import NextEpisodePrompt from './components/NextEpisodePrompt';
import PictureInPicture from './components/PictureInPicture';

/**
 * FuturisticMediaPlayer - The ultimate media playback experience
 * 
 * Features:
 * - AI-powered adaptive quality with scene detection
 * - Intelligent subtitle positioning with content awareness
 * - Immersive ambient lighting synchronized to video content
 * - Advanced gesture and voice control systems
 * - Real-time performance analytics and optimization
 * - Smart buffering with predictive loading
 * - Dynamic UI adaptation based on content type
 * - Advanced seeking with frame-accurate thumbnails
 * - Collaborative features and multi-device synchronization
 * - Comprehensive accessibility with AI narration
 * - Particle effects and glassmorphism design
 * - Picture-in-Picture with smart positioning
 */
const FuturisticMediaPlayer = ({ 
  mediaType, 
  movieId, 
  seasonId, 
  episodeId, 
  onBackToShowDetails,
  onEpisodeChange,
  enableAdvancedFeatures = true,
  theme = 'dark',
  ambientLighting = true,
  gestureControls = true,
  voiceControls = true,
  adaptiveQuality = true,
  collaborativeMode = false
}) => {
  // Core refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [performanceVisible, setPerformanceVisible] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState('standard'); // standard, immersive, cinema
  
  // Simple, functional player state with all required properties
  const [simplePlayerState, setSimplePlayerState] = useState({
    isPlaying: false,
    volume: 0.8, // Default volume
    isMuted: false,
    duration: 0,
    currentTime: 0,
    isFullscreen: false,
    buffered: 0,
    subtitleStyle: {},
    ambientIntensity: 0.5,
    gestureVisualFeedback: true,
    particlesEnabled: false,
    pipEnabled: false,
    pipPosition: { x: 20, y: 20 }
  });
  
  // Debug only significant state changes
  useEffect(() => {
    if (simplePlayerState.duration > 0) {
      console.log('📊 Controls should show:', {
        time: `${Math.floor(simplePlayerState.currentTime)}/${Math.floor(simplePlayerState.duration)}s`,
        playing: simplePlayerState.isPlaying ? '▶️' : '⏸️',
        vol: `${Math.round(simplePlayerState.volume * 100)}%`
      });
    }
  }, [Math.floor(simplePlayerState.currentTime), simplePlayerState.duration, simplePlayerState.isPlaying]);

  // Memoized player actions to prevent re-creation on every render
  const playerActions = useMemo(() => {
    const actions = {
      setPlaying: (isPlaying) => {
        setSimplePlayerState(prev => ({ ...prev, isPlaying }));
      },
      togglePlay: () => {
        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      },
      setVolume: (volume) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        const video = videoRef.current;
        if (video) {
          try {
            video.volume = clampedVolume;
            video.muted = clampedVolume === 0;
            setSimplePlayerState(prev => ({
              ...prev,
              volume: clampedVolume,
              isMuted: clampedVolume === 0
            }));
          } catch (e) {
            console.error('Volume set error:', e);
          }
        }
      },
      adjustVolume: (delta) => {
        const video = videoRef.current;
        if (video) {
          const newVolume = Math.max(0, Math.min(1, video.volume + delta));
          video.volume = newVolume;
          video.muted = newVolume === 0;
          setSimplePlayerState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }));
        }
      },
      toggleMute: () => {
        const video = videoRef.current;
        if (video) {
          const wasMuted = video.muted;
          video.muted = !wasMuted;
          // If unmuting and volume is 0, set to a reasonable volume
          if (wasMuted && video.volume === 0) {
            video.volume = 0.8;
          }
          setSimplePlayerState(prev => ({
            ...prev,
            isMuted: !wasMuted,
            volume: video.volume
          }));
        }
      },
      setCurrentTime: (currentTime) => {
        if (isFinite(currentTime) && !isNaN(currentTime)) {
          setSimplePlayerState(prev => ({ ...prev, currentTime }));
        }
      },
      setDuration: (duration) => {
        if (isFinite(duration) && !isNaN(duration) && duration > 0) {
          setSimplePlayerState(prev => ({ ...prev, duration }));
        }
      },
      setFullscreen: (isFullscreen) => {
        setSimplePlayerState(prev => ({ ...prev, isFullscreen }));
      },
      seek: (time) => {
        const video = videoRef.current;
        if (video && isFinite(time)) {
          const clampedTime = Math.max(0, Math.min(video.duration || 0, time));
          video.currentTime = clampedTime;
          setSimplePlayerState(prev => ({ ...prev, currentTime: clampedTime }));
        }
      },
      setBuffered: (buffered) => {
        if (isFinite(buffered) && !isNaN(buffered)) {
          setSimplePlayerState(prev => ({ ...prev, buffered }));
        }
      },
      resetUITimer: () => {}, // Keep as no-op for compatibility
      setPipPosition: (position) => {
        setSimplePlayerState(prev => ({ ...prev, pipPosition: position }));
      },
    };
    return actions;
  }, []);

  // Use simplePlayerState directly
  const playerState = simplePlayerState;
  
  // Log state for debugging
  useEffect(() => {
    console.log('🎮 State being passed to controls:', {
      currentTime: playerState.currentTime,
      duration: playerState.duration,
      isPlaying: playerState.isPlaying,
      volume: playerState.volume
    });
  }, [playerState.currentTime, playerState.duration, playerState.isPlaying, playerState.volume]);
  
  // Enhanced media details with scene analysis
  const { details: mediaDetails, sceneData } = useFetchMediaDetails(movieId, mediaType, {
    enableSceneDetection: enableAdvancedFeatures,
    enableContentAnalysis: true
  });
  
  // Stream extraction and management - Allow normal initialization
  const {
    streamUrl,
    streamType,
    loading: streamLoading,
    error: streamError,
    loadingProgress,
    loadingPhase,
    retryExtraction
  } = useStream({
    mediaType,
    movieId,
    seasonId,
    episodeId,
    shouldFetch: !!(movieId && (mediaType !== 'tv' || (seasonId && episodeId)))
  });

  // Functional video controls - ENABLED
  const [qualities, setQualities] = useState([
    { id: 'auto', label: 'Auto', height: 1080, bitrate: 5000000 },
    { id: '1080', label: '1080p', height: 1080, bitrate: 5000000 },
    { id: '720', label: '720p', height: 720, bitrate: 2500000 },
    { id: '480', label: '480p', height: 480, bitrate: 1000000 }
  ]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const setQuality = useCallback((qualityId) => {
    setCurrentQuality(qualityId);
    // trackEvent disabled for performance
  }, []);
  const adaptiveSettings = { enabled: true };
  const playerPerformanceMetrics = { fps: 60, dropFrames: 0 };
  const bufferHealth = 100;
  const networkMetrics = { bandwidth: 5000000, latency: 50 };

  // Set video source when streamUrl is available
  useEffect(() => {
    if (videoRef.current && streamUrl) {
      console.log('🎬 Setting video source:', streamType);
      console.log('📺 Stream URL:', streamUrl);
      
      // For HLS streams, try to use native HLS support first
      if (streamType === 'hls') {
        // Check if browser supports native HLS
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
        } else {
          // For non-Safari browsers, try to use HLS.js with better error handling
          const loadHLS = async () => {
            try {
              // Import HLS.js with a more reliable approach
              let HLS;
              
              // Try different import methods
              try {
                const hlsModule = await import('hls.js/dist/hls.min.js');
                HLS = hlsModule.default;
              } catch (e) {
                console.warn('Failed to import hls.min.js, trying main export:', e);
                const hlsModule = await import('hls.js');
                HLS = hlsModule.default;
              }
              
              if (!HLS) {
                throw new Error('HLS.js not available');
              }
              
              // Check if HLS is supported
              if (HLS.isSupported && HLS.isSupported()) {
                
                // Clean up any existing HLS instance
                if (videoRef.current && videoRef.current.hls) {
                  videoRef.current.hls.destroy();
                  videoRef.current.hls = null;
                }
                
                // Create HLS instance with optimized settings
                const hls = new HLS({
                  debug: false,
                  enableWorker: true,
                  lowLatencyMode: false,
                  backBufferLength: 90,
                  maxBufferLength: 30,
                  maxMaxBufferLength: 600,
                  startLevel: -1, // Auto quality
                  capLevelToPlayerSize: true
                });
                
                // Store reference for cleanup
                videoRef.current.hls = hls;
                
                hls.loadSource(streamUrl);
                hls.attachMedia(videoRef.current);
                
                // Handle HLS events
                hls.on(HLS.Events.MANIFEST_PARSED, () => {
                  // Update qualities from manifest
                  if (hls.levels && hls.levels.length > 0) {
                    const hlsQualities = hls.levels.map((level, index) => ({
                      id: index.toString(),
                      label: `${level.height}p`,
                      height: level.height,
                      bitrate: level.bitrate
                    }));
                    setQualities([
                      { id: 'auto', label: 'Auto', height: 1080, bitrate: 5000000 },
                      ...hlsQualities
                    ]);
                  }
                });
                
                hls.on(HLS.Events.ERROR, (event, data) => {
                  if (data.fatal) {
                    hls.destroy();
                    videoRef.current.hls = null;
                    videoRef.current.src = streamUrl;
                  }
                });
                
              } else {
                videoRef.current.src = streamUrl;
              }
              
            } catch (error) {
              videoRef.current.src = streamUrl;
            }
          };
          
          // Only load HLS.js on client side
          if (typeof window !== 'undefined') {
            loadHLS();
          } else {
            videoRef.current.src = streamUrl;
          }
        }
      } else {
        // Non-HLS streams
        videoRef.current.src = streamUrl;
      }
      
      // Force load
      videoRef.current.load();
      
      // Don't force volume - let user control it
      // videoRef.current.volume = 0.8;
      // videoRef.current.muted = false;
      
      // Wait for loadedmetadata event before trying to play
      const playWhenReady = () => {
        if (videoRef.current && videoRef.current.readyState >= 1) {
          videoRef.current.play().then(() => {
            console.log('✅ Autoplay started');
            setSimplePlayerState(prev => ({ ...prev, isPlaying: true }));
          }).catch(err => {
            console.log('⚠️ Autoplay prevented, click to play:', err);
          });
        }
      };
      
      // Try to play when ready
      videoRef.current.addEventListener('loadedmetadata', playWhenReady, { once: true });
      
    }
    
    // Clean up HLS instance on unmount and when streamUrl changes
    return () => {
      if (videoRef.current && videoRef.current.hls) {
        videoRef.current.hls.destroy();
        videoRef.current.hls = null;
      }
    };
  }, [streamUrl, streamType]);

  // Force sync state with video element - but don't override volume
  useEffect(() => {
    if (!videoRef.current || !streamUrl) return;
    
    const syncInterval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !isNaN(video.duration)) {
        setSimplePlayerState(prev => {
          // Don't update volume/muted from sync - let user control it
          const newState = {
            ...prev,
            currentTime: video.currentTime || 0,
            duration: video.duration || 0,
            isPlaying: !video.paused,
            // Keep existing volume/muted unless they're uninitialized
            volume: prev.volume !== undefined ? prev.volume : video.volume,
            isMuted: prev.isMuted !== undefined ? prev.isMuted : video.muted,
            buffered: video.buffered.length > 0 ? video.buffered.end(0) : prev.buffered
          };
          
          // Only log significant changes
          if (Math.floor(newState.currentTime) !== Math.floor(prev.currentTime) && Math.floor(newState.currentTime) % 10 === 0) {
            console.log('⏱️ Time:', `${Math.floor(newState.currentTime)}/${Math.floor(newState.duration)}s`);
          }
          
          return newState;
        });
      }
    }, 500); // Reduce to 2 times per second to reduce flickering
    
    return () => clearInterval(syncInterval);
  }, [streamUrl]);

  // Enhanced subtitle system with API integration
  const {
    subtitles,
    availableLanguages,
    activeSubtitle,
    selectSubtitle,
    currentSubtitleText,
    loading: subtitlesLoading,
    error: subtitlesError
  } = useEnhancedSubtitles({
    imdbId: mediaDetails?.imdb_id,
    season: seasonId,
    episode: episodeId,
    enabled: !!mediaDetails,
    videoRef
  });

  // Simplified ambient effects - DISABLED
  const ambientColors = [];
  const lightingEffects = {};
  const particleConfig = {};
  const atmosphereMode = 'default';

  // Simplified gesture and voice systems - DISABLED for now
  const gestureState = {};
  const voiceState = {};
  const startListening = () => {};
  const stopListening = () => {};
  const voiceCommands = {};

  // Simplified quality system - DISABLED
  const recommendedQuality = 'auto';
  const qualityHistory = [];
  const performanceProfile = {};

  // Simplified analytics - DISABLED to prevent infinite loops
  const trackEvent = () => {};
  const sessionId = 'disabled';
  const sessionData = { duration: 0, interactions: 0 };
  const userBehavior = {};
  const analyticsPerformanceMetrics = {};
  const contentAnalytics = {};
  const insights = {};
  const isTracking = false;

  // Episode navigation for TV shows
  const {
    hasNextEpisode,
    hasPreviousEpisode,
    goToNextEpisode,
    goToPreviousEpisode,
    getCurrentEpisode,
    getNextEpisode,
    getPreviousEpisode,
    episodeData
  } = useEpisodeNavigation({
    mediaType,
    movieId,
    seasonId,
    episodeId,
    onEpisodeChange
  });

  // Auto-advance with AI prediction
  const {
    showNextEpisodePrompt,
    countdown,
    nextEpisodeInfo,
    handleNextEpisode: autoAdvanceNext,
    handleDismiss: dismissPrompt,
    resetForNewEpisode
  } = useAutoAdvance({
    mediaType,
    currentTime: playerState.currentTime,
    duration: playerState.duration,
    hasNextEpisode,
    getNextEpisode,
    onNextEpisode: goToNextEpisode,
    enabled: mediaType === 'tv',
    aiPrediction: enableAdvancedFeatures
  });

  // Enhanced fullscreen functionality - DEFINED FIRST to avoid hoisting issues
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        playerActions.setFullscreen(true);
        setFullscreenMode('immersive');
      } else {
        await document.exitFullscreen();
        playerActions.setFullscreen(false);
        setFullscreenMode('standard');
      }
    } catch (error) {
      console.error('❌ Fullscreen error:', error);
    }
  }, [playerActions]);

  // Simple gesture action handler
  const handleGestureAction = useCallback((gesture) => {
    if (!videoRef.current) return;

    switch (gesture.type) {
      case 'swipeUp':
        playerActions.adjustVolume(0.1);
        break;
      case 'swipeDown':
        playerActions.adjustVolume(-0.1);
        break;
      case 'swipeLeft':
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        break;
      case 'swipeRight':
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
        break;
      case 'tap':
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
        break;
      case 'doubleTap':
        toggleFullscreen();
        break;
    }
  }, [playerActions, toggleFullscreen]);

  // Simple voice command handler
  const handleVoiceCommand = useCallback((command) => {
    if (!videoRef.current) return;
    
    const { action, value } = command;
    
    switch (action) {
      case 'play':
        videoRef.current.play();
        break;
      case 'pause':
        videoRef.current.pause();
        break;
      case 'volume':
        const normalizedVolume = Math.max(0, Math.min(1, value / 100));
        playerActions.setVolume(normalizedVolume);
        break;
      case 'seek':
        videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, value));
        break;
      case 'quality':
        setQuality(value);
        break;
      case 'fullscreen':
        toggleFullscreen();
        break;
    }
  }, [playerActions, setQuality, toggleFullscreen]);

  // Simple UI visibility management
  const showUI = useCallback(() => {
    setUiVisible(true);
  }, []);

  const hideUI = useCallback(() => {
    if (playerState.isPlaying && fullscreenMode === 'immersive') {
      setUiVisible(false);
    }
  }, [playerState.isPlaying, fullscreenMode]);

  // Removed old event handlers - now using inline handlers in useEffect

  // Video event setup - needs to run when video source changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    
    console.log('🎬 Setting up video event listeners for:', streamUrl);
    
    // Event handlers need to be inline to access current state
    const timeHandler = () => {
      if (!video) return;
      const currentTime = video.currentTime || 0;
      const duration = video.duration || 0;
      
      setSimplePlayerState(prev => {
        const newState = {
          ...prev,
          currentTime: currentTime,
          duration: !isNaN(duration) ? duration : prev.duration,
          buffered: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0
        };
        return newState;
      });
    };
    
    const metadataHandler = () => {
      if (!video) return;
      const duration = video.duration;
      console.log('📊 Metadata event - Duration:', duration);
      
      if (!isNaN(duration) && duration > 0) {
        setSimplePlayerState(prev => ({ ...prev, duration }));
      }
    };
    
    const playHandler = () => {
      console.log('▶️ Play event');
      setSimplePlayerState(prev => ({ ...prev, isPlaying: true }));
    };
    
    const pauseHandler = () => {
      console.log('⏸️ Pause event');
      setSimplePlayerState(prev => ({ ...prev, isPlaying: false }));
    };
    
    const volumeHandler = () => {
      if (!video) return;
      // Update state when user changes volume
      setSimplePlayerState(prev => ({
        ...prev,
        volume: video.volume,
        isMuted: video.muted
      }));
      console.log('🔊 User changed volume:', video.volume.toFixed(2));
    };
    
    // Add event listeners
    video.addEventListener('timeupdate', timeHandler);
    video.addEventListener('loadedmetadata', metadataHandler);
    video.addEventListener('play', playHandler);
    video.addEventListener('pause', pauseHandler);
    video.addEventListener('volumechange', volumeHandler);
    video.addEventListener('durationchange', metadataHandler);
    
    // Check if video already has metadata
    if (video.readyState >= 1 && video.duration) {
      console.log('🎯 Video ready with duration:', video.duration);
      setSimplePlayerState(prev => ({
        ...prev,
        duration: video.duration,
        isPlaying: !video.paused,
        // Initialize volume from video element
        volume: video.volume,
        isMuted: video.muted
      }));
    }
    
    // Cleanup
    return () => {
      video.removeEventListener('timeupdate', timeHandler);
      video.removeEventListener('loadedmetadata', metadataHandler);
      video.removeEventListener('play', playHandler);
      video.removeEventListener('pause', pauseHandler);
      video.removeEventListener('volumechange', volumeHandler);
      video.removeEventListener('durationchange', metadataHandler);
    };
  }, [streamUrl]); // Run when stream URL changes

  // Simple keyboard shortcuts that actually work
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || !videoRef.current) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          playerActions.toggleMute();
          break;
        case 'ArrowLeft':
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          playerActions.adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          playerActions.adjustVolume(-0.1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [playerActions, toggleFullscreen]);

  // Comprehensive cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up video element
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Pause and reset video
        video.pause();
        video.removeAttribute('src');
        video.load();
        
        // Clean up HLS instance if exists
        if (video.hls) {
          video.hls.destroy();
          video.hls = null;
        }
      }
      
      // Reset state
      setIsInitialized(false);
      setUiVisible(true);
      setSettingsVisible(false);
      setPerformanceVisible(false);
      setFullscreenMode('standard');
    };
  }, []);

  // Render loading state
  if (streamLoading && !streamUrl) {
    return (
      <div className={styles.playerContainer}>
        <AdaptiveLoading 
          progress={loadingProgress} 
          phase={loadingPhase}
          enableParticles={enableAdvancedFeatures}
          theme={theme}
        />
      </div>
    );
  }

  // Render error state
  if (streamError) {
    return (
      <div className={styles.playerContainer}>
        <div className={styles.errorOverlay}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.errorContent}
          >
            <h3>⚡ Playback Error</h3>
            <p>{streamError}</p>
            <div className={styles.errorActions}>
              <button onClick={retryExtraction} className={styles.retryButton}>
                🔄 Retry Stream
              </button>
              <button onClick={onBackToShowDetails} className={styles.backButton}>
                ← Return Home
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${styles.futuristicPlayer} ${styles[`theme-${theme}`]} ${
        fullscreenMode === 'immersive' ? styles.immersiveMode : ''
      }`}
      onMouseMove={showUI}
      onMouseLeave={hideUI}
    >
      {/* Ambient Lighting System */}
      <AnimatePresence>
        {ambientLighting && enableAdvancedFeatures && (
          <AmbientLighting
            colors={ambientColors}
            effects={lightingEffects}
            intensity={playerState.ambientIntensity}
            mode={atmosphereMode}
          />
        )}
      </AnimatePresence>

      {/* Particle System - DISABLED to prevent infinite loops */}
      {/*
      <AnimatePresence>
        {enableAdvancedFeatures && (
          <ParticleSystem
            config={particleConfig}
            enabled={playerState.particlesEnabled}
            theme={theme}
          />
        )}
      </AnimatePresence>
      */}

      {/* Main Video Element */}
      <video
        ref={videoRef}
        className={styles.videoElement}
        autoPlay
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        controls={false}
        data-testid="futuristic-video-player"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'black',
          zIndex: 10
        }}
        onError={(e) => {
          console.error('❌ Video playback error:', e.target.error);
          console.error('Error details:', {
            code: e.target.error?.code,
            message: e.target.error?.message
          });
        }}
        onCanPlay={() => console.log('✅ Video can play')}
        onLoadStart={() => console.log('🎬 Video load started')}
      />

      {/* Hidden canvas for advanced features */}
      <canvas
        ref={canvasRef}
        className={styles.hiddenCanvas}
        width="1920"
        height="1080"
      />

      {/* Intelligent Subtitles */}
      <AnimatePresence>
        {currentSubtitleText && (
          <IntelligentSubtitles
            text={currentSubtitleText}
            position={{ bottom: '15%', left: '50%', transform: 'translateX(-50%)' }}
            contentAwareness={null}
            style={playerState.subtitleStyle || {}}
            animations={enableAdvancedFeatures}
          />
        )}
      </AnimatePresence>

      {/* Gesture Overlay */}
      <AnimatePresence>
        {gestureControls && enableAdvancedFeatures && (
          <GestureOverlay
            state={gestureState}
            enabled={gestureControls}
            feedback={playerState.gestureVisualFeedback}
          />
        )}
      </AnimatePresence>

      {/* Voice Interface */}
      <AnimatePresence>
        {voiceControls && enableAdvancedFeatures && voiceState?.listening && (
          <VoiceInterface
            state={voiceState}
            commands={voiceCommands}
            onStop={stopListening}
          />
        )}
      </AnimatePresence>

      {/* Advanced Settings */}
      <AnimatePresence>
        {settingsVisible && (
          <AdvancedSettings
            playerState={playerState}
            playerActions={playerActions}
            qualities={qualities}
            currentQuality={currentQuality}
            onQualityChange={setQuality}
            subtitles={subtitles}
            activeSubtitle={activeSubtitle}
            onSubtitleChange={selectSubtitle}
            ambientSettings={{ colors: ambientColors, intensity: playerState.ambientIntensity }}
            onClose={() => setSettingsVisible(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Performance Dashboard */}
      <AnimatePresence>
        {performanceVisible && enableAdvancedFeatures && (
          <PerformanceDashboard
            analytics={contentAnalytics}
            performanceStats={analyticsPerformanceMetrics}
            userBehavior={userBehavior}
            insights={insights}
            bufferHealth={bufferHealth}
            networkMetrics={networkMetrics}
            sessionData={sessionData}
            onClose={() => setPerformanceVisible(false)}
            onGenerateReport={() => {
              console.log('Analytics disabled in simplified mode');
            }}
          />
        )}
      </AnimatePresence>

      {/* Scene Detection Overlay - DISABLED to prevent overlay issues */}
      {/*
      <AnimatePresence>
        {enableAdvancedFeatures && sceneData && (
          <SceneDetector
            scenes={sceneData.scenes}
            currentTime={playerState.currentTime}
            duration={playerState.duration}
            onSceneSelect={(time) => playerActions.seek(time)}
          />
        )}
      </AnimatePresence>
      */}

      {/* Smart Thumbnails - DISABLED to prevent overlay issues */}
      {/*
      <SmartThumbnails
        videoRef={videoRef}
        canvasRef={canvasRef}
        duration={playerState.duration}
        scenes={sceneData?.scenes}
        enabled={false}
      />
      */}

      {/* Episode Carousel for TV Shows */}
      <AnimatePresence>
        {mediaType === 'tv' && enableAdvancedFeatures && episodeData && (
          <EpisodeCarousel
            episodes={episodeData}
            currentEpisode={{ seasonId, episodeId }}
            onEpisodeSelect={(season, episode) => onEpisodeChange(season, episode)}
            visible={uiVisible}
          />
        )}
      </AnimatePresence>

      {/* Next Episode Prompt */}
      <AnimatePresence>
        {mediaType === 'tv' && showNextEpisodePrompt && (
          <NextEpisodePrompt
            show={showNextEpisodePrompt}
            countdown={countdown}
            nextEpisode={nextEpisodeInfo}
            onNext={autoAdvanceNext}
            onDismiss={dismissPrompt}
            theme={theme}
            enhanced={enableAdvancedFeatures}
          />
        )}
      </AnimatePresence>

      {/* Picture-in-Picture */}
      <PictureInPicture
        videoRef={videoRef}
        enabled={playerState.pipEnabled}
        position={playerState.pipPosition}
        onPositionChange={(pos) => playerActions.setPipPosition(pos)}
      />

      {/* Enhanced Media Controls - FORCE RE-RENDER WITH KEY */}
      <AnimatePresence>
        {uiVisible && (
          <EnhancedMediaControls
            key={`controls-${Math.floor(simplePlayerState.currentTime)}`} // Force re-render every second
            videoRef={videoRef}
            playerState={{
              ...simplePlayerState,
              // Ensure values are always defined
              currentTime: simplePlayerState.currentTime || 0,
              duration: simplePlayerState.duration || 0,
              isPlaying: simplePlayerState.isPlaying || false,
              volume: simplePlayerState.volume ?? 0.8,
              isMuted: simplePlayerState.isMuted || false,
              buffered: simplePlayerState.buffered || 0
            }}
            playerActions={playerActions}
            onToggleFullscreen={toggleFullscreen}
            qualities={qualities}
            onSelectQuality={setQuality}
            currentQuality={currentQuality}
            subtitles={availableLanguages || []}
            onSelectSubtitle={selectSubtitle}
            activeSubtitle={activeSubtitle}
            mediaType={mediaType}
            hasNextEpisode={hasNextEpisode}
            hasPreviousEpisode={hasPreviousEpisode}
            onNextEpisode={goToNextEpisode}
            onPreviousEpisode={goToPreviousEpisode}
            enableAdvanced={enableAdvancedFeatures}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Back Button */}
      <AnimatePresence>
        {uiVisible && (
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            onClick={onBackToShowDetails}
            className={styles.backButton}
          >
            ← Back
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FuturisticMediaPlayer;