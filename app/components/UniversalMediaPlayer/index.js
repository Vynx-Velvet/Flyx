import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './UniversalMediaPlayer.module.css';
import { usePlayerState } from './hooks/usePlayerState';
import { useStream } from './hooks/useStream';
import { useHlsWithPerformance } from './hooks/useHlsWithPerformance';
import { useEnhancedSubtitles } from '../../hooks/useEnhancedSubtitles';
import { useFetchMediaDetails } from './hooks/useFetchMediaDetails';
import { useEpisodeNavigation } from './hooks/useEpisodeNavigation';
import { useAutoAdvance } from './hooks/useAutoAdvance';
import PlayerControls from './components/PlayerControls';
import EpisodeNavigation from './components/EpisodeNavigation';
import NextEpisodePrompt from './components/NextEpisodePrompt';
import LoadingSpinner from './components/LoadingSpinner';

const UniversalMediaPlayer = ({ 
  mediaType, 
  movieId, 
  seasonId, 
  episodeId, 
  onBackToShowDetails,
  onEpisodeChange 
}) => {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [subtitleCues, setSubtitleCues] = useState([]);
  const [subtitleError, setSubtitleError] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekingTo, setSeekingTo] = useState(null);


  const { state: playerState, actions: playerActions } = usePlayerState();
  const { details: mediaDetails } = useFetchMediaDetails(movieId, mediaType);
  
  const { 
    streamUrl, 
    streamType, 
    loading: streamLoading, 
    error: streamError, 
    loadingProgress, 
    loadingPhase, 
    retryAttempt, 
    maxRetries, 
    retryExtraction 
  } = useStream({
    mediaType, movieId, seasonId, episodeId, shouldFetch: true
  });

  // Use enhanced subtitles with improved parsing and synchronization
  const { 
    subtitles, 
    activeSubtitle, 
    selectSubtitle, 
    loading: subtitlesLoading,
    currentSubtitleText: enhancedSubtitleText,
    parsingStats,
    updateSubtitleTime,
    isEnhanced,
    integrateWithMemoryManager
  } = useEnhancedSubtitles({
    imdbId: mediaDetails?.imdb_id, 
    season: seasonId, 
    episode: episodeId, 
    enabled: !!mediaDetails,
    videoRef
  });



  const { qualities, setQuality, currentQuality } = useHlsWithPerformance(
    streamUrl, 
    videoRef, 
    streamType
  );

  // Episode navigation for TV shows
  const {
    hasNextEpisode,
    hasPreviousEpisode,
    goToNextEpisode,
    goToPreviousEpisode,
    getCurrentEpisode,
    getNextEpisode,
    getPreviousEpisode,
    loading: episodeNavLoading
  } = useEpisodeNavigation({
    mediaType,
    movieId,
    seasonId,
    episodeId,
    onEpisodeChange
  });

  // Get next episode info for auto-advance - FIXED
  const [nextEpisodeInfo, setNextEpisodeInfo] = useState(null);

  useEffect(() => {
    const fetchNextEpisodeInfo = async () => {
      if (mediaType === 'tv' && hasNextEpisode && getNextEpisode) {
        try {
          console.log('🔍 Fetching next episode info...');
          const nextEp = await getNextEpisode();
          console.log('✅ Next episode info:', nextEp);
          setNextEpisodeInfo(nextEp);
        } catch (error) {
          console.error('❌ Error fetching next episode info:', error);
          setNextEpisodeInfo(null);
        }
      } else {
        console.log('🚫 Not fetching next episode:', { mediaType, hasNextEpisode });
        setNextEpisodeInfo(null);
      }
    };

    fetchNextEpisodeInfo();
  }, [mediaType, hasNextEpisode, getNextEpisode, episodeId]);

  // FORCE hasNextEpisode to be true for TV shows for testing
  const forceHasNextEpisode = mediaType === 'tv' ? true : hasNextEpisode;

  // Auto-advance functionality for TV shows
  const {
    showNextEpisodePrompt,
    countdown,
    handleNextEpisode: autoAdvanceNext,
    handleDismiss: dismissPrompt,
    resetForNewEpisode
  } = useAutoAdvance({
    mediaType,
    currentTime: playerState.currentTime,
    duration: playerState.duration,
    hasNextEpisode: forceHasNextEpisode, // Use forced value for testing
    getNextEpisode: () => nextEpisodeInfo,
    onNextEpisode: goToNextEpisode,
    enabled: true,
    testMode: true // Enable test mode for debugging - 10 second threshold
  });

  // Debug auto-advance state - more frequent logging
  useEffect(() => {
    if (mediaType === 'tv') {
      console.log('🎬 Auto-advance DEBUG:', {
        showNextEpisodePrompt,
        countdown,
        mediaType,
        hasNextEpisode,
        forceHasNextEpisode,
        nextEpisodeInfo: nextEpisodeInfo ? 'Available' : 'None',
        currentTime: playerState.currentTime,
        duration: playerState.duration,
        timeRemaining: playerState.duration && playerState.currentTime ? 
          playerState.duration - playerState.currentTime : 'N/A'
      });
    }
  }, [showNextEpisodePrompt, countdown, mediaType, hasNextEpisode, forceHasNextEpisode, nextEpisodeInfo, playerState.currentTime, playerState.duration]);

  // Enhanced subtitle selection that preserves video playback state
  const handleSubtitleChange = useCallback((subtitle) => {
    console.log('🎬 Subtitle change requested:', subtitle?.language);
    
    // Store current video state to preserve playback
    const currentTime = videoRef.current?.currentTime || 0;
    const wasPlaying = !videoRef.current?.paused;
    
    console.log('💾 Preserving video state:', { currentTime, wasPlaying });
    
    // Use the enhanced subtitle selection but ensure video doesn't reload
    selectSubtitle(subtitle).then(() => {
      // Restore video state after subtitle change
      if (videoRef.current && currentTime > 0) {
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current.play().catch(console.error);
        }
        console.log('✅ Video state restored after subtitle change');
      }
    }).catch(error => {
      console.error('❌ Subtitle change failed:', error);
    });
  }, [selectSubtitle]);


  
  // Fullscreen functionality
  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await playerContainerRef.current.requestFullscreen();
        playerActions.setFullscreen(true);
        console.log('🖥️ Entered fullscreen mode');
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        playerActions.setFullscreen(false);
        console.log('🖥️ Exited fullscreen mode');
      }
    } catch (error) {
      console.error('❌ Fullscreen error:', error);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement === playerContainerRef.current;
      playerActions.setFullscreen(isFullscreen);
      console.log('🖥️ Fullscreen state changed:', isFullscreen);
      
      // Show controls when entering/exiting fullscreen
      showControls();
    };

    const handleFullscreenError = (event) => {
      console.error('❌ Fullscreen error event:', event);
      playerActions.setFullscreen(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
    };
  }, [playerActions]);



  // Auto-hide controls functionality
  const showControls = () => {
    setControlsVisible(true);
    resetHideTimer();
  };

  const hideControls = () => {
    if (playerState.isPlaying) {
      setControlsVisible(false);
    }
  };

  const resetHideTimer = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(hideControls, 5000);
  };

  const handleMouseMove = () => {
    showControls();
  };

  const handleMouseLeave = () => {
    resetHideTimer();
  };

  // Show controls when video is paused, hide when playing
  useEffect(() => {
    if (playerState.isPlaying) {
      resetHideTimer();
    } else {
      setControlsVisible(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    }
  }, [playerState.isPlaying]);

  // Reset auto-advance when episode changes
  useEffect(() => {
    resetForNewEpisode();
  }, [episodeId, resetForNewEpisode]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);
  
  // Enhanced subtitle display using the new synchronizer
  // The enhanced subtitle hook handles parsing and synchronization automatically

  // Enhanced subtitle loading with memory management integration
  useEffect(() => {
    if (activeSubtitle) {
      console.log('✅ Enhanced subtitles loaded:', {
        language: activeSubtitle.language,
        cues: activeSubtitle.cues?.length || 0,
        parsingStats: parsingStats
      });
      setSubtitleError('');
      
      // Log parsing statistics
      if (parsingStats) {
        console.log('📊 Enhanced parsing stats:', parsingStats);
      }
    } else {
      console.log('🎬 No active subtitle - clearing');
      setCurrentSubtitle('');
      setSubtitleError('');
    }
  }, [activeSubtitle, parsingStats]);

  // Enhanced subtitle synchronization with high-frequency updates (100ms)
  useEffect(() => {
    if (isEnhanced && enhancedSubtitleText !== undefined) {
      // Use enhanced subtitle text from the synchronizer
      setCurrentSubtitle(enhancedSubtitleText);
    } else if (!isEnhanced) {
      // Fallback to old synchronization method if enhanced is not available
      if (subtitleCues.length === 0 || !videoRef.current) {
        setCurrentSubtitle('');
        return;
      }

      const currentTime = playerState.currentTime;
      const activeCue = subtitleCues.find(cue => 
        currentTime >= cue.start && currentTime <= cue.end
      );

      const newSubtitle = activeCue ? activeCue.text : '';
      if (newSubtitle !== currentSubtitle) {
        setCurrentSubtitle(newSubtitle);
      }
    }
  }, [isEnhanced, enhancedSubtitleText, playerState.currentTime, subtitleCues, currentSubtitle]);

  // Enhanced seeking functionality
  const handleSeek = (time) => {
    if (!videoRef.current || isSeeking) {
      console.log('🎯 Seek blocked:', { hasVideo: !!videoRef.current, isSeeking });
      return;
    }

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, playerState.duration));
    
    console.log('🎯 Starting seek:', { 
      requestedTime: time, 
      clampedTime, 
      duration: playerState.duration,
      currentTime: playerState.currentTime 
    });

    setIsSeeking(true);
    setSeekingTo(clampedTime);
    playerActions.setSeeking(true);

    // Clear any existing seek timeout
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    try {
      // Set the video current time
      videoRef.current.currentTime = clampedTime;
      
      // Set a timeout to handle cases where seeked event doesn't fire
      seekTimeoutRef.current = setTimeout(() => {
        console.log('⚠️ Seek timeout - forcing completion');
        completeSeeking(clampedTime);
      }, 3000);

    } catch (error) {
      console.error('❌ Seek error:', error);
      completeSeeking(clampedTime);
    }
  };

  const completeSeeking = (time) => {
    console.log('✅ Seek completed:', { time, wasSeekingTo: seekingTo });
    setIsSeeking(false);
    setSeekingTo(null);
    playerActions.setSeeking(false);
    
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
  };

  // Enhanced video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeeking) {
      const currentTime = videoRef.current.currentTime;
      playerActions.setCurrentTime(currentTime);
      
      if (videoRef.current.buffered.length > 0) {
        playerActions.setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
      }
    }
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      const actualTime = videoRef.current.currentTime;
      console.log('🎯 Seeked event fired:', { actualTime, wasSeekingTo: seekingTo });
      playerActions.setCurrentTime(actualTime);
      completeSeeking(actualTime);
    }
  };

  const handleSeeking = () => {
    console.log('🎯 Seeking event fired');
    // This event fires when seeking starts
  };

  const handleWaiting = () => {
    console.log('⏳ Video waiting for data');
    // Could show loading spinner here if needed
  };

  const handleCanPlay = () => {
    console.log('✅ Video can play');
    // Video has enough data to start playing
  };

  const handleDurationChange = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      playerActions.setDuration(videoRef.current.duration);
    }
  };









  // Video playback sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (playerState.isPlaying) {
      videoRef.current.play().catch(console.error);
    } else {
      videoRef.current.pause();
    }
  }, [playerState.isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = playerState.volume;
      videoRef.current.muted = playerState.isMuted;
    }
  }, [playerState.volume, playerState.isMuted]);

  const loading = streamLoading || (subtitlesLoading && !streamUrl);

  if (loading) {
    return (
      <div className={styles.playerContainer}>
        <LoadingSpinner progress={loadingProgress} phase={loadingPhase || 'Loading...'} />
      </div>
    );
  }

  if (streamError) {
    return (
      <div className={styles.playerContainer}>
        <div className={styles.errorOverlay}>
          <h3>❌ Playback Error</h3>
          <p>{streamError}</p>
          <div className={styles.errorActions}>
            <button onClick={retryExtraction} className={styles.retryButton}>
              🔄 Try Again
            </button>
            <button onClick={onBackToShowDetails} className={styles.backButton}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={styles.playerContainer}
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className={styles.videoElement}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onSeeked={handleSeeked}
        onSeeking={handleSeeking}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onPlay={() => playerActions.setPlaying(true)}
        onPause={() => playerActions.setPlaying(false)}
        controls={false}
        autoPlay
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        textTracks="false"
        disablePictureInPicture
        data-testid="video-player"
      />

      {/* Seeking Indicator */}
      {isSeeking && (
        <div className={styles.seekingIndicator}>
          <div className={styles.seekingSpinner}></div>
          <span>Seeking to {Math.floor(seekingTo / 60)}:{(Math.floor(seekingTo % 60)).toString().padStart(2, '0')}...</span>
        </div>
      )}

      {/* SUBTITLE OVERLAY - GUARANTEED TO SHOW - Always visible */}
      {currentSubtitle && (
        <div className={styles.subtitleOverlay}>
          {currentSubtitle}
        </div>
      )}

      {/* Subtitle Error Indicator */}
      {subtitleError && (
        <div className={styles.statusIndicator} style={{ background: 'rgba(239, 68, 68, 0.9)' }}>
          ❌ {subtitleError}
        </div>
      )}

      {/* Next Episode Prompt - Auto-advance */}
      {console.log('🎬 Rendering NextEpisodePrompt:', { 
        show: showNextEpisodePrompt, 
        nextEpisode: nextEpisodeInfo ? 'Available' : 'None' 
      })}
      <NextEpisodePrompt
        show={showNextEpisodePrompt}
        countdown={countdown}
        nextEpisode={nextEpisodeInfo}
        onNext={autoAdvanceNext}
        onDismiss={dismissPrompt}
      />
      
      {/* Debug overlay for testing */}
      {mediaType === 'tv' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          fontSize: '12px',
          zIndex: 999
        }}>
          Debug: Show={showNextEpisodePrompt ? 'YES' : 'NO'} | 
          HasNext={forceHasNextEpisode ? 'YES' : 'NO'} | 
          Time={Math.floor(playerState.currentTime || 0)}s
        </div>
      )}

      {/* Back Button - Auto-hiding */}
      <button 
        onClick={onBackToShowDetails} 
        className={`${styles.backBtn} ${controlsVisible ? styles.controlsVisible : styles.controlsHidden}`}
        onMouseEnter={showControls}
      >
        ← Back
      </button>



      {/* Episode Navigation - Only for TV shows */}
      {mediaType === 'tv' && (
        <div 
          className={`${styles.episodeNavigationContainer} ${controlsVisible ? styles.controlsVisible : styles.controlsHidden}`}
          onMouseEnter={showControls}
        >
          <EpisodeNavigation
            hasNextEpisode={hasNextEpisode}
            hasPreviousEpisode={hasPreviousEpisode}
            onNextEpisode={goToNextEpisode}
            onPreviousEpisode={goToPreviousEpisode}
            getCurrentEpisode={getCurrentEpisode}
            getNextEpisode={getNextEpisode}
            getPreviousEpisode={getPreviousEpisode}
            loading={episodeNavLoading}
          />
        </div>
      )}

      {/* Media Controls - Auto-hiding */}
      <div 
        className={`${styles.controlsContainer} ${controlsVisible ? styles.controlsVisible : styles.controlsHidden}`}
        onMouseEnter={showControls}
      >
        <PlayerControls
          playerState={playerState}
          playerActions={playerActions}
          onSeek={handleSeek}
          onToggleFullscreen={toggleFullscreen}
          qualities={qualities}
          onSelectQuality={setQuality}
          currentQuality={currentQuality}
          subtitles={subtitles}
          onSelectSubtitle={handleSubtitleChange}
          activeSubtitle={activeSubtitle}
          videoRef={videoRef}
        />
      </div>


    </div>
  );
};

export default UniversalMediaPlayer; 