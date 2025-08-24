'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import styles from './FuturisticMediaPlayer.module.css';

// Error boundary and recovery
import MediaPlayerErrorBoundary, { StreamErrorBoundary } from './components/MediaPlayerErrorBoundary';
import { useErrorRecovery, NetworkHealthMonitor } from './utils/errorRecovery';

// Enhanced hooks - optimized imports
import { useStream } from './hooks/useStream';
import { useEnhancedSubtitles } from '../../hooks/useEnhancedSubtitles';
import useFetchMediaDetails from './hooks/useFetchMediaDetails';
import useEpisodeNavigation from './hooks/useEpisodeNavigation';
import useAutoAdvance from './hooks/useAutoAdvance';

// Enhanced UI components - lazy loaded for performance
const EnhancedMediaControls = dynamic(() => import('./components/EnhancedMediaControls'), { ssr: false });
const IntelligentSubtitles = dynamic(() => import('./components/IntelligentSubtitles'), { ssr: false });
const AmbientLighting = dynamic(() => import('./components/AmbientLighting'), { ssr: false });
const VoiceInterface = dynamic(() => import('./components/VoiceInterface'), { ssr: false });
const GestureOverlay = dynamic(() => import('./components/GestureOverlay'), { ssr: false });
const AdvancedSettings = dynamic(() => import('./components/AdvancedSettings'), { ssr: false });
const PerformanceDashboard = dynamic(() => import('./components/PerformanceDashboard'), { ssr: false });
const AdaptiveLoading = dynamic(() => import('./components/AdaptiveLoading'), { ssr: false });
const EpisodeCarousel = dynamic(() => import('./components/EpisodeCarousel'), { ssr: false });
const NextEpisodePrompt = dynamic(() => import('./components/NextEpisodePrompt'), { ssr: false });
const PictureInPicture = dynamic(() => import('./components/PictureInPicture'), { ssr: false });

/**
 * FuturisticMediaPlayer - Completely Refactored Media Player
 *
 * Key Improvements:
 * - Optimized state management without redundancy
 * - Proper HLS.js loading and cleanup
 * - Efficient rendering without force re-renders
 * - Comprehensive error handling with recovery
 * - Working controls with proper sync
 * - Clean component architecture
 * - Performance optimizations
 * - Error boundaries and recovery mechanisms
 */
