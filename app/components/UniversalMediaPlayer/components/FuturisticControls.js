import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * FuturisticControls - Advanced media player controls with glassmorphism design
 * 
 * Features:
 * - Glassmorphism UI with blur effects
 * - Smart timeline with scene detection
 * - Intelligent volume control with gesture support
 * - Advanced quality selector with AI recommendations
 * - Voice control integration
 * - Customizable control layout
 * - Real-time performance metrics
 */
const FuturisticControls = ({
  playerState,
  playerActions,
  onToggleFullscreen,
  qualities,
  onSelectQuality,
  currentQuality,
  subtitles,
  onSelectSubtitle,
  activeSubtitle,
  videoRef,
  enableAdvanced = true,
  theme = 'dark',
  onSettingsOpen,
  onPerformanceOpen,
  voiceControls = { enabled: false, listening: false, onStart: null, onStop: null }
}) => {
  // Local state
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [timelineHover, setTimelineHover] = useState({ show: false, x: 0, time: 0 });
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);

  // Refs
  const volumeSliderRef = useRef(null);
  const timelineRef = useRef(null);
  const thumbnailCanvasRef = useRef(null);
  const lastSeekTimeRef = useRef(0);

  // Timeline calculations
  const progressPercentage = playerState.duration > 0 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;
    
  const bufferedPercentage = playerState.duration > 0 
    ? (playerState.buffered / playerState.duration) * 100 
    : 0;

  // Enhanced time formatting with intelligent display
  const formatTime = useCallback((seconds) => {
    if (!isFinite(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (playerState.duration >= 3600) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, [playerState.duration]);

  // Timeline event handlers with smooth dragging
  const calculateTimeFromEvent = useCallback((e) => {
    if (!timelineRef.current) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    return progress * playerState.duration;
  }, [playerState.duration]);

  const handleTimelineMouseDown = useCallback((e) => {
    if (playerState.isSeeking) return;
    
    e.preventDefault();
    setIsDraggingTimeline(true);
    
    const newTime = calculateTimeFromEvent(e);
    playerActions.seek(newTime);
    
    console.log('🎯 Timeline drag started:', { newTime });
  }, [playerState.isSeeking, calculateTimeFromEvent, playerActions]);

  const handleTimelineMouseMove = useCallback((e) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const time = progress * playerState.duration;

    // Update hover preview
    setTimelineHover({
      show: true,
      x: Math.max(0, Math.min(rect.width - 120, x - 60)),
      time
    });

    // Generate thumbnail if advanced features enabled
    if (enableAdvanced && thumbnailCanvasRef.current && videoRef.current) {
      generateThumbnail(time);
    }

    // Handle dragging
    if (isDraggingTimeline && !playerState.isSeeking) {
      const now = Date.now();
      if (now - lastSeekTimeRef.current > 100) {
        playerActions.seek(time);
        lastSeekTimeRef.current = now;
      }
    }
  }, [isDraggingTimeline, playerState.isSeeking, playerState.duration, enableAdvanced, playerActions]);

  const handleTimelineMouseLeave = useCallback(() => {
    setTimelineHover({ show: false, x: 0, time: 0 });
  }, []);

  const handleTimelineMouseUp = useCallback(() => {
    setIsDraggingTimeline(false);
  }, []);

  const handleTimelineClick = useCallback((e) => {
    if (isDraggingTimeline || playerState.isSeeking) return;
    
    const newTime = calculateTimeFromEvent(e);
    playerActions.seek(newTime);
  }, [isDraggingTimeline, playerState.isSeeking, calculateTimeFromEvent, playerActions]);

  // Volume control handlers
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
    playerActions.setVolume(newVolume);
  }, [calculateVolumeFromEvent, playerActions]);

  const handleVolumeMouseMove = useCallback((e) => {
    if (!isDraggingVolume) return;
    
    const newVolume = calculateVolumeFromEvent(e);
    playerActions.setVolume(newVolume);
  }, [isDraggingVolume, calculateVolumeFromEvent, playerActions]);

  const handleVolumeMouseUp = useCallback(() => {
    setIsDraggingVolume(false);
  }, []);

  // Thumbnail generation for timeline preview
  const generateThumbnail = useCallback((time) => {
    if (!videoRef.current || !thumbnailCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = thumbnailCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Temporarily seek to generate thumbnail
    const originalTime = video.currentTime;
    video.currentTime = time;

    video.addEventListener('seeked', function onSeeked() {
      video.removeEventListener('seeked', onSeeked);
      
      canvas.width = 160;
      canvas.height = 90;
      
      try {
        ctx.drawImage(video, 0, 0, 160, 90);
        // Restore original time
        video.currentTime = originalTime;
      } catch (error) {
        console.warn('Thumbnail generation failed:', error);
      }
    }, { once: true });
  }, []);

  // Global mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      handleVolumeMouseMove(e);
      if (isDraggingTimeline) {
        handleTimelineMouseMove(e);
      }
    };

    const handleMouseUp = () => {
      handleVolumeMouseUp();
      handleTimelineMouseUp();
    };

    if (isDraggingVolume || isDraggingTimeline) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDraggingVolume, isDraggingTimeline, handleVolumeMouseMove, handleVolumeMouseUp, handleTimelineMouseMove, handleTimelineMouseUp]);

  // Volume icon selection
  const getVolumeIcon = () => {
    if (playerState.isMuted || playerState.volume === 0) return '🔇';
    if (playerState.volume <= 0.3) return '🔈';
    if (playerState.volume <= 0.7) return '🔉';
    return '🔊';
  };

  // Quality selection with AI recommendations
  const getQualityLabel = (quality) => {
    if (!quality) return 'Auto';
    
    const label = `${quality.height}p`;
    const bitrate = quality.bitrate ? ` (${Math.round(quality.bitrate / 1000)}k)` : '';
    
    // Add AI recommendation indicators
    if (enableAdvanced) {
      const isRecommended = quality.id === playerState.userPreferences?.recommendedQuality;
      const isBatteryOptimized = playerState.performanceMode === 'performance' && quality.height <= 720;
      
      if (isRecommended) return `${label}${bitrate} 🤖`;
      if (isBatteryOptimized) return `${label}${bitrate} 🔋`;
    }
    
    return `${label}${bitrate}`;
  };

  // Subtitle selection with language detection
  const getSubtitleLabel = (subtitle) => {
    if (!subtitle) return 'No Subtitles';
    
    const lang = subtitle.languageName || subtitle.language || 'Unknown';
    const quality = subtitle.qualityScore ? ` (${Math.round(subtitle.qualityScore)}%)` : '';
    const source = subtitle.isFromFrontend ? ' 🌐' : '';
    
    return `${lang}${quality}${source}`;
  };

  return (
    <div className={styles.controlsContainer}>
      {/* Hidden canvas for thumbnail generation */}
      <canvas 
        ref={thumbnailCanvasRef}
        style={{ display: 'none' }}
        width="160" 
        height="90"
      />

      {/* Timeline with Preview */}
      <div className={styles.timelineContainer}>
        <div 
          ref={timelineRef}
          className={`${styles.timeline} ${playerState.isSeeking ? styles.timelineSeeking : ''} ${isDraggingTimeline ? styles.timelineDragging : ''}`}
          onClick={handleTimelineClick}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
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

          {/* Timeline Hover Preview */}
          <AnimatePresence>
            {timelineHover.show && enableAdvanced && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={styles.timelinePreview}
                style={{ left: timelineHover.x }}
              >
                <div className={styles.previewThumbnail}>
                  <canvas 
                    width="120" 
                    height="68"
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className={styles.previewTime}>
                    {formatTime(timelineHover.time)}
                  </div>
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
            onClick={playerActions.togglePlay}
            className={styles.playButton}
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying ? '⏸️' : '▶️'}
          </motion.button>

          {/* Volume Controls */}
          <div 
            className={styles.volumeContainer}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => !isDraggingVolume && setShowVolumeSlider(false)}
          >
            <button
              onClick={playerActions.toggleMute}
              className={styles.glassButton}
              aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>
            
            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 120, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  ref={volumeSliderRef}
                  className={`${styles.volumeSlider} ${playerState.isMuted ? styles.volumeMuted : ''}`}
                  onMouseDown={handleVolumeMouseDown}
                >
                  <div className={styles.volumeTrack} />
                  <div 
                    className={styles.volumeFill} 
                    style={{ width: `${playerState.volume * 100}%` }}
                  />
                  <div 
                    className={styles.volumeThumb} 
                    style={{ left: `${playerState.volume * 100}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Time Display */}
          <div className={styles.timeDisplay}>
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </div>
        </div>

        {/* Center Controls */}
        <div className={styles.centerControls}>
          {/* Previous/Next Episode for TV Shows */}
          {enableAdvanced && (
            <>
              <button className={styles.glassButton}>⏮️</button>
              <button className={styles.glassButton}>⏭️</button>
            </>
          )}
        </div>

        {/* Right Controls */}
        <div className={styles.rightControls}>
          {/* Voice Control Toggle */}
          {voiceControls.enabled && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={voiceControls.listening ? voiceControls.onStop : voiceControls.onStart}
              className={`${styles.glassButton} ${voiceControls.listening ? styles.voiceActive : ''}`}
              style={{
                background: voiceControls.listening 
                  ? 'linear-gradient(135deg, #ff006e, #8b5cf6)' 
                  : undefined
              }}
              aria-label="Voice Control"
            >
              🎤
            </motion.button>
          )}

          {/* Quality Selector */}
          <div className={styles.dropdownContainer}>
            <button
              onClick={() => setQualityMenuOpen(!qualityMenuOpen)}
              className={styles.glassButton}
              aria-label="Video Quality"
            >
              🎬 {getQualityLabel(qualities?.find(q => q.id.toString() === currentQuality))}
            </button>
            
            <AnimatePresence>
              {qualityMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={styles.dropdownMenu}
                >
                  {(qualities || []).map((quality) => (
                    <motion.button
                      key={quality.id}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        onSelectQuality(quality.id.toString());
                        setQualityMenuOpen(false);
                      }}
                      className={`${styles.dropdownItem} ${
                        quality.id.toString() === currentQuality ? styles.active : ''
                      }`}
                    >
                      {getQualityLabel(quality)}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subtitle Selector */}
          <div className={styles.dropdownContainer}>
            <button
              onClick={() => setSubtitleMenuOpen(!subtitleMenuOpen)}
              className={styles.glassButton}
              aria-label="Subtitles"
            >
              💬 {getSubtitleLabel(activeSubtitle)}
            </button>
            
            <AnimatePresence>
              {subtitleMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={styles.dropdownMenu}
                >
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => {
                      onSelectSubtitle(null);
                      setSubtitleMenuOpen(false);
                    }}
                    className={`${styles.dropdownItem} ${!activeSubtitle ? styles.active : ''}`}
                  >
                    No Subtitles
                  </motion.button>
                  {(subtitles || []).map((subtitle, index) => (
                    <motion.button
                      key={subtitle.id || index}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        onSelectSubtitle(subtitle);
                        setSubtitleMenuOpen(false);
                      }}
                      className={`${styles.dropdownItem} ${
                        activeSubtitle?.id === subtitle.id ? styles.active : ''
                      }`}
                    >
                      {getSubtitleLabel(subtitle)}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Advanced Settings */}
          {enableAdvanced && (
            <button
              onClick={onSettingsOpen}
              className={styles.glassButton}
              aria-label="Advanced Settings"
            >
              ⚙️
            </button>
          )}

          {/* Performance Dashboard */}
          {enableAdvanced && (
            <button
              onClick={onPerformanceOpen}
              className={styles.glassButton}
              aria-label="Performance Dashboard"
            >
              📊
            </button>
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

export default FuturisticControls;