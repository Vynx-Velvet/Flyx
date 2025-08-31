'use client';

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Core hooks
import useMediaPlayer from './hooks/useMediaPlayer';
import usePlayerUI from './hooks/usePlayerUI';

// Existing hooks
import { useStream } from './hooks/useStream';
import { useEnhancedSubtitles } from '../../hooks/useEnhancedSubtitles';
import useFetchMediaDetails from './hooks/useFetchMediaDetails';
import useEpisodeNavigation from './hooks/useEpisodeNavigation';
import useAutoAdvance from './hooks/useAutoAdvance';
import useWatchProgress from './hooks/useWatchProgress';

// Components
import MediaControls from './components/MediaControls';
const IntelligentSubtitles = dynamic(() => import('./components/IntelligentSubtitles'), { ssr: false });
const AmbientLighting = dynamic(() => import('./components/AmbientLighting'), { ssr: false });
const VoiceInterface = dynamic(() => import('./components/VoiceInterface'), { ssr: false });
const GestureOverlay = dynamic(() => import('./components/GestureOverlay'), { ssr: false });
const AdvancedSettings = dynamic(() => import('./components/AdvancedSettings'), { ssr: false });
const PerformanceDashboard = dynamic(() => import('./components/PerformanceDashboard'), { ssr: false });
const EpisodeCarousel = dynamic(() => import('./components/EpisodeCarousel'), { ssr: false });
const NextEpisodePrompt = dynamic(() => import('./components/NextEpisodePrompt'), { ssr: false });
const PictureInPicture = dynamic(() => import('./components/PictureInPicture'), { ssr: false });
const AdaptiveLoading = dynamic(() => import('./components/AdaptiveLoading'), { ssr: false });
const ResumeDialog = dynamic(() => import('./components/ResumeDialog'), { ssr: false });

// Styles
import styles from './FuturisticMediaPlayer.module.css';

/**
 * FuturisticMediaPlayerRefactored - Completely refactored media player
 *
 * This is a clean, modular version of the media player that separates concerns
 * and provides better maintainability and performance.
 */
