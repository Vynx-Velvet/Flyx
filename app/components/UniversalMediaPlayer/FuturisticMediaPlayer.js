'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FuturisticMediaPlayer.module.css';

// Enhanced hooks and components
import useAdvancedPlayerState from './hooks/useAdvancedPlayerState';
import { useStream } from './hooks/useStream';
import useIntelligentSubtitles from './hooks/useIntelligentSubtitles';
import useAmbientEffects from './hooks/useAmbientEffects';
import useGestureControls from './hooks/useGestureControls';
import useVoiceControls from './hooks/useVoiceControls';
import useAdaptiveQuality from './hooks/useAdaptiveQuality';
import useAdvancedAnalytics from './hooks/useAdvancedAnalytics';
import useFetchMediaDetails from './hooks/useFetchMediaDetails';
import useEpisodeNavigation from './hooks/useEpisodeNavigation';
import useAutoAdvance from './hooks/useAutoAdvance';

// Advanced UI components
import FuturisticControls from './components/FuturisticControls';
import IntelligentSubtitles from './components/IntelligentSubtitles';
import AmbientLighting from './components/AmbientLighting';
import ParticleSystem from './components/ParticleSystem';
import VoiceInterface from './components/VoiceInterface';
import GestureOverlay from './components/GestureOverlay';
import AdvancedSettings from './components/AdvancedSettings';
import PerformanceDashboard from './components/PerformanceDashboard';
import SceneDetector from './components/SceneDetector';
import AdaptiveLoading from './components/AdaptiveLoading';
import SmartThumbnails from './components/SmartThumbnails';
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
  
  // Advanced player state with AI features
  const { state: playerState, actions: playerActions } = useAdvancedPlayerState({
    enableAI: enableAdvancedFeatures,
    adaptiveControls: true
  });
  
  // Enhanced media details with scene analysis
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
    shouldFetch: true
  });

  // Simple video setup without complex HLS for now
  const qualities = [];
  const setQuality = () => {};
  const currentQuality = 'auto';
  const adaptiveSettings = {};
  const playerPerformanceMetrics = {};
  const bufferHealth = 100;
  const networkMetrics = {};

  // Set video source when streamUrl is available
  useEffect(() => {
    if (videoRef.current && streamUrl) {
      console.log('🎬 Setting video source:', streamUrl);
      console.log('📹 Stream type:', streamType);
      console.log('📺 Video element:', videoRef.current);
      console.log('🔗 Current video src before:', videoRef.current.src);
      console.log('📊 Video readyState before:', videoRef.current.readyState);
      
      // For HLS streams, try to use native HLS support first
      if (streamType === 'hls') {
        console.log(' Loading HLS stream');
        
        // Check if browser supports native HLS
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          console.log(' Using native HLS support');
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
              
              console.log(' HLS.js module loaded successfully');
              
              // Check if HLS is supported
              if (HLS.isSupported && HLS.isSupported()) {
                console.log(' HLS.js is supported, initializing...');
                
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
                
                console.log(' Loading HLS stream:', streamUrl);
                hls.loadSource(streamUrl);
                hls.attachMedia(videoRef.current);
                
                // Handle HLS events
                hls.on(HLS.Events.MANIFEST_PARSED, () => {
                  console.log(' HLS manifest parsed successfully');
                });
                
                hls.on(HLS.Events.ERROR, (event, data) => {
                  console.error(' HLS error:', { event, data });
                  if (data.fatal) {
                    console.error(' Fatal HLS error, falling back to direct URL');
                    hls.destroy();
                    videoRef.current.hls = null;
                    videoRef.current.src = streamUrl;
                  }
                });
                
              } else {
                console.warn(' HLS.js not supported on this browser');
                videoRef.current.src = streamUrl;
              }
              
            } catch (error) {
              console.warn(' HLS.js failed to load, using direct URL:', error.message);
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
        console.log('🎯 Loading non-HLS stream directly');
        videoRef.current.src = streamUrl;
      }
      
      // Add debugging after setting src
      console.log('✅ Video src set to:', videoRef.current.src);
      console.log('📊 Video readyState after:', videoRef.current.readyState);
      
      // Force video to load and add event listeners for debugging
      const handleLoadStart = () => console.log('🎬 Video loadstart event');
      const handleLoadedData = () => console.log('✅ Video loadeddata - ready to display');
      const handleCanPlay = () => console.log('▶️ Video canplay - can start playing');
      const handleVideoError = (e) => {
        console.error('❌ Video error:', e);
        console.error('❌ Video error details:', videoRef.current.error);
      };
      
      videoRef.current.addEventListener('loadstart', handleLoadStart);
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
      videoRef.current.addEventListener('canplay', handleCanPlay);
      videoRef.current.addEventListener('error', handleVideoError);
      
      // Force load
      videoRef.current.load();
    } else {
      console.log('❌ Missing requirements:', {
        hasVideoRef: !!videoRef.current,
        hasStreamUrl: !!streamUrl,
        streamUrl
      });
    }
    
    // Clean up HLS instance on unmount
    return () => {
      if (videoRef.current && videoRef.current.hls) {
        videoRef.current.hls.destroy();
        videoRef.current.hls = null;
      }
    };
  }, [streamUrl, streamType]);

  // Intelligent subtitle system
  const { 
    subtitles, 
    activeSubtitle, 
    selectSubtitle, 
    currentSubtitleText,
    subtitlePositions,
    contentAwareness,
    loading: subtitlesLoading
  } = useIntelligentSubtitles({
    imdbId: mediaDetails?.imdb_id, 
    season: seasonId, 
    episode: episodeId, 
    enabled: !!mediaDetails,
    videoRef,
    sceneData,
    enableContentAwareness: enableAdvancedFeatures
  });

  // Simplified ambient effects - DISABLED
  const ambientColors = [];
  const lightingEffects = {};
  const particleConfig = {};
  const atmosphereMode = 'default';

  // Gesture control system
  const {
    gestureState,
    enableGestures,
    disableGestures
  } = useGestureControls({
    containerRef,
    enabled: gestureControls && enableAdvancedFeatures,
    onGesture: (gesture) => handleGestureAction(gesture)
  });

  // Voice control system
  const {
    voiceState = {},
    startListening,
    stopListening,
    voiceCommands = {}
  } = useVoiceControls({
    isEnabled: voiceControls && enableAdvancedFeatures,
    onCommand: (command) => handleVoiceCommand(command)
  }) || {};

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

  // Gesture action handler with analytics tracking
  const handleGestureAction = useCallback((gesture) => {
    // Track gesture usage
    trackEvent('gesture_used', {
      gestureType: gesture.type,
      currentTime: playerState.currentTime,
      isPlaying: playerState.isPlaying,
      contentId: movieId
    });

    switch (gesture.type) {
      case 'swipeUp':
        playerActions.adjustVolume(0.1);
        trackEvent('volume_changed', { method: 'gesture', direction: 'up' });
        break;
      case 'swipeDown':
        playerActions.adjustVolume(-0.1);
        trackEvent('volume_changed', { method: 'gesture', direction: 'down' });
        break;
      case 'swipeLeft':
        playerActions.seek(playerState.currentTime - 10);
        trackEvent('seek', { method: 'gesture', direction: 'backward', seconds: 10 });
        break;
      case 'swipeRight':
        playerActions.seek(playerState.currentTime + 10);
        trackEvent('seek', { method: 'gesture', direction: 'forward', seconds: 10 });
        break;
      case 'tap':
        playerActions.togglePlay();
        trackEvent(playerState.isPlaying ? 'video_pause' : 'video_play', {
          method: 'gesture',
          currentTime: playerState.currentTime
        });
        break;
      case 'doubleTap':
        toggleFullscreen();
        trackEvent('fullscreen_toggle', { method: 'gesture' });
        break;
      case 'pinch':
        if (gesture.scale > 1.2) {
          toggleFullscreen();
          trackEvent('fullscreen_toggle', { method: 'pinch_gesture', scale: gesture.scale });
        }
        break;
    }
  }, [playerActions, playerState.currentTime, playerState.isPlaying, movieId, trackEvent]);

  // Voice command handler with analytics tracking
  const handleVoiceCommand = useCallback((command) => {
    const { action, value, confidence } = command;
    
    // Track voice command usage
    trackEvent('voice_command_used', {
      action,
      value,
      confidence,
      currentTime: playerState.currentTime,
      contentId: movieId
    });
    
    switch (action) {
      case 'play':
        playerActions.setPlaying(true);
        trackEvent('video_play', { method: 'voice' });
        break;
      case 'pause':
        playerActions.setPlaying(false);
        trackEvent('video_pause', { method: 'voice' });
        break;
      case 'volume':
        playerActions.setVolume(value / 100);
        trackEvent('volume_changed', { method: 'voice', volume: value });
        break;
      case 'seek':
        playerActions.seek(value);
        trackEvent('seek', { method: 'voice', targetTime: value });
        break;
      case 'quality':
        setQuality(value);
        trackEvent('quality_change', { method: 'voice', quality: value });
        break;
      case 'subtitle':
        // Find subtitle by language
        const subtitle = subtitles.find(s =>
          s.language.toLowerCase().includes(value.toLowerCase())
        );
        if (subtitle) {
          selectSubtitle(subtitle);
          trackEvent('subtitle_change', { method: 'voice', language: subtitle.language });
        }
        break;
      case 'next':
        if (hasNextEpisode) {
          goToNextEpisode();
          trackEvent('episode_change', { method: 'voice', direction: 'next' });
        }
        break;
      case 'previous':
        if (hasPreviousEpisode) {
          goToPreviousEpisode();
          trackEvent('episode_change', { method: 'voice', direction: 'previous' });
        }
        break;
      case 'fullscreen':
        toggleFullscreen();
        trackEvent('fullscreen_toggle', { method: 'voice' });
        break;
    }
  }, [playerActions, subtitles, hasNextEpisode, hasPreviousEpisode, playerState.currentTime, movieId, trackEvent]);

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
      console.error('❌ Fullscreen error:', error);
    }
  }, [playerActions]);

  // UI visibility management with smart auto-hide
  const showUI = useCallback(() => {
    setUiVisible(true);
    playerActions.resetUITimer();
  }, [playerActions]);

  const hideUI = useCallback(() => {
    if (playerState.isPlaying && fullscreenMode === 'immersive') {
      setUiVisible(false);
    }
  }, [playerState.isPlaying, fullscreenMode]);

  // Enhanced video event handlers with analytics
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !playerState.isSeeking) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      playerActions.setCurrentTime(currentTime);
      
      // Track viewing progress milestones
      if (duration > 0) {
        const progress = (currentTime / duration) * 100;
        const milestone = Math.floor(progress / 25) * 25; // 25%, 50%, 75%, 100%
        
        if (milestone > 0 && milestone !== playerState.lastProgressMilestone) {
          trackEvent('progress_milestone', {
            milestone: `${milestone}%`,
            currentTime,
            duration,
            contentId: movieId
          });
          playerActions.setLastProgressMilestone(milestone);
        }
      }
      
      // Update buffer info
      if (videoRef.current.buffered.length > 0) {
        playerActions.setBuffered(
          videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
        );
      }
    }
  }, [playerActions, playerState.isSeeking, playerState.lastProgressMilestone, movieId, trackEvent]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      playerActions.setDuration(duration);
      setIsInitialized(true);
      
      // Track video load completion
      trackEvent('video_load_complete', {
        duration,
        contentId: movieId,
        quality: currentQuality,
        loadTime: performance.now() - playerState.loadStartTime
      });
    }
  }, [playerActions, movieId, currentQuality, playerState.loadStartTime, trackEvent]);

  // Initialize player with analytics tracking
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      // Track session start
      trackEvent('session_start', {
        contentId: movieId,
        mediaType,
        seasonId,
        episodeId,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
      
      // Enhanced event handlers with analytics
      const handlePlay = () => {
        playerActions.setPlaying(true);
        trackEvent('video_play', {
          currentTime: video.currentTime,
          method: 'auto_or_click',
          contentId: movieId
        });
      };
      
      const handlePause = () => {
        playerActions.setPlaying(false);
        trackEvent('video_pause', {
          currentTime: video.currentTime,
          method: 'user_action',
          contentId: movieId
        });
      };
      
      const handleEnded = () => {
        trackEvent('video_complete', {
          duration: video.duration,
          contentId: movieId,
          completionRate: 100
        });
      };
      
      const handleError = (e) => {
        trackEvent('error', {
          type: 'video_error',
          error: e.target.error?.message || 'Unknown video error',
          currentTime: video.currentTime,
          contentId: movieId
        });
      };
      
      const handleWaiting = () => {
        trackEvent('buffering_start', {
          currentTime: video.currentTime,
          contentId: movieId
        });
      };
      
      const handleCanPlay = () => {
        trackEvent('buffering_end', {
          currentTime: video.currentTime,
          contentId: movieId
        });
      };
      
      // Add event listeners
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('error', handleError);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('canplay', handleCanPlay);
      
      return () => {
        // Track session end
        trackEvent('session_end', {
          duration: sessionData.duration,
          interactions: sessionData.interactions,
          contentId: movieId
        });
        
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('error', handleError);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [handleTimeUpdate, handleLoadedMetadata, playerActions, trackEvent, movieId, mediaType, seasonId, episodeId, sessionData]);

  // Keyboard shortcuts with analytics tracking
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      // Track keyboard shortcut usage
      const trackKeyboardAction = (action, key) => {
        trackEvent('keyboard_shortcut', {
          key,
          action,
          currentTime: playerState.currentTime,
          contentId: movieId
        });
      };
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          playerActions.togglePlay();
          trackKeyboardAction(playerState.isPlaying ? 'pause' : 'play', 'space');
          break;
        case 'f':
          toggleFullscreen();
          trackKeyboardAction('fullscreen_toggle', 'f');
          break;
        case 'm':
          playerActions.toggleMute();
          trackKeyboardAction('mute_toggle', 'm');
          break;
        case 'ArrowLeft':
          playerActions.seek(playerState.currentTime - 10);
          trackKeyboardAction('seek_backward', 'arrow_left');
          break;
        case 'ArrowRight':
          playerActions.seek(playerState.currentTime + 10);
          trackKeyboardAction('seek_forward', 'arrow_right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          playerActions.adjustVolume(0.1);
          trackKeyboardAction('volume_up', 'arrow_up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          playerActions.adjustVolume(-0.1);
          trackKeyboardAction('volume_down', 'arrow_down');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [playerActions, playerState.currentTime, playerState.isPlaying, toggleFullscreen, trackEvent, movieId]);

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
        data-testid="futuristic-video-player"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'rgba(255, 0, 0, 0.1)', // Red tint for debugging
          border: '2px solid lime', // Bright green border for debugging
          zIndex: 10
        }}
        onLoadStart={() => console.log('🎬 Video onLoadStart event')}
        onLoadedData={() => console.log('✅ Video onLoadedData event')}
        onLoadedMetadata={() => console.log('📋 Video onLoadedMetadata event')}
        onCanPlay={() => console.log('▶️ Video onCanPlay event')}
        onCanPlayThrough={() => console.log('🎯 Video onCanPlayThrough event')}
        onProgress={() => console.log('⏳ Video onProgress event')}
        onTimeUpdate={() => console.log('⏱️ Video onTimeUpdate event')}
        onPlay={() => console.log('▶️ Video onPlay event')}
        onError={(e) => console.error('❌ Video onError event:', e)}
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
            position={subtitlePositions.current}
            contentAwareness={contentAwareness}
            style={playerState.subtitleStyle}
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

      {/* Scene Detection Overlay */}
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

      {/* Smart Thumbnails for Seeking */}
      <SmartThumbnails
        videoRef={videoRef}
        canvasRef={canvasRef}
        duration={playerState.duration}
        scenes={sceneData?.scenes}
        enabled={enableAdvancedFeatures}
      />

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

      {/* Futuristic Controls */}
      <AnimatePresence>
        {uiVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className={styles.controlsContainer}
          >
            <FuturisticControls
              playerState={playerState}
              playerActions={playerActions}
              onToggleFullscreen={toggleFullscreen}
              qualities={qualities}
              onSelectQuality={setQuality}
              currentQuality={currentQuality}
              subtitles={subtitles}
              onSelectSubtitle={selectSubtitle}
              activeSubtitle={activeSubtitle}
              videoRef={videoRef}
              enableAdvanced={enableAdvancedFeatures}
              theme={theme}
              onSettingsOpen={() => setSettingsVisible(true)}
              onPerformanceOpen={() => setPerformanceVisible(true)}
              voiceControls={{
                enabled: voiceControls,
                listening: voiceState?.listening || false,
                onStart: startListening,
                onStop: stopListening
              }}
            />
          </motion.div>
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