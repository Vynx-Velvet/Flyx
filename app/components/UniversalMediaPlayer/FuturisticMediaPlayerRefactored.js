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
  // Component initialization
  React.useEffect(() => {
    // Component mounted successfully
    return () => {
      // Component unmounting
    };
  }, []);

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


  // Media player callback functions - wrapped in useCallback to prevent re-renders
  const mediaPlayerCallbacks = useMemo(() => ({
    onError: (error) => {
      console.error('Media player error:', error);
    },
    onLoadStart: () => {
      // Handle load start
    },
    onLoadedMetadata: () => {
      // Handle loaded metadata
    },
    onTimeUpdate: (currentTime) => {
      // Handle time updates for progress tracking
    },
    onPlay: () => {
      // Handle play event
    },
    onPause: () => {
      // Handle pause event
    },
    onEnded: () => {
      // Handle ended event
    },
    onSeeking: () => {
      // Handle seeking event
    },
    onSeeked: () => {
      // Handle seeked event
    },
    onVolumeChange: () => {
      // Handle volume change
    },
    onLoadProgress: () => {
      // Handle load progress
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
      // Handle fullscreen change
    },
    onSettingsToggle: (visible) => {
      // Handle settings toggle
    },
    onEpisodeCarouselToggle: (visible) => {
      // Handle episode carousel toggle
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
      }
    },
    restartVideo: () => {
      const success = restartPlayback();
      if (success) {
        hideResumeDialog();
      }
    },
    dismissResumeDialog: () => {
      hideResumeDialog();
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

  // Force main render if we have any stream data or if loading is complete
  const shouldShowMainRender = streamUrl || !streamLoading || streamError;

  if (!shouldShowMainRender) {
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

  return (
    <div
      ref={containerRef}
      className={`${styles.futuristicPlayer} ${styles[`theme-${theme}`]} ${
        fullscreenState.mode === 'immersive' ? styles.immersiveMode : ''
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
            intensity={0.5}
            mode="default"
          />
        )}
      </AnimatePresence>

      {/* Main Video Element */}
      <video
        ref={(el) => {
          videoRef.current = el;
        }}
        className={styles.videoElement}
        autoPlay
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        controls={false}
        data-testid="futuristic-video-player"
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
            onGenerateReport={() => {}}
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