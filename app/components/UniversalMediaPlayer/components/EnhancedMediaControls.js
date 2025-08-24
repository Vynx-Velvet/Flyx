'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * EnhancedMediaControls - Optimized and Refactored Media Controls
 * 
 * Key Improvements:
 * - Removed forced re-renders with key prop
 * - Optimized with React.memo and proper memoization
 * - Efficient event handling with throttling
 * - Smooth animations without performance impact
 * - Clean separation of concerns
 * - Comprehensive accessibility support
 */
const EnhancedMediaControls = memo(({
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
  // Local UI state
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [timelineHover, setTimelineHover] = useState({ show: false, x: 0, time: 0 });
  
  // Refs for DOM elements
  const timelineRef = useRef(null);
  const volumeSliderRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const lastSeekTimeRef = useRef(0);
  const rafIdRef = useRef(null);
  
  // Extract player state with defaults
  const {
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    volume = 0.8,
    isMuted = false,
    buffered = 0,
    isFullscreen = false
  } = playerState || {};
  
  // Calculate progress percentages
  const progressPercentage = useMemo(() => {
    if (!duration || duration === 0) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);
  
  const bufferedPercentage = useMemo(() => {
    if (!duration || duration === 0) return 0;
    return Math.min(100, Math.max(0, (buffered / duration) * 100));
  }, [buffered, duration]);
  
  // Optimized time formatting
  const formatTime = useCallback((seconds) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '00:00:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Timeline interaction handlers with throttling
  const calculateTimeFromEvent = useCallback((e) => {
    if (!timelineRef.current || !duration) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const progress = clickX / rect.width;
    return progress * duration;
  }, [duration]);
  
  const handleTimelineClick = useCallback((e) => {
    e.preventDefault();
    const newTime = calculateTimeFromEvent(e);
    playerActions?.seek?.(newTime);
  }, [calculateTimeFromEvent, playerActions]);
  
  const handleTimelineMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingTimeline(true);
    const newTime = calculateTimeFromEvent(e);
    playerActions?.seek?.(newTime);
    lastSeekTimeRef.current = Date.now();
  }, [calculateTimeFromEvent, playerActions]);
  
  const handleTimelineMouseMove = useCallback((e) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const progress = x / rect.width;
    const time = progress * duration;
    
    // Update hover preview
    setTimelineHover({
      show: true,
      x: Math.max(30, Math.min(rect.width - 30, x)),
      time
    });
    
    // Handle dragging with RAF throttling
    if (isDraggingTimeline) {
      const now = Date.now();
      if (now - lastSeekTimeRef.current > 16) { // ~60fps
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          playerActions?.seek?.(time);
        });
        lastSeekTimeRef.current = now;
      }
    }
  }, [isDraggingTimeline, duration, playerActions]);
  
  const handleTimelineMouseLeave = useCallback(() => {
    setTimelineHover({ show: false, x: 0, time: 0 });
  }, []);
  
  // Volume interaction handlers
  const calculateVolumeFromEvent = useCallback((e) => {
    if (!volumeSliderRef.current) return 0;
    
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    return clickX / rect.width;
  }, []);
  
  const handleVolumeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVolume(true);
    
    const newVolume = calculateVolumeFromEvent(e);
    playerActions?.setVolume?.(newVolume);
  }, [calculateVolumeFromEvent, playerActions]);
  
  const handleVolumeMouseMove = useCallback((e) => {
    if (!isDraggingVolume) return;
    
    const newVolume = calculateVolumeFromEvent(e);
    playerActions?.setVolume?.(newVolume);
  }, [isDraggingVolume, calculateVolumeFromEvent, playerActions]);
  
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
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
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
        setShowSpeedMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Player control handlers
  const handlePlayPause = useCallback(() => {
    playerActions?.togglePlay?.();
  }, [playerActions]);
  
  const handleMute = useCallback(() => {
    playerActions?.toggleMute?.();
  }, [playerActions]);
  
  const handleSkip = useCallback((seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    playerActions?.seek?.(newTime);
  }, [currentTime, duration, playerActions]);
  
  // Speed control handlers
  const playbackRates = useMemo(() => [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], []);
  const currentPlaybackRate = videoRef?.current?.playbackRate || 1;
  
  const handleSpeedChange = useCallback((rate) => {
    if (videoRef?.current) {
      videoRef.current.playbackRate = rate;
      setShowSpeedMenu(false);
    }
  }, [videoRef]);
  
  // Volume icon selection
  const getVolumeIcon = useCallback(() => {
    if (isMuted || volume === 0) return '🔇';
    if (volume <= 0.3) return '🔈';
    if (volume <= 0.7) return '🔉';
    return '🔊';
  }, [isMuted, volume]);
  
  // Quality label formatting
  const getQualityLabel = useCallback((quality) => {
    if (!quality) return 'Auto';
    if (quality.id === 'auto') return 'Auto';
    return quality.label || `${quality.height}p` || 'Unknown';
  }, []);
  
  // Subtitle label formatting
  const getSubtitleLabel = useCallback((subtitle) => {
    if (!subtitle) return 'Off';
    return subtitle.languageName || subtitle.language || subtitle.label || 'Unknown';
  }, []);
  
  // PiP handler
  const handlePiP = useCallback(async () => {
    if (!videoRef?.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  }, [videoRef]);
  
  return (
    <motion.div 
      className={styles.controlsContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Timeline Container */}
      <div className={styles.timelineContainer}>
        <div 
          ref={timelineRef}
          className={`${styles.timeline} ${isDraggingTimeline ? styles.timelineDragging : ''}`}
          onClick={handleTimelineClick}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          style={{ cursor: isDraggingTimeline ? 'grabbing' : 'pointer' }}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        >
          {/* Buffered Progress */}
          <div
            className={styles.timelineBuffered}
            style={{ width: `${bufferedPercentage}%` }}
          />
          
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
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
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
              aria-label={isMuted ? 'Unmute' : 'Mute'}
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
                  className={`${styles.volumeSlider} ${isMuted ? styles.volumeMuted : ''}`}
                  onMouseDown={handleVolumeMouseDown}
                  style={{ cursor: isDraggingVolume ? 'grabbing' : 'pointer' }}
                  role="slider"
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(volume * 100)}
                >
                  <div className={styles.volumeTrack} />
                  <div 
                    className={styles.volumeFill} 
                    style={{ width: `${volume * 100}%` }}
                  />
                  <div 
                    className={styles.volumeThumb} 
                    style={{ left: `${volume * 100}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Time Display */}
          <div className={styles.timeDisplay}>
            <span className={styles.currentTime}>{formatTime(currentTime)}</span>
            <span className={styles.timeSeparator}> / </span>
            <span className={styles.totalTime}>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Center Controls - Episode Navigation */}
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
          {/* Playback Speed */}
          <div className={styles.dropdownContainer}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowSpeedMenu(!showSpeedMenu);
                setShowQualityMenu(false);
                setShowSubtitleMenu(false);
              }}
              className={styles.glassButton}
              aria-label="Playback Speed"
            >
              ⚡ {currentPlaybackRate}x
            </motion.button>
            
            <AnimatePresence>
              {showSpeedMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={styles.dropdownMenu}
                >
                  {playbackRates.map((rate) => (
                    <motion.button
                      key={rate}
                      whileHover={{ x: 5 }}
                      onClick={() => handleSpeedChange(rate)}
                      className={`${styles.dropdownItem} ${
                        currentPlaybackRate === rate ? styles.active : ''
                      }`}
                    >
                      {rate}x
                      {currentPlaybackRate === rate && (
                        <span className={styles.checkmark}>✓</span>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Quality Settings */}
          {qualities.length > 0 && (
            <div className={styles.dropdownContainer}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowSubtitleMenu(false);
                  setShowSpeedMenu(false);
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
                        {quality.id === currentQuality && (
                          <span className={styles.checkmark}>✓</span>
                        )}
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
                setShowSpeedMenu(false);
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
                    Off
                    {!activeSubtitle && <span className={styles.checkmark}>✓</span>}
                  </motion.button>
                  
                  {subtitles.map((subtitle, index) => (
                    <motion.button
                      key={subtitle.langcode || subtitle.id || index}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        onSelectSubtitle(subtitle);
                        setShowSubtitleMenu(false);
                      }}
                      className={`${styles.dropdownItem} ${
                        activeSubtitle?.langcode === subtitle.langcode ||
                        activeSubtitle?.id === subtitle.id
                          ? styles.active
                          : ''
                      }`}
                    >
                      {getSubtitleLabel(subtitle)}
                      {(activeSubtitle?.langcode === subtitle.langcode ||
                        activeSubtitle?.id === subtitle.id) && (
                        <span className={styles.checkmark}>✓</span>
                      )}
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
              onClick={handlePiP}
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
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? '⤡' : '⤢'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if critical props change
  return (
    prevProps.playerState?.isPlaying === nextProps.playerState?.isPlaying &&
    prevProps.playerState?.currentTime === nextProps.playerState?.currentTime &&
    prevProps.playerState?.duration === nextProps.playerState?.duration &&
    prevProps.playerState?.volume === nextProps.playerState?.volume &&
    prevProps.playerState?.isMuted === nextProps.playerState?.isMuted &&
    prevProps.playerState?.buffered === nextProps.playerState?.buffered &&
    prevProps.currentQuality === nextProps.currentQuality &&
    prevProps.activeSubtitle?.id === nextProps.activeSubtitle?.id &&
    prevProps.qualities?.length === nextProps.qualities?.length &&
    prevProps.subtitles?.length === nextProps.subtitles?.length
  );
});

EnhancedMediaControls.displayName = 'EnhancedMediaControls';

export default EnhancedMediaControls;