const FuturisticMediaPlayerRefactored = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  episodeData = null,
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
  console.log('🎬 FUTURISTIC PLAYER: Component rendered with props:', {
    mediaType,
    movieId,
    seasonId,
    episodeId,
    episodeData: !!episodeData
  });

  // EMERGENCY DEBUG: Add element BEFORE hooks - no variables yet
  if (typeof window !== 'undefined' && !document.getElementById('emergency-debug-pre-hooks')) {
    const emergencyDiv = document.createElement('div');
    emergencyDiv.id = 'emergency-debug-pre-hooks';
    emergencyDiv.style.cssText = `
      position: fixed;
      top: 100px;
      left: 10px;
      background: orange;
      color: black;
      padding: 15px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      z-index: 10001;
      border: 4px solid red;
      max-width: 300px;
    `;
    emergencyDiv.innerHTML = `
      🚨 EMERGENCY DEBUG<br>
      Component STARTED<br>
      Time: ${new Date().toLocaleTimeString()}<br>
      Hooks not called yet
    `;
    document.body.appendChild(emergencyDiv);
  }

  // FORCE VISUAL DEBUG - Add to document body if component mounts
  React.useEffect(() => {
    console.log('🎬 FUTURISTIC PLAYER: Component mounted successfully');
    const debugDiv = document.createElement('div');
    debugDiv.id = 'force-debug-component-mounted';
    debugDiv.style.cssText = `
      position: fixed;
      top: 5px;
      right: 5px;
      background: magenta;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      border: 3px solid cyan;
    `;
    debugDiv.textContent = '🎬 COMPONENT MOUNTED';
    document.body.appendChild(debugDiv);

    return () => {
      console.log('🎬 FUTURISTIC PLAYER: Component unmounting');
      const existing = document.getElementById('force-debug-component-mounted');
      if (existing) {
        document.body.removeChild(existing);
      }
    };
  }, []);

  // Add global debug function for console access
  if (typeof window !== 'undefined') {
    window.debugVideoPlayer = () => {
      console.log('🎬 GLOBAL DEBUG: Video Player State');
      console.log('Stream URL:', streamUrl);
      console.log('Stream Loading:', streamLoading);
      console.log('Stream Error:', streamError);
      console.log('Player State:', playerState);
      console.log('Video Element:', videoRef.current);

      if (videoRef.current) {
        console.log('Video Element Details:', {
          src: videoRef.current.src,
          currentSrc: videoRef.current.currentSrc,
          readyState: videoRef.current.readyState,
          networkState: videoRef.current.networkState,
          error: videoRef.current.error,
          computedStyle: {
            display: window.getComputedStyle(videoRef.current).display,
            visibility: window.getComputedStyle(videoRef.current).visibility,
            opacity: window.getComputedStyle(videoRef.current).opacity,
            zIndex: window.getComputedStyle(videoRef.current).zIndex
          }
        });
      }
      return 'Debug info logged to console';
    };

    // FORCE STREAM URL UPDATE - Emergency fix
    window.forceStreamUpdate = () => {
      console.log('🎬 FORCE UPDATE: Manually setting stream URL');
      // This will be called from the useEffect when streamUrl becomes available
      if (streamUrl && !streamLoading) {
        console.log('🎬 FORCE UPDATE: Stream URL is available, forcing re-render');
        // Force a state update to trigger re-render
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
      return 'Force update attempted';
    };
  }
  // Parse season/episode IDs
  const parseIds = useMemo(() => {
    if (!seasonId || !episodeId) return { seasonNumber: null, episodeNumber: null };

    const seasonNumber = typeof seasonId === 'string' ?
      (seasonId.startsWith('season_') ? parseInt(seasonId.replace('season_', '')) : parseInt(seasonId)) :
      parseInt(seasonId);

    const episodeNumber = typeof episodeId === 'string' ?
      (episodeId.includes('_') ? parseInt(episodeId.split('_').pop()) : parseInt(episodeId)) :
      parseInt(episodeId);

    return { seasonNumber, episodeNumber };
  }, [seasonId, episodeId]);

  // Stream extraction and management
  const shouldFetchStream = !!(movieId && (mediaType !== 'tv' || (seasonId && episodeId)));

  console.log('🎬 FUTURISTIC PLAYER: useStream parameters', {
    mediaType,
    movieId,
    seasonId,
    episodeId,
    shouldFetchStream,
    movieIdType: typeof movieId,
    seasonIdType: typeof seasonId,
    episodeIdType: typeof episodeId
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
    shouldFetch: shouldFetchStream
  });

  // Log stream extraction results - only when streamUrl changes to avoid spam
  React.useEffect(() => {
    if (streamUrl) {
      console.log('🎬 FUTURISTIC PLAYER: Stream URL received', {
        streamUrl: streamUrl.substring(0, 100) + '...',
        streamType,
        streamLoading,
        streamError
      });
    }
  }, [streamUrl, streamType, streamLoading, streamError]);

  // EMERGENCY DEBUG: Add element AFTER hooks - with actual values
  React.useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('emergency-debug-post-hooks')) {
      const emergencyDiv = document.createElement('div');
      emergencyDiv.id = 'emergency-debug-post-hooks';
      emergencyDiv.style.cssText = `
        position: fixed;
        top: 200px;
        left: 10px;
        background: purple;
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        z-index: 10001;
        border: 4px solid yellow;
        max-width: 300px;
      `;
      emergencyDiv.innerHTML = `
        🚨 POST-HOOKS DEBUG<br>
        Hooks executed<br>
        Stream URL: ${streamUrl ? 'YES' : 'NO'}<br>
        Loading: ${streamLoading ? 'YES' : 'NO'}<br>
        Error: ${streamError ? 'YES' : 'NO'}<br>
        URL Length: ${streamUrl ? streamUrl.length : 0}
      `;
      document.body.appendChild(emergencyDiv);
    }

    // Update existing element
    const existing = document.getElementById('emergency-debug-post-hooks');
    if (existing) {
      existing.innerHTML = `
        🚨 POST-HOOKS DEBUG<br>
        Hooks executed<br>
        Stream URL: ${streamUrl ? 'YES' : 'NO'}<br>
        Loading: ${streamLoading ? 'YES' : 'NO'}<br>
        Error: ${streamError ? 'YES' : 'NO'}<br>
        URL Length: ${streamUrl ? streamUrl.length : 0}<br>
        Time: ${new Date().toLocaleTimeString()}
      `;
    }
  }, [streamUrl, streamLoading, streamError]);

  // Media player callback functions - wrapped in useCallback to prevent re-renders
  const mediaPlayerCallbacks = useMemo(() => ({
    onError: (error) => {
      console.error('Media player error:', error);
    },
    onLoadStart: () => {
      console.log('Media player: load start');
    },
    onLoadedMetadata: () => {
      console.log('Media player: loaded metadata');
    },
    onTimeUpdate: (currentTime) => {
      // Handle time updates for progress tracking
    },
    onPlay: () => {
      console.log('Media player: play');
    },
    onPause: () => {
      console.log('Media player: pause');
    },
    onEnded: () => {
      console.log('Media player: ended');
    },
    onSeeking: () => {
      console.log('Media player: seeking');
    },
    onSeeked: () => {
      console.log('Media player: seeked');
    },
    onVolumeChange: () => {
      console.log('Media player: volume change');
    },
    onLoadProgress: () => {
      console.log('Media player: load progress');
    }
  }), []); // Empty dependency array - these callbacks never change

  // Media player core functionality
  const {
    videoRef,
    playerState,
    playerActions,
    isRecovering,
    retryCount,
    resetErrorRecovery,
    forceStateSync
  } = useMediaPlayer({
    streamUrl,
    streamType,
    ...mediaPlayerCallbacks
  });

  // UI state management
  const {
    containerRef,
    uiState,
    fullscreenState,
    showUI,
    hideUI,
    toggleSettings,
    closeSettings,
    togglePerformance,
    closePerformance,
    toggleEpisodeCarousel,
    closeEpisodeCarousel,
    showResumeDialog,
    hideResumeDialog,
    toggleFullscreen,
    handleKeyPress
  } = usePlayerUI({
    onFullscreenChange: (isFullscreen) => {
      console.log('Fullscreen changed:', isFullscreen);
    },
    onSettingsToggle: (visible) => {
      console.log('Settings toggled:', visible);
    },
    onEpisodeCarouselToggle: (visible) => {
      console.log('Episode carousel toggled:', visible);
    }
  });

  // Enhanced media details fetching
  const { details: mediaDetails, sceneData } = useFetchMediaDetails(
    movieId,
    mediaType,
    {
      enableSceneDetection: enableAdvancedFeatures,
      enableContentAnalysis: true
    }
  );

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
    episodeData: normalizedEpisodeData
  } = useEpisodeNavigation({
    mediaType,
    movieId,
    seasonId,
    episodeId,
    episodeData,
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

  // Watch progress tracking
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

  // Watch progress actions
  const watchProgressActions = useMemo(() => ({
    resumeVideo: () => {
      const success = resumePlayback();
      if (success) {
        hideResumeDialog();
        console.log('🎯 Resumed from saved position');
      }
    },
    restartVideo: () => {
      const success = restartPlayback();
      if (success) {
        hideResumeDialog();
        console.log('🔄 Restarted from beginning');
      }
    },
    dismissResumeDialog: () => {
      hideResumeDialog();
      console.log('❌ Resume dialog dismissed');
    }
  }), [resumePlayback, restartPlayback, hideResumeDialog]);

  // Quality management
  const qualities = useMemo(() => {
    // This would be populated by HLS.js quality levels
    return [
      { id: 'auto', label: 'Auto', height: 0, bitrate: 0 }
    ];
  }, []);

  const setQuality = useCallback((qualityId) => {
    console.log('Setting quality:', qualityId);
    // Implement quality switching logic
  }, []);

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
        playerActions.seek(Math.max(0, playerState.currentTime - 10));
        break;
      case 'swipeRight':
        playerActions.seek(Math.min(playerState.duration, playerState.currentTime + 10));
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
  }, [playerActions, playerState, toggleFullscreen]);

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

  // Keyboard shortcuts
  useMemo(() => {
    const handleKeyDown = (e) => {
      handleKeyPress(e, playerActions);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, playerActions]);

  // Show resume dialog when appropriate
  React.useEffect(() => {
    if (playerState.duration > 0 && shouldShowResume() && !uiState.resumeDialogVisible) {
      const timer = setTimeout(() => {
        showResumeDialog();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [playerState.duration, shouldShowResume, uiState.resumeDialogVisible, showResumeDialog]);

  // EMERGENCY FIX: Force main render if we have any stream data or if loading is complete
  const shouldShowMainRender = streamUrl || !streamLoading || streamError;

  console.log('🎬 FUTURISTIC PLAYER: Conditional rendering check', {
    streamUrl: streamUrl,
    streamUrlType: typeof streamUrl,
    streamUrlLength: streamUrl?.length,
    streamLoading,
    streamError,
    shouldShowMainRender,
    forceMainRender: shouldShowMainRender
  });

  if (!shouldShowMainRender) {
    console.log('🎬 FUTURISTIC PLAYER: RETURNING LOADING STATE (EMERGENCY FIX ACTIVE)');
    return (
      <div className={styles.playerContainer}>
        <AdaptiveLoading
          progress={loadingProgress}
          phase={loadingPhase}
          enableParticles={enableAdvancedFeatures}
          theme={theme}
        />
        {/* Emergency debug info */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'red',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          EMERGENCY: Stream URL: {streamUrl ? 'YES' : 'NO'} | Loading: {streamLoading ? 'YES' : 'NO'}
        </div>
      </div>
    );
  }

  console.log('🎬 FUTURISTIC PLAYER: PROCEEDING TO MAIN RENDER (EMERGENCY FIX SUCCESSFUL)');

  // Render error state
  if (streamError || playerState.hasError) {
    return (
      <div className={styles.playerContainer}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.errorOverlay}
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
    );
  }

  // Main render
  console.log('🎬 FUTURISTIC PLAYER: Main render starting', {
    streamUrl: streamUrl ? streamUrl.substring(0, 100) + '...' : null,
    streamLoading,
    streamError,
    playerState,
    isRecovering,
    shouldRenderVideo: !streamLoading || streamUrl,
    timestamp: new Date().toISOString()
  });

  // FORCE RENDER DEBUG - Add visible debug overlay
  const debugInfo = {
    streamUrl: !!streamUrl,
    streamLoading,
    streamError: !!streamError,
    renderTime: new Date().toLocaleTimeString(),
    componentId: Math.random().toString(36).substr(2, 9),
    videoElementReady: !!videoRef.current
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.futuristicPlayer} ${styles[`theme-${theme}`]} ${
        fullscreenState.mode === 'immersive' ? styles.immersiveMode : ''
      }`}
      onMouseMove={showUI}
      onMouseLeave={hideUI}
    >
      {/* FORCE DEBUG OVERLAY - Always visible */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'rgba(255, 0, 0, 0.9)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '400px',
        border: '2px solid yellow'
      }}>
        <div><strong>🎬 DEBUG OVERLAY</strong></div>
        <div>Stream URL: {streamUrl ? '✅ YES' : '❌ NO'}</div>
        <div>Stream Loading: {streamLoading ? '⏳ YES' : '✅ NO'}</div>
        <div>Stream Error: {streamError ? '❌ YES' : '✅ NO'}</div>
        <div>Render Time: {new Date().toLocaleTimeString()}</div>
        <div>Component ID: {debugInfo.componentId}</div>
        <div>Video Ready: {debugInfo.videoElementReady ? '✅ YES' : '❌ NO'}</div>
        <div>Player State: {playerState.isPlaying ? '▶️ PLAYING' : '⏸️ PAUSED'}</div>
        <div>Video SRC: {videoRef.current?.src ? '✅ HAS URL' : '❌ NO URL'}</div>
        <div>SRC Length: {videoRef.current?.src?.length || 0}</div>
      </div>
      {/* Ambient Lighting System */}
      <AnimatePresence>
        {ambientLighting && enableAdvancedFeatures && (
          <AmbientLighting
            colors={[]}
            effects={{}}
            intensity={0.5}
            mode="default"
          />
        )}
      </AnimatePresence>

      {/* Main Video Element */}
      {console.log('🎬 FUTURISTIC PLAYER: About to render video element')}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'lime',
        color: 'black',
        padding: '20px',
        borderRadius: '10px',
        fontSize: '24px',
        fontWeight: 'bold',
        zIndex: 9998,
        border: '4px solid black'
      }}>
        🎬 VIDEO ELEMENT SHOULD BE HERE
        <br />
        <small>Stream URL: {streamUrl ? '✅ Available' : '❌ Missing'}</small>
        <br />
        <small>Loading: {streamLoading ? '⏳ Active' : '✅ Complete'}</small>
      </div>
      <video
        ref={(el) => {
          console.log('🎬 VIDEO ELEMENT: ref callback called', {
            element: el,
            elementExists: !!el,
            elementInDOM: el ? document.contains(el) : false,
            parentElement: el?.parentElement?.tagName,
            videoRef: videoRef.current
          });
          if (videoRef.current !== el) {
            console.log('🎬 VIDEO ELEMENT: ref changed', {
              from: videoRef.current,
              to: el
            });
          }
          videoRef.current = el;

          // Debug the video element immediately after ref is set
          if (el) {
            setTimeout(() => {
              console.log('🎬 VIDEO ELEMENT: Post-render debug', {
                src: el.src,
                currentSrc: el.currentSrc,
                readyState: el.readyState,
                networkState: el.networkState,
                error: el.error,
                videoWidth: el.videoWidth,
                videoHeight: el.videoHeight,
                duration: el.duration,
                paused: el.paused,
                ended: el.ended,
                muted: el.muted,
                volume: el.volume,
                computedStyle: {
                  display: window.getComputedStyle(el).display,
                  visibility: window.getComputedStyle(el).visibility,
                  opacity: window.getComputedStyle(el).opacity,
                  width: window.getComputedStyle(el).width,
                  height: window.getComputedStyle(el).height,
                  zIndex: window.getComputedStyle(el).zIndex
                }
              });
            }, 100);
          }
        }}
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
          background: 'red', // Make it visible for debugging
          border: '2px solid yellow',
          opacity: 1, // Ensure it's visible
          visibility: 'visible',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 100
        }}
        onLoadStart={() => console.log('🎬 VIDEO ELEMENT: loadstart fired')}
        onLoadedMetadata={() => console.log('🎬 VIDEO ELEMENT: loadedmetadata fired')}
        onError={(e) => console.log('🎬 VIDEO ELEMENT: error fired', e)}
        onCanPlay={() => console.log('🎬 VIDEO ELEMENT: canplay fired')}
        onPlay={() => console.log('🎬 VIDEO ELEMENT: play event fired')}
        onPause={() => console.log('🎬 VIDEO ELEMENT: pause event fired')}
        onWaiting={() => console.log('🎬 VIDEO ELEMENT: waiting event fired')}
        onStalled={() => console.log('🎬 VIDEO ELEMENT: stalled event fired')}
      />

      {/* Intelligent Subtitles */}
      <AnimatePresence>
        {currentSubtitleText && (
          <IntelligentSubtitles
            text={currentSubtitleText}
            position={{ bottom: '15%', left: '50%', transform: 'translateX(-50%)' }}
            contentAwareness={null}
            style={{}}
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
            feedback={true}
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
        {uiState.settingsVisible && (
          <AdvancedSettings
            playerState={playerState}
            playerActions={playerActions}
            qualities={qualities}
            currentQuality="auto"
            onQualityChange={setQuality}
            subtitles={availableLanguages || []}
            activeSubtitle={activeSubtitle}
            onSubtitleChange={selectSubtitle}
            ambientSettings={{ intensity: 0.5 }}
            onClose={closeSettings}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Performance Dashboard */}
      <AnimatePresence>
        {uiState.performanceVisible && enableAdvancedFeatures && (
          <PerformanceDashboard
            analytics={{}}
            performanceStats={{
              fps: 60,
              droppedFrames: 0,
              bufferHealth: 100,
              bandwidth: 0,
              latency: 0
            }}
            userBehavior={{}}
            insights={{}}
            bufferHealth={100}
            networkMetrics={{ bandwidth: 0, latency: 0 }}
            sessionData={{}}
            onClose={closePerformance}
            onGenerateReport={() => console.log('Generating report...')}
          />
        )}
      </AnimatePresence>

      {/* Episode Carousel for TV Shows */}
      <AnimatePresence>
        {mediaType === 'tv' && enableAdvancedFeatures && normalizedEpisodeData && uiState.episodeCarouselVisible && uiState.isVisible && (
          <EpisodeCarousel
            episodes={normalizedEpisodeData}
            currentEpisode={{ seasonId, episodeId }}
            showId={movieId}
            showProgress={true}
            onEpisodeSelect={(episodeInfo) => {
              if (episodeInfo && onEpisodeChange) {
                onEpisodeChange({
                  seasonId: episodeInfo.seasonNumber,
                  episodeId: episodeInfo.number,
                  episodeData: episodeInfo,
                  crossSeason: episodeInfo.seasonNumber !== parseIds.seasonNumber
                });
              }
            }}
            onEpisodePlay={(episodeInfo) => {
              if (episodeInfo && onEpisodeChange) {
                onEpisodeChange({
                  seasonId: episodeInfo.seasonNumber,
                  episodeId: episodeInfo.number,
                  episodeData: episodeInfo,
                  crossSeason: episodeInfo.seasonNumber !== parseIds.seasonNumber
                });
              }
            }}
            visible={true}
            onClose={closeEpisodeCarousel}
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
        enabled={false}
        position={{ x: 20, y: 20 }}
        onPositionChange={(pos) => {}}
      />

      {/* Enhanced Media Controls */}
      <MediaControls
        playerState={playerState}
        playerActions={playerActions}
        onToggleFullscreen={toggleFullscreen}
        qualities={qualities}
        onSelectQuality={setQuality}
        currentQuality="auto"
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
        episodeCarouselVisible={uiState.episodeCarouselVisible}
        onToggleEpisodeCarousel={toggleEpisodeCarousel}
        progressData={progressData}
        onMarkCompleted={markCompleted}
        onClearProgress={clearProgress}
        onSaveProgress={forceSave}
        isVisible={uiState.isVisible}
      />

      {/* Back Button */}
      <AnimatePresence>
        {uiState.isVisible && (
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
        {uiState.isVisible && (
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            onClick={toggleSettings}
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

      {/* Debug Test Button - Always visible for debugging */}
      <motion.button
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        onClick={() => {
          console.log('🎬 DEBUG: Manual test button clicked');
          console.log('🎬 DEBUG: Current UI state:', uiState);
          console.log('🎬 DEBUG: Current player state:', playerState);
          if (videoRef.current) {
            console.log('🎬 DEBUG: Video element exists, current state:', {
              src: videoRef.current.src,
              currentSrc: videoRef.current.currentSrc,
              readyState: videoRef.current.readyState,
              networkState: videoRef.current.networkState,
              currentTime: videoRef.current.currentTime,
              duration: videoRef.current.duration,
              paused: videoRef.current.paused,
              error: videoRef.current.error,
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight
            });

            // Test 1: Try to set a simple test video
            console.log('🎬 DEBUG: Setting test video source...');
            videoRef.current.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            videoRef.current.load();

            // Test 2: Try to manually trigger play after a delay
            setTimeout(() => {
              videoRef.current.play().then(() => {
                console.log('🎬 DEBUG: Test video play successful');
              }).catch((error) => {
                console.error('🎬 DEBUG: Test video play failed:', error);
              });
            }, 2000);
          } else {
            console.error('🎬 DEBUG: Video element does not exist');
          }
        }}
        style={{
          position: 'fixed',
          top: '5rem',
          right: '2rem',
          zIndex: 1000, // Higher z-index
          background: 'red',
          border: '2px solid white',
          borderRadius: '12px',
          padding: '8px 12px',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        TEST VIDEO
      </motion.button>

      {/* Second Debug Button - Force Stream Load */}
      <motion.button
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        onClick={() => {
          console.log('🎬 DEBUG: Force stream load clicked');
          if (videoRef.current && streamUrl) {
            console.log('🎬 DEBUG: Forcing stream URL:', streamUrl.substring(0, 100) + '...');
            videoRef.current.src = streamUrl;
            videoRef.current.load();
            setTimeout(() => {
              videoRef.current.play().catch(e => console.error('Force play failed:', e));
            }, 1000);
          } else {
            console.error('🎬 DEBUG: No video element or stream URL', { hasVideo: !!videoRef.current, hasStream: !!streamUrl });
          }
        }}
        style={{
          position: 'fixed',
          top: '8rem',
          right: '2rem',
          zIndex: 1000,
          background: 'blue',
          border: '2px solid white',
          borderRadius: '12px',
          padding: '8px 12px',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        FORCE STREAM
      </motion.button>

      {/* Third Debug Button - Manual Stream Extraction */}
      <motion.button
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        onClick={() => {
          console.log('🎬 DEBUG: Manual stream extraction clicked');
          console.log('🎬 DEBUG: Current parameters:', {
            mediaType,
            movieId,
            seasonId,
            episodeId,
            shouldFetchStream
          });

          // Try to manually trigger extraction
          if (window.debugVideoPlayer) {
            window.debugVideoPlayer();
          }

          // Force retry extraction
          if (retryExtraction) {
            console.log('🎬 DEBUG: Calling retryExtraction');
            retryExtraction();
          }
        }}
        style={{
          position: 'fixed',
          top: '10rem',
          right: '2rem',
          zIndex: 1000,
          background: 'green',
          border: '2px solid white',
          borderRadius: '12px',
          padding: '8px 12px',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        EXTRACT STREAM
      </motion.button>

      {/* Resume Dialog */}
      <ResumeDialog
        isVisible={uiState.resumeDialogVisible}
        progressData={progressData}
        onResume={watchProgressActions.resumeVideo}
        onRestart={watchProgressActions.restartVideo}
        onDismiss={watchProgressActions.dismissResumeDialog}
        autoResume={false}
        autoResumeDelay={10}
        theme={theme}
        title={mediaType === 'tv'
          ? `Resume Episode ${parseIds.episodeNumber}?`
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
  return (
    <FuturisticMediaPlayerRefactored {...props} />
  );
};

export default FuturisticMediaPlayer;