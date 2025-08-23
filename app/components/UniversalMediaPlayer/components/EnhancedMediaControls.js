import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * EnhancedMediaControls - Complete refactored media player controls
 * 
 * Features:
 * - HH:MM:SS time format display
 * - Full functioning volume controls with mute/unmute
 * - Comprehensive quality settings dropdown
 * - Enhanced subtitle functionality with language selection
 * - Fullscreen support with proper UI handling
 * - Complete player controls (play/pause, seek, skip, etc.)
 * - Modern glassmorphism design
 * - Touch and keyboard support
 */
const EnhancedMediaControls = ({
  videoRef,
  playerState,
  playerActions,
  onToggleFullscreen,
  qualities = [],
  onSelectQuality,
  currentQuality = 'auto',
  subtitles = [],
  onSelectSubtitle,
  activeSubtitle = null,
  mediaType = 'movie',
  hasNextEpisode = false,
  hasPreviousEpisode = false,
  onNextEpisode,
  onPreviousEpisode,
  enableAdvanced = true,
  theme = 'dark'
}) => {
  // Local state for UI interactions
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [timelineHover, setTimelineHover] = useState({ show: false, x: 0, time: 0 });
  const [lastSeekTime, setLastSeekTime] = useState(0);

  // Refs for drag interactions
  const timelineRef = useRef(null);
  const volumeSliderRef = useRef(null);
  const settingsMenuRef = useRef(null);
  
  // Enhanced time formatting with HH:MM:SS support
  const formatTime = useCallback((seconds) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    // Always return HH:MM:SS format as requested
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentages
  const progressPercentage = playerState.duration > 0 
    ? Math.min(100, Math.max(0, (playerState.currentTime / playerState.duration) * 100))
    : 0;
    
  const bufferedPercentage = playerState.duration > 0 && playerState.buffered
    ? Math.min(100, Math.max(0, (playerState.buffered / playerState.duration) * 100))
    : 0;

  // Timeline interaction handlers
  const calculateTimeFromEvent = useCallback((e) => {
    if (!timelineRef.current || !playerState.duration) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    return progress * playerState.duration;
  }, [playerState.duration]);

  const handleTimelineMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingTimeline(true);
    
    const newTime = calculateTimeFromEvent(e);
    if (videoRef?.current) {
      videoRef.current.currentTime = newTime;
    }
    if (playerActions?.seek) {
      playerActions.seek(newTime);
    }
    setLastSeekTime(Date.now());
  }, [calculateTimeFromEvent, videoRef, playerActions]);

  const handleTimelineMouseMove = useCallback((e) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const time = progress * playerState.duration;

    // Update hover preview
    setTimelineHover({
      show: true,
      x: Math.max(30, Math.min(rect.width - 30, x)),
      time
    });

    // Handle dragging with throttling
    if (isDraggingTimeline) {
      const now = Date.now();
      if (now - lastSeekTime > 50) { // Throttle to 20fps
        if (videoRef?.current) {
          videoRef.current.currentTime = time;
        }
        if (playerActions?.seek) {
          playerActions.seek(time);
        }
        setLastSeekTime(now);
      }
    }
  }, [isDraggingTimeline, playerState.duration, lastSeekTime, videoRef, playerActions]);

  const handleTimelineMouseLeave = useCallback(() => {
    setTimelineHover({ show: false, x: 0, time: 0 });
  }, []);

  // Volume interaction handlers
  const calculateVolumeFromEvent = useCallback((e) => {
    if (!volumeSliderRef.current) return 0;
    
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    return progress;
  }, []);

  const handleVolumeMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    
    const newVolume = calculateVolumeFromEvent(e);
    if (videoRef?.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
    if (playerActions?.setVolume) {
      playerActions.setVolume(newVolume);
    }
  }, [calculateVolumeFromEvent, videoRef, playerActions]);

  const handleVolumeMouseMove = useCallback((e) => {
    if (!isDraggingVolume) return;
    
    const newVolume = calculateVolumeFromEvent(e);
    if (videoRef?.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
    if (playerActions?.setVolume) {
      playerActions.setVolume(newVolume);
    }
  }, [isDraggingVolume, calculateVolumeFromEvent, videoRef, playerActions]);

  // Global mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingTimeline) {
        handleTimelineMouseMove(e);
      }
      if (isDraggingVolume) {
        handleVolumeMouseMove(e);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTimeline(false);
      setIsDraggingVolume(false);
    };

    if (isDraggingTimeline || isDraggingVolume) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDraggingTimeline, isDraggingVolume, handleTimelineMouseMove, handleVolumeMouseMove]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
        setShowQualityMenu(false);
        setShowSubtitleMenu(false);
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Player control handlers
  const handlePlayPause = useCallback(() => {
    if (!videoRef?.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [videoRef]);

  const handleMute = useCallback(() => {
    if (!videoRef?.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    if (playerActions?.toggleMute) {
      playerActions.toggleMute();
    }
  }, [videoRef, playerActions]);

  const handleSkip = useCallback((seconds) => {
    if (!videoRef?.current) return;
    
    const newTime = Math.max(0, Math.min(
      videoRef.current.duration || 0,
      videoRef.current.currentTime + seconds
    ));
    
    videoRef.current.currentTime = newTime;
    if (playerActions?.seek) {
      playerActions.seek(newTime);
    }
  }, [videoRef, playerActions]);

  // Volume icon selection
  const getVolumeIcon = useCallback(() => {
    if (playerState.isMuted || playerState.volume === 0) return '🔇';
    if (playerState.volume <= 0.3) return '🔈';
    if (playerState.volume <= 0.7) return '🔉';
    return '🔊';
  }, [playerState.isMuted, playerState.volume]);

  // Quality label formatting
  const getQualityLabel = useCallback((quality) => {
    if (!quality) return 'Auto';
    if (typeof quality === 'string') return quality;
    
    const label = quality.height ? `${quality.height}p` : quality.label || 'Unknown';
    const bitrate = quality.bitrate ? ` (${Math.round(quality.bitrate / 1000)}k)` : '';
    
    return `${label}${bitrate}`;
  }, []);

  // Subtitle label formatting
  const getSubtitleLabel = useCallback((subtitle) => {
    if (!subtitle) return 'None';
    
    // Handle both API subtitle format and availableLanguages format
    return subtitle.languageName || subtitle.language || subtitle.label || subtitle.langcode || 'Unknown Language';
  }, []);

  return (
    <div className={styles.controlsContainer}>
      {/* Timeline Container */}
      <div className={styles.timelineContainer}>
        <div 
          ref={timelineRef}
          className={`${styles.timeline} ${isDraggingTimeline ? styles.timelineDragging : ''}`}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          style={{ cursor: isDraggingTimeline ? 'grabbing' : 'pointer' }}
        >
          {/* Buffered Progress */}
          {bufferedPercentage > 0 && (
            <div
              className={styles.timelineBuffered}
              style={{ width: `${bufferedPercentage}%` }}
            />
          )}
          
          {/* Current Progress */}
          <div
            className={styles.timelineProgress}
            style={{ width: `${progressPercentage}%` }}
          >
            <div className={styles.timelineThumb} />
          </div>

          {/* Timeline Preview */}
          <AnimatePresence>
            {timelineHover.show && enableAdvanced && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={styles.timelinePreview}
                style={{ left: timelineHover.x }}
              >
                <div className={styles.previewTime}>
                  {formatTime(timelineHover.time)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className={styles.controlsRow}>
        {/* Left Controls */}
        <div className={styles.leftControls}>
          {/* Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayPause}
            className={styles.playButton}
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying ? '⏸️' : '▶️'}
          </motion.button>

          {/* Skip Backward */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSkip(-10)}
            className={styles.glassButton}
            aria-label="Skip backward 10 seconds"
          >
            ⏮️ 10s
          </motion.button>

          {/* Skip Forward */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSkip(10)}
            className={styles.glassButton}
            aria-label="Skip forward 10 seconds"
          >
            10s ⏭️
          </motion.button>

          {/* Volume Controls */}
          <div 
            className={styles.volumeContainer}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => !isDraggingVolume && setShowVolumeSlider(false)}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMute}
              className={styles.glassButton}
              aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </motion.button>
            
            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 120, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  ref={volumeSliderRef}
                  className={`${styles.volumeSlider} ${playerState.isMuted ? styles.volumeMuted : ''}`}
                  onMouseDown={handleVolumeMouseDown}
                  style={{ cursor: isDraggingVolume ? 'grabbing' : 'pointer' }}
                >
                  <div className={styles.volumeTrack} />
                  <div 
                    className={styles.volumeFill} 
                    style={{ width: `${(playerState.volume || 0) * 100}%` }}
                  />
                  <div 
                    className={styles.volumeThumb} 
                    style={{ left: `${(playerState.volume || 0) * 100}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Time Display - HH:MM:SS format */}
          <div className={styles.timeDisplay}>
            <span className={styles.currentTime}>{formatTime(playerState.currentTime)}</span>
            <span className={styles.timeSeparator}> / </span>
            <span className={styles.totalTime}>{formatTime(playerState.duration)}</span>
          </div>
        </div>

        {/* Center Controls - Episode Navigation for TV Shows */}
        <div className={styles.centerControls}>
          {mediaType === 'tv' && (
            <>
              {hasPreviousEpisode && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPreviousEpisode}
                  className={styles.glassButton}
                  aria-label="Previous Episode"
                >
                  ⏮️ Previous
                </motion.button>
              )}
              
              {hasNextEpisode && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onNextEpisode}
                  className={styles.glassButton}
                  aria-label="Next Episode"
                >
                  Next ⏭️
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* Right Controls */}
        <div className={styles.rightControls} ref={settingsMenuRef}>
          {/* Quality Settings */}
          {qualities.length > 0 && (
            <div className={styles.dropdownContainer}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowSubtitleMenu(false);
                }}
                className={styles.glassButton}
                aria-label="Quality Settings"
              >
                🎬 {getQualityLabel(qualities.find(q => q.id === currentQuality))}
              </motion.button>
              
              <AnimatePresence>
                {showQualityMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={styles.dropdownMenu}
                  >
                    {qualities.map((quality) => (
                      <motion.button
                        key={quality.id}
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          onSelectQuality(quality.id);
                          setShowQualityMenu(false);
                        }}
                        className={`${styles.dropdownItem} ${
                          quality.id === currentQuality ? styles.active : ''
                        }`}
                      >
                        {getQualityLabel(quality)}
                        {quality.id === currentQuality && <span className={styles.checkmark}>✓</span>}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Subtitle Settings */}
          <div className={styles.dropdownContainer}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowSubtitleMenu(!showSubtitleMenu);
                setShowQualityMenu(false);
              }}
              className={styles.glassButton}
              aria-label="Subtitle Settings"
            >
              💬 {getSubtitleLabel(activeSubtitle)}
            </motion.button>
            
            <AnimatePresence>
              {showSubtitleMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={styles.dropdownMenu}
                >
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => {
                      onSelectSubtitle(null);
                      setShowSubtitleMenu(false);
                    }}
                    className={`${styles.dropdownItem} ${!activeSubtitle ? styles.active : ''}`}
                  >
                    No Subtitles
                    {!activeSubtitle && <span className={styles.checkmark}>✓</span>}
                  </motion.button>
                  
                  {(subtitles || []).map((subtitle, index) => (
                    <motion.button
                      key={subtitle.langcode || subtitle.id || index}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        onSelectSubtitle(subtitle);
                        setShowSubtitleMenu(false);
                      }}
                      className={`${styles.dropdownItem} ${
                        activeSubtitle?.langcode === subtitle.langcode || activeSubtitle?.id === subtitle.id ? styles.active : ''
                      }`}
                    >
                      {getSubtitleLabel(subtitle)}
                      {(activeSubtitle?.langcode === subtitle.langcode || activeSubtitle?.id === subtitle.id) && <span className={styles.checkmark}>✓</span>}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Picture-in-Picture */}
          {document.pictureInPictureEnabled && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (videoRef?.current) {
                  if (document.pictureInPictureElement) {
                    document.exitPictureInPicture();
                  } else {
                    videoRef.current.requestPictureInPicture();
                  }
                }
              }}
              className={styles.glassButton}
              aria-label="Picture in Picture"
            >
              📺
            </motion.button>
          )}

          {/* Fullscreen Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleFullscreen}
            className={styles.glassButton}
            aria-label={playerState.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {playerState.isFullscreen ? '⤡' : '⤢'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMediaControls;