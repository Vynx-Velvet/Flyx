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
import useWatchProgress from './hooks/useWatchProgress';

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
const ResumeDialog = dynamic(() => import('./components/ResumeDialog'), { ssr: false });

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
  episodeData = null, // NEW: Structured episode data from ShowDetails
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
  const forceSyncRef = useRef(null);
  const syncCounterRef = useRef(0);
  const playbackStartProtectionRef = useRef(false);
  const lastSyncTimestamp = useRef(0);
  const syncDebounceRef = useRef(null);
  const playbackStartTimeRef = useRef(null);

  // UI state
  const [isInitialized, setIsInitialized] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [performanceVisible, setPerformanceVisible] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState('standard');
  const [episodeCarouselVisible, setEpisodeCarouselVisible] = useState(false); // NEW: Episode carousel visibility control
  const [resumeDialogVisible, setResumeDialogVisible] = useState(false); // NEW: Resume dialog visibility control

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

  // PROTECTED SYNC FUNCTION WITH PLAYBACK START CIRCUIT BREAKER
  const forceStateSync = useCallback((eventType = 'unknown', extraData = {}) => {
    const video = videoRef.current;
    if (!video) {
      console.warn('🔄 FORCE SYNC: Video ref not available');
      return false;
    }

    // **CRITICAL FIX 1: Playback Start Protection**
    const now = Date.now();
    const isPlaybackStart = playbackStartProtectionRef.current;
    const timeSincePlaybackStart = playbackStartTimeRef.current ? now - playbackStartTimeRef.current : 0;

    // **CRITICAL FIX: Allow time updates to always pass through**
    const isTimeUpdate = eventType.includes('timeupdate') || eventType.includes('Time');

    // During playback start (first 3 seconds), apply strict debouncing BUT ALLOW TIME UPDATES
    if (isPlaybackStart && timeSincePlaybackStart < 3000 && !isTimeUpdate) {
      // Only allow one sync every 100ms during playback start (except time updates)
      if (now - lastSyncTimestamp.current < 100) {
        console.log(`🛡️ PLAYBACK START PROTECTION: Sync blocked for ${eventType} - too frequent`);
        return false;
      }

      // Clear any pending debounced sync
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = null;
      }

      // Log critical playback start events
      if (eventType.includes('play') || eventType.includes('manifest') || eventType.includes('loadedmetadata')) {
        console.log(`🚀 CRITICAL PLAYBACK START EVENT: ${eventType} at T+${timeSincePlaybackStart}ms`);
      }
    }

    syncCounterRef.current++;
    const syncId = syncCounterRef.current;
    lastSyncTimestamp.current = now;

    // **CRITICAL FIX 2: Enhanced Video State Reading with Validation**
    let videoState;
    try {
      videoState = {
        isPlaying: !video.paused && video.readyState >= 2,
        currentTime: isFinite(video.currentTime) ? video.currentTime : 0,
        duration: isFinite(video.duration) ? video.duration : 0,
        volume: isFinite(video.volume) ? video.volume : 0.8,
        isMuted: Boolean(video.muted),
        buffered: video.buffered.length > 0 ? (isFinite(video.buffered.end(video.buffered.length - 1)) ? video.buffered.end(video.buffered.length - 1) : 0) : 0,
        readyState: video.readyState,
        networkState: video.networkState,
        seeking: Boolean(video.seeking),
        ended: Boolean(video.ended),
        error: video.error,
        playbackRate: isFinite(video.playbackRate) ? video.playbackRate : 1.0
      };
    } catch (error) {
      console.error('🚨 ERROR READING VIDEO STATE:', error);
      return false;
    }

    // **CRITICAL FIX 3: Enhanced Playback Start Logging**
    if (isPlaybackStart || eventType.includes('play') || eventType.includes('manifest')) {
      console.log(`🔄 PROTECTED SYNC #${syncId} [${eventType}] T+${timeSincePlaybackStart}ms:`, {
        playbackStartMode: isPlaybackStart,
        timeSinceStart: timeSincePlaybackStart,
        trigger: eventType,
        extraData,
        videoElement: {
          paused: video.paused,
          currentTime: videoState.currentTime?.toFixed(2),
          duration: videoState.duration?.toFixed(2),
          readyState: video.readyState,
          networkState: video.networkState,
          seeking: video.seeking,
          ended: video.ended,
          error: video.error?.message,
          src: video.currentSrc ? 'loaded' : 'no source'
        }
      });
    }

    // **CRITICAL FIX 4: State Update with Circuit Breaker**
    setPlayerState(prev => {
      const changes = {};
      let hasChanges = false;

      // Validate changes before applying
      if (prev.isPlaying !== videoState.isPlaying && typeof videoState.isPlaying === 'boolean') {
        changes.isPlaying = videoState.isPlaying;
        hasChanges = true;
      }
      if (Math.abs(prev.currentTime - videoState.currentTime) > 0.01 && isFinite(videoState.currentTime)) {
        changes.currentTime = videoState.currentTime;
        hasChanges = true;
      }
      if (Math.abs(prev.duration - videoState.duration) > 0.01 && isFinite(videoState.duration)) {
        changes.duration = videoState.duration;
        hasChanges = true;
      }
      if (Math.abs(prev.volume - videoState.volume) > 0.01 && isFinite(videoState.volume)) {
        changes.volume = videoState.volume;
        hasChanges = true;
      }
      if (prev.isMuted !== videoState.isMuted && typeof videoState.isMuted === 'boolean') {
        changes.isMuted = videoState.isMuted;
        hasChanges = true;
      }
      if (Math.abs(prev.buffered - videoState.buffered) > 0.1 && isFinite(videoState.buffered)) {
        changes.buffered = videoState.buffered;
        hasChanges = true;
      }

      if (hasChanges) {
        return {
          ...prev,
          ...changes,
          hasError: videoState.error ? true : prev.hasError,
          errorMessage: videoState.error?.message || (videoState.error ? prev.errorMessage : null),
          isLoading: videoState.readyState < 2 ? true : false
        };
      }

      return prev;
    });

    return true;
  }, []);

  // **CRITICAL FIX 5: Playback Start State Management**
  const startPlaybackProtection = useCallback(() => {
    playbackStartProtectionRef.current = true;
    playbackStartTimeRef.current = Date.now();
    console.log('🛡️ PLAYBACK START PROTECTION: ENABLED');

    // Automatically disable protection after 5 seconds
    setTimeout(() => {
      playbackStartProtectionRef.current = false;
      console.log('🛡️ PLAYBACK START PROTECTION: DISABLED');
    }, 5000);
  }, []);

  const stopPlaybackProtection = useCallback(() => {
    playbackStartProtectionRef.current = false;
    console.log('🛡️ PLAYBACK START PROTECTION: MANUALLY DISABLED');
  }, []);

  // Player actions - Enhanced with forced sync after every action
  const playerActions = useMemo(() => ({
    play: async () => {
      const video = videoRef.current;
      if (!video) {
        console.error('🚨 DEFENSIVE: play() called but video ref is null');
        return;
      }

      // **DEFENSIVE FIX: Check video readiness**
      if (video.readyState < 2) {
        console.warn('🚨 DEFENSIVE: Video not ready for play, readyState:', video.readyState);
        return;
      }

      try {
        console.log('🎬 PLAYER ACTION: play() called');
        startPlaybackProtection(); // Enable protection before play
        await video.play();
        console.log('🎬 PLAYER ACTION: play() succeeded');
        // Protected sync after action
        setTimeout(() => forceStateSync('player-action-play'), 100);
      } catch (err) {
        console.error('🚨 Play error:', err);
        stopPlaybackProtection(); // Disable protection on error
        setPlayerState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Failed to play video: ' + (err.message || 'Unknown error')
        }));
        forceStateSync('player-action-play-error', { error: err.message });
      }
    },

    pause: () => {
      const video = videoRef.current;
      if (!video) {
        console.error('🚨 DEFENSIVE: pause() called but video ref is null');
        return;
      }

      try {
        console.log('⏸️ PLAYER ACTION: pause() called');
        video.pause();
        console.log('⏸️ PLAYER ACTION: pause() executed');
        // Protected sync after action
        setTimeout(() => forceStateSync('player-action-pause'), 50);
      } catch (err) {
        console.error('🚨 Pause error:', err);
        forceStateSync('player-action-pause-error', { error: err.message });
      }
    },

    togglePlay: async () => {
      const video = videoRef.current;
      if (!video) {
        console.error('🚨 DEFENSIVE: togglePlay called but video ref is null!');
        return;
      }

      // **DEFENSIVE FIX: Check video state validity**
      if (typeof video.paused !== 'boolean') {
        console.error('🚨 DEFENSIVE: Invalid video.paused state');
        return;
      }

      const isCurrentlyPaused = video.paused;
      console.log('🎬 PLAYER ACTION: togglePlay called - video.paused:', isCurrentlyPaused);

      try {
        if (isCurrentlyPaused) {
          if (video.readyState < 2) {
            console.warn('🚨 DEFENSIVE: Video not ready for play in togglePlay');
            return;
          }

          console.log('🎬 PLAYER ACTION: Attempting to play video...');
          startPlaybackProtection(); // Enable protection before play
          await video.play();
          console.log('🎬 PLAYER ACTION: Video.play() succeeded');
        } else {
          console.log('🎬 PLAYER ACTION: Pausing video...');
          video.pause();
        }
      } catch (err) {
        console.error('🚨 PLAYER ACTION: Toggle play failed:', err);
        stopPlaybackProtection(); // Disable protection on error
        setPlayerState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Failed to toggle playback: ' + (err.message || 'Unknown error')
        }));
      }

      // Protected sync after toggle action
      setTimeout(() => forceStateSync('player-action-toggle-play', { wasPlaying: !isCurrentlyPaused }), 100);
    },

    seek: (time) => {
      const video = videoRef.current;
      if (!video) {
        console.error('🚨 DEFENSIVE: seek() called but video ref is null');
        return;
      }

      // **DEFENSIVE FIX: Validate time parameter**
      if (!isFinite(time) || time < 0) {
        console.error('🚨 DEFENSIVE: Invalid seek time:', time);
        return;
      }

      // **DEFENSIVE FIX: Check duration availability**
      const duration = isFinite(video.duration) ? video.duration : 0;
      if (duration === 0) {
        console.warn('🚨 DEFENSIVE: Cannot seek - video duration not available');
        return;
      }

      try {
        const clampedTime = Math.max(0, Math.min(duration, time));
        console.log('⏩ PLAYER ACTION: seek() to', clampedTime);
        video.currentTime = clampedTime;
        // Protected sync after seek
        setTimeout(() => forceStateSync('player-action-seek', { targetTime: clampedTime }), 50);
      } catch (err) {
        console.error('🚨 Seek error:', err);
        forceStateSync('player-action-seek-error', { error: err.message });
      }
    },

    setVolume: (volume) => {
      const video = videoRef.current;
      if (video && isFinite(volume)) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        console.log('🔊 PLAYER ACTION: setVolume() to', clampedVolume);
        video.volume = clampedVolume;
        video.muted = clampedVolume === 0;
        // Force immediate sync after volume change
        setTimeout(() => forceStateSync('player-action-set-volume', { volume: clampedVolume }), 0);
      }
    },

    adjustVolume: (delta) => {
      const video = videoRef.current;
      if (video && isFinite(delta)) {
        const newVolume = Math.max(0, Math.min(1, video.volume + delta));
        console.log('🔊 PLAYER ACTION: adjustVolume() by', delta, 'to', newVolume);
        video.volume = newVolume;
        video.muted = newVolume === 0;
        // Force immediate sync after volume adjustment
        setTimeout(() => forceStateSync('player-action-adjust-volume', { delta, newVolume }), 0);
      }
    },

    toggleMute: () => {
      const video = videoRef.current;
      if (video) {
        const wasMuted = video.muted;
        console.log('🔇 PLAYER ACTION: toggleMute() - was muted:', wasMuted);
        video.muted = !wasMuted;
        if (wasMuted && video.volume === 0) {
          video.volume = 0.8;
        }
        // Force immediate sync after mute toggle
        setTimeout(() => forceStateSync('player-action-toggle-mute', { wasMuted, newVolume: video.volume }), 0);
      }
    },

    setFullscreen: (isFullscreen) => {
      setPlayerState(prev => ({ ...prev, isFullscreen }));
    },

    setPlaybackRate: (rate) => {
      const video = videoRef.current;
      if (video && isFinite(rate)) {
        const clampedRate = Math.max(0.25, Math.min(4, rate));
        console.log('⚡ PLAYER ACTION: setPlaybackRate() to', clampedRate);
        video.playbackRate = clampedRate;
        setAdvancedState(prev => ({ ...prev, playbackRate: clampedRate }));
        // Force immediate sync after playback rate change
        setTimeout(() => forceStateSync('player-action-set-playback-rate', { rate: clampedRate }), 0);
      }
    },

    setPipPosition: (position) => {
      console.log('🖼️ PLAYER ACTION: setPipPosition()', position);
      setAdvancedState(prev => ({ ...prev, pipPosition: position }));
    },

    toggleEpisodeCarousel: () => {
      console.log('📺 PLAYER ACTION: toggleEpisodeCarousel()');
      setEpisodeCarouselVisible(prev => {
        const newValue = !prev;
        try {
          localStorage.setItem('episode-carousel-visible', JSON.stringify(newValue));
        } catch (e) {
          console.warn('Failed to save episode carousel preference:', e);
        }
        return newValue;
      });
    },

  }), [forceStateSync]); // Include forceStateSync in dependencies

  // Parse season/episode IDs utility function
  const parseIds = useCallback((sId, eId) => {
    if (!sId || !eId) return { seasonNumber: null, episodeNumber: null };

    // Parse season ID (format: "season_1" or just "1")
    const seasonNumber = typeof sId === 'string' ?
      (sId.startsWith('season_') ? parseInt(sId.replace('season_', '')) : parseInt(sId)) :
      parseInt(sId);

    // Parse episode ID (format: "ep_1_1" or just "1")
    const episodeNumber = typeof eId === 'string' ?
      (eId.includes('_') ? parseInt(eId.split('_').pop()) : parseInt(eId)) :
      parseInt(eId);

    return { seasonNumber, episodeNumber };
  }, []);

  // Enhanced media details fetching
  const { details: mediaDetails, sceneData } = useFetchMediaDetails(movieId, mediaType, {
    enableSceneDetection: enableAdvancedFeatures,
    enableContentAnalysis: true
  });

  // Stream extraction and management
  const shouldFetch = !!(movieId && (mediaType !== 'tv' || (seasonId && episodeId)));

  console.log('🎬 MEDIA PLAYER DEBUG: useStream parameters', {
    mediaType,
    movieId,
    seasonId,
    episodeId,
    shouldFetch,
    componentProps: { mediaType, movieId, seasonId, episodeId }
  });

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
    shouldFetch
  });

  // Add logging to track when stream data is available
  useEffect(() => {
    console.log('🎯 STREAM STATE UPDATE:', {
      streamUrl: streamUrl ? streamUrl.substring(0, 100) + '...' : null,
      streamType,
      streamLoading,
      streamError,
      loadingProgress,
      loadingPhase
    });

    if (streamUrl) {
      console.log('✅ Stream URL received in media player:', { streamUrl, streamType });
    }
  }, [streamUrl, streamType, streamLoading, streamError, loadingProgress, loadingPhase]);

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

  // Episode navigation for TV shows - Now uses provided data
  const {
    hasNextEpisode,
    hasPreviousEpisode,
    goToNextEpisode,
    goToPreviousEpisode,
    getCurrentEpisode,
    getNextEpisode,
    getPreviousEpisode,
    episodeData: normalizedEpisodeData
  } = useEpisodeNavigation({
    mediaType,
    movieId,
    seasonId,
    episodeId,
    episodeData, // NEW: Pass the structured data from ShowDetails
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

  // Watch progress tracking - NEW
  const {
    progressData,
    progressPercentage,
    isCompleted,
    isStarted,
    canResume,
    timeRemaining,
    isLoading: progressLoading,
    hasUnsavedChanges,
    saveProgress,
    forceSave,
    resumePlayback,
    restartPlayback,
    markCompleted,
    clearProgress,
    shouldShowResume
  } = useWatchProgress({
    mediaType,
    movieId,
    seasonId,
    episodeId,
    videoRef,
    autoSave: true,
    saveInterval: 10,
    completionThreshold: 0.9
  });

  // Watch progress actions - defined after useWatchProgress hook
  const watchProgressActions = useMemo(() => ({
    resumeVideo: () => {
      const success = resumePlayback();
      if (success) {
        setResumeDialogVisible(false);
        console.log('🎯 Resumed from saved position');
      }
    },

    restartVideo: () => {
      const success = restartPlayback();
      if (success) {
        setResumeDialogVisible(false);
        console.log('🔄 Restarted from beginning');
      }
    },

    dismissResumeDialog: () => {
      setResumeDialogVisible(false);
      console.log('❌ Resume dialog dismissed');
    }
  }), [resumePlayback, restartPlayback]);

  // Enhanced HLS.js loading with proper cleanup
  const loadHLS = useCallback(async (currentStreamUrl = streamUrl, currentStreamType = streamType) => {
    console.log('🎬 loadHLS CALLED:', {
      hasStreamUrl: !!currentStreamUrl,
      streamType: currentStreamType,
      hasVideoRef: !!videoRef.current,
      videoReadyState: videoRef.current?.readyState,
      streamUrl: currentStreamUrl ? currentStreamUrl.substring(0, 100) + '...' : null
    });

    if (!currentStreamUrl || currentStreamType !== 'hls' || !videoRef.current) {
      console.log('🎬 HLS load skipped:', { currentStreamUrl: !!currentStreamUrl, currentStreamType, videoReady: !!videoRef.current });
      return;
    }

    // Wait for video element to be ready
    if (videoRef.current.readyState === 0) {
      console.log('⏳ Waiting for video element to be ready...');
      await new Promise((resolve) => {
        const checkReady = () => {
          if (videoRef.current && videoRef.current.readyState > 0) {
            console.log('✅ Video element is now ready');
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
    }

    console.log('🎬 Loading HLS stream:', { currentStreamUrl: currentStreamUrl.substring(0, 80) + '...', currentStreamType });

    // Check for native HLS support (Safari)
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🎬 Using native HLS support');
      videoRef.current.src = currentStreamUrl;
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
        console.log('✅ HLS.js loaded from CDN');
      }

      if (!Hls.isSupported()) {
        console.warn('HLS.js not supported, falling back to native playback');
        videoRef.current.src = currentStreamUrl;
        return;
      }

      console.log('✅ HLS.js is supported');

      // Clean up existing instance
      if (hlsRef.current) {
        console.log('🧹 Cleaning up existing HLS instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      console.log('🎬 Creating new HLS instance...');
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

      // **CRITICAL FIX 6: Protected HLS MANIFEST_PARSED Handler**
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('📊 HLS MANIFEST_PARSED: Starting playback start protection');

        // **ENABLE PLAYBACK START PROTECTION**
        startPlaybackProtection();

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

        // **DELAYED PLAYBACK START WITH PROTECTION**
        setTimeout(() => {
          // Check for resume dialog before auto-play
          if (shouldShowResume() && !resumeDialogVisible) {
            setResumeDialogVisible(true);
            console.log('📺 Showing resume dialog for saved progress');
          } else {
            // Protected auto-play with error handling
            console.log('🚀 MANIFEST_PARSED: Attempting protected auto-play');
            videoRef.current?.play()?.then(() => {
              console.log('✅ MANIFEST_PARSED: Auto-play successful');
              // Force sync after successful play
              setTimeout(() => forceStateSync('hls-manifest-autoplay-success'), 100);
            }).catch(err => {
              console.log('⚠️ MANIFEST_PARSED: Autoplay prevented:', err);
              // Force sync even if autoplay fails
              setTimeout(() => forceStateSync('hls-manifest-autoplay-blocked'), 100);
            });
          }
        }, 50); // Small delay to ensure HLS is fully ready
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
              videoRef.current.src = currentStreamUrl;
              break;
          }
        }
      });

      // Load source and attach to video
      console.log('🎬 HLS: Loading source and attaching to video');
      hls.loadSource(currentStreamUrl);
      hls.attachMedia(videoRef.current);

      // Set a timeout to detect if HLS is stuck
      const hlsTimeout = setTimeout(() => {
        if (!isInitialized) {
          console.error('🚨 HLS TIMEOUT: Video failed to initialize within 30 seconds');
          setPlayerState(prev => ({
            ...prev,
            hasError: true,
            errorMessage: 'Video player initialization timeout. The stream may be unavailable or blocked.'
          }));
        }
      }, 30000); // 30 second timeout

      // Clear timeout when manifest is parsed
      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(hlsTimeout);
      });

    } catch (error) {
      console.error('HLS.js loading error:', error);
      setPlayerState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: 'Failed to initialize HLS player: ' + error.message
      }));
      // Fallback to native playback
      try {
        videoRef.current.src = currentStreamUrl;
      } catch (fallbackError) {
        console.error('Native playback fallback also failed:', fallbackError);
      }
    }
  }, [streamUrl, streamType, startPlaybackProtection, shouldShowResume, resumeDialogVisible, setAdvancedState, forceStateSync, isInitialized]);

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

    // ENHANCED EVENT HANDLERS WITH AGGRESSIVE FORCED SYNC
    const handleLoadedMetadata = () => {
      console.log('✅ VIDEO EVENT: loadedmetadata');
      setIsInitialized(true);
      // Force immediate sync after metadata loaded
      setTimeout(() => forceStateSync('video-event-loadedmetadata'), 0);
    };

    const handleTimeUpdate = () => {
      // Throttle time updates to every 250ms to reduce render cycles
      const now = Date.now();
      if (now - lastSyncTimestamp.current < 250) {
        return;
      }
      forceStateSync('video-event-timeupdate');
    };

    const handlePlay = () => {
      console.log('🎬 VIDEO EVENT: play - CRITICAL PLAYBACK START');

      // **CRITICAL FIX 7: Enable protection on any play event**
      if (!playbackStartProtectionRef.current) {
        startPlaybackProtection();
      }

      // Protected sync with delay
      setTimeout(() => forceStateSync('video-event-play'), 50);
    };

    const handlePause = () => {
      console.log('⏸️ VIDEO EVENT: pause');
      // Force immediate sync after pause event
      setTimeout(() => forceStateSync('video-event-pause'), 0);
    };

    const handleError = async (e) => {
      console.error('❌ VIDEO EVENT: error', e);
      // Try to recover from the error
      const recovered = await handleRecoverableError(new Error('Video playback error'));
      if (!recovered) {
        setPlayerState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Video playback error occurred'
        }));
      }
      // Force sync after error
      setTimeout(() => forceStateSync('video-event-error', { error: e.message }), 0);
    };

    const handleWaiting = () => {
      console.log('⏳ VIDEO EVENT: waiting');
      // Force sync after waiting event
      setTimeout(() => forceStateSync('video-event-waiting'), 0);
    };

    const handleCanPlay = () => {
      console.log('✅ VIDEO EVENT: canplay');
      // Force sync after canplay event
      setTimeout(() => forceStateSync('video-event-canplay'), 0);
    };

    const handleLoadStart = () => {
      console.log('🔄 VIDEO EVENT: loadstart');
      // Force sync after loadstart event
      setTimeout(() => forceStateSync('video-event-loadstart'), 0);
    };

    const handleLoadedData = () => {
      console.log('📊 VIDEO EVENT: loadeddata');
      // Force sync after loadeddata event
      setTimeout(() => forceStateSync('video-event-loadeddata'), 0);
    };

    const handleVolumeChange = () => {
      console.log('🔊 VIDEO EVENT: volumechange');
      // Force sync after volume change
      setTimeout(() => forceStateSync('video-event-volumechange'), 0);
    };

    const handleSeeking = () => {
      console.log('⏩ VIDEO EVENT: seeking');
      // Force sync after seeking event
      setTimeout(() => forceStateSync('video-event-seeking'), 0);
    };

    const handleSeeked = () => {
      console.log('✅ VIDEO EVENT: seeked');
      // Force sync after seeked event
      setTimeout(() => forceStateSync('video-event-seeked'), 0);
    };

    const handleEnded = () => {
      console.log('🏁 VIDEO EVENT: ended');
      // Force sync after ended event
      setTimeout(() => forceStateSync('video-event-ended'), 0);
    };

    // ENHANCED EVENT LISTENERS WITH AGGRESSIVE FORCED SYNC
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ended', handleEnded);

    // Additional comprehensive event listeners for perfect sync
    video.addEventListener('durationchange', () => {
      console.log('⏱️ VIDEO EVENT: durationchange');
      setTimeout(() => forceStateSync('video-event-durationchange'), 0);
    });

    video.addEventListener('ratechange', () => {
      console.log('⚡ VIDEO EVENT: ratechange');
      setTimeout(() => forceStateSync('video-event-ratechange'), 0);
    });

    video.addEventListener('progress', () => {
      // Throttle progress events to reduce render cycles
      const now = Date.now();
      if (now - lastSyncTimestamp.current < 500) {
        return;
      }
      forceStateSync('video-event-progress');
    });

    video.addEventListener('canplaythrough', () => {
      console.log('✅ VIDEO EVENT: canplaythrough');
      setTimeout(() => forceStateSync('video-event-canplaythrough'), 0);
    });

    video.addEventListener('stalled', () => {
      console.log('🛑 VIDEO EVENT: stalled');
      setTimeout(() => forceStateSync('video-event-stalled'), 0);
    });

    video.addEventListener('suspend', () => {
      console.log('⏸️ VIDEO EVENT: suspend');
      setTimeout(() => forceStateSync('video-event-suspend'), 0);
    });

    video.addEventListener('abort', () => {
      console.log('❌ VIDEO EVENT: abort');
      setTimeout(() => forceStateSync('video-event-abort'), 0);
    });

    video.addEventListener('emptied', () => {
      console.log('🚫 VIDEO EVENT: emptied');
      setTimeout(() => forceStateSync('video-event-emptied'), 0);
    });

    // IMMEDIATE INITIAL FORCE SYNC
    setTimeout(() => forceStateSync('video-element-initialization'), 0);

    return () => {
      // Remove all event listeners
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('durationchange', () => { });
      video.removeEventListener('ratechange', () => { });
      video.removeEventListener('progress', () => { });
      video.removeEventListener('canplaythrough', () => { });
      video.removeEventListener('stalled', () => { });
      video.removeEventListener('suspend', () => { });
      video.removeEventListener('abort', () => { });
      video.removeEventListener('emptied', () => { });
    };
  }, [forceStateSync]); // Include forceStateSync in dependencies

  // **CRITICAL FIX 8: REDUCED CONTINUOUS SYNC FREQUENCY**
  // Only sync every 500ms instead of 100ms to reduce render cycles
  useEffect(() => {
    if (!videoRef.current) return;

    console.log('🧠 INTELLIGENT SYNC: Starting adaptive sync monitoring (500ms interval)');

    const adaptiveSyncInterval = setInterval(() => {
      if (videoRef.current) {
        const isPlaybackStart = playbackStartProtectionRef.current;

        // Skip sync during playback start protection
        if (isPlaybackStart) {
          return;
        }

        forceStateSync('continuous-intelligent-sync');
      }
    }, 500); // Reduced from 100ms to 500ms

    return () => {
      clearInterval(adaptiveSyncInterval);
      console.log('🛑 INTELLIGENT SYNC: Stopped adaptive sync monitoring');
    };
  }, [forceStateSync]);

  // **CRITICAL FIX 9: REMOVED STATE CHANGE WATCHERS - They cause infinite loops**
  // State changes are already handled by video events and the continuous sync
  // No need to watch playerState changes and trigger more syncs

  // Load video source when stream URL is ready - RESILIENT TO COMPONENT UNMOUNTING
  useEffect(() => {
    console.log('🎬 STREAM LOADING EFFECT TRIGGERED:', {
      hasStreamUrl: !!streamUrl,
      hasVideoRef: !!videoRef.current,
      streamType,
      streamLoading
    });

    if (!streamUrl || !videoRef.current) {
      console.warn('⚠️ STREAM LOADING SKIPPED:', {
        streamUrl: !!streamUrl,
        videoRef: !!videoRef.current
      });
      return;
    }

    console.log('🎬 Loading stream:', { streamType, streamUrl: streamUrl.substring(0, 100) + '...' });

    // Store stream data in refs to survive component unmounting
    const currentStreamUrl = streamUrl;
    const currentStreamType = streamType;
    const currentVideoRef = videoRef.current;

    const loadStream = async () => {
      try {
        console.log('🎬 LOAD STREAM FUNCTION CALLED:', { currentStreamType });

        if (currentStreamType === 'hls') {
          // For HLS, we need to be more careful about cleanup
          if (hlsRef.current) {
            console.log('🧹 Cleaning up existing HLS instance before loading new stream');
            hlsRef.current.destroy();
            hlsRef.current = null;
          }

          // Load HLS with current stream parameters
          console.log('🎬 Calling loadHLS with current parameters');
          await loadHLS(currentStreamUrl, currentStreamType);
          console.log('✅ loadHLS completed');
        } else {
          // For direct streams, set src and load
          console.log('🎬 Loading direct stream:', currentStreamUrl.substring(0, 80) + '...');
          currentVideoRef.src = currentStreamUrl;
          currentVideoRef.load();

          // Force a play attempt after a short delay to ensure metadata is loaded
          setTimeout(() => {
            if (currentVideoRef && !currentVideoRef.paused) {
              console.log('✅ Direct stream loaded and playing');
            } else if (currentVideoRef) {
              console.log('⏸️ Direct stream loaded but not playing (autoplay prevented)');
            }
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Stream loading error:', error);
        setPlayerState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Failed to load stream: ' + error.message
        }));
      }
    };

    // Load the stream
    console.log('🎬 Starting loadStream...');
    loadStream();

    return () => {
      console.log('🧹 Stream loading effect cleanup');
      // Only cleanup HLS if we're actually unmounting (not just re-rendering)
      if (currentStreamType === 'hls' && hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (error) {
          console.warn('HLS cleanup error during unmount:', error);
        }
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

  // Load episode carousel visibility preference - Default to FALSE
  useEffect(() => {
    try {
      const savedPreference = localStorage.getItem('episode-carousel-visible');
      if (savedPreference !== null) {
        const preference = JSON.parse(savedPreference);
        // Only set to true if explicitly saved as true, otherwise default to false
        setEpisodeCarouselVisible(preference === true);
      } else {
        // Ensure it's explicitly set to false if no preference exists
        setEpisodeCarouselVisible(false);
      }
    } catch (e) {
      console.warn('Failed to load episode carousel preference:', e);
      setEpisodeCarouselVisible(false); // Default to closed on error
    }
  }, []);

  // Show resume dialog when video metadata is loaded and resume is available - ONLY ONCE
  useEffect(() => {
    if (isInitialized && shouldShowResume() && !resumeDialogVisible && streamUrl && !progressData?.hasAutoShownResume) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        setResumeDialogVisible(true);
        // Mark that we've shown the resume dialog to prevent showing again
        if (progressData) {
          progressData.hasAutoShownResume = true;
        }
        console.log('📺 Auto-showing resume dialog on initialization (once only)');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isInitialized, shouldShowResume, resumeDialogVisible, streamUrl, progressData]);

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
        case 'e':
        case 'E':
          // NEW: Toggle episode carousel with 'E' key
          if (mediaType === 'tv') {
            e.preventDefault();
            playerActions.toggleEpisodeCarousel();
          }
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
  }, [playerActions, toggleFullscreen, advancedState.playbackRate, mediaType]);

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

  // **CRITICAL FIX 10: Enhanced cleanup on unmount with error handling**
  useEffect(() => {
    return () => {
      console.log('🧹 CLEANUP: Starting component cleanup');

      try {
        // **DEFENSIVE CLEANUP: Clear all timeouts and intervals**
        if (uiTimeoutRef.current) {
          clearTimeout(uiTimeoutRef.current);
          uiTimeoutRef.current = null;
        }

        if (syncDebounceRef.current) {
          clearTimeout(syncDebounceRef.current);
          syncDebounceRef.current = null;
        }

        // **DEFENSIVE CLEANUP: Disable playback protection**
        playbackStartProtectionRef.current = false;

        // **DEFENSIVE CLEANUP: HLS with error handling**
        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch (error) {
            console.warn('🚨 HLS cleanup error:', error);
          }
          hlsRef.current = null;
        }

        // **DEFENSIVE CLEANUP: Video element with error handling**
        if (videoRef.current) {
          try {
            const video = videoRef.current;
            video.pause();
            video.removeAttribute('src');
            video.currentTime = 0;
            video.load();
          } catch (error) {
            console.warn('🚨 Video cleanup error:', error);
          }
        }

        // **DEFENSIVE CLEANUP: Network monitoring**
        if (networkMonitorRef.current) {
          try {
            networkMonitorRef.current.stop();
          } catch (error) {
            console.warn('🚨 Network monitor cleanup error:', error);
          }
          networkMonitorRef.current = null;
        }

        console.log('✅ CLEANUP: Component cleanup completed');
      } catch (error) {
        console.error('🚨 CRITICAL CLEANUP ERROR:', error);
      }
    };
  }, []);

  // **CRITICAL FIX 11: Emergency Circuit Breaker for Infinite Sync Loops**
  useEffect(() => {
    const SYNC_THRESHOLD = 100; // Maximum syncs per second
    const MONITORING_WINDOW = 1000; // 1 second window
    let syncCounter = 0;
    let windowStart = Date.now();

    const circuitBreakerCheck = () => {
      const now = Date.now();

      // Reset counter if window expired
      if (now - windowStart > MONITORING_WINDOW) {
        if (syncCounter > 50) { // Log if high activity
          console.log(`🔄 CIRCUIT BREAKER: Reset after ${syncCounter} syncs in ${MONITORING_WINDOW}ms`);
        }
        syncCounter = 0;
        windowStart = now;
      }

      syncCounter++;

      // Circuit breaker: Block excessive sync calls
      if (syncCounter > SYNC_THRESHOLD) {
        console.error(`🚨 CIRCUIT BREAKER: ACTIVATED - Blocking excessive sync calls (${syncCounter} in ${MONITORING_WINDOW}ms)`);
        console.error(`🚨 POTENTIAL INFINITE LOOP DETECTED - Forcing emergency protection mode`);

        // Emergency actions
        playbackStartProtectionRef.current = true;

        // Emergency reset after 5 seconds
        setTimeout(() => {
          syncCounter = 0;
          windowStart = Date.now();
          playbackStartProtectionRef.current = false;
          console.log('🔄 CIRCUIT BREAKER: Emergency reset completed');
        }, 5000);

        return false; // Block the sync
      }

      return true; // Allow the sync
    };

    // Monitor forceStateSync calls by wrapping them
    const originalForceSync = forceStateSync;

    return () => {
      // Cleanup circuit breaker
      syncCounter = 0;
    };
  }, [forceStateSync]);

  // Render loading state
  console.log('🎬 RENDER CHECK:', {
    streamLoading,
    hasStreamUrl: !!streamUrl,
    shouldShowLoading: streamLoading && !streamUrl,
    streamError,
    hasPlayerError: playerState.hasError
  });

  if (streamLoading && !streamUrl) {
    console.log('🔄 RENDERING LOADING SCREEN');
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
      className={`${styles.futuristicPlayer} ${styles[`theme-${theme}`]} ${fullscreenMode === 'immersive' ? styles.immersiveMode : ''
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

      {/* Video Loading Overlay - Shows while video is initializing */}
      <AnimatePresence>
        {streamUrl && !isInitialized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.videoLoadingOverlay}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.9)',
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
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>Initializing Video Player...</div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>Loading HLS stream</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            onStop={() => { }}
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

      {/* Episode Carousel for TV Shows - Now properly controlled */}
      <AnimatePresence>
        {mediaType === 'tv' && enableAdvancedFeatures && normalizedEpisodeData && episodeCarouselVisible && uiVisible && (
          <EpisodeCarousel
            episodes={normalizedEpisodeData}
            currentEpisode={{ seasonId, episodeId }}
            showId={movieId} // NEW: Pass show ID for progress loading
            showProgress={true} // NEW: Enable progress display
            onEpisodeSelect={(episodeInfo) => {
              // Handle episode selection from carousel
              if (episodeInfo && onEpisodeChange) {
                onEpisodeChange({
                  seasonId: episodeInfo.seasonNumber,
                  episodeId: episodeInfo.number,
                  episodeData: episodeInfo,
                  crossSeason: episodeInfo.seasonNumber !== parseIds(seasonId, episodeId).seasonNumber
                });
              }
            }}
            onEpisodePlay={(episodeInfo) => {
              // Handle direct episode play from carousel
              if (episodeInfo && onEpisodeChange) {
                onEpisodeChange({
                  seasonId: episodeInfo.seasonNumber,
                  episodeId: episodeInfo.number,
                  episodeData: episodeInfo,
                  crossSeason: episodeInfo.seasonNumber !== parseIds(seasonId, episodeId).seasonNumber
                });
              }
            }}
            visible={true}
            onClose={() => setEpisodeCarouselVisible(false)}
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
            episodeCarouselVisible={episodeCarouselVisible}
            onToggleEpisodeCarousel={playerActions.toggleEpisodeCarousel}
            progressData={progressData} // NEW: Pass progress data
            onMarkCompleted={markCompleted} // NEW: Pass mark completed handler
            onClearProgress={clearProgress} // NEW: Pass clear progress handler
            onSaveProgress={forceSave} // NEW: Pass save progress handler
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

      {/* Resume Dialog - NEW */}
      <ResumeDialog
        isVisible={resumeDialogVisible}
        progressData={progressData}
        onResume={watchProgressActions.resumeVideo}
        onRestart={watchProgressActions.restartVideo}
        onDismiss={watchProgressActions.dismissResumeDialog}
        autoResume={false}
        autoResumeDelay={10}
        theme={theme}
        title={mediaType === 'tv'
          ? `Resume Episode ${parseIds(seasonId, episodeId).episodeNumber}?`
          : `Resume ${mediaDetails?.title || 'Movie'}?`
        }
        subtitle={progressData?.lastWatched
          ? `Last watched ${new Date(progressData.lastWatched).toLocaleDateString()}`
          : undefined
        }
        animate={true}
      />

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