const FuturisticMediaPlayerCore = ({
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
  voiceControls = false,
  adaptiveQuality = true,
  collaborativeMode = false
}) => {
  // Core refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const hlsRef = useRef(null);
  const uiTimeoutRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const networkMonitorRef = useRef(null);
  const errorBoundaryResetKey = useRef(0);
  
  // UI state
  const [isInitialized, setIsInitialized] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [performanceVisible, setPerformanceVisible] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState('standard');
  
  // Optimized player state - single source of truth
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    volume: 0.8,
    isMuted: false,
    duration: 0,
    currentTime: 0,
    isFullscreen: false,
    buffered: 0,
    isLoading: false,
    hasError: false,
    errorMessage: null
  });

  // Advanced features state
  const [advancedState, setAdvancedState] = useState({
    subtitleStyle: {},
    ambientIntensity: 0.5,
    gestureVisualFeedback: true,
    particlesEnabled: false,
    pipEnabled: false,
    pipPosition: { x: 20, y: 20 },
    currentQuality: 'auto',
    qualities: [],
    playbackRate: 1.0
  });

  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    droppedFrames: 0,
    bufferHealth: 100,
    bandwidth: 0,
    latency: 0
  });

  // Error recovery hook
  const {
    handleError: handleRecoverableError,
    reset: resetErrorRecovery,
    isRecovering,
    retryCount
  } = useErrorRecovery({
    maxRetries: 3,
    onError: (error) => {
      console.error('Unrecoverable error:', error);
      setPlayerState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error.message || 'An error occurred'
      }));
    },
    onRecovery: () => {
      console.log('Attempting recovery...');
      retryExtraction();
    },
    onMaxRetriesExceeded: (error) => {
      console.error('Max retries exceeded:', error);
    }
  });

  // Memoized player actions - prevent recreation on every render
  const playerActions = useMemo(() => ({
    play: async () => {
      const video = videoRef.current;
      if (video) {
        try {
          await video.play();
          setPlayerState(prev => ({ ...prev, isPlaying: true }));
        } catch (err) {
          console.error('Play error:', err);
          setPlayerState(prev => ({ 
            ...prev, 
            hasError: true, 
            errorMessage: 'Failed to play video' 
          }));
        }
      }
    },
    
    pause: () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        setPlayerState(prev => ({ ...prev, isPlaying: false }));
      }
    },
    
    togglePlay: async () => {
      const video = videoRef.current;
      if (video) {
        if (video.paused) {
          await playerActions.play();
        } else {
          playerActions.pause();
        }
      }
    },
    
    seek: (time) => {
      const video = videoRef.current;
      if (video && isFinite(time)) {
        const clampedTime = Math.max(0, Math.min(video.duration || 0, time));
        video.currentTime = clampedTime;
        setPlayerState(prev => ({ ...prev, currentTime: clampedTime }));
      }
    },
    
    setVolume: (volume) => {
      const video = videoRef.current;
      if (video && isFinite(volume)) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        video.volume = clampedVolume;
        video.muted = clampedVolume === 0;
        setPlayerState(prev => ({
          ...prev,
          volume: clampedVolume,
          isMuted: clampedVolume === 0
        }));
      }
    },
    
    adjustVolume: (delta) => {
      const video = videoRef.current;
      if (video) {
        const newVolume = Math.max(0, Math.min(1, video.volume + delta));
        playerActions.setVolume(newVolume);
      }
    },
    
    toggleMute: () => {
      const video = videoRef.current;
      if (video) {
        const wasMuted = video.muted;
        video.muted = !wasMuted;
        if (wasMuted && video.volume === 0) {
          video.volume = 0.8;
        }
        setPlayerState(prev => ({
          ...prev,
          isMuted: !wasMuted,
          volume: video.volume
        }));
      }
    },
    
    setFullscreen: (isFullscreen) => {
      setPlayerState(prev => ({ ...prev, isFullscreen }));
    },
    
    setPlaybackRate: (rate) => {
      const video = videoRef.current;
      if (video && isFinite(rate)) {
        video.playbackRate = Math.max(0.25, Math.min(4, rate));
        setAdvancedState(prev => ({ ...prev, playbackRate: video.playbackRate }));
      }
    },
    
    setPipPosition: (position) => {
      setAdvancedState(prev => ({ ...prev, pipPosition: position }));
    }
  }), []);

  // Enhanced media details fetching
  const { details: mediaDetails, sceneData } = useFetchMediaDetails(movieId, mediaType, {
    enableSceneDetection: enableAdvancedFeatures,
    enableContentAnalysis: true
  });
  
  // Stream extraction and management
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

  // Enhanced subtitle system
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

  // Auto-advance for episodes
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

  // Enhanced HLS.js loading with proper cleanup
  const loadHLS = useCallback(async () => {
    if (!streamUrl || streamType !== 'hls' || !videoRef.current) return;
    
    // Check for native HLS support (Safari)
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
      return;
    }
    
    try {
      // Use global HLS.js if available, otherwise load from CDN
      let Hls;
      
      if (window.Hls) {
        Hls = window.Hls;
        console.log('✅ Using global HLS.js');
      } else {
        console.log('🔄 Loading HLS.js from CDN...');
        // Load HLS.js from CDN
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.10/dist/hls.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        Hls = window.Hls;
      }
      
      if (!Hls.isSupported()) {
        console.warn('HLS.js not supported, falling back to native playback');
        videoRef.current.src = streamUrl;
        return;
      }
      
      // Clean up existing instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Create optimized HLS instance
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        startLevel: -1,
        capLevelToPlayerSize: true,
        xhrSetup: (xhr, url) => {
          xhr.withCredentials = false;
        }
      });
      
      hlsRef.current = hls;
      
      // Handle HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('📊 HLS manifest parsed, quality levels:', data.levels.map(l => `${l.height}p`));
        
        // Update available qualities
        const hlsQualities = data.levels.map((level, index) => ({
          id: index.toString(),
          label: `${level.height}p`,
          height: level.height,
          bitrate: level.bitrate
        }));
        
        setAdvancedState(prev => ({
          ...prev,
          qualities: [
            { id: 'auto', label: 'Auto', height: 0, bitrate: 0 },
            ...hlsQualities
          ]
        }));
        
        // Auto-play
        videoRef.current.play().catch(err => {
          console.log('Autoplay prevented:', err);
        });
      });
      
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log(`📺 Quality switched to: ${hls.levels[data.level].height}p`);
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              hls.destroy();
              hlsRef.current = null;
              // Fallback to native playback
              videoRef.current.src = streamUrl;
              break;
          }
        }
      });
      
      // Load source and attach to video
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      
    } catch (error) {
      console.error('HLS.js loading error:', error);
      // Fallback to native playback
      videoRef.current.src = streamUrl;
    }
  }, [streamUrl, streamType]);

  // Set quality handler
  const setQuality = useCallback((qualityId) => {
    if (!hlsRef.current) return;
    
    setAdvancedState(prev => ({ ...prev, currentQuality: qualityId }));
    
    if (qualityId === 'auto') {
      hlsRef.current.currentLevel = -1;
      console.log('✅ Auto quality enabled');
    } else {
      const levelIndex = parseInt(qualityId);
      if (!isNaN(levelIndex) && levelIndex >= 0 && levelIndex < hlsRef.current.levels.length) {
        hlsRef.current.currentLevel = levelIndex;
        console.log(`✅ Quality set to: ${hlsRef.current.levels[levelIndex].height}p`);
      }
    }
  }, []);

  // Video element event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      console.log('✅ Video metadata loaded');
      setPlayerState(prev => ({
        ...prev,
        duration: video.duration || 0,
        isLoading: false
      }));
      setIsInitialized(true);
    };
    
    const handleTimeUpdate = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: video.currentTime || 0,
        buffered: video.buffered.length > 0
          ? video.buffered.end(video.buffered.length - 1)
          : 0
      }));
    };
    
    const handlePlay = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: true, hasError: false }));
    };
    
    const handlePause = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    };
    
    const handleError = async (e) => {
      console.error('Video error:', e);
      
      // Try to recover from the error
      const recovered = await handleRecoverableError(new Error('Video playback error'));
      
      if (!recovered) {
        setPlayerState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Video playback error occurred'
        }));
      }
    };
    
    const handleWaiting = () => {
      setPlayerState(prev => ({ ...prev, isLoading: true }));
    };
    
    const handleCanPlay = () => {
      setPlayerState(prev => ({ ...prev, isLoading: false }));
    };
    
    const handleVolumeChange = () => {
      setPlayerState(prev => ({
        ...prev,
        volume: video.volume,
        isMuted: video.muted
      }));
    };
    
    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('volumechange', handleVolumeChange);
    
    return () => {
      // Remove event listeners
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  // Load video source when stream URL is ready
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    
    console.log('🎬 Loading stream:', { streamType, streamUrl });
    
    if (streamType === 'hls') {
      loadHLS();
    } else {
      videoRef.current.src = streamUrl;
      videoRef.current.load();
    }
    
    return () => {
      // Cleanup HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, streamType, loadHLS]);

  // Enhanced fullscreen functionality
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
      console.error('Fullscreen error:', error);
    }
  }, [playerActions]);

  // Gesture action handler
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
        playerActions.seek(Math.max(0, videoRef.current.currentTime - 10));
        break;
      case 'swipeRight':
        playerActions.seek(Math.min(videoRef.current.duration, videoRef.current.currentTime + 10));
        break;
      case 'tap':
        playerActions.togglePlay();
        break;
      case 'doubleTap':
        toggleFullscreen();
        break;
      default:
        break;
    }
  }, [playerActions, toggleFullscreen]);

  // Voice command handler
  const handleVoiceCommand = useCallback((command) => {
    const { action, value } = command;
    
    switch (action) {
      case 'play':
        playerActions.play();
        break;
      case 'pause':
        playerActions.pause();
        break;
      case 'volume':
        playerActions.setVolume(value / 100);
        break;
      case 'seek':
        playerActions.seek(value);
        break;
      case 'quality':
        setQuality(value);
        break;
      case 'fullscreen':
        toggleFullscreen();
        break;
      default:
        break;
    }
  }, [playerActions, setQuality, toggleFullscreen]);

  // UI visibility management
  const showUI = useCallback(() => {
    setUiVisible(true);
    
    // Clear existing timeout
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current);
    }
    
    // Hide after 3 seconds of inactivity
    uiTimeoutRef.current = setTimeout(() => {
      if (playerState.isPlaying && fullscreenMode === 'immersive') {
        setUiVisible(false);
      }
    }, 3000);
  }, [playerState.isPlaying, fullscreenMode]);

  const hideUI = useCallback(() => {
    if (playerState.isPlaying && fullscreenMode === 'immersive') {
      setUiVisible(false);
    }
  }, [playerState.isPlaying, fullscreenMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || !videoRef.current) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          playerActions.togglePlay();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          playerActions.toggleMute();
          break;
        case 'ArrowLeft':
          playerActions.seek(Math.max(0, videoRef.current.currentTime - 10));
          break;
        case 'ArrowRight':
          playerActions.seek(Math.min(videoRef.current.duration, videoRef.current.currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          playerActions.adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          playerActions.adjustVolume(-0.1);
          break;
        case ',':
          playerActions.setPlaybackRate(advancedState.playbackRate - 0.25);
          break;
        case '.':
          playerActions.setPlaybackRate(advancedState.playbackRate + 0.25);
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [playerActions, toggleFullscreen, advancedState.playbackRate]);

  // Performance monitoring
  useEffect(() => {
    if (!enableAdvancedFeatures || !videoRef.current) return;
    
    const monitorPerformance = () => {
      const video = videoRef.current;
      if (!video || !video.getVideoPlaybackQuality) return;
      
      const quality = video.getVideoPlaybackQuality();
      setPerformanceMetrics(prev => ({
        ...prev,
        droppedFrames: quality.droppedVideoFrames || 0,
        fps: quality.totalVideoFrames > 0
          ? Math.round((quality.totalVideoFrames - quality.droppedVideoFrames) / (video.currentTime || 1))
          : 60
      }));
    };
    
    const interval = setInterval(monitorPerformance, 2000);
    return () => clearInterval(interval);
  }, [enableAdvancedFeatures]);

  // Network health monitoring
  useEffect(() => {
    if (!enableAdvancedFeatures) return;

    networkMonitorRef.current = new NetworkHealthMonitor({
      checkInterval: 5000,
      healthEndpoint: '/api/health',
      onStatusChange: (status, oldStatus) => {
        console.log(`Network status changed: ${oldStatus} → ${status}`);
        
        if (status === 'offline' || status === 'error') {
          setPlayerState(prev => ({
            ...prev,
            isLoading: true
          }));
        } else if (status === 'healthy' && oldStatus !== 'healthy') {
          // Network recovered, try to resume
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(console.error);
          }
        }
      }
    });

    networkMonitorRef.current.start();

    return () => {
      if (networkMonitorRef.current) {
        networkMonitorRef.current.stop();
      }
    };
  }, [enableAdvancedFeatures]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (uiTimeoutRef.current) {
        clearTimeout(uiTimeoutRef.current);
      }
      
      // Cleanup HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Cleanup video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      
      // Stop network monitoring
      if (networkMonitorRef.current) {
        networkMonitorRef.current.stop();
      }
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
  if (streamError || playerState.hasError) {
    return (
      <div className={styles.playerContainer}>
        <div className={styles.errorOverlay}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.errorContent}
          >
            <h3>⚡ Playback Error</h3>
            <p>{streamError || playerState.errorMessage || 'An unexpected error occurred'}</p>
            <div className={styles.errorActions}>
              <button onClick={retryExtraction} className={styles.retryButton}>
                🔄 Retry Stream
              </button>
              <button onClick={onBackToShowDetails} className={styles.backButton}>
                ← Back to Details
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main render
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
            colors={[]}
            effects={{}}
            intensity={advancedState.ambientIntensity}
            mode="default"
          />
        )}
      </AnimatePresence>

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
            style={advancedState.subtitleStyle}
            animations={enableAdvancedFeatures}
          />
        )}
      </AnimatePresence>

      {/* Gesture Overlay */}
      <AnimatePresence>
        {gestureControls && enableAdvancedFeatures && (
          <GestureOverlay
            state={{}}
            enabled={gestureControls}
            feedback={advancedState.gestureVisualFeedback}
            onGesture={handleGestureAction}
          />
        )}
      </AnimatePresence>

      {/* Voice Interface */}
      <AnimatePresence>
        {voiceControls && enableAdvancedFeatures && (
          <VoiceInterface
            state={{}}
            commands={{}}
            onCommand={handleVoiceCommand}
            onStop={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Advanced Settings Panel */}
      <AnimatePresence>
        {settingsVisible && (
          <AdvancedSettings
            playerState={playerState}
            playerActions={playerActions}
            qualities={advancedState.qualities}
            currentQuality={advancedState.currentQuality}
            onQualityChange={setQuality}
            subtitles={subtitles}
            activeSubtitle={activeSubtitle}
            onSubtitleChange={selectSubtitle}
            ambientSettings={{ intensity: advancedState.ambientIntensity }}
            onClose={() => setSettingsVisible(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Performance Dashboard */}
      <AnimatePresence>
        {performanceVisible && enableAdvancedFeatures && (
          <PerformanceDashboard
            analytics={{}}
            performanceStats={performanceMetrics}
            userBehavior={{}}
            insights={{}}
            bufferHealth={100}
            networkMetrics={{ bandwidth: 0, latency: 0 }}
            sessionData={{}}
            onClose={() => setPerformanceVisible(false)}
            onGenerateReport={() => console.log('Generating report...')}
          />
        )}
      </AnimatePresence>

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
        enabled={advancedState.pipEnabled}
        position={advancedState.pipPosition}
        onPositionChange={(pos) => playerActions.setPipPosition(pos)}
      />

      {/* Enhanced Media Controls - No forced re-renders! */}
      <AnimatePresence>
        {uiVisible && (
          <EnhancedMediaControls
            videoRef={videoRef}
            playerState={playerState}
            playerActions={playerActions}
            onToggleFullscreen={toggleFullscreen}
            qualities={advancedState.qualities}
            onSelectQuality={setQuality}
            currentQuality={advancedState.currentQuality}
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

      {/* Settings Toggle Button */}
      <AnimatePresence>
        {uiVisible && (
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            onClick={() => setSettingsVisible(!settingsVisible)}
            className={styles.settingsToggle}
            style={{
              position: 'fixed',
              top: '2rem',
              right: '2rem',
              zIndex: 100,
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '12px',
              color: 'var(--text-primary)',
              fontSize: '20px',
              cursor: 'pointer',
              backdropFilter: 'blur(20px)'
            }}
          >
            ⚙️
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

// Wrapped component with error boundary
const FuturisticMediaPlayer = (props) => {
  const [resetKey, setResetKey] = useState(0);
  
  const handleError = useCallback((errorReport) => {
    console.error('Media Player Error Report:', errorReport);
    // You can send this to an error tracking service
  }, []);
  
  const handleReset = useCallback(() => {
    console.log('Error boundary reset');
    setResetKey(prev => prev + 1);
  }, []);
  
  const handleStreamError = useCallback(() => {
    console.log('Stream error detected, triggering retry...');
    // Force component remount to retry stream
    setResetKey(prev => prev + 1);
  }, []);
  
  return (
    <MediaPlayerErrorBoundary
      resetKey={resetKey}
      onError={handleError}
      onReset={handleReset}
      onStreamError={handleStreamError}
      onBack={props.onBackToShowDetails}
    >
      <StreamErrorBoundary>
        <FuturisticMediaPlayerCore {...props} key={resetKey} />
      </StreamErrorBoundary>
    </MediaPlayerErrorBoundary>
  );
};

export default FuturisticMediaPlayer;